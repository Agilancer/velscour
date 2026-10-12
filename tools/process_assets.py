#!/usr/bin/env python3
"""
VELSCOUR asset pipeline.

Slices the hand-made source sheets in assets/source/ into game-ready PNGs and
JSON atlases under assets/. Re-run this whenever a source sheet changes:

    pip install pillow numpy scipy
    python3 tools/process_assets.py          # everything
    python3 tools/process_assets.py biomes [catacombs]  # biome packs: floors, walls, arches, doors, scatter (tools/biomepack.py)
    python3 tools/process_assets.py props    # loot-chest art
    python3 tools/process_assets.py classes [paladin]   # class art packs (tools/classart.py, docs/CLASS_ART.md)
    python3 tools/process_assets.py gear [paladin]      # armor + helm libraries (tools/gearart.py, docs/CLASS_ART.md)
    python3 tools/process_assets.py enemies  # monster sheets in assets/source/enemies/<set>/ (docs/ENEMY_ART.md)
    python3 tools/process_assets.py select   # class-select portraits from assets/FinalClasses/All 16 Classes.png
    python3 tools/process_assets.py audio    # sound zips in assets/source/audio/ -> assets/audio/ (tools/audiopack.py, needs ffmpeg)

Outputs
  assets/sprites/classes/<class>.webp  one trimmed full-body sprite per class
  assets/ui/logo.webp                  trimmed title logo
  assets/ui/hud.webp                   skill bar with an empty (transparent) XP track
  assets/ui/hud.json                   slot / orb / xp-bar geometry in hud.webp pixels
  assets/ui/potion_<color>.png         potion icons cut out of the skill bar
  assets/tiles/<pack>/                 biome pack atlases + pack.json (tools/biomepack.py, docs/ART.md)
  assets/props/chests.webp + .json     loot-chest art
  assets/sprites/enemies/<set>_<sheet>.webp + enemies.json   one atlas per monster sheet
  assets/sprites/select/<class>.webp + select.json   animated menu portraits (tools/selectart.py)
  assets/audio/{sfx,amb,music}/*.mp3 + audio.json     sound effects, ambient loops, songs (tools/audiopack.py)
"""
import json
import os
import sys

if sys.argv[1:] == ["audio"]:   # the audio import needs only ffmpeg, not the image libraries
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from audiopack import process_audio
    process_audio()
    sys.exit(0)

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source")
OUT = os.path.join(ROOT, "assets")

CLASS_IDS = [
    "paladin", "ranger", "wizard", "necromancer",
    "barbarian", "dragoon", "totem_master", "death_knight",
    "arcane_sorcerer", "carrion_witch", "bard", "slime_lord",
    "boomerang_knight", "lancer", "dragon_knight", "gunner",
]

def ensure(path):
    os.makedirs(path, exist_ok=True)


