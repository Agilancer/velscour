"""DEPTH'S EDGE CAVERNS (docs/DEPTHS_EDGE.md): import the user's two packs.

    python tools/depthsedge.py <Depths_Edge_Caves_Biome_Pack[.zip]> <Depths_Edge_Terror_II_50_Monsters_10_Bosses[.zip]>
    python tools/process_assets.py enemies depths_edge

The biome pack's materials go to assets/tiles/depths_edge/ as lossless WebP (the three.js caves load them at runtime,
gfx/cave3d.js): the 20 seamless 160 px floor and wall tiles (tex/DEC-NN.webp), the ten 3x2 sheets of 510 px rock faces
(hd/DEC-HDNN.webp; not seamless, so they're mirrored when they repeat) and the five sheets of seamless water tiles
(water/DEC-WSNN.webp). The 60 creatures are painted on magenta, one 1536x1024 PNG each: keyed, trimmed, scaled and
written to assets/source/enemies/depths_edge/{monsters_1,monsters_2,bosses}/ for process_assets.py to pack (two sheets
of 25 monsters, one of the ten bosses). src/data/depthsedge.js catalogues them in this order.
"""
import io
import json
import os
import re
import sys
import zipfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from process_assets import key_magenta, trim  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILES = os.path.join(ROOT, "assets", "tiles", "depths_edge")
ENEMIES = os.path.join(ROOT, "assets", "source", "enemies", "depths_edge")
MON_H, BOSS_H = 200, 300   # stored height of the cut-outs (process_assets packs them at <= 0.85, <= 220 px)


class Src:
    """A pack as a folder or a zip: files by their path below the pack's top folder."""
    def __init__(self, path):
        self.zip = zipfile.ZipFile(path) if path.lower().endswith(".zip") else None
        self.root = path
        names = self.zip.namelist() if self.zip else [os.path.relpath(os.path.join(d, f), path).replace("\\", "/")
                                                      for d, _, fs in os.walk(path) for f in fs]
        self.names = names

    def find(self, pattern):
        rx = re.compile(pattern)
        return sorted(n for n in self.names if rx.search(n))

    def read(self, name):
        if self.zip:
            return self.zip.read(name)
        with open(os.path.join(self.root, name), "rb") as f:
            return f.read()

    def image(self, name):
        return Image.open(io.BytesIO(self.read(name)))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def materials(pack):
    for sub in ("tex", "hd", "water"):
        os.makedirs(os.path.join(TILES, sub), exist_ok=True)
    n = 0
    for name in pack.find(r"textures/(floors|wall_surfaces)/DEC-\d\d_.*\.png$"):
        tid = re.search(r"(DEC-\d\d)", name).group(1)
        pack.image(name).convert("RGB").save(os.path.join(TILES, "tex", tid + ".webp"), "WEBP", lossless=True, method=6)
        n += 1
    for name in pack.find(r"sprite_sheets/rock_faces/DEC-HD\d\d_.*\.png$"):
        tid = re.search(r"(DEC-HD\d\d)", name).group(1)
        pack.image(name).convert("RGB").save(os.path.join(TILES, "hd", tid + ".webp"), "WEBP", lossless=True, method=6)
        n += 1
    for name in pack.find(r"sprite_sheets/water_tiles/water_sheet_\d\d\.png$"):
        k = re.search(r"water_sheet_(\d\d)", name).group(1)
        pack.image(name).convert("RGB").save(os.path.join(TILES, "water", "DEC-WS" + k + ".webp"), "WEBP", lossless=True, method=6)
        n += 1
    print("materials: %d files -> %s" % (n, os.path.relpath(TILES, ROOT)))


def creatures(mon):
    roster = json.loads(mon.read(mon.find(r"docs/roster\.json$")[0]).decode("utf-8"))
    names = {r["id"]: r["name"] for r in roster}
    for sub in ("monsters_1", "monsters_2", "bosses"):
        d = os.path.join(ENEMIES, sub)
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith(".png"):
                os.remove(os.path.join(d, f))
    out = []
    for name in mon.find(r"/(monsters|bosses)/DE2-[MB]\d{3}\.png$"):
        cid = re.search(r"(DE2-[MB]\d{3})", name).group(1)
        boss = cid[4] == "B"
        k = int(cid[5:])
        rgba = key_magenta(np.asarray(mon.image(name).convert("RGB")))
        # specks the key left behind (stray antialiased pixels in the backdrop) go: keep the big shapes only
        from scipy import ndimage
        solid = rgba[..., 3] > 40
        lab, nl = ndimage.label(ndimage.binary_dilation(solid, iterations=3))
        if nl > 1:
            sizes = ndimage.sum(solid, lab, range(1, nl + 1))
            keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.02])
            rgba[..., 3] = np.where(keep, rgba[..., 3], 0)
        rgba[..., 3] = np.where(rgba[..., 3] < 24, 0, rgba[..., 3])
        img = trim(Image.fromarray(rgba))
        h = BOSS_H if boss else MON_H
        s = h / img.height
        img = img.convert("RGBa").resize((max(1, round(img.width * s)), h), Image.LANCZOS).convert("RGBA")
        sub = "bosses" if boss else ("monsters_1" if k <= 25 else "monsters_2")
        fn = "%s_%s.png" % (cid, slug(names.get(cid, cid)))
        img.save(os.path.join(ENEMIES, sub, fn), optimize=True)
        out.append((cid, names.get(cid, cid), img.size))
    print("creatures: %d cut -> %s" % (len(out), os.path.relpath(ENEMIES, ROOT)))
    for cid, nm, size in out:
        print("  %s %-34s %dx%d" % (cid, nm, size[0], size[1]))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    materials(Src(sys.argv[1]))
    creatures(Src(sys.argv[2]))
