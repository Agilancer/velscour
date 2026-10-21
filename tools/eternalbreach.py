#!/usr/bin/env python3
"""
THE ETERNAL BREACH (docs/ETERNAL_BREACH.md): import the user's two Breach uploads into the game.

    python tools/eternalbreach.py [packs] [creatures]      (both when no argument)

- packs: the two biome packs (the 160 x 80 template, tools/biomepack.py) as they were uploaded, unzipped:
  assets/The_Eternal_Breach_Expanded_Pack/The_Eternal_Breach (the revised scatter) -> assets/tiles/eternal_breach/,
  assets/The_Eternal_Breach_Expanded_Pack/The_Veilscar_March -> assets/tiles/veilscar_march/.
- creatures: the 200 monsters and 30 bosses (Creatures/, one PNG each, catalogue.json) are copied to
  assets/source/enemies/breach/<sheet>/ (five sheets of 40 monsters and one of the bosses, file name order = catalogue
  order), packed by process_assets.py like enemy set 2, and listed in src/data/breachroster.js (generated: name, AI
  archetype, drawn height and flags per creature). The archetype comes from the creature's name and description.
"""
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
EXP = os.path.join(ROOT, "assets", "The_Eternal_Breach_Expanded_Pack")
SRC = os.path.join(ROOT, "assets", "source", "enemies", "breach")

# AI archetype by keywords in the name (first match wins), then in the description
RULES = [
    (r"\b(bat|moth|rook|kite|gull|vulture|puffin|harrier|wasp|needlefly|shiverwing|ray|cicada|heron)\b|wing", "bat"),
    (r"widow|spider|spinner|arachn", "spider"),
    (r"scorpion", "scorpion"),
    (r"hound|wolf|jackal|fox|mastiff|lion|loper|stalker|prowler|harrier|ferret|hare|ape", "hound"),
    (r"stag|elk|ram|boar|calf|tapir|grazer|staglet|behemoth|rammer", "knight"),
    (r"gazer|eye|witness|lantern ray", "eye"),
    (r"worm|wurm|eel|lamprey|leech|larva|grub|slug|snail|centipede|millipede|wyrm|burrower|tunneler|newt|snake|mole", "worm"),
    (r"mantis|crab|tick|earwig|beetle|bug|skitterer|scuttler|crawler|mite|pangolin|turtle|tortoise|carapace", "scorpion"),
    (r"puffball|spore|morel|mold|fung|bloom|cap\b|blossom|mycel|blistercap|festerbloom|rotfen|bilegut|hatcher", "shroom"),
    (r"golem|hulk|colossus|brute|devourer|tyrant|chimera|amalgam|mimic|behemoth|beast|horror|walker", "abomination"),
    (r"toad|croaker|lizard|salamander|basilisk|drake", "ghoul"),
    (r"shade|choir|wail|mourner|dirge|chorus|echo|afterimage|whistle|bellwether|unheard|quietus|vigil", "wraith"),
    (r"gargoyle|idol|pillar|archback|niche|mortar|anvil|vault|door|sepulcher|cryptstone|marble|obsidian|quartz|rubble", "gargoyle"),
    (r"maw|jaw|mouth|eater|tongue", "ghoul"),
]
BOSS_ARCH = ["abomination", "golem", "demon", "worm", "abomination", "spider"]
FLY = re.compile(r"\b(bat|moth|rook|kite|gull|vulture|puffin|harrier|wasp|needlefly|ray|heron|cicada|hovering|floating)\b|wing|shiverwing", re.I)
BONE = re.compile(r"bone|ossuary|skull|marrow|rib|skelet|grave|coffin|crypt|tomb|charnel|sepulcher|reliquary|corpse", re.I)
STONE = re.compile(r"stone|marble|obsidian|quartz|pillar|gargoyle|idol|mortar|anvil|vault|rubble|cryptstone|door|glass", re.I)
GOO = re.compile(r"spore|fung|mold|bile|slug|leech|grub|larva|puff|rot|fester|morel|ooze", re.I)


