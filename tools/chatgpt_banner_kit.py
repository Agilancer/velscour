"""
Build docs/art_kits/ChatGPT_Lancer_Banner_Kit.zip: everything ChatGPT (the chat app, no repo access) needs to draw
the Lancer's war banner (his class signature, src/game/sigs/lancer.js) as real sprites in the VELSCOUR style:
templates, a flat layout example, the Lancer at banner scale, the palette, the spec and the prompts.

    python tools/chatgpt_banner_kit.py               # writes the zip
    python tools/chatgpt_banner_kit.py --unpacked DIR

Geometry (art pixels, AP; one in-game world pixel = 1.8 AP, the hero is 108 AP tall):
  every cell is 64 x 128 AP; cell (0, 0) sits at hero frame (32, 12), so the hero's centre line is cell x 32.
  POLE_X 32, crossbar line y 16, pole mount (where it meets his back) y 124, cloth 40 AP wide hanging from the
  crossbar, 88 AP long at full Valor. Sheets are delivered at 3x (one AP = a 3 x 3 block) on 1536 x 1024.
Needs: pip install pillow numpy
"""
import io, os, sys, zipfile, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'art_kits', 'ChatGPT_Lancer_Banner_Kit.zip')
KIT = 'ChatGPT_Lancer_Banner_Kit'
W, H, S = 1536, 1024, 3                  # sheet size, delivery scale
CW, CH = 64, 128                         # cell in AP
LABEL_W, HEAD_H, GAP = 160, 48, 28
POLE_X, BAR_Y, MOUNT_Y, CLOTH_W, CLOTH_L = 32, 16, 124, 40, 88
MAG, CY, YEL, GRN, INK = (255, 0, 255, 255), (0, 229, 255, 255), (255, 210, 122, 255), (120, 255, 140, 255), (255, 255, 255, 255)

