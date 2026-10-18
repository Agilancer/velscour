# VELSCOUR style for the banner ("Grim Nocturne")

The short version of the game's art bible, cut down to what a banner needs.

## The look

Hand-placed 2D pixel art from the 16/32-bit era pushed to PlayStation 2 density: every sprite is drawn one deliberate
pixel at a time from a tiny palette. About 60% **Final Fantasy VI** (theatrical costume design, bold readable cloth
shapes, one small palette per sprite), 25% **Diablo II** (grime, believable straps and stitching, torchlight, danger),
15% **Castlevania: Symphony of the Night** (gothic verticals, a cold moonlit rim light). It must look like a lost
Square-era sprite nobody has seen, never like "AI dark-fantasy pixel art".

## Pixel craft rules

1. **One pixel size.** Every art pixel is a square flat block (3 x 3 screen pixels on these sheets). No blur, no
   smoothing, no gradients except distinct bands.
2. **Clusters, not noise.** Shapes are built from clusters of 2+ AP of one colour. No stray single pixels except
   deliberate glints (one per material area).
3. **Ramps, not airbrush.** Shade by stepping along a colour ramp in bands. Shadows go cooler and more saturated,
   lights warmer. Never shade by just adding black or white.
4. **Flat-then-band cloth.** Big flat areas of a mid tone, 1-2 hard-edged shadow bands for the folds, 1 highlight band
   on the crest of each fold. Folds are long tapering shapes. Heavy cloth hangs straight; it breaks into folds only
   where the wind pushes it.
5. **Outline.** A 1 AP outline that is the darkest step of the cloth's own ramp, never pure black, broken or lighter
   on the lit top-left side. Never anti-alias the outer edge against the background: it must cut cleanly.
6. **Moonlit rim (the signature).** A hard 1 AP cold rim (`#9fb4d4`, `#d4e2f4` on metal) along the right-hand edges
   of the cloth and pole, broken into segments. Never a glow.
7. **Light** comes from the upper left. Top-left planes are brightest; forms fall into shadow toward the bottom right.
   No cast shadows (the game draws the shadow).
8. **Dithering** only as texture (frayed wool, scorch), at most 10% of the area. Never as a blend.
9. **Readability:** in game the cloth is about 50 world pixels tall and the whole banner about 95. The swallowtail silhouette, the gold border
   and the shield emblem must read at that size. Big shape, then medium shape, then detail.
10. **Emissive** (RALLY frames only): the Holy ramp, brightest step in the core, glow 1-2 AP inside the shape, never a
    soft halo outside it. The game adds its own glow.

## Palette (exact targets, dark -> light)

| Ramp | Steps |
|---|---|
| Night indigo (the field) | `#0a0a18` `#161a34` `#242c52` `#34406e` `#4c5c92` `#7084b8` |
| Reliquary gold (border, emblem lance, finial, knobs) | `#1a1006` `#3a240c` `#63401a` `#8e6427` `#b98e3c` `#dcbf6a` `#f4e3a6` |
| Grave steel (shield face, rings, bands) | `#0e1016` `#1c2230` `#2e3747` `#46526a` `#6a7891` `#98a6bc` `#d0d9e6` |
| Leather (ash-wood pole, lashings) | `#120c08` `#261a10` `#3e2a1a` `#5a3e26` `#7a5636` `#9e7650` |
| Shadow ink (deepest darks only) | `#07060a` `#100c14` `#1a1220` |
| Moonlit rim | `#6f84a8` `#9fb4d4` `#d4e2f4` |
| Holy (emissive, RALLY only) | `#2a2008` `#5a4814` `#9a8428` `#d4bc48` `#f2e08a` `#fffae0` |

Colour discipline: indigo is the dominant colour (about 60%), steel and wood secondary (30%), gold is the accent (10%).
Saturated colour only in the accent. At most 20 colours in a frame.

## The design card (write it before drawing)

Four lines, then draw from them:
1. **Costume source:** a siege-gate warden's standard: the banner that flies over a besieged gatehouse.
2. **Material twist** (pick one): stitched repairs in undyed linen, tin votive charms on the rings, a reliquary-glass
   boss in the shield, braided horsehair tassels on the tails, wax-sealed oath strips along the hem.
3. **Hue contrast:** indigo field against heraldic ochre gold, on muted grave steel.
4. **Silhouette hook:** the deep swallowtail and the centred tower-shield emblem, readable in solid black.

## Never

Text or letters, skulls, flames along the edges, glowing red, chains as decoration, a cloth that leans to one side, a
pole off the centre line, soft painterly shading, pixels of different sizes, a background that isn't flat magenta,
labels or guide lines left in the picture, anything outside its cell.
