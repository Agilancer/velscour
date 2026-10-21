# The Eternal Breach — Expanded Biome Collection

This package extends **The Eternal Breach** into a two-zone setting and adds its creature roster. It contains the original underground rift biome, a companion overworld biome called **The Veilscar March**, 200 regular monsters, 30 bosses, and the source atlases and review sheets used for the delivered assets.

## Package map

- `The_Eternal_Breach/` — 236-frame modular catacomb and breach biome, including the revised scatter terrain.
- `The_Veilscar_March/` — 236-frame surface biome of rift-scarred heath, dead rootlands, burial roads, and violet-seamed stone.
- `Creatures/monsters/` — 200 individual transparent PNG sprites with stable IDs `ETB-M001` to `ETB-M200`.
- `Creatures/bosses/` — 30 individual transparent PNG sprites with stable IDs `ETB-B001` to `ETB-B030`.
- `Creatures/catalogue.json` and `catalogue.csv` — names, families, descriptions, size tiers, source cell, sprite paths, and color counts.
- `Creatures/qa/` — labeled contact sheets and automated asset checks.
- `docs/` — area vision and scatter-perspective review.
- `source_atlases/` — original creature atlas sources and corrected Eternal Breach scatter sheets.

## Art direction

The added work follows the attached VELScour and Grim Nocturne references: compact pixel clusters, deliberate high-contrast silhouettes, top-left highlights, cool shadow colors, and a controlled bone, slate, rust, and violet palette. Purple is used more visibly as trim, rift glass, inlaid seams, eyes, and magical fissures across the new surface terrain, scatter, monsters, and bosses.

The attached archives served as visual references. Their embedded text was not treated as instructions that supersede the user's request.

## Quick previews

- `The_Eternal_Breach/Overview.png`
- `The_Veilscar_March/Overview.png`
- `Creatures/qa/monsters_01.png` through `monsters_04.png`
- `Creatures/qa/bosses_all.png`

Use the biome packs' own `START_HERE.html` files for their offline sprite browsers and manifests. Creature PNGs use transparent backgrounds and binary alpha; keep nearest-neighbor filtering when importing into a game.
