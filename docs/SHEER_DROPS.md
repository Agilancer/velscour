# SHEER DROPS

Ten dungeon biomes generated exactly like the others (`src/world/dungeon.js`: same rooms, corridors, shaped rooms and
set pieces), but **with no walls**: where a dungeon has a wall, the floor ends at a brink and falls away forever.
Five have a black nothingness below and five a pale fog sea that swallows the cliffs' feet.

Test: `node tools/tests/sheer.js` (shots of all ten, the brink rules, then an auto-play soak in Sheer Drops only).

## The ten variants (`src/data/sheer.js`)

| id | name | borrows (base) | Act | cliff texture | below |
|---|---|---|---|---|---|
| `sheer_ossuary` | The Hanging Ossuary | catacombs | 1 | ossuary | dark, bone dust |
| `sheer_drowned` | The Drowned Precipice | sunken | 1 | drowned | fog, sea spray |
| `sheer_canyon` | The Red Canyon Tombs | desert | 2 | canyon | fog, red dust |
| `sheer_gilded` | The Gilded Abyss | gilded | 2 | gilded | dark, gold glow welling up, gold motes |
| `sheer_rime` | Rimefall Chasm | frozen | 3 | rime | fog, snow |
| `sheer_crystal` | The Shardfall Rift | crystal | 3 | shard | dark, cyan glow, glints |
| `sheer_cloister` | Cloudbreak Cloister | cathedral | 4 | cloister | fog, a cloud sea |
| `sheer_storm` | The Stormbreak Bastion | shattered | 4 | storm | fog, storm clouds, lightning |
| `sheer_cinder` | The Cinder Spires | molten | 5 | cinder | dark, a lava glow far below, embers |
| `sheer_starless` | The Starless Rift | void | 5 | starless | dark, stars |

