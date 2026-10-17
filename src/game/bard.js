// The Bard composes. Every Bard skill writes its glyph (data/notation.js) into the 4/4 measure over his head.
// Exactly four beats plays a Cadence: in the treble key every written note flies off the staff again as a homing
// note, in the bass key the measure lands as one ground-shaking chord; rests breathe mana and life back.
// A perfect cadence builds Harmony (+6% Bard damage each, up to 5, 12 s); overfilling the bar is a Discord that
// scatters the notes and breaks Harmony. Clefs (0 beats) change the key. Also the note projectiles' special
// behaviours (vibrato, staccato, fermata, crescendo, glissando, scatter, triplets, rests) and the cosmetic note
// flights of skills that are not projectiles.
import { G } from '../state.js';
import { rand, chance, TAU, angleTo, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { addEffect, Ring, floatText, effects } from '../gfx/vfx.js';
import { NOTES, MEASURE, SINGLE, noteOf, noteTier } from '../data/notation.js';
import { SKILLS } from '../data/skills.js';
import { ScoreFx, scoreWorld, cadenceFx, flyNote, noteParticles, noteBurst, drawStaff, drawNoteShape, TIERS } from '../gfx/notation.js';
import { hit, aoe } from './combat.js';
import { Projectile } from './hazards.js';
import { GroundItem } from './loot.js';

class Wait {
  constructor(t, fn) { this.t = t; this.fn = fn; }
  update(dt) { this.t -= dt; if (this.t <= 0) { this.fn(); return false; } return true; }
  draw() {}
}
const later = (w, t, fn) => w.addHazard(new Wait(t, fn));
const roll = (d) => rand(d[0], d[1]);
const EPS = 1e-6;

export function bardScore(p) {
  return p.score || (p.score = { notes: [], beats: 0, key: 'treble', harmony: 0, harmonyT: 0, idle: 0, flash: 0, discord: 0, cadences: 0, discords: 0 });
}
const avgOf = (d) => (d[0] + d[1]) / 2;
/** What one written note is worth in a cadence: the skill's hit, never less than the basic attack's. */
function noteDmg(p, sk, L) {
  const basic = SKILLS['bard.0.0'];
  return Math.max(avgOf(p.skillDamage(sk, L)), avgOf(p.skillDamage(basic, Math.max(1, p.skillLevel(basic)))));
}
const rubato = (p) => p.buffs.some((b) => b.t > 0 && SKILLS[b.id] && SKILLS[b.id].m.rubato);

/**
 * The glyph a cast writes. The free basic notes fill the bar: with less than a beat left they play the longest
 * note that still fits (eighth, sixteenth, or a thirty-second rest), so the basic attack never causes a Discord.
 */
export function bardNoteFor(p, sk) {
  const g = noteOf(sk);
  if (!g || !sk.m.free || !p.score) return g;
  const rem = MEASURE - p.score.beats;
  if (NOTES[g].beats <= rem + EPS) return g;
  return ['e', 's', 'rt'].find((k) => NOTES[k].beats <= rem + EPS) || g;
}

/** A Bard skill was cast: write its note into the measure (called by Player.tryUseSkill). */
export function bardCompose(p, sk, L) {
  const g = bardNoteFor(p, sk);
  if (!g || !p.world || p.world.kind === 'town') return;
  const sc = bardScore(p), N = NOTES[g], tier = noteTier(L);
  sc.idle = 0;
  if (N.clef) {
    if (sc.key !== N.clef) { sc.key = N.clef; floatText(p.x, p.y, 92, N.clef === 'bass' ? 'Bass Clef' : 'Treble Clef', TIERS[tier].staff, 11); }
    sc.flash = Math.max(sc.flash, 0.5);
    return;
  }
  if (sk.m.dacapo && sc.notes.length) cadence(p, sc, 1.5, false, 'Da Capo!');
  if (sc.beats + N.beats > MEASURE + EPS) {
    if (rubato(p)) cadence(p, sc, 1, true, 'Rubato!');
    else discord(p, sc);
  }
  sc.notes.push({ g, at: sc.beats, tier, dmg: noteDmg(p, sk, L), el: sk.el, sk: sk.id });
  sc.beats += N.beats;
  if (Math.abs(sc.beats - MEASURE) < EPS) cadence(p, sc, 1, true);
}

function discord(p, sc) {
  for (const n of sc.notes) { const [x, y, z] = scoreWorld(p, n.at); noteBurst(x, y, z, 0, 1, [n.g]); }
  sc.notes.length = 0; sc.beats = 0; sc.harmony = 0; sc.discord = 1; sc.discords++;
  if (G.bardStats) G.bardStats.dis++;
  floatText(p.x, p.y, 92, 'Discord', '#ff6060', 12);
  sfx('error', 0.5);
}

function cadence(p, sc, mul, perfect, label) {
  const notes = sc.notes.splice(0), w = p.world;
  sc.beats = 0;
  if (!notes.length) return;
  if (perfect) { sc.harmony = Math.min(5, sc.harmony + 1); sc.harmonyT = 12; }
  sc.flash = 1; sc.cadences++;
  if (G.bardStats) G.bardStats.cad++; // tests count them across heroes and levels
  const H = 1 + 0.1 * sc.harmony, tier = Math.max(...notes.map((n) => n.tier)), last = notes[notes.length - 1];
  const rests = notes.filter((n) => NOTES[n.g].rest).length;
  if (rests) { p.mana = Math.min(p.maxMana, p.mana + p.maxMana * 0.04 * rests); p.heal(p.maxHp * 0.015 * rests, true); }
  cadenceFx(p, tier, notes.map((n) => n.g));
  floatText(p.x, p.y, 96, label || (sc.harmony > 1 ? `Cadence! Harmony ${sc.harmony}` : 'Cadence!'), TIERS[Math.min(4, sc.harmony)].staff, 13);
  sfx('note', 1);
  if (sc.key === 'bass') {
    // one low chord: everything written lands at once around the Bard
    const total = notes.reduce((s, n) => s + n.dmg, 0) * 0.42 * mul * H, r = 3.2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      flyNote({ x0: p.x, y0: p.y, z0: 30, x1: p.x + Math.cos(a) * r, y1: p.y + Math.sin(a) * r, z1: 6, dur: 0.32, glyph: i % 2 ? 'bass' : notes[i % notes.length].g, tier, burst: 2, s: 1.1 });
    }
    for (let i = 0; i < 3; i++) addEffect(new Ring(p.x, p.y, 0.1, r * (0.6 + i * 0.25), 0.35 + i * 0.12, TIERS[tier].glow, 4));
    aoe(w, p, p.x, p.y, r, total, last.el, { sk: last.sk, knock: 1.4, stun: true, bardT: tier });
    camera.shake(7);
    return;
  }
  // treble: the written notes leave the staff one after another and home in
  const foes = w.hostiles(p.team, p.x, p.y, 9).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));
  const shots = notes.slice(0, 16), over = notes.length > 16 ? notes.length / 16 : 1;
  shots.forEach((n, i) => later(w, 0.05 + i * 0.06, () => {
    if (p.dead || p.world !== w) return;
    let [x, y, z] = scoreWorld(p, n.at + Math.min(0.5, NOTES[n.g].beats / 2) * 0.6);
    if (!w.map.isFloor(x, y)) { x = p.x; y = p.y; }
    const t = foes.length ? foes[i % foes.length] : null;
    const ang = t && !t.dead ? angleTo(x, y, t.x, t.y) : rand(TAU), d = n.dmg * 0.5 * mul * H * over;
    w.addHazard(new Projectile({ world: w, src: p, x, y, z, ang, speed: 10, range: 9, fx: 'n_' + n.g, el: n.el, dmg: [d * 0.9, d * 1.1], o: { sk: n.sk, bardT: n.tier }, home: 1.6, tier: n.tier, light: true, cadence: true }));
  }));
}

