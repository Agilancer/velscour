"""Phobos textures (docs/PHOBOS.md): Bellmourn's own Phobos texture set (bm repo, assets/phobos/textures, after
docs/PHOBOS-TEXTURES.md) projected for VELSCOUR's 2:1 iso grid.

  python tools/phobostex.py <bm repo>          # writes assets/tiles/phobos/phobos.webp + phobos.json

Floors: each texture spans 2 x 2 tiles, cut into four quarter diamonds (160 x 80, the town pack's tile) that join
seamlessly; the game picks the quarter by tile parity (world/phobos.js, game/phobos.js). Props: bookcases and jar
shelves as iso boxes, their fronts the book-spine and jar-shelf textures, sides and tops oak; drawn from the ground
pivot like the town pack's scatter (ox, oy), the front facing +y (mirror for +x).
Toned to the game: a little darker and less saturated than the source, which was lit for a 3D renderer."""
import json, os, sys
import numpy as np
from PIL import Image

T = 'assets/phobos/textures/ph2_'
FLOORS = {   # name: source (2 x 2 tiles each)
    'rutted_setts': '01_12_rutted_setts', 'slum_cobbles': '01_13_slum_cobbles', 'ash_street': '01_14_ash_street', 'wharf_deck': '01_15_wharf_deck',
    'bone_joint_flags': '01_11_bone_joint_flags', 'ward_paving': '04_06_ward_paving', 'walk_paving': '04_07_walk_paving', 'dead_grass': '04_12_dead_grass',
    'ash_clay_ground': '04_11_ash_clay_ground', 'scree': '04_10_scree', 'oxblood_marble': '03_11_oxblood_marble', 'bone_checker': '03_12_bone_checker',
    'worn_floorboards': '03_15_worn_floorboards', 'mausoleum_marble': '04_19_mausoleum_marble', 'obsidian': '04_17_obsidian', 'bloodstone': '04_16_bloodstone',
    'bridge_ashlar': '04_13_bridge_ashlar', 'keep_basalt': '04_02_keep_basalt',
}
PROPS = {'bookcase': ('03_17_book_spines', 180), 'jar_shelf': ('03_18_jar_shelves', 150)}
TONE = 0.74   # brightness
BRIGHT = {'rutted_setts': 1.2, 'slum_cobbles': 1.15, 'ash_street': 1.05, 'walk_paving': 1.25, 'ward_paving': 1.2, 'wharf_deck': 1.0, 'bone_joint_flags': 1.0, 'bridge_ashlar': 1.0}   # the streets: they read under the night light, lighter than the roofs
SAT = 0.78    # saturation kept


