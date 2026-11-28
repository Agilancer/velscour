"""The Treasure Imp (src/gfx/treasureimp3d.js, src/game/happenings.js): bm's rigged goblin thief (goblin_green_2, a mixamo
rig) brought through Blender: decimated, its skin re-toned to gilded gold-green, bulging lamp-yellow eyes, and its hoard
built here and skinned to new bones: a huge patched burlap loot sack on its back (bones `sack`, `sack_top`: the game
wobbles them) with coins, a jewelled goblet and a crown spilling from its mouth, a lantern on a pole (`lantern`), a ring
of stolen keys and a string of gems at the belt (`keys`).

    python tools/blender/treasureimp.py          (needs bpy, numpy, pillow)
Writes assets/models/beasts/treasureimp.glb. Sources: assets/source/beasts/treasureimp/ (goblin_green_2.glb, cloth_oat_c
from bm). Clips: idle, peek, run, panic, hit, death, jump, taunt."""
import bpy, sys, os, math, random, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector as V, Matrix, noise
from mathutils.bvhtree import BVHTree

SRC = os.path.join(bkit.ROOT, 'assets', 'source', 'beasts', 'treasureimp')
TRIS = 6000
CLIPS = {'idle': 'idle', 'idle3': 'peek', 'run': 'run', 'run2': 'panic', 'hit': 'hit', 'death': 'death', 'jump': 'jump', 'roar': 'taunt'}
TAU = math.tau
random.seed(5)
rnd = random.uniform
SACK = Matrix.Translation((0, 0.215, 0.53)) @ Matrix.Rotation(math.radians(-12), 4, 'X') @ Matrix.Scale(0.8, 4)   # the sack's foot, leaning back


def to_srgb(a): return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.clip(a, 0, 1) ** (1 / 2.4) - 0.055)
def to_lin(a): return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
def lin(h, k=1.0): return tuple(float(to_lin(int(h[i:i + 2], 16) / 255)) * k for i in (1, 3, 5))


def gild(img):
    """The goblin's olive skin -> gilded gold-green (bronze-green shadows, bright gold lights); its rags a touch lighter."""
    n = img.size[0]
    a = np.empty(n * n * 4, np.float32); img.pixels.foreach_get(a); a = a.reshape(n, n, 4)
    s = to_srgb(a[..., :3])
    mx, mn = s.max(-1), s.min(-1); d = mx - mn + 1e-6
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    sat = d / (mx + 1e-6)
    sm = lambda lo, hi, x: np.clip((x - lo) / (hi - lo), 0, 1)
    skin = sm(40, 52, hue) * (1 - sm(100, 115, hue)) * sm(0.16, 0.3, sat) * sm(0.12, 0.25, mx)
    lum = s @ np.array([0.3, 0.55, 0.15], np.float32)
    t = np.clip((lum - 0.12) / 0.5, 0, 1) ** 0.85
    st = [np.array(c, np.float32) for c in ((0.1, 0.15, 0.03), (0.46, 0.44, 0.07), (0.7, 0.6, 0.2))]
    tt = t[..., None]
    gold = np.where(tt < 0.5, st[0] + (st[1] - st[0]) * tt * 2, st[1] + (st[2] - st[1]) * (tt * 2 - 1))
    rags = np.clip(s * 1.25 + 0.02, 0, 1)
    out = rags * (1 - skin[..., None]) + gold * skin[..., None]
    a[..., :3] = to_lin(np.clip(out, 0, 1)); img.pixels.foreach_set(a.ravel()); img.update(); img.pack()


