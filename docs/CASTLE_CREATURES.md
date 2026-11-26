# Castle Creatures and Bosses (the Thanksgiving update)

`VELSCOUR_Castle_Creatures_and_Bosses.zip` (kept outside the repo) is a small expansion: 50 creatures from five wings
of a fallen castle (the gatehouse, dungeons, chapel, armory and royal wing) and 10 bosses. They are part of the
base game. They are not a faction of their own like the Air Pirates or the Depth's Edge.

- **Every level can roll them.** They join the random bestiary (`rollLooks`, `src/data/bestiary.js`). An archetype's
  first look comes from them `KIN_SHARE` (30%) of the time, rising to `KIN_CASTLE` (70%) in the Castle overworld and the
  Castle Keep biome. In practice they are about 40% of dungeon looks and about 55% in the Castle. Each one plays one or
  more AI archetypes (`arch` + `also`), so every biome roster finds some.
- **Every creature has a mechanic no other monster has.** These are the 50 kits in `src/game/castlekin.js`, listed below.
- **The bosses are guardians and raid bosses.** A depth guardian is a castle boss `KIN_BOSS` (25%) of the time, and it
  fights with one of the creature kits between its boss patterns. In a BOSS ROOM they are the fourth host of
  `RAID_BOSSES`: ten signature fights, each built around a fight-long rule of its own (`src/game/castleraids.js`).

## Art: cut by heat map
The zip holds six RGBA sheets. Each is a 5 x 2 grid of 256 px cells, plus `sprites.csv`. The sprites aren't square,
and a few reach toward their neighbours (chains, keys, a pike), so `tools/castlekin.py` cuts by heat map instead
of by cell. It blurs the sheet's alpha into a heat map. Each warm blob is one piece of art (a body, or a loose ball
and chain). A blob goes to the cell its alpha mass sits in, and the cell keeps every blob bigger than a speck. The
sprite is the raw alpha inside those blobs, trimmed. The cuts match the artist's art boxes in `sprites.csv` to within
a pixel.

```
python tools/castlekin.py "<zip or unpacked folder>" [--heat out.png]   # -> assets/source/enemies/castle/{creatures_1,creatures_2,bosses}/
python tools/process_assets.py enemies castle                            # -> assets/sprites/enemies/castle_*.webp (+ enemies.json)
```
`--heat` writes the heat maps with the cut boxes drawn on them. The catalogue is `src/data/castlekin.js`. Rows are
`[name, arch, h, kit, extras]`, the id is `ck_` + the name in snake case, and `wing` is where it lives. The three
atlases (about 750 KB) load per level, like set 3.

## How a kit plugs in
`makeMonster` calls `attachKit(m, art.kit)` (`noKit` skips it: ratlings, hatchlings, raid bosses). A kit is
`{ desc, init, tick, hit, hurt, taken, death }`, with per-monster state in `m.ks`.
- `tick(m, dt, target, d, s)` runs in `Monster.update` after targeting and before special moves and the archetype
  AI. If it returns true, it takes the frame (dives, burrows, wind-ups, fleeing with the loot). A guardian
  (`ai: 'boss'`) runs it before `bossUpdate`.
- `hit` runs from `combat.hit` when the creature's blow lands, including its projectiles but not damage over time. `hurt`
  runs from `Monster.onDamaged`. `taken` is a damage multiplier in `combat.hit`, used for shells, stone sleep,
  candles and locked jaws. `death` wraps `m.onDeath`.
- Hero-side effects added to `combat.hit`:
  - `status.rust`: the hero takes more damage.
  - `status.disarm`: the hero deals half damage.
  - `status.hunted`: monsters hit the hero 15% harder.
  - `guardedBy`: a Cinder Squire takes half of its ward's hits.
- Hazards publish `danger(out)` and `autoGoal()` like the raid ones, so auto-play dodges marked lines, rings, pits
  and coils, stands in jail cells, and stamps on roach eggs.
