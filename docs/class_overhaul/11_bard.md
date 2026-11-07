# Bard: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by high-energy battle skalds and sonic illusionists in modern ARPGs, the Bard weaves melody, rhythm, and acoustic shockwaves into combat. The gameplay loop centers on **Chord Progressions and Crescendo stacks**, **dual-function performance songs (Passive Aura + Active Surge)**, acoustic ground fissures, and theatrical pyrotechnics.

### The Four Iconic Archetypes:
1. **The Acoustic Shockwave Skald (Sonic Destruction & Heavy Riffs)**: Smashes instruments to unleash seismic bass drops and armor-shattering riffs (*Power Chord, Shockwave Riff, Bass Drop, Wall of Sound*).
2. **The Virtuoso Party Conductor (Melodic Hymns & Auras)**: Plays inspiring anthems that heal, haste, and empower party members (*Plucked Note, Hymn of Mending, Ballad of Valor, Symphony of Storms*).
3. **The Theatrical Swashbuckler (Stage Magic & Pyrotechnics)**: Rapid rapier lunges, confetti bombs, flashbangs, and mirror illusions (*Sharp Note, Smoke Screen, Pyrotechnics, Mirror Images, Swashbuckle*).
4. **The Arena Headliner (Rock Legend & Encores)**: Massive electrifying stadium performances (*Bright Note, Spotlight, Stage Dive, Mic Drop, Rock Legend*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **25 Note Projectile Clones**: The skill tree was drowning in 25 separate projectile buttons that simply threw musical notes or sound waves with slightly varied speeds or colors (*Plucked Note, Lullaby, Crescendo, Finale, Sound Wave, Power Chord, Echo, Resonance, Tremolo, Bass Drop, Screech, Shatter Note, Brown Note, Death Metal, Supersonic, Sharp Note, Fan of Notes, Pickpocket, Juggler's Toss, Sleight of Hand, Staccato Flurry, Deadly Sonata, Opening Act, Bright Note, Pyro Finale*).
* **12 Separate Song Buffs**: Cluttered the bar with static number bonuses (*Ballad of Valor, Hymn of Mending, Battle Hymn, Song of Swiftness, Anthem of Heroes, Symphony of Storms, Magnum Opus, Encore, Rousing Chorus, Tempo Rubato, Rock Legend*).
* **7 Minion Summons**: Overlapping musical illusions (*Chorus, Orchestra, Thunder Drum, Amplifier, Mirror Images, Grand Illusion, Backup Singers*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Grand Crescendo)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Grand Crescendo!**
> 
> * **The Class Ultimate (`Grand Crescendo` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; unleashes an overwhelming spiraling musical staff vortex that stuns, silences, and obliterates the entire room in a golden acoustic burst.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Magnum Opus* (grand party invulnerability), *Sonic Boom* (hypersonic wave), and *The Grand Finale* are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                       BARD ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Songs        │ Tree 1: Sonic Arts   │ Tree 2: Trickery     │ Tree 3: Grand Finale │
 │ (Auras & Melodies)   │ (Shockwaves & Riffs) │ (Stage Magic & Dagger│ (Rock Legend & Encore│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Plucked Note (Gen)│ 1. Power Chord (Cone)│ 1. Fan of Notes (Fan)│ 1. Bright Note (Line)│
 │ 2. Hymn of Mending   │ 2. Echo (Bounce Proj)│ 2. Smoke Screen (Fog)│ 2. Spotlight (Buff)  │
 │ 3. Ballad of Valor   │ 3. Shockwave Riff    │ 3. Pyrotechnics(Fire)│ 3. Stage Dive (Leap) │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Song of Swiftness │ 4. Resonance Beam    │ 4. Dancing Notes(Orbi│ 4. Drum Roll (Novas) │
 │ 5. Dirge of Sorrow   │ 5. Feedback Loop     │ 5. Mirror Images(Deco│ 5. Crescendo Wave    │
 │ 6. Chorus of Spirits │ 6. Bass Drop (Stun)  │ 6. Flashbang (Blind) │ 6. Backup Singers    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Rhapsody Nova     │ 7. Wall of Sound(Bar)│ 7. Swashbuckle Dash  │ 7. Mic Drop (AoE)    │
 │ 8. Symphony of Storms│ 8. Amplifier Pylon   │ 8. Firework Finale   │ 8. Rock Legend (Form)│
 │ 9. Magnum Opus (Cap) │ 9. Sonic Boom (Cap)  │ 9. Bladestorm Waltz  │ 9. The Grand Finale  │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Songs (Melodies, Hymns & Party Auras)
* **Row 0 (Lv 1 - Notes & Restorative Hymns)**:
  1. **Plucked Note** (Lv 1 · Projectile Generator) — Basic melodic projectile generating 1 Musical Note charge on hit with zero mana cost.
  2. **Hymn of Mending** (Lv 1 · Aura/Song) — *Passive*: Restores 2% health per second to all party members. *Active*: Instantly pulses a 25% max HP shield to all nearby allies (25s CD).
  3. **Ballad of Valor** (Lv 6 · Aura/Song) — *Passive*: Increases party Attack Power and Spell Power by 20%. *Active*: Emits an inspiring flourish granting +40% Critical Strike Damage for 6s (30s CD).
* **Row 1 (Lv 12 - Swiftness, Sorrow & Spirit Choir)**:
  4. **Song of Swiftness** (Lv 12 · Aura/Song) — *Passive*: Increases movement and attack speed by 25%. *Active*: Removes all movement slowing effects and grants +50% sprint for 4s.
  5. **Dirge of Sorrow** (Lv 12 · Hex Song) — Melancholic song slowing enemies by 40% and decreasing their damage by 30%.
  6. **Chorus of Spirits** (Lv 16 · Summoned Choir) — Summons an ethereal choir that echoes the Bard's active songs and heals nearby allies.
* **Row 2 (Lv 24 - Harmonic Novas & Magnum Opus)**:
  7. **Rhapsody Nova** (Lv 20 · Harmonic Blast) — Erupts in a joyous harmonic blast that stuns nearby enemies for 2s and buffs allies with instant mana.
  8. **Symphony of Storms** (Lv 24 · Electrical Song) — *Passive*: Adjacent enemies are struck by lightning notes every 2s. *Active*: Calls down a chain lightning torrent.
  9. **Magnum Opus** (Lv 30 · Musical Masterpiece Capstone) — Epic musical climax maximizing all party stats and granting 5 seconds of total invulnerability.

### Tree 1: Sonic Arts (Acoustic Force, Riffs & Shockwaves)
* **Row 0 (Lv 1 - Power Chords & Echoes)**:
  1. **Power Chord** (Lv 1 · Cone Spender) — Heavy acoustic blast hitting enemies in a frontal cone with knockback and high physical damage.
  2. **Echo** (Lv 1 · Bouncing Missile) — Projectile that rebounds off targets, triggering sound echoes on each impact that hit adjacent foes.
  3. **Shockwave Riff** (Lv 6 · Ground Fissure) — Slams instrument down, sending a seismic shockwave fissure across the floor that trips enemies.
* **Row 1 (Lv 12 - Resonance Beams & Bass Drops)**:
  4. **Resonance Beam** (Lv 12 · Ultrasonic Channel) — Channeled ultrasonic beam that vibrates enemies, melting 40% of their physical armor over 3s.
  5. **Feedback Loop** (Lv 12 · Acoustic Orbit) — Orbiting acoustic waves that detonate when enemies get into melee range.
  6. **Bass Drop** (Lv 16 · Concussive Slam) — Targets an area and drops an immense sonic thud that flattens and stuns enemies for 2.5s.
* **Row 2 (Lv 24 - Sound Walls & Amplifiers)**:
  7. **Wall of Sound** (Lv 20 · Defensive Wave) — Sets up an acoustic sound barrier that blocks enemy missiles and pushes enemies back.
  8. **Amplifier Pylon** (Lv 24 · Deployable Gear) — Deploys an acoustic amplifier that doubles the size and damage of all passing sound waves.
  9. **Sonic Boom / Supersonic** (Lv 30 · Hypersonic Capstone) — Massive hypersonic detonation across the screen shattering monster armor and deafening all targets.

### Tree 2: Trickery (Stage Magic, Illusions & Pyrotechnics)
* **Row 0 (Lv 1 - Fans of Cards & Smoke Screens)**:
  1. **Fan of Notes / Daggers** (Lv 1 · Fan Spreader) — Tosses a spread of 5 razor-sharp sheet music or throwing cards.
  2. **Smoke Screen** (Lv 1 · Evasive Fog) — Vanishes in a puff of theatrical smoke, blinding enemies and granting 2s of total stealth.
  3. **Pyrotechnics** (Lv 6 · Flash Powder) — Tosses stage flash-powder causing a fiery explosion with high burn damage.
* **Row 1 (Lv 12 - Orbiting Notes & Mirror Illusions)**:
  4. **Dancing Notes Orbit** (Lv 12 · Defensive Satellites) — Swirling musical notes circling the Bard that parry melee attacks.
  5. **Mirror Images** (Lv 12 · Decoy Phantoms) — Summons 3 decoy illusions that mimic the Bard's actions and draw enemy aggro.
  6. **Flashbang** (Lv 16 · Theatrical Blind) — Blinds and disorients all enemies in a wide radius with theatrical flare for 3.5s.
* **Row 2 (Lv 24 - Swashbuckler Lunges & Bladestorms)**:
  7. **Swashbuckle Dash** (Lv 20 · Rapier Lunge) — Agile rapier lunge darting through enemies, dealing critical physical damage and applying bleed.
  8. **Firework Finale** (Lv 24 · Aerial Bombardment) — Launches a battery of multicolored aerial fireworks bombarding the area for 6s.
  9. **Bladestorm Waltz** (Lv 30 · Spinning Dance Capstone) — Graceful spinning dance slashing all surrounding enemies in a flurry while deflecting missiles.

### Tree 3: Grand Finale (Encores & Rock Legend)
* **Row 0 (Lv 1 - Radiant Notes & Spotlights)**:
  1. **Bright Note** (Lv 1 · Piercing Light) — High-energy radiant note piercing targets in a straight line.
  2. **Spotlight** (Lv 1 · Ground Focus) — Focuses a theatrical spotlight on the floor; allies inside deal +30% bonus damage.
  3. **Stage Dive** (Lv 6 · Airborne Leap) — Leaps through the air into an enemy pack, knocking them all down on landing.
* **Row 1 (Lv 12 - Drum Rolls & Crescendos)**:
  4. **Drum Roll** (Lv 12 · Channeled Build-Up) — Channeled rapid percussion building crescendo stacks before releasing a devastating nova.
  5. **Crescendo Wave** (Lv 12 · Expanding Sonic Wave) — Expanding wave whose damage multiplies the further it travels across the screen.
  6. **Backup Singers** (Lv 16 · Vocalist Minions) — Summons vocalists that shoot harmonizing musical missiles at enemies.
* **Row 2 (Lv 24 - Mic Drops & Stadium Rock)**:
  7. **Mic Drop** (Lv 20 · Impact AoE) — Slams down the microphone, unleashing an ear-splitting shockwave.
  8. **Rock Legend Form** (Lv 24 · Electrified Transformation) — Becomes an electrified rock icon with pyrotechnic guitar solos and +40% move speed.
  9. **The Grand Finale** (Lv 30 · Concert Capstone) — Supreme climactic rock concert filling the entire arena with fireworks, lightning, and sound.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Songs (Melodic Mastery)
* **Tier 1 (Lv 1 - Foundation)**: *Perfect Pitch* (5 ranks) — +7% Arcane/Holy Damage, +15% Song Aura Radius, +10% Buff Potency per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Plucked Note)**:
  * **Choice A (Harmonic Triad)**: Plucked Note fires 3 harmonizing notes in a fan that converge on the target point.
  * **Choice B (Piercing Cadence)**: Plucked Note pierces all enemies and leaves behind a trail of healing notes for allies.
* **Tier 3 (Lv 24 - Synergy)**: *Encore Rhythm* (5 ranks) — Activating a Song immediately refunds 30% of its mana and grants +20% Attack Speed.
* **Tier 4 (Lv 40 - A/B Skill Morph: Hymn of Mending)**:
  * **Choice A (Anthem of Rejuvenation)**: Hymn of Mending also restores 3% mana and stamina per second to all party members.
  * **Choice B (Martyr's Hymn)**: When an ally drops below 30% HP, Hymn of Mending triggers an emergency 50% max HP shield.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Conductor of the Ages)**: You can play 2 Song Auras simultaneously; aura range increased by 100%.
  * **Choice B (Orchestral Climax)**: Activating a Song's surge triggers an automatic Symphony of Storms strike on all enemies.

### Branch 1: Sonic Arts (Acoustic Destruction)
* **Tier 1 (Lv 1 - Foundation)**: *Acoustic Velocity* (5 ranks) — +7% Physical/Sonic Damage, +15% Shockwave Range, +10% Stun Duration per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Power Chord)**:
  * **Choice A (Shatter Riff)**: Power Chord shatters enemy armor by 50% and causes targets to bleed from internal vibration.
  * **Choice B (Distortion Blast)**: Power Chord converts to Lightning, releasing electrical arcs to all adjacent enemies.
* **Tier 3 (Lv 24 - Synergy)**: *Resonant Frequency* (5 ranks) — Stunned or knocked back enemies take +40% increased sonic damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Bass Drop)**:
  * **Choice A (Sub-Woofer Quake)**: Bass Drop creates an ongoing earthquake that continuously trips and knocks down enemies for 4s.
  * **Choice B (Concussive Detonation)**: Bass Drop area doubled; enemies hit are deafened and silenced for 5 seconds.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Amplified Supercluster)**: You can place 2 Amplifiers simultaneously; sound waves passing through are quadrupled in damage.
  * **Choice B (Heavy Metal Overdrive)**: Sonic abilities consume stamina instead of mana and grant 50% damage reduction while channeling.

### Branch 2: Trickery (Stage Illusion & Pyrotechnics)
* **Tier 1 (Lv 1 - Foundation)**: *Sleight of Hand* (5 ranks) — +3% Dodge Chance, +6% Crit Chance, +5% Move Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Pyrotechnics)**:
  * **Choice A (Confetti Shrapnel)**: Pyrotechnics releases explosive razor confetti that bleeds and blinds all targets for 4s.
  * **Choice B (Magnesium Flash)**: Pyrotechnics converts to blinding white fire, igniting the floor for 8 seconds.
* **Tier 3 (Lv 24 - Synergy)**: *Showmanship* (5 ranks) — Dodging an attack automatically drops an armed Flashbang and grants 3s of stealth.
* **Tier 4 (Lv 40 - A/B Skill Morph: Mirror Images)**:
  * **Choice A (Hall of Mirrors)**: Summons 5 illusions instead of 3; illusions cast genuine damaging Power Chords.
  * **Choice B (Volatile Phantoms)**: When illusions expire or are killed, they detonate in a massive Firework Finale.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Master Illusionist)**: Taking fatal damage instead swaps places with a decoy image, healing you to 50% HP (2m CD).
  * **Choice B (The Show Must Go On)**: Every critical hit reduces all Trickery cooldowns by 1.5 seconds.

---

## 6. Build Archetypes & Character Variety
1. **Heavy Metal Sonic Shredder**: Sonic Arts with Shatter Riff + Sub-Woofer Quake + Amplified Supercluster. Devastating staggering sound waves.
2. **Virtuoso Party Conductor**: Songs branch with Harmonic Triad + Anthem of Rejuvenation + Conductor of the Ages. The ultimate co-op support build.
3. **Pyrotechnic Acrobat / Swashbuckler**: Trickery branch with Confetti Shrapnel + Hall of Mirrors. Extreme mobility, stealth, and firework burst.
4. **Grand Arena Headliner**: Combines Rock Legend and Stage Dive for high-energy battle-bard gameplay.
