# Autoplay class focus, Earthquake Rage, and town decluttering

October 15, 2026. Implemented on branch `feature/autoplay-focus-town-shields-20261015`.

## Auto-play

- The 15-slot bar is filled from **all learned skills**, not only the small
  `buildPower.parts` shortlist. Class signature attacks, leaps/charges/blinks,
  and speed buffs get placement priority; duplicates are excluded. Old save IDs
  and manual hotbar controls remain unchanged.
- The point-spending planner unlocks prerequisites and levels **multiple**
  signature abilities before returning to its ordinary power-based fallback.
  This never bypasses character-level or skill-point requirements.
- Barbarian learns Whirlwind, Rampage, Eternal Whirlwind, Earthquake, and
  leap/charge mobility. Whirlwind is placed on LMB; Bash is a free attack
  alternative. Autoplay starts a Whirlwind only at 40+ Rage so it has several
  seconds of movement and damage rather than immediately running dry.
- Lancer prioritizes all **seven** rotating Bulwark shields plus available
  dash/leap skills. Existing shield instances are not recast until about two
  seconds from expiry, enabling multiple simultaneous shields.
- Dragoon prioritizes the jumping attack tree and movement charges even when
  those abilities are lower-ranked than conventional DPS alternatives.
- When several attacks are *actually valid* (resource ready, cooldown ready,
  proper range, line of sight), the bot promotes an attack not used in the last
  nine seconds. Urgent heals/buffs/summons remain higher priority; usable
  movement abilities immediately close substantial gaps for melee builds.
  The bot does **not** cast a skill merely to cycle the bar when it cannot hit,
  would waste a precious cooldown, or requires unavailable Rage or mana.

## Earthquake: Rage resource

- `barbarian.2.5` Earthquake costs **25 Rage**, **zero mana**, cooldown **5s**.
  `rageCost(sk)` provides the cost for the player, skill tooltip, and
  auto-play resource model. It is deducted **only after a successful cast**,
  so unsuccessful casts neither consume Rage nor leave a cooldown.
- When any Whirlwind is equipped, auto-play reserves Rage for spinning and
  uses Earthquake only with **85+ Rage** and a clustered group of two
  enemies (or a boss). This avoids starving the class's primary mechanic.
- Barbarian Whirlwind retains its existing 10-Rage activation minimum for
  *manual* play and 10-Rage/s channel drain; only auto-play has the extra
  threshold. Rage regenerates at 12/s outside Whirlwind.

## Lancer shields

Each existing spinning shield ring has **50% of its previous base radius**,
in tiles: `0.70, 0.975, 1.25, 1.525, 1.80, 2.075, 2.35`. Gaps are
`0.275` tiles. The positive angular velocity and reverse frame lookup,
near/far depth sorting, opacity treatment, sprites, scaling, and Shield Storm
spiral remain unchanged.

## Herrington Hollow town

Random outdoor decorations were reduced considerably: roadside clutter 8–14
to 3–6, open brush attempts 120 to 45, isolated trees 10–20 to 5–9,
random copses 2–4 to 1–2, special town art placements 40 to 20, road
lamps capped at 10 instead of 14, yards 4–7 to 3–5, with thinner market
and building dressing. Decorative same-ground accent density was reduced
from about 1/13 to 1/29 tiles. Core buildings, vendors, well, portal,
roads, terrain collision, forest obstacles and town accessibility rules
were **not** removed or bypassed.

## Regression and manual verification

Run at the project root:

```sh
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/autoplay_focus.js
node tools/tests/autoplay.js barbarian 15 mobile
node tools/tests/autoplay.js lancer 15 mobile
node tools/tests/autoplay.js dragoon 15 mobile
node tools/tests/lancer_shields.js
node tools/tests/barbarian_rage.js
node tools/tests/town.js 1337,18,42,77
node tools/tests/flow.js
node tools/tests/mobile.js
```

GitHub connector source syntax checks and isolated JS logic simulations were
performed while preparing this branch. **Full browser-based tests, screenshot
review and real mobile Safari testing have not been run** in this session.
In gameplay, verify the auto-play bar fills, leap casts close distance, active
shield rings coexist at the new radius, Whirlwind sustains when Rage permits,
Earthquake spends exactly 25 Rage, and all town interactables remain reachable.
