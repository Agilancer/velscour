# Class art: Grim Nocturne gear (hero look) and class art packs (weapons, effects)

Two kinds of art drive a class's look:
- **Grim Nocturne gear** (all 16 classes, October 18, 2026): 12 body armors per class (two per rarity) and one
  enclosed helmet per class and rarity (Common to Legendary; Mythic helms wear the Legendary design). Built from the
  user's style-locked zips by `tools/nocturnegear.py`. It replaced the `assets/FinalClasses/<class>.zip` libraries
  (80 armors) and the Common/Rare helmet atlases; those zips stay in the repo as source but are no longer read.
- **Class art packs** (`assets/source/classes/<class>/`, Paladin only so far): weapon/shield catalog items and the
  60 ability effects.

## Grim Nocturne gear
### Source zips (kept outside the repo; F:\!  VELSCOUR\...)
- `Grim_Nocturne_All_16_Classes_Artwork.zip`: 96 high-res armors (6 rarities x 16), bare-headed, empty-handed.
- `Grim_Nocturne_All_16_Classes_Game_Exports.zip`: their 128 x 192 natives. Only used to place each class's head:
  their pasted "shared head patch" has stray pale-blue/black blocks, so the armors are re-cut from the artwork.
- `VELSCOUR_96_Additional_Armor_Source_Artwork.zip`: a second set of 96, high-res only (no game exports).
- `VELSCOUR_80_Helmets_Game_Exports.zip`: 80 helmets as 40 x 40 cutouts pinned at (45,63) on the 128 x 192 frame,
  plus full-colour layers (`layers_fullcolor`, every class but the Arcane Sorcerer, whose palette-limited layer is used).
- `VELSCOUR_STYLE_LOCK_DOCUMENTS.zip` (STYLE_LOCK.md, CLASS_CARDS.md, HELMET_OVERLAY_ADDENDUM.md, prompt templates):
  the art direction for any new armor or helmet. Helmets are fully enclosed and draw only exterior surfaces.

### Importer (`tools/nocturnegear.py`, needs pillow numpy scipy)
```bash
python tools/nocturnegear.py import <dir>   # <dir> holds the zips unpacked as gn_art/ gn_exports/ armor96/ helm_exports/
python tools/nocturnegear.py build          # or: python tools/process_assets.py gear
```
`import` writes the natives to `assets/source/gear_nocturne/<class>/` (`armor_NN_<rarity>[_additional].png`, odd ids
the Grim Nocturne set, even ids the additional set; `helmet_<rarity>.png`). Each armor is downsampled like the Game
Exports (premultiplied box filter, binary alpha, sole at y 183, 108 art px crown to sole). The Common armor is
centred where its export was; every other armor keeps its sole at y 183 and gets the scale (0.9-1.2x) and x offset
that best match its head to the Common armor's head, because wings, spikes and pauldrons can rise above the crown.

`build` writes, per class, `assets/sprites/gear/<class>/`: `armor.webp` (6 x 2 cells of 128 x 192, lossless),
`armor_mask.png` (255 = never recoloured: face, hair and neck found by colour around the head; the Barbarian's bare
skin; the Slime Lord's blue slime) and `gear.json` (frame, `headTop` 75, `feet` 183, `helmPin`, rarity `bands`,
boxes, and `armor.head`: each armor's measured head offset from armor 1's, which the helmet follows). Shared:
`assets/sprites/gear/helmets/` (`atlas.png`: a column per class, a row per design, 40 x 40 cells; `index.json` with
each design's `rarity`; `placements.json`, kept across builds) and `classes.json`. Never hand-edit these.

### Helmet fitting
Every helmet draws its 40 x 40 cell at (45,63) of the hero frame, shifted by the armor's `armor.head` offset, so size
and placement are the same for every class. The exported helmets were wider than the heads, so `build` narrows each
class's helmets with an area resample (`HELM_SCALE` in `tools/nocturnegear.py`: 84% wide and 92% tall, 80% wide for
the small-skulled Paladin, Necromancer, Barbarian and Death Knight), about the class's head centre and the helmet's
bottom edge; the source PNGs stay untouched. To nudge one: double-click `Fit Helmets.cmd` (or
`python tools/helmet_fit_server.py`), pick a class and design, drag/scroll it, and **Save to game**. That writes
`{x, y, scaleX, scaleY, rotation}` (cell top-left in frame pixels) for that class and design into `placements.json`;
an empty file means the default pin. The game and the fitter share `src/core/helmetfit.js`. More helmet designs per
rarity can be added as more atlas rows (`index.json` designs with a `rarity`); a helm picks among its rarity's designs.
Check: `node tools/tests/closed_helms.js all` (face covered, centred on the head, body untouched, swap-safe;
`closed_helms_<class>.png`: a row per helmet, a column per armor).

