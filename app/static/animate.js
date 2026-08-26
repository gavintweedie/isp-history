/* Boom & Bust — cinematic constellation timeline of Australian ISPs.
 *
 * Standalone page (/animate, no tab-nav links). Fetches /api/graph and lays
 * every ISP out as a glowing bar on packed lanes (children biased near their
 * parents), then plays history forward: bars ignite at birth, grow until they
 * are absorbed/dead, acquisitions arc into their acquirer with a ripple, era
 * bands wash past, and a follow-camera pans through five decades.
 *
 * Rendering is deterministic from `playhead`, so scrubbing/restarting is
 * trivial — transient effects (arcs/ripples/flashes) are cosmetic particles
 * spawned when playback crosses an event year, and cleared on any seek.
 *
 * CSP note: no inline styles/scripts; dynamic positioning uses CSSOM.
 */
(function () {
'use strict';

// ---------------------------------------------------------------------------
// DOM handles
// ---------------------------------------------------------------------------
const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const API = stage.dataset.api;

const elYear = document.getElementById('hud-year');
const elAlive = document.getElementById('stat-alive');
const elGone = document.getElementById('stat-gone');
const elToast = document.getElementById('era-toast');
const elTip = document.getElementById('tip');
const scrub = document.getElementById('scrub');
const btnPlay = document.getElementById('btn-play');
const selSpeed = document.getElementById('sel-speed');
const chkFollow = document.getElementById('chk-follow');
const btnRestart = document.getElementById('btn-restart');
const intro = document.getElementById('intro');
const outro = document.getElementById('outro');
const loaderr = document.getElementById('loaderr');

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const LANE_H = 10;            // world px per lane
const BAR_H = 6.5;            // bar thickness in world px
const PADT = 8;               // world padding above lane 0
const CHROME_H = 64;          // reserved top band: HUD + era labels (no bars)
const YEARS_PER_SEC = 1.1;    // playback rate at 1× speed
const FOLLOW_FRAC = 0.5;      // opening framing: playhead centred (Telstra mid-screen)
const START_VIS_YEARS = 4.5;  // close-up on the pioneer; choreography dollies out
const END_FRAC = 0.95;        // finale framing: playhead at right edge, full span shown
const MIN_VIS = 2.5;
const MAX_VIS = 70;
const MAX_EFFECTS = 130;
const PARENT_SEARCH = 14;     // lane search radius around a parent
const ANCHOR_SLUG = 'telstra'; // camera opens centred on this pioneer

// Bars are coloured by time, not by recorded status: green while the ISP is
// still operating as the playhead crosses it, red once its end has passed.
const ALIVE_COLOR = '#3ddc97';
const DEAD_COLOR = '#ff6b6b';
const LABEL_ALIVE = 'rgba(7,28,19,0.95)';   // dark ink on bright green
const LABEL_DEAD = 'rgba(40,8,11,0.95)';    // dark ink on bright red

// Mobile generations are visual noise on a company timeline — show only the
// connectivity eras that shaped ISP businesses.
const MOBILE_ERAS = { '2g': 1, '3g': 1, '4g': 1, '5g': 1 };

const TYPE_COLORS = {
  acquisition: '#93a4bd',
  merger: '#4da3ff',
  rename: '#b07ae0',
  split: '#ffb14d',
};

const ERA_CAPTIONS = {
  predialup: 'academic networks & BBS culture',
  dialup: 'the dial-up gold rush',
  dsl: 'broadband arrives',
  nbn: 'the NBN era',
  '2g': 'mobile data is born',
  '3g': 'smartphones go online',
  '4g': 'mobile broadband everywhere',
  '5g': 'the wireless decade',
};

const ERAS = (Array.isArray(window.ERAS) ? window.ERAS : [])
  .filter(function (e) { return !MOBILE_ERAS[e.id]; });
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let ready = false;
let W = 0, H = 0, dpr = 1;

let nodes = [];        // layout records (see build)
let byId = new Map();  // api id -> record
let laneBars = [];     // lane -> [records] for culling + hit-testing
let T0 = 1985, T1 = 2027;
let worldH = 1000;

let playhead = 1985;
let playing = false;
let speed = 1;
let follow = true;                    // on by default; drag pans freely (F re-engages)
let visYears = START_VIS_YEARS;
let camLeft = 1985;
let camTop = 0;

let effects = [];
let hoverNode = null;
let pointerDown = null;
let dragMoved = 0;
let lastFrame = null;
let currentEraKey = null;
let toastTimer = null;
let hudCache = { year: '', alive: -1, gone: -1 };

// Star field for parallax backdrop (unit-space, seeded once).
const stars = [];
for (let i = 0; i < 150; i++) {
  stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3,
               s: Math.random() * 1.6 + 0.4, p: Math.random() * Math.PI * 2 });
}

