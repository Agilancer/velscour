#!/usr/bin/env python3
"""Tessariel's device is the SWORD OF LIGHT, not the letter T (docs/TESSARIELS_KEEP.md "The Sword of Light").

The user's art carried a gilt T: vesperwrithe's four tess_* banners, Bellmourn's six holy_* banners and the four
kite_t_* shield models. This tool takes the T out of each (the cloth or the shield's field is inpainted) and lays the
one emblem in its place, point up, in that piece's own thread or metal colours:

    python tools/tkeep_sword.py banners <Bellmourn> <vesperwrithe>   # -> assets/source/tkeep/sword/<id>.png (the ten
                                                                    #    banners; tools/tkeep3d.py decor/banners reads them)
    python tools/tkeep_sword.py shields                             # the four shields' baked sprites, on the pages in
                                                                    #    assets/source/tkeep/out/ (tkeep3d.py pack calls it)
    python tools/tkeep_sword.py sheet <out.png>                     # the emblem alone, large, for review

The emblem's proportions (EMBLEM below) are shared with the portal's blade (src/gfx/keepgate.js) and the altar's
(tools/tkeep3d.html `altar`). Needs pillow, numpy and opencv-python-headless.
"""
import json
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SWORD = os.path.join(ROOT, "assets", "source", "tkeep", "sword")
OUTSRC = os.path.join(ROOT, "assets", "source", "tkeep", "out")

# ------------------------------------------------------------------ the emblem
# The blade points DOWN (the user's call): the pommel on top, the point at the foot, as the T's bar and stem stood.
# Unit space: x from the middle, y from the point (0) to the pommel's end (1), turned over when drawn. A long tapering
# blade with a ridge, a guard of two wings swept towards the blade, a short grip, a diamond pommel; a glory of rays
# behind the blade under the guard.
EMBLEM = dict(
    blade_base=0.725, blade_w=0.056, blade_w_top=0.042, point=0.2,   # where the blade meets the guard; half-widths; length of the point
    guard_y=0.748, guard_span=0.205, guard_rise=0.068, guard_t=0.044,  # wings: half-span, how far the tips rise, thickness at the middle
    grip_w=0.017, grip_end=0.895, pommel_w=0.040,
    rays_y=0.52, rays=16,
)
SS = 4   # supersampling


def _poly(d, pts, tone, s, ox, oy):
    d.polygon([(ox + x * s, oy + (1 - y) * s) for x, y in pts], fill=int(tone))   # 1 - y: point down


def wing(side, E):
    """One wing of the guard as (upper facet, lower facet): a feathered crescent swept up to a point."""
    gy, sp, rise, t = E["guard_y"], E["guard_span"], E["guard_rise"], E["guard_t"]
    top, bot, mid = [], [], []
    for k in range(13):
        u = k / 12
        x = side * (0.012 + (sp - 0.012) * u)
        lift = rise * u ** 1.9                       # the sweep up
        th = t * (1 - u) ** 0.8 + 0.004 * (1 - u)
        yc = gy - lift
        top.append((x, yc - th * 0.55)); bot.append((x, yc + th * 0.45)); mid.append((x, yc - th * 0.05))
    tip = (side * (sp + 0.012), gy - rise - 0.012)
    return top + [tip] + mid[::-1], mid + [tip] + bot[::-1]


