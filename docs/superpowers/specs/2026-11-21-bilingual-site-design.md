# Bilingual site (Arabic / English) — design

## Intent
Make the site readable in Arabic and English. Arabic is the owner's primary
audience, so Arabic is the default and gets a full right-to-left layout.

## Goals
- Language switch on every page, including the landing page, next to the theme toggle.
- Arabic default for first-time visitors; the choice is remembered on the device.
- Arabic mode flips the whole layout RTL (`<html lang="ar" dir="rtl">`).
- All UI chrome and photography copy available in both languages.
- Landing: "Writing" → "Writings" / «مدونة كتاباتي», subtitle "Recent posts" / «ما نُشرَ حديثًا» replacing the post count.
- Remove "Creative Portfolio" in both languages. Rename "Art Projects" → "Projects" / «المشاريع».
- Remove dashes from visible copy in both languages (incl. landing list markers).

## Non-goals
- Translating posts. Each post stays in its own language and direction.
- Translating image alt text / lightbox captions (English only for now).

## Approaches
- **A. Both languages in one page, switched client-side** (picked by default after the owner did not choose; owner approved the plan). Paired `data-lang="en|ar"` elements, CSS hides the inactive one, an inline head script sets `lang`/`dir` from localStorage before paint (same as theme-init). Keeps current structure.
- B. Separate /ar/ and /en/ page copies from a translations file. Better SEO and shareable per-language URLs; much larger restructure. Rejected for now.

## Copy
Arabic copy supplied by the owner (About, series captions, labels); Wa'atha' from the owner's Instagram caption with agreed fixes (نتوءات، ألوانٌ، spacing، «أوّل»). English for «في ربوع بلادي» drafted by Claude, accepted.

## Left to the builder
- Exact markup pattern and toggle styling (match the theme toggle).
- Arabic-Indic digits and Arabic month names for dates in Arabic mode.
- Page `<title>`s switch with the language.
