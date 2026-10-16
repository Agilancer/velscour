# Mobile biome performance and saved hero visuals

## Changes
- New worldwide-biome wall atlases no longer run a full-canvas pixel readback and pixel-by-pixel recolor on touch devices. The mobile path applies unique family tinting using compositing on the existing pack's alpha shapes; the full desktop path is unchanged.
- The five standalone Canvas-generated biomes keep their native wall and prop atlases on phones, while a floor-only pass appends the 120-cell worldwide set. Desktop keeps the full expanded packs, including recolored and etched wall atlases.
- Only two generated source packs are kept in memory on touch devices (three on desktop). Expanded biomes and tile-set caches retain their existing two-pack limits.
- Onscreen objects are culled earlier, mobile lighting uses a smaller framebuffer, grit tiles are generated at most twice per frame, and adaptive resolution now responds to severe frame stalls and honors the actual device-pixel budget.
- Existing saved heroes display their currently equipped **armor/helm design and finish**, using the same compositor as gameplay, with equipped weapon, offhand, armor, gloves, boots, and rings listed by name in the selection details. Unused classes keep their original animated portraits. Preview decoding is serialized and does not mutate the game's active gear-art state.

## Smoke and performance QA

Serve from the repo root and run:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/select.js
node tools/tests/select.js mobile
node tools/tests/mobile_biomes.js
node tools/tests/mobile_biomes.js --all
node tools/tests/flow.js
node tools/tests/mobile.js
node tools/tests/pack.js
```

Compare `tools/tests/out/mobile_biome_*.png` at native phone dimensions and inspect combat, lighting, walls/arches/doors, full gear portraits and biome exits. The new performance runner logs per-biome FPS and p95 frame costs. Always test on **real iOS Safari**, particularly memory use after many biome transitions, since the Playwright harness tests Chromium, not WebKit. Performance improvements have **not been verified on a real phone** by this change alone.

No HUD layout, skill assignment, damage logic, shield orbit animation, or enemy combat animations are changed.
