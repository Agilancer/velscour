# Dragoon: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by iconic polearm masters and high-flying aerial combatants (such as the *FFXIV Dragoon*, *Diablo III's Falling Sword*, and *Norse Valkyries*), the Dragoon is the supreme master of verticality, piercing polearm reach, and draconic flame. The gameplay loop centers on **leaping into the clouds to evade lethal boss mechanics**, crashing down with cataclysmic plunge impacts, and channeling the fiery fury of ancestral dragons.

### The Four Iconic Archetypes:
1. **The Aerial Plunger (Sky Dives & High Velocity)**: Soars above the battlefield, becoming untargetable before plunging down with meteor force (*Jump, Aerial Strike, High Jump, Comet Dive*).
2. **The Piercing Spearman (Thrusts & Distance Spacing)**: Masters precision spear-tip spacing and high-velocity linear thrusts (*Lance Jab, Twin Thrust, Spiral Lance, Gungnir*).
3. **The Wyrmblood Dragon-Morph (Flame Breaths & Dragon Heart)**: Channels genuine dragon fire, hardened scales, and draconic transformations (*Dragon Breath, Wyrm Scale, Draconic Roar, Dragonsoul*).
4. **The Spearstorm Commander (Phalanx & Tactical Rain)**: Controls battlefield space with falling spear barrages and impenetrable pike phalanxes (*Triune Spearfall, Spear Vortex, Sovereign Spearstorm*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **12 Separate Leap Dives**: A staggering 12 different variations of jumping into the air (*Jump, Aerial Strike, Dragon Dive, High Jump, Comet Dive, Stardive, Storm Dive, Dragonfall, Cyclone Dive, Vaulting Reprisal, Sunfall Lance, Cataclysm Descent*). The player had 4-5 different jump buttons on their hotbar that all functioned nearly identically!
* **6 Elemental Dragon Breaths**: 6 near-identical channeled breath cones (*Dragon Breath, Frost Breath, Storm Breath, Venom Breath, Inferno Breath, Prismatic Breath*).
* **10 Redundant Spear Melees**: Minor damage adjustments on basic spear jabs (*Lance Jab, Twin Thrust, Sweeping Lance, Piercing Thrust, Impale, Lance Flurry, Cross Thrust, Infinite Thrust, Flame Lash*).
* **Fallback Talents**: Dragoon was falling back to Paladin talents in `talents.js`! It had zero dedicated talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Skyfall Dive)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Skyfall Dive!**
> 
> * **The Class Ultimate (`Skyfall Dive` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; launches to orbit and delivers an apocalyptic celestial lightning plunge that obliterates the target area.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Gungnir / Lance of Longinus* (line-piercing spear), *Dragonfall Ascension* (form plunge), and *Dragonsoul* (draconic metamorphosis) are standard high-tier spenders/cooldowns.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                       DRAGOON ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Lancework    │ Tree 1: Sky Dive     │ Tree 2: Wyrmblood    │ Tree 3: Spearstorm   │
 │ (Spearmanship & Flur)│ (Aerial & Plunges)   │ (Dragon Magic/Form)  │ (Phalanx & Rains)    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Lance Jab (Reach) │ 1. Jump (Iconic Leap)│ 1. Dragon Breath     │ 1. Triune Spearfall  │
 │ 2. Twin Thrust (Burst│ 2. Wind Step (Dash)  │ 2. Wyrm Scale (Armor)│ 2. Rallying Standard │
 │ 3. Sweeping Lance    │ 3. Dragon Dive (Fire)│ 3. Blood Pact (Buff) │ 3. Phalanx Breaker   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Spiral Lance (Line│ 4. Feather Fall(Glide│ 4. Wyvern Familiar   │ 4. Storm of Barbs    │
 │ 5. Skewer (Pin Dash) │ 5. Comet Dive (Heavy)│ 5. Draconic Roar     │ 5. Spear Vortex (Vac)│
 │ 6. Lance Flurry(Chan)│ 6. Updraft Cyclone   │ 6. Flame Lash (Tail) │ 6. Thunderhead Pierce│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Lance Barrier(Def)│ 7. Storm Dive (Shock)│ 7. Wyrm Coil (Orbit) │ 7. Sunfall Lance     │
 │ 8. Spear Rain (AoE)  │ 8. Skyward Sweep(Lift│ 8. Bloodfire Nova    │ 8. Aegis of the Wyrm │
 │ 9. Gungnir (Capstone)│ 9. Dragonfall (Cap)  │ 9. Dragonsoul (Cap)  │ 9. Sov. Spearstorm   │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Lancework (Spearmanship & Precision Reach)
* **Row 0 (Lv 1 - Spacing & Armor Penetration)**:
  1. **Lance Jab** (Lv 1 · Melee Generator) — Fast thrust with extended melee reach, ignoring 30% of enemy physical armor.
  2. **Twin Thrust** (Lv 1 · Double Jab Spender) — Rapid double-strike piercing into a single target for massive physical burst.
  3. **Sweeping Lance** (Lv 6 · Melee Cleave) — 180-degree sweep hitting all foes in a wide frontal arc and knocking them back.
* **Row 1 (Lv 12 - Drilling Missiles & Pinning Charges)**:
  4. **Spiral Lance** (Lv 12 · Piercing Projectile) — Hurls a spiraling drilling spear that pierces all enemies in a line, dragging them backward.
  5. **Skewer / Spearstep** (Lv 12 · Piercing Dash) — Forward dash impaling the first enemy hit and carrying them along the path.
  6. **Lance Flurry** (Lv 16 · Channeled Barrage) — Channeled rapid-fire thrust barrage delivering 8 strikes into a frontal cone.
* **Row 2 (Lv 24 - Defensive Parries & Legendary Lances)**:
  7. **Lance Barrier** (Lv 20 · Defensive Orbit) — Twirls the polearm rapidly overhead, deflecting all incoming projectiles for 4s.
  8. **Spear Rain** (Lv 24 · Area AoE) — Calls down a rain of sharp lances impaling enemies and creating rough terrain.
  9. **Gungnir / Lance of Longinus** (Lv 30 · Piercing Capstone) — Legendary divine spear that shatters all shields and pierces through obstacles and terrain.

### Tree 1: Sky Dive (Aerial Supremacy & Plunges)
* **Row 0 (Lv 1 - The Iconic Jump)**:
  1. **Jump** (Lv 1 · Airborne Leap) — **The Definitive Dragoon Skill**: Vaults high into the heavens, becoming completely untargetable for 1.5s, then crashes down onto the target point with a concussive shockwave.
  2. **Wind Step** (Lv 1 · Evasive Dash) — Agile horizontal pole-vault dash leaving a tailwind that grants +30% movement speed.
  3. **Dragon Dive** (Lv 6 · Fire Plunge) — Airborne plunge engulfed in flames, detonating in an expanding ring of fire upon landing.
* **Row 1 (Lv 12 - Hang-Time & Meteoric Crashes)**:
  4. **Feather Fall** (Lv 12 · Gliding Stance) — Aerial buff granting 50% slower descent, +30% dodge chance, and doubling plunge impact damage.
  5. **Comet Dive** (Lv 12 · Heavy Impact) — Long-range supersonic dive crashing down like an asteroid, knocking all enemies airborne.
  6. **Updraft Cyclone** (Lv 16 · Vertical Vortex) — Creates a rising whirlwind that launches light monsters into the air, setting them up for aerial strikes.
* **Row 2 (Lv 24 - Lightning Dives & Form Plunges)**:
  7. **Storm Dive** (Lv 20 · Lightning Plunge) — Plunges with an electrified spear, calling down a circle of chain lightning strikes upon impact.
  8. **Skyward Sweep** (Lv 24 · Upward Launch) — Vaulting upward strike that launches both the Dragoon and target enemy into the clouds.
  9. **Dragonfall Ascension** (Lv 30 · Form Capstone) — Ascends on fiery dragon wings, unleashing 3 consecutive aerial plunges across the arena.

### Tree 2: Wyrmblood (Dragon Metamorphosis & Breath)
* **Row 0 (Lv 1 - Dragon Breath & Hardened Scales)**:
  1. **Dragon Breath** (Lv 1 · Channeled Cone) — Channeled cone of intense dragon flame incinerating enemies in front.
  2. **Wyrm Scale** (Lv 1 · Carapace Buff) — Hardens scales, increasing Armor by 60% and Fire/Elemental resistance by 35%.
  3. **Blood Pact** (Lv 6 · Sanguine Frenzy) — Sacrifices 10% health to enter a dragon fury: +40% Attack Speed and 8% Life Leech.
* **Row 1 (Lv 12 - Drakes & Draconic Roars)**:
  4. **Wyvern Familiar** (Lv 12 · Flying Companion) — Summons a small flying drake that attacks alongside you and spits fireballs.
  5. **Draconic Roar** (Lv 12 · Concussive Roar) — Terrifies nearby foes, reducing their physical armor and spell resistance by 30%.
  6. **Flame Lash** (Lv 16 · Tail Swipe) — Sweeping tail whip attack dealing fire damage and knocking down surrounding enemies.
* **Row 2 (Lv 24 - Spirit Coils & Elder Dragon Form)**:
  7. **Wyrm Coil** (Lv 20 · Orbiting Spirits) — Orbiting fiery dragon spirits circling the Dragoon that parry attacks and burn melee foes.
  8. **Bloodfire Nova** (Lv 24 · Radial Burst) — Sanguine draconic burst dealing heavy bleed and fire damage to all surrounding enemies.
  9. **Dragonsoul / Elder Wyrm** (Lv 30 · Transformation Capstone) — Transforms into an Elder Wyrm avatar with flying mobility, double breath size, and 50% damage reduction.

### Tree 3: Spearstorm (Tactical Polearms & Phalanx)
* **Row 0 (Lv 1 - Spearfall & Banners)**:
  1. **Triune Spearfall** (Lv 1 · Ground Impact) — Calls down 3 spectral lances pinning targets to the floor for 2s.
  2. **Rallying Standard** (Lv 1 · Deployable Banner) — Plants a battle standard boosting party Attack Power by 25% and Move Speed by 20%.
  3. **Phalanx Breaker** (Lv 6 · Heavy Thrust) — Heavy charging thrust that breaks through enemy shields and knocks down heavily armored monsters.
* **Row 1 (Lv 12 - Barbs & Whirling Vortices)**:
  4. **Storm of Barbs** (Lv 12 · Shrapnel Nova) — Explodes in a radial burst of razor spearheads flying in all directions.
  5. **Spear Vortex** (Lv 12 · Vacuum Cyclone) — Spinning polearm cyclone vacuuming all enemies into melee range.
  6. **Thunderhead Pierce** (Lv 16 · Lightning Thrust) — Channeled thrust channeling lightning bolts through struck enemies.
* **Row 2 (Lv 24 - Sunfall & Sovereign Storm)**:
  7. **Sunfall Lance** (Lv 20 · Solar Plunge) — Brilliant radiant plunge that blinds all targets in a wide 12m radius.
  8. **Aegis of the Wyrm** (Lv 24 · Barrier Shroud) — Impenetrable draconic ward shielding the party from lethal burst damage for 6s.
  9. **Sovereign Spearstorm** (Lv 30 · Rain Capstone) — Massive battlefield-wide rain of thousands of spears piercing all targets for 8s.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Lancework (The Piercing Master)
* **Tier 1 (Lv 1 - Foundation)**: *Pike Precision* (5 ranks) — +7% Polearm Damage, +4% Armor Penetration, +10% Melee Reach per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Skewer / Spearstep)**:
  * **Choice A (Sonic Skewer)**: Spearstep passes through all enemies, dealing +100% damage and leaving a vacuum vortex along its path.
  * **Choice B (Impaling Pin)**: Spearstep pins the target to the wall or ground, stunning them for 3s and applying severe bleed.
* **Tier 3 (Lv 24 - Synergy)**: *Sweet-Spot Mastery* (5 ranks) — Strikes landed with the tip of the spear deal +35% bonus critical damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Spiral Lance)**:
  * **Choice A (Giga Drill)**: Spiral Lance gains 50% larger size, drills through enemies continuously, and shreds 50% armor.
  * **Choice B (Tri-Spear Volley)**: Hurls 3 Spiral Lances in a fan spread that converge at the cursor location.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Gungnir's Execution)**: Gungnir always critically strikes and immediately resets all Lancework cooldowns on kill.
  * **Choice B (Phantom Phalanx)**: All spear thrusts create ghost spear projections that strike a second time for 60% damage.

### Branch 1: Sky Dive (Aerial Supremacy)
* **Tier 1 (Lv 1 - Foundation)**: *High Altitude* (5 ranks) — +8% Dive Damage, +0.2s Hang-Time Invulnerability, +5% Move Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Jump - Fire vs Ice)**:
  * **Choice A (Meteor Plunge - Fire)**: Jump impact area increased by 80%, deals Fire damage, and leaves burning magma craters for 6s.
  * **Choice B (Glacial Stardive - Ice)**: Jump converts to Cold damage, flash-freezing all enemies in the landing zone solid for 2.5s.
* **Tier 3 (Lv 24 - Synergy)**: *Terminal Velocity* (5 ranks) — Successfully landing from any Dive grants +30% Attack Speed and +40% Move Speed for 6s.
* **Tier 4 (Lv 40 - A/B Skill Morph: Storm Dive)**:
  * **Choice A (Chain Lightning Crash)**: Landing triggers 6 chain lightning arcs that bounce through nearby enemies.
  * **Choice B (Thunderclap Stun)**: Landing creates an ear-splitting concussive blast stunning all enemies for 3s.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Dragon Sovereign - Reset on Kill)**: Killing an enemy with any Dive ability immediately resets Jump cooldown; no cooldown on boss/elite staggers.
  * **Choice B (Cataclysmic Wings)**: Landing from a Dive creates a radial shockwave dealing 300% weapon damage and pulling enemies inward.

### Branch 2: Wyrmblood (The Draconic Shifter)
* **Tier 1 (Lv 1 - Foundation)**: *Draconic Heritage* (5 ranks) — +7% Fire/Elemental Damage, +6% Max HP, +5% Health Regen per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Dragon Breath)**:
  * **Choice A (Inferno Torment)**: Dragon Breath deals 50% more damage and leaves lingering fire zones that burn for 6s.
  * **Choice B (Frostfire Beam)**: Dragon Breath converts to Frostfire, slowing enemies by 50% and melting 40% of their armor.
