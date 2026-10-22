"""
Build docs/art_kits/placeholder_art/: paint templates for every in-game art object that is still drawn by code
(Python-baked textures and Canvas-drawn sprites), so ChatGPT can paint real replacements. See its README.md.

    python tools/placeholder_art_kit.py      # templates/*.png + guides/*.png + ChatGPT_Placeholder_Art_Kit.zip

Templates are 1536 x 1024 (ChatGPT's landscape size) on flat magenta, one fixed grid per sheet: cyan dashed box = the
art's bounding box at paint scale, yellow line = ground (feet) line, yellow dot = pivot/anchor, labels above each cell.
Texture templates are the image size to deliver, grey with faint guides. Needs: pip install pillow
"""
import io, os, zipfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'art_kits', 'placeholder_art')
W, H = 1536, 1024
MAG, CY, YEL, INK, DIM = (255, 0, 255, 255), (0, 229, 255, 255), (255, 210, 122, 255), (255, 255, 255, 255), (200, 200, 200, 255)


def font(size):
    for f in ('DejaVuSansMono-Bold.ttf', 'consolab.ttf', 'LiberationMono-Bold.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def label(d, x, y, text, size=15, col=INK):
    d.text((x, y), text, font=font(size), fill=col, stroke_width=3, stroke_fill=(0, 0, 0, 255))


def dashed(d, pts, col=CY, dash=(7, 5), w=2):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1); on, off = dash; t = 0
        while t < n:
            e = min(n, t + on)
            d.line((x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n, x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n), fill=col, width=w)
            t += on + off


def box(d, x0, y0, x1, y1, col=CY):
    dashed(d, [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], col)


def dot(d, x, y, col=YEL, r=4):
    d.ellipse((x - r, y - r, x + r, y + r), outline=col, width=2)
    d.line((x - r - 4, y, x + r + 4, y), fill=col, width=1); d.line((x, y - r - 4, x, y + r + 4), fill=col, width=1)