# palette (from docs/art_style/01_VELSCOUR_ART_BIBLE.md section 6)
RAMPS = {
  'Night indigo (the field)': ['#0a0a18', '#161a34', '#242c52', '#34406e', '#4c5c92', '#7084b8'],
  'Reliquary gold (heraldic ochre: border, emblem, finial)': ['#1a1006', '#3a240c', '#63401a', '#8e6427', '#b98e3c', '#dcbf6a', '#f4e3a6'],
  'Grave steel (shield face, fittings, rings)': ['#0e1016', '#1c2230', '#2e3747', '#46526a', '#6a7891', '#98a6bc', '#d0d9e6'],
  'Leather (the ash-wood pole, lashings)': ['#120c08', '#261a10', '#3e2a1a', '#5a3e26', '#7a5636', '#9e7650'],
  'Shadow ink (outline darks)': ['#07060a', '#100c14', '#1a1220'],
  'Moonlit rim (signature, right edges)': ['#6f84a8', '#9fb4d4', '#d4e2f4'],
  'Holy (emissive, RALLY frames only)': ['#2a2008', '#5a4814', '#9a8428', '#d4bc48', '#f2e08a', '#fffae0'],
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

def box(d, x, y, w, h):
    for a, b in (((x, y), (x + w, y)), ((x + w, y), (x + w, y + h)), ((x + w, y + h), (x, y + h)), ((x, y + h), (x, y))): dashed(d, a, b)

# ------------------------------------------------------------------ layouts (pixel boxes on the 1536 x 1024 sheet)
def cloth_cells():
    """Sheet 1: two rows of six cloth frames."""
    out = []
    for r, row in enumerate(('CALM', 'RALLIED')):
        for c in range(6):
            out.append((f'{row} {c + 1}', LABEL_W + c * CW * S, HEAD_H + r * (CH * S + GAP), CW, CH))
    return out

def parts_cells():
    """Sheet 2: the pole, four RALLY flare frames, three roll frames."""
    out = [('POLE', LABEL_W, HEAD_H, CW, CH)]
    for i in range(4): out.append((f'RALLY {i + 1}', LABEL_W + (i + 1) * CW * S + 24, HEAD_H, CW, CH))
    for i in range(3): out.append((f'ROLL {i + 1}', LABEL_W + i * (CW * S + 24), HEAD_H + CH * S + GAP + 20, CW, 32))
    return out

def guides(d, name, x, y, w, h):
    box(d, x, y, w * S, h * S)
    label(d, x + 4, y - 22, name, 15)
    px = x + POLE_X * S
    if h == CH:
        dashed(d, (px, y + 2), (px, y + h * S - 2), YEL, (4, 6), 1)                         # the hero's centre line
        dashed(d, (x + 2, y + BAR_Y * S), (x + w * S - 2, y + BAR_Y * S), YEL, (10, 4), 2)  # crossbar line
        if name != 'POLE':
            cx0, cx1 = px - CLOTH_W * S // 2, px + CLOTH_W * S // 2                       # cloth width, full length
            dashed(d, (cx0, y + BAR_Y * S), (cx0, y + (BAR_Y + CLOTH_L) * S), GRN, (3, 5), 1)
            dashed(d, (cx1, y + BAR_Y * S), (cx1, y + (BAR_Y + CLOTH_L) * S), GRN, (3, 5), 1)
            dashed(d, (cx0, y + (BAR_Y + CLOTH_L) * S), (cx1, y + (BAR_Y + CLOTH_L) * S), GRN, (3, 5), 1)
        else:
            dashed(d, (x + 2, y + MOUNT_Y * S), (x + w * S - 2, y + MOUNT_Y * S), YEL, (10, 4), 2)  # mount line
    else:  # a roll: its centre line and its top (the edge of the unrolled cloth)
        dashed(d, (px, y + 2), (px, y + h * S - 2), YEL, (4, 6), 1)
        dashed(d, (x + 2, y + 8 * S), (x + w * S - 2, y + 8 * S), YEL, (10, 4), 2)

def sheet(title, cells, notes, art=None):
    im = Image.new('RGBA', (W, H), MAG); d = ImageDraw.Draw(im)
    label(d, 12, 10, title, 18)
    for i, n in enumerate(notes): label(d, 12, H - 22 * (len(notes) - i) - 6, n, 13)
    for name, x, y, w, h in cells:
        if art is not None:
            a = art(name, w, h)
            if a is not None: im.alpha_composite(a.resize((w * S, h * S), Image.NEAREST), (x, y))
        guides(d, name, x, y, w, h)
    return im

# ------------------------------------------------------------------ flat layout example (placement, not style)
def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
IND, GOLD, STEEL, WOOD = RAMPS['Night indigo (the field)'], RAMPS['Reliquary gold (heraldic ochre: border, emblem, finial)'], RAMPS['Grave steel (shield face, fittings, rings)'], RAMPS['Leather (the ash-wood pole, lashings)']
RIM, HOLY = RAMPS['Moonlit rim (signature, right edges)'], RAMPS['Holy (emissive, RALLY frames only)']

def wave(y, k, amp):
    return math.sin(k * math.tau / 6 - y * 0.09) * amp * (0.15 + y / CLOTH_L)

def cloth_img(k, amp, rally=0):
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    h = CLOTH_W // 2
    left = [(POLE_X - h + wave(y, k, amp), BAR_Y + y) for y in range(0, CLOTH_L - 11, 2)]
    right = [(POLE_X + h + wave(y, k, amp), BAR_Y + y) for y in range(0, CLOTH_L - 11, 2)][::-1]
    yb = CLOTH_L - 12
    tail = [(POLE_X - h + wave(yb + 11, k, amp), BAR_Y + CLOTH_L), (POLE_X + wave(yb, k, amp), BAR_Y + yb + 2), (POLE_X + h + wave(yb + 11, k, amp), BAR_Y + CLOTH_L)]  # swallowtail
    poly = left + tail + right
    d.polygon(poly, fill=hexc(IND[3]), outline=hexc(IND[0]))
    # folds: darker bands that travel with the wave
    for y in range(0, CLOTH_L - 12, 2):
        s = math.sin(k * math.tau / 6 - y * 0.09)
        if s < -0.35: d.line([(POLE_X - h + 2 + wave(y, k, amp), BAR_Y + y), (POLE_X - 4 + wave(y, k, amp), BAR_Y + y)], fill=hexc(IND[2]))
        if s > 0.55: d.line([(POLE_X + 3 + wave(y, k, amp), BAR_Y + y), (POLE_X + h - 3 + wave(y, k, amp), BAR_Y + y)], fill=hexc(IND[4]))
    for y in range(2, CLOTH_L - 12, 2):  # the gold border and the moonlit rim on the right edge
        im.putpixel((int(POLE_X - h + 1 + wave(y, k, amp)), BAR_Y + y), hexc(GOLD[4]))
        im.putpixel((int(POLE_X + h - 2 + wave(y, k, amp)), BAR_Y + y), hexc(GOLD[3]))
        if (y // 4) % 2: im.putpixel((int(POLE_X + h - 1 + wave(y, k, amp)), BAR_Y + y), hexc(RIM[1]))
    d.rectangle([POLE_X - h, BAR_Y, POLE_X + h - 1, BAR_Y + 3], fill=hexc(GOLD[2]))  # the hem sleeve over the crossbar
    for i in range(5): im.putpixel((POLE_X - h + 3 + i * 8, BAR_Y + 1), hexc(STEEL[5]))  # rings
    # the emblem: a tower shield with a portcullis grid, a lance across it
    ey, ex = BAR_Y + 34, POLE_X + int(wave(34, k, amp))
    sh = [(ex - 9, ey - 10), (ex + 9, ey - 10), (ex + 9, ey + 4), (ex, ey + 12), (ex - 9, ey + 4)]
    d.polygon(sh, fill=hexc(STEEL[4] if not rally else HOLY[4]), outline=hexc(STEEL[1]))
    for gx in (-4, 0, 4): d.line([(ex + gx, ey - 8), (ex + gx, ey + 6 - abs(gx))], fill=hexc(STEEL[2]))
    for gy in (-5, 0): d.line([(ex - 7, ey + gy), (ex + 7, ey + gy)], fill=hexc(STEEL[2]))
    d.line([(ex - 12, ey + 13), (ex + 12, ey - 14)], fill=hexc(GOLD[5] if not rally else HOLY[5]), width=2)
    if rally:  # emissive: the emblem and the border catch holy fire
        for y in range(4, CLOTH_L - 12, 3): im.putpixel((int(POLE_X - h + wave(y, k, amp)), BAR_Y + y), hexc(HOLY[min(5, 3 + rally // 2)]))
        d.point([(ex + dx, ey + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)], fill=hexc(HOLY[5]))
    return im

def pole_img():
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([POLE_X - 1, BAR_Y - 6, POLE_X + 1, MOUNT_Y], fill=hexc(WOOD[3]))
    d.line([(POLE_X - 1, BAR_Y - 6), (POLE_X - 1, MOUNT_Y)], fill=hexc(WOOD[4])); d.line([(POLE_X + 1, BAR_Y - 6), (POLE_X + 1, MOUNT_Y)], fill=hexc(WOOD[1]))
    for y in (BAR_Y + 10, MOUNT_Y - 14, MOUNT_Y - 4): d.rectangle([POLE_X - 2, y, POLE_X + 2, y + 2], fill=hexc(STEEL[3]))  # iron bands
    hb = CLOTH_W // 2 + 3
    d.rectangle([POLE_X - hb, BAR_Y - 1, POLE_X + hb, BAR_Y + 1], fill=hexc(WOOD[2])); d.line([(POLE_X - hb, BAR_Y - 1), (POLE_X + hb, BAR_Y - 1)], fill=hexc(WOOD[4]))
    for sx in (-1, 1): d.rectangle([POLE_X + sx * hb - 2, BAR_Y - 2, POLE_X + sx * hb + 2, BAR_Y + 2], fill=hexc(GOLD[4]))  # knobs
    d.polygon([(POLE_X, BAR_Y - 15), (POLE_X - 3, BAR_Y - 8), (POLE_X, BAR_Y - 6), (POLE_X + 3, BAR_Y - 8)], fill=hexc(GOLD[5]), outline=hexc(GOLD[2]))  # finial
    return im

def roll_img(k):
    im = Image.new('RGBA', (CW, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    h = CLOTH_W // 2 + 1; o = (-1, 0, 1)[k]
    d.rounded_rectangle([POLE_X - h + o, 8, POLE_X + h - 1 + o, 15], 3, fill=hexc(IND[3]), outline=hexc(IND[0]))
    d.line([(POLE_X - h + 2 + o, 9), (POLE_X + h - 3 + o, 9)], fill=hexc(IND[5]))
    d.line([(POLE_X - h + 1 + o, 14), (POLE_X + h - 2 + o, 14)], fill=hexc(IND[1]))
    for sx in (-h, h - 1): d.rectangle([POLE_X + sx + o - (0 if sx < 0 else 1), 9, POLE_X + sx + o + (1 if sx < 0 else 0), 14], fill=hexc(GOLD[4]))
    return im

def example_art(name, w, h):
    if name.startswith('CALM'): return cloth_img(int(name[-1]) - 1, 3)
    if name.startswith('RALLIED'): return cloth_img(int(name[-1]) - 1, 7)
    if name.startswith('RALLY'): return cloth_img(int(name[-1]) - 1, 9, rally=int(name[-1]))
    if name == 'POLE': return pole_img()
    if name.startswith('ROLL'): return roll_img(int(name[-1]) - 1)

# ------------------------------------------------------------------ references
def hero_reference():
    """The Lancer (armor 001) at 3x with the banner placed on his back, and the in-game size beside it."""
    sheet_ = Image.open(os.path.join(ROOT, 'assets', 'sprites', 'gear', 'lancer', 'armor.webp')).convert('RGBA')
    hero = sheet_.crop((0, 0, 128, 192))
    a = np.array(hero)[..., 3]; ys = np.where(a.max(1) > 0)[0]
    k = 108 / (ys[-1] - ys[0] + 1)                                     # to 108 AP crown-to-sole
    hero = hero.resize((round(128 * k), round(192 * k)), Image.NEAREST)
    frame = Image.new('RGBA', (128, 192), (0, 0, 0, 0))
    hy = np.where(np.array(hero)[..., 3].max(1) > 0)[0]; hx = np.where(np.array(hero)[..., 3].max(0) > 0)[0]
    frame.alpha_composite(hero, (64 - (hx[0] + hx[-1]) // 2, 183 - hy[-1]))
    out = Image.new('RGBA', (W, H), (24, 20, 26, 255)); d = ImageDraw.Draw(out)
    def place(x0, y0, s, banner_f):
        im = Image.new('RGBA', (128, 192), (0, 0, 0, 0))
        im.alpha_composite(pole_img(), (32, 12))
        cl = cloth_img(1, 3); cut = BAR_Y + 4 + int(CLOTH_L * banner_f)
        cl = cl.crop((0, 0, CW, cut)); im.alpha_composite(cl, (32, 12))
        if banner_f < 1: im.alpha_composite(roll_img(1), (32, 12 + cut - 8 - 4))
        im.alpha_composite(frame)
        out.alpha_composite(im.resize((128 * s, 192 * s), Image.NEAREST), (x0, y0))
    label(d, 20, 14, 'THE LANCER WITH HIS BANNER (layout mock-up, 3x). Banner drawn BEHIND him, centred on his back.', 17)
    for i, f in enumerate((0, 0.5, 1)):
        place(20 + i * 410, 70, 3, f); label(d, 40 + i * 410, 660, f'Valor {int(f * 100)}%: ' + ('furled (roll under the crossbar)' if f == 0 else 'half unrolled' if f < 1 else 'fully unfurled'), 14)
    gx = 20 + 3 * 410 - 30
    label(d, gx, 70, 'IN GAME (1x, 2x):', 14)
    im = Image.new('RGBA', (128, 192), (0, 0, 0, 0)); im.alpha_composite(pole_img(), (32, 12)); im.alpha_composite(cloth_img(1, 3), (32, 12)); im.alpha_composite(frame)
    small = im.resize((71, 107), Image.LANCZOS); out.alpha_composite(small, (gx, 100)); out.alpha_composite(small.resize((142, 214), Image.NEAREST), (gx + 80, 100))
    notes = ['Hero: 108 AP crown to sole, soles on y 183, centre line x 64 (the dashed yellow line in the templates).',
             'Cell (0,0) = hero frame (32,12): crossbar at hero y 28 (above his head), pole meets his back at hero y 136.',
             'The pole, the cloth and the roll are separate layers; the game stacks pole -> cloth -> roll, then the hero.',
             'He faces screen-right; the game mirrors him (and the banner) for left: no text, a symmetric design.']
    for i, n in enumerate(notes): label(d, 20, 720 + i * 26, n, 14)
    return out

def palette_card():
    out = Image.new('RGBA', (1100, 60 + 70 * len(RAMPS)), (24, 20, 26, 255)); d = ImageDraw.Draw(out)
    label(d, 16, 12, 'BANNER PALETTE: exact hex targets (dark -> light). 20 colours at most in any one frame.', 16)
    for i, (name, ramp) in enumerate(RAMPS.items()):
        y = 50 + i * 70; label(d, 16, y, name, 14)
        for j, h in enumerate(ramp):
            d.rectangle([16 + j * 110, y + 22, 16 + j * 110 + 100, y + 58], fill=hexc(h)); label(d, 22 + j * 110, y + 30, h, 13)
    return out

# ------------------------------------------------------------------ text
README = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_banner_kit', 'README.md'), encoding='utf8').read()
SPEC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_banner_kit', 'SPEC.md'), encoding='utf8').read()
STYLE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_banner_kit', 'STYLE.md'), encoding='utf8').read()
PROMPT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_banner_kit', 'PROMPT.txt'), encoding='utf8').read()

def png(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return b.getvalue()

def build():
    n1 = ['Cyan dashed box = the 64 x 128 AP frame (192 x 384 px here: 1 AP = a 3 x 3 block). Yellow: hero centre line and crossbar line.',
          'Green dashed = the cloth at full length (40 AP wide, 88 AP from the crossbar). Waves may sway 6 AP past the green sides.',
          'Draw ONLY the cloth (no pole). Background stays flat magenta #FF00FF. Remove every label and guide in your reply.']
    n2 = ['POLE: pole + crossbar + finial, centred on the yellow line; the second yellow line is where it meets his back (bottom end).',
          'RALLY 1-4: the full cloth blazing with holy light when the Order charges. ROLL 1-3: the rolled-up cloth, its top edge on the yellow line.',
          'Background stays flat magenta #FF00FF. Remove every label and guide in your reply.']
    files = {
        'PROMPT.txt': PROMPT, 'README.md': README, 'SPEC.md': SPEC, 'STYLE.md': STYLE,
        'templates/banner_sheet1_cloth_template.png': png(sheet('SHEET 1: BANNER CLOTH. Row 1 CALM (waving, Valor below full). Row 2 RALLIED (whipping in a gale, Valor full).', cloth_cells(), n1)),
        'templates/banner_sheet2_parts_template.png': png(sheet('SHEET 2: BANNER PARTS. The pole, the RALLY flare, the cloth roll.', parts_cells(), n2)),
        'examples/banner_sheet1_layout_example.png': png(sheet('LAYOUT EXAMPLE ONLY (placement and motion, NOT the art style): sheet 1', cloth_cells(), n1, example_art)),
        'examples/banner_sheet2_layout_example.png': png(sheet('LAYOUT EXAMPLE ONLY (placement and motion, NOT the art style): sheet 2', parts_cells(), n2, example_art)),
        'reference/lancer_with_banner_reference.png': png(hero_reference()),
        'reference/banner_palette.png': png(palette_card()),
    }
    ingame = os.path.join(ROOT, 'docs', 'art_kits', 'lancer_banner_ingame.png')
    if os.path.exists(ingame): files['reference/banner_in_game_now.png'] = open(ingame, 'rb').read()
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
