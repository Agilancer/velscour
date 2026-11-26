"""The ten City State Phobos / Castle Velscour dungeon packs: Bellmourn's seamless Phobos tiles laid over a painted
pack's walls, arches and floors (the "rig").

    python tools/phobostex.py [--tex <bm-phobos>/assets/game/phobos/tex] [ph_city,ph_keep,...]

Each rig sprite (Castle Keep, Catacombs or Sewers walls/arches) keeps its alpha and its shading: its luminance,
blurred within each iso face, multiplies the Phobos texture, plus a little of its fine detail so edges, chips and the
silhouette survive. The texture is projected per face: a wall running NE (screen slope -1/2) or SE (+1/2) is mapped
u = dx (from the wall node), v = dy -/+ dx/2 so courses run along the wall; the wall's top cap is mapped like a floor.
One tile edge holds a whole number of texture repeats, so the pattern carries on from node to node. Floors are the
textures mapped onto the 160x80 diamond, a whole number of repeats a tile (seamless bases), plus stained copies
(features, darkened inside the diamond only; none of rugs). Doors are copied from the rig unchanged; props come from the rig pack
(data/phobosbiomes.js `morePacks`), so each pack's scatter is empty.

Writes assets/tiles/<id>/{floors,walls,scatter}.webp + pack.json, the format tools/biomepack.py writes, so
core/assets.js loads them like any pack.
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILES = os.path.join(ROOT, 'assets', 'tiles')
TEX = os.path.normpath(os.path.join(ROOT, '..', 'bm-phobos', 'assets', 'game', 'phobos', 'tex'))
if not os.path.isdir(TEX):  # a worktree under velscour/.claude/worktrees/
  TEX = os.path.normpath(os.path.join(ROOT, '..', '..', '..', '..', 'bm-phobos', 'assets', 'game', 'phobos', 'tex'))
TILE_M = 2.6     # metres along one tile edge
WALL_H = 221     # rig wall height (px) above the front corner's ground; caps sit above v = 8 - WALL_H
CK, CAT, SEW = 'castle_keep', 'catacombs', 'sewers'

# id: walls [(rig pack, rig family, texture, cap texture)], arches/doors [(rig pack, design)], floors [texture],
# lum: target mean brightness of the walls (the Phobos tiles are graded dark, 0.10-0.36), tint (r,g,b) multiplier
PACKS = {
  'ph_city': dict(name='Phobos: King\'s Mile', walls=[(CK, 'royal_ashlar', 'market_wall', 'market_flags'), (CK, 'underkeep_brick', 'clay_brick', 'market_flags')],
                  arches=[(CK, 'keep_lancet'), (CK, 'great_hall_arch')], doors=[(CK, 'crimson_oak'), (CK, 'armory_door')],
                  floors=['setts', 'market_flags', 'boards'], lum=0.40),
  'ph_slums': dict(name='Phobos: Rookeries', walls=[(CK, 'underkeep_brick', 'poor_brick', 'gravel'), (CK, 'royal_ashlar', 'daub', 'gravel')],
                   arches=[(CAT, 'ironbound_segmental'), (CK, 'great_hall_arch')], doors=[(CAT, 'ironbound_oak'), (CK, 'armory_door')],
                   floors=['gravel', 'boards', 'grey_plaster'], lum=0.36),
  'ph_cinder': dict(name='Phobos: Cinder Quarter', walls=[(CK, 'royal_ashlar', 'burnt_wall', 'ash_ground'), (CK, 'underkeep_brick', 'soot_brick', 'ash_ground')],
                    arches=[(CK, 'great_hall_arch'), (CK, 'portcullis_arch')], doors=[(CK, 'blackiron_gate'), (CAT, 'ironbound_oak')],
                    floors=['ash_ground', 'char_timber', 'soot_plaster'], lum=0.27),
  'ph_bones': dict(name='Phobos: Bone Yards', walls=[(CAT, 'crypt_ashlar', 'bone_ashlar', 'bone_stone'), (CK, 'royal_ashlar', 'bone_stone', 'bone_stone'), (CAT, 'sealed_cells', 'ossuary_wall', 'grave_gravel')],
                   arches=[(CAT, 'roman_ossuary'), (CAT, 'pointed_funerary')], doors=[(CAT, 'bone_reliquary'), (CAT, 'iron_grille')],
                   floors=['grave_gravel', 'bone_stone', 'ossuary_wall'], lum=0.44),
  'ph_rich': dict(name='Phobos: Mages\' Rise', walls=[(CK, 'royal_ashlar', 'dressed', 'rich_flags'), (CK, 'underkeep_brick', 'rich_brick', 'rich_flags'), (CK, 'great_hall_paneling', 'panelling', 'dressed_b')],
                  arches=[(CK, 'keep_lancet'), (CK, 'great_hall_arch')], doors=[(CK, 'crimson_oak'), (CK, 'armory_door')],
                  floors=['rich_flags', 'gothic_rug', 'boards'], lum=0.38),
  'ph_wall': dict(name='Phobos: City Wall', walls=[(CK, 'royal_ashlar', 'basalt', 'wall_setts'), (CK, 'underkeep_brick', 'basalt_bone', 'wall_setts')],
                  arches=[(CK, 'portcullis_arch'), (CK, 'great_hall_arch')], doors=[(CK, 'blackiron_gate'), (CK, 'armory_door')],
                  floors=['wall_setts', 'plinth', 'iron'], lum=0.30),
  'ph_sewers': dict(name='Phobos: Undercroft', walls=[(SEW, 'plain_damp_ashlar', 'undercroft', 'sewer_floor'), (CK, 'underkeep_brick', 'sewer_brick', 'sewer_floor'), (CK, 'royal_ashlar', 'undercroft_b', 'slime')],
                    arches=[(SEW, 'brick_culvert_arch'), (SEW, 'iron_reinforced_arch')], doors=[(SEW, 'barred_maintenance_gate'), (SEW, 'rotted_oak_sewer_door')],
                    floors=['sewer_floor', 'wet_grit', 'slime'], lum=0.30),
  'ph_castle': dict(name='Castle Velscour: Wards', walls=[(CK, 'royal_ashlar', 'granite', 'flags'), (CK, 'underkeep_brick', 'granite_b', 'flags'), (CK, 'great_hall_paneling', 'panelling', 'flags')],
                    arches=[(CK, 'keep_lancet'), (CK, 'great_hall_arch'), (CK, 'portcullis_arch')], doors=[(CK, 'crimson_oak'), (CK, 'blackiron_gate'), (CK, 'armory_door')],
                    floors=['flags', 'wine_rug', 'castle_stone'], lum=0.36),
  'ph_keep': dict(name='Castle Velscour: the Keep', walls=[(CK, 'royal_ashlar', 'keep_wall', 'keep_smooth'), (CK, 'underkeep_brick', 'keep_wall_b', 'keep_smooth')],
                  arches=[(CK, 'great_hall_arch'), (CK, 'keep_lancet')], doors=[(CK, 'blackiron_gate'), (CK, 'crimson_oak')],
                  floors=['inlay', 'keep_smooth', 'plum_damask'], lum=0.30),
  'ph_marches': dict(name='Phobos: the Marches', walls=[(CK, 'royal_ashlar', 'march_wall', 'march_gravel'), (CK, 'underkeep_brick', 'march_wall_b', 'march_gravel')],
                     arches=[(CK, 'portcullis_arch'), (CK, 'keep_lancet')], doors=[(CK, 'crimson_oak'), (CAT, 'ironbound_oak')],
                     floors=['march_gravel', 'flags', 'castle_stone'], lum=0.42),
}

_manifest = None
def manifest():
  global _manifest
  if _manifest is None: _manifest = json.load(open(os.path.join(TEX, 'manifest.json')))['tiles']
  return _manifest

_rigs = {}
def rig(p):
  if p not in _rigs:
    _rigs[p] = (json.load(open(os.path.join(TILES, p, 'pack.json'))), np.asarray(Image.open(os.path.join(TILES, p, 'walls.webp')).convert('RGBA')).astype(np.float32) / 255)
  return _rigs[p]

def srgb2lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lin2srgb(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)

_tex = {}
def texture(name, w, h):
  """The tile's colour at w x h (linear light), one period."""
  k = (name, w, h)
  if k not in _tex:
    im = Image.open(os.path.join(TEX, name + '_c.webp')).convert('RGB').resize((max(2, w), max(2, h)), Image.LANCZOS)
    _tex[k] = srgb2lin(np.asarray(im).astype(np.float32) / 255)
  return _tex[k]