/** Per-frame upkeep (called by Player.update): Harmony decay, a forgotten tune, the staff over the head. */
export function bardUpdate(p, dt) {
  const sc = bardScore(p);
  if (!p._scoreFx || !effects.includes(p._scoreFx)) addEffect(p._scoreFx = new ScoreFx(p));
  sc.flash = Math.max(0, sc.flash - dt * 2); sc.discord = Math.max(0, sc.discord - dt * 2.5);
  if (sc.harmony && (sc.harmonyT -= dt) <= 0) sc.harmony = 0;
  if (sc.notes.length && (sc.idle += dt) > 6) { sc.notes.length = 0; sc.beats = 0; }
}
/** Bard skill damage multiplier from Harmony. */
export const harmonyMul = (p) => (p.score && p.score.harmony ? 1 + 0.06 * p.score.harmony : 1);

// ===================================================================== note projectiles
const turn = (pr, a) => { const c = Math.cos(a), s = Math.sin(a), vx = pr.vx; pr.vx = vx * c - pr.vy * s; pr.vy = vx * s + pr.vy * c; };

/** Called by the Projectile constructor for any 'n_*' fx. */
export function bardProjInit(pr) {
  pr.note = pr.note || pr.fx.slice(2);
  pr.tier = pr.tier || 0; pr.hist = []; pr.seed = rand(TAU); pr.bm = pr.bm || {};
  pr.baseSp = pr.speed; pr.baseDmg = pr.dmg; pr.baseSize = pr.size; pr.head = pr.ang;
  if (pr.bm.ferm) pr.pierce = Math.max(pr.pierce, 99);
  if (pr.bm.stac) pr.pierce = Math.max(pr.pierce, 2);
}

