# Lancer cloth banner: art kit

The Lancer's signature banner is a cloth simulation (`src/gfx/lancerbanner.js`). It is a 5 x 9 node verlet grid
pinned to the crossbar of a pole on his back. The banner trails behind him as he moves, flutters harder at full
Valor and unrolls as Valor fills. The game draws the grid as textured triangles, using your skin as the texture.

| File you paint | Size | In game | Drop it at |
|---|---|---|---|
| Banner skin | **48 x 96** px RGBA PNG (any 1:2 size also works) | 24 x 48 world px | `assets/fx/lancer/banner_skin.png` |
| Banner pole | **64 x 200** px RGBA PNG | 32 x 100 world px | `assets/fx/lancer/banner_pole.png` |

Both images use 2 texels per world px. At the default zoom, that is about 3 screen px per texel.

- `banner_skin_template.png` / `banner_pole_template.png` are the 1x paint templates. They are transparent and
  carry only the guides. Paint on a layer above them, then delete the guides before you export.
- `banner_skin_guide.png` (8x) and `banner_pole_guide.png` (4x) are the annotated sheets.
- `banner_*_example.png` are the stand-ins the game uses now.

## Skin
- **Alpha is the silhouette.** The mesh is a plain rectangle. Swallowtails, points, fringe and holes are just
  transparency.
- **Top 4 rows: the sleeve** that wraps the crossbar. Keep it opaque from edge to edge.
- **The mesh is 4 x 8 cells of 12 x 12 px.** Each cell bends as one flat piece. Fine detail reads best inside a
  cell.
- **Paint it flat-lit.** The game shades each cell from its angle to the light.
- **The back face is the same image mirrored and darker**, so nothing needs painting for it.
- **The banner unrolls with Valor.** At low Valor only the top part shows (18% at minimum), with a roll along the
  bottom. Keep the emblem in the upper half.

## Pole
- **The anchor is the bottom-centre pixel (x 31-32, y 199).** It sits on the shoulder mount, 26 world px above
  his feet.
- **The cloth hangs from the line at y 24, x 8-56.** Put the crossbar there. Its caps may run out to x 0-63.
- **The shaft is about 6 px wide around x 32.** The finial goes in y 0-17.
- **Paint the whole shaft.** The cloth covers it at rest, but the shaft shows whenever the banner is thrown back.

Rebuild the templates (this never overwrites your art): `python tools/lancer_banner_templates.py`.
Test: `node tools/tests/lancer_banner.js`.
