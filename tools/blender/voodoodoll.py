"""The Carrion Witch's Hex Poppet (src/gfx/voodoodoll3d.js, src/game/sigs/witch.js): a hanged burlap voodoo doll built
from nothing in Blender. A lumpy stuffed body (a voxel union of blobs, seams pinched in, a coarse weave woven here and
tinted from bm's cloth_oat), black cross-stitches as real thread, a button eye and a sewn-shut one leaking stuffing, a
sewn rictus, a red felt heart, straw at the neck, wrists, ankles and a torn seam, a twine noose it dangles from, a pinned
lock of hair, a tooth on a thread, and eight needles (needle_1..8, on bones pin_1..8: tarnished pins with old glass beads,
rusty coffin nails, bone needles threaded with hex-thread; KINDS) each with a rotten twin (rotten_1..8: rust, black, bile) the game shows by name. Colour (with AO), normals and glow are baked in Cycles from the
high-poly body and the materials onto one atlas; rigged (root at the rope's top, hang, head, chest, belly, arms, hands,
legs, feet, tail, hair, charm, one bone per needle) and animated: idle, jab1..jab8, squeeze, dance.

    python tools/blender/voodoodoll.py [--fast]          (needs bpy, numpy, pillow)
Writes assets/models/beasts/voodoodoll.glb. Sources: assets/source/beasts/voodoodoll/ (cloth_oat_c, cloth_red_c from bm)."""
import bpy, bmesh, sys, os, math, random, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector, Matrix, Euler, Quaternion, noise
from mathutils.bvhtree import BVHTree

FAST = '--fast' in sys.argv
SRC = os.path.join(bkit.ROOT, 'assets', 'source', 'beasts', 'voodoodoll')
TMP = tempfile.mkdtemp(prefix='voodoodoll_')
TAU = math.tau
V = Vector
random.seed(13)
rnd = random.uniform
BEADS = ['#ff4040', '#ffd040', '#9ac84a', '#60c0ff', '#ff70d0', '#ffffff', '#ff9030', '#b070ff']  # witch.js BEADS + hex purple

# ---- the doll's measures (Blender: z up, it faces -y; x > 0 is the side called L) ----
HEAD_C = V((0.0, -0.005, 0.745)); NECK = V((0, 0, 0.525)); TOP = V((0, 0.0, 1.34))
SH = {'L': V((0.14, 0, 0.455)), 'R': V((-0.14, 0, 0.455))}
HA = {'L': V((0.365, -0.02, 0.275)), 'R': V((-0.35, -0.035, 0.235))}
HIP = {'L': V((0.08, 0, 0.2)), 'R': V((-0.08, 0, 0.2))}
FT = {'L': V((0.13, -0.015, 0.02)), 'R': V((-0.112, 0.0, 0.035))}
EYE_X = V((0.112, -1, 0.835)); EYE_B = V((-0.108, -1, 0.825)); HEART = V((0.045, -1, 0.405))
# needles: (parent bone, a point inside the doll it aims at, the way its bead points, length outside, through)
PINS = [('head', (0.04, -0.03, 0.80), (0.42, -0.30, 0.86), 0.30, 0), ('chest', (0.045, 0.0, 0.405), (0.30, -0.86, 0.42), 0.30, 0),
        ('head', (0.112, -0.1, 0.835), (0.30, -0.82, 0.48), 0.27, 0), ('belly', (-0.03, 0.0, 0.28), (-0.80, -0.55, 0.22), 0.27, 0),
        ('hand_L', (0.34, -0.02, 0.29), (0.55, -0.45, 0.70), 0.24, 1), ('leg_R', (-0.095, 0.0, 0.12), (-0.62, -0.72, 0.30), 0.25, 1),
        ('chest', (0.0, 0.03, 0.44), (0.25, 0.80, 0.55), 0.28, 0), ('head', (-0.10, 0.0, 0.72), (-0.86, -0.25, 0.44), 0.28, 0)]
PIN_R, BEAD_R = 0.0105, 0.04
KINDS = ['pin', 'pin', 'nail', 'pin', 'bone', 'nail', 'pin', 'bone']           # a few rusty nails and bone needles among the pins


# ---------------------------------------------------------------- textures made here
def weave(n=512, T=24):
    """A plain weave of uneven threads, tileable: height (0..1) and a colour tinted from the oat cloth."""
    y, x = np.mgrid[0:n, 0:n] / n
    rng = np.random.default_rng(7)
    u, v = x * T, y * T
    iu, iv = np.floor(u).astype(int) % T, np.floor(v).astype(int) % T
    fu, fv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
    wu, wv = rng.uniform(0.33, 0.49, T)[iu], rng.uniform(0.33, 0.49, T)[iv]
    over = ((iu + iv) % 2 == 0) * 2.0 - 1
    pw = np.sqrt(np.clip(1 - (fu / wu) ** 2, 0, 1)); pf = np.sqrt(np.clip(1 - (fv / wv) ** 2, 0, 1))
    hw = pw * (0.55 + 0.45 * over * np.cos(fv * np.pi)); hf = pf * (0.55 - 0.45 * over * np.cos(fu * np.pi))
    h = np.maximum(hw, hf)
    shade = np.where(hw >= hf, rng.uniform(0.72, 1.12, T)[iu], rng.uniform(0.72, 1.12, T)[iv])
    fib = rng.normal(0, 1, (n, n))                              # fibres run along the thread on top
    fa = sum(np.roll(fib, k, 0) for k in range(-5, 6)) / 11; fb = sum(np.roll(fib, k, 1) for k in range(-5, 6)) / 11
    shade = shade * (1 + 0.5 * np.where(hw >= hf, fa, fb))
    oat = np.asarray(Image.open(os.path.join(SRC, 'cloth_oat_c.webp')).convert('RGB').resize((n, n)), float) / 255
    col = oat * 2.0 * (shade * (0.3 + 0.7 * h ** 0.8))[..., None]          # a pale sack: it has to stand out of dark ground
    Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).save(os.path.join(TMP, 'weave_c.png'))
    Image.fromarray((np.clip(h, 0, 1) * 255).astype(np.uint8)).save(os.path.join(TMP, 'weave_h.png'))
    c = bpy.data.images.load(os.path.join(TMP, 'weave_c.png')); hh = bpy.data.images.load(os.path.join(TMP, 'weave_h.png'))
    hh.colorspace_settings.name = 'Non-Color'
    return c, hh


# ---------------------------------------------------------------- a mesh builder that remembers materials and weights
class Build:
    def __init__(self):
        self.bm = bmesh.new(); self.wl = self.bm.verts.layers.int.new('wid'); self.specs = []; self.mats = []; self.w = 0; self.m = 0
    def use(self, mat, spec):
        if mat not in self.mats: self.mats.append(mat)
        if spec not in self.specs: self.specs.append(spec)
        self.m = self.mats.index(mat); self.w = self.specs.index(spec)
    def vert(self, co):
        v = self.bm.verts.new(co); v[self.wl] = self.w; return v
    def face(self, vs):
        try: f = self.bm.faces.new(vs); f.material_index = self.m; f.smooth = True; return f
        except ValueError: return None
    def tube(self, pts, rad, sides=3, cap=True):
        pts = [V(p) for p in pts]; n = len(pts)
        rad = list(rad) if hasattr(rad, '__len__') else [rad] * n
        t0 = (pts[1] - pts[0]).normalized(); u = t0.cross(V((0, 0, 1)) if abs(t0.z) < 0.9 else V((1, 0, 0))).normalized()
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            u = (u - t * u.dot(t)).normalized(); w = t.cross(u)
            rings.append([self.vert(p + (u * math.cos(TAU * j / sides) + w * math.sin(TAU * j / sides)) * rad[i]) for j in range(sides)])
        for a, b in zip(rings, rings[1:]):
            for j in range(sides): self.face([a[j], a[(j + 1) % sides], b[(j + 1) % sides], b[j]])
        if cap: self.face(rings[0][::-1]); self.face(rings[-1])
        return rings
    def ball(self, c, r, sub=2, squash=(1, 1, 1), lump=0.0, rot=None):
        M = Matrix.Translation(c) @ (rot or Matrix()) @ Matrix.Diagonal((r * squash[0], r * squash[1], r * squash[2], 1))
        vs = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1, matrix=M)['verts']
        for v in vs:
            v[self.wl] = self.w
            if lump: v.co += (v.co - V(c)).normalized() * noise.noise(v.co * 23) * lump
        for f in {f for v in vs for f in v.link_faces}: f.material_index = self.m; f.smooth = True
        return vs
    def object(self, name, mats):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name); self.bm.to_mesh(me)
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        for m in self.mats: me.materials.append(mats[m])
        o['wids'] = [v[self.wl] for v in self.bm.verts]
        return o


