# The Altar of Heresy (docs/ENDGAME.md, src/gfx/heresyaltar.js): modelled in Blender in code and baked to sprites from
# the game's isometric view. Runs headless and builds its own scene from nothing (never point it at a .blend you care
# about); `python tools/heresyaltar.py` runs it and packs the renders into assets/sprites/npc/heresy_altar.webp/json.
#   blender -b --factory-startup --python tools/heresyaltar_blender.py -- OUT_DIR [--fast] [--only base|heart|beauty] [--blend FILE]
# Units: 1 Blender unit = 1 tile (the 64 x 32 px diamond), Blender X = game x, Blender Y = -game y, Z up (39 px a unit).
# Writes OUT_DIR/base_{sealed,awake,ablaze}.png (the altar without its heart), heart_{dim,lit}_NN.png (the floating
# heart's loop, the altar held out so it tucks behind what stands in front of it), beauty.png and frame.json.
import bpy, bmesh, math, json, os, sys, random
from math import sin, cos, pi, radians
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(next((a for a in ARGS if not a.startswith('--') and ARGS[ARGS.index(a) - 1] not in ('--only', '--blend')), 'heresy_altar_renders'))
FAST = '--fast' in ARGS
ONLY = ARGS[ARGS.index('--only') + 1] if '--only' in ARGS else None
BLEND = ARGS[ARGS.index('--blend') + 1] if '--blend' in ARGS else None
os.makedirs(OUT, exist_ok=True)
RNG = random.Random(1666)
S = 3                        # render px per world px
PX = 32 * math.sqrt(2)       # world px per Blender unit across the screen
FRAMES = 32                  # the heart's loop
HEART = 1.62                 # the heart floats this high (model units)
K = 1.25                     # the model is built at 1 and scaled by K about its foot: the dais ~2 tiles across

# the altar's own frame: s to the screen's right, b away from the viewer, z up (the viewer looks from +x, -y)
SD, BK, UP = Vector((1, 1, 0)).normalized(), Vector((-1, 1, 0)).normalized(), Vector((0, 0, 1))
def W(s, b, z): return SD * s + BK * b + UP * z
FRAME = Matrix((SD, BK, UP)).transposed()   # local (s, b, z) -> world

# ---------------------------------------------------------------- the scene
sc = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for coll in list(bpy.data.collections): bpy.data.collections.remove(coll)
sc.name = 'HeresyAltar'
COLL = {k: bpy.data.collections.new(k) for k in ('Base', 'Heart', 'Lights', 'Ground', 'Fire')}
for c in COLL.values(): sc.collection.children.link(c)

EMIT = []   # (socket, strength at 1, group): every glowing thing, scaled per state

def mat(name, color, rough=0.6, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N = nt.nodes
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    return m, nt, N, nt.links, b

def hexc(h): h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

def ramp(N, stops, interp='LINEAR'):
    r = N.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = interp
    els = r.color_ramp.elements
    while len(els) > 1: els.remove(els[-1])
    for i, (p, c) in enumerate(stops):
        e = els[0] if i == 0 else els.new(p)
        e.position = p; e.color = (*c, 1) if len(c) == 3 else c
    return r

def sock(coll, ident): return next(s for s in coll if s.identifier == ident)
def mixc(N, L, fac, a, b, blend='MIX', facv=None):
    m = N.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = blend
    if fac is not None: L.new(fac, sock(m.inputs, 'Factor_Float'))
    else: sock(m.inputs, 'Factor_Float').default_value = facv
    for ident, v in (('A_Color', a), ('B_Color', b)):
        if isinstance(v, tuple): sock(m.inputs, ident).default_value = (*v, 1) if len(v) == 3 else v
        else: L.new(v, sock(m.inputs, ident))
    return sock(m.outputs, 'Result_Color')

def math_node(N, op, a=None, b=None):
    m = N.new('ShaderNodeMath'); m.operation = op
    if a is not None: m.inputs[0].default_value = a
    if b is not None: m.inputs[1].default_value = b
    return m

def glow(N, L, b, mask_socket, color, strength, group):
    """Emission on Principled b: color * mask * strength (registered under group)."""
    b.inputs['Emission Color'].default_value = (*color, 1)
    k = math_node(N, 'MULTIPLY', None, strength)
    L.new(mask_socket, k.inputs[0]); L.new(k.outputs[0], b.inputs['Emission Strength'])
    EMIT.append((k.inputs[1], strength, group))

def stone(name, c0, c1, edge, cracks=0.0, scale=5.0):
    m, nt, N, L, b = mat(name, c0, 0.8)
    tc = N.new('ShaderNodeTexCoord')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 10; nz.inputs['Roughness'].default_value = 0.62
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    col = ramp(N, [(0.3, c0), (0.72, c1)]); L.new(nz.outputs['Fac'], col.inputs['Fac'])
    # worn, paler edges (ambient occlusion from inside the mesh is low on a corner)
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.inside = True; ao.samples = 8; ao.inputs['Distance'].default_value = 0.05
    em = ramp(N, [(0.25, (1, 1, 1)), (0.7, (0, 0, 0))]); L.new(ao.outputs['AO'], em.inputs['Fac'])
    L.new(mixc(N, L, em.outputs['Color'], col.outputs['Color'], edge), b.inputs['Base Color'])
    rr = ramp(N, [(0.3, (0.62,) * 3), (0.8, (0.92,) * 3)]); L.new(nz.outputs['Fac'], rr.inputs['Fac']); L.new(rr.outputs['Color'], b.inputs['Roughness'])
    # chisel marks and cracks
    vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = scale * 0.8
    L.new(tc.outputs['Object'], vo.inputs['Vector'])
    fine = N.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 60; fine.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], fine.inputs['Vector'])
    bump1 = N.new('ShaderNodeBump'); bump1.inputs['Strength'].default_value = 0.35; bump1.inputs['Distance'].default_value = 0.01
    L.new(fine.outputs['Fac'], bump1.inputs['Height'])
    crack = ramp(N, [(0.0, (0, 0, 0)), (0.05, (1, 1, 1))]); L.new(vo.outputs['Distance'], crack.inputs['Fac'])
    bump2 = N.new('ShaderNodeBump'); bump2.inputs['Strength'].default_value = 0.6; bump2.inputs['Distance'].default_value = 0.02
    L.new(crack.outputs['Color'], bump2.inputs['Height']); L.new(bump1.outputs['Normal'], bump2.inputs['Normal'])
    L.new(bump2.outputs['Normal'], b.inputs['Normal'])
    if cracks:   # a few jagged cracks run with fire
        dn = N.new('ShaderNodeTexNoise'); dn.inputs['Scale'].default_value = 7; dn.inputs['Detail'].default_value = 4
        L.new(tc.outputs['Object'], dn.inputs['Vector'])
        dv = N.new('ShaderNodeVectorMath'); dv.operation = 'SCALE'; dv.inputs['Scale'].default_value = 0.22
        L.new(dn.outputs['Color'], dv.inputs[0])
        add = N.new('ShaderNodeVectorMath'); add.operation = 'ADD'; L.new(tc.outputs['Object'], add.inputs[0]); L.new(dv.outputs['Vector'], add.inputs[1])
        vc = N.new('ShaderNodeTexVoronoi'); vc.feature = 'DISTANCE_TO_EDGE'; vc.inputs['Scale'].default_value = 2.6
        L.new(add.outputs['Vector'], vc.inputs['Vector'])
        thin = ramp(N, [(0.0, (1, 1, 1)), (0.016, (0.5, 0.5, 0.5)), (0.03, (0, 0, 0))]); L.new(vc.outputs['Distance'], thin.inputs['Fac'])
        mz = N.new('ShaderNodeTexNoise'); mz.inputs['Scale'].default_value = 2.2; mz.inputs['Detail'].default_value = 2
        L.new(tc.outputs['Object'], mz.inputs['Vector'])
        mk = ramp(N, [(0.52, (0, 0, 0)), (0.6, (1, 1, 1))]); L.new(mz.outputs['Fac'], mk.inputs['Fac'])
        mul = math_node(N, 'MULTIPLY'); L.new(thin.outputs['Color'], mul.inputs[0]); L.new(mk.outputs['Color'], mul.inputs[1])
        glow(N, L, b, mul.outputs[0], hexc('#ff4a18'), cracks, 'crack')
    return m

