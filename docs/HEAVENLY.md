# HEAVENLY — The Empyrean Citadel

## What this adds to VELSCOUR

**HEAVENLY** is a distinct, randomly selected, **indoor dungeon**. It has
sunlit marble halls, pearl-and-opal flooring, golden arches, radiant reliefs,
luminous cloudstone chapels, marble angel statues, and a roster of **60 new
named monsters with 60 real generated 2D sprites**. It does not replace
Desecrated Cathedral, ASTRAL PLANE, HELL, Ice Temple, or the Depth 500 throne.

The normal dungeon engine supplies maze rooms/corridors, guardian bosses,
chests, the town-return and exit portals, XP/loot, player character rendering,
class gear and all usual melee/ranged/caster/charger combat. Completing its
guardian opens the exit as usual. The already-implemented six-dungeon
Forsaken Wilds visit counter counts HEAVENLY as a non-overworld dungeon.

### Graphics: an editable, game-compatible source pipeline

`src/gfx/heavenlypack.js` lazily generates the following ordinary
`{floors,walls,scatter,meta}` pack:

| Graphics | Count | Main features |
|---|---|---|
| Ground | **60** native **160×80** tile sprites; 10 repeatable floor bases | Pearly flagstones, blue cloudstone, rose quartz, opal mosaic, golden sun paving, filigree, sunbursts, runes and marble fractures |
| Structural walls | **5 families × 16 connection masks = 80 combinations** | Pearl Basilica, Celestial Cloister (blue marble), Sunstone Bastion (golden stone), Opal Sanctuary (purple/rose pearlescence), Golden Firmament |
| Directional arches | **3 × four directions** | Radiant Nave, Sunburst Triumph, Pearly Stargate |
| Opening gates | **3 × four directions × open/closed** | Gates of Grace, Ivory Covenant, Dawn Seal |
| Decorative and obstructing props | **40 independent named sprites**, each in a **160×160** cell | Sunstone columns, 2 angel statue designs, divine flames and fonts, shrines, sacred instruments, altars, sarcophagi, cloudstone, ruins, banners, offering objects, heavenly chest |
| New monster graphics | **60 distinct names and image designs**, 12 families × 5 variants | Seraphs, cherubs, golden wheels covered in eyes, alabaster wardens, heralds, templars, sacred beasts, griffins, elementals, judgement avatars, oracles and throne powers |

The floor and scatter sprites are painted algorithmically from original
Canvas pixel geometry. The structural wall image uses the **existing
Catacombs alpha and per-arm depth-slice silhouette ONLY**; it assigns
**five separate material palettes to the actual corresponding wall-family
atlas crops**, and adds pearly and golden relief details. This preserves
the original screen-space pivots and animation slices for the directional
arched gates, wall cutaway, collision and character occlusion.

These graphics are **procedurally drawn assets**, *not* 60 handcrafted
paintings of monsters or a newly modeled 3D skeletal rig. Monstrous attack,
walk, cast, hurt, death and corpse presentation continue to use the
game's current creature renderer, bobbing/flip, hit flash and combat
animation system. Artists can replace individual procedural images later
without needing to redesign the combat contracts.

### All sixty named monsters

The 60 enemies live in `src/data/heavenly.js`, with independent
Canvas image recipes in `src/gfx/heavenlymonsters.js`.

| Visual family | Five original enemies |
|---|---|
| Seraphic Legion | Dawnfeather Seraph · Ashenwing Seraph · Duskstar Seraph · Vowbound Seraph · Seraph of the Seventh Dawn |
| Cherubic Choir | Vesper Cherub · Ivory Cherub · Lamenting Cherub · Radiant Cherub · Choir Prince of Luminance |
| Ophanim Wheels | Golden Ophanim · Iris-Wheel Ophanim · Seven-Eyed Ophanim · Eclipse Ophanim · Thronewheel of Judgement |
| Marble Wardens | Marble Warden · Lapis Warden · Sunstone Warden · Winged Reliquary · Colossus of the Pearly Gate |
| Solar Heralds | Trumpet Herald · Censer Herald · Scripture Herald · Sunburst Herald · Archherald of the Final Hymn |
| Gilded Templars | Cloudsteel Templar · Halo Lancer · Sanctum Justiciar · Solar Shieldmaiden · High Palatine of the Firmament |
| Heavenly Beasts | Ivory Cloudhound · Golden Shrine Lion · Starlit Kirin · Pearl Mane Guardian · Regal Lion of the Dawn |
| Celestial Griffins | Silverwake Griffin · Cobalt Sky Griffin · Solar Gryphon · Opaline Wingbeast · Royal Griffin of the Zenith |
| Luminaries | Mote of Creation · Living Dawnfire · Azure Aetherborn · Prism Incarnate · Prime Luminary |
| Judgement Avatars | Hand of Penance · Many-Armed Exactor · Scourge of Truth · Executioner of Oaths · Avatar of Final Judgement |
| Oracle Scribes | Pale Oracle · Lapis Diviner · Glasswing Seer · Golden Bow Prophet · Star-Eyed Archon |
| Throne Powers | Pillar of Providence · Exalted Dominion · Virtue Ascendant · Crown of Six Suns · Sovereign of the First Light |

