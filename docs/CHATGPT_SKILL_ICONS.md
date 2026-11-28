# ChatGPT skill icon kit

`docs/art_kits/ChatGPT_Skill_Icon_Kit.zip` is everything ChatGPT needs to paint the skill, talent and ultimate icons
the game still draws in code, in the style of the painted ones, and to return them as a package that imports straight
into the game.

## Where the game's icons stand (November 28, 2026)
`skillIcon()` in `src/ui/icons.js` draws a skill from a painted sheet when `assets/ui/skills/<class>_skills.png`
exists (4 rows = trees x 9 columns = skills, any cell size) and talents from `<class>_talents.png` (3 x 8).
Everything else is an element gradient and a shape, except summon skills, which show their summon's creature art.

| | Painted | In code |
|---|---|---|
| Skills (19 x 36) | 236: all of the Paladin, Ranger, Wizard, Necromancer and Monk (180 cells) + 56 summon creature portraits | 448 |
| Talents (19 x 24) | 120: the same five classes | 336 |
| Ultimates (19) | 0 (`ultimateIcon()` emblems) | 19 |

(The asset manager's "No painted skill icons exist yet" is out of date: the five sheets came with PR #250.)

## The kit
Built from the live game, so names, descriptions and statuses always match the code:
```bash
python3 -m http.server 8123 &
NODE_PATH=/opt/node22/lib/node_modules node tools/chatgpt_skill_icons_export.js   # every icon as drawn today -> tools/tests/out/skill_icons_export/
python tools/chatgpt_skill_icons.py kit [--unpacked DIR]                       # -> docs/art_kits/ChatGPT_Skill_Icon_Kit.zip
python tools/tests/chatgpt_skill_icons.py                                       # round trip: fake sheets -> pack -> import --dry
```
Contents: `README.md` (steps for the person, then for ChatGPT), `STYLE_LOCK.md` (the style rules, taken from the
painted sheets), `prompts/NNN_<batch>.txt` + `ALL_PROMPTS.txt`, `ICON_LIST.md` / `icon_list.csv` / `icon_list.json`
(every icon, has art or not, batch and cell), `templates/`, `examples/` (painted trees laid in the template),
`style_reference/` (`STYLE_REFERENCE.png` and every painted sheet at 2x), `overview/` (each class as the game shows it
today, green = art, red = code), `class_portraits/`, and `chatgpt_skill_icons.py` (the packer). The text lives in
`tools/chatgpt_skill_icons/` (`{{...}}` fields are filled with the counts); class looks and element colours are
`IDENTITY` and `EL_LOOK` in `tools/chatgpt_skill_icons.py`.

A **batch** is one 1024 x 1024 image: nine 320 px cells in a 3 x 3 grid, 16 px magenta border and gutters.
101 batches: 56 skill trees (14 classes x 4, the tree's nine skills in their in-game 3 x 3 order), 3 of ultimates
(9, 9, 1), 42 talent branches (eight nodes, cell 9 empty). Summon skills with creature portraits are in their tree's
batch too, flagged as optional, so a class's sheet matches.

## The return package
ChatGPT runs `chatgpt_skill_icons.py pack <sheets> --list icon_list.json [--map sheet_map.json]`: files are matched
to batches by the batch id in their name, or by the map ChatGPT writes after looking at them. Output
`VELSCOUR_Skill_Icons_Return.zip`: `manifest.json`, `sheets/<batch>.png`, `icons/<id>.png` (256 px), `preview.png`.
Cutting: the magenta gutters are found by column/row profile; without them (dark gutters, mostly-empty sheets) the
template's boxes scaled to the image, widened by half a gutter and trimmed back to the art. Key colour left on the
edges is darkened; the inside of an icon is never touched (arcane violet is not the key).

## Importing
```bash
python tools/chatgpt_skill_icons.py import <return.zip|dir|loose sheets> [more...] --dry   # preview: tools/tests/out/skill_icons_import/
python tools/chatgpt_skill_icons.py import <return.zip|dir|loose sheets> [more...]
```
Writes `assets/ui/skills/<class>_skills.png` and `<class>_talents.png` at 128 px cells, and `ultimates.png`
(1 x 19, class order of `CLASS_SKILLS`). Per cell: the new icon, else the existing painted sheet's cell, else the icon
the game draws today (from the export, so run the export first). Skills and talents need no code change; the
loader picks the sheets up. **Ultimates are not wired yet**: `ultimateIcon()` has to read `ultimates.png` first.
After an import, run `ui.js`, `hud.js` and `mobile.js`, look at the skill tree and bar, then rebuild the asset manager.