def sample(t, tx, ty):
  """Bilinear, wrapping sample of t (h, w, 3) at float texel coords."""
  h, w = t.shape[:2]
  tx = tx - 0.5; ty = ty - 0.5
  x0 = np.floor(tx).astype(int); y0 = np.floor(ty).astype(int); fx = (tx - x0)[..., None]; fy = (ty - y0)[..., None]
  x0 %= w; y0 %= h; x1 = (x0 + 1) % w; y1 = (y0 + 1) % h
  return (t[y0, x0] * (1 - fx) + t[y0, x1] * fx) * (1 - fy) + (t[y1, x0] * (1 - fx) + t[y1, x1] * fx) * fy

def wall_scale(name):
  """(px of dx per repeat, px of v per repeat, texel w, texel h) for a wall texture: whole repeats per tile edge."""
  m0, m1 = manifest()[name]['m']
  n = max(1, round(TILE_M / m0))
  pu = 80 / n                       # screen dx per repeat (a tile edge is 80 px across)
  tw = pu * 1.118                   # true length along the wall
  pv = tw * m1 / m0
  return pu, pv, max(8, round(tw * 1.5)), max(8, round(pv * 1.5))

def floor_reps(name):
  return max(1, round(TILE_M / manifest()[name]['m'][0]))

