"""Cut the Grim Nocturne pet sheets (assets/source/pet_animations/) into compact runtime atlases.

    python tools/build_pet_animations.py [sheet ...] [--preview DIR]

Every sheet is a loose grid: one pet per row, its poses left to right in the order of LAYOUTS. Poses are never
cut out as rectangles. Between neighbouring rows and poses the builder runs a seam: the cheapest path through the
sheet, where solid art costs a lot and empty space almost nothing, so it bends around wing tips, tails and
spell effects and only cuts where two poses really touch. Each pose then keeps its body and the effects floating
near it; specks from elsewhere and the faint export haze are dropped. All poses of a pet share one scale (its rest
pose is REST_H px tall), stand on the cell floor and are centred on the body's own centre line, so it stays put
from frame to frame. --preview writes a guide sheet per pet (floor, centre, onion skin of the rest pose).
"""
from pathlib import Path
from PIL import Image, ImageDraw
from scipy import ndimage, signal
import json
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/pet_animations'
OUT = ROOT / 'assets/sprites/pets'

# Pose order per kind; petart.js reads the same names from catalog.json.
LAYOUTS = {
    'humanoid': ['idle', 'dead', 'summoned', 'summoned', 'summoned', 'cheer', 'scared'],
    'ground': ['idle', 'dead', 'summoned', 'summoned', 'summoned', 'happy', 'scared', 'walk', 'walk', 'walk', 'attack'],
    'flying': ['idle', 'idle', 'idle', 'dead', 'summoned', 'summoned', 'summoned', 'happy', 'scared', 'fly', 'fly', 'fly',
               'swoop', 'attack', 'attack'],
    'stationary': ['idle', 'dead', 'summoned', 'summoned', 'summoned', 'active', 'damaged', 'attack'],
    # tools/chatgpt_art.py pets: the older kit (land: rest, 3 spawn, 3 run, 2 attack; winged: 3 flap, 3 flight)
    'legacy_land': ['idle', 'summoned', 'summoned', 'summoned', 'walk', 'walk', 'walk', 'attack', 'attack'],
    'legacy_winged': ['idle', 'idle', 'idle', 'fly', 'fly', 'fly'],
}
REST_H = 120     # rest pose height in atlas px
PAD = 6          # empty px round the tallest/widest pose of a sheet
HAZE = 16        # alpha below this is export haze, not art
SOLID = 96       # solid art: what seams avoid
PIECE = 40       # art pieces (sparks and motes are often half transparent)
# Per-sheet fixes found by watching the animations: {'sheet': {'key': {frame: {...}}}}
#   dx: nudge the pose sideways (atlas px, + = forward), floor: lift (+) or sink (-) it
TWEAKS = {}


def states(layout):
    out = {}
    for i, s in enumerate(LAYOUTS[layout]): out.setdefault(s, []).append(i)
    return out


def cuts(profile, n, lo, hi):
    """n-1 cut positions in [lo, hi] through the emptiest columns, kept near an even spacing."""
    span = hi - lo; gap = span / n
    cost = np.convolve(profile, np.ones(5) / 5, 'same').astype(float)
    cost = cost / max(1.0, cost.max())
    best = [lo]
    # dynamic programme over cut positions: f[k][x] = cheapest k-th cut at x
    xs = np.arange(len(profile))
    prev = {lo: 0.0}; back = []
    for k in range(1, n):
        want = lo + gap * k
        cand = xs[(xs > want - 0.45 * gap) & (xs < want + 0.45 * gap)]
        f = {}; b = {}
        for x in cand:
            best_v, best_p = 1e18, None
            for p, v in prev.items():
                d = x - p
                if d < 0.5 * gap or d > 1.6 * gap: continue
                v2 = v + 0.6 * ((d - gap) / gap) ** 2
                if v2 < best_v: best_v, best_p = v2, p
            if best_p is None: continue
            f[int(x)] = best_v + 3 * cost[x]; b[int(x)] = best_p
        prev = f; back.append(b)
    x = min(prev, key=lambda p: prev[p] + 0.6 * (((hi - p) - gap) / gap) ** 2)
    out = [x]
    for b in reversed(back[1:]):
        x = b[x]; out.append(x)
    return sorted(out)


def seam(cost, x0, reach):
    """Cheapest top-to-bottom path through cost (h x w) starting near column x0, wandering at most reach px."""
    h, w = cost.shape
    lo, hi = max(0, x0 - reach), min(w, x0 + reach + 1)
    c = cost[:, lo:hi]
    M = c[0].copy(); M += 0.002 * np.abs(np.arange(lo, hi) - x0)
    back = np.zeros(c.shape, np.int8)
    for y in range(1, h):
        left = np.r_[np.inf, M[:-1]] + 0.05; right = np.r_[M[1:], np.inf] + 0.05
        stack = np.stack([left, M, right]); k = np.argmin(stack, 0)
        back[y] = k - 1; M = c[y] + stack[k, np.arange(len(M))]
    x = int(np.argmin(M + 0.002 * np.abs(np.arange(lo, hi) - x0)))
    path = np.zeros(h, int)
    for y in range(h - 1, -1, -1):
        path[y] = x + lo; x += int(back[y, x]) if y else 0
        x = min(max(x, 0), hi - lo - 1)
    return path


