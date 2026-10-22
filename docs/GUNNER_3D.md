# The Gunner's turrets and biplane (3D models)

The Gunner's four turret summons and his Bombing Run biplane are three.js models built from the airships' **Material
Texture Pack** (`assets/source/airship/`, loaded with `airshipMaterials()` from `tools/airship3d.js`), baked into sprite
sheets. As with the airships, the Castle and Varrow's axe, the game draws the bake and never runs three.js.

| File | What |
|---|---|
| `tools/gunner3d.js` | `buildTurret(M, kind)` (a fixed stand + a head that turns about the pivot) and `buildBiplane(M)` |
| `tools/gunner3d.html` | the orbit viewer and the bake (`window.GUNNER3D`) |
| `tools/gunner3d_bake.js` | writes `assets/sprites/gunner/<kind>.webp/json` and `biplane.webp/json` (`preview` for a contact sheet) |
| `src/gfx/gunner3d.js` | draws them: `drawTurret3D(ctx, m)`, `turretMuzzle(m, ang)`, `drawBiplane3D(...)`, `preloadGunner3D()` |
| `tools/tests/gunner3d.js` | sheets, heads on target, shots from the barrel, walking through, the Bombing Run; `video` films it |

## The models
Units are tiles, as on the airships: a 60 px hero is 1.53 tall. Forward is +X.
- **Gun Turret** (`turret`; also Turret Fortress): a riveted black iron tripod with brass feet and an ammo crate. The
  head has a six-barrel rotary gun behind a curved riveted shield with a gold trim, a brass ammo drum, a scope with a
  red lens and a gold finial. 3 frames turn the barrel cluster, so it spins while firing.
- **Flame Turret** (`flameturret`): a squat iron drum with two copper fuel tanks on a cradle and hoses. The head has a
  bronze housing, a copper fuel ball, a finned barrel and a brass bell nozzle with gold fangs and a pilot light. Frame 1
  is lit.
- **Rocket Turret** (`rocketturret`; also Mortar Team): a heavy octagonal riveted plinth on four stabiliser feet. The
  head has a yoke with two green-copper pods of four red-tipped rockets, pitched up, and a radar dish. Frame 1 shows
  exhaust glow, with the pods kicked back.
- **Cryo Turret** (`cryoturret`): a blue-steel tripod caging a glowing coolant canister. The head has frost fins, a
  barrel wound with copper coils and an ice crystal held out by three gold prongs. Frame 1 lights the coils and the
  crystal.
- **Biplane**: a mahogany fuselage with gold bands, a brass cowl and a radial engine with a gold spinner, and canvas
  wings with crimson tips, gold leading edges, wood ribs and plum roundels. It also has blackwood struts and bracing
  wires, a plum tail, twin cowl guns, four bombs under the lower wing, wheels, and a goggled pilot with a plum scarf.
  Its 2 frames turn the propeller behind a faint blur disc.

## The bake
The game's iso camera is orthographic, 30 degrees down, with 1 unit = 1 px and the sun fixed to the camera at the top
left. Shadow maps are on: the wings shade the fuselage and the heads shade their own parts. The bake is at 2x (`S`).
- **A turret sheet** has rows for the head's frames, each holding 48 turns, then one stand cell. Its JSON gives the cell
  sizes and ground anchors, `pivot` (px above the ground) and `muzzle: [tiles forward, px up]`.
- **The biplane sheet** has 2 propeller rows of 32 headings each, then a row of its ground shadow (the model flattened
  and drawn black).
- Turn i is game heading `i / n * 2PI` in tile space (0 = +x, screen down-right), which is yaw `-heading` in three.js.

To rebake, serve the repo (`python3 -m http.server 8123`), then run `node tools/gunner3d_bake.js`. It needs three.js
from jsDelivr. Where the CDN is blocked (Claude cloud containers), `npm pack three@0.170.0` into a scratch folder,
unpack it and set `THREE_DIR=<that folder>/package`; the bake then serves three.js from the local copy.

## In the game
- `Creature.draw` hands the four turret summon keys to `drawTurret3D`. Until a sheet loads it returns false and the
  old sprite draws. The sig's `enter` preloads all five sheets.
- **The head** slews toward `m.target` (fast) and sweeps slowly round its last bearing while it has none. When summoned
  it drops onto its spot with a puff of dust, spinning up. While firing (`attackAnimT`) it kicks back along the barrel,
  the gun's barrels spin, the others show their lit frame, and a muzzle glow, pilot light, ice glow or back-blast is
  drawn. The rim (green for allies) is drawn under the stand and the head.
- **Shots from the barrel**: `summonAttack` asks `turretMuzzle(m, ang)` for the barrel tip. Bullets and rockets start
  there at the muzzle's height, and the flame cone and the cryo beam come out of it. If the tip is inside a wall, the
  shot comes from the turret itself.
- **The hero walks through his own turrets**: `World.separate` no longer lets a static summon push its owner. This
  holds for every class's static summons: turrets, totems, sentries, hydras. Monsters still bump into them.
- **Bombing Run** (`src/game/sigs/gunner.js`): the biplane swoops in from about 220 px up, levels out at 150 px over the
  targets and climbs away, rocking its wings and banking as it leaves. Its shadow is a ground hazard, so it sits under
  the monsters. The old drawn biplane is the fallback.
