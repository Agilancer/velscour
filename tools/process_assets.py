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


def process_floors():
    im = Image.open(os.path.join(SRC, "catacombs_floors.webp")).convert("RGB")
    rgba = key_magenta(np.asarray(im))
    sections = [("floor", 9, 102.75, 8), ("detail", 840, 103.0, 4), ("threshold", 1266, 110.0, 2)]
    tiles = []
    for cat, y0, pitch, nrows in sections:
        for r in range(nrows):
            for c in range(5):
                x = int(round(1 + c * 202.75))
                y = int(round(y0 + r * pitch))
                h = int(round(pitch)) if cat != "threshold" else 110
                crop = rgba[y:y + h, x:x + 201]
                if crop.shape[0] < h:
                    continue
                if cat != "threshold":
                    m = diamond_mask(201, h, 0.98)
                    cover = (crop[..., 3] > 128) & m
                    if cover.sum() < m.sum() * 0.6:
                        continue
                else:
                    if (crop[..., 3] > 128).sum() < 201 * h * 0.3:
                        continue
                tiles.append((cat, crop))
    # build atlas: 8 columns
    cols = 8
    th = {"floor": FLOOR_H, "detail": FLOOR_H, "threshold": round(FLOOR_H * 110 / 102.75)}
    cell_h = max(th.values())
    rows = (len(tiles) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * FLOOR_W, rows * cell_h), (0, 0, 0, 0))
    entries = []
    for i, (cat, crop) in enumerate(tiles):
        img = Image.fromarray(crop)
        hh = th[cat]
        img = img.resize((FLOOR_W, hh), Image.LANCZOS)
        a = np.asarray(img).copy()
        if cat != "threshold":
            m = diamond_mask(FLOOR_W, hh, 1.0)
            a[..., 3] = np.where(m, np.maximum(a[..., 3], 255 * (a[..., 3] > 60)), 0)
        img = Image.fromarray(a)
        ax, ay = (i % cols) * FLOOR_W, (i // cols) * cell_h
        atlas.paste(img, (ax, ay))
        entries.append({"cat": cat, "x": ax, "y": ay, "w": FLOOR_W, "h": hh})
    ensure(os.path.join(OUT, "tiles"))
    save(atlas, os.path.join(OUT, "tiles", "catacombs_floor.webp"))
    print("floors:", {c: sum(1 for e in entries if e["cat"] == c) for c in th})
    return entries


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
STRIP_W = 46   # bay width in source px; the game maps it onto one tile edge
CAP_W = 23     # the shared cap repeats every CAP_W px (divides STRIP_W, so it is seamless)
BODY_H = 43    # niche rows kept above the base molding
LEDGE_H = 21   # base molding + ledge rows


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
    """Rectangle (rows x STRIP_W) -> "/" parallelogram rising 1px per 2px; row r of column x lands at r + W/2 - x/2."""
    ext = STRIP_W // 2
    return Image.fromarray(unpremul(shift_cols(f, 0.5 * np.arange(f.shape[1]) - ext, f.shape[0] + ext)))


def wall_layout(a):
    """Measure a "/" piece. Returns the unsheared piece and its rows/columns, or None if it doesn't fit the template."""
    al = a[..., 3] > 128
    h, w = al.shape
    bot = np.array([np.nonzero(al[:, x])[0].max() if al[:, x].any() else -1 for x in range(w)])
    xs = np.arange(int(np.argmax(bot)) + 2, w - 2)  # the ledge's front edge
    if len(xs) < 10:
        return None
    s, c = np.polyfit(xs, bot[xs], 1)
    if abs(s + 0.515) > 0.03:  # broken or skewed pieces
        return None
    U = shift_cols(premul(a), s * np.arange(w), h + int(np.ceil(-s * w)) + 2)
    ua = U[..., 3] > 128
    top = np.array([np.nonzero(ua[:, x])[0].min() if ua[:, x].any() else 1 << 20 for x in range(w)])
    face = np.nonzero(top < c - 40)[0]
    f0, f1 = int(face.min()), int(face.max())
    if f1 - f0 < STRIP_W + 1 or f1 + 1 >= w or len(face) != f1 - f0 + 1:
        return None
    ledge = int(top[f1 + 1])  # back edge of the ledge = bottom of the niche
    rgb = unpremul(U).astype(int)
    warm = ((rgb[..., 0] - rgb[..., 2]) * (U[..., 3] > 200))[:, f0 + 5:f0 + 20].mean(1)  # bone vs grey stone
    cop = int(np.median(top[f0 + 3:f0 + 12]))
    mold = next((r for r in range(cop + 5, ledge) if warm[r] > 14 and warm[r + 1] > 14), -1)
    if mold < 0 or not (BODY_H - 2 <= ledge - mold <= BODY_H + 3) or not (17.5 <= c - ledge <= 21):
        return None
    return {"U": U, "top": top, "x0": f0 + 1, "ledge": ledge, "cop": cop, "mold": mold}


def build_wall_strips(seg_pieces):
    lays = [l for l in (wall_layout(np.asarray(p["img"])) for p in seg_pieces) if l]
    out = []
    bodies = [l["U"][l["ledge"] - BODY_H:l["ledge"], l["x0"]:l["x0"] + STRIP_W].copy() for l in lays]
    # even out brightness between pieces, so neighbouring bays don't flicker light/dark
    lum = [b[..., :3].sum() / max(b[..., 3].sum(), 1) for b in bodies]
    for b, v in zip(bodies, lum):
        b[..., :3] = np.minimum(b[..., :3] * (np.median(lum) / v), b[..., 3:4])
        out.append({"kind": "wall_body", "img": reshear(b), "rows": BODY_H})
    # shared cap + ledge from the first piece whose coping sits low and flat on its left side
    l = next(l for l in lays if l["cop"] > 40)
    U, x0, ua = l["U"], l["x0"], l["U"][..., 3] > 200
    cap_h = l["mold"] - l["cop"]
    cap = np.stack([U[l["top"][x]:l["top"][x] + cap_h, x] for x in range(x0, x0 + CAP_W)], axis=1)
    cap = np.concatenate([cap] * (STRIP_W // CAP_W), axis=1)
    out.append({"kind": "wall_cap", "img": reshear(cap), "rows": cap_h})
    ledge = np.zeros((LEDGE_H, STRIP_W, 4), np.float32)
    for r in range(LEDGE_H):
        cols = np.nonzero(ua[l["ledge"] + r])[0]
        lo, hi = (cols.min() + 1, cols.max() - 1) if len(cols) else (0, U.shape[1] - 1)
        for j in range(STRIP_W):  # wrap by one bay so the ledge has no cut ends
            x = x0 + j
            x = x + STRIP_W if x < lo else x - STRIP_W if x > hi else x
            ledge[r, j] = U[l["ledge"] + r, x]
    out.append({"kind": "wall_ledge", "img": reshear(ledge), "rows": LEDGE_H})
    for p in out:
        p["w"], p["h"] = p["img"].size
    print("wall strips:", len(lays), "bodies, cap", cap_h, "rows")
    return out


# --------------------------------------------------------------------------
# Walls
# --------------------------------------------------------------------------
def process_walls():
    im = Image.open(os.path.join(SRC, "catacombs_walls.webp")).convert("RGB")
    rgb = np.asarray(im)
    rgba = key_magenta(rgb)
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
        # classify
        if 55 <= w <= 72 and h >= 100 and slope < -0.22:
            kind = "seg_fwd"   # "/" : runs bottom-left -> top-right
        elif 55 <= w <= 72 and h >= 100 and slope > 0.3:
            kind = "seg_back"  # "\" : runs top-left -> bottom-right
        elif 90 <= w <= 140 and h >= 130 and abs(slope) < 0.1 and y0 > 250:
            kind = "corner"
        elif w < 45 and h > 100:
            kind = "pillar"
        elif w > 90 and h > 150 and y0 > 600:
            kind = "tower"
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
    pieces += build_wall_strips([p for p in pieces if p["kind"] == "seg_fwd"])
    # shelf-pack
    pieces.sort(key=lambda p: -p["h"])
    aw, x, y, shelf = 1024, 0, 0, 0
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
        e = {"kind": p["kind"], "x": p["ax"], "y": p["ay"], "w": p["w"], "h": p["h"]}
        if "rows" in p:
            e["rows"] = p["rows"]
        else:
            e.update({"slope": round(p["slope"], 3), "base": round(p["icpt"], 1), "src": p["src"]})
        entries.append(e)
    save(atlas, os.path.join(OUT, "tiles", "catacombs_walls.webp"))
    kinds = {}
    for e in entries:
        kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
    print("walls:", kinds)
    return entries


def main():
    if "tiles" not in sys.argv[1:]:  # `process_assets.py tiles` rebuilds only the floor/wall atlases
        process_classes()
        process_ui()
    floors = process_floors()
    walls = process_walls()
    with open(os.path.join(OUT, "tiles", "catacombs.json"), "w") as f:
        json.dump({"floorSize": [FLOOR_W, FLOOR_H], "floors": floors, "walls": walls}, f, indent=1)


if __name__ == "__main__":
    main()
