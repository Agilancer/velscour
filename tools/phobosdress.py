"""Phobos and Castle Velscour's dressing (docs/PHOBOS.md "The dressing"), from the bm repo's textures:

  python tools/phobosdress.py <bm repo>        # writes assets/tiles/phobos/dress.webp + dress.json

- seams: ground cover (gravel, moss, scree, rubble, bones, straw, litter, ash) as ragged bands along one side of a tile,
  laid over the join between two unlike grounds so no ground ends in a straight saw-tooth line. Four sides x four
  quarters each (the cover spans 2 x 2 tiles like the floors; the band's width follows the same world position on both
  sides of a join, so the two halves meet).
- patches: the same covers (and puddles) as blobs inside one tile, strewn over plain ground.
- floors: more floors in the same four-quarter form as tools/phobostex.py (the wings' carpets in the four liveries,
  bronze plates, the frieze border).
- props: furniture and set pieces modelled from boxes, planes and drums and rendered on the game's 2:1 iso grid with
  bm's textures (the pews, pulpits and altars of the sanctuaries, the stands of the stadiums and auditoriums, columns,
  braziers, stalls, lamp posts, Velscour's V banners on standards), then cut to hard-edged, outlined pixel art in a
  short palette like the painted packs. Each faces +y (mirror for +x); pivot on the floor, as the town pack's scatter.
- banners: Velscour's V on cloth in the four liveries and his war banner, sheared flat onto a wall (along map x; mirror
  for map y).
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S, D = 80, 40          # native px per map unit: screen x = (x - y) * S, y = (x + y) * D - z
SS = 3
CONTRAST = 1.7
BM = None
_tex = {}


def tex(path, size=256, tone=0.76, sat=0.8, hue=None, rgba=False):
    key = (path, size, tone, sat, hue, rgba)
    if key not in _tex:
        im = Image.open(os.path.join(BM, path))
        im = im.convert('RGBA' if rgba else 'RGB').resize((size, size), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32) / 255
        c = a[..., :3]
        g = c.mean(axis=2, keepdims=True)
        c = (g + (c - g) * sat)
        m = c.mean()
        c = np.clip((m + (c - m) * CONTRAST) * tone, 0, 1)   # local contrast kept: joints, grain and plank lines must survive the scale
        if hue is not None:
            c = hue_to(c, *hue)
        _tex[key] = np.concatenate([c, a[..., 3:]], axis=2) if rgba else c
    return _tex[key]


P2 = 'assets/phobos/textures/ph2_'
GT = 'assets/game/tex/'
ph = lambda n, **k: tex(P2 + n + '.png', **k)


def hue_to(c, h, s_mul=1.0, l_mul=1.0):
    """Recolour to hue h (0-360), keeping each pixel's light and a share of its saturation."""
    mx, mn = c.max(axis=2), c.min(axis=2)
    l = (mx + mn) / 2
    s = np.where(mx - mn < 1e-6, 0, (mx - mn) / (1 - np.abs(2 * l - 1) + 1e-6)) * s_mul
    l = np.clip(l * l_mul, 0, 1)
    C = (1 - np.abs(2 * l - 1)) * np.clip(s, 0, 1)
    hp = (h % 360) / 60
    X = C * (1 - abs(hp % 2 - 1))
    r, g, b = [(C, X, 0), (X, C, 0), (0, C, X), (0, X, C), (X, 0, C), (C, 0, X)][int(hp) % 6]
    m = l - C / 2
    return np.stack([np.zeros_like(l) + r + m, np.zeros_like(l) + g + m, np.zeros_like(l) + b + m], axis=2).astype(np.float32)


def sample(t, u, v):
    h, w = t.shape[:2]
    x, y = (u * w) % w, (v * h) % h
    x0, y0 = np.floor(x).astype(int) % w, np.floor(y).astype(int) % h
    fx, fy = (x - np.floor(x))[..., None], (y - np.floor(y))[..., None]
    x1, y1 = (x0 + 1) % w, (y0 + 1) % h
    return t[y0, x0] * (1 - fx) * (1 - fy) + t[y0, x1] * fx * (1 - fy) + t[y1, x0] * (1 - fx) * fy + t[y1, x1] * fx * fy


# ------------------------------------------------------------------------------------------------ floor tiles
def tile_uv(W=160, H=80, ss=SS):
    X, Y = np.meshgrid((np.arange(W * ss) + 0.5) / ss, (np.arange(H * ss) + 0.5) / ss)
    xr = X - W / 2
    u, v = (xr / (W / 2) + Y / (H / 2)) / 2, (Y / (H / 2) - xr / (W / 2)) / 2
    inside = (np.abs(xr) / (W / 2) + np.abs(Y - H / 2) / (H / 2)) <= 1.015
    return u, v, inside


def to_img(rgb, alpha, W=160, H=80):
    img = np.concatenate([rgb * alpha[..., None], alpha[..., None]], axis=2)          # premultiplied through the resize
    im = np.asarray(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((W, H), Image.BOX)).astype(np.float32) / 255
    a = im[..., 3:]
    out = np.concatenate([np.where(a > 0, im[..., :3] / np.maximum(a, 1e-4), 0), a], axis=2)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')


def diamond(t, qx, qy):
    u, v, inside = tile_uv()
    return to_img(sample(t, (qx + u) / 2, (qy + v) / 2), inside.astype(np.float32))


def wave(a, seed):
    """A smooth 0..1 wave of the along-seam world coordinate a (period 2 tiles)."""
    r = np.random.RandomState(seed)
    out = 0
    for k, amp in ((1, 0.5), (2, 0.3), (3, 0.2)):
        out = out + amp * np.sin(a * math.pi * k + r.uniform(0, 6.28))
    return 0.5 + 0.5 * out


