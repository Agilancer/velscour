# The Sea of Sand bestiary (the Thanksgiving update)

There are 510 Grim Nocturne sprites from two packs. They are desert monsters, and they only live in the deserts.
- `VELSCOUR_Sea_of_Sand_200_Sprites.zip` (set `sand`) has 200 creatures, monsters and bosses. They are in the table
  below.
- `VELSCOUR_Sea_of_Sand_Humanoids_and_Djinn_310.zip` (set `sand2`) has 310 humanoids and djinn. They are covered under
  [Humanoids and djinn](#humanoids-and-djinn).

| tier | count | sheets | world height (`h`) | role |
|---|---|---|---|---|
| small | 50 | 01-05: Dune Hollows, Salt Flats, Oasis Fringe, Caravan Tracks, Pyramid Antechamber | 30-40 | pack creatures (slightly frailer and faster) |
| large | 70 | 06-12: Basalt Ravines, Shifting Dunes, Salt and Glass, Dry River and Oasis, Caravan Grave Roads, Pyramid Vaults, Buried Astronomy Halls | 54-68 | pack monsters (x1.15 life) |
| mythic | 30 | 13-15: Dune Below, Sunken Monuments, Mirage and Salt Storms | 82-100 | rare: x2.6 life, x1.35 damage, x3 xp, a gold aura |
| boss | 50 | 16-20: Pyramid Keepers, Deep Deserts, Oasis and Cisterns, Cliff and Caravan Roads, Astral Desert and Glass | 87-99 | guardians, BOSS ROOMs, pyramid bosses (`lone`) |

The heights are the roster's `suggested_world_height_px`. The large tier is scaled by 0.85, mythic by 0.75 and boss
by 0.62, so they sit beside the rest of the bestiary (the hero is 60). A boss in a BOSS ROOM is drawn 2.4x bigger.

## Humanoids and djinn
| kind | count | sheets | archetype | world height |
|---|---|---|---|---|
| mummy | 50 | 01-05 | zombie (undead) | 54-60 |
| zombie | 40 | 06-09 | zombie (undead) | 54-60 |
| living pharaoh | 20 | 10-11 | knight (mortal) | 54-60 |
| undead pharaoh | 10 | 12 | knight (bone) | 54-60 |
| mummified pharaoh | 10 | 13 | knight (undead) | 54-60 |
| nomad | 40 | 14-17 | ghoul (mortal) | 54-60 |
| desert knight | 30 | 18-20 | knight (mortal) | 54-60 |
| djinn | 50 | 21-25 | elemental (flying; x1.1 life, x1.12 damage) | 58-72 |
| humanoid boss | 40 | 26-29 | knight or zombie, by court (`lone`) | 83-99 |
| djinn boss | 20 | 30-31 | elemental (`lone`) | 83-99 |

The kind sets the archetype. A name can change it:
- A bow, sling, javelin, harpoon or falcon in the name makes an **archer**.
- A scepter, lamp, lens, healer or the like makes a **cultist** caster.
- A djinn's element comes from its name: ember and kiln give fire, thunder and wind give lightning, marid, water and
  salt give cold, and everything else is arcane.

These rules are `RANGED`, `CASTER` and `DJINN_EL` in `data/sandkin.js`. The rows are `SAND_HUMANOIDS`, which are
appended to `SAND_KIN`, so everything below applies to them too. In the deserts they fill the archetypes the first
pack barely covered: zombie, knight, archer, cultist, ghoul and elemental. The test's sample of desert looks was
about 40% humanoid or djinn.

## Pipeline
1. `python tools/sandkin.py <zip> [--heat heat.png]` cuts either pack by heat map. It tells the packs apart by roster size (200 is `sand`, 310 is `sand2`). The sheet's alpha is blurred
   (sigma 4) and every warm blob is a piece of art. Each blob goes to the roster cell its alpha mass sits in, and
   specks are dropped. The zip's own single PNGs are not used. Every cut is checked against the roster's `art_rect`;
   the largest difference is 3 px for `sand` and 1 px for `sand2`. The output is `assets/source/enemies/<set>/NN_<sheet>/NN_<slug>.png`, plus
   `roster.json`.
2. `python tools/process_assets.py enemies sand` (and `sand2`) packs one atlas per sheet (`assets/sprites/enemies/<set>_NN_*.webp`).
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

## How they fight, and what they shout
Each of the 510 has its own kit, drawn once from its id (`SAND_KITS` in `data/sandkits.js`). No two kits are alike,
and neither are any two move sets or titles. A kit has:
- **moves**: two from its role's pool (melee, ranged or caster, by archetype) and one from anywhere, or four for a
  boss or mythic. A normal one uses the first two. A greater breed, champion or boss uses all of them. They replace
  its archetype's usual moves.
- **shots** (`fx`): its own look from its kind's set, such as bones, javelins, locusts, embers or glyphs.
- **size** (`n`, x0.75 to 1.5): how many shots are in a volley, how many orbs in a halo, spiral arms, rain stones,
  homing seekers, a wall's width, and the hits in a flurry or barrage.
- **speed** (`spd`, x0.8 to 1.25): how fast its shots fly.
- **passives** (one, or two for a boss or mythic), in `game/sandkits.js`:

| passive | what it does |
|---|---|
| sandstep | side-steps after a heavy blow |
| mirage | below half life, splits off two fading mirages |
| scorch | its blows leave burning ground |
| duststorm | a slowing sand cloud round it |
| curse | its blows chill and bleed |
| rally | when it falls, allies nearby rage |
| bulwark | takes a third less from the front |
| regrow | heals when not being hit |
| vengeance | a ring of its shots when it dies |
| quicksand | dies into a slowing pit |
| sunflare | faster and fiercer when nearly dead |
| shadowstep | slips behind a hero who keeps away |

- **title**: the name of its signature move, such as "Bitumen Rift". It floats over the creature the first time the
  move is used.

They also shout at the hero in speech bubbles (`yell` in `game/sandkits.js`). There are 1,200 lines in
`data/sandvoices.js`, and none appears twice. They come in nine voices: beast, mythic, mummy, zombie, pharaoh, nomad,
knight and djinn, plus boss, which bosses also draw from (`sandVoice` picks the voice).
- **When they shout:** on first sight (a boss always, others 35% of the time), on the first blow they take, when
  nearly dead, after a special move, and now and then mid-fight.
- **Limits:** at most two bubbles at once, one new one every 2.5 s across the level, and one per monster every 12 s.
  The last 60 lines heard don't come round again.

## Testing
`node tools/tests/sandvoices.mjs` needs no browser. It checks that all 510 kits, move sets and titles are unique,
that there are 1,200 lines, none repeated and each 70 characters or fewer, and that every creature's voice exists.

`node tools/tests/sandkin.js [noshots]` checks five things:
- all 510 sprites load
- line-up shots of each tier (`sand_lineup_*.png`)
- all 510 fight a hero in batches of ten, and must take and land blows. Their kits must act: at least 18 kinds of
  special move, the passives (regrow, shadowstep and curse in drills of their own), signature moves named, and 20 or
  more shouts (`sand_shouts.png`)
- every humanoid and djinn kind shows up in desert looks
- the shares above: desert looks, guardians and BOSS ROOMs, natives, every dune variant's looks and bosses, and
  none outside the deserts

## Open
- They keep the shared archetype AIs for walking and basic attacks. Only their special moves and passives are their own.
- A sand boss in a BOSS ROOM is built without its kit, because the raid template plays its mechanics. It still shouts
  (`bossYell`): at the first blow, at half life, at a fifth, and now and then.
- Mythic and boss balance has only been checked by the tests so far.
