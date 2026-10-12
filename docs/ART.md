# Environment art: sheets, slicing and how the game uses them

The user's environment art lives in `assets/source/` and is sliced offline by `tools/process_assets.py`:

```bash
pip install pillow numpy scipy
python3 tools/process_assets.py            # everything (sprites, tiles, props); ~2 min
python3 tools/process_assets.py tiles      # floor + wall atlases for the 10 tile sets only
python3 tools/process_assets.py props      # scatter terrain + barricades only
```

Never hand-edit the outputs in `assets/tiles/` and `assets/props/`; change the script and rerun it.

## Source sheets (`assets/source/`)
All sheets are magenta-keyed (`key_magenta`). Every sheet of a kind uses the same template layout.

| Folder | Files | Contents |
|---|---|---|
| `floors/` | `<set>.png` x10 | 36 base floor diamonds, 19 details (24 in `desert`), 8 thresholds |
| `walls/` | `<set>.png` x10 | wall panels, corners, pillars, a tower, arch, gate and rubble, in the catacomb template |
| `scatter/` | 5 sheets | 10 object types (columns) x 6 variants (rows) |
| `barricades/` | `barricades_1..4.png` | 5 named sets per sheet (rows) x 8 facings (N, NE, E, SE, S, SW, W, NW) |

The 10 **tile sets**, as printed on the sheets: `skull` Skull-Lined Catacombs, `catacombs` Catacombs,
`cursed` Cursed Dungeon, `cathedral` Cathedral, `desert` Endless Desert, `sand` Sea of Sand,
`swamp` Swamp of Despair, `frozen` Frozen Ossuary, `ashen` Ashen Monastery, `blood` Blood Crypt
(`TILE_SETS` in the script). The uploaded `Floors N`/`Walls N` numbering is not consistent between the two
kinds (floors 9/10 are Blood/Ashen, walls 9/10 Ashen/Blood), so files were named from the printed titles.

**Scatter sheets** (`SCATTER` in the script lists every column's name, whether it blocks, and its
footprint): `catacomb_relics`, `cathedral_furnishings`, `desert_ruins`, `dungeon_mechanisms`,
`swamp_obstacles`. Chest columns are not scattered; they become the loot-chest art.

**Barricade sets** (`BARRICADES`, sheet order): skull, cursed, catacombs, cathedral, desert / drowned,
obsidian, fungal, serpent, plague / shattered, library, necropolis, amber, void / sand, swamp, frozen,
ashen, blood.

## What the script makes
- `assets/tiles/<set>_floor.webp`, `<set>_walls.webp`, `<set>.json` per tile set.
  - Floors are found as shapes, not grid positions, because the sections shift between sheets. A gap
    bigger than the normal row pitch marks the next section (floor -> detail -> threshold). Each base
    floor gets a `busy` score (contrast inside the diamond). The game sorts by it and mostly uses calm
    paving, like Diablo II, with pits and rubble now and then.
  - Walls: whole pieces as before (pillar, tower, rubble, ...), plus seamless `wall_body`/`wall_cap`/
    `wall_ledge` strips cut from the "/" panels. The cut proportions are measured **per sheet**, because
    face width (46-56 px) and height vary between sets. See [`WALLS.md`](WALLS.md).
- `assets/props/<scatter sheet>.webp`: all 60 objects of a sheet, found by `grid_objects`. It groups
  big shapes into rows and columns at the largest gaps, so it needs no grid coordinates.
- `assets/props/barricades_<set>.webp`: up to 2 views per diagonal direction. The art isn't exact 2:1
  and the facing labels don't match the art consistently, so each view is classified by its measured
  base slope (`fwd` = "/", `back` = "\\"). Front-facing and edge-on views are dropped, and the small
  white label boxes on the 4th sheet are erased first.
- `assets/props/props.json`: `{scatter: {sheet: [{kind,x,y,w,h,block,size,var}]}, barricades: {set: [{kind,x,y,w,h,slope}]}}`.

