"""
Class art importer: turns a class art pack (assets/source/classes/<class>/) into game atlases.

    python3 tools/process_assets.py classes            # every pack in assets/source/classes/
    python3 tools/process_assets.py classes paladin    # one class

A pack is the folder the art generator hands over: a catalog JSON (`catalog*.json`: weapons, abilities; its
armor and helmet entries are ignored, those come from the gear libraries, tools/gearart.py), a README, and
labeled PNG sheets named
  <class>_<rarity>_abilities*.png  10 effects x 6 stages (start, gather, release, peak, decay, fade)
  <class>_weapons*.png             6 rarity rows x 10 items (weapons and shields)
When several versions of a sheet exist (`_v2`, `_v3`), the highest version wins. Nothing is cut by fixed
coordinates: the printed labels are found as text (bright strokes on dark boxes) and give the item / ability
layout. The catalog, not the printed text, names everything, by grid position. An optional `import.json` in
the pack holds overrides (see OVERRIDE_KEYS) for problems detection can't settle.

Output (generated; never hand-edit): assets/sprites/classes/<class>/
  fx/<ID>.webp          6 effect stages in one strip (same cell size, centred)
  items.webp            weapon / shield icons (max ICON px)
  <class>.json          everything above keyed by catalog ID, with names, rarities and atlas rects
"""
import glob
import json
import os
import re

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "classes")
OUT = os.path.join(ROOT, "assets", "sprites", "classes")

STAGES = ["start", "gather", "release", "peak", "decay", "fade"]
ICON = 96     # item icons fit in ICON x ICON
FX_MAX = 160  # effect frames fit in FX_MAX x FX_MAX
# weapons and shields share one sheet; a shield word in the name decides, else the shape does
SHIELD_WORDS = re.compile(r"\b(Buckler|Shield|Roundshield|Kite|Heater|Pavise|Ward|Aegis|Targe|Bulwark)\b")
OVERRIDE_KEYS = {
    "kinds": "{item ID: 'weapon' | 'shield'}, when name and shape guess wrong",
}


def save(img, path):
    img.save(path, "WEBP", quality=88, method=6)


def lum(rgb):
    return rgb[..., :3].astype(np.float32).mean(-1)


# --------------------------------------------------------------------------
# Labels: found as text, not as boxes (box fill can be as dark as the backdrop)
# --------------------------------------------------------------------------
def text_lines(a):
    """Boxes (x0, y0, x1, y1) of printed text runs: bright, unsaturated strokes inside a dark surround."""
    L = lum(a)
    rgb = a[..., :3].astype(np.int32)
    sat = rgb.max(-1) - rgb.min(-1)
    bright = (L > 150) & (sat < 90) & (a[..., 3] > 150)
    dark = (L < 70) | (a[..., 3] < 64)  # a dark box, or bare text on the transparent sheet
    # light box frames are long straight runs; letters are short strokes
    frames = ndimage.binary_opening(bright, np.ones((1, 25))) | ndimage.binary_opening(bright, np.ones((20, 1)))
    bright &= ~ndimage.binary_dilation(frames)
    dark |= frames
    lab, _ = ndimage.label(ndimage.binary_dilation(bright, np.ones((3, 9))))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if not (8 <= h <= 34 and w >= 18):
            continue
        b = bright[sl]
        if not 0.12 < b.mean() < 0.6:
            continue
        y0, x0 = max(0, sl[0].start - 4), max(0, sl[1].start - 4)
        ring = dark[y0:sl[0].stop + 4, x0:sl[1].stop + 4].copy()
        inner = ring[sl[0].start - y0:sl[0].start - y0 + h, sl[1].start - x0:sl[1].start - x0 + w]
        n_ring = ring.size - inner.size
        if (ring.sum() - inner.sum()) / max(1, n_ring) < 0.6:
            continue
        if (dark[sl] & ~b).sum() / max(1, (~b).sum()) < 0.6:
            continue
        out.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop])
    return out


