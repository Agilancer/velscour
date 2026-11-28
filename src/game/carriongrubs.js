// The Carrion Witch's brood: corpse grubs (her skill Carrion Grubs, data/summons.js `grub`). Up to seven at once:
// one of each coloured kind and one more plain white Carrion Grub. Every grub is the same 3D model in another hide
// (gfx/grubs3d.js, tools/blender/grub.py) and knows the same twelve moves; what a move does is its colour's:
//   white   Carrion Grub   the bruiser: bites, slams, tail-whips; eats corpses to heal and swell
//   yellow  Bile Grub      the spitter: acid bolts, three-shot barrages, lobbed pools that burn; Corrode strips defences
//   green   Plague Grub    the poisoner: every hit festers; lobs plague clouds; Pandemic poisons everything round it
//   orange  Bloat Grub     the wall: draws foes, shrugs off blows; bursts its pustules to hurl them back
//   brown   Leech Grub     the drinker: its bites feed the Witch; Blood Feast drains a crowd into her and the brood
//   pink    Brood Mender   the nurse: Soothing Ichor heals the brood and the Witch, a Chrysalis Ward hardens them,
//                          Sickly Spores sap and slow, and its silk spit slows what it hits
// Monster.update hands a grub to grubUpdate; Creature.draw to gfx/grubs3d.js through gfx/beastlooks.js.
import { rand, chance, TAU, angleTo, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, spawn, floatText, burst, addDecal } from '../gfx/vfx.js';
import { aoe } from './combat.js';
import { Projectile, Area } from './hazards.js';
import { SUMMONS } from '../data/summons.js';
import { drawGrubHusk } from '../gfx/grubs3d.js';

export const GRUB_MAX = 7;
export const GRUB_KINDS = ['white', 'yellow', 'green', 'orange', 'brown', 'pink'];
/** clip seconds and when its blow(s) land, as tools/blender/grub.py animates them */
export const GRUB_CLIPS = {
  idle: [3.2], slither: [1.2], slither_fast: [0.62], hit: [0.4], death: [1.3],
  bite: [0.72, 0.42], slam: [1.0, 0.55], whip: [0.9, 0.5],
  spit: [0.85, 0.5], barrage: [1.3, 0.3, 0.5, 0.7], lob: [1.1, 0.55],
  pulse: [1.2, 0.6], heal: [1.5, 0.6], ward: [1.4, 0.6],
};
// role: melee (closes in), ranged (keeps its distance), support (stays by the Witch). glow: its light and fx colour.
export const GRUBS = {
  white: { role: 'melee', el: 'phys', glow: '#c8ffa0', fx: 'blob' },
  yellow: { role: 'ranged', el: 'poison', glow: '#f4f060', fx: 'acid' },
  green: { role: 'ranged', el: 'poison', glow: '#96ff3c', fx: 'blob' },
  orange: { role: 'melee', el: 'fire', glow: '#ff9a30', fx: 'blob' },
  brown: { role: 'melee', el: 'blood', glow: '#ff3020', fx: 'blob' },
  pink: { role: 'support', el: 'shadow', glow: '#ff80dc', fx: 'blob' },
};
const kinOf = (m) => m.world.creatures.filter((c) => c.grub && !c.dead && c.owner === m.owner);

/** The order a brood hatches in: a white to bite, the Bloat to hold the line, the Mender to keep them alive, then the rest. */
export const HATCH = ['white', 'orange', 'pink', 'yellow', 'green', 'brown'];
const broodOf = (owner) => (owner && owner.world ? owner.world.creatures.filter((c) => c.grub && !c.dead && c.owner === owner) : []);
/** Which grub the next hatch brings: the first kind in HATCH the Witch has none of, else a white one; null when the brood is full. */
export function grubDef(owner) {
  const mine = broodOf(owner);
  if (mine.length >= GRUB_MAX) return [null, null];
  const have = new Set(mine.map((c) => c.grub.kind)), k = HATCH.find((c) => !have.has(c)) || 'white';
  return ['grub_' + k, SUMMONS['grub_' + k]];
}
/** A cast on a full brood hatches nothing (no grub is thrown away): it rouses them instead, once a cast: +20% life and a
 *  short frenzy. Returns true when it did. */
