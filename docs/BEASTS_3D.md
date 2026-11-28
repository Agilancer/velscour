# Live 3D beasts (Blender-built models)

Some creatures and signature companions are skinned, animated 3D models drawn live into the 2D frame, instead of
painted sprites or shapes drawn in code. Each model is built by a Blender script in `tools/blender/` (no `.blend` files
in the repo: the script makes the GLB from nothing, or from a source GLB it names), exported to
`assets/models/beasts/<id>.glb`, and drawn by `src/gfx/beasts3d.js` with three.js (the copy in `vendor/three/`).

| Model | Script | Drawn by | Used for |
|---|---|---|---|
| `dragon.glb`, `dragon_wyvern.glb`, `dragon_frost.glb`, `dragon_whelp.webp` | `dragons.py <bm repo>` | `src/gfx/dragons3d.js` | Dragon Knight / Dragoon summons (whelp, wyvern, frostwyrm, elderwyrm), the Dragonheart spectre, Wyrm Coil, Roar, dragon forms |
| `dkwings.glb` | `dkwings.py` | `src/gfx/dragons3d.js` (`drawDkWings`) | the Dragon Knight's wings (her signature) |
| `grub.glb` + `grub_<kind>.webp`, `grub_<kind>_glow.webp` | `grub.py` | `src/gfx/grubs3d.js` | the Carrion Witch's Carrion Grubs |
| `voodoodoll.glb` | `voodoodoll.py` | `src/gfx/voodoodoll3d.js` | the Carrion Witch's Hex Poppet and her Voodoo Doll curse |
| `phoenix.glb`, `raven.glb` | `phoenix.py [phoenix\|raven\|all]` | `src/gfx/phoenix3d.js`, `src/gfx/birds3d.js` | the Ranger's phoenix, the `phoenix` and `raven` summons |
| `treasureimp.glb` | `treasureimp.py` | `src/gfx/treasureimp3d.js` | the Treasure Imp (`src/game/happenings.js`) |
| `skulllantern.glb` | `skulllantern.py` | not yet | the Necromancer's Soul Harvest lantern: built, not yet wired into `src/game/sigs/necromancer.js` |

Sources taken from the user's other repos are copied under `assets/source/beasts/<name>/`. The dragons are the
exception: `dragons.py` reads bm's `assets/monsters/tripo/dragon_{red,green,undead}.glb` (about 7.6 MB each) from a bm
clone given as its first argument.

## Building

Blender runs as a Python module, so no Blender install or display is needed:

```bash
python3 -m venv /opt/bl/venv && /opt/bl/venv/bin/pip install bpy pillow numpy   # Blender 5.x as a module (Python 3.13)
/opt/bl/venv/bin/python tools/blender/grub.py                                   # or any other script in tools/blender/
```

`tools/blender/bkit.py` holds the shared helpers (import a GLB without the importer's bone-shape sphere, decimate,
shrink images, keep only some actions, export a GLB with WebP textures). Cycles (CPU) works for baking textures;
EEVEE and the viewport do not, headless. Draco and meshopt compression are not available in the module.

GLB conventions: y up, the creature faces +z (in Blender: z up, facing -y), its feet or its hover point at the origin.
Animations are Blender Actions exported as named glTF clips (`export_animation_mode='ACTIONS'`). Another hide for
the same UVs is a texture `assets/models/beasts/<id>_<skin>.webp` (flipY false), picked with `skin:` (and `eskin:` for
its glow map). Budget: about 12k triangles, 1024 textures and 3 MB a model, since they draw live on phones too.

## Drawing (`src/gfx/beasts3d.js`)

`drawBeast(ctx, id, x, y, o)` draws model `id` with its origin at (x, y). It returns false until three.js and the model
have loaded (and without WebGL): every caller keeps its old drawing as the fallback. Options (see the doc comment):
`key` (a stable name per instance), `k` (px per model unit), `yaw` (a tile-space angle), `pitch`, `roll`, `clip` + `t`
(+ `loop`), `clip2` + `t2` + `mix` (a blend), `skin`/`eskin`, `tint`, `glow`, `ember` (emissive strength), `flash`,
`alpha`, `add` (drawn as light), `bones` (per-bone turns and scales after the clip), `hide`/`show` (meshes by name),
`points` (nodes whose screen offsets `beastPoint(key, node)` returns next frame), `light`, `outline` (px of dark
outline round the solid meshes; off by default).