def curve(a, b, sag, n=5, side=None):
    """Points from a to b bowed by sag (down, or along side)."""
    a, b = V(a), V(b); s = V(side) if side else V((0, 0, -1))
    return [a.lerp(b, i / (n - 1)) + s * sag * math.sin(math.pi * i / (n - 1)) for i in range(n)]


# ---------------------------------------------------------------- materials (what the bake reads)
def principled(name, col=(0.5, 0.5, 0.5), rough=0.8, emit=None, estr=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = estr
    t = nt.nodes.new('ShaderNodeTexImage'); t.name = 'BAKE'; t.location = (-400, -400); nt.nodes.active = t
    return m


def hexc(h, k=1.0):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) * k for x in c)


def noisy(m, a, b, scale=30.0, bump=0.0, wave=None):
    """Mix a material's colour between a and b by a noise; optional bump (noise or winding bands for the twine)."""
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = (*a, 1); mx.inputs['B'].default_value = (*b, 1)
    nt.links.new(nz.outputs['Fac'], mx.inputs['Factor']); nt.links.new(mx.outputs['Result'], p.inputs['Base Color'])
    if bump or wave:
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 1; bp.inputs['Distance'].default_value = bump or 0.004
        src = nz.outputs['Fac']
        if wave:
            wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = wave; wv.bands_direction = 'DIAGONAL'; wv.inputs['Distortion'].default_value = 1.5
            nt.links.new(tc.outputs['Object'], wv.inputs['Vector']); src = wv.outputs['Fac']
            m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'; m2.inputs['Factor'].default_value = 0.75
            nt.links.new(mx.outputs['Result'], m2.inputs['A']); nt.links.new(wv.outputs['Color'], m2.inputs['B']); nt.links.new(m2.outputs['Result'], p.inputs['Base Color'])
        nt.links.new(src, bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], p.inputs['Normal'])
    return m


def burlap(wc, wh):
    """The high-poly body's cloth: the weave boxed on, stained, mouldy, grimy toward the feet; seams and old blood from the 'vc' attribute."""
    m = bpy.data.materials.new('burlap'); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links.new; p = N['Principled BSDF']; p.inputs['Roughness'].default_value = 0.95
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.15, 2.15, 2.15); mp.inputs['Rotation'].default_value = (0.06, 0.05, 0.12)
    L(tc.outputs['Object'], mp.inputs['Vector'])
    def img(im):
        t = N.new('ShaderNodeTexImage'); t.image = im; t.projection = 'BOX'; t.projection_blend = 0.22; L(mp.outputs['Vector'], t.inputs['Vector']); return t
    c, h = img(wc), img(wh)
    def mix(kind, a, b, f):
        x = N.new('ShaderNodeMix'); x.data_type = 'RGBA'; x.blend_type = kind
        for s, val in (('A', a), ('B', b), ('Factor', f)):
            if hasattr(val, 'links'): L(val, x.inputs[s])
            elif s == 'Factor': x.inputs[s].default_value = val
            else: x.inputs[s].default_value = (*val, 1)
        return x.outputs['Result']
    def nz(scale, lo, hi, detail=5):
        n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; L(tc.outputs['Object'], n.inputs['Vector'])
        r = N.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = lo; r.inputs['From Max'].default_value = hi; L(n.outputs['Fac'], r.inputs['Value']); return r.outputs['Result']
    col = mix('MULTIPLY', c.outputs['Color'], (0.7, 0.6, 0.46), nz(3.2, 0.42, 0.72))            # big damp stains
    col = mix('MIX', col, (0.045, 0.06, 0.03), nz(11, 0.60, 0.74, 8))                          # mould
    col = mix('MIX', col, (0.9, 0.82, 0.62), mix('MULTIPLY', nz(6, 0.55, 0.8), (0.35, 0.35, 0.35), 1.0))  # sun-bleached patches
    sx = N.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sx.inputs['Vector'])
    gr = N.new('ShaderNodeMapRange'); gr.inputs['From Min'].default_value = 0.22; gr.inputs['From Max'].default_value = -0.02; L(sx.outputs['Z'], gr.inputs['Value'])
    col = mix('MULTIPLY', col, (0.6, 0.5, 0.4), gr.outputs['Result'])                            # dragged through the dirt
    at = N.new('ShaderNodeAttribute'); at.attribute_name = 'vc'; sc = N.new('ShaderNodeSeparateColor'); L(at.outputs['Color'], sc.inputs['Color'])
    col = mix('MIX', col, (0.16, 0.012, 0.01), sc.outputs['Green'])                             # old blood
    col = mix('MIX', col, (0.012, 0.009, 0.008), sc.outputs['Red'])                             # the seams' shadow
    L(col, p.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 1.0; bp.inputs['Distance'].default_value = 0.0075
    L(h.outputs['Color'], bp.inputs['Height']); L(bp.outputs['Normal'], p.inputs['Normal'])
    return m


# ---------------------------------------------------------------- the body
def hp_body(mat):
    B = Build(); B.use('b', ('auto',))
    rot = Euler((0.10, 0.10, 0.0)).to_matrix().to_4x4()
    B.ball(HEAD_C, 1, 4, (0.265, 0.215, 0.25), rot=rot)                       # an oversized sack of a head
    B.ball(HEAD_C + V((0.02, -0.07, -0.075)), 1, 3, (0.215, 0.18, 0.14))      # the jowl
    B.ball(HEAD_C + V((0.1, 0.02, 0.12)), 0.145, 3)                           # a lump where the skull should be even
    B.ball(HEAD_C + V((-0.13, 0.03, 0.02)), 0.14, 3)
    B.ball(NECK, 0.078, 3)
    B.ball(V((0, 0, 0.43)), 1, 3, (0.152, 0.105, 0.105)); B.ball(V((0.01, -0.012, 0.3)), 1, 3, (0.168, 0.128, 0.14))
    B.ball(V((-0.06, -0.03, 0.26)), 0.1, 3)                                    # the belly sags to one side
    def limb(a, b, r0, r1, end, sq):
        n = max(2, int((b - a).length / (r0 * 0.55)))
        for i in range(n + 1): B.ball(a.lerp(b, i / n) + V((rnd(-1, 1), rnd(-1, 1), 0)) * 0.006, r0 + (r1 - r0) * i / n + rnd(-0.004, 0.004), 2)
        B.ball(b, end, 3, sq)
    for s in 'LR':
        limb(SH[s], HA[s], 0.05, 0.052, 0.066, (1, 0.9, 1.05)); limb(HIP[s], FT[s], 0.062, 0.06, 0.075, (1, 1.15, 0.85))
    o = B.object('hp', {'b': mat})
    bkit.active(o)
    md = o.modifiers.new('r', 'REMESH'); md.mode = 'VOXEL'; md.voxel_size = 0.009 if FAST else 0.0055; md.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier='r')
    md = o.modifiers.new('s', 'SMOOTH'); md.factor = 0.6; md.iterations = 6; bpy.ops.object.modifier_apply(modifier='s')
    me = o.data
    for v in me.vertices:                                                     # lumps of stuffing
        c = v.co; v.co = c + v.normal * (noise.noise(c * 5.5) * 0.016 + noise.noise(c * 13 + V((3, 1, 7))) * 0.006)
    me.update()
    return o


