#!/usr/bin/env python3
"""Pack THE DARK FOREST biome pack into browser atlases (docs/DARK_FOREST.md).

    python tools/darkforestpack.py <THE_DARK_FOREST_Biome_Pack.zip | extracted folder>

The pack follows the Catacombs 160 x 80 template, so its floors, five wall families, arches, doors and 40 props go
through the regular biome importer (tools/biomepack.py: walls raised by ZSCALE and cut into depth-sorted arms) into
assets/tiles/dark_forest/{floors,walls,scatter}.webp + pack.json. The 15 towering trees (384 x 896, pivot 192,842) are
the forest's own addition: each is cropped, halved (they draw at about a third of a native pixel per world pixel, so
full resolution would only cost memory) and packed into trees.webp + trees.json with its pivot and the row where
its canopy layer starts (the pack's trunk/canopy split), so the game can fade the canopy over the hero.
The pack itself (101 MB, over GitHub's file limit) stays outside the repo.
"""
import io
import json
import os
import sys
import tempfile
import zipfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import biomepack  # noqa: E402

OUT = os.path.join(biomepack.OUT, 'dark_forest')
TREE_SCALE = 0.5
# props that lie flat or low enough to walk over
biomepack.WALK_OVER |= {'bedroll', 'bridge_planks', 'reeds', 'wolf_bones', 'deer_skull', 'lost_shield', 'hunter_trap',
                        'fern_clump', 'firewood', 'pale_mushrooms', 'poison_mushrooms', 'buried_urn', 'twisted_roots'}


def as_zip(src):
    """biomepack reads zips; zip an extracted folder on the fly."""
    if os.path.isfile(src):
        return src, None
    tmp = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
    tmp.close()
    with zipfile.ZipFile(tmp.name, 'w', zipfile.ZIP_STORED) as z:
        for base, _, names in os.walk(src):
            for n in names:
                if n.endswith(('.png', '.json')) and 'qa' not in base and 'reference_sheets' not in base:
                    full = os.path.join(base, n)
                    z.write(full, os.path.relpath(full, os.path.dirname(src)))
    return tmp.name, tmp.name


def halve(arr):
    """Premultiplied Lanczos downscale, then a hard alpha edge so the silhouette stays crisp."""
    a = arr[..., 3:4].astype(np.float32) / 255
    pre = np.concatenate([arr[..., :3] * a, a * 255], axis=2).astype(np.float32)
    h, w = arr.shape[:2]
    nw, nh = int(round(w * TREE_SCALE)), int(round(h * TREE_SCALE))
    ch = [np.array(Image.fromarray(pre[..., i]).resize((nw, nh), Image.LANCZOS)) for i in range(4)]
    al = np.clip(ch[3], 0, 255)
    rgb = np.stack(ch[:3], axis=2) / np.maximum(al[..., None] / 255, 1e-3)
    out = np.zeros((nh, nw, 4), np.uint8)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = np.where(al > 110, 255, 0)
    return out


def trees(zpath):
    z = zipfile.ZipFile(zpath)
    root = next(n for n in z.namelist() if n.endswith('manifest.json')).rsplit('manifest.json', 1)[0]
    man = json.loads(z.read(root + 'manifest.json'))
    atlas, recs = biomepack.Atlas(2048), []
    for a in [a for a in man['assets'] if a['category'] == 'trees']:
        arr = np.array(Image.open(io.BytesIO(z.read(root + a['file']))).convert('RGBA'))
        small = halve(arr)
        img, x0, y0 = biomepack.crop(small)
        px, py = (v * TREE_SCALE for v in a['pivot_px'])
        split = a['occlusion_layers']['split_y_px'] * TREE_SCALE
        recs.append(({'name': a['name'], 'x': 0, 'y': 0, 'w': img.shape[1], 'h': img.shape[0],
                      'ox': int(round(x0 - px)), 'oy': int(round(y0 - py)), 'split': int(round(split - y0)),
                      'scale': TREE_SCALE}, atlas.add(img)))
    img, pos = atlas.pack()
    for rec, i in recs:
        rec['x'], rec['y'] = pos[i]
    img.save(os.path.join(OUT, 'trees.webp'), lossless=True, method=6)
    with open(os.path.join(OUT, 'trees.json'), 'w') as f:
        json.dump({'pack': man['pack'], 'trees': [r for r, _ in recs]}, f, separators=(',', ':'))
    print('dark_forest: %d trees, atlas %dx%d' % (len(recs), img.width, img.height))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    zpath, tmp = as_zip(sys.argv[1])
    try:
        biomepack.import_pack([zpath], 'dark_forest')
        trees(zpath)
    finally:
        if tmp:
            os.unlink(tmp)
