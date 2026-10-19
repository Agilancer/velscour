# VELSCOUR style lock for the Runeblade ("Grim Nocturne")

The game's art bible cut down to what a sword and its runes need. These rules are locked: the heroes, their armor,
helmets and summons are all drawn by them, and the Runeblade has to sit beside the Death Knight as if the same artist
drew both on the same day.

## The look

Hand-placed 2D pixel art from the 16/32-bit era pushed to PlayStation 2 density: every sprite is drawn one deliberate
pixel at a time from a tiny palette. About 60% **Final Fantasy VI** (bold readable shapes, one small palette per
sprite, flat-then-band shading), 25% **Diablo II** (grime, believable material, torchlight, danger), 15%
**Castlevania: Symphony of the Night** (gothic verticals, jewel accents, a cold moonlit rim light). It must look like
a lost Square-era sprite nobody has seen, never like "AI dark-fantasy pixel art".

## The Death Knight (who carries it)

The last honour guard of a drowned mausoleum: a pale man with close-cropped black hair in blackened steel with cold
cyan accents. His motifs are **tomb-lid plates, funeral sashes, verdigris tears and hourglass buckles**. The Runeblade
is his oath made visible: a spectral greatsword of frost-glass on a blackened-steel hilt, with six rune slots cut down
the blade that light up as he fights.

## Locked numbers

- **Art pixel (AP):** a perfect square of one flat colour. The hero is 108 AP tall (crown to soles) in a 128 x 192 AP
  frame; in game **1.8 AP = 1 world pixel** (he is 60 world px tall).
- **Sheet 1 is at 3x** (1 AP = a 3 x 3 block) at the hero's density. **Sheet 2 is at 2x** (1 AP = a 2 x 2 block) and
  its greatblade is drawn at **1 AP per world pixel**: chunkier pixels on purpose, the sword of a giant ghost.
- Every block is one flat colour. No blur, no smoothing, no half blocks, no mixed pixel sizes inside one cell.

## Pixel craft rules

1. **One pixel size** per cell, as above.
2. **Clusters, not noise.** Shapes are clusters of 2+ AP of one colour. No stray single pixels except deliberate
   glints (one per material area: the pommel gem, the guard tips, the point).
3. **Ramps, not airbrush.** Shade by stepping along one ramp in hard bands. Shadows cooler and more saturated, lights
   warmer. Never shade by adding black or white.
4. **Flat-then-band steel.** Big flat mid-tone planes, a hard 1-2 AP specular streak along the top-left edge of each
   plane, a dark 1 AP seam where parts meet. Rivets 2 x 2 AP (light top-left, dark bottom-right).
5. **The spectral blade.** Frost-glass, not metal: a flat mid-frost body, a lighter bevel band down the left edge, a
   darker fuller (the groove) down the middle, the brightest step only at the edge and the point. It reads as cold
   light trapped in glass. It is **opaque pixel art** (the game adds its own soft glow around it), so never paint a
   halo, a transparency gradient or smoke around it.
6. **Outline.** A 1 AP outline from the darkest step of the part's own ramp, never pure black, broken or lighter on
   the lit top-left side. The outer edge cuts cleanly against the magenta: no anti-aliasing.
7. **Moonlit rim (the signature).** A hard 1 AP cold rim (`#9fb4d4`, `#d4e2f4`) along the right-hand edges of the
   blade and guard, broken into segments. Never a glow.
8. **Light** comes from the upper left of the picture as drawn (the sword pointing down). No cast shadows.
9. **Dithering** only as texture (pitted steel, verdigris crust), at most 10% of an area. Never as a blend.
10. **Readability.** In game the hovering blade is about 54 world px from pommel to point, the greatblade about 260.
    The cross shape, the long point and the six slots must read at that size. Big shape, then medium, then detail.
11. **Emissive** (lit runes and HOVER CHARGED only): an emissive ramp, brightest step in the core, glow 1-2 AP inside
    the shape, never a soft halo outside it. The game adds its own glow.

## Palette (exact targets, dark -> light)

| Ramp | Steps |
|---|---|
| Blackened steel (grip, crossguard, pommel) | `#08080c` `#13131c` `#20202e` `#323246` `#4c4c66` `#76769a` |
| Frost (the spectral blade) | `#0a1620` `#16303e` `#285468` `#3e7c94` `#66a8c0` `#a6d8e6` `#e6f6fa` |
| Verdigris bronze (fittings, the tears under the guard) | `#0e1412` `#1c2a26` `#2e4640` `#46665c` `#6a8c7e` `#9ab8a6` |
| Shadow ink (deepest darks only) | `#07060a` `#100c14` `#1a1220` |
| Moonlit rim | `#6f84a8` `#9fb4d4` `#d4e2f4` |
| Frost rune (emissive) | `#0a2a50` `#1a5a9a` `#3a9ad8` `#7ad0ff` `#bfeaff` `#f0fbff` |
| Unholy rune (emissive) | `#0e1a06` `#1e3a0a` `#3a7014` `#5ab828` `#70e050` `#c8ff9a` |
| Blood rune (emissive) | `#2a0408` `#5a0a10` `#9a1418` `#d42228` `#ff2a30` `#ffb0a8` |

`#7ad0ff` is the Death Knight's class colour; `#70e050` and `#ff2a30` are the game's unholy and blood rune colours.
Colour discipline: frost-glass dominant (about 60%), blackened steel secondary (30%), verdigris and the runes are the
accent (10%). Saturated colour only in the runes. At most **20 colours per blade, 8 per rune**.

## The design card (write it before drawing)

Four lines, then draw from them:
1. **Costume source:** the honour blade laid on a drowned king's tomb lid, raised by the last of his guard.
2. **Material twist** (pick one): frost-glass with a relic sliver sealed in the fuller, a hilt wrapped in funeral
   sash cloth, an hourglass pommel with frozen sand, verdigris tears running down from the guard, tomb-lid
   lettering worn to blank grooves.
3. **Hue contrast:** cold cyan frost-glass against blackened steel, with verdigris and one rune colour as the jewel.
4. **Silhouette hook:** a broad, long-pointed blade under a flat tomb-lid crossguard with hourglass ends, readable in
   solid black at 54 px.

## Never

Text, letters or numbers (the runes are abstract glyphs, not alphabet letters), skulls, flames, glowing red on the
blade itself (red belongs only to the blood rune), chains, spikes all over, a blade that leans off the centre line, a
curved or wavy blade, soft painterly shading, a halo or glow painted outside the shape, pixels of different sizes in
one cell, a background that isn't flat magenta, labels or guide lines left in the picture, anything outside its cell.
