# Runeblade 3D texture sheet: the spec

This file wins over every other file in the kit.

## The canvas

- **1024 x 1536 px, portrait.** One PNG.
- Flat magenta background `#FF00FF` everywhere that is not sword. The game cuts magenta out, so magenta inside the
  sword outline becomes a **real hole** in the 3D model.
- **1 art pixel = a 4 x 4 block** of identical pixels, which gives an art grid of 256 x 384. Every block is one flat
  colour.
- No text, labels, boxes or guide lines in the finished image.

## The three columns

All three are views of **the same sword**, pointing **straight down**, its axis on the column's yellow centre line.

| Column | Box (x, px) | Centre line x | What to draw |
|---|---|---|---|
| **FRONT** | 32 – 432 | 232 | The sword face-on, its front face toward you. |
| **SIDE** | 452 – 572 | 512 | The same sword turned 90° so you see it **edge-on**: the blade's edge, the guard end-on, the grip and pommel in profile. |
| **BACK** | 592 – 992 | 792 | The same sword seen **from behind**: walk round it and look at its back face. Its outline is FRONT's outline **mirrored left to right**. |

## The guide lines (rows, px from the top)

| Line | y | Meaning |
|---|---|---|
| Pommel top | **112** | The highest pixel of the sword (top of the pommel). |
| Crossguard centre | **376** | The middle of the crossguard. This is the model's pivot: the hovering sword hangs from here. |
| Point | **1488** | The lowest pixel: the tip of the blade. |

These three lines are the same in all three columns. **A part must be at the same height in every view**: the guard's
top and bottom, where the grip meets the pommel, where the point starts. The game pairs FRONT row y with SIDE row y to
know how thick the sword is there.

## The rune slots

Six rune sockets run down the centre line of the blade in **FRONT and BACK**, centred at
**y = 532, 665, 799, 932, 1065, 1199**. They sit at 14%, 26%, 38%, 50%, 62% and 74% of the way from the crossguard
centre to the point, and are marked by green squares (20 x 20 px) on the template.

Paint them as **empty, dark engraved sockets** about 16 – 20 px (4 – 5 art px) square. The game draws the glowing
runes over them as the Death Knight fights (frost blue, unholy green, blood red), so **do not paint any lit runes**.
The SIDE view has no sockets.

## Suggested proportions

These are guides, not rules. Only the three lines and the columns are fixed.

| Part | FRONT width | SIDE width (thickness) |
|---|---|---|
| Pommel (112 – ~185) | ~64 px | ~56 px (round) |
| Grip (~185 – ~345) | ~24 – 32 px | ~24 – 32 px (round) |
| Crossguard (~345 – ~405) | ~360 px (the green ticks), at most the 400 px box | ~40 – 64 px |
| Blade at the guard | ~144 px (the green ticks) | ~24 – 40 px |
| Blade near the point | tapering over the last ~200 px to a long point | tapering to ~4 – 8 px |

- **The crossguard must be the widest part of FRONT**, in the top 40% of the sword. The game finds the guard as the
  widest row there.
- Keep SIDE well inside its 120 px box. A sword thicker than about a third of its width looks like a club in 3D.
- A straight, symmetric blade works best. Asymmetric guards and pommels are fine.

## How the game builds and uses the model

1. The importer (`python tools/runeblade3d.py install SHEET.png`) keys out magenta and leftover guide colours.
2. It keeps the main shape in each column.
3. It scales each view vertically so its top is on the pommel line and its bottom on the point line, and centres it
   on its blade axis.
4. It snaps everything to the 4 x 4 grid and writes a 256 x 512 texture atlas plus a profile: FRONT width and SIDE
   thickness for every art-pixel row.
5. In the browser (`src/gfx/runeblade3d.js`), each run of rows with the same profile becomes one slab with a
   six-sided cross-section (edge, bevel, flat, bevel, edge):
   - The bevels are 30% of the width on each side, and never more than 2.5 x the half-thickness.
   - Where the profile changes, a flat ledge joins the slabs, so stepped pixel outlines become stepped 3D shapes.
6. The front half of every slab is coloured from FRONT and the back half from BACK, un-mirrored. Projecting straight
   on, FRONT seen face-on looks exactly as painted.
7. The model is drawn with WebGL: flat-shaded faces lit from the top-left front, a soft specular, and a cold rim glow
   on the blade tinted by the latest rune.

**In play:**
- The hovering sword is about **42 world px** from crossguard to point, at the Death Knight's shoulder. It sways
  round its length, tilts slightly toward the camera, and does a full twirl each time it takes a rune.
- **RUNIC OBLITERATION** uses the same model at about **125 world px**. It is raised leaning away, turns flat to the
  camera as it falls through the target, then rolls and fades.

So the sword must read at both sizes: a strong cross silhouette first, then the long point and the six sockets, then
detail.

## What to avoid (the importer can't fix these)

- The three views at different heights (a guard higher in SIDE than in FRONT gives a guard with the wrong thickness).
- BACK with a different outline from FRONT mirrored.
- A sword leaning or curving off the vertical.
- Lighting baked in hard: a white streak down one bevel turns with the model and looks wrong from other angles.
- Glow, smoke, sparkles or a halo outside the outline, which become solid lumps in 3D.
- Lit runes in the sockets.
