# Lancer War Banner kit

Everything needed to draw the Lancer's war banner (his class signature, "Rally the Order") as real animated sprites in
the VELSCOUR style. Today the game draws the banner with simple shapes; these sprites replace that.

## What's in the zip

| File | What it is |
|---|---|
| `PROMPT.txt` | The message to paste into ChatGPT with this zip attached, plus the follow-up messages. |
| `SPEC.md` | Exactly what to draw: frames, sizes, anchor points, timing, and how the game uses each piece. |
| `STYLE.md` | The VELSCOUR pixel-art rules and palette, cut down to what a banner needs. |
| `templates/banner_sheet1_cloth_template.png` | Sheet 1: 12 cloth frames (CALM 1-6, RALLIED 1-6). |
| `templates/banner_sheet2_parts_template.png` | Sheet 2: the pole, RALLY 1-4, ROLL 1-3. |
| `examples/*_layout_example.png` | The same sheets filled with a flat mock-up: where things go and how they move. **Not** the style. |
| `reference/lancer_with_banner_reference.png` | The Lancer at banner scale with the banner on his back at 0%, 50% and 100% Valor. |
| `reference/banner_palette.png` | The exact colours. |
| `reference/banner_in_game_now.png` | The banner as the game draws it today (placement only). |

## How to use it in ChatGPT

1. Start a new chat. Attach this zip and paste the **first message** from `PROMPT.txt`. ChatGPT reads the files and
   answers with its design card and a plan. Nothing is drawn yet.
2. Paste the **sheet 1** message and attach `templates/banner_sheet1_cloth_template.png` and
   `examples/banner_sheet1_layout_example.png` again (image tools work best with the images attached in the same
   message). Check the result against the checklist below. If something is off, say what, and ask for that sheet again.
3. Do the same for **sheet 2**, attaching the result of sheet 1 too, so the cloth matches.
4. Download both PNGs at full size (1536 x 1024).

## Checklist for each sheet

- [ ] 1536 x 1024, flat magenta background, no labels or guide lines left.
- [ ] Chunky, even pixels (each art pixel a 3 x 3 block), no blur or soft shading.
- [ ] Pole and cloth centred on the frame's centre line; the cloth's top edge doesn't move between frames.
- [ ] The same cloth, emblem and colours in every frame; only folds and sway change.
- [ ] CALM 6 flows back into CALM 1 (and RALLIED 6 into RALLIED 1).
- [ ] No text; the design still works mirrored.

## Bringing it into the game

Give both PNGs to Claude Code in the VELSCOUR repo and ask it to import the Lancer banner sprites. It will cut the
frames by the cell boxes in `SPEC.md`, check the 3 x 3 blocks, and switch `src/game/sigs/lancer.js` from the drawn
shapes to the sprites. The kit is rebuilt with `python tools/chatgpt_banner_kit.py`.
