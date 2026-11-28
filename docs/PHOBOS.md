# ACT III: Bellmourn, City State Phobos and Castle Velscour

The third act's own content. The design comes from the Bellmourn 3D game's repo (`bm-phobos`: `docs/PHOBOS.md`,
`PHOBOS-LAYOUT.md`, `PHOBOS-TEXTURES.md`), and the art from two zips: `Bellmourn_Phobos_230_Characters.zip` and
`Velscour_Keep_Castle_and_Grand_Finale.zip`.

## Art
- `python tools/phobospack.py <characters zip> <finale zip> [--heat dir]` heat-map cuts the 5x2 plates
  (alpha blurred with sigma 5, blobs to cells) and the finale forms into `assets/source/enemies/phobos/<folder>/`.
  It also writes `src/data/phobosroster.js`. Then `python tools/process_assets.py enemies phobos` packs the 25 atlases.
  This gives 452 sprites: 80 folk (gray and good), ward foes, ward bosses, castle foes, castle bosses, knights,
  creatures and Lord Velscour's 4 forms in 3 battles.
- `src/data/phobos.js` turns the roster into bestiary entries (`phx_<id>`, `phobos: true`, so they stay out of the
  random pools). It also holds the 11 DISTRICTS, the 3 HUBS, the 10 WINGS (`wingOf(floor)`), `castleDepth`
  (floor 1 is depth 239, floor 100 is depth 500), the GUARDIANS and FINALE.
- **The Dungeon Horrors** (`VELSCOUR_Dungeon_Horrors_130_Sprites.zip`: 100 humanoid horrors in ten dungeon themes and 30
  bosses, native Grim Nocturne pixel art, already cut): `python tools/horrorspack.py <zip>` unpacks them into
  `assets/source/enemies/dungeon_horrors/<sheet>/` (13 folders) and writes `src/data/horrorsroster.js`; then
  `python tools/process_assets.py enemies dungeon_horrors` packs 13 atlases stored 1:1 (`NATIVE_SETS`: no resampling).
  `src/data/phobos.js` catalogues them as `phx_dh_*` (`horror: true`, cat `horror` / `horror_boss`): the arch and element
  come from the name (`HORROR_RULES`, `HORROR_ELS`) or the theme (`HORROR_THEME`), and the height from the art's own
  pixel height, so they keep one pixel density: horrors 54-63 world px, bosses 82-92. They hold the districts and wings
  their themes suit (`HX`/`HN` in DISTRICTS and WINGS). Eleven bosses are ward lords (one more per district), and the
  other nineteen are the wings' `lords`: `wingLordFor(floor)` puts them on a wing's 3rd, 8th, 6th and 1st floors in
  place of a captain drawn from the wing's foes.
- Textures: `tools/phobostex.py` puts the bm repo's textures on the dungeon wall rigs as ten biome packs
  (`assets/tiles/ph_*`, `src/data/phobosbiomes.js`). These biomes are never in a bag.

- **The Hulking Castle Knights** (`VELSCOUR_Hulking_Castle_Knights_100_Sprites.zip`: 50 knights and 50 boss knights in
  five houses, native pixel art): `python tools/knightspack.py <zip>` unpacks them into
  `assets/source/enemies/hulking_knights/<sheet>/` and writes `src/data/knightsroster.js`; then
  `python tools/process_assets.py enemies hulking_knights` packs 10 atlases 1:1. `src/data/phobos.js` catalogues them as
  `phx_hk_*` (`hk: true`, cat `hk` / `hk_boss`). Knights stand 68-76 (a hero is 60), boss knights 76-83 before a boss's
  own scale. Every wing fields the houses that suit it (`knights`), and a boss knight captains each floor no other lord
  holds (`captainFor(floor)`).
- **Liveries**: each wing has a colour (`WINGS[].color`, `LIVERY`): black and gold (Armoury, Sanctuaries, the Keep),
  blue (Library, Storm Spire), red (Gatehouse, Great Hall, Bone Spire), green (Oubliettes, Menagerie). The knights are
  recoloured to it (`util.recolor`'s `livery`: the coloured cloth and tinted plate take the hue; dark with gilt for
  gold), and so are the wing's banners, carpets and altar cloths. `phobos_lineup.js 9 hk,hk_boss` shows them.
- Act III's fighting humanoids (ward and castle foes, knights, horrors) stand 64-67, a little over a hero, so a hero
  grown by a skill never towers over them.

## The dressing (`tools/phobosdress.py`, `src/gfx/phobostex.js`)
`python tools/phobosdress.py <bm repo>` writes `assets/tiles/phobos/dress.webp` + `dress.json` from the bm repo's textures:
- **Ground cover**: ragged bands of gravel, moss, scree, rubble, bones, straw, litter and ash laid over every join
  between two unlike grounds, and patches (puddles too) strewn over plain ground (`layGroundCover` fills `map.seam` and
  `map.patch`; `render.js` draws them into the floor chunks with `drawGroundCover`). No ground ends in a saw-tooth line.