def emblem(height, E=EMBLEM, rays=True, gem=True, fx=0.0, fy=0.0, guard=True):
    """The emblem `height` px tall, as float layers on a canvas (w, h) with the blade's middle at cx:
    tone (0..255 facet tones), metal (mask of guard, grip, pommel), blade (mask), ridge, gem, rays; and (cx, top)."""
    s = height * SS
    pad = int(0.42 * s)
    W, H = int(2 * (E["guard_span"] + 0.03) * s) + 2 * pad, int(s) + 2 * pad
    W, H = W // (2 * SS) * 2 * SS, (H // SS + 1) * SS
    ox, oy = W / 2 + fx * SS, pad + fy * SS   # fx, fy: the part of a pixel the middle sits off the grid, so the emblem is centred exactly
    L = {k: Image.new("L", (W, H), 0) for k in ("tone", "metal", "blade", "ridge", "gem", "rays")}
    D = {k: ImageDraw.Draw(v) for k, v in L.items()}
    bb, bw, bt, pt = E["blade_base"], E["blade_w"], E["blade_w_top"], E["point"]

    def both(pts, tone, layer):
        _poly(D["tone"], pts, tone, s, ox, oy); _poly(D[layer], pts, 255, s, ox, oy)
    # rays: a glory behind the upper blade, long and short in turn
    if rays:
        n = E["rays"]
        for k in range(n):
            a = (k + 0.5) / n * math.tau
            if abs(math.sin(a)) < 0.2:   # none straight up or down (the blade is there)
                continue
            ln = (0.30 if k % 2 == 0 else 0.19) * (0.8 + 0.2 * abs(math.cos(a)))
            r0, w0 = 0.058, 0.0085
            c, sn = math.sin(a), math.cos(a)
            px, py = -sn, c
            p = [(c * r0 + px * w0, E["rays_y"] + sn * r0 + py * w0), (c * (r0 + ln), E["rays_y"] + sn * (r0 + ln)), (c * r0 - px * w0, E["rays_y"] + sn * r0 - py * w0)]
            _poly(D["rays"], p, 255, s, ox, oy)
    # blade: two facets either side of the ridge, lit from the left
    for side, tone in ((-1, 240), (1, 138)):
        both([(0, 0), (side * bt, pt), (side * bw, bb), (0, bb)], tone, "blade")
    D["ridge"].line([(ox, oy + (1 - 0.03) * s), (ox, oy + (1 - bb + 0.012) * s)], fill=255, width=max(1, int(0.0065 * s)))
    # guard: two wings, each an upper (lit) and a lower (shaded) facet
    for side in (-1, 1) if guard else ():
        up, lo = wing(side, E)
        both(up, 120 if side < 0 else 96, "metal"); both(lo, 222 if side < 0 else 198, "metal")   # turned over: `lo` is on top, and lit
    # the boss where blade and guard cross, the grip and the pommel
    gy = E["guard_y"]
    if guard:
        both([(-0.034, gy + 0.004), (0, gy - 0.034), (0, gy + 0.040)], 205, "metal"); both([(0.034, gy + 0.004), (0, gy - 0.034), (0, gy + 0.040)], 112, "metal")
    g0, g1, gw = E.get("grip_start", gy + 0.026), E["grip_end"], E["grip_w"]
    both([(-gw, g0), (0, g0), (0, g1), (-gw * 0.85, g1)], 176, "metal"); both([(gw, g0), (0, g0), (0, g1), (gw * 0.85, g1)], 98, "metal")
    for k in range(5):   # the wrap
        y = g0 + (g1 - g0) * (k + 0.5) / 5
        D["tone"].line([(ox - gw * s, oy + (1 - y + 0.006) * s), (ox + gw * s, oy + (1 - y - 0.006) * s)], fill=70, width=max(1, int(0.006 * s)))
    pw, pm = E["pommel_w"], (g1 + 1) / 2
    both([(0, g1 - 0.004), (-pw, pm), (0, pm)], 150, "metal"); both([(0, g1 - 0.004), (pw, pm), (0, pm)], 88, "metal")
    both([(0, 1), (-pw, pm), (0, pm)], 226, "metal"); both([(0, 1), (pw, pm), (0, pm)], 160, "metal")
    if gem:
        _poly(D["gem"], [(0, gy - 0.024), (0.015, gy - 0.003), (0, gy + 0.018), (-0.015, gy - 0.003)], 255, s, ox, oy)
    out = {}
    w, h = W // SS, H // SS
    for k, im in L.items():
        out[k] = np.asarray(im.resize((w, h), Image.BOX), dtype=np.float32) / 255
    return out, W / 2 / SS, pad / SS


