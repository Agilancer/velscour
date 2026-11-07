# Arcane Sorcerer: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by the high-concept cosmic spellcasters of classic ARPGs (such as *Diablo III's Arcane Wizard*, *Last Epoch's Sorcerer*, and *Grim Dawn's Aetherial Arcanist*), the Arcane Sorcerer commands the fundamental forces of astrophysics: raw spacetime curvature, stellar radiation, gravitational singularities, and cosmic constellations. The combat loop revolves around **spacetime manipulation (Singularities & Black Holes)**, **refractive particle lasers**, and **devastating celestial impacts**.

### The Four Iconic Archetypes:
1. **The Singularity Master (Gravity & Spacetime Curvature)**: Collapses space to clump, drag, and implode enemy packs (*Gravity Well, Graviton Lance, Wormhole, Black Hole*).
2. **The Starfire Channeler (Pure Arcane Lasers & Beams)**: Sweeps continuous high-energy particle beams across the battlefield (*Magic Missile, Arcane Orb, Disintegrate, Pulsar*).
3. **The Celestial Astronomer (Solar & Lunar Cataclysms)**: Calls down cosmic bodies from the heavens (*Falling Star, Comet, Meteor Shower, Eclipse, Moonfall*).
4. **The Constellation Weaver (Astral Projections & Starlines)**: Connects laser starlines and summons celestial spirit beasts (*Star Chart, Starlines Barrier, Ursa Major, Zodiac Wheel*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **17 Projectiles**: An endless parade of star and comet missiles (*Magic Missile, Arcane Orb, Starfire, Comet, Comet Volley, Halley's Comet, Gravity Bolt, Dark Matter, Antimatter, Twinkle, Orion's Volley, Missile Galaxy, Starstorm*).
* **13 Giant Impact AoEs**: Repetitive ground explosions and meteor impacts (*Sunspot, Meteor, Great Meteor, Sun Slam, Gravity Well, Black Hole, Singularity, Annihilation, Big Bang, Star Chart, Constellation, Heaven's Map*).
* **6 Continuous Beams**: Near-identical sustained laser channels (*Arcane Torrent, Disintegrate, Graviton Lance, Pulsar, Quasar, Gamma Ray Burst*).
* **Fallback Talents**: Arcane Sorcerer was falling back to Paladin talents in `talents.js`! It had zero genuine astrophysical talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Astral Collapse)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Astral Collapse!**
> 
> * **The Class Ultimate (`Astral Collapse` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; collapses the local spacetime metric of the entire arena into an astral singularity that implodes with catastrophic arcane force.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Big Bang* (cosmic room detonation), *Extinction Event* (titanic meteor), and *Gravitational Collapse* are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                  ARCANE SORCERER ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Starfire     │ Tree 1: Celestial    │ Tree 2: Gravity      │ Tree 3: Constellation│
 │ (Arcane Lasers)      │ (Solar & Lunar)      │ (Singularities & Void│ (Astral & Starlines) │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Magic Missile(Gen)│ 1. Falling Star(Fast)│ 1. Gravity Bolt(Slow)│ 1. Twinkle (Sparks)  │
 │ 2. Arcane Orb (Sphere│ 2. Comet (Chill Proj)│ 2. Repulse Nova(Push)│ 2. Star Chart (Zone) │
 │ 3. Disintegrate Beam │ 3. Solar Wind (Cone) │ 3. Gravity Well(Pull)│ 3. Shooting Star Dash│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Arcane Barrier    │ 4. Meteor Shower     │ 4. Wormhole (Teleport│ 4. Starlines Barrier │
 │ 5. Supernova Blast   │ 5. Sunspot / Corona  │ 5. Graviton Lance    │ 5. Ursa Major (Beast)│
 │ 6. Arcane Torrent    │ 6. Lunar Tide (Silence 6. Accretion Disk   │ 6. Zodiac Wheel(Buff)│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Pulsar / Quasar   │ 7. Eclipse (Blind)   │ 7. Black Hole (Vortex│ 7. Draco Serpent     │
 │ 8. Cosmic Ascension  │ 8. Moonfall (Impact) │ 8. Spaghettify Chain │ 8. Astrolabe Focus   │
 │ 9. Big Bang (Capston)│ 9. Extinction Event  │ 9. Grav. Collapse(Cap│ 9. Grand Conjunction │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Starfire (Pure Arcane Energy & Laser Beams)
* **Row 0 (Lv 1 - Missiles, Orbs & Lasers)**:
  1. **Magic Missile** (Lv 1 · Projectile Generator) — Fires triple seeking missiles of pure arcane force with zero mana cost.
  2. **Arcane Orb** (Lv 1 · Piercing Spender) — Launches a slow-moving, high-density energy orb that penetrates enemies before detonating.
  3. **Disintegrate Beam** (Lv 6 · Channeled Laser) — Searing particle laser piercing through an entire line of enemies, ramping up in width and damage over time.
* **Row 1 (Lv 12 - Barriers, Novas & Bombardment)**:
  4. **Arcane Barrier** (Lv 12 · Defensive Shield) — Shimmering forcefield converting 35% of mana into damage absorption and reflecting missiles.
  5. **Supernova Blast** (Lv 12 · Radial Burst) — Concentrated explosion of pure stellar heat dealing massive burst damage to all nearby foes.
  6. **Arcane Torrent** (Lv 16 · Targeted Bombardment) — Channeled bombardment of falling arcane projectiles raining down on the target area.
* **Row 2 (Lv 24 - Pulsars & Cosmic Transmutation)**:
  7. **Pulsar / Quasar** (Lv 20 · Deployable Beacon) — Deploys a spinning celestial beacon that fires rapid pulses of particle radiation in 360 degrees.
  8. **Cosmic Ascension** (Lv 24 · Transcendent Form) — Enters a transcendent state where spells cost no mana and cast 40% faster for 12s.
  9. **Big Bang** (Lv 30 · Detonation Capstone) — Cataclysmic cosmic explosion that annihilates enemy packs and instantly resets all spell cooldowns.

### Tree 1: Celestial Bodies (Comets, Meteors & Solar Flares)
* **Row 0 (Lv 1 - Falling Stars & Comets)**:
  1. **Falling Star** (Lv 1 · Fast Projectile) — Calls down a fast starlight projectile with a micro-stun and high critical damage.
  2. **Comet** (Lv 1 · Cold Projectile) — Hurls an icy celestial comet that chills targets and leaves frosty ground.
  3. **Solar Wind** (Lv 6 · Radiation Cone) — Sweeping wave of solar radiation pushing back enemies and inflicting burns.
* **Row 1 (Lv 12 - Meteor Showers & Lunar Tides)**:
  4. **Meteor Shower** (Lv 12 · Ground Rain) — Multiple flaming meteors raining down across a wide area for 5s.
  5. **Sunspot / Corona** (Lv 12 · Burning Zone) — Persistent zone of solar flares dealing ticking fire damage and reducing enemy fire resistance.
  6. **Lunar Tide** (Lv 16 · Pale Moon Nova) — Nova of pale moonlight that silences enemies for 3s and restores party mana.
* **Row 2 (Lv 24 - Eclipses & Planetary Impacts)**:
  7. **Eclipse** (Lv 20 · Arena Darkening) — Blocks out all light in the arena, blinding foes for 4s and increasing party critical chance by 25%.
  8. **Moonfall** (Lv 24 · Heavy Shard) — Summons an ethereal moon shard crashing down to cause massive frost/arcane damage.
  9. **Extinction Event** (Lv 30 · Meteor Capstone) — Calls down a titanic world-ending meteor leaving a permanent burning crater.

### Tree 2: Gravity (Singularities, Dark Matter & Spacetime)
* **Row 0 (Lv 1 - Dense Bolts & Concussive Repulse)**:
  1. **Gravity Bolt** (Lv 1 · Dense Missile) — Dense sphere of negative mass that slows the target by 50% for 3s.
  2. **Repulse Nova** (Lv 1 · Concussive Wave) — Concussive gravitational wave blowing all surrounding enemies 10 meters away.
  3. **Gravity Well** (Lv 6 · Ground Vortex) — Creates a localized vortex pulling all nearby enemies inward to a central nexus.
* **Row 1 (Lv 12 - Wormholes & Graviton Lances)**:
  4. **Wormhole Blink** (Lv 12 · Instant Teleport) — Bends spacetime to instantly teleport, leaving a spatial tear behind that damages enemies.
  5. **Graviton Lance** (Lv 12 · Heavy Beam) — Dense beam of concentrated gravity that pins and crushes targets against the ground.
  6. **Accretion Disk** (Lv 16 · Dark Matter Orbit) — Orbiting ring of dark matter particles that shred attackers in melee.
* **Row 2 (Lv 24 - Black Holes & Spaghettification)**:
  7. **Black Hole** (Lv 20 · True Singularity) — **The Legendary ARPG Vacuum**: Creates a true singularity that traps, damages, and crushes all targets inside for 4s.
  8. **Spaghettify Chain** (Lv 24 · Gravitational Link) — Gravitational chain linking enemies, violently pulling them into each other with massive collision damage.
  9. **Gravitational Collapse** (Lv 30 · Implosion Capstone) — Implodes the gravitational field of all enemies, causing them to collapse inward into dust.

### Tree 3: Constellations (Astral Projections & Starlines)
* **Row 0 (Lv 1 - Sparks & Star Charts)**:
  1. **Twinkle / Astral Spark** (Lv 1 · Bouncing Spark) — Flickering star energy that bounces between foes.
  2. **Star Chart** (Lv 1 · Ground Runes) — Inscribes glowing stellar runes on the floor that empower allied spells by 30%.
  3. **Shooting Star Dash** (Lv 6 · Astral Dash) — Fast dash across the arena leaving a luminous stardust trail.
* **Row 1 (Lv 12 - Laser Starlines & Celestial Behemoth)**:
  4. **Starlines Barrier** (Lv 12 · Optical Laser Wall) — Connects two target points with a laser starline that cuts traversing enemies.
  5. **Ursa Major** (Lv 12 · Astral Bear Minion) — Summons a celestial spirit bear made of pure starlight to tank and taunt enemies.
  6. **Zodiac Wheel** (Lv 16 · Rotating Buff) — Rotating star constellation granting rotating party buffs (Attack, Defense, Speed, Crit).
* **Row 2 (Lv 24 - Astral Dragons & Grand Conjunction)**:
  7. **Draco Celestial Serpent** (Lv 20 · Star Dragon) — Astral dragon of stars that swoops across the arena incinerating foes.
  8. **Astrolabe Focus** (Lv 24 · Channeling Device) — Channeling apparatus boosting spell critical chance to 100% for 6s.
  9. **Grand Conjunction** (Lv 30 · Starlight Capstone) — Aligns all constellations, unleashing a continuous cascade of starlight.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Starfire (Arcane Mastery)
* **Tier 1 (Lv 1 - Foundation)**: *Stellar Essence* (5 ranks) — +7% Arcane Damage, +3% Cast Speed, +15 Max Mana per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Arcane Orb)**:
  * **Choice A (Orbiting Pulsar)**: Arcane Orb circles the Sorcerer, firing micro-missiles at adjacent enemies before detonating.
  * **Choice B (Singularity Orb)**: Arcane Orb pierces all targets and drags them forward along its flight path.
* **Tier 3 (Lv 24 - Synergy)**: *Arcane Dynamo* (5 ranks) — Casting spells builds stacks of Dynamo, increasing your next heavy spell's damage by up to +60%.
* **Tier 4 (Lv 40 - A/B Skill Morph: Disintegrate Beam)**:
  * **Choice A (Prism Refraction)**: Disintegrate splits into 3 beams upon hitting the first target, sweeping across the battlefield.
  * **Choice B (Entropy Ray)**: Disintegrate strips 5% of the target's resistances per second of continuous channeling.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Archon of the Cosmos)**: Cosmic Ascension becomes a permanent toggle with reduced bonuses (+20% damage, -20% mana cost).
  * **Choice B (Chain Supernova)**: Every enemy killed by Arcane damage triggers an automatic mini-supernova explosion.

### Branch 1: Celestial Bodies (Solar & Lunar)
* **Tier 1 (Lv 1 - Foundation)**: *Astral Thermodynamics* (5 ranks) — +7% Fire/Cold Damage, +10% AoE Radius, +3% Crit Chance per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Meteor Shower)**:
  * **Choice A (Molten Impact)**: Meteors leave permanent pools of burning magma for 8 seconds.
  * **Choice B (Ice Comets)**: Meteors convert to giant ice comets that freeze struck enemies solid for 2.5 seconds.
* **Tier 3 (Lv 24 - Synergy)**: *Syzygy Alignment* (5 ranks) — Chilling enemies increases Fire damage by 25%; burning enemies increases Cold damage by 25%.
* **Tier 4 (Lv 40 - A/B Skill Morph: Solar Wind)**:
  * **Choice A (Solar Flare Nova)**: Solar Wind emits in a 360-degree blast, blinding all enemies for 4 seconds.
  * **Choice B (Plasma Jet)**: Solar Wind narrows into a high-pressure flamethrower jet dealing 150% more damage.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Total Eclipse)**: Casting Eclipse halts all enemy movement for 4 seconds and guarantees critical hits.
  * **Choice B (Starfall Cascade)**: Falling Stars trigger automatically every 3 seconds during combat without mana cost.

### Branch 2: Gravity (Singularity & Spacetime)
* **Tier 1 (Lv 1 - Foundation)**: *Spacetime Curvature* (5 ranks) — +7% Shadow/Gravity Damage, +15% Slow Potency, +6% Armor per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Gravity Well)**:
  * **Choice A (Crushing Singularity)**: Gravity Well crushes enemies at its center, stunning them and dealing 100% bonus damage.
  * **Choice B (Repulsive Nova)**: Gravity Well violently explodes outward after collapsing, launching enemies across the arena.
* **Tier 3 (Lv 24 - Synergy)**: *Event Horizon* (5 ranks) — Enemies caught in gravitational fields take 30% increased damage from all party members.
* **Tier 4 (Lv 40 - A/B Skill Morph: Wormhole Blink)**:
  * **Choice A (Spatial Tear)**: Teleporting creates an implosion at your departure point and arrival point, damaging all nearby foes.
  * **Choice B (Chrono Shift)**: Teleporting rewinds your health to what it was 3 seconds ago and resets your basic cooldowns.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Colossal Black Hole)**: Black Hole radius increased by 100%; pulls in projectiles, elites, and boss minions.
  * **Choice B (Gravitational Master)**: All gravity skills ignore 100% of enemy crowd-control resistance and defense.

---

## 6. Build Archetypes & Character Variety
1. **Singularity Gravity Mage**: Gravity Well + Crushing Singularity + Colossal Black Hole. Clumps and crushes entire dungeon rooms.
2. **Disintegrate Beam Channeler**: Starfire with Prism Refraction + Archon of the Cosmos for infinite laser room sweep.
3. **Solar & Lunar Elementalist**: Celestial Bodies with Molten Impact / Ice Comets + Syzygy Alignment for elemental combo bursts.
4. **Astral Constellation Summoner**: Combines Constellations with Ursa Major and Zodiac Wheel for high-utility tactical support.
