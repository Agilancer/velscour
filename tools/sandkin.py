"""Cut the Sea of Sand bestiary sheets (VELSCOUR_Sea_of_Sand_200_Sprites.zip) into single sprites.

    python tools/sandkin.py <zip | unpacked folder> [--heat out.png]

Twenty RGBA sheets, each 5 x 2 cells in reading order, every sheet with its own cell size (roster.json `cell`):
01-05 small creatures (50), 06-12 large monsters (70), 13-15 mythic monsters (30), 16-20 huge bosses (50).
They are cut by heat map, not by cell: the sheet's alpha is blurred into a heat map, every warm blob is one piece
of art (a body, a loose wing tip, a floating orb), each blob goes to the cell its alpha mass sits in, the cell keeps
every blob bigger than a speck, and the sprite is the raw alpha inside those blobs, trimmed. Each cut is checked
against the roster's art_rect (the zip's own single PNGs are not used). Written to
assets/source/enemies/sand/NN_<sheet>/NN_<slug>.png, one folder per sheet; `python tools/process_assets.py enemies
sand` packs each folder as one atlas (cell i = the folder's i-th file). The catalogue is src/data/sandkin.js
(assets/source/enemies/sand/roster.json keeps the roster's names, tiers, locations and dune variants).
`--heat` writes the heat maps and cut boxes for a look.
"""
import io, json, os, re, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "source", "enemies", "sand")
ROSTER = os.path.join(OUT, "roster.json")
SIGMA = 4          # heat blur (px): joins a creature's loose parts, keeps neighbours apart
WARM = 0.06        # heat above this is "art"
SPECK = 0.015      # blobs under this share of a cell's biggest blob are stray pixels
SLACK = 3          # a cut may differ from the roster's art_rect by this many px a side


def load(src):
    """{sheet path: RGBA array}, roster rows, from the zip or a folder."""
    sheets = {}
    if os.path.isdir(src):
        roster = json.load(open(os.path.join(src, "roster.json"), encoding="utf-8"))
        for r in roster:
            if r["sheet"] not in sheets:
                sheets[r["sheet"]] = np.asarray(Image.open(os.path.join(src, r["sheet"])).convert("RGBA")).copy()
    else:
        z = zipfile.ZipFile(src)
        roster = json.loads(z.read("roster.json").decode("utf-8"))
        for r in roster:
            if r["sheet"] not in sheets:
                sheets[r["sheet"]] = np.asarray(Image.open(io.BytesIO(z.read(r["sheet"]))).convert("RGBA")).copy()
    return sheets, roster


def cut_sheet(a, cells):
    """[(RGBA crop, box)] for each cell rect [x, y, w, h], by heat-map blobs; also the heat map."""
    al = a[..., 3].astype(np.float32) / 255
    al[al < 16 / 255] = 0
    heat = ndimage.gaussian_filter(al, SIGMA)
    lab, n = ndimage.label(heat > WARM, structure=np.ones((3, 3)))
    idx = list(range(1, n + 1))
    mass = ndimage.sum(al, lab, idx)
    com = ndimage.center_of_mass(al, lab, idx) if n else []
    owner = {}
    for i in range(n):
        if mass[i] <= 0:
            continue
        cy, cx = com[i]
        k = next((k for k, (x, y, w, h) in enumerate(cells) if x <= cx < x + w and y <= cy < y + h), None)
        if k is not None:
            owner.setdefault(k, []).append((mass[i], i + 1))
    out = []
    for k in range(len(cells)):
        blobs = owner.get(k, [])
        if not blobs:
            out.append((None, None)); continue
        top = max(m for m, _ in blobs)
        keep = [b for m, b in blobs if m >= top * SPECK]
        mask = np.isin(lab, keep) & (al > 0)
        ys, xs = np.nonzero(mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = a[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(mask[y0:y1, x0:x1], crop[..., 3], 0)
        out.append((crop, (int(x0), int(y0), int(x1), int(y1))))
    return out, heat


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    heat_out = next((sys.argv[i + 1] for i, x in enumerate(sys.argv) if x == "--heat"), None)
    if not args:
        print(__doc__); sys.exit(1)
    sheets, roster = load(args[0])
    if len(roster) != 200:
        raise SystemExit("expected 200 sprites in the roster, got %d" % len(roster))
    by_sheet = {}
    for r in roster:
        by_sheet.setdefault(r["sheet"], []).append(r)
    previews, worst = [], 0
    if os.path.isdir(OUT):
        for d in os.listdir(OUT):
            p = os.path.join(OUT, d)
            if os.path.isdir(p):
                for f in os.listdir(p):
                    if f.endswith(".png"):
                        os.remove(os.path.join(p, f))
    for sheet in sorted(by_sheet, key=lambda s: os.path.basename(s)):
        rows = by_sheet[sheet]
        a = sheets[sheet]
        cuts, heat = cut_sheet(a, [r["cell"] for r in rows])
        folder = os.path.basename(sheet)[:-4]
        d = os.path.join(OUT, folder)
        os.makedirs(d, exist_ok=True)
        for i, (r, (crop, box)) in enumerate(zip(rows, cuts)):
            if crop is None:
                raise SystemExit("%s: no art found for %s" % (sheet, r["name"]))
            x, y, w, h = r["art_rect"]
            off = max(abs(box[0] - x), abs(box[1] - y), abs(box[2] - (x + w)), abs(box[3] - (y + h)))
            worst = max(worst, off)
            if off > SLACK:
                print("  ! %s cut %s vs art_rect %s" % (r["name"], box, r["art_rect"]))
            Image.fromarray(crop).save(os.path.join(d, "%02d_%s.png" % (i + 1, slug(r["name"]))))
        print("%-34s %d sprites" % (folder, len(rows)))
        if heat_out:
            hm = (np.clip(heat / max(heat.max(), 1e-6), 0, 1) * 255).astype(np.uint8)
            img = Image.fromarray(np.dstack([hm, hm // 3, 255 - hm, np.full_like(hm, 255)])).convert("RGB")
            img.paste(Image.fromarray(a), (0, 0), Image.fromarray(a))
            dr = ImageDraw.Draw(img)
            for _, box in cuts:
                dr.rectangle(box, outline=(80, 255, 80))
            img.thumbnail((1000, 400))
            previews.append(img)
    print("largest cut vs roster art_rect: %d px" % worst)
    keep = [{k: r[k] for k in ("id", "name", "tier", "location", "suggested_dune_variants", "suggested_world_height_px")} for r in roster]
    with open(ROSTER, "w", encoding="utf-8") as f:
        f.write("[\n" + ",\n".join(json.dumps(r) for r in keep) + "\n]\n")
    if heat_out:
        H = sum(p.height for p in previews)
        sheet = Image.new("RGB", (max(p.width for p in previews), H))
        y = 0
        for p in previews:
            sheet.paste(p, (0, y)); y += p.height
        sheet.save(heat_out)
        print("heat maps ->", heat_out)


if __name__ == "__main__":
    main()