CASTERS = re.compile(r"lantern|choir|bell|gazer|witness|echo|parallax|recursion|paradox|non-euclid|fold|angle|horizon|mirror|wrong|"
                     r"inside|unmoored|distance|knot|unwound|missing|beyond|quiet|far-side|impossible|backwards|split-shadow", re.I)


def arch_of(m):
    a = _arch(m)
    if a == "abomination" and m["size_tier"] != "brute":
        a = "demon"  # a beast of ordinary size: a lighter brute
    # the breach-warped families throw violet magic: their bodies' melee archetypes become casters and beamers
    if m["family"] in ("Breachborn Geometry", "Uncanny Breach Anatomy", "Echo and Veil Beasts") and CASTERS.search(m["name"]) \
            and a in ("ghoul", "hound", "demon", "knight", "scorpion", "worm"):
        a = "eye" if re.search(r"gaz|eye|horizon|mirror", m["name"], re.I) else "cultist" if m["size_tier"] == "medium" else "wraith"
    return a


def _arch(m):
    for rx, arch in RULES:
        if re.search(rx, m["name"], re.I):
            return arch
    for rx, arch in RULES:
        if re.search(rx, m["description"], re.I):
            return arch
    return "ghoul"


def import_packs():
    from biomepack import import_pack
    import_pack([os.path.join(EXP, "The_Eternal_Breach")], "eternal_breach")
    import_pack([os.path.join(EXP, "The_Veilscar_March")], "veilscar_march")


def import_creatures():
    cat = json.load(open(os.path.join(EXP, "Creatures", "catalogue.json")))
    if os.path.isdir(SRC):
        shutil.rmtree(SRC)
    rows = []
    groups = [("m%d" % (k // 40 + 1), k % 40, m) for k, m in enumerate(cat["monsters"])] + [("bosses", k, b) for k, b in enumerate(cat["bosses"])]
    for sheet, i, m in groups:
        d = os.path.join(SRC, sheet)
        os.makedirs(d, exist_ok=True)
        shutil.copyfile(os.path.join(EXP, "Creatures", m["file"]), os.path.join(d, "%03d_%s.png" % (i, m["id"].lower())))
        boss = m["kind"] == "boss"
        text = m["name"] + " " + m["description"]
        arch = BOSS_ARCH[(int(m["id"][-3:]) - 1) % len(BOSS_ARCH)] if boss else arch_of(m)
        tier = m["size_tier"]
        # drawn height in world px (heroes are ~60): small 40, medium 54, brute 70; bosses 62-90 (x1.9 as guardians)
        h = round(62 + (m["height_ap"] - 176) * 0.3) if boss else {"small": 40, "medium": 54, "brute": 70}[tier]
        flags = {}
        if FLY.search(text) and arch in ("bat", "eye", "wraith"):
            flags["fly"] = 1
        flags["gore"] = "bone" if BONE.search(text) else "rock" if STONE.search(text) else "goo" if GOO.search(text) else "flesh"
        if tier == "brute" and not boss:
            flags["brute"] = 1
        rows.append([m["id"], "breach/" + sheet, i, m["name"], m["family"], arch, h, flags])
    from process_assets import process_enemies
    process_enemies(["breach"])
    out = os.path.join(ROOT, "src", "data", "breachroster.js")
    with open(out, "w") as f:
        f.write("// GENERATED by tools/eternalbreach.py from the Breach upload's Creatures/catalogue.json: do not edit by hand.\n")
        f.write("// [id, sheet, cell, name, family, AI archetype, drawn height (world px), flags]\n")
        f.write("export const BREACH_ROSTER = [\n")
        for r in rows:
            f.write("  " + json.dumps(r, separators=(", ", ": ")) + ",\n")
        f.write("];\n")
    from collections import Counter
    print("archetypes:", Counter(r[5] for r in rows if not r[0].startswith("ETB-B")))


if __name__ == "__main__":
    args = sys.argv[1:] or ["packs", "creatures"]
    if "packs" in args:
        import_packs()
    if "creatures" in args:
        import_creatures()