/** Behaviour + particles each frame, before the projectile moves. */
export function bardProjUpdate(pr, dt) {
  const m = pr.bm, w = pr.world;
  if (pr.cadence && pr.z > 26) pr.z = Math.max(26, pr.z - dt * 150);
  if (!pr.lob && !pr.returning) {
    let sp = pr.baseSp;
    if (m.wavy) turn(pr, 0.6 * 11 * Math.cos(pr.t * 11 + pr.seed) * dt);
    if (m.gliss) sp *= 1 + Math.min(1.6, pr.t * 2.2);
    if (m.stac) {
      const go = (pr.t % 0.3) < 0.17;
      sp *= go ? 1.9 : 0.05;
      if (!go && pr.stacOn) { // each hop ends in a little pulse
        aoe(w, pr.src, pr.x, pr.y, 0.9 * pr.size, roll(pr.dmg) * 0.35, pr.el, { ...pr.o });
        addEffect(new Ring(pr.x, pr.y, 0.1, 0.9 * pr.size, 0.25, TIERS[pr.tier].glow, 2));
      }
      pr.stacOn = go;
    }
    if (m.ferm) {
      if (!pr.fermDone && !(pr.held > 0)) {
        const want = pr.tx != null ? Math.min(pr.range * 0.75, Math.max(1.5, dist(pr.sx, pr.sy, pr.tx, pr.ty))) : pr.range * 0.5;
        if (dist(pr.sx, pr.sy, pr.x, pr.y) >= want) { pr.held = m.hold || 2; pr.life = pr.t + pr.held + 0.4; pr.pulseT = 0; }
      }
      if (pr.held > 0) {
        sp = 0; pr.held -= dt; pr.pulseT -= dt;
        if (pr.pulseT <= 0) {
          pr.pulseT = 0.4;
          aoe(w, pr.src, pr.x, pr.y, 1.4 * pr.size, roll(pr.dmg) * 0.45, pr.el, { ...pr.o });
          addEffect(new Ring(pr.x, pr.y, 0.15, 1.4 * pr.size, 0.4, TIERS[pr.tier].glow, 3));
          addEffect(new Ring(pr.x, pr.y, 0.1, 1.0 * pr.size, 0.3, TIERS[pr.tier].staff, 1));
        }
        if (pr.held <= 0) pr.fermDone = true;
      }
    }
    const cur = Math.hypot(pr.vx, pr.vy);
    if (cur > 0.001) pr.head = Math.atan2(pr.vy, pr.vx);
    pr.vx = Math.cos(pr.head) * sp; pr.vy = Math.sin(pr.head) * sp;
  }
  if (m.cresc) {
    const k = Math.min(1, pr.t / 0.9);
    pr.size = pr.baseSize * (1 + 0.8 * k); pr.dmg = pr.baseDmg.map((v) => v * (1 + 0.9 * k));
  }
  const h = pr.hist, last = h[0];
  if (!last || Math.hypot(pr.x - last[0], pr.y - last[1]) + Math.abs(pr.z - last[2]) / 40 > 0.1) { h.unshift([pr.x, pr.y, pr.z]); if (h.length > 16) h.pop(); }
  noteParticles(pr.x, pr.y, pr.z, pr.tier, dt, Math.min(1.6, pr.size));
}

