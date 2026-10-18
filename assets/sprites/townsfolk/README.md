# Velscour Townsfolk Animation Pack (v4)

25 painted identities (`generated_sources/*.png`) cut by `python tools/build_townsfolk_pack.py` into
`townsfolk_001.png` … `townsfolk_025.png`, plus 75 colourway sheets (`townsfolk_026` … `townsfolk_100`; sheet k is
identity (k-1)%10+1 with its dyed cloth shifted). `manifest.json` lists every sheet's frames.

**Cells are 256 x 192**, feet on row 186, one scale per character (adults ~172 px tall, children ~132, the
shepherd ~160). The standard eleven frames come first: `idle_1 idle_2 idle_3 walk_1 walk_2 dying dead scream point
happy celebrate`. Extras follow: the four knights `attack_1 attack_2`, the royal steward `gesture`, the court lady
`fan shy`, the royal scribe `read`.

The cutter finds each pose as a connected alpha component (no grid: poses overhang their cells on the source sheets),
labels them by hand (`SPECS` in the tool), keeps the hips/feet on one spot so a pointing arm or a sword never drags
the body sideways, and writes a review sheet to `art-review/townsfolk-cuts.jpg`.

How they move, feel and talk: `src/game/townsfolkvisuals.js` (frames, emotions, squash and stretch),
`src/gfx/emotes.js` (emotion bubbles), `src/game/townlife.js` (the town director) and `src/data/townscripts.js`.
The eight vendors keep their own painted `npc_<vendor id>` art.

Checks: `node tools/tests/townsfolk.mjs`, `node tools/tests/town_visuals.mjs`, and with the game served,
`node tools/tests/townlife.js` and `node tools/tests/town_sprite_display.js`.
