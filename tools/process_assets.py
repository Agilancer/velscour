#!/usr/bin/env python3
"""
VELSCOUR asset pipeline.

Slices the hand-made source sheets in assets/source/ into game-ready PNGs and
JSON atlases under assets/. Re-run this whenever a source sheet changes:

    pip install pillow numpy scipy
    python3 tools/process_assets.py          # everything
    python3 tools/process_assets.py tiles    # floor/wall atlases only

Outputs
  assets/sprites/classes/<class>.webp  one trimmed full-body sprite per class
  assets/ui/logo.webp                  trimmed title logo
  assets/ui/hud.webp                   skill bar with an empty (transparent) XP track
  assets/ui/hud.json                   slot / orb / xp-bar geometry in hud.webp pixels
  assets/ui/potion_<color>.png         potion icons cut out of the skill bar
  assets/tiles/catacombs_floor.webp    floor-tile atlas (192x96 diamonds)
  assets/tiles/catacombs_walls.webp    wall-piece atlas, plus seamless wall strips (see build_wall_strips)
  assets/tiles/catacombs.json          atlas rects, categories and wall anchors
"""
import json
import os
import sys

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

FLOOR_W, FLOOR_H = 192, 96


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


# --------------------------------------------------------------------------
# Floors
# --------------------------------------------------------------------------
def diamond_mask(w, h, grow=1.0):
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2, (h - 1) / 2
    d = np.abs(xx - cx) / (w / 2) + np.abs(yy - cy) / (h / 2)
    return d <= grow