/** On-hit extras of a note projectile (d = the hit it just dealt). */
export function bardProjHit(pr, c, d) {
  const m = pr.bm, w = pr.world, src = pr.src;
  if (m.trip) for (let i = 1; i <= 2; i++) later(w, i * 0.09, () => { if (!c.dead) { hit(src, c, d * 0.5, pr.el, { ...pr.o }); noteBurst(c.x, c.y, 30, pr.tier, 1, [pr.note]); } });
  if (m.hush && src && src.isPlayer) src.mana = Math.min(src.maxMana, src.mana + src.maxMana * 0.012);
  if (m.gold && chance(0.3)) w.addLoot(new GroundItem(c.x, c.y, 'gold', { amount: Math.round((2 + c.level * 2) * (1 + ((src && src.st && src.st.goldFind) || 0) / 100)) }));
  if (m.scatter && !pr.child && (NOTES[pr.note].heads || 1) > 1) {
    const n = NOTES[pr.note].heads, base = pr.head, one = SINGLE[pr.note] || 'q';
    for (let i = 0; i < n; i++) {
      w.addHazard(new Projectile({ world: w, src, team: pr.team, x: c.x, y: c.y, ang: base + (i / (n - 1) - 0.5) * 1.3, speed: pr.baseSp * 1.1, range: 4.5, fx: 'n_' + one, el: pr.el, dmg: pr.baseDmg.map((v) => v * 0.5), o: pr.o, size: 0.8, child: true, tier: pr.tier, light: true }));
    }
    pr.bm = { ...m, scatter: false };
  }
  if (chance(G.touch ? 0.3 : 0.6)) noteBurst(c.x, c.y, pr.z, pr.tier, 2, [pr.note]);
}

/** Draw a note projectile: its particle staff, then the glyph. */
export function bardProjDraw(ctx, pr, px, py) {
  const pts = pr.hist.map(([x, y, z]) => [isoX(x, y), isoY(x, y) - z]);
  if (pts.length) pts[0] = [px, py];
  drawStaff(ctx, pts, pr.tier, pr.t, Math.min(1.5, 1.1 * pr.size), 1, pr.seed);
  ctx.save(); ctx.translate(px, py); drawNoteShape(ctx, pr.note, pr.size, pr.t, pr.tier); ctx.restore();
}

/** Orbiting notes ride a ring-shaped staff. */
export function bardOrbitDraw(ctx, orb) {
  const s = orb.src, cx = isoX(s.x, s.y), cy = isoY(s.x, s.y) - 24, r = orb.rad || orb.radius, tier = (orb.o && orb.o.bardT) || 0;
  const pts = [];
  for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU + orb.t * 0.8; pts.push([cx + (Math.cos(a) - Math.sin(a)) * r * HW, cy + (Math.cos(a) + Math.sin(a)) * r * HH]); }
  drawStaff(ctx, pts, tier, orb.t, 0.9, 0.55, 0, false);
}

/** Falling notes trail a short vertical staff. */
export function bardRainDraw(ctx, rain, f, x, y) {
  const px = isoX(x, y), py = isoY(x, y) - f.z, tier = (rain.o && rain.o.bardT) || 0;
  const pts = [];
  for (let i = 0; i < 7; i++) pts.push([px + i * 1.2, py - i * 9]);
  drawStaff(ctx, pts, tier, rain.t, 0.9, 0.9, f.ox * 3);
}

