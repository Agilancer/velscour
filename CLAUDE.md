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
node tools/tests/flow.js                           # town -> portal -> boss -> exit -> depth 2 -> death -> reload
node tools/tests/ui.js                             # skill tree, inventory, socketing, vendors
node tools/tests/mobile.js                         # 844x390 touch layout + joystick
node tools/tests/boss.js                           # Depth 100 Velscour arena + a depth 37 guardian
node tools/tests/bot.js paladin 2                  # bot plays depths 1..2, prints balance stats
node tools/tests/skills.js wizard,gunner           # cast all 60 skills per class (all 16 if no arg; slow)
node tools/tests/walls.js walls catacombs,frozen  # screenshot wall runs/corners in those biomes (docs/WALLS.md)
```
Screenshots are written to `tools/tests/out/` (git-ignored). Look at them, because layout bugs don't throw.
- In cloud containers, Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and
  `harness.js` uses it automatically. Never run `playwright install`.
- Only Chromium is available, so Safari/iOS and Firefox have never been tested.

## Conventions
- Match the existing style: ES modules, 2-space indent, single quotes, dense code, short comments only where
  something is non-obvious. Shared state lives on `G` (`src/state.js`).
- All art except the user's sprite sheets is placeholder. Monsters, props and items are ASCII pixel art in
  `src/gfx/pixelart.js`, and town buildings are drawn in `src/gfx/townart.js`. The user's sheets are in
  `assets/source/` and get sliced by `tools/process_assets.py` (needs `pip install pillow numpy scipy`; args
  `sprites|tiles|props`). Environment art and the biome -> art mapping are documented in [`docs/ART.md`](docs/ART.md).
  Never hand-edit the generated files in `assets/sprites|ui|tiles`.
- Paths must stay **relative** (`assets/...`, `src/main.js`, never `/assets/...`), because the site is served
  from the `/velscour/` subpath on GitHub Pages. The `/src/...` imports in `tools/tests/` are fine, because the
  tests run against a local server at the root.
- Saves live in localStorage under `velscour_saves_v1`. If you change the save shape, extend `migrate()` in
  `src/game/save.js` so existing heroes keep loading.
- After any gameplay change, run at least `flow.js` and the `skills.js` classes you touched. Run `mobile.js`
  for UI changes.

## Git / GitHub
- The working branch is `claude/amazing-rubin-kguehz`. PR https://github.com/Agilancer/velscour/pull/1
  merges it into `main`. If that PR has been merged, restart the branch from `origin/main` for new work,
  and open a new PR (unless the user says otherwise).
- Pages deploys automatically from `main` (the "pages build and deployment" action).
