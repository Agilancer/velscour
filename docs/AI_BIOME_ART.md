
The morning biome additions were PRs **#49–#53**: Desert Temple, Ice Temple,
HELL, ASTRAL PLANE, and HEAVENLY. Their original art notes describe the
settings below. The replacement atlases are distinct generated illustrations
for those settings, not palette variants of one shared biome sheet.
Five separate low-resolution architecture materials are also generated from a
distinct panel for each setting and composited into the biome's wall, arch,
and door silhouettes.

| Biome | Distinct setting used for the atlas |
|---|---|
| Desert Temple | Buried Sunless Dynasty tombs, lapis mosaics, jackal guardians, canopic urns, scarab seals, cracked royal sarcophagi, and sand-filled vents |
| Ice Temple | Abandoned glacial palace, blue-black mirror ice, aurora runes, frozen reliquaries, crystal growths, winter braziers, and sealed tombs |
| HELL | Infernal fortress around a burning chasm, black iron, bone chapels, blood flagstone, chains, soul cages, sacrificial altars, and sulfur vents |
| ASTRAL PLANE | Shattered celestial domain, floating midnight masonry, constellation charts, prismatic aether, collapsed stargates, orbiting fragments, and world shards |
| HEAVENLY | Suspended pearl-marble citadel, cloudstone nave, opal and lapis inlays, broken angel statuary, sun altars, halo mechanisms, and luminous fountains |

## Compact atlas contract

`assets/tiles/ai_biomes/<biome>.webp` is a transparent **512 × 512** sheet
with an 8 × 8 grid of 64 px cells. The top four rows hold 32 isometric floor
motifs (64 × 32 artwork centered in each cell); the bottom four rows hold 32
terrain props. The loader scales them with nearest-neighbor sampling into the
existing 160 × 80 floor and 160 × 160 scatter cells. Additional metadata cells
reuse those distinct biome motifs while retaining their original names,
pivots, collision footprints, and indices.

`assets/tiles/ai_biomes/heavenly_monsters.webp` is another transparent
512 × 512, 8 × 8 atlas. Its first 60 cells replace the 60 Heavenly enemy
images while preserving each enemy's existing 160 × 186 canvas, foot anchor,
IDs, hit flash, corpse shading, and recolor behavior. Attack and ability
animation logic is unchanged.

`assets/tiles/ai_biomes/<biome>_architecture.webp` is a 128 × 128 generated
material texture per biome. The renderer tiles it over architecture with
source-atop compositing, so artwork stays within the existing wall, arch, and
door pixels while each setting gains its own carved motif and surface detail.

`tools/build_ai_biome_atlases.py` converts the generated grids to compact
lossless WebP using nearest-neighbor downsampling. The generator emits
transparent sprite atlases; it does not make gameplay screenshots or large
background images. The runtime keeps the original wall, arch, and door
geometry metadata and depth slices for reliable occlusion and opening states.
Pass the five-panel source image with `--architecture-source` to rebuild the
architecture material textures.

## Generation prompt set

- **Desert Temple:** “Temple of the Sunless Dynasty; sandstone and terracotta tombs, lapis mosaics, ankhs, solar disks, jackal guardians, canopic urns, scarab seals, and royal sarcophagi.”
- **Ice Temple:** “Palace of the Everfrost; abandoned glacial halls, blue-black mirror ice, aurora runes, frozen reliquaries, crystals, winter braziers, and sealed tombs.”
- **HELL:** “Infernal Dominion; black-iron fortress, bone cathedral fragments, blood flagstone, chains, soul cages, demon statues, sacrificial altars, lava vents, sulfur, and soulfire.”
- **ASTRAL PLANE:** “Celestial Expanse; shattered floating masonry, star charts, prismatic aether, amethyst colonnades, collapsed stargates, orbiting fragments, and world-shard relics.”
- **HEAVENLY:** “Empyrean Citadel; suspended pearl-marble nave, cloudstone, opal and lapis inlays, broken angel statues, sun altars, halo mechanisms, luminous fountains, and sacred relics.”
- **Heavenly monsters:** “Sixty distinct foot-anchored VELSCOUR enemies across seraph, cherub, ophanim, warden, herald, templar, beast, griffin, luminary, judgement, oracle, and throne families; grim sacred silhouettes, broken halos, pearl armor, sun-metal, no palette-only duplicates.”

All image generation used the built-in image generator. The original prompt also
requested transparent backgrounds, separated grid cells, crisp low-resolution
pixel clusters, and no text or watermarks.
