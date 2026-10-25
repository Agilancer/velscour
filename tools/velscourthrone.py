"""Velscour's throne: the Castle pack's throne dais (furniture_01_throne_dais), recoloured to match him and scaled for
a 2 x 2 tile footprint in his throne room (world/dungeon.js generateThrone, gfx/velscourthrone.js).

  python tools/velscourthrone.py

Reads assets/tiles/castle/furniture.webp + pack.json; writes assets/tiles/throne/velscour_throne.webp and .json
(w, h, ox, oy: the ground pivot, the front corner of the dais, in the written image's pixels).
Recolour by hue: blood-red velvet stays red but deeper; brass and gilt trim become bone-gold (his horns and spikes);
the oak frame becomes blackened iron with an ember cast; the pale dais stone becomes charcoal shot with red.
"""
import json
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'tiles', 'castle')
OUT = os.path.join(ROOT, 'assets', 'tiles', 'throne')
ID = 'furniture_01_throne_dais'
DRAW_W = 128   # world px across: two tiles' diamond
OVER = 2.5     # stored at 2.5x its drawn size (crisp at high zoom, cheap to draw)


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r)
    gg = m & (mx == g) & ~rr
    bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    h = h / 6
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,))
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([a[m], b[m], c[m]], -1)
    return out


def main():
    meta = json.load(open(os.path.join(SRC, 'pack.json')))
    f = next(x for x in meta['atlases']['furniture'] if x['id'] == ID)
    atlas = Image.open(os.path.join(SRC, 'furniture.webp')).convert('RGBA')
    img = atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    a = np.asarray(img).astype(float) / 255
    rgb, alpha = a[..., :3], a[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    H, S, V = h.copy(), s.copy(), v.copy()
    red = ((h < 0.045) | (h > 0.93)) & (s > 0.35)
    gold = (h >= 0.075) & (h <= 0.18) & (s > 0.38) & (v > 0.52) & ~red
    stone = (s < 0.24) & ~red & ~gold
    wood = ~red & ~gold & ~stone
    H[red], S[red], V[red] = 0.995, np.minimum(1, s[red] * 1.2), v[red] * 0.8
    H[gold], S[gold], V[gold] = 0.105, 0.42, np.minimum(1, v[gold] * 0.95)
    H[wood], S[wood], V[wood] = 0.015, 0.45, v[wood] * 0.42
    H[stone], S[stone], V[stone] = 0.0, 0.3, v[stone] * 0.38
    out = np.dstack([hsv_to_rgb(H, S, V), alpha])
    res = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')
    k = DRAW_W * OVER / f['w']
    w, hh = round(f['w'] * k), round(f['h'] * k)
    res = res.resize((w, hh), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    res.save(os.path.join(OUT, 'velscour_throne.webp'), quality=92, method=6)
    px, py = f['pivot']
    json.dump({'w': w, 'h': hh, 'ox': -round(px * k), 'oy': -round(py * k), 'over': OVER, 'source': ID},
              open(os.path.join(OUT, 'velscour_throne.json'), 'w'))
    print('wrote', w, 'x', hh, 'pivot', round(px * k), round(py * k))


if __name__ == '__main__':
    main()