* **Tier 3 (Lv 24 - Synergy)**: *Molten Scales* (5 ranks) — Taking damage releases a burst of draconic fire and builds Dragon Fury stacks.
* **Tier 4 (Lv 40 - A/B Skill Morph: Wyvern Familiar)**:
  * **Choice A (Elder Wyvern Brood)**: Summons 2 Elder Wyverns that breathe lightning and protect the Dragoon.
  * **Choice B (Blood Drake Companion)**: Wyvern leeches health and transfers all stolen vitality directly to the Dragoon.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (True Wyrmform)**: Dragonsoul transformation lasts 100% longer, increases size by 40%, and grants infinite breath channeling.
  * **Choice B (Draconic Detonation)**: Striking bleeding enemies with fire attacks triggers explosive Draconic Detonations for 200% damage.

---

## 6. Build Archetypes & Character Variety
1. **Sky Dive Bombardment Dragoon**: Jump + Meteor Plunge + Dragon Sovereign. Infinite aerial combat resetting cooldowns on kill.
2. **Draconic Pyromancer / Flamethrower**: Dragon Breath + Inferno Torment + True Wyrmform. Continuous mobile breath incineration.
3. **Piercing Spear Master**: Lancework + Sonic Skewer + Gungnir's Execution for hyper-precise spacing and armor penetration.
4. **Frostfire Valkyrie Tank**: Combines Glacial Stardive with Wyrm Scales and Aegis of the Wyrm for maximum crowd control and durability.
