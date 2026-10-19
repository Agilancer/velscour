"""
Build docs/art_kits/ChatGPT_Runeblade_Kit.zip: everything ChatGPT (the chat app, no repo access) needs to draw the
Death Knight's Runeblade (his class signature, src/game/sigs/deathknight.js) as real sprites in the VELSCOUR style:
templates, a flat layout example, the Death Knight at blade scale, the palette, the spec and the prompts.

    python tools/chatgpt_runeblade_kit.py               # writes the zip
    python tools/chatgpt_runeblade_kit.py --unpacked DIR

Nine sprites in all. Every blade is drawn POINT DOWN on its cell's centre line; the game rotates it round the anchor
(the centre of the crossguard), so one sprite covers every angle.
  Sheet 1 (3x, the hero's density: 1.8 AP per world px): HOVER and HOVER CHARGED, 48 x 112 AP, crossguard at y 22,
    tip at y 98 (the hovering sword is 42 world px of blade); RUNE S FROST / UNHOLY / BLOOD, 16 x 16 AP.
  Sheet 2 (2x, chunkier on purpose: 1 AP per world px): GREATBLADE, 96 x 280 AP, crossguard at y 36, tip at y 264
    (RUNIC OBLITERATION's 228 world px of blade); RUNE L FROST / UNHOLY / BLOOD, 24 x 24 AP.
  Six rune slots run down each blade at 14%, 26%, 38%, 50%, 62% and 74% of the blade length from the crossguard.
Needs: pip install pillow numpy
"""
import io, os, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TXT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_runeblade_kit')
OUT = os.path.join(ROOT, 'docs', 'art_kits', 'ChatGPT_Runeblade_Kit.zip')
KIT = 'ChatGPT_Runeblade_Kit'
W, H = 1536, 1024
LABEL_W, HEAD_H = 40, 70
MAG, CY, YEL, GRN, INK = (255, 0, 255, 255), (0, 229, 255, 255), (255, 210, 122, 255), (120, 255, 140, 255), (255, 255, 255, 255)
SLOTS = [0.14 + i * 0.12 for i in range(6)]
# name: (width, height, centre x, crossguard y, tip y, blade half-width, guard half-width, pommel top y) in AP
BLADES = {'HOVER': (48, 112, 24, 22, 98, 6, 17, 4), 'HOVER CHARGED': (48, 112, 24, 22, 98, 6, 17, 4),
          'GREATBLADE': (96, 280, 48, 36, 264, 8, 23, 6)}
RUNES = ('FROST', 'UNHOLY', 'BLOOD')

# palette (from docs/art_style/01_VELSCOUR_ART_BIBLE.md section 6; the three rune ramps are the game's rune colours)
RAMPS = {
  'Blackened steel (grip, crossguard, pommel)': ['#08080c', '#13131c', '#20202e', '#323246', '#4c4c66', '#76769a'],
  'Frost (the spectral blade, ice)': ['#0a1620', '#16303e', '#285468', '#3e7c94', '#66a8c0', '#a6d8e6', '#e6f6fa'],
  'Verdigris bronze (fittings, the tears down the guard)': ['#0e1412', '#1c2a26', '#2e4640', '#46665c', '#6a8c7e', '#9ab8a6'],
  'Shadow ink (outline darks)': ['#07060a', '#100c14', '#1a1220'],
  'Moonlit rim (right edges)': ['#6f84a8', '#9fb4d4', '#d4e2f4'],
  'Frost rune (emissive)': ['#0a2a50', '#1a5a9a', '#3a9ad8', '#7ad0ff', '#bfeaff', '#f0fbff'],
  'Unholy rune (emissive)': ['#0e1a06', '#1e3a0a', '#3a7014', '#5ab828', '#70e050', '#c8ff9a'],
  'Blood rune (emissive)': ['#2a0408', '#5a0a10', '#9a1418', '#d42228', '#ff2a30', '#ffb0a8'],
}

def font(size):
    for f in ('consolab.ttf', 'DejaVuSansMono-Bold.ttf', 'LiberationMono-Bold.ttf'):
        try: return ImageFont.truetype(f, size)
        except OSError: pass
    return ImageFont.load_default(size)

def label(d, x, y, text, size=15, col=INK):
    d.text((x, y), text, font=font(size), fill=col, stroke_width=3, stroke_fill=(0, 0, 0, 255))

