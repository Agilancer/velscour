# The Serpentine Tower

A wide stone tower climbed by a spiral stair that hugs its wall, drawn live in three.js behind the 2D sprites. The
hero walks up-left on screen; the camera turns with him, so the tower seems to turn beneath his feet. At the top a
door opens onto the roof, where three waves of bosses come, then the last boss flies in on an airship. Its fall
opens a portal out.

It is an overworld biome (`serpentine_tower` in `src/data/biomes.js`, `overworld: true, tower: true`), so it is in
the regular draw and the overworld guarantee. Velscour's skull also reaches it: send the message `tower`, or pick it
on the HAIL VELSCOUR! list.

| File | What |
|---|---|
| `src/world/tower.js` | `TOWER_VARIANTS` (5), `towerGeo` (the numbers and maps between tiles and the tower), `generateTower` |
| `src/game/tower.js` | the run: the warp, the camera turn, the climb's arrivals, the stairhead, the 20 `SCENARIOS`, ropes, cannonballs, lightning, the minimap |
| `src/gfx/tower3d.js` | the three.js scene: wall, stair, railings, lanterns, windows, banners, chandeliers, dome, roof; the renderer; airships |
| `tools/tests/tower.js` | the test (below) |

## How the 2D game plays on a 3D spiral
- **The stair, unrolled.** The game's grid holds the stair as a straight strip `w` tiles wide: `x` runs down the stair
  (the top is the `-x` end), `y` runs from the wall (`YR`) to the railing (`YR + w`). A tile position `(x, y)` is the
  point at arc length `s = X1 - x` along the stair's centre line and radius `rWall - (y - YR)`. Its height is a smooth
  ramp, so bodies slide up the steps and never hop them. The 3D steps are real steps; feet sit on the treads to within
  half a riser.
- **The warp.** `view.js` has `setWarp(warp, pick)`: while it is set, `isoX`/`isoY` (which nearly every drawing call
  uses) put a tile position where the 3D tower shows it. The tower's warp maps `(x, y)` to the helix, turns it by the
  camera angle `alpha` and applies the game's own iso projection (45.25 px a tile across, `VZ` = 39.19 px a tile up).
  `pick` inverts it for the mouse by Newton steps from the flat inverse round the hero.
- **The camera turns, not the hero.** Each frame `alpha` is set so the hero's own stretch of stair runs up-left on
  screen (as on a flat level), so moving and aiming feel normal. Near the hero the warp is the flat iso view. The
  stair ahead curves up and to the left, the floor above is in view at the top of the screen, and the floor below at
  the bottom. A blink or teleport turns the camera at once.
- **The cutaway.** The camera is orthographic, so the near half of the tower would hide everything. While climbing,
  geometry nearer the camera than the axis is clipped (a three.js clip plane). Back faces then show where the cut
  slices a solid, drawn as the stone itself, unlit and dark. The 2D warp hides sprites, spells and lights there too,
  which is where packs charge up from behind.
- **The roof** is a disk of its own at the `-x` end of the same grid, joined to the stair only by the stairhead door.
  Stepping through it is a flash and a move. There the warp is a plain translation and the camera angle is fixed.
- **Drawing.** `render.js` asks `world.tower.draw` for the backdrop instead of floor chunks. The 3D view renders at
  one pixel per world px (0.75 on touch) and is scaled up without smoothing, like the sprites over it. Only the
  lanterns nearest the hero get point lights (7, or 4 on touch); the rest glow on their own. Blood decals are not
  baked into floor chunks (the stair turns), so they are drawn live.

## The climb
- Packs wait all the way up, asleep until the hero comes (they are a whole turn away along the stair). About 40% of
  those above the first turn are **droppers**: when the hero passes beneath them they hop the railing, fall down the
  well past the floor between and vault over the railing onto his stretch of stair.
