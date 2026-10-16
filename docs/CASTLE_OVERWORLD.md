# CASTLE overworld biome

CASTLE is the third playable overworld beside the Forsaken Wilds and Sea of Sand. Its complete 961-frame source pack is converted into lossless runtime atlases while preserving pivots, frame IDs, wall masks, orientation, and topology.

## Game integration

- `src/data/biomes.js` registers Castle as an overworld with a siege-ready monster roster.
- `src/gfx/castle.js` loads the atlas set on descent and exposes indexed floors and pivot-aware props. Optional palette arguments pass through the game's colorize transform for stone variants.
- `src/world/overworld.js` creates connected lawn, grove, earth and paved path regions, a blocked moat with four traversable bridge decks, a lowered drawbridge aligned with the walkable south gate, walkable rampart lanes that raise player and creature rendering to the wall deck, stair access, a larger keep, towers, banners, trees, and 360 focused scatter placements drawn from 120 authored pieces.
- The existing overworld scenario system supplies the 20 shrine-activated defense, siege, rescue, escort, and hunt scenarios. Its civilian groups and combat objectives stay connected to the common encounter logic.
- `src/game/game.js` loads Castle atlases before map generation. The art remains lazy-loaded, so ordinary dungeons do not fetch the castle sheets.
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

The Castle check covers the 961-frame atlas contract, 100 seeded maps, all 20 scenarios, bridge and rampart access, the 360-piece scatter count, objective reachability, and three-dungeon rotation among all overworlds.
