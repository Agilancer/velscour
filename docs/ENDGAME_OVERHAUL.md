# Velscour Online: Campaign & Endgame Overhaul Design Document

**Status:** Living Design Specification (Work In Progress)  
**Authors:** Dagyr & Assistant  
**Date:** November 2026  
**Target:** `Dagyr-Online` (Multiplayer Fork)

---

## 1. High-Level Architecture & Content Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAMPAIGN: DEPTHS 1 – 500                             │
│   • 5 Thematic Acts of 100 Depths each                                  │
│   • Boss Rooms every 5 floors (200+ boss roster)                        │
│   • Mid-Act Superbosses (Depths 50, 150, 250, 350, 450)                 │
│   • Act Finale Superbosses / Velscour's Elites (Depths 100, 200, 300, 400)
│   • Depth 500 Climax: DEMON LORD VELSCOUR                               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│   THE ETERNAL BREACH (1–50)      │   │     ABYSSAL RIFTS (TIERS 1–100+) │
│ • Parallel 50-floor ladder       │   │ • The True Endgame Dungeon Run   │
│ • 7 Wyrms × 7 Ascensions (1–49)  │   │ • Time-attack quota + Guardian   │
│ • Floor 50: APEX ETHEREAL WYRM   │   │ • Scaled for Co-op Parties       │
│ • Floating islands, void hazards │   │ • Primary source of Abyssal Keys │
└──────────────────────────────────┘   └─────────────────┬────────────────┘
                                                         │
                                                         ▼
                                       ┌──────────────────────────────────┐
                                       │       UNBOUND EXPLORATION        │
                                       │     (HARDMODE DEPTHS 1–100)      │
                                       │ • Second tab on Town Portal      │
                                       │ • Entry Cost: 1 Abyssal Key / pl │
                                       │ • Direct descent (10-fl checkpts)│
                                       │ • Free recall via Hearthstone    │
                                       │ • Floor 100 Pinnacle Encounter:  │
                                       │   VELSCOUR UNBOUND & HIS COURT   │
                                       │ • Drops Unbound Heirlooms        │
                                       └──────────────────────────────────┘