// ---------------------------------------------------------------------------
// Data preparation + lane layout
// ---------------------------------------------------------------------------

function build(data) {
  byId = new Map();
  nodes = data.nodes.map(function (raw) {
    const start = raw.birth != null ? raw.birth
      : (raw.year != null ? raw.year : 1990);
    const rec = {
      id: raw.id,
      label: raw.label || raw.slug,
      url: raw.url,
      slug: raw.slug,
      start: start,
      death: raw.death,
      deathDisp: raw.death_disp,
      birthDisp: raw.birth_disp,
      status: raw.status || 'unknown',
      names: Array.isArray(raw.names) ? raw.names : [],
      absorbEdge: null,   // earliest non-split outgoing transition
      end: null,          // final visual length cap (null = grows forever)
      lane: null,
      pulseUntil: 0,
    };
    byId.set(raw.id, rec);
    return rec;
  });

  const edges = data.edges.filter(function (e) {
    return e.year != null && byId.has(e.from) && byId.has(e.to);
  });

  // Earliest non-split outgoing transition per node = when it stops growing.
  edges.forEach(function (e) {
    if (e.type === 'split') return;
    const rec = byId.get(e.from);
    if (!rec.absorbEdge || e.year < rec.absorbEdge.year) rec.absorbEdge = e;
  });

  nodes.forEach(function (n) {
    let end = null;
    if (n.death != null) end = n.death;
    if (n.absorbEdge && (end == null || n.absorbEdge.year < end)) {
      end = n.absorbEdge.year;
    }
    if (end != null && end < n.start) end = n.start;
    n.end = end;
  });

  // Parent links (child -> placed parent lanes) for layout affinity.
  const parentsOf = new Map();
  edges.forEach(function (e) {
    if (!parentsOf.has(e.to)) parentsOf.set(e.to, []);
    parentsOf.get(e.to).push(byId.get(e.from));
  });

  // Sweep by birth year; try lanes near a parent first (downward-biased so
  // families read top-down like generations), else global first fit.
  const order = nodes.slice().sort(function (a, b) {
    return (a.start - b.start) || a.label.localeCompare(b.label);
  });
  const laneEnds = []; // lane -> [ {s,e} ] occupied intervals
  function freeLane(L, s, e) {
    const arr = laneEnds[L];
    for (let i = 0; i < arr.length; i++) {
      if (!(arr[i].e < s || arr[i].s > e)) return false;
    }
    return true;
  }
  order.forEach(function (n) {
    const s = n.start, e = n.end != null ? n.end : T1;
    let placed = -1;
    const prefs = [];
    (parentsOf.get(n.id) || []).forEach(function (p) {
      if (p.lane != null && prefs.indexOf(p.lane) === -1) prefs.push(p.lane);
    });
    for (let pi = 0; pi < prefs.length && placed < 0; pi++) {
      const base = prefs[pi];
      for (let off = 0; off <= PARENT_SEARCH && placed < 0; off++) {
        const cand = off === 0 ? [base] : [base + off, base - off]; // downward bias
        for (let ci = 0; ci < cand.length; ci++) {
          const L = cand[ci];
          if (L >= 0 && L < laneEnds.length && freeLane(L, s, e)) { placed = L; break; }
        }
      }
    }
    if (placed < 0) {
      for (let L = 0; L < laneEnds.length; L++) {
        if (freeLane(L, s, e)) { placed = L; break; }
      }
    }
    if (placed < 0) { laneEnds.push([]); placed = laneEnds.length - 1; }
    laneEnds[placed].push({ s: s, e: e });
    n.lane = placed;
  });

  laneBars = laneEnds.map(function (arr, L) {
    return order.filter(function (n) { return n.lane === L; });
  });

  worldH = PADT + laneEnds.length * LANE_H + 20;

  T0 = Math.min.apply(null, order.map(function (n) { return n.start; })) - 1.5;
  T1 = Math.max(2026.5, Math.max.apply(null, nodes.map(function (n) {
    return n.end != null ? n.end : n.start + 1;
  }))) + 1;

  // Opening shot: centred on the anchor ISP (Telstra) so the story starts
  // with a pioneer mid-screen instead of an empty left edge.
  const anchor = nodes.find(function (n) { return n.slug === ANCHOR_SLUG; }) ||
    order[0];
  anchorStart = anchor ? anchor.start : T0;

  scrub.min = String(Math.floor(T0));
  scrub.max = String(Math.ceil(T1));
  scrub.value = String(Math.floor(T0));

  playhead = T0;
  camLeft = anchorStart - visYears * FOLLOW_FRAC;
  camTop = 0;

  ready = true;
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------
function pxPerYear() { return W / visYears; }
function wx(year) { return (year - camLeft) * pxPerYear(); }
// World origin sits just below the reserved chrome band, so lane 0 (the
// earliest ISPs) renders under the band rather than beneath it.
function wy(lane) { return CHROME_H + PADT + lane * LANE_H + LANE_H / 2 - camTop; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------
function spawnCrossings(prev, now) {
  // Births: ignition flashes.
  let budget = MAX_EFFECTS - effects.length;
  if (budget <= 0) return;
  const born = [];
  for (let i = 0; i < nodes.length; i++) {
    const s = nodes[i].start;
    if (s > prev && s <= now) born.push(nodes[i]);
  }
  if (born.length > 24) born.splice(0, born.length - 24); // densest frames: keep some
  born.forEach(function (n) {
    effects.push({ k: 'flash', x: n.start, lane: n.lane, t0: performance.now(), dur: 520 });
    budget--;
  });

  // Transitions: arcs into the successor/acquirer.
  apiEdgesAll.forEach(function (e) {
    if (budget <= 0) return;
    const y = e.year;
    if (y > prev && y <= now) {
      const fn = byId.get(e.from), tn = byId.get(e.to);
      if (!fn || !tn) return;
      effects.push({ k: 'arc', e: e, t0: performance.now(), dur: 750 });
      budget--;
    }
  });
}

let apiEdgesAll = [];

let anchorStart = null; // birth year of the anchor ISP (Telstra) for opening shot

function advance(dt, ts) {
  if (!playing) return;
  const prev = playhead;
  playhead = Math.min(T1, playhead + dt * YEARS_PER_SEC * speed);
  spawnCrossings(prev, playhead);
  scrub.value = String(playhead);

  // Era toast while playing forward.
  const era = eraAt(playhead);
  const key = era ? era.id : '';
  if (key !== currentEraKey) {
    currentEraKey = key;
    if (era && prev < playhead) showToast(era);
  }

  if (playhead >= T1) {
    playing = false;
    syncPlayButton();
    showOutro();
  }
}

function eraAt(t) {
  let best = null;
  for (let i = 0; i < ERAS.length; i++) {
    const e = ERAS[i];
    if (e.start <= t && (e.end == null || t <= e.end + 1)) {
      if (!best || e.start > best.start) best = e;
    }
  }
  return best;
}

function showToast(era) {
  elToast.textContent = '';
  const b = document.createElement('b');
  b.textContent = era.label;
  elToast.appendChild(b);
  const cap = ERA_CAPTIONS[era.id];
  if (cap) {
    const sp = document.createElement('span');
    sp.textContent = cap;
    elToast.appendChild(sp);
  }
  elToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { elToast.classList.remove('show'); }, 2600);
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
// Director's choreography while Follow is engaged and playing: start tight on
// Telstra, then dolly out (and slide the playhead from centre toward the right
// edge) until the whole 1975–today span is on screen at the finale.
function choreoVis() {
  const p = clamp((playhead - T0) / (T1 - T0), 0, 1);
  const e = p * p * (3 - 2 * p); // smoothstep: lingers close through the 70s
  return {
    vis: START_VIS_YEARS + ((T1 - T0 + 4) - START_VIS_YEARS) * e,
    frac: FOLLOW_FRAC + (END_FRAC - FOLLOW_FRAC) * e,
  };
}

function recentCentroidWorldY() {
  let sum = 0, wsum = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    let hit = 0;
    if (n.start > playhead - 2.6 && n.start <= playhead) hit = 1;
    if (hit === 0) continue;
    sum += wy(n.lane) * hit;
    wsum += hit;
  }
  if (wsum === 0) return null;
  return sum / wsum;
}

function updateCamera() {
  if (!follow) return;
  const ch = choreoVis();
  const targetX = playhead - ch.frac * visYears;
  camLeft += (targetX - camLeft) * 0.08;
  // Dolly only while playing, so paused/scrubbing zoom inspection sticks.
  if (playing) visYears += (ch.vis - visYears) * 0.03;

  const cy = recentCentroidWorldY();
  if (cy != null) {
    const targetY = cy - (H - CHROME_H) * 0.48;
    camTop += (clampCamTop(targetY) - camTop) * 0.05;
  }
}

function clampCamTop(y) {
  return clamp(y, -40, Math.max(-40, worldH - (H - CHROME_H) + 60));
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function draw(ts) {
  ctx.clearRect(0, 0, W, H);

  // Backdrop vignette.
  const g = ctx.createRadialGradient(W / 2, H * 0.35, H * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.85);
  g.addColorStop(0, '#0c1526');
  g.addColorStop(1, '#070d19');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  drawStars(ts);

  // Data layer never enters the reserved chrome band at the top (HUD + era
  // labels live there), so bars can't overrun the year text.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CHROME_H, W, H - CHROME_H);
  ctx.clip();
  drawEraBands();
  drawGrid();
  drawBars(ts);
  drawEffects(ts);
  drawPlayhead();
  ctx.restore();

  drawEraLabels();
}

function drawStars(ts) {
  if (REDUCED) return;
  const shift = (camLeft - T0) * pxPerYear() * 0.12;
  ctx.fillStyle = '#94a3b8';
  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    const sx = ((st.x * W * 1.5 - shift) % W + W) % W;
    const sy = ((st.y * H * 1.3 - camTop * 0.06) % H + H) % H;
    ctx.globalAlpha = 0.05 + 0.05 * Math.sin(ts * 0.001 * st.s + st.p);
    ctx.beginPath();
    ctx.arc(sx, sy, st.r, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function boostEraColor(c) {
  // eras.js colors are tuned for a white page ("…,0.13)"); lift alpha ~2x for dark bg.
  return typeof c === 'string' ? c.replace(/,\s*0?\.\d+\)$/, ',0.26)') : 'rgba(120,140,180,0.12)';
}

function drawEraBands() {
  const right = camLeft + visYears;
  for (let i = 0; i < ERAS.length; i++) {
    const e = ERAS[i];
    const s = Math.max(e.start, camLeft);
    const en = Math.min(e.end == null ? T1 : e.end + 1, right);
    if (en <= s) continue;
    const x0 = wx(s), x1 = wx(en);
    ctx.fillStyle = boostEraColor(e.color);
    ctx.fillRect(x0, CHROME_H, x1 - x0, H - CHROME_H);
  }
}

// Era labels live in the reserved chrome band: horizontal text with a colour
// swatch, pinned to each era's start. Overlaps are skipped (older eras win).
function drawEraLabels() {
  const right = camLeft + visYears;
  const sorted = ERAS.slice().sort(function (a, b) { return a.start - b.start; });
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let lastRight = -1e9;
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e.start < camLeft || e.start > right) continue;
    const label = e.label.toUpperCase();
    const tw = ctx.measureText(label).width;
    let x = wx(e.start) + 8;
    if (x < 8) x = 8;
    if (x < lastRight + 14) continue;

    // Colour swatch matching the band tint.
    ctx.fillStyle = boostEraColor(e.color);
    ctx.fillRect(x, CHROME_H - 19, 10, 10);
    ctx.fillStyle = 'rgba(226,236,250,0.92)';
    ctx.fillText(label, x + 16, CHROME_H - 10);
    lastRight = x + 16 + tw;
  }
}

function drawGrid() {
  const ypp = pxPerYear();
  let step = 1;
  const steps = [1, 2, 5, 10, 20];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i] / ypp >= 68) { step = steps[i]; break; }
    step = steps[i];
  }
  const first = Math.ceil(camLeft / step) * step;
  const last = camLeft + visYears;
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textBaseline = 'bottom';
  for (let yr = first; yr <= last; yr += step) {
    const x = wx(yr);
    const major = yr % 10 === 0;
    ctx.strokeStyle = major ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.07)';
    ctx.beginPath();
    ctx.moveTo(x, CHROME_H);
    ctx.lineTo(x, H - 34);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = 'rgba(139,152,173,0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(String(yr), x, H - 38);
    }
  }
}

