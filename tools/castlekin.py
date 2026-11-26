"""Cut the Castle Creatures and Bosses sheets (VELSCOUR_Castle_Creatures_and_Bosses.zip) into single sprites.

    python tools/castlekin.py <zip | unpacked folder> [--heat out.png]

Six RGBA sheets, each a 5 x 2 grid of 256 px cells (01_gatehouse .. 05_royal_wing: 50 creatures; 06_bosses: 10).
The sprites are not square and some reach towards their neighbours, so they are cut by heat map, not by cell:
the sheet's alpha is blurred into a heat map, every warm blob is one piece of art (a body, a chain swinging loose,
a dangling key), each blob goes to the cell its alpha mass sits in, the cell keeps every blob bigger than a speck,
and the sprite is the raw alpha inside those blobs, trimmed. Written to
assets/source/enemies/castle/{creatures_1,creatures_2,bosses}/NNN_<slug>.png (25, 25, 10), in sheet then reading
order; `python tools/process_assets.py enemies castle` packs each folder (cell i = the folder's i-th file).
The catalogue is src/data/castlekin.js. `--heat` writes the heat maps and cut boxes for a look.
"""
import csv, io, os, re, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "source", "enemies", "castle")
CELL, COLS, ROWS = 256, 5, 2
SIGMA = 5          # heat blur (px): joins a creature's loose parts, keeps neighbours apart
WARM = 0.06        # heat above this is "art"
SPECK = 0.015      # blobs under this share of a cell's biggest blob are stray pixels


def load(src):
    """[(sheet name, RGBA array)], [csv rows] from the zip or a folder."""
    sheets, rows = [], []
    if os.path.isdir(src):
        d = os.path.join(src, "sheets")
        for f in sorted(os.listdir(d)):
            if f.endswith(".png"):
                sheets.append((f[:-4], np.asarray(Image.open(os.path.join(d, f)).convert("RGBA")).copy()))
        rows = list(csv.DictReader(open(os.path.join(src, "sprites.csv"), encoding="utf-8")))
    else:
        z = zipfile.ZipFile(src)
        for n in sorted(z.namelist()):
            if n.startswith("sheets/") and n.endswith(".png"):
                sheets.append((n[7:-4], np.asarray(Image.open(io.BytesIO(z.read(n))).convert("RGBA")).copy()))
        rows = list(csv.DictReader(io.StringIO(z.read("sprites.csv").decode("utf-8"))))
    return sheets, rows


def cut_sheet(a):
    """[(cell index, RGBA crop, heat, box)] in reading order, by heat-map blobs."""
    al = a[..., 3].astype(np.float32) / 255
    al[al < 16 / 255] = 0
    heat = ndimage.gaussian_filter(al, SIGMA)
    lab, n = ndimage.label(heat > WARM, structure=np.ones((3, 3)))
    mass = ndimage.sum(al, lab, range(1, n + 1))
    cy, cx = np.array(ndimage.center_of_mass(al, lab, range(1, n + 1))).T if n else ([], [])
    cells = {}
    for i in range(n):
        if mass[i] <= 0:
            continue
        col, row = int(cx[i] // CELL), int(cy[i] // CELL)
        cells.setdefault(row * COLS + col, []).append((mass[i], i + 1))
    out = []
    for k in range(ROWS * COLS):
        blobs = cells.get(k, [])
        if not blobs:
            out.append((k, None, heat, None)); continue
        top = max(m for m, _ in blobs)
        keep = [b for m, b in blobs if m >= top * SPECK]
        mask = np.isin(lab, keep) & (al > 0)
        ys, xs = np.nonzero(mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = a[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(mask[y0:y1, x0:x1], crop[..., 3], 0)
        out.append((k, crop, heat, (x0, y0, x1, y1)))
    return out


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    heat_out = next((sys.argv[i + 1] for i, x in enumerate(sys.argv) if x == "--heat"), None)
    if not args:
        print(__doc__); sys.exit(1)
    sheets, rows = load(args[0])
    names = {(r["sheet"], int(r["slot"]) - 1): r["name"] for r in rows}
    creatures, bosses, previews = [], [], []
    for name, a in sheets:
        cuts = cut_sheet(a)
        for k, crop, heat, box in cuts:
            if crop is None:
                raise SystemExit("%s cell %d: no art found" % (name, k))
            (bosses if name.endswith("bosses") else creatures).append((names[(name, k)], crop))
        if heat_out:
            h = (np.clip(cuts[0][2] / cuts[0][2].max(), 0, 1) * 255).astype(np.uint8)
            img = Image.fromarray(np.dstack([h, h // 3, 255 - h, np.full_like(h, 255)])).convert("RGB")
            img.paste(Image.fromarray(a), (0, 0), Image.fromarray(a))
            d = ImageDraw.Draw(img)
            for _, _, _, box in cuts:
                d.rectangle(box, outline=(80, 255, 80))
            previews.append(img)
    if len(creatures) != 50 or len(bosses) != 10:
        raise SystemExit("expected 50 creatures and 10 bosses, got %d and %d" % (len(creatures), len(bosses)))
    for folder, items, off in (("creatures_1", creatures[:25], 0), ("creatures_2", creatures[25:], 25), ("bosses", bosses, 0)):
        d = os.path.join(OUT, folder)
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith(".png"):
                os.remove(os.path.join(d, f))
        for i, (n, crop) in enumerate(items):
            Image.fromarray(crop).save(os.path.join(d, "%03d_%s.png" % (off + i + 1, slug(n))))
        print("%-12s %d sprites" % (folder, len(items)))
    if heat_out:
        W, H = previews[0].size
        sheet = Image.new("RGB", (W, H * len(previews)))
        for i, p in enumerate(previews):
            sheet.paste(p, (0, i * H))
        sheet.save(heat_out)
        print("heat maps ->", heat_out)


if __name__ == "__main__":
    main()
