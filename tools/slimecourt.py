"""Slime Court: pack the Glymmora slime sheets into the Slime Lord's per-slime animation atlases.

    python tools/slimecourt.py "<folder of Glymmora slime sheets>" [--debug out_dir]

The sheets (the user's "HI RES SLIME SPRITES" folder, 124 MB) stay outside the repo; SETS below names the file of
each slime. Two kinds of sheet:
  detail - one slime per sheet with battle animations and an ISOMETRIC GAME SPRITES panel. Only the isometric panel is
           read: 8 labelled rows (idle, walk, run, jump, attack, open, ability, special) of 3 frames, found from the
           faint row rules under the panel header.
  card   - ten small cards per sheet (5 x 2), each a portrait and 7 rows (idle, walk, squish, jump, attack, hurt, die)
           of 5 frames.
Every connected piece of art goes whole to the frame whose row and column hold its centre, so effects are never cut.
The dark card background is keyed out with soft alpha (the glows stay, unpremultiplied off the background).
Each set becomes assets/sprites/slimes/<id>.webp (a row per animation, a column per frame, one cell size, the slime's
feet at the anchor) and is listed in assets/sprites/slimes/slimes.json. src/gfx/slimeart.js draws them.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/sprites/slimes'
DETAIL_ROWS = ['idle', 'walk', 'run', 'jump', 'attack', 'open', 'ability', 'special']
CARD_ROWS = ['idle', 'walk', 'squish', 'jump', 'attack', 'hurt', 'die']
FEATHER = 8  # px over which art fades out at a cell's edge
BODY = 46  # px height a slime's idle body is packed at (bigger art is scaled down to it; small cards stay as they are)

T = 'ChatGPT Image Oct 18, 2026, '
# id: (kind of slime it plays, sheet, how to read it). detail: {'x0': label column end, ...overrides};
# card: (column 0-4, row 0-1) of the card on its sheet.
SETS = {
    # ---- RED: the Pouncer (leaps on foes from afar) and the Berserker (rolling cleaver)
    'blood_moon':    ('pouncer', T + '07_52_13 PM-1.png', {'x0': 140}),
    'doom':          ('pouncer', T + '07_52_16 PM-2.png', {'x0': 140}),
    'ember':         ('pouncer', 'Fantasy Slime Character Collection Sheet-2.png', (0, 0)),
    'volcano':       ('pouncer', 'Fantasy Slime RPG Character Compendium-1.png', (0, 0)),
    'ember_2':       ('pouncer', 'Ultimate Slime Compendium Sprite Sheet-5.png', (0, 0)),
    'dragon':        ('berserker', T + '07_52_18 PM-3.png', {'x0': 140}),
    'lava':          ('berserker', 'Fantasy Slime Character Collection Sheet-2.png', (3, 0)),
    'volcanic':      ('berserker', 'Ten Slime Monster Animation Cards-3.png', (2, 0)),
    'molten':        ('berserker', 'Ultimate Slime Compendium Sprite Sheet-5.png', (3, 0)),
    'crimson_moon':  ('berserker', 'Ten Slime Monster Animation Cards-3.png', (3, 1)),
    # ---- GOLD: the Bulwark (taunting tank) and the Warden (shields the Lord, repels foes)
    'sun_emperor':   ('bulwark', T + '07_52_19 PM-4.png', {'x0': 140}),
    'sandspirit':    ('bulwark', 'Ten Slime Monster Animation Cards-3.png', (1, 1)),
    'sand_pharaoh':  ('bulwark', 'Fantasy Slime RPG Character Compendium-1.png', (0, 1)),
    'gold':          ('bulwark', 'Ultimate Slime Compendium Sprite Sheet-5.png', (1, 1)),
    'honey':         ('warden', 'GLYMMORA Slime Compendium-4.png', (0, 1)),
    'sunblossom':    ('warden', 'Ten Slime Monster Animation Cards-3.png', (0, 0)),
    'sunlight':      ('warden', 'Fantasy Slime RPG Character Compendium-1.png', (2, 1)),
    'holy':          ('warden', 'Fantasy Slime Character Collection Sheet-2.png', (3, 1)),
    # ---- GREEN: the Mender (heals the Lord with a sap tether) and the Druid (healing blooms, thorn snares)
    'sap':           ('mender', T + '07_52_51 PM-6.png', {'x0': 200, 'rows': [1071, 1105, 1141, 1180, 1220, 1257, 1296, 1353, 1418]}),
    'meadow':        ('mender', T + '07_52_46 PM-2.png', {'x0': 200, 'rows': [1068, 1110, 1149, 1190, 1226, 1267, 1310, 1360, 1415]}),
    'forest_sprout': ('mender', 'Fantasy Slime RPG Character Compendium-1.png', (1, 0)),
    'nature':        ('mender', 'Fantasy Slime Character Collection Sheet-2.png', (1, 0)),
    'bramble':       ('druid', 'Ten Slime Monster Animation Cards-3.png', (1, 0)),
    'forest':        ('druid', 'Ultimate Slime Compendium Sprite Sheet-5.png', (1, 0)),
    'forest_2':      ('druid', 'GLYMMORA Slime Compendium-4.png', (1, 0)),
    'nature_spirit': ('druid', 'Ultimate Slime Compendium Sprite Sheet-5.png', (3, 1)),
    # ---- BLUE: the Tide Mage (homing water orbs, bubble traps) and the Frost Sage (lightning chains, frost novas)
    'sorcerer':      ('tide', T + '07_49_36 PM-2.png', {'x0': 150}),
    'mermaid':       ('tide', T + '07_49_41 PM-6.png', {'x0': 150}),
    'music':         ('tide', T + '07_49_47 PM-10.png', {'x0': 150}),
    'pirate':        ('tide', T + '07_49_40 PM-5.png', {'x0': 150}),
    'deep_diver':    ('tide', T + '07_49_44 PM-8.png', {'x0': 150}),
    'puddle_prank':  ('tide', T + '07_52_20 PM-5.png', {'x0': 140}),
    'bubblefin':     ('tide', T + '07_52_21 PM-6.png', {'x0': 140}),
    'ice_emperor':   ('frost', T + '07_49_43 PM-7.png', {'x0': 150}),
    'starfall':      ('frost', T + '07_49_39 PM-4.png', {'x0': 150}),
    'tidal_beast':   ('frost', T + '07_49_38 PM-3.png', {'x0': 150}),
    'ninja':         ('frost', T + '07_49_33 PM-1.png', {'x0': 150}),
    'glacier_grin':  ('frost', T + '07_52_23 PM-7.png', {'x0': 140}),
    'jelly_jolt':    ('frost', T + '07_52_24 PM-8.png', {'x0': 140}),
    'tidal_samurai': ('frost', T + '07_52_25 PM-9.png', {'x0': 140}),
    # ---- PURPLE: the Hexer (curses, void pulls) and the Venom Spitter (poison lobs and clouds)
    'prism_witch':   ('hexer', T + '07_52_26 PM-10.png', {'x0': 140}),
    'shadow':        ('hexer', 'Fantasy Slime Character Collection Sheet-2.png', (2, 1)),
    'shadow_2':      ('hexer', 'Ultimate Slime Compendium Sprite Sheet-5.png', (2, 1)),
    'cosmic':        ('hexer', 'Ultimate Slime Compendium Sprite Sheet-5.png', (4, 1)),
    'galaxy':        ('hexer', 'Fantasy Slime RPG Character Compendium-1.png', (3, 1)),
    'poison_ivy':    ('venom', 'Ten Slime Monster Animation Cards-3.png', (0, 1)),
    'poison_mist':   ('venom', 'Fantasy Slime RPG Character Compendium-1.png', (1, 1)),
    'venom':         ('venom', 'Ultimate Slime Compendium Sprite Sheet-5.png', (0, 1)),
    'poison':        ('venom', 'GLYMMORA Slime Compendium-4.png', (1, 1)),
    'chaos':         ('venom', 'GLYMMORA Slime Compendium-4.png', (4, 1)),
    # ---- PINK: the Idol (songs that rally the court) and the Charmer (charms foes, dances in and out)
    'pop_idol':      ('idol', T + '07_52_58 PM-10.png', {'x0': 140}),
    'lunar_oracle':  ('idol', T + '07_52_44 PM-1.png', {'x0': 140}),
    'taffy':         ('idol', T + '07_52_54 PM-8.png', {'x0': 140}),
    'bubble_blush':  ('idol', T + '07_52_56 PM-9.png', {'x0': 140}),
    'rose_duelist':  ('charmer', T + '07_52_47 PM-3.png', {'x0': 140}),
    'jester':        ('charmer', T + '07_52_48 PM-4.png', {'x0': 140}),
    'cupcake':       ('charmer', T + '07_52_50 PM-5.png', {'x0': 140}),
    'sakura':        ('charmer', T + '07_52_53 PM-7.png', {'x0': 140, 'split': True, 'mid': 520, 'x1': 1066, 'rows': [1100, 1170, 1235, 1302, 1398]}),
    'celestial_dragon': ('warden', 'Ten Slime Monster Animation Cards-3.png', (4, 1)),
    'rainbow':       ('idol', 'Ten Slime Monster Animation Cards-3.png', (2, 1)),
}

# Which way each slime looks in its art (checked by eye): most look right, a few left, some straight out (S, never
# mirrored). The game mirrors a slime when it heads the other way.
FACE = {'ninja': 'L', 'pirate': 'L', 'blood_moon': 'S', 'doom': 'S', 'jelly_jolt': 'S', 'meadow': 'S', 'sun_emperor': 'S'}


def load(folder, name):
    return np.asarray(Image.open(Path(folder) / name).convert('RGB')).astype(np.float32)


def core_mask(im):
    mx, mn = im.max(2), im.min(2)
    return ((mx - mn > 42) & (mx > 80)) | (mx > 225)


def separators(im, x0, x1, ylo, yhi):
    """Faint full-width rules: rows whose median brightness pokes above its neighbourhood."""
    med = np.median(im.max(2)[:, x0:x1], 1)
    base = np.convolve(med, np.ones(15) / 15, 'same')
    pk = med - base
    out = []
    for y in range(max(ylo, 1), min(yhi, len(med) - 1)):
        if pk[y] > 12 and pk[y] >= pk[y - 1] and pk[y] >= pk[y + 1]:
            if out and y - out[-1][0] < 8:
                if pk[y] > out[-1][2]: out[-1] = (y, med[y], pk[y])
            else: out.append((y, med[y], pk[y]))
    return out


def label_centres(im, x0, ylo):
    """Vertical centres of the row labels (white text in the left column); two-line labels count once."""
    mx, mn = im.max(2), im.min(2)
    prof = ((mx > 150) & (mx - mn < 90))[:, 12:x0 - 8].sum(1)
    on, H, cl, y = prof >= 2, len(prof), [], ylo
    while y < H:
        if on[y]:
            s0 = y
            while y < H and on[y]: y += 1
            if y - s0 >= 5:
                if cl and s0 - cl[-1][1] < 14: cl[-1][1] = y
                else: cl.append([s0, y])
        y += 1
    return [(a + b) // 2 for a, b in cl]


def detail_rows(im, x0, x1, n=8, ylo=None):
    """The isometric panel's row bands. The n labels under the panel header (a bright rule just above the first)
    give the rows; each boundary snaps to a faint row rule near the midpoint between two labels."""
    H = im.shape[0]
    seps = separators(im, 40, x1, ylo or H // 2, H - 2)
    bright = [y for y, m, _ in seps if m >= 150]
    faint = [y for y, m, _ in seps if m < 150]
    cen = label_centres(im, x0, ylo or H // 2)
    best = None
    for i in range(len(cen) - n + 1):
        w = cen[i:i + n]
        g = np.diff(w)
        if g.min() < 34 or g.max() > 115: continue
        head = [y for y in bright if 10 <= w[0] - y <= 60]
        if not head: continue
        best = (w, max(head))
    if not best: return None
    w, head = best
    edges = [head]
    for a, b in zip(w[:-1], w[1:]):
        mid = (a + b) / 2
        near = [y for y in faint if abs(y - mid) <= 14]
        edges.append(int(min(near, key=lambda y: abs(y - mid)) if near else mid))
    below = [y for y in bright if y > w[-1] + 25]
    edges.append(min(below) if below and min(below) - w[-1] < 110 else int(w[-1] + (w[-1] - edges[-1]) * 1.1))
    return edges


def pieces(mask, box, min_area=10):
    """Connected pieces of art inside box: (slices, centre y, centre x, area) in sheet coordinates."""
    x0, y0, x1, y1 = box
    sub = ndi.binary_dilation(mask[y0:y1, x0:x1], iterations=2)
    lab, n = ndi.label(sub)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None: continue
        m = lab[sl] == i
        a = int(m.sum())
        if a < min_area: continue
        ys, xs = np.nonzero(m)
        out.append({'lab': lab, 'i': i, 'sl': sl, 'cy': y0 + sl[0].start + ys.mean(), 'cx': x0 + sl[1].start + xs.mean(), 'a': a, 'ox': x0, 'oy': y0})
    return out


def kmeans1(xs, w, k, iters=30):
    xs, w = np.asarray(xs, float), np.asarray(w, float)
    c = np.quantile(xs, [(i + 0.5) / k for i in range(k)])
    for _ in range(iters):
        a = np.argmin(np.abs(xs[:, None] - c[None, :]), 1)
        for j in range(k):
            if (a == j).any(): c[j] = np.average(xs[a == j], weights=w[a == j])
    return np.sort(c)


def thin(p):
    h, w = p['sl'][0].stop - p['sl'][0].start, p['sl'][1].stop - p['sl'][1].start
    return (h <= 10 and w > 25) or (w <= 14 and h > 22)  # panel rules and frame edges


def assign(mask, xa, xb, rows, ncols, min_area=10):
    """Pieces into a grid: each row band labelled on its own; the columns (shared by every row of the sheet) from
    k-means of all the pieces' centres, weighted to the big bodies."""
    per = []
    for ya, yb in rows:
        per.append([p for p in pieces(mask, (xa, ya + 2, xb, yb - 1), min_area)
                    if not thin(p)])
    base = [p for rp in per[:6] for p in rp if p['a'] >= 40] or [p for rp in per for p in rp]
    cols = kmeans1([p['cx'] for p in base], [p['a'] ** 1.5 for p in base], ncols)
    grid = [[[] for _ in range(ncols)] for _ in rows]
    for ri, rp in enumerate(per):
        for p in rp: grid[ri][int(np.argmin(np.abs(cols - p['cx'])))].append(p)
    return grid