def iso_uv(x, y):
  """Screen offset (from a tile's top corner) -> tile coords."""
  return (x / 160 + y / 80), (y / 80 - x / 160)

def blur(a, r):
  """Separable gaussian (numpy, edge clamped)."""
  if r <= 0: return a
  k = np.exp(-0.5 * (np.arange(-3 * r, 3 * r + 1) / r) ** 2); k /= k.sum()
  pad = len(k) // 2
  for ax in (0, 1):
    p = np.pad(a, [(pad, pad) if i == ax else (0, 0) for i in range(a.ndim)], mode='edge')
    a = sum(k[i] * np.take(p, range(i, i + a.shape[ax]), axis=ax) for i in range(len(k)))
  return a

def lum(c): return c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722

def retexture(src, ox, oy, faces, tex, cap, gain, u0=0.0, detail=0.4, has_cap=True):
  """One rig sprite (h, w, 4 floats, sRGB) re-textured. faces(dx) -> +1 for a face along SE (slope +1/2: SW-facing),
  -1 along NE (slope -1/2: SE-facing). u0 shifts the pattern along the wall (arches anchor mid-tile)."""
  h, w = src.shape[:2]
  a = src[..., 3]
  L = lum(srgb2lin(src[..., :3]))
  jj, ii = np.mgrid[0:h, 0:w].astype(np.float32)
  dx = ii + 0.5 + ox; dy = jj + 0.5 + oy
  s = faces(dx)                                   # +1 / -1 per pixel
  v = dy - 0.5 * s * dx                           # height coordinate along the face (ground at the front corner = 8)
  pu, pv, tw, th = wall_scale(tex)
  T = texture(tex, tw, th)
  col = sample(T, ((dx + u0) % pu) / pu * tw, (v % pv) / pv * th)
  region = np.where(s > 0, 1, 2)
  if has_cap:
    capm = v < 8 - WALL_H - 0.5
    if capm.any():
      fu, fv = iso_uv(dx, dy + WALL_H)
      r = floor_reps(cap); C = texture(cap, 96, 96)
      col[capm] = sample(C, (fu[capm] * r % 1) * 96, (fv[capm] * r % 1) * 96) * 1.15
      region = np.where(capm, 3, region)
  # shading: the rig's luminance blurred within each face (normalised convolution), and a little of its fine detail
  shade = np.zeros_like(L)
  for f in (1, 2, 3):
    m = ((region == f) & (a > 0.05)).astype(np.float32) * a
    if not m.any(): continue
    num = blur(L * m, 2.5); den = blur(m, 2.5)
    shade = np.where(region == f, num / np.maximum(den, 1e-4), shade)
  fine = np.clip(L / np.maximum(shade, 1e-4), 0.25, 2.0) ** detail
  out = col * (shade * gain)[..., None] * fine[..., None]
  # crisp box edges: darken the face crease and the cap's rim a touch
  crease = (np.abs(dx) < 1.0) & (region != 3)
  out[crease] *= 0.7
  if has_cap:
    rim = (np.abs(v - (8 - WALL_H)) < 1.0)
    out[rim] *= 1.25
  rgb = lin2srgb(out)
  return np.dstack([rgb, a])

def rig_mean(img, rects):
  """Mean linear luminance of a rig's slices (alpha weighted)."""
  n = d = 0.0
  for r in rects:
    x, y, w, h = r[1:5]; c = img[y:y + h, x:x + w]
    n += float((lum(srgb2lin(c[..., :3])) * c[..., 3]).sum()); d += float(c[..., 3].sum())
  return n / max(1e-6, d)

def face_fn(arm):
  if arm in ('NE', 'NW', 'c'): return lambda dx: np.where(dx < 0, 1, -1)
  if arm == 'SE': return lambda dx: np.ones_like(dx)
  return lambda dx: -np.ones_like(dx)  # SW

