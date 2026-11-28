"""The birds (src/gfx/phoenix3d.js, src/gfx/birds3d.js), built from nothing: the Ranger's phoenix and the Carrion Witch's
raven. One generator makes both: a lathed body, neck and head, a hooked beak with a jaw, burning eyes, a crest of flame
plumes, wings of layered feather cards (lesser/median/greater coverts, tertials, secondaries, ten primaries with
fingered tips), a tail fan and seven long plumes with flame eyes, feathered legs and talons. The textures are painted
here with numpy (feather vanes, barbs and splits cut into the alpha; a ramp from white-hot gold at the body to crimson
tips; an emissive map for the burning edges, crest, eyes and tail). The rig and the clips (fly, glide, hover, stoop,
strike, screech, flare) are keyed here too.

    /opt/bl/venv/bin/python tools/blender/phoenix.py [phoenix|raven|all] [--tex]
Writes assets/models/beasts/phoenix.glb and raven.glb (--tex: only the texture PNGs, into the temp folder, to look at)."""
import bpy, sys, os, math, json, struct, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector, Quaternion

A = 1024
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))      # the bird: left, back, up (it faces -y)
TMP = os.path.join(tempfile.gettempdir(), 'velscour_birds'); os.makedirs(TMP, exist_ok=True)
rad, sin, cos, pi = math.radians, math.sin, math.cos, math.pi
lerp = lambda a, b, t: a + (b - a) * t


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def fs(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ the two birds
FIRE = [(0, (1, .98, .86)), (.14, (1, .92, .55)), (.32, (1, .76, .2)), (.5, (.99, .53, .07)), (.68, (.93, .27, .03)), (.86, (.66, .06, .03)), (1, (.34, .02, .04))]
GLOW = [(0, (1, .62, .16)), (.45, (1, .42, .06)), (.8, (1, .18, .03)), (1, (.8, .08, .02))]
NIGHT = [(0, (.46, .48, .62)), (.2, (.29, .3, .43)), (.45, (.16, .16, .25)), (.7, (.09, .085, .14)), (1, (.04, .035, .06))]
SHEEN = [(0, (.34, .3, .75)), (.5, (.24, .16, .6)), (1, (.3, .12, .55))]
SPEC = {
    'phoenix': dict(fire=True, pal=FIRE, glow=GLOW, em=1.0, bodyem=1.0, crest=7, plumes=7, plume=[1.5, 1.72, 1.95, 2.2, 1.95, 1.72, 1.5], retrix=0.5, rag=0.45,
                    prim=[.56, .6, .64, .69, .75, .81, .86, .88, .83, .7], span=1.16, beak='hook', tex=1024, radius=3.05,
                    body_t=[(0, .7), (.3, .56), (.5, .4), (.66, .2), (.8, .3), (.9, .4), (1, .46)], eye=(1, .95, .6)),
    'raven': dict(fire=False, pal=NIGHT, glow=SHEEN, em=0.32, bodyem=0.3, crest=0, plumes=0, plume=[], retrix=0.62, rag=1.0,
                  prim=[.46, .48, .5, .53, .57, .61, .64, .65, .6, .5], span=0.9, beak='crow', tex=512, radius=2.0,
                  body_t=[(0, .75), (.3, .6), (.55, .5), (.75, .4), (1, .3)], eye=(1, .1, .05)),
}

# atlas rectangles (x, y, w, h), the feather's root at the top
R = {'body': (0, 0, 512, 512), 'plume': (896, 0, 128, 1024),
     **{f'prim{i}': (512 + 56 * i, 0, 56, 512) for i in range(6)}, 'wisp': (848, 0, 48, 512),
     **{f'sec{i}': (72 * i, 512, 72, 384) for i in range(4)}, **{f'ret{i}': (288 + 72 * i, 512, 72, 384) for i in range(2)},
     **{f'crest{i}': (432 + 64 * i, 512, 64, 384) for i in range(3)},
     **{f'great{i}': (624 + 80 * i, 512, 80, 192) for i in range(3)}, **{f'med{i}': (624 + 80 * i, 704, 80, 128) for i in range(3)},
     **{f'hack{i}': (624 + 64 * i, 832, 64, 160) for i in range(3)}, 'less0': (816, 832, 64, 64), 'less1': (816, 896, 64, 64),
     'beak': (0, 896, 128, 128), 'claw': (128, 896, 128, 128), 'eye': (256, 896, 64, 64), 'under0': (320, 896, 96, 128), 'under1': (416, 896, 96, 128)}


def uvf(rect, a, y, inset=1.5):
    x0, y0, w, h = R[rect] if isinstance(rect, str) else rect
    return ((x0 + inset + (a * 0.5 + 0.5) * (w - 2 * inset)) / A, 1 - (y0 + inset + y * (h - 2 * inset)) / A)


# ------------------------------------------------------------------ painting
def ramp(stops, t):
    t = np.clip(t, 0, 1); pos = [s[0] for s in stops]
    return np.stack([np.interp(t, pos, [s[1][c] for s in stops]) for c in range(3)], -1)


def noise(w, h, cell, seed, octs=3):
    rng = np.random.default_rng(seed); out = np.zeros((h, w)); amp, tot = 1, 0
    for _ in range(octs):
        g = rng.random((max(2, int(h / cell) + 2), max(2, int(w / cell) + 2)))
        out += np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255 * amp
        tot += amp; amp *= 0.5; cell = max(1, cell / 2)
    return out / tot


def feather(S, w, h, t0, t1, shape, seed, asp, asym=1.0, em=1.0, rag=None):
    """One feather, root at the top: (rgb, alpha, emissive). asp: its real length / width (sets the barbs' slant)."""
    rng = np.random.default_rng(seed); rag = S['rag'] if rag is None else rag
    x = np.linspace(-1, 1, w)[None, :] * np.ones((h, 1)); y = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    cx = np.zeros_like(x)
    if shape == 'prim' or shape == 'finger':
        hw = (0.3 + 0.62 * sstep(0.04, 0.38, y)) * np.sqrt(np.clip(1 - np.clip((y - 0.7) / 0.3, 0, 1) ** 2, 0, 1))
        if shape == 'finger': hw *= 1 - 0.4 * sstep(0.4, 0.58, y)
    elif shape == 'sec':
        hw = (0.42 + 0.5 * sstep(0.03, 0.3, y)) * np.sqrt(np.clip(1 - np.clip((y - 0.8) / 0.2, 0, 1) ** 2, 0, 1))
    elif shape == 'cov':
        hw = (0.5 + 0.42 * sstep(0, 0.4, y)) * np.sqrt(np.clip(1 - np.clip((y - 0.5) / 0.5, 0, 1) ** 2, 0, 1))
    elif shape == 'hackle':
        hw = 0.9 * np.sin(pi * np.clip(y, 0, 1) ** 0.6) ** 0.85
    else:  # a flame tongue
        cx = 0.3 * np.sin(y * 8 + seed * 2.3) * y * (1.15 - y)
        hw = 0.66 * np.sin(pi * np.clip(y, 0, 1) ** 0.5) ** 1.1 * (0.85 + 0.3 * noise(w, h, w / 2, seed + 5))
    hw = np.maximum(hw, 1e-3)
    side = np.where(x < cx, asym, 1.0)
    xn = (x - cx) / (hw * side); ax = np.abs(xn)
    s = (y * asp * 2 - 1.35 * np.abs(x - cx)) / 0.17                  # constant along a barb
    barb = 0.5 + 0.5 * np.sin(2 * pi * s)
    cut = np.zeros_like(x, bool)
    for sg in (-1, 1):                                                 # splits in the vane, along the barbs
        for _ in range(int(rag * rng.integers(3, 7))):
            sk = rng.uniform(0.12, 0.98) * asp * 2 / 0.17; depth = rng.uniform(0.25, 0.75) * min(1, 0.5 + rag * 0.5); wd = rng.uniform(0.5, 1.5) * (0.6 + rag)
            cut |= (np.sign(xn) == sg) & (ax > 1 - depth) & (np.abs(s - sk) < wd * (ax - (1 - depth)) / depth)
    quill = (np.abs(x - cx) < 0.075 * (1 - 0.6 * y)) & (y < 0.97)
    alpha = ((ax < 1) & ~cut) | quill
    n = noise(w, h, w / 1.5, seed + 1)
    T = t0 + (t1 - t0) * np.clip(y * 0.9 + 0.22 * np.minimum(ax, 1) ** 2 + 0.36 * (n - 0.5), 0, 1)
    col = ramp(S['pal'], T) * ((0.78 + 0.22 * barb) * (0.74 + 0.26 * sstep(0.04, 0.4, ax)))[..., None]
    rim = sstep(0.66, 1.0, ax) * sstep(0.03, 0.2, y)
    col = col + (ramp(S['pal'], T - 0.3) - col) * (rim * 0.65)[..., None]
    rk = np.exp(-((x - cx) / 0.07) ** 2) * (1 - 0.5 * y)
    col = col + (ramp(S['pal'], T - 0.5) - col) * (rk * 0.9)[..., None]
    e = em * S['em'] * (0.3 + 0.7 * np.maximum.reduce([rim * 0.95, sstep(0.5, 1, y) * 0.75, rk * 0.5])) * (0.55 + 0.9 * n)
    return col, alpha, ramp(S['glow'], T) * e[..., None]


def body_tex(S, eye_p, eye_u):
    """The body's feather scales: columns go round the body (0 = the belly seam), rows from the head (top) to the rump."""
    w = h = 512
    U = np.linspace(0, 1, w, endpoint=False)[None, :] * np.ones((h, 1)); V = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    pos = [b[0] for b in S['body_t']]
    tb = np.interp(1 - V, pos, [b[1] for b in S['body_t']]) + 0.12 * np.cos((U - 0.5) * 2 * pi)   # redder along the back, white-hot on the breast
    col = ramp(S['pal'], tb + 0.2); em = np.zeros((h, w, 3)); nz = noise(w, h, 40, 11)
    rows = 46
    for j in range(rows, -2, -1):                                       # rump first: each row lies over the one behind
        cy = j / rows; head = cy < 0.2
        ncol = 26 if head else 16; ry = (1.5 if head else 2.1) / rows; rx = 0.7 / ncol
        dx = ((U * ncol + 0.5 * (j % 2)) % 1 - 0.5) / ncol; dy = V - cy
        rr = np.sqrt((dx / rx) ** 2 + (dy / ry) ** 2); m = rr < 1
        q = np.clip(dy / ry, -1, 1) * 0.5 + 0.5                         # 0 root .. 1 tip
        t = tb + 0.3 - 0.36 * q + 0.14 * (nz - 0.5)
        c = ramp(S['pal'], t) * (0.6 + 0.4 * q)[..., None]
        rim = sstep(0.7, 1.0, rr) * sstep(0.3, 0.7, q)
        c = c + (ramp(S['pal'], t - 0.3) - c) * (rim * 0.8)[..., None]
        shaft = np.exp(-(dx / (rx * 0.09)) ** 2) * 0.5
        c = c + (ramp(S['pal'], t - 0.25) - c) * shaft[..., None]
        e = ramp(S['glow'], t + 0.2) * (S['bodyem'] * (0.16 + 0.5 * (1 - q) ** 2 + 0.25 * rim))[..., None]
        col[m] = c[m]; em[m] = e[m]
    # the falcon's mask: a dark stroke through each eye, back and down the cheek
    ve = 1 - eye_p
    for ue in (eye_u, 1 - eye_u):
        du = (U - ue) * 2.4; dv = V - ve
        mask = np.exp(-((du / 0.085) ** 2 + ((dv - 0.25 * np.abs(du)) / 0.03) ** 2)) + 0.8 * np.exp(-(((du) / 0.03) ** 2 + ((dv - 0.035) / 0.04) ** 2))
        mk = np.clip(mask, 0, 1)[..., None]
        col = col * (1 - mk) + np.array(S['pal'][-1][1]) * 0.7 * mk; em = em * (1 - mk * 0.8)
    return col, np.ones((h, w), bool), em


def plume_tex(S, L, wg):
    """A tail plume: the shaft, sparse streaming barbs, and the flame eye near its end. wg(y): the card's half width."""
    w, h = 128, 1024; rng = np.random.default_rng(77)
    xn = np.linspace(-1, 1, w)[None, :] * np.ones((h, 1)); y = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    g = wg(y); xr = xn * g; ax = np.abs(xr)
    T = 0.1 + 0.6 * y + 0.3 * (ax / g) ** 2
    s = (y * L - 1.2 * ax) / 0.02; idx = np.floor(s).astype(int) % 997
    lens = rng.uniform(0.4, 1.0, 997) ** 0.6; gap = rng.uniform(0, 1, 997)
    blen = lens[idx] * g * 0.95 * sstep(0.0, 0.05, y) * (1 - 0.55 * sstep(0.62, 0.76, y))
    fil = ((s % 1) < 0.6 + 0.4 * (gap[idx] < 0.75)) & (ax < blen)                 # a frayed vane: barbs in locks, gaps between
    shaft = ax < 0.011 * (1.2 - 0.5 * y)
    ye, Re = 0.865, 0.105
    r = np.sqrt(xr ** 2 + ((y - ye) * L * 0.5) ** 2) / Re
    fray = 0.5 + 0.5 * np.sin(2 * pi * ((y - ye) * L * 1.2 + 1.0 * ax) / 0.016)
    eye = r < 0.86 + 0.2 * fray * sstep(0.5, 0.9, r)
    tip = (y > ye) & (ax < 0.035 * np.clip(1 - (y - ye) / (1 - ye), 0, 1) ** 0.8 * (0.6 + 0.4 * fray))
    alpha = fil | shaft | eye | tip
    col = ramp(S['pal'], T) * (0.8 + 0.2 * (s % 1 < 0.25))[..., None]
    col[shaft] = ramp(S['pal'], T - 0.35)[shaft]
    # the eye: white-hot core, a ring of blue flame, a dark iris, a gold ring, a frayed crimson rim
    rings = [(0, (1, 1, .9)), (.1, (1, .95, .6)), (.24, (1, .66, .14)), (.34, (.98, .34, .04)), (.4, (.5, .04, .04)), (.44, (.22, .02, .06)), (.56, (.34, .03, .05)),
             (.62, (1, .85, .35)), (.72, (1, .6, .1)), (.86, (.9, .25, .04)), (1.1, (.6, .05, .03))]
    ec = ramp([(a / 1.1, b) for a, b in rings], r / 1.1) * (0.85 + 0.15 * fray)[..., None]
    col[eye] = ec[eye]
    eg = [(0, (1, 1, .9)), (.1, (1, .9, .5)), (.24, (1, .5, .08)), (.34, (.9, .2, .02)), (.4, (.2, .01, 0)), (.44, (.05, 0, 0)), (.56, (.1, 0, 0)), (.62, (1, .7, .2)), (.72, (1, .4, .05)), (1.1, (.7, .1, .02))]
    em = ramp(S['glow'], T) * (0.55 * fil + 1.0 * shaft + 0.8 * tip)[..., None]
    em[eye] = (ramp([(a / 1.1, b) for a, b in eg], r / 1.1))[eye]
    return col, alpha, em * S['em']


def small_tex(S):
    """Beak, legs and claws, the eye."""
    out = {}
    w = h = 128
    x = np.linspace(-1, 1, w)[None, :] * np.ones((h, 1)); y = np.linspace(0, 1, h)[:, None] * np.ones((1, w)); n = noise(w, h, 10, 3)
    fire = S['fire']
    bk = [(0, (1, .86, .42)), (.2, (1, .62, .12)), (.5, (.6, .24, .05)), (.8, (.2, .08, .05)), (1, (.08, .04, .04))] if fire else [(0, (.3, .3, .34)), (.3, (.14, .14, .17)), (1, (.03, .03, .04))]
    c = ramp(bk, y + 0.1 * (n - 0.5)) * (0.75 + 0.35 * np.exp(-((x - 0.1) / 0.25) ** 2))[..., None]
    e = ramp(GLOW, y) * (0.5 * (1 - y) ** 2 + 0.3 * sstep(0.8, 1, np.abs(x)))[..., None] * fire
    out['beak'] = (c, np.ones((h, w), bool), e)
    sc = 0.5 + 0.5 * np.sin(y * 40 + 2 * np.abs(x))
    lg = [(0, (1, .7, .2)), (.45, (.75, .4, .08)), (.62, (.3, .12, .05)), (1, (.05, .03, .03))] if fire else [(0, (.2, .2, .22)), (.5, (.1, .1, .12)), (1, (.02, .02, .02))]
    c = ramp(lg, y) * (0.7 + 0.3 * sc * (y < 0.5) + 0.3 * (y >= 0.5))[..., None]
    e = ramp(GLOW, 0.3 + 0.7 * y) * (0.25 * (1 - sc) * (y < 0.5) + 0.7 * sstep(0.85, 1, y))[..., None] * fire
    out['claw'] = (c, np.ones((h, w), bool), e)
    w = h = 64
    x = np.linspace(-1, 1, w)[None, :] * np.ones((h, 1)); y = np.linspace(-1, 1, h)[:, None] * np.ones((1, w)); r = np.sqrt(x * x + y * y)
    ey = S['eye']; c = ramp([(0, (1, 1, 1)), (.35, ey), (1, tuple(v * 0.7 for v in ey))], r)
    pupil = (np.abs(x) < 0.16 * (1 - y * y)) if fire else (r < 0.3)
    c[pupil] = (.05, .0, .0) if fire else (0, 0, 0)
    e = c * 1.0; e[pupil] = (.2, .02, 0) if fire else (0, 0, 0)
    out['eye'] = (c, np.ones((h, w), bool), e)
    return out


def paint(name, S, plume_L, wg, eye_p, eye_u):
    col = np.zeros((A, A, 3)); col[:] = S['pal'][3][1]; alpha = np.zeros((A, A), bool); em = np.zeros((A, A, 3))

    def put(rect, t):
        x0, y0, w, h = R[rect]; col[y0:y0 + h, x0:x0 + w] = t[0]; alpha[y0:y0 + h, x0:x0 + w] = t[1]; em[y0:y0 + h, x0:x0 + w] = t[2]
    put('body', body_tex(S, eye_p, eye_u))
    if S['plumes']: put('plume', plume_tex(S, plume_L, wg))
    for i in range(6): put(f'prim{i}', feather(S, 56, 512, 0.36 + 0.03 * i, 0.9 + 0.035 * (i % 3) + (0.04 if i > 2 else 0), 'finger' if i > 2 else 'prim', 20 + i, 5.5, asym=0.62))
    for i in range(4): put(f'sec{i}', feather(S, 72, 384, 0.26 + 0.04 * i, 0.82 + 0.03 * i, 'sec', 30 + i, 4.2, asym=0.8))
    for i in range(2): put(f'ret{i}', feather(S, 72, 384, 0.24 + 0.1 * i, 0.8 + 0.14 * i, 'sec', 40 + i, 4.0))
    for i in range(3): put(f'crest{i}', feather(S, 64, 384, 0.4, 0.9 + 0.04 * i, 'flame', 50 + i, 5, em=1.5, rag=0.3))
    put('wisp', feather(S, 48, 512, 0.0, 0.8, 'flame', 58, 7, em=1.6, rag=0.2))
    for i in range(3): put(f'great{i}', feather(S, 80, 192, 0.3 + 0.06 * i, 0.64 + 0.08 * i, 'cov', 60 + i, 2.6, em=1.0))
    for i in range(3): put(f'med{i}', feather(S, 80, 128, 0.24 + 0.06 * i, 0.52 + 0.08 * i, 'cov', 70 + i, 2.0, em=1.0))
    for i in range(3): put(f'hack{i}', feather(S, 64, 160, 0.0 + 0.14 * i, 0.3 + 0.18 * i, 'hackle', 80 + i, 2.8, em=0.8))
    for i in range(2): put(f'less{i}', feather(S, 64, 64, 0.2 + 0.08 * i, 0.42 + 0.1 * i, 'cov', 90 + i, 1.3, em=0.9, rag=0.2))
    for i in range(2): put(f'under{i}', feather(S, 96, 128, 0.22 + 0.1 * i, 0.5 + 0.12 * i, 'cov', 95 + i, 1.8, em=1.0))
    for k, t in small_tex(S).items(): put(k, t)
    size = S['tex']
    rgba = np.dstack([np.clip(col, 0, 1), alpha.astype(float)])
    paths = []
    for tag, arr in (('col', rgba), ('em', np.clip(em, 0, 1))):
        im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
        if size != A: im = im.resize((size, size), Image.LANCZOS)
        p = os.path.join(TMP, f'{name}_{tag}.png'); im.save(p); paths.append(p)
    return paths


# ------------------------------------------------------------------ the mesh
class Mesh:
    def __init__(self): self.co, self.uv, self.w, self.f = [], [], [], []

    def v(self, co, uv, w):
        self.co.append(Vector(co)); self.uv.append(uv); self.w.append(w if isinstance(w, list) else [(w, 1.0)]); return len(self.co) - 1

    def quad(self, a, b, c, d): self.f.append((a, b, c, d))

    def tri(self, a, b, c): self.f.append((a, b, c))

    def mirror(self, start_v, start_f):
        """Copy everything from start_v/start_f on to the right side (x -> -x, _L -> _R)."""
        n = len(self.co); off = n - start_v
        for i in range(start_v, n):
            c = self.co[i]; self.co.append(Vector((-c.x, c.y, c.z))); self.uv.append(self.uv[i])
            self.w.append([(b[:-2] + '_R' if b.endswith('_L') else b, k) for b, k in self.w[i]])
        for f in self.f[start_f:]: self.f.append(tuple(i + off for i in reversed(f)))

    def tris(self): return sum(len(f) - 2 for f in self.f)


def card(M, root, d, up, L, W, rect, nseg, wfn, camber=0.07, droop=0.04, roll=0.0, bend=0.0):
    """A feather: a strip three vertices wide (the shaft raised), from root along d. bend: curls toward up along its length."""
    d = d.normalized(); side = up.cross(d).normalized(); n = d.cross(side).normalized()
    if roll: q = Quaternion(d, roll); side = q @ side; n = q @ n
    rows = []
    for k in range(nseg + 1):
        y = k / nseg; c = root + d * (L * y) - n * (droop * L * y * y) + n * (bend * L * y * y)
        rows.append([M.v(c + side * (a * W / 2) + (n * (camber * W) if a == 0 else Vector()), uvf(rect, a, y), wfn(y)) for a in (-1, 0, 1)])
    for k in range(nseg):
        for a in (0, 1): M.quad(rows[k][a + 1], rows[k][a], rows[k + 1][a], rows[k + 1][a + 1])


def ribbon(M, pts, sides, widths, rect, wfn, camber=0.05):
    rows = []; m = len(pts) - 1
    for k, (c, s, hw) in enumerate(zip(pts, sides, widths)):
        t = (pts[min(m, k + 1)] - pts[max(0, k - 1)]).normalized(); n = t.cross(s).normalized()
        rows.append([M.v(c + s * (a * hw) + (n * (camber * hw * 2) if a == 0 else Vector()), uvf(rect, a, k / m), wfn(k / m)) for a in (-1, 0, 1)])
    for k in range(m):
        for a in (0, 1): M.quad(rows[k][a + 1], rows[k][a], rows[k + 1][a], rows[k + 1][a + 1])


def spline(P, n):
    """Catmull-Rom through rows of numbers, n samples."""
    P = [np.array(p, float) for p in P]; out = []
    for i in range(n):
        t = i / (n - 1) * (len(P) - 1); k = min(int(t), len(P) - 2); u = t - k
        p0, p1, p2, p3 = P[max(0, k - 1)], P[k], P[k + 1], P[min(len(P) - 1, k + 2)]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out


def tube(M, pts, radii, seg, uvfn, wfn, ref=X, close=True):
    """A lathed skin along pts; radii: (across ref, across the other axis) per point. uvfn(k, a) with k along 0..1, a round 0..1."""
    m = len(pts) - 1; rows = []
    for k, (c, r) in enumerate(zip(pts, radii)):
        t = (pts[min(m, k + 1)] - pts[max(0, k - 1)]).normalized()
        s = (ref - t * ref.dot(t)).normalized(); n = s.cross(t).normalized()
        if n.z < 0 and abs(ref.x) > 0.5: n = -n
        row = []
        for j in range(seg + 1):
            a = j / seg * 2 * pi - pi / 2                                    # from the underside round
            row.append(M.v(c + s * (cos(a) * r[0]) + n * (sin(a) * r[1]), uvfn(k / m, j / seg), wfn(k / m, c)))
        rows.append(row)
    for k in range(m):
        for j in range(seg): M.quad(rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j])
    return rows


