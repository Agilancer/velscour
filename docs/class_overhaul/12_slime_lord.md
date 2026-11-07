# Slime Lord: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by amorphous shapeshifters and biological brood commanders, the Slime Lord is an elastic, highly mobile engine of corrosive dissolution and mitosis swarming. The combat loop centers on **passive and reactive slime budding (Mitosis)**, **devouring wounded enemies whole**, **elastic bounce leaps**, and **coating the arena in caustic primordial puddles**.

### The Four Iconic Archetypes:
1. **The Amorphous Juggernaut (Elastic Body & Bouncing Leaps)**: Bounces across the arena, crushing packs, absorbing physical blows, and growing in colossal size (*Body Slam, Bounce / Splatter Leap, Colossal Form, Slime God*).
2. **The Brood Sovereign (Mitosis, Splitting & Titans)**: Commands an army of bouncy, split-on-hit jellies (*Spawn Slimeling, Mitosis, Brood, Ooze Titan, Mother Ooze*).
3. **The Caustic Chemist (Acid Pools, Geysers & Dissolution)**: Drowns the floor in corrosive ooze that melts enemy physical armor and resistance (*Slime Ball, Slime Pool, Acid Rain, Sludge Beam*).
4. **The Primordial Evolutionist (Prismatic Jellies & Soup)**: Evolves elemental mutations, devours monsters whole, and triggers primeval singularities (*Primal Glob, Primordial Soup, Devour Whole, Primordial Singularity*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **16 Slime Minion Buttons**: Over 16 nearly identical slime summon buttons (*Slimeling, Sap Mender, Brood, Volatile Slime, Frost Sage, Gilded Bulwark, Mitosis, Ooze Titan, Explosive Brood, Prismatic Jellies, Slime Empire, Gelatinous Horde, Mother Ooze, Cell Split, Prism Slime*). Players had zero room on their hotbars for actual attacks!
* **5 Redundant Bounces & Leaps**: Multiple identical jumping slams (*Bounce, Splatter Leap, Mega Bounce, Cataclysmic Splash, Primordial Leap*).
* **8 Melee Slime Attacks**: Repetitive slaps and absorbs (*Body Slam, Absorb, Engulf, Elastic Lash, Tendril Whip, Devour, Ooze Slap, Devour Whole*).
* **Fallback Talents**: Slime Lord was falling back to Paladin talents in `talents.js`! It had zero dedicated ooze talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Royal Deluge)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Royal Deluge!**
> 
> * **The Class Ultimate (`Royal Deluge` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; submerges the battlefield in an emerald toxic deluge of acidic geysers, wiping trash mobs and melting elite armor.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Primordial Flood* (arena ooze submergence), *Mother Ooze* (stationary queen summon), and *Slime God Ascension* (invulnerable gelatin state) are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                    SLIME LORD ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Ooze         │ Tree 1: Spawn        │ Tree 2: Mutation     │ Tree 3: Primordial   │
 │ (Acid & Puddles)     │ (Mitosis & Titans)   │ (Amorphous Anatomy)  │ (Evolution & Maw)    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Slime Ball (Gen)  │ 1. Spawn Slimeling   │ 1. Body Slam (Melee) │ 1. Primal Glob (Elem)│
 │ 2. Slime Pool (Zone) │ 2. Mitosis (Split)   │ 2. Bounce (Leap)     │ 2. Cell Split (Shed) │
 │ 3. Ooze Wave (Tsunami│ 3. Sap Mender Jelly  │ 3. Tendril Lash (Pull│ 3. Primordial Soup   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Acid Rain (AoE)   │ 4. Volatile Brood    │ 4. Slime Armor (Def) │ 4. Prismatic Jelly   │
 │ 5. Gelatinous Wall   │ 5. Frost Sage Jelly  │ 5. Engulf / Devour   │ 5. Gloop Cannon (Chan│
 │ 6. Sludge Beam (Chan)│ 6. Feed / Cannibalize│ 6. Rolling Blob Dash │ 6. Jelly Rampart(Def)│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Viscous Orbs(Orbit│ 7. Ooze Titan (Heavy)│ 7. Spike Mutation    │ 7. Primeval Downpour │
 │ 8. Acid Geyser (Upwar│ 8. Slime Hivemind    │ 8. Colossal Form(Buff│ 8. Devour Whole(Maw) │
 │ 9. Primordial Flood  │ 9. Mother Ooze (Cap) │ 9. Slime God (Cap)   │ 9. Singularity (Cap) │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Ooze (Acid Projectiles, Waves & Puddles)
* **Row 0 (Lv 1 - Balls, Puddles & Waves)**:
  1. **Slime Ball** (Lv 1 · Bouncing Generator) — Bouncing glob of corrosive acid that leaves an acid puddle on impact; builds 10 biomass energy.
  2. **Slime Pool** (Lv 1 · Ground Zone) — Spits a wide caustic puddle that slows enemies by 40% and melts their physical armor over time.
  3. **Ooze Wave / Tsunami** (Lv 6 · Rolling Wave) — Rolling tidal wave of thick slime sweeping enemies away and knocking them down.
* **Row 1 (Lv 12 - Acid Rain, Walls & Sludge Beams)**:
  4. **Acid Rain / Deluge** (Lv 12 · Ground Rain) — Calls down a rainstorm of sticky acidic droplets over a wide zone for 5 seconds.
  5. **Gelatinous Wall** (Lv 12 · Sticky Barrier) — Creates a translucent barrier of living goo that absorbs missiles and entangles melee attackers.
  6. **Sludge Beam** (Lv 16 · Channeled Acid) — Continuous channeled hose of high-pressure acid melting through targets in a line.
* **Row 2 (Lv 24 - Acid Geysers & Primordial Flood)**:
  7. **Viscous Orbs Orbit** (Lv 20 · Acid Satellites) — Encircles the Slime Lord with acidic orbiting bubbles that detonate on contact.
  8. **Acid Geyser** (Lv 24 · Upward Eruption) — Erupts a geyser of pressurized green sludge launching enemies high into the air.
  9. **Primordial Flood** (Lv 30 · Room Submerge Capstone) — Submerges the entire combat arena in a deep ocean of living primordial ooze for 10s.

### Tree 1: Spawn (Mitosis, Broods & Titans)
* **Row 0 (Lv 1 - Spawning Slimelings & Mitosis)**:
  1. **Spawn Slimeling** (Lv 1 · Core Minion) — Spits out small bouncy slimelings that swarm and bite enemies.
  2. **Mitosis / Split** (Lv 1 · Reactive Clones) — Active cast splits active slimes into two smaller, faster clones; passive chance on taking hit.
  3. **Sap Mender Jelly** (Lv 6 · Healing Minion) — Summons a supportive green jelly that heals the Slime Lord and allies for 3% HP per pulse.
* **Row 1 (Lv 12 - Volatile Jellies, Frost Sages & Feeding)**:
  4. **Volatile Slime Brood** (Lv 12 · Kamikaze Minions) — Spawns explosive red jellies that suicide-bomb enemy clusters.
  5. **Frost Sage Jelly** (Lv 12 · Icy Minion) — Summons an icy blue slime that casts slowing frost waves.
  6. **Feed / Cannibalize** (Lv 16 · Minion Sacrifice) — Consumes an active slimeling to instantly restore 30% health and gain +25% damage for 10s.
* **Row 2 (Lv 24 - Ooze Titans & Mother Ooze)**:
  7. **Ooze Titan / Colossus** (Lv 20 · Towering Behemoth) — Merges surrounding slimes into a colossal towering slime monstrosity that cleaves the screen.
  8. **Slime Empire Hivemind** (Lv 24 · Swarm Link) — Connects all active slimes into a shared network, granting +50% attack speed.
  9. **Mother Ooze** (Lv 30 · Brood Queen Capstone) — Summons the ancient Mother Ooze, an enormous stationary queen continuously spawning jellies.

### Tree 2: Mutation (Amorphous Anatomy & Bounces)
* **Row 0 (Lv 1 - Slams, Bounces & Tendrils)**:
  1. **Body Slam** (Lv 1 · Heavy Tackle) — Heavy amorphous tackle dealing blunt physical and acid damage with knockback.
  2. **Bounce / Splatter Leap** (Lv 1 · Elastic Leap) — **The Core Mobility Tool**: High-velocity elastic leap into the air, splashing down with a giant splatter shockwave.
  3. **Tendril Lash** (Lv 6 · Sticky Pull) — Extends sticky slime tendrils in a wide frontal arc, pulling enemies directly to the Slime Lord.
* **Row 1 (Lv 12 - Rubber Carapace, Devour & Bowling Blobs)**:
  4. **Slime Armor** (Lv 12 · rubby Carapace) — Hardens outer goo into a rubbery carapace that deflects physical blows (+60% Armor).
  5. **Engulf / Devour** (Lv 12 · Enemy Digestion) — Envelops a non-boss enemy inside your body, digesting them over time while moving freely.
  6. **Rolling Blob Dash** (Lv 16 · Rolling Boulder) — Transforms into a rolling boulder of gelatin, bowling over all enemies in your path.
* **Row 2 (Lv 24 - Calcite Spikes & Slime God)**:
  7. **Spike Mutation** (Lv 20 · 360-Degree Nova) — Shoots hundreds of hardened toxic calcified spikes from your body in 360 degrees.
  8. **Colossal Form** (Lv 24 · Size Increase) — Doubles in size, gaining +50% health, increased melee reach, and immunity to crowd control.
  9. **Slime God Ascension** (Lv 30 · Form Capstone) — True amorphous godhood, becoming completely immune to physical damage and reflecting attacks for 12s.

### Tree 3: Primordial (Evolution & Primeval Maw)
* **Row 0 (Lv 1 - Primal Globs & Soup)**:
  1. **Primal Glob** (Lv 1 · Evolving Missile) — Highly concentrated essence projectile that evolves into random element upon impact.
  2. **Cell Split** (Lv 1 · Defensive Shed) — Upon taking heavy damage, automatically sheds a defensive jelly copy that taunts.
  3. **Primordial Soup Zone** (Lv 6 · Fertile Pool) — Fertile pool of primeval broth that constantly generates new micro-slimes every 2s.
* **Row 1 (Lv 12 - Prismatic Jellies & Gloop Cannons)**:
  4. **Prismatic Jelly** (Lv 12 · Rainbow Minion) — Rare rainbow jelly that cycles between Fire, Ice, and Lightning explosions.
  5. **Gloop Cannon** (Lv 12 · Rapid-Fire Channeled) — Rapid-fire barrage of dense sludge projectiles knocking back targets.
  6. **Jelly Rampart** (Lv 16 · Rubbery Bunker) — Protective bunker made of dense rubbery slime that shields the party from projectiles.
* **Row 2 (Lv 24 - Primeval Maws & Singularities)**:
  7. **Primeval Downpour** (Lv 20 · Slime Meteors) — Rains down celestial slime meteors that shatter into fighting slimelings.
  8. **Devour Whole** (Lv 24 · Giant Ground Maw) — Opens a massive gaping maw on the ground that swallows an entire cluster of enemies.
  9. **Primordial Singularity** (Lv 30 · Cosmic Jelly Capstone) — Collapses the arena's slime into a single hyper-dense cosmic jelly nexus that implodes.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Ooze (Caustic Chemistry)
* **Tier 1 (Lv 1 - Foundation)**: *Corrosive Secretions* (5 ranks) — +7% Acid Damage, +15% Puddle Duration, +8% Armor Shred per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Slime Ball)**:
  * **Choice A (Cluster Droplets)**: Slime Ball splits into 4 smaller bouncing balls on its first impact.
  * **Choice B (Caustic Bomb)**: Slime Ball radius increased by 80% and applies a 50% slow for 5s.
* **Tier 3 (Lv 24 - Synergy)**: *Acidic Erosion* (5 ranks) — Enemies standing in slime pools take +30% increased damage from all sources.
* **Tier 4 (Lv 40 - A/B Skill Morph: Sludge Beam)**:
  * **Choice A (Acidic Flurry)**: Sludge Beam sweeps in a wide 90-degree fan, melting entire packs.
  * **Choice B (Concentrated Jet)**: Sludge Beam narrows to a laser, dealing 200% more damage against single targets.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Endless Deluge)**: Acid Rain follows the Slime Lord as a mobile cloud and never expires in combat.
  * **Choice B (Dissolution Master)**: When an enemy dies from Acid damage, they liquefy into a new permanent Slime Pool.

### Branch 1: Spawn (Mitosis & The Hive)
* **Tier 1 (Lv 1 - Foundation)**: *Prolific Mitosis* (5 ranks) — +2 Max Slime Cap, +8% Minion Health, +5% Minion Move Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Spawn Slimeling)**:
  * **Choice A (Volatile Kamikaze)**: Slimelings explode upon death in a fiery acid burst dealing 250% damage.
  * **Choice B (Rubbery Vanguard)**: Slimelings gain shields, taunt enemies, and absorb 20% of damage taken by the player.
* **Tier 3 (Lv 24 - Synergy)**: *Gooey Unity* (5 ranks) — Each active slime grants the Slime Lord +2% damage resistance and +3% health regen.
* **Tier 4 (Lv 40 - A/B Skill Morph: Ooze Titan)**:
  * **Choice A (Two-Headed Behemoth)**: You can summon 2 Ooze Titans simultaneously with doubled slam radius.
  * **Choice B (Colossus Devourer)**: Ooze Titan periodically eats smaller slimes to permanently increase its size and damage.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Infinite Swarm)**: Slimelings duplicate themselves every 8 seconds via Mitosis; max slimeling cap removed.
  * **Choice B (Queen of the Brood)**: Mother Ooze spawns explosive volatile jellies and casts Acid Geysers automatically.

### Branch 2: Mutation (Amorphous Anatomy)
* **Tier 1 (Lv 1 - Foundation)**: *Elasticity* (5 ranks) — +7% Blunt/Physical Damage, +15% Leap Range, +6% Maximum Health per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Bounce / Splatter Leap)**:
  * **Choice A (Cataclysmic Crater)**: Landing creates an enormous shockwave that stuns all foes for 2.5s and leaves slippery slime.
  * **Choice B (Pogo Bounce)**: Leap can be cast 3 times in rapid succession, with each consecutive bounce dealing +50% damage.
* **Tier 3 (Lv 24 - Synergy)**: *Living Gelatin* (5 ranks) — Taking damage has a 25% chance to drop a healing slime blob that restores 5% HP.
* **Tier 4 (Lv 40 - A/B Skill Morph: Engulf / Devour)**:
  * **Choice A (Acidic Stomach)**: Devouring an enemy digests them in 3 seconds and grants their maximum HP as a temporary shield.
  * **Choice B (Vortex Maw)**: Engulf pulls in up to 4 enemies simultaneously into your jelly body.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Slime God Sovereign)**: Colossal Form becomes permanent; you are completely immune to crowd control, knockback, and stuns.
  * **Choice B (Spike Apocalypse)**: Spike Mutation triggers automatically whenever you take more than 10% of your life in damage.

---

## 6. Build Archetypes & Character Variety
1. **The Swarm Broodmother**: Spawn branch with Volatile Kamikaze + Infinite Swarm. Fills the screen with endless exploding jellies.
2. **Colossal Bouncing Juggernaut**: Mutation branch with Cataclysmic Crater / Pogo Bounce + Slime God Sovereign. High-mobility elastic tank.
3. **Caustic Pool Zone Denier**: Ooze branch with Caustic Bomb + Dissolution Master. Drowns arenas in lethal, armor-melting slime pools.
4. **Prismatic Hybrid Shifter**: Prismatic Jellies and Gloop Cannon for rapid elemental adaptations.
