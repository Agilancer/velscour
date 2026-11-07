# Dragon Knight: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by draconic warriors, molten juggernauts, and half-dragon champions, the Dragon Knight channels the primordial heat of the earth and the armored resilience of ancient wyrms. The combat loop centers on **continuous cone flamethrower breath**, **sweeping tail and claw combos**, **spiked scale armor and thorns retaliation**, and **taking flight in full dragon form**.

### The Four Iconic Archetypes:
1. **The Pyromancer Dragon (Flamethrower & Volcanic Magma)**: Incinerates entire rooms with sustained dragon breath and erupting fissures (*Fire Breath, Fireball Spit, Molten Fissure, Cataclysm of Flame*).
2. **The Armored Scale Behemoth (Carapace, Thorns & Tail Sweeps)**: Impenetrable walking fortress deflecting physical attacks and crushing monsters with tail swipes (*Dragon Claw, Dragon Scales, Tail Swipe, Spiked Carapace, Ironclad Wyrmform*).
3. **The Dragonflight Broodlord (Drakes & Aerial Sovereignty)**: Commands fire drakes, dives on wings, and transforms into a soaring Dragon King (*Drake Whelp, Dragon Wings Leap, Elder Red Drake, True Dragon Form*).
4. **The Astral Wyrmfire Ascendant (Cosmic Dragon Magic)**: Channels blue astral flame and calls down celestial scales (*Wyrmfire Thrust, Prism Breath, Wyrmfire Barrier, Sunfall Dragon Dive*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **13 Buffs and Auras**: Multiple overlapping fire defense, health, and damage steroid buffs (*Dragon Skin, Fire Aura, Draconic Might, Wyrm Scale, Flame Ward, Inferno Form, Dragon Blood, Dragon Heart, Dragon King, Dragon Armor, Molten Veins*).
* **9 Melee Dragon Strikes**: Repetitive claws and swipes (*Dragon Claw, Tail Swipe, Dragon Fang, Dragon Strike, Molten Blade, Dragon Cleave, Wyrm Fang, Dragon Rend, Cataclysmic Slash*).
* **9 Dragon Summons**: Excessive companion drake and whelp buttons (*Drake Whelp, Fire Drake, Wyrm Spirit, Red Dragon, Elder Wyrm, Dragon Brood, Obsidian Drake, Dragonflight*).
* **6 Dragon Breath Beams**: Near-identical channeled fire breath cones (*Fire Breath, Dragon Beam, Wyrm Breath, Inferno Breath, Molten Torrent, Wyrmfire Beam*).
* **Fallback Talents**: Dragon Knight was falling back to Paladin talents in `talents.js`! It lacked genuine draconic talents.

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Dragon's Inferno)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Dragon's Inferno!**
> 
> * **The Class Ultimate (`Dragon's Inferno` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; summons the avatar of an ancient fire dragon that washes the entire screen in waves of lethal primordial hellfire.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Cataclysm of Flame* (screen-wide rain), *Ironclad Wyrmform* (heavy tank state), and *True Dragon Form* are standard high-tier spenders/transformations.
>   * They cost mana/rage, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                   DRAGON KNIGHT ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Flame        │ Tree 1: Scale        │ Tree 2: Draconic     │ Tree 3: Wyrmfire     │
 │ (Breath & Pyromancy) │ (Carapace & Thorns)  │ (Broods & Wings)     │ (Astral Dragon Magic)│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Fire Breath (Chan)│ 1. Dragon Claw (Gen) │ 1. Drake Whelp (Pet) │ 1. Wyrmfire Thrust   │
 │ 2. Dragon Fang Strike│ 2. Dragon Scales(Def)│ 2. Dragon Wings Leap │ 2. Prism Breath      │
 │ 3. Fireball Spit     │ 3. Tail Swipe (Spin) │ 3. Blood Frenzy(Buff)│ 3. Meteor Impact     │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Flame Nova        │ 4. Dragon Charge     │ 4. Wyvern Spirit     │ 4. Wyrmfire Barrier  │
 │ 5. Molten Fissure    │ 5. Spiked Carapace   │ 5. Dragon Roar (Fear)│ 5. Dragon Tempest    │
 │ 6. Fire Aura         │ 6. Draconic Roar(Stun│ 6. Wyrm Coil Orbit   │ 6. Sovereign Roar    │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Magma Geyser      │ 7. Dragon Leap Slam  │ 7. Elder Red Drake   │ 7. Sunfall Dive      │
 │ 8. Inferno Breath    │ 8. Dragon Heart(Regen│ 8. Dragonflight Swarm│ 8. Avatar of Wyrm    │
 │ 9. Cataclysm Flame   │ 9. Ironclad Wyrm (Cap│ 9. True Dragon (Cap) │ 9. Judgment King(Cap)│
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Flame (Pyromancy, Fire Breath & Magma)
* **Row 0 (Lv 1 - Fire Breath, Fangs & Fireballs)**:
  1. **Fire Breath** (Lv 1 · Channeled Flamethrower) — **The Definitive Breath Weapon**: Channeled frontal cone of intense draconic fire incinerating foes.
  2. **Dragon Fang Strike** (Lv 1 · Melee Generator) — Heavy melee slash infused with fire, igniting the victim for 6s.
  3. **Fireball Spit** (Lv 6 · Lobbed Explosive) — Launches a volatile ball of condensed magma that explodes on contact into a splash zone.
* **Row 1 (Lv 12 - Novas, Fissures & Fire Auras)**:
  4. **Flame Nova** (Lv 12 · Radial Burst) — Radial burst of draconic fire pushing back surrounding enemies.
  5. **Molten Fissure** (Lv 12 · Ground Chasm) — Slams fists/sword into the ground, opening a volcanic magma fissure that burns enemies.
  6. **Fire Aura** (Lv 16 · Passive/Active Aura) — *Passive*: Continuously scorches adjacent enemies for fire damage. *Active*: Emits an explosive flame shockwave.
* **Row 2 (Lv 24 - Magma Geysers & Cataclysms)**:
  7. **Magma Geyser** (Lv 20 · Upward Eruption) — Erupts the ground beneath a target pack, launching them in fire.
  8. **Inferno Breath** (Lv 24 · Concentrated Beam) — Heavy concentrated beam breath that ramps up in heat and melts boss armor.
  9. **Cataclysm of Flame** (Lv 30 · Rain Capstone) — Calls down an apocalyptic fiery storm incinerating the screen for 8 seconds.

### Tree 1: Scale (Carapace, Defense & Tail Sweeps)
* **Row 0 (Lv 1 - Claws, Scales & Tail Sweeps)**:
  1. **Dragon Claw** (Lv 1 · Melee Generator) — Fast double swipe that shreds enemy armor and bleeds for physical damage.
  2. **Dragon Scales / Skin** (Lv 1 · Defensive Buff) — Hardens scales, boosting armor by 50%, elemental resistances by 30%, and max HP.
  3. **Tail Swipe** (Lv 6 · 360-Degree Spin) — 360-degree tail spin that knocks down all surrounding enemies.
* **Row 1 (Lv 12 - Horn Charges, Thorns & Stun Roars)**:
  4. **Dragon Charge** (Lv 12 · Forward Rush) — Forward rush with horns and shield, crushing enemies in a direct line.
  5. **Spiked Carapace** (Lv 12 · Thorns Retaliation) — Hardens scales into razor spikes, reflecting 150% of damage taken back as physical/fire thorns.
  6. **Draconic Roar** (Lv 16 · Stun Roar) — Terrifying bellow that stuns nearby enemies for 2.5s and lowers their attack power.
* **Row 2 (Lv 24 - Leaps, Dragon Hearts & Ironclad Wyrm)**:
  7. **Dragon Leap / Slam** (Lv 20 · Ground Slam) — Leaps high and crashes down with full armored weight, shaking the ground.
  8. **Dragon Heart** (Lv 24 · Sanguine Regeneration) — Surges draconic vitality, regenerating 10% health per second and boosting stamina for 10s.
  9. **Ironclad Wyrmform** (Lv 30 · Juggernaut Capstone) — Transforms into an impenetrable armored behemoth immune to all crowd control.

### Tree 2: Draconic (Dragon Summons & Wings)
* **Row 0 (Lv 1 - Drake Whelps & Wing Glides)**:
  1. **Drake Whelp** (Lv 1 · Fire Minion) — Summons a small loyal fire drake that spits fireballs at targets.
  2. **Dragon Wings Leap** (Lv 1 · Gliding Mobility) — Unfurls massive wings to glide forward and dodge incoming attacks.
  3. **Blood Frenzy** (Lv 6 · Combat Buff) — Sanguine draconic buff boosting attack speed by 35% and granting life on hit.
* **Row 1 (Lv 12 - Wyvern Spirits & Dragon Fear)**:
  4. **Wyvern Spirit** (Lv 12 · Phantom Dive) — Ethereal dragon spirit that dives through enemies in a line, causing terror.
  5. **Dragon Roar Fear** (Lv 12 · Area Panic) — Emits a disorienting screech that panics non-elite foes for 4s.
  6. **Wyrm Coil Orbit** (Lv 16 · Orbiting Spirits) — Fiery miniature dragon spirits orbiting the knight that parry strikes and burn attackers.
* **Row 2 (Lv 24 - Elder Drakes & True Dragon Form)**:
  7. **Elder Red Drake** (Lv 20 · Colossal Minion) — Summons a massive red dragon that breathes sustained firestorms onto enemies.
  8. **Dragonflight Swarm** (Lv 24 · Aerial Strafe) — Summons a flight of drakes that carpet-bomb the target corridor with fire.
  9. **True Dragon Form** (Lv 30 · Form Capstone) — Full transformation into a soaring Dragon Sovereign with flight, double health, and screen-wide breath.

### Tree 3: Wyrmfire Ascendant (Astral & Ancient Wyrm Magic)
* **Row 0 (Lv 1 - Astral Thrusts & Prism Breath)**:
  1. **Wyrmfire Thrust** (Lv 1 · Astral Strike) — Sweeping strike infused with blue/violet astral flame.
  2. **Prism Breath** (Lv 1 · Multi-Element Breath) — Multicolored dragon breath dealing both Fire and Arcane damage.
  3. **Meteor Impact** (Lv 6 · Celestial Scale) — Calls down a celestial dragon scale like a falling star.
* **Row 1 (Lv 12 - Barriers, Tempests & Sovereign Roars)**:
  4. **Wyrmfire Barrier** (Lv 12 · Spell Deflection) — Cosmic ward deflecting incoming magical projectiles.
  5. **Dragon Tempest** (Lv 12 · Fire Cyclone) — Whirlwind of fire and wind lifting and scorching enemies.
  6. **Sovereign Roar** (Lv 16 · Radiant Execution) — Radiant blast that executes low-health enemies instantly.
* **Row 2 (Lv 24 - Sunfall Dives & Dragon King)**:
  7. **Sunfall Dragon Dive** (Lv 20 · Solar Plunge) — Aerial dive trailing solar fire and devastating the impact zone.
  8. **Avatar of the Wyrm** (Lv 24 · Ancient State) — Enters an ancient avatar state, empowering all elemental skills.
  9. **Judgment of the Dragon King** (Lv 30 · Ancestral Capstone) — Calls upon the ancient dragon ancestors to scour the earth.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Flame (Dragon Pyromancy)
* **Tier 1 (Lv 1 - Foundation)**: *Inner Furnace* (5 ranks) — +7% Fire Damage, +15% Burn Duration, +15 Max Mana/Rage per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Fire Breath)**:
  * **Choice A (Combustion Wave)**: Fire Breath spreads in a wider 120-degree cone and causes burning enemies to detonate on death.
  * **Choice B (Molten Beam)**: Fire Breath narrows into an ultra-high pressure laser jet dealing 200% more damage and piercing armor.
* **Tier 3 (Lv 24 - Synergy)**: *Searing Embers* (5 ranks) — Critical strikes against burning targets trigger mini-magma geysers.
* **Tier 4 (Lv 40 - A/B Skill Morph: Molten Fissure)**:
  * **Choice A (Volcanic Chasm)**: Fissure leaves a bubbling lake of magma that lasts 10s and slows enemies by 50%.
  * **Choice B (Cross Eruption)**: Fissure erupts in four cardinal directions simultaneously from the impact point.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Draconic Conflagration)**: Fire Breath has no mana cost and increases your movement speed by 40% while channeling.
  * **Choice B (Cataclysm Unleashed)**: Cataclysm of Flame can be triggered every 30s and permanently melts enemy resistances by 50%.

### Branch 1: Scale (Living Fortress)
* **Tier 1 (Lv 1 - Foundation)**: *Carapace Reinforcement* (5 ranks) — +8% Armor, +6% Elemental Resistance, +5% Max Health per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Dragon Charge)**:
  * **Choice A (Juggernaut Trample)**: Charge knocks all enemies airborne, breaks crowd control, and resets cooldown on elite kill.
  * **Choice B (Blazing Comet)**: Charge surrounds the knight in an ignited flame vortex, leaving burning ground along its path.
* **Tier 3 (Lv 24 - Synergy)**: *Thorns of the Dragon* (5 ranks) — Reflects 150% of damage taken; when attacked, release a fire nova counter-attack.
* **Tier 4 (Lv 40 - A/B Skill Morph: Tail Swipe)**:
  * **Choice A (Sweeping Whirlwind)**: Tail Swipe pulls enemies inward and stuns them for 2.5 seconds.
  * **Choice B (Razor Crest)**: Tail Swipe inflicts massive bleed damage and shears 40% of enemy armor.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Immortal Drake)**: When taking fatal damage, enter a Molten Cocoon for 3s, healing to 60% HP and exploding in fire (3m CD).
  * **Choice B (Titan Scales)**: 100% of Armor applies to Elemental Resistance; damage taken cannot exceed 15% of max HP in a single hit.

### Branch 2: Draconic (Brood & Flight)
* **Tier 1 (Lv 1 - Foundation)**: *Brood Bond* (5 ranks) — +8% Drake Minion Damage, +8% Minion Health, +5% Attack Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Drake Whelp)**:
  * **Choice A (Twin Brood)**: Summons 2 Drake Whelps instead of 1; whelps cast Fire Breath alongside you.
  * **Choice B (Obsidian Guardian Drake)**: Replaces whelp with an armored Obsidian Drake that taunts enemies and protects you.
