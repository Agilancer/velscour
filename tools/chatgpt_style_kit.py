"""
Build the Grim Nocturne character redesign kit: docs/art_kits/ChatGPT_Style_Redesign_Kit.zip.
The texts live in docs/art_style/ (art bible, master prompt, sheet prompts); this script writes the prompt pack
(05_PROMPT_PACK.md, from tools/style_classes.py), adds the reference sheets,
the palette files and the pose-locked templates, and zips everything. See docs/art_style/00_START_HERE.md.

    python tools/chatgpt_style_kit.py                  # build the zip
    python tools/chatgpt_style_kit.py --unpacked DIR   # also write the kit folder to DIR, to look at it

Approved pose masters (assets/source/pose_masters/<class>.png, from `chatgpt_art.py posemaster`) replace the
stand-in in that class's armor and overlay templates, so rebuild after importing one.
Geometry (frame, landmarks, zones, scales) lives in tools/chatgpt_art.py, shared with the importer.
Needs: pip install pillow numpy scipy
"""
import io, json, os, re, shutil, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chatgpt_art import (W, H, ROOT, CLASSES, CANON, JOINTS, POSE_S, POSE_CELL, ZONES, OVL_S, OVL_ROWS, ARMOR_S,
                         ARMOR_TOP, ARMOR_EX_TOP, ARMOR_FRAMES, overlay_cells)
import chatgpt_art_kits as K
from chatgpt_art_kits import font, label, dashed_line, class_frames, title

TEXTS = os.path.join(ROOT, 'docs', 'art_style')
MASTERS = os.path.join(ROOT, 'assets', 'source', 'pose_masters')
MAG, INK, PALE = (255, 0, 255, 255), (255, 255, 255, 255), (255, 210, 122, 255)
CY, YE = (0, 255, 255, 255), (255, 255, 0, 255)       # guide colours: the importer drops exactly these
LINES = ['crown', 'chin', 'shoulders', 'elbows', 'crotch', 'knees', 'soles']
RARITY_SHOW = [(10, 'common'), (28, 'uncommon'), (44, 'rare'), (58, 'epic'), (69, 'legendary'), (78, 'mythic')]


# ---------------------------------------------------------------- the hero on the new grid
def rescale_hero(im):
    """A current 128 x 192 hero frame moved onto the new grid: 108 AP crown to sole, crown y 75, head centre x 65."""
    a = np.asarray(im)[:, :, 3] > 150
    ys, _ = np.nonzero(a)
    t, b = ys.min(), ys.max()
    k = (CANON['soles'] - CANON['crown']) / (b - t)
    hx = np.nonzero(a[t:t + 12].any(axis=0))[0].mean()
    q = im.crop((0, t, 128, b + 1)).resize((round(128 * k), CANON['soles'] - CANON['crown'] + 1), Image.LANCZOS)
    f = Image.new('RGBA', (128, 192), (0, 0, 0, 0))
    f.alpha_composite(q, (int(round(JOINTS['head'][0] - hx * k)), CANON['crown']))
    return f


def master(cls):
    """(frame, approved): the approved pose master, else the current hero moved onto the new grid as a stand-in."""
    p = os.path.join(MASTERS, cls + '.png')
    if os.path.exists(p):
        return Image.open(p).convert('RGBA'), True
    return rescale_hero(class_frames(cls)[1][0]), False


def contour(frame):
    m = np.asarray(frame)[:, :, 3] > 100
    return m & ~ndimage.binary_erosion(m)


def draw_guides(d, frame, x0, y0, k, zone=None, lines=True, joints=True):
    """The stance on a frame drawn at k x scale with its top-left at (x0, y0): dotted contour, landmark lines,
    joint circles. zone (x, y, w, h in AP) limits it to that part of the frame."""
    zx, zy, zw, zh = zone or (0, 0, 128, 192)
    ys, xs = np.nonzero(contour(frame)[zy:zy + zh, zx:zx + zw])
    for i, (y, x) in enumerate(zip(ys, xs)):
        if (x + y) % 2 == 0:
            cx, cy = x0 + x * k + k // 2, y0 + y * k + k // 2
            d.rectangle((cx - 1, cy - 1, cx, cy), fill=CY)
    if lines:
        for n in LINES:
            y = CANON[n]
            if zy <= y < zy + zh:
                yy = y0 + (y - zy) * k + k // 2
                dashed_line(d, (x0, yy), (x0 + zw * k, yy), YE, (6, 6), 1)
    if joints:
        r = 3 * k
        for n, (jx, jy) in JOINTS.items():
            if n != 'head' and zx <= jx < zx + zw and zy <= jy < zy + zh:
                cx, cy = x0 + (jx - zx) * k + k // 2, y0 + (jy - zy) * k + k // 2
                d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=CY, width=2)


