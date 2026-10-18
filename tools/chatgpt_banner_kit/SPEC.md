# Lancer War Banner: sprite specification

This file says exactly what to draw and how the game will use it. If a template and this file ever disagree, this file
wins.

## What the banner is

The Lancer is a huge knight-captain: the bastion-warden who holds a siege gate. He wears a war banner on a pole
strapped to his back, like a samurai's sashimono. The banner fills up with **Valor** as he fights:

| Valor | What the banner does |
|---|---|
| 0% | Furled: the cloth is rolled up tight under the crossbar. |
| 1-99% | It unrolls downward, a little more with every blow he lands, every foe he fells and every wound he takes. The unrolled part waves gently (the CALM loop). The roll sits at the bottom edge of the cloth. |
| 100% | Fully unfurled and whipping in a gale (the RALLIED loop). |
| The payoff | It blazes with holy light (the RALLY frames) as five phantom knights charge out from behind him. Then Valor drops to 0 and the cloth rolls back up. |

## The grid

- **Art pixel (AP):** the smallest square of colour. Every frame is drawn on a grid of whole art pixels, all the same
  size. No half pixels, no blur, no anti-aliasing against the background.
- **Delivery scale:** on both sheets **1 AP = a 3 x 3 block of identical screen pixels.** Every 3 x 3 block must be
  one flat colour. A block that isn't flat gets averaged on import and looks smeared.
- **Density:** the same as the heroes. The Lancer is 108 AP tall from the crown of his head to his soles. In game,
  1.8 AP = 1 world pixel, so he is 60 world pixels tall.

## The frames

Every cell is **64 AP wide**, with the hero's centre line at **x = 32** and the crossbar line at **y = 16**. That
crossbar point is the anchor that lines every piece up. Heights differ by piece:

| Cell | Size (AP) | On the sheet (px) |
|---|---|---|
| CALM, RALLIED, RALLY (the cloth) | 64 x 112 | 192 x 336 |
| POLE | 64 x 180 | 192 x 540 |
| ROLL | 64 x 32 | 192 x 96 |

The banner is mounted **high**: even the fully unfurled cloth hangs clear above the Lancer's head, so the whole
banner reads over him in a fight.

| Landmark | Cell position (AP) | On the hero (hero frame 128 x 192, crown y 75, soles y 183) |
|---|---|---|
| Hero's centre line | x = 32 | x = 64 |
| Crossbar line (the cloth hangs from here) | y = 16 | y = -22: 97 AP above his crown, 114 world px above his feet |
| Finial tip | y = about 1-4 | y = about -37 to -34 |
| Cloth at full length (tip of the swallowtail) | y = 104 | y = 82: just above his crown and hair |
| Pole mount (bottom of the pole, POLE cell only) | y = 174 | y = 136, his upper back |

Between the cloth's tip and his head, about 4-7 AP of bare pole shows. Below that the pole runs behind his head and
shoulders and is hidden by him.

**Centring is the point of this whole set:** the pole runs straight up the centre line x = 32; the crossbar is
centred on the pole; the cloth hangs centred on the pole and covers it. Nothing leans off to one side. The waves move
the cloth's lower half left and right; the top edge never moves.

## Sheet 1: the cloth (`templates/banner_sheet1_cloth_template.png`, 1536 x 1024)

Two rows of six frames. **Only the cloth: no pole, no crossbar, no finial** (they are on sheet 2).

- **Size:** 40 AP wide (x 12 to 52), hanging from the crossbar line (y 16) to y 104 (88 AP long), green dashed box.
  The top 4 AP is a hem sleeve that the crossbar passes through, with 4-6 small iron rings or lashings.
  The bottom is a **swallowtail**: two points at the corners, a notch up the middle about 12 AP deep.
- **Sway room:** the lower cloth may swing up to 6 AP past the green sides. The top 8 AP never moves.
- **Row 1 CALM 1-6:** one seamless loop of a gentle ripple: a soft S-curve that travels from the top to the bottom.
  Frame 6 must flow back into frame 1. Sway at the tails: about 3 AP. Plays at 8 frames a second.
