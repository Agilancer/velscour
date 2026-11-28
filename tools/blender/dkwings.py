"""The Dragon Knight's wings (src/game/sigs/dragonknight.js, src/gfx/dragons3d.js): a pair of dragon wings modelled from
nothing: a two-bone arm, a hooked thumb claw, four two-jointed bony fingers ending in talons, an elbow spur, and a
membrane stretched between them with a scalloped, torn trailing edge. The hide and its glow map are painted here too
(numpy + Pillow) in the wing's rest plane: dark leathery membrane, charcoal bone, a branching net of veins and
smouldering torn edges that the game lights up with her heat (drawBeast's `ember`).

    python tools/blender/dkwings.py
Writes assets/models/beasts/dkwings.glb. Model space: the origin is the point between her shoulder blades, the wings
open to both sides (x), up is the wrist's peak; clips: rest (folded), idle (half open), spread, flap, dash, unfurl."""
import bpy, sys, os, math, random
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector, Matrix, Quaternion
from PIL import Image, ImageDraw, ImageFilter

random.seed(7); np.random.seed(7)
TEX = 1024
V = lambda x, z, y=0.0: Vector((x, y, z))
# the right wing at rest (fully spread) in the x-z plane; y+ is behind her
SH, EL, WR = V(0.05, 0.0), V(0.30, 0.30, 0.03), V(0.50, 0.66)
ANCHOR = V(0.05, -0.40)
FINGERS = [  # mid joint, tip
    (V(0.92, 0.88), V(1.40, 0.72)),
    (V(0.90, 0.52), V(1.26, 0.06)),
    (V(0.74, 0.22), V(0.92, -0.42)),
    (V(0.53, 0.10), V(0.50, -0.60)),
]
THUMB = [WR, V(0.50, 0.84, -0.05), V(0.62, 0.98, -0.12)]
SPUR = [EL, V(0.34, 0.18, 0.06), V(0.40, 0.12, 0.08)]
FOLD = dict(arm1=45, arm2=110, f=[-74, -82, -90, -99])  # world directions (degrees above +x) of the folded wing


def poly(pts, s):
    """Point at s (0..1 by length) along a polyline, and which segment."""
    L = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]; T = sum(L); d = s * T
    for i, l in enumerate(L):
        if d <= l or i == len(L) - 1: return pts[i].lerp(pts[i + 1], d / l), i, d / l
        d -= l


