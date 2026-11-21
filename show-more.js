// Animals / Wilderness: show only the first row of photos until "Show more".
// Without JS every photo shows. The row length follows the grid's current
// column count, so it is one row on desktop, tablet and phone alike.
(function () {
  document.querySelectorAll('.grid[data-collapse]').forEach((grid) => {
    const btn = grid.nextElementSibling;
    if (!btn || !btn.classList.contains('show-more')) return;
    const figures = Array.from(grid.children);

    function columns() {
      return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    }

    function apply() {
      if (grid.classList.contains('is-open')) return;
      const n = columns();
      figures.forEach((f, i) => { f.hidden = i >= n; });
      btn.hidden = figures.length <= n;
    }

    btn.addEventListener('click', () => {
      grid.classList.add('is-open');
      figures.forEach((f) => { f.hidden = false; });
      btn.hidden = true;
    });

    apply();
    window.addEventListener('resize', apply);
  });
})();
