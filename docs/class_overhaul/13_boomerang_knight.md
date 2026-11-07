# Boomerang Knight: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by curved-blade acrobats and orbital weapon masters, the Boomerang Knight features one of the most mechanically unique loops in ARPGs: **trajectory manipulation and catch-timing**. Thrown curved blades deal damage outbound, hover at their apex, and deal devastating bonus damage on their return path. Catching a returned blade empowers the next strike, creating a high-skill, rhythmic combat flow.

### The Four Iconic Archetypes:
1. **The Aerodynamic Juggler (Curved Boomerangs & Catches)**: Masters curved flight paths, dual-blade throws, and catch-empowered discharges (*Curved Boomerang, Twin Boomerangs, Seeking Rang, Catch & Release*).
2. **The Chakram Blade-Dancer (Melee Wind Slashes & Flurries)**: Weaves rapier wind slashes, gale dashes, and spinning parries in close quarters (*Cross Cut, Wind Slash, Gale Rush, Whirling Slash*).
3. **The Gale Master (Wind Vortices & Typhoons)**: Manipulates wind currents to group enemies, create updrafts, and unleash storms (*Gale Vortex, Tailwind Aura, Razor Tornado, Cataclysmic Typhoon*).
4. **The Orbital Blender (Whirling Satellites & Chakram Shields)**: Encircles the Knight with sharp spinning rings that shred melee attackers and deflect arrows (*Orbiting Rang, Chakram Shield, Blade Ring Nova, Tempest Orbit*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **31 Projectile Clones**: Over 38% of the class was comprised of 31 minor variations of throwing a curved returning blade (*Boomerang, Twin Boomerangs, Triple Throw, Heavy Rang, Wind Blade, Spiral Rang, Chakram, Razor Boomerang, Returning Gale, Blade Ring, Tri-Chakram, Ricochet Rang, Shuriken, Seeking Rang, Storm Chakram, Gale Blade, Buzzsaw, Bladestorm Rang, Golden Rang, Hurricane Chakram, Whirlwind Toss, Gale Rang, Razor Chakram, Phantom Rang, Cyclone Throw, Sky Cutter, Falcon Rang, Twin Chakrams, Returning Storm, Horizon Rang, Infinite Orbit*).
* **6 Separate Orbiting Satellites**: Minor visual variations of spinning blades (*Orbiting Rang, Chakram Shield, Blade Orbit, Razor Ring, Gale Barrier, Tempest Orbit*).
* **7 Cyclones**: Redundant wind twisters (*Mini Cyclone, Gale Vortex, Wind Spout, Razor Tornado, Twister, Tempest Vortex, Sky Storm*).
* **Fallback Talents**: Boomerang Knight was falling back to Paladin talents in `talents.js`! It lacked genuine aerodynamic talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Cyclone Tempest)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Cyclone Tempest!**
> 
> * **The Class Ultimate (`Cyclone Tempest` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; unleashes an enormous screen-wide hurricane of razor-sharp spinning blades and gale winds that homogenizes enemy packs.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Infinite Orbit / Horizon Rang* (screen-edge return blade), *Executioner's Guillotine*, and *Cataclysmic Typhoon* are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                  BOOMERANG KNIGHT ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Throwing     │ Tree 1: Bladesmanship│ Tree 2: Gale Knight  │ Tree 3: Tempest Orbit│
 │ (Curved Ballistics)  │ (Melee Wind Slashes) │ (Wind Vortices/Storm)│ (Satellites & Deflect│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Boomerang (Return)│ 1. Cross Cut (Gen)   │ 1. Gust (Pushback)   │ 1. Orbiting Rang(Sat)│
 │ 2. Twin Boomerangs   │ 2. Wind Slash (Wave) │ 2. Gale Vortex(Vacuum│ 2. Chakram Shield    │
 │ 3. Chakram (Grind)   │ 3. Gale Rush (Dash)  │ 3. Tailwind Aura     │ 3. Blade Ring Nova   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Heavy Rang (Stun) │ 4. Blade Barrier(Parr│ 4. Wind Spout (Lift) │ 4. Gale Barrier      │
 │ 5. Seeking Rang(Homin│ 5. Whirling Slash    │ 5. Razor Tornado     │ 5. Tri-Chakram Orbit │
 │ 6. Ricochet Rang     │ 6. Blade Flurry      │ 6. Tempest Dash      │ 6. Slicing Maelstrom │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Buzzsaw (Ground)  │ 7. Razor Wind Arc    │ 7. Sky Cutter (Shear)│ 7. Razor Ring Fissure│
 │ 8. Catch & Release   │ 8. Bladestorm Waltz  │ 8. Hurricane Eye     │ 8. Tempest Sovereign │
 │ 9. Horizon Rang (Cap)│ 9. Guillotine (Cap)  │ 9. Typhoon (Capstone)│ 9. Supernova Vortex  │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Throwing (Boomerangs, Trajectories & Catches)
* **Row 0 (Lv 1 - Core Curved Throws & Chakrams)**:
  1. **Curved Boomerang** (Lv 1 · Outbound/Return Spender) — **The Core Mechanic**: Throws a curved blade dealing damage on its outbound path, hovering at apex, and dealing 150% damage on its return path.
  2. **Twin Boomerangs** (Lv 1 · Symmetrical Arc) — Throws two synchronized boomerangs in an expanding and converging arc.
  3. **Chakram** (Lv 6 · Stationary Grind) — Heavy circular blade that hovers at the target destination, continuously grinding through enemies for 3s before returning.
* **Row 1 (Lv 12 - Weighted Impacts, Homing & Ricochets)**:
  4. **Heavy Rang** (Lv 12 · Knockback Throw) — Weighted boomerang that knocks back and stuns enemies on its outbound path.
  5. **Seeking Rang** (Lv 12 · Homing Trajectory) — Aerodynamic blade that curves in mid-air toward marked targets automatically.
  6. **Ricochet Rang** (Lv 16 · Bouncing Blade) — Sharp returning blade that bounces off walls and solid targets up to 4 times before returning.
* **Row 2 (Lv 24 - Buzzsaws, Catches & Horizon Rangs)**:
  7. **Buzzsaw** (Lv 20 · Ground Sawblade) — Ground-skimming sawblade that rolls forward, shredding armor and leaving deep bleed trails.
  8. **Catch & Release** (Lv 24 · Timing Active) — Active timing ability: catching a returning boomerang empowers the next throw with +200% damage and instant velocity.
  9. **Infinite Orbit / Horizon Rang** (Lv 30 · Screen Edge Capstone) — Massive legendary boomerang that flies to the screen edge and returns with screen-clearing force.

### Tree 1: Bladesmanship (Melee Flurries & Wind Slashes)
* **Row 0 (Lv 1 - Fast Slashes & Gale Rushes)**:
  1. **Cross Cut** (Lv 1 · Melee Generator) — Fast cross-slash dealing physical damage and generating Momentum stacks.
  2. **Wind Slash** (Lv 1 · Air Wave) — Sweeping melee swing that releases a cutting air projectile forward.
  3. **Gale Rush** (Lv 6 · Slashing Dash) — Forward dash slashing all enemies passed through and gaining +30% movement speed.
* **Row 1 (Lv 12 - Parries & 360-Degree Spins)**:
  4. **Blade Barrier** (Lv 12 · Parry Stance) — Defensive parry stance deflecting incoming melee attacks with twin blades.
  5. **Whirling Slash** (Lv 12 · 360 Spin) — Full 360-degree spin attack slicing all surrounding enemies.
  6. **Blade Flurry** (Lv 16 · Channeled Shred) — Channeled rapid-fire melee combo shredding a single target's armor by 40%.
* **Row 2 (Lv 24 - Razor Wind & Guilliotine Executions)**:
  7. **Razor Wind Arc** (Lv 20 · Crescent Wave) — Wide crescent wave of slicing wind that travels forward and cuts through shields.
  8. **Bladestorm Waltz** (Lv 24 · Mobile Dance) — Continuous mobile spinning attack while deflecting ranged missiles.
  9. **Executioner's Guillotine** (Lv 30 · Execution Capstone) — High-impact overhead blade slam that shears bleeding enemies in half for triple damage.

### Tree 2: Gale Knight (Wind Magic, Twisters & Updrafts)
* **Row 0 (Lv 1 - Gusts & Vacuum Vortices)**:
  1. **Gust** (Lv 1 · Air Pushback) — Puff of wind pushing back charging enemies and interrupting attacks.
  2. **Gale Vortex** (Lv 1 · Vacuum Ground) — Deploys a mini-cyclone that pulls light enemies into its center for 3s.
  3. **Tailwind Aura** (Lv 6 · Wind Aura) — Wind aura granting the party +25% movement speed and attack speed.
* **Row 1 (Lv 12 - Updrafts & Roaming Twisters)**:
  4. **Wind Spout** (Lv 12 · Geyser Updraft) — Upward air geyser launching caught enemies into the air.
  5. **Razor Tornado** (Lv 12 · Roaming Cyclone) — Roaming twister filled with sharp debris that moves across the battlefield.
  6. **Tempest Dash** (Lv 16 · Wind Teleport) — Teleporting wind dash turning into a brief whirlwind at departure.
* **Row 2 (Lv 24 - Sky Cutters & Cataclysmic Typhoons)**:
  7. **Sky Cutter** (Lv 20 · Shearing Wind) — Calls down vertical shearing winds that crash down from above.
  8. **Eye of the Hurricane** (Lv 24 · Defensive Safe Zone) — Safe zone surrounding the knight that violently blows all enemies away.
  9. **Cataclysmic Typhoon** (Lv 30 · Arena Storm Capstone) — Enormous screen-wide hurricane sweeping up all non-boss monsters in the room.

### Tree 3: Tempest Orbit (Whirling Satellites & Shields)
* **Row 0 (Lv 1 - Orbiting Blades & Shields)**:
  1. **Orbiting Rang** (Lv 1 · Satellite Spender) — A single boomerang orbits continuously around the knight, striking adjacent foes.
  2. **Chakram Shield** (Lv 1 · Defensive Orbit) — Spinning ring of chakrams absorbing 30% of incoming physical damage.
  3. **Blade Ring Nova** (Lv 6 · Expanding Ring) — Expands all orbiting blades outward in an expanding radial ring.
* **Row 1 (Lv 12 - Gale Barriers & Triple Orbits)**:
  4. **Gale Barrier** (Lv 12 · Missile Deflection) — Air shield increasing parry chance and deflecting ranged projectiles.
  5. **Tri-Chakram Orbit** (Lv 12 · Multi-Satellite) — Triples the active orbiting blades and increases their orbit radius.
  6. **Slicing Maelstrom** (Lv 16 · High-Speed Rotation) — Increases the rotation speed of orbiting blades by 200% for 6s.
* **Row 2 (Lv 24 - Rolling Saws & Supernovas)**:
  7. **Razor Ring Fissure** (Lv 20 · Rolling Blades) — Slams orbiting blades into the ground, sending rolling sawblades forward.
  8. **Tempest Sovereign** (Lv 24 · 6-Blade Orbit) — Up to 6 glowing astral chakrams orbit at various distances.
  9. **Supernova Vortex** (Lv 30 · Shrapnel Capstone) — Detonates all orbiting blades in a cataclysmic shrapnel explosion.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Throwing (The Aerodynamic Master)
* **Tier 1 (Lv 1 - Foundation)**: *Aerodynamic Precision* (5 ranks) — +7% Thrown Projectile Damage, +15% Flight Velocity, +15% Catch Radius per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Curved Boomerang)**:
  * **Choice A (Razor Return)**: Boomerang deals +150% damage on its return flight and inflicts deep bleed wounds.
  * **Choice B (Explosive Apex)**: Boomerang triggers a fiery concussive explosion at its furthest point of flight before returning.
* **Tier 3 (Lv 24 - Synergy)**: *Perfect Catch* (5 ranks) — Catching a returning boomerang grants +10% attack speed and +5% movement speed (stacks up to 5 times).
* **Tier 4 (Lv 40 - A/B Skill Morph: Chakram)**:
  * **Choice A (Grinding Blade)**: Chakram remains spinning in place at its target point 3 seconds longer, pulling enemies inward.
  * **Choice B (Splintering Chakram)**: Chakram splits into 3 mini-chakrams when hitting an elite enemy or boss.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Infinite Return)**: All thrown boomerangs loop an additional time around the knight before catching; you can hold 4 active boomerangs.
  * **Choice B (Horizon Splitter)**: Thrown boomerangs ignore walls, terrain, and obstacles, slicing through all geometries.

### Branch 1: Bladesmanship (Melee Wind Flurry)
* **Tier 1 (Lv 1 - Foundation)**: *Razor Edge* (5 ranks) — +7% Melee Physical Damage, +3% Crit Chance, +3% Attack Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Gale Rush Dash)**:
  * **Choice A (Cyclone Rush)**: Dashing leaves behind a Razor Tornado that continues to damage enemies along the path.
  * **Choice B (Shadow Step Flurry)**: Dashing through an enemy resets the dash cooldown if that enemy dies within 3 seconds.
* **Tier 3 (Lv 24 - Synergy)**: *Wind Dancer* (5 ranks) — Alternating between a thrown boomerang and a melee slash grants +25% bonus damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Whirling Slash)**:
  * **Choice A (Vacuum Whirl)**: Whirling Slash pulls all enemies within 8 yards into the center.
  * **Choice B (Severing Blades)**: Whirling Slash applies a permanent 35% armor reduction to all targets hit.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Master Bladestorm)**: Bladestorm Waltz duration is doubled, and you can cast boomerangs while spinning.
  * **Choice B (Blade of Four Winds)**: Critical melee hits fire 3 free cutting air projectiles in random directions.

