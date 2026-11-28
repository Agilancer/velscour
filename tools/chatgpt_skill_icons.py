"""
ChatGPT skill icon kit: build it, pack ChatGPT's reply, import the reply into the game. See docs/CHATGPT_SKILL_ICONS.md.

    node tools/chatgpt_skill_icons_export.js            # (server on :8123) every icon as the game draws it today
    python tools/chatgpt_skill_icons.py kit [--unpacked DIR]
        -> docs/art_kits/ChatGPT_Skill_Icon_Kit.zip
    python tools/chatgpt_skill_icons.py pack SHEETS_DIR [--map sheet_map.json] [--out VELSCOUR_Skill_Icons_Return.zip]
        (run by ChatGPT inside the kit: cuts its 3 x 3 sheets into icons and zips the return package)
    python tools/chatgpt_skill_icons.py import RETURN.zip|DIR [...] [--dry]
        -> assets/ui/skills/<class>_skills.png (4 x 9 cells), <class>_talents.png (3 x 8), ultimates.png (1 x 19)

A batch is one 1024 x 1024 image of nine square icons in a 3 x 3 grid on flat magenta (BORDER px around, GUTTER px
between, cells CELL px). Skills: one batch per skill tree (its nine skills in tree order, which is the in-game 3 x 3
layout). Talents: one per branch (eight nodes, cell 9 empty). Ultimates: the 19 class ultimates in three batches.
This file is copied into the kit as-is; `pack` needs only Pillow (no numpy), so it runs in ChatGPT's Python.
"""
import io, json, os, re, shutil, sys, zipfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SIZE, BORDER, GUTTER = 1024, 16, 16
CELL = (SIZE - 2 * BORDER - 2 * GUTTER) // 3          # 320
ICON_OUT = 256                                          # icon size in the return package
GAME_CELL = 128                                         # cell size of the sheets written into assets/ui/skills/
MAG = (255, 0, 255)
KIT_ID, KIT_VERSION = 'velscour-skill-icons', 1
RETURN_NAME = 'VELSCOUR_Skill_Icons_Return.zip'


def cell_box(i):
    """Pixel box of cell i (0..8) on the 1024 template."""
    r, c = divmod(i, 3)
    x, y = BORDER + c * (CELL + GUTTER), BORDER + r * (CELL + GUTTER)
    return x, y, x + CELL, y + CELL


# ------------------------------------------------------------------------------------------------ cutting a sheet
def is_mag(p):
    r, g, b = p[:3]
    return r > 190 and b > 190 and g < 80 and abs(r - b) < 60   # the key colour, not an arcane violet glow


def _runs(flags):
    """[(start, end)] of consecutive False runs (content) in a list of booleans (True = gutter)."""
    out, s = [], None
    for i, f in enumerate(flags + [True]):
        if not f and s is None: s = i
        if f and s is not None: out.append((s, i)); s = None
    return out


def _spans(runs, n):
    """The three content spans along an axis if the gutters were found (three wide runs), else None."""
    big = sorted(r for r in runs if r[1] - r[0] > n * 0.2)
    return big if len(big) == 3 else None


