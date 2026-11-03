# The Snowy Summit

Where the Mountainside's summit leads. Win the Mountainside (beat its Summit Warden) and the party is carried straight
on, at the same depth, into a mountain range: thin ridgelines two or three tiles wide, their flanks falling away
steeply into a sea of cloud, four plateaus where groups of monsters fight, and the peak, an old shrine under the true
summit's spire, where one of five snow-swapped bosses waits. Its fall opens the exit on the peak (+1 skill point the
first time). A trip to town from the Summit comes back to the Summit (`c.nextBiome`).

It is a region (`src/game/regions/summit.js`, `docs/NEW_REGIONS.md`): `snowy_summit` in `BETA_BIOMES`
(`follows: 'mountainside'`), never drawn on its own. Velscour's skull reaches it directly: send `summit`, `snow`,
`peak` or `ridge`, or pick it on the HAIL VELSCOUR! list.

| File | What |
|---|---|
| `src/world/summit.js` | `generateSummit`: the route (camp, four plateaus, peak), ridges as curves with their height profiles and hop steps, the range's rock, gates, arches, the shrine wall, floors, props, ridge packs, climb-ups; `SUMMIT_BOSSES` |
| `src/game/summit.js` | the run: plateau encounters (`SUMMIT_ENCOUNTERS`), gates, climb-ups, the peak boss, `objective`, the Quest Log |
| `src/world/alpine.js` | shared with the Mountainside: tile heights to the vertex field (ledges, slopes, rounded outlines, the cap) |
| `src/gfx/alpine3d.js` | shared: the three.js scene (per-tile floor atlas, triplanar rock, snow, the skirt, the sea of cloud, the sky) |
| `src/game/alpine.js` | shared: `world.cave` (elevation, picking, horizon), hop arcs, `useAlpine` |
| `assets/tiles/snowy_summit/` | the pack's runtime atlases (`floors`, `walls`, `scatter`, `pack.json`) and its five wall `materials/` |
| `assets/source/biomes/Snowy_Summit_Biome_Pack.zip` | the user's four uploads merged into one pack folder (sources, sprites, runtime, docs, QA) |
| `tools/tests/summit.js` | seeds, every plateau won by a bot, each of the five bosses, auto-play, shots |

## The art
The user's Snowy Summit pack (four zips: runtime and docs, floor sources, wall and prop sources, sprites), built to the
biome template, so its runtime folder is a normal biome pack (`loadBiomeArt` with `pack: 'snowy_summit'`,
`packArt: true`). Used here:
- **floors**: all 60, chosen per tile (wind-packed snow, bootprints and compact snow on the ridges, slate flags on the hop
  steps, shrine paving round the peak, sled grooves at the camp, scree and glacier ice on the rock below);
- **scatter**: boulders, ice spires and crystals on the plateaus' rims, trail markers and cairns along the ridges, pitons
  at the hop steps, the expedition's camp, the shrine's altar, owl idol, basin, braziers, sentinels, bell and candles;
- **doors**: the `frozen_iron_gate` across each plateau's way on (locked until its fight is won: `door.locked`);
- **arches**: `slate_pass_gateway` out of the camp, `summit_shrine_portal` onto the peak;
- **walls**: a run of `summit_shrine_ashlar` along the peak's far rim (the ground behind barred);
- **materials**: `snow_capped_granite` and `ice_bound_shale` are the cliffs (their snow caps taken back to the stone's
  tone in `rockFace`, so a cliff reads as strata, not masonry; the shader lays its own snow on the ledges).
The lit props (`LIT` in `src/world/dungeon.js`) and walk-over props (`WALK_OVER` in `tools/biomepack.py`) from the
pack's `integration.json` are registered.

## The range (`generateSummit`)
112 x 112 tiles. The route runs from the near corner (the bottom of the screen) to the far one (the top): camp, then four
plateaus alternating left and right, then the peak, each 4.2-5.4 tiles of height above the last. Between them a ridge:
a Catmull-Rom curve through one or two offset midpoints, 2.1-2.8 tiles wide, its height a profile along it (the rise
spread out, a gentle undulation, and one to three **hop steps** of 5-6 levels where it climbs a rock step). A relaxation
then keeps every pair of walkable neighbours within a walk (3 levels) unless a hop step lies between them.

Off the way, the rock falls in crags: the vertex height is a profile of its distance to the way (steep at the rim),
easing a few tiles out into the tiles' own shape: the range falling into the valleys (glacier ice and the cloud below),
other peaks of the range standing behind the way, and the true summit's spire behind the peak. The cap (no rock may
rise over the line of sight to walkable ground behind it) keeps every peak off the near side.

Gates: on each plateau's way on, the first grid line where 2-4 ridge tiles cross it and blocking them really cuts the
plateau off from the next node. The tiles are blocked (`map.block`) until the fight is won.

## The run (`createSummitRun`)
- **The ridges**: one or two monsters at a time hold them (every 8-12 tiles), now and then a lone champion; once
  along each ridge after the first, two or three claw up over the rim out of the cloud as the hero passes.
- **The plateaus**: each a fight, the five kinds shuffled: **Buried in the Snow** (two waves out of the snow),
  **The Frozen Camp** (raiders round their fire and a unique chief), **Avalanche** (15 s of telegraphed snowfalls,
  10% of life where they land, while things ride the slide down; then kill them), **The Howling Cairns** (three ice
  cairns raise things out of the snow every 4 s until broken), **The Pack of the Heights** (a unique and its hounds).
  Winning one leaves a chest and grinds its gate open.
- **The peak**: entering it brings one of `SUMMIT_BOSSES` down from the sky (`enter(m, 'drop')`): a raid boss on a plain
  template (no signature casts) at 72% life, no execute timer, scale 2.5, in its snow swap:

| Art | Template | Title | Swap |
|---|---|---|---|
| Glacier Crown Titan | `rimehydra` | the Crown of the Glacier | ice blue |
| Blizzard Woolback | `mammoth` | Bull of the White Storm | pale |
| Frostmane Werebear | `moon` | the Howl on the Peak | frost |
| Bonewhite Crypt Dragon | `obsidrake` (made cold, shards) | the White Wyrm of the Range | glacial teal |
| Rime Antler Lich | `lich` | the Antlered Frost | rime |

  The boss is picked by the seed (`G.summitBoss` forces one for tests). Its fall opens the exit on the peak with two
  rich chests.
- Every regular monster wears a snow swap (frost, rime or pale) and is "Frostbitten". Snow falls (`ambient: snow`).
  The camera pulls back a little on the plateaus.
- **Auto-play** follows `objective`: the next waypoint of the route (it can't get past a shut gate), inside a fight its
  cairns, then its nearest foe, then the boss.

## Test
```bash
node tools/tests/summit.js [shots|noshots] [auto|noauto] [seeds] [mobile]
```
