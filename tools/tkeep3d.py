#!/usr/bin/env python3
"""
Tessariel's Keep art (docs/TESSARIELS_KEEP.md).

    python tools/tkeep3d.py textures <vesperwrithe>          # stone, limestone, flagstones -> assets/source/tkeep/tex/
    python tools/tkeep3d.py decor <bellmourn> <vesperwrithe> # banners, stained glass, rugs -> assets/tiles/tkeep/decor/
    node tools/tkeep3d_bake.js                                # three.js bake -> assets/source/tkeep/out/ (PNG pages + index)
    python tools/tkeep3d.py pack                              # out/ -> assets/tiles/tkeep/ (lossless WebP + index.json)
    node tools/tkeep3d_bake.js elders                         # only the Elders' sprites -> out/elders.png + elders.json
    python tools/tkeep3d.py elders                            # -> assets/tiles/tkeep/elders.webp, their index entries on it

<vesperwrithe> and <bellmourn> are clones of the user's other repos (github.com/Agilancer/vesperwrithe, .../Bellmourn);
only what they lend is kept here. The rule of those games holds here too: T (Tessariel) never stands near V (Velscour),
so no V banner, no V window and none of the glass that shows Velscour's victory comes into the keep.
"""
import json
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX = os.path.join(ROOT, "assets", "source", "tkeep", "tex")
OUTSRC = os.path.join(ROOT, "assets", "source", "tkeep", "out")
OUT = os.path.join(ROOT, "assets", "tiles", "tkeep")
DECOR = os.path.join(OUT, "decor")

PV = "assets/citystatephobos"
TEXTURES = {   # name: (file under vesperwrithe, size)
    "stone": (PV + "/Bellmourn_Phobos_Velscour_Batch_01/textures/06_keep_dressed_stone/BM_PV_021_keep_dressed_stone_A_Color.png", 512),
    "stone2": (PV + "/Bellmourn_Phobos_Velscour_Batch_01/textures/06_keep_dressed_stone/BM_PV_022_keep_dressed_stone_B_Color.png", 512),
    "lime": (PV + "/Bellmourn_Phobos_Velscour_Batch_01/textures/05_interior_limestone/BM_PV_017_limestone_interior_A_Color.png", 512),
    "plinth": (PV + "/Bellmourn_Phobos_Velscour_Batch_01/textures/07_rusticated_plinth/BM_PV_025_rusticated_plinth_A_Color.png", 512),
    "setts": (PV + "/Bellmourn_Phobos_Velscour_Batch_01/textures/08_courtyard_setts/BM_PV_029_courtyard_setts_A_Color.png", 512),
    "flags": (PV + "/Bellmourn_Phobos_Velscour_Batch_01/textures/09_hall_flagstones/BM_PV_033_hall_flagstones_A_Color.png", 512),
    "carved": (PV + "/Bellmourn_Phobos_Interior_Batch_02/textures/BM_PV_046_carved_stone_Color.png", 512),
    "ashlar": (PV + "/Bellmourn_Phobos_Interior_Batch_02/textures/BM_PV_049_chalk_ashlar_Color.png", 512),
}

