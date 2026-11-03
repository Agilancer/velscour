# The Endless Siege (`endless_siege`)

A keep under siege by an undead horde that never stops coming: tower defence inside the ARPG. One of the four new
regions (docs/NEW_REGIONS.md). Reached from Velscour's skull: `siege`, `endless siege`, `the endless siege`,
`hold the walls` (or the HAIL VELSCOUR! list). Never drawn into the biome rotation (`BETA_BIOMES`).

## How it plays
- **The map** (64 x 64): the keep's courtyard at the top of the screen (low x + y), the field the dead cross below it.
  A ring of height-mapped curtain wall (14 levels, crenellated on the front rows) with 5 x 5 corner towers (22) and
  raised gatehouse flanks (19), built against a rock cliff behind. Three gates, three tiles wide: the **West Gate** and
  the **Great Gate** on the south wall, the **East Gate** on the east wall. Inside: barracks and armoury (town-pack
  buildings), braziers, stores, the keep's standard, the exit (NW corner). Outside: two broken rows of stakes and
  barricades, the siege camp's tents and wrecked cannons, the debris of earlier assaults, dead trees at the edge.
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
the nearest of the dead. No change to autoplay.js was needed.

## Files
- `src/game/regions/siege.js`: the registry entry (words, load, ready, generate, run, intro, quest, `castleArt`).
- `src/world/siege.js`: `generateSiege(depth, biome, seed)`; layout constants (`RING`, `GATES`, `BALLISTAE`, `KEEP`,
  `LV`), `keepSprite()` for the Castle Keep pack's scatter.
- `src/game/siege.js`: `createSiegeRun()` (the waves, gates, winches, ballistae, resolve, objective, HUD).
- `src/gfx/siege.js`: the portcullis, winch, ballista and standard drawing; `SiegeBolt` (the bolt effect).
- `tools/tests/siege.js`: `node tools/tests/siege.js [shots|noshots] [auto|noauto] [depth]`.
- Shared file touched: `src/game/game.js` `releaseLevelArt` (one line: a region with `castleArt: true` keeps the
  Castle pack loaded, since the wall faces are drawn from its masonry while the level is played).

## Art (all existing)
Wall faces and wall-walk tops: the Castle pack's masonry (`gfx/castlewalls.js` FACE.wall / FACE.tower,
`castleRampartTops`). Ballistae (`keep_ballista`), winches (`chain_winch`), the standard (`royal_banner_stand`),
cannon wrecks, braziers, stores and the courtyard flagstones: the Castle Keep biome pack. Stakes, barricades, stores:
the Castle pack's scatter; tents: `castleTent`. Ground, buildings, dead trees: the town pack; bones, shields, banners:
`gfx/overworldart.js`. Monsters: the biome roster's painted looks. The portcullis and the bolts are drawn in Canvas 2D.
No three.js.

## Status
Playable and won by auto-play: depth 8 (level-11 hero, 4 waves, no falls, ~5-6 game minutes) and depth 60 (5 waves).
A level-1 hero at depth 8 also wins but the keep falls once or twice in the last wave. `flow.js` passes.

## Next
- The hero can't walk the wall-walk (walls are solid); defenders on the walls and archers shooting down would sell it.
- A lintel/arch over each gate passage (`castleSpan` in gfx/castlewalls.js could draw one) and gatehouse roofs.
- The ballistae are static sprites (flipped left/right by aim); a three.js ballista that trains would read better.
- Siege ladders or rams as their own monster behaviours; a burning-oil or bell interactable.
- Balance at depths 150+ (7 waves) is untested.
