/* ISP lineage timeline, in the style of the Linux Distribution Timeline.
 *
 * x-axis = time (years). Each ISP is a diagonal line from its birth year to its
 * death / merger year (dashed + evidence floor when birth is unknown; active
 * ISPs extend to the present). ISPs are stacked vertically as families: each
 * connected lineage (and a shared pool of isolated ISPs) occupies a contiguous
 * row band ordered by founding year, parents above children. Rows are packed so
 * lines never coincide and never pass within MIN_SEP px of a concurrent line.
 *
 * A search box filters the view to the connected subgraph around a chosen ISP.
 */
(function () {
  const GRAPH = document.getElementById('graph');
  const API = GRAPH.dataset.api;
  const SEARCH = document.getElementById('isp-filter');
  const W = 42;          // px per year
  const PADX = 100;      // left padding (labels)
  const PADT = 40;       // top padding (year axis)
  const SLOPE = 0.8;     // px per year the line descends over its lifetime
  const TRACK_H = 34;    // vertical space per row
  const LAYER_GAP = 6;   // extra vertical space between family bands
  const MIN_SEP = 6;     // keep any two concurrent lines at least this far apart
  const CURRENT = new Date().getFullYear();
  const UNKNOWN_BIRTH = 1985;   // floor for ISPs with no birth evidence

  // date-precision badges shown next to non-exact years (hover for explanation)
  const PREC_MARK = { approx: '~', by: '≤', unknown: '?' };
  const precExpl = (what, prec, year, disp) => {
    const shown = disp || year || '?';
    if (prec === 'approx')
      return `${what} is approximate (recorded as "${shown}"). See the ISP page for sources.`;
    if (prec === 'by')
      return `${what} is an upper bound — it happened by this year at the latest ` +
             `(recorded as "${shown}"). See the ISP page for sources.`;
    return `${what} is unknown — the year shown is a best-effort placeholder. ` +
           `See the ISP page for details.`;
  };
  const precMarkOf = (prec) => (prec && prec !== 'exact' ? (PREC_MARK[prec] || '?') : '');

  window.loadGraph(API)
    .then(setup)
    .catch(err => {
      GRAPH.textContent = '';
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Failed to load graph: ' + String(err);
      GRAPH.appendChild(p);
    });

  let allData = null;
  let currentFocus = null;   // ISP currently focused by the search box
  let eraTitles = [];        // {x, text} era title positions (SVG px)
  let headerItems = [];      // {kind:'year'|'tick', x, label} year-axis items
  let eraHeader = null;      // sticky HTML band that holds both rows
  let svgWIDTH = 0;          // last-rendered timeline width (SVG units)

  // ---- era overlays: display-only connectivity context ----
  // Defaults: the four broadband/mobile-era bands that frame the ISP history
  // are on; the mobile bands overlap them heavily, so those stay off unless
  // the user picks them. Anything the user saves overrides the defaults.
  const ERAS = window.ERAS || [];
  const DEFAULT_ERAS = new Set(['dialup', 'predialup', 'dsl', 'nbn']);
  const eraEnabled = {};   // era id -> bool
  ERAS.forEach(e => { eraEnabled[e.id] = DEFAULT_ERAS.has(e.id); });
  try {
    const saved = JSON.parse(localStorage.getItem('isp-era-toggles') || '{}');
    ERAS.forEach(e => { if (typeof saved[e.id] === 'boolean') eraEnabled[e.id] = saved[e.id]; });
  } catch (e) { /* corrupted state — ignore, stay with defaults */ }

  // Position the sticky era-title band so its spans line up with the eras'
  // band rects inside the (possibly scaled) SVG, in screen px.
  function formatEraHeader() {
    if (!eraHeader) return;
    const svg = document.querySelector('#graph svg.tg');
    const w = svg ? svg.getBoundingClientRect().width : 0;
    eraHeader.style.width = w + 'px';
    const k = (w && svgWIDTH) ? w / svgWIDTH : 0;
    Array.from(eraHeader.children).forEach(el => {
      el.style.left = ((el.dataset.x || 0) * k) + 'px';
    });
  }

  window.addEventListener('resize', formatEraHeader);
  document.addEventListener('tabshown', ev => {
    if (ev.detail === 'timeline') formatEraHeader();
  });

  function setup(data) {
    allData = data;
    // Build a datalist of ISP names for the search box.
    const dl = document.getElementById('isp-options');
    data.nodes.forEach(n => {
      const o = document.createElement('option');
      o.value = n.label;
      o.dataset.slug = n.slug;
      dl.appendChild(o);
    });

    SEARCH.addEventListener('input', () => {
      const q = SEARCH.value.trim().toLowerCase();
      const hint = document.getElementById('filter-hint');
      if (!q) { currentFocus = null; render(null); hint.textContent = ''; return; }
      const match = data.nodes.find(n =>
        n.slug === q || n.label.toLowerCase().includes(q));
      if (match) {
        currentFocus = match;
        render(match);
        hint.textContent = `Showing ${match.label} and everything connected to it. Clear to show all.`;
      } else {
        hint.textContent = 'No matching ISP.';
      }
    });
    SEARCH.addEventListener('change', () => {
      const q = SEARCH.value.trim().toLowerCase();
      const match = data.nodes.find(n =>
        n.slug === q || n.label.toLowerCase() === q);
      if (match) { currentFocus = match; render(match); }
    });

    buildEraUI();

    render(null);
  }

  // Build the era multi-select dropdown (per-era rows + master "all") from ERAS.
  function buildEraUI() {
    const btn = document.getElementById('era-btn');
    const menu = document.getElementById('era-menu');
    if (!btn || !menu || !ERAS.length) return;
    const box = id => menu.querySelector(`input[data-era="${id}"]`);
    const save = () => {
      try { localStorage.setItem('isp-era-toggles', JSON.stringify(eraEnabled)); } catch (e) {}
    };
    const rerender = () => render(currentFocus);
    const updateBtn = () => {
      const n = ERAS.filter(e => eraEnabled[e.id]).length;
      btn.textContent = n ? `Eras (${n})` : 'Eras';
      btn.classList.toggle('has-selection', !!n);
    };
    // master "all" row
    const masterLab = document.createElement('label');
    masterLab.classList.add('era-master');
    const master = document.createElement('input');
    master.type = 'checkbox';
    master.id = 'era-master';
    masterLab.appendChild(master);
    const masterSwatch = document.createElement('i');
    masterSwatch.className = 'era-swatch';
    masterSwatch.style.visibility = 'hidden';
    masterLab.appendChild(masterSwatch);
    const masterTxt = document.createElement('span');
    masterTxt.textContent = 'Select all';
    masterLab.appendChild(masterTxt);
    master.addEventListener('change', () => {
      ERAS.forEach(e => { eraEnabled[e.id] = master.checked; box(e.id).checked = master.checked; });
      save();
      updateBtn();
      rerender();
    });
    menu.appendChild(masterLab);
    ERAS.forEach(era => {
      const label = document.createElement('label');
      label.classList.add('era-row');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.era = era.id;
      cb.checked = eraEnabled[era.id];
      const swatch = document.createElement('i');
      swatch.className = 'era-swatch';
      swatch.style.background = era.color;
      label.appendChild(cb);
      label.appendChild(swatch);
      label.appendChild(document.createTextNode(era.label));
      cb.addEventListener('change', () => {
        eraEnabled[era.id] = cb.checked;
        master.checked = ERAS.every(e => eraEnabled[e.id]);
        save();
        updateBtn();
        rerender();
      });
      menu.appendChild(label);
    });
    master.checked = ERAS.every(e => eraEnabled[e.id]);
    // open/close the dropdown
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.era-picker')) {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    updateBtn();
  }

  // Return the ids of every node connected (in either direction) to the focus.
  function connectedSubgraph(focusId, allNodes, allEdges) {
    const adj = {};
    allNodes.forEach(n => adj[n.id] = []);
    allEdges.forEach(e => {
      adj[e.from].push(e.to);
      adj[e.to].push(e.from);
    });
    const seen = new Set([focusId]);
    const stack = [focusId];
    while (stack.length) {
      const cur = stack.pop();
      (adj[cur] || []).forEach(nei => {
        if (!seen.has(nei)) { seen.add(nei); stack.push(nei); }
      });
    }
    return seen;
  }

  function render(focus) {
    const data = allData;
    const byId = {};

    // Filter to the connected subgraph when focused.
    let nodeList = data.nodes;
    let edgeList = data.edges;
    if (focus) {
      const keep = connectedSubgraph(focus.id, data.nodes, data.edges);
      nodeList = data.nodes.filter(n => keep.has(n.id));
      edgeList = data.edges.filter(e => keep.has(e.from) && keep.has(e.to));
    }

    const base = nodeList.map(n => ({ ...n }));
    base.forEach(n => { byId[n.id] = n; });

    // usable edges (need both endpoints and a year to place on the timeline)
    const edges = edgeList
      .filter(e => byId[e.from] && byId[e.to] && e.year != null)
      .map(e => ({ ...e }));

    // earliest evidence year per ISP (birth, or the earliest "by" date that
    // proves existence, or the earliest transition year touching it) so
    // unknown births anchor at a defensible year instead of eating the whole
    // timeline — keeps rows shareable.
    const earliestProof = {};
    base.forEach(n => {
      let ev = n.birth;
      if (ev == null && n.death != null && n.death_precision === 'by') {
        // a "by YYYY" death still proves the ISP existed by then — use it
        // as the line's start rather than the fixed UNKNOWN_BIRTH floor.
        ev = n.death;
      }
      earliestProof[n.id] = ev;
    });
    edges.forEach(e => {
      [e.from, e.to].forEach(id => {
        const cur = earliestProof[id];
        if (cur == null || e.year < cur) earliestProof[id] = e.year;
      });
    });

    const nodes = base.map(n => {
      n.x0 = n.birth || earliestProof[n.id] || UNKNOWN_BIRTH;
      n.x1 = n.death || CURRENT;
      if (n.x0 > n.x1) n.x0 = n.x1;   // never start after we end
      return n;
    });

    // ---- vertical ordering (families first, then levels, then lifespan) ----
    // Connected components (undirected) are treated as "families": each gets a
    // contiguous row band ordered by founding year, with members spread above
    // and below their consolidator (see the layering below). Isolated ISPs
    // with no transitions share one pool band, packed so their lanes get
    // reused.
    const adj = {};
    nodes.forEach(n => { adj[n.id] = new Set(); });
    edges.forEach(e => { adj[e.from].add(e.to); adj[e.to].add(e.from); });

    const compOf = {};
    const comps = [];      // {id, members, isPool}
    let compCursor = 0;
    nodes.forEach(n => {
      if (compOf[n.id] != null) return;
      const members = [];
      const stack = [n.id];
      compOf[n.id] = compCursor;
      while (stack.length) {
        const cur = stack.pop();
        members.push(cur);
        adj[cur].forEach(nei => {
          if (compOf[nei] == null) { compOf[nei] = compCursor; stack.push(nei); }
        });
      }
      comps[compCursor] = { id: compCursor, members };
      compCursor++;
    });

    // every singleton becomes one shared pool band (no ordering constraints)
    const familyComps = comps.filter(c => c.members.length > 1);
    const pool = [].concat(...comps.filter(c => c.members.length === 1).map(c => c.members));
    const poolSet = new Set(pool);
    familyComps.forEach(c => { c.minStart = Math.min(...c.members.map(i => byId[i].x0)); });
    const ordered = pool.length
      ? [...familyComps, { id: -1, members: pool, minStart: Math.min(...pool.map(i => byId[i].x0)), isPool: true }]
      : familyComps;
    ordered.sort((a, b) => (a.minStart - b.minStart) || (a.id - b.id));

    // ---- vertical layering (free direction) ----
    // Rather than forcing every parent above its child, each family is rooted
    // at its highest-degree ISP (the consolidator) and every other member is
    // spread above *or* below it — so an acquirer's purchases fan on both
    // sides of its line and transitions may point either way. Neighbours are
    // kept one level apart (levels balanced above/below), which measurably
    // cuts connectors running through other timelines.
    const levelOf = {};
    const longLeaves = new Set();
    familyComps.forEach(c => {
      let root = c.members[0];
      c.members.forEach(i => {
        if (adj[i].size > adj[root].size ||
            (adj[i].size === adj[root].size && i > root)) root = i;
      });
      // spanning tree via BFS from the root (deterministic neighbour order)
      const par = {};
      const order = [root];
      const seen = new Set([root]);
      par[root] = null;
      const queue = [root];
      while (queue.length) {
        const u = queue.shift();
        [...adj[u]].sort((a, b) => a - b).forEach(v => {
          if (!seen.has(v)) { seen.add(v); par[v] = u; queue.push(v); order.push(v); }
        });
      }
      // signed levels: a child sits one level from its parent, on whichever
      // side currently holds fewer ISPs, so the fan uses both sides evenly
      const counts = new Map([[0, 1]]);
      levelOf[root] = 0;
      order.slice(1).forEach(u => {
        const p = par[u];
        // A long-lived family-leaf (e.g. Telstra) would run a decades-long
        // line straight through the acquirer's fan. It is swept to the very
        // top of the family below.
        const longLeaf = [...adj[u]].filter(v => c.members.includes(v)).length === 1
          && (byId[u].x1 - byId[u].x0) >= 30;
        if (longLeaf) longLeaves.add(u);
        let lv;
        if (longLeaf) {
          lv = levelOf[p] - 1;
        } else {
          const up = counts.get(levelOf[p] + 1) || 0;
          const dn = counts.get(levelOf[p] - 1) || 0;
          lv = levelOf[p] + (up <= dn ? 1 : -1);
        }
        levelOf[u] = lv;
        counts.set(lv, (counts.get(lv) || 0) + 1);
      });
    });
    // Sweep long-lived leaves to the top of their family, above every member's
    // fan, so no connector runs through their decades-long line.
    familyComps.forEach(c => {
      const leaves = c.members.filter(i => longLeaves.has(i));
      if (!leaves.length) return;
      const others = c.members.filter(i => !longLeaves.has(i));
      const top = Math.min(...others.map(i => levelOf[i]));
      leaves.forEach(i => { levelOf[i] = top - 1; });
    });
    pool.forEach(i => { levelOf[i] = 0; });
    const memo = levelOf;

    // layers: ordered top→bottom = family band → level. One stack of rows.
    const layers = [];
    ordered.forEach(comp => {
      if (comp.isPool) {
        layers.push({ key: '__pool__', nodes: comp.members });
        return;
      }
      const byLevel = {};
      comp.members.forEach(i => {
        const d = memo[i];
        (byLevel[d] = byLevel[d] || []).push(i);
      });
      Object.keys(byLevel).map(Number).sort((a, b) => a - b)
        .forEach(d => layers.push({ key: comp.id + '/' + d, nodes: byLevel[d] }));
    });

    // row packing per layer: no two ISPs in a row may be alive at the same year
    // (lines would coincide), and a row is skipped when a new line would pass
    // within MIN_SEP px of a concurrently-alive line in a neighbouring row.
    // Rows are filled longest-lived-first (latest death on top): a company's
    // acquisition line drops from near the bottom of its own band into near the
    // top of the successor's band, so the vertical connector crosses as few
    // other companies' lines as possible.
    function packLayer(layer, presorted) {
      const band = presorted
        ? layer.nodes.map(i => byId[i])
        : layer.nodes.map(i => byId[i])
            .sort((a, b) => (b.x1 - a.x1) || (a.x0 - b.x0));
      const tracks = [];
      const conflict = (n, t) => {
        for (const v of tracks[t]) {
          if (n.x0 < v.x1 && n.x1 > v.x0) return true;
        }
        for (const otherT of [t - 1, t + 1]) {
          const row = tracks[otherT];
          if (!row) continue;
          for (const v of row) {
            if (n.x0 >= v.x1 || n.x1 <= v.x0) continue;
            if (Math.abs(TRACK_H - SLOPE * Math.abs(v.x0 - n.x0)) < MIN_SEP) return true;
          }
        }
        return false;
      };
      band.forEach(n => {
        let placed = false;
        // Bottom-most row first: early-dead lines sink to the bottom of the
        // band, keeping rows beneath a dying company empty of lines alive on
        // its death date, so its acquisition connector crosses nothing there.
        for (let t = tracks.length - 1; t >= 0; t--) {
          if (!conflict(n, t)) { tracks[t].push(n); placed = true; break; }
        }
        if (placed) return;
        // Starting a new bottom row: the line must still keep MIN_SEP from the
        // row directly above it. If it wouldn't, leave an empty buffer row so
        // the two lines are not neighbours (first-fit skips this check).
        if (tracks.length) {
          for (const v of tracks[tracks.length - 1]) {
            if (n.x0 < v.x1 && n.x1 > v.x0 &&
                Math.abs(TRACK_H - SLOPE * Math.abs(v.x0 - n.x0)) < MIN_SEP) {
              tracks.push([]);
              break;
            }
          }
        }
        tracks.push([n]);
      });
      return tracks;
    }
    // ---- geometry ----
    const years = [
      ...nodes.map(n => n.x0), ...nodes.map(n => n.x1),
      ...edges.map(e => e.year),
      CURRENT, UNKNOWN_BIRTH,
    ];
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const X = y => PADX + (y - minYear) * W;

    // eras visible in this window; when shown, reserve a title band above the data
    const ERAS_H = 24;
    const visibleEras = ERAS.filter(era => {
      if (!eraEnabled[era.id]) return false;
      const endYear = era.end == null ? CURRENT : era.end;
      return era.start <= maxYear && endYear >= minYear;
    });
    const dataTop = PADT + (visibleEras.length ? ERAS_H : 0);

    const layerKeyOf = id => (poolSet.has(id) ? '__pool__' : compOf[id] + '/' + memo[id]);

    const trackOf = {};
    const tracksPerLayer = {};
    const bandTop = {};
    let height = 0;
    const rowY = n => bandTop[layerKeyOf(n.id)] + trackOf[n.id] * TRACK_H;
    function repack(presorted) {
      const layerTracks = layers.map(l => packLayer(l, presorted));
      layers.forEach((l, li) => {
        tracksPerLayer[l.key] = layerTracks[li].length;
        layerTracks[li].forEach((t, ti) => t.forEach(n => { trackOf[n.id] = ti; }));
      });
      let yAcc = dataTop;
      layers.forEach(l => {
        bandTop[l.key] = yAcc;
        yAcc += tracksPerLayer[l.key] * TRACK_H + LAYER_GAP;
      });
      height = yAcc + 20;
    }

    repack(false);

    // Barycenter sweeps: reorder each layer's rows so every ISP sits near the
    // median row of its neighbours — shortens connectors that point up as well
    // as down (e.g. Camtech → OzEmail) without moving anyone's band. Ties
    // (fan-ins to one child) break by transition year: the earliest parent sits
    // adjacent to the child, so its connector never slices through a sibling's
    // line (e.g. Simtex between EON and Highway 1).
    const minYearOf = {};
    edges.forEach(e => {
      if (e.year == null) return;
      [e.from, e.to].forEach(i => {
        if (minYearOf[i] == null || e.year < minYearOf[i]) minYearOf[i] = e.year;
      });
    });
    const bandOf = id => (poolSet.has(id) ? 0 : memo[id]);
    for (let it = 0; it < 4; it++) {
      const tgt = {};
      const signed = {};
      nodes.forEach(n => {
        const ns = [...adj[n.id]].filter(j => layerKeyOf(j) !== layerKeyOf(n.id));
        if (!ns.length) return;
        const pairs = ns.map(j => [rowY(byId[j]), j]).sort((a, b) => a[0] - b[0]);
        const m = pairs.length >> 1;
        let medY = pairs[m][0];
        const medJ = pairs[m][1];
        if (pairs.length % 2 === 0) medY = (pairs[m - 1][0] + medY) / 2;
        tgt[n.id] = medY;
        // child below -> connector points down -> earliest parent sinks to the
        // bottom (processed last); child above -> earliest parent on top
        const below = bandOf(medJ) > bandOf(n.id);
        const y = minYearOf[n.id] || 0;
        signed[n.id] = below ? -y : y;
      });
      layers.forEach(l => {
        if (l.key === '__pool__') return;
        l.nodes.sort((a, b) =>
          (tgt[a] == null ? Infinity : tgt[a]) - (tgt[b] == null ? Infinity : tgt[b])
          || (signed[a] == null ? 0 : signed[a]) - (signed[b] == null ? 0 : signed[b])
          || a - b);
      });
      repack(true);
    }

    const WIDTH = PADX + (maxYear - minYear + 1) * W + 40;
    svgWIDTH = WIDTH;
    const HEIGHT = height;
    const Y0 = rowY;
    // y of an ISP's line at a given year (descends SLOPE px per year of life)
    const lineY = (n, year) => Y0(n) + SLOPE * (year - n.x0);

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.classList.add('tg');

    // ---- year axis: collected here and drawn in the sticky header band ----
    headerItems.length = 0;
    for (let y = minYear; y <= maxYear; y++) {
      const x = X(y);
      headerItems.push({ kind: 'tick', x });
      if ((y - minYear) % 2) continue;
      headerItems.push({ kind: 'year', x: x + 2, label: String(y) });
    }

    // ---- arrowhead defs (one per transition type, coloured to match) ----
    const TYPES = ['acquisition', 'merger', 'rename', 'split'];
    const defs = document.createElementNS(ns, 'defs');
    TYPES.forEach(ty => {
      const marker = document.createElementNS(ns, 'marker');
      marker.setAttribute('id', 'tg-arrow-' + ty);
      marker.setAttribute('markerWidth', '8'); marker.setAttribute('markerHeight', '8');
      marker.setAttribute('refX', '7'); marker.setAttribute('refY', '4');
      marker.setAttribute('orient', 'auto');
      const poly = document.createElementNS(ns, 'path');
      poly.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
      poly.classList.add('tg-arrowhead');
      poly.classList.add('ty-' + ty);
      marker.appendChild(poly);
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    // ---- era bands (drawn first, behind transitions and lines) ----
    const eraBandTop = dataTop - ERAS_H;
    visibleEras.forEach(era => {
      const endYear = era.end == null ? CURRENT : era.end;
      const x0 = X(Math.max(era.start, minYear));
      const x1 = X(Math.min(endYear, maxYear) + 1);   // end inclusive
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x0);
      rect.setAttribute('y', eraBandTop);
      rect.setAttribute('width', x1 - x0);
      rect.setAttribute('height', HEIGHT - eraBandTop);
      rect.setAttribute('fill', era.color);
      rect.classList.add('tg-era');
      svg.appendChild(rect);
    });
    // era titles live in a sticky header (eraHeader) so they stay visible up the
    // top while the user scrolls the tall SVG. Keep the per-title positions here
    // (x in SVG px), laid left→right so they never overlap each other.
    eraTitles.length = 0;
    let eraLabelX = -Infinity;
    [...visibleEras]
      .sort((a, b) => (a.start - b.start) || a.id.localeCompare(b.id))
      .forEach(era => {
        const text = `${era.label} (${era.start}–${era.end == null ? 'present' : era.end})`;
        const x = Math.max(X(Math.max(era.start, minYear)) + 4, eraLabelX);
        eraTitles.push({ x, text, color: era.color });
        eraLabelX = x + text.length * 5.4 + 8 + 16;   // +16 for the colour chip
      });

    // ---- transition connector tracks ----
    // Each transition is drawn as a vertical line from the parent's line down
    // to the child's line at x = X(year). When several transitions happen in
    // one year (e.g. the 2001–03 ISP-bust acquisition waves) they'd overlap
    // exactly, so each year's connectors are spread across small horizontal
    // tracks: connectors whose vertical extents overlap get distinct x
    // positions (interval-graph track assignment), the rest share a track.
    const CONN_STEP_MAX = 4;        // max px between connector tracks
    const connOff = {};             // edge id -> px offset from X(year)
    {
      const byYear = new Map();
      edges.forEach(e => {
        if (!byYear.has(e.year)) byYear.set(e.year, []);
        const a = byId[e.from], b = byId[e.to];
        const ay = lineY(a, e.year), by = lineY(b, e.year);
        byYear.get(e.year).push({
          id: e.id,
          yTop: Math.min(ay, by),
          yBot: Math.max(ay, by),
        });
      });
      byYear.forEach(list => {
        list.sort((p, q) => p.yTop - q.yTop);
        const trackEnd = [];        // last yBot placed on each track
        const trackOf = {};
        list.forEach(it => {
          let t = 0;
          while (t < trackEnd.length && trackEnd[t] > it.yTop) t++;
          if (t === trackEnd.length) trackEnd.push(it.yBot);
          else trackEnd[t] = it.yBot;
          trackOf[it.id] = t;
        });
        const step = Math.min(CONN_STEP_MAX, (W - 4) / Math.max(1, trackEnd.length));
        list.forEach(it => {
          connOff[it.id] = (trackOf[it.id] - (trackEnd.length - 1) / 2) * step;
        });
      });
    }

    // ---- transitions (drawn first, beneath the lines) ----
    edges.forEach(e => {
      const a = byId[e.from], b = byId[e.to];
      const year = e.year;
      const cx = X(year) + (connOff[e.id] || 0);
      const yearAt = (cx - PADX) / W + minYear;
      const cy0 = lineY(a, Math.min(Math.max(yearAt, a.x0), a.x1));
      const cy1 = lineY(b, Math.min(Math.max(yearAt, b.x0), b.x1));
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${cx} ${cy0} L ${cx} ${cy1}`);
      path.classList.add('tg-edge');
      const ty = TYPES.includes(e.type) ? e.type : 'acquisition';
      path.classList.add('ty-' + ty);
      path.setAttribute('marker-end', `url(#tg-arrow-${ty})`);
      path.dataset.from = a.slug; path.dataset.to = b.slug;
      path.dataset.type = e.type; path.dataset.arm = e.arm || '';
      path.dataset.year = e.year;
      svg.appendChild(path);

      const arm = (e.arm || '').replace(/\b100\s*%\b/gi, '').trim();
      if (arm) {
        const lab = document.createElementNS(ns, 'text');
        lab.setAttribute('x', cx + 4);
        lab.setAttribute('y', (cy0 + cy1) / 2 - 5);
        lab.textContent = year + ': ' + arm;
        lab.classList.add('tg-edge-label');
        svg.appendChild(lab);
      }
    });

    // ---- ISP lines ----
    nodes.forEach(n => {
      const x0 = X(n.x0), x1 = X(n.x1);
      const y0 = lineY(n, n.x0), y1 = lineY(n, n.x1);
      const g = document.createElementNS(ns, 'g');
      g.classList.add('tg-line');
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => { window.location = n.url; });

      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${x0} ${y0} L ${x1} ${y1}`);
      path.classList.add(n.status === 'active' ? 'st-active'
        : n.status === 'inactive' ? 'st-inactive' : 'st-unknown');
      if (!n.birth) path.classList.add('st-placeholder');
      // no death year: thick solid line when known to be still alive;
      // dashed "extends" only when the death date (or liveness) is unknown
      if (!n.death && n.status === 'active') path.classList.add('st-alive');
      else if (!n.death) path.classList.add('st-extends');
      g.appendChild(path);

      const lab = document.createElementNS(ns, 'text');
      lab.setAttribute('x', x0 + 4);
      lab.setAttribute('y', y0 + 12);
      lab.textContent = n.label;
      lab.classList.add('tg-label');
      g.appendChild(lab);

      // year range as tspans so precision badges sit right after their year
      const yearTxt = document.createElementNS(ns, 'text');
      yearTxt.setAttribute('x', x0 + 4);
      yearTxt.setAttribute('y', y0 + 25);
      yearTxt.classList.add('tg-yearlabel');
      const addYears = (text, prec, expl) => {
        const ts = document.createElementNS(ns, 'tspan');
        ts.textContent = text;
        yearTxt.appendChild(ts);
        if (prec && prec !== 'exact') {
          const badge = document.createElementNS(ns, 'tspan');
          badge.setAttribute('dx', 1.5);
          badge.textContent = PREC_MARK[prec] || '?';
          badge.classList.add('tg-prec');
          badge.classList.add('prec-' + prec);
          badge.dataset.expl = expl;
          yearTxt.appendChild(badge);
        }
      };
      addYears(String(n.birth || '?'), n.birth && n.birth_precision,
               precExpl('Birth date', n.birth_precision, n.birth, n.birth_disp));
      addYears(n.death ? ' – ' + n.death : ' – present', n.death && n.death_precision,
               precExpl('Death date', n.death_precision, n.death, n.death_disp));
      g.appendChild(yearTxt);

      g.dataset.slug = n.slug;
      g.dataset.birth = (n.birth || '?') + precMarkOf(n.birth_precision);
      g.dataset.death = n.death
        ? n.death + precMarkOf(n.death_precision)
        : (n.status === 'active' ? 'present' : '—');
      svg.appendChild(g);
    });

    // ---- hover tooltip ----
    const tip = document.getElementById('tooltip');
    svg.addEventListener('mousemove', ev => {
      const prec = ev.target.closest('.tg-prec');
      const bar = ev.target.closest('g.tg-line');
      const edge = ev.target.closest('path.tg-edge');
      if (prec) {
        tip.textContent = prec.dataset.expl;
        tip.style.left = (ev.clientX + 12) + 'px';
        tip.style.top = (ev.clientY - 30) + 'px';
        tip.style.display = 'block';
      } else if (bar) {
        tip.textContent = `${bar.dataset.slug}  (${bar.dataset.birth} → ${bar.dataset.death})`;
        tip.style.left = (ev.clientX + 12) + 'px';
        tip.style.top = (ev.clientY - 30) + 'px';
        tip.style.display = 'block';
      } else if (edge) {
        tip.textContent = `${edge.dataset.type} ${edge.dataset.arm ? '· ' + edge.dataset.arm : ''} · ${edge.dataset.year}`;
        tip.style.left = (ev.clientX + 12) + 'px';
        tip.style.top = (ev.clientY - 30) + 'px';
        tip.style.display = 'block';
      } else {
        tip.style.display = 'none';
      }
    });
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

    const container = document.getElementById('graph');
    container.innerHTML = '';
    // sticky year-axis + era-title band goes first so it pins to the container
    eraHeader = document.createElement('div');
    eraHeader.className = 'era-header';
    headerItems.forEach(it => {
      const span = document.createElement('span');
      span.dataset.x = String(it.x);
      if (it.kind === 'tick') span.className = 'tg-h-tick';
      else { span.className = 'tg-h-year'; span.textContent = it.label; }
      eraHeader.appendChild(span);
    });
    eraTitles.forEach(t => {
      const span = document.createElement('span');
      span.className = 'tg-h-era';
      span.dataset.x = String(t.x);
      span.textContent = t.text;
      span.style.background = t.color;
      eraHeader.appendChild(span);
    });
    container.appendChild(eraHeader);
    container.appendChild(svg);
    formatEraHeader();
  }
})();