function barGeom(n) {
  const start = n.start;
  const cap = n.end != null ? n.end : T1;
  const curEnd = Math.min(cap, Math.max(playhead, start));
  const x0 = wx(start);
  const x1 = wx(curEnd);
  return { x0: x0, x1: x1, w: Math.max(2, x1 - x0), y: wy(n.lane) };
}

function roundRectPath(x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBars(ts) {
  const laneA = Math.max(0, Math.floor((camTop - PADT) / LANE_H) - 1);
  const laneB = Math.min(laneBars.length - 1, Math.ceil((camTop + H - CHROME_H) / LANE_H) + 1);
  const labelOK = W / visYears > 9; // enough horizontal room to label bars

  for (let L = laneA; L <= laneB; L++) {
    const list = laneBars[L];
    if (!list) continue;
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.start > playhead) continue;
      const geo = barGeom(n);
      if (geo.x1 < -30 || geo.x0 > W + 30) continue;

      // Time-aware colour: alive while the playhead hasn't passed its end.
      const ended = n.end != null && playhead > n.end;
      const color = ended ? DEAD_COLOR : ALIVE_COLOR;

      let al = 0.92;
      if (ended) {                                 // absorbed / dead → fade out
        const k = Math.min(1, (playhead - n.end) / 1.4);
        al *= 1 - k * 0.8;
      }

      // Soft glow underlay, then bright core.
      ctx.globalAlpha = al * 0.22;
      ctx.fillStyle = color;
      ctx.fillRect(geo.x0, geo.y - BAR_H / 2 - 1.8, geo.w, BAR_H + 3.6);

      ctx.globalAlpha = al;
      roundRectPath(geo.x0, geo.y - BAR_H / 2, geo.w, BAR_H, 3);
      ctx.fill();

      // Freshly-born tip glows a little hotter.
      if (playhead - n.start < 1.2 && playing && !REDUCED) {
        ctx.globalAlpha = al * 0.9;
        ctx.beginPath();
        ctx.arc(geo.x1, geo.y, BAR_H * 0.72, 0, 6.2832);
        ctx.fill();
      }

      // Acquisition arrival pulse.
      if (n.pulseUntil > ts) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin((n.pulseUntil - ts) * 0.03);
        ctx.beginPath();
        ctx.arc(geo.x1, geo.y, BAR_H * 1.15, 0, 6.2832);
        ctx.fill();
      }

      if (n === hoverNode) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1;
        roundRectPath(geo.x0 - 1, geo.y - BAR_H / 2 - 1, geo.w + 2, BAR_H + 2, 3.5);
        ctx.stroke();
      }

      // Permanent labels once bars are wide enough (early decades / deep zoom).
      // Dark ink on the bright bar is far more readable than light-on-bright.
      if (labelOK && geo.w > 110 && al > 0.5) {
        ctx.globalAlpha = Math.min(0.9, al);
        ctx.fillStyle = ended ? LABEL_DEAD : LABEL_ALIVE;
        ctx.font = '600 10.5px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, geo.x0 + 7, geo.y);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function bez(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function drawEffects(ts) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    const age = ts - fx.t0;
    if (age > fx.dur) { effects.splice(i, 1); continue; }
    const p = easeOutCubic(age / fx.dur);

    if (fx.k === 'flash') {
      const x = wx(fx.x), y = wy(fx.lane);
      ctx.strokeStyle = 'rgba(230,240,255,' + (0.85 * (1 - p)).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, 2 + p * 13, 0, 6.2832);
      ctx.stroke();
      continue;
    }

    if (fx.k === 'ripple') {
      const x = wx(fx.x), y = wy(fx.lane);
      ctx.strokeStyle = fx.color;
      ctx.globalAlpha = 0.8 * (1 - p);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, 3 + p * 24, 0, 6.2832);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }

    if (fx.k === 'arc') {
      const fn = byId.get(fx.e.from), tn = byId.get(fx.e.to);
      if (!fn || !tn) continue;
      const p0 = { x: wx(fx.e.year), y: wy(fn.lane) };
      const p2 = { x: wx(fx.e.year + 0.4), y: wy(tn.lane) };
      const dy = Math.abs(p2.y - p0.y);
      const p1 = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - Math.min(130, 42 + dy * 0.18) };
      const col = TYPE_COLORS[fx.e.type] || TYPE_COLORS.acquisition;

      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const SEG = 22;
      for (let sIdx = 0; sIdx <= SEG * p; sIdx++) {
        const b = bez(p0, p1, p2, (sIdx / SEG));
        if (sIdx === 0) ctx.moveTo(b.x, b.y); else ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();

      // Travelling head.
      const head = bez(p0, p1, p2, p);
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, 6.2832);
      ctx.fill();

      if (p >= 1) { // arrived: ripple on the survivor + brief pulse glow
        effects.splice(i, 1);
        effects.push({ k: 'ripple', x: fx.e.year + 0.4, lane: tn.lane, color: col,
                       t0: ts, dur: 620 });
        tn.pulseUntil = ts + 500;
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlayhead() {
  const x = wx(playhead);
  if (x < -40 || x > W + 40) return;
  const grad = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.055)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 16, CHROME_H, 32, H - CHROME_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, CHROME_H);
  ctx.lineTo(x, H - 34);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(x - 5, CHROME_H); ctx.lineTo(x + 5, CHROME_H); ctx.lineTo(x, CHROME_H + 7);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// HUD + tooltip