def bvh_of(o):
    return BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())


class Seams:
    """Seam lines on the body: pinched in and darkened on the high-poly, then stitched with thread on the trim."""
    def __init__(self, hp):
        self.hp = hp; self.bvh = bvh_of(hp); self.list = []; self.blood = []
    def ray(self, o, d):
        loc, nor, _, _ = self.bvh.ray_cast(V(o), V(d).normalized()); return loc
    def front(self, x, z): return self.ray((x, -1, z), (0, 1, 0))
    def line(self, rays, **kw):
        pts = [p for p in (self.ray(o, d) for o, d in rays) if p]
        self.list.append(dict(pts=pts, r=0.02, depth=0.011, dark=1.0, **kw)); return self.list[-1]
    def apply(self):
        me = self.hp.data; n = len(me.vertices)
        co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(n, 3)
        no = np.empty(n * 3); me.vertices.foreach_get('normal', no); no = no.reshape(n, 3)
        seam = np.zeros(n); push = np.zeros(n); blood = np.zeros(n)
        def dist(pts):
            P = np.array([p[:] for p in pts]); d = np.full(n, 9.0)
            for i in range(0, len(P), 64): d = np.minimum(d, np.sqrt(((co[:, None, :] - P[None, i:i + 64, :]) ** 2).sum(2)).min(1))
            return d
        for s in self.list:
            dense = [a.lerp(b, k / 4) for a, b in zip(s['pts'], s['pts'][1:]) for k in range(4)] + s['pts'][-1:]
            f = np.clip(1 - dist(dense) / s['r'], 0, 1) ** 1.6
            push = np.maximum(push, f * s['depth']); seam = np.maximum(seam, np.clip(f * 1.5, 0, 1) * s['dark'])
        for p, r, a in self.blood: blood = np.maximum(blood, np.clip(1 - dist([p]) / r, 0, 1) ** 1.3 * a)
        blood *= 0.55 + 0.6 * np.array([noise.noise(V(c) * 40) for c in co])
        co -= no * push[:, None]
        me.vertices.foreach_set('co', co.ravel()); me.update()
        vc = me.color_attributes.new('vc', 'FLOAT_COLOR', 'POINT')
        vc.data.foreach_set('color', np.stack([seam, np.clip(blood, 0, 1), np.zeros(n), np.ones(n)], 1).ravel())
        self.bvh = bvh_of(self.hp)
    def near(self, p):
        loc, nor, _, _ = self.bvh.find_nearest(V(p)); return loc, nor


def build_seams(hp):
    S = Seams(hp)
    S.line([((0.013 * math.sin(i * 0.9), -1, 0.5 - 0.335 * i / 40), (0, 1, 0)) for i in range(41)], kind='x', gap=0.043, w=0.027)          # belly seam
    S.line([(HEAD_C + V((math.sin(a), -0.28, math.cos(a))) * 1, -V((math.sin(a), -0.28, math.cos(a)))) for a in np.linspace(-1.3, 1.25, 40)], kind='bar', gap=0.036, w=0.032)  # the crown
    for s in 'LR':
        for a, b, d, w in ((SH[s], HA[s], 0.05, 0.024), (HIP[s], FT[s], 0.045, 0.024)):
            ax = (b - a).normalized(); c = a + ax * d; u = ax.cross(V((0, 1, 0))).normalized(); v = ax.cross(u)
            S.line([(c + (u * math.cos(t) + v * math.sin(t)) * 0.3, -(u * math.cos(t) + v * math.sin(t))) for t in np.linspace(0, TAU, 26)], kind='bar', gap=0.034, w=w)
    zig = []                                                                   # the mouth: a sewn rictus
    for i in range(15):
        x = -0.19 + 0.38 * i / 14; zig.append(((x + 0.006, -1, 0.69 + 0.085 * (abs(x) / 0.19) ** 2 + (0.017 if i % 2 else -0.013) - 0.02 * x), (0, 1, 0)))
    m = S.line(zig, kind='mouth'); m['r'] = 0.02; m['depth'] = 0.016
    for e, r, dp in ((EYE_X, 0.066, 0.024), (EYE_B, 0.06, 0.012)):             # sockets
        p = S.front(e.x, e.z); S.list.append(dict(pts=[p, p + V((0, 0, 0.001))], r=r, depth=dp, dark=0.3, kind='none'))
    tear = S.line([((-0.75, -0.62, 0.37 - 0.14 * i / 10), (0.75 - 0.004 * i, 0.62, -0.008 * (i - 5))) for i in range(11)], kind='torn', gap=0.05, w=0.03)
    tear['r'] = 0.026; tear['depth'] = 0.03
    # old blood: weeping from the sewn eye, the mouth's corners, the heart, the needles' wounds
    def drip(p0, n, r, a=1.0):
        for i in range(n):
            q = S.ray((p0.x + rnd(-0.004, 0.004), -1, p0.z - i * r * 0.55), (0, 1, 0))
            if q: S.blood.append((q, r * (1 - 0.5 * i / n), a))
    ex = S.front(EYE_X.x, EYE_X.z); drip(ex + V((0.0, 0, -0.03)), 9, 0.03); drip(ex + V((-0.03, 0, -0.02)), 5, 0.02)
    drip(S.front(-0.15, 0.72), 6, 0.022, 0.8); drip(S.front(0.14, 0.72), 4, 0.02, 0.7); drip(S.front(HEART.x, HEART.z - 0.05), 8, 0.035, 0.9)
    for bone, tgt, d, ln, thr in PINS:
        q = S.ray(V(tgt) + V(d).normalized(), -V(d))
        if q: S.blood.append((q, 0.045, 0.85))
    S.apply()
    return S


def stitches(T, S):
    """Thread: crosses down the belly, bars over the other seams, the mouth's lacing, the X of the shut eye."""
    def bar(a, b, r=0.0062, lift=0.007):
        pa, na = S.near(a); pb, nb = S.near(b); mid = (pa + pb) / 2; pm, nm = S.near(mid)
        T.tube([pa - na * 0.006, pa + na * lift, pm + nm * (lift + 0.004), pb + nb * lift, pb - nb * 0.006], r, 3, False)
    T.use('thread', ('auto',))
    for s in S.list:
        k = s['kind']
        if k in ('none',): continue
        pts = [S.near(p)[0] for p in s['pts']]
        if k == 'mouth':
            T.tube([S.near(p)[0] + S.near(p)[1] * 0.004 for p in pts], 0.0075, 3, False)
            for i, p in enumerate(pts):
                ln = rnd(0.024, 0.05) * (1.25 if 3 < i < 11 else 0.8); lean = rnd(-0.012, 0.012)
                bar(p + V((lean, 0, ln)), p + V((-lean, 0, -ln * rnd(0.7, 1.1))), 0.0068)
            continue
        acc = 0; last = pts[0]; i = 0
        for a, b in zip(pts, pts[1:]):
            acc += (b - a).length
            if acc < s['gap']: continue
            acc = 0; i += 1
            t = (b - a).normalized(); p, n = S.near(b); side = n.cross(t).normalized(); w = s['w'] * rnd(0.8, 1.2)
            if k == 'torn' and i % 2: T.tube([p - side * w - n * 0.004, p - side * w * 0.3 + n * 0.02, p + side * w * 0.1 + n * 0.045 + t * 0.02], [0.006, 0.0055, 0.002], 3); continue  # a snapped stitch
            sl = t * w * (0.75 if k == 'x' else rnd(-0.5, 0.5))
            bar(p - side * w + sl, p + side * w - sl)
            if k == 'x': bar(p - side * w - sl, p + side * w + sl)
    e = S.front(EYE_X.x, EYE_X.z)                                               # the eye sewn shut with a great X
    for sx in (1, -1): bar(e + V((0.055 * sx, 0, 0.058)), e + V((-0.055 * sx, 0, -0.055)), 0.0115, 0.014)
    for dx in (-0.03, 0.0, 0.032): bar(e + V((dx - 0.006, 0, 0.022)), e + V((dx + 0.006, 0, -0.022)), 0.005, 0.006)


