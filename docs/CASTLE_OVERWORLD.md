# CASTLE overworld biome

CASTLE is the third playable overworld beside the Forsaken Wilds and Sea of Sand. Its runtime atlases preserve the 160×80 floor grid, pivots, frame IDs, wall masks, orientation, and topology. The keep has its own six-frame floor atlas and three complete 20-piece interior wall families.

## Game integration

- `src/data/biomes.js` registers Castle as an overworld with a siege-ready monster roster.
- `src/gfx/castle.js` loads the atlas set on descent and exposes indexed exterior and keep floors, topology-aware walls, and pivot-aware props.
- `src/world/castleworld.js` builds a 192×176 Castle board by expanding a 96×88 layout twofold in each dimension. The layout follows real quadrangular castles (see the layout section below): a moat ring, one continuous crenellated curtain wall, round corner towers, square flanking towers, a twin-towered gatehouse with drawbridge and stone bridge on the south, a postern and bridge on the north, and three enterable halls (throne hall, chapel, great hall) round an open courtyard behind a paved wall-walk lane. Scenario code reads the halls from `map.castleRooms` and the wall-walk muster points from `map.rampartPosts`, never fixed coordinates.
- Every Castle scenario is winnable and verified by `tools/tests/scenarios.js`. Scenario foes hunt the hero across the board; rampart sieges and last stands arrive as waves along the wall walk; keep fights run as two or three back-to-back phases (the Crown Vault ends at a claimable relic, the Royal Procession must keep the royal party alive); the Sconce Ward gives the hero 8 s to reach the wall before torches start to gutter.
- Castle pathing expands with the board: spawn points, doors, scenario sites, stairs, exits, and rampart objectives are rescaled onto walkable tiles. Ramparts connect through bends, corners, gates, and broad stair landings.
- The shared shrine-activated system supplies 35 challenges. It retains the twenty general scenarios, adds five rampart encounters, and adds ten room-focused keep scenarios. Other overworlds continue to select from their applicable general scenario set.
- Sea of Sand caravan paths remain connected to the authored oasis and ruin anchors while their intermediate curves, phases, and widths vary by seed. Dune and stone seams use scattered 3–6px transition flecks in the matching terrain colors.
- `src/game/game.js` loads Castle atlases before map generation. The art remains lazy-loaded, so ordinary dungeons do not fetch the castle sheets.
- `src/data/townsfolk.js` defines 100 named town visitors backed by 25 distinct generated designs and game-engine palette variants, including ten children, linked families, four persistent regulars, the royal family, court members, and four knights. Each return brings a purposeful handful of visitors who route to shops, the plaza, and event staging spots. `TOWN_SITUATIONS` contains 2,000 distinct event cards across royal arrivals, weddings, births, parties, funerals, fairs, fights, enemy sightings, and other town life; `TOWN_CONVERSATIONS` contains 2,000 distinct two-line exchanges. Double-ruled parchment bubbles avoid nearby characters, while events animate hearts, grief tears, celebration sparks, royal crowns, alarm marks, and clashing swords.
- `assets/sprites/townsfolk/townsfolk_animation_pack.zip` contains 25 transparent identity sheets and source PNGs. Each non-knight sheet has exactly eleven 128×192 frames: three idle poses, two walk poses, dying, lying dead, scared/screaming, scared/pointing, happy, and celebration. The four distinct knight designs append two individual attack frames after the shared eleven-frame sequence. All designs match the original generated Velscour civilian finish and are not cut from playable-class or helmet sprites. Clothing and hair colors are varied at runtime. `tools/build_townsfolk_pack.py` rebuilds the standardized sheets, manifest, review sheet, and ZIP. Missing sheets use a plain civilian placeholder while loading.
- Castle wall review sheets are in `art-review/castle-wall-*.png`: each shows all 20 corner, end, straight, junction and panel pieces for one of ten masonry families. `castle-rampart-stairs.png` shows all sixteen stair pieces; `castle-walltops-landmarks.png` shows all nineteen wall-top, tower, stair-access and bridge modules. The throne dais was rescaled to sit more naturally in its open hall.
- After three non-overworld dungeon visits, the selector chooses among every registered overworld: Forsaken Wilds, Sea of Sand, or Castle. The final throne at Depth 500 still takes precedence.

## Castle layout (October 2026 rebuild)

The layout is modelled on [Bodiam](https://en.wikipedia.org/wiki/Bodiam_Castle) (quadrangular plan, round corner
towers, square towers mid-wall, a twin-towered gatehouse facing a bridge, a postern opposite, domestic ranges built
round a central courtyard, a moat on every side) and [Beaumaris](https://en.wikipedia.org/wiki/Beaumaris_Castle)
(square plan inside a wet moat). The previous build traced a jagged diagonal wall path; Bresenham's diagonal steps
left cells touching only at corners, so walls had holes and towers floated off the wall line.

- **Curtain wall** (`CASTLE_WALL`, base cells 28..68 × 20..68): solid one-cell-thick wall, blocked for pathing,
  open only at the gate (x 47..49 on the south wall) and the postern (x 61..62 on the north wall). It is drawn from
  one 66px slice of `castle_landmark_04_curtain_wall_battlement` per wall cell (`castleStrip`), tiled along the run;
  west/east runs mirror the slice. Each slice is anchored at the low end of its cell's face so heroes in front of the
  wall always draw in front and heroes behind it draw behind.
- **Towers and gatehouse** are cut into the same 64px screen columns as the wall (`sliced()` in `castleworld.js`);
  each column is drawn just in front of the wall cell it stands on, so towers always cover the wall behind them with
  no slivers and nothing drawn across them. Round towers (`landmark_01`) take the corners; square towers
  (`landmark_03`) flank the walls and the postern; `landmark_08` is the gatehouse.
- **Moat**: a 4-cell ring one berm cell outside the curtain. Stone causeways line up with the gate and postern, and
  `landmark_17` stone bridges are drawn over them (sorted from their far end so walkers draw on the deck).
- **Ward**: a paved wall-walk lane (`map.rampartDeck`, 3 cells wide) inside the curtain; the throne hall stands on
  the processional axis opposite the gate, the chapel and great hall on either side of the courtyard. Keep walls
  are tinted to the curtain's limestone (`KEEP_STONE`, recoloured lazily on first draw).
- Floor tiles are chosen by how they look: several atlas names don't describe their art (`mossy_lawn` is brown
  dirt, `castle_road_gravel` is green grass).

Scale: the curtain and towers share one stone scale (`ART_K`, 64/66); the wall face is about 2× the 60px hero,
corner towers about 6×, the gatehouse about 8×. Furniture and loose props keep the hero-relative heights in
`src/gfx/castlescale.js`; props flagged `fixedK` are already in world scale and skip the 2× expansion.

```sh
node tools/tests/castle_overworld.mjs        # 100 seeds: no wall holes (ward sealed without its gates), every wall
                                             # cell drawn, towers/gatehouse/bridges, lane, gates, halls, size caps
node tools/tests/castle_visual.js [views]    # screenshots: overview, approach, gatehouse, corners, postern, halls
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

The Castle check covers the documented tile dimensions, fourfold board area, dedicated keep atlas contracts, 100 seeded maps, all 35 scenarios, a closed curtain wall, the gate and postern crossings, the wall-walk lane, interior doors and combat rooms, objective reachability, and three-dungeon rotation among all overworlds. The Sea of Sand check covers 100 seeded maps and all route-anchor reachability. `python tools/build_townsfolk_pack.py` rebuilds the civilian sheets and ZIP from the included original generated art.
