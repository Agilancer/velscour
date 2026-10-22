# Airships (3D models)

Final Fantasy style airships for deck fights against the Air Pirates: the heroes ride a gothic ironclad, the pirates pull
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
E brings a hero through the portal, Space pause. Query: `?scene=`, `?px=1|2|3`, `?figures=0`, `?grid=1`, `?dock=1`. `window.AIRSHIP.look(x, y, z, zoom, az, el)`
frames any point, `AIRSHIP.setScene(name)` switches scenes, and `AIRSHIP.step(sec)` advances the animation
(the preview pane throttles a hidden page, so screenshots use it).

In the fleet scene the boats come up from astern, each in its own lane. Each boat lowers its ramp, holds about 12 s,
raises the ramp and leaves, on a 26 s loop. **Tall boats dock to port**, behind the deck in the iso view: the hauler forward
and the gasbag on the quarter, where its ramp reaches the quarterdeck. The low cutter docks to starboard at the bow.
Anything tall on the starboard side or near the stern would hide the deck.

## Scale and orientation
1 unit = 1 game tile (64 x 32 px), and heights use the same unit, so a 60 px hero is 1.53 units tall. Bows point along -Z,
which the game's iso camera (30 degrees down) shows toward the **upper right**, so the decks lie on the tile grid.
Air Pirate sprites (the Air Pirate Expansion Pack, `assets/source/enemies/air/`; its catalogue in `assets/source/air_pirates/`) stand on the decks for scale.

Both big ships share one deck plan: the main deck at y = 0 is about 26 x 12 between the bulkheads, a raised quarterdeck
(+2.2) covers the stern 20% and holds the boss spot, and a raised forecastle (+2.0) covers the bow. Two central stairs
4 tiles wide join them.

## The heroes' ship (`ironclad`)
A gothic, steam-driven ironclad: fantasy Battlefleet Gothic, not science fiction. It is 40 long, plus a 4.6 ram spur,
and 12.4 in the beam. It has 296 walkable tiles: the bridge takes most of the forecastle, and the clear main deck is
17 x 12. Its first, futuristic version is in commit 3daf240.
- **Hull.** Faceted armor: a vertical belt, a chine, and a V bottom to a keel blade. MET-02 riveted black iron, a
  bronze strake, MET-01 gunmetal and a GOLD-04 cap rail, with crenellations along the bulwarks.
- **Broadsides.** Two gun decks of gilded arched ports run along each flank, with iron buttresses between them.
- **Prow.** A gold-edged iron ram spur, gilded plating strakes along the bow, and a winged gold crest.
- **Cathedral bridge.** On the forecastle. Three tiers of dark iron carry lancet windows, a rose window with plum
  banners, corner spires and flying buttresses. A central spire with a pennant rises from the top. Tall parts go
  toward the bow, where the iso camera only loses sky behind them.
- **Engines.** Two brass steam engines on iron trusses, each with stacks venting steam and a big bronze prop astern.
  Five furnace bells at the stern glow like forges and vent steam: two on the quarter sponsons and three through the
  transom. Gothic gallery windows sit above them.
- **Other parts.** Two quarterdeck turrets, a ship's wheel with a brass binnacle, gothic doors under the raised decks,
  amethyst lift crystals caged under the keel, a ventral keel fin, a flush lift hatch on the main deck and a plum
  ensign. The decks are SHIP-06 greyboards.

### The arrival portal
The party arrives through the bridge's great door on the forecastle. It faces aft and down the grand stairs, so the
whole entrance is in view.
- **The gate.** A gilded pointed arch between iron columns, with a winged keystone. The swirling gate inside uses the
  game's portal colours (`drawPortal` in `src/game/render.js`): orange-red with a white-hot core.
- **Around it.** Braziers on both sides, a rune ring turning on the landing, an orange light spilling down the stairs,
  and sparks drifting out of the gate.
- **The hooks.** `ship.arrive()` flares the gate and throws a burst of sparks. `info.portal.path` is the walk from the
  gate across the landing and down the stairs to the main deck.
- **In the viewer.** A hero steps out every 7 s, and the E key brings one at once. Each hero is a class-select portrait
  (`assets/sprites/select/`) that appears white-hot in the gate and walks the path. Walking sprites are moved toward
  the camera along the view direction. In an orthographic view that only changes their depth, so their tops no
  longer lean back into the gate or the stairs.

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
