# The Deep Rail Mines (`deep_mines`)

A dwarven mine overrun from below. The hero starts at the Lift Head and rides minecarts down from shaft to shaft. At a
junction a switch by the cart picks the line. The packs get denser and tougher with every tier, and something from the
bestiary waits at the Bottom. Killing it opens the exit there. You reach it from Velscour's skull with `mines`, `mine`,
`deep mines`, `rail mines`, `deep rail mines`, `minecart` or `minecarts` (the HAIL VELSCOUR! list has it too, as a beta biome).

## How it works
- **Layout** (`src/world/mines.js`): the shafts are lumpy cave chambers laid out in tiers down the screen. The tiers
  widen and narrow like a lattice: `1-2-3-2-1`, `1-2-1-2-1`, or `1-2-3-3-2-1` (deeper depths roll the long one more
  often). Each line runs to a neighbouring shaft one tier down, so no two lines cross. Some junctions lose a branch at
  random, but no shaft loses its last way in. Rails run along tile rows and columns in a Z: out of a shaft's out stop,
  a jog, then into the next shaft's buffer stop, with rounded corners. A line to the right leaves along +x and one to
  the left along +y, so a shaft's two lines in meet at the same buffer stop.
- **Tunnels** are three tiles wide. They are floor, so the walls line them, but every tile is `map.block`ed, so only a
  cart goes there and monsters can't use them.
- **Art**: the floors, walls and props come from the painted packs. The mine uses the Crystal Caverns' shale and
  gravel round the Catacombs' rough rock walls, recoloured to rust and lamp-brown, plus the town's crates, tool racks,
  wheels and barrels (`MINE_ART`). The world is built with the town tile set like every overworld, so the run swaps
  `world.tileset` for the mine's own set. Torches go on the back walls, fewer in the tunnels. Monsters and the boss come
  from `rollLooks`/`looks.boss` (the Bottom prefers the diggers: worm, golem, abomination, spider, elemental, beetle).
  No new enemy art was added.
- **The minecart** (`src/gfx/mines.js`) is a three.js model (plank hull, iron bands, wheels, a load of ore and gold).
  It is baked once, when the region loads, into a sprite atlas from the game's own camera: 16 headings over half a turn,
  each baked twice, once as the whole cart and once as only its near walls and wheels. The near-walls bake is drawn
  again over a rider, so he stands inside the cart. Without three.js a flat 2D cart stands in. The rails (ties plus two
  steel rails), the buffer stops and the switch levers are Canvas 2D.
- **The run** (`src/game/mines.js`): each cart and switch is a world portal with `seagate: true`, which makes
  `drawPortal` skip it so the cart draws itself. It is set inactive, so it has no portal glow. A ride is a cut scene:
  `Cine.play` with the camera on the hero, `until` the ride ends. The run's `update` (called by `cineTick`) moves the
  hero and the cart along the sampled line. The cart speeds up, runs at 7.5 tiles/s, then brakes for the buffer, which
  takes about 5 s. On arrival the party steps off and the shaft name shows. The carts are hazards in the depth-sorted
  pass and the rails are a `ground` hazard.
- **Auto-play** reads `objective`: in a shaft, it goes to the cart and uses it (at a junction it flips the switch half
  the time). At the Bottom it goes to the boss.

## Files
`src/world/mines.js` (generator, `checkMines`), `src/game/mines.js` (run, Quest Log), `src/gfx/mines.js` (rails,
lever, three.js cart bake), `src/game/regions/mines.js` (registration), `tools/tests/mines.js`. No shared file was
changed.

## Test
`node tools/tests/mines.js [seeds=60] [noauto] [noshots]` runs these checks:
- the skull word reaches the mine
- 60 seeds generate cleanly: every shaft is reached by cart, the Bottom too, each cart can be walked to from its buffer
  stop, the boss, exit and chests are in reach, the tunnels are blocked, and no line crosses a foreign shaft
- the cart atlas bakes
- monsters per shaft grow with depth
- a ride sets the hero down in the right shaft
- a switch changes the line
- riding to the Bottom and killing the boss opens the exit
- the Quest Log shows the steps
- auto-play clears a whole mine

Screenshots are written to `tools/tests/out/mines_*.png`.

## Status
Playable beta. Last run: 60/60 seeds clean, and auto-play cleared a mine in about 2.6 game minutes (4 rides). `flow.js`
passes.

## Next
- Arches over the tunnel mouths (the packs' timber/ironbound arches need straight, axis-aligned wall gaps).
- No ride back up: a used cart stays at its buffer. If the hero wants to leave, the town portal is at the Lift Head.
- Monsters are not levelled per tier; only pack count, size and rank (champions, a unique from tier 3) grow.
- Events on a ride (a cave-in, a pack jumping aboard) and a mine-specific boss intro line.
- Not tested on mobile (the carts are portals, so tapping one should work).
