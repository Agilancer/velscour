"""Lancer cloth banner: paint templates for the skin and the pole, and stand-in art.

  python tools/lancer_banner_templates.py                 # templates into docs/art_kits/lancer_banner/
  python tools/lancer_banner_templates.py --placeholders  # also (re)write the stand-in assets/fx/lancer/banner_*.png

The sizes match BANNER in src/gfx/lancerbanner.js (2 texels per world px). Stand-ins are only written when the
file is missing or --placeholders is given, so the user's painted art is never overwritten by a plain run.

  python tools/lancer_banner_templates.py --import <skin image> <pole image>
fits big painted art (any size, transparent background) to the game sizes: the skin is cropped to its opaque pixels
and resized to 48x96; the pole is scaled so its crossbar spans the 64 px width and lands on y 24, and its shaft below
is stretched down to the anchor at y 200. The originals are kept in assets/source/classes/lancer/banner/.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, 'docs', 'art_kits', 'lancer_banner')
FX = os.path.join(ROOT, 'assets', 'fx', 'lancer')
SKIN_W, SKIN_H, COLS, ROWS = 48, 96, 5, 9                  # texels; mesh nodes
POLE_W, POLE_H, AX, AY, BAR_Y, CX0, CX1 = 64, 200, 32, 200, 24, 8, 56
SLEEVE = 4                                                 # top texel rows that wrap the crossbar


def font(n):
    try: return ImageFont.load_default(size=n)
    except TypeError: return ImageFont.load_default()


def skin_template():
    """1x paint template: transparent, with faint guides on their own colours (delete them before export)."""
    im = Image.new('RGBA', (SKIN_W, SKIN_H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, SKIN_W - 1, SLEEVE - 1], fill=(255, 80, 80, 70))
    for c in range(1, COLS - 1): x = c * SKIN_W // (COLS - 1); d.line([x, 0, x, SKIN_H - 1], fill=(0, 200, 255, 60))
    for r in range(1, ROWS - 1): y = r * SKIN_H // (ROWS - 1); d.line([0, y, SKIN_W - 1, y], fill=(0, 200, 255, 60))
    d.line([SKIN_W // 2, 0, SKIN_W // 2, SKIN_H - 1], fill=(255, 220, 0, 70))
    d.polygon([(0, 0), (SKIN_W - 1, 0), (SKIN_W - 1, 84), (SKIN_W // 2, SKIN_H - 1), (0, 84)], outline=(255, 255, 255, 140))
    return im


def pole_template():
    im = Image.new('RGBA', (POLE_W, POLE_H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, POLE_W - 1, BAR_Y - 7], fill=(255, 220, 0, 40))                  # finial zone
    d.rectangle([0, BAR_Y - 6, POLE_W - 1, BAR_Y + 5], fill=(255, 80, 80, 50))          # crossbar zone
    d.line([CX0, BAR_Y, CX1 - 1, BAR_Y], fill=(255, 255, 255, 200))                     # cloth hangs here
    d.rectangle([AX - 3, BAR_Y + 6, AX + 2, POLE_H - 1], fill=(0, 200, 255, 50))        # shaft, 6 texels
    d.line([AX, 0, AX, POLE_H - 1], fill=(255, 220, 0, 70))
    d.rectangle([AX - 1, POLE_H - 2, AX, POLE_H - 1], fill=(255, 0, 255, 255))          # anchor
    return im


def checker(w, h, s):
    im = Image.new('RGBA', (w, h), (58, 58, 66, 255)); d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2: d.rectangle([x, y, x + s - 1, y + s - 1], fill=(72, 72, 82, 255))
    return im


def guide(tpl, art, k, notes, title, marks):
    """An annotated, enlarged sheet: the template and the stand-in side by side, then the notes."""
    w, h = tpl.size; W, H = w * k, h * k; pad = 24; f, fb = font(15), font(20)
    sheet = Image.new('RGBA', (pad * 3 + W * 2 + 420, H + pad * 2 + 40), (30, 30, 36, 255)); d = ImageDraw.Draw(sheet)
    d.text((pad, 8), title, fill=(255, 230, 150), font=fb)
    for i, (src, label) in enumerate([(tpl, 'template (guides only)'), (art, 'stand-in art')]):
        x = pad + i * (W + pad); bg = checker(W, H, k * 4)
        bg.alpha_composite(src.resize((W, H), Image.NEAREST)); sheet.paste(bg, (x, pad + 30))
        d.text((x, pad + 34 + H), label, fill=(200, 200, 210), font=f)
    for (tx, ty, txt, col) in marks:                       # labels on the template, on a dark tab
        bx, by = pad + tx * k + 6, pad + 30 + ty * k - 9; tw = d.textlength(txt, font=f)
        d.rectangle([bx - 3, by - 1, bx + tw + 3, by + 18], fill=(20, 20, 26, 230)); d.text((bx, by), txt, fill=col, font=f)
    y = pad + 30
    for line in notes:
        d.text((pad * 3 + W * 2, y), line, fill=(225, 225, 235), font=f); y += 21
    return sheet


def skin_art():
    """Stand-in: the Order's blue banner with silver trim, a pointed foot and the lance-over-shield emblem."""
    im = Image.new('RGBA', (SKIN_W, SKIN_H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    shape = [(0, 0), (SKIN_W - 1, 0), (SKIN_W - 1, 84), (SKIN_W // 2, SKIN_H - 1), (SKIN_W // 2 - 1, SKIN_H - 1), (0, 84)]
    d.polygon(shape, fill=(42, 74, 154, 255), outline=(216, 224, 240, 255))
    d.polygon([(2, 2), (SKIN_W - 3, 2), (SKIN_W - 3, 83), (SKIN_W // 2, SKIN_H - 4), (SKIN_W // 2 - 1, SKIN_H - 4), (2, 83)], outline=(30, 52, 116, 255))
    d.rectangle([0, 0, SKIN_W - 1, SLEEVE - 1], fill=(28, 48, 110, 255)); d.line([0, SLEEVE, SKIN_W - 1, SLEEVE], fill=(216, 224, 240, 255))
    ex, ey = SKIN_W // 2, 40                                                           # emblem
    d.polygon([(ex - 10, ey - 11), (ex + 9, ey - 11), (ex + 9, ey + 2), (ex, ey + 12), (ex - 1, ey + 12), (ex - 10, ey + 2)], fill=(216, 224, 240, 255), outline=(150, 160, 190, 255))
    d.line([ex - 13, ey + 13, ex + 12, ey - 15], fill=(255, 216, 96, 255), width=3)
    d.polygon([(ex + 12, ey - 15), (ex + 7, ey - 13), (ex + 10, ey - 10)], fill=(255, 240, 180, 255))
    for x in range(6, SKIN_W - 5, 6): d.point((x, 70), fill=(216, 224, 240, 255))      # a stitched band
    return im


def pole_art():
    im = Image.new('RGBA', (POLE_W, POLE_H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([AX - 3, BAR_Y - 2, AX + 2, POLE_H - 1], fill=(90, 74, 48, 255))
    d.line([AX - 3, BAR_Y - 2, AX - 3, POLE_H - 1], fill=(130, 108, 70, 255)); d.line([AX + 2, BAR_Y - 2, AX + 2, POLE_H - 1], fill=(56, 44, 28, 255))
    for y in range(40, POLE_H - 4, 30): d.rectangle([AX - 3, y, AX + 2, y + 2], fill=(150, 130, 80, 255))  # bindings
    d.rectangle([2, BAR_Y - 2, POLE_W - 3, BAR_Y + 2], fill=(138, 122, 80, 255)); d.line([2, BAR_Y - 2, POLE_W - 3, BAR_Y - 2], fill=(190, 170, 110, 255))
    for x in (0, POLE_W - 5): d.rectangle([x, BAR_Y - 3, x + 4, BAR_Y + 3], fill=(224, 192, 96, 255))
    d.polygon([(AX - 1, 0), (AX, 0), (AX + 5, 12), (AX, BAR_Y - 4), (AX - 1, BAR_Y - 4), (AX - 6, 12)], fill=(224, 192, 96, 255), outline=(150, 120, 50, 255))
    d.rectangle([AX - 4, BAR_Y - 6, AX + 3, BAR_Y - 3], fill=(176, 144, 64, 255))
    return im


SKIN_NOTES = [
    'BANNER SKIN  -  banner_skin.png',
    '',
    'Size: 48 x 96 px (RGBA PNG). 2 texels per world px, so',
    '  in game it is 24 x 48 world px (about 3 screen px per',
    '  texel at default zoom). Any 1:2 image also works',
    '  (96x192, 192x384): it is stretched onto the cloth.',
    '',
    'Alpha is the silhouette. The mesh is a rectangle; paint',
    '  swallowtails, points, fringes, holes as transparency.',
    '  The white outline is the stand-in shape (optional).',
    '',
    'Red strip (top 4 rows): the sleeve that wraps the',
    '  crossbar. Keep it opaque edge to edge or the cloth',
    '  looks like it floats.',
    'Blue lines: the 4 x 8 physics mesh (12 px cells). Each',
    '  cell bends as one flat piece, so put fine detail',
    '  inside cells, not across many crease lines.',
    'Yellow line: centre; the pole runs behind it.',
    '',
    'Front only: the back side is the same image mirrored',
    '  and shaded darker, like printed cloth seen through.',
    '  Lighting is added by the game; paint it flat-lit.',
    'Unfurling: with low Valor only the top of the skin',
    '  shows (min 18%) and the rest is a roll at the bottom,',
    '  so keep the key emblem in the top half if you can.',
    '',
    'Delete the guide layer before saving. Drop the file at',
    '  assets/fx/lancer/banner_skin.png',
]
POLE_NOTES = [
    'BANNER POLE  -  banner_pole.png',
    '',
    'Size: 64 x 200 px (RGBA PNG), 2 texels per world px',
    '  = 32 x 100 world px. Drawn upright, facing the',
    '  camera, rotated a little about the anchor as he runs.',
    '',
    'Magenta pixel (x 31-32, y 198-199): the anchor, the',
    '  shoulder mount. Bottom centre of the image sits',
    '  between his shoulders, 26 world px above his feet.',
    'Blue column (x 29-34): the shaft, ~6 texels wide.',
    'White line (y 24, x 8-56): the cloth hangs from here.',
    '  Put the crossbar on this line; its ends may run out',
    '  to the image edge (x 0-63) for knobs or caps.',
    'Red band (y 18-29): crossbar zone.',
    'Yellow zone (y 0-17): finial / spear-tip / ornament.',
    '',
    'The cloth draws in front of the pole at rest and behind',
    '  it when the wind throws it back, so paint the whole',
    '  shaft: it shows when the banner drags.',
    'Below the cloth the shaft passes behind his head and',
    '  body, so the lower part is mostly hidden.',
    '',
    'Drop the file at assets/fx/lancer/banner_pole.png',
]


SRC = os.path.join(ROOT, 'assets', 'source', 'classes', 'lancer', 'banner')


def _cut(path):
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 128 else 0); im.putalpha(a)
    return im.crop(a.getbbox())


def _shrink(im, w, h):
    out = im.resize((w, h), Image.LANCZOS)
    out.putalpha(out.getchannel('A').point(lambda v: 255 if v > 110 else 0))
    return out


def import_art(skin_path, pole_path):
    import shutil
    os.makedirs(SRC, exist_ok=True); os.makedirs(FX, exist_ok=True)
    for src, name in ((skin_path, 'banner_skin_source'), (pole_path, 'banner_pole_source')):
        shutil.copyfile(src, os.path.join(SRC, name + os.path.splitext(src)[1].lower()))
    _shrink(_cut(skin_path), SKIN_W, SKIN_H).save(os.path.join(FX, 'banner_skin.png'))
    pole = _cut(pole_path); W, H = pole.size
    rows = [sum(1 for x in range(W) if pole.getpixel((x, y))[3]) for y in range(H)]
    bar = [y for y in range(H) if rows[y] > W * 0.6]                       # the crossbar's rows
    cy = (bar[0] + bar[-1]) / 2; s = min(POLE_W / W, BAR_Y / max(1, cy))  # the crossbar spans the width; the finial fits above
    cut = bar[-1] + 1
    while cut < H and rows[cut] > rows[H // 2] * 1.15: cut += 1                # past the collar under the crossbar
    tw, th = max(1, round(W * s)), max(1, round(cut * s))
    top = _shrink(pole.crop((0, 0, W, cut)), tw, th)
    out = Image.new('RGBA', (POLE_W, POLE_H), (0, 0, 0, 0)); ox = AX - tw // 2; oy = round(BAR_Y - cy * s)
    out.alpha_composite(top, (ox, max(0, oy)))
    rest = POLE_H - (max(0, oy) + th)
    if rest > 0: out.alpha_composite(_shrink(pole.crop((0, cut, W, H)), tw, rest), (ox, max(0, oy) + th))
    out.save(os.path.join(FX, 'banner_pole.png'))
    print('imported', os.path.join(FX, 'banner_skin.png'), os.path.join(FX, 'banner_pole.png'), f'(pole scale {s:.4f}, crossbar at y {oy + cy * s:.1f})')


def main():
    if '--import' in sys.argv:
        i = sys.argv.index('--import'); return import_art(sys.argv[i + 1], sys.argv[i + 2])
    os.makedirs(KIT, exist_ok=True); os.makedirs(FX, exist_ok=True)
    st, pt, sa, pa = skin_template(), pole_template(), skin_art(), pole_art()
    st.save(os.path.join(KIT, 'banner_skin_template.png')); pt.save(os.path.join(KIT, 'banner_pole_template.png'))
    guide(st, sa, 8, SKIN_NOTES, 'Lancer banner skin  48 x 96  (shown 8x)',
          [(1, 2, 'sleeve', (255, 120, 120)), (13, 18, 'mesh cell 12x12', (90, 210, 255)), (25, 60, 'centre', (255, 230, 90))]).save(os.path.join(KIT, 'banner_skin_guide.png'))
    guide(pt, pa, 4, POLE_NOTES, 'Lancer banner pole  64 x 200  (shown 4x)',
          [(1, 6, 'finial', (255, 230, 90)), (1, BAR_Y - 9, 'crossbar', (255, 120, 120)), (CX0, BAR_Y + 4, 'cloth hangs here', (255, 255, 255)),
           (AX + 4, 120, 'shaft', (90, 210, 255)), (AX + 2, POLE_H - 4, 'anchor', (255, 90, 255))]).save(os.path.join(KIT, 'banner_pole_guide.png'))
    sa.save(os.path.join(KIT, 'banner_skin_example.png')); pa.save(os.path.join(KIT, 'banner_pole_example.png'))
    force = '--placeholders' in sys.argv
    for name, im in (('banner_skin.png', sa), ('banner_pole.png', pa)):
        dst = os.path.join(FX, name)
        if force or not os.path.exists(dst): im.save(dst); print('stand-in', dst)
    print('templates in', KIT)


if __name__ == '__main__':
    main()
