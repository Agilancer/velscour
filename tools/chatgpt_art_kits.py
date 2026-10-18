"""
Build the ChatGPT art kits in docs/art_kits/: one zip per art type (enemies, bosses, pets, npcs, armor), each with
outlined templates, examples filled with the game's own art, a names file for ChatGPT to fill in, a README of
copy-paste prompts, and the import script. See docs/CHATGPT_ART_KITS.md.

    python tools/chatgpt_art_kits.py                # all five kits
    python tools/chatgpt_art_kits.py armor pets     # just these
    python tools/chatgpt_art_kits.py --unpacked DIR # also write the kit folders to DIR (to look at them)

Geometry lives in tools/chatgpt_art.py, so the templates and the importer always agree.
Needs: pip install pillow numpy scipy
"""
import io, json, os, re, shutil, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chatgpt_art import (W, H, KITS, LABEL_W, HEAD_H, PET_LAND, PET_WING, NPC, KNIGHT, ARMOR_S, ARMOR_TOP, ARMOR_EX_TOP,
                         ARMOR_FRAMES, ARCHES, ELEMENTS, RARITIES, CLASSES, ROOT)

OUT = os.path.join(ROOT, 'docs', 'art_kits')
MAG, CY, YEL, INK = (255, 0, 255, 255), (0, 229, 255, 255), (255, 210, 122, 255), (255, 255, 255, 255)


def font(size):
    for f in ('consolab.ttf', 'DejaVuSansMono-Bold.ttf', 'LiberationMono-Bold.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


CLEAN = False   # True: art only, no labels or guides (a stand-in for ChatGPT's reply; tools/tests/chatgpt_art.py)


class NoDraw:
    def __getattr__(self, name):
        return lambda *a, **k: None


def canvas(bg=MAG):
    im = Image.new('RGBA', (W, H), bg)
    return im, NoDraw() if CLEAN else ImageDraw.Draw(im)


def label(d, x, y, text, size=15, col=INK):
    d.text((x, y), text, font=font(size), fill=col, stroke_width=3, stroke_fill=(0, 0, 0, 255))


def dashed_line(d, a, b, col=CY, dash=(7, 5), w=2):
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0)); on, off = dash
    t = 0
    while t < n:
        e = min(n, t + on)
        d.line((x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n, x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n), fill=col, width=w)
        t += on + off


def dashed_box(d, x0, y0, x1, y1, col=CY):
    for a, b in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
        dashed_line(d, a, b, col)


def fit(im, w, h, up=True):
    """Scale an image to fit w x h, keeping its shape."""
    k = min(w / im.width, h / im.height)
    if not up:
        k = min(k, 1)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def trim(im):
    a = np.asarray(im)[:, :, 3] > 24
    ys, xs = np.nonzero(a)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def despeck(im, strong=True):
    """Keep the art, drop leftovers around it (frame numbers, captions and neighbours' scraps baked into some game
    atlases): pieces more than 3 px from the largest piece go unless they are big. strong=False keeps detached
    effect pieces (a golem's rising rocks) and drops only specks. Then trim."""
    a = np.array(im)
    solid = a[:, :, 3] > 24
    lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        main = int(np.argmax(sizes)) + 1
        near = ndimage.binary_dilation(lab == main, iterations=3)
        drop = [i for i in range(1, n + 1) if i != main and not (near & (lab == i)).any()
                and sizes[i - 1] < (0.35 if strong else 0.004) * sizes[main - 1]]
        a[np.isin(lab, drop), 3] = 0
    return trim(Image.fromarray(a))


