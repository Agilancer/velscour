# ACT III: Bellmourn, City State Phobos and Castle Velscour

The third act's own content. The design comes from the Bellmourn 3D game's repo (`bm-phobos`: `docs/PHOBOS.md`,
`PHOBOS-LAYOUT.md`, `PHOBOS-TEXTURES.md`), and the art from two zips: `Bellmourn_Phobos_230_Characters.zip` and
`Velscour_Keep_Castle_and_Grand_Finale.zip`.

## Art
- `python tools/phobospack.py <characters zip> <finale zip> [--heat dir]` heat-map cuts the 5x2 plates
  (alpha blurred with sigma 5, blobs to cells) and the finale forms into `assets/source/enemies/phobos/<folder>/`.
  It also writes `src/data/phobosroster.js`. Then `python tools/process_assets.py enemies phobos` packs the 25 atlases.
  This gives 452 sprites: 80 folk (gray and good), ward foes, ward bosses, castle foes, castle bosses, knights,
  creatures and Lord Velscour's 4 forms in 3 battles.
- `src/data/phobos.js` turns the roster into bestiary entries (`phx_<id>`, `phobos: true`, so they stay out of the
  random pools). It also holds the 11 DISTRICTS, the 3 HUBS, the 10 WINGS (`wingOf(floor)`), `castleDepth`
  (floor 1 is depth 239, floor 100 is depth 500), the GUARDIANS and FINALE.
- Textures: `tools/phobostex.py` puts the bm repo's textures on the dungeon wall rigs as ten biome packs
  (`assets/tiles/ph_*`, `src/data/phobosbiomes.js`). These biomes are never in a bag.

## The places
- **Bellmourn** (`game.enterBellmourn`, `setupBellmourn` in `src/game/phobos.js`) is Herrington's town builder on a
  fixed seed, in snow. It has vendors and a stash, the Bell-Warden (the quest giver) and good folk who fled Phobos.
  Its waypoints lead to Phobos, the castle wings, Herrington and Sunscorch. The Herrington and Sunscorch waypoints
  to Bellmourn open when its quest is done, or from depth 200.
- **City State Phobos** (`src/world/phobos.js`, 248x204, never random) has a dodecagon wall and the Sill and moat
  plain to the west. The King's Mile, Ash Lane, Low Road and High Loop run through 11 districts, each with a square,
  houses, the Slough canal and the Bone Yards' grave rows. Every district has its own foes, ward lords on its square
  and folk. About one in five gray folk turns on the hero up close. The three hubs' givers sit in safe houses.
  Packs come back about every 45 s away from the hero. Slaying 12 ward lords opens the Castle Gate at the east end.
- **Castle Velscour** (`src/world/castlevelscour.js`) has 100 floors of 200x170 in 10 wings. There are 23 layouts in
  9 families: halls, naves (cathedrals), arenas, pits, stacks (libraries), sewers, bridges between towers, outer
  stairs round the towers, and leaps. The sheer families (pits, bridges, outerstair, leaps) use the Sheer Drop
  biomes: no walls and an abyss. Leap stones and swing chains (`Pad` in `game/phobos.js`) fling the hero across
  gaps, and auto-play follows the route pads. Every floor has a lord:
  - every floor: a wing captain;
  - every 5th floor: a castle boss;
  - every 10th floor: the wing's raid boss in an arena;
  - floor 100: Lord Velscour.
  Each wing is a waypoint in Bellmourn once reached.

## The raid bosses (`src/game/phobosraids.js`)
The raid bosses have 4 phases each, with mechanics drawn from Midnight Season 1 (The Voidspire, The Dreamrift,
March on Quel'Danas) and The War Within's last raids:

| Wing | Boss | Mechanics |
|---|---|---|
| Gatehouse | Keeper of the Third Latch | Latch slams and roars (Vorasius) |
| Oubliettes | The Oubliette Elector | Chains and a collapsing floor (Salhadaar / Dimensius) |
| Armoury | Armourer of the Hollow Crown | Forge heat, cooled in the quench troughs |
| Great Hall | The Iron Table Marshal | The bonded Brazier Duke: keep them apart (Vaelgor & Ezzorak) |
| Library | The Long Stacks Regent | Memory game and falling pages (Midnight Falls) |
| Menagerie | The Queen of Iron Pennants | The Veil: immune until the Veil Wardens die (Chimaerus) |
| Sanctuaries | Ash Chancellor of the Sanctuaries | Light/Void polarity circles (Belo'ren) |
| Stormspire | The Windward Black Knight | Gale push, shelter by the buttresses (Crown of the Cosmos) |
| Bonespire | The High Ward's Eclipse | Beams and the eclipse |

**Lord Velscour** changes form every phase (4 sprites, growing). His three battles rotate win by win:
- **The Crimson Dynasty:** tide pools, the Dynasty's Debt and a shrinking arena.
- **The Obsidian Eclipse:** polarity, a gravity well, the eclipse and an event-horizon pull.
- **The Cathedral of Ruin:** a tolling bell, shattered glass and falling pillars.

His fall plays the ending: the balcony, the beam, and waking in Bellmourn. He can never truly die.

## Quests (`QUESTS` in `game/phobos.js`, state `c.phobos`)
1. Herrington (from level 30 or depth 60): win 3 BOSS ROOMs.
2. Sunscorch: go 10 depths deeper.
3. Reach depth 200 or level 60 to open Bellmourn.
4. Bellmourn: slay 300 foes.
5. Win 1 more BOSS ROOM to open the road to Phobos.
6. Phobos: find the three hubs.
7. Break 12 ward lords.
8. Clear each of the ten wings.
9. Win all three of Velscour's battles.

Act III never touches the descent's depth. Its levels are built at their own depth for monster levels, deaths
there wake the hero in Bellmourn with no Defiance, and the town portal leads to Bellmourn.

## Test
`node tools/tests/phobos.js [floors] [noraid | raids=10,20,100c,100o,100x]` tests Bellmourn's portals, Phobos (the
gate is sealed until 12 lords fall), castle floors reaching their exits, and every raid through 4 phases. It writes
shots `tools/tests/out/phobos_*`. Run the raids in two batches: one long headless page can run out of memory.
`node tools/tests/phobos_biomes.js` tests the ten texture packs.
