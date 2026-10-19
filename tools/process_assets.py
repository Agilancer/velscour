#!/usr/bin/env python3
"""
VELSCOUR asset pipeline.

Slices the hand-made source sheets in assets/source/ into game-ready PNGs and
JSON atlases under assets/. Re-run this whenever a source sheet changes:

    pip install pillow numpy scipy
    python3 tools/process_assets.py          # everything
    python3 tools/process_assets.py ui       # logo, icon, HUD bar, minimap ring, HUD buttons (part of "sprites")
    python3 tools/process_assets.py biomes [catacombs]  # biome packs: floors, walls, arches, doors, scatter (tools/biomepack.py)
    python3 tools/process_assets.py town     # the town pack: ground, transitions, buildings, trees (tools/townpack.py)
    python3 tools/process_assets.py props    # loot-chest art
    python3 tools/process_assets.py classes [paladin]   # class art packs (tools/classart.py, docs/CLASS_ART.md)
    python3 tools/process_assets.py gear     # Grim Nocturne armor + helmet atlases (tools/nocturnegear.py, docs/CLASS_ART.md)
    python3 tools/process_assets.py enemies  # monster sheets in assets/source/enemies/<set>/ (docs/ENEMY_ART.md)
    python3 tools/process_assets.py select   # class-select portraits from assets/FinalClasses/All 16 Classes.png
    python3 tools/process_assets.py gibs     # gore chunks from assets/source/gibs/ -> assets/sprites/gibs.webp + .json (tools/gibpack.py)
    python3 tools/process_assets.py audio    # sound zips in assets/source/audio/ -> assets/audio/ (tools/audiopack.py, needs ffmpeg)
    python3 tools/process_assets.py instruments <pack.zip>  # the Bard's harpsichord pack (kept outside the repo) -> assets/audio/inst/

Outputs
  assets/sprites/classes/<class>.webp  one trimmed full-body sprite per class
  assets/ui/logo.webp                  trimmed title logo
  assets/ui/hud.webp                   skill bar (15 skill + 4 potion slots) with an empty (transparent) XP track
  assets/ui/hud-orbs.webp              health and mana orbs, cropped from the standard HUD art
  assets/ui/hud.json                   slot / orb / xp-bar / ring / button geometry
  assets/ui/potion_<color>.png         potion icons cut out of the skill bar
  assets/ui/minimap_ring.webp          the frame around the minimap
  assets/ui/btn_<name>.webp            HUD buttons: bag, skills, book, quest, auto, menu
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
if sys.argv[1:2] == ["instruments"]:   # the harpsichord pack (zip or folder) -> assets/audio/inst/ (numpy + scipy + lameenc)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from instrumentpack import process_instruments
    process_instruments(sys.argv[2] if len(sys.argv) > 2 else None)
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

    process_hud()


# The HUD art (assets/source/hud_bar.webp, 2000x667 transparent): two orbs and a 19-slot bar, LMB ` 1-9 0 - =
# (13 keys), four potions (Z X C V), RMB; the XP track under it. Pixel positions measured from the art.
HUD_KEYS = ["LMB", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Z", "X", "C", "V", "RMB"]
# hud_frames.webp (1415x1111): the minimap ring on top, the six HUD buttons in a row under it
HUD_BUTTONS = ["bag", "skills", "book", "quest", "auto", "menu"]
BTN_SPLIT = [40, 270, 489, 708, 927, 1146, 1376]   # midpoints of the jewel pairs that join the buttons
BTN_Y = (812, 1058)
RING_BOX = (546, 26, 1392, 834)
RING_HOLE = (969, 431.5, 303, 285.5)                # centre and radii of the open middle (it is a little oval)


def process_hud():
    hud = Image.open(os.path.join(SRC, "hud_bar.webp")).convert("RGBA")
    oy, h = 204, 296
    hud = hud.crop((0, oy, 2000, oy + h))
    arr = np.asarray(hud).copy()
    pitch = (1653 - 279) / 18
    slot_x = [(round(279 + i * pitch), round(279 + i * pitch) + 67) for i in range(19)]
    sy0, sy1 = 316 - oy, 383 - oy
    # potion icons: cut from the first HUD art (hud_bar_v1.webp), whose bottles sit clear of the slot frames
    v1 = np.asarray(Image.open(os.path.join(SRC, "hud_bar_v1.webp")).convert("RGBA").crop((0, 146, 2000, 461))).copy()
    for name, (x0, x1) in zip(["red", "blue", "purple", "orange"], [(1219, 1293), (1321, 1395), (1423, 1497), (1524, 1598)]):
        p = v1[128 + 2:204 - 1, x0 + 3:x1 - 3].copy()
        lum = p[..., :3].astype(int).sum(axis=2)
        p[..., 3] = np.where(lum < 75, 0, p[..., 3])
        trim(Image.fromarray(p)).save(os.path.join(OUT, "ui", "potion_%s.png" % name), optimize=True)
    # empty the XP track (the art shows it half full) so the game can draw its own fill underneath
    ty0, ty1, tx0, tx1 = 441 - oy, 459 - oy, 263, 1737
    arr[ty0:ty1, tx0:tx1, 3] = 0
    save(Image.fromarray(arr), os.path.join(OUT, "ui", "hud.webp"))
    orbs = np.zeros_like(arr)
    orbs[:, :270] = arr[:, :270]
    orbs[:, 1730:] = arr[:, 1730:]
    save(Image.fromarray(orbs), os.path.join(OUT, "ui", "hud-orbs.webp"))
    save(Image.fromarray(arr[:, :270]), os.path.join(OUT, "ui", "hud-orb-life.webp"))
    save(Image.fromarray(arr[:, 1730:]), os.path.join(OUT, "ui", "hud-orb-mana.webp"))

    fr = Image.open(os.path.join(SRC, "hud_frames.webp")).convert("RGBA")
    fa = np.asarray(fr).copy()
    # minimap ring: drop the buttons' top jewels that reach up beside its bottom jewel
    ring = fa[RING_BOX[1]:RING_BOX[3], RING_BOX[0]:RING_BOX[2]].copy()
    yy, xx = np.mgrid[RING_BOX[1]:RING_BOX[3], RING_BOX[0]:RING_BOX[2]]
    ring[..., 3] = np.where(((yy > 808) & (np.abs(xx - 969) > 42)) | (yy > 832), 0, ring[..., 3])
    rk = 420 / ring.shape[1]
    ring_img = Image.fromarray(ring).resize((420, round(ring.shape[0] * rk)), Image.LANCZOS)
    save(ring_img, os.path.join(OUT, "ui", "minimap_ring.webp"))
    buttons = []
    for i, name in enumerate(HUD_BUTTONS):
        x0, x1 = BTN_SPLIT[i], BTN_SPLIT[i + 1]
        b = fa[BTN_Y[0]:BTN_Y[1], x0:x1].copy()
        yy, xx = np.mgrid[BTN_Y[0]:BTN_Y[1], x0:x1]
        cx = (x0 + x1) / 2
        b[..., 3] = np.where((yy < 838) & (np.abs(xx - cx) > 30), 0, b[..., 3])   # the ring's bottom jewel
        # pad to a common width, centred, so every button is the same size
        W = max(BTN_SPLIT[j + 1] - BTN_SPLIT[j] for j in range(len(HUD_BUTTONS)))
        im = Image.new("RGBA", (W, b.shape[0]), (0, 0, 0, 0))
        im.paste(Image.fromarray(b), ((W - b.shape[1]) // 2, 0))
        k = 120 / im.width
        im = im.resize((120, round(im.height * k)), Image.LANCZOS)
        save(im, os.path.join(OUT, "ui", "btn_%s.webp" % name))
        buttons.append(name)
    geo = {
        "w": 2000, "h": h,
        "slots": [{"x": x0, "y": sy0, "w": x1 - x0, "h": sy1 - sy0} for (x0, x1) in slot_x],
        "slotKeys": HUD_KEYS,
        "orbs": [{"cx": 154, "cy": 349.5 - oy, "r": 92}, {"cx": 1845, "cy": 348 - oy, "r": 93}],
        "xp": {"x": tx0, "y": ty0, "w": tx1 - tx0, "h": ty1 - ty0},
        "barTop": 290 - oy,   # top edge of the slot rail (above it only the orbs' frames rise)
        "ring": {"w": RING_BOX[2] - RING_BOX[0], "h": RING_BOX[3] - RING_BOX[1],
                 "hole": {"cx": RING_HOLE[0] - RING_BOX[0], "cy": RING_HOLE[1] - RING_BOX[1], "rx": RING_HOLE[2], "ry": RING_HOLE[3]}},
        "buttons": {"names": buttons, "w": max(BTN_SPLIT[j + 1] - BTN_SPLIT[j] for j in range(len(HUD_BUTTONS))), "h": BTN_Y[1] - BTN_Y[0]},
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
        args = ["sprites", "biomes", "town", "props", "classes", "enemies", "select", "gibs"]
    if "sprites" in args:
        process_classes()
        process_ui()
    elif "ui" in args:
        process_ui()
    if "biomes" in args:
        from biomepack import process_biome_packs
        process_biome_packs(args[args.index("biomes") + 1:])
    if "town" in args:
        from townpack import process_town_pack
        process_town_pack()
    if "props" in args:
        process_chests()
    if "enemies" in args:
        process_enemies(args[args.index("enemies") + 1:])
    if "select" in args:
        from selectart import process_select_art
        process_select_art()
    if "gibs" in args:
        from gibpack import process_gibs
        process_gibs(SRC, OUT, save, pack_atlas)
    if "audio" in args:
        from audiopack import process_audio
        process_audio()
    if "gear" in args:
        from nocturnegear import build
        build()
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
SINGLE_MAX_H = 220  # a folder of single sprites (set2): stored at most this tall (bosses), never above SINGLE_SCALE
SINGLE_SCALE = 0.85
# Pet sheets (familiars/<kind>[_n].jpg) are painted on a flat dark or white background: stored scale per kind.
SHEET_SCALE = {"blue": 0.28, "elemental": 0.24, "critters": 0.6, "dragons": 0.3, "wolves": 0.36}
SHEET_TOL = {"blue": 26}  # keying tolerance; dark-furred wolves and black dragons need a tight one
# The AI-painted sheets sit on an even grid (rows, cols); the wolves' rows don't line up, so they are cut as blobs.
SHEET_GRID = {"blue": (7, 8), "elemental": (5, 4), "critters": (5, 4), "dragons": (4, 5)}


def key_flat(rgb, tol=10):
    """Alpha for a sprite sheet painted on one flat colour (a JPEG: black, near-black or white): everything
    within `tol` of the border colour that touches the border, plus big enclosed pockets (between legs, inside
    a coiled tail) that are almost exactly that colour."""
    a = rgb.astype(np.int16)
    border = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    d = np.abs(a - np.median(border, axis=0)).max(axis=2)
    lab, _ = ndimage.label(d < tol)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    back = np.isin(lab, list(edge))
    white = np.median(border) > 128  # nothing in a sprite is paper white, so small white pockets go too
    lab2, n2 = ndimage.label((d < (16 if white else min(tol, 7))) & ~back)
    if n2:
        sizes = ndimage.sum(np.ones_like(d), lab2, range(1, n2 + 1))
        back |= np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s >= (120 if white else 1500)])
    back = ndimage.binary_opening(back, iterations=1)
    return np.dstack([rgb, np.where(back, 0, 255).astype(np.uint8)])


def split_touching(m):
    """Split a mask of sprites that touch by a thin bridge: erode until it falls into big cores, then give every
    pixel to its nearest core. Returns [mask] when it never splits (one tall or wide sprite)."""
    area = m.sum()
    core = m
    for _ in range(30):
        core = ndimage.binary_erosion(core)
        lab, n = ndimage.label(core)
        if n < 2:
            continue
        sizes = ndimage.sum(core, lab, range(1, n + 1))
        big = [i + 1 for i, s in enumerate(sizes) if s >= area * 0.06]
        if len(big) < 2:
            continue
        seeds = np.where(np.isin(lab, big), lab, 0)
        _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
        owner = seeds[iy, ix]
        return [m & (owner == k) for k in big]
    return [m]


def even_grid_objects(rgba, rows, cols):
    """Cut a keyed sheet laid out on an even rows x cols grid: every shape belongs to the cell its centre is in
    (so a wing or tail reaching into the next cell stays on its owner). Specks under 0.3% of the cell's area
    are dropped. Empty cells are skipped; the rest come in reading order."""
    alpha = ndimage.binary_opening(rgba[..., 3] > 0, iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=2))
    H, W = alpha.shape
    ch, cw = H / rows, W / cols
    cells = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = (lab[sl] == i + 1) & alpha[sl]
        area = int(m.sum())
        if area < ch * cw * 0.003:
            continue
        ys, xs = np.nonzero(m)
        if np.ptp(ys) > ch * 1.3 or np.ptp(xs) > cw * 1.3:  # two sprites touching (smoke, a drip): pull apart
            for part in split_touching(m):
                full = np.zeros_like(alpha)
                full[sl] = part
                py, px = np.nonzero(part)
                r, c = min(rows - 1, int((py.mean() + sl[0].start) / ch)), min(cols - 1, int((px.mean() + sl[1].start) / cw))
                cells.setdefault((r, c), []).append(full)
            continue
        r, c = min(rows - 1, int((ys.mean() + sl[0].start) / ch)), min(cols - 1, int((xs.mean() + sl[1].start) / cw))
        cells.setdefault((r, c), []).append(i + 1)
    out = []
    for r in range(rows):
        for c in range(cols):
            if (r, c) not in cells:
                continue
            ids = [x for x in cells[(r, c)] if not isinstance(x, np.ndarray)]
            m = np.isin(lab, ids)
            for x in cells[(r, c)]:
                if isinstance(x, np.ndarray):
                    m |= x
            m &= alpha
            ys, xs = np.nonzero(m.any(axis=1))[0], np.nonzero(m.any(axis=0))[0]
            sl = (slice(ys[0], ys[-1] + 1), slice(xs[0], xs[-1] + 1))
            crop = rgba[sl].copy()
            crop[..., 3] = np.where(m[sl], crop[..., 3], 0)
            out.append(crop)
    return out


def blob_objects(rgba, join=8):
    """Cut the sprites out of a keyed sheet with no reliable grid: shapes closer than ~2*join px are one sprite
    (sparkles, drips, a held sword), specks far from everything are dropped. Reading order: rows top to bottom
    (a new row starts when a sprite's top is below the current row's middle), then left to right."""
    alpha = rgba[..., 3] > 0
    alpha = ndimage.binary_opening(alpha, iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=join))
    objs = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        area = int((alpha[sl] & (lab[sl] == i + 1)).sum())
        objs.append({"sl": sl, "area": area, "id": i + 1})
    if not objs:
        return []
    med = float(np.median([o["area"] for o in objs]))
    objs = [o for o in objs if o["area"] >= med * 0.12]
    objs.sort(key=lambda o: o["sl"][0].start)
    rows = []
    for o in objs:
        if rows and o["sl"][0].start < rows[-1]["mid"]:
            rows[-1]["items"].append(o)
        else:
            rows.append({"mid": (o["sl"][0].start + o["sl"][0].stop) / 2, "items": [o]})
    out = []
    for r in rows:
        for o in sorted(r["items"], key=lambda o: o["sl"][1].start):
            crop = rgba[o["sl"]].copy()
            crop[..., 3] = np.where((lab[o["sl"]] == o["id"]) & alpha[o["sl"]], crop[..., 3], 0)
            out.append(np.asarray(trim(Image.fromarray(crop))))
    return out


def enemy_piece(img, kind, scale):
    """Downscale one cut-out monster and find its feet's centre column (fx)."""
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    small = img.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")
    al = np.asarray(small)[..., 3] > 100
    ys = np.nonzero(al.any(axis=1))[0]
    foot = al[max(0, ys.max() - max(2, h // 7)):ys.max() + 1] if len(ys) else al
    fx = float(np.nonzero(foot.any(axis=0))[0].mean()) if foot.any() else w / 2
    return {"kind": kind, "img": small, "w": w, "h": h, "fx": round(fx, 1), "oh": img.height}


def process_enemies(only=()):
    """Cut every monster out of its sheet (reading order: left to right, top to bottom), downscale it and
    pack one atlas per sheet. enemies.json: {"<set>/<sheet>": {"file", "cells": [{x, y, w, h, fx, oh}]}}
    with fx = the feet's centre column and oh = the height on the sheet. src/data/bestiary.js says what
    each cell is (index = reading order). A folder inside a set (set2/<family>/, one monster per PNG) is
    packed as one sheet too, its cells in file name order."""
    root = os.path.join(SRC, "enemies")
    out_dir = os.path.join(OUT, "sprites", "enemies")
    ensure(out_dir)
    meta = {}
    if only:  # just these sets (e.g. `enemies familiars`): the other sheets keep their entries
        with open(os.path.join(out_dir, "enemies.json")) as f:
            meta = json.load(f)
    for set_id in sorted(os.listdir(root)):
        if not os.path.isdir(os.path.join(root, set_id)) or (only and set_id not in only):
            continue
        for fn in sorted(os.listdir(os.path.join(root, set_id))):
            path = os.path.join(root, set_id, fn)
            pieces = []
            if os.path.isdir(path):
                key = set_id + "/" + fn
                files = sorted(f for f in os.listdir(path) if f.lower().endswith(".png"))
                for k, f in enumerate(files):
                    img = Image.open(os.path.join(path, f)).convert("RGBA")
                    a = np.asarray(img).copy()
                    a[..., 3] = np.where(a[..., 3] < 16, 0, a[..., 3])
                    img = trim(Image.fromarray(a))
                    pieces.append(enemy_piece(img, k, min(SINGLE_SCALE, SINGLE_MAX_H / img.height)))
                rows, cols = 1, len(files)
            elif fn.lower().endswith((".png", ".jpg")):
                key = set_id + "/" + fn[:-4]
                if fn.lower().endswith(".jpg"):  # a pet sheet (familiars/): keyed, cut by blob_objects
                    kind = fn.split("_")[0].split(".")[0]
                    rgba = key_flat(np.asarray(Image.open(path).convert("RGB")), SHEET_TOL.get(kind, 10))
                    sprites = even_grid_objects(rgba, *SHEET_GRID[kind]) if kind in SHEET_GRID else blob_objects(rgba)
                    rows, cols = 1, len(sprites)
                    for k, a in enumerate(sprites):
                        pieces.append(enemy_piece(Image.fromarray(a), k, SHEET_SCALE.get(kind, ENEMY_SCALE)))
                else:
                    rgba = np.asarray(Image.open(path).convert("RGBA")).copy()
                    rgba[..., 3] = np.where(rgba[..., 3] < 16, 0, rgba[..., 3])
                    rows, cols = ENEMY_GRID.get(key, (2, 5))
                    for r, row in enumerate(grid_objects(rgba, rows, cols, y_min=0)):
                        for c, a in enumerate(row):
                            if a is not None:
                                pieces.append(enemy_piece(Image.fromarray(a), r * cols + c, ENEMY_SCALE))
            else:
                continue
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
