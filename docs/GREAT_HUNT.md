# The Great Hunt (`great_hunt`)

One colossal beast per hunt, Monster Hunter gone gothic. You track it through its territory by its signs, wear it down
over three fights (each time it flees to the next hunting ground, and its wounds carry over), then corner it in its
lair and kill it. The kill opens the exit in the lair. One of the four new regions (docs/NEW_REGIONS.md).
You reach it from Velscour's skull with `hunt`, `great hunt`, `the great hunt` or `beast`, **from level 10**
(the user's rule; `minLevel: 10` in the registry). Below it the skull word, `teleportToBiome` and a saved portal refuse
with one line from Velscour ("LEVEL 9? ADORABLE. Come back at level 10. The Great Hunt does not hunt snacks."), and
the HAIL VELSCOUR! list shows it and its five lands greyed out with "Reach level 10".

## The five lands
Each level rolls one of five territories (`HUNT_LANDS` in `src/data/huntlands.js`), never the one seen last; the skull
word plus a number, id or name piece picks one (`hunt 3`, `hunt fen`), and so does the HAIL VELSCOUR! list. Each land
has its own ground and cover, its own signs and their lines, its own quarry and brood, its own packs, and a twist.
Existing art only: the town pack, the Dark Forest pack and trees, the Sea of Sand pack, the Mountainside's floors and
height-map terrain, recoloured where needed (`src/gfx/huntart.js`).

| # | Land (`id`) | Ground and cover | Quarry (brood) | Twist |
|---|---|---|---|---|
| 1 | The Black Wood (`wood`) | the Mountainside's forest floors; Dark Forest towering trees and town trees | The Moon-Eater, Old Tuskfather (hounds), The Thornback (beetles), The Brood Duchess, The Gallows Oak (spiders) | none: the classic hunt |
| 2 | The White Waste (`tundra`) | snow, drifts, ice, tracks in the snow (Dark Forest floors bleached); frost firs, wind pines, frosted pines and boulders, sparse | Frostmane, The Blizzard Woolback, Rimefork (wolves), The Glacier Crown (elementals) | **blizzard**: between fights, squalls (10-14 s every 22-32 s) white out the land, hide the marked sign and cover half of the blood it sheds; never during a fight |
| 3 | The Drowned Fen (`fen`) | bog water and black pools as the cover, a causeway of stepping stones, peat, clay and reeds; willows, cypresses, reeds | The Fen Trident, The Bloodcrest (spiders), The Bogwood Devourer, The Mire Mother (shroomfolk), The Leech Crown (worms) | **mire**: 12-16 green poison pools beside the trail and round the hunting grounds' rims (`Area` hazards, the beast's poison), never on the trail; they go when it dies |
| 4 | The Red Badlands (`badlands`) | the Sea of Sand's ground (dune sand, hardpan, wadis, caravan ruts) walled by its modular sandstone cliffs; acacias, snags, salt spires | The Hundred-Legged King, The Iron Crab (scorpions), The Scarab Emperor (beetles), The Cinder Beast (imps) | **burrow**: it lies invisible under the sand and erupts when you come close; reading any sign makes the sand bulge under you (a telegraphed eruption, 1.1 s to step off); it flees by diving, leaving a seam of churned sand and blood |
| 5 | The Storm Crags (`crags`) | a height map: the trail climbs from the camp to a lair on the snowy peak, the rock in the Mountainside's cliffs above it; hardy pines, boulders, cairns | The Rotwing Queen, The Ashen Phoenix (bats), Blackhorn, The Amethyst Crown (imps), The Storm Drake (gargoyles) | **wings**: it flees by air, straight over the rock to the next ground and at last its peak |

Every land keeps the same trail shape (camp, three grounds, a lair, three signs a leg, spurs to two caches) so the
hunt's rules, the gate and auto-play work the same in all five; the Fen's trail is a narrower causeway, the
Badlands' a wider wash, the Crags' more winding. The Crags' heights: every open tile takes its place along the trail
(the lair 84 levels up), the clearings flat, no two open neighbours more than 3 levels apart (under the 4-level hop,
so it walks as a slope: `smoothField`), and the rock stands 10-44 levels above the open ground beside it.
Each land sets its light, fog, blood, drift (snow, spores, sand, ash), ambience and odds of rain and night (`look`,
and `WEATHER` in `src/game/regions/hunt.js`, read by game.js through `gen.variant.look`); the land's name is the
level's banner and HUD title.