def trim(S):
    T = Build()
    stitches(T, S)
    # the heart: a felt patch stitched on crooked, a little proud of the chest
    T.use('felt', ('auto',))
    hc = HEART; sz = 0.0056; rings = []
    def hpt(t, k, lift):
        x = 16 * math.sin(t) ** 3; z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t) + 2
        x, z = x * math.cos(0.22) - z * math.sin(0.22), x * math.sin(0.22) + z * math.cos(0.22)
        p = S.front(hc.x + x * sz * k, hc.z + z * sz * k); q, n = S.near(p); return q + n * lift
    for k, lift in ((1.0, -0.004), (1.0, 0.016), (0.62, 0.025)): rings.append([T.vert(hpt(TAU * i / 22, k, lift)) for i in range(22)])
    c = T.vert(hpt(0, 0.0, 0.027))
    for a, b in zip(rings, rings[1:]):
        for i in range(22): T.face([a[i], a[(i + 1) % 22], b[(i + 1) % 22], b[i]])
    for i in range(22): T.face([rings[2][i], rings[2][(i + 1) % 22], c])
    T.use('thread', ('auto',))
    for i in range(11):
        t = TAU * (i + 0.3) / 11; a, b = hpt(t, 1.22, 0.0), hpt(t + 0.1, 0.84, 0.02)
        T.tube([a - S.near(a)[1] * 0.004, (a + b) / 2 + S.near(a)[1] * 0.03, b], 0.0058, 3, False)
    # the button eye: black, domed, sewn on with a hex-lit thread
    T.use('button', ('bone', 'head'))
    p, n = S.near(S.front(EYE_B.x, EYE_B.z)); n = (n + V((-0.08, 0, 0.1))).normalized(); u = n.cross(V((0, 0, 1))).normalized(); w = n.cross(u)
    prof = [(0.076, -0.006), (0.078, 0.013), (0.066, 0.024), (0.046, 0.017), (0.0, 0.02)]
    rr = [[T.vert(p + (u * math.cos(TAU * j / 14) + w * math.sin(TAU * j / 14)) * r + n * h) for j in range(14)] for r, h in prof[:-1]]
    cc = T.vert(p + n * prof[-1][1])
    for a, b in zip(rr, rr[1:]):
        for j in range(14): T.face([a[j], a[(j + 1) % 14], b[(j + 1) % 14], b[j]])
    for j in range(14): T.face([rr[-1][j], rr[-1][(j + 1) % 14], cc])
    T.use('hexthread', ('bone', 'head'))
    for a in (0.5, 0.5 + math.pi / 2): d = (u * math.cos(a) + w * math.sin(a)) * 0.026; T.tube([p + n * 0.017 - d, p + n * 0.027, p + n * 0.017 + d], 0.0075, 4, False)
    T.use('glint', ('bone', 'head')); T.ball(p + n * 0.022 + (u - w) * 0.028, 0.012, 1, (1, 1, 0.6))  # a sick green glint: it watches
    # straw and stuffing: at the neck, the wrists, the ankles, the torn seam, the shut eye
    def tuft(o, d, n, ln, spread, bone, r=0.0075):
        o, d = V(o), V(d).normalized()
        for i in range(n):
            T.use('straw', bone)
            dd = (d + V((rnd(-1, 1), rnd(-1, 1), rnd(-1, 1))) * spread).normalized(); l = ln * rnd(0.55, 1.15); bend = V((rnd(-1, 1), rnd(-1, 1), rnd(-1.4, 0.2))) * l * 0.3
            T.tube([o - dd * 0.02, o + dd * l * 0.5 + bend * 0.4, o + dd * l + bend], [r, r * 0.85, r * 0.25], 3)
    def wool(c, r, bone, n=3):
        T.use('wool', bone)
        for i in range(n): T.ball(V(c) + V((rnd(-1, 1), rnd(-1, 1), rnd(-1, 1))) * r * 0.6, r * rnd(0.6, 1.0), 1, lump=r * 0.5)
    for i in range(13):
        a = TAU * i / 13 + rnd(-0.2, 0.2); d = V((math.cos(a), math.sin(a), 0)); q = S.ray(NECK + d + V((0, 0, 0.0)), -d)
        if q: tuft(q, d + V((0, 0, rnd(-0.9, 0.5))), 2, 0.1, 0.25, ('bone', 'hang'))
    for s in 'LR':
        ax = (HA[s] - SH[s]).normalized(); tuft(HA[s] + ax * 0.045, ax, 7, 0.11, 0.5, ('bone', 'hand_' + s)); wool(HA[s] + ax * 0.06, 0.028, ('bone', 'hand_' + s), 1)
        ax = (FT[s] - HIP[s]).normalized(); tuft(FT[s] + ax * 0.05, ax + V((0, -0.3, 0)), 6, 0.09, 0.55, ('bone', 'foot_' + s))
    tp = [S.near(p) for p in S.list[-1]['pts'][2:9:2]] if S.list[-1]['kind'] == 'torn' else []
    for s in S.list:
        if s['kind'] == 'torn':
            for p in s['pts'][2:10:2]:
                q, n = S.near(p); tuft(q - n * 0.01, n + V((0, 0, -0.5)), 3, 0.1, 0.45, ('bone', 'belly')); wool(q + n * 0.004, 0.032, ('bone', 'belly'), 1)
    e, n = S.near(S.front(EYE_X.x + 0.02, EYE_X.z - 0.05)); wool(e + n * 0.012, 0.026, ('bone', 'head'), 2); tuft(e, n + V((0.2, 0, -0.8)), 4, 0.1, 0.4, ('bone', 'head'), 0.006)
    # the noose: twice round the neck, a fat knot at the nape, the rope up to nothing, a frayed tail
    def root_hang(co):
        t = min(1, max(0, (co.z - 0.62) / (TOP.z - 0.62))); return {'root': t, 'hang': 1 - t} if t > 0 else {'hang': 1}
    T.use('rope', ('fn', root_hang)); RR = 0.021
    coil = []
    for i in range(31):
        a = math.pi / 2 + TAU * 2 * i / 30; d = V((math.cos(a), math.sin(a), 0)); z = NECK.z + 0.034 - 0.05 * i / 30 + 0.006 * math.sin(a * 3)
        q = S.ray(V((0, 0, z)) + d, -d); coil.append((q or V((0, 0, z))) + d * RR * 0.75)
    T.tube(coil, RR, 6)
    knot = V((0.015, 0.118, NECK.z + 0.03)); T.ball(knot, 0.05, 2, (1, 0.85, 1.25), lump=0.012)
    up = [knot + V((0, 0.0, 0.02)), V((0.01, 0.2, 0.62)), V((0.005, 0.262, 0.74)), V((0, 0.235, 0.88)), V((0, 0.13, 1.03)), V((0, 0.04, 1.15)), V((0, 0.005, 1.25)), TOP]
    dense = [up[0]]
    for i in range(len(up) - 1):
        for k in (1, 2, 3): t = k / 3; a, b = up[i], up[i + 1]; pa = up[max(i - 1, 0)]; pb = up[min(i + 2, len(up) - 1)]
        for k in (1, 2, 3):
            t = k / 3; dense.append(0.5 * ((2 * a) + (-pa + b) * t + (2 * pa - 5 * a + 4 * b - pb) * t * t + (-pa + 3 * a - 3 * b + pb) * t ** 3))
    T.tube(dense, RR * 0.95, 6)
    T.use('rope', ('bone', 'root'))
    for i in range(5): d = V((rnd(-1, 1), rnd(-1, 1), 1.2)).normalized(); T.tube([TOP - V((0, 0, 0.02)), TOP + d * 0.05, TOP + d * 0.1 + V((rnd(-.03, .03), rnd(-.03, .03), 0))], [0.009, 0.007, 0.002], 3)
    T.use('rope', ('bone', 'tail'))
    tail = [knot, knot + V((0.03, 0.05, -0.03)), knot + V((0.04, 0.07, -0.1)), knot + V((0.035, 0.065, -0.18)), knot + V((0.045, 0.07, -0.25))]
    T.tube(tail, [RR * 0.9] * 4 + [RR * 0.8], 6)
    for i in range(5): d = V((rnd(-1, 1), rnd(-1, 1), -1.6)).normalized(); T.tube([tail[-1] + V((0, 0, 0.01)), tail[-1] + d * 0.035, tail[-1] + d * 0.075], [0.009, 0.007, 0.002], 3)
    # a lock of the victim's hair, pinned to the chest and bound with red thread
    hp0, hn = S.near(S.ray(HEAD_C + V((1, -0.35, 0.25)), (-1, 0.35, -0.25))); hp0 = hp0 + hn * 0.016
    T.use('hair', ('bone', 'hair'))
    for i in range(9):
        o = hp0 + V((rnd(-0.01, 0.01), rnd(-0.012, 0.012), 0)); ln = rnd(0.26, 0.4); sw = V((rnd(0.0, 0.06), rnd(-0.04, 0.03), 0))
        T.tube([o + V((0, 0, 0.012)), o + V((0, -0.012, -ln * 0.3)) + sw * 0.3, o + V((0, -0.02, -ln * 0.7)) + sw * 0.8, o + V((0, -0.008, -ln)) + sw * 1.6], [0.0095, 0.0105, 0.009, 0.002], 3)
    T.use('redthread', ('bone', 'hair')); T.tube([hp0 + V((-0.022, -0.004, -0.02)), hp0 + V((0, -0.02, -0.024)), hp0 + V((0.022, -0.004, -0.02))], 0.011, 4)
    T.use('steel', ('bone', 'head')); T.tube([hp0 + V((0.05, -0.012, 0.04)), hp0 + V((0.01, -0.006, 0.004)), hp0 + V((-0.04, 0.01, -0.03))], [0.006, 0.006, 0.002], 4)
    T.use('bead0', ('bone', 'head')); T.ball(hp0 + V((0.05, -0.012, 0.04)), 0.017, 1)
    # a tooth on a thread from the right wrist
    w0 = HA['R'] + V((0.0, -0.03, 0.03)); t0 = w0 + V((0.01, -0.03, -0.14))
    T.use('thread', ('bone', 'hand_R')); T.tube([w0 + V((0, 0.02, 0.01)), w0], 0.005, 3, False)
    T.use('thread', ('bone', 'charm')); T.tube([w0, w0.lerp(t0, 0.5), t0], 0.0045, 3, False)
    T.use('tooth', ('bone', 'charm'))
    T.ball(t0 + V((0, 0, -0.012)), 1, 2, (0.03, 0.026, 0.026), lump=0.004)
    for dx in (-0.013, 0.013): T.tube([t0 + V((dx, 0, -0.02)), t0 + V((dx * 1.3, 0, -0.05)), t0 + V((dx * 1.9, 0.004, -0.078))], [0.013, 0.009, 0.002], 5)
    return T, hp0, w0


