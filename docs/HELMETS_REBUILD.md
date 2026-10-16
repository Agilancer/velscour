# VELSCOUR Helmet Rebuild — approved artwork (October 2026)

The entire legacy helmet **display/compositor** has been replaced. The class-specific armor artwork stays; nothing uses the previous `helms.webp` or `helms_mask.png` when drawing a helmet. The old generated faceplate/visor filler has been removed.

## Assets and ordering

- `assets/sprites/helmets/<class>.webp`: **sixteen** files, each an atlas of 5 columns × 8 rows, with 92×92 tiles.
- For each class, atlas tiles 0–9 are Common (5 designs from **Common Helmets Class Grid** and 5 from **Common Helmets Low-Level Gear**); 10–14 Uncommon (**Uncommon Fantasy Helmets Grid**); 15–19 Rare (**Rare Helmet Arsenal Grid**); 20–29 Epic (5 designs from **Epic Helmet Class Chart** and 5 from **Epic Helmet Class Compendium**); 30–34 Legendary (**Grimdark Helmet Sprite Sheet Chart**); 35–39 Mythic (**Mythic Helmets Godly Tier Gear**).
- The class order is Paladin, Ranger, Wizard, Necromancer, Barbarian, Dragoon, Totem Master, Death Knight, Arcane Sorcerer, Carrion Witch, Bard, Slime Lord, Boomerang Knight, Lancer, Dragon Knight, Gunner.
- The eight original user-provided sheet images are the source assets; the compiled WebP atlases live in GitHub. **No text labels, rows or enumeration badges should be painted into an item.** Crops keep the original painted dark visors, hoods, eyes and face shadows, with alpha applied only to exterior artwork matte.
- `assets/sprites/helmets/manifest.json` records the atlas layout and source sheet names.

## Game integration

- `src/core/helmetart.js` is the authoritative atlas loader, class-specific head fitting, and saved-look-to-tile mapping.
- `src/core/gearart.js` retains recolored body armor and body armor auras, but composites the new helmet source tile over the head; **there is no generated faceplate**. A protected portion of underlying hair is clipped where covered by the helmet.
- All gear helmets inherit the stored `item.look` design and finish and the existing six rarity levels. Historical helmet looks use their original rarity band, mapped modulo the new design count, so old save data loads and stays deterministic. Legendary uses the supplied Grimdark chart; Mythic uses the dedicated Mythic sheet.
- `gearIcon` returns a downscaled sprite based on the **same atlas cell** as the hero's helmet, so the item icon shown in bags, vendors, drops and inventory matches the equipped visual. `heroPortrait` and `savedGearPreview` reuse the exact compositor.
- User-generated sheet art has no animation directions. Mirroring/idle bobbing remains the player's current visual behavior; **these are static directional sprites fitted over the existing right-facing gear pose**, not newly hand-drawn 8-direction rigging.
- Face cavity RGB values of ≤55 are not palette swapped. Metal/cloth parts receive restrained palette effects, while black eye and face spaces stay black and opaque.
- Sizes and positions are tuned per class in the FIT table at source 128×192 pixel coordinates; Mythic/Legendary gain a modest extra width/height.

## Regression and visual QA

Run from the repository root with local server and Playwright installed:

```sh
python3 -m http.server 8123
node tools/tests/closed_helms.js all
node tools/tests/gear.js all nofx
node tools/tests/mobile.js
```

Review `tools/tests/out/helmets_new_<class>.png` (40 equipped helmets/class) for clipped horns/hoods, collars, black eye opacity, and human-scale alignment. Inspect character selection previews, inventory items, ground drops and rare gear on physical Safari iOS before merging.

**Connector-only validation done:** atlas dimensions and decode checks, all 640 tile extraction/crop bounds, code syntax checks and source references. **Not done:** live browser/Playwright or physical device visual QA. Final head-fitting needs screenshot review for all classes.
