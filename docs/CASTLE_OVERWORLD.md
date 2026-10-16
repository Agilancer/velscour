# CASTLE overworld biome

CASTLE is the third playable overworld beside the Forsaken Wilds and Sea of Sand. Its runtime atlases preserve the 160×80 floor grid, pivots, frame IDs, wall masks, orientation, and topology. The keep has its own six-frame floor atlas and three complete 20-piece interior wall families.

## Game integration

- `src/data/biomes.js` registers Castle as an overworld with a siege-ready monster roster.
- `src/gfx/castle.js` loads the atlas set on descent and exposes indexed exterior and keep floors, topology-aware walls, and pivot-aware props.
- `src/world/overworld.js` builds a 192×176 Castle board by expanding the 96×88 authored layout twofold in each dimension, giving four times the tile area. The irregular fortress has a continuous five-base-tile-wide walkable rampart, ten masonry families, four moat bridges, a defended drawbridge, nine towers, and eight stair approaches. The keep contains enterable throne, cathedral, and great-hall rooms with dedicated floors and walls, open doors, combat space, encounters, and furnishings.
- Castle pathing expands with the board: spawn points, doors, scenario sites, stairs, exits, and rampart objectives are rescaled onto walkable tiles. Ramparts connect through bends, corners, gates, and broad stair landings.
- The shared shrine-activated system supplies 35 challenges. It retains the twenty general scenarios, adds five rampart encounters, and adds ten room-focused keep scenarios. Other overworlds continue to select from their applicable general scenario set.
- Sea of Sand caravan paths remain connected to the authored oasis and ruin anchors while their intermediate curves, phases, and widths vary by seed. Dune and stone seams use scattered 3–6px transition flecks in the matching terrain colors.
- `src/game/game.js` loads Castle atlases before map generation. The art remains lazy-loaded, so ordinary dungeons do not fetch the castle sheets.
- `src/data/townsfolk.js` defines 100 visitor identities, ten children, family links, four persistent town regulars, and the royal family, plus a deterministic 2,000-card event deck. Visitors arrive in small groups, route to vendors and the plaza, pause to talk, and appear in occasional family and court visits. Speech bubbles use double-ruled parchment, and event reactions draw animated pixel hearts, angry faces, and crossed swords with sparks.
- `assets/sprites/townsfolk/townsfolk_animation_pack.zip` contains 100 transparent PNG sheets. Each sheet is eleven 128×192 cells in this order: three distinct idle poses, two walking poses, dying, lying dead, scared/screaming, scared/pointing, happy, and celebration. Ten original generated civilian designs cover children, workers, a healer, watch, nobility and royalty; each has ten clothing/hair palette variants. The sheets are not derived from playable-class armor or helmet assets. `tools/build_townsfolk_pack.py` regenerates the standardized cells, manifest, overview and ZIP from the included generated source sheets. Missing sheets use a plain civilian placeholder while loading.
- Castle wall review sheets are in `art-review/castle-wall-*.png`: each shows all 20 corner, end, straight, junction and panel pieces for one of ten masonry families. `castle-rampart-stairs.png` shows all sixteen stair pieces; `castle-walltops-landmarks.png` shows all nineteen wall-top, tower, stair-access and bridge modules. The throne dais was rescaled to sit more naturally in its open hall.
- After three non-overworld dungeon visits, the selector chooses among every registered overworld: Forsaken Wilds, Sea of Sand, or Castle. The final throne at Depth 500 still takes precedence.

## Rebuild runtime atlases

The runtime art is generated from the full source pack and can be rebuilt with:

```bash
python tools/castlepack.py path/to/CASTLE_Biome_Pack
```

The generated atlases and index live in `assets/tiles/castle/`. WebP atlases are lossless. The full individual PNG pack and authoring documentation remain the source of truth for pixel editing.

## Verification

```bash
node tools/tests/castle_overworld.mjs
node tools/tests/overworld.js
node tools/tests/sea_of_sand_generation.mjs
```

The Castle check covers the documented tile dimensions, fourfold board area, dedicated keep atlas contracts, 100 seeded maps, all 35 scenarios, four bridge approaches, the wide wall walk, eight stairs, interior doors and combat rooms, ten exterior wall families, objective reachability, and three-dungeon rotation among all overworlds. The Sea of Sand check covers 100 seeded maps and all route-anchor reachability. `python tools/build_townsfolk_pack.py` rebuilds the civilian sheets and ZIP from the included original generated art.
