"""Cut the user's VELSCOUR castle artwork (assets/source/biomes/VELSCOUR_Castle_Artwork_Complete.zip) into the
textures the Castle overworld builds its height-mapped walls, towers, stairs and bridges from
(src/gfx/castlewalls.js, docs/CASTLE_OVERWORLD.md).

The painted pieces are isometric sprites at their own scale, so instead of placing them whole the faces are
*unsheared* (each column of a face slid up or down by half a pixel per pixel, so its brick courses run level),
cropped and made to tile, and the renderer shears them back onto every wall, tower, stair and bridge face it draws:

  face      tileable masonry for lit (SW) faces; the SE faces are the same stone, darkened at draw time
  warm      the same masonry recoloured to the keep's pale limestone (the halls)
  corbel    the machicolation band under the towers' battlements (tiles horizontally)
  plinth    the battered base course at the foot of a wall (tiles horizontally)
  slit      an arrow slit, with its stone surround faded into the wall
  arch      one bridge arch (pier, opening, pier), its opening filled with the shadow under the bridge
  top_0..7  flagstone tops: two painted slabs cut into quarters, drawn 2 x 2 tiles to a slab

Run:  python tools/castleramparts.py [zip]   ->  assets/tiles/castle/ramparts.webp + ramparts.json
"""
import io, json, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source/biomes/VELSCOUR_Castle_Artwork_Complete.zip'
OUT = ROOT / 'assets/tiles/castle'


def sheet(z, name):
    return np.array(Image.open(io.BytesIO(z.read(f'VELSCOUR_Castle_{name}.png'))).convert('RGBA')).astype(np.float32)


def unshear(im, x0, y0, w, h, slope):
    """Texture (u, v) = image(x0 + u, y0 + v + slope * u): a face sheared at `slope` px per px, made level."""
    o = np.zeros((h, w, 4), np.float32)
    for u in range(w):
        dy = slope * u
        for v in range(h):
            y = y0 + v + dy
            yi = int(np.floor(y)); t = y - yi
            if 0 <= yi < im.shape[0] - 1:
                o[v, u] = im[yi, x0 + u] * (1 - t) + im[yi + 1, x0 + u] * t
    return o


def wrap(a, axis, b):
    """Make `a` tile along `axis`: the last b px are cross-faded into the first b, then dropped."""
    a = np.moveaxis(a, axis, 0).copy()
    n = a.shape[0] - b
    for k in range(b):
        t = (k + 0.5) / b
        a[k] = a[n + k] * (1 - t) + a[k] * t
    return np.moveaxis(a[:n], 0, axis)


def level(a, mean):
    """Scale the rgb so the mean brightness is `mean` (0..255), keeping alpha."""
    o = a.copy()
    m = o[..., :3][o[..., 3] > 128].mean()
    o[..., :3] = np.clip(o[..., :3] * (mean / max(m, 1)), 0, 255)
    return o


def flatten_light(a, sigma=18):
    """Even out the light falling across a painted face (darker at one end, lighter at the other) so it tiles."""
    from scipy.ndimage import gaussian_filter
    o = a.copy()
    lum = o[..., :3].mean(2)
    low = gaussian_filter(lum, sigma, mode='wrap')
    o[..., :3] = np.clip(o[..., :3] * (lum.mean() / np.maximum(low, 1))[..., None], 0, 255)
    return o


