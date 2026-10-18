"""
Gear art importer: turns the per-class armor + helm libraries (assets/FinalClasses/<class>.zip) into game atlases.

    python3 tools/process_assets.py gear               # every class zip
    python3 tools/process_assets.py gear paladin       # one class

Each zip holds <class>/armor/<class>_armor_NNN_<rarity>.png and <class>/helms/<class>_helms_NNN_<rarity>.png:
80 + 80 single frames, 128 x 192, facing right, the same unhelmed hero in every armor, every helm drawn at the
shared head anchor (so a helm composites straight over any armor). Rarity bands come from the catalog CSVs.

What the importer adds (the game composites armor + helm + palette at run time, see src/core/gearart.js):
- Alpha is hardened (the frames carry a ~98% body alpha and a soft haze) so edges stay crisp.
- Armor mask (armor_mask.png, same layout as armor.webp): 255 = protected from palette swaps. The hero's face,
  hair and bare skin: the head's colours (k-means over the face of every armor) grown from the head through
  matching neighbours, so braids and bare arms keep their colour while the outfit is recoloured.
- Helm mask (helms_mask.png, same layout as helms.webp): 255 = face opening, 128 = crown zone. Helms were
  generated with dark empty interiors; the dark, solid, face-sized regions on the open (lower right) side are
  the opening, through which the hero's own face shows (visor slits and grille gaps stay dark). The crown zone
  (above the helm and beside its upper half) hides hair that would poke out of the shell.

Output (generated; never hand-edit): assets/sprites/gear/<class>/armor.webp, armor_mask.png, gear.json; and assets/sprites/gear/classes.json (the classes that have gear art).
"""
import csv
import io
import json
import os
import re
import zipfile

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "FinalClasses")
OUT = os.path.join(ROOT, "assets", "sprites", "gear")
ADD = os.path.join(ROOT, "assets", "source", "gear_additions")

FW, FH = 128, 192           # frame size
COLS = 10                   # atlas columns
HX, HY, HW, HH = 40, 0, 48, 56   # helm cell: the part of the frame a helm (and its crown zone) can cover
ALPHA_CUT = 150             # body alpha is ~250, the haze below ~120
RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
# per class: protect bare skin on the body (default: decided by colour), helms whose opening detection
# should be forced open / closed (1-based ids)
OVERRIDES = {
    "slime_lord": {"body_skin": True},
    "barbarian": {"skin_tol": 17},
}

YY, XX = np.mgrid[0:FH, 0:FW]
FACE = ((XX - 67) / 7.0) ** 2 + ((YY - 35) / 8.0) ** 2 <= 1      # core of the face in every armor
HEAD = ((XX - 65) / 15.0) ** 2 + ((YY - 36) / 14.0) ** 2 <= 1    # the whole head
CHEEK = ((XX - 72) / 4.0) ** 2 + ((YY - 37) / 4.0) ** 2 <= 1      # bare skin in nearly every armor
HAIR_ZONE = (YY < 84) & (XX > 36) & (XX < 96)                     # where hair can hang (braids, manes)


def harden(a):
    a = a.copy()
    a[..., 3] = np.where(a[..., 3] >= ALPHA_CUT, 255, 0)
    a[a[..., 3] == 0, :3] = 0
    return a