def seam(t, side, qx, qy, seed, width=(0.2, 0.52)):
    u, v, inside = tile_uv()
    if side == 0: d, a = 1 - u, v + qy       # the join on the tile's +x side
    elif side == 1: d, a = u, v + qy         # -x
    elif side == 2: d, a = 1 - v, u + qx     # +y
    else: d, a = v, u + qx                   # -y
    rgb = sample(t, (qx + u) / 2, (qy + v) / 2)
    lum = rgb.mean(axis=2)
    lum = (lum - lum.mean()) / (lum.std() + 1e-6)
    w = width[0] + (width[1] - width[0]) * wave(a, seed + (side >> 1) * 7)
    p = np.clip(1 - d / w, 0, 1)
    far = np.clip(1 - d / (w * 2.4), 0, 1)              # loose stones beyond the band
    on = (p * 0.85 + lum * 0.4 > 0.5) | ((far > 0) & (lum > 1.7 - far * 1.3))   # broken stones thinning out, never a solid edge
    return to_img(rgb, (on & inside).astype(np.float32))


def patch(t, k, seed, puddle=False):
    u, v, inside = tile_uv()
    r = np.random.RandomState(seed * 31 + k)
    cx, cy = r.uniform(0.38, 0.62, 2)
    ang = np.arctan2(v - cy, u - cx)
    rad = np.hypot(u - cx, v - cy)
    edge = 0.34 + 0.1 * np.sin(ang * 2 + r.uniform(0, 6)) + 0.06 * np.sin(ang * 5 + r.uniform(0, 6)) + 0.03 * np.sin(ang * 9 + r.uniform(0, 6))
    rgb = sample(t, (u + r.uniform(0, 1)) / 2, (v + r.uniform(0, 1)) / 2)
    lum = rgb.mean(axis=2)
    lum = (lum - lum.mean()) / (lum.std() + 1e-6)
    p = np.clip(1 - rad / edge, -1, 1)
    if puddle:
        on = p > 0.04
        rgb = np.zeros_like(rgb) + np.array([0.07, 0.085, 0.1]) + (np.clip(p, 0, 1) * 0.05)[..., None] + (lum > 1.6)[..., None] * 0.05
        rim = on & (p < 0.16)
        rgb = np.where(rim[..., None], rgb * 0.55, rgb)
        return to_img(rgb, (on & inside).astype(np.float32) * 0.82)
    on = (p * 1.3 + lum * 0.3 > 0.38) | ((p > -0.35) & (lum > 1.7 - (p + 0.35) * 1.6))
    return to_img(rgb, (on & inside).astype(np.float32))


# ------------------------------------------------------------------------------------------------ the little renderer
class Scene:
    def __init__(self):
        self.pts = []

    def quad(self, p0, U, V, colour, shade=1.0, alpha=None):
        """A parallelogram p0 + u U + v V (u, v in 0..1). colour(u, v) -> rgb arrays (or rgba when alpha is 'tex')."""
        p0, U, V = np.array(p0, float), np.array(U, float), np.array(V, float)
        sl = lambda w: math.hypot((w[0] - w[1]) * S, (w[0] + w[1]) * D - w[2])
        nu, nv = max(2, int(sl(U) * SS * 1.6) + 2), max(2, int(sl(V) * SS * 1.6) + 2)
        u, v = np.meshgrid((np.arange(nu) + 0.5) / nu, (np.arange(nv) + 0.5) / nv)
        P = p0[None, None, :] + u[..., None] * U + v[..., None] * V
        c = colour(u, v, P)
        a = np.ones(u.shape, np.float32)
        if c.shape[-1] == 4: a, c = c[..., 3], c[..., :3]
        if alpha is not None: a = a * alpha(u, v, P)
        sh = shade(u, v, P) if callable(shade) else shade
        self._add(P, c * (sh[..., None] if isinstance(sh, np.ndarray) else sh), a)

    def _add(self, P, c, a):
        m = a.reshape(-1) > 0.5
        self.pts.append((P.reshape(-1, 3)[m].astype(np.float32), c.reshape(-1, 3)[m].astype(np.float32)))

    def box(self, x0, y0, z0, x1, y1, z1, top, side=None, tone=1.0, scale=1.0, front=None):
        side = side if side is not None else top
        front = front if front is not None else side
        w, d, h = x1 - x0, y1 - y0, z1 - z0
        ew, ed, eh = 2.2 / (S * max(w, 0.05)), 2.2 / (S * max(d, 0.05)), 2.2 / max(h, 2)      # a lit arris along the near edges, a dark foot
        self.quad((x0, y0, z1), (w, 0, 0), (0, d, 0), lambda u, v, P: sample(top, P[..., 0] * scale, P[..., 1] * scale), lambda u, v, P: tone * np.where((u > 1 - ew) | (v > 1 - ed), 1.3, 1.0))
        self.quad((x0, y1, z1), (w, 0, 0), (0, 0, -h), lambda u, v, P: sample(front, P[..., 0] * scale, -P[..., 2] / S * scale), lambda u, v, P: 0.84 * tone * np.where(v < eh, 1.25, np.where(v > 1 - eh, 0.6, 1.0)))
        self.quad((x1, y0, z1), (0, d, 0), (0, 0, -h), lambda u, v, P: sample(side, P[..., 1] * scale, -P[..., 2] / S * scale), lambda u, v, P: 0.54 * tone * np.where(v < eh, 1.3, np.where(v > 1 - eh, 0.6, 1.0)))

    def drum(self, cx, cy, r, z0, z1, t, tone=1.0, scale=1.0, top=True, r1=None, mod=None):
        """A drum (or a cone frustum to r1 at the top)."""
        r1 = r if r1 is None else r1
        n, nz = int(r * S * SS * 5) + 8, max(2, int((z1 - z0) * SS * 1.5))
        th, zz = np.meshgrid(np.linspace(-math.pi * 0.3, math.pi * 0.8, n), np.linspace(0, 1, nz))
        rr = r + (r1 - r) * zz
        P = np.stack([cx + rr * np.cos(th), cy + rr * np.sin(th), z0 + (z1 - z0) * zz], axis=2)
        sh = (0.5 + 0.4 * np.clip(np.sin(th), 0, 1) + 0.1 * np.clip(np.cos(th), 0, 1)) * tone
        if mod is not None: sh = sh * mod(th, P[..., 2])
        self._add(P, sample(t, th * r * scale * 1.5, -P[..., 2] / S * scale) * sh[..., None], np.ones(th.shape, np.float32))
        if top:
            n = int(r1 * S * SS * 3.2) + 4
            x, y = np.meshgrid(np.linspace(-r1, r1, n), np.linspace(-r1, r1, n))
            P = np.stack([cx + x, cy + y, np.zeros_like(x) + z1], axis=2)
            self._add(P, sample(t, P[..., 0] * scale, P[..., 1] * scale) * tone, (np.hypot(x, y) <= r1).astype(np.float32))

    def render(self, colours=40, outline=(14, 11, 10), glow=None):
        P = np.concatenate([p for p, _ in self.pts]).astype(np.float32); C = np.concatenate([c for _, c in self.pts]).astype(np.float32)
        sx, sy = (P[:, 0] - P[:, 1]) * S, (P[:, 0] + P[:, 1]) * D - P[:, 2]
        x0, x1, y0, y1 = math.floor(sx.min()) - 3, math.ceil(sx.max()) + 3, math.floor(sy.min()) - 3, math.ceil(sy.max()) + 3
        W, H = (x1 - x0) * SS, (y1 - y0) * SS
        ix, iy = np.clip(((sx - x0) * SS).astype(int), 0, W - 1), np.clip(((sy - y0) * SS).astype(int), 0, H - 1)
        order = np.argsort(P[:, 0] + P[:, 1] + P[:, 2] * 1e-4, kind='stable')
        buf = np.zeros((H, W, 4), np.float32); zb = np.zeros((H, W), np.float32)
        ao = 0.72 + 0.28 * np.clip(P[:, 2] / 26, 0, 1)                      # darker where it meets the floor
        buf[iy[order], ix[order], :3] = C[order] * ao[order, None]; buf[iy[order], ix[order], 3] = 1
        zb[iy[order], ix[order]] = P[order, 2]
        im = Image.fromarray((np.clip(buf, 0, 1) * 255).astype(np.uint8), 'RGBA')
        im = im.filter(ImageFilter.MaxFilter(3)) if False else im
        a = np.asarray(im.resize((x1 - x0, y1 - y0), Image.BOX)).astype(np.float32) / 255
        al = a[..., 3]
        rgb = np.where(al[..., None] > 0, a[..., :3] / np.maximum(al[..., None], 1e-4), 0)
        hard = al > 0.45
        q = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), 'RGB').quantize(colours, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
        out = np.dstack([np.asarray(q), (hard * 255).astype(np.uint8)])
        # a one-pixel dark outline round the silhouette, like the painted packs
        pad = np.pad(hard, 1)
        ring = (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]) & ~hard
        out[ring] = (*outline, 235)
        return Image.fromarray(out, 'RGBA'), x0, y0


