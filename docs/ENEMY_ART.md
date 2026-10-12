# Monster art: sheets, bestiary, palette swaps

Monsters use the user's painted sheets. Each sheet holds one pose for each of 10 monsters on a transparent
background (2 rows x 5). The old ASCII pixel sprites in `src/gfx/pixelart.js` remain in three places: as the
fallback while the art loads, for Demon Lord Velscour, and for player summons.

## Sources and slicing
- Sheets: `assets/source/enemies/<set>/<sheet>.png`. Set 1 (uploaded as `assets/Enemy Assets Set 1/ChatGPT Image ...png`)
  was renamed by content: `skeletons`, `liches`, `bone_horrors`, `flesh_brutes`, `demons`, `tentacles`, `eyes`.
- `python3 tools/process_assets.py enemies` (needs `pip install pillow numpy scipy`) cuts every monster out with
  `grid_objects` (the same shape-based grid finder the chest sheet uses). It downscales each one by `ENEMY_SCALE`
  (0.5, so about 165 px tall) and packs one atlas per sheet: `assets/sprites/enemies/<set>_<sheet>.webp`
  (about 150 KB each). Each cell's rectangle goes in `enemies.json`, along with `fx`, the column at the centre of
  the feet, and `oh`, the cell's height on the sheet. Cells are numbered in reading order. A sheet that isn't
  2 x 5 gets an entry in `ENEMY_GRID`.

## Bestiary (`src/data/bestiary.js`)
`BESTIARY` has one entry per cell: `{id, sheet, i, arch, also?, name, h, el?, boss?, fly?, gore?, undead?, demon?}`.
- `arch`: the AI archetype it plays (`ARCH` in `src/data/enemies.js`: stats, AI, pack size). `also` lists other
  archetypes it can stand in for. Every archetype except `velscour` has art, and `data_check.mjs` enforces this.
- `h`: height in world px. The hero is 60; skeletons are about 54, brutes 64-76, imps and crawlers 30-40.
- `el`: the element the art shows. When it matches the biome's element, the look keeps its own colours and casts
  that element. A biome with no element (catacombs, desert) also lets it keep its own element.
- `boss: true` puts it in the guardian pool. Each depth's guardian is drawn from this pool, favouring art whose
  archetype is in the biome's roster or whose element matches.
- `fly`, `gore`, `undead`, `demon` override the archetype. For example, liches walk where wraiths float, and bone
  monsters leave bone gore.

**Per level** (`rollLooks(biome, rnd)`, called in `generateDungeon`): each archetype in the roster gets up to 2
looks, chosen with element-matching art weighted x4. Each look also gets a palette swap. Every pack uses one of
its archetype's looks, so a level reads as a themed bestiary, and the next visit rolls a new one.
`world.looks` serves later spawns as well (cultist and boss summons, the throne gauntlet).

**Palette swaps** (`SWAPS`, recolor params for `recolor()` in `src/core/util.js`):
- Each biome lists 3-4 swaps in `MON_SWAPS` (`src/data/biomes.js`). `null` keeps the art's own colours.
- The "greater" breed darkens and enriches its swap (`greaterSwap`).
- Unique monsters roll any swap (`uniqueSwap`).
- Raised corpses turn ghostly green (`REVIVED`).
- That gives 70 drawings x about 20 swaps x 2 breeds.

## Runtime (`src/core/enemyart.js`)
- `loadEnemyArt()` fetches `enemies.json` and all atlases (about 1.1 MB). It starts in the background once the
  title screen shows, and `loadBiomeArt` awaits it before each dungeon is built.
- `enemyImage(id, swap, mode)` returns the cut-out canvas (`mode` `''`), a white silhouette for hit flashes
  (`'flash'`) or a darkened corpse (`'dark'`). It returns null until the art loads. Results go in an LRU of 160
  canvases, about 70 KB each. Every canvas carries `_art = {fx}`.
- `Creature.draw` anchors art at its feet (`fx`), mirrored with the sprite, and sizes it to `artH * scale`.
  While the art is loading it draws the archetype's pixel sprite instead. Monsters carry
  `art`/`swap`/`artH` alongside the old `sprite`/`pal`, and corpses copy them.

## Player minions (the Necromancer's skeletons)
`assets/source/enemies/minions/necro_warriors.png` and `necro_casters.png` are sliced by the same `enemies` step and
catalogued as `SUMMON_ART` in `src/data/bestiary.js`. They are in `ART_BY_ID` (so `enemyImage` and `Creature.draw`
handle them) but not in `BESTIARY`, so levels never roll them as monsters. A summon uses one with `look: { art: id }`
in `src/data/summons.js`; see `docs/HANDOFF.md` (status item 13) and `node tools/tests/legion.js`.

## Adding monsters (Set 2 and later)
1. Put the sheets in `assets/source/enemies/set2/` with descriptive names. If they arrive as
   `assets/Enemy Assets Set 2/...`, `git mv` them there.
2. Run `python3 tools/process_assets.py enemies`. Look at the cuts in `node tools/tests/enemies.js` (`en_lineup_*.png`).
3. Add one `BESTIARY` entry per cell. `node tools/tests/data_check.mjs` prints `note: set2/<sheet>#i has no bestiary
   entry yet` for cells without one, and fails on a bad sheet, cell, archetype or element.
4. A creature that fits no archetype needs a new `ARCH` entry (AI kind and stats) and a place in some biome rosters.

## Tests
- `node tools/tests/enemies.js [biome,...]`: line-ups of every look next to the hero in town, with a hit flash
  on the 4th (`en_lineup_0..4.png`), their corpses (`en_corpses.png`), then a depth-8 level per biome, mixed
  with a like-coloured biome (`en_<biome>.png`, `en_<biome>_boss.png`). It prints each level's looks; `*` marks
  a swapped look.
- `node tools/tests/data_check.mjs`: bestiary and sheet consistency, plus the biome bag and mixing rules.
