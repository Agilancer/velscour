"""The Necromancer's skull-lantern (src/gfx/skulllantern3d.js, src/game/sigs/necromancer.js): a human skull caged in a
wrought-iron gothic lantern, built from nothing in Blender. The skull (cranium, slanted brow ridges, deep sockets, nasal
cavity, cheekbones and arches, a palate) and its hinged jaw are voxel unions of blobs with the hollows cut out; teeth are
single pieces (some missing); a bony hand holds the grip ring the chain hangs from. The lantern: a faceted ogee roof with
a crown of six horns and six spikes, six square posts, riveted bands, a door with a pointed arch and a brass padlock,
soul-glass panes behind, a spiked foot, old wax on the eaves and on the skull's crown, soul-fire that rises from the
plate (bone `fire`, scaled by the game with the soul count). Colour (with AO and grime), normals and glow are baked in
Cycles onto one atlas. Bones: root (the hand), ring, link1..3, body, door, lock, skull, jaw, mouth, fire.
Clips: idle, empty, catch, full, burst.

    python tools/blender/skulllantern.py [--fast]          (needs bpy, numpy, pillow)
Writes assets/models/beasts/skulllantern.glb."""
import bpy, bmesh, sys, os, math, random, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector, Matrix, Euler, noise

FAST = '--fast' in sys.argv
TMP = tempfile.mkdtemp(prefix='skulllantern_')
TAU = math.tau
V = Vector
random.seed(13)
rnd = random.uniform

# ---- measures (Blender: z up, it faces -y). The origin is where the hand holds the grip ring; all hangs below.
SS = 0.42; SC = V((0, -0.012, -0.935))                 # the skull: its own unit (1 = its width) and its cranium's centre
def sk(p): return SC + V(p) * SS
R = 0.34; ZT = -0.62; ZB = -1.41                        # cage: post circle, top and bottom of the posts
POST = [math.radians(a) for a in (-120, -60, 0, 60, 120, 180)]   # the door hangs between the first two
def hexp(i, r=R, z=0.0): a = POST[i % 6]; return V((r * math.cos(a), r * math.sin(a), z))
JAW_H = sk((0, 0.04, -0.36))                            # the jaw's hinge
EYES = [sk((s * 0.215, -0.40, -0.13)) for s in (1, -1)]
NOSE = sk((0, -0.44, -0.34)); MOUTH = sk((0, -0.36, -0.76))


# ---------------------------------------------------------------- a mesh builder that remembers materials and bones
class Build:
    def __init__(self):
        self.bm = bmesh.new(); self.wl = self.bm.verts.layers.int.new('wid'); self.bones = []; self.mats = []; self.w = 0; self.m = 0
    def use(self, mat, bone):
        if mat not in self.mats: self.mats.append(mat)
        if bone not in self.bones: self.bones.append(bone)
        self.m = self.mats.index(mat); self.w = self.bones.index(bone)
    def vert(self, co):
        v = self.bm.verts.new(co); v[self.wl] = self.w; return v
    def face(self, vs, smooth=True):
        try: f = self.bm.faces.new(vs); f.material_index = self.m; f.smooth = smooth; return f
        except ValueError: return None
    def tube(self, pts, rad, sides=4, cap=True, closed=False, smooth=True, up=None):
        pts = [V(p) for p in pts]; n = len(pts)
        rad = list(rad) if hasattr(rad, '__len__') else [rad] * n
        t0 = (pts[1] - pts[0]).normalized(); u = V(up) if up else t0.cross(V((0, 0, 1)) if abs(t0.z) < 0.9 else V((1, 0, 0)))
        u = (u - t0 * u.dot(t0)).normalized(); rings = []
        for i, p in enumerate(pts):
            t = ((pts[(i + 1) % n] - pts[i - 1]) if closed else (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)])).normalized()
            u = (u - t * u.dot(t)).normalized(); w = t.cross(u)
            rings.append([self.vert(p + (u * math.cos(TAU * (j + 0.5) / sides) + w * math.sin(TAU * (j + 0.5) / sides)) * rad[i]) for j in range(sides)])
        for a, b in zip(rings, rings[1:] + (rings[:1] if closed else [])):
            for j in range(sides): self.face([a[j], a[(j + 1) % sides], b[(j + 1) % sides], b[j]], smooth)
        if cap and not closed: self.face(rings[0][::-1], smooth); self.face(rings[-1], smooth)
        return rings
    def ball(self, c, r, sub=2, squash=(1, 1, 1), rot=None):
        M = Matrix.Translation(c) @ (rot or Matrix()) @ Matrix.Diagonal((r * squash[0], r * squash[1], r * squash[2], 1))
        vs = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1, matrix=M)['verts']
        for v in vs: v[self.wl] = self.w
        for f in {f for v in vs for f in v.link_faces}: f.material_index = self.m; f.smooth = True
        return vs
    def loft(self, rings, smooth=False, cap0=False, cap1=False):
        """Rings of points (same count) joined into a skin."""
        R_ = [[self.vert(p) for p in r] for r in rings]; n = len(R_[0])
        for a, b in zip(R_, R_[1:]):
            for j in range(n): self.face([a[j], a[(j + 1) % n], b[(j + 1) % n], b[j]], smooth)
        if cap0: self.face(R_[0][::-1], smooth)
        if cap1: self.face(R_[-1], smooth)
    def chain(self, a, b, r0, r1=None, sub=2, sq=(1, 1, 1), rot=None):
        a, b = V(a), V(b); r1 = r0 if r1 is None else r1; n = max(1, int((b - a).length / (min(r0, r1) * 0.6)))
        for i in range(n + 1): self.ball(a.lerp(b, i / n), r0 + (r1 - r0) * i / n, sub, sq, rot)
    def object(self, name, mats):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name); self.bm.to_mesh(me)
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        for m in self.mats: me.materials.append(mats[m])
        for b in self.bones: o.vertex_groups.new(name=b)
        for v in self.bm.verts: o.vertex_groups[self.bones[v[self.wl]]].add([v.index], 1, 'REPLACE')
        return o


def voxel(o, size, smooth=4, fac=0.5):
    bkit.active(o)
    md = o.modifiers.new('r', 'REMESH'); md.mode = 'VOXEL'; md.voxel_size = size; md.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier='r')
    if smooth: md = o.modifiers.new('s', 'SMOOTH'); md.factor = fac; md.iterations = smooth; bpy.ops.object.modifier_apply(modifier='s')


