/* Timeline — horizontal Gantt (promoted from beta)
 *
 * Keeps the same family/band + free-direction layering + barycenter + staggering
 * as the main timeline, but renders ISP lifespans as horizontal bars (SLOPE=0)
 * instead of diagonals. No MIN_SEP buffer rows (unneeded when lines are
 * horizontal). Pool stays visible, same as production.
 */
(function () {
  const GRAPH = document.getElementById('graph');
  if (!GRAPH) return;
  const API = GRAPH.dataset.api;
  const SEARCH = document.getElementById('isp-filter');
  const W = 42;
  const PADX = 100;
  const PADT = 40;
  const SLOPE = 0;          // horizontal
  const TRACK_H = 24;       // 18 overlapped labels; 24 gives 2px gap (bar 5-13 vs next label)

  const LAYER_GAP = 6;
  const MIN_SEP = 0;        // no diagonal proximity check
  const CURRENT = new Date().getFullYear();
  const UNKNOWN_BIRTH = 1985;
  const BAR_H = 8;          // thickness of the horizontal bar (centered in track)
  const BAR_GAP = 8;        // min px gap between abutting bars on same row (W=42 px/yr)
  const BAR_GAP_YEARS = BAR_GAP / W;

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
  let currentFocus = null;
  let lockedId = null;           // click-locked lineage (upstream+downstream)
  let showDates = false;         // toggle for year labels on bars
  try { showDates = JSON.parse(localStorage.getItem('isp-show-dates') || 'false'); } catch(e) {}
  let eraTitles = [];
  let headerItems = [];
  let eraHeader = null;
  let svgWIDTH = 0;

  const ERAS = window.ERAS || [];
  const DEFAULT_ERAS = new Set(['dialup', 'predialup', 'dsl', 'nbn']);
  const eraEnabled = {};
  ERAS.forEach(e => { eraEnabled[e.id] = DEFAULT_ERAS.has(e.id); });
  try {
    const saved = JSON.parse(localStorage.getItem('isp-era-toggles') || '{}');
    ERAS.forEach(e => { if (typeof saved[e.id] === 'boolean') eraEnabled[e.id] = saved[e.id]; });
  } catch (e) {}

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
      if (!q) { currentFocus = null; lockedId = null; render(null); hint.textContent = ''; return; }
      const match = data.nodes.find(n =>
        n.slug === q || n.label.toLowerCase().includes(q));
      if (match) {
        currentFocus = match;
        lockedId = null;
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
      if (match) { currentFocus = match; lockedId = null; render(match); }
    });

    buildEraUI();

    const showDatesBox = document.getElementById('show-dates');
    if (showDatesBox) {
      showDatesBox.checked = showDates;
      showDatesBox.addEventListener('change', () => {
        showDates = showDatesBox.checked;
        try { localStorage.setItem('isp-show-dates', JSON.stringify(showDates)); } catch(e) {}
        render(currentFocus);
      });
    }

    // Esc clears locked lineage or search filter
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') {
        if (lockedId != null) { lockedId = null; const svg = document.querySelector('#graph svg.tg'); if(svg) svg.querySelectorAll('g.tg-line.hot,g.tg-line.dimmed,path.tg-edge.hot,path.tg-edge.dimmed').forEach(el=>el.classList.remove('hot','dimmed')); document.getElementById('filter-hint').textContent = ''; }
        else if (SEARCH.value) { SEARCH.value=''; currentFocus=null; render(null); document.getElementById('filter-hint').textContent=''; }
      }
    });

    render(null);
  }

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
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#era-picker')) {
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

    let nodeList = data.nodes;
    let edgeList = data.edges;
    if (focus) {
      const keep = connectedSubgraph(focus.id, data.nodes, data.edges);
      nodeList = data.nodes.filter(n => keep.has(n.id));
      edgeList = data.edges.filter(e => keep.has(e.from) && keep.has(e.to));
    }

    const base = nodeList.map(n => ({ ...n }));
    base.forEach(n => { byId[n.id] = n; });

    const edges = edgeList
      .filter(e => byId[e.from] && byId[e.to] && e.year != null)
      .map(e => ({ ...e }));

    const earliestProof = {};
    base.forEach(n => {
      let ev = n.birth;
      if (ev == null && n.death != null && n.death_precision === 'by') {
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
      if (n.x0 > n.x1) n.x0 = n.x1;
      return n;
    });

    const adj = {};
    nodes.forEach(n => { adj[n.id] = new Set(); });
    edges.forEach(e => { adj[e.from].add(e.to); adj[e.to].add(e.from); });

    const compOf = {};
    const comps = [];
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

    const familyComps = comps.filter(c => c.members.length > 1);
    const pool = [].concat(...comps.filter(c => c.members.length === 1).map(c => c.members));
    const poolSet = new Set(pool);
    familyComps.forEach(c => { c.minStart = Math.min(...c.members.map(i => byId[i].x0)); });
    const ordered = pool.length
      ? [...familyComps, { id: -1, members: pool, minStart: Math.min(...pool.map(i => byId[i].x0)), isPool: true }]
      : familyComps;
    ordered.sort((a, b) => (a.minStart - b.minStart) || (a.id - b.id));

    const levelOf = {};
    const longLeaves = new Set();
    familyComps.forEach(c => {
      let root = c.members[0];
      c.members.forEach(i => {
        if (adj[i].size > adj[root].size ||
            (adj[i].size === adj[root].size && i > root)) root = i;
      });
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
      const counts = new Map([[0, 1]]);
      const dirOf = new Map();   // id -> sign(levelOf[id] - levelOf[par[id]]): run direction
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
          const candUp = levelOf[p] + 1, candDn = levelOf[p] - 1;
          const up = counts.get(candUp) || 0;
          const dn = counts.get(candDn) || 0;
          // Levels of u's already-placed transition partners (excluding the
          // parent): choosing the side closer to them keeps chains and
          // satellite leaves vertically adjacent instead of scattered
          // (e.g. RuralNet -> Local Telecom & Internet -> Macarthurcook).
          const placedLv = [...adj[u]]
            .filter(v => v !== p && c.members.includes(v) && levelOf[v] != null)
            .map(v => levelOf[v]);
          const pd = dirOf.get(p) || 0;
          if (placedLv.length) {
            const cost = l => placedLv.reduce((s, v) => s + Math.abs(l - v), 0);
            const cu = cost(candUp), cd = cost(candDn);
            if (cu < cd) lv = candUp;
            else if (cd < cu) lv = candDn;
            else if (pd) lv = levelOf[p] + pd;
            else lv = up <= dn ? candUp : candDn;
          } else if (pd) {
            // Direction-sticky runs: keep walking the way the chain started
            // (A→B below A ⇒ C below B), only flipping when that side is
            // far more loaded — prevents zig-zags that scatter chains.
            if (pd > 0) lv = up <= dn * 3 ? candUp : candDn;
            else lv = dn <= up * 3 ? candDn : candUp;
          } else {
            lv = up <= dn ? candUp : candDn;
          }
        }
        dirOf.set(u, Math.sign(lv - levelOf[p]) || pd);
        levelOf[u] = lv;
        counts.set(lv, (counts.get(lv) || 0) + 1);
      });
    });
    // Sweep long-lived leaves next to their single family partner instead of
    // to the top of the whole family: pinning Telstra-style leaves at the
    // band's top left their direct children 40+ lanes below (Pacnet → Telstra
    // crossed everything in between). Adjacent pinning keeps the decades-long
    // bar clear of its own child's connector and packs the fan tightly.
    familyComps.forEach(c => {
      const leaves = c.members.filter(i => longLeaves.has(i));
      if (!leaves.length) return;
      const placed = c.members.filter(i => !longLeaves.has(i));
      leaves.forEach(i => {
        const nbrs = [...adj[i]].filter(v => c.members.includes(v)).sort((a, b) => a - b);
        if (nbrs.length) {
          levelOf[i] = Math.min(...nbrs.map(v => levelOf[v])) - 1;
        } else if (placed.length) {
          levelOf[i] = Math.min(...placed.map(j => levelOf[j])) - 1;
        } else {
          levelOf[i] = -1;
        }
      });
    });
    pool.forEach(i => { levelOf[i] = 0; });
    const memo = levelOf;

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

    function packLayer(layer, presorted) {
      const band = presorted
        ? layer.nodes.map(i => byId[i])
        : layer.nodes.map(i => byId[i])
            .sort((a, b) => (b.x1 - a.x1) || (a.x0 - b.x0));
      const tracks = [];
      const conflict = (n, t) => {
        for (const v of tracks[t]) {
          if (n.x0 < v.x1 + BAR_GAP_YEARS && n.x1 + BAR_GAP_YEARS > v.x0) return true;
        }
        return false; // MIN_SEP=0, but enforce small end-to-start gap
      };
      band.forEach(n => {
        let placed = false;
        for (let t = tracks.length - 1; t >= 0; t--) {
          if (!conflict(n, t)) { tracks[t].push(n); placed = true; break; }
        }
        if (placed) return;
        tracks.push([n]);
      });
      return tracks;
    }
    const years = [
      ...nodes.map(n => n.x0), ...nodes.map(n => n.x1),
      ...edges.map(e => e.year),
      CURRENT, UNKNOWN_BIRTH,
    ];
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const X = y => PADX + (y - minYear) * W;

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
    const lineY = (n, year) => Y0(n) + TRACK_H / 2; // center of track (horizontal)

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.classList.add('tg');
    svg.classList.add('tg-beta');

    headerItems.length = 0;
    for (let y = minYear; y <= maxYear; y++) {
      const x = X(y);
      headerItems.push({ kind: 'tick', x });
      if ((y - minYear) % 2) continue;
      headerItems.push({ kind: 'year', x: x + 2, label: String(y) });
    }

    const TYPES = ['acquisition', 'merger', 'rename', 'split'];
    const defs = document.createElementNS(ns, 'defs');
    TYPES.forEach(ty => {
      const marker = document.createElementNS(ns, 'marker');
      marker.setAttribute('id', 'tg-beta-arrow-' + ty);
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

    const eraBandTop = dataTop - ERAS_H;
    visibleEras.forEach(era => {
      const endYear = era.end == null ? CURRENT : era.end;
      const x0 = X(Math.max(era.start, minYear));
      const x1 = X(Math.min(endYear, maxYear) + 1);
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x0);
      rect.setAttribute('y', eraBandTop);
      rect.setAttribute('width', x1 - x0);
      rect.setAttribute('height', HEIGHT - eraBandTop);
      rect.setAttribute('fill', era.color);
      rect.classList.add('tg-era');
      svg.appendChild(rect);
    });
    eraTitles.length = 0;
    let eraLabelX = -Infinity;
    [...visibleEras]
      .sort((a, b) => (a.start - b.start) || a.id.localeCompare(b.id))
      .forEach(era => {
        const text = `${era.label} (${era.start}–${era.end == null ? 'present' : era.end})`;
        const x = Math.max(X(Math.max(era.start, minYear)) + 4, eraLabelX);
        eraTitles.push({ x, text, color: era.color });
        eraLabelX = x + text.length * 5.4 + 8 + 16;
      });

    const CONN_STEP_MAX = 4;
    const connOff = {};
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
        const trackEnd = [];
        const trackOfLocal = {};
        list.forEach(it => {
          let t = 0;
          while (t < trackEnd.length && trackEnd[t] > it.yTop) t++;
          if (t === trackEnd.length) trackEnd.push(it.yBot);
          else trackEnd[t] = it.yBot;
          trackOfLocal[it.id] = t;
        });
        const step = Math.min(CONN_STEP_MAX, (W - 4) / Math.max(1, trackEnd.length));
        list.forEach(it => {
          connOff[it.id] = (trackOfLocal[it.id] - (trackEnd.length - 1) / 2) * step;
        });
      });
    }

    edges.forEach(e => {
      const a = byId[e.from], b = byId[e.to];
      const year = e.year;
      const cx = X(year) + (connOff[e.id] || 0);
      const cy0 = lineY(a, year);
      const cy1 = lineY(b, year);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${cx} ${cy0} L ${cx} ${cy1}`);
      path.classList.add('tg-edge');
      const ty = TYPES.includes(e.type) ? e.type : 'acquisition';
      path.classList.add('ty-' + ty);
      path.setAttribute('marker-end', `url(#tg-beta-arrow-${ty})`);
      path.dataset.id = String(e.id);
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

    nodes.forEach(n => {
      const x0 = X(n.x0), x1 = X(n.x1);
      const y = Y0(n) + (TRACK_H - BAR_H) / 2;
      const g = document.createElementNS(ns, 'g');
      g.classList.add('tg-line');
      g.classList.add('tg-beta-line');
      g.style.cursor = 'pointer';
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (lockedId === n.id) { window.location = n.url; return; }
        lockedId = n.id;
        highlightConnected(n.id);
        const hint = document.getElementById('filter-hint');
        if (hint) hint.textContent = `Locked on ${n.label} — click again to open, Esc or click background to clear.`;
      });

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x0);
      rect.setAttribute('y', y);
      rect.setAttribute('width', Math.max(2, x1 - x0));
      rect.setAttribute('height', BAR_H);
      rect.setAttribute('rx', 3);
      rect.classList.add(n.status === 'active' ? 'st-active'
        : n.status === 'inactive' ? 'st-inactive' : 'st-unknown');
      if (!n.birth) rect.classList.add('st-placeholder');
      if (!n.death && n.status === 'active') rect.classList.add('st-alive');
      else if (!n.death) rect.classList.add('st-extends');
      g.appendChild(rect);

      const lab = document.createElementNS(ns, 'text');
      lab.setAttribute('x', x0 + 4);
      lab.setAttribute('y', y - 6);
      lab.textContent = n.label;
      lab.classList.add('tg-label');
      g.appendChild(lab);

      if (showDates) {
        const yearTxt = document.createElementNS(ns, 'text');
        yearTxt.setAttribute('x', x0 + 4);
        yearTxt.setAttribute('y', y + BAR_H + 11);
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
      }

      g.dataset.id = String(n.id);
      g.dataset.slug = n.slug;
      g.dataset.birth = (n.birth || '?') + precMarkOf(n.birth_precision);
      g.dataset.death = n.death
        ? n.death + precMarkOf(n.death_precision)
        : (n.status === 'active' ? 'present' : '—');
      svg.appendChild(g);
    });

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
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; if (lockedId == null) clearHighlight(); });

    // hover highlight — upstream + downstream only (not whole family)
    function clearHighlight() {
      svg.querySelectorAll('g.tg-line.hot, g.tg-line.dimmed, path.tg-edge.hot, path.tg-edge.dimmed')
        .forEach(el => el.classList.remove('hot','dimmed'));
    }
    function lineage(focusId) {
      // directed reachability: ancestors (can reach focus) + descendants (focus can reach)
      const fwd = new Map(), rev = new Map();
      allData.edges.forEach(e => {
        if (!fwd.has(e.from)) fwd.set(e.from, []);
        fwd.get(e.from).push(e.to);
        if (!rev.has(e.to)) rev.set(e.to, []);
        rev.get(e.to).push(e.from);
      });
      const down = new Set([focusId]);
      const stackD = [focusId];
      while (stackD.length) {
        const cur = stackD.pop();
        (fwd.get(cur) || []).forEach(n => { if (!down.has(n)) { down.add(n); stackD.push(n); } });
      }
      const up = new Set([focusId]);
      const stackU = [focusId];
      while (stackU.length) {
        const cur = stackU.pop();
        (rev.get(cur) || []).forEach(n => { if (!up.has(n)) { up.add(n); stackU.push(n); } });
      }
      const keep = new Set([...down, ...up]);
      // edges on those directed paths
      const keepEdges = new Set(allData.edges.filter(e =>
        (down.has(e.from) && down.has(e.to)) || (up.has(e.from) && up.has(e.to))
      ).map(e => String(e.id)));
      return { keep, keepEdges };
    }
    function highlightConnected(focusId) {
      const { keep, keepEdges } = lineage(focusId);
      svg.querySelectorAll('g.tg-line').forEach(g => {
        const id = g.dataset.id;
        const inKeep = keep.has(Number(id));
        g.classList.toggle('hot', inKeep);
        g.classList.toggle('dimmed', !inKeep);
      });
      svg.querySelectorAll('path.tg-edge').forEach(p => {
        const inKeep = keepEdges.has(p.dataset.id);
        p.classList.toggle('hot', inKeep);
        p.classList.toggle('dimmed', !inKeep);
      });
    }
    svg.addEventListener('mouseover', ev => {
      if (lockedId != null) return;
      const g = ev.target.closest('g.tg-line');
      const e = ev.target.closest('path.tg-edge');
      if (g && g.dataset.id) { highlightConnected(Number(g.dataset.id)); return; }
      if (e && e.dataset.type) {
        const fromNode = allData.nodes.find(n => n.slug === e.dataset.from);
        if (fromNode) highlightConnected(fromNode.id);
      }
    });
    svg.addEventListener('mouseout', ev => {
      if (lockedId != null) return;
      const leaving = ev.target.closest('g.tg-line, path.tg-edge');
      if (leaving) clearHighlight();
    });
    // click background clears lock
    svg.addEventListener('click', ev => {
      if (ev.target.closest('g.tg-line, path.tg-edge')) return;
      if (lockedId != null) {
        lockedId = null;
        clearHighlight();
        const hint = document.getElementById('filter-hint');
        if (hint && !currentFocus) hint.textContent = '';
      }
    });

    const container = document.getElementById('graph');
    container.innerHTML = '';
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
    if (lockedId != null) {
      // re-apply lock after re-render (e.g. era toggle)
      try { highlightConnected(lockedId); } catch(e) {}
      const n = allData.nodes.find(x => x.id === lockedId);
      const hint = document.getElementById('filter-hint');
      if (hint && n) hint.textContent = `Locked on ${n.label} — click again to open, Esc or click background to clear.`;
    }
  }
})();