## Biomes -> art (`BIOME_ART` in `src/data/biomes.js`)
The 20 biomes map onto the 10 tile sets. Biomes that share a set get a `palette` recolour on top
(floors, walls, scatter, barricades and chests alike); `null` means the art as drawn. Each biome also
names a barricade set and 1-2 scatter sheets. Change art per biome there.

## Biome order and mixed levels
- **Order**: `drawBiome(c, depth)` (`src/data/biomes.js`) draws each next biome from a shuffle bag stored on the
  save (`c.biomeBag`). All 19 biomes come up once, in random order, before any repeats, and never the same one
  twice in a row. A new hero's first descent is random too. Depth 100 is always the throne.
- **Mixing**: biomes are grouped by colour (`FAMILY`: sand, frost, ember, rot, gloom). On entering a depth,
  `mixPartner` picks another biome from the same family 65% of the time (`MIX_CHANCE`), preferring one drawn from a
  different tile set. `mixedTileSet(biome, other, wallsFromOther)` (`src/core/assets.js`) then builds a set with
  both biomes' floors and details back to back (`split` marks where the second set starts), walls, pillars and
  rubble from one of the two (a coin flip), both biomes' scatter, and the barricades that go with the walls.
  `generateDungeon` paves the chunks far from the start, plus a random 20% flip, with the second biome's floors.
  The level banner reads "Depth N · bleeding into the <other biome>". Lighting, fog, monsters and the
  name all stay the primary biome's.
- `buildDungeon(depth, biome)` without a third argument (as the tests call it) never mixes.

## Runtime
- `loadAssets` loads only the default set (`skull`: town walls and fallback), `props.json` and the
  `dungeon_mechanisms` sheet (default chest art).
- `loadBiomeArt(biome)` fetches the biome's tile set, scatter sheets and barricades (about 1 MB).
  `enterDungeon` awaits it behind the "Descending..." overlay. If it fails, the default set stands in.
  `buildDungeon` alone (as tests call it) uses whatever has loaded.
- `biomeTileSet(biome)` builds `{floors, details, walls, pillars, towers, rubble, ..., scatter,
  barricades: {fwd, back}, chest: {closed, open, rareClosed, rareOpen}}`. It is cached per biome and art,
  keeping 3 dungeon sets plus the town (a mixed level holds two).
- `placeObstacles` (`src/world/dungeon.js`) runs before spawns. For every room except the start and exit
  rooms, it places an optional corner tower and a barricade in bigger rooms (two tiles along a diagonal,
  mirrored when the set lacks that direction). It then places about one scatter object per 7 free tiles,
  65% against walls. Corridor mouths (2 tiles) and the room centre (chests) stay clear. Every blocking
  placement is undone if the flood fill from the start no longer reaches every open tile. A stress run of
  300 levels across all biomes found no unreachable tiles, spawns, chests or exits.
- Rendering: scatter and barricades are `{kind, x, y, spr, k, flip}` props, drawn by `drawProp` with the
  footprint centre a quarter of the drawn width above the sprite's bottom. Scatter is scaled per sheet,
  so a typical one-tile object is about 50 world px wide; barricades are about 76 px wide (2 tiles).
  Chests use the biome's chest art (`drawChest`), about 46 px wide.

## Adding art
- **A new tile set:** add `floors/<id>.png` + `walls/<id>.png` in the same template, add the id to
  `TILE_SETS`, run `tiles`, and point biomes at it in `BIOME_ART`. Check the printed strip line for each
  set ("wall strips: N bodies ..."), then look at it with `node tools/tests/walls.js shot <biome>`.
- **A new scatter sheet:** add it to `scatter/`, describe its 10 columns in `SCATTER`, run `props`, and
  list it in the biomes' `BIOME_ART` entries.
- **A new barricade set:** add a row to a sheet (or a sheet plus a `BARRICADES` row), run `props`, and
  name it in `BIOME_ART`.