def ramp(t, stops):
    """Map tones 0..1 through colour stops [(t, (r, g, b)), ...]."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    ts = [p for p, _ in stops]
    for c in range(3):
        out[..., c] = np.interp(t, ts, [col[c] for _, col in stops])
    return out


def grain(shape, seed, amt=0.07, stretch=(1.0, 1.0)):
    """Thread grain: fine noise, a little streaked."""
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, shape).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), sigmaX=0.6 * stretch[0], sigmaY=0.6 * stretch[1])
    n /= max(1e-6, n.std())
    return 1 + n * amt


def lay(img, cx, top, height, metal, light=None, glow=(255, 236, 170), glow_amt=0.55, rays_col=None, rays_amt=0.9, shadow=0.45,
        outline=None, gem=None, seed=7, grain_amt=0.07, E=EMBLEM, ray_light=False, clip=None, stitch=0.0, guard=True, ridge=0.95, glow_size=1.0, aura=0.0, rim_px=1.1, rim_amt=0.7):
    """Lay the emblem on an RGBA float image (h, w, 4; 0..255) with the top of its pommel at (cx, top).
    metal: (dark, mid, light, shine) colours of the hilt; light: the blade's (edge, body, core) or None for the metal's;
    glow/glow_amt: the light round the blade (screened on); rays_col: the glory's thread; clip: mask the emblem keeps to."""
    x0, y0 = int(math.floor(cx)), int(math.floor(top))
    L, ex, ey = emblem(height, E, rays=rays_col is not None, gem=gem is not None, fx=cx - x0, fy=top - y0, guard=guard)
    h, w = L["tone"].shape
    x0, y0 = x0 - int(round(ex)), y0 - int(round(ey))
    ex = cx - x0
    # crop to the image
    ax0, ay0, ax1, ay1 = max(0, x0), max(0, y0), min(img.shape[1], x0 + w), min(img.shape[0], y0 + h)
    sl = (slice(ay0 - y0, ay1 - y0), slice(ax0 - x0, ax1 - x0))
    L = {k: v[sl] for k, v in L.items()}
    dst = img[ay0:ay1, ax0:ax1]
    rgb, a = dst[..., :3], dst[..., 3:4] / 255
    keep = a[..., 0] if clip is None else a[..., 0] * clip[ay0:ay1, ax0:ax1]
    k = max(0.6, height / 340)   # the emblem's scale against the big banners'
    body = np.maximum(L["metal"], L["blade"])
    # the glory of rays (thread or light), behind everything
    if rays_col is not None:
        r = L["rays"] * (1 - body) * rays_amt
        if ray_light:
            rgb[:] = rgb + (255 - rgb) * (r * keep)[..., None] * (np.array(rays_col, np.float32) / 255)
        else:
            g = grain(r.shape, seed + 3, grain_amt * 1.4)
            edge = cv2.GaussianBlur(L["rays"], (0, 0), 0.8 * k)
            tone = np.clip(0.55 + 0.6 * (edge - 0.5), 0, 1)[..., None]
            col = np.array(rays_col, np.float32) * (0.72 + 0.4 * tone) * g[..., None]
            rgb[:] = rgb + (np.clip(col, 0, 255) - rgb) * (r * keep)[..., None]
    # the light round the blade
    if glow_amt > 0:
        gl = cv2.GaussianBlur(L["blade"], (0, 0), 9 * k * glow_size) * 1.5 + cv2.GaussianBlur(L["blade"], (0, 0), 22 * k * glow_size) * 1.3
        gl = np.clip(gl, 0, 1) * glow_amt * keep
        rgb[:] = rgb + (255 - rgb) * gl[..., None] * (np.array(glow, np.float32) / 255)
    # on a pale field light cannot be lighter than the cloth: a warm shade round the blade sets it off instead
    if aura > 0:
        au = np.clip(cv2.GaussianBlur(body, (0, 0), 5 * k) * 1.6, 0, 1) * (1 - body) * aura * keep
        rgb[:] = rgb * (1 - au[..., None] * (1 - np.array((0.78, 0.6, 0.34), np.float32)))
    # a soft shadow under the applique
    if shadow > 0:
        sh = cv2.GaussianBlur(body, (0, 0), 1.6 * k)
        sh = np.roll(np.roll(sh, int(round(2.2 * k)), 0), int(round(1.6 * k)), 1) * (1 - body) * shadow * keep
        rgb[:] = rgb * (1 - sh[..., None])
    # the hilt, in the piece's metal
    tone = L["tone"]
    g = grain(tone.shape, seed, grain_amt)
    if stitch > 0:   # satin stitch: fine slanted lines, mirrored either side of the ridge
        yy, xx = np.mgrid[0:tone.shape[0], 0:tone.shape[1]].astype(np.float32)
        g = g * (1 + stitch * np.sin((np.abs(xx + (ax0 - x0) - ex) * 0.9 + yy) * (math.tau / (4.6 * k))))
    m = ramp(tone * g, [(0.0, metal[0]), (0.42, metal[1]), (0.80, metal[2]), (1.0, metal[3])])
    # the blade: the piece's metal burning to light at the ridge
    if light is not None:
        ridge_amt = ridge
        ridge = cv2.GaussianBlur(L["ridge"], (0, 0), 1.1 * k)
        ridge = np.clip(ridge / max(1e-6, ridge.max()), 0, 1)
        core = np.clip(cv2.GaussianBlur(L["blade"], (0, 0), 2.2 * k) * 1.25 - 0.25, 0, 1)   # brighter away from the edges
        bl = ramp(tone * (0.5 + 0.5 * g), [(0.0, light[0]), (0.54, light[1]), (0.94, light[2]), (1.0, light[2])])
        bl = bl + (np.array(light[2], np.float32) - bl) * (core * 0.08)[..., None]
        bl = bl + (255 - bl) * (ridge * ridge_amt)[..., None]
        m = m + (bl - m) * L["blade"][..., None]
    # a stitched edge: darker at the rim
    ol = metal[0] if outline is None else outline
    er = cv2.erode(body, np.ones((3, 3), np.uint8), iterations=max(1, int(round(rim_px * k))))
    rim = np.clip(body - er, 0, 1) * rim_amt
    m = m + (np.array(ol, np.float32) - m) * rim[..., None]
    if gem is not None:
        gm = L["gem"]
        gg = ramp(np.clip(tone * 0 + 0.5 + 0.5 * (cv2.GaussianBlur(gm, (0, 0), 1.2 * k) - 0.6), 0, 1), [(0, gem[0]), (0.6, gem[1]), (1, gem[2])])
        m = m + (gg - m) * gm[..., None]
    al = body * keep
    rgb[:] = rgb + (np.clip(m, 0, 255) - rgb) * al[..., None]
    return img


