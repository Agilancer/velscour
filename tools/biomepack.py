#!/usr/bin/env python3
"""
Biome packs: import a "<Name>_Biome_Pack.zip" (160 x 80 isometric template, see docs/ART.md) into the game.

    python3 tools/process_assets.py biomes [catacombs]

Reads assets/source/biomes/<Name>_Biome_Pack.zip (its manifest.json, sprites/ and pivots) and writes
assets/tiles/<pack>/: floors.webp, walls.webp (walls, arches and doors), scatter.webp and pack.json.

What it changes on the way:
- Height. The pack's walls are 128 px on a 160 px tile, a bit shorter than the game's heroes (they stand
  about a tile tall), and its doors are 112 px. Walls, arches and doors are raised by ZSCALE. This is not a plain
  vertical stretch, which would bend the ground lines: every output pixel is ray cast against the piece's
  real geometry (thin boxes from the manifest: wall footprints, door and arch spans, the open door leaf), and
  the hit point is looked up in the source at 1/ZSCALE of its height. Ground contacts and 2:1 edges stay exact.
- Depth slices. Long architecture can't be depth sorted as one sprite (a hero walking past a three-tile arch
  is both in front of and behind it). Each piece is split by which part of the geometry a pixel shows:
  wall nodes into their arms (NE/SE/SW/NW, half a tile each, the centre post shared), arches into six
  half-tile slices, doors into two slices plus the open leaf. Together the slices give back the whole sprite.
- Floors and scatter keep their pixels. Scatter keeps the pack's estimated pivots and footprints.
"""
import io
import json
import os
import zipfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "biomes")
OUT = os.path.join(ROOT, "assets", "tiles")

ZSCALE = 1.6  # architecture height multiplier (walls 128 -> 205 native px, ~82 world px; heroes are 60)
DIRS = {"NE": (0, -1), "SE": (1, 0), "SW": (0, 1), "NW": (-1, 0)}
BITS = {"NE": 1, "SE": 2, "SW": 4, "NW": 8}
# scatter that does not block movement (flat, or small enough to step around)
WALK_OVER = {"supine_skeleton", "vigil_candles", "rolled_shroud", "chain_and_shackle", "offering_bowl",
             "hourglass_and_prayer_book", "burial_boots_and_belt", "long_bone_heap", "coffin_plank_heap",
             "grave_lantern", "ossuary_urn",
             # cathedral_graveyard
             "bordered_fresh_grave", "old_grave_mound", "dry_wreath", "coffin_boards", "fallen_railing",
             # Castle Keep
             "fallen_tapestry", "stained_glass_shards", "cannonball_pile", "cracked_tile_rubble",
             "brazier_ash", "keep_keyring", "prison_shackle", "spear_bundle", "broken_crown", "broken_lance",
             "votive_candles", "tracery_rubble", "resting_censer", "ivy_roots", "funeral_flowers",
             # Sewers
             "muck_rubble_scatter", "sludge_soaked_remains", "dripping_candle_cluster", "mildewed_bedroll",
             "rotten_timber_heap", "rusty_chains_shackles", "stagnant_offering_bowl", "sewer_tools_and_ledger",
             "filthy_boots_and_kit"}


def box(u0, u1, v0, v1, h, tag):
    return (u0, u1, v0, v1, h, tag)


def rot(local, d):
    """Local (along, across) for a piece facing d -> world (u, v)."""
    a, p = local
    du, dv = DIRS[d]
    return (a * du - p * dv, a * dv + p * du)


def span_box(d, a0, a1, p0, p1, h, tag):
    pts = [rot((a, p), d) for a in (a0, a1) for p in (p0, p1)]
    us, vs = [q[0] for q in pts], [q[1] for q in pts]
    return box(min(us), max(us), min(vs), max(vs), h, tag)


def wall_boxes(a):
    """A wall asset's geometry -> (connection mask, thin boxes tagged by arm: NE/SE/SW/NW, or c for the post)."""
    h = a["height_px"]
    if a["topology"] == "directed_panel":
        # panels: split along the axis like a straight node
        d = a["orientation"]
        mask = 10 if d in ("SE", "NW") else 5
        tags_of = lambda u, v: ("SE" if u > 0 else "NW") if mask == 10 else ("SW" if v > 0 else "NE")
        bx = []
        for k in range(10):
            a0 = -0.5 + k * 0.1
            b = span_box(d, a0, a0 + 0.1, -0.1, 0.1, h, None)
            bx.append(b[:5] + (tags_of((b[0] + b[1]) / 2, (b[2] + b[3]) / 2),))
        return mask, bx
    bx = []
    for i, j in a["footprint_cells_0_1_tile"]:
        cu, cv = (i + 0.5) / 10, (j + 0.5) / 10
        t = "c" if abs(cu) < 0.1 and abs(cv) < 0.1 else "NE" if cv < -0.1 else "SW" if cv > 0.1 else "SE" if cu > 0.1 else "NW"
        bx.append(box(i / 10, (i + 1) / 10, j / 10, (j + 1) / 10, h, t))
    return a["connection_mask"], bx


