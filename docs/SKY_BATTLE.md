# The Sky Battle (The Sky Lanes)

An overworld biome fought on the deck of the heroes' airship, a gothic steam ironclad, against the Air Pirates. It
is in the normal biome rotation as **The Sky Lanes** (`skyship` in `src/data/biomes.js`). Velscour's skull also
reaches it: send `sky`, `airship` or `pirates`, optionally followed by a scenario (`sky storm`, `sky night`). The
HAIL VELSCOUR! list also has one entry per scenario.

```bash
node tools/skyship_bake.js && python tools/skyship.py pack   # re-bake the ship, boats, galleon, props (three.js; GPU helps)
node tools/tests/skyship.js [clear|storm,...|all] [auto]     # whole battles at simulated speed, every phase checked, shots
```

## How a battle goes (`src/game/skybattle.js`)
1. **Arrival** (cut scene). The camera runs along the ship to the cathedral bridge. The portal in its great door
   flares, and the hero steps out onto the landing.
2. **Boarding waves** (5, easy to hard). Boats come out of the sky astern and lie alongside to port: the gasbag sloop,
   the harpoon cutter and the grapple hauler, from `tools/airship3d_skiffs.js`. Their crews leap the rail. From the
   third wave on, a gasbag also crosses high overhead and drops boarders on ropes. Monster levels follow the depth.
3. **Mid-boss** (after wave 3). A captain swings across the deck on a rope from his gasbag's balloon, with an escort.
4. **Parley** (cut scene). The next captain and two **sky-knights** come aboard under a white flag. The talk is one of
   2,000 conversations (`src/data/skytalk.js`):
   - the captain's opener
   - the knights' stories of why they serve Velscour as Air Pirates
   - the hero's pitches
   - the double refusal
   - a truce, and a quiet moment
   Then the twist: the flagship (the galleon from `tools/airship3d.js`) comes out of the clouds firing. The captain
   leaps away and leaves his knights under his own fleet's guns. They still won't join the hero, but from here on
   they fight at the hero's side.
5. **The flagship's duel.** She closes from far to port over about 26 s, trading broadsides with the ironclad. Her
   shots land on telegraphed circles and hurt both sides. The ironclad's port battery answers and sets her afire.
   Boarders drop over twice.
6. **Hooks** (cut scene). The knights throw grappling hooks from the ironclad's rail, and the flagship's crew throw
   back. The chains go taut. Captain one leaps the gap; captain two swings over on a rope from her mainmast. The
   knights then run back and leap into the captains with giant Runeblade strikes.
7. **The last fight.** Two captains (about one and a half heroes tall), the knights and the weather.
8. **Victory** (cut scene). The chains are cut. The knights, still not joining, leap onto the limping flagship to have
   words with whoever fired that broadside. The gate turns blue and becomes the exit. A hoard chest rises on the
   hatch: a rare chest's drop, one item at loot bonus 1.6, and a 35% chance of a guaranteed Epic (20% of those a
   Legendary), capped by item level like every drop. First clear: +1 skill point.

Cut scenes (`src/game/cinema.js`) can't be skipped, with or without auto-play. They show letterbox bars, a scripted
camera (pans, zooms, shakes), title cards, and a dialogue panel with a portrait, the speaker's name, typed text and a
syllable-blip voice. While one plays, there's no input, no auto-play and no monster thinks; only the scene's actors
move.

## The captains' moves
Each captain draws from their own moves (`AIR_CAPTAIN_ROWS` in `src/data/airpirates.js`) plus three ship moves:

| Move | What it does |
|---|---|
| `crew` | boarders over the rail |
| `hook` | a chain that drags the hero in |
| `leap` | lands on the hero with a shockwave |
| `barrage` | the flagship's guns, or a powder volley without her |
| `storm` | lightning |
| `smoke` | vanishes and steps out behind the hero |
| `climb` | up onto the bridge spire, a bridge corner, a turret dome or the stern crest; a taunt, then a dive onto the hero |
| `swing` | a rope off the bridge spire or the flagship's rigging, a long swing through the hero, hitting the hero's side along the path |
| `rappel` | boarders slide down ropes out of the sky round the hero |

