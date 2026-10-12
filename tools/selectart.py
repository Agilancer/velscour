"""
Class-select portraits: slices assets/FinalClasses/All 16 Classes.png into one transparent portrait per class.

    python3 tools/process_assets.py select

The sheet is a 4 x 4 grid of heroes on pure black with a name plaque under each. The plaques sit on (and hide)
the bottom of some boots, so each plaque is erased and the hero is cut off flat at the plaque's top edge. The
class-select card draws its own plaque over the hero's feet, the same way the sheet does
(src/ui/screens.js). `cut` marks heroes whose boots end in that flat edge.

Output (generated; never hand-edit): assets/sprites/select/<class>.webp and select.json ({w, h, cut}).
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "FinalClasses", "All 16 Classes.png")
OUT = os.path.join(ROOT, "assets", "sprites", "select")

CLASS_IDS = [
    "paladin", "ranger", "wizard", "necromancer",
    "barbarian", "dragoon", "totem_master", "death_knight",
    "arcane_sorcerer", "carrion_witch", "bard", "slime_lord",
    "boomerang_knight", "lancer", "dragon_knight", "gunner",
]
COLS = [(0, 313), (313, 627), (627, 940), (940, 1254)]
# per row: top of the hero area, then the name plaque's top and bottom rows
ROWS = [(60, 340, 365), (366, 638, 663), (664, 916, 942), (943, 1212, 1238)]
DARK = 12                   # a pixel whose brightest channel is above this is not backdrop


def plaque_span(m, yb, x0, x1):
    """x extent of the plaque(s) in one cell: the bottom border is the only thing on the plaque's last rows."""
    xs = np.nonzero(m[yb - 2:yb + 1, x0:x1].any(axis=0))[0]
    return x0 + xs.min(), x0 + xs.max() + 1


def process_select_art():
    rgb = np.asarray(Image.open(SRC).convert("RGB"))
    m = rgb.max(axis=2) > DARK
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for ri, (top, yt, yb) in enumerate(ROWS):
        for ci, (x0, x1) in enumerate(COLS):
            cid = CLASS_IDS[ri * 4 + ci]
            px0, px1 = plaque_span(m, yb, x0, x1)
            sub = m[top:yt, x0:x1].copy()           # the hero stops where the plaque starts
            lab, n = ndimage.label(sub, structure=np.ones((3, 3)))
            sizes = ndimage.sum(sub, lab, range(1, n + 1))
            objs = ndimage.find_objects(lab)
            big = int(np.argmax(sizes))
            bs = objs[big]
            keep = np.zeros_like(sub)
            for i, s in enumerate(objs):            # the body plus sizeable bits inside its box (drips, sparks)
                if i == big or (sizes[i] > 30 and s[0].start >= bs[0].start - 20 and s[1].start >= bs[1].start - 20
                                and s[1].stop <= bs[1].stop + 20):
                    keep |= lab == i + 1
            keep = ndimage.binary_fill_holes(keep)
            img = Image.fromarray(np.dstack([rgb[top:yt, x0:x1], np.where(keep, 255, 0).astype(np.uint8)]), "RGBA")
            bbox = img.getbbox()
            img = img.crop(bbox)
            img.save(os.path.join(OUT, cid + ".webp"), "WEBP", quality=92, method=6)
            # cut: the plaque hid part of the boots, so the hero ends in a flat edge the card must cover
            meta[cid] = {"w": img.width, "h": img.height, "cut": bool(keep[-1, px0 - x0:px1 - x0].any())}
    with open(os.path.join(OUT, "select.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("select portraits:", len(meta))


if __name__ == "__main__":
    process_select_art()
