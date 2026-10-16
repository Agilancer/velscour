# Forsaken Wilds scatter art

The 20 static Forsaken Wilds scatter objects now use the compact transparent atlas at
`assets/tiles/approved_biomes/velscour_overworld_scatter.webp`. Its source PNG and
reading-order catalog are in `assets/source/overworld-scatter/`.

The runtime sheet is 400 × 320 pixels: 5 columns × 4 rows of 80 × 80 cells. The
mapping follows `EXTRA_SCATTER` order in `src/gfx/overworldart.js`. It includes
ruins, flowers, fungus, campsite debris, bones, relics and a chest. The loader
preloads the sheet with the other world art, and `approvedOverworldScatter` returns
each crop through the existing sprite contract. Existing names, placement,
nonblocking collision behavior and world scale are preserved.

The built-in image generator made a transparent, chunky pixel-art source atlas in
the style of the existing VELSCOUR biome sprite art. Both committed images are
400 × 320; nearest-neighbor sampling preserves the chunky pixels. No UI,
combat VFX or character animation assets are included.
