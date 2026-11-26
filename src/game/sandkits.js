// The Sea of Sand bestiary in a fight (data/sandkin.js, data/sandkits.js): each of the 510 has its own moves, shots and
// pattern sizes (read by Monster.movePerform/moveTick through m.sandKit) and one or two PASSIVES, the rules below. They
// ride on the Castle Creatures' kit hooks (game/castlekin.js: tick/hit/hurt/taken/death), combined into one kit.
// They also shout at the hero now and then (yell): a speech bubble from data/sandvoices.js, in their own voice.
import { rand, chance, TAU, angleTo, angleDiff, pick } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Telegraph, Ring, sparkle, floatText, smoke, elem } from '../gfx/vfx.js';
import { Projectile, Area } from './hazards.js';
import { spawnKin } from './castlekin.js';
import { SAND_KITS, sandVoice } from '../data/sandkits.js';
import { SAND_VOICES } from '../data/sandvoices.js';

const tele = (o) => addEffect(new Telegraph(o), 'ground');
const ready = (s, k, dt, every, first = every * 0.5) => { s[k] = (s[k] ?? first) - dt; if (s[k] > 0) return false; s[k] = every; return true; };
const glow = (m) => elem(m.el && m.el !== 'phys' ? m.el : 'fire').glow;
const allies = (m, r) => m.world.query(m.x, m.y, r, (c) => c !== m && c.team === m.team && !c.dead && !c.summon && c.targetable !== false && !c.static);
const bigOne = (m) => m.rank === 'boss' || !!m.sandArt?.lone;
const tag = (m, text) => floatText(m.x, m.y, (m.artH || 40) * (m.scale || 1) + 12, text, '#ffd89a', 12, { life: 1.2, vz: 16 });

