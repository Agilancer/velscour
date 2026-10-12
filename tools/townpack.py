#!/usr/bin/env python3
"""
Town pack: import the "Overworld and Town" biome pack into the town of Duskhollow.

    python3 tools/process_assets.py town

Reads assets/source/biomes/town/Overworld_Town_Biome_Pack-*.zip (one pack split in parts to fit GitHub's upload
limit; files that repeat across parts are read once) and writes assets/tiles/town/:
- ground.webp: the six transition base floors (grass, gravel, dirt, mud, stone, concrete), a few extra
  self-seamless floors, and all 15 x 8 transition tiles, each 160 x 80 as drawn.
- objects.webp: whole buildings, composed here from the pack's pieces by the pack's 2 x 2 roof recipe (walls as
  directed panels with corner pillars, a door, windows, unlit torches, a shop sign, gable infills, the roof), plus
  the 18 trees and 40 scatter props. Each is cropped and keeps its ground pivot.
- town.json: {floors: {name: [x, y]}, transitions: {'a__b': [[x, y] x 8]}, objects: {name: [x, y, w, h, ox, oy]},
  lights: {building: [[ox, oy], ...]} (the torch heads), footprints: {name: [fu, fv]}}. ox/oy are native px from
  the ground pivot; a building's pivot is its centre and its walls stand 1 tile out from it.
"""
import io
import json
import os
import zipfile
from glob import glob

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "biomes", "town")
OUT = os.path.join(ROOT, "assets", "tiles", "town")

BASES = {"grass": "floor_01", "gravel": "floor_13", "dirt": "floor_21", "mud": "floor_22", "stone": "floor_33",
         "concrete": "floor_41"}
EXTRA_FLOORS = ["floor_02", "floor_07", "floor_34", "floor_36", "floor_51"]
ROOFS = {"oak": "roof_01_oak_shingles", "slate": "roof_02_blue_slate", "terracotta": "roof_03_terracotta",
         "thatch": "roof_04_straw_thatch"}
# Buildings: wall family, roof, roof kind, ridge direction (SE: along u, SW: along v), door face (SE: the +v face,
# NE: the +u face), door design, window design, torch design, shop sign.
BUILDINGS = {
    "weapons": ("town_brick", "slate", "gable", "SW", "SE", 2, 2, 7, "fletcher"),
    "armor": ("fieldstone", "slate", "hip", "SE", "SE", 2, 8, 2, "armorer"),
    "upgrade": ("fieldstone", "terracotta", "gable", "SW", "SE", 4, 3, 7, "blacksmith"),
    "enchant": ("dressed_limestone", "slate", "gable", "SE", "SE", 3, 4, 6, "spells"),
    "alchemist": ("wattle_daub", "thatch", "gable", "SE", "NE", 5, 3, 5, "apothecary"),
    "gems": ("dressed_limestone", "terracotta", "hip", "SE", "NE", 3, 7, 6, "jeweler"),
    "socket": ("oak_plaster", "oak", "gable", "SW", "NE", 1, 1, 1, "general_goods"),
    "gamble": ("pine_siding", "oak", "gable", "SE", "NE", 1, 6, 8, "tavern"),
    "inn": ("oak_plaster", "terracotta", "gable", "SE", "SE", 1, 1, 2, "inn"),
    "bakery": ("town_brick", "oak", "hip", "SE", "NE", 5, 5, 1, "bakery"),
    "stables": ("pine_siding", "thatch", "gable", "SW", "SE", 5, 3, 1, "stables"),
    "cottage": ("wattle_daub", "thatch", "hip", "SE", "SE", 5, 3, 5, None),
}
FACE = {"SE": ((0, 1), (1, 0)), "NE": ((1, 0), (0, 1)), "NW": ((0, -1), (1, 0)), "SW": ((-1, 0), (0, 1))}


class Pack:
    def __init__(self):
        self.files = {}
        for zp in sorted(glob(os.path.join(SRC, "Overworld_Town_Biome_Pack*.zip"))):
            z = zipfile.ZipFile(zp)
            for n in z.namelist():
                key = n.split("Overworld_Town_Biome_Pack/", 1)[-1]
                if key and not n.endswith("/") and key not in self.files:
                    self.files[key] = (z, n)
        man = json.loads(self.read("manifest.json"))
        self.assets = {a["id"]: a for a in man["assets"]}
        self.cache = {}

    def read(self, key):
        z, n = self.files[key]
        return z.read(n)

    def find(self, prefix):
        return next(i for i in self.assets if i.startswith(prefix))

    def img(self, aid):
        if aid not in self.cache:
            self.cache[aid] = Image.open(io.BytesIO(self.read(self.assets[aid]["file"]))).convert("RGBA")
        return self.cache[aid]


