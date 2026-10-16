# VELSCOUR

*A world built upon something that should have stayed dead.*

An isometric, retro-pixel action RPG in the spirit of Diablo II that runs in the browser on **PC and mobile**. Choose one of sixteen classes, gear up in the town of Herrington Hollow, then descend 500 procedurally generated depths to slay **Demon Lord Velscour**.

> **Status: rough draft.** Everything is playable end to end. Live placeholder sprites have painted replacements (see [Art](#art)); full animation and broader effect art remain future work, and balance is a first pass.

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
| \` 1 – 9 0 - = | Cast that slot's skill at the cursor (hold to repeat): 13 keys plus both mouse buttons, 15 skills in all |
| Z X C V | Healing, mana, rejuvenation and fury potions |
| I / K / B / Q | Inventory & character · Skill tree · Skill book · Quest log |
| Tab / M | Map overlay |
| Esc | Close windows / pause menu |
| P / Auto button | Auto-play on or off |
| Mouse wheel | Zoom |

| Mobile | |
|---|---|
| Left thumb | Floating virtual joystick |
| Tap the world | Move / attack / talk / pick up |
| Right-hand button cluster | ATK (left-click skill), then RMB and 1–8 on page one and 9 0 - = \` on page two (the ⇄ button flips pages). Tap to cast with auto-aim, hold to repeat, long-press to change the skill |
| Potions on the bar | Tap to drink |
| Auto button (top right) | Auto-play on or off |

## What's in this draft

- **16 classes** (Paladin, Ranger, Wizard, Necromancer, Barbarian, Dragoon, Totem Master, Death Knight, Arcane Sorcerer, Carrion Witch, Bard, Slime Lord, Boomerang Knight, Lancer, Dragon Knight, Gunner). Each one uses its sprite from the design sheet.
- **Lancer spinning shields:** the seven Bulwark orbit abilities now use four distinct, transparent golden 8-angle sprite animations (round, diamond, kite and tower). Shield orbit direction and eight-angle sprite-frame playback are both reversed from the prior build, with wider spacing between the seven abilities. Individual shields correctly pass behind and in front of the Lancer, walls and nearby actors as they orbit. See [Lancer Spinning Shields](docs/LANCER_SPINNING_SHIELDS.md).
- **980 unique skills**, 60 per class: three trees of 20 (the Necromancer has a fourth, the **Skeletal Legion**: 20 painted skeleton warriors and casters to summon), laid out as 5 tiers × 4 prerequisite chains (tiers unlock at levels 1/6/12/20/30). Skills cap at level 20 and gain synergy from points in the same tree. Default abilities are granted automatically at levels 1, 2, 4, 8, 12, 16, 22, 28 and 34.
  - 23 behaviours combine with 10 elements and around 40 visual styles: projectiles (pierce, bounce, homing, split, boomerang return, lobbed, frozen-orb spray, gravity pull), novas, meteors, channelled death lasers and breath cones, chain lightning, walls of fire/ice/slime/thorns, ground zones, orbiting blades and spinning hammers, cyclones, whirlwinds, leaps, dashes and omnislash, blinks, summons, totems and turrets, auras and transformations, curses (amplify, weaken, fear, confuse, charm, decay, life tap, iron maiden, living bomb, doom), traps and mines, rains of arrows/meteors/blades, sky strikes, fissures and corpse explosions.
- **Skill bar**: 15 skills (LMB, \` 1–9 0 - =, RMB) plus 4 potion slots (Z X C V) built on the provided HUD art, with live life/mana orbs, XP bar and cooldowns. Drag skills onto it from the Skill Book or Skill Tree, or click a slot to choose one.
- **Combat & gore**: crits, resistances, armor, block, leech, thorns, knockback, burn/chill/freeze/shock/poison/bleed/acid shred. Blood sprays, pooling blood decals, bouncing gibs, corpses, overkill explosions and screen shake. Gore can be set to Off, Bloody or Extreme.
- **Monsters**: 370 painted monsters (skeleton warbands, liches, bone horrors, flesh brutes, demons, tentacle and eye horrors, fiends, dragons and hydras, mages, bandits and knights, goblins, kobolds, slimes, birdfolk, and towering titans) playing 22 archetypes with distinct AI (melee, ranged kiting, casters with telegraphed AoEs, chargers, swarms, nova casters, beam eyes, exploders, summoners, slimes that split). Every level rolls its own bestiary from the biome's roster, palette-swaps it with the biome's colours (29 swaps), and adds a darker "greater" breed. Unique monsters get their own colouring. Champion and unique packs get elite affixes (Fire Enchanted, Cold Aura, Lightning Enchanted, Vampiric, Multishot, Thorns…). Traditional dungeon depths end with a multi-pattern **guardian boss** drawn from 99 boss-worthy monsters (slams, bullet novas, spirals, charges, meteor rains, beams, summons, enrage at 50%).
- **Indoor dungeons**: built procedurally from the **Catacombs and cathedral/graveyard biome packs**: 60 floors, 5 wall families with every corner and junction, arches and doors (which swing open as you approach) in the corridor mouths, and 40 scatter props. Rooms, caves and corridors are laid out as a maze with loops, and each biome palette-swaps the pack. In indoor levels the exit sits in the room farthest from the entrance and stays sealed until the guardian dies. Dungeons also have chests, torches, props, an automap and a minimap. Depth 500 is a special gauntlet that ends in Velscour's throne arena.
- **Worldwide biome/environment overhaul**: all **32 combat biomes** gain **50 new biome-native monster designs** each (1,600 total), balanced to spawn primarily at home alongside VELSCOUR's existing random monsters, with rare cross-biome visitors. Every indoor dungeon gains **60 more isometric floors** and **40 more terrain pieces** with biome-specific wall materials. **Herrington Hollow** and **Forsaken Wilds** each gain their own 60 new floor tiles and 40 environment props. All town and dungeon fences/barricades get actual X/Y isometric geometry and tile-aligned endpoints instead of broken mirrored fence sprites. No monsters in town. [Full audit, QA notes and rollout guide](docs/WORLD_BIOME_OVERHAUL.md).
- **HEAVENLY dungeon**: **The Empyrean Citadel**, a new randomly selected indoor temple biome with **60 unique pearl, gold, cloudstone and opal floor designs**, five fully modular wall families, three arched gateways, three opening gates, and **40 completely generated terrain props**. Its enemy roster contains **60 newly drawn, named Heavenly monsters** across 12 celestial silhouette families, with their own generated sprite atlas, holy combat variations, champion/boss rules and normal loot progression. See [docs/HEAVENLY.md](docs/HEAVENLY.md).
- **ASTRAL PLANE dungeon**: **The Celestial Expanse**, an independent star-lit indoor dungeon with 60 original isometric cosmic floors, five full modular astronomical wall families (80 connection masks), three directional celestial arches, three opening astral gate sets and 40 celestial props: compact star orreries, moonstone statues, prismatic crystal clusters, horizon relics and singularity shrines. Includes spectral/crystal enemy palette swaps, glittering particle ambience and astral lighting, all while preserving the normal dungeon progression and character-scale rendering geometry. See [docs/ASTRAL_PLANE.md](docs/ASTRAL_PLANE.md).
- **HELL dungeon**: **The Infernal Dominion**, a standalone indoor biome with **60 infernal floor designs, five full 16-mask wall families, three demonic arch sets, three opening hellgates, and 40 custom-generated infernal terrain sprites** including braziers, molten lava, horned demon statues, soul cages, bone altars and blackiron furnishings. Uses normal monster/guardian/loot/exit progression, fire-element enemies and infernal ambience. [Complete art and implementation notes](docs/HELL.md).
- **Ice Temple dungeon**: the new **Palace of the Everfrost** adds 60 generated ice/aurora floor designs, five complete modular frost-wall families, three directional arches, three opening door sets, and 40 unique glacial props (crystal growths, icicle chandeliers, runes, obelisks, frozen sarcophagi and a sapphire throne). Its separate cached Canvas pack uses VELSCOUR's exact existing isometric depth-slice/pivot geometry. It joins the normal dungeon shuffle with frozen bestiary variants, chilly ambience and cold blue lighting; see [docs/ICE_TEMPLE.md](docs/ICE_TEMPLE.md).
- **Desert Temple dungeon**: the **Temple of the Sunless Dynasty** joins the shuffled indoor biomes with 60 newly generated isometric floor tiles, five sandstone/obsidian wall families (all 16 junction masks), three directional arches, three opening door designs and 40 unique desert-temple props (jackal statues, gilded sarcophagi, obelisks, braziers, hieroglyphs, rubble and relic shrines). Its custom Canvas art pack preserves the original dungeon wall pivots, silhouette masks and split-depth geometry, so VELSCOUR’s existing gear and character appearances remain compatible. See [docs/DESERT_TEMPLE.md](docs/DESERT_TEMPLE.md).
- **Forsaken Wilds overworld**: an additional town-pack-based procedurally generated outdoor dungeon with open grassland, forest tree walls, branching trails, scattered ruins, buildings and chests. Ten procedurally created tree variants, twenty extra terrain objects, five colored scenario shrines and an escort wagon extend the existing town art. Activate the central shrine to start one of twenty different combat or objective challenges (waves, simultaneous bosses, village/NPC defense, escorts, control points, rescue, relics, rifts, timed trials and more). The exit remains sealed until the scenario is cleared. The biome can appear naturally and is forced after six consecutive other dungeon entries, then the counter resets. See [docs/OVERWORLD.md](docs/OVERWORLD.md).
- **Progression loop**: biomes come in random order from a shuffle bag (excluding the final throne). About two levels in three mix their palette with a like-coloured biome, so a Frozen Ossuary can bleed into Crystal Caverns. Clearing a depth lets you descend into the next biome or return to town, and the town portal then leads to the next depth. Death sends you back to town at **Depth 1** with all gear, levels and skills kept. After Velscour falls, Endless Torment depths continue past 500.
- **Loot**: Common, Uncommon, Rare, Epic and Legendary items across 7 equipment slots, 4 ring slots and 10 material tiers, with around 45 affix types and 22 legendary powers. Drops also include gold, health/mana orbs and potions. **Rings** carry skill augments that change how a skill (or a kind of skill, or every skill) behaves: burning, venomous or freezing hits, chain lightning, a Storm Tether that links you to your projectiles and orbiting weapons with lightning, explosions, holy smites, meteors, void rifts, blood pacts, shrapnel, extra projectiles/orbits/minions, bigger areas, cheaper and faster casts, echo casts. **Gems**: 12 stat gems in 10 grades (Chipped to Eternal), plus shot-pattern gems (+projectiles, split, echo-cast, orbiting orbs, nova-on-cast, chain/pierce, homing, bigger areas, +skill levels). Rarer gear holds more sockets (up to 6).
- **Town of Herrington Hollow**: Weaponsmith, Armorer, Blacksmith (+1…+10 upgrades), Enchanter (reroll/add affixes), Alchemist (potions), Gem Merchant with the **Gem Forge** (fuse 3 → 1 of the next grade, fuse all, or refine one gem for gold), Jeweler (rings, add sockets, remove gems) and Gambler. Every hero gets their own randomly laid-out town: an irregular plaza with a well and market stalls, winding roads into the forest (one to the portal), shops fronting the streets with their wares out front, cottages on footpaths, gardens, an orchard, a lumber camp, a paddock and old ruins. Townsfolk wander the plaza.
- **Skill mastery**: every skill has its own XP and levels from 1 to 1000. Skills train when cast and, more, when they kill; each level adds damage (about x2.4 at 100 and x29 at 1000), and at 25, 100, 250, 500, 750 and 1000 the skill's effects grow bigger and more over the top.
- **Barbarian combat**: Bash fans five short lightning bolts and is the primary Rage builder; Rage starts at zero, builds from attacks instead of idle regeneration, then fuels moving Whirlwind with isometric cyclone particles and spiralling battlefield gibs.
- **Auto-play**: the Auto button (or P) hands the hero to an AI that plays for you. It spends skill and attribute points, keeps the skill bar sorted, fights with every skill on the bar (dodging telegraphed attacks, kiting with ranged builds, drinking potions, using cooldowns, buffs, curses and minions), picks up and equips upgrades, sockets gems, then goes to town to sell, restock potions, buy gear and gems, add sockets, upgrade, enchant and gamble, and keeps delving toward Velscour. It also gets back up after a death. Pet classes (Necromancer, Totem Master, Carrion Witch, Slime Lord, Ranger, Gunner) build for as many minions as they can keep; the Paladin builds around his hammers (Blessed Hammer, Hammerstorm, Wheel of Hammers). Move, click or tap to take over for a moment; it resumes when you let go.
- Sampled sound effects, music and drifting ambient beds (procedural fallbacks for the rest), settings, a help screen and six hero save slots.
- An arcade level-up: freeze frame, hellfire pillar, burning sigil, chiptune fanfare, and a speech-chip voice: "YOU
  HAVE BECOME MORE POWERFUL, BUT VELSCOUR STILL LIVES" (`assets/audio/voice/levelup.wav`, made by
  `tools/levelup_voice.py`). Comic-book damage numbers (bigger, hellfire crits on a burst) and a stats plaque: level,
  attack, sheet DPS and the real average DPS over the last 30 seconds.

## Project layout

```
index.html, css/style.css      page shell + UI styles
manifest.webmanifest           installable / fullscreen on mobile
assets/source/                 your original sprite sheets
assets/sprites, ui, tiles/     game-ready slices (generated)
tools/process_assets.py        slices the source sheets into the above (biome packs: tools/biomepack.py)
tools/tests/                   headless-browser test scripts (Playwright + Chromium)
docs/HANDOFF.md, CLAUDE.md     developer hand-off notes: spec, status, open issues, subsystem reference
src/main.js                    boot + main loop
src/core/                      input, camera/iso math, audio (samples, music, ambience), asset loading, utils
src/data/                      classes, 980 skill specs, skills logic, summons, monsters, biomes, items
src/world/                     tile map, dungeon generator, town layout
src/gfx/                       pixel-art sprite system, VFX/gore, skill shapes, town art
src/game/                      world, player, monsters/AI, combat, skills runtime, loot, render, save, flow
src/ui/                        HUD, touch controls, inventory, skill tree/book, vendors, menus
```

## Art

The five themed dungeons (Desert Temple, Ice Temple, Hell, Astral Plane and Heavenly) now use 40 painted floor diamonds and 40 painted props cut from three approved sprite sheets, with 12 painted celestial monster designs replacing procedural first-rank Heavenly variants. All wall geometry, monster IDs and gameplay systems are preserved; see [Approved Biome Artwork](docs/APPROVED_BIOME_ART.md).

An additional compact 400 × 240 native-resolution atlas contributes one floor accent and one prop to each of those five themes, plus five Forsaken Wilds tree sprites. See [Biome Variant Art](docs/BIOME_VARIANT_ART.md).

The Forsaken Wilds' 20 static scatter designs also use a 400 × 320 transparent low-resolution atlas; see [Overworld Scatter Art](docs/OVERWORLD_SCATTER_ART.md).


Art you provided, used directly:
- **Class sprites**, sliced from the design reference sheet. They serve as the player sprite, the class-select portraits, and (palette-swapped) the town NPCs and some summons.
- **Logo** on the title screen; it is also the source of the app icon.
- **HUD bar** (15 skill slots), **minimap ring** and the six **HUD buttons** (Bag, Skills, Book, Quest, Auto, Menu). The orbs, XP bar and slots are wired to the bar's exact geometry.
- **Gear looks for all 16 classes**: 80 body armors and 80 helms per class. The hero wears the equipped body armor's design (picked by its rarity and level) in one of 51 palette-swap finishes. Helms retain their original fitted 48 × 56 head-cell and distinctive class silhouettes; detected open-face cavities are given opaque, palette-matched metal faceplates at runtime instead of exposing the character's face. This also applies to helm icons and inventory portraits. Rare and better armor can carry an aura: glows, orbiting wisps, rune circles, flames, embers, frost, sparks and shadow smoke. See [docs/CLASS_ART.md](docs/CLASS_ART.md) and the [closed-helm QA script](tools/tests/closed_helms.js).
- **Paladin art pack**: 42 weapons and 18 shields as named catalog items, and 60 ability effects mapped onto the 60 Paladin skills. A new **Mythic** rarity sits above Legendary. See [docs/CLASS_ART.md](docs/CLASS_ART.md).
- **Catacombs biome pack**: 60 floors, 5 modular wall families, 3 arches, 3 doors (open and closed) and 40 scatter props on a 160×80 template. Indoor packs support palette swaps; the Forsaken Wilds uses the separate Overworld and Town pack. Walls, arches and doors are raised to suit the heroes' height and sliced for depth sorting at import. See [docs/ART.md](docs/ART.md).
- **Monster art**: 7 sheets of 10 monsters each plus 300 single sprites (`Enemy_300.zip`), cut into atlases and mapped to AI archetypes and the boss pool. See [docs/ENEMY_ART.md](docs/ENEMY_ART.md).

The remaining summon, Velscour, ward, NPC and generic loot placeholders now use 122 painted sprites generated from the project's art references. See [the replacement audit and gallery](docs/SPRITE_REPLACEMENTS.md). Sources live in `assets/source/replacements/`; rebuild with `python tools/replacementart.py`. ASCII art in `src/gfx/pixelart.js` remains as a loading/missing-art fallback. The town uses the Overworld and Town biome pack (`tools/townpack.py`).

**To swap in real art**, replace the sheets in `assets/source/` and rerun:

```bash
pip install pillow numpy scipy
python3 tools/process_assets.py
```

## Roadmap ideas
Animated character sprites (walk/attack/cast), hand-tuned balance for depths 50–500, set items, a stash, waypoints, rune words and multiplayer.
