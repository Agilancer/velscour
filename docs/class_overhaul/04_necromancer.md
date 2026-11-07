# Necromancer: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & Diablo II / III ARPG Pillars
In classic ARPG design (*Diablo II* and *Diablo III: Rise of the Necromancer*), the Necromancer commands life, death, bone, and soul. The gameplay loop centers on **corpse generation and expenditure**, **tactical minion army command**, and **catastrophic area amplification via curses**.

### The Four Iconic Archetypes:
1. **The Bone Caster (Physical Ballistics & Prisons)**: Pierces ranks of enemies with calcified spikes (*Bone Spear, Bone Armor, Bone Spirit, Bone Prison*). Relies on positioning and physical burst.
2. **The Corpse & Blood Mage (Sanguine Leech & Rupture)**: Weaponizes fallen foes and vitality (*Corpse Explosion, Blood Drain, Blood Nova, Exsanguinate*). Converts health into damage and regenerates from gore.
3. **The Legion Commander (Summoner & Overlord)**: Commands an undead vanguard (*Skeleton Warriors, Skeletal Mages, Golem, Revive, Army of the Dead*). Sits safely behind a moving wall of bone.
4. **The Plague & Curse Hexer (Affliction & Debuffs)**: Paralyzes enemy defenses with debilitating curses (*Amplify Damage, Decrepify, Poison Nova, Life Tap, Doom*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **31 Summon Buttons**: Over 38% of the entire class was summon buttons! Tree 3 alone had 16 separate skeleton types (*Reaver, Crossbowman, Pyromancer, Spearman, Coffin Guard, Plaguecaller, Bone Bishop, Jailer, Gravedigger, Stormcaller, Knell Ringer, Berserker, Standard-Bearer, Pyre Inquisitor, Druid, Reaper King*). Players literally could not fit offensive spells on their bar!
* **Redundant Corpse Skills**: Too many minor variations of exploding corpses (*Corpse Explosion, Corpse Lance, Grim Harvest, Necrotic Bloom, Soul Harvest*).
* **12 Separate Curse Buttons**: Minor variations of slow and weaken that should be consolidated into the 4 iconic curses (*Amplify Damage, Decrepify, Life Tap, Terror/Confuse*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Grave Eruption)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Grave Eruption!**
> 
> * **The Class Ultimate (`Grave Eruption` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; tears open an abyssal rift that erupts with bone pikes and dark spirits to obliterate the screen.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Lich Form* (archlich transformation), *Blood Apocalypse* (sanguine screen rupture), and *Doom* are regular high-tier spenders/transformations.
>   * They cost mana/corpses, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                     NECROMANCER ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Bone & Blood │ Tree 1: Summoning    │ Tree 2: Curses/Plague│ Tree 3: Skeletal Leg │
 │ (Caster & Siphon)    │ (Minions & Golems)   │ (Affliction & Decay) │ (Formations & Elites)│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Bone Spear (Spende│ 1. Raise Skeletons   │ 1. Amplify Damage    │ 1. Skeletal Reaver   │
 │ 2. Bone Armor (Def)  │ 2. Skeletal Mages    │ 2. Decrepify (Slow)  │ 2. Coffin Guard(Tank)│
 │ 3. Blood Drain (Beam)│ 3. Summon Golem      │ 3. Poison Nova (DoT) │ 3. Mend Bones (Heal) │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Corpse Explosion  │ 4. Dark Pact (Buff)  │ 4. Life Tap (Leech)  │ 4. Bone Standard     │
 │ 5. Blood Nova (AoE)  │ 5. Revive (Spectres) │ 5. Plague Cloud (Zone│ 5. Stormcaller Mage  │
 │ 6. Bone Wall/Prison  │ 6. Unholy Command    │ 6. Terror / Confuse  │ 6. Chained Jailer    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Bone Spirit (Home)│ 7. Ghoul Horde       │ 7. Plague Spear      │ 7. Pyre Inquisitor   │
 │ 8. Bone Storm (Orbit)│ 8. Army of Dead (Mass│ 8. Pestilence Aura   │ 8. Grave Warband     │
 │ 9. Exsanguinate (Cap)│ 9. Lich Form (Cap)   │ 9. Doom (Capstone)   │ 9. Reaper King (Cap) │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Bone & Blood (Physical Artillery & Vitality Siphon)
* **Row 0 (Lv 1 - Bone Piercing & Defense)**:
  1. **Bone Spear** (Lv 1 · Projectile Spender) — **The Classic D2 Spender**: Launches a high-velocity bone missile piercing through an entire line of enemies.
  2. **Bone Armor** (Lv 1 · Defensive Buff) — Surrounds the Necromancer in an orbit of spinning bones, absorbing physical damage and retaliating when struck.
  3. **Blood Drain** (Lv 6 · Channeled Beam) — Siphons life force from an enemy, healing the Necromancer while dealing continuous shadow/blood damage.
* **Row 1 (Lv 12 - Corpse Combustion & Blood Novas)**:
  4. **Corpse Explosion** (Lv 12 · Corpse Spender) — **The Iconic ARPG Corpse Killer**: Detonates targeted corpses, dealing 50% physical and 50% fire area damage based on enemy monster HP.
  5. **Blood Nova** (Lv 12 · Radial Spender) — Expands an erupting ring of blood, dealing heavy damage to surrounding enemies and leeching vitality.
  6. **Bone Prison / Wall** (Lv 16 · Solid Barrier) — Encases a target or line of enemies in an impenetrable cage of interlocking ribcages.
* **Row 2 (Lv 24 - Seeking Spirits & Blood Rupture)**:
  7. **Bone Spirit** (Lv 20 · Homing Missile) — Conjures a spectral skull that relentlessly tracks high-health targets, detonating for massive single-target damage.
  8. **Bone Storm** (Lv 24 · Whirling Orbit) — Swirling cyclone of razor-sharp bone fragments tearing through surrounding enemies for 8 seconds.
  9. **Exsanguinate / Blood Apocalypse** (Lv 30 · Screen Wipe Capstone) — Sanguine cataclysm that ruptures all nearby enemies, dealing massive damage and creating a sea of corpses.

### Tree 1: Summoning (The Undead Horde & Constructs)
* **Row 0 (Lv 1 - Baseline Skeletons & Golem)**:
  1. **Raise Skeleton Warriors** (Lv 1 · Melee Minions) — Raises up to 6 skeleton warriors with swords and shields to engage enemies in melee.
  2. **Raise Skeletal Mages** (Lv 1 · Ranged Minions) — Raises up to 4 skeleton casters shooting elemental spells (Cold, Fire, Lightning).
  3. **Summon Golem** (Lv 6 · Heavy Construct) — Calls forth a towering golem to serve as a high-health frontline tank.
* **Row 1 (Lv 12 - Minion Commands & Resurrection)**:
  4. **Dark Pact** (Lv 12 · Sacrifice Buff) — Sacrifices a percentage of minion health to grant the party +30% damage and instant mana restoration.
  5. **Revive** (Lv 12 · Elite Resurrect) — Resurrects fallen champion and elite monsters to fight under your command for 60 seconds with their original affixes.
  6. **Unholy Command** (Lv 16 · Direct Attack) — Commands all active minions to focus a target area with +50% movement and attack speed.
* **Row 2 (Lv 24 - Undead Swarms & Lichdom)**:
  7. **Ghoul Horde** (Lv 20 · Swarm Minions) — Summons a temporary pack of 4 frenzy ghouls that leap at targets and shred armor.
  8. **Army of the Dead** (Lv 24 · Mass Summon) — Unearths dozens of skeletons from the earth to charge forward in a wave of devastation.
  9. **Lich Form** (Lv 30 · Form Capstone) — Transforms the Necromancer into a towering Archlich, granting immunity to cold/shadow damage and doubling spell power.

### Tree 2: Curses & Plague (Debuffs, Hexes & Virulence)
* **Row 0 (Lv 1 - The Core D2 Curses)**:
  1. **Amplify Damage** (Lv 1 · Hex Curse) — Afflicts enemies in an area; afflicted targets take **+50% increased Physical damage** from all sources.
  2. **Decrepify** (Lv 1 · Hex Curse) — Cripples enemies, slowing their movement by 50%, attack speed by 50%, and reducing their damage by 30%.
  3. **Poison Nova** (Lv 6 · Expanding Ring) — Emits an expanding ring of virulent emerald poison dealing massive damage over 6 seconds.
* **Row 1 (Lv 12 - Life Siphon & Hallucinatory Panic)**:
  4. **Life Tap** (Lv 12 · Leech Curse) — Afflicts enemies so that any party member or minion striking them immediately heals for 30% of damage dealt.
  5. **Plague Cloud / Miasma** (Lv 12 · Ground Hazard) — Conjures a persistent toxic cloud that chokes enemies and prevents health regeneration.
  6. **Terror / Confuse** (Lv 16 · Crowd Control) — Drives enemies into utter panic, forcing them to flee or turn on their own allies.
* **Row 2 (Lv 24 - Virulent Spikes & Fatal Doom)**:
  7. **Plague Spear** (Lv 20 · Piercing Poison) — Piercing bone spear coated in venom that infects targets and detonates on death.
  8. **Pestilence Aura** (Lv 24 · Spreading Disease) — Passive aura that automatically transfers poison and curses from dying enemies to adjacent foes.
  9. **Doom** (Lv 30 · Execution Capstone) — Places a fatal mark over an elite or boss; after 5 seconds, strikes for catastrophic shadow damage.

### Tree 3: Skeletal Legion (Formations & Specialized Champions)
* **Row 0 (Lv 1 - Elite Vanguard)**:
  1. **Skeletal Reaver Champion** (Lv 1 · Dual-Wield Minion) — Elite skeleton captain with cleaving axes that draws enemy aggro.
  2. **Coffin Guard** (Lv 1 · Heavy Shield Minion) — Tower-shield skeleton that locks down corridors and absorbs frontal projectiles.
  3. **Mend Bones** (Lv 6 · Minion Heal) — Channeled spell restoring 20% health per second to all active minions.
* **Row 1 (Lv 12 - Tactical Banners & Elemental Shock)**:
  4. **Bone Standard-Bearer** (Lv 12 · Aura Minion) — Summons a skeleton carrying a battle standard granting the party +25% attack speed.
  5. **Skeletal Stormcaller** (Lv 12 · Lightning Mage) — High-tier skeleton caster calling down chain lightning strikes.
  6. **Chained Jailer** (Lv 16 · Crowd Control Minion) — Hulking skeleton with hook chains that drag ranged monsters into melee range.
* **Row 2 (Lv 24 - The Undead Warband)**:
  7. **Pyre Inquisitor** (Lv 20 · Fire Knight) — Burning skeleton knight leaving fiery trails that ignite enemies.
  8. **Grave Warband** (Lv 24 · Tactical Unit) — Summons an organized platoon of 5 skeletal shock troops for 20s.
  9. **Reaper King** (Lv 30 · Avatar Capstone) — Calls forth the ancient Reaper King wielding a giant scythe that executes low-health enemies.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Bone & Blood (Calcified Destruction)
* **Tier 1 (Lv 1 - Foundation)**: *Ossified Strength* (5 ranks) — +7% Physical Damage, +8% Bone Skill Damage, +15 Max Life per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Bone Spear)**:
  * **Choice A (Splintering Shards)**: Bone Spear shatters on impact into 5 razor bone shards that pierce adjacent targets.
  * **Choice B (Blood Lance Siphon)**: Bone Spear converts to pure Blood damage, heals for 6% of damage dealt, and costs 10% less mana.
* **Tier 3 (Lv 24 - Synergy)**: *Gore Mastery* (5 ranks) — Corpse Explosion radius increased by 40%; explosions generate blood orbs that restore 5% health on touch.
* **Tier 4 (Lv 40 - A/B Skill Morph: Bone Storm)**:
  * **Choice A (Skeletal Whirlwind)**: Bone Storm also surrounds your Golem and active Skeleton Warriors.
  * **Choice B (Vampiric Maelstrom)**: Bone Storm converts to pure Blood damage and grants 12% life leech to the Necromancer.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Lord of Bones)**: Bone Spear and Bone Spirit critical strike chance increased by 30%; Bone Prison becomes indestructible.
  * **Choice B (Crimson Bloodbath)**: Casting Blood Nova consumes 10% of current HP to deal 300% damage and triggers mini corpse explosions.

### Branch 1: Summoning (The Overlord)
* **Tier 1 (Lv 1 - Foundation)**: *Commander of the Dead* (5 ranks) — +8% Minion Damage, +8% Minion Health, +2 Max Skeletons per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Summon Golem)**:
  * **Choice A (Blood Titan)**: Golem absorbs 35% of all damage dealt to the Necromancer and leeches health back to the player.
  * **Choice B (Iron Thorns Golem)**: Golem reflects 250% of damage taken as physical thorns and taunts bosses every 5 seconds.
* **Tier 3 (Lv 24 - Synergy)**: *Soul Harvest* (5 ranks) — Each active minion grants the Necromancer +3% Armor and +2% Damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Skeletal Mages)**:
  * **Choice A (Elemental Triad)**: Skeletal Mages alternate between Frost (freezing) and Lightning (chaining) spells.
  * **Choice B (Pyre Mages)**: Skeletal Mages fire explosive fireballs leaving pools of burning ground.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Undead Overlord)**: Max minion caps doubled; minions gain +50% attack speed and revive automatically upon death.
  * **Choice B (Bone Colossus)**: Golem transforms into a towering Bone Colossus with screen-wide cleave attacks.

