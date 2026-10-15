# Monster art: sheets, bestiary, palette swaps

Monsters use the user's painted art: set 1 is 7 sheets, each holding one pose for each of 10 monsters on a
transparent background (2 rows x 5); set 2 (`Enemy_300.zip`) is 300 single sprites, one 512x512 PNG per monster. The old ASCII pixel sprites in `src/gfx/pixelart.js` remain in three places: as the
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
- **Folders of single sprites** (set 2): `assets/source/enemies/set2/<family>/ene_NNN_<name>.png`. Each folder is
  packed as one sheet, `set2/<family>`, with its cells in file name order (so cell `i` = the folder's i-th file).
  Each sprite is trimmed and stored at `SINGLE_SCALE` (0.85), at most `SINGLE_MAX_H` (220 px) tall, so the giants
  keep detail at boss and raid scale. Families: undead 1-30, fiends 31-70, titans 71-95, colossi 96-120,
  dragons 121-150 (dragons and hydras), mages 151-170, warriors 171-210 (bandits, knights, lancers, dragoons),
  goblins 211-235, slimes 236-260, kobolds 261-285, birdfolk 286-300.

## Bestiary (`src/data/bestiary.js`)
`BESTIARY` has one entry per cell: `{id, sheet, i, arch, also?, name, h, el?, boss?, fly?, gore?, undead?, demon?}`.
- `arch`: the AI archetype it plays (`ARCH` in `src/data/enemies.js`: stats, AI, pack size). `also` lists other
  archetypes it can stand in for. Every archetype except `velscour` has art, and `data_check.mjs` enforces this.
- `h`: height in world px. The hero is 60; skeletons are about 54, brutes 64-76, imps and crawlers 30-40.
- `el`: the element the art shows. When it matches the biome's element, the look keeps its own colours and casts
  that element. A biome with no element (catacombs, desert) also lets it keep its own element.
- `boss: true` puts it in the guardian pool. `lone: true` (set 2's titans, colossi, hydras and great dragons)
  keeps it out of packs: it only plays guardians and raid bosses (`RAID_BOSSES[].art` in `src/game/raid.js`). Each depth's guardian is drawn from this pool, favouring art whose
  archetype is in the biome's roster or whose element matches.
- Set 2 is written as compact rows, `set2(family, base, [[id, arch, h, extras], ...])`: the name is the id in
  title case unless `extras.name`. `mortal` (`undead: false, gore: 'flesh'`) is the base for living folk who play
  undead archetypes (bandits as skeletons, knights as knights, mages as wraiths).
- `fly`, `gore`, `undead`, `demon` override the archetype. For example, liches walk where wraiths float, and bone
  monsters leave bone gore.

**Per level** (`rollLooks(biome, rnd)`, called in `generateDungeon`): each archetype in the roster gets up to 2
looks, chosen with element-matching art weighted x4 and art from the biome's `prefer` sheets (`src/data/biomes.js`,
e.g. `set2/goblins` in the Thornwood) x3. Each look also gets a palette swap. Every pack uses one of
its archetype's looks, so a level reads as a themed bestiary, and the next visit rolls a new one.
`world.looks` serves later spawns as well (cultist and boss summons, the throne gauntlet).

**Palette swaps** (`SWAPS`, recolor params for `recolor()` in `src/core/util.js`):
- Each biome lists 3-4 swaps in `MON_SWAPS` (`src/data/biomes.js`). `null` keeps the art's own colours.
- The "greater" breed darkens and enriches its swap (`greaterSwap`).
- Unique monsters roll any swap (`uniqueSwap`).
- Raised corpses turn ghostly green (`REVIVED`).
- 29 swaps in all; the 9 added with set 2 (verdigris, amethyst, coral, bronze, bone, spectral, bile, midnight,
  rust) lean on hue turns, which keep set 2's multi-coloured art readable.
- That gives 370 drawings x about 29 swaps x 2 breeds.

## Runtime (`src/core/enemyart.js`)
- `loadEnemyArt()` fetches `enemies.json` and the set 1 and minion atlases (about 1.4 MB). It starts in the
  background once the title screen shows, and `loadBiomeArt` awaits it before each dungeon is built.
- Set 2 (about 5 MB, 11 atlases) loads per level: after `buildDungeon`, `enterDungeon` awaits `loadArtFor(ids)`
  for every spawned creature's art plus the level's rolled looks (`rollLooks().ids()`), behind the loading screen.
  Anything drawn before its sheet has loaded (a later summon, a test calling `buildDungeon` directly) starts that
  sheet's load and shows the pixel sprite until it arrives. `loadEnemySheets()` with no list loads everything
  (the line-up test does).
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

## Pets (familiar sheets)
`assets/source/enemies/familiars/*.jpg` are JPEG sheets on a flat black or white background. The `enemies` step keys
them (`key_flat`), cuts them on their even grid (`SHEET_GRID`; the wolves as blobs) and scales them per kind
(`SHEET_SCALE`); `python3 tools/process_assets.py enemies familiars` redoes only these. They are `FAMILIAR_ART` in
`bestiary.js` and load in the background after set 1 (`loadPetArt`). Summons take a list (`look: { art: [ids], h }`)
and each minion gets one at random; see HANDOFF status item 20 and `node tools/tests/familiars.js`.

## Adding monsters (Set 3 and later)
1. Put the sheets in `assets/source/enemies/set3/` with descriptive names (or single sprites in
   `set3/<family>/` folders, like set 2). If they arrive as `assets/Enemy Assets Set 3/...` or a zip, move or
   unpack them there.
2. Run `python3 tools/process_assets.py enemies`. Look at the cuts in `node tools/tests/enemies.js` (`en_lineup_*.png`).
3. Add one `BESTIARY` entry per cell. `node tools/tests/data_check.mjs` prints `note: set3/<sheet>#i has no bestiary
   entry yet` for cells without one, and fails on a bad sheet, cell, archetype or element.
4. A creature that fits no archetype needs a new `ARCH` entry (AI kind and stats) and a place in some biome rosters.

## Tests
- `node tools/tests/enemies.js [biome,...]`: line-ups of every look next to the hero in town, with a hit flash
  on the 4th (`en_lineup_0..4.png`), their corpses (`en_corpses.png`), then a depth-8 level per biome, mixed
  with a like-coloured biome (`en_<biome>.png`, `en_<biome>_boss.png`). It prints each level's looks; `*` marks
  a swapped look.
- `node tools/tests/data_check.mjs`: bestiary and sheet consistency, plus the biome bag and mixing rules.

## HEAVENLY: sixty self-contained procedural monsters

The HEAVENLY dungeon is a specialized exception to the uploaded enemy
sheet workflow. `src/data/heavenly.js` defines **60 unique named monsters**
across twelve species/families (five ranks each), with dedicated 160×186
transparent Canvas sprite drawings in `src/gfx/heavenlymonsters.js`.

These entries use the reserved `sheet: 'heavenly/generated'` identifier.
`src/data/bestiary.js` includes them in `BESTIARY` / `ART_BY_ID`
but filters the level-roll pool: HEAVENLY chooses only generated monsters,
and ordinary biomes do not see them. `src/core/enemyart.js` recognizes
the `hv_` prefix and bypasses the static metadata/fetch pipeline while
preserving swap/flash/corpse behavior and the `_art.fx` foot anchor.
The source shapes are not hand-painted PNG sprite sheets; a browser
export in `tools/tests/heavenly.js` produces an optional
`monsters.webp` atlas and `monsters.json` cell metadata, plus
the full `heavenly_60_monsters.png` contact sheet.

The fifth rank in each family is a potential named guardian; the
others occur as regular packs with elite/champion/unique variants.
Existing enemy archetypes supply combat AI while custom per-variant
health, damage, speed, magical range, resistance and wings determine
the feel of fighting them. See [HEAVENLY.md](HEAVENLY.md).