# ------------------------------------------------------------------ taking the T out
def inpaint(img, mask, sample=None, radius=6, avoid=None):
    """Fill `mask` (bool, h x w) of an RGBA float image from its surroundings; `sample` (x0, y0, x1, y1): a clean patch
    of the same cloth whose weave (its fine detail) is laid back over the fill."""
    rgb = np.clip(img[..., :3], 0, 255).astype(np.uint8)
    m8 = (mask if avoid is None else mask | (avoid & grow(mask, 14))).astype(np.uint8) * 255   # avoid: thread nearby that must not bleed in
    fill = cv2.inpaint(rgb, m8, radius, cv2.INPAINT_TELEA).astype(np.float32)
    fill = fill + (cv2.GaussianBlur(fill, (0, 0), 2.5) - fill) * 0.8   # smooth what Telea streaks
    if sample is not None:
        x0, y0, x1, y1 = sample
        pat = img[y0:y1, x0:x1, :3]
        hi = pat - cv2.GaussianBlur(pat, (0, 0), 3)
        # tile it, mirrored, so the seams don't show
        t = np.concatenate([hi, hi[:, ::-1]], 1); t = np.concatenate([t, t[::-1]], 0)
        reps = (img.shape[0] // t.shape[0] + 1, img.shape[1] // t.shape[1] + 1, 1)
        fill = fill + np.tile(t, reps)[:img.shape[0], :img.shape[1]]
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.2)[..., None]
    soft = np.maximum(soft, mask[..., None].astype(np.float32))
    img[..., :3] = img[..., :3] + (fill - img[..., :3]) * soft
    return img


def exemplar(img, mask, patch=4, search=None, known=None):
    """Exemplar inpainting (Criminisi's order, masked SSD search) for small painted pieces: fills `mask` with patches
    copied from the rest of the image (or `search`, a box x0, y0, x1, y1), so brushwork carries on through the hole."""
    rgb = img[..., :3].copy()
    h, w = mask.shape
    todo = mask.copy()
    ok = (img[..., 3] > 200) & ~mask if known is None else known & ~mask
    conf = ok.astype(np.float32)
    sx0, sy0, sx1, sy1 = search or (0, 0, w, h)
    P = patch
    n = 0
    while todo.any() and n < 4000:
        n += 1
        edge = todo & (cv2.erode(todo.astype(np.uint8), np.ones((3, 3), np.uint8)) == 0)
        ys, xs = np.nonzero(edge)
        if not len(ys):
            break
        cs = cv2.boxFilter(conf, -1, (2 * P + 1, 2 * P + 1))
        gray = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
        gx, gy = cv2.Sobel(gray, cv2.CV_32F, 1, 0), cv2.Sobel(gray, cv2.CV_32F, 0, 1)
        gm = cv2.dilate(np.hypot(gx, gy) * (~todo), np.ones((5, 5), np.uint8))
        pr = cs[ys, xs] * (gm[ys, xs] + 8)
        i = int(np.argmax(pr))
        y, x = int(ys[i]), int(xs[i])
        y0, y1, x0, x1 = max(0, y - P), min(h, y + P + 1), max(0, x - P), min(w, x + P + 1)
        tpl = np.clip(rgb[y0:y1, x0:x1], 0, 255).astype(np.float32)
        tm = (~todo[y0:y1, x0:x1]) & (img[y0:y1, x0:x1, 3] > 200)
        if tm.sum() < 3:
            todo[y, x] = False
            continue
        area = rgb[sy0:sy1, sx0:sx1].astype(np.float32)
        res = cv2.matchTemplate(area, tpl, cv2.TM_SQDIFF, mask=np.repeat(tm[..., None], 3, 2).astype(np.float32))
        # only sources wholly known
        bad = cv2.boxFilter((~ok[sy0:sy1, sx0:sx1]).astype(np.float32), -1, (x1 - x0, y1 - y0), normalize=False, anchor=(0, 0))[:res.shape[0], :res.shape[1]]
        res = np.where(bad > 0, np.inf, res)
        if not np.isfinite(res).any():
            todo[y, x] = False
            continue
        j = np.unravel_index(np.argmin(res), res.shape)
        src = rgb[sy0 + j[0]:sy0 + j[0] + (y1 - y0), sx0 + j[1]:sx0 + j[1] + (x1 - x0)]
        hole = todo[y0:y1, x0:x1]
        rgb[y0:y1, x0:x1][hole] = src[hole]
        conf[y0:y1, x0:x1][hole] = cs[y, x]
        todo[y0:y1, x0:x1] = False
    img[..., :3] = rgb
    return img


def axis(img, box, around, span=5.0):
    """The x about which the picture inside box (x0, y0, x1, y1) mirrors best: the T's own middle, to a tenth of a pixel."""
    x0, y0, x1, y1 = box
    g = cv2.cvtColor(np.clip(img[..., :3], 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    half = int(min(around - x0, x1 - around)) - int(span) - 1
    ys = np.arange(y0, y1, dtype=np.float32)
    best = (1e18, around)
    for c in np.arange(around - span, around + span + 0.01, 0.1):
        d = np.arange(0.5, half, 1, dtype=np.float32)
        mx, my = np.meshgrid(d, ys)
        a = cv2.remap(g, (c + mx).astype(np.float32), my, cv2.INTER_LINEAR)
        b = cv2.remap(g, (c - mx).astype(np.float32), my, cv2.INTER_LINEAR)
        e = float(((a - b) ** 2).mean())
        if e < best[0]:
            best = (e, float(c))
    return best[1]


def poly_mask(shape, pts):
    im = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon(pts, fill=255)
    return np.asarray(im) > 0


def unlike(img, cloth, tol):
    """Pixels whose colour is further than tol from every colour in `cloth` [(r, g, b), ...]."""
    d = np.min([np.abs(img[..., :3] - np.array(c, np.float32)).max(-1) for c in cloth], 0)
    return d > tol


def grow(mask, n):
    return cv2.dilate(mask.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * n + 1, 2 * n + 1))) > 0