flat = lambda rgb: np.zeros((4, 4, 3), np.float32) + np.array(rgb, np.float32)


def mats():
    return dict(
        oak=ph('02_08_oak_planks', tone=1.0), dark=ph('03_10_black_panelling', tone=1.5), beam=ph('02_11_adzed_beam', tone=0.6),
        granite=ph('04_01_curtain_granite', tone=1.0), basalt=ph('04_02_keep_basalt', tone=1.15), col=ph('04_08_basalt_columns', tone=1.5, sat=0.6),
        marble=ph('04_19_mausoleum_marble', tone=0.7), ox=ph('03_11_oxblood_marble', tone=0.8), obs=ph('04_17_obsidian', tone=1.0),
        bronze=ph('04_15_bronze_plates', tone=0.9), iron=ph('01_02_riveted_plate', tone=0.6), rust=ph('01_03_heavy_rust', tone=0.7), bars=ph('01_01_wrought_bars', tone=0.7),
        bone=ph('01_05_bone_wall', tone=0.72), frieze=ph('04_04_demon_frieze', tone=0.85), canvas=ph('02_19_awning_canvas', tone=0.7), hessian=ph('02_20_hessian', tone=0.66),
        glass=ph('02_17_leaded_lit', tone=1.15, sat=1.0), coping=ph('01_07_coping', tone=1.05), books=ph('03_17_book_spines', tone=0.74), slate=ph('02_01_slate_roof', tone=0.7),
        gold=flat((0.72, 0.55, 0.2)), coal=flat((1.0, 0.45, 0.12)), flame=flat((1.0, 0.8, 0.35)), black=flat((0.08, 0.07, 0.07)), wax=flat((0.82, 0.76, 0.6)),
    )


LIVERIES = {'gold': ('03_05_banner_greygold', (0.2, 0.19, 0.19), (0.83, 0.64, 0.24)), 'blue': ('03_02_banner_blue', (0.1, 0.15, 0.36), (0.78, 0.8, 0.84)),
            'red': ('03_01_banner_blood', (0.4, 0.06, 0.06), (0.85, 0.68, 0.3)), 'green': ('03_04_banner_green', (0.08, 0.24, 0.12), (0.82, 0.78, 0.62)),
            'war': ('03_06_war_banner', (0.09, 0.08, 0.09), (0.62, 0.1, 0.1))}