# Banners: Tessariel's own (his T on blue and gold), the holy orders' and the free towns'. Bellmourn's eight velscour_*
# banners and vesperwrithe's V banners stay out.
BANNERS = [
    ("tess_a", "vw", "assets/game/glass/tess_a_0.webp", "Tessariel's Azure"),
    ("tess_a1", "vw", "assets/game/glass/tess_a_1.webp", "Tessariel's Ivory"),
    ("tess_b", "vw", "assets/game/glass/tess_b_0.webp", "The Ember's Blue"),
    ("tess_b1", "vw", "assets/game/glass/tess_b_1.webp", "The Ember's White"),
    ("holy_azure_sunburst", "bm", "assets/textures/banners/holy_azure_sunburst.png", "Azure Sunburst"),
    ("holy_winged_star", "bm", "assets/textures/banners/holy_winged_star.png", "Winged Star"),
    ("holy_harvest", "bm", "assets/textures/banners/holy_harvest.png", "Harvest of the Flame"),
    ("holy_lilies", "bm", "assets/textures/banners/holy_lilies.png", "Lilies of the Ninth Bell"),
    ("holy_open_hands", "bm", "assets/textures/banners/holy_open_hands.png", "The Open Hands"),
    ("holy_verdant_cross", "bm", "assets/textures/banners/holy_verdant_cross.png", "Verdant Cross"),
    ("town_eagle", "bm", "assets/textures/banners/town_eagle.png", "The White Eagle"),
    ("town_stag", "bm", "assets/textures/banners/town_stag.png", "The Green Stag"),
    ("town_ram", "bm", "assets/textures/banners/town_ram.png", "The Mountain Ram"),
    ("town_ship", "bm", "assets/textures/banners/town_ship.png", "The Lampwardens' Ship"),
    ("town_bridge", "bm", "assets/textures/banners/town_bridge.png", "The Sunlit Bridge"),
    ("town_tower_and_keys", "bm", "assets/textures/banners/town_tower_and_keys.png", "Tower and Keys"),
]
# Stained glass: the panes where the angels win (vesperwrithe's README: glass_a_1, glass_b_1 and glass_e_1 are Velscour's,
# his angels beaten down; glass_c_1 and the rose put him over them too). None of those come here.
GLASS = [
    ("glass_a", "assets/game/glass/glass_a_0.webp", "The Host of Dawn"),
    ("glass_b", "assets/game/glass/glass_b_0.webp", "The Silver Wings"),
    ("glass_c", "assets/game/glass/glass_c_0.webp", "The Gilded Charge"),
    ("glass_d", "assets/game/glass/glass_d_0.webp", "The Last Light"),
    ("glass_e", "assets/game/glass/glass_e_0.webp", "The Choir of Spears"),
    ("glass_d1", "assets/game/glass/glass_d_1.webp", "Dawn over the Pit"),
]
RUGS = [
    ("blue_wool", "BM_PV_079_blue_wool", "Azure Wool"), ("gold_wool", "BM_PV_082_gold_wool", "Gilded Wool"),
    ("blue_geometric", "BM_PV_080_blue_geometric", "Lampwarden Blue"), ("forest_wool", "BM_PV_077_forest_wool", "Forest Wool"),
    ("green_floral", "BM_PV_078_green_floral", "Verdant Floral"), ("red_gothic", "BM_PV_075_red_gothic", "Crimson Tracery"),
    ("heraldic", "BM_PV_088_heraldic", "Heraldic Field"), ("geometric_rug", "BM_PV_090_geometric_rug", "Pilgrim's Rug"),
    ("ivory_wool", "BM_PV_085_ivory_wool", "Ivory Wool"), ("plum_wool", "BM_PV_081_plum_wool", "Plum Wool"),
    ("wine_wool", "BM_PV_072_wine_wool", "Wine Wool"), ("red_floral", "BM_PV_073_red_floral", "Rose Floral"),
]


def textures(vw):
    os.makedirs(TEX, exist_ok=True)
    for name, (rel, size) in TEXTURES.items():
        im = Image.open(find(os.path.join(vw, PV), os.path.basename(rel).replace("_Color.png", ""))).convert("RGB").resize((size, size), Image.LANCZOS)
        im.save(os.path.join(TEX, name + ".png"), optimize=True)
        print("tex", name, size)


def find(root, stem):
    for d, _, fs in os.walk(root):
        for f in fs:
            if f.startswith(stem) and f.endswith("_Color.png"):
                return os.path.join(d, f)
    raise FileNotFoundError(stem)


