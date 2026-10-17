# Lancer Bulwark — Four Eight-Angle Spinning Shields

This implementation replaces the Lancer's generic procedural orbiting
`tshield` graphics with **four transparent PNG spritesheets** derived from
the four approved uploaded golden shield turntables. It preserves all
existing shield ability damage, knockback, hit frequency, duration, cooldown,
shield counts and upgrade scaling. The seven orbit radii and the
visible animation-frame direction were revised on October 15, 2026. A later
compact-orbit balance pass halved every base radius while retaining the spin
direction, per-shield depth sorting and distinct orbit spacing.

## Art assets (real committed binary PNGs)

All four source sheets are at `assets/fx/lancer/`:

| File | Appearance | Dimensions |
| --- | --- | --- |
| `spinning_round.png` | Gold circular sun-and-laurel shield | 176×112 |
| `spinning_diamond.png` | Gold diamond / star shield | 176×112 |
| `spinning_kite.png` | Ornate gold kite-shaped shield | 176×112 |
| `spinning_tower.png` | Rectangular gold tower shield | 176×112 |

Each is a **4-column × 2-row** atlas. Each cell is exactly **44×56 pixels**
with transparent padding around the shield. Frames **0–7** progress from
front face → three-quarter → edge-on → rear face → rear three-quarter →
edge-on → face. All **eight cells per sheet contain unique visible alpha**,
verified from the extracted source images. The source art was carefully
resampled and limited to a 16-color golden pixel-art palette for the
game's battle-map resolution, while retaining the source shield silhouettes,
metal relief and wooden backs. These are not drawn with the old generic
procedural `tshield` primitive once the spritesheet loads.

### Skill/animation assignments

| Lancer Bulwark spinning ability | Turntable |
| --- | --- |
| Tower Shield | Round |
| Storm Bulwark | Diamond |
| Burning Aegis | Kite |
| Frost Rampart | Tower |
| Holy Citadel | Round |
| Shield Storm | Diamond |
| Bastion of Ten | Tower |

The seven spinning Bulwark spells share four original designs. This
mapping is in `src/gfx/lancershields.js`, not baked into the ability
statistics, so artwork choices can be changed independently.

## How the eight orientations align with the world

The game is isometric:
`isoX(x,y)=(x-y)*32`, `isoY(x,y)=(x+y)*16`.

The orbit angle `a` is measured in **world tile coordinates**, not the
screen-space tangent of the shield. The source atlas is arranged clockwise
from frame 0 through frame 7. As of the October 15 rotation correction,
the atlas index is **reversed** relative to increasing world angle:

```js
const clockwise = ((Math.round((a - Math.PI / 4) * 8 / (Math.PI * 2)) % 8) + 8) % 8;
const frame = (8 - clockwise) % 8;
```

The new orbit uses **+2.4 rad/s**, opposite the previous −2.4 rad/s.
The visible turntable therefore displays frames **0 → 7 → 6 → 5 → 4
→ 3 → 2 → 1 → 0** as the world angle increases, rather than following the
original clockwise sequence. At **a=π/4**, frame 0 remains the gold front
on the near side; at **a=5π/4**, frame 4 remains the wooden/metal rear on
the far side. Individual shields still depth-sort in front of and behind
the Lancer as they physically travel around him.

All seven abilities have compact concentric orbit spacing. Base radii
(in world tiles; multiplied by the existing area/visual scaling) are:

| Ability | Radius |
| --- | ---: |
| Tower Shield | 0.70 |
| Storm Bulwark | 0.975 |
| Burning Aegis | 1.25 |
| Frost Rampart | 1.525 |
| Holy Citadel | 1.80 |
| Shield Storm | 2.075 |
| Bastion of Ten | 2.35 |

Adjacent base radii are separated by **0.275 tiles**. These are exactly half of
the previous 1.40–4.70 tile radii (0.55-tile spacing); older PR documentation
reflects that historical, wider arrangement.
**Shield Storm** keeps its intentionally expanding spiral rather than a
fixed ring: the existing spiral radius formula still applies. This
change does not alter hit frequency, damage, shield counts, duration or
spritesheet binary files.

