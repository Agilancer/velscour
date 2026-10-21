# THE ETERNAL BREACH (challenge biome)

A broken world floating in a violet void, behind a **purple portal** in Herrington Hollow. It has its own monsters and
bosses (none from the standard biomes), its own floors and its own rewards; it never enters a biome bag, the overworld
guarantee or Velscour's teleport list, and dying there costs no Defiance and leaves the descent (`c.depth`) alone.

Tests: `node tools/tests/breach_gen.mjs [seeds] [floor]` (no browser) and
`node tools/tests/breach.js [town,play,arrive,shots,auto,rules] [floor]`.

## Getting in
- **The purple portal** (`world/town.js`): a second portal yard across the plaza from the dungeon portal, on its own
  road. It is rolled from a second generator (`seed ^ 0x6b7ea5`), so every town keeps its roads and plaza; a building
  may shift aside. `game.confirmBreach` opens the floor dialog: any floor from 1 to one past the best beaten
  (`c.breach.best + 1`), each labelled with its depth and monster level, with a warning when the monsters are more
  than 4 levels above the hero.
- **Auto-play**: turning it on in town asks *Standard Adventure Portal* or *THE ETERNAL BREACH* (cards or buttons; with
  no choice in 8 s it keeps its last pick, `DEST_WAIT`). `Auto.dest` then decides which portal it walks to after
  shopping. In the Breach it takes the highest open floor whose monsters are at most 2 levels above the hero
  (`breachFloor`/`breachReady`), goes on to the next floor from the exit when ready, else home; a death in the Breach
  puts it back on the standard portal until it is turned off and on again in town. Tests set `G.autoDest`.

## Difficulty and rewards (`data/breach.js`)
- Floor *n* is exactly as deadly as standard depth *10n*: `world.depth = breachDepth(n) = 10n`, monsters at
  `depthLevel(10n)` (so floor 7 is level 64, floor 20 level 124...).
