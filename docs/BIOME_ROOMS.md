# Biome identity: art mixes, layouts, themed rooms and scenarios

Every dungeon biome has its own art mix, its own level layout, 10-20 themed rooms and 20 optional scenarios.

## Art mixes (`ART` in `src/data/biomes.js`)

A biome takes floors and props from one pack (`pack`, narrowed by `part`), walls, arches and doors from another
(`wallPack`), and can borrow more floors (`moreFloors`), props (`morePacks`) and town furniture (`townProps`, e.g. the
Infernal Forge's anvils and bellows, the Haunted Library's scroll racks), all recoloured by the biome's `palette`
(`biomeTileSet` in `src/core/assets.js`). The Dark Forest pack builds the cave biomes underground: Fungal Grotto
(loam, moss and mushrooms in tangled roots), Flesh Pits (soil and roots recoloured to meat and sinew), Molten Depths,
Crystal Caverns and Abyssal Rift (shale, ash, mineral and pool floors in rough rock), Thornwood Barrow (forest floors
in thorn hedges with graves) and Ashen Wastes (ash and charred roots round broken keep brickwork and siege wreckage).
Void Sanctum paves Castle Keep marble inside sealed Catacombs chapels; Serpent Sepulcher has the Sewers' grotesque
relief walls; Plague Sewers is the Sewers pack in plague green.

**Castle Keep floors** (`tools/castlekeeppack.py`): the painted floors are 3D slabs. Only their top face is cut now
(it was the whole slab squashed into the diamond, so every tile showed a dark outline and the paving never joined),
and the ten paving tiles are made seamless (`seamless()`: unsheared to a square, rim cropped, edges blended with a
half-offset copy, sheared back). Feature tiles are cut from their own (steeper) diamonds.

## Layouts (`STYLES` in `src/world/dungeon.js`, the biome's `style`)

| style | biomes | character |
|---|---|---|
| crypt | Catacombs, Frozen, Sunken, Blood, Desert, Serpent, HELL | rooms and some caves, mostly 2-wide corridors |
| hall | Castle Keep, Ice Temple, Gilded, Forge, Storm, Cathedral, Desert Temple, Astral, Heavenly | big rooms (pillared, cross, cloister), 3-wide halls, loops |
| cave | Molten, Fungal, Crystal, Abyss, Flesh | mostly cave chambers, ragged wide passages |
| maze | Void, Shadow, Obsidian, Library | small rooms, narrow corridors, few loops |
| channel | Sewers, Plague | rooms on long 3-wide channels with many loops |
| ruin | Ashen, Thorn, Shattered, Necropolis, Amber | broken shapes, collapsed caves, ragged passages |

## Themed rooms (`src/data/biomerooms.js`)

`THEMES` holds 36 furnishing recipes (ossuary, nave, throne room, armory, barracks, treasury, cells, library, forge,
ritual circle, torture chamber, fungus grove, nest, cistern...). A recipe asks for props by tag (`TAGS`: regexes on
prop names, so a tag finds the right props in any pack; `'a|b'` falls back), places them by kind (`head` of the room,
`pairs` flanking it, `rows` with an aisle, an `aisle` colonnade, `walls`, `corners`, `ring`, `clutter`), strews
matching floor features (`floor`, `rate`) and lays a runner down the aisle (`runner`). `BIOME_ROOMS` gives each biome
10-14 themes under its own names ("Charnel Pit", "Rat King's Nest", "Hypostyle Hall"). Each level deals them from a
shuffled deck (`themeDeck`); a theme's `shapes` steer the room shape. The guardian's room gets only its walls and head.
The hero sees a room's name the first time they walk in.

## Scenarios (`src/game/scenarios.js`)

55% of dungeon depths (not boss rooms or the throne) host one optional scenario. Twenty mechanics are shared: relic
(three waves), captives, ritual circles, champion, hunt, hold the stone, shards and altar, rifts, vault levers,
slaughter against the clock, escort, fleeing courier, nests, idols that empower foes, bounty, darkness (relight the
braziers), trail of clues, defend the ward, mimics, and the herald (summon a boss for a Legendary). Each biome names its
own twenty and supplies the words (`BIOME_SCENARIOS`, `biomeScenario()`): "The Bone Reliquary", "Rat Nests",
"The Mad King Returns". Markers use the biome's own props. Every scenario pays two rare chests and a Set/Legendary
roll. The Quest Log shows its progress; auto-play joins in (markers are chests; `objective` for the timed ones).
`G.scenarioForce = i` forces mechanic `i` on the next level.

## Tests

- `node tools/tests/biome_scenarios.js [biomes] [noshots]`: every biome's levels use its own themes and every room is
  reachable; each of the twenty mechanics is forced and solved; marker screenshots.
- `node tools/tests/biome_looks.js [ids] [depth] [prefix]` (`SHOTS`, `ZOOM`, `LIGHT`): the biggest rooms of each biome
  with the lights up, named by theme, for art review.