def floor_tile(name, rng=None, stain=None):
  """A 160x80 diamond of the texture (linear) and its alpha."""
  r = floor_reps(name); T = texture(name, 128, 128)
  jj, ii = np.mgrid[0:80, 0:160].astype(np.float32)
  u, v = iso_uv(ii + 0.5 - 80, jj + 0.5)
  col = sample(T, (u * r % 1) * 128, (v * r % 1) * 128)
  mu = float(lum(T).mean()); col = mu * (np.maximum(col, 1e-5) / mu) ** 1.3  # a touch more contrast: floors read flat at game scale
  sat = 0.55 if manifest()[name]['cls'] == 'cloth' else 0.8  # a whole room of rug or slime is loud at full colour
  g = lum(col)[..., None]; col = g + (col - g) * sat
  d = np.abs(ii + 0.5 - 80) / 80 + np.abs(jj + 0.5 - 40) / 40
  alpha = np.clip((1 + 2.5 / 40 - d) * 40, 0, 1)
  if stain is not None:
    # grime inside the diamond only, so the feature tile's rim still meets the base around it
    n = blur(rng.random((80, 160)).astype(np.float32), 6); n = (n - n.min()) / max(1e-6, n.max() - n.min())
    inner = np.clip((0.82 - d) / 0.3, 0, 1)
    m = np.clip((n - 0.45) * 3, 0, 1) * inner
    col = col * (1 - m[..., None] * stain[3]) + np.array(stain[:3], np.float32) * (m[..., None] * stain[3] * 0.15)
  return col, alpha

STAINS = [(0.05, 0.04, 0.03, 0.45), (0.1, 0.06, 0.03, 0.35), (0.02, 0.05, 0.02, 0.4), (0.03, 0.03, 0.03, 0.3)]

def pack_rects(items, width=2048):
  """Shelf-pack [(key, w, h)] -> {key: (x, y)}, total height."""
  pos, x, y, row = {}, 0, 0, 0
  for k, w, h in sorted(items, key=lambda t: -t[2]):
    if x + w > width: x, y, row = 0, y + row + 2, 0
    pos[k] = (x, y); x += w + 2; row = max(row, h)
  return pos, y + row

