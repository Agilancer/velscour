# THE ENDGAME: Heresies, Abyssal Rifts, Velscour Unbound, Infernal Marks

What a hero does after Velscour falls (depth 500). Four systems, one unlock: **the Endgame opens for the whole browser
(every hero) the first time any hero slays Velscour for real** (not the skull's practice fight). Before that the altar
and the rift gate stand in town but refuse: *"Velscour still sits his throne."*

Tests: `tools/tests/heresies.js`, `rifts.js`, `unbound.js`, `marks.js`, `rift_balance.js` (model, no play), plus the
Marks columns in `endgame.js`. Data lives in `src/data/heresies.js`, `src/data/rifts.js`, additions to
`src/data/items.js` (the Abyssal rarity) and `src/data/relics.js` (Unbound Heirlooms). Account-wide state in
`src/game/endgame.js` (localStorage `velscour_endgame_v1`, and the signed-in player's Firestore document
`users/{uid}/account/endgame`).

## The shared record (`src/game/endgame.js`)
```
{ v: 1, unlocked: 0 | timestamp,                       // any hero slew Velscour
  marks: { pts: 0, xp: 0, spent: { life: 0, crit: 0, mf: 0, rift: 0 } },
  bests: { [classId]: { tier, time, at } },            // best Abyssal Rift per class on this account (shown offline)
  keysFound: 0, unboundWins: 0 }
```
API: `endgame()` (cached, like `reliquary()`), `saveEndgame()`, `resetEndgameCache()`, `endgameUnlocked()`
(record.unlocked, or the current hero's `c.cleared[FINAL_DEPTH]`), `unlockEndgame()` (called from
`game.buildDungeon`'s `onBossKilled` when `m.isVelscour && !world.practice && !world.unbound`), `mergeEndgame(a, b)`:
monotone, never loses anything: `unlocked` = earliest truthy, `marks.pts` = max (spent copied from the side with the
larger pts; ties: `a`; spent clamped to pts), `bests[cls]` = the higher tier (then the faster time), counters = max.
Cloud: `Cloud` pushes the record after a change (debounced 60 s, and on `flush`) and merges on every `sync` through two
new backend calls, `account(uid)` and `putAccount(uid, rec)`; `src/game/cloud.js` keeps its three-way rules for heroes
untouched. The fake backend in `tools/tests/cloud.js` gets the two calls too (`runTransaction` get/set on the path
`users/{uid}/account/endgame`).

## 1. Heresies (`src/data/heresies.js`, `src/game/heresies.js`, `src/ui/heresies.js`)
Difficulty modifiers the player switches on at the **Altar of Heresy** in Herrington Hollow (a dark obelisk beside the
plaza, `world.npcs` entry `{ altar: true, name: 'Altar of Heresy', use: () => Heresies.open() }`, drawn by `drawNpc` with
`obelisk()` from happenings.js in Velscour's red, a skull glow when any Heresy is on). They are the hero's (`c.heresy =
{ on: ['twins', ...] }`, migrate adds `{ on: [] }`), take hold from the next level built, and apply in standard depths,
the Endless Torment and the Eternal Breach. **Not** in Abyssal Rifts (the clock is the challenge and the honour board
must compare like with like) and not in Velscour Unbound. The Quest Log and the HUD's area subtitle show the rank.

| id | name | rank | what it does (where) |
|----|------|-----:|----------------------|
| twins | Twinned Packs | 3 | every pack spawns twice its number (`heresySpawns`: `n * 2` for packs, not raid/boss) |
| crowned | Crowned Champions | 2 | champions roll 2 extra affixes, uniques 1 (`heresyMonster`: `makeElite`'s affix keys) |
| thirst | Dry Throat | 3 | no potions of any kind (`Player.usePotion` refuses with "The Heresy forbids it"; auto-play never tries) |
| fifth | The Fifth Phase | 2 | BOSS ROOM bosses fight one phase more (`heresyRaid(raid)`: the next template phase, or Final Stand again, with a new mark) and roll one more modifier |
| legion | The Legion Follows | 3 | every ~45 s a hellgate opens near the hero and 2-4 Pit Demons/Imps climb out (the hazard from velscour.js `legion`, moved to `src/game/heresies.js legionGate(world, x, y, n, level)` and shared) |
| iron | Iron Hide | 2 | monsters +50% life |
| cruel | Cruel Hand | 3 | monsters +30% damage |
| ambush | Ambush Weather | 1 | ambush arrivals 3x as often (`mayhem.ambushTick` reads `world.heresyAmbush`) |
| omens | Black Omens | 1 | every omenable depth has an omen (the portal choice rolls one), and a Nemesis always returns |
| glass | Glass Cannon | 2 | the hero: -25% life, +15% damage (`heresyHero(c)` summed in `Player.recompute` like Defiance) |
| hunger | Hunger of the Abyss | 2 | no life or mana orbs drop, no life regeneration from gear or buffs |
| gaze | Velscour's Gaze | 2 | monsters notice the hero from 2.5x as far (`aggroRange *= 2.5`) and never lose him |

Rank = the sum of the ranks on (max 26). `heresyMods(rank)` → `{ mf: 4 * rank, gold: 1 + 0.04 * rank, loot: 1 +
0.02 * rank, xp: 1 + 0.02 * rank, sigil: 1 + 0.05 * rank, relic: 1 + 0.04 * rank }`. Where they land: `heresyWorld(world,
c)` runs after `greedWorld` in `buildDungeon` and `buildBreach` and multiplies `world.lootMul`, `world.goldMul`,
`world.mfAdd`, `world.xpMul`, `world.sigilMul` (new; `dropLoot` multiplies the Sigil odds and `maybeRelic`'s boost by it);
`world.heresy = { ids, rank }`. `heresyTick(world, dt)` (from `happeningsTick`, next to `greedTick`) marks every enemy as
it appears (`m._heresy`), applies iron/cruel/gaze/crowned, and runs the Legion clock. At rank >= 10 **Abyssal Keys** may
drop from BOSS ROOM bosses past depth 600 (below). Milestone text in the altar: rank 10 "the keys", 20 "+1 Mark per depth
cleared" (`grantMarks(1)` in `brokeThrough` when rank >= 20).

Altar panel (`Heresies.open()`, `UI.openPanel('heresies', ...)`, class `heresy-panel`, works on touch): one row per
Heresy (name, rank pips, description, toggle), the total rank and its rewards, the milestones, a warning that they take
hold from the next level, and the three endgame buttons (Rift gate, Velscour Unbound with the key count, Infernal
Marks). Locked before the Endgame: the panel says so and shows the list greyed.

## 2. Abyssal Rifts (`src/data/rifts.js`, `src/game/rifts.js`, `src/ui/rifts.js`, `src/game/leaderboard.js`)
Short timed dungeons. **Tier T is as deadly as Depth 500 + 10 T** (`riftDepth(T) = FINAL_DEPTH + 10 * T`,
`riftLevel(T) = depthLevel(riftDepth(T))`; tier 1: monster level 263, tier 50: 483, tier 100: 708). The **Abyssal Rift
gate** is a third portal in town (`world.portals` entry `{ rift: true, color: '#20e0ff', label: 'Abyssal Rift', use: () =>
game.confirmRift() }`) placed on the breach yard's road three tiles short of the purple portal (`t.rift` from
`generateTown`: the walkable tile nearest 3.2 tiles from `t.breach` toward the plaza). `c.rifts = { open: 1, best: 0,
cleared: {tier: times}, bestTime: {tier: secs}, runs: 0, fails: 0, deaths: 0 }` (migrate adds it).

The dialog (`game.confirmRift(tier)`, class `rift-dialog`): a tier select (1 .. `c.rifts.open`), each line "Tier 7 — as
deadly as Depth 570 (monster level 294) · best 4:12", the clock the hero gets, a warning when the monsters are more than 4
levels above the hero, and an **Honour Board** button (below). `game.enterRift(tier)` → `game.buildRift(tier, seed)`:
a random standard dungeon biome (`BIOMES` that are neither overworld, beta, challenge, tower nor cave; never the same
twice running), `generateDungeon(depth, biome, tileset, seed, { raid: true, small: true })` (new `opts`: `raid` forces
the arena, `small` clamps the chunk grid to 4 x 4, so a rift is a short maze and a BOSS ROOM); the `rank: 'raid'` spawn
is **not** placed at build. `world.rift = createRiftRun(world, gen, tier, { onWin, onFail })`:
```
run = { tier, t: 0, limit: riftTime(), progress: 0, quota, total, guardian: null, done: false, failed: false,
        label(), update(dt), kill(m), spawnGuardian() }
```
- `riftTime() = RIFT_TIME (420 s) + markBonuses().rift` (Haste Marks, below). The clock runs in `game.update` next to
  `happeningsTick` (`riftTick(w, dt)`), so menus pause it.
- Progress: `riftProgressOf(m)`: normal 1, champion 4, unique 8 (minions 1), summons/pit spawns 0; `quota = RIFT_QUOTA
  (0.7) * total` where total is summed over the build's spawns. `combat.kill` calls `riftKill(world, m)` next to
  `commissionKill`.
- At the quota: "THE GUARDIAN STIRS": `makeRaidBoss(world, gen.raid, depth, lvl + 3)` in the arena, `world.boss = m`,
  `world.raid = m.raid`, its `onDeath` chained to `riftWin`. The raid's own seal/execute rules stand.
- Timer out before the guardian dies: `riftCollapse`: "THE RIFT COLLAPSES", loot on the ground is lost, `c.rifts.fails++`,
  the hero is back in town after 2.5 s (no Defiance, the descent untouched); auto-play's `dest` stays `rift`, the tier
  stays open.
- Death: `game.riftDeath(src)` like `breachDeath` (no Defiance, `c.rifts.deaths++`, the death screen names the tier).
- Win: `time = run.t`, `jump = riftJump(time / limit)` (<= 0.5 → 3 tiers, <= 0.8 → 2, else 1), `c.rifts.open =
  max(open, tier + jump)`, `best`, `cleared[tier]++`, `bestTime[tier] = min`; `grantMarks(riftMarks(tier))` (`ceil(tier /
  4)`); the account record's `bests[cls]` and the Honour Board get the run when it beats the hero's best (higher tier, or
  the same tier faster). The exit opens; `game.riftExit(world, opts)` offers "On to Tier T+jump" / "Return to Town"
  (auto-play: on when `riftReady(next)`, else home). HUD: `#rift-bar` under the area name: `ABYSSAL RIFT · TIER 12 ·
  4:31 · 63%` (red under a minute), the guardian uses the boss bar.
- Guardian loot (`riftReward(tier, first)`, dropped by `riftWin` on top of the raid's own two `dropLoot`s): one gear item
  at item level `riftLevel + 2` of rarity **Abyssal** with chance `min(0.6, 0.1 + 0.02 * tier)` (the first clear of a tier:
  always), else Mythic (`rarityAt`); two Sigils (`rollSigil(depth, 1 + floor(tier / 10))`); gold; from tier 10 an
  **Abyssal Key** with chance `0.12 + 0.005 * tier`.

**Abyssal** is a seventh rarity in `RARITY` (`src/data/items.js`): `{ id: 6, name: 'Abyssal', color: '#20e0ff', weight: 0,
lv: 12, perks: 2, sockets: 5, bonus: 0, minIlvl: 200, fullIlvl: 200 }`: never rolled by `rollRarity` (weight 0), made by
`rollItem(ilvl, { rarity: 6 })`; `mfMul` gets a seventh entry; `css/style.css` `.r6`; `core/gearart.js` uses the Mythic
designs/finishes for it (`rarityName` falls back); the loot filter dialog lists it; `rarity.js` prints it. Worth about
17 item levels (Mythic 15).

Honour board (`src/game/leaderboard.js`, `Board`): Firestore `boards/{classId}/entries/{uid}` →
`{ v: 1, name, cls, tier, time, at, level, marks, build: { bar: [skill ids], gear: { slot: { name, rarity, ilvl, relic } } } }`,
written with the backend's new `putBoard(cls, uid, rec)` only when signed in and the run beats the account's best;
`Board.top(cls)` reads `board(cls)` (all entries, sorted tier desc / time asc on the client, top 50). The Honour Board
dialog (`Rifts.board()`): a class select, rows (rank, hero name, tier, time, level), a row opens the build; "Sign in with
Google in Settings to be listed" when signed out; the account's own best is always shown. It is an **honour** board: saves
are local, so a cheat can post anything; the build is recorded beside every entry. `firestore.rules` in the repo holds
the rules the project needs (public read of boards, writes by the owner only, field checks; the account document by its
owner only).

Auto-play: a third card in `askDest` (`'rift'`): "Abyssal Rift · Tier N"; `riftReady(T)` = `riftLevel(T) <= level + 2`,
`riftTier()` = the highest open tier the hero is ready for; in a rift it hunts everything, fights the guardian, takes the
exit (next tier when ready, else home to trade). It never chooses Heresies and never opens Velscour Unbound.

## 3. Velscour Unbound (`src/game/unbound.js`, additions to `src/game/velscour.js`, `src/data/relics.js`)
Three **Abyssal Keys** (`c.keys`, a counter; a ground item `GroundItem(x, y, 'key')` drawn as a cyan key glyph, picked
up by `Player.pickup` → `c.keys++`, `endgame().keysFound++`) open the rematch. They drop from BOSS ROOM bosses past depth
600 (chance `0.06 + 0.002 * (depth - 600)`, capped 0.25, only with Heresy rank >= 10) and from rift guardians (`0.12 +
0.005 * tier` from tier 10, capped 0.5). `keyChance(world, m)` (read by `loot.dropLoot`) rolls **once per boss** (`m._keyRoll`:
`dropLoot` runs three times for a BOSS ROOM boss), never for the court; `G.forceKey = true` (tests only) makes the key
certain wherever one can drop. A key on the floor never fades (the 120-s rule skips it) and auto-play walks to it.
`unboundReady(c)` = keys >= 3 and the Endgame unlocked. The altar panel and the skull's message box ("unbound") start it:
`game.enterUnbound()` spends the keys and builds the throne at `D = max(FINAL_DEPTH, c.depth)` with `G.unboundNext =
true` (consumed by `buildDungeon`: `world.unbound = true`, `world.practice = false`); `c.depth` is untouched; the hero is
set down in the arena like `finalBoss()` (the court's art is loaded with the level). In Unbound `onBossKilled` opens the
exit ('Exit — to town') but changes no `cleared`/`deepest` and shows no victory screen; the exit and the town portal lead
to town only. Death (`game.unboundDeath`): the death screen ("on Velscour's throne"), back to town, no Defiance, the
keys stay spent.

`setupVelscour(world, m, gen)` reads `world.unbound` and calls `setupUnbound(V)` which adds, on top of the five phases
(dials in `UNBOUND`, `src/game/unbound.js`):
- **The Court of the Abyss**: two of the signature raid bosses (`RAID_BOSSES` with `sigs: true` but the Pipe Organ, whose
  Danse Macabre wants a square hall: in the oval with its lava auto-play dodged it for 14 minutes; never the same two, never
  the last fight's pair: `c.unbound.court`) made by `makeRaidBoss(world, ARENA, depth, his level, { tpl, art, court: true,
  hp: 1.2, dmg: 0.8 })` over `ARENA = { x: 6, y: 4, w: 32, h: 27, cx: 22, cy: 17.5, gate: { x: -40, y0:
  -40, y1: -39 } }` (the gate off the map: their seal blocks nothing). The first steps out at the east guard post [31,
  13] when he rises (`begin`), the second climbs out of phase 3's first hellgate (the Legion's first call in Crown of
  Hellfire opens it instead). They run their own `Raid` loop awake from the start, with no execute clock (`execT =
  Infinity`) and no enrage (`enrage` is a no-op: his 20-minute clock is the only one), in three phases (their first, second
  and last: two ward interludes, not three), casting at 1/1.6 of their pace while he fights too (phases 1, 3, 5: both
  sets of hazards at once left auto-play no ground, Ser Valdric beside the lava lived 14 minutes); a courtier that strays
  out of the arena, or into phase 3's lava where a melee hero won't follow, for 1.5 s is set back at its post. In
  the Seals and the abyss the seals, their Wardens and the Heart Shards carry `raidPriority` 9-9.5 and the court drops its
  6 to 0, so auto-play breaks the timed objectives first (the courtier at hand used to win over a seal ten tiles off). Their `raid.onDeath` is replaced (`courtDeath`): wards and adds die, two
  `dropLoot`s, the hero's sunder/polarity multipliers reset, but `w.darkK` stays (the abyss owns the dark; in phase 4 it is
  held at 0.93 every frame). They are never `world.boss`/`world.raid` (the HUD shows him; they carry the life bars of any
  monster) and `onBossKilled` returns on `m.raid.court`. `raidPriority` 6: auto-play kills them first.
- **The Pact**: while a courtier lives Velscour takes 40% of every hit (`m.ward = 0.4`, cyan tethers from them to him; the
  boss bar shows it warded and "Pact: slay his court") **and his damage cap refills at 40% of its pace** (`unboundTick`
  drains 60% of the refill from `V.bank`; `absorb()`, `pace()` and `PACE` are untouched). Without the second half a hero
  far over the cap (2.5x it, as the test hero is) never felt the Pact: Velscour reached 80% while his first courtier lived.
- **Abyssal Crown**: APOCALYPSE leaves two safe circles instead of three; the abyss drifts four Heart Shards at -4% each.
- **Unbound Chains**: after the first binding breaks (at 10%) the life gate stops at 5%, where he binds himself to four
  fresh obelisks (`V.bound2`); only then can he die. In Unbound an obelisk holds 3.5% of his life (2% in the plain fight).
- His life x2.4 on top of `HP_MUL` (4.8), his hits x0.85 (instead of `DMG_MUL` 0.7), the clock 20 minutes
  (`V.enrageT`, the label's clock reads it); `PACE` as is. All dials are `UNBOUND` in `src/game/unbound.js`.

Measured (`node tools/tests/unbound.js autoonly [runs]`: auto-play, god mode, a paladin at level 259 in the best of 60
item level 262 drops a slot, +8, gems, from a fixed seed; `gear=5` the best of 5; `original` the plain fight): the plain
fight 5.0-6.2 minutes (it sits at the damage cap: 20% of his life in 45 s). Velscour Unbound as shipped: 6.2-12.8 minutes
(mean 7.6, median 6.9, 10 fights) for that hero, 8.3-13.5 (mean 10.1, 4 fights) for the weaker one; a courtier lives
35-260 s, mostly 50-100 s, two thirds of it in its two ward interludes; the long fights are a first courtier that a melee
hero struggles with (Ophaniel's gaze, Thessaly's trumpet: 200-340 s). On the way (about 90 fights): the brief's dials
(x1.3, court 0.55, four phases, the Pact on hits only) gave 8.0-16.6 (a third interlude, and a Pact that never bound a
hero over the cap); three phases alone 5.0-8.0; the Pact on the cap with the court at 1.25-2.2: 6.0-10.9 plus two
22-minute deadlocks (Valdric and the Organ in phase 3: fixed by the cast pace, the lava rule and leaving the Organ out);
x1.3 -> x2.4 and the 3.5% obelisks each added 0.3-0.5 minutes; court x1.6 instead of x1.2 only lengthened the tails.

On his death (`unboundSpoils`): the court falls with him (no loot), the usual hoard, plus **one Unbound Heirloom**
(`makeHeirloom(lvl, { unbound: true })`, one of the four) and, the first win always (`c.unbound.wins === 0` then) and
then one in four, **the Crown of the Demon Lord**, both open (never sealed); the Codex notes them on pickup.
`c.unbound = { wins, best (seconds), court }`, `endgame().unboundWins++`.

| Unbound Heirloom | slot | power |
|---|---|---|
| Crown of the Demon Lord (`crown_demon`, only by its id) | head | `demonlord`: +2 All Skills, +25% damage to bosses; a Pit Demon of the Legion (a permanent summon, `relicprocs.js pitDemon`) climbs out of a hellgate at the hero's first blow, cast or wound in a level, follows him from level to level, hits for 60% of his recent hit, leaves when the Crown does, returns 20 s after it falls |
| The Abyssal Edge (`abyssal_edge`) | weapon (sword) | `abyssal_edge`: hits have a 15% chance to tear a void rift at the target for 200% of the hit as Shadow (proc fx `void`) |
| Mantle of the Unbound (`mantle_unbound`) | body | `unbound_mantle`: 12% damage reduction; immune to the abyss's dread (legendary flag `dreadless`) |
| Seal of the Pit (`seal_of_the_pit`) | ring | `pit_seal`: +1 Pierce, +20% critical damage; slain demons heal 2% (proc `only: 'demon'`) |
| Heart of the Abyss (`heart_of_the_abyss`) | offhand (orb) | `abyss_heart`: +15% damage; casts have a 10% chance to drop three meteors (proc fx `stars`, `n: 3`) |

All five have `unbound: true` (minIlvl 250, lines worth ~4.6-4.7 core lines, rings 2.9): `makeHeirloom` leaves them out
unless `opts.unbound` (the Crown, `crown: true`, only by `opts.id`), so `maybeRelic` never makes one; `CODEX_TOTAL.h`
counts them (41).

## 4. Infernal Marks (`src/game/marks.js`, `src/ui/marks.js`)
Account-wide, endless. A Mark is earned by **XP past the level cap** (`Player.gainXp` at `MAX_LEVEL` hands the XP to
`gainMarkXp(xp)`; one Mark costs `MARK_XP = xpToNext(MAX_LEVEL)`), by **rift clears** (`riftMarks(tier)`) and at
**Heresy rank 20** (one per depth cleared). Four categories, points spent one at a time in the Marks panel (from the
altar, the character sheet's "Marks" button and the skull's "marks"); "Spend all (balanced)" and a free "Reset".
Bonuses diminish, so the Endless Torment wall holds: `eff(n) = 100 * (1 - 0.993 ** n)` (50 at 100 points, 75 at 200,
97 at 500, never 100) and
```
life +0.3% x eff (<= +30% life)    crit +0.1 x eff (<= +10% crit chance)
mf   +0.5% x eff (<= +50% magic find)   rift +0.6 s x eff (<= +60 s on the rift clock)
```
`markBonuses()` → `{ life, crit, mf, rift }`; `Player.recompute` adds life and mf with the Defiance bonus and crit to
`critChance`; `riftTime()` adds rift. The character sheet shows "Infernal Marks: 37 (12 free)"; the panel shows each
category's points, its bonus now and at the next point. `grantMarks(n, why)` logs. Unspent Marks sit in `pts - sum(spent)`.
Cloud: in the account record (above), merged by max.

## Balance targets (checked by the tests and tools)
- Heresies at full rank (26): x1.52 loot, +104% magic find, +52% XP; a normal with Iron Hide + Cruel Hand takes ~4.5 s and
  hits for ~1.3x; Twinned Packs double the crowd. `heresies.js` measures a depth-520 level: monsters, affixes, dials.
- Rifts (`rift_balance.js`, the endgame.js model): a geared hero of its level clears tier T's quota in 3-5 minutes and the
  guardian in 1-2, so a tier at the hero's level fits the 7-minute clock with time to spare, and tiers 6-10 levels above
  the hero do not. `rifts.js`: auto-play clears tier 1 at depth-500 gear in god mode in under the limit.
- Marks: a hero at the cap with 300 Marks (+~26% life) at depth 1200: a normal's hit still 15%+ of life, BOSS ROOMs
  still ~550 s (`endgame.js` prints a "marks" column).
- Unbound: `unbound.js` steps every phase and auto-play wins at depth 500 in god mode in 7-12 minutes (measured 6.2-13.5,
  mean 8.3 over 14 fights; the plain fight 5-6).
