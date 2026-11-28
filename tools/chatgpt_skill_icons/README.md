# VELSCOUR skill icon kit for ChatGPT

VELSCOUR is a browser action RPG with 19 hero classes. Every class has 36 skills (4 trees of 9) and 24 passive
talents (3 branches of 8), and its own ultimate. The {{PAINTED_CLASSES}} already have painted icons for every skill and
talent. The other classes still use simple shapes drawn in code. This kit is everything needed to paint the missing
icons in the same style, and to hand them back in a package the game can import.

| | Have painted art | Need art |
|---|---|---|
| Skills | {{SKILLS_ART}} (of which {{SUMMON_ART}} are older creature-portrait icons on summon skills) | {{SKILLS_TODO}} |
| Talents | {{TALENTS_ART}} | {{TALENTS_TODO}} |
| Class ultimates | 0 | {{ULTS_TODO}} |

The work is **{{N_BATCHES}} batches**. A batch is one 1024 x 1024 image holding nine icons in a 3 x 3 grid:
- **{{SKILL_FIRST}}-{{SKILL_LAST}}: skills** ({{N_SKILL_BATCHES}} batches, one per skill tree: {{TODO_CLASSES}}). Most important.
- **{{ULT_FIRST}}-{{ULT_LAST}}: class ultimates** ({{N_ULT_BATCHES}} batches).
- **{{TAL_FIRST}}-{{TAL_LAST}}: talents** ({{N_TALENT_BATCHES}} batches, one per talent branch: eight icons, cell 9 empty).

---

## Part 1: for you, the person running the chat

1. Start a new ChatGPT chat with a model that can make images and run Python.
2. In the first message, **upload this zip and attach these four images as pictures** (the image tool cannot see
   files inside a zip):
   - `style_reference/STYLE_REFERENCE.png` (the look to match)
   - `templates/template_3x3.png` (the layout)
   - `templates/template_3x3_cell_numbers.png` (the cell order)
   - `examples/example_skills__paladin_holy_wrath.png` (a finished batch)

   Then paste:
   > Unzip the kit and read README.md and STYLE_LOCK.md. Follow "Part 2: for ChatGPT". Start with batch 001.
3. ChatGPT paints one batch per message. **Download each image**, ideally saved under the name ChatGPT gives
   (for example `barbarian__skills_t0.png`). Then say **next**.
   - Not right? Say "redo batch 012: cell 4 should show ...". Download the new one too. The newest one wins.
   - When the talent batches start, attach `templates/template_talents_3x3.png` and `examples/example_talents__monk_branch1.png`.
   - If ChatGPT starts drifting from the style, re-attach `STYLE_REFERENCE.png` and say "follow the STYLE LOCK".
4. **Pack** whenever you like (after every 10 batches is a good habit, and at the end): upload the downloaded images
   in one message (up to about 10 at a time) and say **pack**. ChatGPT gives you `{{RETURN_ZIP}}`. Download it.
   - If ChatGPT can't pack, zip the downloaded images yourself. That works too.
5. Give the return zip (or several of them, or the loose images) to Claude in the VELSCOUR repo and say *"import
   this skill icon package"*. Partial packages are fine. Missing icons keep the art they have now.

`ICON_LIST.md` (and `icon_list.csv`) lists every skill, talent and ultimate with its status. `overview/` shows each
class's icons as the game draws them today, with painted art outlined green and code-drawn icons outlined red.

---

## Part 2: for ChatGPT

You are painting skill icons for VELSCOUR. **Read `STYLE_LOCK.md` first and follow it exactly.** The attached
`STYLE_REFERENCE.png` (and every file in `style_reference/`) shows the existing icons. Yours must be indistinguishable
from them in style.

### Files in this kit
- `STYLE_LOCK.md`: the style rules. They are binding.
- `prompts/NNN_<batch id>.txt`: one per batch, in order. Each names the nine skills (cell by cell, with element,
  what the skill does and what to show) and the file name. `ALL_PROMPTS.txt` is all of them in one file.
- `icon_list.json`: the machine-readable list: `batches[]` (id, order, cells[9] = icon ids) and `icons[]`.
- `templates/`: `template_3x3.png` (layout), `template_3x3_cell_numbers.png` (order), `template_talents_3x3.png`
  (cell 9 empty), `template_last_ultimate_3x3.png` (only cell 1 used).
- `examples/`: finished batches made from the game's own icons. They are enlarged from the game's 64 px icons, so they
  look soft: copy their layout and look, but paint yours crisp and sharp at full size.
- `style_reference/`: every painted skill and talent icon of the five finished classes, one sheet per class and kind.
- `class_portraits/<class>.png`: the in-game hero of each class (small pixel sprites: use them for costume and
  colours, not for style).
- `chatgpt_skill_icons.py`: the packer (Pillow only).

### Painting a batch (repeat for every batch, in order)
1. Print the batch's prompt with Python (`prompts/NNN_*.txt`) and read it all.
2. Make **one 1024 x 1024 image** with your image tool, following the prompt, the STYLE LOCK and the template layout:
   magenta (#FF00FF) border and gutters, nine square icons, filled left to right, top to bottom.
3. Under the image, write the batch id and file name ("Batch 007: `barbarian__skills_t2.png`. Download it under that
   name, then say next.").
4. Only one batch per image. Never combine batches, never skip a cell, never change the order. Paint the cells marked
   "already has an older creature-portrait icon" too.
5. When the person says "next", go on to the following batch. If they ask for a redo, repaint the whole batch with
   the change they asked for.

Write a short (under 25 words) visual plan for each cell before you paint, so that the nine icons differ clearly.

### Packing (when the person says "pack")
1. Unzip the kit to `/mnt/data/kit` if you have not already. Put every sheet image the person uploaded into
   `/mnt/data/sheets/`.
2. A file name that contains its batch id (for example `barbarian__skills_t2.png`) is matched automatically. For every
   other file, **look at the image**, decide which batch it is from the conversation and its content, and write
   `/mnt/data/sheet_map.json` as `{"<file name>": "<batch id>", ...}`.
3. Run:
   ```
   python /mnt/data/kit/chatgpt_skill_icons.py pack /mnt/data/sheets --list /mnt/data/kit/icon_list.json --map /mnt/data/sheet_map.json --out /mnt/data/{{RETURN_ZIP}}
   ```
   (Leave out `--map` if every file name already has its batch id.)
4. Read the report. Show `preview.png` from inside the zip (one row per batch, the nine cut icons) and check each
   row: the right icons, none cut off, no magenta left. If a sheet's grid was "NOT found" (dark gutters, empty cells), look at its row closely.
5. Give the person the download link to `{{RETURN_ZIP}}` and the list of batches still to paint.

### The return package (made by the packer, do not hand-edit)
```
{{RETURN_ZIP}}
  manifest.json          {"kit": "velscour-skill-icons", "version": 1, "sheets": {...}, "icons": {"<icon id>": "icons/<icon id>.png"}}
  sheets/<batch id>.png  the sheets as painted
  icons/<icon id>.png    each icon cut out, {{ICON_PX}} x {{ICON_PX}} px (ids like "barbarian.2.4", "lancer.1.dauntless_wall", "ult.bard")
  preview.png            contact sheet for checking
```
