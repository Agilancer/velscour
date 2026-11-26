// The Act III climb (docs/PHOBOS.md): City State Phobos and Castle Velscour's hundred floors are a challenge track of
// their own, apart from the descent. Once inside, auto-play keeps climbing floor to floor and never wanders off into a
// random dungeon. It heads home at a climb goal (each wing's great room, every 10th floor), to resupply (and straight
// back up after), or when it falls. From town it takes the challenge now and then: every few trips, when its gear score
// is up to the next floor, and never again at the same gear after a fall there.
import { G } from '../state.js';
import { powerLevel } from '../data/items.js';
import { depthLevel } from '../data/depth.js';
import { castleDepth, cityDepth, CASTLE_FLOORS, wingOf } from '../data/phobos.js';
import { phobosState } from './phobos.js';

const EVERY = 3;   // town trips between tries at the climb
export const climbGoal = (f) => Math.min(CASTLE_FLOORS, Math.max(10, Math.ceil(f / 10) * 10));
const st = (S = phobosState()) => S && (S.climb ||= { on: false, trips: 0, fail: null });
/** The worn gear's power: the mean of powerLevel (+2 a level of upgrade) over what is worn (at least 7 pieces). */
export function gearScore(c = G.char) {
  const it = Object.values(c?.equip || {}).filter(Boolean);
  return Math.round(it.reduce((s, i) => s + powerLevel(i.ilvl || 1, i.rarity || 0) + 2 * (i.upg || 0), 0) / Math.max(7, it.length));
}
/** The monster level of the climb's next step (the city before the gate is open). */
export const climbLevel = (S = phobosState()) => depthLevel(S.gate ? castleDepth(Math.max(1, S.floor || 1)) : cityDepth(0));
export const climbReady = (c = G.char, S = phobosState(c)) => { const L = climbLevel(S); return gearScore(c) >= L - 6 && (c.level || 1) >= L - 12; };

/** Leaving town: where the climb wants auto-play now ({ city } or { floor }), or null for the usual portal. */
export function climbNext(c = G.char) {
  const S = phobosState(c), C = st(S);
  if (!S || !(S.city || S.gate || (c.deepest || 0) >= 200) || (S.cleared || {})[CASTLE_FLOORS] && !C.on) return null;
  if (!C.on) {
    if (C.trips < EVERY || !climbReady(c, S)) return null;
    const where = S.gate ? Math.max(1, S.floor || 1) : 0;
    if (C.fail && C.fail.floor === where && gearScore(c) < C.fail.gs + 3) return null;   // fell here: come back stronger
  }
  return S.gate ? { floor: Math.max(1, S.floor || 1) } : { city: true };
}
/** Count a trip down the usual portal (the climb is tried every EVERY trips). */
export function climbTrip() { const C = st(); if (C) C.trips++; }
export function climbGo(to) {
  const C = st(), g = G.game; C.on = true; C.trips = 0;
  G.ui?.log(to.city ? 'Auto-play takes up the Act III challenge: <b style="color:#ff6040">City State Phobos</b>.' : `Auto-play climbs <b style="color:#ff4040">Castle Velscour</b> from Floor ${to.floor} (climb goal: Floor ${climbGoal(to.floor)}).`, '#8fe0ff');
  return to.city ? g.enterPhobos() : g.enterCastleFloor(to.floor);
}
const home = (why) => { G.ui?.log(why, '#8fe0ff'); const g = G.game; return g.enterBellmourn ? g.enterBellmourn() : g.enterTown(); };
/** Auto-play at an open stair or gate in Act III (autoplay.leaveLevel): climb on, or home for a reason. */
export function climbLeave(w, town) {
  const S = phobosState(), C = st(S), f = w.castleFloor, exit = w.portals.find((p) => p.type === 'exit') || w.portals[0];
  if (!f) {   // the city: through the Castle Gate once the wards are broken
    if (S.gate && exit && !town) { C.on = true; return exit.use(); }
    C.on = !!S.gate; return home(S.gate ? 'Auto-play heads to Bellmourn to resupply, then on into the castle.' : 'Auto-play leaves Phobos for now.');
  }
  if (f >= CASTLE_FLOORS) { C.on = false; return home('Auto-play has thrown Lord Velscour down and heads home.'); }
  if (f % 10 === 0) { C.on = false; return home(`Climb goal met: <b>Floor ${f}</b>, ${wingOf(f).name} broken. Auto-play heads home; it climbs on from Floor ${f + 1} another day.`); }
  if (town) { C.on = true; return home(`Auto-play heads to Bellmourn to resupply and will climb on from Floor ${f + 1}.`); }
  return exit.use();
}
/** Fell in Act III: the climb is over for now, and not tried at this floor again until the gear is better. */
export function climbDied() {
  const S = phobosState(), C = st(S); if (!C) return;
  C.on = false; C.trips = 0; C.fail = { floor: G.world?.castleFloor || 0, gs: gearScore() };
}