def cut_sheet(im):
    """A 3 x 3 sheet (any size near square) -> nine square RGB icons of ICON_OUT px (None for an empty cell), and
    whether the magenta grid was found. Without it (dark gutters, empty cells) the cells are the template's boxes
    scaled to the image, widened by half a gutter and trimmed back to the art."""
    im = im.convert('RGB')
    w, h = im.size
    sm = im.resize((max(1, w // 2), max(1, h // 2)), Image.NEAREST)
    sw, sh = sm.size
    px = sm.load()
    col = [sum(is_mag(px[x, y]) for y in range(sh)) / sh > 0.55 for x in range(sw)]
    row = [sum(is_mag(px[x, y]) for x in range(sw)) / sw > 0.55 for y in range(sh)]
    xs, ys = _spans(_runs(col), sw), _spans(_runs(row), sh)
    found = bool(xs and ys)
    icons = []
    for k in range(9):
        r, c = divmod(k, 3)
        if found:
            box, pad = (xs[c][0] * w // sw, ys[r][0] * h // sh, xs[c][1] * w // sw, ys[r][1] * h // sh), 0
        else:
            x0, y0, x1, y1 = cell_box(k)
            e = GUTTER // 2
            box = (round((x0 - e) * w / SIZE), round((y0 - e) * h / SIZE), round((x1 + e) * w / SIZE), round((y1 + e) * h / SIZE))
            pad = round(e * w / SIZE)
        icons.append(clean_cell(im.crop(box), pad))
    return icons, found


def clean_cell(c, pad=0):
    """Trim magenta edges, centre-crop square, take magenta out of the edge pixels, resize to ICON_OUT. None if empty.
    pad: a side with no magenta to trim is cut back by this much (the half gutter a template box was widened by)."""
    w, h = c.size
    px = c.load()
    total = w * h
    magn = sum(is_mag(px[x, y]) for x in range(0, w, 2) for y in range(0, h, 2)) * 4
    if magn > total * 0.8:
        return None                                    # an empty (all magenta) cell
    def line_mag(xs, ys):
        pts = [(x, y) for x in xs for y in ys]
        return sum(is_mag(px[x, y]) for x, y in pts) / max(1, len(pts)) > 0.5
    l, t, r, b = 0, 0, w, h
    while l < r - 8 and line_mag([l], range(t, b, 3)): l += 1
    while r - 1 > l + 8 and line_mag([r - 1], range(t, b, 3)): r -= 1
    while t < b - 8 and line_mag(range(l, r, 3), [t]): t += 1
    while b - 1 > t + 8 and line_mag(range(l, r, 3), [b - 1]): b -= 1
    if pad:
        l, t = l or pad, t or pad
        r, b = (w - pad) if r == w else r, (h - pad) if b == h else b
    c = c.crop((l, t, r, b))
    w, h = c.size
    s = min(w, h)
    c = c.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).copy()
    px = c.load()
    E = max(3, s // 60)                                # leftover key colour along the edges (antialiasing) -> dark; the inside is left alone
    for y in range(s):
        for x in (range(s) if y < E or y >= s - E else list(range(E)) + list(range(s - E, s))):
            p = px[x, y]
            if is_mag(p) or (p[0] > 120 and p[2] > 120 and p[1] < p[0] * 0.5 and p[1] < p[2] * 0.5):
                px[x, y] = (min(p[1], 40),) * 3
    return c.resize((ICON_OUT, ICON_OUT), Image.LANCZOS)


# ------------------------------------------------------------------------------------------------ the icon list
def load_list(path=None):
    for p in [path, os.path.join(HERE, 'icon_list.json'), os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_kit', 'icon_list.json')]:
        if p and os.path.exists(p):
            return json.load(open(p, encoding='utf-8'))
    sys.exit('icon_list.json not found (pass --list, or build the kit first)')


BATCH_RE = re.compile(r'([a-z_]+__(?:skills_t[0-3]|talents_b[0-2])|ultimates_[1-3])')


def batch_of_name(name, batches):
    m = BATCH_RE.search(os.path.basename(name).lower())
    return m.group(1) if m and m.group(1) in batches else None


# ------------------------------------------------------------------------------------------------ pack (ChatGPT side)
def pack(args):
    """Sheets (named by batch, or mapped by --map) -> RETURN zip: manifest.json, sheets/<batch>.png, icons/<id>.png."""
    src = args[0] if args and not args[0].startswith('--') else '.'
    opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
    L = load_list(opt('--list'))
    batches = {b['id']: b for b in L['batches']}
    mapping = json.load(open(opt('--map'))) if opt('--map') else {}
    out = opt('--out', RETURN_NAME)
    files = sorted(f for f in os.listdir(src) if f.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')))
    got, report, unknown = {}, [], []
    for f in files:
        bid = mapping.get(f) or batch_of_name(f, batches)
        if not bid:
            unknown.append(f); continue
        got[bid] = os.path.join(src, f)            # a later file for the same batch (a redo) wins (sorted by name)
    manifest = {'kit': KIT_ID, 'version': KIT_VERSION, 'sheets': {}, 'icons': {}, 'notes': opt('--notes', '')}
    preview = []
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for bid in sorted(got, key=lambda b: batches[b]['order']):
            im = Image.open(got[bid])
            icons, found = cut_sheet(im)
            buf = io.BytesIO(); im.convert('RGB').save(buf, 'PNG')
            z.writestr(f'sheets/{bid}.png', buf.getvalue())
            manifest['sheets'][bid] = {'file': f'sheets/{bid}.png', 'source': os.path.basename(got[bid]), 'size': list(im.size), 'grid_found': found}
            ids = batches[bid]['cells']
            for i, (icon_id, ic) in enumerate(zip(ids, icons)):
                if not icon_id: continue
                if ic is None:
                    report.append(f'{bid} cell {i + 1} ({icon_id}) is empty'); continue
                buf = io.BytesIO(); ic.save(buf, 'PNG')
                z.writestr(f'icons/{icon_id}.png', buf.getvalue())
                manifest['icons'][icon_id] = f'icons/{icon_id}.png'
                preview.append((bid, i, ic))
            report.append(f'{bid}: {sum(1 for x in ids if x)} icons, grid {"found" if found else "NOT found: cut at the template positions"}')
        if preview:
            z.writestr('preview.png', contact(preview, batches))
        z.writestr('manifest.json', json.dumps(manifest, indent=1))
    todo = [b['id'] for b in L['batches'] if b['id'] not in got]
    print('\n'.join(report))
    if unknown: print('NOT matched to a batch (rename them or list them in --map):', ', '.join(unknown))
    print(f'{len(got)} of {len(batches)} batches packed, {len(manifest["icons"])} icons -> {out}')
    if todo: print(f'still to paint ({len(todo)}): ' + ', '.join(todo[:12]) + (' ...' if len(todo) > 12 else ''))


def contact(items, batches):
    """A preview PNG: one row per batch, its nine cut icons at 96 px with the batch id."""
    rows = {}
    for bid, i, ic in items: rows.setdefault(bid, {})[i] = ic
    S, LW = 96, 230
    sheet = Image.new('RGB', (LW + 9 * (S + 4), len(rows) * (S + 6) + 6), (20, 16, 18))
    d = ImageDraw.Draw(sheet)
    for r, (bid, cells) in enumerate(rows.items()):
        y = 6 + r * (S + 6)
        d.text((8, y + S // 2 - 6), bid, fill=(240, 230, 210), font=font(13))
        for i, ic in cells.items():
            sheet.paste(ic.resize((S, S), Image.LANCZOS), (LW + i * (S + 4), y))
    buf = io.BytesIO(); sheet.save(buf, 'PNG')
    return buf.getvalue()


def font(size):
    for f in ('DejaVuSans-Bold.ttf', 'LiberationSans-Bold.ttf', 'arialbd.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


# ------------------------------------------------------------------------------------------------ import (repo side)
def read_return(path, batches):
    """A return zip or folder (or a loose sheet) -> {icon id: RGB Image}. Cut icons beat sheets of the same batch."""
    icons, sheets = {}, {}
    def take(name, data):
        name = name.replace('\\', '/')
        base = os.path.basename(name)
        if not base.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')) or base.lower() == 'preview.png': return
        stem = os.path.splitext(base)[0]
        if '/icons/' in '/' + name and stem in ICON_IDS: icons[stem] = Image.open(io.BytesIO(data)).convert('RGB')
        else:
            bid = batch_of_name(base, batches)
            if bid: sheets[bid] = Image.open(io.BytesIO(data))
    if os.path.isdir(path):
        for dp, _, fs in os.walk(path):
            for f in fs: take(os.path.relpath(os.path.join(dp, f), path), open(os.path.join(dp, f), 'rb').read())
    elif path.lower().endswith('.zip'):
        with zipfile.ZipFile(path) as z:
            for n in z.namelist():
                if n.lower().endswith('.zip'):   # a zip of zips
                    tmp = io.BytesIO(z.read(n))
                    with zipfile.ZipFile(tmp) as z2:
                        for m in z2.namelist(): take(m, z2.read(m))
                else: take(n, z.read(n))
    else:
        take(os.path.basename(path), open(path, 'rb').read())
    for bid, im in sheets.items():
        cut, found = cut_sheet(im)
        print(f'  sheet {bid}: grid {"found" if found else "not found (template positions)"}')
        for icon_id, ic in zip(batches[bid]['cells'], cut):
            if icon_id and ic is not None and icon_id not in icons: icons[icon_id] = ic
    return icons


ICON_IDS = set()


def import_(args):
    dry = '--dry' in args
    srcs = [a for a in args if not a.startswith('--')]
    L = load_list(None if not '--list' in args else args[args.index('--list') + 1])
    if '--list' in args: srcs.remove(args[args.index('--list') + 1])
    batches = {b['id']: b for b in L['batches']}
    ICON_IDS.update(i['id'] for i in L['icons'])
    new = {}
    for s in srcs:
        print(s)
        new.update(read_return(s, batches))
    if not new: sys.exit('no icons found')
    by = {i['id']: i for i in L['icons']}
    now_dir = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_export', 'now')
    out_dir = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_import') if dry else os.path.join(ROOT, 'assets', 'ui', 'skills')
    os.makedirs(out_dir, exist_ok=True)
    G = GAME_CELL
    def cell_img(icon_id, old_sheet, rc):
        if icon_id in new: return new[icon_id].resize((G, G), Image.LANCZOS), 'new'
        if old_sheet is not None:
            cw, ch = old_sheet.width // rc[3], old_sheet.height // rc[2]
            return old_sheet.crop((rc[1] * cw, rc[0] * ch, rc[1] * cw + cw, rc[0] * ch + ch)).resize((G, G), Image.LANCZOS), 'kept'
        p = os.path.join(now_dir, icon_id + '.png')     # the icon the game draws today (summon portraits, code shapes)
        if os.path.exists(p): return Image.open(p).convert('RGB').resize((G, G), Image.LANCZOS), 'game'
        return Image.new('RGB', (G, G), (10, 8, 9)), 'blank'
    written, previews = [], []
    classes = [c['id'] for c in L['classes']]
    for cls in classes:
        for kind, rows, cols, items in (('skills', 4, 9, [i for i in L['icons'] if i['type'] == 'skill' and i['cls'] == cls]),
                                        ('talents', 3, 8, [i for i in L['icons'] if i['type'] == 'talent' and i['cls'] == cls])):
            if not any(i['id'] in new for i in items): continue
            old_p = os.path.join(ROOT, 'assets', 'ui', 'skills', f'{cls}_{kind}.png')
            old = Image.open(old_p).convert('RGB') if os.path.exists(old_p) else None
            sheet = Image.new('RGB', (cols * G, rows * G), (10, 8, 9))
            tally = {}
            for i in items:
                r, c = i['sheet_cell']
                im, how = cell_img(i['id'], old, (r, c, rows, cols))
                tally[how] = tally.get(how, 0) + 1
                sheet.paste(im, (c * G, r * G))
            f = os.path.join(out_dir, f'{cls}_{kind}.png')
            sheet.save(f, optimize=True)
            written.append(f'{os.path.relpath(f, ROOT)}  ' + ', '.join(f'{v} {k}' for k, v in sorted(tally.items())))
            previews.append((f'{cls} {kind}', sheet))
    ults = [i for i in L['icons'] if i['type'] == 'ultimate']
    if any(i['id'] in new for i in ults):
        old_p = os.path.join(ROOT, 'assets', 'ui', 'skills', 'ultimates.png')
        old = Image.open(old_p).convert('RGB') if os.path.exists(old_p) else None
        sheet = Image.new('RGB', (len(ults) * G, G), (10, 8, 9))
        tally = {}
        for k, i in enumerate(ults):
            im, how = cell_img(i['id'], old, (0, k, 1, len(ults)))
            tally[how] = tally.get(how, 0) + 1
            sheet.paste(im, (k * G, 0))
        f = os.path.join(out_dir, 'ultimates.png'); sheet.save(f, optimize=True)
        written.append(f'{os.path.relpath(f, ROOT)}  ' + ', '.join(f'{v} {k}' for k, v in sorted(tally.items())))
        previews.append(('ultimates', sheet))
    unknown = [k for k in new if k not in by]
    print(f'{len(new)} new icons')
    print('\n'.join(written))
    print('(new = from the return package, kept = the existing painted sheet, game = the icon the game draws today)')
    if unknown: print('ignored unknown ids:', unknown)
    if dry:
        S = 64
        h = sum(p.height * S // G + 24 for _, p in previews) + 8
        w = max(p.width * S // G for _, p in previews) + 16
        pv = Image.new('RGB', (w, h), (24, 20, 22)); d = ImageDraw.Draw(pv); y = 6
        for name, p in previews:
            d.text((8, y), name, fill=(240, 230, 210), font=font(13)); y += 18
            pv.paste(p.resize((p.width * S // G, p.height * S // G), Image.LANCZOS), (8, y)); y += p.height * S // G + 6
        pv.save(os.path.join(out_dir, 'preview.png'))
        print('dry run: sheets and preview.png in', os.path.relpath(out_dir, ROOT))


# ------------------------------------------------------------------------------------------------ kit (repo side)
IDENTITY = {
    'paladin': 'Holy warrior in blessed golden-white plate with a hammer and a cross-marked shield. Gold and white light.',
    'ranger': 'Wildwood archer with a longbow, hawks and wolves, cunning traps; starlit arrows in the Starshot tree.',
    'wizard': 'Robed elemental mage: meteors, blizzards, chain lightning; one element per tree.',
    'necromancer': 'Commander of the dead: skeletons, bone spears, blood magic, curses, plague.',
    'monk': 'Bald martial artist in saffron robes: palm strikes, flying kicks, temple bells, chi light.',
    'barbarian': 'Savage northern berserker: bare arms, furs and iron, two-handed axes and greatswords, war paint, roaring warcries, earth-splitting slams. Steel, leather brown, blood red, ember orange.',
    'dragoon': 'Armored dragon-lancer in a winged helm with a long lance, diving from the sky; dragon blood and wyrm breath. Deep steel blue, silver and dragon-fire orange.',
    'totem_master': 'Tribal shaman who plants carved spirit totems (bear, wolf, eagle and serpent faces) that burn, shock and heal; ghostly ancestors fight beside him. Carved wood, bone, feathers, turquoise spirit glow, storm and lava.',
    'death_knight': 'Fallen champion in dark runed plate with a frost-glowing greatsword (his Runeblade); plague and life-stealing blood magic. Tree colours: Frost = icy blue, Unholy = sickly green, Blood = crimson, Runeblade = cold blue-white runes.',
    'arcane_sorcerer': 'The Astronomer: a robed stargazer who wields the heavens: star missiles, comets, falling suns, moons, black holes and constellations drawn as gold lines between stars. Starlight blue on deep night skies, with gold.',
    'carrion_witch': 'Swamp hag who commands crows and locusts, brews plague and hexes foes into rotting puppets under a grave moon. Rot green, bruise purple, bone, black feathers.',
    'bard': 'Roguish minstrel with a lute and throwing knives; songs that heal and empower, chords that shatter bone. Every Bard skill plays a musical note: show that note glyph (given per skill) as a glowing gold music symbol inside the scene.',
    'slime_lord': 'Crowned king of living ooze: acid floods, slimeling broods, grotesque mutations. In this game ACID IS BLUE: glossy translucent blue ooze (rainbow slimes in Primordial).',
    'boomerang_knight': 'Dashing knight whose curved blade-boomerangs always come back to his hand: ricochets, swirling sword storms, gale cyclones. Steel, teal wind, gold trim, motion arcs.',
    'lancer': 'Unbreakable knight-captain with a huge elemental energy lance, tower shields circling him (up to ten), a war banner and an order of knights at his back. Lightning white-blue, gold and steel.',
    'dragon_knight': 'Knight with the blood of the wyrm: fire breath, red dragon-scale armor, draconic wings, finally becoming a dragon. Crimson, ember orange, gold.',
    'gunner': 'Powder-stained engineer: pistols and rifles (bullet hell), rockets and grenades, turrets, drones, a biplane bombing run and a death laser. Brass, gunmetal, smoke, muzzle-flash orange.',
    'rogue': 'Black-leather assassin from the shuttered guilds with twin reverse-grip daggers; she lurks in shadow, builds combo points and spends them on bloody finishers. Crimson, black, steel.',
    'ninja': 'Silent agent of the ruined moon temple: katana, a chain hook, shuriken, caltrops, shadow clones that repeat his cuts, dragon ninpo. Midnight blue, silver moonlight, shadow purple, dragon fire.',
}
EL_LOOK = {
    'phys': 'Physical: steel, bone and stone with warm white-amber light',
    'fire': 'Fire: orange-gold flame, ember red',
    'cold': 'Cold: icy cyan and white frost, deep blue shadows',
    'light': 'Lightning: blue-white electric arcs with violet edges',
    'poison': 'Poison: toxic lime green, sickly fumes',
    'arcane': 'Arcane: violet and magenta energy',
    'holy': 'Holy: radiant gold and white',
    'shadow': 'Shadow: deep purple-black with violet glow',
    'blood': 'Blood: crimson red and dark red',
    'acid': 'Acid (the Slime Lord\'s): glossy translucent BLUE ooze',
}
KIND_LOOK = {
    'proj': 'a projectile flying diagonally toward the top right', 'orbit': 'objects circling the caster', 'melee': 'a weapon strike / impact',
    'nova': 'a ring blast bursting outward', 'aoe': 'a ground blast at a target spot', 'beam': 'a channelled beam or breath cone',
    'chain': 'energy leaping between foes', 'strike': 'a bolt striking down', 'wall': 'a wall or ring barrier', 'zone': 'a lingering field on the ground',
    'trap': 'a trap set on the ground', 'cyclone': 'a whirling cyclone', 'whirl': 'spinning through foes', 'leap': 'a leap that crashes down',
    'dash': 'a forward dash with speed trails', 'blink': 'a teleport / vanishing burst', 'summon': 'the summoned creature, posed heroically',
    'buff': 'an empowering aura on the hero', 'curse': 'a hex / curse sigil on foes', 'heal': 'restoring life light', 'rain': 'many missiles raining down',
    'fissure': 'a line of eruptions tearing the ground', 'corpse': 'corpses exploding / being consumed',
}
CELL_POS = ['top left', 'top middle', 'top right', 'middle left', 'centre', 'middle right', 'bottom left', 'bottom middle', 'bottom right']


def note_of(desc):
    m = re.search(r'♫ ([^·]+?) ·', desc or '')
    return m.group(1).strip() if m else None


def build_list(E):
    """The export -> icon_list.json: every icon with its status, and the batches still to paint."""
    cls_meta = {c['id']: c for c in E['classes']}
    icons, batches = [], []
    has_sheet = {c: {k: any(i['cls'] == c and i['status'] == 'art' and 'painted cell' in i.get('why', '') for i in E['skills']) if k == 'skills'
                     else any(t['cls'] == c and t['status'] == 'art' for t in E['talents']) for k in ('skills', 'talents')} for c in cls_meta}
    for s in E['skills']:
        icons.append({'id': s['id'], 'type': 'skill', 'cls': s['cls'], 'className': s['className'], 'group': s['treeName'], 'group_index': s['tree'],
                      'slot': s['slot'], 'name': s['name'], 'element': s['el'], 'kind': s['kind'], 'summon': s['summonName'], 'note': note_of(s['desc']) if s['cls'] == 'bard' else None,
                      'reqLevel': s['reqLevel'], 'desc': s['desc'], 'status': s['status'], 'art_note': s['why'], 'sheet_cell': [s['tree'], s['slot']], 'now': s['png']})
    for t in E['talents']:
        icons.append({'id': t['id'], 'type': 'talent', 'cls': t['cls'], 'className': t['className'], 'group': t['branchName'], 'group_index': t['branch'],
                      'slot': t['slot'], 'name': t['name'], 'element': t['el'], 'kind': 'talent', 'choice': t['choice'], 'desc': t['desc'], 'status': t['status'],
                      'art_note': f'painted cell in assets/ui/skills/{t["cls"]}_talents.png' if t['status'] == 'art' else 'element gradient and a shape drawn in code',
                      'sheet_cell': [t['branch'], t['slot']], 'now': t['png']})
    for k, u in enumerate(E['ultimates']):
        icons.append({'id': u['id'], 'type': 'ultimate', 'cls': u['cls'], 'className': u['className'], 'group': 'Ultimate', 'group_index': 0, 'slot': k,
                      'name': u['name'], 'element': u['el'], 'kind': 'ultimate', 'desc': u['desc'], 'status': 'code',
                      'art_note': 'an emblem drawn in code (src/ui/icons.js)', 'sheet_cell': [0, k], 'now': u['png']})
    by = {i['id']: i for i in icons}
    order = 0
    def add(bid, typ, cls, title, cells):
        nonlocal order
        order += 1
        batches.append({'id': bid, 'order': order, 'type': typ, 'cls': cls, 'title': title, 'cells': cells + [None] * (9 - len(cells))})
        for k, c in enumerate(cells):
            if c: by[c]['batch'], by[c]['cell'] = bid, k + 1
    todo = [c for c in cls_meta if not has_sheet[c]['skills']]
    for c in todo:
        for t, tn in enumerate(cls_meta[c]['trees']):
            add(f'{c}__skills_t{t}', 'skills', c, f'{cls_meta[c]["name"]}: skill tree {t + 1} of 4, "{tn}"',
                [i['id'] for i in icons if i['type'] == 'skill' and i['cls'] == c and i['group_index'] == t])
    ult = [i['id'] for i in icons if i['type'] == 'ultimate']
    for k in range(0, len(ult), 9):
        add(f'ultimates_{k // 9 + 1}', 'ultimates', None, f'Class ultimates {k + 1}-{min(len(ult), k + 9)} of {len(ult)}', ult[k:k + 9])
    for c in [c for c in cls_meta if not has_sheet[c]['talents']]:
        for b in range(3):
            items = [i for i in icons if i['type'] == 'talent' and i['cls'] == c and i['group_index'] == b]
            add(f'{c}__talents_b{b}', 'talents', c, f'{cls_meta[c]["name"]}: talent branch {b + 1} of 3, "{items[0]["group"]}"', [i['id'] for i in items])
    classes = [{'id': c, 'name': m['name'], 'trees': m['trees'], 'about': m['desc'], 'look': IDENTITY.get(c, ''),
                'painted_skill_sheet': has_sheet[c]['skills'], 'painted_talent_sheet': has_sheet[c]['talents']} for c, m in cls_meta.items()]
    return {'kit': KIT_ID, 'version': KIT_VERSION, 'template': {'size': SIZE, 'border': BORDER, 'gutter': GUTTER, 'cell': CELL, 'magenta': '#FF00FF'},
            'return': {'zip': RETURN_NAME, 'icon_px': ICON_OUT}, 'elements': EL_LOOK, 'classes': classes, 'batches': batches, 'icons': icons}


def batch_prompt(b, L):
    by = {i['id']: i for i in L['icons']}
    cm = {c['id']: c for c in L['classes']}
    n = len(L['batches'])
    out = [f'BATCH {b["order"]:03d} of {n:03d}   id: {b["id"]}', f'{b["title"]}', '']
    if b['cls']:
        c = cm[b['cls']]
        out += [f'Class look: {c["look"]}', '']
        els = sorted({by[i]['element'] for i in b['cells'] if i})
        out += ['Colour by element (the main glow of each icon): ' + '; '.join(EL_LOOK.get(e, e) for e in els) + '.', '']
    else:
        out += ['Each ultimate is the class\'s biggest, most cinematic move: wide epic composition, the class\'s hero or emblem at its heart, maximum glow.', '']
    out.append('Paint ONE 1024 x 1024 image laid out exactly like template_3x3.png: a flat magenta (#FF00FF) border and gutters around nine square icons.')
    out.append('Cells, left to right, top to bottom:')
    for k, i in enumerate(b['cells']):
        if not i:
            out.append(f'  Cell {k + 1} ({CELL_POS[k]}): EMPTY. Fill it with flat magenta #FF00FF.'); continue
        s = by[i]
        what = 'ultimate of the ' + s['className'] if s['type'] == 'ultimate' else KIND_LOOK.get(s['kind'], 'passive talent: a symbolic emblem of the bonus' if s['type'] == 'talent' else '')
        extra = []
        if s['type'] == 'ultimate': extra.append(f'class: {s["className"]}')
        if s.get('summon'): extra.append(f'summons: {s["summon"]}')
        if s.get('note'): extra.append(f'show the note glyph: {s["note"]}')
        if s.get('choice'): extra.append(f'choice {s["choice"]} of a pair: make it look clearly different from its twin')
        if s['status'] == 'art': extra.append('already has an older creature-portrait icon: paint it anyway so the set matches')
        out.append(f'  Cell {k + 1} ({CELL_POS[k]}): "{s["name"]}" - {EL_LOOK.get(s["element"], s["element"]).split(":")[0]} - {what}.'
                   + (f' [{"; ".join(extra)}]' if extra else ''))
        out.append(f'      What it does: {s["desc"]}')
    out += ['', 'Follow the STYLE LOCK. No words, letters, numbers, frames or borders inside the cells. Each icon fills its whole cell edge to edge.',
            f'Name the image: {b["id"]}.png', '']
    return '\n'.join(out)


def kit(args):
    exp = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_export')
    E = json.load(open(os.path.join(exp, 'icons.json'), encoding='utf-8'))
    L = build_list(E)
    tmp = os.path.join(ROOT, 'tools', 'tests', 'out', 'skill_icons_kit')
    shutil.rmtree(tmp, ignore_errors=True)
    for d in ('templates', 'examples', 'style_reference', 'overview', 'class_portraits', 'prompts'):
        os.makedirs(os.path.join(tmp, d), exist_ok=True)
    J = lambda *p: os.path.join(tmp, *p)
    now = lambda rel: Image.open(os.path.join(exp, rel)).convert('RGB')
    by = {i['id']: i for i in L['icons']}
    painted = [c['id'] for c in L['classes'] if c['painted_skill_sheet']]
    sheet_cell = lambda cls, kind, r, c: (lambda im, rows, cols: im.crop((c * im.width // cols, r * im.height // rows, (c + 1) * im.width // cols, (r + 1) * im.height // rows)))(
        Image.open(os.path.join(ROOT, 'assets', 'ui', 'skills', f'{cls}_{kind}.png')).convert('RGB'), *((4, 9) if kind == 'skills' else (3, 8)))
    # templates
    t = Image.new('RGB', (SIZE, SIZE), MAG); d = ImageDraw.Draw(t)
    for k in range(9): d.rectangle(cell_box(k)[:2] + (cell_box(k)[2] - 1, cell_box(k)[3] - 1), fill=(18, 14, 16))
    t.save(J('templates', 'template_3x3.png'))
    g = t.copy(); d = ImageDraw.Draw(g)
    for k in range(9):
        x0, y0, x1, y1 = cell_box(k)
        d.rectangle((x0 + 2, y0 + 2, x1 - 3, y1 - 3), outline=(90, 80, 70), width=2)
        d.text(((x0 + x1) // 2, (y0 + y1) // 2), str(k + 1), fill=(120, 110, 100), font=font(120), anchor='mm')
    d.text((SIZE // 2, 8), 'reading order 1-9: left to right, top to bottom  (numbers are NOT painted)', fill=(255, 255, 255), font=font(11), anchor='mt')
    g.save(J('templates', 'template_3x3_cell_numbers.png'))
    tt = t.copy(); d = ImageDraw.Draw(tt); x0, y0, x1, y1 = cell_box(8); d.rectangle((x0, y0, x1 - 1, y1 - 1), fill=MAG)
    tt.save(J('templates', 'template_talents_3x3.png'))
    tu = t.copy(); d = ImageDraw.Draw(tu)
    for k in range(1, 9): x0, y0, x1, y1 = cell_box(k); d.rectangle((x0, y0, x1 - 1, y1 - 1), fill=MAG)
    tu.save(J('templates', 'template_last_ultimate_3x3.png'))
    # examples: real painted trees laid in the template
    def example(cls, kind, row, n, name):
        ex = t.copy()
        for k in range(n):
            x0, y0, x1, y1 = cell_box(k)
            ex.paste(sheet_cell(cls, kind, row, k).resize((CELL, CELL), Image.LANCZOS), (x0, y0))
        if n < 9:
            for k in range(n, 9): x0, y0, x1, y1 = cell_box(k); ImageDraw.Draw(ex).rectangle((x0, y0, x1 - 1, y1 - 1), fill=MAG)
        ex.save(J('examples', name))
    if 'paladin' in painted:
        example('paladin', 'skills', 0, 9, 'example_skills__paladin_holy_wrath.png')
        example('wizard', 'skills', 2, 9, 'example_skills__wizard_storm.png')
        example('necromancer', 'skills', 1, 9, 'example_skills__necromancer_summoning.png')
        example('monk', 'talents', 0, 8, 'example_talents__monk_branch1.png')
    # style reference: a 12 x 8 board of the painted icons at 128 px
    pool = []
    for k in range(36):
        for cls in painted: pool.append(sheet_cell(cls, 'skills', k // 9, k % 9))
    for k in range(24):
        for cls in painted: pool.append(sheet_cell(cls, 'talents', k // 8, k % 8))
    step = max(1, len(pool) // 96)
    ref = Image.new('RGB', (1536, 1024), (8, 6, 7))
    for k, ic in enumerate(pool[::step][:96]):
        ref.paste(ic.resize((128, 128), Image.LANCZOS), ((k % 12) * 128, (k // 12) * 128))
    ref.save(J('style_reference', 'STYLE_REFERENCE.png'))
    for cls in painted:
        for kind, (rows, cols) in (('skills', (4, 9)), ('talents', (3, 8))):
            im = Image.open(os.path.join(ROOT, 'assets', 'ui', 'skills', f'{cls}_{kind}.png')).convert('RGB')
            im.resize((cols * 128, rows * 128), Image.LANCZOS).save(J('style_reference', f'{cls}_{kind}.jpg'), quality=92)
    for c in L['classes']:
        shutil.copy(os.path.join(exp, f'now/class_{c["id"]}.png'), J('class_portraits', f'{c["id"]}.png'))
    # overview: per class, every icon with its status (what the game shows today)
    for n, c in enumerate(L['classes']):
        overview_sheet(c, L, exp, sheet_cell).save(J('overview', f'{n + 1:02d}_{c["id"]}.jpg'), quality=88)
    # prompts + lists
    for b in L['batches']:
        open(J('prompts', f'{b["order"]:03d}_{b["id"]}.txt'), 'w', encoding='utf-8').write(batch_prompt(b, L))
    lite = dict(L); lite['icons'] = [{k: v for k, v in i.items() if k != 'now'} for i in L['icons']]
    json.dump(lite, open(J('icon_list.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    open(J('ICON_LIST.md'), 'w', encoding='utf-8').write(icon_list_md(L))
    open(J('ALL_PROMPTS.txt'), 'w', encoding='utf-8').write('\n\n'.join(batch_prompt(b, L) for b in L['batches']))
    open(J('icon_list.csv'), 'w', encoding='utf-8').write(icon_csv(L))
    tx = os.path.join(HERE, 'chatgpt_skill_icons')
    for f in ('README.md', 'STYLE_LOCK.md'):
        txt = open(os.path.join(tx, f), encoding='utf-8').read()
        open(J(f), 'w', encoding='utf-8').write(fill(txt, L))
    json.dump({'kit': KIT_ID, 'version': KIT_VERSION, 'sheets': {}, 'icons': {'<icon id>': 'icons/<icon id>.png'}, 'notes': ''},
              open(J('return_manifest_example.json'), 'w'), indent=1)
    shutil.copy(os.path.abspath(__file__), J('chatgpt_skill_icons.py'))
    out = os.path.join(ROOT, 'docs', 'art_kits', 'ChatGPT_Skill_Icon_Kit.zip')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for dp, _, fs in os.walk(tmp):
            for f in sorted(fs):
                p = os.path.join(dp, f); z.write(p, os.path.join('ChatGPT_Skill_Icon_Kit', os.path.relpath(p, tmp)))
    if '--unpacked' in args:
        dst = args[args.index('--unpacked') + 1]; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(tmp, dst)
    st = stats(L)
    print(f'{os.path.relpath(out, ROOT)}  {os.path.getsize(out) / 1e6:.1f} MB  ' + ', '.join(f'{k} {v}' for k, v in st.items()) + f', {len(L["batches"])} batches')


def stats(L):
    I = L['icons']
    return {'skills with art': sum(1 for i in I if i['type'] == 'skill' and i['status'] == 'art'),
            'skills without': sum(1 for i in I if i['type'] == 'skill' and i['status'] != 'art'),
            'talents with art': sum(1 for i in I if i['type'] == 'talent' and i['status'] == 'art'),
            'talents without': sum(1 for i in I if i['type'] == 'talent' and i['status'] != 'art'),
            'ultimates without': sum(1 for i in I if i['type'] == 'ultimate')}


def fill(txt, L):
    st = stats(L)
    B = L['batches']
    nb = lambda t: sum(1 for b in B if b['type'] == t)
    first = {t: next((b['order'] for b in B if b['type'] == t), 0) for t in ('skills', 'ultimates', 'talents')}
    last = {t: max((b['order'] for b in B if b['type'] == t), default=0) for t in ('skills', 'ultimates', 'talents')}
    names = [c['name'] for c in L['classes'] if c['painted_skill_sheet']]
    painted = ', '.join(names[:-1]) + ' and ' + names[-1] if len(names) > 1 else ''.join(names)
    todo = ', '.join(c['name'] for c in L['classes'] if not c['painted_skill_sheet'])
    rep = {'SKILLS_ART': st['skills with art'], 'SKILLS_TODO': st['skills without'], 'TALENTS_ART': st['talents with art'], 'TALENTS_TODO': st['talents without'],
           'ULTS_TODO': st['ultimates without'], 'N_BATCHES': len(B), 'N_SKILL_BATCHES': nb('skills'), 'N_TALENT_BATCHES': nb('talents'), 'N_ULT_BATCHES': nb('ultimates'),
           'SKILL_FIRST': f'{first["skills"]:03d}', 'SKILL_LAST': f'{last["skills"]:03d}', 'ULT_FIRST': f'{first["ultimates"]:03d}', 'ULT_LAST': f'{last["ultimates"]:03d}',
           'TAL_FIRST': f'{first["talents"]:03d}', 'TAL_LAST': f'{last["talents"]:03d}', 'PAINTED_CLASSES': painted, 'TODO_CLASSES': todo,
           'RETURN_ZIP': RETURN_NAME, 'ICON_PX': ICON_OUT, 'CELL': CELL, 'BORDER': BORDER, 'GUTTER': GUTTER,
           'SUMMON_ART': sum(1 for i in L['icons'] if i['type'] == 'skill' and i['status'] == 'art' and ('creature' in i['art_note'] or 'Glymmora' in i['art_note']))}
    for k, v in rep.items(): txt = txt.replace('{{' + k + '}}', str(v))
    return txt


def icon_csv(L):
    import csv
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(['id', 'type', 'class', 'tree_or_branch', 'slot', 'name', 'element', 'kind', 'has_art', 'art_note', 'batch', 'cell', 'description'])
    for i in L['icons']:
        w.writerow([i['id'], i['type'], i['className'], i['group'], i['slot'] + 1, i['name'], i['element'], i['kind'], 'yes' if i['status'] == 'art' else 'no',
                    i['art_note'], i.get('batch', ''), i.get('cell', ''), i['desc']])
    return buf.getvalue()


def icon_list_md(L):
    st = stats(L)
    out = ['# VELSCOUR skill icons: which have art, which need it', '',
           'Every skill, talent and class ultimate in the game. **HAS ART** = painted art the game shows today. **NEEDS ART** = drawn in code '
           '(an element gradient and a simple shape). `batch` / `cell` = where it is painted in this kit.', '',
           '| | Has art | Needs art |', '|---|---|---|',
           f'| Skills | {st["skills with art"]} | {st["skills without"]} |', f'| Talents | {st["talents with art"]} | {st["talents without"]} |',
           f'| Ultimates | 0 | {st["ultimates without"]} |', '']
    for c in L['classes']:
        out += [f'## {c["name"]}', '', c['look'] or c['about'], '']
        for typ, label in (('skill', 'Skill tree'), ('talent', 'Talent branch')):
            items = [i for i in L['icons'] if i['type'] == typ and i['cls'] == c['id']]
            groups = sorted({(i['group_index'], i['group']) for i in items})
            for gi, gn in groups:
                out += [f'### {label} {gi + 1}: {gn}', '', '| # | Name | Element | Status | Batch / cell |', '|---|---|---|---|---|']
                for i in [i for i in items if i['group_index'] == gi]:
                    st_ = 'HAS ART' + (' (creature portrait)' if 'creature' in i['art_note'] or 'Glymmora' in i['art_note'] else '') if i['status'] == 'art' else 'NEEDS ART'
                    out.append(f'| {i["slot"] + 1} | {i["name"]} | {i["element"]} | {st_} | {i.get("batch", "-")}{" / " + str(i["cell"]) if i.get("cell") else ""} |')
                out.append('')
        u = next((i for i in L['icons'] if i['type'] == 'ultimate' and i['cls'] == c['id']), None)
        if u: out += [f'**Ultimate:** {u["name"]} ({u["element"]}): NEEDS ART, {u.get("batch")} / cell {u.get("cell")}', '']
    return '\n'.join(out)


def overview_sheet(c, L, exp, sheet_cell):
    S, PAD, LH, LW = 88, 10, 30, 270
    items = [i for i in L['icons'] if i['cls'] == c['id']]
    rows = [('skill', g) for g in range(4)] + [('talent', g) for g in range(3)] + [('ultimate', 0)]
    W = LW + 9 * (S + 8) + PAD
    H = 70 + len(rows) * (S + LH + 8)
    im = Image.new('RGB', (W, H), (22, 18, 20)); d = ImageDraw.Draw(im)
    d.text((PAD, 10), f'{c["name"]}: what the game shows today', fill=(255, 236, 200), font=font(22))
    d.text((PAD, 40), 'green = has painted art      red = drawn in code, needs art', fill=(200, 190, 170), font=font(14))
    y = 70
    for typ, g in rows:
        its = [i for i in items if i['type'] == typ and i['group_index'] == g]
        if not its: continue
        d.text((PAD, y + S // 2 - 8), f'{typ.title()} {g + 1}: {its[0]["group"]}' if typ != 'ultimate' else 'Ultimate', fill=(240, 230, 210), font=font(14))
        for k, i in enumerate(its):
            x = LW + k * (S + 8)
            ic = Image.open(os.path.join(exp, i['now'])).convert('RGB').resize((S, S), Image.LANCZOS)
            im.paste(ic, (x, y))
            col = (60, 200, 90) if i['status'] == 'art' else (220, 60, 50)
            d.rectangle((x - 2, y - 2, x + S + 1, y + S + 1), outline=col, width=3)
            nm = i['name'] if len(i['name']) <= 15 else i['name'][:14] + '.'
            d.text((x + S // 2, y + S + 4), nm, fill=(230, 220, 200), font=font(10), anchor='mt')
        y += S + LH + 8
    return im


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('', [])
    {'kit': kit, 'pack': pack, 'import': import_}.get(cmd, lambda a: print(__doc__))(rest)
