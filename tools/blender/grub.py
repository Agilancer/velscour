"""The Carrion Witch's Carrion Grubs (src/gfx/grubs3d.js, src/game/carriongrubs.js): a huge corpse maggot built in
Blender from nothing: a fat ringed body, a pale head capsule with black eye clusters and black hooked mandibles, six
black thoracic legs, a black neck shield and tail hooks. Fifteen bones (twelve body rings, the head, two mandibles), all
children of the root, posed by a little chain solver below, so every clip is exact in glTF.

    /opt/bl/venv/bin/python tools/blender/grub.py
Writes assets/models/beasts/grub.glb (the white grub: mesh, rig, 14 clips, colour + normal + glow maps) and the other
hides grub_<skin>.webp / grub_<skin>_glow.webp (yellow, green, orange, brown, pink): same model, another skin."""
import bpy, bmesh, sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector, Matrix
from PIL import Image, ImageFilter

N, L, RAD = 12, 2.0, 0.27          # body rings, body length, greatest radius (model units)
SEG = L / N
HL = 0.40                          # head length
AROUND, PER = 20, 6                # mesh: verts around, rings per body ring
TW, TH = 1024, 1024                # texture
BODY_V0 = 0.25                     # the body skin takes v 0.25..1 (u: tail -> head, v: belly round to belly)
rng = np.random.default_rng(7)
smooth = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(min(1, max(0, (x - a) / (b - a))))


def radius(s):
    """Body radius at s (0 tail .. 1 neck), without the ring bulges."""
    taper_tail = smooth(-0.02, 0.16, s) ** 0.6
    taper_head = 1 - 0.34 * smooth(0.62, 1.0, s)
    belly = 0.86 + 0.14 * math.sin(math.pi * min(1, s / 0.75)) ** 1.2
    return RAD * (0.42 + 0.58 * taper_tail) * taper_head * belly


def bulge(s):
    """Each ring swells between its creases."""
    f = (s * N) % 1.0
    return 0.80 + 0.20 * math.sin(math.pi * f) ** 0.55


# ---------------------------------------------------------------- textures
def noise(w, h, oct=5, seed=0, sx=1, sy=1):
    r = np.random.default_rng(seed); out = np.zeros((h, w)); amp = 1
    for o in range(oct):
        gw, gh = max(2, int(4 * sx * 2 ** o)), max(2, int(4 * sy * 2 ** o))
        g = Image.fromarray((r.random((gh, gw)) * 255).astype('uint8')).resize((w, h), Image.BICUBIC)
        out += np.asarray(g) / 255 * amp; amp *= 0.55
    return (out - out.min()) / (out.max() - out.min())


def blobs(w, h, n, r0, r1, seed, region=None):
    """A field of soft round spots (0..1) for pustules, speckles, sacs. region(x, y) -> bool keeps a spot."""
    r = np.random.default_rng(seed); im = np.zeros((h, w))
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(n):
        x, y, rad = r.random() * w, r.random() * h, r0 + r.random() * (r1 - r0)
        if region and not region(x / w, y / h): continue
        x0, x1, y0, y1 = int(max(0, x - rad)), int(min(w, x + rad + 1)), int(max(0, y - rad)), int(min(h, y + rad + 1))
        d = np.hypot(xx[y0:y1, x0:x1] - x, yy[y0:y1, x0:x1] - y) / rad
        im[y0:y1, x0:x1] = np.maximum(im[y0:y1, x0:x1], np.clip(1 - d, 0, 1) ** 0.7)
    return im


SKINS = {
    #         body      belly     vessel   crease    glow            notes
    'white':  ((226, 220, 200), (240, 236, 220), (168, 160, 150), (120, 104, 88), (190, 255, 150)),
    'yellow': ((232, 200, 70), (246, 226, 130), (150, 110, 30), (110, 74, 14), (255, 240, 90)),
    'green':  ((150, 172, 74), (196, 208, 120), (74, 96, 40), (50, 66, 24), (150, 255, 60)),
    'orange': ((226, 140, 60), (244, 190, 120), (150, 70, 26), (104, 44, 14), (255, 150, 40)),
    'brown':  ((122, 60, 44), (170, 96, 76), (70, 20, 16), (44, 12, 10), (255, 40, 30)),
    'pink':   ((232, 160, 170), (246, 204, 204), (170, 84, 110), (128, 60, 80), (255, 120, 220)),
}


