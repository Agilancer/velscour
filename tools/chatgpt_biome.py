"""
Turn ChatGPT's nine biome sheets (docs/CHATGPT_BIOME_SPRITES.md) into a game biome pack.

    python tools/chatgpt_biome.py <sheets dir> <names.json> [--work DIR] [--install] [--force]

<sheets dir> holds the nine images, matched by their leading digit (1_floors..., 5_wall..., 9_props...), any
image format. <names.json> is docs/biome_kit/biome_names_template.json filled in by ChatGPT.

1. Prep: key out the magenta (or transparent) background, crop every cell inside its border, keep the main
   object per cell (plus pieces touching it), and repack everything into the source layout of the Catacombs
   pack's builder (floors_01_20.png ... scatter_21_40.png). Writes <work>/prep_preview.png: look at it.
2. Build: runs the builder from assets/source/biomes/Catacombs_Biome_Pack.zip (tools/build_pack.py) into
   <work>/<Name>_Biome_Pack and prints its QA (seamless floors, wall joins, arch sockets, door hinges).
3. --install: zips it to assets/source/biomes/<Name>_Biome_Pack.zip and runs the game import
   (tools/biomepack.py -> assets/tiles/<name>/). Then point biomes at it in ART (src/data/biomes.js).
"""
import argparse, io, json, os, re, subprocess, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIOMES = os.path.join(ROOT, "assets", "source", "biomes")
# sheet number -> (kind, canvas size, cols, rows)
SHEETS = {1: ("floors", (1024, 1024), 4, 4), 2: ("floors", (1024, 1024), 4, 4), 3: ("floors", (1024, 1024), 4, 4),
          4: ("floors", (1024, 1024), 4, 4), 5: ("walls", (1536, 1024), 5, 2), 6: ("arches", (1536, 1024), 3, 2),
          7: ("doors", (1536, 1024), 3, 2), 8: ("props", (1536, 1024), 5, 4), 9: ("props", (1536, 1024), 5, 4)}
# native prop widths by role (the Catacombs pack's), see the role table in the doc
WIDTHS = [136, 136, 122, 86, 98, 130, 54, 78, 86, 38, 50, 58, 136, 76, 68, 88, 106, 80, 122, 64,
          128, 134, 148, 100, 58, 60, 84, 80, 112, 70, 80, 58, 90, 58, 50, 100, 110, 126, 70, 74]
COUNTS = {"floor_names": 60, "wall_names": 5, "arch_names": 3, "door_names": 3, "scatter_names": 40}


def find_sheets(d):
    found = {}
    for fn in sorted(os.listdir(d)):
        m = re.match(r"^(\d)[^\d]", fn)
        if m and fn.lower().rsplit(".", 1)[-1] in ("png", "webp", "jpg", "jpeg"):
            found.setdefault(int(m.group(1)), os.path.join(d, fn))
    missing = [n for n in SHEETS if n not in found]
    if missing:
        sys.exit("missing sheet(s) %s in %s (files must start with the sheet number, e.g. 6_arches.png)" % (missing, d))
    return found


def load(path, size, smooth):
    im = Image.open(path).convert("RGBA")
    if im.size != size:
        print("  %s is %dx%d, rescaling to %dx%d" % (os.path.basename(path), *im.size, *size))
        im = im.resize(size, Image.LANCZOS if smooth else Image.NEAREST)
    return np.array(im)


def key_background(a):
    """Opaque mask: drops transparency, flat magenta and the magenta-tinted fringe around objects."""
    rgb = a[:, :, :3].astype(int); r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    magenta = (r > 140) & (b > 140) & (g < 0.55 * np.minimum(r, b)) & (abs(r - b) < 80)
    solid = (a[:, :, 3] >= 128) & ~magenta
    tint = (r - g > 45) & (b - g > 45) & (abs(r - b) < 60)   # object pixels blended with magenta
    edge = solid & ~ndimage.binary_erosion(solid, iterations=1)
    solid &= ~(edge & tint)
    return solid


def cell_box(kind, size, cols, rows, c, r):
    w, h = size
    return round(c * w / cols), round(r * h / rows), round((c + 1) * w / cols), round((r + 1) * h / rows)


def texture_cells(a, size, cols, rows, inset=0.04):
    out = []
    for r in range(rows):
        for c in range(cols):
            x0, y0, x1, y1 = cell_box(None, size, cols, rows, c, r)
            dx, dy = round((x1 - x0) * inset), round((y1 - y0) * inset)
            out.append(Image.fromarray(a[y0 + dy:y1 - dy, x0 + dx:x1 - dx, :3]).convert("RGBA"))
    return out