## How it plays
- **The territory** is 96 x 96 tiles. A winding game trail runs from the hunters' camp (the town portal) through three
  hunting grounds to the lair. Open ground lies beside the trail, and five narrow game trails branch off to small
  glades. Two of those glades hold a dead hunter's cache with a chest. The route is randomized and turned one of four
  ways per seed. Packs (about ten, of the land's own archetypes) keep 15 tiles from every hunting ground and the lair,
  so a dodge out of a stomp doesn't wake one, and there are no ambushes (`world.ambushT = Infinity`); cultists here
  raise no skeletons (their `summoner` is cleared each second: one long fight piled up 100+ of them).
- **Signs**: each of the four legs has three clues on the trail, of the land's kinds (a kill, claw marks, tracks in the
  snow, a wallow, a sinkhole, a wrecked cart, a giant feather, its blood...), each with its props and one short line.
  Only the next sign is marked (the objective glyph, label "A sign"). Walking up to a sign reads it. After a leg's
  last sign, the ground is marked ("The beast" / "Its lair").
- **Encounters**: the beast waits asleep on its ground and wakes when you come close. A banner shows its name with
  "It turns to fight", "Wounded, and angrier", "It will not run far" or "Cornered in its lair". From the second
  fight on, its brood joins in (2, 3, then 4 monsters of one archetype).
