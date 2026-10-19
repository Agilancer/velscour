"""Straighten scatter sprites onto the game's 2:1 isometric grid.

Much of the painted scatter (AI-drawn packs especially) is drawn at the wrong angle: boxes in perspective, seen from
too low, or turned in plan, and flat things (headstones, racks, banners) face the camera head-on. Next to the exact
2:1 floor diamonds and walls they stick out. This tool re-projects them:

- box:    a box-like prop is re-projected layer by layer. Each layer is a horizontal outline (left, front and right
          corners, optionally the back one) that is mapped onto a true 2:1 parallelogram with the same horizontal
          extents, the layers stacked straight up over the base's centre. The faces between layers and the top face
          are mapped as triangles (a piecewise affine warp), anything outside them by an outer ring. Corners come from
          the silhouette (`auto`) or the spec.
- plane:  a flat, camera-facing prop is sheared vertically so its base runs along an iso axis (slope -1/2).
- shear:  a prop turned in plan or drawn a few degrees steep: one affine that takes its two ground edges to +-1/2.

The spec (tools/isofix_spec.json) lists the props to fix per source. The source atlases are only read, so running this
again is always safe. Output: assets/tiles/isofix/<source>.webp and isofix.json ({source: {name: [x, y, w, h, ox, oy]}},
ox/oy the image's top-left from the ground pivot in the source's native px), which src/gfx/isofix.js loads; the game
uses a fixed sprite wherever one exists.

    python tools/isofix.py                         # build every source in the spec
    python tools/isofix.py review [source ...]     # before/after sheets on the source's own floor -> art-review/isofix/
    python tools/isofix.py corners <source> <name> # print the detected corners of one prop (to seed the spec)
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = os.path.join(ROOT, 'tools', 'isofix_spec.json')
OUT = os.path.join(ROOT, 'assets', 'tiles', 'isofix')
REVIEW = os.path.join(ROOT, 'art-review', 'isofix')
ISO = 0.5
PACKS = ['catacombs', 'cathedral_graveyard', 'castle_keep', 'sewers', 'dark_forest']
APPROVED = 'assets/tiles/approved_biomes/'


# ---- sources: name -> (atlas path, rect, ox, oy, floor) ---------------------------------------------------------------
def sources():
    out = {}
    for p in PACKS:
        j = json.load(open(f'{ROOT}/assets/tiles/{p}/pack.json'))
        fl = next(f for f in j['floors'] if f['seamless'])
        floor = (f'assets/tiles/{p}/floors.webp', (fl['x'], fl['y'], fl['w'], fl['h']))
        out['pack:' + p] = {s['name']: (f'assets/tiles/{p}/scatter.webp', (s['x'], s['y'], s['w'], s['h']), s['ox'], s['oy'], floor)
                            for s in j['scatter']}
    t = json.load(open(f'{ROOT}/assets/tiles/town/town.json'))
    g = t['floors'].get('stone') or next(iter(t['floors'].values()))
    floor = ('assets/tiles/town/ground.webp', (g[0], g[1], 160, 80))
    out['town'] = {n: ('assets/tiles/town/objects.webp', tuple(v[:4]), v[4], v[5], floor)
                   for n, v in t['objects'].items() if not n.startswith(('b_', 't_'))}
    c = json.load(open(f'{ROOT}/assets/tiles/castle/pack.json'))['atlases']
    f0 = c['floors'][20]
    floor = ('assets/tiles/castle/floors.webp', (f0['x'], f0['y'], f0['w'], f0['h']))
    out['castle'] = {a['id']: ('assets/tiles/castle/scatter.webp', (a['x'], a['y'], a['w'], a['h']), -a['pivot'][0], -a['pivot'][1], floor)
                     for a in c['scatter']}
    s = json.load(open(f'{ROOT}/assets/tiles/sea_of_sand/pack.json'))['atlases']
    f0 = s['floor'][0]
    floor = ('assets/tiles/sea_of_sand/floor.webp', (f0['x'], f0['y'], f0['w'], f0['h']))
    out['sea_of_sand'] = {a['name']: ('assets/tiles/sea_of_sand/scatter.webp', (a['x'], a['y'], a['w'], a['h']),
                                      -int(round(a['pivot'][0])), -int(round(a['pivot'][1])), floor) for a in s['scatter']}
    # the temple biomes' painted props: 80x80 cells, drawn 2x by approvedbiomeart.js (name = biome row + type)
    rows = ['desert_temple', 'ice_temple', 'hell', 'astral_plane', 'heavenly']
    types = ['obelisk', 'brazier', 'sarcophagus', 'column', 'banner', 'urn', 'statue', 'altar']
    floor = (f'assets/tiles/catacombs/floors.webp', (0, 0, 160, 80))
    out['approved'] = {f'{b}:{t}': (APPROVED + 'props.webp', (c * 80, r * 80, 80, 80), -40, -76, floor)
                       for r, b in enumerate(rows) for c, t in enumerate(types)}
    return out


_imgs = {}
def image(path):
    if path not in _imgs: _imgs[path] = Image.open(os.path.join(ROOT, path)).convert('RGBA')
    return _imgs[path]


def sprite(src, name):
    path, (x, y, w, h), ox, oy, _ = src[name]
    img = image(path).crop((x, y, x + w, y + h))
    if path.endswith('props.webp'):  # approved cells: drop slivers of neighbouring cells, as propCell() does
        a = np.asarray(img).copy(); lab, n = ndimage.label(a[..., 3] > 24, np.ones((3, 3)))
        if n:
            sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)); big = sizes.max()
            for i, s in enumerate(sizes, 1):
                if s < big * 0.15: a[lab == i, 3] = 0
        img = Image.fromarray(a, 'RGBA')
    return img, ox, oy


# ---- corner detection ---------------------------------------------------------------------------------------------
def mask(img, thr=100):
    a = np.asarray(img)[..., 3] > thr
    lab, n = ndimage.label(a, np.ones((3, 3)))
    if n > 1:  # the object, without loose specks
        sizes = ndimage.sum(a, lab, range(1, n + 1)); a = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.08])
    return a


def _robust_line(x, y):
    w = np.ones_like(x)
    for _ in range(25):
        A = np.stack([x, np.ones_like(x)], 1) * w[:, None]; c = np.linalg.lstsq(A, y * w, rcond=None)[0]
        r = np.abs(y - (c[0] * x + c[1])); w = 1 / np.maximum(r, 0.7)
    return c, float(np.median(np.abs(y - (c[0] * x + c[1]))))


def _vfit(x, y, trim=0.06):
    """Two lines meeting at a corner, fitted to a silhouette profile y(x): ((slope, icpt), (slope, icpt), corner x)."""
    n = len(x); x, y = x[int(n * trim):n - int(n * trim)], y[int(n * trim):n - int(n * trim)]
    best = None
    for k in range(max(4, int(len(x) * .1)), min(len(x) - 4, int(len(x) * .9)), 1):
        cl, el = _robust_line(x[:k], y[:k]); cr, er = _robust_line(x[k:], y[k:])
        e = (el * k + er * (len(x) - k)) / len(x)
        if best is None or e < best[0]: best = (e, cl, cr)
    _, cl, cr = best
    xc = (cr[1] - cl[1]) / (cl[0] - cr[0]) if abs(cl[0] - cr[0]) > 1e-6 else x[len(x) // 2]
    return cl, cr, xc


def hexagon(img):
    """The silhouette of a box as six corners: lines fitted to the lower outline (the two bottom edges, meeting at the
    front corner) and to the upper one (the two top-back edges, meeting at the back corner), cut at the sprite's sides."""
    a = mask(img); cols = np.nonzero(a.any(0))[0]
    lo = np.array([np.nonzero(a[:, c])[0].max() + 1 for c in cols], float)
    hi = np.array([np.nonzero(a[:, c])[0].min() for c in cols], float)
    x = cols.astype(float) + .5; x0, x1 = cols.min(), cols.max() + 1
    bl, br, fx = _vfit(x, lo); tl, tr, bx = _vfit(x, hi)
    at = lambda c, X: [float(X), float(c[0] * X + c[1])]
    return {'Lb': at(bl, x0), 'Fb': at(bl, fx), 'Rb': at(br, x1), 'Lt': at(tl, x0), 'Bt': at(tl, bx), 'Rt': at(tr, x1)}


