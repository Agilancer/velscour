#!/usr/bin/env python3
"""
The 3D castle's bake inputs and outputs (docs/CASTLE_3D.md).

    python tools/castle3d.py textures     # masonry from the Castle Keep pack -> assets/source/castle3d/tex/
    node tools/castle3d_bake.js           # three.js bake -> assets/source/castle3d/out/ (PNG pages + index)
    python tools/castle3d.py pack         # out/ -> assets/tiles/castle3d/ (lossless WebP + index.json)

textures: the Castle Keep pack's wall materials are horizontally tileable strips; they are also made to tile
vertically (the strip's top and bottom cross-faded over a band of courses), so a wall of any height wraps them.
A slate texture for the roofs is drawn here (rows of overlapping slates with a little colour noise).
"""
import io
import json
import os
import sys
import zipfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "castle3d")
OUT = os.path.join(ROOT, "assets", "tiles", "castle3d")
GREY = {"ashlar": 0.55, "chapel": 0.35}
MATERIALS = {"ashlar": "royal_ashlar", "brick": "underkeep_brick", "iron": "armory_ironstone", "chapel": "chapel_carving",
             "panel": "great_hall_paneling"}


def tile_vertically(a, band=48):
    """Cross-fade the strip's last `band` rows into its first, so it repeats top to bottom."""
    a = a.astype(np.float32)
    h = a.shape[0] - band
    out = a[:h].copy()
    t = np.linspace(0, 1, band)[:, None, None]
    out[:band] = a[h:h + band] * (1 - t) + a[:band] * t
    return out.clip(0, 255).astype(np.uint8)


def slate(w=256, h=256, seed=7):
    rng = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), np.float32)
    row, sw = 16, 28
    for r in range(h // row):
        off = (r % 2) * sw // 2
        for c in range(-1, w // sw + 1):
            x0 = c * sw + off
            base = np.array([84, 88, 100]) * rng.uniform(0.82, 1.12) + rng.normal(0, 3, 3)
            for y in range(row):
                k = 1.0 - 0.35 * (y / row)          # each slate darker toward its foot (the overlap)
                xs = slice(max(0, x0 + 1), max(0, min(w, x0 + sw - 1)))
                img[r * row + y, xs] = base * k
            img[r * row:(r + 1) * row, max(0, min(w - 1, x0))] *= 0.55
        img[r * row + row - 1] *= 0.5
    img += rng.normal(0, 4, img.shape)
    return img.clip(0, 255).astype(np.uint8)


def wood(w=128, h=256, seed=3):
    rng = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), np.float32)
    pw = 16
    for c in range(w // pw):
        base = np.array([92, 62, 38]) * rng.uniform(0.8, 1.15)
        y = np.arange(h)[:, None]; x = np.arange(pw)[None, :]
        grain = np.sin((x * 0.9 + y * 0.05 + rng.uniform(0, 6)) * 1.7 + np.sin(y * 0.07 + c) * 2.0) * 0.08
        img[:, c * pw:(c + 1) * pw] = base * (1 + grain)[..., None]
        img[:, c * pw] *= 0.45; img[:, c * pw + 1] *= 0.8
    img += rng.normal(0, 3, img.shape)
    return img.clip(0, 255).astype(np.uint8)


def textures():
    os.makedirs(os.path.join(SRC, "tex"), exist_ok=True)
    z = zipfile.ZipFile(os.path.join(ROOT, "assets", "source", "biomes", "Castle_Keep_Biome_Pack.zip"))
    for k, name in MATERIALS.items():
        a = np.array(Image.open(io.BytesIO(z.read("materials/%s.png" % name))).convert("RGB"))
        if k in GREY:   # the castle pack's limestone is greyer than the keep pack's ashlar
            g = a.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
            a = (a * (1 - GREY[k]) + g[..., None] * GREY[k]).clip(0, 255).astype(np.uint8)
        Image.fromarray(tile_vertically(a)).save(os.path.join(SRC, "tex", k + ".png"))
    Image.fromarray(slate()).save(os.path.join(SRC, "tex", "slate.png"))
    Image.fromarray(wood()).save(os.path.join(SRC, "tex", "wood.png"))
    print("textures:", sorted(os.listdir(os.path.join(SRC, "tex"))))


def pack():
    src = os.path.join(SRC, "out")
    os.makedirs(OUT, exist_ok=True)
    idx = json.load(open(os.path.join(src, "index.json")))
    for p in idx["pages"]:
        Image.open(os.path.join(src, p + ".png")).save(os.path.join(OUT, p + ".webp"), lossless=True, quality=100, method=6)
    idx["pages"] = [p + ".webp" for p in idx["pages"]]
    json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
    print("castle3d: %d pages, %d pieces, %d tiles" % (len(idx["pages"]), len(idx["pieces"]), len(idx["tiles"]) // 3))


if __name__ == "__main__":
    {"textures": textures, "pack": pack}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