def raycast(src, pivot, boxes, s, tol=1):
    """Raise `src` (RGBA array) by s. Returns (out RGBA, out pivot, tag per pixel or None)."""
    sh, sw = src.shape[:2]
    px, py = pivot
    hmax = max(b[4] for b in boxes)
    lift = int(np.ceil((s - 1) * hmax)) + 2
    oh, opy = sh + lift, py + lift
    X = (np.arange(sw) + 0.5 - px)[None, :].repeat(oh, 0)
    Y = (np.arange(oh) + 0.5 - opy)[:, None].repeat(sw, 1)
    d = X / 80.0
    best = np.full((oh, sw), -np.inf)
    tag = np.full((oh, sw), -1, np.int32)
    for i, (u0, u1, v0, v1, h, _) in enumerate(boxes):
        lo = np.maximum.reduce([2 * u0 - d, 2 * v0 + d, Y / 40.0])
        hi = np.minimum.reduce([2 * u1 - d, 2 * v1 + d, (Y + s * h) / 40.0])
        hit = (lo <= hi) & (hi > best)
        best[hit] = hi[hit]
        tag[hit] = i
    ok = tag >= 0
    t = np.where(ok, best, 0)
    z = (40 * t - Y) / s
    ys = 40 * t - z + py  # source row (pixel-edge coords)
    xs = np.arange(sw)[None, :].repeat(oh, 0)
    out = np.zeros((oh, sw, 4), np.uint8)
    alpha = src[..., 3] > 0
    for dy in [0] + [o for k in range(1, tol + 1) for o in (-k, k)]:
        r = np.floor(ys - 0.5 + dy).astype(np.int32)
        valid = ok & (out[..., 3] == 0) & (r >= 0) & (r < sh)
        rr, cc = r[valid], xs[valid]
        take = alpha[rr, cc]
        vi = np.argwhere(valid)[take]
        out[vi[:, 0], vi[:, 1]] = src[rr[take], cc[take]]
    tag[out[..., 3] == 0] = -1
    # coverage check: source pixels the geometry never reaches are lost
    seen = np.zeros(alpha.shape, bool)
    r = np.floor(ys - 0.5).astype(np.int32)
    v = ok & (r >= 0) & (r < sh)
    seen[r[v], xs[v]] = True
    lost = int((alpha & ~seen).sum())
    return out, (px, opy), tag, lost


def wall_material(tile, height):
    """A horizontally tileable material (h x p RGB) -> one tile's face: 80 columns along the wall (one per screen
    column of a 2:1 face) by `height` rows, resampled with wrap-around so its ends still meet."""
    w3 = np.concatenate([tile, tile, tile], 1).astype(np.uint8)
    big = np.asarray(Image.fromarray(w3).resize((240, height), Image.LANCZOS)).astype(np.float32)
    return big[:, 80:160]


