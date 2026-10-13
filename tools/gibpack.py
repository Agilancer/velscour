"""Gib sheets: assets/source/gibs/gibs_<n>.jpg, 15 x 8 grids of gore chunks on a dark backdrop.
Cut each chunk (rows 0-6; the puddle/splat cells are skipped, decals cover those), key the backdrop,
shrink to <= GIB_MAX px and pack one atlas: assets/sprites/gibs.webp + gibs.json {set: [[x,y,w,h], ...]}."""
import json, os
import numpy as np
from PIL import Image

GIB_MAX = 20
# sheet -> set name; cells skipped per sheet as (row, col) for splats/webs/puddles
SETS = {1: "flesh", 2: "bug", 3: "demon", 4: "eye", 5: "limb"}
SKIP = {2: {(2, c) for c in range(6, 15)}, 3: {(2, c) for c in range(6, 9)} | {(2, c) for c in range(11, 15)},
        4: {(2, c) for c in range(6, 8)} | {(2, c) for c in range(11, 15)}, 5: {(2, c) for c in range(6, 8)} | {(2, c) for c in range(11, 15)}}
BONES = [(r, c) for r in range(3) for c in range(15)]  # sheet 1 rows 0-2: skulls and bones


def cells(rgb, sheet):
    a = rgb.astype(np.int32)
    bg = np.median(a[:6].reshape(-1, 3), axis=0)
    d = np.abs(a - bg).sum(-1)
    alpha = np.clip((d - 18) * 255 // 30, 0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, alpha])
    H, W = rgb.shape[:2]
    ch, cw = H / 8, W / 15
    for r in range(7):
        for c in range(15):
            if r == 6 and c >= 8 or (r, c) in SKIP.get(sheet, ()): continue
            im = Image.fromarray(rgba[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)])
            bb = im.getbbox()
            if not bb: continue
            im = im.crop(bb)
            k = GIB_MAX / max(im.size)
            yield (r, c), im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def process_gibs(src, out, save, pack_atlas):
    pieces = []
    for n, name in SETS.items():
        rgb = np.asarray(Image.open(os.path.join(src, "gibs", "gibs_%d.jpg" % n)).convert("RGB"))
        for rc, im in cells(rgb, n):
            kind = "bone" if n == 1 and rc in BONES else name
            pieces.append({"kind": kind, "img": im, "w": im.width, "h": im.height})
    atlas, entries = pack_atlas(pieces, 512)
    meta = {}
    for e in entries: meta.setdefault(e["kind"], []).append([e["x"], e["y"], e["w"], e["h"]])
    save(atlas, os.path.join(out, "sprites", "gibs.webp"))
    with open(os.path.join(out, "sprites", "gibs.json"), "w") as f: json.dump(meta, f, separators=(",", ":"))
    print("gibs: %s, atlas %dx%d" % ({k: len(v) for k, v in meta.items()}, atlas.width, atlas.height))
