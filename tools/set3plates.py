"""Cut the VELSCOUR_Monsters_Enemies_Bosses plates (enemy set 3) into single sprites.

    python tools/set3plates.py <VELSCOUR_Monsters_Enemies_Bosses.zip | unpacked folder> [--sheet out.png]

Each plate holds 5 (2 rows x 3) or 10 (2 x 5) monsters on a transparent background; the `monsters/` and
`bosses/` plates print a name under each one, which is removed. Every monster is written to
assets/source/enemies/set3/<family>[_n]/<NNN>_<slug>.png (at most MAX_H tall; a big family is split into folders
of CHUNK), in plate then reading order, with the names from tools/set3names.json (written from src/data/bestiary3.js).
`python tools/process_assets.py enemies set3` then packs each folder as one sheet (`set3/<folder>`, cell i = the
folder's i-th file). The 90 MB zip stays outside the repo.
"""
import io, json, os, re, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "source", "enemies", "set3")
NAMES = os.path.join(ROOT, "tools", "set3names.json")
MAX_H = 260
CHUNK = {"enemies": 25, "monsters": 30, "arena": 20}  # cells per packed sheet (keeps atlases under ~2000 px tall)
# family: (plate folder in the zip, labelled?)
FAMILIES = {"monsters": ("monsters", True), "bosses": ("bosses", True), "enemies": ("normal_enemies", False),
            "lords": ("normal_bosses", False), "arena": ("arena_bosses", False)}


def plates(src):
    """{folder: [(name, RGBA array)]} from the zip or an unpacked folder, in file name order."""
    out = {}
    if os.path.isdir(src):
        for folder in sorted(os.listdir(src)):
            d = os.path.join(src, folder)
            if os.path.isdir(d):
                out[folder] = [(f, np.asarray(Image.open(os.path.join(d, f)).convert("RGBA")).copy())
                               for f in sorted(os.listdir(d)) if f.lower().endswith(".png")]
    else:
        z = zipfile.ZipFile(src)
        for n in sorted(z.namelist()):
            if n.lower().endswith(".png") and "/" in n:
                folder, f = n.split("/", 1)
                out.setdefault(folder, []).append((f, np.asarray(Image.open(io.BytesIO(z.read(n))).convert("RGBA")).copy()))
    return out


ALPHA_CUT = {"enemy_plate_05_031-040.png": 110}  # a soft purple haze painted round every sprite
# Label rows (plate y) the band finder misses (plaques, faint lettering); the rest are found by label_bands.
LABEL_BANDS = {
    "monster_plate_07.png": [(565, 618), (1175, 1225)], "monster_plate_11.png": [(477, 505), (982, 1010)],
    "boss_plate_02.png": [(470, 502), (980, 1010)], "boss_plate_03.png": [(462, 497), (978, 1011)],
    "enemy_plate_01.png": [(0, 92), (486, 534), (932, 982)], "enemy_plate_02.png": [(0, 96), (498, 550), (953, 1004)],
}


def label_bands(a):
    """Rows crossed by short shapes (letters, words, plaques) at least 150 px wide in all: the name lines."""
    H = a.shape[0]
    lab, n = ndimage.label(a[..., 3] >= 120, structure=np.ones((3, 3)))
    cover = np.zeros(H)
    for sl in ndimage.find_objects(lab):
        if sl[0].stop - sl[0].start <= H * 0.05:
            cover[sl[0]] += sl[1].stop - sl[1].start
    bands, _ = ndimage.label(cover >= 150)
    return [(s.start, s.stop) for (s,) in ndimage.find_objects(bands)]