The renderer preserves the PNG alpha, including transparent gaps, and uses
nearest-neighbor scaling; no smoothing or automatic horizontal flip changes
the intended 8-angle artwork. The 44×56 atlas cell is drawn at `0.72 ×
orbit.size`, keeping each visible shield close to the Lancer's scale.

## Critical foreground/background sorting fix

**Former bug:** `Orbit.depth` returns the *owner's* depth (with an offset)
and `Orbit.draw()` painted all orbiters in a single call. Regardless of
where a shield was located on the circle, this could draw **all shields
on the same side of the player's sprite**.

**Fix:** `src/game/render.js` recognizes shield `Orbit` instances and
inserts **each individual shield** into the same normal depth-sorted list
as walls, buildings, creatures and the Lancer:

```js
for (let i=0;i<h.pos.length;i++) {
  const [x,y,a]=h.pos[i];
  sorted.push({d:orbitShieldDepth(x,y,a),f:11,o:h,index:i});
}
```

Then `case 11` draws precisely that shield's sprite cell. This ensures
`x+y < lancer.x+lancer.y` sorts a far-side shield **before the player**,
and a near-side shield **after the player**. The difference also allows
the orbit to pass naturally behind other nearby actor/wall depth slices.

Other orbit weapons (hammers, axes, blades, etc.) keep their original
behavior; only the Lancer's `m.shields` effects use individual sorting.

### Loading and compatibility

`preloadLancerShield(variant)` lazily loads one PNG on the first use and
caches its Image object. It validates dimensions against `SHIELD_FRAME`.
If an image is still loading or unavailable, the ability temporarily
uses the original procedural shape, so **gameplay and hits continue**.
The caster and Lancer gear overlays do not change.

The same foot-anchor/center offset is used for each of the four designs.
Transparent atlas pixels stay transparent so gaps between shield details do
not fill in. The loading fallback uses a matching compact size. Tune the
`0.72 * orbit.size` factor to change shield appearance without changing
combat area-of-effect.

## Validation

**Completed in the connected GitHub implementation session:**

- All four binary PNG blobs were added to the branch. Their Git blob
  object hashes matched the original processed PNG files exactly.
- All four files measured **176×112**, with 8 distinct, nonempty cells
  each (verified with local pixel/alpha analysis, 32 unique cells).
- Evaluated `src/gfx/lancershields.js` with a simulated Image/Canvas
  environment: four successful loads, all 32 expected atlas crops,
  seven valid mappings, and near/far depth ordering. **Zero errors**.
- Verified the renderer uses its own `f:11` pass for each shield
  and that normal orbit weapon drawing is unaffected.

**Still recommended before merging:** real-world Chromium/iOS preview
and visual inspection at the Lancer's actual gameplay scale.

Run from repo root:

```bash
python3 -m http.server 8123
node tools/tests/lancer_shields.js
```

The Playwright test `tools/tests/lancer_shields.js` validates all 32
cells in actual Canvas, checks image dimensions and alpha uniqueness,
checks all skill mappings, and captures the four simultaneously orbiting
shield designs in `tools/tests/out/lancer_shield_depth_front_back.png`.

### Source and change inventory

- `assets/fx/lancer/spinning_{round,diamond,kite,tower}.png`
- `src/gfx/lancershields.js` — asset/ability table, frame selection,
  lazy image loading and per-shield painter/depth helper
- `src/game/skillrun.js` — assigns a `shieldVariant` on each Lancer
  Bulwark `Orbit` hazard
- `src/game/hazards.js` — `Orbit.drawShield(ctx,index)`
- `src/game/render.js` — depth sorts individual shields with player
- `tools/tests/lancer_shields.js` — browser QA/screenshots

Do not move `f:11` shields back into the unconditionally top-drawn
hazard pass: doing so restores the original front/behind layering bug.
