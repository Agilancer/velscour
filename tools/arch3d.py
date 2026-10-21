#!/usr/bin/env python3
"""
Arches as 3D models, baked to the same sprites the game already draws (docs/ARCH_3D.md).

    python tools/arch3d.py extract <pack> [design ...]    # elevations + height maps from a biome pack zip
    node tools/arch3d_bake.js <pack> [design ...]          # three.js: model -> four iso renders + slice tags
    python tools/process_assets.py biomes <pack>           # biomepack.py slices the renders instead of ray casting

extract: a pack arch is one flat elevation extruded 0.2 tile and reprojected four ways, so the front art is recovered
exactly from the SE view and the reverse art from the NW view (un-sheared at 80 px per tile along, 1 px per px up).
The extrusion's side faces smear up and sideways in each view; pixels that look like that smear in both views are
dropped, which leaves the true silhouette.

The depth (half-thickness either side of the wall line, per pixel, front and back) comes from parts.json next to the
outputs when there is one: the arch described as architecture, in elevation pixels, applied in order (mirror copies
each part about the centre):
  fill    a region at a fixed depth (`half`, or `add` to what is there); a polygon may get a raised `rim` (copings)
  add     round shafts (`shafts`: [x0, x1] ranges) bulging out of what is there: clustered columns
  portal  depth from the distance to the opening (`from` < d <= `width`), in steps from `in` to `out` (archivolts and
          jambs splaying in toward the opening) or one `half` (a ring of voussoirs)
  square  square in plan (depth = half the row's width once small knobs are opened off), so towers stay square and
          spires taper to pyramids; what the opening removed becomes knobs
  knobs   crockets and leaves: no deeper than they are wide
  thin    flat ornaments that must stay thin: finial crosses
Every part adds the painted shading as relief (`amp` px per unit of high-passed luminance), so mouldings, flutes and
carving stand off the faces. Without parts.json a generic relief is used (rounded edges + shading).
Writes assets/source/arches3d/<pack>/<design>/: front.png, back.png (RGBA elevations), depth.png (R front, G back,
DEPTH_STEP px per unit) and meta.json.
"""
import io
import json
import os
import re
import sys
import zipfile

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "biomes")
OUT = os.path.join(ROOT, "assets", "source", "arches3d")
HALF = 8.0      # half the wall thickness (0.2 tile = 16 native px), the depth of a plain face
EDGE_R = 7.0    # radius of the rounded silhouette edge (native px)
RELIEF = 7.0    # px of relief per unit of high-passed luminance (0..1)
RELIEF_SIGMA = 6.0
DEPTH_STEP = 0.25
MASS, MASS_SIGMA = 3.0, 6.0   # extra depth for solid masses (px), and the blur that finds them


def pack_files(pack):
    files = {}
    for fn in sorted(os.listdir(SRC)):
        m = re.match(r"(.+)_Biome_Pack(-\d+)?\.zip$", fn)
        if m and m.group(1).lower() == pack:
            z = zipfile.ZipFile(os.path.join(SRC, fn))
            for n in z.namelist():
                files.setdefault(n, z)
    root = next(n for n in files if n.endswith("manifest.json")).rsplit("manifest.json", 1)[0]
    read = lambda f: files[root + f].read(root + f)
    return json.loads(read("manifest.json")), lambda f: np.array(Image.open(io.BytesIO(read(f))).convert("RGBA"))


def smear(a):
    """Pixels of the extrusion's side faces: runs repeating along the (2, -1) projection of the across axis."""
    c = a.astype(np.int32)
    m = a[..., 3] > 0
    def same(dr, dc):
        sh = np.roll(np.roll(c, dr, 0), dc, 1)
        return (np.abs(c[..., :3] - sh[..., :3]).sum(-1) <= 12) & (sh[..., 3] > 0)
    s = nd.binary_opening((same(1, -2) | same(-1, 2)) & m, np.ones((3, 3)))
    return nd.binary_dilation(s, np.ones((3, 3))) & m


