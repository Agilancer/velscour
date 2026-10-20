# World-wide Biome Expansion & Isometric Barrier Audit

> **October 20, 2026:** the generated biome-native monsters (`bn_`) described here were removed and levels no
> longer theme their monsters by biome; the Heavenly monsters use only their painted sheets. See docs/ENEMY_ART.md.

> **October 17, 2026:** the Canvas-generated temple packs, the per-biome floor/prop/wall expansion and the AI
> floor/prop/wall atlases described below were removed. Dungeon biomes now use the painted packs only; see
> [BIOME_ART.md](BIOME_ART.md).

## Scope and current status

The `feature/worldwide-biome-art-and-spawns` branch extends **all 32 combat
biomes** in VELSCOUR: **31 indoor dungeons** (including HELL, HEAVENLY,
ASTRAL PLANE, Ice Temple, Desert Temple, and the Depth 500 throne) plus the
**Forsaken Wilds overworld**. **Herrington Hollow town** is a separate **noncombat**
environment. No monsters or enemy spawn logic are added to Herrington Hollow.

The branch expands existing runtime art instead of replacing approved
source sheets or moving any class rig, sprite pivot or architectural
depth slice. The art expansion remains a **draft** until browser screenshots,
door/wall occlusion, actual tiling and iOS Safari performance are reviewed.

**Later painted-art update:** Desert Temple, Ice Temple, Hell, Astral Plane
and Heavenly now overlay eight hand-painted floors and eight hand-painted
props from user-supplied artwork in both their native generated pack and
the appended expansion cells on desktop. The 60/40 additional cell counts,
terrain topology, and original global/native monster roster remain unchanged;
see [Approved Biome Artwork](APPROVED_BIOME_ART.md).

## Exact content counts

| Environment | Additional floors | Additional terrain / props | Walls / barriers | Additional monsters |
|---|---:|---:|---|---:|
| 31 indoor combat dungeons | **120 per biome** (3,720) | **40 per biome** (1,240) | Five biome-treated wall families with new face reliefs; full 16-mask joins and original arches/doors retained | **50 per biome** (1,550) |
| Forsaken Wilds overworld | **120** wilderness accents | **40** native designs available outdoors | Axis-correct forest fences, building facade hangings | **50** |
| Herrington Hollow town | **120** town accents | **40** new decorative assets plus existing shop/forest props | X/Y fences and building facade hangings | **0** |

Overall: **1,600 new generated native monster entries** (50 × 32 biomes);
**3,960 extra floor drawings**, and **1,320 extra terrain/prop drawings**
counting the wilderness and town. A shared catalog adds **50 wall-hanging
designs × 4 authored wall views = 200 frames** for dungeon walls and town or
wilderness building facades. The original base materials, textures,
architectural wall/door geometry, scatter and global monster catalog remain.

### Visual style and limitations

All content uses VELSCOUR's **160×80 native diamond**, 2:1 projected axes,
native sprite pixels and original pivot conventions. Existing source art is
used as the material/character foundation, with newly drawn decorative
floors, relics, ornaments, body armor, wings/horns, weapons and per-biome
materials. The existing wall, arch and door **alpha silhouettes** and
depth-slice coordinates remain authoritative. This avoids the previous
issue where a rotated or mirrored flat object appeared to have the wrong
isometric axis.

**Important distinction:** the monster graphics are generated variants
of the approved base monster illustrations. They have new names, silhouettes
overlays, equipment, adornments, biomaterial colors and variant combat
stats, but are **not 1,600 independently hand-painted full animation
sprite sheets**. Their active animations, navigation, attacks, effects,
hits and deaths reuse the existing battle-tested combat renderer and AI.
Similarly, wall material surfaces are uniquely processed per biome and
per wall family, not wholly resculpted new architectural geometry.

No claim of final pixel-perfect art approval is made before the screenshot
review. In particular, check readability at intended mobile screen zoom.