def cut(im, ps, bg):
    """One frame from its pieces: opaque body (holes filled), soft glow round it, background keyed out."""
    if not ps: return None
    ys0 = min(p['oy'] + p['sl'][0].start for p in ps) - 4; ys1 = max(p['oy'] + p['sl'][0].stop for p in ps) + 4
    xs0 = min(p['ox'] + p['sl'][1].start for p in ps) - 4; xs1 = max(p['ox'] + p['sl'][1].stop for p in ps) + 4
    ys0, xs0, ys1, xs1 = max(0, ys0), max(0, xs0), min(im.shape[0], ys1), min(im.shape[1], xs1)
    sel = np.zeros((ys1 - ys0, xs1 - xs0), bool)
    for p in ps:
        sl = p['sl']; m = p['lab'][sl] == p['i']
        Y, X = p['oy'] + sl[0].start - ys0, p['ox'] + sl[1].start - xs0
        sel[Y:Y + m.shape[0], X:X + m.shape[1]] |= m[:sel.shape[0] - Y, :sel.shape[1] - X]
    px = im[ys0:ys1, xs0:xs1]
    d = np.abs(px - bg[None, None, :]).max(2)
    core = ndi.binary_erosion(sel, iterations=2) & (d > 50)
    lab, n = ndi.label(core)
    biggest = core
    if n:
        sizes = ndi.sum(core, lab, range(1, n + 1))
        biggest = lab == (1 + int(np.argmax(sizes)))
    # only small holes are the slime's own dark bits (eyes, mouth, outline); big ones are background inside a swirl
    holes = ndi.binary_fill_holes(core) & ~core
    hl, hn = ndi.label(holes)
    solid = core.copy()
    if hn:
        hs = ndi.sum(holes, hl, range(1, hn + 1))
        lim = max(60, 0.12 * biggest.sum())
        solid |= np.isin(hl, 1 + np.nonzero(hs <= lim)[0])
    biggest = ndi.binary_fill_holes(biggest)
    soft = np.clip((d - 10) / 75, 0, 1) * ndi.binary_dilation(sel, iterations=3)
    a = np.maximum(solid.astype(np.float32), soft)
    rgb = np.where(a[..., None] > 0.02, bg + (px - bg) / np.maximum(a[..., None], 0.02), 0)
    rgb = np.where(solid[..., None], px, rgb)
    out = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    ys, xs = np.nonzero(biggest)
    body = (xs0 + xs.min(), ys0 + ys.min(), xs0 + xs.max(), ys0 + ys.max()) if len(xs) else None
    return {'img': Image.fromarray(out, 'RGBA'), 'x': xs0, 'y': ys0, 'body': body}