def carve(o, cutter):
    bkit.active(o)
    md = o.modifiers.new('b', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter; md.solver = 'EXACT'
    bpy.ops.object.modifier_apply(modifier='b'); bpy.data.objects.remove(cutter, do_unlink=True)


def lowpoly(hp, name, tris, bone):
    o = hp.copy(); o.data = hp.data.copy(); o.name = name; bpy.context.scene.collection.objects.link(o)
    bkit.decimate(o, tris)
    o.data.materials.clear(); o.data.materials.append(MATS['lp'])
    for f in o.data.polygons: f.use_smooth = True
    o.vertex_groups.clear(); o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))), 1, 'REPLACE')
    return o


# ---------------------------------------------------------------- materials (what the bake reads)
def principled(name, col=(0.5, 0.5, 0.5), rough=0.8, emit=None, estr=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = estr
    t = nt.nodes.new('ShaderNodeTexImage'); t.name = 'BAKE'; t.location = (-400, -400); nt.nodes.active = t
    return m


def noisy(m, a, b, scale=30.0, bump=0.0, detail=4.0, lo=0.35, hi=0.65):
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = detail
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = (*a, 1); mx.inputs['B'].default_value = (*b, 1)
    cr = nt.nodes.new('ShaderNodeMapRange'); cr.inputs['From Min'].default_value = lo; cr.inputs['From Max'].default_value = hi
    nt.links.new(nz.outputs['Fac'], cr.inputs['Value']); nt.links.new(cr.outputs['Result'], mx.inputs['Factor']); nt.links.new(mx.outputs['Result'], p.inputs['Base Color'])
    if bump:
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 1; bp.inputs['Distance'].default_value = bump
        nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], p.inputs['Normal'])
    return m


def bone_mat(name, glows):
    """Aged bone: mottled ivory, brown stains, a web of dark cracks, pitted; soul-light falling off from the glow centres."""
    m = principled(name, rough=0.7); nt = m.node_tree; p = nt.nodes['Principled BSDF']; L = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord')
    def nz(scale, detail=5.0):
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; L(tc.outputs['Object'], n.inputs['Vector']); return n
    def mix(a, b, f, kind='MIX'):
        x = nt.nodes.new('ShaderNodeMix'); x.data_type = 'RGBA'; x.blend_type = kind
        for s, v in (('A', a), ('B', b), ('Factor', f)):
            if hasattr(v, 'is_linked') or hasattr(v, 'links'): L(v, x.inputs[s])
            elif s == 'Factor': x.inputs[s].default_value = v
            else: x.inputs[s].default_value = (*v, 1)
        return x.outputs['Result']
    def rng(v, a, b):
        r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b; L(v, r.inputs['Value']); return r.outputs['Result']
    n1, n2, n3 = nz(16), nz(4.5, 3), nz(90, 2)
    col = mix((0.86, 0.78, 0.6), (0.6, 0.47, 0.3), rng(n1.outputs['Fac'], 0.3, 0.7))
    col = mix(col, (0.3, 0.19, 0.09), rng(n2.outputs['Fac'], 0.52, 0.8))                  # old stains
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 13
    wr = nt.nodes.new('ShaderNodeVectorMath'); wr.operation = 'ADD'; L(tc.outputs['Object'], wr.inputs[0])       # crooked cracks
    wn = nz(22, 2); ws = nt.nodes.new('ShaderNodeVectorMath'); ws.operation = 'SCALE'; ws.inputs['Scale'].default_value = 0.05; L(wn.outputs['Color'], ws.inputs[0]); L(ws.outputs['Vector'], wr.inputs[1])
    L(wr.outputs['Vector'], vo.inputs['Vector'])
    crack = nt.nodes.new('ShaderNodeMath'); crack.operation = 'MULTIPLY'
    L(rng(vo.outputs['Distance'], 0.022, 0.004), crack.inputs[0]); L(rng(nz(3.3, 2).outputs['Fac'], 0.47, 0.6), crack.inputs[1])
    col = mix(col, (0.07, 0.045, 0.025), crack.outputs['Value'])
    L(col, p.inputs['Base Color'])
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'; L(crack.outputs['Value'], h.inputs[0]); h.inputs[1].default_value = -2.2; L(n3.outputs['Fac'], h.inputs[2])
    h2 = nt.nodes.new('ShaderNodeMath'); h2.operation = 'ADD'; L(h.outputs['Value'], h2.inputs[0]); L(n1.outputs['Fac'], h2.inputs[1])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Distance'].default_value = 0.006; L(h2.outputs['Value'], bp.inputs['Height']); L(bp.outputs['Normal'], p.inputs['Normal'])
    geo = nt.nodes.new('ShaderNodeNewGeometry'); acc = None
    for c, r in glows:
        d = nt.nodes.new('ShaderNodeVectorMath'); d.operation = 'DISTANCE'; L(geo.outputs['Position'], d.inputs[0]); d.inputs[1].default_value = c
        f = nt.nodes.new('ShaderNodeMath'); f.operation = 'MULTIPLY_ADD'; f.use_clamp = True; L(d.outputs['Value'], f.inputs[0]); f.inputs[1].default_value = -1 / r; f.inputs[2].default_value = 1
        g = nt.nodes.new('ShaderNodeMath'); g.operation = 'POWER'; L(f.outputs['Value'], g.inputs[0]); g.inputs[1].default_value = 2.2
        if acc is None: acc = g.outputs['Value']
        else: mxn = nt.nodes.new('ShaderNodeMath'); mxn.operation = 'MAXIMUM'; L(acc, mxn.inputs[0]); L(g.outputs['Value'], mxn.inputs[1]); acc = mxn.outputs['Value']
    if acc is not None:
        p.inputs['Emission Color'].default_value = (0.06, 0.7, 0.2, 1); L(acc, p.inputs['Emission Strength'])
    return m