- `blockTiles` (portcullis bars, cages, anvils, bramble walls, the Matron's locks) blocks floor tiles for a while
  and resets the flow field.

## The 50 creatures

**The gatehouse**

| Creature | Plays | Mechanic (`kit`) |
|---|---|---|
| Portcullis Maw | golem, abomination, demon | drops a portcullis behind the hero, cutting off the retreat, then rushes in (`portcullis`) |
| Rampart Harpy | gargoyle, bat | circles high over the hero where nothing reaches it, then dives along a marked line and lands (`harpy`) |
| Boltback Imp | archer, imp | keeps its distance and plants its back-mounted ballista for a long piercing bolt (`ballista`) |
| Moat Leech | worm, scorpion | latches onto the hero and drinks until struck hard enough; leaves slowing moat water behind (`leech`) |
| Arrow-Slit Wraith | archer, wraith | melts into the nearest wall and shoots from an arrow slit where it cannot be struck (`arrowslit`) |
| Chain Hound | hound | chained to its packmates: the chain between them tears at anything that crosses it (`chainpack`) |
| Soot Gargoyle | gargoyle, golem | sleeps as stone (all but immune), wakes in a cloud of choking soot, then sets again (`soot`) |
| Barbican Beetle | scorpion, golem, spider | its shell turns slowly to face the hero and shrugs off blows from the front: flank it (`barbican`) |
| Rust Pike Revenant | skeleton, knight | a long pike thrust; every wound rusts the hero, who takes more from every blow (`rustpike`) |
| Grate Rat | hound, ghoul, spider | drops through the floor grates, comes up behind the hero, and brings ratlings with it (`grate`) |

**The dungeons**

| Creature | Plays | Mechanic (`kit`) |
|---|---|---|
| Rack Spider | spider | webs the hero to the rack: rooted, stretched toward it, and torn while it lasts (`rack`) |
| Keyring Imp | imp, ghoul | picks the hero's purse and runs; kill it and the gold spills back, with interest (`keyring`) |
| Tallow Leech | worm, scorpion | leaves pools of hot wax; stand in them too long and they set solid round the hero (`tallow`) |
| Cage Mimic | ghoul, spider, scorpion | sits as an empty cage; when the hero comes near it springs and cages the hero in with it (`cagemimic`) |
| Shackled Ogre | abomination, golem, zombie | swings its ball and chain round in a wide circle; at half life its shackles break and it goes berserk (`ogre`) |
| Hookhand Jailor | ghoul, knight, zombie | throws a cell round the hero: stepping out of it is punished (`jailor`) |
| Blind Cell Crawler | ghoul, spider, hound | blind: it hunts by sound, losing a hero who stands still and charging one who moves or fights (`blind`) |
| Oubliette Eel | worm, scorpion | swims under the floor and opens an oubliette under the hero, who drops somewhere else, stunned (`oubliette`) |
| Lockjaw Toad | abomination, golem | clamps its jaws on the hero (rooted and bleeding); it takes double damage while locked on (`lockjaw`) |
| Bone Gaoler | skeleton, knight, cultist | chains an ally to itself: the chained one shrugs off three quarters of all harm until the Gaoler falls (`gaoler`) |

**The chapel**

| Creature | Plays | Mechanic (`kit`) |
|---|---|---|
| Censer Wraith | wraith, cultist | swings its censer, filling the room with incense that heals monsters and chokes the hero (`censer`) |
| Choir Moth | bat, gargoyle, elemental | sings with every Choir Moth near it, each one louder; three together bring down a hymn on the hero (`choir`) |
| Chalice Parasite | ghoul, spider, scorpion | fills its chalice with every wound it deals; full, it gives communion and heals its kin. Kill it full and the cup is yours (`chalice`) |
| Bell-Tongue Imp | imp, ghoul, cultist | rings its bell: a tolling wave stuns the hero nearby and calls every monster around to the hunt (`belltongue`) |
| Votive Husk | zombie, cultist, shroom | lights votive candles round itself and is shielded while any still burn: snuff them first (`votive`) |
| Altar Mantis | scorpion, spider, ghoul | marks the hero with an altar sigil that strikes where they stood; sacrifices a weaker ally to grow (`altar`) |
| Sacristy Shade | wraith, ghoul | unseen and untouchable until it strikes; it shows itself only for a moment after each blow (`sacristy`) |
| Reliquary Crab | golem, scorpion, spider | every blow shakes a bone relic loose from its box to circle it and fire on the hero: kill it fast (`reliquary`) |
| Saint-Eater | ghoul, zombie, demon | devours the hero's mana with every bite, healing on it; a hero run dry takes half again as much (`sainteater`) |
| Wax Acolyte | cultist, zombie, shroom | seals a dying ally in wax: untouchable for a moment, and healed when it breaks out (`waxseal`) |
| Anvilback Brute | golem, abomination, demon | hurls anvils that crush where they land and stay there as cover (and walls) for a while (`anvil`) |
| Quench Drake | hound, scorpion, worm | breathes fire, then quenching steam: a hero caught by both within a few seconds is tempered, stunned and broken (`quench`) |
| Cinder Squire | knight, skeleton | stands guard over its biggest ally and takes half of every blow aimed at it (`squire`) |
| Forge Tick | spider, scorpion | swells with every bite; at four it splits in two (`forgetick`) |
| Tongs Fiend | ghoul, imp, demon | tears the weapon out of the hero's hands and runs off with it: strike it to take it back (`tongs`) |

**The armory**

| Creature | Plays | Mechanic (`kit`) |
|---|---|---|
| Ash Bellows | shroom, golem, elemental | breathes in (dragging the hero close) then blasts it all out again in a cone of burning ash, stoking its fiery kin (`bellows`) |
| Helm Hermit | scorpion, spider, golem | pulls back into its helm when hurt: untouchable and mending, then bursts out spikes first (twice) (`hermit`) |
| Furnace Roach | beetle, spider | lays clutches of furnace eggs that hatch into more roaches unless stamped out; bursts into flame when it dies (`roach`) |
| Soot Smith | cultist, knight, zombie | hammers its allies' armour: each one it tempers shrugs off a third of all blows and gains life (`smith`) |
| Slag Viper | worm, scorpion, hound | slithers a ring of molten slag round the hero; when the coil closes the whole circle erupts (`slag`) |
| Tapestry Stalker | ghoul, wraith, hound | hangs flat against a wall like a tapestry, pounces on a hero who passes, then slinks back to the wall (`tapestry`) |
| Pantry Ghoul | zombie, ghoul, abomination | raids the hero's potion belt and drinks what it steals when hurt; eats corpses to heal. Kill it to win back what's left (`pantry`) |
| Envoy Shade | wraith, cultist | backs away to parley with the court: unless struck hard while it calls, reinforcements arrive (`envoy`) |
| Silverware Imp | imp, archer, ghoul | throws a fan of cutlery that sticks in the floor, then calls every piece back home through whoever is in the way (`silverware`) |
| Throne Louse | spider, scorpion | crawls onto another monster and crowns it: the host grows stronger until it dies and the louse moves on (`louse`) |

**The royal wing**

| Creature | Plays | Mechanic (`kit`) |
|---|---|---|
| Canopy Creeper | spider, ghoul, bat | climbs into the canopy out of reach, creeps over the hero and drops on them in a net (`canopy`) |
| Banquet Mimic | ghoul, scorpion, beetle | sits as a covered platter, then roams the room eating the loot off the floor: kill it to get it all back (`banquet`) |
| Crown Hound | hound | howls the royal hunt: every monster near joins it, faster, and hits the hunted hero harder (`crownhound`) |
| Dueling Husk | skeleton, knight, ghoul | takes guard (EN GARDE): blows struck into its guard are turned back; then it lunges and falls back (`duelist`) |
| Mirror Ghast | wraith, ghoul, skeleton | swaps places with the hero through its mirror, then strikes them from behind (`mirror`) |

| Boss | Guardian kit |
|---|---|
| The Drowned Castellan | `oubliette` |
| Matron of Keys | `jailor` |
| The Last Bell | `belltongue` |
| Reliquary Seraph | `votive` |
| Furnace Regent | `anvil` |
| The Rack Saint | `rack` |
| Banquet Below | `pantry` |
| The Veiled Seneschal | `mirror` |
| Sable Briar | `slag` |
| Crownless Colossus | `crownhound` |

The "Guardian kit" is what a boss plays when it stands guard at the end of a depth.

## The 10 raid bosses (`src/game/castleraids.js`)
These bosses work like the third host (`raidsigs.js`). Each has a `passive` that runs every frame, two signature
attacks, and a few generic abilities (`cleave`, `slam`, `adds`...) in its phase pools. The passives are merged into
`PASSIVES` and the signatures into `SIGS`. `RAID_BOSSES.push(...CASTLE_RAIDS)` adds them to the BOSS ROOM draw.

| Boss | Fight-long rule (`passive`) | Signatures |
|---|---|---|
| The Drowned Castellan | **Rising Moat**: the arena floods ring by ring from the walls inward (three steps, slowing and chilling), then drains | Anchor Throw (a line that hauls the hero in), Sluice Gates (torrents sweep across the arena) |
| The Matron of Keys | **Locked Doors**: every 18 s bars seal the hero into their quarter of the arena. Stand on the key to open them and stun her, or the locks tighten for 40% life | Key Volley, Chain Gaol (a cage, then a blast) |
| The Last Bell | **Three Tolls**: on the second toll a hush appears. On the third, anything outside the hush loses 45% life | Resonance (expanding rings, each with a gap), Bell Drop |
| The Reliquary Seraph | **Relic Chorus**: three relics each ward a quarter of the damage it takes. They come back every phase | Saint's Lance (a lance from each relic), Ascension (it rises out of reach while light rains down) |
| The Furnace Regent | **The Forge Floor**: alternating 4x4 squares glow, then burn | Molten Pour (lines that leave fire), Bellows Blast (it draws the hero in, then a fire cone) |
| The Rack Saint | **The Breaking Wheel**: spokes of light turn round it all fight, faster each phase | The Stretch (pulled away and torn), Martyr's Nails |
| Banquet Below | **The Feast**: dishes appear. Eat one to heal (each adds a slowing Gluttony stack), or it eats the dish and heals | Devour (an inhale cone, then a bite), Spoiled Courses (poison pools) |
| The Veiled Seneschal | **Masquerade**: it hides among four veiled copies. The real one glints gold, and a false face bursts on whoever strikes it | Veil Daggers (spirals), Veil Step (it blinks behind the hero and cleaves) |
| Sable Briar | **Overgrowth**: thorn patches spread over the floor, patch by patch | Thorn Lash (a wide cone), Bramble Wall (a wall of thorns, then a lash down the gap) |
| The Crownless Colossus | **The Lost Crown**: hold the crown 1.4 s to deal +45% (it burns a little). Leave it and the Colossus crowns itself and rages | Usurper's Stomp, Crumbling Throne (rubble everywhere but three safe circles) |

## Tests
- `node tools/tests/castlekin.js [kits] [shots]`: produces line-ups of the 60 (`castle_lineup_*.png`). Each creature
  then fights a hero for 14 s with allies, gold, potions, loot and a corpse about, and must visibly do its thing.
  The test also checks how often levels roll them and how often guardians are castle bosses.
- `node tools/tests/raid_sigs.js castellan,matron,lastbell,seraph,regent,racksaint,banquet,seneschal,sable_briar,colossus_crown [secs]`:
  casts every ability of each raid boss and takes shots, then auto-play fights each one.
- `node tools/tests/data_check.mjs`: checks that every cell has a bestiary entry.