def sack_texture():
    """Burlap with folds, grime and three stitched patches (u round the sack, v up it)."""
    n = 256
    oat = np.asarray(Image.open(os.path.join(SRC, 'cloth_oat_c.webp')).convert('RGB').resize((n, n)), np.float32) / 255
    oat = oat / oat.mean((0, 1)) * np.array([0.74, 0.56, 0.33], np.float32)
    y, x = np.mgrid[0:n, 0:n] / n
    fold = 0.82 + 0.18 * np.sin(x * TAU * 7 + np.sin(y * 9) * 1.2) * (0.3 + 0.7 * y)
    shade = fold * (0.55 + 0.6 * np.clip(y * 2.2, 0, 1)) * (1 - 0.35 * np.clip((y - 0.72) * 6, 0, 1) * np.clip((0.86 - y) * 12, 0, 1))
    col = oat * shade[..., None]
    for (u0, v0, w, hh, c) in ((0.06, 0.22, 0.17, 0.2, (0.62, 0.16, 0.14)), (0.42, 0.34, 0.15, 0.17, (0.22, 0.42, 0.44)), (0.7, 0.16, 0.2, 0.16, (0.5, 0.42, 0.2)), (0.26, 0.5, 0.12, 0.12, (0.34, 0.2, 0.36))):
        m = (x > u0) & (x < u0 + w) & (y > v0) & (y < v0 + hh)
        col[m] = oat[m] * 1.5 * np.array(c, np.float32) / 0.5 * fold[m][:, None]
        e = 0.012
        edge = m & ~((x > u0 + e) & (x < u0 + w - e) & (y > v0 + e) & (y < v0 + hh - e))
        st = edge & (((x * n).astype(int) // 5 + (y * n).astype(int) // 5) % 2 == 0)
        col[edge] *= 0.6; col[st] = (0.93, 0.88, 0.7)
    p = os.path.join(tempfile.mkdtemp(prefix='imp_'), 'sack.png')
    Image.fromarray((np.clip(col[::-1], 0, 1) * 255).astype(np.uint8)).save(p)
    im = bpy.data.images.load(p); im.pack()
    return im


def material(name, col, rough=0.6, emit=None, estr=1.0, tex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = 0
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = estr
    if tex: t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex; nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    return m


class Build:
    """Verts, faces, per-loop UVs, a material per face and bone weights per vert, gathered in world space."""
    def __init__(self): self.v = []; self.f = []; self.uv = []; self.fm = []; self.w = []; self.mats = []
    def mat(self, name):
        if name not in self.mats: self.mats.append(name)
        return self.mats.index(name)
    def add(self, pts, faces, mat, bone, uvs=None, M=None):
        b = len(self.v); mi = self.mat(mat)
        for p in pts:
            p = V(p); q = M @ p if M else p
            self.v.append(q); self.w.append(bone(p) if callable(bone) else {bone: 1.0})
        for i, f in enumerate(faces):
            self.f.append([b + j for j in f]); self.fm.append(mi); self.uv.append(uvs[i] if uvs else [(0.5, 0.5)] * len(f))
    def lathe(self, prof, sides, mat, bone, M=None, lump=None, cap=True):
        """prof: [(r, z)] bottom up; uv: u round, v along the profile."""
        pts, faces, uvs = [], [], []
        for i, (r, z) in enumerate(prof):
            for j in range(sides):
                a = TAU * j / sides; k = 1 + (lump(a, z) if lump else 0)
                pts.append((math.cos(a) * r * k, math.sin(a) * r * k, z))
        n = len(prof)
        for i in range(n - 1):
            for j in range(sides):
                j2 = (j + 1) % sides
                faces.append([i * sides + j, i * sides + j2, (i + 1) * sides + j2, (i + 1) * sides + j])
                uvs.append([(j / sides, i / (n - 1)), ((j + 1) / sides, i / (n - 1)), ((j + 1) / sides, (i + 1) / (n - 1)), (j / sides, (i + 1) / (n - 1))])
        if cap:
            faces.append(list(range(sides))[::-1]); uvs.append([(0.5, 0.02)] * sides)
            faces.append([(n - 1) * sides + j for j in range(sides)]); uvs.append([(0.5, 0.98)] * sides)
        self.add(pts, faces, mat, bone, uvs, M)
    def coin(self, M, mat='gold', bone='sack_top', r=0.03, h=0.009):
        self.lathe([(r, -h / 2), (r, h / 2)], 7, mat, bone, M)
    def gem(self, c, r, mat, bone, M=None, tall=1.4):
        pts = [(0, 0, r * tall), (r, 0, 0), (0, r, 0), (-r, 0, 0), (0, -r, 0), (0, 0, -r * tall)]
        self.add([V(p) + V(c) for p in pts], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]], mat, bone, None, M)
    def box(self, c, s, mat, bone, M=None):
        c = V(c); x, y, z = s
        pts = [c + V((sx * x, sy * y, sz * z)) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
        self.add(pts, [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]], mat, bone, None, M)
    def torus(self, R, r, mat, bone, M=None, seg=10, sides=4):
        pts, faces = [], []
        for i in range(seg):
            a = TAU * i / seg
            for j in range(sides):
                b = TAU * j / sides; pts.append(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
        for i in range(seg):
            for j in range(sides):
                i2, j2 = (i + 1) % seg, (j + 1) % sides
                faces.append([i * sides + j, i2 * sides + j, i2 * sides + j2, i * sides + j2])
        self.add(pts, faces, mat, bone, None, M)
    def object(self, name, arm, mats):
        inv = arm.matrix_world.inverted()
        me = bpy.data.meshes.new(name); me.from_pydata([inv @ p for p in self.v], [], self.f)
        for n in self.mats: me.materials.append(mats[n])
        uv = me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            p.material_index = self.fm[p.index]; p.use_smooth = self.mats[self.fm[p.index]] in ('sack', 'eye')
            for k, li in enumerate(p.loop_indices): uv.data[li].uv = self.uv[p.index][k]
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        for i, w in enumerate(self.w):
            for b, x in w.items(): (o.vertex_groups.get(b) or o.vertex_groups.new(name=b)).add([i], x, 'REPLACE')
        o.parent = arm; md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm
        bkit.active(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
        return o


def rot(ax, deg): return Matrix.Rotation(math.radians(deg), 4, ax)
def at(*p): return Matrix.Translation(p)


def hoard(B):
    # the sack: fat and lumpy at the foot, cinched, a ragged open mouth
    prof = [(0.07, 0.0), (0.2, 0.035), (0.262, 0.12), (0.268, 0.22), (0.225, 0.32), (0.14, 0.4), (0.092, 0.44), (0.12, 0.475), (0.15, 0.5), (0.1, 0.49)]
    lump = lambda a, z: 0.09 * noise.noise(V((math.cos(a) * 2.1, math.sin(a) * 2.1, z * 7))) + (0.07 * math.sin(a * 5 + 1) if z > 0.46 else 0)
    sw = lambda p: (lambda t: {'sack': 1 - t, 'sack_top': t} if 0 < t < 1 else {'sack_top' if t >= 1 else 'sack': 1.0})(min(1, max(0, (p.z - 0.2) / 0.22)))
    B.lathe(prof, 14, 'sack', sw, SACK, lump)
    B.torus(0.098, 0.014, 'iron', 'sack_top', SACK @ at(0, 0, 0.44), 12, 4)                      # the cord
    B.lathe([(0.105, 0.47), (0.085, 0.5), (0.045, 0.525), (0.0, 0.535)], 9, 'gold', 'sack_top', SACK, lambda a, z: 0.12 * math.sin(a * 3 + z * 40), cap=False)  # the heap
    for i in range(13):                                                                         # coins on the heap and over the rim
        a = rnd(0, TAU); r = rnd(0.02, 0.135)
        B.coin(SACK @ at(math.cos(a) * r, math.sin(a) * r, 0.54 - r * 0.32 + rnd(0, 0.012)) @ rot('Z', rnd(0, 360)) @ rot('X', rnd(-55, 55)) @ rot('Y', rnd(-30, 30)))
    for (x, y, z) in ((-0.2, -0.17, 0.26), (0.24, -0.1, 0.2), (0.12, -0.24, 0.3)):               # coins poking through a split seam
        B.coin(SACK @ at(x, y, z) @ rot('X', 80) @ rot('Z', rnd(0, 90)), bone='sack')
    # a jewelled goblet tipping out of one side, a crown hooked over the other
    G = SACK @ at(0.07, -0.03, 0.5) @ rot('Y', 32) @ rot('X', 14)
    B.lathe([(0.034, 0), (0.012, 0.012), (0.01, 0.06), (0.03, 0.075), (0.05, 0.12), (0.054, 0.16), (0.044, 0.158)], 8, 'gold', 'sack_top', G)
    for i in range(4): a = TAU * i / 4 + 0.4; B.gem((math.cos(a) * 0.054, math.sin(a) * 0.054, 0.125), 0.013, 'ruby' if i % 2 else 'emerald', 'sack_top', G, 1.2)
    C = SACK @ at(-0.1, -0.05, 0.515) @ rot('Y', -38) @ rot('X', 24)
    cp, cf = [], []
    for j in range(10):
        a = TAU * j / 10; c, s = math.cos(a), math.sin(a)
        cp += [(c * 0.062, s * 0.062, 0), (c * 0.066, s * 0.066, 0.03 + (0.045 if j % 2 == 0 else 0)), (c * 0.054, s * 0.054, 0)]
    for j in range(10):
        k = (j + 1) % 10
        cf += [[j * 3, k * 3, k * 3 + 1, j * 3 + 1], [j * 3 + 2, j * 3 + 1, k * 3 + 1, k * 3 + 2]]
    B.add(cp, cf, 'gold', 'sack_top', None, C)
    for j in range(0, 10, 2): a = TAU * j / 10; B.gem((math.cos(a) * 0.068, math.sin(a) * 0.068, 0.085), 0.012, 'ruby' if j % 4 else 'emerald', 'sack_top', C, 1.1)
    B.gem((0.0, 0.085, 0.545), 0.03, 'ruby', 'sack_top', SACK, 1.25); B.gem((-0.02, -0.105, 0.525), 0.024, 'emerald', 'sack_top', SACK, 1.25)
    # a lantern on a crooked pole stuck through the cord
    P0, P1 = SACK @ V((0.08, 0.02, 0.4)), SACK @ V((0.36, -0.06, 0.6))
    d = P1 - P0; Mp = at(*P0) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    B.lathe([(0.011, 0), (0.008, d.length)], 4, 'iron', 'sack_top', Mp)
    L = at(*(P1 + V((0, 0, -0.035))))
    B.box((0, 0, -0.012), (0.004, 0.004, 0.022), 'iron', 'lantern', L)
    B.lathe([(0.012, -0.03), (0.036, -0.045)], 4, 'iron', 'lantern', L @ rot('Z', 45)); B.lathe([(0.034, -0.12), (0.02, -0.132)], 4, 'iron', 'lantern', L @ rot('Z', 45))
    B.box((0, 0, -0.083), (0.021, 0.021, 0.037), 'eye', 'lantern', L)
    for sx in (-1, 1):
        for sy in (-1, 1): B.box((sx * 0.024, sy * 0.024, -0.083), (0.004, 0.004, 0.038), 'iron', 'lantern', L)
    # at the belt: a ring of stolen keys on the hip, a string of gems across the front
    K = at(0.165, -0.075, 0.47)
    B.torus(0.034, 0.006, 'iron', 'keys', K @ rot('Y', 90) @ rot('X', 20), 8, 3)
    for i, (m, sw_, ln) in enumerate((('gold', -24, 0.1), ('iron', 2, 0.085), ('gold', 26, 0.075))):
        Mk = K @ at(0.004 * (i - 1), 0, -0.03) @ rot('X', sw_) @ rot('Y', 8 * (i - 1))
        B.box((0, 0, -ln / 2), (0.0055, 0.0055, ln / 2), m, 'keys', Mk)
        B.box((0, -0.014, -ln + 0.012), (0.004, 0.012, 0.011), m, 'keys', Mk); B.torus(0.014, 0.005, m, 'keys', Mk @ rot('Y', 90), 6, 3)
    for i in range(5):
        u = i / 4; x = -0.13 + 0.2 * u
        B.gem((x, -0.125 - 0.02 * math.sin(u * math.pi), 0.47 - 0.035 * math.sin(u * math.pi)), 0.016, ('ruby', 'emerald', 'gold')[i % 3], 'mixamorig:Hips', None, 1.3)


def eyes(B, body, arm):
    """Bulging lamp-yellow eyes set on the face (found by casting rays at the brow line)."""
    mw = body.matrix_world
    bvh = BVHTree.FromPolygons([mw @ v.co for v in body.data.vertices], [p.vertices[:] for p in body.data.polygons])
    for sx in (-1, 1):
        hit = bvh.ray_cast(V((sx * 0.033, -1, 0.874)), V((0, 1, 0)))[0]
        if not hit: continue
        M = at(hit.x, hit.y + 0.006, hit.z) @ Matrix.Diagonal((1, 0.8, 1, 1))
        B.lathe([(0.011, -0.016), (0.02, -0.006), (0.02, 0.006), (0.011, 0.016)], 8, 'eye', 'mixamorig:Head', M)


def main():
    bkit.reset()
    arm, meshes = bkit.import_glb(os.path.join(SRC, 'goblin_green_2.glb'))
    body = meshes[0]
    bkit.keep_actions(list(CLIPS))
    acts = list(bpy.data.actions); old = [a.name for a in acts]
    for a in acts: a.name = '~' + a.name
    for a, n in zip(acts, old): a.name = CLIPS[n]
    arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis.identity()
    bkit.decimate(body, TRIS)
    mat = body.data.materials[0]; nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    base = bsdf.inputs['Base Color'].links[0].from_node.image
    for inp in ('Metallic', 'Roughness', 'Normal'):
        for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0; bsdf.inputs['Roughness'].default_value = 0.75
    bsdf.inputs['Emission Color'].default_value = (*lin('#6a4a08'), 1); bsdf.inputs['Emission Strength'].default_value = 0.08   # a faint gilt glow
    gild(base)
    # bones for the hoard
    inv = arm.matrix_world.inverted()
    bkit.active(arm); bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones
    def bone(name, parent, head, tail):
        b = eb.new(name); b.head = inv @ V(head); b.tail = inv @ V(tail); b.parent = eb[parent]; b.use_deform = True; return b
    bone('sack', 'mixamorig:Spine2', SACK @ V((0, 0, 0.02)), SACK @ V((0, 0, 0.3)))
    bone('sack_top', 'sack', SACK @ V((0, 0, 0.3)), SACK @ V((0, 0, 0.52)))
    lp = SACK @ V((0.36, -0.06, 0.6))
    bone('lantern', 'sack_top', lp, lp + V((0, 0, -0.11)))
    bone('keys', 'mixamorig:Hips', (0.165, -0.075, 0.505), (0.165, -0.075, 0.38))
    bpy.ops.object.mode_set(mode='OBJECT')
    mats = dict(sack=material('sack', (1, 1, 1), 0.9, tex=sack_texture()), gold=material('gold', lin('#e8a018'), 0.3, lin('#a05a04'), 0.5),
                ruby=material('ruby', lin('#e01830'), 0.2, lin('#ff1030'), 0.6), emerald=material('emerald', lin('#20d890'), 0.2, lin('#10e8a0'), 0.5),
                iron=material('iron', lin('#3a2a20'), 0.7), eye=material('eye', lin('#ffe040'), 0.3, lin('#ffe030'), 3.0))
    B = Build(); hoard(B); eyes(B, body, arm)
    loot = B.object('hoard', arm, mats)
    body.name = 'body'
    tris = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
    print('tris: body', tris(body), 'hoard', tris(loot))
    arm['rad'] = 1.25
    bkit.export_glb('treasureimp', [arm, body, loot])


main()
