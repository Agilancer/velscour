# The Endless Siege (`endless_siege`)

A keep under siege by an undead horde that never stops coming: tower defence inside the ARPG. One of the four new
regions (docs/NEW_REGIONS.md). Reached from Velscour's skull: `siege`, `endless siege`, `the endless siege`,
`hold the walls` (or the HAIL VELSCOUR! list). Never drawn into the biome rotation (`BETA_BIOMES`).

## Five variants (November 2026)
Each level rolls one of five keeps (`SIEGE_VARIANTS` in `src/world/siege.js`; the generic plumbing in
`src/game/regions.js`: never the one seen last). The skull word plus a number, id or a piece of the name picks one
(`siege 3`, `siege pass`, `siege swamp`); the HAIL VELSCOUR! list shows them all. Every variant keeps the same rules
(gates held while the hero is inside, winches, ballistae, horn, resolve, the wall-walk by its stairs only).

| # | Variant (`id`) | Keep | Ground and season | Horde, Gate-Breakers, lord | Twist |
|---|---|---|---|---|---|
| 1 | The Old Keep (`keep`) | square, 3 gates (2 south, 1 east), 4 corner towers, 3 ballistae, 4 stairs | the town pack's grass/mud/gravel; ember drift | skeletons, zombies, archers, ghouls, cultists, knights, wraiths, imps; golems/abominations; *Lord of the Endless Siege* | none: the plain siege |
| 2 | The Frozen Border Fort (`frost`) | wide and shallow (43 x 29), 2 gates on the south wall, a 5th tower between them, 4 ballistae | the Castle pack's floors under a snow palette, pale ice glazing the field; snowfall; frost-blue dead (cold) | skeletons, archers, ghouls, wraiths, gargoyles, knights; golems; *Marshal of the White Death* | **ice** slows the dead 40% while they cross it; the wave before the last comes in a **blizzard** (ballistae see 60% as far, the dead +15% speed, dimmer, snow streaks) |
| 3 | The Burning River Wall (`river`) | small square (33), 2 gates (the Bridge Gate south, the Mill Gate east), 3 stairs; two town houses inside | warm brick and setts, cart ruts; a river in an L round the town (sunk, three wide), one **bridge** before each gate, the only ways across; embers, often night | zombies, skeletons, archers, hounds, cultists, imps (fire); demons/abominations; *the Burning Lord* | **fire-pots** on the walk over each gate: tip one and burning oil hits every dead at the gate's foot for 90% of a monster's life and leaves the ground burning (refilled each lull; auto-play tips one at 4+ dead); the **fire wave** (before the last) comes burning, its blows on the gates count 1.5x |
| 4 | The Mountain Pass Fortress (`pass`) | 30 x 30, **one** great gate, its east wall against the mountain, 2 ballistae (SW, SE), 4 stairs | grey grit and gravel; a winding gully up to the gate between crags that rise a step a tile away from it (blocked rock, pines and boulders on it); dust | skeletons, archers, ghouls, hounds, gargoyles, knights; golems; *King under the Pass* | **rockfalls**: every 3.5-6.5 s a telegraphed rock (meteor) falls on the dead in the pass more than 3 tiles out, 50-60% of a monster's life |
| 5 | The Swamp Abbey (`mire`) | 37 x 33, 3 gates (the Abbey Gate south; the Mire and Bone Gates east), a flight on the east wall's inside | mossy brick, damp mud and puddles under a swamp palette; sunk green **mire pools** all over the field, willows and reeds; fireflies, permanent **fog** (dim) | zombies, ghouls, spiders, worms, cultists, shrooms (poison); abominations; *the Plague Abbot* | the dead **rise from the mire**: spawn points beside the pools from 6 tiles off the walls outwards (no far edge); the **plague** lord leaves a poison cloud every 4.5 s and, unlike the others, wears the resolve down (1.2/s) inside the walls |

The layout (`siegeLayout(id)`) derives everything from a variant's two outer lines (`LX`, `LY`): the walls two deep
inside them, the corner towers (plus extras), the ballistae on towers (feet in the courtyard), gate lines, flanks,
passages and winches; `terrain(x, y)` adds the ground outside (rock, water, bridge, ice, pool). The run
(`createSiegeRun`) reads `gen.lay`: its horde joins in roster order (3 kinds from wave 1, 2 more from wave 2, the rest
from wave 3; the heavies as Gate-Breakers), its biome overrides (element, monster tint, blood, drift, torch) are laid
over the biome for the level (`world.biome`, `world.ambientFx`), and its twist runs in `twistTick`.

## How it plays
- **The map** (64 x 64): the keep's courtyard at the top of the screen (low x + y), the field the dead cross below it.
  A ring of height-mapped curtain wall (14 levels) with 5 x 5 corner towers (22) and raised gatehouse flanks (18),
  built against a rock cliff behind. Three gates, three tiles wide: the **West Gate** and
  the **Great Gate** on the south wall, the **East Gate** on the east wall. Inside: barracks and armoury (town-pack
  buildings), braziers, stores, the keep's standard, the exit (NW corner). Outside: two broken rows of stakes and
  barricades, the siege camp's tents and wrecked cannons, the debris of earlier assaults, dead trees at the edge.