def base_slope(img):
    """Slope of the base line of a flat prop: a robust line through the lowest pixel of each column."""
    a = mask(img); cols = np.nonzero(a.any(0))[0]
    if len(cols) < 6: return 0.0
    y = np.array([np.nonzero(a[:, c])[0].max() for c in cols], float); x = cols.astype(float)
    n = len(x); x, y = x[int(n * .1):int(n * .9) + 1], y[int(n * .1):int(n * .9) + 1]
    w = np.ones_like(x)
    for _ in range(25):
        A = np.stack([x, np.ones_like(x)], 1) * w[:, None]; c = np.linalg.lstsq(A, y * w, rcond=None)[0]
        r = np.abs(y - (c[0] * x + c[1])); w = 1 / np.maximum(r, 0.7)
    return float(c[0])


# ---- the warp -----------------------------------------------------------------------------------------------------
def _layer_target(P, C):
    """A layer's corners [L, F, R, B] -> the 2:1 parallelogram with the same horizontal extents, centred on C."""
    L, F, R, B = P
    dl = ((F[0] - L[0]) + (R[0] - B[0])) / 2; dr = ((R[0] - F[0]) + (B[0] - L[0])) / 2
    Lp = np.array([-dl, -dl * ISO]); Rp = np.array([dr, -dr * ISO])
    Fp = np.asarray(C, float) - (Lp + Rp) / 2
    return [Fp + Lp, Fp, Fp + Rp, Fp + Lp + Rp]