- **Row 2 RALLIED 1-6:** the same cloth in a strong wind: deeper folds, the tails lifting and snapping, sway up to 6 AP,
  one corner flicking up on frames 3-4. Seamless loop. Plays at 14 frames a second.
- The same cloth, the same emblem and the same colours in all twelve frames. Only the folds and the sway change.

## Sheet 2: the parts (`templates/banner_sheet2_parts_template.png`, 1536 x 1024)

- **POLE (1 frame, 64 x 180 AP):** a straight ash-wood pole up the centre line from the mount line (y 174) to just
  above the crossbar, 3 AP thick, with 3-4 iron bands spread along its length; a crossbar centred on it at y 16, 46 AP wide (x 9 to 55), 2-3 AP thick,
  with a small gilt knob on each end; a gilt finial on top shaped like a **tower merlon or a small portcullis spike**
  (the Lancer's motif), 8-12 AP tall. Strapping at the bottom end. Nothing else.
- **RALLY 1-4:** the fully unfurled cloth (64 x 112 AP, same anchors as sheet 1) at the moment the Order charges. Frame 1:
  the cloth snaps taut; frame 2: the emblem and border ignite with holy light; frame 3: brightest, light bleeding
  1-2 AP inside the edges; frame 4: settling, still glowing. Emissive pixels use the Holy ramp only. Plays once at
  12 frames a second, then the RALLIED loop takes over.
- **ROLL 1-3:** the cloth rolled up into a tight cylinder, 42 AP wide and 7-8 AP tall, its top edge on the yellow line
  (cell y 8), gilt end caps, the indigo cloth and gold border visible in the turns. Three frames of a slight sway
  (about 1 AP). The game draws the roll at the bottom edge of the unrolled cloth, so the same roll is used at every
  Valor. Plays at 6 frames a second.

## The emblem and colours

- **Field:** night indigo. **Border:** a 2 AP reliquary-gold border down both sides and along the swallowtail.
- **Emblem, centred about 34 AP below the crossbar:** a grave-steel **tower shield** with a **portcullis grid** on
  it, and a gold **lance** crossing it diagonally. About 20 AP wide and 24 AP tall. It can carry a little wear: a
  scorch, a stitched repair, a frayed tail. The Lancer's class colours are iron grey and heraldic ochre.
- **No text, letters or numbers anywhere.** The game mirrors the hero (and the banner) when he faces left, so the
  design must work flipped. The lance may cross either way.
- At most **20 colours** in any one frame. Exact hex targets are in `reference/banner_palette.png` and `STYLE.md`.

## How the game uses it (for whoever wires it in)

1. Drawn in the depth-sorted pass just behind the Lancer, so his body covers the lower pole and the lower cloth.
   Layer order, back to front: POLE, cloth frame, ROLL, then the hero.
2. Every frame is placed so cell (32, 16) (the crossbar on the centre line) sits on the hero's crossbar point: his
   centre x, and 114 world px above his feet (at 1.8 AP per world px). The banner follows him and his jump height.
3. **Valor f (0-1):** the cloth frame is clipped to its top `4 + 88 * f` AP rows; the ROLL is drawn with its top
   edge on that clip line. At f = 0 the roll sits right under the crossbar.
4. f < 1: CALM loop. f = 1: RALLIED loop plus the game's own soft glow. Payoff: RALLY 1-4 once, then f falls to 0
   and the clip line rises back up over about half a second (the cloth rolls up).
5. Mirrored with the hero when he faces left.

## What to send back

1. `banner_sheet1_cloth.png`: 1536 x 1024, flat magenta #FF00FF background, every frame inside its cyan box, **all
   labels and guide lines removed.**
2. `banner_sheet2_parts.png`: the same rules.
3. A short note: the palette actually used (hex), and the 4-line design card (see STYLE.md).
