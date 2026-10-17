# Dragoon: Spearstorm tree and auto-play rhythm

## Scope and save compatibility
- Added **20** skills in a **fourth Dragoon tree**, `Spearstorm` (20 nodes, five rows and four prerequisite chains). **All original 60 Dragoon skills and IDs remain unchanged.** Every other class is unchanged.
- Two level-one tree nodes are also **granted** automatically at character levels 1 and 2. `Spearstep` is granted at level 4, and `Rallying Standard` at level 6; these supplement existing default grants, not replace them.
- New identifiers: `dragoon.3.0` to `dragoon.3.19`. Save/skill-bar keys are still the original string IDs; the existing fourth-tree UI (also used by Necromancer) supports the expanded layout.

## Primary spear attacks

| Skill | Unlock | Behavior | Damage factor | Cooldown |
|---|---|---|---|---|
| Thousandfold Impalement | Level 1 | Instant point-blank impact in one circle around the Dragoon | 3.0x (AoE skill factor applied) | 8 seconds |
| Triune Spearfall | Level 2 | Instant point-blank impact in three tightly packed circles around the Dragoon | 4.5x (exactly 150% of base Impalement factor) | 14 seconds |

- **Close-range only:** Both have a **2.5-tile engagement range**, and all damage and spear visuals originate from the Dragoon's own position, not from a distant cursor. The single circle is centered on him. The triple attack places two overlapping side circles just beside him (0.6 × circle radius from the center). Long-distance aiming cannot deal damage remotely. Both use physical skill damage, the same base attack coefficient, and the same radius scaling. Three-circle overlap is **deduplicated**, so a target is damaged **once**, not two or three times for standing in an intersection.
- Skill application is immediate when the button is pressed; the 1.35s/1.65s on-screen spear barrage is **animation only**, not repeated damage ticks. Cast time is zero, including manual play. Mana, gear stats, crits, area increases, mastery and augment effects follow the standard skill pipeline.
- Visuals reuse the existing painted-style energy-lance shaft, blade, glow and color treatments from all nine Dragoon leap designs (including distinct lance palette/style variants). These are rendered in the existing Canvas effects layer without importing new art assets. Three circles use fewer spears per circle on mobile.
- Existing leaps remain intact; three added Spearstorm leaps have matching lance styles so the original leap animation regression still covers every Dragoon leap.

## New Spearstorm progression
- Level 1: Thousandfold Impalement, Triune Spearfall, Spearstep, Rallying Standard
- Level 6: Pinning Volley, Storm of Barbs, Vaulting Reprisal, Wyrmblood Momentum
- Level 12: Spear Vortex, Crimson Impact, Falling Stars, Phalanx Breaker
- Level 20: Impaler Spiral, Thunderhead Pierce, Sunfall Lance, Fury of the Nine
- Level 30: Sovereign Spearstorm, Heavenbreaker, Cataclysm Descent, Aegis of the Wyrm

## Auto-play
- The two spear barrages, leap/dash attacks and complementary early utility skills are class-focused for skill allocation and the 15-slot hotbar.
- While attacks and resources are available, the bot chains **3–8 jump/dash attacks**, favoring a not-recently-used leap, before using the next ready AoE. When an AoE becomes ready, it must **jump/close into 2.5 tiles** rather than dropping it at range; if it lands short after the jumping quota, it can make another approach leap, or walk close enough, before casting. It alternates between the two barrage types when both are ready.
- After an AoE cast, auto-play stands still for **1.35s (single)** or **1.65s (triple)** while the effect animates, before jumping back into combat. Enemy damage already happened on cast. This visual pause is not applied to manual casts.
- Buffs, healing, emergency defense, dodge and retreats retain existing priority; other ready damage and utility skills weave into the rotation or fill downtime when movement/AoE skills are on cooldown.
- Target, mana, range, line of sight and cooldown checks remain authoritative. The bot does not fire at an enemy behind a wall, skip safety mechanics just to hold a pose, or bypass level gates.

## Validation checklist
```sh
node tools/tests/dragoon_spearstorm.mjs
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/dragoon_spearstorm.js
node tools/tests/skills.js dragoon
node tools/tests/lance.js
node tools/tests/autoplay_focus.js
node tools/tests/autoplay.js dragoon 15 mobile
node tools/tests/flow.js
node tools/tests/mobile.js
```

Review the output and effects screenshots, verify old Dragoon saves, point-blank-only damage at a 5.5–8-tile target, self-centered one-vs-three circle placement near walls, leap-to-barrage approach and the spear timing on a phone-sized scene. **This GitHub-connector-only change has not executed Chromium or real iOS/Android runtime QA.** Keep the PR as a draft until interactive testing is complete.