def _layer(l):
    """[L, F, R] or [L, F, R, B] with F or B possibly null -> four corners."""
    L, F, R = (None if p is None else np.asarray(p, float) for p in l[:3])
    B = np.asarray(l[3], float) if len(l) > 3 and l[3] is not None else None
    if F is None: F = L + R - B
    if B is None: B = L + R - F
    return [L, F, R, B]


def mesh(w, h, ox, oy, fix):
    """Control points P (source px), Q (target px from the new pivot), triangles, new pivot (source px)."""
    piv = np.array([-ox, -oy], float)
    if 'shear' in fix or 'plane' in fix:
        if 'shear' in fix:
            tl, tr = (math.tan(math.radians(t)) for t in fix['shear'])
            A = (tl - tr) / (2 * ISO); b = -(tl + tr) / 2; s = fix.get('s', A ** -0.5)
            M = np.array([[s * A, s * b], [0, s]])
        else:
            s0, t = fix['slope'], fix['plane']
            M = np.array([[fix.get('sx', 1.0), t - s0], [0, 1.0]])
        P = np.array([[-2, -2], [w + 2, -2], [w + 2, h + 2], [-2, h + 2]], float)
        return P, (P - piv) @ M, [(0, 1, 2), (0, 2, 3)], piv
    layers = [_layer(l) for l in fix['layers']]
    cs = [np.mean(l, 0) for l in layers]; base = cs[0]; hs = fix.get('h', 1.0)
    P, Q, tris = [], [], []
    def add(p, q): P.append(np.asarray(p, float)); Q.append(np.asarray(q, float)); return len(P) - 1
    idx = []
    for l, c in zip(layers, cs):
        tgt = _layer_target(l, [base[0], base[1] - (base[1] - c[1]) * hs])
        idx.append([add(l[k], tgt[k] - base) for k in range(4)])
    for i in range(len(idx) - 1):  # left and right faces between layers
        a, b = idx[i], idx[i + 1]
        tris += [(a[0], a[1], b[1]), (a[0], b[1], b[0]), (a[1], a[2], b[2]), (a[1], b[2], b[1])]
    t = idx[-1]; tris += [(t[0], t[1], t[2]), (t[0], t[2], t[3])]  # top face
    ring = [idx[0][0], idx[0][1], idx[0][2]] + [idx[i][2] for i in range(1, len(idx))] + [idx[-1][3]] + \
           [idx[i][0] for i in range(len(idx) - 1, 0, -1)]
    Pa, Qa = np.array(P), np.array(Q); cP, cQ = Pa[ring].mean(0), Qa[ring].mean(0); m = float(max(w, h)) * 1.5
    outer = [add(Pa[r] + (Pa[r] - cP) / np.linalg.norm(Pa[r] - cP) * m, Qa[r] + (Qa[r] - cQ) / np.linalg.norm(Qa[r] - cQ) * m) for r in ring]
    for k in range(len(ring)):
        a, b, A2, B2 = ring[k], ring[(k + 1) % len(ring)], outer[k], outer[(k + 1) % len(ring)]
        tris += [(a, b, B2), (a, B2, A2)]
    return np.array(P), np.array(Q), tris, base


