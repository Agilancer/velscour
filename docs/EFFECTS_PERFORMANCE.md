# Rendering and combat performance, October 15, 2026

This pass preserves effect density, art resolution, lighting settings, particle
caps, lifetimes, blend order, and the existing desktop/mobile quality settings.

## Findings and changes

- A Chromium CPU profile in Hell identified canvas drawing as the largest active
  cost, followed by spatial queries. Ambient particles were a smaller contributor.
  The renderer previously submitted every wall in a generous rectangular tile
  search, including many walls outside the isometric viewport. It now rejects
  wall slices by their actual sprite bounds before sorting/drawing, including
  overlap padding. Door state, cutaways and shield depth ordering are preserved.
- Each world reuses its draw records, scratch arrays and spatial-grid buckets.
  Scratch records release entity references after rendering; empty grid buckets
  release their contents when recycled. This reduces allocation/collection churn
  without retaining old worlds or deleted creatures.
- Awake monsters search up to thirty tiles for targets. The old nearest-target
  implementation visited hundreds of empty buckets and allocated a result array.
  It now chooses between occupied-cell scanning and local bucket lookup, without
  allocating that result array. It retains radius checks, dead/untargetable
  filtering, LOS and the original row/column/insertion tie order.
- Particle expiry uses a single stable compaction pass instead of one array
  splice per expired particle. Surviving particles retain drawing order and
  simulation. Expired particles release capacity before secondary blood spawns.
- Fixed cached pack loading: `loadPack` now consistently returns a Promise.
  Previously, `.then()` on an already loaded object prevented expanded art from
  loading. Town/outdoor art uses the town assets loaded at startup, rather than
  requesting a nonexistent `town/pack.json`. The all-biome test now uses the
  dedicated Sea of Sand loader, as normal dungeon entry does.
- The autoplay soak exposed a recurring exception in non-Paladin skill-bar
  setup: the Paladin hammer candidate is `false`, so `hammer?.sk.id` still reads
  `.id` from undefined. Guarding the nested skill removes repeated exceptions
  and lets those heroes arrange their bars. The focused regression now checks
  starter bar setup for all sixteen classes.

## Verification

`tools/tests/effects_performance.js [mobile]` imports original render, query and
particle implementations from commit `b53e287` into ignored test output. It
compares both implementations in the same live world at the same camera/time,
dimensions and resolution. It uses seeded dungeon generation and tests four
camera positions in each of Catacombs, Ice Temple, Hell, Astral Plane, Heavenly
and Forsaken Wilds, at the existing 3,000 desktop / 1,400 mobile particle caps.

Desktop and touch-emulated Chromium comparisons produced **zero changed pixels**
in all sampled scenes, matching target selections and matching surviving
particle states. Synthetic target tests include equal distances, negative cell
coordinates, LOS rejection, repeated grid recycling, dead and untargetable units.
The runner also logs draw calls and diagnostic timings; speed is not an assertion.
Wall-heavy scenes submit substantially fewer draws, while outdoor draw counts
remain unchanged. Initial mobile samples reduced total draw calls by 38% in
Hell, 34% in Astral Plane and 36% in Heavenly. Thirty-tile target queries were
roughly 3–11 times faster across those initial mobile samples. These figures are
scene-dependent workload measurements, not promised device FPS gains.

Other checks: `data_check.mjs`, `flow.js`, `mobile.js`, `skills.js wizard`,
`mobs.js` (six depths, no stuck monsters), `pets.js 1`, `legion.js`, and
`lancer_shields.js`. The complete `mobile_biomes.js --all` sweep passed, including
Sea of Sand. `autoplay_focus.js` passed, including starter bar setup for all
sixteen classes, and the two-minute mobile wizard autoplay smoke completed with
no browser errors after the bar fix. Mobile biome screenshots were visually
inspected.

`barbarian_rage.js` reports existing shield-interior-alpha and offhand-equipping
failures. Repeating it with the original render/world/VFX code reproduced those
failures; the separate Lancer animation/depth test passed.

The tests use desktop Chrome with touch emulation. Real iOS Safari and physical
Android performance, thermal throttling and long-session memory remain untested.

Run from the repository root using the normal harness/server setup:

```sh
node tools/tests/effects_performance.js
node tools/tests/effects_performance.js mobile
node tools/tests/mobile_biomes.js --all
node tools/tests/autoplay.js wizard 2 mobile
```

Set `PERF_BASE_REF` to change the comparison commit. Timings should be collected
without other CPU/GPU-heavy work. The baseline module files use the default
`tools/tests/out` location and are never included in the deployed game.