class Mesh:
    def __init__(self): self.v, self.f, self.w = [], [], []
    def vert(self, p, w):
        self.v.append(p.copy()); self.w.append(w); return len(self.v) - 1

    def tube(self, pts, radii, bones, sides=6, cap=True):
        """A tapered tube through pts; bones[i] = weights dict at ring i."""
        rings = []
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            a = d.cross(Vector((0, 1, 0))); a = a.normalized() if a.length > 1e-4 else Vector((1, 0, 0)); b = d.cross(a).normalized()
            rings.append([self.vert(p + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau) * 0.8) * radii[i], bones[i]) for k in range(sides)])
        for i in range(len(rings) - 1):
            for k in range(sides):
                self.f.append((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
        if cap:
            for r, p, bw in ((rings[0], pts[0], bones[0]), (rings[-1], pts[-1], bones[-1])):
                c = self.vert(p, bw)
                for k in range(sides): self.f.append((r[k], r[(k + 1) % sides], c) if r is rings[-1] else (r[(k + 1) % sides], r[k], c))


def finger_w(i, seg, t):
    """Weights along finger i: bone a up to the joint, b after, blended over the knuckle."""
    a, b = f'f{i + 1}a', f'f{i + 1}b'
    if seg == 0: k = max(0.0, (t - 0.8) / 0.4)
    else: k = min(1.0, 0.5 + t / 0.4)
    return {a: 1 - k, b: k}


def arm_w(seg, t):
    """Weights along the wing's inner edge: wrist -> elbow -> shoulder -> the anchor on her back."""
    if seg == 0: k = max(0.0, (t - 0.75) / 0.5); return {'arm2': 1 - k, 'arm1': k}
    if seg == 1: k = max(0.0, (t - 0.7) / 0.6); return {'arm1': 1 - k, 'root': k}
    return {'root': 1.0}


def blendw(a, b, u):
    out = {}
    for k, x in a.items(): out[k] = out.get(k, 0) + x * (1 - u)
    for k, x in b.items(): out[k] = out.get(k, 0) + x * u
    return {k: x for k, x in out.items() if x > 1e-4}


def build_wing():
    M = Mesh()
    lines = [[WR, m, t] for m, t in FINGERS] + [[WR, EL, SH, ANCHOR]]
    wfun = [lambda seg, t, i=i: finger_w(i, seg, t) for i in range(4)] + [arm_w]
    edges = []  # the trailing edge in the rest plane, for the painter
    NU, NS = 9, 10
    for p in range(4):
        A, B = lines[p], lines[p + 1]
        depth = [0.3, 0.34, 0.3, 0.2][p]
        notch = {random.randrange(2, NU - 1): random.uniform(0.1, 0.2), random.randrange(1, NU): random.uniform(0.04, 0.1)}
        grid = []
        for iu in range(NU + 1):
            u = iu / NU
            smax = 0.95 - depth * math.sin(math.pi * u) ** 0.8 - (notch.get(iu, 0) + random.uniform(0, 0.025)) * (0 < iu < NU)
            row = []
            for js in range(NS + 1):
                s = 0.03 + (smax - 0.03) * js / NS
                pa, sa, ta = poly(A, s); pb, sb, tb = poly(B, s if p < 3 else s * 1.0)
                pos = pa.lerp(pb, u)
                pos.y += 0.05 * math.sin(math.pi * u) * (0.3 + s) + 0.012 * math.sin(js * 1.7 + iu)  # the membrane bellies back between the fingers
                row.append(M.vert(pos, blendw(wfun[p](sa, ta), wfun[p + 1](sb, tb), u)))
            grid.append(row)
            edges.append((M.v[row[-1]].x, M.v[row[-1]].z))
        for iu in range(NU):
            for js in range(NS): M.f.append((grid[iu][js], grid[iu + 1][js], grid[iu + 1][js + 1], grid[iu][js + 1]))
    # the propatagium: a small web in the crook of the arm
    grid = []
    for iu in range(5):
        u = iu / 4; smax = 1 - 0.5 * math.sin(math.pi * u) ** 0.7; row = []
        for js in range(5):
            s = smax * js / 4
            row.append(M.vert(EL.lerp(SH, s).lerp(EL.lerp(WR, s), u) + Vector((0, 0.02 * math.sin(math.pi * u), 0)), blendw({'arm1': 1}, {'arm2': 1}, u) if js else {'arm1': 0.5, 'arm2': 0.5}))
        grid.append(row)
    for iu in range(4):
        for js in range(4): M.f.append((grid[iu][js], grid[iu + 1][js], grid[iu + 1][js + 1], grid[iu][js + 1]))
    # bones: the arm, thick at the joints
    M.tube([SH, SH.lerp(EL, 0.5), EL], [0.04, 0.026, 0.034], [{'arm1': 1}, {'arm1': 1}, {'arm1': 0.5, 'arm2': 0.5}])
    M.tube([EL, EL.lerp(WR, 0.5), WR], [0.034, 0.022, 0.032], [{'arm1': 0.5, 'arm2': 0.5}, {'arm2': 1}, {'arm2': 1}])
    for i, (m, t) in enumerate(FINGERS):
        a, b = f'f{i + 1}a', f'f{i + 1}b'
        r = 0.026 - i * 0.002
        tip = t + ((t - m).normalized() + Vector((-0.25, 0, -0.5))).normalized() * 0.11  # the talon runs on past the membrane
        M.tube([WR, WR.lerp(m, 0.5), m, m.lerp(t, 0.5), t, tip], [r * 1.1, r * 0.75, r * 0.95, r * 0.55, r * 0.5, 0.001],
               [{a: 1}, {a: 1}, {a: 0.5, b: 0.5}, {b: 1}, {b: 1}, {b: 1}], sides=5)
    M.tube(THUMB, [0.034, 0.022, 0.001], [{'thumb': 1}] * 3, sides=5)
    M.tube(SPUR, [0.03, 0.016, 0.001], [{'arm1': 1}] * 3, sides=5)
    return M, edges


# ------------------------------------------------------------------ the painting
X0, X1, Z0, Z1 = -0.08, 1.56, -0.78, 1.06
def uvof(p): return ((p.x - X0) / (X1 - X0), (p.z - Z0) / (Z1 - Z0))
def pxof(x, z): return ((x - X0) / (X1 - X0) * TEX, (1 - (z - Z0) / (Z1 - Z0)) * TEX)


def noise(n, oct=5, seed=1):
    r = np.random.RandomState(seed); out = np.zeros((n, n), np.float32); amp = 1; tot = 0
    for o in range(oct):
        g = 6 * 2 ** o
        a = Image.fromarray((r.rand(g, g) * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC)
        out += np.asarray(a, np.float32) / 255 * amp; tot += amp; amp *= 0.55
    return out / tot


def paint(edges):
    S = TEX
    bone = Image.new('L', (S, S), 0); bd = ImageDraw.Draw(bone)
    vein = Image.new('L', (S, S), 0); vd = ImageDraw.Draw(vein)
    edge = Image.new('L', (S, S), 0); ed = ImageDraw.Draw(edge)
    P = lambda v: pxof(v.x, v.z)
    def limb(pts, w):
        for i in range(len(pts) - 1): bd.line([P(pts[i]), P(pts[i + 1])], fill=255, width=w)
        for p in pts[:-1]: x, y = P(p); bd.ellipse([x - w * 0.7, y - w * 0.7, x + w * 0.7, y + w * 0.7], fill=255)
    limb([SH, EL, WR], 36)
    for m, t in FINGERS: limb([WR, m, t, t + ((t - m).normalized() + Vector((-0.25, 0, -0.5))).normalized() * 0.11], 22)
    limb(THUMB, 26); limb(SPUR, 22)
    # veins: branching from every finger into the web on both sides
    def branch(p, ang, ln, w, depth):
        if depth == 0 or ln < 0.02: return
        steps = 5; q = p
        for i in range(steps):
            ang += random.uniform(-0.25, 0.25)
            n = q + Vector((math.cos(ang), 0, math.sin(ang))) * (ln / steps)
            vd.line([P(q), P(n)], fill=255, width=max(1, int(w))); q = n
            if random.random() < 0.45: branch(q, ang + random.choice((-1, 1)) * random.uniform(0.5, 1.0), ln * 0.55, w * 0.6, depth - 1)
        branch(q, ang + random.uniform(-0.5, 0.5), ln * 0.6, w * 0.65, depth - 1)
    lines = [[WR, m, t] for m, t in FINGERS] + [[WR, EL, SH]]
    for li, ln in enumerate(lines):
        for k in range(9):
            s = 0.1 + 0.85 * k / 9 + random.uniform(-0.03, 0.03)
            p, seg, _ = poly(ln, s); d = (ln[seg + 1] - ln[seg]).normalized(); base = math.atan2(d.z, d.x)
            for side in (-1, 1):
                if li == 0 and side == 1: continue
                branch(p, base + side * random.uniform(0.7, 1.2), random.uniform(0.1, 0.2), 3.4, 3)
    for i in range(len(edges) - 1):
        a, b = pxof(*edges[i]), pxof(*edges[i + 1])
        if math.hypot(a[0] - b[0], a[1] - b[1]) < 120: ed.line([a, b], fill=255, width=5)
    f = lambda im, r: np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255
    boneS, boneN, boneF = f(bone, 2.5), f(bone, 9), np.clip(f(bone, 60) * 2.2, 0, 1)
    veinS, veinF = np.clip(f(vein, 1.2) * 1.5, 0, 1), np.clip(f(vein, 7) * 2.5, 0, 1)
    edgeS, edgeF = np.clip(f(edge, 2.5) * 1.6, 0, 1), np.clip(f(edge, 16) * 2.2, 0, 1)
    n1, n2, n3 = noise(S, 6, 1), noise(S, 7, 2), noise(S, 4, 3)
    fine = np.asarray(Image.fromarray((np.random.rand(S // 2, S // 2) * 255).astype(np.uint8)).resize((S, S), Image.BILINEAR), np.float32) / 255
    c = lambda s: np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    mix = lambda a, b, k: a * (1 - k[..., None]) + b * k[..., None]
    # membrane: oxblood leather, thinner (redder, lighter) mid-panel, dark and thick by the bones and toward the torn edge
    t = np.clip(0.5 + (n1 - 0.5) * 1.1 + (fine - 0.5) * 0.22 + (n2 - 0.5) * 0.4, 0, 1)
    col = mix(c('#3a0a0e'), c('#b0241c'), t)
    col = mix(col, c('#e05a2a'), np.clip((n3 - 0.45) * 1.6, 0, 1) * (1 - boneF) * 0.5)
    col = mix(col, c('#16070a'), boneF * 0.6)
    col = mix(col, c('#f08a60'), veinS * 0.5)
    col = mix(col, c('#0c0405'), edgeF * 0.75)
    # bone: charcoal horn with a pale ridge and scale mottling
    bcol = mix(c('#2a1c1a'), c('#8a7260'), np.clip(boneN * 1.25 - 0.55 + (n2 - 0.5) * 0.7, 0, 1))
    bcol = mix(bcol, c('#d8c8a8'), np.clip(boneN * 2.4 - 1.5, 0, 1) * 0.7)
    col = mix(col, bcol, np.clip(boneS * 1.6, 0, 1))
    # glow: the veins, the thin of the web, the smouldering tears; the bones stay dark against it
    web = (1 - np.clip(boneF * 1.3, 0, 1))
    g = veinS * 0.72 + veinF * 0.22 + web * (0.1 + 0.26 * np.clip((n3 - 0.35) * 2, 0, 1)) + edgeS * 0.7 + edgeF * 0.25 * n1
    g = np.clip(g * (1 - np.clip(boneS * 1.5, 0, 1) * 0.92), 0, 1.3)
    deep, mid, hot = c('#d81c04'), c('#ff5a0c'), c('#ffd070')
    k = np.clip(g, 0, 1)
    kk = k[..., None]
    em = (deep + (mid - deep) * np.clip((kk - 0.45) / 0.4, 0, 1) + (hot - mid) * np.clip((kk - 0.88) / 0.12, 0, 1)) * np.clip(kk * 1.25, 0, 1) ** 1.3 * 0.85
    return np.clip(col, 0, 1), np.clip(em, 0, 1)


def image(name, rgb):
    img = bpy.data.images.new(name, TEX, TEX, alpha=False)
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)  # Blender holds pixels linear
    a = np.concatenate([lin[::-1], np.ones((TEX, TEX, 1), np.float32)], -1).astype(np.float32)
    img.pixels.foreach_set(a.ravel()); img.pack(); return img


# ------------------------------------------------------------------ build
bkit.reset()
bpy.context.scene.render.fps = 30
M, edges = build_wing()
verts, faces, weights, uvs = [], [], [], []
for side, tag in ((1, 'R'), (-1, 'L')):
    o = len(verts)
    verts += [(v.x * side, v.y, v.z) for v in M.v]
    uvs += [uvof(v) for v in M.v]
    weights += [{(k if k == 'root' else k + '_' + tag): x for k, x in w.items()} for w in M.w]
    faces += [tuple(o + i for i in (f if side == 1 else f[::-1])) for f in M.f]
me = bpy.data.meshes.new('dkwings'); me.from_pydata(verts, [], faces); me.update()
uvl = me.uv_layers.new(name='UVMap')
for l in me.loops: uvl.data[l.index].uv = uvs[l.vertex_index]
for p in me.polygons: p.use_smooth = True
ob = bpy.data.objects.new('dkwings', me); bpy.context.collection.objects.link(ob)

arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('dkwings_rig', arm); bpy.context.collection.objects.link(rig)
bkit.active(rig); bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name); b.head, b.tail = head, tail; b.roll = 0
    if parent: b.parent = arm.edit_bones[parent]
bone('root', Vector((0, 0, 0)), Vector((0, 0.1, 0)))
for side, tag in ((1, 'R'), (-1, 'L')):
    mx = lambda v: Vector((v.x * side, v.y, v.z))
    bone('arm1_' + tag, mx(SH), mx(EL), 'root'); bone('arm2_' + tag, mx(EL), mx(WR), 'arm1_' + tag)
    bone('thumb_' + tag, mx(THUMB[0]), mx(THUMB[2]), 'arm2_' + tag)
    for i, (m, t) in enumerate(FINGERS):
        bone(f'f{i + 1}a_{tag}', mx(WR), mx(m), 'arm2_' + tag); bone(f'f{i + 1}b_{tag}', mx(m), mx(t), f'f{i + 1}a_{tag}')
bpy.ops.object.mode_set(mode='OBJECT')
for b in arm.bones: ob.vertex_groups.new(name=b.name)
for i, w in enumerate(weights):
    tot = sum(w.values())
    for k, x in w.items(): ob.vertex_groups[k].add([i], x / tot, 'REPLACE')
ob.parent = rig; md = ob.modifiers.new('arm', 'ARMATURE'); md.object = rig

col, em = paint(edges)
mat = bpy.data.materials.new('dkwings'); mat.use_nodes = True; mat.use_backface_culling = False
nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = image('dkwings_c', col)
te = nt.nodes.new('ShaderNodeTexImage'); te.image = image('dkwings_e', em)
nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color']); nt.links.new(te.outputs['Color'], bsdf.inputs['Emission Color'])
bsdf.inputs['Emission Strength'].default_value = 1; bsdf.inputs['Roughness'].default_value = 0.62; bsdf.inputs['Metallic'].default_value = 0
me.materials.append(mat)

# ------------------------------------------------------------------ the clips
deg = math.radians
ang = lambda a, b: math.degrees(math.atan2((b - a).z, (b - a).x))
REST = dict(arm1=ang(SH, EL), arm2=ang(EL, WR), f=[ang(WR, t) for m, t in FINGERS])


def pose(P):
    """P: fold 0..1, raise (deg, the arm lifts), sweep (deg, back), fan (deg, the fingers close), curl (deg, finger ends trail), per side by s."""
    out = {}
    for side, tag in ((1, 'R'), (-1, 'L')):
        f = P.get('fold', 0); ph = P.get('asym', 0) * side
        a1 = (FOLD['arm1'] - REST['arm1']) * f + P.get('raise', 0) + ph
        a2w = (FOLD['arm2'] - REST['arm2']) * f + P.get('raise', 0) + P.get('fore', 0) + ph
        rot = {'arm1_' + tag: (a1, P.get('sweep', 0) + 14 * f), 'arm2_' + tag: (a2w - a1, P.get('sweep2', 0)), 'thumb_' + tag: (P.get('thumb', 0), 0)}
        for i in range(4):
            fl = ((FOLD['f'][i] - REST['f'][i]) - (FOLD['arm2'] - REST['arm2'])) * f - P.get('fan', 0) * (1 - f) * (1 - i / 3) + P.get('fan', 0) * (1 - f) * (i / 3) * 0.6 + P.get('hand', 0)
            rot[f'f{i + 1}a_{tag}'] = (fl, P.get('fsweep', 0) * (0.6 + 0.15 * i))
            rot[f'f{i + 1}b_{tag}'] = (-P.get('curl', 0) * (1 - f * 0.6) * (1.2 - 0.15 * i) + f * (6 - 4 * i), P.get('fsweep', 0) * 0.8)
        for name, (ccw, sw) in rot.items():
            R0 = arm.bones[name].matrix_local.to_3x3()
            D = Matrix.Rotation(deg(sw) * side, 3, 'Z') @ Matrix.Rotation(-deg(ccw) * side, 3, 'Y')
            out[name] = (R0.inverted() @ D @ R0).to_quaternion()
    return out


def clip(name, dur, fn):
    act = bpy.data.actions.new(name); rig.animation_data_create(); rig.animation_data.action = act
    n = round(dur * 30)
    for fr in range(n + 1):
        q = pose(fn(fr / n))
        for b, v in q.items():
            pb = rig.pose.bones[b]; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = v
            pb.keyframe_insert('rotation_quaternion', frame=fr)
    act.use_fake_user = True
    return act


S = lambda t, ph=0: math.sin(math.tau * (t + ph))
ease = lambda t: t * t * (3 - 2 * t)
acts = [
    clip('rest', 3.2, lambda t: dict(fold=1 - 0.035 * (1 + S(t)), sweep=2 * S(t, 0.2), curl=2 * S(t, 0.1), asym=0.8 * S(t * 2))),
    clip('idle', 3.2, lambda t: dict(fold=0.5 + 0.05 * S(t), sweep=8 + 3 * S(t, 0.15), curl=6 + 4 * S(t, 0.3), fan=4 * S(t, 0.2), asym=1.2 * S(t, 0.4), **{'raise': 3 * S(t, 0.1)})),
    clip('spread', 2.0, lambda t: dict(fold=0, sweep=-10 + 2 * S(t), curl=-6 + 3 * S(t * 3), fan=-7 + 2 * S(t * 2, 0.3), fore=6, hand=5 + 2 * S(t * 3, 0.2), asym=0.8 * S(t * 4), **{'raise': 9 + 2 * S(t, 0.1)})),
    clip('flap', 1.6, lambda t: dict(fold=0.1 + 0.12 * (0.5 + 0.5 * S(t, 0.25)), sweep=-4 - 16 * S(t, 0.12), fore=-12 * S(t, -0.12), hand=-14 * S(t, -0.2), curl=20 * S(t, -0.3), fan=5 * S(t, -0.1),
                                    fsweep=-10 * S(t, -0.05), **{'raise': 24 * S(t)})),
    clip('dash', 0.5, lambda t: dict(fold=0.05 + 0.3 * (0.5 - 0.5 * S(t, 0.25)), sweep=-4 - 30 * S(t, 0.14), fore=-20 * S(t, -0.12), hand=-22 * S(t, -0.22), curl=34 * S(t, -0.3), fan=8 * S(t, -0.1),
                                    fsweep=-18 * S(t, -0.05), **{'raise': 34 * S(t)})),
    clip('unfurl', 0.9, lambda t: (lambda k, o: dict(fold=1 - k, sweep=-10 * k - 14 * o, curl=-6 * k + 26 * o, fan=-7 * k - 6 * o, fore=6 * k, hand=5 * k + 10 * o, **{'raise': 9 * k + 14 * o}))(ease(min(1, t / 0.7)), math.sin(math.pi * min(1, t / 0.85)) ** 2 * (1 - t) * 1.6)),
]
rig.animation_data.action = None
for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
print('tris', sum(len(p.vertices) - 2 for p in me.polygons), 'verts', len(me.vertices))
bkit.export_glb('dkwings', step=1)