# body: (forward, up, half width, half height) from the rump to the face
BODY = [(-.5, .03, .02, .02), (-.43, .03, .085, .07), (-.27, .012, .155, .14), (-.07, -.012, .2, .195), (.11, -.02, .215, .23), (.27, .0, .185, .21),
        (.39, .055, .125, .15), (.49, .12, .088, .1), (.58, .175, .076, .082), (.66, .212, .084, .086), (.74, .225, .088, .083), (.81, .216, .072, .068), (.865, .2, .046, .046)]
SPINE = [('body', -.25), ('chest', .14), ('neck1', .4), ('neck2', .52), ('head', .66)]
# the left wing's joints: shoulder, elbow, wrist, knuckle, finger tip
WS, WE, WW, WH, WT = Vector((.16, -.2, .1)), Vector((.46, -.09, .1)), Vector((.8, -.22, .1)), Vector((1.08, -.13, .1)), Vector((1.26, -.02, .1))
FAN = rad(6.5)


def spine_w(f):
    for (b0, f0), (b1, f1) in zip(SPINE, SPINE[1:]):
        if f <= f0: return [(b0, 1.0)]
        if f < f1: t = fs(f0, f1, f); return [(b0, 1 - t), (b1, t)]
    return [(SPINE[-1][0], 1.0)]


