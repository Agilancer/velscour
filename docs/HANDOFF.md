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
7. [Subsystem reference](#7-subsystem-reference) (fact-checked against the code)

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
- **Art:** the user's sheets are sliced by `tools/process_assets.py`. Everything else is placeholder ASCII pixel art
  with palette swaps (monsters, items, props) or is drawn procedurally (town buildings). The README tells the user
  how to swap in real art.
- **Enemy variety:** 22 AI archetypes. Each biome renames and recolors its roster and gives it the biome's element,
  and adds a "greater" variant of each kind, for 24 kinds per biome and 480 in total.
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
   biome tile atlases (LRU keeps 2 non-town sets), memoized monster/flash sprites, and corpse images. Measure this
   before adding more caches.
3. **Balance is a first pass.** Monster scaling is `monsterBase(L)` in `src/game/monster.js`
   (hp 20·1.066^(L−1), dmg (3+min(L,10)·0.15)·1.052^(L−1)). Player XP is `xpToNext(L) = 60L²+40L` in
   `src/game/player.js`. Depths 50–100 have never been played.
4. **Caching on GitHub Pages:** pages are served with about a 10-minute cache and the module imports carry no
   version. Right after a deploy a browser may briefly mix old and new modules, and a hard refresh fixes it.
   Consider adding a version query to `src/main.js` if this causes trouble.
5. **Placeholder art.** Character sprites are single frames with no walk/attack animation.

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
5. Roadmap ideas from the README: animated character sprites, unique monster art per archetype and biome tilesets,
   set items, a stash, waypoints, rune words, multiplayer.

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

<!-- SUBSYSTEM-SECTIONS -->
