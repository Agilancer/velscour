# Class art: gear libraries (hero look) and class art packs (weapons, effects)

Two kinds of art drive a class's look:
- **Gear libraries** (`assets/FinalClasses/<class>.zip`, all 16 classes): 80 body armors + 80 helms as single
  frames. The hero is drawn as the equipped body armor with the helm over the head, palette swapped, plus auras.
- **Class art packs** (`assets/source/classes/<class>/`, Paladin only so far): weapon/shield catalog items and the
  60 ability effects.

## Gear libraries
### Zip format (as delivered)
`<class>/armor/<class>_armor_NNN_<rarity>.png` and `<class>/helms/<class>_helms_NNN_<rarity>.png`, 80 each,
128 x 192 RGBA, facing right, the same unhelmed hero in every armor (head top at y 24, feet at y 183), every helm
fitted to the shared head anchor (64, 40), so a helm draws at the same origin as the armor. Rarity bands (same
for both, read from the file names): Common 1-20, Uncommon 21-36, Rare 37-52, Epic 53-64, Legendary 65-74, Mythic
75-80. The zips also hold a Preview.html, labeled sheets, CSV catalogs and the generation prompts (not used).

### Importer (`tools/gearart.py`)
```bash
pip install pillow numpy scipy
python3 tools/process_assets.py gear            # every zip in assets/FinalClasses (~8 s per class)
python3 tools/process_assets.py gear paladin
```
Reads the zips directly (nothing is extracted into the repo). Per class it prints counts, how many helms have a
face opening, whether bare body skin is protected, and the output size (~600 KB).
- **Alpha** is hardened at 150 (the frames carry a ~98% body alpha and a soft haze).
- **Protect mask** (`armor_mask.png`, 255 = never recoloured): face, hair and skin. The head's colours (k-means
  over the face core of every armor) seed it inside the head, then it grows through matching neighbours: hair within
  a zone around the head (braids, manes), bare skin (cheek colours) anywhere, but only when skin is told apart
  from the outfit (fewer than 12% of body pixels look like skin; dark skin on brown leather fails that, so the
  Paladin's hands are recoloured with the armor). `OVERRIDES` in the script: `body_skin`, `skin_tol` (Barbarian
  17, for the bare torso), `open` / `closed` helm id lists to force the opening detection.
- **Helm mask** (`helms_mask.png`): 255 = face opening, 128 = crown zone. The helms were generated with dark empty
  interiors. The opening is the dark (<52 luminance), solid, face-sized regions on the open side (centre right of
  x 58 and below y 27; at least 4 px wide and 5 tall; slits wider than 2.6x their height and grille gaps are
  rejected), plus specks inside it. The crown zone is above the shell and beside its upper half.

Output (generated, never hand-edit), `assets/sprites/gear/<class>/`: `armor.webp` (10 x 8 atlas of frames, lossy
q90 with lossless alpha), `armor_mask.png`, `helms.webp` (10 x 8 atlas of 48 x 56 helm cells cut at x 40, y 0,
lossless), `helms_mask.png`, `gear.json` (frame, feet / head top, helm cell, rarity bands, bounding boxes); plus
`assets/sprites/gear/classes.json`.

### Game
- `src/core/gearart.js` loads the played class's library (`game.loadClassPack`, ~600 KB, kept as pixel data).
- **Item looks**: every body armor and helmet gets `item.look = [design, finish, aura]` on first use (saved with
  the item). Design: the rarity's band, positioned by item level (sqrt curve over 1..100, so early levels get the
  plain designs) +-1 at random. Finish: one of 51 palettes (`PALETTES` in `src/data/gear.js`) whose tier fits the
  rarity (tier r-2..r), or the original colours 25% of the time. Aura (body armor only): `GEAR_FX`, 45% of Rares,
  every Epic, Legendary and Mythic (now and then one tier down).
- **Palette swap** (`recolorPx`): each pixel is split into four materials by colour (neutral metal, saturated cloth,
  bright warm trim, dark warm leather), each mapped through the finish's 4-stop ramp by luminance, then rescaled
  to the original luminance so the shading survives, blended at the finish's strength (0.7-0.85). Protected
  pixels are skipped.
- **Composite** (`heroLook`, cached for 8 looks): armor in its finish; then per helm cell pixel: crown zone clears
  the armor (hair poking out), shell pixels draw the helm in its finish, opening pixels keep the armor (the face)
  where there is one and the helm's dark interior elsewhere. No body armor = design 1 in original colours.
- **Drawing**: `Player.artFrame()` gives the composite to `Creature.drawArt` (single frame, same bob/squash/flip as
  the class sprites, 60 px from head top to feet). Without gear art the old class sprite stands in.
- **Auras** (`src/gfx/gearfx.js`): outline glow (stacked offset silhouettes, no ctx.filter) and a light, orbiting
  wisps (ring / eight / double / wobble, optional trails; the ones behind the hero draw before it), a rune circle at
  the feet, and particle emitters (motes, embers, sparks, frost, smoke, flames, runes) from `Player.update`.
  Colour: the aura's own, else the finish's glow colour, else the rarity colour.
- **UI**: body armor and helm icons are the item's design in its finish (`gearIcon`), the inventory portrait is the
  composite, tooltips name the finish and aura.
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
