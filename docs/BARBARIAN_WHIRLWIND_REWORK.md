# Barbarian Bash + Whirlwind — attack-built Rage and isometric cyclone

October 15, 2026. This supersedes the earlier passive Rage regeneration
model without changing skill IDs, gear art, or the save shape.

## Bash: the builder

- `barbarian.0.0` remains Bash: a **free melee strike** with knockback.
- Each Bash casts **five lightning bolts** in a forward fan (0.92 radians total).
  These travel 3.1 tiles in the chosen attack direction, never around the hero;
  each deals 24% of Bash's base skill damage in lightning, while the primary
  melee strike remains physical.
- Every cast earns 3 Rage; the **first successful hit** from that cast, whether
  melee or a bolt, earns 15 more. A shared cast token prevents awarding this
  large bonus for each of five bolts or repeated targets.
- Bash suppresses the spiralling legendary hammer on-hit proc only for Bash;
  the Paladin and unrelated skills retain their effects.

## Rage resource

- Rage begins at 0 (100 maximum). Existing saves retain their saved value.
- There is **no idle Rage regeneration**. Barbarian attack casts earn 0.7 Rage
  (3 on Bash), and direct hits from other skills earn 2.5 per hit.
  Whirlwind hits award only 0.35 per tick, so its 10 Rage/second drain
  is the dominant cost.
- Manual Whirlwind needs at least 10 Rage to begin. Autoplay initiates
  Whirlwind at 40+ Rage; Earthquake still requires 25 Rage and a 5s cooldown.
- Values are synchronized to `char.rage` for the existing save system.

## Whirlwind steering

- During a channel, the Whirlwind hazard reads the existing
  `Player.moveVec`. This vector is supplied by the auto-play `goTo` /
  `steer` pathfinder, including navigable waypoints and room transitions.
- Player keyboard/touch movement takes priority; click-to-move uses the
  regular `Player.walkTo` route when a vector is not provided.
- When auto-play is active, the Whirlwind does not pull the hero directly
  toward a stale out-of-sight aim point. Visible close enemies can still
  be chased; otherwise the regular path planner resumes navigation.
  Collision remains enforced by `world.map.move` and ordinary walkability.

## Cyclone artwork and battlefield physics

- `src/gfx/barbarianwhirl.js` draws layered ground-pressure ellipses
  and continuously animated helical ribbons in true isometric projection.
  White-blue steel wind, ember sparks, dusty grey smoke and blood flecks
  circulate at multiple heights around the moving character.
- `src/gfx/vfx.js` now handles light owner-anchored vortex trajectories
  for both cyclone particles and captured gib sprites. Chunks that approach
  Whirlwind spiral inward/upward with the hero rather than continuing on a
  straight ballistic path.
- Whirlwind cuts can create small bursts of appropriate flesh, bone or
  demon gibs, reusing the existing gibs atlas. Gore Off disables those bursts
  and gib capture, and mobile emits fewer particles and cyclone streams.
- The effect does not alter the player sprite sheets or Paladin animations.

## Tests and visual QA

Run from the repository root:

```sh
python3 -m http.server 8123
node tools/tests/barbarian_rage.js
node tools/tests/autoplay_focus.js
node tools/tests/autoplay.js barbarian 15 mobile
node tools/tests/flow.js
node tools/tests/skills.js barbarian
node tools/tests/mobile.js
node tools/tests/perf.js 6 barbarian 1
```

Review the effect in an empty hallway, during a large mob fight, when
crossing rooms and doors, and with Gore Off / Bloody / Extreme. Inspect
desktop and physical iOS Safari frame rates before shipping. The GitHub-only
session added code and regression assertions but did not run browser tests,
take screenshots, or inspect the visuals on a device.