## Monster selection and rarity

The existing global BESTIARY is preserved. `src/data/biomenatives.js`
defines 50 uniquely named and registered `bn_<biome>_<00..49>` entities
for **each combat biome**. The source is an eligible painted bestiary
drawing of the matching AI archetype; `src/gfx/biomenativeart.js` builds
a biome-flavored extended, transparent image and preserves the foot pivot.

Within `rollLooks(biome)`, each selected monster *look* comes from these
weighted sources (unless one has no eligible remaining designs):

- **74%** native to the current biome
- **24%** original/normal global monster art (including the original 60
  HEAVENLY drawings when in HEAVENLY)
- **2%** natives whose home biome is elsewhere

Each biome has its original archetype roster, plus the 50 native variants
designed against that roster; this is not 50 new AI engines. Within each
biome, five guardian-tier generated natives (indexes 45–49) are
boss-only, with the other 45 eligible in regular packs. Regular mobs
retain their original health/XP scaling, elite ranks, drops, AI, attacks,
resistances and effects, with small additional per-variant adjustments.
The global pool is **not removed** from HEAVENLY or any other biome.

A dungeon rolls four different looks per archetype to improve coverage.
The 74/24/2 split applies to *look selection*, not to exact enemy counts
over an individual level; rare cross-biome visitors are stochastic.

Generated images are LRU-cached (96). Their source-art sheets are resolved
by the existing enemy loader rather than triggering bogus requests for
`biome/generated`. Cross-biome guests can appear with a 'Wayward'
designation. No town roster or town combat spawn was introduced.

## Biome environment rendering

`src/gfx/biomeexpansion.js` uses the existing source floor/stone pixels,
a stable isometric clip and native-pixel motifs to add **120** ground cells,
including **ten new repeatable floor bases** and **110 decorative feature
cells** per indoor biome. A second set of 60 motifs appends after the original
60; existing pivots, floor IDs and town terrain transitions stay in place.

It also adds **40 distinct prop entries** to each of the 31 indoor packs:
the new art includes isometric stone pedestals, obelisks, magical braziers,
shrine debris, crystal growths, urns, statuary, different ruins, banners and
barrier motifs. The palette is keyed to the biome identity so Frost,
Blood, Abyss, Crystal, Heaven, Hell and others have different treatments.
All 5 wall material families in the source pack retain their full
mask/connector variations; material pixels receive biome/individual-family
treatments plus new carved face motifs in the correct source atlas regions.
Directional arches/doors retain their original hinges and depth slices.
The five standalone Canvas-generated temples receive the same additional floor
cells on touch devices, while reusing their native wall and scatter canvases to
avoid cloning the large atlases; desktop also applies the expanded wall treatment.

`src/core/assets.js` lazily generates an expanded art pack when a dungeon
is visited. Old generated packs and indexed cell keys still work; only
newly generated base/feature floor entries enter random paving selection.
The expansion is bounded by an LRU to avoid retaining all 31 large atlases
simultaneously on mobile. The original chest, NPC, quest and loot art is
unchanged.

The original town source-ground atlas retains six standard material
bases and 120 existing edge transitions **at their original indices**.
`src/world/town.js` adds its own 120 accent tiles and 40 new scenery
designs while retaining vendors, buildings, portals and reachability checks.
`src/world/overworld.js` appends a **separate 120-cell wilderness atlas**,
and uses custom vegetation/ruins. Town and wilderness artwork use different
indexes and are not aliases of the same drawn cells.

## Wall-hanging catalog

`src/gfx/wallhangings.js` selects from a 50-item, five-atlas catalog, with four
authored views per item. The column contract matches `walltorches.js`: f/back,
b/back, b/front, f/front. Runtime selection reads a segment's actual axis and
side; the renderer never mirrors a sprite. Dungeon walls receive sparse
decorations, and Herrington Hollow/Forsaken Wilds buildings receive facade
decorations. See [WALL_HANGINGS.md](WALL_HANGINGS.md) for the catalog, source
art location, and atlas build command.

