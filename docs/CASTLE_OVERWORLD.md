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
- `src/data/townsfolk.js` defines 100 named town visitors backed by 25 distinct generated designs and game-engine palette variants, including ten children, linked families, four persistent regulars, the royal family, court members, and four knights. Each return brings a purposeful handful of visitors who route to shops, the plaza, and event staging spots. `TOWN_SITUATIONS` contains 2,000 distinct event cards across royal arrivals, weddings, births, parties, funerals, fairs, fights, enemy sightings, and other town life; `TOWN_CONVERSATIONS` contains 2,000 distinct two-line exchanges. Double-ruled parchment bubbles avoid nearby characters, while events animate hearts, grief tears, celebration sparks, royal crowns, alarm marks, and clashing swords.
- `assets/sprites/townsfolk/townsfolk_animation_pack.zip` contains 25 transparent identity sheets and source PNGs. Each non-knight sheet has exactly eleven 128×192 frames: three idle poses, two walk poses, dying, lying dead, scared/screaming, scared/pointing, happy, and celebration. The four distinct knight designs append two individual attack frames after the shared eleven-frame sequence. All designs match the original generated Velscour civilian finish and are not cut from playable-class or helmet sprites. Clothing and hair colors are varied at runtime. `tools/build_townsfolk_pack.py` rebuilds the standardized sheets, manifest, review sheet, and ZIP. Missing sheets use a plain civilian placeholder while loading.
- Castle wall review sheets are in `art-review/castle-wall-*.png`: each shows all 20 corner, end, straight, junction and panel pieces for one of ten masonry families. `castle-rampart-stairs.png` shows all sixteen stair pieces; `castle-walltops-landmarks.png` shows all nineteen wall-top, tower, stair-access and bridge modules. The throne dais was rescaled to sit more naturally in its open hall.
- After three non-overworld dungeon visits, the selector chooses among every registered overworld: Forsaken Wilds, Sea of Sand, or Castle. The final throne at Depth 500 still takes precedence.

## Castle architecture and sprite scale audit (October 2026)

The visual composition is guided by real medieval fortifications rather than
a flat row of decorative wall tiles. Reference examples: [English Heritage,
stone castles](https://historicengland.org.uk/images-books/publications/iha-stone-castles/heag235-stone-castles/),
[Conisbrough curtain walls and gatehouse](https://production.english-heritage.org.uk/visit/places/conisbrough-castle/history/description/),
and [Dunstanburgh's outer ward](https://www.english-heritage.org.uk/visit/places/dunstanburgh-castle/history/description/).
Real defensive architecture has linked curtain walls, projecting towers,
protected entrances, crenellated parapets and circulation between courtyards,
gatehouses and inner rooms. The Castle uses its original isometric assets
for these parts, with no new procedural or placeholder walls.

**The critical scale fix:** Castle expands its original 96×88 layout to
192×176 while the player's height remains about **60 world pixels**.
Previously *every* sprite was blindly enlarged by 2 along with wall
positions, including furniture and loose clutter. This put the throne
dais at about 272 world pixels high and a cathedral pew at about 90
pixels high—physically oversized for the player. Geometry remains
expanded, but `src/gfx/castlescale.js` sets category-appropriate
dimensions for decorative items and caps unusually large atlas sprites:

| Existing artwork | Intended world height |
|---|---:|
| Throne dais | 92 px |
| Cathedral pew | 34 px |
| Cathedral pulpit | 78 px |
| Hanging chandelier | 55 px |
| Floor candelabrum | 48 px |
| Existing straight curtain wall module | ~132 px |
| Trees | up to 170 px |
| Castle landmarks / gatehouses | up to 238 px high; up to 320 px wide |
| Stair modules | up to 150 px |
| Loose scatter | up to 46 px |

The 160px-wide source moat-bank tiles now map to exactly one **64px**
world diamond, so their backgrounds no longer spill across adjacent
water cells. Renderers continue to honor original transparent margins,
ground pivots and the non-mirrored, authored isometric orientations.

The ten approved exterior wall styles are now placed in long contiguous
runs rather than swapping at every change of direction. Topology masks
(ends, straights, corners, tees and crosses) are untouched. Existing
authored crenellated modules accent key straight walls, with original
arch-gate artwork filling the three side posterns. Keep walls also receive
a few authored directional windows and room plaques. The open-roof
throne room, cathedral and great hall remain navigable for combat and
retain all encounter and doorway logic. No character, combat or skill
art was modified.

The following command checks the 100 seeded boards, playable wall
walk, gate connectivity, all ten masonry families, existing encounters,
new gate/window/battlement placements, and the scale/size caps:

```sh
node tools/tests/castle_overworld.mjs
```

Visual QA: compare screens of all three keep rooms, the main drawbridge,
both side posterns, stairs, outer walls and towers at the same zoom as
a 60px hero. Automated metadata and code checks cannot replace an
actual in-game visual inspection, especially for wall layering.

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
