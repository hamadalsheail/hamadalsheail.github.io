// Share button (_includes/share.html). Phones and tablets get the native share
// sheet (WhatsApp, X, Messages...); desktops copy the link and say so.
(function () {
  const buttons = document.querySelectorAll('.share-btn');
  if (!buttons.length) return;
  const touch = matchMedia('(pointer: coarse)').matches;

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    field.remove();
    return ok;
  }

  function flash(btn) {
    btn.classList.add('is-copied');
    clearTimeout(btn._shareTimer);
    btn._shareTimer = setTimeout(() => btn.classList.remove('is-copied'), 2200);
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = btn.dataset.shareUrl || location.href.split('#')[0];
      if (touch && navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return; // closed the sheet
        }
      }
      if (await copy(url)) flash(btn);
    });
  });
})();