How it works: one WebGL renderer on one hidden canvas (an OffscreenCanvas where there is one). Every `drawBeast` asks
for a cell; `flushBeasts()` (called once a frame at the top of `renderWorld` in `src/game/render.js`) poses and renders
all the asked cells into one atlas, shelf-packed (512, 1024 or 2048 a side), hands the atlas over as one ImageBitmap,
and the next frame's `drawBeast` copies its cell. A pose is therefore one frame old; its place on the screen is not.
The GPU canvas is never read back. Six or more cells are re-posed every other frame. Without a GPU (SwiftShader,
llvmpipe: headless tests) multisampling is off. The camera is the game's: orthographic, 30 degrees above the ground,
looking down the tile diagonal, lit from the upper left like the painted art.

Summons and monsters drawn in 3D: `src/gfx/beastlooks.js` maps a creature's `summonKey` (or a monster's `beastKey`) to
a drawer, and `Creature.draw` asks it first. A drawer registers itself with `registerBeastLook([keys], fn)` and is
imported at the bottom of `beastlooks.js`. There is an import cycle here (creature.js -> beastlooks.js -> drawers ->
game modules -> creature.js): a drawer must not use game-module bindings at its module top level, only inside its
functions, and registers with literal keys.

Review sheets: `tools/beasts3d.html` (contact sheets, or `live=1` for a turntable) and
`node tools/tests/beasts3d_sheet.js <model> "clips=a,b&cols=6&k=300&cell=380&yaws=0.4,2.4&ay=0.75[&skin=x][&spin=1]"`
(writes `tools/tests/out/beast_<model>.png`). Skill icons of a model: `node tools/beasts3d_icons.js` writes
`assets/models/beasts/icons/<name>.webp`, shown for a summon whose `look.icon3d` names it (`src/ui/icons.js`).

## The Carrion Grubs

The Carrion Witch's skill **Carrion Grubs** (her fourth tree, `src/data/skilltrees4.js`; it replaced Gravecall) hatches
corpse grubs about as long as the Witch is tall, three a cast, up to seven: one of each coloured kind and a second white, in the order
white, orange, pink, yellow, green, brown, white (`HATCH` in `src/game/carriongrubs.js`). A cast on a full brood throws none away: it
rouses them (+20% life, signature magic ready). All six are the same model in another hide, with their own build
(bone scales, `SHAPE` in `src/gfx/grubs3d.js`) and a ring of their colour on the floor.

| Kind | Role | What it does |
|---|---|---|
| White, Carrion Grub | melee | bites, slams (stun), tail-whips; Rot Wave; Regurgitate heals the most hurt of the brood; eats corpses to heal and swell |
| Yellow, Bile Grub | ranged | acid spit, three-shot barrages, lobbed burning pools; Corrode (amplify damage) on its target's pack |
| Green, Plague Grub | ranged | every hit poisons; lobbed plague clouds; Pandemic on its target's pack |
| Orange, Bloat Grub | melee, taunts | draws foes, hardens when hurt; Burst Pustules hurl a crowd back, burning |
| Brown, Leech Grub | melee | its bites feed the Witch; Blood Feast drains a crowd into her and the brood |
| Pink, Brood Mender | support | Soothing Ichor heals the brood and the Witch, Chrysalis Ward hardens them, Sickly Spores weaken and slow |

Every grub knows the model's twelve moves (`GRUB_CLIPS`): idle, slither, slither_fast; bite, slam, whip (close);
spit, barrage, lob (ranged); pulse, heal, ward (magic); plus hit and death. The Witch's healing from her brood is capped
at 12% of her life every 6 s. A dead grub writhes and deflates (`Husk`). Test: `node tools/tests/grubs.js`.

## Open

- The Necromancer's skull-lantern model exists but the game still draws the old lantern.
- Critic round 1 asked for more on the Dragon Knight (bigger heads and longer necks, three distinct silhouettes, a
  solid Dragonheart spectre, bigger wings at low heat) and on the voodoo doll at game size (bigger, lighter, a stab that
  links to the victim, a stronger curse apparition). Part of it is done (values, bellies, cupped wings); the rest is open.
- Frame cost on a real GPU has not been measured (`fps.js`); in headless software GL one phoenix costs 12-22 ms.
