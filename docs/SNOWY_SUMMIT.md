# The Snowy Summit

Where the Mountainside's summit leads. Win the Mountainside (beat its Summit Warden) and the party is carried straight
on, at the same depth, into a mountain range: thin ridgelines two or three tiles wide, their flanks falling away
steeply into a sea of cloud, four plateaus where groups of monsters fight, and the peak, the top of the range, an old
shrine on a dais, where one of five snow-swapped bosses waits. Its fall opens the exit on the peak (+1 skill point the
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
128 x 128 tiles. The route runs from the near corner (the bottom of the screen) to the far one (the top): camp, then four
plateaus alternating 28-36 tiles to either side, then the peak, each 4.4-5.6 tiles of height above the last; halfway
along every leg a **saddle**, a knob of rock to stand on (a cairn, no fight), so each leg is two ridges with a bend
(about 280 tiles of way in all). A ridge is a Catmull-Rom S through two midpoints bent to either side, 2.1-2.8 tiles wide,
its height a profile along it (the rise spread out, a gentle undulation, and one to three **hop steps** of 4-6 levels
where it climbs a rock step). A relaxation then keeps every pair of walkable neighbours within a walk (3 levels) unless a
hop step lies between them. Off one ridge a **spur** runs 9-13 tiles out to a **pinnacle** with a rare chest and a
champion guarding it: a dead end, the detour's reward.

Off the way, the rock falls in crags: the vertex height is a profile of its distance to the way (a steep rock rim, then
snowfields), easing a few tiles out into the tiles' own shape: the range falling into the valleys (glacier ice and the
cloud below) and other peaks of the range standing behind the way. The peak is the top: nothing in the range or the
skirt stands within 3 tiles of its height, and behind it everything falls away at 0.65 a tile, so the sky and the far
ranges show over the shrine; its back third is a **dais** a hop up. The cap (no rock may rise over the line of sight to
walkable ground behind it) keeps every peak off the near side.

Gates: on each plateau's way on and its way in (and the peak's way in), the first grid line (searched along the near half
of the ridge) where 2-5 ridge tiles cross
it and blocking them really cuts the plateau off from the next node (or the last). The way-on gate is shut (`map.block`)
until the fight is won; the way-in gate stands open and shuts behind the hero when the fight starts (so a plateau is fought
on the plateau, not from the ridge's choke); both open on the win. Each plateau's fight is chosen here, so its camp
(brazier, bedrolls, crates, a broken fence), a lost party's sled and boots, or its three cairns' spots (120° apart) are
laid out with it. A seed missing any gate is re-rolled. The peak is 10.5 across, its shrine props on the far rim, its
middle clear for the boss.

## The run (`createSummitRun`)
- **The ridges**: one or two monsters at a time hold them (every 8-12 tiles), now and then a lone champion; once
  along each ridge after the first, two or three claw up over the rim out of the cloud as the hero passes.
- **The plateaus**: each a fight, four of the five kinds: **Buried in the Snow** (the snow heaves: telegraphs, then two
  waves out of it), **The Frozen Camp** (raiders asleep round their fire and a unique chief, seen from the ridge),
  **Avalanche** (the slope groans; 15 s of telegraphed snowfalls, 10% of life where they land, while things ride the
  slide down; then kill them), **The Howling Cairns** (three ice cairns raise things out of the snow every 5 s until
  broken; auto-play breaks them first: `raidPriority`, `run.duty`), **The Pack of the Heights** (a unique and its hounds,
  asleep). Placed groups sleep rooted and can't be hit (so they can't be woken or drawn out from the ridge) until the
  hero steps onto their plateau. Winning leaves a chest and opens the gates.
- **The peak**: coming near it (the last ridge) brings one of `SUMMIT_BOSSES` to the back of the arena (the camera pans to
  it, on the dais); it wakes when the hero comes onto the peak itself (its `raid.inside` is the peak's tiles, not the
  raid's square, whose corners reach over the last ridge), and the way in shuts behind him at once. A raid boss on a plain
  template (no signature casts) at 72% life, no execute timer (nor the HUD's countdown), scale 2.5, in its snow swap:

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
  The camera pulls back a little on the plateaus. The minimap marks the next waypoints and the gates (red shut, blue open).
- **Kept per depth** (`c.summitRuns[depth] = { seed, won }`, the region's `kept`): a town trip comes back to the same
  range, its won plateaus still won and their gates open, the hero arriving at the last of them. A skull teleport, or a
  new Mountainside below, forges a new one.
- **Auto-play** follows `objective`: the next waypoint of the route (it can't get past a shut gate), inside a fight its
  cairns, then its nearest foe, then the boss.

## The look
- Daylight over snow; the path is the brightest thing on screen: a dark band of bare rock under every walkable edge
  (`vMat.x` ~0.78: the rim), flanks of the pack's blue snow crust shaded toward a blue-grey, steep faces (snow holds below
  about 50°: `snowK` 0.58-0.84) in the granite and shale materials normalised to a darker stone (`rockL` 0.3), deep drops
  hazing into the mist above the cloud sea and its wisps.
- Floors are drawn at 128 px a tile, each mirrored or turned by a hash of its tile (but the directional ones: bootprints,
  sled grooves, slate flags, the compact path, the sun mosaic), their seams wobbled by noise. The atlas is mipped, its
  level taken from the ground's own derivatives and held inside the cells' padding (unfiltered, shrinking it shimmers).
- **The snow** (`look.winter`, in `gfx/alpine3d.js`; the Mountainside leaves it off). `windFloors` run on unbroken from
  tile to tile at twice the size, with no flips and their lines slowly wandering, so ripples read as one snowfield. What
  is snow (bright, little colour) is graded from the art's own light: blue in the hollows, warm white on the crests.
  The bump comes from `snowH`, smooth wind-carved drifts in tiles of height, never from the albedo: bumping the painted
  grain (`floorBump` 0.12 on the Summit's other floors) is an emboss filter that turns the art into a noisy knit. Snow on
  the flanks has a hard broken edge and packs into the rock's cracks instead of smearing down the cliff. Live: veils of
  spindrift blow along the ground, and now and then a grain glints.

## Test
```bash
node tools/tests/summit.js [shots|noshots] [auto|noauto] [seeds] [mobile]
```