def banner_cloth(name, w=192, h=288):
    """Velscour's V on the bm banner's cloth: its border and fringe kept, the field re-woven plain, a great V on it."""
    src, field, metal = LIVERIES[name]
    t = np.asarray(Image.open(os.path.join(BM, P2 + src + '.png')).convert('RGB').resize((w, h), Image.LANCZOS)).astype(np.float32) / 255 * 0.82
    y, x = np.mgrid[0:h, 0:w]
    u, v = (x + 0.5) / w, (y + 0.5) / h
    tip = 0.775 + 0.2 * (1 - np.abs(u - 0.5) / 0.5)                 # the pennon's swallow point
    shape = (v < tip) & (u > 0.015) & (u < 0.985) & (v > 0.01)
    inner = (v < tip - 0.075) & (u > 0.085) & (u < 0.915) & (v > 0.05)
    r = np.random.RandomState(7)
    weave = 0.92 + 0.08 * ((x + y) % 2) + r.uniform(-0.035, 0.035, (h, w))
    fold = 0.88 + 0.12 * np.sin(u * math.pi * 3.2 + 0.4) * (0.5 + 0.5 * v)
    cloth = np.array(field)[None, None, :] * (weave * fold)[..., None]
    out = np.where(inner[..., None], cloth, t * fold[..., None])
    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(im)
    P = lambda pts: [(px * w, py * h) for px, py in pts]
    V_out = [(0.17, 0.15), (0.40, 0.15), (0.40, 0.185), (0.365, 0.19), (0.5, 0.52), (0.635, 0.19), (0.60, 0.185), (0.60, 0.15), (0.83, 0.15), (0.83, 0.185), (0.79, 0.19), (0.555, 0.70), (0.445, 0.70), (0.21, 0.19), (0.17, 0.185)]
    c8 = lambda c, k: tuple(int(min(1, a * k) * 255) for a in c)
    d.polygon(P([(px + 0.018, py + 0.014) for px, py in V_out]), fill=(10, 8, 8))                                   # its shadow on the cloth
    d.polygon(P(V_out), fill=c8(metal, 0.62))
    d.polygon(P([(0.17, 0.15), (0.40, 0.15), (0.40, 0.185), (0.365, 0.19), (0.5, 0.52), (0.5, 0.70), (0.445, 0.70), (0.21, 0.19), (0.17, 0.185)]), fill=c8(metal, 1.0))   # the lit stroke
    d.line(P(V_out + V_out[:1]), fill=(18, 14, 12), width=2)
    d.line(P([(0.29, 0.19), (0.47, 0.62)]), fill=c8(metal, 1.25), width=2)
    # a thin inner border in the metal, and thorns' studs along it
    for k in range(9):
        cx, cy = 0.5 + 0.33 * math.cos(math.pi * (1.15 + 0.7 * k / 8)), 0.19 + 0.085 * math.sin(math.pi * (1.15 + 0.7 * k / 8))
        d.polygon(P([(cx - 0.014, cy), (cx, cy - 0.03), (cx + 0.014, cy)]), fill=c8(metal, 0.9))
    a = np.dstack([np.asarray(im).astype(np.float32) / 255, shape.astype(np.float32)])
    return a


