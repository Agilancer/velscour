# Dungeon walls: how they are built

The original renderer stretched each whole wall sprite from the catacomb wall sheet over one tile edge.
Each sprite is a self-contained panel: a curved coping that rises to an end post with a finial, and a
ledge with cut ends. Laid edge to edge, they read as a picket of separate tombstones with jagged tops
and gaps between posts. The walls are now built the way Diablo II's are: from **seamless sections**
that join into one unbroken run, with posts only at corners.

## Pipeline (`tools/process_assets.py`, `build_wall_strips`)
Every "/" panel on a wall sheet shares one layout (all 10 sets use the same template). In "unsheared"
space (each column shifted so the ledge's front edge is horizontal), a panel is, top to bottom: coping,
molding, decorated niche ("body"), base molding + ledge. Two stone frames run up its sides.
`wall_layout` measures each panel: coping top, floor line and ledge front. Sand drifts, vines and snow
make single measurements noisy, so the floor line is the median of three estimates. If the base is too
ragged to fit, the template slope is used. `build_wall_strips` then derives the proportions **per
sheet** from the median panel: strip width (46-56 px), body height (about 63% of the face) and ledge
depth. It drops panels that don't fit, and bodies with see-through holes:
- **body**: the niche between the frames, one strip wide, so strip joints always land on stone frames.
  Brightness is evened out across pieces.
- **cap** (shared): a flat run of coping from the "tall" panel whose coping is flattest, with the curve
  flattened column by column and repeated twice, so it is identical and seamless on every section.
- **ledge** (shared): the base molding + ledge from the panel with the straightest ledge front, wrapped by
  one bay so it has no cut ends.

Each part is re-sheared to an exact 2:1 slope and written to the walls atlas as `wall_body`,
`wall_cap` and `wall_ledge` entries (`rows` = unsheared height). Regenerate with
`python3 tools/process_assets.py tiles`. The same run also fixed holes in the art: the keyer used to
delete every white pixel, including skull highlights. Now it only deletes large white areas (the
label box, pasted white blocks).

## Game
- `composeWalls` in `src/core/assets.js` stacks ledge + `WALL_TIERS` (2) bodies + cap into 24 random
  "/" sections per biome tileset (after the biome recolour). `base` is the row where the face meets the
  floor at the section's left column.
- `TileMap.buildWalls` (`src/world/map.js`) gives every floor/void edge a section; "\" edges use the
  mirrored image (`flip`). The widest `pillar` sprite (the two-tier skull post) goes on every vertex where
  "/" and "\" walls meet, which hides the corner joins.
- `segRect`/`drawSeg` in `src/game/render.js` draw a section exactly one tile edge wide (`HW`), with the
  face base on the edge line. The ledge sits on the floor side. Walls in front of the hero fade with
  screen distance and depth (`cutaway`), which makes a soft see-through hole instead of hard rectangles.
- The old whole-piece path (`segFwd`/`segBack`, `WALL_K`) is kept as a fallback for tilesets with no strips.

Check it visually with `node tools/tests/walls.js [prefix] [biome,...]` (`ZOOM=3` for a close-up).

## Supplying a new wall/floor art pack
The pipeline works best when the art follows these rules (the closer, the less custom slicing):
- Floors: 2:1 isometric diamonds (for example 192×96 or 160×80), all the same size, on a flat
  magenta (#FF00FF) or transparent background.
- Walls: **tileable wall sections**, each exactly one tile edge long, in at least the "/" direction ("\"
  can be mirrored). The base sits on an exact 2:1 line, and the top is a straight, constant-height edge.
  **No end posts or finials baked in.**
- Corner posts or pillars as separate sprites. Optional extras: doorways, broken or variant sections,
  torches or sconces.
- Several variants per section type, all the same height, so runs don't repeat visibly.

If a pack instead has self-contained panels like the current sheet, `build_wall_strips` shows how to cut them
into tileable parts. If a new layout differs, adjust `wall_layout`, `TEMPLATE_SLOPE` and `CAP_FRAC`. See also
[`ART.md`](ART.md) for floors, scatter terrain and barricades.
