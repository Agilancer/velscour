# Gunner: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by heavy ballistic specialists and combat engineers in modern ARPGs (such as *Diablo III's Marauder Demon Hunter* and *Torchlight's Outlander/Engineer*), the Gunner commands high-caliber sidearms, point-blank buckshot, automated turret nets, and catastrophic carpet bombings. The combat loop centers on **weapon swapping / range spacing (close-range shotgun vs long-range snipe)**, **laying automated turret and Tesla defenses**, and **detonating tactical ordnance**.

### The Four Iconic Archetypes:
1. **The Ballistic Gunslinger (Pistols, Rifles & Miniguns)**: Mobile dual-wielding and high-velocity bullet flurries (*Burst Fire, Shotgun Blast, Piercing Shot, Snipe, Minigun Fury*).
2. **The Heavy Demolitionist (Grenades, Rockets & Nukes)**: Hurls explosive clusters and calls down devastating air strikes (*Frag Grenade, Landmine, Rocket Launcher, Carpet Bomb, Tactical Nuke*).
3. **The Combat Engineer (Automated Turrets & Drones)**: Deploys automated sentry guns, Tesla pylons, and pilots armored mech suits (*Gun Turret, Support Drone, Tesla Coil, Mech Suit*).
4. **The Heavy Ordnance Cannoneer (Artillery & Railguns)**: Fires armor-piercing anti-materiel shells and penetrating rail beams (*Heavy Shell, Cryo Shell, Rail Shot, Annihilator Beam*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **30 Separate Bullet & Rocket Projectiles**: Over 37% of the entire class was comprised of 30 near-identical bullet or rocket buttons (*Pistol Shot, Burst Fire, Shotgun Blast, Piercing Shot, Snipe, Rapid Fire, Spread Shot, Buckshot, Magnum, Full Auto, Heavy Shot, Twin Pistols, Hollow Point, Explosive Rounds, Minigun Fury, Hand Cannon, Grenade, Frag Grenade, Sticky Bomb, Rocket, Rocket Barrage, Mega Rocket, Heavy Round, Incendiary Shell, Gatling Burst, Cryo Shell, Cluster Rockets*).
* **14 Separate Turret & Drone Buttons**: Redundant deployable gadgets (*Gun Turret, Flame Turret, Drone, Tesla Coil, Rocket Turret, Combat Drones, Cryo Turret, Bomb Drones, Death Machine, Turret Fortress, Mortar Team, Drone Swarm, Tesla Grid, War Machine*).
* **6 Separate Mines**: Minor damage tweaks on proximity landmines (*Landmine, Mine Field, Chain Reaction, Bear Trap, Gravity Mine, Shock Mine*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Siege Artillery)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Siege Artillery!**
> 
> * **The Class Ultimate (`Siege Artillery` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; paints the target zone with a flare beacon, calling down an overwhelming orbital artillery barrage that shakes the screen and incinerates all enemy ranks.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Orbital Strike / Death Laser*, *Tactical Nuke*, *Mech Suit*, and *Annihilator Beam* are standard high-tier spenders/transformations.
>   * They cost mana/ammo, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                       GUNNER ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Firearms     │ Tree 1: Explosives   │ Tree 2: Engineering  │ Tree 3: Heavy Ord    │
 │ (Ballistics & Minigun│ (Demolitions & Mines)│ (Turrets & Robotics) │ (Artillery & Railgun)│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Burst Fire (Gen)  │ 1. Frag Grenade (Gen)│ 1. Gun Turret (Sentry│ 1. Heavy Shell (Pierc│
 │ 2. Shotgun Blast(Cone│ 2. Landmine (Trap)   │ 2. Support Drone     │ 2. Incendiary Shell  │
 │ 3. Piercing Shot(Line│ 3. Smoke Grenade(Fog)│ 3. Repair Kit (Heal) │ 3. Flak Vest (Armor) │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Snipe (Execution) │ 4. Rocket Launcher   │ 4. Tesla Coil Pylon  │ 4. Concussion Grenade│
 │ 5. Full Auto (Channel│ 5. Napalm Zone (Fire)│ 5. Shield Generator  │ 5. Cryo Shell (Freeze│
 │ 6. Magnum Execution  │ 6. Sticky Bomb       │ 6. Overclock (Buff)  │ 6. Rail Shot (Beam)  │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Gunslinger Stance │ 7. Carpet Bomb       │ 7. Laser Fence Bar   │ 7. Drone Swarm Pod   │
 │ 8. Minigun Fury      │ 8. Rocket Barrage    │ 8. Mech Suit (Piloted│ 8. Saturation Bomb   │
 │ 9. Death Laser (Cap) │ 9. Tactical Nuke(Cap)│ 9. War Machine (Cap) │ 9. Annihilator Beam  │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Firearms (Ballistics, Pistols & Miniguns)
* **Row 0 (Lv 1 - Burst Fire, Point-Blank Buckshot & Rifles)**:
  1. **Burst Fire / Pistol Shot** (Lv 1 · Projectile Generator) — Rapid 3-round burst from sidearms with zero mana cost, generating Heat/Ammo.
  2. **Shotgun Blast / Buckshot** (Lv 1 · Cone Scatter Spender) — Wide cone scatter-shot knocking enemies back and dealing 200% damage at point-blank range.
  3. **Piercing Shot** (Lv 6 · Penetrating Rifle) — High-caliber rifle round piercing through an entire line of enemies, reducing armor by 30%.
* **Row 1 (Lv 12 - Snipers, Full Auto & Heavy Magnums)**:
  4. **Snipe** (Lv 12 · Aimed Precision) — Long-range precision shot with extreme critical strike chance and headshot bonus.
  5. **Full Auto** (Lv 12 · Channeled Machine Gun) — Channeled machine-gun spray laying down continuous suppressing fire across an arc.
  6. **Magnum Execution** (Lv 16 · Execution Shot) — Heavy pistol shot dealing triple damage to enemies below 30% health.
* **Row 2 (Lv 24 - Dual-Wield Gunslinger & Miniguns)**:
  7. **Gunslinger Stance** (Lv 20 · Mobile Buff) — Enables 360-degree mobile dual-wielding while running at full speed for 12s.
  8. **Minigun Fury** (Lv 24 · Rotary Gatling) — Deploys a rotary Gatling gun, ramping up to extreme firing rates over 5 seconds.
  9. **Orbital Death Laser** (Lv 30 · Satellite Capstone) — Designates a target from orbit, calling down an incinerating laser beam sweeping across the arena.

### Tree 1: Explosives (Grenades, Rockets & Demolitions)
* **Row 0 (Lv 1 - Fragmentation & Landmines)**:
  1. **Frag Grenade** (Lv 1 · Lobbed Spender) — Throws a serrated explosive detonating on impact and scattering razor shrapnel.
  2. **Landmine** (Lv 1 · Proximity Mine) — Arms a ground mine that detonates when enemies step close, launching them airborne.
  3. **Smoke Grenade** (Lv 6 · Tactical Fog) — Conceals the Gunner in thick smoke, blinding enemies and breaking target lock-on.
* **Row 1 (Lv 12 - Rockets, Napalm & Sticky Bombs)**:
  4. **Rocket Launcher** (Lv 12 · Heavy Missile) — Fires a high-explosive rocket with direct impact and large splash radius.
  5. **Napalm Zone** (Lv 12 · Flaming Field) — Ignites the ground in sticky napalm, dealing continuous fire damage and slowing enemies.
  6. **Sticky Bomb** (Lv 16 · Timed Charge) — Attaches an explosive charge directly to an enemy, detonating after 3s for massive burst.
* **Row 2 (Lv 24 - Carpet Bombs, Salvos & Tactical Nukes)**:
  7. **Carpet Bomb** (Lv 20 · Corridor Air Strike) — Calls down an artillery barrage across a designated hallway.
  8. **Rocket Barrage** (Lv 24 · Spiral Salvo) — Fires a salvo of 8 micro-missiles in a devastating spiral pattern.
  9. **Tactical Nuke** (Lv 30 · Atomic Capstone) — Calls down a high-yield tactical warhead vaporizing all enemies in the blast radius.

### Tree 2: Engineering (Turrets, Drones & Robotics)
* **Row 0 (Lv 1 - Automated Sentries & Drones)**:
  1. **Automated Gun Turret** (Lv 1 · Sentry Minion) — Deploys a rapid-firing tripod sentry turret engaging approaching enemies within 12m.
  2. **Support Drone** (Lv 1 · Hovering Minion) — Hovering drone that shields the Gunner and zaps nearby attackers with shock lasers.
  3. **Repair Kit / First Aid** (Lv 6 · Emergency Heal) — Restores armor and health, and instantly repairs all active turrets to full health.
* **Row 1 (Lv 12 - Tesla Coils & Energy Shields)**:
  4. **Tesla Coil Pylon** (Lv 12 · Lightning Pylon) — Deploys a high-voltage tower arcing electricity between up to 4 targets.
  5. **Shield Generator** (Lv 12 · Protective Dome) — Projects a protective energy dome deflecting enemy projectiles and granting party armor.
  6. **Overclock** (Lv 16 · Sentry Buff) — Temporarily doubles the fire rate and damage of all active turrets and drones for 8s.
* **Row 2 (Lv 24 - Laser Fences & Mech Suit Piloting)**:
  7. **Laser Fence Barrier** (Lv 20 · Deployable Wall) — Connects two deployed pylons with a high-damage cutting laser beam.
  8. **Mech Suit** (Lv 24 · Piloted Transformation) — Pilots an armored exoskeleton equipped with flamethrowers, miniguns, and rocket pods.
  9. **War Machine / Siege Tank** (Lv 30 · Heavy Tank Capstone) — Deploys an automated heavy siege tank commanding the battlefield with cannon fire.

### Tree 3: Heavy Ordnance (Artillery & Advanced Munitions)
* **Row 0 (Lv 1 - Anti-Materiel Shells & Flak Vests)**:
  1. **Heavy Shell** (Lv 1 · Armor Piercing) — Fires an armor-piercing anti-materiel round knocking down targets.
  2. **Incendiary Shell** (Lv 1 · Ignited Shot) — Rounds that set targets ablaze and leave flaming trails.
  3. **Flak Vest / Scrap Shield** (Lv 6 · Ballistic Armor) — Absorbs incoming ballistic damage and grants knockback immunity.
* **Row 1 (Lv 12 - Concussions, Cryo Shells & Railguns)**:
  4. **Concussion Grenade** (Lv 12 · Stun Lob) — Disorients enemies, stunning them for 2.5s and cancelling enemy skill casting.
  5. **Cryo Shell** (Lv 12 · Flash Freeze) — Freezing artillery round flash-freezing all targets in the impact radius for 3s.
  6. **Rail Shot** (Lv 16 · Penetrating Laser Beam) — Hyper-velocity railgun slug with instantaneous travel time and infinite piercing.
* **Row 2 (Lv 24 - Drone Batteries & Annihilators)**:
  7. **Drone Swarm Pod** (Lv 20 · Kamikaze Battery) — Launches a swarm of 6 kamikaze attack drones that dive-bomb enemies.
  8. **Saturation Bombing** (Lv 24 · Relentless Barrage) — Relentless overhead aerial bombardment shaking the ground for 6s.
  9. **Annihilator Beam** (Lv 30 · Particle Beam Capstone) — Heavy handheld particle beam disintegrating everything in its trajectory.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Firearms (Ballistic Weaponry)
* **Tier 1 (Lv 1 - Foundation)**: *Munitions Expert* (5 ranks) — +7% Ballistic Damage, +3% Firing Rate, +5% Piercing Chance per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Shotgun Blast)**:
  * **Choice A (Sawed-Off Carnage)**: Shotgun pellets inflict severe bleeding and shred 40% of enemy armor at close range.
  * **Choice B (Dragon's Breath Shells)**: Shotgun converts to incendiary fire, setting all targets in the cone ablaze for 6s.
* **Tier 3 (Lv 24 - Synergy)**: *Hair Trigger* (5 ranks) — Scoring a critical hit grants +15% attack speed and +10% move speed for 4s.
* **Tier 4 (Lv 40 - A/B Skill Morph: Snipe)**:
  * **Choice A (Anti-Materiel Heavy Piercer)**: Snipe pierces all enemies, breaks physical shields, and stuns for 2s.
  * **Choice B (Explosive Headshot)**: Killing an enemy with Snipe causes them to explode, dealing 100% of the damage to surrounding foes.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Gatling Overdrive)**: Minigun Fury has zero spin-up time and allows moving at full movement speed while firing.
  * **Choice B (Lead Storm)**: All bullet projectile attacks fire 2 additional rounds per shot.

### Branch 1: Explosives (Demolitions & Pyrotechnics)
* **Tier 1 (Lv 1 - Foundation)**: *Blast Radius* (5 ranks) — +7% Explosive/Fire Damage, +10% AoE Size, +6% Cooldown Reduction per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Frag Grenade)**:
  * **Choice A (Cluster Fragmentation)**: Grenade splits into 4 sub-munitions on impact that bounce and detonate.
  * **Choice B (Cryo Detonator)**: Grenade converts to Cold damage, flash-freezing all caught enemies in ice for 3s.
* **Tier 3 (Lv 24 - Synergy)**: *Chain Detonation* (5 ranks) — Explosive kills trigger secondary explosions dealing 35% damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Rocket Launcher)**:
  * **Choice A (Thermal Heatseeker)**: Rockets automatically home in on the highest-health target on the screen.
  * **Choice B (Bunker Buster)**: Rockets deal 150% more damage against elite monsters and bosses, and destroy barriers.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Artillery Commander)**: Carpet Bomb and Rocket Barrage have their cooldowns reduced by 50% and double missile count.
  * **Choice B (Nuke on Demand)**: Tactical Nuke's cooldown is reduced to 45s and leaves permanent radiation dealing ticking damage.

### Branch 2: Engineering (Tactical Robotics)
* **Tier 1 (Lv 1 - Foundation)**: *Tinkerer's Guild* (5 ranks) — +8% Turret Damage, +8% Turret Durability, +1 Max Active Turret per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Automated Gun Turret)**:
  * **Choice A (Flame & Rocket Pod)**: Turrets are equipped with flamethrowers and secondary micro-missile launchers.
  * **Choice B (Tesla Shock Tower)**: Turrets convert to electrical towers that shock up to 4 enemies with chain lightning.
* **Tier 3 (Lv 24 - Synergy)**: *Drone Escort* (5 ranks) — Each active turret or drone grants the Gunner +4% Armor and +2% damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Support Drone)**:
  * **Choice A (Combat Drone Escort)**: Spawns 2 Combat Drones that continuously fire laser rifles at your target.
  * **Choice B (Medical Shield Drone)**: Drone projects a continuous 5% max HP shield and clears negative status effects every 4s.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Turret Army)**: Max turret limit increased from 2 to 4; placing a turret triggers an instant Overclock buff.
  * **Choice B (Apex Mech Suit)**: Mech Suit duration doubled; while piloting, you gain 100% Armor and infinite ammo rockets.

---

## 6. Build Archetypes & Character Variety
1. **Gunslinger / Minigunner**: Firearms branch with Sawed-Off Carnage + Gatling Overdrive + Lead Storm. Pure bullet-hose DPS.
2. **Heavy Artillery Demolitionist**: Explosives branch with Cluster Fragmentation + Thermal Heatseeker + Artillery Commander.
3. **Robotics Sentry Commander (Marauder)**: Engineering branch with Tesla Shock Tower + Drone Escort + Turret Army.
4. **Cryo / Railgun Sniper**: Anti-Materiel Heavy Piercer with Cryo Detonator for infinite piercing freeze-shots.
