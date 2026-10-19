# Death Knight Runeblade kit

Everything needed to draw the Death Knight's Runeblade (his class signature: the hovering sword that takes six runes,
and the giant sword of RUNIC OBLITERATION) as real sprites in the VELSCOUR style. Today the game draws both swords
with simple shapes; these nine sprites replace that. The game rotates each blade, so no swing frames are needed.

## What's in the zip

| File | What it is |
|---|---|
| `PROMPT.txt` | The message to paste into ChatGPT with this zip attached, plus the follow-up messages. |
| `SPEC.md` | Exactly what to draw: the nine sprites, cell sizes, the anchor, rune slot positions, how the game uses them. |
| `STYLE.md` | The VELSCOUR style lock (Grim Nocturne) and palette, cut down to what a sword and its runes need. |
| `templates/runeblade_sheet1_hover_template.png` | Sheet 1 (3x): HOVER, HOVER CHARGED, RUNE S FROST / UNHOLY / BLOOD. |
| `templates/runeblade_sheet2_greatblade_template.png` | Sheet 2 (2x): GREATBLADE, RUNE L FROST / UNHOLY / BLOOD. |
| `examples/*_layout_example.png` | The same sheets filled with a flat mock-up: where things go. **Not** the style. |
| `reference/death_knight_with_runeblade_reference.png` | The Death Knight at blade scale with the sword at his shoulder, and the greatblade beside him. |
| `reference/runeblade_palette.png` | The exact colours. |
| `reference/runeblade_in_game_now.png` | The Runeblade as the game draws it today (placement only). |

## How to use it in ChatGPT

1. Start a new chat. Attach this zip and paste the **first message** from `PROMPT.txt`. ChatGPT reads the files and
   answers with its design card and a plan. Nothing is drawn yet.
2. Paste the **sheet 1** message and attach `templates/runeblade_sheet1_hover_template.png` and
   `examples/runeblade_sheet1_layout_example.png` again (image tools work best with the images attached in the same
   message). Check the result against the checklist below. If something is off, say what, and ask for that sheet again.
3. Do the same for **sheet 2**, attaching the result of sheet 1 too, so the greatblade and runes match.
4. Download both PNGs at full size (1536 x 1024).

## Checklist for each sheet

- [ ] 1536 x 1024, flat magenta background, no labels or guide lines left.
- [ ] Chunky, even pixels (3 x 3 blocks on sheet 1, 2 x 2 on sheet 2), no blur or soft shading.
- [ ] Every blade points straight down on its centre line, the crossguard's centre on the crossguard line, the point
      on the tip line.
- [ ] Six empty rune slots on the centre line at the green squares.
- [ ] HOVER CHARGED is HOVER plus glow, nothing else changed.
- [ ] The runes are abstract glyphs (no letters), each in its own colour, centred in its cell.
- [ ] No glow or halo painted outside the shapes; the design still works mirrored.

## Bringing it into the game

Give both PNGs to Claude Code in the VELSCOUR repo and ask it to import the Runeblade sprites. It will cut the cells
by the boxes in `SPEC.md`, check the pixel blocks, and switch `src/game/sigs/deathknight.js` from the drawn shapes to
the sprites. The kit is rebuilt with `python tools/chatgpt_runeblade_kit.py`.
