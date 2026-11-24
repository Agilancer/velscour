# Tessariel's Keep

The user asked (November 24, 2026) for a new portal in town to **Tessariel's Keep**: a castle keep where *all your other
heroes walk around, talking with you and with each other*; **hundreds of quests and challenges** whose rewards are things
to **decorate the keep** with; a **ground floor and a balcony round it reached by stairs**; places to **look at trophies and
time records** and to **put your trophies on display**; **an NPC who gives the quests and trades their tokens for armour
up to Legendary, now and then Mythic**; everything **balanced with the game as it is now**; **portals back to town**; the
**other useful things a hub of this kind has** that help with the endgame; banners and assets **taken from the user's bm,
vesperwrithe and Bellmourn repos**; ideas from **the current World of Warcraft raid bosses** and **bm's four Elder Dragon
dungeon**; three critics (level design artists and quest designers) going over it until they approve or four rounds
pass; then push, PR and merge. **Isometric, locked to the Velscour style guides.**

Tessariel, the Sacred Flame ("Ember that falls"), is this world's good god; Velscour the Fiend (docs/PIRATE_SEAS.md).
The rule of the user's other games holds here: **T never stands near V.** Nothing of Velscour's comes into the keep: no V
banner, no V window, not even as a trophy (`tools/tkeep3d.py` lists what was left out and why).

## Getting there
- **Herrington Hollow** and **Sunscorch Oasis** each have a green-and-gold portal off the square (`keepgateSpot`,
  `drawKeepGate` in `src/gfx/keepgate.js`): Tessariel's fire in a stone ring, wings of light, a gilt T. Clicking it
  enters (`game.enterKeep`, a loading screen while the baked hall loads).
- In the keep: **the portal home** (to the town you came from) and **the Waygate** (the descent at your depth, the Eternal
  Breach, an Abyssal Rift once the Endgame is open). The Quest Log names the keep's portal in town.

## The hall (`src/world/tkeep.js`, `tools/tkeep3d.html`)
One description, shared by the game and the bake (like the Castle's `world/castle3d.js` and the Sky Battle's ship):
- a **24 x 24 great hall** of blue-grey flagstones with a limestone border; **two back walls** 84 levels high (the
  camera looks from the south-east, so the north and west walls are seen face on) with **ten tall lancet windows** (the
  middle one of the north wall is the great double window over the dais), string courses, pilasters and a crenellated
  head; a **great tower** behind the far corner and **two drums** at the ends of the back walls;
- **the balcony**: a walk two tiles wide on all four sides, a moulded **balustrade** on its rail (blocked tiles). The
  back (north and west) balconies are **24 levels up** (a hero and a half), their hall faces a **blind arcade** of round
  arches with gilt keystones. The front (south and east) sides are **terraces half as high (12 levels)**, so the hall's
  floor is seen over them; **three steps at the north-east and south-west corners** join them to the back balconies
  (`TK.BALF`, `TK.FS`); their outer face is the keep's own wall seen in section, a deep blind arcade going down into
  the dark, under a low crenellated parapet;
- **two grand stairs** flanking **the Castellan's dais** (one step up, gilt nosing), rising 3 levels a tile to gaps in
  the north rail, each with a stepped string wall and a gilt finial;
