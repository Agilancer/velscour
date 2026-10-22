# VELSCOUR: notes for Claude sessions

An isometric, retro pixel-art action RPG in the style of Diablo II, played in the browser on **PC and mobile**.
It is plain JavaScript ES modules and Canvas 2D, with **no build step and no dependencies**. GitHub Pages serves it
straight from `main` at https://agilancer.github.io/velscour/.

**Start every session by reading [`docs/HANDOFF.md`](docs/HANDOFF.md).** It holds the user's full original
requirements, current status, open issues, the next steps, and a subsystem reference.
This file only covers the essentials.

## Run it
```bash
python3 -m http.server 8123          # from the repo root; ES modules need http, not file://
# open http://localhost:8123
```
Debug hook in the browser console: `window.VELSCOUR = { G, game }`. `G` is the global state (`G.char` is the save
data, `G.player`, `G.world`, `G.ui`, `G.settings`, and `G.godMode = true` to make the player take no damage) and `game` (also `G.game`) is the flow controller
(`newChar`, `buildDungeon(depth, biome)`, `enterDungeon`, `enterTown`, ...). From `page.evaluate` you can
`await import('/src/...')` any module and get the same instances the game is using.

## Test it
Headless Chromium tests live in `tools/tests/`; see the header comment of each file. Start the server above first.
```bash
export NODE_PATH=/opt/node22/lib/node_modules     # where playwright is installed in Claude cloud containers
node tools/tests/data_check.mjs                    # skill data sanity check, no browser (fast)
python tools/tests/chatgpt_art.py                  # ChatGPT art kits (and Grim Nocturne pixel-locked imports) round-trip, no browser
node tools/tests/lancer_shields.js                 # Lancer 3D shield models (built from the turntables), turntable + all-rings shots, in-front/behind QA
node tools/tests/lancer_banner.js                  # Lancer cloth banner: skin/pole sizes, hangs still, trails in 4 directions, Valor + run shots
node tools/tests/town.js [seeds]                   # random towns: vendors/portal reachable + screenshots per seed
node tools/tests/townlife.js [events|none]         # town life: arrival by the portal, quiet start, bubble budget, ~35% events, all 19 events, animals, auto-play audience with the royals, emotion sheet
node tools/tests/townsfolk.mjs                      # People and Animals sheets (256x200 cells), 47 people + 10 animals, scripts fit their bubbles, no browser
node tools/tests/homunculus.mjs                     # the blacksmith: 2,000+ lines fit, 30 poses, axe story told in full (simulated visits), no browser
node tools/tests/homunculus.js                      # the blacksmith live: bubbles at the real font, auto-play chat at the forge, the axe speaks, townsfolk hails, anvil, shots
node tools/tests/encounters.js [kinds]             # dungeon encounters with people (captive, knight's last stand, peddler, wizard, witch, Greener) + rats
node tools/tests/rings.js                          # ring augments in a live dungeon, skill mastery, ring/forge UI shots
node tools/tests/flow.js                           # town -> portal -> boss -> exit -> depth 2 -> death -> reload
node tools/tests/stash.js                          # town storage chest: 300 slots, store/take, auto-play stashing
node tools/tests/rarity.js [classes] [samples]     # gear rarity worth in item levels, level 25 Rare > level 10 Mythic, drop odds
node tools/tests/ui.js                             # skill tree, inventory, socketing, vendors
node tools/tests/options.js                        # settings: lock skill bar, hide item names, auto skill points off; skill tree Respec (50 gold x level^2)
node tools/tests/mobile.js                         # 844x390 touch layout + joystick
node tools/tests/hud.js                            # HUD art: 15-slot bar keys, save migration, minimap ring, buttons, Quest Log, touch pages
node tools/tests/rims.js                           # monster rims (rank colours, green summons, gold hero), pet see-through walls, enlargeable target window
node tools/tests/levelup.js                        # level-up banner: Velscour's 2,000 taunts, mood colours, no mood twice in a row, lines fit
node tools/tests/boss.js                           # Depth 100 Velscour arena + a depth 37 guardian
node tools/tests/raid.js [5,30,55]                 # BOSS ROOMs: seal, every ability of all raid bosses, phases, wards, death
node tools/tests/raid_sigs.js [ids] [secs]         # the 20 signature raid bosses (raidsigs.js): cast all, shots, auto-play fights each
node tools/tests/arch3d.js [biome] [design]        # 3D-baked arches (docs/ARCH_3D.md) in a live dungeon: hero in front / under / behind
node tools/tests/rooms.js [biomes] [levels]        # shaped rooms + scatter set pieces: reachability, chests, screenshots
node tools/tests/wanderers.js [minutes]            # overworld townsfolk walk/flee, bounties taken and paid by auto-play
node tools/tests/biome_perf.js [ids] [depth]       # per-biome frame cost with auto-play on + CPU profile hot spots
node tools/tests/mobs.js [levels]                  # monster pathing: awake monsters + guardians must reach the hero (stuck <= 2%)
node tools/tests/bot.js paladin 2                  # bot plays depths 1..2, prints balance stats
node tools/tests/skills.js wizard,gunner           # cast every skill of a class (all 16 if no arg; slow)
node tools/tests/melodies.mjs                      # Bard's 2,000 melodies: unique bars, rules, combinations, two-hand arrangements, no browser
node tools/tests/bard.js [minutes] [mobile]        # Bard notation + music: glyphs, melodies engraved, harpsichord, Cadence/finishing-bar rules, shots, auto-play
node tools/tests/bard_listen.js [min] [secs]       # Bard music as played: no two bars at once, harsh intervals, fast figures, renders out/bard_listen.wav
node tools/tests/bard_dps.js [secs] [runs]         # Bard damage on dummies + Cadences/min, for balancing the measure
node tools/tests/astronomer.js [minutes] [mobile]  # Astronomer: icons, star chart/zodiac/Conjunction/Mirror rules, showcase shots, auto-play soak
node tools/tests/classart.js paladin               # class art pack: catalog weapons, ability effects
node tools/tests/lance.js [mobile]                 # Dragoon leaps: energy lance + per-skill trails, stepped frame by frame
node tools/tests/gear.js paladin,wizard            # hero looks: armor+helm per rarity, finishes, auras (all = 16)
node tools/tests/closed_helms.js all               # all 15 enclosed helmets on all 26 armors: face covered, centred, body untouched
node tools/tests/herolook.js all death_knight 8      # every armor/helmet/finish loads (3,009 per class) + hero visible every second of a soak
node tools/tests/walls.js walls catacombs,frozen  # screenshot wall runs/corners in those biomes (docs/ART.md)
node tools/tests/pack.js catacombs,blood          # biome pack levels: arches, doors, reachability; door/arch shots
node tools/tests/overworld.js                      # 60 outdoor seeds, 20 scenarios, forced scheduling, landscape previews
node tools/tests/scenarios.js                      # a bot plays every Wilds/Castle scenario and Sea of Sand route to the end
node tools/tests/castle_overworld.mjs              # 100 Castle seeds: both curtains sealed, gates, bridges over water, lane, halls, art caps (no browser)
node tools/tests/castle_visual.js [views] [--grid] # Castle screenshots: 25 views (gatehouse, bridges, wards, keep, halls, village, siege)
node tools/tests/castle3d.js [views]              # the 3D Castle (docs/CASTLE_3D.md): wall-walk, stairs, tunnel, throne room, doors, drawbridge, overview
node tools/tests/castle_autoplay.js [classes]       # auto-play takes the Castle's stairs to wall foes (no hits from below) and back down, never leaps off
node tools/tests/overworld_look.js [biome] [seed]    # screenshots of an overworld's spots for art review (scatter in context, sizes, hills)
node tools/tests/skyship.js [clear|storm,...|all] [auto]  # the Sky Battle (docs/SKY_BATTLE.md): whole battles per scenario, every phase in order, every line frames its speaker, shots
node tools/tests/castle_walls.js [views] [--noshots] # Castle height-mapped walls: walk/towers/stairs reachable, monsters use the stairs, 30 shots
node tools/tests/sea_of_sand_generation.mjs         # 100 desert maze seeds, route reachability, one-to-five area rolls
node tools/tests/sea_of_sand.js                     # atlas frames, desert HUD, monster frames, screenshots (browser)
node tools/tests/dark_forest.js [noshots] [noauto]  # 40 forest seeds reachable, bot plays all 13 trials, frame cost, shots, auto-play wins the Heart
node tools/tests/mountain.js [noshots] [noauto]    # Mountainside beta (height map): skull access, 30 seeds, hop/drop rules, picking, shots, auto-play summit
node tools/tests/breach_gen.mjs [seeds] [floor]     # THE ETERNAL BREACH generator: 8/5/3 islands, walkways, wards solvable on the tiles (no browser)
node tools/tests/breach.js [town,play,arrive,shots,auto,rules,perf] [floor] # the Breach: purple portal, every scenario, 12 arrivals, shots, auto-play wins a floor, rewards, death
node tools/tests/heavenly.js                       # 60 distinct Heavenly monsters, painted floors/props, monster atlas export
node tools/tests/worldwide_biomes.js               # 32 combat biomes, home/visitor/legacy spawns, town/wilds art and exact iso fences
node tools/tests/worldwide_biomes.js --all         # every indoor biome's themed tile set (slow)
node tools/tests/biome_survey.js [ids] [depth]     # screenshots of every dungeon biome without monsters, for art review
node tools/tests/biome_scenarios.js [ids] [noshots] # themed rooms per biome reachable, all 20 scenario mechanics forced and solved
node tools/tests/biome_looks.js [ids] [depth]      # each biome's biggest themed rooms with the lights up, for art review
node tools/tests/approved_biome_art.js             # the five temple biomes' approved painted floors and props
node tools/tests/titlefx.js                        # title intro: click gate, logo fade on the song clock, flame burst on the hit, eyes
node tools/tests/enemies.js                        # monster art line-ups (sets 1-3), corpses, random-bestiary levels + guardians
node tools/tests/mayhem.js                         # monster traits, ambush arrivals (drop/teleport/burrow/wall), bullet patterns, MADNESS
node tools/tests/spectate.js [mobile]              # while the hero plays: critter taps, SMITE, sealed treasures + reel, auto-play waits in town, stance, portal choice, Greed
node tools/tests/legion.js                         # Necromancer skeleton summons: art line-up, every minion attacks + casts
node tools/tests/dk_ghoul.js                       # Death Knight ghoul: frost dk_ghoul atlas, small, leaps from range; frost skulls on Death Coil
node tools/tests/phoenix.js [mobile]               # Ranger 3D golden phoenix: turntable, wing/tail tips, banks, glides, ember trail, stoop
node tools/tests/totem3d.js [mobile]               # Totem Master 3D great totem: model states/face orders, bursts out of the ground, blast, sinks (stepped sheet)
node tools/tests/runeblade3d.js                    # Death Knight Runeblade 3D model: all 5 skins, 16 turns, rune slots, 30 level looks + reforge, hover + Obliteration shots
node tools/tests/runeblade_familiar.js [secs] [mobile] # Death Knight sword familiar: frost skulls, 15 flight patterns, swings, 5 sword skills, Rune Weapon summons, soak
node tools/tests/familiars.js                      # pet art: every pet summon's look, rainbow slimelings rising + hopping
node tools/tests/slimecourt.js [secs] [play]       # Slime Lord's court: 60 Glymmora sets, every kind's abilities, pounces, blinks, idle games, shots
node tools/tests/petanims.js [keys]                # pet atlases (docs/PET_SUMMON_ANIMATIONS.md): every summon in every state, dead poses, shots
node tools/tests/pets.js [seeds]                   # minion pathing: round walls, keep up, fight round corners, leash, idle
node tools/tests/select.js [mobile]                # hero select: one hero per class, play/new/delete, old duplicate saves
node tools/tests/autoplay.js wizard 15 [mobile]    # auto-play soak: a new hero plays N game minutes at ~30x speed
node tools/tests/balance.js paladin,wizard 146 30  # a geared hero for depth D, auto-play: deaths, depths cleared (BAL_GEAR=3 weaker gear; 'god' 4th arg: DPS)
node tools/tests/balance_model.mjs paladin         # no browser: hero life vs monster hits by depth (the curve in src/data/depth.js)
node tools/tests/tuning.js all 1,10,40,160 12      # every class auto-plays vs training dummies: seconds per normal (one / pack of 5), class ratios (toughness, DMG_TUNE)
BAL_STANCE=cautious,balanced,reckless BAL_RAID=1 node tools/tests/balance.js wizard 30 6   # stances side by side; start at a BOSS ROOM gate
node tools/tests/endgame.js paladin,wizard [8] [rush] # hero level by depth from dungeon XP (cap 600, Endless Torment to 1200), kill times + % of life per hit (no simulation)
node tools/tests/happenings.js                     # omens, shrines, treasure imp, cursed chest, challenge, nemesis, town events, Defiance
node tools/tests/perf.js 6 wizard 1                # frame cost on a phone-sized screen: fps, update/render ms (last arg: CPU throttle)
node tools/tests/signatures.js [classes|all] [secs]   # class signatures (src/game/sigs/): charge in play, showcase shots, auto-play
node tools/tests/boomerang.js [casts] [json] [skills] # Boomerang Knight: damage per cast per skill, every boomerang returns to his hand, 3D boomerang model sheets + shots
node tools/tests/paladin.js [dps|auto|shield|shots|all] [levels] # Paladin: every skill's damage vs the hammers (per-skill pow=), auto-play's hammer + Shield Throw build and cast mix, Shield Throw ricochets + blast, 3D sheets + shots
node tools/tests/gunner3d.js [video] [mobile]      # Gunner 3D turrets + Bombing Run biplane: sheets, heads track, shots from the barrel, walk through turrets, the plane; video -> out/gunner3d_action.mp4
```
Screenshots are written to `tools/tests/out/` (git-ignored). Look at them, because layout bugs don't throw.
- In cloud containers, Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and
  `harness.js` uses it automatically. Never run `playwright install`.
