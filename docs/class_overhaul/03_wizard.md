# Wizard: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & Diablo II / III ARPG Pillars
In the lineage of the *Diablo II Sorceress* and *Diablo III Wizard*, the Wizard is the quintessential master of high-risk, high-reward elemental destruction. The gameplay loop centers on dynamic resource management (Mana/Arcane Power), rapid mobility (*Teleport*), devastating zone control (*Blizzard, Meteor, Fire Wall*), and tactile spell combinations (Freeze into Shatter, Chain Lightning overloads).

### The Four Iconic Archetypes:
1. **The Pyromancer (Fire & Burn Burst)**: Relies on devastating delays, lingering heat, and explosive impacts (*Fireball, Meteor, Fire Wall, Hydra*).
2. **The Cryomancer (Frost & Crowd Control)**: Absolute battlefield lockdown and shattering crits (*Frost Bolt, Frost Nova, Frozen Orb, Blizzard*).
3. **The Electromancer (Storm, Chains & Teleportation)**: High-speed cast velocities, erratic bouncing bolts, and room-clearing arcs (*Charged Bolt, Chain Lightning, Teleport, Ball Lightning*).
4. **The Prismatic Archon (Tri-Elemental & Laser Beams)**: Channeled continuous beams, refractive lenses, and cosmic ascendance (*Prism Bolt, Disintegrate Beam, Singularity Lens, Archon*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **16 Projectile Clones**: The tree was overloaded with repetitive missiles (*Firebolt, Fireball, Frost Bolt, Ice Shard, Glacial Spike, Frost Lance, Charged Bolt, Spark, Lightning Bolt, Ball Lightning, Lightning Torrent, Prism Bolt, Chromatic Orb, White Beam*).
* **7 Channeled Beams**: Near-identical lasers differing only by texture color (*Inferno, Dragon's Breath, Frost Beam, Lightning Torrent, Prism Beam, White Beam*).
* **4 Armor Buffs**: Trivial passive shields (*Ice Armor, Chilling Armor, Storm Armor, Prismatic Ward*) that cluttered hotbar slots.
* **4 Elemental Walls**: Redundant walls (*Fire Wall, Ice Wall, Rainbow Wall*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Supernova)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Supernova!**
> 
> * **The Class Ultimate (`Supernova` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; releases a catastrophic solar core explosion that vaporizes surrounding enemies.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Armageddon* (continuous fire storm), *Absolute Zero* (screen-wide flash freeze), and *Archon Overcharge* are regular high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                      WIZARD ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Fire         │ Tree 1: Frost        │ Tree 2: Storm        │ Tree 3: Prismatic    │
 │ (Pyromancy & Burns)  │ (Cryomancy & Freeze) │ (Electromancy & Blink│ (Arcane & Lenses)    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Fireball (Spender)│ 1. Frost Bolt (Chill)│ 1. Charged Bolt (Gen)│ 1. Prism Bolt (Multi)│
 │ 2. Combustion (DoT)  │ 2. Frost Nova (Freeze│ 2. Lightning Bolt    │ 2. Chromatic Orb     │
 │ 3. Fire Wall (Zone)  │ 3. Ice Armor (Def)   │ 3. Teleport (Blink)  │ 3. Spectral Blades   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Flame Wave (Cone) │ 4. Glacial Spike     │ 4. Chain Lightning   │ 4. Prismatic Ward    │
 │ 5. Summon Hydra (Tur)│ 5. Frozen Orb (Orbit)│ 5. Ball Lightning    │ 5. Disintegrate Beam │
 │ 6. Meteor (Impact)   │ 6. Blizzard (AoE)    │ 6. Static Field (%)  │ 6. Singularity Lens  │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Inferno Beam (Chan│ 7. Ice Wall (Barrier)│ 7. Thunderstorm (Puls│ 7. Chromatic Wave    │
 │ 8. Volcano (Eruption)│ 8. Deep Freeze (Imm) │ 8. Tempest Cyclone   │ 8. Prismatic Storm   │
 │ 9. Armageddon (Cap)  │ 9. Absolute Zero(Cap)│ 9. Wrath of Sky(Cap) │ 9. Archon Form (Cap) │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Fire (Pyromancy, Burning & Explosions)
* **Row 0 (Lv 1 - Pyromancy Fundamentals)**:
  1. **Fireball** (Lv 1 · Projectile Spender) — Launches an explosive sphere of fire that detonates on impact in a wide radius.
  2. **Combustion** (Lv 1 · DoT/Chain) — Ignites a target; if the target dies while burning, it explodes into a secondary fire nova.
  3. **Fire Wall** (Lv 6 · Ground Hazard) — Erects an impenetrable curtain of flame incinerating enemies that walk through it.
* **Row 1 (Lv 12 - Area Denial & Heavy Artillery)**:
  4. **Flame Wave** (Lv 12 · Cone Pushback) — Expanding wave of fire sweeping across a 90-degree frontal arc, knocking enemies back.
  5. **Summon Hydra** (Lv 12 · Stationary Turret) — Summons a 3-headed fiery beast that continuously spits fireballs at nearby targets.
  6. **Meteor** (Lv 16 · Delayed Impact) — Calls down a titanic flaming meteor from the sky; crashes after 1.5s delay, leaving molten ground.
* **Row 2 (Lv 24 - Continuous Heat & Capstone)**:
  7. **Inferno Beam** (Lv 20 · Channeled Flamethrower) — Channeled flamethrower beam whose damage increases by 25% for every second held.
  8. **Volcano** (Lv 24 · Eruption AoE) — Opens a subterranean volcanic vent, launching molten boulders in random directions.
  9. **Armageddon** (Lv 30 · Rain/Capstone) — Rains dozens of apocalyptic flaming meteors across the entire arena for 8 seconds.

### Tree 1: Frost (Cryomancy, Crowd Control & Shatter)
* **Row 0 (Lv 1 - Chill & Defensive Shell)**:
  1. **Frost Bolt** (Lv 1 · Projectile) — Piercing ice bolt that chills targets, reducing their movement and attack speed by 40%.
  2. **Frost Nova** (Lv 1 · Radial Freeze) — Bursts in an expanding ring of sub-zero frost, instantly freezing all surrounding enemies solid for 2.5s.
  3. **Ice Armor** (Lv 6 · Defensive Buff) — Surrounds the Wizard in a glacial crystalline shell; increases Armor by 50% and freezes melee attackers.
* **Row 1 (Lv 12 - Iconic Shards & Blizzards)**:
  4. **Glacial Spike** (Lv 12 · Heavy Icicle) — Hurls an enormous icicle that pierces enemies and detonates into razor-sharp ice shrapnel.
  5. **Frozen Orb** (Lv 12 · Orbiting Projectile) — **The Classic D2 Spender**: Flying sphere of ice spraying dozens of swirling frost shards before detonating.
  6. **Blizzard** (Lv 16 · Ground AoE) — Calls down an ongoing glacial ice storm over a targeted zone, dealing continuous cold damage and repeatedly chilling.
* **Row 2 (Lv 24 - Physical Barriers & Total Freeze)**:
  7. **Ice Wall** (Lv 20 · Solid Barrier) — Raises a wall of solid glacial ice that completely blocks enemy movement and projectile line-of-sight.
  8. **Deep Freeze** (Lv 24 · Invulnerable Stance) — Encases the Wizard in solid ice for 4s, becoming immune to all damage while radiating a freezing blizzard.
  9. **Absolute Zero** (Lv 30 · Screen Wipe Capstone) — Instantly flash-freezes every enemy on screen; frozen regular monsters shatter and execute immediately.

### Tree 2: Storm (Electromancy, Mobility & Overcharge)
* **Row 0 (Lv 1 - Chaotic Sparks & Instant Blink)**:
  1. **Charged Bolt** (Lv 1 · Erratic Spreader) — Releases a fan of erratic electrical sparks that scamper across the ground.
  2. **Lightning Bolt** (Lv 1 · Instant Beam) — High-velocity linear lightning strike with immense critical strike multiplier.
  3. **Teleport** (Lv 6 · Instant Mobility) — **The Iconic ARPG Mobility Tool**: Instantly teleports the Wizard to the target cursor location with no travel time.
* **Row 1 (Lv 12 - Arcs, Orbs & Current)**:
  4. **Chain Lightning** (Lv 12 · Bouncing Arc) — Arcs across up to 6 enemies, jumping between clustered targets with crackling electricity.
  5. **Ball Lightning** (Lv 12 · Slow Orbit Orb) — Slow-traveling sphere of condensed plasma that continuously zaps all adjacent enemies.
  6. **Static Field** (Lv 16 · Percent Health Pulse) — Emits an electrical pulse reducing the current health of all nearby enemies by 20%.
* **Row 2 (Lv 24 - Ambient Storms & Sky Wrath)**:
  7. **Thunderstorm** (Lv 20 · Ambient Aura) — Passive/active storm aura that periodically strikes nearby foes with overhead lightning bolts.
  8. **Tempest Cyclone** (Lv 24 · Roaming Vortex) — Conjures a lightning tornado that roams across the battlefield, lifting and stunning enemies.
  9. **Wrath of the Sky** (Lv 30 · Cataclysm Capstone) — Calls down a continuous barrage of sky-splitting thunderbolts across the screen.

### Tree 3: Prismatic (Tri-Elemental Fusion & Archon)
* **Row 0 (Lv 1 - Chromatic Energy)**:
  1. **Prism Bolt** (Lv 1 · Tri-Element) — Rapid-fire bolt alternating between Fire, Frost, and Lightning with every cast.
  2. **Chromatic Orb** (Lv 1 · Bouncing Sphere) — Bouncing orb that shifts elements on each rebound, inflicting rotating debuffs.
  3. **Spectral Blades** (Lv 6 · Melee Arcane) — Slashes ethereal blades in front of the Wizard, cutting through shields.
* **Row 1 (Lv 12 - Beams & Lenses)**:
  4. **Prismatic Ward** (Lv 12 · Elemental Barrier) — Absorptive bubble granting 40% elemental damage reduction and reflecting spells.
  5. **Disintegrate Beam** (Lv 12 · Pure Laser) — Continuous channeled beam of raw energy that melts through an entire line of enemies.
  6. **Singularity Lens** (Lv 16 · Optical Prism) — Deploys a focal lens: any spell fired through the lens splits into 3 refracted copies.
* **Row 2 (Lv 24 - Tri-Element Storms & Archon Form)**:
  7. **Chromatic Wave** (Lv 20 · Expanding Shockwave) — Expanding ring inflicting burn, freeze, and shock simultaneously.
  8. **Prismatic Cataclysm** (Lv 24 · Rain/Meteors) — Simultaneous shower of fire meteors, ice comets, and lightning strikes.
  9. **Archon Form** (Lv 30 · Form Capstone) — Transforms into a being of pure celestial energy with teleport, disintegrate beams, and doubled armor.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Fire (Pyromancer's Flame)
* **Tier 1 (Lv 1 - Foundation)**: *Inner Crucible* (5 ranks) — +7% Fire Damage, +10% Burn Duration, +15 Max Mana per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Fireball)**:
  * **Choice A (Conflagration Cluster)**: Fireball fragments on impact into 3 smaller seeking fireballs that track adjacent targets.
  * **Choice B (Molten Blast)**: Fireball radius increased by 60% and leaves burning molten ground that slows enemies by 40%.
* **Tier 3 (Lv 24 - Synergy)**: *Ignite & Explode* (5 ranks) — Burning enemies have a 20% chance per second to explode into a mini-fire nova.
* **Tier 4 (Lv 40 - A/B Skill Morph: Meteor)**:
  * **Choice A (Meteor Shower)**: Drops 5 smaller meteors in rapid succession covering a wide carpet zone.
  * **Choice B (Cataclysmic Impact)**: Meteor impact delay halved; impact stuns targets for 2.5s and deals 100% bonus critical damage.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Phoenix Rebirth)**: Killing a burning enemy has a 10% chance to summon a miniature Phoenix; lethal damage heals the Wizard to 50% HP (2m CD).
  * **Choice B (Combustion Engine)**: Fire spells ignore 50% of enemy Fire Resistance; burning stacks infinitely.

### Branch 1: Frost (Cryomancer's Rime)
* **Tier 1 (Lv 1 - Foundation)**: *Glacial Blood* (5 ranks) — +7% Cold Damage, +15% Freeze Duration, +8% Armor per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Frost Nova)**:
  * **Choice A (Glacial Ring Aftershock)**: Frost Nova emits a second concentric ring 1.5 seconds later that shatters frozen targets.
  * **Choice B (Cold Snap Shroud)**: Frost Nova resets its cooldown immediately if it hits 5 or more enemies.
* **Tier 3 (Lv 24 - Synergy)**: *Shatter Mastery* (5 ranks) — Critical strikes against frozen enemies deal +60% bonus damage and cause them to explode in ice shrapnel.
* **Tier 4 (Lv 40 - A/B Skill Morph: Frozen Orb)**:
  * **Choice A (Hailstorm Orb)**: Frozen Orb releases 50% more shards and ends in a massive ice explosion that freezes all targets.
  * **Choice B (Orbiting Frost Sentinel)**: Frozen Orb orbits the Wizard instead of flying forward, shredding melee attackers.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Absolute Zero Grasp)**: Chilled enemies take 35% increased damage from all party members; frozen enemies cannot act or regenerate health.
  * **Choice B (Glacial Fortification)**: Ice Armor absorbs 30% of all incoming damage and converts it into Mana.

### Branch 2: Storm (Electromancer's Voltage)
* **Tier 1 (Lv 1 - Foundation)**: *Static Induction* (5 ranks) — +7% Lightning Damage, +3% Cast Speed, +3% Critical Strike Chance per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Chain Lightning)**:
  * **Choice A (High Voltage Surge)**: Chain Lightning arcs to +4 additional targets and gains +15% damage per bounce.
  * **Choice B (Forked Arc)**: Chain Lightning splits into two independent lightning bolts upon hitting the first target.
* **Tier 3 (Lv 24 - Synergy)**: *Overload Capacitor* (5 ranks) — Lightning crits generate static sparks that zap nearby enemies for 40% weapon damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Teleport)**:
  * **Choice A (Wormhole Conduit)**: Teleport has 2 charges and leaves an electrical conduit between the start and end points that zaps crossing foes.
  * **Choice B (Calamity Thunderclap)**: Teleport creates an instant concussive thunderclap at arrival, stunning enemies for 2s.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Superconductor)**: Cast Speed cap increased by 35%; critical strikes refund 25% of their mana cost.
  * **Choice B (Stormbringer)**: Thunderstorm strikes twice as fast and calls down a massive strike on elite monsters.

---

## 6. Build Archetypes & Character Variety
1. **Classic Frozen Orb / Blizzard Sorceress**: Frost branch with Glacial Ring + Hailstorm Orb + Shatter Mastery. Dominates dungeons with sub-zero control.
2. **Meteor Pyromancer**: Fire branch with Conflagration Cluster + Cataclysmic Impact + Combustion Engine. Raw area-of-effect destruction.
3. **Lightning Speedrunner**: Storm branch with High Voltage Surge + Wormhole Conduit + Superconductor. Hyper-mobile screen-clearing speed.
4. **Prismatic Disintegrate Archon**: Combines Disintegrate with Singularity Lens and Archon Form for sustained laser beam melting.