def elevations(views, pivot, span, height):
    """SE and NW views -> (front, back) elevations, W = 80 * span, s left to right as seen from the front."""
    px, py = pivot
    W, H = 80 * span, height + 48
    s = np.arange(W) + 0.5 - W / 2
    z = H - np.arange(H) - 0.5
    S, Z = np.meshgrid(s, z)
    def look(img, x, y):
        xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
        ok = (xi >= 0) & (xi < img.shape[1]) & (yi >= 0) & (yi < img.shape[0])
        out = np.zeros(S.shape + (4,), np.uint8)
        out[ok] = img[yi[ok], xi[ok]]
        return out
    se, nw = views["SE"].copy(), views["NW"].copy()
    se[..., 3] = np.where(smear(se), 1, se[..., 3])
    nw[..., 3] = np.where(smear(nw), 1, nw[..., 3])
    # SE: the near face is local p = +0.1; NW: p = -0.1, with the along axis reversed on screen
    F = look(se, px + S - 8, py + S / 2 + 4 - Z)
    B = look(nw, px - S - 8, py - S / 2 + 4 - Z)
    m = (F[..., 3] > 0) & (B[..., 3] > 0) & ~((F[..., 3] == 1) & (B[..., 3] == 1))
    m = nd.binary_opening(m, np.ones((2, 2)))
    lab, n = nd.label(m)   # specks left by the smear test would become floating chips
    m &= np.isin(lab, 1 + np.flatnonzero(nd.sum(m, lab, range(1, n + 1)) >= 24))
    for e in (F, B):
        e[~m] = 0
        e[m, 3] = 255
    return F, B, m


def relief(img, m):
    """Depth (native px, >= 0, away from the centre plane) for one face."""
    lum = (img[..., :3].astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)) / 255
    w = nd.gaussian_filter(m.astype(np.float32), RELIEF_SIGMA) + 1e-4
    local = nd.gaussian_filter(np.where(m, lum, 0), RELIEF_SIGMA) / w
    hp = nd.gaussian_filter(np.where(m, lum, 0), 0.7) / (nd.gaussian_filter(m.astype(np.float32), 0.7) + 1e-4) - local
    edt = nd.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1]
    e = np.minimum(edt, EDGE_R)
    round_edge = np.sqrt(np.maximum(0, EDGE_R ** 2 - (EDGE_R - e) ** 2)) / EDGE_R  # 0 at the rim, 1 inside
    mass = nd.gaussian_filter(m.astype(np.float32), MASS_SIGMA)   # piers and big masses stand forward
    d = (HALF * 0.8 + MASS * mass) * (0.8 + 0.2 * round_edge) + RELIEF * hp * (0.4 + 0.6 * round_edge)
    # a feature is no deeper than it is wide: crockets stay knobs, pinnacles and finials come out round
    thick = nd.maximum_filter(edt, size=2 * int(EDGE_R) + 1)
    d = np.minimum(d, 1.1 * thick + 0.5)
    return np.where(m, np.clip(d, 1.0, 31.0), 0)


def highpass(img, m):
    lum = (img[..., :3].astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)) / 255
    w = nd.gaussian_filter(m.astype(np.float32), RELIEF_SIGMA) + 1e-4
    local = nd.gaussian_filter(np.where(m, lum, 0), RELIEF_SIGMA) / w
    fine = nd.gaussian_filter(np.where(m, lum, 0), 0.7) / (nd.gaussian_filter(m.astype(np.float32), 0.7) + 1e-4)
    return np.where(m, fine - local, 0)


def region(p, shape, W):
    """A part's region as a mask (rect [x0, y0, x1, y1], poly [[x, y], ...], or everything), mirrored when asked."""
    H = shape[0]
    Y, X = np.mgrid[0:H, 0:W] + 0.5
    def one(flip):
        fx = (lambda x: W - x) if flip else (lambda x: x)
        if "rect" in p:
            x0, y0, x1, y1 = p["rect"]
            xa, xb = sorted((fx(x0), fx(x1)))
            return (X >= xa) & (X < xb) & (Y >= y0) & (Y < y1)
        if "poly" in p:
            from PIL import ImageDraw
            im = Image.new("1", (W, H), 0)
            ImageDraw.Draw(im).polygon([(fx(x), y) for x, y in p["poly"]], fill=1)
            return np.array(im, bool)
        return np.ones(shape, bool)
    return one(False) | one(True) if p.get("mirror", True) else one(False)


