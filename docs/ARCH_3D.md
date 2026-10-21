# Dungeon arches as 3D models

Every dungeon arch (Catacombs, Cathedral and Graveyard, Sewers, Castle Keep: 15 designs) is a 3D model built from its
own painted art, rendered once in three.js from the game's iso camera, and sliced into the same half-tile depth slices
the game always drew. The game never loads three.js: it draws baked sprites, so the models cost nothing at runtime.

```bash
python tools/arch3d.py extract <pack> [design ...]   # elevations + depth map (uses parts.json)
node tools/arch3d_bake.js <pack> [design,...] [--review]   # four iso views + slice tags (needs the server + jsDelivr)
python tools/biomepack.py <pack>                      # slices the bakes into assets/tiles/<pack>/
node tools/tests/arch3d.js [biome] [design]           # the arch in a live dungeon, hero in front / under / behind
```
`tools/arch3d.html?pack=cathedral_graveyard&design=chapel_lancet` is an orbit viewer (`&iso=SE` shows the bake).

## How a model is made
1. **Elevations.** A pack arch is one flat elevation extruded 0.2 tile and reprojected four ways, so the front art comes
   back exactly from the SE sprite and the reverse art from the NW sprite (un-sheared, 80 px per tile). The extrusion
   smear is detected (runs repeating along the projection) and dropped.
2. **Parts.** `assets/source/arches3d/<pack>/<design>/parts.json` describes the arch as architecture in elevation
   pixels: piers and buttresses (`fill`), clustered round shafts (`add`), archivolts and jambs splaying into the
   opening or rings of voussoirs (`portal`), square towers, gablets and spires that taper to pyramids (`square`),
   crockets as knobs (`knobs`), and finial crosses that stay thin (`thin`). Each part adds the painted shading as relief.
   The docstring of `tools/arch3d.py` lists every option. Castle Keep's arches are recoloured Catacombs/Cathedral
   arches and reuse their parts.
3. **Mesh** (`tools/arch3d.html`). Every pixel is a solid column from its front depth to its back depth. Neighbours
   within 2 px share corners (slopes, so shafts shade round); bigger jumps become vertical step walls. Side walls take
   the art wrapped round from their face, repeating the outer 12 px (a side shows more of the same shafts), steadied
   along the edge so it doesn't jump row to row; upward faces take a softened copy (plain weathered stone). Walls are
   shaded with the blurred height field's contour normal, so stepped diagonals light as one slope.
4. **Bake.** Orthographic camera 30 degrees down at 45 degrees (exactly the 2:1 grid), heights x1.6 (`ZSCALE`), light
   fixed to the camera from the upper left, shadow-mapped, 4x4 supersampled, binary alpha. A second pass writes each
   pixel's half-tile slice along the span; `biomepack.py` uses the bakes wherever they exist.

## Limits
- The deepest parts stand about 0.4 tile proud of the wall line (piers, plinths), so a hero hugging a pier can sort
  slightly early against it.
- The bigger arches need bigger sprites: the Cathedral wall atlas is 2048 x 6315 (was 4463).
- A new arch design needs its `parts.json` written by looking at the gridded elevation; without one a generic relief is
  used, which is much flatter.