def needles(S, mats):
    """pin_N / rot_N: one mesh each, rigid on bone pin_N whose head is the wound and whose length is the needle's."""
    out = []; info = []
    for i, (bone, tgt, d, ln, thr) in enumerate(PINS):
        d = V(d).normalized(); tgt = V(tgt)
        e = S.ray(tgt + d, -d) or tgt
        depth = 0.07
        if thr:                                                                # run through: the point comes out the far side
            x = S.ray(tgt - d, d); depth = ((x - e).length + 0.07) if x else 0.12
        info.append((bone, e, d))
        kind = KINDS[i]; side = d.cross(V((0, 0, 1))).normalized() if abs(d.z) < 0.95 else V((1, 0, 0))
        for rot in (0, 1):
            B = Build(); sp = ('bone', 'pin_%d' % (i + 1))
            if kind == 'nail':                                                 # a square coffin nail, bent, a hammered head
                B.use('rust' if rot else 'nail', sp); bend = side * 0.012
                B.tube([e - d * depth, e - d * (depth - 0.03), e + d * (ln * 0.5) + bend, e + d * ln], [0.0015, 0.011, 0.0135, 0.015], 4)
                B.tube([e + d * (ln - 0.004), e + d * (ln + 0.016)], [0.037, 0.034], 7)
            elif kind == 'bone':                                               # a bone needle, its eye threaded with hex-thread
                B.use('rotbone' if rot else 'bone', sp)
                B.tube([e - d * depth, e - d * (depth - 0.045), e + d * (ln * 0.55), e + d * (ln + 0.01)], [0.001, 0.0115, 0.016, 0.019], 5)
                B.ball(e + d * (ln + 0.022), 0.025, 1, (1, 1, 0.8), lump=0.005)
                B.use('hexthread', sp); q = e + d * (ln - 0.03)
                B.tube([q - side * 0.02, q + V((0, 0, -0.045)) + side * 0.012, q + V((0, 0, -0.1)) + side * 0.025, q + V((0, 0, -0.15)) + side * 0.01], 0.0055, 3)
            else:                                                              # a long pin, a glass bead
                B.use('rust' if rot else 'steel', sp)
                B.tube([e - d * depth, e - d * (depth - 0.035), e + d * (ln - 0.02), e + d * ln], [0.001, PIN_R * 0.8, PIN_R, PIN_R], 5)
                B.use('rotbead' if rot else 'bead%d' % i, sp); B.ball(e + d * (ln + BEAD_R * 0.6), BEAD_R * (0.92 if rot else 1), 2, lump=0.006 if rot else 0)
            if rot:                                                            # the wound festers and runs
                B.use('ooze', B.specs[0]); q, n = S.near(e)
                B.ball(q + n * 0.004, 0.034, 1, lump=0.01)
                run = [q + n * 0.006]
                for k in range(1, 5):
                    p, pn = S.near(run[-1] + V((rnd(-0.008, 0.008), 0, -0.028)) - n * 0.01); run.append(p + pn * 0.007)
                B.tube(run, [0.016, 0.012, 0.01, 0.011, 0.015], 5); B.ball(run[-1], 0.019, 1)
                B.ball(e + d * (ln * 0.55), 0.016, 1, lump=0.004)             # a bead of it on the shaft
            out.append(B.object(('rotten_%d' if rot else 'needle_%d') % (i + 1), mats))
    return out, info


# ---------------------------------------------------------------- rig
CAPS = None
def capsules():
    c = {'head': (HEAD_C + V((0, 0, -0.06)), HEAD_C + V((0, 0, 0.08)), 0.2), 'chest': (V((0, 0, 0.47)), V((0, 0, 0.41)), 0.1), 'belly': (V((0, 0, 0.33)), V((0, 0, 0.24)), 0.125)}
    for s in 'LR':
        m = SH[s].lerp(HA[s], 0.5); c['arm_' + s] = (SH[s].lerp(HA[s], 0.12), m, 0.05); c['hand_' + s] = (m, HA[s], 0.06)
        m = HIP[s].lerp(FT[s], 0.5); c['leg_' + s] = (HIP[s].lerp(FT[s], 0.15), m, 0.06); c['foot_' + s] = (m, FT[s], 0.07)
    return c


