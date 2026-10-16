# Four-angle wall hangings

The wall-hanging catalog adds **50 distinct décor designs**, with **four authored views per design** (200 frames). Five transparent atlases live in `assets/fx/wall_hangings/`; their source sheets and the standalone fiftieth item live in `assets/source/biome-variants/`. The manifest is the authoritative item, atlas, frame, pivot, and direction index.

## Isometric view contract

Atlas columns follow the existing wall-torch contract in `src/gfx/walltorches.js`:

| Column | Wall axis | Side |
|---:|---|---|
| 0 | `f` (constant X) | back / interior-facing |
| 1 | `b` (constant Y) | back / interior-facing |
| 2 | `b` (constant Y) | front-facing |
| 3 | `f` (constant X) | front-facing |

The renderer selects a column from the wall segment's actual `dir` and `front` values through `wallHangingAngle`. It draws the authored view as-is; it never mirrors or rotates a flat sprite to fake another wall axis. Dungeon wall segments and the outward facades of Herrington Hollow and Forsaken Wilds buildings use the same lookup.

## Art and runtime

The motifs include heraldic plaques, maps, masks, reliquaries, tools, trophies, shrine pieces, banners, mechanical curios, and small devotional or alchemical displays. The source images were generated as isolated rows and reduced to 96×96 transparent cells with nearest-neighbor sampling. Runtime display is 42×42 screen-space pixels and a light biome hue shift coordinates the shared hand-painted art with each dungeon or outdoor palette. The items add no collision or light sources.

`src/world/dungeon.js` places sparse decorations on actual wall segments while avoiding torch mounts. `src/world/town.js` and `src/world/overworld.js` attach a selection to building facades. `src/game/render.js` depth-sorts and cuts them away with the wall or building they occupy. All 50 designs remain available in every biome.

Rebuild the atlas after changing source sheets:

```bash
python tools/build_wall_hangings.py
```

## Source documentation reviewed

Asset contracts and biome coverage were checked against `docs/ART.md`, `docs/WORLD_BIOME_OVERHAUL.md`, `docs/OVERWORLD.md`, `docs/APPROVED_BIOME_ART.md`, `docs/BIOME_VARIANT_ART.md`, `docs/WALL_TORCH_HOLDERS.md`, and the Overworld/Town pack's `README.md`, `grid_spec.json`, and `CREATE_NEXT_BIOME.md`.
