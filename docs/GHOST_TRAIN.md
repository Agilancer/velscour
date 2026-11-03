# The Iron Express (beta region, id `ghost_train`)

Raiders have taken the night express across the Forsaken Wilds. The hero boards at the caboose and fights forward
car by car while the train runs (sixteen of them); more raiders leap aboard from the line-side now and then. Their
lieutenant holds the prison car halfway along, and the line crosses Hangman's Gorge on an iron trestle. Five times it
pulls in at a station: step off to loot the platform, or stay aboard. The raiders' chief holds the tender; when he
falls the brakes go on and the train runs into **The Last Stop**, where the exit opens on the platform.

It began as "The Ghost Train" (docs/NEW_REGIONS.md); the user then asked for an ordinary steam train, so the look,
names and lines are a normal train's. The region id `ghost_train` and the file names were kept so nothing else breaks.
It is never in a biome bag; Velscour's skull reaches it with `train`, `iron express`, `express` or `all aboard` (or
the HAIL VELSCOUR! list). Test: `node tools/tests/ghosttrain.js [shots|noshots] [auto|noauto] [depths] [classes]`.

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
the existing `town` bed. The chief's fight adds `trainVent(kind)` to the 3D (steam from the tender, the whistle's plume;
the puff pool grew from 34 to 56).

The ride was made ~2.5x longer (16 fight cars instead of 6, 5 stations instead of 2, a lieutenant and the gorge): see
the sections below. Auto-play now takes ~5 game minutes at depth 1 (it took ~2).

## The level (`src/world/ghosttrain.js`)
- A 200 x 24 map. The cars lie end to end along tile x on rows 11-13 (`ROW0`, three wide): the caboose (7 tiles, its
  stove column blocked), sixteen cars of 9 (`FIGHT`: gondola, coach, flat, boxcar, dining, sleeper, armoury, prison,
  gondola, mail, flat, coach, boxcar, dining, armoury, sleeper), the tender (8, its front two columns the coal heap)
  and the engine (11, all blocked). A one-tile gangway joins each pair. Everything else is void (`t = 0`) while the
  train runs.
- `KINDS`: each car has a roof or not, its side height, and `cells` blocked on its far row (crates on the flat car and
  the boxcar, weapon racks in the armoury, two iron cages in the prison car, tables in the dining car), so two rows
  always pass. Bodies are at most 0.42 tiles round (guardians 0.53, on the open middle row).
- Spawns: one pack on each of the first two cars and the prison car, two on the rest (three on every other car from
  depth 60), 2-3
  raiders a pack and up to two more toward the front, one more 40% of the time past depth 30 and always from depth 100
  (a dungeon's rule). Elites by `trainElites(depth)` (a dungeon's `2 + depth/25` champions and `1 + depth/45` uniques
  at the train's thirty-odd packs, eased since a three-wide train leaves no room to kite): 4 champion packs at first,
  7 by depth 150; a unique pack from depth 75, two from 150 (`ELITE_ORDER`: every third car's leader from the front first; champion packs 2-4, unique packs 3-5, as in a
  dungeon). Monster levels are game.js's own (`depthLevel`). The lieutenant (`gen.lieutenant`, another
  `looks.boss`) on the prison car (`LT_CAR` 7); the boss (`looks.boss(roster)`) on the tender. Every roster look is
  picked at generation, so the boarders' art loads with the level.
- `STATIONS` (with `after`, `name`, `look`) and `GORGE_AFTER` are data here too.
- A station's platform is on the near side (toward the camera), rows 14-18 (`PLAT0..PLAT1`), `PLAT_LEN` (24) tiles
  long; `platformOn(map, x0, x1)` writes it walkable, `platformOff(map)` wipes it and clears the path caches.

## The run (`src/game/ghosttrain.js`)
- Phases: `run` (9 tiles/s) -> `brake` (a station called: it comes in from 110 tiles ahead, braking at 3.2 tiles/s²
  so `stationX = stop.x + v²/2a` lands exactly) -> `stop` (30 s; "ALL ABOARD!" at 8 s left) -> `leave` -> `run`. The
  stop is centred on the hero's x (clamped to the train).
- Stations, each its own buildings (`look`), are called as the cars are cleared: Hollowmere Halt (2, the hall),
  Gallowmarsh Water Stop (5, a water tower), Saint Vey's Crossing (8, a chapel), Blackwick Junction (11, a signal box)
  and Coldharbour Goods (14, a goods shed); never while the gorge is passing. Two chests and 3-5 raiders on each
  platform (5-7 from depth 60, a champion leading them). On departure the hero and his allies on the platform leap back aboard (`aboardSpot`: the
  nearest walkable car tile, never a crate), raiders on it are left behind (removed, no loot), ground loot is swept
  aboard and unopened chests go.
- Boarders: every 22-32 s while running (sooner deep: divided by `1 + 0.5 press`, ~15-21 s from depth 150; `press`
  runs 0 at depth 1 to 1 at 150), 2-5 of the roster leap aboard near the hero (one more from depth 150; ring telegraph,
  `m.entering` arc; more as the cars are cleared, one more every four), at most 8 alive, none once every car is clear.