### Branch 2: Tempest Orbit (Whirling Satellites)
* **Tier 1 (Lv 1 - Foundation)**: *Orbital Dynamics* (5 ranks) — +7% Orbit Damage, +15% Orbit Rotation Speed, +3% Block/Parry Chance per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Orbiting Rang / Chakram Shield)**:
  * **Choice A (Buzzing Shroud)**: Orbiting blades shred projectile attacks out of the air, granting 100% missile deflection.
  * **Choice B (Lightning Conductors)**: Orbiting blades crackle with electrical sparks, shocking nearby enemies every second.
* **Tier 3 (Lv 24 - Synergy)**: *Centrifugal Force* (5 ranks) — The longer an orbit skill remains active, the higher its damage ramps (up to +60%).
* **Tier 4 (Lv 40 - A/B Skill Morph: Blade Ring Nova)**:
  * **Choice A (Expanding Buzzsaw)**: Expanded blades do not dissipate; they travel outward to screen edge and return inward.
  * **Choice B (Impaling Spikes)**: Expanding blades stun all struck enemies for 2.5 seconds.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Ring of Ten Thousand Blades)**: Orbit cap increased to 8 blades; orbiting blades automatically parry 40% of melee attacks.
  * **Choice B (Sovereign Maelstrom)**: Activating Slicing Maelstrom creates a gravitational hurricane pulling the entire room inward.

---

## 6. Build Archetypes & Character Variety
1. **Aerodynamic Boomerang Catcher**: Razor Return + Perfect Catch + Infinite Return. High skill ceiling timing juggler.
2. **Orbital Blender Tank**: Buzzing Shroud + Ring of Ten Thousand Blades. Shakes off missiles while shredding melee monsters.
3. **Wind Flurry Skirmisher**: Cyclone Rush + Vacuum Whirl + Wind Dancer for hyper-mobile hit-and-run combat.
4. **Hurricane Controller**: Gale Knight tornados with Grinding Blade Chakram for massive crowd suction and zone lockdown.