def warp(img, ox, oy, fix):
    """-> (image, ox, oy): the re-projected sprite and its top-left from the (new) ground pivot."""
    a = np.asarray(img.convert('RGBA')).astype(np.float64); h, w = a.shape[:2]
    P, Q, tris, _ = mesh(w, h, ox, oy, fix)
    pm = a.copy(); pm[..., :3] *= pm[..., 3:] / 255
    pad = np.zeros((h + 2, w + 2, 4)); pad[1:-1, 1:-1] = pm
    lo = np.floor(Q.min(0)).astype(int); hi = np.ceil(Q.max(0)).astype(int)
    lo = np.maximum(lo, -700); hi = np.minimum(hi, 700)
    acc = np.zeros((hi[1] - lo[1] + 1, hi[0] - lo[0] + 1, 4))
    done = np.zeros(acc.shape[:2], bool)
    for t in tris:
        q, p = Q[list(t)], P[list(t)]
        M = np.array([[q[1][0] - q[0][0], q[2][0] - q[0][0]], [q[1][1] - q[0][1], q[2][1] - q[0][1]]])
        if abs(np.linalg.det(M)) < 1e-9: continue
        Mi = np.linalg.inv(M)
        x0, y0 = np.maximum(np.floor(q.min(0)).astype(int), lo); x1, y1 = np.minimum(np.ceil(q.max(0)).astype(int), hi)
        if x1 < x0 or y1 < y0: continue
        gy, gx = np.mgrid[y0:y1 + 1, x0:x1 + 1]; gx, gy = gx.ravel(), gy.ravel()
        bc = (np.stack([gx + .5, gy + .5], 1) - q[0]) @ Mi.T
        k = (bc[:, 0] >= -1e-7) & (bc[:, 1] >= -1e-7) & (bc.sum(1) <= 1 + 1e-7) & ~done[gy - lo[1], gx - lo[0]]
        if not k.any(): continue
        bc, gx, gy = bc[k], gx[k], gy[k]
        sp = p[0] + bc[:, :1] * (p[1] - p[0]) + bc[:, 1:] * (p[2] - p[0])
        x = sp[:, 0] + .5; y = sp[:, 1] + .5  # +1 pad, -.5 centre
        xi = np.floor(x).astype(int); yi = np.floor(y).astype(int); fx = (x - xi)[:, None]; fy = (y - yi)[:, None]
        ok = (xi >= 0) & (yi >= 0) & (xi < w + 1) & (yi < h + 1)
        xi, yi, fx, fy, gx, gy = xi[ok], yi[ok], fx[ok], fy[ok], gx[ok], gy[ok]
        v = pad[yi, xi] * (1 - fx) * (1 - fy) + pad[yi, xi + 1] * fx * (1 - fy) + pad[yi + 1, xi] * (1 - fx) * fy + pad[yi + 1, xi + 1] * fx * fy
        acc[gy - lo[1], gx - lo[0]] = v; done[gy - lo[1], gx - lo[0]] = True
    al = acc[..., 3:4]; acc[..., :3] = np.where(al > 0, acc[..., :3] * 255 / np.maximum(al, 1e-6), 0)
    out = Image.fromarray(np.clip(np.round(acc), 0, 255).astype(np.uint8), 'RGBA')
    bb = out.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    out = out.crop(bb)
    return out, int(lo[0] + bb[0]), int(lo[1] + bb[1])