def strip_lines(a):
    """Clear thin frame lines: a column (row) covered over most of the plate while the ones 4 px either side are
    not; only its pixels with nothing beside them go, so the line stays hidden where it crosses a sprite."""
    al = a[..., 3] > 0
    for axis in (0, 1):
        m = al if axis == 0 else al.T
        cov = m.sum(0)
        L = m.shape[0]
        for x in range(4, m.shape[1] - 4):
            if cov[x] > 0.6 * L and min(cov[x - 4], cov[x + 4]) < 0.5 * cov[x]:
                lone = ~m[:, x - 3] | ~m[:, x + 3]
                if axis == 0:
                    a[lone, x, 3] = 0
                else:
                    a[x, lone, 3] = 0
    return a


def strip_labels(a, f):
    """Clear printed names, plaques and title banners: in each label band, every cluster of columns (40 px gaps
    apart) is cleared over the band's rows, sparing shapes that carry on far below (a sprite of the next row
    reaching up, a frame line)."""
    lab, n = ndimage.label(a[..., 3] >= 120, structure=np.ones((3, 3)))
    boxes = ndimage.find_objects(lab)
    for y0, y1 in LABEL_BANDS.get(f) or label_bands(a):
        y0, y1 = max(0, y0 - 4), y1 + 5
        cols = np.nonzero((a[y0:y1, :, 3] >= 120).any(0))[0]
        if not len(cols):
            continue
        groups, g = [], [cols[0]]
        for x in cols[1:]:
            if x - g[-1] > 40:
                groups.append(g); g = []
            g.append(x)
        groups.append(g)
        for g in groups:
            x0, x1 = g[0], g[-1] + 1
            x0, x1 = max(0, x0 - 6), x1 + 6
            ids = np.unique(lab[y0:y1, x0:x1]); ids = ids[ids > 0]
            below = [i for i in ids if boxes[i - 1][0].stop > y1 + 20]
            spare = ndimage.binary_dilation(np.isin(lab[y0:y1, x0:x1], below), iterations=2) if below else False
            a[y0:y1, x0:x1, 3] = np.where(spare, a[y0:y1, x0:x1, 3], 0)
    return a


def split_touching(m, k=2):
    """Erode a mask until it falls into k big cores, then give every pixel to its nearest core."""
    area, core = m.sum(), m
    for _ in range(60):
        core = ndimage.binary_erosion(core)
        lab, n = ndimage.label(core)
        if n < k:
            continue
        sizes = ndimage.sum(core, lab, range(1, n + 1))
        big = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:k]
        if sizes[big[-1] - 1] < area * 0.04:
            continue
        seeds = np.where(np.isin(lab, big), lab, 0)
        _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
        owner = seeds[iy, ix]
        return [m & (owner == j) for j in big]
    return [m]


