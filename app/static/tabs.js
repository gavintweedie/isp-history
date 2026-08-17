/* Tab switching on the graph page (Tree | Timeline) with #hash deep links. */

/* Shared graph-data loader: both the Tree (cytoscape) and Timeline (SVG) views
 * consume the same /api/graph JSON, so fetch it once and let the second view
 * reuse the already-in-flight promise instead of hitting the endpoint twice. */
window.loadGraph = (function () {
  let promise = null;
  return function (api) {
    if (!promise) promise = fetch(api).then(r => r.json());
    return promise;
  };
})();

(function () {
  const buttons = document.querySelectorAll('.tabs button[data-tab]');
  if (!buttons.length) return;

  function show(name) {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tabpanel').forEach(p => {
      p.hidden = p.id !== 'tab-' + name;
    });
    history.replaceState(null, '', '#' + name);
    // views that were hidden at load time may need to re-measure their container
    document.dispatchEvent(new CustomEvent('tabshown', { detail: name }));
  }

  buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));

  const initial = location.hash.slice(1);
  if (initial && document.getElementById('tab-' + initial)) show(initial);
})();