def atlas(items, cell):
    """Pack images (name, Image) into one row-major atlas of cells; returns the atlas and [x, y, w, h] per name."""
    cols = max(1, min(len(items), 2048 // cell[0]))
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell[0], rows * cell[1]), (0, 0, 0, 0))
    rects = {}
    for k, (name, im) in enumerate(items):
        im = im.copy()
        im.thumbnail(cell, Image.LANCZOS)
        x, y = (k % cols) * cell[0], (k // cols) * cell[1]
        sheet.alpha_composite(im, (x, y))
        rects[name] = [x, y, im.width, im.height]
    return sheet, rects


def trim(im):
    bb = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def decor(bm, vw):
    os.makedirs(DECOR, exist_ok=True)
    meta = {"banners": [], "glass": [], "rugs": []}
    # banners: 128 x 256 cells (their own aspect kept), trimmed to the cloth
    items = []
    for bid, src, rel, name in BANNERS:
        im = Image.open(os.path.join(bm if src == "bm" else vw, rel)).convert("RGBA")
        items.append((bid, trim(im)))
        meta["banners"].append({"id": bid, "name": name})
    sheet, rects = atlas(items, (128, 256))
    sheet.save(os.path.join(DECOR, "banners.webp"), quality=92, method=6)
    for b in meta["banners"]:
        b["r"] = rects[b["id"]]
    # stained glass: 112 x 232 cells
    items = []
    for gid, rel, name in GLASS:
        im = trim(Image.open(os.path.join(vw, rel)).convert("RGBA"))
        items.append((gid, im))
        meta["glass"].append({"id": gid, "name": name})
    sheet, rects = atlas(items, (112, 232))
    sheet.save(os.path.join(DECOR, "glass.webp"), quality=92, method=6)
    for g in meta["glass"]:
        g["r"] = rects[g["id"]]
    # rugs: 192 px swatches (seamless), tiled across a runner at runtime
    items = []
    for rid, stem, name in RUGS:
        im = Image.open(find(os.path.join(vw, PV), stem)).convert("RGBA").resize((192, 192), Image.LANCZOS)
        items.append((rid, im))
        meta["rugs"].append({"id": rid, "name": name})
    sheet, rects = atlas(items, (192, 192))
    sheet.save(os.path.join(DECOR, "rugs.webp"), quality=90, method=6)
    for r in meta["rugs"]:
        r["r"] = rects[r["id"]]
    json.dump(meta, open(os.path.join(DECOR, "decor.json"), "w"), separators=(",", ":"))
    print("decor: %d banners, %d windows, %d rugs" % (len(meta["banners"]), len(meta["glass"]), len(meta["rugs"])))


def pack():
    os.makedirs(OUT, exist_ok=True)
    idx = json.load(open(os.path.join(OUTSRC, "index.json")))
    if os.path.exists(os.path.join(OUT, "elders.webp")):   # a whole bake has the Elders on its own pages
        os.remove(os.path.join(OUT, "elders.webp"))
    for p in idx["pages"]:
        Image.open(os.path.join(OUTSRC, p + ".png")).save(os.path.join(OUT, p + ".webp"), lossless=True, quality=100, method=6)
    idx["pages"] = [p + ".webp" for p in idx["pages"]]
    json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
    kb = sum(os.path.getsize(os.path.join(OUT, p)) for p in idx["pages"]) // 1024
    print("tkeep: %d pages (%d KB), %d pieces, %d sprites" % (len(idx["pages"]), kb, len(idx["pieces"]), len(idx.get("sprites", {}))))


def elders():
    """The Elders' sprites re-baked alone (tkeep3d_bake.js elders) onto a page of their own beside the hall's: their
    entries in index.json point there; the hall's pages and the old sprites' pixels on them stay as they are."""
    idx = json.load(open(os.path.join(OUT, "index.json")))
    new = json.load(open(os.path.join(OUTSRC, "elders.json")))["sprites"]
    name = "elders.webp"
    Image.open(os.path.join(OUTSRC, "elders.png")).save(os.path.join(OUT, name), lossless=True, quality=100, method=6)
    if name not in idx["pages"]:
        idx["pages"].append(name)
    pg = idx["pages"].index(name)
    for k, v in new.items():
        v["f"] = [[pg] + f[1:] for f in v["f"]]
        idx["sprites"][k] = v
    json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
    print("tkeep elders: %d sprites on %s (page %d, %d KB)" % (len(new), name, pg, os.path.getsize(os.path.join(OUT, name)) // 1024))


if __name__ == "__main__":
    a = sys.argv[1:]
    cmd = a[0] if a else ""
    if cmd == "textures" and len(a) > 1:
        textures(a[1])
    elif cmd == "decor" and len(a) > 2:
        decor(a[1], a[2])
    elif cmd == "pack":
        pack()
    elif cmd == "elders":
        elders()
    else:
        sys.exit(__doc__)