/** The passives: one rule each, a boss or mythic has two. desc is what the player sees happen. */
export const PASSIVES = {
  sandstep: { desc: 'side-steps out of the way after a heavy blow',
    hurt(m, src, dmg, s) {
      if (!src || dmg < m.maxHp * 0.06 || (s.stepT || 0) > m.world.time) return;
      s.stepT = m.world.time + 4;
      const a = angleTo(src.x, src.y, m.x, m.y) + (chance(0.5) ? 1.4 : -1.4), x = m.x + Math.cos(a) * 1.8, y = m.y + Math.sin(a) * 1.8;
      if (!m.world.map.circleFree(x, y, 0.35)) return;
      smoke(m.x, m.y, 5, '#c8a060', 6, 10); m.x = x; m.y = y; m.nav = null; smoke(x, y, 5, '#c8a060', 6, 10);
    } },
  mirage: { desc: 'below half life, splits into two fading mirages',
    hurt(m, src, dmg, s) {
      if (s.mirage || m.hp > m.maxHp * 0.5 || bigOne(m) || m.mirageOf) return;
      s.mirage = true; tag(m, 'Mirage!'); sfx('arcane', 0.5);
      for (let i = 0; i < 2; i++) {
        const a = rand(TAU), c = spawnKin(m, m.art, m.x + Math.cos(a) * 1.2, m.y + Math.sin(a) * 1.2, { kit: false, hp: 0.12, dmg: 0.5, xp: 0.05, name: m.name });
        c.mirageOf = m; c.alpha = 0.55; c.life = 7; c.lifeT = 0;
      }
    } },
  scorch: { desc: 'its blows leave the ground burning', hit(m, t, dmg, s) {
    if ((s.scT || 0) > m.world.time) return;
    s.scT = m.world.time + 3;
    m.world.addHazard(new Area({ world: m.world, src: m, x: t.x, y: t.y, r: 1, dur: 3, tick: 0.5, dmg: [m.dmg * 0.15, m.dmg * 0.2], el: 'fire', fx: 'fire' }));
  } },
  duststorm: { desc: 'whips up a sand cloud round itself that slows', tick(m, dt, t, d, s) {
    if (d > 4 || !ready(s, 'dust', dt, 9, 3)) return false;
    tele({ kind: 'circle', x: m.x, y: m.y, r: 2.2, dur: 0.5, color: '#d8b070' });
    m.world.addHazard(new Area({ world: m.world, src: m, x: m.x, y: m.y, r: 2.2, dur: 4, tick: 0.5, dmg: [m.dmg * 0.08, m.dmg * 0.12], el: 'phys', fx: 'sand', slow: true }));
    sfx('wind', 0.4);
    return false;
  } },
  curse: { desc: 'its blows chill and bleed', hit(m, t, dmg, s) { if (t.status && chance(0.35)) { t.status.chill = { t: 2, amt: 0.35 }; t.status.bleed = { t: 2.5, dps: m.dmg * 0.15, src: m }; } } },
  rally: { desc: 'when it falls the others nearby rage', death(m) {
    for (const c of allies(m, 6)) { c.speed *= 1.25; c.dmg *= 1.15; c.aura = c.aura || '#ff8040'; }
    addEffect(new Ring(m.x, m.y, 0.3, 6, 0.5, '#ff9040', 4)); tag(m, 'Avenge me!');
  } },
  bulwark: { desc: 'takes a third less from the front', taken(m, src, el, o) {
    if (!src || o.dot) return 1;
    return Math.abs(angleDiff(m.facing, angleTo(m.x, m.y, src.x, src.y))) < 1.1 ? 0.67 : 1;
  } },
  regrow: { desc: 'knits itself back together when left alone', tick(m, dt, t, d, s) {
    if (!(m.regenSuppress > 0) && m.hp < m.maxHp) { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.02 * dt); if (ready(s, 'rg', dt, 1.2)) sparkle(m.x, m.y, 30, '#a0ff90', 4, 0.4); }
    return false;
  } },
  vengeance: { desc: 'bursts into a ring of shots when it dies', death(m) {
    const k = m.sandKit, n = Math.round(8 * (k ? k.n : 1)), a0 = rand(TAU), el = m.el || 'phys';
    for (let i = 0; i < n; i++) m.world.addHazard(new Projectile({ world: m.world, src: m, x: m.x, y: m.y, ang: a0 + i / n * TAU, speed: 4, range: 6, fx: (k && k.fx) || 'shard', el, dmg: [m.dmg * 0.4, m.dmg * 0.55] }));
  } },
  quicksand: { desc: 'dies into a sinking pit of quicksand', death(m) {
    m.world.addHazard(new Area({ world: m.world, src: m, x: m.x, y: m.y, r: 1.6, dur: 5, tick: 0.5, dmg: [m.dmg * 0.1, m.dmg * 0.15], el: 'phys', fx: 'sand', slow: true }));
  } },
  sunflare: { desc: 'blazes up, faster and fiercer, when nearly dead', hurt(m, src, dmg, s) {
    if (s.flare || m.hp > m.maxHp * 0.3) return;
    s.flare = true; m.speed *= 1.3; m.dmg *= 1.25; m.aura = '#ffb030'; tag(m, 'Sunflare!');
    addEffect(new Ring(m.x, m.y, 0.3, 2.4, 0.4, '#ffd040', 5)); sfx('fire', 0.5);
  } },
  shadowstep: { desc: 'slips behind a hero who keeps away', tick(m, dt, t, d, s) {
    if (d < 4 || d > 10 || !ready(s, 'ss', dt, 8, 4)) return false;
    let x, y; // behind the hero, else as near behind as the walls allow
    for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
      const a = (t.facing ?? 0) + Math.PI + off, sx = t.x + Math.cos(a) * 1.4, sy = t.y + Math.sin(a) * 1.4;
      if (m.world.map.circleFree(sx, sy, 0.35) && m.world.map.flowAt(sx, sy) >= 0) { x = sx; y = sy; break; }
    }
    if (x === undefined) { s.ss = 1; return false; }
    sparkle(m.x, m.y, 30, glow(m), 18, 0.4); m.x = x; m.y = y; m.nav = null; sparkle(x, y, 30, glow(m), 18, 0.4);
    m.cd = Math.min(m.cd, 0.3); sfx('arcane', 0.4);
    return false;
  } },
};

