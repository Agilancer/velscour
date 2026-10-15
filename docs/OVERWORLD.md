# Forsaken Wilds — the outdoor scenario dungeon

The **Forsaken Wilds** is a procedurally selected dungeon biome, built using the supplied
**Overworld and Town** ground / building / vegetation pack. It is intentionally **not**
Duskhollow: there are enemies, a town-return portal, a separate dungeon exit, and a
shrine-triggered combat/objective encounter. Clearing that encounter replaces the
normal single-guardian condition for opening the exit.

## Code and data

| Responsibility | Location |
|---|---|
| Biome definition, shuffle bag, forced scheduling, visit records | `src/data/biomes.js` |
| Map generator (72×72, trees, roads, village, ground) | `src/world/overworld.js` |
| 20 shrine-activated mini scenarios | `src/game/overworld.js` |
| 10 extra tree sprites, 20 scatter sprites, 5 shrines, caravan | `src/gfx/overworldart.js` |
| Dungeon entry, reward/exit, autosaving | `src/game/game.js` |
| Forest line of sight | `src/world/map.js` |
| Sprite depth sorting/culling and shrine markers | `src/game/render.js` |
| Auto-play scenario/navigation | `src/game/autoplay.js` |
| Quest-log progress | `src/ui/quest.js` |
| Save migration | `src/game/save.js` |
| Browser QA + screenshots | `tools/tests/overworld.js` |

### Terrain / art

The biome uses `assets/tiles/town/ground.webp`, `objects.webp` and `town.json`
from the existing Town pack imported by `tools/townpack.py`. The map's
`townTiles` flag selects outdoor floors in the existing `renderWorld` path.
No competing indoor `pack.json` or dungeon wall atlas is needed; the game uses
the already-loaded catacombs tileset for fallback shared chest and portal art.

The new art is **generated as Canvas sprite images at runtime** and cached by name.
Ten trees are derived from distinct source silhouettes with unique colors,
leaf overlays and texture accents; 20 additional scatter objects are constructed
from masonry, props, floral and camp-object pixels. Five shrine designs are
drawn as stone pedestals with colored crystals, and the caravan encounter has a
covered wagon. They fit the renderer's existing per-sprite `{img,sx,sy,w,h,ox,oy}`
rect and pivot convention. These are **procedural/derived sprites**, not a new
set of hand-painted PNGs or a replacement for the user's original town pack.
To swap in manually painted artwork, change `overworldObject` to return the
corresponding sprite crop; level-generation placement does not need changing.

The world is 72×72 tiles. All tiles have outdoor floor art. Dense forest zones
set `map.block` (collision) and have overlapping canopies, making them behave as
living walls; `map.losBlocks` additionally prevents attacks through the forest.
The forest is densest around the rim and groves, with a linked trail network.
Nine scenario landmarks, both portals and the central shrine are kept clear, with
reachability verified via a flood fill. Three simple buildings form a neutral
settlement in an open clearing. Roughly 260 small decorative objects scatter
through the open terrain, in addition to forest wall trees.

## 20 scenarios

Each level chooses one at random through `scenarioId`; the shrine starts it,
not entering the map. Enemies, skill rewards, XP, drops and combat all continue
to use the regular game systems.

| # | Scenario | Win condition / mechanic |
|---|---|---|
| 1 | Siege of the Forgotten | Four escalating enemy waves |
| 2 | The Three Tyrants | Three simultaneous dungeon bosses |
| 3 | Night of the Walking Dead | Protect settlement NPCs through three zombie waves |
| 4 | The Lost Caravan | Escort a mobile, vulnerable survivor and wagon through four waypoints |
| 5 | The Three Watchposts | Stand within and secure three control zones without nearby enemies |
| 6 | Tears in the Veil | Interact with four rifts and destroy the resulting monsters |
| 7 | The Warband Commanders | Defeat four champion leaders |
| 8 | Last Light | Defend a shrine's hit points through three waves |
| 9 | Bandit Encampments | Eliminate the four camp leaders |
| 10 | Prisoners of the Wild | Free four visible prisoners under guard |
| 11 | Relics of Old Duskhollow | Recover five guarded relics |
| 12 | The Black Conclave | Slay three elite necromancers and their guards |
| 13 | Hold the Crossing | Protect a vulnerable crossing watchman across four waves |
| 14 | The Killing Fields | Repel five larger battlefield waves |
| 15 | The Rotting Hamlet | Rescue villagers during four zombie waves |
| 16 | The Alpha Hunt | Hunt three large beast bosses |
| 17 | Break Their Siege | Destroy three siege markers and defeat their guards |
| 18 | The Corrupted Totems | Cleanse four blighted markers and defeat their defenders |
| 19 | Trial of the Hourglass | Kill twenty enemies before the 110-second timer |
| 20 | Fate of the Wilds | A seeded surprise variation: wave, boss, rift, or control-circle trial |

The exit activates only after the active scenario completes. First-time clears
still grant a bonus skill point and update deepest depth, save/quest progress and
exit presentation. Failed defensive or timed challenges remain retryable by
activating the same shrine again. Returning to town reconstructs the level
as before, and scenarios are not serialized mid-fight (consistent with normal
dungeon world resets).

### Biome guarantee and old saves

`c.overworldMisses` counts dungeon **entries**, not calls to `drawBiome`.
After six consecutive entries into non-overworld dungeon packs, the next
`drawBiome` returns `overworld`. It can also be picked naturally from the
regular shuffle bag. Visiting it resets the miss count to zero. Reentering the
same depth and biome after a town trip is protected from double counting by
`c.overworldLastVisit`. Those fields migrate safely for old saves. Depth 500
always remains Velscour's throne; the guarantee does not override it.

### Testing / QA

Run the game from an HTTP server (the root has no build step):

```bash
python3 -m http.server 8123
node tools/tests/data_check.mjs
node tools/tests/overworld.js
node tools/tests/flow.js
node tools/tests/town.js
```

The new browser test checks 60 random seeds for map connectivity and open area,
validates the six-dungeon guarantee over 50 runs, steps all 20 scenarios through
their objective-completion logic, and captures:
`tools/tests/out/overworld_shrine_and_forest.png` and
`tools/tests/out/overworld_active_scenario.png`.

For manual review, test on mobile landscape as well: tree-wall occlusion, large
wave combat, all five shrine colors, clickable objectives, escort pathing, and
the frame rate in densely wooded regions. This branch has source/synthetic
checks, but was not verified with a full game-browser run in the development
environment; perform the browser QA before merging.
