# Ice Temple — Palace of the Everfrost

## Identity

The **Palace of the Everfrost** is a self-contained indoor dungeon biome in
VELSCOUR's normal random biome shuffle. It is distinct from the existing
**Frozen Ossuary**, **Crystal Caverns**, and **Forsaken Wilds overworld**.
It uses ordinary dungeon room/corridor/cave generation, animated doors, arches,
a guardian, chests, enemies, normal loot/XP, dungeon exits, and minimap.

The art direction is a long-abandoned glacial palace: hoarfrost masonry,
aurora-illuminated reliquaries, blue-black ice, pale columns, frozen tombs,
crystal growths, rune-lit altars, and sapphire/violet magical fire. Silhouettes,
tile dimensions and pivots were designed around the existing isometric 2D
class armor/helm art; **no player class rigging or gear is changed**.

## All generated environmental art

`src/gfx/icetemple.js` is the source of the art. It creates real Canvas
atlases the renderer draws directly: no external sprites, runtime shader,
static ZIP, special loader dependency or build step. The art is original
procedural pixel geometry, plus a recoloured/designed architectural surface
that is constrained by the prevalidated Catacombs architecture silhouettes.

| Art family | Amount / dimensions | Contents |
|---|---|---|
| Floors | **60** at 160×80, including ten repeatable bases | Glacial limestone, hoarfrost stone, sapphire slate, white ice, aurora mosaic, frozen court, black ice; 50 additional snowflake/runic relief/crack/ice vein designs |
| Wall families | **5 × 16 connection masks = 80 combinations** | Hoarfrost Ashlar, Glacier Buttresses, Winter Reliquary, Aurora Sanctum, Blackice Citadel |
| Arches | **3 × 4 directions** | Frost Lancet, Crystal Triumph, Winter Gate |
| Doors | **3 × 4 directions × open and closed** | Glacial Bronze, Icebound Oak, Aurora Seal |
| Props | **40 unique named sprites** at 160×160 cells | Obelisks, ice crystal clusters, ancient glacial statues, columns, frozen coffins, urns, three flame colors, aurora shrine, hanging icicles, snow and frozen rubble, bone piles, rune seals, throne, mirrors and relic chests |

All architecture reuses the proven **source geometry and per-arm depth-slice
masks**, **not** the source's brown/grey material coloration. The pixel material
is replaced with ice-blue stone, shadowed joins, aurora friezes, and glowing
rune highlights, with all pixels clipped to the same wall/arch/door
alpha masks. That is essential for occlusion, collision, door leaves and
the exact scale of a player sprite against a wall.

The new floor art and prop art are drawn directly from shapes and patterns.
The same 160×80 tile coordinates, sprite ground pivots and `TW/160` scale
as `docs/ART.md` apply. Stone floor motifs are inset from the shared border
to avoid ugly tiled seams. All props have collision or walk-over flags.

This is **not a collection of separately hand-painted wall PNGs**. It is an
editable, deterministic, runtime art generator. To replace the architecture
silhouettes with completely unique, independently drawn geometry, import
a traditional `<Name>_Biome_Pack.zip` with the manifest template described
in `docs/ART.md`.

## Integration

- `src/gfx/icetemple.js` — floor, architecture, and prop atlas source;
  generated only when entering the biome.
- `src/core/assets.js` — `loadPack('ice_temple')` lazy generation and caching.
  All other biomes continue using their own packs without changes.
- `src/data/biomes.js` — `ice_temple` registration, cold-element roster,
  ice/crystal/frost palette swaps, and participation in normal biome selection.
- `src/world/dungeon.js` — cold/aurora lamp light radii.
- `src/core/audio.js` — stormy cavern, interior wind, deep cave ambience.
- `tools/tests/data_check.mjs` — recognition of an art generator pack.
- `tools/tests/ice_temple.js` — QA, screenshot contact sheets and export.

Frozen enemies include skeletons, spectral wraiths, ice golems, cold elementals,
haunted knights, airborne foes, and reanimated tomb guardians. Rare and
greater monsters retain VELSCOUR's original enemy-art/palette-swap framework.
The ordinary end guardian guards the usual sealed dungeon exit.

This biome counts as a **non-overworld** visit for the Forsaken Wilds
three-dungeon overworld guarantee. The exact Depth 500 throne remains non-negotiable.

## Exporting actual art

The game's original art is generated in memory, so `assets/tiles/ice_temple/`
does not contain any hand-edited files. To hand off a game-ready physical pack
to another developer, run the browser QA script. It exports:

```
tools/tests/out/ice_temple_export/floors.webp
tools/tests/out/ice_temple_export/walls.webp
tools/tests/out/ice_temple_export/scatter.webp
tools/tests/out/ice_temple_export/pack.json
```

It also creates a gameplay screenshot, 40-prop contact sheet, and
60-floor contact sheet in `tools/tests/out/`. The exported metadata uses
the **exact ordinary tile-set schema** and can be moved into
`assets/tiles/ice_temple/` after deliberately replacing the runtime loader.
These generated test outputs are ignored by Git by design.

## Validation

From a local clone, serve the root over HTTP and run:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/ice_temple.js
node tools/tests/pack.js ice_temple
node tools/tests/walls.js ice ice_temple
node tools/tests/flow.js
node tools/tests/mobile.js
```

The dedicated test checks all wall connection patterns, four directions of
all arches, both door states and animated leaf slices, 60 floors, 40 named props,
normal guardian appearance, and 16 generated dungeon layouts for reachable
floors. It also confirms that the throne and scheduled overworld still take
priority in the biome scheduler.

**Validation status:** structure, original palette art generation and shuffle
selection were inspected with synthetic Canvas contexts. Actual in-game
rendering, frame-rate, mobile Safari display, and boss/door gameplay require
browser QA and screenshot review before a production merge.
