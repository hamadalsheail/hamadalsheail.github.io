// Renders the gallery grid from the generated manifest, then hands the new
// figures to the shared lightbox.
(function () {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');
  if (!grid) return;

  const photos = Array.isArray(window.GALLERY) ? window.GALLERY : [];

  if (!photos.length) {
    empty.hidden = false;
    return;
  }

  const frag = document.createDocumentFragment();
  photos.forEach((photo, i) => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.alt || '';
    // The first screenful should not wait on the lazy-load observer.
    img.loading = i < 6 ? 'eager' : 'lazy';
    img.decoding = 'async';
    fig.appendChild(img);
    frag.appendChild(fig);
  });
  grid.appendChild(frag);

  if (typeof window.initLightbox === 'function') window.initLightbox();
})();