def read_detail(im, o):
    W = im.shape[1]
    x1 = 760 if W < 800 else 815
    mask = core_mask(im)
    if o.get('split'):  # two columns of four rows (the Sakura Valkyrie)
        mid = o.get('mid', 545)
        left = o.get('rows') or detail_rows(im, o['x0'], mid, 4, o.get('ylo'))
        bands = list(zip(left[:-1], left[1:]))
        out = {}
        for half, (xa, xb), names in ((0, (o['x0'], mid - 10), DETAIL_ROWS[:4]), (1, (mid + 78, o.get('x1', x1)), DETAIL_ROWS[4:])):
            g = assign(mask, xa, xb, bands, 3)
            for name, row in zip(names, g): out[name] = row
        return out, mask
    ys = o.get('rows') or detail_rows(im, o['x0'], x1, 8, o.get('ylo'))
    if not ys: raise SystemExit('no isometric rows found')
    bands = list(zip(ys[:-1], ys[1:]))
    g = assign(mask, o['x0'], x1, bands, o.get('cols', 3))
    return dict(zip(DETAIL_ROWS, g)), mask


def read_card(im, col, row):
    H, W = im.shape[:2]
    cw, ch = W / 5, H / 2
    x0, y0 = int(col * cw), int(row * ch)
    box = (x0 + int(cw * 0.2), y0 + int(ch * 0.25), x0 + int(cw * 0.97), y0 + int(ch * 0.985))
    mask = core_mask(im)
    # the 7 row labels (white text in the card's left column) give the rows; the gold ornaments are no text
    mx, mn = im.max(2), im.min(2)
    txt = ((mx > 150) & (mx - mn < 90))[:, x0 + int(cw * 0.03):x0 + int(cw * 0.19)]
    prof = txt.sum(1)
    cen, y, Y1 = [], box[1], y0 + int(ch)
    while y < Y1:
        if prof[y] >= 2:
            s0 = y
            while y < Y1 and prof[y] >= 2: y += 1
            if y - s0 >= 4:
                if cen and s0 - cen[-1][1] < 8: cen[-1][1] = y
                else: cen.append([s0, y])
        y += 1
    chosen = [(a - box[1] + b - box[1]) / 2 for a, b in cen][-7:]
    step = np.median(np.diff(chosen))
    edges = [box[1] + int(c - step / 2) for c in chosen] + [box[1] + int(chosen[-1] + step / 2)]
    bands = list(zip(edges[:-1], edges[1:]))
    g = assign(mask, box[0], box[2], bands, 5, 6)
    return dict(zip(CARD_ROWS, g)), mask