// ---------------------------------------------------------------------------
function updateHud() {
  const yearStr = String(clamp(Math.floor(playhead), Math.floor(T0), 2100));
  let alive = 0, gone = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.start > playhead) continue;
    if (n.end == null || playhead <= n.end) alive++; else gone++;
  }
  if (yearStr !== hudCache.year) {
    hudCache.year = yearStr;
    elYear.textContent = yearStr;
  }
  if (alive !== hudCache.alive) {
    hudCache.alive = alive;
    elAlive.textContent = alive.toLocaleString('en-AU');
  }
  if (gone !== hudCache.gone) {
    hudCache.gone = gone;
    elGone.textContent = gone.toLocaleString('en-AU');
  }
}

function dispYear(disp, fallback) {
  return disp || fallback;
}

function tooltipHtmlInto(n) {
  elTip.textContent = '';
  const name = document.createElement('div');
  name.className = 'tip-name';
  name.textContent = n.label;
  elTip.appendChild(name);

  let life = dispYear(n.birthDisp, String(n.start)) + ' → ';
  if (n.absorbEdge && (n.death == null || n.absorbEdge.year <= n.death)) {
    const to = byId.get(n.absorbEdge.to);
    life += (n.absorbEdge.date_disp || String(n.absorbEdge.year)) +
      (to ? ' · absorbed by ' + to.label : '');
  } else if (n.death != null) {
    life += dispYear(n.deathDisp, String(n.death));
  } else {
    life += 'today';
  }
  const lifeEl = document.createElement('div');
  lifeEl.className = 'tip-life';
  lifeEl.textContent = life;
  elTip.appendChild(lifeEl);

  const former = n.names.filter(function (nm) { return nm.name !== n.label; }).slice(0, 3);
  if (former.length) {
    const f = document.createElement('div');
    f.className = 'tip-former';
    f.textContent = 'also: ' + former.map(function (nm) {
      return nm.name + (nm.start_year ? ' (' + nm.start_year + ')' : '');
    }).join(', ');
    elTip.appendChild(f);
  }

  const st = document.createElement('span');
  st.className = 'tip-status ' + n.status;
  st.textContent = n.status;
  elTip.appendChild(st);

  const open = document.createElement('div');
  open.className = 'tip-open';
  open.textContent = 'click to open full record ↗';
  elTip.appendChild(open);
}

