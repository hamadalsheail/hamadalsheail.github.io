// Arabic / English switch. Arabic is the default; the choice is remembered on
// this device. _includes/lang-init.js applies it in <head> before first paint.
(function () {
  const root = document.documentElement;
  window.siteLang = () => (root.lang === 'en' ? 'en' : 'ar');

  function apply(lang) {
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    document.querySelectorAll('[data-placeholder-' + lang + ']').forEach((el) => {
      el.placeholder = el.getAttribute('data-placeholder-' + lang);
    });
    document.querySelectorAll('.lang-toggle').forEach((b) => {
      b.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = window.siteLang() === 'ar' ? 'en' : 'ar';
      try { localStorage.setItem('lang', next); } catch (e) {}
      apply(next);
    });
  });

  apply(window.siteLang());
})();