def ruler(d, x0, y0, k):
    """AP ticks down the left of a frame: every 8 AP, numbered every 24."""
    for y in range(0, 193, 8):
        yy = y0 + y * k
        d.line((x0 - (10 if y % 24 == 0 else 5), yy, x0 - 1, yy), fill=INK, width=1)
        if y % 24 == 0 and k >= 3:
            label(d, x0 - 44, yy - 7, str(y), 11)


def frame_box(d, x0, y0, k):
    # guide cyan, not white: frames sit edge to edge, so a border also lands on the neighbour's first art pixels
    d.rectangle((x0 - 1, y0 - 1, x0 + 128 * k, y0 + 192 * k), outline=CY, width=2)


# ---------------------------------------------------------------- palette (parsed from the art bible)
def palette():
    ramps = []
    text = open(os.path.join(TEXTS, '01_VELSCOUR_ART_BIBLE.md'), encoding='utf-8').read()
    sec = text[text.index('## 6. The master palette'):text.index('## 7.')]
    for line in sec.splitlines():
        m = re.match(r'^\| ([^|]+?) \| ((?:`#[0-9a-f]{6}` ?)+)\|$', line.strip())
        if m:
            ramps.append((m.group(1).strip(), re.findall(r'#[0-9a-f]{6}', m.group(2))))
    return ramps


def palette_sheet(ramps):
    sw = 56
    im = Image.new('RGBA', (360 + 7 * sw + 20, 60 + len(ramps) * (sw + 8)), (24, 24, 30, 255))
    d = ImageDraw.Draw(im)
    label(d, 12, 12, 'GRIM NOCTURNE MASTER PALETTE (dark -> light)', 20, PALE)
    for r, (name, cols) in enumerate(ramps):
        y = 56 + r * (sw + 8)
        label(d, 12, y + sw // 2 - 9, name, 15)
        for i, c in enumerate(cols):
            x = 360 + i * sw
            d.rectangle((x, y, x + sw - 4, y + sw - 1), fill=c)
            lum = 0.3 * int(c[1:3], 16) + 0.59 * int(c[3:5], 16) + 0.11 * int(c[5:7], 16)
            d.text((x + 3, y + sw - 14), c[1:], font=font(10), fill=(255, 255, 255, 255) if lum < 110 else (0, 0, 0, 255))
    return im


def palette_files(ramps):
    flat = [c for _, cols in ramps for c in cols]
    hexf = '\n'.join(c[1:] for c in flat) + '\n'
    gpl = 'GIMP Palette\nName: VELSCOUR Grim Nocturne\nColumns: 7\n#\n' + ''.join(
        '%3d %3d %3d\t%s %d\n' % (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), n, i + 1)
        for n, cols in ramps for i, c in enumerate(cols))
    return hexf, gpl