- The lieutenant: a guardian a level under the chief (`makeMonster` rank `boss` in the run, since game.js spawns one
  guardian a level), two thirds of a guardian's life, no affix, named "Lieutenant ...". His card reads "He holds the
  middle of the train"; at half his life he whistles 2-3 raiders aboard. He belongs to the prison car's pack (the car
  is clear when he falls) and drops a guardian's loot.
- Hangman's Gorge: once `GORGE_AFTER` (7) cars are clear and she is running, `trainGorge()` brings the gorge in from
  ahead; it passes under the whole train in ~35 s (a card, no fight of its own).
- A car is clear when every monster spawned on it is dead (`CAR n CLEAR`). The boss's card reads "He holds the engine".
- The chief: a guardian (game.js, level +2) whose life is x1 shallow, rising to x1.6 by depth 150 (deep down he fell
  in 7-8 s). His fight uses the train (`chiefTick`, while he is awake and the hero within 14 tiles and aboard): a cast
  every 6-8 s, coal and steam in turn, each standing him still for its wind-up (`startAction('train_*')`, his own
  bestiary patterns wait) under a telegraph auto-play steps out of (`autoplay.dangers` reads every `Telegraph`):
  - **Coal** ("Stoke 'em!"): two lanes of burning coal down two of the three rows, from his feet 10 tiles back along
    the cars (a red line with a hot core, 1.2 s), sparing a row the hero is not on; 1.5x his hit, fire, a little
    knock-back. Below half his life a second volley follows 1.45 s later sparing another row.
  - **Steam** ("Open the firebox!"): he leaps to the coal heap and the furnace vents over the front of the tender (a
    white ring r 3.4, 1.5 s, hissing puffs, then `trainVent('vent')` blows 3D steam out of both sides): 2.2x his hit
    and a hard knock back down the train. The back of the tender and the gangway are safe.
  - **Whistle** ("All hands!"), at 2/3 and 1/3 of his life: a plume from the cab (`trainVent('whistle')`) and 2-3
    raiders leap aboard round the hero (`board()`, their landing rings).
  `run.chief.casts` counts them; `run.chief.cast(k)` casts one on cue (the test).
- The chief's fall: `dying` ("THE ENGINE IS YOURS", steam shut off over 3 s) -> `last` (The Last Stop brakes in) ->
  `done`: five chests (two rare: the long ride pays) and the exit portal on the platform, `onSuccess()` (game.js opens the exit; a first
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
- The new cars from the same parts: the sleeper (cedar sides, seven small windows, a raised clerestory roof with a lit
  strip), the armoury (dark iron, a red iron door, racks of spears and a shield on the far row), the prison car (grey
  iron, barred red-lit windows, two iron cages), the dining car (wide lit windows, tables with lamps and benches).
- The land is laid round the train's middle (`MID`, `LAND` = the train plus 240): ground, ballast and rails. The train
  never moves: the ground and ballast scroll, ~66 instanced items (trees, telegraph poles, bushes, rocks; low ones
  only on the near side, none where the platforms stand, none in the gorge) slide past and wrap, coal smoke trails back from the
  chimney (rises when stopped, thins as she brakes) and steam puffs from the cylinders while she runs.
- Static geometry is merged per material with `BufferGeometryUtils`; each car's roof and near side are one group of
  their own (the cutaway). Point lights (3 on touch, 5 on desktop) go to the lamps nearest the hero; the run adds 2D
  lights for the car lamps, the firebox, the headlamp and the station lamps against the night.
- The stations: a stone (ashlar) platform with a white edge, iron lanterns on posts, benches and a name sign (canvas
  text) on the near side; across the track, by `STATION_LOOKS`: `hall` (a gothic brick hall, pointed lit windows and
  door, buttresses, a steep slate roof with finials, a belfry with a spire; also the Last Stop), `chapel` (a tall
  buttressed nave with a great window, a belfry at each end), `water` (an iron tank in bronze bands on stone legs with
  a spout, a small shelter, crates), `signal` (a signal box with a glazed cabin, a long brick wall, a signal post with
  a red lamp), `goods` (a long brick shed with a great cedar door, stacked crates). All five are built once (one
  merged group each, hidden); `trainStation(name, look)` picks one and `stationX` moves it.
- The gorge (`buildGorge`, `trainGorge`, `trainGorgeX`): a 34-tile chasm laid over the ground (pure dark, a thread of
  river, rock lips at both edges) and an iron trestle under the train (lattice girders both sides, a sleeper deck,
  stone piers going down). The ground and ballast write no depth and draw first, the chasm over them, so the piers
  below ground level show against the dark. It slides from ahead to behind at the train's speed.
- Frame cost: the longer train merges the same way (one draw per material for the whole train, one group per car for
  the cutaway), and `ghosttrain.js` prints the render time at the back, the middle and the front. It matched the short
  train (both ~50-65 ms a frame under headless SwiftShader; compare runs, not absolutes).
- The scene is disposed when the hero is on another level (a 2.5 s check against `G.world`) or the next train is
  built. `ready()` is false if three.js can't load, and the region plays as the Forsaken Wilds.

## Test (`tools/tests/ghosttrain.js`)
The skull word reaches it and it is never drawn into the rotation; 16 cars, 5 stations, the lieutenant on the prison
car, a pack on every car; the render time at the back, middle and front; 30 seeds (every spawn and the town portal reachable,
nothing walkable off the train, a platform joins and leaves); a station in play (brakes, stands with chests and
raiders, the hero left on the platform leaps back aboard, the platform is void again, the ground streams by); the
cutaway and hiding, the engine mask; shots of the new cars, two overviews, every station look and the gorge under the
train; the chief's train fight cast on cue (two coal lanes and his wind-up, the leap to
the coal heap under the steam ring, the whistle at 2/3 life bringing raiders aboard; shots `chief_coal`, `chief_vent`,
`chief_whistle`); the chief's fall to the Last Stop (exit open and reachable); the three.js
fallback and the scene's disposal; auto-play from the caboose to the exit (a fresh paladin at depth 1, about five game
minutes; at least 4 stations and the lieutenant down on the way); screenshots including the phone layout.

