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
`game.buildDungeon`'s `onBossKilled` when `m.isVelscour && !world.practice && !world.unbound`),
`mergeEndgame(local, cloud, base)`: never loses anything. `base` is the record this device last synced (`st.endBase` in
`velscour_cloud_v1`; null on a first sign-in). Counters (`marks.pts`, `keysFound`, `unboundWins`) = the base plus what
each side earned since it (no base: the larger), never below either side or the base; `marks.spent` = each side's
change since the base per category (only one side changed: that side's), this device's if the sum passes the Marks, a
side with fewer Marks than the base counts as damaged (its spending ignored), no base: the larger side's; `marks.xp`
the larger; `unlocked` = earliest truthy; `bests[cls]` = the higher tier (then the faster time); everything sanitised and
spending clamped to the Marks by `fixEndgame`. `saveEndgame(quiet)`: quiet (XP towards a Mark only) skips the listeners.
Cloud: `Cloud` pushes the record after a change (debounced 60 s, and on `flush`) and merges on every `sync` through two
new backend calls, `account(uid)` and `putAccount(uid, rec, expect)` (a transaction that writes only if the document
still holds `expect`, else the sync reads and merges again); the base becomes what was read, then the merge once it is
written; sign-out clears it and keeps the local record. Rules and cases in docs/CLOUD_SAVES.md; `src/game/cloud.js` keeps
its three-way rules for heroes untouched. The fake backend in `tools/tests/cloud.js` gets the two calls too (`runTransaction` get/set on the path
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
| legion | The Legion Follows | 3 | every 40-55 s (the first after 25-40) a hellgate opens in the hero's sight, on ground joined to him, and 2-4 Pit Demons/Imps (level `depthLevel(depth) - 2`, the first a champion, at most 8 alive) climb out (the hazard from velscour.js `legion`, moved to `src/game/heresies.js legionGate(world, near, n, level, opts)` and shared). Its clock stands still while a guardian or BOSS ROOM boss is awake. Runs from `game.update` (`heresyTick`), so the Breach has it too |
| iron | Iron Hide | 2 | monsters +50% life |
| cruel | Cruel Hand | 3 | monsters +30% damage |
| ambush | Ambush Weather | 1 | ambush arrivals 3x as often, the first wait too (`mayhem.ambushTick` reads `world.heresyAmbush`; like every ambush, not in BOSS ROOMs or the Breach) |
| omens | Black Omens | 1 | every omenable depth has an omen (the portal choice rolls one), and a Nemesis always returns |
| glass | Glass Cannon | 2 | the hero: -25% life, +15% damage (`heresyHero(c)` summed in `Player.recompute` like Defiance) |
| hunger | Hunger of the Abyss | 2 | no life or mana orbs drop from any source (kills, the Feeding Frenzy omen: `heresyWorld` filters `world.addLoot`), no life regeneration from gear or buffs |
| gaze | Velscour's Gaze | 2 | monsters notice the hero from 2.5x as far (`aggroRange *= 2.5`; a raid boss's 0 stays 0) and, once awake, never lose him (`m.gaze`: `Monster.pickTarget` tracks him anywhere, like a hunter) |

Rank = the sum of the ranks on (max 26). `heresyMods(rank)` → `{ mf: 4 * rank, gold: 1 + 0.04 * rank, loot: 1 +
0.02 * rank, xp: 1 + 0.02 * rank, sigil: 1 + 0.05 * rank, relic: 1 + 0.04 * rank }`. Where they land: `heresyWorld(world,
c)` runs after `greedWorld` in `buildDungeon` and `buildBreach` and multiplies `world.lootMul`, `world.goldMul`,
`world.mfAdd`, `world.sigilMul` and `world.relicMul` (new; `dropLoot` multiplies the Sigil odds and `maybeRelic`'s boost
by them; the Sigil odds also carry `lootMul`, so x3.5 at rank 26); XP is paid per monster (`m.xp *= M.xp` in
`heresyMonster`, nothing reads a world XP dial). `world.heresy = { ids, rank }` is set by `heresyBegin` before the monsters
are made (BOSS ROOM bosses read it), `null` in rifts and Unbound. `heresyTick(world, dt)` (from `game.update`, after
`riftTick`, wherever `world.heresy` is set) marks every enemy as it appears (`m._heresy`, once: iron/cruel never
compound), applies iron/cruel/gaze/crowned and the XP, and runs the Legion clock. At rank >= 10 **Abyssal Keys** may
drop from BOSS ROOM bosses past depth 600 (below). Milestone text in the altar: rank 10 "the keys", 20 "+1 Mark per depth
cleared" (`grantMarks(1)` in `brokeThrough` when rank >= 20).

Altar panel (`Heresies.open()`, `UI.openPanel('heresies', ...)`, class `heresy-panel`, CSS `.hx-*`): the rank with a
bar (ticks at the milestones) and its rewards as chips, a note that they take hold from the next level (inside a level
built with another set it says the changes wait), one row per Heresy (the whole row is a switch: name, rank pips,
description), the milestones, "Renounce all", and the three doors (Abyssal Rift `game.confirmRift()`, Velscour Unbound
`game.enterUnbound()` with the key count, disabled under three keys, Infernal Marks `G.ui.marks.open()`). A toggle
autosaves. On a touch screen: one column, 50x28 switches, 48 px doors, the body scrolls. Locked before the Endgame: the
panel says so, the list is greyed and disabled, the rift door too. The altar itself is `t.altar` from `generateTown`
(a reachable tile about 5.5 tiles from the plaza's centre), an obelisk grey while locked, red once open, glowing while a
Heresy is on.

Where they stop: Ambush Weather has no effect in BOSS ROOMs or the Breach (`ambushTick` skips them); **Black Omens only
reaches omenable depths (below 500)**: `setupHappenings` returns early from Depth 500 on and `omenable` is false there, so
in the Endless Torment it is a rank point for nothing (proposal, not applied: let Black Omens past the `depth >=
FINAL_DEPTH` return in `setupHappenings` for the omen block alone, and `portalChoice` roll one past 500 when it is on).

Measured (`tools/tests/heresies.js balance` / `each`, a paladin geared for Depth 521 like `balance.js` BAL_GEAR 8, headless
SwiftShader on a shared 4-CPU box, so timings are rough; ranges over 4 runs): a depth-520/521 level holds 586-675
monsters, **1,013-1,435 with Twinned Packs** (a seeded level: exactly x2 pack monsters); champions carry 2 affixes (4 with
Crowned), uniques 3 (4); the build takes 70-210 ms either way. `game.update()` per frame standing at the start: 1.7-2.8 ms
without, 2.4-5.9 ms with Twinned Packs (x1.1-2.4: it follows the monsters awake and fighting near the hero, sleeping ones
cost almost nothing); under auto-play 2.8-3.3 ms vs 3.6-4.8 ms (x1.1-1.6), and all twelve 3.8-6.6 ms (x1.2-2.4: Velscour's
Gaze wakes up to ~300 monsters that then all chase the hero). God-mode auto-play's first 25 kills: 8-25 s without, 7-38 s
with Twinned Packs, 4-36 s under all twelve (the level matters more than the Heresies; Gaze brings the packs to it).
Without god mode, 60-90 s on a fresh level: no Heresy lived every run (lowest life 4-94%), every single Heresy lived but
one Crowned Champions run (died once in two), all twelve died in 2 of 4 runs (18 s, 57 s; lowest life 66% when it lived).
Rank 26 is not for the hero's own depth; a few ranks are. Auto-play's 3-minute soak from a new wizard with Twinned Packs,
Dry Throat, Iron Hide, Gaze and the Legion (rank 13) at Depth 1: 2 deaths, 26 kills (none, 74 kills without).
If the frame cost matters on phones, the caps to try (not applied): Twinned Packs as `n: Math.min(s.n * 2, s.n + 6)`, and
Gaze's "never loses him" for the 60 nearest awake monsters only (the rest forget him past 30 tiles as before).

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
600 (chance `0.06 + 0.002 * (depth - 600)`, capped 0.25, only with Heresy rank >= 10) and from rift guardians (above).
`unboundReady(c)` = keys >= 3 and the Endgame unlocked. The altar panel and the skull's message box ("unbound") start it:
`game.enterUnbound()` spends the keys and builds the throne at `D = max(FINAL_DEPTH, c.depth)` with `G.unboundNext =
true` (consumed by `buildDungeon`: `world.unbound = true`, `world.practice = false`); `c.depth` is untouched; the hero is
set down in the arena like `finalBoss()`. In Unbound `onBossKilled` opens the exit but changes no `cleared`/`deepest`; the
exit and the town portal lead to town only.

`setupVelscour(world, m, gen)` reads `world.unbound` and calls `setupUnbound(V)` which adds, on top of the five phases:
- **The Court of the Abyss**: two of the twenty signature raid bosses (`RAID_BOSSES` with `sigs: true`, never the same
  two) made by `makeRaidBoss(world, arena, depth, level, { tpl })` with an arena rect over the ellipse (`{ x: 6, y: 4, w:
  32, h: 27, cx: 22, cy: 17.5, gate: { x: 22, y0: 31, y1: 32 } }`); their life x0.55 and damage x0.8 of a BOSS ROOM's.
  The first stands at the east guard post when the fight begins (phase 1), the second steps out of the hellgate at
  Crown of Hellfire (phase 3). They use their own `Raid` loop; `Raid.seal` is skipped for them (`opts.court = true`).
- **The Pact**: while a court boss lives Velscour takes 60% less damage (`m.ward = 0.4`; the boss bar shows it warded).
- **Abyssal Crown**: APOCALYPSE leaves two safe circles instead of three; the abyss drifts four Heart Shards.
- **Unbound Chains**: the obelisks at 10% come back once (a second binding at 5%).
- HP_MUL x1.3 on top (2.6), DMG_MUL 0.85, `ENRAGE_T` 20 minutes; `PACE` as is (life gates keep it 7-12 minutes).
- Auto-play: the court bosses carry `raidPriority` so it kills them first; the hazards publish danger/safeAt/autoGoal as
  before.

On his death (`onDeath`, Unbound): the usual hoard, plus **one Unbound Heirloom** (`makeHeirloom(lvl, { unbound: true
})`) and, the first win always and then one in four, **the Crown of the Demon Lord**. Both are Heirlooms with `unbound:
true` in `HEIRLOOMS` (never from `maybeRelic`; they count in the Codex): the Crown (`crown_demon`, head slot, minIlvl 250,
power `demonlord`: +2 All Skills, +25% damage to bosses, and a Pit Demon of the Legion fights for you) and four more
(weapon `abyssal_edge`, body `mantle_unbound`, ring `seal_of_the_pit`, offhand `heart_of_the_abyss`). `c.unbound = {
wins: 0, best: 0 }` (seconds), `endgame().unboundWins`.

## 4. Infernal Marks (`src/game/marks.js`, `src/ui/marks.js`)
Account-wide, endless. A Mark is earned by **XP past the level cap** (`Player.gainXp` at `MAX_LEVEL` hands the XP,
after the out-levelling penalty, to `gainMarkXp(xp)`; one Mark costs `markXp() = xpToNext(MAX_LEVEL)` = 204,707,941;
the 599 -> 600 level's spare XP counts), by **rift clears** (`riftMarks(tier)`) and at **Heresy rank 20** (one per
depth cleared). A Mark is saved at once (a float text "+1 INFERNAL MARK" over the hero, a ring, a chime and a log
line); XP alone at most every 5 s and on `game.autosave` (`saveMarkXp`), so nothing is lost to a reload. At the cap
the HUD's XP bar turns ember red and shows the progress to the next Mark (`capXp(c)`), and so does the character
sheet's XP line. Four categories, points spent one at a time in the Marks panel (from the
altar, the character sheet's "Marks" button and the skull's "marks"); "Spend all (balanced)" and a free "Reset".
Bonuses diminish, so the Endless Torment wall holds: `eff(n) = 100 * (1 - 0.993 ** n)` (50 at 100 points, 75 at 200,
97 at 500, never 100) and
```
life +0.3% x eff (<= +30% life)    crit +0.1 x eff (<= +10% crit chance)
mf   +0.5% x eff (<= +50% magic find)   rift +0.6 s x eff (<= +60 s on the rift clock)
```
`markBonuses()` → `{ life, crit, mf, rift }`; `Player.recompute` adds life and mf with the Defiance bonus and crit to
`critChance` (inside the 75 clamp); `riftTime()` adds rift. Measured (`marks.js`): 100 points = +15.14% maxHp, +5.05
crit, +25.23 MF, +30.28 s; 500 Vitality = +29.11%. The character sheet shows "Infernal Marks: 37 (12 free)" and an
"Infernal Marks" button; the Quest Log a line; the panel (`ui/marks.js`, two columns on touch) shows the total, the free
count, the XP towards the next Mark, and per category its points, bonus, a bar of the cap reached, +1/+5/+25, then
"Spend all (balanced)" and "Reset (free)". `grantMarks(n, why)` logs. Unspent Marks sit in `pts - sum(spent)`.
Cloud: in the account record (above), merged three ways so Marks earned on two devices add up.
Rate (`marks.js`, a level-600 hero full-clearing a level): 0.04 Marks per depth at depths 1000-1200 (he out-levels the
monsters: XP x0.1), 0.33 at 1240, 0.5 at 1260 (monster level 600), 0.67 at 1400; Heresy rank 20 adds 1 per depth; a
rift clear `ceil(tier / 4)` (tier 70, as deadly as depth 1200: 18).

## Balance targets (checked by the tests and tools)
- Heresies at full rank (26): x1.52 loot, +104% magic find, +52% XP, Sigils x3.5 (x2.3 x the x1.52 loot), relics x2.04;
  a normal with Iron Hide + Cruel Hand takes ~4.5 s and hits for ~1.3x; Twinned Packs double the crowd. `heresies.js`
  measures a depth-520 level: monsters, affixes, dials, frame cost, auto-play's kill pace, survival (above).
- Rifts (`rift_balance.js`, the endgame.js model): a geared hero of its level clears tier T's quota in 3-5 minutes and the
  guardian in 1-2, so a tier at the hero's level fits the 7-minute clock with time to spare, and tiers 6-10 levels above
  the hero do not. `rifts.js`: auto-play clears tier 1 at depth-500 gear in god mode in under the limit.
- Marks (`endgame.js paladin,wizard 8 marks=0,300,1000,1000L`: the same geared heroes measured at each count): at
  depth 1200, 300 Marks spent balanced (+12.3% life, +4.1 crit) give life x1.11-1.12 and a BOSS ROOM in x0.95-0.99 of
  the time; 1000 (+24.8%, +8.3) life x1.22-1.25, ROOM x0.91-0.99; 1000 all on Vitality life x1.26-1.30, ROOM x1.00.
  The wall is the kill time (ROOM ~460-560 s at 1200) and it holds. A normal's hit is 3-5% of a capped hero's life
  even with no Marks (2-4% with 1000), so "15%+ of life" was never the baseline; Marks cut it by at most a fifth.
- Unbound: `unbound.js` steps every phase and auto-play wins at depth 500 in god mode in 7-12 minutes.