## The knights
Two of the ten townsfolk knights (`src/data/townsfolk.js`) are recoloured with bright hues that don't clash: two hues a
third to a half of the wheel apart, saturated and lifted. They act their lines with their sheet's poses plus scripted
motions (`KNIGHT_ACTS`: laugh, cry, rage, flex, dance, spin, salute, swoon, faint, hop, point, shrug, bow, attack;
drawn through `n.pose` in `drawNpc`). As allies they chase the nearest pirate near the hero and strike. Each strike is
the Death Knight's 3D Runeblade (`src/gfx/runeblade3d.js`) drawn only for the strike, in a palette turned to that
knight's armour hue, with a glowing trail in the same colour. They are townsfolk records, not creatures: nothing can
hit them.

## The eight scenarios (`src/data/skybattle.js`)
| Id | Name | Weather | What the weather does |
|---|---|---|---|
| clear | The Black-Sail Ambush | Clear Skies | — |
| storm | Eye of the Storm | Thunderstorm | lightning strikes the deck (telegraphed, hurts both sides) |
| night | Lanterns at Midnight | Moonless Night | darkness: the lanterns, braziers, gate and the boats' lights light the deck |
| fog | Ghosts in the Fog | Fog Bank | a grey bank you only see a few tiles into; boats loom out of it |
| sunset | Red Sky Reckoning | Sunset | — |
| gale | Against the Gale | Gale | gusts shove everyone (pirates too) across the deck |
| blizzard | Frostbitten Rigging | Blizzard | frost gusts sweep a line across the deck: cold damage that slows |
| ash | Ember Skies | Ashfall | burning embers land and set patches of deck alight |

Each scenario has its own sky, clouds, ambience, boat mix, mid-boss and final pair of captains. A hero never gets the
same scenario twice in a row (`G.char.lastSkyVariant`).

## Art
- **The ironclad** (`tools/airship3d_ironclad.js`) is baked like the Castle (docs/CASTLE_3D.md) by
  `tools/skyship_bake.html`. The game camera's render is cut into one piece per tile (624 pieces).
  `src/world/skyship.js` holds the hull curves and deck plan that both the model and the game read, and builds the
  walk map: 290 deck tiles; the grand stairs, quarterdeck and forecastle as height levels; bulwarks, the bridge,
  helm, turrets and braziers solid.
- **Drawing.** The terrain engine draws the pieces (`map.c3only`: no ground of their own; `map.occStruct`: every
  structure tile redraws over whoever stands behind it). Animated things are separate sprites, all baked in four
  frames: the galleon, the three boats (ramp up and down) and the ironclad's engine props. The hook, chain links and
  cannonball are baked from the same materials. Everything else in motion is effects in `src/gfx/skyship.js`:
  - the sky and pixel clouds, wind streaks, and the rain, snow, ash and fog
  - the furnace glow, braziers, lift crystals and lanterns
  - the gate's swirl, drawn in the door's own plane in the game's portal colours
  - ropes, chains, cannon shot, lightning and the knights' blades
- **The Air Pirates** (the user's Air Pirate Expansion Pack): 30 boarders and 10 captains in `assets/source/enemies/air/`,
  packed by `python tools/process_assets.py enemies air`, catalogued in `src/data/airpirates.js`. Like the Breach's
  creatures, they never join the regular bestiary's draws.
- **Bake output.** Three atlas pages, about 8.4 MB of lossless WebP (`assets/tiles/skyship/`). The source PNGs
  (`assets/source/skyship/out/`) are not committed.

## Limits
- The camera is the game's 2D iso camera. Cut scenes pan, zoom and shake; they don't orbit, because the art is baked
  from one angle.
- The boats lie alongside to port only. Port is behind the deck in the iso view, so they never hide it.
- The Credits parade (if it lands on main) needs lines for the 40 Air Pirates.
- Not verified: how it plays on a phone, and Safari or Firefox.