# ---- spec -> fix ----------------------------------------------------------------------------------------------------
def resolve(img, e):
    """A spec entry -> a concrete fix dict."""
    if isinstance(e, str): e = {e: True}
    if e.get('shear') is True:  # the two bottom edges from the lower outline
        a = mask(img); cols = np.nonzero(a.any(0))[0]
        lo = np.array([np.nonzero(a[:, c])[0].max() + 1 for c in cols], float)
        bl, br, _ = _vfit(cols.astype(float) + .5, lo)
        L, R = math.degrees(math.atan(bl[0])), math.degrees(math.atan(br[0]))
        if not (5 < L < 50 and -50 < R < -5): return {'shear': [26.565, -26.565]}  # not a V: leave it be
        return {'shear': [L, R]}
    if 'shear' in e or 'layers' in e: return e
    if 'plane' in e:
        s = e.get('slope', base_slope(img))
        t = e['plane'] if e['plane'] in (-.5, .5) else (-.5 if s <= 0.08 else .5)
        return {'plane': t, 'slope': s, 'sx': e.get('sx', 1.0)}
    if 'box' in e:
        c = hexagon(img); c.update({k: v for k, v in e.items() if k in c})
        top = _layer([c['Lt'], e.get('Ft'), c['Rt'], c['Bt']])
        if 'T' in e:  # ornaments on top (an effigy, candles): the top is the base's outline raised by T px
            bottom = _layer([c['Lb'], c['Fb'], c['Rb']]); top = [p - np.array([0, e['T']]) for p in bottom]
        elif 'H' in e:  # a top on legs or a ragged base: the base is the top's outline dropped by H
            bottom = [p + np.array([0, e['H']]) for p in top]
        else:  # the bottom layer from the lower silhouette, the top from the upper one (its front corner is hidden)
            bottom = [c['Lb'], c['Fb'], c['Rb']]
        layers = [bottom, top]
        for extra in e.get('mid', []): layers.insert(-1, extra)
        return {'layers': layers, 'h': e.get('h', 1.0)}
    raise ValueError(e)


def fix_one(src, name, e):
    img, ox, oy = sprite(src, name)
    f = resolve(img, e)
    out, nox, noy = warp(img, ox, oy, f)
    # a bad corner fit stretches the sprite across the screen: refuse it rather than ship it
    if out.width * out.height > 2.2 * img.width * img.height or out.height > 1.6 * img.height + 10:
        raise ValueError(f'{name}: warp blew up ({img.size} -> {out.size}); fix its corners in the spec')
    return img, ox, oy, out, nox, noy, f


def spec():
    return json.load(open(SPEC))


def build():
    S, src, index = spec(), sources(), {}
    os.makedirs(OUT, exist_ok=True)
    for key, entries in S.items():
        if key.startswith('_'): continue
        sprites = []
        for name, e in entries.items():
            if name.startswith('_'): continue
            _, _, _, out, nox, noy, _ = fix_one(src[key], name, e)
            sprites.append((name, out, nox, noy))
        # shelf-pack
        W = 2048; x = y = rowh = 0; rects = []
        for name, im, nox, noy in sorted(sprites, key=lambda s: -s[1].height):
            if x + im.width + 2 > W: x, y, rowh = 0, y + rowh + 2, 0
            rects.append((name, im, x, y, nox, noy)); x += im.width + 2; rowh = max(rowh, im.height)
        atlas = Image.new('RGBA', (W, y + rowh + 2), (0, 0, 0, 0))
        for name, im, x, y, nox, noy in rects: atlas.alpha_composite(im, (x, y))
        file = key.replace(':', '_') + '.webp'
        atlas.save(os.path.join(OUT, file), 'WEBP', quality=92, alpha_quality=100, method=6)
        index[key] = {'file': file, 'sprites': {name: [x, y, im.width, im.height, nox, noy] for name, im, x, y, nox, noy in rects}}
        print('%-28s %3d sprites, atlas %dx%d' % (key, len(rects), atlas.width, atlas.height))
    with open(os.path.join(OUT, 'isofix.json'), 'w') as f: json.dump(index, f, separators=(',', ':'))