def cut(a, rows, cols, want):
    """One sprite per grid cell: the biggest solid shape centred in the cell is its seed (a shape spanning two
    cells is split first); every other shape (bats of a swarm, a dropped bell, sparks, soft glow) joins the
    nearest seed. Reading order."""
    H, W = a.shape[:2]
    ch, cw = H / rows, W / cols
    solid = ndimage.binary_opening(a[..., 3] >= 160, iterations=1)
    lab, n = ndimage.label(solid)
    shapes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = np.zeros_like(solid)
        m[sl] = lab[sl] == i + 1
        shapes.append(m)

    biggest = max(int(m.sum()) for m in shapes)

    def seeding(shapes):
        seeds = {}
        for m in shapes:
            area = int(m.sum())
            if area < biggest * 0.08:  # a loose rock or spark is never a monster of its own
                continue
            cy, cx = ndimage.center_of_mass(m)
            cell = (min(rows - 1, int(cy / ch)), min(cols - 1, int(cx / cw)))
            if area >= ch * cw * 0.003 and area > seeds.get(cell, (0,))[0]:
                seeds[cell] = (area, m)
        return seeds
    seeds = seeding(shapes)
    if len(seeds) < want:  # two sprites touch: split the widest seed
        widest = max(seeds.values(), key=lambda s: np.ptp(np.nonzero(s[1].any(0))[0]))[1]
        shapes = [m for m in shapes if m is not widest] + split_touching(widest, 2)
        seeds = seeding(shapes)
    order = sorted(seeds)
    owner_map = np.zeros(solid.shape, np.int32)
    for j, cell in enumerate(order):
        owner_map[seeds[cell][1]] = j + 1
    _, (iy, ix) = ndimage.distance_transform_edt(owner_map == 0, return_indices=True)
    nearest = owner_map[iy, ix]
    dist = ndimage.distance_transform_edt(owner_map == 0)
    keep = (a[..., 3] > 0) & (dist < min(ch, cw) * 0.45)
    out = []
    for j in range(len(order)):
        m = keep & (nearest == j + 1)
        lab2, n2 = ndimage.label(m, structure=np.ones((3, 3)))  # drop dust: shapes far smaller than a speck
        if n2:
            sizes = ndimage.sum(m, lab2, range(1, n2 + 1))
            m = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s >= 25])
        ys, xs = np.nonzero(m.any(axis=1))[0], np.nonzero(m.any(axis=0))[0]
        sl = (slice(ys[0], ys[-1] + 1), slice(xs[0], xs[-1] + 1))
        crop = a[sl].copy()
        crop[..., 3] = np.where(m[sl], crop[..., 3], 0)
        out.append(crop)
    return out


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main():
    src = sys.argv[1]
    sheet = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    names = json.load(open(NAMES)) if os.path.exists(NAMES) else {}
    found = plates(src)
    thumbs = []
    for fam, (folder, labelled) in FAMILIES.items():
        sprites = []
        for f, a in found[folder]:
            a[..., 3] = np.where(a[..., 3] < ALPHA_CUT.get(f, 24), 0, a[..., 3])
            a = strip_lines(a)
            if labelled or f in LABEL_BANDS:
                a = strip_labels(a, f)
            per = 10 if re.search(r"\d+-[A-Z]?\d+", f) else 5
            got = cut(a, 2, 5 if per == 10 else 3, per)
            if len(got) != per:
                print("  %s/%s: %d sprites (expected %d)" % (folder, f, len(got), per))
            sprites += got
        n = CHUNK.get(fam, len(sprites))
        dirs = [fam] if n >= len(sprites) else ["%s_%d" % (fam, j + 1) for j in range((len(sprites) + n - 1) // n)]
        for d in dirs:
            d = os.path.join(OUT, d)
            os.makedirs(d, exist_ok=True)
            for old in os.listdir(d):
                os.remove(os.path.join(d, old))
        nm = names.get(fam, [])
        for k, s in enumerate(sprites):
            d = os.path.join(OUT, dirs[k // n])
            img = Image.fromarray(s)
            if img.height > MAX_H:
                w = max(1, round(img.width * MAX_H / img.height))
                img = img.convert("RGBa").resize((w, MAX_H), Image.LANCZOS).convert("RGBA")
            name = nm[k] if k < len(nm) else "%s %03d" % (fam, k)
            img.save(os.path.join(d, "%03d_%s.png" % (k, slug(name))), optimize=True)
            thumbs.append((fam, k, name, img))
        print("%-9s %d sprites" % (fam, len(sprites)))
    if sheet:  # numbered contact sheets for naming and review: one per family
        for fam in FAMILIES:
            t = [x for x in thumbs if x[0] == fam]
            cols, cw, chh = 10, 150, 175
            im = Image.new("RGB", (cols * cw, ((len(t) + cols - 1) // cols) * chh), (255, 0, 255))
            dr = ImageDraw.Draw(im)
            for j, (_, k, name, img) in enumerate(t):
                th = img.copy(); th.thumbnail((cw - 6, chh - 22))
                x, y = (j % cols) * cw, (j // cols) * chh
                im.paste(th, (x + (cw - th.width) // 2, y + 2), th)
                dr.text((x + 3, y + chh - 18), "%d %s" % (k, name[:20]), fill=(255, 255, 255))
            im.save(sheet.replace(".png", "_%s.png" % fam))


if __name__ == "__main__":
    main()
