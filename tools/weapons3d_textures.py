"""Small procedural textures for the Ninja's and the Rogue's held gear (tools/weapons3d_eastern.js), written to
assets/models/held/textures/ so the baked three.js models (assets/models/held/<set>/NN.json) can link them by file:
  ito_N.png    a katana's handle: silk braid crossing in diamonds over ray skin, eight colourways (wrap / skin)
  hada.png     folded steel grain for a blade's flat
  scales.png   gilt dragon scales on dark lacquer (the Dragon Sticks, fancy grips)
  rope.png     twisted hemp cord
  wrap.png     a leather strap wound round a grip (tinted by the material)
  same.png     ray skin nodules
Needs Pillow and numpy.   python tools/weapons3d_textures.py
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'models', 'held', 'textures')
ITO = [  # wrap, skin
    ((46, 44, 52), (222, 214, 196)), ((44, 60, 118), (226, 220, 204)), ((132, 26, 36), (34, 30, 34)), ((104, 78, 48), (224, 214, 190)),
    ((230, 226, 214), (128, 24, 34)), ((84, 34, 122), (224, 186, 96)), ((26, 104, 86), (226, 220, 204)), ((212, 168, 64), (30, 26, 30)),
]


def rnd(shape, seed):
    return np.random.default_rng(seed).random(shape)


def save(a, name):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, name), optimize=True)


def ito(wrap, skin, seed):
    """Two families of diagonal bands, period P, alternating over and under; the gaps between them show the skin."""
    T, P, b = 48, 24, 0.5
    y, x = np.mgrid[0:T, 0:T].astype(np.float64)
    u, v = (x + y) / P, (x - y) / P
    fu, fv = u % 1, v % 1
    on1, on2 = fu < b, fv < b
    top1 = ((np.floor(u) + np.floor(v)) % 2) == 0  # which band lies on top where they cross
    out = np.zeros((T, T, 3))
    nod = 0.8 + 0.2 * (rnd((T, T), seed) > 0.45)  # ray-skin nodules
    out[:] = np.array(skin) * nod[..., None]
    # a band: brightest along its middle, a thread texture across it, darker at the edges
    def band(f, w):
        m = np.abs(f / b - 0.5) * 2
        return (1.06 - 0.34 * m ** 2.2) * (0.94 + 0.06 * np.sin(w * 2.6))
    s1, s2 = band(fu, x - y), band(fv, x + y)
    wrapc = np.array(wrap, dtype=np.float64)
    one = on1 & (~on2 | top1)
    two = on2 & ~one
    out[one] = wrapc * s1[one][..., None]
    out[two] = wrapc * s2[two][..., None]
    under = (on1 & on2)  # the under band's shadow shows at the crossing's rim
    rim = under & (((fu > b - 0.08) | (fu < 0.08)) | ((fv > b - 0.08) | (fv < 0.08)))
    out[rim] *= 0.72
    edge = (~on1 & ~on2) & ((fu < b + 0.07) | (fv < b + 0.07) | (fu > 0.95) | (fv > 0.95))
    out[edge] *= 0.6  # the skin in shade under the braid's edge
    return out


def hada(seed=3):
    T = 64
    y, x = np.mgrid[0:T, 0:T].astype(np.float64)
    ph = 2 * np.pi / T
    g = np.sin(y * ph * 5 + 1.6 * np.sin(x * ph * 2) + 0.9 * np.sin(x * ph * 3 + y * ph)) * 0.5 + 0.5
    g = 0.86 + 0.1 * g + 0.04 * rnd((T, T), seed)
    return np.dstack([g * 250, g * 252, g * 255])


def scales():
    T, P = 48, 16
    out = np.zeros((T, T, 3))
    y, x = np.mgrid[0:T, 0:T].astype(np.float64)
    best = np.full((T, T), 9.0)
    lit = np.zeros((T, T))
    for row in range(-1, T // 8 + 2):
        cy = row * 8
        for col in range(-1, T // P + 2):
            cx = col * P + (P / 2 if row % 2 else 0)
            d = np.hypot(x - cx, (y - cy) * 1.0) / (P * 0.62)
            m = (d < 1) & (y >= cy)  # a scale hangs down from its centre and covers the row above
            lit = np.where(m, d, lit)
            best = np.where(m, row, best)
    rim = lit > 0.8
    body = np.array([70, 22, 26]) * (0.75 + 0.5 * (1 - lit))[..., None]
    gold = np.array([236, 188, 92]) * (0.8 + 0.3 * rnd((T, T), 5))[..., None]
    out[:] = np.where(rim[..., None], gold, body)
    return out


def rope():
    T = 16
    y, x = np.mgrid[0:T, 0:T].astype(np.float64)
    f = ((x + y * 2) / 8) % 1
    s = 0.62 + 0.42 * np.sin(f * np.pi) + 0.05 * rnd((T, T), 9)
    return np.array([206, 176, 128])[None, None, :] * s[..., None]


def wrap():
    T = 32
    y, x = np.mgrid[0:T, 0:T].astype(np.float64)
    f = ((y + x * 0.25) / 8) % 1
    s = 0.5 + 0.55 * np.sin(f * np.pi) ** 0.6
    s = np.where(f < 0.1, 0.3, s) * (0.93 + 0.07 * rnd((T, T), 11))
    return np.array([236, 226, 220])[None, None, :] * s[..., None]


def same():
    T = 32
    out = np.zeros((T, T, 3)); out[:] = (168, 160, 144)
    y, x = np.mgrid[0:T, 0:T].astype(np.float64)
    rg = np.random.default_rng(21)
    for _ in range(90):
        cx, cy, r = rg.random() * T, rg.random() * T, 1.2 + rg.random() * 1.4
        for ox in (-T, 0, T):
            for oy in (-T, 0, T):
                d = np.hypot(x - cx - ox, y - cy - oy) / r
                out = np.where((d < 1)[..., None], np.array([236, 230, 214]) * (1.04 - 0.3 * d)[..., None], out)
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for i, (w, s) in enumerate(ITO):
        save(ito(w, s, 40 + i), f'ito_{i}.png')
    save(hada(), 'hada.png'); save(scales(), 'scales.png'); save(rope(), 'rope.png'); save(wrap(), 'wrap.png'); save(same(), 'same.png')
    print('wrote', len(os.listdir(OUT)), 'textures to', os.path.normpath(OUT))