- **Floors**: the wings' carpets in the four liveries, arena sand, bronze plates (`PH_FLOORS`; variants start at `PH_V`
  = 130 so all of them fit a byte).
- **Furniture**: modelled from boxes, planes and drums and rendered on the 2:1 grid with a lit arris, a dark foot, a
  short palette and a one-pixel outline: pews, pulpit, altars (one per livery), lectern, font, sarcophagus, candle stand,
  stand tiers, parapet, the lord's box, columns, brazier, obelisk, suit of plate, hall table, market stalls, lamp post,
  gibbet, Velscour's V on standards and flat on walls (five cloths), and the curtain wall (`rampart`, `rampart_v`,
  `rampart_tower`). Lamps, braziers, candles and altars cast light (`propLights` in `game/phobos.js`).
- **The chest**: the bm repo's `chest.glb` (copied to `assets/source/chest3d/`), baked by `node tools/chest3d_bake.js`
  (`tools/chest3d.html`) into `assets/sprites/chest3d.webp`: eight frames of its lid opening. `src/gfx/chest3d.js` draws
  it for Act III's chests (purple when rare), the Cursed Chest (blood-pink) and any chest whose pack art is not in.

## The places
- **Bellmourn** (`game.enterBellmourn`, `setupBellmourn` in `src/game/phobos.js`) is Herrington's town builder on a
  fixed seed, in snow. It has vendors and a stash, the Bell-Warden (the quest giver) and good folk who fled Phobos.
  Its waypoints lead to Phobos, the castle wings, Herrington and Sunscorch. The Herrington and Sunscorch waypoints
  to Bellmourn open when its quest is done, or from depth 200.
- **The city's plan**: the King's Mile (seven wide, kerbed, lamps and standards along it) and the three loops run
  square to square in straight reaches with one bend each; the wards between are cut into blocks by side streets that
  branch at right angles and run until they meet another street, and every block's rim is a row of houses fronting a
  street, with yards behind. **The curtain wall** rings the city five wall panels tall, with 26 guard towers and war
  banners, standing on a dead moat and scree; it fades to a see-through hole in front of the hero like any wall.
- **City State Phobos** (`src/world/phobos.js`, 248x204, never random) has a dodecagon wall and the Sill and moat
  plain to the west. The King's Mile, Ash Lane, Low Road and High Loop run through 11 districts, each with a square,
  houses, the Slough canal and the Bone Yards' grave rows. Every district has its own foes, ward lords on its square
  and folk. About one in five gray folk turns on the hero up close. The three hubs' givers sit in safe houses.
  Packs come back about every 45 s away from the hero. Slaying 12 ward lords opens the Castle Gate at the east end.
- **Castle Velscour** (`src/world/castlevelscour.js`) has 100 floors of 200x170 in 10 wings. There are 23 layouts in
  9 families: halls, naves (cathedrals), arenas, pits, stacks (libraries), sewers, bridges between towers, outer
  stairs round the towers, and leaps. The sheer families (pits, bridges, outerstair, leaps) use the Sheer Drop
  biomes: no walls and an abyss. Leap stones and swing chains (`Pad` in `game/phobos.js`) fling the hero across
  gaps, and auto-play follows the route pads. Every floor has a lord:
  - every floor: a wing captain;
  - every 5th floor: a castle boss;
  - every 10th floor: the wing's raid boss in an arena;
  - floor 100: Lord Velscour.
  Each wing is a waypoint in Bellmourn once reached.

- **The great rooms** (new layout families in `LAYOUTS`): `sanctuary` (a narthex, the great church with pews either
  side of a five-wide carpeted aisle, columns, side chapels, crossing, pulpit, altar and apse, a cloister walk to lesser
  chapels; floors 61, 65, 66, 92), `auditorium` (horseshoes of tiered benches round a stage; 32, 48, 94, 99), `stadium`
  (ovals of sand ringed by a parapet and stands, four tunnels, the lord's box; 4, 22, 27, 34, 39, 55, 93) and `cloister`
  (garths with an arcade of columns; 14, 19, 53, 58, 63, 68). The cathedral, nave and great hall are furnished too.
  Furniture never stands on a corridor's line, and a pocket it would seal is filled in. Pillars are stone columns now.
- **Walls** change stone from run to run: each wing's pack plus two more (`moreWalls` in `core/assets.js`,
  `map.wallMix`), 7-8 families a floor. Most wall hangings are Velscour's V in the wing's livery, some his war banner.

