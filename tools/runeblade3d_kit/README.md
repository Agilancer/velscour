# Death Knight Runeblade: 3D texture kit

## What this is

The Death Knight's class signature is the **Runeblade**: a spectral greatsword that hovers at his side. It takes a
glowing rune in each of six slots as he fights. When all six are full, it swells to giant size and swings once:
RUNIC OBLITERATION.

In the game the Runeblade is now a **real 3D model**. It sways round its own length while it hovers, twirls when it
takes a rune, and leans and turns through the swing. It is the same model throughout; for the swing it is only scaled
up. The game **builds the model from one painted picture**, so ChatGPT never has to make a 3D file. The picture shows
three views of the same sword:

| View | What the game takes from it |
|---|---|
| **FRONT** (face-on) | The model's outline (how wide every row is) and the colours of its front half. |
| **SIDE** (edge-on, the sword turned 90°) | Only the outline: how **thick** the sword is at every height. |
| **BACK** (from behind, so mirrored) | The colours of the model's back half. |

Every painted row becomes a thin slice of the 3D sword. Each slice has a six-sided cross-section (edge, bevel, flat,
bevel, edge), is as wide as that row of FRONT, and is as thick as the same row of SIDE. See
`reference/runeblade3d_how_it_becomes_3d.png`. The game lights the model itself as it turns, so the texture should look
right face-on and should not have strong highlights or shadows painted into it.

The game ships five skins (`reference/runeblade3d_in_game_turntable.png`). The Death Knight's blade changes skin every
10 levels and palette every 50, which gives 30 looks over levels 1–300 (`reference/runeblade3d_level_looks.png`).
A new sheet from this kit becomes another skin. `examples/runeblade3d_placeholder_clean.png` is the built-in
placeholder, drawn on the template to show the layout.

## What's in the zip

| File | What it is |
|---|---|
| `PROMPT.txt` | The messages to paste into ChatGPT, in order, plus fixes for common mistakes. |
| `SPEC.md` | The exact layout: canvas, columns, guide lines, rune slots, sizes, and how the game reads the sheet. **It wins over everything else.** |
| `STYLE.md` | The VELSCOUR style lock (Grim Nocturne pixel art) and the exact palette for this sword. |
| `templates/runeblade3d_texture_template.png` | **The template.** 1024 x 1536, flat magenta, with the three columns and guide lines. |
| `examples/runeblade3d_layout_example.png` | The placeholder sword painted into the template, with the guides over it. Copy the **placement**, not the look. |
| `examples/runeblade3d_placeholder_clean.png` | The same placeholder sheet without guides: what a finished sheet looks like. |
| `reference/runeblade3d_how_it_becomes_3d.png` | A diagram of how the three views become the model. |
| `reference/runeblade3d_palette.png` | The palette swatches. |
| `reference/runeblade3d_in_game_turntable.png` | The five shipped skins and the placeholder, rendered by the game at 12 turns. |
| `reference/runeblade3d_level_looks.png` | All 30 level looks: the six palettes (rows) on the five skins (columns). |
| `reference/runeblade3d_in_game_hover.png` | In play, hovering by the Death Knight at levels 1, 10, 60, 120, 170, 220 and 290, with 6 runes. |
| `reference/runeblade3d_in_game_obliteration.png` | In play, RUNIC OBLITERATION swinging the same model scaled up. |

## How to use it in ChatGPT

1. Start a new chat. Attach this zip and paste the **FIRST MESSAGE** from `PROMPT.txt`. ChatGPT reads the files and
   answers with a design card and a plan. It draws nothing yet.
2. Paste the **THE SHEET** message. Attach `templates/runeblade3d_texture_template.png` and
   `examples/runeblade3d_layout_example.png` again; image tools work best when the images are in the same message.
3. Check the result against the checklist below. If something is wrong, use the matching fix from the end of
   `PROMPT.txt` and ask for the sheet again.
4. Download the PNG at full size (1024 x 1536).

## Checklist

- [ ] 1024 x 1536 (portrait) on a flat magenta `#FF00FF` background, with no labels, boxes or guide lines left.
- [ ] Three views of **one** sword, all pointing straight down, side by side in their columns.
- [ ] In all three views the pommel top is on the top line, the crossguard on the crossguard line and the point on
      the bottom line. A part must be at the **same height** in every view.
- [ ] BACK has exactly the FRONT outline, mirrored.
- [ ] SIDE is a narrow edge-on view, at most 120 px wide, with thin blade, deeper guard and round grip and pommel.
- [ ] Six **empty** rune sockets down the centre of the blade, on the green squares, in FRONT and BACK.
- [ ] Chunky, even pixel art: 4 x 4 blocks of one colour. No blur, no soft gradients, no anti-aliasing against the
      magenta.
- [ ] Soft, even lighting. No strong highlight streaks, cast shadows, or glow or halo outside the outline.
- [ ] No magenta inside the sword unless you want a real hole there.

## Bringing it into the game

Save the PNG into the VELSCOUR repo (for example `assets/source/runeblade3d_sheet.png`) and run:

```bash
python tools/runeblade3d.py install assets/source/runeblade3d_sheet.png
```

Or give the PNG to Claude Code and ask it to "install the Runeblade 3D texture". The importer:

1. Cuts out the magenta and any leftover guide colours.
2. Keeps each view's main shape.
3. Rescales each view so it runs from the pommel line to the point line, and centres it on its blade axis. Small
   placement errors are fixed this way.
4. Snaps the views to the 4 x 4 art-pixel grid.
5. Writes `assets/fx/runeblade/runeblade3d.png` and `.json`. It prints a note for anything it had to correct.

To make it a selectable skin, save it as `assets/source/runeblade3d/<skin_id>_sheet.png`, run
`python tools/runeblade3d.py skins`, and add the skin to `RUNEBLADE_SKINS` in `src/gfx/runeblade3d.js`.

A single front view also works: one sword pointing down on magenta, like the five skin concepts. The game then
mirrors the front for the back, works out the thickness itself, and finds the six sockets on the blade. Save it as
`assets/source/runeblade3d/<skin_id>.png`. The SIDE and BACK views make a better model, so they are still the
recommended way.

Reload the game: the new skin joins the level rotation. Check it with `node tools/tests/runeblade3d.js`,
which writes turntable and in-game shots to `tools/tests/out/`.

The kit is rebuilt with `python tools/runeblade3d.py kit`. The full technical write-up is `docs/RUNEBLADE_3D.md` in
the repo.
