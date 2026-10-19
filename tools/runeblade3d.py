"""
The Death Knight's Runeblade as a 3D model (src/gfx/runeblade3d.js): its texture sheet, importer and ChatGPT kit.

The game builds the sword in the browser from ONE painted sheet (1024 x 1536, flat magenta) holding three views of
the same sword, pointing down, on shared guide lines:
  FRONT  the sword face-on. Its outline is the model's outline; its colours are the front of the model.
  SIDE   the sword edge-on (turned 90 degrees). Only its outline is used: the model's thickness at every height.
  BACK   the sword from behind (mirrored, as if you walked round it). The colours of the model's back.
Each painted row becomes a slab with a six-sided cross-section (an edge, a bevel, a flat, a bevel, an edge) as wide
as the FRONT row and as thick as the SIDE row, so the pixel-stepped outline becomes stepped 3D geometry.

    python tools/runeblade3d.py                    # placeholder (if none installed) + kit zip
    python tools/runeblade3d.py install SHEET.png  # import a painted sheet (e.g. from ChatGPT) into the game
    python tools/runeblade3d.py placeholder        # repaint and install the built-in placeholder sword
    python tools/runeblade3d.py template           # write the template + example PNGs only (to tools/runeblade3d_kit/out)
    python tools/runeblade3d.py kit                # docs/art_kits/ChatGPT_Runeblade_3D_Kit.zip

Writes assets/fx/runeblade/runeblade3d.png (a 256 x 512 atlas: the sheet at 1 art pixel per texel, magenta cut,
edge colours bled into the clear texels for filtering) and runeblade3d.json (guide rows, column centres and the
per-row profile). Never hand-edit those two. Needs: pip install pillow numpy scipy
"""
import io, json, os, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KITDIR = os.path.join(ROOT, 'tools', 'runeblade3d_kit')
ASSETS = os.path.join(ROOT, 'assets', 'fx', 'runeblade')
SKINSRC = os.path.join(ROOT, 'assets', 'source', 'runeblade3d')
ZIP = os.path.join(ROOT, 'docs', 'art_kits', 'ChatGPT_Runeblade_3D_Kit.zip')
KIT = 'ChatGPT_Runeblade_3D_Kit'

# ------------------------------------------------------------------ the sheet (sheet pixels; 1 art pixel = AP x AP)
W, H, AP = 1024, 1536, 4
POMMEL, GUARD, TIP = 112, 376, 1488          # pommel top, crossguard centre, point (rows)
COLS = {'FRONT': (32, 432, 232), 'SIDE': (452, 572, 512), 'BACK': (592, 992, 792)}   # box x0, x1, centre x
REGION = {'FRONT': (0, 442), 'SIDE': (442, 582), 'BACK': (582, 1024)}               # where the importer looks
SLOTS = [0.14 + i * 0.12 for i in range(6)]  # rune slots, fraction of crossguard -> tip
BLADE_W, GUARD_W, MAX_T = 144, 360, 120      # suggested blade width at the guard, guard width, max side width
MAG, CY, YEL, GRN, INK = (255, 0, 255, 255), (0, 229, 255, 255), (255, 210, 122, 255), (120, 255, 140, 255), (255, 255, 255, 255)
GUIDES = [(0, 229, 255), (255, 210, 122), (120, 255, 140), (255, 255, 255)]

RAMPS = {
  'Blackened steel (grip, crossguard, pommel)': ['#08080c', '#13131c', '#20202e', '#323246', '#4c4c66', '#76769a'],
  'Frost-glass (the spectral blade)': ['#0a1620', '#16303e', '#285468', '#3e7c94', '#66a8c0', '#a6d8e6', '#e6f6fa'],
  'Verdigris bronze (fittings, tears under the guard)': ['#0e1412', '#1c2a26', '#2e4640', '#46665c', '#6a8c7e', '#9ab8a6'],
  'Shadow ink (deepest darks only)': ['#07060a', '#100c14', '#1a1220'],
  'Moonlit rim (right-hand edges)': ['#6f84a8', '#9fb4d4', '#d4e2f4'],
}

def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

def font(size):
    for f in ('consolab.ttf', 'DejaVuSansMono-Bold.ttf', 'LiberationMono-Bold.ttf'):
        try: return ImageFont.truetype(f, size)
        except OSError: pass
    return ImageFont.load_default(size)