def height_glow(m, z0, z1, a, b, c):
    """Emission by height: a at z0, b midway, c at z1 (flames)."""
    nt = m.node_tree; p = nt.nodes['Principled BSDF']; L = nt.links.new
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(geo.outputs['Position'], sp.inputs[0])
    r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = z0; r.inputs['From Max'].default_value = z1; L(sp.outputs['Z'], r.inputs['Value'])
    cr = nt.nodes.new('ShaderNodeValToRGB'); e = cr.color_ramp.elements; e[0].color = (*a, 1); e[1].color = (*c, 1); e[1].position = 1; k = e.new(0.38); k.color = (*b, 1)
    L(r.outputs['Result'], cr.inputs['Fac']); L(cr.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 1
    return m


def materials():
    M = {'lp': principled('lp')}
    M['bone'] = bone_mat('bone', [(EYES[0], 0.085), (EYES[1], 0.085), (NOSE, 0.06), (MOUTH, 0.1)])
    M['handbone'] = bone_mat('handbone', [])
    M['tooth'] = noisy(principled('tooth', rough=0.4), (0.9, 0.84, 0.62), (0.55, 0.4, 0.2), 45)
    M['iron'] = noisy(principled('iron', rough=0.55), (0.022, 0.022, 0.028), (0.2, 0.085, 0.03), 11, bump=0.008, detail=7, lo=0.5, hi=0.72)
    M['chain'] = noisy(principled('chainiron', rough=0.5), (0.04, 0.04, 0.05), (0.25, 0.11, 0.04), 30, bump=0.004, detail=5, lo=0.48, hi=0.7)
    M['brass'] = noisy(principled('brass', rough=0.35), (0.75, 0.5, 0.14), (0.16, 0.22, 0.12), 26, bump=0.003)
    M['wax'] = noisy(principled('wax', rough=0.4), (0.92, 0.88, 0.72), (0.7, 0.6, 0.38), 14)
    M['soul'] = principled('soul', (0.02, 0.05, 0.03), 0.3, emit=(0.75, 1.0, 0.8), estr=1.0)
    g = noisy(principled('glass', rough=0.15), (0.004, 0.03, 0.014), (0.01, 0.09, 0.04), 9)
    nt = g.node_tree; p = nt.nodes['Principled BSDF']; tc = nt.nodes.new('ShaderNodeTexCoord')                   # souls pressed against the glass
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 7; n.inputs['Detail'].default_value = 3; n.inputs['Distortion'].default_value = 2.5; nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = 0.5; r.inputs['From Max'].default_value = 0.78; nt.links.new(n.outputs['Fac'], r.inputs['Value'])
    p.inputs['Emission Color'].default_value = (0.08, 0.7, 0.22, 1); nt.links.new(r.outputs['Result'], p.inputs['Emission Strength'])
    M['glass'] = g
    M['fire'] = height_glow(principled('fire', (0.0, 0.02, 0.01), 0.9), ZB, ZB + 0.66, (0.8, 1.0, 0.75), (0.05, 0.62, 0.18), (0.0, 0.1, 0.03))
    return M


# ---------------------------------------------------------------- the skull
def ell(B, c, r, rot=None, sub=3): B.ball(sk(c), SS, sub, r, rot and Euler(rot).to_matrix().to_4x4())


def cutter(c, r, rot=None, sub=3):
    B = Build(); B.use('bone', 'skull'); ell(B, c, r, rot, sub); return B.object('cut', MATS)


def arch(n, rx, ry, cy, z, a1=1.42):
    return [V((rx * math.sin(a), cy - ry * math.cos(a), z)) for a in np.linspace(-a1, a1, n)]


def hp_skull():
    B = Build(); B.use('bone', 'skull')
    ell(B, (0, 0.1, 0.12), (0.5, 0.6, 0.5), sub=4)                                # the vault
    ell(B, (0, -0.2, 0.1), (0.45, 0.37, 0.43), sub=4)                             # forehead
    ell(B, (0, 0.12, -0.2), (0.4, 0.42, 0.2))                                     # the base
    for s in (1, -1):
        ell(B, (s * 0.21, -0.545, 0.035), (0.2, 0.085, 0.065), (0, -s * 0.32, s * 0.1))   # brow ridges, slanted down to the nose: a scowl
        ell(B, (s * 0.39, -0.41, -0.27), (0.14, 0.13, 0.1))                     # cheekbones
        ell(B, (s * 0.44, -0.36, -0.08), (0.06, 0.08, 0.17))                      # the orbit's outer rim
        for a, b in zip(*(lambda P: (P, P[1:]))([(s * 0.44, -0.33, -0.27), (s * 0.5, -0.12, -0.25), (s * 0.5, 0.1, -0.22), (s * 0.45, 0.2, -0.2)])):
            B.chain(sk(a), sk(b), 0.05 * SS)                                      # the arch back to the ear
        ell(B, (s * 0.36, 0.26, -0.33), (0.1, 0.12, 0.14))                        # mastoid
    ell(B, (0, -0.58, -0.05), (0.075, 0.08, 0.11))                                # nasal bones
    ell(B, (0, -0.36, -0.4), (0.27, 0.235, 0.24))                                 # the upper jaw
    for p in arch(13, 0.245, 0.225, -0.36, -0.6): B.ball(sk(p), 0.052 * SS, 2)    # the ridge the teeth stand in
    o = B.object('skull_hp', MATS)
    voxel(o, 0.012 if FAST else 0.006, 3)
    for s in (1, -1):
        carve(o, cutter((s * 0.22, -0.56, -0.14), (0.18, 0.27, 0.17), (0, -s * 0.22, 0)))   # the sockets
        carve(o, cutter((s * 0.055, -0.6, -0.38), (0.06, 0.2, 0.12), (0, s * 0.35, 0)))       # the nose, an upturned heart
        carve(o, cutter((s * 0.6, -0.2, -0.05), (0.2, 0.2, 0.26)))                             # the temples
        carve(o, cutter((s * 0.5, -0.2, -0.44), (0.16, 0.3, 0.14)))                            # under the arches
    carve(o, cutter((0, -0.6, -0.27), (0.05, 0.2, 0.1)))
    carve(o, cutter((0, -0.3, -0.78), (0.2, 0.27, 0.2)))                          # the palate's hollow
    carve(o, cutter((0, 0.05, -0.55), (0.3, 0.3, 0.2)))                           # room behind for the jaw
    voxel(o, 0.008 if FAST else 0.0042, 5, 0.6)
    for v in o.data.vertices:                                                     # no skull is even
        c = v.co; v.co = c + v.normal * (noise.noise(c * 9) * 0.006 + noise.noise(c * 24 + V((3, 1, 7))) * 0.002)
    return o


def hp_jaw():
    B = Build(); B.use('bone', 'jaw')
    body = arch(17, 0.25, 0.24, -0.34, -0.9, 1.5)
    for i, p in enumerate(body): B.ball(sk(p + V((0, 0, 0.02 * abs(i - 8) / 8))), SS, 2, (0.055, 0.055, 0.105))
    ell(B, (0, -0.585, -0.97), (0.13, 0.065, 0.085))                              # the chin
    for s in (1, -1):
        a, b, c = V((s * 0.26, -0.3, -0.86)), V((s * 0.4, 0.0, -0.84)), V((s * 0.43, 0.04, -0.4))
        B.chain(sk(a), sk(b), 0.07 * SS, sq=(0.7, 1, 1.5))
        B.chain(sk(b), sk(c), 0.085 * SS, 0.07 * SS, sq=(0.5, 1.5, 1))            # the ramus up to the hinge
        ell(B, c, (0.05, 0.08, 0.06)); ell(B, (s * 0.4, -0.12, -0.5), (0.035, 0.06, 0.12), (0.35, 0, 0))   # condyle, coronoid
        ell(B, (s * 0.4, 0.02, -0.86), (0.05, 0.1, 0.08))                         # the angle
    for p in arch(13, 0.225, 0.205, -0.36, -0.82): B.ball(sk(p), 0.06 * SS, 2)
    o = B.object('jaw_hp', MATS)
    voxel(o, 0.01 if FAST else 0.0042, 4, 0.6)
    return o


def teeth():
    """Single teeth along both arches: long roots showing, a few gone, one snapped."""
    B = Build()
    def row(bone, n, rx, ry, z0, z1, gone, cy=-0.36):
        B.use('tooth', bone)
        for i in range(n):
            if i in gone: continue
            a = -1.3 + 2.6 * i / (n - 1); front = 1 - abs(a) / 1.3
            c = V((rx * math.sin(a), cy - ry * math.cos(a), 0)); out = V((math.sin(a) / rx, -math.cos(a) / ry, 0)).normalized(); side = V((0, 0, 1)).cross(out)
            w = 0.03 + 0.012 * front; d = 0.028 + 0.012 * (1 - front); ln = (z1 - z0) * (0.78 + 0.3 * front + rnd(-0.08, 0.08)) * (0.55 if i == 9 and bone == 'skull' else 1)
            tw = rnd(-0.25, 0.25); side = side * math.cos(tw) + out * math.sin(tw); o2 = V((0, 0, 1)).cross(side) * -1
            rings = []
            for t, k in ((-0.15, 0.8), (0.45, 1.0), (0.85, 0.85), (1.0, 0.45 if front > 0.45 else 0.7)):
                p = c + V((0, 0, z0 + ln * t)) + out * 0.012 * t
                rings.append([sk(p + side * w * k * sx + o2 * d * k * sy) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
            B.loft(rings, True, cap1=True)
    row('skull', 14, 0.245, 0.225, -0.6, -0.775, {3, 11})
    row('jaw', 14, 0.228, 0.208, -0.84, -0.735, {5, 6, 12})
    return B.object('teeth', MATS)


def souls():
    """Soul-fire where the light comes from: an orb deep in each socket, a wedge in the nose, a mass behind the teeth."""
    B = Build(); B.use('soul', 'skull')
    for e in EYES: B.ball(e + V((0, -0.004, 0)), 0.024, 2)
    B.ball(sk((0, -0.3, -0.74)), SS, 2, (0.17, 0.2, 0.1))
    return B.object('souls', MATS)


def hp_waxskull():
    B = Build(); B.use('wax', 'skull')
    top = V((0.06, -0.12, 0.12)); rad = V((0.5, 0.6, 0.5))
    def on(az, el, lift=0.012):                                                   # a point on the vault
        d = V((math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)))
        c = V((0, 0.1, 0.12)) if d.y > -0.3 else V((0, -0.2, 0.1)); r = rad if d.y > -0.3 else V((0.45, 0.37, 0.43))
        return c + V((d.x * r.x, d.y * r.y, d.z * r.z)) * (1 + lift)
    for az, el0, r in ((0.0, 1.45, 0.11), (0.9, 1.3, 0.07), (-0.8, 1.35, 0.06), (2.6, 1.3, 0.07)): B.ball(sk(on(az, el0)), r * SS, 2, (1, 1, 0.45))
    for az, el1, r in ((-0.42, 0.52, 0.03), (0.25, 0.72, 0.026), (0.75, 0.38, 0.03), (-1.2, 0.5, 0.026), (1.6, 0.3, 0.028), (-2.2, 0.4, 0.026)):
        n = 9
        for i in range(n + 1):
            el = 1.4 + (el1 - 1.4) * i / n; B.ball(sk(on(az + 0.06 * math.sin(i * 1.3), el, 0.02)), (r * (0.75 + 0.25 * i / n) + (0.012 if i == n else 0)) * SS, 2)
    o = B.object('waxskull_hp', MATS); voxel(o, 0.006 if FAST else 0.0035, 3)
    return o


# ---------------------------------------------------------------- the hand at the top
def hp_hand():
    B = Build(); B.use('handbone', 'root')
    def seg(a, b, r):                                                             # a little bone: knobs at both ends
        a, b = V(a), V(b); n = max(3, int((b - a).length / (r * 0.8)))
        for i in range(n + 1): t = i / n; B.ball(a.lerp(b, t), r * (1.45 - 1.8 * math.sin(math.pi * t) * 0.3), 2)
    wr = V((0, 0.045, 0.1))
    for i in range(7): B.ball(wr + V((-0.03 + 0.012 * i - 0.002 * (i % 2), 0.006 * (i % 3) - 0.005, 0.008 * (i % 2))), 0.012, 2)   # the wrist's pebbles
    for s, r in ((-0.016, 0.014), (0.017, 0.011)): seg(wr + V((s, 0.01, 0.012)), wr + V((s * 1.3, 0.06, 0.13 + (0.02 if s < 0 else 0))), r)   # the forearm's two bones, snapped
    for i, x in enumerate((-0.042, -0.015, 0.012, 0.037)):
        k = V((x, -0.012, 0.03 - 0.004 * abs(i - 1.5)))
        seg(wr + V((x * 0.55, 0, -0.008)), k, 0.0085)
        p1 = V((x * 1.03, -0.05, -0.012)); p2 = V((x * 1.03, -0.042, -0.058)); p3 = V((x * 1.02, -0.006, -0.068))
        seg(k, p1, 0.008); seg(p1, p2, 0.0072); seg(p2, p3, [0.0064, 0.0064][0])
        B.ball(p3 + V((0, 0.008, 0.002)), 0.0045, 2, (1, 1.8, 1))                 # a nail's point
    t0 = wr + V((0.036, -0.005, -0.012)); t1 = V((0.064, -0.035, 0.035)); t2 = V((0.06, -0.06, -0.008)); t3 = V((0.045, -0.04, -0.045))
    seg(t0, t1, 0.0095); seg(t1, t2, 0.0085); seg(t2, t3, 0.007)
    o = B.object('hand_hp', MATS); voxel(o, 0.004 if FAST else 0.0024, 2, 0.4)
    return o


# ---------------------------------------------------------------- ironwork
def stadium(c, ln, w, twist, n=12):
    """A chain link's centre line: an oval ln long (down z), w wide, turned by twist about z."""
    pts = []
    for i in range(n):
        a = TAU * i / n; x = math.sin(a) * w / 2; z = math.cos(a) * w / 2 + (ln - w) / 2 * (1 if math.cos(a) >= 0 else -1)
        pts.append(V(c) + V((x * math.cos(twist), x * math.sin(twist), z)))
    return pts


def ironwork():
    B = Build()
    # the grip ring in the hand, three links, the lantern's own loop
    B.use('chain', 'ring'); B.tube(stadium((0, -0.012, -0.085), 0.12, 0.115, 0, 14), 0.0115, 5, closed=True)
    for i, z in enumerate((-0.17, -0.25, -0.33)):
        B.use('chain', 'link%d' % (i + 1)); B.tube(stadium((0, -0.006, z), 0.112, 0.062, TAU / 4 if i % 2 == 0 else 0), 0.0105, 4, closed=True)
    B.use('iron', 'body'); B.tube(stadium((0, 0, -0.4), 0.075, 0.07, TAU / 4, 10), 0.0105, 4, closed=True)
    B.ball(V((0, 0, -0.44)), 0.035, 1, (1, 1, 0.8))
    # the roof: a faceted ogee spire over a deep eave
    prof = [(0.022, -0.435), (0.05, -0.47), (0.12, -0.52), (0.25, -0.565), (0.4, -0.6), (0.4, -0.632), (0.345, -0.645), (0.3, -0.63)]
    B.loft([[hexp(i, r, z) for i in range(6)] for r, z in prof], False, cap0=True)
    for i in range(6):
        B.tube([hexp(i, r + 0.006, z + 0.008) for r, z in prof[:5]], [0.008, 0.009, 0.01, 0.011, 0.013], 4, smooth=False)   # hip ribs
        e = hexp(i, 0.4, -0.605); o = hexp(i, 1, 0)                                # the crown: a horn at every corner
        B.tube([e - o * 0.03, e + o * 0.045 + V((0, 0, 0.012)), e + o * 0.075 + V((0, 0, 0.07)), e + o * 0.06 + V((0, 0, 0.14)), e + o * 0.025 + V((0, 0, 0.2))], [0.021, 0.02, 0.016, 0.01, 0.002], 4, smooth=False)
        m = (hexp(i, 0.4, -0.6) + hexp(i + 1, 0.4, -0.6)) / 2; mo = m.copy(); mo.z = 0; mo.normalize()   # and a spike between
        B.tube([m - mo * 0.02 - V((0, 0, 0.01)), m + mo * 0.012 + V((0, 0, 0.05)), m + mo * 0.03 + V((0, 0, 0.12))], [0.014, 0.011, 0.002], 4, smooth=False)
        B.tube([m + V((0, 0, -0.03)), m + mo * 0.01 + V((0, 0, -0.045)), m + V((0, 0, -0.075))], [0.011, 0.009, 0.002], 4, smooth=False)   # a tooth under the eave
    # posts, bands, rivets
    for i in range(6):
        p = hexp(i); B.tube([p + V((0, 0, ZT - 0.02)), p + V((0, 0, ZB + 0.01))], 0.019, 4, smooth=False, up=hexp(i, 1, 0))
        for z in (ZT - 0.05, ZB + 0.05): B.ball(hexp(i, R + 0.004, z), 0.03, 1, (1, 1, 0.75))                 # collars
    def band(i, z, h=0.02, t=0.008, r=R):
        a, b = hexp(i, r, z), hexp(i + 1, r, z); n = ((a + b) / 2); n.z = 0; n.normalize(); u = V((0, 0, h))
        B.loft([[a - u - n * t, a - u + n * t, a + u + n * t, a + u - n * t], [b - u - n * t, b - u + n * t, b + u + n * t, b + u - n * t]], False)
        for k in (0.2, 0.5, 0.8):                                                 # rivets
            c = a.lerp(b, k) + n * t; s = (b - a).normalized() * 0.011
            v = [B.vert(c - s - V((0, 0, 0.011))), B.vert(c + s - V((0, 0, 0.011))), B.vert(c + s + V((0, 0, 0.011))), B.vert(c - s + V((0, 0, 0.011))), B.vert(c + n * 0.012)]
            for j in range(4): B.face([v[j], v[(j + 1) % 4], v[4]], False)
    for i in range(6):
        band(i, ZT - 0.05); band(i, ZB + 0.05, 0.024)
        if i != 0: band(i, -1.2, 0.014, 0.006)
    for i in (1, 5):                                                              # bars on the two faces beside the door
        for k in (0.34, 0.66):
            a = hexp(i).lerp(hexp(i + 1), k); B.tube([a + V((0, 0, ZT - 0.05)), a + V((0, 0, ZB + 0.05))], 0.0085, 4, cap=False, smooth=False)
    for i in (2, 3, 4):                                                           # lead cames across the glass behind
        a, b = hexp(i, R - 0.004), hexp(i + 1, R - 0.004)
        for (k0, z0), (k1, z1) in (((0, ZT - 0.07), (1, ZB + 0.07)), ((1, ZT - 0.07), (0, ZB + 0.07)), ((0.5, ZT - 0.07), (0.5, ZB + 0.07))):
            B.tube([a.lerp(b, k0) + V((0, 0, z0)), a.lerp(b, k1) + V((0, 0, z1))], 0.006, 3, cap=False, smooth=False)
    # the foot: a plate, a turned boss, a spike
    prof = [(0.3, ZB + 0.012), (0.385, ZB + 0.012), (0.4, ZB - 0.008), (0.385, ZB - 0.03), (0.25, ZB - 0.06), (0.1, ZB - 0.1), (0.05, ZB - 0.11)]
    B.loft([[hexp(i, r, z) for i in range(6)] for r, z in prof], False, cap0=True, cap1=True)
    B.ball(V((0, 0, ZB - 0.135)), 0.045, 1, (1, 1, 0.8)); B.tube([V((0, 0, ZB - 0.15)), V((0, 0, ZB - 0.2)), V((0, 0, ZB - 0.29))], [0.022, 0.016, 0.002], 4, smooth=False)
    for i in range(6):                                                            # six claws curl down from the plate's corners
        e = hexp(i, 0.385, ZB - 0.02); o = hexp(i, 1, 0)
        B.tube([e, e + o * 0.02 - V((0, 0, 0.04)), e - o * 0.02 - V((0, 0, 0.085))], [0.014, 0.011, 0.002], 4, smooth=False)
    # the door: stiles, a pointed arch, a low rail of spear points
    B.use('iron', 'door')
    y = hexp(0).y - 0.012; x0, x1 = hexp(0).x + 0.03, hexp(1).x - 0.03; zt, zb = -0.86, ZB + 0.085
    for x in (x0, x1): B.tube([V((x, y, zb)), V((x, y, zt))], 0.0105, 4, smooth=False)
    for s, x in ((1, x0), (-1, x1)):
        B.tube([V((x, y, zt)), V((x + s * 0.008, y, zt + 0.07)), V((x + s * 0.05, y, zt + 0.125)), V((0, y, -0.672))], 0.0095, 4, smooth=False)
    B.tube([V((0, y, -0.672)), V((0, y - 0.004, -0.72)), V((0, y - 0.006, -0.765))], [0.009, 0.007, 0.002], 4, smooth=False)   # a fang from the arch's point
    for z in (zb,): B.tube([V((x0, y, z)), V((x1, y, z))], 0.0095, 4, smooth=False)
    for k in range(1, 6):
        x = x0 + (x1 - x0) * k / 6; B.tube([V((x, y, zb)), V((x, y, zb + 0.04)), V((x, y, zb + 0.075))], [0.007, 0.0075, 0.001], 4, smooth=False)
    for z in (-0.95, -1.2): B.tube([V((x0 - 0.035, y + 0.008, z)), V((x0 + 0.012, y - 0.004, z))], 0.011, 4, smooth=False)   # hinges
    # the padlock on its hasp
    lk = V((x1 + 0.012, y - 0.02, -1.12))
    B.tube([V((x1 - 0.01, y, lk.z + 0.02)), V((x1 + 0.05, y + 0.004, lk.z + 0.02))], 0.011, 4, smooth=False)
    B.use('brass', 'lock')
    B.tube([lk + V((-0.018, 0, -0.03)), lk + V((-0.018, 0, 0.012)), lk + V((0, 0, 0.03)), lk + V((0.018, 0, 0.012)), lk + V((0.018, 0, -0.03))], 0.0065, 4, cap=False)
    c = lk + V((0, 0, -0.062)); w, h, d = 0.034, 0.036, 0.015
    B.loft([[c + V((sx * w * k, sy * d * k, z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))] for z, k in ((h, 0.85), (h * 0.7, 1), (-h * 0.6, 1), (-h, 0.8))], False, cap0=True, cap1=True)
    return B.object('iron', MATS), lk


def glass():
    B = Build(); B.use('glass', 'body')
    for i in (2, 3, 4):
        a, b = hexp(i, R - 0.012), hexp(i + 1, R - 0.012)
        v = [B.vert(a + V((0, 0, ZB + 0.04))), B.vert(b + V((0, 0, ZB + 0.04))), B.vert(b + V((0, 0, ZT - 0.04))), B.vert(a + V((0, 0, ZT - 0.04)))]
        B.face(v, False); B.face(v[::-1], False)
    return B.object('glass', MATS)


def fire():
    """Soul-fire standing on the plate behind and beside the skull; the game scales the `fire` bone with the soul count."""
    B = Build(); B.use('fire', 'fire')
    for a, r, h, w in ((90, 0.22, 0.7, 0.085), (40, 0.24, 0.58, 0.07), (140, 0.24, 0.62, 0.07), (0, 0.25, 0.46, 0.055), (180, 0.25, 0.5, 0.055), (65, 0.14, 0.64, 0.07), (115, 0.15, 0.54, 0.06),
                       (-28, 0.23, 0.25, 0.05), (208, 0.23, 0.27, 0.05), (-60, 0.2, 0.13, 0.04), (240, 0.2, 0.14, 0.04)):
        c = V((r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), ZB + 0.01)); ph = rnd(0, TAU); pts = []; rad = []
        for i in range(7):
            t = i / 6; pts.append(c + V((0.03 * math.sin(ph + t * 5) * t, 0.03 * math.cos(ph + t * 4) * t, h * t))); rad.append(w * (0.55 + 0.9 * t) * (1 - t) ** 0.8 * 1.6 + 0.001)
        B.tube(pts, rad, 5, cap=False)
    B.ball(V((0, 0.03, ZB + 0.02)), 0.24, 2, (1, 1, 0.16))                        # embers pooled on the plate
    return B.object('fire', MATS)


def hp_wax():
    """Old wax run over the eaves, hanging in drips."""
    B = Build(); B.use('wax', 'body')
    for i, k, ln in ((0, 0.22, 0.07), (1, 0.55, 0.12), (4, 0.6, 0.09), (5, 0.7, 0.13)):
        e = hexp(i, 0.4, -0.6).lerp(hexp(i + 1, 0.4, -0.6), k); o = e.copy(); o.z = 0; o.normalize()
        up = e - o * 0.09 + V((0, 0, 0.026))
        B.ball(up, 0.04, 2, (1, 1, 0.3)); B.chain(up, e + o * 0.006 + V((0, 0, 0.002)), 0.011, 0.014)
        B.chain(e + o * 0.008, e + o * 0.01 - V((0, 0, 0.034 + ln)), 0.014, 0.007); B.ball(e + o * 0.01 - V((0, 0, 0.034 + ln)), 0.011, 2, (1, 1, 1.4))
    o = B.object('wax_hp', MATS); voxel(o, 0.006 if FAST else 0.0035, 3)
    return o


# ---------------------------------------------------------------- rig
def rig(lk):
    ad = bpy.data.armatures.new('rig'); arm = bpy.data.objects.new('skulllantern', ad); bpy.context.scene.collection.objects.link(arm)
    bkit.active(arm); bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, head, tail, parent=None):
        b = ad.edit_bones.new(name); b.head = head; b.tail = tail; b.parent = ad.edit_bones[parent] if parent else None
        b.align_roll(V((0, -1, 0)) if abs((V(tail) - V(head)).normalized().y) < 0.9 else V((0, 0, 1))); return b
    D = V((0, 0, -0.07))
    bone('root', V((0, 0.03, 0.16)), V((0, 0.03, 0.06)))
    bone('ring', V((0, -0.012, -0.03)), V((0, -0.012, -0.03)) + D, 'root')
    bone('link1', V((0, 0, -0.13)), V((0, 0, -0.13)) + D, 'ring'); bone('link2', V((0, 0, -0.21)), V((0, 0, -0.21)) + D, 'link1'); bone('link3', V((0, 0, -0.29)), V((0, 0, -0.29)) + D, 'link2')
    bone('body', V((0, 0, -0.37)), V((0, 0, -0.6)), 'link3')
    h = hexp(0) + V((0.02, -0.012, 0)); bone('door', h + V((0, 0, -0.8)), h + V((0, 0, -1.2)), 'body')
    bone('lock', lk + V((0, 0, 0.03)), lk + V((0, 0, -0.08)), 'door')
    bone('skull', sk((0, 0.1, -0.45)), sk((0, 0.1, 0.3)), 'body'); bone('jaw', JAW_H, sk((0, -0.5, -0.95)), 'skull')
    bone('mouth', sk((0, -0.5, -0.74)), sk((0, -0.75, -0.74)), 'skull')
    bone('fire', V((0, 0, ZB + 0.01)), V((0, 0, ZB + 0.3)), 'body')
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