def load(path):
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32).copy()


def save(img, path):
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGBA").save(path, optimize=True)


def palette(img, mask, qs=(4, 38, 78, 97)):
    """The metal's (dark, mid, light, shine) from the pixels of the T being replaced."""
    px = img[mask][:, :3]
    lum = px @ np.array([0.3, 0.59, 0.11], np.float32)
    out = []
    for q in qs:
        lo, hi = np.percentile(lum, max(0, q - 4)), np.percentile(lum, min(100, q + 4))
        sel = px[(lum >= lo) & (lum <= hi)]
        out.append(tuple(float(v) for v in sel.mean(0)))
    return out


def lighten(c, f, to=(255, 250, 232)):
    return tuple(c[i] + (to[i] - c[i]) * f for i in range(3))


# ------------------------------------------------------------------ the banners
# poly: round the T (source pixels); warm: how much redder than blue a pixel must be to count as the T's thread;
# sample: clean cloth for the weave; cx/top/height: the emblem; rays: a glory of thread rays.
T_A = [(108, 268), (366, 268), (368, 292), (352, 302), (335, 337), (280, 347), (280, 478), (298, 500), (298, 522), (237, 566), (176, 522), (176, 500), (194, 478), (194, 347), (139, 337), (122, 302), (106, 292)]
T_B = [(98, 208), (386, 208), (386, 306), (292, 322), (292, 520), (298, 556), (244, 644), (190, 556), (196, 520), (196, 322), (98, 306)]
E_RING = dict(EMBLEM, blade_w=0.064, blade_w_top=0.048, guard_span=0.225, guard_t=0.052, guard_rise=0.07, grip_w=0.021, pommel_w=0.048)   # a broader sword, to fill the halo
TESS = {
    "tess_a": dict(file="tess_a_0.webp", poly=T_A, warm=0, sample=(152, 346, 194, 420), cx=237, top=244, height=314, rays=False, glow=0.5, E=E_RING, ring=(237, 357), star=(222, 228, 252, 284)),
    "tess_a1": dict(file="tess_a_1.webp", poly=T_A, warm=44, sample=(153, 346, 195, 420), cx=238, top=244, height=314, rays=False, glow=0.35, dx=1, E=E_RING, ring=(238, 357), star=(222, 228, 252, 284)),
    "tess_b": dict(file="tess_b_0.webp", poly=T_B, warm=0, sample=(110, 340, 190, 520), cx=241, top=150, height=520, rays=True, glow=0.5, dx=-1),
    "tess_b1": dict(file="tess_b_1.webp", poly=T_B, warm=44, sample=(110, 340, 190, 520), cx=242, top=150, height=520, rays=True, glow=0.35),
}
GEM = [(18, 52, 130), (96, 168, 255), (236, 246, 255)]


def close_ring(img, thread, c0, metal):
    """tess_a's halo was broken where the T's arms crossed it: fit the ring to its own thread and stitch the gaps shut."""
    yy, xx = np.nonzero(thread)
    r = np.hypot(xx - c0[0], yy - c0[1])
    sel = (r > 108) & (r < 142)
    xs, ys = xx[sel].astype(np.float64), yy[sel].astype(np.float64)
    A = np.c_[2 * xs, 2 * ys, np.ones(len(xs))]
    cx, cy, c = np.linalg.lstsq(A, xs ** 2 + ys ** 2, rcond=None)[0]
    R = math.sqrt(c + cx * cx + cy * cy)
    rr = np.hypot(xs - cx, ys - cy)
    ring = np.abs(rr - R) < 6
    R = float(np.median(rr[ring]))
    wid = max(3.0, float(np.percentile(rr[ring], 92) - np.percentile(rr[ring], 8)) * 0.72)
    # which angles have thread; fill the two gaps the arms left (upper left and upper right), not the top or the foot
    ang = np.degrees(np.arctan2(ys - cy, xs - cx))
    have = np.zeros(360, bool); have[np.round(ang).astype(int) % 360] = True
    h, w = img.shape[:2]
    L = Image.new("L", (w * SS, h * SS), 0)
    d = ImageDraw.Draw(L)
    box = [(cx - R) * SS, (cy - R) * SS, (cx + R) * SS, (cy + R) * SS]
    for lo, hi in ((185, 250), (290, 355)):
        gap = [a for a in range(lo, hi) if not have[a % 360]]
        if gap:
            d.arc(box, min(gap) - 3, max(gap) + 3, fill=255, width=int(round(wid * SS)))
    m = np.asarray(L.resize((w, h), Image.BOX), dtype=np.float32) / 255
    # lit like the ring's own thread: lighter on its upper left edge
    sh = cv2.GaussianBlur(m, (0, 0), 1.0)
    gy, gx = np.gradient(sh)
    tone = np.clip(0.55 - (gx + gy) * 1.6, 0, 1) * grain(m.shape, 5, 0.06)
    col = ramp(tone, [(0, metal[0]), (0.45, metal[1]), (0.8, metal[2]), (1, metal[3])])
    shd = np.roll(np.roll(cv2.GaussianBlur(m, (0, 0), 1.4), 2, 0), 1, 1) * (1 - m) * 0.4
    img[..., :3] *= (1 - shd[..., None])
    img[..., :3] += (col - img[..., :3]) * m[..., None]


