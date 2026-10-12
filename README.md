# VELSCOUR

*A world built upon something that should have stayed dead.*

An isometric, retro-pixel action RPG in the spirit of Diablo II that runs in the browser on **PC and mobile**. Choose one of sixteen classes, gear up in the town of Duskhollow, then descend 100 procedurally generated depths to slay **Demon Lord Velscour**.

> **Status: rough draft.** Everything is playable end to end, but most art is placeholder (see [Art](#art)) and balance is a first pass.

## Play it

### On GitHub Pages (PC and phone)
1. In the GitHub repo go to **Settings → Pages**.
2. Under **Build and deployment** pick **Deploy from a branch**, choose the branch (`main` once this is merged, or `claude/amazing-rubin-kguehz` to try it now) and the **`/ (root)`** folder, then **Save**.
3. After a minute the game is live at `https://<your-user>.github.io/velscour/`.

On a phone, play in **landscape**. "Add to Home Screen" launches it fullscreen, without the browser bars.

### Locally
The game is plain HTML and JavaScript modules, so there is no build step. It does have to be served over http, because browsers block modules on `file://`:

```bash
cd velscour
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```

Progress saves automatically in the browser (localStorage), and you can keep up to six heroes in separate save slots.

## Controls

| PC | |
|---|---|
| Left click | Move / attack / pick up / talk (hold to keep moving or attacking) |
| Shift + left click | Attack in place |
| W A S D / arrows | Move directly |
| Right click | Right-click skill at the cursor |
| 1 – 8 | Cast that slot's skill at the cursor (hold to repeat) |
| Z X C V | Healing, mana, rejuvenation and fury potions |
| I / K / B | Inventory & character · Skill tree · Skill book |
| Tab / M | Map overlay |
| Esc | Close windows / pause menu |
| Mouse wheel | Zoom |

| Mobile | |
|---|---|
| Left thumb | Floating virtual joystick |
| Tap the world | Move / attack / talk / pick up |
| Right-hand button cluster | ATK (left-click skill), RMB and 1–8. Tap to cast with auto-aim, hold to repeat, long-press to change the skill |
| Potions on the bar | Tap to drink |

## What's in this draft

- **16 classes** (Paladin, Ranger, Wizard, Necromancer, Barbarian, Dragoon, Totem Master, Death Knight, Arcane Sorcerer, Carrion Witch, Bard, Slime Lord, Boomerang Knight, Lancer, Dragon Knight, Gunner). Each one uses its sprite from the design sheet.
- **960 unique skills**, 60 per class: three trees of 20, laid out as 5 tiers × 4 prerequisite chains (tiers unlock at levels 1/6/12/20/30). Skills cap at level 20 and gain synergy from points in the same tree. Default abilities are granted automatically at levels 1, 2, 4, 8, 12, 16, 22, 28 and 34.
  - 23 behaviours combine with 10 elements and around 40 visual styles: projectiles (pierce, bounce, homing, split, boomerang return, lobbed, frozen-orb spray, gravity pull), novas, meteors, channelled death lasers and breath cones, chain lightning, walls of fire/ice/slime/thorns, ground zones, orbiting blades and spinning hammers, cyclones, whirlwinds, leaps, dashes and omnislash, blinks, summons, totems and turrets, auras and transformations, curses (amplify, weaken, fear, confuse, charm, decay, life tap, iron maiden, living bomb, doom), traps and mines, rains of arrows/meteors/blades, sky strikes, fissures and corpse explosions.
- **Skill bar**: LMB, 1–8 and RMB, plus 4 potion slots (Z X C V) built on the provided HUD art, with live life/mana orbs, XP bar and cooldowns. Drag skills onto it from the Skill Book or Skill Tree, or click a slot to choose one.
- **Combat & gore**: crits, resistances, armor, block, leech, thorns, knockback, burn/chill/freeze/shock/poison/bleed/acid shred. Blood sprays, pooling blood decals, bouncing gibs, corpses, overkill explosions and screen shake. Gore can be set to Off, Bloody or Extreme.
- **Monsters**: 70 painted monsters (skeleton warbands, liches, bone horrors, flesh brutes, demons, tentacle and eye horrors) playing 22 archetypes with distinct AI (melee, ranged kiting, casters with telegraphed AoEs, chargers, swarms, nova casters, beam eyes, exploders, summoners, slimes that split). Every level rolls its own bestiary from the biome's roster, palette-swaps it with the biome's colours, and adds a darker "greater" breed. Unique monsters get their own colouring. Champion and unique packs get elite affixes (Fire Enchanted, Cold Aura, Lightning Enchanted, Vampiric, Multishot, Thorns…). Every depth ends with a multi-pattern **guardian boss** drawn from 17 boss-sized monsters (slams, bullet novas, spirals, charges, meteor rains, beams, summons, enrage at 50%).
- **Dungeons**: built procedurally from the provided catacomb floor and wall sheets. Rooms, caves and corridors are laid out as a maze with loops, and each biome palette-swaps the tiles. The exit sits in the room farthest from the entrance and stays sealed until the guardian dies. Dungeons also have chests, torches, props, an automap and a minimap. Depth 100 is a special gauntlet that ends in Velscour's throne arena.
- **Progression loop**: biomes come in random order (all 19 before any repeats). About two levels in three mix their tiles with a like-coloured biome, so a Frozen Ossuary can bleed into Crystal Caverns. Clearing a depth lets you descend into the next biome or return to town, and the town portal then leads to the next depth. Death sends you back to town at **Depth 1** with all gear, levels and skills kept. After Velscour falls, Endless Torment depths continue past 100.
- **Loot**: Common, Uncommon, Rare, Epic and Legendary items across 7 equipment slots and 10 material tiers, with around 45 affix types and 22 legendary powers. Drops also include gold, health/mana orbs and potions. **Gems**: 12 stat gems in 6 tiers, plus shot-pattern gems (+projectiles, split, echo-cast, orbiting orbs, nova-on-cast, chain/pierce, homing, bigger areas, +skill levels). Rarer gear holds more sockets (up to 6).
- **Town of Duskhollow**: Weaponsmith, Armorer, Blacksmith (+1…+10 upgrades), Enchanter (reroll/add affixes), Alchemist (potions), Gem Merchant (buy, or combine 3 → 1 higher tier), Jeweler (add sockets, remove gems) and Gambler. Townsfolk wander the plaza.
- Procedural sound effects and ambient music (no audio files), settings, a help screen and six hero save slots.

## Project layout

```
index.html, css/style.css      page shell + UI styles
manifest.webmanifest           installable / fullscreen on mobile
assets/source/                 your original sprite sheets
assets/sprites, ui, tiles/     game-ready slices (generated)
tools/process_assets.py        slices the source sheets into the above
tools/tests/                   headless-browser test scripts (Playwright + Chromium)
docs/HANDOFF.md, CLAUDE.md     developer hand-off notes: spec, status, open issues, subsystem reference
src/main.js                    boot + main loop
src/core/                      input, camera/iso math, audio synth, asset loading, utils
src/data/                      classes, 960 skill specs, skills logic, summons, monsters, biomes, items
src/world/                     tile map, dungeon generator, town layout
src/gfx/                       pixel-art sprite system, VFX/gore, skill shapes, town art
src/game/                      world, player, monsters/AI, combat, skills runtime, loot, render, save, flow
src/ui/                        HUD, touch controls, inventory, skill tree/book, vendors, menus
```

## Art

Art you provided, used directly:
- **Class sprites**, sliced from the design reference sheet. They serve as the player sprite, the class-select portraits, and (palette-swapped) the town NPCs and some summons.
- **Logo** on the title screen; it is also the source of the app icon.
- **HUD bar**. The orbs, XP bar and slots are wired to its exact geometry.
- **Gear looks for all 16 classes**: 80 body armors and 80 helms per class. The hero wears the equipped body armor's design (picked by its rarity and level) in one of 51 palette-swap finishes, with the helm fitted over the head and the face showing through open helms. Rare and better armor can carry an aura: glows, orbiting wisps, rune circles, flames, embers, frost, sparks and shadow smoke.
- **Paladin art pack**: 42 weapons and 18 shields as named catalog items, and 60 ability effects mapped onto the 60 Paladin skills. A new **Mythic** rarity sits above Legendary. See [docs/CLASS_ART.md](docs/CLASS_ART.md).
- **Environment sheets**: 10 floor/wall tile sets (seamless walls, pillars, towers, rubble), 5 scatter-terrain sheets (obstacles and chests) and 20 barricade sets, mapped onto the 20 biomes. See [docs/ART.md](docs/ART.md).

- **Monster sheets**: 7 sheets of 10 monsters each, cut into atlases and mapped to AI archetypes and the boss pool. See [docs/ENEMY_ART.md](docs/ENEMY_ART.md).

Placeholder art: summons, Demon Lord Velscour and item icons are drawn as ASCII pixel-art in `src/gfx/pixelart.js` and palette-swapped. Town buildings and ground are drawn procedurally in `src/gfx/townart.js`.

**To swap in real art**, replace the sheets in `assets/source/` and rerun:

```bash
pip install pillow numpy scipy
python3 tools/process_assets.py
```

## Roadmap ideas
Animated character sprites (walk/attack/cast), hand-tuned balance for depths 50–100, set items, a stash, waypoints, rune words and multiplayer.