def texture_walls(arr, pivot, boxes, s, tex):
    """Paint a raised wall sprite (from raycast) with a material in world space: every visible face pixel looks up
    `tex` (wall_material) at its position along the wall (tile-periodic, so neighbouring pieces and both sides of a
    corner continue the same courses) and its height. The +v face is lit, the +u face a step darker, the top darker
    still; a light lip on the top edge, dark corner lines and a little occlusion at the foot."""
    oh, sw = arr.shape[:2]
    px, py = pivot
    X = (np.arange(sw) + 0.5 - px)[None, :].repeat(oh, 0)
    Y = (np.arange(oh) + 0.5 - py)[:, None].repeat(sw, 1)
    d = X / 80.0
    best = np.full((oh, sw), -np.inf)
    face = np.full((oh, sw), -1, np.int8)
    top = np.zeros((oh, sw))
    for (u0, u1, v0, v1, h, _) in boxes:
        lo = np.maximum.reduce([2 * u0 - d, 2 * v0 + d, Y / 40.0])
        c = np.stack([2 * u1 - d, 2 * v1 + d, (Y + s * h) / 40.0])
        hi = c.min(0)
        hit = (lo <= hi) & (hi > best)
        best[hit] = hi[hit]
        face[hit] = c.argmin(0)[hit]
        top[hit] = s * h
    op = (arr[..., 3] > 0) & (face >= 0)
    t = np.where(op, best, 0)
    u, v, z = (t + d) / 2, (t - d) / 2, 40 * t - Y
    th, tw = tex.shape[:2]
    along = np.where(face == 0, v, u)
    col = np.floor(np.mod(along, 1.0) * tw).astype(int) % tw
    row = np.clip(np.floor((top - z) / np.maximum(top, 1) * th), 0, th - 1).astype(int)
    tcol = np.floor(np.mod(u, 1.0) * tw).astype(int) % tw   # the cap: a darker read of the same stone
    trow = np.floor(np.mod(v, 1.0) * tw).astype(int) % th
    rgb = np.where((face == 2)[..., None], tex[trow, tcol], tex[row, col])
    shade = np.choose(np.clip(face, 0, 2), [0.8, 1.0, 0.62]).astype(np.float32)
    shade *= np.where(face == 2, 1.0, 0.72 + 0.28 * np.clip(z / (0.18 * np.maximum(top, 1)), 0, 1))
    up = np.r_[np.full((1, sw), -1, np.int8), face[:-1]]
    shade[(face < 2) & ((up == 2) | (up < 0))] *= 1.25            # lip where a face meets the cap
    lf = np.c_[np.full((oh, 1), -1, np.int8), face[:, :-1]]
    rt = np.c_[face[:, 1:], np.full((oh, 1), -1, np.int8)]
    shade[(face < 2) & (((lf != face) & (lf >= 0) & (lf < 2)) | ((rt != face) & (rt >= 0) & (rt < 2)))] *= 0.7
    out = arr.copy()
    out[..., :3] = np.where(op[..., None], np.clip(rgb * shade[..., None], 0, 255), arr[..., :3]).astype(np.uint8)
    return out


def crop(arr):
    a = arr[..., 3] > 0
    if not a.any():
        return None
    ys, xs = np.where(a)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return arr[y0:y1, x0:x1], x0, y0


class Atlas:
    def __init__(self, width):
        self.width, self.items = width, []

    def add(self, arr):
        self.items.append(arr)
        return len(self.items) - 1

    def pack(self):
        order = sorted(range(len(self.items)), key=lambda i: -self.items[i].shape[0])
        x = y = shelf = 0
        pos = {}
        for i in order:
            h, w = self.items[i].shape[:2]
            if x + w + 2 > self.width:
                x, y, shelf = 0, y + shelf + 2, 0
            pos[i] = (x, y)
            x += w + 2
            shelf = max(shelf, h)
        img = Image.new("RGBA", (self.width, y + shelf + 2), (0, 0, 0, 0))
        for i, (x, y) in pos.items():
            img.paste(Image.fromarray(self.items[i]), (x, y))
        return img, pos


def pieces(arr, pivot, tags, groups):
    """Split a raised sprite by tag group -> [(group, crop, ox, oy)], offsets relative to the pivot."""
    out = []
    for g, ids in groups.items():
        m = np.isin(tags, ids)
        if not m.any():
            continue
        part = np.zeros_like(arr)
        part[m] = arr[m]
        c = crop(part)
        if c:
            img, x0, y0 = c
            out.append((g, img, int(x0 - pivot[0]), int(y0 - pivot[1])))
    return out


