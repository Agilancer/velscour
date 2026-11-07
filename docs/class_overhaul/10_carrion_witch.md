# Carrion Witch: Skill Tree Pruning & Talent Overhaul Plan (Pass 2 - ARPG Game Dev Revision)

## 1. Design Vision & ARPG Game Dev Pillars
Inspired by the dark voodoo mystics and occult summoners of classic ARPGs (such as *Diablo III's Witch Doctor* and *Path of Exile's Occultist*), the Carrion Witch commands voracious insect swarms, murder flocks of ravens, and terrifying effigy curses. The combat loop centers on **infesting hosts with spreading plagues**, **directing ravenous crows**, **brewing concoctions in cauldrons**, and **triggering catastrophic contagion detonations**.

### The Four Iconic Archetypes:
1. **The Swarm Broodmother (Insects, Locusts & Acid)**: Spreads biting swarms that jump from host to host and detonate into bile (*Rot Bolt, Locust Swarm, Pestilent Spray, Hive Mother*).
2. **The Raven Queen (Avian Shadow & Feather Flurries)**: Commands a circling murder of ravens, pecking and blinding enemies while phasing through shadows (*Crow Swarm, Raven Familiar, Murder of Crows, Nevermore*).
3. **The Occult Hexer (Voodoo Dolls, Cauldrons & Curses)**: Binds enemy souls to straw poppets and casts mind-bending hexes (*Hex Bolt, Voodoo Doll, Withering, Witch's Cauldron, Puppeteer*).
4. **The Grave Moon Sorceress (Lunar Necromancy & Ghostfire)**: Channels eerie pale moonlight and phantom lanterns (*Moonlit Hex, Moon Moths, Witchlight, Grave Moon Rising*).

---

## 2. Bloat Diagnosis: What Went Wrong in the Old 80-Skill Tree
* **16 Separate Minion / Crow Summons**: Cluttered the skill tree with redundant familiars and cauldrons (*Raven Familiar, Scarecrow, Raven Flock, Crow Queen, Unkindness, Cauldron, Bone Totem, Spirit Lantern, Effigy, Coven, Gravecall, Moon Cauldron, Effigy Ward, Coven Call, Lantern Procession, Hive Mother*).
* **13 Curses & Hexes**: Excessive individual hex buttons that applied minor variants of damage-over-time or stat penalties (*Infest, Pandemic, Eye Gouge, Voodoo Doll, Withering, Hag's Curse, Blood Hex, Grave Hex, Mass Hysteria, Doom Hex, Puppeteer, Blood Moon Hex, Eclipse Hex*).
* **6 Swarm Cyclones**: Multiple identical moving swarms of locusts or crows (*Locust Swarm, Swarm Storm, Locust Plague, Murder of Crows, Dark Murder, Crow Gale*).
* **6 Rain Spells**: Repeated falling crow/rot showers (*Toxic Rain, Rain of Rot, Talon Rain, Hexstorm, Murder Swarm, Moonfall*).

---

## 3. Architecture Clarification: Tree Capstones vs The F-Key Class Ultimate (Feast of Crows)

> [!IMPORTANT]
> **Level 30 Tree Capstones DO NOT replace Feast of Crows!**
> 
> * **The Class Ultimate (`Feast of Crows` on Key `F` / HUD Orb)**:
>   * Defined in `src/game/smite.js`.
>   * Permanently unlocked from Level 1, costs **0 mana**, and occupies **0 hotbar slots**.
>   * Charged by scoring 45 monster kills; summons a massive swirling cyclone of millions of shadow crows that pecks, bleeds, and devours the entire screen.
> * **Level 30 Skill Tree Capstones (Hotbar Slots `1-8`)**:
>   * Abilities like *Hive Mother* (brood queen summon), *Nevermore* (Crow Queen form transformation), and *Witching Hour* are standard high-tier spenders/transformations.
>   * They cost mana, have standard cooldowns (30s–60s), and are assigned to normal skill bar slots.

---

## 4. Pruned Active Skill Tree (9 Skills per Tree · 36 Core Skills)

```
                    CARRION WITCH ACTIVE SKILLS (36 Total)
 ┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ Tree 0: Plague       │ Tree 1: Murder Crows │ Tree 2: Hexes        │ Tree 3: Grave Moon   │
 │ (Insects & Rot Miasma│ (Avian Shadow & Wings│ (Voodoo & Occult)    │ (Lunar Necromancy)   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 1. Rot Bolt (Gen)    │ 1. Crow Swarm (Burst)│ 1. Hex Bolt (Curse)  │ 1. Moonlit Hex (Ray) │
 │ 2. Plague Cloud(Zone)│ 2. Raven Familiar(Pet│ 2. Voodoo Doll (Link)│ 2. Moon Moths (Seek) │
 │ 3. Corpse Burst(Gore)│ 3. Feathered Cloak   │ 3. Withering Hex     │ 3. Witchlight Zone   │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 4. Locust Swarm(Jump)│ 4. Murder Crows(Orbit│ 4. Witch's Cauldron  │ 4. Blood Moon Hex    │
 │ 5. Pestilent Spray   │ 5. Eye Gouge (Blind) │ 5. Blood Hex (Leech) │ 5. Gravecall (Roots) │
 │ 6. Infest (Parasite) │ 6. Night Wings (Blink│ 6. Effigy Totem(Taunt│ 6. Lantern Procession│
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 7. Rain of Rot (Acid)│ 7. Feather Blades(Fan│ 7. Mass Hysteria(AoE)│ 7. Grave Moon Rising │
 │ 8. Pandemic (Detonate│ 8. Unkindness Flock  │ 8. Puppeteer (Charm) │ 8. Eclipse of Wings  │
 │ 9. Hive Mother (Cap) │ 9. Nevermore (Cap)   │ 9. Witching Hour(Cap)│ 9. Moonfall Cataclysm│
 └──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Tree 0: Plague (Insects, Rot & Poison Miasma)
* **Row 0 (Lv 1 - Rot Bolts & Miasma)**:
  1. **Rot Bolt** (Lv 1 · Projectile Generator) — Toxic missile applying virulent decay and reducing enemy healing by 50%.
  2. **Plague Cloud / Miasma** (Lv 1 · Ground Zone) — Spreads a thick green gas cloud that chokes and damages enemies inside.
  3. **Corpse Burst** (Lv 6 · Corpse Spender) — Explodes a rotting corpse into a swarm of maggots and poisonous bile.
* **Row 1 (Lv 12 - Locusts, Acid Sprays & Parasites)**:
  4. **Locust Swarm** (Lv 12 · Jumping Swarm) — **The Classic D3 Witch Doctor Spender**: Voracious cloud of locusts that devours armor and automatically jumps to adjacent foes upon death.
  5. **Pestilent Spray** (Lv 12 · Channeled Bile Cone) — Channeled bile cone spraying caustic acid that melts enemy physical armor by 40%.
  6. **Infest** (Lv 16 · Parasitic Egg) — Injects parasites into a host; when the host dies, 3 plague larvae burst forth to attack nearby enemies.
* **Row 2 (Lv 24 - Acid Downpours & Pandemics)**:
  7. **Rain of Rot** (Lv 20 · Acid Rain) — Summons an acidic downpour covering the ground in corrosive acid pools.
  8. **Pandemic** (Lv 24 · Detonation Spender) — Instantly detonates all active poisons and bleeds on target, dealing their full remaining damage immediately.
  9. **Hive Mother** (Lv 30 · Brood Queen Capstone) — Summons a grotesque brood queen that continuously spawns biting swarms and vomits acid.

### Tree 1: Murder of Crows (Avian Shadow & Dark Flight)
* **Row 0 (Lv 1 - Crows & Shoulder Familiars)**:
  1. **Crow Swarm** (Lv 1 · Fast Missile) — Hurls a cluster of biting crows that peck and blind the target.
  2. **Raven Familiar** (Lv 1 · Persistent Pet) — Raven scout perching on the Witch's shoulder, periodically diving into attackers to blind them.
  3. **Feathered Cloak** (Lv 6 · Defensive Shroud) — Defensive shroud turning incoming hits into fluttering black feathers, granting +30% Dodge.
* **Row 1 (Lv 12 - Whirling Crows & Shadow Steps)**:
  4. **Murder of Crows** (Lv 12 · Orbiting Vortex) — Summons a swirling vortex of shadow crows circling the Witch and tearing through enemies.
  5. **Eye Gouge** (Lv 12 · Targeted Blind) — Targeted raven strike that permanently blinds and cripples an elite target for 4s.
  6. **Night Wings** (Lv 16 · Feather Teleport) — Teleports to a location in a burst of black feathers, leaving a blinding cloud.
* **Row 2 (Lv 24 - Feather Slashes & Crow Queen)**:
  7. **Feather Blades** (Lv 20 · Fan of Feathers) — Sweeps razor crow feathers in a fan of projectiles that inflict bleeding.
  8. **Unkindness Flock** (Lv 24 · Room-wide Flurry) — Summons a massive aerial flock of dozens of ravens harassing the entire room for 10s.
  9. **Nevermore / Crow Queen** (Lv 30 · Form Capstone) — Transforms into an ethereal Crow Queen avatar with flying wings and death screech.

### Tree 2: Hexes (Voodoo Dolls, Cauldrons & Effigies)
* **Row 0 (Lv 1 - Hexes & Straw Poppets)**:
  1. **Hex Bolt** (Lv 1 · Shadow Missile) — Shadow missile cursing the victim with bad luck (attacks have a 25% chance to miss).
  2. **Voodoo Doll** (Lv 1 · Soul Tether) — Binds an enemy to a straw poppet; any damage dealt to the doll is amplified by 40% and transferred to the target.
  3. **Withering Hex** (Lv 6 · Stat Drain) — Slowly drains enemy strength, reducing their movement speed and physical damage by 40%.
* **Row 1 (Lv 12 - Cauldrons, Blood Hexes & Scarecrows)**:
  4. **Witch's Cauldron** (Lv 12 · Deployable Station) — Deploys a bubbling cauldron that brews restorative potions for allies and noxious fumes for foes.
  5. **Blood Hex** (Lv 12 · Leech Curse) — Curses a target so that every time they deal damage, they lose 10% of their current life.
  6. **Effigy Totem** (Lv 16 · Scarecrow Taunt) — Plants a sacrificial scarecrow effigy that taunts all nearby enemies into attacking it before burning.
* **Row 2 (Lv 24 - Hysteria & Mind Control)**:
  7. **Mass Hysteria** (Lv 20 · Area Confusion) — Curses an entire zone, causing enemies to attack each other in madness for 5s.
  8. **Puppeteer** (Lv 24 · Elite Mind Control) — Takes mental control of an elite monster for 15s to fight on your side.
  9. **Witching Hour** (Lv 30 · Midnight Capstone) — Enacts a midnight curse that turns all enemy buffs into lethal damage over time.

### Tree 3: Grave Moon (Lunar Necromancy & Ghostfire)
* **Row 0 (Lv 1 - Moonbeams & Moths)**:
  1. **Moonlit Hex** (Lv 1 · Piercing Ray) — Pale lunar ray that illuminates invisible enemies and marks them for death.
  2. **Moon Moths** (Lv 1 · Seeking Wisps) — Ethereal moths that flutter toward enemies and detonate in ghostly poison flares.
  3. **Witchlight Zone** (Lv 6 · Ground Sanctum) — Persistent lunar pool that heals undead/familiars and drains living enemies.
* **Row 1 (Lv 12 - Blood Moons & Lantern Spirits)**:
  4. **Blood Moon Hex** (Lv 12 · Sanguine Aura) — Turns the moon red, doubling all bleed and life-leech effects in the room for 15s.
  5. **Gravecall** (Lv 12 · Skeletal Grasp) — Pulls skeletal hands from the dirt that grasp and immobilize enemies in an area for 3s.
  6. **Lantern Procession** (Lv 16 · Floating Spirits) — Summons ghostly lantern spirits that drift across the battlefield exploding on contact.
* **Row 2 (Lv 24 - Rising Moons & Moonfall)**:
  7. **Grave Moon Rising** (Lv 20 · Phantom Moon) — Summons a phantom moon overhead that pulses continuous necrotic bursts.
  8. **Eclipse of Wings** (Lv 24 · Total Darkness) — Combines crows and lunar shadow, plunging the screen into total darkness while tearing enemies apart.
  9. **Moonfall Cataclysm** (Lv 30 · Lunar Capstone) — Crashes a spectral moon into the battlefield, crushing everything beneath it.

---

## 5. Overhauled Talent Tree: A/B Skill Morphs (Diablo III Style)

### Branch 0: Plague (Entomology & Disease)
* **Tier 1 (Lv 1 - Foundation)**: *Festering Wounds* (5 ranks) — +7% Poison/Acid Damage, +15% Disease Duration, +15 Max Mana per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Locust Swarm)**:
  * **Choice A (Flesh-Eating Locusts)**: Locusts convert 35% of their damage dealt into Life leech for the Witch.
  * **Choice B (Virulent Swarm)**: Locusts strip 40% of enemy armor and cause targets to explode in poison on death.
* **Tier 3 (Lv 24 - Synergy)**: *Contagion Chain* (5 ranks) — Poison damage ticks 40% faster; enemies who die while poisoned spread it to 2 others.
* **Tier 4 (Lv 40 - A/B Skill Morph: Corpse Burst)**:
  * **Choice A (Maggot Brood)**: Corpse Burst spawns 4 crawling plague maggots that seek out and attack enemies.
  * **Choice B (Caustic Acid Blast)**: Corpse Burst radius increased by 100% and leaves burning acid pools for 8s.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Black Death)**: Pandemic's cooldown is reduced by 60% and its detonation deals 200% bonus damage.
  * **Choice B (Broodmother)**: The Hive Mother is permanent and summons 2 Elite Stalker Beetles to protect you.

### Branch 1: Murder of Crows (Avian Shadow)
* **Tier 1 (Lv 1 - Foundation)**: *Raven's Feathers* (5 ranks) — +7% Shadow Damage, +3% Dodge Chance, +5% Pet Attack Speed per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Murder of Crows)**:
  * **Choice A (Talon Frenzy)**: Murder of Crows inflicts deep stacking bleed wounds and shreds enemy attack speed by 30%.
  * **Choice B (Shadow Vortex)**: Murder of Crows pulls all surrounding enemies toward the Witch and blinds them for 3s.
* **Tier 3 (Lv 24 - Synergy)**: *Carrion Feast* (5 ranks) — Whenever a crow or raven strikes a bleeding enemy, heal for 2.5% max HP.
* **Tier 4 (Lv 40 - A/B Skill Morph: Night Wings)**:
  * **Choice A (Shadow Strike)**: Night Wings leaves behind an armed feather bomb that explodes for 300% shadow damage.
  * **Choice B (Raven Shroud)**: Teleporting grants 3 seconds of total stealth and immunity to damage.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Queen of the Crows)**: Raven Flock cap increased by 100%; ravens gain shadow lightning attacks.
  * **Choice B (Nevermore Ascension)**: The Crow Queen form becomes a toggled state with +30% move speed and flying terrain traversal.

### Branch 2: Hexes (Occult Rituals)
* **Tier 1 (Lv 1 - Foundation)**: *Dark Alchemy* (5 ranks) — +15% Curse Duration, +15% Curse Area, +6% Magic Resistance per rank.
* **Tier 2 (Lv 10 - A/B Skill Morph: Voodoo Doll)**:
  * **Choice A (Twin Effigies)**: You can bind two enemies simultaneously to separate Voodoo Dolls.
  * **Choice B (Iron Maiden Doll)**: 100% of damage taken by the Witch is redirected to the bound Voodoo target.
* **Tier 3 (Lv 24 - Synergy)**: *Malediction Aura* (5 ranks) — Cursed enemies deal 25% less damage and take 20% increased critical damage.
* **Tier 4 (Lv 40 - A/B Skill Morph: Witch's Cauldron)**:
  * **Choice A (Elixir of Immortality)**: Cauldron brews glowing golden draughts that grant 50% max life shield to whoever touches them.
  * **Choice B (Bubbling Plague Brew)**: Cauldron continuously launches poison mortars that bombard nearby enemy packs.
* **Tier 5 (Lv 60 - Apex Keystone)**:
  * **Choice A (Coven Master)**: Summons 2 ghostly coven sisters who cast Voodoo Dolls and Hex Bolts alongside you.
  * **Choice B (Curse of Damnation)**: When a cursed enemy dies, their soul bursts, dealing 25% of their max HP to all nearby foes.

---

## 6. Build Archetypes & Character Variety
1. **Plague & Locust Broodmother**: Flesh-Eating Locusts + Maggot Brood + Broodmother. Overwhelms rooms with disease and vermin.
2. **Raven Swarm Shadow Caster**: Murder of Crows with Talon Frenzy + Queen of the Crows. High mobility, dodge, and avian bleeding.
3. **Occult Voodoo Hexer**: Hexes with Twin Effigies + Iron Maiden Doll + Coven Master. Redirects damage and manipulates enemies.
4. **Grave Moon Support / Hybrid**: Grave Moon healing zones with Witch's Cauldron for elite party survivability and crowd-control.