def tess_banner(bid, vw):
    B = TESS[bid]
    img = load(os.path.join(vw, "assets/game/glass", B["file"]))
    dx = B.get("dx", 0)
    poly = [(x + dx, y) for x, y in B["poly"]]
    region = poly_mask(img.shape, poly)
    warm = (img[..., 0] - img[..., 2]) > B["warm"]
    t = region & warm & (img[..., 3] > 128)
    metal = palette(img, cv2.erode(t.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0)
    ys, xs = np.nonzero(t)
    cx = axis(img, (int(xs.min()) - 4, int(ys.min()), int(xs.max()) + 5, int(ys.max())), (xs.min() + xs.max() + 1) / 2, 4)   # the T's own middle
    print("  %s: centre %.1f (the T spans %d..%d)" % (bid, cx, xs.min(), xs.max()))
    hole = grow(t, 5) & grow(region, 3)
    inpaint(img, hole, B["sample"], radius=7, avoid=grow(warm, 2))
    ivory = B["warm"] > 0
    light = [lighten(metal[1], 0.1), lighten(metal[2], 0.22), (255, 249, 222)] if not ivory else [metal[1], metal[2], (255, 251, 232)]
    if B.get("star"):   # tess_a: the star's lower ray is cut short, so the pommel stands clear of it
        x0, y0, x1, y1 = B["star"]
        cut = np.zeros(img.shape[:2], bool); cut[y0:y1, x0 + dx:x1 + dx] = True
        inpaint(img, grow(cut & warm, 3), B["sample"], radius=5, avoid=grow(warm, 2))
    if B.get("ring"):
        close_ring(img, warm & ~region, (cx, B["ring"][1]), metal)
    lay(img, cx, B["top"], B["height"], metal, light, glow=(255, 240, 190) if not ivory else (255, 252, 236), glow_amt=0 if ivory else B["glow"],
        rays_col=(lighten(metal[2], 0.1) if not ivory else metal[1]) if B["rays"] else None, gem=GEM, shadow=0.5 if not ivory else 0.5, seed=sum(map(ord, bid)) % 97, stitch=0.11,
        grain_amt=0.09, E=B.get("E", EMBLEM), glow_size=0.55, aura=0.5 if ivory else 0, rim_px=1.7 if ivory else 1.2, rim_amt=0.85 if ivory else 0.7, outline=metal[0] if not ivory else tuple(v * 0.8 for v in metal[0]))
    return img


# Bellmourn's six holy banners are small paintings (about 145 x 256) whose T is painted into the picture, and the
# shields' is relief on a model. There the whole T goes: its boxes (bar with its serifs, stem, foot) are filled with the
# piece's own brushwork (exemplar) or its plain field (telea), and the same emblem is laid where it stood, its guard
# over the bar and as wide, in the T's own metal. guard: the bar's middle row; span: the bar's half-width; top/tip:
# the sword's ends; blade: its half-width at the guard.
HOLY = {
    "holy_azure_sunburst": dict(pool=0.5, cx=71, guard=74, span=34, top=36, tip=168, blade=6.6, boxes=[(35, 63, 107, 85), (35, 80, 50, 92), (92, 80, 107, 92), (61, 80, 81, 128), (52, 122, 90, 138)]),
    "holy_winged_star": dict(cx=75.5, guard=75, span=31, top=38, tip=170, blade=6.8, boxes=[(43, 59, 109, 84), (43, 80, 58, 91), (94, 80, 109, 91), (66, 80, 85, 132), (57, 126, 94, 141)]),
    "holy_harvest": dict(cx=74, guard=81, span=33, top=44, tip=174, blade=6.6, boxes=[(40, 72, 108, 90), (40, 86, 56, 98), (92, 86, 108, 98), (65, 86, 83, 133), (58, 128, 90, 141)]),
    "holy_lilies": dict(pool=0, cx=70.5, guard=89, span=37, top=50, tip=188, blade=6.4, boxes=[(30, 82, 112, 97), (62, 70, 79, 152), (54, 147, 87, 163)]),
    "holy_open_hands": dict(pool=0.5, cx=66, guard=88, span=34, top=50, tip=176, blade=6.0, boxes=[(30, 81, 102, 95), (30, 90, 46, 103), (86, 90, 102, 103), (58, 90, 74, 158), (48, 153, 84, 170)]),
    "holy_verdant_cross": dict(pool=0, cx=71.5, guard=85, span=32, top=50, tip=178, blade=6.0, boxes=[(37, 78, 107, 92), (37, 88, 53, 106), (91, 88, 107, 106), (63, 88, 80, 152), (58, 146, 86, 172)]),
}


def t_sword(img, B, seed=1, fill="exemplar", px=1.0):
    """Take a painted T out and lay the emblem where it stood (see HOLY); px: the working scale. Returns the middle found."""
    boxes = B["boxes"]
    bx0, by0, bx1, by1 = boxes[0]
    sx0, sy0, sx1, sy1 = boxes[-2]
    cx = axis(img, (bx0 - int(2 * px), by0, bx1 + int(2 * px), by1 + int(26 * px)), B["cx"], 3 * px)   # the T's own middle: its bar and upper stem
    core = np.zeros(img.shape[:2], bool)
    m = (sx1 - sx0) // 4
    core[by1 + m:by1 + 5 * m, sx0 + m:sx1 - m] = True
    metal = palette(img, core, qs=(6, 40, 80, 97))
    mask = np.zeros(img.shape[:2], bool)
    for x0, y0, x1, y1 in boxes:
        mask[y0:y1, x0:x1] = True
    mask &= img[..., 3] > 0
    pale = False
    if fill == "exemplar":
        # the picture behind the T, carried through the hole: colours flowed in from its edge (Navier-Stokes keeps the
        # rays' and stripes' lines going), then the banner's own grain laid back over it
        foot = np.zeros_like(mask)   # the foot stood on patterned cloth: that hole takes the cloth's own brushwork, patch by patch
        x0, y0, x1, y1 = boxes[-1]
        foot[y0:y1, x0:x1] = True
        foot &= mask
        foot[:, int(B["cx"] - B["blade"] * 0.6):int(B["cx"] + B["blade"] * 0.6) + 1] = False   # (under the blade nothing shows)
        keep = img.copy()
        exemplar(img, foot, patch=3, search=(max(0, x0 - 26), max(0, y0 - 30), min(img.shape[1], x1 + 26), min(img.shape[0], y1 + 30)), known=(img[..., 3] > 200) & ~mask)
        mask = mask & ~foot
        rgb = np.clip(img[..., :3], 0, 255).astype(np.uint8)
        hole = grow(mask, 1) & (img[..., 3] > 0) & ~foot
        flow = cv2.inpaint(rgb, hole.astype(np.uint8) * 255, 3, cv2.INPAINT_NS).astype(np.float32)
        hi = img[..., :3] - cv2.GaussianBlur(img[..., :3], (0, 0), 1.5)
        rng = np.random.default_rng(seed)
        ys, xs = np.nonzero(hole)
        for _ in range(3):   # grain: fine detail borrowed from just outside the hole, a few pixels away at random
            oy, ox = rng.integers(-9, 10, len(ys)), rng.integers(-9, 10, len(ys))
            yy, xx = np.clip(ys + oy, 0, img.shape[0] - 1), np.clip(xs + ox, 0, img.shape[1] - 1)
            ok = ~hole[yy, xx] & (img[yy, xx, 3] > 200)
            flow[ys[ok], xs[ok]] += hi[yy[ok], xx[ok]] * 0.28
        soft = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 0.6)[..., None]
        img[..., :3] += (flow - img[..., :3]) * np.maximum(soft, hole[..., None])
        ring = grow(mask, int(6 * px)) & ~mask & (img[..., 3] > 200)
    else:   # a plain field: fill only from what is the field's colour, never the metal or an ornament beside the hole
        x0, y0, x1, y1 = B["field"]
        f = np.median(img[y0:y1, x0:x1, :3].reshape(-1, 3), 0)
        inpaint(img, mask, radius=int(5 * px), avoid=grow(np.abs(img[..., :3] - f).max(-1) > B.get("tol", 34), int(3 * px)))
        ring = np.zeros_like(mask); ring[y0:y1, x0:x1] = True
    pale = float((img[ring][:, :3] @ np.array([0.3, 0.59, 0.11], np.float32)).mean()) > 150
    top, tip = B["top"], B["tip"]
    H = tip - top
    gy = 1 - (B["guard"] - top) / H
    q = px / H   # a source pixel in the emblem's units
    E = dict(EMBLEM, guard_y=gy, blade_base=gy - 2.5 * q, grip_start=gy + 2.5 * q, grip_end=1 - B.get("pommel", 12) * q, blade_w=B["blade"] * q, blade_w_top=B["blade"] * 0.72 * q,
             point=B.get("point", 0.3), rays_y=gy - 3 * q, guard_span=B["span"] * q, guard_t=B.get("thick", 10) * q, guard_rise=B.get("rise", 8) * q, grip_w=B.get("grip", 3.2) * q, pommel_w=B.get("pommel", 12) * 0.56 * q)
    light = [metal[1], lighten(metal[2], 0.1), lighten(metal[3], 0.62)]
    dark = tuple(v * 0.42 for v in metal[0])
    glory = fill == "exemplar"   # the banners: a glory of rays from the cross, where the T's arms were
    if glory:   # ... in a pool of the sword's own light
        yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(np.float32)
        sp = B["span"] * px
        pool = np.exp(-(((xx - cx) / (sp * 0.95)) ** 2 + ((yy - B["guard"] - 4 * px) / (sp * 0.62)) ** 2)) * (img[..., 3] / 255) * (0.3 if pale else 0.42) * B.get("pool", 1)
        tint = np.array((255, 226, 150) if pale else (255, 244, 205), np.float32)
        img[..., :3] += (tint - img[..., :3]) * pool[..., None]
    lay(img, cx, top, H, metal, light, glow=(255, 240, 190), glow_amt=0.0 if pale else B.get("glow", 0.42), glow_size=0.5, aura=0.55 if pale else 0.25, shadow=0.6,
        outline=dark if not pale else tuple(v * 0.7 for v in dark), seed=seed, grain_amt=0.1, E=E, ridge=0.8, gem=GEM, rim_px=1.25, rim_amt=0.92 if not pale else 1.0, rays_col=lighten(metal[2], 0.25) if glory else None, rays_amt=0.95)
    return cx