/** The Harmonic Beam: a straight five-line staff from the lute with notes streaming along it. */
export function bardBeamDraw(ctx, beam, ax, ay, bx, by) {
  const tier = (beam.o && beam.o.bardT) || 0, n = 18, pts = [];
  for (let i = 0; i <= n; i++) pts.push([ax + (bx - ax) * (i / n), ay + (by - ay) * (i / n)]);
  drawStaff(ctx, pts, tier, beam.t * 1.6, 1.5, 1, 0, false);
  const T = TIERS[tier], len = Math.hypot(bx - ax, by - ay) || 1;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.strokeStyle = T.glow; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const glyphs = ['q', 'e', 's2', 'e2', 't8', 's'];
  for (let i = 0; i < 6; i++) {
    const k = ((beam.t * 1.4 + i / 6) % 1), x = ax + (bx - ax) * k, y = ay + (by - ay) * k + Math.sin(k * 12 + i) * 3;
    ctx.save(); ctx.translate(x, y); drawNoteShape(ctx, glyphs[i], 0.8 + 0.2 * Math.sin(k * Math.PI), beam.t + i, tier); ctx.restore();
  }
  ctx.save(); ctx.translate(ax + (bx - ax) * 6 / len, ay + (by - ay) * 6 / len); drawNoteShape(ctx, beam.fx.slice(2), 1.1, beam.t, tier); ctx.restore();
}

// ===================================================================== cast flights for non-projectile skills
/** Every Bard skill shoots its glyph: buffs float it up, novas fling a ring of it, area spells drop it from above... */
export function bardCastFx(p, sk, L, tx, ty) {
  const g = noteOf(sk), k = sk.kind, m = sk.m;
  if (!g || k === 'proj' || k === 'orbit' || k === 'rain' || k === 'beam') return;
  const tier = noteTier(L), s = 1 + tier * 0.06;
  if (k === 'buff' || k === 'heal' || k === 'summon') {
    for (let i = 0; i < 3; i++) {
      const a = rand(TAU);
      flyNote({ x0: p.x + Math.cos(a) * 0.4, y0: p.y + Math.sin(a) * 0.4, z0: 18, x1: p.x + Math.cos(a + 2) * 0.9, y1: p.y + Math.sin(a + 2) * 0.9, z1: 86, dur: 0.75, glyph: g, tier, delay: i * 0.09, s, ease: true });
    }
  } else if (k === 'nova' || k === 'whirl' || (k === 'curse' && m.at === 'self')) {
    const r = (k === 'curse' ? 2.2 : k === 'whirl' ? 1.4 : 3) * (m.r ?? 1), n = G.touch ? 6 : 10, b = rand(TAU);
    for (let i = 0; i < n; i++) {
      const a = b + (i / n) * TAU;
      flyNote({ x0: p.x, y0: p.y, z0: 30, x1: p.x + Math.cos(a) * r, y1: p.y + Math.sin(a) * r, z1: 14, dur: 0.38, glyph: g, tier, burst: 1, s, ease: true });
    }
  } else if (k === 'aoe') {
    flyNote({ x0: tx - 1.6, y0: ty - 1.6, z0: 230, x1: tx, y1: ty, z1: 8, dur: 0.42, glyph: g, tier, s: s * 1.5, burst: 8 });
  } else if (k === 'leap' || k === 'dash' || k === 'blink') {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      flyNote({ x0: tx, y0: ty, z0: 20, x1: tx + Math.cos(a) * 1.6, y1: ty + Math.sin(a) * 1.6, z1: 10, dur: 0.35, glyph: g, tier, delay: 0.22, burst: 1, s });
    }
  } else { // curses, zones, walls, chains, fissures, melee: shot to the target
    const a = angleTo(p.x, p.y, tx, ty), d = Math.min(9, dist(p.x, p.y, tx, ty));
    flyNote({ x0: p.x + Math.cos(a) * 0.3, y0: p.y + Math.sin(a) * 0.3, z0: 30, x1: p.x + Math.cos(a) * d, y1: p.y + Math.sin(a) * d, z1: 14, dur: 0.12 + d / 18, arc: 18, glyph: g, tier, s, burst: 5 });
  }
}