- **The wall-walk** (November 2026). The wall tops are walkable, on the Mountainside/Castle height-map rules
  (`map.climb` 4 levels a hop, `map.drop` 10, `walkStep` 4): four flights of stairs (`STAIRS` in world/siege.js:
  three steps of 4 levels, two tiles wide) climb from the courtyard, against the west and north walls and on the
  south wall between and east of the gates, risers toward the camera. The walk is 2 tiles wide on the back walls and
  1 on the front ones; a gate's flanks stand a step over it (18), the towers another (22, a step tile of 18 where the
  walk meets one), so the walk runs round each stretch the gates cut it into: west + north + the north-east, between
  the West and Great Gates, east of the Great Gate + the south-east. A **parapet** (merlons +3 levels and crenels,
  both blocked) runs along every top over the field and round the towers' outer edges; the ballistae stand blocked in
  the middle of their towers. A chest waits on the north-west tower.
  Nothing outside climbs up (the field is 14+ levels under every top) and nothing on top steps off (a drop of 14+);
  A*, the flow field and auto-play's distance field all follow the same rule, so the dead in the field go round by a
  gate for a hero on the walls, and are held there as before (he is inside the keep). Sight is the height map's
  (`losBlocks` off): the walls hide the field from the courtyard, the parapet hides nothing from the walk, so the hero
  shoots and casts down over it (projectiles fly over any floor). `map.meleeStep` 10: no melee blow lands between
  levels further apart than that (the one shared change, `Monster.atkRange` in game/monster.js, opt-in per map), so
  the dead at the foot of the wall or in the courtyard can't strike a hero above them; they take the stairs.
- **Gates.** While the hero is inside the keep, a standing gate holds the dead on its line (they are pushed back to
  it); there they batter it (2 a blow, champions 4, Gate-Breakers x3, their lord 9; 100 hp). The portcullis rises for
  the hero, so he can always step out (and then nothing is held: they come at him). A broken gate lets them in.
- **Winches** (inside each gate) mend it: fully between waves; during a wave +40% (6 s apart), never with the dead
  within 4.5 tiles.
- **Ballistae** on the SW, SE and NE towers: load one (use it from the courtyard) and it looses on its own, 6 bolts,
  range 21, a bolt every 1.7 s at the dead held at gates first. A bolt pierces up to 4 and hits for 60% of a normal
  monster's life (half against their lord).
- **Resolve.** The dead inside the courtyard wear the keep's resolve down (0.3/s each, champions 0.6, at most 3/s;
  their lord does not). At 0 the keep is overrun: the wave's dead withdraw, gates come back to at least half, resolve
  to full, and the same wave comes again. +20 resolve for each wave held.
- **Waves.** `siegeWaves(depth)` = 4, +1 every 50 depths, at most 7. Wave k has `10 + 4k + depth/25` dead (at most 42)
  from the biome roster (skeletons, zombies, archers first; ghouls and cultists from wave 2; knights, wraiths, imps from
  wave 3), k champions, and from wave 3 golems/abominations as Gate-Breakers. The last wave brings **their lord** (a
  boss look from `rollLooks().boss`) with its last six. They rise in clumps of 1-3 at the far edges of the field over
  about 20 s. Stragglers lost somewhere after 40 s are brought back to the gates.
- **Between waves** (40 s before the first, 30 s after each): mend, load, then **sound the horn** under the standard to
  call the next wave early. Holding the last opens the exit and drops a rare chest by the standard.