def holy_banner(bid, bm):
    img = load(os.path.join(bm, "assets/textures/banners", bid + ".png"))
    print("  %s: centre %.1f" % (bid, t_sword(img, HOLY[bid], seed=sum(map(ord, bid)) % 97)))
    return img


# ------------------------------------------------------------------ the shields
# vesperwrithe's four kite_t_* shields carry the T as relief on the model, so it is their baked sprites that change
# (54 x 120 or so, worked at 4x): the T and the small ornament over it go, the emblem stands in the field. Sprite pixels.
SHIELD = dict(cx=27, guard=40, span=15.5, top=25, tip=82, blade=4.3, thick=5.5, rise=4.5, grip=1.9, pommel=6, glow=0.4, point=0.2,
              boxes=[(7, 32, 47, 48), (19, 24, 35, 35), (22, 43, 32, 80), (16, 70, 38, 85)], field=(12, 50, 20, 66))
SHIELDS = {   # the blue one has a star over the T (it goes, for a longer hilt); the others a fleur-de-lis (it stays) over a small diamond (it goes)
    "trophy_shield_t_blue": dict(top=19.5, boxes=[(7, 32, 47, 48), (15, 17, 39, 35), (22, 43, 32, 80), (16, 70, 38, 85)]),
    "trophy_shield_t_white": dict(tol=60), "trophy_shield_t_red": {}, "trophy_shield_t_black": {},
}
UP = 4