def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def rgb2lab(a):
    c = a[..., :3] / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.9505, 1, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def kmeans(x, k, it=25, seed=1):
    rng = np.random.default_rng(seed)
    c = x[rng.choice(len(x), k, replace=False)]
    for _ in range(it):
        lab = ((x[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
        c = np.array([x[lab == j].mean(0) if (lab == j).any() else c[j] for j in range(k)])
    return c, np.bincount(lab, minlength=k)


def colours(armors, region, k):
    """Main colours of `region` over all armors (k-means in Lab), dropping rare clusters."""
    px = np.concatenate([rgb2lab(a.astype(float))[region & (a[..., 3] > 0)] for a in armors])
    c, n = kmeans(px, k)
    return c[n >= 0.05 * n.sum()]


def dist(lab, model):
    return np.min(np.linalg.norm(lab[..., None, :] - model[None, None], axis=-1), -1)


def protect_mask(a, head, skin, body_skin, tol=11):
    """Face, hair and bare skin: the head's colours inside the head, grown through matching neighbours
    (hair within reach of the head; skin, when it differs from the outfit, anywhere)."""
    al = a[..., 3] > 0
    lab = rgb2lab(a.astype(float))
    dh, ds = dist(lab, head), dist(lab, skin)
    m = al & HEAD & (dh < 20)
    grow = al & HAIR_ZONE & (dh < 11)
    if body_skin:
        seeds = al & (ds < tol * 0.55)
        lab_, n = ndimage.label(seeds)
        if n:
            sizes = ndimage.sum(seeds, lab_, range(1, n + 1))
            m |= np.isin(lab_, 1 + np.nonzero(sizes >= 10)[0])
        grow |= al & (ds < tol)
    for _ in range(60):
        nm = m | (ndimage.binary_dilation(m) & grow)
        if (nm == m).all():
            break
        m = nm
    return ndimage.binary_closing(m, iterations=1) & al


def helm_masks(h, force=None):
    """(opening, crown): the face opening of a helm frame and the zone where only the helm may show."""
    al = h[..., 3] > 0
    L = lum(h.astype(float))
    T = 52
    dark = ndimage.binary_opening(al & (L < T), structure=np.ones((2, 2)))
    lab, n = ndimage.label(dark)
    op = np.zeros_like(al)
    for j in range(1, n + 1):
        m = lab == j
        s = int(m.sum())
        if s < 16:
            continue
        ys, xs = np.nonzero(m)
        hgt, wid = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
        if xs.mean() < 58 or ys.mean() < 27:       # the open side faces screen right, below the brow
            continue
        if hgt < 5 or wid < 4 or (wid > 2.6 * hgt and hgt < 9):   # visor slit or grille gap
            continue
        if s < 0.45 * hgt * wid:                    # ragged: gaps between bars
            continue
        op |= m
    holes = ndimage.binary_fill_holes(op) & ~op
    hl, hn = ndimage.label(holes)
    for j in range(1, hn + 1):
        if (hl == j).sum() <= 8:                    # specks inside the opening, not bars
            op |= hl == j
    op |= ndimage.binary_dilation(op) & al & (L < T + 12)
    if force is False:
        op[:] = False
    # crown zone: above the shell column by column, and beside its upper half
    ys, xs = np.nonzero(al)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    cz = np.zeros_like(al)
    cz[max(0, y0 - 12):y0 + (y1 - y0) // 2, max(0, x0 - 5):x1 + 6] = True
    for x in range(x0, x1 + 1):
        c = np.nonzero(al[:, x])[0]
        if len(c):
            cz[:c[0], x] = True
    cz[:, :max(0, x0 - 5)] = False
    cz[:, x1 + 6:] = False
    return op, cz & ~al


def bbox(m):
    ys, xs = np.nonzero(m)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def read_zip(path, cid):
    z = zipfile.ZipFile(path)
    frames = {"armor": {}, "helms": {}}
    rar = {"armor": {}, "helms": {}}
    for name in z.namelist():
        m = re.match(r"^(?:[^/]+/)?(armor|helms)/[a-z_]+_(armor|helms)_(\d+)_([a-z]+)\.png$", name)
        if m:
            i = int(m.group(3))
            img = Image.open(io.BytesIO(z.read(name))).convert("RGBA")
            if img.size != (FW, FH):
                raise ValueError("%s: %s is %dx%d, expected %dx%d" % (cid, name, img.width, img.height, FW, FH))
            frames[m.group(1)][i] = harden(np.asarray(img).astype(np.int32))
            rar[m.group(1)][i] = m.group(4)
    return frames, rar


def read_additions(cid, frames, rar):
    """Armors added later from ChatGPT sheets (tools/chatgpt_art.py armor): assets/source/gear_additions/<class>/
    <class>_armor_NNN_<rarity>.png, numbered on from the zip's 80. Returns their ids."""
    d = os.path.join(ADD, cid)
    ids = []
    for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        m = re.match(r"^[a-z_]+_armor_(\d+)_([a-z]+)\.png$", name)
        if m:
            i = int(m.group(1))
            img = Image.open(os.path.join(d, name)).convert("RGBA")
            if img.size != (FW, FH):
                raise ValueError("%s: %s is %dx%d, expected %dx%d" % (cid, name, img.width, img.height, FW, FH))
            frames["armor"][i] = harden(np.asarray(img).astype(np.int32))
            rar["armor"][i] = m.group(2)
            ids.append(i)
    return ids


def atlas(frames, cw, ch, mode="RGBA"):
    n = len(frames)
    rows = (n + COLS - 1) // COLS
    im = Image.new(mode, (COLS * cw, rows * ch), 0)
    for i, f in enumerate(frames):
        im.paste(Image.fromarray(f.astype(np.uint8), mode), ((i % COLS) * cw, (i // COLS) * ch))
    return im


def bands(rmap):
    """{rarity: [first id, last id]} from {id: rarity}."""
    out = {}
    for i, r in sorted(rmap.items()):
        if r not in out:
            out[r] = [i, i]
        out[r][1] = max(out[r][1], i)
    return out


def process_class(cid, zpath):
    ov = OVERRIDES.get(cid, {})
    frames, rar = read_zip(zpath, cid)
    added = read_additions(cid, frames, rar)
    # the zip's rarity bands stay contiguous ranges; added armors are listed per rarity on their own
    extra = {}
    for i in added:
        extra.setdefault(rar["armor"].pop(i), []).append(i)
    na, nh = len(frames["armor"]), len(frames["helms"])
    ids_a, ids_h = sorted(frames["armor"]), sorted(frames["helms"])
    if ids_a != list(range(1, na + 1)) or ids_h != list(range(1, nh + 1)):
        raise ValueError("%s: armor/helm ids are not 1..N" % cid)
    armors = [frames["armor"][i] for i in ids_a]
    helms = [frames["helms"][i] for i in ids_h]
    head = colours(armors[::3], FACE, 6)
    skin = colours(armors[::3], CHEEK, 3)
    # bare skin on the body is protected only when it's told apart from the outfit (not for dark skin on brown
    # leather): the share of body pixels that look like skin must be small
    body = [((a[..., 3] > 0) & (YY > 60)) for a in armors[::4]]
    frac = sum((b & (dist(rgb2lab(a.astype(float)), skin) < 8)).sum() for a, b in zip(armors[::4], body)) / sum(b.sum() for b in body)
    body_skin = ov.get("body_skin", 0.004 < frac < 0.12)
    amasks, abox = [], []
    prot_frac = []
    for a in armors:
        p = protect_mask(a, head, skin, body_skin, ov.get("skin_tol", 11))
        prot_frac.append(p.sum() / max(1, (a[..., 3] > 0).sum()))
        amasks.append(np.where(p, 255, 0))
        abox.append(bbox(a[..., 3] > 0))
    hcells, hmasks, hbox, nopen = [], [], [], 0
    for i, h in enumerate(helms, 1):
        force = True if i in ov.get("open", []) else False if i in ov.get("closed", []) else None
        op, cz = helm_masks(h, force)
        nopen += op.any()
        m = np.zeros(op.shape, np.int32)
        m[cz] = 128
        m[op] = 255
        if (h[..., 3] > 0)[:HY].any() or (h[..., 3] > 0)[HY + HH:].any() or (h[..., 3] > 0)[:, :HX].any() or (h[..., 3] > 0)[:, HX + HW:].any():
            raise ValueError("%s: helm %d reaches outside the helm cell" % (cid, i))
        hcells.append(h[HY:HY + HH, HX:HX + HW])
        hmasks.append(m[HY:HY + HH, HX:HX + HW])
        b = bbox(h[..., 3] > 0)
        hbox.append([b[0] - HX, b[1] - HY, b[2] - HX, b[3] - HY])
    outdir = os.path.join(OUT, cid)
    os.makedirs(outdir, exist_ok=True)
    atlas(armors, FW, FH).save(os.path.join(outdir, "armor.webp"), "WEBP", quality=90, alpha_quality=100, method=6)
    atlas(amasks, FW, FH, "L").save(os.path.join(outdir, "armor_mask.png"), optimize=True)
    # the per-class helms.webp / helms_mask.png atlases retired when the fitted common/rare helmet atlases took over;
    # their metadata stays in gear.json (rarity bands, boxes)
    meta = {
        "class": cid, "frame": [FW, FH], "cols": COLS, "anchor": [64, 40],
        "feet": int(np.median([b[3] for b in abox])), "headTop": int(np.median([b[1] for b in abox])),
        "helmCell": [HX, HY, HW, HH],
        "armor": {"n": na, "bands": bands(rar["armor"]), "extra": extra, "box": abox},
        "helms": {"n": nh, "bands": bands(rar["helms"]), "box": hbox},
    }
    with open(os.path.join(outdir, "gear.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    size = sum(os.path.getsize(os.path.join(outdir, x)) for x in os.listdir(outdir)) / 1024
    if added:
        print("  %-17s + %d added armors %s" % (cid, len(added), extra))
    print("  %-17s armor %d  helms %d (%d open)  skin-like body %.3f -> body skin %s  protected %.0f%%  %d KB" % (
        cid, na, nh, nopen, frac, "on" if body_skin else "off", 100 * float(np.mean(prot_frac)), size))


def process_gear_art(only=None):
    if not os.path.isdir(SRC):
        print("gear art: no %s" % SRC)
        return
    zips = sorted(f for f in os.listdir(SRC) if f.endswith(".zip"))
    print("gear art:")
    for f in zips:
        cid = f[:-4]
        if only and cid not in only:
            continue
        process_class(cid, os.path.join(SRC, f))
    os.makedirs(OUT, exist_ok=True)
    have = sorted(d for d in os.listdir(OUT) if os.path.exists(os.path.join(OUT, d, "gear.json")))
    with open(os.path.join(OUT, "classes.json"), "w") as f:
        json.dump(have, f)
    print("gear art: %d classes" % len(have))
