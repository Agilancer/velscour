# The four new regions (November 2026)

The user picked four region ideas and asked for all of them at once (November 3, 2026):

1. **The Ghost Train** (`ghost_train`): a spectral locomotive crosses the Wilds. Fight car to car while it moves.
   It stops at haunted stations where you can step off to loot or stay aboard. The engine car is the boss. A set piece
   like the Sea and Sky battles, with **three.js models** (the train above all).
   *Later the user asked for an ordinary steam train: it is now **The Iron Express**, raiders on a night express
   (id, files and skull word `train` unchanged; docs/GHOST_TRAIN.md).*
2. **The Endless Siege** (`endless_siege`): a fortress under siege by an undead horde that never stops coming. Hold the
   walls in waves, repair gates and man ballistae between them. Tower defense inside the ARPG.
3. **The Deep Rail Mines** (`deep_mines`): a dwarven mine overrun by something below. Ride minecarts between shafts,
   rails branch at junctions, worse the deeper you dig.
4. **The Great Hunt** (`great_hunt`): one colossal beast per region. Track it through its territory by its kills and
   wounds, wear it down over several encounters, corner it in its lair. Monster Hunter, gothic.

The user's rules for this work: **dialogue short and sweet**; **use the assets already in the repo**, and **three.js
models where they fit** (the train above all). If the weekly compute runs out, push, open a PR and merge, and leave
this file good enough that another account can pick up where it stopped.

## How they plug in
- `src/game/regions.js` is a registry. Each region is one module, `src/game/regions/<file>.js`, that calls
  `registerRegion({...})` (the fields are documented at the top of `regions.js`). `src/game/regions/index.js` imports
  all four. `game.js` (portal text, skull words, art loading, the three.js fallback, generation, the run and its win,
  ambience, the arrival log) and the Quest Log (`src/ui/quest.js`) read the registry, so a region touches no shared file.
- `minLevel` (optional) gates a region by the hero's level: `regionNeeds(biome, level)` in `regions.js` is checked by
  `teleportToBiome` (so the skull word too: Velscour refuses with one line), the HAIL VELSCOUR! list (the option is
  greyed out with "Reach level N") and `confirmDungeon`/`enterDungeon` (a saved `nextBiome` above the hero's level is
  redrawn). The Great Hunt uses it (level 10).
- The biomes are in `BETA_BIOMES` (`src/data/biomes.js`, `region: true`): never in the biome bag or the overworld
  guarantee, reached from Velscour's skull (the region's `words`, or the HAIL VELSCOUR! list). A placeholder region
  registers nothing, so its biome plays as the Forsaken Wilds.
- A region's run must have `title`, `description`, `completed`, `update(dt)`, and `objective` for auto-play
  (like `src/game/mountain.js`). Live three.js drawing goes through the `world.cave` hook in `render.js` (the caverns,
  the Pirate Seas and the dunes all use it).
- Each region keeps its own files: `src/world/<region>.js`, `src/game/<region>.js`, `src/gfx/<region>3d.js`,
  `tools/tests/<region>.js`, `docs/<REGION>.md`.

## Branches
Integration branch: `feat/new-regions`. Each region was built on its own branch off it, merged back when it worked:
`feat/ghost-train`, `feat/endless-siege`, `feat/deep-rail-mines`, `feat/great-hunt`.

Second pass (November 3, 2026, `feat/regions-polish`, merged): the rough spots fixed, the Hunt gated at level 10, the
train made ~2.5x longer, and **five variants per region** (`variants` in the registry: rolled per level, never the one
seen last; the skull word plus a number or name, `siege 3`, or the HAIL VELSCOUR! list picks one).
- **Done:** the Great Hunt's five lands and the Endless Siege's five keeps (both tested, auto-play wins every one).
- **Not merged yet, out of compute:** the Iron Express and Deep Rail Mines variants. Their work in progress is pushed on
  `fix/regions-train` and `fix/regions-mines` (each doc's *Next* says where it stopped). Merge `main` into the branch,
  finish five `variants` the way `src/game/regions/siege.js` and `hunt.js` do, run the region's test and `flow.js`,
  then open a PR.

## Status
| Region | Status | Doc | Test |
|---|---|---|---|
| The Iron Express (`ghost_train`) | playable beta (16 cars, 5 stations, a lieutenant halfway, Hangman's Gorge, the chief's train fight: coal lanes, steam vent, whistle; tuned and soaked by auto-play at depths 1, 50, 150, 300) | docs/GHOST_TRAIN.md | `tools/tests/ghosttrain.js [shots] [auto] [depths] [classes]` |
| The Endless Siege | playable beta in five variants (the Old Keep, the Frozen Border Fort, the Burning River Wall, the Mountain Pass Fortress, the Swamp Abbey: own walls, gates, ground, horde, lord and twist); gates, winches, ballistae, waves, a walkable wall-walk with stairs; auto-play wins every variant at depths 8, 150, 320 with no falls | docs/ENDLESS_SIEGE.md | `tools/tests/siege.js [shots] [auto] [depth] [variants]` |
| The Deep Rail Mines | playable beta (carts both ways: ride back up, back out of a junction; switches, tiered packs and levels, arched tunnel mouths, boss at the Bottom; auto-play wins it) | docs/DEEP_RAIL_MINES.md | `tools/tests/mines.js` |
| The Great Hunt | playable from level 10 (`minLevel`): track by signs, three fights with flight and a trail, the kill in the lair; five lands (`variants`: the Black Wood, the White Waste with blizzards, the Drowned Fen with poison pools, the Red Badlands with a burrower, the Storm Crags with a winged beast and a lair on the peak), each its own ground, beasts, brood and signs; auto-play wins every land without god mode at Depth 9 (level 10), and at 60 and 150 | docs/GREAT_HUNT.md | `tools/tests/hunt.js [shots] [auto] [lands]` |

## Picking it up
1. `git fetch origin && git checkout feat/new-regions` (or the region's own branch if it is ahead; check
   `git log origin/feat/<region> --oneline -5`).
2. Read the region's doc (its *Status* and *Next* sections say exactly where it stopped).
3. Run its test (start `python3 -m http.server 8123` first; `NODE_PATH=/opt/node22/lib/node_modules`), then `flow.js`.
