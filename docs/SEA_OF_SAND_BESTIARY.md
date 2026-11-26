# The Sea of Sand bestiary (the Thanksgiving update)

There are 200 Grim Nocturne sprites from `VELSCOUR_Sea_of_Sand_200_Sprites.zip`. They are desert monsters, and they
only live in the deserts.

| tier | count | sheets | world height (`h`) | role |
|---|---|---|---|---|
| small | 50 | 01-05: Dune Hollows, Salt Flats, Oasis Fringe, Caravan Tracks, Pyramid Antechamber | 30-40 | pack creatures (slightly frailer and faster) |
| large | 70 | 06-12: Basalt Ravines, Shifting Dunes, Salt and Glass, Dry River and Oasis, Caravan Grave Roads, Pyramid Vaults, Buried Astronomy Halls | 54-68 | pack monsters (x1.15 life) |
| mythic | 30 | 13-15: Dune Below, Sunken Monuments, Mirage and Salt Storms | 82-100 | rare: x2.6 life, x1.35 damage, x3 xp, a gold aura |
| boss | 50 | 16-20: Pyramid Keepers, Deep Deserts, Oasis and Cisterns, Cliff and Caravan Roads, Astral Desert and Glass | 87-99 | guardians, BOSS ROOMs, pyramid bosses (`lone`) |

The heights are the roster's `suggested_world_height_px`. The large tier is scaled by 0.85, mythic by 0.75 and boss
by 0.62, so they sit beside the rest of the bestiary (the hero is 60). A boss in a BOSS ROOM is drawn 2.4x bigger.

## Pipeline
1. `python tools/sandkin.py <zip> [--heat heat.png]` cuts the 20 sheets by heat map. The sheet's alpha is blurred
   (sigma 4) and every warm blob is a piece of art. Each blob goes to the roster cell its alpha mass sits in, and
   specks are dropped. The zip's own single PNGs are not used. Every cut is checked against the roster's `art_rect`;
   the largest difference is 3 px. The output is `assets/source/enemies/sand/NN_<sheet>/NN_<slug>.png`, plus
   `roster.json`.
2. `python tools/process_assets.py enemies sand` packs one atlas per sheet (`assets/sprites/enemies/sand_NN_*.webp`).
   A level loads only the atlases it uses.
3. `src/data/sandkin.js` (`SAND_KIN`) is the catalogue. Each row is a name, an AI archetype, `also` archetypes and
   extras (element, gore, undead). The id is `sk_<slug>`. Each entry also records its tier, its `zone` (the roster's
   location) and its `dunes` (the roster's suggested dune variants).

## Where they appear
The deserts are `DESERT_BIOMES`: `sea_of_sand`, `desert`, `gilded`, `serpent`, `amber`, `desert_temple`, and the
Sheer Drops built on them (`isDesert`). Elsewhere `artPool` and `bossPool` leave them out.
- **Desert dungeons** (`rollLooks` in `data/bestiary.js`): a look's first pick is theirs 75% of the time, and later
  picks 37% (`SAND_SHARE`). That is about half of all looks. One look in 25 is a mythic (`SAND_MYTHIC`). Guardians
  are a desert boss 65% of the time and a mythic 15% (about 80% in all). Their looks keep their own colours 55% of the
  time, and otherwise wear a desert swap (sand, gilded, bronze, rust, bone, ember, pale, obsidian).
- **Desert BOSS ROOMs** (`makeRaidBoss`): 60% are a desert boss wearing the raid template.
- **The Sea of Sand cliff maze**: about half of the 60 native archetypes trade their look, once per level
  (`sandNativeLook` in `game/monster.js`), for a sand creature that fits the native's base archetype (`sandBase` in
  `data/enemies.js`). The native's own stats and AI stay. The native bosses do the same with the desert bosses.
- **The pyramid dunes** (`duneLooks` in `world/dunes.js`): each variant takes the sprites the roster suggests for it.
  Two of every archetype's three looks are theirs, and 4% are a mythic. Each of the pyramid's two bosses becomes one
  of the variant's desert bosses half the time, and keeps its title and raid template. The roster suggests no bosses
  for the White Gypsum Sea, which borrows the Salt Flats', and only mythics for the Storm Sands, which borrow the
  Moonlit and Obsidian sprites (`DUNE_ALSO`).

## Testing
`node tools/tests/sandkin.js [noshots]` checks four things:
- all 200 sprites load
- line-up shots of each tier (`sand_lineup_*.png`)
- all 200 fight a hero in batches of ten, and must take and land blows
- the shares above: desert looks, guardians and BOSS ROOMs, natives, every dune variant's looks and bosses, and
  none outside the deserts

## Open
- They play the shared archetype AIs. Unlike the Castle Creatures, they have no mechanics of their own.
- Mythic and boss balance has only been checked by the tests so far.
