# Hamad Alsheail — Diwan Alshams

A static portfolio site built from the *Hamad Alsheail Creative Portfolio* deck.

## Structure

```
index.html              hero, about, Wa'atha' 1447 H, four photo series, contact
gallery.html            the wider archive — everything not in a series
styles.css              all styling; palette and type carried over from the deck
script.js               lightbox (click a photo, arrow keys to navigate, Esc to close)
gallery.js              renders the gallery grid from the manifest
gallery-manifest.js     GENERATED — the gallery photo list
gallery-captions.json   captions, keyed by filename; edit this one
tools/build-gallery.py  regenerates the manifest from img/gallery/
img/                    21 photographs from the deck, resized to 1400px
img/gallery/            32 further photographs, resized to 1200px
```

## Adding gallery photos

Drop files into `img/gallery/`, add captions to `gallery-captions.json`, then:

```
python3 tools/build-gallery.py
```

A static page can't read a directory listing, so the photo list has to be
generated. The script prints any file that's still missing a caption — those
fall back to a tidied-up version of the filename.

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
- The gallery photos came from the "Top photos" Google Drive folder. 15 of the
  47 were already used in the deck, so they were left out of the gallery to
  avoid showing the same frame twice.
