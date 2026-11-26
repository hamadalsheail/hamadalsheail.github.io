// Zine Maker: an eight-page zine on one sheet, built and exported in the
// browser. Nothing leaves the device; work is kept in IndexedDB.
(function () {
  'use strict';

  // Sheet sizes in inches, landscape.
  const SIZES = {
    a4: { label: 'A4', w: 297 / 25.4, h: 210 / 25.4 },
    a3: { label: 'A3', w: 420 / 25.4, h: 297 / 25.4 },
  };
  /* ---------- Language (follows the site's EN / ع toggle) ---------- */

  const STR = {
    en: {
      pages: 'Zine pages', settings: 'Zine settings', moveEarlier: 'Move earlier', moveLater: 'Move later',
      drag: 'Drag to reorder', fit: 'Photo fit', zoom: 'Zoom', close: 'Close',
      prevSpread: 'Previous spread', nextSpread: 'Next spread',
      ltr: 'Left to right', rtl: 'Right to left (Arabic)',
      labels: ['Front cover', 'Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 5', 'Page 6', 'Back cover'],
      short: ['Cover', '1', '2', '3', '4', '5', '6', 'Back'],
      spreads: ['Front cover', 'Pages 1–2', 'Pages 3–4', 'Pages 5–6', 'Back cover'],
      textFor: 'Text for ', addTo: 'Add photo to ',
      verdict: { ok: 'Sharp', warn: 'Acceptable, slight softness', bad: 'Will look soft' },
      at: ' at ', ppi: ' PPI',
      bestAll: 'Best paper, all sharp', largestOk: 'Largest acceptable', now: 'Now: ', none: 'None',
      thPage: 'Page', thPhoto: 'Photo', thBest: 'Best size', belowAll: 'Below A4',
      unit: 'Numbers are effective PPI.',
      badFile: 'That file could not be read as an image.',
      onlyFit: (k) => 'Only ' + k + ' photo' + (k === 1 ? '' : 's') + ' fit: every page already has one.',
      exportFail: 'Export failed. Try a smaller paper size or fewer large photos.',
      sheet: ' sheet', rtlNote: ', right-to-left',
      blank: (n) => '. ' + n + ' page' + (n === 1 ? ' is' : 's are') + ' still blank.',
      foldTitle: 'How to fold', foldKey: 'Thin line: fold.   Red dashes: cut.',
      layout: 'Page layout', layPhoto: 'Photo', layText: 'Text only', layTop: 'Text above photo', layBottom: 'Text below photo',
      textSize: 'Text size', sizeS: 'Small text', sizeM: 'Medium text', sizeL: 'Large text',
      align: 'Text alignment', alignCenter: 'Centred', alignStart: 'Aligned to the line start', writeHere: 'Write here',
    },
    ar: {
      pages: 'صفحات الكتيّب', settings: 'إعدادات الكتيّب', moveEarlier: 'انقلها إلى الصفحة السابقة', moveLater: 'انقلها إلى الصفحة التالية',
      drag: 'اسحب لإعادة الترتيب', fit: 'ملاءمة الصورة', zoom: 'تكبير', close: 'إغلاق',
      prevSpread: 'الصفحتان السابقتان', nextSpread: 'الصفحتان التاليتان',
      ltr: 'من اليسار إلى اليمين', rtl: 'من اليمين إلى اليسار (عربي)',
      labels: ['الغلاف الأمامي', 'صفحة ١', 'صفحة ٢', 'صفحة ٣', 'صفحة ٤', 'صفحة ٥', 'صفحة ٦', 'الغلاف الخلفي'],
      short: ['الغلاف', '١', '٢', '٣', '٤', '٥', '٦', 'الخلفي'],
      spreads: ['الغلاف الأمامي', 'الصفحتان ١–٢', 'الصفحتان ٣–٤', 'الصفحتان ٥–٦', 'الغلاف الخلفي'],
      textFor: 'نص ', addTo: 'أضف صورة إلى ',
      verdict: { ok: 'صافية', warn: 'مقبولة، بلينٍ خفيف', bad: 'ستبدو باهتة' },
      at: ' على ', ppi: ' PPI',
      bestAll: 'أفضل ورقٍ تصفو فيه الصور كلها', largestOk: 'أكبر مقاسٍ مقبول', now: 'الآن: ', none: 'لا شيء',
      thPage: 'الصفحة', thPhoto: 'الصورة', thBest: 'أفضل مقاس', belowAll: 'دون مقاس A4',
      unit: 'الأرقام دقةٌ فعلية بوحدة PPI.',
      badFile: 'تعذّرت قراءة هذا الملف كصورة.',
      onlyFit: (k) => 'اتسعت الصفحات لـ' + num(k) + ' صور فقط؛ فلم تبقَ صفحةٌ بلا صورة.',
      exportFail: 'تعثّر التصدير. جرّب ورقًا أصغر أو صورًا أخفّ.',
      sheet: '', rtlNote: '، من اليمين إلى اليسار',
      blank: (n) => '. ' + (n === 1 ? 'صفحةٌ واحدة ما زالت بيضاء.' : num(n) + ' صفحات ما زالت بيضاء.'),
      foldTitle: 'طريقة الطي', foldKey: 'الخط الرفيع: طيّ.   الأحمر المتقطّع: قصّ.',
      layout: 'تخطيط الصفحة', layPhoto: 'صورة', layText: 'نص فقط', layTop: 'نص فوق الصورة', layBottom: 'نص تحت الصورة',
      textSize: 'حجم الخط', sizeS: 'خط صغير', sizeM: 'خط متوسط', sizeL: 'خط كبير',
      align: 'محاذاة النص', alignCenter: 'في الوسط', alignStart: 'من بداية السطر', writeHere: 'اكتب هنا',
    },
  };
  const root = document.documentElement;
  const lang = () => (root.lang === 'en' ? 'en' : 'ar');
  const t = (k) => STR[lang()][k];
  // Arabic-Indic digits in Arabic.
  const num = (n) => (lang() === 'ar' ? String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));
  const sizeLabel = (k) => SIZES[k].label;
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const INK = '#242424';
  const WHITE = '#ffffff';
  const MAX_PIXELS = 16.7e6; // iOS canvas limit
  const MAX_IMG = 5000;      // long side kept for uploaded photos
  // Print advisor: zine pages are held in the hand, so 300 PPI is the
  // target at every sheet size; 75% of it still prints acceptably.
  const TARGET_PPI = 300;
  const ORDER = ['a4', 'a3'];
  const ZOOM_MAX = 4;

  // Where each page sits on the sheet (left-to-right zine): [column, row].
  // Row 0 prints upside down. Right-to-left zines mirror the columns.
  const SLOTS = [[3, 1], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [1, 1], [2, 1]];

  const blank = () => ({ img: null, blob: null, fit: 'cover', caption: '', zoom: 1, fx: 0.5, fy: 0.5, layout: 'photo', tsize: 'm', talign: 'center' });
  // Page layouts: a photo (with an optional caption band), a text page, or
  // half text and half photo. Text pages keep any photo hidden, not deleted.
  const LAYOUTS = ['photo', 'text', 'text-top', 'text-bottom'];
  const TEXT_SIZE = { s: 0.05, m: 0.068, l: 0.09 }; // starting size, share of page width
  const MIN_PT = 7; // below this, printed text is hard to read
  const isTextPage = (p) => p.layout !== 'photo';
  // The photo actually printed on a page.
  const shownImg = (p) => (p.layout === 'text' ? null : p.img);
  let state = { size: 'a4', dir: 'ltr', border: false, panels: Array.from({ length: 8 }, blank) };

  const $ = (s, el) => (el || document).querySelector(s);
  const grid = $('#zm-grid');
  const tpl = $('#zm-card');
  const cards = [];

  /* ---------- Images ---------- */

  function decode(blob) {
    if (window.createImageBitmap) {
      return createImageBitmap(blob).catch(() => decodeEl(blob));
    }
    return decodeEl(blob);
  }
  function decodeEl(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      im.src = url;
    });
  }
  function toBlob(canvas, type, q) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), type, q);
    });
  }

  // Shrink big photos once on import so memory and storage stay sane.
  async function importFile(file) {
    if (!file || !/^image\//.test(file.type)) return null;
    let img = await decode(file);
    let blob = file;
    const w = img.width, h = img.height;
    const s = Math.min(1, MAX_IMG / Math.max(w, h));
    if (s < 1 || file.size > 5e6) {
      const c = document.createElement('canvas');
      c.width = Math.round(w * s);
      c.height = Math.round(h * s);
      const x = c.getContext('2d');
      x.fillStyle = WHITE;
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      blob = await toBlob(c, 'image/jpeg', 0.92);
      img = await decode(blob);
    }
    return { img, blob };
  }

  /* ---------- Drawing ---------- */

  function fontFor(rtl, size) {
    return rtl
      ? '400 ' + size + 'px "Amiri", "Geeza Pro", serif'
      : '400 ' + size + 'px "Amiri", Georgia, serif';
  }

  function wrap(ctx, text, maxW) {
    const out = [];
    text.split('\n').forEach((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      let line = '';
      words.forEach((word) => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxW || !line) {
          line = test;
        } else {
          out.push(line);
          line = word;
        }
        // A single word wider than the line: break it by characters.
        while (ctx.measureText(line).width > maxW && line.length > 1) {
          let i = line.length - 1;
          while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxW) i--;
          out.push(line.slice(0, i));
          line = line.slice(i);
        }
      });
      out.push(line);
    });
    return out;
  }

  // Fit text into a box, shrinking the size until it does.
  function layoutText(ctx, text, maxW, maxH, size) {
    const rtl = AR.test(text);
    for (let n = 0; n < 24; n++) {
      ctx.font = fontFor(rtl, size);
      const lines = wrap(ctx, text, maxW);
      const lh = size * (rtl ? 1.75 : 1.4);
      if (lines.length * lh <= maxH || n === 23) return { lines, lh, size, rtl, h: lines.length * lh };
      size *= 0.88;
    }
  }

  // `align`: 'center', 'left' or 'right'; x is the anchor for that alignment.
  function drawText(ctx, t, cx, top, align) {
    ctx.save();
    ctx.font = fontFor(t.rtl, t.size);
    ctx.fillStyle = INK;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    try { ctx.direction = t.rtl ? 'rtl' : 'ltr'; } catch (e) {}
    t.lines.forEach((line, i) => ctx.fillText(line, cx, top + t.lh * (i + 0.5)));
    ctx.restore();
  }

  // Where a photo lands inside its frame. zoom >= 1; fx/fy (0..1) pick
  // which part stays in view when the photo is larger than the frame.
  function imageRect(p, x, y, w, h) {
    const iw = p.img.width, ih = p.img.height;
    const base = p.fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    const s = base * (p.zoom || 1);
    const dw = iw * s, dh = ih * s;
    const fx = p.fx == null ? 0.5 : p.fx, fy = p.fy == null ? 0.5 : p.fy;
    return { x: x + (w - dw) * fx, y: y + (h - dh) * fy, w: dw, h: dh, frame: { x, y, w, h } };
  }

  // Photo frame and text block for one page, shared by drawing and the advisor.
  function panelLayout(ctx, p, x, y, w, h) {
    const inset = state.border ? w * 0.07 : 0;
    const ax = x + inset, ay = y + inset, aw = w - inset * 2, ah = h - inset * 2;
    const text = (p.caption || '').trim();
    const pad = w * 0.07;
    const out = { ax, ay, aw, ah, t: null, textTop: 0, photo: null, box: null, photoBox: null };
    if (isTextPage(p)) {
      const half = ah / 2;
      if (p.layout === 'text') {
        out.box = { x: ax, y: ay, w: aw, h: ah };
      } else {
        const top = p.layout === 'text-top';
        out.box = { x: ax, y: top ? ay : ay + half, w: aw, h: half };
        out.photoBox = { x: ax, y: top ? ay + half : ay, w: aw, h: half };
        if (p.img) out.photo = imageRect(p, ax, out.photoBox.y, aw, half);
      }
      if (text) {
        const b = out.box;
        out.t = layoutText(ctx, text, b.w - pad * 2, b.h - pad * 2, w * (TEXT_SIZE[p.tsize] || TEXT_SIZE.m));
        out.textTop = b.y + (b.h - out.t.h) / 2;
        if (p.talign === 'start') {
          out.align = out.t.rtl ? 'right' : 'left';
          out.textX = out.t.rtl ? b.x + b.w - pad : b.x + pad;
        }
      }
      return out;
    }
    if (p.img) {
      let band = 0;
      if (text) {
        out.t = layoutText(ctx, text, aw - pad * 2, ah * 0.4, w * 0.058);
        band = out.t.h + pad * (state.border ? 1 : 1.6);
        out.textTop = ay + ah - band + (band - out.t.h) / 2;
      }
      out.photo = imageRect(p, ax, ay, aw, ah - band);
    } else if (text) {
      out.t = layoutText(ctx, text, aw - pad * 2, ah - pad * 2, w * 0.085);
      out.textTop = ay + (ah - out.t.h) / 2;
    }
    return out;
  }

  // `hint` (on-screen cards only) marks an empty text area.
  function renderPanel(ctx, p, x, y, w, h, hint) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = WHITE;
    ctx.fillRect(x, y, w, h);
    const L = panelLayout(ctx, p, x, y, w, h);
    if (L.photo) {
      const r = L.photo, f = r.frame;
      ctx.save();
      ctx.beginPath();
      ctx.rect(f.x, f.y, f.w, f.h);
      ctx.clip();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(p.img, r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    if (L.t) drawText(ctx, L.t, L.textX == null ? L.ax + L.aw / 2 : L.textX, L.textTop, L.align);
    else if (hint && L.box) drawHint(ctx, L.box, w);
    ctx.restore();
  }

  function drawHint(ctx, b, w) {
    const m = w * 0.06;
    ctx.save();
    ctx.strokeStyle = '#c9c0b8';
    ctx.lineWidth = Math.max(1, w / 220);
    ctx.setLineDash([w / 50, w / 70]);
    ctx.strokeRect(b.x + m, b.y + m, b.w - m * 2, b.h - m * 2);
    ctx.setLineDash([]);
    ctx.fillStyle = '#a39a90';
    ctx.font = fontFor(lang() === 'ar', w * 0.075);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.direction = lang() === 'ar' ? 'rtl' : 'ltr'; } catch (e) {}
    ctx.fillText(t('writeHere'), b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }

  /* ---------- Print advisor ---------- */

  const measureCtx = document.createElement('canvas').getContext('2d');
  // Effective PPI of a page's photo when the zine is printed on `sizeKey`.
  function ppiFor(p, sizeKey) {
    if (!shownImg(p)) return null;
    const L = pointLayout(p, sizeKey);
    return p.img.width / (L.photo.w / 72);
  }
  // A page laid out in printer's points for a sheet size.
  function pointLayout(p, sizeKey) {
    const s = SIZES[sizeKey];
    return panelLayout(measureCtx, p, 0, 0, (s.w / 4) * 72, (s.h / 2) * 72);
  }
  function verdict(ppi) {
    return ppi >= TARGET_PPI ? 'ok' : ppi >= TARGET_PPI * 0.75 ? 'warn' : 'bad';
  }
  const verdictText = (v) => t('verdict')[v];
  const RANK = { ok: 0, warn: 1, bad: 2 };
  // Worst verdict across all photo pages at a sheet size (null: no photos).
  function sheetVerdict(sizeKey) {
    let worst = null;
    state.panels.forEach((p) => {
      if (!shownImg(p)) return;
      const v = verdict(ppiFor(p, sizeKey));
      if (!worst || RANK[v] > RANK[worst]) worst = v;
    });
    return worst;
  }
  // Largest sheet where this photo is still sharp.
  function bestFor(p) {
    let best = null;
    BY_AREA.forEach((k) => { if (verdict(ppiFor(p, k)) === 'ok') best = k; });
    return best;
  }
  const BY_AREA = ORDER.slice().sort((a, b) => SIZES[a].w * SIZES[a].h - SIZES[b].w * SIZES[b].h);

  function slotOf(i) {
    const s = SLOTS[i];
    return { col: state.dir === 'rtl' ? 3 - s[0] : s[0], row: s[1] };
  }

  // The whole imposed sheet. `guides` adds fold/cut lines for on-screen use.
  function renderSheet(ctx, W, H, guides) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, W, H);
    const pw = W / 4, ph = H / 2;
    state.panels.forEach((p, i) => {
      const { col, row } = slotOf(i);
      const x = col * pw, y = row * ph;
      if (row === 0) {
        ctx.save();
        ctx.translate(x + pw, y + ph);
        ctx.rotate(Math.PI);
        renderPanel(ctx, p, 0, 0, pw, ph);
        ctx.restore();
      } else {
        renderPanel(ctx, p, x, y, pw, ph);
      }
    });
    if (guides) drawGuides(ctx, 0, 0, W, H, Math.max(1, W / 700));
  }

  function drawGuides(ctx, x, y, W, H, lw) {
    ctx.save();
    ctx.strokeStyle = 'rgba(36,36,36,0.4)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    for (let c = 1; c < 4; c++) { ctx.moveTo(x + (W * c) / 4, y); ctx.lineTo(x + (W * c) / 4, y + H); }
    ctx.moveTo(x, y + H / 2); ctx.lineTo(x + W / 4, y + H / 2);
    ctx.moveTo(x + (W * 3) / 4, y + H / 2); ctx.lineTo(x + W, y + H / 2);
    ctx.stroke();
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = lw * 2;
    ctx.setLineDash([lw * 4, lw * 3]);
    ctx.beginPath();
    ctx.moveTo(x + W / 4, y + H / 2); ctx.lineTo(x + (W * 3) / 4, y + H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Small labelled diagram of the sheet, used in the fold dialog and the PDF.
  function drawFoldDiagram(ctx, x, y, W, H, fg) {
    const pw = W / 4, ph = H / 2, lw = Math.max(1, W / 360);
    ctx.save();
    ctx.fillStyle = WHITE;
    ctx.fillRect(x, y, W, H);
    ctx.strokeStyle = fg;
    ctx.lineWidth = lw;
    ctx.strokeRect(x, y, W, H);
    ctx.font = '700 ' + Math.round(ph * 0.16) + 'px "Amiri", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const { col, row } = slotOf(i);
      const cx = x + col * pw + pw / 2, cy = y + row * ph + ph / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (row === 0) ctx.rotate(Math.PI);
      ctx.fillStyle = i === 0 || i === 7 ? '#A85A00' : INK;
      ctx.fillText(t('short')[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
    drawGuides(ctx, x, y, W, H, lw);
  }

  /* ---------- Cards ---------- */

  function buildCards() {
    for (let i = 0; i < 8; i++) {
      const li = tpl.content.firstElementChild.cloneNode(true);
      const card = {
        li,
        canvas: $('.zp-canvas', li),
        file: $('.zp-file', li),
        caption: $('.zp-caption', li),
      };
      li.dataset.index = i;
      wireCard(card, i);
      grid.appendChild(li);
      cards.push(card);
    }
  }

  function wireCard(card, i) {
    const li = card.li;
    const pick = () => card.file.click();
    $('.zp-add', li).addEventListener('click', pick);
    $('.zp-replace', li).addEventListener('click', pick);
    $('.zp-remove', li).addEventListener('click', () => {
      Object.assign(state.panels[i], { img: null, blob: null, zoom: 1, fx: 0.5, fy: 0.5 });
      setAdjust(i, false);
      changed(i);
    });
    card.file.addEventListener('change', async () => {
      const f = card.file.files[0];
      card.file.value = '';
      await setImage(i, f);
    });
    wireZoom(card, i);
    li.querySelectorAll('.zp-fit button').forEach((b) => {
      b.addEventListener('click', () => { state.panels[i].fit = b.dataset.fit; changed(i); });
    });
    li.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
      const p = state.panels[i];
      p.layout = b.dataset.layout;
      if (p.layout === 'text') setAdjust(i, false);
      changed(i);
    }));
    li.querySelectorAll('[data-tsize]').forEach((b) => b.addEventListener('click', () => {
      state.panels[i].tsize = b.dataset.tsize;
      changed(i);
    }));
    li.querySelectorAll('[data-talign]').forEach((b) => b.addEventListener('click', () => {
      state.panels[i].talign = b.dataset.talign;
      changed(i);
    }));
    // Tapping the text area of the page jumps to the text box.
    $('.zp-write', li).addEventListener('click', () => {
      if (adjusting === i) return;
      card.caption.focus();
    });
    card.caption.addEventListener('input', () => {
      state.panels[i].caption = card.caption.value;
      changed(i);
    });
    $('.zp-prev', li).addEventListener('click', () => move(i, i - 1, true));
    $('.zp-next', li).addEventListener('click', () => move(i, i + 1, true));

    // Files dropped on a page.
    const stage = $('.zp-stage', li);
    stage.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      li.classList.add('is-drop');
    });
    stage.addEventListener('dragleave', () => li.classList.remove('is-drop'));
    stage.addEventListener('drop', async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      li.classList.remove('is-drop');
      const files = [...e.dataTransfer.files].filter((f) => /^image\//.test(f.type));
      if (files.length) await setImage(i, files[0]);
      if (files.length > 1) await fillEmpty(files.slice(1));
    });

    // Reorder by dragging the card (from its grip).
    $('.zp-grip', li).addEventListener('pointerdown', () => { li.draggable = true; });
    li.addEventListener('dragstart', (e) => {
      if (!li.draggable) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-zine-page', String(i));
      li.classList.add('is-dragging');
    });
    li.addEventListener('dragend', () => {
      li.draggable = false;
      li.classList.remove('is-dragging');
      grid.querySelectorAll('.is-target').forEach((el) => el.classList.remove('is-target'));
    });
    li.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('text/x-zine-page')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      li.classList.add('is-target');
    });
    li.addEventListener('dragleave', (e) => {
      if (!li.contains(e.relatedTarget)) li.classList.remove('is-target');
    });
    li.addEventListener('drop', (e) => {
      const from = e.dataTransfer.getData('text/x-zine-page');
      if (from === '') return;
      e.preventDefault();
      li.classList.remove('is-target');
      move(+from, i, false);
    });
  }

  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');

  async function setImage(i, file) {
    const card = cards[i];
    card.li.classList.add('is-busy');
    try {
      const r = await importFile(file);
      if (r) Object.assign(state.panels[i], { img: r.img, blob: r.blob, zoom: 1, fx: 0.5, fy: 0.5 });
    } catch (e) {
      alertLine(t('badFile'));
    }
    card.li.classList.remove('is-busy');
    changed(i);
  }

  async function fillEmpty(files) {
    let k = 0;
    for (let i = 0; i < 8 && k < files.length; i++) {
      const p = state.panels[i];
      if (!p.img && p.layout !== 'text') await setImage(i, files[k++]);
    }
    if (k < files.length) alertLine(t('onlyFit')(k));
  }

  // Swap with a neighbour (arrow buttons) or lift and insert (drag).
  function move(from, to, swap) {
    if (to < 0 || to > 7 || from === to) return;
    const ps = state.panels;
    if (swap) {
      [ps[from], ps[to]] = [ps[to], ps[from]];
    } else {
      const [p] = ps.splice(from, 1);
      ps.splice(to, 0, p);
    }
    refreshAll();
    save();
    const btn = $(to > from ? '.zp-next' : '.zp-prev', cards[to].li);
    if (swap && !btn.disabled) btn.focus();
  }

  /* ---------- Zoom and pan (per page) ---------- */

  let adjusting = -1;
  function setAdjust(i, on) {
    if (on && adjusting >= 0 && adjusting !== i) setAdjust(adjusting, false);
    const li = cards[i].li;
    li.classList.toggle('is-adjusting', on);
    $('.zp-adjust', li).hidden = !on;
    $('.zp-zoom', li).setAttribute('aria-expanded', String(on));
    if (on) adjusting = i; else if (adjusting === i) adjusting = -1;
  }
  function setZoom(i, z) {
    const p = state.panels[i];
    p.zoom = Math.min(ZOOM_MAX, Math.max(1, z));
    changed(i);
  }
  // Frame of the photo on the card canvas, in CSS pixels.
  function cardPhoto(i) {
    const c = cards[i].canvas, r = c.getBoundingClientRect();
    const L = panelLayout(measureCtx, state.panels[i], 0, 0, r.width, r.height);
    return L.photo;
  }
  function wireZoom(card, i) {
    const li = card.li, stage = $('.zp-stage', li), range = $('.zp-zoom-range', li);
    $('.zp-zoom', li).addEventListener('click', () => setAdjust(i, adjusting !== i));
    $('.zp-zoom-done', li).addEventListener('click', () => setAdjust(i, false));
    $('.zp-zoom-reset', li).addEventListener('click', () => {
      Object.assign(state.panels[i], { zoom: 1, fx: 0.5, fy: 0.5 });
      changed(i);
    });
    range.addEventListener('input', () => setZoom(i, range.value / 100));

    const pts = new Map();
    let start = null;
    stage.addEventListener('pointerdown', (e) => {
      if (adjusting !== i || !shownImg(state.panels[i])) return;
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = state.panels[i];
      start = { pts: new Map(pts), fx: p.fx, fy: p.fy, zoom: p.zoom, rect: cardPhoto(i) };
    });
    stage.addEventListener('pointermove', (e) => {
      if (!start || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = state.panels[i];
      if (pts.size >= 2 && start.pts.size >= 2) {
        const [a, b] = [...pts.values()], [a0, b0] = [...start.pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1;
        setZoom(i, start.zoom * (d / d0));
        return;
      }
      const s0 = start.pts.get(e.pointerId);
      if (!s0) return;
      const r = start.rect, f = r.frame;
      const ox = r.w - f.w, oy = r.h - f.h; // how far the photo can travel
      if (Math.abs(ox) > 0.5) p.fx = Math.min(1, Math.max(0, start.fx - (e.clientX - s0.x) / ox));
      if (Math.abs(oy) > 0.5) p.fy = Math.min(1, Math.max(0, start.fy - (e.clientY - s0.y) / oy));
      changed(i);
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      if (!pts.size) { start = null; return; }
      const p = state.panels[i];
      start = { pts: new Map(pts), fx: p.fx, fy: p.fy, zoom: p.zoom, rect: cardPhoto(i) };
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', (e) => {
      if (adjusting !== i || !shownImg(state.panels[i])) return;
      e.preventDefault();
      setZoom(i, state.panels[i].zoom * Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    stage.addEventListener('dblclick', () => {
      if (adjusting !== i) return;
      Object.assign(state.panels[i], { zoom: 1, fx: 0.5, fy: 0.5 });
      changed(i);
    });
  }

  function refreshCard(i) {
    const card = cards[i], p = state.panels[i], li = card.li;
    const z = Math.round((p.zoom || 1) * 100);
    const label = t('labels')[i];
    $('.zp-label', li).textContent = label;
    card.caption.setAttribute('aria-label', t('textFor') + label);
    $('.zp-add', li).setAttribute('aria-label', t('addTo') + label);
    $('.zp-zoom-range', li).value = z;
    $('.zp-zoom-val', li).textContent = num(z) + (lang() === 'ar' ? '٪' : '%');
    const badge = $('.zp-ppi', li);
    const img = shownImg(p);
    if (img) {
      const ppi = ppiFor(p, state.size), v = verdict(ppi);
      badge.hidden = false;
      $('.zm-dot', badge).className = 'zm-dot is-' + v;
      $('span', badge).textContent = num(Math.round(ppi)) + t('ppi');
      badge.title = verdictText(v) + t('at') + sizeLabel(state.size);
    } else {
      badge.hidden = true;
      if (adjusting === i) setAdjust(i, false);
    }
    li.classList.toggle('has-img', !!img);
    li.classList.toggle('has-text', !!p.caption.trim());
    li.dataset.layout = p.layout;
    li.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.layout === p.layout)));
    li.querySelectorAll('[data-tsize]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tsize === p.tsize)));
    li.querySelectorAll('[data-talign]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.talign === p.talign)));
    const tp = isTextPage(p);
    card.caption.placeholder = card.caption.getAttribute('data-placeholder-' + (tp ? 'text-' : '') + lang());
    card.caption.rows = tp ? 5 : 2;
    // Warn when the text had to shrink below a readable print size.
    let small = false;
    if (tp && p.caption.trim()) {
      const L = pointLayout(p, state.size);
      small = !!L.t && L.t.size < MIN_PT;
    }
    $('.zp-textwarn', li).hidden = !small;
    li.querySelectorAll('.zp-fit button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fit === p.fit)));
    if (card.caption.value !== p.caption) card.caption.value = p.caption;
    $('.zp-prev', li).disabled = i === 0;
    $('.zp-next', li).disabled = i === 7;
    drawCard(i);
  }

  function drawCard(i) {
    const c = cards[i].canvas;
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    renderPanel(c.getContext('2d'), state.panels[i], 0, 0, w, h, true);
  }

  function refreshAll() {
    const s = SIZES[state.size];
    grid.style.setProperty('--panel-ratio', (s.w / 4) + ' / ' + (s.h / 2));
    for (let i = 0; i < 8; i++) refreshCard(i);
    refreshAdvisor();
  }

  const advisorEl = $('#zm-advisor');
  const dotHtml = (v) => '<i class="zm-dot is-' + v + '"></i>';
  function refreshAdvisor() {
    // Paper buttons: worst photo at each size.
    sizeBtns.forEach((b) => {
      const v = sheetVerdict(b.dataset.size);
      const dot = $('.zm-dot', b);
      dot.className = 'zm-dot' + (v ? ' is-' + v : '');
      b.title = v ? sizeLabel(b.dataset.size) + ': ' + verdictText(v) : sizeLabel(b.dataset.size);
    });
    const rows = state.panels.map((p, i) => ({ p, i })).filter((r) => shownImg(r.p));
    if (!rows.length) {
      advisorEl.innerHTML = '';
      return;
    }
    let bestSheet = null, okSheet = null;
    BY_AREA.forEach((k) => {
      const v = sheetVerdict(k);
      if (v === 'ok') bestSheet = k;
      if (v !== 'bad') okSheet = k;
    });
    const cur = sheetVerdict(state.size);
    const summary =
      '<div class="zm-adv-sum">' +
        '<div><span>' + t('bestAll') + '</span><strong>' + (bestSheet ? sizeLabel(bestSheet) : t('none')) + '</strong></div>' +
        '<div><span>' + t('largestOk') + '</span><strong>' + (okSheet ? sizeLabel(okSheet) : t('none')) + '</strong></div>' +
        '<div><span>' + t('now') + sizeLabel(state.size) + '</span><strong>' + dotHtml(cur) + verdictText(cur) + '</strong></div>' +
      '</div>';
    const head = '<tr><th>' + t('thPage') + '</th><th>' + t('thPhoto') + '</th>' +
      ORDER.map((k) => '<th' + (k === state.size ? ' class="is-cur"' : '') + '>' + sizeLabel(k) + '</th>').join('') +
      '<th>' + t('thBest') + '</th></tr>';
    const body = rows.map(({ p, i }) => {
      const z = p.zoom || 1;
      const cells = ORDER.map((k) => {
        const ppi = ppiFor(p, k);
        return '<td' + (k === state.size ? ' class="is-cur"' : '') + '>' + dotHtml(verdict(ppi)) + num(Math.round(ppi)) + '</td>';
      }).join('');
      const best = bestFor(p);
      return '<tr><td><button type="button" class="zm-adv-page" data-i="' + i + '">' + t('labels')[i] + '</button></td>' +
        '<td class="zm-adv-px"><bdi>' + num(p.img.width) + '×' + num(p.img.height) + '</bdi>' + (z > 1.005 ? ' · ' + num(Math.round(z * 100)) + (lang() === 'ar' ? '٪' : '%') : '') + '</td>' +
        cells + '<td>' + (best ? sizeLabel(best) : '<span class="zm-adv-bad">' + t('belowAll') + '</span>') + '</td></tr>';
    }).join('');
    advisorEl.innerHTML = summary +
      '<div class="zm-adv-scroll"><table class="zm-adv-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="zm-adv-unit">' + t('unit') + '</p>';
  }
  advisorEl.addEventListener('click', (e) => {
    const b = e.target.closest('.zm-adv-page');
    if (!b) return;
    const li = cards[+b.dataset.i].li;
    li.scrollIntoView({ behavior: 'smooth', block: 'center' });
    li.classList.add('is-flash');
    setTimeout(() => li.classList.remove('is-flash'), 1200);
  });

  let pending = new Set(), raf = 0;
  function changed(i) {
    pending.add(i);
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      pending.forEach(refreshCard);
      pending.clear();
      refreshAdvisor();
    });
    save();
  }

  /* ---------- Settings ---------- */

  const sizeBtns = [...document.querySelectorAll('#zm-size [data-size]')];
  const dirSel = $('#zm-dir'), borderBox = $('#zm-border');
  function syncSettings() {
    sizeBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.size === state.size)));
    dirSel.value = state.dir;
    borderBox.checked = state.border;
  }
  sizeBtns.forEach((b) => b.addEventListener('click', () => {
    state.size = b.dataset.size;
    syncSettings();
    refreshAll();
    save();
  }));
  dirSel.addEventListener('change', () => { state.dir = dirSel.value; save(); });
  borderBox.addEventListener('change', () => { state.border = borderBox.checked; refreshAll(); save(); });

  const bulkInput = $('#zm-bulk-input');
  $('#zm-bulk').addEventListener('click', () => bulkInput.click());
  bulkInput.addEventListener('change', async () => {
    const files = [...bulkInput.files];
    bulkInput.value = '';
    await fillEmpty(files);
  });

  // Files dropped anywhere else on the page fill the empty pages.
  document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    await fillEmpty([...e.dataTransfer.files].filter((f) => /^image\//.test(f.type)));
  });

  /* ---------- Dialogs ---------- */

  function openDlg(d) {
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function closeDlg(d) {
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  document.querySelectorAll('.zm-dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-close]')) closeDlg(d);
    });
  });

  let toastTimer = 0;
  function alertLine(msg) {
    let t = $('.zm-toast');
    if (!t) {
      t = document.createElement('p');
      t.className = 'zm-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
  }

  /* Preview */
  const pvDlg = $('#zm-preview-dlg'), pvCanvas = $('#zm-pv-canvas');
  let pvView = 'book', pvStep = 0;
  function spreads() {
    return state.dir === 'rtl'
      ? [[0, null], [2, 1], [4, 3], [6, 5], [null, 7]]
      : [[null, 0], [1, 2], [3, 4], [5, 6], [7, null]];
  }

  function drawPreview() {
    const s = SIZES[state.size];
    const st = pvCanvas.parentElement, cs = getComputedStyle(st);
    const stage = {
      width: st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      height: st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
    };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ratio = pvView === 'sheet' ? s.w / s.h : (s.w / 2) / (s.h / 2); // spread = two panels
    let w = stage.width, h = w / ratio;
    if (h > stage.height) { h = stage.height; w = h * ratio; }
    pvCanvas.style.width = w + 'px';
    pvCanvas.style.height = h + 'px';
    pvCanvas.width = Math.round(w * dpr);
    pvCanvas.height = Math.round(h * dpr);
    const ctx = pvCanvas.getContext('2d');
    const W = pvCanvas.width, H = pvCanvas.height;
    ctx.clearRect(0, 0, W, H);
    $('#zm-pv-nav').hidden = pvView !== 'book';
    $('#zm-pv-hint').hidden = pvView !== 'sheet';
    if (pvView === 'sheet') { renderSheet(ctx, W, H, true); return; }

    const pair = spreads()[pvStep];
    const pw = W / 2;
    pair.forEach((idx, side) => {
      if (idx == null) return;
      renderPanel(ctx, state.panels[idx], side * pw, 0, pw, H);
    });
    // Spine shadow between facing pages.
    if (pair[0] != null && pair[1] != null) {
      const g = ctx.createLinearGradient(pw - W * 0.03, 0, pw + W * 0.03, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(pw - W * 0.03, 0, W * 0.06, H);
    }
    $('#zm-pv-count').textContent = t('spreads')[pvStep] + '  ·  ' + num(pvStep + 1) + ' / ' + num(5);
    const rtl = state.dir === 'rtl';
    $('#zm-pv-prev').innerHTML = rtl ? '&#8594;' : '&#8592;';
    $('#zm-pv-next').innerHTML = rtl ? '&#8592;' : '&#8594;';
    $('#zm-pv-nav').classList.toggle('is-rtl', rtl !== (root.dir === 'rtl'));
    $('#zm-pv-prev').disabled = pvStep === 0;
    $('#zm-pv-next').disabled = pvStep === 4;
  }
  function setView(v) {
    pvView = v;
    pvDlg.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    drawPreview();
  }
  $('#zm-preview').addEventListener('click', async () => {
    await fontsReady();
    pvStep = 0;
    openDlg(pvDlg);
    setView('book');
  });
  pvDlg.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  const step = (d) => { pvStep = Math.max(0, Math.min(4, pvStep + d)); drawPreview(); };
  $('#zm-pv-prev').addEventListener('click', () => step(-1));
  $('#zm-pv-next').addEventListener('click', () => step(1));
  pvDlg.addEventListener('keydown', (e) => {
    if (pvView !== 'book') return;
    const rtl = state.dir === 'rtl';
    if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
    if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
  });

  /* Fold guide */
  /* Start over */
  const resetDlg = $('#zm-reset-dlg');
  $('#zm-reset').addEventListener('click', () => openDlg(resetDlg));
  $('#zm-reset-yes').addEventListener('click', () => {
    state = { size: state.size, dir: 'ltr', border: false, panels: Array.from({ length: 8 }, blank) };
    syncSettings();
    refreshAll();
    save();
    closeDlg(resetDlg);
  });

  /* ---------- Export ---------- */

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('400 40px "Amiri"'),
      document.fonts.load('700 40px "Amiri"'),
      document.fonts.load('400 40px "Amiri"', 'ابت'),
      document.fonts.load('700 40px "Amiri"', 'ابت'),
    ]).catch(() => {});
  }

  function sheetCanvas(dpiWanted) {
    const s = SIZES[state.size];
    const dpi = Math.min(dpiWanted, Math.sqrt(MAX_PIXELS / (s.w * s.h)));
    const c = document.createElement('canvas');
    c.width = Math.round(s.w * dpi);
    c.height = Math.round(s.h * dpi);
    return { c, dpi };
  }

  // Mark a JPEG's JFIF header with the real print density.
  async function jpegBytes(canvas, dpi) {
    const blob = await toBlob(canvas, 'image/jpeg', 0.92);
    const b = new Uint8Array(await blob.arrayBuffer());
    if (b[2] === 0xff && b[3] === 0xe0 && String.fromCharCode(b[6], b[7], b[8], b[9]) === 'JFIF') {
      const d = Math.round(dpi);
      b[13] = 1;
      b[14] = d >> 8; b[15] = d & 255;
      b[16] = d >> 8; b[17] = d & 255;
    }
    return b;
  }

  // Folding drawings for the PDF: the page's own sketch SVGs, restyled for print.
  const SK_CSS = (ar) =>
    '.sk-paper{fill:#fff}' +
    '.sk-ink{fill:none;stroke:#242424;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}' +
    '.sk-thin{stroke-width:1.1;opacity:.8}.sk-ghost{stroke-width:.8;opacity:.45;marker-end:none!important}' +
    '.sk-crease{fill:none;stroke:#6b6259;stroke-width:.8;stroke-linecap:round;opacity:.75}' +
    '.sk-fold{fill:none;stroke:#242424;stroke-width:2.6;stroke-linecap:round}' +
    '.sk-closed{stroke:#A85A00;stroke-width:3.6}.sk-hatch{fill:url(#zm-hatch)}' +
    '.sk-hatch-line{stroke:#A85A00;stroke-width:1;opacity:.55}' +
    '.sk-arrow{fill:none;stroke:#A85A00;stroke-width:1.8;stroke-linecap:round;marker-end:url(#zm-arrow)}' +
    '.sk-cut{fill:none;stroke:#C0392B;stroke-width:2.2;stroke-dasharray:5 4;stroke-linecap:round}' +
    '.sk-scissors circle,.sk-scissors path{fill:none;stroke:#C0392B;stroke-width:1.5;stroke-linecap:round}' +
    '.sk-label{fill:#A85A00;font:700 12px "Amiri",Georgia,serif;text-anchor:middle;dominant-baseline:middle}' +
    '.sk-small{font-size:10px;fill:#6b6259}.sk-note{font-size:10.5px}' +
    '.sk-cut-label{fill:#C0392B;font-size:8.5px;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}' +
    '[data-lang]{display:none}[data-lang="' + (ar ? 'ar' : 'en') + '"]{display:inline}' +
    '.sk-arrowhead{stroke:#A85A00}' +
    (ar ? 'text{direction:rtl;unicode-bidi:plaintext}' : '');

  function foldStepImages(ar) {
    const defs = $('.zm-defs defs');
    const svgs = Array.from(document.querySelectorAll('.zm-fold li svg'));
    return Promise.all(svgs.map((svg) => new Promise((res) => {
      const mirror = ar && svg.classList.contains('zm-mirror-rtl');
      const body = mirror ? '<g class="m" transform="translate(200 0) scale(-1 1)">' + svg.innerHTML + '</g>' : svg.innerHTML;
      const str = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -4 216 148" width="864" height="592"><style>' +
        SK_CSS(ar) + '</style>' + (defs ? defs.outerHTML : '') + body + '</svg>';
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    })));
  }

  async function guidePage(W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, W, H);
    const m = W * 0.05;
    const ar = lang() === 'ar';
    const sans = '"Amiri", Georgia, serif';
    // Arabic reads right to left: mirror the layout (diagram right, steps flowing leftwards).
    const X = (x, w) => (ar ? W - x - (w || 0) : x);
    try { ctx.direction = ar ? 'rtl' : 'ltr'; } catch (e) {}
    ctx.textAlign = ar ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#A85A00';
    ctx.font = '700 ' + Math.round(H * 0.06) + 'px ' + sans;
    ctx.fillText(t('foldTitle'), X(m), m);
    // Sheet diagram and its key, at the far side of the title.
    const dw = W * 0.2, dh = dw / (W / H);
    drawFoldDiagram(ctx, X(W - m - dw, dw), m, dw, dh, INK);
    ctx.textAlign = ar ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.font = '400 ' + Math.round(H * 0.018) + 'px ' + sans;
    ctx.fillText(t('foldKey'), X(W - m - dw), m + dh + H * 0.015);
    // Six sketch steps, 3 x 2, in reading order.
    const imgs = await foldStepImages(ar);
    const top = m + dh + H * 0.07;
    const gw = W - 2 * m, cw = gw / 3, numH = H * 0.05;
    const rowH = Math.min((H - top - m * 0.6) / 2, cw * 0.95 * 148 / 216 + numH);
    const ih = rowH - numH, iw = ih * 216 / 148;
    ctx.textAlign = 'center';
    ctx.font = '600 ' + Math.round(H * 0.028) + 'px ' + sans;
    ctx.fillStyle = '#A85A00';
    imgs.forEach((img, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const cx = X(m + col * cw, cw) + cw / 2;
      const y = top + row * rowH;
      if (img) ctx.drawImage(img, cx - iw / 2, y, iw, ih);
      ctx.fillText(num(i + 1), cx, y + ih + numH * 0.1);
    });
    return c;
  }


  // Minimal PDF: one full-page JPEG per page.
  function buildPdf(pages) {
    const enc = new TextEncoder();
    const chunks = [], offs = [];
    let len = 0;
    const push = (d) => { if (typeof d === 'string') d = enc.encode(d); chunks.push(d); len += d.length; };
    const obj = (n, body) => { offs[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
    const f = (v) => v.toFixed(2);
    push(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])); // %PDF-1.4
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [' + pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>'));
    pages.forEach((pg, i) => {
      const n = 3 + i * 3;
      obj(n, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(pg.pw) + ' ' + f(pg.ph) + '] /Resources << /XObject << /Im0 ' + (n + 2) + ' 0 R >> >> /Contents ' + (n + 1) + ' 0 R >>'));
      const cs = 'q ' + f(pg.pw) + ' 0 0 ' + f(pg.ph) + ' 0 0 cm /Im0 Do Q';
      obj(n + 1, () => { push('<< /Length ' + cs.length + ' >>\nstream\n'); push(cs); push('\nendstream'); });
      obj(n + 2, () => {
        push('<< /Type /XObject /Subtype /Image /Width ' + pg.px + ' /Height ' + pg.py + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.bytes.length + ' >>\nstream\n');
        push(pg.bytes);
        push('\nendstream');
      });
    });
    const total = 3 + pages.length * 3;
    const xref = len;
    push('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (let n = 1; n < total; n++) push(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
    push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function saveFile(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function exportZine(format) {
    await fontsReady();
    const s = SIZES[state.size];
    const { c, dpi } = sheetCanvas(300);
    renderSheet(c.getContext('2d'), c.width, c.height, false);
    const sheet = await jpegBytes(c, dpi);
    c.width = c.height = 0;
    const base = 'zine-' + state.size;
    if (format === 'jpg') {
      saveFile(new Blob([sheet], { type: 'image/jpeg' }), base + '.jpg');
      return;
    }
    const pw = s.w * 72, ph = s.h * 72;
    const g = await guidePage(Math.round(s.w * 150), Math.round(s.h * 150));
    const guide = await jpegBytes(g, 150);
    const pdf = buildPdf([
      { bytes: sheet, px: Math.round(s.w * dpi), py: Math.round(s.h * dpi), pw, ph },
      { bytes: guide, px: g.width, py: g.height, pw, ph },
    ]);
    saveFile(pdf, base + '.pdf');
  }

  // Links to the folding guide open it before scrolling.
  const guideEl = $('#guide');
  const openGuide = () => { if (guideEl) guideEl.open = true; };
  document.querySelectorAll('a[href="#guide"]').forEach((a) => a.addEventListener('click', openGuide));
  if (location.hash === '#guide') openGuide();

  const dlDlg = $('#zm-download-dlg');
  $('#zm-download').addEventListener('click', () => {
    const empty = state.panels.filter((p) => !shownImg(p) && !p.caption.trim()).length;
    $('#zm-dl-size').textContent = (lang() === 'ar' ? 'ورقة ' : '') + sizeLabel(state.size) + t('sheet') +
      (state.dir === 'rtl' ? t('rtlNote') : '') + (empty ? t('blank')(empty) : '.');
    $('#zm-busy').hidden = true;
    openDlg(dlDlg);
  });
  dlDlg.querySelectorAll('[data-format]').forEach((b) => {
    b.addEventListener('click', async () => {
      const busy = $('#zm-busy');
      busy.hidden = false;
      dlDlg.querySelectorAll('[data-format]').forEach((x) => { x.disabled = true; });
      try {
        await exportZine(b.dataset.format);
        closeDlg(dlDlg);
      } catch (e) {
        alertLine(t('exportFail'));
      }
      busy.hidden = true;
      dlDlg.querySelectorAll('[data-format]').forEach((x) => { x.disabled = false; });
    });
  });

  /* ---------- Storage (IndexedDB) ---------- */

  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('no idb')); return; }
      const r = indexedDB.open('zine-maker', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('zines');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return dbp;
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const d = await db();
        const data = {
          size: state.size, dir: state.dir, border: state.border,
          panels: state.panels.map((p) => ({
            blob: p.blob, fit: p.fit, caption: p.caption, zoom: p.zoom, fx: p.fx, fy: p.fy,
            layout: p.layout, tsize: p.tsize, talign: p.talign,
          })),
        };
        d.transaction('zines', 'readwrite').objectStore('zines').put(data, 'current');
      } catch (e) { /* private mode etc.: work still fine, just not kept */ }
    }, 400);
  }
  async function load() {
    try {
      const d = await db();
      const data = await new Promise((resolve, reject) => {
        const r = d.transaction('zines').objectStore('zines').get('current');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (!data) { if (lang() === 'ar') state.dir = 'rtl'; return; }
      state.size = SIZES[data.size] ? data.size : 'a4';
      state.dir = data.dir === 'rtl' ? 'rtl' : 'ltr';
      state.border = !!data.border;
      state.panels = await Promise.all((data.panels || []).slice(0, 8).map(async (p) => {
        const out = blank();
        out.fit = p.fit === 'contain' ? 'contain' : 'cover';
        out.caption = typeof p.caption === 'string' ? p.caption : '';
        if (LAYOUTS.includes(p.layout)) out.layout = p.layout;
        if (TEXT_SIZE[p.tsize]) out.tsize = p.tsize;
        if (p.talign === 'start') out.talign = 'start';
        const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
        out.zoom = num(p.zoom, 1, ZOOM_MAX, 1);
        out.fx = num(p.fx, 0, 1, 0.5);
        out.fy = num(p.fy, 0, 1, 0.5);
        if (p.blob) { try { out.img = await decode(p.blob); out.blob = p.blob; } catch (e) {} }
        return out;
      }));
      while (state.panels.length < 8) state.panels.push(blank());
    } catch (e) { /* start fresh */ }
  }

  /* ---------- Apply language ---------- */

  function applyLang() {
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
    document.querySelectorAll('[data-aria-ar]').forEach((el) => {
      if (!el.dataset.ariaEn) el.dataset.ariaEn = el.getAttribute('aria-label');
      el.setAttribute('aria-label', lang() === 'ar' ? el.dataset.ariaAr : el.dataset.ariaEn);
    });
    dirSel.options[0].textContent = t('ltr');
    dirSel.options[1].textContent = t('rtl');
    refreshAll();
    if (pvDlg.open) drawPreview();
  }
  document.addEventListener('langchange', () => fontsReady().then(applyLang));

  /* ---------- Start ---------- */

  buildCards();
  syncSettings();
  applyLang();
  load().then(() => { syncSettings(); refreshAll(); });
  fontsReady().then(refreshAll);

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      refreshAll();
      if (pvDlg.open) drawPreview();
    });
  });
})();
