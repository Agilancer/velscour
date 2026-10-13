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
node tools/tests/town.js                           # town pack: vendors/portal reachable + screenshots
node tools/tests/flow.js                           # town -> portal -> boss -> exit -> depth 2 -> death -> reload
node tools/tests/ui.js                             # skill tree, inventory, socketing, vendors
node tools/tests/mobile.js                         # 844x390 touch layout + joystick
node tools/tests/hud.js                            # HUD art: 15-slot bar keys, save migration, minimap ring, buttons, Quest Log, touch pages
node tools/tests/boss.js                           # Depth 100 Velscour arena + a depth 37 guardian
node tools/tests/raid.js [5,30,55]                 # BOSS ROOMs: seal, every ability of all 8 raid bosses, phases, wards, death
node tools/tests/mobs.js [levels]                  # monster pathing: awake monsters + guardians must reach the hero (stuck <= 2%)
node tools/tests/bot.js paladin 2                  # bot plays depths 1..2, prints balance stats
node tools/tests/skills.js wizard,gunner           # cast every skill of a class (all 16 if no arg; slow)
node tools/tests/classart.js paladin               # class art pack: catalog weapons, ability effects
node tools/tests/gear.js paladin,wizard            # hero looks: armor+helm per rarity, finishes, auras (all = 16)
node tools/tests/walls.js walls catacombs,frozen  # screenshot wall runs/corners in those biomes (docs/ART.md)
node tools/tests/pack.js catacombs,blood          # biome pack levels: arches, doors, reachability; door/arch shots
node tools/tests/titlefx.js                        # title intro: click gate, logo fade on the song clock, flame burst on the hit, eyes
node tools/tests/enemies.js                        # monster art line-ups, corpses, mixed-biome levels + guardians
node tools/tests/legion.js                         # Necromancer skeleton summons: art line-up, every minion attacks + casts
node tools/tests/familiars.js                      # pet art: every pet summon's look, random blue slimes rising + hopping
node tools/tests/pets.js [seeds]                   # minion pathing: round walls, keep up, fight round corners, leash, idle
node tools/tests/select.js [mobile]                # animated class-select portraits, 6 hero save slots, slot migration
node tools/tests/autoplay.js wizard 15 [mobile]    # auto-play soak: a new hero plays N game minutes at ~30x speed
node tools/tests/perf.js 6 wizard 1                # frame cost on a phone-sized screen: fps, update/render ms (last arg: CPU throttle)
```
Screenshots are written to `tools/tests/out/` (git-ignored). Look at them, because layout bugs don't throw.
- In cloud containers, Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and
  `harness.js` uses it automatically. Never run `playwright install`.
- Only Chromium is available, so Safari/iOS and Firefox have never been tested.

## Conventions
- Match the existing style: ES modules, 2-space indent, single quotes, dense code, short comments only where
  something is non-obvious. Shared state lives on `G` (`src/state.js`).
- All art except the user's sprite sheets is placeholder. Summons, Velscour, decor props and items are ASCII pixel art in
  `src/gfx/pixelart.js`, and the town (ground, transitions, buildings, trees, props) comes from the Overworld and Town pack
  (`assets/source/biomes/town/`, `python3 tools/process_assets.py town`, `tools/townpack.py`; see docs/ART.md). Monsters use the user's sheets in
  `assets/source/enemies/<set>/`, imported by `python3 tools/process_assets.py enemies` and catalogued in
  `src/data/bestiary.js`; see [`docs/ENEMY_ART.md`](docs/ENEMY_ART.md). New uploads ("Enemy Assets Set N") go there too;
  set 2 (`Enemy_300.zip`, 300 single sprites) lives in `set2/<family>/` folders, each packed as one sheet and loaded per level. Pet sheets (JPEGs on a flat background) live in `familiars/` (`process_assets.py enemies familiars`). The user's sheets are in
  `assets/source/` and get sliced by `tools/process_assets.py` (needs `pip install pillow numpy scipy`; args
  `sprites|biomes|props`). Dungeon floors, walls, arches, doors and scatter come from **biome packs**
  (`assets/source/biomes/<Name>_Biome_Pack.zip`, a 160x80 template; Catacombs is the first, every biome uses it
  palette-swapped), imported by `python3 tools/process_assets.py biomes` (`tools/biomepack.py`). New packs follow the
  same template; see [`docs/ART.md`](docs/ART.md).
  The hero's look comes from the gear libraries `assets/FinalClasses/<class>.zip` (80 armors + 80 helms per class),
  imported by `python3 tools/process_assets.py gear [class]`. Class art packs (Paladin weapons, ability effects) go in
  `assets/source/classes/<class>/` and are imported by `python3 tools/process_assets.py classes [class]`; both are in
  [`docs/CLASS_ART.md`](docs/CLASS_ART.md). The animated class-select portraits come from
  `assets/FinalClasses/All 16 Classes.png` (`python3 tools/process_assets.py select`, drawn by `src/ui/heroanim.js`).
  The user's sound zips live in `assets/source/audio/` and are transcoded to MP3 in `assets/audio/` by
  `python3 tools/process_assets.py audio` (needs ffmpeg; `tools/audiopack.py`). `src/core/audio.js` maps game sounds
  to samples (`SAMPLES`), songs to areas (`MUSIC`) and ambient beds to biomes (`AMB`).
  The HUD art (`assets/source/hud_bar.webp`: orbs + 15 skill / 4 potion slots; `hud_frames.webp`: minimap ring + six
  buttons) is cut by `python3 tools/process_assets.py ui` into `assets/ui/` (`hud.webp`, `hud.json`, `minimap_ring.webp`,
  `btn_<name>.webp`). The skill bar's slot order, keys and save migration live in `src/data/bar.js`.
  Never hand-edit the generated files in `assets/sprites|ui|tiles|audio`.
- Paths must stay **relative** (`assets/...`, `src/main.js`, never `/assets/...`), because the site is served
  from the `/velscour/` subpath on GitHub Pages. The `/src/...` imports in `tools/tests/` are fine, because the
  tests run against a local server at the root.
- Saves live in localStorage under `velscour_saves_v1`, one hero per save slot (6 slots, `c.slot`). If you change the save shape, extend `migrate()` in
  `src/game/save.js` so existing heroes keep loading.
- After any gameplay change, run at least `flow.js` and the `skills.js` classes you touched. Run `mobile.js`
  and `hud.js` for UI changes. Changes to skills, items, vendors or monster AI can confuse auto-play (`src/game/autoplay.js`), so run
  `autoplay.js` for a class or two as well. Changes to minion AI or `map.findPath`: run `pets.js` and `legion.js`.
  Changes to monster movement (`Monster.navTo/chase`, `map.move`, the flow field): run `mobs.js`. Raid bosses
  (`src/game/raid.js`, every 5th depth): run `raid.js`.

## Git / GitHub
- The working branch is `claude/amazing-rubin-kguehz`. PR https://github.com/Agilancer/velscour/pull/1
  merges it into `main`. If that PR has been merged, restart the branch from `origin/main` for new work,
  and open a new PR (unless the user says otherwise).
- Pages deploys automatically from `main` (the "pages build and deployment" action).
