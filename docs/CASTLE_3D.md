# The Castle in 3D

The Castle overworld's masonry is one 3D model: both curtains, their towers, the gatehouse and twin gates, the stairs,
the explorable keep, the cathedral and the great hall. It was built in three.js and baked from the game's iso camera.
The game never runs three.js: it draws the baked pieces as the columns of a height map (the Mountainside engine,
docs/MOUNTAINSIDE.md), so you walk along the tops of the walls, climb stairs to them, pass through gate tunnels and
explore the keep, all at no runtime 3D cost.

```bash
python tools/castle3d.py textures        # masonry, slate and plank textures -> assets/source/castle3d/tex/
node tools/castle3d_bake.js              # bake -> assets/source/castle3d/out/ (CASTLE3D_S=1.5 is the shipped scale)
node tools/castle3d_bake.js preview 169,196[,w,h]   # one framed 3D view of an area -> tools/tests/out/
python tools/castle3d.py pack            # -> assets/tiles/castle3d/ (lossless WebP pages + index.json)
node tools/tests/castle3d.js             # in the game: wall-walk, stairs, tunnel, throne room, doors, drawbridge, overview
node tools/tests/castle_overworld.mjs    # 100 seeds: sealed curtains, open gates, wall-walk, rooms, doors (no browser)
node tools/tests/scenarios.js            # a bot plays every Castle scenario (the drawbridge comes down for it)
```
`tools/castle3d.html` is also an orbit viewer of the whole model. On Windows the bake wants a GPU:
`CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist"` (about 2 s; SwiftShader is much slower).

## The layout (`src/world/castle3d.js`)
Pure data, so it also runs under Node. Both the game and the bake read it.
- **Heights** are terrain levels (4 world px). The outer wall-walk is at 26 and the inner at 34; the gatehouse is 42;
  the keep floor is 2, its walls 34 and its great tower 50. A body hops up 4 levels and drops 10, so walls are walls
  from below.
- **Curtains** are the old wall cells plus one tile on the ward side. The outermost row is the crenellated parapet
  (blocked) and the two rows inside it are the wall-walk (`map.rampartDeck`). Gates leave tunnels.
- **Towers:** round drums on the corners and square towers between them. Their platforms are on the walk, so the walk
  runs through. Each drum's parapet opens toward the two walls it joins. The inner drums are roofed and are walked
  through under the roof.
- **The gatehouse** has an arched tunnel, two drums standing out over the berm, a portcullis and a **drawbridge**
  (`map.drawbridge`) over the moat to a stone pier and a causeway. The postern and both inner gates are twin-towered
  tunnels with gate leaves.
- **Stairs** are two tiles wide and rise 3 levels a step against the ward side of each wall (four per curtain).
- **The keep** (50 x 33) has an entrance hall, the **throne room** in the west wing (its dais two steps up), and the
  council chamber and armoury in the great tower. **The cathedral** has a raised nave, aisles and a belfry; **the great
  hall** has twin roofs. Walls are two tiles thick outside and one inside. Every doorway is an arched tunnel with door
  leaves.
- **Per-tile flags:** `struct` (drawn from the bake), `solid`, `walk`, `cover` (masonry over a walkway: tunnels,
  lintels, the roofed drums) and `bld` (inside a building).

## The bake (`tools/castle3d.html`)
- **Parts become geometry in world units**, with UVs mapped from world position by face direction, so textures run on
  across parts. Boxes are cut round every arched opening. Walls carry arrow slits, string courses, pilasters and
  mullioned lancet windows (`face` parts). Parapets get breastworks and merlons on a 2-tile rhythm.
- **Materials:** the Castle Keep pack's ashlar (greyed toward the castle pack's limestone) and chapel carving, made to
  tile vertically. Each texture doubles as its own **bump map**. Roofs use procedural slate, and the doors and
  drawbridge procedural planks with iron bands.
- **Light** is fixed to the camera, from the upper left, with one fixed shadow frustum over the whole castle.
- **Pieces:** a second pass writes each pixel's tile (and layer: 0 masonry, 1 what stands over a walkway). The render is
  cut into one piece per tile and layer. Identical pieces are merged (same shape, colours within 6), which leaves
  about 3,000. They are packed into three 4096-wide pages at 1.5 px per world px.
- **Roofs** are baked per building and cut into 32 px columns.
- **Moving parts:** the drawbridge (9 frames, upright to flat, with chains), the portcullis (9 frames, rising) and every
  door's two leaves (6 frames). They are rendered among the masonry drawn depth-only, so a jamb or arch in front of them
  cuts them exactly.

## In the game
- `src/world/castleworld.js` applies the layout: `map.hgt`, blocking, the wall-walk and muster posts, the rooms
  (`castleRooms`: the throne room is in the keep now), the doors (`castleDoors`), roof strips and moving parts. Old
  props left in the masonry are dropped.
- `src/gfx/castle3dart.js` loads the pages. `src/gfx/terrain.js` draws a masonry tile's pieces in place of the rock and
  bank of a cliff (tunnels get their floor first), keeps the Castle's blended ground on the other tiles, and redraws
  pieces over anyone behind them. It also redraws what stands over a walkway after whoever walks under it. Both fade
  where they would hide the hero (`cutaway`, `src/game/render.js`).
- **Roofs** lift off while the hero is inside their building and fade over anyone behind them. Lights inside a roofed
  building are left out of the light map.
- `src/game/castle3d.js` (every frame): the drawbridge comes down when the hero is within 11 tiles of it and only then
  opens the crossing. Doors swing open while anyone is within about 3 tiles and close behind them.

## Limits
- **Memory:** the pages decode to about 36 Mpx (around 140 MB), which is fine on desktop. Phones may want a 1x bake.
- Door leaves on walls facing away from the camera (the cathedral's west door, the great hall's north door) are hidden
  by their own walls.
- The scenario bot finishes every Castle scenario, but several now have longer waits between fights (up to 37 s):
  there's more walking up stairs and along the walls.