# ---------------------------------------------------------------- references
def lineup():
    im = Image.new('RGBA', (8 * 256, 2 * 420), (30, 30, 36, 255))
    d = ImageDraw.Draw(im)
    for i, cls in enumerate(CLASSES):
        x, y = (i % 8) * 256, (i // 8) * 420
        im.alpha_composite(class_frames(cls)[1][0].resize((256, 384), Image.NEAREST), (x, y + 30))
        label(d, x + 8, y + 6, title(cls), 15, PALE)
    return im


def class_reference(cls):
    fr = class_frames(cls)
    im = Image.new('RGBA', (7 * 256, 470), (30, 30, 36, 255))
    d = ImageDraw.Draw(im)
    label(d, 10, 6, '%s - CURRENT ART (who the hero is: face, hair, skin, build, motifs). The style is being replaced.' % title(cls), 17, PALE)
    for j, (num, rar) in enumerate([(1, 'the hero (armor 001)')] + [(n, r) for n, r in RARITY_SHOW]):
        im.alpha_composite(fr[num][0].resize((256, 384), Image.NEAREST), (j * 256, 40))
        label(d, j * 256 + 8, 430, ('%03d %s' % (num, rar)) if j else rar, 14)
    return im


def stance_reference():
    k = 4
    im = Image.new('RGBA', (1240, 900), (30, 30, 36, 255))
    d = ImageDraw.Draw(im)
    x0, y0 = 80, 60
    d.rectangle((x0, y0, x0 + 128 * k - 1, y0 + 192 * k - 1), fill=(48, 48, 58, 255))
    ruler(d, x0, y0, k)
    frame_box(d, x0, y0, k)
    p = lambda j: (x0 + JOINTS[j][0] * k, y0 + JOINTS[j][1] * k)
    sh_l, sh_r = (x0 + 50 * k, y0 + CANON['shoulders'] * k), (x0 + 80 * k, y0 + CANON['shoulders'] * k)
    hip_l, hip_r = (x0 + 56 * k, y0 + CANON['crotch'] * k), (x0 + 72 * k, y0 + CANON['crotch'] * k)
    el_l, el_r = (x0 + 41 * k, y0 + CANON['elbows'] * k), (x0 + 86 * k, y0 + CANON['elbows'] * k)
    neck = (x0 + 65 * k, y0 + CANON['chin'] * k)
    bone = (230, 230, 240, 255)
    for a, b in [(neck, ((sh_l[0] + sh_r[0]) // 2, sh_l[1])), (sh_l, sh_r), (sh_l, el_l), (el_l, p('fist_l')), (sh_r, el_r),
                 (el_r, p('fist_r')), (((sh_l[0] + sh_r[0]) // 2, sh_l[1]), ((hip_l[0] + hip_r[0]) // 2, hip_l[1])), (hip_l, hip_r),
                 (hip_l, p('knee_l')), (p('knee_l'), p('foot_l')), (hip_r, p('knee_r')), (p('knee_r'), p('foot_r'))]:
        d.line((*a, *b), fill=bone, width=5)
    hx, hy = x0 + 65 * k, y0 + 82 * k
    d.ellipse((hx - 7 * k, y0 + CANON['crown'] * k, hx + 7 * k, y0 + CANON['chin'] * k), outline=bone, width=5)
    d.line((hx + 3 * k, hy, hx + 8 * k, hy), fill=bone, width=4)   # facing right
    draw_guides(d, Image.new('RGBA', (128, 192)), x0, y0, k)
    last = -99
    for n in sorted(LINES + ['eyes', 'belt', 'fists', 'ankles'], key=CANON.get):
        y = max(y0 + CANON[n] * k - 8, last + 16)
        label(d, x0 + 128 * k + 8, y, '%s y %d' % (n, CANON[n]), 13, YE)
        last = y
    tx = 720
    label(d, tx, 60, 'THE POSE LOCK', 26, PALE)
    rows = ['Frame 128 x 192 art pixels (AP), 1 AP drawn as 4x4 here.', 'Hero 108 AP: crown y 75 -> soles y 183.',
            'Three-quarter view facing screen right,', 'turned ~30 deg to the viewer, camera above.', '',
            'Joint targets (x, y):'] + ['  %-7s %s' % (n, v) for n, v in JOINTS.items()] + [
            '', 'Feet planted wider than the shoulders,', 'both soles flat on y 183.', 'Arms a fist away from the body,',
            'elbows slightly bent, hands EMPTY fists.', 'Chin level, eyes looking right.', '',
            'Armor may add bulk: +8 AP per side,', 'pauldrons +6 AP above the shoulders.', 'Joints never move.',
            'The head never changes.']
    for i, r in enumerate(rows):
        label(d, tx, 110 + i * 26, r, 15)
    return im


def scale_guide():
    demo = K.trim(rescale_hero(class_frames('paladin')[1][0]))
    q = demo.convert('RGBA')
    a = np.array(q); op = a[..., 3] > 100
    pal = Image.fromarray(np.ascontiguousarray(a[..., :3])).quantize(15, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    a[..., :3] = np.asarray(pal); a[..., 3] = np.where(op, 255, 0)
    demo = Image.fromarray(a)
    im = Image.new('RGBA', (1500, 640), (30, 30, 36, 255))
    d = ImageDraw.Draw(im)
    label(d, 16, 10, 'ART-PIXEL SCALE GUIDE - SIZE DEMO ONLY (old art resampled to 108 AP and 16 colours; NOT the target style)', 17, PALE)
    x = 40
    for k in (1, 2, 3, 4):
        s = demo.resize((demo.width * k, demo.height * k), Image.NEAREST)
        im.alpha_composite(s, (x, 600 - s.height))
        label(d, x, 600 - s.height - 26, '%dx: 1 AP = %dx%d px' % (k, k, k), 14)
        x += s.width + 60
    label(d, x, 300, 'one AP = one flat block.', 15)
    label(d, x, 326, 'never blurred, never mixed sizes.', 15)
    return im


def world_refs():
    out = {}
    for kind in ('enemies', 'bosses', 'pets', 'npcs'):
        for p, img in K.build(kind).items():
            if p.startswith('examples/'):
                out['reference/world/current_' + os.path.basename(p).replace('_example', '')] = img
    for f in ('1_floors_01-16.png', '5_wall_faces.png', '8_props_01-20.png'):
        out['reference/world/current_biome_' + f] = Image.open(os.path.join(ROOT, 'docs', 'biome_kit', 'examples', f)).convert('RGBA')
    return out


# ---------------------------------------------------------------- templates
def header(d, text, sub):
    label(d, 14, 10, text, 28)
    label(d, 14, 50, sub, 14, PALE)


def style_lock_sheet():
    im, d = Image.new('RGBA', (W, H), MAG), None
    d = ImageDraw.Draw(im)
    header(d, 'STYLE LOCK - 18 MATERIAL SAMPLES', 'Paint each box at 3x (1 art pixel = 3x3 block), palette ramps only, key light upper left, moonlit rim back right.')
    names = ['GRAVE STEEL plate corner, rivets', 'MAIL strip', 'RELIQUARY GOLD trim + 1 gem', 'BLACKENED STEEL + moon rim',
             'LEATHER bracer, stitches', 'WINE CLOTH folded corner', 'NIGHT INDIGO cloth + embroidery', 'WOOL, coarse',
             'BONE carving', 'FUR clump', 'SKIN light (cheek, nose)', 'SKIN medium', 'SKIN deep', 'HAIR lock + rim',
             'GEM with emissive core', 'HELLFIRE tongues', 'FROST crystals', 'ARCANE rune glow']
    for i, n in enumerate(names):
        c, r = i % 6, i // 6
        x, y = 48 + c * 244, 150 + r * 280
        d.rectangle((x - 1, y - 1, x + 192, y + 192), outline=CY, width=2)
        label(d, x, y - 26, n, 12)
    return im


def pose_master_template(cls):
    im = Image.new('RGBA', (W, H), MAG)
    d = ImageDraw.Draw(im)
    fr = class_frames(cls)
    header(d, '%s - POSE MASTER' % title(cls), 'Draw the hero ONCE in the big frame at 4x (1 art pixel = 4x4 block), plain underlayer, bare head, exactly in the stance.')
    d.rectangle((40, 150, 295, 533), fill=(52, 46, 58, 255))
    im.alpha_composite(fr[1][0].resize((256, 384), Image.NEAREST), (40, 150))
    label(d, 40, 540, 'CURRENT DESIGN', 15, PALE)
    label(d, 40, 562, 'identity only: face, hair,', 13)
    label(d, 40, 582, 'skin, build. NOT the style.', 13)
    x0, y0 = POSE_CELL[:2]
    ruler(d, x0, y0, POSE_S)
    frame_box(d, x0, y0, POSE_S)
    draw_guides(d, rescale_hero(fr[1][0]), x0, y0, POSE_S)
    tx = 1010
    label(d, tx, 150, 'LANDMARKS (art pixels)', 17, PALE)
    for i, n in enumerate(LINES + ['eyes', 'belt', 'fists', 'ankles']):
        label(d, tx, 182 + i * 24, '%-9s y %d' % (n, CANON[n]), 14)
    label(d, tx, 482, 'JOINT TARGETS (x, y)', 17, PALE)
    for i, (n, v) in enumerate(JOINTS.items()):
        label(d, tx, 514 + i * 24, '%-7s %s' % (n, v), 14)
    for i, r in enumerate(['cyan dots = stance contour', '(the body may be slimmer, not wider)', 'yellow lines = landmark lines',
                           'cyan circles = fists, knees, feet', 'Remove every guide. Magenta background.', '16 colours incl. transparency.']):
        label(d, tx, 700 + i * 24, r, 13)
    return im


def armor_template(cls):
    im = Image.new('RGBA', (W, H), MAG)
    d = ImageDraw.Draw(im)
    frame, approved = master(cls)
    fr = class_frames(cls)
    header(d, '%s - 5 BODY ARMORS (GRIM NOCTURNE)' % title(cls),
           'Frames at 2x (1 art pixel = 2x2 block). The POSE MASTER in new outfits: same head, same stance on every line and circle.')
    d.rectangle((0, ARMOR_TOP, 255, ARMOR_TOP + 383), fill=(52, 46, 58, 255))
    im.alpha_composite(frame.resize((256, 384), Image.NEAREST), (0, ARMOR_TOP))
    label(d, 6, ARMOR_TOP - 24, 'POSE MASTER' if approved else 'STAND-IN (attach yours)', 15, PALE)
    label(d, 6, ARMOR_TOP + 388, title(cls), 18)
    ex = rescale_hero(fr[K.EXAMPLE_ARMOR][0])
    d.rectangle((0, ARMOR_EX_TOP, 255, ARMOR_EX_TOP + 383), fill=(52, 46, 58, 255))
    im.alpha_composite(ex.resize((256, 384), Image.NEAREST), (0, ARMOR_EX_TOP))
    label(d, 6, ARMOR_EX_TOP - 24, 'OLD STYLE: ideas only', 14, PALE)
    for i, (x0, y0, x1, y1) in enumerate(ARMOR_FRAMES):
        frame_box(d, x0, y0, ARMOR_S)
        draw_guides(d, frame, x0, y0, ARMOR_S)
        label(d, x0 + 8, y0 - 24, 'ARMOR %d' % (i + 1), 15)
        label(d, x0 + 8, y1 + 6, 'rarity: ......', 12, PALE)
    notes = ['RULES', '- Head pixels identical to the pose master. Bare head: no helmet, hood, hat or crown.',
             '- Fists in the circles, soles on the bottom line, every yellow line hit by the same joint.',
             '- Bulk: up to 8 art pixels wider per side; pauldrons up to 6 above the shoulder line.',
             '- Five different design cards, one costume theatre. Colours 16 / 20 / 24 by rarity.',
             '- No weapon or shield. No glow outside the body. Flat magenta. Remove every guide.']
    for i, line in enumerate(notes):
        label(d, 286, 560 + i * 28, line, 16 if i == 0 else 14, PALE if i == 0 else INK)
    return im


def overlay_template(cls):
    im = Image.new('RGBA', (W, H), MAG)
    d = ImageDraw.Draw(im)
    frame, approved = master(cls)
    header(d, '%s - OVERLAYS: 5 HELMETS, 5 GLOVES, 5 BOOTS' % title(cls),
           'At 3x (1 art pixel = 3x3 block). Draw ONLY the piece, exactly over the dotted body part. Everything else magenta.')
    d.rectangle((10, 112, 265, 495), fill=(52, 46, 58, 255))
    im.alpha_composite(frame.resize((256, 384), Image.NEAREST), (10, 112))
    label(d, 14, 500, 'POSE MASTER' if approved else 'STAND-IN', 15, PALE)
    dd = ImageDraw.Draw(im)
    for slot, (zs) in ZONES.items():
        for zx, zy, zw, zh in zs:
            dd.rectangle((10 + zx * 2, 112 + zy * 2, 10 + (zx + zw) * 2, 112 + (zy + zh) * 2), outline=CY, width=2)
    info = {'helmets': 'HELMETS - 40x40 art px, on the skull; open helms leave the face magenta',
            'gloves': 'GLOVES - pairs: screen-left fist, screen-right fist (24x24 each)',
            'boots': 'BOOTS - both legs, 76x40 art px, soles on the yellow line'}
    for slot in ZONES:
        label(d, 290, OVL_ROWS[slot] - 50, info[slot], 15, PALE)
        for i in range(5):
            for box, zone in overlay_cells(slot, i):
                x0, y0, x1, y1 = box
                d.rectangle((x0 - 1, y0 - 1, x1, y1), outline=CY, width=1)
                draw_guides(d, frame, x0, y0, OVL_S, zone, lines=(slot == 'boots'))
            label(d, overlay_cells(slot, i)[0][0][0], OVL_ROWS[slot] - 24, '%s %d' % (slot[:-1].upper(), i + 1), 13)
    notes = ['RULES', '- Each piece fits the pose master exactly where the dots are: same skull, same fists, same legs.',
             '- Only the equipment: no head, face, hands or legs drawn. Transparent (magenta) everywhere else.',
             '- Same costume theatre as its armors. 8-12 colours per piece. Moonlit rim on back-right edges.',
             '- Crests and horns may rise to the cell top. Remove every guide and label.']
    for i, line in enumerate(notes):
        label(d, 290, 660 + i * 28, line, 16 if i == 0 else 14, PALE if i == 0 else INK)
    return im


# ---------------------------------------------------------------- the prompt pack (docs/art_style/05_PROMPT_PACK.md)
ATTACH = 'Attached: STYLE_LOCK.md and style_lock_sheet.png (our approved style)'


def prompt_pack():
    from style_classes import CLASSES as SC
    out = ['# Grim Nocturne prompt pack (ready to paste)', '',
           'Generated by `python tools/chatgpt_style_kit.py` from `tools/style_classes.py`. Every prompt below is complete:',
           'paste `02_MASTER_PROMPT.txt` first in a new chat, wait for "GRIM NOCTURNE READY", then paste the prompt and',
           'attach the files it names. One sheet per message. After each image, check it against the art bible QA list',
           '(section 11) and use the fix prompts in section D.', '',
           '## A. Why the last attempt looked generic, and what changed', '',
           '- FF6 is now the lead (about 60%): costume theatre, one small palette per sprite (16 colours), flat-then-band',
           '  shading, heroic stylised proportions (head 16 art pixels), Amano-style outline-less monsters.',
           '- Every cell starts as a written **design card** (costume source, material twist, hue contrast, silhouette hook);',
           '  no two cells share a line. Cliches are banned by name.',
           '- Every class has its own **costume theatre** and pre-written cards, so ChatGPT never falls back to',
           '  "dark knight / rogue / mage" defaults.', '',
           '## B. Style lock (once for the whole game)', '',
           'Attach `templates/0_style_lock_sheet.png`, `reference/palette.png`, `reference/pixel_scale_guide.png`.', '',
           '```text',
           'SHEET: STYLE LOCK. Attached: the style-lock template (1536x1024, 18 labelled boxes), our palette and the scale guide.',
           'Paint each box as a material sample in GRIM NOCTURNE at 3x scale (one art pixel = a flat 3x3 block), the way a',
           'Square-era SNES/PSX sprite artist would: flat-then-band shading, no gradients, 6-8 colours per box at most, taken',
           'from the palette ramps, key light upper left, the segmented moonlit rim on back-right edges. Make every sample a',
           'small costume detail, not a texture: a riveted plate corner with a stitched leather strap, a strip of mail under a',
           'quilted silk hem, a tarnished gilt trim band with one gem, a stained-glass shard set in lead, brass gauge and',
           'bellows, porcelain plate with a crack, bone lacework, felted wool with a wax seal, a fur clump, three cheeks',
           '(light, medium, deep skin) with a brow and eye in FF6 battle-sprite style, a hair lock, a gem with an emissive',
           'core, hellfire tongues, frost crystals, an arcane rune. Remove all labels and guides. Flat magenta background.',
           '```', '',
           'Then paste `04_STYLE_LOCK_REQUEST.txt`. Keep the sheet and the documents; attach them to every later chat.', '',
           '## C. Per class', '']
    for cls, (hero, skin, under, theatre, hue, shapes, armors, helms, gloves, boots) in SC.items():
        name = title(cls).title()
        out += ['### %s' % name, '',
                '**Theatre:** %s. **Hue contrast:** %s. **Recurring shapes:** %s.' % (theatre, hue, shapes), '',
                '**C1. Pose master** (attach `templates/1_pose_master/%s_pose_master.png`, `reference/classes/%s_current.png`,'
                ' `reference/canonical_stance.png`):' % (cls, cls), '',
                '```text',
                'SHEET: POSE MASTER for the %s. %s, the pose-master template, the current art of this class' % (name.upper(), ATTACH),
                '(who the hero is, NOT the style) and the canonical stance.',
                'Draw ONE figure in the large frame at 4x (one art pixel = a flat 4x4 block): %s,' % hero,
                'as an FF6-style battle sprite at our density: iconic face with a strong brow and clear eyes, 6.75 heads tall,',
                'bold hair shapes, flat-then-band shading, coloured 1 AP outline, moonlit rim on the back-right edges.',
                'Skin from the "%s" ramp (3 tones), hair 2 tones. Wearing only the underlayer: %s.' % (skin, under),
                'Bare head, empty fists. Stance exactly on the template: crown and soles on the top and bottom yellow lines,',
                'chin y 91, shoulders y 96, elbows, crotch and knees on their lines, fists and feet in their cyan circles,',
                'body inside the dotted contour (slimmer is fine, not wider). 16 colours including transparency, counted.',
                'This face must be memorable and new: it will be this hero\'s face in every armor forever.',
                'Keep the left column untouched. Remove all guides and labels. Flat magenta background.',
                '```', '',
                '**C2. First 5 armors** (attach `templates/2_armor/%s_armor.png` rebuilt with the approved pose master, and the'
                ' pose master PNG):' % cls, '',
                '```text',
                'SHEET: 5 BODY ARMORS for the %s. %s, the armor template and the pose master.' % (name.upper(), ATTACH),
                'Theatre: %s. Signature hue contrast: %s. Recurring shapes: %s.' % (theatre, hue, shapes),
                'Frames at 2x (one art pixel = a flat 2x2 block). Each frame: the POSE MASTER (head pixels copied exactly,',
                'stance on every line and circle) wearing a costume from this design card. Write the five cards in your reply,',
                'expanded with 2 concrete details each, then draw:']
        for i, (rar, src, mat, hook) in enumerate(armors, 1):
            out.append('%d. %s - costume: %s; material twist: %s; silhouette hook: %s.' % (i, rar.upper(), src, mat, hook))
        out += ['Make it grim: wear, soot, repairs, stains. Colours: 16 (common/uncommon), 20 (rare/epic), 24 (legendary/',
                'mythic), counted. Bulk up to 8 AP per side, pauldrons up to 6 AP above the shoulders, joints never move.',
                'No helmet, hood, hat or crown. No weapons. Keep the left column as attached. Remove all guides. Magenta background.',
                '```', '',
                'Names file for the importer: `{"class": "%s", "style": "nocturne", "armors": [%s]}`' % (
                    cls, ', '.join('{"name": "...", "rarity": "%s"}' % r for r, *_ in armors)), '',
                '**C3. More armors** (same attachments; repeat as often as you like):', '',
                '```text',
                'SHEET: 5 MORE BODY ARMORS for the %s, rarities [r1, r2, r3, r4, r5]. Invent five NEW design cards from the' % name.upper(),
                'theatre "%s": costume sources, material twists, hue contrasts and silhouette hooks that' % theatre,
                'appear in NONE of the earlier cards in this chat (list the earlier ones first to prove it). Then draw them',
                'exactly as before: pose master head and stance, 2x blocks, colour budgets counted, no cliches.',
                '```', '',
                '**C4. Overlays** (attach `templates/3_overlays/%s_overlays.png` and the pose master):' % cls, '',
                '```text',
                'SHEET: OVERLAYS for the %s. %s, the overlay template and the pose master.' % (name.upper(), ATTACH),
                'At 3x (one art pixel = a flat 3x3 block). Draw ONLY the equipment, exactly over the dotted body part, in the',
                'costume theatre of %s (%s), 8-12 colours each, coloured outline, moonlit rim:' % (theatre.split(':')[0], hue),
                'HELMETS 1-5: %s. Open helms leave the face area magenta.' % helms,
                'GLOVES 1-5 (both fists per pair): %s.' % gloves,
                'BOOTS 1-5 (both legs, soles on the yellow line): %s.' % boots,
                'Rarities left to right: common, uncommon, rare, epic, legendary. Nothing but the pieces; magenta everywhere else.',
                'Remove all guides and labels.',
                '```', '']
    out += ['## D. Fix prompts (paste after a bad image)', '',
            '- **Generic / not original:** "This looks like generic AI dark-fantasy art. Redo it. Re-read the originality',
            '  engine: write fresh design cards whose costume source and silhouette hook are unusual, lean harder into FF6',
            '  costume theatre (sashes, ruffs, capelets, magitek brass, stage finery made grim), and remove every banned cliche."',
            '- **Too painterly / blurry / too many colours:** "Too many colours and soft shading. Redraw as a Super Famicom',
            '  battle sprite at our density: count the colours (16 max), big flat mid-tone areas, 1-2 hard shadow bands,',
            '  1 highlight band, every 2x2 block one flat colour, no gradients."',
            '- **Pose drift:** "The stance moved. Put the crown, chin, shoulders, elbows, crotch, knees and soles back on the',
            '  yellow lines and the fists and feet in the cyan circles of the template; change nothing else."',
            '- **Face drift:** "The face changed. Copy the head pixels from the pose master exactly in every frame."',
            '- **Guides left in:** "Remove every cyan, yellow and white line, circle, number and label; keep the art pixel-identical."',
            '- **One bad cell:** "Redraw only frame N with its design card; keep every other pixel of the sheet identical."',
            '- **Too similar:** "Frames N and M share a silhouette. Give frame M a different silhouette hook from the list."',
            '- **Chibi / anime drift:** "Proportions are too cute. Back to 6.75 heads tall (head 16 art pixels of 108), grim',
            '  adult faces, FF6 battle-sprite clarity, not anime."', '',
            '## E. The rest of the world', '',
            'Use the layouts of the other kits in `docs/art_kits/` and add the matching paragraph to their sheet prompt.', '',
            '```text',
            'MONSTERS / BOSSES: GRIM NOCTURNE manuscript mode: draw them like Yoshitaka Amano-inspired Square-era SNES/PSX',
            'enemy art translated to our pixel density, but original: no outline, painted pixel shading with hue jumps, 16-24',
            'colours (bosses 32), elongated ornamental silhouettes (ribbons, tattered silks, masks, faces set in armour, extra',
            'arms), Diablo II grime. Each gets a design card with a CREATURE source (a cursed instrument, a reliquary that',
            'walked off its altar, a drowned choir, a magitek prototype that ate its pilot, an opera set piece come alive, a',
            'saint\'s procession float, a plague-bell, a clockwork confessional). No banned cliches. Heights in art pixels:',
            'imps 60, men 100, brutes 130, bosses 160-290.',
            '```', '',
            '```text',
            'TOWNSFOLK: GRIM NOCTURNE character mode: FF6 battle-sprite clarity at our density, adults 100-108 art pixels,',
            'children 72-80, 16 colours each, costume theatre of a gothic market town (vintners, bell-ringers, lamplighters,',
            'chimney sweeps, coffin-makers, organ-builders), the same design in all 11 frames.',
            '```', '',
            '```text',
            'PETS / SUMMONS: GRIM NOCTURNE: animals in character mode (coloured outline, 16 colours), unnatural summons in',
            'manuscript mode (no outline, 16-24 colours). The same design in every frame; only the pose changes.',
            '```', '',
            '```text',
            'BIOMES: GRIM NOCTURNE at tile resolution: SNES-era tile craft (flat-then-band, 8-12 colours per tile family,',
            'clusters of 2-3 px), FF6 town and castle charm made grim (opera-house stone, magitek pipes, cathedral glass,',
            'Diablo II grime), floors and walls 1-2 steps darker and less saturated than the characters, moonlit rim on wall',
            'tops and prop edges facing back-right.',
            '```', '']
    return '\n'.join(out)


NAMES = {
    'names/posemaster.json': {'class': 'paladin'},
    'names/armor_nocturne.json': {'_help': {'rarity': ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']},
                                  'class': 'paladin', 'style': 'nocturne', 'armors': [{'name': '', 'rarity': ''} for _ in range(5)]},
    'names/overlays.json': {'class': 'paladin', **{s: [{'name': '', 'rarity': ''} for _ in range(5)] for s in ZONES}},
}


def build():
    files = {}
    ramps = palette()
    files['reference/palette.png'] = palette_sheet(ramps)
    files['reference/current_heroes_lineup.png'] = lineup()
    files['reference/canonical_stance.png'] = stance_reference()
    files['reference/pixel_scale_guide.png'] = scale_guide()
    files.update(world_refs())
    files['templates/0_style_lock_sheet.png'] = style_lock_sheet()
    for cls in CLASSES:
        files['reference/classes/%s_current.png' % cls] = class_reference(cls)
        files['templates/1_pose_master/%s_pose_master.png' % cls] = pose_master_template(cls)
        files['templates/2_armor/%s_armor.png' % cls] = armor_template(cls)
        files['templates/3_overlays/%s_overlays.png' % cls] = overlay_template(cls)
    hexf, gpl = palette_files(ramps)
    with open(os.path.join(TEXTS, '05_PROMPT_PACK.md'), 'w', encoding='utf-8') as f:
        f.write(prompt_pack())
    texts = {'reference/palette.hex': hexf, 'reference/palette.gpl': gpl}
    for f in sorted(os.listdir(TEXTS)):
        texts[f] = open(os.path.join(TEXTS, f), encoding='utf-8').read()
    for p, v in NAMES.items():
        texts[p] = json.dumps(v, indent=1)
    return files, texts, len(ramps)


def main():
    args = sys.argv[1:]
    unpacked = args[args.index('--unpacked') + 1] if '--unpacked' in args else None
    files, texts, nramps = build()
    root = 'ChatGPT_Style_Redesign_Kit/'
    zpath = os.path.join(ROOT, 'docs', 'art_kits', 'ChatGPT_Style_Redesign_Kit.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for p, t in texts.items():
            z.writestr(root + p, t)
        z.write(os.path.join(ROOT, 'tools', 'chatgpt_art.py'), root + 'tools/chatgpt_art.py')
        for p, img in files.items():
            b = io.BytesIO(); img.save(b, 'PNG', optimize=True)
            z.writestr(root + p, b.getvalue())
            if unpacked:
                K.save(img, os.path.join(unpacked, root, p))
    if unpacked:
        for p, t in texts.items():
            os.makedirs(os.path.dirname(os.path.join(unpacked, root, p)), exist_ok=True)
            open(os.path.join(unpacked, root, p), 'w', encoding='utf-8').write(t)
    approved = [c for c in CLASSES if os.path.exists(os.path.join(MASTERS, c + '.png'))]
    print('%d images, %d texts, %d palette ramps, pose masters approved: %s' % (len(files), len(texts), nramps, ', '.join(approved) or 'none'))
    print('%s  %d KB' % (os.path.relpath(zpath, ROOT), os.path.getsize(zpath) // 1024))


if __name__ == '__main__':
    main()