- Only Chromium is available, so Safari/iOS and Firefox have never been tested.
- Perf numbers: headless Chromium without a GPU renders through SwiftShader, whose frame times are noisy and
  misleading. On a machine with a GPU set `CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist"`
  (Windows; `--use-angle=vulkan` on Linux) before `biome_perf.js` / `perf.js`; its 4x CPU throttle is the phone proxy.

## Conventions
- Match the existing style: ES modules, 2-space indent, single quotes, dense code, short comments only where
  something is non-obvious. Shared state lives on `G` (`src/state.js`).
- Remaining unpainted live sprites now use the generated pack in `assets/source/replacements/`
  (`python tools/replacementart.py`; see `docs/SPRITE_REPLACEMENTS.md`). Preserve these and the user's art.
  ASCII fallbacks for missing/loading art remain in
  `src/gfx/pixelart.js`, and the town (ground, transitions, buildings, trees, props) comes from the Overworld and Town pack
  (`assets/source/biomes/town/`, `python3 tools/process_assets.py town`, `tools/townpack.py`; see docs/ART.md). The outdoor Forsaken Wilds biome reuses the town pack without overwriting Herrington Hollow, and adds procedural Canvas trees, scatter and scenario shrines; see `docs/OVERWORLD.md`. Sea of Sand uses the committed native floor, scatter, tree, monster, boss and modular cliff atlases under `assets/tiles/sea_of_sand/`, with five-beat scenario routing and a live HUD; see `docs/SEA_OF_SAND.md`. Rebuild the atlases with `python tools/seaofsandpack.py <Sea_of_Sand_Biome_Pack directory>`. The Dark Forest (192x192, the largest overworld: thick woods of the pack's 15 towering trees with canopy fade, a trail maze, three walled labyrinths with arch gates, five optional trial glades and the Heart of the Forest) uses `assets/tiles/dark_forest/` from `python tools/darkforestpack.py <THE_DARK_FOREST_Biome_Pack.zip>` (the 101 MB zip stays outside the repo); see `docs/DARK_FOREST.md`. Monsters use the user's sheets in
  `assets/source/enemies/<set>/`, imported by `python3 tools/process_assets.py enemies` and catalogued in
  `src/data/bestiary.js`; see [`docs/ENEMY_ART.md`](docs/ENEMY_ART.md). New uploads ("Enemy Assets Set N") go there too;
  set 2 (`Enemy_300.zip`, 300 single sprites) lives in `set2/<family>/` folders, each packed as one sheet and loaded per level. Pet sheets (JPEGs on a flat background) live in `familiars/` (`process_assets.py enemies familiars`). The user's sheets are in
  `assets/source/` and get sliced by `tools/process_assets.py` (needs `pip install pillow numpy scipy`; args
  `sprites|biomes|props`). Dungeon floors, walls, arches, doors and scatter come from **biome packs**
  (`assets/source/biomes/<Name>_Biome_Pack.zip`, a 160x80 template; Catacombs is the first, every biome uses it
  palette-swapped), imported by `python3 tools/process_assets.py biomes` (`tools/biomepack.py`). New packs follow the
  same template; see [`docs/ART.md`](docs/ART.md). **Dungeon biomes use only the three painted packs** (Catacombs,
  Cathedral and Graveyard, Castle Keep), palette swapped, with a themed `part` and optionally walls from another pack
  (`ART` in `src/data/biomes.js`); the five temple biomes add their approved painted floors/props
  (`src/gfx/approvedbiomeart.js`). Torches and wall hangings are placed by `wallMounts()` in `src/world/dungeon.js`.
  See [`docs/BIOME_ART.md`](docs/BIOME_ART.md). New biome packs can come from 9 ChatGPT sheets (outlined templates
  and prompts in [`docs/CHATGPT_BIOME_SPRITES.md`](docs/CHATGPT_BIOME_SPRITES.md)), imported by
  `python tools/chatgpt_biome.py <folder> <names.json> --install`. Enemies, bosses, pets, NPCs and class armor have
  ChatGPT kits too (`docs/art_kits/*.zip`, built by `python tools/chatgpt_art_kits.py`), imported by
  `python tools/chatgpt_art.py <kind> <sheet> <names.json>`; see [`docs/CHATGPT_ART_KITS.md`](docs/CHATGPT_ART_KITS.md). The character redesign
  ("Grim Nocturne": 108-art-pixel heroes, a locked stance, armor/helmet/glove/boot overlays) is specified in
  [`docs/art_style/`](docs/art_style/00_START_HERE.md) and packed by `python tools/chatgpt_style_kit.py`. Biomes have exact X/Y barricades (`src/gfx/isobarriers.js`; see
  `docs/WORLD_BIOME_OVERHAUL.md`) but no monster themes: `rollLooks` picks every level's looks at random from all
  painted art (the generated `bn_` biome natives are gone; never draw monsters in code). Enemy set 3 (260 monsters
  and bosses) is cut from `VELSCOUR_Monsters_Enemies_Bosses.zip` by `python tools/set3plates.py <zip>` and catalogued
  in `src/data/bestiary3.js`. HEAVENLY's 60 enemy sprites are cut from painted sheets by `src/gfx/heavenlymonsters.js`;
  see `docs/HEAVENLY.md`.
  The hero's look is the Grim Nocturne gear: 26 armors per class (2-7 per rarity) and 15 enclosed helmets per class (three sets),
  69 palette finishes, built by `python tools/nocturnegear.py build` (or `process_assets.py gear`) from the natives in
  `assets/source/gear_nocturne/`; helmet nudges go in `assets/sprites/gear/helmets/placements.json` via
  `Fit Helmets.cmd`. The old `assets/FinalClasses/<class>.zip` libraries are no longer read. Class art packs (Paladin weapons, ability effects) go in
  `assets/source/classes/<class>/` and are imported by `python3 tools/process_assets.py classes [class]`; both are in
  [`docs/CLASS_ART.md`](docs/CLASS_ART.md). The animated class-select portraits come from
  `assets/FinalClasses/All 16 Classes.png` (`python3 tools/process_assets.py select`, drawn by `src/ui/heroanim.js`).
  The user's sound zips live in `assets/source/audio/` and are transcoded to MP3 in `assets/audio/` by
  `python3 tools/process_assets.py audio` (needs ffmpeg; `tools/audiopack.py`). `src/core/audio.js` maps game sounds
  to samples (`SAMPLES`), songs to areas (`MUSIC`) and ambient beds to biomes (`AMB`).
  The Bard's harpsichord (the user's 5-octave, 7-articulation pack, a 220 MB zip kept outside the repo) becomes
  `assets/audio/inst/harpsichord/` via `python tools/process_assets.py instruments <zip>` (numpy + scipy + lameenc; GPL-2
  samples, notice alongside); `src/core/sampler.js` plays it, `src/data/melodies.js` holds the 2,000 two-bar melodies,
  `src/game/bardmusic.js` fits, pitches and arranges them for two hands, and `tools/songbook.html` is a keyboard + player.
  The HUD art (`assets/source/hud_bar.webp`: orbs + 15 skill / 4 potion slots; `hud_frames.webp`: minimap ring + six
  buttons) is cut by `python3 tools/process_assets.py ui` into `assets/ui/` (`hud.webp`, `hud.json`, `minimap_ring.webp`,
  `btn_<name>.webp`). The skill bar's slot order, keys and save migration live in `src/data/bar.js`.
  Never hand-edit the generated files in `assets/sprites|ui|tiles|audio`.