## Isometric fences and barricades

**Original defect:** town placed the *same* `split_rail_fence` sprite
along the X and Y directions, using `flip:true/false`. Reflecting an
isometric X segment does not turn it into a Y segment. Neighboring rails
therefore appeared disconnected and had the wrong ground slope.

**Correction:** `src/gfx/isobarriers.js` defines 10 material families and
renders proper native segments for either axis, with fixed foot pivot and
projected endpoint positions:

- X axis: world `(+1,0)` projects on screen to `(+80,+40)` native px;
  segment endpoints are `(-40,-20)` and `(+40,+20)` from its pivot.
- Y axis: world `(0,+1)` projects to `(-80,+40)` native px;
  endpoints are `(+40,-20)` and `(-40,+20)`.

Every full one-tile segment's endpoint matches the next segment's start
in that direction. Rail highlights, middle posts, thicker materials and
spike silhouettes all follow the actual 2:1 axes, with **no mirroring**.
Materials include wooden rail, masonry, thorn, bone, iron, crystal,
gilded, infernal, astral and heavenly.

Herrington Hollow's garden/paddock fences and ruined-yard stone boundaries now
use these pieces; wilderness stone boundaries and planned tree-line rails
use the same orientation metadata. Dungeon scatter items whose name
identifies rail/barricade/boundary are replaced with matching one-tile
isometric barriers, with axis chosen from the local exposed floor edge.
Newly generated wall-like props are included.

**Review caveat:** these are one-tile scatter obstacles rendered by the
existing depth-sorted prop renderer and do not themselves alter the
underlying map's modular wall-arm geometry. Gameplay connectivity and
collision should be checked for both straight runs and corners on mobile.

## Validation and review checklist

Static/synthetic checks were run against the actual GitHub source code
and original biome-pack metadata:
- **32/32 combat biomes** have 50 unique native IDs, each with a valid AI
  archetype and a resolvable approved monster-art source.
- **1,600/1,600** generated monster overlays returned valid sprite
  canvases and foot-anchor metadata in a mocked draw context.
- **31/31** indoor expansion generators produced the extra 120 floors,
  10 repeating bases and 40 props with valid crop bounds and retained
  original wall/door/arch metadata.
- Town and wilderness generate separate 120-floor image sets.
- All 10 barrier materials passed exact X and Y tile-axis endpoint maths.
- Sampled **76,600+ monster-look rolls** included home-native, legacy and
  low-frequency foreign monster IDs with the intended ordering.

**Still required:** real Chromium tests, tile contact-sheet inspection,
town seed reachability, passability of barricades, player occlusion behind
new pillars/fences, source-asset loading, gameplay pacing, old test suites
and performance on landscape Safari/iOS. Synthetic drawing contexts
cannot certify artwork quality, rendering or actual collisions.

From a local clone with an HTTP server at repo root:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/worldwide_biomes.js        # seven sample biome previews
node tools/tests/worldwide_biomes.js --all  # all 31 dungeon packs
node tools/tests/town.js
node tools/tests/overworld.js
node tools/tests/pack.js
node tools/tests/flow.js
node tools/tests/mobile.js
```

The new browser test captures:
- `tools/tests/out/worldwide_biomes_gameplay.png`
- `tools/tests/out/isometric_fences_and_barricades.png`

It checks town fences/terrain and NPC presence over three town seeds,
native monster source resolution, dynamic expanded tile counts and
bounds, geometry masks, wall/door use, fresh wilds floors/props, rare
cross-biome and old/global spawn presence, and forced-overworld plus
Depth 500 priority.

If any screenshots or mobile tests reveal the existing VELSCOUR art
cannot be matched sufficiently by runtime-generated shapes, replace
individual drawings with native hand-painted pixel sprite sheets while
keeping this pack metadata, name IDs and exact isometric pivots.
