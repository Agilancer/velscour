#!/usr/bin/env python3
"""Pack the Sea of Sand reference frames into browser atlases.

Usage: python tools/seaofsandpack.py <Sea_of_Sand_Biome_Pack directory>
The input is the authored Velscour Overworld Biome Set; output is the runtime
asset folder and metadata used by the game. Pillow and numpy are required.

Floors and cliffs come from the pack's per-frame sprites. Scatter, trees,
monsters and bosses are cut straight from the pack's source_art sheets: the
pack's own sprites were sliced on an even grid that the generated sheets do not
follow, which clipped sprites and leaked neighbours' fragments into them.
"""
import json
import sys
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'tiles' / 'sea_of_sand'
PACK = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
if not PACK or not (PACK / 'manifest.json').is_file():
    raise SystemExit('Pass the Sea_of_Sand_Biome_Pack directory as the first argument.')
manifest = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))
OUT.mkdir(parents=True, exist_ok=True)

ALPHA_CUT = 96   # the sheets' haze sits below ~32 alpha; silhouettes are 200+
# sheet, columns, rows, gap tolerance (px of art a row/column gap may cross), and each frame's fit box by index
SHEETS = {
    'scatter': ('sea_of_sand_scatter_40.png', 8, 5, 3, lambda i: (148, 148)),
    'tree': ('sea_of_sand_trees_18.png', 3, 6, 8, lambda i: (84, 84) if i < 6 else (116, 116) if i < 12 else (164, 164)),
    'creature': ('sea_of_sand_monsters_60_plus_10.png', 10, 7, 3, lambda i: (84, 100) if i < 60 else (132, 164)),
}


# The generated creature sheet does not follow the roster order (it has four jackals, five scorpions, five birds and
# no djinn or worms), so each roster monster names the sheet sprite (reading order) that best depicts it.
CREATURE_ART = [
    0, 1, 2,        # jackals
    7, 4, 5,        # vipers: sand-burrowing serpent, copper snake, cobra
    8, 10, 9,       # scorpions (embertail is the red one)
    15, 14, 19,     # beetles: tombshell, turquoise-winged borer, horned ironback
    21, 20, 24,     # suncloud swarm, razorwing, pale salt moth
    26, 25, 27,     # vulture, roclet, kitehawk
    30, 31, 32,     # skeletons: sword, shield, spear
    33, 43, 42,     # mummy, wrapped amberbinder, orb-bearing lantern wight
    35, 37, 36,     # raiders: red veil, twin blades, sun lance
    40, 41, 58,     # wraiths; the dry-sea specter's sand veil is the dust devil
    44, 45, 46,     # golems: sunbaked, lapis core, salt-crystal pillar
    6, 18, 3,       # worms: horned coil, maw beetle, the fossil-boned beast
    49, 47, 12,     # djinn: floating idol, crystal spirit, ember-clawed scorpion
    34, 39, 38,     # cultists: jackal-headed priest, gem-robed caster, oracle in plate
    50, 51, 52,     # hyenas
    56, 54, 55,     # crabs: hermit shell, salt crab, copper crab
    23, 22, 28,     # moths: sun-eyed moth, turquoise-veil wings, night hawk
    53, 11, 29,     # statues: sphinxling, lionward, bronzebeak
    59, 57, 13,     # elementals: sirocco mound, salt spire, amber dust
    16,             # chainhook
    48, 17,         # shades
]
assert sorted(CREATURE_ART) == list(range(60))


