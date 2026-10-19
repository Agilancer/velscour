# Death Knight Runeblade: 3D model

The Death Knight's class signature sword (`src/game/sigs/deathknight.js`) is a real 3D model, drawn by
`src/gfx/runeblade3d.js`. It covers both:

- **The hovering sword** at his shoulder (about 42 world px from guard to point). It sways round its length, tilts a
  little toward the camera, and twirls once each time it takes a rune.
- **RUNIC OBLITERATION** (about 125 px), the same model scaled up. It is raised leaning away and turned, comes round
  flat to the camera as it falls through the target, then rolls and fades.

## Skins

There are five skins (`RUNEBLADE_SKINS` in `src/gfx/runeblade3d.js`): Reliquary Sliver (the default), Funeral Sash,
Frozen Sand Reliquary, Verdigris Weeper and Blank Epitaph.

- **By level, not a menu.** The look follows the Death Knight's level (`runebladeLook`):
  - **Every 10 levels**, the next of the five skins.
  - **Every 50 levels**, the next of six palettes (`RUNEBLADE_PALETTES`): Rime (the art as painted), Grave Jade,
    Wraith Violet, Blood Moon, Starless Silver and Gilded Oath.

  So levels 1–300 show all 30 looks once: 1–9 is a Rime Reliquary Sliver, and 290–300 a Gilded Oath Blank Epitaph.
  Nothing is saved: the look comes from `G.char.level`.
- **Reforging.** Crossing into a new band reforges the blade: it twirls and the game announces
  "Runeblade reforged: …".
- **How palettes work.** A palette is a colour matrix in the fragment shader: CSS-style hue-rotate (round the grey
  axis, so light and dark stay put) × saturate × brightness. It also sets the rim and halo glow while no rune is lit.
- **Loading.** Each skin loads on first use. Until it is ready, the old flat blade stands in.
- **Placeholder.** A `placeholder` skin (the built-in procedural sword) is not in the picker. It exists to test the
  sheet pipeline.

Gameplay is unchanged: rune gain, the six-rune trigger, the cone hit, freeze, plague and lifesteal all work as before.
The lit runes are still drawn in 2D, now at the slot positions projected from the visible face. They are sized from
the model's scale and fade as the blade turns edge-on.

## Source art

Each skin is `assets/fx/runeblade/runeblade3d_<skin>.png` (an atlas, 256 or 512 x 512) plus `.json` (the guide rows,
column centres, the six rune slot rows and the per-row profile). Both are generated; never edit them by hand.
The sources live in `assets/source/runeblade3d/`, and `python tools/runeblade3d.py skins` rebuilds every skin from
them. There are two kinds of source:

- **`<skin>.png`: a single front view** (one sword pointing down on magenta, any size with a 2:3 aspect), like the
  five ChatGPT concepts (`python tools/runeblade3d.py concept FRONT.png SKIN`):
  - **Back:** the front, mirrored.
  - **Thickness** (`synth_side`): the grip and pommel are round, up to 6 AP each side; the crossguard is 12 AP deep;
    the blade is about a fifth as thick as it is wide, thinning to the point.
  - **Rune slots:** the six sockets painted down the fuller. These are found as six separate dark shapes, or else as
    runs of near-black rows; a gem between five sockets fills the biggest gap. Either result is used only when the six
    are evenly spread, otherwise the slots fall back to the standard 14–74%.
- **`<skin>_sheet.png`: a three-view sheet** drawn on the kit template (`install SHEET.png SKIN`). It is described
  below.

The sheet is 1024 x 1536 on flat magenta, at 1 art pixel = 4 x 4 px, and holds three views of the sword pointing down:

- **FRONT** (centre x 232): the outline and the front colours.
- **SIDE** (x 512): the edge-on outline, which gives the thickness per row.
- **BACK** (x 792): the colours from behind, painted mirrored.

The guide rows are pommel top 112, crossguard centre 376 and point 1488. The rune slots are at 14–74% from the guard
to the point. The importer:

1. keys out magenta and the template's guide colours;
2. keeps each column's main shape;
3. rescales it to fit pommel..point and centres it on the blade axis;
4. snaps it to the art grid;
5. bleeds edge colours into the clear texels for mipmapping;
6. finds the guard as the widest row in the top 40%.

The built-in placeholder is painted procedurally by `python tools/runeblade3d.py placeholder`.

## The model (`buildMesh`)

- **Slabs.** Each art-pixel row is a slab as wide as its FRONT row and as thick as its SIDE row. Rows with an
  identical profile merge (the placeholder gives about 40 slabs and about 950 triangles).
- **Cross-section.** Six-sided: edge, bevel, flat, bevel, edge. Each bevel is 30% of the width, and at most 2.5 x the
  half-thickness.
- **Ledges and caps.** A change of profile between slabs becomes a flat ledge; the top and bottom get flat caps.
- **Texture.** Front-half faces sample FRONT, and back-half faces sample BACK un-mirrored. Clear texels are real holes
  (alpha discard).
- **Coordinates.** Model units are art pixels. The origin is the crossguard centre, +y runs toward the point, and +z
  points toward the viewer when the front faces him.

## Drawing (`drawRuneblade3D(ctx, x, y, a, len, { spin, tilt, glow, glowAmt })`)

- **Context and canvas.** WebGL 1 with one shared context and one canvas, which grows to at most 1024².
- **Pose.** The blade lies along screen angle `a` (hilt to point) and is `len` long from the guard to the point.
  `spin` turns it round its length, and `tilt` tips the point toward the viewer.
- **Projection.** Orthographic, with a z-buffer. It renders at the ctx's device resolution into the box the model
  fills, then `drawImage`s that into the 2D frame.
- **Shading.** Flat-shaded and lit from the top-left front: face-on looks about as painted. A small specular, and a
  rim glow on the blade tinted by the latest rune.
- **Texture filtering.** Mipmapped when small, nearest when big (crisp art pixels).
- **Return value.** The six rune slot points on the visible face, how square-on that face is, and px per art pixel.
- **Fallback.** Returns `null` without WebGL or before the model loads. `runeblade3DReady()` gates it, and the
  signature then draws the old flat `blade()`.

## ChatGPT kit

`docs/art_kits/ChatGPT_Runeblade_3D_Kit.zip` (built by `python tools/runeblade3d.py kit` from
`tools/runeblade3d_kit/`) contains the template, a layout example, the spec, the style lock, the prompts, a diagram
and in-game reference shots. It replaces the 2D sprite kit `ChatGPT_Runeblade_Kit.zip` for this sword.

## Test

```bash
node tools/tests/runeblade3d.js     # mesh, all 16 turns, face-on > edge-on, rune slots; turntable/hover/swing shots
```

Headless Chromium needs `--enable-unsafe-swiftshader` for WebGL. The test sets it when `CHROMIUM_ARGS` is unset.
