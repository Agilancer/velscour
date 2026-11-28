"""The Dragon Knight's dragons (src/gfx/dragons3d.js): bm's rigged dragons (assets/monsters/tripo/dragon_*.glb in the
Agilancer/bm repo) brought through Blender: decimated for a small on-screen creature, only the clips the game plays, a
'mouth' bone at the snout for the breath, and a repainted hide. The scans are dark and dull, so each texture is
re-toned in numpy: the mesh's regions (wing membrane, underside, back, head; from bone weights and normals, rasterised
into UV space) each get their own three-stop colour ramp over the scan's luminance, and a glow map is made from the
hide's crevices (molten chest and throat, veined wings, maw) plus the eyes.

    python tools/blender/dragons.py [bm repo] [tris] [only: elder,wyvern,frost]
Writes assets/models/beasts/dragon.glb (the red dragon: Elder Red Drake, the Dragonheart spectre), dragon_whelp.webp
(its ember hide for the Drake Whelp), dragon_wyvern.glb (the green dragon in bronze) and dragon_frost.glb (the undead
dragon in ice)."""
import bpy, sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bkit
from mathutils import Vector

BM = sys.argv[1] if len(sys.argv) > 1 else '/home/user/agilancer/bm'
TRIS = int(sys.argv[2]) if len(sys.argv) > 2 else 11000
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
SIZE = 1024
FLY = ['fly', 'fly_hover', 'fly_glide', 'hover_breath_hold', 'hit_air', 'death_air']
h = lambda s: np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
R = lambda *c: [h(x) for x in c]  # a ramp: shadow, mid, light

# name: source mesh, clips, ramps per region (body, back, under, wing, head), glow colours (deep, hot), glow gains per region
LOOKS = {
    'elder': dict(src='dragon_red', out='dragon', clips=FLY + ['hover_breath_in', 'hover_breath_out', 'roar'], gamma=1.0,
                  body=R('#16020a', '#7a0c0c', '#e8482a'), back=R('#040102', '#1c0507', '#5a1410'), under=R('#6a1c04', '#f08a1c', '#fff0a0'),
                  wing=R('#3a0508', '#d82c14', '#ff9a4a'), head=R('#3a0808', '#d04424', '#ffe6b8'), keep=0.15,
                  glow=('#ff3806', '#ffe070'), g=dict(under=1.5, wing=0.55, head=0.5, body=0.12), eye='#fff27a',
                  skins=dict(whelp=dict(gamma=0.8, body=R('#5a1404', '#e8600c', '#ffc050'), back=R('#1c0502', '#7a1806', '#d8501a'), under=R('#b05a0c', '#ffd24a', '#fffad0'),
                                        wing=R('#3a0604', '#b02808', '#ff7a28'), head=R('#7a2404', '#ffa030', '#fff4b0'), keep=0.05))),
    'wyvern': dict(src='dragon_green', out='dragon_wyvern', clips=FLY, gamma=0.9,
                   body=R('#1c0c04', '#8a4a14', '#e8b060'), back=R('#0c0502', '#3c1a08', '#8a5020'), under=R('#6a4a20', '#f0d090', '#fffbe0'),
                   wing=R('#5a1402', '#ff7a14', '#ffd060'), head=R('#4a2408', '#e0a040', '#fff2c0'), keep=0.08,
                   glow=('#ff5a08', '#fff0a0'), g=dict(under=0.5, wing=0.5, head=0.6, body=0.05), eye='#d8ff60'),
    'frost': dict(src='dragon_undead', out='dragon_frost', clips=FLY, gamma=0.8,
                  body=R('#06122c', '#2a6ab0', '#c8ecff'), back=R('#040c20', '#184a8c', '#8ac8f0'), under=R('#1c4a7a', '#a0e0ff', '#ffffff'),
                  wing=R('#0c3a6a', '#6ac4f4', '#e8fcff'), head=R('#1c3a6a', '#a8d8f8', '#ffffff'), keep=0.05,
                  glow=('#0a70ff', '#b0ffff'), g=dict(under=1.3, wing=0.7, head=0.7, body=0.25), eye='#a0ffff'),
}


def blur(a, r):
    """Box blur, three passes (near a gaussian of sigma ~r)."""
    for _ in range(3):
        for ax in (0, 1):
            c = np.cumsum(np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(a.ndim)], mode='wrap'), axis=ax, dtype=np.float64)
            a = ((np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)).astype(np.float32)
    return a


def ramp(st, t):
    t = np.clip(t, 0, 1)[..., None]
    return np.where(t < 0.5, st[0] + (st[1] - st[0]) * (t * 2), st[1] + (st[2] - st[1]) * (t * 2 - 1))


