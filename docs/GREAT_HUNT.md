# The Great Hunt (`great_hunt`)

One colossal beast per hunt, Monster Hunter gone gothic. You track it through its woods by its signs, wear it down
over three fights (each time it flees, bleeding, to the next hunting ground, and its wounds carry over), then corner it
in its lair and kill it. The kill opens the exit in the lair. One of the four new regions (docs/NEW_REGIONS.md).
You reach it from Velscour's skull with `hunt`, `great hunt`, `the great hunt` or `beast`.

## How it plays
- **The territory** is 96 x 96 tiles of dark woods. A winding game trail runs from the hunters' camp (the town portal)
  through three hunting grounds to the lair. Meadows open beside the trail, and five narrow game trails branch off to
  small glades. Two of those glades hold a dead hunter's cache with a chest. The route is randomized and turned one
  of four ways per seed.
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
  of the blood trail is painted at once.
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
Each beast is a `boss`-rank `makeMonster` at depth level + 2, with x2.2 a guardian's life, x1.25 its size and x3 its
XP. The regen, teleport and fast affixes are removed.

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
- `tools/tests/hunt.js`: covers the skull word, 40 seeds (reachability, 3 clues a leg, blocked trail points, A* to
  the lair), the hunt in play (reading a sign, the gate at 75%, the flee, the blood trail, wounds carried, the next
  sign marked), screenshots (`hunt_*.png`), auto-play winning a Depth 3 hunt, and the phone layout.
  `node tools/tests/hunt.js [shots|noshots] [auto|noauto]`

No shared file was edited: game.js, the Quest Log and auto-play read the region through `src/game/regions.js`.

## Status
Playable, and auto-play wins it. Everything in `tools/tests/hunt.js` passes, and `flow.js` still passes.

## Next
- A fresh level-1 hero at Depth 6 struggles. Once the beast enrages under 50%, auto-play dodges more than it hits.
  The test runs at Depth 3. Tune `BEAST_HP` or the gates if real heroes find it long.
- Its own HUD panel (signs read, life). `hud.js` shows its objective panel only for the Sea of Sand, the forest and
  the Breach, so the hunt uses the boss bar and the Quest Log instead.
- Per-beast signs (a wyrm's scorch, a spider's webs) and a trophy item named after the beast.
- The lair could seal behind the hero for the last fight.