- A pack **charges up from behind**, out of the cutaway, every 26-40 s and every 24 tiles climbed (both: a slow climb
  isn't buried, and nothing can be farmed).
- Air Pirates **throw grappling hooks** onto the railing from the well below (every 16-28 s and every 14 tiles
  climbed), climb the rope hand over hand and vault over.
- Lanterns every 8.5 tiles of stair, chandeliers on one chain down the middle (never over the stair), a chest on every
  other turn's landing and two at the stairhead. The minimap draws the tower from above: the turn you're on and the
  stair climbed so far.

## The five variants
| Variant | Size | Look |
|---|---|---|
| The Serpentine Tower | well radius 11, stair 6 wide, 4 turns | verdigris ashlar, amber lanterns, cartwheel chandeliers, serpent-headed newels on a copper rail, lancet windows |
| The Obsidian Coil | well 13, stair 6, 3.5 turns (the widest) | black-violet brick, violet lanterns, iron crown chandeliers, an iron railing, arrow slits |
| The Bloodstone Spire | well 10, stair 7, 4.5 turns (the tallest) | red ashlar, black iron, tiered candelabra chandeliers, balusters, rose windows |
| The Rimeglass Tower | well 12, stair 6, 4 turns | frost-white chapel stone, cold blue lanterns, crystal chandeliers, a carved arcade parapet |
| The Sunken Bell Tower | well 11, stair 7, 4 turns | sandstone brick, gold, bronze bells hung as chandeliers |

Every texture is palette swapped from the Castle 3D masonry (`assets/source/castle3d/tex/`) and the airship pack's
metals and cloth (`assets/source/airship/textures/`) by `core/util.js recolor`. Each variant has its own sky.

## The roof and its 20 scenarios
The roof is a crenellated disk with the stairhead turret (where the hero comes out) and three braziers. One scenario
is rolled per tower. Each runs: an intro, **three boss waves** (1, 2, then 1 boss with adds and champions; the third
may be a pirate captain), and then **the last boss's airship**. The ship flies in from astern and docks up-left of the
roof, lowers a gangplank onto the parapet, and the captain walks down it. The captain fights as a raid boss (the raid
template fitting the captain; no execute timer; 60% of a BOSS ROOM's life, because the waves came first). When the
captain falls, the ship burns and sinks, the boats leave, and **the exit portal opens in the middle of the roof**.

Waves arrive by `drop` (out of the sky), `climb` (up the outside of the parapet on hooks), `skiff` (down a pirate
boat's ramp; `skiff2`: two boats at once), `stairs` (out of the turret) or `teleport`. Events while the fight is on:
`boarders` (a boat docks with crew), `hooks`, `cannon` (a docked ship's broadside: cannonballs arc onto marked
rings), `storm` (lightning strikes), `gust` (the wind shoves everyone across the roof) and `fire` (cinderbombs leave
burning patches).

| # | Scenario | What happens |
|---|---|---|
| 0 | The Black Sail | Admiral Veyl's galleon; boarders |
| 1 | Storm Widow | Captain Sable Vane's ironclad; lightning |
| 2 | The Hollow Fleet | pale ghost ships and drowned pirates; darker; boarders |
| 3 | Glass Gale | Madam Stormglass; gales across the roof |
| 4 | Gallows Siege | every wave climbs the parapet; hooks all fight long; the Gallows King |
| 5 | Rookery Duel | Brass-Beak; mostly pirates; waves out of the turret and a boat |
| 6 | Red Gale | the Red Gale Corsair; cinderbombs and burning roof |
| 7 | The Warden's Cage | the Warden of the Rookery; grapple haulers; hooks |
| 8 | Thundershroud | Lord Thundershroud; lightning and broadsides |
| 9 | The Last Boarding | the Last Boarding Saint, with an escort boat |
| 10 | Broadside | an ironclad hangs off the roof from the first wave, firing; its captain comes off it |
| 11 | Pincer | two boats at once on the later waves |
| 12 | Ambush at the Stairhead | pirates already on the roof when you come out |
| 13 | Powder Roof | Powder-Keg Runners in every wave; broadsides; boarders |
| 14 | Eclipse | the moon goes out; hooks |
| 15 | Armada | three escort boats with the flagship; boarders |
| 16 | Two Flags | two captains on two ships at the end |
| 17 | Death from Above | every wave drops from the sky; cinderbombs and broadsides |
| 18 | The Treasure Barge | after the win a hauler docks and leaves three rich chests |
| 19 | Mutiny on the Wind | pirates only, and the captain enraged |

Ships dock only on the far half of the roof (up-left for big ships; left, right and the far side for boats), so they
never hide the fight. On the roof the camera pulls back a little (`camera.zoomK` 0.82), leans toward the centre, and
looks toward the flagship while it comes in.

## The Air Pirates
The boarders, the hook climbers and the ten captains are the Sky Battle's Air Pirates (`src/data/airpirates.js`
`AIR_ART`, docs/SKY_BATTLE.md): the same art and archetypes, never in a level's random looks. The tower picks them by id
(`ap_` + the name); its captains each fight with the raid template that suits them (`CAPTAIN_TPL` in `game/tower.js`).

## three.js
`index.html` has an import map for three.js 0.170 from jsdelivr, the same as the 3D tools. Nothing loads it until a
tower level does (`loadTower3D`, from `game.loadLevelArt`). If it can't be fetched, `buildDungeon` swaps the tower for
the Forsaken Wilds and says so. The airships are the tools' own modules (`tools/airship3d*.js`, docs/AIRSHIP_3D.md),
imported on demand when a tower is built.

## Test
```bash
node tools/tests/tower.js [variants] [scenarios] [noauto]   # e.g. 0,2 0-19; 'none' skips a part
```
The skull and the draw; every variant: the stair walkable end to end, picking inverts the warp, shots of the foot, a
turn up, three quarters up, a drop, the hooks, the stairhead and the roof; every scenario run to the portal with
shots of a boat boarding, the docked airship, the captain landed and the portal; then auto-play climbs a random tower
and takes its roof in god mode. On Windows use the GPU (`CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu
--ignore-gpu-blocklist"`); SwiftShader is slow at this.

## Not verified / open
- Only headless Chromium has run it. Phones' frame cost with three.js on top of the 2D frame is unmeasured on real
  devices.
- Sprites are drawn over the 3D view, so a body standing right at the railing draws in front of it, and the chandeliers
  never hide anyone behind them.
- The design calls were made without asking: the cutaway look, the up-left dock for the flagship, a raid boss as the
  last boss, 60% of its life, no execute timer, and the tower being in the regular overworld rotation.