def anchor(frames):
    """Steady feet for every frame: x from its column's idle body, y the row's median body bottom (the sheets line
    each row up on one floor line), so a slime never jitters between frames of one animation."""
    idle = frames.get('idle', [])
    xs = [(f['body'][0] + f['body'][2]) / 2 if f and f['body'] else None for f in idle]
    for row in frames.values():
        bots = [f['body'][3] for f in row if f and f['body']]
        ay = float(np.median(bots)) if bots else None
        for ci, f in enumerate(row):
            if not f: continue
            fb = f['body']
            ax = xs[ci] if ci < len(xs) and xs[ci] is not None and fb and abs(xs[ci] - (fb[0] + fb[2]) / 2) < 30 else ((fb[0] + fb[2]) / 2 if fb else f['x'] + f['img'].width / 2)
            f['anchor'] = (ax, ay if ay is not None else f['y'] + f['img'].height)


def bgcolor(im):
    m = im.max(2)
    return np.median(im[m < np.quantile(m, 0.4)], 0)


def pack(sid, kind, frames, debug=None):
    """Frames {anim: [cut]} -> one atlas, every frame anchored at the slime's feet (bottom centre of its body)."""
    idle = [f for f in frames.get('idle', []) if f and f['body']]
    if not idle: raise SystemExit(f'{sid}: no idle frames')
    b = idle[0]['body']
    bh = b[3] - b[1] + 1
    k = min(1.0, BODY / bh)
    rows = [a for a in (DETAIL_ROWS + [r for r in CARD_ROWS if r not in DETAIL_ROWS]) if frames.get(a) and any(frames[a])]
    L = R = U = D = 0
    feet = {}
    for a in rows:
        for f in frames[a]:
            if not f: continue
            ax, ay = f['anchor']
            feet[id(f)] = (ax, ay)
            w, h = f['img'].size
            L = max(L, ax - f['x']); R = max(R, f['x'] + w - ax); U = max(U, ay - f['y']); D = max(D, f['y'] + h - ay)
    # clip giant effects: the game draws its own spell fx
    L, R, U, D = min(L, bh * 1.4), min(R, bh * 1.4), min(U, bh * 1.6), min(D, bh * 0.45)
    cw, chh = int(np.ceil((L + R) * k)) + 2, int(np.ceil((U + D) * k)) + 2
    nf = max(len(frames[a]) for a in rows)
    atlas = Image.new('RGBA', (cw * nf, chh * len(rows)))
    meta = {}
    for ri, a in enumerate(rows):
        fl = [f for f in frames[a] if f]
        meta[a] = len(fl)
        for fi, f in enumerate(fl):
            ax, ay = feet[id(f)]
            img = f['img']
            if k < 1: img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
            dx, dy = round((f['x'] - ax + L) * k) + 1, round((f['y'] - ay + U) * k) + 1
            cell = Image.new('RGBA', (cw, chh))
            cell.alpha_composite(img, (dx, dy)) if dx >= 0 and dy >= 0 else cell.paste(img, (dx, dy), img)
            # effects that run past the cell fade out instead of ending in a hard edge
            arr = np.asarray(cell).astype(np.float32)
            fx = np.minimum(np.arange(cw), np.arange(cw)[::-1]) / FEATHER
            fy = np.minimum(np.arange(chh), np.arange(chh)[::-1]) / FEATHER
            arr[..., 3] *= np.clip(np.minimum(fy[:, None], fx[None, :]), 0, 1)
            atlas.alpha_composite(Image.fromarray(arr.astype(np.uint8), 'RGBA'), (fi * cw, ri * chh))
    atlas.save(OUT / f'{sid}.webp', 'WEBP', quality=88, method=6)
    return {'kind': kind, 'cw': cw, 'ch': chh, 'ax': round(L * k) + 1, 'ay': round(U * k) + 1, 'bh': round(bh * k, 1),
            'rows': rows, 'n': [meta[a] for a in rows]}, atlas


