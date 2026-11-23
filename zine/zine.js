// Zine Maker: an eight-page zine on one sheet, built and exported in the
// browser. Nothing leaves the device; work is kept in IndexedDB.
(function () {
  'use strict';

  // Sheet sizes in inches, landscape.
  const SIZES = {
    a4: { label: 'A4', w: 297 / 25.4, h: 210 / 25.4 },
    letter: { label: 'US Letter', w: 11, h: 8.5 },
    a3: { label: 'A3', w: 420 / 25.4, h: 297 / 25.4 },
  };
  const LABELS = ['Front cover', 'Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 5', 'Page 6', 'Back cover'];
  const SHORT = ['Cover', '1', '2', '3', '4', '5', '6', 'Back'];
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const INK = '#242424';
  const WHITE = '#ffffff';
  const MAX_PIXELS = 16.7e6; // iOS canvas limit
  const MAX_IMG = 2600;      // long side kept for uploaded photos

  // Where each page sits on the sheet (left-to-right zine): [column, row].
  // Row 0 prints upside down. Right-to-left zines mirror the columns.
  const SLOTS = [[3, 1], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [1, 1], [2, 1]];

  const blank = () => ({ img: null, blob: null, fit: 'cover', caption: '' });
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
      ? '400 ' + size + 'px "Noto Naskh Arabic", "Geeza Pro", serif'
      : '400 ' + size + 'px "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
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
    for (let n = 0; n < 12; n++) {
      ctx.font = fontFor(rtl, size);
      const lines = wrap(ctx, text, maxW);
      const lh = size * (rtl ? 1.75 : 1.4);
      if (lines.length * lh <= maxH || n === 11) return { lines, lh, size, rtl, h: lines.length * lh };
      size *= 0.88;
    }
  }

  function drawText(ctx, t, cx, top) {
    ctx.save();
    ctx.font = fontFor(t.rtl, t.size);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.direction = t.rtl ? 'rtl' : 'ltr'; } catch (e) {}
    t.lines.forEach((line, i) => ctx.fillText(line, cx, top + t.lh * (i + 0.5)));
    ctx.restore();
  }

  function drawImage(ctx, img, fit, x, y, w, h) {
    const iw = img.width, ih = img.height;
    const s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  function renderPanel(ctx, p, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = WHITE;
    ctx.fillRect(x, y, w, h);

    const inset = state.border ? w * 0.07 : 0;
    const ax = x + inset, ay = y + inset, aw = w - inset * 2, ah = h - inset * 2;
    const text = (p.caption || '').trim();
    const pad = w * 0.07;

    if (p.img) {
      let band = 0, t = null;
      if (text) {
        t = layoutText(ctx, text, aw - pad * 2, ah * 0.4, w * 0.058);
        band = t.h + pad * (state.border ? 1 : 1.6);
      }
      drawImage(ctx, p.img, p.fit, ax, ay, aw, ah - band);
      if (t) drawText(ctx, t, ax + aw / 2, ay + ah - band + (band - t.h) / 2);
    } else if (text) {
      const t = layoutText(ctx, text, aw - pad * 2, ah - pad * 2, w * 0.085);
      drawText(ctx, t, ax + aw / 2, ay + (ah - t.h) / 2);
    }
    ctx.restore();
  }

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
    ctx.strokeStyle = 'rgba(36,36,36,0.45)';
    ctx.lineWidth = lw;
    ctx.setLineDash([lw * 5, lw * 4]);
    ctx.beginPath();
    for (let c = 1; c < 4; c++) { ctx.moveTo(x + (W * c) / 4, y); ctx.lineTo(x + (W * c) / 4, y + H); }
    ctx.moveTo(x, y + H / 2); ctx.lineTo(x + W / 4, y + H / 2);
    ctx.moveTo(x + (W * 3) / 4, y + H / 2); ctx.lineTo(x + W, y + H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = lw * 2;
    ctx.beginPath();
    ctx.moveTo(x + W / 4, y + H / 2); ctx.lineTo(x + (W * 3) / 4, y + H / 2);
    ctx.stroke();
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
    ctx.font = '600 ' + Math.round(ph * 0.16) + 'px "Bricolage Grotesque", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const { col, row } = slotOf(i);
      const cx = x + col * pw + pw / 2, cy = y + row * ph + ph / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (row === 0) ctx.rotate(Math.PI);
      ctx.fillStyle = i === 0 || i === 7 ? '#A85A00' : INK;
      ctx.fillText(SHORT[i], 0, 0);
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
      $('.zp-label', li).textContent = LABELS[i];
      card.caption.setAttribute('aria-label', 'Text for ' + LABELS[i]);
      $('.zp-add', li).setAttribute('aria-label', 'Add photo to ' + LABELS[i]);
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
      state.panels[i].img = null;
      state.panels[i].blob = null;
      changed(i);
    });
    card.file.addEventListener('change', async () => {
      const f = card.file.files[0];
      card.file.value = '';
      await setImage(i, f);
    });
    li.querySelectorAll('.zp-fit button').forEach((b) => {
      b.addEventListener('click', () => { state.panels[i].fit = b.dataset.fit; changed(i); });
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
      if (r) { state.panels[i].img = r.img; state.panels[i].blob = r.blob; }
    } catch (e) {
      alertLine('That file could not be read as an image.');
    }
    card.li.classList.remove('is-busy');
    changed(i);
  }

  async function fillEmpty(files) {
    let k = 0;
    for (let i = 0; i < 8 && k < files.length; i++) {
      if (!state.panels[i].img) await setImage(i, files[k++]);
    }
    if (k < files.length) alertLine('Only ' + k + ' photo' + (k === 1 ? '' : 's') + ' fit: every page already has one.');
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

  function refreshCard(i) {
    const card = cards[i], p = state.panels[i], li = card.li;
    li.classList.toggle('has-img', !!p.img);
    li.classList.toggle('has-text', !!p.caption.trim());
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
    renderPanel(c.getContext('2d'), state.panels[i], 0, 0, w, h);
  }

  function refreshAll() {
    const s = SIZES[state.size];
    grid.style.setProperty('--panel-ratio', (s.w / 4) + ' / ' + (s.h / 2));
    for (let i = 0; i < 8; i++) refreshCard(i);
  }

  let pending = new Set(), raf = 0;
  function changed(i) {
    pending.add(i);
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      pending.forEach(refreshCard);
      pending.clear();
    });
    save();
  }

  /* ---------- Settings ---------- */

  const sizeSel = $('#zm-size'), dirSel = $('#zm-dir'), borderBox = $('#zm-border');
  function syncSettings() {
    sizeSel.value = state.size;
    dirSel.value = state.dir;
    borderBox.checked = state.border;
  }
  sizeSel.addEventListener('change', () => { state.size = sizeSel.value; refreshAll(); save(); });
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
  const SPREAD_NAMES = ['Front cover', 'Pages 1–2', 'Pages 3–4', 'Pages 5–6', 'Back cover'];

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
    $('#zm-pv-count').textContent = SPREAD_NAMES[pvStep] + '  ·  ' + (pvStep + 1) + ' / 5';
    const rtl = state.dir === 'rtl';
    $('#zm-pv-prev').innerHTML = rtl ? '&#8594;' : '&#8592;';
    $('#zm-pv-next').innerHTML = rtl ? '&#8592;' : '&#8594;';
    $('#zm-pv-nav').classList.toggle('is-rtl', rtl);
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
  const STEPS = [
    'Print the sheet single-sided, landscape, at 100% (actual size).',
    'Fold it in half lengthwise, top edge to bottom edge. Crease and open.',
    'Fold it in half the other way, short edge to short edge. Crease and open.',
    'Fold each short end in to meet the middle crease. Crease and open. You now have eight panels.',
    'Fold in half short edge to short edge again. From the folded edge, cut along the middle crease to the next fold: one panel deep, no further.',
    'Open it, fold lengthwise again, and push the two ends toward each other so the cut opens into a plus shape.',
    'Wrap the pages around so the cover is on top and the back is at the bottom. Press flat.',
  ];
  $('#zm-steps').innerHTML = STEPS.map((s) => '<li>' + s + '</li>').join('');
  const foldDlg = $('#zm-fold-dlg'), foldCanvas = $('#zm-fold-canvas');
  function drawFoldDialog() {
    const s = SIZES[state.size];
    const r = foldCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr), h = Math.round((r.width / (s.w / s.h)) * dpr);
    foldCanvas.width = w;
    foldCanvas.height = h;
    foldCanvas.style.height = h / dpr + 'px';
    drawFoldDiagram(foldCanvas.getContext('2d'), 0, 0, w, h, INK);
  }
  $('#zm-fold').addEventListener('click', async () => {
    await fontsReady();
    openDlg(foldDlg);
    drawFoldDialog();
  });

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
      document.fonts.load('400 40px "Bricolage Grotesque"'),
      document.fonts.load('600 40px "Bricolage Grotesque"'),
      document.fonts.load('400 40px "Noto Naskh Arabic"', 'ابت'),
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

  function guidePage(W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, W, H);
    const m = W * 0.06;
    ctx.fillStyle = '#A85A00';
    ctx.font = '700 ' + Math.round(H * 0.06) + 'px "Bricolage Grotesque", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('How to fold', m, m);
    const dw = W * 0.42, dh = dw / (W / H);
    const dy = m + H * 0.11;
    drawFoldDiagram(ctx, m, dy, dw, dh, INK);
    ctx.fillStyle = INK;
    ctx.font = '400 ' + Math.round(H * 0.022) + 'px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillText('Dashed: fold.   Red: cut.', m, dy + dh + H * 0.025);
    // Steps on the right.
    const tx = m + dw + W * 0.05, tw = W - tx - m;
    let y = dy;
    const size = Math.round(H * 0.024), lh = size * 1.45;
    STEPS.forEach((s, i) => {
      ctx.font = '600 ' + size + 'px "Bricolage Grotesque", Arial, sans-serif';
      ctx.fillStyle = '#A85A00';
      ctx.fillText(String(i + 1), tx, y);
      ctx.font = '400 ' + size + 'px "Bricolage Grotesque", Arial, sans-serif';
      ctx.fillStyle = INK;
      wrap(ctx, s, tw - size * 1.6).forEach((line) => { ctx.fillText(line, tx + size * 1.6, y); y += lh; });
      y += lh * 0.45;
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
    const g = guidePage(Math.round(s.w * 150), Math.round(s.h * 150));
    const guide = await jpegBytes(g, 150);
    const pdf = buildPdf([
      { bytes: sheet, px: Math.round(s.w * dpi), py: Math.round(s.h * dpi), pw, ph },
      { bytes: guide, px: g.width, py: g.height, pw, ph },
    ]);
    saveFile(pdf, base + '.pdf');
  }

  const dlDlg = $('#zm-download-dlg');
  $('#zm-download').addEventListener('click', () => {
    const empty = state.panels.filter((p) => !p.img && !p.caption.trim()).length;
    $('#zm-dl-size').textContent = SIZES[state.size].label + ' sheet' + (state.dir === 'rtl' ? ', right-to-left' : '') +
      (empty ? '. ' + empty + ' page' + (empty === 1 ? ' is' : 's are') + ' still blank.' : '.');
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
        alertLine('Export failed. Try a smaller paper size or fewer large photos.');
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
          panels: state.panels.map((p) => ({ blob: p.blob, fit: p.fit, caption: p.caption })),
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
      if (!data) return;
      state.size = SIZES[data.size] ? data.size : 'a4';
      state.dir = data.dir === 'rtl' ? 'rtl' : 'ltr';
      state.border = !!data.border;
      state.panels = await Promise.all((data.panels || []).slice(0, 8).map(async (p) => {
        const out = blank();
        out.fit = p.fit === 'contain' ? 'contain' : 'cover';
        out.caption = typeof p.caption === 'string' ? p.caption : '';
        if (p.blob) { try { out.img = await decode(p.blob); out.blob = p.blob; } catch (e) {} }
        return out;
      }));
      while (state.panels.length < 8) state.panels.push(blank());
    } catch (e) { /* start fresh */ }
  }

  /* ---------- Start ---------- */

  buildCards();
  syncSettings();
  refreshAll();
  load().then(() => { syncSettings(); refreshAll(); });
  fontsReady().then(refreshAll);

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      refreshAll();
      if (pvDlg.open) drawPreview();
      if (foldDlg.open) drawFoldDialog();
    });
  });
})();