RIDGES = 22   # rings up each horn; the groove between them is one helix that glows
def horn_mat():
    m, nt, N, L, b = mat('Horn', hexc('#1a1212'), 0.3, coat=0.5)
    uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs['Vector'])
    col = ramp(N, [(0.0, hexc('#7a6248')), (0.2, hexc('#4a3628')), (0.55, hexc('#21171a')), (1.0, hexc('#0a0608'))])
    L.new(sep.outputs['Y'], col.inputs['Fac'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18; nz.inputs['Detail'].default_value = 8
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 6, 1)
    L.new(uv.outputs['UV'], mp.inputs['Vector']); L.new(mp.outputs['Vector'], nz.inputs['Vector'])
    L.new(mixc(N, L, None, col.outputs['Color'], nz.outputs['Color'], 'MULTIPLY', 0.4), b.inputs['Base Color'])
    # the groove phase: fract(v * RIDGES + u), one helix, 0 at the bottom of a groove (the geometry uses the same)
    ph = math_node(N, 'MULTIPLY_ADD', None, RIDGES); L.new(sep.outputs['Y'], ph.inputs[0])
    L.new(sep.outputs['X'], ph.inputs[2])
    fr = math_node(N, 'FRACT'); L.new(ph.outputs[0], fr.inputs[0])
    groove = ramp(N, [(0.0, (1, 1, 1)), (0.05, (0.5, 0.5, 0.5)), (0.11, (0, 0, 0)), (0.93, (0, 0, 0)), (1.0, (1, 1, 1))]); L.new(fr.outputs[0], groove.inputs['Fac'])
    band = ramp(N, [(0.03, (0, 0, 0)), (0.1, (1, 1, 1)), (0.55, (0.8, 0.8, 0.8)), (0.88, (0, 0, 0))]); L.new(sep.outputs['Y'], band.inputs['Fac'])
    mul = math_node(N, 'MULTIPLY'); L.new(groove.outputs['Color'], mul.inputs[0]); L.new(band.outputs['Color'], mul.inputs[1])
    # some turns of the groove burn hotter than others
    hn = N.new('ShaderNodeTexNoise'); hn.inputs['Scale'].default_value = 3.5; hn.inputs['Detail'].default_value = 2
    hm = N.new('ShaderNodeMapping'); hm.inputs['Scale'].default_value = (0.6, 7, 1); L.new(uv.outputs['UV'], hm.inputs['Vector']); L.new(hm.outputs['Vector'], hn.inputs['Vector'])
    hot = ramp(N, [(0.3, (0.15,) * 3), (0.62, (1.0,) * 3), (0.75, (1.6,) * 3)]); L.new(hn.outputs['Fac'], hot.inputs['Fac'])
    mul2 = math_node(N, 'MULTIPLY'); L.new(mul.outputs[0], mul2.inputs[0]); L.new(hot.outputs['Color'], mul2.inputs[1])
    glow(N, L, b, mul2.outputs[0], hexc('#ff3a14'), 7.0, 'vein')
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.01
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def plain_glow(name, color, base, strength, group, rough=0.5):
    m, nt, N, L, b = mat(name, base, rough)
    one = N.new('ShaderNodeValue'); one.outputs[0].default_value = 1
    glow(N, L, b, one.outputs[0], color, strength, group)
    return m

def flame_mat():
    m = bpy.data.materials.new('Flame')
    try: m.use_nodes = True
    except Exception: pass
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N):
        if n.type != 'OUTPUT_MATERIAL': N.remove(n)
    out = next(n for n in N if n.type == 'OUTPUT_MATERIAL')
    em = N.new('ShaderNodeEmission'); lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.45
    col = ramp(N, [(0.0, hexc('#ff5a10')), (0.55, hexc('#ffb040')), (1.0, hexc('#fff2c8'))])
    inv = math_node(N, 'SUBTRACT', 1.0); L.new(lw.outputs['Facing'], inv.inputs[1])
    L.new(inv.outputs[0], col.inputs['Fac'])
    L.new(col.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 14
    EMIT.append((em.inputs['Strength'], 14, 'flame'))
    L.new(em.outputs['Emission'], out.inputs['Surface'])
    return m

def page_mat():
    m, nt, N, L, b = mat('Pages', hexc('#b49a70'), 0.85)
    tc = N.new('ShaderNodeTexCoord')
    wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'; wv.inputs['Scale'].default_value = 9; wv.inputs['Distortion'].default_value = 2; wv.inputs['Detail'].default_value = 3
    L.new(tc.outputs['Object'], wv.inputs['Vector'])
    lines = ramp(N, [(0.0, (1, 1, 1)), (0.18, (0, 0, 0))]); L.new(wv.outputs['Fac'], lines.inputs['Fac'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 90; L.new(tc.outputs['Object'], nz.inputs['Vector'])
    br = ramp(N, [(0.45, (0, 0, 0)), (0.5, (1, 1, 1))]); L.new(nz.outputs['Fac'], br.inputs['Fac'])
    mul = math_node(N, 'MULTIPLY'); L.new(lines.outputs['Color'], mul.inputs[0]); L.new(br.outputs['Color'], mul.inputs[1])
    L.new(mixc(N, L, mul.outputs[0], hexc('#b49a70'), hexc('#3a0806')), b.inputs['Base Color'])
    lift = math_node(N, 'MULTIPLY_ADD', None, 0.85); lift.inputs[2].default_value = 0.12; L.new(mul.outputs[0], lift.inputs[0])
    glow(N, L, b, lift.outputs[0], hexc('#ff3a1a'), 9.0, 'page')
    return m

def heart_mat():
    """A blood crystal: dark glossy facets, brighter toward its middle, veins of light through it."""
    m, nt, N, L, b = mat('Heart', hexc('#5a0408'), 0.08, coat=1.0)
    b.inputs['Coat Roughness'].default_value = 0.03
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.4
    inv = math_node(N, 'SUBTRACT', 1.0); L.new(lw.outputs['Facing'], inv.inputs[1])
    core = ramp(N, [(0.0, (0.0,) * 3), (0.55, (0.25,) * 3), (1.0, (0.7,) * 3)]); L.new(inv.outputs[0], core.inputs['Fac'])
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 9
    L.new(tc.outputs['Object'], vo.inputs['Vector'])
    vein = ramp(N, [(0.0, (1, 1, 1)), (0.035, (0, 0, 0))]); L.new(vo.outputs['Distance'], vein.inputs['Fac'])
    add = math_node(N, 'ADD'); L.new(core.outputs['Color'], add.inputs[0]); L.new(vein.outputs['Color'], add.inputs[1])
    glow(N, L, b, add.outputs[0], hexc('#ff2a10'), 4.0, 'heart')
    return m

def ring_mat():
    m, nt, N, L, b = mat('HeartRing', hexc('#3a302c'), 0.32, metal=0.9)
    uv = N.new('ShaderNodeUVMap'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (3, 52, 1)
    L.new(uv.outputs['UV'], mp.inputs['Vector'])
    vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 1.0
    L.new(mp.outputs['Vector'], vo.inputs['Vector'])
    thin = ramp(N, [(0.0, (1, 1, 1)), (0.07, (0, 0, 0))]); L.new(vo.outputs['Distance'], thin.inputs['Fac'])
    glow(N, L, b, thin.outputs['Color'], hexc('#ff4a1c'), 7.0, 'ringrune')
    return m

M = {
    'basalt': stone('Basalt', hexc('#16131a'), hexc('#3a3440'), hexc('#6a6270'), cracks=7.0),
    'altar': stone('AltarStone', hexc('#1c171c'), hexc('#45393f'), hexc('#7a6a6a'), scale=7),
    'rock': stone('Rubble', hexc('#1a171c'), hexc('#3a3238'), hexc('#5a5058')),
    'horn': horn_mat(),
    'rune': plain_glow('Rune', hexc('#ff3a18'), hexc('#2a0a08'), 7.0, 'rune', 0.4),
    'eye': plain_glow('SkullEye', hexc('#ff3010'), hexc('#000000'), 30.0, 'eye'),
    'iron': mat('Iron', hexc('#2c2826'), 0.42, metal=0.95)[0],
    'bone': stone('Bone', hexc('#8a7a62'), hexc('#c8b896'), hexc('#e8dcc0'), scale=12),
    'void': mat('Void', hexc('#050304'), 0.9)[0],
    'wax': mat('Wax', hexc('#5a0c0c'), 0.35)[0],
    'waxb': mat('WaxBone', hexc('#c8bea4'), 0.4)[0],
    'wick': mat('Wick', hexc('#0a0808'), 0.9)[0],
    'flame': flame_mat(),
    'leather': mat('Leather', hexc('#2a1212'), 0.55, coat=0.2)[0],
    'pages': page_mat(),
    'blood': mat('Blood', hexc('#3c0405'), 0.12, coat=0.8)[0],
    'obsidian': stone('Obsidian', hexc('#07060a'), hexc('#1a1620'), hexc('#5a4a66'), cracks=9.0, scale=3),
    'heart': heart_mat(),
    'hring': ring_mat(),
    'ribbon': mat('Ribbon', hexc('#7a0a10'), 0.5)[0],
}
for k in ('obsidian',):   # obsidian is glassy
    next(n for n in M[k].node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Coat Weight'].default_value = 1.0

# ---------------------------------------------------------------- geometry helpers
def obj(name, bm, material, coll='Base', smooth=False, bevel=0.0, mats=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    for mm in (mats or [material]): me.materials.append(mm)
    o = bpy.data.objects.new(name, me); COLL[coll].objects.link(o)
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = radians(35)
    return o

def prism(n, r, z0, z1, rot=pi / 8, rtop=None, jitter=0.0, c=(0, 0)):
    bm = bmesh.new()
    rt = r if rtop is None else rtop
    def ring(rr, z):
        return [bm.verts.new((c[0] + rr * cos(rot + i * 2 * pi / n) * (1 + RNG.uniform(-jitter, jitter)), c[1] + rr * sin(rot + i * 2 * pi / n) * (1 + RNG.uniform(-jitter, jitter)), z)) for i in range(n)]
    bot, top = ring(r, z0), ring(rt, z1)
    bm.faces.new(bot[::-1]); bm.faces.new(top)
    for i in range(n): j = (i + 1) % n; bm.faces.new((bot[i], bot[j], top[j], top[i]))
    return bm

def boxbm(sx, sb, sz, center=(0, 0, 0), frame=True):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx + center[0], v.co.y * sb + center[1], v.co.z * sz + center[2]))
        if frame: v.co = FRAME @ v.co
    return bm

def place(o, s=0, b=0, z=0, rot=None):
    o.location = W(s, b, z)
    if rot is not None: o.rotation_euler = rot
    return o

def transform(bm, m):
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return bm

def uvsphere(r, seg=12, rings=8):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r); return bm

def icosphere(r, sub=1):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r); return bm

def join(*bms):
    out = bmesh.new(); me = bpy.data.meshes.new('tmp')
    for bm in bms:
        bm.to_mesh(me); out.from_mesh(me); bm.free()
    bpy.data.meshes.remove(me)
    return out

def bar_bm(a, c, w, t, nrm):
    """A flat bar from point a to point c (world), w wide, t thick, lying on a surface with normal nrm."""
    a, c, nrm = Vector(a), Vector(c), Vector(nrm).normalized()
    d = (c - a); L = d.length; d.normalize(); side = d.cross(nrm).normalized()
    bm = bmesh.new()
    pts = [a - side * w / 2, c - side * w / 2, c + side * w / 2, a + side * w / 2]
    v0 = [bm.verts.new(p) for p in pts]; v1 = [bm.verts.new(p + nrm * t) for p in pts]
    bm.faces.new(v0[::-1]); bm.faces.new(v1)
    for i in range(4): j = (i + 1) % 4; bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
    return bm

def catmull(P, n):
    P = [P[0] + (P[0] - P[1])] + P + [P[-1] + (P[-1] - P[-2])]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2])
    return out