Each family has a separate bodily silhouette drawing function; within a
family each variant changes proportions, weapon/ornament shapes, headgear,
palette, insignia and halo arrangements. The fifth variant is deliberately
reserved for the biome's guardian/boss pool. **48** of the monsters can
appear in normal packs and **12** are possible guardians, guaranteeing
that these original designs remain available alongside newly added natives and existing global monster looks.

The `BESTIARY` registers each generated ID (`hv_<family>_<1..5>`)
under `sheet: 'heavenly/generated'`; it is intentionally excluded from
the static `enemies.json`/ZIP source importer. The current monster renderer
requests `enemyImage(id,swap,mode)`, which now recognizes `hv_` IDs
and returns real transparent Canvas art with `_art.fx=80` on a
**160×186** foot-anchored frame. Hit-flash and corpse variants work.
The LRU cache is bounded to avoid escalating memory consumption on iOS.

Monster physics and AI reuse the battle-tested existing ARCH controllers,
rather than adding 60 untested AI classes. Their specific stats, holy
resistance, rank modifiers, magical range, flying behavior, boss names and
visuals vary. The whole roster inherits normal leveling, elite affixes,
drop tables and status effects.

`rollLooks` explicitly confines the 60 generated designs to HEAVENLY:
normal dungeon biomes keep their original painted monster lineups and
HEAVENLY's archetypes can now choose `hv_` originals, one of 50 new native looks, an existing global monster or a rare visitor. Five palette finishes
are available per level, while the originals are preserved when matching
the holy element.

### Files changed

- `src/data/heavenly.js` — 60 monsters, 12 family definitions and IDs
- `src/gfx/heavenlymonsters.js` — all 60 unique image recipes
- `src/gfx/heavenlypack.js` — 60 floor tiles, 5 wall materials, 40 props, gates/arches
- `src/data/bestiary.js` — registration and Heavenly-only look/boss filtering
- `src/core/enemyart.js` — real generated sprite routing and no bogus remote sheet fetch
- `src/game/monster.js` — family/variant battle tuning and named Heavenly guardians
- `src/core/assets.js` — lazy cached generated environment pack
- `src/data/biomes.js` — biome, roster and selection pool
- `src/world/dungeon.js` — holy lamp/light radii
- `src/core/audio.js` — existing valid sanctuary/stream/waterfall ambience assets
- `tools/tests/data_check.mjs` — recognize and validate generated art IDs and pack
- `tools/tests/heavenly.js` — image uniqueness, real dungeon/browser QA and atlas export

### QA and game-ready export

From a repository checkout, with the root being served over HTTP:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/heavenly.js
node tools/tests/pack.js heavenly
node tools/tests/walls.js heavenly heavenly
node tools/tests/enemies.js heavenly
node tools/tests/flow.js
node tools/tests/mobile.js
```

The dedicated browser test checks all 60 rendered monster IDs for a unique
pixel hash, nonempty opaque pixels, stable 160×186 frame/pivot, hit/flash
and corpse modes, palette swaps, weighted Heavenly/global/visitor spawning, 12 generated
dungeons, and 50 simulated 80-depth shuffle runs. It also validates
the floor/prop/door/arch/wall metadata.

On successful execution it writes:

```
tools/tests/out/heavenly_gameplay.png
tools/tests/out/heavenly_60_monsters.png
tools/tests/out/heavenly_terrain_contact.png
tools/tests/out/heavenly_export/floors.webp
tools/tests/out/heavenly_export/walls.webp
tools/tests/out/heavenly_export/scatter.webp
tools/tests/out/heavenly_export/pack.json
tools/tests/out/heavenly_export/monsters.webp
tools/tests/out/heavenly_export/monsters.json
```

The monster export is an organized 10×6 atlas of all 60 sprites with
individual names, IDs, family/variant metadata, cell coordinates and
foot anchors; these files can be passed to another developer or artist.
They are generated test output files, not independently committed
hand-painted raster art.

**Status:** source syntax, synthetic graphic generation, bestiary
registration and randomized selection were tested in the connected
GitHub session. Browser-rendering and mobile Safari performance, wall
cutaway, actual character overlap, and appearance should be visually
reviewed before merging the draft PR into main.

## Worldwide expansion compatibility

In the later `feature/worldwide-biome-art-and-spawns` overhaul, the original
60 unique Heavenly sprites and artwork remain unchanged and available.
The Empyrean Citadel additionally receives 60 new floor cells (120 total),
40 additional props (80 total), unique updated wall materials and **50 new
biome-native monster designs** with normal/global/rare-visitor spawning.
The existing 60-sprite art export in this document still exports the original
canonical collection; `node tools/tests/worldwide_biomes.js` verifies the
new native set and full combined environment pack. See
[WORLD_BIOME_OVERHAUL.md](WORLD_BIOME_OVERHAUL.md).
