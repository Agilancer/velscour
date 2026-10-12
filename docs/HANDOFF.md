# VELSCOUR: hand-off notes

These notes let a new session with no memory of earlier ones pick up the work immediately.
**Keep them current**: when you finish a chunk of work, update *Status*, *Open issues* and *Next steps*.

Contents
1. [The user's requirements](#1-the-users-requirements) (the spec)
2. [Decisions and interpretations](#2-decisions-and-interpretations)
3. [Status](#3-status) (what's done, where it lives, how it was verified)
4. [Open issues and risks](#4-open-issues-and-risks)
5. [Next steps](#5-next-steps)
6. [Working environment notes](#6-working-environment-notes)
7. [Subsystem reference](#7-subsystem-reference) (written from the code, not fact-checked)

---

## 1. The user's requirements

The user (GitHub `Agilancer`) asked for a rough draft of **"VELSCOUR"**, an epic isometric retro-pixel-art
**Diablo 2 clone**, playable **in a web browser on PC and mobile**. They attached five images, now in
`assets/source/`: a 16-class character design sheet, the VELSCOUR logo, a HUD bar, an isometric catacomb
floor-tile sheet and a catacomb wall sheet.

Requirements, as stated (✅ = implemented in the draft):
- ✅ **16 selectable classes** from the class sheet, using the full-body sprite as the placeholder character sprite:
  Paladin, Ranger, Wizard, Necromancer, Barbarian, Dragoon, Totem Master, Death Knight, Arcane Sorcerer,
  Carrion Witch, Bard, Slime Lord, Boomerang Knight, Lancer, Dragon Knight, Gunner.
- ✅ **Sophisticated skill trees per class, 60 unique skills/abilities per class.** New abilities unlock as you level,
  and default abilities are gained on level-up. Levels give skill points.
- ✅ A **skill menu** to spend points, and a **skill equip menu** to read skill descriptions and drag skills onto the bar.
- ✅ **8 abilities on keys 1–8, one on left click, one on right click; 4 potion slots on Z, X, C, V.**
- ✅ **Lots of blood and gore.** Effects: walls of fire, slime, spinning hammers, cyclones, lightning, slashing,
  explosions, magic missiles, arcane blasts, energy beams, swirling blades, death lasers, "and more".
- ✅ Placeholder isometric art, with **palette swaps** for hundreds of enemies, weapons, armor, gems, houses and NPCs.
- ✅ A **town** with weapon and armor vendors, upgraders, enchanters, gem vendors and gem-slot adders "etc.", and a
  **portal at the edge of town** into procedurally generated catacombs/dungeons.
- ✅ **20 biomes**, with **dozens of enemy types per biome**.
- ✅ Each level should take **at least a couple of minutes** from entrance to exit, be a bit of a **maze**, have
  enemies throughout, and end with a **boss**.
- ✅ Enemies drop **health/mana orbs, gold piles, and weapons/shields/armor/gems** in common/uncommon/rare/epic/
  legendary rarity, and give **XP per kill**.
- ✅ **Inventory**: equip weapon/shield, head, body, hands, legs and feet. **Gems socket into gear (1–6 sockets, with
  rarer gear getting more)** and give stat bonuses, better class skills, or new shot patterns.
- ✅ Levels are generated from the provided **isometric floor and wall sprite sheets**.
- ✅ At the exit, ask whether to **continue to the next level (new random biome)** or **head back to town**. If you go
  back to town, the town portal leads into the next biome.
- ✅ On **death**, return to town keeping all gear, XP, levels and skills, but "start over at level 1"
  (see Decisions).
- ✅ Difficulty increases up to **level 100**, where the final boss is **"DEMON LORD VELSCOUR"**.
- Follow-up messages: "It's meant to be played in a web browser on PC and mobile!" Later: "Yes, into main. Push the
  build out so I can test it on GitHub." Later still: "Make sure to leave detailed notes so that you will be able
  to pick up right from where you left off in a new session." (that request produced this file).

## 2. Decisions and interpretations
- **"Start over at level 1" on death means Depth 1.** The hero keeps their character level, gear, XP and skills,
  and the descent restarts at dungeon Depth 1. The user was told about this reading and has not objected yet.
  If they meant character level 1, change `onPlayerDeath` in `src/game/game.js`.
- **"Level 100" means Depth 100.** Depth 100 is a special throne gauntlet ending in DEMON LORD VELSCOUR. After
  the victory screen, "Endless Torment" depths continue past 100.
- **Tech stack:** vanilla JS ES modules and Canvas 2D, with no framework and no bundler. GitHub Pages can serve the
  repo as-is, and the code is easy to change.
- **Art:** the user's sheets are sliced by `tools/process_assets.py`. Dungeons use the user's 10 floor/wall tile
  sets, 5 scatter sheets and 20 barricade sets, mapped onto the 20 biomes (see [`ART.md`](ART.md)). Monsters use the
  user's 7 monster sheets (70 monsters, [`ENEMY_ART.md`](ENEMY_ART.md)). Everything else
  is placeholder ASCII pixel art with palette swaps (summons, Velscour, items) or is drawn procedurally (town buildings). The README tells the user
  how to swap in real art.
- **Enemy variety:** 22 AI archetypes, played by 70 painted monsters (`src/data/bestiary.js`; each has a main
  archetype and maybe a few it can stand in for). Each level rolls up to 2 looks per roster archetype, each
  palette-swapped from the biome's swap list. A darker "greater" breed exists for each, and uniques get a random swap.
  Guardians come from 17 boss-flagged monsters. Velscour keeps his own pixel sprite: no sheet has a demon lord.
- **Biome order:** the user asked for biomes to be random and not go in order. Biomes are drawn from a per-hero
  shuffle bag (`drawBiome`), so all 19 come up before any repeats, and the first descent is random, no longer
  always the catacombs. **Like-coloured mixing:** about 65% of levels borrow floors (in the far chunks) and maybe
  walls from another biome in the same colour family ([`ART.md`](ART.md)).
- **Mobile:** a floating virtual joystick, plus a right-hand skill-button cluster with auto-aim (tap to cast,
  hold to repeat, long-press to reassign). The game asks for fullscreen and landscape when a touch device taps a
  title-screen button. A PWA manifest lets it be installed fullscreen.
- **Sound:** procedural WebAudio sound effects and ambient music, with no audio files.

## 3. Status

**Branch / PR:** all work is on `claude/amazing-rubin-kguehz`. PR https://github.com/Agilancer/velscour/pull/1
(→ `main`) is open, and the user is to click Merge. The auto-mode permission check blocked Claude from merging,
with the reason "Merge Without Review". GitHub Pages is already enabled on the repo and deploys from `main` (an
earlier "pages build and deployment" run deployed the initial README commit), so merging PR #1 publishes the game
at https://agilancer.github.io/velscour/.
→ **First thing in a new session:** check whether PR #1 is merged. If it is, restart the branch from `origin/main`
before new work, as `CLAUDE.md` explains.

Commits so far: `a22f258` engine/data/world/combat/skills WIP → `7cc85a9` playable draft with UI and mobile
controls → `6657e14` fixes from browser testing → then the hand-off notes and test harness commit.

**Verified (headless Chromium via Playwright; scripts now in `tools/tests/`):**
- All **960 skills** (16 × 60) were cast in live dungeons with **0 exceptions and 0 no-op casts** (`skills.js`).
- A bot Paladin cleared Depth 1 (`bot.js`): 81 kills, guardian dead at about 80 s of game time, exit reached,
  level 5, 0 deaths, 1 potion used.
- The full flow worked (`flow.js`): new hero → town portal dialog → dungeon → guardian slain → exit dialog →
  Depth 2 in a random biome → death screen → town at Depth 1 → page reload → Continue restored the save.
- Desktop UI worked (`ui.js`): skill tree learn and assign, inventory tooltips, drag-socketing a gem into the
  weapon, combining gems, +1 upgrade, gambling, portal dialog.
- Mobile at 844×390 touch worked (`mobile.js`): title, class select, town, vendor next to inventory, joystick,
  ATK button, skill tree, inventory. The layout was fixed to stop buttons overlapping.
- Bosses worked (`boss.js`): the Depth 100 throne with DEMON LORD VELSCOUR (all 8 attack patterns) and a depth 37
  guardian.

**Not verified:**
- Safari/iOS, Firefox, real phones.
- The site served from the GitHub Pages subpath. All paths are relative, so it should work.
- Balance past roughly Depth 10.
- Long-session memory and performance on low-end phones.

## 4. Open issues and risks
Ordered roughly by how likely they are to hurt the user's first test. The fact-checked per-subsystem issue lists
are in section 7.
1. **Untested on iOS Safari and Firefox.** Things to check:
   - `ctx.filter`, which only newer Safari versions support. It's used for frozen/charmed tints at
     `src/game/creature.js:168-174`. Without it the tint just doesn't show, so nothing crashes.
   - Audio unlock on iOS.
   - The Fullscreen API: unsupported on iPhone, so `goFullscreen()` in `src/ui/screens.js` should fail quietly.
   - Long-press callouts and text selection on touch.
   - `100vh` sizing on iOS.
2. **iOS canvas memory limit.** Safari caps total canvas memory. The game caches many offscreen canvases: recolored
   biome tile atlases (LRU keeps 3 non-town sets; a mixed level holds 2), monster art (an LRU of 160 canvases,
   about 70 KB each, in `src/core/enemyart.js`), memoized pixel/flash sprites, and corpse images. Measure this
   before adding more caches.
3. **Balance is a first pass.** Monster scaling is `monsterBase(L)` in `src/game/monster.js`
   (hp 20·1.066^(L−1), dmg (3+min(L,10)·0.15)·1.052^(L−1)). Player XP is `xpToNext(L) = 60L²+40L` in
   `src/game/player.js`. Depths 50–100 have never been played.
4. **Caching on GitHub Pages:** pages are served with about a 10-minute cache and the module imports carry no
   version. Right after a deploy a browser may briefly mix old and new modules, and a hard refresh fixes it.
   Consider adding a version query to `src/main.js` if this causes trouble.
5. **Placeholder art.** Character sprites are single frames with no walk/attack animation.
6. **Environment art** (branch `claude/relaxed-wright-tc4lrv`). Walls are built from seamless strips with posts at corners
   and a soft cutaway behind walls ([`WALLS.md`](WALLS.md)). The user then uploaded 29 sheets: 10 floor/wall tile sets,
   5 scatter-terrain sheets and 4 barricade sheets. Every biome now has its own floors and walls, scatter obstacles,
   barricades and chest art, loaded per biome ([`ART.md`](ART.md)). Verified by screenshots of all 20 biomes, a
   300-level reachability stress run, and flow/mobile/boss/ui/bot tests.

7. **Class art (branch `claude/paladin-art-import`).** The Paladin pack (moved to `assets/source/classes/paladin/`) is imported
   by `tools/classart.py` (`process_assets.py classes`): 60 outfits x 12 poses, 120 item icons, 60 effect strips, all
   catalog entries found. In game: catalog items + Mythic rarity, outfit by equipped body armor (ATK/CAST poses, CAST1 as
   idle), effects per skill. The user chose: add Mythic; armor art replaces the Paladin sprite entirely. Verified with
   `classart.js` screenshots plus flow/ui/mobile/skills/bot/boss. Details and the mapping table: [`CLASS_ART.md`](CLASS_ART.md).
   Not done: idle/run/hit/death art (none supplied), helmet/weapon overlays on the figure (separate item art only).

8. **Monster art and biome order (branch `claude/admiring-fermat-wbun4l`).** The user uploaded
   `assets/Enemy Assets Set 1/` (7 sheets x 10 monsters, transparent) and asked for them to replace the placeholder
   enemies, some as bosses, with many palette swaps. They also asked for random biome order and for like-coloured
   biomes to mix tile sets, and said more enemy sheets will come. Done:
   - The sheets were moved to `assets/source/enemies/set1/` and are sliced by `process_assets.py enemies`.
   - The bestiary, swaps and boss pool are in `src/data/bestiary.js`, and the loader/cache in `src/core/enemyart.js`.
   - Added the shuffle-bag biome order and mixed tile sets.
   - Details are in [`ENEMY_ART.md`](ENEMY_ART.md) and [`ART.md`](ART.md).
   - Verified with `data_check.mjs`, `enemies.js` screenshots (line-ups and 6 biomes with guardians), flow, boss,
     ui, mobile, bot (paladin depths 1-2) and skills (necromancer and carrion witch, for corpse revives).
   - The bot sometimes stalls on a level (about 1 run in 2). The unchanged base code does the same, so the cause
     is the bot's navigation, not the new art.

## 5. Next steps
Do these in order, unless the user asks for something else. Their feedback after testing comes first.
1. Get PR #1 merged (by the user) and confirm the Pages deploy works at https://agilancer.github.io/velscour/.
2. Act on the user's playtest feedback.
3. Pre-release hardening, which was offered to the user but not yet run:
   - an iOS Safari / Firefox compatibility pass (static API audit plus fixes)
   - an audit of paths and caching under the GitHub Pages subpath
   - a canvas-memory budget check
   - phone and tablet layout checks at several viewport sizes (`mobile.js` with other sizes)
   - long soak runs with `bot.js` at deeper depths, watching for errors, NaN and softlocks
4. A balance pass for depths 10–100, using `bot.js` with several classes.
5. Roadmap ideas from the README: animated character sprites, set items, a stash, waypoints, rune words, multiplayer.
6. More monster sheets are coming ("Enemy Assets Set 2", ...). Import them as [`ENEMY_ART.md`](ENEMY_ART.md)
   describes: move them, slice them, then add bestiary entries.
7. `assets/FinalClasses/` holds class art zips for all 16 classes (uploaded with the monster sheets) and
   `All 16 Classes.png`. Only the Paladin pack is imported so far ([`CLASS_ART.md`](CLASS_ART.md)). Ask the user
   before importing the rest.

## 6. Working environment notes
- Claude cloud container: Node 22 with playwright under `/opt/node22/lib/node_modules` (set `NODE_PATH`), and
  Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. There's no WebKit or Firefox. Do not run
  `playwright install`.
- Outbound network goes through a proxy. In the last session `agilancer.github.io` was **blocked**, so the live
  Pages site could not be fetched from the container. Check deploys through the GitHub MCP tools instead
  (`actions_list` → "pages build and deployment" runs).
- There is no `gh` CLI or direct GitHub API. Use the `mcp__github__*` tools for PRs, Actions and so on.
- In the last session, after a merge attempt was refused, the auto-mode permission check kept refusing even
  read-only Bash commands for the rest of the session ("Merge Without Review"). Read/Grep/Glob/Write/Edit kept
  working. If that happens, use the file tools and ask the user to handle the git step.
- Background `python3 -m http.server` processes are stopped when they hit the background time limit. Restart the
  server when needed.
- Commit messages end with the session attribution lines the harness provides. Never put model names in commits,
  PRs or code.

## 7. Subsystem reference

> These sections were written by reading the code. The fact-checking pass and the *Game flow, saves, controls
> and UI* section did not finish because the session hit its usage limit. Treat details as likely but not
> guaranteed, and confirm against the code before relying on them.

## Boot, core engine, graphics & asset pipeline

### Files
- `index.html` - page shell. `#game` canvas (:21), DOM HUD `#hud` (:24) with `#minimap` 180x180 canvas (:31), `#hud-bar` + `<img id=hud-img src=assets/ui/hud.webp>` (:43-52), `#touch-ui` joystick (:56), `#panels`/`#screens`/`#tooltip`/`#drag-ghost` (:61-64), `#rotate-hint` (:65), `#loading` (:70). Loads Google Fonts Cinzel + Alegreya Sans over the network (:16) and `src/main.js` as a module (:72).
- `css/style.css` - all DOM UI styles. Tokens are on `:root` (:2-20), including `--hud-w`. `body.touch` overrides start at :245. Panel and log offsets hard-code the HUD aspect `0.1575` = 315/2000 (:94, :99, :254), and `#hud-bar` has `aspect-ratio: 2000/315` (:51).
- `manifest.webmanifest` - PWA metadata: fullscreen, landscape, icon `assets/ui/icon.png` (512x512). There is no service worker, so the game has no offline support.
- `src/main.js` - `boot()`, `resize()` (DPR), the rAF `loop()`, the title-screen ember backdrop and global error reporting.
- `src/ui/titlefx.js` - `attachTitleFx(screen, logoImg)`: the title logo's flames, embers and sparks, the black tar that drips from its spikes and piles on the floor, and the spark that ignites the pile into a chain of explosions. It simulates in coarse units (`PX` css px) but draws at device resolution (`.title-fx` canvas over the title screen): tiny particles batched by colour/alpha, plus a low-res glow copy upscaled with smoothing. Particles are capped at 8000. It samples the logo alpha once for emitter points, and its rAF loop stops when the screen leaves the DOM. Tuning: `REPOSE`, drip `max`/`rate`, and the fated-spark condition in `frame()`. Tests: `tools/tests/titlefx.js` (uses the `canvas.fx` hooks).
- `src/state.js` - the `G` singleton and settings persistence in localStorage.
- `src/core/util.js` - math, random and seeded RNG, colour helpers, canvas helpers (`makeCanvas`, `recolor`, `scaleImage`) and DOM helpers.
- `src/core/view.js` - iso constants and projection, plus the `camera` object.
- `src/core/input.js` - the `input` state object (keys, mouse, joystick, world touch) and `initInput(canvas)`.
- `src/core/audio.js` - procedural WebAudio sound effects (38 named sounds) and drone music. The game ships no audio files.
- `src/core/assets.js` - loads images and JSON into `A`, caches scaled class sprites, builds recoloured per-biome tile sets, makes potion icons.
- `src/gfx/pixelart.js` - ASCII sprite table `SPRITES`, the renderer (outline, rim shading, palettes), palette hue-shift, gem and gold icons.
- `src/gfx/vfx.js` - element palette `ELEM`; pools for particles, decals, effects, texts and lights; effect classes; update and draw functions.
- `src/gfx/shapes.js` - procedural projectile looks (`drawShape`), projectile trails, `explosionFx`, `hitSpark`.
- `src/gfx/townart.js` - procedural town ground tiles and isometric building sprites.
- `tools/process_assets.py` - offline slicer that turns `assets/source/*` into `assets/{sprites,ui,tiles,props}`. Needs `pip install pillow numpy scipy`. Args: `sprites`, `tiles`, `props` (default all).
- `assets/source/` - the user's original sheets: `classes_sheet`, `logo`, `hud_bar` (`.webp`), plus `floors/`, `walls/`, `scatter/`, `barricades/` (`.png`, see [`ART.md`](ART.md)). The game never loads these.
- Generated files:
  - `assets/sprites/classes/<id>.webp` (16) and `classes.json` (w/h per class; the game does not load it).
  - `assets/ui/`: `logo.webp`, `hud.webp`, `hud.json`, `icon.png`, `potion_{red,blue,purple,orange}.png`.
  - `assets/tiles/`: `<set>_floor.webp`, `<set>_walls.webp`, `<set>.json` for the 10 tile sets.
  - `assets/props/`: one atlas per scatter sheet, `barricades_<set>.webp` x20, `props.json`.

### Key APIs
- **state.js**
  - `G` (:2) has these declared fields:
    - `canvas`, `ctx`.
    - `W`, `H` in CSS px; `dpr`; `touch`.
    - `assets` (always null; assets live in `A`).
    - `world`, `player`, `char`.
    - `mode`: `'loading'|'title'|'game'`.
    - `paused`, `time`, `dt`, `frame`, `hitStop`.
    - `settings{sfx:.6, music:.35, gore:2 (0 off/1/2 extreme), dmgNumbers:true, shake:true, zoom:1}`.
  - Other modules attach these ad-hoc fields to `G`:
    - `input`, `controls`, `game` (main.js:89-91); `dismissedRotate` (main.js:98).
    - `flash` (shapes.js:257, skillrun.js:228); `hurtFlash` (combat.js:89).
    - `hover` (controls.js:77); `lootBoxes` (render.js:299).
    - `showAutomap` (game.js:328); `ui` (ui.js:16); `touchUI` (touch.js:19).
  - Settings keys that exist only through the settings dialog (screens.js:139-141): `autoLoot`, `pauseMenus` (read as `!== false`, so it defaults to on), `showGoldLabels`.
  - `SETTINGS_KEY='velscour_settings_v1'` (:29). `loadSettings()` (:31) uses `Object.assign`, so unknown keys survive. `saveSettings()` (:37).
- **util.js**
  - `TAU`, `DEG`; `clamp`, `lerp`.
  - `rand(a=1,b?)`: with one arg returns [0,a); with two returns [a,b). `randi(a,b)` is inclusive.
  - `chance`, `pick`, `dist`, `dist2`, `angleTo`, `angleDiff`, `shuffle(arr,rng)`, `weighted([[v,w]..],rng)`, `hashStr` (FNV-1a).
  - `class RNG(seed)` (:52), mulberry32. Methods: `next()`, `range(a,b)`, `int(a,b)`, `pick`, `chance`, `fn()`.
  - `fmt(n)` (k/M/B suffixes), `fmtInt`.
  - `hexToRgb`, `rgbToHex`, `mixHex`, `shade(hex,f)` (f>0 toward white, f<0 toward black), `rgba(hex,a)`, `rgbToHsl`, `hslToRgb`.
  - `makeCanvas(w,h)` (:129).
  - `recolor(src, params, sx,sy,sw,sh)` (:141) returns a new canvas. It is a per-pixel HSL pass with `params{hue°, sat×, light+, contrast×(around .5), tint:[r,g,b,amt], colorize:[h°,s]}`. Order: colorize → hue → sat → contrast/light → tint (tint is weighted by `l*1.4`). Pixels with alpha 0 are skipped.
  - `scaleImage(src,targetH)` (:176) downscales in halving steps.
  - `el(tag,cls,html)`, `escapeHtml`.
- **view.js**
  - Constants: `TW=64`, `TH=32`, `HW=32`, `HH=16` (:5-8).
  - `isoX(x,y)=(x-y)*HW`, `isoY(x,y)=(x+y)*HH` (:10-11).
  - `screenDirToTile(dx,dy)` (:14) turns a screen-direction vector into a tile direction; used for WASD and the joystick.
  - `camera` (:20) has fields `x, y` (world px at screen centre), `zoom`, `shakeAmt/X/Y`, and these methods:
    - `follow(tx,ty,dt,snap)` (:27)
    - `shake(a)` (:34)
    - `update(dt)` (:35)
    - `computeZoom()` (:42)
    - `apply(ctx)` (:48): world px → device px
    - `toScreen(wx,wy)` → CSS px (:55)
    - `tileToScreen(tx,ty,z)` (:58)
    - `screenToTile(sx,sy)` CSS px → tile (:62)
    - `viewRect(margin)` (:68): world-px rect `{x0,y0,x1,y1}`
- **input.js**
  - `input` (:6) fields:
    - `keys: Set<e.code>` (held), `pressed: Set<e.code>` (edges this frame).
    - `mouse{x,y,left,right,leftPressed,rightPressed,inside}`.
    - `joy{active,id,ox,oy,x,y,vx,vy}`.
    - `worldTouch{id,x,y,pressed}|null`, `lastPointerType`, `enabled` (unused).
  - `input` methods: `down(code)`, `consume(code)` (destructive edge read), `endFrame()`, `reset()`, `endJoy()`.
  - `initInput(canvas)` (:44).
- **audio.js**
  - `initAudio()` (:8): creates or resumes the AudioContext. The only caller is a title-menu button click (screens.js:37).
  - `applyVolumes()` (:25).
  - `sfx(name, vol=1, pitch=1)` (:98). Valid names are the keys of `SOUNDS` (:57):
    - Elements: `swing hit crit squish gore bones fire cold light arcane holy shadow poison acid blood phys`
    - Other: `explode shoot bow pickup gold orb potion levelup portal ui error boss die summon heal buff thud roar hurt block sonic note`
  - `playMusic(kind)` (:118): `'town'`, `'boss'`, or anything else, which plays as dungeon. No-op if that kind is already playing.
  - `stopMusic()` (:149).
- **assets.js**
  - `CLASS_IDS` (:4): 16 ids in sheet order.
  - `A` (:11): `{classes, classScaled, hud, hudGeo, logo, potions, tileSets, propMeta, propImgs, biomeSets}`. `tileSets`/`propImgs` hold a Promise while loading.
  - `loadBiomeArt(biome)` fetches the biome's tile set, scatter sheets and barricades; `enterDungeon` awaits it.
  - `loadAssets(progress)` (:33).
  - `classSprite(id,h,palette)` (:49): cached, keyed `${id}|${h}|${JSON.stringify(palette)}`.
  - `biomeTileSet(biome)` (:65) returns `{floors,details,thresholds,segFwd,segBack,pillars,corners,rubble,towers,misc,arch,gate,floorImg,wallImg,walls,scatter,barricades:{fwd,back},chest}`, built from `biome.art` (falls back to `skull` until loaded) and cached by `biome.id|art`. Entries look like `{img,sx,sy,w,h[,slope,base,kind]}`. `floors` are sorted calm -> busy. `walls` holds 24 composed seamless wall sections `{img(canvas),sx:0,sy:0,w:46,h,base}` from `composeWalls` (see [`WALLS.md`](WALLS.md)). `pillars` is sorted widest first.
  - `potionIcon(color,size=48)` (:100): **uncached**, makes a new canvas on every call.
- **pixelart.js**
  - `SPRITES` (:8), 68 entries:
    - Monsters (:9-357): skeleton … abomination, velscour.
    - Summons (:359-505): totem, turret, drone, bird, dragon, banner, cauldron, tesla, scarecrow, lantern, drum, cloud, hydra, hive.
    - Props (:507-611): tree, pine, barrel, crate, lamp, well, grave, rock, bush, anvil.
    - Item icons (:613-859): sword … boots.
  - `spriteSize(name)` → `[w+2,h+2]` (:871).
  - `pixelSprite(name, pal={}, scale=4, opts)` (:892). `opts.flash` gives a white silhouette; `opts.dark` gives a corpse tint.
  - `shiftPalette(pal,{hue,sat,light})` (:933) leaves `e` and `o` unchanged. `shiftHex` (:941).
  - `gemIcon(kind,color,tier=3,size=48)` (:967), using `GEM_SHAPES` (:961).
  - `goldIcon(size,amount)` (:1005) has 3 pile sizes, at amount >100 and >500.
- **vfx.js**
  - `ELEM` (:6) entries are `{name, core, glow, dark, sfx}` for `phys fire cold light poison arcane holy shadow blood acid`. `elem(k)` (:18) falls back to `phys`.
  - Exported arrays (:21-25): `particles`, `decals`, `effects`, `texts`, `lights`.
  - `glowSprite(hexColor)` (:29) returns a 64x64 radial gradient, cached.
  - `spawn(p)` (:81). Particle types: `dot glow blood gib streak smoke shard img`.
  - `burst(x,y,z,el,n=12,speed=3,{type,up,g,life,size})` (:91).
  - `sparkle(x,y,z,color,n=1,spread=.3)` (:104).
  - `smoke(x,y,z,color,n=4,size=8)` (:110).
  - `bloodSpray(x,y,z,angle,n,color,force=1)` (:117).
  - `gibs(x,y,z,n,color,boneColor,force=1)` (:129).
  - `addDecal(x,y,color,size=1,kind='splat'|'pool'|'scorch'|'frost',alpha=.9)` (:144).
  - Effect classes:
    - `Ring(x,y,r0,r1,dur,color,width=4,{z=2,fill,add=true})` (:152)
    - `Slash(x,y,ang,arc,r,dur,color,{z=22,width=10,flip})` (:168)
    - `screenAngle(tileAng)` (:198)
    - `Bolt(x0,y0,z0,x1,y1,z1,color,dur=.25,width=3)` (:203): rebuilds its jagged path every 0.05 s
    - `Beam(x0,y0,x1,y1,color,width,dur,{z=24,core,wobble})` (:243)
    - `Column(x,y,color,dur=.5,width=18,height=260)` (:264)
    - `Telegraph({kind:'line'|circle, x,y,dur,r | ang,len,w, color})` (:281)
    - `Sprite(x,y,z,img,w,h,dur,{add,rise,grow})` (:305)
  - `addEffect(e, layer='top'|'ground')` (:318).
  - `floatText(x,y,z,text,color,size=14,{life=.9,vz=45,crit,dmg})` (:320).
  - `addLight(x,y,radius,intensity)` (:325), capped at 48.
  - `clearVfx()` (:329), `updateVfx(dt,world)` (:334).
  - Draw functions: `drawDecals(ctx,vr)` (:375), `drawEffects(ctx,layer)` (:398), `drawParticles(ctx,vr)` (:407), `drawTexts(ctx)` (:463, identity transform).
- **shapes.js**
  - `drawShape(ctx,fx,x,y,a,s,E,t,extra)` (:21) takes **world px** and a **screen angle**. The `extra` argument is unused. `fx` values:
    - arrow, javelin, spear, bone
    - bullet, hammer
    - blade, axe, chakram, rang, disc
    - skull, spirit
    - shard, ice, tooth
    - crow, feather, locust
    - note
    - blob, acid, blood
    - star, firework
    - rocket
    - bomb, rock, totem, meteor
    - wave
    - wolf, dragon (these use `pixelSprite`)
    - rune, card
    - fireball, chain
    - default case: bolt, orb, missile, spark
  - `trail(fx,x,y,z,E,dt,s)` (:219) takes **tile coords**.
  - `explosionFx(x,y,r,el,fx='explosion',{shake,shakeMul,sound})` (:241). Variants: meteor/nuke/eruption, pillar/holy, void, firework, sonic, blizzard/frost, default. Its radius `r` is in tiles.
  - `hitSpark(x,y,z,el)` (:286).
- **townart.js**
  - `groundTile(kind:'grass'|'dirt'|'cobble'|'plaza', seed)` (:18) returns a 192x96 canvas: drawn at 64x32, then nearest-neighbour upscaled 3x.
  - `buildingSprite({w,d,wall,roof,style:'timber'|'stone',door:'sw'|'se',sign,signPal,h=52,roofH,tower,chimney,seed=7})` (:79) returns `{img (2x supersampled), ox, oy, scale:.5, w, h}`. Draw it at `(isoX(x0,y0)-ox, isoY(x0,y0)-oy)` with size `w,h` (render.js:76-82).

### How it works
**Boot** (`main.js:83`), in order:
1. `loadSettings`.
2. Canvas with `getContext('2d',{alpha:false})`, so every frame must fully repaint.
3. `G.touch` = `(pointer: coarse)` OR (`ontouchstart` && `maxTouchPoints>0`). If touch: add `body.touch` and set `settings.autoLoot=true`.
4. `resize()` plus `resize`/`orientationchange` listeners (the latter delayed 200 ms).
5. `initInput(canvas)`.
6. `UI.init()`; set `UI.vendor`.
7. `error`/`unhandledrejection` → `reportError`; `beforeunload`/`visibilitychange(hidden)` → `game.autosave()`.
8. Start the rAF loop. It draws the ember backdrop while assets load.
9. `await loadAssets(progress)`. On failure it shows a "serve over http" message and returns.
10. `HUD.init()`; `TouchUI.init()` if touch; `applyVolumes()`.
11. Hide `#loading`; `titleScreen()` sets `G.mode='title'`.
12. `window.VELSCOUR={G,game}` as a console debug handle.

**Frame** (`main.js:56`):
- Setup: `dt=min(.05,…)` (slow motion below 20 fps), then `G.time+=dt`, `G.frame++`.
- If `G.mode==='game' && G.world`, the frame runs `game.update(dt); game.render()`. Otherwise it runs `renderTitle(dt)`.
- Exceptions are caught and sent to `reportError`. Only the first 4 reach `UI.log`; all go to the console.
- After that, `input.endFrame()` always runs, then the next rAF is requested.
- `game.update` (game.js:319) order:
  1. Key toggles (I/K/T/B/H/Tab/M/Esc).
  2. `G.paused = ui.modal || (pauseMenus && dungeon && panel open)`.
  3. If `hitStop>0`, only `controls.update(0)` runs. Otherwise, unless paused, `controls.update(dt)` and `world.update(dt)` run. `world.update` ends with `ambient()` (lights and particles) and then `updateVfx` (world.js:114-115).
  4. When paused, `input.endFrame()` is called early.
  5. `camera.follow`, `camera.update`; `flash`/`hurtFlash` decay.
  6. `HUD.update`, `TouchUI.update`; autosave every 30 s.
- Render (render.js:172) order:
  1. Clear to black; `lights.length=0`.
  2. `camera.apply`; floors; `drawDecals`; corpses; ground hazards; `drawEffects('ground')`.
  3. Depth-sorted pass by key `x+y`: walls, props, buildings, creatures, NPCs, loot, chests, portals.
  4. `drawParticles`; top hazards; `drawEffects('top')`.
  5. Identity transform; lighting (light canvas at 1/4 resolution, punched with `lights`); flash overlays; names and loot labels; `drawTexts`.

**DPR, resize and zoom** (`main.js:17`):
- `dpr = min(devicePixelRatio, touch?1.5:2)`.
- If `W*H*dpr² > (touch?1.6e6:4.2e6)`, then `dpr = sqrt(max/(W*H))`. The floor is 0.75.
- Backing store is `W*dpr × H*dpr`; CSS size is 100%.
- `computeZoom`: `clamp(max(H/700, W/1400), touch?.95:.9, 3) * settings.zoom`.
- `camera.apply` uses scale `zoom*dpr` and rounds the translation to whole device pixels.
- Portrait on touch shows `#rotate-hint` unless the player dismissed it.

**Coordinate spaces** (mixing these up is the most common bug):
- Tile space: float `x,y`, used by game logic.
- World px: `isoX/isoY`, before zoom. `z` is height in world px, subtracted from y.
- CSS px: mouse input, `toScreen`, `screenToTile`.
- Device px: CSS × `dpr`, used for screen-space canvas drawing.
- Integer tile `(tx,ty)` maps to the **north vertex** of its diamond; the tile centre is at +0.5 (render.js:196-199).
- A circle of radius r tiles projects to an ellipse with semi-axes `r*HW*1.41`, `r*HH*1.41` (Ring, Telegraph).
- `camera.follow` aims 24 world px above the feet.

**Input**:
- `keydown` is ignored while typing in INPUT, TEXTAREA or contentEditable. It adds `e.code` to `pressed` (non-repeat only) and to `keys`. It calls `preventDefault` for `GAME_KEYS` (:4) only in game mode.
- `blur` triggers `reset()`. The context menu is suppressed on the canvas, and on the whole document in game mode.
- Pointer listeners are on the **canvas only**; HUD DOM elements handle their own events.
- Mouse: client coords, left button 0 / right button 2, with `*Pressed` edge flags; uses pointer capture.
- Touch or pen: if `clientX < 0.42*W` and no joystick is active, a floating joystick spawns at the touch point. Radius `JOY_R=52`; `vx,vy` are in [-1,1] screen space. Otherwise the touch becomes the single `worldTouch`.
- Wheel (game mode only) multiplies `settings.zoom` by 0.94 or 1.06, clamped to 0.7-1.6.

**Audio**:
- Graph: `master` (gain 0.9) → destination. `sfxBus` → `DynamicsCompressor` (-16 dB, ratio 6) → master. `musicBus` (`settings.music*0.5`) → master. `sfxBus` gain is `settings.sfx`.
- `sfx` is throttled per name: at most 3 starts per sliding 45 ms window. Pitch is randomly jittered by ±8%.
- When `vol≠1`, `sfx` temporarily swaps the module-level `sfxBus` for a temporary gain node. `SOUNDS` functions must therefore connect synchronously.
- Music: 4 detuned oscillators (triangle in town, sawtooth elsewhere) → lowpass (900 Hz town / 420 Hz otherwise) swept by a 0.07 Hz LFO, plus random sine "bells" every 1.8 s (boss) or 5.2 s. Fade-in 3 s, fade-out 1.5 s.

**Assets**:
- `loadAssets` fires all jobs in parallel. It loads:
  - 16 class webps.
  - `hud.webp`/`hud.json`, `logo.webp`.
  - 4 potion pngs.
  - The default tile set (`skull`), `props.json` and the `dungeon_mechanisms` sheet (chest art). Biome art loads later via `loadBiomeArt`.
- `A.hud` and `A.logo` are loaded but never used; the DOM references the URLs directly.
- `biomeTileSet` recolours the **whole** floor atlas (1536x927) with `biome.palette`, and the wall atlas (1024 wide) with `biome.wallPalette || palette`. This runs synchronously in JS, so it causes a noticeable hitch; the dungeon build is wrapped in `setTimeout(…,40)` behind the loading overlay (game.js:182). `palette:null` (catacombs) reuses the original `Image`.
- Cache: `'town'` is kept permanently plus at most **2** other biome sets (assets.js:68-69). The world holds its own reference to its set.
- Data contract with render.js:
  - Floor entries are 192x96 (3x TW×TH) and are drawn into `TW+1.2 × TH+1.2` with 0.6 px overlap.
  - `map.v[i] >= 100` selects `details[v-100]`, otherwise `floors[v]` (render.js:14-18).
  - Wall sections (`tileset.walls`) are drawn one tile edge wide (`HW`) with `base` on the edge line (`segRect`, `s.strip`). The old whole-piece fallback anchors by `slope`/`base` (the bottom-edge linear fit in piece px) with `WALL_K = HW*1.06/66`.
  - Town tiles (`groundTile`) use the same `{img,sx,sy,w:192,h:96}` shape (town.js:19-22).

**Pixel art**:
- `parse` strips the leading newline, splits rows and pads them to the maximum width with `.`.
- `resolvePal`: `DEFAULT_PAL` (:873) merged with `pal`. Uppercase `A`/`B`/`C`/`M` default to `shade(lower, -0.38)` unless `pal` supplies them.
- Unknown characters fall back to `P.a`. `o` is the outline colour (`#0e0808`).
- Render steps:
  1. A 1-sprite-pixel outline is drawn on every empty cell 4-adjacent to a filled one.
  2. Each pixel is shaded: no pixel above → `+0.2` (eyes `e` get 0); no pixel below → `-0.28`; else no pixel to the right → `-0.12`. `dark` adds `-0.55`.
- Canvas size is `(w+2)*scale × (h+2)*scale`.
- Monsters render at scale 6 and are drawn at `def.px` world px per sprite pixel (creature.js:126-138). Icons and props use scale 3-4.
- Biome variants: `shiftPalette(A.pal, biome.mon)` (monster.js:694-695).

**VFX**:
- Particles: `x,y` in tiles; `vx,vy` in tiles/s; `z` in px; `vz` in px/s; `g` in px/s²; `size` → `size1` lerps over the particle's life; `add` selects 'lighter' blending. At the cap the oldest particle is dropped with `shift()`.
- Blood that lands (z≤0) becomes a splat decal with 55% chance, if on floor.
- Gibs bounce up to 2 times when `vz<-40` (restitution 0.35), leave blood decals, and trail blood at 14/s while airborne. Off-floor gibs reflect their velocity.
- Decals:
  - `pool` grows over time.
  - `scorch`/`frost` live 14 s and fade over the last 3 s.
  - All others live 9999 s, so they effectively stay until the cap evicts them.
- Effects need `update(dt)→alive` and `draw(ctx)` in world px; the camera transform is already applied. The optional `.add` flag selects additive blending. Effects are filtered by `.layer`.
- `drawTexts` projects with `camera.tileToScreen` and multiplies by `dpr`. Font size does not scale with zoom. Entries with `dmg` are hidden when `settings.dmgNumbers` is false.
- Gore settings:
  - 0: `bloodSpray` becomes a `phys` burst; `gibs` and `splat` decals are skipped.
  - 2: blood count ×1.6, gibs ×1.5.

**Generated files** (`process_assets.py`):
- `key_magenta` (:46):
  - Alpha 0 where `min(r,b)-g > 110`; soft edge between 45 and 110.
  - Pixels with all channels >215 become transparent (this removes label boxes).
  - Despill: r and b are clamped to `g+20`.
- Classes (:79):
  - Source is a 4x4 grid: rows `[(70,341),(366,639),(660,915),(936,1210)]`, cols `[(0,313)…(940,1254)]`, in `CLASS_IDS` order.
  - Each cell keeps the largest connected component plus nearby components larger than 40 px, then is trimmed.
- UI (:117):
  - Logo is trimmed and capped at 1400 px wide.
  - `icon.png`: the left 20% of the logo (the "V") on an ember gradient.
  - HUD source rows 146-461 are cropped to 2000x315.
  - Potions are cut from slots 9-12 (Z/X/C/V → red/blue/purple/orange).
  - XP track alpha is cleared over x∈[350,872)∪[1126,1650).
  - `hud.json`: 14 slots at y=128, h=76; `slotKeys`; orbs `{157,151,r78}` and `{1842,151,r78}`; `xp{350,262,1300,22}`.
- Floors (`process_floors`): diamonds are found as shapes (eroded alpha components), and section breaks are row gaps >107 px. Tiles are resized to 192x96 (thresholds keep their aspect) with hardened diamond alpha, in an 8-column atlas. Base floors get a `busy` score. Current result: 36 floor, 19 detail (24 desert), 8 threshold per set.
- Walls (:231):
  - Connected components of alpha>100 after an opening; components under 150 px and the title label are skipped.
  - The bottom profile is line-fit over the middle 60% of columns to get `slope`/`base`.
  - Pieces are classified by size, slope and position (:259-276), shelf-packed into a 1024-wide atlas.
  - The tower (bottom-right big column) is classified first; every set has 1.
  - `build_wall_strips` then cuts the "/" panels into seamless parts with per-sheet proportions: 14-24 wall_body + 1 wall_cap + 1 wall_ledge per set (see [`WALLS.md`](WALLS.md)).
- Props (`process_props`): see [`ART.md`](ART.md).
- `<set>.json` = `{floorSize:[192,96], floors:[{cat,x,y,w,h}], walls:[{kind,x,y,w,h,slope,base,src} | {kind:'wall_body'|'wall_cap'|'wall_ledge',x,y,w,h,rows}]}`.

### Tuning knobs
- **main.js**
  - :20 maxDpr: touch 1.5, desktop 2.
  - :23 pixel budget: 1.6e6 / 4.2e6.
  - :25 dpr floor 0.75.
  - :57 dt cap 0.05.
  - :41 140 embers.
  - :79 error UI cap 4.
- **view.js**
  - :5-6 TW 64, TH 32.
  - :28 follow offset -24.
  - :30 smoothing `1-0.0005^dt` (≈0.12 per frame at 60 fps).
  - :34 shake max 18.
  - :39 shake decay `0.002^dt`, cut-off 0.05.
  - :43-45 zoom formula.
- **input.js**
  - :58 JOY_R 52.
  - :71 joystick zone 0.42·W.
  - :115 wheel factors 0.94/1.06, clamp 0.7-1.6.
- **audio.js**
  - :13 master 0.9.
  - :15 compressor -16 / 6.
  - :28 music ×0.5.
  - :104 throttle 45 ms / 3 voices.
  - :124 fade-in 3 s.
  - :125 lowpass 900 / 420.
  - :129 root frequencies.
  - :145 bell interval 1800 / 5200 ms.
  - :155 fade-out 1.5 s.
- **state.js** :19-26 setting defaults.
- **assets.js** :69 biome cache size 2.
- **pixelart.js**
  - :874 `DEFAULT_PAL`.
  - :882 dark variant -0.38.
  - :918-921 shading +0.2 / -0.28 / -0.12 / dark -0.55.
  - :927 cache clears at 2500 entries.
- **vfx.js**
  - :20 particle cap 1400 touch / 3000.
  - :146 decal cap 500 / 1100.
  - :148 scorch/frost life 14 s.
  - :321 text cap 120.
  - :326 light cap 48.
  - :119 / :131 gore-2 multipliers 1.6 / 1.5.
  - :345 blood decal chance 0.55.
  - :352-353 gib bounce.
  - :362 pool growth 1.2/s.
- **shapes.js**
  - :243 "big" threshold r≥1.6.
  - :244 ring duration `0.35+r*.08`, width `4+r*2`.
  - :246 burst count `14+r*12`.
  - :248 light radius `4+r*3`.
  - :281 shake `min(14, 2+3r·mul)`.
  - :282 'explode' sound when r>1.2.
- **townart.js** :6 64x32 tile upscaled ×3; :83 supersample 2; :81 default wall height 52.
- **style.css** :17 `--hud-w: min(96vw,1000px,105vh)`; :245 touch value `min(56vw,125vh)`.
- **render.js** :10 `WALL_K` (only the fallback wall path); seamless sections scale by `HW / section width`. **assets.js** `WALL_TIERS = 2` niche tiers per wall.

### How to extend
1. **New ASCII sprite.**
   1. Add ``name: `\n<rows>` `` to `SPRITES` (pixelart.js:8). `.` is transparent.
   2. Palette keys: `a/A` primary, `b/B` secondary, `c/C` accent, `m/M` metal, `e` eyes, `w` bone, `k` black, `g` gold, `r` red, `s` skin, `o` outline.
   3. Reference it by name: monsters `sprite:` + `pal:` + `px:` (data/enemies.js), props `{sprite,pal,px}`, `item.icon`, summon `look.sprite`.
   4. Keep `pal` objects stable. The cache key is `JSON.stringify(pal)`, so key order matters.
2. **New sound.** Add `name:(t,p)=>{noise(t,dur,{type,f0,f1,q,vol,a}); tone(t,dur,{wave,f0,f1,vol,a,detune})}` to `SOUNDS` (audio.js:57), then call `sfx('name',vol,pitch)`. An unknown name is a silent no-op.
3. **New element look.** Add an `ELEM` entry (vfx.js:6) with hex `core/glow/dark` and an `sfx` that is a `SOUNDS` key. Then grep an existing key such as `'acid'` across `src/` to find the other per-element tables to update.
4. **New effect.** Write a class with `update(dt){this.t+=dt;return this.t<this.dur}` and `draw(ctx)` in world px (use `isoX/isoY`, subtract z). Add it with `addEffect(e,'ground'|'top')` and set `.add=true` for additive blending.
5. **New projectile look.** Add a `case` to `drawShape` (shapes.js:25) and optionally to `trail` (:221). The `fx` string comes from skill specs or monster `proj.fx`.
6. **New biome tile tint.** Give the biome `palette`/`wallPalette` params (see `recolor`). `biomeTileSet` caches the result automatically. Hex colours only.
7. **New runtime asset.** Push a job inside `loadAssets` (assets.js:33-44) and store the result on `A`. Progress reporting is automatic. Keep the path relative; GitHub Pages serves the site from a sub-path.
8. **New setting.** Add a default to `G.settings` (state.js:19), then add an input with `data-k="key"` in `settingsDialog` (screens.js:132). It auto-binds and saves.
9. **Regenerate assets.**
   1. `pip install pillow numpy scipy && python3 tools/process_assets.py [sprites|tiles|props]` (paths resolve from the script location).
   2. Check the printed counts for classes, floors and walls.
   3. If the HUD art changes, update the CSS `2000/315` and `0.1575` values, `SLOT_MAP` (hud.js:16) and the `slot_x`/potion slice in the script.
   4. A new sheet layout means updating the hard-coded row/col/section/slot pixel constants.
   5. Adding a class means updating the sheet grid, `CLASS_IDS` in **both** assets.js:4 and process_assets.py:32, and data/classes.js.

### Gotchas
- Colour helpers (`hexToRgb`, `shade`, `glowSprite`, `splatSprite`) accept only `#rgb`/`#rrggbb`. An `hsl()` or `rgba()` value silently becomes black. `addDecal` scorch accepts rgba only because it uses `fillStyle` directly.
- `drawShape` takes world px and a screen angle, while `trail`, `spawn` and effects take tile coords. Use `screenAngle(tileAng)` to convert.
- `input.consume()` is destructive, so only the first reader gets the edge. While paused, edges are dropped (game.js:345).
- Pointer handlers live only on `#game`; DOM widgets must `stopPropagation` (as hud.js:42 does).
- Zoom: changes to `G.settings.zoom` do nothing until `camera.computeZoom()` runs, which happens only on resize (main.js:28) or `setWorld` (game.js:113).
- Audio is silent until a title-menu click calls `initAudio`. iOS can suspend the context later, and nothing resumes it in-game.
- The touch heuristic (main.js:87) can classify a touchscreen laptop as touch: mobile layout, auto-loot, lower DPR cap.
- The `pixelSprite` cache does a full clear at 2500 entries, which also drops gem and gold icons (shared Map). Creatures memoise `_img` (creature.js:120-128) so they don't rebuild keys every frame. `glowCache`, `splatCache` and `A.classScaled` are unbounded.
- `biomeTileSet` eviction only removes the cache entry; re-entering an evicted biome repeats the slow recolour.
- `thresholds`, `corners`, `arch`, `gate` and `misc` are parsed but nothing renders them.
- `key_magenta` removes only white areas at least 60 px across (label boxes, pasted white blocks); smaller white blobs (skull highlights, snow) stay.
- HUD geometry is duplicated: hud.js reads `hud.json` at runtime, but style.css hard-codes the aspect ratio and the 0.1575 offsets.
- The canvas has `alpha:false`, so each frame must paint fully. Canvas text uses the Cinzel web font, which may not be loaded on the first frames (it falls back to Georgia).
- `Ring` treats `opts.z || 2`, so z=0 is impossible.
- Lights pushed during update are cleared before drawing (see open issues).

### Open issues noticed
- src/game/render.js:177 - `lights.length = 0` runs at the START of renderWorld. Every addLight call happens during update: world.js:148-158 (torches/props/portals), loot.js:58/61, hazards.js:127/309/567/649, monster.js:103, shapes.js:248. All of them are wiped before drawLighting reads `lights` (render.js:329), so only the player light ever renders. Fix: clear after drawLighting, or at the start of world.update.
- src/gfx/shapes.js:269 - explosionFx 'firework' spawns glow particles with `hsl(...)` colours. glowSprite (vfx.js:29-41) parses them via hexToRgb (util.js:78-81), which yields NaN, i.e. black, so the particles are invisible under 'lighter'. Each random hsl string also adds a permanent 64x64 canvas to the unbounded glowCache (vfx.js:28), so memory grows without limit.
- src/core/input.js:115 and src/ui/screens.js:146-151 - changing settings.zoom (mouse wheel or settings slider) never calls camera.computeZoom(). Zoom only updates on window resize (main.js:28) or the next level load (game.js:113), so the advertised wheel zoom appears broken.
- src/core/assets.js:100 - potionIcon creates a new canvas on every call. Loot.draw -> icon() (loot.js:66, :82) calls it every frame for each potion on the ground, which allocates canvases per frame.
- src/game/skillrun.js:402 - corpseFx adds a 'pool' blood decal even when G.settings.gore===0. addDecal only suppresses kind 'splat' (vfx.js:145); combat.js:198 gates correctly.
- src/main.js:88 - on touch devices G.settings.autoLoot is forced true at every boot, overriding a saved false.
- src/game/render.js:282 + src/gfx/vfx.js:401-403 - render sets 'lighter' before drawEffects('top'), but drawEffects resets to 'source-over' after every effect. Only the first non-additive effect is drawn additively, so blending is inconsistent.
- src/gfx/vfx.js:28,60 and src/core/assets.js:13 - glowCache, splatCache and A.classScaled are unbounded caches.
- src/gfx/pixelart.js:927 - the shared cache is fully cleared at 2500 entries, gem/gold icons included. There is thrash risk with many palettes (biome x variant x revived-corpse shiftPalette).
- src/core/audio.js:8 - initAudio is only called from title-menu clicks (screens.js:37). An AudioContext suspended later (iOS backgrounding) is never resumed during play.
- src/core/audio.js:108-112 - each sfx call with vol!==1 creates a GainNode that is never disconnected (relies on GC). The temporary global swap of sfxBus breaks if a SOUNDS entry ever schedules work asynchronously.
- src/core/assets.js:38,40 + src/state.js:9 - A.hud, A.logo and G.assets are loaded or declared but never used.
- tools/process_assets.py:5 - the docstring says 'game-ready PNGs', but most outputs are WebP (save() at :66). classes.json (:109) is generated but never loaded.
- css/style.css:51,94,99,254 - HUD aspect ratio 2000/315 and the 0.1575 offsets are hard-coded duplicates of hud.json w/h. They must be updated by hand if the HUD art changes.
- src/gfx/vfx.js:82 - particles.shift() at the cap (3000 desktop) is O(n) per spawn under heavy load.
- src/main.js:87 - the touch heuristic ('ontouchstart' && maxTouchPoints>0) puts touchscreen laptops into mobile mode (body.touch, autoLoot, DPR cap 1.5).

## Game data: classes, skills, enemies, biomes, items, summons

Data-only ES modules in `src/data/`. They have no side effects except the skill build loop in `skills.js`, which runs on import. The runtime that consumes them is in `src/game/skillrun.js` (castSkill), `src/game/player.js` (stats and damage), `src/game/monster.js` (AI, makeMonster, makeElite, createSummon), `src/game/combat.js` (hit and status), `src/world/dungeon.js` (spawns), `src/ui/vendor.js` (prices and services). Validate data with `node tools/tests/data_check.mjs` (checks 60 skills per class, valid kind and element, summon keys exist, names unique within a class, and that describe() runs). Smoke-cast every skill with `node tools/tests/skills.js wizard,gunner` (headless browser; classes are hardcoded in `tools/tests/harness.js:48`).

### Files
- `src/data/classes.js` (107 lines): `CLASSES` (16 hero classes) and `ATTRS` (descriptions of str/dex/vit/int).
- `src/data/skilldata.js` (376 lines): `SKILLDATA[classId] = [tree0[20], tree1[20], tree2[20]]`. That is 960 one-line DSL strings `"Name|kind|element|fx|mods"`.
- `src/data/skills.js` (191 lines): parses SKILLDATA into `SKILLS` and `CLASS_SKILLS` on import. Holds the damage, mana, cooldown, range and duration formulas, `GRANTS`, and `describe()` (the tooltip text). Imports `ELEM` from `src/gfx/vfx.js`.
- `src/data/summons.js` (94 lines): `SUMMONS` has 88 minion, totem and turret definitions, keyed by the skill mod `sum=`.
- `src/data/enemies.js` (66 lines): `ARCH` (22 monster archetypes plus `velscour`), `GORE`, `ELITE_AFFIXES` (names only), `bossName()`, `uniqueName()`.
- `src/data/biomes.js` (139 lines): `BIOMES` (20, including `throne`), `BIOME_BY_ID`, `randomBiome()`, `TOWN_BIOME`.
- `src/data/items.js` (350 lines): rarities, materials, bases, `AFFIXES` (48), `LEGENDARY` (22), `GEMS` (12 normal + 9 special), item and gem rolling, names, stats, prices, service costs, potions.

### Key APIs
- `CLASSES[id]` at `classes.js:3`. Fields: `{name, primary:'str'|'dex'|'vit'|'int', base:{str,dex,vit,int}, life, mana, lifeLvl, manaLvl, weapon:<WEAPONS key>, offhand?:'shield'|'orb', element, color, trees:[3 names], desc}`. `ATTRS` is at `classes.js:102`.
- `SKILLDATA` at `skilldata.js:7`. Class blocks start at these lines: paladin 8, ranger 31, wizard 54, necromancer 77, barbarian 100, dragoon 123, totem_master 146, death_knight 169, arcane_sorcerer 192, carrion_witch 215, bard 238, slime_lord 261, boomerang_knight 284, lancer 307, dragon_knight 330, gunner 353.
- `skills.js` exports:
  - `ROW_LEVELS=[1,6,12,20,30]` (:7), `MAX_SKILL_LEVEL=20` (:8), `SKILLS` (id → sk, :9), `CLASS_SKILLS[cls]` (60 skills in tree-major order, :10), `GRANTS` (:13).
  - `grantedSkillsAt(cls, level)` (:59) returns the ids granted up to that level.
  - `effLevel(player, sk)` (:64) is invested points + floor(st.skillsAll + st['skillTree'+tree]). It is 0 if no points are invested.
  - `skillBaseDamage(sk, L)` (:72), `manaCost(sk, L)` (:82), `cooldown(sk)` (:86), `useTime(sk)` (:87), `weaponCoef(sk)` (:88).
  - `buffAmount(sk, L)` (:94), `curseAmount(sk, L)` (:95), `skillDuration(sk, L)` (:99).
  - `skillRange(sk)` (:107, in tiles; used for auto-aim and melee approach), `needsTarget(sk)` (:120).
  - `describe(sk, L, dmg)` (:135) returns tooltip HTML. `classTrees(cls)` (:191).
- Skill object (`skills.js:48`): `{id:'cls.tree.idx', classId, tree, idx, row:floor(idx/4), col:idx%4, name, kind, el, fx, m:<parsed mods>, reqLevel:ROW_LEVELS[row], prereq: idx>=4 ? 'cls.tree.(idx-4)' : null, attack:bool}`.
- `SUMMONS[key]` at `summons.js:5`. Fields:
  - `{name, desc?, look, ai, hp, dmg, spd?, el?, fly?, static?, ghost?, targetable?, taunt?, alpha?, aura?:{el,r}, atk:{...}}`.
  - `look` is either `{sprite, pal, px}` or `{cls:true|classId, pal:{hue,sat,light}}`.
  - `ai` is one of melee, ranged, turret, aura, follow, exploder.
- `ARCH[id]` at `enemies.js:4`. Fields: `{sprite, ai, hp, dmg, spd, px, r, pal, gore, names[], pack:[min,max], el?, range?, proj?:{fx,speed,lob?}, fly?, undead?, demon?, armor?, poison?, split?, aoe?, summoner?:prob, xp?}`. Also `GORE` (:30), `ELITE_AFFIXES` (:39), `bossName(rng)` (:57), `uniqueName(rng)` (:61).
- `biomes.js`: `BIOMES` (:4), `BIOME_BY_ID` (:127), `randomBiome(exclude, depth)` (:130), `TOWN_BIOME` (:136).
- `items.js`:
  - Tables: `RARITY` (:4), `MATERIALS` (:12), `tierOf(ilvl)` (:18), `SLOTS` (:20), `WEAPONS` (:23), `OFFHANDS` (:39), `ARMORS` (:43), `AFFIXES` (:52), `AFFIX_BY_STAT` (:102), `LEGENDARY` (:105), `GEM_TIERS` (:131), `GEMS` (:133).
  - Gems: `gemStats(gem, tier)` (:161), `gemName` (:170), `makeGem(gem, tier)` (:178), `rollGem(ilvl)` (:181).
  - Rolling: `affixValue(a, ilvl, rarity, roll)` (:189), `rollRarity(mf, bonus)` (:205), `rollItem(ilvl, {slot, rarity, base, mf, bonus, unid})` (:213).
  - Display and stats: `itemName` (:260), `itemBaseLine` (:268), `itemColor` (:272), `upgMult` (:278), `itemStats(item)` (:281, returns [stat,val] pairs), `itemDmg` (:291), `itemArmor` (:295).
  - Prices: `itemValue` (:297), `upgradeCost`, `socketCost`, `enchantCost(item, add)`, `unsocketCost` (:303-306).
  - Services: `rerollAffixes` (:308), `addAffix` (:314). Labels: `statLabel(s, v, classTrees)` (:322).
  - Potions: `potionItem(kind)` (:337), `POTION_PRICE` (:344), `POTION_INFO` (:345).

### How it works
**Skill DSL** (`skilldata.js`, parsed by `parseMods` at `skills.js:28`). Fields are split on `|`. Mod tokens are space-separated:
- A bare word becomes `true`.
- `k=v` becomes a Number when numeric, otherwise a string.
- `buff=` and `curse=` become comma-split arrays.
- `sum=` and `at=` always stay strings.

**Layout.** Each tree is a 5x4 grid. Row `i/4` sets the level requirement. Each column is a prerequisite chain (prereq is `i-4`). Learning (`ui/skills.js:15 canLearn`) needs a skill point, current points under 20, `level >= reqLevel`, and the prereq to have at least 1 point.

**Kinds** (23; each has its own case in `castSkill`, `skillrun.js:52-298`): melee, proj, nova, aoe, beam, chain, wall, zone, orbit, cyclone, whirl, leap, dash, blink, summon, buff, curse, heal, trap, rain, strike, fissure, corpse.

**Elements** (10, `ELEM` in `gfx/vfx.js:6`): phys, fire, cold, light, poison, arcane, holy, shadow, blood, acid. Built-in on-hit effects (`combat.js:57-162`):
- fire: 25% chance to ignite.
- poison: always poisons.
- blood: always bleeds, +3% life steal.
- cold: always chills.
- acid: shred +15% damage taken, plus slow.
- light: 22% chance to arc.
- arcane: halves monster resistance.
- holy: x1.5 against undead and demons.
- shadow: +2% life steal.

On the player side, acid uses poison resistance, and phys/arcane/holy/shadow/blood use `res.magic`.

**Mods** (what castSkill reads):
- `n`: count. Meaning depends on kind: melee strikes 0.085s apart, projectiles, nova waves 0.28s apart, aoe eruptions (with dur), beams fanned 0.35 rad apart, chain jumps (default 4), orbiters (default 3), cyclones, dashes, minions per cast, traps, rain drops (default 12), strikes, fissure lines, corpses (default 3).
- `r`: radius multiplier. Bases: aoe 1.6, nova 3, zone 1.8, orbit 1.6, cyclone 0.95, whirl 1.35, leap 1.6, curse 2.2, rain 2, corpse search 4, proj explosion 1.1, melee explosion 1.2. On melee, `r` also multiplies reach.
- `range`: reach multiplier. Bases: proj 10, melee 1.5, leap/blink 6.5, dash 5, beam 8 (cone x0.55), fissure 7.
- `spd`: projectile speed (base 9; bullet x1.4, arrow x1.25) or cyclone drift speed.
- `spread`: degrees. Proj default is `min(80, 10+5n)`; fissure default is 40.
- `rand`: random spread, 0.035s stagger.
- `ring`: projectiles cover 360°, or a wall becomes a ring.
- `arc`: melee arc in degrees. Default 115; cleave 170; thrust fx 36; spin fx 360.
- `cleave`: sets the melee arc to 170.
- Projectile behaviour: `pierce` (pierce 99), `bounce=N`, `chain=N` (proj and melee), `home`, `split` (splits into 3 on first hit), `ret` (boomerang), `lob`, `exp` (explodes), `spray` (frozen-orb shards), `dur` (projectile lifetime).
- `pull`: proj pulls within 2.6; nova and aoe pull in; an aoe with dur implodes at x2 damage when it ends; also traps.
- `delay`: aoe uses a Delayed hazard (meteor and nuke default to 0.85).
- `cone`: beam becomes a cone.
- `dur`: channel, zone, wall, orbit, cyclone and whirl duration; summon lifetime (0 means permanent); buff and curse base duration.
- `len`: wall length (x4.5). `block`: wall blocks movement.
- `follow`: zone follows the caster. `heal`: zone, nova and corpse heal. `spiral`: orbit spirals.
- `nova`: blink and leap release a burst on arrival.
- `pulse`: buff deals skill damage every 1s in radius 2.6 (`player.js:373`). `slow` on a buff makes that pulse slow.
- `transform`: buff scales the hero to 1.22x and adds VFX.
- `party`: buff is copied to the summons' `partyBuff`; heal also heals summons.
- `at=self`: curse is centered on the caster and needs no target.
- `amt`: buff, curse or heal amount. `sum`/`max`: summon key and cap. `gold`: melee has 25% gold drop per hit.
- `wc`: weapon-coefficient override. `free`: 0 mana and x0.85 damage. `mana`: mana multiplier (supported, unused in data). `dmg`: damage multiplier. `cd`: cooldown in seconds.
- Status flags passed to every hit (`statusOpts`, `skillrun.js:23`): burn, poison, bleed, slow, freeze, stun, fear, knock, leech, pull. A `curse=` on a non-curse kind becomes an on-hit curse (25 for 5s, `combat.js:137`).

**buff= stats:** dmg, as, armor, res, regen, speed, crit, thorns, leech, block, life, cdr. They are scaled in `player.recompute` (`player.js:63-121`):
- armor is a percentage; res is flat.
- crit/4, leech/4, block/2, cdr/2, speed x0.6.
- thorns x level x 0.2.
- regen/10 = % of max HP per second.
- life is a % of max life.

**curse= list:** amp, weaken, slow, fear, confuse, charm, decay, leech, thorns, mark, stun, freeze, bomb, doom. Handled by `applyCurse` at `skillrun.js:308`:
- mark: x1.5 amount.
- slow: `min(.65, .3+amt/200)`.
- fear: capped at 4s. stun: capped at 3s (bosses 25% chance, 0.6s). freeze: fixed 1.6s. charm: 10s, not on bosses or uniques.
- bomb: explodes after 2.2s for x2.2 damage. doom: 3s, then x2.5 shadow damage.

**fx** is mostly visual:
- Projectile shapes: `gfx/shapes.js:21 drawShape`. Unknown names fall back to a glow orb.
- `ATTACK_FX` (`skills.js:26`): arrow, bullet, rang, javelin, blade, axe, chakram, rock, disc, bomb, rocket. These make a proj or rain skill an "attack" (scales with attack speed, weaponCoef 0.8).
- melee fx: smash, slash, thrust, spin, claw, bite. Thrust gets 1.15x range and a narrow arc.
- aoe fx meteor/nuke turn it into a delayed impact; blizzard and void get special Area visuals.
- strike fx: lightning, spirit, crow, meteor, spear, laser, default (column).
- corpse fx: bone (8 bone shards), crow/spirit (4 homing), else explosion.
- Orbit gets +extraProj only for blade, hammer, axe, rang, orb, bone, shard, feather (`skillrun.js:164`).
- `FXNAME` (`skills.js:122`) holds the tooltip nouns.

**Cast flow.** `Player.tryUseSkill` (`player.js:274`):
1. effLevel.
2. Cooldown check.
3. Mana check.
4. `castLock = useTime / (1 + atkSpeed or castSpeed / 100)`.
5. `cooldown x (1 - cdr/100)`.
6. `castSkill` (`skillrun.js:43`). If castSkill returns false (no corpses), mana and cooldown are refunded.
7. Echo-cast chance (not for summon or buff).
8. Gem procs `novaOnCast` / `orbitOnCast` (`skillrun.js:301`).

**Damage.** `Player.skillDamage` (`player.js:139`):
- lo = `(base*0.85 + weapon[0]*wc) * mult`; hi = `(base*1.15 + weapon[1]*wc) * mult`.
- `mult = (1 + (dmgPct + primaryAttr + elemBonus)/100) * synergy`.
- elemBonus is `str + physPct` for phys, otherwise `int + <el>Pct`.
- Synergy (`player.js:133`) is `1 + 0.03 *` (points in the other skills of the same tree).

**Grants** (`GRANTS`, `skills.js:13`) as [level, tree, idx]: [1,0,0] [2,1,0] [4,2,0] [8,0,4] [12,1,4] [16,2,4] [22,0,8] [28,1,8] [34,2,8]. Column 0 of every tree is auto-learned at 1 point without spending a point. `player.applyGrants` (`player.js:197`) auto-slots it; `x.0.0` goes to bar[0] (LMB). Skill points: 1 at creation (`save.js:30`), +1 per level, +1 for each depth cleared for the first time (`game.js:244`).

**Summons.** `createSummon` (`monster.js:772`):
- hp = `max(20, heroMaxHp * def.hp * (1+0.08(L-1)) * (1+summonPct/100))`.
- dmg = avg(skillDamage) x def.dmg x same multiplier.
- life = `m.dur` (0 means permanent).
- Per-skill cap = `m.max || (m.dur ? 99 : m.n||1)`; the oldest is killed. Global cap is 40 per owner.
- `sum=revive` consumes corpses within 5 tiles.

Summon attacks (`monster.js:416 summonAttack`) by `atk.type`:
- proj (fx, n, home, exp, spd, heal, slow, poison)
- chain (n)
- strike (fx meteor | pillar | lightning)
- beam (cone, freeze)
- nova (r, buff/amt)
- heal (r, amt)
- buff (stat, amt, r, as?, regen?)
- curse (fear | slow | other)
- spawn (what, max: children get dmg x0.5, hp x0.15, 12s life)
- melee (aoe, chain, slow, freeze, stun, leech)

`aura:{el,r}` deals x0.3 damage aoe at about 2 Hz (`monster.js:104`).

**Enemies.**
- Base stats (`monsterBase`, `monster.js:15`): hp `20*1.066^(L-1)`, dmg `(3+min(L,10)*.15)*1.052^(L-1)`, xp `4*L^1.5`. These are multiplied by ARCH hp/dmg/xp. Monster level = depth (+1 for champion/unique, +2 for boss).
- `makeMonster` (`monster.js:687`):
  - Biome element replaces A.el for ai in ranged, caster, nova, beamer, exploder (archer excluded).
  - Palette = `shiftPalette(A.pal, biome.mon)`; keys `e` and `o` are never shifted.
  - Name = `biome.adj[(id.length+depth+variant)%3] + names[min(2, floor(depth/34)+variant)]`.
  - Resistances: biome element 0.3; undead poison .5 and shadow .3; armor phys +.15; elemental own element .6; slime acid .5.
- Greater variant (`game.js:224`, chance `min(.5, .2+depth*.005)`): hp x1.4, dmg x1.2, xp x1.5, hue +35.
- AI dispatch (`monster.js:122-133`):
  - melee
  - brute: melee + 45% slam (x1.6, r1.6, knock)
  - ranged/caster: kite and strafe; `summoner` raises 2 skeletons 35% of the time; `aoe` casts a delayed blast 60% of the time
  - charger: dashes from 2.2-7 tiles, x1.4
  - swarm: circle-dive
  - nova: 10-projectile ring; shroom drops a poison pool instead
  - beamer: line hit x1.4
  - exploder: x1.6, r1.7, dies
  - boss: pattern queue
  - turret, aura, follow: summons only
- Boss patterns (`monster.js:739`) are drawn from slam, nova, volley, charge, summon, meteor, spiral, beam. Velscour uses all 8. Others use `3+min(3,floor(depth/20))` plus slam. A pattern fires every 2.6-4.2s. Phase 2 starts below 50% HP: speed x1.2, atkCd x0.75, about 0.7x pattern time.
- Elites (`makeElite`, `monster.js:719`):
  - champion: hp x3, dmg x1.4, xp x3, 1 affix (2 when depth > 40).
  - unique: hp x5, dmg x1.6, xp x6, 2 affixes (3 when depth > 50).
  - boss: hp x(14+depth/4) (Velscour x40), dmg x1.9 (x2.4), xp x25 (x200).
- Affix effects are hardcoded in `monster.js:45-101,332,352,747-753`.
- Spawning (`dungeon.js:109-150`):
  - Roster index = `floor(rng^1.35 * 12)`, so earlier roster entries are more common.
  - Pack size = `ARCH.pack`, +1 at 40% chance when depth > 30.
  - Champion packs: `2+floor(depth/15)`. Unique packs: `1+floor(depth/30)`.
  - Boss arch is from the roster minus bat/spider/beetle.
  - Depth 100 uses `generateThrone` with arch `velscour`.

**Biomes.**
- `palette` is the parameter set for `recolor()` (`core/util.js:141`), applied to the floor and wall atlases via `biomeTileSet` (`core/assets.js:65`, caches 2 sets). Keys: `hue` (deg), `sat` (x), `light` (+), `contrast` (x around .5), `tint:[r,g,b,amt]`, `colorize:[hueDeg, sat]`. `null` means the raw art. `TOWN_BIOME.wallPalette` overrides walls.
- `dark` = darkness overlay alpha. `fog` = overlay colour (`render.js:311`). `light` = player light radius in tiles (`render.js:328`).
- `ambient.type` is one of snow, ember, ash, spore, mote, glitter, firefly, drip, bubble, sand, leaf, spark, wisp, plus a dust default (`world.js:169`).
- `torch` = torch spark colour. `blood` = flesh gore and decal colour. `el` = biome element. `adj` = 3 name prefixes. `roster` = 12 ARCH ids.
- `randomBiome(exclude, depth)` returns 'throne' iff depth===100. Otherwise it picks uniformly from the non-throne biomes minus `exclude`, using Math.random.

**Items.**
- `rollItem` (`items.js:213`):
  - Slot is random with weapon weighted x2. Rarity comes from `rollRarity`: common weight/(1+bonus), others `w*(1+mf/100)*(1+bonus*id)`.
  - `tier = clamp(floor((ilvl-1)/10),0,9)` gives the MATERIAL prefix. Base name index = `min(4, floor(tier/2))`.
  - Weapon avg damage = `3.4*1.052^(ilvl-1)*W.dmg*(1+.012*ilvl)`; range [x.75, x1.25].
  - Armor = `6*A.armor*1.045^(ilvl-1)*U(.85,1.15)`.
  - Implicits: dagger crit 4; staff/wand/lute cast 8/10/5; shield block 8-16; orb dmgPct 6-14 + ilvl/10.
  - Affix count is `randi(R.affixes)`, unique by stat, filtered by slot letter (W, O, H, B, G=hands, L, F) and `minRarity`, weighted by `w` (default 1).
  - maxSockets = R.sockets (1/2/3/4/6). Initial sockets: 45% chance of `randi(0, ceil(max/2))`.
  - Legendary picks a random `LEGENDARY` key. Epic and above get a random title. Uncommon and Rare get a prefix/suffix from the first non-implicit affix. `req = floor(ilvl*.8)`.
- `affixValue` = `(min+(max-min)*roll)*(1+ilvl*sc)*R.mult`. When min>=1, max<=2 and sc==0 (skill affixes) it is `round(base)`.
- `itemStats` = affixes (non-implicit x(1+.04*upg)) + `gemStats` + legendary `stats`. Weapon damage and armor scale with `upgMult = 1+.1*upg` (upg max 10, `vendor.js:207`).
- Gems: normal gem value = `v*GEM_MULT[tier]` with GEM_MULT = [1,1.8,3,4.5,6.5,9]. Integer stats (extraProj, chainPlus, pierce, homing, skillsAll) use `floor((tier+1)*v)`.
- `rollGem`: tier = `floor(ilvl/16)`, minus 0-1 at 60% chance. Special chance = `.08+.0012*ilvl`. Gems stack (`player.js:467`) and socket into `item.gems:[{gem,tier}]` (`ui/inventory.js:63`).
- Legendary behaviour lives in game code as `st.legendary.<key>` checks:
  - thunder: `combat.js:159`; frostbite: :132; thorns: :50; bloodbath and vamp: :220-224.
  - surge: `player.js:304`; hammer: :320; phoenix: :327; orbit: :392; inferno: :398; berserk: :145.
  - greed: `loot.js:135`.
  - The rest work through the `stats` field only.

### Tuning knobs
- Skill damage (`skills.js:72`):
  - `lv = 1+.17(L-1)+.004(L-1)^2` (L20 gives 5.674).
  - `d = (6+3.2row) * lv * (1+.4row) * m.dmg * KIND_DMG`.
  - proj with n>1: `/n^.35`. rain/strike: `/((n||1)/6)^.25`. free: x.85.
- `KIND_DMG` (`skills.js:15`): melee 1.15, proj 1, nova .95, aoe 1.35, beam 1.2 (x.32 per tick when channelled, `skillrun.js:141`), chain .95, wall .32, zone .3, orbit .5, cyclone .38, whirl .55, leap 1.4, dash 1.15, blink .8, summon .6, buff/curse .35, heal 0, trap 1.7, rain .55, strike 1.35, fissure 1.05, corpse 1 (+25% of corpse max HP, `skillrun.js:399`).
- Mana: `round((2.5+2.4row)*(1+.07(L-1))*m.mana*KIND_MANA)`. KIND_MANA is at :20; kinds missing from it default to 1.
- Cooldown: `m.cd ?? KIND_CD` with summon .6, leap .7, dash .6, blink .4, heal 4, trap .3, else 0.
- Use time: `KIND_USE` (melee .36, proj .32, buff .3, summon .4, curse .35, blink .2, dash/leap .25, else .42).
- `weaponCoef`: m.wc; attack .8; summon/buff/heal/curse .25; else .45.
- `buffAmount = round((amt??20)*(1+.05(L-1)))`. `curseAmount = round((amt??25)*(1+.04(L-1)))`.
- Duration: curse `(dur??6)+.15(L-1)`; buff `(dur??20)+.3(L-1)`.
- Heal = `(amt||20)*(1+.04(L-1))%` of max HP.
- Class life/mana (`player.js:119`):
  - maxHp = `(life+(lvl-1)lifeLvl+3vit+life_affix)*(1+lifePct/100)`.
  - maxMana = `mana+(lvl-1)manaLvl+2int+mana_affix`.
  - Primary attribute = +1% skill damage per point (`player.js:112`).
- Classes (`id: primary, weapon[+offhand], life/mana (+per level), trees`):
  - paladin: str, mace+shield, 70/30 (8/2), Holy Wrath, Bulwark, Crusade
  - ranger: dex, bow, 55/30 (6/2.5), Marksmanship, The Wilds, Traps & Tricks
  - wizard: int, staff, 45/60 (5/4), Fire, Frost, Storm
  - necromancer: int, wand+orb, 48/55 (5/4), Bone & Blood, Summoning, Curses & Plague
  - barbarian: str, axe, 80/20 (9/1.5), Rage, Warcries, Earthshaker
  - dragoon: str, spear, 65/30 (7/2), Lancework, Sky Dive, Wyrmblood
  - totem_master: int, staff, 60/45 (7/3), Totems, Ancestors, Earth & Storm
  - death_knight: str, sword, 75/30 (8/2), Frost, Unholy, Blood
  - arcane_sorcerer: int, wand+orb, 44/65 (5/4.5), Arcane, Chronomancy, Void
  - carrion_witch: int, staff, 48/55 (5/4), Plague, Murder of Crows, Hexes
  - bard: dex, lute, 55/40 (6/3), Songs, Sonic Arts, Trickery
  - slime_lord: vit, mace, 85/35 (9/2.5), Ooze, Spawn, Mutation
  - boomerang_knight: dex, boomerang, 60/30 (7/2), Throwing, Bladesmanship, Gale Knight
  - lancer: str, spear+shield, 78/25 (8/1.5), Phalanx, Javelin, Valor
  - dragon_knight: str, sword, 72/30 (8/2), Flame, Scale, Draconic
  - gunner: dex, pistol, 55/35 (6/2.5), Firearms, Explosives, Engineering
- `RARITY` (`items.js:4`), as weight / affix count / max sockets / affix multiplier:
  - Common: 62 / 0-1 / 1 / 1
  - Uncommon: 25 / 1-2 / 2 / 1
  - Rare: 9 / 2-3 / 3 / 1.1
  - Epic: 3.2 / 3-4 / 4 / 1.25
  - Legendary: 0.8 / 4-5 / 6 / 1.4
- `itemValue` (`items.js:297`) = `12*1.06^ilvl*[1,2.5,6,15,40][rarity]*(1+.15*affixCount)*(1+.2*sockets)*(1+.3*upg)`. Gems: `(special?400:60)*2.6^tier`. Buy price = value; sell = floor(value/4) (`vendor.js:129`).
- Service costs (`items.js:303-306`):
  - upgrade: `60*1.06^ilvl*1.7^upg*(1+.5r)`
  - socket: `150*1.05^ilvl*2^sockets*(1+.3r)`
  - enchant: `(add?400:180)*1.055^ilvl*(1+.6r)`
  - unsocket: `50*1.04^ilvl`
  - gem combine (3 to 1): `80*2.2^tier` (`vendor.js:168`)
  - gamble: `180*1.065^lvl`, mf+120, bonus .5 (`vendor.js:231-240`)
  - potions: `POTION_PRICE*(1+.08*level)` (`vendor.js:150`)
- Elite and spawn numbers are listed under "How it works"; biome dark/light values sit next to each entry in `biomes.js`.

### How to extend
- **Change or replace a skill:**
  1. Edit the string in place (same class/tree/index), so the id `cls.tree.idx` and saved points are kept. The row is fixed by the index (level requirement `ROW_LEVELS[row]`) and its prereq is the skill 4 slots earlier.
  2. Use existing kinds and mods if you can.
  3. Run `node tools/tests/data_check.mjs`, then `node tools/tests/skills.js <cls>`.
- **New skill kind:**
  1. Add a `case` to `castSkill` (`skillrun.js:52`).
  2. Add entries to KIND_DMG, KIND_MANA, KIND_CD and KIND_USE (`skills.js:15-25`).
  3. Update `skillRange` and `needsTarget`.
  4. Add a `describe` case.
  5. Add the kind to `KINDS` in `tools/tests/data_check.mjs:7`.
  6. Optionally add an icon branch in `ui/icons.js`.
- **New mod:** parseMods already handles it. Read `m.<key>` in castSkill, and add a tooltip flag in `describe` (`skills.js:140-156`). If it is a hit status, add it to `statusOpts` (`skillrun.js:25`) and to `applyStatus` (`combat.js:125`).
- **New buff stat:** add it to `BUFFNAME` (`skills.js:129`), then accumulate and apply it in `player.recompute` (`player.js:63-121`).
- **New curse:** add it to `CURSENAME` (`skills.js:130`), add an `applyCurse` case (`skillrun.js:308`), and make combat or AI read `t.curses.<key>`.
- **New fx:** add a `drawShape` case and/or a `trail` case (`gfx/shapes.js:21,219`). Add an `FXNAME` noun. Add it to `ATTACK_FX` if it is a weapon attack.
- **New summon:** add a `SUMMONS` entry with an `atk.type` from the list above and a sprite from `SPRITES` (`gfx/pixelart.js:8`) or `look.cls`. Reference it with `sum=<key>` plus `max=` or `dur=`.
- **New class:**
  1. Add a `CLASSES` entry (weapon must be a `WEAPONS` key, offhand a key in `OFFHANDS`).
  2. Add `SKILLDATA[id]` with 3 trees of exactly 20 strings each. idx 0 of tree 0 must be a damaging `free wc=...` basic attack: it is bar[0], and the orbit and inferno legendaries use `${cls}.0.0` (`player.js:393,402`). Indices 0/4/8 of each tree are the granted chain.
  3. Add the id to `CLASS_IDS` (`core/assets.js:4`); it drives loading and the class-select screen.
  4. Provide `assets/sprites/classes/<id>.webp`. `tools/process_assets.py:79` only slices a fixed 4x4 sheet, so a 17th sprite must be authored separately.
  5. Add the id to `ALL_CLASSES` (`tools/tests/harness.js:48`).
- **New enemy archetype:**
  1. Add an `ARCH` entry (`enemies.js:4`). Its sprite must exist in `SPRITES`, using that sprite's palette keys. `ai` must be one of the dispatch cases, and `gore` must be a `GORE` key.
  2. Give it 3 `names` (depth tiers at 0/34/68) and a `pack`.
  3. Add the id to one or more biome `roster`s. Position matters: earlier entries spawn more often.
  4. A new AI needs a case at `monster.js:122` and a `perform` action.
- **New biome:**
  1. Append to `BIOMES` with every field. `roster` uses 12 ARCH ids; `el` must be an ELEM key; `ambient.type` must be one handled in `world.js:169`. It automatically joins `randomBiome`.
  2. The id is persisted in saves as `char.nextBiome`/`lastBiome`. An unknown id falls back to catacombs (`game.js:177`).
- **New affix:**
  1. Add `{s, t:'...{v}...', pre|suf, min, max, sc, slots:'WOHBGLF', w?, minRarity?}` to `AFFIXES`.
  2. Make the stat do something: read `add.<s>` in `player.recompute` (`player.js:72-114`). `<el>Pct` for an ELEM key is picked up automatically (`player.js:17,115`).
  3. Non-affix stats need a label in `statLabel` (`items.js:324`).
- **New gem:**
  1. Add a `GEMS` entry `{name, color, stats:[[stat, perTier]], special?, desc?}`.
  2. If an integer stat is new, add it to the integer list (`items.js:165`).
  3. Add an icon shape in `GEM_SHAPES` (`gfx/pixelart.js:961`); the default is diamond.
- **New legendary:** add a `LEGENDARY` entry. Use `stats` for passive numbers, or check `st.legendary.<key>` in game code. Legendary flags are booleans, so duplicates do not stack; their stats do.

### Gotchas
- Skill ids are positional. Reordering or inserting lines in `SKILLDATA` silently remaps saved `char.skills`, `char.bar` and `char.granted`. Every tree must have exactly 20 entries: `ROW_LEVELS`, the UI grid, `GRANTS` and data_check all assume 5x4.
- `skills.js` imports `gfx/vfx.js` (for ELEM), so the data layer is not DOM-free. `data_check.mjs` relies on vfx.js having no DOM side effects at import time.
- Tooltips overstate several effects:
  - `describe` shows the raw `buffAmount` %, but recompute applies crit/4, leech/4, block/2, cdr/2, speed x.6.
  - Curse durations are capped in `applyCurse` (fear 4s, stun 3s, charm 10s, freeze 1.6s).
- The rain/strike damage normalisation increases damage when n<6. A single strike gets x1.565 (`skills.js:77`).
- Minions' `partyBuff` only affects attack cooldown via `stats.as` (`monster.js:106`). Party dmg, armor, res and regen buffs, and the banner and amplifier `dmg` auras, do nothing for minions. Also, `partyBuff` is a single slot, so the last party buff overwrites the previous one.
- Monster melee always deals phys damage (`monster.js:334`, unless it is a summon with `el`). The biome element only affects ranged-type AIs and bosses.
- Item mf/bonus, gem rolls, randomBiome and the boss/unique names all use `Math.random`, not the seeded dungeon rng.
- Class `weapon` only sets the starting gear (`save.js:38`) and a vendor bias (`vendor.js:32`). Any class can equip any base, and skills ignore the weapon type.
- Stat key collision: the Lightning Damage affix is `lightPct`, but `render.js:328` reads `p.st.lightPct` as a light-radius bonus. It is safe only because `st` never sets `lightPct`.
- Special gems at tier 0-1 roll 0 for their integer stats, which are then filtered out. Chipped or Flawed Prism Shard and Tear of the Ancients have no stats at all (`items.js:165`), yet are valued at 400g+.
- On the player, phys damage also goes through `res.magic` (0.75 x resAll), because `PLAYER_RES` has no phys entry (`combat.js:11,43-45`). So the resAll affix and gems also reduce physical damage.

### Open issues noticed
- src/game/skillrun.js:26 - In statusOpts, the guard `!['curse'].includes(m.kind)` always passes because `m` is the mods object, which has no `kind`. Any `curse=` mod therefore becomes an on-hit curse. This is harmless today because curse-kind casts never pass `o` to hit(), but the guard is dead code.
- src/data/items.js:23-38 - The `spd` field on WEAPONS is never read anywhere, so weapon base attack speed has no effect.
- src/game/player.js:127 - The pass-through for the Wraithwalk legendary is disabled (`!!legendary.wraith && false`). LEGENDARY.wraith.desc at src/data/items.js:114 still promises 'pass through monsters'.
- src/data/enemies.js:47 - The 'teleport' elite affix (Teleporting) has no implementation. It can still roll on champions and uniques (monster.js:721-728) and only shows a label.
- src/game/monster.js:106 / src/game/skillrun.js:210 / src/game/monster.js:511 - Minions read only `partyBuff.stats.as`. The dmg, armor, res and regen party buffs and the dmg/armor auras from banners, amplifiers and totems have no effect on summons. partyBuff is also a single slot that overwrites itself.
- src/data/skills.js:178-179 vs src/game/player.js:82-94 - Buff tooltips show the raw amt%, but crit is /4, leech /4, block /2, cdr /2 and speed x0.6 in recompute. Curse tooltips use skillDuration, but applyCurse caps fear at 4s, stun at 3s, charm at 10s and fixes freeze at 1.6s (skillrun.js:316-321).
- src/data/skills.js:77 - The rain/strike normalisation `d /= ((n||1)/6)^0.25` increases damage for n<6. A strike with n=1, such as paladin 'Divine Strike', gets x1.565; this may be unintended.
- src/data/items.js:308-320 - rerollAffixes and addAffix do not recompute item.pre and item.suf, so Uncommon and Rare names keep prefixes and suffixes from affixes that no longer exist.
- src/data/items.js:165 - Integer gem stats use floor((tier+1)*0.34), which is 0 for tiers 0-1. Chipped or Flawed Prism Shard and Tear of the Ancients have no stats (Chainlink has none either), yet itemValue prices them at 400g+ and rollGem gives low-level players tier 0-1 gems.
- src/data/items.js:256 + src/ui/inventory.js:33 - The `opts.unid` path is dead. No caller passes unid, and the gamble text (vendor.js:232) says the items are 'unidentified'.
- src/data/classes.js:6 (all entries) - The CLASSES fields `element` and `color` are never read anywhere in src/.
- src/game/render.js:328 - Light radius reads `p.st.lightPct`, which is the stat key of the Lightning Damage affix (items.js:85). If anyone adds st.lightPct, lightning damage would also scale the light radius.
- src/game/combat.js:11,43-45 - PLAYER_RES has no 'phys' entry, so physical damage to the player is reduced by both armor and res.magic (0.75 x resAll). This is probably unintended and couples the resAll affix to physical defence.
- src/game/render.js:398 - It duplicates the elite affix display names instead of using ELITE_AFFIXES[k].name (enemies.js:39), so a new affix needs edits in two places.
- src/ui/vendor.js:128 - `const n = it.type === 'gem' ? 1 : 1;` is a no-op leftover. Selling a gem stack sells one gem at a time.
- src/data/skilldata.js (whole file) - Skill ids are positional (cls.tree.idx). There is no save migration, so editing tree order breaks existing saves (save.js:48 migrate does not touch skills).

## World generation, map and rendering

### Files
- `src/world/map.js` - `TileMap`: floor grid, static blockers, Diablo-style thin wall segments + pillars, collision/sliding, LOS, BFS flow field, A* + path smoothing, fog `seen` mask.
- `src/world/dungeon.js` - `generateDungeon()`: chunk-maze dungeon (rooms/caves/corridors/loops), spawns, props, chests, torches, exit placement; private `generateThrone()` for depth 100.
- `src/world/town.js` - `VENDORS` table, `makeTownTiles()` (procedural ground tiles), `generateTown()` (fixed seed 1337; buildings, NPC spots, props, portal).
- `src/game/world.js` - `World` container: entity lists, spatial hash, per-frame update order, separation, ambient torches/portal lights + biome particles.
- `src/game/render.js` - `renderWorld()` (floors -> decals -> corpses -> ground fx -> depth-sorted pass -> particles/top fx -> lighting -> overlays/names) and `drawMinimap()` (HUD minimap + full-screen automap).
- Related, out of scope: `src/core/view.js` (TW=64, TH=32, HW=32, HH=16, `isoX=(x-y)*HW`, `isoY=(x+y)*HH`, `camera`), `src/core/assets.js:65 biomeTileSet()` (tileset shape), `src/game/game.js:118-258` (builds Worlds from generator output), `src/gfx/vfx.js` (`lights`, `addLight`, particles, decals).

### Key APIs
TileMap (`src/world/map.js`), all coords in tiles; tile (tx,ty) covers [tx,tx+1)x[ty,ty+1), centre = +0.5:
- `new TileMap(w,h)` :3 - fields `t` (Uint8 0 void/1 floor), `v` (Uint8 visual variant), `block` (Uint8 static obstacle), `seen` (Uint8 fog), `segments`, `segGrid`, `pillars`, `flow` (Int16), `flowFrom`, `flowTime` (unused).
- `idx(x,y)` :16, `inb(x,y)` :17, `tile(x,y)` :18 (0 when OOB).
- `isFloor(x,y)` :19 - float coords; t===1, IGNORES `block`. `walkableTile(tx,ty)` :23 / `walkable(x,y)` :26 - floor AND not blocked.
- `circleFree(x,y,r)` :29 - tests only the 4 corners of the bounding square.
- `move(e,dx,dy,ghost=false)` :34 - axis-separated slide with radius `e.r*0.8`; ghost mode only checks `isFloor` of the new centre (passes blockers, not void). Returns moved bool.
- `los(x0,y0,x1,y1)` :54 - ray-march 3 samples/tile on `isFloor` (blockers do NOT block LOS). `losWide(...)` :195 - 4 samples/tile with `circleFree(...,0.22)` (blockers DO block). `rayLength(x0,y0,ang,len)` :66 - 0.2 step.
- `buildFlow(px,py,maxD=48)` :75 - 4-connected BFS distance field from the player tile over walkable tiles; early-returns if the player tile is unchanged (`flowFrom`). `flowAt(x,y)` :101 (-1 unreachable). `flowStep(x,y)` :107 - best of 8 neighbours (no diagonal corner cutting) -> `[cx,cy]` tile centre or null.
- `findPath(sx,sy,gx,gy,maxNodes=3000)` :127 - 8-dir A* (diag 1.414, Euclid heuristic); goal snapped to nearest walkable within ring r<4; returns `smooth()`ed waypoint list (start excluded; last point replaced by raw (gx,gy)) or null. `smooth(sx,sy,path)` :182 - greedy farthest-visible via `losWide`.
- `randomNear(x,y,r,rng=Math.random)` :206 - 40 tries for walkable+`circleFree(0.3)`, else returns (x,y) unchanged.
- `reveal(x,y,r)` :214 - sets `seen` in a disc.
- `buildWalls(tileset,rng)` :229 - builds `segments`, `pillars`, `segGrid`. Must be called after `t` is final.
- `wallsIn(x0,y0,x1,y1,out)` :283 - pushes segments+pillars whose bucket (by midpoint) intersects the tile rect.

Generators:
- `generateDungeon(depth,biome,tileset,seed)` `src/world/dungeon.js:8` -> `{map, rooms, spawns, props, chests, torches, start:[x,y], exit:[x,y], bossRoom}`; depth===100 delegates to `generateThrone` :212 (adds `throne:true`). Spawn = `{x,y,arch,n,rank:'normal'|'champion'|'unique'|'boss'}`; room = `{cx,cy,x,y,w,h,type:'room'|'cave'|'small',mx,my,idx}`; prop = `{kind:'tower'|'rubble'|'decor', x,y, spr?|sprite?, scale?, seed?}`; chest `{x,y,rare}`; torch `{x,y,depth}`.
- `VENDORS` `src/world/town.js:6` - 8 entries `{id,name,title,sprite,pal,sign,greet}`; ids: weapons, armor, upgrade, enchant, alchemist, gems, socket, gamble (consumed by `ui/vendor.js` via `Vendor.open(id)`, game.js:127).
- `makeTownTiles()` town.js:17 - map of variant code -> `{img,sx,sy,w:192,h:96}`: 0-3 grass, 10-11 dirt, 20-21 cobble, 30-31 plaza.
- `generateTown(tileset)` town.js:26 -> `{map, buildings:[{x0,y0,w,d,spr:{img,ox,oy,w,h},depth,vendor?}], npcs:[{vendor,x,y}], props, portal:{x:40.5,y:39.5}, start:[24.5,28]}`.

World (`src/game/world.js`):
- `new World(kind:'town'|'dungeon', opts)` :10 - `Object.assign(this,opts)` (map, tileset, biome, depth, townTiles, buildings, props, torches) then defaults; always resets creatures/hazards/loot/corpses. Fields: `grid` Map, `time`, `flowTimer`, `ambT`, `boss`, `kills`, `player` (set in game.js:105), `onBossAwake`/`onBossKilled` (set game.js:233/238). `exitOpen`, `lastPlayerTile` are unused.
- `add(c)` :33 (sets `c.world`), `addHazard(h)` :34, `addLoot(l)` :35, `rebuildGrid()` :37, `query(x,y,r,filter?,out=[])` :49 (edge test `r + c.r`), `hostiles(team,x,y,r)` :65 (excludes `targetable===false`), `nearestHostile(team,x,y,r,needLos=false)` :66, `alliesOf(team,x,y,r)` :74, `update(dt)` :76, `separate()` :119, `ambient(dt)` :141.

Render (`src/game/render.js`):
- `renderWorld(ctx, world)` :172 - full frame; called from `game.render()` game.js:362. Sets `creature.sbox` (CSS px) and `npc.sbox` (WORLD px), `G.lootBoxes`.
- `drawMinimap(world, dt, canvas, big=false)` :405 - small HUD map from `ui/hud.js:154`; big automap from game.js:366 when `G.showAutomap` (Tab/M).

### How it works
Tile codes: `t` only uses 0/1. `v` variant: dungeon 0..floors-1 = `tileset.floors[v]`, 100+i = `tileset.details[i]` (13% chance, dungeon.js:206); town uses `makeTownTiles` codes. `render.js:14 floorEntry` picks `world.townTiles` when present, else tileset (fallback `floors[0]`).

Walls (map.js:229-280): for every floor tile with a void 4-neighbour emit a segment. `dir:'f'` ("/" on screen) lies on vertical grid line `x=ex` spanning `ey0..ey1`; `dir:'b'` ("\") on `y=ey` spanning `ex0..ex1`. West/north edges have `front:false` (back walls, top of screen); east/south `front:true`. Each seg gets `mx,my` (midpoint), `lx,ly` (screen-left endpoint anchor: 'f'->(ex,ey1), 'b'->(ex0,ey)), `depth=mx+my`, `spr`, `flip` and `strip`. Sprite choice (pickSeg): when `tileset.walls` exists, a random seamless section, mirrored (`flip`) for 'b' edges, with `strip:true`. Otherwise the old fallback: 'f' -> 80% segFwd native, 20% segBack mirrored; 'b' -> 40% segBack native, else segFwd mirrored (`spr.base`/`spr.slope` anchor). Vertices touched by both orientations get a pillar (`tileset.pillars[0]`, the widest, depth x+y+0.02, `strip` = section width so it is drawn at the same scale). Everything bucketed into 8x8-tile cells (`segGrid`). Render: `segRect` puts a section's face base on the edge, `HW` wide (+0.6 px overlap); the fallback anchors the sprite's bottom line through iso(lx,ly) with `WALL_K`. Walls in front of the hero fade via `cutaway` (screen distance and depth).

Dungeon algorithm (dungeon.js):
1. Chunk grid CWxCH of S=11-tile chunks, map `W=CW*S+2`, `H=CH*S+2` (:11-13). Start chunk: left column random row, or 50% random column on top/bottom row (:20-21).
2. Randomised DFS spanning tree over chunks (:25-35) + 10% extra edge per right/down neighbour = loops (:36-41).
3. One room per chunk (:48-75): roll <0.62 'room' (5..9 x 5..9), <0.8 'cave' (3-6 circular blobs r 1.8-3.4 around chunk centre, plus a 4x4 core; room rect = the core), else 'small' (3..4). Start chunk forced 'room'. Rooms never touch chunk borders => >=2 void tiles between chunks. `carve` never touches the 1-tile map border.
4. Corridors for every connection (:78-87): L-shaped between floor(room centres), width 2 (75%) or 3 (25%), random horizontal-first.
5. BFS over chunk graph; exit/boss room = farthest chunk (first max) (:90-96); forced to an 8x8 'room' if not a room >=7x7 (:98-103).
6. `finishMap` (:202): variants + `buildWalls`.
7. Spawns (:108-150): every non-start room gets packs = `max(exit?0:1, round(area/26 * density * U(0.7,1.3)))` (cave area=28; small rooms 50% 1 pack else 0). Pack size `ARCH[arch].pack` range +1 (40%) beyond depth 30. Arch pick biased to early roster entries (`rng^1.35`). Champions `2+floor(depth/15)` packs of 2-4, uniques `1+floor(depth/30)` packs of 3-5 (not in exit room). Boss: one roster arch excluding bat/spider/beetle at exit room centre. NOTE the exit room also gets normal packs.
8. Obstacles (`placeObstacles`, right after `finishMap`, before spawns), excluding start/exit rooms: tower (45%, room >=7x7), a barricade (50%, rooms >=6x6), and scatter (about 1 per 7 free tiles), all reachability-checked (see [`ART.md`](ART.md)). Then props: 0-3 rubble (non-blocking, scale 0.6-0.9), and a 35% decor pixel sprite only when the biome has no scatter art.
9. Chests (:171-177): 1-3, preferring dead-end chunks (degree 1), at room-centre tile, 20% rare.
10. Torches (:179-183): 7% of back (`!front`) segments, offset 0.12 into the floor.
11. Exit (:193): toward the exit-room side away from the start room, inset 1.5; fallback centre.
`game.js:187 buildDungeon` turns this into a World: chests get `opened/reach/use`, town portal at start+(1.6,-0.6), exit portal sealed until `onBossKilled`, monsters via `makeMonster` (boss level depth+2, elites depth+1; unique pack members become "Minion" normals). Seed is `Math.random()` per entry -> levels are not reproducible across visits/saves.

Throne (dungeon.js:212): fixed 44x80 map: entrance hall (17,68,10x9), gauntlet rects, elliptical arena 32x27 at (6,4); fixed spawns incl. `velscour` boss at (22,14); 12% torches; 4 towers; one rare chest (22.5,72.5); start (22,73), exit (22,7). `biome` arg unused. Depths >100 ("Endless Torment") use the normal generator with sizes capped.

Town (town.js:26): 46x46, floor on [2,44) with grass; plaza (18..30)^2; dirt roads W, N and a diagonal SE road; cobble portal platform 38..42 x 37..41. Vendor i uses `shopSpots[i]` + `palettes[i]` (:45-64); building footprint fully `block`ed; NPC stands 0.9 tiles outside the door ('sw' door -> +y side, 'se' -> +x side). 3 plain houses, well (24.5,24.5), 9 lamps (`light:5`), up to 46 trees/pines (sway, blocking), 40 tries of bush/rock/barrel/crate (bushes non-blocking), shop dressing. Generated once and cached in `game.js:123 townCache`; `seen` is cleared per visit; villagers (game.js:128) wander with `randomNear(24,25,7)`.

World.update order (world.js:76): time += dt -> flow field rebuild (every 0.25 s, maxD 40, only if player alive) -> `rebuildGrid()` -> player.update -> other creatures (enemies with `!awake` farther than 26 tiles are skipped entirely) -> npc.update -> hazards (removed when update returns false or `dead`) -> `separate()` -> remove dead non-player creatures after 0.05 s -> loot.update (removed on false) -> corpses age (removed at t>40 or `used`; cap 70) -> `map.reveal(p,11)` -> `ambient(dt)` -> `updateVfx`. Spatial hash: CELL=2 tiles, key `(cx<<16)|(cy&0xffff)`, built once per frame before updates (stale within a frame). Separation pushes pairs in the SAME cell only, overlap threshold `(a.r+b.r)*0.85`, weights player 0.25 / other 0.75, static never moves, via `map.move` (so respects walls). Monsters chase via `flowStep` only when target is the player and not in LOS (monster.js:166-178); everything else steers directly. Player click-move uses `losWide` else `findPath(...,2500)` (player.js:451).

Render pipeline (render.js:172): clear black + `lights.length=0` -> `camera.apply` (world px) -> tile bounds via inverse-iso of view corners (viewRect(40) with -40/+140 y margins) -> floors (each drawn 1.2px oversize to hide seams) -> `drawDecals` -> corpses -> hazards: `ground` drawn now, numeric `depth` sorted, others "top" -> `drawEffects('ground')` -> depth-sorted list (key d, type f): hazards f1, wall segs f2 / pillars f3 (from `wallsIn(tx0-2,ty0-2,tx1+3,ty1+3)`), props f4 (x+y), buildings f5 (footprint-centre depth), creatures f6 (x+y, +0.2 flying), npcs f7, loot f8 (x+y-0.2), chests f9, portals f10; stable `Array.sort` so ties keep that insertion order -> `drawParticles` -> top hazards -> `drawEffects('top')` additive -> screen space: `drawLighting` -> red hurt flash, white flash, low-HP (<30%) pulse -> `drawOverheadNames` -> `drawLootLabels` -> `drawTexts`. Fog of war is NOT drawn in the main view (only darkness from lighting); `seen` is minimap-only.
Occlusion/translucency (only relative to the player, pd=p.x+p.y, player rect = iso(p) + [-16,-62]..[+16,-4]): segs alpha 0.3 if `depth>pd+0.6` and sprite rect overlaps; pillars 0.3 if `depth>pd+0.6`, |dx|<24 and base in (ppy-10, ppy+64); atlas props and trees/pines 0.35 if `d>pd+0.5`, |dx|<40, base in (ppy-8, ppy+90); buildings 0.4 if `depth>pd` and the inner 70%x85% of the sprite overlaps.
Lighting (:303): quarter-resolution canvas filled with `biome.fog` at alpha `biome.dark`, then `destination-out` radial gradients (stops 0: i, 0.55: 0.6i, 1: 0); player radius `biome.light*(1+p.st.lightPct)`; each `lights[]` entry at 0.85 intensity; positions at z=20; scaled up to full canvas; then a cached vignette (alpha 0 -> 0.6).
Overhead names (:344): champion (#80b0ff) / unique (#ffc040) creature names from `sbox`; NPC name + vendor title; portal labels at z=82; hovered non-boss enemy HP bar + affix names at top centre (bosses use the HUD bar, hud.js:130).
Minimap (:405): small map redraws every 0.2 s (`mmT`), 2.4 px/tile centred on the player; automap redraws every frame, scaled to fit. Draws seen floor tiles, portals (seen or town), unopened seen chests, NPCs, enemies within 14 tiles (boss #ff8000, elite #ffb040, normal #ff3030), player-team creatures green, player white.
Caches: `lightCanvas` + `vignette` (module level, keyed by size), `townCache`/`townTiles` (game.js:28), `biomeTileSet` keeps town + at most 2 recoloured biome sets (assets.js:68), `corpse._img`, creature `_img` memo (creature.js:120), `glowSprite` cache, `pixelSprite` cache (cleared beyond 2500 entries, pixelart.js:927).

### Tuning knobs
- Chunk size `S=11` dungeon.js:6; chunk counts `CW=clamp(4+floor(depth/14)+int(0,1),4,8)`, `CH=clamp(4+floor(depth/18)+int(0,1),4,7)` :11-12 (map 46..90 x 46..79).
- Loop chance 0.1 per edge :38-39; room type split 0.62/0.18/0.20 :53; room size 5..9, small 3..4 :56-57; cave blobs 3..6, r 1.8..3.4 :61-63; corridor width 3 at 25% :81; boss arena min 7x7 else 8x8 :98-100.
- Pack density `1+depth*0.012` :110; packs `area/26` :126; arch bias exponent 1.35 :113; pack +1 at depth>30 (40%) :132; champions `2+floor(depth/15)` (2-4 each), uniques `1+floor(depth/30)` (3-5 each) :137-147; boss excludes bat/spider/beetle :149.
- placeObstacles: tower 45% in rooms >=7x7, barricade 50% in rooms >=6x6, scatter `cells/7 * U(0.7,1.3)`, 65% against walls; rubble 0-3; decor 35% (no-scatter biomes only); floors 70% calm half / 22% any / 8% detail (finishMap); chests 1-3, 20% rare :172-176; torch 7% of back segs :180 (throne 12% :242); detail floor 13% :206.
- Wall sprite mix 0.8 / 0.4 map.js:241,244; segGrid bucket B=8 :272; A* default maxNodes 3000 :127 (player uses 2500); goal snap radius <4 :134; LOS samples 3/tile :57, losWide 4/tile r 0.22 :197-200; collision radius `e.r*0.8` :40; randomNear 40 tries :207.
- World: CELL=2 world.js:7; flow rebuild 0.25 s, maxD 40 :82-83; sleep radius 26 :91; corpse life 40 s / cap 70 :110-112; reveal radius 11 :113 (12 on entry, game.js:115); separation 0.85 overlap, weights 0.25/0.75/0.5 :127-132; ambient rate 22/s desktop, 10/s touch :164; torch light `5.5+0.3 sin`, intensity 0.9 :148; portal light 6 :158.
- Render: `WALL_K=(HW*1.06)/66` (~0.514) render.js:10, pillar scale `WALL_K*1.05` :42; prop scale tower 0.55 / other 0.5 :54; lighting canvas 1/4 res :306, light scale `HW*1.25*zoom*dpr/4` :315; `addLight` cap 48 (vfx.js:326); vignette 0.35*min -> 0.75*max, alpha 0.6 :337-338; NPC sprite height 58 :156; corpse fade over t 34..40 :144; minimap 0.2 s, 2.4 px/tile, enemy radius 14 :409,417,438.
- Town: seed 1337, size 46, plaza 18..31, portal (40.5,39.5), start (24.5,28), trees <=46 of 400 tries town.js:27-92.

### How to extend
- New dungeon room type: add a branch in the room loop (dungeon.js:53-72), carve only inside `[ox+1, ox+S-2]` so chunks stay separated, and set `x,y,w,h,mx,my` to a carved rect (corridors target `floor(mx),floor(my)`, `roomFloorSpot` samples that rect). Adjust pack `area` (:125) if the rect does not reflect the real area.
- New special level (like depth 100): branch at the top of `generateDungeon` (:9), carve `map.t`, call `finishMap(map,tileset,rng)` (mandatory: variants + walls), return the same shape (`map, rooms, spawns, props, chests, torches, start, exit, bossRoom`). Exactly one spawn should have `rank:'boss'` or the exit never opens (game.js:217/238).
- New prop: scatter/barricade-style art -> `{kind, x, y, spr, k (scale), flip}`; other atlas prop -> `{kind, x, y, spr: tileset.<list>[i], scale?}`; pixel-art prop -> `{kind:'sprite'|'decor', sprite:'<pixelart name>', pal, px, light?, sway?}`. If it should block, place it inside `placeObstacles` with `tryBlock(tiles)`, which sets `map.block` and reverts if it would cut the level apart (it runs before spawns). Lights for props come from `pr.light` (world.js:151) plus the glow in `drawProp`.
- New vendor: append to `VENDORS`, AND add matching entries to `shopSpots` and `palettes` (town.js:45-64; index-aligned) on unblocked grass, then handle the new `id` in `ui/vendor.js`.
- New town floor look: add a code in `makeTownTiles` and write it into `map.v` in `generateTown`; `free()` (town.js:86) treats `v<10` as grass.
- New depth-sorted drawable: push `{d, f:<new code>, o}` in renderWorld (:222-239) and add a `case` in the switch (:243). For hazards just give them a numeric `depth` getter (or `ground=true`).
- New biome ambient: add `case '<type>'` in `World.ambient` (world.js:169) and set `biome.ambient={type,color}` in `src/data/biomes.js`. Biome fields read here: `fog`, `dark`, `light`, `torch`, `ambient`, `roster`.
- Dynamic light: `addLight(x,y,radiusTiles,intensity)` from `gfx/vfx.js` - but see the lights-clearing bug below; fix that first.

### Gotchas
- `lights.length = 0` at render.js:177 runs BEFORE `drawLighting` (:329), and every `addLight` call in the codebase happens during update (world.js:148,153,158, loot.js:58,61, hazards.js:127,309,567,649, monster.js:103, shapes.js:248). Net effect: only the player's light reaches the lighting overlay; torches, lamps, portals, loot beams and spell lights don't light anything. Torches have no sprite of their own (render never reads `world.torches`), so in practice they show up only as glow particles.
- Two coordinate spaces for `sbox`: creatures are in CSS px (render.js:271, used by controls.js:13), NPCs are in world px (render.js:168, converted with `camera.toScreen` in controls.js:28 and render.js:361). Off-screen creatures get `sbox=null` (not clickable, no overhead name).
- `los()` ignores `block` (towers, trees, buildings, town houses), but `losWide()`/`walkable()` honour it. As a result monsters see and target through props, while player pathing goes around them.
- `circleFree` checks only 4 corners. With r*0.8 > 0.5 (e.g. velscour r 0.9) the corners are more than 1 tile apart, so a big creature can straddle a single blocked tile.
- `findPath` replaces the final waypoint with the raw goal even when the goal was snapped off an unwalkable tile (map.js:161). The mover then slides against the wall at the end.
- `buildFlow` targets the player only. If the player stands on a non-walkable tile, the field is all -1 and monsters fall back to straight steering. Summons never use the flow field.
- The spatial grid is rebuilt once per frame before updates. Creatures added mid-frame are invisible to `query()` until the next frame. Separation only handles pairs inside the same 2x2 cell. Pairs where the static creature comes first in a cell are skipped (`if (a.static) continue`, world.js:123).
- Dormant enemies more than 26 tiles away aren't updated at all (no status ticks, no regen).
- Building sort depth is the footprint centre (town.js:70). Entities near a long building's ends can sort wrongly, and the 0.4 alpha only applies around the player.
- Wall sorting is an approximation (seg depth = midpoint sum). Front walls rely on the translucency rule. Monsters behind walls are simply hidden.
- `buildWalls` requires non-empty `tileset.walls` or `tileset.segFwd` (and `pillars` for corners). A segment with undefined `spr` is classified as a pillar by `s.spr && s.dir ? 2 : 3` (render.js:223) and crashes in drawPillar.
- The town generator is called once per session and its map/props objects are reused. Don't mutate `townCache` objects per visit except `seen`.
- The generator RNG is seeded, but game.js passes a fresh `Math.random()` seed, and spawn variants/`randomNear` use `Math.random`. Don't rely on reproducibility.
- `drawPortal` reads pillars from `G.world.tileset` rather than its `world` argument (render.js:118).
- Image smoothing is ON ('medium', render.js:179), because the wall/floor atlases are downscaled. Pixel-art sprites are pre-scaled canvases.
- Performance hot spots:
  - Per-frame allocation of the `sorted` array and objects (render.js:208-240).
  - `pixelSprite()` called per prop per frame, which builds a `JSON.stringify` key each time (render.js:57; ~100 town props). Memoise like `corpse._img`.
  - One `createRadialGradient` per light per frame (render.js:321).
  - `buildFlow` allocates a new `Int32Array(w*h)` per rebuild (map.js:83).
  - A* uses a linear-scan open list plus `open.includes` (O(n^2), map.js:153,175).
  - The automap iterates the whole map every frame (render.js:422).
  - Pack density grows without bound past depth 100 (`1+depth*0.012`) while map size is capped, so creature counts climb at endless depths.

### Open issues noticed
- src/game/render.js:177 - `lights.length = 0` is executed at the start of renderWorld, before drawLighting consumes `lights` at render.js:329; all addLight calls happen during World.update (world.js:148/153/158, loot.js:58/61, hazards.js:127/309/567/649, monster.js:103, gfx/shapes.js:248), so only the player light ever appears in the lighting overlay. Fix: clear lights at the start of World.update (or snapshot after drawLighting), keeping paused frames in mind.
- src/world/map.js:161 - findPath overwrites the final waypoint with the raw goal (gx,gy) even when the goal was snapped from an unwalkable tile, so the path ends at an unwalkable point.
- src/world/map.js:60 - los() uses isFloor and ignores `block`, so monsters/ranged checks see through towers, trees and town buildings, while losWide/walkable treat them as solid.
- src/world/map.js:29-31 - circleFree samples only 4 bounding-box corners; for creatures with r*0.8 > 0.5 (e.g. velscour r=0.9, enemies.js:27) a single blocked tile can sit between the corners undetected.
- src/game/world.js:120-123 - separate() only resolves pairs within the same CELL=2 bucket (overlaps across cell borders persist) and skips any pair whose first element is static, so static-vs-mobile separation depends on array order.
- src/game/world.js:50-51 - query() picks cells from r only (not r + creature radius) although the hit test uses r + c.r; large creatures just outside the scanned cells are missed.
- src/world/town.js:67-68 - shopSpots/palettes are index-aligned with VENDORS and hold exactly 8 entries; adding a 9th vendor throws (s undefined).
- src/world/dungeon.js:149 - boss arch = rng.pick(filtered roster) can be undefined if a biome roster ever contains only bat/spider/beetle; makeMonster would then fail.
- src/world/dungeon.js:126 - the exit/boss room still receives area-based normal packs (max(0, round(...)) ~2-3 packs); confirm that this is intended.
- src/world/dungeon.js:110,137 - density/champion/unique counts scale linearly with depth with no cap while map size is capped (CW<=8, CH<=7), so creature counts at endless depths (>100) grow unbounded: a perf risk for rebuildGrid/render/minimap loops.
- src/game/render.js:57 - drawProp calls pixelSprite every frame per prop, building a JSON.stringify cache key each time; should be memoised on the prop (like corpse._img at render.js:140).
- src/world/map.js:83 - buildFlow allocates a new Int32Array(w*h) queue on every rebuild (every 0.25 s while the player moves); could be preallocated.
- src/world/map.js:151-176 - A* open list is a plain array with linear min scan and open.includes (O(n^2)) and no closed set; may hitch on large maps for long click-moves.
- src/game/render.js:422-430 - automap (big=true) iterates the full map and redraws every frame while open; could be cached and only redrawn when `seen` changes.
- src/game/render.js:269-271 - creature sbox uses o.z + (fly?16:0) while Creature.draw adds bob, fly sine and spawn scale (creature.js:146-149); click boxes are slightly off for flyers and spawning monsters.
- src/game/render.js:118 - drawPortal reads pillars from G.world.tileset instead of the world being rendered.
- src/world/town.js:70 - building depth uses the footprint centre; entities near the ends of long buildings can sort incorrectly.
- src/game/world.js:28,30 and src/world/map.js:14 - dead fields: World.exitOpen, World.lastPlayerTile, TileMap.flowTime are never read.
- src/game/render.js:431-441 - automap dot radii and minimap scale are not multiplied by devicePixelRatio (automap canvas is device-px sized at game.js:365), so markers look small on high-DPI screens.
- src/world/dungeon.js:212 - generateThrone ignores its biome argument; dungeon seeds come from Math.random (game.js:191) and are not saved, so a level cannot be regenerated identically.

## Entities, combat, skills runtime, monsters, player, loot

### Files
- `src/game/creature.js`: `Creature` base class for the player, monsters and summons. Holds the shared fields, status and curse ticking, knockback, `moveToward`, sprite drawing and overhead UI (HP bar, stun stars, curse ring).
- `src/game/combat.js`: all damage resolution (`hit`, `aoe`, `kill`, `chainHit`), plus the private `applyStatus`. Also gore, XP, kill legendaries and the `dropLoot` call.
- `src/game/hazards.js`: runtime objects that live in `world.hazards` (projectiles, zones, walls, beams, traps, rain, fissures, orbits, leaps, dashes), plus the targeting helpers `explode`, `lineTargets` and `coneTargets`.
- `src/game/skillrun.js`: `castSkill` turns a skill spec (`sk.kind`, `sk.el`, `sk.fx`, the `sk.m` mods) into hazards, buffs, curses and summons. Also holds `applyCurse` and the `Timer` hazard.
- `src/game/monster.js`: `Monster`. Enemies and player minions share one AI. Also `monsterBase`, `makeMonster`, `makeElite`, `buildSummon`, `createSummon`, and the boss patterns.
- `src/game/player.js`: `Player` (stat recompute, skill damage and use, potions, pickup, XP and levels, death), plus `xpToNext`, `MAX_LEVEL` and `addToBag`.
- `src/game/loot.js`: `GroundItem` (ground drops), `itemIcon`, `dropLoot`, `dropChest` and `drawLootLabels`.

### Key APIs
- `class Creature(o)` creature.js:11
  - Defaults: `r=0.32, team='enemy', maxHp=hp=10, speed=2.5, res={}, status={}, curses={}, buffs=[], scale=1, kbx/kby, flash, hpShow, lunge, spawnT`.
  - Then `Object.assign(this,o)`, then `hp` is clamped to `maxHp`. `id` comes from a module counter (`UID`).
  - Methods: `speedMul()` :43, `disabled()` :51, `tickStatus(dt,onDot)→canAct` :57, `moveToward(tx,ty,dt,speed)→remaining` :101, `face(ang)` :112, `draw(ctx)` :141.
- `hit(src,tgt,amount,el='phys',o={})→dealt` combat.js:23
  - Option keys: `dot, crit(false=never), knock(true|n), ang, burn, poison, bleed, slow, freeze, stun, fear, curse[], pull, leech, noArc, melee, aoe, silent, force` (`force` bypasses `targetable===false`).
- `aoe(world,src,x,y,r,amount,el,o)→count` combat.js:166
  - `o.team` overrides `src.team`. `o.exclude` is a Set that gets mutated. `o.falloff` scales damage by `1-0.4*d/r`.
  - Rolls once: every target gets the same `amount`.
- `kill(tgt,src,info={el,overkill,crit,aoe})` combat.js:179.
- `chainHit(world,src,x0,y0,first,n,dmg,el,color,o)` combat.js:235: hits `first` plus up to `n` more targets (n+1 total), each the nearest unhit hostile within 6. Damage is the same on every hop and `noArc` is forced.
- `explode(world,src,x,y,r,dmg(number|[lo,hi]),el,o,fx)` hazards.js:14 = `explosionFx` + `aoe`.
- `lineTargets(world,team,x0,y0,x1,y1,w)` :20. `coneTargets(world,team,x,y,ang,range,half)` :31 (anything within 0.6 always counts).
- Hazard classes: `Projectile` :36, `Delayed` :196, `Area` :234 (modes `zone|cyclone|wallseg`), `makeWall(world,src,x,y,ang,len,o)` :340, `Orbit` :392, `Whirl` :430, `Leap` :467, `Dash` :504, `NovaWave` :550, `BeamCh` :585, `Trap` :687, `Rain` :749, `Fissure` :793, `AuraFx` :836. `Timer(delay,fn)` is at skillrun.js:16.
- `castSkill(p,sk,L,tx,ty,opts={echo})→bool` skillrun.js:43. Returns false only for corpse or revive casts when no corpse is near.
- `applyCurse(src,t,c,amt,dur,dmg,area=1)` skillrun.js:308.
- monster.js:
  - `monsterBase(level)→{hp,dmg,xp}` :15.
  - `class Monster` :23. Methods: `deal(target,amount,el,o)` :42, `onDamaged(src)` :53, `pickTarget()` :63, `update(dt)` :84, `startAction(kind,windup,data)` :182, `perform(a)` :321, `summonAttack(t)` :416, `buffAllies(stat,amt,r,A)` :503, `bossUpdate` :515, `bossPattern` :549, `bossPerform` :588, `spawnChild` :670.
  - `makeMonster(world,archId,biome,level,rank='normal',x,y,variant=0)` :687.
  - `makeElite(m,rank,depth,world)` :719.
  - `buildSummon(owner,def,key,x,y,dmg,hp,life)` :758.
  - `createSummon(p,sk,L,x,y,dmgRange,corpse?)` :772.
- player.js:
  - `xpToNext(L)=round(60L²+40L)` :14 (L1=100, L10=6400). `MAX_LEVEL=100` :15.
  - `class Player(char)` :19. Methods: `recompute()` :47, `skillLevel(sk)` :131 (calls `effLevel`), `synergy(sk)` :133, `skillDamage(sk,L)→[lo,hi]` :139, `heal(n,quiet)` :150, `addBuff(b)` :157 (replaces by `id`, then recomputes), `gainXp(n)` :166, `levelUp()` :178, `applyGrants()` :197.
  - More methods: `pickup(g)→bool` :218, `usePotion(kind)` :243, `canUse(sk)→'unlearned'|'cooldown'|'mana'|null` :266, `tryUseSkill(sk,tx,ty,target=null)→bool` :274, `onHit` :319, `die(src)` :326, `update(dt)` :345, `setMoveTarget` :440, `walkTo` :446.
  - `addToBag(c,item)→bool` :468: gems stack by `gem`+`tier` into `.count`; everything else goes in the first null slot of `c.bag`.
- loot.js:
  - `GroundItem(x,y,kind,data)` :11. `kind` is one of `gold|orb_hp|orb_mp|item|potion`. Has `label`/`color` getters. `update(dt,world)` returns false to remove.
  - `itemIcon(item,size=48)` :106, `dropLoot(world,m)` :122, `dropChest(world,chest,depth)` :153, `drawLootLabels(ctx,world,mouse)→boxes` :164.

### How it works
- **Frame order** (`World.update`, world.js:76):
  1. Rebuild the flow field to the player every 0.25 s (radius 40).
  2. `rebuildGrid` (2-tile cells).
  3. `player.update`.
  4. Update creatures. Sleeping enemies more than 26 tiles away are skipped.
  5. Update NPCs.
  6. Update hazards (iterated backwards; removed when `update` returns false or `h.dead`).
  7. `separate()` pushes overlapping bodies apart.
  8. Splice dead creatures after 0.05 s.
  9. Update loot.
  10. Expire corpses (after 40 s, or when `used`; max 70).
  - Creatures added mid-frame are not in the spatial grid until the next frame. `query` skips dead ones.
- **Hazard contract**: an object with `update(dt)` (false means remove) and `draw(ctx)`. `world.addHazard(h)` sets `h.world`.
  - Render layer: `h.ground` is drawn under everything. A numeric `get depth()` means depth-sorted with creatures. Anything else is drawn in a top pass (render.js:207-212, 281).
  - Team is taken from `src.team`. Every hit must pass the caster as `src` so crit, leech, XP and aggro attribution works.
- **hit() pipeline** (combat.js:23). Returns 0 if the target is dead, `invuln>0`, untargetable, or `amount<=0`.
  - Player target:
    1. Block: non-DoT hits have a `min(0.6, block/100)` chance to deal 0.
    2. Physical hits: `×(1-armor/(armor+30+lvl*18))`, where `lvl = src.level || depth`.
    3. Resistance: `×(1-clamp(res,-100,75)/100)` using `PLAYER_RES` (fire/cold/light/poison; acid uses poison res; everything else uses `res.magic`).
    4. Then `st.reduce` (never set), the attacker's `weaken` curse, and `G.godMode`.
    5. Thorns go back to the attacker: `st.thorns`, plus `1.5×dmg` with the `thorns` legendary.
  - Monster target:
    1. `×(1-clamp(res,-1,0.9))`. Arcane halves res.
    2. Holy ×1.5 vs `undead||demon`.
    3. Curse `amp`/`mark` add +amt%. Status `shred` adds +amt.
    4. If the owner is the player: `bossDmg%`. Crit only when `src.isPlayer`, not DoT and `o.crit!==false`: chance `critChance%`, damage ×`(1+critDmg/100)`.
    5. Bosses: freeze is stripped and stun becomes 15%.
  - Then a ±8% roll, minimum 1 damage. Then `onDamaged` (non-DoT only), `awake=true` (non-DoT), `aggro=src` (if different team), float text, blood and spark FX, and `hitStop` 0.035 s on crits above 30% max HP.
  - `applyStatus` runs only for non-DoT hits.
  - Player leech: `(lifeSteal + 4 if o.leech + 2 if shadow + 3 if blood)%`, ×0.3 on DoT. Then `manaSteal`, the target's `leech` curse (heals `amt%×0.3`) and `Player.onHit`. Summons heal their owner `dmg×leech×0.2`.
  - `hp<=0` → `kill`.
- **applyStatus** (combat.js:125). All statuses are `{t, dps|amt, src}` objects; they are never deleted, only allowed to reach `t<=0`.

| Status | Trigger | Strength | Duration |
|---|---|---|---|
| burn | fire, 25% chance (always if `o.burn`) | dps `max(old, dmg×0.2)`, or ×0.35 with `o.burn` | 3 s |
| poison | poison el or `o.poison` | dps `dmg×0.3`, or ×0.45 | 3.5 s |
| bleed | blood el or `o.bleed` | dps `dmg×0.3` | 3 s |
| chill | cold, `o.slow`, or Frostbite legendary | slow 0.3 (0.45 with `o.slow`) | 2.2 s |
| freeze | `o.freeze`: 35% chance, never bosses; Frostbite 10% | | player 0.8 s, monster 1.4 s |
| stun | `o.stun` | | player 0.5 s, monster 1.1 s |
| fear | `o.fear`, never bosses | | 2.5 s |
| acid | acid el | shred +15% dmg taken (3 s) and slow 0.15 (2 s) | |
| `o.curse` | non-curse-kind skills with `curse=` | writes `{t:5, amt:25}` directly | 5 s |

  - Knockback: `k = knock×7×(0.4 if player)/max(0.6, r/0.35)`. Static targets and bosses are never knocked. `o.pull` pulls 9 toward src.
  - Light: 22% chance to arc to a hostile within 3.5 for 35% damage. Thunder legendary: 12% chance of a 60% bolt.
  - There is **no `shock` status**. "shocking" is only an elite affix.
- **DoT ticking** (`tickStatus`, creature.js:57). Any status with `dps` ticks every 0.5 s for `dps×0.5`, through `onDot`, which calls `hit(...,{dot:true})`.
  - Monster element mapping (monster.js:90): burn→fire, poison→poison, bleed→blood, other→shadow (the `decay` curse).
  - Player mapping (player.js:352): burn→fire, poison→poison, else→blood.
  - Curses tick down here too. `decay` deals damage. `bomb` and `doom` call `onExpire` once.
  - Knockback velocity is applied through `map.move` and decays by `0.0015^dt`.
- **Curses** (`applyCurse`, skillrun.js:308).
  - Damage taken and dealt: `amp`/`weaken` use `amt`; `mark` uses `amt×1.5`.
  - `slow`: `min(0.65, 0.3+amt/200)`. `leech`: `max(4, amt/3)`. `thorns`: `max(40, amt×2)`% reflected in `Monster.deal`.
  - `fear` ≤4 s (not bosses). `stun`: bosses only 25% and ≤0.6 s, otherwise ≤3 s. `freeze` 1.6 s (not bosses). `confuse`: the monster targets its own team.
  - `charm` ≤10 s: not bosses or uniques. It flips `t.team` to `'player'`; `Monster.update` restores it from `curses.charm.team`.
  - `decay`: dps = `roll×0.8`. `bomb`: 2.2 s, then a fire explosion, r `1.8×area`, ×2.2 damage. `doom`: 3 s, then a shadow hit ×2.5 with `force`.
  - Any unknown curse key is stored but does nothing.
- **kill()** (combat.js:179).
  - Player target → `Player.die`.
  - Otherwise: `dead=true`, call `onDeath`. Summons only burst and return (no loot or XP).
  - Gore: amount comes from the `G.settings.gore` setting (0/1/2, where 2 means ×1.4). Gibs on overkill (>0.5 of max HP, >0.25 for aoe, >0.3 on crit), for big targets, or 35% of the time.
  - A corpse is pushed to `world.corpses` only if not overkill. `fiery` affix: death blast, 1.5×dmg fire to a player within 1.8. `split`: two `spawnChild` (one generation in practice).
  - If the killer or its owner is player-team: `world.kills++`, then `G.player.gainXp(tgt.xp)` (enemy team only), `char.kills++`, and the `bloodbath` legendary (aoe 1.6, 35% of max HP, blood DoT). `vamp` legendary heals 2%. Then `dropLoot`.
  - Bosses always call `world.onBossKilled` (game.js:238 opens the exit, grants a bonus skill point on first clear, and shows the victory screen for Velscour).
- **Skill cast flow.** controls.js → `Player.tryUseSkill` (player.js:274):
  1. Town: refuse with a message.
  2. `castLock>0`: queue the cast (latest only; replayed in `update` when the lock ends).
  3. Active channel: a `BeamCh` is cancelled (`channel=null`); Whirl, Leap or Dash refuse.
  4. Check the level, cooldown and mana.
  5. Melee with a clicked target out of `skillRange+target.r+0.2` → set `attackTarget` and walk.
  6. Pay mana. The `surge` legendary has a 15% refund chance.
  7. `castLock = useTime/(1+spd/100)`, where `spd` is `atkSpeed` if `sk.attack`, else `castSpeed`. Cooldown = `cooldown(sk)×(1-cdr/100)`. Set `aim`.
  8. `castSkill`. If it returns false, refund mana and cooldown.
  9. Echo: `echoChance%`, not for summon or buff kinds. A `Timer` re-casts after 0.2 s at the live `aim` with `{echo:true}`, which skips the on-cast procs. No mana or cooldown is charged.
- **castSkill per kind** (skillrun.js:52).
  - Shared setup: `dmg=p.skillDamage(sk,L)` ([lo,hi]), `area=1+areaPct/100`, `o=statusOpts(m)` (copies burn/poison/bleed/slow/freeze/stun/fear/knock/leech/pull and `curse`). `clampTarget` limits range and walks back onto floor; there is no LOS check.
  - `melee`:
    - range `1.5×m.range×m.r` (×1.15 for thrust). Arc: `m.arc`, or 170° with `cleave`, 36° thrust, 360° spin, else 115°.
    - `m.n` strikes 0.085 s apart, aimed at the live aim.
    - Extras: `m.gold` (25% gold per target), `m.chain` (0.6× damage), `m.exp` (r `1.2×m.r×area`, 0.6×).
  - `proj`:
    - Count `n=m.n+floor(extraProj)`. Spread: `m.spread`, or `min(80,10+5n)`°.
    - Speed `9×m.spd×(1+projSpeed%)`, ×1.4 for bullet, ×1.25 for arrow. Range `10×m.range`.
    - Flags: `ring`, `rand` (staggered 0.035 s). pierce: 99 if `m.pierce`, plus `floor(st.pierce)`. bounce: `m.bounce` (+`chainPlus` only if `m.bounce`).
    - home: `m.home||st.homing`. split: `m.split` or `splitChance%`. Also `ret` (boomerang), `lob` (±1 jitter), `exp` (`1.1×m.r×area`), `chain` (+`chainPlus`), `spray`, `pull`, `dur`.
  - `nova`: `m.n` NovaWaves 0.28 s apart, r `3×m.r×area`, with `heal`, `pullIn`.
  - `aoe`: r `1.6×m.r×area`, target range 10. Four cases:
    - `n&&dur`: n random blasts over `dur`.
    - `dur` only: a zone-mode `Area`, tick 0.3, 40% damage. With `m.pull`, a ×2 void blast at the end.
    - meteor, nuke or `m.delay`: a `Delayed` with delay `m.delay ?? 0.85`.
    - otherwise: an instant `explode`.
  - `beam`: len `8×m.range` (×0.55 for a cone). Channelled if `m.dur>0`: 0.32× damage per 0.13 s tick, follows `p.aim`. `m.n` beams 0.35 rad apart.
  - `chain`: first target is the nearest within 3 of the cursor, else within 7 of the player with LOS. Hops `(m.n||4)+chainPlus`.
  - `wall`: `makeWall`, len `4.5×m.len×area`, dur `m.dur||5`. `block` writes `map.block` (cleared when the segment expires). `ring` r `2.6×area`.
  - `zone`: `Area` r `1.8×m.r×area`, tick 0.5, full damage per tick. `follow` (sticks to the player), `heal` (3% max HP per tick), `slow`.
  - `orbit`: `m.n||3` blades, +`extraProj` for blade/hammer/axe/rang/orb/bone/shard/feather. r `1.6×m.r×area`, 0.33 s per-target cooldown.
  - `cyclone`: `m.n` wandering Areas, r `0.95×m.r×area`, tick 0.25.
  - `whirl`: tick 0.22, r `1.35×m.r×area`, speed 4.2, follows `p.aim`.
  - `leap`: range `6.5×m.range`. The caster is `invuln` during the 0.48 s flight. Lands with an explosion (knock ≥0.6); `m.nova` adds a 0.5× nova.
  - `dash`: len `min(5×m.range, max(2, d+0.5))`, speed 16. `m.n` chained re-targeting segments. `exp`: r 1.5 at each segment end.
  - `blink`: teleport (range 6.5). `m.nova` adds a nova, r `2.2×area`.
  - `summon` → `summonCast`. Revive (`m.sum==='revive'`) uses corpses within 5.
  - `buff`: `addBuff({stats:{each m.buff → buffAmount}, t:skillDuration, pulse, transform, slowPulse})`. `pulse` is a 1/s aoe, r 2.6. `m.party` gives summons a `partyBuff`. Also adds an `AuraFx`.
  - `curse`: r `2.2×m.r×area` at the cursor (range 9) or on self (`at=self`).
  - `heal`: `(m.amt||20)×(1+0.04(L-1))`% of max HP.
  - `trap`: `m.n` traps in a spiral pattern. Arm 0.5 s, life 25 s, trigger radius 1.2.
  - `rain`: `(m.n||12)+3×extraProj` drops over `m.dur||1.2` s, r `2×m.r×area`.
  - `strike`: `m.n` strikes 0.09 s apart, cycling through hostiles within `5×m.r`; aoe 0.95×area each.
  - `fissure`: `m.n` lines over `m.spread||40`°, len `7×m.range`.
  - `corpse`: up to `m.n||3` corpses within `4×m.r`. Base damage = roll + 25% of the corpse's max HP. bone: 8 piercing bones. crow/spirit: 4 homing projectiles. Otherwise a blast, r `1.9×area`.
  - After the switch, non-echo casts roll `novaOnCast%` (nova at 0.5×) and `orbitOnCast%` (orb at 0.4×).
- **Monster.update** (monster.js:84). Order:
  1. Decrement timers.
  2. `tickStatus` (may kill).
  3. Expire `life` (summons).
  4. Revert charm.
  5. Decay `partyBuff`.
  6. Affixes `regen`/`frozen`; `defAura` summon aura (`chance(dt×2)`, aoe 0.3×dmg as DoT).
  7. Stop here if frozen or stunned.
  8. Decrement `cd` (sped up by `partyBuff.stats.as`).
  9. Fear: flee.
  10. If in `windup`/`act`: `runAction`.
  11. Bosses: `bossUpdate`.
  12. `pickTarget`. If none: `idle` (wander within 2.5 of home, or `followOwner`).
  13. On first target: `awake=true` and `alertPack` (wakes allies within 6).
  14. Dispatch on `ai`: melee/brute, ranged/caster, charger, swarm, nova, beamer, exploder, turret, aura, follow.
- **Actions.**
  - `startAction(kind,windup)` sets `state='windup'`. When the windup ends, `perform(a)` runs and sets `cd`.
  - `charge` is ongoing at 13 tiles/s; it hits once for 1.4×dmg with knockback.
  - Targeting (`pickTarget`): taunt totems within 6 first; then `aggro` while within 14; then the nearest hostile (range 30 if awake, otherwise `aggroRange` 8.5 with LOS).
  - `chase`: direct movement if flying, ghost, closer than 2.2, or LOS within 9; otherwise `map.flowStep` toward the player.
- **Elites** (`makeElite`, monster.js:719).

| Rank | HP | Dmg | XP | Scale | Affixes |
|---|---|---|---|---|---|
| champion | ×3 | ×1.4 | ×3 | 1.15 (blue aura) | 1 (2 if depth>40) |
| unique | ×5 | ×1.6 | ×6 | 1.3 | 2 (3 if depth>50), random `uniqueName()` |
| boss | ×(14+depth/4) | ×1.9 | ×25 | 1.9, `r×1.6` | 1 if depth>20 (excludes teleport/multishot/fast) |
| Velscour | ×40 | ×2.4 | ×200 | 1.6 | none |

  - Bosses also get `ai='boss'`, `atkCd 1.1`, `aggroRange 9`, element = biome element (fallback fire), and `res[el]=0.4`.
  - Affix effects:
    - `strong`: dmg ×1.5. `fast`: speed ×1.4, atkCd ×0.75. `tough`: HP ×1.5, +0.15 to phys/fire/cold/light/poison res.
    - `fiery`: +0.4 fire res, melee burns, death blast. `frozen`: +0.4 cold res, chills the player within 3. `shocking`: 5 sparks on hit, 1.2 s cooldown.
    - `vampiric`: heals 30% of damage dealt via `deal`. `multishot`: 3 shots (ranged/caster only). `thorns`: 0.25×dmg back to the player. `regen`: 2% HP/s.
    - `teleport`: no code.
  - Greater variant (`variant=1`): HP ×1.4, dmg ×1.2, XP ×1.5, scale 1.08, speed ×1.05, hue shifted +35, next tier name. Chance `min(0.5, 0.2+depth×0.005)` per pack (game.js:224).
- **Bosses** (`bossUpdate`, monster.js:515).
  - Wake at distance ≤9 with LOS → `world.onBossAwake`.
  - At <50% HP: phase 2. Speed ×1.2, atkCd ×0.75, "ENRAGED!", and `summon` is pushed to the front of the queue.
  - Every `rand(2.6,4.2)` s (×0.7 in phase 2) the boss pops a pattern from a shuffled `patterns` queue. Between patterns it chases and melees (0.35 s windup).
  - Pattern list: Velscour gets all 8. Other bosses get `3+min(3, floor(depth/20))` random ones, and `slam` is always added.

| Pattern | Windup | Effect (normal / Velscour) |
|---|---|---|
| slam | 0.9 | r `3.2×scale/1.6`, 1.8×dmg, knock 1.5 |
| nova | 0.7 | 18 / 28 projectiles; 2 rings in phase 2 |
| volley | 0.5 | 5 / 9 projectiles, 0.16 rad apart |
| charge | 0.8 | len `min(10, d+2)` |
| summon | 1.0 | 3 (+2 in phase 2) from the biome roster without abomination / 5 from demon, imp, gargoyle, knight |
| meteor | 0.4 | 4 / 7 Delayed blasts, 1.2-1.5×dmg |
| spiral | 0.6 | 36 / 60 steps, 0.06 s apart, 3 / 4 arms |
| beam | 1.0 | len 11, width 0.75, 2×dmg |

- **Summons.**
  - `createSummon`: HP = `max(20, p.maxHp×def.hp×(1+0.08(L-1))×(1+summonPct%))`; damage = avg skill damage × `def.dmg` × the same `summonPct` factor; life = `m.dur||0`.
  - Revives copy the corpse sprite (hue +120) with HP ≥60% of the corpse's max HP.
  - Caps: per skill `m.max || (m.dur ? 99 : m.n||1)`, evicting the oldest by setting `dead=true` (no `kill()`); 40 per owner overall.
  - Melee summons use `perform('melee')` (reads `atk.slow/freeze/stun/aoe/chain`). Only `ai` turret/aura/follow call `summonAttack` (atk types proj, chain, strike, beam, nova, heal, buff, curse, spawn, melee).
  - Summons without `life` that are not static carry across worlds (game.js:92).
- **Player.recompute** (player.js:47). Item stats are summed per slot; buffs are summed.
  - Attributes: `armor=(items+add.armor+str)×(1+(armorPct+buffArmor)%)`. Elemental res = specific + resAll + buffRes; `magic=round((resAll+buffRes)×0.75)`.
  - Offense:
    - `crit=clamp(5+dex×0.05+critChance+buffCrit/4, 0, 75)`, `critDmg=50+x`.
    - `atkSpeed=min(150, dex×0.3+...)`, `castSpeed=min(150, int×0.1+...)`, `moveSpeed=min(80, x+0.6×buff)`.
    - `dmgPct=add+buffDmg(+30 during Fury)`, `physPct=add+str`, `elemPct[k]=add+int`. `primary` = the class primary attribute.
  - Defense:
    - `block=min(60, x+buff/2)`, `cdr=min(60, x+buff/2)`, `thorns=x+buffThorns×level×0.2`.
    - `maxHp=round((C.life+(lvl-1)C.lifeLvl+vit×3+life)×(1+lifePct%))`, `maxMana=C.mana+(lvl-1)C.manaLvl+int×2+mana`.
    - `lifeRegen=0.6+0.12lvl+0.05vit+x+maxHp×buffRegen/1000`, `manaRegen=1.6+0.15lvl+0.06int+x`, `speed=4.2×(1+moveSpeed%)`.
  - `skillDamage` (player.js:139): `mult=(1+(dmgPct+primary+elBonus)/100)×synergy`, where synergy is `1+0.03×points in other skills of the same tree`. Berserk legendary: +4% per 10% missing HP. `[(base×0.85+wpn0×wc)×mult, (base×1.15+wpn1×wc)×mult]`, rounded, with minimums 1 and 2.
- **Player.update order**:
  1. Timers.
  2. `tickStatus`.
  3. Regen.
  4. Potion HoTs.
  5. Buff expiry and pulse; recompute only if something changed.
  6. `scale` 1.22 while transformed.
  7. Cooldowns.
  8. `castLock`, then the queued cast.
  9. Legendary `orbit` (permanent 3 blades, 0.4× of skill `<cls>.0.0`) and `inferno` (fire Area every 0.3 s while moving).
  10. Stop if disabled or channelling.
  11. Movement: `moveVec` (WASD/joystick) > `attackTarget` > `interact` (`t.use()` within `reach||1.4`) > `moveTarget` via `walkTo`. `walkTo` goes direct if `losWide`, else `findPath(...,2500)`; gives up after being stuck 0.4 s.
- **Progression and death.**
  - `gainXp`: penalty when `char.level-depth>5`: `max(0.1, 1-(diff-5)×0.1)`, then ×`(1+xpPct%)`.
  - `levelUp`: +5 stat points, +1 skill point, full heal, `applyGrants` (GRANTS table; auto-slots to the bar).
  - `die`: the `phoenix` legendary revives at 50% HP (90 s cooldown, no invulnerability). Otherwise `G.game.onPlayerDeath` (game.js:286 resets to town, depth 1).
- **Potions** (`usePotion`, 0.4 s cooldown, belt max 30 per kind):

| Potion | Effect |
|---|---|
| hp | 45% max HP over 2 s |
| mp | 50% max mana over 2 s |
| rejuv | instant 35% HP and 35% mana |
| fury | `furyT=15` (+30% dmg) and buff `as:30` for 15 s |

- **Pickup.** gold adds to `char.gold`. `orb_hp` heals 15%, `orb_mp` restores 18%. Items go through `addToBag`.
  - `GroundItem.update`: gravity 420. Magnet after 0.4 s: gold radius 2.2, orbs 3.2.
  - Auto-pickup after 0.35 s within 0.55, or within 1.2 when clicked (`lootTarget`). Items auto-pickup only if `G.touch||settings.autoLoot`.
  - Non-items despawn after 120 s; items never despawn.

### Tuning knobs
- `monsterBase` (monster.js:15):
  - `hp=20×1.066^(L-1)`, `dmg=(3+min(L,10)×0.15)×1.052^(L-1)`, `xp=4×L^1.5`.
  - Examples: L1 = 20 / 3.15 / 4; L50 ≈ 458 / 54 / 1414.
  - Archetype multipliers `A.hp/A.dmg/A.xp` come from data/enemies.js.
- Monster level is set in game.js:215-228: depth for normals, +1 for elites, +2 for bosses.
- Monster defaults:
  - `atkCd=1.2`, initial `cd=rand(0.4,1.4)`, `aggroRange 8.5`, `atkReach 0.55` (brute 0.7).
  - Melee windup 0.32 (summons 0.15). Brute slam 45% chance, 0.6 s windup, 1.6×dmg.
  - charger: range (2.2, 7), windup 0.55. nova: windup 0.65. beamer: windup 0.75, 1.4×dmg. exploder: windup 0.4, r `1.7×scale`, 1.6×dmg. aoeCast: windup 0.4, delay 1.0, 1.1-1.4×dmg.
  - summoner: 35% chance, 2 skeletons.
- Monster resistances (makeMonster, monster.js:698-704):
  - biome element 0.3; undead poison 0.5 / shadow 0.3; armor +0.15 phys; elemental 0.6 to its own element; slime acid 0.5.
  - Name tier: `floor(depth/34)+variant`.
- Combat constants (combat.js):
  - Armor constant `30+lvl×18` :41. Player res cap 75 :45. Monster res clamp (-1, 0.9) :58.
  - DoT tick 0.5 s (creature.js:65). Damage variance ±8% :75. Light arc 22% / 35% :148. Knock base 7 :140.
- Loot (`dropLoot`, loot.js:122). `R = {normal 1, champion 3, unique 5, boss 10}`.

| Drop | Chance | Amount / count | Notes |
|---|---|---|---|
| gold | 45% normal, 100% elites | 5 piles for bosses | each `(3+2.2lvl)×rand(.6,1.4)×√R×(1+gf%)` |
| greed legendary | 15% | 4 extra piles | |
| orb_hp | `.14√R` | 1 | |
| orb_mp | `.10√R` | 1 | |
| potion | `.035R` | 1 | hp ×2, mp ×2, rejuv, fury |
| gear | normal 8.5%; champion 60% | normal 1; champion 1-2; unique 2-3; boss 4-6 (+2 on depth%10===0) | |
| gems | normal 2.5%; elites 25% | 1; boss 1-3 | boss gem ilvl+6 |

  - Gear `bonus`: champion 0.3, unique 0.6, boss 1.2. ilvl = `lvl + (boss 3, normal 0, else 1) + randi(-1,1)`.
- `dropChest`: items 1-3 (rare: 3-5) at ilvl depth+1, bonus 0.25 (rare 0.8); gold piles `(10+4×depth)`; gem 30% (rare 80%) at depth+4; potion 50%.
- Skill kind multipliers live in data/skills.js:15-25 (`KIND_DMG`, `KIND_MANA`, `KIND_CD`, `KIND_USE`), and weapon coefficients in `weaponCoef` (skills.js:88). Attack kinds: 0.8; summon, buff, heal, curse: 0.25; other: 0.45.

### How to extend
1. **New skill kind:**
   - Add a `case` in `castSkill` (skillrun.js:52) using `dmg`, `area` and `o`. Return false to refund the cost.
   - Add `KIND_DMG/KIND_MANA/KIND_CD/KIND_USE` entries and a `skillRange` case in data/skills.js. Add the kind to the `sk.attack` rule (skills.js:52) if attack speed should apply.
2. **New hazard:** write a class with `update(dt)→bool` and `draw(ctx)`, plus `ground=true` or `get depth()`. Add it with `world.addHazard`. Deal damage via `hit`, `aoe` or `explode`, with `src` set to the caster.
3. **New monster archetype:** add an `ARCH` entry in data/enemies.js. Fields read by makeMonster: `sprite, pal, px, r, ai, el, hp, dmg, xp, spd, range, proj{fx,speed,lob}, undead, demon, fly, ghost, poison, split, summoner, aoe, armor, gore, names[3]`. Then add it to biome rosters.
4. **New AI:** add the `ai` case in the dispatch (monster.js:122) and an `aiX(dt,t,d)` method. Use `startAction(kind,windup,data)` with a matching `case` in `perform` that sets `this.cd`.
5. **New elite affix:**
   - Add a key to `ELITE_AFFIXES` (enemies.js:39).
   - Stat changes go in `makeElite` (monster.js:747).
   - Behaviour goes in `Monster.update`, `deal`, `onDamaged`, or `kill` (combat.js:208).
   - Add the display name to the map at render.js:398.
6. **New boss pattern:** add the name to `base` (monster.js:739), a telegraph plus `startAction('boss_<x>',windup)` in `bossPattern`, and the effect in `bossPerform`. The `boss_` prefix is required: the `perform` default routes it (monster.js:410).
7. **New summon:**
   - Add a `SUMMONS` key (data/summons.js) and a skill spec `name|summon|el|fx|sum=<key> n= dur= max=`.
   - Pick `ai` turret, aura or follow if `atk.type` is anything other than melee.
8. **New status:** set `tgt.status[k]={t,dps?,amt?,src}`. `tickStatus` decrements it automatically and DoT-ticks anything with `dps`. Map the element in both `onDot` callbacks (monster.js:90, player.js:352). Hook the effect into `speedMul`/`disabled`, and add visuals (creature.js:70-74).
9. **New legendary:** add a `LEGENDARY` key (data/items.js:105), optionally with `stats`. Read `st.legendary.<key>` (set at player.js:60) in `hit`, `applyStatus`, `kill`, `Player.update` or `tryUseSkill`.
10. **New player stat:** add the affix in data/items.js and expose it in the `st` object in `recompute` (player.js:72-114). Unknown `add.*` keys are dropped silently.

### Gotchas
- **Zone ticks are DoT:** `Area` in `mode 'zone'` hits with `dot:true` (hazards.js:270). DoT hits never apply statuses, never crit, don't wake monsters, and leech at only 30%.
  - Poison and cold zones therefore don't poison or chill. Only `m.slow` (direct `status.slow` 0.4) works.
  - Cyclone and wall segments are not DoT.
- **Channelled beams:** every tick after the first is DoT (hazards.js:612,618).
- **Re-mitigation:** status dps is computed from already-mitigated damage, and each tick runs through `hit` again (res, amp/mark, bossDmg all apply twice).
- **Physical hits on the player** fall into `st.res.magic` too, because `PLAYER_RES` has no `phys` key (combat.js:43-44).
- **`hostiles()` semantics** (world.js:65): `team !== myTeam && targetable !== false`. Charm works only by flipping `team`. Confused monsters can only hurt allies through direct `deal`/melee; their projectiles and aoe still filter by team.
- **`Monster.deal` coverage:** only melee, charge, beam and boss_beam go through `deal` (vampiric, thorns curse, summon leech). Projectiles and explosions call `hit` directly. Summon leech is paid twice on `deal` hits (0.15 in `deal` + 0.2 in `hit`).
- **Ranged summons ignore `def.atk`:** summons with `ai:'ranged'` use `perform('shoot')` (monster.js:349). `this.proj` is unset, so they fire `PROJ_FX[el]` at speed 7, range 7, with no homing, explosion or beam.
  - Affected: Frost Wyrm, Elder Wyrm, Voidspawn (beam), Mech and Rocket (exp), Clone and Chorus (home), Skeletal Archer (shoots 'rock').
  - Mother Ooze (`ai:'melee'`, `atk.type:'spawn'`) never spawns.
- **Deaths that bypass `kill()`:** summon eviction, `life` expiry and exploder self-detonation set `dead=true` directly. No XP, loot, corpse or gore; exploders only get `world.kills++`.
- **Corpse supply:** corpses are only created on non-overkill deaths of creatures with `sprite`. Corpse and revive skills depend on this.
- **Boss rules:** stun is rolled twice (15%×15% ≈ 2.25%, combat.js:73 + 134). Freeze, fear and charm are blocked. `NovaWave.pullIn` (hazards.js:576) and `Trap` pull (hazards.js:700) DO move bosses; the other pulls don't.
- **Projectile hitbox** scales with `m.r²`: `r=0.3×m.r` and `size=m.r`, and collision uses `r×size` (hazards.js:120).
- **Damage rolls:** `aoe()` rolls once for all targets. `explode` with an array rolls once. Projectiles roll per hit.
- **`Player.onHit`** fires on DoT ticks and on hits by the hammer orbit itself (src = player), so Hammerfall can self-feed.
- **Recompute triggers:** `recompute()` runs on `addBuff`, buff expiry and level-up. External code changing equipment must call `p.recompute()`. `this.dirty` is set false but nothing reads it.
- **`tryUseSkill` in town** always returns false. Tests must use a dungeon world.
- **`G.player` vs `world.player`:** `dropLoot` and kill XP read `G.player`, not `world.player`.
- **Spawned minions pay out:** monsters summoned by cultists or bosses are `team:'enemy'`, so they grant full XP and loot.

### Open issues (also returned as a list)
See the `open_issues` field.

### Open issues noticed
- src/game/combat.js:43-45 — physical damage to the player falls through to `st.res.magic` because PLAYER_RES has no 'phys' key, so phys is reduced by both armor and the magic res derived from resAll. Probably unintended.
- src/game/combat.js:48 + :75 — `G.godMode` sets dmg=0, but `Math.max(1, ...)` still deals 1 damage per hit. G.godMode is never set anywhere in the code (console/debug only).
- src/game/combat.js:46 — `st.reduce` (damage reduction %) is read but never produced by Player.recompute (player.js:72-114). It is a dead knob.
- src/game/combat.js:73 + :134 — boss stun is rolled twice (15% then 15% again), so the effective chance is ~2.25%.
- src/game/hazards.js:270 — Area mode 'zone' hits use dot:true, so applyStatus is skipped. Zone skills never burn, poison, chill or freeze. 'Frozen Throne' (skilldata.js:175, `freeze`) does nothing, and `freezeZone` passed at skillrun.js:159 is never read.
- src/game/monster.js:201-209,349-361 — summons with ai 'ranged' use generic perform('shoot') and ignore def.atk (fx, home, exp, n, spd, range, beam/cone). Affects frostwyrm/elderwyrm/voidspawn (summons.js:62,65,68), mech (:93), clone/chorus/ancestor/witch/prismslime (homing), and skelarcher/wraith (they shoot PROJ_FX.phys 'rock').
- src/game/monster.js:122-134 + summons.js:83 — Mother Ooze has ai 'melee' and atk.type 'spawn', but summonAttack is only reached from turret/aura/follow, so it never spawns slimelings.
- src/game/monster.js:96,106,511 & skillrun.js:210 — `partyBuff.stats.dmg` (War Banner, Amplifier, party buffs) is never applied to summon damage. Only `stats.as` is read. buffAllies also drops `A.as` and `A.regen` for summons.
- src/game/combat.js:116-117 + src/game/monster.js:48 — summon leech heals the owner twice for melee via deal() (0.2 in hit plus 0.15 in deal).
- src/game/player.js:392-397 — the legendary 'orbit' Orbit has dur 1e9 and is never removed when the item is unequipped; it persists until the world changes. The world.hazards.some() scan runs every frame.
- src/game/player.js:127 — the 'wraith' legendary pass-through is disabled (`!!legendary.wraith && false`), but its description in data/items.js:114 still promises it.
- src/data/enemies.js:47 / src/game/monster.js:721 — the 'teleport' elite affix can roll on champions and uniques but has no implementation.
- src/game/monster.js:405-409 — exploder self-destruct sets dead directly: no XP, loot, corpse or gore. Likewise summon eviction (monster.js:791,793) and life expiry (:92) bypass kill().
- src/game/hazards.js:576 (NovaWave pullIn) and :700 (Trap pull) don't exempt bosses, unlike Projectile.pull (:114), Area cyclone (:260) and Area pullIn (:272).
- src/game/hazards.js:120 with skillrun.js:92 — projectile collision radius is r*size = 0.3*m.r*m.r, so it scales with m.r squared (probably meant linear).
- src/game/hazards.js:201 — Delayed.tele is computed but never read. `showRing:false` (monster.js:438) has no effect; the ring is always drawn.
- src/game/combat.js:137 — `o.curse` from non-curse skills bypasses applyCurse and writes {t:5, amt:25} directly. 'slow' would clamp speedMul to 0.15, and bomb/doom/charm/mark-1.5x would not work. Currently only curse=amp is used (skilldata.js:180,231,264).
- src/game/player.js:319-323 + combat.js:115 — Player.onHit fires on DoT ticks and on hits from the hammer Orbit itself (src = player), so Hammerfall procs can chain off themselves.
- src/game/combat.js:129-131 / creature.js:63-67 — status DoT dps is derived from mitigated damage and then re-mitigated per tick (res, amp/mark, bossDmg double-dip).
- src/game/skillrun.js:145 — the 'chain' kind's first target is searched around the unclamped cursor with no range or LOS limit. clampTarget (skillrun.js:31) also never checks LOS, so aoe/strike/rain can land behind walls.
- src/game/monster.js:369-379,616-629 + combat.js:217,226 — monsters summoned by cultists or bosses are team 'enemy' and give full XP and loot (farming risk).
- src/game/loot.js:158 — the dropChest gold loop calls `randi(2,4)` in the loop condition, which re-rolls every iteration and skews the pile count.
- src/game/loot.js:109-116 — the itemIcon cache key ignores `size`. Gear icons are always pixelSprite scale 4 whatever the requested size.
- src/data/skills.js:109,113 vs src/game/skillrun.js:54,139 — skillRange (used for melee approach and UI) omits the thrust x1.15 factor and uses cone 0.5 where castSkill uses 0.55.
- src/game/combat.js:119 — a no-op `if` statement with a comment about the thorns curse (dead code).

