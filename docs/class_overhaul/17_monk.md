# Monk: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & Diablo III ARPG Pillars
Inspired by the peerless martial flow of the *Diablo III Monk*, this class is an agile, fluid dancer of holy Chi, resonant temple bells, and lethal dragon-tiger strikes. The combat loop revolves around **Spirit generation and expenditure**, **flying gap-closers (*Flying Kick, Dashing Strike*)**, **resonant bell slams (*Wave of Light*)**, **dual-function Mantras (Passive Field + Active Surge)**, and the ultimate invulnerable flurry: **Seven-Sided Strike**.

### The Four Iconic Archetypes:
1. **The Martial Combo Striker (Fists & Flurries)**: Rapid three-hit combo generators and sweeping crane kicks (*Fist of Fury, Flying Kick, Sweeping Crescent, Hundred Fists*). Builds Spirit and dances around enemy packs.
2. **The Temple Bellcaster (Wave of Light & Holy Bells)**: Drops massive golden bells from the heavens that ring out concussive shockwaves (*Chi Bolt, Radiant Bell, Wave of Light, Pillar of Nirvana*).
3. **The Dragon & Tiger Pyromancer (Fire Martial Arts)**: Unleashes primal dragon claws, fiery breath, and leaping tiger pounces (*Dragon Strike, Tiger Pounce, Breath of the Wyrm, Cataclysmic Dragon Slam*).
4. **The Enlightened Mystic (Mantras & Zen Trance)**: Inspires allies with divine mantric auras, purifies debuffs, and ascends into golden godhood (*Mantra of Healing, Mantra of Retribution, Inner Peace, Avatar of Enlightenment*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **16 Melee Punches and Kicks**: Repetitive martial arts strikes (*Fist of Fury, Tiger Claw, Sweeping Crescent, Hundred Fists, Iron Palm, Thousand Lotus Flurry, Fatal Touch, Tempest Flurry, Grandmaster Strike, Dragon Tail Sweep, Dragon Strike, Blazing Palm, Tiger Claw Shred, Flaming Fist Barrage, Palm of the Dawn, Seven-Sided Strike*).
* **8 Spirit Bells & Palms**: Multiple identical bell-slam or heavy palm impacts (*Radiant Bell, Sanctified Bell, Sunken Bell, Pillar of Nirvana, Crushing Impact, Earthshaker Kick, Inferno Palm, Cataclysmic Dragon Slam, Heavenly Palm*).
* **6 Dashes and Flying Kicks**: Overlapping mobility strikes (*Flying Kick, Wind Walker, Vaulting Leap, Tiger Pounce, Fiery Ascent, Dragon Kick, Zen Dash*).
* **12 Mantras and Stances**: Excessive passive/active aura toggles (*Mantra of Healing, Inner Peace, Mantra of Retribution, Mantra of Swiftness, Transcendental Aura, Mantra of Renewal, Seraphic Cloak, Asura Stance, Dragon Ascendant, Chakras Open, Mantra of Restoration, Mantra of Conviction*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Seven-Sided Strike)

> [!IMPORTANT]
> **Seven-Sided Strike is the Monk's F-Key Class Ultimate, NOT a skill tree slot!**
> 
> * **The Class Ultimate (`Seven-Sided Strike` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 Spirit**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; dashes between enemies 7 times in a fraction of a second, completely invulnerable while striking, obliterating enemy packs and crushing boss health bars.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Grandmaster Flurry*, *Avatar of Enlightenment* (golden transcendent form), and *Cataclysmic Dragon Slam* are standard high-tier spenders/transformations.
>   * They cost Spirit, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                       MONK ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Martial Arts │ Tree 1: Spirit/Mantra│ Tree 2: Dragon/Tiger │ Tree 3: Transcendence│
 │ (Barehanded Combos)  │ (Holy Chi & Bells)   │ (Fire & Primal Beasts│ (Zen Mysticism)      │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Fist of Fury (Gen)│ 1. Chi Bolt (Spender)│ 1. Dragon Strike(Fire│ 1. Palm of the Dawn  │
 │ 2. Flying Kick (DASH)│ 2. Mantra of Healing │ 2. Tiger Pounce(Bleed│ 2. Resonating Bell   │
 │ 3. Sweeping Crescent │ 3. Radiant Bell (AoE)│ 3. Flaming Lotus     │ 3. Zen Dash (Blink)  │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Hundred Fists     │ 4. Inner Peace(Circle│ 4. Breath of Wyrm    │ 4. Orbiting Beads    │
 │ 5. Iron Palm Strike  │ 5. Mantra of Retrib  │ 5. Tiger Roar (Fear) │ 5. Sweeping Gale     │
 │ 6. Spinning Crane    │ 6. Spirit Chains     │ 6. Fiery Ascent Leap │ 6. Wave of Light     │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Quivering Palm    │ 7. Purifying Wave    │ 7. Inferno Palm Nova │ 7. Chakras Open(Buff)│
 │ 8. Asura Stance      │ 8. Pillar of Nirvana │ 8. Dragon Tempest    │ 8. Heavenly Palm AoE │
 │ 9. Grandmaster Flurry│ 9. Avatar Enlighten  │ 9. Cataclysmic Dragon│ 9. Nirvana Flash     │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Martial Arts (Barehanded Combos, Kicks & Flurries)
* **Row 0 (Lv 1 - Combo Builders, Kicks & Sweeps)**:
  1. **Fist of Fury** (Lv 1 · Melee Generator) — Rapid 3-hit martial combo builder generating 12 Spirit per punch with high attack speed.
  2. **Flying Kick** (Lv 1 · **The Definitive Gap-Closer**) — High-velocity flying leap-kick darting through the target, stunning on impact and closing gaps instantly.
  3. **Sweeping Crescent Kick** (Lv 6 · 360 Sweep) — Roundhouse kick knocking down all surrounding enemies and generating bonus Spirit on multi-hits.
* **Row 1 (Lv 12 - Rapid Fists, Iron Palms & Cyclone Kicks)**:
  4. **Hundred Fists** (Lv 12 · Channeled Barrage) — Channeled rapid-punch flurry delivering dozens of micro-punches into a frontal cone.
  5. **Iron Palm Strike** (Lv 12 · Heavy Impact) — Heavy concussive palm strike releasing an internal shockwave that crushes 40% of enemy armor.
  6. **Spinning Crane Kick** (Lv 16 · Mobile Cyclone) — Mobile spinning whirlwind kick that continuously damages and pulls surrounding enemies while moving.
* **Row 2 (Lv 24 - Quivering Palms, Stances & Flurries)**:
  7. **Quivering Palm / Fatal Touch** (Lv 20 · Delayed Burst) — Places an internal lethal vibration in the target; detonates after 3 seconds for massive physical damage.
  8. **Asura Stance** (Lv 24 · Combat Stance) — Combat buff boosting Attack Speed by 40%, Dodge Chance by 25%, and Critical Strike Chance by 15% for 12s.
  9. **Grandmaster Flurry** (Lv 30 · Execution Capstone) — Unleashes a lightning-fast combination of 12 devastating martial strikes that staggers bosses.

### Tree 1: Spirit & Mantras (Holy Chi, Bells & Divine Auras)
* **Row 0 (Lv 1 - Chi Bolts, Mantras & Dropped Bells)**:
  1. **Chi Bolt** (Lv 1 · Holy Projectile) — Hurls a projectile of concentrated holy Chi that pierces enemies and restores 5% mana/spirit.
  2. **Mantra of Healing** (Lv 1 · Dual-Function Mantra) — *Passive*: Restores 2% health per second to all party members. *Active*: Instantly pulses a protective golden shield absorbing 25% max HP for 5s (30s CD).
  3. **Radiant Bell** (Lv 6 · Resonant Slam) — Drops a massive golden temple bell from the heavens, crushing enemies on impact and ringing with holy shockwaves.
* **Row 1 (Lv 12 - Sanctuaries, Retribution & Spirit Chains)**:
  4. **Inner Peace / Sanctuary** (Lv 12 · Consecrated Circle) — Creates a consecrated circle on the floor where allies take 40% reduced damage and cannot be stunned.
  5. **Mantra of Retribution** (Lv 12 · Thorns Mantra) — *Passive*: Reflects 100% of damage taken back as holy damage to attackers. *Active*: Emits a shockwave boosting party attack power by 35% for 6s.
  6. **Spirit Chains / Tether** (Lv 16 · Crowd Pull) — Binds surrounding enemies with golden Chi chains, violently yanking them together into a tight cluster.
* **Row 2 (Lv 24 - Purifying Waves, Nirvana & Avatar)**:
  7. **Purifying Wave** (Lv 20 · Crescent Wave) — Sends a wide crescent of holy energy across the floor that heals allies and harms foes.
  8. **Pillar of Nirvana** (Lv 24 · Channeled Golden Beam) — Channels a golden beam of heaven that continuously restores health and incinerates demons.
  9. **Avatar of Enlightenment** (Lv 30 · Form Capstone) — Transcendent golden transformation granting flying, infinite Chi, and radiating light novas for 20s.

### Tree 2: Dragon & Tiger (Fire Martial Arts & Primal Beasts)
* **Row 0 (Lv 1 - Dragon Punches & Tiger Pounces)**:
  1. **Dragon Strike** (Lv 1 · Fire Generator) — Melee punch erupting in a jet of dragon fire, igniting the victim for 6s.
  2. **Tiger Pounce** (Lv 1 · Bleeding Lunge) — Ferocious pounce that pins the target to the floor and claws for heavy physical bleed.
  3. **Flaming Lotus** (Lv 6 · Deployable Fire) — Conjures a spinning fiery lotus that shoots fireballs in all directions for 6s.
* **Row 1 (Lv 12 - Dragon Breath, Tiger Roars & Leaps)**:
  4. **Breath of the Wyrm** (Lv 12 · Fire Cone) — Exhales a cone of searing dragon flame from the mouth, melting enemy resistances.
  5. **Tiger Roar** (Lv 12 · Fear Roar) — Primal battle roar terrifying nearby enemies and boosting melee damage by 30%.
  6. **Fiery Ascent Leap** (Lv 16 · Upward Plunge) — Upward spinning dragon leap, dragging enemies airborne before slamming them down into magma.
* **Row 2 (Lv 24 - Inferno Palms & Dragon Slams)**:
  7. **Inferno Palm Nova** (Lv 20 · Radial Molten Wave) — Slams both glowing palms onto the ground, releasing a tidal wave of molten fire.
  8. **Dragon Tempest** (Lv 24 · Fire Cyclone) — Whirlwind of fire and wind sweeping up all surrounding enemies into an inferno.
  9. **Cataclysmic Dragon Slam** (Lv 30 · Dragon Spirit Capstone) — Summons the spirit of a titanic fire dragon that crashes into the earth with screen-shaking fury.

### Tree 3: Transcendence (Zen Mysticism & Light Waves)
* **Row 0 (Lv 1 - Dawn Palms & Resonating Bells)**:
  1. **Palm of the Dawn** (Lv 1 · Radiant Strike) — Sweeping radiant strike that blinds struck targets for 2s.
  2. **Resonating Bellstrike** (Lv 1 · Sonic Wave) — Slams an ethereal bell with a palm strike, ringing out an expansive sonic wave.
  3. **Zen Dash** (Lv 6 · Evasive Phase) — Instant phase dash that leaves behind a meditating phantom clone that taunts enemies.
* **Row 1 (Lv 12 - Prayer Beads & Wave of Light)**:
  4. **Orbiting Prayer Beads** (Lv 12 · Holy Satellites) — Glowing prayer beads circling the Monk that detonate on contact with enemies.
  5. **Sweeping Gale** (Lv 12 · Passive Vortex) — Passive/active vortex that builds wind stacks as you hit enemies, creating a swirling aura of blades.
  6. **Wave of Light** (Lv 16 · **The Legendary Bell Cannon**) — Projects a giant golden bell of holy energy forward that crushes everything and shatters into radiating light beams.
* **Row 2 (Lv 24 - Chakras & Heavenly Palms)**:
  7. **Chakras Open** (Lv 20 · Cooldown Buff) — Unlocks all 7 chakras, maximizing cooldown reduction (+40%) and spirit regeneration for 10s.
  8. **Heavenly Palm AoE** (Lv 24 · Overhead Golden Hand) — Giant spectral golden palm descends from the clouds, flattening the area.
  9. **Nirvana Flash** (Lv 30 · Transcendent Capstone) — Blinding flash of universal enlightenment obliterating all surrounding evil.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Martial Arts (The Striking Master)
* **Tier 1 (Lv 1 - Foundation)**: *Fist Mastery* (5 ranks) — +7% Melee Physical Damage, +3% Attack Speed, +3% Dodge Chance per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Flying Kick)**:
  * **Choice A (Dragon's Flight - Fire Dash)**: Flying Kick leaves a blazing trail of fire, knocks all enemies in its path aside, and resets cooldown on kill.
  * **Choice B (Sweeping Crane Drop - Ice Stun)**: Flying Kick ends in a sweeping roundhouse kick that flash-freezes all surrounding enemies for 2.5s.
* **Tier 3 (Lv 24 - Synergy)**: *Combo Flow* (5 ranks) — Alternating between different martial arts skills builds Combo stacks (+5% damage per stack, up to 6 stacks).
* **Tier 4 (Lv 40 - A/B Skill Morph: Hundred Fists)**:
  * **Choice A (Thousand Lotus Flurry)**: Hundred Fists punch count doubled, attack speed increased by 50%, and inflicts bleed.
  * **Choice B (Concussive Shockwave)**: Every punch in the barrage releases forward-traveling sonic shockwaves.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Infinite Seven-Sided Flurry)**: Performing your F-key Seven-Sided Strike triggers an automatic free Wave of Light on every target struck.
  * **Choice B (Asura's Wrath)**: While in Asura Stance, critical hits generate +100% bonus Spirit and trigger phantom shadow punches.

### Branch 1: Spirit & Mantras (The Divine Channeler)
* **Tier 1 (Lv 1 - Foundation)**: *Chi Circulation* (5 ranks) — +7% Holy Damage, +15 Max Spirit, +8% Healing Potency per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Radiant Bell)**:
  * **Choice A (Resonating Shockwave)**: The Bell pulses 3 successive shockwaves, pulling enemies inward before detonating.
  * **Choice B (Sanctified Chime)**: The Bell cleanses all debuffs from allies and grants them a 25% max HP shield upon impact.
* **Tier 3 (Lv 24 - Synergy)**: *Spiritual Conduit* (5 ranks) — Spending Spirit heals the Monk and closest ally for 10% of Spirit spent.
* **Tier 4 (Lv 40 - A/B Skill Morph: Mantra of Healing)**:
  * **Choice A (Mantra of Rejuvenation)**: Also restores 4% mana and stamina per second to the party.
  * **Choice B (Mantra of Immortality)**: When an ally in range takes fatal damage, prevent their death and heal them to 40% HP (2m CD).
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Buddha's Palm)**: Heavenly Palm and Wave of Light have their area increased by 100% and deal +50% bonus holy damage.
  * **Choice B (Enlightened Master)**: You can have 2 Mantras active simultaneously; aura radius doubled.

### Branch 2: Dragon & Tiger (Fire & Fury)
* **Tier 1 (Lv 1 - Foundation)**: *Dragon's Breath* (5 ranks) — +7% Fire Damage, +15% Burn Duration, +8% Critical Strike Damage per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Tiger Pounce)**:
  * **Choice A (White Tiger Shred)**: Tiger Pounce applies severe bleed wounds and rips off 40% of the target's physical armor.
  * **Choice B (Fiery Leap)**: Tiger Pounce ignites the ground, creating a ring of fire that traps the target.
* **Tier 3 (Lv 24 - Synergy)**: *Yin & Yang* (5 ranks) — Striking with Dragon abilities empowers Tiger abilities with +30% damage, and vice versa.
* **Tier 4 (Lv 40 - A/B Skill Morph: Breath of the Wyrm)**:
  * **Choice A (Inferno Torment)**: Breath channel time doubled; melts enemy fire resistance by 10% every second.
  * **Choice B (Explosive Fireball)**: Instead of a channeled cone, launches 3 giant fire dragon orbs that detonate in chain explosions.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Dragon Ascendant)**: Cataclysmic Dragon Slam leaves behind an ongoing storm of fire meteors for 8 seconds.
  * **Choice B (Primal Ferocity)**: Critical hits with Dragon & Tiger skills have a 25% chance to immediately reset Flying Kick and Tiger Pounce cooldowns.

---

## 6. Build Archetypes & Character Variety
1. **The Seven-Sided Martial Flurry Monk**: Martial Arts branch with Dragon's Flight + Thousand Lotus Flurry + Infinite Seven-Sided Flurry. Incomparable agility and invulnerable multi-hit combos.
2. **The Wave of Light Bellcaster (WoL Monk)**: Spirit & Mantras branch with Resonating Shockwave + Buddha's Palm. Drops screens of ringing golden bells.
3. **Dragon & Tiger Pyromancer**: Dragon & Tiger branch with White Tiger Shred + Explosive Fireball + Dragon Ascendant. Blazing martial arts explosions.
4. **Divine Support / Healer Monk**: Inner Peace + Mantra of Rejuvenation + Enlightened Master. Frontline sanctuary buffer and party reviver.
