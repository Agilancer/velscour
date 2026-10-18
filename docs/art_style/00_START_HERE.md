# VELSCOUR character redesign kit: start here

The game is moving every character to one new house style, **Grim Nocturne**: hand-placed 2D pixel art at twice
Symphony of the Night's PlayStation density, led by Final Fantasy VI's costume theatre, small palettes and
battle-sprite presence, dragged through Diablo II's grime and lit by SotN's moonlit rim. Heroes stay single frames,
with one picture per armor set, like now, and the stance never changes between armors.

## What's in the kit

| File | What it is |
|---|---|
| `01_VELSCOUR_ART_BIBLE.md` | The law: grid, sizes, the pose lock, pixel craft, light, palette, materials, shapes, anti-slop rules, asset types, QA, class identities, sources |
| `02_MASTER_PROMPT.txt` | The long prompt to paste first in **every** ChatGPT chat |
| `03_SHEET_PROMPTS.md` | The prompt for each sheet: style lock, pose masters, armors, overlays, world |
| `04_STYLE_LOCK_REQUEST.txt` | Makes ChatGPT write its own style-lock documents (style guide, prompt templates, class cards) |
| `05_PROMPT_PACK.md` | **Ready-to-paste prompts:** style lock, then per class: pose master, first 5 armors, more armors, overlays; fix prompts; world prompts |
| `names/` | Names files for the importer (pose master, armor, overlays) |
| `reference/current_heroes_lineup.png` | The 16 current heroes (identity reference: who they are, not how they're drawn) |
| `reference/classes/<class>_current.png` | Each class's current hero and 6 current armors (one per rarity) |
| `reference/canonical_stance.png` | The pose lock: landmarks, joint circles, skeleton, at 4x |
| `reference/pixel_scale_guide.png` | What 108 art pixels look like, at 1x, 2x, 3x and 4x |
| `reference/palette.png`, `palette.hex`, `palette.gpl` | The master palette (image, plain hex list, GIMP/Aseprite palette) |
| `reference/world/` | The current enemies, bosses, pets, townsfolk and biome pieces (sizes and roles) |
| `templates/0_style_lock_sheet.png` | 18 material swatches for ChatGPT to paint first: the style anchor |
| `templates/1_pose_master/` | One per class: the new base hero in the canonical stance (4x) |
| `templates/2_armor/` | One per class: 5 body armors (2x), stance contour and landmarks in every frame |
| `templates/3_overlays/` | One per class: 5 helmets, 5 glove pairs, 5 boot pairs (3x), placed on the hero's exact spots |

## The order of work

1. **Style lock** (once): paint the material sheet, then have ChatGPT write the style documents
   (`04_STYLE_LOCK_REQUEST.txt`). Attach both to every later chat.
2. **Pose masters** (once per class): the new base hero in the stance. Approve each one carefully; it's the
   reference for every armor and overlay of that class forever. Import it, then rebuild the templates
   (`python tools/chatgpt_style_kit.py`) so the armor and overlay templates show the new pose master.
3. **Armors**, 5 per sheet, as many sheets as you like.
4. **Overlays**: helmets, gloves, boots.
5. **The world**: townsfolk, monsters, bosses, pets and biomes, with the existing kits and the style paragraph.

## Golden rules
- Paste the master prompt first, every chat. Attach the style lock. One sheet per message.
- Never accept a sheet with a moved pose, a changed face, blur or glow. Ask for a redraw of only the bad cell:
  "Redraw only frame N; keep everything else pixel-identical."
- Look at results at 60 px tall (the game size) as well as zoomed in.
- Keep every approved image: they become references for the next ones.

## Importing (from the repo root)
```bash
python tools/chatgpt_art.py posemaster <sheet.png> names/posemaster.json --dry   # then without --dry
python tools/chatgpt_art.py armor      <sheet.png> names/armor_nocturne.json
python tools/chatgpt_art.py overlays   <sheet.png> names/overlays.json
```
The importer reads each 2x2 / 3x3 / 4x4 block back to one art pixel, keys out the magenta, drops leftover guide
colours, limits the colours to the budget and writes the frames into `assets/source/pose_masters/` and
`assets/source/gear_nocturne/<class>/`. Wiring the new set into the game (replacing the old armor libraries, and
drawing gloves and boots as layers) is a separate step once a class has enough armors.