# ---------------------------------------------------------------- animation: poses sampled at 30 fps (r: turns about the model's own x, y, z)
def clips():
    s, c, e = math.sin, math.cos, math.exp
    def sway(t, w, k, tw=1.0):                                                    # a pendulum, the chain bending a little more link by link, the lantern lagging and twisting
        a = k * s(w * t); b = 0.45 * k * s(w * t * 2 + 1)
        p = {'ring': dict(r=(b * 0.5, a * 0.5, 0))}
        for i in (1, 2, 3): p['link%d' % i] = dict(r=(0.2 * k * s(w * t * 2 + 1 - 0.5 * i), 0.22 * k * s(w * t - 0.45 * i), 0))
        p['body'] = dict(r=(0.25 * k * s(w * t * 2 - 1.2), 0.3 * k * s(w * t - 1.9), tw * 0.9 * k * s(w * t * 0.5 + 0.6)))
        p['lock'] = dict(r=(0, 1.2 * k * s(w * t - 2.4), 0))
        return p
    def idle(t):
        w = TAU / 4; p = sway(t, w * 2, 0.11)
        gl = e(-((t - 2.6) / 0.5) ** 2); cl = e(-((t - 2.75) / 0.05) ** 2) + e(-((t - 2.95) / 0.05) ** 2)     # it looks round, and clacks its teeth twice
        p['skull'] = dict(r=(0.05 * s(w * t * 2) - 0.08 * gl, 0.05 * s(w * t + 1), 0.22 * s(w * t) + 0.3 * gl), l=(0, 0, 0.008 * s(w * t * 2 + 1)))
        p['jaw'] = dict(r=(0.05 + 0.04 * s(w * t * 2 + 2) + 0.28 * cl, 0, 0))
        return p
    def empty(t):
        w = TAU / 4; p = sway(t, w, 0.07, 0.5)
        p['skull'] = dict(r=(0.2 + 0.02 * s(w * t), 0.07, 0.05 * s(w * t)), l=(0, 0, -0.008)); p['jaw'] = dict(r=(0.2 + 0.03 * s(w * t + 1), 0, 0))   # slumped, slack-jawed
        return p
    def catch(t):
        k = e(-7 * t); o = k * s(24 * t)
        snap = min(1, t / 0.05) if t < 0.05 else max(0, 1 - (t - 0.05) / 0.11)       # the jaw gapes for the soul and claps shut on it
        p = {'ring': dict(r=(0.1 * o, 0.05 * o, 0)), 'link1': dict(r=(0.1 * o, 0, 0)), 'link2': dict(r=(-0.12 * o, 0, 0)), 'link3': dict(r=(0.14 * o, 0, 0)),
             'body': dict(r=(0.16 * o, 0.1 * k * s(19 * t), 0.12 * o), s=(1 + 0.06 * k * c(24 * t),) * 3), 'lock': dict(r=(0, 0.5 * o, 0)), 'door': dict(r=(0, 0, -0.07 * abs(o))),
             'skull': dict(r=(-0.3 * k * (1 - e(-40 * t)) + 0.1 * o, 0, 0.1 * o), l=(0, 0, 0.02 * k)), 'jaw': dict(r=(0.05 + 0.75 * snap, 0, 0))}
        return p
    def full(t):                                                                  # 1 s loop: it can barely hold them
        f = TAU * t
        p = {'ring': dict(r=(0.05 * s(f * 7), 0.07 * s(f * 5 + 1), 0)), 'link1': dict(r=(0.07 * s(f * 9 + 2), 0.06 * s(f * 6), 0)), 'link2': dict(r=(0.08 * s(f * 8 + 4), 0.06 * s(f * 7 + 1), 0)),
             'link3': dict(r=(0.08 * s(f * 10 + 1), 0.07 * s(f * 6 + 3), 0)),
             'body': dict(r=(0.07 * s(f * 11), 0.08 * s(f * 9 + 2), 0.1 * s(f * 6)), s=(1 + 0.035 * s(f * 4),) * 3), 'door': dict(r=(0, 0, -0.07 - 0.07 * s(f * 12))),
             'lock': dict(r=(0.3 * s(f * 8), 0.5 * s(f * 7), 0)),
             'skull': dict(r=(-0.08 + 0.08 * s(f * 10), 0.1 * s(f * 7), 0.16 * s(f * 5)), l=(0.006 * s(f * 13), 0, 0.012 * s(f * 9))),
             'jaw': dict(r=(0.1 + 0.34 * abs(s(f * 7)), 0, 0))}
        return p
    def burst(t):                                                                 # 1.3 s: clenched, then door and jaw fly wide and the dead pour out; it hangs emptied
        a = min(1, t / 0.12); g = 0 if t < 0.12 else min(1, (t - 0.12) / 0.07); u = max(0, t - 0.19)
        out = g * (1 if t < 0.85 else max(0, 1 - (t - 0.85) / 0.3)); sh = out * e(-1.5 * u)
        door = 0 if t < 0.12 else (2.2 * g + 0.5 * e(-6 * u) * s(20 * u) * g) if t < 0.9 else 2.2 * max(0, 1 - ((t - 0.9) / 0.25)) ** 2 if t < 1.15 else 0.12 * e(-14 * (t - 1.15)) * abs(s(30 * (t - 1.15)))
        rec = g * e(-3.2 * u) * c(9 * u)
        end = min(1, max(0, (t - 0.95) / 0.35))
        p = {'ring': dict(r=(0.2 * rec, 0.05 * sh * s(60 * t), 0)), 'link1': dict(r=(0.14 * rec, 0, 0)), 'link2': dict(r=(0.12 * rec, 0, 0)), 'link3': dict(r=(0.1 * rec, 0, 0)),
             'body': dict(r=(0.12 * rec + 0.04 * sh * s(70 * t), 0.06 * sh * s(57 * t), 0.08 * sh * s(43 * t)), s=(1 - 0.07 * a * (1 - g) + 0.1 * g * e(-9 * u),) * 3),
             'door': dict(r=(0, 0, -door)), 'lock': dict(r=(0.6 * sh * s(31 * t), 1.0 * sh * s(27 * t), 0)),
             'skull': dict(r=(0.12 * a * (1 - g) - 0.42 * out + 0.06 * sh * s(64 * t) + 0.2 * end, 0.07 * end + 0.05 * sh * s(51 * t), 0.1 * sh * s(38 * t)), l=(0, -0.03 * out, 0.02 * out - 0.008 * end)),
             'jaw': dict(r=(1.0 * out + 0.08 * sh * s(75 * t) + 0.2 * end, 0, 0))}
        return p
    return {'idle': (4.0, idle, True), 'empty': (4.0, empty, True), 'catch': (0.5, catch, False), 'full': (1.0, full, True), 'burst': (1.3, burst, False)}


