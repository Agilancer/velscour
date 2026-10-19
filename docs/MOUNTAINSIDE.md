# Mountainside (beta): the first height-mapped overworld

A 50 x 50 climb from the foot of a mountain (the bottom-left edge of the screen) to its summit (the top-right).
It is **not** in any biome rotation: reach it through Velscour's skull button beside the minimap by sending the
message `mountain` (any case), or pick it first on the HAIL VELSCOUR! list ("Mountainside · Overworld (Beta)").
Test: `node tools/tests/mountain.js [shots|noshots] [auto|noauto]`.

## Height
- `map.hgt` (Int16Array) holds a level per tile; a level is `HS` = 4 world px (`src/gfx/terrain.js`).
- A body hops **up** at most `map.climb` = 4 levels (16 px) and **drops** at most `map.drop` = 10 levels (40 px).
  Taller steps are walls one way, the tallest both ways. Monsters can jump down on the hero where he cannot climb.
- `TileMap` (`src/world/map.js`) checks the rule in `stepOk`/`stepsOk`; `circleFree(x, y, r, from)` needs the centre to
  be a legal hop or drop from `from` and no corner to hang over too deep a drop. `move`, `findPath`, `buildFlow`,
  `flowStep`, `losWide` and `los` (ground more than a hop above both ends blocks sight) all use it. A diagonal needs
  all four tiles round the corner within a hop. Flat maps leave `hgt` null and pay nothing.
- Auto-play's own distance field (`Auto.buildNav`/`pathTo`) follows the same rule.

## Projection and drawing
- `setElevation(elev, pick)` in `src/core/view.js` lifts the ground plane: `isoY(x, y)` subtracts the tile's height,
  so creatures, spells, lights, labels and loot all stand on the terrain with no per-system code. `pick` turns a screen
  point back into the lifted tile under it (mouse and touch). `game.setWorld` calls `useTerrain(map)`.
- `drawTerrain` bakes columns into the floor chunks back to front: the tile top lifted by its height, and on the two
  faces the camera sees (SW toward +y, SE toward +x) an earth bank of the tile's own ground over procedural granite,
  darker toward the foot, with a turf lip and tufts. Faces over the void (the foot and the east precipice) run down to
  `map.baseLevel` and fade into haze. Higher ground behind a tile shades it.
- Sorting: on a height map every sorted item keys on the tile it stands on (`standKey`), and a column that rises toward
  the camera over a tile behind it (`occluders`) is drawn again over anyone standing behind it.
- `hopZ` gives each creature a short hop arc when it steps up and a fall when it drops (render.js case 6).
- A sky gradient with two ranges of far peaks is drawn behind the mountain (`drawSky`); the minimap is shaded by height.

## The map (`src/world/mountain.js`)
- Uphill is `v = 49 - y`. Base slope 0.68 levels a row, five cliff bands (9-15 levels) at v = 8, 17, 26, 35, 42, each
  broken by one ramp (a stair of ~2 levels a tile) at x = 36, 12, 37, 13, 38, so the trail switchbacks. A hop-high
  terrace (3-4 levels) crosses each band between cliffs; where one meets a ramp it folds into the stair.
- A rock ridge walls the west (x <= 2); east of x = 46 the mountain falls away. Crags (6-13 levels) dot the slope and
  are taken back if they would cut the climb in two; three shelves sit exactly a hop up with a chest on top.
- The trail is the cheapest two-way path (every step a hop either way); it is laid in dirt, gravel and stone steps,
  with cairns, signs at the foot of each ramp, rope posts at the top and a climbers' camp halfway.
- Ground by band: meadow at the foot, deep grass and ferns, alpine grass and moss, dry grass and lichen, scree, stone
  and snow at the summit. The 21 floors (`src/gfx/mountainart.js`) are the town pack's grass/dirt/gravel/stone and
  the Dark Forest pack's floors, recoloured once at load. Props: town firs, pines, cedars, junipers and frost firs,
  the Dark Forest's spire pines and moss firs, boulders, shrubs, flowers, cairns, the summit shrine.
- About 23 monster packs (champions higher up) and the Summit Warden (a golem boss) on the peak. Generation is ~20 ms;
  a seed whose trail fails retries (most build first time).

## Run (`src/game/mountain.js`)
Live from the start: climb to the summit, defeat the Warden, and the exit on the peak opens (+1 skill point the first
time). `objective` points auto-play at the summit; the Quest Log shows the altitude reached.

## Open
- Beta: frame cost on phones not measured; projectiles step up and down with the ground they fly over.
- No native mountain monsters yet (the regular bestiary with cold palettes); no snowfall weather.
