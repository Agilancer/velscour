# ChatGPT art kits: enemies, bosses, pets, NPCs, armor

Five kits in `docs/art_kits/`, one zip per art type, built the same way as the biome kit
([CHATGPT_BIOME_SPRITES.md](CHATGPT_BIOME_SPRITES.md)). Each zip holds everything ChatGPT needs to draw new art in the
game's style and layout, plus the script that brings the result into the game:

| Zip | Per sheet | Templates | Examples (the game's own art) |
|---|---|---|---|
| `ChatGPT_Enemy_Kit.zip` | 10 monsters, one still pose each | 5 x 2 cells | ten set 2 monsters |
| `ChatGPT_Boss_Kit.zip` | 6 bosses, 512 x 512 cells | 3 x 2 cells | titans, colossi, a drake, a hydra |
| `ChatGPT_Pet_Kit.zip` | 4 animated pets | land: 9 frames (rest, spawn 1-3, run 1-3, attack 1-2); winged: 6 (flap 1-3, fly 1-3) | Wolf, Bear, Skeleton Warrior, Fire Golem; Storm Hawk, Raven, Phoenix, Drake Whelp |
| `ChatGPT_NPC_Kit.zip` | 4 animated townsfolk | 11 frames (idle 1-3, walk 1-2, dying, dead, scream, point, happy, cheer); knights 13 (+ attack 1-2) | Baker, Healer, Boy, King; Sir Aldric, Dame Maeve |
| `ChatGPT_Armor_Kit.zip` | 5 body armors for one class | one per class (16): the class's hero (armor 001) and name on the left, a good Legendary example (armor 068) under it, five empty 2x frames | the same sheets with five of the class's armors filled in; `classes_overview.png` |

Every zip contains:
- `README_prompts.md`: what the sheet is for, the style bible to paste first, the prompt per sheet, the prompt that
  fills in the names file, the import commands and a checklist for the reply.
- `templates/`: 1536 x 1024 sheets on flat magenta. Cyan dashed boxes are the bounding outlines, yellow lines are the
  ground (feet) lines; animated sheets name each frame along the top and each character down the left.
- `examples/`: the same layouts filled with art from the game.
- `<kind>_names_template.json`: names, AI archetype, height, element, rarity... for ChatGPT to fill in.
- `chatgpt_art.py`: a copy of the importer.

## Workflow
1. New ChatGPT chat: paste the style bible from the kit's README.
2. Attach the template and its example, paste the sheet prompt (fill in the brackets). One sheet per message.
3. Ask ChatGPT to fill in the names file (prompt in the README) and save its JSON.
4. Import from the repo root:
   ```bash
   python tools/chatgpt_art.py <enemies|bosses|pets|npcs|armor> <sheet.png> <names.json> --dry
   python tools/chatgpt_art.py <enemies|bosses|pets|npcs|armor> <sheet.png> <names.json>
   ```
   `--dry` only cuts the sheet and writes `tools/tests/out/chatgpt_art/preview.png`; look at it first.

## What the importer does (`tools/chatgpt_art.py`)
It keys out the magenta (or real transparency, or any flat border colour), takes the magenta out of edge pixels, and
gives every piece of art to the cell its centre falls in: per cell the largest piece plus the pieces close to it
or big enough (sparks, tails, weapons). Labels, guides and the label column/header are outside the cells and ignored.
A sheet of another size with the same 3:2 shape is rescaled.

- **enemies / bosses**: one square PNG per monster in `assets/source/enemies/set3/<family>/ene_NNN_<id>.png`
  (numbered after the highest existing `ene_`), then `process_assets.py enemies set3` packs the atlas. It prints one
  `BESTIARY` row per monster for `src/data/bestiary.js` (`sheet: 'set3/<family>'`, `i` = file order in the folder;
  bosses get `boss: true, lone: true`). Ids already in the bestiary get the family as a suffix.
- **pets**: a clean, label-free sheet `assets/source/pet_animations/chatgpt_<sheet>.png` and its layout in
  `chatgpt_sheets.json`, which `tools/build_pet_animations.py` merges into its `SHEETS`/`LAYOUT`; it then rebuilds the
  atlases. `src/core/petart.js` registers rows it finds only in `catalog.json`, so any summon whose `SUMMONS` key
  equals a row key animates (the script prints stub entries). Keys already used by another sheet are refused.
- **npcs**: one scale per person from the first idle pose (adults 169 px tall, children 128, feet at y 183, like the
  existing sheets), each frame centred in its 128 x 192 slot. Writes `assets/sprites/townsfolk/townsfolk_NNN.png`
  (from 101), a copy in `generated_sources/chatgpt_NNN_<name>.png`, and a `manifest.json` entry. Using them in town
  is a code change in `src/data/townsfolk.js` (`spriteForJob`, or the `knights`/`court`/`regular` rows).
- **armor**: scales and moves each armor so its head top, feet and head centre match the class's armor 001 (so the
  helmet fits and the face mask lines up), writes `assets/source/gear_additions/<class>/<class>_armor_NNN_<rarity>.png`
  (from 081) plus a `catalog.json` of names, and reruns `process_assets.py gear <class>`. `tools/gearart.py` appends
  these after the zip's 80 armors; the zip's rarity bands stay as they are and the added ids go in `armor.extra`
  (`gear.json`). `itemLook` in `src/core/gearart.js` picks an added armor with odds `added / (band size + added)`,
  so saved looks never change.

## Rebuilding the kits
```bash
python tools/chatgpt_art_kits.py                  # all five zips
python tools/chatgpt_art_kits.py armor pets       # some
python tools/chatgpt_art_kits.py --unpacked DIR   # also write the folders, to look at them
python tools/tests/chatgpt_art.py                 # round trip: examples (without guides) through the importer, --dry
```
The geometry (cells, insets, frame names) lives in `tools/chatgpt_art.py` and the kit builder imports it, so the
templates and the importer always agree.

## Grim Nocturne redesign kit
`ChatGPT_Style_Redesign_Kit.zip` (built by `tools/chatgpt_style_kit.py` from `docs/art_style/`) is the character
redesign: the art bible, the master prompt, pose-master / armor / overlay templates for all 16 classes on a
108-art-pixel grid, and pixel-locked imports (`chatgpt_art.py posemaster | armor ("style": "nocturne") | overlays`).
Start at [art_style/00_START_HERE.md](art_style/00_START_HERE.md).

## Lancer war banner kit
`ChatGPT_Lancer_Banner_Kit.zip` (built by `python tools/chatgpt_banner_kit.py`; text in `tools/chatgpt_banner_kit/`)
is for the Lancer's class signature banner (`src/game/sigs/lancer.js`, drawn with shapes today). Two 1536 x 1024
sheets at 3x (1 AP = 3 x 3 px): the cloth (CALM 1-6 and RALLIED 1-6 wave loops) and the parts (pole, RALLY 1-4, ROLL
1-3), every cell 64 AP wide with the hero's centre line at x 32 and the crossbar at y 16 (cloth cells 64 x 112, the
pole 64 x 180; the crossbar rides 114 world px above his feet, so the full cloth clears his head). `SPEC.md` in the zip has the
anchors, timing and how the game layers and unrolls it; `PROMPT.txt` has the ChatGPT messages. No importer yet: write
one when the sheets come back.

## Notes
- The winged pet atlases still carry caption text from their source sheets (`companions_winged`: "FLAP 1",
  "VELSCOUR" above the Hawk; the drakes have frame numbers under them), and the knight sheets `townsfolk_021`/`022`
  have sliced frames (happy, cheer, point). The examples skip or clean those; the game atlases are unchanged.
