# Death Knight Runeblade: sprite specification

This file says exactly what to draw and how the game will use it. If a template and this file ever disagree, this file
wins.

## What the Runeblade is

The Death Knight's class signature. A spectral greatsword hovers point down at his right shoulder, with six rune slots
cut down its blade. Each of his blows carves a rune into the next empty slot, by the blow's nature:

| Rune | Carved by | Colour |
|---|---|---|
| FROST | cold blows (the Frost tree) | `#7ad0ff` |
| UNHOLY | shadow and poison blows (the Unholy tree) | `#70e050` |
| BLOOD | blood blows (the Blood tree) | `#ff2a30` |

With all six slots lit the blade is CHARGED. Then it swells to giant size for **RUNIC OBLITERATION**: it rises over
him and comes down in one colossal cleave, then fades. The runes decide the aftermath (freeze, plague burst or life
drained), and the game draws those effects itself.

## Only nine sprites

Every blade is drawn **pointing straight down**, centred on its cell's centre line. The game rotates it around the
**anchor: the centre of the crossguard** (where the yellow centre line crosses the yellow crossguard line), so one
sprite covers every angle of the hover sway and of the swing. Runes are separate sprites that the game lays over the
slots, any mix, in the order they were carved (slot 1 nearest the guard).

| # | Cell | Sheet | Size (AP) | On the sheet (px) | What |
|---|---|---|---|---|---|
| 1 | HOVER | 1 (3x) | 48 x 112 | 144 x 336 | the hovering sword, all six slots empty (engraved, unlit) |
| 2 | HOVER CHARGED | 1 (3x) | 48 x 112 | 144 x 336 | the same sword with six runes lit: edges kindled frost, pommel gem white-hot |
| 3-5 | RUNE S FROST / UNHOLY / BLOOD | 1 (3x) | 16 x 16 | 48 x 48 | one lit rune glyph for the hovering sword's slots |
| 6 | GREATBLADE | 2 (2x) | 96 x 280 | 192 x 560 | the giant sword of RUNIC OBLITERATION, all six slots empty |
| 7-9 | RUNE L FROST / UNHOLY / BLOOD | 2 (2x) | 24 x 24 | 48 x 48 | the same three glyphs at the greatblade's size |

## Landmarks (cell coordinates, AP)

| | HOVER, HOVER CHARGED | GREATBLADE |
|---|---|---|
| Centre line | x 24 | x 48 |
| Pommel top (dotted yellow) | y 4 | y 6 |
| Crossguard line, the anchor (yellow) | y 22 | y 36 |
| Point (tip line, yellow) | y 98 | y 264 |
| Blade length, guard to point | 76 AP (42 world px) | 228 AP (228 world px) |
| Blade width at the guard (green) | 12 AP (x 18 to 30) | 16 AP (x 40 to 56) |
| Crossguard span (green ticks) | 34 AP (x 7 to 41) | 46 AP (x 25 to 71) |
| Rune slot centres (green squares) | y 33, 42, 51, 60, 69, 78 | y 68, 95, 123, 150, 177, 205 |
| Slot size | about 5 x 7 AP | about 9 x 11 AP |

The slots sit at 14, 26, 38, 50, 62 and 74% of the blade length from the guard. They must be **on the centre line at
exactly those heights**, because the game puts the rune sprites there. The blade may taper toward the point and the
guard ends may curl, but nothing leans off the centre line.

## The pieces

- **HOVER:** a broad, straight frost-glass blade with a long point (the last 15% tapers to the tip), a fuller down
  the middle, six engraved empty slots (dark recesses in the fuller, frost ramp step 2), on a blackened-steel hilt: a
  flat **tomb-lid crossguard** with **hourglass-shaped ends** in verdigris bronze, a grip wrapped in dark funeral sash
  cloth or bound wire, an **hourglass or tomb-urn pommel** with a small gem. Two to four verdigris tears run down
  from the guard onto the blade.
- **HOVER CHARGED:** exactly HOVER, pixel for pixel, plus emissive: the blade's edges kindled with the frost rune ramp
  1-2 AP deep, the fuller glowing, the pommel gem white-hot. Slots stay empty (the game lays the six runes on top).
- **RUNE S / RUNE L:** one glyph per cell, centred on the crosshair, abstract and symmetric enough to work mirrored:
  FROST a six-armed rime star or a split crystal, UNHOLY a three-tined plague fork or a crooked grave-mark, BLOOD a
  drop with a cut through it or a heart-vein knot. RUNE S glyphs fit about 5 x 7 AP, RUNE L about 9 x 11 AP, each with
  a 1 AP dark rim of its own ramp so it reads on the frost-glass. Emissive ramp only. No letters.
- **GREATBLADE:** the same design as HOVER, scaled up and grander: the same silhouette and colours, a heavier guard,
  more verdigris, the fuller deeper, cracks of frost light in the glass. Drawn at its own density (1 AP = 1 world
  px), never a resized copy of HOVER.

## How the game uses it (for whoever wires it in)

1. **Hover:** drawn in front of the Death Knight with the anchor at 20 world px right of his feet and 62 world px
   above them (hero frame x 100, y 71 at 1.8 AP per world px), rotated about 7 degrees off vertical, swaying a few
   degrees and bobbing 2 px. Scale: 1.8 AP per world px (0.85 of that on phones).
2. Each carved rune: the RUNE S sprite for that rune drawn over its slot, rotated with the blade, plus the game's own
   soft glow. A rune just carved flashes.
3. At six runes: HOVER CHARGED instead of HOVER.
4. **RUNIC OBLITERATION** (0.75 s): GREATBLADE with its anchor 8 px from his chest, growing to full size in 0.15 s,
   raised overhead and brought down through the target direction by 0.32 s (the hit), then fading out. RUNE L sprites
   ride its slots. The game draws the slash arcs, frost, plague and blood effects.
5. Mirrored when he faces left, and rotated to any angle: no text, and a design that works flipped.

## What to send back

1. `runeblade_sheet1_hover.png`: 1536 x 1024, flat magenta #FF00FF background, every sprite inside its cyan box,
   **all labels and guide lines removed.**
2. `runeblade_sheet2_greatblade.png`: the same rules.
3. A short note: the palette actually used (hex), and the 4-line design card (see STYLE.md).