def build(name):
    S = SPEC[name]; fire = S['fire']
    M = Mesh()
    # --- the body
    NR, SEG = 30, 16
    ring = spline(BODY, NR)
    cl = [Vector((0, -r[0], r[1])) for r in ring]
    arc = [0.0]
    for a, b in zip(cl, cl[1:]): arc.append(arc[-1] + (b - a).length)
    par = [a / arc[-1] for a in arc]
    pf = lambda f: float(np.interp(f, [r[0] for r in ring], par))                 # along the body by how far forward
    eye_k = min(range(NR), key=lambda k: abs(ring[k][0] - 0.765)); eye_p = par[eye_k]; eye_a = rad(24); eye_u = (eye_a + pi / 2) / (2 * pi)
    plume_L = max(S['plume']) if S['plumes'] else 1
    wg = lambda y: 0.062 + 0.035 * y + 0.1 * np.exp(-((y - 0.865) / 0.085) ** 2)
    tex = paint(name, S, plume_L, wg, eye_p, eye_u)
    if '--tex' in sys.argv: print('textures', tex); return None
    body_uv = lambda k, a: ((a * 512) / A, 1 - ((1 - k) * 511 + 0.5) / A)
    rows = tube(M, cl, [(r[2], r[3]) for r in ring], SEG, lambda k, a: body_uv(par[round(k * (NR - 1))], a), lambda k, c: spine_w(-c.y))

    def surf(p, a):
        """A point on the body skin and its outward normal, p along 0..1 (rump..face), a the angle round (0 = left side, 90 = top)."""
        k = min(NR - 2, max(0, int(np.searchsorted(par, p)) - 1)); u = (p - par[k]) / (par[k + 1] - par[k])
        c = cl[k].lerp(cl[k + 1], u); rl = lerp(ring[k][2], ring[k + 1][2], u); ru = lerp(ring[k][3], ring[k + 1][3], u)
        t = (cl[k + 1] - cl[k]).normalized(); n = X.cross(t).normalized()
        if n.z < 0: n = -n
        pt = c + X * (cos(a) * rl) + n * (sin(a) * ru)
        nr = (X * (cos(a) / max(rl, 1e-3)) + n * (sin(a) / max(ru, 1e-3))).normalized()
        return pt, nr, t
    # --- hackles: pointed feathers standing off the neck, breast, mantle and flanks
    rng = np.random.default_rng(5)
    for p0, cnt, L, lift, var in ((.86, 9, .1, .5, 0), (.8, 10, .13, .45, 0), (.74, 11, .16, .4, 0), (.68, 12, .19, .36, 1), (.61, 12, .2, .3, 1), (.53, 13, .2, .26, 1),
                                  (.44, 12, .2, .24, 2), (.34, 11, .2, .22, 2), (.24, 9, .19, .22, 2), (.15, 7, .17, .22, 2)):
        for i in range(cnt):
            a = (i + 0.5 * (int(p0 * 100) % 2)) / cnt * 2 * pi + rng.uniform(-.1, .1)
            if p0 > 0.83 and sin(a) < 0.2: continue                      # nothing under the chin
            pt, nr, t = surf(p0 + rng.uniform(-.012, .012), a)
            d = (-t * cos(lift) + nr * sin(lift)).normalized()
            ww = spine_w(-pt.y)
            card(M, pt - nr * 0.01, d, nr, L * rng.uniform(.85, 1.2) * (1.25 if not fire and sin(a) < -0.3 and p0 > 0.6 else 1), 0.075 if p0 > 0.7 else 0.1, f'hack{var}', 2, lambda y, ww=ww: ww, camber=0.1, droop=0.25)
    # --- the beak and the jaw
    if S['beak'] == 'hook':
        up = [(.855, .208, .05, .046), (.9, .212, .044, .042), (.95, .2, .034, .036), (.99, .176, .022, .028), (1.012, .145, .011, .016), (1.012, .112, .001, .002)]
        lo = [(.85, .178, .036, .02), (.9, .168, .03, .017), (.95, .158, .02, .012), (.985, .153, .004, .004)]
    else:
        up = [(.85, .208, .052, .05), (.91, .212, .05, .052), (.98, .205, .042, .046), (1.05, .185, .028, .034), (1.1, .158, .012, .016), (1.115, .135, .001, .002)]
        lo = [(.85, .178, .04, .024), (.92, .17, .036, .022), (.99, .16, .026, .017), (1.06, .15, .005, .005)]
    for prof, bone, band in ((up, 'head', (0, .62)), (lo, 'jaw', (.62, 1))):
        pp = spline(prof, 7)
        tube(M, [Vector((0, -p[0], p[1])) for p in pp], [(p[2], p[3]) for p in pp], 8, lambda k, a, band=band: uvf('beak', lerp(band[0], band[1], abs(a * 2 - 1)) * 2 - 1, k), lambda k, c, bone=bone: [(bone, 1.0)])
    # --- eyes (a glowing bead under a brow) and the flame that streams from each
    v0, f0 = len(M.co), len(M.f)
    pt, nr, t = surf(eye_p, eye_a)
    es = 0.026 if fire else 0.02
    ctr = M.v(pt + nr * 0.012, uvf('eye', 0, 0.5), 'head'); rim = []
    for j in range(8):
        a = j / 8 * 2 * pi; o = -t * (cos(a) * es * 1.25) + nr.cross(t) * (sin(a) * es)
        rim.append(M.v(pt + nr * 0.002 + o, uvf('eye', cos(a) * 0.9, 0.5 + sin(a) * 0.45), 'head'))
    for j in range(8): M.tri(ctr, rim[(j + 1) % 8], rim[j])
    brow = nr.cross(t)                                                     # a heavy brow: a dark wedge over the eye, sloping to the beak
    b0 = M.v(pt + nr * 0.03 - t * 0.055 + brow * 0.012, uvf('claw', 0, 0.7), 'head'); b1 = M.v(pt + nr * 0.036 + t * 0.045 + brow * 0.03, uvf('claw', 0.3, 0.75), 'head')
    b2 = M.v(pt + nr * 0.006 + t * 0.05 + brow * 0.04, uvf('claw', 0.3, 0.6), 'head'); b3 = M.v(pt + nr * 0.004 - t * 0.05 + brow * 0.03, uvf('claw', 0, 0.6), 'head')
    M.quad(b0, b1, b2, b3)
    if fire:
        for i, (L, lift) in enumerate(((.3, .5), (.2, .15))):
            card(M, pt + nr * 0.01 + t * 0.01, (t * 1.0 + Z * lift + X * 0.35).normalized(), (nr + Z * 0.5).normalized(), L, 0.07, 'wisp', 4,
                 lambda y: [('head', 1 - 0.7 * y), ('crest1', 0.7 * y)], camber=0.1, droop=-0.2)
    # --- legs: feathered thighs, scaled shanks, four clawed toes
    hip, knee, ankle, foot = Vector((.1, .09, -.12)), Vector((.115, .21, -.2)), Vector((.115, .36, -.2)), Vector((.115, .43, -.215))
    tp = [hip.lerp(knee, k / 3) for k in range(4)]
    tube(M, tp, [(.075, .085), (.07, .075), (.05, .05), (.028, .028)], 7, lambda k, a: body_uv(0.3 + 0.1 * k, a * 0.5), lambda k, c: [('leg_L', 1.0)] if k > 0.2 else [('leg_L', .5), ('body', .5)])
    for i in range(6):
        a = i / 6 * 2 * pi; o = X * (cos(a) * .05) + Z * (sin(a) * .05)
        card(M, hip.lerp(knee, 0.45) + o, (knee - hip).normalized() + o * 3, o.normalized(), 0.15, 0.08, 'hack2', 1, lambda y: [('leg_L', 1.0)], camber=0.1)
    tube(M, [knee, knee.lerp(ankle, .5), ankle, foot], [(.022, .022), (.018, .018), (.02, .02), (.024, .018)], 5, lambda k, a: uvf('claw', a * 2 - 1, k * 0.45),
         lambda k, c: [('shin_L', 1.0)] if k < 0.8 else [('foot_L', 1.0)])
    for ang, L in ((-.5, .15), (0, .17), (.5, .15), (pi, .12)):               # three toes forward (they trail in flight), the hallux back
        d0 = Vector((sin(ang) * 0.7, cos(ang), 0)).normalized()
        tpts = [foot + d0 * (L * u) + Z * (-0.012 + 0.05 * sin(u * pi) - 0.075 * u * u) for u in (0, .3, .6, .85, 1)]
        tube(M, tpts, [(.014, .013), (.012, .012), (.011, .011), (.008, .01), (.001, .001)], 5, lambda k, a: uvf('claw', a * 2 - 1, 0.45 + k * 0.55), lambda k, c: [('foot_L', 1.0)], ref=X if abs(d0.x) < 0.5 else Y)
    # --- the wing
    sp = S['span']; joints = [WS, WS + (WE - WS) * sp, None, None, None]
    joints[2] = joints[1] + (WW - WE) * sp; joints[3] = joints[2] + (WH - WW) * sp; joints[4] = joints[3] + (WT - WH) * sp
    JS, JE, JW, JH, JT = joints
    seglen = [(joints[i + 1] - joints[i]).length for i in range(4)]; tot = sum(seglen); cum = [0]
    for s in seglen: cum.append(cum[-1] + s / tot)

    def lead(q):
        """The wing's leading edge at q 0..1 (shoulder..finger tip): point, segment index, how far along it."""
        i = min(3, max(0, int(np.searchsorted(cum, q, side='right')) - 1)); u = (q - cum[i]) / (cum[i + 1] - cum[i])
        return joints[i].lerp(joints[i + 1], u), i, u
    BN = ['wingA_L', 'wingB_L', 'wingC_L', 'wingD_L']

    def wing_w(q, soft=0.05):
        pt, i, u = lead(q); w = {BN[i]: 1.0}
        d0 = (q - cum[i]); d1 = (cum[i + 1] - q)
        if i > 0 and d0 < soft: k = 0.5 * (1 - d0 / soft); w = {BN[i]: 1 - k, BN[i - 1]: k}
        if i < 3 and d1 < soft: k = 0.5 * (1 - d1 / soft); w = {BN[i]: 1 - k, BN[i + 1]: k}
        return list(w.items())
    dirv = lambda al: Vector((cos(al), sin(al), 0))
    flexed = lambda base, bone, amt: (lambda y: [(b, k * (1 - amt * fs(.15, 1, y))) for b, k in base] + [(bone, amt * fs(.15, 1, y))])
    tipL = None
    # under coverts first (the pale lining), then the flight feathers, then three rows of coverts over them
    for i in range(14):
        q = 0.04 + 0.86 * i / 13; pt, sg, u = lead(q); al = rad(lerp(88, 55, fs(cum[2], 1, q)))
        card(M, pt + Vector((0, .03, -.022)), dirv(al), Z, 0.3 * (1 - 0.3 * fs(.7, 1, q)), 0.12, f'under{i % 2}', 1, (lambda w: lambda y: w)(wing_w(q)), camber=-0.05, droop=0.02)
    PR = S['prim']
    for i in range(10):
        p = i / 9; pt, sg, u = lead(lerp(cum[2], 0.985, p)); al = rad(lerp(76, 15, p ** 0.9))
        base = [('wingC_L', 1.0)] if i <= 5 else [('wingC_L', .6), ('wingD_L', .4)] if i == 6 else [('wingC_L', .3), ('wingD_L', .7)] if i == 7 else [('wingD_L', 1.0)]
        root = pt + Vector((0, .02, -.008 + .0022 * i))
        card(M, root, dirv(al), Z, PR[i], 0.135, f'prim{i % 3 + (3 if i >= 5 else 0)}', 4, flexed(base, 'flexP_L' if i <= 5 else 'flexQ_L', 0.75), camber=0.06, droop=0.05, roll=-0.1)
        if i == 7: tipL = root + dirv(al) * PR[i] * 0.97
    for j in range(9):
        p = j / 8; pt = JW.lerp(JE, p); al = rad(lerp(80, 96, p))
        base = [('wingB_L', 1.0)] if j < 7 else [('wingB_L', .75), ('wingA_L', .25)]
        card(M, pt + Vector((0, .02, -.01 - .002 * j)), dirv(al), Z, lerp(.56, .6, p) * (0.9 + 0.1 * sp), 0.14, f'sec{j % 4}', 3, flexed(base, 'flexS_L', 0.6), camber=0.06, droop=0.05, roll=0.1)
    for k in range(4):
        p = k / 3; pt = JE.lerp(JS, p * 0.9); al = rad(lerp(100, 122, p))
        base = [('wingA_L', 1.0)] if k < 3 else [('wingA_L', .6), ('chest', .4)]
        card(M, pt + Vector((0, .02, -.03 - .003 * k)), dirv(al), Z, lerp(.55, .4, p), 0.14, f'ret{k % 2}', 3, (lambda w: lambda y: w)(base), camber=0.06, droop=0.06, roll=0.1)
    for cnt, back, L, W, hgt, rect, nv, seg in ((20, .035, .3, .1, .012, 'great', 3, 2), (18, .012, .2, .09, .022, 'med', 3, 1), (16, -.012, .13, .08, .03, 'less', 2, 1)):
        for i in range(cnt):
            q = 0.03 + 0.93 * (i + 0.5 * (cnt % 2)) / cnt; pt, sg, u = lead(q); hq = fs(cum[2], 1, q)
            al = rad(lerp(lerp(104, 84, fs(0, cum[2], q)), 32, hq))
            card(M, pt + Vector((0, back, hgt)), dirv(al), Z, L * (1 - 0.3 * hq) * rng.uniform(.92, 1.08), W, f'{rect}{min(nv - 1, int(q * nv))}', seg, (lambda w: lambda y: w)(wing_w(q)), camber=0.09, droop=0.1, roll=rng.uniform(-.12, .12))
    # the arm: a gold limb under the lesser coverts, and the alula at the wrist
    ap = [lead(q)[0] for q in np.linspace(0, 1, 9)]; ar = [(lerp(.05, .014, q), lerp(.04, .012, q)) for q in np.linspace(0, 1, 9)]
    tube(M, ap, ar, 6, lambda k, a: body_uv(0.42 + 0.2 * k, 0.3 + 0.4 * a), lambda k, c: wing_w(k, 0.04), ref=Y)
    for i in range(2): card(M, JW + Vector((.0, -.01, .02)), dirv(rad(38 - 14 * i)), Z, .2 - .04 * i, .07, 'less1', 1, lambda y: [('wingC_L', 1.0)], camber=0.1)
    # --- mirror the left side
    M.mirror(v0, f0)
    # --- the crest: plumes of flame swept back off the crown, each two crossed blades
    cn = S['crest']
    for m in range(cn):
        u = m / max(1, cn - 1); pt, nr, t = surf(pf(lerp(0.8, 0.6, u)), pi / 2 + (m % 2 - 0.5) * 0.5 * (1 if 0 < m < cn - 1 else 0))
        L = [.3, .44, .56, .62, .54, .44, .34][m]; el = rad(lerp(62, 22, u)); yaw = (m % 2 - 0.5) * 0.5 * (1 if 0 < m < cn - 1 else 0)
        for cross in range(2):
            pts, sides = [], []
            for k in range(6):
                y = k / 5; e2 = el - 0.75 * y
                pts.append(pt - nr * 0.012 + Vector((sin(yaw) * L * y * 0.6, (sin(el) - sin(e2)) / 0.75 * L, (cos(e2) - cos(el)) / 0.75 * L)))
                sides.append(X if cross == 0 else Vector((0, -sin(e2), cos(e2))))
            ribbon(M, pts, sides, [0.05 * (1 + 0.3 * sin(pi * k / 5)) for k in range(6)], f'crest{m % 3}', lambda y: [('head', max(0, 1 - 2.2 * y)), ('crest1', 1 - abs(1 - 2.2 * y) if y < .9 else 0.02), ('crest2', max(0, 2.2 * y - 1))])
    # --- the tail: a fan of stiff feathers, and the long plumes
    tr = Vector((0, .44, .03))
    for i in range(8):
        sdv = i - 3.5; al = sdv * rad(11)
        card(M, tr + Vector((sdv * .012, 0, -.012 - 0.002 * abs(sdv))), Vector((sin(al), cos(al), 0)), Z, S['retrix'] * (1 - 0.035 * abs(sdv) ** 1.5), 0.13, f'ret{i % 2}', 3, lambda y: [('tail', 1.0)], camber=0.06, droop=0.04, roll=0.08 * (1 if sdv > 0 else -1))
    for i in range(6):                                                    # coverts over the tail's root
        sdv = i - 2.5; al = sdv * rad(13)
        card(M, tr + Vector((sdv * .02, -.08, .03)), Vector((sin(al), cos(al), .05)), Z, .26, .1, 'great1', 2, lambda y: [('body', 1 - y), ('tail', y)], camber=0.1, droop=0.1)
    np_ = S['plumes']
    for i in range(np_):
        sdv = i - (np_ - 1) / 2; al = sdv * FAN; L = S['plume'][i]; d = Vector((sin(al), cos(al), 0)); root = tr + Vector((sdv * .018, .02, .012 - .004 * abs(sdv)))
        pts, sides, wd = [], [], []
        for k in range(17):
            y = k / 16; tw = (0.5 + sdv * 0.25) * y * 1.3                 # the ribbon turns along its length, so some of it always faces the eye
            pts.append(root + d * (L * y) + Z * (0.05 * sin(y * pi) - 0.1 * y * y) * L * 0.3)
            s0 = Z.cross(d).normalized(); sides.append((Quaternion(d, tw) @ s0)); wd.append(float(wg(y)))

        def pw(y, i=i):
            f = y * 4; k = min(3, int(f)); u = f - k
            if k == 3: return [(f'tail{i}_4', 1.0)]
            u = fs(.35, 1, u); return [(f'tail{i}_{k + 1}', 1 - u), (f'tail{i}_{k + 2}', u)]
        ribbon(M, pts, sides, wd, 'plume', pw, camber=0.06)
    # --- the skeleton
    B = [('root', Vector((0, 0, 0)), Vector((0, .1, 0)), None), ('body', Vector((0, .05, 0)), Vector((0, -.12, 0)), 'root'), ('chest', Vector((0, -.12, 0)), Vector((0, -.36, .05)), 'body'),
         ('neck1', Vector((0, -.36, .05)), Vector((0, -.48, .12)), 'chest'), ('neck2', Vector((0, -.48, .12)), Vector((0, -.6, .185)), 'neck1'), ('head', Vector((0, -.6, .185)), Vector((0, -.8, .22)), 'neck2'),
         ('jaw', Vector((0, -.83, .185)), Vector((0, -.98, .155)), 'head'), ('crest1', Vector((0, -.74, .29)), Vector((0, -.58, .44)), 'head'), ('crest2', Vector((0, -.58, .44)), Vector((0, -.38, .52)), 'crest1'),
         ('tail', Vector((0, .36, .03)), Vector((0, .48, .03)), 'body')]
    for sfx, sx in (('_L', 1), ('_R', -1)):
        mx = lambda v: Vector((v.x * sx, v.y, v.z))
        B += [('wingA' + sfx, mx(JS), mx(JE), 'chest'), ('wingB' + sfx, mx(JE), mx(JW), 'wingA' + sfx), ('wingC' + sfx, mx(JW), mx(JH), 'wingB' + sfx), ('wingD' + sfx, mx(JH), mx(JT), 'wingC' + sfx),
              ('flexP' + sfx, mx(JW), mx(JW + Vector((.2, .25, 0))), 'wingC' + sfx), ('flexQ' + sfx, mx(JH), mx(JH + Vector((.3, .12, 0))), 'wingD' + sfx),
              ('flexS' + sfx, mx(JE.lerp(JW, .5)), mx(JE.lerp(JW, .5) + Vector((0, .3, 0))), 'wingB' + sfx), ('tip' + sfx, mx(tipL), mx(tipL + Vector((.08, .03, 0))), 'flexQ' + sfx),
              ('leg' + sfx, mx(hip), mx(knee), 'body'), ('shin' + sfx, mx(knee), mx(ankle), 'leg' + sfx), ('foot' + sfx, mx(ankle), mx(foot + Vector((0, .1, 0))), 'shin' + sfx)]
    for i in range(np_):
        sdv = i - (np_ - 1) / 2; al = sdv * FAN; L = S['plume'][i]; d = Vector((sin(al), cos(al), 0)); root = tr + Vector((sdv * .018, .02, .012))
        for j in range(4): B.append((f'tail{i}_{j + 1}', root + d * (L * j / 4), root + d * (L * (j + 1) / 4), f'tail{i}_{j}' if j else 'tail'))
        B.append((f'tailtip{i}', root + d * (L * .9), root + d * (L * .98), f'tail{i}_4'))
    if not np_: B.append(('tailtip0', tr + Vector((0, S['retrix'] * .9, 0)), tr + Vector((0, S['retrix'], 0)), 'tail'))
    B.append(('crown', Vector((0, -.5, .5)) if cn else Vector((0, -.7, .3)), Vector((0, -.42, .54)) if cn else Vector((0, -.66, .32)), 'crest2'))
    return S, M, B, tex


