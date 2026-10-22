# Airships (3D models)

Final Fantasy style airships for deck fights against the Air Pirates: the heroes ride an armored ship, the pirates pull
alongside in boarding boats and drop ramps onto its rail to offload waves, and bosses take the quarterdeck. There is also
a wooden galleon of the same size. All are built in three.js from the user's **VELScour Material Texture Pack**
(`assets/source/airship/`, 35 seamless 160 px pixel-art materials). Nothing in the game uses them yet. As with the Castle
and the arches (docs/CASTLE_3D.md, docs/ARCH_3D.md), the game will draw baked sprites and never run three.js.

| File | Builds |
|---|---|
| `tools/airship3d.js` | `buildAirship(M)`: the galleon. Also the shared parts: `airshipMaterials()`, `Parts` (geometry merged per material), `hull()` (a lofted hull with bands, bulwarks and decks), `slab`, `rod`, `box`, `surf`, `flag`, `ramp`, `plume` |
| `tools/airship3d_ironclad.js` | `buildIronclad(M)`: the heroes' armored ship |
| `tools/airship3d_skiffs.js` | `buildSkiff(M, 'gasbag' \| 'cutter' \| 'hauler', rampSide)`: the pirate boats |
| `tools/airship3d.html` | the viewer |

Each builder returns `{ root, anim(t, dt), info }`. On the big ships `info.walk` exposes the deck curves (`inner`, `deckAt`,
`zAt`/`sAt`, `blocked`) for a later bake or walk map. A skiff also returns `setRamp(f)` (0 = up, 1 = down on the rail).

## Viewer
http://localhost:8123/tools/airship3d.html. Keys 1 to 4 pick the scene: **fleet** (default), **ironclad**,
**galleon**, **skiffs**. Other keys: I iso view, P pixel size, F figures, G tile grid, W wind, D holds the boats docked,
Space pause. Query: `?scene=`, `?px=1|2|3`, `?figures=0`, `?grid=1`, `?dock=1`. `window.AIRSHIP.look(x, y, z, zoom, az, el)`
frames any point, and `AIRSHIP.setScene(name)` switches scenes.

In the fleet scene the boats come up from astern, each in its own lane. Each boat lowers its ramp, holds about 12 s,
raises the ramp and leaves, on a 26 s loop. **Tall boats dock to port**, behind the deck in the iso view: the hauler forward
and the gasbag on the quarter, where its ramp reaches the quarterdeck. The low cutter docks to starboard at the bow.
Anything tall on the starboard side or near the stern would hide the deck.

## Scale and orientation
1 unit = 1 game tile (64 x 32 px), and heights use the same unit, so a 60 px hero is 1.53 units tall. Bows point along -Z,
which the game's iso camera (30 degrees down) shows toward the **upper right**, so the decks lie on the tile grid.
Air Pirate sprites (`assets/source/air_pirates/`, from the Air Pirate Expansion Pack) stand on the decks for scale.

Both big ships share one deck plan: the main deck at y = 0 is about 26 x 12 between the bulkheads, a raised quarterdeck
(+2.2) covers the stern 20% and holds the boss spot, and a raised forecastle (+2.0) covers the bow. Two central stairs
4 tiles wide join them.

## The heroes' ship (`ironclad`)
40 long, plus a 4.6 prow blade, and 12.4 in the beam, or about 29 across the wings. It has 296 walkable tiles: the bridge
tower takes most of the forecastle, and the clear main deck is 17 x 12.
- **Hull.** Faceted rather than round: a vertical armor belt, a chine and a V bottom running to a keel blade. MET-08
  blue steel above a violet neon strake, MET-06 silver, then MET-02 riveted iron. A GOLD-02 cap rail and gold-riveted
  silver plates amidships.
- **Decks.** SHIP-06 greyboards, like a battleship's planked deck, with lit inlay lines and a flush lift hatch in the
  middle of the main deck.
- **Forecastle.** A three-tier bridge tower banded in lit glass, a forward-swept dorsal fin and a radar mast with a
  spinning dish. Tall parts go toward the bow, where they only hide sky.
- **Engines.** Five glowing engines at the stern: two Highwind style sponsons along the stern quarters and three
  thrusters through the transom. Swept wings carry turbine nacelles whose intake fans spin, with canards at the bow.
  The plumes are cyan.
- **Weapons.** Four sponson turrets and two quarterdeck turrets, all sweeping slowly.
- **Other parts.** A helm console with a floating crystal, violet lift drives under the keel, and a plum ensign.

## The pirate boats
Rough wood, rust and patched canvas, with red lift crystals and black flags.
- **Gasbag sloop.** 14 x 2.7, crew about 6. Slung under a patched balloon with iron hoops and charcoal tail fins.
  Mossy hull, stern prop, tiller.
- **Harpoon cutter.** 13 x 2.3, crew about 4. Narrow and scorched, with a black lateen sail, a harpoon ballista and
  spikes on the bow, twin outrigger props and a boarding plank.
- **Grapple hauler.** 15 x 3.8, crew about 10. A boxy patched barge under a top rotor on a tripod. It has a
  smokestack trailing smoke, a crane with a grapple, cargo, a big stern prop and a wide drawbridge.

## The galleon
Wood throughout: a mahogany hull with a gold strake, mast rotors, outrigger engines, shrouded stern props, bat-wing
fins, amethyst lift crystals and a raven figurehead. It is 40 + 9 bowsprit long, with 324 walkable tiles.
