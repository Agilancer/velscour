# CASTLE overworld biome

CASTLE is the third playable overworld beside the Forsaken Wilds and Sea of Sand. Its runtime atlases preserve the 160×80 floor grid, pivots, frame IDs, wall masks, orientation, and topology. The keep has its own six-frame floor atlas and three complete 20-piece interior wall families.

## Game integration

- `src/data/biomes.js` registers Castle as an overworld with a siege-ready monster roster.
- `src/gfx/castle.js` loads the atlas set on descent and exposes indexed exterior and keep floors, topology-aware walls, and pivot-aware props.
- `src/world/castleworld.js` builds a 336×304 Castle board (three times the old 192×176) directly at tile resolution; walls, towers and halls sit on a 2-tile cell grid. The layout is a concentric castle (see the layout section below). Scenario code reads the halls from `map.castleRooms` and the wall-walk muster points from `map.rampartPosts`, never fixed coordinates.
- Floors are dressed by `src/gfx/castleground.js`: every material (`MAT`, stored per tile in `map.castleMat`) blends into its neighbours with dithered edge and corner masks baked into the floor chunks, grass tufts, pebbles, leaves, reeds and wildflowers are baked in at the seams, the far banks of the river and moat drop to the water as earth or masonry faces, and the water flows (light streaks drifting along a flow field from the river's source round the moat to its outflow, foam at the banks, glints, deeper water darker).
- Every Castle scenario is winnable and verified by `tools/tests/scenarios.js`. Scenario foes hunt the hero across the board; rampart sieges and last stands arrive as waves along the wall walk; keep fights run as two or three back-to-back phases (the Crown Vault ends at a claimable relic, the Royal Procession must keep the royal party alive); the Sconce Ward gives the hero 8 s to reach the wall before torches start to gutter.
- Castle pathing expands with the board: spawn points, doors, scenario sites, stairs, exits, and rampart objectives are rescaled onto walkable tiles. Ramparts connect through bends, corners, gates, and broad stair landings.
- The shared shrine-activated system supplies 35 challenges. It retains the twenty general scenarios, adds five rampart encounters, and adds ten room-focused keep scenarios. Other overworlds continue to select from their applicable general scenario set.
- Sea of Sand caravan paths remain connected to the authored oasis and ruin anchors while their intermediate curves, phases, and widths vary by seed. Dune and stone seams use scattered 3–6px transition flecks in the matching terrain colors.
- `src/game/game.js` loads Castle atlases before map generation. The art remains lazy-loaded, so ordinary dungeons do not fetch the castle sheets.
- `src/data/townsfolk.js` defines 100 named town visitors backed by 25 distinct generated designs and game-engine palette variants, including ten children, linked families, four persistent regulars, the royal family, court members, and four knights. Each return brings a purposeful handful of visitors who route to shops, the plaza, and event staging spots. `TOWN_SITUATIONS` contains 2,000 distinct event cards across royal arrivals, weddings, births, parties, funerals, fairs, fights, enemy sightings, and other town life; `TOWN_CONVERSATIONS` contains 2,000 distinct two-line exchanges. Double-ruled parchment bubbles avoid nearby characters, while events animate hearts, grief tears, celebration sparks, royal crowns, alarm marks, and clashing swords.
- `assets/sprites/townsfolk/townsfolk_animation_pack.zip` contains 25 transparent identity sheets and source PNGs. Each non-knight sheet has exactly eleven 128×192 frames: three idle poses, two walk poses, dying, lying dead, scared/screaming, scared/pointing, happy, and celebration. The four distinct knight designs append two individual attack frames after the shared eleven-frame sequence. All designs match the original generated Velscour civilian finish and are not cut from playable-class or helmet sprites. Clothing and hair colors are varied at runtime. `tools/build_townsfolk_pack.py` rebuilds the standardized sheets, manifest, review sheet, and ZIP. Missing sheets use a plain civilian placeholder while loading.
- Castle wall review sheets are in `art-review/castle-wall-*.png`: each shows all 20 corner, end, straight, junction and panel pieces for one of ten masonry families. `castle-rampart-stairs.png` shows all sixteen stair pieces; `castle-walltops-landmarks.png` shows all nineteen wall-top, tower, stair-access and bridge modules. The throne dais was rescaled to sit more naturally in its open hall.
- After three non-overworld dungeon visits, the selector chooses among every registered overworld: Forsaken Wilds, Sea of Sand, or Castle. The final throne at Depth 500 still takes precedence.

## Castle layout (October 2026 overhaul: a concentric castle)

Modelled on the concentric castles of [Beaumaris and Harlech](https://en.wikipedia.org/wiki/Concentric_castle): one castle
nested inside another, the lower outer curtain covered by the higher inner one, the gatehouses offset so attackers can't
charge straight through both. The board (south at the bottom of the screen's left, as the hero arrives):

- **Approach** (south): the road from the start runs through a village (eight town-pack houses at 4×4, a green with a
  well and a market stall, fenced kitchen gardens, haystacks, chimney smoke) to the moat. Fields with furrows, fences and
  a scarecrow, and an orchard, lie to the south-west; the enemy's **siege lines** to the south-east (a palisade of
  wicker, stakes and sandbags facing the walls, four siege engines with their ammunition, eight procedural tents round
  smoking camp fires, cages, stores).
- **Moat and river**: a river comes down the west side, feeds the 8-tile moat, and leaves by the east. The moat's far
  banks show as faces dropping to the water.
- **Bridges**: three crossings use the painted arch bridge (`landmark_17`, its near-end footings cut away by
  `castleCutout`): the main bridge from the outer bank to a stone pier where the gatehouse's drawbridge comes down, the
  postern bridge over the north moat, and the east road's bridge over the outflow. Each deck is pinned to the bank
  line at ground level (the arch and piers fall away into the sunken water), sized so its far edge lands on the pier or
  far bank (`k = span tiles × 32 / 154`), and sorted from its far end so walkers draw on it.
- **Outer curtain** (`CASTLE_OUTER`, cells 48..120 × 34..100): round drum towers on the corners, square interval
  towers, the `landmark_08` twin-towered gatehouse mid-south, a postern (arched gate between two small square towers)
  north-east. A paved wall-walk lane runs round its foot (`map.rampartDeck`), with stair runs against the wall.
- **Outer ward**: the south bailey (practice yard with targets and dummies, banners, the smithy and armoury), the west
  ward (stables, a mud paddock behind timber rails), the north ward (tilled kitchen garden, orchard, dovecote, the
  postern road), the east ward (barracks, and a mason's yard repairing the curtain: scaffolds, a hoist, dressed stone).
- **Inner curtain** (`CASTLE_INNER`, 14 cells inside): taller roofed drum towers (`landmark_05`) on its corners; the
  inner gate is offset east of the gatehouse, a second inner gate opens north-west towards the postern.
- **Inner ward**: the great keep (`landmark_09` at 1.6×, cut into 32 px columns sorted from its footprint's front edge,
  so walkers beside it sort right); the **throne hall** (carpeted nave, colonnades, the dais, chandeliers, banners,
  armour), the **cathedral** (carpeted nave between pews, side aisles behind pillars, pulpit, lancet windows) and the
  **great hall** (high table, two long feasting tables on a timber floor, the hearth, the kitchen corner) as enterable
  roofless rooms; a walled garden (four hedged lawns, gravel walks, the fountain statue, ivy arches); the well and
  kitchen stores by the inner gate.
- **Edge**: a forest of the Dark Forest's towering trees (`loadDarkForestTrees`, in `map.treeCells` buckets) with the
  castle pack's trees on its fringe; a graveyard and a ruined chapel wall west of the moat, a ruined watchtower in the
  north-east woods; the exit at the end of the north road.

Scenario sites follow the scenario (`plan` in `castleworld.js`): siege engines to sabotage stand in the siege lines,
prisoners wait by its cages, the dead rise in the village and the graveyard, the crossing to hold is the main bridge,
the escort leaves through the postern, rifts and relics are in the inner ward, rampart fights are on the lane, keep
fights in the halls; each cluster is a short walk across.

Art notes: several atlas names don't describe their art. Floors are chosen by look (`F` in `castleworld.js`; e.g.
`floor_35` granite setts for courtyards, `floor_15` light cobbles for the ward roads, `floor_56` planks), and scatter
frames whose names drifted from their art are aliased by what they show (`SCATTER_ART`: frame 34 is a siege engine,
116 the fountain statue, 120 a wheelbarrow, ...). Prop heights are set in world px for the 60 px hero (`PROP_H`).
The carpet runner and the tents are procedural (`castleCarpetTiles`, `castleTent` in `gfx/castle.js`), drawn on first
use so generation stays canvas-free under Node.

```sh
node tools/tests/castle_overworld.mjs [seeds]   # 100 seeds: both curtains sealed with their gates shut, every wall cell
                                                # drawn, towers/gatehouse/arches/keep, bridges over water with open decks,
                                                # lane, halls, buildings, forest, all 35 scenarios, size caps
node tools/tests/castle_visual.js [views] [--grid]   # screenshots of every area; --grid tints blocked tiles red
```
Look at the screenshots (`tools/tests/out/castle_*.png`): layering mistakes don't throw.

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

The Castle check covers the documented tile dimensions, the threefold board area, dedicated keep atlas contracts, 100 seeded maps, all 35 scenarios, a closed curtain wall, the gate and postern crossings, the wall-walk lane, interior doors and combat rooms, objective reachability, and three-dungeon rotation among all overworlds. The Sea of Sand check covers 100 seeded maps and all route-anchor reachability. `python tools/build_townsfolk_pack.py` rebuilds the civilian sheets and ZIP from the included original generated art.