export function rouseBrood(owner) {
  const mine = broodOf(owner);
  if (mine.length < GRUB_MAX) return false;
  if (owner._grubRouse && owner.world.time - owner._grubRouse < 0.5) return true;
  owner._grubRouse = owner.world.time;
  for (const g of mine) { mend(g, g.maxHp * 0.2); g.grub.cds.pulse = Math.min(g.grub.cds.pulse, 0.5); g.grub.glow = 1; }
  floatText(owner.x, owner.y, 80, 'The brood stirs', '#d8ffb0', 12, { life: 1.2 }); sfx('summon', 0.5, 0.6);
  return true;
}
/** Which grub makes room if ever the brood overflows: the oldest white one. */
export function grubToReplace(mine) { return mine.find((c) => c.grub && c.grub.kind === 'white') || mine[0]; }

export function attachGrub(m, def) {
  const kind = def.grub;
  m.grub = { kind, K: GRUBS[kind], anim: 'idle', animT: rand(3), act: null, yaw: rand(TAU), glow: 0, grow: 0, bornT: 0, wardT: 0, fed: 0,
    cds: { slam: rand(2, 5), whip: rand(3, 6), spit: rand(0, 1.5), barrage: rand(3, 7), lob: rand(2, 6), pulse: rand(5, 9), heal: rand(3, 6), ward: rand(4, 8), feast: rand(2, 5) } };
  m.r = 0.32; m.hop = false; m.grubBase = m.dmgReduce || 0;
  if (kind === 'orange') m.taunt = true;
  watch(m);
  sfx('gore', 0.45, kind === 'white' ? 0.8 : 1.1); voice(m, 0.5);
}

// ------------------------------------------------------------------ deaths: a grub that dies writhes, curls and deflates
function watch(m) {
  const w = m.world || (m.owner && m.owner.world);
  if (!w) return;
  let W = w._grubWatch;
  if (!W) {
    W = w._grubWatch = { list: new Set(), ground: true, depth: -1e9, update() {
      for (const g of this.list) if (g.dead) { this.list.delete(g); w.addHazard(new Husk(g)); }
      return true;
    }, draw() {} };
    w.addHazard(W);
  }
  W.list.add(m);
}
class Husk {
  constructor(m) { Object.assign(this, { m, x: m.x, y: m.y, t: 0, dur: 2.2, ground: false }); burst(m.x, m.y, 16, 'poison', 10, 2); sfx('squish', 0.5, 0.7); }
  get depth() { return this.x + this.y; }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) { drawGrubHusk(ctx, this); }
}