def shield_sprite(im, seed=1, over=None):
    """One baked T shield (PIL RGBA) with the sword on it; its outline (alpha) untouched."""
    big = im.resize((im.width * UP, im.height * UP), Image.LANCZOS)
    img = np.asarray(big, dtype=np.float32).copy()
    B = dict(SHIELD, **(over or {}))
    for k in ("cx", "guard", "top", "tip"):   # places in sprite pixels -> the working size (sizes go by px)
        B[k] *= UP
    B["boxes"] = [tuple(v * UP for v in b) for b in B["boxes"]]
    B["field"] = tuple(v * UP for v in B["field"])
    t_sword(img, B, seed=seed, fill="telea", px=UP)
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGBA").resize(im.size, Image.BOX)
    out.putalpha(im.getchannel("A"))
    return out


def shields(src=OUTSRC):
    """The fresh bake's pages (assets/source/tkeep/out/): the four shields' sprites, once (index.json remembers)."""
    idx = json.load(open(os.path.join(src, "index.json")))
    if idx.get("sword"):
        print("shields: already carry the sword")
        return
    pages = {}
    for k, name in enumerate(SHIELDS):
        f = idx["sprites"][name]["f"][0]
        pg = pages.setdefault(f[0], Image.open(os.path.join(src, idx["pages"][f[0]] + ".png")).convert("RGBA"))
        box = (f[1], f[2], f[1] + f[3], f[2] + f[4])
        pg.paste(shield_sprite(pg.crop(box), seed=k + 3, over=SHIELDS[name]), box[:2])
    for k, pg in pages.items():
        pg.save(os.path.join(src, idx["pages"][k] + ".png"))
    idx["sword"] = True
    json.dump(idx, open(os.path.join(src, "index.json"), "w"), separators=(",", ":"))
    print("shields: the sword on", len(SHIELDS))


def banners(bm, vw):
    os.makedirs(SWORD, exist_ok=True)
    for bid in HOLY:
        save(holy_banner(bid, bm), os.path.join(SWORD, bid + ".png"))
        print("banner", bid)
    for bid in TESS:
        save(tess_banner(bid, vw), os.path.join(SWORD, bid + ".png"))
        print("banner", bid)


def main(a):
    if a and a[0] == "banners" and len(a) > 2:
        banners(a[1], a[2])
    elif a and a[0] == "shields":
        shields()
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
