# Castle Keep biome

Castle Keep is part of the normal biome rotation. It has its own source pack and runtime atlases under `assets/source/biomes/Castle_Keep_Biome_Pack.zip` and `assets/tiles/castle_keep/`. Build the art with `python tools/castlekeeppack.py`, then import it with `python tools/biomepack.py castle_keep`.

## Art contract

The 60 floor frames are newly generated Castle Keep art. Each frame is 160×80 pixels and uses the same 6,400-pixel alpha diamond mask and pixel row widths as Catacombs; the importer preserves nearest-neighbor pixels. The pack includes 40 new scatter props, five new wall materials over the Catacombs-compatible component silhouettes and pivots, three compatible arch designs, and three compatible door designs. The retained silhouettes/pivots keep the existing renderer's connection masks, depth slices, and placements intact.

Castle Keep also has 16 original wall-hanging designs: four stained-glass windows, four arrow slits, four banners/tapestries, and four framed/plaque designs. Each has two separately authored player-facing isometric wall views (`f_front`, `b_front`) in `assets/tiles/castle_keep/wall_hangings.webp`.

The source sheets are in `assets/source/biome-art/castle_keep/`. The builder uses those checked-in source images and the Catacombs pack only as a geometric template. It does not read the review output directory.

## Layout configurations

Non-raid Castle Keep levels cycle through these 23 fixed room/corridor configurations in order, wrapping after the last configuration. The first three are the reviewed map suggestions; the remaining twenty add variety. Every fifth depth remains the existing raid encounter, and the final throne level keeps its existing special generation.

| # | Layout |
|---:|---|
| 1 | Gatehouse Loop |
| 2 | Great Hall Crossfire |
| 3 | Underkeep and Cells |
| 4 | Twin Gatehouses |
| 5 | Crown Hall Loop |
| 6 | Chapel of Four Bells |
| 7 | The Split Armory |
| 8 | Lion Rampart |
| 9 | Prisoner's Circuit |
| 10 | Three Court Keep |
| 11 | Broken Drawbridge |
| 12 | The Long Gallery |
| 13 | Queen's Stair |
| 14 | Murder Holes |
| 15 | Crossed Banners |
| 16 | Winter Guard |
| 17 | King's Reliquary |
| 18 | Portcullis Ring |
| 19 | Arrow Hall |
| 20 | Siege Gallery |
| 21 | The Crowned Cell |
| 22 | Ashen Throne |
| 23 | Last Watch |

The configured start, guardian, and exit points are carved into their floor plans. Runtime generation adds the normal walls, doors, props, monsters, chests, torches, and wall hangings around those plans. Knights and other existing bestiary archetypes are reused with Castle Keep palette variants.
