# Death Knight: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by the dark chivalric juggernauts of classic dark fantasy ARPGs (and the iconic *Frost, Blood, and Unholy* archetypes), the Death Knight is an unholy engine of winter, pestilence, and vampiric attrition. The combat loop revolves around **Runic Power generation and expenditure**, **disease spreading (*Blood Plague, Frost Fever*)**, unyielding self-healing (*Death Strike*), and the relentless command of the grave.

### The Four Iconic Archetypes:
1. **The Frost Obliterator (Dual-Wield & Two-Handed Glacial Burst)**: Shatters frozen enemies with massive critical strikes and swirling blizzards (*Frost Strike, Obliterate, Howling Blast, Remorseless Winter*).
2. **The Blood Juggernaut (Vampiric Armor & Leech Tank)**: Feeds on the vitality of foes, building bone shields and manipulating gravity (*Blood Strike, Death Strike, Bone Shield, Death Grip*).
3. **The Unholy Plaguebearer (Diseases & Ghoul Legions)**: Afflicts rooms with necrotic infections and directs mutated abomination minions (*Plague Strike, Death Coil, Raise Ghoul, Dark Transformation, Defile*).
4. **The Runeblade Master (Spectral Weapons & Forged Runes)**: Weaves spectral blades, parries incoming blows, and unleashes runic executions (*Rune Strike, Spectral Scythe, Blades of Fallen King*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **14 Melee Strike Clones**: Melee attacks were diluted across dozens of near-identical strikes (*Icy Touch, Death Strike, Obliterate, Scythe, Frost Strike, Soul Cleave, Blood Strike, Marrowrend, Heart Strike, Death's Caress, Rune Strike, Runic Cleave, Rune Sunder*).
* **11 Buff Presences & Shields**: Overlapping defensive toggles (*Frost Presence, Blood Presence, Unholy Presence, Icebound Fortitude, Bone Shield, Vampiric Blood, Anti-Magic Shell, Rune Ward, Lichborne*).
* **Duplicate Frost/Blood Novas**: Minor AoE pulse duplicates (*Howling Blast, Remorseless Winter, Blood Boil, Death Nova, Pestilence*).
* **Fallback Talents**: Death Knight was falling back to Paladin talents in `talents.js`! It lacked genuine dark knight talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Glacial Oblivion)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Glacial Oblivion!**
> 
> * **The Class Ultimate (`Glacial Oblivion` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 Runic Power**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; freezes the earth in an abyssal glacier, impaling all monsters with giant ice spikes that shatter for catastrophic cold damage.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Sindragosa's Fury* (summoning a frost wyrm strafe), *Army of the Dead* (swarming ghoul army), and *Blooddrinker / Purgatory* are standard high-tier spenders/transformations.
>   * They cost Runic Power/Runes, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                    DEATH KNIGHT ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Frost        │ Tree 1: Unholy       │ Tree 2: Blood        │ Tree 3: Runeblade    │
 │ (Glacial Obliteration│ (Plagues & Ghouls)   │ (Vampirism & Grip)   │ (Spectral Runes)     │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Frost Strike (Gene│ 1. Plague Strike     │ 1. Blood Strike (Gen)│ 1. Rune Strike (Gen) │
 │ 2. Howling Blast     │ 2. Death Coil (Spende│ 2. Death Strike(Leech│ 2. Runic Shield      │
 │ 3. Chains of Ice(Slow│ 3. Raise Ghoul (Pet) │ 3. Bone Shield (Armor│ 3. Spectral Scythe   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Obliterate (Heavy)│ 4. Pestilence (Spread│ 4. Death Grip (Pull) │ 4. Runic Empower     │
 │ 5. Icebound Fortitude│ 5. Anti-Magic Shell  │ 5. Blood Boil (AoE)  │ 5. Death's Caress    │
 │ 6. Remorseless Winter│ 6. Dark Transform    │ 6. Vampiric Blood    │ 6. Rune Tap (Heal)   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Horn of Winter    │ 7. Defile (Decay Zone│ 7. Gorefiend's Grasp │ 7. Blades of Fallen  │
 │ 8. Glacial Advance   │ 8. Summon Gargoyle   │ 8. Dancing Runeblade │ 8. Soul Reaper (Exec)│
 │ 9. Sindragosa (Cap)  │ 9. Army of Dead (Cap)│ 9. Purgatory (Cap)   │ 9. Apoc. Runeblade   │
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Frost (Glacial Runes & Obliteration)
* **Row 0 (Lv 1 - Chilled Strikes & Freezing Blasts)**:
  1. **Frost Strike** (Lv 1 · Melee Generator) — Chilled melee attack applying Frost Fever and generating 15 Runic Power.
  2. **Howling Blast** (Lv 1 · Ranged Ice Blast) — Icy blast hitting a target and surrounding enemies, slowing their movement by 40%.
  3. **Chains of Ice** (Lv 6 · Target Shackle) — Shackles an enemy with icy fetters, reducing move speed by 70% and pulling them to a halt.
* **Row 1 (Lv 12 - Two-Handed Obliteration & Defensive Ice)**:
  4. **Obliterate** (Lv 12 · Heavy Spender) — Brutal two-handed strike consuming Runic Power to deal massive physical/frost critical damage.
  5. **Icebound Fortitude** (Lv 12 · Defensive Stance) — Freezes the blood, breaking all active stuns and reducing all damage taken by 40% for 8s.
  6. **Remorseless Winter** (Lv 16 · Orbiting Blizzard) — Swirling blizzard surrounding the Death Knight, ramping up in damage and freezing foes.
* **Row 2 (Lv 24 - Glacial Spikes & Wyrm Bombardment)**:
  7. **Horn of Winter** (Lv 20 · Combat Horn) — Blows a frozen horn that restores full Runic Power and grants party +20% Attack Power.
  8. **Glacial Advance** (Lv 24 · Linear Spikes) — Glacial spikes shoot forward along the floor, impaling and knocking down enemies in a line.
  9. **Sindragosa's Fury** (Lv 30 · Screen Wipe Capstone) — Calls down a colossal frost wyrm that strafes the entire screen in glacial frost.

### Tree 1: Unholy (Diseases, Scourge & Undead Command)
* **Row 0 (Lv 1 - Diseases & Death Coils)**:
  1. **Plague Strike** (Lv 1 · Melee Generator) — Vile strike infecting the victim with Blood Plague and Virulent Disease over 8s.
  2. **Death Coil** (Lv 1 · Ranged Spender) — Hurls unholy energy at an enemy to damage them, or at an allied undead minion to heal them.
  3. **Raise Ghoul** (Lv 6 · Undead Companion) — Summons a ravenous ghoul minion that claws foes, leaps at targets, and draws aggro.
* **Row 1 (Lv 12 - Disease Spreading & Transformations)**:
  4. **Pestilence** (Lv 12 · Disease Spread) — Spreads all active diseases from a primary target to all surrounding enemies within 12m.
  5. **Anti-Magic Shell** (Lv 12 · Spell Barrier) — Surrounds the Death Knight in a green barrier that absorbs all magical damage and converts it to Runic Power.
  6. **Dark Transformation** (Lv 16 · Minion Mutate) — Injects your Ghoul with unholy plague, transforming it into a monstrous Abomination with cleave attacks.
* **Row 2 (Lv 24 - Corrupted Ground & Undead Armies)**:
  7. **Defile / Death & Decay** (Lv 20 · Ground Hazard) — Corrupts the ground beneath enemies, dealing escalating shadow damage and expanding with each hit.
  8. **Summon Gargoyle** (Lv 24 · Aerial Minion) — Summons an aerial stone gargoyle that bombards targets with rapid unholy shadow bolts.
  9. **Army of the Dead** (Lv 30 · Mass Summon Capstone) — Summons a relentless legion of ghouls from the grave to overwhelm bosses.

### Tree 2: Blood (Vampirism, Armor & Bone Barriers)
* **Row 0 (Lv 1 - Sanguine Strikes & Leech)**:
  1. **Blood Strike / Heart Strike** (Lv 1 · Melee Generator) — Sanguine strike hitting up to 3 enemies and generating Blood Runes.
  2. **Death Strike** (Lv 1 · Iconic Leech Spender) — **The Legendary ARPG Tank Spender**: Focuses dark power into a strike that heals for 25% of all damage taken in the last 5 seconds.
  3. **Bone Shield** (Lv 6 · Defensive Orbit) — Conjures a ring of whirling bones around the Death Knight, granting +30% Armor and damage reduction.
* **Row 1 (Lv 12 - Death Grip & Blood Boils)**:
  4. **Death Grip** (Lv 12 · The Iconic Pull) — **The Definitive Death Knight Tool**: Harnesses dark gravity to pull a distant enemy directly to melee range and taunt them.
  5. **Blood Boil** (Lv 12 · Radial Burst) — Boils the blood of all nearby enemies, dealing shadow damage and infecting them with Blood Plague.
  6. **Vampiric Blood** (Lv 16 · Health Buff) — Increases maximum health by 30% and amplifies all healing received by 40% for 10s.
* **Row 2 (Lv 24 - Mass Grips & Purgatory)**:
  7. **Gorefiend's Grasp** (Lv 20 · Mass Vacuum) — Mass Death Grip pulling all enemies within 15 meters to a central target point.
  8. **Dancing Rune Weapon** (Lv 24 · Phantom Clone) — Summons a phantom runeblade that mirrors all of your melee attacks and parries strikes.
  9. **Purgatory / Blooddrinker** (Lv 30 · Cheat-Death Capstone) — Passive shroud preventing fatal damage (shrouds in blood for 4s); active cast siphons boss life directly.

### Tree 3: Runeblade (Spectral Weaponry & Forged Runes)
* **Row 0 (Lv 1 - Runic Blows & Barriers)**:
  1. **Rune Strike** (Lv 1 · Melee Generator) — Empowered runic blow that cannot be dodged or parried.
  2. **Runic Shield** (Lv 1 · Absorptive Ward) — Absorptive barrier forged from dormant runic energy.
  3. **Spectral Scythe** (Lv 6 · Ethereal Cleave) — Conjures an ethereal scythe that cleaves through an entire pack in front of you.
* **Row 1 (Lv 12 - Rhythm & Runic Taps)**:
  4. **Runic Empowerment** (Lv 12 · Active Refresh) — Passive/active rhythm skill that refreshes exhausted runes instantly.
  5. **Death's Caress** (Lv 12 · Ranged Tendril) — Long-range spectral tendril applying bone shields and damaging foes.
  6. **Rune Tap** (Lv 16 · Emergency Heal) — Consumes a Blood Rune to instantly restore 20% health and gain damage resistance.
* **Row 2 (Lv 24 - Orbiting Blades & Executions)**:
  7. **Blades of the Fallen King** (Lv 20 · Orbiting Swords) — Orbiting runeblades that shred adjacent armor and parry attacks.
  8. **Soul Reaper** (Lv 24 · Execution Strike) — Executes a wounded target; detonates for massive shadowfrost damage if the target dies within 5s.
  9. **Apocalyptic Runeblade** (Lv 30 · Weapon Capstone) — Forges a titanic runic greatsword unleashing waves of pure obliteration.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Frost (The Frozen Wastes)
* **Tier 1 (Lv 1 - Foundation)**: *Rime & Glaciers* (5 ranks) — +7% Cold Damage, +8% Critical Strike Damage, +15 Runic Power Max per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Howling Blast)**:
  * **Choice A (Freezing Fog)**: Howling Blast leaves a lingering frost fog that continuously chills and slows targets.
  * **Choice B (Avalanche Burst)**: Howling Blast causes a concussive ice explosion that shatters enemy armor by 35%.
* **Tier 3 (Lv 24 - Synergy)**: *Killing Machine* (5 ranks) — Auto-attacks have a 20% chance to make your next Obliterate or Frost Strike a guaranteed critical hit.
* **Tier 4 (Lv 40 - A/B Skill Morph: Remorseless Winter)**:
  * **Choice A (Gathering Storm)**: Each enemy hit increases Remorseless Winter's damage by 10% and extends its duration.
  * **Choice B (Biting Cold)**: Reaching 5 stacks of Remorseless Winter freezes all targets solid for 2.5 seconds.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Breath of Sindragosa)**: Continuously breathe frost damage in a frontal cone as long as Runic Power lasts.
  * **Choice B (Obliteration Engine)**: During Icebound Fortitude, Obliterate has no rune cost and cleaves 2 extra targets.

### Branch 1: Unholy (Plague & Scourge)
* **Tier 1 (Lv 1 - Foundation)**: *Epidemic* (5 ranks) — +7% Shadow/Poison Damage, +15% Disease Duration, +5% Minion Attack Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Death Coil)**:
  * **Choice A (Coil of Doom)**: Death Coil pierces through targets and explodes into shadow shrapnel on impact.
  * **Choice B (Siphon Life)**: Death Coil heals the Death Knight for 50% of damage dealt and refunds half its Runic Power cost.
* **Tier 3 (Lv 24 - Synergy)**: *Virulent Necrosis* (5 ranks) — Diseases tick 40% faster and have a chance to burst into mini-plague novas.
* **Tier 4 (Lv 40 - A/B Skill Morph: Dark Transformation / Ghoul)**:
  * **Choice A (Fleshcraft Abomination)**: The Abomination gains a butcher hook that drags ranged enemies into melee and vomits poison.
  * **Choice B (Volatile Ghoul Swarm)**: Ghoul explodes upon death, dealing 300% weapon damage and spawning 3 crawling zombies.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Master of the Scourge)**: Army of the Dead cooldown reduced by 50%; ghouls apply stacking virulent plagues on hit.
  * **Choice B (Unholy Blight)**: Defile follows the Death Knight as an unholy aura, dealing 200% damage and blinding enemies.

### Branch 2: Blood (Sanguine Juggernaut)
* **Tier 1 (Lv 1 - Foundation)**: *Vampiric Might* (5 ranks) — +6% Max Health, +6% Armor, +2% Life Leech per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Death Strike)**:
  * **Choice A (Voracious Leech)**: Death Strike heals for 50% more and grants a blood shield absorbing 15% max HP.
  * **Choice B (Heartbreaker Cleave)**: Death Strike cleaves all enemies in front and generates 2 extra Blood Runes on kill.
* **Tier 3 (Lv 24 - Synergy)**: *Bone Armor Mastery* (5 ranks) — Bone Shield grants +1.5% damage reduction per active charge (up to 10 charges).
* **Tier 4 (Lv 40 - A/B Skill Morph: Death Grip)**:
  * **Choice A (Grip of the Void)**: Death Grip resets its cooldown if the target dies within 4 seconds; grants 30% move speed.
  * **Choice B (Gorefiend's Pull)**: Death Grip pulls all enemies within 10 yards of the target together into a tight cluster.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Immortal Vampire)**: When taking fatal damage, instantly heal to 50% HP and become immune to damage for 4s (3m CD).
  * **Choice B (Crimson Scourge)**: Blood Boil and Defile have their damage increased by 100% and cause targets to bleed.

---

## 6. Build Archetypes & Character Variety
1. **Frost Obliteration DPS**: Dual-Wield / Two-Handed Frost tree with Obliterate + Killing Machine + Breath of Sindragosa. Massive burst criticals.
2. **Unholy Plague & Pet Commander**: Unholy tree with Fleshcraft Abomination + Virulent Necrosis + Master of the Scourge.
3. **Immortal Blood Tank**: Blood tree with Voracious Leech + Gorefiend's Pull + Immortal Vampire for unstoppable survivability.
4. **Shadowfrost Hybrid**: Combines Howling Blast with Defile and Death Coil for high-damage area rot and crowd control.
