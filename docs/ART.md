# Environment art: biome packs

Dungeon floors, walls, arches, doors and scatter terrain come from **biome packs**: the user's
`<Name>_Biome_Pack.zip` files in `assets/source/biomes/`. The first is the **Catacombs** pack. Every biome is
built from it for now, palette swapped (`palette` in `src/data/biomes.js`); more packs will follow, made from the
same template, and each will take over the biomes it suits. The old per-biome tile sheets, scatter sheets and
barricades were removed when this pack arrived.

```bash
pip install pillow numpy scipy
python3 tools/process_assets.py biomes            # every pack in assets/source/biomes/ (~15 s each)
python3 tools/process_assets.py biomes catacombs  # just one
python3 tools/process_assets.py props             # loot-chest art (assets/props/chests.*)
```
Never hand-edit the outputs in `assets/tiles/` and `assets/props/`; change `tools/biomepack.py` and rerun it.

## The pack template
Read the pack's own `README.md`, `manifest.json` and `qa/*.png` (inside the zip) before changing anything. In short:
- A **160 x 80** tile grid, basis `u = (+80, +40)`, `v = (-80, +40)`, height subtracts from screen y. Sprites
  have fixed canvases and pivots (the ground point): floor 160x80 (80,40), wall 256x256 (128,192), arch 384x336
  (192,248), door 320x288 (160,208), scatter 192x192 (pivot per sprite).
- **60 floors**: 01-10 tile seamlessly with themselves; 11-60 are feature tiles (drains, seals, mosaics, cracks).
- **5 wall families** (crypt ashlar, ossuary niches, funerary chapel, sealed cells, drowned crypt), each with a
  piece for all 16 connection masks (NE=1, SE=2, SW=4, NW=8: pillar, ends, straights, L corners, tees, cross) plus
  directed panels (front and reverse art). Walls are 128 px tall and 0.2 tile thick; a node reaches half a tile
  along each connection, and nodes sit one tile apart. The manifest gives each wall's footprint in 0.1-tile cells.
- **3 arches** x 4 directions, 3 tiles outer span (piers included). **3 doors** x 4 directions x open/closed,
  one tile wide, hinged at an end, the open leaf swung 90 degrees into the next tile.
- **40 scatter props**, one view each, with an estimated ground pivot and footprint.
- Pack directions name the way a piece runs, not the way it faces: SE = +u, SW = +v, NW = -u, NE = -v. The game's
  tile axes are the same: `u` = x, `v` = y.

## What the importer does (`tools/biomepack.py`)
- **Raises the architecture** by `ZSCALE` (1.6). The pack's walls (128 px) and door leaves (112 px) are shorter than
  the game's heroes, who stand about a tile tall (60 world px on a 64 px tile; the pack is drawn at 0.4, so a raw
  wall would be 51 px). A plain vertical stretch would bend every ground line, so each output pixel is ray cast
  against the piece's real geometry (thin boxes: the manifest's wall footprints, the door and arch spans, the open
  door leaf) and the hit point is sampled from the source at 1/ZSCALE of its height. Ground contacts, 2:1 edges and
  joins stay exact; textures are 1.6x taller. At ZSCALE 1 the geometry reaches every source pixel (checked: 0 lost),
  which is how the boxes were validated. Set `ZSCALE = 1.0` to get the pack's own proportions.
- **Splits it into depth slices**, because a long sprite can't be depth sorted against creatures walking past it:
  wall nodes into their arms (half a tile each; the centre post goes with every arm), arches into six half-tile
  slices, doors into two halves plus the open leaf. Each slice records its offset from the ground point.