def compose(pk, name, spec):
    wall, roofm, kind, ridge, door_face, door_d, win_d, torch_d, sign = spec
    C = 1400
    can = Image.new("RGBA", (C, C))
    org = (C // 2, C // 2 + 200)
    fam_id = next(i for i in pk.assets if i.startswith("wall_") and pk.assets[i].get("wall_set") == wall).rsplit("_" + wall, 1)[0] + "_" + wall
    lights = []

    def put(aid, u, v, z=0):
        a = pk.assets[aid]
        im = pk.img(aid)
        x = round(org[0] + 80 * (u - v) - a["pivot_px"][0])
        y = round(org[1] + 40 * (u + v) - z - a["pivot_px"][1])
        can.alpha_composite(im, (x, y))
        return x, y, a

    # panels: back faces first, then the visible +u / +v faces
    faces = [("NW", [(-0.5, -1), (0.5, -1)]), ("SW", [(-1, -0.5), (-1, 0.5)]),
             ("SE", [(-0.5, 1), (0.5, 1)]), ("NE", [(1, -0.5), (1, 0.5)])]
    door_slot = (0.5, 1) if door_face == "SE" else (1, 0.5)
    door_id = next(i for i in pk.assets if i.startswith(f"door_{door_d:02}_") and i.endswith(f"_{door_face}_closed"))
    win_pre = f"window_{win_d:02}_"
    torch_pre = f"torch_{torch_d:02}_"
    # pillars at the back corners first, then panels, front corners last
    put(f"{fam_id}_pillar", -1, -1)
    for d, slots in faces:
        for (u, v) in slots:
            if (u, v) == door_slot:
                continue
            put(f"{fam_id}_panel_{d}", u, v)
        if d == "SW":
            put(f"{fam_id}_pillar", 1, -1); put(f"{fam_id}_pillar", -1, 1)
    put(f"{fam_id}_pillar", 1, 1)
    put(door_id, *door_slot)
    # windows on the visible panels without the door; torches beside the door
    for d, slots in faces[2:]:
        for (u, v) in slots:
            if (u, v) == door_slot:
                continue
            wid = next(i for i in pk.assets if i.startswith(win_pre) and i.endswith("_" + d))
            put(wid, u, v)
    other = (-0.5, 1) if door_face == "SE" else (1, -0.5)
    tid = next(i for i in pk.assets if i.startswith(torch_pre) and i.endswith("_" + door_face))
    # torch on the door's wall, between the door and the window (at the panel joint, the wall's middle)
    mid = (0, 1) if door_face == "SE" else (1, 0)
    x, y, a = put(tid, *mid)
    b = a["alpha_bounds_px"]
    lights.append([x + (b[0] + b[2]) / 2 - org[0], y + b[1] + 2 - org[1]])
    # roof: gable infills under the open ends, then the roof
    rid = f"{ROOFS[roofm]}_{kind}_2x2_{ridge}"
    if kind == "gable":
        ends = [("SW", -1, 0), ("NE", 1, 0)] if ridge == "SE" else [("NW", 0, -1), ("SE", 0, 1)]
        for d, u, v in ends:
            put(next(i for i in pk.assets if i.startswith("gable_") and pk.assets[i].get("wall_set") == wall and i.endswith("_" + d)), u, v)
    put(rid, 0, 0)
    if sign:
        sid = next(i for i in pk.assets if i.startswith("sign_") and f"_{sign}_projecting_{door_face}" in i)
        put(sid, *other)
    bb = can.getbbox()
    return can.crop(bb), bb[0] - org[0], bb[1] - org[1], lights


def pack_rows(items, width):
    """Shelf-pack [(name, img)] -> {name: (x, y)}, total height."""
    x = y = rowh = 0
    pos = {}
    for n, im in sorted(items, key=lambda t: -t[1].height):
        if x + im.width > width:
            x, y, rowh = 0, y + rowh + 2, 0
        pos[n] = (x, y)
        x += im.width + 2
        rowh = max(rowh, im.height)
    return pos, y + rowh


def process_town_pack():
    pk = Pack()
    os.makedirs(OUT, exist_ok=True)
    meta = {"tile": [160, 80], "floors": {}, "transitions": {}, "objects": {}, "lights": {}, "footprints": {}}
    # ground
    tiles = []
    for n, pre in BASES.items():
        tiles.append((n, pk.img(pk.find(pre + "_"))))
    for pre in EXTRA_FLOORS:
        aid = pk.find(pre + "_")
        tiles.append((aid.split("_", 2)[2], pk.img(aid)))
    trans = sorted(i for i in pk.assets if i.startswith("transition_"))
    for aid in trans:
        tiles.append((aid, pk.img(aid)))
    cols = 16
    gimg = Image.new("RGBA", (cols * 160, ((len(tiles) + cols - 1) // cols) * 80))
    for k, (n, im) in enumerate(tiles):
        x, y = (k % cols) * 160, (k // cols) * 80
        gimg.alpha_composite(im, (x, y))
        if n.startswith("transition_"):
            pair, shape = n[len("transition_"):].split("_0", 1)
            meta["transitions"].setdefault(pair, [None] * 8)[int(shape[0]) - 1] = [x, y]
        else:
            meta["floors"][n] = [x, y]
    gimg.save(os.path.join(OUT, "ground.webp"), quality=92, alpha_quality=100, method=6)
    # objects
    objs = []
    for name, spec in BUILDINGS.items():
        im, ox, oy, lights = compose(pk, name, spec)
        objs.append(("b_" + name, im, ox, oy))
        meta["lights"]["b_" + name] = lights
    for aid, a in pk.assets.items():
        if a["category"] not in ("trees", "scatter"):
            continue
        im = pk.img(aid)
        bb = im.getbbox()
        name = aid.split("_", 2)[2] if a["category"] == "scatter" else aid.split("_", 3)[3]
        name = ("t_" if a["category"] == "trees" else "") + name
        objs.append((name, im.crop(bb), bb[0] - a["pivot_px"][0], bb[1] - a["pivot_px"][1]))
        meta["footprints"][name] = a.get("footprint_tiles_estimate", [0.4, 0.4])
    pos, h = pack_rows([(n, im) for n, im, _, _ in objs], 2400)
    oimg = Image.new("RGBA", (2400, h))
    for n, im, ox, oy in objs:
        x, y = pos[n]
        oimg.alpha_composite(im, (x, y))
        meta["objects"][n] = [x, y, im.width, im.height, ox, oy]
    oimg.save(os.path.join(OUT, "objects.webp"), quality=92, alpha_quality=100, method=6)
    with open(os.path.join(OUT, "town.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    print(f"town: {len(tiles)} ground tiles {gimg.size}, {len(objs)} objects {oimg.size}")


if __name__ == "__main__":
    process_town_pack()
