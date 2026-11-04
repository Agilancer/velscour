# Mountainside: a switchback climb in three.js

A 72 x 104 climb (three times the beta's 50 x 50) from the foot of a mountain (the bottom-left edge of the screen) to
its summit (the top-right), drawn live in three.js with smooth slopes, steep cliffs and ledges the hero hops up. Out of
beta (November 2026): it is in the regular overworld rotation (`BIOMES`, so the biome bag and the overworld
guarantee draw it). Velscour's skull still reaches it (`mountain`, `mountainside`, `climb`), as does the HAIL VELSCOUR!
list. Winning it does not open an exit: the party goes straight on, at the same depth, into
**[the Snowy Summit](SNOWY_SUMMIT.md)**, whose peak opens the way on.

It plugs in as a region (`src/game/regions/mountain.js`, `docs/NEW_REGIONS.md`); game.js has no Mountainside code of
its own beyond `continueTo` (the hand-over) and `useAlpine` in `setWorld`.

| File | What |
|---|---|
| `src/world/mountain.js` | `generateMountain`: cliff bands, ways up (ramps and scrambles), terraces, crags, shelves, the trail, floors, props, packs, leaps |
| `src/game/mountain.js` | the run: trail progress, the leap-down ambushes, the snow line, the Warden, the hand-over to the Summit |
| `src/world/alpine.js` | tile heights in levels to the vertex field (four vertices a tile edge), rounded outlines, the cap; reach and step counts |
| `src/gfx/alpine3d.js` | the three.js scene: per-tile floor atlas, triplanar cliffs, snow, the skirt, the sea of cloud, the painted sky |
| `src/game/alpine.js` | `world.cave` for these maps: elevation, picking, horizon, camera look-at; `hopArc`; `useAlpine` |
| `src/gfx/mountainart.js` | the 21 mountain floors (town and Dark Forest floors recoloured) |
| `tools/tests/mountain.js` | rotation, seeds, the hop rules, the arc, A*, flow, picking, shots, auto-play into the Summit |

## Height, slopes and hops
- Heights are levels per tile (`map.hgt`, 4 px a level; 9.8 levels a tile of height). A body **walks** a step of up to
  `map.walkStep` = 3 levels, **hops** up to `map.climb` = 7 levels (28 px) and drops at most `map.drop` = 10. Cliffs are
  rock tiles (`map.t = 0`), so they are walls both ways; the hop rule is `stepOk` in `world/map.js`.
- `buildField` (world/alpine.js) turns tile heights into a vertex field, 4 vertices a tile edge: neighbours a walk apart
  blend into a **slope**; neighbours further apart keep flat tops and meet at a crisp crease a quarter tile wide, a
  **ledge**; rock tiles take their own heights (a cliff band's top, the ridge, the fall) roughened with noise. Convex
  corners of walkable ground are cut and notches filled a quarter tile, so outlines aren't stair-stepped. The cap (as in
  the caverns) lowers any rock that would rise over the line of sight to walkable ground behind it.
- The **hop**: on a smooth field the ground carries a sprite up the crease; `hopArc` adds an arc (7 px plus 2.4 px a
  level) when a creature's tile rises by more than a walk, and a small one when it drops off a ledge (render.js case 6,
  `map.hopArc`).
- Elevation, picking (a march down the view ray, walkable ground first) and the horizon (who is hidden behind higher
  ground) are the caverns' methods (`game/alpine.js`).

## The map (`generateMountain`)
- Uphill is `v = 103 - y`. Ten cliff bands (13-19 levels, one or two tiles thick, wavy away from their way up) cross the
  slope 8-10 rows apart. The bands rise a level a row.
- Each band has **one way up**, at alternate ends (east on even bands, west on odd), so the trail switchbacks: a graded
  **ramp** three wide cut through the cliff (a walk all the way), or a **scramble**, a stair of rock steps 5-6 levels
  each (hops), pale gravel treads between stone risers. A ledge's face between two walkable tiles is drawn as laid stone
  steps (light), a cliff's as rock (darker), so a hop reads apart from a wall; rope posts (pitons in the snow) stand
  beside the trail's hops. A ramp's shoulders are rock where it runs more than a hop above or below the ground beside it.
- Half the bands whose way in was a ramp have a **terrace step** a hop high across them (more hops on the trail).
  Crags too tall to climb dot the slope (taken back if they would cut the climb), and up to six **shelves** sit a hop
  above the ground round them, each with a chest.
