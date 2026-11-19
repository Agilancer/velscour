"""Collection 05 helmets (assets/newhelms/): 48 per class for the Monk, the Rogue and the Ninja, one per armor.

  python tools/martialhelms.py            # assets/newhelms/fitted_layers -> assets/sprites/gear/helmets_martial/
  python tools/martialhelms.py --refit    # also redo the armor fits (slow; cached in gear_nocturne/<class>/armor_fits.json)

Every helmet was drawn on one of the class's armors (fitted_layers/<class>/<class>_helmet_<rarity>_NN_layer.png has the
frame of assets/martialarts/artwork/<class>/<class>_<rarity>_NN.png). tools/martialgear.py brought that armor down to
the 128x192 native frame with nocturnegear.native's scale and offset; the same map brings the helmet down (at PIX art px
per hero px, premultiplied Lanczos, binary alpha, COLORS colours), moved by the armor's head offset so that it sits on
armor 1's head as every helmet cell does (the game adds the worn armor's head offset back). Cells are HD x enlarged,
nearest-neighbour, like the other classes' helmets. Nudges made in tools/helmet-fitter go to placements.json (kept).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nocturnegear as ng  # noqa: E402
import martialgear as mg  # noqa: E402

ROOT = ng.ROOT
NEW = ROOT / 'assets/newhelms/fitted_layers'
OUT = ng.OUT / 'helmets_martial'
CLASSES = ['monk', 'ninja', 'rogue']
CELL, PIN = 40, (46, 68)  # 40x40 hero px from (46,68) holds every helmet (crown y75, head x70)
HD, PIX, COLORS = ng.HD, ng.PIX, ng.COLORS


def armor_fits(cls, refit):
    """{armor id: (k, ox, oy)} as tools/martialgear.py placed each armor, checked against the saved natives."""
    cache = ng.SRC / cls / 'armor_fits.json'
    if cache.exists() and not refit:
        return {int(i): tuple(v) for i, v in json.loads(cache.read_text()).items()}
    fits, ref = {}, None
    for i, r, n in mg.layout():
        art = mg.ART / cls / f'{cls}_{r}_{n:02d}.png'
        f, fit = ng.native(art, mg.HEAD_X, fit=True) if ref is None else ng.native(art, ref=ref, fit=True)
        ref = f if ref is None else ref
        saved = ng.rgba(ng.SRC / cls / f'armor_{i:02d}_{r}_c05_{n:02d}.png')
        bad = int((saved != f).any(-1).sum())
        if bad:
            print(f'  {cls} armor {i}: {bad} px differ from the saved native')
        fits[i] = (float(fit[0]), int(fit[1]), int(fit[2]))
        print(' ', cls, i, r, n, fits[i], flush=True)
    cache.write_text(json.dumps(fits))
    return fits


def helmet_cell(layer, art_size, fit, head):
    """A fitted layer -> the HD cell (CELL*HD square) on armor 1's head."""
    k, ox, oy = fit
    a = np.array(Image.open(layer).convert('RGBA')).astype(np.float32) / 255
    assert a.shape[1::-1] == art_size, (layer, a.shape, art_size)
    h, w = a.shape[:2]
    nw, nh = max(1, round(w * k)), max(1, round(h * k))  # the armor's resample grid (nocturnegear.resample)
    a[..., :3] *= a[..., 3:4]
    s = np.clip(np.stack([np.array(Image.fromarray(a[..., i]).resize((nw * PIX, nh * PIX), Image.LANCZOS)) for i in range(4)], -1), 0, 1)
    on = s[..., 3] > 0.5
    rgb = np.clip(s[..., :3] / np.maximum(s[..., 3:4], 1e-4) * 255 + .5, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(on)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    q = np.array(Image.fromarray(rgb[y0:y1, x0:x1]).quantize(COLORS, Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    # top left of the crop in the cell, at PIX: native (x*k + ox) - head - PIN
    cx, cy = x0 + (ox - head[0] - PIN[0]) * PIX, y0 + (oy - head[1] - PIN[1]) * PIX
    out = np.zeros((CELL * PIX, CELL * PIX, 4), np.uint8)
    if cx < 0 or cy < 0 or cx + q.shape[1] > CELL * PIX or cy + q.shape[0] > CELL * PIX:
        raise SystemExit(f'{layer.name}: outside the {CELL}px cell at ({cx / PIX:.1f},{cy / PIX:.1f}) {q.shape[1] / PIX}x{q.shape[0] / PIX}')
    m = on[y0:y1, x0:x1]
    out[cy:cy + q.shape[0], cx:cx + q.shape[1], :3] = np.where(m[..., None], q, 0)
    out[cy:cy + q.shape[0], cx:cx + q.shape[1], 3] = m * 255
    return np.array(Image.fromarray(out).resize((CELL * HD, CELL * HD), Image.NEAREST))


def build(refit=False):
    C = CELL * HD
    plan = [(r, n) for r in ng.RARITIES for n in range(1, 9)]  # design id = row: Common 01..08, Uncommon 01..08, ...
    armor_of = {(r, n): i for i, r, n in mg.layout()}
    atlas = np.zeros((C * len(plan), C * len(CLASSES), 4), np.uint8)
    for ci, cls in enumerate(CLASSES):
        fits = armor_fits(cls, refit)
        heads = json.loads((ng.OUT / cls / 'gear.json').read_text())['armor']['head']
        for row, (r, n) in enumerate(plan):
            i = armor_of[(r, n)]
            art = Image.open(mg.ART / cls / f'{cls}_{r}_{n:02d}.png').size
            cell = helmet_cell(NEW / cls / f'{cls}_helmet_{r}_{n:02d}_layer.png', art, fits[i], heads[i - 1])
            atlas[row * C:(row + 1) * C, ci * C:(ci + 1) * C] = cell
        print('helmets', cls)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas).save(OUT / 'atlas.webp', lossless=True, quality=100, method=6)
    index = {
        'frame': [C, C], 'cols': len(CLASSES), 'classes': CLASSES, 'exact': True,  # a helm rolls designs of its own rarity
        'designs': [{'id': k + 1, 'rarity': ng.RARITIES.index(r), 'set': 5, 'name': f'{r.title()} Helm {n:02d}',
                     'catalog': f'{r.title()} {n:02d}', 'armor': armor_of[(r, n)]} for k, (r, n) in enumerate(plan)],
        'fit': {'scaleX': 1 / HD, 'scaleY': 1 / HD, 'xAnchor': PIN[0] + CELL / 2, 'baselineOffset': PIN[1] - ng.CROWN, 'sourceBaseline': 0},
    }
    (OUT / 'index.json').write_text(json.dumps(index, indent=2))
    pl = OUT / 'placements.json'
    if not pl.exists():
        pl.write_text(json.dumps({'version': 1, 'classes': {}}, indent=2) + '\n')
    print('atlas', atlas.shape[1], 'x', atlas.shape[0])


if __name__ == '__main__':
    build('--refit' in sys.argv)