# ---- review sheets --------------------------------------------------------------------------------------------------
def _floor_patch(floor, W, H, cx, cy):
    path, (x, y, w, h) = floor
    tile = image(path).crop((x, y, x + w, y + h)).resize((160, 80))
    im = Image.new('RGBA', (W, H), (24, 24, 28, 255))
    for u in range(-4, 5):
        for v in range(-4, 5):
            px, py = cx + (u - v) * 80 - 80, cy + (u + v) * 40 - 40
            if -160 < px < W and -80 < py < H: im.alpha_composite(tile, (px, py))
    return im


def review(keys=None, names=None, corners=True):
    S, src = spec(), sources()
    os.makedirs(REVIEW, exist_ok=True)
    for key, entries in S.items():
        if key.startswith('_') or (keys and key not in keys): continue
        cells = []
        for name, e in entries.items():
            if name.startswith('_') or (names and name not in names): continue
            try: img, ox, oy, out, nox, noy, f = fix_one(src[key], name, e)
            except ValueError as err: print('  !!', err); continue
            W, H = 520, 420; pics = []
            for k, (im, x, y) in enumerate([(img, ox, oy), (out, nox, noy)]):
                z = 2 if key == 'approved' else 1  # drawn 2x in game
                if z > 1: im = im.resize((im.width * 2, im.height * 2), Image.NEAREST); x, y = x * 2, y * 2
                cx, cy = W // 2, H - 110
                p = _floor_patch(src[key][name][4], W, H, cx, cy); p.alpha_composite(im, (cx + x, cy + y))
                if k == 0 and corners and 'layers' in f:
                    d = ImageDraw.Draw(p)
                    for li, l in enumerate(f['layers']):
                        for pt in _layer(l):
                            X, Y = cx + (pt[0] * z + x), cy + (pt[1] * z + y)
                            d.ellipse([X - 2, Y - 2, X + 2, Y + 2], outline=(255, 60, 60) if li == 0 else (60, 220, 255))
                pics.append((p, cx + x, cy + y, im.width, im.height))
            # crop both to the union of the two sprites (plus margin) and show at 2x
            x0 = min(q[1] for q in pics) - 30; y0 = min(q[2] for q in pics) - 20
            x1 = max(q[1] + q[3] for q in pics) + 30; y1 = max(q[2] + q[4] for q in pics) + 30
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
            cw, ch = (x1 - x0) * 2, (y1 - y0) * 2
            cell = Image.new('RGBA', (max(cw * 2 + 8, 300), ch + 22), (0, 0, 0, 255))
            for k, (p, *_r) in enumerate(pics):
                cell.paste(p.crop((x0, y0, x1, y1)).resize((cw, ch), Image.NEAREST), (k * (cw + 8), 22))
            ImageDraw.Draw(cell).text((4, 4), f'{name}  {"/".join(k for k in f if k in ("layers", "shear", "plane"))}', fill=(255, 255, 255))
            cells.append(cell)
        for n in range(0, len(cells), 6):
            cs = cells[n:n + 6]; cols = 2; rows = math.ceil(len(cs) / cols)
            cw = max(c.width for c in cs); rh = [max(c.height for c in cs[r * cols:(r + 1) * cols]) for r in range(rows)]
            sh = Image.new('RGB', (cols * (cw + 6), sum(rh) + 6 * rows), (70, 70, 70))
            for i, c in enumerate(cs): sh.paste(c, ((i % cols) * (cw + 6), sum(rh[:i // cols]) + 6 * (i // cols)))
            out = os.path.join(REVIEW, f'{key.replace(":", "_")}_{n // 6}.png'); sh.save(out); print(out)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: build()
    elif a[0] == 'review':
        ks = set(spec()); review([k for k in a[1:] if k in ks] or None, [k for k in a[1:] if k not in ks] or None)
    elif a[0] == 'corners':
        img, ox, oy = sprite(sources()[a[1]], a[2]); print(json.dumps({k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in hexagon(img).items()}), 'pivot', -ox, -oy)
