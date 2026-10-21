"""Grim Nocturne hero gear: 18 body armors and 15 enclosed helmets (three sets) per class.

  python tools/nocturnegear.py import <extracted-zips-dir>   # user zips -> assets/source/gear_nocturne/ (native PNGs)
  python tools/nocturnegear.py import2 <extracted-zips-dir>  # collection 02 armors + helmet sets 02/03 (below)
  python tools/nocturnegear.py hires <zip> <zip> <zip>         # helmets' high-res artwork (the three *_Artwork zips) -> hd/
  python tools/nocturnegear.py build                          # assets/source/gear_nocturne/ -> assets/sprites/gear/

`import` expects the user's zips unpacked side by side in <dir>:
  gn_art/      Grim_Nocturne_All_16_Classes_Artwork.zip       (96 armors, high-res)
  gn_exports/  Grim_Nocturne_All_16_Classes_Game_Exports.zip   (their natives: only where each head sits)
  armor96/     VELSCOUR_96_Additional_Armor_Source_Artwork.zip (96 more armors, high-res source only)
  helm_exports/ VELSCOUR_80_Helmets_Game_Exports.zip           (80 helmets, 40x40 pinned at (45,63))
`import2` finds these anywhere under <dir> (each zip unpacked as is):
  collection_02/  VELSCOUR_Collection_02_96_Armor_Source_Artwork.zip (rare a/b, epic, legendary, mythic a/b: armors 13-18)
  Helmet_Set_02/, Helmet_Set_03/  VELSCOUR_Helmet_Set_0N_Game_Exports.zip (common..epic + mythic, pinned at (45,63))
All armor sets are area-downsampled exactly like the Game Exports (crown y75, sole y183, 108 art px) and
centred on the class's head so the helmets fit every set. `build` writes per class armor.webp (6 columns of 128x192),
armor_mask.png (face, hair and bare skin: never recoloured) and gear.json, plus the shared helmets/ atlas, built from
the HD cells in <class>/hd/ (`hires`): VELSCOUR_All_16_Classes_80_Enclosed_Helmets.zip, VELSCOUR_Helmet_Set_0N_All_80_Artwork.zip.
Placements made in tools/helmet-fitter are kept (assets/sprites/gear/helmets/placements.json).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source/gear_nocturne'
OUT = ROOT / 'assets/sprites/gear'
CLASSES = ['arcane_sorcerer', 'barbarian', 'bard', 'boomerang_knight', 'carrion_witch', 'death_knight', 'dragon_knight',
           'dragoon', 'gunner', 'lancer', 'necromancer', 'paladin', 'ranger', 'slime_lord', 'totem_master', 'wizard']
RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
HELM_RARITIES = RARITIES[:5]
SET_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'mythic']  # helmet sets 02 and 03: Mythic takes Legendary's slot
HELM_SETS = [('', HELM_RARITIES), ('set02_', SET_RARITIES), ('set03_', SET_RARITIES)]
C02 = [('rare_a', 'rare_c02a'), ('rare_b', 'rare_c02b'), ('epic', 'epic_c02'), ('legendary', 'legendary_c02'),
       ('mythic_a', 'mythic_c02a'), ('mythic_b', 'mythic_c02b')]  # armors 13..18
FW, FH, CROWN, SOLE, PIN, CELL = 128, 192, 75, 183, (45, 63), 40
HD = 4  # helmet atlas cells are HD x the 40x40 native cell; the game scales them down (crisper when zoomed in)
PIX, COLORS = 2, 32  # the helmets' pixel art: 2 art px per hero px, 32 colours each
BARE_SKIN = {'barbarian'}  # classes whose outfits show arms/chest: skin is masked over the whole body
# the exported helmets are wider than the heads: (width, height) scale per class, height kept at the neck
HELM_SCALE = {c: (.84, .92) for c in CLASSES} | {c: (.8, .92) for c in ('paladin', 'necromancer', 'barbarian', 'death_knight')}


def rgba(path):
    return np.array(Image.open(path).convert('RGBA'))


def head_cx(a):
    m = a[..., 3] > 0
    top = np.nonzero(m.any(1))[0][0]
    return np.nonzero(m[top:top + 10])[1].mean()


def resample(a, k):
    """Premultiplied box-filter resample of float RGBA by k: (rgb, alpha)."""
    p = a.copy()
    p[..., :3] *= p[..., 3:4]
    h, w = a.shape[:2]
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    s = np.stack([np.array(Image.fromarray(p[..., i]).resize((nw, nh), Image.BOX)) for i in range(4)], -1)
    return s[..., :3] / np.maximum(s[..., 3:4], 1e-4), s[..., 3]


def place(rgb, A, ox, oy):
    out = np.zeros((FH, FW, 4), np.uint8)
    yy, xx = np.nonzero(A > 0.5)
    ty, tx = yy + oy, xx + ox
    ok = (ty >= 0) & (ty < FH) & (tx >= 0) & (tx < FW)
    out[ty[ok], tx[ok], :3] = np.clip(rgb[yy[ok], xx[ok]] * 255 + .5, 0, 255)
    out[ty[ok], tx[ok], 3] = 255
    return out


def native(path, cx=None, ref=None):
    """High-res cutout -> 128x192 native: premultiplied box filter, binary alpha, crown at y75 and sole at y183.
    With `ref` (a native frame of the same hero) the sole stays at y183 and the scale and x offset are the ones
    that make the head agree with ref's: wings, pauldrons and spikes can rise above the crown."""
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32) / 255
    ys = np.nonzero((a[..., 3] > 0.5).any(1))[0]
    y0, y1 = ys[0], ys[-1] + 1
    k0 = (SOLE + 1 - CROWN) / (y1 - y0)
    if ref is None:
        rgb, A = resample(a, k0)
        m = A > 0.5
        top = np.nonzero(m.any(1))[0][0]
        return place(rgb, A, round(cx - np.nonzero(m[top:top + 10])[1].mean()), CROWN - top)
    rcx = int(round(head_cx(ref)))
    H, W = 20, 18
    rh = ref[CROWN:CROWN + H, rcx - 9:rcx + 9].astype(np.float32)
    ron = rh[..., 3] > 0
    best = None
    for k in k0 * np.linspace(0.9, 1.2, 31):
        rgb, A = resample(a, k)
        m = A > 0.5
        col = np.where(m[..., None], np.clip(rgb * 255, 0, 255), 0).astype(np.float32)
        top, sole = np.nonzero(m.any(1))[0][[0, -1]]
        bx = np.nonzero(m[top:top + 40].any(0))[0]
        P = 40  # pad so every window is in range
        mp = np.pad(m, P)
        cp = np.pad(col, ((P, P), (P, P), (0, 0)))
        for oy in [SOLE - sole]:  # feet stay planted; the scale brings the head to the reference
            for ox in range(rcx - bx.max() - 1, rcx - bx.min() + 1):
                y0, x0 = CROWN - oy + P, rcx - 9 - ox + P
                if y0 < 0 or x0 < 0 or y0 + H > mp.shape[0] or x0 + W > mp.shape[1]:
                    continue
                con = mp[y0:y0 + H, x0:x0 + W]
                both = con & ron
                if both.sum() < 60:
                    continue
                diff = np.abs(cp[y0:y0 + H, x0:x0 + W] - rh[..., :3]).sum(-1)[both].mean()
                score = diff + 180 * (con != ron).mean()
                if best is None or score < best[0]:
                    best = (score, k, ox, oy)
    _, k, ox, oy = best
    rgb, A = resample(a, k)
    return place(rgb, A, ox, oy)