def dashed(d, a, b, col=CY, dash=(7, 5), w=2):
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0)); t = 0
    while t < n:
        e = min(n, t + dash[0])
        d.line((x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n, x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n), fill=col, width=w)
        t += sum(dash)

def box(d, x, y, w, h, col=CY, dash=(7, 5), lw=2):
    for a, b in (((x, y), (x + w, y)), ((x + w, y), (x + w, y + h)), ((x + w, y + h), (x, y + h)), ((x, y + h), (x, y))): dashed(d, a, b, col, dash, lw)

def slot_y(name, i):
    _, _, _, gy, ty, *_ = BLADES[name]
    return round(gy + (ty - gy) * SLOTS[i])

# ------------------------------------------------------------------ layouts (pixel boxes on the 1536 x 1024 sheet)
def sheet1_cells():
    S = 3; out = [(n, LABEL_W + 30 + i * (48 * S + 120), HEAD_H + 20, 48, 112, S) for i, n in enumerate(('HOVER', 'HOVER CHARGED'))]
    x0 = LABEL_W + 30 + 2 * (48 * S + 120) + 40
    for i, r in enumerate(RUNES): out.append((f'RUNE S {r}', x0 + i * (16 * S + 110), HEAD_H + 60, 16, 16, S))
    return out

def sheet2_cells():
    S = 2; out = [('GREATBLADE', LABEL_W + 30, HEAD_H + 20, 96, 280, S)]
    x0 = LABEL_W + 30 + 96 * S + 160
    for i, r in enumerate(RUNES): out.append((f'RUNE L {r}', x0 + i * (24 * S + 120), HEAD_H + 60, 24, 24, S))
    return out

def guides(d, name, x, y, w, h, S):
    box(d, x, y, w * S, h * S)
    label(d, x, y - 24, name, 15)
    if name in BLADES:
        _, _, cx, gy, ty, bw, gw, py = BLADES[name]
        X = lambda v: x + v * S; Y = lambda v: y + v * S
        dashed(d, (X(cx), y + 2), (X(cx), y + h * S - 2), YEL, (4, 6), 1)                      # centre line
        dashed(d, (x + 2, Y(gy)), (x + w * S - 2, Y(gy)), YEL, (10, 4), 2)                    # crossguard line (anchor)
        dashed(d, (x + 2, Y(ty)), (x + w * S - 2, Y(ty)), YEL, (10, 4), 2)                    # tip line
        dashed(d, (x + 2, Y(py)), (x + w * S - 2, Y(py)), YEL, (3, 6), 1)                     # pommel top
        for sx in (-bw, bw): dashed(d, (X(cx + sx), Y(gy)), (X(cx + sx), Y(ty - 8)), GRN, (3, 5), 1)   # blade width
        for sx in (-gw, gw): dashed(d, (X(cx + sx), Y(gy - 3)), (X(cx + sx), Y(gy + 3)), GRN, (3, 3), 1)  # guard ends
        for i in range(6):                                                                    # rune slots
            sy = slot_y(name, i); r = 3 if name != 'GREATBLADE' else 5
            box(d, X(cx - r), Y(sy - r), 2 * r * S, 2 * r * S, GRN, (3, 3), 1)
    else:
        c = w * S // 2
        dashed(d, (x + c, y + 2), (x + c, y + h * S - 2), YEL, (3, 4), 1); dashed(d, (x + 2, y + c), (x + w * S - 2, y + c), YEL, (3, 4), 1)

def sheet(title, cells, notes, art=None):
    im = Image.new('RGBA', (W, H), MAG); d = ImageDraw.Draw(im)
    label(d, 12, 10, title, 18)
    for i, n in enumerate(notes): label(d, 12, H - 22 * (len(notes) - i) - 6, n, 13)
    for name, x, y, w, h, S in cells:
        if art is not None:
            a = art(name, w, h)
            if a is not None: im.alpha_composite(a.resize((w * S, h * S), Image.NEAREST), (x, y))
        guides(d, name, x, y, w, h, S)
    return im