- **The flee**: it runs at 75%, 50% and 25% of its life. A life gate (`m.vel.absorb`, the same hook as
  Velscour's) holds its life at the mark, so one huge hit can't end the hunt early. It roars, becomes
  untargetable, and runs down the next leg at 7.5 tiles a second (burrows, or flies), dripping blood as it goes. Once
  it is 24 tiles from the hero (or it arrives), it parks on the next ground, asleep, with the life it had. The rest
  of the trail is painted at once. Where it stood lies a dead hunter's satchel: two healing potions and a
  rejuvenation (four fights and no town between them).
- **The lair**: there is no gate. It fights to the death. The kill drops a trophy (an Epic, or a Legendary half
  the time) on top of the boss's own loot, and opens the exit at the back of the lair.
- **The boss bar** shows its life all hunt long, with a line under it: "Wounded 25% · runs at 50%",
  "Fleeing · follow the blood" (or "Burrowing · follow the seam", "On the wing · climb after it") or "Cornered".

### The beasts
Lone giants of the existing bestiary (set 2's titans, colossi and dragons), no new art, listed per land in
`src/data/huntlands.js` (`HUNT_BEASTS` in `src/game/hunt.js` gathers all 23). The pick is one of the land's, never
the last one (`c.lastHunt`); tests can force one with `G.huntBeast = '<id or art>'`. The Sea of Sand's own bosses are
not used: their sprites come from its pack, which game.js lets go after the build (they drew as the pixel fallback).
Each beast is a `boss`-rank `makeMonster` at depth level + 2 (`depthLevel`), with x1.6 a guardian's life
(`BEAST_HP`), x0.8 its blows (`BEAST_DMG`), x1.25 its size and x3 its XP. Life and blows are pulled toward the middle
by archetype (life x(1.4/hp)^0.25, blows x(1.2/dmg)^0.6), so an abomination (x2.0 blows) and a spider (x0.6) are about
as hard as each other. The regen, teleport and fast affixes are removed.
Its blows are a beast's: stomp, charge, a fan of spines, thrown boulders (`slam`, `charge`, `volley`, `meteor`). No
summons (the brood is its help), no nova or spiral (shot from inside a body this big, every projectile hit a melee hero:
300 life in half a second), no beam, and no generic 50% boss enrage (it cut the gaps between blows below 2 s and
summoned five, which is what kept auto-play dodging the third fight). Instead it enrages once, at the third fight:
x1.15 blows, attacks 12% faster, 10% faster on its feet.

## Files
- `src/data/huntlands.js`: the five lands (look, floors, roster, cover, clue props and lines, dressing, beasts, twist).
- `src/game/regions/hunt.js`: the registry entry (words, `minLevel`, `variants`, portal and town lines, `load` (the
  Sea of Sand pack for the Badlands), `ready`, `generate` (sets `gen.variant` for the banner and weather), `createRun`,
  `intro`, `quest`, `winText`, `amb`, `wilds: true` for the rain and night rolls).
- `src/world/hunt.js`: `generateHunt(depth, biome, seed, land)` builds the map, the trail legs (`gen.hunt.paths`, a
  point per tile), the clues, the props, the chests, the packs, the Fen's pools, the Badlands' cliffs, the Crags'
  heights (`liftCrags`) and the exit. It checks that every clue, ground, chest and the exit can be walked to from the
  camp (8 retries).
- `src/gfx/huntart.js`: the floor sets (`huntFloors`: the Mountainside's, the tundra's and the fen's recoloured from the
  town and Dark Forest floors, the Sea of Sand's) and `frost` (frosted copies of props).
- `src/game/hunt.js`: `createHuntRun` (the run: `title`, `description`, `objective`, `update`, phases
  `track` / `fight` / `flee` / `done`, and the four twists) and `huntQuest` (Quest Log steps).
- `tools/tests/hunt.js`: the level gate (`hunt_gate_refused.png`; `hunt` and `hunt 3`, the list's six options), the
  skull word (`hunt fen` builds the Fen), every land's data, every land over 20 seeds (reachability with the hop rule,
  3 clues a leg, blocked trail points, A* to the lair; the Crags' slope and peak, the Fen's pools off the trail, the
  Badlands' cliffs), every land in play (a sign, the gate at 75%, the flight and its trail, wounds carried, the
  satchel, and its twist), screenshots `hunt_<land>_{camp,sign,fight,flee,lair,overview}.png` (+ `hunt_tundra_blizzard`),
  auto-play with no god mode (a level-10 hero at Depth 9 on each land, a geared Wizard at Depth 60 and a geared Ranger
  at Depth 150, geared as `balance.js` gears them), and the phone layout.
  `node tools/tests/hunt.js [shots|noshots] [auto|noauto] [lands]`

Game.js, the Quest Log and auto-play read the region through `src/game/regions.js`. The only shared edits are the
generic `minLevel` gate: `regionNeeds` in `regions.js`, and its checks in `game.js` (`teleportToBiome`,
`openVelscourTeleport`, `confirmDungeon`, `enterDungeon`).

## Status
Five lands, playable from level 10, and auto-play wins every one without god mode. `tools/tests/hunt.js` passes
(November 3, 2026): level-10 heroes at Depth 9 won the Wood (Paladin, 125 game s), the Waste (Necromancer, 167 s), the
Fen (Wizard, 230 s), the Badlands (Ranger, 207 s) and the Crags (Death Knight, 162 s); a geared Wizard won the Waste at
Depth 60 (249 s) and a geared Ranger the Crags at Depth 150 (94 s). Eight more level-10 runs (Barbarian, Gunner, Bard,
Lancer, Slime Lord, Astronomer, Paladin, Dragoon over all five lands) all won in 138-282 s. `flow.js` passes.

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
- The Sea of Sand's own bosses (the Dune Wyrm, the Red Queen) would suit the Badlands; game.js would have to keep the
  Sea of Sand pack for a region that asks (like `castleArt`).
- The blizzard only dims the light and drives snow past the camera; a white fog layer would sell it better.
- Fewer packs now (about ten): tracking is quieter. Thicken it if it feels empty.
- Its own HUD panel (signs read, life). `hud.js` shows its objective panel only for the Sea of Sand, the forest and
  the Breach, so the hunt uses the boss bar and the Quest Log instead.
- A trophy item named after the beast. The lair could seal behind the hero for the last fight.
