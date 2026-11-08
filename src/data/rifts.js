// Abyssal Rifts (docs/ENDGAME.md, docs/ENDGAME_OVERHAUL.md): the true endgame dungeon experience.
import { FINAL_DEPTH, depthLevel } from './depth.js';
import { clamp } from '../core/util.js';

export const RIFT_TIME = 420;  // 7 minutes base clock
export const RIFT_QUOTA = 0.6; // 60% of monster weight to summon Guardian
export const RIFT_DENSITY = 0.85; // pack density in rifts
export const RIFT_GUARDIAN_HP = 1.0; // Guardian health scaling

/** Baseline monster level for Rifts is level 100 */
export const riftLevel = (_tier) => 100;
export const riftDepth = (_tier) => FINAL_DEPTH;

/** Predictable +10% monster health scaling per tier above Tier 1 */
export const riftHpMul = (tier) => Math.pow(1.10, Math.max(0, (tier | 0) - 1));
/** Predictable +6% monster damage scaling per tier above Tier 1 */
export const riftDmgMul = (tier) => Math.pow(1.06, Math.max(0, (tier | 0) - 1));

/** Tiers a win opens: fast clear jumps further (k = time used / limit) */
export const riftJump = (k) => (k <= 0.5 ? 3 : k <= 0.8 ? 2 : 1);

/** Monster kill weight toward the quota */
export const riftWeight = (m) => (!m || m.summon || m.pitSpawn || m.vk ? 0 : m.rank === 'unique' ? 8 : m.rank === 'champion' ? 4 : m.rank === 'boss' || m.isRaid ? 0 : 1);

/** Pylon Definitions */
export const PYLONS = [
  { id: 'conduit', name: 'Conduit Pylon', color: '#30b0ff', dur: 20, desc: 'Lethal chain lightning strikes nearby enemies.' },
  { id: 'frenzy', name: 'Frenzy Pylon', color: '#ff8830', dur: 30, desc: '+50% Attack/Cast Speed, 0 Mana Cost, and 50% Cooldown Recovery.' },
  { id: 'aegis', name: 'Aegis Pylon', color: '#ffe040', dur: 25, desc: 'Complete immunity to damage and crowd control.' },
  { id: 'velocity', name: 'Velocity Pylon', color: '#40ff80', dur: 30, desc: '+100% Movement Speed and monster phasing.' },
];

/** Tier Instabilities / Hazards */
export const RIFT_INSTABILITIES = [
  { id: 'volatile', name: 'Volatile Corpses', minTier: 20, desc: 'Slain monsters explode into void shrapnel after 1.5s.' },
  { id: 'molten', name: 'Molten Ground', minTier: 20, desc: 'Elites leave trails of burning lava.' },
  { id: 'chilling', name: 'Chilling Mist', minTier: 40, desc: 'Chilling patches periodically appear, slowing and freezing.' },
  { id: 'arcane_lasers', name: 'Arcane Sentries', minTier: 40, desc: 'Rotating arcane beams appear near elite packs.' },
  { id: 'enrage', name: 'Guardian Frenzy', minTier: 60, desc: 'The Rift Guardian enrages and deals escalating damage.' },
];

export const instabilitiesForTier = (tier) => RIFT_INSTABILITIES.filter((i) => (tier | 0) >= i.minTier);

/**
 * The Grand Piñata reward on Guardian death:
 * Drops consolidated gear, guaranteed Abyssal items at high tiers, and Abyssal Keys for Unbound Exploration.
 */
export function riftReward(tier, first) {
  const t = Math.max(1, tier | 0);
  return {
    abyssal: first ? 1 : clamp(0.15 + 0.025 * t, 0, 1.0),
    items: Math.min(8, 3 + Math.floor(t / 15)),
    sigils: Math.min(5, 2 + Math.floor(t / 20)),
    sigilBonus: 1 + Math.floor(t / 10),
    // Abyssal Keys for Unbound Exploration:
    // T10+ has key chance; T15+ guarantees 1 key; T40+ guarantees 2 keys!
    keys: t >= 40 ? 2 : t >= 15 ? 1 : t >= 10 ? (Math.random() < 0.5 ? 1 : 0) : 0,
    marks: Math.max(1, Math.ceil(t / 10)),
  };
}

export const fmtTime = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