def regions(alpha, rows, cols):
    """Label every pixel with its (row, frame) cell, the borders being seams round the art."""
    H, W = alpha.shape
    cost = 0.01 + alpha / 255.0 + 60.0 * (alpha >= SOLID)
    # rows: horizontal seams (run on the transposed sheet)
    prof = (alpha >= SOLID).sum(1)
    ys = np.nonzero(prof)[0]
    ycut = cuts(prof, rows, ys[0], ys[-1]) if rows > 1 else []
    gap = (ys[-1] - ys[0]) / rows
    hseams = [seam(cost.T, y, int(0.4 * gap)) for y in ycut]
    yy = np.arange(H)[:, None]
    row = np.zeros((H, W), int)
    for s in hseams: row += yy > s[None, :]
    cell = np.full((H, W), -1, int)
    for r in range(rows):
        inside = row == r
        a = np.where(inside, alpha, 0)
        prof = (a >= SOLID).sum(0)
        xs = np.nonzero(prof)[0]
        if not len(xs): raise SystemExit(f'row {r}: no art')
        xcut = cuts(prof, cols, xs[0], xs[-1] + 1)
        g = (xs[-1] - xs[0]) / cols
        c = 0.01 + a / 255.0 + 60.0 * (a >= SOLID)
        rr = np.nonzero(inside.any(1))[0]
        vseams = [seam(c[rr[0]:rr[-1] + 1], x, int(0.35 * g)) for x in xcut]
        col = np.zeros((len(rr), W), int); xx = np.arange(W)[None, :]
        for s in vseams: col += xx > s[:, None]
        band = cell[rr[0]:rr[-1] + 1]
        band[inside[rr[0]:rr[-1] + 1]] = (r * cols + col)[inside[rr[0]:rr[-1] + 1]]
    return cell


def pose(src, own, reach=None):
    """The pose in one cell: its body plus the effects floating within reach of it (a spawn's flying shards reach
    as far as the pet is tall), soft edges kept, haze and specks dropped."""
    a = src[..., 3]
    solid = own & (a >= PIECE)
    lab, n = ndimage.label(solid, np.ones((3, 3)))
    if not n: return None
    area = ndimage.sum(solid, lab, range(1, n + 1))
    main = int(np.argmax(area)) + 1
    my, mx = np.nonzero(lab == main)
    reach = max(reach or 0, 0.35 * max(my.max() - my.min(), mx.max() - mx.min()))
    # distance from the body: pieces close to it (sparks, slashes, bones) stay, far specks go
    dist = ndimage.distance_transform_edt(lab != main)
    near = np.asarray(ndimage.minimum(dist, lab, range(1, n + 1)))
    keep = np.r_[False, (near <= reach) & (area >= 2) | (near <= 4)]
    body = keep[lab]
    # soft edges and glows: haze-free pixels of this cell joined to the kept pieces
    soft = own & (a >= HAZE)
    sl, _ = ndimage.label(soft, np.ones((3, 3)))
    ids = np.unique(sl[body]); ids = ids[ids > 0]
    m = np.isin(sl, ids) & (ndimage.binary_dilation(body, iterations=6) | (a >= 48))
    out = src.copy(); out[~m, 3] = 0; out[~m, :3] = 0
    return out, lab == main


def centre_x(mask):
    """The body's centre line: the median column of its lower two thirds (legs and torso, not wings or weapons)."""
    ys, xs = np.nonzero(mask)
    cut = ys.min() + (ys.max() - ys.min()) / 3
    return float(np.median(xs[ys >= cut]))


def floor_y(mask):
    ys = np.nonzero(mask)[0]
    return float(np.percentile(ys, 99.7))


