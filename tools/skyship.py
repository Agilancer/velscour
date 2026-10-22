#!/usr/bin/env python3
"""
The Sky Battle bake's output (docs/SKY_BATTLE.md).

    node tools/skyship_bake.js     # three.js bake -> assets/source/skyship/out/ (PNG pages + index)
    python tools/skyship.py pack   # out/ -> assets/tiles/skyship/ (lossless WebP + index.json)
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "skyship", "out")
OUT = os.path.join(ROOT, "assets", "tiles", "skyship")


def pack():
    os.makedirs(OUT, exist_ok=True)
    idx = json.load(open(os.path.join(SRC, "index.json")))
    for p in idx["pages"]:
        Image.open(os.path.join(SRC, p + ".png")).save(os.path.join(OUT, p + ".webp"), lossless=True, quality=100, method=6)
    idx["pages"] = [p + ".webp" for p in idx["pages"]]
    json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
    kb = sum(os.path.getsize(os.path.join(OUT, p)) for p in idx["pages"]) // 1024
    print("skyship: %d pages (%d KB), %d pieces, %d sprites" % (len(idx["pages"]), kb, len(idx["pieces"]), len(idx["sprites"])))


if __name__ == "__main__":
    {"pack": pack}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