- `src/data/biomes.js` copies each variant's **base** biome (floors, props, scatter, monsters' rooms, footsteps,
  lighting), sets `sheer` (the variant's entry), its own name, light, darkness and fog, and splices it into `BIOMES`
  right after its base. Two variants are added to each Act's `ACT_BIOMES`, so they turn up in the normal biome bag.
  They have no `FAMILY`, so a Sheer Drop never mixes with another biome's tiles.
- `src/core/audio.js` `AMB`: each variant's own ambient beds (`amb`).

### Cliff textures (`tools/sheerpack.py`)
Each cliff face is one **seamless rock texture from the bm repo** (`SOURCES` in the script: Phobos ossuary, undercroft,
granite and bone stone, the desert architecture walls, the Phobos 2 curtain granite and basalt columns).
- `python tools/sheerpack.py --import <bm checkout>` copies them from bm's `origin/main` into `assets/source/sheer/`
  (512 px WebP).
- `python tools/sheerpack.py` recolours each one to its biome (`TINT`: colorize, light, contrast, saturation) and
  writes `assets/tiles/sheer/<tex>.webp` (256 px, ~22 KB each). Resizing a whole seamless tile keeps it seamless.
  Needs Pillow and numpy.

## Layout (`src/world/dungeon.js`)
- `map.sheer = biome.sheer` right after the TileMap is made; `finishMap` skips `buildWalls`, so there are no wall
  segments, arches, doors, torches or wall hangings (`loadBiomeArt` does not load them either).
- `brinkLamps()` replaces the wall torches. It puts the biome's lit scatter props on brink tiles, a few per room
  (more on the dark variants), at least 3.5 tiles apart, and prefers lamps that can be walked over. A lamp that
  blocks only goes where the floor round it stays walkable.
- Raid arenas: their pillars become 2x2 pits.

## Drawing (`src/gfx/sheer.js`, `src/game/render.js`)
- **The abyss** (`drawAbyss`) replaces the black clear behind the world. It is a gradient sky, then tiled layers that
  scroll with the camera at different rates (parallax). On the dark variants these are a glow from below and far and
  near motes. On the fog variants they are two drifting fog layers. The storm variant adds lightning flashes, which
  respect the Reduce flashing setting.
- **Cliff faces** hang under every brink that faces the camera (a floor tile whose south-west or south-east
  neighbour is void). A face is a slice of a strip baked once per variant (`stripsFor`): the texture runs `FACE_H`
  (230) world px down, with a lit lip, the overhang's shadow, cracks and the variant's glow. It darkens toward `deep`
  (dark variants) or is swallowed by fog banks (fog variants), and fades out at the bottom. The slice is sheared along
  the edge and starts at the edge's screen x modulo the texture, so a run of faces reads as one wall of rock.
  South-west faces are lit and south-east faces are in shade.
- `drawSheerTiles` is what the floor chunks bake (`drawFloorTiles` → `drawSheerFloor`). It draws every face far to
  near by diagonal, then the floor diamonds over them, then the rims: a dark line on the back edges and a rim-coloured
  lip on the front ones. Near islands therefore hide the cliffs of far ones. Chunks are widened by `FACE_H` so a
  chunk's cliffs are not cut off.
- **Plunges** (`drawPlunge`, depth-sorted kind 15). A body that goes over the edge drops and fades for `FALL_T`
  (1.2 s). The floor in front of it is redrawn over it, so it falls *behind* the brink it went over.

## The rules at the brink (`src/game/sheer.js`, `src/world/map.js`, `src/game/creature.js`)
- **Nothing walks off.** `circleFree` treats void like a wall, so a walking body never steps over the edge. The hero,
  monsters, pets, pathing and the flow field are unchanged.
- **A knock or a pull can carry a body over** (`map.shove`; `creature.js` knockback). A body reeling from a knock on a
  Sheer Drop cannot walk out of it (`map.move` refuses while `shoveT` is set and the knock is still strong). The
  hero's minions are never carried over.
- **Flyers and leaps cross gaps** (`aloft(e)` in map.js: `leaping`, or `voidFly` and not frozen or stunned).
  `map.move` sends them to `flyMove`, which only checks the map's bounds and props. `los` and shots ignore the void
  (`map.solid`), so arrows and spells fly over gaps. `rayLength(..., ground=true)` is the ground-only version that
  auto-play uses.
  - `voidFly` is set on enemy flyers that are not summons. They path straight at their goal over gaps
    (`Monster.navTo`).
  - **They never stop over a gap.** A flyer that hangs still over the void for 0.3 s flutters back to the nearest
    floor (`hover`).
  - Monster lunges use `map.leapOk`: the landing must be floor that the body fits on. A lunge that comes up short is
    set down on its target spot. Hero leaps (`hazards.js` Leap) move their target to the nearest floor.
- **What comes to rest over the void falls** (`sheerUpdate`, after `separate()` each frame). Anything whose centre is
  over the void and is not in the air falls, for example a body knocked off, or a flyer frozen or stunned over a gap.
  - **A monster** dies at once: the kill is the hero's (xp, quests), its loot lands on the brink it went over, and it
    leaves no corpse or gore.
  - **The hero** dies at once with no phoenix or second chance, killed by "the Abyss" (death screen, nemesis), but
    *only* when a knock or pull took him over (`shoveT`). A blink, a skill or a dash that sets him down with his centre
    over the edge puts him back on the floor.
  - **Bosses, raid bosses, Velscour and the hero's minions** never fall; they are set back on the floor (`keeps`).
- **Auto-play never lets the hero fall.** `goesOver(hero)` is false while auto-play is on, so a knock toward the brink
  stops at the edge (counted as `braced`). Auto-play's dodge rays and hop lines see the void as a wall
  (`rayLength(..., true)`, `hopLine`).
- Counters: `world.sheerStats` and `G.sheerTally` record `fell` (monsters), `hero`, `braced`, `saved` and `hover`.

## Not covered
- The first-person view (`gfx/firstperson.js`) has not been adapted or checked on a Sheer Drop. It knows nothing of
  the cliffs or the abyss.
- The minimap shows floor only, as it already did; there is no drop shading.
- Other browsers than Chromium are untested, as everywhere in the game.