def cut_sheet(name, kind, keys, debug=None, file=None):
    src = np.array(Image.open(SOURCE / (file or f'{name}.png')).convert('RGBA'))
    src[src[..., 3] < HAZE] = 0
    cols = len(LAYOUTS[kind])
    cell = regions(src[..., 3], len(keys), cols)
    if debug is not None: debug.update(src=src, cell=cell, kept=np.zeros(cell.shape, bool))
    poses = {}
    for r, key in enumerate(keys):
        reach = None
        for c in range(cols):
            own = cell == r * cols + c
            ys, xs = np.nonzero(own)
            box = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
            got = pose(src[box], own[box], reach)
            if got is None: raise SystemExit(f'{name}: no art for {key} frame {c}')
            img, body = got
            if c == 0: reach = 0.8 * np.ptp(np.nonzero(body)[0])
            if debug is not None: debug['kept'][box] |= img[..., 3] > 0
            ys, xs = np.nonzero(img[..., 3])
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            # a spawn or a fallen pet may be scattered pieces: all its solid art stands on the floor, not one piece
            ground = img[..., 3] >= SOLID if LAYOUTS[kind][c] in ('summoned', 'dead') else body
            poses[(r, c)] = dict(img=img[y0:y1, x0:x1], cx=centre_x(body) - x0, fy=floor_y(ground) - y0, h=y1 - y0)
    return poses