def props_and_banners():
    M = mats()
    out = {}

    def done(sc, name, colours=40):
        im, ox, oy = sc.render(colours)
        out[name] = (im, ox, oy)

    cloths = {k: banner_cloth(k) for k in LIVERIES}
    ctex = lambda k: (lambda u, v, P: sample(cloths[k], u * 0.999, v * 0.999))

    # --- the sanctuaries
    sc = Scene()   # a pew: a long bench with a tall back and carved ends, facing +y
    sc.box(-0.5, -0.24, 0, 0.5, -0.16, 62, M['dark'], M['dark'], scale=2)                 # the back
    sc.box(-0.5, -0.16, 22, 0.5, 0.14, 28, M['oak'], M['oak'], scale=2)                   # the seat
    sc.box(-0.5, 0.06, 0, 0.5, 0.12, 22, M['dark'], M['dark'], tone=0.8, scale=2)         # its front board
    for x in (-0.5, 0.44): sc.box(x, -0.24, 0, x + 0.06, 0.2, 46, M['dark'], M['dark'], tone=1.1, scale=2)
    done(sc, 'pew')
    sc = Scene()   # a pulpit: a panelled drum on a stem, steps behind, a book board, Velscour's cloth on its front
    sc.drum(0, 0, 0.16, 0, 46, M['dark'], scale=2)
    sc.drum(0, 0, 0.4, 46, 54, M['oak'], scale=2)
    sc.drum(0, 0, 0.36, 54, 104, M['dark'], scale=2, top=False)
    sc.drum(0, 0, 0.4, 104, 110, M['oak'], scale=2)
    sc.drum(0, 0, 0.3, 105, 111, M['black'], tone=0.6)
    sc.quad((-0.17, 0.375, 100), (0.34, 0, 0), (0, 0, -56), ctex('gold'))
    sc.box(-0.14, 0.2, 110, 0.14, 0.42, 116, M['oak'], M['oak'], scale=2)
    sc.box(-0.1, 0.24, 116, 0.1, 0.38, 119, M['wax'], M['wax'])
    for k in range(4): sc.box(-0.62 - 0 * k, -0.2 - k * 0.0, 0, -0.38, 0.2, 14, M['oak'], M['dark'], scale=2) if k == 0 else sc.box(-0.62 + 0.0, -0.2, 14 * k, -0.38 - 0.0, 0.2 - k * 0.1, 14 * k + 14, M['oak'], M['dark'], scale=2)
    done(sc, 'pulpit', 48)
    for col in ('gold', 'blue', 'red', 'green'):   # an altar: marble on a plinth, the wing's cloth over it, candles
        sc = Scene()
        sc.box(-0.95, -0.42, 0, 0.95, 0.42, 10, M['basalt'], M['basalt'])
        sc.box(-0.8, -0.3, 10, 0.8, 0.3, 50, M['marble'], M['marble'], scale=1.5)
        sc.box(-0.86, -0.34, 50, 0.86, 0.34, 56, M['marble'], M['marble'], tone=1.1, scale=1.5)
        c = cloths[col]
        sc.quad((-0.32, -0.34, 56.6), (0.64, 0, 0), (0, 0.68, 0), lambda u, v, P: sample(c[..., :3], 0.1 + u * 0.8, 0.02 + v * 0.1))
        sc.quad((-0.32, 0.345, 56), (0.64, 0, 0), (0, 0, -44), lambda u, v, P: sample(c, u, 0.12 + v * 0.87), 0.9)
        for x in (-0.66, 0.66):
            sc.drum(x, 0, 0.035, 56, 84, M['wax']); sc.drum(x, 0, 0.02, 84, 90, M['flame'], tone=1.3)
        sc.drum(0, -0.12, 0.09, 56, 62, M['gold']); sc.drum(0, -0.12, 0.03, 62, 76, M['gold']); sc.drum(0, -0.12, 0.08, 76, 82, M['gold'], r1=0.11)
        done(sc, 'altar_' + col, 48)
    sc = Scene()   # a lectern
    sc.drum(0, 0, 0.2, 0, 6, M['dark'], scale=2); sc.drum(0, 0, 0.06, 6, 60, M['dark'], scale=2)
    sc.box(-0.24, -0.12, 60, 0.24, 0.16, 66, M['oak'], M['oak'], scale=2); sc.box(-0.18, -0.08, 66, 0.18, 0.12, 70, M['wax'], M['wax'])
    done(sc, 'lectern')
    sc = Scene()   # a font / reliquary basin
    sc.drum(0, 0, 0.3, 0, 8, M['basalt']); sc.drum(0, 0, 0.14, 8, 40, M['marble']); sc.drum(0, 0, 0.2, 40, 58, M['marble'], r1=0.42); sc.drum(0, 0, 0.36, 58.5, 59, flat((0.2, 0.03, 0.04)))
    done(sc, 'font')
    sc = Scene()   # a sarcophagus
    sc.box(-0.8, -0.34, 0, 0.8, 0.34, 34, M['granite'], M['frieze'], scale=1.2, front=M['frieze'])
    sc.box(-0.86, -0.4, 34, 0.86, 0.4, 42, M['marble'], M['marble']); sc.box(-0.6, -0.2, 42, 0.6, 0.2, 48, M['marble'], M['marble'], tone=1.1)
    done(sc, 'sarcophagus')
    sc = Scene()   # a candle stand
    sc.drum(0, 0, 0.16, 0, 5, M['iron']); sc.drum(0, 0, 0.035, 5, 96, M['iron'])
    sc.drum(0, 0, 0.2, 96, 100, M['iron'])
    for a in range(5):
        x, y = 0.15 * math.cos(a * 1.257), 0.15 * math.sin(a * 1.257)
        sc.drum(x, y, 0.028, 100, 116, M['wax']); sc.drum(x, y, 0.018, 116, 122, M['flame'], tone=1.3)
    done(sc, 'candle_stand')

    # --- stadiums and auditoriums: stone tiers one tile square, a bench's lip on each; four heights
    for k in range(1, 5):
        sc = Scene()
        sc.box(-0.5, -0.5, 0, 0.5, 0.5, 26 * k - 6, M['granite'], M['granite'], scale=1)
        sc.box(-0.5, -0.5, 26 * k - 6, 0.5, 0.5, 26 * k, M['coping'], M['coping'], tone=1.05, scale=1)
        sc.box(-0.5, -0.5, 26 * k, 0.5, -0.22, 26 * k + 9, M['oak'], M['oak'], scale=2)
        done(sc, 'tier%d' % k, 32)
    sc = Scene()   # a low arena wall: a parapet block
    sc.box(-0.5, -0.3, 0, 0.5, 0.3, 30, M['granite'], M['granite']); sc.box(-0.5, -0.34, 30, 0.5, 0.34, 37, M['coping'], M['coping'], tone=1.05)
    done(sc, 'parapet', 32)
    sc = Scene()   # a stage block (auditorium): boards on a stone front
    sc.box(-0.5, -0.5, 0, 0.5, 0.5, 18, M['oak'], M['dark'], scale=2)
    done(sc, 'stage', 24)
    sc = Scene()   # the lord's box: a dais, a high-backed throne under a canopy on four posts, his war banner behind
    sc.box(-0.5, -0.5, 0, 0.5, 0.5, 26, M['granite'], M['granite']); sc.box(-0.42, -0.42, 26, 0.42, 0.42, 32, M['ox'], M['ox'])
    for x in (-0.46, 0.4):
        for y in (-0.46, 0.4): sc.box(x, y, 26, x + 0.06, y + 0.06, 150, M['dark'], M['dark'], scale=2)
    sc.box(-0.26, -0.3, 32, 0.26, -0.2, 118, M['dark'], M['dark'], scale=2); sc.box(-0.26, -0.2, 32, 0.26, 0.16, 54, M['ox'], M['ox'])
    for x in (-0.32, 0.26): sc.box(x, -0.24, 32, x + 0.06, 0.18, 72, M['gold'], M['gold'])
    sc.quad((-0.2, -0.195, 114), (0.4, 0, 0), (0, 0, -56), ctex('war'))
    sc.box(-0.52, -0.52, 150, 0.52, 0.52, 158, M['ox'], M['ox']); sc.box(-0.1, -0.1, 158, 0.1, 0.1, 172, M['gold'], M['gold'])
    done(sc, 'lord_box', 48)

    # --- columns, braziers, statues
    sc = Scene()
    sc.box(-0.42, -0.42, 0, 0.42, 0.42, 16, M['basalt'], M['basalt']); sc.drum(0, 0, 0.3, 16, 190, M['col'], scale=1.2, top=False)
    sc.drum(0, 0, 0.3, 190, 200, M['granite'], r1=0.42); sc.box(-0.46, -0.46, 200, 0.46, 0.46, 214, M['basalt'], M['frieze'], front=M['frieze'])
    done(sc, 'column', 36)
    sc = Scene()   # a broken column
    sc.box(-0.42, -0.42, 0, 0.42, 0.42, 16, M['basalt'], M['basalt']); sc.drum(0, 0, 0.3, 16, 64, M['col'], scale=1.2); sc.drum(0.1, 0.06, 0.2, 64, 76, M['col'], scale=1.2)
    done(sc, 'column_broken', 32)
    sc = Scene()   # a brazier: an iron bowl on a tripod, coals alight
    for a in range(3): sc.drum(0.2 * math.cos(a * 2.09 + 0.5), 0.2 * math.sin(a * 2.09 + 0.5), 0.03, 0, 48, M['iron'])
    sc.drum(0, 0, 0.16, 44, 62, M['iron'], r1=0.32); sc.drum(0, 0, 0.28, 62.5, 63, M['coal'], tone=1.2); sc.drum(0, 0, 0.14, 63, 70, M['flame'], tone=1.3, r1=0.02)
    done(sc, 'brazier', 32)
    sc = Scene()   # an obelisk of obsidian, his V gilt on its face
    sc.box(-0.4, -0.4, 0, 0.4, 0.4, 14, M['basalt'], M['basalt']); sc.box(-0.26, -0.26, 14, 0.26, 0.26, 150, M['obs'], M['obs'], scale=1.5)
    sc.box(-0.18, -0.18, 150, 0.18, 0.18, 168, M['obs'], M['obs'], scale=1.5); sc.box(-0.08, -0.08, 168, 0.08, 0.08, 182, M['gold'], M['gold'])
    c = cloths['gold']
    sc.quad((-0.2, 0.262, 138), (0.4, 0, 0), (0, 0, -64), lambda u, v, P: sample(c[..., :3], 0.17 + u * 0.66, 0.14 + v * 0.57), 1.0,
            alpha=lambda u, v, P: (sample(c[..., :3], 0.17 + u * 0.66, 0.14 + v * 0.57).max(axis=2) > 0.33).astype(np.float32))
    done(sc, 'obelisk', 40)
    sc = Scene()   # a suit of plate on a stand
    sc.drum(0, 0, 0.22, 0, 6, M['dark'], scale=2); sc.drum(0, 0, 0.04, 6, 50, M['dark'])
    sc.drum(0, 0, 0.17, 50, 92, M['iron'], r1=0.24, top=False); sc.drum(0, 0, 0.25, 92, 100, M['iron'], r1=0.2); sc.box(-0.34, -0.1, 84, 0.34, 0.1, 98, M['iron'], M['iron'])
    sc.drum(0, 0, 0.11, 100, 126, M['iron'], r1=0.1); sc.drum(0, 0, 0.1, 126, 132, M['iron'], r1=0.03); sc.drum(0, 0, 0.03, 132, 150, M['gold'], r1=0.0)
    done(sc, 'armour_stand', 36)

    # --- banners on standards (one per livery, and the war banner): a pole, a yard, the cloth
    for col in LIVERIES:
        sc = Scene()
        sc.drum(0, 0, 0.14, 0, 8, M['basalt']); sc.drum(0, 0, 0.035, 8, 214, M['beam'], scale=2); sc.drum(0, 0, 0.05, 214, 222, M['gold'], r1=0.0)
        sc.box(-0.4, -0.02, 196, 0.4, 0.02, 201, M['beam'], M['beam'], scale=2)
        sc.quad((-0.36, 0.03, 197), (0.72, 0, 0), (0, 0, -108), ctex(col))
        done(sc, 'standard_' + col, 48)
        # flat on a wall (along map x), hung from a rail: the pivot is the wall's foot under its middle
        sc = Scene()
        sc.box(-0.5, 0, 203, 0.5, 0.03, 207, M['iron'], M['iron'])
        sc.quad((-0.46, 0.04, 204), (0.92, 0, 0), (0, 0, -138), ctex(col), 0.95)
        done(sc, 'wallbanner_' + col, 48)
    # --- the city: stalls, lamp posts, a gibbet
    for i, hue in enumerate(((0.36, 0.1, 0.09), (0.3, 0.26, 0.16), (0.12, 0.2, 0.3))):
        sc = Scene()
        can = M['canvas'] * 0 + np.array(hue, np.float32) * (0.75 + 0.5 * M['canvas'].mean(axis=2, keepdims=True))
        for x in (-0.46, 0.4):
            for y in (-0.36, 0.3): sc.box(x, y, 0, x + 0.06, y + 0.06, 104, M['beam'], M['beam'], scale=2)
        sc.box(-0.48, -0.1, 0, 0.48, 0.38, 36, M['oak'], M['oak'], scale=2); sc.box(-0.5, -0.12, 36, 0.5, 0.4, 40, M['oak'], M['oak'], tone=1.1, scale=2)
        for k in range(3): sc.box(-0.4 + k * 0.28, 0.0, 40, -0.2 + k * 0.28, 0.24, 48 + 3 * (k % 2), M['hessian'], M['hessian'])
        sc.box(-0.56, -0.42, 104, 0.56, 0.46, 108, can, can, scale=2)
        sc.quad((-0.56, 0.46, 104), (1.12, 0, 0), (0, 0, -14), lambda u, v, P: sample(can, u * 2, v), 0.8, alpha=lambda u, v, P: ((u * 7) % 1 < 0.5) | (v < 0.45))
        done(sc, 'stall_%d' % i, 44)
    sc = Scene()
    sc.drum(0, 0, 0.12, 0, 10, M['basalt']); sc.drum(0, 0, 0.035, 10, 150, M['iron']); sc.box(-0.03, -0.03, 146, 0.32, 0.03, 150, M['iron'], M['iron'])
    sc.box(0.2, -0.07, 116, 0.34, 0.07, 140, M['glass'], M['glass'], tone=1.25, scale=3); sc.box(0.18, -0.09, 140, 0.36, 0.09, 144, M['iron'], M['iron'])
    done(sc, 'lamp_post', 32)
    sc = Scene()   # a gibbet with its cage
    sc.box(-0.3, -0.3, 0, 0.3, 0.3, 12, M['granite'], M['granite']); sc.drum(-0.1, 0, 0.05, 12, 200, M['beam'], scale=2); sc.box(-0.12, -0.03, 194, 0.42, 0.03, 200, M['beam'], M['beam'], scale=2)
    sc.drum(0.3, 0, 0.012, 150, 194, M['iron']); sc.drum(0.3, 0, 0.13, 92, 150, M['bars'], scale=3, top=False); sc.drum(0.3, 0, 0.14, 88, 92, M['iron']); sc.drum(0.3, 0, 0.14, 150, 154, M['iron'], r1=0.02)
    done(sc, 'gibbet', 36)
    sc = Scene()   # a long hall table (two tiles), benches either side
    sc.box(-1.0, -0.26, 34, 1.0, 0.26, 40, M['oak'], M['oak'], scale=2)
    for x in (-0.9, 0.82): sc.box(x, -0.2, 0, x + 0.08, 0.2, 34, M['dark'], M['dark'], scale=2)
    for y in (-0.5, 0.4): sc.box(-0.95, y, 14, 0.95, y + 0.12, 18, M['oak'], M['dark'], scale=2)
    for x in (-0.5, 0.1, 0.6): sc.drum(x, 0.02, 0.06, 40, 44, M['gold'])
    sc.drum(-0.1, 0, 0.03, 40, 58, M['wax']); sc.drum(-0.1, 0, 0.018, 58, 63, M['flame'], tone=1.3)
    done(sc, 'hall_table', 44)
    ramparts(M, cloths, done)
    return out