- **the Sacred Flame's basin** in the middle (three round steps, a fluted marble bowl, a gilt rim) on a **floor
  medallion** of limestone and gilt rings, **four Elder plinths** round it, **six columns** in two colonnades (at y 16,
  20, 24: clear of the grand stairs' sight lines and of the line from the camera to the Flame), bands of limestone in
  the flagstones along the colonnades and across the aisles, **four chandeliers** (baked as a sprite, hung by the game
  off the diagonal through the Flame, their twelve candles lit live), **sixteen trophy pedestals** (eight on the floor along the sides, eight on the back
  balconies against the wall).
- The back walls show to their battlements: `drawMapEdgeFade` (the outdoor maps' fade to black at the map's edge) is
  off in the keep. It used to paint over everything above the windows' sills, so the wall-heads were never seen.
- The game reads per-tile heights and flags (`map.hgt`, blocked masonry, `c3struct`), every tile draws its baked piece
  (`map.c3only`), the Castle's tall occlusion keeps whoever walks behind a column, a pedestal or the rail visible
  (`map.tallOcclusion`). `src/world/keepworld.js` builds the map and the props.

### The bake
```bash
python tools/tkeep3d.py textures <vesperwrithe>          # the stone, limestone, plinth, setts and flagstones -> assets/source/tkeep/tex/
python tools/tkeep3d.py decor <Bellmourn> <vesperwrithe> # banners, stained glass, rugs -> assets/tiles/tkeep/decor/
node tools/tkeep3d_bake.js                                # three.js -> assets/source/tkeep/out/ (needs the server; ~15 s)
python tools/tkeep3d.py pack                              # -> assets/tiles/tkeep/ (one 4096 x 3822 lossless WebP page + index.json)
node tools/tkeep3d_bake.js preview 21,21,1600,1000,0.55   # a framed view -> tools/tests/out/tkeep3d_preview_21_21.png
node tools/tkeep3d_bake.js trophies                       # every trophy sprite -> tools/tests/out/tkeep3d_trophy_<id>.png
```
- three.js comes from the repo's `vendor/three/` (jsDelivr is blocked in the cloud containers); the official
  `GLTFLoader` (three 0.170, from npm) was added to `vendor/three/addons/loaders/` for the trophies.
- The trophies' models are the user's GLBs: **the four Elder Dragon Gods** (`bm/art/dragons/rigged/dragon_*.glb`) and
  vesperwrithe's **Tessariel T shields, tower and kite shields, skulls and holy staves** (`assets/game/items/*.glb`).
  `tkeep3d_bake.js` copies them from clones of those repos (`TKEEP_VW`, `TKEEP_BM`, default `../agilancer/<repo>` or
  `/home/user/agilancer/<repo>`) into the git-ignored `tools/tests/out/tkeep_src/`; only the baked sprites ship.
  Their stands are in `src/data/keepart.js` (size, yaw, which way up).
- Materials: vesperwrithe's Bellmourn/Phobos texture batches (keep dressed stone, interior limestone, rusticated plinth,
  courtyard setts, hall flagstones, chalk ashlar), the Castle's own chapel marble, iron and wood, a muted gilt. Light: a
  warm key fixed to the camera from the upper left (as the Castle's), soft shadows, and point lights baked into the stone
  round the Flame (green), the braziers and the candelabra.

## Decorations (`src/gfx/keepart.js`, `src/data/keep.js` DECOR)
What the hero hangs is drawn at runtime, so it can change: each choice becomes one canvas, laid onto its wall plane with
an affine map (so it is iso-exact), then an ordinary prop sprite (the depth sort and the Castle's occlusion treat it like
any other prop).
- **Banners (14 places)**: on the back balconies' faces and up the walls between the windows. 16 designs: Tessariel's
  four T banners (vesperwrithe `tess_a/b`), and the holy orders' and free towns' twelve from **Bellmourn**
  `assets/textures/banners/` (none of its eight `velscour_*`). Each casts a soft shadow on the stone.
- **Stained glass (10 windows)**: six panes from vesperwrithe `assets/game/glass/` where the angels win (its README:
  `glass_a_1`, `glass_b_1`, `glass_e_1` are Velscour's; `glass_c_1` and the rose put him over the angels too). Each
  glows, and **shafts of its colour** fall faintly into the hall (`drawLightShafts`).
- **Rugs (3)**: the north and south runners and the dais carpet, twelve weaves from vesperwrithe's Bellmourn
  *Rugs and Carpets 20*, gold-bordered, drawn **into the floor tile by tile** (`map.dressTile`, `gfx/terrain.js`), so
  nothing standing in front is painted over.
- **Trophies (16 pedestals + 4 plinths)**: 30 trophies, each earned once; any of the 26 small ones on any pedestal (a new
  one goes on the first empty pedestal), the four **Elder Dragons** on their own plinths round the Flame. A lamp lights
  every trophy.
- **Furniture**: the Castle Keep pack's painted props: suits of armour and candelabra by the dais, lions by the portal,
  benches by the columns, the war map table, the Chronicle's lectern, a reliquary and a knight's memorial on the north
  balcony, the Vault's treasury chest, a shield rack, braziers, candelabra and banner stands along the front balconies.
- A new hero's keep: the four T banners in turn, two windows, the blue runners and the gilded dais.
- **Fire** (`drawFire` in keepart.js): the Sacred Flame is ~105 px of layered tongues (emerald, bright green, a gold-white
  heart), sparks curling off it; it **grows with the hero's Renown**, burns higher while Kindled, and leaps (`world.flameSurge`)
  when the hero arrives, kneels or is paid. The braziers burn, the candelabra and chandeliers carry candle flames (`fx`
  on a prop: drawn right after its sprite, so the depth sort holds).
- **The glass is re-coloured at load** (`keepGlass`): the painted hosts' blood reds become emerald, the violets azure.
  Nothing in the Fiend's red hangs in the hall.
- **The Elders not yet carved** show as a pale shade on their plinths (`ghostSprite`).
- **Click a banner or a window** in the hall: it lights up under the mouse, names itself, and opens Furnish on that
  place (`decorSlot` markers in keepgame.js).

## The people (`src/game/keepfolk.js`, `src/data/keeplines.js`)
- **Your other heroes**: every other class's hero on this browser (`heroesByClass`), up to twelve, drawn in **the gear
  they last wore** (`savedGearPreview`, weapons in hand) at a hero's height, a gold rim. They walk the hall and the
  balcony (they take the stairs), stop at the Flame, the trophies, the dragons, the windows and the Chronicle and say
  something about it; two of them now and then **walk over to each other and talk** (24 short scripts that use their own
  levels, depths and kills: *"How deep did you get, Vael?" "Depth 140. You?"*); whoever is near you **greets you** with
  your own numbers, a line that fits what is true now (`GREETS_WHEN`: rewards waiting, Kindled, who is deeper, the Fiend
  dead) or one of their class's six (19 classes); every speaker says each of their lines once before any repeats
  (`next`). A **plate** under each name gives class and level. Click one: a word, and their **card** (level, depth, kills,
  Breach, Rift, best times) with *A word* / *Send on an errand* (the War Table). A hero on an expedition is away.
- **Castellan Elsabet of the Ivory Mantle**, Keeper of the Flame (the Ivory Mantle knight's painted sheet), on the dais:
  click her for the panel. She welcomes you when you step in, speaks up when you're near, and wears **a gold "!"** when
  rewards wait and **a green "?"** when a Saga can be taken up (`castellanMark`; her dot pulses on the minimap).
- **The keep's folk** at their posts, now and then a short round: Brother Cael by the Flame, Ser Cassius in the hall,
  Kestrel on the balcony, Mother Agatha at the Chronicle, Halvard by the gate.

## The quests (`src/data/keep.js`, `src/game/keep.js`) — 387
Every objective is a **metric** and a count. The game counts (`keepEvent`, called from combat's kill, `game.brokeThrough`
on every cleared level, the Breach heart, the Rift win, gold and item pickups, potions, the Jeweler's sockets,
Homunculus's upgrades, deaths); some metrics are read straight off the save (level, deepest depth, kills, Breach best,
Rift best, Unbound wins), so a veteran's past counts for the Deeds. A **level's time and potions** (`world.time`,
`world.keepPotions`) give the fast, pure and BOSS ROOM deeds and the Chronicle's records.
- **Sagas (8 lines, 86 chapters)**: taken from the Castellan, one chapter at a time, each counting from when it is
  taken: *The Ember's Road* (the first steps), *The Lampwardens' Debt* (sea, sky and tower), *The Four Teeth* (the Elder
  Dragons, below), *The Hollow Crowns* (BOSS ROOM lords), *Saints of the Deep* (a pilgrimage through the biomes), *The Free
  Towns* (the overworld regions), *The Endless Watch* (Breach, throne, Rifts, Heresies), *Hearth and Hall* (gold, gems,
  upgrades, Legendary and Mythic finds). Chapters pay 6-28 Embers (a line's last +30), Renown and gold; many give a
  trophy or a decoration.
- **Bounties (62 kinds, three a day)**: today's board, the same all day for the hero (cull, champions, guardians, a
  BOSS ROOM's lord, depths, trials, pure or swift clears, the tithe in gold at the hero's level, a pilgrimage to one of 32
  dungeon biomes, an errand to one of 14 overworld regions, a Breach floor, a Rift). 8 Embers each.
- **Deeds (239, in seven groups)**: tiers of a metric, counting on their own: Slayer, Descent, Raid Trials, Overworld (each
  region three tiers), Dungeons (every biome), Endgame, Hearth. 5 to 75 Embers by tier.
- **Rewards wait at the Castellan** (the log says so wherever a quest finishes; the Quest Log shows how many): *Claim*
  pays them all. A chapter done moves the Saga on at once.

### What the old raids taught (inspiration, not names)
The Sagas' *Four Teeth* and the *Raid Trials* deeds take their shape from bm's **Elder Dragon Gods** (docs/ELDER-DRAGONS.md
in bm: Thyrraxis the Gale Eternal, Kaldurra the Hearth of the World, Morvekh Who Remembers the Cold, Nihvaroth the Hollow
Star) and through them from the WoW raid fights players liked: Raszageth and Al'Akir (be pushed, thrown, hold on: *clear a
BOSS ROOM in under two minutes*), Ragnaros and Fyrakk (the floor is lava, find your shelter: *without a potion*),
Sennarth and Sindragosa (climb ahead of the mist: *thirty guardians*), Dimensius and the current season's *Crown of the
Cosmos* in the Voidspire (resist the pull, the wells close fast: *clear a depth in under 45 seconds*). The keep carves
each Elder God as you finish its arc. The current WoW raids looked at: **Midnight Season 1** (The Voidspire: Imperator
Averzian, Vorasius, Fallen King Salhadaar, Vaelgor and Ezzorak, the Lightblinded Vanguard, Crown of the Cosmos; the
Dreamrift's Chimaerus; March on Quel'Danas: Belo'ren, Midnight Falls) and **Season 2** (The Venomous Abyss: Nek'zali the
Soulcoiler to Ula'tek; The Unbinding of Kith'ix). Sources: Icy Veins raid guides, Wowhead, Blizzard news (November 2026).

## What it gives (and the balance)
- **Sacred Embers** (per hero, `c.keep.embers`).
- **The Ember trade** at the Castellan: **body, head, hands, legs or feet** of the hero's own level (`tradeLevel`: the
  hero's level, no higher than their deepest depth's drops + 2; **at the level cap, what their deepest depth drops**, to
  item level 120), **Rare 18, Epic 55, Legendary 150**; a Legendary comes
  out **Mythic 1 time in 10** (from item level 50). A rarity is sold only once the hero's item level opens it, as in the
  deep (Epic 15, Legendary 30, Mythic 50).
- **The Vault of the Flame** (weekly, the treasury chest on the dais): every reward claimed this week is a mark; 3, 7 and
  12 marks give 1, 2 and 3 choices of one **Legendary** piece of the hero's level + 2 (15% Mythic), never above item
  level 120.
- **Renown** (the rewards' Renown points, ranks 1-20, rank r at 3 r (r + 1) / 2): always on, **+1% gold, +1 magic find,
  +0.5% XP a rank** (+20%, +20, +10% at 20). Titles from Pilgrim to Ember Eternal.
- **Kindled**: kneel at the Sacred Flame: **+10% XP, +15% gold, +15 magic find for 30 minutes, once an hour** (real time);
  while it rests it can be **fed 30 Embers** to burn again at once (`KINDLE.rekindle`: the sink for a hero who plays all day).
- **The War Table**: send your other heroes on the keep's errands (20 minutes to 8 hours, real time, by their level):
  Embers (1-8, the long errands best by the hour), gold at their level and gems; they leave the hall while away. **Two
  seats, one more every fourth rank of Renown** (`warSeats`, 7 at rank 20), and its Embers stop at **60 a day**
  (`WAR_EMBERS_A_DAY`; gold and gems still come).
- **The Long Watch** (`WATCHES`, on the Bounties tab): five deeds that never run out, open from Depth 500: 4 Embers every
  25 depths cleared, every 5 lords, every 5 overworld trials, every 5 Breach floors; 5 every 5 Rifts. They count from the
  day they opened (no back pay) and give no Renown.
- **The Chronicle of Deeds** (the lectern on the north balcony): every hero's level, depth, kills, Breach and Rift best,
  fastest depth and fastest BOSS ROOM, trophies; and the hall's records, the best of all of them.
- **The chests** (storage, Reliquary, Jewel Box) by the portal, and the Waygate down.
- **Balance** (`node tools/tests/keep_quests.mjs` plays a hero from depth 1 to 600 in rough proportion to a real run):
  about **2,200 Embers over a whole game (~35 hours): 14 Legendary pieces**, the Vault and the War Table on top; Renown
  in the low teens by the end of the campaign, the rest from the daily board and the endgame. The pieces are the hero's
  own level, never above what the deep would drop there, so the keep **targets** a slot rather than out-gearing drops.

### The veteran (the second pass of balance)
The user asked that the keep hold up for **players who have been at it for weeks without a break**: level 100, far past
Depth 500, every endgame door open, all 19 classes made. `keep_quests.mjs` models one and found:
- **The War Table was the whole economy.** With 18 other heroes and no limit, 8-hour vigils three times a day paid
  **~1,400 Embers a day for no play** (nine Legendaries; clicking 20-minute escorts, 160 an hour), against 24 from the
  day's bounties. Now: seats, a daily cap of 60, smaller payments. A full table left alone is the cap.
- **Four Ascent deeds could not be done** (levels 150 to 1,000; the cap is 100). The tiers now run 10 to 100.
- **The trade forged twenty item levels under their drops** (item level 100; the deep past the throne drops to 120). At
  the cap it now follows their deepest depth; the Vault no longer forges above 120.
- **Nothing was left to earn or spend.** With every deed done, three bounties a day was all: the Long Watch and feeding
  the Flame are for them.
- **What a day is worth now** (16 hours of play): the Long Watch 110-140 Embers, bounties 24, the War Table at most 60:
  **about 225 Embers, 1.5 Legendary forgings, a Mythic for a chosen slot about once a week**. The deep drops more; the
  keep lets them aim at a slot. Renown: 16 with every deed done, the last four ranks from the daily board (months).
- **A save older than the keep** is paid for the deeds read off the save (level, depth, kills, Breach, Rift, Unbound)
  on the first step in: 40 deeds, ~1,500 Embers. Once.
- Keep states are per hero, so the caps are per hero too.
- State added: `watch` ({ id: { base, paid } }) and `war` ({ day, embers }) in `G.char.keep`; `keepState` fills them in.

## State
`G.char.keep` (saved with the hero, so cloud saves carry it): `embers`, `renown`, `st` (counters), `rec` (best times),
`sagas` ({ ch, base }), `done` (deeds), `owed` (rewards waiting), `bounty` ({ day, list }), `vault` ({ week, marks,
claimed, offer }), `have` (decorations and trophies earned), `decor` (what hangs where), `exp` (expeditions), `kindled`.
`keepState()` fills it in on first use; an old save without it loads as a new keep.

## Auto-play
In the keep, auto-play takes every open Saga, claims what is owed, kneels at the Flame if it can, and walks out through
the portal home (`Auto.keepTick`). It never walks in by itself.

## Files
`src/world/tkeep.js` (layout), `src/world/keepworld.js` (map, props, rugs), `src/game/keep.js` (rules), `src/game/keepgame.js`
(the world, interactables, lights), `src/game/keepfolk.js` (people), `src/gfx/keepart.js` (art), `src/gfx/keepgate.js`
(the town portal), `src/ui/keep.js` (panel), `src/data/keep.js` (quests, decor, trophies, numbers), `src/data/keepart.js`
(trophy models), `src/data/keeplines.js` (speech); `tools/tkeep3d.html`, `tools/tkeep3d_bake.js`, `tools/tkeep3d.py`;
`assets/tiles/tkeep/`, `assets/source/tkeep/tex/`. Hooks: `game.js` (portals, `enterKeep`, `brokeThrough`, deaths),
`render.js` (people, the Flame, the gate, shafts), `terrain.js` (rugs), `combat.js`, `player.js` (pickups, potions, Renown
and Kindled in `recompute`), `breach.js`, `rifts.js`, `inventory.js`, `vendor.js`, `autoplay.js`, `quest.js`, `main.js`.

## Tests
- `node tools/tests/keep_quests.mjs`: the quests' data, the rules on a save, the Ember economy over a played-through
  game, and the veteran's (the door's back pay, a day's Embers, the War Table's seats and cap) (no browser).
- `node tools/tests/keep.js [noshots] [mobile]`: the portal in town, the hall, the companions walking and talking, the
  stairs to every balcony, every panel tab, a chapter paid, a trade, the Vault, Furnish shown at once, Kindled, an
  expedition, auto-play walking out. Shots in `tools/tests/out/keep_*.png`.

## The critics (round 1 of 4) and the polish that followed
Three critics were asked for: an environment/level artist, a quest and systems designer, a hub and narrative UX
designer. Round 1: **art 6/10, reject**; **hub/UX 6/10, reject**; the systems critic was cut off by the session's usage
limit before reporting. Fixed after round 1: clicking one of the keep's folk threw, Velscour's skull is hidden in the
keep, the arrival point moved out of the front balcony's shadow, the front balconies go see-through over the hero
(`map.cutFront`), the chests moved out of the Waygate's corner, the front walls got a blind arcade.

**The polish session (November 24, 2026, "make it look and feel amazing")** worked through that list in four passes:
1. *The hall, re-baked*: front terraces at 12 levels with corner stairs; columns moved; the floor medallion and
   bands; chandeliers; trophies and Elders larger (dragons 3.4 tiles, shields 1.5, staves 2.1); **every shield had been
   baked showing its black back** (yaw 180 now); vesperwrithe's `skull_gems` model has no usable skin, so the second
   skull is `skull_03` gilded ("The Gilded Skull"); the new Flame; burning braziers and candles; the Elders' shades; glass
   in emerald and azure; brighter runners with a gilt border.
2. *People and feel*: name plates, the hero card, fitting greetings, six lines a class, shuffle bags, the Castellan's
   welcome and mark, faint names on the stations, the minimap (Flame, Castellan, heroes; not every pedestal), the arrival
   flourish, the ceremony when rewards are paid (Embers stream, the Flame leaps, each new trophy unveiled), a flood of
   old deeds folded into one log line (`pend` in `checkProgress`), ambience `tkeep`.
3. *The panel*: tabs grouped (Quests / Rewards / The Hall) with badges, chapter pips and each chapter's pay, the Ember
   trade shows what is worn in each slot, marks an upgrade and asks before it forges, click-to-Furnish in the hall, a
   compact header on phones.
4. *The walls*: the map edge fade had hidden the upper walls and battlements since the first version (see The hall);
   the drums' edge tiles had no piece; the wall lights turned down once the walls showed.

**Still open:** a training dummy and a coffer shared between heroes; class-pair chats and lines about the last thing
that happened; companions still have no walk cycle (one image, bobbing); permanent station pages per station (each
station already opens its own tab); the keep's folk are painted townsfolk (no art of their own); real phones untested.

## Open issues
- Real phones: the hall's page (4096 x 3926) decodes to ~64 MB (the Castle's are 30-87 MB); untested on iOS Safari.
- The companions' look is their saved gear's preview, one image (no walk cycle, like the visiting adventurers in town).
- Expeditions and the Flame run on real time (`Date.now()`); a changed clock moves them.
