# The Pirate Seas (design and the fleet)

Pirate battles on open water, the sea-going side of the Sky Battle (docs/SKY_BATTLE.md) and the Serpentine Tower's roof
(docs/SERPENTINE_TOWER.md). The heroes sail the **Dawnwake**, a ship lent to them by the **Lampwardens of the Ninth
Bell**. Velscour's sea pirates, **the Black Tide**, come at them in ships of five sizes, from rowed longboats to a
**super-huge carrier** crewed by Gunners who fly steampunk jet fighters. The Air Pirates still fly over, bombing and
dropping boarders on ropes.

Status: **models and water** (this document's fleet), and **the first playable sea battle** (below). The twelve
scenarios are the plan.

## The first playable battle (the game integration)
A new overworld biome, **The Pirate Seas** (`pirate_seas`, `sea: true` in `src/data/biomes.js`), drawn **live in
three.js** like the Serpentine Tower and the Depth's Edge Caverns. Velscour's skull takes `sea`, `seas`, `naval` or
`dawnwake` (`sea plank`, `sea tide`, `sea fog` pick a battle by name or weather), and HAIL VELSCOUR lists each one.

| File | What |
|---|---|
| `src/world/seaship.js` | `generateSeaship`: a 104 x 118 sea map with the Dawnwake at (OX, OY) = (60, 58) (the ironclad's walk map, `world/skyship.js` `shipLayout`; her masts and funnel blocked; the paddle boxes over the water); `applyDeck` / `joinDecks` / `unjoin` for other decks; `map.deck` (0 sea, 1 the Dawnwake, 2.. arena decks); the berths (`SEA_DOCKS`, `SEA_QUARTER`, `SEA_BRIG`) and the Dawnwake's tall things (`SEA_COLUMNS`) |
| `src/gfx/seabattle3d.js` | `loadSea3D` / `loadFleet(kinds)`, the scene (the weather's sea and light, the Dawnwake level at (OX, 0, OY) in fighting sail, the bell-tower portal tinted sealed/exit), `FLEET` + `spawnShip` (any model, riding / an arena deck / flying; its crew as 3D sprites until they leap), `berth`, `bakeDeck`, `seaPlank`, grapnel and harpoon lines, splashes, the point-light pool, `drawSea3D` |
| `src/game/seabattle.js` | the director: the shared flow (arrival, waves, `hurry()`, mid-boss, captain, chest, bell, exit) and the plugin API; `world.cave` is its render hook (`horizon` over every deck's heights, `mask` for tall things) |
| `src/game/seascen/<id>.js` | one scenario each (below): #2 `across_the_plank`, #9 `red_tide` so far |
| `src/data/seabattle.js` | the registry (`SEA_SCENARIOS`), the default waves, Brask's lines and Pip's barks |
| `tools/tests/seabattle.js` | every phase of each scenario at simulated speed, its decks and joins, the bell and the order, the exit, shots (`auto mortal`: auto-play fights it alone; `fleet`: every model builds and bakes) |

The shape: the hero steps out of the bell tower's door; Brother Tolland rings his hand bell; Commodore Brask, at the
helm, says the name aloud on the hero's first sea battle (later: "Run out the guns."). Longboats and harpoon cutters
come up from astern, **lie off the port side** (port is the far side from the game camera: a hull standing 3.4 tiles
over the water hides about 4 tiles of sea behind it, so a boat alongside would vanish; 12 tiles out, at berths where
neither the funnel, the masts nor the paddle box stands on the view ray, the boats read whole) with grapnel lines up
to the rail, and their boarders leap across. By default a captain comes after the third wave on a cutter that lies
**off the port quarter** (nothing of the Dawnwake between him and the camera, for his title card) and swings over from
her masthead, and after the fifth the Tide's captain comes on his own gun-brig further off the quarter and swings over
from her yard; a scenario can instead have them wait on its own deck (`from: 'deck'`). Each boat's grapnels show a landing ring on the deck before anyone leaps, and an arrow at the screen's edge points to every crewed boat still off screen. His fall: the boats
fall astern, a chest on the hatch, Tolland's bell (`G.char.seaBells`, one per battle the first time it is won,
`seaSeen`), the door turns blue (the exit), Brask: "Relight the stern lamp." Pip calls from the foretop: "Longboats,
out of the fog!" (fog), "Harpoon line, port rail!" (a cutter's harpoon bites), "Black sails, three... four... I'm not
counting." (the three-boat waves). The Dawnwake stays level; the boats ride the swell. At the game's zoom her sails fade
to 0.1 and everything above her lower masts (yards, tops, upper rigging) dissolves in an ordered dither; a cut scene's
wide shots bring them back. Brask has a salt-white braid and her green lantern; Tolland stands 1.28x with his diving
helmet at his belt (`lampSheet`). The arrival is the bell tower's door; the blue swirl on the quarterdeck is the town portal. Captains are Air Pirates (one fleet, sky and sea).

Not yet: the Lampwarden marines (teal rims), ten of the twelve scenarios; the masts' and funnel's occlusion of sprites
is a silhouette mask (`mask`), not their exact shapes; sails, yards and the bell tower don't hide sprites.

## Building a scenario
Each of the twelve scenarios is a **plugin**: one module, `src/game/seascen/<id>.js`, default-exporting an object, and
one line in `src/data/seabattle.js` (`SEA_SCENARIOS`, in the doc's number order). The director (`game/seabattle.js`)
keeps the shared flow, so a plugin only adds what is special. `across_the_plank.js` (#2) and `red_tide.js` (#9) are the
worked examples.

```js
export default {
  id: 'red_tide', number: 9, name: 'The Red Tide', light: 'Redwater Beacon',
  weather: 'blood', weatherName: 'The Red Tide', blurb: '...', dark: 0.18, fogK: 0,   // a SEAS key (tools/sea3d.js)
  fleet: ['longboat', 'cutter', 'hulk'],      // every FLEET kind it spawns (loaded before the level is built)
  art: ['drowned_spearman'],                  // painted art it spawns (preloaded)
  boats: { longboat: 1, cutter: 2 },          // the boarding craft's weights
  waves: [{ boats: 1, n: [4], champion: 0, deck: 3 }, ...],   // default SEA_WAVES; mid: true marks the mid-boss's
  docks: [[-16, 12], [-7, 12.5]],             // boat berths [z, out] (default SEA_DOCKS)
  size: [160, 200],                           // a bigger sea map (default 104 x 118; it grows right and down)
  mid:   { id: 'ap_red_gale_corsair', name?, title?, line, from?: 'deck', at(api), leapTo(api), stay? },
  final: { id: 'ap_the_gallows_king', name?, title?, line, from?: 'deck', at(api), leapTo(api), stay? },
  hooks: { setup, start, tick, onWave, onBoss, onVictory, holdFinal, objective },
};
```
Captains are Air Pirate ids (`data/airpirates.js`); `name`/`title` give a sea captain his own. Without `from`, the
mid-boss comes on a cutter off the quarter and the captain on his brig astern; `from: 'deck'` has him wait on a deck
spot (`at`), framed there under his card and line, then leap over (`leapTo`) or stand and fight (`stay`, e.g. at her helm).

**Hooks** get `api`: `setup(api)` before the arrival (spawn ships, add decks, joins), `start(api)` as the waves begin,
`tick(api, dt)` each fighting frame, `onWave(api, n, wave)`, `onBoss(api, m, 'mid' | 'final')`, `onVictory(api)`,
`holdFinal(api)` (true keeps the captain back: an objective first), `objective(api)` (a `{ x, y, reach, use }` for
auto-play and the quest log).

**The API** (`api.*`): `world, run, v, depth, lvl, base, map, OX, OY, LV, WL, SEA_LV, live, state` (the plugin's own);
`p() tileOf(x, z) near(x, y) lvAt groundT flat faceOf beam inner sheer sAt`; ships: `spawnShip(kind, opts)`,
`berth(info, 'port' | 'alongside' | 'starboard' | 'astern' | 'far', z)`; decks: `addDeck(handle, { levels })` ->
`{ id, h, tile(lx, lz), walkN }`, `join(a, b, { w, plank })` -> `{ open(), close(), isOpen }`; foes: `spawnOnDeck(art,
rank, at, wave)` (a boarder on a deck, who walks over), `spawnArt(art, arch, rank, at, { from })` (any painted art, leaping
in from `from`), `spawnPirate spawnCaptain leap swingAcross launchBoat crewList kill`; effects: `cannon(from, to, onHit)
blast telegraph(x, y, r, dur) splash bark(key) banner(title, sub) later scripted scene floatText burst sfx`; the run:
`addWave(w)`, `costReward(k)`, `meter(label, { color, full: 'wave' | 'reward' | fn, note })` -> `{ value, add, set, note,
hide }` (the pressure, drawn under the top band; full adds a wave or lightens the chest, then empties, and **never ends
the run**), `mark(x, y, label, use)` (a lever, a lamp: a glyph the hero or auto-play uses), `unmark(o)`; a plugin's own
cut scenes: `cast.brask / pip / tolland`, `say(n, text)` (that one's line, portrait and voice), `capSay(id, text, focus)`
(a captain's), and the director's camera steps `on fit backToHero mix`, `ringHandBell`. A model's walk map can be baked
under its own cap (`h.bake = (o) => bakeDeck(h, { cap, ...o })` before `addDeck`: the dreadnought's tower and
superfiring barbette stand over the default 4.5). Marks get an edge-of-screen pointer in their colour whenever they are off
screen; `point(getPos, color, label)` adds a pointer of your own (an idol, a tender, a corvus; `getPos` returns
`[tile x, tile y]` or null to hide), `nudge(pos, secs)` leans the camera toward an announced event (`banner(title, sub,
pos)` nudges too). Pointers, marks, rings and the meter hide in cut scenes.

More plugin fields: `barks: { longboats: null, sails: 'words' }` (silence or replace Pip's calls; `bark('any words')`
calls your own), `finale: true` (Brask says nothing at the end), `bellCard: [title, sub]` or `(api, bellN, won) => [...]`
(the victory card). A captain's or mid-boss's `line` is his own: there is no default. Each named captain gets his own
palette swap and height from his name (`NAME_LOOKS` in `game/seabattle.js`; any other name a hue from its letters), so
one Air Pirate sprite plays several captains without two names sharing a face.

**Any fleet ship** (`gfx/seabattle3d.js`): `spawnShip(kind, { deck, air, fight, at, heading })` builds any `FLEET` model:
`longboat cutter brig hulk grappler galleon dreadnought carrier kestrel thunderhawk lightship tender mine flotsam buoy keg
torpedo wreck reef airgalleon ironclad gasbag aircutter hauler`. It rides the swell, or with `deck: true` is held level
at its waterline as a walkable arena (its rig and sails fade at the game's zoom like the Dawnwake's), or flies (`air`,
the jets and airships by default). The handle: `place(x, y, heading, speed)`, `setAlpha`, `addCrew` / `dropCrew`,
`worldOf(lx, ly, lz)` -> `[tile x, tile y, level]`, `lv`, `info` (the model's: `crew`, `plank`, `idol`, `landing`,
`stairs`, `walk`, `glow`...), `ship` (`setPlank`, `setRamp`, `setFightingSail`, `anim`), `mastTop`, `remove()`.

**Arena decks**: `api.addDeck(handle, { levels })` bakes the model from straight above (`bakeDeck`: per tile the
heights under a cap 4.5 over its deck, so yards and tops don't roof it; sails, flags and lines skipped) and writes it
into the map (`applyDeck`): flat, covered tiles near one of `levels` (ship-local deck heights; `null` for any height,
a reef) are walked, the rest is struct at its top and hides whoever stands behind it, tall things become sprite masks.
A model's `info.stairs` (`[x, y, z]` foot, top, width) are walked as ramps. Two decks join with `api.join(a, b)` (a
corvus: open it as it drops; `plank: true` lays a plank mesh too). Ships placed as decks don't ride the swell. A model
whose info lacks what the walk map needs gets it in its own module (info fields only), as the brig's `stairs` did.

**Tests**: `node tools/tests/seabattle.js <id | number>` plays it through at simulated speed with the deck cleared
(add your scenario's own checks beside `across_the_plank`'s and `red_tide`'s), `... <id> auto mortal` lets auto-play
fight it alone, `... fleet` checks every model builds and every deck bakes. Then `flow.js`, `hud.js`, `autoplay.js`.
Look at the shots in `tools/tests/out/sea_<id>_*.png`.

| File | What |
|---|---|
| `tools/sea3d.js` | the open sea, ported from Bellmourn (below) |
| `tools/seaship3d.js` | the shared sea-ship parts: sea hulls with a level waterline, square and fore-and-aft sails, masts, yards, shrouds with ratlines, gun ports, deck cannons, turrets, funnels, paddle wheels, dinghies and davits, anchors, gangplanks, grapnels, rails, stairs, helm, cargo, skull plates, `seaMaterials()` |
| `tools/seaship3d_*.js` | one module per ship family (the roster below) |
| `tools/seaships3d.html` | the viewer: every ship on the sea, a size line-up, a battle, the carrier's deck; weathers |
| `tools/seaships3d_shots.js` | review shots: `node tools/seaships3d_shots.js [scenes\|all] [views] [weather]` -> `tools/tests/out/seaships/` |

## The water (`tools/sea3d.js`, from Bellmourn)
Bellmourn's river and pool water (Bellmourn `src/fps/water.js`): a procedural, tileable **ripple map** (30 crossing
integer-wavenumber waves for the normal, wrapped value noise for foam) and a **Phong material patched in
`onBeforeCompile`**, so the scene's sun, hemisphere light, shadows and fog all apply. Two ripple layers flow with the
current and two drift; colour runs from shallow to deep; foam comes from the map's noise channel; a Fresnel term mixes
in a two-colour sky. Its **spray** (round lit points, a drop now and then catching the sun) and **mist** (instanced
noise billows) come across as they are.

What the sea adds to it:
- **Swell**: four long crossing waves lift the vertices. `seaHeight(x, z, t)` is the same sum in JS, and
  `ride(x, z, heading, hl, hb, t)` gives a hull its rise, pitch and roll (big ships average it over their length).
- **Ship foam** (`setShips`): a ring round each hull at the waterline, a bow wave that grows with speed, a churned
  wake astern and the two arms of a Kelvin wake at 19.5 degrees, with ripples running along them. Flecks of foam are
  shed along the wakes and spray flies off moving bows.
- **Splash rings** (`splash`): ripples running out from where a shot or a body hits; `column` throws a tall shot
  column of spray with mist at its foot.
- **Weathers** (`SEAS`): day, storm (a heavy swell and whitecaps), night, sunset, fog, and blood (Velscour's red tide).
- Orthographic-safe: the Fresnel and the spray's point size use the game's orthographic camera correctly.

## Scale and frame
Like the airships: 1 unit = 1 game tile (64 x 32 px), heights in the same unit, so a 60 px hero is 1.53 tall. Bows
point along -Z (upper right in the game's iso view), starboard is +X, the main deck is at y = 0. Each builder returns
`{ root, anim(t, dt), info }`; `info.waterline` is the waterline's height below the deck (negative), `info.hl` /
`info.hb` the half length and half beam at the waterline (the sea's foam), `info.glow` the lamp halos, and
`info.crew` a few `[x, y, z, 'pirate' | 'hero']` spots for figures in the viewer. Walkable decks keep the airships'
rules: tall parts toward the bow and to port (behind the deck in the iso view), the starboard side low.

## The fleet
**Sea ships float; nothing on them flies** (the user's rule): no rotors, balloons, lift crystals or props in the air.
Every hull sits in the water at its waterline with copper sheathing below it, and is driven by sail, oars, paddle
wheels or screws. Only the Air Pirates' own airships and the carrier's jets fly. `seaships3d_shots.js` checks that
each hull reaches below its waterline.

Textures come from all over the game: the airship Material Texture Pack (`assets/source/airship/textures/`: planks,
metals, gold, sailcloth, wood), palette-tinted in `seaMaterials()` for hull paints and faction colours.

### The heroes and their allies
| Ship | Size | What it is |
|---|---|---|
| **The Dawnwake** (`dawnwake`) | 40 x 12.4, the ironclad's deck plan | The heroes' ship, lent by the Lampwardens. A steam frigate in limed white oak and bright steel with blue and cream sails on three masts, one gilded funnel, and side paddle wheels with the Ninth Bell on their boxes. The forecastle carries a **bell tower** in place of the ironclad's cathedral bridge: the party's arrival portal is its great door, and nine bronze bells hang in its open belfry, the ninth one green-gold. Green-flame lanterns (Tessariel's fire) line the rails. It keeps the ironclad's deck plan (`src/world/skyship.js`), so the game can reuse that walk map. |
| **Lampwarden lightship** (`lightship`) | about 26 x 8 | A floating lighthouse: a stout hull carrying a stone-and-iron lantern tower amidships whose great lens burns green and turns, with bells hung round the gallery, two short masts and a bell buoy on the bow. |

### The Black Tide (Velscour's sea pirates), by size
| Size | Ship | What it is (from which airship) |
|---|---|---|
| Small | **Longboat** (`longboat`) | 9 x 2.6. A rowed boarding boat (from the gasbag sloop, without the balloon): eight oars that row, a lug sail, a swivel gun on the bow, grapnels and a boarding ladder. Crew 6. |
| Small | **Harpoon cutter** (`cutter`) | 14 x 3.4. The air cutter at sea: a narrow scorched hull, a black lateen sail and jib, the harpoon ballista and bow spikes, outriggers. Crew 5. |
| Medium | **Corsair gun-brig** (`brig`) | 26 x 7. Two masts, square fore and gaff main in patched black sail, five gun ports a side and two bow chasers, a raised quarterdeck, a boarding gangplank. Crew 14. |
| Medium | **Grapple steamer** (`grappler`) | 22 x 7. The grapple hauler at sea: a rusted paddle tug with a tall smoking funnel, a boom crane swinging a great grapple, an armoured wheelhouse and a drop-ramp bow. Crew 12. |
| Large | **Black-sail galleon** (`galleon`) | 44 x 12 plus bowsprit. The air galleon at sea: its rotors become three masts of full black and crimson sails, two gun decks of ports, a stern castle with gallery windows and a raven figurehead. Crew 30. |
| Huge | **Velscour's dreadnought, *The Lightless*** (`dreadnought`) | about 72 x 16. Black iron, three twin turrets, casemate guns, two raked funnels breathing red, a ram bow under Velscour's **V** crest, a spiked gothic tower bridge with red glass. A walkable main deck between the turrets. |
| Super huge | **The Gunners' carrier, *The Anvil*** (`carrier`) | about 130 x 30. A fantasy aircraft carrier crewed by Gunners: a riveted flight deck with painted lines, two steam catapults at the bow, arresting wires, two deck elevators, an island on the starboard side (funnels, a bridge with brass-framed glass, signal lamps, a turning brass aether-finder dish), gun galleries of multi-barrel brass guns along the edges, hangar openings in the hull and jets parked with their wings folded. The crew fight battles on its deck. |
| Aircraft | **Brass Kestrel** (`kestrel`) | A steampunk jet fighter: a brass and gunmetal fuselage, a glass bubble canopy with a goggled pilot, gull wings edged in gold, twin turbine nacelles with intake fans and blue afterburners, twin tail fins, nose guns. Wings fold for the carrier. |
| Aircraft | **Thunderhawk** (`thunderhawk`) | A heavier three-engined torpedo bomber with a slung torpedo and a rear gunner's bubble. |
| Air | the Air Pirates' **galleon**, **gasbag**, **cutter** and **hauler** | The existing airships (docs/AIRSHIP_3D.md) fly over the sea and drop boarders. |

Small props for the scenes (`tools/seaship3d_props.js`): sea mine, flotsam (planks, barrels, a broken mast), a bell
buoy, a powder keg, a torpedo, a wreck, and the walkable Wreckers' reef. Scenario pieces on the ships: the brig as a
dismasted, listing **hulk** (`buildBrig(M, { hulk: true })`, scenario 9's blood idol stands on its deck) and Brother
Tolland's **diving bell on its davit** at the Dawnwake's stern (scenario 12).

**Black Tide ships carry red** that holds up at night, in fog and in the blood tide: crimson sail bands or courses,
red-lit stern lamps and glass, red strakes. The Lampwardens carry green fire; the Air Pirates' ships fly the Tide's red too (one fleet, below).

### What each ship does in a fight
Walkable decks are fought on; the rest dock alongside, deliver boarders and leave, or are backdrop.

| Ship | Deck | Its part in a fight | What it does to the hero |
|---|---|---|---|
| Dawnwake | walkable (the ironclad's 290-tile walk map) | home: the hero's deck in every battle, with Lampwarden marines fighting alongside (teal ally rims: green is already the summons' rim) | its hull takes torpedoes and shot: a hull meter that costs reward, never the run |
| Lightship | walkable (lashed to port by a plank) | an escort lashed alongside; boarders cross the Dawnwake to the plank and climb to the lantern gallery, and the hero holds the plank head. Its turning green beam is a mechanic (fog boarders can only be hit inside it) | if boarders douse the lamp, the fog thickens and a wave is added |
| Longboat | dock and deliver | rows 4-6 boarders up a ladder onto the rail | waves out of fog and from wrecks |
| Cutter | dock and deliver | harpoons the Dawnwake's hull; each taut line heels the deck toward it | the deck tilts (everyone slides); cut the line at the rail |
| Gun-brig | walkable (a second deck) | trades broadsides, boards over its gangplank, then the plank is ours | telegraphed broadside rings until its gunners die |
| Grapple steamer | dock and deliver | hooks three grapples into the Dawnwake and hauls her toward the reef | a haul meter: full means grounding (hull hazards, an extra wave, a smaller chest) |
| Galleon | walkable (main deck + quarterdeck) | the boss ship: a two-level deck fight | cinderbomb fires spread across the planks as the clock |
| Dreadnought *The Lightless* | walkable (a lane each side of the turrets, bow to stern) | the push: board at the bow, fight to the stern walk | turrets sweep telegraphed arcs across the deck until spiked |
| Carrier *The Anvil* | walkable (a level: zones by deck numbers, catapults, elevators, island) | waves rise on the elevators from the hangar; parked jets are cover | catapult lanes are telegraphed strafing runs; jam the catapults |
| Lampwarden tender (`tender`, ~16 x 5) | walkable | three lashed together in #11: the hero leaps deck to deck (low bulwarks amidships) | a tender lost costs reward |
| Wreckers' reef (`reef` prop) | walkable ground | rock shelves, ledges and a beached wreck's tilted deck, with three false lamps on poles | each lit false lamp calls another longboat |
| Kestrel (5.5-6.5 span) | flies | strafes along a telegraphed lane, launched from the catapults | a line of bullet hits |
| Thunderhawk (~11.5 span, folds to ~6) | flies | drops torpedoes at the Dawnwake (Pip calls them) | hull damage, a reward cost |
| Air Pirate ships | fly | the Sky Battle's gasbags and haulers drop boarders on ropes | boarders from above |

## The Lampwardens of the Ninth Bell (the allies)
Lighthouse keepers, wreck-divers and the crews of their tenders and lightships, which makes them a fleet, with fleet
ranks. They keep **green fire** in every lamp on the Shattered Coast.

**What they believe.** In Bellmourn the green star fell out of heaven onto one of Velscour's Sworn knights, and
**Tessariel, the Sacred Flame** ("Ember that falls" in the old tongue), climbed out of the crater not knowing who he
was, and the village told him what he was for. Bellmourn's books say nothing of a return. The Lampwardens hold that he
went down to the sea after Bellmourn, looking for the Fiend's far throne, and that the sea took him. *The sea gives
back what it takes.* Their proof is the **drowned verses**: the end of the Litany of the Ninth Bell, cut from every
cathedral copy and kept only in pages their divers brought up from a sunken bell-ship. Bellmourn's copies stop at
verse nine; theirs go on.

**Why they fight.** Velscour's sea pirates, **the Black Tide**, are putting out the coast's lights, one lighthouse at a
time, to wreck what sails and to blind the coast for the Fiend's fleet. A dark coast is also a coast the Ember can't
find. On land, Velscour's people hang anyone who says the name. At sea the Lampwardens say it, and that is the point.

**One fleet, sky and sea.** The Black Tide is the Air Pirates' sea arm: Velscour's captains (Admiral Veyl, Lord
Thundershroud, the Red Gale Corsair, the Gallows King, the Hollow Commodore) command ships in the air and on the water
alike, and fly the Tide's red on both. The Tide's own sea-born captains (Wick, Lowe, Mott, Gaff, Blackwater, Dunmore)
are new.

**The Brass Fraternity.** The carrier's crew: Gunners who sold their guns, their jets and their guild's name to
Velscour. Hero Gunners call them traitors; the Fraternity calls itself the only Gunners who get paid.

### The people
- **Commodore Ottilie Brask, the Lamp of Gullwrack.** Sixty, salt-white braid, a brass lantern on her hip with a green
  flame (one bright pixel cluster at game scale).
  - *Wound:* fourteen years ago the Black Tide said they'd burn Gullwrack village unless its light went dark for one
    night. She put it out. The pilgrim ship *Saint Ivo's Mercy* broke on the reef with everyone aboard but one. She
    lit her lantern from the last coal of that light, and it hasn't gone out since. It's a penance, not a boast.
  - *Want:* the coast lit until he comes home, and the Black Tide on that same reef.
  - *Voice:* commands, short and nautical, never proverbs. She gives the heroes the Dawnwake because she has no one
    left she'd trust to lose it.
- **Brother Tolland.** A huge bell-diver, in both senses: he goes down in a diving bell to bring up the coast's drowned
  bells. The deep took his voice; his brass diving helmet hangs at his belt, so he reads by silhouette. Before each
  fight he rings his hand bell once, and the count carries from battle to battle (one bell per sea battle won, kept
  on the hero). He speaks once in the whole run, before the finale.
- **Pip Gannet.** The signal girl at the masthead, about fourteen. She was the one soul pulled out of the *Saint
  Ivo's Mercy*, a baby in a fish basket; she has no memory of that night and doesn't know who put the light out. She wants to see the Ember with her own eyes. In a
  fight she only calls what's coming: short barks tied to telegraphs.

### Lines (sparse: a cut-scene line or two at the start, a bark at each telegraph, a line at the end)
Cut scenes:
- Brask, opening (the name aloud; plays on the hero's first sea battle, whichever it is): "On land they whisper it. Out here we say it. Tessariel. Run out the guns."
- Brask, after a win: "Relight the stern lamp. He'll want something to steer by."
- Brask, Wreckers' Reef: "They moved the lights. Every wreck on this reef steered true."
- Pip: "If he's coming home by our lamps, why's he so late?" / Brask: "The dark is wide."
- Brask, in a victory scene, trimming her lantern: "Out once. Never again."
- Captain Ezra Wick (who made the threat that night), to Pip across the water on his first appearance (#1, or the finale's longboats if #1 never rolled first): "Ask her who put the light out, girl." No one answers; Pip's silence is the scene.
- Brask, against *The Lightless*: "He fell on one of the Fiend's knights once. Let's give him a ship to aim at."
- Tolland, his one sentence, before the finale: "Eight I've rung. The ninth is under the water, and it's his."
- The last of the drowned verses, read at a burial at sea: "Ring the ninth bell beneath the water, and the Ember shall
  hear it, and fall."

Pip's barks (at most 8 words, readable in a second and a half):
"Torpedo, starboard!" · "Jets off the catapult!" · "Mines in the water!" · "Longboats, out of the fog!" · "Harpoon line,
port rail!" · "Sea coming over, hold on!" · "Black sails, three... four... I'm not counting." · "Turret's turning, get down!" · finale only: "Green light, under the water! It's him!"

Black Tide title cards (one line each, under the boss's name):
- Captain Ezra Wick, Lamp-Breaker: "Every light you love, I've put out."
- Admiral Veyl, the Black-Sail Overlord: "Strike your colours, or I'll strike them for you."
- The Hollow Commodore, master of *The Lightless*: "My ship has no lamps. It doesn't need them."
- Lord Thundershroud, Air Boss of *The Anvil*: "Clear the deck. I'm launching."
- Red Gale Corsair: "The reef is mine. The wrecks are mine. You're next."
- The Gallows King: "The sea's red with my dead. Room for one more."
- Captain Hesper Lowe: "Strike, and I'll let your marines swim."
- Foreman Gristle Mott: "Reef's two cables off. Haul away."
- Harpooner Nan Gaff: "I never miss a hull. I've had practice."
- Bosun Garret Blackwater: "Every sea that comes over takes one of yours."
- Boarding-Master Quill Dunmore: "Three decks, one rope. Don't look down."

## Scenarios
The shared shape, like the Sky Battle: an arrival cut scene (the Dawnwake, the weather, what's coming, Pip's call),
waves, a mid-boss, the boss under a title card, a victory chest, and Tolland's bell. The Sky Battle's rule holds: the
hero never stands about waiting. While ships close at range there are always boarders on the Dawnwake's deck (rowed
over, dropped from airships), and `hurry()` brings the next one in the moment the deck is clear. No objective ends the
run; only death does. A lost objective costs reward or adds a wave.

**Bells and order.** A scenario's first win rings a bell (kept on the hero, like `G.char.skySeen`); replays ring none.
The next sea battle is rolled from the scenarios the hero hasn't won, so the first eight are always new. After eight
bells the finale is offered at the portal; after the finale every scenario is in the pool and is rolled at random,
never the same twice in a row. (`pickSeaVariant`: a plugin with `finale: true` is left out of the roll below eight
`G.char.seaBells` and is the one rolled from eight until it is won; the skull's "sea ninth" and HAIL VELSCOUR reach any
battle at any time.)

**#6 The Lightless** (`the_lightless.js`, dusk): the dreadnought lies astern of the Dawnwake and to port, her starboard
lane to the camera, her whole length an arena deck (`size: [112, 152]`); a plank from the Dawnwake's quarterdeck to her
forecastle. Her crew come up her hatches ahead of the hero (each wave `deck: n`, no boats); each turret traverses and
sweeps three telegraphed cones of blast (they hit her own crew too) unless the hero stands in its blind arc behind it,
and is SPIKED at its glowing breech hatch (a mark; its guns droop, its hatch goes dark); unspiked, her big guns shell
the Dawnwake (the meter, the chest pays). Coalwarden Hesk at the stair's foot mid-way; the Hollow Commodore waits on
the stern walk until all four are spiked, and his watch comes up the stern stairs to him.

**#12 The Ninth Bell** (`ninth_bell.js`, night, `finale: true`): Tolland's sentence at the davit and down he goes
(`info.bell`, `info.davit` on the Dawnwake). The bell meter (90 s) fills only while foes stand on her deck and stops
while one is at the davit (a champion grapnels up the quarter now and then to hack its falls). As it fills: a gun-brig's
telegraphed broadsides off the quarter, a grapple steamer, Kestrel strafing lanes (red strips with chevrons) and
Thunderhawk torpedoes from starboard (a dashed run on the water, a ring where it strikes; a hit costs the chest); The
Lightless closes up the port side and Gullwrack's lightship dims. The ring is its cut scene: the bell tolls, the sea
turns green and green light rises off it, Pip's line, Brask turns to look at her and says nothing, the dreadnought's
furnaces gutter, and the Hollow Commodore, under his card on his own deck, leaps across. Tolland is back at his place
for the victory bell.

The spine: the Black Tide is putting out the lights of the Shattered Coast. Each battle is fought at, or for, one of
them, named on its title card, and each win is a bell. The lights: Gullwrack (1, 12), Skerrow Light (2), the Gannet
Rocks lamp (3), Saint Ivo's Lantern (4), Hookstone (5), the Black Mole (6), Farhaven Light (7), the Shoulder (8),
Redwater Beacon (9), the Teeth (10), the convoy's own stern lamps (11).

| # | Scenario | Whose deck | The hook and its verb | Pressure (no fail state ends the run) | Boss |
|---|---|---|---|---|---|
| 1 | **Gullwrack Light** | Dawnwake | Fog. Boarders row out of it and can only be hit inside the lightship's turning beam. | If they reach the lantern gallery the lamp goes out: thicker fog and an extra wave. | Captain Ezra Wick, Lamp-Breaker |
| 2 | **Across the Plank** | Dawnwake, then the brig | The brig's crew board first; then the gangplank is ours, so cross to her quarterdeck. | Her broadside fires telegraphed rings until her gunners fall. | Captain Hesper Lowe of the *Widow's Due*, at her helm |
| 3 | **Three Chains** | Dawnwake | A grapple steamer hooks her and hauls for the reef. Cut three chains (each a target) under fire. | The haul meter: full means grounding (a tilted deck, hull hazards, an extra wave, a smaller chest). | Foreman Gristle Mott of the *Haulfast* |
| 4 | **Fire Below the Black Sails** | the galleon | A two-level fight on the galleon's main deck and quarterdeck. | Cinderbomb fires spread across the planks and close the deck. | Admiral Veyl |
| 5 | **Harpoon Weather** | Dawnwake | A storm; cutters harpoon the hull, each taut line heels the deck, and airships drop boarders on ropes. | The deck tilts further with every line left uncut. | Harpooner Nan Gaff, swung over on her own line |
| 6 | **The Lightless** | the dreadnought | Board at the bow and push to the stern walk; spike each turret as you pass it. | The turrets sweep telegraphed arcs across the deck. | The Hollow Commodore |
| 7 | **Flight Deck** | the carrier | Waves rise on the elevators; Kestrels launch down the catapult lanes; jam both catapults. Thunderhawks torpedo the Dawnwake while Pip calls them. | Strafing lanes, and a Dawnwake hull meter that costs reward. | Lord Thundershroud, Air Boss, on the island |
| 8 | **Sea Coming Over** | Dawnwake | A gale; heavy seas sweep the deck on a beat (a telegraphed lane). Bait boarders into the lane: whoever stands in it when the sea comes over is thrown overboard. | The sweep shoves the hero too; brace at a mast to hold on. | Bosun Garret Blackwater |
| 9 | **The Red Tide** | Dawnwake | Velscour's blood sea; the drowned climb the hull until the blood idol on a hulk alongside is broken: a boarding plank drops across to the hulk's deck for melee heroes, and twice in the fight the Dawnwake's guns can be called onto it (a deck lever). | The dead keep climbing while it stands. | The Gallows King |
| 10 | **Wreckers' Reef** | the reef and its wrecks | Put out the wreckers' three false lamps; hit drifting mines (any attack, melee shoves them) to blast foes. | Every false lamp still lit calls another longboat. | Red Gale Corsair |
| 11 | **Lashed Together** | three Lampwarden tenders | Leap from deck to deck across a lashed convoy, clearing each one. | A tender lost means a smaller chest. | Boarding-Master Quill Dunmore |
| 12 | **The Ninth Bell** (the finale, after eight bells) | Dawnwake | *The Lightless* steams for Gullwrack to snuff the great light. Tolland goes down in his diving bell, and the Dawnwake holds over him against every size of ship, while the bell is rung beneath. When it rings, green light rises from under the sea and the dreadnought's furnaces gutter. Pip calls it first. Brask says nothing; she looks at Pip, and the bell carries it. It is a sign, not a return. | A 90-second hold-out over the diving bell (a bell meter fills only while foes are on the deck, and `hurry()` brings the next boat the moment it's clear; it pauses while a foe stands on the bell's davit). Every size comes at the Dawnwake: longboats and cutters, a brig's broadsides, a grapple steamer, and *The Anvil*'s Kestrels and Thunderhawks from over the horizon (the carrier itself stays out of reach). The great light dims as the dreadnought closes. | the hold-out, then the Hollow Commodore boarding from *The Lightless* |

## Review
Every model, the water and the writing were reviewed by two critics (thirty-year industry veterans in dialogue,
character design, scenario design and 3D modelling/texturing): **Halvard Kesk** (A: writing, character, construction
logic) and **Renata Osei-Varga** (B: silhouette, readability at the game camera, texturing, fight spaces). The rule:
iterate on their notes until both approve, at most four rounds; for the models the user then asked for one more
iteration and a move on. Final verdicts (all APPROVE, no blockers):

| Piece | Rounds | A | B |
|---|---|---|---|
| Writing: the Lampwardens, Tessariel's return, characters | 3 | 9 / 9 / 9 | 8 / 9 / 8 |
| Kestrel, Thunderhawk | 2 | 8, 8 | 8, 8.5 |
| The Anvil (carrier) | 2 | 8 | 8 |
| Black-sail galleon | 2 | 9 | 8.5 |
| Gun-brig, grapple steamer, hulk | 2 | 8, 8, 8 | 8, 8, 8.5 |
| The Lightless (dreadnought) | 2 | 8 | 8 |
| Dawnwake, lightship, tender (+ the Peal of Nine emblem) | 1-2 | 8, 9, 9 | 8, 8.5, 8.5 |
| Longboat, cutter, props, reef | 1-2 | 8, 8, 8, 8 | 8.5, 8, 8, 8 |

Round 1 found what the fleet shared, fixed once in `tools/seaship3d.js`: the pack's hammered gunmetal and flaked iron
read as granite at the game camera (now calmed toward their mean, plus generated riveted plate `M.plate`,
`plateRust`, `plateDeck`, `plateRed`); funnel tops read as lit lids (now an open throat with the fire deep down); sails
hid the decks being fought on (`fightingSail()` and each sailing ship's `setFightingSail(k)`: courses brailed, the rest
faded). The Lampwarden emblem was first a ring of gold marks on blue, which read as the European Union flag; it is
now the **Peal of Nine** (nine small bells in an arc over a green flame). Velscour's ships carry his **V**, not the
Jolly Roger, and are lit red; *The Lightless* is lit only by fire.

### Open polish (optional notes, none blocking)
- Kestrel: a longer strafing trail; Thunderhawk: a drop frame with a splash ring and torpedo wake in play.
- Carrier: bigger anvil horn with a flared face; knees under the stern-corner gun tubs; brass mullions on the bridge
  band; slag vents or a hammer crane on the island; offset the greyboard grain per panel.
- Galleon: a sharper, symmetric V on the main course (the swash tail nears a checkmark); lanterns at the head of the
  quarterdeck stair; fade the shrouds a little in fighting sail; check the 0.35 fade in fog.
- Brig: reef bands pinned straight under the belly; a tackle line to the raised corvus; faded sails at 0.25.
- Grapple steamer: stronger orange rust bleeds; plate (not speckle) on the wheelhouse roof and the block by the
  winch; the bow launchers' hooks visible when docked.
- Hulk: char as soft dark fans with a thin ember rim (the zigzags read as glyphs); marker lamps at the landing gap.
- The Lightless: sink the funnel glow below the rim with a grate (the carrier too); plate on the tower deckhouse roof and
  funnel pads; a black name board with a red edge; kill the last dim tower windows; breech hatches the brightest thing
  on deck at night.
- Dawnwake: the main course may carry the Peal of Nine instead of the oval bell roundel.
- Reef: false-lamp cages ~1.3x or a faint green shaft; round the boulders, darker wet edges, a barnacle band.
- Small craft: a symmetric gothic V on the skull-over-V flags; the cutter's ballista clear of the bow rail.