def parts_depth(spec, F, B, m):
    """parts.json -> (front, back) half-depths. Structure is shared; each face adds its own painted relief."""
    H, W = m.shape
    half = np.zeros((H, W), np.float32)
    amp = np.zeros((H, W), np.float32)
    edt = nd.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1]
    hole = ~m
    lab, _ = nd.label(hole)
    opening = lab == lab[H - 2, W // 2]
    dist_open = nd.distance_transform_edt(~opening)
    X = np.arange(W)[None, :] + 0.5
    for p in spec["parts"]:
        p = {"mirror": spec.get("mirror", False), **p}
        r = region(p, (H, W), W) & m
        op = p["op"]
        if op == "fill":
            if "add" in p:
                half[r] += p["add"]
            else:
                half[r] = p["half"]
                if "rim" in p:
                    inner = nd.distance_transform_edt(np.pad(region(p, (H, W), W), 1))[1:-1, 1:-1]
                    half[r & (inner <= p["rim"])] = p["rimHalf"]
        elif op == "add":
            add = np.zeros((H, W), np.float32)
            for x0, x1 in p["shafts"]:
                for a0, a1 in ([(x0, x1), (W - x1, W - x0)] if p["mirror"] else [(x0, x1)]):
                    c, rr = (a0 + a1) / 2, (a1 - a0) / 2
                    prof = np.sqrt(np.clip(1 - ((X - c) / rr) ** 2, 0, 1)) * p["bulge"]
                    add = np.maximum(add, np.broadcast_to(prof, (H, W)))
            half[r] += add[r]
        elif op == "portal":
            Y = np.arange(H)[:, None]
            rr = r & (dist_open > p.get("from", 0)) & (dist_open <= p["width"]) & (Y >= p.get("minY", 0)) & (Y < p.get("maxY", H))
            if "half" in p:   # one ring (a band of voussoirs, a row of skulls) at one depth
                half[rr] = p["half"]
            else:
                t = np.floor(np.clip(dist_open / p["width"], 0, 0.999) * p["steps"]) / (p["steps"] - 1)
                half[rr] = (p["in"] + (p["out"] - p["in"]) * t)[rr]
            r = rr
        elif op == "square":
            core = nd.binary_opening(r, np.ones((2 * p["open"] + 1, 2 * p["open"] + 1)))
            lab2, n = nd.label(core)
            sq = np.zeros((H, W), np.float32)
            for y in range(H):   # each row: every run of the core is as deep as it is wide
                row = lab2[y]
                xs = np.flatnonzero(row)
                if not len(xs):
                    continue
                for run in np.split(xs, np.flatnonzero(np.diff(xs) > 1) + 1):
                    sq[y, run] = min(p["max"], (len(run) / 2) * p.get("scale", 1))
            half[core] = np.maximum(sq[core], 1.5)
            knob = r & ~core
            half[knob] = np.minimum(p["knobMax"], 0.9 * edt[knob] + 0.6)
        elif op == "knobs":
            half[r] = np.minimum(p["max"], 0.9 * edt[r] + 0.6)
        elif op == "thin":
            half[r] = p["half"]
        amp[r] = p.get("amp", 1.5 if op in ("add", "square", "knobs") else 0.6 if op == "thin" else amp[r])
    out = []
    for img in (F, B):
        d = half + amp * highpass(img, m) * (half > 3)
        out.append(np.where(m, np.clip(d, 0.8, 63), 0))
    return out


def extract(pack, designs=()):
    man, load = pack_files(pack)
    arches = [a for a in man["assets"] if a["category"] == "arches"]
    names = sorted({a["arch_design"] for a in arches})
    for name in names:
        if designs and name not in designs:
            continue
        by = {a["orientation"]: a for a in arches if a["arch_design"] == name}
        a = by["SE"]
        span = int(a.get("outer_span_tiles") or a.get("span_tiles") or 3)
        F, B, m = elevations({d: load(by[d]["file"]) for d in ("SE", "NW")}, a["pivot_px"], span, a["height_px"])
        out = os.path.join(OUT, pack, name)
        spec = os.path.join(out, "parts.json")
        df, db = parts_depth(json.load(open(spec)), F, B, m) if os.path.exists(spec) else (relief(F, m), relief(B, m))
        os.makedirs(out, exist_ok=True)
        Image.fromarray(F).save(os.path.join(out, "front.png"))
        Image.fromarray(B).save(os.path.join(out, "back.png"))
        dep = np.zeros(F.shape[:2] + (3,), np.uint8)
        dep[..., 0] = np.round(df / DEPTH_STEP).clip(0, 255)
        dep[..., 1] = np.round(db / DEPTH_STEP).clip(0, 255)
        Image.fromarray(dep).save(os.path.join(out, "depth.png"))
        meta = {"pack": pack, "design": name, "span": span, "w": int(F.shape[1]), "h": int(F.shape[0]),
                "half": HALF, "depthStep": DEPTH_STEP, "pixels": int(m.sum())}
        json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1)
        print("%s/%s: span %d, %dx%d, %d px, depth front %.1f-%.1f back %.1f-%.1f" % (
            pack, name, span, F.shape[1], F.shape[0], m.sum(), df[m].min(), df[m].max(), db[m].min(), db[m].max()))


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] != "extract":
        sys.exit(__doc__)
    extract(sys.argv[2], sys.argv[3:])