PANEL = 213            # a wall panel of the dungeon rigs, native px
def ramparts(M, cloths, done):
    """The city's curtain wall: a column one tile square and five panels tall (courses at every panel, arrow slits,
    a corbelled wall-walk, merlons at its corners so neighbours join into battlements), the same with his banner down
    its face, and a guard tower: a drum over six panels tall, crenellated, a standard on its roof."""
    global SS
    ss0, SS = SS, 2
    g, cop, H = ph('04_01_curtain_granite', tone=1.3, sat=0.7), ph('01_07_coping', tone=1.3, sat=0.7), PANEL * 5   # lit to stand out of the night

    rs = np.random.RandomState(5)
    stain = rs.uniform(0, 1, (64, 8))
    def stone(a, z, slits=True):
        c = sample(g, a * 0.5, -z / S * 0.5)
        k = np.clip((z / PANEL / 5 * 63).astype(int), 0, 63)
        c = c * (0.86 + 0.2 * stain[k, np.clip(((a - np.floor(a)) * 8).astype(int), 0, 7)])[..., None]          # weathered courses
        c = c * np.where((a - np.floor(a) > 0.42) & (a - np.floor(a) < 0.5) & (z > PANEL * 2.75) & (z < PANEL * 3.5), 0.72, 1.0)[..., None]   # a run of damp under the slit
        zz = z % PANEL
        course = (zz < 9) | (zz > PANEL - 7)
        damp = 0.74 + 0.26 * np.clip(z / 420, 0, 1)
        c = c * (damp * np.where(course, 0.72, 1.0))[..., None]
        if slits:
            f = a - np.floor(a)
            slit = (np.abs(f - 0.5) < 0.04) & (((z > PANEL * 2.3) & (z < PANEL * 2.75)) | ((z > PANEL * 3.55) & (z < PANEL * 4.0)))
            c = np.where(slit[..., None], 0.03, c)
        return c

    for name in ('rampart', 'rampart_v'):
        sc = Scene()
        sc.quad((-0.5, 0.5, H), (1, 0, 0), (0, 0, -H), lambda u, v, P: stone(P[..., 0] + 0.5, P[..., 2]), 0.9)
        sc.quad((0.5, -0.5, H), (0, 1, 0), (0, 0, -H), lambda u, v, P: stone(P[..., 1] + 0.5, P[..., 2]), 0.7)
        sc.box(-0.56, -0.56, 0, 0.56, 0.56, 46, g, g, tone=0.8, scale=0.5)   # the battered foot
        sc.box(-0.57, -0.57, H - 44, 0.57, 0.57, H, cop, M['frieze'], front=M['frieze'], scale=1)
        for x0 in (-0.57, 0.27):
            for y0 in (-0.57, 0.27): sc.box(x0, y0, H, x0 + 0.3, y0 + 0.3, H + 54, cop, g)
        if name == 'rampart_v':
            c = cloths['war']
            sc.quad((-0.44, 0.51, H - 60), (0.88, 0, 0), (0, 0, -PANEL * 1.9), lambda u, v, P: sample(c, u * 0.999, v * 0.999), 0.95)
        done(sc, name, 40)
    sc = Scene()   # the guard tower
    R, TH_ = 1.42, PANEL * 6.1
    def mod(th, z):
        zz = z % PANEL
        m = np.where((zz < 9) | (zz > PANEL - 7), 0.72, 1.0) * (0.66 + 0.34 * np.clip(z / 420, 0, 1))
        a = (th * 6 / math.pi) % 1
        slit = (np.abs(a - 0.5) < 0.035) & (((z > PANEL * 2.3) & (z < PANEL * 2.8)) | ((z > PANEL * 4.3) & (z < PANEL * 4.8)))
        return np.where(slit, 0.04, m)
    sc.drum(0, 0, R + 0.1, 0, 60, g, r1=R, mod=lambda th, z: 0.7 + 0 * z)
    sc.drum(0, 0, R, 60, TH_ - 60, g, top=False, mod=mod)
    sc.drum(0, 0, R, TH_ - 60, TH_, M['frieze'], r1=R + 0.16, scale=0.7)
    sc.drum(0, 0, R + 0.16, TH_, TH_ + 8, cop)
    for k in range(12):
        a = k * math.pi / 6 + 0.26
        x, y = (R + 0.02) * math.cos(a), (R + 0.02) * math.sin(a)
        sc.box(x - 0.16, y - 0.16, TH_ + 8, x + 0.16, y + 0.16, TH_ + 62, cop, g)
    sc.drum(0, 0, 0.5, TH_ + 8, TH_ + 50, g); sc.drum(0, 0, 0.62, TH_ + 50, TH_ + 170, M['slate'], r1=0.0, top=False)
    sc.drum(0, 0, 0.03, TH_ + 160, TH_ + 330, M['beam'])
    c = cloths['gold']
    sc.quad((0.03, 0.0, TH_ + 326), (0.62, 0, 0), (0, 0, -100), lambda u, v, P: sample(c, u * 0.999, v * 0.999))
    done(sc, 'rampart_tower', 44)
    SS = ss0