### Branch 2: Curses & Plague (The Affliction Master)
* **Tier 1 (Lv 1 - Foundation)**: *Virulence* (5 ranks) — +8% Poison/Shadow Damage, +15% Curse Duration, +15% Curse Area per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Poison Nova)**:
  * **Choice A (Contagion Burst)**: Enemies killed while affected by Poison Nova detonate in a new Poison Nova.
  * **Choice B (Withering Venom)**: Poison Nova slows affected enemies by 60% and reduces their attack damage by 40%.
* **Tier 3 (Lv 24 - Synergy)**: *Dual Malediction* (5 ranks) — You can apply two curses simultaneously to the same target.
* **Tier 4 (Lv 40 - A/B Skill Morph: Decrepify)**:
  * **Choice A (Wither & Decay)**: Decrepify strips 45% of enemy armor and elemental resistances.
  * **Choice B (Soul Siphon)**: Decrepify restores 2% mana and health per second for every enemy affected.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Plague King)**: Poison damage ticks 50% faster; poisoned enemies take 30% increased damage from minions.
  * **Choice B (Mark of Doom)**: Doom's countdown reduced from 5s to 3s and guaranteed to critically strike.

---

## 6. Build Archetypes & Character Variety
1. **The Classic Fishymancer (Army + Corpse Explosion)**: Skeletons engage the pack, Amplify Damage doubles physical vulnerability, and one kill triggers a screen-wide Corpse Explosion chain reaction.
2. **Bone Spear Sniper**: Bone & Blood branch with Splintering Shards + Lord of Bones. Piercing physical missiles shred hallways.
3. **Blood Nova Tank**: Blood Mage build with Blood Titan + Vampiric Maelstrom + Crimson Bloodbath. Frontline vitality drainer.
4. **Poison & Curse Master**: Curses branch with Contagion Burst + Dual Malediction + Plague King for rapid-ticking damage-over-time.