# ------------------------------------------------------------------ sprite sheets
# Each sheet: id, title, scale (template px per world px), cols, rows, cells.
# A cell: (id, label, world w, world h, mode, note). mode: 'ground' (feet on a yellow line at the box's bottom, centred),
# 'pivot' (free-floating, pivot dot at the box centre), 'diamond' (an isometric floor tile filling the box),
# 'tl' (pivot dot at a corner given in note as 'pivot=x,y' in world px from the box's top-left).
SHEETS = [
    ('01_castle_floor_tiles', 'Castle: carpet runner + drawbridge floor tiles (isometric 2:1 diamonds)', 4, 2, 2, [
        ('castle_carpet_field', 'carpet runner, plain field', 160, 80, 'diamond', 'aisle runs top-right -> bottom-left'),
        ('castle_carpet_trim_a', 'carpet, gold trim on the TOP-LEFT edge', 160, 80, 'diamond', 'trim along the top-left edge only'),
        ('castle_carpet_trim_b', 'carpet, gold trim on the BOTTOM-RIGHT edge', 160, 80, 'diamond', 'trim along the bottom-right edge only'),
        ('castle_drawbridge', 'drawbridge oak planks + 2 iron straps', 160, 80, 'diamond', 'boards run top-left -> bottom-right'),
    ]),
    ('03_castle_siege_tents', 'Castle siege camp: ridge tent, 3 cloth colours (2 x 3 tile footprint)', 3, 3, 1, [
        ('castle_tent_tan', 'tent: tan canvas', 140, 120, 'tent', ''),
        ('castle_tent_red', 'tent: dark red canvas', 140, 120, 'tent', ''),
        ('castle_tent_green', 'tent: olive green canvas', 140, 120, 'tent', ''),
    ]),
    ('04_town_props', 'Town scene props + the shared flame loop (campfire, candle, wall torches)', 5, 5, 2, [
        ('campfire_base', 'campfire UNLIT: stones + logs', 40, 24, 'ground', 'flames are added by the game'),
        ('candle', 'candle on a dish, UNLIT', 8, 16, 'ground', ''),
        ('bunting_post', 'festival post, brass cap', 8, 50, 'ground', 'the string + pennants stay code'),
        ('bedroll_x', 'bedroll, runs TL->BR', 34, 20, 'ground', ''),
        ('bedroll_y', 'bedroll, runs TR->BL', 34, 20, 'ground', ''),
        ('flame_1', 'flame loop frame 1', 12, 24, 'ground', 'base of the flame on the line'),
        ('flame_2', 'flame loop frame 2', 12, 24, 'ground', ''),
        ('flame_3', 'flame loop frame 3', 12, 24, 'ground', ''),
        ('flame_4', 'flame loop frame 4', 12, 24, 'ground', ''),
        ('flame_5', 'flame loop frame 5', 12, 24, 'ground', ''),
    ]),
    ('05_dungeon_interactables', 'Dungeon shrine obelisk, cursed chest, Breach ward post', 4, 5, 1, [
        ('shrine_obelisk_lit', 'shrine obelisk, active', 30, 50, 'ground', 'glowing seam painted WHITE (game tints it)'),
        ('shrine_obelisk_spent', 'shrine obelisk, used up', 30, 50, 'ground', 'seam dark and cracked'),
        ('cursed_chest_closed', 'cursed chest, closed', 34, 30, 'ground', ''),
        ('cursed_chest_open', 'cursed chest, burst open', 34, 34, 'ground', ''),
        ('breach_ward_post', 'Breach ward rune post', 10, 30, 'ground', 'rune slot painted WHITE'),
    ]),
    ('06_dragon_knight_gunner', 'Class signatures: Dragon Knight dragon + wing, Gunner biplane + bomb', 3, 4, 2, [
        ('dragon_head', 'spectral dragon skull + neck, NO jaw', 80, 80, 'tl', 'pivot=34,40 jaw hinge; faces RIGHT'),
        ('dragon_jaw', 'dragon lower jaw (separate piece)', 40, 16, 'tl', 'pivot=2,4 hinge; faces RIGHT'),
        ('dragon_wing', 'flame wing, RIGHT side', 70, 60, 'tl', 'pivot=4,56 shoulder; game mirrors for the left'),
        ('biplane', 'biplane, side view', 104, 38, 'pivot', 'faces RIGHT, no propeller'),
        ('biplane_prop_1', 'propeller blur 1', 6, 18, 'pivot', ''),
        ('biplane_prop_2', 'propeller blur 2', 6, 18, 'pivot', ''),
        ('biplane_prop_3', 'propeller blur 3', 6, 18, 'pivot', ''),
        ('gunner_bomb', 'falling bomb, nose down', 8, 14, 'pivot', ''),
    ]),
    ('07_lancer_phantom_knight', 'Class signature: Lancer phantom knight charge (6-frame gallop loop)', 4, 3, 2, [
        ('phantom_knight_%d' % i, 'gallop frame %d' % i, 64, 44, 'ground', 'faces RIGHT') for i in range(1, 7)
    ]),
    ('08_small_signature_objects', 'Necromancer lantern + skull, Witch poppet, Totem Master face pole', 6, 6, 2, [
        ('skull_lantern', 'Necromancer iron skull lantern, EMPTY', 14, 26, 'tl', 'pivot=7,0 hangs from its ring'),
        ('screaming_skull', 'screaming skull', 14, 14, 'pivot', 'faces RIGHT'),
        ('hex_poppet', 'Carrion Witch burlap poppet', 16, 26, 'ground', ''),
        ('hex_poppet_rot', 'poppet, rotted', 16, 26, 'ground', ''),
        ('hex_pin', 'hex pin', 4, 12, 'tl', 'pivot=2,11 point'),
        ('totem_wings', 'small totem crown wings', 32, 12, 'pivot', ''),
        ('totem_face_bear', 'totem face: bear', 12, 10, 'pivot', ''),
        ('totem_face_wolf', 'totem face: wolf', 12, 10, 'pivot', ''),
        ('totem_face_thunderbird', 'totem face: thunderbird', 12, 10, 'pivot', ''),
        ('totem_face_serpent', 'totem face: serpent', 12, 10, 'pivot', ''),
    ]),
    ('09_sky_clouds', 'Sky Battle: pixel clouds, sun, moon', 2, 4, 3, [
        ('cloud_large_1', 'large cloud', 160, 60, 'pivot', ''), ('cloud_large_2', 'large cloud', 160, 60, 'pivot', ''),
        ('cloud_large_3', 'large cloud', 160, 60, 'pivot', ''), ('cloud_large_4', 'large cloud', 160, 60, 'pivot', ''),
        ('cloud_mid_1', 'medium cloud', 100, 40, 'pivot', ''), ('cloud_mid_2', 'medium cloud', 100, 40, 'pivot', ''),
        ('cloud_mid_3', 'medium cloud', 100, 40, 'pivot', ''), ('cloud_wisp_1', 'thin wisp', 120, 20, 'pivot', ''),
        ('cloud_wisp_2', 'thin wisp', 120, 20, 'pivot', ''), ('cloud_wisp_3', 'thin wisp', 120, 20, 'pivot', ''),
        ('sun', 'sun disc', 44, 44, 'pivot', ''), ('moon', 'moon disc', 44, 44, 'pivot', ''),
    ]),
    ('10_breach_pieces', 'Eternal Breach: far floating rocks + island underside pieces', 3, 6, 2, [
        ('breach_far_rock_1', 'distant floating rock', 60, 46, 'pivot', ''), ('breach_far_rock_2', 'distant floating rock', 60, 46, 'pivot', ''),
        ('breach_far_rock_3', 'distant floating rock', 60, 46, 'pivot', ''), ('breach_far_rock_4', 'distant floating rock', 60, 46, 'pivot', ''),
        ('breach_stalactite_1', 'hanging rock spike', 16, 46, 'tl', 'pivot=8,0 top'), ('breach_stalactite_2', 'hanging rock spike', 16, 46, 'tl', 'pivot=8,0 top'),
        ('breach_roots_1', 'hanging roots', 20, 46, 'tl', 'pivot=10,0 top'), ('breach_roots_2', 'hanging roots', 20, 46, 'tl', 'pivot=10,0 top'),
        ('breach_crystal_1', 'rift crystal shard', 16, 40, 'tl', 'pivot=8,0 top'), ('breach_crystal_2', 'rift crystal shard', 16, 40, 'tl', 'pivot=8,0 top'),
        ('breach_crystal_3', 'rift crystal cluster', 22, 34, 'tl', 'pivot=11,0 top'), ('breach_glow_seam', 'glowing rock seam', 30, 10, 'pivot', ''),
    ]),
    ('11_castle_ground_bits', 'Castle grounds: tiny scatter bits baked into the grass (6 kinds x 8 variants)', 10, 8, 6, [
        ('%s_%d' % (k, i), '%s %d' % (k, i), 10, 9, 'ground', '') for k in ('grass_tuft', 'pebble', 'leaf', 'reed', 'speck', 'flower')
        for i in range(1, 9)
    ]),
]