def import_pack(zpaths, pack_id):
    # a pack may be split into parts (<Name>_Biome_Pack-1.zip, -2, ...) to fit GitHub's upload limit
    files = {}
    for zp in zpaths:
        z = zipfile.ZipFile(zp)
        for n in z.namelist():
            files.setdefault(n, z)
    root = next(n for n in files if n.endswith("manifest.json")).rsplit("manifest.json", 1)[0]
    read = lambda f: files[root + f].read(root + f)
    man = json.loads(read("manifest.json"))
    load = lambda a: np.array(Image.open(io.BytesIO(read(a["file"]))).convert("RGBA"))
    assets = man["assets"]
    out_dir = os.path.join(OUT, pack_id)
    os.makedirs(out_dir, exist_ok=True)
    meta = {"pack": man["pack"], "tile": man["coordinate_system"]["tile_size_px"], "zscale": ZSCALE,
            "floors": [], "walls": {}, "arches": {}, "archSpan": {}, "doors": {}, "scatter": []}
    lost_report = []

    # ---- floors: as drawn
    fl = [a for a in assets if a["category"] == "floors"]
    fat = Image.new("RGBA", (10 * 162, ((len(fl) + 9) // 10) * 82), (0, 0, 0, 0))
    for i, a in enumerate(fl):
        arr = load(a)
        x, y = (i % 10) * 162, (i // 10) * 82
        fat.paste(Image.fromarray(arr), (x, y))
        rgb = arr[..., :3][arr[..., 3] > 0].astype(np.float32)
        lum = float((rgb @ np.array([0.299, 0.587, 0.114])).mean()) / 255
        meta["floors"].append({"name": a["name"], "x": x, "y": y, "w": 160, "h": 80,
                               "seamless": bool(a.get("seamless_self_repeat")), "lum": round(lum, 3)})
    fat.save(os.path.join(out_dir, "floors.webp"), quality=92, alpha_quality=100, method=6)

    arch = Atlas(2048)
    refs = []  # (container, index into atlas, ox, oy) filled in after packing

    def put(lst, group, img, ox, oy):
        rec = [group, 0, 0, img.shape[1], img.shape[0], ox, oy]
        refs.append((rec, arch.add(img)))
        lst.append(rec)

    # ---- walls: every node / panel split into arms
    # a pack may give its wall families tileable materials (manifest wall_materials: family -> file); those faces
    # are painted in world space at the raised size instead of keeping the source sprite's pixels
    mats = {f: wall_material(load({"file": p})[..., :3], int(round(128 * ZSCALE)))
            for f, p in man.get("wall_materials", {}).items()}
    seen_px = {}
    for a in [a for a in assets if a["category"] == "walls"]:
        if a["topology"] == "directed_panel" and a.get("pixel_identical_to"):
            continue
        fam = a["wall_set"]
        mask, bx = wall_boxes(a)
        src = load(a)
        arr, piv, tags, lost = raycast(src, a["pivot_px"], bx, ZSCALE)
        lost_report.append((a["id"], lost))
        if fam in mats:
            arr = texture_walls(arr, piv, bx, ZSCALE, mats[fam])
        key = arr.tobytes()
        if key in seen_px:
            continue
        seen_px[key] = 1
        arms = sorted({b[5] for b in bx} - {"c"}) or ["c"]
        centre = [i for i, b in enumerate(bx) if b[5] == "c"]
        groups = {g: [i for i, b in enumerate(bx) if b[5] == g] + centre for g in arms}
        var = []
        for g, img, ox, oy in pieces(arr, piv, tags, groups):
            put(var, g, img, ox, oy)
        meta["walls"].setdefault(fam, {}).setdefault(str(mask), []).append(var)

    # ---- arches: half-tile slices along the span (3, 5 or 7 tiles; archSpan[design])
    for a in [a for a in assets if a["category"] == "arches"]:
        d, h = a["orientation"], a["height_px"]
        n = int(a.get("outer_span_tiles") or a.get("span_tiles") or 3)
        bx = []
        for k in range(10 * n):
            a0 = -n / 2 + k * 0.1
            bx.append(span_box(d, a0, a0 + 0.1, -0.1, 0.1, h, k // 5))
        baked = os.path.join(ROOT, "assets", "source", "arches3d", pack_id, a["arch_design"])
        if os.path.exists(os.path.join(baked, d + ".png")):
            # a 3D model baked by tools/arch3d_bake.js: already raised, tagged by slice (1 + index, 0 = empty)
            arr = np.array(Image.open(os.path.join(baked, d + ".png")).convert("RGBA"))
            tags = np.array(Image.open(os.path.join(baked, d + "_tags.png")).convert("RGBA"))[..., 0].astype(np.int32) - 1
            tags[arr[..., 3] == 0] = -1
            piv = json.load(open(os.path.join(baked, "bake.json")))[d]["pivot"]
            groups = {g: [g] for g in range(2 * n)}
        else:
            arr, piv, tags, lost = raycast(load(a), a["pivot_px"], bx, ZSCALE)
            lost_report.append((a["id"], lost))
            groups = {g: [i for i, b in enumerate(bx) if b[5] == g] for g in range(2 * n)}
        sl = []
        for g, img, ox, oy in pieces(arr, piv, tags, groups):
            put(sl, round(-n / 2 + 0.25 + g * 0.5, 2), img, ox, oy)
        meta["arches"].setdefault(a["arch_design"], {})[d] = sl
        meta["archSpan"][a["arch_design"]] = n

    # ---- doors: two wall slices + the open leaf (whichever side of the hinge it swings to)
    for a in [a for a in assets if a["category"] == "doors"]:
        d, st = a["orientation"], a["state"]
        hu, hv = a["hinge_tiles"]
        H = 128
        bx = []
        for k in range(10):
            a0 = -0.5 + k * 0.1
            bx.append(span_box(d, a0, a0 + 0.1, -0.1, 0.1, H, "L" if k < 5 else "R"))
        src = load(a)
        leaf = None
        if st == "open":
            best = None
            ha = hu * DIRS[d][0] + hv * DIRS[d][1]  # hinge position along the axis
            for side in (1, -1):
                lb = span_box(d, ha - 0.05, ha + 0.05, 0, side * 0.85, a["leaf_height_px"], "leaf")
                lb = (lb[0], lb[1], lb[2], lb[3], lb[4], "leaf")
                _, _, tg, lost = raycast(src, a["pivot_px"], bx + [lb], 1.0)
                if best is None or lost < best[0]:
                    best = (lost, lb, side)
            leaf = best[1]
            bx.append(leaf)
            lu, lv = (leaf[0] + leaf[1]) / 2, (leaf[2] + leaf[3]) / 2
        arr, piv, tags, lost = raycast(src, a["pivot_px"], bx, ZSCALE)
        lost_report.append((a["id"], lost))
        groups = {"L": [i for i, b in enumerate(bx) if b[5] == "L"], "R": [i for i, b in enumerate(bx) if b[5] == "R"]}
        if leaf:
            groups["leaf"] = [len(bx) - 1]
        sl = []
        for g, img, ox, oy in pieces(arr, piv, tags, groups):
            # depth anchor of each slice, in tiles from the doorway centre
            anc = {"L": rot((-0.25, 0), d), "R": rot((0.25, 0), d)}.get(g) or (round(lu, 3), round(lv, 3))
            put(sl, [g, anc[0], anc[1]], img, ox, oy)
        meta["doors"].setdefault(a["door_design"], {}).setdefault(d, {})[st] = sl

    # ---- scatter: as drawn, cropped
    sc = Atlas(2048)
    srefs = []
    for a in [a for a in assets if a["category"] == "scatter"]:
        img, x0, y0 = crop(load(a))
        fp = a["footprint_tiles_estimate"][0]
        rec = {"name": a["name"], "x": 0, "y": 0, "w": img.shape[1], "h": img.shape[0],
               "ox": int(x0 - a["pivot_px"][0]), "oy": int(y0 - a["pivot_px"][1]), "fp": fp,
               "block": a["name"] not in WALK_OVER}
        srefs.append((rec, sc.add(img)))
        meta["scatter"].append(rec)
    simg, spos = sc.pack()
    for rec, i in srefs:
        rec["x"], rec["y"] = spos[i]
    simg.save(os.path.join(out_dir, "scatter.webp"), quality=92, alpha_quality=100, method=6)

    aimg, apos = arch.pack()
    for rec, i in refs:
        rec[1], rec[2] = apos[i]
    aimg.save(os.path.join(out_dir, "walls.webp"), quality=92, alpha_quality=100, method=6)
    with open(os.path.join(out_dir, "pack.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    worst = sorted(lost_report, key=lambda r: -r[1])[:6]
    print("%s: %d floors, %d wall families, %d arches, %d doors, %d scatter; walls atlas %dx%d, scatter %dx%d"
          % (pack_id, len(meta["floors"]), len(meta["walls"]), len(meta["arches"]), len(meta["doors"]),
             len(meta["scatter"]), aimg.width, aimg.height, simg.width, simg.height))
    print("  source pixels outside the geometry (most first):", ", ".join("%s %d" % r for r in worst))


def process_biome_packs(only=()):
    import re
    packs = {}
    for fn in sorted(os.listdir(SRC)):
        m = re.match(r"(.+)_Biome_Pack(-\d+)?\.zip$", fn)
        if m:
            packs.setdefault(m.group(1).lower(), []).append(os.path.join(SRC, fn))
    for pid, parts in packs.items():
        if not only or pid in only:
            import_pack(parts, pid)


if __name__ == "__main__":
    import sys
    process_biome_packs(sys.argv[1:])