def main():
    z = zipfile.ZipFile(sys.argv[1] if len(sys.argv) > 1 else SRC)
    walls, ramp, cren = sheet(z, 'Walls_and_Towers'), sheet(z, 'Walkable_Rampart_Tiles'), sheet(z, 'Crenellations_and_Scatter')
    parts = {}

    # masonry: the long straight curtain's face below its walkway ledge (an SE face, rising to the right)
    f = unshear(walls, 22, 60, 136, 190, -0.5)[98:158, 44:132]
    f = flatten_light(wrap(wrap(f, 1, 16), 0, 10))
    parts['face'] = level(f, 112)
    warm = parts['face'].copy()
    g = warm[..., :3].mean(2, keepdims=True)
    warm[..., :3] = np.clip(g * np.array([1.18, 1.06, 0.86]) + np.array([14, 10, 2]), 0, 255)
    parts['warm'] = level(warm, 150)

    # the tower's corbel band (a row of small arches under the parapet) and an arrow slit, from the big square tower's SW face
    t8 = unshear(walls, 1178, -60, 120, 300, 0.5)
    c = t8[149:166, 44:112]
    parts['corbel'] = level(flatten_light(wrap(c, 1, 8), 12), 104)
    s = t8[183:222, 28:47].copy()
    hh, ww = s.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww]
    edge = np.minimum.reduce([xx, ww - 1 - xx, yy, hh - 1 - yy]).astype(np.float32)
    s[..., 3] *= np.clip(edge / 4, 0, 1)
    parts['slit'] = level(s, 96)

    # the plinth: the wall's battered foot
    p = unshear(walls, 22, 60, 136, 190, -0.5)[156:170, 44:132]
    parts['plinth'] = level(wrap(p, 1, 16), 100)

    # a bridge arch: the free-standing arch piece's face (SE, rising right), opening filled with the vault's shadow
    a = unshear(cren, 378, 0, 81, 150, -0.5)[76:140, 3:78].copy()
    hh, ww = a.shape[:2]
    for y in range(hh):
        for x in range(ww):
            if a[y, x, 3] < 200:
                t = y / hh
                shade = np.array([14, 18, 24]) * (1 - t) + np.array([28, 44, 52]) * t
                a[y, x, :3] = (a[y, x, :3] * a[y, x, 3] + shade * (255 - a[y, x, 3])) / 255
                a[y, x, 3] = 255
    parts['arch'] = level(a, 92)

    # flagstone tops: the two plain slabs' top diamonds (inset just inside their bevelled rims), one slab to a tile, so
    # the joints between tiles fall on the slabs' own edges and every grout line runs on along the iso axes; each slab
    # also mirrored and turned half round (still a 2:1 diamond) for eight variants
    tops = []
    for (tx0, ty0, hw, hh) in [(102.5, 24, 78.5, 41), (284.5, 24, 78.5, 41)]:
        k = 0.84
        cx, cy, rw, rh = tx0, ty0 + hh + 1, hw * k, hh * k
        o = np.zeros((40, 80, 4), np.float32)
        for Y in range(40):
            for X in range(80):
                u = ((X + 0.5 - 40) / 40 + (Y + 0.5) / 20) / 2
                v = ((Y + 0.5) / 20 - (X + 0.5 - 40) / 40) / 2
                if u < -0.02 or v < -0.02 or u > 1.02 or v > 1.02:
                    continue
                U, V = min(1, max(0, u)), min(1, max(0, v))
                sx = cx + (U - V) * rw
                sy = cy - rh + (U + V) * rh
                xi, yi = int(sx), int(sy)
                fx, fy = sx - xi, sy - yi
                o[Y, X] = (ramp[yi, xi] * (1 - fx) + ramp[yi, xi + 1] * fx) * (1 - fy) + (ramp[yi + 1, xi] * (1 - fx) + ramp[yi + 1, xi + 1] * fx) * fy
                o[Y, X, 3] = 255
        tops += [o, o[:, ::-1], o[::-1, ::-1], o[::-1]]
    # the half-turned copies are a diamond only when flipped about its centre: rebuild the masks from the first
    mask = tops[0][..., 3] > 0
    for t in tops:
        t[..., 3] = np.where(mask, 255, 0)
    m = np.mean([t[..., :3][t[..., 3] > 0].mean() for t in tops])
    for k, t in enumerate(tops):
        parts[f'top_{k}'] = level(t, m * 1.05)

    # pack in rows
    order = list(parts)
    x = y = rowh = 0
    W = 512
    rects = {}
    for k in order:
        h, w = parts[k].shape[:2]
        if x + w > W:
            x, y, rowh = 0, y + rowh + 2, 0
        rects[k] = [x, y, w, h]
        x += w + 2
        rowh = max(rowh, h)
    atlas = np.zeros((y + rowh, W, 4), np.uint8)
    for k, (x, y, w, h) in rects.items():
        atlas[y:y + h, x:x + w] = np.clip(parts[k], 0, 255).astype(np.uint8)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas).save(OUT / 'ramparts.webp', lossless=True)
    (OUT / 'ramparts.json').write_text(json.dumps({'source': 'VELSCOUR_Castle_Artwork_Complete.zip', 'rects': rects}, indent=1))
    print('ramparts.webp', atlas.shape[1], 'x', atlas.shape[0], {k: v[2:] for k, v in rects.items()})


if __name__ == '__main__':
    main()