# Seamless textures: id, (w, h) delivered, game size, title, notes.
TEXTURES = [
    ('02a_slate_roof', (1024, 1024), (256, 256), 'Castle 3D roofs: slate shingles (Python-drawn now)',
     ['rows of overlapping slates, 16 rows', 'seamless left-right AND top-bottom', 'flat-lit, no shadows from one side',
      'mid grey-blue: the game tints it (lead cones darker)']),
    ('02b_wood_planks', (512, 1024), (128, 256), 'Castle 3D doors + gates + drawbridge deck: oak planks (Python-drawn now)',
     ['8 vertical boards, grain running UP', 'seamless left-right AND top-bottom', 'flat-lit, warm mid brown',
      'no nails/straps: the model adds iron']),
    ('12a_mountain_sky_far', (2048, 512), None, 'Mountainside sky: far ridge strip (parallax back layer)',
     ['seamless LEFT-RIGHT only', 'top 60% sky gradient, faint jagged snowy peaks at the bottom', 'day colouring; game darkens at night']),
    ('12b_mountain_sky_mid', (2048, 512), None, 'Mountainside sky: mid ridge strip (transparent above the ridge)',
     ['seamless LEFT-RIGHT only', 'TRANSPARENT sky, closer bluer ridge along the bottom half']),
    ('12c_mountain_sky_near', (2048, 512), None, 'Mountainside sky: near ridge strip (transparent above the ridge)',
     ['seamless LEFT-RIGHT only', 'TRANSPARENT sky, darkest nearest ridge, bottom third']),
    ('13a_breach_void_nebula', (1024, 1024), None, 'Eternal Breach backdrop: violet void nebula + stars',
     ['seamless left-right AND top-bottom', 'near-black violet void, soft nebula, scattered pixel stars', 'no large rocks (they are sheet 10)']),
]


def cell_layout(cols, rows):
    head, lab = 70, 46           # sheet title strip, per-cell label strip (id, then what it is)
    cw, ch = W // cols, (H - head) // rows
    return head, lab, cw, ch