def key_magenta(rgb):
    """Return RGBA array with the magenta backdrop removed and edges despilled."""
    a = rgb.astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.minimum(r, b) - g
    alpha = np.full(r.shape, 255, np.int32)
    alpha[mag > 110] = 0
    edge = (mag > 45) & (mag <= 110)
    alpha[edge] = ((110 - mag[edge]) * 255 // 65)
    # white label boxes / separator lines; small white blobs are skull highlights and stay
    white = (r > 215) & (g > 215) & (b > 215)
    lab, n = ndimage.label(white)
    for i, s in enumerate(ndimage.find_objects(lab)):
        if s[1].stop - s[1].start >= 60 or s[0].stop - s[0].start >= 60 or (s[0].start < 30 and s[1].start < 300):
            alpha[s][lab[s] == i + 1] = 0
    # despill pink fringes toward the green channel
    spill = mag > 20
    r2 = np.where(spill, np.minimum(r, g + 6), r)
    b2 = np.where(spill, np.minimum(b, g + 6), b)
    out = np.stack([r2, g, b2, alpha], axis=-1).clip(0, 255).astype(np.uint8)
    return out


def save(img, path):
    """Save as lossy WebP (alpha kept) - small downloads for mobile players."""
    img.save(path, "WEBP", quality=90, method=6)


def trim(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


# --------------------------------------------------------------------------
# Character classes
# --------------------------------------------------------------------------
def process_classes():
    im = Image.open(os.path.join(SRC, "classes_sheet.webp")).convert("RGBA")
    arr = np.asarray(im).copy()
    rows = [(70, 341), (366, 639), (660, 915), (936, 1210)]
    cols = [(0, 313), (313, 627), (627, 940), (940, 1254)]
    outdir = os.path.join(OUT, "sprites", "classes")
    ensure(outdir)
    meta = {}
    for ri, (y0, y1) in enumerate(rows):
        for ci, (x0, x1) in enumerate(cols):
            cid = CLASS_IDS[ri * 4 + ci]
            sub = arr[y0:y1, x0:x1].copy()
            mask = sub[..., 3] > 30
            lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
            if n:
                sizes = ndimage.sum(mask, lab, range(1, n + 1))
                biggest = int(np.argmax(sizes)) + 1
                # keep the main body plus anything sizeable that touches its bbox
                keep = np.zeros_like(mask)
                bs = ndimage.find_objects(lab)[biggest - 1]
                for i in range(1, n + 1):
                    s = ndimage.find_objects(lab)[i - 1]
                    if i == biggest or (sizes[i - 1] > 40 and s[0].start >= bs[0].start - 30
                                        and s[0].stop <= bs[0].stop + 2 and s[1].start >= bs[1].start - 30
                                        and s[1].stop <= bs[1].stop + 30):
                        keep |= lab == i
                sub[..., 3] = np.where(keep, sub[..., 3], 0)
            img = trim(Image.fromarray(sub))
            save(img, os.path.join(outdir, cid + ".webp"))
            meta[cid] = {"w": img.width, "h": img.height}
    with open(os.path.join(outdir, "classes.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("classes:", len(meta))


# --------------------------------------------------------------------------
# Logo + HUD
# --------------------------------------------------------------------------
def process_ui():
    ensure(os.path.join(OUT, "ui"))
    logo = trim(Image.open(os.path.join(SRC, "logo.webp")).convert("RGBA"))
    if logo.width > 1400:
        logo = logo.resize((1400, round(logo.height * 1400 / logo.width)), Image.LANCZOS)
    save(logo, os.path.join(OUT, "ui", "logo.webp"))
    # square app icon: the logo's "V" on a dark ember background
    icon = Image.new("RGBA", (512, 512), (10, 4, 3, 255))
    glow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    gy, gx = np.mgrid[0:512, 0:512]
    d = np.sqrt((gx - 256) ** 2 + (gy - 300) ** 2) / 300
    ga = np.clip(1 - d, 0, 1) ** 2
    g = np.zeros((512, 512, 4), np.uint8)
    g[..., 0] = 140; g[..., 1] = 30; g[..., 2] = 8; g[..., 3] = (ga * 255).astype(np.uint8)
    icon.alpha_composite(Image.fromarray(g))
    v = logo.crop((0, 0, int(logo.width * 0.2), logo.height))
    v = trim(v)
    k = min(440 / v.width, 440 / v.height)
    v = v.resize((int(v.width * k), int(v.height * k)), Image.LANCZOS)
    icon.alpha_composite(v, ((512 - v.width) // 2, (512 - v.height) // 2))
    icon.save(os.path.join(OUT, "ui", "icon.png"), optimize=True)

    hud = Image.open(os.path.join(SRC, "hud_bar.webp")).convert("RGBA")
    oy = 146
    hud = hud.crop((0, oy, 2000, 461))
    arr = np.asarray(hud).copy()
    # potion icons (cut before anything else is modified)
    slot_x = [(306, 378), (407, 476), (506, 575), (604, 677), (705, 779), (808, 882),
              (912, 985), (1015, 1089), (1117, 1191), (1219, 1293), (1321, 1395),
              (1423, 1497), (1524, 1598), (1621, 1697)]
    sy0, sy1 = 274 - oy, 350 - oy
    for name, (x0, x1) in zip(["red", "blue", "purple", "orange"], slot_x[9:13]):
        p = arr[sy0 + 2:sy1 - 1, x0 + 3:x1 - 3].copy()
        lum = p[..., :3].astype(int).sum(axis=2)
        p[..., 3] = np.where(lum < 75, 0, p[..., 3])
        trim(Image.fromarray(p)).save(os.path.join(OUT, "ui", "potion_%s.png" % name), optimize=True)
    # empty the XP track so the game can draw its own fill underneath
    ty0, ty1 = 408 - oy, 430 - oy
    for xa, xb in [(350, 872), (1126, 1650)]:
        arr[ty0:ty1, xa:xb, 3] = 0
    save(Image.fromarray(arr), os.path.join(OUT, "ui", "hud.webp"))
    geo = {
        "w": 2000, "h": 315,
        "slots": [{"x": x0, "y": sy0, "w": x1 - x0, "h": sy1 - sy0} for (x0, x1) in slot_x],
        "slotKeys": ["LMB", "1", "2", "3", "4", "5", "6", "7", "8", "Z", "X", "C", "V", "RMB"],
        "orbs": [{"cx": 157, "cy": 297 - oy, "r": 78}, {"cx": 1842, "cy": 297 - oy, "r": 78}],
        "xp": {"x": 350, "y": ty0, "w": 1300, "h": ty1 - ty0},
    }
    with open(os.path.join(OUT, "ui", "hud.json"), "w") as f:
        json.dump(geo, f, indent=1)
    print("ui done")


def pack_atlas(pieces, aw=1024):
    """Shelf-pack pieces ({"img", "w", "h", "kind", ...}) tallest first. Returns (atlas, entries) with
    entries in the same order as `pieces` (which is re-sorted in place)."""
    pieces.sort(key=lambda p: -p["h"])
    x, y, shelf = 0, 0, 0
    for p in pieces:
        if x + p["w"] + 2 > aw:
            x, y, shelf = 0, y + shelf + 2, 0
        p["ax"], p["ay"] = x, y
        x += p["w"] + 2
        shelf = max(shelf, p["h"])
    atlas = Image.new("RGBA", (aw, y + shelf + 2), (0, 0, 0, 0))
    entries = []
    for p in pieces:
        atlas.paste(p["img"], (p["ax"], p["ay"]))
        entries.append({"kind": p["kind"], "x": p["ax"], "y": p["ay"], "w": p["w"], "h": p["h"]})
    return atlas, entries


def main():
    args = sys.argv[1:]
    if not args or "all" in args:
        args = ["sprites", "biomes", "props", "classes", "enemies", "select"]
    if "sprites" in args:
        process_classes()
        process_ui()
    if "biomes" in args:
        from biomepack import process_biome_packs
        process_biome_packs(args[args.index("biomes") + 1:])
    if "props" in args:
        process_chests()
    if "enemies" in args:
        process_enemies()
    if "select" in args:
        from selectart import process_select_art
        process_select_art()
    if "audio" in args:
        from audiopack import process_audio
        process_audio()
    if "gear" in args:
        from gearart import process_gear_art
        process_gear_art(args[args.index("gear") + 1:])
        return
    for flag in ("classes", "classart"):
        if flag in args:
            from classart import process_class_art
            process_class_art(args[args.index(flag) + 1:])


# --------------------------------------------------------------------------
# Props: loot-chest art
# --------------------------------------------------------------------------
def grid_objects(rgba, nrows, ncols, y_min=25, x_min=0):
    """Find a nrows x ncols grid of objects on a keyed sheet without knowing its geometry: big shapes are
    grouped into rows and columns at the largest gaps, then small fragments (flames, debris) join the cell
    they sit in. Returns grid[r][c] = RGBA crop (or None)."""
    alpha = rgba[..., 3] > 128
    lab, _ = ndimage.label(ndimage.binary_opening(alpha, iterations=2), structure=np.ones((3, 3)))
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None:
            continue
        area = int((lab[sl] == i + 1).sum())
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        if area >= 40 and cy > y_min and cx > x_min:
            comps.append({"id": i + 1, "sl": sl, "area": area, "cx": cx, "cy": cy})
    big = [c for c in comps if c["area"] >= 500]

    def split(items, key, n):
        items = sorted(items, key=lambda c: c[key])
        if len(items) <= n:
            return [[c] for c in items]
        gaps = sorted(range(1, len(items)), key=lambda i: items[i][key] - items[i - 1][key])[-(n - 1):]
        cuts = [0] + sorted(gaps) + [len(items)]
        return [items[a:b] for a, b in zip(cuts, cuts[1:])]

    grid = []
    for row in split(big, "cy", nrows):
        cells = split(row, "cx", ncols)
        grid.append(cells + [[]] * (ncols - len(cells)))
    out = []
    for row in grid:
        orow = []
        for cell in row:
            if not cell:
                orow.append(None)
                continue
            y0 = min(c["sl"][0].start for c in cell) - 12; y1 = max(c["sl"][0].stop for c in cell) + 12
            x0 = min(c["sl"][1].start for c in cell) - 12; x1 = max(c["sl"][1].stop for c in cell) + 12
            ids = {c["id"] for c in comps if y0 <= c["cy"] <= y1 and x0 <= c["cx"] <= x1}
            y0, x0 = max(0, y0), max(0, x0)
            keep = ndimage.binary_dilation(np.isin(lab[y0:y1, x0:x1], list(ids)), iterations=3)
            crop = rgba[y0:y1, x0:x1].copy()
            crop[..., 3] = np.where(keep, crop[..., 3], 0)
            orow.append(np.asarray(trim(Image.fromarray(crop))))
        out.append(orow)
    return out


# Loot-chest art: the chest column of the dungeon_mechanisms scatter sheet (6 variants, rows); the game uses 4.
CHEST_SHEET, CHEST_COL = "dungeon_mechanisms", 1
CHEST_ROWS = {"closed": 0, "open": 1, "rareClosed": 4, "rareOpen": 5}


def process_chests():
    ensure(os.path.join(OUT, "props"))
    rgba = key_magenta(np.asarray(Image.open(os.path.join(SRC, "props", CHEST_SHEET + ".png")).convert("RGB")))
    grid = grid_objects(rgba, 6, 10)
    pieces = [{"kind": k, "img": Image.fromarray(grid[r][CHEST_COL]), "w": grid[r][CHEST_COL].shape[1],
               "h": grid[r][CHEST_COL].shape[0]} for k, r in CHEST_ROWS.items()]
    atlas, entries = pack_atlas(pieces, 512)
    save(atlas, os.path.join(OUT, "props", "chests.webp"))
    with open(os.path.join(OUT, "props", "chests.json"), "w") as f:
        json.dump({e["kind"]: {k: e[k] for k in ("x", "y", "w", "h")} for e in entries}, f, indent=1)
    print("chests: %d pieces, atlas %dx%d" % (len(entries), atlas.width, atlas.height))


# --------------------------------------------------------------------------
# Monsters: assets/source/enemies/<set>/<sheet>.png, transparent sheets with one pose per monster
# --------------------------------------------------------------------------
ENEMY_SCALE = 0.5  # stored size vs. the sheet; monsters are drawn at 30-110 world px, sheets are ~330 px tall
ENEMY_GRID = {}    # "<set>/<sheet>": (rows, cols) for sheets that are not the usual 2 x 5


def process_enemies():
    """Cut every monster out of its sheet (reading order: left to right, top to bottom), downscale it and
    pack one atlas per sheet. enemies.json: {"<set>/<sheet>": {"file", "cells": [{x, y, w, h, fx, oh}]}}
    with fx = the feet's centre column and oh = the height on the sheet. src/data/bestiary.js says what
    each cell is (index = reading order)."""
    root = os.path.join(SRC, "enemies")
    out_dir = os.path.join(OUT, "sprites", "enemies")
    ensure(out_dir)
    meta = {}
    for set_id in sorted(os.listdir(root)):
        if not os.path.isdir(os.path.join(root, set_id)):
            continue
        for fn in sorted(os.listdir(os.path.join(root, set_id))):
            if not fn.lower().endswith(".png"):
                continue
            key = set_id + "/" + fn[:-4]
            rgba = np.asarray(Image.open(os.path.join(root, set_id, fn)).convert("RGBA")).copy()
            rgba[..., 3] = np.where(rgba[..., 3] < 16, 0, rgba[..., 3])
            rows, cols = ENEMY_GRID.get(key, (2, 5))
            pieces = []
            for r, row in enumerate(grid_objects(rgba, rows, cols, y_min=0)):
                for c, a in enumerate(row):
                    if a is None:
                        continue
                    img = Image.fromarray(a)
                    w, h = max(1, round(img.width * ENEMY_SCALE)), max(1, round(img.height * ENEMY_SCALE))
                    small = img.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")
                    al = np.asarray(small)[..., 3] > 100
                    ys = np.nonzero(al.any(axis=1))[0]
                    foot = al[max(0, ys.max() - max(2, h // 7)):ys.max() + 1] if len(ys) else al
                    fx = float(np.nonzero(foot.any(axis=0))[0].mean()) if foot.any() else w / 2
                    pieces.append({"kind": r * cols + c, "img": small, "w": w, "h": h, "fx": round(fx, 1), "oh": img.height})
            atlas, entries = pack_atlas(pieces, 1024)
            cells = [None] * (rows * cols)
            for p, e in zip(pieces, entries):
                cells[p["kind"]] = {"x": e["x"], "y": e["y"], "w": e["w"], "h": e["h"], "fx": p["fx"], "oh": p["oh"]}
            name = key.replace("/", "_")
            save(atlas, os.path.join(out_dir, name + ".webp"))
            meta[key] = {"file": name + ".webp", "cells": cells}
            print("%-24s %d monsters, atlas %dx%d, %d KB" % (key, len(pieces), atlas.width, atlas.height,
                                                          os.path.getsize(os.path.join(out_dir, name + ".webp")) // 1024))
    with open(os.path.join(out_dir, "enemies.json"), "w") as f:
        json.dump(meta, f, indent=1)


if __name__ == "__main__":
    main()