- A rock ridge walls the west (it rises gently, gravel and stone where it isn't steep), the east falls away into the
  haze, the foot falls into the sea of cloud, and above the summit plateau the peak rises in snow.
- The **trail** is the cheapest two-way path from the foot to the summit (hops cost a little more); it is laid in dirt,
  gravel and mud low down and compact snow and bootprints above the snow line, stone steps on the ramps.
- **Ground** by band: meadow and petals at the foot, deep grass and ferns, alpine grass and moss, dry grass and lichen,
  then the top two bands in the **Snowy Summit pack's** floors (wind-packed snow, ripples, exposed rock, alpine tufts,
  powdered gravel) and its props (snow-capped boulders, ice spires and crystals, slate spurs, trail markers, cairns,
  lanterns on the rope posts, a brazier camp). The summit: the pack's shrine altar, braziers, warning bell, a sentinel,
  a menhir. The cliffs above the snow line carry snow on their ledges.
- **Props** below the snow: the town pack's firs, pines, cedars, junipers and frost firs and the Dark Forest's spire
  pines and moss firs (thinning with height), boulders, shrubs, flowers, cairns and signs, two climbers' camps. A sprite
  is never placed where ground in front of it rises over its foot (sprites draw over the 3D).

## Fights all the way
- A pack beside the trail every 15-21 tiles of it (2-5 strong, every seventh a champion's, now and then a unique), a
  pack at the top of every way up (a champion's at half of them), a breather round each climbers' camp, and two archers on
  each shelf near the trail, shooting down until someone hops up to them. `mountain.js` checks no stretch of 64 trail
  tiles goes without a fight.
- **Leaps**: just past every other way up, two or three things wait on the cliff top above the next leg; when the hero
  passes beneath they leap down onto the trail (a telegraphed landing).
- Monsters are the regular bestiary; from the band below the snow line up they wear frost and rime swaps
  ("Frostbitten"). The mountain's own ambushes replace mayhem's (`world.ambushT = Infinity`).
- **The Summit Warden** (a golem boss in a frost swap) waits on the summit. Its fall wakes a portal under the Snowy
  Summit pack's slate-pass arch at the back of the summit (the camera pans to it); walking into it (auto-play's
  objective; on its own after 20 s) runs `game.continueTo('snowy_summit')`, which carries the party (and the loot lying
  round them) into the Snowy Summit at the same depth; `c.nextBiome` is the Summit from then on, so a town trip comes
  back to it.
- **Checkpoints**: the map is kept per depth (`c.mountainRuns[depth] = { seed, camp }`); the three climbers' camps are
  checkpoints, and a town trip returns to the highest one reached. The minimap marks the trail ahead and the next way up.

## The look
- Daylight: `world.darkK = 0`, the 3D carries the light (a sun from the upper left in front, so both faces the camera sees
  take some; a cool fill from the right; hemisphere, ambient). Cliffs are the Snowy Summit pack's granite and shale with
  their snow caps taken back to stone, normalised to a mid grey (`rockFace`), at two scales mixed by noise; rock far from
  the trail hazes toward the mist; a dark bare rim lies under every walkable edge. Snow on rock (above the snow line) is
  the pack's snow crust where the blurred ground is gentle. Floor art on rock is greyed and shaded so it never reads as
  path. Floors are mirrored/turned per tile (not the directional ones) with wobbly seams. The 3D upscale is smoothed on
  phones (over 1.5x). The sky is a
  painted gradient with a pale sun and three ranges of far snowy peaks drifting with the camera; past the map's edges a
  skirt of rock carries on (rising behind, falling into cloud in front), and a sea of cloud drifts below the foot.
- Leaf drift low down, snow from the band below the snow line ("THE SNOW LINE" on entering it). Zoom 0.92.

## Test
```bash
node tools/tests/mountain.js [shots|noshots] [auto|noauto] [seeds]
```
It checks: in the rotation (and the Summit never drawn alone), 72 x 104 with a smooth field and hops, per seed: the
summit reachable and the way back down, chests reachable, 40+ hop steps, the trail all walks and hops (6+ hops), 8+
ways up, no 64 trail tiles without a fight (the camps' breathers are meant), three camps, the gateway arch; in play: a hop climbs and rises in an arc, a cliff doesn't climb, A* and
the flow field follow the rules, picking lands on the tile; shots; auto-play climbs, wins and arrives in the Summit.
