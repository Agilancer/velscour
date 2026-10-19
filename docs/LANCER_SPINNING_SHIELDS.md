# Lancer Bulwark: 3D Spinning Shields

The Lancer's seven spinning-shield spells draw **real 3D shield models**, built in the browser
from the four golden shield turntables. They replace the old eight-frame sprite flip-book. The
models turn smoothly and show the game's isometric skew, a solid rim and the painted rear face.
Gameplay is unchanged: damage, knockback, hit frequency, duration, cooldown, shield counts,
spin speed (+2.4 rad/s), orbit radii, Shield Storm's spiral and the per-shield depth sort all
work as before. All the code is in `src/gfx/lancershields.js`.

## Source art

`assets/fx/lancer/spinning_{round,diamond,kite,tower}.png`: 4x2 sheets of 44x56 cells. Frame 0
is the front face, frame 4 the rear face, and frames 2/6 the edge-on views. The other frames are
not needed any more, but they stay in the sheet.

| Ability | Model | Base radius (tiles) |
| --- | --- | ---: |
| Tower Shield | round | 0.70 |
| Storm Bulwark | diamond | 0.975 |
| Burning Aegis | kite | 1.25 |
| Frost Rampart | tower | 1.525 |
| Holy Citadel | round | 1.80 |
| Shield Storm | diamond | 2.075 (spiral) |
| Bastion of Ten | tower | 2.35 |

## How a model is built (`buildShieldModel`, on image load)

Each shield is an **extruded slab** (a prism):

- **Silhouette and front cap:** frame 0. Only its largest connected blob is kept, so the
  sheets' stray specks are dropped. The outline comes from the per-row extents and is simplified
  with Douglas-Peucker to 24–39 vertices.
- **Rear cap:** frame 4, mirrored (it is painted as seen from behind) and scaled so that its
  box fits the front's. The AI-made turntables differ by a pixel or two between frames.
- **Thickness:** the median opaque run per row of the edge-on frames 2 and 6, × 0.75, clamped
  to 2–5 texels. The 0.75 factor keeps the round shield's boss from making the whole slab thick.
- **Rim colour:** each rim face takes the average colour of the matching row of the edge-on
  frames, so the edge looks the way it was painted.
- **Lighting:** each cap is pre-baked at 16 brightness levels. The light comes from the
  top-left front. Face-on is about 1.0, the art as painted. A gold glint sweeps across a face as
  it turns between the light and the camera.

## How it is drawn (`drawShieldModel`)

The projection is the game's parallel 2:1 iso: an offset toward the camera drops 0.5 px per px
of width, and vertical stays 1:1 like the sprite art. Every face of the slab is planar, so its
projection is an **exact affine map**. The caps are one `drawImage` under `ctx.transform`, and
the rim faces are filled quads. No WebGL is needed. Each frame:

1. Fill the far outline in a dark rim colour, which hides hairline seams.
2. Back-face cull the rim faces against the view direction `(0, 1, 0.5)`, then paint the
   remaining ones far to near with their lit colour.
3. Draw the visible cap: the front when the shield faces the camera, the mirrored rear otherwise.

The shields face **radially outward**, as the old frames did: the front faces the camera on the
near side (a = π/4), the rear on the far side (a = 5π/4), and they are edge-on at the left and
right.

**Cost.** A live render is about 25 path fills (~0.12 ms). `shieldView()` therefore memoises
each model's render per 1/96 turn (3.75°) and size, in a small canvas. A spinning shield in play
then costs one `drawImage`, ~0.006 ms, the same as the old sprites. Fifty shields take about
0.3 ms a frame.

Until a sheet has loaded, the old procedural `tshield` shape stands in, so hits and visuals keep
working.

## Depth sorting (unchanged)

`render.js` enqueues **each shield** with `orbitShieldDepth(x, y, a)` as a `f:11` item and
draws it through `Orbit.drawShield(ctx, i)`. Far-side shields therefore paint before the Lancer,
and near-side ones after him and between wall slices. Do not move them back into the
unconditional top hazard pass: that brings back the old bug where every shield was on the same
side of the hero.

## Tests

```bash
node tools/tests/lancer_shields.js     # model checks, cast path, shots
node tools/tests/barbarian_rage.js     # also checks the four models build
```

`lancer_shields.js` checks:

- each model's outline, thickness, baked caps and rear-cap fit;
- that a model draws at all 16 angles, and covers more face-on than edge-on;
- front/back facing and near/far depth;
- that each spell casts its own model, radius and +2.4 rad/s spin.

It writes these shots to `tools/tests/out/`:

- `lancer_shield_models.png`: a 16-step turntable of every model at 2×;
- `lancer_shield_depth_front_back.png`;
- `lancer_shield_all_rings.png`: all seven spells cast at once.