def animate(arm):
    sc = bpy.context.scene; sc.render.fps = 30
    bkit.active(arm); arm.animation_data_create()
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    rest = {b.name: b.matrix_local.to_3x3() for b in arm.data.bones}
    acts = []
    for name, (dur, fn, loop) in clips().items():
        act = bpy.data.actions.new(name); arm.animation_data.action = act; last = {}
        frames = round(dur * 30); used = set(arm.pose.bones.keys()) - {'root', 'mouth', 'fire'}
        for f in range(frames + 1):
            pose = fn(0 if (f == frames and loop) else f / 30)
            for bn in used:
                pb = arm.pose.bones[bn]; d = pose.get(bn, {}); M = rest[bn]
                q = (M.inverted() @ Euler(d.get('r', (0, 0, 0)), 'XYZ').to_matrix() @ M).to_quaternion()
                if bn in last and last[bn].dot(q) < 0: q.negate()
                last[bn] = q.copy(); pb.rotation_quaternion = q
                pb.location = M.inverted() @ V(d.get('l', (0, 0, 0))); pb.scale = d.get('s', (1, 1, 1))
                for path in ('rotation_quaternion', 'location', 'scale'): pb.keyframe_insert(path, frame=f)
        acts.append(act)
        for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    arm.animation_data.action = None
    for a in acts:
        tr = arm.animation_data.nla_tracks.new(); tr.name = a.name; st = tr.strips.new(a.name, 0, a); st.name = a.name