def auto_w(co):
    global CAPS
    CAPS = CAPS or capsules(); w = {}
    for k, (a, b, r) in CAPS.items():
        ab = b - a; t = min(1, max(0, (co - a).dot(ab) / ab.length_squared)); s = max(0.0, (co - (a + ab * t)).length - r + 0.035)
        w[k] = math.exp(-(s / 0.03) ** 2)
    top = sorted(w.items(), key=lambda kv: -kv[1])[:3]; tot = sum(v for _, v in top) or 1
    return {k: v / tot for k, v in top if v / tot > 0.02} or {'chest': 1}


def rig(pininfo, hairp, charmp):
    ad = bpy.data.armatures.new('rig'); arm = bpy.data.objects.new('voodoodoll', ad); bpy.context.scene.collection.objects.link(arm)
    bkit.active(arm); bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, head, tail, parent=None):
        b = ad.edit_bones.new(name); b.head = head; b.tail = tail; b.parent = ad.edit_bones[parent] if parent else None; return b
    bone('root', TOP, TOP + V((0, 0, -0.2)))
    bone('hang', NECK, NECK + V((0, 0, -0.08)), 'root'); bone('head', NECK, HEAD_C + V((0, 0, 0.2)), 'hang')
    bone('chest', NECK, V((0, 0, 0.37)), 'hang'); bone('belly', V((0, 0, 0.37)), V((0, 0, 0.18)), 'chest')
    for s in 'LR':
        m = SH[s].lerp(HA[s], 0.5); bone('arm_' + s, SH[s], m, 'chest'); bone('hand_' + s, m, HA[s] + (HA[s] - SH[s]).normalized() * 0.06, 'arm_' + s)
        m = HIP[s].lerp(FT[s], 0.5); bone('leg_' + s, HIP[s], m, 'belly'); bone('foot_' + s, m, FT[s] + (FT[s] - HIP[s]).normalized() * 0.07, 'leg_' + s)
    bone('tail', V((0.03, 0.15, 0.54)), V((0.045, 0.19, 0.3)), 'hang'); bone('hair', hairp, hairp + V((0, 0, -0.25)), 'head'); bone('charm', charmp, charmp + V((0, 0, -0.15)), 'hand_R')
    for i, (pb, e, d) in enumerate(pininfo): bone('pin_%d' % (i + 1), e, e + d * 0.25, pb)
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def skin(o, arm):
    wids = list(o['wids']); specs = o['specs']; del o['wids']; del o['specs']
    for b in arm.data.bones: o.vertex_groups.new(name=b.name)
    for v in o.data.vertices:
        sp = specs[wids[v.index]]
        w = {sp[1]: 1} if sp[0] == 'bone' else auto_w(v.co) if sp[0] == 'auto' else sp[1](v.co)
        for k, x in w.items(): o.vertex_groups[k].add([v.index], x, 'REPLACE')
    o.parent = arm; md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm


# ---------------------------------------------------------------- animation: poses sampled at 30 fps
def clips(pininfo):
    w = TAU / 4
    s, c, e = math.sin, math.cos, math.exp
    def limp(t, ph=0.0, k=1.0):                                                # what dangles follows late
        return {'tail': dict(r=(0.14 * k * s(2 * w * t - 1.6 + ph), 0.16 * k * s(w * t - 1.3 + ph), 0)), 'hair': dict(r=(0.1 * k * s(2 * w * t - 1.9 + ph), 0.2 * k * s(w * t - 1.5 + ph), 0)),
                'charm': dict(r=(0.25 * k * s(2 * w * t - 2.2 + ph), 0.3 * k * s(w * t - 1.9 + ph), 0))}
    def idle(t):
        tw = e(-((t - 2.7) / 0.07) ** 2); tw2 = e(-((t - 1.15) / 0.05) ** 2)      # two small spasms: it is not quite dead
        p = {'root': dict(r=(0.04 * s(2 * w * t + 1), 0.075 * s(w * t), 0)),
             'hang': dict(r=(0.05 + 0.035 * s(w * t + 2), 0.045 * s(w * t - 0.6), 0.22 * s(w * t + 0.5))),
             'head': dict(r=(-0.04 + 0.05 * s(2 * w * t - 0.4), 0.15 + 0.07 * s(w * t - 1.2) + 0.1 * tw, 0.06 * s(w * t) - 0.12 * tw)),
             'chest': dict(r=(0.03 * s(w * t - 0.8), 0, 0)), 'belly': dict(r=(0.04 * s(2 * w * t - 1.0), 0.03 * s(w * t - 1), 0)),
             'arm_L': dict(r=(0.07 * s(w * t - 1), 0.1 * s(w * t - 0.9) + 0.12 * tw2, 0)), 'hand_L': dict(r=(0.05 * s(2 * w * t - 1.8), 0.12 * s(w * t - 1.5) - 0.3 * tw2, 0)),
             'arm_R': dict(r=(0.08 * s(w * t - 1.4), 0.1 * s(w * t - 1.1) + 0.55 * tw, 0)), 'hand_R': dict(r=(0.05 * s(2 * w * t - 2.2), 0.12 * s(w * t - 1.7) + 0.35 * tw, 0)),
             'leg_L': dict(r=(0.09 * s(2 * w * t - 1.2), 0.07 * s(w * t - 1.1), 0)), 'foot_L': dict(r=(0.08 * s(2 * w * t - 2.0), 0.06 * s(w * t - 1.7), 0)),
             'leg_R': dict(r=(0.09 * s(2 * w * t - 2.1) - 0.3 * tw, 0.07 * s(w * t - 1.3), 0)), 'foot_R': dict(r=(0.08 * s(2 * w * t - 2.9) + 0.25 * tw, 0.06 * s(w * t - 1.9), 0))}
        p.update(limp(t)); return p
    def flail(p, k, t, f=1.0):
        for sg, sd, ph in ((1, 'L', 0.0), (-1, 'R', 1.7)):
            p['arm_' + sd] = dict(r=(0.5 * k * s(t * 31 * f + ph), -sg * k * (0.75 + 0.55 * s(t * 37 * f + ph)), 0)); p['hand_' + sd] = dict(r=(0, -sg * k * 0.6 * s(t * 43 * f + ph + 1), 0.4 * k * s(t * 29 * f)))
            p['leg_' + sd] = dict(r=(-k * (0.25 + 0.6 * s(t * 33 * f + ph + 2)), -sg * k * 0.3, 0)); p['foot_' + sd] = dict(r=(k * 0.7 * s(t * 41 * f + ph), 0, 0))
    def squeeze(t):                                                            # crushed by 0.45 s (when the game's squeeze lands), sprung back by 1 s
        if t < 0.12: k = 0.0
        elif t < 0.45: k = ((t - 0.12) / 0.33) ** 1.5
        elif t < 0.52: k = 1.0
        else: k = e(-8.5 * (t - 0.52)) * c(25 * (t - 0.52))
        a = min(1, t / 0.1) * (1 if t < 0.52 else e(-6 * (t - 0.52)))           # how hard it thrashes
        kk = max(k, -0.5)
        p = {'root': dict(r=(0.05 * a * s(t * 50), 0.06 * a * s(t * 44), 0), l=(0, 0, 0.05 * kk)),
             'hang': dict(r=(-0.12 * kk, 0.1 * a * s(t * 39), 0.28 * a * s(t * 47))),
             'belly': dict(s=(1 - 0.52 * kk, 1 + 0.2 * kk, 1 - 0.5 * kk)), 'chest': dict(s=(1 - 0.36 * kk, 1 + 0.1 * kk, 1 - 0.3 * kk)),
             'head': dict(r=(-0.38 * kk + 0.07 * a * s(t * 61), 0.12 * a * s(t * 53), 0.1 * a * s(t * 37)), s=(1 + 0.24 * kk, 1 + 0.12 * kk, 1 + 0.24 * kk))}
        flail(p, a * (0.35 + 0.65 * abs(kk)), t)
        p.update(limp(t * 9, 0, 1.5 * a)); return p
    sn = lambda u: math.copysign(abs(s(u)) ** 0.3, s(u))                        # a puppet's snap from pose to pose
    def dance(t):
        b = TAU * t / 0.8
        p = {'root': dict(r=(0.06 * sn(2 * b), 0.12 * sn(b), 0), l=(0, 0, 0.05 * abs(s(b)))), 'hang': dict(r=(0, 0, 0.3 * sn(b + 0.5))),
             'head': dict(r=(0.16 * sn(2 * b + 1), 0.38 * sn(b), 0.1 * sn(b))), 'belly': dict(r=(0, -0.14 * sn(b), 0)),
             'arm_L': dict(r=(0.2 * sn(2 * b), -(0.95 + 0.75 * sn(b)), 0)), 'hand_L': dict(r=(0, -0.6 * sn(b + 1.2), 0)),
             'arm_R': dict(r=(-0.2 * sn(2 * b), 0.95 - 0.75 * sn(b), 0)), 'hand_R': dict(r=(0, -0.6 * sn(b + 1.2), 0)),
             'leg_L': dict(r=(-0.75 * max(0, sn(b)), -0.25 * max(0, sn(b)), 0)), 'foot_L': dict(r=(0.6 * max(0, sn(b - 0.6)), 0, 0)),
             'leg_R': dict(r=(-0.75 * max(0, -sn(b)), 0.25 * max(0, -sn(b)), 0)), 'foot_R': dict(r=(0.6 * max(0, -sn(b - 0.6)), 0, 0))}
        p.update(limp(t * 5, 0, 1.6)); return p
    def jab(i):
        bone, pt, d = pininfo[i]; push = -d; push.z = 0; om = push.cross(V((0, 0, 1)))  # the blow swings it away from the needle
        def f(t):
            hit, wind = 0.14, 0.09                                             # drawn back (the doll cringes), then driven in hard
            ll = 0.62 + 0.3 * s(math.pi / 2 * t / wind) if t < wind else 0.92 * (1 - ((t - wind) / (hit - wind)) ** 2) if t < hit else -0.04 * e(-22 * (t - hit))
            p = {'pin_%d' % (i + 1): dict(ll=(0, ll, 0), s=(min(1, 0.02 + t / 0.04),) * 3)}
            if t < hit:
                a = min(1, t / wind) ** 0.5
                p['hang'] = dict(r=tuple(om * 0.14 * a)); p['head'] = dict(r=tuple(om * 0.1 * a + V((0.14 * a, 0, 0))))
                p['belly'] = dict(s=(1 - 0.07 * a, 1 + 0.06 * a, 1 - 0.07 * a))
                for sd, sg in (('L', 1), ('R', -1)): p['arm_' + sd] = dict(r=(-0.35 * a, -sg * 0.45 * a, 0))
            else:
                u = t - hit; k = e(-6 * u); o = k * s(26 * u); q = k * c(26 * u)
                p['root'] = dict(r=tuple(om * 0.26 * o)); p['hang'] = dict(r=tuple(om * 0.62 * o + V((0, 0, 0.28 * o))))
                p['head'] = dict(r=tuple(-om * 0.42 * o + V((0.16 * q, 0, 0.16 * o)))); p['belly'] = dict(s=(1 + 0.2 * q, 1 - 0.2 * q, 1 + 0.2 * q))
                p['chest'] = dict(s=(1 + 0.1 * q, 1 - 0.1 * q, 1 + 0.1 * q))
                flail(p, 1.05 * k, u, 0.8); p.update(limp(u * 8, 0, 1.6 * k))
            return p
        return f
    out = {'idle': (4.0, idle), 'squeeze': (1.0, squeeze), 'dance': (1.6, dance)}
    for i in range(len(pininfo)): out['jab%d' % (i + 1)] = (0.6, jab(i))
    return out