# ------------------------------------------------------------------ Blender objects
def make_objects(name, S, M, B, tex):
    bkit.reset()
    sc = bpy.context.scene; sc.render.fps = 24
    ad = bpy.data.armatures.new(name + '_rig'); arm = bpy.data.objects.new(name, ad); sc.collection.objects.link(arm)
    bkit.active(arm); bpy.ops.object.mode_set(mode='EDIT')
    for nm, h, t, par in B:
        eb = ad.edit_bones.new(nm); eb.head = h; eb.tail = t; eb.align_roll(Z)
        if par: eb.parent = ad.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    me = bpy.data.meshes.new(name + '_mesh'); me.from_pydata([c[:] for c in M.co], [], M.f); me.update()
    uv = me.uv_layers.new(name='UVMap')
    for lp in me.loops: uv.data[lp.index].uv = M.uv[lp.vertex_index]
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name + '_body', me); sc.collection.objects.link(ob)
    names = {b[0] for b in B}
    for i, ws in enumerate(M.w):
        tot = sum(k for _, k in ws if k > 1e-4)
        for b, k in ws:
            if k <= 1e-4: continue
            assert b in names, b
            (ob.vertex_groups.get(b) or ob.vertex_groups.new(name=b)).add([i], k / tot, 'REPLACE')
    ob.parent = arm; md = ob.modifiers.new('arm', 'ARMATURE'); md.object = arm
    mat = bpy.data.materials.new(name); nt = mat.node_tree; bs = nt.nodes['Principled BSDF']
    ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(tex[0])
    te = nt.nodes.new('ShaderNodeTexImage'); te.image = bpy.data.images.load(tex[1])
    nt.links.new(ti.outputs['Color'], bs.inputs['Base Color']); nt.links.new(ti.outputs['Alpha'], bs.inputs['Alpha'])
    bs.inputs['Roughness'].default_value = 0.5 if S['fire'] else 0.72; bs.inputs['Metallic'].default_value = 0
    nt.links.new(te.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 1.0
    mat.use_backface_culling = False
    me.materials.append(mat)
    return arm, ob


# ------------------------------------------------------------------ the clips
def mirq(q): return Quaternion((q.w, q.x, -q.y, -q.z))
up_ = lambda a: Quaternion((0, -1, 0), a)        # left wing: raise
sw_ = lambda a: Quaternion((0, 0, 1), a)         # sweep back
tw_ = lambda a: Quaternion((1, 0, 0), a)         # leading edge down
px_ = lambda a: Quaternion((1, 0, 0), -a)        # body parts: nose up
tl_ = lambda a: Quaternion((1, 0, 0), a)         # tail: tip up
bend = lambda d, a: Quaternion(Vector(d).normalized().cross(Z), a)


def wings(P, lift=0.0, sweep=0.0, twist=0.0, elbow=0.0, wrist=0.0, fan=0.0, hand=0.0, tip=0.0, flex=0.0, sflex=0.0, sfx=''):
    P['wingA' + sfx] = up_(lift) @ sw_(sweep) @ tw_(twist)
    P['wingB' + sfx] = sw_(-elbow)
    P['wingC' + sfx] = up_(hand) @ sw_(wrist)
    P['wingD' + sfx] = up_(tip) @ sw_(fan)
    P['flexP' + sfx] = bend((.5, .8, 0), flex); P['flexQ' + sfx] = bend((.9, .4, 0), flex * 1.2); P['flexS' + sfx] = bend((0, 1, 0), sflex)


def tail(P, n, ph, wave=0.1, fan=1.0, pitch=0.0, curl=0.0):
    P['tail'] = tl_(pitch)
    for i in range(n):
        sdv = i - (n - 1) / 2
        for j in range(1, 5):
            a = wave * (0.4 + 0.3 * j) * sin(ph - 0.95 * j + 0.7 * i) + curl
            yw = 0.5 * wave * sin(ph - 0.7 * j + 1.9 * i) - (sdv * FAN * (fan - 1) if j == 1 else 0)
            P[f'tail{i}_{j}'] = Quaternion(Z, yw) @ tl_(a)


def legs(P, swing=0.0, knee=0.0, grip=0.0):
    P['leg'] = px_(swing); P['shin'] = px_(-knee); P['foot'] = px_(grip)


def p_fly(ph, n):
    P = {}; s, c = sin(ph), cos(ph); us = (0.5 + 0.5 * cos(ph - 0.35)) ** 1.5     # how far into the upstroke
    wings(P, lift=0.12 + 0.82 * s, sweep=0.04 + 0.14 * us, twist=-0.3 * c, elbow=0.5 * us, wrist=0.62 * us, fan=0.12 * us,
          hand=0.08 + 0.42 * sin(ph - 0.9) - 0.22 * us, tip=0.32 * sin(ph - 1.4), flex=-0.32 * cos(ph - 0.9), sflex=-0.2 * cos(ph - 0.6))
    P['body'] = px_(0.07 * c); P['@body'] = Vector((0, 0, -0.075 * s))
    P['chest'] = px_(0.04 * sin(ph - 0.5)); P['neck1'] = px_(-0.06 * c - 0.05); P['neck2'] = px_(-0.04 * c); P['head'] = px_(-0.03 * c + 0.04)
    P['crest1'] = px_(0.08 * sin(ph - 1)); P['crest2'] = px_(0.12 * sin(ph - 1.8))
    tail(P, n, ph, wave=0.11, pitch=0.09 * sin(ph - 0.6)); legs(P)
    return P


def p_glide(ph, n):
    P = {}; s = sin(ph)
    wings(P, lift=0.15 + 0.025 * s, sweep=0.05, twist=0.02 * s, elbow=0.06, wrist=0.08, hand=0.1 + 0.02 * sin(ph - 1), tip=0.2 + 0.03 * sin(2 * ph), flex=0.2 + 0.04 * sin(2 * ph - 1), sflex=0.06)
    P['body'] = px_(0.02 * s); P['@body'] = Vector((0, 0, 0.012 * s)); P['neck1'] = px_(-0.05); P['head'] = px_(0.03 * sin(ph + 1))
    P['crest1'] = px_(0.05 * sin(2 * ph)); P['crest2'] = px_(0.08 * sin(2 * ph - 1))
    tail(P, n, ph, wave=0.07, fan=1.25); legs(P)
    return P


def p_hover(ph, n):
    P = {}; s, c = sin(ph), cos(ph); us = (0.5 + 0.5 * cos(ph - 0.35)) ** 1.5
    wings(P, lift=0.1 + 0.72 * s, sweep=-0.1 + 0.1 * us, twist=-0.5 * c - 0.1, elbow=0.35 * us, wrist=0.45 * us, hand=0.1 + 0.4 * sin(ph - 0.9), tip=0.3 * sin(ph - 1.4), flex=-0.35 * cos(ph - 0.9), sflex=-0.25 * cos(ph - 0.6))
    P['body'] = px_(0.85 + 0.05 * c); P['@body'] = Vector((0, 0, -0.06 * s))
    P['neck1'] = px_(-0.3); P['neck2'] = px_(-0.3); P['head'] = px_(-0.3 - 0.03 * c)
    P['crest1'] = px_(0.1 * sin(ph - 1) - 0.1); P['crest2'] = px_(0.14 * sin(ph - 1.8))
    tail(P, n, ph, wave=0.1, fan=1.6, pitch=0.25 + 0.06 * sin(ph - 0.6), curl=0.05); legs(P, swing=0.7, knee=0.5, grip=0.2)
    return P


def p_stoop(ph, n):
    P = {}; s = sin(ph)
    wings(P, lift=0.2 + 0.02 * s, sweep=0.8, elbow=0.75, wrist=1.25, fan=0.42, hand=-0.05, tip=0.02 * sin(2 * ph), flex=0.06 * sin(2 * ph), sflex=0.04 * sin(2 * ph + 1))
    P['body'] = px_(0); P['@body'] = Vector((0, 0, 0.006 * s)); P['neck1'] = px_(-0.1); P['neck2'] = px_(-0.12); P['head'] = px_(0.05)
    P['crest1'] = px_(0.3 + 0.05 * sin(2 * ph)); P['crest2'] = px_(0.2 + 0.08 * sin(2 * ph - 1)); P['jaw'] = px_(-0.25)
    tail(P, n, 2 * ph, wave=0.035, fan=0.45); legs(P, swing=-0.2)
    return P


def mixp(a, b, w):
    out = {}
    for k in set(a) | set(b):
        if k[0] == '@': out[k] = a.get(k, Vector()).lerp(b.get(k, Vector()), w)
        else: out[k] = a.get(k, Quaternion()).slerp(b.get(k, Quaternion()), w)
    return out


def p_strike(u, n):
    w = fs(0.12, 0.38, u) * (1 - fs(0.68, 1, u)); wind = fs(0, 0.14, u) * (1 - fs(0.14, 0.34, u))
    H = p_hover(u * 4 * pi, n); P = {}
    wings(P, lift=0.95, sweep=-0.3, twist=-0.55, elbow=0.1, wrist=0.05, fan=-0.2, hand=0.25, tip=0.3, flex=0.3, sflex=0.2)
    P['body'] = px_(1.15); P['@body'] = Vector((0, -0.28, 0.1)); P['neck1'] = px_(-0.55); P['neck2'] = px_(-0.5); P['head'] = px_(-0.35); P['jaw'] = px_(-0.6)
    P['crest1'] = px_(-0.4); P['crest2'] = px_(-0.25)
    tail(P, n, u * 4 * pi, wave=0.08, fan=2.4, pitch=0.5, curl=0.1); legs(P, swing=2.0, knee=0.9, grip=-0.5)
    W = {}
    wings(W, lift=1.05, sweep=0.35, twist=0.2, elbow=0.5, wrist=0.5, hand=0.2)
    W['body'] = px_(0.6); W['@body'] = Vector((0, 0.16, 0.08)); legs(W, swing=0.2, knee=1.0)
    out = mixp(mixp(H, W, wind), P, w)
    return out


def p_screech(u, n):
    w = fs(0.05, 0.28, u) * (1 - fs(0.74, 1, u)); sh = sin(u * 60) * w
    H = p_hover(u * 6 * pi, n); P = {}
    wings(P, lift=0.5 + 0.03 * sh, sweep=0.0, twist=-0.25, elbow=0.75, wrist=0.85, fan=-0.1, hand=-0.3, tip=-0.2, flex=-0.15 + 0.05 * sh, sflex=-0.1)
    P['body'] = px_(0.95); P['@body'] = Vector((0, 0, 0.03)); P['chest'] = px_(0.2); P['neck1'] = px_(0.35); P['neck2'] = px_(0.4); P['head'] = px_(0.3 + 0.03 * sh); P['jaw'] = px_(-0.85 + 0.08 * sh)
    P['crest1'] = px_(-0.55 + 0.06 * sh); P['crest2'] = px_(-0.3)
    tail(P, n, u * 6 * pi, wave=0.1, fan=2.6, pitch=0.35, curl=0.06); legs(P, swing=0.9, knee=0.6, grip=-0.3)
    return mixp(H, P, w)


def p_flare(u, n):
    curl = fs(0, 0.2, u) * (1 - fs(0.34, 0.46, u)); burst = fs(0.36, 0.5, u) * (1 - fs(0.78, 1, u)); over = sin(fs(0.36, 0.62, u) * pi) * 0.25
    H = p_hover(u * 4 * pi, n); C = {}; P = {}
    wings(C, lift=-0.25, sweep=-0.75, twist=-0.5, elbow=1.1, wrist=1.2, fan=0.3, hand=-0.3)
    C['body'] = px_(0.6); C['neck1'] = px_(-0.7); C['neck2'] = px_(-0.6); C['head'] = px_(-0.5); C['crest1'] = px_(0.4)
    tail(C, n, 0, wave=0.0, fan=0.4, pitch=-0.5, curl=-0.3); legs(C, swing=0.5, knee=1.2)
    wings(P, lift=0.85 + over, sweep=-0.12, twist=-0.2, elbow=-0.05, wrist=-0.1, fan=-0.3, hand=0.2 + over, tip=0.3 + over, flex=0.4, sflex=0.25)
    P['body'] = px_(1.2); P['@body'] = Vector((0, 0, 0.12 + 0.2 * over)); P['chest'] = px_(0.15); P['neck1'] = px_(0.2); P['neck2'] = px_(0.3); P['head'] = px_(0.2); P['jaw'] = px_(-0.7)
    P['crest1'] = px_(-0.6); P['crest2'] = px_(-0.35)
    tail(P, n, u * 4 * pi, wave=0.08, fan=3.2, pitch=0.6, curl=0.08); legs(P, swing=1.1, knee=0.4, grip=-0.4)
    return mixp(mixp(H, C, curl), P, burst)


CLIPS = [('fly', 24, True, p_fly), ('glide', 48, True, p_glide), ('hover', 16, True, p_hover), ('stoop', 16, True, p_stoop),
         ('strike', 16, False, p_strike), ('screech', 30, False, p_screech), ('flare', 28, False, p_flare)]


def animate(arm, n):
    arm.animation_data_create(); pb = arm.pose.bones
    rest = {b.name: b.bone.matrix_local.to_quaternion() for b in pb}; last = {}
    for b in pb: b.rotation_mode = 'QUATERNION'
    for name, frames, loop, fn in CLIPS:
        act = bpy.data.actions.new(name); arm.animation_data.action = act
        for f in range(frames + 1):
            P = fn((f / frames) * (2 * pi if loop else 1), n); full = {}
            for k, q in P.items():
                if k[0] == '@': continue
                if k in rest: full[k] = q
                elif k[-2:] in ('_L', '_R') and k in rest: full[k] = q
                else:
                    if k + '_L' in rest: full[k + '_L'] = q; full[k + '_R'] = mirq(q)
            for b in pb:
                q = full.get(b.name, Quaternion()); r = rest[b.name]; q = r.inverted() @ q @ r
                if b.name in last and last[b.name].dot(q) < 0: q.negate()
                last[b.name] = q.copy(); b.rotation_quaternion = q; b.keyframe_insert('rotation_quaternion', frame=f)
            b = pb['body']; b.location = rest['body'].inverted() @ P.get('@body', Vector()); b.keyframe_insert('location', frame=f)
        act.use_fake_user = True
        tr = arm.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 0, act); tr.mute = True
    arm.animation_data.action = None
    for b in pb: b.rotation_quaternion = Quaternion(); b.location = Vector()