# ---------------------------------------------------------------- bake
def bake_all(pairs, direct, aosets):
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 6 if FAST else 16
    SZ = 512 if FAST else 1024
    lp = [a for a, _ in pairs] + direct; hps = [b for _, b in pairs]
    bpy.ops.object.select_all(action='DESELECT')
    for o in lp: o.select_set(True)
    bpy.context.view_layer.objects.active = lp[0]
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003, area_weight=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    def image(name, data=False):
        im = bpy.data.images.new(name, SZ, SZ, alpha=False, is_data=data)
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
        bpy.ops.object.bake(type=typ, use_selected_to_active=bool(src), cage_extrusion=0.012, max_ray_distance=0.03, margin=5, use_clear=False, **kw)
    def px(im):
        a = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(a); return a.reshape(im.size[1], im.size[0], 4)[::-1, :, :3]
    col, nrm, ao, em = image('col'), image('nrm', True), image('ao', True), image('em')
    nrm.generated_color = (0.5, 0.5, 1, 1); ao.generated_color = (1, 1, 1, 1)
    for a, b in pairs:
        bake([a], 'DIFFUSE', col, b, pass_filter={'COLOR'}); bake([a], 'NORMAL', nrm, b); bake([a], 'EMIT', em, b)
    bake(direct, 'DIFFUSE', col, pass_filter={'COLOR'}); bake(direct, 'NORMAL', nrm); bake(direct, 'EMIT', em)
    for h in hps: h.hide_render = True
    sc.cycles.samples = 24 if FAST else 96
    for grp in aosets:                                                            # each part shades itself and its neighbours of the set
        for o in lp: o.hide_render = o not in grp
        bake([o for o in grp if o.name not in ('fire', 'glass', 'souls')], 'AO', ao)
    for o in lp: o.hide_render = False
    C, A, E, Nn = px(col), px(ao)[..., :1], px(em), px(nrm)
    A = np.clip(A, 0, 1) ** 1.3
    alb = C * (0.16 + 0.84 * A) * np.array([1.0, 0.93, 0.82]) ** (2.2 * (1 - A))   # AO in; grime, brown in the hollows
    E = np.clip(E * 1.0, 0, 1)
    def save(a, name, size=None):
        im = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))
        if size: im = im.resize((size, size), Image.LANCZOS)
        im.save(os.path.join(TMP, name)); return bpy.data.images.load(os.path.join(TMP, name))
    ia, ie, inr = save(alb, 'skulllantern_c.png'), save(E, 'skulllantern_e.png', SZ // 2), save(Nn, 'skulllantern_n.png')
    inr.colorspace_settings.name = 'Non-Color'
    m = bpy.data.materials.new('skulllantern'); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']; p.inputs['Roughness'].default_value = 0.62; p.inputs['Metallic'].default_value = 0
    def tex(im): t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; return t
    nt.links.new(tex(ia).outputs['Color'], p.inputs['Base Color'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex(inr).outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    nt.links.new(tex(ie).outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 1.0
    for o in lp:
        o.data.materials.clear(); o.data.materials.append(m)
        for f in o.data.polygons: f.material_index = 0


# ---------------------------------------------------------------- build
bkit.reset()
MATS = materials()
skull_hp, jaw_hp, hand_hp, wax_hp, waxs_hp = hp_skull(), hp_jaw(), hp_hand(), hp_wax(), hp_waxskull()
print('hp verts', {o.name: len(o.data.vertices) for o in (skull_hp, jaw_hp, hand_hp, wax_hp, waxs_hp)})
q = 0.6 if FAST else 1
skull = lowpoly(skull_hp, 'skull', int(3600 * q), 'skull'); jaw = lowpoly(jaw_hp, 'jaw', int(1100 * q), 'jaw'); hand = lowpoly(hand_hp, 'hand', int(1100 * q), 'root')
wax = lowpoly(wax_hp, 'wax', int(500 * q), 'body'); waxs = lowpoly(waxs_hp, 'waxskull', int(420 * q), 'skull')
tee, sou, (iron, lk), gla, fir = teeth(), souls(), ironwork(), glass(), fire()
pairs = [(skull, skull_hp), (jaw, jaw_hp), (hand, hand_hp), (wax, wax_hp), (waxs, waxs_hp)]
direct = [tee, sou, iron, gla, fir]
bake_all(pairs, direct, [[skull, jaw, tee, waxs, sou], [iron, wax, gla], [hand]])
for _, h in pairs: bpy.data.objects.remove(h, do_unlink=True)
arm = rig(lk)
bkit.active(iron)
for o in (skull, jaw, hand, wax, waxs, tee, sou, gla, fir): o.select_set(True)
bpy.ops.object.join(); iron.name = 'lantern'
iron.parent = arm; md = iron.modifiers.new('arm', 'ARMATURE'); md.object = arm
animate(arm)
print('tris', sum(len(p.vertices) - 2 for p in iron.data.polygons))
bkit.export_glb('skulllantern', step=1)
