# VELSCOUR biome art direction — Catacombs benchmark

**Goal:** Keep every combat environment in the original VELSCOUR grimdark,
isometric painted-sprite art style. Catacombs is the authoritative visual
benchmark: its native floors, wall slices, lighting, alpha boundaries and
sprite pivots are unchanged.

## Changes and restrictions

* No new procedurally drawn floors, geometric runes, colored diamonds,
  line-art wall ornaments or fake rectangular prop graphics are introduced.
  The former `decorateFloor`, `drawProp` and `etchWallArchitecture`
  helpers are deliberately **not called by the biome pack expansion**.
* The ten authored Catacombs seamless bases are retained as source geometry,
  and every other dungeon uses two or three mutually compatible copies of
  actual self-seamless stone paving. Decorative feature slots copy existing
  authored feature sprites rather than substituting random base materials.
* Each destination wall family chooses **one material for all 16 topology
  masks** (ends, corners, straights, doors). This removes arbitrary ice/lava/
  sandstone/moss alternation at bends. Each biome's wall family material
  comes from **its own authored 10-material WebP strip**, not another biome.
* Source-generated floor motifs are used only if they pass transparent-diamond
  / chroma-key checks, and then only in an inset of the **original full 2:1
  sprite diamond**. All rejected motifs leave the actual art visible.
* The five hand-approved themed dungeon art sets (Desert Temple, Ice Temple,
  Hell, Astral Plane and Heavenly) take priority over lower-grade source sheets
  for floors and props. Approved 8+1 floor and prop accents remain playable.
* Catacombs uses its untouched original pack and tile pools. Cathedral and
  Necropolis preserve original atlas indices when restricting their shared
  prop art, rather than inadvertently removing the majority of props.
* Automatic cross-biome room mixing is paused pending a separate *curated*
  pairing review. This deliberately removes the previously randomized 65%
  chance of injecting neighboring visual materials.
* **Cross-set palette swap budget: 0 added / 0 total imported in this change.**
  Existing monster/item palette variation and combat VFX are outside scope.
  Cross-set reused assets must never exceed 25% in future additions.

## Approved material palette selection

The actual `src/gfx/biomecuration.js` profile for each of the 30
non-Catacombs indoor biomes chooses **two or three** indices from its own
wall-material strip (0–9) and 2–3 source seamless floor materials. These
profiles are data-only: no colors or pixels are synthesized at runtime.
Alter the allowed indices after inspecting **both** side-by-side screenshots
and the source sheet; never bring back automatic mask parity switching.

Palette goals by visual family:

| Theme | Dominant / supporting art |
|---|---|
| Frozen, Ice Temple, Crystal, Storm | Slate blue, frost stone, restrained silver |
| Fungal, Thorn, Plague, Sunken | Damp gray masonry, moss/roots, teal accents |
| Molten, Forge, Hell, Throne | Charcoal, iron oxide, restrained ember cracks |
| Obsidian, Void, Abyss, Shadow | Dark slate and black stone, subtle violet |
| Gilded, Desert, Amber, Serpent | Warm sandstone and aged gold, muted blue accents |
| Cathedral, Necropolis, Shattered | Weathered pale stone, cold gray and old bronze |
| Library, Blood, Flesh, Ashen | Weathered stone, limited warm accent materials |
| Desert Temple | Ancient tan masonry, lapis/gold details |
| Astral Plane | Dark blue-violet stone, subtle cold highlights |
| Heavenly | Pearl stone, aged gold and muted blue inlays |

## Visual review corrections — same camera, desktop and mobile

The complete 34-biome desktop sweep and representative mobile sweep from
the PR workflow are compared against Catacombs, including a second scene
with larger open rooms in each biome. These screenshots revealed lingering
**preexisting source-art patterns** even after removing the extra procedural
expansion overlays:

- **Cathedral:** the native `marble_checker` base (slot #3) turns whole
  chambers into a hard black-and-white checkerboard on mobile. It has been
  excluded from random seamless bases, leaving `nave_flagstone` and
  `choir_slate`. The authored Cathedral props remain in place.
- **Ice Temple:** `frosted_flagstone` (#0) and `white_ice` (#5) have
  large repeated bright diamonds that compete with characters, loot and
  torches. The now-selected `blue_black_ice`, `sapphire_slate` and
  `snowbound_court` are a quieter cold stone family.
- **Amber versus Gilded:** both used to pick identical native paving slots.
  Gilded now favors light limestone and subtle tesserae, while Amber uses
  rust-colored terracotta and gravel, with complementary existing wall
  materials. This creates distinct visual identities without recoloring,
  drawing or importing any additional sprites.

No cross-biome artwork is introduced, and all visually rejected tile
variants remain in their original asset packs for possible future reuse.

## Checks and screenshots

A new PR GitHub Actions workflow validates artwork and uploads actual
in-game desktop/mobile screenshots to the PR's workflow **Artifacts**.
The regression prevents a return to generated line-art overlays and
checks the 30 profiles, clean alpha cells, untouched Catacombs source and
painting availability.

```sh
node tools/tests/biome_art_direction.mjs
python3 -m http.server 8123
# Requires Playwright + Chromium:
node tools/tests/ai_biome_floors.js
node tools/tests/approved_biome_art.js
node tools/tests/worldwide_biomes.js
node tools/tests/biome_visual_review.js --all
node tools/tests/biome_visual_review.js --mobile
```

Review the resulting `tools/tests/out/biome_curated_*_{entry,secondary}.png`
with Catacombs at the **same zoom** before merging. A build/runtime
check is not a substitute for a visual art approval. Do not claim these
pictures have been manually reviewed until the workflow produces them.