def tex(bm, src, size, tone=TONE):
    im = Image.open(os.path.join(bm, T + src + '.png')).convert('RGB').resize((size, size), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    g = a.mean(axis=2, keepdims=True)
    return np.clip((g + (a - g) * SAT) * tone, 0, 1)


def sample(t, u, v):
    """Bilinear, wrapping (the textures tile)."""
    h, w = t.shape[:2]
    x, y = (u * w) % w, (v * h) % h
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    x1, y1 = (x0 + 1) % w, (y0 + 1) % h
    return (t[y0, x0] * (1 - fx) * (1 - fy) + t[y0, x1] * fx * (1 - fy) + t[y1, x0] * (1 - fx) * fy + t[y1, x1] * fx * fy)


def diamond(t, qx, qy, W=160, H=80, ss=3):
    X, Y = np.meshgrid((np.arange(W * ss) + 0.5) / ss, (np.arange(H * ss) + 0.5) / ss)
    xr = X - W / 2
    u, v = (xr / (W / 2) + Y / (H / 2)) / 2, (Y / (H / 2) - xr / (W / 2)) / 2   # 0..1 across the tile, along map x and y
    inside = (np.abs(xr) / (W / 2) + np.abs(Y - H / 2) / (H / 2)) <= 1.015
    rgb = sample(t, (qx + u) / 2, (qy + v) / 2)
    img = np.concatenate([rgb, inside[..., None].astype(np.float32)], axis=2)
    return Image.fromarray((img * 255).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS)


def box(front, wood, hz, ss=3):
    """An iso box 1 tile long (map x), 0.4 deep (map y), hz native px tall; pivot on the tile centre at the floor."""
    S, D = 80, 40                          # native px per map unit: screen x = (x - y) * 80, y = (x + y) * 40 - z
    W, H, ox, oy = 112, int(28 + hz + 30), -56, -int(hz + 30)
    X, Y = np.meshgrid((np.arange(W * ss) + 0.5) / ss + ox, (np.arange(H * ss) + 0.5) / ss + oy)
    out = np.zeros((H * ss, W * ss, 4), np.float32)
    def face(mask, rgb, shade):
        out[mask, :3] = rgb[mask] * shade; out[mask, 3] = 1
    # front (y = +0.2): x from -0.5..0.5, z 0..hz
    x = (X + 0.2 * S) / S              # from screen x = (x - 0.2) * 80
    z = (x + 0.2) * D - Y              # from screen y = (x + 0.2) * 40 - z
    m = (x >= -0.5) & (x <= 0.5) & (z >= 0) & (z <= hz)
    u, t = x + 0.5, 1 - z / hz
    rgb = sample(front, u, t * hz / 160)                    # the texture keeps its aspect: one tile wide, repeating up
    edge = (u < 0.035) | (u > 0.965) | (t < 0.03) | (t > 0.975)
    rgb = np.where(edge[..., None], sample(wood, u * 3, t * 3) * 0.55, rgb)
    face(m, rgb, 0.92)
    # side (x = +0.5): y from -0.2..0.2
    y = 0.5 - X / S
    z2 = (0.5 + y) * D - Y
    m2 = (y >= -0.2) & (y <= 0.2) & (z2 >= 0) & (z2 <= hz)
    face(m2 & ~m, sample(wood, (y + 0.2) * 2, z2 / 120), 0.58)
    # top (z = hz): solve x, y from screen
    a, b = X / S, (Y + hz) / D         # a = x - y, b = x + y
    xt, yt = (a + b) / 2, (b - a) / 2
    m3 = (xt >= -0.5) & (xt <= 0.5) & (yt >= -0.2) & (yt <= 0.2)
    face(m3, sample(wood, xt + 0.5, yt * 2), 1.0)
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS)
    return img, ox, oy


def main():
    bm = sys.argv[1] if len(sys.argv) > 1 else '../bm-phobos'
    tiles = [(f'{n}', q, diamond(tex(bm, s, 512, BRIGHT.get(n, TONE)), q % 2, q // 2)) for n, s in FLOORS.items() for q in range(4)]
    wood = tex(bm, '02_08_oak_planks', 256)
    props = {n: box(tex(bm, s, 512), wood, hz) for n, (s, hz) in PROPS.items()}
    cols = 8
    rows = (len(tiles) + cols - 1) // cols
    pw = sum(p[0].width for p in props.values())
    ph = max(p[0].height for p in props.values())
    atlas = Image.new('RGBA', (max(cols * 160, pw), rows * 80 + ph), (0, 0, 0, 0))
    meta = {'tile': [160, 80], 'floors': {}, 'props': {}}
    for k, (n, q, im) in enumerate(tiles):
        x, y = (k % cols) * 160, (k // cols) * 80
        atlas.paste(im, (x, y)); meta['floors'].setdefault(n, [None] * 4)[q] = [x, y]
    x = 0
    for n, (im, ox, oy) in props.items():
        atlas.paste(im, (x, rows * 80)); meta['props'][n] = [x, rows * 80, im.width, im.height, ox, oy]; x += im.width
    os.makedirs('assets/tiles/phobos', exist_ok=True)
    atlas.save('assets/tiles/phobos/phobos.webp', 'WEBP', quality=92, method=6)
    json.dump(meta, open('assets/tiles/phobos/phobos.json', 'w'), separators=(',', ':'))
    print('phobos.webp', atlas.size, len(tiles), 'floor quarters,', len(props), 'props')


if __name__ == '__main__':
    main()