// ------------------------------------------------------------------ acts
function act(m, S, clip, fn, target, rate = 1.12) {
  const C = GRUB_CLIPS[clip];
  S.act = { clip, t: 0, rate, dur: C[0], at: C.slice(1), i: 0, fn, target };
  S.anim = clip; S.animT = 0;
  if (target) m.face(angleTo(m.x, m.y, target.x, target.y));
  m.moving = false;
}
const opt = (m, o) => ({ melee: true, ang: m.facing, ...o });
const mouth = (m) => [m.x + Math.cos(m.facing) * 0.9, m.y + Math.sin(m.facing) * 0.9];
function gob(m, S, t, o = {}) {
  const w = m.world, [x, y] = mouth(m), K = S.K, mul = o.mul || 1;
  const ang = angleTo(x, y, t.x, t.y) + (o.spread ? rand(-o.spread, o.spread) : 0);
  w.addHazard(new Projectile({ world: w, src: m, x, y, z: o.z || 26, ang, speed: o.speed || 9, range: 9, fx: o.fx || K.fx, el: o.el || (K.el === 'phys' ? 'poison' : K.el),
    dmg: [m.dmg * mul * 0.85, m.dmg * mul * 1.15], size: o.size || 1.1, lob: !!o.lob, tx: t.x, ty: t.y, exp: o.exp || 0, o: o.hit || {}, onEnd: o.onEnd }));
  sfx('squish', 0.35, rand(0.9, 1.3));
  for (let i = 0; i < 4; i++) spawn({ type: 'dot', x, y, z: 24, vx: Math.cos(ang + rand(-0.6, 0.6)) * rand(2, 5), vy: Math.sin(ang + rand(-0.6, 0.6)) * rand(2, 5), vz: rand(10, 50), g: 160, life: 0.4, size: 2, size1: 0.5, color: K.glow });
}
function pool(m, S, x, y, o) {
  const w = m.world;
  w.addHazard(new Area({ world: w, src: m, x, y, r: o.r || 1.3, dur: o.dur || 4, tick: 0.5, fx: o.fx || 'poison', el: o.el || 'poison', dmg: [m.dmg * (o.mul || 0.3) * 0.9, m.dmg * (o.mul || 0.3) * 1.1], slow: !!o.slow, o: o.hit || {} }));
}
function ring(m, S, r, w = 4) { addEffect(new Ring(m.x, m.y, 0.2, r, 0.45, S.K.glow, w, { fill: true })); S.glow = 1; }
/** The Witch's healing from her brood is capped: at most 12% of her life every 6 s, however many grubs heal her. */
function mendOwner(m, n) {
  const o = m.owner;
  if (!o || o.dead) return;
  const B = o._grubMend && o.world.time - o._grubMend.t < 6 ? o._grubMend : (o._grubMend = { t: o.world.time, used: 0 });
  const give = Math.min(n, o.maxHp * 0.12 - B.used);
  if (give > 0) { B.used += give; mend(o, give); }
}
/** Each kind's voice: a pitch on the shared wet sounds. */
const VOICE = { white: 0.8, yellow: 1.25, green: 1.0, orange: 0.6, brown: 0.7, pink: 1.45 };
function voice(m, v = 0.35) { const k = m.grub.kind; sfx(k === 'brown' ? 'blood' : k === 'yellow' ? 'acid' : 'squish', v, VOICE[k] * rand(0.9, 1.1)); }
/** The name of a signature move over the grub that casts it. */
function callout(m, S, name) { floatText(m.x, m.y, 70, name, S.K.glow, 11, { life: 1.1, vz: 12 }); }
function mend(c, n) { if (!c || c.dead || !(n > 0)) return; c.heal ? c.heal(n, false) : (c.hp = Math.min(c.maxHp, c.hp + n)); spawn({ type: 'glow', x: c.x, y: c.y, z: 30, vz: 30, life: 0.6, size: 5, size1: 0, color: '#a0ff90', add: true }); }
const foes = (m, r, x = m.x, y = m.y) => m.world.hostiles(m.team, x, y, r);