- Writes `assets/tiles/<pack>/`: `floors.webp` (as drawn), `walls.webp` (walls, arches, doors), `scatter.webp`
  (cropped) and `pack.json`:
  - `floors`: `{name, x, y, w, h, seamless, lum}` (`lum` = mean brightness, used to match feature tiles to paving)
  - `walls[family][mask]`: texture variants, each a list of `[arm, x, y, w, h, ox, oy]` (arm `NE|SE|SW|NW|c`;
    straight masks 5 and 10 have extra variants from the reverse-art panels)
  - `arches[design][dir]`: `[a, x, y, w, h, ox, oy]` (a = slice centre, tiles along the piece's direction)
  - `doors[design][dir].closed|open`: `[[part, du, dv], x, y, w, h, ox, oy]` (part `L|R|leaf`; du/dv = the
    slice's depth anchor in tiles from the doorway centre)
  - `scatter`: `{name, x, y, w, h, ox, oy, fp, block}` (`block` false for the walk-over clutter in `WALK_OVER`)

Native pixels map to world pixels by `k = TW / 160` (0.4); `ox/oy` are native px from the ground point.

## In the game
- `loadAssets` loads the default pack (and the chest art) at boot; `loadBiomeArt(biome)` makes sure the biome's
  pack is loaded. `biomeTileSet(biome)` recolours the three atlases with `biome.palette` (walls with `wallPalette`
  when set; the town uses that) and builds `{k, floors, bases, features, walls, families, arches, doors, scatter,
  pillar, chest}`. `recolor` uses a colour lookup table, so the 2048x2244 wall atlas takes ~100 ms. The cache keeps
  the town plus 2 biome sets (each ~25 MB of canvas).
- **Floors** (`finishMap`, `src/world/dungeon.js`): each room is paved in one of the 10 seamless materials (70% the
  level's main one), corridors and cave edges in another; 7% of room tiles (3.5% in corridors) get a feature tile
  whose brightness is within 0.07 of the paving. `map.v` holds the index into `tileset.floors`.
- **Walls** (`TileMap.buildWalls`, `src/world/map.js`): every floor/void edge is a wall edge, as before. Each tile
  vertex on a wall gets the node piece for its mask, drawn as separate arms. An arm with the floor on its +x/+y side
  (a "back" wall, seen from the room) sorts 0.45 behind its centre, so creatures beside it draw over it; an arm with
  the floor behind it (a "front" wall) sorts 0.45 ahead, so it hides them. Each straight run of edges takes one
  family and texture variant; a level uses three families weighted 5 : 3 : 1.5 (`finishMap`). The town uses
  crypt ashlar only.
- **Arches and doors** (`findOpenings`, `src/world/dungeon.js`): where a 2- or 3-wide corridor meets a rectangular
  room's wall, flanked by wall on both sides, three times in four. A 3-wide gap gets an arch that fits it exactly; a
  2-wide gap gets an arch (its piers overlap the wall half a tile each side, so those two wall arms are dropped) or,
  35% of the time, a pair of doors hinged at the outer jambs (SE + NW, or SW + NE). Doors never block movement or
  sight; they swing open for good when any creature comes within 1.1 tiles (`World.openDoors`).
- **Scatter** (`placeObstacles`): each level picks 10-16 of the 40 props and places about one per 7 free room
  tiles, 65% against walls, never in a corridor mouth or the room centre. Blocking props take one tile and are
  undone if they would cut the level apart. Lanterns, braziers, candelabra, candles and torch stands give light.
  The throne arena's four columns are funerary obelisks.
- **Rendering** (`src/game/render.js`): floors are drawn 0.6 px oversized to hide seams. Wall items (`drawWall`)
  are depth sorted with everything else. Walls in front of the hero fade in a wide soft hole around them
  (`cutaway`). Portals use the pack's pillar for their posts.
- **Mixed levels**: about 65% of levels pair the biome with another of its colour family (`mixPartner`); the far
  chunks are paved in that biome's palette, and the walls, arches and doors come from one of the two.

## Checking it
- `node tools/tests/pack.js [biome,...]`: 24 levels across all biomes (counts arches, doors, wall arms, props;
  fails on unreachable tiles or a level with no arch/door), and screenshots of a door (closed, open) and an arch.
- `node tools/tests/walls.js [prefix] [biome,...]` (`ZOOM=3` for a close-up): a wall-heavy spot per biome.
- `node tools/tests/data_check.mjs` checks every pack is complete (16 masks per family with every arm, 4
  directions of arches and doors, open leaves, seamless floors, chest art).

## Adding the next pack
1. Put `<Name>_Biome_Pack.zip` in `assets/source/biomes/` (the template's file layout and `manifest.json`).
2. `python3 tools/process_assets.py biomes <name>` and read the printed "source pixels outside the geometry" line:
   it lists pixels that are hidden after raising, which is expected, but a pack whose pieces don't match the
   manifest geometry shows up there too (run with `ZSCALE = 1.0` to check: it should be 0).
3. Point biomes at it: `b.pack = '<name>'` for the biomes it suits (`src/data/biomes.js`), and give them palettes.
4. If the pack names different wall families or door designs, check `crypt_ashlar` (town walls in
   `src/world/town.js`) and `funerary_obelisk` (throne columns), and `LIT` / `WALK_OVER` (prop names).
5. Run `pack.js`, `walls.js` and `data_check.mjs`, and look at the screenshots.

## Cathedral and Graveyard pack
`assets/source/biomes/Cathedral_Graveyard_Biome_Pack-{1,2}.zip` (part 2 is only reference and QA sheets; split packs
are read like one) -> `assets/tiles/cathedral_graveyard/`. Same template, two settings: floors 1-5 and 11-30, props
21-35, the nave/stained-glass/buttressed wall families, arches chapel_lancet / nave_triumphal / grand_westwork and doors
cathedral_oak / sacristy_bronze are the **Desecrated Cathedral** biome; the rest (graveyard soil and paths, headstones,
cemetery limestone and iron fence walls, cemetery gate) is the **Moonlit Necropolis**. A biome's `part`
(`src/data/biomes.js`) picks its share and `biomeTileSet` filters the set. Its arches come in outer spans of 3, 5 and
7 tiles: the importer slices each into 2 x span half-tile slices (`pack.json archSpan`), and `findOpenings` puts a
span-n arch over an n- or (n-1)-wide gap (`archesFor`). Levels only mix with biomes on the same pack and part.

## The town pack (Overworld and Town)
`assets/source/biomes/town/Overworld_Town_Biome_Pack-{1,2,3}.zip` are one pack split to fit GitHub's upload limit;
`tools/townpack.py` reads all parts (a file repeated across parts is read once). Same 160 x 80 grid as Catacombs, but
for the outdoors: 60 floors, 15 x 8 terrain transitions, 6 wall families as directed panels, 4 roof materials, gables,
doors, windows, shop signs, unlit torches, 40 scatter props and 18 trees. Read its `README.md` first.

```bash
python3 tools/process_assets.py town      # -> assets/tiles/town/ground.webp, objects.webp, town.json (~9 s)
```
- **Ground**: the six transition bases (grass 01, gravel 13, dirt 21, mud 22, stone 33, concrete 41) and every
  transition. Shapes 1-4 put material A on the low-u, high-u, low-v, high-v half; 5-8 on the triangle at the
  (low u, low v), (high u, high v), (low u, high v), (high u, low v) corner. A is the earlier material in the pair
  name. `generateTown` gives a tile beside a softer material the shape with that material on the shared side(s).
- **Buildings** are composed offline (`compose`) by the pack's 2 x 2 roof recipe: back panels, pillars, front panels
  with one replaced by the door, windows on the other visible panels, an unlit torch at the door wall's middle
  (its head position is saved in `lights`, and the game draws a flame and light there), gable infills under the
  open ends of a gable roof, the roof, and a projecting shop sign. Specs per building are in `BUILDINGS`. The game
  draws them 1.5x so the walls stand above the heroes (a 3 x 3 tile footprint).
- **Trees and scatter** keep their pivots and are drawn at `k` (0.4).
