# Totem Master: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by the tribal nature mystics of *Diablo II* (Elemental Druid) and *Classic ARPG Shamanism*, the Totem Master commands the raw primordial forces of earth, wind, fire, and storm through sacred carved conduits. The combat loop centers on **strategic totem deployment (Pylons & Batteries)**, **elemental shock cycling**, and **communing with ancestral spirit animals**.

### The Four Iconic Archetypes:
1. **The Totemic Architect (Pylons, Turrets & Ground Denials)**: Deploys offensive and defensive pylons (*Elemental Totem, Healing Stream, Stoneclaw, Magma Totem*). Turns any room into an automated kill-zone.
2. **The Ancestral Shaman (Spirit Beasts & Guardians)**: Calls forth spectral wolves, spirit bears, and ghostly chieftains (*Spirit Wolf, Ancestral Guardian, Spirit Walk, Council of Elders*).
3. **The Primal Elementalist (Lightning, Shocks & Earthquakes)**: High-burst elemental spellcasting (*Elemental Shock, Chain Lightning, Lava Burst, Earthquake*). Alternates elements for explosive overload combos.
4. **The Spirit Walker (Astral Transmutation & Phase Steps)**: Bends the boundary between physical and spirit planes (*Ghostpalm Strike, Soul Drum, Spirit Chain, Astral Ascendance*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **25 Separate Totem & Minion Summons**: A player was drowned in 15+ individual totem buttons (*Searing Totem, Healing Totem, Stoneclaw Totem, Storm Totem, Frost Totem, Windfury Totem, Magma Totem, Venom Totem, Spirit Link Totem, Thunderhead Totem, Ancestral Pillar, Earthbind Totem, Grand Totem, Volcano Totem, Pantheon, Ghost Totem*). Managing 15 totem buttons on a hotbar was unplayable!
* **Elemental Shock Duplication**: Separate buttons for Earth Shock, Flame Shock, Frost Shock, and Static Shock that were all minor color variants.
* **Spirit Beast Clones**: Redundant separate buttons for Spirit Wolf, Ghost Wolves, Spirit Bear, and Wolf Pack Alpha.
* **Fallback Talents**: Totem Master was falling back to Paladin talents in `talents.js`! It had zero genuine shamanic talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Grand Totemic Cataclysm)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Grand Totemic Cataclysm!**
> 
> * **The Class Ultimate (`Grand Totemic Cataclysm` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; calls down an enormous ancestral monolith that radiates continuous storm lightning, magma bursts, and spirit shockwaves across the entire screen.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Grand Pantheon Totem* (multi-element battery), *Council of Elders* (chieftain summons), and *Avatar of Storms* (ascendant storm state) are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                     TOTEM MASTER ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Totems       │ Tree 1: Ancestors    │ Tree 2: Earth & Storm│ Tree 3: Spirit Walk  │
 │ (Pylons & Constructs)│ (Spirits & Beasts)   │ (Shamanic Elements)  │ (Astral & Trance)    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Elemental Totem   │ 1. Spirit Wolf (Pet) │ 1. Elem Shock (Gen)  │ 1. Ghostpalm (Melee) │
 │ 2. Healing Stream    │ 2. Ancestral Bolt    │ 2. Lightning Bolt    │ 2. Wisp Bolt (Proj)  │
 │ 3. Stoneclaw (Taunt) │ 3. Spirit Shield     │ 3. Chain Lightning   │ 3. Ancestral Step    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Windfury Totem    │ 4. Hex (Polymorph)   │ 4. Primal Stomp (AoE)│ 4. Soul Drum (Aura)  │
 │ 5. Earthbind Totem   │ 5. Ancestral Guardian│ 5. Lava Burst (Crit) │ 5. Spirit Chain (Link│
 │ 6. Totemic Recall    │ 6. Spirit Walk (Phase│ 6. Thunderstorm (Puls│ 6. Ghostly Gale      │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Magma Totem       │ 7. Rebirth (Cleanse) │ 7. Earthquake (Chasm)│ 7. Totem Transmute   │
 │ 8. Spirit Link Totem │ 8. Spirit Bear (Tank)│ 8. Earthen Wall (Bar)│ 8. Ancestral Wrath   │
 │ 9. Grand Pantheon(Cap│ 9. Council Elders(Cap│ 9. Avatar Storms(Cap)│ 9. Astral Ascendance │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Totems (Primordial Pylons & Deployables)
* **Row 0 (Lv 1 - The Core Pylons)**:
  1. **Elemental Totem** (Lv 1 · Attack Pylon) — Deploys a totem that fires rapid elemental bolts at nearby enemies within 12m.
  2. **Healing Stream Totem** (Lv 1 · Restorative Pylon) — Deploys a water totem that pulses healing waves to all nearby allies every 2 seconds.
  3. **Stoneclaw Totem** (Lv 6 · Taunt Pylon) — Deploys an earth totem that pulses a taunting wave, drawing enemy attacks and absorbing damage.
* **Row 1 (Lv 12 - Auras, Slows & Reclamation)**:
  4. **Windfury Totem** (Lv 12 · Combat Aura Pylon) — Imbues nearby party weapons with wind: grants +25% attack speed and a 20% chance for melee hits to strike twice.
  5. **Earthbind Totem** (Lv 12 · Crowd Control Pylon) — Emits periodic seismic waves that slow all enemies within 10 meters by 60% and roots them for 1.5s.
  6. **Totemic Recall** (Lv 16 · Utility Active) — Instantly destroys all active totems, refunding 50% of their mana cost and triggering an elemental burst.
* **Row 2 (Lv 24 - Magma Artillery & The Grand Pantheon)**:
  7. **Magma / Volcano Totem** (Lv 20 · Mortar Pylon) — Heavy fire totem that lobs explosive volcanic rocks at clustered enemy packs.
  8. **Spirit Link Totem** (Lv 24 · Damage Redistribution) — Links all allies in its zone; damage taken is redistributed equally across the party, preventing one-shots.
  9. **Grand Pantheon Totem** (Lv 30 · Deployable Capstone) — Deploys an immense four-faced totem that channels Fire, Cold, Lightning, and Earth strikes simultaneously.

### Tree 1: Ancestors (Spiritual Communion & Phantoms)
* **Row 0 (Lv 1 - Spirit Wolves & Wards)**:
  1. **Spirit Wolf** (Lv 1 · Phantom Pets) — Summons two ethereal spirit wolves that flank enemies and bite with frost damage.
  2. **Ancestral Bolt** (Lv 1 · Piercing Projectile) — Hurls a swirling ghost bolt that pierces enemies and reduces their magic resistance by 25%.
  3. **Spirit Shield** (Lv 6 · Defensive Ward) — Surrounds the shaman in revolving spirit skulls that absorb damage and damage attackers.
* **Row 1 (Lv 12 - Hexes, Guardians & Phasing)**:
  4. **Hex** (Lv 12 · Polymorph Curse) — Transforms an elite or monster into a harmless toad for 4 seconds, disabling all attacks and spells.
  5. **Ancestral Guardian** (Lv 12 · Heavy Spirit) — Summons a ghostly chieftain wielding a greatstone hammer that crushes armor.
  6. **Spirit Walk** (Lv 16 · Phase Mobility) — Enters the spirit realm for 2.5s: gains 100% movement speed, passes through enemies, and becomes untargetable.
* **Row 2 (Lv 24 - Spirit Bears & The High Council)**:
  7. **Rebirth / Spirit Cleanse** (Lv 20 · Cleanse/Heal) — Dispels all debuffs from allies and restores 35% health; passive cheat-death on lethal hit (3m CD).
  8. **Spirit Bear** (Lv 24 · Heavy Tank) — Summons an ancient spectral bear that roars, stuns surrounding enemies, and absorbs 35% of damage taken by the Shaman.
  9. **Council of Elders** (Lv 30 · Summon Capstone) — Calls down 3 ancient chieftains who cast Chain Lightning, Earthquakes, and Warcries for 25s.

### Tree 2: Earth & Storm (Shamanic Elements & Overloads)
* **Row 0 (Lv 1 - Shocks & Bolts)**:
  1. **Elemental Shock** (Lv 1 · Instant Spender) — Instant burst projectile dealing high elemental damage and interrupting enemy spellcasting.
  2. **Lightning Bolt** (Lv 1 · Linear Strike) — High-voltage linear bolt with extreme critical strike multiplier.
  3. **Chain Lightning** (Lv 6 · Bouncing Arc) — Arcs across up to 5 enemies, jumping between clustered targets with crackling electricity.
* **Row 1 (Lv 12 - Stomps, Lava Bursts & Ambient Storms)**:
  4. **Primal Stomp** (Lv 12 · Shockwave Nova) — Slams the ground with primal power, knocking enemies back and generating Spirit.
  5. **Lava Burst** (Lv 12 · Molten Crit) — Hurls molten lava; guaranteed to critically strike if the target is shocked or burning.
  6. **Thunderstorm** (Lv 16 · Storm Aura) — Surrounds the Shaman in lightning clouds that automatically strike random nearby enemies with thunderbolts.
* **Row 2 (Lv 24 - Earthquakes & Ascendance)**:
  7. **Earthquake** (Lv 20 · Ground Hazard) — Violent tremors shake the earth for 6s, dealing physical damage and disrupting enemy channeling.
  8. **Earthen Wall** (Lv 24 · Solid Barrier) — Raises a barrier of solid stone from the earth to block pathing and missiles.
  9. **Avatar of Storms** (Lv 30 · Form Capstone) — Transforms into an Ascendant Storm Elemental: spells have zero cast time and trigger chain lightning novas.

### Tree 3: Spirit Walk (Astral Arts & Tribal Rhythms)
* **Row 0 (Lv 1 - Melee Spirits & Wisps)**:
  1. **Ghostpalm Strike** (Lv 1 · Melee Generator) — Melee spirit strike that drains enemy mana and builds Spirit energy.
  2. **Wisp Bolt** (Lv 1 · Seeking Spark) — Fast seeking orb of spirit essence that explodes on contact into spectral sparks.
  3. **Ancestral Step** (Lv 6 · Totem Warp) — Teleports instantly to the location of any active totem, unleashing a shockwave.
* **Row 1 (Lv 12 - Drums, Chains & Gales)**:
  4. **Soul Drum** (Lv 12 · Channeled Rhythm) — Channeled tribal drum rhythm that pulses party attack speed and stamina.
  5. **Spirit Chain** (Lv 12 · Enemy Link) — Binds up to 5 enemies together with golden spirit tether; 40% of damage dealt to one is mirrored to all.
  6. **Ghostly Gale** (Lv 16 · Wind Channel) — Channeled windstorm pushing enemies away and deflecting projectiles.
* **Row 2 (Lv 24 - Transmutation & Astral Flight)**:
  7. **Totemic Transmutation** (Lv 20 · Pylon Mobile Form) — Transforms all active totems into mobile elemental spirits that follow you for 15s.
  8. **Ancestral Wrath** (Lv 24 · Spirit Pillar) — Calls down an enormous celestial spirit totem that crushes the target zone.
  9. **Astral Ascendance** (Lv 30 · Transcendent Capstone) — Fully enters the Astral Realm, allowing simultaneous casting while moving at full speed.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Totems (The Totemic Architect)
* **Tier 1 (Lv 1 - Foundation)**: *Totemic Resonance* (5 ranks) — +8% Totem Health, +15% Totem Aura Radius, +10% Totem Duration per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Elemental Totem)**:
  * **Choice A (Gatling Storm Pylon)**: Elemental Totem converts to pure Lightning, firing rapid-fire chain sparks at up to 3 targets.
  * **Choice B (Magma Mortar Battery)**: Elemental Totem converts to Fire Mortar, launching explosive magma shells that leave burning ground.
* **Tier 3 (Lv 24 - Synergy)**: *Totemic Harmony* (5 ranks) — Having 3 or more totems active grants the party +20% damage and +15% damage reduction.
* **Tier 4 (Lv 40 - A/B Skill Morph: Healing Stream Totem)**:
  * **Choice A (Cleansing Torrent)**: Healing Stream Totem also dispels all poisons, bleeds, and curses on every pulse.
  * **Choice B (Mana & Energy Fountain)**: Healing Stream Totem restores 5% mana and energy per pulse to all allies.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Totemic Projection)**: You can place 2 of every totem type simultaneously; totems can be freely relocated with a click.
  * **Choice B (Living Effigies)**: When totems expire or are recalled, they explode in an elemental cataclysm dealing 400% damage.

### Branch 1: Ancestors (The Spirit Caller)
* **Tier 1 (Lv 1 - Foundation)**: *Spiritual Attunement* (5 ranks) — +8% Spirit Minion Damage, +8% Spirit Minion Health, +15 Max Mana per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Spirit Wolves)**:
  * **Choice A (Ghost Wolf Pack)**: Summons 4 Spirit Wolves instead of 2; their attacks slow and freeze enemies.
  * **Choice B (Feral Alpha Colossus)**: Combines wolves into a single colossal Shadow Dire Wolf that taunts and cleaves.
* **Tier 3 (Lv 24 - Synergy)**: *Ancestral Guidance* (5 ranks) — When you cast a spell, your Ancestral Guardian casts a duplicate copy.
* **Tier 4 (Lv 40 - A/B Skill Morph: Spirit Walk)**:
  * **Choice A (Phantom Shift)**: Spirit Walk duration doubled; you can pass through walls and enemies, dealing damage to anyone you cross.
  * **Choice B (Spectral Rejuvenation)**: Entering Spirit Walk instantly heals you for 40% max HP and grants 3s of invulnerability.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Great Shaman)**: Spirit Beasts never expire and respawn automatically 5 seconds after death.
  * **Choice B (Ancestral Fusion)**: Merge with your Ancestral Guardian for 20s, gaining 100% Armor and double spell damage.

### Branch 2: Earth & Storm (The Primal Elementalist)
* **Tier 1 (Lv 1 - Foundation)**: *Primal Overload* (5 ranks) — +7% Lightning/Earth/Fire Damage, +3% Cast Speed, +8% Critical Damage per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Chain Lightning)**:
  * **Choice A (Overload Cascade)**: Chain Lightning jumps to 8 targets and leaves an electrified zone on every target struck.
  * **Choice B (Focused Thunderbolt)**: Chain Lightning bounces between the primary target and the shaman, supercharging single-target DPS.
* **Tier 3 (Lv 24 - Synergy)**: *Elemental Equilibrium* (5 ranks) — Alternating between Fire, Lightning, and Earth spells grants +25% bonus damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Earthquake)**:
  * **Choice A (Chasm of Magma)**: Earthquake fissures open with liquid lava, dealing intense fire burn damage.
  * **Choice B (Tectonic Prison)**: Earthquake surrounds the perimeter with stone pillars that trap enemies inside.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Stormbringer)**: Lightning and Shock spells have a 30% chance to immediately trigger an instant free Lava Burst.
  * **Choice B (Earth Mother's Blessing)**: Shamanic spells ignore 50% of enemy magic resistances and grant an earthen shield for 20% of damage dealt.

---

## 6. Build Archetypes & Character Variety
1. **Pylon Battery Commander**: Maximize Totems branch with Gatling Storm Pylon + Totemic Projection. Covers arenas with automated elemental batteries.
2. **Ancestral Spirit Packmaster**: Maximize Ancestors branch with Ghost Wolf Pack + Living Effigies + Great Shaman. Fights alongside persistent spirit allies.
3. **Storm & Magma Shaman**: Maximize Earth & Storm branch with Overload Cascade + Stormbringer for thunderous elemental spellcasting.
4. **Shamanic Support / Healer**: Cleansing Torrent + Mana Fountain + Spirit Link for elite party defense.
