// Light/dark toggle. Default follows the system setting; a click picks the
// opposite of what is showing and remembers it on this device.
(function () {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.getAttribute('data-theme') || (media.matches ? 'dark' : 'light');
  }

  function label() {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.querySelectorAll('.theme-toggle').forEach((b) => {
      b.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    });
  }

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  });

  media.addEventListener && media.addEventListener('change', label);
  label();
})();
