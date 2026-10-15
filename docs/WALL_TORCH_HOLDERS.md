# Wall-Mounted Torch Holder Artwork

The four user-supplied sprite sheets have been cut into **80 transparent,
individual directional views** of **20 original torch-holder designs**.
Each holder is intentionally **unlit**; the real existing dungeon flame,
ember and illumination systems remain responsible for the lighting.

## Assets and packing

| File | Designs | Directions | Frame dimensions | Atlas size |
| --- | ---: | ---: | --- | --- |
| `assets/fx/wall_torches/holders_1.webp` | 5 | 4 each | 96 × 96 | 384 × 480 |
| `assets/fx/wall_torches/holders_2.webp` | 5 | 4 each | 96 × 96 | 384 × 480 |
| `assets/fx/wall_torches/holders_3.webp` | 5 | 4 each | 96 × 96 | 384 × 480 |
| `assets/fx/wall_torches/holders_4.webp` | 5 | 4 each | 96 × 96 | 384 × 480 |

Each row is one design. The four column positions preserve the **authored
four different views** (no runtime horizontal mirror). The atlases have
transparent background pixels and are losslessly separated by cell even
though the stored WebP RGB compression is lossy, to reduce iOS downloads
and texture decoding overhead. All four atlases total roughly 472 KB.

The game draws a holder at only **40 × 40 world-screen pixels**, matching
the size of a small wall ornament instead of a freestanding brazier.
Its mount sits against the wall; its cup and flame project inward toward
the walkable tile. It does not add collision geometry.

## Runtime integration

- `src/world/dungeon.js` continues selecting the **same lit wall
  segments** and original spawn probabilities. `torchAtWallSegment`
  stores the true wall midpoint, wall axis, facing, sprite depth and the
  offset light/cup position. It does not place extra lights.
- `src/gfx/walltorches.js` assigns a deterministic, biome-specific
  design. It lazily decodes only the atlases needed for the current biome;
  the original global torch/room geometry remains unchanged.
- `src/game/render.js` culls offscreen holders and paints them in the
  same **depth-sorted wall/entity pass**, with the normal wall cutaway
  alpha so holders behind occluding walls fade with them.
- `src/game/world.js` keeps the original light and ember behavior but
  lifts the sparks to the holder's cup (`flameZ=60`).
- `src/gfx/vfx.js` accepts an optional **elevation** parameter for
  `addLight`. The light compositor uses that z-position for the actual
  light falloff, not just the visible particle. Other existing lights
  default to their original z=20.

### Authored direction lookup

| Sprite column | Wall axis | Face |
| ---: | --- | --- |
| 0 | `f` (constant X) | Back/interior-facing |
| 1 | `b` (constant Y) | Back/interior-facing |
| 2 | `b` (constant Y) | Front-facing |
| 3 | `f` (constant X) | Front-facing |

All four are supported by the renderer. The existing dungeon algorithm
places torches only on the two back/interior wall faces, as before.
Front-face cells remain available for explicitly placed torches or
future rooms with different wall-light placement; no new light sources
are silently added just to use all four directions.

## Biome choices

Every **indoor combat biome** receives material-appropriate designs.
The choices are in `TORCH_STYLES` in `src/gfx/walltorches.js`.

- **Catacombs, Necropolis, Library, Shattered:** blackiron,
  chained, gothic and skull motifs
- **Desert Temple, Desert, Gilded, Cathedral, Heavenly:** gilded
  ornamental, royal crest and radiant metallic designs
- **Ice Temple, Frozen, Storm, Crystal:** blue/gold and cold
  metallic fixtures
- **Hell, Molten, Blood, Ashen, Abyss, Obsidian, Flesh, Throne:**
  spiked, chained and demonic metal designs
- **Fungal, Thorn, Plague, Serpent:** organic, horn and root designs
- **Void, Astral Plane, Shadow:** dark and arcane blackiron variants
- Remaining indoor biomes use appropriate combinations of those
  approved families.

No change is made to town-mounted building flames or the Forsaken Wilds'
freestanding lanterns; their objects use a different ground-pivot system.

## Validation

```bash
python3 -m http.server 8123
node tools/tests/wall_torches.js
node tools/tests/data_check.mjs
node tools/tests/walls.js hell
node tools/tests/mobile.js
```

The new browser test confirms all 80 alpha-masked cells are nonempty,
all 4 isometric cup placements, biome mapping, dungeon wall-attachment
records and generated torch visibility. It exports
`tools/tests/out/wall_torches_80_views.png` plus a dungeon screenshot.

Source checks, atlas dimensions/hashes and synthetic geometry assertions
are helpful but **do not substitute for full Chromium/iOS Safari visual
inspection**, particularly the flame centering against different wall
textures and the hero/wall transparency cutaway.