def group_labels(lines, gx=16, gy=10):
    """Merge text runs into labels (words of one line, and an ID line over a name line)."""
    boxes = [dict(x0=b[0], y0=b[1], x1=b[2], y1=b[3], n=1, lines={b[1] // 6}) for b in lines]
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                hov = a["x0"] < b["x1"] and b["x0"] < a["x1"]
                vov = a["y0"] < b["y1"] and b["y0"] < a["y1"]
                # words on one line, or lines stacked over each other (not diagonal neighbours)
                if (vov and a["x0"] - gx <= b["x1"] and b["x0"] - gx <= a["x1"]) or (hov and a["y0"] - gy <= b["y1"] and b["y0"] - gy <= a["y1"]):
                    a.update(x0=min(a["x0"], b["x0"]), y0=min(a["y0"], b["y0"]), x1=max(a["x1"], b["x1"]),
                             y1=max(a["y1"], b["y1"]), n=a["n"] + b["n"])
                    boxes.pop(j)
                    merged = True
                    break
            if merged:
                break
    for b in boxes:
        b["cx"], b["cy"] = (b["x0"] + b["x1"]) / 2, (b["y0"] + b["y1"]) / 2
        b["rows"] = 2 if b["y1"] - b["y0"] > 26 else 1  # an ID line over a name line
    return boxes


def grow_box(m, b, steps=80, solid=0.8):
    """Grow a label's text box out to the printed box around it: each side moves out while the line beyond
    it is still mostly opaque, so art that merely touches the box is left alone. Returns (x0, y0, x1, y1)."""
    x0, y0, x1, y1 = b["x0"], b["y0"], b["x1"], b["y1"]
    for _ in range(steps):
        grew = False
        if x0 > 0 and m[y0:y1, x0 - 1].mean() > solid: x0 -= 1; grew = True
        if x1 < m.shape[1] and m[y0:y1, x1].mean() > solid: x1 += 1; grew = True
        if y0 > 0 and m[y0 - 1, x0:x1].mean() > solid: y0 -= 1; grew = True
        if y1 < m.shape[0] and m[y1, x0:x1].mean() > solid: y1 += 1; grew = True
        if not grew:
            break
    return x0, y0, x1, y1


def bands(items, key, gap):
    """Cluster items into bands along `key` wherever consecutive values jump by more than `gap`."""
    items = sorted(items, key=lambda b: b[key])
    out = []
    for b in items:
        if out and b[key] - out[-1][-1][key] <= gap:
            out[-1].append(b)
        else:
            out.append([b])
    return out


# --------------------------------------------------------------------------
# Mattes
# --------------------------------------------------------------------------
def backdrop_model(a, exclude):
    """The sheet's painted backdrop, estimated from pixels far from any edge and spread smoothly under the art."""
    L = lum(a)
    g = np.hypot(ndimage.sobel(L, 0), ndimage.sobel(L, 1))
    cand = ~ndimage.binary_dilation(g > 60, iterations=6) & ~exclude
    w = ndimage.gaussian_filter(cand.astype(np.float32), 20)
    B = np.stack([ndimage.gaussian_filter(a[..., c].astype(np.float32) * cand, 20) for c in range(3)], -1)
    return B / np.maximum(w, 1e-3)[..., None]


def alpha_haze(a):
    """Share of pixels with in-between alpha. A real matte has soft edges only (~0.05); a sheet whose alpha
    is a blurred haze over a painted backdrop (the weapon sheet) scores ~0.3."""
    al = a[..., 3]
    return float(((al > 32) & (al < 200)).sum() / max(1, (al >= 32).sum()))


def fill_small_holes(m, area):
    holes = ndimage.binary_fill_holes(m) & ~m
    lab, n = ndimage.label(holes)
    if not n:
        return m
    sizes = ndimage.sum(holes, lab, range(1, n + 1))
    return m | np.isin(lab, np.nonzero(sizes < area)[0] + 1)


def diagonal(a):
    """How much an item's silhouette lies along the lower-left -> upper-right diagonal (weapons ~0.6-0.9,
    shields and helmets ~0)."""
    ys, xs = np.nonzero(a[..., 3] > 0)
    return float(np.corrcoef(xs, -ys)[0, 1]) if len(xs) > 10 else 0.0


def matte_backdrop(a, exclude, soft=False):
    """Separate art from a painted backdrop (the weapon, helmet and ability sheets): colour distance to the
    backdrop model. Hard alpha for item art (filled silhouettes, dark outline kept); soft alpha with the
    backdrop colour un-mixed for glowing effects."""
    B = backdrop_model(a, exclude)
    I = a[..., :3].astype(np.float32)
    d = np.sqrt(((I - B) ** 2).sum(-1))
    gate = a[..., 3] > 24
    if not soft:
        core = ndimage.binary_opening(fill_small_holes(ndimage.binary_closing((d > 42) & gate, iterations=2), 250), iterations=2)
        # the dark ink outline sits just outside the core and is darker than the backdrop
        ink = ndimage.binary_dilation(core, iterations=3) & ((d > 18) | (lum(a) < lum(B) * 0.65)) & gate
        m = fill_small_holes(core | ink, 250)  # not the backdrop caught inside a flail's chain loop
        out = a.copy()
        out[..., 3] = np.where(m, 255, 0)
        return out
    al = np.clip((d - 16) / 44, 0, 1) * gate
    al = np.where(ndimage.binary_opening(al > 0.05, iterations=1) | (al > 0.6), al, 0)
    F = B + (I - B) / np.maximum(al, 0.3)[..., None]
    out = np.dstack([np.clip(F, 0, 255), al * 255]).astype(np.uint8)
    return out


def matte_alpha(a, thr=110):
    """Armor sheets have a real alpha, just soft and haloed: harden it (pixel-art edges, no near-zero haze)."""
    out = a.copy()
    m = ndimage.binary_opening(a[..., 3] >= thr, iterations=1)
    out[..., 3] = np.where(m, 255, 0)
    return out


def crop_rgba(a):
    ys, xs = np.nonzero(a[..., 3])
    if not len(ys):
        return a[:1, :1]
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def keep_main(a, frac=0.08, pad=10):
    """Keep the biggest shape plus the pieces close to it (within `pad` px of what is kept so far) that are at
    least `frac` of its size. Drops neighbours' stray tips, specks, and thin leftover box edges."""
    m = a[..., 3] > 0
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n <= 1:
        return a
    sl = ndimage.find_objects(lab)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    thick = np.zeros(n + 1, bool)
    thick[np.unique(lab[ndimage.binary_erosion(m)])] = True
    big = int(np.argmax(sizes))
    keep = {big}
    box = [sl[big][0].start, sl[big][0].stop, sl[big][1].start, sl[big][1].stop]
    grew = True
    while grew:
        grew = False
        for i in range(n):
            if i in keep or sizes[i] < frac * sizes[big]:
                continue
            s0, s1 = sl[i]
            hh, ww = s0.stop - s0.start, s1.stop - s1.start
            if not thick[i + 1] and ww > 4 * hh:
                continue  # a bare horizontal line: the edge of a label box
            if s0.start <= box[1] + pad and s0.stop >= box[0] - pad and s1.start <= box[3] + pad and s1.stop >= box[2] - pad:
                keep.add(i)
                box = [min(box[0], s0.start), max(box[1], s0.stop), min(box[2], s1.start), max(box[3], s1.stop)]
                grew = True
    out = a.copy()
    out[..., 3] = np.where(np.isin(lab, [i + 1 for i in keep]), a[..., 3], 0)
    return out


def fit(img, mw, mh):
    k = min(1, mw / img.width, mh / img.height)
    return img if k >= 1 else img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)


# --------------------------------------------------------------------------
# Sheet kinds
# --------------------------------------------------------------------------
def label_mask(shape, labels, pad):
    m = np.zeros(shape, bool)
    for b in labels:
        m[max(0, b["y0"] - pad):b["y1"] + pad, max(0, b["x0"] - pad):b["x1"] + pad] = True
    return m


def slice_items(a, nrows, ncols, log):
    """Item sheets: every item has a two-line label (ID over name) right below its art. Labels give the grid;
    an item's cell is the space above its label, half way to its neighbours."""
    labels = group_labels(text_lines(a))
    items = [b for b in labels if b["rows"] == 2 and b["x1"] - b["x0"] >= 30]
    rows = [r for r in bands(items, "cy", 30) if len(r) >= ncols // 2]
    log.append("%d labels, rows %s" % (len(items), [len(r) for r in rows]))
    excl = label_mask(a.shape[:2], labels, 12)
    mid = alpha_haze(a)
    log.append("alpha haze %.2f -> %s matte" % (mid, "alpha" if mid < 0.2 else "backdrop"))
    keyed = matte_alpha(a, 128) if mid < 0.2 else matte_backdrop(a, excl)
    solid = keyed[..., 3] > 0
    for b in labels:
        b["bx0"], b["by0"], b["bx1"], b["by1"] = grow_box(solid, b, steps=14)
    for b in items:  # only item labels: a stray "text" hit inside the art must not cut a hole
        keyed[b["by0"]:b["by1"] + 1, b["bx0"]:b["bx1"] + 1, 3] = 0
    grid = []
    for ri, row in enumerate(rows[:nrows]):
        row = sorted(row, key=lambda b: b["cx"])
        pitch = np.median(np.diff([b["cx"] for b in row])) if len(row) > 1 else 140
        cells = []
        for ci, b in enumerate(row[:ncols]):
            # half way to the neighbours; the outer columns stop near their label (a rarity badge or the
            # sheet edge lies beyond)
            x0 = (row[ci - 1]["cx"] + b["cx"]) / 2 if ci else b["x0"]
            x1 = (row[ci + 1]["cx"] + b["cx"]) / 2 if ci + 1 < len(row) else b["x1"]
            y1 = b["by0"] - 5  # the box's top edge can be a few pixels softer than the box
            # up to the nearest label box above (the row above, or the sheet title for the first row)
            above = [bb["by1"] for bb in labels if bb["by1"] < y1 and bb["bx0"] < x1 and bb["bx1"] > x0 and bb["x1"] - bb["x0"] >= 60]
            y0 = max(above) + 1 if above else 0
            cell = keyed[int(y0):int(y1), int(max(0, x0)):int(x1)]
            cells.append(Image.fromarray(crop_rgba(drop_underline(keep_main(cell)))))
        grid.append(cells)
    return grid


def drop_underline(a, rows=8):
    """Remove what is left of a label box's top edge under the art: thin horizontal runs in the bottom rows."""
    a = crop_rgba(a).copy()
    m = a[..., 3] > 0
    low = m[-rows:]
    a[-rows:, :, 3] = np.where(ndimage.binary_opening(low, np.ones((3, 1))), a[-rows:, :, 3], 0)
    return a


def slice_effects(a, nrows, ncols, log):
    """Ability sheets: a header band of ncols stage labels and one label per row on the left."""
    labels = group_labels(text_lines(a), gx=22)
    bnds = bands(labels, "cy", 14)
    head = next((b for b in bnds if len(b) == ncols), None)
    if head is None:
        log.append("!! no header band with %d labels" % ncols)
        return []
    head = sorted(head, key=lambda b: b["cx"])
    left = [b for b in labels if b["x1"] < head[0]["x0"] + 10 and b["cy"] > head[0]["y1"]]
    # a row label printed as separate words ("F01", "Votive Spark") is one label
    rowlab = [dict(x0=min(b["x0"] for b in bd), x1=max(b["x1"] for b in bd), y0=min(b["y0"] for b in bd),
                   y1=max(b["y1"] for b in bd), cy=np.mean([b["cy"] for b in bd])) for bd in bands(left, "cy", 12)]
    log.append("%d stage headers, %d row labels" % (len(head), len(rowlab)))
    excl = label_mask(a.shape[:2], labels, 14)
    keyed = matte_backdrop(a, excl, soft=True)
    keyed[..., 3][label_mask(a.shape[:2], labels, 12)] = 0
    keyed[..., 3][:head[-1]["y1"] + 10] = 0
    pitch_x = np.median(np.diff([b["cx"] for b in head]))
    xs = [head[0]["cx"] - pitch_x / 2] + [(p["cx"] + q["cx"]) / 2 for p, q in zip(head, head[1:])] + [head[-1]["cx"] + pitch_x / 2]
    xs[0] = max(xs[0], max(b["x1"] for b in rowlab) + 14) if rowlab else xs[0]
    pitch_y = np.median(np.diff([b["cy"] for b in rowlab])) if len(rowlab) > 1 else 80
    ys = [rowlab[0]["cy"] - pitch_y / 2] + [(p["cy"] + q["cy"]) / 2 for p, q in zip(rowlab, rowlab[1:])] + [rowlab[-1]["cy"] + pitch_y / 2]
    grid = []
    margin = int(pitch_x * 0.5)
    for r in range(min(nrows, len(rowlab))):
        y0, y1 = int(max(0, ys[r])), int(ys[r + 1])
        band = keyed[y0:y1]
        # every piece goes to the column holding its centre, so a long whip or smoke trail that crosses
        # the column line stays whole and no neighbour's fragment comes along
        lab, n = ndimage.label(band[..., 3] > 8, structure=np.ones((3, 3)))
        owner = np.zeros(n + 1, int) - 1
        for i, c in enumerate(ndimage.center_of_mass(band[..., 3] > 8, lab, range(1, n + 1))):
            k = int(np.searchsorted(xs, c[1])) - 1
            owner[i + 1] = min(k, ncols - 1) if k >= 0 else -1  # left of the first stage: a row label's box
        cells = []
        for c in range(ncols):
            x0, x1 = int(xs[c]) - margin, int(xs[c + 1]) + margin
            sub = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
            sx0, sx1 = max(0, x0), min(band.shape[1], x1)
            sub[:, sx0 - x0:sx1 - x0] = band[:, sx0:sx1]
            mine = np.zeros(sub.shape[:2], bool)
            mine[:, sx0 - x0:sx1 - x0] = owner[lab[:, sx0:sx1]] == c
            sub[..., 3] = np.where(mine, sub[..., 3], 0)
            cells.append(sub)
        grid.append(cells)
    return grid


def build_strip(cells, mw, mh):
    """Effect stages as one strip. All stages share one crop box (cells are centred on each other first), so
    an effect keeps the motion drawn on the sheet: a bolt still travels right, a ring still grows in place.
    Returns (strip image, cell w, cell h)."""
    W = max(c.shape[1] for c in cells)
    H = max(c.shape[0] for c in cells)
    pads = []
    for c in cells:
        p = np.zeros((H, W, 4), np.uint8)
        x, y = (W - c.shape[1]) // 2, (H - c.shape[0]) // 2
        p[y:y + c.shape[0], x:x + c.shape[1]] = c
        pads.append(p)
    al = np.any([p[..., 3] > 0 for p in pads], axis=0)
    ys, xs = np.nonzero(al)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    imgs = [fit(Image.fromarray(p[y0:y1, x0:x1]), mw, mh) for p in pads]
    cw, ch = imgs[0].width + 2, imgs[0].height + 2
    strip = Image.new("RGBA", (cw * len(imgs), ch), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        strip.alpha_composite(im, (i * cw + 1, 1))
    return strip, cw, ch


def pack(images, aw=1024, gap=2):
    """Shelf-pack [(key, img)] tallest first. Returns (atlas, {key: [x, y, w, h]})."""
    order = sorted(images, key=lambda t: -t[1].height)
    x = y = shelf = 0
    pos = {}
    for k, im in order:
        if x + im.width > aw:
            x, y, shelf = 0, y + shelf + gap, 0
        pos[k] = [x, y, im.width, im.height]
        x += im.width + gap
        shelf = max(shelf, im.height)
    atlas = Image.new("RGBA", (aw, y + shelf), (0, 0, 0, 0))
    for k, im in images:
        atlas.alpha_composite(im, tuple(pos[k][:2]))
    return atlas, pos


# --------------------------------------------------------------------------
# Pack discovery
# --------------------------------------------------------------------------
def version(path):
    m = re.findall(r"_v(\d+)", os.path.basename(path))
    return int(m[-1]) if m else 1


def find_sheet(folder, pattern):
    cands = sorted(glob.glob(os.path.join(folder, pattern)), key=version)
    return cands[-1] if cands else None


def split_id(s):
    """'W01 Nail Sword' -> ('W01', 'Nail Sword')"""
    m = re.match(r"\s*([A-Z]+\d+)\s+(.*)", s)
    return (m.group(1), m.group(2).strip()) if m else (None, s.strip())


def load_catalog(folder):
    path = next((p for p in sorted(glob.glob(os.path.join(folder, "*.json"))) if "catalog" in os.path.basename(p)), None)
    if not path:
        raise SystemExit("no catalog*.json in " + folder)
    with open(path) as f:
        return json.load(f), os.path.basename(path)


def process_class(cid, log_all):
    folder = os.path.join(SRC, cid)
    cat, catname = load_catalog(folder)
    ov = {}
    if os.path.exists(os.path.join(folder, "import.json")):
        with open(os.path.join(folder, "import.json")) as f:
            ov = json.load(f)
    outdir = os.path.join(OUT, cid)
    for sub in ("fx",):
        os.makedirs(os.path.join(outdir, sub), exist_ok=True)
        for old in glob.glob(os.path.join(outdir, sub, "*.webp")):
            os.remove(old)
    meta = {"class": cat.get("class", cid), "direction": cat.get("direction", "right"), "stages": STAGES,
            "items": {}, "fx": {}}
    problems = []

    def report(sheet, log, got, want):
        flag = "" if got == want else "   <-- MISMATCH (expected %d)" % want
        print("  %-42s %3d%s" % (os.path.basename(sheet) if sheet else "(missing)", got, flag))
        for l in log:
            print("      " + l)
        if got != want:
            problems.append("%s: %d of %d" % (os.path.basename(sheet) if sheet else "missing sheet", got, want))

    # ---- weapons and shields (helmets and body armor come from the gear libraries: tools/gearart.py)
    icons = []
    for kind, pattern in (("weapons", "%s_weapons*.png"),):
        rows = cat.get(kind, [])
        if not rows:
            continue
        sheet = find_sheet(folder, pattern % cid)
        log = []
        grid = slice_items(np.asarray(Image.open(sheet).convert("RGBA")), len(rows), max(len(r) - 1 for r in rows), log) if sheet else []
        got = 0
        for ri, row in enumerate(rows):
            rar, entries = row[0], row[1:]
            for ci, entry in enumerate(entries):
                iid, name = split_id(entry)
                if ri >= len(grid) or ci >= len(grid[ri]) or grid[ri][ci].width < 8:
                    log.append("!! %s %s: not found" % (iid, name))
                    continue
                art = grid[ri][ci]
                # weapons are drawn as diagonals, shields upright and solid (flails are neither diagonal nor solid)
                diag, fill = diagonal(np.asarray(art)), (np.asarray(art)[..., 3] > 0).mean()
                icons.append((iid, fit(art, ICON, ICON)))
                meta["items"][iid] = {"name": name, "rarity": rar, "kind": "shield" if SHIELD_WORDS.search(name) or (diag < 0.3 and fill > 0.62) else "weapon"}
                got += 1
        report(sheet, log, got, sum(len(r) - 1 for r in rows))
    if icons:
        atlas, pos = pack(icons)
        save(atlas, os.path.join(outdir, "items.webp"))
        for k, r in pos.items():
            meta["items"][k]["rect"] = r
        print("  items.webp %dx%d" % atlas.size)

    # ---- ability effects
    for row in cat.get("abilities", []):
        rar, entries = row[0], row[1:]
        sheet = find_sheet(folder, "%s_%s_abilities*.png" % (cid, rar.lower()))
        log = []
        grid = slice_effects(np.asarray(Image.open(sheet).convert("RGBA")), len(entries), len(STAGES), log) if sheet else []
        got = 0
        for i, entry in enumerate(entries):
            fid, name = split_id(entry[0] if isinstance(entry, list) else entry)
            desc = entry[1] if isinstance(entry, list) and len(entry) > 1 else ""
            if i >= len(grid):
                log.append("!! %s %s: not found" % (fid, name))
                continue
            strip, cw, ch = build_strip(grid[i], FX_MAX, FX_MAX)
            save(strip, os.path.join(outdir, "fx", fid + ".webp"))
            meta["fx"][fid] = {"name": name, "rarity": rar, "desc": desc, "cell": [cw, ch]}
            got += 1
        report(sheet, log, got, len(entries))

    for k, v in ov.get("kinds", {}).items():
        if k in meta["items"]:
            meta["items"][k]["kind"] = v
    kinds = {}
    for it in meta["items"].values():
        kinds[it["kind"]] = kinds.get(it["kind"], 0) + 1
    print("  item kinds by shape: %s" % kinds)
    meta["source"] = catname
    with open(os.path.join(outdir, cid + ".json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("  -> %d items, %d effects" % (len(meta["items"]), len(meta["fx"])))
    log_all.extend(cid + ": " + p for p in problems)


def process_class_art(only=None):
    classes = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d))) if os.path.isdir(SRC) else []
    if only:
        classes = [c for c in classes if c in only]
    problems = []
    for cid in classes:
        print("class art: " + cid)
        process_class(cid, problems)
    # the game reads this list to know which classes have a pack (no 404s for the others)
    packs = sorted(d for d in os.listdir(OUT) if os.path.exists(os.path.join(OUT, d, d + ".json")))
    with open(os.path.join(OUT, "packs.json"), "w") as f:
        json.dump(packs, f)
    if problems:
        print("MISMATCHES:\n  " + "\n  ".join(problems))
    elif classes:
        print("class art OK: every catalog entry was found")
