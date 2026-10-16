# Low-resolution biome art variants

This pass adds a compact, transparent 400 × 240 WebP atlas at
`assets/tiles/approved_biomes/velscour_variants.webp`. Its source PNG and
reading-order catalog are kept in `assets/source/biome-variants/`.

The atlas uses a 5-column × 3-row grid of 80 × 80 pixel cells:

| Row | Columns, left to right | Runtime use |
|---|---|---|
| 0 | Desert Temple, Ice Temple, Hell, Astral Plane, Heavenly | One additional 2:1 floor accent per biome |
| 1 | Obelisk, sarcophagus fragment, brazier, rune stones, urn | One additional scatter design per biome |
| 2 | Ash, cedar, bent pine, dead oak, birch | Five additional Forsaken Wilds tree designs |

`src/gfx/approvedbiomeart.js` loads the atlas once, paints the five biome
variants into spare non-seamless floor/prop cells, and exposes the five
tree cells to `src/gfx/overworldart.js`. The imported cells use the existing
160 × 80 floor and 160 × 160 scatter contracts. Tree crops stay 80 × 80 and
render at nearest-neighbor 2× scale. Existing approved floor and prop sheets,
wall geometry, cell indices, pivots and collision metadata remain intact.

This is a small native-resolution extension to the existing environmental
art. The other generated biome accents and Forsaken Wilds scatter designs
remain available and unchanged; no UI sprites, combat effects, ability
animations or character animation frames are part of this pass.
