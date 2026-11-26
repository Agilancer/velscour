"""Cut the Act III art (City State Phobos and Velscour's Keep) into single sprites, by heat map.

    python tools/phobospack.py <Bellmourn_Phobos_230_Characters.zip> <Velscour_Keep_Castle_and_Grand_Finale.zip> [--heat dir]
    python tools/process_assets.py enemies phobos

Both packs are RGBA sheets on a 5 x 2 grid of 288 x 352 cells (23 sheets of Phobos folk, ward foes, ward bosses,
castle knights and castle bosses; 21 sheets of Keep knights and creatures), plus twelve single finale forms of Lord
Velscour (three sets of four). Some art reaches over its cell, so it is cut the way tools/castlekin.py cuts: the alpha
is blurred into a heat map, every warm blob is one piece of art, each blob goes to the cell its mass sits in, and the
sprite is the raw alpha inside the blobs that cell keeps, trimmed. Cut-outs are stored at most MAX_H px tall (finale
forms FINALE_H) in assets/source/enemies/phobos/<folder>/NNN_<slug>.png; each folder becomes one atlas. The roster
(names, places, behaviour, hostility triggers, counterplay, liveries) is written to src/data/phobosroster.js, which
src/data/phobos.js turns into bestiary entries. `--heat dir` writes each sheet's heat map with the cut boxes.
"""
import io, json, os, re, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "source", "enemies", "phobos")
ROSTER_JS = os.path.join(ROOT, "src", "data", "phobosroster.js")
CW, CH, COLS, ROWS = 288, 352, 5, 2
SIGMA, WARM, SPECK = 5, 0.06, 0.015
MAX_H, FINALE_H = 230, 520


