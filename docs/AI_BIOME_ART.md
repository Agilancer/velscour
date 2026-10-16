
The replacement atlases cover the 23 dungeon biomes that previously reused
the same base art with palette swaps, in addition to the original five
generated biome atlases. Every newly covered setting has its own generated
floor, terrain prop, and architecture material art. The original five
generated dungeon packs retain their existing dedicated atlases.

| Biome | Distinct setting used for the atlas |
|---|---|
| Frozen Ossuary | Glacial bone crypts, frostbound sarcophagi, blue ice, and frozen relics |
| Molten Depths | Basalt chambers, magma channels, iron furnaces, and ember shrines |
| Fungal Grotto | Mycelial caverns, luminous mushrooms, spore pools, and tangled roots |
| Sunken Crypt | Flooded tombs, drowned masonry, barnacles, and bioluminescent growth |
| Halls of Blood | Crimson sanctums, bloodstone floors, ritual vessels, and gore-carved masonry |
| Ashen Wastes | Charred halls, ash drifts, burned relics, and soot-dark stone |
| Void Sanctum | Starless vaults, fractured voidstone, spectral runes, and drifting fragments |
| Gilded Tomb | Golden burial halls, lacquered coffers, sun disks, and royal statuary |
| Plague Sewers | Foul drainage tunnels, diseased growth, corroded grates, and toxic pools |
| Crystal Caverns | Prismatic geodes, crystal bridges, mineral growths, and shard formations |
| Bone Desert Tombs | Sand-buried sepulchers, bone markers, sandstone, and buried relics |
| Shadow Labyrinth | Umbral corridors, dark arches, occult marks, and low-lit stone |
| Infernal Forge | Hellforged foundry chambers, anvils, chains, furnaces, and slag |
| Abyssal Rift | Deep chasms, alien stone, rift fragments, and cold blue fissures |
| Thornwood Barrow | Root-choked barrows, brambles, weathered standing stones, and moss |
| Storm Spire | Lightning-struck towers, charged crystals, storm runes, and fractured masonry |
| Obsidian Vault | Polished volcanic glass, black stone, reflective shards, and dark metal |
| Flesh Pits | Visceral chambers, organic growth, sinew-bound structures, and living stone |
| Serpent Sepulcher | Coiled tomb halls, scale mosaics, serpent idols, and desert stone |
| Shattered Citadel | Ruined fortifications, broken arches, fallen masonry, and faded heraldry |
| Haunted Library | Forbidden stacks, arcane lecterns, scattered tomes, and haunted fixtures |
| Moonlit Necropolis | Silvered mausoleums, moonlit grave markers, blue stone, and pale relics |
| Amber Wastes | Resinous tombs, amber deposits, fossil inclusions, and sunbaked stone |

## Original generated dungeon atlases

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

`assets/tiles/ai_biomes/<biome>_wall_materials.webp` is a **1280 × 128** strip
with ten full-bleed, seamless **128 × 128** material tiles per biome. The ten
materials cover two surface variants for each of the Catacombs pack's five wall
families. The runtime assigns those variants by wall family and connection
mask, then textures the existing wall, arch, and door alpha silhouettes with
source-atop compositing. No black atlas background or frame is drawn around a
tile. The original **160 × 80 floor, 256 × 256 wall, 384 × 336 arch,
320 × 288 door, and 192 × 192 scatter canvases and pivots** remain unchanged.
The biome's generated architecture art is blended at 48% into each material,
so its stone, ornament and palette are visible while all ten authored masonry
motifs stay distinct. These are ten unique wall surface textures per biome;
they are painted onto the shared Catacombs wall silhouettes and geometry.

`tools/build_biome_wall_materials.py` rebuilds every wall-material strip from
`wall_materials_source.png` and that biome's `*_architecture.webp` detail map.
It edge-matches a 12 px band on each tile so all ten materials repeat without
dark border seams.

The renderer adds deterministic, scattered 2–4 world-pixel flecks along floor
edges where the material family changes. This applies to semantic floor names
in the dungeon atlases and named terrain classes in Sea of Sand and Castle.

`assets/tiles/approved_biomes/forsaken_wilds_supplemental.webp` contains ten
distinct 128 × 128 generated Forsaken Wilds tree sprites, five shrine designs,
and a caravan. These named props are loaded through the same ground-pivot
contract as the existing overworld art; collision and scenario placement stay
unchanged.

`tools/build_ai_biome_atlases.py` converts the generated floor/prop grids to compact
lossless WebP using nearest-neighbor downsampling. The generator emits
transparent sprite atlases; it does not make gameplay screenshots or large
background images. The runtime keeps the original Catacombs wall, arch, and
door geometry metadata and depth slices for reliable occlusion and opening
states.

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
