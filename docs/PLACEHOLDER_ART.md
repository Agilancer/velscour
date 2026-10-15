# VELSCOUR: placeholder art inventory and art brief

**Historical expansion brief:** the live sprite audit and October 2026 replacement pass are
in [SPRITE_REPLACEMENTS.md](SPRITE_REPLACEMENTS.md). Summons, NPCs, boss/ward and generic
loot sprites listed here have since been replaced; existing familiar imports also supersede
many entries. Use the new audit and current code before generating more art.

This file lists every graphic in VELSCOUR that is still placeholder art: ASCII pixel art in `src/gfx/pixelart.js`, shapes
drawn in code, or real art borrowed and recoloured for something it wasn't made for. It is written so you can give it
to an image generator (ChatGPT) as the brief: what to draw, how many, what size, and the sheet layout the game's
importers already read.

Inventory taken from the code on 2026-10-13 (`main` after PR #22).

---

## 0. Instructions for the image generator (read first)

**The game.** VELSCOUR is a grimdark isometric action RPG in the style of Diablo II, played in the browser. The view
is 2:1 isometric. Heroes stand about 60 world px tall on a 64 px tile.

**House style.** Match the existing art (the monster sheets, the gear libraries and the Paladin pack):
- Grimdark dark fantasy with lean, gaunt anime anatomy. Nothing chibi, cute or bulky-heroic.
- Painted low-resolution pixel look: chunky pixel clusters, near-black shadows, jagged ink contours, worn metal,
  torn cloth, bone, dried blood. Muted palettes with one saturated accent (the element colour).
- Characters and creatures face **screen right** in a three-quarter isometric view. The game mirrors them for left.
- No scenery, no ground shadow (the game draws its own), no text inside the art.

**Delivery rules.** These come from problems with earlier deliveries:
1. **True transparency.** Use real RGBA alpha. No painted backdrop, no checkerboard, no soft alpha haze around
   the art.
2. **A fixed grid with uniform cells.** Every cell is the same size, with plenty of empty padding, and no art
   crosses a cell edge or touches its neighbour.
3. **Keep labels separate.** If you label anything, put the labels in a margin well away from the art, or deliver
   a clean unlabelled sheet plus a labelled copy.
4. **Same scale and baseline.** Within a sheet, keep one scale and put every creature's feet on the same baseline
   in its cell.
5. **Deliver a catalog.** Include a JSON or Markdown catalog listing IDs, names and one-line descriptions in grid
   reading order (left to right, top to bottom).
6. **Use exact names.** Use the names given in this brief so the art can be matched to the game data.

**Element colours.** The game uses these for skills, projectiles and auras:

| Element | Colour | Element | Colour |
|---|---|---|---|
| phys | steel / bone white | holy | gold / ivory |
| fire | orange-red | shadow | violet-black |
| cold | ice blue | blood | deep crimson |
| light (lightning) | electric blue-white / yellow | arcane | magenta-violet |
| poison | sickly green | acid | **blue** (Slime Lord only; his whole kit is blue) |

---

## 1. Already final (do not regenerate)

| Area | Source |
|---|---|
| Title logo, favicon / app icon | `assets/source/logo.webp`, `assets/ui/icon.png` |
| HUD bar, orbs, 15 skill slots, 4 potions, minimap ring, 6 HUD buttons | `assets/source/hud_bar.webp`, `hud_frames.webp` |
| Potion icons (red, blue, purple, orange) | cut from the first HUD bar |
| Class-select portraits (16 classes) | `assets/FinalClasses/All 16 Classes.png` |
| In-game hero look: 80 body armors + 80 helms per class, all 16 classes | `assets/FinalClasses/<class>.zip` |
| Monsters: 70 painted monsters (7 sheets x 10), used with palette swaps and as bosses | `assets/source/enemies/set1/` |
| Necromancer skeleton summons (20) | `assets/source/enemies/minions/` |
| Paladin: 60 weapons and shields, 60 ability effects | `assets/source/classes/paladin/` |
| Dungeon floors, walls, arches, doors and 40 props (Catacombs pack, recoloured for every biome) | `assets/source/biomes/Catacombs_Biome_Pack.zip` |
| Town: ground, buildings, trees and props | `assets/source/biomes/town/` |
| Loot chests | `assets/source/props/dungeon_mechanisms.png` |

---

## 2. Summary of what is placeholder

Priority: **P1** is seen constantly or is a showpiece, **P2** is seen often, **P3** is polish.

| # | Category | Placeholder now | Count to make | Priority | Delivery format |
|---|---|---|---|---|---|
| A | Demon Lord Velscour (final boss) + raid ward crystal | ASCII pixel art | 2 creatures | **P1** | monster sheet (2x5) |
| B | Player summons for 15 classes | ASCII pixel art, or a recoloured hero sprite | ~80 creatures and objects (9 sheets) | **P1** | summon sheets (2x5) |
| C | Class art packs for the other 15 classes (weapons/shields + ability effects) | pixel weapon icons; skills only have code-drawn VFX | 15 x (60 items + 60 effects) | **P1** | Paladin pack format |
| D | Biome packs for 24 dungeon biomes | the Catacombs pack, recoloured | 24 packs (8 source images each) | **P2** | Catacombs template |
| E | Town NPCs (8 vendors + 4 townsfolk) | recoloured hero sprites | 12 characters | **P2** | NPC sheet (2x6) |
| F | Generic item icons: gloves, leg armour, boots, off-hand orbs | ASCII pixel art | 3 x 60 + 30 | **P2** | icon sheets (6x10) |
| G | Gems (21 kinds x 6 tiers), gold piles, health/mana globes | drawn in code | 126 + 3 + 2 | **P2** | icon sheets |
| H | Skill icons (980 skills) | drawn in code (glow + shape) | 980 (or 16 sheets of 60/80) | P3 | icon sheets (6x10) |
| I | Projectiles, explosions, auras, ground effects, portal | drawn in code | ~45 projectiles, ~15 explosions, portal | P3 | effect strips (6 frames) |
| J | Animation: hero and monsters are single frames | squash/bob only | idle/walk/attack/cast/hit/death | P3 (large) | see section J |
| K | UI panels, title/death/victory backdrops, cursor | CSS boxes, SVG cursor | ~10 frames/backgrounds | P3 | single PNGs / 9-slice |
| L | Thin monster coverage (Enemy Set 2) | some archetypes have 1 drawing | ~20-40 monsters | P2 | monster sheet (2x5) |

---

## A. Demon Lord Velscour and the raid ward crystal (P1)

| Name | Where | Now | Brief |
|---|---|---|---|
| **DEMON LORD VELSCOUR** | Final boss at Depth 100 in Velscour's Throne (a fire biome) | ASCII pixel demon (`velscour` in `pixelart.js`) | A towering demon lord, about 2.5x hero height (~150 world px; draw ~330 px tall like the monster sheets). Horned, crowned, molten cracks, a burning greatsword or claws, ragged wings or a cape of chains. Colours: dried-blood red, black, bone, glowing gold-yellow eyes. He has eight attack patterns and must be the most imposing thing in the game. A second pose for an "enraged" phase would also help. |
| **Warding Crystal** | Raid boss rooms (every 5th depth): 3-5 crystals beam a shield into the boss | ASCII pixel crystal (`crystal`) | A floating shard or cluster of crystal on a small rune base, about 0.7x hero height. Draw it in neutral white/grey: the game tints it to the boss's element. |

Deliver both on one 2x5 monster sheet (section L describes the format), with the other 8 cells free for extra
Velscour poses or monsters.

---

## B. Player summons (P1)

Every minion, totem, turret and pet below is currently drawn with a placeholder. Most use one ASCII sprite recoloured
many ways: all 14 totems are one totem sprite, all 8 slimes one blob, all wolves and bears one hound. "Hero sprite"
means the summon reuses a class's hero art.

**Format:** same as the Necromancer skeleton sheets (`assets/source/enemies/minions/necro_*.png`): **2 rows x 5
columns, 10 per sheet**, transparent, facing right, full body, feet on a common baseline, about 2000 x 800 px per
sheet. Each sheet gets a catalog in reading order. Sizes are relative to the hero (1.0 = 60 world px).

**Sheet 1: Ranger and Wizard**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Hawk | Ranger: Hawk Companion | 0.5 | brown-gold hunting hawk, wings spread |
| 2 | Storm Hawk | Ranger: Hawk Talons | 0.5 | blue hawk crackling with lightning |
| 3 | Wolf | Ranger: Wolf Pack | 0.6 | lean grey timber wolf |
| 4 | Spirit Wolf | Ranger: Spirit Wolves; Totem Master | 0.6 | translucent ice-blue ghost wolf |
| 5 | Dire Wolf | Ranger: Alpha Wolf | 0.8 | huge scarred black alpha wolf |
| 6 | Bear | Ranger: Bear Spirit | 1.0 | massive brown bear, standing on four legs |
| 7 | Lightning Sentry | Ranger: Lightning Sentry; Chain Sentry | 0.6 | a spiked iron trap-pylon with a crackling coil |
| 8 | Death Sentry | Ranger: Death Sentry | 0.6 | a soot-black pylon with a fire core; it blows up corpses |
| 9 | Tesla Coil | Wizard and Gunner: Tesla Coil | 0.8 | a tall copper coil tower arcing blue light |
| 10 | Storm Cloud | Wizard: Thunderstorm | 0.8 | a small dark thundercloud that floats beside the hero |

**Sheet 2: Wizard, Necromancer and Death Knight**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Hydra | Wizard: Hydra | 0.9 | a three-headed fire serpent rising from a burning pool (static turret) |
| 2 | Ice Golem | Wizard: Ice Golem | 1.2 | a hulking golem of glacier ice |
| 3 | Clay Golem | Necromancer: Clay Golem | 1.2 | wet grey-brown clay, crude face, handprints |
| 4 | Blood Golem | Necromancer: Blood Golem | 1.2 | dripping crimson flesh and clotted blood |
| 5 | Fire Golem | Necromancer: Fire Golem | 1.2 | magma body, cracked basalt crust |
| 6 | Bone Colossus | Necromancer: Bone Colossus | 1.6 | a giant built from fused skeletons, blue soul-fire eyes |
| 7 | Death Knight | Necromancer: Legion | 1.1 | an undead armoured knight with a violet aura |
| 8 | Ghoul | Necromancer: Ghoul Horde; Death Knight: Raise Ghoul, Army of the Dead | 0.85 | a hunched, green-tinged flesh-eater |
| 9 | Wraith | Necromancer: Wraith Host | 0.9 | a hooded, pale-violet floating spirit |
| 10 | Abomination | Death Knight: Abomination | 1.4 | a stitched flesh brute with hooks and chains |

**Sheet 3: Death Knight, Arcane Sorcerer, Carrion Witch**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Frost Wyrm | Death Knight: Frost Wyrm | 1.3 | a skeletal ice dragon (flying) |
| 2 | Rune Weapon | Death Knight: Dancing Rune Weapon | 0.8 | a floating runed greatsword glowing pale blue |
| 3 | Voidspawn | Arcane Sorcerer: Void Lord | 0.9 | a violet-black rift creature, tendrils and eyes |
| 4 | Plague Bearer | Carrion Witch: Plague Bearer | 1.3 | a bloated, swollen brute leaking green plague gas |
| 5 | Hive | Carrion Witch: Hive Mother | 0.7 | a pulsing wasp/locust nest on the ground (static; shoots locusts) |
| 6 | Raven | Carrion Witch: Raven Familiar, Raven Flock, Unkindness | 0.4 | a black raven with red eyes |
| 7 | Scarecrow | Carrion Witch: Scarecrow | 1.1 | a sackcloth scarecrow on a pole, stitched grin |
| 8 | Effigy | Carrion Witch: Effigy | 0.9 | a twig-and-bone cursed doll on a stake |
| 9 | Bubbling Cauldron | Carrion Witch: Cauldron | 0.6 | a black iron cauldron of bubbling green poison |
| 10 | Spirit Lantern | Carrion Witch: Spirit Lantern | 0.6 | a hanging lantern on a hooked post with a pale holy flame |

**Sheet 4: Carrion Witch, Bard, Barbarian, Lancer**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Coven Witch | Carrion Witch: Coven | 1.0 | a hag-witch in black rags with a staff of bones |
| 2 | Bone Totem | Carrion Witch: Bone Totem | 0.8 | a stacked skull and antler fetish pole |
| 3 | Thunder Drum | Bard: Thunder Drum | 0.6 | a huge war drum on legs, crackling |
| 4 | Amplifier | Bard: Amplifier | 0.6 | an arcane crystal tuning-fork or bell on a stand |
| 5 | Chorus Singer | Bard: Chorus, Orchestra (hero sprite now) | 1.0 | a ghostly robed choir singer, mouth open |
| 6 | Grim Ward | Barbarian: Grim Ward | 1.0 | a pole of skulls and trophies that terrifies monsters |
| 7 | Ancient | Barbarian: Ancestral Call, Ancients' Fury (hero sprite now) | 1.3 | a giant spectral barbarian ancestor |
| 8 | Storm Ancient | Barbarian: Call of the Ancients (hero sprite now) | 1.3 | the same with lightning |
| 9 | War Banner | Paladin: Rally Banner; Lancer: War Banner | 1.1 | a planted war banner on a spiked pole |
| 10 | Banner of Kings | Lancer: Banner of Kings | 1.3 | a tall royal standard, gold and crimson |

**Sheet 5: Lancer, Paladin, Totem Master spirits**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Battle Standard | Lancer: Battle Standard | 1.2 | a burning banner on a pike |
| 2 | Hoplite | Lancer: Legion Phalanx, Army of Valor (hero sprite now) | 1.0 | a spectral spear-and-shield soldier |
| 3 | Squire | Lancer: Squire (hero sprite now) | 0.9 | a young squire in plain mail |
| 4 | Captain | Lancer: Captain (paladin sprite now) | 1.05 | a veteran knight-captain with a sword and banner sash |
| 5 | Holy Guardian | Paladin: Guardian Angel, Champion's Call; Totem Master: Ancestral Guardian | 1.2 | a winged, armoured holy guardian spirit (gold, ivory) |
| 6 | Ancestral Elder | Totem Master: Council of Elders (hero sprite now) | 1.1 | a spectral tribal elder shaman |
| 7 | Storm Wolf | Totem Master: Wolf Pack Alpha | 0.7 | a lightning-maned wolf |
| 8 | Spirit Bear | Totem Master: Spirit Bear | 1.0 | a translucent gold holy bear |
| 9 | Mirror Image | Ranger, Arcane Sorcerer, Bard (copy of the hero now) | - | *optional*: keep using the hero, tinted |
| 10 | Dragon Ward | Dragon Knight: Dragon Ward | 0.9 | a dragon-head stone ward breathing fire |

**Sheet 6: Totem Master totems** (14 totems, all one sprite now; size 0.7-1.0 each, carved wooden or stone poles)
| # | Name | Brief |
|---|---|---|
| 1 | Searing Totem | fire, ember-cracked wood |
| 2 | Healing Totem | green-gold, healing glyphs |
| 3 | Stoneclaw Totem | a stone pillar with claws; taunts monsters |
| 4 | Storm Totem | lightning, metal rods (also Pantheon) |
| 5 | Frost Totem | frosted, ice crystals |
| 6 | Windfury Totem | feathers and wind charms |
| 7 | Magma Totem | half-buried and molten |
| 8 | Venom Totem | snake-carved, dripping poison |
| 9 | Spirit Link Totem | two linked faces, chains of light |
| 10 | Thunderhead Totem | a storm-bird head |
| — | *Sheet 6b:* Ancestral Pillar (holy, tall), Earthbind Totem (roots, slows), Grand Totem (arcane, huge), Volcano Totem (erupting) | |

**Sheet 7: Dragoon / Dragon Knight, Slime Lord**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Drake Whelp | Dragoon: Drake Whelps; Dragon Knight: Summon Whelp, Dragon Legion | 0.6 | a small red fire drake (flying) |
| 2 | Wyvern | Dragoon: Wyvern Spirit; Dragon Knight: Wyrm's Call | 1.1 | a two-legged fire wyvern |
| 3 | Elder Wyrm | Dragoon: Elder Wyrm; Dragon Knight: Elder Drake | 1.6 | an ancient dragon, horned and scarred |
| 4 | Phoenix | Dragon Knight: Phoenix | 0.9 | a fire phoenix |
| 5 | Slimeling | Slime Lord: Slimeling, Brood, Mitosis, Gelatinous Horde | 0.35 | a small **blue** slime with a face |
| 6 | Ooze Buddy | Slime Lord: Ooze Buddy | 0.5 | a friendly blue ooze with a goofy grin |
| 7 | Volatile Slime | Slime Lord: Volatile Slime, Explosive Brood | 0.45 | a swollen glowing blue slime about to pop |
| 8 | Frost Jelly | Slime Lord: Frost Jelly | 0.5 | a pale icy jelly |
| 9 | King Slime | Slime Lord: King Slime, Slime Empire | 1.0 | a big blue slime wearing a crown |
| 10 | Ooze Titan | Slime Lord: Ooze Titan | 1.6 | a towering humanoid blue ooze |

**Sheet 8: Slime Lord, Gunner**
| # | Name | Class / skill | Size | Brief |
|---|---|---|---|---|
| 1 | Prismatic Jelly | Slime Lord: Prismatic Jellies | 0.5 | a rainbow-refracting jelly |
| 2 | Mother Ooze | Slime Lord: Mother Ooze | 1.2 | a bloated blue ooze that births slimelings |
| 3 | Gun Turret | Gunner: Gun Turret, Turret Fortress | 0.7 | a tripod gatling turret, rivets and brass |
| 4 | Flame Turret | Gunner: Flame Turret | 0.7 | a flamethrower turret with fuel tanks |
| 5 | Rocket Turret | Gunner: Rocket Turret | 0.75 | a rocket-pod turret |
| 6 | Cryo Turret | Gunner: Cryo Turret | 0.7 | a frosted turret with coolant coils |
| 7 | Combat Drone | Gunner: Drone, Combat Drones | 0.4 | a hovering brass gun drone (lightning) |
| 8 | Bomb Drone | Gunner: Bomb Drones | 0.4 | a hovering drone with a bomb slung under it |
| 9 | Death Machine | Gunner: Death Machine | 1.5 | a walking war mech, steam, gun arms |
| 10 | *(spare)* | | | |

Revived Monster (Necromancer: Revive) is fine as it is: it reuses the corpse's monster art, tinted green.

---

## C. Class art packs for the other 15 classes (P1)

Only the Paladin has a class art pack. For every other class, **weapon and shield drops use the generic ASCII icons**
(section F), and **skills have only code-drawn effects** (section I). One pack per class fixes both.

**Format: copy the Paladin pack exactly** (`assets/source/classes/paladin/`, `docs/CLASS_ART.md`). Each class folder
holds:
- `catalog*.json` with `weapons` as `[[rarity, "W01 Name", ...], ...]` and `abilities` as
  `[[rarity, ["F01 Name", "one-line description"], ...], ...]`. The catalog is authoritative.
- `<class>_weapons*.png`: **6 rarity rows (Common, Uncommon, Rare, Epic, Legendary, Mythic) x 10 items**, each
  labelled under the item, true transparency.
- `<class>_<rarity>_abilities*.png` for each of the 6 rarities: **10 effects (rows) x 6 stages (columns)**:
  1 start, 2 gather, 3 release, 4 peak, 5 decay, 6 fade. Effects travel or face **right**. Use stage headers and
  row labels in the margins.
- The **armor and helmet sheets are not needed**: the gear libraries already cover them.

**Weapons per class** (60 per class, a mix of the class's main weapon and off-hand):

| Class | Main weapon | Off-hand | Element, class colour | Style notes |
|---|---|---|---|---|
| Ranger | bows | — | phys, `#7ccf5a` | longbows, recurves, wildwood bows |
| Wizard | staves | — | fire, `#ff8a30` | fire, frost and storm staves |
| Necromancer | wands | **orbs** | shadow, `#a070ff` | ~40 bone wands + ~20 skull orbs. Orbs need a small importer change (the catalog only knows weapon and shield) |
| Barbarian | axes | — | phys, `#d8853a` | hatchets to two-handed executioner axes |
| Dragoon | spears | — | fire, `#6aa8ff` | lances, pikes, dragon lances |
| Totem Master | staves | — | lightning, `#5ac8a0` | carved totem staves, feathers, fetishes |
| Death Knight | swords | — | cold, `#7ad0ff` | frost runeblades |
| Arcane Sorcerer | wands | **orbs** | arcane, `#d070ff` | ~40 wands + ~20 orbs |
| Carrion Witch | staves | — | poison, `#9ac84a` | bone-and-feather hag staves |
| Bard | lutes | — | arcane, `#ff6a8a` | lutes, lyres, harps as weapons |
| Slime Lord | maces | — | acid (**blue**), `#4aa8ff` | gooey, living, crystalline maces |
| Boomerang Knight | boomerangs | — | phys, `#3ac8a8` | boomerangs, glaives, chakrams |
| Lancer | spears | shields | lightning, `#c0c0d0` | ~40 lances + ~20 shields |
| Dragon Knight | swords | — | fire, `#ff5a2a` | dragon-forged swords |
| Gunner | pistols | — | fire, `#d0a060` | flintlocks to hand cannons |

(Main weapon and off-hand are the bases in `src/data/classes.js`. A class with no off-hand only needs 60 main weapons.)

**Ability effects.** The Paladin pack has 60 effects matched to 60 skills. Each other class needs one effect per
skill: **60 per class, 80 for the Necromancer** (the 20 Skeletal Legion skills can share effects, so 60 is fine for
them too). Each class's full skill list (name, kind, element) is in **Appendix 1**. Use it to name the effects and
choose their shape:
- `proj`, `beam`, `dash`, `melee`: drawn travelling or swinging to the right.
- `nova`, `aoe`, `zone`, `rain`, `strike`, `curse`: drawn as an isometric ground ellipse or burst, centred.
- `buff`, `heal`, `summon`: drawn on or around a body, rising.

---

## D. Biome packs for the 24 dungeon biomes (P2)

Every dungeon biome is built from the **Catacombs pack, recoloured** (`palette` in `src/data/biomes.js`). So "Molten
Depths" and "Haunted Library" both show crypt walls in a different tint. Each biome needs its own pack in the same
template.

**Format: give ChatGPT `assets/source/biomes/Catacombs_Biome_Pack.zip`.** It is self-describing: `README.md`,
`template/biome_template.json`, `source_art/generation_prompts.json` and `tools/build_pack.py`. A new biome needs
**8 source images** with the same filenames and layouts:
- `floors_01_20.png`, `floors_21_40.png`, `floors_41_60.png`: 5x4 square texture cells. Floors 01-10 must tile
  seamlessly; 11-60 are feature tiles.
- `wall_materials.png`: 5x2 (front row, reverse row), one per wall family.
- `arch_elevations.png`: 3x2. `door_leaves.png`: 3x2.
- `scatter_01_20.png`, `scatter_21_40.png`: 5x4, 40 props, kept apart from each other.

Then run `build_pack.py` with a new config (60 floor names, 5 walls, 3 arches, 3 doors, 40 props) and deliver
`<Name>_Biome_Pack.zip`. The game imports it with `python3 tools/process_assets.py biomes <name>`.

**Biomes to make** (element and monster roster, to set the theme):

| Biome id | Name | Element | Themes to draw | Monsters seen there |
|---|---|---|---|---|
| frozen | Frozen Ossuary | cold | ice-crusted bone vaults, frozen corpses, icicles | skeletons, wraiths, golems, hounds, gargoyles |
| molten | Molten Depths | fire | basalt, lava channels, chains, forges | imps, demons, elementals, golems, worms |
| fungal | Fungal Grotto | poison | giant mushrooms, spore mats, roots | shrooms, spiders, slimes, worms |
| sunken | Sunken Crypt | cold | flooded crypts, algae, drowned coffins | zombies, worms, slimes, wraiths |
| blood | Halls of Blood | blood | flesh-veined stone, blood pools, altars | ghouls, demons, abominations, hounds |
| ashen | Ashen Wastes | fire | ash dunes, burned ruins, charred trees | skeletons, golems, imps, hounds |
| void | Void Sanctum | shadow | floating stone, violet rifts, star voids | wraiths, eyes, elementals, cultists |
| gilded | Gilded Tomb | holy | gold-leaf pharaonic tomb, sarcophagi, treasure | skeletons, knights, scorpions, golems |
| plague | Plague Sewers | poison | brick sewers, sludge, rats, grates | zombies, slimes, worms, abominations |
| crystal | Crystal Caverns | light | glowing crystal clusters, geodes | elementals, golems, spiders, eyes |
| desert | Bone Desert Tombs | phys | sandstone, bleached bones, sand drifts | scorpions, skeletons, worms, beetles |
| shadow | Shadow Labyrinth | shadow | black marble maze, shadow mist | wraiths, ghouls, spiders, bats |
| forge | Infernal Forge | fire | iron, anvils, molten moulds, chains | demons, imps, golems, knights |
| abyss | Abyssal Rift | light | the edge of reality, tentacles, glowing cracks | eyes, wraiths, elementals, worms |
| thorn | Thornwood Barrow | poison | barrow mounds, thorn thickets, roots | hounds, spiders, shrooms, zombies |
| storm | Storm Spire | light | wind-torn tower, copper rods, broken roofs | elementals, gargoyles, golems, knights |
| obsidian | Obsidian Vault | arcane | black glass vault, arcane runes | golems, knights, gargoyles, elementals |
| flesh | Flesh Pits | blood | living meat walls, ribs, sinew | abominations, worms, ghouls, slimes |
| serpent | Serpent Sepulcher | poison | snake temple, scaled pillars, venom basins | scorpions, worms, skeletons, cultists |
| shattered | Shattered Citadel | phys | ruined castle halls, collapsed masonry, banners | knights, archers, gargoyles, golems |
| library | Haunted Library | arcane | bookshelves, floating tomes, candles, lecterns | wraiths, cultists, eyes, imps |
| necropolis | Moonlit Necropolis | cold | moonlit mausoleums, gravestones, iron fences | skeletons, zombies, ghouls, wraiths |
| amber | Amber Wastes | fire | amber-sand ruins, fossils, resin | scorpions, beetles, worms, golems |
| throne | Velscour's Throne (Depth 100) | fire | hellish throne hall, bone throne, demonic columns | demons, imps, knights + Velscour |

Several biomes can share a pack (the game picks a pack per biome with `b.pack`). Suggested order: **throne,
molten/forge, frozen/necropolis, fungal/plague, desert/amber, library, flesh/blood**.

---

## E. Town NPCs (P2)

The town's people are **recoloured hero sprites**. For example, the weaponsmith is a tinted Barbarian.

**Format:** one sheet, **2 rows x 6 columns**, transparent, facing right, standing idle, 1.0 hero height, same
rules as the monster sheets.

| # | Name | Role | Brief |
|---|---|---|---|
| 1 | Garrick Ironhand | Weaponsmith | burly smith, leather apron, a sword over his shoulder |
| 2 | Hilde Stonewall | Armorer | broad armoured woman with a tower shield |
| 3 | Durgan Emberforge | Blacksmith (upgrades) | soot-covered dwarf-ish smith with a hammer and tongs |
| 4 | Lily Belle the Veiled | Enchanter | veiled sorceress in green, floating runes |
| 5 | Old Mother Wren | Alchemist | hunched crone in green rags with potion bottles |
| 6 | Zafir the Lapidary | Gem merchant | turbaned gem trader with a loupe and gem pouches |
| 7 | Jamie the Curator | Jeweler (sockets) | a monk with a hand drill and jeweler's lenses |
| 8 | Fortunato | Gambler | a flamboyant gambler: hat, cards, dice |
| 9 | Old Tobin | Townsfolk | a frail old man with a lantern |
| 10 | Mira | Townsfolk | a young village girl |
| 11 | Brother Cael | Townsfolk | a wandering priest |
| 12 | Gorm | Townsfolk | a retired barbarian with bad knees and a walking stick |

---

## F. Generic item icons (P2)

Inventory, ground-loot and vendor icons with no real art yet. Body armor, helmets and potions are already done.
Weapons and shields are done for the Paladin only (section C).

**Format:** one sheet per slot, **6 rarity rows x 10 designs** (Common, Uncommon, Rare, Epic, Legendary, Mythic),
uniform square cells (e.g. 128 x 128), item centred and upright, true transparency, a label margin, plus a catalog.
The game tints by material, so draw in natural colours.

| Sheet | Slot | Names the game uses (one per tier group) | Count |
|---|---|---|---|
| F1 | Hands | Gloves, Bracers, Gauntlets, War Gauntlets, Ogre Gauntlets | 60 |
| F2 | Legs | Leggings, Chain Leggings, Greaves, Plate Greaves, Warlord Greaves | 60 |
| F3 | Feet | Boots, Heavy Boots, Chain Boots, Sabatons, War Boots | 60 |
| F4 | Off-hand orbs (Necromancer, Arcane Sorcerer, Slime Lord) | Glass Orb, Eldritch Orb, Sacred Globe, Eye of Night, Star of Ruin | 30 (3 rows x 10) |
| F5 | *Fallback weapons (optional once C is done)* | sword, axe, mace, hammer, dagger, staff, wand, bow, crossbow, spear, scythe, pistol, boomerang, lute, shield | 15 x 5 tiers |

F1-F4 need a small new importer (tell Claude when the sheets arrive).

---

## G. Gems, gold and globes (P2)

Drawn in code now (gradient polygons).

**Gems.** One sheet, **21 rows (gems) x 6 columns (tiers)**: Chipped, Flawed, (normal), Flawless, Perfect, Royal.
Each tier grows bigger, cleaner and more ornate. Square cells, about 96 px.

| Gem | Colour | Gem | Colour | Gem | Colour |
|---|---|---|---|---|---|
| Ruby | `#e0203a` | Onyx | `#3a3448` | Prism Shard | white, prismatic |
| Sapphire | `#2a5aff` | Opal | `#f0d0ff` | Twinsoul Gem | `#ff80ff`, two cores |
| Topaz | `#ffc020` | Jade | `#40d0a0` | Splitter Garnet | `#ff5030`, cracked in three |
| Emerald | `#20c050` | Bloodstone | `#a00018` | Orbit Pearl | `#e0f0ff`, with a small orbiting pearl |
| Amethyst | `#a040e0` | Moonstone | `#c0d8ff`, crescent | Nova Core | `#ffd040`, star burst |
| Diamond | `#e8f4ff` | Sunstone | `#ffa020`, sun | Chainlink Agate | `#a0a0ff`, linked |
| | | | | Titan Heart | `#c06030`, heart-shaped |
| | | | | Seeker's Eye | `#40ffc0`, an eye |
| | | | | Tear of the Ancients | `#ffe0a0`, teardrop relic |

**Gold piles:** 3 sizes (small, medium, large heap of coins) on one strip.
**Health and mana globes:** 2 small glowing pick-up globes (red, blue) dropped by monsters, D2-style.

---

## H. Skill icons (P3)

All **980 skill icons** are drawn in code: an element-coloured glow behind a projectile shape or summon portrait.
They show on the skill bar, skill tree and tooltips.

**Format:** per class, **6 rows x 10 columns** of 64 x 64 (or 128 x 128) square icons in skill order (Appendix 1
order: tree 1 skills 1-20, tree 2 skills 1-20, tree 3 skills 1-20), dark framed, readable at 40 px. The
Necromancer needs 80 (8 rows). A class pack's ability effects (C) can be the starting motif.

---

## I. Code-drawn effects (P3)

These read well enough in motion, but painted versions would add a lot. Every one is tinted per element, so draw them
in white or grey with a coloured core, or deliver one per element.

- **Projectiles** (single sprite pointing right, or a short loop): arrow, javelin, spear, bone spear, bullet,
  thrown hammer, blade, axe, chakram, boomerang, disc/shield, skull, spirit, ice shard, tooth, crow, feather, locust,
  music note, slime blob, acid glob, blood glob, star, firework, rocket, bomb, rock, totem, meteor, wave, spirit
  wolf, spirit dragon, rune, card, fireball, chain, orb, bolt, magic missile, spark. (~40)
- **Explosions / impacts** (6-frame strips): explosion, fireball burst, meteor impact, rocket blast, nuke, eruption,
  pillar of light, holy burst, void implosion, firework, sonic boom, blizzard, frost burst, blood burst, hit spark.
- **Ground and area effects:** fire wall segment, trap (spike / fire / frost), rain impacts, fissure crack,
  aura ring, consecration circle, curse sigil, level-up sigil, boss telegraph (circle, cone, line).
- **Town / dungeon portal:** a swirling vortex between two pillars (the pillars are pack art already). Wanted: an
  animated portal, 6-8 frames.
- **Blood decals:** splats and pools on the floor (now random masks).

---

## J. Animation (P3, the largest item)

Heroes and monsters are **single frames**. The game fakes life with bobbing, squash and leaning. The gear libraries
(80 armors x 16 classes) and the 70 monsters would each need matching frames, so this is a big job. Suggested
minimum, if attempted:
- **Hero:** idle (4), walk (6), attack (4), cast (4), hit (1), death (4), for each class, drawn on the same unhelmed
  body as the gear library (head anchor 64,40 on a 128 x 192 canvas) so armors and helms can be fitted later.
- **Monsters:** walk (4) + attack (3) + death (3) per monster.

Ask Claude before starting this: the engine needs work to play frames.

---

## K. UI art (P3)

Built from CSS boxes and borders, with no art:
- Panel frames: inventory, skill tree, vendor windows, Quest Log, settings, dialogs, tooltips. Ideal: one ornate
  **9-slice frame** (corners + edges + centre fill, gothic iron and bone) plus a title plate, tab, button (normal,
  hover, pressed) and a close button.
- Inventory paper-doll background with empty-slot silhouettes (weapon, off-hand, head, body, hands, legs, feet) and
  the item-socket ring.
- Skill tree background per class and the node frame (locked, learnable, learned).
- Full-screen backdrops: title screen, death screen ("You have died"), victory screen, loading screen, Heroes
  screen and class select.
- **Mouse cursor:** now an inline SVG. Wanted: a gauntlet or claw pointer (32 x 32), plus an attack variant.
- Rarity border glows for item slots (6 colours).

---

## L. Monster coverage gaps (Enemy Set 2) (P2)

Monsters have real art, but some AI archetypes have only one drawing, so every level that rolls them looks the same.
The next monster sheet should fill these first:

| Archetype (AI) | Drawings now | What it plays | Wanted |
|---|---|---|---|
| bat | 1 (Skull Eye) | fast flying swarm | bats, gloom bats, vampire bats, carrion flies |
| zombie | 1 (Corpse Hauler) | slow melee horde | zombies, drowned dead, plague corpses |
| slime | 1 (Writhing Maw) | splits in two on death | **green** oozes and gelatinous masses (enemy slimes stay green) |
| elemental | 1 (Deep Squid) | floating caster that bursts in novas | fire, ice, storm and void elementals, wisps |
| gargoyle | 1 | flying armoured charger | gargoyles, stone watchers, grotesques |
| archer | 2 | ranged bowmen | dark archers, cultist crossbowmen |
| imp | 2 | small fire-throwing demons | imps, hellspawn, fire fiends |
| hound | 2 | fast chargers | hellhounds, dire hounds, ravagers |
| scorpion | 2 | poison melee | scorpions, deathstalkers |
| beetle | 2 | suicide exploders | blast beetles, volatile scarabs |

**Format:** as `assets/source/enemies/set1/` (`docs/ENEMY_ART.md`): **2 rows x 5 columns of 10 monsters**, true
transparency, facing right, full body, about 2000 x 800 px, one pose, sheets named by content (`bats.png`,
`elementals.png`...). Include names and one-line descriptions in reading order.

---

## Not graphics, for reference

Sounds with no sample yet still play from a code synthesizer (`SOUNDS` in `src/core/audio.js`). Some examples are
summons, curses, traps, some spells, UI clicks and level-up. Only two songs remain: the title and the town; dungeons
have ambience only (by request).

---

## Appendix 1: skill lists per class (to name ability effects and skill icons)

Format: `Skill (kind, element)`. Each tree has 20 skills in 5 rows of 4. The Paladin is done and is left out.
The Necromancer's 4th tree, Skeletal Legion, is all summons that already have art; it only needs effects/icons.

### Ranger (60 skills)

**Marksmanship:** 1. Quick Shot (proj, phys); 2. Piercing Arrow (proj, phys); 3. Multishot (proj, phys); 4. Fire Arrow (proj, fire); 5. Guided Arrow (proj, phys); 6. Strafe (proj, phys); 7. Ice Arrow (proj, cold); 8. Explosive Shot (proj, fire); 9. Rain of Arrows (rain, phys); 10. Ricochet Shot (proj, phys); 11. Frost Volley (proj, cold); 12. Lightning Arrow (proj, light); 13. Arrow Storm (rain, light); 14. Penetrating Volley (proj, phys); 15. Split Arrow (proj, phys); 16. Immolation Arrow (proj, fire); 17. Hail of Arrows (rain, cold); 18. Dead Eye (proj, phys); 19. Phantom Barrage (proj, arcane); 20. Starfall Arrow (aoe, light)

**The Wilds:** 1. Hawk Companion (summon, phys); 2. Thornlash (melee, poison); 3. Wolf Pack (summon, phys); 4. Nature's Mend (heal, poison); 5. Vine Wall (wall, poison); 6. Poison Arrow (proj, poison); 7. Bear Spirit (summon, phys); 8. Barkskin (buff, phys); 9. Briar Patch (zone, poison); 10. Plague Arrow (proj, poison); 11. Spirit Wolves (summon, cold); 12. Gale (cyclone, phys); 13. Twister Volley (cyclone, phys); 14. Hawk Talons (summon, light); 15. Entangle (curse, poison); 16. Wild Stampede (fissure, phys); 17. Hurricane (cyclone, cold); 18. Alpha Wolf (summon, blood); 19. Thornstorm (nova, poison); 20. Wrath of the Wild (buff, poison)

**Traps & Tricks:** 1. Spike Trap (trap, phys); 2. Smoke Bomb (curse, shadow); 3. Caltrops (zone, phys); 4. Tumble (dash, phys); 5. Fire Trap (trap, fire); 6. Net Shot (proj, phys); 7. Frost Trap (trap, cold); 8. Snare (curse, phys); 9. Lightning Sentry (summon, light); 10. Bear Trap (trap, blood); 11. Cluster Trap (trap, fire); 12. Vanish (blink, shadow); 13. Death Sentry (summon, fire); 14. Rune Field (trap, arcane); 15. Mark for Death (curse, blood); 16. Evasion (buff, phys); 17. Minefield (trap, fire); 18. Shadow Clones (summon, shadow); 19. Chain Sentry (summon, light); 20. Huntress' Fury (rain, phys)

### Wizard (60 skills)

**Fire:** 1. Fire Bolt (proj, fire); 2. Inferno (beam, fire); 3. Fireball (proj, fire); 4. Blaze (zone, fire); 5. Fire Wall (wall, fire); 6. Flame Spiral (proj, fire); 7. Combustion (aoe, fire); 8. Firestorm (fissure, fire); 9. Meteor (aoe, fire); 10. Hydra (summon, fire); 11. Fire Nova (nova, fire); 12. Dragon's Breath (beam, fire); 13. Pyroclasm (aoe, fire); 14. Flame Tornado (cyclone, fire); 15. Living Bomb (curse, fire); 16. Phoenix Strike (dash, fire); 17. Meteor Shower (rain, fire); 18. Armageddon (buff, fire); 19. Inferno Ring (wall, fire); 20. Sunbeam (beam, fire)

**Frost:** 1. Ice Bolt (proj, cold); 2. Frost Nova (nova, cold); 3. Frozen Armor (buff, cold); 4. Ice Shards (proj, cold); 5. Glacial Spike (proj, cold); 6. Ice Wall (wall, cold); 7. Frost Field (zone, cold); 8. Shiver Armor (buff, cold); 9. Blizzard (aoe, cold); 10. Frozen Orb (proj, cold); 11. Ice Lance (proj, cold); 12. Cold Snap (curse, cold); 13. Ice Storm (rain, cold); 14. Frost Spikes (fissure, cold); 15. Glacier (aoe, cold); 16. Comet (aoe, cold); 17. Absolute Zero (nova, cold); 18. Frozen Orb Barrage (proj, cold); 19. Ice Golem (summon, cold); 20. Cryo Beam (beam, cold)

**Storm:** 1. Charged Bolt (proj, light); 2. Static Field (nova, light); 3. Telekinesis (proj, arcane); 4. Teleport (blink, light); 5. Lightning (beam, light); 6. Chain Lightning (chain, light); 7. Thunder Clap (nova, light); 8. Ball Lightning (proj, light); 9. Thunderstorm (summon, light); 10. Lightning Nova (nova, light); 11. Energy Shield (buff, arcane); 12. Shock Wave (fissure, light); 13. Storm Lances (strike, light); 14. Tesla Coil (summon, light); 15. Arc Field (zone, light); 16. Overload (buff, light); 17. Tempest (cyclone, light); 18. Thor's Hammer (aoe, light); 19. Lightning Mastery (buff, light); 20. Hand of Zeus (strike, light)

### Necromancer (80 skills)

**Bone & Blood:** 1. Bone Spike (proj, phys); 2. Teeth (proj, shadow); 3. Bone Armor (buff, phys); 4. Blood Drain (beam, blood); 5. Bone Spear (proj, phys); 6. Bone Wall (wall, phys); 7. Corpse Explosion (corpse, fire); 8. Blood Nova (nova, blood); 9. Bone Spirit (proj, shadow); 10. Bone Prison (curse, phys); 11. Blood Lance (proj, blood); 12. Bone Spikes (fissure, phys); 13. Bone Storm (orbit, phys); 14. Blood Boil (aoe, blood); 15. Spirit Barrage (proj, shadow); 16. Corpse Lance (corpse, phys); 17. Bone Apocalypse (rain, phys); 18. Exsanguinate (nova, blood); 19. Death Laser (beam, shadow); 20. Grim Harvest (corpse, shadow)

**Summoning:** 1. Raise Skeleton (summon, phys); 2. Clay Golem (summon, phys); 3. Skeletal Archer (summon, phys); 4. Dark Pact (buff, shadow); 5. Skeletal Mage (summon, cold); 6. Blood Golem (summon, blood); 7. Revive (summon, shadow); 8. Bone Ward (buff, phys); 9. Iron Maiden (curse, blood); 10. Fire Golem (summon, fire); 11. Ghoul Horde (summon, poison); 12. Unholy Command (buff, shadow); 13. Army of the Dead (summon, shadow); 14. Bone Colossus (summon, phys); 15. Soul Harvest (corpse, shadow); 16. Lich Form (buff, cold); 17. Legion (summon, shadow); 18. Necrotic Bloom (corpse, poison); 19. Wraith Host (summon, shadow); 20. Master of Death (buff, shadow)

**Curses & Plague:** 1. Amplify Damage (curse, shadow); 2. Poison Dagger (melee, poison); 3. Weaken (curse, shadow); 4. Life Tap (curse, blood); 5. Poison Nova (nova, poison); 6. Terror (curse, shadow); 7. Plague Cloud (zone, poison); 8. Decrepify (curse, shadow); 9. Confuse (curse, shadow); 10. Toxic Burst (aoe, poison); 11. Lower Resist (curse, arcane); 12. Plague Spear (proj, poison); 13. Pestilence (zone, poison); 14. Bone Curse (curse, phys); 15. Blight Wave (fissure, poison); 16. Soul Rend (chain, shadow); 17. Plague Apocalypse (rain, poison); 18. Death's Embrace (curse, shadow); 19. Contagion (nova, poison); 20. Doom (curse, shadow)

**Skeletal Legion:** 1. Skeletal Reaver (summon, phys); 2. Skeletal Crossbowman (summon, phys); 3. Skeletal Pyromancer (summon, fire); 4. Mend Bones (heal, shadow); 5. Skeletal Spearman (summon, phys); 6. Coffin Guard (summon, phys); 7. Skeletal Plaguecaller (summon, poison); 8. Bone Bishop (summon, holy); 9. Chained Jailer (summon, phys); 10. Gravedigger (summon, phys); 11. Skeletal Stormcaller (summon, light); 12. Knell Ringer (summon, shadow); 13. Ramskull Berserker (summon, phys); 14. Bone Standard-Bearer (summon, phys); 15. Pyre Inquisitor (summon, fire); 16. Thornbone Druid (summon, poison); 17. Reaper King (summon, shadow); 18. Grave Warband (summon, phys); 19. Skeletal Archlich (summon, shadow); 20. Conclave of Bones (summon, shadow)

### Barbarian (60 skills)

**Rage:** 1. Bash (melee, phys); 2. Double Swing (melee, phys); 3. Frenzy (melee, phys); 4. Leap (leap, phys); 5. Whirlwind (whirl, phys); 6. Berserk (melee, shadow); 7. Leap Attack (leap, phys); 8. Double Throw (proj, phys); 9. Cleave (melee, phys); 10. Rampage (whirl, blood); 11. Ground Breaker (melee, phys); 12. Axe Storm (proj, phys); 13. Bloodlust (buff, blood); 14. Furious Charge (dash, phys); 15. Executioner (melee, blood); 16. Spinning Axes (orbit, phys); 17. Annihilate (melee, phys); 18. Eternal Whirlwind (whirl, phys); 19. Wrath of the Berserker (buff, blood); 20. Thousand Cuts (melee, phys)

**Warcries:** 1. Howl (curse, phys); 2. Shout (buff, phys); 3. Taunt (curse, phys); 4. Find Potion (heal, phys); 5. Battle Cry (curse, phys); 6. War Cry (nova, phys); 7. Battle Orders (buff, phys); 8. Grim Ward (summon, phys); 9. Battle Command (buff, phys); 10. Thunder Shout (nova, light); 11. Iron Skin (buff, phys); 12. Ancestral Call (summon, phys); 13. Earsplitter (nova, phys); 14. Rallying Cry (heal, phys); 15. Intimidate (curse, shadow); 16. Ancients' Fury (summon, phys); 17. Warlord's Roar (nova, blood); 18. Undying Rage (buff, blood); 19. Call of the Ancients (summon, light); 20. Battle Trance (buff, phys)

**Earthshaker:** 1. Ground Slam (nova, phys); 2. Stomp (melee, phys); 3. Rock Throw (proj, phys); 4. Seismic Step (dash, phys); 5. Fissure (fissure, phys); 6. Earthquake (aoe, phys); 7. Boulder Toss (proj, phys); 8. Tremor (nova, phys); 9. Seismic Slam (fissure, phys); 10. Avalanche (rain, phys); 11. Stone Skin (buff, phys); 12. Magma Rift (fissure, fire); 13. Earthen Spikes (nova, phys); 14. Hammer of the Mountain (orbit, phys); 15. Landslide (fissure, phys); 16. Volcanic Eruption (aoe, fire); 17. Cataclysm (aoe, fire); 18. Mountain King (buff, phys); 19. Ancestral Hammers (orbit, light); 20. Worldsplitter (fissure, phys)

### Dragoon (60 skills)

**Lancework:** 1. Lance Jab (melee, phys); 2. Twin Thrust (melee, phys); 3. Sweeping Lance (melee, phys); 4. Piercing Thrust (melee, phys); 5. Spiral Lance (proj, phys); 6. Impale (melee, blood); 7. Lance Flurry (melee, phys); 8. Wind Lance (proj, phys); 9. Dragon Fang (melee, fire); 10. Hundred Spears (proj, phys); 11. Cross Thrust (melee, light); 12. Lance Barrier (orbit, phys); 13. Skewer (dash, phys); 14. Spear Rain (rain, phys); 15. Gungnir (proj, light); 16. Vortex Lance (cyclone, phys); 17. Thousand Lances (rain, phys); 18. Dragon Lance (proj, fire); 19. Lance of Longinus (beam, holy); 20. Infinite Thrust (melee, phys)

**Sky Dive:** 1. Jump (leap, phys); 2. Wind Step (dash, phys); 3. Aerial Strike (leap, phys); 4. Feather Fall (buff, phys); 5. Dragon Dive (leap, fire); 6. Gale Slash (proj, phys); 7. High Jump (leap, phys); 8. Updraft (cyclone, phys); 9. Comet Dive (leap, fire); 10. Skyward Sweep (nova, phys); 11. Stardive (leap, arcane); 12. Falcon Rush (dash, phys); 13. Meteor Lance (aoe, fire); 14. Storm Dive (leap, light); 15. Sky Splitter (fissure, phys); 16. Tailwind (buff, phys); 17. Dragonfall (leap, fire); 18. Heavenly Spears (strike, holy); 19. Cyclone Dive (leap, phys); 20. Wings of the Wyrm (buff, fire)

**Wyrmblood:** 1. Dragon Breath (beam, fire); 2. Wyrm Scale (buff, fire); 3. Blood Pact (buff, blood); 4. Ember Spit (proj, fire); 5. Wyvern Spirit (summon, fire); 6. Frost Breath (beam, cold); 7. Draconic Roar (curse, fire); 8. Flame Lash (melee, fire); 9. Storm Breath (beam, light); 10. Wyrmfire Pool (zone, fire); 11. Blood Frenzy (buff, blood); 12. Drake Whelps (summon, fire); 13. Venom Breath (beam, poison); 14. Dragon Heart (buff, fire); 15. Wyrm Coil (orbit, fire); 16. Inferno Breath (beam, fire); 17. Elder Wyrm (summon, fire); 18. Prismatic Breath (beam, arcane); 19. Bloodfire Nova (nova, blood); 20. Dragonsoul (buff, fire)

### Totem Master (60 skills)

**Totems:** 1. Spirit Strike (melee, phys); 2. Searing Totem (summon, fire); 3. Healing Totem (summon, holy); 4. Stoneclaw Totem (summon, phys); 5. Storm Totem (summon, light); 6. Frost Totem (summon, cold); 7. Windfury Totem (summon, phys); 8. Totem Slam (aoe, phys); 9. Magma Totem (summon, fire); 10. Venom Totem (summon, poison); 11. Spirit Link Totem (summon, holy); 12. Totemic Recall (nova, arcane); 13. Thunderhead Totem (summon, light); 14. Ancestral Pillar (summon, holy); 15. Totem Barrage (proj, phys); 16. Earthbind Totem (summon, phys); 17. Grand Totem (summon, arcane); 18. Totemic Mastery (buff, arcane); 19. Volcano Totem (summon, fire); 20. Pantheon (summon, light)

**Ancestors:** 1. Spirit Wolf (summon, phys); 2. Ancestral Bolt (proj, holy); 3. Spirit Shield (buff, holy); 4. Hex (curse, shadow); 5. Ghost Wolves (proj, cold); 6. Ancestral Guardian (summon, holy); 7. Spirit Walk (blink, holy); 8. Soul Link (buff, holy); 9. Ancestral Swarm (proj, holy); 10. Spirit Bear (summon, holy); 11. Haunt (curse, shadow); 12. Rebirth (heal, holy); 13. Spirit Chain (chain, holy); 14. Ancestral Hammer (orbit, holy); 15. Wolf Pack Alpha (summon, light); 16. Ghost Walk (buff, shadow); 17. Council of Elders (summon, holy); 18. Spirit Storm (cyclone, holy); 19. Soul Beam (beam, holy); 20. Ancestral Wrath (strike, holy)

**Earth & Storm:** 1. Earth Shock (proj, phys); 2. Lightning Bolt (beam, light); 3. Flame Shock (proj, fire); 4. Frost Shock (proj, cold); 5. Chain Lightning (chain, light); 6. Primal Stomp (nova, phys); 7. Lava Burst (proj, fire); 8. Thunderstorm (nova, light); 9. Earthquake (aoe, phys); 10. Storm Strike (melee, light); 11. Magma Fissure (fissure, fire); 12. Hailstorm (rain, cold); 13. Tornado (cyclone, phys); 14. Eruption (aoe, fire); 15. Static Shock (buff, light); 16. Earthen Wall (wall, phys); 17. Elemental Fury (nova, arcane); 18. Sky Splitter (strike, light); 19. Avatar of Storms (buff, light); 20. Molten Core (aoe, fire)

### Death Knight (60 skills)

**Frost:** 1. Frost Strike (melee, cold); 2. Icy Touch (proj, cold); 3. Howling Blast (nova, cold); 4. Chains of Ice (curse, cold); 5. Obliterate (melee, cold); 6. Frost Wyrm Breath (beam, cold); 7. Remorseless Winter (zone, cold); 8. Glacial Advance (fissure, cold); 9. Frostscythe (melee, cold); 10. Rime Storm (aoe, cold); 11. Icebound Fortitude (buff, cold); 12. Frozen Runeblade (orbit, cold); 13. Breath of Sindragosa (beam, cold); 14. Avalanche Strike (melee, cold); 15. Frost Wyrm (summon, cold); 16. Pillar of Frost (buff, cold); 17. Winter's End (nova, cold); 18. Frozen Throne (zone, cold); 19. Glacial Cataclysm (rain, cold); 20. Runeblade Storm (cyclone, cold)

**Unholy:** 1. Death Coil (proj, shadow); 2. Plague Strike (melee, poison); 3. Raise Ghoul (summon, shadow); 4. Death Grip (proj, shadow); 5. Death and Decay (zone, shadow); 6. Festering Strike (melee, poison); 7. Scourge Strike (melee, shadow); 8. Unholy Blight (zone, poison); 9. Army of the Dead (summon, shadow); 10. Epidemic (nova, poison); 11. Dark Transformation (buff, shadow); 12. Necrotic Strike (melee, shadow); 13. Defile (zone, shadow); 14. Apocalypse (nova, shadow); 15. Abomination (summon, poison); 16. Soul Reaper (melee, shadow); 17. Unholy Frenzy (buff, shadow); 18. Dark Rider (dash, shadow); 19. Death Pact (heal, shadow); 20. Plaguebringer (rain, poison)

**Blood:** 1. Heart Strike (melee, blood); 2. Blood Boil (nova, blood); 3. Vampiric Blood (buff, blood); 4. Mark of Blood (curse, blood); 5. Death Strike (melee, blood); 6. Blood Tap (heal, blood); 7. Rune Tap (buff, blood); 8. Blood Plague (curse, blood); 9. Consumption (nova, blood); 10. Bonestorm (whirl, blood); 11. Blood Mirror (buff, blood); 12. Gorefiend's Grasp (nova, shadow); 13. Dancing Rune Weapon (summon, blood); 14. Blood Lance (proj, blood); 15. Crimson Scourge (zone, blood); 16. Tombstone (buff, blood); 17. Sanguine Storm (cyclone, blood); 18. Bloodbath (aoe, blood); 19. Purgatory (buff, blood); 20. Blood Moon (rain, blood)

### Arcane Sorcerer (60 skills)

**Arcane:** 1. Arcane Missile (proj, arcane); 2. Arcane Blast (aoe, arcane); 3. Magic Missiles (proj, arcane); 4. Mana Shield (buff, arcane); 5. Arcane Orb (proj, arcane); 6. Arcane Barrage (proj, arcane); 7. Prismatic Spray (proj, arcane); 8. Arcane Explosion (nova, arcane); 9. Arcane Beam (beam, arcane); 10. Mirror Image (summon, arcane); 11. Arcane Torrent (proj, arcane); 12. Spellweave (buff, arcane); 13. Arcane Comet (aoe, arcane); 14. Arcane Wall (wall, arcane); 15. Supernova (nova, arcane); 16. Seeker Orbs (orbit, arcane); 17. Arcane Cataclysm (rain, arcane); 18. Disintegrate (beam, arcane); 19. Archmage's Fury (buff, arcane); 20. Prismatic Ray (beam, arcane)

**Chronomancy:** 1. Time Bolt (proj, arcane); 2. Blink (blink, arcane); 3. Haste (buff, arcane); 4. Slow Time (curse, arcane); 5. Temporal Rift (zone, arcane); 6. Chrono Shift (blink, arcane); 7. Time Warp (curse, arcane); 8. Echo Bolt (proj, arcane); 9. Rewind (heal, arcane); 10. Stasis (curse, arcane); 11. Temporal Shards (proj, arcane); 12. Accelerate (buff, arcane); 13. Time Bomb (curse, arcane); 14. Paradox (summon, arcane); 15. Chronosphere (zone, arcane); 16. Era Collapse (aoe, arcane); 17. Time Stop (curse, arcane); 18. Infinite Loop (orbit, arcane); 19. Epoch Beam (beam, arcane); 20. Big Crunch (nova, arcane)

**Void:** 1. Void Bolt (proj, shadow); 2. Shadow Word (curse, shadow); 3. Void Touch (melee, shadow); 4. Dark Pulse (nova, shadow); 5. Void Rift (zone, shadow); 6. Shadow Orb (proj, shadow); 7. Void Lance (proj, shadow); 8. Nether Step (blink, shadow); 9. Black Hole (aoe, shadow); 10. Void Tendrils (fissure, shadow); 11. Abyssal Gaze (beam, shadow); 12. Nether Swarm (proj, shadow); 13. Singularity (proj, shadow); 14. Death Ray (beam, shadow); 15. Void Eruption (aoe, shadow); 16. Voidwalker (buff, shadow); 17. Annihilation (aoe, shadow); 18. Event Horizon (nova, shadow); 19. Void Lord (summon, shadow); 20. Oblivion Beam (beam, shadow)

### Carrion Witch (60 skills)

**Plague:** 1. Rot Bolt (proj, poison); 2. Locust Swarm (cyclone, poison); 3. Blight (zone, poison); 4. Rot Touch (melee, poison); 5. Plague Cloud (zone, poison); 6. Corpse Burst (corpse, poison); 7. Pestilent Spray (beam, poison); 8. Infest (curse, poison); 9. Swarm Storm (cyclone, poison); 10. Toxic Rain (rain, poison); 11. Rotting Flesh (nova, poison); 12. Blood Flies (proj, blood); 13. Plague Bearer (summon, poison); 14. Miasma (zone, poison); 15. Carrion Feast (corpse, blood); 16. Locust Plague (cyclone, poison); 17. Black Death (nova, poison); 18. Rain of Rot (rain, poison); 19. Pandemic (curse, poison); 20. Hive Mother (summon, poison)

**Murder of Crows:** 1. Crow Swarm (proj, shadow); 2. Raven Familiar (summon, shadow); 3. Peck (melee, phys); 4. Feathered Cloak (buff, shadow); 5. Murder of Crows (cyclone, shadow); 6. Eye Gouge (curse, blood); 7. Crow Storm (proj, shadow); 8. Scarecrow (summon, phys); 9. Raven Flock (summon, shadow); 10. Feather Blades (proj, phys); 11. Carrion Call (corpse, shadow); 12. Night Wings (blink, shadow); 13. Dark Murder (cyclone, shadow); 14. Feather Storm (orbit, phys); 15. Crow Queen (buff, shadow); 16. Talon Rain (rain, shadow); 17. Unkindness (summon, shadow); 18. Eclipse of Wings (nova, shadow); 19. Soul Crows (proj, shadow); 20. Nevermore (strike, shadow)

**Hexes:** 1. Hex Bolt (proj, shadow); 2. Voodoo Doll (curse, blood); 3. Withering (curse, shadow); 4. Soul Siphon (beam, shadow); 5. Cauldron (summon, poison); 6. Bone Totem (summon, phys); 7. Hag's Curse (curse, shadow); 8. Blood Hex (curse, blood); 9. Witch Bolt (chain, shadow); 10. Grave Hex (curse, phys); 11. Spirit Lantern (summon, holy); 12. Wither Wave (fissure, shadow); 13. Effigy (summon, blood); 14. Mass Hysteria (curse, shadow); 15. Death Rattle (nova, phys); 16. Hexstorm (rain, shadow); 17. Coven (summon, shadow); 18. Doom Hex (curse, shadow); 19. Puppeteer (curse, shadow); 20. Witching Hour (buff, shadow)

### Bard (60 skills)

**Songs:** 1. Lute Strike (melee, phys); 2. Ballad of Valor (buff, holy); 3. Hymn of Mending (buff, holy); 4. Dirge (curse, shadow); 5. Battle Hymn (buff, phys); 6. Lullaby (curse, arcane); 7. Song of Swiftness (buff, phys); 8. Requiem (curse, shadow); 9. Anthem of Heroes (buff, holy); 10. Chorus (summon, holy); 11. Siren Song (curse, arcane); 12. Rhapsody (nova, holy); 13. Symphony of Storms (buff, light); 14. Crescendo (nova, phys); 15. Elegy (zone, shadow); 16. Ode to Joy (heal, holy); 17. Magnum Opus (buff, holy); 18. Finale (nova, arcane); 19. Orchestra (summon, holy); 20. Song of the Ages (curse, arcane)

**Sonic Arts:** 1. Sound Wave (proj, phys); 2. Power Chord (nova, phys); 3. Echo (proj, phys); 4. Discord (curse, phys); 5. Shockwave Riff (fissure, phys); 6. Resonance (aoe, phys); 7. Tremolo (proj, phys); 8. Feedback Loop (orbit, phys); 9. Sonic Boom (nova, phys); 10. Bass Drop (aoe, phys); 11. Harmonic Beam (beam, arcane); 12. Screech (proj, phys); 13. Thunder Drum (summon, light); 14. Shatter Note (proj, phys); 15. Wall of Sound (wall, phys); 16. Amplifier (summon, arcane); 17. Brown Note (nova, poison); 18. Encore (buff, arcane); 19. Death Metal (beam, shadow); 20. Supersonic (fissure, phys)

**Trickery:** 1. Knife Throw (proj, phys); 2. Fan of Knives (proj, phys); 3. Smoke Screen (curse, shadow); 4. Pickpocket (melee, phys); 5. Dancing Blades (orbit, phys); 6. Pyrotechnics (aoe, fire); 7. Misdirection (blink, arcane); 8. Juggler's Toss (proj, fire); 9. Mirror Images (summon, arcane); 10. Card Trick (proj, arcane); 11. Flashbang (curse, holy); 12. Blade Flurry (melee, phys); 13. Grand Illusion (summon, arcane); 14. Firework Finale (rain, fire); 15. Swashbuckle (dash, phys); 16. Deadly Cards (proj, arcane); 17. Showstopper (aoe, arcane); 18. Thousand Knives (rain, phys); 19. Vanishing Act (buff, shadow); 20. Bladestorm Waltz (whirl, phys)

### Slime Lord (60 skills)

**Ooze:** 1. Slime Ball (proj, acid); 2. Acid Splash (proj, acid); 3. Slime Pool (zone, acid); 4. Goo Spit (proj, acid); 5. Ooze Wave (fissure, acid); 6. Gelatinous Wall (wall, acid); 7. Acid Rain (rain, acid); 8. Corrosive Bolt (proj, acid); 9. Slime Nova (nova, acid); 10. Toxic Flood (wall, acid); 11. Bouncing Blob (proj, acid); 12. Sludge Beam (beam, acid); 13. Acid Geyser (aoe, acid); 14. Slime Tsunami (fissure, acid); 15. Melt (curse, acid); 16. Viscous Orbs (orbit, acid); 17. Deluge (rain, acid); 18. Primordial Ooze (zone, acid); 19. Acid Comet (aoe, acid); 20. Gloop Cannon (proj, acid)

**Spawn:** 1. Slimeling (summon, acid); 2. Split (nova, acid); 3. Ooze Buddy (summon, acid); 4. Slime Trail (zone, acid); 5. Brood (summon, acid); 6. Volatile Slime (summon, acid); 7. Frost Jelly (summon, cold); 8. Feed (buff, acid); 9. King Slime (summon, acid); 10. Mitosis (summon, acid); 11. Slime Rain (rain, acid); 12. Swarming Ooze (buff, acid); 13. Ooze Titan (summon, acid); 14. Explosive Brood (summon, acid); 15. Prismatic Jellies (summon, acid); 16. Symbiosis (heal, acid); 17. Slime Empire (summon, acid); 18. Gelatinous Horde (summon, acid); 19. Hivemind (buff, acid); 20. Mother Ooze (summon, acid)

**Mutation:** 1. Body Slam (melee, acid); 2. Absorb (melee, acid); 3. Slime Armor (buff, acid); 4. Bounce (leap, acid); 5. Engulf (melee, acid); 6. Elastic Lash (melee, acid); 7. Splatter Leap (leap, acid); 8. Regenerate (buff, acid); 9. Rolling Blob (dash, acid); 10. Acidic Skin (buff, acid); 11. Spike Mutation (nova, acid); 12. Tendril Whip (melee, acid); 13. Colossal Form (buff, acid); 14. Mega Bounce (leap, acid); 15. Devour (melee, acid); 16. Amorphous (buff, acid); 17. Cataclysmic Splash (leap, acid); 18. Slime God (buff, acid); 19. Gooey Vortex (cyclone, acid); 20. Ooze Apocalypse (nova, acid)

### Boomerang Knight (60 skills)

**Throwing:** 1. Boomerang (proj, phys); 2. Twin Rang (proj, phys); 3. Ricochet (proj, phys); 4. Heavy Rang (proj, phys); 5. Tri-Rang (proj, phys); 6. Seeking Rang (proj, phys); 7. Flame Rang (proj, fire); 8. Frost Rang (proj, cold); 9. Rang Storm (proj, phys); 10. Storm Rang (proj, light); 11. Splitting Rang (proj, phys); 12. Chakram (proj, phys); 13. Infinity Rang (proj, arcane); 14. Blade Comet (aoe, phys); 15. Rang Barrage (proj, phys); 16. Orbiting Rangs (orbit, phys); 17. Rangnarok (proj, phys); 18. Celestial Chakram (proj, holy); 19. Black Hole Rang (proj, shadow); 20. Rang Rain (rain, phys)

**Bladesmanship:** 1. Cross Slash (melee, phys); 2. Swirling Blades (orbit, phys); 3. Riposte (buff, phys); 4. Lunge (dash, phys); 5. Sword Spin (melee, phys); 6. Blade Dance (whirl, phys); 7. Twin Fang (melee, blood); 8. Parry (buff, phys); 9. Blade Fury (melee, phys); 10. Swirling Storm (orbit, phys); 11. Crescent Wave (proj, phys); 12. Iaido (dash, phys); 13. Blade Vortex (cyclone, phys); 14. Thousand Swords (rain, phys); 15. Knight's Honor (buff, holy); 16. X-Slash (melee, phys); 17. Omnislash (dash, phys); 18. Blade Halo (orbit, holy); 19. Sword Saint (buff, phys); 20. Excalibur (beam, holy)

**Gale Knight:** 1. Wind Rang (proj, phys); 2. Gust (nova, phys); 3. Air Dash (dash, phys); 4. Tailwind (buff, phys); 5. Cyclone (cyclone, phys); 6. Gale Wall (wall, phys); 7. Vacuum Slash (melee, phys); 8. Squall (proj, cold); 9. Twin Cyclones (cyclone, phys); 10. Hurricane Rang (proj, phys); 11. Wind Shear (fissure, phys); 12. Eye of the Storm (zone, light); 13. Tempest Rang (proj, light); 14. Typhoon (cyclone, cold); 15. Skyward Blades (rain, phys); 16. Zephyr (buff, phys); 17. Maelstrom (cyclone, light); 18. Gale Force (nova, phys); 19. Storm Knight (buff, light); 20. Thunder Rang (proj, light)

### Lancer (60 skills)

**Phalanx:** 1. Spear Thrust (melee, phys); 2. Shield Wall (buff, phys); 3. Shield Slam (melee, phys); 4. Brace (buff, phys); 5. Impale (melee, blood); 6. Phalanx Charge (dash, phys); 7. Sweep the Leg (melee, phys); 8. Tortoise (buff, phys); 9. Spear Wall (wall, phys); 10. Skewer Line (melee, phys); 11. Shield Bash Nova (nova, phys); 12. Unbreakable (buff, phys); 13. Hoplite Rush (dash, phys); 14. Spear Cyclone (whirl, phys); 15. Ironclad (buff, phys); 16. Pinning Strike (melee, phys); 17. Spartan Kick (melee, phys); 18. Legion Phalanx (summon, phys); 19. Aegis Nova (nova, holy); 20. Line Breaker (fissure, phys)

**Javelin:** 1. Javelin (proj, phys); 2. Power Throw (proj, phys); 3. Twin Javelins (proj, phys); 4. Poison Javelin (proj, poison); 5. Lightning Javelin (proj, light); 6. Javelin Fan (proj, phys); 7. Plague Javelin (proj, poison); 8. Frost Javelin (proj, cold); 9. Charged Strike (melee, light); 10. Javelin Rain (rain, phys); 11. Fire Javelin (proj, fire); 12. Splitting Javelin (proj, phys); 13. Lightning Fury (proj, light); 14. Storm of Javelins (rain, light); 15. Seeking Javelins (proj, phys); 16. Meteor Javelin (aoe, fire); 17. Thunderbolt (strike, light); 18. Javelin Apocalypse (rain, phys); 19. Gae Bolg (proj, blood); 20. Valkyrie's Spear (proj, holy)

**Valor:** 1. War Banner (summon, holy); 2. Rally (heal, holy); 3. Taunt (curse, phys); 4. Valor (buff, holy); 5. Inspire (buff, holy); 6. Challenge (curse, phys); 7. Battle Standard (summon, fire); 8. Second Wind (heal, phys); 9. Hold the Line (buff, phys); 10. Squire (summon, phys); 11. Glorious Charge (dash, holy); 12. Shout of Valor (nova, holy); 13. Heroic Presence (buff, holy); 14. Captain (summon, holy); 15. Valiant Leap (leap, holy); 16. Last Stand (buff, blood); 17. Army of Valor (summon, holy); 18. Banner of Kings (summon, holy); 19. Hero's Ascension (buff, holy); 20. Divine Spear Storm (strike, holy)

### Dragon Knight (60 skills)

**Flame:** 1. Flame Slash (melee, fire); 2. Fire Breath (beam, fire); 3. Searing Blade (melee, fire); 4. Ember Burst (nova, fire); 5. Flame Strike (aoe, fire); 6. Dragonfire Sweep (melee, fire); 7. Fire Pillar (strike, fire); 8. Magma Blade (melee, fire); 9. Dragon's Fury (melee, fire); 10. Volcanic Wave (fissure, fire); 11. Blazing Spin (whirl, fire); 12. Inferno Breath (beam, fire); 13. Hellfire (zone, fire); 14. Firestorm Slash (proj, fire); 15. Eruption (aoe, fire); 16. Burning Soul (buff, fire); 17. Dragon Slave (beam, fire); 18. Meteor Storm (rain, fire); 19. Supernova (nova, fire); 20. Phoenix (summon, fire)

**Scale:** 1. Dragon Scales (buff, fire); 2. Tail Swipe (melee, phys); 3. Molten Shield (buff, fire); 4. Scale Shards (proj, phys); 5. Dragonhide (buff, phys); 6. Claw Rend (melee, blood); 7. Ember Skin (zone, fire); 8. Scale Burst (nova, phys); 9. Wing Buffet (nova, phys); 10. Obsidian Scales (buff, fire); 11. Horn Charge (dash, phys); 12. Scale Barrage (proj, fire); 13. Dragon's Resilience (buff, fire); 14. Molten Armor (zone, fire); 15. Tail Quake (nova, phys); 16. Scale Storm (orbit, fire); 17. Adamantine Scales (buff, phys); 18. Primal Roar (curse, fire); 19. Dragonbone Spikes (nova, phys); 20. Indomitable (buff, fire)

**Draconic:** 1. Wing Dash (dash, fire); 2. Summon Whelp (summon, fire); 3. Dragon Eye (curse, fire); 4. Drake Bolt (proj, fire); 5. Dragon Leap (leap, fire); 6. Twin Drakes (proj, fire); 7. Wyrm's Call (summon, fire); 8. Draconic Rune (trap, fire); 9. Dragon Dive (leap, fire); 10. Drake Swarm (proj, fire); 11. Dragon Ward (summon, fire); 12. Sky Fire (rain, fire); 13. Dragon Form (buff, fire); 14. Elder Drake (summon, fire); 15. Dragon's Roar (nova, fire); 16. Bahamut's Gaze (beam, fire); 17. Megaflare (aoe, fire); 18. Dragon Legion (summon, fire); 19. Dragonlord (buff, fire); 20. Dragonfall (strike, fire)

### Gunner (60 skills)

**Firearms:** 1. Pistol Shot (proj, phys); 2. Buckshot (proj, phys); 3. Double Tap (proj, phys); 4. Ricochet Round (proj, phys); 5. Sniper Shot (proj, phys); 6. Fan the Hammer (proj, phys); 7. Incendiary Rounds (proj, fire); 8. Cryo Rounds (proj, cold); 9. Gatling Barrage (proj, phys); 10. Armor Piercer (proj, phys); 11. Shock Rounds (proj, light); 12. Dragon's Breath Shell (beam, fire); 13. Bullet Hell (proj, phys); 14. Rail Gun (beam, light); 15. Explosive Rounds (proj, fire); 16. Deadeye (buff, phys); 17. Death Laser (beam, fire); 18. Minigun Fury (proj, phys); 19. Orbital Strike (strike, fire); 20. Hand Cannon (proj, fire)

**Explosives:** 1. Grenade (proj, fire); 2. Landmine (trap, fire); 3. Flashbang (curse, holy); 4. Smoke Grenade (curse, shadow); 5. Cluster Bomb (proj, fire); 6. Napalm (zone, fire); 7. Frag Grenade (proj, phys); 8. Sticky Bomb (proj, fire); 9. Rocket (proj, fire); 10. Mine Field (trap, fire); 11. Firebomb Barrage (proj, fire); 12. Shrapnel Nova (nova, phys); 13. Rocket Barrage (proj, fire); 14. Carpet Bomb (fissure, fire); 15. Nitro Charge (aoe, fire); 16. Cryo Grenade (proj, cold); 17. Nuke (aoe, fire); 18. Airstrike (rain, fire); 19. Chain Reaction (trap, fire); 20. Mega Rocket (proj, fire)

**Engineering:** 1. Gun Turret (summon, phys); 2. Repair Kit (heal, phys); 3. Bear Trap (trap, phys); 4. Scrap Shield (buff, phys); 5. Flame Turret (summon, fire); 6. Drone (summon, light); 7. Tesla Coil (summon, light); 8. Overclock (buff, light); 9. Rocket Turret (summon, fire); 10. Shield Generator (zone, arcane); 11. Combat Drones (summon, phys); 12. Laser Fence (wall, light); 13. Mech Suit (buff, phys); 14. Cryo Turret (summon, cold); 15. Gravity Mine (trap, arcane); 16. Bomb Drones (summon, fire); 17. Death Machine (summon, fire); 18. Satellite Laser (beam, light); 19. Turret Fortress (summon, phys); 20. Overdrive (buff, light)