def animate(arm, pininfo):
    sc = bpy.context.scene; sc.render.fps = 30
    bkit.active(arm); arm.animation_data_create()
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    rest = {b.name: b.matrix_local.to_3x3() for b in arm.data.bones}
    acts = []
    for name, (dur, fn) in clips(pininfo).items():
        act = bpy.data.actions.new(name); arm.animation_data.action = act; last = {}; used = set()
        frames = round(dur * 30)
        for f in range(frames + 1):
            pose = fn(f / 30)
            if f == frames and name in ('idle', 'dance'): pose = fn(0)
            used |= set(pose)
            for bn in used:
                pb = arm.pose.bones[bn]; d = pose.get(bn, {}); M = rest[bn]
                q = (M.inverted() @ Euler(d.get('r', (0, 0, 0)), 'XYZ').to_matrix() @ M).to_quaternion()
                if bn in last and last[bn].dot(q) < 0: q.negate()
                last[bn] = q.copy(); pb.rotation_quaternion = q
                pb.location = V(d['ll']) if 'll' in d else M.inverted() @ V(d.get('l', (0, 0, 0))); pb.scale = d.get('s', (1, 1, 1))
                for path in ('rotation_quaternion', 'location', 'scale'): pb.keyframe_insert(path, frame=f)
        acts.append(act)
        for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    arm.animation_data.action = None
    for a in acts:                                                             # one NLA track each, so every clip is exported
        tr = arm.animation_data.nla_tracks.new(); tr.name = a.name; st = tr.strips.new(a.name, 0, a); st.name = a.name
    return acts


