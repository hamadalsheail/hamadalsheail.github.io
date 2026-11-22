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
      const apply = () => {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        label();
      };
      // Cross-fade the whole page where the browser supports it and the
      // visitor hasn't asked for less motion; otherwise switch instantly.
      if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(apply);
      } else {
        apply();
      }
    });
  });

  media.addEventListener && media.addEventListener('change', label);
  label();
})();

// Phones and tablets: hide the top bar while scrolling down, bring it back on
// any scroll up (or near the top). Desktop keeps it fixed in place.
(function () {
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  const small = window.matchMedia('(max-width: 900px)');
  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const delta = y - lastY;
    if (!small.matches || y < bar.offsetHeight) {
      bar.classList.remove('topbar-hidden');
    } else if (delta > 6) {
      bar.classList.add('topbar-hidden');
    } else if (delta < -6) {
      bar.classList.remove('topbar-hidden');
    }
    if (Math.abs(delta) > 6) lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  bar.addEventListener('focusin', () => bar.classList.remove('topbar-hidden'));
})();