def tube(path, radius, seg=18, twist=0.0, flipu=False, cap=True):
    """A tube along path (world points), radius(t, angle); UV u round, v along."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    n = len(path)
    T = [(path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized() for i in range(n)]
    ref = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    Nn = (ref - T[0] * ref.dot(T[0])).normalized()
    rings = []
    for i in range(n):
        if i: # parallel transport
            Nn = (Nn - T[i] * Nn.dot(T[i])).normalized()
        Bn = T[i].cross(Nn)
        t = i / (n - 1)
        rings.append([bm.verts.new(path[i] + (Nn * cos(a) + Bn * sin(a)) * radius(t, a)) for a in (2 * pi * k / seg + twist * t for k in range(seg))])
    for i in range(n - 1):
        for k in range(seg):
            k2 = (k + 1) % seg
            f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            for lp, (u, v) in zip(f.loops, ((k / seg, i / (n - 1)), ((k + 1) / seg, i / (n - 1)), ((k + 1) / seg, (i + 1) / (n - 1)), (k / seg, (i + 1) / (n - 1)))):
                lp[uvl].uv = (1 - u if flipu else u, v)
    if cap:
        bm.faces.new(rings[0][::-1])
        tip = bm.verts.new(path[-1] + T[-1] * 0.01)
        for k in range(seg): bm.faces.new((rings[-1][k], rings[-1][(k + 1) % seg], tip))
    return bm

# ---------------------------------------------------------------- the dais: three octagonal tiers of black basalt
TIERS = [(0.80, 0.0, 0.12), (0.635, 0.12, 0.24), (0.47, 0.24, 0.36)]
for i, (r, z0, z1) in enumerate(TIERS):
    obj(f'Tier{i}', prism(8, r, z0, z1, jitter=0.012), M['basalt'], bevel=0.016)
# a ring of runes cut in the lowest tier, between two thin channels
apo = lambda r: r * cos(pi / 8)
RG = (apo(0.80) + apo(0.635)) / 2
def ring_glyphs(rad, z, n, cell, coll='Base', material='rune', skip=()):
    bms = []
    for i in range(n):
        a = 2 * pi * i / n - pi / 4
        if any(abs((a - s + pi) % (2 * pi) - pi) < 0.2 for s in skip): continue
        c = Vector((rad * cos(a), rad * sin(a), z)); tng = Vector((-sin(a), cos(a), 0)); rdl = Vector((cos(a), sin(a), 0))
        for _ in range(RNG.choice((2, 3, 3, 4))):
            p0 = c + tng * RNG.uniform(-cell, cell) / 2 + rdl * RNG.uniform(-cell, cell) / 2
            ang = RNG.choice((0, pi / 2, pi / 4, -pi / 4, pi / 3))
            d = tng * cos(ang) + rdl * sin(ang)
            ln = RNG.uniform(0.4, 1.0) * cell
            bms.append(bar_bm(p0 - d * ln / 2, p0 + d * ln / 2, cell * 0.16, 0.003, (0, 0, 1)))
    return bms
glyphs = ring_glyphs(RG, 0.1205, 36, 0.05, skip=(radians(-82.6), radians(-17)))
for rr in (RG - 0.042, RG + 0.042):   # the two channels
    pts = [Vector((rr * cos(a), rr * sin(a), 0.1205)) for a in (2 * pi * k / 72 for k in range(73))]
    for k in range(72): glyphs.append(bar_bm(pts[k], pts[k + 1], 0.008, 0.003, (0, 0, 1)))
obj('RuneRing', join(*glyphs), M['rune'])
# the same runes climbing the middle tier's face toward the viewer
g2 = []
for i in range(5):
    s = -0.16 + i * 0.08; zc = 0.18
    for _ in range(3):
        p = W(s + RNG.uniform(-0.02, 0.02), -apo(0.635) - 0.001, zc + RNG.uniform(-0.03, 0.03))
        d = W(*RNG.choice(((1, 0, 0), (0, 0, 1), (0.7, 0, 0.7), (0.7, 0, -0.7))))
        g2.append(bar_bm(p - d * 0.018, p + d * 0.018, 0.006, 0.003, -BK))
obj('TierRunes', join(*g2), M['rune'])

# ---------------------------------------------------------------- the altar block on the top tier
Z0 = 0.36
obj('AltarPlinth', boxbm(0.66, 0.44, 0.06, (0, 0, Z0 + 0.03)), M['altar'], bevel=0.012)
obj('AltarBody', boxbm(0.56, 0.34, 0.36, (0, 0, Z0 + 0.06 + 0.18)), M['altar'], bevel=0.01)
obj('AltarSlab', boxbm(0.74, 0.5, 0.07, (0, 0, Z0 + 0.42 + 0.035)), M['altar'], bevel=0.014)
ZT = Z0 + 0.49   # the slab's top
FRONT = -0.17    # the body's front face (b)
# the sigil on the body's front: a circle and a seven-pointed star, the skull at its heart
cz, cr = Z0 + 0.24, 0.135
sig = []
circ = [W(cr * cos(a), FRONT - 0.002, cz + cr * sin(a)) for a in (2 * pi * k / 40 for k in range(41))]
for k in range(40): sig.append(bar_bm(circ[k], circ[k + 1], 0.012, 0.004, -BK))
star = [W(cr * 0.96 * cos(pi / 2 + 2 * pi * k / 7), FRONT - 0.002, cz + cr * 0.96 * sin(pi / 2 + 2 * pi * k / 7)) for k in range(7)]
for k in range(7): sig.append(bar_bm(star[k], star[(k + 3) % 7], 0.009, 0.004, -BK))
# rune columns down either side of the front
for side in (-1, 1):
    for i in range(6):
        zc = Z0 + 0.1 + i * 0.05
        for _ in range(2):
            p = W(side * 0.225 + RNG.uniform(-0.015, 0.015), FRONT - 0.002, zc + RNG.uniform(-0.012, 0.012))
            d = W(*RNG.choice(((1, 0, 0), (0, 0, 1), (0.7, 0, 0.7), (0.7, 0, -0.7))))
            sig.append(bar_bm(p - d * 0.016, p + d * 0.016, 0.007, 0.004, -BK))
obj('AltarSigil', join(*sig), M['rune'])

# ---------------------------------------------------------------- skulls
def skull(name, s, b, z, k, yaw=0.0, eyes=True, coll='Base', tilt=0.0):
    """A skull k units across facing the viewer (yaw turns it), its jaw on the ground at (s, b, z)."""
    rot = Matrix.Rotation(radians(45) + yaw, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'X')
    def put(bm, loc, scl):
        transform(bm, Matrix.Diagonal((*scl, 1)))
        transform(bm, Matrix.Translation(Vector(loc) * k))
        return bm
    cran = put(uvsphere(k * 0.5, 16, 10), (0, 0.06, 0.62), (0.92, 1.08, 0.94))
    face = put(boxbm(1, 1, 1, frame=False), (0, -0.28, 0.36), (0.66 * k, 0.4 * k, 0.4 * k))
    jaw = put(boxbm(1, 1, 1, frame=False), (0, -0.26, 0.1), (0.56 * k, 0.36 * k, 0.18 * k))
    bone = join(cran, face, jaw)
    sock = join(*(put(uvsphere(k * 0.15, 10, 6), (x, -0.43, 0.42), (1, 0.6, 1.1)) for x in (-0.19, 0.19)), put(uvsphere(k * 0.07, 8, 5), (0, -0.48, 0.27), (1, 0.6, 1.3)),
                put(boxbm(1, 1, 1, frame=False), (0, -0.47, 0.18), (0.36 * k, 0.02 * k, 0.03 * k)))
    out = []
    for nm, bm, mt, sm in ((name, bone, M['bone'], True), (name + 'Sockets', sock, M['void'], True)):
        transform(bm, rot); o = obj(nm, bm, mt, smooth=sm, coll=coll); place(o, s, b, z); out.append(o)
    if eyes:
        e = join(*(put(uvsphere(k * 0.075, 8, 5), (x, -0.47, 0.42), (1, 0.7, 1)) for x in (-0.19, 0.19)))
        transform(e, rot); out.append(place(obj(name + 'Eyes', e, M['eye'], coll=coll), s, b, z))
    return out

skull('AltarSkull', 0, FRONT - 0.035, cz - 0.075, 0.15, eyes=True)
skull('StepSkullL', -0.40, -0.52, 0.12, 0.085, yaw=radians(25))
skull('StepSkullR', 0.38, -0.36, 0.24, 0.075, yaw=radians(-30))
skull('GroundSkull1', 0.56, -0.72, 0.0, 0.08, yaw=radians(-15))
skull('GroundSkull2', 0.67, -0.6, 0.0, 0.07, yaw=radians(-50), eyes=False)
skull('GroundSkull3', 0.62, -0.68, 0.06, 0.068, yaw=radians(10), eyes=False, tilt=radians(-12))

# ---------------------------------------------------------------- the forbidden book on the slab, open toward the viewer
book = Matrix.Translation(W(0, 0.03, ZT + 0.045)) @ Matrix.Rotation(radians(45), 4, 'Z') @ Matrix.Rotation(radians(16), 4, 'X')
cv = boxbm(0.36, 0.26, 0.014, (0, 0, 0), frame=False); transform(cv, book)
obj('BookCover', cv, M['leather'], bevel=0.004)
for side in (-1, 1):
    pg = boxbm(0.16, 0.235, 0.026, (side * 0.085, 0, 0.018), frame=False)
    transform(pg, Matrix.Rotation(side * radians(-8), 4, 'Y'))
    transform(pg, book); obj(f'BookPages{side}', pg, M['pages'], bevel=0.004)
obj('BookRibbon', join(bar_bm(W(0.03, -0.1, ZT + 0.02), W(0.04, -0.251, ZT + 0.004), 0.02, 0.003, UP), bar_bm(W(0.04, -0.252, ZT + 0.004), W(0.046, -0.252, ZT - 0.13), 0.02, 0.003, -BK)), M['ribbon'])
# blood on the slab and running down the front
bl = []
for (s, b, rx, ry) in ((-0.24, -0.12, 0.07, 0.05), (0.27, 0.1, 0.05, 0.04), (0.18, -0.17, 0.05, 0.035)):
    d = uvsphere(1, 12, 6); transform(d, Matrix.Diagonal((rx, ry, 0.006, 1))); transform(d, Matrix.Translation(W(s, b, ZT)))
    bl.append(d)
for s, ln in ((-0.24, 0.12), (0.17, 0.2), (0.21, 0.08), (-0.05, 0.15)):
    bl.append(bar_bm(W(s, -0.251, ZT - 0.01), W(s + RNG.uniform(-0.005, 0.005), -0.251, ZT - 0.01 - ln * 0.4), 0.014, 0.005, -BK))
    bl.append(bar_bm(W(s, FRONT - 0.001, Z0 + 0.42), W(s, FRONT - 0.001, Z0 + 0.42 - ln), 0.01, 0.004, -BK))
obj('Blood', join(*bl), M['blood'], smooth=True)

# ---------------------------------------------------------------- the horns: two great ribbed horns rising from the dais
HORN_TIPS = []
def horn(side):
    ctrl = [(0.50, 0.06, 0.10), (0.60, 0.10, 0.55), (0.75, 0.14, 1.05), (0.76, 0.12, 1.55), (0.62, 0.06, 1.95), (0.42, 0.0, 2.13), (0.25, -0.06, 2.07)]
    path = catmull([W(side * s, b, z) for s, b, z in ctrl], 24)
    def rad(t, a):
        u = a / (2 * pi); u = 1 - u if side < 0 else u   # mirrored, so both spirals run the same way to the eye
        f = (t * RIDGES + u) % 1.0
        ridge = (0.5 - 0.5 * cos(2 * pi * f)) ** 0.7
        return (0.145 * (1 - t) ** 0.85 + 0.006) * (1 + 0.085 * ridge * (1 - 0.5 * t))
    HORN_TIPS.append(path[-1])
    return obj(f'Horn{side}', tube(path, rad, 24, flipu=side < 0), M['horn'], smooth=True)
HORNS = [horn(-1), horn(1)]
for h in HORNS: h.visible_shadow = False   # their long shadows would run off the sprite

# iron collars where the horns leave the dais, chains slung from the horns to the slab
for side in (-1, 1):
    col = tube(catmull([W(side * 0.53, 0.08, 0.38), W(side * 0.545, 0.085, 0.47)], 2), lambda t, a: 0.172, 16, cap=False)
    obj(f'Collar{side}', col, M['iron'], smooth=True)
def chain(a, c, sag, n):
    links = []
    for i in range(n):
        t = (i + 0.5) / n
        p = a.lerp(c, t) - UP * sag * 4 * t * (1 - t)
        q = a.lerp(c, t + 0.01) - UP * sag * 4 * (t + 0.01) * (1 - t - 0.01)
        d = (q - p).normalized()
        tor = tube([Vector((cos(u) * 0.032, sin(u) * 0.018, 0)) for u in (2 * pi * k / 12 for k in range(13))], lambda t, a: 0.0065, 6, cap=False)
        rot = d.to_track_quat('X', 'Z').to_matrix().to_4x4() @ Matrix.Rotation(pi / 2 * (i % 2), 4, 'X')
        transform(tor, rot); transform(tor, Matrix.Translation(p)); links.append(tor)
    return join(*links)
for side in (-1, 1):
    obj(f'Chain{side}', chain(W(side * 0.66, 0.0, 1.02), W(side * 0.35, -0.22, ZT - 0.02), 0.16, 17), M['iron'], smooth=True)

# ---------------------------------------------------------------- obsidian shards breaking out of the ground behind
def shard(s, b, h, r, lean, yaw):
    bm = prism(5, r, -0.05, h * 0.75, rot=RNG.uniform(0, pi), rtop=r * 0.55, jitter=0.25)
    tip = bm.verts.new((RNG.uniform(-r, r) * 0.3, RNG.uniform(-r, r) * 0.3, h))
    top = [v for v in bm.verts if abs(v.co.z - h * 0.75) < 1e-6]
    bm.faces.remove(next(f for f in bm.faces if all(v in top for v in f.verts)))
    for i in range(len(top)): bm.faces.new((top[i], top[(i + 1) % len(top)], tip))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    transform(bm, Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(lean, 4, 'X'))
    return place(obj('Shard', bm, M['obsidian'], bevel=0.006), s, b, 0)
for (s, b, h, r, lean) in ((-0.34, 0.66, 0.72, 0.085, 0.18), (0.10, 0.74, 0.95, 0.1, 0.12), (0.40, 0.62, 0.62, 0.08, 0.22),
                           (-0.70, 0.30, 0.42, 0.065, 0.3), (0.74, 0.22, 0.36, 0.06, 0.32), (-0.08, 0.80, 0.5, 0.06, 0.25)):
    shard(s, b, h, r, lean, math.atan2(-s, b) + pi)   # each leans out, away from the altar

# rubble round the foot of the dais
for i in range(14):
    a = RNG.uniform(0, 2 * pi); rr = RNG.uniform(0.78, 0.92)
    bm = icosphere(RNG.uniform(0.025, 0.05), 1)
    for v in bm.verts: v.co *= RNG.uniform(0.75, 1.25)
    transform(bm, Matrix.Diagonal((1, 1, 0.7, 1)))
    o = obj('Rubble', bm, M['rock']); o.location = (rr * cos(a), rr * sin(a), 0.01)

# ---------------------------------------------------------------- candles in clusters on the tiers
FLAMES = []
def candle(p, h, r, wax):
    bms = [prism(10, r, p.z, p.z + h, jitter=0.04, c=(p.x, p.y))]
    for _ in range(RNG.randint(1, 3)):   # drips
        a = RNG.uniform(0, 2 * pi); d = uvsphere(r * 0.35, 8, 5)
        transform(d, Matrix.Diagonal((1, 1, RNG.uniform(1.6, 3.2), 1))); transform(d, Matrix.Translation(p + Vector((cos(a) * r, sin(a) * r, h * RNG.uniform(0.45, 0.9)))))
        bms.append(d)
    obj('Candle', join(*bms), wax, smooth=True)
    obj('Wick', prism(5, r * 0.12, p.z + h - 0.002, p.z + h + r * 0.5, c=(p.x, p.y)), M['wick'])
    fl = uvsphere(r * 0.42, 10, 8)
    for v in fl.verts:   # a teardrop
        z = v.co.z / (r * 0.42); v.co.x *= (1 - max(0, z) * 0.75); v.co.y *= (1 - max(0, z) * 0.75); v.co.z *= 2.0 if z > 0 else 1.0
    transform(fl, Matrix.Translation(p + Vector((0, 0, h + r * 0.9))))
    f = obj('Flame', fl, M['flame'], coll='Fire', smooth=True); f.visible_shadow = False
    FLAMES.append(f)
def cluster(a, rad, z, n):
    c = Vector((rad * cos(a), rad * sin(a), z))
    pool = uvsphere(1, 12, 6); transform(pool, Matrix.Diagonal((0.075, 0.075, 0.008, 1))); transform(pool, Matrix.Translation(c))
    obj('WaxPool', pool, M['wax'], smooth=True)
    for i in range(n):
        q = c + Vector((RNG.uniform(-0.045, 0.045), RNG.uniform(-0.045, 0.045), 0))
        candle(q, RNG.uniform(0.05, 0.17), RNG.uniform(0.015, 0.024), M['wax'] if RNG.random() < 0.7 else M['waxb'])
    return c
AF = -pi / 4   # toward the viewer
CANDLES = [cluster(AF + d, 0.54, 0.24, n) for d, n in ((radians(-62), 4), (radians(62), 4), (radians(-128), 3), (radians(128), 3))]
CANDLES.append(cluster(radians(-17), 0.665, 0.12, 2))
# one on the step skull's crown
candle(W(0.38, -0.36, 0.24 + 0.075 * 0.98), 0.06, 0.016, M['waxb'])

# ---------------------------------------------------------------- the heart: a red crystal in two turning rings of runes
heart_root = bpy.data.objects.new('HeartRoot', None); COLL['Heart'].objects.link(heart_root); heart_root.location = (0, 0, HEART)
def child(o):
    o.parent = heart_root; return o
def gem(r, top, bot, n=8):
    bm = bmesh.new()
    tip, foot = bm.verts.new((0, 0, top)), bm.verts.new((0, 0, -bot))
    crown = [bm.verts.new((r * 0.62 * cos(2 * pi * k / n + pi / n), r * 0.62 * sin(2 * pi * k / n + pi / n), top * 0.55)) for k in range(n)]
    girdle = [bm.verts.new((r * cos(2 * pi * k / n), r * sin(2 * pi * k / n), 0)) for k in range(n)]
    for k in range(n):
        k2 = (k + 1) % n
        bm.faces.new((tip, crown[k], crown[k2]))
        bm.faces.new((crown[k], girdle[k2], crown[k2])); bm.faces.new((crown[k], girdle[k], girdle[k2]))
        bm.faces.new((girdle[k2], girdle[k], foot))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm
CRYSTAL = child(obj('Crystal', gem(0.155, 0.32, 0.28), M['heart'], coll='Heart'))
def torus(R, r, seg=72, sides=8):
    return tube([Vector((R * cos(u), R * sin(u), 0)) for u in (2 * pi * k / seg for k in range(seg + 1))], lambda t, a: r, sides, cap=False)
RING_A = child(obj('RingA', torus(0.30, 0.02, 96, 10), M['hring'], coll='Heart', smooth=True))
RING_B = child(obj('RingB', torus(0.37, 0.017, 96, 10), M['hring'], coll='Heart', smooth=True))
SHARDS = [child(obj(f'Mote{i}', gem(0.035, 0.07, 0.06, 6), M['heart'], coll='Heart')) for i in range(3)]
def pose_heart(ph):
    CRYSTAL.rotation_euler = (0, 0, ph * pi / 2)
    RING_A.rotation_euler = (radians(68), 0, ph * 2 * pi)
    RING_B.rotation_mode = 'ZXY'; RING_B.rotation_euler = (radians(-58), 0, -ph * 2 * pi + pi / 3)
    for i, m in enumerate(SHARDS):
        a = ph * 2 * pi / 3 + i * 2 * pi / 3
        m.location = (0.47 * cos(a), 0.47 * sin(a), 0.07 * sin(a * 3))
        m.rotation_euler = (0.4, 0.2, a * 2)
pose_heart(0)

# ---------------------------------------------------------------- lights, world, ground, camera
def light(name, kind, energy, color, coll='Lights', **kw):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
    for k, v in kw.items(): setattr(d, k, v)
    o = bpy.data.objects.new(name, d); COLL[coll].objects.link(o); return o
def aim(o, frm):
    o.rotation_euler = (-Vector(frm)).to_track_quat('-Z', 'Y').to_euler()
aim(light('Key', 'SUN', 2.6, (0.82, 0.86, 1.0), angle=radians(12)), (-0.3, -1.0, 2.1))
aim(light('Fill', 'SUN', 0.5, (1.0, 0.72, 0.5), angle=radians(30)), (1.0, -0.2, 0.5))
aim(light('Rim', 'SUN', 1.8, (0.55, 0.62, 1.0), angle=radians(8)), (0.15, 1.0, 0.7))
HEART_LIGHT = light('HeartLight', 'POINT', 60.0, (1.0, 0.16, 0.06), coll='Fire', shadow_soft_size=0.08); HEART_LIGHT.location = (0, 0, HEART)
CANDLE_LIGHTS = []
for c in CANDLES:
    l = light('CandleLight', 'POINT', 2.2, (1.0, 0.5, 0.18), coll='Fire', shadow_soft_size=0.05); l.location = c + Vector((0, 0, 0.3)); CANDLE_LIGHTS.append(l)
world = bpy.data.worlds.new('Dusk'); sc.world = world
try: world.use_nodes = True
except Exception: pass
next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND').inputs['Color'].default_value = (0.03, 0.028, 0.045, 1)
gbm = bmesh.new(); bmesh.ops.create_grid(gbm, x_segments=1, y_segments=1, size=3.0)
ground = obj('Ground', gbm, mat('Catcher', (0.5, 0.5, 0.5), 1.0)[0], coll='Ground'); ground.is_shadow_catcher = True

# the whole altar grows by K about the middle of its tile and turns 45 degrees clockwise (seen from above), so its
# square dais sits on the tile diamond like the rest of the isometric art; the sun lights stay put in the world
SPIN = Matrix.Rotation(radians(-45), 3, 'Z')
root = bpy.data.objects.new('Root', None); sc.collection.objects.link(root); root.scale = (K, K, K)
root.rotation_euler = (0, 0, radians(-45))
for o in list(bpy.data.objects):
    if o is not root and o.parent is None and o.name not in ('Key', 'Fill', 'Rim'): o.parent = root
cam_data = bpy.data.cameras.new('Iso'); cam_data.type = 'ORTHO'; cam_data.sensor_fit = 'VERTICAL'; cam_data.clip_end = 200
cam = bpy.data.objects.new('Iso', cam_data); sc.collection.objects.link(cam); sc.camera = cam
cam.rotation_euler = (radians(60), 0, radians(45))
bpy.context.view_layer.update()
RV, UV, FV = [cam.matrix_world.to_3x3() @ Vector(v) for v in ((1, 0, 0), (0, 1, 0), (0, 0, -1))]

def screen_bounds(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    xs, ys = [], []
    for o in objs:
        if o.type != 'MESH': continue
        e = o.evaluated_get(dg); me = e.to_mesh()
        for v in me.vertices:
            p = e.matrix_world @ v.co; xs.append(p.dot(RV)); ys.append(p.dot(UV))
        e.to_mesh_clear()
    return min(xs), max(xs), min(ys), max(ys)
base_objs = [o for o in COLL['Base'].objects] + list(COLL['Fire'].objects)
x0, x1, y0, y1 = screen_bounds(base_objs)
heart_r = 0.52 * K
x0 = min(x0, -heart_r); x1 = max(x1, heart_r); y1 = max(y1, (Vector((0, 0, HEART * K)).dot(UV)) + heart_r)
L_, R_ = math.floor(x0 * PX) - 6, math.ceil(x1 * PX) + 6     # world px, the origin at 0
B_, T_ = math.floor(y0 * PX) - 6, math.ceil(y1 * PX) + 4
WPX, HPX = R_ - L_, T_ - B_
cx, cy = (L_ + R_) / 2 / PX, (B_ + T_) / 2 / PX
cam.location = RV * cx + UV * cy - FV * 50
cam_data.ortho_scale = HPX / PX
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = WPX * S, HPX * S, 100
ANCHOR = (-L_, T_)   # where the altar's tile centre lands, world px from the image's top left
print('sprite', WPX, 'x', HPX, 'world px, anchor', ANCHOR)

# ---------------------------------------------------------------- render settings
try: sc.render.engine = 'CYCLES'
except TypeError as e: print(e)
cy = sc.cycles
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for t in ('HIP', 'OPTIX', 'CUDA', 'METAL', 'ONEAPI'):
        try:
            prefs.compute_device_type = t; prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == t]
            if gpus:
                for d in prefs.devices: d.use = d.type == t
                cy.device = 'GPU'; print('GPU', t, [d.name for d in gpus]); break
        except TypeError: continue
except Exception as e: print('no GPU', e)
cy.samples = 48 if FAST else 320
cy.use_denoising = True
cy.max_bounces = 6; cy.caustics_reflective = False; cy.caustics_refractive = False
cy.filter_width = 1.0
sc.render.film_transparent = True
sc.render.use_persistent_data = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.color_depth = '8'
try: sc.view_settings.view_transform = 'AgX'
except TypeError as e: print(e)
try: sc.view_settings.look = 'AgX - Punchy'
except TypeError as e:
    print(e)
    try: sc.view_settings.look = 'Punchy'
    except TypeError: pass
sc.view_settings.exposure = 0.35

LEVELS = {
    'sealed': dict(flame=0, rune=0, crack=0, vein=0, eye=0, page=0, heart=0, ringrune=0, light=0, candle=0),
    'awake': dict(flame=1, rune=0.5, crack=0.0, vein=0.12, eye=0.5, page=0.45, heart=0.45, ringrune=0.4, light=0.3, candle=1),
    'ablaze': dict(flame=1.15, rune=1.0, crack=1.0, vein=1.0, eye=1.0, page=1.0, heart=1.0, ringrune=1.0, light=1.0, candle=1.3),
    'dim': dict(flame=0, rune=0, crack=0, vein=0, eye=0, page=0, heart=0, ringrune=0, light=0, candle=0),
    'lit': dict(flame=0, rune=0, crack=0, vein=0, eye=0, page=0, heart=1.0, ringrune=1.0, light=1.0, candle=0),
}
def state(name):
    lv = LEVELS[name]
    for sock, k, g in EMIT: sock.default_value = k * lv[g]
    for f in FLAMES: f.hide_render = lv['flame'] == 0
    HEART_LIGHT.data.energy = 60 * K * K * lv['light']; HEART_LIGHT.hide_render = lv['light'] == 0
    for l in CANDLE_LIGHTS: l.data.energy = 2.2 * K * K * lv['candle']; l.hide_render = lv['candle'] == 0

def show(base, heart, holdout=False, ground=True):
    for o in COLL['Base'].objects: o.hide_render = not base and not holdout; o.is_holdout = holdout
    for o in COLL['Heart'].objects: o.hide_render = not heart
    ground_o = COLL['Ground'].objects[0]; ground_o.hide_render = not ground

def render(path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('wrote', path)

if ONLY in (None, 'base'):
    show(True, False)
    for st in ('sealed', 'awake', 'ablaze'):   # only the sealed layer (always drawn first) keeps the ground shadow,
        COLL['Ground'].objects[0].hide_render = st != 'sealed'   # so the cross-fades never darken it twice
        state(st); render(os.path.join(OUT, f'base_{st}.png'))
    # the fire alone (no moon, no sky): the game adds it, blurred, for a bloom that beats with the heart
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); sky = tuple(bg.inputs['Color'].default_value)
    bg.inputs['Color'].default_value = (0, 0, 0, 1)
    for o in COLL['Lights'].objects: o.hide_render = True
    COLL['Ground'].objects[0].hide_render = True
    state('ablaze'); render(os.path.join(OUT, 'glow_ablaze.png'))
    bg.inputs['Color'].default_value = sky
    for o in COLL['Lights'].objects: o.hide_render = False
if ONLY in (None, 'heart'):
    show(False, True, holdout=True, ground=False)
    for f in FLAMES: f.hide_render = True
    cy.samples = 32 if FAST else 128
    for var in ('dim', 'lit'):
        state(var)
        for f in FLAMES: f.hide_render = True
        for f in (range(FRAMES) if not FAST else range(0, FRAMES, 8)):
            pose_heart(f / FRAMES); render(os.path.join(OUT, f'heart_{var}_{f:02d}.png'))
    pose_heart(0)
if ONLY in (None, 'beauty'):   # a close three-quarter look for people (not used in game)
    show(True, True); state('ablaze')
    for o in COLL['Base'].objects: o.is_holdout = False
    bc = bpy.data.cameras.new('Beauty'); bc.lens = 70
    bo = bpy.data.objects.new('Beauty', bc); sc.collection.objects.link(bo)
    bo.location = SPIN @ W(-1.6, -5.2, 2.1) * K; aim(bo, bo.location - Vector((0, 0, 1.05 * K)))
    sc.camera = bo; rx, ry = sc.render.resolution_x, sc.render.resolution_y
    sc.render.resolution_x, sc.render.resolution_y = 900, 1100
    sc.render.film_transparent = False
    next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND').inputs['Color'].default_value = (0.012, 0.01, 0.018, 1)
    ground.is_shadow_catcher = False   # on dark flagstone, not the catcher's grey
    gb = next(n for n in ground.active_material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); gcol = tuple(gb.inputs['Base Color'].default_value)
    gb.inputs['Base Color'].default_value = (0.035, 0.03, 0.028, 1)
    cy.samples = 64 if FAST else 384
    render(os.path.join(OUT, 'beauty.png'))
    sc.camera = cam; sc.render.resolution_x, sc.render.resolution_y = rx, ry; sc.render.film_transparent = True; ground.is_shadow_catcher = True; gb.inputs['Base Color'].default_value = gcol

# where the live effects go, in world px from the altar's tile centre (screen y down)
def scr(p): p = Vector(p); return [round(p.dot(RV) * PX, 1), round(-p.dot(UV) * PX, 1)]
def centre(o): vs = o.data.vertices; return sum((o.matrix_world @ v.co for v in vs), Vector()) / len(vs)
json.dump({'scale': S, 'size': [WPX, HPX], 'anchor': ANCHOR, 'frames': FRAMES, 'heart': scr((0, 0, HEART * K)), 'k': K,
           'tips': [scr(SPIN @ (t * K)) for t in HORN_TIPS], 'flames': [scr(centre(f)) for f in FLAMES],
           'eyes': [scr(centre(o)) for o in bpy.data.objects if o.name.startswith('AltarSkullEyes')]},
          open(os.path.join(OUT, 'frame.json'), 'w'))
if BLEND:
    show(True, True); state('ablaze')
    for o in COLL['Base'].objects: o.is_holdout = False
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
print('done')
