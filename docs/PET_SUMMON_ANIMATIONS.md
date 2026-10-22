# Summon Pet Animation Sheets

Every summon except the Slime Lord's slimes and revived monsters animates from the Grim Nocturne pet sheets
(`Velscour_Grim_Nocturne_Pets_No_Slimes.zip`): 109 pets on 27 sheets in `assets/source/pet_animations/`, listed with
their kind and row keys in `pets.json` there. `python tools/build_pet_animations.py [sheet ...]` cuts them into the
atlases in `assets/sprites/pets/` and writes `catalog.json`; `src/core/petart.js` picks the frame.

## Frame layouts

| Kind | Poses, left to right | Pets |
|---|---|---|
| Humanoid (7) | idle, dead, summoned 1-3, cheer, scared | skeletons, knights, allies, undead, golems' kin, Mirror Images |
| Ground (11) | idle, dead, summoned 1-3, happy, scared, walk 1-3, attack | wolves, bears, golems, Voidspawn, Death Machine |
| Flying (15) | idle 1-3, dead, summoned 1-3, happy, scared, fly 1-3, swoop, attack 1-2 | birds, dragons, drones, Rune Weapon, Storm Cloud |
| Stationary (8) | idle, dead, summoned 1-3, active, damaged, attack | totems, sentries, turrets, banners, witch and bard structures |

## How the sheets are cut

The sheets are loose grids, so poses are never cut out as rectangles. The builder runs seams between the rows and
then between the poses: the cheapest path through the sheet, where solid art (alpha 96+) costs sixty times more than
empty space. The seams bend round wing tips, tails, spell effects and flying shards, and only cut through art where two
poses really touch. In each cell the largest piece is the body; every other piece (alpha 40+) within reach of it stays,
which for spawn shards is most of the pet's height, and soft edges stay with the pieces they touch. The faint export
haze (alpha below 16) and far specks are dropped.

All poses of a pet share one scale: the rest pose is 120 px from its floor to its top (`restH`). Each pose stands on
the cell's `floor` line, centred on the body's centre line (the median column of its lower two thirds). Then
each pose is registered on the rest pose where the two really match: walkers and humanoids by the feet and legs, so
they don't slide, structures by their base, and flyers by the whole body in both directions. Dead poses and scattered
spawn poses keep the rough centre and stand on all of their art. `TWEAKS` in the builder nudges single frames by hand.

## In the game

`petAnimation` draws a summon from its row when its key (or `clone_<caster class>` for Mirror Image) is in the
catalog, scaled so the rest pose is the summon's usual height (`look.h`, its art's height, or 50 for class looks).
It plays the summoned frames for 0.6 s, then:

- **Moving:** walk or fly at 9 fps. Humanoids have no walk frames, so they rock from foot to foot round the feet.
- **Attacking** (`attackAnimT`): flyers swoop then strike; ground pets and structures show their attack frame;
  humanoids raise the arm of their cheer pose as the wind-up of the blow.
- **Cheer / happy** (`cheerT`): for a second after the pet lands a killing blow, and 2.5 s for every pet when a boss dies.
- **Scared / damaged:** below 30% life (structures also flinch to damaged when hit).
- **Structures** pulse between idle and active.
- **Dead:** a summon killed in combat leaves its dead pose on the floor for 3 s (`world.fallen`, drawn with the
  corpses). Expired or replaced summons just burst, as before.

`DERIVED` in the builder recolours rows into sheets of their own: `dk_ghoul.webp` is the ghoul in the Death Knight's
frost palette for his `dkghoul` summon. Pets imported with `tools/chatgpt_art.py pets` (the older 9/6 frame kit) are
read from `chatgpt_sheets.json` and cut the same way, with `legacy_land` / `legacy_winged` layouts.

## Checking the art

- `python tools/build_pet_animations.py --preview DIR` writes a guide strip per pet (floor and centre lines, the rest
  pose's outline over every frame).
- `tools/pet_viewer.html` (serve the repo root) plays every pet as the game does: a showreel of all states, or one state,
  with a zoom, speed, guides and an onion skin of the rest pose.
- `node tools/tests/petanims.js [keys]` summons every pet in town, checks each state draws the right frame, the
  dead poses and the killing-blow cheer, and takes a shot per state.
