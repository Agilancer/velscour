"""Slime Court: pack the Glymmora slime sheets into the Slime Lord's per-slime animation atlases.

    python tools/slimecourt.py "<folder of Glymmora slime sheets>" [--debug out_dir]

The sheets (the user's "HI RES SLIME SPRITES" folder, 124 MB) stay outside the repo; SETS below names the file of
each slime. Two kinds of sheet:
  detail - one slime per sheet with battle animations and an ISOMETRIC GAME SPRITES panel. Only the isometric panel is
           read: 8 labelled rows (idle, walk, run, jump, attack, open, ability, special) of 3 frames, found from the
           faint row rules under the panel header.
  card   - ten small cards per sheet (5 x 2), each a portrait and 7 rows (idle, walk, squish, jump, attack, hurt, die)
           of 5 frames.
segment() cuts a panel into one mask per frame (see there), so nothing is cut off and nothing bleeds in from a neighbour.
The dark card background is keyed out with soft alpha (the glows stay, unpremultiplied off the background).
Each set becomes assets/sprites/slimes/<id>.webp (a row per animation, a column per frame, each row its own cell size,
the slime's feet at the row's anchor) and is listed in assets/sprites/slimes/slimes.json. src/gfx/slimeart.js draws
them. --debug <dir> writes a review sheet per set with the audit's flags; look at them after any change here.
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
PAD = 2  # transparent px round every atlas cell
BODY = 46  # px height a slime's idle body is packed at (bigger art is scaled down to it; small cards stay as they are)

T = 'ChatGPT Image Oct 18, 2026, '
# id: (kind of slime it plays, sheet, how to read it). detail: {'x0': label column end, ...overrides};
# card: (column 0-4, row 0-1) of the card on its sheet.
SETS = {
    # ---- RED: the Pouncer (leaps on foes from afar) and the Berserker (rolling cleaver)
    'blood_moon':    ('pouncer', T + '07_52_13 PM-1.png', {'x0': 140, 'rowcols': {'special': 4}}),
    'doom':          ('pouncer', T + '07_52_16 PM-2.png', {'x0': 140, 'rowcols': {'special': 4}}),
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
    'sap':           ('mender', T + '07_52_51 PM-6.png', {'x0': 200, 'rowcols': {'special': 4}, 'rows': [1071, 1105, 1141, 1180, 1220, 1257, 1296, 1353, 1418]}),
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
    'puddle_prank':  ('tide', T + '07_52_20 PM-5.png', {'x0': 140, 'rowcols': {'special': 4}}),
    'bubblefin':     ('tide', T + '07_52_21 PM-6.png', {'x0': 140, 'rowcols': {'special': 4}}),
    'ice_emperor':   ('frost', T + '07_49_43 PM-7.png', {'x0': 150}),
    'starfall':      ('frost', T + '07_49_39 PM-4.png', {'x0': 150}),
    'tidal_beast':   ('frost', T + '07_49_38 PM-3.png', {'x0': 150}),
    'ninja':         ('frost', T + '07_49_33 PM-1.png', {'x0': 150}),
    'glacier_grin':  ('frost', T + '07_52_23 PM-7.png', {'x0': 140, 'cols': 4, 'rowcols': {'special': 3}}),  # four frames a row, three special attacks
    'jelly_jolt':    ('frost', T + '07_52_24 PM-8.png', {'x0': 140, 'rowcols': {'special': 4}}),
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
    'bubble_blush':  ('idol', T + '07_52_56 PM-9.png', {'x0': 140, 'rowcols': {'special': 4}}),
    'rose_duelist':  ('charmer', T + '07_52_47 PM-3.png', {'x0': 140}),
    'jester':        ('charmer', T + '07_52_48 PM-4.png', {'x0': 140}),
    'cupcake':       ('charmer', T + '07_52_50 PM-5.png', {'x0': 140}),
    'sakura':        ('charmer', T + '07_52_53 PM-7.png', {'x0': 140, 'split': True, 'mid': 520, 'x1': 1066, 'rowcols': {'special': 2}, 'rows': [1100, 1170, 1235, 1302, 1398]}),
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


def gold_mask(im):
    """The panels' and cards' gold trim."""
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return (r > 130) & (g > 80) & (b < 110) & (r - b > 70) & (g < r)


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


def kmeans1(xs, w, k, iters=30):
    xs, w = np.asarray(xs, float), np.asarray(w, float)
    c = np.quantile(xs, [(i + 0.5) / k for i in range(k)])
    for _ in range(iters):
        a = np.argmin(np.abs(xs[:, None] - c[None, :]), 1)
        for j in range(k):
            if (a == j).any(): c[j] = np.average(xs[a == j], weights=w[a == j])
    return np.sort(c)


def segment(mask, xa, xb, rows, ncols, min_area=10, rule=None, gold=None, line=25, rowcols=None):
    """Every frame of a panel as a mask, so that nothing is cut and nothing bleeds in.
    The art is labelled over the whole panel (a jump or a spell may cross a row line). Each grid cell (row band x
    column) gets a seed: its biggest solid blob. A piece of art touching one seed goes whole to that frame; one touching
    several (neighbours' glows run together) is split between them along the line half way between their bodies; a
    loose piece (a spark, a projectile) goes to the cell its centre lies in. Returns grid[row][col] (None for an empty
    cell) and the cells whose art was split, for the audit."""
    y0, y1 = rows[0][0], rows[-1][1]
    sub = mask[y0:y1, xa:xb].copy()
    # panel rules and frame lines: long thin straight runs that are not the edge of a solid body
    thick = ndi.binary_dilation(ndi.binary_opening(sub, np.ones((9, 9))), iterations=4)
    lines = (ndi.binary_opening(sub, np.ones((1, line))) | ndi.binary_opening(sub, np.ones((line, 1)))) & ~thick
    sub &= ~ndi.binary_dilation(lines, iterations=1)
    if gold is not None and line < 41:  # a detailed panel's bottom corners hold gold ornaments that touch the art's glow
        g_ = gold[y0:y1, xa:xb]
        sub[-60:, -60:] &= ~ndi.binary_dilation(g_[-60:, -60:], iterations=2)
        sub[-60:, :60] &= ~ndi.binary_dilation(g_[-60:, :60], iterations=2)
    # slivers of the portrait or header cut by the panel's top edge, and the frame's small gold flourishes at its bottom
    # (and the curls in the frame's corners, left hanging off the stripped border)
    rl, _ = ndi.label(sub)
    near_line = ndi.binary_dilation(lines, iterations=4)
    for i, sl in enumerate(ndi.find_objects(rl), 1):
        if sl is None: continue
        m = rl[sl] == i
        h, w, n = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start, m.sum()
        goldy = gold is not None and gold[y0:y1, xa:xb][sl][m].mean() > 0.5
        if ((sl[0].start <= 1 and h < 15) or (goldy and n < 600 and sl[0].stop >= sub.shape[0] - 15)
                or (goldy and n < 900 and n < 0.45 * h * w and near_line[sl][m].any())):
            sub[sl][m] = False
    if rule is not None:  # below the panel's own bottom rule (a special attack runs over it) the border's gold goes
        sub[rule - y0:] &= ~gold[rule:y1, xa:xb]
    lab, n = ndi.label(ndi.binary_dilation(sub, iterations=2))
    keep = np.zeros(n + 1, bool)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None: continue
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if (h <= 8 and w >= 14) or (h <= 10 and w > 25) or (w <= 14 and h > 22): continue  # rules, dashes and frame edges
        if (lab[sl] == i).sum() >= min_area: keep[i] = True
    lab = np.where(keep[lab], lab, 0)
    band = np.zeros(y1 - y0, int)
    for ri, (ya, yb) in enumerate(rows): band[ya - y0:yb - y0] = ri
    # columns: k-means of the solid blobs' centres (bodies weigh most), shared by every row
    strong = ndi.binary_erosion(sub, iterations=2) & (lab > 0)
    whole, _ = ndi.label(strong)  # before the row cuts: to tell a body from the tip of an effect rising from below
    for ya, yb in rows[1:]: strong[max(0, ya - y0 - 1):ya - y0 + 2] = False  # a seed never crosses a row line
    sl_, sn = ndi.label(strong)
    rowcols = rowcols or {}
    nr = [rowcols.get(ri, ncols) for ri in range(len(rows))]
    NC = max(nr)
    if not sn: return [[None] * n for n in nr], []
    idx = range(1, sn + 1)
    area = np.asarray(ndi.sum(strong, sl_, idx))
    cy, cx = np.asarray(ndi.center_of_mass(strong, sl_, idx)).T
    rowj = np.asarray([band[min(len(band) - 1, int(y))] for y in cy])
    pick_ = (area >= 40) & (rowj < 6)
    if not pick_.any(): pick_ = area > 0
    cols = kmeans1(cx[pick_], area[pick_] ** 1.5, ncols)
    # a row with a frame count of its own (a special attack of four) gets its own columns
    # (the sheets space those evenly across the row, so the columns are too)
    def even(ri):
        ya, yb = rows[ri][0] - y0, rows[ri][1] - y0
        xs = np.nonzero(ndi.binary_opening(strong[ya:yb], np.ones((3, 3))).any(0))[0]
        return (xs.min() + (np.arange(rowcols[ri]) + 0.5) * (xs.max() - xs.min()) / rowcols[ri]) if len(xs) else cols
    rcols = [cols if ri not in rowcols else even(ri) for ri in range(len(rows))]
    col_of = lambda x, ri: int(np.argmin(np.abs(rcols[ri] - x)))
    # glows can run a row of frames into one blob: a seed never crosses a column line either
    for ri, (ya, yb) in enumerate(rows):
        c = rcols[ri]
        for c0, c1 in zip(c[:-1], c[1:]): strong[ya - y0:yb - y0, int((c0 + c1) / 2) - 1:int((c0 + c1) / 2) + 2] = False
    sl_, sn = ndi.label(strong)
    idx = range(1, sn + 1)
    area = np.asarray(ndi.sum(strong, sl_, idx))
    cy, cx = np.asarray(ndi.center_of_mass(strong, sl_, idx)).T
    rowj = np.asarray([band[min(len(band) - 1, int(y))] for y in cy])
    # seeds: each cell's biggest compact blob (a body, not a long swoosh of effect)
    seed = np.zeros(sub.shape, int)
    best, score = {}, {}
    for j, sl in enumerate(ndi.find_objects(sl_)):
        if area[j] < 25 or sl is None: continue
        sc_ = area[j] * area[j] / ((sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start))
        ri = rowj[j]
        if ri + 1 < len(rows) and sl[0].stop >= rows[ri][1] - y0 - 3:
            w_ = whole[sl][sl_[sl] == j + 1]
            w_ = np.bincount(w_[w_ > 0]).argmax() if (w_ > 0).any() else 0
            below = (whole[rows[ri][1] - y0:] == w_).sum() if w_ else 0
            if below > area[j]: sc_ *= 0.05  # the tip of an effect rising from the row below
        k = ri * NC + col_of(cx[j], ri) + 1
        if k not in best or sc_ > score[k]: best[k], score[k] = j, sc_
    for k, j in best.items(): seed[sl_ == j + 1] = k
    sbox = {k: ndi.find_objects((sl_ == j + 1).astype(int))[0] for k, j in best.items()}
    floor = {}  # the lowest body of each row
    for k, bb in sbox.items(): floor[(k - 1) // NC] = max(floor.get((k - 1) // NC, 0), bb[0].stop)
    sd, near = ndi.distance_transform_edt(seed == 0, return_indices=True)
    owner = seed[near[0], near[1]]  # the nearest seed of every pixel
    reach = 0.75 * np.median([max(12, np.sqrt(area[j]) * 1.3) for j in best.values()])  # how far a loose spark may sit from its body
    out = np.zeros(sub.shape, int)
    split = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None or not keep[i]: continue
        m = lab[sl] == i
        touched = sorted(set(np.unique(seed[sl][m])) - {0})
        view = out[sl]
        if len(touched) == 1: view[m] = touched[0]
        elif len(touched) > 1:
            o = owner[sl]
            o = np.where(np.isin(o, touched), o, touched[0])
            view[m] = o[m]
            split += touched
        else:  # a loose piece (a spark, a drop): to the nearest body of its own row, if near enough to be its own
            if sl[0].start <= 1: continue  # cut off at the top of the panel: the header or a card's portrait
            if rule is not None and sl[0].start >= rule - y0 - 2: continue  # bits of the border under the panel
            Hs, Ws = sub.shape
            if (gold is not None and gold[y0:y1, xa:xb][sl][m].mean() > 0.4 and m.sum() >= 25
                    and (sl[0].stop >= Hs - 30 or sl[1].start <= 25 or sl[1].stop >= Ws - 25)):
                continue  # a curl of the frame's gold corner, not a spark
            if m.sum() < 400 and sl[0].stop >= Hs - 40 and (sl[1].stop >= Ws - 30 or sl[1].start <= 30):
                continue  # a small loose piece in a bottom corner of the panel: the frame's corner ornament
            ys, xs = np.nonzero(m)
            py, px_ = sl[0].start + ys.mean(), sl[1].start + xs.mean()
            ri = band[min(len(band) - 1, int(py))]
            big = m.sum() >= 250  # too big for a spark: part of a body or an effect, so it joins the nearest body
            if not big and ri in floor and sl[0].start >= floor[ri] - 1: continue  # wholly under the row's lowest body: frame trim
            bestk, bd = 0, (1e9 if big else reach)
            for ci in range(nr[ri]):
                k = ri * NC + ci + 1
                if k not in sbox: continue
                bb = sbox[k]
                dy = max(bb[0].start - py, 0, py - bb[0].stop); dx = max(bb[1].start - px_, 0, px_ - bb[1].stop)
                if np.hypot(dx, dy) < bd: bestk, bd = k, np.hypot(dx, dy)
            if bestk: view[m] = bestk
    # a frame keeps to its own row: up to 1.2 rows above it (a jump, a spell) and half a row below
    yy = np.arange(sub.shape[0])[:, None]
    for ri, (ya, yb) in enumerate(rows):
        hgt = yb - ya
        far = (yy < ya - y0 - 1.2 * hgt) | (yy > yb - y0 + 0.5 * hgt)
        for ci in range(nr[ri]):
            k = ri * NC + ci + 1
            out[(out == k) & far] = 0
    grid = [[None] * n for n in nr]
    H, W = sub.shape
    for ri in range(len(rows)):
        for ci in range(nr[ri]):
            k = ri * NC + ci + 1
            m = out == k
            if m.sum() < 6: continue  # (a dissolving slime's last frame may be a few sparks)
            ys, xs = np.nonzero(m)
            ya, yb, xa_, xb_ = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            oa, ob, oc, od = max(0, ya - 8), min(H, yb + 8), max(0, xa_ - 8), min(W, xb_ + 8)
            # what the other frames own round about: this frame's soft glow must not reach into it
            grid[ri][ci] = {'y': y0 + ya, 'x': xa + xa_, 'mask': m[ya:yb, xa_:xb_],
                            'others': (out[oa:ob, oc:od] != k) & (out[oa:ob, oc:od] > 0), 'oy': y0 + oa, 'ox': xa + oc,
                            'edge': (ya <= 1, yb >= H - 1, xa_ <= 1, xb_ >= W - 1), 'panel': (y0, y0 + H, xa, xa + W)}
    return grid, sorted({((k - 1) // NC, (k - 1) % NC) for k in split})


def cut(im, g, bg):
    """One frame from its mask: opaque body (small holes filled), soft glow round it, background keyed out."""
    if not g: return None
    pad = 5
    ys0, xs0 = max(0, g['y'] - pad), max(0, g['x'] - pad)
    ys1, xs1 = min(im.shape[0], g['y'] + g['mask'].shape[0] + pad), min(im.shape[1], g['x'] + g['mask'].shape[1] + pad)
    sel = np.zeros((ys1 - ys0, xs1 - xs0), bool)
    Y, X = g['y'] - ys0, g['x'] - xs0
    sel[Y:Y + g['mask'].shape[0], X:X + g['mask'].shape[1]] = g['mask']
    oth = np.zeros_like(sel)
    o, oy, ox = g['others'], g['oy'] - ys0, g['ox'] - xs0
    ty0, tx0, ty1, tx1 = max(0, oy), max(0, ox), min(sel.shape[0], oy + o.shape[0]), min(sel.shape[1], ox + o.shape[1])
    oth[ty0:ty1, tx0:tx1] = o[ty0 - oy:ty1 - oy, tx0 - ox:tx1 - ox]
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
    soft = np.clip((d - 10) / 75, 0, 1) * (ndi.binary_dilation(sel, iterations=3) & ~ndi.binary_dilation(oth, iterations=1))
    a = np.maximum(solid.astype(np.float32), soft)
    # art cut off by the panel's own edge (the sheet's frame clips it): fade it out there rather than end in a line
    py0, py1, px0, px1 = g['panel']
    yy, xx = np.mgrid[ys0:ys1, xs0:xs1]
    for on, dd in zip(g['edge'], (yy - py0, py1 - 1 - yy, xx - px0, px1 - 1 - xx)):
        if on: a = a * np.clip(dd / 8, 0, 1)
    if oth.any():  # where the source runs into a neighbouring frame, fade out over a few px instead of a straight cut
        a *= np.clip(ndi.distance_transform_edt(~oth) / 5, 0, 1)
    rgb = np.where(a[..., None] > 0.02, bg + (px - bg) / np.maximum(a[..., None], 0.02), 0)
    rgb = np.where(solid[..., None], px, rgb)
    out = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    ys, xs = np.nonzero(biggest)
    body = (xs0 + xs.min(), ys0 + ys.min(), xs0 + xs.max(), ys0 + ys.max()) if len(xs) else None
    return {'img': Image.fromarray(out, 'RGBA'), 'x': xs0, 'y': ys0, 'body': body, 'edge': g['edge']}


def read_detail(im, o):
    W = im.shape[1]
    x1 = 760 if W < 800 else 815
    mask = core_mask(im)
    if o.get('split'):  # two columns of four rows (the Sakura Valkyrie)
        mid = o.get('mid', 545)
        left = o.get('rows') or detail_rows(im, o['x0'], mid, 4, o.get('ylo'))
        bands = list(zip(left[:-1], left[1:]))
        out = {}
        split = []
        for half, (xa, xb), names in ((0, (o['x0'], mid - 10), DETAIL_ROWS[:4]), (1, (mid + 78, o.get('x1', x1)), DETAIL_ROWS[4:])):
            g, sp = segment(mask, xa, xb, bands, 3, rowcols={names.index(k): v for k, v in o.get('rowcols', {}).items() if k in names})
            split += [(names[r], c) for r, c in sp]
            for name, row in zip(names, g): out[name] = row
        return out, split
    ys = o.get('rows') or detail_rows(im, o['x0'], x1, 8, o.get('ylo'))
    if not ys: raise SystemExit('no isometric rows found')
    bands = list(zip(ys[:-1], ys[1:]))
    nc = o.get('cols', 3)
    gold = gold_mask(im)
    rc = {DETAIL_ROWS.index(k): v for k, v in o.get('rowcols', {}).items()}
    g, sp = segment(mask, o['x0'], o.get('x1', x1), bands, nc, gold=gold, rowcols=rc)
    # a special attack touching the panel's bottom rule may run on below it: take the next rule down
    below = [y for y, m, _ in separators(im, 40, x1, ys[-1] + 4, min(im.shape[0] - 2, ys[-1] + 90)) if m >= 120]
    rule = ys[-1]
    while any(c and c['edge'][1] for c in g[-1]) and below:
        ys = ys[:-1] + [below.pop(0)]
        bands = list(zip(ys[:-1], ys[1:]))
        g, sp = segment(mask, o['x0'], o.get('x1', x1), bands, nc, rule=rule, gold=gold, rowcols=rc)
    return dict(zip(DETAIL_ROWS, g)), [(DETAIL_ROWS[r], c) for r, c in sp]


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
    cen = [c for c in cen if 7 <= c[1] - c[0] <= 14]  # label text is 8-11 px tall; ornaments are thinner, portrait bits taller
    cs = [(a - box[1] + b - box[1]) / 2 for a, b in cen]
    runs = [cs[i:i + 7] for i in range(len(cs) - 6)]
    chosen = min(runs, key=lambda r: (np.std(np.diff(r)), -r[0]))  # the evenly spaced run of seven
    step = np.median(np.diff(chosen))
    edges = [box[1] + int(c - step / 2) for c in chosen] + [box[1] + int(chosen[-1] + step / 2)]
    bands = list(zip(edges[:-1], edges[1:]))
    g, sp = segment(mask, box[0], box[2], bands, 5, 6, line=41, gold=gold_mask(im))  # card slimes are only ~25 px wide
    return dict(zip(CARD_ROWS, g)), [(CARD_ROWS[r], c) for r, c in sp]


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


def pack(sid, kind, frames):
    """Frames {anim: [cut]} -> one atlas. Each animation row has its own cell, big enough for every frame of it (no
    effect is clipped), every frame placed with the slime's feet on the row's anchor."""
    idle = [f for f in frames.get('idle', []) if f and f['body']]
    if not idle: raise SystemExit(f'{sid}: no idle frames')
    b = idle[0]['body']
    bh = b[3] - b[1] + 1
    k = min(1.0, BODY / bh)
    rows = [a for a in (DETAIL_ROWS + [r for r in CARD_ROWS if r not in DETAIL_ROWS]) if frames.get(a) and any(frames[a])]
    cells, y, W = [], 0, 0
    for a in rows:
        L = R = U = D = 0
        for f in frames[a]:
            if not f: continue
            ax, ay = f['anchor']
            w, h = f['img'].size
            L = max(L, ax - f['x']); R = max(R, f['x'] + w - ax); U = max(U, ay - f['y']); D = max(D, f['y'] + h - ay)
        cw, ch = int(np.ceil((L + R) * k)) + 2 * PAD, int(np.ceil((U + D) * k)) + 2 * PAD
        cells.append([y, cw, ch, int(np.ceil(L * k)) + PAD, int(np.ceil(U * k)) + PAD])
        W = max(W, cw * sum(1 for f in frames[a] if f)); y += ch
    atlas = Image.new('RGBA', (W, y))
    for (ry, cw, ch, cax, cay), a in zip(cells, rows):
        for fi, f in enumerate([f for f in frames[a] if f]):
            ax, ay = f['anchor']
            img = f['img']
            if k < 1: img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
            dx, dy = cax + round((f['x'] - ax) * k), cay + round((f['y'] - ay) * k)
            cell = Image.new('RGBA', (cw, ch))
            cell.paste(img, (dx, dy), img)
            atlas.alpha_composite(cell, (fi * cw, ry))
            f['cell'] = (fi * cw, ry, cw, ch)
    atlas.save(OUT / f'{sid}.webp', 'WEBP', quality=90, method=6)
    return {'kind': kind, 'bh': round(bh * k, 1), 'rows': rows, 'n': [sum(1 for f in frames[a] if f) for a in rows], 'cells': cells}, atlas


def audit(sid, frames, split, src, atlas):
    """Problems worth a look, per frame: art reaching the edge of the panel it was cut from (maybe cut off), art split
    from a neighbour's (check the seam), a frame with two separate bodies (maybe a neighbour's), a missing frame,
    and anything touching the edge of its atlas cell. Returns [(anim, col, codes)]."""
    want = 3 if src == 'detail' else 5
    al = np.asarray(atlas)[..., 3]
    issues = []
    for a, row in frames.items():
        for ci, f in enumerate(row):
            codes = []
            if not f: codes.append('missing'); issues.append((a, ci, codes)); continue
            e = f['edge']
            if e[0]: codes.append('top')
            if e[1]: codes.append('bottom')
            if e[2]: codes.append('left')
            if e[3]: codes.append('right')
            if (a, ci) in split: codes.append('split')
            x, y, cw, ch = f['cell']
            c = al[y:y + ch, x:x + cw]
            if max(c[0].max(), c[-1].max(), c[:, 0].max(), c[:, -1].max()) > 40: codes.append('cell-edge')
            solid = c > 140
            lab, n = ndi.label(ndi.binary_dilation(solid, iterations=1))
            if n > 1:
                sz = np.sort(ndi.sum(solid, lab, range(1, n + 1)))[::-1]
                if sz[1] > 0.35 * sz[0] and sz[1] > 120: codes.append('two-bodies')
            if codes: issues.append((a, ci, codes))
        if len([f for f in row if f]) < min(want, len(row)): pass
    return issues


def review_sheet(sid, frames, issues, atlas, path):
    """Every frame on a checkerboard, 2x, its cell outlined (red when the audit flagged it), codes underneath."""
    from PIL import ImageDraw
    flagged = {(a, ci): c for a, ci, c in issues}
    tiles = []
    for a, row in frames.items():
        line = []
        for ci, f in enumerate(row):
            if not f: line.append((None, a, ci)); continue
            x, y, cw, ch = f['cell']
            line.append((atlas.crop((x, y, x + cw, y + ch)), a, ci))
        tiles.append(line)
    S = 2
    cw = max(t[0].width for l in tiles for t in l if t[0]) * S + 8
    ch = max(t[0].height for l in tiles for t in l if t[0]) * S + 22
    ncol = max(len(l) for l in tiles)
    out = Image.new('RGB', (cw * ncol + 70, ch * len(tiles)), (20, 20, 24))
    d = ImageDraw.Draw(out)
    for ri, line in enumerate(tiles):
        d.text((4, ri * ch + 4), line[0][1] if line else '', fill=(255, 255, 120))
        for ci, (t, a, c) in enumerate(line):
            X, Y = 70 + ci * cw, ri * ch
            if t is None:
                d.text((X + 4, Y + 4), 'MISSING', fill=(255, 80, 80)); continue
            w, h = t.width * S, t.height * S
            bg = Image.new('RGB', (w, h))
            bd = ImageDraw.Draw(bg)
            for yy in range(0, h, 8):
                for xx in range(0, w, 8): bd.rectangle((xx, yy, xx + 7, yy + 7), fill=(60, 64, 72) if (xx + yy) // 8 % 2 else (44, 48, 56))
            bg.paste(t.resize((w, h), Image.NEAREST), (0, 0), t.resize((w, h), Image.NEAREST))
            out.paste(bg, (X, Y))
            col = (255, 60, 60) if (a, c) in flagged else (90, 90, 110)
            d.rectangle((X - 1, Y - 1, X + w, Y + h), outline=col)
            if (a, c) in flagged: d.text((X, Y + h + 2), ','.join(flagged[(a, c)]), fill=(255, 120, 120))
    out.save(path)


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
        grid, split = read_detail(im, how) if isinstance(how, dict) else read_card(im, *how)
        frames = {a: [cut(im, g, bg) for g in row] for a, row in grid.items()}
        anchor(frames)
        meta, atlas = pack(sid, kind, frames)
        meta['src'] = 'detail' if isinstance(how, dict) else 'card'
        meta['face'] = FACE.get(sid, 'R')
        cat[sid] = meta
        issues = audit(sid, frames, split, meta['src'], atlas)
        print(f'{sid:16s} {kind:9s} {atlas.width}x{atlas.height} body {meta["bh"]} ' + ' '.join(f'{a}:{n}' for a, n in zip(meta['rows'], meta['n']))
              + (('\n    ' + '; '.join(f'{a}{c + 1} {",".join(x)}' for a, c, x in issues)) if issues else ''))
        if debug: review_sheet(sid, frames, issues, atlas, debug / f'{sid}.png')
    catp.write_text(json.dumps(dict(sorted(cat.items())), separators=(',', ':')))


if __name__ == '__main__':
    main()