### Game
- `src/core/gearart.js` loads the played class's armor library and the shared helmet atlas. Their URLs carry a
  version (`V`): **bump it whenever the gear art is rebuilt**, or a browser can pair a cached `gear.json` with a new
  atlas. An atlas that doesn't match its `gear.json` is refused (the old class sprite stands in).
- **Item looks**: body armor and helmets get `item.look = [design, finish, aura, 2]` on first use (saved with the
  item; the trailing 2 marks the Grim Nocturne library, so looks rolled before it are rerolled once). Armor picks one
  of its rarity's two designs; a helm picks a design of its rarity. Finishes: 44 hand-made palettes plus Original
  (`PALETTES` in `src/data/gear.js`), tier r-2..r for the item's rarity; armor keeps its original colours 10% of the
  time, helms always take a finish. Aura (body armor only): `GEAR_FX`, 45% of Rares, every Epic, Legendary and Mythic.
- **Palette swap** (`recolorPx`): each pixel is split into four materials by colour: neutral metal, dyed cloth (cool
  hues and reds), bright warm trim (gold, brass, parchment) and the dark warm base (bronze plate and leather, most of
  a Grim Nocturne outfit). Each maps through the finish's 4-stop ramp by luminance and is rescaled to the original
  luminance so the shading survives, blended at 0.8 (Common finishes) or 0.88. Every finish sets the four materials
  to contrasting colours, so a swap changes three or four colours rather than tinting the whole outfit.
- **Helmet composite** (`heroLook`, cached): armor in its finish, then the helmet cell in its own finish. Icons use the
  same cell and palette; the inventory portrait includes its bounds.
- **Drawing**: `Player.artFrame()` gives the composite to `Creature.drawArt`; `heroFrame` scales head top (75) to
  feet (183) to the hero's height.
- **Auras** (`src/gfx/gearfx.js`): unchanged; colour is the aura's own, else the finish's cloth colour, else the rarity colour.
- Check: `node tools/tests/gear.js [classes|all] [nofx]` -> `gear_<class>_sheet.png` (6 rarities x 12 looks, odd
  columns helmed), `gear_inventory.png`, `gear_fx_NN_<aura>.png`.

