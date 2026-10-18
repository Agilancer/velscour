# Sheet prompts

Every chat starts with `02_MASTER_PROMPT.txt`. Once you have them, also attach **`STYLE_LOCK.md` and
`style_lock_sheet.png`** (made in step 1). Then attach the template (and any references the prompt names) and paste
one of the prompts below. **One sheet per message.** Keep one chat per class for heroes, so ChatGPT keeps the class in
view; start a new chat when it starts drifting, and paste the master prompt again.

Fill in everything in [brackets].

---

## Step 1: style lock (once for the whole game)

Attach: `templates/0_style_lock_sheet.png`, `reference/palette.png`, `reference/current_heroes_lineup.png`,
`reference/pixel_scale_guide.png`.

```text
SHEET: STYLE LOCK. Attached: the style-lock template (1536x1024, 18 labelled boxes), our palette, the current
heroes (identity reference only, the style is being replaced) and the pixel scale guide.
Paint each box as a material sample in GRIM NOCTURNE at 3x scale (one art pixel = a 3x3 block): a small object or
surface that shows the material lit from the upper left with the moonlit rim on its back-right edges: a riveted plate
corner, a strip of mail, a gilt trim band with one gem, a strapped leather bracer, a folded wine-red cloth corner,
coarse wool, a bone carving, a fur clump, three faces' cheeks (light, medium and deep skin), a cut gem with an
emissive core, hellfire tongues, frost crystals, a rune glowing arcane violet, and dark plate with the moonlit rim.
Use only the palette ramps. Remove labels and guides. Flat magenta background.
```
Then paste `04_STYLE_LOCK_REQUEST.txt` to get the style documents. Save both. Approve or redo until you love it:
**every later image is judged against this sheet.**

## Step 2: pose master (once per class, 16 sheets)

Attach: `templates/1_pose_master/<class>_pose_master.png`, `reference/classes/<class>_current.png`,
`reference/canonical_stance.png`, plus the style lock files.

```text
SHEET: POSE MASTER for the [CLASS]. Attached: the pose-master template, the class's current art (identity reference:
face, hair, skin, build; NOT the style) and the canonical stance.
Draw ONE figure in the large frame at 4x scale (one art pixel = a 4x4 block): the [CLASS] hero, [class line from the
art bible section 12], in the GRIM NOCTURNE style, wearing only the plain underlayer: a padded arming doublet or
gambeson in muted [class colour], linen shirt, trousers, simple leather shoes, a plain belt. Bare head. Empty hands
loosely clenched. The stance exactly as the template: crown on the top yellow line, soles on the bottom yellow line,
chin, shoulders, elbows, belt, crotch, knees and ankles on their lines, fists and feet inside their cyan circles,
body inside the cyan dashed stance contour (it may be slimmer, not wider). 108 art pixels from crown to sole.
The face must be striking and memorable, keep the class identity, but designed fresh. Max 40 colours.
Keep the left column untouched; draw only in the big frame. Remove all guides and labels.
```
Fix anything off (pose, face, palette) with follow-ups: "Keep everything identical except: ...". When it's right:
```bash
python tools/chatgpt_art.py posemaster <sheet.png> <names.json>    # names: {"class": "paladin"}
python tools/chatgpt_style_kit.py                                  # rebuild templates: armor/overlays now use it
```

## Step 3: body armors (5 per sheet)

Attach: `templates/2_armor/<class>_armor.png` (rebuilt with your pose master), the pose master PNG, style lock files.