def main():
    args = sys.argv[1:]
    debug = None
    if '--debug' in args:
        i = args.index('--debug'); debug = Path(args[i + 1]); del args[i:i + 2]; debug.mkdir(parents=True, exist_ok=True)
    only = None
    if '--only' in args:
        i = args.index('--only'); only = set(args[i + 1].split(',')); del args[i:i + 2]
    folder = args[0]
    OUT.mkdir(parents=True, exist_ok=True)
    catp = OUT / 'slimes.json'
    cat = json.loads(catp.read_text()) if catp.exists() and only else {}
    cache = {}
    for sid, (kind, sheet, how) in SETS.items():
        if only and sid not in only: continue
        im = cache.get(sheet)
        if im is None: im = cache[sheet] = load(folder, sheet)
        bg = bgcolor(im)
        grid, _ = read_detail(im, how) if isinstance(how, dict) else read_card(im, *how)
        frames = {a: [cut(im, ps, bg) for ps in row] for a, row in grid.items()}
        anchor(frames)
        meta, atlas = pack(sid, kind, frames)
        meta['src'] = 'detail' if isinstance(how, dict) else 'card'
        meta['face'] = FACE.get(sid, 'R')
        cat[sid] = meta
        print(f'{sid:16s} {kind:9s} {meta["cw"]}x{meta["ch"]} body {meta["bh"]} ' + ' '.join(f'{a}:{n}' for a, n in zip(meta['rows'], meta['n'])))
        if debug:
            bgim = Image.new('RGBA', atlas.size, (40, 44, 52, 255)); bgim.alpha_composite(atlas)
            bgim.convert('RGB').save(debug / f'{sid}.png')
    catp.write_text(json.dumps(dict(sorted(cat.items())), separators=(',', ':')))


if __name__ == '__main__':
    main()