* **Tier 3 (Lv 24 - Synergy)**: *Draconic Symbiosis* (5 ranks) — Minion hits restore 2% health to the Dragon Knight.
* **Tier 4 (Lv 40 - A/B Skill Morph: Elder Red Drake)**:
  * **Choice A (Firestorm Sovereign)**: Elder Drake bombards the battlefield with continuous meteor showers.
  * **Choice B (Draconic Mount)**: You mount the Elder Drake for 15s, raining fire from the sky with total mobility.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (True Dragon King)**: True Dragon Form has double duration and grants complete immunity to all debuffs and stuns.
  * **Choice B (Dragonflight Armada)**: Dragonflight Swarm summons 6 drakes that remain for 30s and continuously strafe the room.

---

## 6. Build Archetypes & Character Variety
1. **Fire Breath Incinerator**: Flame branch with Combustion Wave + Draconic Conflagration. Mobile flamethrower room clear.
2. **Unstoppable Scale Juggernaut**: Scale branch with Juggernaut Trample + Immortal Drake + Titan Scales. The ultimate high-thorns dragon tank.
3. **Dragonflight Broodmaster**: Draconic branch with Twin Brood + Firestorm Sovereign + Dragonflight Armada. Airborne dragon army.
4. **Wyrmfire Hybrid**: Combines Blue Astral Flame with Dragon Charge for rapid-fire engagement and high-burst melee combat.
