# ASTRAL PLANE — The Celestial Expanse

## Biome identity

**ASTRAL PLANE** is a new, randomly selectable indoor-style dungeon in VELSCOUR.
It is not a variation of the existing Void Sanctum or Crystal Caverns,
and does not replace the Depth 500 Demon Lord throne or the Forsaken Wilds
outdoor scenario. Rooms, branches, corridors, caves, chests, locked-until-guardian
exit, monsters, levels, loot and boss fights use the normal `generateDungeon`
pipeline. A visit is a normal non-overworld depth for the overworld's
three-dungeon overworld guarantee.

Visual setting: a shattered celestial domain beyond physical space,
with midnight-violet masonry, holographic constellations, prismatic aether,
amethyst colonnades, celestial gateways, floating stones, moonsilver
sculptures, world-shard pedestals and compact stars orbiting ancient relics.

The character's normal pixel-art scale, equipment overlays, combat
animations and rig pivots are unchanged. All geometry is aligned to the
engine's original 160×80 source isometric grid and its existing wall-depth
cutaway.

## Complete art pack

Source of truth: `src/gfx/astralplane.js`.

| Artwork | Count | Details |
|---|---|---|
| Floors | **60** 160×80 cells | Ten repeating midnight/star-metal/aether-mosaic floors and 50 star charts, constellations, glyphs, orbit rings and horizon fracturing decorations |
| Wall families | **5**, each supporting all **16** connection masks | Starforged Bastion; Aetheric Arcades; Constellation Cloister; Prismatic Nexus; Event Horizon Sanctum |
| Arches | **3 × 4 directions** | Stargate Vault; Celestial Conduit; Horizon Arch |
| Doors | **3 × 4 directions × open/closed** | Astral Iris; Runebound Aether; Celestial Seal |
| Scatter props | **40** distinct named 160×160 sprites | Orbital orreries, celestial astrolabes, astral obelisks, floating prismatic clusters, star fragments, moonstone columns, shrines, reliquaries, watcher statues, singularity heart, star gates, celestial banners and cosmic rune circles |

The `floors` and `scatter` atlases contain original Canvas-generated
geometry, stippled pixel stars and hand-composed mathematical ornaments.
The `walls` atlas uses the Catacombs pack as an **alpha silhouette and depth
slice source only**—its stone coloration is replaced with newly shaded,
star-lit indigo material and inlaid constellation friezes. Architectural
connection masks, directional door-leaf alignment and height remain exactly
compatible with the game renderer.

These are generated pixel-art assets, **not independently illustrated static
PNG paintings**, and there is no need to redraw player rig pieces or
change the weapon/shield animation system. The generated pack has the normal
shape `{floors,walls,scatter,meta}`, and is loaded lazily and cached through
`src/core/assets.js`.

The visual illusion of floating cosmic objects is achieved by detached
crystal/orb shapes and star motifs *inside static sprites*, enhanced in-game
by the game's existing floating glitter particle ambience and luminous
prop light. The object art itself has no new frame-based animation.

## Enemies, audio and progression

`src/data/biomes.js` registers `astral_plane` for the same shuffled
selection pool as other normal dungeon biomes. It uses the game's existing
light-element effects with amethyst, spectral, crystal, midnight and void
palette-swapped enemy artwork, including wraiths, arcane-like elementals,
floating eyes, golems, mystic cultists and astral sentinels.

`src/core/audio.js` chooses cave / night-storm / distant waterfall layers
from existing sound beds. `src/world/dungeon.js` maps astronomical props,
lanterns, celestial shrines and the central singularity to existing
light emitters; the ambient particle type is `glitter`.

`astral_plane` can be rolled naturally but never forces its own appearance.
The existing rule—force one of the overworld biomes after three consecutive
other dungeon visits—continues untouched, as does the Depth 500 throne.
Astral levels continue to use original guardian completion and item rewards.

## Developer handoff and verification

Files:
- `src/gfx/astralplane.js` — all new art generation and metadata
- `src/core/assets.js` — lazy pack loading/caching
- `src/data/biomes.js` — biome definition, monster palette, random selection
- `src/world/dungeon.js` — astral object lighting
- `src/core/audio.js` — astral ambience
- `tools/tests/data_check.mjs` — generated-pack detection
- `tools/tests/astral_plane.js` — 20-level browser QA and artwork export
- `README.md`, `docs/ART.md`, `docs/HANDOFF.md`, `CLAUDE.md` — cross-links

From a checked-out repo:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/astral_plane.js
node tools/tests/pack.js astral_plane
node tools/tests/walls.js astral astral_plane
node tools/tests/flow.js
node tools/tests/mobile.js
```

The dedicated browser test checks all 60 floors, 80 modular masks,
three sets of four directional arch slices, three sets of directional
openable door leaves, 40 atlas prop bounds and 20 generated dungeon
layouts for walkability, architecture and guardians.

It exports actual, game-consumable WebP atlas data plus metadata:

```
tools/tests/out/astral_plane_export/floors.webp
tools/tests/out/astral_plane_export/walls.webp
tools/tests/out/astral_plane_export/scatter.webp
tools/tests/out/astral_plane_export/pack.json
```

It also writes `astral_plane_gameplay.png`,
`astral_plane_40_props.png` and `astral_plane_60_floors.png`
in `tools/tests/out/` for art review. Exported test binaries are
intentionally ignored by Git, while their source is committed.

**Review status:** the source code has structural/synthetic Canvas checks
and randomized biome-selection tests. A live browser render and mobile
Safari performance/door-opening review are still needed before merging
the draft PR into `main`.
