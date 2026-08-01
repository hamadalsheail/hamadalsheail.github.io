# Hamad Alsheail — Diwan Alshams

A static portfolio site built from the *Hamad Alsheail Creative Portfolio* deck.

## Structure

```
index.html    single page — hero, about, Wa'atha' 1447 H, four photo series, contact
styles.css    all styling; palette and type carried over from the deck
script.js     lightbox (click a photo, arrow keys to navigate, Esc to close)
img/          21 photographs extracted from the deck, resized to 1400px
```

## Running it

Any static server works, e.g.:

```
python3 -m http.server 4321
```

Then open <http://localhost:4321>. Opening `index.html` directly as a `file://`
URL also works, though some browsers restrict the web font.

## Notes

- Type is **Bricolage Grotesque** (loaded from Google Fonts, as in the deck),
  with **Noto Kufi Arabic** for the Arabic text.
- Colors are taken from the deck's XML: paper `#EDE8E5`, body ink `#242424`,
  and amber `#FFA51F` for every heading (section titles, "Creative Portfolio",
  the Wa'atha' title, and the contact labels). Only the name in the hero is ink —
  that matches slide 1.
- Images are lazy-loaded below the fold and open in a lightbox with captions
  drawn from their alt text.
