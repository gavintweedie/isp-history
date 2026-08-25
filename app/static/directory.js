/* Directory tab filtering: search box + status checkboxes. */
(function () {
  var search = document.getElementById('dir-search');
  var count = document.getElementById('dir-count');
  var boxes = Array.prototype.slice.call(
    document.querySelectorAll('#dir-active, #dir-inactive, #dir-unknown'));
  var rows = Array.prototype.slice.call(document.querySelectorAll('#dir-table tbody tr'));

  function apply() {
    var q = (search.value || '').trim().toLowerCase();
    var active = document.getElementById('dir-active').checked;
    var inactive = document.getElementById('dir-inactive').checked;
    var unknown = document.getElementById('dir-unknown').checked;
    var shown = 0;
    rows.forEach(function (r) {
      var st = r.dataset.status;
      var showStatus = (st === 'active' && active) ||
                       (st === 'inactive' && inactive) ||
                       (st === 'unknown' && unknown);
      var hay = (r.dataset.name + ' ' + r.dataset.domain + ' ' + (r.dataset.names || '')).toLowerCase();
      var show = showStatus && (!q || hay.indexOf(q) !== -1);
      r.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    if (count) count.textContent = shown + ' shown';
  }

  if (search) search.addEventListener('input', apply);
  boxes.forEach(function (b) { if (b) b.addEventListener('change', apply); });
  apply();
})();
