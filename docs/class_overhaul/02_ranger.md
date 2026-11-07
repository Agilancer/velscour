# Ranger: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & Diablo II / III ARPG Pillars
In classic ARPG design (*Diablo II Amazon* and *Diablo III Demon Hunter*), the Ranger is the undisputed master of ranged ballistics, tactical field control, and lethal beasts. The class thrives on high movement speed, screen-sweeping arrow sprays, high-stakes kiting, and lethal ambush setups.

### The Four Iconic Archetypes:
1. **The Bowazon / Sharpshooter (Physical & Cold Artillery)**: Extreme-range precision and screen-clearing arrow spreads (*Quick Shot, Multishot, Piercing Arrow, Strafe*). Relies on positioning, armor penetration, and chill/freeze kiting.
2. **The Beastmaster (Primal Companion Commander)**: Fights alongside loyal animal companions (*Wolf Pack, Hunting Hawk, Grizzly Bear*). Commands beasts to tank, draw aggro, and execute wounded elites.
3. **The Shadow Trapper (Area Control & Demolitions)**: Controls choke points with automated mechanical death (*Spike Trap, Caltrops, Smoke Screen, Automated Ballista*). Turns the battlefield into a minefield.
4. **The Celestial Starshot (Astral Ballistics & Singularities)**: Cosmic archery harnessing starlight and gravitational wells (*Starlight Arrow, Nova Shot, Black Hole Arrow, Falling Stars*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **26 Arrow Projectiles with No Distinct Purpose**: Over 30% of the class was comprised of slight color and element variations of arrows (*Quick Shot, Piercing Arrow, Multishot, Fire Arrow, Guided Arrow, Strafe, Ice Arrow, Exploding Arrow, Lightning Arrow, Penetrating Shot, Barrage, Poison Arrow, Volley, Cluster Arrow, Sniper Shot, Elemental Arrow, Starlight Arrow, Meteor Arrow, Nova Arrow, Comet Volley, Cosmic Barrage, Black Hole Arrow, Supernova Arrow, Galaxy Shot*). A player had to change hotbar skills just to swap from fire to ice!
* **12 Separate Pet Buttons**: Clogged the skill book with minor animal summons (*Wolf, Raven, Hawk, Boar, Bear, Spirit Wolf, Viper, Dire Wolf, Behemoth, Phoenix, Astral Beast, Star Beast*).
* **8 Traps**: Overlapping trigger traps that should be customizable variants of 3 fundamental trap roles (Bleed/Slow, Fire/Burst, Automated Ballista).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Storm of Shafts)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Storm of Shafts!**
> 
> * **The Class Ultimate (`Storm of Shafts` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; unleashes an overwhelming skyfall of barbed arrows and hunting raptors.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Arrow Storm* (channeled 360-degree arrow vortex), *Avatar of the Wild* (ferocious beast transformation), and *Death Machine* (automated Gatling ballista) are regular high-tier spenders/cooldowns.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                      RANGER ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Marksmanship │ Tree 1: The Wilds    │ Tree 2: Traps/Tricks │ Tree 3: Starshot     │
 │ (Bow & Ballistics)   │ (Beasts & Nature)    │ (Utility & Stealth)  │ (Astral Archery)     │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Quick Shot (Gen)  │ 1. Summon Wolf (Pet) │ 1. Spike Trap (Bleed)│ 1. Starlight Arrow   │
 │ 2. Multishot (Spender│ 2. Entangling Roots  │ 2. Caltrops (Evasive)│ 2. Lunar Flare       │
 │ 3. Piercing Arrow    │ 3. Poison Ivy Shot   │ 3. Smoke Screen (Fog)│ 3. Constellation Shot│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Guided Arrow      │ 4. Summon Hawk (Pet) │ 4. Explosive Trap    │ 4. Nova Arrow        │
 │ 5. Strafe (Channel)  │ 5. Summon Bear (Pet) │ 5. Decoy (Taunt)     │ 5. Solar Flare (AoE) │
 │ 6. Rain of Arrows    │ 6. Hunter's Call     │ 6. Lightning Pylon   │ 6. Black Hole Arrow  │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Sniper Shot (Exec)│ 7. Heart of the Oak  │ 7. Shadow Step (Tele)│ 7. Falling Stars     │
 │ 8. Windrunner (Buff) │ 8. Stampede (Corridor│ 8. Cluster Minefield │ 8. Orion's Bow       │
 │ 9. Arrow Storm (Cap) │ 9. Avatar of Wild(Cap│ 9. Death Machine(Cap)│ 9. Supernova Barrage │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Marksmanship (Bow, Precision & Ballistics)
* **Row 0 (Lv 1 - Core Ballistic Toolkit)**:
  1. **Quick Shot** (Lv 1 · Projectile/Generator) — Rapid basic shot with zero mana cost. Generates Focus/Stamina and builds attack speed stacks.
  2. **Multishot** (Lv 1 · Projectile/Cone Spender) — Fires a wide cone of 5 razor-tipped arrows hitting all advancing enemies.
  3. **Piercing Arrow** (Lv 6 · Projectile/Line) — High-velocity arrow that pierces through all enemies in a straight line with 100% chance.
* **Row 1 (Lv 12 - Channeled Volleys & Homing)**:
  4. **Guided Arrow** (Lv 12 · Homing Projectile) — Enchanted arrow that curves in mid-air to track and strike high-value targets.
  5. **Strafe** (Lv 12 · Channeled Flurry) — Channeled rapid-fire barrage spraying dozens of arrows across surrounding targets while moving at 50% speed.
  6. **Rain of Arrows** (Lv 16 · Ground AoE) — Shoots a skyward volley that rains arrows onto a designated area for 4 seconds, heavily slowing enemies.
* **Row 2 (Lv 24 - Sniper Execution & Capstone)**:
  7. **Sniper Shot** (Lv 20 · Precision Execution) — Heavily aimed single-target arrow dealing massive critical damage; deals 250% damage to targets above 80% HP or below 25% HP.
  8. **Windrunner** (Lv 24 · Combat Buff) — Increases Movement Speed by 40%, Dodge Chance by 30%, and eliminates movement penalties while shooting.
  9. **Arrow Storm** (Lv 30 · Rain/Capstone) — Fires a majestic storm of spiraling arrows in all directions, hitting every enemy on screen.

### Tree 1: The Wilds (Companion Beasts & Primal Nature)
* **Row 0 (Lv 1 - Companion & Entanglement)**:
  1. **Summon Wolf Companion** (Lv 1 · Beast Pet) — Calls forth a loyal hunting wolf that lunges at enemies, draws aggro, and howls to boost party crit chance.
  2. **Entangling Roots** (Lv 1 · Ground Control) — Thorny brambles burst from the earth, immobilizing enemies and causing them to bleed.
  3. **Poison Ivy Shot** (Lv 6 · Projectile/DoT) — Shoots a venomous thorn applying high poison damage over 6 seconds and slowing targets.
* **Row 1 (Lv 12 - Aerial Recon & Frontline Tank)**:
  4. **Summon Hawk / Raven** (Lv 12 · Flying Pet) — Aerial companion that periodically dives into enemies to blind them and reveal their weak spots (+25% damage taken).
  5. **Summon Great Bear** (Lv 12 · Heavy Beast) — Massive frontline bear that stomps the ground to stun foes and absorbs 30% of damage taken by the Ranger.
  6. **Hunter's Call** (Lv 16 · Roar Buff) — Inspiring battle cry granting all pets and allies +35% Attack Speed and 10% Life Leech for 10s.
* **Row 2 (Lv 24 - Nature Auras & Primal Behemoth)**:
  7. **Heart of the Oak** (Lv 20 · Nature Aura) — Radiates a soothing primal aura increasing party Maximum Health by 30% and Health Regeneration.
  8. **Ghost Stampede** (Lv 24 · Corridor Trample) — Summons a phantom stampede of spirit beasts trampling down an entire hallway, knocking down enemies.
  9. **Avatar of the Wild** (Lv 30 · Form Capstone) — Transforms into an unstoppable Primal Beast avatar: melee claws, 80% armor increase, and immunity to crowd control.

### Tree 2: Traps & Tricks (Mechanical Demolitions & Stealth)
* **Row 0 (Lv 1 - Trapping Fundamentals)**:
  1. **Spike Trap** (Lv 1 · Proximity Trap) — Deploys a spring-loaded trap that impales the first enemy to step on it, causing heavy bleeding.
  2. **Caltrops** (Lv 1 · Evasive Mobility) — Backflips away while scattering razor caltrops that slow pursuing enemies by 60%.
  3. **Smoke Screen** (Lv 6 · Defensive Fog) — Drops a smoke canister granting 2 seconds of total invisibility, breaking enemy aggro and granting 100% crit on the next shot.
* **Row 1 (Lv 12 - Explosives & Decoys)**:
  4. **Explosive Trap** (Lv 12 · Fire Mine) — Sets a proximity charge that triggers a fiery shrapnel explosion, igniting all nearby enemies.
  5. **Decoy** (Lv 12 · Mechanical Dummy) — Deploys a clockwork replica that taunts all nearby enemies into attacking it before self-destructing.
  6. **Lightning Pylon Trap** (Lv 16 · Electric Pylon) — Deploys a Tesla coil pylon that periodically arcs chain lightning between up to 4 targets.
* **Row 2 (Lv 24 - Shadow Step & Automated Turret)**:
  7. **Shadow Step** (Lv 20 · Blink/Teleport) — Instantly steps through the shadows behind a target, dealing a guaranteed critical dagger strike.
  8. **Cluster Minefield** (Lv 24 · Trap Cluster) — Scatters 5 proximity mines in a wide circle around the Ranger.
  9. **Death Machine (Automated Ballista)** (Lv 30 · Deployable Capstone) — Deploys an automated Gatling ballista that automatically targets and shreds approaching monsters for 20s.

### Tree 3: Starshot (Astral Bow & Cosmic Physics)
* **Row 0 (Lv 1 - Starlight Ballistics)**:
  1. **Starlight Arrow** (Lv 1 · Astral Projectile) — Fires a luminous arrow leaving a glowing stardust trail that illuminates and damages foes.
  2. **Lunar Flare** (Lv 1 · Piercing Moonbeam) — Concentrated moonbeam blinding enemies and boosting party accuracy.
  3. **Constellation Shot** (Lv 6 · Linking Projectile) — Shoots an arrow that tethers up to 4 enemies together with glowing star chains; damage dealt to one is mirrored.
* **Row 1 (Lv 12 - Stellar Explosions & Gravitational Pull)**:
  4. **Nova Arrow** (Lv 12 · Exploding Star) — Arrow that explodes on impact into 6 radiating micro-stars.
  5. **Solar Flare** (Lv 16 · Radial Sunburst) — Blinding solar flash burning enemies in a 360-degree circle around the Ranger.
  6. **Black Hole Arrow** (Lv 16 · Singularity Shot) — Fires a gravitational singularity that pulls all enemies within 10 meters into its vortex.
* **Row 2 (Lv 24 - Meteorites & Cosmic Climax)**:
  7. **Falling Stars** (Lv 20 · Celestial Bombardment) — Calls down starlight meteorites onto marked enemies.
  8. **Orion's Bow** (Lv 24 · Celestial Buff) — Infuses bow with constellation energy: every shot fired produces 2 phantom duplicate arrows.
  9. **Supernova Barrage** (Lv 30 · Screen Wipe Capstone) — Fires an arrow of pure galactic energy that detonates in a cataclysmic supernova.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Marksmanship (The Bowazon & Sharpshooter)
* **Tier 1 (Lv 1 - Foundation)**: *Eagle Eye* (5 ranks) — +6% Projectile Damage, +3% Attack Speed, +10% Projectile Range per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Piercing Arrow - Cold vs Fire)**:
  * **Choice A (Frost Shard Piercer - The Freezing Arrow)**: Piercing Arrow converts to Cold damage; flash-freezes the first target hit and chills all pierced enemies by 50% for 3s.
  * **Choice B (Incendiary Lance - The Exploding Arrow)**: Piercing Arrow converts to Fire damage; ignites pierced enemies and causes them to detonate on death in a fire splash.
* **Tier 3 (Lv 24 - Synergy)**: *Deadly Precision* (5 ranks) — +8% Critical Strike Damage, +3% Armor Penetration per rank.
* **Tier 4 (Lv 40 - A/B Skill Morph: Multishot)**:
  * **Choice A (Volley of Steel)**: Multishot fires 9 arrows instead of 5, covering a massive 120-degree cone.
  * **Choice B (Cluster Ricochet)**: Multishot arrows ricochet off walls and enemies up to 2 times, shredding clustered indoor packs.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Sniper's Execution)**: Sniper Shot pierces all targets in a line, and resets its cooldown immediately if it kills any target.
  * **Choice B (Strafe Velocity)**: Strafe gains full movement speed while channeling, fires piercing lightning arrows, and grants 30% dodge chance.

### Branch 1: The Wilds (The Beastmaster Commander)
* **Tier 1 (Lv 1 - Foundation)**: *Feral Ferocity* (5 ranks) — +8% Companion Damage, +6% Companion Health, +4% Move Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Wolf Companion)**:
  * **Choice A (Dire Alpha Pack)**: Wolf companion summons 2 additional spirit wolves; attacks cause bleeding and grant party life leech.
  * **Choice B (Venom Drake)**: Replaces the Wolf with a Poison Drake that breathes acid in a cone, melting enemy physical armor by 40%.
* **Tier 3 (Lv 24 - Synergy)**: *Primal Bond* (5 ranks) — Each active companion grants the Ranger +4% Damage and +3% Damage Reduction.
* **Tier 4 (Lv 40 - A/B Skill Morph: Great Bear)**:
  * **Choice A (Ursine Juggernaut)**: Great Bear health doubled; casts an aggressive taunt roar every 6s and reflects 100% thorns damage.
  * **Choice B (Storm Behemoth)**: Great Bear attacks with crackling lightning paws, releasing chain lightning to adjacent enemies.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Beastlord Ascension - All Companions)**: You can summon ALL companions simultaneously (Wolf Pack, Hawk, and Bear all active).
  * **Choice B (Primal Wrath)**: Transforming into Avatar of the Wild increases attack speed by 50% and your melee claws release shockwaves.

### Branch 2: Traps & Tricks (The Combat Engineer & Saboteur)
* **Tier 1 (Lv 1 - Foundation)**: *Tinkerer's Art* (5 ranks) — +7% Trap Damage, +15% Trap Arming Speed, +8% Cooldown Reduction per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Explosive Trap)**:
  * **Choice A (Razor Shrapnel)**: Explosive Trap releases serrated metal shrapnel, causing enemies to bleed profusely and taking 25% extra damage from all sources.
  * **Choice B (Cryo Detonator)**: Explosive Trap converts to Ice, flash-freezing all caught enemies in solid blocks of ice for 3 seconds.
* **Tier 3 (Lv 24 - Synergy)**: *Guerrilla Warfare* (5 ranks) — Striking trapped, slowed, or frozen enemies grants +25% Critical Strike Chance.
* **Tier 4 (Lv 40 - A/B Skill Morph: Death Machine Ballista)**:
  * **Choice A (Dual Automated Gatlings)**: You can deploy up to 2 Death Machine ballistas simultaneously; their fire rate is increased by 40%.
  * **Choice B (Rocket Pod Artillery)**: Death Machine is retrofitted with missile pods, firing homing rockets that deal heavy area fire damage.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Chain Demolition)**: When any trap detonates, all other traps within 12 meters instantly trigger and refund 50% of their mana cost.
  * **Choice B (Master Saboteur)**: Smoke Screen drops an armed Decoy and grants 4 seconds of 100% critical strike chance.

---

## 6. Build Archetypes & Character Variety
1. **Cold Multishot Bowazon**: Marksmanship branch with Frost Shard Piercer + Volley of Steel + Sniper's Execution. Wide screen-freeze kiting.
2. **Beastlord Commander**: The Wilds branch with Dire Alpha Pack + Beastlord Ascension. Commands an army of wolves, hawks, and bears.
3. **Automated Ballista Trapper (Marauder)**: Traps branch with Cryo Detonator + Dual Automated Gatlings + Chain Demolition. Deploys fortified ballista nests.
4. **Black Hole Astral Marksman**: Combines Black Hole Arrow with Cluster Ricochet Multishot to suck entire rooms into a singularity and obliterate them.