def do_import(src):
    src = Path(src)
    for c in CLASSES:
        d = SRC / c
        d.mkdir(parents=True, exist_ok=True)
        for k, r in enumerate(RARITIES):
            # the exports' pasted head patch has stray blocks: re-cut from the artwork. The common armor is centred
            # where its export was; every other armor's head is matched to the common one's.
            art = src / f'gn_art/{c}/{c}_{r}.png'
            if k == 0:
                ref = gn = native(art, head_cx(rgba(src / f'gn_exports/alternatives/{c}/native_rgba/{c}_{r}.png')))
            else:
                gn = native(art, ref=ref)
            Image.fromarray(gn).save(d / f'armor_{2 * k + 1:02d}_{r}.png')
            alt = native(src / f'armor96/artwork/{c}/{c}_additional_{r}.png', ref=ref)
            Image.fromarray(alt).save(d / f'armor_{2 * k + 2:02d}_{r}_additional.png')
        for r in HELM_RARITIES:
            hd = src / f'helm_exports/classes/{c}'
            p = hd / f'layers_fullcolor/{c}_helmet_{r}.png'
            if not p.exists():
                p = hd / f'layers_128x192/{c}_helmet_{r}.png'
            Image.fromarray(helmet_cell(p)).save(d / f'helmet_{r}.png')
        print('imported', c)


