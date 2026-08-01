// Lightbox for every photograph on the page.
// Exposed as window.initLightbox() so the gallery can re-run it after rendering.
(function () {
  const SELECTOR =
    '.hero-strip figure, .grid figure, .about figure, .showcase-image, .gallery-grid figure';

  const box = document.getElementById('lightbox');
  if (!box) return;

  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-cap');
  const closeBtn = box.querySelector('.lb-close');
  const prevBtn = box.querySelector('.lb-prev');
  const nextBtn = box.querySelector('.lb-next');

  let images = [];
  let index = 0;
  let lastFocused = null;

  function show(i) {
    if (!images.length) return;
    index = (i + images.length) % images.length;
    const source = images[index];
    img.src = source.currentSrc || source.src;
    img.alt = source.alt;
    cap.textContent = source.alt;
  }

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    // Focus the dialog, not a button — a stray Enter/Space shouldn't fire an action.
    // preventScroll: focusing a fixed-position element otherwise yanks the page to the top.
    box.focus({ preventScroll: true });
  }

  function close() {
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      box.hidden = true;
      img.src = '';
    }, 250);
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  }

  // Re-scannable: picks up figures added to the DOM after load.
  function collect() {
    const figures = Array.from(document.querySelectorAll(SELECTOR));
    images = figures.map((f) => f.querySelector('img')).filter(Boolean);

    figures.forEach((trigger) => {
      if (trigger.dataset.lbBound) return;
      trigger.dataset.lbBound = 'true';
      const el = trigger.querySelector('img');
      if (!el) return;
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-label', 'View larger: ' + el.alt);
      trigger.addEventListener('click', () => open(images.indexOf(el)));
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(images.indexOf(el));
        }
      });
    });
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target === img.parentElement) close();
  });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  window.initLightbox = collect;
  collect();
})();