function positionTip(mx, my) {
  const r = elTip.getBoundingClientRect();
  let x = mx + 14, y = my + 14;
  if (x + r.width > W - 8) x = mx - r.width - 14;
  if (y + r.height > H - 8) y = my - r.height - 14;
  elTip.style.left = x + 'px';
  elTip.style.top = y + 'px';
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------
function pickNode(mx, my) {
  // my is a screen coord; convert to data-area y before mapping to lanes.
  const dataY = my - CHROME_H;
  const laneF = (dataY + camTop - PADT - LANE_H / 2) / LANE_H;
  const base = Math.round(laneF);
  let best = null, bestD = 1e9;
  for (let d = 0; d <= 1; d++) {
    for (const L of (d === 0 ? [base] : [base - 1, base + 1])) {
      if (L < 0 || L >= laneBars.length) continue;
      const list = laneBars[L];
      for (let i = 0; i < list.length; i++) {
        const n = list[i];
        if (n.start > playhead) continue;
        const geo = barGeom(n);
        if (mx < geo.x0 - 4 || mx > geo.x0 + geo.w + 4) continue;
        const dy = Math.abs(my - geo.y);
        if (dy < BAR_H / 2 + 3 && dy < bestD) { bestD = dy; best = n; }
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Pointer interaction
// ---------------------------------------------------------------------------
stage.addEventListener('pointerdown', function (ev) {
  pointerDown = { x: ev.clientX, y: ev.clientY, cx: camLeft, cy: camTop };
  dragMoved = 0;
  stage.setPointerCapture(ev.pointerId);
});

stage.addEventListener('pointermove', function (ev) {
  const mx = ev.clientX, my = ev.clientY;
  if (pointerDown) {
    const dx = mx - pointerDown.x, dy = my - pointerDown.y;
    dragMoved = Math.max(dragMoved, Math.hypot(dx, dy));
    if (dragMoved > 4) {
      stage.classList.add('dragging');
      if (follow) setFollow(false);
      camLeft = pointerDown.cx - dx / pxPerYear();
      camTop = clampCamTop(pointerDown.cy - dy);
    }
    return;
  }
  // Hover picking
  const n = ready ? pickNode(mx, my) : null;
  if (n !== hoverNode) {
    hoverNode = n;
    if (n) {
      tooltipHtmlInto(n);
      elTip.hidden = false;
      stage.classList.add('hoverable');
    } else {
      elTip.hidden = true;
      stage.classList.remove('hoverable');
    }
  }
  if (n) positionTip(mx, my);
});

stage.addEventListener('pointerup', function (ev) {
  const wasClick = pointerDown && dragMoved <= 4;
  pointerDown = null;
  stage.classList.remove('dragging');
  if (wasClick && hoverNode && hoverNode.url) {
    window.open(hoverNode.url, '_blank', 'noopener');
  }
});

stage.addEventListener('pointercancel', function () {
  pointerDown = null;
  stage.classList.remove('dragging');
});

stage.addEventListener('pointerleave', function () {
  hoverNode = null;
  elTip.hidden = true;
  stage.classList.remove('hoverable');
});

stage.addEventListener('wheel', function (ev) {
  ev.preventDefault();
  const mx = ev.clientX;
  const yearAtMx = camLeft + mx / pxPerYear();
  const factor = Math.exp(ev.deltaY * 0.0012);
  visYears = clamp(visYears * factor, MIN_VIS, MAX_VIS);
  camLeft = yearAtMx - mx / pxPerYear();
  // Follow stays engaged: while playing, the dolly choreography gently
  // takes the zoom back; pause to inspect and your zoom sticks.
}, { passive: false });

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
function syncPlayButton() {
  btnPlay.textContent = playing ? '❚❚' : '▶';
}

function setFollow(v) {
  follow = v;
  chkFollow.checked = v;
}

btnPlay.addEventListener('click', function () {
  if (!ready) return;
  if (!playing && playhead >= T1) {
    playhead = T0;             // replay from the start
    effects.length = 0;
    outro.classList.add('hidden');
    setFollow(true);
    visYears = START_VIS_YEARS;
    camLeft = anchorStart - visYears * FOLLOW_FRAC;
    camTop = 0;
  }
  playing = !playing;
  syncPlayButton();
  btnPlay.blur();
});

selSpeed.addEventListener('change', function () {
  speed = parseFloat(selSpeed.value) || 1;
  selSpeed.blur();
});

scrub.addEventListener('input', function () {
  if (!ready) return;
  playhead = parseFloat(scrub.value);
  effects.length = 0;
  currentEraKey = (eraAt(playhead) || {}).id || '';
  outro.classList.add('hidden');
  if (playing) { playing = false; syncPlayButton(); }
});

chkFollow.addEventListener('change', function () { follow = chkFollow.checked; });

btnRestart.addEventListener('click', function () {
  if (!ready) return;
  restart();
  btnRestart.blur();
});

function restart() {
  playhead = T0;
  effects.length = 0;
  currentEraKey = '';
  visYears = START_VIS_YEARS;
  camLeft = anchorStart - visYears * FOLLOW_FRAC;
  camTop = 0;
  setFollow(true);
  outro.classList.add('hidden');
  playing = !REDUCED;
  syncPlayButton();
}

document.getElementById('btn-begin').addEventListener('click', function () {
  if (!ready) return;
  intro.classList.add('hidden');
  if (REDUCED) {
    playhead = T1 - 0.01;   // reduced motion: show the finished tableau
    playing = false;
  } else {
    playing = true;
  }
  syncPlayButton();
});

document.getElementById('btn-replay').addEventListener('click', restart);

window.addEventListener('keydown', function (ev) {
  const tag = ev.target && ev.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (!ready) return;
  switch (ev.key) {
    case ' ':
      ev.preventDefault();
      btnPlay.click();
      break;
    case 'ArrowLeft':
      playhead = Math.max(T0, playhead - (ev.shiftKey ? 1 : 0.25));
      effects.length = 0;
      break;
    case 'ArrowRight':
      playhead = Math.min(T1, playhead + (ev.shiftKey ? 1 : 0.25));
      effects.length = 0;
      break;
    case 'Home':
      restart();
      break;
    case 'f': case 'F':
      setFollow(!follow);
      break;
    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// Outro
// ---------------------------------------------------------------------------
function showOutro() {
  const founded = nodes.length;
  let active = 0;
  nodes.forEach(function (n) { if (n.status === 'active') active++; });

  document.getElementById('os-founded').textContent = founded.toLocaleString('en-AU');
  document.getElementById('os-gone').textContent = (founded - active).toLocaleString('en-AU');
  document.getElementById('os-alive').textContent = active.toLocaleString('en-AU');

  // Top acquirers: most acquisition targets absorbed.
  const inc = new Map();
  apiEdgesAll.forEach(function (e) {
    if (e.type !== 'acquisition') return;
    inc.set(e.to, (inc.get(e.to) || 0) + 1);
  });
  const top = Array.from(inc.entries())
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 5)
    .filter(function (kv) { return kv[1] >= 3; });
  const acqEl = document.getElementById('os-acq');
  acqEl.textContent = '';
  if (top.length) {
    acqEl.appendChild(document.createTextNode('Top acquirers: '));
    top.forEach(function (kv, i) {
      if (i) acqEl.appendChild(document.createTextNode(i < top.length - 1 ? ', ' : ' and '));
      const b = document.createElement('b');
      const rec = byId.get(kv[0]);
      b.textContent = (rec ? rec.label : '?') + ' (' + kv[1] + ')';
      acqEl.appendChild(b);
    });
  }
  outro.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Resize + main loop
// ---------------------------------------------------------------------------
function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  stage.width = Math.round(W * dpr);
  stage.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

function loop(ts) {
  const dt = lastFrame == null ? 0 : Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  if (ready) {
    advance(dt, ts);
    updateCamera();
    draw(ts);
    updateHud();
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
fetch(API, { headers: { Accept: 'application/json' } })
  .then(function (r) {
    if (!r.ok) throw new Error('API responded ' + r.status);
    return r.json();
  })
  .then(function (data) {
    apiEdgesAll = data.edges.filter(function (e) { return e.year != null; });
    build(data);
    resize();
    syncPlayButton();
  })
  .catch(function (err) {
    document.getElementById('loaderr-msg').textContent = String(err && err.message || err);
    loaderr.classList.remove('hidden');
  });

resize();
requestAnimationFrame(loop);

})();
