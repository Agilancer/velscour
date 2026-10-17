# Desert Temple — Temple of the Sunless Dynasty

This is a **true dungeon biome**, not an overworld level, and it participates in
the existing randomized dungeon-biome shuffle. It is separate from the legacy
**Bone Desert Tombs** biome and does not replace the outdoor Forsaken Wilds.

## Visual design and relationship to the class rigs

The art follows VELSCOUR's original isometric Diablo-II-inspired 2D presentation:
crisp-pixel silhouettes, aged gold, stone texture, and luminous blue-green magic.
It is scaled around the same 160×80 isometric source tile (64×32 world pixels),
with the same raised wall height and front/back depth slicing as the rest of the
dungeon art. Paladin/Lancer-style armor and shields remain readable among
sandstone, obsidian and worn-gold scenery. The character's skeletal rigs and gear
atlases are **not replaced by environment tiles**.

The associated illustrated concept sheet is a visual reference; **the runtime
art source of truth is the code**. All atlas sprites are generated on demand
using Canvas 2D, with no PNG source pack, generated ZIP or build dependency.

## Complete generated artwork

| Category | Contents | Engine integration |
|---|---|---|
| Floor tiles | **60** 160×80 isometric tiles: 10 seamless ground treatments and 50 decorated variants (cracks, ankh inscriptions, sun discs, blue mosaic, scarab motifs, tomb seals and fallen temple paving) | `tileset.floors`, `bases`, `features` |
| Modular walls | **Five** texture families with **all 16 connection masks**: Sun Ashlar, Scarab Sanctum, Lotus Colonnade, Royal Burial, Obsidian Inner Temple | `TileMap.buildWalls` original pixel-perfect per-arm slicing and cutaway |
| Arches | **Three** decorative arches × **four** directions, 3-tile outer span | `findOpenings`, original 6-slice depth ordering |
| Doors | **Three** themed door sets × **four** directions × open/closed | `World.openDoors`, retained 3-part pivots/swing geometry |
| Props/scatter | **40** new named drawn props, including jackal statues, obelisks, gold/blue braziers, sarcophagi, scarab altars, pillars, relic chests, urns, dunes, fallen columns, banners and traps | Existing `placeObstacles`, pivot + collision footprints |
| Environment lighting | Warm braziers/torches and sapphire relic flames | `src/world/dungeon.js` `LIT`, renderer/VFX |

`src/gfx/deserttemple.js` draws the 60-floor atlas, the 40 new prop
silhouettes and the wall/arch/door *artwork*. To keep exact collision geometry
and allow doors to open correctly, the painted walls follow the **existing**
Catacombs source silhouette/depth-slice masks, with newly shaded sandstone,
frieze/enamel bands, inset gold and hieroglyph-like glyph treatments. The reused
geometry is intentional. This is **not** an entirely new hand-painted
architectural geometry source ZIP.

The script creates a complete pack object with `{floors,walls,scatter,meta}`,
matching the same contract that `tools/biomepack.py` creates for other biomes.
`src/core/assets.js` loads the original Catacombs pack first, then builds and
caches the derived Desert Temple art using that geometry. It does not write into
`assets/tiles/`, and all file URLs remain relative for GitHub Pages.

The art is new at runtime; **it does not require committing large static binary
atlases**. The browser QA script automatically exports real game-ready files into
`tools/tests/out/desert_temple_export/`: `floors.webp`, `walls.webp`,
`scatter.webp`, and `pack.json`. This is a complete atlas-and-metadata handoff
and can be provided directly to another developer or art editor. The exported
files are ignored by Git; the live game continues to use the deterministic
source generator, ensuring one source of truth.
The source generator is the place to modify colors, prop drawings, materials,
and floor pattern density. Changing geometry or creating truly independent
architectural silhouettes would require a complete `manifest.json` source
pack and importing it with `tools/biomepack.py`.

## Procedural gameplay

`src/data/biomes.js` defines the new `desert_temple` biome, including:
- Native generated dungeon pack `desert_temple` (not the town/overworld pack)
- An ancient, sand-toned bestiary of undead, cultists, scorpions, scarabs
  (beetle archetype), golems, knights, and dangerous temple guardians
- Rarity-preserving monster palette swaps in sand, gold, bronze and bone
- Warm brazier light; drifting dust and sand; dark stone near the guardian

The existing `src/world/dungeon.js` remains the authoritative
generator: rooms, corridors, caves, loops, an arena, doors, arches, scattered
obstacles, guardians, bosses, chests, normal XP/loot, two portals and one
sealed exit. The exit opens when the guardian is defeated. Depth 500 is still
Velscour's Throne. The Desert Temple counts as a non-overworld visit for
the three-dungeon overworld guarantee.

## Implementation and review

Files added / modified:
- `src/gfx/deserttemple.js`: Canvas source for **all** runtime artwork.
- `src/core/assets.js`: load/caching adapter for the new pack.
- `src/data/biomes.js`: biome registration and compatible enemy palettes.
- `src/world/dungeon.js`: lighting values for the new braziers.
- `tools/tests/data_check.mjs`: generated-pack validation.
- `tools/tests/desert_temple.js`: architectural, map, and screenshot QA.
- `docs/ART.md`, `README.md`, `CLAUDE.md`, `docs/HANDOFF.md`: documentation.

Run from the repo root after serving it:
```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/desert_temple.js
node tools/tests/walls.js temple desert_temple
node tools/tests/pack.js desert_temple
node tools/tests/flow.js
```

`desert_temple.js` tests all 5 × 16 mask variants, 3×4 arches,
3×4×2 door states, 60 floors, 40 unique named props, 16 generated dungeon
layouts, walkability, live guardian population, and door/arch occurrence.
It captures actual in-game screenshots and a 40-prop contact sheet under
`tools/tests/out/`. Manual review should also verify pixel readability
at the game's typical 1.0–2.0 zoom, the class gear overlays, door animation,
Lancer/Paladin proportions next to walls, and mobile landscape performance.

This branch has code/synthetic structural checks, but a real browser rendering
and gameplay pass is required before publishing to `main`.