# ------------------------------------------------------------------ flat layout example (placement, not style)
def hexc(h, a=255): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)
BS, FR, VB, RIM = (RAMPS[k] for k in ('Blackened steel (grip, crossguard, pommel)', 'Frost (the spectral blade, ice)', 'Verdigris bronze (fittings, the tears down the guard)', 'Moonlit rim (right edges)'))
RR = {'FROST': RAMPS['Frost rune (emissive)'], 'UNHOLY': RAMPS['Unholy rune (emissive)'], 'BLOOD': RAMPS['Blood rune (emissive)']}

def blade_img(name, lit=()):
    w, h, cx, gy, ty, bw, gw, py = BLADES[name]
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    charged = name == 'HOVER CHARGED'
    # the blade: broad, a long point; a fuller down the middle
    d.polygon([(cx - bw, gy), (cx + bw, gy), (cx + bw - 1, ty - (ty - gy) * 0.15), (cx, ty), (cx - bw + 1, ty - (ty - gy) * 0.15)], fill=hexc(FR[3]), outline=hexc(FR[0]))
    d.line([(cx - bw + 1, gy + 1), (cx - 2, ty - 6)], fill=hexc(FR[5])); d.line([(cx, gy + 2), (cx, ty - 10)], fill=hexc(FR[2] if not charged else FR[6]))
    for yy in range(gy + 2, ty - 8, 3): im.putpixel((cx + bw - 1, yy), hexc(RIM[1]))
    if charged:
        for yy in range(gy + 1, ty - 4, 2): im.putpixel((cx - bw + 1, yy), hexc(RR['FROST'][4])); im.putpixel((cx + bw - 2, yy), hexc(RR['FROST'][3]))
    # crossguard: a tomb-lid bar with hourglass ends, verdigris tears under it
    g = 2 if name != 'GREATBLADE' else 3
    d.rectangle([cx - gw, gy - g, cx + gw, gy + g - 1], fill=hexc(BS[3]), outline=hexc(BS[0]))
    d.line([(cx - gw + 1, gy - g + 1), (cx + gw - 1, gy - g + 1)], fill=hexc(BS[5]))
    for sx in (-gw, gw): d.polygon([(cx + sx - 2, gy - g - 2), (cx + sx + 2, gy - g - 2), (cx + sx, gy), (cx + sx + 2, gy + g + 1), (cx + sx - 2, gy + g + 1)], fill=hexc(VB[3]), outline=hexc(VB[0]))
    for sx in (-gw // 2, gw // 2): d.line([(cx + sx, gy + g), (cx + sx, gy + g + 3)], fill=hexc(VB[4]))
    # grip and pommel
    d.rectangle([cx - 2, py + 5, cx + 1, gy - g - 1], fill=hexc(BS[2]))
    for yy in range(py + 6, gy - g - 1, 2): d.line([(cx - 2, yy), (cx + 1, yy)], fill=hexc(BS[4]))
    pr = 3 if name != 'GREATBLADE' else 4
    d.ellipse([cx - pr, py, cx + pr, py + 2 * pr], fill=hexc(BS[3]), outline=hexc(BS[0]))
    d.rectangle([cx - 1, py + pr - 1, cx, py + pr], fill=hexc(RR['FROST'][5] if charged else BS[5]))
    # empty rune slots, then any lit runes
    for i in range(6):
        sy = slot_y(name, i); r = 2 if name != 'GREATBLADE' else 3
        d.rectangle([cx - r + 1, sy - r, cx + r - 1, sy + r], fill=hexc(FR[1]))
        if i < len(lit):
            rune = rune_img(lit[i], 7 if name != 'GREATBLADE' else 11)
            im.alpha_composite(rune, (cx - rune.width // 2, sy - rune.height // 2))
    return im

def rune_img(kind, size):
    """A flat stand-in glyph: frost a six-point star, unholy a three-tine fork, blood a drop. Placement only."""
    R = RR[kind]; im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size // 2
    if kind == 'FROST':
        d.line([(c, 0), (c, size - 1)], fill=hexc(R[3])); d.line([(0, c), (size - 1, c)], fill=hexc(R[3]))
        d.line([(1, 1), (size - 2, size - 2)], fill=hexc(R[2])); d.line([(1, size - 2), (size - 2, 1)], fill=hexc(R[2]))
    elif kind == 'UNHOLY':
        d.line([(c, 1), (c, size - 1)], fill=hexc(R[4])); d.line([(1, c - 1), (size - 2, c - 1)], fill=hexc(R[3]))
        for x in (1, size - 2): d.line([(x, 1), (x, c - 1)], fill=hexc(R[3]))
    else:
        d.polygon([(c, 0), (size - 2, size - 3), (c, size - 1), (1, size - 3)], fill=hexc(R[3]), outline=hexc(R[1]))
    im.putpixel((c, c), hexc(R[5]))
    return im

def example_art(name, w, h):
    if name == 'HOVER': return blade_img(name, ('FROST', 'UNHOLY', 'BLOOD'))
    if name == 'HOVER CHARGED': return blade_img(name, ('FROST',) * 6)
    if name == 'GREATBLADE': return blade_img(name, ('FROST', 'FROST', 'UNHOLY', 'BLOOD', 'FROST', 'UNHOLY'))
    if name.startswith('RUNE'):
        k = name.split()[-1]; g = rune_img(k, 11 if w == 16 else 17)
        im = Image.new('RGBA', (w, w), (0, 0, 0, 0)); im.alpha_composite(g, ((w - g.width) // 2, (w - g.height) // 2)); return im

# ------------------------------------------------------------------ references
def hero_reference():
    """The Death Knight (armor 001) at 3x with the hovering Runeblade at his side, and the in-game size beside it."""
    sheet_ = Image.open(os.path.join(ROOT, 'assets', 'sprites', 'gear', 'death_knight', 'armor.webp')).convert('RGBA')
    hero = sheet_.crop((0, 0, 128, 192))
    a = np.array(hero)[..., 3]; ys = np.where(a.max(1) > 0)[0]
    k = 108 / (ys[-1] - ys[0] + 1)                                     # to 108 AP crown-to-sole
    hero = hero.resize((round(128 * k), round(192 * k)), Image.NEAREST)
    frame = Image.new('RGBA', (128, 192), (0, 0, 0, 0))
    hy = np.where(np.array(hero)[..., 3].max(1) > 0)[0]; hx = np.where(np.array(hero)[..., 3].max(0) > 0)[0]
    frame.alpha_composite(hero, (64 - (hx[0] + hx[-1]) // 2, 183 - hy[-1]))
    # the hilt rides 20 world px right of his feet and 62 above them: hero frame (64 + 36, 183 - 112)
    canvas = Image.new('RGBA', (176, 192), (0, 0, 0, 0)); canvas.alpha_composite(frame)
    bl = blade_img('HOVER', ('FROST', 'UNHOLY', 'BLOOD')).rotate(-7, resample=Image.NEAREST, center=(24, 22))
    canvas.alpha_composite(bl, (100 - 24, 71 - 22))
    out = Image.new('RGBA', (W, H), (24, 20, 26, 255)); d = ImageDraw.Draw(out)
    label(d, 20, 14, 'THE DEATH KNIGHT AND HIS RUNEBLADE (layout mock-up, 3x). The sword hovers point down at his right shoulder, drawn in front of him.', 15)
    out.alpha_composite(canvas.resize((528, 576), Image.NEAREST), (20, 50))
    label(d, 40, 640, 'Hover: crossguard 36 AP right of his centre line, 112 AP above his soles (hero frame x 100, y 71).', 14)
    gx = 600
    label(d, gx, 50, 'IN GAME (1x, 2x):', 14)
    small = canvas.resize((98, 107), Image.LANCZOS); out.alpha_composite(small, (gx, 80)); out.alpha_composite(small.resize((196, 214), Image.NEAREST), (gx + 110, 80))
    # the greatblade beside him, both at in-game size (world px), to show the jump in scale
    label(d, gx + 260, 50, 'RUNIC OBLITERATION (2x world px): the greatblade at the moment it hits', 14)
    big = blade_img('GREATBLADE', ('FROST',) * 6)
    me = frame.resize((71, 107), Image.LANCZOS)                     # the hero at world px (1.8 AP each)
    stage = Image.new('RGBA', (340, 220), (0, 0, 0, 0)); fx, fy = 30, 205   # his feet
    stage.alpha_composite(me, (fx - 36, fy - 102))
    # the anchor rides 8 px out from his chest (30 px up); the blade is swung down through a foe to his right
    pad = Image.new('RGBA', (600, 600), (0, 0, 0, 0)); pad.alpha_composite(big, (300 - 48, 300 - 36))
    pad = pad.rotate(78, resample=Image.NEAREST)                     # point down -> point right, 12 degrees low
    stage.alpha_composite(pad, (fx + 8 - 300, fy - 30 - 300))
    out.alpha_composite(stage.resize((680, 440), Image.NEAREST), (gx + 240, 80))
    notes = ['Hero: 108 AP crown to sole, crown y 75, soles y 183, centre line x 64 (hero frame 128 x 192 AP). 1.8 AP = 1 world px.',
             'HOVER: 42 world px of blade = 76 AP (crossguard y 22 to tip y 98 in its cell). It bobs 2 px and sways a few degrees.',
             'GREATBLADE: 228 world px of blade, drawn at 1 AP per world px (chunkier on purpose: a spectral giant), rotated through the swing.',
             'He faces either way; the game mirrors and rotates the blade, so no text and a design that works flipped.']
    for i, n in enumerate(notes): label(d, 20, 700 + i * 26, n, 14)
    return out

def palette_card():
    out = Image.new('RGBA', (1100, 60 + 70 * len(RAMPS)), (24, 20, 26, 255)); d = ImageDraw.Draw(out)
    label(d, 16, 12, 'RUNEBLADE PALETTE: exact hex targets (dark -> light). 20 colours at most per blade, 8 per rune.', 16)
    for i, (name, ramp) in enumerate(RAMPS.items()):
        y = 50 + i * 70; label(d, 16, y, name, 14)
        for j, h in enumerate(ramp):
            d.rectangle([16 + j * 110, y + 22, 16 + j * 110 + 100, y + 58], fill=hexc(h)); label(d, 22 + j * 110, y + 30, h, 13)
    return out

# ------------------------------------------------------------------ text
def text(name): return open(os.path.join(TXT, name), encoding='utf8').read()

def png(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return b.getvalue()

def build():
    n1 = ['Cyan box = the frame (1 AP = a 3 x 3 block). Yellow: centre line, crossguard line (the anchor), tip line, pommel top (dotted).',
          'Green: blade width, crossguard ends, and the six rune SLOTS (engraved, unlit, in HOVER; HOVER CHARGED has all six lit frost).',
          'Blades POINT DOWN. Runes: one glyph each, centred on the crosshair. Flat magenta #FF00FF. Remove every label and guide in your reply.']
    n2 = ['GREATBLADE: the same sword, giant, at 2x (1 AP = a 2 x 2 block). Same guides as sheet 1. Point down, centred.',
          'RUNE L: the three runes again at the greatblade\'s size. Flat magenta #FF00FF. Remove every label and guide in your reply.']
    files = {
        'PROMPT.txt': text('PROMPT.txt'), 'README.md': text('README.md'), 'SPEC.md': text('SPEC.md'), 'STYLE.md': text('STYLE.md'),
        'templates/runeblade_sheet1_hover_template.png': png(sheet('SHEET 1 (3x): THE HOVERING RUNEBLADE and the small runes.', sheet1_cells(), n1)),
        'templates/runeblade_sheet2_greatblade_template.png': png(sheet('SHEET 2 (2x): THE GREATBLADE (RUNIC OBLITERATION) and the large runes.', sheet2_cells(), n2)),
        'examples/runeblade_sheet1_layout_example.png': png(sheet('LAYOUT EXAMPLE ONLY (placement, NOT the art style): sheet 1', sheet1_cells(), n1, example_art)),
        'examples/runeblade_sheet2_layout_example.png': png(sheet('LAYOUT EXAMPLE ONLY (placement, NOT the art style): sheet 2', sheet2_cells(), n2, example_art)),
        'reference/death_knight_with_runeblade_reference.png': png(hero_reference()),
        'reference/runeblade_palette.png': png(palette_card()),
    }
    ingame = os.path.join(ROOT, 'docs', 'art_kits', 'runeblade_ingame.png')
    if os.path.exists(ingame): files['reference/runeblade_in_game_now.png'] = open(ingame, 'rb').read()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for k, v in files.items(): z.writestr(f'{KIT}/{k}', v)
    if '--unpacked' in sys.argv:
        d0 = sys.argv[sys.argv.index('--unpacked') + 1]
        for k, v in files.items():
            p = os.path.join(d0, KIT, k); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(v if isinstance(v, bytes) else v.encode('utf8'))
    print(OUT, os.path.getsize(OUT) // 1024, 'KB')

if __name__ == '__main__':
    build()
