// Search on the Writing page. Loads search.json on first use and filters the
// list in place. Arabic-aware: ignores diacritics and tatweel, and treats
// alef/yaa/taa-marbuta variants as the same letter, so "احمد" finds "أحمد".
(function () {
  const input = document.getElementById('post-search');
  const list = document.querySelector('.post-list');
  const status = document.getElementById('search-status');
  if (!input || !list) return;

  const items = Array.from(list.querySelectorAll('li'));
  let index = null;
  let loading = null;

  function normalize(s) {
    return (s || '')
      .toLowerCase()
      .replace(/[ً-ٰٟۖ-ۭ]/g, '') // harakat, Quranic marks
      .replace(/ـ/g, '')                             // tatweel
      .replace(/[آأإٱ]/g, 'ا')   // آ أ إ ٱ -> ا
      .replace(/ى/g, 'ي')                       // ى -> ي
      .replace(/ة/g, 'ه')                       // ة -> ه
      .replace(/ؤ/g, 'و')                       // ؤ -> و
      .replace(/ئ/g, 'ي')                       // ئ -> ي
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // ٠-٩ -> 0-9
      .replace(/\s+/g, ' ')
      .trim();
  }

  function load() {
    if (!loading) {
      loading = fetch('/search.json')
        .then((r) => r.json())
        .then((data) => {
          index = new Map(
            data.map((p) => [p.url, normalize([p.title, p.tags, p.text].join(' '))])
          );
        })
        .catch(() => { index = new Map(); });
    }
    return loading;
  }

  function run() {
    const terms = normalize(input.value).split(' ').filter(Boolean);
    let shown = 0;
    items.forEach((li) => {
      const url = li.querySelector('a').getAttribute('href');
      const hay = (index && index.get(url)) || normalize(li.textContent);
      const match = terms.every((t) => hay.includes(t));
      li.hidden = !match;
      if (match) shown++;
    });
    const ar = typeof window.siteLang === 'function' && window.siteLang() === 'ar';
    status.textContent = !terms.length ? ''
      : ar ? (shown ? toArabicDigits(shown) + (shown === 1 ? ' نص' : ' نصوص') : 'لا توجد نتائج')
      : (shown ? shown + (shown === 1 ? ' piece' : ' pieces') : 'Nothing found');
  }

  function toArabicDigits(n) {
    return String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
  }

  input.addEventListener('focus', load, { once: true });
  document.addEventListener('langchange', () => { if (input.value) run(); });
  input.addEventListener('input', () => load().then(run));

  // Support /writing/?q=word links.
  const q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; load().then(run); }
})();