## Class art packs
### Pack format (`assets/source/classes/<class>/`)
The folder exactly as the art generator delivers it:
- `catalog*.json`: `weapons` [[rarity, "W01 Name", ...]], `abilities` [[rarity, ["F01 Name", "description"], ...]]
  (its `armor` and `helmets` entries are ignored now). **The catalog is authoritative**; printed sheet labels are only
  used to find the layout (misprinted IDs such as W23/W22 don't matter, items are named by grid position).
- `README.md`, `correction-prompts.json` (kept for reference).
- Sheets: `<class>_<rarity>_abilities*.png` (10 effects x 6 stages), `<class>_weapons*.png` (6 rarity rows x 10).
  The highest `_vN` of a sheet wins.
- Optional `import.json` overrides: `kinds` {ID: weapon|shield}.

The first Paladin pack's armor pose sheets (10 outfits x 12 ATK/CAST poses per rarity) and helmet sheet were
removed in favour of the gear library, with the pose code.

### Importer (`tools/classart.py`)
```bash
python3 tools/process_assets.py classes            # every pack (~2 min for the Paladin)
python3 tools/process_assets.py classes paladin
```
It prints found/expected counts per sheet and `MISMATCH` lines, then "class art OK" when every catalog entry was found.
- **Labels** are found as text (bright strokes, light box frames removed), grouped into labels, and used as layout:
  item labels give each item's cell (the space above its label), ability sheets' stage headers and row labels give the grid.
- **Mattes**: a sheet with a real alpha is hardened (`matte_alpha`). A sheet whose alpha is a blurred haze over a
  painted backdrop (weapons: measured by `alpha_haze`) is keyed against a smooth backdrop model (`matte_backdrop`);
  effects get soft alpha with the backdrop colour un-mixed.
- **Effects**: each piece goes to the stage column holding its centre; the 6 stages share one crop so drawn motion is kept.
- **Shield vs weapon**: shield words in the name, else shape (upright and solid vs diagonal).

Output (generated, never hand-edit), `assets/sprites/classes/<class>/`: `fx/<F..>.webp` (6-frame strip),
`items.webp` (icon atlas), `<class>.json`; plus `assets/sprites/classes/packs.json`.

### Game
- `src/core/classart.js` loads only the played class's JSON + item atlas (`game.newChar`/`loadChar` are async and await it);
  effect strips load lazily (bar skills' effects are preloaded on entering a world).
- **Items** (`setClassItems` in `src/data/items.js`): while that class plays, weapon/shield drops, vendor stock and
  starting gear become catalog pieces of the rolled rarity (`item.art`, `artCls`, `uname`), with their icons.
  Weapon bases come from the name (`catalogBase`). **Mythic** (rarity 5, red) was added above Legendary.
  Old saves: body armor / helmets that were catalog pieces lose `art` (their look comes from the gear library) and keep their name.
- **Effects** (`src/gfx/artfx.js`, mapping `SKILL_FX` in `src/data/classart.js`) play over the skill's own VFX: ahead of the
  hero for melee/projectiles/beams/dashes, at the target for aoe/strikes/rain/curses, on the hero otherwise, scaled to the skill's radius.

### Adding the next class pack
1. Drop the pack into `assets/source/classes/<class>/` (`git mv` if uploaded elsewhere).
2. `python3 tools/process_assets.py classes <class>`; fix any MISMATCH with `import.json`.
3. Add `SKILL_FX.<class>` (skill name -> effect ID) in `src/data/classart.js`.
4. Check with `node tools/tests/classart.js <class>` and look at `tools/tests/out/ca_*.png`.

Art requests that would make the next packs import cleaner: a fixed cell grid with uniform cells, true transparency
(no painted backdrop or alpha haze), labels kept well away from art, and (from the Paladin README) Slime Lord blue
and more humanoid. For the gear libraries: idle/walk/attack frames of the same armors would let the hero animate.

## Paladin ability mapping
Effects were matched by theme; rarity tier does not follow skill row. Ambiguous picks are marked *.

| Skill | FX | Skill | FX | Skill | FX |
|---|---|---|---|---|---|
| Smite | F02 Iron Smite | Shield Bash | F06 Buckler Flash | Zealous Strike | F25 Wolf Verdict |
| Holy Bolt | F04 Candle Bolt | Holy Shield | F12 Chapel Ward | Sacrifice | F08 Cinder Tap * |
| Blessed Light | F18 Mending Wisp | Rally Banner | F09 Oath Mark | Holy Fire | F36 Furnace Wrath |
| Radiant Spark | F19 Vigil Spark | Defiance | F01 Votive Spark * | Sweep | F21 Raven Judgment |
| Blessed Hammer | F28 Confessor Halo * | Charge | F14 Pilgrim Dash | Zeal | F11 Thorn Lash |
| Sacred Lance | F30 Reliquary Beam | Vengeance Aura | F29 Rose Thorns | Vengeance | F31 Eclipse Smite |
| Consecration | F05 Prayer Ring | Bulwark Slam | F13 Bell Pulse | Thunder Strike | F34 Storm Litany |
| Divine Strike | F23 Grave Light | Guardian Angel | F35 Sable Wings | Cleansing Blade | F20 Censer Breath * |
| Hammerstorm | F46 Halo Collapse * | Righteous Fire Aura | F16 Ember Seal | Crusader's Flurry | F37 Veil Rupture * |
| Fist of the Heavens | F42 Cathedral Fall | Shield Throw | F22 Moon Cleave | Elemental Wrath | F26 Tide Absolution |
| Sanctuary | F07 Mercy Mote | Holy Freeze Aura | F48 Winter Mercy | Sword of Justice | F15 Litany Bolt |
| Judgment Beam | F44 Dawn Wound | Avenging Charge | F49 Cinder Roar | Templar's Whirl | F55 Abyssal Pardon * |
| Wheel of Hammers | F45 Gravebell Toll * | Aegis | F40 Basilica Ward | Blade Barrage | F47 Obsidian Oath |
| Heaven's Wrath | F50 Star Requiem | Conviction | F38 Inquisitor Brand | Valkyrie Strike | F41 Ash Ascension |
| Purifying Nova | F10 Purge Puff | Martyrdom | F59 Covenant Blood | Inquisition | F27 Gallows Bind |
| Seraph's Gaze | F51 Godless Light | Crusader's Leap | F03 Dust Step | Swords of Light | F17 Chain Rebuke * |
| Hammer of the Gods | F60 Final Amen | Divine Shield Nova | F58 Heaven Shatters | Final Judgment | F43 Kingless Edict |
| Apocalypse of Light | F52 Last Sun | Fanaticism | F24 Crimson Vow | Storm of Swords | F32 Martyr Spikes |
| Divine Intervention | F53 Deathless Grace | Bastion | F33 Bone Benediction | Crusade | F54 Thorn Apotheosis |
| Archon's Radiance | F39 Bleeding Dawn | Champion's Call | F57 Eternal Funeral * | Heaven's Edge | F56 First Flame |
