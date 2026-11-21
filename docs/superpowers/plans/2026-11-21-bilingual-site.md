# Bilingual Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arabic/English switch on every page; Arabic default with full RTL layout.

**Architecture:** Static markup defaults to `<html lang="ar" dir="rtl">`. Every translatable string is a pair `<span data-lang="en">…</span><span data-lang="ar">…</span>` (or block elements with `data-lang`); CSS hides the inactive language. An inline head script (`_includes/lang-init.js`) applies the stored choice before paint; `lang.js` wires the toggle button, page title and input placeholders.

**Tech Stack:** Jekyll (GitHub Pages), plain CSS/JS. Verification: local `jekyll build` + Playwright (Chromium) script in the scratchpad.

**Spec:** `docs/superpowers/specs/2026-11-21-bilingual-site-design.md`

## Global Constraints
- Default language `ar`; stored in `localStorage['lang']` as `"ar"` | `"en"`; anything else → `ar`.
- Arabic mode: `html[lang="ar"][dir="rtl"]`; English: `html[lang="en"][dir="ltr"]`.
- Posts are not translated; a post keeps its own `lang`/`dir` on `<article>` and list `<li>`.
- No dashes (— – or spaced -) in visible site copy in either language; landing list markers removed.
- "Creative Portfolio" removed. "Art Projects" → "Projects" / «المشاريع».
- Arabic copy exactly as approved (see Task 3/4 tables in the spec conversation): نبذة · مدونة كتاباتي · المشاريع · البراري · الحيوانات · حياة الشارع · الناس · ألبوم المنوّعات · تواصل · ألبوم الصور · ٤ سلاسل · ما نُشرَ حديثًا · فهرس الكتابات · ابحث.

## Review Focus
- Returning visitor who chose English: no flash of Arabic on load (init script runs in `<head>`).
- localStorage blocked (private mode): page still renders Arabic, toggle still works for the session.
- English post viewed in Arabic mode: post body stays LTR/left-aligned; list entry stays LTR.
- Mixed-direction strings (`@DiwanAlshams`, `1447 H`) inside Arabic text render in correct order (`<bdi>`).
- Phone width 390px in Arabic mode: topbar wraps without horizontal scroll; landing halves stack.

---

### Task 1: Language plumbing (init, toggle, CSS, shared header/footer)

**Files:**
- Create: `_includes/lang-init.js`, `_includes/lang-toggle.html`, `_includes/footer.html`, `lang.js`
- Modify: `_includes/topbar.html`, `_layouts/base.html`, `index.html`, `photography.html`, `gallery.html` (head + header + footer only), `styles.css`, `_config.yml` (exclude `docs/`)

**Interfaces:**
- Produces: `data-lang="en|ar"` hiding convention; `<html data-title-en data-title-ar>`; `data-placeholder-en/ar` on inputs; `window.siteLang()` → `"ar"|"en"`; event `langchange` on `document`.

- [ ] Step 1: Write scratchpad check `check.js` (Playwright, file server over `jekyll build` output) asserting on `/`, `/photography.html`, `/gallery.html`, `/writing/`: fresh context → `html.lang=="ar"`, `dir=="rtl"`, no visible `[data-lang=en]` element; click `.lang-toggle` → `lang=="en"`, `dir=="ltr"`; reload → still `en`; no element wider than viewport at 390px.
- [ ] Step 2: Run it; expect FAIL (no `.lang-toggle`).
- [ ] Step 3: Implement. `lang-init.js` mirrors `theme-init.js`. Toggle label shows the *other* language: `EN` in Arabic mode, `ع` in English mode; placed before the theme toggle. CSS: `html[lang=ar] [data-lang=en], html[lang=en] [data-lang=ar]{display:none!important}`; Arabic body font `var(--arabic-text)`, headings `var(--arabic)`, `letter-spacing:0; text-transform:none` under `html[lang=ar]`; `.landing-writing` border → `border-inline-start`. Add Noto Naskh Arabic to font links on index/photography/gallery. photography/gallery use `{% include topbar.html %}` and `{% include footer.html %}` instead of hard-coded copies. Topbar: mark «ديوان الشمس» / Diwan Alshams; nav labels per Global Constraints; Projects link `#projects`. Titles use `|` not `—`.
- [ ] Step 4: Run check; expect PASS.
- [ ] Step 5: Commit.

