# VELSCOUR DEFENSE

A second game in the VELSCOUR universe: a free-to-play (no purchases of any kind) character tower defense with
Rift Card packs, modelled on the mobile game **Fantasica** (Silicon Studio / DeNA Mobage, 2011-2018) and drawn in
VELSCOUR's isometric pixel art. You reach it through **the Riftgate**, a blue-black portal across the square from
the dungeon portal in Herrington Hollow, or directly at `defense/index.html`.

## Kept apart from the main game
- Everything lives in `defense/`: its own page (`defense/index.html`), stylesheet, modules (`defense/src/`), data,
  tests (`defense/tests/`) and tools (`defense/tools/`). It never imports a main-game module.
- It reads VELSCOUR's **art and sound files** in `assets/` (read only). The few things it needs from the main game's
  `src/data/` (class names and colours, the 69 palette finishes, each class's held-gear sets and design names, the
  690 painted monsters, 400 of the Bard's 2,000 two-bar melodies) are snapshotted into `defense/data/art_index.json` by
  `node defense/tools/art_index.mjs` (re-run it when the main game adds classes, finishes, held designs, monsters).
- Its own save, `localStorage['velscour_defense_v1']`; the main game's `velscour_saves_v1` / `velscour_settings_v1`
  are never touched.
- The main game's only changes: `src/gfx/riftgate.js` (where the Riftgate stands, how it is drawn), two lines in
  `src/game/game.js` (`enterTown` adds it as `world.portals[1]`, after the dungeon portal that auto-play uses, and
  `confirmRiftgate`), one line in `src/game/render.js` (`drawPortal` hands `p.riftgate` to `drawRiftgate`), and the
  test `tools/tests/riftgate.js`.

## What Fantasica gave it (research: 5 gameplay videos, the Fantasica wiki, Gamezebo, Siliconera)
- One fixed screen per battle, a visible road, monsters entering from rift tears and walking to what you defend.
- Heroes are **towers**: no life bars, nothing blocks, the horde walks past them; melee heroes are short-range and
  hit hard, ranged reach far, magic splashes. Most melee heroes cannot hit flyers (Fantasica's Land/Air split).
- **Unit Pts** (here *Valor*): a regenerating budget that pays to deploy, plus a per-stage **Deploy Limit**.
- Placement is **tap a post, see the range circle, confirm** (or tap a hero, then a post).
- **Call Ally** becomes the **Rift Ally**: a guest hero each stage, outside the Deploy Limit.
- Skills fire on their own; stages score by **% of the horde destroyed** ("Complete Victory!" at 100%).
- A free pack every day, published odds, a pity counter; duplicates strengthen what you have.
- Left out on purpose: paid currency, paid-only items, stamina, cooldowns sold as skips, PvP theft.

## The game
- **Campaign:** 8 regions x 10 stages (`data/campaign.js`): Herrington Outskirts, the Catacomb Breach, the Ashen
  Cathedral, Frostfang Pass, the Sea of Sand, the Dark Forest, the Siege of Ironcrown and Beyond the Riftgate. Every 5th
  stage brings a lieutenant and every 10th a boss, all painted VELSCOUR giants named for the art they use. Each stage
  opens when the one before it is won.
- **1,000 waves:** the 80 stages share waves 1..1000 (6 waves at stage 1, 20 at stage 80). Every wave's horde is a
  little stronger than the last (`data/waves.js hpMul`, eased across each stage from `data/curve.js`).
- **30 battlefields** (`data/maps.js`), drawn as ASCII: roads, rift tears, the Heart, posts, raised posts, high ground,
  water, props. Stages 1-30 open a new one each; 31-80 replay them turned, in their own region's tiles, with posts
  topped up to the stage's need (`battle/map.js`). Heights come from the road's climb plus rolling terraces; a higher
  post reaches further.
- **Battle** (`battle/sim.js`, pure, runs in Node too): 9 monster roles (grunt, runner, flyer, brute, shaman, juggernaut,
  warded, hexer, splitter) plus lieutenants and bosses (roars that stun heroes, summons, enrage). The Heart has cracks
  to lose; leaks cost them. Per-class attacks: hammer, cleave, frost slash, lance thrust, dragon breath, slime slam,
  Dragoon leaps, arrows, fireballs, bone spears, chain lightning, falling stars, crows, notes, boomerangs, bullets. 16
  charge-up skills (Dawnbreak, Rain of Arrows, Meteor, Raise the Legion, Whirlwind, Dragon Dive, Thunder Totem,
  Obliterate, Supernova, Murder of Crows, Crescendo, Gelatinous Wall, Eclipse Rang, Phalanx Charge, Wyrmfire,
  Cannonade). **The Bard plays music only in Crescendo** (32 s charge): one of VELSCOUR's Bard melodies, two bars on the harpsichord over a bass line.
- **In-battle upgrades, gone when the battle ends:** Empower a deployed hero (battle levels 2-5) and three Bastion
  works (War Drums: Valor regeneration; Heart Ward: +5 Heart; Rally Standard: +attack for everyone).
- **Permanent upgrades:** hero levels 1-100 (gold), ascension 1-5 stars (duplicate hero cards, +15% a star), gear
  cards (equip; spare copies refine +1..+5), and the Bastion Works research (`meta/research.js`, gold).
- **Bastion's Resolve:** each defeat in a row at a stage gives +6% attack there (up to +36%) until it is won, so no
  stage becomes a wall.
- **Heroes:** 64 named heroes, 4 per class (`data/heroes.js`): the **Bastion Sixteen** (`data/cast.js`, Legendary, the
  story's cast) plus a Rare, an Epic and a Mythic echo per class, each with its own trait. Their looks are VELSCOUR's
  Grim Nocturne armors, enclosed helmets, palette finishes and the held three.js weapon designs, composed by
  `art/heroart.js` (a port of the main game's recolour so nothing is imported). Four start with you; the rest of the
  Sixteen join as the story reaches them (`RECRUITS`).
- **Cards** (`data/cards.js`, about 2,350): heroes; each class's 50 weapon and 50 off-hand designs; its 26 armors and
  15 helmets; 24 relics. Gear builds a character: weapon, off-hand, armor, helm and relic slots change the hero's
  stats *and* how they look on the battlefield and on the card.
- **Card faces** (`cards/cardart.js`): a collectible-card-game layout (title bar with the Valor cost orb, art window,
  type line with a rarity set symbol, rules text, flavour, ATK/range box, collector line); class colour identities
  (Dawn, Tide, Grave, Ember, Wild, Concord, Forged).
- **Packs in 3D** (`cards/pack3d.js`, three.js from the same CDN build the main game uses): the foil booster before the
  turning Riftgate, a strip torn off, cards rising and flipping one by one, a foil shader (a rainbow that slides with
  the view angle, an etched sparkle, a sweeping sheen, stronger by rarity; Mythics glitter), light pillars and bursts
  for Epic and better. Any card can be turned in 3D from the collection.
- **The Summoning Altar** (`meta/gacha.js`): Rift Summons (heroes, 120 shards, 10 for 1,080, an Epic guaranteed in ten,
  a Legendary every 50 at worst), Armory (weapons/off-hands), Nocturne Forge (armor/helms), Reliquary (relics),
  Bastion Booster (8 mixed), and a free Daily Rift Pack. Gear packs favour classes you own. Odds on every pack.
- **Rewards** (`meta/rewards.js`): a 7-day login calendar that never resets, an hourly bounty (up to 12 hours), four
  daily quests and 30 achievements. **Red dots** (`meta/badges.js`) mark every menu with something waiting.
- **Story:** 320 dialogs, 20 led by each of the Sixteen, two at the beginning and two at the end of every stage
  (`data/dialogs/part1-4.js`; the bible is `docs/STORY.md`, the schedule `docs/dialog_schedule.json`).

## Auto-play
- **AUTO** in battle (`battle/autoplay.js`): deploys the best hero on the post where it covers the most road, saves for
  the first heroes, empowers the heroes doing the work, buys War Drums / Heart Ward / Rally Standard, and calls waves
  early when the field is clear.
- **Auto-campaign** (the Bastion's toggle, `meta/autopilot.js`): fights, then picks the squad, equips and refines gear,
  ascends and levels heroes, and goes on (back to an older stage to farm after two defeats in a row). **It never
  spends Soul Shards or tickets, never opens packs and leaves the Bastion Works alone**; those are the Commander's.

## Difficulty (how the curve was set)
`node defense/tests/calibrate.mjs [K] [slope]` plays the campaign as a simulated Commander (two battles a stage,
spending like a player would: free rewards each day, packs with earned shards, a third of the gold on the Works, the
auto-pilot's hero upgrades) and, at every stage, binary-searches the biggest horde multiplier its squad still wins
solidly (90%+ destroyed). The target is a share of that margin (K at stage 1 to `slope` at stage 80, eased for the
first stages so a fresh squad wins them, building to each region's boss). It splits into a smooth rising `CURVE`
(every wave stronger) and a per-stage `TERRAIN` factor that evens out how easy each map is, written to
`data/curve.js`. Monsters on short roads also get proportionally less health. Current fit: `calibrate.mjs 0.9 1.05`.

`node defense/tests/balance.mjs [maxStage] [maxBattles]` then plays the whole campaign from a fresh save with battle
auto-play and the auto-pilot and prints, per stage, the tries the first win took, stars and Heart. Last run: all 80
stages in about 200 battles, 57 of 80 won first try, no stage needing more than about a dozen tries (with Resolve),
bosses 1-7 tries, mostly 2-star wins (3 stars wants replays and upgrades). A fresh squad wins stages 1-3 with no
upgrades.

## Tests and tools
```bash
node defense/tools/art_index.mjs          # snapshot of the main game's data the Defense page uses
node defense/tools/dialog_schedule.mjs    # who leads each of the 320 dialogs
node defense/tools/check_dialogs.mjs      # every dialog: schedule, speakers, lengths
node defense/tests/balance.mjs 80 1500    # the campaign on auto, no browser (seconds)
node defense/tests/calibrate.mjs 0.9 1.05 # refit data/curve.js (about a minute)
node defense/tests/defense.js [mobile]    # browser: menus, a stage on auto, five regions, 3D packs, inspector
node tools/tests/riftgate.js [seeds]      # the main game: the Riftgate in town, through it and back
```
Serve the repo root first. Screenshots go to `defense/tests/out/` (git-ignored).

## Not done / worth knowing
- Monsters have one pose each (as in the main game); walking is a bob and squash. Heroes too.
- Real phones and Safari/iOS were not tried; three.js loads only for the pack and inspector screens.
- The difficulty was fitted to auto-play; human players who place worse will lean on Resolve, replays or AUTO.
