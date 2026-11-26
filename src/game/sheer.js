// SHEER DROPS at the brink (data/sheer.js, docs/SHEER_DROPS.md). Nothing walks off a brink (the floor's edge stops a
// body as a wall would), but a body can go over it:
//  - a knock or a pull carries anyone but the hero's minions over (world/map.js shove; creature.js tickStatus), the
//    hero too, unless auto-play has him: then he plants his feet at the brink (counted in world.sheerStats.braced);
//  - flyers and leaps cross the gaps (map.js flyMove, aloft) but come down on floor; a flyer never stops over a gap
//    (one hanging still over the drop flutters back to the nearest floor), and one frozen or stunned there drops.
// Every frame, anything whose centre is over the void and isn't in the air falls: a monster dies at once, its loot
// left on the brink and the kill the hero's; the hero dies at once (no phoenix, no second chance), killed by the
// Abyss; a minion, a boss or a raid boss is set back on the floor instead.
import { G } from '../state.js';
import { kill } from './combat.js';
import { aloft } from '../world/map.js';
import { sfx } from '../core/audio.js';
import { FALL_T, keeps, sheerCount } from '../gfx/sheer.js';

export const ABYSS = { name: 'the Abyss' }; // the killer named on the death screen


export function sheerUpdate(w, dt) {
  const map = w.map;
  for (const c of w.creatures) {
    if (c.dead || c.static || c.clutter) { c.leaping = false; continue; }
    if (c.voidFly === undefined) c.voidFly = !!c.fly && c.team === 'enemy' && !c.summon;
    const over = !map.isFloor(c.x, c.y);
    if (c.voidFly) c.noShadow = over; // no shadow on the void under it
    if (!over) { c.hang = 0; c.leaping = false; c._hx = c.x; c._hy = c.y; continue; }
    // over the drop: in the air (a flyer on the wing, a leap, a flip, a body still rising from the ground)
    if (aloft(c) || (c.z || 0) > 3 || c.hidden || c.ghostDraw || c.targetable === false) {
      if (c.voidFly && !c.leaping) hover(w, c, dt);
      c.leaping = false;
      continue;
    }
    c.leaping = false;
    fall(w, c);
  }
  if (w.plunges) for (let i = w.plunges.length - 1; i >= 0; i--) if ((w.plunges[i].t += dt) > FALL_T) w.plunges.splice(i, 1);
}

/** A flyer over a gap: on its way somewhere it may cross, but hanging still over the drop it makes for the floor. */
function hover(w, c, dt) {
  const still = c._hx !== undefined && Math.hypot(c.x - c._hx, c.y - c._hy) < Math.max(0.004, (c.speed || 3) * dt * 0.25);
  c._hx = c.x; c._hy = c.y;
  c.hang = still ? (c.hang || 0) + dt : 0;
  if (c.hang < 0.3) return;
  if (!c.hangTo || (c.hangT = (c.hangT || 0) - dt) <= 0) { c.hangTo = w.map.nearestFloor(c.x, c.y, 0.3, 6); c.hangT = 0.5; }
  const f = c.hangTo;
  if (!f) return;
  const d = Math.hypot(f[0] - c.x, f[1] - c.y), step = Math.min(d, (c.speed || 3) * 1.2 * dt);
  if (d > 0.01 && w.map.flyMove(c, (f[0] - c.x) / d * step, (f[1] - c.y) / d * step)) { c.face(Math.atan2(f[1] - c.y, f[0] - c.x)); c.moving = true; }
  c._hx = c.x; c._hy = c.y;
  sheerCount(w, 'hover');
}

function backOnFloor(w, c) {
  const f = w.map.nearestFloor(c.x, c.y, 0.3, 6);
  if (f) { c.x = f[0]; c.y = f[1]; }
  c.kbx = c.kby = 0;
}

/** Over the brink: the hero or a monster plunges into the abyss and dies; anything that never falls is set back. */
export function fall(w, c) {
  const x = c.x, y = c.y;
  if (c.isPlayer) {
    // only a knock or a pull takes the hero over; a step, a blink or a skill that sets him down at the brink with his
    // middle over the drop (a ninja's cut at a flyer) puts him back on the floor. Tests' god mode: no harm at all.
    if (G.godMode || !(c.shoveT > 0)) { backOnFloor(w, c); sheerCount(w, 'saved'); return; }
    plunge(w, c, x, y);
    sheerCount(w, 'hero');
    c.hp = 0; c.dead = true; c.channel = null; c.kbx = c.kby = 0;
    sfx('die');
    if (G.game) G.game.onPlayerDeath(ABYSS);
    return;
  }
  if (keeps(c)) { backOnFloor(w, c); sheerCount(w, 'saved'); return; }
  plunge(w, c, x, y);
  sheerCount(w, 'fell');
  // the loot is left on the brink it went over
  const f = w.map.nearestFloor(x, y, 0.2, 4);
  if (f) { c.x = f[0]; c.y = f[1]; }
  kill(c, w.player, { fell: true });
  c.x = x; c.y = y;
}

function plunge(w, c, x, y) {
  (w.plunges || (w.plunges = [])).push({ c, x, y, z0: Math.max(0, c.z || 0), t: 0 });
  sfx('plunge', c.isPlayer ? 1 : 0.7, c.isPlayer ? 1 : 0.85 + Math.random() * 0.3);
}