SEAMS = {   # cover: (texture, tone)
    'gravel': (GT + 'road_gravel_c.webp', 0.82), 'moss': (GT + 'moss_1_c.webp', 0.8), 'scree': (GT + 'p2/p2_scree_c.webp', 0.9), 'rubble': (GT + 'rubble_c.webp', 0.8),
    'bones': (P2 + '05_17_bones_ground.png', 0.95), 'straw': (P2 + '05_16_straw_ground.png', 0.92), 'litter': (P2 + '05_18_street_litter.png', 0.9), 'ash': (GT + 'road_ash_c.webp', 0.8),
}
CARPET = {'gold': (42, 1.0, 0.98), 'blue': (220, 0.85, 0.9), 'red': (356, 0.95, 0.9), 'green': (132, 0.75, 0.85)}


def main():
    global BM
    BM = sys.argv[1] if len(sys.argv) > 1 else '../bm'
    tiles = []   # (group, name, key, image)
    for i, (n, (src, tone)) in enumerate(SEAMS.items()):
        t = tex(src, 256, tone)
        for side in range(4):
            for q in range(4): tiles.append(('seams', n, side * 4 + q, seam(t, side, q % 2, q // 2, 11 + i * 5)))
        for k in range(4): tiles.append(('patches', n, k, patch(t, k, i)))
    for k in range(4): tiles.append(('patches', 'puddle', k, patch(tex(SEAMS['gravel'][0], 256, 0.6), k, 99, puddle=True)))
    floors = {}
    for col, (h, s, l) in CARPET.items(): floors['carpet_' + col] = tex(P2 + '03_09_thorn_brocade.png', 512, 0.92, 1.0, hue=(h, s, l))
    floors['arena_sand'] = np.clip(tex('assets/desert/Desert_Fantasy_Textures/04_pebbled_sand.png', 512, 0.9, 0.55) * np.array([0.86, 0.72, 0.52], np.float32), 0, 1)   # warm: the one bright floor of its hall
    floors['bronze_plates'] = ph('04_15_bronze_plates', size=512, tone=0.62)
    floors['fishscale_slate'] = ph('04_14_fishscale_slate', size=512, tone=0.66)
    floors['dye_flags'] = ph('01_20_dye_flags', size=512, tone=0.74)
    for n, t in floors.items():
        for q in range(4): tiles.append(('floors', n, q, diamond(t, q % 2, q // 2)))
    props = props_and_banners()
    cols = 16
    rows = (len(tiles) + cols - 1) // cols
    Wd = cols * 160
    # shelf-pack the props under the tiles
    x = y = 0; rowh = 0; place = {}
    for n, (im, ox, oy) in sorted(props.items(), key=lambda p: -p[1][0].height):
        if x + im.width + 2 > Wd: x, y, rowh = 0, y + rowh + 2, 0
        place[n] = (x, y); x += im.width + 2; rowh = max(rowh, im.height)
    atlas = Image.new('RGBA', (Wd, rows * 80 + y + rowh + 2), (0, 0, 0, 0))
    meta = {'tile': [160, 80], 'seams': {}, 'patches': {}, 'floors': {}, 'props': {}}
    for k, (grp, n, key, im) in enumerate(tiles):
        px, py = (k % cols) * 160, (k // cols) * 80
        atlas.paste(im, (px, py))
        meta[grp].setdefault(n, [None] * (16 if grp == 'seams' else 4))[key] = [px, py]
    for n, (im, ox, oy) in props.items():
        px, py = place[n]; py += rows * 80
        atlas.paste(im, (px, py)); meta['props'][n] = [px, py, im.width, im.height, ox, oy]
    os.makedirs('assets/tiles/phobos', exist_ok=True)
    atlas.save('assets/tiles/phobos/dress.webp', 'WEBP', lossless=True, method=6)
    json.dump(meta, open('assets/tiles/phobos/dress.json', 'w'), separators=(',', ':'))
    print('dress.webp', atlas.size, len(tiles), 'tiles,', len(props), 'props', os.path.getsize('assets/tiles/phobos/dress.webp') // 1024, 'KB')
    if len(sys.argv) > 2:   # a review sheet of the props on grey
        sh = Image.new('RGBA', (Wd, y + rowh + 2), (70, 66, 62, 255))
        for n, (im, ox, oy) in props.items(): sh.alpha_composite(im, place[n])
        sh.save(sys.argv[2])


if __name__ == '__main__':
    main()