def process_floors(path):
    """Slice a floor sheet into an atlas. Tiles are found as shapes, not by grid position, because the
    sections shift between sheets. Rows of tiles sit ~103 px apart and a section label adds a bigger
    gap, so the gaps split base floors / details / thresholds."""
    rgba = key_magenta(np.asarray(Image.open(path).convert("RGB")))
    lab, _ = ndimage.label(ndimage.binary_erosion(rgba[..., 3] > 128, iterations=3))
    found = sorted((s for s in ndimage.find_objects(lab) if s[1].stop - s[1].start > 140),
                   key=lambda s: (s[0].start, s[1].start))
    tiles, sec, row_y = [], 0, None
    for s in found:
        y0 = s[0].start
        if row_y is not None and y0 - row_y > 40:  # next row
            if y0 - row_y > 107:
                sec += 1
            row_y = y0
        row_y = y0 if row_y is None else row_y
        cat = ["floor", "detail", "threshold"][min(sec, 2)]
        y, x = max(0, y0 - 3), max(0, s[1].start - 3)
        crop = rgba[y:s[0].stop + 3, x:s[1].stop + 3].copy()
        crop[..., 3] = np.where(ndimage.binary_dilation(lab[y:s[0].stop + 3, x:s[1].stop + 3] > 0, iterations=4), crop[..., 3], 0)
        tiles.append((cat, crop))
    # atlas: 8 columns; floors/details are squashed to exact 192x96 diamonds, thresholds keep their aspect
    cols = 8
    cell_h = max(FLOOR_H, max(round(c.shape[0] * FLOOR_W / c.shape[1]) for _, c in tiles))
    rows = (len(tiles) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * FLOOR_W, rows * cell_h), (0, 0, 0, 0))
    entries = []
    for i, (cat, crop) in enumerate(tiles):
        hh = FLOOR_H if cat != "threshold" else round(crop.shape[0] * FLOOR_W / crop.shape[1])
        a = np.asarray(Image.fromarray(crop).resize((FLOOR_W, hh), Image.LANCZOS)).copy()
        if cat != "threshold":
            m = diamond_mask(FLOOR_W, hh, 1.0)
            a[..., 3] = np.where(m, np.maximum(a[..., 3], 255 * (a[..., 3] > 60)), 0)
        ax, ay = (i % cols) * FLOOR_W, (i // cols) * cell_h
        atlas.paste(Image.fromarray(a), (ax, ay))
        e = {"cat": cat, "x": ax, "y": ay, "w": FLOOR_W, "h": hh}
        if cat == "floor":  # contrast inside the diamond: pits and rubble score high, plain paving low
            lum = a[..., :3].astype(float).mean(2)[a[..., 3] > 200]
            e["busy"] = round(float(lum.std()), 1)
        entries.append(e)
    return atlas, entries


# --------------------------------------------------------------------------
# Seamless wall strips
# --------------------------------------------------------------------------
# The sheet's "/" wall pieces are self-contained panels: a curved coping rising to an end post with a
# finial, and a ledge with cut ends. Laid edge to edge they read as a row of separate tombstones with
# gaps between them. They all share one layout, so each is cut into parts that tile. In "unsheared"
# space (each column shifted so the ledge front is horizontal) a piece is, top to bottom: coping,
# molding, skull niche (the "body"), base molding + ledge, between two stone frames. Each body keeps
# the whole bay between the frames, so strip joints land on stonework. One shared cap (a flat run of
# coping) and one shared ledge (wrapped so it runs unbroken) replace the per-piece ends. Every part is
# re-sheared to an exact 2:1 slope. The game stacks ledge + N bodies + cap per tile edge.
TEMPLATE_SLOPE = -0.515  # the wall pieces' measured base slope (true 2:1 is -0.5)
CAP_FRAC = 0.37          # share of the face (coping top -> floor line) that is coping + molding


def premul(a):
    f = a.astype(np.float32)
    f[..., :3] *= f[..., 3:4] / 255
    return f


def unpremul(f):
    o = f.copy()
    a = o[..., 3:4]
    o[..., :3] = np.where(a > 0, o[..., :3] * 255 / np.maximum(a, 1e-3), 0)
    return o.clip(0, 255).round().astype(np.uint8)


def shift_cols(f, shifts, height):
    """Resample each column of premultiplied f: out[v, x] = f[v + shifts[x], x] (linear)."""
    h, w = f.shape[:2]
    out = np.zeros((height, w, 4), np.float32)
    v = np.arange(height, dtype=np.float32)
    for x in range(w):
        ys = v + shifts[x]
        y0 = np.floor(ys).astype(int)
        t = (ys - y0)[:, None]
        a0 = np.where(((y0 >= 0) & (y0 < h))[:, None], f[np.clip(y0, 0, h - 1), x], 0)
        a1 = np.where(((y0 + 1 >= 0) & (y0 + 1 < h))[:, None], f[np.clip(y0 + 1, 0, h - 1), x], 0)
        out[:, x] = a0 * (1 - t) + a1 * t
    return out


def reshear(f):
    """Rectangle (rows x W) -> "/" parallelogram rising 1px per 2px; row r of column x lands at r + W/2 - x/2."""
    ext = f.shape[1] // 2
    return Image.fromarray(unpremul(shift_cols(f, 0.5 * np.arange(f.shape[1]) - ext, f.shape[0] + ext)))


def wall_layout(a):
    """Measure a "/" wall panel in unsheared space. Returns rows/columns, or None if it isn't a full panel.
    Rows: `cop` coping top at the left end, `fb` floor line (bottom of the face = back of the ledge),
    `front` ledge front. Sand drifts, vines and snow make single measurements noisy, so `fb` is the median
    of three estimates."""
    al = a[..., 3] > 128
    h, w = al.shape
    if not (55 <= w <= 84 and h >= 100):
        return None
    bot = np.array([np.nonzero(al[:, x])[0].max() if al[:, x].any() else -1 for x in range(w)])
    xs = np.arange(int(np.argmax(bot)) + 2, w - 2)  # the ledge's front edge
    s = np.polyfit(xs, bot[xs], 1)[0] if len(xs) >= 10 else TEMPLATE_SLOPE
    if abs(s - TEMPLATE_SLOPE) > 0.03:  # ragged base: trust the template
        s = TEMPLATE_SLOPE
    U = shift_cols(premul(a), s * np.arange(w), h + int(np.ceil(-s * w)) + 2)
    ua = U[..., 3] > 128
    top = np.array([np.nonzero(ua[:, x])[0].min() if ua[:, x].any() else 1 << 20 for x in range(w)])
    bt = np.array([np.nonzero(ua[:, x])[0].max() if ua[:, x].any() else -1 for x in range(w)])
    face = np.nonzero(top < np.median(bt) - 45)[0]
    if len(face) < 40:
        return None
    f0, f1 = int(face.min()), int(face.max())
    if len(face) != f1 - f0 + 1 or f1 + 2 >= w:
        return None
    front = float(np.median(bt[f0 + 20:f1]))
    fb = int(round(np.median([bt[f0], top[f1 + 1], front - 19])))
    return {"U": U, "top": top, "f0": f0, "f1": f1, "cop": int(np.median(top[f0 + 3:f0 + 12])), "fb": fb, "front": front}


def build_wall_strips(pieces):
    """Cut the sheet's "/" panels into seamless parts (see the comment above). Proportions are measured per
    sheet: every set uses the same template, but face width and height vary between sets."""
    lays = [l for l in (wall_layout(np.asarray(p["img"])) for p in pieces) if l]
    # tall panels: the coping sits low on the left and rises to the finial on the right (short ones are mirrored)
    tall = [l for l in lays if l["cop"] > np.median(l["top"][l["f1"] - 8:l["f1"]]) + 20]
    if len(lays) < 4 or not tall:
        print("  wall strips: none (%d panels)" % len(lays))
        return []
    sw = (int(np.median([l["f1"] - l["f0"] + 1 for l in lays])) - 2) // 2 * 2  # strip width, even
    face_h = np.median([l["fb"] - l["cop"] for l in tall])
    body_h = int(round(face_h * (1 - CAP_FRAC)))
    ledge_h = int(round(np.median([l["front"] - l["fb"] for l in lays]))) + 2
    good = [l for l in lays if l["f1"] - l["f0"] >= sw + 1 and abs(l["front"] - l["fb"] + 2 - ledge_h) <= 4
            and max(l["top"][l["f0"] + 1:l["f0"] + 1 + sw]) <= l["fb"] - body_h]
    if not good:
        print("  wall strips: none fit")
        return []
    for l in good:
        l["body"] = l["U"][l["fb"] - body_h:l["fb"], l["f0"] + 1:l["f0"] + 1 + sw].copy()
    solid = [l for l in good if (l["body"][..., 3] > 200).mean() > 0.97]  # no see-through windows
    good = solid if len(solid) >= 4 else good
    bodies = [l["body"] for l in good]
    out = []
    # even out brightness between pieces, so neighbouring bays don't flicker light/dark
    lum = [b[..., :3].sum() / max(b[..., 3].sum(), 1) for b in bodies]
    for b, v in zip(bodies, lum):
        b[..., :3] = np.minimum(b[..., :3] * (np.median(lum) / v), b[..., 3:4])
        out.append({"kind": "wall_body", "img": reshear(b), "rows": body_h})
    # shared cap + ledge from the tall panel whose coping is flattest on its left half
    cw = sw // 2
    ids = {id(g) for g in good}
    l = min([l for l in tall if id(l) in ids] or tall, key=lambda l: np.ptp(l["top"][l["f0"] + 1:l["f0"] + 1 + cw]))
    U, x0 = l["U"], l["f0"] + 1
    cap_h = l["fb"] - body_h - l["cop"]
    cap = np.stack([U[l["top"][x]:l["top"][x] + cap_h, x] for x in range(x0, x0 + cw)], axis=1)
    out.append({"kind": "wall_cap", "img": reshear(np.concatenate([cap, cap], axis=1)), "rows": cap_h})
    # shared ledge from the panel whose ledge front is straightest (no rubble, drifts or vines on it)
    bottom = lambda l: [np.nonzero(l["U"][:, x, 3] > 128)[0].max() for x in range(l["f0"] + 20, l["f1"])]
    l = min(good, key=lambda l: np.std(bottom(l)))
    U, x0, ua = l["U"], l["f0"] + 1, l["U"][..., 3] > 200
    ledge = np.zeros((ledge_h, sw, 4), np.float32)
    for r in range(ledge_h):
        row = l["fb"] + r
        cols = np.nonzero(ua[row])[0] if row < U.shape[0] else []
        lo, hi = (cols.min() + 1, cols.max() - 1) if len(cols) else (0, U.shape[1] - 1)
        for j in range(sw):  # wrap by one bay so the ledge has no cut ends
            x = x0 + j
            x = x + sw if x < lo else x - sw if x > hi else x
            if 0 <= x < U.shape[1] and row < U.shape[0]:
                ledge[r, j] = U[row, x]
    out.append({"kind": "wall_ledge", "img": reshear(ledge), "rows": ledge_h})
    for p in out:
        p["w"], p["h"] = p["img"].size
    print("  wall strips: %d bodies from %d panels, width %d, cap %d + body %d + ledge %d rows"
          % (len(good), len(lays), sw, cap_h, body_h, ledge_h))
    return out


# --------------------------------------------------------------------------
# Walls
# --------------------------------------------------------------------------
def process_walls(path):
    rgba = key_magenta(np.asarray(Image.open(path).convert("RGB")))
    fg = rgba[..., 3] > 100
    fg = ndimage.binary_opening(fg, iterations=1)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    pieces = []
    for i, s in enumerate(objs):
        m = lab[s] == i + 1
        if m.sum() < 150:
            continue
        h, w = m.shape
        x0, y0 = s[1].start, s[0].start
        if y0 < 25 and x0 < 300:  # title label
            continue
        xs, ys = [], []
        for x in range(w):
            col = np.where(m[:, x])[0]
            if len(col):
                xs.append(x)
                ys.append(col.max())
        xs, ys = np.array(xs), np.array(ys)
        k = len(xs)
        sel = slice(int(k * 0.2), int(k * 0.8))
        slope, icpt = (np.polyfit(xs[sel], ys[sel], 1) if k > 6 else (0.0, float(h)))
        # classify (every wall sheet uses the same template layout)
        if x0 > 1700 and y0 > 600 and w > 80 and h > 150:
            kind = "tower"     # the big free-standing column, bottom right
        elif 55 <= w <= 72 and h >= 100 and slope < -0.22:
            kind = "seg_fwd"   # "/" : runs bottom-left -> top-right
        elif 55 <= w <= 72 and h >= 100 and slope > 0.3:
            kind = "seg_back"  # "\" : runs top-left -> bottom-right
        elif 90 <= w <= 140 and h >= 130 and abs(slope) < 0.1 and y0 > 250:
            kind = "corner"
        elif w < 45 and h > 100:
            kind = "pillar"
        elif x0 > 740 and x0 < 760 and h > 190:
            kind = "arch"
        elif x0 > 940 and x0 < 960 and h > 170:
            kind = "gate"
        elif h < 70 and w > 40:
            kind = "rubble"
        else:
            kind = "misc"
        # tight alpha from the label mask so neighbours never bleed in
        piece = rgba[s].copy()
        piece[..., 3] = np.where(ndimage.binary_dilation(m, iterations=1), piece[..., 3], 0)
        pieces.append({"kind": kind, "img": Image.fromarray(piece), "slope": float(slope),
                       "icpt": float(icpt), "w": w, "h": h, "src": [int(x0), int(y0)]})
    pieces += build_wall_strips([p for p in pieces if p["kind"] in ("seg_fwd", "misc") and p["slope"] < -0.2])
    atlas, entries = pack_atlas(pieces)
    for p, e in zip(pieces, entries):
        if "rows" in p:
            e["rows"] = p["rows"]
        else:
            e.update({"slope": round(p["slope"], 3), "base": round(p["icpt"], 1), "src": p["src"]})
    return atlas, entries


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


def count(entries, key):
    out = {}
    for e in entries:
        out[e[key]] = out.get(e[key], 0) + 1
    return out


# Tile sets: id -> printed sheet title. Sheets live in assets/source/{floors,walls}/<id>.png.
TILE_SETS = {
    "skull": "Skull-Lined Catacombs", "catacombs": "Catacombs", "cursed": "Cursed Dungeon",
    "cathedral": "Cathedral", "desert": "Endless Desert", "sand": "Sea of Sand", "swamp": "Swamp of Despair",
    "frozen": "Frozen Ossuary", "ashen": "Ashen Monastery", "blood": "Blood Crypt",
}


def process_tiles():
    ensure(os.path.join(OUT, "tiles"))
    for sid in TILE_SETS:
        floor_atlas, floors = process_floors(os.path.join(SRC, "floors", sid + ".png"))
        wall_atlas, walls = process_walls(os.path.join(SRC, "walls", sid + ".png"))
        save(floor_atlas, os.path.join(OUT, "tiles", sid + "_floor.webp"))
        save(wall_atlas, os.path.join(OUT, "tiles", sid + "_walls.webp"))
        with open(os.path.join(OUT, "tiles", sid + ".json"), "w") as f:
            json.dump({"floorSize": [FLOOR_W, FLOOR_H], "floors": floors, "walls": walls}, f, indent=1)
        print("%-10s floors %s  walls %s" % (sid, count(floors, "cat"), count(walls, "kind")))


def main():
    args = sys.argv[1:]
    if not args or "all" in args:
        args = ["sprites", "tiles", "props"]
    if "sprites" in args:
        process_classes()
        process_ui()
    if "tiles" in args:
        process_tiles()
    if "props" in args:
        process_props()


# --------------------------------------------------------------------------
# Props: scatter terrain + barricades
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


def base_slope(a):
    """Slope of an object's bottom edge over its middle columns (-0.5 = "/", +0.5 = "\\", 0 = facing us)."""
    al = a[..., 3] > 128
    xs = [x for x in range(al.shape[1]) if al[:, x].any()]
    xs = xs[len(xs) // 5:len(xs) * 4 // 5]
    if len(xs) < 6:
        return 0.0
    return float(np.polyfit(xs, [np.nonzero(al[:, x])[0].max() for x in xs], 1)[0])


# Scatter sheets: 10 object types (columns) x 6 variants (rows). Per type: name, blocks movement, footprint
# in tiles (1 = one tile, 2 = a 2x2 block). Chests are kept for the game's loot chests, not scattered.
SCATTER = {
    "catacomb_relics": [("reliquary", 1, 1), ("chest", 0, 1), ("coffin", 1, 2), ("urn", 1, 1), ("broken_urn", 0, 1),
                        ("candles", 0, 1), ("bones", 0, 1), ("lever", 1, 1), ("sarcophagus", 1, 2), ("tombstone", 1, 1)],
    "cathedral_furnishings": [("lectern", 1, 1), ("altar", 1, 2), ("angel", 1, 1), ("brazier", 1, 1), ("candelabra", 1, 1),
                              ("font", 1, 1), ("shrine", 1, 1), ("pew", 1, 2), ("screen", 1, 2), ("bell", 1, 1)],
    "desert_ruins": [("obelisk", 1, 1), ("vases", 1, 1), ("chest", 0, 1), ("skeleton", 0, 2), ("stone_head", 1, 1),
                     ("crates", 1, 1), ("well", 1, 2), ("altar", 1, 1), ("column", 1, 1), ("rocks", 1, 2)],
    "dungeon_mechanisms": [("lever", 1, 1), ("chest", 0, 1), ("plate", 0, 1), ("spikes", 0, 1), ("cage", 1, 1),
                           ("rack", 1, 2), ("barrel", 1, 1), ("weapon_rack", 1, 1), ("winch", 1, 2), ("rune_pillar", 1, 1)],
    "swamp_obstacles": [("stump", 1, 1), ("log", 1, 2), ("boulder", 1, 1), ("roots", 1, 1), ("mushrooms", 0, 1),
                        ("planks", 0, 2), ("grave", 1, 1), ("statue", 1, 1), ("chest", 0, 1), ("reeds", 0, 1)],
}
# Barricade sheets: 5 sets (rows) x 8 facings (columns), in sheet order.
BARRICADES = [
    ["skull", "cursed", "catacombs", "cathedral", "desert"],
    ["drowned", "obsidian", "fungal", "serpent", "plague"],
    ["shattered", "library", "necropolis", "amber", "void"],
    ["sand", "swamp", "frozen", "ashen", "blood"],
]


def process_props():
    ensure(os.path.join(OUT, "props"))
    meta = {"scatter": {}, "barricades": {}}
    for sheet, types in SCATTER.items():
        rgba = key_magenta(np.asarray(Image.open(os.path.join(SRC, "scatter", sheet + ".png")).convert("RGB")))
        grid = grid_objects(rgba, 6, 10)
        pieces = []
        for r, row in enumerate(grid):
            for c, a in enumerate(row):
                if a is not None:
                    pieces.append({"kind": types[c][0], "img": Image.fromarray(a), "w": a.shape[1], "h": a.shape[0],
                                   "block": types[c][1], "size": types[c][2], "var": r})
        atlas, entries = pack_atlas(pieces)
        for p, e in zip(pieces, entries):
            e.update({"block": p["block"], "size": p["size"], "var": p["var"]})
        save(atlas, os.path.join(OUT, "props", sheet + ".webp"))
        meta["scatter"][sheet] = entries
        print("%-22s %d objects, atlas %dx%d" % (sheet, len(entries), atlas.width, atlas.height))
    for i, names in enumerate(BARRICADES):
        rgb = np.asarray(Image.open(os.path.join(SRC, "barricades", "barricades_%d.png" % (i + 1))).convert("RGB"))
        rgba = key_magenta(rgb)
        # drop the small white direction labels ("N", "SE", ...) and the text inside them
        lab, _ = ndimage.label((rgb > 215).all(axis=2))
        for j, sl in enumerate(ndimage.find_objects(lab)):
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if 12 <= h <= 60 and 12 <= w <= 80 and (lab[sl] == j + 1).mean() > 0.55:
                rgba[max(0, sl[0].start - 2):sl[0].stop + 2, max(0, sl[1].start - 2):sl[1].stop + 2, 3] = 0
        grid = grid_objects(rgba, 5, 8, y_min=30, x_min=90)
        for name, row in zip(names, grid):
            # keep the facings that run along the tile diagonals; label by measured slope, not the header
            # the art isn't exact 2:1, so keep the two views per direction whose slope is closest to +-0.5;
            # front-facing (|slope| small) and edge-on (narrow, steep) views are dropped
            cand = []
            for a in row:
                if a is not None and a.shape[1] > a.shape[0] * 0.9:
                    sl = base_slope(a)
                    if 0.25 < abs(sl) < 1.2:
                        cand.append((abs(abs(sl) - 0.5), "fwd" if sl < 0 else "back", sl, a))
            pieces = []
            for kind in ("fwd", "back"):
                for _, k, sl, a in sorted(c for c in cand if c[1] == kind)[:2]:
                    pieces.append({"kind": k, "img": Image.fromarray(a), "w": a.shape[1], "h": a.shape[0], "slope": sl})
            atlas, entries = pack_atlas(pieces, 512)
            for p, e in zip(pieces, entries):
                e["slope"] = round(p["slope"], 3)
            save(atlas, os.path.join(OUT, "props", "barricades_%s.webp" % name))
            meta["barricades"][name] = entries
            print("barricades %-10s %s" % (name, count(entries, "kind")))
    with open(os.path.join(OUT, "props", "props.json"), "w") as f:
        json.dump(meta, f, indent=1)


if __name__ == "__main__":
    main()