const PULSE = { white: 'Rot Wave', yellow: 'Corrode', green: 'Pandemic', orange: 'Burst Pustules', brown: 'Blood Feast', pink: 'Sickly Spores' };
// the nine moves: what each does for a grub of kind k
const MOVES = {
  bite(m, S, t) {
    act(m, S, 'bite', () => {
      if (t.dead || dist(m.x, m.y, t.x, t.y) > m.atkRange(t) + 1.1) return;
      m.lunge = 1;
      const k = S.kind, d = m.deal(t, m.dmg * (k === 'white' ? 1.15 : 1), S.K.el, opt(m, { poison: k === 'green', bleed: k === 'brown', burn: k === 'orange' }));
      if (k === 'brown' && d > 0) mendOwner(m, Math.min(m.owner ? m.owner.maxHp * 0.02 : 0, d * 0.12)); // the Leech's bite feeds the Witch
      spawn({ type: 'glow', x: t.x, y: t.y, z: 18, life: 0.2, size: 6, size1: 14, color: S.K.glow, add: true });
      if (chance(0.5)) voice(m);
    }, t);
    m.cd = m.atkCd;
  },
  slam(m, S, t) {
    S.cds.slam = rand(5, 7);
    act(m, S, 'slam', () => {
      const k = S.kind, r = k === 'orange' ? 2.1 : 1.6, [x, y] = mouth(m);
      aoe(m.world, m, x, y, r, m.dmg * (k === 'orange' ? 1.7 : 1.4), S.K.el, opt(m, { stun: k === 'white' || k === 'orange', knock: k === 'orange' ? 1.2 : 0, poison: k === 'green' }));
      addEffect(new Ring(x, y, 0.2, r, 0.35, '#d8d0b8', 5)); sfx('thud', 0.45, 0.8);
      for (let i = 0; i < 8; i++) { const a = rand(TAU); spawn({ type: 'dot', x: x + Math.cos(a) * 0.5, y: y + Math.sin(a) * 0.5, z: 2, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: rand(30, 80), g: 200, life: 0.5, size: 2.2, size1: 0.6, color: '#8a7a60' }); }
    }, t);
  },
  whip(m, S, t) {
    S.cds.whip = rand(5, 8);
    act(m, S, 'whip', () => {
      aoe(m.world, m, m.x, m.y, 1.9, m.dmg * 0.95, S.K.el, { melee: true, knock: 1, poison: S.kind === 'green', bleed: S.kind === 'brown' });
      addEffect(new Ring(m.x, m.y, 0.4, 1.9, 0.3, S.K.glow, 3));
    }, t);
  },
  spit(m, S, t) {
    const k = S.kind;
    S.cds.spit = k === 'yellow' ? rand(0.5, 0.9) : k === 'green' || k === 'pink' ? rand(1.2, 1.8) : rand(3, 4.5);
    act(m, S, 'spit', () => { if (!t.dead) gob(m, S, t, { mul: k === 'yellow' ? 1.25 : 0.85, hit: { poison: k !== 'pink', slow: k === 'pink' }}); }, t);
  },
  barrage(m, S, t) {
    S.cds.barrage = S.kind === 'yellow' ? rand(4, 6) : rand(8, 11);
    act(m, S, 'barrage', () => { if (!t.dead) gob(m, S, t, { mul: S.kind === 'yellow' ? 0.7 : 0.5, spread: 0.13, speed: 11, hit: { poison: true } }); }, t);
  },
  lob(m, S, t) {
    const k = S.kind;
    S.cds.lob = k === 'yellow' || k === 'green' ? rand(5, 7) : rand(9, 12);
    const tx = t.x, ty = t.y;
    act(m, S, 'lob', () => {
      gob(m, S, { x: tx, y: ty }, { lob: true, exp: 1.3, mul: 1.1, size: 1.7, z: 40, hit: { poison: true } });
      // what the glob leaves where it bursts
      if (k === 'yellow') later(m, 0.75, () => pool(m, S, tx, ty, { r: 1.4, dur: 5, mul: 0.4, fx: 'poison', hit: { burn: true } }));
      if (k === 'green') later(m, 0.75, () => pool(m, S, tx, ty, { r: 1.7, dur: 6, mul: 0.32, fx: 'poison', hit: { poison: true } }));
      if (k === 'pink') later(m, 0.75, () => pool(m, S, tx, ty, { r: 1.5, dur: 4, mul: 0.15, fx: 'poison', slow: true }));
    }, t);
  },
  // ---- the three magics: pulse (a nova of its kind), heal, ward
  pulse(m, S, t) {
    const k = S.kind;
    S.cds.pulse = rand(9, 13);
    const far = S.K.role !== 'melee', tx = far ? t.x : m.x, ty = far ? t.y : m.y;
    callout(m, S, PULSE[k]);
    act(m, S, 'pulse', () => {
      const R = 2.6, list = foes(m, R, tx, ty);
      ring(m, S, R * 0.5, 4); if (far) { addEffect(new Ring(tx, ty, 0.2, R, 0.5, S.K.glow, 5, { fill: true })); gob(m, S, { x: tx, y: ty }, { lob: true, size: 2, z: 40, mul: 0.01 }); }
      sfx(k === 'brown' ? 'blood' : 'poison', 0.6, VOICE[k]);
      if (k === 'white') aoe(m.world, m, tx, ty, R, m.dmg * 1.2, 'poison', { poison: true });                                                                        // Rot Wave
      else if (k === 'yellow') { aoe(m.world, m, tx, ty, R, m.dmg * 0.8, 'poison', { burn: true }); for (const c of list) if (c.curses) c.curses.amp = { t: 6, amt: 25, src: m.owner }; } // Corrode
      else if (k === 'green') { aoe(m.world, m, tx, ty, R + 0.6, m.dmg * 1.1, 'poison', { poison: true }); pool(m, S, tx, ty, { r: R * 0.8, dur: 4, mul: 0.3, hit: { poison: true } }); } // Pandemic
      else if (k === 'orange') { aoe(m.world, m, tx, ty, R, m.dmg * 1.8, 'fire', { knock: 1.6, burn: true, slow: true }); burst(tx, ty, 20, 'fire', 16, 3); }  // Burst Pustules
      else if (k === 'brown') { // Blood Feast: drinks the crowd, feeds the Witch and the brood
        let got = 0;
        for (const c of list) got += m.deal(c, m.dmg * 0.9, 'blood', { bleed: true }) || 0;
        if (got > 0) { mendOwner(m, got * 0.3); for (const g of kinOf(m)) mend(g, g.maxHp * 0.06); }
      } else if (k === 'pink') { for (const c of list) if (c.curses) { c.curses.weaken = { t: 6, amt: 30, src: m.owner }; c.curses.slow = { t: 4, amt: 0.45, src: m.owner }; } } // Sickly Spores
    }, t);
  },
  heal(m, S, who) {
    S.cds.heal = S.kind === 'pink' ? rand(5, 7) : rand(11, 15);
    callout(m, S, S.kind === 'pink' ? 'Soothing Ichor' : 'Regurgitate');
    act(m, S, 'heal', () => {
      const pink = S.kind === 'pink', o = m.owner;
      ring(m, S, pink ? 4 : 2, 3); sfx('heal', 0.4, 1.2);
      if (pink) { for (const g of kinOf(m)) if (dist(g.x, g.y, m.x, m.y) < 5) mend(g, g.maxHp * 0.16); if (o && dist(o.x, o.y, m.x, m.y) < 7) mendOwner(m, o.maxHp * 0.07); } // Soothing Ichor
      else if (who && !who.dead) who === o ? mendOwner(m, o.maxHp * 0.04) : mend(who, who.maxHp * 0.14);                                                                               // Regurgitate
    }, who && who !== m ? who : null);
  },
  ward(m, S) {
    S.cds.ward = S.kind === 'pink' ? rand(10, 13) : rand(13, 17);
    callout(m, S, S.kind === 'pink' ? 'Chrysalis Ward' : 'Molt');
    act(m, S, 'ward', () => {
      const pink = S.kind === 'pink', o = m.owner;
      ring(m, S, pink ? 4 : 1.4, 3); sfx('heal', 0.35, 0.7);
      if (pink) { // Chrysalis Ward: the brood and the Witch harden
        for (const g of kinOf(m)) if (dist(g.x, g.y, m.x, m.y) < 5) g.grub.wardT = 5;
        if (o && o.addBuff && dist(o.x, o.y, m.x, m.y) < 7) o.addBuff({ id: 'grub_ward', name: 'Chrysalis Ward: +40 armor, +20 resistances', el: 'poison', fx: 'shield', stats: { armor: 40, res: 20 }, t: 5, max: 5 });
      } else S.wardT = S.kind === 'orange' ? 7 : 5; // Molt: its own hide hardens
    });
  },
  /** White grubs eat the dead: heal and swell a little (up to six meals). */
  feast(m, S, corpse) {
    S.cds.feast = rand(5, 8); corpse.used = true;
    act(m, S, 'bite', () => {
      mend(m, m.maxHp * 0.3);
      if (S.fed < 6) { S.fed++; m.dmg *= 1.04; m.maxHp = Math.round(m.maxHp * 1.05); }
      burst(corpse.x, corpse.y, 12, 'blood', 8, 2); sfx('gore', 0.4);
      floatText(m.x, m.y, 50, 'devours', '#d8ffb0', 10, { life: 0.8 });
    }, corpse, 0.9);
  },
};
function later(m, t, fn) { m.world.addHazard({ t, update(dt) { this.t -= dt; if (this.t <= 0) { fn(); return false; } return true; }, draw() {} }); }