def label(d, x, y, text, size=15, col=INK, anchor='la'):
    d.text((x, y), text, font=font(size), fill=col, stroke_width=3, stroke_fill=(0, 0, 0, 255), anchor=anchor)

def dashed(d, a, b, col=CY, dash=(8, 6), w=2):
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0)); t = 0
    while t < n:
        e = min(n, t + dash[0])
        d.line((x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n, x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n), fill=col, width=w)
        t += sum(dash)

def slot_rows(guard=GUARD, tip=TIP): return [round(guard + (tip - guard) * f) for f in SLOTS]

# ------------------------------------------------------------------ guides (template, and overlaid on the example)
def guides(img, full=True):
    d = ImageDraw.Draw(img)
    for name, (x0, x1, cx) in COLS.items():
        for a, b in (((x0, POMMEL - 30), (x1, POMMEL - 30)), ((x1, POMMEL - 30), (x1, TIP + 30)), ((x1, TIP + 30), (x0, TIP + 30)), ((x0, TIP + 30), (x0, POMMEL - 30))):
            dashed(d, a, b, CY)
        dashed(d, (cx, POMMEL - 30), (cx, TIP + 30), YEL, (4, 6), 1)                 # centre line
        for y, w in ((POMMEL, 2), (GUARD, 3), (TIP, 2)):
            dashed(d, (x0, y), (x1, y), YEL, (12, 5) if y == GUARD else (5, 5), w)
        if name != 'SIDE':
            for y in slot_rows():                                                     # the six rune slots
                d.rectangle((cx - 10, y - 10, cx + 10, y + 10), outline=GRN, width=2)
            for s in (-1, 1):                                                         # blade width at the guard, guard ends
                d.line((cx + s * BLADE_W // 2, GUARD + 24, cx + s * BLADE_W // 2, GUARD + 60), fill=GRN, width=2)
                d.line((cx + s * GUARD_W // 2, GUARD - 26, cx + s * GUARD_W // 2, GUARD + 26), fill=GRN, width=2)
    if not full: return img
    label(d, 16, 12, 'VELSCOUR  RUNEBLADE 3D TEXTURE SHEET   1024 x 1536   1 art pixel = 4 x 4 px   flat magenta #FF00FF', 17)
    label(d, 16, 40, 'Three views of ONE sword, point down, on the same yellow lines. The game builds the 3D model from them.', 15, (200, 230, 255, 255))
    for name, (x0, x1, cx) in COLS.items():
        sub = {'FRONT': 'face-on', 'SIDE': 'edge-on (turned 90 deg)', 'BACK': 'from behind (mirrored)'}[name]
        label(d, cx, 60, name, 18, CY, 'ma'); label(d, cx, POMMEL - 26, sub, 12, CY, 'ma')
    for y, t in ((POMMEL, 'POMMEL TOP'), (GUARD, 'CROSSGUARD CENTRE'), (TIP, 'POINT')):
        label(d, COLS['FRONT'][0] + 4, y + 6, t, 12, YEL)
    fx = COLS['FRONT'][2]
    label(d, fx, GUARD + 64, 'blade ~144 px', 11, GRN, 'ma'); label(d, fx + GUARD_W // 2 - 4, GUARD + 30, 'guard ~360 px', 11, GRN, 'ra')
    label(d, COLS['FRONT'][2] + 16, slot_rows()[0] - 8, '6 rune slots', 12, GRN)
    label(d, COLS['SIDE'][2], TIP + 34, 'max 120 px', 11, CY, 'ma')
    return img

def template():
    return guides(Image.new('RGBA', (W, H), MAG))

# ------------------------------------------------------------------ the placeholder sword (painted in art pixels)
def paint_placeholder():
    """Front, side and back of the default Runeblade at 1 AP per texel on a 256 x 384 grid; returns RGBA array."""
    S = [hexc(c) for c in RAMPS['Blackened steel (grip, crossguard, pommel)']]
    F = [hexc(c) for c in RAMPS['Frost-glass (the spectral blade)']]
    V = [hexc(c) for c in RAMPS['Verdigris bronze (fittings, tears under the guard)']]
    R = [hexc(c) for c in RAMPS['Moonlit rim (right-hand edges)']]
    a = np.zeros((H // AP, W // AP, 4), np.uint8)
    top, guard, tip = POMMEL // AP, GUARD // AP, TIP // AP          # 28, 94, 372

    def bladehw(y):   # blade half-width (AP) at row y: broad, slight taper, long point
        if y < guard + 8: return 18
        if y < tip - 54: return 18 - 3 * (y - guard - 8) / (tip - 54 - guard - 8)
        return 15 * ((tip - y) / 54) ** 0.8

    def spans(y):     # [(x0, x1 inclusive, part)] relative to the centre
        out = []
        if top <= y <= top + 17:                                    # hourglass pommel with a gem
            k = y - top; hw = [3, 4, 6, 7, 7, 8, 8, 8, 8, 8, 8, 7, 7, 6, 4, 4, 4, 4][k]
            out.append((-hw, hw - 1, 'pommel'))
        elif y <= guard - 8: out.append((-3, 2, 'grip'))
        elif y <= guard + 7:                                        # tomb-lid crossguard, hourglass ends
            k = abs(y - guard)
            out.append((-38, 37, 'guard') if k <= 5 else (-9, 8, 'boss'))
            if k <= 7: out += [(-45, -36 + (k > 5), 'end'), (35 - (k > 5), 44, 'end')]
        elif y <= tip:
            hw = bladehw(y); i = max(1, int(round(hw)))
            out.append((-i, i - 1, 'blade'))
        return out

    def col(part, x, y, x0, x1, side=False):
        w = x1 - x0 + 1; u = (x - x0) / max(1, w - 1)               # 0 left .. 1 right
        edge = x == x0 or x == x1
        if part == 'blade':
            if edge: return F[1] if x == x0 or (y // 6) % 3 == 0 else R[1]
            if y > tip - 10: return F[6] if u < 0.5 else F[5]
            if side: return F[5] if u < 0.4 else F[4] if u < 0.7 else F[3]
            if u < 0.28: return F[5] if u > 0.06 else F[6]
            if u > 0.72: return F[3]
            if abs(x) <= 2 and y < tip - 60: return F[2] if abs(x) == 2 else F[3]   # the fuller
            return F[4]
        if part == 'grip':
            if edge: return S[0]
            return S[2] if (y + x) % 4 < 2 else S[1]
        if part in ('guard', 'boss', 'pommel'):
            if edge: return S[1] if x == x0 else R[0]
            if part == 'boss': return V[3] if u < 0.5 else V[2]
            if part == 'pommel' and abs(x) <= 1 and abs(y - top - 8) <= 1: return F[6] if x < 1 and y <= top + 8 else F[4]
            v = (y - (guard - 5)) / 10 if part == 'guard' else (y - top) / 17
            return S[4] if v < 0.2 else S[3] if v < 0.75 else S[2]
        if part == 'end':
            if edge: return V[1] if x == x0 else V[5]
            return V[4] if u < 0.4 else V[3]
        return S[3]

    def put(cx, y, part, x0, x1, side=False, mirror=False):
        for x in range(x0, x1 + 1):
            c = col(part, x, y, x0, x1, side)
            a[y, cx + (-x - 1 if mirror else x)] = c

    fc, sc, bc = COLS['FRONT'][2] // AP, COLS['SIDE'][2] // AP, COLS['BACK'][2] // AP
    for y in range(top, tip + 1):
        for x0, x1, part in spans(y):
            put(fc, y, part, x0, x1)
            put(bc, y, part, x0, x1, mirror=True)
        # the edge-on view: how thick each part is
        if top <= y <= top + 17: t = [2, 3, 4, 5, 6, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3, 3, 3][y - top]; part = 'pommel'
        elif y <= guard - 8: t = 3; part = 'grip'
        elif y <= guard + 7: t = 7 if abs(y - guard) <= 5 else 4; part = 'guard' if abs(y - guard) <= 5 else 'boss'
        else: t = max(1, round(4 - 2.6 * (y - guard) / (tip - guard))); part = 'blade'
        if y > tip - 3: t = 1
        put(sc, y, part, -t, t - 1, side=True)
    # verdigris tears running down from the guard onto the blade, and the six empty rune sockets (front and back)
    for cx, m in ((fc, 1), (bc, -1)):
        for dx, n in ((-11, 9), (-5, 5), (6, 7), (12, 4)):
            for k in range(n):
                xx = cx + m * dx - (1 if m < 0 else 0)
                a[guard + 8 + k, xx] = hexc(RAMPS['Verdigris bronze (fittings, tears under the guard)'][3 if k < n - 2 else 2])
        for y in slot_rows(guard, tip):
            for dy in range(-2, 3):
                for dx in range(-2, 2):
                    a[y + dy, cx + dx] = F[1] if max(abs(dy), abs(dx + 0.5)) > 1.5 else S[1]
    return a

def sheet_from_ap(a):
    """Art-pixel grid -> a full 1024 x 1536 sheet on magenta, as ChatGPT would hand it back."""
    img = Image.fromarray(a, 'RGBA').resize((W, H), Image.NEAREST)
    bg = Image.new('RGBA', (W, H), MAG); bg.alpha_composite(img)
    return bg

# ------------------------------------------------------------------ importer
def keyed(arr):
    """True where a sheet pixel is sword, False where it is magenta background or a leftover guide line."""
    r, g, b, al = (arr[..., i].astype(int) for i in range(4))
    bg = (al < 128) | ((r > 140) & (b > 140) & (g < 120) & (np.abs(r - b) < 100))
    for c in GUIDES[:3]:
        bg |= (np.abs(r - c[0]) + np.abs(g - c[1]) + np.abs(b - c[2])) < 40
    return ~bg

def main_shape(mask):
    """The biggest painted shape, plus any other piece at least 8% of its size (a detached pommel, a drip)."""
    lab, n = ndimage.label(mask)
    if not n: return None
    sizes = ndimage.sum(mask, lab, range(1, n + 1)); big = sizes.max()
    return np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= big * 0.08])

def fit(arr, keep, name, warn, cx=None):
    """Scale one view (uniformly) so its top sits on POMMEL and its bottom on TIP, centred on its blade axis.
    Returns sheet-resolution RGBA rows 0..H, as wide as the shape needs, the axis on the middle column boundary."""
    ys, xs = np.nonzero(keep); y0, y1 = ys.min(), ys.max()
    lower = keep[(y0 + y1) // 2:y1 + 1]                              # the blade half: its centre is the sword's axis
    axis = float(np.median([(np.nonzero(r)[0].min() + np.nonzero(r)[0].max() + 1) / 2 for r in lower if r.any()]))
    s = (TIP - POMMEL + 1) / (y1 - y0 + 1)
    if cx is not None and abs(s - 1) > 0.08: warn.append(f'{name}: drawn {y1 - y0 + 1} px tall, rescaled x{s:.2f} to fit pommel..point')
    if cx is not None and abs(axis - cx) > 12: warn.append(f'{name}: axis at x {axis:.0f}, moved to the centre line {cx}')
    half = int(np.ceil((max(axis - xs.min(), xs.max() + 1 - axis) * s + 8) / AP)) * AP
    out = np.zeros((H, 2 * half, 4), np.uint8)
    Y, X = np.mgrid[POMMEL:TIP + 1, 0:2 * half]
    sy = np.clip(np.floor(y0 + (Y - POMMEL + 0.5) / s).astype(int), 0, arr.shape[0] - 1)
    sx = np.clip(np.floor(axis + (X - half + 0.5) / s).astype(int), 0, arr.shape[1] - 1)
    px = arr[sy, sx].copy(); px[..., 3] = np.where(keep[sy, sx], 255, 0)
    out[POMMEL:TIP + 1] = px
    return out

def to_ap(full):
    """Sheet pixels -> art pixels: majority alpha per 4 x 4 block, colour from the block centre (or the block mean)."""
    h, w = full.shape[0] // AP, full.shape[1] // AP
    blk = full.reshape(h, AP, w, AP, 4).transpose(0, 2, 1, 3, 4).reshape(h, w, AP * AP, 4)
    op = blk[..., 3] > 127; cnt = op.sum(-1)
    centre = full[AP // 2::AP, AP // 2::AP]
    mean = (blk[..., :3].astype(float) * op[..., None]).sum(2) / np.maximum(cnt, 1)[..., None]
    rgb = np.where((centre[..., 3] > 127)[..., None], centre[..., :3], mean.astype(np.uint8))
    a = np.zeros((h, w, 4), np.uint8); a[..., :3] = rgb; a[..., 3] = np.where(cnt >= AP * AP // 2, 255, 0)
    # drop lone specks
    m = a[..., 3] > 0
    nb = ndimage.convolve(m.astype(int), np.ones((3, 3), int), mode='constant') - m
    a[m & (nb == 0), 3] = 0
    return a

def bleed(a, passes=6):
    """Copy edge colours into the clear texels around the shapes (alpha stays 0), so filtering never pulls in black."""
    rgb = a[..., :3].astype(float); m = a[..., 3] > 0; filled = m.copy()
    for _ in range(passes):
        acc = np.zeros_like(rgb); n = np.zeros(m.shape)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            sh = np.roll(filled, (dy, dx), (0, 1)); acc += np.roll(rgb, (dy, dx), (0, 1)) * sh[..., None]; n += sh
        new = ~filled & (n > 0)
        rgb[new] = acc[new] / n[new][:, None]; filled |= new
    out = a.copy(); out[..., :3] = rgb.astype(np.uint8); return out

def widths(front):
    """{row: (x0, x1)} of a FRONT view in art pixels from its axis (the middle column boundary)."""
    c, out = front.shape[1] // 2, {}
    for y in range(front.shape[0]):
        fx = np.nonzero(front[y, :, 3])[0]
        if len(fx): out[y] = (int(fx.min() - c), int(fx.max() + 1 - c))
    return out

def parts(ext, warn=None):
    """Find the top row, the crossguard (the widest row in the top 40%), where the blade starts, and the point."""
    if not ext: raise SystemExit('FRONT view is empty')
    width = {y: x1 - x0 for y, (x0, x1) in ext.items()}
    top, tip = min(width), max(width)
    upper = [y for y in width if y < top + (tip - top) * 0.4]
    gw = max(width[y] for y in upper); grows = [y for y in upper if width[y] >= gw - 1]
    guard = int(round(np.median(grows)))
    blade_top = next((y for y in range(max(grows) + 1, tip) if y in width and width[y] < gw * 0.6), max(grows) + 1)
    bw = width.get(blade_top, 0)
    if warn is not None and gw < bw * 1.5: warn.append(f'the crossguard ({gw} AP) is not much wider than the blade ({bw} AP): check the FRONT view')
    return top, guard, blade_top, tip, gw, bw

def synth_side(front):
    """An edge-on view for art that only has a FRONT: round grip and pommel (as deep as wide, up to 6 AP each side),
    a crossguard 12 AP deep, and a blade about a fifth as thick as it is wide, thinning to the point."""
    ext = widths(front); top, guard, blade_top, tip, *_ = parts(ext)
    side = np.zeros((front.shape[0], 16, 4), np.uint8); c = front.shape[1] // 2
    for y, (x0, x1) in ext.items():
        w = x1 - x0
        t = max(1, min(6, round(w / 2))) if y < blade_top else max(1, min(5, round(w * 0.11)))
        if y > tip - 3: t = 1
        side[y, 8 - t:8 + t, :3] = front[y, c - 1 if front[y, c - 1, 3] else (x0 + x1) // 2 + c, :3]
        side[y, 8 - t:8 + t, 3] = 255
    return side

def sockets_by_blobs(front, ext, lum, blade_top, tip):
    """Six separate dark shapes in the centre band (hexagons, slots, rings)."""
    c = front.shape[1] // 2; m = np.zeros(front.shape[:2], bool)
    for y in range(blade_top + 3, tip - 12):
        if y not in ext: continue
        band = max(2, round((ext[y][1] - ext[y][0]) * 0.14))
        m[y, c - band:c + band] = (front[y, c - band:c + band, 3] > 0) & (lum[y, c - band:c + band] < 46)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1)) if n else []
    blobs = sorted(((ndimage.center_of_mass(m, lab, i + 1)[0], sizes[i]) for i in range(n) if sizes[i] >= 4), key=lambda b: -b[1])
    if len(blobs) < 6 or blobs[5][1] < blobs[0][1] * 0.25: return None
    return sorted(y for y, _ in blobs[:6])

def sockets_by_rows(front, ext, lum, blade_top, tip):
    """Runs of rows where the centre band is near black (sockets joined by a dark fuller). Four or five (a gem
    between them, say): the rest go into the biggest gaps."""
    c = front.shape[1] // 2; runs, y0 = [], None
    for y in range(blade_top + 3, tip - 11):
        band = max(2, round((ext[y][1] - ext[y][0]) * 0.08)) if y in ext else 0
        d = y < tip - 12 and band and np.median(lum[y, c - band:c + band]) < 12 and front[y, c - band:c + band, 3].all()
        if d and y0 is None: y0 = y
        if not d and y0 is not None:
            if y - y0 >= 2: runs.append(((y0 + y - 1) / 2, y - y0))
            y0 = None
    if len(runs) > 6: runs = sorted(sorted(runs, key=lambda r: -r[1])[:6])
    ys = [y for y, _ in runs]
    if len(ys) < 4: return None
    while len(ys) < 6:
        i = int(np.argmax(np.diff(ys))); ys.insert(i + 1, (ys[i] + ys[i + 1]) / 2)
    return ys

def find_sockets(front, guard, blade_top, tip):
    """The six rune sockets painted down the blade's centre (rows), or None: the first method whose six are evenly
    spread (no gap more than twice another)."""
    ext = widths(front); lum = front[..., :3].astype(int) @ np.array([299, 587, 114]) / 1000
    for fn in (sockets_by_blobs, sockets_by_rows):
        ys = fn(front, ext, lum, blade_top, tip)
        if ys and min(np.diff(ys)) > 4 and max(np.diff(ys)) <= 2 * min(np.diff(ys)): return [round(float(y), 2) for y in ys]
    return None

def write_model(front, side, back, skin, warn, sockets=False, out=ASSETS):
    """Pack the three views into one atlas, measure the profile and write runeblade3d_<skin>.png/.json."""
    ext = widths(front); top, guard, blade_top, tip, gw, bw = parts(ext, warn)
    sides = {}
    for y in range(side.shape[0]):
        sx = np.nonzero(side[y, :, 3])[0]
        if len(sx): sides[y] = (sx.max() - sx.min() + 1) / 2
    known = sorted(sides); rows = []
    for y, (x0, x1) in sorted(ext.items()):
        t = sides[y] if y in sides else sides[min(known, key=lambda k: abs(k - y))] if known else 2
        rows.append([y, x0, x1, round(max(0.5, float(t)), 2)])
    found = find_sockets(front, guard, blade_top, tip) if sockets else None
    if sockets and not found: warn.append('could not find six sockets on the blade: runes go to the standard slots')
    slots = found or [round(guard + (tip - guard) * f, 2) for f in SLOTS]
    xs, cols = 0, {}
    for k, v in (('front', front), ('side', side), ('back', back)): cols[k] = xs + v.shape[1] // 2; xs += v.shape[1] + 2
    aw = 256 if xs <= 256 else 512
    atlas = np.zeros((512, aw, 4), np.uint8); x = 0
    for v in (front, side, back): atlas[:v.shape[0], x:x + v.shape[1]] = v; x += v.shape[1] + 2
    atlas = bleed(atlas)
    os.makedirs(out, exist_ok=True)
    Image.fromarray(atlas, 'RGBA').save(os.path.join(out, f'runeblade3d_{skin}.png'), optimize=True)
    info = {'_': 'generated by tools/runeblade3d.py; do not edit', 'skin': skin,
            'size': [aw, 512], 'ap': AP, 'cols': cols,
            'top': top, 'guard': guard, 'bladeTop': blade_top, 'tip': tip, 'slots': slots, 'rows': rows}
    with open(os.path.join(out, f'runeblade3d_{skin}.json'), 'w') as f:
        json.dump(info, f, separators=(',', ':'))
    for w_ in warn: print('  note:', w_)
    print(f'  {skin}: {len(rows)} rows, guard row {guard} ({gw} AP wide), blade from {blade_top} ({bw} AP), tip {tip}, '
          f'rune slots {"on the painted sockets" if found else "standard"}')
    return info

def load(path, warn):
    img = Image.open(path).convert('RGBA')
    if img.size != (W, H):
        if abs(img.size[0] / img.size[1] - W / H) > 0.03: raise SystemExit(f'{path} is {img.size}, expected {W} x {H} (portrait 2:3)')
        warn.append(f'resized from {img.size} to {W} x {H}'); img = img.resize((W, H), Image.NEAREST)
    return np.array(img)

def install(sheet_path, skin='custom', out=ASSETS):
    """A three-view sheet drawn on the template (FRONT, SIDE, BACK)."""
    warn = []; arr = load(sheet_path, warn); mask = keyed(arr); views = {}
    for name in COLS:
        rx0, rx1 = REGION[name]
        m = np.zeros_like(mask); m[60:, rx0:rx1] = mask[60:, rx0:rx1]
        keep = main_shape(m)
        if keep is None: raise SystemExit(f'{name}: nothing painted in x {rx0}..{rx1}')
        views[name] = to_ap(fit(arr, keep, name, warn, COLS[name][2]))
    return write_model(views['FRONT'], views['SIDE'], views['BACK'], skin, warn, out=out)

def install_concept(path, skin, out=ASSETS):
    """A single front view of the sword (one sword on magenta, point down): the back is the front mirrored, the
    thickness comes from synth_side, and the runes go into the six sockets painted on the blade."""
    warn = []; arr = load(path, warn); keep = main_shape(keyed(arr))
    if keep is None: raise SystemExit(f'{path}: nothing painted')
    front = to_ap(fit(arr, keep, 'FRONT', warn))
    return write_model(front, synth_side(front), front[:, ::-1].copy(), skin, warn, sockets=True, out=out)

# ------------------------------------------------------------------ kit
def palette_png():
    sw, rows = 56, list(RAMPS.items())
    img = Image.new('RGBA', (60 + 7 * (sw + 8) + 300, 30 + len(rows) * (sw + 34)), (24, 22, 30, 255)); d = ImageDraw.Draw(img)
    for i, (name, ramp) in enumerate(rows):
        y = 20 + i * (sw + 34); label(d, 20, y, name, 15)
        for j, c in enumerate(ramp):
            x = 20 + j * (sw + 8); d.rectangle((x, y + 22, x + sw, y + 22 + sw - 10), fill=hexc(c))
            label(d, x + sw // 2, y + 22 + sw - 6, c, 10, INK, 'ma')
    return img

def diagram(placeholder_sheet):
    """How the sheet becomes a model: the three views cut, and the six-sided slab one painted row turns into."""
    a = np.array(placeholder_sheet)
    img = Image.new('RGBA', (1400, 900), (24, 22, 30, 255)); d = ImageDraw.Draw(img)
    crop = Image.fromarray(a).crop((0, 80, W, 1536)).resize((512, 728), Image.NEAREST)
    img.alpha_composite(crop, (20, 140))
    label(d, 20, 16, 'How the game turns the sheet into a 3D sword', 24)
    label(d, 20, 52, 'FRONT outline = width of every row.  SIDE outline = thickness of every row.', 16, (200, 230, 255, 255))
    label(d, 20, 78, 'FRONT colours wrap the front half, BACK colours (un-mirrored) the back half.', 16, (200, 230, 255, 255))
    label(d, 20, 104, 'Each painted row becomes one slab with this cross-section:', 16, (200, 230, 255, 255))
    ox, oy, k = 960, 420, 9                 # the cross-section of one blade row, AP x k
    hw, t, bev = 18, 4, 10
    pts = [(-hw, 0), (-hw + bev, -t), (hw - bev, -t), (hw, 0), (hw - bev, t), (-hw + bev, t)]
    poly = [(ox + x * k, oy + z * k) for x, z in pts]
    d.polygon(poly, fill=(102, 168, 192, 255), outline=(230, 246, 250, 255))
    d.line((ox - hw * k - 30, oy, ox + hw * k + 30, oy), fill=YEL, width=1)
    label(d, ox, oy - t * k - 70, 'one blade row, seen from its end (looking down the blade)', 15, INK, 'ma')
    label(d, ox, oy - t * k - 44, 'front (towards you in FRONT)', 13, CY, 'ma')
    label(d, ox, oy + t * k + 18, 'back (BACK view)', 13, CY, 'ma')
    label(d, ox - hw * k, oy + 30, 'edge', 13, GRN, 'ma'); label(d, ox + hw * k, oy + 30, 'edge', 13, GRN, 'ma')
    label(d, ox - (hw - bev / 2) * k, oy - t * k - 22, 'bevel', 12, GRN, 'ma'); label(d, ox, oy - t * k - 22, 'flat', 12, GRN, 'ma')
    label(d, ox + (hw - bev / 2) * k, oy - t * k - 22, 'bevel', 12, GRN, 'ma')
    label(d, ox, oy + 120, 'width = FRONT row width          thickness = SIDE row width', 15, INK, 'ma')
    label(d, ox, oy + 150, 'bevels = 30% of the width each side (at most 2.5 x the half-thickness)', 14, (200, 230, 255, 255), 'ma')
    label(d, ox, oy + 200, 'So: the FRONT outline is the sword\'s real outline, the SIDE outline its real depth.', 14, INK, 'ma')
    label(d, ox, oy + 226, 'Paint the light as if the sword faces you; the game adds the turning light itself.', 14, INK, 'ma')
    label(d, ox, oy + 252, 'Anything clear (magenta) inside the outline becomes a real hole.', 14, INK, 'ma')
    return img

def write_kit():
    tpl = template()
    ph = sheet_from_ap(paint_placeholder())
    ex = guides(ph.copy(), full=False)
    d = ImageDraw.Draw(ex); label(d, 16, 12, 'LAYOUT EXAMPLE (the built-in placeholder sword). Copy the placement, not the look.', 17)
    files = {}
    def png(img):
        b = io.BytesIO(); img.save(b, 'PNG', optimize=True); return b.getvalue()
    for n in ('README.md', 'SPEC.md', 'STYLE.md', 'PROMPT.txt'):
        with open(os.path.join(KITDIR, n), 'rb') as f: files[n] = f.read()
    files['templates/runeblade3d_texture_template.png'] = png(tpl)
    files['examples/runeblade3d_layout_example.png'] = png(ex)
    files['examples/runeblade3d_placeholder_clean.png'] = png(ph)
    files['reference/runeblade3d_palette.png'] = png(palette_png())
    files['reference/runeblade3d_how_it_becomes_3d.png'] = png(diagram(ph))
    refdir = os.path.join(KITDIR, 'reference')
    for n in sorted(os.listdir(refdir)) if os.path.isdir(refdir) else []:
        if n.endswith('.png'):
            with open(os.path.join(refdir, n), 'rb') as f: files['reference/' + n] = f.read()
    os.makedirs(os.path.dirname(ZIP), exist_ok=True)
    with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, b in files.items(): z.writestr(f'{KIT}/{n}', b)
    print(f'  wrote {os.path.relpath(ZIP, ROOT)} ({os.path.getsize(ZIP) // 1024} KB, {len(files)} files)')
    return tpl, ex, ph

def build_skins():
    """Every skin in assets/source/runeblade3d/: <id>.png is a single front view (a concept), <id>_sheet.png a
    three-view sheet drawn on the template."""
    for n in sorted(os.listdir(SKINSRC)):
        if not n.endswith('.png'): continue
        if n.endswith('_sheet.png'): install(os.path.join(SKINSRC, n), n[:-10])
        else: install_concept(os.path.join(SKINSRC, n), n[:-4])

def main(argv):
    cmd = argv[0] if argv else 'all'
    if cmd == 'install':
        if len(argv) < 2: raise SystemExit('usage: python tools/runeblade3d.py install SHEET.png [SKIN_ID]')
        install(argv[1], argv[2] if len(argv) > 2 else 'custom')
    if cmd == 'concept':
        if len(argv) < 3: raise SystemExit('usage: python tools/runeblade3d.py concept FRONT.png SKIN_ID')
        install_concept(argv[1], argv[2])
    if cmd in ('skins', 'all'): build_skins()
    if cmd in ('placeholder', 'all'):
        out = os.path.join(KITDIR, 'out'); os.makedirs(out, exist_ok=True)
        p = os.path.join(out, 'runeblade3d_placeholder_sheet.png'); sheet_from_ap(paint_placeholder()).save(p)
        install(p, 'placeholder')
    if cmd == 'template':
        out = os.path.join(KITDIR, 'out'); os.makedirs(out, exist_ok=True)
        template().save(os.path.join(out, 'runeblade3d_texture_template.png'))
        ex = guides(sheet_from_ap(paint_placeholder()), full=False); ex.save(os.path.join(out, 'runeblade3d_layout_example.png'))
        print('  wrote', os.path.relpath(out, ROOT))
    if cmd in ('kit', 'all'): write_kit()

if __name__ == '__main__':
    main(sys.argv[1:])
