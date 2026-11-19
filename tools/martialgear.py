"""Collection 05 (assets/martialarts/): the Monk's new sprite set and the Rogue's and the Ninja's, 48 armors a class.

  python tools/martialgear.py [monk,rogue,ninja]     # artwork -> assets/source/gear_nocturne/<class>/ -> assets/sprites/

Each class has eight designs of every rarity (artwork/<class>/<class>_<rarity>_NN.png, high-res cutouts with empty
hands). They are brought down to the Grim Nocturne frame exactly like the other classes' armors (tools/nocturnegear.py
`native`: crown y75, sole y183, every head matched to the first Common, the class's identity anchor), then packed as
armor.webp + armor_mask.png + gear.json. Armor ids 1..26 keep the rarity the 16 older classes' ids have (so a saved
Monk's looks stay in their rarity); 27..48 are the rest. Also written: the class-select portraits and the old
full-body class sprite (assets/sprites/select/, assets/sprites/classes/).

Their helmets (48 a class, one drawn on each armor) are built by tools/martialhelms.py into helmets_martial/.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nocturnegear as ng  # noqa: E402

ROOT = ng.ROOT
ART = ROOT / 'assets/martialarts/artwork'
CLASSES = ['monk', 'rogue', 'ninja']
HEAD_X = 70  # where the Barbarian's and the Paladin's heads are: the body sits over the feet
# ids 1..26 as every other class has them, then the 22 more that make eight of each rarity
OLD = {'common': [1, 2], 'uncommon': [3, 4], 'rare': [5, 6, 13, 14, 19, 20, 21], 'epic': [7, 8, 15, 22, 23, 24],
       'legendary': [9, 10, 16, 25], 'mythic': [11, 12, 17, 18, 26]}


def layout():
    """[(id, rarity, source number 1..8)] for the 48 armors."""
    out, nxt = [], 27
    for r in ng.RARITIES:
        ids = list(OLD[r])
        while len(ids) < 8:
            ids.append(nxt)
            nxt += 1
        out += [(i, r, k + 1) for k, i in enumerate(ids)]
    return sorted(out)


def eye_slit(frame, cx, top):
    """The Ninja: only the skin in the hood's eye slit is kept from the finishes."""
    rgb, on = frame[..., :3].astype(np.int32), frame[..., 3] > 0
    box = np.zeros(on.shape, bool)
    box[top + 3:top + 16, cx - 9:cx + 9] = True
    return ndimage.binary_dilation(on & box & ng.warm_skin(rgb, .3, .18, .7)) & on & box


def build(cls):
    src = ROOT / 'assets/source/gear_nocturne' / cls
    src.mkdir(parents=True, exist_ok=True)
    for old in src.glob('armor_*.png'):
        old.unlink()
    plan, ref, frames = layout(), None, {}
    for i, r, k in plan:  # id 1 is Common 01, the identity anchor
        art = ART / cls / f'{cls}_{r}_{k:02d}.png'
        f = ng.native(art, HEAD_X) if ref is None else ng.native(art, ref=ref)
        if ref is None:
            ref = f
        frames[i] = f
        Image.fromarray(f).save(src / f'armor_{i:02d}_{r}_c05_{k:02d}.png')
    files = sorted(src.glob('armor_[0-9][0-9]_*.png'))
    fr = [frames[i + 1] for i in range(len(files))]
    heads, cx = [ng.head_offset(f, fr[0]) for f in fr], int(round(ng.head_cx(fr[0])))
    if cls == 'ninja':
        masks = [eye_slit(f, cx + dx, ng.CROWN + dy) for f, (dx, dy) in zip(fr, heads)]
    else:
        masks = [ng.skin_mask(f, cls == 'monk', True, cx + dx, ng.CROWN + dy) for f, (dx, dy) in zip(fr, heads)]
    FW, FH, cols = ng.FW, ng.FH, 6
    rows = -(-len(fr) // cols)
    atlas = np.zeros((FH * rows, FW * cols, 4), np.uint8)
    mask = np.zeros((FH * rows, FW * cols), np.uint8)
    boxes = []
    for i, (f, m) in enumerate(zip(fr, masks)):
        x, y = (i % cols) * FW, (i // cols) * FH
        atlas[y:y + FH, x:x + FW] = f
        mask[y:y + FH, x:x + FW] = m * 255
        ys, xs = np.nonzero(f[..., 3])
        boxes.append([int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1])
    od = ng.OUT / cls
    od.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas).save(od / 'armor.webp', lossless=True, quality=100, method=6)
    Image.fromarray(mask).save(od / 'armor_mask.png', optimize=True)
    meta = {
        'class': cls, 'style': 'grim_nocturne', 'frame': [FW, FH], 'cols': cols, 'anchor': [64, ng.CROWN], 'feet': ng.SOLE,
        'headTop': ng.CROWN, 'helmPin': list(ng.PIN),
        'armor': {'n': len(files), 'bands': {r: [i + 1 for i, f in enumerate(files) if f.stem.split('_')[2] == r] for r in ng.RARITIES},
                  'names': [f.stem for f in files], 'box': boxes, 'head': heads},
    }
    (od / 'gear.json').write_text(json.dumps(meta, separators=(',', ':')))
    portraits(cls, fr[0])
    print('built', cls, len(files), 'armors,', int(mask.astype(bool).sum()), 'masked px, head at x', cx)


def set_json(path, cls, entry):
    p = ROOT / path
    d = json.loads(p.read_text())
    d[cls] = entry
    p.write_text(json.dumps(d, indent=1))


def portraits(cls, common):
    """The class-select portraits (the Common armor) and the old full-body class sprite."""
    ys, xs = np.nonzero(common[..., 3])
    crop = Image.fromarray(common[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    crop.save(ROOT / f'assets/sprites/select/nocturne/{cls}.webp', lossless=True, quality=100, method=6)
    set_json('assets/sprites/select/nocturne/portraits.json', cls, {'w': crop.width, 'h': crop.height})
    art = Image.open(ART / cls / f'{cls}_common_01.png').convert('RGBA')
    art = art.crop(art.getbbox())
    for folder, h, extra in (('classes', 260, {}), ('select', 270, {'cut': True})):
        im = art.resize((round(art.width * h / art.height), h), Image.LANCZOS)
        im.save(ROOT / f'assets/sprites/{folder}/{cls}.webp', quality=92, method=6)
        set_json(f'assets/sprites/{folder}/{folder}.json', cls, {'w': im.width, 'h': im.height, **extra})


if __name__ == '__main__':
    which = sys.argv[1].split(',') if len(sys.argv) > 1 else CLASSES
    for c in which:
        build(c)
    lst = ng.OUT / 'classes.json'
    have = set(json.loads(lst.read_text())) | set(which)
    lst.write_text(json.dumps(sorted(have)))
