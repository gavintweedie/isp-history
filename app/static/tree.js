/* ISP lineage tree view: cytoscape.js + dagre layered layout (top-to-bottom).
 *
 * Nodes are ISPs (border colour = status), edges are transitions (rename,
 * merger, acquisition, split) with arrowheads pointing at the successor.
 * Toolbar: text search (highlight as you type, Enter focuses the matched ISP's
 * family), status filters, an "unconnected" toggle that hides ISPs with no
 * transitions (default on, so the tree shows only connected families until
 * asked), and a fit button. Consumes the same /api/graph JSON as the SVG
 * timeline (graph.js).
 */
(function () {
  const el = document.getElementById('tree-view');
  if (!el) return;
  const API = el.dataset.api;
  const tip = document.getElementById('tooltip');
  const search = document.getElementById('tree-search');
  const hint = document.getElementById('tree-hint');
  const isoBox = document.querySelector('#tree-toolbar input[data-isolated]');

  window.loadGraph(API)
    .then(render)
    .catch(err => {
      el.textContent = '';
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Failed to load graph: ' + String(err);
      el.appendChild(p);
    });

  const toInt = nd => parseInt(nd.id().substring(1), 10);

  function render(data) {
    // ISPs touching no transition are "isolated"; they're hidden at load.
    const touched = new Set();
    data.edges.forEach(e => { touched.add(e.from); touched.add(e.to); });
    const isolated = new Set(data.nodes.map(n => n.id).filter(id => !touched.has(id)));

    const nodesById = {};
    data.nodes.forEach(n => { nodesById[n.id] = n; });

    const elements = [];
    data.nodes.forEach(n => elements.push({
      data: {
        id: 'n' + n.id,
        label: n.label,
        status: n.status || 'unknown',
        url: n.url,
        birth: n.birth || '?',
        death: n.death || '—',
      },
    }));
    data.edges.forEach(e => elements.push({
      data: {
        id: 'e' + e.id,
        source: 'n' + e.from,
        target: 'n' + e.to,
        type: e.type,
        arm: e.arm || '',
        year: e.year || '',
      },
    }));

    const cy = cytoscape({
      container: el,
      elements: elements,
      layout: { name: 'preset' },   // full dagre run happens in applyView()
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'label': 'data(label)',
            'font-family': 'system-ui, -apple-system, sans-serif',
            'font-size': 10,
            'color': '#222',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'label',
            'height': 24,
            'padding': '6px',
            'background-color': '#fff',
            'border-width': 2,
            'border-color': '#888',
          },
        },
        { selector: 'node[status="active"]', style: { 'border-color': '#2a7a2a' } },
        { selector: 'node[status="inactive"]', style: { 'border-color': '#a03a3a' } },
        {
          selector: 'node.hit',
          style: { 'background-color': '#fff3cd', 'border-color': '#e6a800', 'border-width': 3 },
        },
        {
          selector: 'node.hot',
          style: { 'background-color': '#dbe9ff', 'border-color': '#2a5db0', 'border-width': 3 },
        },
        {
          selector: 'edge.hot',
          style: { 'line-color': '#2a5db0', 'width': 3, 'target-arrow-color': '#2a5db0' },
        },
        {
          selector: 'node.dimmed',
          style: { 'opacity': 0.15, 'text-opacity': 0.15, 'border-opacity': 0.3 },
        },
        {
          selector: 'edge.dimmed',
          style: { 'opacity': 0.08, 'text-opacity': 0.08 },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.4,
            'line-color': '#999',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#999',
            'arrow-scale': 0.9,
            'curve-style': 'bezier',
            'label': 'data(year)',
            'font-family': 'system-ui, -apple-system, sans-serif',
            'font-size': 8,
            'color': '#999',
            'text-background-color': '#fafafa',
            'text-background-opacity': 0.8,
            'text-background-padding': '1px',
          },
        },
      ],
    });

    // ---- view state: focus id + node visibility ----
    let focusId = null;

    function connectedComponent(start) {
      const seen = new Set([start]);
      const stack = [start];
      while (stack.length) {
        const cur = stack.pop();
        data.edges.forEach(e => {
          if (e.from === cur && !seen.has(e.to)) { seen.add(e.to); stack.push(e.to); }
          if (e.to === cur && !seen.has(e.from)) { seen.add(e.from); stack.push(e.from); }
        });
      }
      return seen;
    }

    function statusOn() {
      const m = {};
      document.querySelectorAll('#tree-toolbar input[data-status]')
        .forEach(b => { m[b.dataset.status] = b.checked; });
      return m;
    }

    // The set of ISP ids to draw, given focus + status + unconnected toggles.
    function visibleIds() {
      const on = statusOn();
      if (focusId != null) {
        const comp = connectedComponent(focusId);
        const s = new Set();
        comp.forEach(id => { if (nodesById[id] && on[nodesById[id].status]) s.add(id); });
        return s;
      }
      const s = new Set();
      data.nodes.forEach(n => {
        if (!on[n.status]) return;
        if (isolated.has(n.id) && !isoBox.checked) return;
        s.add(n.id);
      });
      return s;
    }

    function applyView(fit) {
      const show = visibleIds();
      cy.nodes().forEach(nd => {
        nd.style('display', show.has(toInt(nd)) ? 'element' : 'none');
      });
      cy.edges().forEach(e => {
        const both = e.source().style('display') !== 'none' && e.target().style('display') !== 'none';
        e.style('display', both ? 'element' : 'none');
      });
      const visNodes = cy.nodes(':visible');
      if (!visNodes.length) return;
      layeredLayout(visNodes);
      if (fit) fitToWidth();
    }

    // ---- layered layout (Sugiyama-style) ----
    // Lay the visible graph out so lines overlap as little as possible:
    //   * parents directly above children (layers by lineage depth),
    //   * within-layer order minimises crossings (barycenter sweeps),
    //   * layers wider than a typical screen are wrapped into columns,
    //   * each connected family is one contiguous band, families stacked
    //     vertically (isolated ISPs pooled into a shared band).
    // (dagre's generation-rows put 128 ISPs of one family on a single row and
    //  made the tree ~18,000px wide; this layout is bounded by the screen.)
    function birthByCyId(id) {
      return birthYearOf(toInt(cy.getElementById(id)));
    }

    function layeredLayout(visNodes) {
      const visEdges = cy.edges(':visible');
      const parents = {}, children = {};
      visEdges.forEach(e => {
        (parents[e.target().id()] = parents[e.target().id()] || []).push(e.source().id());
        (children[e.source().id()] = children[e.source().id()] || []).push(e.target().id());
      });
      // depth = longest path from the roots (parents above children)
      const memo = {};
      function depth(id, seen) {
        if (memo[id] != null) return memo[id];
        if (seen.has(id)) return 0;
        seen.add(id);
        let m = 0;
        (parents[id] || []).forEach(p => m = Math.max(m, depth(p, seen) + 1));
        seen.delete(id);
        memo[id] = m; return m;
      }
      visNodes.forEach(n => depth(n.id(), new Set()));
      // connected components; singletons pooled into one band
      const adj = new Map();
      visNodes.forEach(n => adj.set(n.id(), new Set()));
      visEdges.forEach(e => {
        const s = adj.get(e.source().id()), t = adj.get(e.target().id());
        if (s && t) { s.add(e.target().id()); t.add(e.source().id()); }
      });
      const compOf = new Map();
      const comps = [];
      visNodes.forEach(n => {
        if (compOf.has(n.id())) return;
        const ids = [];
        const stack = [n.id()];
        compOf.set(n.id(), comps.length);
        while (stack.length) {
          const cur = stack.pop();
          ids.push(cur);
          (adj.get(cur) || []).forEach(nei => {
            if (!compOf.has(nei)) { compOf.set(nei, comps.length); stack.push(nei); }
          });
        }
        comps.push(ids);
      });
      const familyComps = comps.filter(c => c.length > 1);
      const pool = [].concat(...comps.filter(c => c.length === 1));
      const bands = pool.length ? [...familyComps, pool] : familyComps;
      bands.forEach(c => {
        c.minBirth = Math.min(...c.map(id => birthByCyId(id)));
      });
      bands.sort((a, b) => (a.minBirth - b.minBirth) || (a.length - b.length));

      const GAP = 12;
      const ROW_H = 46;
      const PAD = 24;
      const wOf = nd => nd.data('label').length * 6.5 + 18;
      let y = PAD + ROW_H / 2;
      bands.forEach(c => {
        const ids = new Set(c);
        const maxD = Math.max(...c.map(id => memo[id]));
        // per-family layers
        const layers = [];
        for (let di = 0; di <= maxD; di++) layers[di] = [];
        c.forEach(id => layers[memo[id]].push(id));
        // barycenter ordering: a node's row position tracks its neighbours,
        // which keeps parent/child close and minimises crossing edges
        const rank = {};
        layers.forEach((layer, di) => layer.forEach((i, j) => rank[i] = j));
        for (let it = 0; it < 8; it++) {
          for (let di = 1; di <= maxD; di++) {
            const ps = id => (parents[id] || []).filter(p => ids.has(p));
            layers[di].sort((a, b) =>
              ps(a).reduce((s, p) => s + rank[p], 0) / Math.max(1, ps(a).length)
              - ps(b).reduce((s, p) => s + rank[p], 0) / Math.max(1, ps(b).length));
            layers[di].forEach((i, j) => rank[i] = j);
          }
          for (let di = maxD - 1; di >= 0; di--) {
            const cs = id => (children[id] || []).filter(ch => ids.has(ch));
            layers[di].sort((a, b) =>
              cs(a).reduce((s, ch) => s + rank[ch], 0) / Math.max(1, cs(a).length)
              - cs(b).reduce((s, ch) => s + rank[ch], 0) / Math.max(1, cs(b).length));
            layers[di].forEach((i, j) => rank[i] = j);
          }
        }
        // wrap wide layers into width-capped segments
        const wAvg = c.reduce((s, id) => s + wOf(cy.getElementById(id)), 0) / c.length;
        const cap = Math.max(360, cy.width() * 0.92);
        const maxPerRow = Math.max(3, Math.floor(cap / (wAvg + GAP)));
        let prevD = null;
        for (let di = 0; di <= maxD; di++) {
          for (let s = 0; s < layers[di].length; s += maxPerRow) {
            const seg = layers[di].slice(s, s + maxPerRow);
            if (prevD != null && di !== prevD) y += 6;
            prevD = di;
            const wsum = seg.reduce((sum, id) => sum + wOf(cy.getElementById(id)), 0) + (seg.length - 1) * GAP;
            let x = (cy.width() - wsum) / 2;
            seg.forEach(id => {
              const w = wOf(cy.getElementById(id));
              cy.getElementById(id).position({ x: x + w / 2, y: y + ROW_H / 2 });
              x += w + GAP;
            });
            y += ROW_H;
          }
        }
        y += 36;
      });
    }

    // Earliest birth evidence for an ISP: its birth year, else the earliest
    // transition year touching it, else a fixed floor (keeps unknown dates out
    // of the way instead of letting them dominate the layout).
    const YEAR0 = 1980;
    function birthYearOf(id) {
      const n = nodesById[id];
      if (n && n.birth) return n.birth;
      let best = null;
      data.edges.forEach(e => {
        if (e.from === id || e.to === id) {
          if (e.year != null && (best == null || e.year < best)) best = e.year;
        }
      });
      return best == null ? YEAR0 : best;
    }

    // Fit the graph to the container's width (not height) so the tree fills a
    // typical screen width and uses vertical space by scrolling.
    function fitToWidth() {
      const nodes = cy.elements(':visible').nodes();
      if (!nodes.length) return;
      const bb = nodes.boundingBox();
      const pad = 30;
      const avail = Math.max(200, cy.width() - pad * 2);
      const zoom = Math.min(1.4, Math.max(0.06, avail / Math.max(1, bb.w)));
      cy.zoom(zoom);
      cy.pan({ x: pad - bb.x0 * zoom, y: pad - bb.y0 * zoom });
    }

    function clearFocus() {
      if (!focusId) return;
      focusId = null;
      hint.textContent = '';
      applyView(true);
    }

    // ---- click through to the detail page ----
    cy.on('tap', 'node', ev => { window.location = ev.target.data('url'); });

    // ---- hover tooltip (shares the #tooltip element with the timeline) ----
    cy.on('mousemove', 'node', ev => {
      const d = ev.target.data();
      showTip(`${d.label}  (${d.birth} → ${d.death})`, ev.originalEvent);
    });
    cy.on('mousemove', 'edge', ev => {
      const d = ev.target.data();
      showTip(`${d.type}${d.arm ? ' · ' + d.arm : ''} · ${d.year || '?'}`, ev.originalEvent);
    });
    cy.on('mouseout', 'node, edge', hideTip);

    // ---- hover highlight: trace the hovered ISP's path downstream ----
    // Show where the ISP ended up by following transitions forward (source →
    // target = older → newer) to today's remaining ISPs, dimming everything
    // outside that pathway and its edges. Down-tree only, not back up.
    function highlightNeighborhood(ele) {
      const start = ele.isNode() ? ele : ele.target();
      const hot = start.collection();
      const seen = new Set();
      const stack = [start];
      while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur.id())) continue;
        seen.add(cur.id());
        hot.merge(cur);
        cur.outgoers('edge').filter(':visible').forEach(e => {
          hot.merge(e);
          stack.push(e.target());
        });
      }
      if (!ele.isNode()) hot.merge(ele);
      hot.addClass('hot');
      cy.elements().difference(hot).addClass('dimmed');
    }
    cy.on('mouseover', 'node', ev => highlightNeighborhood(ev.target));
    cy.on('mouseover', 'edge', ev => highlightNeighborhood(ev.target));
    cy.on('mouseout', 'node, edge', () => cy.elements().removeClass('hot dimmed'));

    function showTip(text, ev) {
      tip.textContent = text;
      tip.style.left = (ev.clientX + 12) + 'px';
      tip.style.top = (ev.clientY - 30) + 'px';
      tip.style.display = 'block';
    }
    function hideTip() { tip.style.display = 'none'; }

    // ---- toolbar: search (highlight as you type, Enter focuses) ----
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      cy.nodes().removeClass('hit');
      if (!q) { clearFocus(); return; }
      const matches = cy.nodes().filter(n => n.data('label').toLowerCase().includes(q));
      matches.addClass('hit');
      // reveal hidden matches so "searchable even when hidden" actually works
      let changed = false;
      matches.forEach(n => {
        if (n.style('display') !== 'none') return;
        if (isolated.has(toInt(n)) && !isoBox.checked) { isoBox.checked = true; changed = true; }
        const box = document.querySelector(`#tree-toolbar input[data-status="${n.data('status')}"]`);
        if (box && !box.checked) { box.checked = true; changed = true; }
      });
      if (changed) applyView(true);
    });
    search.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { search.value = ''; clearFocus(); return; }
      if (ev.key !== 'Enter') return;
      const hits = cy.nodes('.hit');
      if (!hits.length) return;
      const node = hits[0];
      focusId = toInt(node);
      hint.textContent = `Showing ${node.data('label')} and everything connected to it. Clear the search to show all.`;
      applyView(true);
    });

    // ---- toolbar: status + unconnected filters (hidden ones drop from layout) ----
    document.querySelectorAll('#tree-toolbar input[data-status]').forEach(box =>
      box.addEventListener('change', () => applyView(true)));
    isoBox.addEventListener('change', () => applyView(true));

    // ---- tab revealed after being hidden at load: re-measure then refit ----
    document.addEventListener('tabshown', ev => {
      if (ev.detail === 'tree') { cy.resize(); applyView(true); }
    });

    // ---- initial view: isolated ISPs hidden by default ----
    isoBox.checked = false;
    applyView(true);
  }
})();