### Task 2: Landing page

**Files:** Modify `index.html`, `styles.css`
- [ ] Step 1: Extend check: on `/` in ar → `.landing-photo .landing-title` text `ألبوم الصور`, `.landing-writing .landing-title` `مدونة كتاباتي`, writing sub `ما نُشرَ حديثًا`; in en → `Photography`, `Writings`, `Recent posts`; `getComputedStyle(.landing-post,'::before').content` is `none`/`normal`.
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement: header h1 bilingual (حمد الشعيل | ديوان الشمس); the extra `.ar` «ديوان الشمس» shown only in en; series list bilingual; "4 series"/«٤ سلاسل»; post count replaced by Recent posts; delete `.landing-post::before` rules.
- [ ] Step 4: Run; PASS. Step 5: Commit.

### Task 3: Photography page copy

**Files:** Modify `photography.html`
- [ ] Step 1: Extend check: ar → `#about .lede` = `حمد الشعيل`; `#wilderness h2` = `البراري`; `#projects .section-title` = `المشاريع`; en → `Projects`; page text (both langs) matches no `/—|–| - /`; no `Creative Portfolio`.
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement with owner's Arabic copy (About split: lede name; p1 up to «ألوانها.»; p2 «الكتابة هي فرشاتي…»; blockquote «أصب هذه التجارب…»), with fixes نتوءات / ألوانٌ / spacing. Series captions as given. Hero sub removed in ar, "Creative Portfolio" removed in en. Reel: bilingual title/body (en: "Across My Homeland, Part III, 1448 H" + approved English), article no longer hard-codes `dir`. Wa'atha': en title `Wa'atha' 1447 H`, ar «وعثاء ١٤٤٧ هـ»; ar body from Instagram caption with «هو أوّل أعمالي المطبوعة» and dash removed; en body dashes → commas. Contact labels; handles in `<bdi>`.
- [ ] Step 4: Run; PASS. Step 5: Commit.

### Task 4: Gallery, Writings list, post chrome, search

**Files:** Modify `gallery.html`, `writing.html`, `_layouts/post.html`, `writing-search.js`; Create `_includes/ar-date.html`
- [ ] Step 1: Extend check: `/gallery.html` ar h1 `ألبوم المنوّعات`, intro `مجموعة منوّعة من الصور`; `/writing/` ar h1 `مدونة كتاباتي`, `#post-search` placeholder `ابحث`, en `Search`; first list date in ar matches `/^[٠-٩]+ \S+ [٠-٩]{4}$/`; a post page back link ar `مدونة كتاباتي`, `.post-nav a` ar `فهرس الكتابات`; English post `<article>` keeps `dir=ltr` in ar mode.
- [ ] Step 2: Run; FAIL.
- [ ] Step 3: Implement. `ar-date.html` takes `date`, outputs `D <Arabic month> YYYY` with Arabic-Indic digits (months: يناير فبراير مارس أبريل مايو يونيو يوليو أغسطس سبتمبر أكتوبر نوفمبر ديسمبر). Writing page front matter `title_ar: مدونة كتاباتي`. Search status strings bilingual via `siteLang()`.
- [ ] Step 4: Run; PASS. Step 5: Commit.

### Task 5: Visual check and ship
- [ ] Screenshots (390px and 1280px, ar and en) of landing, photography, writing; review; fix layout breaks.
- [ ] Push branch; open PR after owner reviews screenshots.