def place(sheet, im, box, ground):
    """Centre im in box (x0, y0, x1, y1), feet on the ground line."""
    x0, y0, x1, y1 = box
    sheet.alpha_composite(im, (x0 + (x1 - x0 - im.width) // 2, ground - im.height))


def art_box(cell, inset):
    x0, y0, x1, y1 = cell
    l, t, r, b = inset
    return x0 + l, y0 + t, x1 - r, y1 - b


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert('RGBA').save(path, optimize=True)


# ---------------------------------------------------------------- single-pose sheets (enemies, bosses)
def single_sheet(kind, sprites=None, captions=None):
    sheet, d = canvas()
    k = KITS[kind]
    for i, cell in enumerate(k['cells']):
        x0, y0, x1, y1 = cell
        bx = art_box(cell, k['inset'])
        d.rectangle((x0, y0, x1 - 1, y1 - 1), outline=INK, width=2)
        if sprites:
            place(sheet, fit(sprites[i], bx[2] - bx[0], bx[3] - bx[1]), bx, bx[3])
        else:
            dashed_box(d, *bx)
            dashed_line(d, ((bx[0] + bx[2]) // 2, bx[3] - 18), ((bx[0] + bx[2]) // 2, bx[3] + 6), CY, (3, 3))
            label(d, bx[0] + 6, bx[3] - 22, 'feet', 12, YEL)
            label(d, bx[2] - 112, bx[1] + 6, 'faces right ->', 12, INK)
        d.line((bx[0], bx[3], bx[2], bx[3]), fill=YEL, width=3)
        label(d, x0 + 8, y0 + 6, '%s %02d' % ('MONSTER' if kind == 'enemies' else 'BOSS', i + 1), 17)
        label(d, x0 + 8, y0 + 28, captions[i] if captions else 'one creature, whole body', 12)
    return sheet


def set2_sprite(num):
    """Set 2 monster number num, trimmed, and its name."""
    for fam in os.listdir(os.path.join(ROOT, 'assets', 'source', 'enemies', 'set2')):
        d = os.path.join(ROOT, 'assets', 'source', 'enemies', 'set2', fam)
        for fn in os.listdir(d):
            if fn.startswith('ene_%03d_' % num):
                return trim(Image.open(os.path.join(d, fn)).convert('RGBA')), fn[8:-4].replace('_', ' ')
    raise FileNotFoundError(num)


# ---------------------------------------------------------------- animated sheets (pets, npcs)
def anim_sheet(kind, heads, row_names, rows=None):
    """rows: per character a list of frames (images), or None to leave that row as an empty template row."""
    sheet, d = canvas()
    k = KITS[kind]; cols = k['cols']
    cells = k['cells']
    for c in range(cols):
        x0, _, x1, _ = cells[c]
        label(d, x0 + 4, 12, heads[c], 13 if (x1 - x0) < 140 else 15)
    for r in range(4):
        y0, y1 = cells[r * cols][1], cells[r * cols][3]
        d.line((0, y0, W, y0), fill=INK, width=2)
        for i, line in enumerate(row_names[r].split('\n')):
            label(d, 6, y0 + 10 + i * 20, line, 15 if i == 0 else 12, INK if i == 0 else YEL)
    scale = []
    if rows:  # one scale per row (the same creature keeps its size from frame to frame)
        bx = art_box(cells[0], k['inset'])
        bw, bh = bx[2] - bx[0], bx[3] - bx[1]
        scale = [row and min(min(bw / f.width, bh / f.height) for f in row) for row in rows]
    for i, cell in enumerate(cells):
        x0, y0, x1, y1 = cell
        bx = art_box(cell, k['inset'])
        d.line((x0, y0, x0, y1), fill=(255, 255, 255, 140), width=1)
        if rows and rows[i // cols]:
            f = rows[i // cols][i % cols]
            k2 = scale[i // cols]
            f = f.resize((max(1, round(f.width * k2)), max(1, round(f.height * k2))), Image.LANCZOS)
            place(sheet, f, bx, bx[3])
        else:
            dashed_box(d, *bx)
        d.line((bx[0], bx[3], bx[2], bx[3]), fill=YEL, width=2)
    d.rectangle((0, 0, W - 1, H - 1), outline=INK, width=2)
    return sheet


def pet_rows(spec, strong=True):
    cat = json.load(open(os.path.join(ROOT, 'assets', 'sprites', 'pets', 'catalog.json')))
    rows = []
    for key in spec:
        e = cat[key]
        at = Image.open(os.path.join(ROOT, 'assets', 'sprites', 'pets', e['sheet'] + '.webp')).convert('RGBA')
        rows.append([despeck(at.crop((f * e['cellW'], e['row'] * e['cellH'], (f + 1) * e['cellW'], (e['row'] + 1) * e['cellH'])), strong)
                     for f in range(e['frames'])])
    return rows


def npc_rows(ids):
    rows = []
    for sid in ids:
        st = Image.open(os.path.join(ROOT, 'assets', 'sprites', 'townsfolk', 'townsfolk_%03d.webp' % sid)).convert('RGBA')
        rows.append([despeck(st.crop((f * 128, 0, f * 128 + 128, 192))) for f in range(st.width // 128)])
    return rows


# ---------------------------------------------------------------- armor
def class_frames(cls):
    z = zipfile.ZipFile(os.path.join(ROOT, 'assets', 'FinalClasses', cls + '.zip'))
    out = {}
    for n in z.namelist():
        m = re.search(r'armor/[a-z_]+_armor_(\d+)_([a-z]+)\.png$', n)
        if m:
            out[int(m.group(1))] = (Image.open(io.BytesIO(z.read(n))).convert('RGBA'), m.group(2))
    return out


def class_identity(cls):
    """The character line from the class's original generation prompt (inside its gear zip)."""
    z = zipfile.ZipFile(os.path.join(ROOT, 'assets', 'FinalClasses', cls + '.zip'))
    n = [x for x in z.namelist() if x.endswith('armor_prompt.txt')]
    t = z.read(n[0]).decode('utf-8', 'replace') if n else ''
    m = re.search(r'(?:character identity|class identity|character):\s*(.*?)\.\s*(?:Same|Repeat)', t)
    if m:
        return m.group(1).strip()
    return {'slime_lord': 'a humanoid of cold translucent cobalt-blue slime with a bare rounded slime head; muted steel '
                          'and bronze armor and purple textiles'}.get(cls, 'see the class reference')


def title(cls):
    return cls.replace('_', ' ').upper()


EXAMPLE_ARMOR = 68          # the "good example" frame per class (Legendary band, 65-74)
FILLED_ARMOR = [14, 30, 46, 60, 77]   # the examples sheet: one armor from each band above Common


def armor_sheet(cls, frames, fill=None):
    sheet, d = canvas()
    ref, _ = frames[1]
    ex, ex_r = frames[EXAMPLE_ARMOR]
    s = ARMOR_S
    label(d, 12, 10, '%s  -  5 NEW BODY ARMORS' % title(cls), 30)
    label(d, 12, 52, 'Same hero, same face, BARE HEAD (no helmet), same pose facing right. Only the outfit changes.', 15, YEL)
    label(d, 12, 76, 'Each frame is 128 x 192 game pixels drawn at 2x. Top of head on the cyan line, feet on the yellow line.', 13)
    # reference column
    for (img, top, cap1, cap2) in ((ref, ARMOR_TOP, 'CLASS REFERENCE', 'the hero (armor 001)'),
                                   (ex, ARMOR_EX_TOP, 'GOOD EXAMPLE', 'armor %03d, %s' % (EXAMPLE_ARMOR, ex_r))):
        d.rectangle((0, top, 255, top + 384), fill=(52, 46, 58, 255))
        sheet.alpha_composite(img.resize((128 * s, 192 * s), Image.NEAREST), (0, top))
        d.rectangle((0, top, 255, top + 383), outline=INK, width=2)
        label(d, 6, top + 386 if top == ARMOR_EX_TOP else top - 22, cap1, 15, YEL)
        label(d, 6, top + 406 if top == ARMOR_EX_TOP else top + 388, cap2, 12)
    label(d, 6, ARMOR_EX_TOP - 50, title(cls), 22)
    # guide lines across the reference and the five frames
    top, feet = 24 * s, 183 * s
    for i, (x0, y0, x1, y1) in enumerate(ARMOR_FRAMES):
        if fill:
            sheet.alpha_composite(fill[i].resize((128 * s, 192 * s), Image.NEAREST), (x0, y0))
        else:
            dashed_box(d, x0 + 2, y0 + 2, x1 - 2, y1 - 2)
            label(d, x0 + 10, y0 + 170, 'draw the hero\nin new armor\nhere', 14, INK)
        d.rectangle((x0, y0, x1 - 1, y1 - 1), outline=INK, width=2)
        label(d, x0 + 8, y0 - 22, 'ARMOR %d' % (i + 1), 15)
        label(d, x0 + 8, y1 + 4, 'rarity: %s' % ('......' if not fill else 'example'), 12, YEL)
    dashed_line(d, (0, ARMOR_TOP + top), (W, ARMOR_TOP + top), CY, (10, 6))
    dashed_line(d, (0, ARMOR_TOP + feet), (W, ARMOR_TOP + feet), YEL, (10, 6))
    hx, hy = 64 * s, 40 * s
    for x0, y0, _, _ in [(0, ARMOR_TOP, 0, 0)] + ARMOR_FRAMES:
        d.line((x0 + hx - 8, y0 + hy, x0 + hx + 8, y0 + hy), fill=CY, width=2)
        d.line((x0 + hx, y0 + hy - 8, x0 + hx, y0 + hy + 8), fill=CY, width=2)
    label(d, W - 230, ARMOR_TOP + top - 22, 'top of head', 13, CY)
    label(d, W - 230, ARMOR_TOP + feet + 4, 'feet', 13, YEL)
    # notes under the frames
    notes = ['RULES', '- Keep the left column as it is; only the five frames are read.',
             '- No helmet, hood, hat or crown: helmets are separate items in the game.',
             '- No weapon, shield, cape flaring outside the frame, ground or shadow.',
             '- Each armor is a different design, not a recolour. Hands empty, arms relaxed.',
             '- Background stays flat magenta #FF00FF. No text in the frames.',
             '- Head, face, hair and skin identical to the CLASS REFERENCE (the game keeps',
             '  them out of the armor recolour, so they must match exactly).']
    for i, line in enumerate(notes):
        label(d, 286, 560 + i * 26, line, 16 if i == 0 else 14, YEL if i == 0 else INK)
    return sheet


def armor_overview():
    im = Image.new('RGBA', (1024, 4 * 236 + 10), (32, 34, 38, 255))
    d = ImageDraw.Draw(im)
    for k, cls in enumerate(CLASSES):
        fr = class_frames(cls)
        x, y = (k % 4) * 256, (k // 4) * 236 + 6
        im.alpha_composite(fr[1][0], (x, y + 26)); im.alpha_composite(fr[EXAMPLE_ARMOR][0], (x + 128, y + 26))
        label(d, x + 6, y + 2, title(cls), 14, YEL)
    return im


# ---------------------------------------------------------------- READMEs
STYLE = '''We are making art for VELSCOUR, a retro isometric pixel-art action RPG in the style of Diablo II
(dark fantasy, grimdark, gothic). Everything is seen from the game's 3/4 isometric camera, slightly from above.

Rules for every image I ask for:
- Crisp, detailed pixel-art sprites with hard edges, a dark muted palette, light from the upper left.
  Match the attached EXAMPLE's rendering style, level of detail and size in the frame exactly.
- Follow the attached TEMPLATE exactly: same 1536x1024 canvas, same grid, same cell order. The cyan dashed
  boxes are bounding outlines: fit the art inside them. Feet stand on the yellow ground line.
- Characters face RIGHT (three-quarter view towards screen right).
- Background: pure flat magenta #FF00FF everywhere (or real transparency). No shadows on the ground, no floor,
  no gradients, no glow that bleeds far outside the creature. Sprites never touch each other or the cell edges.
- Remove ALL guide marks from your output: no cyan or yellow lines, no labels, no numbers, no text, no borders.
- Every cell is a different design unless I say otherwise; keep one consistent style across all sheets.
Reply "ready" and wait for the first sheet.'''


def readme(kind):
    head = '# VELSCOUR ChatGPT %s kit\n\n' % {'enemies': 'enemy', 'bosses': 'boss', 'pets': 'pet', 'npcs': 'NPC (townsfolk)',
                                              'armor': 'armor'}[kind]
    run = ('## Importing the result\n\nSave ChatGPT\'s image and the filled-in names file, then from the repository root:\n\n'
           '```bash\npython tools/chatgpt_art.py %s <image.png> <names.json> --dry   # cut only: look at tools/tests/out/chatgpt_art/preview.png\n'
           'python tools/chatgpt_art.py %s <image.png> <names.json>\n```\n'
           '`chatgpt_art.py` is in this zip too (it lives in `tools/`). It needs `pip install pillow numpy scipy`.\n' % (kind, kind))
    check = ('## Check the reply before importing\n\n- Same 3:2 canvas (1536 x 1024), same number of cells, nothing in the wrong cell.\n'
             '- Background flat magenta, no floor or shadow under the art, no labels or guide lines left over.\n'
             '- Nothing touching a neighbour or crossing a cell edge (the importer gives each cell the art whose centre is in it).\n'
             '- If one cell is wrong, ask: "Redraw only cell N, keep everything else pixel-identical."\n\n')
    style = '## Step 0: paste this first (style bible)\n\nOpen a new chat, attach nothing, paste:\n\n```text\n%s\n```\n\n' % STYLE
    if kind == 'enemies':
        body = ('A sheet of **10 monsters** for one family (a themed group, like set 2\'s goblins or slimes). Each monster is a '
                'single still pose: the game moves, flips, flashes and sizes it (`h` in the names file), and palette-swaps '
                'it per biome. So draw every monster as large as its cyan box allows, whole body, feet on the yellow line.\n\n'
                '| File | Size | What |\n|---|---|---|\n'
                '| `templates/enemies_template.png` | 1536 x 1024 | 5 x 2 cells (307 x 512), outlines and ground lines |\n'
                '| `examples/enemies_example.png` | 1536 x 1024 | the same layout filled with ten of the game\'s monsters |\n'
                '| `enemies_names_template.json` | | names, AI archetype, height and element per cell, filled in by ChatGPT |\n\n'
                + style +
                '## Step 1: the sheet\n\nAttach the template and the example, then paste (fill the brackets):\n\n```text\n'
                'Sheet: 10 MONSTERS. Attached: template and example. Family: [e.g. "drowned sailors: bloated, barnacled\n'
                'corpses with rusted cutlasses, kelp and green-black water"]. 1536x1024, 5 columns x 2 rows of equal cells,\n'
                'one monster per cell in reading order, each fitting its cyan box, feet on the yellow line, facing right.\n'
                'Ten clearly different monsters of this family: mix sizes and roles (a small fast one, a ranged one, a caster,\n'
                'a tank, a brute...). [Optional: list them: 1 = ..., 2 = ...]. Same style and detail as the example.\n```\n\n'
                '## Step 2: the names file\n\nAttach `enemies_names_template.json` and paste:\n\n```text\n'
                'Fill in this JSON for the 10 monsters you drew, in the same order. "family" is one lowercase word for the\n'
                'group. For each monster: "name" (2-3 words), "arch" (the AI it fights with, one of the listed archetypes),\n'
                '"h" (height in game pixels: the hero is 60; imps and crawlers 30-40, men 54-58, brutes 64-80),\n'
                '"el" (element it shows, or "" for none). Keep the keys exactly; reply with the JSON only.\n```\n\n'
                + run + '\nThe sprites go to `assets/source/enemies/set3/<family>/` (numbered after the existing ones) and the enemy '
                'importer packs them into an atlas. The script prints one `BESTIARY` row per monster to paste into '
                '`src/data/bestiary.js`; after that they spawn in levels whose biome rosters use their archetypes.\n\n' + check)
    elif kind == 'bosses':
        body = ('A sheet of **6 bosses**: guardians and raid bosses. Same idea as the enemy kit, with bigger cells (512 x 512, the '
                'size set 2\'s titans, colossi and hydras were drawn at) and more detail. Bosses never join packs; each depth '
                'picks its guardian from them.\n\n'
                '| File | Size | What |\n|---|---|---|\n'
                '| `templates/bosses_template.png` | 1536 x 1024 | 3 x 2 cells of 512 x 512 |\n'
                '| `examples/bosses_example.png` | 1536 x 1024 | six of the game\'s boss sprites in the same layout |\n'
                '| `bosses_names_template.json` | | names, AI archetype, height and element, filled in by ChatGPT |\n\n'
                + style +
                '## Step 1: the sheet\n\n```text\nSheet: 6 BOSSES. Attached: template and example. Theme: [e.g. "kings of a drowned '
                'empire"].\n1536x1024, 3 columns x 2 rows of 512x512 cells, one huge boss per cell in reading order, each filling its\n'
                'cyan box, feet (or base) on the yellow line, facing right. Make them imposing and unmistakably bosses:\n'
                'crowns, giant weapons, many limbs, glowing cores. Very different silhouettes. Same style as the example.\n```\n\n'
                '## Step 2: the names file\n\n```text\nFill in this JSON for the 6 bosses in order. "family" is one lowercase word. '
                'Per boss: "name",\n"arch" (one of the listed archetypes; golem/abomination/demon/knight suit big melee bosses, cultist/eye/'
                'wraith\ncasters), "h" (height in game pixels: the hero is 60, bosses 90-160), "el" (or ""), and "fly" true for\n'
                'flying bosses. Keep the keys exactly; reply with the JSON only.\n```\n\n'
                + run + '\nThe printed `BESTIARY` rows carry `boss: true, lone: true`. To also use one as a raid boss (every 5th depth), '
                'give a `RAID_BOSSES` entry in `src/game/raid.js` its id as `art`.\n\n' + check)
    elif kind == 'pets':
        body = ('A sheet of **4 animated pets** (summons and companions). Two layouts, matching the game\'s pet animations:\n\n'
                '- **Land** (walkers): 9 frames per pet: REST, SPAWN 1-3 (rising out of the ground or arriving), RUN 1-3, ATTACK 1-2.\n'
                '- **Winged** (flyers): 6 frames per pet: FLAP 1-3 (hovering in place), FLY 1-3 (flying forward).\n\n'
                '| File | Size | What |\n|---|---|---|\n'
                '| `templates/pets_land_template.png` | 1536 x 1024 | 4 rows x 9 frames, frame names on top |\n'
                '| `templates/pets_winged_template.png` | 1536 x 1024 | 4 rows x 6 frames |\n'
                '| `examples/pets_land_example.png` | 1536 x 1024 | Wolf, Bear, Skeleton Warrior, Fire Golem |\n'
                '| `examples/pets_winged_example.png` | 1536 x 1024 | Storm Hawk, Raven, Phoenix, Drake Whelp |\n'
                '| `pets_names_template.json` | | sheet name, land or winged, and the four pets |\n\n'
                + style +
                '## Step 1: the sheet\n\nAttach the land (or winged) template and its example:\n\n```text\n'
                'Sheet: 4 ANIMATED PETS, LAND. Attached: template and example. 1536x1024. Each ROW is one pet, each COLUMN one\n'
                'animation frame in this order: rest, spawn 1, spawn 2, spawn 3, run 1, run 2, run 3, attack 1, attack 2.\n'
                'Pets: [1 = ..., 2 = ..., 3 = ..., 4 = ...]. The SAME creature in every frame of its row (same colours,\n'
                'markings, size and gear); only the pose changes. Spawn: from crouched/forming to standing. Run: a 3-frame\n'
                'gallop or stride. Attack: wind-up and strike (bite, claw, slash or spell). Facing right, feet on the yellow\n'
                'line, every pose inside its cyan box. Leave the left label column and the top header empty magenta.\n```\n'
                'Winged: "...each COLUMN one frame: flap 1, flap 2, flap 3 (wings up, level, down while hovering), fly 1, fly 2,\n'
                'fly 3 (body tilted forward, flying right)."\n\n'
                '## Step 2: the names file\n\n```text\nFill in this JSON: "sheet" (one lowercase word naming this group), "kind" ("land" '
                'or "winged"),\nand for each row "name" and "h" (height in game pixels: the hero is 60; wolves 34, bears 44, birds 26-34).\n'
                'Reply with the JSON only.\n```\n\n'
                + run + '\nThe frames are cut to a clean sheet in `assets/source/pet_animations/` and packed by '
                '`tools/build_pet_animations.py`; `src/core/petart.js` animates any summon whose key matches a row. '
                'The script prints a `SUMMONS` entry per pet for `src/data/summons.js`.\n\n' + check)
    elif kind == 'npcs':
        body = ('A sheet of **4 animated townsfolk** for Herrington Hollow and the overworld roads. Same frames as the town\'s '
                'existing 25 identities (each frame 128 x 192 in game):\n\n'
                '- **Townsfolk**: 11 frames: IDLE 1-3, WALK 1-2, DYING, DEAD (lying on the ground), SCREAM (scared), POINT '
                '(scared, pointing), HAPPY, CHEER (celebrating, arms up).\n'
                '- **Knights / guards**: the same 11 plus ATTACK 1-2 (sword wind-up, strike): use the knights template.\n\n'
                '| File | Size | What |\n|---|---|---|\n'
                '| `templates/npcs_template.png` | 1536 x 1024 | 4 rows x 11 frames |\n'
                '| `templates/knights_template.png` | 1536 x 1024 | 4 rows x 13 frames |\n'
                '| `examples/npcs_example.png` | 1536 x 1024 | Baker, Healer, Boy, King |\n'
                '| `examples/knights_example.png` | 1536 x 1024 | the town\'s four knights |\n'
                '| `npcs_names_template.json` | | names, roles, child or adult |\n\n'
                + style +
                '## Step 1: the sheet\n\n```text\nSheet: 4 TOWNSFOLK. Attached: template and example. 1536x1024. Each ROW is one '
                'person, each COLUMN one frame:\nidle 1, idle 2, idle 3, walk 1, walk 2, dying, dead (lying flat), scream (scared), '
                'point (scared, pointing),\nhappy, cheer (arms raised). People: [1 = an old fisherman, 2 = ..., 3 = ..., 4 = ...]. The '
                'SAME person in every\nframe of a row: same face, hair, clothes, colours and size. Medieval dark-fantasy village folk, '
                'facing right,\nfeet on the yellow line, inside the cyan boxes. Leave the label column and header empty magenta.\n```\n'
                'Knights: use `knights_template.png` and add "...cheer, attack 1 (sword raised), attack 2 (sword swung down)".\n\n'
                '## Step 2: the names file\n\n```text\nFill in this JSON for the 4 people in order: "name", "role" (their job), '
                'and "child" true for children.\nSet "knights" true if this is the knights sheet. Reply with the JSON only.\n```\n\n'
                + run + '\nEach person becomes `assets/sprites/townsfolk/townsfolk_NNN.webp` (numbered after 100) with a '
                '`manifest.json` entry. To put them in town, point townsfolk at the new numbers in `src/data/townsfolk.js` '
                '(`spriteForJob`, or a row in `knights` / `court` / `regular`).\n\n' + check)
    else:
        body = ('**5 new body armors at a time for one class.** One template per class (`templates/<class>_armor_template.png`): '
                'the class\'s hero (armor 001) on the left with its name, one good example armor (a Legendary, armor %03d) '
                'under it, and five empty frames for the new armors. The guide lines run straight from the reference across '
                'the frames: top of the head (cyan), feet (yellow), and the head anchor cross the helmets are fitted to.\n\n'
                'In game each armor is one still frame, 128 x 192, facing right, unhelmed: helmets are separate items '
                'drawn over the head, and the face, hair and skin are kept out of the armor\'s palette swaps. That is why the '
                'head must not change.\n\n'
                '| File | Size | What |\n|---|---|---|\n'
                '| `templates/<class>_armor_template.png` (16) | 1536 x 1024 | reference + example + 5 empty frames at 2x |\n'
                '| `examples/<class>_armor_example.png` (16) | 1536 x 1024 | the same sheet with five of the class\'s armors filled in |\n'
                '| `classes_overview.png` | 1024 x 954 | every class: hero and example side by side |\n'
                '| `armor_names_template.json` | | class, and name + rarity for each of the five |\n\n'
                % EXAMPLE_ARMOR + style.replace('Characters face RIGHT', 'The hero faces RIGHT') +
                '## Step 1: the sheet (one class per message)\n\nAttach the class\'s template and example, then paste '
                '(the class lines below give the hero\'s look):\n\n```text\nSheet: 5 NEW BODY ARMORS for the [CLASS]. Attached: template '
                'and example. 1536x1024, keep the left column\n(class reference and good example) untouched. In each of the five '
                'frames draw the SAME hero as the\nCLASS REFERENCE: [class line]. Same face, hair, bare head, body proportions, '
                'neutral standing pose\nand three-quarter facing-right angle; top of the head on the cyan line, feet on the yellow '
                'line, head\ncentred on the cyan cross. Only the outfit changes: five structurally different armors (not recolours):\n'
                '[1 = ..., 2 = ..., 3 = ..., 4 = ..., 5 = ...]. Vary pauldrons, breastplates, cloth and leather cuts, belts,\n'
                'gauntlets, greaves. No helmet, hood, hat or crown, no weapons, no shield, empty hands. Same pixel style and\n'
                'detail as the good example. Flat magenta background, no text in the frames.\n```\n\n'
                'Ask for rarities in the brackets if you like: Common = patched, plain; Uncommon = sturdier; Rare = fitted, '
                'trimmed; Epic = ornate; Legendary = ceremonial, glowing details; Mythic = otherworldly.\n\n'
                '### Class lines\n\n| Class | Hero |\n|---|---|\n' +
                ''.join('| %s | %s |\n' % (title(c).title(), class_identity(c)) for c in CLASSES) +
                '\n## Step 2: the names file\n\n```text\nFill in this JSON: "class" (the id from the list), and for each of the five '
                'armors, in order, "name"\nand "rarity" (common, uncommon, rare, epic, legendary or mythic). Reply with the JSON only.\n```\n\n'
                + run + '\nThe importer scales each armor so its head and feet sit exactly where the class\'s hero has them, saves '
                '`assets/source/gear_additions/<class>/<class>_armor_NNN_<rarity>.png` (numbered from 81) and reruns '
                '`python tools/process_assets.py gear <class>`. New armors drop alongside the zip\'s armors of the same rarity '
                '(`extra` in `gear.json`). Check with `node tools/tests/gear.js <class>`.\n\n' + check +
                '- The face must match the reference. If it drifted, ask ChatGPT to "keep the head from the class reference '
                'exactly" and redraw.\n')
    return head + body


def names_template(kind):
    if kind in ('enemies', 'bosses'):
        n = 10 if kind == 'enemies' else 6
        row = {'name': '', 'arch': '', 'h': 54 if kind == 'enemies' else 120, 'el': ''}
        if kind == 'bosses':
            row['fly'] = False
        return {'_help': {'arch': ARCHES, 'el': ELEMENTS + [''], 'h': 'height in game pixels; the hero is 60',
                          'set': 'the folder under assets/source/enemies (keep set3)'},
                'set': 'set3', 'family': '', 'monsters': [dict(row) for _ in range(n)]}
    if kind == 'pets':
        return {'_help': {'kind': ['land', 'winged'], 'h': 'height in game pixels; the hero is 60, wolves 34, bears 44'},
                'sheet': '', 'kind': 'land', 'pets': [{'name': '', 'h': 34} for _ in range(4)]}
    if kind == 'npcs':
        return {'_help': {'knights': 'true for the 13-frame knights sheet', 'child': 'true for children'},
                'knights': False, 'npcs': [{'name': '', 'role': '', 'child': False} for _ in range(4)]}
    return {'_help': {'class': CLASSES, 'rarity': RARITIES}, 'class': '',
            'armors': [{'name': '', 'rarity': ''} for _ in range(5)]}


# ---------------------------------------------------------------- build
ENEMY_EX = [1, 31, 151, 171, 211, 249, 261, 286, 45, 15]
BOSS_EX = [71, 80, 96, 110, 121, 146]


def build(kind):
    files = {}
    if kind == 'enemies':
        files['templates/enemies_template.png'] = single_sheet('enemies')
        sp = [set2_sprite(n) for n in ENEMY_EX]
        files['examples/enemies_example.png'] = single_sheet('enemies', [s for s, _ in sp], [c for _, c in sp])
    elif kind == 'bosses':
        files['templates/bosses_template.png'] = single_sheet('bosses')
        sp = [set2_sprite(n) for n in BOSS_EX]
        files['examples/bosses_example.png'] = single_sheet('bosses', [s for s, _ in sp], [c for _, c in sp])
    elif kind == 'pets':
        names = ['PET %d\nname:\n........' % (i + 1) for i in range(4)]
        files['templates/pets_land_template.png'] = anim_sheet('pets_land', PET_LAND, names)
        files['templates/pets_winged_template.png'] = anim_sheet('pets_winged', PET_WING, names)
        files['examples/pets_land_example.png'] = anim_sheet('pets_land', PET_LAND, ['WOLF', 'BEAR', 'SKELETON\nWARRIOR', 'FIRE\nGOLEM'],
                                                             pet_rows(['wolf', 'bear', 'skeleton', 'firegolem'], False))
        files['examples/pets_winged_example.png'] = anim_sheet('pets_winged', PET_WING, ['HAWK', 'RAVEN', 'PHOENIX', 'DRAKE\nWHELP'],
                                                               pet_rows(['stormhawk', 'raven', 'phoenix', 'whelp']))
    elif kind == 'npcs':
        names = ['PERSON %d\nname:\n........' % (i + 1) for i in range(4)]
        files['templates/npcs_template.png'] = anim_sheet('npcs', NPC, names)
        files['templates/knights_template.png'] = anim_sheet('knights', KNIGHT, ['KNIGHT %d\nname:\n........' % (i + 1) for i in range(4)])
        files['examples/npcs_example.png'] = anim_sheet('npcs', NPC, ['BAKER', 'HEALER', 'BOY\n(child)', 'KING'], npc_rows([1, 6, 3, 10]))
        files['examples/knights_example.png'] = anim_sheet('knights', KNIGHT, ['SIR\nALDRIC', 'DAME\nMAEVE', 'KNIGHT 3\nname:\n........', 'KNIGHT 4\nname:\n........'],
                                                           npc_rows([19, 20]) + [None, None])  # 21-22 have sliced frames
    else:
        for cls in CLASSES:
            fr = class_frames(cls)
            files['templates/%s_armor_template.png' % cls] = armor_sheet(cls, fr)
            files['examples/%s_armor_example.png' % cls] = armor_sheet(cls, fr, [fr[i][0] for i in FILLED_ARMOR])
        files['classes_overview.png'] = armor_overview()
    return files


def main():
    args = sys.argv[1:]
    unpacked = None
    if '--unpacked' in args:
        i = args.index('--unpacked'); unpacked = args[i + 1]; del args[i:i + 2]
    kinds = args or ['enemies', 'bosses', 'pets', 'npcs', 'armor']
    os.makedirs(OUT, exist_ok=True)
    for kind in kinds:
        name = {'enemies': 'Enemy', 'bosses': 'Boss', 'pets': 'Pet', 'npcs': 'NPC', 'armor': 'Armor'}[kind]
        root = 'ChatGPT_%s_Kit/' % name
        files = build(kind)
        zpath = os.path.join(OUT, 'ChatGPT_%s_Kit.zip' % name)
        with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr(root + 'README_prompts.md', readme(kind))
            z.writestr(root + '%s_names_template.json' % kind, json.dumps(names_template(kind), indent=1))
            z.write(os.path.join(ROOT, 'tools', 'chatgpt_art.py'), root + 'chatgpt_art.py')
            for p, img in files.items():
                b = io.BytesIO(); img.save(b, 'PNG', optimize=True)
                z.writestr(root + p, b.getvalue())
                if unpacked:
                    save(img, os.path.join(unpacked, root, p))
        if unpacked:
            with open(os.path.join(unpacked, root, 'README_prompts.md'), 'w', encoding='utf-8') as f:
                f.write(readme(kind))
        print('%-8s %2d images  %s  %d KB' % (kind, len(files), os.path.relpath(zpath, ROOT), os.path.getsize(zpath) // 1024))


if __name__ == '__main__':
    main()
