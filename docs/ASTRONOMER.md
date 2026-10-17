# The Astronomer

The class formerly called the Arcane Sorcerer. The class id is still `arcane_sorcerer`, so saves, the class sprite,
the gear packs and every test keep working; only the name, trees and skills changed.

Files: `src/game/astronomer.js` (star chart, zodiac, special spells, Celestial Mirror), `src/gfx/cosmos.js` (all the
art, procedural and cached), skill lines in `src/data/skilldata.js` (trees 0-2) and `src/data/skilltrees4.js` (tree 3).
Test: `node tools/tests/astronomer.js [auto-play minutes] [mobile]`.

## Trees

| Tree | Theme | Highlights |
|---|---|---|
| Starfire | swarms of star missiles, blue light | Star Missiles (basic), Comet Swarm, Starstream, Starstorm, Missile Galaxy, Pulsar, Quasar, **Celestial Mirror**, Supernova, Big Bang |
| Celestial Bodies | meteors, suns, moons, comets | Falling Star, Meteor, Great Meteor, **Meteor Shower**, Extinction Event, **Sun Slam**, Moonfall, Eclipse, Comet Storm, Syzygy |
| Gravity | black holes and dark matter | Gravity Bolt, Gravity Well, **Black Hole**, Singularity, Event Horizon, Wormhole, Neutron Star, Annihilation |
| Constellations | the star chart | Star Chart, Constellation, Heaven's Map, Ursa Major, Orrery, Starfall, Grand Conjunction |

## How he plays: the star chart

1. Every spell he casts **charts a star** where it lands (his free Star Missiles chart one every third cast; slain
   monsters become stars 35% of the time). Casting at the same spot only brightens the star there, so he has to aim
   around the battlefield.
2. Each new star is joined to the last by a **starline** that burns and slows anything crossing it.
3. The fifth star **ascends** the constellation: a starfall drops on every star, the lines flare, and the shape he
   drew becomes a zodiac sign with a 15 s boon:

| Shape | Constellation | Boon |
|---|---|---|
| straight line | The Hunter | +20% crit chance |
| closed loop | The Northern Crown | -20% cooldowns |
| tight cluster | The Twins | +1 projectile, +15% damage |
| zigzag | The Serpent | +10% life steal, +15% damage |
| a curve bending one way | The Swan | +24% move speed, +15% damage |
| a long sprawl | Draco | +40% damage |
| a wide spread | The Great Bear | +60% armor, +25% life |
| anything else | The Scales | regeneration, +30 resist, 25% mana |

4. Three different boons at once start a **Grand Conjunction** (once every 40 s): the sky opens over him and meteors
   fall on everything nearby for 4.5 s.

The orrery over his head shows the chart (five slots) and his boons as small planets.

Chart skills: **Star Chart** lights three stars in a line, **Constellation** ascends a chart early at +25%,
**Heaven's Map** draws seven stars round the target and ascends them as the Crown at +50%, and **Celestial Mirror**
charts its ring of images as the Crown.

## Celestial Mirror

Eight see-through copies of the Astronomer ring him and slowly turn, joined by a ring and an eight-pointed star of
light. While they shine (3 s, +0.3 s per rank) he takes no damage, each image fires star missiles of its own, and
every projectile spell he casts also leaves each image (up to three missiles each, 30% damage).

## Technical notes

- His arcane skills fly as `astral` (`ELEM.astral`, blue). It is visual only: `combat.js` treats `astral` hits as
  arcane (arcane resistance, halved), and damage bonuses use the skill's own `arcane`.
- `astro=<name>` names a special spell. `astroCast` runs before castSkill's kind switch: `true` replaces the kind's
  normal cast, `undefined` adds to it (Mirror, Supernova, Eclipse, Syzygy and Grand Conjunction keep their buff, nova
  or curse).
- Star missiles weave (`weave` on `Projectile`), so a swarm reads as many darting stars, not one beam.
- Hazards here must not define a `pos` field or method: ring augments (`augments.js points()`) read `h.pos` as a list
  of points. Use `at()`.
