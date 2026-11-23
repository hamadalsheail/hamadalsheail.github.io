#!/usr/bin/env python3
"""Make the small square images that link previews use (WhatsApp, X, iMessage).

Covers are often 1-2 MB; WhatsApp skips preview images much over ~300 KB, so
each cover gets a 1000x1000 copy under ~250 KB:

    post    cover -> img/posts/<slug>/share.jpg
    page    cover -> img/share/<cover name>.jpg   (projects, photography)
    default        -> img/share/default.jpg        (pages with no cover)

Re-run after adding a post or project with a cover (needs Pillow):

    python3 tools/build-share-images.py

Pages without a share image fall back to the post thumb, then the cover.
"""

import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SIZE = 1000
MAX_BYTES = 250_000
DEFAULT_SOURCE = "/img/landing-photography.jpg"


def front_matter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---", text, re.S)
    out = {}
    for line in (m.group(1).splitlines() if m else []):
        k, _, v = line.partition(":")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def make(src: Path, dest: Path) -> None:
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im = ImageOps.fit(im, (SIZE, SIZE), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    for q in (82, 76, 70, 62, 55):
        im.save(dest, "JPEG", quality=q, optimize=True, progressive=True)
        if dest.stat().st_size <= MAX_BYTES:
            break
    print(f"{dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")


def main() -> None:
    for post in sorted((ROOT / "_posts").glob("*.md")):
        fm = front_matter(post)
        cover, slug = fm.get("cover"), fm.get("slug")
        if cover and slug and (ROOT / cover.lstrip("/")).exists():
            make(ROOT / cover.lstrip("/"), ROOT / "img" / "posts" / slug / "share.jpg")

    pages = list((ROOT / "projects").glob("*.html")) + [ROOT / "photography.html"]
    for page in sorted(pages):
        cover = front_matter(page).get("cover")
        if cover and (ROOT / cover.lstrip("/")).exists():
            make(ROOT / cover.lstrip("/"), ROOT / "img" / "share" / (Path(cover).stem + ".jpg"))

    make(ROOT / DEFAULT_SOURCE.lstrip("/"), ROOT / "img" / "share" / "default.jpg")


if __name__ == "__main__":
    main()
