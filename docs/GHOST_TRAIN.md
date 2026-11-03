# The Iron Express (beta region, id `ghost_train`)

Raiders have taken the night express across the Forsaken Wilds. The hero boards at the caboose and fights forward
car by car while the train runs; more raiders leap aboard from the line-side now and then. Twice it pulls in at a
station: step off to loot the platform, or stay aboard. The raiders' chief holds the tender; when he falls the brakes
go on and the train runs into **The Last Stop**, where the exit opens on the platform.

It began as "The Ghost Train" (docs/NEW_REGIONS.md); the user then asked for an ordinary steam train, so the look,
names and lines are a normal train's. The region id `ghost_train` and the file names were kept so nothing else breaks.
It is never in a biome bag; Velscour's skull reaches it with `train`, `iron express`, `express` or `all aboard` (or
the HAIL VELSCOUR! list). Test: `node tools/tests/ghosttrain.js [shots|noshots] [auto|noauto]`.

## Files
| File | What |
|---|---|
| `src/game/regions/ghosttrain.js` | `registerRegion`: skull words, portal/town/quest lines, load/ready/generate/createRun |
| `src/world/ghosttrain.js` | the level (pure data): car layout and kinds, the walk map, spawns, `platformOn/Off`, `aboardSpot` |
| `src/game/ghosttrain.js` | the run: motion, stations, boarders, car progress, the chief's fall, `world.cave` hook (cutaway, hiding), auto-play's `objective` |
| `src/gfx/ghosttrain3d.js` | the procedural three.js train, track, passing scenery, stations, smoke and steam; draw/tick/dispose |
| `tools/tests/ghosttrain.js` | the test (below) |

Shared file touched: only the `ghost_train` entry in `BETA_BIOMES` (`src/data/biomes.js`): named The Iron Express,
warm lamps (`torch #ffb060`), night fog `#141820`, dust motes, `el: 'physical'`, a raider/undead roster. Monsters and
the boss come from the existing bestiary (`rollLooks`, `looks.boss`): no new art, so no Credits lines. Ambience is
the existing `town` bed.

## The level (`src/world/ghosttrain.js`)
- A 100 x 24 map. The cars lie end to end along tile x on rows 11-13 (`ROW0`, three wide): the caboose (7 tiles, its
  stove column blocked), six cars of 9 (`gondola`, `coach`, `flat`, `boxcar`, `coach`, `mail`), the tender (8, its
  front two columns the coal heap) and the engine (11, all blocked). A one-tile gangway joins each pair. Everything
  else is void (`t = 0`) while the train runs.
- `KINDS`: each car has a roof or not, its side height, and crates (blocked, on the far row) on the flat car and the
  boxcar. Bodies are at most 0.42 tiles round, so every lane passes.
- Spawns: one pack on each of the first two cars, two on the rest (bigger further forward, a champion pack on cars 4
  and 6); the boss (`looks.boss(roster)`) on the tender. Every roster look is picked at generation, so the boarders'
  art loads with the level.
- A station's platform is on the near side (toward the camera), rows 14-18 (`PLAT0..PLAT1`), `PLAT_LEN` (24) tiles
  long; `platformOn(map, x0, x1)` writes it walkable, `platformOff(map)` wipes it and clears the path caches.

## The run (`src/game/ghosttrain.js`)
- Phases: `run` (9 tiles/s) -> `brake` (a station called: it comes in from 110 tiles ahead, braking at 3.2 tiles/s²
  so `stationX = stop.x + v²/2a` lands exactly) -> `stop` (30 s; "ALL ABOARD!" at 8 s left) -> `leave` -> `run`. The
  stop is centred on the hero's x (clamped to the train).