# ---------------------------------------------------------------- bake
def bake_all(body, hp, trimo, pins, button):
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 8 if FAST else 24
    sc.render.bake.margin = 6
    SZ = 512 if FAST else 1024
    lp = [body, trimo, button] + pins
    bpy.ops.object.select_all(action='DESELECT')
    for o in lp: o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(70), island_margin=0.004, area_weight=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    ti = [i for i, m in enumerate(trimo.data.materials) if m.name == 'thread'][0]
    for o in lp:                                                               # the top strip of the atlas is flat thread black: stitches are too thin to bake
        n = len(o.data.loops); uv = np.empty(n * 2); o.data.uv_layers[0].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2) * 0.955
        if o is trimo:
            for f in o.data.polygons:
                if f.material_index == ti: uv[f.loop_start:f.loop_start + f.loop_total] = (0.5, 0.98)
        o.data.uv_layers[0].data.foreach_set('uv', uv.ravel())
    def image(name, data=False, size=SZ):
        im = bpy.data.images.new(name, size, size, alpha=False, is_data=data)
        if data: im.colorspace_settings.name = 'Non-Color'
        return im
    def target(im):
        for m in bpy.data.materials:
            if m.node_tree and 'BAKE' in m.node_tree.nodes: n = m.node_tree.nodes['BAKE']; n.image = im; m.node_tree.nodes.active = n
    def bake(objs, typ, im, src=None, **kw):
        target(im); bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        if src: src.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.bake(type=typ, use_selected_to_active=bool(src), cage_extrusion=0.03, max_ray_distance=0.06, margin=6, use_clear=False, **kw)
    def px(im):
        a = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(a); return a.reshape(im.size[1], im.size[0], 4)[::-1, :, :3]
    acc = [trimo, button] + pins
    col, nrm, ao, em = image('col'), image('nrm', True), image('ao', True), image('em')
    nrm.generated_color = (0.5, 0.5, 1, 1)
    bake([body], 'DIFFUSE', col, hp, pass_filter={'COLOR'}); bake(acc, 'DIFFUSE', col, pass_filter={'COLOR'})
    bake([body], 'NORMAL', nrm, hp); bake(acc, 'NORMAL', nrm)
    bake(acc, 'EMIT', em)
    hp.hide_render = True; sc.cycles.samples = 24 if FAST else 96
    live = [o for o in pins if o.name.startswith('needle')]; rot = [o for o in pins if o.name.startswith('rotten')]
    for o in pins: o.hide_render = True
    bake([body, trimo, button], 'AO', ao)                                      # the doll shades itself, without the needles
    for a, b in ((live, rot), (rot, live)):
        for o in a: o.hide_render = False
        for o in b: o.hide_render = True
        bake(a, 'AO', ao)
    for o in pins: o.hide_render = False
    C, A, E, Nn = px(col), px(ao)[..., :1], px(em), px(nrm)
    A = np.clip(A, 0, 1) ** 1.25
    alb = C * (0.2 + 0.8 * A) * (1 + 0.0 * A) * np.array([1.0, 0.97, 0.94]) ** (1 - A)   # AO in, a touch warm in the folds
    k = int(SZ * 0.04); alb[:k] = (0.035, 0.03, 0.035); E[:k] = 0; Nn[:k] = (0.5, 0.5, 1)
    def save(a, name, size=None):
        im = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))
        if size: im = im.resize((size, size), Image.LANCZOS)
        im.save(os.path.join(TMP, name)); return bpy.data.images.load(os.path.join(TMP, name))
    ia, ie, inr = save(alb, 'voodoodoll_c.png'), save(E, 'voodoodoll_e.png', SZ // 2), save(Nn, 'voodoodoll_n.png')
    inr.colorspace_settings.name = 'Non-Color'
    def final(name, rough):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']; p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = 0
        def tex(im): t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; return t
        nt.links.new(tex(ia).outputs['Color'], p.inputs['Base Color'])
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex(inr).outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
        nt.links.new(tex(ie).outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 1.0
        return m
    cloth, gloss = final('poppet', 0.93), final('poppet_gloss', 0.32)
    for o, m in [(body, cloth), (trimo, cloth), (button, gloss)] + [(p, gloss) for p in pins]:
        o.data.materials.clear(); o.data.materials.append(m)
        for f in o.data.polygons: f.material_index = 0


# ---------------------------------------------------------------- build
bkit.reset()
wc, wh = weave()
hp = hp_body(burlap(wc, wh))
S = build_seams(hp)
print('hp verts', len(hp.data.vertices))

body = hp.copy(); body.data = hp.data.copy(); body.name = 'doll'; bpy.context.scene.collection.objects.link(body)
bkit.decimate(body, 3200 if FAST else 4500)
body.data.materials.clear(); body.data.materials.append(principled('lpbody'))
for f in body.data.polygons: f.use_smooth = True

red = np.asarray(Image.open(os.path.join(SRC, 'cloth_red_c.webp')).convert('RGB'), float).reshape(-1, 3).mean(0) / 255
red = tuple(float(((x + 0.055) / 1.055) ** 2.4) * 2.6 for x in red)
MATS = {
    'thread': noisy(principled('thread', rough=0.9), (0.012, 0.01, 0.012), (0.035, 0.028, 0.03), 300),
    'felt': noisy(principled('felt', rough=1, emit=(0.6, 0.02, 0.04), estr=0.6), tuple(x * 1.25 for x in red), tuple(x * 0.6 for x in red), 26, bump=0.004),
    'button': noisy(principled('button', rough=0.2, emit=hexc('#b070ff'), estr=0.012), (0.008, 0.008, 0.012), (0.035, 0.032, 0.05), 14),
    'hexthread': principled('hexthread', hexc('#b070ff'), 0.6, emit=hexc('#c890ff'), estr=1.6),
    'straw': noisy(principled('straw', rough=0.8), (0.75, 0.55, 0.2), (0.42, 0.3, 0.1), 60),
    'wool': noisy(principled('wool', rough=1), (0.82, 0.78, 0.66), (0.5, 0.45, 0.36), 50, bump=0.006),
    'rope': noisy(principled('rope', rough=0.9), (0.5, 0.38, 0.2), (0.3, 0.21, 0.1), 40, wave=42.0),
    'hair': noisy(principled('hair', rough=0.45), (0.5, 0.11, 0.02), (0.16, 0.03, 0.01), 90),
    'redthread': principled('redthread', (0.6, 0.02, 0.03), 0.8, emit=(0.6, 0.02, 0.03), estr=0.3),
    'tooth': noisy(principled('tooth', rough=0.4), (0.86, 0.8, 0.62), (0.5, 0.36, 0.2), 35),
    'steel': noisy(principled('steel', rough=0.35), (0.36, 0.35, 0.36), (0.12, 0.11, 0.11), 80),        # old tarnished pins
    'rust': noisy(principled('rust', rough=0.9), (0.25, 0.1, 0.04), (0.05, 0.04, 0.03), 70),
    'nail': noisy(principled('nail', rough=0.85), (0.4, 0.15, 0.05), (0.09, 0.06, 0.05), 55, bump=0.003),
    'bone': noisy(principled('bone', rough=0.55), (0.8, 0.74, 0.56), (0.42, 0.33, 0.2), 30, bump=0.002),
    'rotbone': noisy(principled('rotbone', rough=0.6), (0.3, 0.28, 0.15), (0.07, 0.07, 0.035), 30),
    'glint': principled('glint', (0.8, 1.0, 0.6), 0.2, emit=(0.6, 1.0, 0.35), estr=1.6),
    'rotbead': noisy(principled('rotbead', rough=0.3, emit=(0.2, 0.5, 0.05), estr=0.12), (0.01, 0.014, 0.008), (0.06, 0.12, 0.03), 60),
    'ooze': noisy(principled('ooze', rough=0.2, emit=(0.1, 0.26, 0.02), estr=0.45), (0.2, 0.34, 0.03), (0.02, 0.05, 0.01), 45, bump=0.003),  # bile: dark, wet, lit from within only faintly
}
for i, h in enumerate(BEADS): MATS['bead%d' % i] = principled('bead%d' % i, hexc(h, 0.6), 0.12, emit=hexc(h), estr=0.25)  # old glass, not candy

T, hairp, charmp = trim(S)
# the button is its own (glossy) mesh: split it from the trim by material
trimo = T.object('trim', MATS); trimo['specs'] = [list(map(str, s[:2])) if s[0] != 'fn' else ['fn', ''] for s in T.specs]
pinobjs, pininfo = needles(S, MATS)
arm = rig(pininfo, hairp, charmp)

def skin_build(o, specs):
    o['specs'] = 0; wids = list(o['wids'])
    for b in arm.data.bones: o.vertex_groups.new(name=b.name)
    for v in o.data.vertices:
        sp = specs[wids[v.index]]
        w = {sp[1]: 1} if sp[0] == 'bone' else auto_w(v.co) if sp[0] == 'auto' else sp[1](v.co)
        for k, x in w.items(): o.vertex_groups[k].add([v.index], x, 'REPLACE')
    del o['wids']; del o['specs']
    o.parent = arm; md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm

skin_build(trimo, T.specs)
for o in pinobjs: skin_build(o, [('bone', 'pin_' + o.name.split('_')[1])])
body['wids'] = [0] * len(body.data.vertices); skin_build(body, [('auto',)])
# split the button (glossy) off the trim
bkit.active(trimo); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
bi = [i for i, m in enumerate(trimo.data.materials) if m.name == 'button'][0]
for f in trimo.data.polygons: f.select = f.material_index == bi
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
button = [o for o in bpy.context.selected_objects if o != trimo][0]; button.name = 'button'

bake_all(body, hp, trimo, pinobjs, button)
bpy.data.objects.remove(hp, do_unlink=True)
bkit.active(body); trimo.select_set(True); bpy.ops.object.join()                # body + trim: one cloth mesh
animate(arm, pininfo)
tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'}
print('tris', sum(tris.values()), tris)
bkit.export_glb('voodoodoll', step=1)
