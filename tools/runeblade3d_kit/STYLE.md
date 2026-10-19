# VELSCOUR style lock for the Runeblade 3D texture ("Grim Nocturne")

This is the game's art bible, cut down to what a 3D-mapped sword texture needs. The rules are locked: the heroes and
their armor, helmets and summons are all drawn by them. The Runeblade has to look as if the same artist painted it on
the same day as the Death Knight.

## The look

Hand-placed 2D pixel art from the 16/32-bit era, pushed to PlayStation 2 density. The mix:

- **60% Final Fantasy VI:** bold, readable shapes, one small palette, flat-then-band shading.
- **25% Diablo II:** grime, believable materials, danger.
- **15% Castlevania: Symphony of the Night:** gothic verticals, jewel accents, a cold moonlit rim.

It must look like a lost Square-era sprite, never like "AI dark-fantasy pixel art".

**This sheet is a texture, not a finished sprite.** The game wraps it round a 3D model and lights it as the sword
turns. So paint the **materials** with gentle, even light from the upper left, as if the sword faces you under a
cloudy sky. Shading belongs in **bands that describe the shape**: a lighter bevel band, a darker fuller groove, a
lighter top edge on the guard. Do **not** paint strong lighting: no hot specular streaks, no deep shadow side, no cast
shadows. The game adds those.

## The Death Knight (who carries it)

He is the last honour guard of a drowned mausoleum: a pale man with close-cropped black hair, in blackened steel with
cold cyan accents.

- **His motifs:** tomb-lid plates, funeral sashes, verdigris tears, hourglass buckles.
- **The Runeblade:** his oath made visible. A spectral greatsword of **frost-glass** on a **blackened-steel** hilt,
  with six rune sockets cut down the blade.

## Pixel craft rules

1. **One pixel size:** 1 art pixel = a 4 x 4 block of one flat colour, everywhere. No blur, smoothing, half blocks or
   mixed sizes.
2. **Clusters, not noise.** Build shapes from clusters of 2+ art pixels of one colour. No stray single pixels.
3. **Ramps, not airbrush.** Shade by stepping along one ramp in hard bands, never by adding black or white.
4. **Steel:** big flat mid-tone planes, a 1 art-pixel lighter line on top edges, a dark 1 art-pixel seam where parts
   meet. Rivets are 2 x 2 art pixels.
5. **The frost-glass blade:**
   - A flat mid-frost body with a lighter band on each bevel (both sides alike; the 3D light makes them differ).
   - A darker fuller groove down the middle, with the sockets in it.
   - The brightest step only at the very point.
   - It is opaque, so no transparency gradient.
6. **Outline:** 1 art pixel, from the darkest step of the part's own ramp, never pure black. The outer edge cuts
   cleanly against the magenta.
7. **Moonlit rim:** a few broken 1 art-pixel segments of `#9fb4d4` on the right-hand edges are fine, but keep them
   light. The 3D lighting already gives a rim.
8. **Dithering** only as texture (pitted steel, verdigris crust), at most 10% of an area.
9. **Readability:** the hovering sword is about 54 world px tall in play, and the swing about 160. Big shape first,
   then medium, then detail.

## Palette (exact targets, dark -> light)

| Ramp | Steps |
|---|---|
| Blackened steel (grip, crossguard, pommel) | `#08080c` `#13131c` `#20202e` `#323246` `#4c4c66` `#76769a` |
| Frost-glass (the spectral blade) | `#0a1620` `#16303e` `#285468` `#3e7c94` `#66a8c0` `#a6d8e6` `#e6f6fa` |
| Verdigris bronze (fittings, tears under the guard) | `#0e1412` `#1c2a26` `#2e4640` `#46665c` `#6a8c7e` `#9ab8a6` |
| Shadow ink (deepest darks only) | `#07060a` `#100c14` `#1a1220` |
| Moonlit rim (right-hand edges) | `#6f84a8` `#9fb4d4` `#d4e2f4` |

**Colour balance:**
- Frost-glass dominant, about 60%.
- Blackened steel secondary, about 30%.
- Verdigris as the accent, about 10%.
- At most **24 colours** on the whole sheet.
- **No red, green or saturated blue** anywhere: those are the rune colours, and the game adds the runes itself.

## The design card (write it before drawing)

Write four lines, then draw from them:

1. **Costume source:** the honour blade laid on a drowned king's tomb lid, raised by the last of his guard.
2. **Material twist** (pick one):
   - frost-glass with a relic sliver sealed in the fuller;
   - a grip wrapped in funeral sash cloth;
   - an hourglass pommel with frozen sand;
   - verdigris tears running down from the guard;
   - tomb-lid lettering worn to blank grooves.
3. **Hue contrast:** cold cyan frost-glass against blackened steel, with verdigris as the jewel.
4. **Silhouette hook:** a broad, long-pointed blade under a flat tomb-lid crossguard with hourglass ends. It must read
   in solid black at 54 px.

## Never

- Text, letters or numbers.
- Skulls, flames, chains, or spikes all over.
- Lit runes.
- A curved, wavy or leaning blade.
- Soft painterly shading, or hard baked highlights.
- A glow or halo outside the shape.
- Pixels of different sizes.
- A background that isn't flat magenta.
- Labels or guide lines left in the picture.
- Views at different heights.