## How hard it is (`HARD`, `harden`, `tempo`, `act3Loot` in `src/game/phobos.js`)
Act III is the hard end of the game. On top of their level, its monsters get: rank and file life x(2.2 + 1.4t) and
blows x(1.3 + 0.4t), t = floor / 100 (the city x1.9 / x1.2); ward lords x3.2 / x1.7; floor captains x(5 + 4t) /
x(2.0 + 0.7t); guardians x(6.5 + 5t); raid bosses x(5 + 4t) / x(2.0 + 0.8t); Lord Velscour x12 / x3.2. A hero of the
floor's level in ordinary gear dies there (measured in auto-play: within 15-150 s on floors 30-90).
Every lord is **warded**: he takes full damage up to a share of his life a second (captain 6%, guardian 5%, ward lord
7%, raid boss 2.2%, Velscour 1.2%) and a sixth of anything past it, with "Warded" shown when it bites, so no lord
falls in a breath whatever the hero carries.
What it pays: +80 to +220 magic find, x1.5 drops, x2.5-4 Covenant odds, and the four **Household sets**
(`data/relics.js`: `v_gold`, `v_red`, `v_blue`, `v_green`; five armour pieces each at full-strength lines, the strongest
set powers), found only here: Rare-or-better drops of a fitting slot may be a piece of the wing's set, every floor lord
drops one, a wing's raid boss two, Velscour three. "fear phobos" now also wears the black-and-gold set, +10.

## The raid bosses (`src/game/phobosraids.js`)
The raid bosses have 4 phases each, with mechanics drawn from Midnight Season 1 (The Voidspire, The Dreamrift,
March on Quel'Danas) and The War Within's last raids:

| Wing | Boss | Mechanics |
|---|---|---|
| Gatehouse | Keeper of the Third Latch | Latch slams and roars (Vorasius) |
| Oubliettes | The Oubliette Elector | Chains and a collapsing floor (Salhadaar / Dimensius) |
| Armoury | Armourer of the Hollow Crown | Forge heat, cooled in the quench troughs |
| Great Hall | The Iron Table Marshal | The bonded Brazier Duke: keep them apart (Vaelgor & Ezzorak) |
| Library | The Long Stacks Regent | Memory game and falling pages (Midnight Falls) |
| Menagerie | The Queen of Iron Pennants | The Veil: immune until the Veil Wardens die (Chimaerus) |
| Sanctuaries | Ash Chancellor of the Sanctuaries | Light/Void polarity circles (Belo'ren) |
| Stormspire | The Windward Black Knight | Gale push, shelter by the buttresses (Crown of the Cosmos) |
| Bonespire | The High Ward's Eclipse | Beams and the eclipse |

**Lord Velscour** changes form every phase (4 sprites, growing). His three battles rotate win by win:
- **The Crimson Dynasty:** tide pools, the Dynasty's Debt and a shrinking arena.
- **The Obsidian Eclipse:** polarity, a gravity well, the eclipse and an event-horizon pull.
- **The Cathedral of Ruin:** a tolling bell, shattered glass and falling pillars.

Each battle also keeps a law for the whole fight (`velscourLaw`), a hazard auto-play reads through `autoGoal`:
- **Crimson, the Blood Tithe:** Tithe-Knights march in every 26 s (never more than four) and he heals while one
  stands, and while the hero keeps more than 11 tiles off; each knight's death costs him 2% of his life.
- **Obsidian, the Event Horizon:** the arena's middle pulls, harder each phase; every 22 s, after a 3.6 s warning, all
  ground past seven tiles of the middle is unmade (34% of the hero's life).
- **Cathedral, the Toll:** the bell tolls every 15 s (sooner each phase) after a 3.4 s warning; only the lit ground in
  the lee of a pillar is safe (28% and a stun).
A law's blow is cut by the hero's damage reduction and half his resistance to its element.

His fall plays the ending: the balcony, the beam, and waking in Bellmourn. He can never truly die.

## Quests (`QUESTS` in `game/phobos.js`, state `c.phobos`)
1. Herrington (from level 30 or depth 60): win 3 BOSS ROOMs.
2. Sunscorch: go 10 depths deeper.
3. Reach depth 200 or level 60 to open Bellmourn.
4. Bellmourn: slay 300 foes.
5. Win 1 more BOSS ROOM to open the road to Phobos.
6. Phobos: find the three hubs.
7. Break 12 ward lords.
8. Clear each of the ten wings.
9. Win all three of Velscour's battles.

Act III never touches the descent's depth. Its levels are built at their own depth for monster levels, deaths
there wake the hero in Bellmourn with no Defiance, and the town portal leads to Bellmourn.

## Test
`node tools/tests/phobos.js [floors] [noraid | raids=10,20,100c,100o,100x]` tests Bellmourn's portals, Phobos (the
gate is sealed until 12 lords fall), castle floors reaching their exits, and every raid through 4 phases. It writes
shots `tools/tests/out/phobos_*`. Run the raids in two batches: one long headless page can run out of memory.
`node tools/tests/phobos_biomes.js` tests the ten texture packs.
`node tools/tests/phobos_look.js [city|castle|all] [noshots]` checks and shoots the dressing: houses on streets, the
curtain wall, the great rooms' furniture, V banners, wall variety (shots and plans `tools/tests/out/look_*`).