def paint(skin):
    """Colour, height and glow images (H x W arrays) for one hide."""
    body, belly, vessel, crease, glowc = [np.array(c, float) for c in SKINS[skin]]
    bh = int(TH * (1 - BODY_V0)); W = TW
    yy, xx = np.mgrid[0:bh, 0:W]
    s = xx / W; th = yy / bh                       # s: tail -> head; th: 0 belly .. 0.5 back .. 1 belly
    back = np.cos((th - 0.5) * 2 * np.pi) * 0.5 + 0.5  # 1 on the back, 0 on the belly
    side = np.sin(th * 2 * np.pi) ** 2                 # 1 on the flanks
    ring = (s * N) % 1.0; ringi = np.floor(s * N)
    col = belly[None, None] * (1 - back[..., None]) + body[None, None] * back[..., None]
    n1 = noise(W, bh, 5, 1, 3, 1); n2 = noise(W, bh, 4, 2, 10, 1.2)  # n2: fine wrinkles running round the body
    hgt = np.zeros((bh, W))
    col *= (0.90 + 0.14 * n1)[..., None]
    wr = np.sin((s * N * 9 + n1 * 2.2) * 2 * np.pi) * 0.5 + 0.5      # nine wrinkles a ring
    col *= (0.93 + 0.07 * wr * (0.5 + 0.5 * n2))[..., None]; hgt += wr * 0.25
    # the dark gut showing through the back, pulsing in blotches
    gut = np.exp(-((th - 0.5) / 0.035) ** 2) * (0.45 + 0.55 * noise(W, bh, 3, 3, 6, 1)) * smooth(0.04, 0.12, 1)  # noqa
    gut = gut * np.clip((s - 0.05) / 0.08, 0, 1) * np.clip((0.9 - s) / 0.06, 0, 1)
    col = col * (1 - 0.55 * gut[..., None]) + vessel[None, None] * 0.55 * gut[..., None]
    # creases between the rings
    cr = np.exp(-(np.minimum(ring, 1 - ring) / 0.07) ** 2)
    col = col * (1 - 0.62 * cr[..., None]) + crease[None, None] * 0.62 * cr[..., None]; hgt -= cr * 1.0
    hgt += np.sin(np.pi * ring) ** 0.6 * 0.6
    # spiracles: a black oval in a dark ring on each flank of every ring
    black = np.array((14, 12, 14.0)); blk = np.zeros((bh, W))
    for t0 in (0.27, 0.73):
        d = np.hypot((ring - 0.5) / 0.13, (th - t0) / 0.030)
        ok = (ringi >= 1) & (ringi <= N - 2)
        sp = np.clip(1.35 - d, 0, 1) * ok; rim = np.clip(1 - np.abs(d - 1.5) / 0.5, 0, 1) * ok
        col = col * (1 - 0.5 * rim[..., None]) + crease[None, None] * 0.5 * rim[..., None]
        blk = np.maximum(blk, np.clip(sp * 3, 0, 1)); hgt -= sp * 0.8
    # the black neck shield (split down the middle), two black plates on the next rings, the black tail plate
    def plate(s0, s1, half, soft=0.012):
        a = np.clip((s - s0) / soft, 0, 1) * np.clip((s1 - s) / soft, 0, 1)
        b = np.clip((half - np.abs(th - 0.5)) / 0.012, 0, 1) * np.clip((np.abs(th - 0.5) - 0.006) / 0.006, 0, 1)
        return a * b
    shield = plate(1 - 0.93 / N, 1.0, 0.21)
    for k, hw in ((2, 0.13), (3, 0.09)):
        for t0 in (0.5 - hw * 0.55, 0.5 + hw * 0.55):
            d = np.hypot((s - (1 - (k - 0.5) / N)) / (0.26 / N), (th - t0) / (hw * 0.42)); shield = np.maximum(shield, np.clip((1 - d) * 5, 0, 1))
    shield = np.maximum(shield, plate(0.0, 0.62 / N, 0.2))
    bar = np.clip(1 - np.abs(ring - 0.30) / 0.075, 0, 1) * np.clip((0.115 - np.abs(th - 0.5)) / 0.02, 0, 1) * np.clip((np.abs(th - 0.5) - 0.012) / 0.008, 0, 1) * ((ringi >= 1) & (ringi <= N - 4))
    shield = np.maximum(shield, np.clip(bar * 3, 0, 1))
    blk = np.maximum(blk, shield); hgt += shield * 0.9
    # black bristle pits over the back, black crochets on the false legs under the middle rings
    pits = blobs(W, bh, 520, 1.6, 3.4, 5, lambda u, v: 0.2 < v < 0.8 and 0.06 < u < 0.9)
    blk = np.maximum(blk, np.clip(pits * 1.6 - 0.35, 0, 1) * 0.9)
    for t0 in (0.085, 0.915):
        d = np.hypot((ring - 0.5) / 0.2, (th - t0) / 0.03); ok = (ringi >= 2) & (ringi <= 8)
        foot = np.clip(1 - d, 0, 1) * ok; hgt += foot * 1.2
        blk = np.maximum(blk, np.clip(1 - np.abs(d - 0.55) / 0.16, 0, 1) * ok * 0.85)
    # hide-specific marks
    glow = np.zeros((bh, W))
    sacs = blobs(W, bh, 46, 14, 30, 11, lambda u, v: (0.3 < v < 0.42 or 0.58 < v < 0.7) and 0.1 < u < 0.86)
    if skin == 'white':
        col *= (1 - 0.10 * sacs)[..., None]; glow = sacs * 0.5
    if skin == 'yellow':   # waxy, banded amber, acid sacs along the flanks
        band = (np.sin(ring * 2 * np.pi - 1.2) * 0.5 + 0.5) * back
        col = col * (1 - 0.35 * band[..., None]) + np.array((176, 110, 20.0))[None, None] * 0.35 * band[..., None]
        col = col * (1 - 0.55 * sacs[..., None]) + np.array((250, 255, 150.0))[None, None] * 0.55 * sacs[..., None]; glow = sacs
    if skin in ('green', 'orange'):  # pustules: pale heads in sore rings
        pu = blobs(W, bh, 150 if skin == 'green' else 110, 7, 19, 21 if skin == 'green' else 22, lambda u, v: 0.14 < v < 0.86 and 0.05 < u < 0.9)
        head = np.clip(pu * 2.2 - 1.0, 0, 1); sore = np.clip(pu * 1.5, 0, 1) - head
        sorec = np.array((90, 120, 30.0) if skin == 'green' else (170, 50, 20.0)); headc = np.array((232, 240, 150.0) if skin == 'green' else (255, 232, 150.0))
        col = col * (1 - 0.6 * sore[..., None]) + sorec[None, None] * 0.6 * sore[..., None]
        col = col * (1 - head[..., None]) + headc[None, None] * head[..., None]
        hgt += pu * 2.2; glow = head * 0.9 + sacs * 0.25
    if skin == 'brown':    # wet, blood-dark, clotted streaks and bright red seams
        st = noise(W, bh, 4, 31, 2, 14) ** 2.2
        col = col * (1 - 0.5 * st[..., None]) + np.array((40, 6, 6.0))[None, None] * 0.5 * st[..., None]
        red = cr * (0.5 + 0.5 * n1); col = col * (1 - 0.7 * red[..., None]) + np.array((210, 24, 20.0))[None, None] * 0.7 * red[..., None]
        glow = red * 0.8 + sacs * 0.3
    if skin == 'pink':     # thin sickly skin: a net of veins, bruised blotches
        v1 = np.abs(noise(W, bh, 4, 41, 5, 5) - 0.5); vein = np.clip(1 - v1 / 0.035, 0, 1) * (0.4 + 0.6 * side)
        col = col * (1 - 0.6 * vein[..., None]) + np.array((150, 40, 90.0))[None, None] * 0.6 * vein[..., None]
        br = noise(W, bh, 3, 42, 2, 2) ** 3; col = col * (1 - 0.35 * br[..., None]) + np.array((150, 110, 170.0))[None, None] * 0.35 * br[..., None]
        glow = vein * 0.6 + sacs * 0.6; hgt += vein * 0.5
    col = col * (1 - blk[..., None]) + black[None, None] * blk[..., None]
    glow *= (1 - blk)
    # shade the belly a little (baked sky light) and the flanks' underside
    col *= (0.80 + 0.20 * np.clip(back * 1.6, 0, 1))[..., None]
    # ---- the atlas: body on top (image rows 0..bh), the head and hard parts in the bottom strip
    C = np.zeros((TH, TW, 3)); Hh = np.zeros((TH, TW)); G = np.zeros((TH, TW, 3))
    C[:bh] = col; Hh[:bh] = hgt; G[:bh] = glow[..., None] * glowc[None, None] / 255
    hs = TH - bh; q = hs                         # head map: a q x q square at the left: u = lon/2pi, v = lat
    hy, hx = np.mgrid[0:q, 0:q]; lon = hx / q; lat = hy / q
    hn = noise(q, q, 4, 51, 2, 2)
    tan = np.array((224, 212, 186.0)) if skin == 'white' else np.clip(body * 0.9 + np.array((30, 20, 0.0)), 0, 255)
    hc = tan[None, None] * (0.82 + 0.25 * hn)[..., None]
    # a black mask round the mouth (front of the head: lon ~0.5) and a black seam over the crown
    front = np.exp(-(((lon - 0.5) / 0.16) ** 2 + ((lat - 0.62) / 0.24) ** 2))
    seam = np.exp(-((lon - 0.5) / 0.012) ** 2) * (lat < 0.5)
    m = np.clip(front * 1.7 - 0.5, 0, 1) + seam * 0.7; m = np.clip(m, 0, 1)
    hc = hc * (1 - m[..., None]) + black[None, None] * m[..., None]
    C[bh:, :q] = hc; Hh[bh:, :q] = hn * 0.6 + m
    mouth = np.clip(front * 2.4 - 1.6, 0, 1); G[bh:, :q] = mouth[..., None] * glowc[None, None] / 255 * 0.5
    # eyes: glossy black with a cold highlight; hard parts: black to dark horn at the tips
    ex, ey = np.mgrid[0:hs // 2, 0:hs // 2] / (hs / 2)
    hi = np.exp(-(((ex - 0.3) / 0.14) ** 2 + ((ey - 0.32) / 0.14) ** 2))
    eye = np.array((6, 6, 9.0))[None, None] + hi[..., None] * np.array((150, 170, 200.0))[None, None]
    C[bh:bh + hs // 2, q:q + hs // 2] = eye
    gy = np.mgrid[0:hs // 2, 0:hs // 2][0] / (hs / 2)
    horn = black[None, None] * (1 - gy[..., None]) + np.array((84, 52, 30.0))[None, None] * gy[..., None] * 0.9 + (hn[:hs // 2, :hs // 2, None] - 0.5) * 16
    C[bh + hs // 2:, q:q + hs // 2] = horn
    return np.clip(C, 0, 255).astype('uint8'), Hh, np.clip(G * 255, 0, 255).astype('uint8')


def normal_map(h, strength=2.4):
    hb = np.asarray(Image.fromarray((np.clip((h - h.min()) / (h.max() - h.min()), 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), float) / 255
    dx = (np.roll(hb, -1, 1) - np.roll(hb, 1, 1)) * strength * 6; dy = (np.roll(hb, -1, 0) - np.roll(hb, 1, 0)) * strength * 6
    n = np.dstack((-dx, dy, np.ones_like(hb))); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype('uint8')


def bimage(name, arr, colorspace='sRGB'):
    """A numpy image as a packed Blender image (through a PNG: generated images export empty)."""
    import tempfile
    path = os.path.join(tempfile.gettempdir(), name + '.png'); Image.fromarray(arr).save(path)
    img = bpy.data.images.load(path); img.name = name; img.colorspace_settings.name = colorspace; img.pack()
    return img


# ---------------------------------------------------------------- mesh
def build_mesh():
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap')
    dv = bm.verts.layers.deform.verify()
    G = {}  # group name -> index

    def gi(name): return G.setdefault(name, len(G))
    rings = []
    total = N * PER
    for j in range(total + 1):
        s = j / total; r = radius(s) * bulge(s)
        if j == 0: r *= 0.55
        y = L / 2 - s * L; zc = radius(s) * 0.9
        f = s * N - 0.5; i0 = int(max(0, min(N - 1, math.floor(f)))); i1 = min(N - 1, i0 + 1); w1 = smooth(0, 1, max(0, min(1, f - i0))) if f > 0 else 0
        if s * N > N - 0.35:  # the neck follows the head a little
            wh = smooth(N - 0.35, N + 0.2, s * N) * 0.6
        else: wh = 0
        row = []
        for a in range(AROUND + 1):
            th = a / AROUND; ang = th * 2 * math.pi  # 0 at the belly
            x = math.sin(ang) * r * 1.08; z = zc - math.cos(ang) * r * (0.9 if math.cos(ang) > 0 else 1.0)
            if a == AROUND: row.append((row[0][0], (s, BODY_V0))); continue
            v = bm.verts.new((x, y, z))
            v[dv][gi('seg%d' % i0)] = (1 - w1) * (1 - wh)
            if w1 > 0: v[dv][gi('seg%d' % i1)] = v[dv].get(gi('seg%d' % i1), 0) + w1 * (1 - wh)
            if wh > 0: v[dv][gi('head')] = wh
            row.append((v, (s, BODY_V0 + (1 - BODY_V0) * (1 - th))))
        rings.append(row)
    for j in range(total):
        for a in range(AROUND):
            q = [rings[j][a], rings[j][a + 1], rings[j + 1][a + 1], rings[j + 1][a]]
            f = bm.faces.new([p[0] for p in q])
            for lp, p in zip(f.loops, q): lp[uv].uv = p[1]
            f.smooth = True
    # the tail cap
    cv = bm.verts.new((0, L / 2 + 0.02, radius(0) * 0.9)); cv[dv][gi('seg0')] = 1
    for a in range(AROUND):
        f = bm.faces.new([rings[0][(a + 1) % AROUND][0], rings[0][a][0], cv])
        for lp, p in zip(f.loops, [rings[0][a + 1][1], rings[0][a][1], (0, BODY_V0 + 0.375)]): lp[uv].uv = p
        f.smooth = True

    def part(verts_faces, group, uvfn, mat=None):
        vs, fs = verts_faces
        bv = []
        for p in vs:
            v = bm.verts.new(mat @ Vector(p) if mat else p); v[dv][gi(group)] = 1; bv.append(v)
        for f in fs:
            try: fc = bm.faces.new([bv[i] for i in f])
            except ValueError: continue
            for lp, i in zip(fc.loops, f): lp[uv].uv = uvfn(vs[i], i)
            fc.smooth = True

    def sphere(nu, nv):
        vs, fs = [], []
        for j in range(nv + 1):
            la = j / nv * math.pi
            for i in range(nu):
                lo = i / nu * 2 * math.pi
                vs.append((math.sin(la) * math.sin(lo), -math.cos(la), math.sin(la) * math.cos(lo)))  # poles on y; -y front
        for j in range(nv):
            for i in range(nu):
                a, b = j * nu + i, j * nu + (i + 1) % nu
                fs.append((a, b, b + nu, a + nu))
        return vs, fs

    def horn(n, segs, length, r0, curve):
        """A curved cone along -y, bending toward +x by `curve`."""
        vs, fs = [], []
        for j in range(segs + 1):
            t = j / segs; r = r0 * (1 - t) ** 0.8 + 0.002; bend = curve * t * t
            for i in range(n):
                a = i / n * 2 * math.pi
                vs.append((math.cos(a) * r + bend * length, -t * length, math.sin(a) * r))
        for j in range(segs):
            for i in range(n):
                a, b = j * n + i, j * n + (i + 1) % n
                fs.append((a, a + n, b + n, b))
        return vs, fs

    q = (TH * BODY_V0) / TW  # the head square's side in uv
    hz = radius(1) * 0.9; hy = -L / 2 - HL * 0.38; hr = radius(1) * 1.16
    HM = Matrix.Translation((0, hy, hz)) @ Matrix.Diagonal((hr * 1.02, HL * 0.62, hr * 0.94, 1))
    def head_uv(p, i):
        lon = (math.atan2(p[0], -p[1] + 1e-6) / (2 * math.pi)) + 0.5; lat = 0.5 - math.asin(max(-1, min(1, p[2]))) / math.pi
        return (min(0.999, max(0.001, lon)) * q, (1 - min(0.999, max(0.001, lat))) * q)
    part(sphere(14, 9), 'head', head_uv, HM)
    def flat(u0, v0, w, h): return lambda p, i: (u0 + w * (0.5 + 0.4 * math.sin(i * 2.4)), v0 + h * (0.5 + 0.4 * math.cos(i * 1.7)))
    eye_uv = flat(q, q / 2, q / 2, q / 2)
    def horn_uv(segs, n): return lambda p, i: (q + q / 2 * ((i % n) / n), q / 2 * (1 - 0.05 - 0.9 * (i // n) / segs) )
    for sx in (-1, 1):
        for (ex, ey, ez, er) in ((0.58, -0.46, 0.40, 0.40), (0.80, -0.12, 0.44, 0.26), (0.50, -0.70, 0.10, 0.22)):
            M = HM @ Matrix.Translation((sx * ex, ey, ez)) @ Matrix.Diagonal((er / 1.02, er * hr / (HL * 0.62), er / 0.94, 1))
            part(sphere(8, 6), 'head', eye_uv, M)
        # mandibles: black hooks that close across the mouth
        px, py, pz = sx * hr * 0.42, hy - HL * 0.50, hz - hr * 0.22
        M = Matrix.Translation((px, py, pz)) @ Matrix.Rotation(sx * 0.35, 4, 'Z') @ Matrix.Diagonal((-sx, 1, 1, 1))
        part(horn(7, 5, 0.36, 0.075, 0.42), 'mand' + ('L' if sx < 0 else 'R'), horn_uv(5, 7), M)
        # six short black legs under the first three rings
        for k in range(3):
            s = 1 - (k + 0.5) / N; y = L / 2 - s * L; r = radius(s)
            M = Matrix.Translation((sx * r * 0.62, y, r * 0.42)) @ Matrix.Rotation(sx * 0.9, 4, 'Y') @ Matrix.Rotation(math.pi / 2, 4, 'X') @ Matrix.Rotation(-0.35, 4, 'Z')
            part(horn(6, 4, 0.19, 0.036, 0.5), 'seg%d' % (N - 1 - k), horn_uv(4, 6), M)
        # tail hooks
        M = Matrix.Translation((sx * 0.07, L / 2 - 0.03, radius(0) * 1.25)) @ Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Rotation(-0.7, 4, 'X') @ Matrix.Diagonal((sx, 1, 1, 1))
        part(horn(6, 4, 0.17, 0.04, 0.5), 'seg0', horn_uv(4, 6), M)
    # a ring of small black mouth hooks round the maw, two feelers above it
    for i in range(7):
        a = i / 7 * 2 * math.pi + 0.2
        M = Matrix.Translation((math.cos(a) * hr * 0.24, hy - HL * 0.56, hz - hr * 0.16 + math.sin(a) * hr * 0.2)) @ Matrix.Rotation(-math.cos(a) * 0.5, 4, 'Z') @ Matrix.Rotation(math.sin(a) * 0.5, 4, 'X')
        part(horn(5, 3, 0.10, 0.022, 0.2), 'head', horn_uv(3, 5), M)
    for sx in (-1, 1):
        M = Matrix.Translation((sx * hr * 0.30, hy - HL * 0.42, hz + hr * 0.42)) @ Matrix.Rotation(-0.9, 4, 'X') @ Matrix.Rotation(sx * 0.4, 4, 'Z') @ Matrix.Diagonal((sx, 1, 1, 1))
        part(horn(5, 4, 0.20, 0.018, 0.6), 'head', horn_uv(4, 5), M)
        # stubby false legs under the middle rings, each ending in a black claw
        for k in range(3, 10):
            sv = 1 - (k + 0.5) / N; y = L / 2 - sv * L; r = radius(sv) * bulge(sv)
            M = Matrix.Translation((sx * r * 0.70, y, r * 0.30)) @ Matrix.Rotation(sx * 0.55, 4, 'Y') @ Matrix.Rotation(math.pi / 2, 4, 'X')
            part(horn(6, 3, 0.11, 0.05, 0.25), 'seg%d' % (N - 1 - k), horn_uv(3, 6), M)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('grub'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('grub', me); bpy.context.scene.collection.objects.link(ob)
    for name, _ in sorted(G.items(), key=lambda kv: kv[1]): ob.vertex_groups.new(name=name)
    return ob, (hy, hz, hr)


def build_rig(ob, head):
    hy, hz, hr = head
    ad = bpy.data.armatures.new('grub_rig'); arm = bpy.data.objects.new('grub_rig', ad); bpy.context.scene.collection.objects.link(arm)
    bkit.active(arm); bpy.ops.object.mode_set(mode='EDIT')
    root = ad.edit_bones.new('root'); root.head = (0, 0, 0); root.tail = (0, -0.2, 0)
    rest = {}
    for i in range(N):
        s = (i + 0.5) / N; y = L / 2 - s * L; z = radius(s) * 0.9
        b = ad.edit_bones.new('seg%d' % i); b.head = (0, y + SEG / 2, z); b.tail = (0, y - SEG / 2, z); b.parent = root; rest['seg%d' % i] = Vector((0, y, z))
    b = ad.edit_bones.new('head'); b.head = (0, -L / 2, hz); b.tail = (0, -L / 2 - HL, hz); b.parent = root; rest['head'] = Vector((0, -L / 2, hz))
    for sx, nm in ((-1, 'mandL'), (1, 'mandR')):
        px, py, pz = sx * hr * 0.42, hy - HL * 0.50, hz - hr * 0.22
        b = ad.edit_bones.new(nm); b.head = (px, py, pz); b.tail = (px, py - 0.2, pz); b.parent = root; rest[nm] = Vector((px, py, pz))
    b = ad.edit_bones.new('mouth'); b.head = (0, hy - HL * 0.62, hz - hr * 0.1); b.tail = (0, hy - HL * 0.62 - 0.1, hz - hr * 0.1); b.parent = root; rest['mouth'] = Vector(b.head)
    bpy.ops.object.mode_set(mode='OBJECT')
    ob.parent = arm; md = ob.modifiers.new('arm', 'ARMATURE'); md.object = arm
    return arm, rest


# ---------------------------------------------------------------- the chain solver and the clips
def solve(P):
    """P: dict of per-ring lists (tail -> neck) e (stretch), bp (pitch bend at the ring, + up), by (yaw bend), g (girth),
    roll, plus head: (pitch, yaw), jaw (0..1), lift (whole body up), anchor ('tail' | 'mid' | 'head'), fwd (slide along its
    length). Returns {bone: 4x4 deformation in armature space}."""
    e, bp, by, g, roll = P['e'], P['bp'], P['by'], P['g'], P['roll']
    pos = Vector((0, L / 2, 0)); pit = P.get('pit0', 0); yaw = P.get('yaw0', 0); out = []; path = []
    for i in range(N):
        pit += bp[i]; yaw += by[i]
        R = Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(-pit, 4, 'X') @ Matrix.Rotation(roll[i], 4, 'Y')
        d = R @ Vector((0, -1, 0)); c = pos + d * (SEG * e[i] / 2); pos = pos + d * (SEG * e[i])
        path.append((c, R))
    hp, hyw = P['head']; hr_ = Matrix.Rotation(yaw + hyw, 4, 'Z') @ Matrix.Rotation(-(pit + hp), 4, 'X') @ Matrix.Rotation(roll[N - 1], 4, 'Y')
    # the anchor: which part stays over its rest place
    a = P.get('anchor', 'mid')
    if a == 'mid': off = Vector((sum(c.x for c, _ in path) / N, sum(c.y for c, _ in path) / N, 0))
    elif a == 'head': off = Vector((pos.x, pos.y + L / 2, 0))
    else: off = Vector((0, 0, 0))
    off.y -= P.get('fwd', 0)
    lift = P.get('lift', 0); M = {}
    low = min(c.z for c, _ in path)
    for i, (c, R) in enumerate(path):
        s = (i + 0.5) / N; r = radius(s)
        z = c.z - min(0, low) + r * 0.9 * (g[i] if c.z - low < r else 1) + lift
        rest = Vector((0, L / 2 - s * L, r * 0.9))
        S = Matrix.Diagonal((g[i], e[i], g[i], 1))
        M['seg%d' % i] = Matrix.Translation((c.x - off.x, c.y - off.y, z)) @ R @ S @ Matrix.Translation(-rest)
    r1 = radius(1); neck = Vector((pos.x - off.x, pos.y - off.y, pos.z - min(0, low) + r1 * 0.9 * (g[N - 1] if pos.z - low < r1 else 1) + lift))
    hs = P.get('hs', 1)
    H = Matrix.Translation(neck) @ hr_ @ Matrix.Diagonal((hs, hs, hs, 1)) @ Matrix.Translation(-Vector((0, -L / 2, r1 * 0.9)))
    M['head'] = H; M['mouth'] = H
    for sx, nm in ((-1, 'mandL'), (1, 'mandR')):
        pv = REST[nm]
        M[nm] = H @ Matrix.Translation(pv) @ Matrix.Rotation(-sx * (P.get('jaw', 0) * 0.95 - 0.12), 4, 'Z') @ Matrix.Translation(-pv)
    return M


def base():
    return dict(e=[1.0] * N, bp=[0.0] * N, by=[0.0] * N, g=[1.0] * N, roll=[0.0] * N, head=(0.0, 0.0), jaw=0.0, lift=0.0, anchor='mid')


TAU = 2 * math.pi
ease = lambda u: u * u * (3 - 2 * u)
def env(t, a, b, c, d):
    """0 before a, up to 1 by b, held to c, back to 0 by d."""
    if t <= a or t >= d: return 0.0
    if t < b: return ease((t - a) / (b - a))
    if t <= c: return 1.0
    return 1 - ease((t - c) / (d - c))
def breathe(P, t, T, amp=0.035):
    for i in range(N): P['g'][i] *= 1 + amp * math.sin(TAU * (t / T - i / N * 0.8))
def rear(P, amt, i0=5, i1=10):
    """Lift the front: spread a pitch of amt radians over rings i0..i1."""
    for i in range(i0, i1 + 1): P['bp'][i] += amt / (i1 - i0 + 1)
def wave(P, t, T, amp, k=1.4, lat=0.0, hump=0.0):
    """Peristalsis: a squeeze running tail -> head, with an optional hump and side sway."""
    for i in range(N):
        ph = TAU * (t / T - i / N * k)
        P['e'][i] *= 1 + amp * math.sin(ph); P['g'][i] *= 1 - amp * 0.55 * math.sin(ph)
        P['bp'][i] += hump * math.cos(ph) * (1 if 0 < i < N - 1 else 0.3)
        P['by'][i] += lat * math.sin(TAU * t / T - i * 0.55)


def c_idle(t, T):
    P = base(); breathe(P, t, T / 2, 0.04)
    sw = math.sin(TAU * t / T)
    for i in range(7, N): P['by'][i] += 0.05 * sw
    rear(P, 0.10 + 0.05 * math.sin(TAU * t / T * 2), 8, 11)
    P['head'] = (-0.10 + 0.06 * math.sin(TAU * t / T * 2 + 1), 0.16 * sw)
    P['jaw'] = 0.18 + 0.16 * max(0, math.sin(TAU * t / T * 3)) ** 3
    return P
def c_slither(t, T):
    P = base(); wave(P, t, T, 0.17, 1.3, 0.055, 0.085)
    P['head'] = (0.06 * math.sin(TAU * t / T + 2), 0.10 * math.sin(TAU * t / T))
    P['jaw'] = 0.2 + 0.1 * math.sin(TAU * t / T * 2)
    return P
def c_fast(t, T):
    P = base(); wave(P, t, T, 0.27, 1.0, 0.09, 0.19)
    rear(P, -0.10 + 0.12 * math.sin(TAU * t / T), 8, 11)
    P['head'] = (0.14 * math.sin(TAU * t / T + 2.4) - 0.06, 0.14 * math.sin(TAU * t / T)); P['jaw'] = 0.45 + 0.3 * math.sin(TAU * t / T * 2)
    P['lift'] = 0.03 * abs(math.sin(TAU * t / T))
    return P
def c_bite(t, T):  # hit at 0.42
    u = t / T; P = base(); P['anchor'] = 'tail'
    coil = env(u, 0.0, 0.26, 0.30, 0.40); lunge = env(u, 0.30, 0.42, 0.50, 0.90)
    for i in range(3, N): P['e'][i] *= 1 - 0.24 * coil + 0.30 * lunge; P['g'][i] *= 1 + 0.16 * coil - 0.12 * lunge
    rear(P, 0.55 * coil - 0.10 * lunge, 6, 10)
    P['head'] = (-0.25 * coil + 0.20 * lunge, 0); P['jaw'] = 0.2 + 0.8 * env(u, 0.05, 0.3, 0.38, 0.44)
    return P
def c_slam(t, T):  # hit at 0.55
    u = t / T; P = base(); P['anchor'] = 'tail'
    up = env(u, 0.0, 0.34, 0.44, 0.55); sq = env(u, 0.52, 0.58, 0.62, 0.86)
    rear(P, 1.25 * up, 4, 9)
    for i in range(N): P['g'][i] *= 1 + 0.10 * up * (i < 5) + 0.22 * sq * math.sin(math.pi * i / N); P['e'][i] *= 1 - 0.10 * sq
    wob = math.sin((u - 0.58) * 40) * math.exp(-max(0, u - 0.58) * 9) * (u > 0.58)
    for i in range(N): P['g'][i] *= 1 + 0.06 * wob * math.sin(i)
    P['head'] = (-0.5 * up + 0.2 * sq, 0.25 * math.sin(u * 30) * up * 0.3); P['jaw'] = 0.3 + 0.7 * up
    return P
def c_whip(t, T):  # hit at 0.5
    u = t / T; P = base()
    curl = env(u, 0.0, 0.30, 0.36, 0.48); snap = env(u, 0.40, 0.52, 0.58, 0.95)
    for i in range(N):
        k = (1 - i / N)
        P['by'][i] += (0.30 * curl - 0.42 * snap) * (0.4 + k) * (1 if i > 0 else 0)
    P['yaw0'] = 0.9 * curl - 1.3 * snap
    for i in range(0, 4): P['bp'][i] += -0.10 * snap
    P['head'] = (0.1 * snap, -0.5 * curl + 0.5 * snap); P['jaw'] = 0.3 + 0.4 * snap
    return P
def gulp(P, u, a, b, amp=0.30):
    """A swallowed lump runs from the tail to the head between a and b."""
    if u < a or u > b: return
    c = (u - a) / (b - a) * (N + 2) - 1
    for i in range(N): P['g'][i] *= 1 + amp * math.exp(-((i - c) / 1.3) ** 2)
def c_spit(t, T):  # release at 0.5
    u = t / T; P = base(); P['anchor'] = 'tail'
    up = env(u, 0.0, 0.3, 0.62, 0.95); jerk = env(u, 0.44, 0.5, 0.54, 0.7)
    rear(P, 0.75 * up, 6, 10); gulp(P, u, 0.08, 0.5)
    for i in range(8, N): P['e'][i] *= 1 + 0.18 * jerk
    P['head'] = (-0.62 * up + 0.5 * jerk, 0); P['jaw'] = 0.15 + 0.85 * env(u, 0.36, 0.48, 0.58, 0.75)
    return P
def c_barrage(t, T):  # releases at 0.3, 0.5, 0.7
    u = t / T; P = base(); P['anchor'] = 'tail'
    up = env(u, 0.0, 0.2, 0.78, 1.0); rear(P, 0.95 * up, 5, 10)
    k = 0
    for r in (0.3, 0.5, 0.7):
        j = env(u, r - 0.09, r, r + 0.02, r + 0.09); k = max(k, j); gulp(P, u, r - 0.16, r, 0.2)
    for i in range(8, N): P['e'][i] *= 1 + 0.16 * k
    P['head'] = (-0.8 * up + 0.42 * k, 0.22 * math.sin(u * TAU * 2.5) * up); P['jaw'] = 0.25 + 0.75 * k
    return P
def c_lob(t, T):  # release at 0.55
    u = t / T; P = base(); P['anchor'] = 'tail'
    crouch = env(u, 0.0, 0.28, 0.36, 0.50); fling = env(u, 0.40, 0.55, 0.62, 0.95)
    for i in range(N): P['g'][i] *= 1 + 0.20 * crouch - 0.08 * fling; P['e'][i] *= 1 - 0.20 * crouch + 0.16 * fling
    rear(P, -0.10 * crouch + 1.5 * fling, 3, 9); gulp(P, u, 0.1, 0.55, 0.36)
    P['head'] = (0.2 * crouch - 0.2 * fling, 0); P['jaw'] = 0.1 + 0.9 * env(u, 0.44, 0.54, 0.64, 0.8)
    return P
def c_pulse(t, T):  # release at 0.6
    u = t / T; P = base(); P['anchor'] = 'tail'
    up = env(u, 0.0, 0.3, 0.74, 1.0); rear(P, 1.5 * up, 3, 8)
    throb = math.sin(u * TAU * 5) * up; burst = env(u, 0.55, 0.6, 0.64, 0.8)
    for i in range(N): P['g'][i] *= 1 + 0.07 * throb + 0.26 * burst - 0.05 * up
    for i in range(6, N): P['by'][i] += 0.07 * math.sin(u * TAU * 3 + i) * up
    P['head'] = (0.3 * up - 0.5 * burst, 0); P['jaw'] = 0.3 + 0.7 * burst; P['hs'] = 1 + 0.12 * burst
    return P
def c_heal(t, T):  # release at 0.6
    u = t / T; P = base()
    cu = env(u, 0.0, 0.34, 0.72, 1.0)
    for i in range(2, N): P['by'][i] += 0.27 * cu
    P['yaw0'] = -1.2 * cu
    rear(P, 0.35 * cu, 7, 10)
    wave(P, t, T / 3, 0.10 * cu, 1.2)
    P['head'] = (0.25 * cu + 0.1 * math.sin(u * TAU * 3), 0.3 * cu); P['jaw'] = 0.15 + 0.35 * env(u, 0.5, 0.6, 0.66, 0.8)
    return P
def c_ward(t, T):  # release at 0.6
    u = t / T; P = base(); P['anchor'] = 'tail'
    up = env(u, 0.0, 0.25, 0.75, 1.0); rear(P, 1.15 * up, 4, 9)
    for i in range(5, N): P['by'][i] += 0.16 * math.sin(u * TAU * 2 - i * 0.7) * up
    for i in range(5, N): P['roll'][i] = 0.3 * math.sin(u * TAU * 2 - i * 0.5) * up
    hood = env(u, 0.5, 0.6, 0.7, 0.85)
    for i in range(8, N): P['g'][i] *= 1 + 0.22 * hood
    P['head'] = (0.55 * up + 0.2 * math.sin(u * TAU * 4), 0.35 * math.sin(u * TAU * 2) * up); P['jaw'] = 0.2 + 0.8 * hood
    return P
def c_hit(t, T):
    u = t / T; P = base(); k = env(u, 0.0, 0.2, 0.3, 1.0)
    for i in range(N): P['g'][i] *= 1 + 0.10 * k * math.sin(i * 1.3); P['e'][i] *= 1 - 0.08 * k
    rear(P, 0.3 * k, 7, 10); P['head'] = (-0.4 * k, 0.3 * k); P['jaw'] = 0.8 * k
    return P
def c_death(t, T):
    u = t / T; P = base(); w = env(u, 0.0, 0.1, 0.5, 0.7); d = ease(min(1, u / 0.85))
    for i in range(N):
        P['by'][i] += 0.25 * math.sin(u * 40 - i) * w + 0.20 * d
        P['roll'][i] = 2.6 * d
        P['g'][i] *= 1 - 0.30 * ease(max(0, (u - 0.5) / 0.5)); P['e'][i] *= 1 - 0.12 * d
    rear(P, 0.5 * w, 6, 10); P['head'] = (0.4 * d, 0.5 * w); P['jaw'] = 0.9 * w + 0.5 * d
    return P


CLIPS = [  # name, seconds, loop, fn
    ('idle', 3.2, True, c_idle), ('slither', 1.2, True, c_slither), ('slither_fast', 0.62, True, c_fast),
    ('bite', 0.72, False, c_bite), ('slam', 1.0, False, c_slam), ('whip', 0.9, False, c_whip),
    ('spit', 0.85, False, c_spit), ('barrage', 1.3, False, c_barrage), ('lob', 1.1, False, c_lob),
    ('pulse', 1.2, False, c_pulse), ('heal', 1.5, False, c_heal), ('ward', 1.4, False, c_ward),
    ('hit', 0.4, False, c_hit), ('death', 1.3, False, c_death),
]
FPS = 24


def animate(arm):
    bpy.context.scene.render.fps = FPS
    arm.animation_data_create(); bones = arm.pose.bones
    for b in bones: b.rotation_mode = 'QUATERNION'
    for name, dur, loop, fn in CLIPS:
        act = bpy.data.actions.new(name); arm.animation_data.action = act
        frames = max(2, round(dur * FPS)); prev = {}
        for f in range(frames + 1):
            t = dur * f / frames
            M = solve(fn(t if not (loop and f == frames) else 0.0, dur))
            for nm, D in M.items():
                pb = bones[nm]; rest = arm.data.bones[nm].matrix_local
                basis = rest.inverted() @ D @ rest      # the bone's parent (root) never moves
                loc, rot, sc = basis.decompose()
                if nm in prev and prev[nm].dot(rot) < 0: rot.negate()
                prev[nm] = rot.copy()
                pb.location, pb.rotation_quaternion, pb.scale = loc, rot, sc
                for path in ('location', 'rotation_quaternion', 'scale'): pb.keyframe_insert(path, frame=f)
        act.use_fake_user = True
        tr = arm.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act)
        arm.animation_data.action = None
    for pb in bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)


def main():
    global REST
    bkit.reset()
    ob, head = build_mesh(); arm, REST = build_rig(ob, head)
    col, hgt, glow = paint('white')
    mat = bpy.data.materials.new('grub'); mat.use_nodes = True; nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    def tex(img, x):
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = img; n.location = (x, 0); return n
    nt.links.new(tex(bimage('grub_col', col), -600).outputs[0], bsdf.inputs['Base Color'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex(bimage('grub_nrm', normal_map(hgt), 'Non-Color'), -900).outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], bsdf.inputs['Normal'])
    nt.links.new(tex(bimage('grub_glow', glow), -1200).outputs[0], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = 0.34; bsdf.inputs['Metallic'].default_value = 0.0
    ob.data.materials.append(mat)
    animate(arm)
    arm['rad'] = 1.75
    bkit.export_glb('grub')
    for skin in SKINS:
        if skin == 'white': continue
        c, _, g = paint(skin)
        Image.fromarray(c).save(os.path.join(bkit.OUT, 'grub_%s.webp' % skin), quality=90, method=6)
        Image.fromarray(g).save(os.path.join(bkit.OUT, 'grub_%s_glow.webp' % skin), quality=84, method=6)
    Image.fromarray(col).save('/tmp/grub_white_preview.png')


main()