- The floor's final boss (the keeper of the Breach Heart) drops, at item level `breachLevel + 2` (`breachReward`):
  - floors 1-3: a **Rare**, every time;
  - floors 4-10: an **Epic** the first time; after that a **Rare**, with a 2% chance of a **Legendary**;
  - floor 11 on: an **Epic** the first time, with a 12% chance of a **Legendary** and 3% of a **Mythic** instead;
    after that a **Rare**, with a 6% / 1.5% / 0.3% chance of an Epic / Legendary / Mythic.
  The odds are `BREACH_ODDS`. Item rarity still obeys item level (`rarityAt`): a Legendary rolled on floor 4 (item level
  42, below Legendary's 45) comes out Epic. Plus some gold. Every shrine won leaves a rare reliquary chest.
- `c.breach = { best, cleared: {floor: times}, deaths, floor }` on the save (`migrate` adds it).

## The floor (`world/breach.js`)
- **16 islands**: 3 large (r 10-12.5 tiles), 5 medium (6.5-8), 8 small (3.6-5), each a wobbly blob, thrown into a
  118-tile square (each new one within 9 tiles of another) and cropped (maps come out ~118 x 118).
- **Walkways**: a spanning tree over the islands (shortest gaps first) plus 4-6 loops, so there is more than one way
  round. Each is a 2-tile path with a slight bend, climbing at most ~2.2 levels a tile; one that would cross another
  island or walkway is dropped (a tree one retries the seed).
- **Rounded walkway edges** (`map.rounded`, `drawRounded` in gfx/terrain.js): on walkway tiles every corner sticking
  out into the void is cut by a curve and every notch between two tiles filled by one (drawn by the later tile beside
  it, at its height and in its paving), with the rock faces following the curves, so diagonal walkways run smooth
  instead of in diamond steps. Drawing only; collision is the tiles'. Walkway tiles are never redrawn over creatures
  (their steps are a level or two), which kept the frame cost where it was.
- **Height map** (`map.hgt`, the Mountainside's system, `CLIMB` 4 / `DROP` 10): each island has its own altitude
  (walked out along the tree from the start, 0-52 levels), gentle noise, a hop-high plateau on the medium and large
  ones (a second tier on the large), and 2-4 tall rock crags on the large ones (taken back if they cut the island).
- **Undersides** (`map.under`): every column over the void has its own foot. Each island hangs as a rough cone down to
  a point under its middle (depth ~ 6 x radius + noise, in screen px x2.2); a rim column's face reaches down to the
  cone's silhouette at its screen column. `terrain.js` draws these faces with `breachUnderside` (gfx/breach.js): violet
  basalt (the rock pattern's `breach` style), darkening into haze, stalactites, hanging roots, rift crystal and seams
  below the foot (`UNDERSIDE_HANG` px are added to such columns' screen boxes).
- **The void**: `drawNebula` (gfx/breach.js) replaces the Mountainside's sky: a tiling nebula at an eighth of the
  resolution blown up, stars, a brighter drifting veil, far floating rocks and now and then a rift lightning crack, all
  with parallax. The biome's fog is `#0e0518` (dark 0.3), ambient `mote` particles, violet lights.
- **The start** is a small island, the **Breach Heart** the large island farthest from it in walkway hops that is not
  the only way to any other island.
- **Shrines** on every medium and large island (a pad of the Eternal Breach's mosaics, a rift-warding basin, braziers);
  the Heart has the open rift sarcophagus and two obelisks.
- **Ruins** ("buildings/dungeons"): two or three shrine islands (never the start or the Heart) get a roofless chapel
  round the shrine, walls from either pack's ten wall families (the Eternal Breach's five and the Veilscar March's five),
  2-3 doorways (arches or doors from either pack's six designs), buttress walls in the big ones, crypt furniture along
  the walls and a chest.
- **Wards**: a walkway leading on from a shrine island (from the island nearer the start in walkway hops to the farther
  one) carries a ward: blocked tiles (`map.block`) cutting straight across it just past the last of its tiles touching
  that island (checked: a walk along the walkway can't get round it). The ward falls when that island's shrine is won.
  Wards belong to the nearer island, so the floor can always be finished (breach_gen.mjs walks it on the tiles).
- **Monsters already there**: 1-3 packs per island (not the start), archetypes weighted against bulky ones
  (`breachArch`), pack sizes from the archetype's own range (`breachPack`), some champions.
- Island tops: the Veilscar March's 60 floors (two seamless grounds per island, patches of its feature tiles, slate on
  the plateaus and crags); walkways the processional paths and causeways; ruins and pads the Eternal Breach's floors.
  Scatter: the Veilscar March's stones, stumps, quartz and grave posts on the islands, the Eternal Breach's coffins,
  urns, candles and braziers in the ruins and at the shrines, waystones at the walkway landings.

## The run (`game/breach.js`)
- Medium islands get a scenario, large ones a boss fight (`SCENARIOS`, each floor deals them from a shuffled deck: no
  repeats on a floor). The Heart answers only when every other shrine is won.
- While a shrine's fight is on, every walkway off its island is **locked** against the hero (a soft ward: stepping onto
  one of them puts him back; monsters still come over them).
- Stragglers: when nothing in a fight has fallen for 30 s, the last few (four or fewer) far from the hero or out of
  his reach sink back into the void.
- Between fights, every 40-70 s a few monsters arrive near the hero by a random arrival.
- **Arrivals** (`ARRIVALS`, `bringOne`): the user's four, *rise* (out of the ground), *climb* (hauled up over the
  island's edge from the void), *sky* (swooping in from the void), *ride* (a great flier of the Breach, drawn at 150 px,
  carries the squad under it, drops them one by one and flies on), and eight more: *rift* (a violet tear opens upright
  and they step out), *meteor* (they ride a falling breachstone and climb out of the crater; it hurts), *march* (in over
  the walkways), *shard* (a broken-off rock shard drifts in out of the void, docks, and they leap across), *chain*
  (lowered on violet chains from far above), *coalesce* (motes stream in and take shape), *coffin* (a coffin appears,
  rattles, bursts, they climb out), *doorway* (one of the packs' doors stands up out of nothing, opens, and they walk
  through). Landing spots must be reachable by the hero (the flow field), so nothing lands on a crag top.
- **Scenarios** (medium islands): Breach Surge (four waves, four arrivals), Anchor the Island (stand by three anchor
  stones while climbers come), The Ferryman's Flock (four carrier drops, then the Ferryman lands), The Coffin Choir
  (seal six coffins, 2 s each, before they burst; each seal calls the choir), Doorways from Nowhere (close four doors in
  the air that keep letting the brood through), Starfall (survive 40 s of breachstone; some hatch), The Hanging Host
  (four chain descents), The Gravity Well (the shrine drags the hero to it; shatter three resonators on the rim),
  Walkway Stones (gather three drifting keystones and set them in the shrine), The Rising Tide (cut four root grapples
  while the brood climbs the edges), Hold the Shrine (stand in its circle until it is fully lit), The Breach Brood
  (break four pulsing nests that hatch crawlers).
- **Boss fights** (large islands): A Sovereign's Duel (a Breach boss climbs over the edge, rises or is lowered in, and
  calls its brood at 66% and 33%), The Dread Courier (a carrier drops a Breach boss, and comes back with more).
- **The Breach Heart**: the floor's keeper (`finalBossIndex`: the six boss families in turn, each family's six from least
  to most fearsome as floors go on) rises from the sarcophagus at 1.5x a boss's life; at 66% and 33% it shields itself
  (untargetable) behind three Heart Shards while a wave arrives; break them to strike again. Its fall gives the reward
  and opens the exit portal on the Heart island: on to the next floor, or home.
- Auto-play: the run's `target` is the nearest unwon shrine the hero can walk to (through open wards), then the Heart;
  `objective` points at the fight's task, else its nearest foe, else the shrine. Between fights auto-play loots first.
  With an objective waiting and foes in its face for 10 s it pushes through to the objective for 4 s (`objPush`).
  Scenarios with standing goals (anchor, hold) post `autoGoal` hazards, which auto-play's raid-mechanic code follows.

## Art (`tools/eternalbreach.py`)
- Both uploads stay where they were put (`assets/The_Eternal_Breach_Biome_Pack/`,
  `assets/The_Eternal_Breach_Expanded_Pack/`). The expanded pack's `The_Eternal_Breach/` (revised scatter) and
  `The_Veilscar_March/` are imported by `tools/biomepack.py` (which now reads an unzipped pack folder too) into
  `assets/tiles/eternal_breach/` and `assets/tiles/veilscar_march/`. The biome (`BREACH_BIOME` in data/biomes.js) takes
  its floors and scatter from both, walls/arches/doors from the Eternal Breach; `BREACH_WALLS` adds the Veilscar
  March's walls, arches and doors (game.buildBreach merges the two tile sets).
- The 200 monsters and 30 bosses (`Creatures/`, one PNG each) are copied into `assets/source/enemies/breach/m1..m5`
  (40 each) and `bosses/`, packed by `process_assets.py enemies` like set 2 (`assets/sprites/enemies/breach_*.webp`),
  and listed in the generated `src/data/breachroster.js`: name, family, AI archetype (from keywords in the name and
  description; the breach-warped families' oddities become casters and beamers), drawn height (small 40, medium 54,
  brute 70, bosses 62-90 before the guardian scale) and flags (flier, gore). `data/breach.js` turns them into
  bestiary entries (`eb_m001`..., `eb_b001`...), flagged `breach`, which the regular draws (`artPool`, `bossPool`, the
  raid signatures' adds) skip. Each floor's bestiary (`breachLooks`) draws up to five looks per archetype from three of
  the five monster atlases, unrecoloured. The level loads all six atlases (~1.6 MB).
- Rebuild: `python tools/eternalbreach.py [packs] [creatures]` (Pillow, NumPy, SciPy).

## Open
- Not measured on a phone; the void is three screen-sized blits a frame plus one more for the far rocks.
- The five monster atlases are all loaded per floor (simple, ~1.6 MB); `breachLooks` uses three of them.
- A floor takes a geared hero about 20 game minutes with auto-play (seven shrines and the Heart).
- Ask the user: whether every shrine should be needed for the Heart (now yes), the floor length, the reward odds
  (`BREACH_ODDS`), and whether death should cost anything in the Breach.
