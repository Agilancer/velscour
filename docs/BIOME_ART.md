# Dungeon biome art (October 17, 2026 clean-up)

Every indoor biome is built from the three **painted biome packs** only:

| Pack | Floors | Walls | Props |
|---|---|---|---|
| `catacombs` | crypt flagstone, cobbles, basalt, crypt features | crypt ashlar, ossuary niches, funerary chapel, sealed cells, drowned crypt | crypt furniture |
| `cathedral_graveyard` | nave marble/slate (1–5, 11–30), grave soil/moss/gravel (6–10, 31–60) | nave ashlar, stained-glass chapel, buttressed masonry, cemetery limestone/iron | graveyard (1–20, 36–40), cathedral (21–35) |
| `castle_keep` | limestone, slate, guardstone, brick, marble and royal features | royal ashlar, great-hall paneling, armory ironstone, chapel carving, underkeep brick | keep furniture, armory, siege |

`ART` in `src/data/biomes.js` gives each biome:

- `pack`: where its floors and props come from;
- `wallPack` (optional): where its walls, arches and doors come from, so a biome can pave with one pack and build with another
  (Ice Temple: Castle Keep halls under Cathedral stained-glass walls; Molten Depths and HELL: Catacombs floors in
  Castle Keep brick and ironstone; Fungal Grotto, Ashen Wastes and Amber Wastes: graveyard soil inside Catacombs walls);
- `part`: the themed subset (1-based floor and prop ranges, wall families, arch and door designs);
- `morePacks` (optional): extra props from another pack;
- `palette` (and `wallPalette`): the `recolor()` swap.

`biomeTileSet()` in `src/core/assets.js` builds the set from those packs, cuts every floor cell to its diamond (Castle
Keep feature tiles carry a dark slab edge below the diamond) and appends the approved painted art for the five temple
biomes.

## The five temple biomes

Desert Temple, Ice Temple, HELL, ASTRAL PLANE and HEAVENLY keep the user-approved painted sheets in
`assets/tiles/approved_biomes/` (`floors.webp`, `props.webp`, one row each). `approvedBiomeArt()` in
`src/gfx/approvedbiomeart.js` turns a row into eight extra feature floors (composed over the biome's own base paving,
so a transparent corner never shows) and eight 160×160 props (2× nearest, stray slivers of neighbouring cells removed,
ground pivot from the lowest opaque row). The painted floors are listed several times in `features`, so about half of
the feature tiles are painted ones. These biomes are flagged `painted` and never mix floors with a partner biome.

## Removed

- The Canvas-drawn temple packs (`gfx/deserttemple.js`, `icetemple.js`, `hellpack.js`, `astralplane.js`,
  `heavenlypack.js`) and their pack tests. They were flat vector placeholders next to the painted art.
- `expandBiomePack()` (`gfx/biomeexpansion.js`): it replaced every biome's paving with geometric diamond-motif tiles,
  added 40 crude procedural props and etched shapes on the walls. The town and Forsaken Wilds floor helpers stay.
- `applyAIBiomeArt()` (`gfx/aibiomeart.js`): it pasted 64 px AI atlas cells over floors (the dark noisy squares),
  replaced every prop with mis-sliced cells and patchworked ten unrelated wall materials. Only the Heavenly monster
  atlas from that file is still used. The atlases in `assets/tiles/ai_biomes/` are no longer loaded.

## Torches and wall hangings

`wallMounts()` in `src/world/dungeon.js` places both, for the maze, the Castle Keep layouts and the throne: only on
the room side of back walls (a front wall shows its outer face to the camera), only in the middle of a straight run
of at least three edges (never at a corner), at least two tiles from an arch or door, with torches 3 tiles and
hangings 2.5 tiles from any other mount.

## Checking it

`node tools/tests/biome_survey.js [ids] [depth] [prefix]` builds each dungeon biome without monsters and screenshots
the start room, a torch wall, a hanging, the exit and a prop. Also run `data_check.mjs` (validates every `part`
against its packs), `worldwide_biomes.js`, `approved_biome_art.js`, `heavenly.js`, `pack.js` and `walls.js`.
