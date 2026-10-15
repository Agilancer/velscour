# Barbarian Rage and Lancer orbit follow-up (PR #56)

This pass extends the mobile performance and saved-character-preview review without
changing approved PNG sheets, base combat art or the other fifteen classes.

## Barbarian

- A distinct Rage meter (0–100) is saved on each Barbarian character. It builds at
  12 points/second while not channelling the Barbarian's whirlwind skills.
- The three existing whirlwind skill IDs use Rage rather than mana. Casting requires
  at least 10 Rage. Channelling drains 10 Rage/second and ends when empty.
  At 100 Rage a 12-second skill can sustain at most 10 seconds of spinning.
- Whirlwind movement is quicker; the Barbarian's base movement speed is 25% higher.
- The existing whirlwind slash effect has two interlaced blades and larger arcs;
  enemy attraction stays conditional on map walkability and never drags bosses.
- Higher-rank Whirlwind gains lightning AoE (level 12) and short-lived small
  traveling tornadoes (level 16). Eternal Whirlwind starts with both.
- The Barbarian can equip a second actual **weapon** in the offhand slot
  (other classes cannot). Dual wield averages 60% of both weapon damage ranges
  and adds 12 attack speed; no special two-weapon sprite was generated.
- The three Barbarian hammer/axe-orbit spells are reworked as distinct cyclone
  skills, **without changing their original numeric skill IDs**, so old saved
  skill points and hotbar bindings still load. Their names change on existing
  characters to reflect their new effects.
- Leap Attack, Seismic Step and Furious Charge gain increased reach.

## Lancer

- The seven Bulwark shield skills use their existing four approved eight-angle
  golden PNG sprite sheets and seven nonidentical radii, 1.18–2.50 tiles.
  All spin at -2.4 radians/second rather than +2.4 radians/second; the
  original frame order and world-depth foreground/background sorting remain.
- A one-time alpha treatment of each tiny atlas (on load) makes pixels
  between the shield silhouette's first and last visible pixels on each row
  opaque, while maintaining transparent exterior padding. The binary source
  images are untouched.

## Mobile and saved heroes

The earlier commits in PR #56 add reduced memory requirements for custom
biomes, bounded generated-pack caching, mobile lighting and grit-baking work,
offscreen culling, adaptive frame resolution, and class cards that display
saved torso/head equipment via independent gear compositing plus item names.

## Regression checklist

From the repository root:

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/barbarian_rage.js
node tools/tests/lancer_shields.js
node tools/tests/select.js mobile
node tools/tests/mobile_biomes.js --all
node tools/tests/mobile.js
node tools/tests/flow.js
node tools/tests/skills.js barbarian,lancer
node tools/tests/autoplay.js barbarian 15 mobile
```

Review screenshots at `tools/tests/out/` and test actual iOS Safari in landscape.
Check old saves, both weapons equipped, 100-to-0 Rage in 10 seconds, recharge,
resumed whirlwinds, lightning and tornadoes, and large-pack frames at
844×390. **The connector-only session could check source syntax, but did
not run browser, mobile GPU or real iOS Safari tests.** Keep PR #56 as draft
until those tests and visuals have been inspected.
