# People and Animals

The user's `VELSCOUR_People_and_Animals.zip` (47 people sheets, 10 animal sheets) replaces every townsperson,
royal, NPC knight, guard and scenario civilian. Vendors keep their own painted `npc_<vendor id>` art and shops, and
pets and monsters are unchanged.

## The art

- **Source:** the zip, which stays outside the repo (it is about 100 MB). Each sheet is a grid of labelled emotion
  poses: 5 columns by 2 rows (10 poses), or 5 by 4 (20 poses) on the three Greener sheets.
- **Cutter:** `python tools/build_people_pack.py <zip or extracted folder>` writes
  `assets/sprites/people/<sheet>.webp`, `manifest.json` and the review sheet `art-review/people-cuts.jpg`.
  - Labels are found as text-line components. Every grid row's labels share one y band, and the two-line DEAD label
    is found on its own.
  - A component that lies wholly inside a label box is text and is removed. A figure that touches its label only
    loses the pixels that read as label (a black plate with cream letters).
  - Anything wholly below the figure's feet is removed as debris.
  - Each character gets one scale, taken from the idle pose: adults are 172 px tall, the Greeners and the heir 150,
    and each animal has its own height (`HEIGHTS`). Feet are planted on row 194 of a 256 x 200 cell.
- **Frames:** `idle angry scared point dead excited love cheer attack happy`. The Greener sheets add
  `confused embarrassed proud curious worried suspicious sleepy surprised thinking relieved`.
- **No walk frames.** People bounce along on their current pose the way the hero does, with a little more spring
  and a slight sway. Frightened people run in the scared pose, angry ones stomp in the angry pose, and cheering ones
  skip. Animals trot between the idle and raised-paw poses and bound in their attack leap when they run. Rabbits
  hop. (`src/game/townsfolkvisuals.js`: `townFrame`, `townMotion`, 56 emotions in `EMOTIONS` with `alt` fallbacks
  for sheets without the Greener extras.)

## The cast (`src/data/townsfolk.js`)

| Group | Members |
| --- | --- |
| Children | The Greener triplets (Greener, Grinner, Gobble), goblin scamps; Pip, the royal heir |
| Royals and court | King Edric, Queen Elowen, Prince Rowan, Princess Isolde, Dowager Queen Agnes, Duke Halric, Duchess Ysabet |
| Knights (10) | Aldric of the Ashen Bastion, Elsabet of the Ivory Mantle, Bastian the Rusted Bulwark, Cassius of the Silver Censer, Rosette of Thornwall, Varric of the Cinder Crown, Maeve of the Mourning Veil, Halvard the Frostbound, Kestrel the Dusk Lancer, Odo of the Hollow Star |
| The watch | Old Tobin (veteran), Mira Thistle (border scout), Watchman Gorm, Hale of the River Patrol, Brina the Road Warden |
| Traveling merchants | Zahra (spice), Bjorn (fur), Ilse (glass), Tomas (books), Marta (pots), Ottilie (cloth), Nell (fish) |
| Townsfolk | Bess the baker, Dain the mason, Hilda the midwife, Finn the stablehand, Quill the candlemaker, Ulf the porter, Brother Cael (friar), Mother Agatha (priest), Rowena the shepherd, Perrin the tailor, Greta the cooper, Old Ferris the ferryman |
| Spellcasters | Nan Bramble the hedge witch (the alchemist vendor is already Old Mother Wren), Zebulon the Purple |
| Animals (`ANIMALS`) | Soot, Biscuit and Patches (cats); Scamp, Barley and Shep (dogs); rabbits, rats, a stag and a doe |

## Town (`src/game/townlife.js`, `src/game/townanimals.js`)

- **Everyday life:**
  - Merchants stroll the square crying their own wares (`WARES`).
  - The witch picks herbs under the trees, and the wizard practises spells (sparks, sometimes a flop).
  - A Greener juggles by the well (a new set piece). The busker is the friar or the bookseller.
- **Animals:**
  - Cats (60% of visits) nap on benches, wash, beg a stroke and hiss at dogs.
  - Dogs (55%) trot about, sniff, greet people and the hero ("Woof!") and chase cats.
  - On the outskirts, between the last houses and the treeline: rabbits (45%), rats (35%, which make people jump),
    and a stag or a doe (30%). All of them bolt when the hero comes close.
  - `G.townAnimalsForce = { cat: 2, ... }` forces animals for tests.