- Stations (Hollowmere Halt, Saint Vey's Crossing) are called after 2 and 4 cars are cleared: two chests and 3-5
  raiders on the platform. On departure the hero and his allies on the platform leap back aboard (`aboardSpot`: the
  nearest walkable car tile, never a crate), raiders on it are left behind (removed, no loot), ground loot is swept
  aboard and unopened chests go.
- Boarders: every 22-32 s while running, 2-5 of the roster leap aboard near the hero (ring telegraph, `m.entering`
  arc), at most 8 alive, none once all six cars are clear.
- A car is clear when every monster spawned on it is dead (`CAR n CLEAR`). The boss's card reads "He holds the engine".
- The chief's fall: `dying` ("THE ENGINE IS YOURS", steam shut off over 3 s) -> `last` (The Last Stop brakes in) ->
  `done`: three chests (one rare) and the exit portal on the platform, `onSuccess()` (game.js opens the exit; a first
  clear gives a skill point).
- `objective` for auto-play: the nearest live monster of the first uncleared car; at a stop the nearest unopened chest
  (then back aboard); the boss once the cars are clear; its own spot while the train rolls into the Last Stop.
- `world.cave`: `draw` (the 3D), `horizon` (anyone inside a roofed car the hero is not in is hidden, the see-through
  rims still showing; in an open car, the part below its near side), `mask` (the engine's outline cut from a sprite
  behind it), `frame` (zoom 0.9, focus), `elev`/`pick` null (flat map). `trainCutaway(heroX)` hides the roof and near
  side of the car the hero is in.

## The 3D (`src/gfx/ghosttrain3d.js`)
- The Pirate Seas' camera (orthographic, 30 degrees down, 45 round; tile (x, y) at height h is (x, h, y)) rendered at
  one pixel per world px behind the sprites. Car floors at height 0, rails at -1.1, ground at -1.25.
- The look is a grimdark gothic war train (the user asked for "Warhammer Fantasy vibes": the mood only, no names or
  emblems), in dark riveted iron, bronze and deep red. Cars: deep red plank sides over riveted iron armour plates,
  pointed (gothic) lit windows with bronze sills, dark iron roofs with a bronze ridge and spikes along the eaves, iron
  lanterns; the caboose has a battlemented watch turret and a banner; the gondola and the tender are war wagons with
  battlements, spiked corner posts and red banners; the flat car has spiked iron stakes. The locomotive: an armoured
  octagonal boiler in bronze bands, a deep red iron cab with battlements, pointed windows, glowing furnace grates and
  two war banners, a spiked dome, a crowned chimney ringed with iron spikes, a bronze skull on the smokebox door with
  furnace-lit eyes, a spiked iron ram for a cowcatcher, red iron driving wheels with bronze hubs and turning side
  rods. Thin dark outlines on every edge so it reads at a glance.
- Textures are the repo's own (no new art), loaded with three.js in `loadTrain3D` (`TEX`): the airship pack's
  planks and metals (`assets/source/airship/textures/`: grey boards tinted per car for the painted sides, worn oak
  floors, riveted black iron, hammered gunmetal tinted green/grey for the boiler, cab and roofs, flaked iron tinted red
  for wheels and buffers, stained brass, weathered cedar benches, coarse sail canvas tinted red for the banners) and the castle bake's (`assets/source/castle3d/tex/`:
  `wood` crates, `brick` station house, `slate` roof, `ashlar` platforms), the same runtime paths the Serpentine Tower
  loads. Grey ones are brought to a set brightness and tinted by the material colour, so the colour scheme holds.
  UVs are world-space (`boxUV`, a box projection, units per repeat from `TEX`), so a texture keeps its scale on every
  part and merged parts share one material. A texture that fails to load leaves its parts a flat colour.
- The train never moves: the ground and ballast scroll, ~46 instanced items (trees, telegraph poles, bushes, rocks;
  low ones only on the near side, none where the platforms stand) slide past and wrap, coal smoke trails back from the
  chimney (rises when stopped, thins as she brakes) and steam puffs from the cylinders while she runs.
- Static geometry is merged per material with `BufferGeometryUtils`; each car's roof and near side are one group of
  their own (the cutaway). Point lights (3 on touch, 5 on desktop) go to the lamps nearest the hero; the run adds 2D
  lights for the car lamps, the firebox, the headlamp and the station lamps against the night.
- The station: a stone (ashlar) platform with a white edge, iron lanterns on posts, benches and a name sign (canvas
  text) on the near side; across the track a gothic brick hall (pointed lit windows and door, stone buttresses, a steep
  slate roof with bronze finials) and a belfry with a spire. One group moved to `stationX`.
- The scene is disposed when the hero is on another level (a 2.5 s check against `G.world`) or the next train is
  built. `ready()` is false if three.js can't load, and the region plays as the Forsaken Wilds.

## Test (`tools/tests/ghosttrain.js`)
The skull word reaches it and it is never drawn into the rotation; 30 seeds (every spawn and the town portal reachable,
nothing walkable off the train, a platform joins and leaves); a station in play (brakes, stands with chests and
raiders, the hero left on the platform leaps back aboard, the platform is void again, the ground streams by); the
cutaway and hiding, the engine mask; the chief's fall to the Last Stop (exit open and reachable); the three.js
fallback and the scene's disposal; auto-play from the caboose to the exit (a fresh paladin at depth 1, about two game
minutes); screenshots including the phone layout.

## Status
Built (beta), November 2026. `ghosttrain.js` passes; `flow.js` passes.

## Next
- Tune: boarder rate and pack sizes at deep depths; the stop length (30 s) against how fast heroes loot.
- More stations and line-side set pieces (a water tower stop, a tunnel, a bridge over a gorge), a named conductor
  with a line or two.
- Give the chief's fight something of the train's own (a steam vent on the tender, the whistle calling raiders).
- Seats and luggage racks inside the coaches; a fade instead of the instant cutaway.
- Not tested on Safari/Firefox; perf on phones not measured (`perf.js` doesn't cover regions).
