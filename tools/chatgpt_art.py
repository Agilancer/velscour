"""
Import ChatGPT art sheets made from the kits in docs/art_kits/ (see docs/CHATGPT_ART_KITS.md) into the game.

    python tools/chatgpt_art.py enemies <sheet> <names.json>            10 monsters  -> assets/source/enemies/<set>/<family>/
    python tools/chatgpt_art.py bosses  <sheet> <names.json>            6 bosses     -> assets/source/enemies/<set>/<family>/
    python tools/chatgpt_art.py pets    <sheet> <names.json>            4 animated pets (land: 9 frames, winged: 6)
    python tools/chatgpt_art.py npcs    <sheet> <names.json>            4 animated townsfolk (11 frames, knights 13)
    python tools/chatgpt_art.py armor   <sheet> <names.json>            5 body armors for one class
    options: --dry   cut and write only <work>/preview.png, touch nothing in the game
             --work DIR   where previews go (default tools/tests/out/chatgpt_art)

Every sheet is 1536 x 1024 (other sizes with the same 3:2 shape are rescaled). The background is flat magenta
#FF00FF or real transparency; labels, guide lines and the reference column are ignored because only the art
inside each cell is read. Every cut is written to <work>/preview.png first: look at it.

This file also holds the sheet geometry that tools/chatgpt_art_kits.py draws the templates from.
Needs: pip install pillow numpy scipy
"""
import argparse, glob, io, json, os, re, subprocess, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1536, 1024


def grid(x0, y0, x1, y1, cols, rows):
    """Cells in reading order: (x0, y0, x1, y1)."""
    return [(round(x0 + c * (x1 - x0) / cols), round(y0 + r * (y1 - y0) / rows),
             round(x0 + (c + 1) * (x1 - x0) / cols), round(y0 + (r + 1) * (y1 - y0) / rows))
            for r in range(rows) for c in range(cols)]


# ---------------------------------------------------------------- kit geometry (shared with chatgpt_art_kits.py)
LABEL_W, HEAD_H = 112, 44          # animated sheets: row-name column and frame-name header
PET_LAND = ['REST', 'SPAWN 1', 'SPAWN 2', 'SPAWN 3', 'RUN 1', 'RUN 2', 'RUN 3', 'ATTACK 1', 'ATTACK 2']
PET_WING = ['FLAP 1', 'FLAP 2', 'FLAP 3', 'FLY 1', 'FLY 2', 'FLY 3']
NPC = ['IDLE 1', 'IDLE 2', 'IDLE 3', 'WALK 1', 'WALK 2', 'DYING', 'DEAD', 'SCREAM', 'POINT', 'HAPPY', 'CHEER']
NPC_ORDER = ['idle_1', 'idle_2', 'idle_3', 'walk_1', 'walk_2', 'dying_1', 'dead', 'scared_scream', 'scared_point',
             'happy', 'celebrate']
KNIGHT = NPC + ['ATTACK 1', 'ATTACK 2']
ARMOR_S = 2                        # armor sheet: frames drawn at 2x (128 x 192 -> 256 x 384)
ARMOR_TOP = 112                    # top of the reference / new frame row
ARMOR_EX_TOP = 600                 # top of the example frame (left column, under the class reference)
ARMOR_FRAMES = [(256 + 256 * i, ARMOR_TOP, 512 + 256 * i, ARMOR_TOP + 384) for i in range(5)]

KITS = {
    # kind: cells, inner art inset (l, t, r, b) inside each cell, ground line offset from the cell bottom
    'enemies': dict(cells=grid(0, 0, W, H, 5, 2), inset=(14, 52, 14, 30)),
    'bosses': dict(cells=grid(0, 0, W, H, 3, 2), inset=(16, 52, 16, 26)),
    'pets_land': dict(cells=grid(LABEL_W, HEAD_H, W, H, 9, 4), cols=9, rows=4, inset=(4, 6, 4, 14)),
    'pets_winged': dict(cells=grid(LABEL_W, HEAD_H, W, H, 6, 4), cols=6, rows=4, inset=(6, 6, 6, 14)),
    'npcs': dict(cells=grid(LABEL_W, HEAD_H, W, H, 11, 4), cols=11, rows=4, inset=(3, 8, 3, 14)),
    'knights': dict(cells=grid(LABEL_W, HEAD_H, W, H, 13, 4), cols=13, rows=4, inset=(3, 8, 3, 14)),
    'armor': dict(cells=ARMOR_FRAMES, inset=(0, 0, 0, 0)),
}

