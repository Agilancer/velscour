# Lancer: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
The Lancer is the definitive chivalric heavy jouster and phalanx commander. The combat loop revolves around **Kinetic Momentum and Lance Charges**, **spinning Tower Shield barriers**, and **commanding sworn knight retinues**. A true Lancer lowers their lance, accelerates to supersonic speeds, and impales through enemy battle lines, knocking aside entire hordes.

### The Four Iconic Archetypes:
1. **The High-Speed Jouster (Momentum & The Lance Charge)**: Builds speed to deliver devastating single-target impales and burning or freezing rush impacts (*Lance Thrust, Lance Charge, Lance Barrage, Sunspear*).
2. **The Bulwark Phalanx (Tower Shields & Bastions)**: Deploys heavy defensive orbits, shield slams, and impenetrable barricades (*Tower Shield Orbit, Shield Slam, Shield Throw, Bastion of Ten, Living Fortress*).
3. **The Chivalric Commander (Knight Order & Banners)**: Commands specialized knights, inspires allies with war banners, and leaps into battle (*Squire Companion, Knight Captain, War Banner, Knights of the Round*).
4. **The Radiant Solar Paragon (Ascendant Light & Sunlances)**: Harnesses radiant holy sunlight, launching volleys of sunlances and calling down lancestorms (*Radiant Thrust, Sunlance Volley, Spear Rain, Solar Lancestorm*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **The 7 Dash / Charge Problem (Primary Prompt Culprit)**: Lancer had seven separate dash charge skills (*Lance Charge, Inferno Charge, Comet Charge, Blizzard Charge, Omni-Charge, Glorious Charge, Lightspear Charge*). Every few levels, a player was offered another dash that was merely an earlier dash with fire, ice, or light slapped on it! This completely wrecked hotbar management.
* **12 Separate Thrusts**: An overwhelming number of near-identical lance jabs (*Lance Thrust, Flame Lance, Frost Lance, Thunder Lance, Glacial Pike, Void Lance, Venom Pike, Lance Barrage, Blood Lance, Lance of Ruin, Radiant Thrust*).
* **8 Separate Shield Orbits**: Redundant spinning shields (*Tower Shield, Storm Bulwark, Burning Aegis, Frost Rampart, Holy Citadel, Shield Storm, Bastion of Ten, Prism Guard*).
* **13 Knight Summons**: Separate buttons for squires, knights, and captains (*Squire Knight, Lance Knight, Flame Templar, Frost Warden, Knight Captain, Storm Paladin, Knights of the Round, Grand Marshal, Order of the Sun*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Gungnir's Fall)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Gungnir's Fall!**
> 
> * **The Class Ultimate (`Gungnir's Fall` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; calls down a colossal celestial lightning lance from the heavens that detonates on impact, slowing and wiping the screen.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Prismatic Lance* (screen laser), *Living Fortress* (total party immunity), and *Hero's Ascension* are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                       LANCER ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Energy Lance │ Tree 1: Bulwark      │ Tree 2: Knight Order │ Tree 3: Radiant Lance│
 │ (Jousting & Thrusts) │ (Tower Shield & Def) │ (Banners & Retinue)  │ (Solar Holy Light)   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Lance Thrust (Gen)│ 1. Tower Shield Orbit│ 1. Squire Companion  │ 1. Radiant Thrust    │
 │ 2. Lance Charge(DASH)│ 2. Shield Slam(Stun) │ 2. Rallying Cry(Heal)│ 2. Shield Disc(Bounce│
 │ 3. Lance Barrage     │ 3. Shield Wall(Brace)│ 3. War Banner (Buff) │ 3. Sunlance Volley   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Lance of Light    │ 4. Shield Throw(Ricoc│ 4. Knight Captain    │ 4. Holy Bastion(Wall)│
 │ 5. Sweeping Cleave   │ 5. Bulwark Nova      │ 5. Hold the Line(Aura│ 5. Phalanx Leap(Jump)│
 │ 6. Sunspear (Throw)  │ 6. Spear Wall Barrier│ 6. Shout of Valor    │ 6. Spear Rain (AoE)  │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Storm Lance Beam  │ 7. Ironclad Juggernau│ 7. Valiant Leap      │ 7. Solar Lancestorm  │
 │ 8. Lance of Ruin     │ 8. Bastion of Ten    │ 8. Knights of Round  │ 8. Paragon Form(Buff)│
 │ 9. Prismatic Lance   │ 9. Living Fortress   │ 9. Hero Ascension(Cap│ 9. Final Lance (Cap) │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Energy Lance (Jousting, Thrusts & Beams)
* **Row 0 (Lv 1 - The Core Thrust & THE Unified Charge)**:
  1. **Lance Thrust** (Lv 1 · Melee Generator) — Fast basic reach thrust with 1.5m range and high physical weapon coefficient.
  2. **Lance Charge** (Lv 1 · **The Definitive Dash Spender**) — **The Core Mobility Tool**: Lowers lance, gains massive acceleration, and rushes forward, knocking back enemies and closing the gap. *(All 7 old dashes are consolidated here and customized via Talents!)*
  3. **Lance Barrage** (Lv 6 · Channeled Thrusts) — Rapid multi-thrust barrage striking 4 times in a tight forward line.
* **Row 1 (Lv 12 - Holy Beams, Cleaves & Thrown Sunspears)**:
  4. **Lance of Light** (Lv 12 · Piercing Laser) — Penetrating holy energy beam fired from the spearhead in a straight line.
  5. **Sweeping Cleave** (Lv 12 · 180-Degree Arc) — Wide polearm sweep knocking surrounding enemies away.
  6. **Sunspear Throw** (Lv 16 · Piercing Javelin) — Hurls a radiant spear projectile that pierces and pins enemies to the ground for 2s.
* **Row 2 (Lv 24 - Storm Beams & Prismatic Lance)**:
  7. **Storm Lance Beam** (Lv 20 · Channeled Lightning) — Channeled high-voltage beam discharging chain lightning to adjacent foes.
  8. **Lance of Ruin** (Lv 24 · Explosive Slam) — Heavy overhead impale causing an explosive area shockwave on impact.
  9. **Prismatic Lance** (Lv 30 · Laser Capstone) — Channels a colossal screen-wide prismatic laser that incinerates everything in its path for 5s.

### Tree 1: Bulwark (Tower Shields & Fortifications)
* **Row 0 (Lv 1 - Orbiting Shields, Slams & Bracing)**:
  1. **Tower Shield Orbit** (Lv 1 · Defensive Orbit) — Conjures a heavy spinning tower shield orbiting the Lancer that blocks attacks and shreds melee attackers.
  2. **Shield Slam** (Lv 1 · Stun Spender) — Smashes frontal enemies with the tower shield, stunning and interrupting them for 2s.
  3. **Shield Wall / Brace** (Lv 6 · Defensive Stance) — Raises defense into an unyielding stance, boosting armor and block rate by 50% for 15s.
* **Row 1 (Lv 12 - Captain America Throws & Spear Barricades)**:
  4. **Shield Throw** (Lv 12 · Ricochet Buckler) — Hurls a heavy buckler that ricochets between 4 targets before returning.
  5. **Bulwark Nova** (Lv 12 · Ground Slam) — Slams shield onto the ground, emitting a concussive shockwave that dazes enemies.
  6. **Spear Wall Barrier** (Lv 16 · Deployable Wall) — Plants a barricade of defensive pikes blocking enemy movement and impaling monsters.
* **Row 2 (Lv 24 - Juggernauts & Bastion of Ten)**:
  7. **Ironclad Juggernaut** (Lv 20 · Fortified Form) — Fortified transformation buff making the Lancer immune to knockbacks and crowd control.
  8. **Bastion of Ten** (Lv 24 · 5-Shield Orbit) — Upgrades shield orbit to 5 heavy hovering shields forming a protective cage.
  9. **Living Fortress** (Lv 30 · Invulnerable Capstone) — Massive defensive ultimate rendering the Lancer invulnerable and absorbing all party damage for 10s.

### Tree 2: Knight Order (Banners, Knights & Chivalry)
* **Row 0 (Lv 1 - Squires, Rallies & Banners)**:
  1. **Squire Companion** (Lv 1 · Retinue Minion) — Summons a loyal squire knight that fights alongside you and taunts foes.
  2. **Rallying Cry** (Lv 1 · Party Recovery) — Restores a burst of 25% party health and stamina.
  3. **War Banner** (Lv 6 · Deployable Standard) — Plants a battle standard radiating an aura of +25% damage and +20% move speed.
* **Row 1 (Lv 12 - Knight Captains & Shouts of Valor)**:
  4. **Knight Captain** (Lv 12 · Heavy Cavalry) — Summons an elite heavy cavalry knight with wide cleaving attacks.
  5. **Hold the Line** (Lv 12 · Defensive Aura) — Defensive party aura increasing physical armor by 40% and magic resistance by 25%.
  6. **Shout of Valor** (Lv 16 · Concussive Shout) — Stuns surrounding enemies with a commanding battle shout.
* **Row 2 (Lv 24 - Valiant Leaps & Knights of the Round)**:
  7. **Valiant Leap** (Lv 20 · Armored Plunge) — Leaps into the air in full plate armor, crashing down with a holy shockwave.
  8. **Knights of the Round** (Lv 24 · Platoon Summon) — Summons a formation of 4 chivalric knights to overwhelm enemies.
  9. **Hero's Ascension** (Lv 30 · Grand Marshal Capstone) — Ascends into a Grand Marshal avatar with radiant wings and doubled damage for 20s.

### Tree 3: Radiant Lance (Ascendant Solar & Holy Phalanx)
* **Row 0 (Lv 1 - Solar Thrusts & Discs)**:
  1. **Radiant Thrust** (Lv 1 · Sweeping Holy) — Sweeping holy thrust leaving a consecrated slash mark.
  2. **Shield Disc** (Lv 1 · Bouncing Light) — Bouncing disc of solar energy blinding foes.
  3. **Sunlance Volley** (Lv 6 · Fan of Light) — Fires 5 seeking light spears in a forward fan.
* **Row 1 (Lv 12 - Holy Bastions & Phalanx Leaps)**:
  4. **Holy Bastion** (Lv 12 · Luminous Wall) — Luminous light wall that incinerates passing undead and demons.
  5. **Phalanx Leap** (Lv 12 · Solar Jump) — Radiant jump leaving a pillar of blinding light upon landing.
  6. **Spear Rain** (Lv 16 · Falling Lances) — Calls down a deluge of falling holy spears over an area.
* **Row 2 (Lv 24 - Solar Lancestorms & Paragon)**:
  7. **Solar Lancestorm** (Lv 20 · Continuous Deluge) — Bombards the arena with continuous radiant lances for 5 seconds.
  8. **Paragon Form** (Lv 24 · Solar Armor) — Radiant transformation granting holy damage aura and +35% block chance.
  9. **Final Lance** (Lv 30 · Sunbeam Capstone) — Supreme sunbeam lance piercing through the center of the earth.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)
*This is the core solution to the 5-dash problem: The Lancer keeps **ONE** Lance Charge on their hotbar, and customizes its behavior through the Talent Tree!*

### Branch 0: Energy Lance (The Jousting Master)
* **Tier 1 (Lv 1 - Foundation)**: *Pike Mastery* (5 ranks) — +7% Lance Physical/Holy Damage, +10% Thrust Reach, +5% Weapon Coefficient per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Lance Charge - Element & Trail Choice)**:
  * **Choice A (Inferno Comet Charge)**: *Restores Inferno & Comet Charge functionality!* Lance Charge leaves a blazing trail of fire that burns enemies for 6s and causes an explosive fire detonation at the end of the rush.
  * **Choice B (Glacial Phalanx Charge)**: *Restores Blizzard Charge functionality!* Lance Charge converts to Cold damage, flash-freezes the first target hit, and grants a Frost Shield absorbing damage.
* **Tier 3 (Lv 24 - Synergy)**: *Kinetic Momentum* (5 ranks) — Moving or charging builds Momentum stacks (+4% damage per 5 meters moved, up to +40%).
* **Tier 4 (Lv 40 - A/B Skill Morph: Lance Charge - Apex Behavior Choice)**:
  * **Choice A (Omni-Assault Flurry)**: *Restores Omni-Charge functionality!* Lance Charge gains 3 rapid consecutive charges and resets its cooldown immediately on a killing blow.
  * **Choice B (Thunderhead Juggernaut)**: Lance Charge cannot be interrupted, breaks through walls/barriers, and calls down continuous lightning strikes along its path.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Piercing Singularity)**: All Lance thrusts and beams pierce infinitely and pull struck enemies toward the impact point.
  * **Choice B (God of the Joust)**: Striking an enemy with Lance Charge after moving 10+ meters deals a guaranteed 300% critical hit and stuns for 3s.

### Branch 1: Bulwark (Tower Shield & Bastion)
* **Tier 1 (Lv 1 - Foundation)**: *Aegis Mastery* (5 ranks) — +8% Armor, +2% Block Chance, +4% Max Life per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Tower Shield Orbit)**:
  * **Choice A (Burning Bulwark)**: Orbiting shields ignite into flames, damaging adjacent enemies and absorbing fire attacks.
  * **Choice B (Storm Aegis)**: Orbiting shields crackle with electricity, zapping enemies and deflecting ranged projectiles.
* **Tier 3 (Lv 24 - Synergy)**: *Shield Discipline* (5 ranks) — Blocking an attack triggers a free Shield Slam counter-attack and heals for 3% HP.
* **Tier 4 (Lv 40 - A/B Skill Morph: Shield Throw)**:
  * **Choice A (Ricochet Barrage)**: Shield Throw gains +5 extra bounces and inflicts concussive stuns.
  * **Choice B (Phalanx Barrier)**: Shield Throw plants down at the target location, generating a stationary dome protecting allies.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Unbreakable Fortress)**: While Tower Shield Orbit is active, you take 30% reduced damage from all sources; block cap raised to 85%.
  * **Choice B (Living Citadel)**: Bastion of Ten summons 10 massive spectral shields that automatically block 50% of all incoming attacks for the whole party.

### Branch 2: Knight Order (The Chivalric Commander)
* **Tier 1 (Lv 1 - Foundation)**: *Commander's Presence* (5 ranks) — +8% Retinue Damage, +15% Banner Aura Radius, +5% Party Health per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Squire Companion)**:
  * **Choice A (Flame Templar)**: Converts Squire into a Flame Templar with a two-handed sword, cleaving in fire and setting enemies ablaze.
  * **Choice B (Frost Warden)**: Converts Squire into a Frost Warden with a tower shield that taunts bosses and slows attackers.
* **Tier 3 (Lv 24 - Synergy)**: *Battlefield Tactician* (5 ranks) — When standing near your War Banner, your cooldowns tick 30% faster.
* **Tier 4 (Lv 40 - A/B Skill Morph: War Banner)**:
  * **Choice A (Banner of Kings)**: War Banner increases party critical strike chance by 20% and critical damage by 50%.
  * **Choice B (Iron Standard)**: War Banner reduces all damage taken by party members inside by 35% and renders them immune to crowd control.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Grand Marshal's Guard)**: Knights of the Round summons 6 knights instead of 4, and they gain your full Tower Shield and Charge abilities.
  * **Choice B (Heroic Inspiration)**: Whenever you or a summoned knight critically strikes, the entire party gains 15% attack speed and 5% life leech for 6s.

---

## 6. Build Archetypes & Character Variety
1. **High-Speed Jousting Lancer**: Energy Lance branch with Inferno Comet Charge + Omni-Assault Flurry + God of the Joust. The definitive charge-and-shred playstyle with **ONE** button.
2. **Glacial Bulwark Tank**: Bulwark branch with Glacial Phalanx Charge + Storm Aegis + Unbreakable Fortress. Virtually unkillable tank with crowd-control freezes.
3. **Chivalric Commander**: Knight Order branch with Flame Templar + Banner of Kings + Grand Marshal's Guard. Leads an unstoppable army of armored knights.
4. **Radiant Solar Paragon**: Combines Energy Lance with Radiant Lance tree for holy beams, sunlance volleys, and solar lancestorms.