def cut_sheet(a):
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
        col, row = min(COLS - 1, int(cx[i] // CW)), min(ROWS - 1, int(cy[i] // CH))
        cells.setdefault(row * COLS + col, []).append((mass[i], i + 1))
    out = []
    for k in range(ROWS * COLS):
        blobs = cells.get(k, [])
        if not blobs:
            out.append((k, None, None)); continue
        top = max(m for m, _ in blobs)
        keep = [b for m, b in blobs if m >= top * SPECK]
        mask = np.isin(lab, keep) & (al > 0)
        ys, xs = np.nonzero(mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = a[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(mask[y0:y1, x0:x1], crop[..., 3], 0)
        out.append((k, crop, (x0, y0, x1, y1)))
    return out, heat


def cut_single(a):
    """The finale forms: one figure on a big canvas; keep the blobs near the biggest."""
    al = a[..., 3].astype(np.float32) / 255
    al[al < 16 / 255] = 0
    heat = ndimage.gaussian_filter(al, SIGMA * 2)
    lab, n = ndimage.label(heat > WARM, structure=np.ones((3, 3)))
    mass = ndimage.sum(al, lab, range(1, n + 1))
    top = mass.max()
    keep = [i + 1 for i in range(n) if mass[i] >= top * SPECK]
    mask = np.isin(lab, keep) & (al > 0)
    ys, xs = np.nonzero(mask)
    crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    crop[..., 3] = np.where(mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1], crop[..., 3], 0)
    return crop


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower().replace("—", "-")).strip("_")[:48]


def shrink(crop, mh):
    img = Image.fromarray(crop)
    if img.height > mh:
        img = img.convert("RGBa").resize((max(1, round(img.width * mh / img.height)), mh), Image.LANCZOS).convert("RGBA")
    return img


def chunks(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    heat_dir = next((sys.argv[i + 1] for i, x in enumerate(sys.argv) if x == "--heat"), None)
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    zp, zk = zipfile.ZipFile(args[0]), zipfile.ZipFile(args[1])
    rp, rk = json.loads(zp.read("phobos_roster.json")), json.loads(zk.read("roster.json"))
    sprites = {}   # id -> PIL image
    for z, roster, key in ((zp, rp, "sheet"), (zk, [e for e in rk if e["category"] != "finale"], "art")):
        for sheet in sorted({e[key] for e in roster}):
            a = np.asarray(Image.open(io.BytesIO(z.read(sheet))).convert("RGBA")).copy()
            cuts, heat = cut_sheet(a)
            byk = {k: (crop, box) for k, crop, box in cuts}
            for e in roster:
                if e[key] != sheet:
                    continue
                x, y = (e["cell"] if "cell" in e else e["frame"])[:2]
                k = (y // CH) * COLS + x // CW
                crop, box = byk[k]
                if crop is None:
                    raise SystemExit("%s cell %d: no art" % (sheet, k))
                sprites[e["id"]] = shrink(crop, MAX_H)
            if heat_dir:
                os.makedirs(heat_dir, exist_ok=True)
                h = (np.clip(heat / max(heat.max(), 1e-6), 0, 1) * 255).astype(np.uint8)
                img = Image.fromarray(np.dstack([h, h // 3, 255 - h, np.full_like(h, 255)])).convert("RGB")
                img.paste(Image.fromarray(a), (0, 0), Image.fromarray(a))
                d = ImageDraw.Draw(img)
                for _, _, box in cuts:
                    if box: d.rectangle(box, outline=(80, 255, 80))
                img.save(os.path.join(heat_dir, os.path.basename(sheet)[:-4] + "_heat.jpg"), quality=80)
    for e in rk:
        if e["category"] == "finale":
            a = np.asarray(Image.open(io.BytesIO(zk.read(e["art"]))).convert("RGBA")).copy()
            sprites[e["id"]] = shrink(cut_single(a), FINALE_H)
    # folders: one atlas each
    cat = lambda r, c: [e for e in r if e["category"] == c]
    groups = []
    folk = cat(rp, "gray") + cat(rp, "good")
    groups += [("folk_%d" % (i + 1), g) for i, g in enumerate(chunks(folk, 20))]
    groups += [("ward_%d" % (i + 1), g) for i, g in enumerate(chunks(cat(rp, "ward"), 15))]
    groups += [("wardboss_%d" % (i + 1), g) for i, g in enumerate(chunks(cat(rp, "ward_boss"), 15))]
    groups += [("castle_%d" % (i + 1), g) for i, g in enumerate(chunks(cat(rp, "castle"), 24))]
    groups += [("cboss_%d" % (i + 1), g) for i, g in enumerate(chunks(cat(rp, "castle_boss"), 10))]
    groups += [("knights_%d" % (i + 1), g) for i, g in enumerate(chunks(cat(rk, "knight"), 20))]
    groups += [("creatures_%d" % (i + 1), g) for i, g in enumerate(chunks(cat(rk, "creature"), 25))]
    for area in ("Crimson Dynasty", "Obsidian Eclipse", "Cathedral of Ruin"):
        groups.append(("finale_" + slug(area).split("_")[0], [e for e in rk if e["category"] == "finale" and e["area"] == area]))
    roster = []
    for folder, items in groups:
        d = os.path.join(OUT, folder)
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith(".png"): os.remove(os.path.join(d, f))
        for i, e in enumerate(items):
            img = sprites[e["id"]]
            img.save(os.path.join(d, "%03d_%s.png" % (i + 1, slug(e["name"]))), optimize=True)
            roster.append({"id": e["id"], "name": e["name"], "cat": e["category"], "at": e.get("location") or e.get("area"),
                           "sheet": "phobos/" + folder, "i": i, "concept": e.get("concept", ""), "does": e.get("behavior", ""),
                           "trigger": e.get("hostility_trigger", ""), "counter": e.get("boss_counterplay", ""),
                           "livery": e.get("livery", ""), "scale": e.get("world_scale_relative_to_human", 0), "aspect": round(img.height / img.width, 3)})
        print("%-20s %d sprites" % (folder, len(items)))
    with open(ROSTER_JS, "w", encoding="utf-8") as f:
        f.write("// GENERATED by tools/phobospack.py from the Act III packs (City State Phobos, Velscour's Keep): do not edit.\n")
        f.write("export const PHOBOS_ROSTER = [\n")
        for r in roster:
            f.write("  " + json.dumps(r, ensure_ascii=False) + ",\n")
        f.write("];\n")
    print("%d sprites, roster -> %s" % (len(roster), ROSTER_JS))


if __name__ == "__main__":
    main()