def regions(arm, me):
    """Per-vertex masks from bone weights and rest normals: wing, under (belly, throat, tail's underside), back, head, jaw, and the snout tip."""
    names = [g.name for g in me.vertex_groups]
    n = len(me.data.vertices)
    W = {k: np.zeros(n, np.float32) for k in ('wing', 'trunk', 'head', 'jaw', 'limb')}
    def kind(b):
        if b.startswith('wf') or b.startswith('wthumb') or b.startswith('whand'): return 'wing'
        if b in ('head',): return 'head'
        if b == 'jaw': return 'jaw'
        if b.startswith(('neck', 'chest', 'spine', 'hips', 'tail', 'root')): return 'trunk'
        return 'limb'
    for v in me.data.vertices:
        for g in v.groups: W[kind(names[g.group])][v.index] += g.weight
    mw = me.matrix_world
    nrm = np.array([(mw.to_3x3() @ v.normal).normalized()[:] for v in me.data.vertices], np.float32)
    pos = np.array([(mw @ v.co)[:] for v in me.data.vertices], np.float32)
    sm = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
    trunk = W['trunk'] + 0.6 * W['limb']
    M = dict(wing=W['wing'], head=W['head'] + W['jaw'], jaw=W['jaw'] * sm(0.0, 0.5, nrm[:, 2]),
             under=W['trunk'] * sm(0.1, 0.6, -nrm[:, 2]), back=trunk * sm(0.2, 0.7, nrm[:, 2]))
    hv = np.where(W['head'] + W['jaw'] > 0.6)[0]
    return M, pos, hv


def raster(me, M):
    """Rasterise per-vertex masks into UV space (Blender rows: bottom up) -> {name: SIZE x SIZE}, and the texels covered."""
    uv = me.data.uv_layers.active.data
    out = {k: np.zeros((SIZE, SIZE), np.float32) for k in M}
    cov = np.zeros((SIZE, SIZE), bool)
    me.data.calc_loop_triangles()
    for t in me.data.loop_triangles:
        p = np.array([uv[l].uv[:] for l in t.loops], np.float32) * SIZE - 0.5
        x0, y0 = np.floor(p.min(0)).astype(int) - 1; x1, y1 = np.ceil(p.max(0)).astype(int) + 1
        if x1 - x0 > 600 or y1 - y0 > 600: continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (p[1, 1] - p[2, 1]) * (p[0, 0] - p[2, 0]) + (p[2, 0] - p[1, 0]) * (p[0, 1] - p[2, 1])
        if abs(d) < 1e-9: continue
        a = ((p[1, 1] - p[2, 1]) * (xs - p[2, 0]) + (p[2, 0] - p[1, 0]) * (ys - p[2, 1])) / d
        b = ((p[2, 1] - p[0, 1]) * (xs - p[2, 0]) + (p[0, 0] - p[2, 0]) * (ys - p[2, 1])) / d
        c = 1 - a - b
        e = -1.2 / max(1.0, math.sqrt(abs(d)))  # a texel's bleed past the edge
        ok = (a >= e) & (b >= e) & (c >= e)
        if not ok.any(): continue
        yy, xx = ys[ok] % SIZE, xs[ok] % SIZE
        cov[yy, xx] = True
        v = t.vertices
        for k in M: out[k][yy, xx] = np.clip(a[ok] * M[k][v[0]] + b[ok] * M[k][v[1]] + c[ok] * M[k][v[2]], 0, 1)
    return out, cov


def pixels(img):
    a = np.empty(img.size[0] * img.size[1] * 4, np.float32); img.pixels.foreach_get(a)
    a = a.reshape(img.size[1], img.size[0], 4)
    a[..., :3] = np.where(a[..., :3] <= 0.0031308, a[..., :3] * 12.92, 1.055 * np.clip(a[..., :3], 0, 1) ** (1 / 2.4) - 0.055)  # Blender holds pixels linear
    return a


def repaint(src, U, cov, L):
    """The scan's colour (sRGB 0..1, rows bottom up) re-toned by region."""
    lum = src[..., :3] @ np.array([0.3, 0.55, 0.15], np.float32)
    lo, hi = np.percentile(lum[cov], [1.5, 99])
    t = np.clip((lum - lo) / (hi - lo), 0, 1) ** L['gamma']
    # the scan's scale noise is halved (it turns to static at game size); each region keeps near its own value
    t = 0.62 * blur(t, 5) + 0.38 * t
    t = np.clip(0.5 + (t - 0.5) * 0.9, 0, 1)
    col = ramp(L['body'], t)
    for k in ('back', 'under', 'head', 'wing'):
        m = np.clip(U[k] * 1.25, 0, 1)[..., None] * (0.9 if k == 'back' else 1)
        col = col * (1 - m) + ramp(L[k], t) * m
    # some of the painted hue variety back
    s = src[..., :3]; chroma = s - lum[..., None]
    col = np.clip(col + chroma * L['keep'] * 2.2, 0, 1)
    return col, t


