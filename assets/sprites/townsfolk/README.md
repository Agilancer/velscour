# Velscour Original Townsfolk Animation Pack

This pack contains 25 distinct, newly generated civilian identities in the existing Velscour rendered-sprite style. The ten original source identities are retained; fifteen new generated designs add workers, children, four individually designed knights, and royal court members. The design is unique in face, silhouette, clothing and source art. Palette variants are applied by the game engine.

Every non-knight sheet is a transparent RGBA PNG, 1408×192 pixels: eleven 128×192 frames in this order: idle 1–3, walk 1–2, dying, lying dead, scared scream, scared point, happy, celebration. Every knight sheet is 1664×192 and appends two unique sword attack frames after the same eleven standard frames. Poses retain each identity's face, clothes and proportions. The complete PNG sheets and their source artwork are included in the ZIP; `manifest.json` defines every frame contract.

## In-game NPC integration

Herrington Hollow's civilian residents, children, royals, court members and
knights use these generated animation sheets through `src/game/render.js`.
`src/data/townsfolk.js` maps the 100 named visitors to the 25 unique
designs; palettes provide variations. Each character is anchored at their
town map position, and the frame order comes from `manifest.json` (including
both appended knight attacks). Recolored variants are Canvas images and must
be checked using `width` and `height`, **not** the HTML image-only
`complete`/`naturalWidth` properties. Original PNGs are loaded on demand
and the current town's sprite sheets are preloaded when entering town.

**Exception:** all eight established shop vendors deliberately keep their
original, existing painted `npc_<vendor id>` graphics and class-art
fallbacks. Their names, shop logic, interactions and positions are unchanged.
Storage chests are still rendered as chests, not characters.

Run `node tools/tests/townsfolk.mjs` for manifest checks and
`node tools/tests/town_sprite_display.js` with the local game server running
(`python3 -m http.server 8123`) to verify browser sprite rendering, vendor
preservation and capture town screenshots for visual review.