def build(pid, cfg):
  out_dir = os.path.join(TILES, pid); os.makedirs(out_dir, exist_ok=True)
  rng = np.random.default_rng(sum(map(ord, pid)))
  sprites = {}    # key -> rgba float (sRGB)
  meta_walls, meta_arches, meta_doors, spans = {}, {}, {}, {}
  def lum_of(rgba):
    a = rgba[..., 3]; return float((lum(srgb2lin(rgba[..., :3])) * a).sum() / max(1e-6, a.sum()))
  for rp, fam, tex, cap in cfg['walls']:
    meta, img = rig(rp)
    masks = meta['walls'][fam]
    # gain: the textured family's mean brightness to cfg lum (linear), measured on the rig's own mean
    tmean = float(lum(texture(tex, 64, 64)).mean())
    ref = rig_mean(img, [r for vv in masks.values() for var in vv for r in var])
    gain = srgb2lin(np.float32(cfg['lum'])) / max(1e-4, tmean) / ref
    name = tex if tex not in meta_walls else tex + '_2'
    meta_walls[name] = {}
    for mask, variants in masks.items():
      vv = []
      for var in variants:
        sl = []
        for arm, x, y, w, h, ox, oy in var:
          k = ('w', rp, fam, tex, x, y, w, h, arm)
          if k not in sprites:
            sprites[k] = retexture(img[y:y + h, x:x + w], ox, oy, face_fn(arm), tex, cap, gain)
          sl.append([arm, k, w, h, ox, oy])
        vv.append(sl)
      meta_walls[name][mask] = vv
  main_tex, main_cap = cfg['walls'][0][2], cfg['walls'][0][3]
  for rp, des in cfg['arches']:
    meta, img = rig(rp)
    tmean = float(lum(texture(main_tex, 64, 64)).mean())
    ref = rig_mean(img, [r for sls in meta['arches'][des].values() for r in sls])
    gain = srgb2lin(np.float32(cfg['lum'])) / max(1e-4, tmean) / ref
    meta_arches[des] = {}
    spans[des] = (meta.get('archSpan') or {}).get(des, 3)
    for d, sls in meta['arches'][des].items():
      sgn = 1 if d in ('SE', 'NW') else -1
      lst = []
      for a_, x, y, w, h, ox, oy in sls:
        k = ('a', rp, des, d, x, y)
        if k not in sprites:
          sprites[k] = retexture(img[y:y + h, x:x + w], ox, oy, lambda dx, s=sgn: np.full_like(dx, s), main_tex, main_cap, gain, u0=40.0 * spans[des], detail=0.55, has_cap=False)
        lst.append([a_, k, w, h, ox, oy])
      meta_arches[des][d] = lst
  for rp, des in cfg['doors']:
    meta, img = rig(rp)
    meta_doors[des] = {}
    for d, states in meta['doors'][des].items():
      meta_doors[des][d] = {}
      for st, sls in states.items():
        lst = []
        for part, x, y, w, h, ox, oy in sls:
          k = ('d', rp, x, y, w, h)
          if k not in sprites: sprites[k] = img[y:y + h, x:x + w].copy()
          lst.append([part, k, w, h, ox, oy])
        meta_doors[des][d][st] = lst
  # atlas
  keys = list(sprites)
  pos, H = pack_rects([(k, sprites[k].shape[1], sprites[k].shape[0]) for k in keys])
  atlas = np.zeros((H, 2048, 4), np.float32)
  for k in keys:
    x, y = pos[k]; s = sprites[k]; atlas[y:y + s.shape[0], x:x + s.shape[1]] = s
  Image.fromarray((np.clip(atlas, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(out_dir, 'walls.webp'), quality=90, alpha_quality=100, method=6)
  R = lambda r: [r[0], pos[r[1]][0], pos[r[1]][1], *r[2:]]
  walls = {f: {m: [[R(r) for r in var] for var in vv] for m, vv in masks.items()} for f, masks in meta_walls.items()}
  arches = {d: {k: [R(r) for r in sl] for k, sl in dirs.items()} for d, dirs in meta_arches.items()}
  doors = {d: {k: {st: [R(r) for r in sl] for st, sl in sts.items()} for k, sts in dirs.items()} for d, dirs in meta_doors.items()}
  # floors: each texture a seamless base, then four stained features of each
  cells = []
  for t in cfg['floors']:
    cells.append((t, None))
    if manifest()[t]['cls'] != 'cloth':  # a stained rug square would be strewn over stone rooms of like brightness
      for s in STAINS: cells.append((t, s))
  cols = 10
  fimg = np.zeros((((len(cells) + cols - 1) // cols) * 82, cols * 162, 4), np.float32)
  floors = []
  fgain = {t: srgb2lin(np.float32(cfg['lum'] * 0.92)) / max(1e-4, float(lum(texture(t, 64, 64)).mean())) for t in cfg['floors']}
  for i, (t, s) in enumerate(cells):
    col, al = floor_tile(t, rng, s)
    col = col * fgain[t]
    rgb = lin2srgb(col)
    x, y = (i % cols) * 162, (i // cols) * 82
    fimg[y:y + 80, x:x + 160] = np.dstack([rgb, al])
    m = al > 0.5
    floors.append({'name': t if s is None else '%s_stain%d' % (t, STAINS.index(s) + 1), 'x': x, 'y': y, 'w': 160, 'h': 80,
                   'seamless': s is None, 'lum': round(float(lum(rgb)[m].mean()), 3)})
  Image.fromarray((np.clip(fimg, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(out_dir, 'floors.webp'), quality=90, alpha_quality=100, method=6)
  Image.new('RGBA', (2, 2), (0, 0, 0, 0)).save(os.path.join(out_dir, 'scatter.webp'), lossless=True)
  pack = {'pack': cfg['name'], 'tile': [160, 80], 'zscale': rig(CK)[0]['zscale'], 'floors': floors, 'walls': walls,
          'arches': arches, 'archSpan': spans, 'doors': doors, 'scatter': [], 'phobos': {'tex': sorted({w[2] for w in cfg['walls']} | {w[3] for w in cfg['walls']} | set(cfg['floors']))}}
  with open(os.path.join(out_dir, 'pack.json'), 'w') as f: json.dump(pack, f, separators=(',', ':'))
  size = sum(os.path.getsize(os.path.join(out_dir, n)) for n in os.listdir(out_dir))
  print('%-11s walls %dx%d, %d sprites, %d floors, %.2f MB' % (pid, 2048, H, len(keys), len(floors), size / 1e6))
  return size

if __name__ == '__main__':
  args = sys.argv[1:]
  if '--tex' in args: i = args.index('--tex'); TEX = args[i + 1]; del args[i:i + 2]
  ids = args[0].split(',') if args else list(PACKS)
  total = sum(build(i, PACKS[i]) for i in ids)
  print('total %.2f MB' % (total / 1e6))