ARCHES = ['skeleton', 'archer', 'zombie', 'ghoul', 'imp', 'demon', 'spider', 'bat', 'slime', 'wraith', 'golem',
          'cultist', 'hound', 'eye', 'knight', 'worm', 'shroom', 'elemental', 'scorpion', 'gargoyle', 'beetle',
          'abomination']
ELEMENTS = ['fire', 'cold', 'light', 'poison', 'holy', 'shadow', 'arcane', 'blood']
RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
CLASSES = ['arcane_sorcerer', 'barbarian', 'bard', 'boomerang_knight', 'carrion_witch', 'death_knight', 'dragon_knight',
           'dragoon', 'gunner', 'lancer', 'necromancer', 'paladin', 'ranger', 'slime_lord', 'totem_master', 'wizard']


def slug(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


# ---------------------------------------------------------------- cutting
def load_sheet(path):
    im = Image.open(path).convert('RGBA')
    if im.size != (W, H):
        if abs(im.width / im.height - W / H) > 0.04:
            sys.exit('%s is %dx%d; the kit sheets are 1536x1024 (3:2)' % (path, *im.size))
        print('  %s is %dx%d, rescaling to %dx%d' % (os.path.basename(path), *im.size, W, H))
        im = im.resize((W, H), Image.LANCZOS)
    return np.array(im)


def key_background(a):
    """Opaque mask: drops transparency, flat magenta and its tinted fringe. A sheet that came back on some other
    flat colour (white, black, grey) is keyed against the colour of its border instead."""
    rgb = a[:, :, :3].astype(int); r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    magenta = (r > 140) & (b > 140) & (g < 0.55 * np.minimum(r, b)) & (abs(r - b) < 80)
    opaque = a[:, :, 3] >= 128
    border = np.concatenate([a[:6].reshape(-1, 4), a[-6:].reshape(-1, 4), a[:, :6].reshape(-1, 4), a[:, -6:].reshape(-1, 4)])
    bm = border[border[:, 3] >= 128]
    if len(bm) > 0.5 * len(border) and magenta[opaque].mean() < 0.15:
        bg = np.median(bm[:, :3], axis=0)
        print('  no magenta background: keying out the flat colour', bg.astype(int).tolist())
        return opaque & (np.abs(rgb - bg).max(axis=2) > 34)
    solid = opaque & ~magenta
    tint = (r - g > 45) & (b - g > 45) & (abs(r - b) < 60)
    edge = solid & ~ndimage.binary_erosion(solid, iterations=1)
    return solid & ~(edge & tint)


def despill(a, solid):
    """Edge pixels blended with the magenta background: drop the strongly tinted ones, take the magenta out of the rest."""
    a = a.copy()
    rgb = a[:, :, :3].astype(int)
    m = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    edge = solid & ~ndimage.binary_erosion(solid, iterations=2)
    solid &= ~(edge & (m > 70))
    fix = edge & (m > 0)
    for c in (0, 2):
        rgb[:, :, c] = np.where(fix, rgb[:, :, c] - m, rgb[:, :, c])
    a[:, :, :3] = np.clip(rgb, 0, 255)
    return a


def cut_cells(a, cells, label):
    """The art in each cell: its largest piece plus the pieces near it (sparks, tails, weapons), cropped.
    A piece belongs to the cell holding its centre; guide lines and labels outside every cell are ignored."""
    solid = key_background(a)
    a = despill(a, solid)
    lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    found = [[] for _ in cells]
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sizes[i] < 10:
            continue
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        for k, (x0, y0, x1, y1) in enumerate(cells):
            if x0 <= cx < x1 and y0 <= cy < y1:
                found[k].append((sizes[i], i + 1, sl))
                break
    out = []
    for k, comps in enumerate(found):
        comps.sort(reverse=True)
        if not comps or comps[0][0] < 150:
            sys.exit('%s: cell %d is empty (nothing drawn there, or it blends into the background)' % (label, k + 1))
        big, mid, msl = comps[0]
        y0, y1, x0, x1 = msl[0].start, msl[0].stop, msl[1].start, msl[1].stop
        keep = [mid]
        for s, i, sl in comps[1:]:
            gap = max(x0 - sl[1].stop, sl[1].start - x1, y0 - sl[0].stop, sl[0].start - y1, 0)
            if gap <= 18 or s >= 0.04 * big:
                keep.append(i)
                y0, y1, x0, x1 = min(y0, sl[0].start), max(y1, sl[0].stop), min(x0, sl[1].start), max(x1, sl[1].stop)
        crop = a[y0:y1, x0:x1].copy()
        m = np.isin(lab[y0:y1, x0:x1], keep)
        crop[:, :, 3] = np.where(m, np.maximum(crop[:, :, 3], 0), 0)
        crop[~m, :3] = 0
        out.append(Image.fromarray(crop))
    return out


def preview(images, path, cols, bg=(40, 44, 48), names=None):
    cw = max(i.width for i in images) + 16; ch = max(i.height for i in images) + 30
    rows = -(-len(images) // cols)
    sheet = Image.new('RGBA', (cw * cols, ch * rows), bg + (255,))
    d = ImageDraw.Draw(sheet)
    for k, im in enumerate(images):
        x, y = (k % cols) * cw, (k // cols) * ch
        sheet.alpha_composite(im, (x + (cw - im.width) // 2, y + ch - 22 - im.height))
        d.line((x + 4, y + ch - 22, x + cw - 4, y + ch - 22), fill=(255, 210, 120, 255))
        if names:
            d.text((x + 4, y + ch - 18), str(names[k])[:28], fill=(230, 230, 230, 255))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sheet.save(path)
    print('  preview:', os.path.relpath(path, ROOT))


def need(names, key, n, label):
    rows = names.get(key)
    if not isinstance(rows, list) or len(rows) != n:
        sys.exit('%s: "%s" must list exactly %d entries' % (label, key, n))
    return rows


# ---------------------------------------------------------------- enemies and bosses
def import_monsters(kind, sheet, names, args):
    n = len(KITS[kind]['cells'])
    rows = need(names, 'monsters', n, kind)
    set_id = slug(names.get('set', 'set3')); family = slug(names.get('family', '') or sys.exit('names.json needs "family"'))
    for r in rows:
        if r.get('arch') not in ARCHES:
            sys.exit('%s: arch "%s" is not one of %s' % (r.get('name'), r.get('arch'), ', '.join(ARCHES)))
        if r.get('el') and r['el'] not in ELEMENTS:
            sys.exit('%s: el "%s" is not one of %s' % (r.get('name'), r['el'], ', '.join(ELEMENTS)))
    sprites = cut_cells(sheet, KITS[kind]['cells'], kind)
    preview(sprites, os.path.join(args.work, 'preview.png'), 5 if kind == 'enemies' else 3, names=[r['name'] for r in rows])
    if args.dry:
        return
    root = os.path.join(ROOT, 'assets', 'source', 'enemies')
    folder = os.path.join(root, set_id, family)
    os.makedirs(folder, exist_ok=True)
    nums = [int(m.group(1)) for f in glob.glob(os.path.join(root, '*', '*', 'ene_*.png'))
            if (m := re.match(r'ene_(\d+)_', os.path.basename(f)))]
    num = max(nums + [300]) + 1
    first = len([f for f in os.listdir(folder) if f.lower().endswith('.png')])
    entries = []
    known = set(re.findall(r"(?:id: |\[)'([a-z0-9_]+)'", open(os.path.join(ROOT, 'src', 'data', 'bestiary.js'), encoding='utf-8').read()))
    for k, (im, r) in enumerate(zip(sprites, rows)):
        mid = slug(r.get('id') or r['name'])
        if mid in known:
            mid += '_' + family  # ids must be unique in the bestiary
        fn = 'ene_%03d_%s.png' % (num + k, mid)
        # set2 style: one monster per square PNG, feet near the bottom (the importer trims it again)
        side = max(im.width, im.height) + 24
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.alpha_composite(im, ((side - im.width) // 2, side - 12 - im.height))
        sq.save(os.path.join(folder, fn))
        h = int(r.get('h') or (54 if kind == 'enemies' else 110))
        extra = {'boss': True, 'lone': True} if kind == 'bosses' else {}
        for f in ('el', 'also', 'fly', 'undead', 'demon', 'gore', 'boss', 'lone'):
            if f in r and r[f] not in (None, '', []):
                extra[f] = r[f]
        props = ''.join(', %s: %s' % (f, json.dumps(v).replace('"', "'")) for f, v in extra.items())
        entries.append("  { id: '%s', sheet: '%s/%s', i: %d, arch: '%s', name: %s, h: %d%s }," % (
            mid, set_id, family, first + k, r['arch'], json.dumps(r['name']).replace('"', "'"), h, props))
        print('  wrote', os.path.relpath(os.path.join(folder, fn), ROOT))
    print('\nRunning the enemy importer...')
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'process_assets.py'), 'enemies', set_id], check=True)
    print('\nAdd these rows to BESTIARY in src/data/bestiary.js (a BESTIARY.push(...) block), then run\n'
          '  node tools/tests/data_check.mjs   and   node tools/tests/enemies.js\n')
    print('\n'.join(entries))
    if kind == 'bosses':
        print('\nBosses are guardians (boss: true) that never join packs (lone: true). To make one a raid boss as well,'
              '\nuse its id as the art of a RAID_BOSSES entry in src/game/raid.js.')


# ---------------------------------------------------------------- pets
def import_pets(sheet, names, args):
    winged = names.get('kind', 'land') == 'winged'
    kind = 'pets_winged' if winged else 'pets_land'
    rows = need(names, 'pets', 4, kind)
    sheet_id = slug(names.get('sheet') or sys.exit('names.json needs "sheet" (a name for this atlas)'))
    keys = [slug(r.get('key') or r['name']).replace('_', '') for r in rows]
    cat_path = os.path.join(ROOT, 'assets', 'sprites', 'pets', 'catalog.json')
    taken = {k for k, v in json.load(open(cat_path)).items() if v['sheet'] != sheet_id} if os.path.exists(cat_path) else set()
    clash = [k for k in keys if k in taken] + [k for k in set(keys) if keys.count(k) > 1]
    if clash:
        sys.exit('pet key(s) %s already used: give those pets another name or a "key"' % ', '.join(sorted(set(clash))))
    cells = KITS[kind]['cells']
    frames = cut_cells(sheet, cells, kind)
    cols = KITS[kind]['cols']
    preview(frames, os.path.join(args.work, 'preview.png'), cols)
    if args.dry:
        return
    # A clean, label-free source sheet in the layout tools/build_pet_animations.py reads, plus its layout entry.
    src_dir = os.path.join(ROOT, 'assets', 'source', 'pet_animations')
    clean = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for im, (x0, y0, x1, y1) in zip(frames, cells):
        clean.alpha_composite(im, (x0 + (x1 - x0 - im.width) // 2, max(y0, y1 - 10 - im.height)))
    fn = 'chatgpt_%s.png' % sheet_id
    clean.save(os.path.join(src_dir, fn))
    reg_path = os.path.join(src_dir, 'chatgpt_sheets.json')
    reg = json.load(open(reg_path)) if os.path.exists(reg_path) else {}
    xs = [cells[c][0] for c in range(cols)] + [W]
    ys = [(cells[r * cols][1], cells[r * cols][3]) for r in range(4)]
    reg[sheet_id] = {'file': fn, 'frames': cols, 'keys': keys, 'xs': xs, 'ys': ys}
    with open(reg_path, 'w') as f:
        json.dump(reg, f, indent=1)
    print('  wrote', os.path.relpath(os.path.join(src_dir, fn), ROOT), 'and chatgpt_sheets.json')
    print('\nRunning the pet atlas builder...')
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build_pet_animations.py')], check=True)
    print('\nThe atlas is assets/sprites/pets/%s.webp; src/core/petart.js picks new rows up from catalog.json.' % sheet_id)
    print('A summon animates with a row when its SUMMONS key (src/data/summons.js) equals the row key:')
    for k, r in zip(keys, rows):
        print("  %s: { name: %s, look: { sprite: 'hound', h: %d }, ai: 'melee', hp: 0.4, dmg: 1, spd: 4.5, atk: { type: 'melee', cd: 0.8 } },"
              % (k, json.dumps(r['name']).replace('"', "'"), int(r.get('h', 36))))
    print('Then give a skill `summon: \'<key>\'` (see the existing pets) and run node tools/tests/pets.js and familiars.js.')


# ---------------------------------------------------------------- townsfolk
def import_npcs(sheet, names, args):
    knights = bool(names.get('knights'))
    kind = 'knights' if knights else 'npcs'
    rows = need(names, 'npcs', 4, kind)
    cols = KITS[kind]['cols']
    frames = cut_cells(sheet, KITS[kind]['cells'], kind)
    strips = []
    for r, row in enumerate(rows):
        poses = frames[r * cols:(r + 1) * cols]
        # one scale per person from the first idle pose: adults stand 169 px tall (head top y 14, feet y 183),
        # children 128 px, like the existing townsfolk sheets
        s = (128 if row.get('child') else 169) / poses[0].height
        strip = Image.new('RGBA', (128 * cols, 192), (0, 0, 0, 0))
        for f, p in enumerate(poses):
            k = min(s, 116 / p.width, 178 / p.height)
            q = p.resize((max(1, round(p.width * k)), max(1, round(p.height * k))), Image.LANCZOS)
            strip.alpha_composite(q, (f * 128 + (128 - q.width) // 2, 184 - q.height))
        strips.append(strip)
    preview(strips, os.path.join(args.work, 'preview.png'), 1, names=[r['name'] for r in rows])
    if args.dry:
        return
    tf = os.path.join(ROOT, 'assets', 'sprites', 'townsfolk')
    man_path = os.path.join(tf, 'manifest.json')
    man = json.load(open(man_path, encoding='utf-8'))
    have = [int(m.group(1)) for f in os.listdir(tf) if (m := re.match(r'townsfolk_(\d+)\.png$', f))]
    num = max(have + [100]) + 1
    order = NPC_ORDER + (['attack_1', 'attack_2'] if knights else [])
    for strip, row in zip(strips, rows):
        sid = 'townsfolk_%03d' % num; num += 1
        src = 'generated_sources/chatgpt_%s_%s.png' % (sid[-3:], slug(row['name']))  # never over an existing source
        strip.save(os.path.join(tf, sid + '.png'))
        strip.save(os.path.join(tf, src))
        man['characters'].append({'id': sid, 'name': row['name'], 'source': src, 'attackSource': None,
                                  'frameSize': [128, 192], 'frameCount': cols, 'frameOrder': order, 'transparent': True,
                                  'helmet': bool(knights), 'generatedUniqueIdentity': True, 'isKnight': knights,
                                  'attackFrameCount': 2 if knights else 0, 'paletteVariants': 'runtime',
                                  'role': row.get('role', ''), 'chatgpt': True})
        print('  wrote %s.png  (%s, %s)' % (sid, row['name'], row.get('role', '')))
    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump(man, f, indent=2, ensure_ascii=False)
    print('\nThe sheets are ready. To put them in town, point townsfolk at the new numbers in src/data/townsfolk.js\n'
          '(spriteForJob, or a row in knights/court/regular), then run node tools/tests/town.js.')


# ---------------------------------------------------------------- armor
def class_metrics(cls):
    """Head top, feet and head centre column of the class's plainest armor frame (armor 001)."""
    z = zipfile.ZipFile(os.path.join(ROOT, 'assets', 'FinalClasses', cls + '.zip'))
    name = next(n for n in z.namelist() if re.search(r'armor/[a-z_]+_armor_001_[a-z]+\.png$', n))
    a = np.asarray(Image.open(io.BytesIO(z.read(name))).convert('RGBA'))
    return figure_metrics(a[:, :, 3] > 150)


def figure_metrics(m):
    ys, xs = np.nonzero(m)
    top, bot = ys.min(), ys.max()
    head = np.nonzero(m[top:top + 22].any(axis=0))[0]
    return top, bot, (head.min() + head.max()) / 2


def import_armor(sheet, names, args):
    cls = names.get('class')
    if cls not in CLASSES:
        sys.exit('names.json "class" must be one of ' + ', '.join(CLASSES))
    rows = need(names, 'armors', 5, 'armor')
    for r in rows:
        if r.get('rarity') not in RARITIES:
            sys.exit('%s: rarity must be one of %s' % (r.get('name'), ', '.join(RARITIES)))
    top, bot, hx = class_metrics(cls)
    frames = []
    for im in cut_cells(sheet, KITS['armor']['cells'], 'armor'):
        a = np.asarray(im)
        t, b, x = figure_metrics(a[:, :, 3] > 150)
        s = (bot - top) / (b - t)
        q = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        f = Image.new('RGBA', (128, 192), (0, 0, 0, 0))
        f.alpha_composite(q, (int(round(hx - x * s)), int(round(top - t * s))))
        fa = np.array(f); fa[:, :, 3] = np.where(fa[:, :, 3] < 40, 0, fa[:, :, 3]); f = Image.fromarray(fa)
        frames.append(f)
    preview([f.resize((256, 384), Image.NEAREST) for f in frames], os.path.join(args.work, 'preview.png'), 5,
            names=['%s (%s)' % (r['name'], r['rarity']) for r in rows])
    if args.dry:
        return
    out = os.path.join(ROOT, 'assets', 'source', 'gear_additions', cls)
    os.makedirs(out, exist_ok=True)
    have = [int(m.group(1)) for f in os.listdir(out) if (m := re.match(r'[a-z_]+_armor_(\d+)_', f))]
    num = max(have + [80]) + 1
    cat_path = os.path.join(out, 'catalog.json')
    cat = json.load(open(cat_path)) if os.path.exists(cat_path) else {}
    for f, r in zip(frames, rows):
        fn = '%s_armor_%03d_%s.png' % (cls, num, r['rarity'])
        f.save(os.path.join(out, fn))
        cat[str(num)] = {'name': r['name'], 'rarity': r['rarity'], 'file': fn}
        print('  wrote', os.path.relpath(os.path.join(out, fn), ROOT))
        num += 1
    with open(cat_path, 'w') as fh:
        json.dump(cat, fh, indent=1)
    print('\nRunning the gear importer for %s...' % cls)
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'process_assets.py'), 'gear', cls], check=True)
    print('\nNew armors drop alongside the old ones of the same rarity. Check: node tools/tests/gear.js %s' % cls)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kind', choices=['enemies', 'bosses', 'pets', 'npcs', 'armor'])
    ap.add_argument('sheet'); ap.add_argument('names')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--work', default=os.path.join(ROOT, 'tools', 'tests', 'out', 'chatgpt_art'))
    args = ap.parse_args()
    names = json.load(open(args.names, encoding='utf-8'))
    sheet = load_sheet(args.sheet)
    print('%s: %s' % (args.kind, args.sheet))
    if args.kind in ('enemies', 'bosses'):
        import_monsters(args.kind, sheet, names, args)
    elif args.kind == 'pets':
        import_pets(sheet, names, args)
    elif args.kind == 'npcs':
        import_npcs(sheet, names, args)
    else:
        import_armor(sheet, names, args)


if __name__ == '__main__':
    main()
