# Approved sprite-sheet replacements for five themed dungeons

The supplied three painted source sheets are now integrated as transparent,
game-scale WebP atlases in `assets/tiles/approved_biomes/`. These are
**user-supplied paintings**, not procedural placeholders.

| Atlas | Size | Layout | Subject |
| --- | --- | --- | --- |
| `floors.webp` | 640 × 200 | 8 columns × 5 rows, 80 × 40 cells | 40 isometric floor diamonds |
| `props.webp` | 640 × 400 | 8 columns × 5 rows, 80 × 80 cells | 40 isometric pillars, braziers, coffins, banners, urns, statues and altars |
| `heavenly_monsters.webp` | 480 × 450 | 4 columns × 3 rows, 120 × 150 cells | 12 original celestial enemies |

The floor/prop row mapping, in the exact order of the supplied artwork:

| Sheet row (0-based) | VELSCOUR biome | Theme |
| --- | --- | --- |
| 0 | `desert_temple` | Sandstone, lapis and Egyptian-style gold |
| 1 | `ice_temple` | Icy slate, frost blue, snow and silver |
| 2 | `hell` | Volcanic black stone, red iron and fire |
| 3 | `astral_plane` | Dark blue cosmos, moons, stars and gold |
| 4 | `heavenly` | White marble, pale blue and bright gold |

## Renderer integration

`src/gfx/approvedbiomeart.js` lazily decodes the three shared atlases.
`src/core/assets.js` applies them **at pack generation time**, not with
per-frame texture processing.

For each of the five themed generated packs:

- Existing 160 × 80 floor atlas cells **10–17** receive the eight paintings.
  The first ten seamless bases are untouched so maze floors still repeat.
- Eight semantically matched native 160 × 160 scatter cells receive
  the eight transparent painted props (obelisk, brazier, sarcophagus,
  column, banner, urn, statue and altar). The destination indexes differ
  per biome to preserve each existing named object's footprint and
  collision rule. The exact per-biome lookup lives in
  `NATIVE_PROP_INDICES` within `src/gfx/approvedbiomeart.js`.
- Desktop builds that generate the additional 60-floor/40-prop expansion
  also replace **eight appended decorative floors** (expansion start +10)
  and **eight appended props** (expansion scatter start +0), so the newer
  procedural placeholders are directly replaced.
- Low-memory touch/mobile builds use the approved **native pack** without
  duplicating huge expansion wall canvases.
- Sprite metadata, tile indices, material family names, wall slices,
  doorway masks, pivots, object collision/footprints and dungeon logic
  are preserved exactly. The loaded pack receives
  `meta.approvedArt={row,floorStart,propStart,propIndices,floorCount,propCount}`
  for inspection.

If an atlas is missing, existing generated art remains as the fallback.
Only loaded sheets are painted, and no unrelated biome is changed.

## Celestial monsters

The twelve paintings are assigned one-to-one to the **first variant** of
each existing `hv_` family in `src/data/heavenly.js`:

| Sprite index | Existing ID | Appearance |
| ---: | --- | --- |
| 0 | `hv_seraph_1` | Winged sword-bearing seraph |
| 1 | `hv_cherub_1` | Multi-faced celestial |
| 2 | `hv_ophanim_1` | Eye-covered orbital wheels |
| 3 | `hv_warden_1` | Massive marble-armored guardian |
| 4 | `hv_herald_1` | Winged trumpet herald |
| 5 | `hv_templar_1` | Spear-and-shield holy knight |
| 6 | `hv_beast_1` | White winged lion |
| 7 | `hv_griffin_1` | Eagle-lion griffin |
| 8 | `hv_luminary_1` | Luminous blue soul |
| 9 | `hv_judgement_1` | Many-armed armored executor |
| 10 | `hv_oracle_1` | Angelic archer |
| 11 | `hv_throne_1` | Golden celestial sovereign |

The original unique looks of variants **#2–#5** are unchanged. The 12
sprites render at 160 × 186 with `_art.fx=80`, preserving feet anchors,
hit flash, corpse mode, palette swaps, ranks, AI and existing IDs. Art
loading clears only the Heavenly procedural image cache, so a sprite
generated before the approved atlas loads cannot remain stale.

## Regression testing

From the repository root:

```bash
python3 -m http.server 8123
node tools/tests/approved_biome_art.js
node tools/tests/heavenly.js
node tools/tests/worldwide_biomes.js
node tools/tests/data_check.mjs
node tools/tests/mobile.js
```

The new dedicated browser test verifies eight imported floor and prop
slots for each of the five biomes, distinct/nonempty pixels, all twelve
mapped monster IDs, a retained procedural rank-two variant, and captures
`tools/tests/out/approved_biome_floor_props.png` plus a Heavenly gameplay
screenshot. Check real Safari in landscape for alpha edges, palette
consistency, sprite size, collision and performance.

**Verification status:** the input atlas dimensions, transparency and
binary Git blob hashes were verified. Code syntax checks and remote
commit checks do **not** constitute a completed Chromium/iOS screenshot
or gameplay QA run; review this PR before merging.