def glowmap(t, U, cov, L, eyes):
    """Light from within: the dark crevices between the scales glow where the region says so, hotter in the deeper cracks."""
    crev = np.clip((blur(t, 7) - t) * 5.5 + 0.12, 0, 1)
    g = L['g']
    amt = crev * (U['under'] * g['under'] + U['wing'] * g['wing'] + np.clip(U['head'] - U['jaw'], 0, 1) * g['head'] * 0.5 + g['body'])
    amt += U['jaw'] * g['head'] * (0.55 + crev)          # the maw
    amt += U['under'] * g['under'] * 0.16                 # the chest's own heat under the cracks
    amt = np.clip(amt, 0, 1.4) * cov
    deep, hot = h(L['glow'][0]), h(L['glow'][1])
    k = np.clip(amt, 0, 1)[..., None]
    out = (deep + (hot - deep) * np.clip(k * 1.5 - 0.5, 0, 1)) * np.clip(k * 1.6, 0, 1)
    out = out + eyes[..., None] * h(L['eye'])
    return np.clip(out, 0, 1)


def eye_mask(me, arm, U, src, cov):
    """The eyes: the scan paints them as small bright saturated spots on the head; find the best two blobs there."""
    s = src[..., :3]; mx, mn = s.max(-1), s.min(-1)
    score = (mx - mn) * mx * (U['head'] > 0.7) * cov
    bl = blur(score, 3)
    out = np.zeros_like(bl)
    for _ in range(2):
        y, x = np.unravel_index(np.argmax(bl), bl.shape)
        if bl[y, x] <= 0: break
        yy, xx = np.ogrid[:SIZE, :SIZE]
        d = np.hypot(yy - y, xx - x)
        out = np.maximum(out, np.clip(1.7 - d / 9, 0, 1)); bl = bl * (d > 40)
    return out


def set_image(img, rgb):
    rgb = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    a = np.concatenate([rgb.astype(np.float32), np.ones(rgb.shape[:2] + (1,), np.float32)], -1)
    img.pixels.foreach_set(a.ravel()); img.update()
    if not img.packed_file: img.pack()


def dilate(rgb, cov, n=6):
    """Bleed the painted texels over the UV gutters (mip levels pull the gutter in)."""
    rgb = rgb.copy(); c = cov.copy()
    for _ in range(n):
        acc = np.zeros_like(rgb); cnt = np.zeros(c.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            acc += np.roll(rgb * c[..., None], (dy, dx), (0, 1)); cnt += np.roll(c, (dy, dx), (0, 1))
        new = (~c) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]; c |= new
    return rgb


def build(name, L):
    bkit.reset()
    arm, meshes = bkit.import_glb(os.path.join(BM, 'assets/monsters/tripo', L['src'] + '.glb'))
    me = meshes[0]
    bkit.keep_actions(L['clips'])
    bkit.decimate(me, TRIS)
    for im in bpy.data.images: bkit.resize_image(im, SIZE)
    mat = me.data.materials[0]; nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    base = bsdf.inputs['Base Color'].links[0].from_node.image
    # the roughness/metal scan goes: a matte hide lit by the game's own lights
    for inp in ('Metallic', 'Roughness'):
        for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0; bsdf.inputs['Roughness'].default_value = 0.58
    M, pos, hv = regions(arm, me)
    U, cov = raster(me, M)
    for k in U: U[k] = blur(U[k], 2)
    src = pixels(base).copy()
    eyes = eye_mask(me, arm, U, src, cov)
    col, t = repaint(src, U, cov, L)
    em = glowmap(t, U, cov, L, eyes)
    col = np.clip(col + eyes[..., None] * h(L['eye']), 0, 1)
    set_image(base, dilate(col, cov))
    eimg = bpy.data.images.new(L['out'] + '_glow', SIZE, SIZE, alpha=False)
    set_image(eimg, dilate(em, cov))
    en = nt.nodes.new('ShaderNodeTexImage'); en.image = eimg
    nt.links.new(en.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = 1
    for sk, S in (L.get('skins') or {}).items():
        from PIL import Image
        c2, _ = repaint(src, U, cov, {**L, **S})
        c2 = np.clip(c2 + eyes[..., None] * h(L['eye']), 0, 1)
        Image.fromarray((dilate(c2, cov)[::-1] * 255).astype(np.uint8)).save(os.path.join(bkit.OUT, f"{L['out']}_{sk}.webp"), quality=90, method=6)
    # a 'mouth' bone at the snout tip (the breath comes from here)
    tip = pos[hv][np.argmin(pos[hv][:, 1])]
    hb = arm.data.bones['head']
    mouth = Vector((0, float(tip[1]) * 0.98, float(tip[2]) - 0.012))
    bkit.active(arm); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones.new('mouth'); inv = arm.matrix_world.inverted()
    eb.head = inv @ mouth; eb.tail = inv @ (mouth + Vector((0, -0.04, 0))); eb.parent = arm.data.edit_bones['head']; eb.use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    print(name, 'mouth', mouth[:], 'head', (arm.matrix_world @ hb.head_local)[:])
    for im in list(bpy.data.images):
        if im.users == 0: bpy.data.images.remove(im)
    bkit.export_glb(L['out'], step=2)


for name, L in LOOKS.items():
    if not ONLY or name in ONLY: build(name, L)