```text
SHEET: 5 BODY ARMORS for the [CLASS]. Attached: the armor template (pose master on the left), the pose master,
the style lock. 1536x1024; the five frames are at 2x (one art pixel = a 2x2 block). In each frame draw the POSE MASTER
wearing a new outfit: the identical head (copy its pixels), identical stance on every landmark, only the clothing
and armor change. Five structurally different designs, each with its own silhouette idea, all in the [CLASS]'s motif
family ([motifs]):
1 = [rarity]: [idea]   2 = [rarity]: [idea]   3 = [rarity]: [idea]   4 = [rarity]: [idea]   5 = [rarity]: [idea]
Bulk may grow up to 8 art pixels per side and pauldrons up to 6 above the shoulder line; joints never move. No
helmet, hood, hat or crown. Gloves and boots belong to the outfit. Max 40 colours per armor. Keep the left column
as attached. Remove all guides. Flat magenta background.
```
Names file: `{"class": "<class>", "style": "nocturne", "armors": [{"name": "...", "rarity": "..."} x 5]}`.
Import: `python tools/chatgpt_art.py armor <sheet> <names.json>` (pixel-locked: no rescaling, frames go to
`assets/source/gear_nocturne/<class>/armor/`).

Design idea starters per rarity (mix, never repeat): Common - patched gambeson with a dented breastplate, rope-tied
pauldron, salvaged mail skirt. Uncommon - matched brigandine, riveted bracers, studded tassets. Rare - fluted plate with
gilt edges, heraldic tabard, layered spaulders. Epic - engraved cuirass with relief saint or beast, asymmetric
great-pauldron, embroidered surcoat, gem buckles. Legendary - reliquary plate with a glass-cased relic, chain
censers, a burning sigil core. Mythic - armor grown from bone, frozen flame plates, star-iron with drifting runes.

## Step 4: overlays (helmets, gloves, boots: 5 of each per sheet)

Attach: `templates/3_overlays/<class>_overlays.png`, the pose master, style lock files.

```text
SHEET: OVERLAYS for the [CLASS]: 5 helmets, 5 pairs of gloves, 5 pairs of boots. Attached: the overlay template,
the pose master, the style lock. 1536x1024 at 3x (one art pixel = a 3x3 block). Each cell shows, as a cyan dashed
contour, exactly where the pose master's head, fists or legs are. Draw ONLY the equipment piece on that exact spot,
fitted to it, as it will be layered over the hero in game:
- HELMETS row (40x40 art pixels each): helmets that sit on the pose master's skull; open helms leave the face area
  as empty magenta so the face shows through; crests or horns may rise above the cell top but stay in the cell.
- GLOVES row (two cells per pair, screen-left fist then screen-right fist, 24x24 art pixels each): gauntlets or
  gloves over the same clenched fists, same angle, covering hand and wrist.
- BOOTS row (76x40 art pixels each): both boots and greaves over the pose master's shins and feet, soles exactly on
  the bottom yellow line.
Pieces: [helmet 1-5 ideas] / [gloves 1-5 ideas] / [boots 1-5 ideas], rarities [..]. Max 20 colours per piece.
Everything that is not the piece stays flat magenta (no head, no hands, no legs). Remove all guides.
```
Names file: `{"class": "<class>", "helmets": [{"name", "rarity"} x5], "gloves": [...], "boots": [...]}`.
Import: `python tools/chatgpt_art.py overlays <sheet> <names.json>` -> full 128 x 192 layers in
`assets/source/gear_nocturne/<class>/<slot>/`.

## Step 5: the rest of the world in the same style

Use the existing kits (`docs/art_kits/`) for layout, and add this paragraph to their sheet prompts:

```text
STYLE: GRIM NOCTURNE (master prompt and style lock attached). Same art-pixel density as our heroes: the hero is 108
art pixels tall. Draw this sheet so that one art pixel is a [2x2 / 3x3] block, and size each figure by the art-pixel
heights from the art bible section 1 table ([e.g. imps 60, men 100, brutes 130]). Same palette, sel-out outlines,
upper-left key light, segmented moonlit rim on the back-right edges, no glow outside silhouettes.
```
- Enemies / bosses: FF6-style presence and ornament with Diablo II grime; one focal feature per boss.
- Townsfolk: the same 11 frames; plainer materials; identical design frame to frame.
- Pets: identical design frame to frame; only the pose changes.
- Biomes (`docs/biome_kit/`): at tile resolution use clusters of 2-3 px; keep floors and walls 1-2 ramp steps darker
  and less saturated than characters; the moonlit rim appears on wall tops and prop edges facing back-right.