def find_dir(root, name):
    hits = sorted(p for p in Path(root).rglob(name) if p.is_dir())
    if not hits:
        sys.exit(f'{name}/ not found under {root}')
    return hits[0]


def helmet_cell(path):
    h = rgba(path)[PIN[1]:PIN[1] + CELL, PIN[0]:PIN[0] + CELL]
    h[..., 3] = np.where(h[..., 3] > 127, 255, 0)
    return h


def do_import2(src):
    c02 = find_dir(src, 'collection_02') / 'artwork'
    sets = {k: find_dir(src, f'Helmet_Set_{k[3:5]}') / 'classes' for k, _ in HELM_SETS[1:]}
    for c in CLASSES:
        d = SRC / c
        ref = rgba(d / 'armor_01_common.png')  # the new armors' heads are matched to the common armor's
        for k, (slot, name) in enumerate(C02):
            Image.fromarray(native(c02 / c / f'{c}_{slot}.png', ref=ref)).save(d / f'armor_{13 + k:02d}_{name}.png')
        for key, rars in HELM_SETS[1:]:
            for r in rars:
                hd = sets[key] / c
                p = hd / f'layers_fullcolor/{c}_helmet_{key}{r}.png'
                if not p.exists():
                    p = hd / f'layers_128x192/{c}_helmet_{key}{r}.png'
                Image.fromarray(helmet_cell(p)).save(d / f'helmet_{key}{r}.png')
        print('imported', c)