- Short barks from Captain Hale in the log; a HUD line under the top bar (`#siege-objective`: wave, resolve, what is
  next, each gate's state); Quest Log steps from the region's `quest()`.

## Auto-play
The run's `objective` (read by autoplay.js like any overworld scenario): between waves the nearest chore (a winch to
turn, a ballista to load), then the horn; during a wave the dead in the courtyard, else the stand point behind the gate
with most dead at it, else a ballista with under 2 bolts, else a broken gate it can safely mend, else the gate nearest
the nearest of the dead. A ranged hero (not a melee build by auto-play's own test) takes the wall-walk over the hot
gate instead (`gate.posts`, the flank tile either side of the passage) and looses down at the dead held there. For a
fighter the run lends the walk's tiles (`map.siegeDeck`) to auto-play as the Castle's `map.rampartDeck`, so a foe
more than a drop below or above is reached by the stairs, never swung at across the height (`Auto.offTier`). Its
paths (`Auto.buildNav`) follow the height map, so it climbs the stairs like the hero would. No change to autoplay.js
was needed.

## Files
- `src/game/regions/siege.js`: the registry entry (words, load, ready, generate, run, intro, quest, `castleArt`).
- `src/world/siege.js`: `SIEGE_VARIANTS`, `siegeLayout(id)`, `generateSiege(depth, biome, seed, variantId)`; `LV`,
  `stairTiles()`, `keepSprite()` for the Castle Keep pack's scatter.
- `src/game/siege.js`: `createSiegeRun()` (the waves, gates, winches, ballistae, resolve, objective, HUD).
- `src/gfx/siege.js`: the portcullis, winch, ballista and standard drawing; `SiegeBolt` (the bolt effect).
- `tools/tests/siege.js`: `node tools/tests/siege.js [shots|noshots] [auto|noauto] [depth] [variants|all]` (every
  variant by default: 8 seeds each, the rules, the wall-walk and the twist in play, shots, auto-play; `SIEGE_CLASS=wizard`
  for another auto-play hero, `SIEGE_MORTAL=1` without god mode). The auto-play hero is geared the way
  `balance.js` gears one (level, the best of 200 drops of the last item levels, +upgrades, gems, mastery). It fails if
  the keep falls more than once every two waves.
- Shared file touched: `src/game/game.js` `releaseLevelArt` (one line: a region with `castleArt: true` keeps the
  Castle pack loaded, since the wall faces are drawn from its masonry while the level is played); `src/game/monster.js`
  `atkRange` (opt-in `map.meleeStep`: no melee between levels further apart, only the siege sets it).

## Art (all existing)
Wall faces and wall-walk tops: the Castle pack's masonry (`gfx/castlewalls.js` FACE.wall / FACE.tower,
`castleRampartTops`). Ballistae (`keep_ballista`), winches (`chain_winch`), the standard (`royal_banner_stand`),
cannon wrecks, braziers, stores and the courtyard flagstones: the Castle Keep biome pack. Stakes, barricades, stores:
the Castle pack's scatter; tents: `castleTent`. Ground, buildings, dead trees: the town pack; bones, shields, banners:
`gfx/overworldart.js`. Monsters: the variant roster's painted looks. The portcullis and the bolts are drawn in Canvas 2D.
No three.js. The other four variants' ground is the Castle pack's sixty floors (`castleFloorTiles(palette)`: grass,
grit, setts, brick, mud and its moat waters for the river, the ice and the mire pools), recoloured per variant with the
Castle variants' palettes (snow, swamp, grey stone, firelit), and their rampart tops tinted to match; the fire-pots
are the Castle Keep pack's brazier with Canvas flames; trees, reeds, boulders and houses from the town pack.

## Status
Playable in five variants, with a walkable wall-walk in each, and won by auto-play in every variant at every depth
tried (the auto-play hero geared the way `balance.js` gears one; `node tools/tests/siege.js noshots auto <depth>`;
falls = times the keep was overrun; game seconds):

| Depth (waves) | Hero | Old Keep | Frozen Fort | River Wall | Mountain Pass | Swamp Abbey |
|---|---|---|---|---|---|---|
| 8 (4) | paladin lvl 11-16, god | won, 0 falls, 261 s | won, 0, 164 s | won, 0, 188 s | won, 0, 146 s | won, 0, 215 s |
| 150 (7) | paladin lvl 102-105, god | won, 0, 451 s | won, 0, 398 s | won, 0, 409 s | won, 0, 299 s | won, 0, 454 s |
| 320 (7) | paladin lvl 178, mortal | won, 0, no deaths, 351 s | won, 0, no deaths, 397 s | won, 0, no deaths, 398 s | won, 0, no deaths, 266 s | won, 0, no deaths, 382 s |

Before the variants (the Old Keep only): a wizard at 150 (god) and 320 (mortal) also won with no falls (~540 / 410 s),
shooting from the walk over the gates.

No tuning was needed: the waves already scale through `monsterBase(depthLevel(depth))` (monster life and blows,
ballista bolts at 60% of a normal monster's life). The one weak spot is gear: the old lighter-geared test hero (4
rounds of 20 drops, no upgrades, gems or mastery) at depth 150 still wins but the keep fell 5 times in waves 4-7
(~1100 s), so an under-geared hero gets a harder, longer siege, not an endless one (overrun resets the wave, resolve
and half the gates). `flow.js` passes.

## Next
- Variants: the blizzard's snow streaks are thin at a glance; the mire's pools read best by day (the fog keeps it dim);
  the river has no ford, so the dead file over two bridges (a third crossing or a ford would spread them).
- Each variant's ground is one recoloured Castle palette; a variant's own walls (snow-capped merlons, charred timber
  hoardings on the river wall, a mossy abbey) would set them further apart.
- Defenders (garrison archers) on the walk; the dead's own archers could aim at a hero on the walls more often.
- A lintel/arch over each gate passage (`castleSpan` in gfx/castlewalls.js could draw one) and gatehouse roofs; the
  walk is cut at each gate (a single-level height map has no bridge over the passage), so it runs in three stretches.
- The ballistae are static sprites (flipped left/right by aim); a three.js ballista that trains would read better.
  Loading one still happens from its foot in the courtyard (or the tower top, within reach).
- Siege ladders or rams as their own monster behaviours (a ladder would be the one way up from the field); a
  burning-oil or bell interactable on the walk.
- Auto-play shoots from the walk only over a gate under attack (`gate.posts`); it could also man a tower top.