def valley_cuts(profile, n, window=0.32):
    """n-1 cuts at the emptiest smoothed lines near the nominal even splits."""
    L = len(profile); k = max(3, L // (n * 12))
    sm = np.convolve(profile, np.ones(k) / k, mode='same')
    cuts = [0]
    for i in range(1, n):
        c, r = i * L / n, window * L / n
        lo, hi = int(max(cuts[-1] + 1, c - r)), int(min(L - 1, c + r))
        seg = sm[lo:hi + 1]; best = np.flatnonzero(seg <= seg.min() + 1e-9)
        cuts.append(lo + int(best[len(best) // 2]))
    return cuts + [L]


def gap_cuts(profile, n, tol, min_gap=3):
    """Cut through the n-1 widest (near-)empty runs between art; uneven rows of tall and short sprites need this."""
    L = len(profile); nz = np.flatnonzero(profile > 0)
    runs, start = [], None
    for i in range(nz[0], nz[-1] + 1):
        if profile[i] <= tol and start is None: start = i
        if profile[i] > tol and start is not None:
            if i - start >= min_gap: runs.append((i - start, (start + i) // 2))
            start = None
    if len(runs) < n - 1: return valley_cuts(profile, n)
    return [0] + sorted(m for _, m in sorted(runs, reverse=True)[:n - 1]) + [L]


def label(mask):
    H, W = mask.shape; lab = np.zeros((H, W), np.int32); n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for yy in (y - 1, y, y + 1):
                if yy < 0 or yy >= H: continue
                for xx in (x - 1, x, x + 1):
                    if 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; q.append((yy, xx))
    return lab, n


def cut_sheet(path, cols, rows, tol):
    """Sprites in reading order. Every connected piece goes whole to the cell holding its centre, so nothing is
    sliced and loose bits (swarms, orbiting gems, sand trails) stay with their owner."""
    im = Image.open(path).convert('RGBA')
    solid = np.asarray(im)[..., 3] >= ALPHA_CUT
    lab, n = label(solid)
    ys, xs = np.nonzero(lab); ids = lab[ys, xs]
    cnt = np.bincount(ids, minlength=n + 1)
    cy = np.bincount(ids, ys, n + 1) / np.maximum(cnt, 1)
    cx = np.bincount(ids, xs, n + 1) / np.maximum(cnt, 1)
    ycuts = gap_cuts(solid.sum(1), rows, tol)
    sprites = []
    for r in range(rows):
        in_row = [i for i in range(1, n + 1) if ycuts[r] <= cy[i] < ycuts[r + 1] and cnt[i] >= 6]
        xcuts = gap_cuts(np.isin(lab, in_row).sum(0), cols, tol)
        for c in range(cols):
            members = [i for i in in_row if xcuts[c] <= cx[i] < xcuts[c + 1]]
            if not members: raise SystemExit(f'{path.name}: empty cell row {r} col {c}')
            m = np.isin(lab, members); yy, xx = np.nonzero(m)
            box = (xx.min(), yy.min(), xx.max() + 1, yy.max() + 1)
            rgba = np.array(im.crop(box)); own = m[box[1]:box[3], box[0]:box[2]]
            rgba[..., 3] = np.where(own, 255, 0); rgba[~own, :3] = 0
            sprites.append(Image.fromarray(rgba, 'RGBA'))
    return sprites


def fit(src, box):
    """Area-average downscale into the frame box, then binary alpha for crisp edges on any floor."""
    s = min(1, box[0] / src.width, box[1] / src.height)
    if s < 1: src = src.resize((max(1, round(src.width * s)), max(1, round(src.height * s))), Image.Resampling.BOX)
    a = np.array(src); keep = a[..., 3] >= 128
    a[..., 3] = np.where(keep, 255, 0); a[~keep, :3] = 0
    out = Image.fromarray(a, 'RGBA')
    return out.crop(out.getbbox())


def sheet_frames():
    cut = {}
    for kind, (file, cols, rows, tol, size) in SHEETS.items():
        cut[kind] = [fit(s, size(i)) for i, s in enumerate(cut_sheet(PACK / 'source_art' / file, cols, rows, tol))]
    creatures = cut.pop('creature')
    cut['monster'], cut['boss'] = [creatures[i] for i in CREATURE_ART], creatures[60:]
    return cut


def atlas(category, recut, width=2048, gap=2):
    frames = [a for a in manifest['assets'] if a['category'] == category]
    if not frames:
        return []
    if category in recut and len(recut[category]) != len(frames):
        raise SystemExit(f'{category}: {len(recut[category])} cut sprites for {len(frames)} manifest entries')
    placed, x, y, row_h = [], gap, gap, 0
    for i, entry in enumerate(frames):
        if category in recut:
            src = recut[category][i]
        else:
            src = Image.open(PACK / entry['file']).convert('RGBA')
            if category != 'floor':
                bounds = src.getchannel('A').getbbox()
                if bounds: src = src.crop(bounds)
        # Floors keep the authored pivot; cropped world art stands on its bottom centre.
        pivot = entry.get('pivot_px', [src.width // 2, src.height]) if category == 'floor' else [src.width / 2, src.height]
        w, h = src.size
        if x + w + gap > width:
            x, y, row_h = gap, y + row_h + gap, 0
        placed.append((entry, src, x, y, pivot))
        x += w + gap
        row_h = max(row_h, h)
    height = y + row_h + gap
    sheet = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    records = []
    for entry, src, px, py, pivot in placed:
        sheet.alpha_composite(src, (px, py))
        record = {k: entry[k] for k in ('id', 'name', 'category') if k in entry}
        record.update(x=px, y=py, w=src.width, h=src.height, pivot=pivot)
        for key in ('material', 'connection_mask', 'height_px', 'topology', 'orientation', 'state'):
            if key in entry:
                record[key] = entry[key]
        records.append(record)
    sheet.save(OUT / f'{category}.webp', 'WEBP', lossless=True, method=6)
    return records


recut = sheet_frames()
meta = {'version': 2, 'biome': 'sea_of_sand', 'atlases': {}}
for cat in ('floor', 'scatter', 'tree', 'monster', 'boss', 'cliff'):
    meta['atlases'][cat] = atlas(cat, recut, 2560 if cat == 'cliff' else 2048)
(OUT / 'pack.json').write_text(json.dumps(meta, separators=(',', ':')), encoding='utf-8')
print('Sea of Sand atlases:', ', '.join(f'{k}={len(v)}' for k, v in meta['atlases'].items()))