- Paths must stay **relative** (`assets/...`, `src/main.js`, never `/assets/...`), because the site is served
  from the `/velscour/` subpath on GitHub Pages. The `/src/...` imports in `tools/tests/` are fine, because the
  tests run against a local server at the root.
- Saves live in localStorage under `velscour_saves_v1`, one hero per class (the newest save of a class is its hero; `heroesByClass()`). If you change the save shape, extend `migrate()` in
  `src/game/save.js` so existing heroes keep loading.
- After any gameplay change, run at least `flow.js` and the `skills.js` classes you touched. Run `mobile.js`
  and `hud.js` for UI changes. Changes to skills, items, vendors or monster AI can confuse auto-play (`src/game/autoplay.js`), so run
  `autoplay.js` for a class or two as well. Changes to minion AI or `map.findPath`: run `pets.js` and `legion.js`. Pet art (`assets/source/pet_animations/`, `tools/build_pet_animations.py`, `src/core/petart.js`; watch them in `tools/pet_viewer.html`): run `petanims.js`.
  Changes to monster movement (`Monster.navTo/chase`, `map.move`, the flow field): run `mobs.js`. Overworld scenarios
  (`src/game/overworld.js`, `src/game/seaofsand.js`): run `scenarios.js`. The Dark Forest (`src/world/darkforest.js`, `src/game/darkforest.js`, tree drawing in `render.js`): run `dark_forest.js`. Height maps (`map.hgt` in `src/world/map.js`, `src/gfx/terrain.js`, `src/world/mountain.js`; docs/MOUNTAINSIDE.md): run `mountain.js`. The Castle layout (`src/world/castleworld.js`, `src/gfx/castle.js`, `src/gfx/castleground.js`, `src/gfx/castlewalls.js`; docs/CASTLE_OVERWORLD.md): run `castle_overworld.mjs`, `castle_walls.js` and `castle_visual.js` (look at the shots) and `scenarios.js`. Its walls, towers, stairs, moat and bridges are a height map textured from `assets/tiles/castle/ramparts.webp` (`python tools/castleramparts.py`, from the user's `assets/source/biomes/VELSCOUR_Castle_Artwork_Complete.zip`); changes to `src/gfx/terrain.js` also need `mountain.js`. Item rarity, power levels, affixes or drop odds (`src/data/items.js` `RARITY`, `rollRarity`, `affixScale`): run `rarity.js`. Monster/hero scaling, XP curve, BOSS ROOM or Velscour life (`monsterBase`, `xpToNext`, `raidHpMul`, `VELSCOUR_HP`): run `endgame.js`. Monster/hero scaling, affixes, drops or death
  rules (`monsterBase`, `src/data/depth.js`, `src/data/items.js`, `src/game/defiance.js`): run `balance_model.mjs` and
  `balance.js` at a few depths. Monster life/damage curves (`toughness`, `danger` in depth.js) or class damage
  (`DMG_TUNE` in classes.js): run `tuning.js` (a normal should take ~2-3 s at every depth). Dungeon/town events (`src/game/happenings.js`): run `happenings.js`. Biome rooms, layouts and scenarios (`src/data/biomerooms.js`, `src/game/scenarios.js`, `STYLES` in `src/world/dungeon.js`; docs/BIOME_ROOMS.md): run `biome_scenarios.js` and `rooms.js`. Monster traits, ambushes and MADNESS (`src/game/mayhem.js`): run `mayhem.js`. The spectator features (`src/game/spectate.js`, `critters.js`, `smite.js`, `greed.js`, `src/ui/sealed.js`, `game.portalChoice`, auto-play's `STANCES`): run `spectate.js` (and `spectate.js mobile` for HUD changes). The critters' looks are three.js models in `tools/critters3d.html`, baked by `node tools/critters3d_bake.js` into `assets/sprites/critters/`. Class signatures (`src/game/signature.js`, `src/game/sigs/`): run `signatures.js`. The Slime Lord's court (`src/game/slimecourt.js`, `src/gfx/slimeart.js`; art by `python tools/slimecourt.py <Glymmora sheets folder>`, kept outside the repo): run `slimecourt.js`, `familiars.js` and `pets.js`. Returning projectiles (`ret` in `Projectile`), Boomerang Knight skills or the 3D boomerangs (`src/gfx/boomerang3d.js`): run `boomerang.js` (look at the shots). The Paladin's skills or their `pow=` balance, Shield Throw (`ricochet`/`blast` in `Projectile`, the thrown round shield `drawThrownShield` in `src/gfx/lancershields.js`) or the 3D hammers (`src/gfx/hammer3d.js`): run `paladin.js` (look at the shots); balance changes also `tuning.js paladin` and `autoplay.js paladin` against `main`. The Death Knight's 3D Runeblade (`src/gfx/runeblade3d.js`; five skins from `assets/source/runeblade3d/`, rebuilt by `python tools/runeblade3d.py skins`, skin every 10 levels and palette every 50 by `runebladeLook`; docs/RUNEBLADE_3D.md): run `runeblade3d.js`; the sword's flight, swings and own skills (`PATTERNS`/`SWINGS`/`PET` in `src/game/sigs/deathknight.js`) his Rune Weapon summons (`src/gfx/runeweapon.js`) and his frost skulls (`src/gfx/dkskull.js`): run `runeblade_familiar.js`. The Ranger's 3D phoenix (`src/gfx/phoenix3d.js`, flight in `src/game/sigs/ranger.js`): run `phoenix.js` and `signatures.js ranger`. The Gunner's 3D turrets and biplane (`tools/gunner3d.js`, textured from the airship pack, baked by `node tools/gunner3d_bake.js` into `assets/sprites/gunner/`, drawn by `src/gfx/gunner3d.js`; docs/GUNNER_3D.md): run `gunner3d.js` and `signatures.js gunner`. The Totem Master's 3D great totem (`src/gfx/totem3d.js`, its rise/blast in `src/game/sigs/totem.js`): run `totem3d.js` and `signatures.js totem_master`. The Lancer's cloth banner (`src/gfx/lancerbanner.js`, art from `python tools/lancer_banner_templates.py --import <skin> <pole>`; docs/art_kits/lancer_banner/): run `lancer_banner.js`. The Bard's notes, measure, melodies, sampler and Cadences (`src/game/bard.js`, `src/game/bardmusic.js`, `src/gfx/notation.js`, `src/data/notation.js`, `src/data/melodies.js`, `src/core/sampler.js`): run `melodies.mjs`, `bard.js` and `bard_listen.js` (`bard_dps.js` for Cadence balance). The Sky Battle (`src/game/skybattle.js`, `src/world/skyship.js`, `src/gfx/skyship.js`, `src/game/cinema.js`, `src/data/skybattle.js`, `src/data/skytalk.js`, `src/data/airpirates.js`; docs/SKY_BATTLE.md): run `skyship.js all` (and `skyship.js clear auto`); the ship's model (`tools/airship3d_ironclad.js`) or `src/world/skyship.js` change the bake: re-bake and pack. The Astronomer (class id `arcane_sorcerer`; `src/game/astronomer.js`, `src/gfx/cosmos.js`): run `astronomer.js`. Raid bosses
  (`src/game/raid.js`, every 5th depth): run `raid.js` (and `raid_sigs.js` for `src/game/raidsigs.js`). Rings, augments or skill mastery (`src/data/rings.js`,
  `src/game/augments.js`): run `rings.js`. The town generator (`src/world/town.js`): run `town.js` with a few seeds. Town life (`src/game/townlife.js`, `src/game/townanimals.js`, `src/data/townscripts.js`, `src/game/townsfolkvisuals.js`, `src/gfx/emotes.js`): run `townlife.js`, `townsfolk.mjs` and `town_visuals.mjs`; rebuild the people sheets with `python tools/build_people_pack.py <VELSCOUR_People_and_Animals.zip>` (docs/PEOPLE_AND_ANIMALS.md). Homunculus the Proud, the blacksmith (`src/game/homunculus.js`, `src/data/homunculus.js`; 30 poses cut by `python tools/homunculus.py` from `assets/source/npc/homunculus/`; his axe story lives in `G.char.homunculus`; Varrow's great axe is a three.js model, `tools/varrowaxe3d.html`/`.js` skinned with chunks of the Runeblade skins, baked by `node tools/varrowaxe3d_bake.js` (`preview` for a turntable) into `assets/sprites/npc/varrow_axe.webp`, drawn by `src/gfx/varrowaxe.js`): run `homunculus.mjs` and `homunculus.js`. Dungeon encounters with people (`src/game/encounters.js`) and scenario/forest NPCs (`src/game/folk.js`): run `encounters.js` and `scenarios.js`. THE ETERNAL BREACH (the purple portal's challenge biome: `src/world/breach.js`, `src/game/breach.js`, `src/gfx/breach.js`, `src/data/breach.js`; docs/ETERNAL_BREACH.md; art from `python tools/eternalbreach.py`): run `breach_gen.mjs` and `breach.js`; its monsters (`breach` art) must never join the regular draws.
- Velscour waits at `FINAL_DEPTH` (500, `src/data/depth.js`); monster levels come from `depthLevel(depth)`, never the
  raw depth.

## Git / GitHub
- The working branch is `claude/amazing-rubin-kguehz`. PR https://github.com/Agilancer/velscour/pull/1
  merges it into `main`. If that PR has been merged, restart the branch from `origin/main` for new work,
  and open a new PR (unless the user says otherwise).
- Pages deploys automatically from `main` (the "pages build and deployment" action).
