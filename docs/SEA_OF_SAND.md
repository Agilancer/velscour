# Sea of Sand — desert overworld

Sea of Sand is a second outdoor scenario biome alongside the Forsaken Wilds. It keeps the 72×72 outdoor map contract, uses a native desert floor atlas, and builds walkable routes between one and five objective areas. Sandstone cliffs form the map edge and internal maze walls; map collision and line of sight block passage through intact cliff tiles.

## Runtime integration

| Part | Location |
|---|---|
| Biome registration and its 60 creature roster | `src/data/biomes.js`, `src/data/seaofsand.js` |
| 10 named boss archetypes and AI profiles | `src/data/seaofsand.js`, `src/data/enemies.js` |
| Floors, scatter, palms, monster/boss frames, cliff modules | `assets/tiles/sea_of_sand/` |
| Atlas loader and sprite pivots | `src/gfx/seaofsand.js`, `src/core/enemyart.js` |
| Desert map and cliff maze generation | `src/world/overworld.js` |
| One-to-five scenario sequence and beat rewards | `src/game/seaofsand.js` |
| Persistent timer, current beat and objective HUD | `index.html`, `css/style.css`, `src/ui/hud.js` |
| Browser QA | `tools/tests/sea_of_sand.js` |

The committed lossless atlases are generated from the Velscour Overworld Biome Set. To rebuild them from that pack, run:

```bash
python tools/seaofsandpack.py path/to/Sea_of_Sand_Biome_Pack
```

This writes the runtime atlases and `pack.json` under `assets/tiles/sea_of_sand/`. The atlas metadata preserves each source pivot, cliff connection mask and cliff height. Do not edit the generated atlases by hand.

## Scenarios and rewards

The route generator rolls one to five connected area markers from the map seed. Activating an area's shrine starts one of the existing 20 scenario types in a 90–180 second window. The persistent HUD shows the current area, objective/stage progress and countdown. Failure leaves that shrine available for a retry; cleared beats and rewards are saved per depth so returning to town cannot duplicate them.

Each cleared area drops one guaranteed Legendary item. Beat one guarantees a weapon and beat two a shield, so a five-area route includes both. Mythic odds rise by 19 percentage points per cleared beat, reaching 95% on beat five. Scenario rewards use the regular item creation and ground pickup systems.

## Verification

```bash
node tools/tests/data_check.mjs
node tools/tests/sea_of_sand_generation.mjs
node tools/tests/sea_of_sand.js
node tools/tests/overworld.js
node tools/tests/flow.js
node tools/tests/hud.js
```

The Sea of Sand browser test checks all atlas frame counts, sixty seeded maps, route reachability, cliff density, one-to-five area generation, monster frame resolution, and the live scenario HUD. As with the existing browser suite, run it from a local HTTP server with Playwright available.