def register(placed, r, kind):
    """Lay every pose over the rest pose where they really match: walkers and humanoids by the feet and legs (so they
    don't slide), structures by their base, flyers by the whole body in both directions. The rough centre line
    stays for poses too unlike the rest pose (dead, a spawn's scattered shards)."""
    lay = LAYOUTS[kind]; W, H, X, F = 640, 520, 320, 400
    def mask(c):
        im, cx, fy = placed[(r, c)]
        m = np.zeros((H, W), np.float32); a = np.array(im)[..., 3] > 100
        x0, y0 = X - round(cx), F - round(fy)
        m[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a
        return m
    fly = kind in ('flying', 'legacy_winged')
    band = slice(0, H) if fly else slice(F - round(REST_H * (0.3 if kind == 'stationary' else 0.45)), F + 3)
    ref = mask(0)[band]
    for c in range(1, len(lay)):
        if lay[c] == 'dead': continue
        m = mask(c)[band]
        if not m.sum(): continue
        corr = signal.fftconvolve(ref, m[::-1, ::-1], mode='full')
        cy, cx0 = m.shape[0] - 1, m.shape[1] - 1
        ry = 12 if fly else 0
        win = corr[cy - ry:cy + ry + 1, cx0 - 24:cx0 + 25]
        dy, dx = np.unravel_index(np.argmax(win), win.shape)
        ov = win[dy, dx] / min(ref.sum(), m.sum())
        if ov < (0.4 if fly else 0.5): continue
        placed[(r, c)][1] -= dx - 24; placed[(r, c)][2] -= dy - ry


def build_sheet(name, kind, keys, preview=None, file=None):
    poses = cut_sheet(name, kind, keys, file=file)
    cols = len(LAYOUTS[kind])
    tw = TWEAKS.get(name, {})
    # scale each pet so its rest pose is REST_H tall (rest = body floor to the top of the pose)
    scale = {r: REST_H / poses[(r, 0)]['fy'] for r in range(len(keys))}
    placed = {}
    up = down = side = 0
    for (r, c), p in poses.items():
        k = scale[r]
        im = Image.fromarray(p['img'], 'RGBA')
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
        cx, fy = p['cx'] * k, p['fy'] * k
        placed[(r, c)] = [im, cx, fy]
    for r in range(len(keys)): register(placed, r, kind)
    for (r, c), (im, cx, fy) in placed.items():
        t = tw.get(keys[r], {}).get(c, {})
        cx -= t.get('dx', 0); fy += t.get('floor', 0); placed[(r, c)] = [im, cx, fy]
        up = max(up, fy); down = max(down, im.height - fy)
        side = max(side, cx, im.width - cx)
    cw, ch = 2 * int(np.ceil(side)) + 2 * PAD, int(np.ceil(up + down)) + 2 * PAD
    floor = PAD + int(np.ceil(up))
    atlas = Image.new('RGBA', (cw * cols, ch * len(keys)), (0, 0, 0, 0))
    for (r, c), (im, cx, fy) in placed.items():
        atlas.alpha_composite(im, (c * cw + round(cw / 2 - cx), r * ch + round(floor - fy)))
    # lossless: lossy WebP leaves coloured blocks round transparent glows
    atlas.save(OUT / f'{name}.webp', 'WEBP', lossless=True, quality=100, method=6)
    cat = {key: {'sheet': name, 'row': r, 'frames': cols, 'kind': kind, 'cellW': cw, 'cellH': ch,
                 'floor': floor, 'restH': REST_H, 'states': states(kind)} for r, key in enumerate(keys)}
    if preview: guide(atlas, name, keys, cols, cw, ch, floor, preview)
    print(f'{name}: {len(keys)} x {cols} frames, cell {cw}x{ch}')
    return cat


def guide(atlas, name, keys, cols, cw, ch, floor, out):
    """Per pet: every frame on a dark tile with the floor and centre lines, then the rest pose's outline over it."""
    out.mkdir(parents=True, exist_ok=True)
    for r, key in enumerate(keys):
        row = atlas.crop((0, r * ch, cw * cols, (r + 1) * ch))
        rest = np.array(row.crop((0, 0, cw, ch)))[..., 3] > 60
        edge = rest & ~ndimage.binary_erosion(rest)
        bg = Image.new('RGBA', row.size, (34, 30, 40, 255)); d = ImageDraw.Draw(bg)
        for c in range(cols):
            d.rectangle((c * cw, 0, c * cw + cw - 1, ch - 1), outline=(60, 56, 70))
            d.line((c * cw, floor, c * cw + cw, floor), fill=(90, 160, 90))
            d.line((c * cw + cw // 2, 0, c * cw + cw // 2, ch), fill=(90, 90, 170))
        bg.alpha_composite(row)
        px = bg.load()
        for c in range(1, cols):
            for y, x in zip(*np.nonzero(edge)): px[c * cw + x, y] = (255, 70, 200, 255)
        bg.save(out / f'{name}__{key}.png')


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview'); preview = Path(args[i + 1]); del args[i:i + 2]
    sheets = json.loads((SOURCE / 'pets.json').read_text(encoding='utf-8'))
    extra = SOURCE / 'chatgpt_sheets.json'   # pets imported by tools/chatgpt_art.py: the older 9/6 frame kit
    if extra.exists():
        for name, e in json.loads(extra.read_text(encoding='utf-8')).items():
            sheets[name] = {'kind': 'legacy_winged' if e['frames'] == 6 else 'legacy_land', 'keys': e['keys'], 'file': e['file']}
    OUT.mkdir(parents=True, exist_ok=True)
    cat_path = OUT / 'catalog.json'
    catalog = json.loads(cat_path.read_text(encoding='utf-8')) if args and cat_path.exists() else {}
    for name, e in sheets.items():
        if args and name not in args: continue
        catalog.update(build_sheet(name, e['kind'], e['keys'], preview, e.get('file')))
    for key, (src_key, fn) in DERIVED.items():
        if src_key not in catalog or (args and catalog[src_key]['sheet'] not in args): continue
        meta = catalog[src_key]; sheet = 'dk_' + src_key
        row = Image.open(OUT / f"{meta['sheet']}.webp").convert('RGBA').crop(
            (0, meta['row'] * meta['cellH'], meta['cellW'] * meta['frames'], (meta['row'] + 1) * meta['cellH']))
        Image.fromarray(fn(np.array(row)), 'RGBA').save(OUT / f'{sheet}.webp', 'WEBP', lossless=True, quality=100, method=6)
        catalog[key] = {**meta, 'sheet': sheet, 'row': 0}
        print(f'{sheet}: {key} from {src_key}')
    cat_path.write_text(json.dumps(catalog, separators=(',', ':')) + '\n', encoding='utf-8')


def ramp(lum, stops):
    """Map luminance 0..1 onto a list of (pos, (r, g, b)) colour stops."""
    pos = np.array([p for p, _ in stops]); col = np.array([c for _, c in stops], float)
    return np.stack([np.interp(lum, pos, col[:, i]) for i in range(3)], axis=-1)


def frost(rgba):
    """Recolour a ghoul to the Death Knight's palette: corpse-blue skin, gunmetal rags, rune-cyan eyes and mist."""
    rgb = rgba[..., :3].astype(float) / 255; hi = rgb.max(-1); lo = rgb.min(-1); sat = (hi - lo) / np.maximum(hi, 1e-3)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = np.clip(0.3 * r + 0.59 * g + 0.11 * b, 0, 1)
    out = ramp(np.clip(lum * 1.08, 0, 1), [(0, (8, 12, 22)), (0.25, (34, 48, 68)), (0.5, (92, 116, 140)), (0.75, (160, 186, 206)), (1, (228, 240, 250))])
    eyes = (r > 0.5) & (r > g * 1.8) & (r > b * 1.8) & (hi > 0.55)
    rags = (r > g * 1.12) & (r > b * 1.2) & (sat > 0.3) & ~eyes   # the loincloth and blood stripes
    mist = (g > r * 1.18) & (g > b * 1.05) & (sat > 0.18)         # the green spawn mist and claw swipe
    out[rags] = ramp(lum[rags], [(0, (6, 8, 16)), (0.3, (26, 34, 56)), (0.6, (58, 74, 104)), (1, (120, 140, 170))])
    out[mist] = ramp(lum[mist], [(0, (16, 40, 80)), (0.35, (58, 140, 210)), (0.6, (122, 208, 255)), (1, (232, 250, 255))])
    out[eyes] = ramp(lum[eyes], [(0, (64, 192, 255)), (0.5, (150, 230, 255)), (1, (240, 255, 255))])
    res = rgba.copy(); res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return res


# Rows re-coloured into sheets of their own: new key -> (source key, recolour).
DERIVED = {'dkghoul': ('ghoul', frost)}


if __name__ == '__main__':
    main()
