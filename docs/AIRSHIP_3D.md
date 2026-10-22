# The airship (3D model)

A Final Fantasy style flying galleon for deck fights against the Air Pirates: waves on the main deck, bosses on the
quarterdeck. It is built in three.js from the user's **VELScour Material Texture Pack** (`assets/source/airship/`,
35 seamless 160 px pixel-art materials). Nothing in the game uses it yet. As with the Castle and the arches
(docs/CASTLE_3D.md, docs/ARCH_3D.md), the game will draw baked sprites and never run three.js.

- `tools/airship3d.js`: `buildAirship(await airshipMaterials())` returns `{ root, anim(t, dt), info }`. `AIRSHIP` exports
  the hull curves (`beam`, `inner`, `sheer`, `deckAt`, `zAt`/`sAt`) so a later bake or walk map can reuse the deck shape.
- `tools/airship3d.html`: the viewer. http://localhost:8123/tools/airship3d.html (`?px=1|2|3`, `?figures=0`, `?grid=1`).
  Keys: I iso view, P pixel size, F figures, G tile grid, W wind, Space pause. `window.AIRSHIP.look(x, y, z, zoom, az, el)`
  frames any part of the ship.

## Scale and orientation
1 unit = 1 game tile (64 x 32 px), and heights use the same unit, so a 60 px hero is 1.53 units tall.
The bow points along -Z, which the game's iso camera (30 degrees down, `isoView`) shows toward the **upper right**.
The deck therefore lies on the tile grid. The G key draws the whole tiles inside the bulwarks.

| | |
|---|---|
| Length | 40 hull + 9 bowsprit |
| Beam | 12.4 (pods and fins reach about 26) |
| Main deck | y = 0, about 26 x 12 between the bulkheads, 18 x 12 clear between the stair feet |
| Quarterdeck | +2.2, stern 20%, helm and mizzen, the boss spot |
| Forecastle | +2.0, bow 16%, foremast, doors below |
| Walkable | 324 whole tiles, linked by two central stairs 4 tiles wide |

## Parts and materials
Hull: SHIP-05 mahogany, a GOLD-01 strake, SHIP-01 tarblack below it and a MET-02 keel. Decks: SHIP-02 and SHIP-03.
Bulwarks: WOOD-05, under a GOLD-04 rail. Three cedar masts with iron bands, furled CLOTH-01 yards and gold-leaf rotors
that spin. The main mast has a crow's nest and a plum topsail. The ship also has: four brass outrigger engines with
wooden props, two shrouded stern props, plum bat-wing fins at the stern quarters, a rudder fin, gun ports and four
deck guns, two rows of stern gallery windows, a carved taffrail crest, lanterns, rigging lines, waving pennants and
an ensign, a gilded raven figurehead, and three amethyst lift crystals caged under the keel.

The Air Pirate sprites standing on deck for scale are from `assets/source/air_pirates/` (the Air Pirate Expansion
Pack: 30 enemies at 128x192, 10 bosses at 256x320).
