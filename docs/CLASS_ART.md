# Class art packs: format, importer, game use

## Pack format (`assets/source/classes/<class>/`)
The folder exactly as the art generator delivers it:
- `catalog*.json`: `armor` [{rarity, names[], designs[]}], `weapons` / `helmets` [[rarity, "W01 Name", ...]],
  `abilities` [[rarity, ["F01 Name", "description"], ...]]. **The catalog is authoritative**; printed sheet labels are
  only used to find the layout (misprinted IDs such as W23/W22 don't matter, items are named by grid position).
- `README.md`, `correction-prompts.json` (kept for reference).
- Sheets: `<class>_<rarity>_armor*.png` (10 outfits x 12 poses ATK1-6, CAST1-6, facing right),
  `<class>_<rarity>_abilities*.png` (10 effects x 6 stages), `<class>_weapons*.png`, `<class>_helmets*.png`
  (6 rarity rows x 10). The highest `_vN` of a sheet wins.
- Optional `import.json` overrides: `drop_columns` {sheet stem: [pose column indices]}, `armor_ids`, `kinds` {ID: weapon|shield|helmet}.

## Importer (`tools/classart.py`)
```bash
pip install pillow numpy scipy
python3 tools/process_assets.py classes            # every pack (~2.5 min for the Paladin)
python3 tools/process_assets.py classes paladin
```
It prints found/expected counts per sheet and `MISMATCH` lines, then "class art OK" when every catalog entry was found.
- **Labels** are found as text (bright strokes, light box frames removed), grouped into labels, and used as layout:
  item labels give each item's cell (the space above its label), ability sheets' stage headers and row labels give the grid.
- **Mattes**: a sheet with a real alpha (armor, helmets) is hardened (`matte_alpha`). A sheet whose alpha is a blurred haze
  over a painted backdrop (weapons: measured by `alpha_haze`) is keyed against a smooth backdrop model (`matte_backdrop`);
  effects get soft alpha with the backdrop colour un-mixed.
- **Armor**: headers and the name gutter are dropped, rows cut at the emptiest lines, figures split at the gaps, and pixels
  assigned to figures by a sheet-wide watershed (raised fists and reaching hands stay with their own body). An extra pose
  column is dropped by `drop_columns` or automatically (most alike adjacent pair). Each outfit is scaled so its standing
  poses are 112 px and all 12 poses are placed on one cell with the feet/hip anchor at the same point (no jitter).
- **Effects**: each piece goes to the stage column holding its centre; the 6 stages share one crop so drawn motion is kept.
- **Shield vs weapon**: shield words in the name, else shape (upright and solid vs diagonal).

Output (generated, never hand-edit), `assets/sprites/classes/<class>/`: `armor/<P..>.webp` (12-frame strip),
`fx/<F..>.webp` (6-frame strip), `items.webp` (icon atlas), `<class>.json`; plus `assets/sprites/classes/packs.json`.

## Game
- `src/core/classart.js` loads only the played class's JSON + item atlas (`game.newChar`/`loadChar` are async and await it);
  outfit and effect strips load lazily (bar skills' effects are preloaded on entering a world).
- **Items** (`setClassItems` in `src/data/items.js`): while that class plays, weapon/shield/helmet/body drops, vendor
  stock and starting gear become catalog pieces of the rolled rarity (`item.art`, `artCls`, `uname`), with their icons.
  Weapon bases come from the name (`catalogBase`). **Mythic** (rarity 5, red) was added above Legendary.
- **Look**: the equipped catalog body armor picks the outfit (none/generic: the pack's first, P01). ATK frames play on
  weapon skills (melee, dash, leap, whirl, attack projectiles), CAST frames on spells; mirrored when facing left.
  No idle/run art exists, so CAST1 (rest) stands in for idle and walking (with the old bob). Channelled beams hold CAST4.
- **Effects** (`src/gfx/artfx.js`, mapping `SKILL_FX` in `src/data/classart.js`) play over the skill's own VFX: ahead of the
  hero for melee/projectiles/beams/dashes, at the target for aoe/strikes/rain/curses, on the hero otherwise, scaled to the skill's radius.

## Adding the next class
1. Drop the pack into `assets/source/classes/<class>/` (`git mv` if uploaded elsewhere).
2. `python3 tools/process_assets.py classes <class>`; fix any MISMATCH with `import.json`.
3. Add `SKILL_FX.<class>` (skill name -> effect ID) in `src/data/classart.js`.
4. Check with `node tools/tests/classart.js <class>` and look at `tools/tests/out/ca_*.png`.

Art requests that would make the next packs import cleaner: a fixed cell grid with uniform cells, true transparency
(no painted backdrop or alpha haze), labels kept well away from art, consistent figure scale and feet line, idle/walk/hit/death
rows, and (from the Paladin README) Slime Lord blue and more humanoid.

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