`node tools/tests/ghosttrain.js noshots noauto 50,150,300 paladin,wizard`: for each depth (and class) a hero geared
for it as `balance.js` gears one (level, auto-play's stat/skill spending, the best of 200 drops with gems, upgrades and
mastery) rides the train on auto-play with no god mode. A fall is counted and the hero stood up again, so one soak
measures the whole ride (25 wall-clock minutes at most each). It fails if the ride stalls (40 game minutes, or no car
cleared for 4 game minutes; running out of wall clock while still clearing cars is only noted), the hero falls more than twice, or it is a
walk-over (under half a life lost and the chief down in under 8 s). Prints a table: seconds, falls, lives lost, lowest
life, potions, the chief's fight length and life lost in it, his casts.

## Status
Built (beta), November 2026. The same month: deep-depth balance, the chief's train fight, then the ride made ~2.5x
longer (16 cars, 5 stations with their own buildings, the lieutenant, Hangman's Gorge). `ghosttrain.js` (shots,
auto-play, the chief stage) passes; auto-play rides it in ~270-290 game seconds at depth 1 (it was ~120-145).
`flow.js` passes. The render cost matched the short train.

Deep soaks (balance.js-geared heroes, auto-play, no god mode; game seconds / falls / lives lost / chief fight seconds;
one run each):

| Hero | Depth 50 | Depth 150 | Depth 300 |
|---|---|---|---|
| paladin, 6 cars, before any tuning | 119 / 0 / 2.8 / 20 | 96 / 0 / 0.13 / 7 | 67 / 0 / 0.10 / 8 |
| paladin, 6 cars, tuned | 118 / 0 / 4.7 / 22 | 175 / 0 / 3.6 / 22 | 144 / 0 / 1.4 / 21 |
| wizard, 6 cars, tuned | 159 / 0 / 1.5 / 35 | 172 / 1 / 9.2 / 80 | 196 / 0 / 1.0 / 27 |
| paladin, 16 cars | 273 / 0 / 9.6 / 17 | 263 / 0 / 4.6 / 28 | 265 / 0 / 2.1 / 17 |
| wizard, 16 cars | 336 / 0 / 3.2 / 12 | 630 / 0 / 15.2 / 131 | 223 / 0 / 0.6 / 24 |

Before tuning, the ride was fair at 50 but a walk-over deep (a tenth of a life lost, the chief down in 7-8 s). The
first 16-car build kept the 6-car elite rates and was too much for the wizard at 150 (2 falls, every potion drunk, out
of time at car 8), so the elites and the third pack were eased (above). For comparison `balance.js` in a plain dungeon
lost 3.0 / 1.0 / 0.5 lives in 2 minutes at 50 / 150 / 300 (paladin) and 2.4 in 4 minutes at 150 (wizard): the train
is harsher per minute for a squishy caster (no room to kite), about even for the paladin.

## Next
- Tune: more classes and seeds in the deep soak (one run each so far). The wizard at depth 150 is the hard case (15
  lives and 29 potions over ten minutes, a 131 s chief); depth 300 is on the easy side, as plain dungeons are for this
  gear. The stop length (30 s) against how fast heroes loot. Some fast chief fights see only the whistles (he dies
  before his first coal or steam cast); a shorter first wait would show more of the train fight.
- A tunnel (darkness, then out) as a second scenic beat; a named conductor with a line or two.
- The chief: uncoupling or derailing a car behind him was left out (it means cutting the map and the 3D apart mid-run).
- Seats and luggage racks inside the coaches; a fade instead of the instant cutaway.
- Not tested on Safari/Firefox; perf on phones not measured (`perf.js` doesn't cover regions).
