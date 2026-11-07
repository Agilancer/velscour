# Barbarian: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & Diablo II / III ARPG Pillars
In the storied tradition of the *Diablo II* and *Diablo III Barbarian*, this class is the unbridled embodiment of raw physical might, bloodlust, and seismic devastation. The combat loop revolves around **Rage generation and spending**, aggressive mobility (*Furious Charge, Leap*), bone-rattling battlefield control (*Ground Stomp, Seismic Slam*), commanding warcries (*Battle Orders, War Cry*), and the legendary mobile blender: **Whirlwind**.

### The Four Iconic Archetypes:
1. **The Whirlwind Berserker (Spin-to-Win)**: Relentless mobile blender moving through enemy packs while dealing continuous physical and bleeding damage (*Whirlwind, Bloodlust, Wrath of the Berserker*).
2. **The Frenzy Juggernaut (Dual-Wield Boss Shredder)**: Escalating attack and movement speed flurries that turn the Barbarian into a chainsaw (*Bash, Frenzy, Double Swing, Executioner*).
3. **The Earthshaker (Seismic & Area Control)**: Slams the earth with titanic force to knock enemies airborne, create chasms, and throw boulders (*Ground Stomp, Leap Attack, Fissure, Earthquake*).
4. **The Warlord / Warcry Commander (Shouts & Ancients)**: Inspires party members, terrifies foes, and summons the ancestral council (*Battle Orders, War Cry, Call of the Ancients*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **5 Separate Whirlwind Skills**: A player had *Whirlwind, Rampage, Eternal Whirlwind, Red Whirl, and Endless Rage* taking up space across multiple trees! These were minor stat or elemental reskins of the exact same spin.
* **7 Fissures / Earth Cracks**: *Fissure, Seismic Slam, Magma Rift, Landslide, Worldsplitter, Torn Earth, and Crimson Tide* were all straight-line ground cracks.
* **4 Repetitive Shouts & 4 Roar Stuns**: Redundant buffs (*Shout, Battle Orders, Battle Command, Battle Trance*) and redundant stun novas (*War Cry, Thunder Shout, Earsplitter, Warlord's Roar*).
* **3 Leaps and 3 Charges**: Duplicate jumps (*Leap, Leap Attack, Raging Leap*) and dashes (*Furious Charge, Seismic Step, Gore Rush*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Cataclysm)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Cataclysm!**
> 
> * **The Class Ultimate (`Cataclysm` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 Rage**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; shatters the earth in a devastating tectonic eruption of magma and rock with heavy knockback.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Wrath of the Berserker* (Akarat-style super state), *Undying Rage* (death prevention cheat-death), and *Worldsplitter* are standard high-tier spenders/transformations.
>   * They cost Rage, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                      BARBARIAN ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Rage         │ Tree 1: Warcries     │ Tree 2: Earthshaker  │ Tree 3: Bloodrage    │
 │ (Berserker & Whirl)  │ (Shouts & Support)   │ (Seismic & Gravity)  │ (Bleed & Gore)       │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Bash (Generator)  │ 1. Battle Orders(Life│ 1. Ground Stomp (Stun│ 1. Rending Chop (Gene│
 │ 2. Frenzy (Dual-Wield│ 2. Howl (Fear)       │ 2. Leap (Mobility)   │ 2. Bloodletting Nova │
 │ 3. Furious Charge    │ 3. Taunt (Aggro)     │ 3. Rock Toss (Lob)   │ 3. Crimson Cleave    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Whirlwind (Spender│ 4. War Cry (Stun Nov)│ 4. Fissure (Chasm)   │ 4. Blood Howl (Leech)│
 │ 5. Cleave (Wide Arc) │ 5. Battle Command    │ 5. Seismic Step      │ 5. Blood Totem (Effig│
 │ 6. Double Throw (Axe)│ 6. Grim Ward (Totem) │ 6. Earthquake (AoE)  │ 6. Massacre (Flurry) │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Executioner (Exec)│ 7. Rallying Cry(Heal)│ 7. Avalanche (Boulde│ 7. Axe Rain (Skyfall)│
 │ 8. Bloodlust (Buff)  │ 8. Call of Ancients  │ 8. Stone Skin (Def)  │ 8. Bloodbath (Pool)  │
 │ 9. Wrath of Berserk  │ 9. Undying Rage (Cap)│ 9. Worldsplitter(Cap)│ 9. Avatar of Carnage │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Rage (The Berserker & Whirlwind)
* **Row 0 (Lv 1 - Rage Builders & Mobility)**:
  1. **Bash** (Lv 1 · Melee Generator) — Heavy bludgeoning blow knocking foes back and generating 15 Rage per strike.
  2. **Frenzy** (Lv 1 · Dual-Wield Generator) — Rapid alternating strikes: each hit grants +15% Attack Speed and +10% Movement Speed (stacks up to 5 times).
  3. **Furious Charge** (Lv 6 · Dash Mobility) — Rushes forward with extreme force, trampling through monsters and breaking crowd control.
* **Row 1 (Lv 12 - Whirlwind & Weapons)**:
  4. **Whirlwind** (Lv 12 · Channeled Spender) — **The Legendary ARPG Spender**: Spins continuously across the battlefield while maintaining full movement control, hitting all surrounding foes.
  5. **Cleave** (Lv 12 · Melee Arc) — Wide 180-degree sweep dealing heavy physical damage and building double Rage on multi-hits.
  6. **Double Throw** (Lv 16 · Ranged Axes) — Hurls two flying axes with high velocity that pierce and ricochet off walls.
* **Row 2 (Lv 24 - Executions & Super State)**:
  7. **Executioner** (Lv 20 · Heavy Overhead) — Brutal execution strike dealing 300% weapon damage to enemies below 30% health.
  8. **Bloodlust** (Lv 24 · Combat Buff) — Enter a blood-frenzy granting 30% attack speed, 20% critical chance, and 10% life leech for 12s.
  9. **Wrath of the Berserker** (Lv 30 · Form Capstone) — **The Ultimate ARPG State**: Barbarian grows in size, gains 50% damage, 20% dodge, and total immunity to crowd control for 20s.

### Tree 1: Warcries (Vocal Commands & Ancestral Spirits)
* **Row 0 (Lv 1 - The Classic D2 Shouts)**:
  1. **Battle Orders** (Lv 1 · Party Buff) — **The Legendary D2 Warcry**: Powerful roar increasing Maximum Health and Maximum Stamina/Mana by 35% for all party members for 60s.
  2. **Howl** (Lv 1 · Crowd Control) — Demoralizing roar causing non-elite enemies in an area to flee in terror for 4s.
  3. **Taunt** (Lv 6 · Single-Target Aggro) — Calls out an enemy, forcing them to charge into melee while reducing their attack damage by 30%.
* **Row 1 (Lv 12 - Concussive Shouts & Totems)**:
  4. **War Cry** (Lv 12 · Stun Nova) — Concussive sonic shout emitting a violent shockwave that stuns all surrounding enemies for 2.5s.
  5. **Battle Command** (Lv 12 · Party Skill Boost) — Inspiring battle shout granting +1 to all active skills and +15% damage to all allies for 60s.
  6. **Grim Ward** (Lv 16 · Corpse Totem) — Erects a terrifying bone effigy from a slain monster, continuously horrifying and weakening enemies within 12 meters.
* **Row 2 (Lv 24 - Rallying & The Ancestors)**:
  7. **Rallying Cry** (Lv 20 · Party Cleanse) — Restores 30% health to the party, clears all crowd control, and grants immunity for 4s.
  8. **Call of the Ancients** (Lv 24 · Iconic Summon) — Summons the legendary barbarian ancestors (Talic with Whirlwind, Korlic with Leap Attack, Madawc with Double Throw) to fight for 25s.
  9. **Undying Rage** (Lv 30 · Cheat-Death Capstone) — For 8 seconds, the Barbarian cannot be reduced below 1 HP; dealing damage during this state heals for 20% of damage dealt.

### Tree 2: Earthshaker (Seismic Devastation & Leaps)
* **Row 0 (Lv 1 - Stomps & Airborne Leaps)**:
  1. **Ground Stomp** (Lv 1 · Area Stun) — Slams the ground with immense weight, stunning all nearby enemies for 3s and generating 25 Rage.
  2. **Leap Attack** (Lv 1 · Airborne Mobility) — **The Classic D2 Jump**: Leaps high into the air and crashes down onto the target point, knocking enemies down.
  3. **Rock Toss / Boulder** (Lv 6 · Lobbed Projectile) — Digs up a colossal boulder and hurls it forward; rolls through ranks of monsters, crushing and knocking them down.
* **Row 1 (Lv 12 - Tectonic Chasms & Earthquakes)**:
  4. **Fissure** (Lv 12 · Ground Chasm) — Splits the earth in a jagged line forward, dealing heavy damage and launching enemies into the air.
  5. **Seismic Step** (Lv 12 · Stomping Dash) — Forward dash leaving shattered ground that slows and trips enemies.
  6. **Earthquake** (Lv 16 · Ground Hazard) — Violent tremors shake a massive zone for 6 seconds, repeatedly staggering enemies and dealing ticking physical damage.
* **Row 2 (Lv 24 - Avalanches & World-Splitting)**:
  7. **Avalanche** (Lv 20 · Overhead Rockfall) — Calls down a rain of jagged boulders from above, crushing the target zone with concussive blows.
  8. **Stone Skin** (Lv 24 · Defensive Armor) — Encases the Barbarian in living rock, granting +80% Armor and 100% Thorns reflection.
  9. **Worldsplitter** (Lv 30 · Tectonic Capstone) — Massive earth-cleaving blow opening a catastrophic chasm that swallows standard monsters and ruptures bosses.

### Tree 3: Bloodrage (Visceral Bleeding & Carnage)
* **Row 0 (Lv 1 - Rending Flesh)**:
  1. **Rending Chop** (Lv 1 · Bleed Generator) — Savage axe chop applying a stacking bleed effect over 5 seconds.
  2. **Bloodletting Nova** (Lv 1 · Sanguine Burst) — Explodes in a ring of razor bone and blood, leeching health from struck foes.
  3. **Crimson Cleave** (Lv 6 · Rupture Spender) — Wide swing that consumes active bleeds to deal instant burst damage.
* **Row 1 (Lv 12 - Blood Totems & Massacres)**:
  4. **Blood Howl** (Lv 12 · Sanguine Roar) — Roar granting 15% life on hit and increasing physical bleed intensity by 40%.
  5. **Blood Totem** (Lv 12 · Sacrificial Effigy) — Plants a blood totem that pulses bleed damage to nearby enemies and redirects 20% of player damage taken.
  6. **Massacre** (Lv 16 · Target Flurry) — Flurry of 6 frenzied strikes against a single target with escalating critical strike chance.
* **Row 2 (Lv 24 - Bloodbaths & Avatar of Carnage)**:
  7. **Axe Rain** (Lv 20 · Skyfall Artillery) — Rains bloody axes from above across a wide corridor.
  8. **Bloodbath** (Lv 24 · Sanguine Pool) — Creates a boiling lake of blood that empowers the Barbarian (+30% damage) while melting enemy armor.
  9. **Avatar of Carnage** (Lv 30 · Rampage Capstone) — Sanguine transformation granting immense 25% lifesteal, 50% attack speed, and making every melee hit cleave.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Rage (The Whirlwind & Berserker Master)
* **Tier 1 (Lv 1 - Foundation)**: *Furious Momentum* (5 ranks) — +7% Physical Damage, +2 Rage on hit, +3% Move Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Whirlwind)**:
  * **Choice A (Dust Devils & Tornadoes)**: Whirlwind spawns roaming tornadoes that travel outward and seek enemies for 40% weapon damage.
  * **Choice B (Blood Funnel / Vampiric Whirl)**: Whirlwind pulls all enemies in a 10m radius inward, converts to Blood damage, and leeches 8% life.
* **Tier 3 (Lv 24 - Synergy)**: *Weapon Mastery* (5 ranks) — +8% Critical Strike Damage, +3% Bleed Chance, +4% Armor Penetration per rank.
* **Tier 4 (Lv 40 - A/B Skill Morph: Furious Charge)**:
  * **Choice A (Battering Ram - Merciless Assault)**: Furious Charge deals 150% more damage and refunds its cooldown if it hits 3 or more enemies.
  * **Choice B (Dreadnought Molten Trail)**: Furious Charge leaves an ignited ground trail burning enemies for 6s and granting +30% attack speed.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Wrath Unleashed)**: Wrath of the Berserker gains permanent uptime as long as you maintain above 75 Rage.
  * **Choice B (Titanic Cleaver)**: Every 3rd melee attack triggers a 360-degree shockwave dealing 250% weapon damage.

### Branch 1: Warcries (The Chieftain Commander)
* **Tier 1 (Lv 1 - Foundation)**: *Vocal Resonance* (5 ranks) — +15% Warcry Duration, +15% Warcry Area, +5% Max Health per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: War Cry)**:
  * **Choice A (Thunderclap Stun)**: War Cry deals 100% more damage and stunned enemies take +25% increased damage from all sources for 5s.
  * **Choice B (Intimidating Roar)**: War Cry strips enemy buffs and reduces enemy damage dealt by 45% for 6s.
* **Tier 3 (Lv 24 - Synergy)**: *Leader of the Pack* (5 ranks) — All Warcries grant their full bonuses to all party members and summoned allies.
* **Tier 4 (Lv 40 - A/B Skill Morph: Call of the Ancients)**:
  * **Choice A (The Immortal Council)**: Ancients remain until killed (permanent summons) and absorb 30% of damage dealt to the Barbarian.
  * **Choice B (Ancestral Cataclysm)**: Ancients leap down with an explosive slam and immediately cast Whirlwind and Earthquake on spawn.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Chieftain's Authority)**: Shouts and Warcries have their cooldowns reduced by 50% and generate full 100 Rage upon cast.
  * **Choice B (Last Stand)**: When dropping below 25% HP, immediately trigger an automatic Undying Rage and heal 50% HP (2m CD).

### Branch 2: Earthshaker (Tectonic Devastation)
* **Tier 1 (Lv 1 - Foundation)**: *Tectonic Impact* (5 ranks) — +8% Earth/Physical Damage, +15% Stun Duration, +6% Armor per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Leap Attack)**:
  * **Choice A (Seismic Crater / Iron Impact)**: Leap creates an earthen crater upon landing that stuns all foes and launches razor spikes.
  * **Choice B (Death from Above)**: Leap cooldown resets immediately if landing kills any monster; applies massive bleed.
* **Tier 3 (Lv 24 - Synergy)**: *Earthen Fortitude* (5 ranks) — Taking damage builds Fortify stacks, granting up to +40% Armor and damage reduction.
* **Tier 4 (Lv 40 - A/B Skill Morph: Fissure)**:
  * **Choice A (Tectonic Splinter)**: Fissure branches into 3 diverging cracks covering a wide 90-degree fan.
  * **Choice B (Magma Chasm)**: Fissure converts to Fire damage, opening bubbling volcanic vents that slow and burn enemies.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Mountain King)**: Stone Skin makes the Barbarian immune to knockback, freeze, and stun, and reflects 200% thorns.
  * **Choice B (Aftershock Cascade)**: Earthquake and Ground Stomp trigger secondary cascading aftershocks 2s later dealing 100% bonus damage.

---

## 6. Build Archetypes & Character Variety
1. **The Classic Whirlwind Wastes Barbarian**: Rage branch with Dust Devils + Battering Ram + Wrath Unleashed. Non-stop mobile spinning death.
2. **Earthshaker Leapquake Barbarian**: Earthshaker branch with Seismic Crater + Tectonic Splinter + Aftershock Cascade. Constant aerial leaping and earthquake triggering.
3. **Frenzy Boss Executioner**: Frenzy + Executioner + Bloodlust + Titanic Cleaver. Dual-wield meatgrinder shredding single targets.
4. **Warlord Commander Support**: Warcries branch with The Immortal Council + Leader of the Pack + Chieftain's Authority. The ultimate tank and team buffer.