```

---

## 2. The 5-Act Campaign Descent (Depths 1–500)

Instead of a chaotic, random biome shuffle across 500 disconnected levels, the campaign is structured into **5 Distinct Thematic Acts of 100 Depths each**.

* **Standard Boss Rooms:** Every 5 floors (`d % 5 === 0`) remains a Boss Room, pulling from the 200+ boss roster for steady pacing and loot spikes.
* **Mid-Act Superboss (Floor 50 of each Act):** A scripted, mechanically intense boss encounter.
* **Act Finale Superboss (Floor 100 of each Act):** One of Velscour's Legendary Lieutenants guarding the passage to the next Act.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ACT I: THE FALLEN REALMS & FORGOTTEN CATACOMBS (Depths 1–100)            │
│ • Environments: Catacombs, Dark Forest, Castle Keeps, Deep Rail Mines     │
│ • Mid-Act (Depth 50): SER VALDRIC THE BOUND (Soul Tether & Chains)       │
│ • Act Finale (Depth 100): OSSUARCH, THE BONE COLOSSUS / GRIMSCALE        │
├───────────────────────────────────────────────────────────────────────────┤
│ ACT II: THE SCORCHED WASTES & BURIED TOMBS (Depths 101–200)               │
│ • Environments: Sea of Sand, Dune Pyramids, Desert Temple, Serpentine Twr │
│ • Mid-Act (Depth 150): AMBRECOIL THE AMBER FRILL (Resin & Fossilization) │
│ • Act Finale (Depth 200): PHARAOH SEKHMUN (Scarab Carpets & Sarcophagi)   │
├───────────────────────────────────────────────────────────────────────────┤
│ ACT III: THE FROZEN PEAKS & GLACIAL SPIRES (Depths 201–300)              │
│ • Environments: Mountainside, Snowy Summit, Palace of Everfrost, Ossuary │
│ • Mid-Act (Depth 250): KAELA THE STORMWRAITH (Eye of the Storm)          │
│ • Act Finale (Depth 300): HOLLOWMERE THE NECROLYTE OF RIME (Glacial Deep)│
├───────────────────────────────────────────────────────────────────────────┤
│ ACT IV: THE EMPYREAN HEIGHTS & CELESTIAL VOIDS (Depths 301–400)          │
│ • Environments: Empyrean Citadel, Celestial Expanse, Skyship Battle      │
│ • Mid-Act (Depth 350): OPHANIEL, WHEEL OF A THOUSAND EYES                │
│ • Act Finale (Depth 400): AURION THE THRONE-SERAPH / THESSALY            │
├───────────────────────────────────────────────────────────────────────────┤
│ ACT V: THE INFERNAL DOMINION & THE THRONE (Depths 401–500)                │
│ • Environments: Molten Depths, Hell Dominion, Abyssal Chasms, Void Sanc. │
│ • Mid-Act (Depth 450): KRAGMAUL THE HELLFORGED (Hellfire Grid & Hooks)   │
│ • CAMPAIGN CLIMAX (Depth 500): DEMON LORD VELSCOUR (5-Phase Throne)      │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Eternal Breach: The 7×7 + 1 Ascension (Floors 1–50)

The Eternal Breach is capped at **Floor 50**, utilizing a mathematical progression based on the **7 Elemental Wyrms**:

$$7 \text{ Wyrms} \times 7 \text{ Cycles} = 49 \text{ Floors} + 1 \text{ Apex Floor} = 50 \text{ Floors}$$

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          THE 7 WYRM ASCENSIONS                            │
├───────────┬───────────────┬──────────────┬────────────────────────────────┤
│ Cycle 1   │ Floors 1–7    │ Level 10–70  │ Wyrms introduce base breath    │
│ Cycle 2   │ Floors 8–14   │ Level 80–140 │ Wyrms learn Brood summoning    │
│ Cycle 3   │ Floors 15–21  │ Level 150–210│ Wyrms rain Void Orbs           │
│ Cycle 4   │ Floors 22–28  │ Level 220–280│ Wyrms learn Constricting Coils │
│ Cycle 5   │ Floors 29–35  │ Level 290–350│ Multi-pass attacks + enrage    │
│ Cycle 6   │ Floors 36–42  │ Level 360–420│ 50+ segments, maximum velocity │
│ Cycle 7   │ Floors 43–49  │ Level 430–490│ Lethal hazards & hybrid brood  │
├───────────┴───────────────┴──────────────┴────────────────────────────────┤
│ FLOOR 50: THE APEX ETHEREAL WYRM (THE VOID CONVERGENCE)                   │
│ • Monster Level 500 Pinnacle Encounter                                    │
│ • Maximum 60-segment colossal leviathan                                   │
│ • Cycles through all 7 elements during combat phases                      │
│ • Awards the Void Crown / Prismatic Relic.                                │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Unbound Exploration (Hardmode Depths 1–100)

### A. Portal UI & Entry Gate
* **Town Portal Modal:** Displays two tabs:
  1. `Standard Descent` (Depths 1–500 Campaign).
  2. `Unbound Exploration` (Hardmode Depths 1–100).
* **Key Cost:** Entering Unbound mode requires **1 Abyssal Key per player** (farmed from Abyssal Rift Guardians).

### B. Floor Progression & Checkpoint Rules
1. **Direct Descent (Forced Momentum):**
   * On normal floors, the exit portal **only leads downward** (`Exit — to Floor N+1`).
   * No standard "Return to Town" option on intermediate floors.
2. **Milestone Checkpoints (Every 10 Floors):**
   * Floors **10, 20, 30, 40, 50, 60, 70, 80, 90, and 100** feature a Boss Room / Sanctuary.
   * Only at these 10-floor increments does the portal offer an **official checkpoint return to town**.
3. **The Hearthstone Rule (Emergency Recall):**
   * Channeling the **Hearthstone** (H key) creates a temporary two-way portal back to town, allowing a free return to active dungeon coordinates without spending a key.
   * Abandoning without an active Hearthstone link requires spending another key to re-enter (resuming from your last 10-floor checkpoint).

### C. The Apex at Floor 100: Velscour Unbound
* Slaying Velscour Unbound & his Court awards exclusive **Unbound Heirlooms** (Crown of the Demon Lord, Abyssal Edge, Mantle of the Unbound, Seal of the Pit, Heart of the Abyss).

---

## 5. Abyssal Rifts: The True Endgame Dungeon

### A. Multiplayer Room Architecture (`server.js`)
* Synchronized party entry, shared timer, and shared monster kill quota bar.

### B. Run Flow & Pacing Overhaul
1. **Zero Loot While Running:** Slain monsters drop zero items or gold while the timer is running.
2. **On-The-Spot Guardian Awakening:** At 100% quota, all remaining trash monsters vanish and the **Rift Guardian spawns right on the party**.
3. **The Grand Piñata:** Slaying the Guardian triggers an explosion of all accumulated rewards: gold, gems, sigils, Abyssal gear, and **Abyssal Keys** (which fuel Unbound Exploration).
4. **Multi-Floor Contingency:** If a floor is wiped clean before 100% quota, an archway opens down to Floor 2.

### C. Co-op Death & Resurrection Rules
* **Death Penalty:** Each party death adds escalating seconds to the rift clock (+5s, +10s, +15s...).
* **Teammate Revive:** 3-second channel on a fallen ally's soul beacon to revive them at 50% HP.
* **Self-Resurrect:** 15-second cooldown to respawn at the floor entrance.

### D. Tactical Pylons (1–2 Per Floor)
* **Conduit Pylon (20s):** Lethal chain lightning arcs.
* **Frenzy Pylon (30s):** +50% attack/cast speed, 0 mana cost, 50% cooldown recovery.
* **Aegis Pylon (25s):** Complete damage & CC immunity.
* **Velocity Pylon (30s):** +100% movement speed with mob phasing.

### E. Scaling Tiers & Dynamic Instabilities
* **Tiers 1–19:** Baseline tuned scaling.
* **Tiers 20–39:** 1 Instability (e.g. Volatile Corpses, Molten Trails).
* **Tiers 40–59:** 2 Instabilities (e.g. Chilling Mist, Arcane Lasers, Vortex).
* **Tiers 60+:** 3 Instabilities + Guardian Enrage timers.