def do_hires(zips):
    """The helmets' high-res artwork -> gear_nocturne/<class>/hd/helmet_<key>.png: HD x the 40x40 cell. Each native is
    the artwork squeezed into its box; that box is narrowed by HELM_SCALE (about the head's centre column and the
    helmet's bottom edge), the artwork resampled into it at PIX x (premultiplied Lanczos), made pixel art (binary
    alpha, COLORS colours, no dither) and enlarged to HD x nearest-neighbour."""
    import io, re, zipfile
    found = {}
    for z in zips:
        zf = zipfile.ZipFile(z)
        for n in zf.namelist():
            m = re.search(r'classes/([a-z_]+)/sources/\1_helmet_((?:set0\d_)?[a-z]+)\.png$', n)
            if m:
                found[m.groups()] = (zf, n)
    for c in CLASSES:
        d = SRC / c
        (d / 'hd').mkdir(exist_ok=True)
        kx, ky = HELM_SCALE[c]
        ax = int(round(head_cx(rgba(d / 'armor_01_common.png')))) - PIN[0]  # as build's cx
        for key, rars in HELM_SETS:
            for r in rars:
                zf, n = found[(c, key + r)]
                a = np.array(Image.open(io.BytesIO(zf.read(n))).convert('RGBA')).astype(np.float32) / 255
                ys, xs = np.nonzero(a[..., 3] > 0.5)
                a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                ys, xs = np.nonzero(rgba(d / f'helmet_{key}{r}.png')[..., 3])
                by = ys.max() + 1
                x0, x1 = (ax + (xs.min() - ax) * kx) * PIX, (ax + (xs.max() + 1 - ax) * kx) * PIX
                y0 = (by + (ys.min() - by) * ky) * PIX
                x0, y0, w, h = round(x0), round(y0), round(x1 - x0), by * PIX - round(y0)
                a[..., :3] *= a[..., 3:4]
                s = np.clip(np.stack([np.array(Image.fromarray(a[..., i]).resize((w, h), Image.LANCZOS)) for i in range(4)], -1), 0, 1)
                on = s[..., 3] > 0.5
                rgb = np.clip(s[..., :3] / np.maximum(s[..., 3:4], 1e-4) * 255 + .5, 0, 255).astype(np.uint8)
                q = np.array(Image.fromarray(rgb).quantize(COLORS, Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
                out = np.zeros((CELL * PIX, CELL * PIX, 4), np.uint8)
                out[y0:y0 + h, x0:x0 + w, :3] = np.where(on[..., None], q, 0)
                out[y0:y0 + h, x0:x0 + w, 3] = on * 255
                big = Image.fromarray(out).resize((CELL * HD, CELL * HD), Image.NEAREST)
                big.save(d / 'hd' / f'helmet_{key}{r}.png', optimize=True)
        print('hires', c)


def skin_mask(frame, bare, skinned, cx, top):
    """Face, hair and neck, never recoloured: around the head, skin-coloured pixels and the colours of the crown's
    top rows (hair), joined to the crown. Bare-skin classes also keep the body's skin."""
    rgb, on = frame[..., :3].astype(np.int32), frame[..., 3] > 0
    hair = np.unique(rgb[top:top + 4, cx - 8:cx + 8][on[top:top + 4, cx - 8:cx + 8]], axis=0)
    head, back = np.zeros(on.shape, bool), np.zeros(on.shape, bool)
    head[top:top + 20, cx - 12:cx + 12] = True
    back[top + 4:top + 32, cx - 22:cx + 10] = True    # hair down the back and over the shoulders
    d = near(rgb, hair)
    cand = on & ((head & ((warm_skin(rgb, .4) & skinned) | (d < 18 ** 2))) | (back & (d < 10 ** 2)))
    cand[top:top + 14, cx - 9:cx + 9] |= on[top:top + 14, cx - 9:cx + 9]  # the face itself
    lab, n = ndimage.label(cand)
    m = np.isin(lab, [i for i in np.unique(lab[top:top + 6, cx - 9:cx + 9]) if i])
    if not skinned:  # the Slime Lord: his slime hands keep the head's blue
        goo = np.unique(rgb[m], axis=0)
        goo = goo[rgb_hsv(goo[None])[0][:, 0] > 190]
        if len(goo):
            m |= on & (near(rgb, goo) < 12 ** 2) & (rgb_hsv(rgb)[..., 1] > .45)
    if bare:
        skin = on & warm_skin(rgb, .55, .3, .62)
        lab, n = ndimage.label(skin)
        sizes = ndimage.sum(skin, lab, range(1, n + 1))
        m |= np.isin(lab, 1 + np.nonzero(sizes >= 8)[0])
    return m


def near(rgb, cols):
    flat = rgb.reshape(-1, 3)
    best = np.full(len(flat), 1 << 30)
    for c in cols:
        best = np.minimum(best, ((flat - c) ** 2).sum(1))
    return best.reshape(rgb.shape[:2])


def rgb_hsv(c):
    c = c.astype(np.float32) / 255
    mx, mn = c.max(-1), c.min(-1)
    d = mx - mn
    h = np.zeros(mx.shape, np.float32)
    nz = d > 1e-6
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h = np.where(nz & (mx == r), ((g - b) / np.maximum(d, 1e-6)) % 6, h)
    h = np.where(nz & (mx == g) & (mx != r), (b - r) / np.maximum(d, 1e-6) + 2, h)
    h = np.where(nz & (mx == b) & (mx != r) & (mx != g), (r - g) / np.maximum(d, 1e-6) + 4, h)
    return np.stack([h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx], -1)


def warm_skin(rgb, v=.45, s0=.25, s1=.65):
    h = rgb_hsv(rgb)
    return (h[..., 0] >= 8) & (h[..., 0] <= 34) & (h[..., 1] > s0) & (h[..., 1] < s1) & (h[..., 2] > v)


def head_offset(f, ref):
    """Where frame f's head is relative to ref's (the class's common armor), by matching the head's pixels."""
    rcx = int(round(head_cx(ref)))
    rh = ref[CROWN:CROWN + 20, rcx - 9:rcx + 9].astype(np.float32)
    ron = rh[..., 3] > 0
    best = (1e9, 0, 0)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            c = f[CROWN + dy:CROWN + dy + 20, rcx - 9 + dx:rcx + 9 + dx].astype(np.float32)
            con = c[..., 3] > 0
            both = con & ron
            if both.sum() < 60:
                continue
            score = np.abs(c[..., :3] - rh[..., :3]).sum(-1)[both].mean() + 180 * (con != ron).mean() + 2 * (abs(dx) + abs(dy))
            best = min(best, (score, dx, dy))
    return [best[1], best[2]]


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    helms = [(key, r) for key, rars in HELM_SETS for r in rars]
    C = CELL * HD
    helm_atlas = np.zeros((C * len(helms), C * len(CLASSES), 4), np.uint8)
    for ci, c in enumerate(CLASSES):
        d = SRC / c
        files = sorted(d.glob('armor_[0-9][0-9]_*.png'))
        assert [int(f.name[6:8]) for f in files] == list(range(1, len(files) + 1)), c + ': armor numbers have gaps'
        frames = [rgba(f) for f in files]
        heads, cx = [head_offset(f, frames[0]) for f in frames], int(round(head_cx(frames[0])))
        masks = [skin_mask(f, c in BARE_SKIN, c != 'slime_lord', cx + dx, CROWN + dy) for f, (dx, dy) in zip(frames, heads)]
        cols = 6
        rows = -(-len(frames) // cols)
        atlas = np.zeros((FH * rows, FW * cols, 4), np.uint8)
        mask = np.zeros((FH * rows, FW * cols), np.uint8)
        boxes = []
        for i, (f, m) in enumerate(zip(frames, masks)):
            x, y = (i % cols) * FW, (i // cols) * FH
            atlas[y:y + FH, x:x + FW] = f
            mask[y:y + FH, x:x + FW] = m * 255
            ys, xs = np.nonzero(f[..., 3])
            boxes.append([int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1])
        od = OUT / c
        od.mkdir(exist_ok=True)
        for old in ('helms.webp', 'helms_mask.png'):
            (od / old).unlink(missing_ok=True)
        Image.fromarray(atlas).save(od / 'armor.webp', lossless=True, quality=100, method=6)
        Image.fromarray(mask).save(od / 'armor_mask.png', optimize=True)
        meta = {
            'class': c, 'style': 'grim_nocturne', 'frame': [FW, FH], 'cols': cols, 'anchor': [64, CROWN], 'feet': SOLE,
            'headTop': CROWN, 'helmPin': list(PIN),
            # bands: the armor ids (1-based) each rarity rolls from
            'armor': {'n': len(files), 'bands': {r: [i + 1 for i, f in enumerate(files) if f.stem.split('_')[2] == r]
                                                 for r in RARITIES},
                      'names': [f.stem for f in files], 'box': boxes,
                      'head': heads},  # [dx, dy] of each armor's head from armor 1's: the helmet follows it
        }
        (od / 'gear.json').write_text(json.dumps(meta, separators=(',', ':')))
        for k, (key, r) in enumerate(helms):
            helm_atlas[k * C:(k + 1) * C, ci * C:(ci + 1) * C] = rgba(d / 'hd' / f'helmet_{key}{r}.png')
        print('built', c, int(mask.astype(bool).sum()), 'masked px')
    hd = OUT / 'helmets'
    hd.mkdir(exist_ok=True)
    (hd / 'atlas.png').unlink(missing_ok=True)
    Image.fromarray(helm_atlas).save(hd / 'atlas.webp', lossless=True, quality=100, method=6)
    index = {
        'frame': [C, C], 'cols': len(CLASSES), 'classes': CLASSES,
        'designs': [{'id': k + 1, 'rarity': RARITIES.index(r), 'set': int(key[3:5] or 1), 'name': r.title() + ' Helm',
                     'catalog': r.title() + (' ' + key[3:5] if key else '')} for k, (key, r) in enumerate(helms)],
        # the cell (40x40 hero px at 1/HD) has its top left on the hero frame at (45,63) (crown y75); nudges: placements.json
        'fit': {'scaleX': 1 / HD, 'scaleY': 1 / HD, 'xAnchor': PIN[0] + CELL / 2, 'baselineOffset': PIN[1] - CROWN, 'sourceBaseline': 0},
    }
    (hd / 'index.json').write_text(json.dumps(index, indent=2))
    pl = hd / 'placements.json'
    if not pl.exists():
        pl.write_text(json.dumps({'version': 1, 'classes': {}}, indent=2))
    (OUT / 'classes.json').write_text(json.dumps(CLASSES))


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'import':
        do_import(sys.argv[2])
    elif len(sys.argv) > 2 and sys.argv[1] == 'import2':
        do_import2(sys.argv[2])
    elif len(sys.argv) > 2 and sys.argv[1] == 'hires':
        do_hires(sys.argv[2:])
    elif len(sys.argv) > 1 and sys.argv[1] == 'build':
        build()
    else:
        print(__doc__)