- **Events** now happen on 35% of visits (`TOWN_EVENT_CHANCE`). There are 19 of them (`TOWN_EVENTS`).
  - Rewritten for the new cast:
    - wedding (Mother Agatha officiates; the dog joins in)
    - royal progress (the whole family, the Duke as herald, three knights; the heir runs to see the hero)
    - funeral (priest and friar)
    - harvest fair (merchant stalls, the porter as crier, a Greener juggler)
    - market brawl (fur trader against cloth merchant)
    - sparring match (two knights, the Duke judging)
    - monster alarm (the "beast" is a startled stag)
    - birth
    - the Greeners' name day
    - caravan (two or three merchants)
    - wounded hero (the witch heals)
    - the lost heir (the Queen searches; Pip is found with a cat)
  - New:
    - witch trial (the Greeners did it)
    - knighting (the King knights a road guard)
    - the purple wizard's show (a rabbit from the hat)
    - a dog loose in the market (it steals the baker's sausages)
    - tax day (the Dowager Queen overrules the Duke)
    - the Greeners' ghost prank (their spooky faces)
    - deer in the square (until a dog barks)
- Lines live in `src/data/townscripts.js`. `{role}` in an event line becomes that cast member's name.

## Out in the world

- **`src/game/folk.js`:** `makeFolk` builds one NPC record for scenarios, Dark Forest trials and dungeon encounters.
  It cowers and flinches near awake monsters, lies dead at 0 hp and cheers when the scenario is won.
  `after(s, fn)` runs `fn` on game time; never use `setTimeout`, because tests step the game synchronously.
- **Overworld scenarios (`src/game/overworld.js`):**
  - Rewritten to use the new people: the caravan is a traveling merchant, the crossing is held by the river patrol,
    the villagers are townsfolk, the prisoners are merchants, knights, guards or the wizard (freed, they thank you
    and cheer), and the royal procession is the Queen, the Prince, the Princess and the heir.
  - Six new scenarios (`WILD_SCENARIOS` = ids 0-19 + 35-40, rolled by the Wilds and the Sea of Sand; the Castle
    keeps the first `CASTLE_SCENARIOS` = 35):
    - The Merchant Road
    - A Knight's Last Stand (the knight swings at attackers)
    - The Witch's Brew (four ingredients)
    - The Purple Ritual
    - The Royal Hunt
    - The Lost Greeners
- **Wanderers** use the new cast with moods: a stroller smiles or looks about, and a frightened one flees in the
  scared pose.
- **Dungeons (`src/game/encounters.js`):** on about half of ordinary depths, one or two of these encounters wait
  (`G.encounterForce = ['wizard']` forces one):
  - a captive held by a pack (rarely a royal, with a bigger reward)
  - a knight's last stand (if the knight lives, their oath gives +35% damage; if they fall, they leave their pack)
  - a merchant's camp with free potions
  - Zebulon's ward test (three waves, then +60% XP and 20% cooldown reduction)
  - Nan Bramble's cauldron (usually a buff and a full heal; sometimes the wrong pot, and an ambush)
  - a Greener who jumps out at you, then leads you to a hidden cache

  Rats scurry about on 30% of depths and bolt from the hero. A fallen adventurer's remains are now one of the
  painted knights, guards or wizard, lying in the dead pose.

## Tests

- `node tools/tests/townsfolk.mjs` checks the roster, the sheet contract and the scripts.
- `node tools/tests/town_visuals.mjs` checks frames, emotions and the bounce.
- `node tools/tests/townlife.js [events|none]` runs every event and the animals, with shots.
- `node tools/tests/encounters.js [kinds]` runs each dungeon encounter.
- `node tools/tests/scenarios.js [types]` runs a bot through the scenarios.
- `node tools/tests/town_sprite_display.js` checks that every person's sheet loads and that vendors keep their art.

The old 100-sheet townsfolk pack (`assets/sprites/townsfolk/`, `tools/build_townsfolk_pack.py`) is no longer read.