/** makeMonster: give one of the 510 its kit (moves are set there; this wires the passives). */
export function attachSandKit(m, K) {
  const ps = K.passive.map((k) => PASSIVES[k]).filter(Boolean), each = (f) => ps.filter((p) => p[f]);
  const ticks = each('tick'), hits = each('hit'), hurts = each('hurt'), takens = each('taken'), deaths = each('death');
  m.sandKit = K; m.ks = {};
  m.kit = {
    tick: ticks.length ? (m, dt, t, d, s) => { for (const p of ticks) p.tick(m, dt, t, d, s); yellTick(m, dt, t, d); return false; } : (m, dt, t, d) => { yellTick(m, dt, t, d); return false; },
    hit: hits.length ? (m, t, dmg, s) => { for (const p of hits) p.hit(m, t, dmg, s); } : null,
    hurt: (m, src, dmg, s) => { for (const p of hurts) p.hurt(m, src, dmg, s); if (!s.seen) { s.seen = true; yell(m, bigOne(m) ? 0.9 : 0.3); } else if (!s.lowYell && m.hp < m.maxHp * 0.3) { s.lowYell = true; yell(m, 0.6); } },
    taken: takens.length ? (m, src, el, o, s) => takens.reduce((k, p) => k * p.taken(m, src, el, o, s), 1) : null,
  };
  if (deaths.length) { const prev = m.onDeath; m.onDeath = (src) => { if (prev) prev.call(m, src); for (const p of deaths) p.death(m, src, m.ks); }; }
}
/** Monster.trySpecial: a special move began. The first one of a fight is called out by name. */
export function sandMoveCalled(m) {
  if (!m.sandKit) return;
  if (!m.ks.titled) { m.ks.titled = true; tag(m, m.sandKit.title); }
  else yell(m, 0.12);
}

// ------------------------------------------------------------------------------------------------ yelling
// At most two bubbles up at once and one new one every ~2.5 s level-wide; a monster speaks at most every 12 s; the last
// 60 lines heard don't come round again.
const recent = [];
export function sandLines(m) {
  const a = m.sandArt, v = sandVoice(a), own = SAND_VOICES[v] || SAND_VOICES.beast;
  return a.boss ? [...own, ...SAND_VOICES.boss] : own;
}
export function yell(m, p = 1, force = false) {
  const w = m.world;
  if (!m.sandArt || m.dead || !w || (!force && !chance(p))) return false;
  if (!force && ((m.yellT || 0) > w.time || (w.sandYellT || 0) > w.time)) return false;
  if (!force && w.creatures.filter((c) => c.talkT > 0 && c.team === 'enemy').length >= 2) return false;
  const lines = sandLines(m);
  let line = pick(lines);
  for (let i = 0; i < 6 && recent.includes(line); i++) line = pick(lines);
  recent.push(line); if (recent.length > 60) recent.shift();
  m.talkText = line; m.talkT = 2.2 + line.length * 0.035; m.talkAge = 0; m.bubbleLines = 3;
  m.yellT = w.time + 12; w.sandYellT = w.time + 2.5;
  return true;
}
/** A BOSS ROOM's desert boss (raid AI, no kit): it speaks up at the first blow, at half and a fifth of its life, and now and then. */
export function bossYell(m) {
  const s = m.ks || (m.ks = {}), f = m.hp / m.maxHp;
  if (!s.seen) { s.seen = true; yell(m, 1); }
  else if (!s.half && f < 0.5) { s.half = true; yell(m, 1); }
  else if (!s.low && f < 0.2) { s.low = true; yell(m, 1); }
  else yell(m, 0.04);
}
/** Every frame with a target: the first sight of the hero, and now and then mid-fight. */
function yellTick(m, dt, t, d) {
  if (!t || !t.isPlayer) return;
  if (!m.ks.seen) { // a pack spots the hero at once: the rest wait their turn rather than all being cut off
    if ((m.world.sandYellT || 0) > m.world.time && chance(0.995)) return;
    m.ks.seen = true; yell(m, bigOne(m) ? 1 : 0.35); return;
  }
  if (d < 9 && chance(dt * 0.025)) yell(m, 1);
}
export { SAND_KITS };