def patch_glb(path, radius):
    """Feather edges are cut by alpha (no blending), both faces drawn; the cell the game renders must hold the longest pose."""
    d = open(path, 'rb').read(); jl = struct.unpack('<I', d[12:16])[0]; js = json.loads(d[20:20 + jl]); rest = d[20 + jl:]
    for m in js['materials']: m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.5; m['doubleSided'] = True
    js['scenes'][0].setdefault('extras', {})['rad'] = radius
    out = json.dumps(js, separators=(',', ':')).encode(); out += b' ' * (-len(out) % 4)
    open(path, 'wb').write(d[:8] + struct.pack('<I', 12 + 8 + len(out) + len(rest)) + struct.pack('<I', len(out)) + b'JSON' + out + rest)
    print(' clips', {a['name']: len(a['channels']) for a in js.get('animations', [])}, 'nodes', len(js['nodes']), 'images', [i.get('mimeType') for i in js['images']])


def main():
    which = [a for a in sys.argv[1:] if not a.startswith('-')] or ['all']
    for name in (list(SPEC) if 'all' in which else which):
        r = build(name)
        if not r: continue
        S, M, B, tex = r
        print(name, 'triangles', M.tris(), 'vertices', len(M.co), 'bones', len(B))
        arm, ob = make_objects(name, S, M, B, tex)
        animate(arm, S['plumes'])
        path = bkit.export_glb(name, step=1)
        patch_glb(path, S['radius'])


main()
