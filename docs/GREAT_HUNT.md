# The Great Hunt (`great_hunt`)

One colossal beast per hunt, Monster Hunter gone gothic. You track it through its woods by its signs, wear it down
over three fights (each time it flees, bleeding, to the next hunting ground, and its wounds carry over), then corner it
in its lair and kill it. The kill opens the exit in the lair. One of the four new regions (docs/NEW_REGIONS.md).
You reach it from Velscour's skull with `hunt`, `great hunt`, `the great hunt` or `beast`, **from level 10**
(the user's rule; `minLevel: 10` in the registry). Below it the skull word, `teleportToBiome` and a saved portal refuse
with one line from Velscour ("LEVEL 9? ADORABLE. Come back at level 10. The Great Hunt does not hunt snacks."), and
the HAIL VELSCOUR! list shows it greyed out with "Reach level 10".

## How it plays
- **The territory** is 96 x 96 tiles of dark woods. A winding game trail runs from the hunters' camp (the town portal)
  through three hunting grounds to the lair. Meadows open beside the trail, and five narrow game trails branch off to
  small glades. Two of those glades hold a dead hunter's cache with a chest. The route is randomized and turned one
  of four ways per seed. Packs (about ten) keep 15 tiles from every hunting ground and the lair, so a dodge out of a
  stomp doesn't wake one, and there are no ambushes (`world.ambushT = Infinity`); cultists here raise no skeletons
  (their `summoner` is cleared each second: one long fight piled up 100+ of them).
- **Signs**: each of the four legs has three clues on the trail: a kill, claw marks, a sprung trap, tracks, a bitten
  shield, ravens, flattened brush, its blood. Only the next sign is marked (the objective glyph, label "A sign").
  Walking up to a sign reads it, with one short line in the log. After a leg's last sign, the ground is marked
  ("The beast" / "Its lair").
- **Encounters**: the beast waits asleep on its ground and wakes when you come close. A banner shows its name with
  "It turns to fight", "Wounded, and angrier", "It will not run far" or "Cornered in its lair". From the second
  fight on, its brood joins in (2, 3, then 4 monsters of one archetype).
- **The flee**: it runs at 75%, 50% and 25% of its life. A life gate (`m.vel.absorb`, the same hook as
  Velscour's) holds its life at the mark, so one huge hit can't end the hunt early. It roars, becomes
  untargetable, and runs down the next leg at 7.5 tiles a second, dripping blood splats as it goes. Once it is
  24 tiles from the hero (or it arrives), it parks on the next ground, asleep, with the life it had. The rest
  of the blood trail is painted at once. Where it stood lies a dead hunter's satchel: two healing potions and a
  rejuvenation (four fights and no town between them).
- **The lair**: there is no gate. It fights to the death. The kill drops a trophy (an Epic, or a Legendary half
  the time) on top of the boss's own loot, and opens the exit at the back of the lair.
- **The boss bar** shows its life all hunt long, with a line under it: "Wounded 25% · runs at 50%",
  "Fleeing · follow the blood" or "Cornered".

### The beasts
Lone giants from the existing set 2 bestiary, with no new art (`HUNT_BEASTS` in `src/game/hunt.js`): The Moon-Eater
(antlered_moon_eater), Old Tuskfather (armored_boar_patriarch), The Thornback (thornback_mammoth), Frostmane
(frostmane_werebear), The Rotwing Queen (rotwing_vulture_queen), The Hundred-Legged King (ravenous_centipede_king),
The Brood Duchess (chitin_brood_duchess), The Bloodcrest (bloodcrest_hydra), Blackhorn (obsidian_horn_dragon).
The pick is random and never repeats the last one (`c.lastHunt`); tests can force one with `G.huntBeast = '<id or art>'`.
Each beast is a `boss`-rank `makeMonster` at depth level + 2 (`depthLevel`), with x1.6 a guardian's life
(`BEAST_HP`), x0.8 its blows (`BEAST_DMG`), x1.25 its size and x3 its XP. Life and blows are pulled toward the middle
by archetype (life x(1.4/hp)^0.25, blows x(1.2/dmg)^0.6), so the Bloodcrest (an abomination, x2.0 blows) and the
Brood Duchess (a spider, x0.6) are about as hard as each other. The regen, teleport and fast affixes are removed.
Its blows are a beast's: stomp, charge, a fan of spines, thrown boulders (`slam`, `charge`, `volley`, `meteor`). No
summons (the brood is its help), no nova or spiral (shot from inside a body this big, every projectile hit a melee hero:
300 life in half a second), no beam, and no generic 50% boss enrage (it cut the gaps between blows below 2 s and
summoned five, which is what kept auto-play dodging the third fight). Instead it enrages once, at the third fight:
x1.15 blows, attacks 12% faster, 10% faster on its feet.

## Files
- `src/game/regions/hunt.js`: the registry entry (words, portal and town lines, `load`, `ready`, `generate`,
  `createRun`, `intro`, `quest`, `winText`, `amb: 'dark_forest'`, `wilds: true` for the rain and night rolls).
- `src/world/hunt.js`: `generateHunt(depth, biome, seed)` builds the map, the trail legs (`gen.hunt.paths`, a point
  per tile), the clues, the props, the chests, the packs and the exit. It checks that every clue, ground, chest and
  the exit can be walked to from the camp (8 retries).
  Art: the Mountainside floor set (`mountainFloors()`), plus the Dark Forest pack's scatter and towering trees mixed
  with town-pack trees.
- `src/game/hunt.js`: `createHuntRun` (the run: `title`, `description`, `objective`, `update`, phases
  `track` / `fight` / `flee` / `done`) and `huntQuest` (Quest Log steps).
- `tools/tests/hunt.js`: covers the level gate (`hunt_gate_refused.png`), the skull word, 40 seeds (reachability, 3 clues a leg, blocked trail points, A* to
  the lair), the hunt in play (reading a sign, the gate at 75%, the flee, the blood trail, wounds carried, the next
  sign marked), screenshots (`hunt_*.png`), auto-play winning three hunts with no god mode (a level-10
  Paladin at Depth 9, a Wizard at Depth 60 and a Ranger at Depth 150, geared as `balance.js` gears them), and the phone
  layout.
  `node tools/tests/hunt.js [shots|noshots] [auto|noauto]`

Game.js, the Quest Log and auto-play read the region through `src/game/regions.js`. The only shared edits are the
generic `minLevel` gate: `regionNeeds` in `regions.js`, and its checks in `game.js` (`teleportToBiome`,
`openVelscourTeleport`, `confirmDungeon`, `enterDungeon`).

## Status
Playable from level 10, and auto-play wins it without god mode. `tools/tests/hunt.js` covers the gate (a level-9 hero
refused at the skull word, the list, `teleportToBiome` and a saved portal; level 10 gets in) and three auto-play hunts:
a level-10 Paladin at Depth 9 (~250 game s), a geared Wizard at Depth 60 (~160 s) and a geared Ranger at Depth 150
(~75 s). `flow.js` passes; `mountain.js`'s rules and HAIL VELSCOUR! list pass (its auto-play summit times out on
main too).

Tuning (November 3, 2026): a fresh hero sat at 48% for 900 s once the beast enraged. The causes were the generic boss
enrage at 50% (patterns every 1.8-2.9 s, five summons at once), its own summon pattern, cultists raising skeletons
without end, packs woken next to the hunting grounds, a nova/spiral point-blank, and archetypes up to 3x apart in
blows. Measured with balance.js-style heroes (level 10 at Depth 9, the best of 75 drops, +2 upgrades and gems), all
13 non-Barbarian runs across 10 classes won in 85-380 game s (fighting 30-160 s, dodging 2-28 s of it); Barbarians
won 6 of 8 (see Next). Geared heroes at Depths 60 and 150 won all eight runs in 70-180 s.

## Next
- A Barbarian loses about one hunt in four at level 10: while he channels (Whirlwind) auto-play never dodges
  (`dodgeDanger` returns at once on `p.channel`), so he stands in every stomp and runs out of potions. A generic
  auto-play fix (drop the channel for a strike about to land) would help every channeler, but was left alone here.
- Fewer packs in the woods now (about ten): tracking is quieter. Thin it back if it feels empty.
- Its own HUD panel (signs read, life). `hud.js` shows its objective panel only for the Sea of Sand, the forest and
  the Breach, so the hunt uses the boss bar and the Quest Log instead.
- Per-beast signs (a wyrm's scorch, a spider's webs) and a trophy item named after the beast.
- The lair could seal behind the hero for the last fight.