// ------------------------------------------------------------------ the brain
export function grubUpdate(m, dt) {
  const S = m.grub, w = m.world, K = S.K;
  S.animT += dt * (S.act ? S.act.rate : 1); S.bornT += dt;
  S.glow = Math.max(0, S.glow - dt * 1.4);
  for (const k in S.cds) S.cds[k] -= dt;
  if (S.bornT <= dt * 1.5 && !S.dug && (S.dug = true)) for (let i = 0; i < 14; i++) { const a = rand(TAU), v = rand(1.5, 4); spawn({ type: 'dot', x: m.x + Math.cos(a) * 0.4, y: m.y + Math.sin(a) * 0.4, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 110), g: 260, life: rand(0.5, 0.9), size: rand(2, 3.4), size1: 0.8, color: i % 3 ? '#5a4a38' : '#8a7860' }); } // bursts out of the ground
  if (m.moving && chance(dt * 1.4)) addDecal(m.x - Math.cos(m.facing) * 0.7 + rand(-0.15, 0.15), m.y - Math.sin(m.facing) * 0.7 + rand(-0.15, 0.15), S.kind === 'brown' ? '#5a0c0c' : S.kind === 'white' || S.kind === 'pink' ? '#c8d0b0' : S.K.glow, rand(0.22, 0.38), 'pool', 0.2); // a slime trail
  if (S.wardT > 0) { S.wardT -= dt; m.dmgReduce = Math.max(m.grubBase, S.kind === 'orange' ? 0.55 : 0.4); } else m.dmgReduce = Math.max(m.grubBase, S.kind === 'orange' ? 0.25 : 0);
  // the brood does not lie in a heap: each grub shoulders its neighbours aside
  for (const g of w.creatures) {
    if (g === m || !g.grub || g.dead) continue;
    const dx = m.x - g.x, dy = m.y - g.y, d2 = dx * dx + dy * dy;
    if (d2 < 2.9 && d2 > 1e-4) { const d = Math.sqrt(d2), f = (1.7 - d) * 2.4 * dt / d; w.map.move(m, dx * f, dy * f); }
    else if (d2 <= 1e-4) w.map.move(m, rand(-0.05, 0.05), rand(-0.05, 0.05));
  }
  if (S.act) {
    const a = S.act; a.t += dt * a.rate;
    while (a.i < a.at.length && a.t >= a.at[a.i]) { a.i++; a.fn(a.i - 1); }
    if (a.target && !a.target.dead && a.t < (a.at[0] || 0)) m.face(angleTo(m.x, m.y, a.target.x, a.target.y));
    m.moving = false;
    if (a.t >= a.dur) { S.act = null; S.anim = 'idle'; }
    return;
  }
  const t = m.pickTarget();
  m.target = t;
  const o = m.owner;
  // support magic comes first, in or out of a fight
  if (S.kind === 'pink' && S.bornT > 1) {
    const hurt = kinOf(m).some((g) => g.hp < g.maxHp * 0.7 && dist(g.x, g.y, m.x, m.y) < 5) || (o && o.hp < o.maxHp * 0.7 && dist(o.x, o.y, m.x, m.y) < 7);
    if (hurt && S.cds.heal <= 0) return MOVES.heal(m, S);
    if (t && S.cds.ward <= 0 && dist(m.x, m.y, t.x, t.y) < 8) return MOVES.ward(m, S);
  }
  if (t && S.kind !== 'pink' && m.hp < m.maxHp * 0.5 && S.cds.ward <= 0) return MOVES.ward(m, S); // Molt
  if (S.kind === 'white' && S.cds.heal <= 0) { // Regurgitate for the most hurt of the brood (or the Witch)
    const kin = kinOf(m).filter((g) => g !== m && g.hp < g.maxHp * 0.5 && dist(g.x, g.y, m.x, m.y) < 4).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const who = kin || (o && o.hp < o.maxHp * 0.4 && dist(o.x, o.y, m.x, m.y) < 4 ? o : null);
    if (who) return MOVES.heal(m, S, who);
  }
  if (S.kind === 'white' && S.cds.feast <= 0 && (!t || m.hp < m.maxHp * 0.6) && (m.hp < m.maxHp || S.fed < 6)) {
    const c = w.corpses.find((c) => !c.used && dist(c.x, c.y, m.x, m.y) < (t ? 2.5 : 6));
    if (c) { if (dist(c.x, c.y, m.x, m.y) > 1.3) { m.moveToward(c.x, c.y, dt, m.speed); S.anim = 'slither'; return; } return MOVES.feast(m, S, c); }
  }
  if (!t) {
    m.followOwner(dt);
    const far = o && dist(m.x, m.y, o.x, o.y) > 4;
    setAnim(S, m.moving ? (far ? 'slither_fast' : 'slither') : 'idle');
    if (far && m.moving) w.map.move(m, Math.cos(m.facing) * m.speed * 0.45 * dt, Math.sin(m.facing) * m.speed * 0.45 * dt); // hurries to catch up
    else if (o && dist(m.x, m.y, o.x, o.y) < 2.4) { const a = angleTo(o.x, o.y, m.x, m.y); w.map.move(m, Math.cos(a) * 1.6 * dt, Math.sin(a) * 1.6 * dt); } // never piles onto the Witch
    return;
  }
  const d = dist(m.x, m.y, t.x, t.y), near = foes(m, 2.2).length, los = d < 9 && w.map.los(m.x, m.y, t.x, t.y);
  m.trackTarget(t, dt);
  if (S.cds.pulse <= 0) { // the signature magic: a melee grub's round itself, a ranged one's flung onto its target's pack
    const ok = K.role === 'melee' ? near >= (S.kind === 'white' ? 3 : 2) : los && d <= 7.5 && foes(m, 2.6, t.x, t.y).length >= (S.kind === 'pink' ? 1 : 2);
    if (ok) return MOVES.pulse(m, S, t);
  }
  const reach = m.atkRange(t) + 0.35;
  if (K.role === 'melee') {
    if (d <= reach) {
      m.face(angleTo(m.x, m.y, t.x, t.y)); m.moving = false; setAnim(S, 'idle');
      if (near >= 2 && S.cds.slam <= 0) return MOVES.slam(m, S, t);
      if (near >= 3 && S.cds.whip <= 0) return MOVES.whip(m, S, t);
      if (m.cd <= 0) return MOVES.bite(m, S, t);
      return;
    }
    if (los && d > 3 && S.kind !== 'orange') { // on the way in: a gob of bile, a lob at a crowd; a barrage only from far off (the Bloat never stops: it must arrive)
      if (S.cds.lob <= 0 && foes(m, 1.6, t.x, t.y).length >= 3) return MOVES.lob(m, S, t);
      if (S.cds.barrage <= 0 && d > 5.5) return MOVES.barrage(m, S, t);
      if (S.cds.spit <= 0) return MOVES.spit(m, S, t);
    }
    m.chase(dt, t); setAnim(S, m.moving ? (d > 3.5 ? 'slither_fast' : 'slither') : 'idle');
    return;
  }
  // ranged and support: hold a distance, shoot; bite or whip what gets close
  const want = K.role === 'support' ? 5.5 : 6.5;
  if (d <= reach + 0.2) {
    if (near >= 2 && S.cds.whip <= 0) return MOVES.whip(m, S, t);
    if (S.cds.slam <= 0 && near >= 3) return MOVES.slam(m, S, t);
    if (m.cd <= 0) return MOVES.bite(m, S, t);
  }
  if (d > want || !los) {
    if (K.role === 'support' && o && dist(m.x, m.y, o.x, o.y) > 5) m.followOwner(dt); else m.chase(dt, t);
    setAnim(S, m.moving ? 'slither' : 'idle');
    return;
  }
  m.face(angleTo(m.x, m.y, t.x, t.y));
  if (d < 2.8 && !S.cornered) { // too close: slither back out of reach first (stuck against a wall, it fights where it is)
    const a = angleTo(t.x, t.y, m.x, m.y), x0 = m.x, y0 = m.y;
    m.moveToward(m.x + Math.cos(a), m.y + Math.sin(a), dt, m.speed * 0.9); setAnim(S, 'slither');
    if (Math.hypot(m.x - x0, m.y - y0) < m.speed * dt * 0.2) S.cornered = 1.5;
    return;
  }
  if (S.cornered) S.cornered = Math.max(0, S.cornered - dt) || 0;
  if (S.cds.lob <= 0 && (foes(m, 1.6, t.x, t.y).length >= 2 || S.kind === 'green')) return MOVES.lob(m, S, t);
  if (S.cds.barrage <= 0) return MOVES.barrage(m, S, t);
  if (S.cds.spit <= 0) return MOVES.spit(m, S, t);
  if (d < 2.6) { const a = angleTo(t.x, t.y, m.x, m.y); m.moveToward(m.x + Math.cos(a), m.y + Math.sin(a), dt, m.speed * 0.8); setAnim(S, 'slither'); } // backs off
  else { m.moving = false; setAnim(S, 'idle'); }
}
function setAnim(S, a) { if (S.anim !== a) { S.anim = a; S.animT = a === 'idle' ? rand(3) : 0; } }