def sheet(sid, title, k, cols, rows, cells):
    im = Image.new('RGBA', (W, H), MAG); d = ImageDraw.Draw(im)
    head, lab, cw, ch = cell_layout(cols, rows)
    label(d, 12, 10, title, 22); label(d, 12, 40, 'paint scale %dx world px  |  cyan = bounding box  yellow = ground line / pivot  |  keep art inside its box, magenta stays empty' % k, 14, DIM)
    for n, (cid, text, w, h, mode, note) in enumerate(cells):
        cx0, cy0 = (n % cols) * cw, head + (n // cols) * ch
        d.rectangle((cx0 + 2, cy0 + 2, cx0 + cw - 3, cy0 + ch - 3), outline=(150, 0, 150, 255), width=1)
        label(d, cx0 + 8, cy0 + 6, '%d %s' % (n + 1, cid), 13)
        bw, bh = w * k, h * k
        x0 = cx0 + (cw - bw) // 2; y0 = cy0 + lab + (ch - lab - bh) // 2 + 6
        if bw > cw - 8 or bh > ch - lab - 8:
            raise SystemExit('%s: %s does not fit its cell' % (sid, cid))
        if mode == 'diamond':
            dashed(d, [(x0 + bw // 2, y0), (x0 + bw, y0 + bh // 2), (x0 + bw // 2, y0 + bh), (x0, y0 + bh // 2), (x0 + bw // 2, y0)])
            if 'trim_a' in cid: d.line((x0, y0 + bh // 2, x0 + bw // 2, y0), fill=YEL, width=4)
            if 'trim_b' in cid: d.line((x0 + bw, y0 + bh // 2, x0 + bw // 2, y0 + bh), fill=YEL, width=4)
        elif mode == 'tent':
            box(d, x0, y0, x0 + bw, y0 + bh)
            P = lambda p: (x0 + p[0] * k, y0 + p[1] * k)
            C, E, F, G, A, B = (12, 82), (82, 117), (132, 92), (62, 57), (37, 28), (107, 63)
            dashed(d, [P(C), P(E), P(F), P(G), P(C)], YEL)                     # the 2 x 3 tile footprint on the ground
            d.line((*P(A), *P(B)), fill=YEL, width=2); dot(d, *P((70, 86)))   # ridge line, ground pivot
            label(d, P(F)[0] - 70, P(F)[1] + 8, 'door gable', 12, YEL); label(d, P(A)[0] - 10, P(A)[1] - 22, 'ridge', 12, YEL)
        else:
            box(d, x0, y0, x0 + bw, y0 + bh)
            if mode == 'ground':
                d.line((x0 - 10, y0 + bh, x0 + bw + 10, y0 + bh), fill=YEL, width=2); dot(d, x0 + bw // 2, y0 + bh, r=3)
            elif mode == 'pivot':
                dot(d, x0 + bw // 2, y0 + bh // 2, r=3)
            elif mode == 'tl':
                px, py = map(float, note.split('pivot=')[1].split()[0].split(','))
                dot(d, x0 + px * k, y0 + py * k, r=3)
        if cw >= 250: label(d, cx0 + 8, cy0 + 26, '%s (%dx%d %s)' % (text, w, h, 'tile px' if mode == 'diamond' else 'world'), 11, DIM)
    return im


def texture(tid, size, game, title, notes):
    im = Image.new('RGBA', size, (128, 128, 128, 255)); d = ImageDraw.Draw(im)
    w, h = size
    for x in range(0, w, 64): d.line((x, 0, x, h), fill=(140, 140, 140, 255))
    for y in range(0, h, 64): d.line((0, y, w, y), fill=(140, 140, 140, 255))
    s = 26 if w >= 1024 else 18
    label(d, 20, 20, title, s)
    label(d, 20, 30 + s * 2, 'deliver exactly %d x %d px%s' % (w, h, ', game uses %d x %d' % game if game else ''), s - 6, YEL)
    for i, n in enumerate(notes):
        label(d, 20, 40 + s * 3 + i * (s + 4), '- ' + n, s - 8, DIM)
    return im


def readme_table():
    rows = []
    for sid, title, k, cols, rows_, cells in SHEETS:
        for cid, text, w, h, mode, note in cells:
            rows.append('| `%s` | %s | %s | %dx%d | %dx%d |' % (sid, cid, text + (' (' + note + ')' if note and 'pivot=' not in note else ''), w, h, w * k, h * k))
    return '\n'.join(rows)


def main():
    os.makedirs(os.path.join(OUT, 'templates'), exist_ok=True)
    files = {}
    for s in SHEETS:
        files['templates/%s.png' % s[0]] = sheet(*s)
    for t in TEXTURES:
        files['templates/%s.png' % t[0]] = texture(*t)
    zb = io.BytesIO()
    with zipfile.ZipFile(zb, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, im in sorted(files.items()):
            b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
            open(os.path.join(OUT, name), 'wb').write(b.getvalue()); z.writestr(name, b.getvalue())
        z.write(os.path.join(OUT, 'README.md'), 'README.md')
        for name in ('slate', 'wood'):   # the current Python-drawn textures, as size/layout references
            src = os.path.join(ROOT, 'assets', 'source', 'castle3d', 'tex', name + '.png')
            if os.path.exists(src): z.write(src, 'current/%s_now.png' % name)
    open(os.path.join(ROOT, 'docs', 'art_kits', 'ChatGPT_Placeholder_Art_Kit.zip'), 'wb').write(zb.getvalue())
    print('%d templates -> %s' % (len(files), OUT))
    if '--table' in os.sys.argv: print(readme_table())


if __name__ == '__main__':
    main()