def object_cells(a, size, cols, rows, label):
    """Per cell: the largest opaque component plus every piece within reach of it, cropped to its bounds."""
    solid = key_background(a)
    solid[:4] = solid[-4:] = False; solid[:, :4] = solid[:, -4:] = False   # sheet frame lines (objects never touch it)
    lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
    if not n:
        sys.exit("%s: nothing but background" % label)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    objs = ndimage.find_objects(lab)
    cells = [[] for _ in range(cols * rows)]
    for i, sl in enumerate(objs):
        if sizes[i] < 12:
            continue
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        k = min(rows - 1, int(cy * rows / size[1])) * cols + min(cols - 1, int(cx * cols / size[0]))
        cells[k].append((sizes[i], i + 1, sl))
    out = []
    reach = round(size[0] / 64)
    for k, comps in enumerate(cells):
        comps.sort(reverse=True)
        if not comps or comps[0][0] < 400:
            sys.exit("%s: cell %d (row %d, column %d) is empty or too small" % (label, k + 1, k // cols + 1, k % cols + 1))
        _, mid, msl = comps[0]
        y0, y1, x0, x1 = msl[0].start, msl[0].stop, msl[1].start, msl[1].stop
        keep = [mid]
        for s, i, sl in comps[1:]:
            gap = max(x0 - sl[1].stop, sl[1].start - x1, y0 - sl[0].stop, sl[0].start - y1, 0)
            if gap <= reach and s >= 20:
                keep.append(i)
                y0, y1, x0, x1 = min(y0, sl[0].start), max(y1, sl[0].stop), min(x0, sl[1].start), max(x1, sl[1].stop)
        crop = a[y0:y1, x0:x1].copy()
        crop[:, :, 3] = np.where(np.isin(lab[y0:y1, x0:x1], keep), 255, 0)
        crop[crop[:, :, 3] == 0, :3] = 0
        out.append(Image.fromarray(crop))
    return out


def object_sheet(objs, cols, rows, min_dim=160):
    """Builder layout: equal cells, one isolated object centred in each, well apart."""
    objs = [o.resize((o.width * f, o.height * f), Image.NEAREST) if (f := max(1, -(-min_dim // max(o.size)))) > 1 else o for o in objs]
    cw = max(o.width for o in objs) + 64; ch = max(o.height for o in objs) + 64
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for k, o in enumerate(objs):
        c, r = k % cols, k // cols
        sheet.alpha_composite(o, (c * cw + (cw - o.width) // 2, r * ch + (ch - o.height) // 2))
    return sheet


def texture_sheet(cells, cols, rows, cw, ch):
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for k, t in enumerate(cells):
        sheet.paste(t.resize((cw, ch), Image.LANCZOS), ((k % cols) * cw, (k // cols) * ch))
    return sheet


def safe(s):
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", str(s).lower())).strip("_") or "unnamed"


def read_config(path):
    cfg = json.load(open(path, encoding="utf-8-sig"))
    name = re.sub(r"_+", "_", re.sub(r"[^A-Za-z0-9]+", "_", cfg.get("biome_name", "")).strip("_"))
    if not name or name.upper() == "REPLACE_ME":
        sys.exit("names.json: set biome_name")
    out = {"biome_name": name}
    for key, n in COUNTS.items():
        names = cfg.get(key, [])
        if len(names) != n:
            sys.exit("names.json: %s needs %d names, has %d" % (key, n, len(names)))
        seen, fixed = set(), []
        for s in map(safe, names):
            base, k = s, 2
            while s in seen:
                s, k = "%s_%d" % (base, k), k + 1
            seen.add(s); fixed.append(s)
        out[key] = fixed
    widths = cfg.get("scatter_widths_px", WIDTHS)
    if len(widths) != 40:
        sys.exit("names.json: scatter_widths_px needs 40 numbers")
    out["scatter_widths_px"] = [max(24, min(176, int(w))) for w in widths]
    return out


def preview(path, groups):
    """One contact sheet of everything extracted, on grey, so stray pixels and bad crops show."""
    rows = []
    for title, ims, h in groups:
        scaled = [im.resize((max(1, round(im.width * h / im.height)), h), Image.NEAREST) for im in ims]
        rows.append((title, scaled, h))
    W = 1800
    lines = []
    for title, ims, h in rows:
        line, x = [], 0
        for im in ims:
            if x + im.width > W and line:
                lines.append((title, line, h)); title, line, x = "", [], 0
            line.append(im); x += im.width + 6
        lines.append((title, line, h))
    H = sum(h + (22 if t else 6) for t, _, h in lines)
    out = Image.new("RGBA", (W, H), (70, 74, 78, 255)); d = ImageDraw.Draw(out); y = 0
    for title, line, h in lines:
        if title:
            d.text((4, y + 4), title, fill="white"); y += 16
        x = 0
        for im in line:
            out.alpha_composite(im, (x, y)); x += im.width + 6
        y += h + 6
    out.save(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sheets"); ap.add_argument("names")
    ap.add_argument("--work", help="working folder (default: <sheets dir>/build)")
    ap.add_argument("--install", action="store_true", help="zip into assets/source/biomes and import into the game")
    ap.add_argument("--force", action="store_true", help="overwrite an existing pack of the same name")
    args = ap.parse_args()
    cfg = read_config(args.names)
    name = cfg["biome_name"]
    work = os.path.abspath(args.work or os.path.join(args.sheets, "build"))
    src = os.path.join(work, "source"); os.makedirs(src, exist_ok=True)
    sheets = find_sheets(args.sheets)

    print("prep:", name)
    floors, walls, arches, doors, props = [], [], [], [], []
    for n, (kind, size, cols, rows) in SHEETS.items():
        smooth = kind in ("floors", "walls")
        a = load(sheets[n], size, smooth)
        label = os.path.basename(sheets[n])
        if kind == "floors":
            floors += texture_cells(a, size, cols, rows)
        elif kind == "walls":
            walls = texture_cells(a, size, cols, rows, inset=0.03)
        else:
            objs = object_cells(a, size, cols, rows, label)
            {"arches": arches, "doors": doors, "props": props}[kind].extend(objs)
    floors = floors[:60]
    for b in range(3):
        texture_sheet(floors[b * 20:b * 20 + 20], 5, 4, 256, 256).save(os.path.join(src, "floors_%02d_%02d.png" % (b * 20 + 1, b * 20 + 20)))
    texture_sheet(walls, 5, 2, 240, 384).save(os.path.join(src, "wall_materials.png"))
    object_sheet(arches, 3, 2).save(os.path.join(src, "arch_elevations.png"))
    object_sheet(doors, 3, 2).save(os.path.join(src, "door_leaves.png"))
    for b in range(2):
        object_sheet(props[b * 20:b * 20 + 20], 5, 4).save(os.path.join(src, "scatter_%02d_%02d.png" % (b * 20 + 1, b * 20 + 20)))
    for k, (o, w) in enumerate(zip(props, cfg["scatter_widths_px"])):
        if o.height / o.width * w > 150:
            print("  prop %02d %s is tall: it will be drawn %d px wide (role width %d), capped at 150 px high"
                  % (k + 1, cfg["scatter_names"][k], round(150 * o.width / o.height), w))
    preview(os.path.join(work, "prep_preview.png"), [("floors 01-60", floors, 80), ("wall faces (front row, then back)", walls, 128),
            ("arches (front, then back)", arches, 140), ("door leaves (front, then back)", doors, 140), ("props 01-40", props, 100)])
    cfg_path = os.path.join(work, "config.json")
    json.dump(cfg, open(cfg_path, "w", encoding="utf-8"), indent=2)
    print("  wrote", src, "and", os.path.join(work, "prep_preview.png"))

    # build with the Catacombs pack's own builder
    tools = os.path.join(work, "tools"); os.makedirs(tools, exist_ok=True)
    with zipfile.ZipFile(os.path.join(BIOMES, "Catacombs_Biome_Pack.zip")) as z:
        for fn in ("build_pack.py", "inspect_sources.py"):
            open(os.path.join(tools, fn), "wb").write(z.read("Catacombs_Biome_Pack/tools/" + fn))
    out = os.path.join(work, name + "_Biome_Pack")
    print("build:", out)
    r = subprocess.run([sys.executable, os.path.join(tools, "build_pack.py"), "--source", src, "--config", cfg_path, "--out", out])
    if r.returncode:
        sys.exit("builder failed")
    qa = json.load(open(os.path.join(out, "qa", "validation.json")))
    for test, res in qa["tests"].items():
        items = res if isinstance(res, list) else [res]
        bad = [i for i in items if not i.get("pass")]
        print("  %-22s %s" % (test, "ok" if not bad else "FAILED %d/%d" % (len(bad), len(items))))
    print("  look at:", os.path.join(out, "qa"), "and", os.path.join(out, "reference_sheets"))

    if args.install:
        dest = os.path.join(BIOMES, name + "_Biome_Pack.zip")
        if os.path.exists(dest) and not args.force:
            sys.exit("%s exists (use --force to replace it)" % dest)
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
            for base, _, files in os.walk(out):
                for fn in files:
                    p = os.path.join(base, fn)
                    z.write(p, os.path.join(name + "_Biome_Pack", os.path.relpath(p, out)).replace(os.sep, "/"))
        print("install:", dest)
        r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "process_assets.py"), "biomes", name.lower()], cwd=ROOT)
        if r.returncode:
            sys.exit("import failed")
        print("done: assets/tiles/%s/. Point biomes at it: ART.<biome> = { pack: '%s' } in src/data/biomes.js" % (name.lower(), name.lower()))


if __name__ == "__main__":
    main()
