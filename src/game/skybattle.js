// THE SKY BATTLE (docs/SKY_BATTLE.md): the heroes' ironclad (world/skyship.js) over open sky, and the director that runs
// the fight on its deck. The hero steps out of the portal in the bridge's great door; Air Pirate boats lie alongside to
// port and their crews leap the rail in waves; a captain leads the third; two more waves; then a parley with the next
// captain and two sky-knights sworn to Velscour (data/skytalk.js, 2,000 talks), a truce, and the flagship out of the
// clouds: a cannon duel as she closes, grappling hooks from both ships, two captains over the rail, the last fight. The
// gate turns to the exit and a hoard chest rises on the hatch. Eight variants (data/skybattle.js) change the sky, and in
// six the weather fights too. Cut scenes are game/cinema.js; drawing is gfx/skyship.js.
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { camera, isoX, isoY, elevationAt } from '../core/view.js';
import { rand, pick, chance, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { makeMonster, monsterBase } from './monster.js';
import { aoe } from './combat.js';
import { makeFolk } from './folk.js';
import { townSprite } from './render.js';
import { TOWN_FRAME_W, TOWN_FRAME_H, townFrameOf } from './townsfolkvisuals.js';
import { Cine } from './cinema.js';
import { GroundItem, dropChest } from './loot.js';
import { addEffect, addLight, Ring, Telegraph, smoke, burst, sparkle, floatText, spawn, glowSprite } from '../gfx/vfx.js';
import { castle3dState } from '../gfx/castle3dart.js';
import { enemyImage } from '../core/enemyart.js';
import { depthLevel } from '../data/depth.js';
import { rollItem, rarityAt } from '../data/items.js';
import { TOWNSFOLK } from '../data/townsfolk.js';
import { AIR_CREW, AIR_CAPTAIN, crewFor, AIR_ARCHS } from '../data/airpirates.js';
import { SKY_VARIANT, SKY_VARIANTS, SKY_WAVES, DOCKS } from '../data/skybattle.js';
import { conversation, twistLine, CAPTAIN_CRIES, FAREWELLS, fillLine, CONVERSATION_COUNT, betrayal, ALLY_CRIES, CHARGE_LINES, HOOK_LINES2 } from '../data/skytalk.js';
import { RUNEBLADE_PALETTES, RUNEBLADE_SKINS, preloadRuneblade } from '../gfx/runeblade3d.js';
import { OX, OY, LV, FC_H, QD_H, GATE, LANDING, beam, sheer, inner, sAt, zAt } from '../world/skyship.js';

const HS = 4;
const ARRIVE = ['So this is the sky lane. Nice view. Terrible neighbours.', 'Through the gate and onto a warship. Velscour, you shouldn\'t have.',
  'Air Pirates, huh? Let them come.', 'Never look down. Never look down. ...I looked down.', 'Steady deck, strong wind, black sails coming. Perfect.',
  'Every pirate in the sky is coming for this ship. Good. Saves me the walk.', 'Hold the deck. Hold it until there is nobody left to hold it from.'];
const VICTORY = ['And STAY down.', 'That is how you hold a deck.', 'Tell Velscour his fleet needs practice.', 'The sky is ours. For today.', 'Next time, bring a bigger boat.'];
/** The knights' animations for their lines: a townsfolk pose and how the body moves (drawNpc's n.pose). */
export const KNIGHT_ACTS = {
  laugh: ['happy', (t) => ({ dy: Math.abs(Math.sin(t * 16)) * 3 })],
  cry: ['scared', (t) => ({ dx: Math.sin(t * 40) * 1.2, sy: 1 - Math.abs(Math.sin(t * 6)) * 0.04 })],
  rage: ['angry', (t) => ({ dy: Math.max(0, Math.sin(t * 9)) * 7, sx: 1 + Math.abs(Math.sin(t * 9)) * 0.06 })],
  flex: ['excited', (t) => ({ sx: 1 + Math.abs(Math.sin(t * 5)) * 0.12, sy: 1 + Math.abs(Math.sin(t * 5)) * 0.08 })],
  dance: ['cheer', (t) => ({ dx: Math.sin(t * 7) * 5, rot: Math.sin(t * 7) * 0.15, dy: Math.abs(Math.cos(t * 7)) * 4 })],
  spin: ['excited', (t) => ({ flip: Math.floor(t * 10) % 2 === 0, dy: Math.abs(Math.sin(t * 5)) * 6 })],
  salute: ['point', (t) => ({ rot: -0.08, dy: t < 0.4 ? Math.sin(t / 0.4 * Math.PI) * 4 : 0 })],
  swoon: ['love', (t) => ({ rot: Math.sin(t * 2.5) * 0.2, dx: Math.sin(t * 2.5) * 3 })],
  faint: ['dead', (t) => ({ rot: Math.min(1, t * 4) * -1.45 })],
  hop: ['excited', (t) => ({ dy: Math.abs(Math.sin(t * 11)) * 12 })],
  point: ['point', (t) => ({ dx: Math.sin(t * 3) * 1.5 })],
  shrug: ['idle', (t) => ({ sy: 1 + Math.abs(Math.sin(t * 8)) * 0.05, dy: Math.abs(Math.sin(t * 8)) * 2 })],
  bow: ['idle', (t) => ({ rot: Math.min(1, t * 3) * 0.45 * (t < 1.4 ? 1 : 0) })],
  thinking: ['idle', (t) => ({ rot: Math.sin(t * 1.5) * 0.1 })],
  attack: ['attack', (t) => ({ dx: Math.min(1, t * 5) * 6, rot: Math.min(1, t * 5) * 0.12 })],
};

/** Pick a variant: `id` or a weighted random one (never the one just played). */
export function pickVariant(id, last) {
  if (id && SKY_VARIANT[id]) return SKY_VARIANT[id];
  const pool = SKY_VARIANTS.filter((v) => v.id !== last);
  return pick(pool);
}

export function createSkyBattle(world, gen, biome, depth, opts, onSuccess) {
  const map = world.map, st = castle3dState(), A = st.anchors, v = pickVariant(opts.variant, opts.last);
  const lvl = depthLevel(depth), base = monsterBase(lvl);
  const S = world.sky = { v, boats: [], galleon: null, hooks: [], shots: [], bolts: [], ropes: [], blades: [], flash: 0, gateColor: '#ff5020', gateFlash: 0, windK: 1, fogR: 1 };
  if (v.night) { world.night = true; world.darkK = v.dark; } else if (v.dark) world.darkK = v.dark;
  world.raining = false;
  const p = () => world.player;
  const hero = () => G.char;
  const tileOf = (x, z) => [OX + x, OY + z];
  const lvAt = (x, y) => map.hgt[map.tileIdx(x, y)];
  const walk = (x, y) => map.walkable(x, y);
  const near = (x, y, r = 2) => { if (walk(x, y)) return [x, y]; const q = map.randomNear(x, y, r); return q && walk(q[0], q[1]) ? q : [OX + 0.5, OY + 0.5]; };
  const ctx = () => ({ hero: hero().name, class: classNameOf(), weather: v.weather.toLowerCase(), cap: run.cap?.name || '', captitle: run.cap?.title || '', k1: run.k1?.first || '', k2: run.k2?.first || '' });
  const classNameOf = () => { const c = G.char.classId || ''; return c.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ').replace('Arcane Sorcerer', 'Astronomer'); };
  const live = new Set();   // the pirates on the deck this fight brought

  // ------------------------------------------------------------------ boats
  const easeOut = (k) => 1 - (1 - k) ** 3;
  /** Where a boat lies to port with its ramp on the rail at ship z = dz: its origin tile and deck level. */
  function dockSpot(kind, dz) {
    const K = A.skiffs[kind], s = sAt(dz), reach = K.rampLen * Math.cos(0.1);
    return { x: OX - (beam(s) - 0.15) - reach - K.ramp[0], y: OY + dz - K.ramp[2], lv: ((sheer(s) + 0.12) - K.ramp[1] + K.rampLen * Math.sin(0.1)) * LV };
  }
  function launchBoat(kind, dz, crew, o = {}) {
    const dock = dockSpot(kind, dz), from = { x: dock.x - 16, y: dock.y + 18, lv: dock.lv + 40 };
    const K = A.skiffs[kind], spots = K.deck.slice().sort(() => Math.random() - 0.5);
    const b = { kind, dz, x: from.x, y: from.y, lv: from.lv, alpha: 0, ramp: 0, phase: Math.floor(rand(0, 4)), st: 'in', t: 0, dock, from, wait: o.wait ?? 0.9, hold: o.hold ?? 2.5, leap: o.leap !== false,
      crew: crew.map((c, i) => ({ ...c, x: spots[i % spots.length][0] + rand(-0.15, 0.15), z: spots[i % spots.length][2] + rand(-0.15, 0.15), h: AIR_CREW.find((a) => a.id === c.art)?.h ?? c.h ?? 56, flip: false, ph: rand(0, 6) })) };
    S.boats.push(b);
    return b;
  }
  /** A gasbag crossing high over the deck, stern to bow, dropping boarders on ropes as it passes. */
  function flyover(n, wave) {
    const b = { kind: 'gasbag', dz: 0, x: OX - 3, y: OY + 34, lv: 95, alpha: 0, ramp: 0, phase: 0, st: 'fly', t: 0, crew: [], leap: false, drops: n, wave };
    S.boats.push(b);
    return b;
  }
  function boatTick(b, dt) {
    b.t += dt;
    if (b.st === 'fly') {
      b.y -= dt * 5.5; b.lv = 95 + Math.sin(b.t * 0.8) * 2; b.alpha = clamp(Math.min(b.t / 1.2, (b.y - (OY - 30)) / 6), 0, 1);
      if (b.drops > 0 && b.y < OY + 12 && (b.dropT = (b.dropT ?? 0) - dt) <= 0) {
        b.dropT = 0.45; b.drops--;
        const to = near(b.x + 3 + rand(-2.5, 2.5), b.y + rand(-1, 1));
        spawnPirate(pick(AIR_CREW).id, chance(0.25) ? 'champion' : 'normal', null, to, b.wave, 'rope', () => [b.x + 0.4, b.y + 0.2, b.lv]);
      }
      if (b.y < OY - 32) b.dead = true;
      return;
    }
    const bob = Math.sin(G.time * 1.3 + b.phase) * 0.8;
    if (b.st === 'in') {
      const k = easeOut(clamp(b.t / 4.5, 0, 1));
      b.x = b.from.x + (b.dock.x - b.from.x) * k; b.y = b.from.y + (b.dock.y - b.from.y) * k; b.lv = b.from.lv + (b.dock.lv - b.from.lv) * k + bob;
      b.alpha = clamp(b.t / 0.8, 0, 1) * (v.fog ? clamp(k * 1.6, 0, 1) : 1);
      if (k >= 1) { b.st = 'dock'; b.t = 0; sfx('thud', 0.6); camera.shake(3); }
    } else if (b.st === 'dock') {
      b.lv = b.dock.lv + bob * 0.4; b.ramp = clamp(b.t / 0.5, 0, 1);
      if (b.leap && b.t > b.wait && b.crew.length && (b.nextLeap = (b.nextLeap ?? 0) - dt) <= 0) { b.nextLeap = 0.32; leapOff(b, b.crew.shift()); }
      if (!b.crew.length && b.t > b.wait + 0.5) { b.holdT = (b.holdT || 0) + dt; if (b.holdT > b.hold && !b.stay) { b.st = 'out'; b.t = 0; } }
    } else if (b.st === 'out') {
      const k = clamp(b.t / 4, 0, 1), e = k * k;
      b.ramp = 0; b.x = b.dock.x + (b.from.x - b.dock.x) * e; b.y = b.dock.y + (b.from.y - b.dock.y) * e; b.lv = b.dock.lv + (b.from.lv - b.dock.lv) * e;
      b.alpha = 1 - k;
      if (k >= 1) b.dead = true;
    }
  }
  /** A boarder (or captain) leaps from a boat's deck onto the ironclad's. */
  function leapOff(b, c) {
    const s = sAt(b.dz), [tx, ty] = near(...tileOf(-(inner(s) - 1.1) + rand(0, 2.6), b.dz + rand(-1.6, 1.6)));
    const from = [b.x + c.x, b.y + c.z, b.lv];
    return c.captain ? spawnCaptain(c.art, from, [tx, ty], c.rank, c.onLand) : spawnPirate(c.art, c.rank || 'normal', from, [tx, ty], c.wave);
  }
  /** Fly a monster from `from` [tile x, tile y, level] to `to` [tile x, tile y] in an arc; it can't act until it lands. */
  function leap(m, from, to, o = {}) {
    const d = Math.hypot(to[0] - from[0], to[1] - from[1]), dur = o.dur ?? 0.55 + d / 11, arc = o.arc ?? 60 + d * 6;
    const lvTo = o.toLv ?? lvAt(to[0], to[1]);
    let t = 0;
    m.targetable = false; m.awake = true; m.moving = true;
    m.entering = (dt) => {
      t += dt; m.animT += dt;
      const k = Math.min(1, t / dur);
      m.x = from[0] + (to[0] - from[0]) * k; m.y = from[1] + (to[1] - from[1]) * k;
      m.z = (from[2] * (1 - k) + lvTo * k) * HS + arc * Math.sin(Math.PI * k) - elevationAt(m.x, m.y);
      if (k >= 1) {
        if (o.perch) { m.x = to[0]; m.y = to[1]; m.z = lvTo * HS - elevationAt(m.x, m.y); m.moving = false; m.entering = () => {}; o.perch(m); return; }
        m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.cd = rand(0.2, 0.5); m.moving = false;
        smoke(m.x, m.y, 4, '#6a5a4a', 3, 9); sfx('thud', m.captain ? 1 : 0.4);
        if (m.captain) { addEffect(new Ring(m.x, m.y, 0.2, 2.6, 0.5, '#e8d0a0', 6)); camera.shake(9); aoe(world, m, m.x, m.y, 2.2, m.dmg * 0.6, 'phys', { knock: 1 }); }
        if (o.onLand) o.onLand(m);
      }
    };
  }
  /** Swing on a rope from `anchor()` [tile x, tile y, level] across to `to`, low over the deck in between, hitting the
   *  hero's side along the way (a captain's swing; the mid-boss's entrance). */
  function swingAcross(m, anchor, to, o = {}) {
    const from = [m.x, m.y, (m.z + elevationAt(m.x, m.y)) / HS], dur = o.dur ?? 1.5, rope = { a: anchor, m };
    let t = 0; const hit = new Set();
    m.targetable = false; m.awake = true; m.moving = true; S.ropes.push(rope); sfx('swing', 0.8);
    m.entering = (dt) => {
      t += dt; m.animT += dt;
      const k = Math.min(1, t / dur), e = k * k * (3 - 2 * k);
      m.x = from[0] + (to[0] - from[0]) * e; m.y = from[1] + (to[1] - from[1]) * e;
      const ground = lvAt(m.x, m.y), lvl = from[2] * (1 - e) + lvAt(to[0], to[1]) * e;
      m.z = Math.max(ground + 6, lvl - Math.sin(Math.PI * e) * 14 + Math.sin(Math.PI * e) * 30 * (1 - Math.abs(2 * e - 1))) * HS - elevationAt(m.x, m.y);
      if (k > 0.2 && k < 0.85) for (const c of world.hostiles('enemy', m.x, m.y, 1.2)) if (!hit.has(c)) { hit.add(c); aoe(world, m, c.x, c.y, 0.6, m.dmg * 0.9, 'phys', { knock: 1.2 }); }
      if (k >= 1) {
        S.ropes.splice(S.ropes.indexOf(rope), 1);
        m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.moving = false; m.cd = rand(0.2, 0.4);
        smoke(m.x, m.y, 4, '#6a5a4a', 4, 10); sfx('thud', 0.8); camera.shake(m.captain ? 7 : 3);
        if (o.onLand) o.onLand(m);
      }
    };
  }
  /** Slide down a rope from high overhead to `to` (boarders dropped from a passing gasbag, or called by a captain). */
  function rappelIn(m, to, anchor) {
    const top = 70 + rand(0, 30); let t = 0;
    const rope = { a: anchor || (() => [to[0] - 0.6, to[1] + 0.4, lvAt(to[0], to[1]) + top + 30]), m };
    m.targetable = false; m.awake = true; m.x = to[0]; m.y = to[1]; S.ropes.push(rope);
    const dur = rand(1.0, 1.4);
    m.entering = (dt) => {
      t += dt; m.animT += dt;
      const k = Math.min(1, t / dur);
      m.z = top * HS * (1 - k * k) + Math.sin(t * 9) * 2 * (1 - k);
      if (k >= 1) { S.ropes.splice(S.ropes.indexOf(rope), 1); m.entering = null; m.targetable = true; m.z = 0; m.cd = rand(0.2, 0.5); smoke(m.x, m.y, 2, '#6a5a4a', 2, 7); sfx('thud', 0.4); }
    };
  }
  function spawnPirate(art, rank, from, to, wave = run.wave, how = 'leap', anchor = null) {
    const a = AIR_CREW.find((q) => q.id === art) || pick(AIR_CREW);
    const m = makeMonster(world, a.arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, to[0], to[1], 0, { art: a.id, swap: null });
    if (a.shot && m.proj) m.proj = { ...m.proj, fx: a.shot };
    world.add(m); m.sky = true; m.wave = wave; live.add(m);
    if (how === 'rope') rappelIn(m, to, anchor); else leap(m, from, to);
    return m;
  }
  function spawnCaptain(id, from, to, rank = 'boss', onLand, o = {}) {
    const a = AIR_CAPTAIN[id];
    const m = makeMonster(world, a.arch, biome, lvl + 2, rank, to[0], to[1], 0, { art: a.id, swap: null });
    if (a.shot && m.proj) m.proj = { ...m.proj, fx: a.shot };
    m.name = a.name; m.title = a.title; m.captain = a; m.sky = true; m.moveT = rand(5, 8);
    m.scale = 1;   // the boss rank's 1.9 would make a captain three heroes tall: they stand about one and a half (their art's h)
    world.add(m); live.add(m);
    if (o.swing) { m.x = from[0]; m.y = from[1]; m.z = from[2] * HS - elevationAt(m.x, m.y); swingAcross(m, o.swing, to, { dur: 1.7, onLand }); }
    else leap(m, from, to, { arc: 140, onLand });
    return m;
  }
  /** A boat's worth of boarders for a wave: random archetypes (bruisers rarer), elites first. */
  function crewList(n, champions, uniques, wave) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const arch = chance(0.18) ? pick(['demon', 'knight']) : pick(AIR_ARCHS.filter((x) => x !== 'demon'));
      const a = pick(crewFor(arch));
      out.push({ art: a.id, rank: i < uniques ? 'unique' : i < uniques + champions ? 'champion' : 'normal', wave });
    }
    return out;
  }
  const boatKind = () => { const w = Object.entries(v.boats).filter(([, n]) => n > 0); let r = rand(0, w.reduce((s, [, n]) => s + n, 0)); for (const [k, n] of w) if ((r -= n) <= 0) return k; return w[0][0]; };

  // ------------------------------------------------------------------ the knights (palette-swapped townsfolk)
  function makeKnights() {
    const ks = TOWNSFOLK.filter((q) => q.knight), a = pick(ks), b = pick(ks.filter((q) => q !== a));
    // bright, never clashing: two hues a third to a half of the wheel apart, both lifted and saturated
    const h1 = rand(0, 360), h2 = (h1 + rand(120, 180)) % 360;
    const mk = (q, hue, x, z) => {
      const [tx, ty] = tileOf(x, z);
      const n = makeFolk(world, q, tx, ty, { calm: true, still: true, palette: { hue: Math.round(hue), sat: +rand(1.3, 1.6).toFixed(2), light: +rand(0.05, 0.12).toFixed(2) } });
      n.first = q.name.split(' ')[0];
      n.name = `Sky-Knight ${n.first}`;
      n.lift = 0;   // px over the ground under them (standing on a boat or the flagship)
      n.pose = () => { const a = n.actPose ? n.actPose() : null; return a ? { ...a, dy: (a.dy || 0) + n.lift } : { dy: n.lift }; };
      world.npcs.push(n);
      return n;
    };
    const ks2 = [mk(a, h1, -4.2, -1.2), mk(b, h2, -4.4, 1.0)];
    ks2.forEach((k, i) => { k.blade = knightBlade(k, i); });
    return ks2;
  }
  /** A knight acts out a line: its pose (townsfolk frame) and a motion for `dur` seconds. */
  function act(n, name, dur = 3) {
    const [emo, fn] = KNIGHT_ACTS[name] || KNIGHT_ACTS.shrug, t0 = G.time;
    n.feel(emo, dur, false);
    n.actPose = () => fn(G.time - t0);
    n.after(dur, () => { if (G.time - t0 >= dur - 0.05) n.actPose = null; });
  }
  // Where the knights are: k.follow() gives [tile x, tile y, level] (a level off the ship's own tiles: a boat, the
  // flagship; undefined on the deck), k.chase walks there instead of standing on it, knightJump carries them between
  // places in an arc. They go wherever their captain goes.
  function place(k, [x, y, lv]) { k.x = x; k.y = y; k.lift = lv === undefined ? 0 : Math.max(0, lv * HS - elevationAt(x, y)); }
  function knightJump(k, to, dur = 0.9, arc = 80, then = null) {
    const fx = k.x, fy = k.y, fl = (k.lift + elevationAt(k.x, k.y)) / HS; let t = 0;
    k.follow = null; k.chase = false; k.hidden = false;
    k.jumping = (dt) => {
      t += dt; const q = Math.min(1, t / dur), [tx, ty, tl] = to(), tlv = tl ?? lvAt(tx, ty);
      k.x = fx + (tx - fx) * q; k.y = fy + (ty - fy) * q;
      k.lift = Math.max(0, (fl * (1 - q) + tlv * q) * HS + arc * Math.sin(Math.PI * q) - elevationAt(k.x, k.y));
      if (q >= 1) { k.jumping = null; k.follow = to; if (then) then(); }
    };
  }
  function knightTick(dt) {
    for (const k of [run.k1, run.k2]) {
      if (!k) continue;
      if (k.onFlagship && !S.galleon) { k.hidden = true; k.follow = null; k.jumping = null; continue; }   // gone with her
      if (k.jumping) k.jumping(dt);
      else if (k.follow && k.chase) {   // trotting after their captain on the deck
        const [tx, ty] = k.follow(), d = Math.hypot(tx - k.x, ty - k.y);
        if (d > 0.3) { const st = Math.min(d, dt * 3.6), nx = k.x + (tx - k.x) / d * st, ny = k.y + (ty - k.y) / d * st; if (walk(nx, ny)) { k.x = nx; k.y = ny; k.walking = true; } k.face(tx, ty); }
        else if (p()) k.face(p().x, p().y);
        k.lift = 0;
      } else if (k.follow) place(k, k.follow());
      if (k.onFlagship) k.alpha = S.galleon ? S.galleon.alpha : 0;
    }
  }
  /** Beside the hero (left or right of them): where a knight goes between fights. */
  const heroSide = (side) => () => { const pl = p(); return pl ? near(pl.x - 0.9, pl.y + side * 1.2, 1.2) : [OX, OY]; };
  // Each knight's Runeblade (the Death Knight's 3D blade, gfx/runeblade3d.js), recoloured to their armour: a palette
  // turned to the hue of their recoloured sheet, its glow their armour's colour. Drawn only for their strikes.
  function knightBlade(k, i) {
    const hue = k.palette.hue, light = 40 + k.palette.light * 200;
    const id = `sky_knight_${i}_${hue}`;
    if (!RUNEBLADE_PALETTES.find((q) => q.id === id)) RUNEBLADE_PALETTES.push({ id, name: k.name, hue: hue - 200, sat: Math.min(1.6, k.palette.sat), lum: 1.08, glow: hslHex(hue, 0.85, light / 100) });
    const skin = RUNEBLADE_SKINS[(i * 2 + run.talk) % RUNEBLADE_SKINS.length].id;
    preloadRuneblade(skin);
    return { palette: id, skin, glow: hslHex(hue, 0.85, light / 100) };
  }
  const hslHex = (h, s, l) => { const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l), c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
  /** A knight's strike: a leap at the target and a great sweep of the runeblade (big: the charge into a captain). */
  function strike(k, tgt, big = false) {
    if (!tgt || tgt.dead) return;
    const side = k.x < tgt.x ? -1 : 1, to = near(tgt.x + side * 0.9, tgt.y, 1);
    k.chase = false; k.atkCd = rand(1.3, 1.9) + (big ? 1 : 0);
    act(k, 'attack', 1.0);
    knightJump(k, () => to, big ? 0.7 : 0.4, big ? 110 : 40, () => {
      const a0 = side > 0 ? Math.PI * 1.15 : -Math.PI * 0.15, a1 = side > 0 ? Math.PI * 0.2 : Math.PI * 0.8;
      const blade = { k, x: k.x, y: k.y, t: 0, dur: big ? 0.55 : 0.36, a0, a1, len: big ? 150 : 86, ...k.blade };
      S.blades.push(blade); k.slash = blade;
      sfx('swing', big ? 1 : 0.6);
      run.later(blade.dur * 0.45, () => {
        const dmg = (big ? 0.55 : 0.2) * base.hp * (tgt.captain ? 1.2 : 1);
        aoe(world, null, to[0] - side * 0.5, to[1], big ? 2.0 : 1.4, dmg, 'phys', { team: 'player', knock: big ? 1.4 : 0.6 });
        burst(to[0] - side * 0.6, to[1], 30, 'phys', big ? 18 : 8, big ? 5 : 3);
        if (big) { camera.shake(9); addEffect(new Ring(to[0] - side * 0.5, to[1], 0.2, 2.4, 0.4, blade.glow, 6)); }
      });
      run.later(blade.dur, () => { S.blades.splice(S.blades.indexOf(blade), 1); k.slash = null; if (k.ally) { k.chase = true; k.follow = heroSide(k === run.k1 ? -1 : 1); } });
    });
  }
  /** The knights in a fight: the nearest boarder or captain near the hero, run at it, strike; otherwise stay by the hero. */
  function knightsFight(dt) {
    const pl = p();
    for (const k of [run.k1, run.k2]) {
      if (!k || !k.ally || k.jumping || k.slash) continue;
      k.atkCd = (k.atkCd ?? 1) - dt;
      let tgt = null, td = 8;
      for (const m of world.creatures) if (m.team === 'enemy' && !m.dead && !m.entering && m.targetable !== false && pl && Math.hypot(m.x - pl.x, m.y - pl.y) < 10) { const d = Math.hypot(m.x - k.x, m.y - k.y); if (d < td) { td = d; tgt = m; } }
      if (!tgt) { k.chase = true; k.follow = heroSide(k === run.k1 ? -1 : 1); continue; }
      if (td < 2.4 && k.atkCd <= 0) { strike(k, tgt); continue; }
      k.chase = true; k.follow = () => near(tgt.x + (k.x < tgt.x ? -1 : 1), tgt.y, 1);
      if ((k.cryT = (k.cryT ?? rand(4, 8)) - dt) <= 0) { k.cryT = rand(6, 11); k.say(fillLine(pick(ALLY_CRIES), ctx()), 2.2); }
    }
  }
  /** A spot along the flagship's rail (her crew's places): [tile x, tile y, level]. */
  let lastRail = [OX - 15, OY, 6];
  const flagRail = (i) => { const g = S.galleon; if (!g) return lastRail; const [x, y, z] = A.galleon.rail[i % A.galleon.rail.length]; return (lastRail = [g.x + x, g.y + z, g.lv + y * LV]); };
  const KNIGHT_TAUNTS = ['Get them, Captain!', 'For the black sail!', 'Left! No, YOUR left!', 'Ooh. That looked like it hurt.', 'Still not joining you!', 'Mind the furnaces, Captain!',
    'Do the spinny thing!', 'I am cheering VERY professionally.', 'Velscour is watching! Probably!', 'This is better than the shanties!'];
  const KNIGHT_GRIEF = ['CAPTAIN!', 'No no no no NO!', 'You will pay for that! Eventually!', 'Captain... I will sing the shanty of you.'];

  // ------------------------------------------------------------------ portraits for the dialogue panel
  let heroImg = null;
  const heroPortrait = (cx, x, y, w, h) => {
    if (!heroImg) { heroImg = new Image(); heroImg.src = `assets/sprites/select/${G.char.classId}.webp`; }
    if (heroImg.complete && heroImg.naturalWidth) { const s = w / heroImg.naturalWidth * 1.6; cx.drawImage(heroImg, x + w / 2 - heroImg.naturalWidth * s / 2, y - 4, heroImg.naturalWidth * s, heroImg.naturalHeight * s); }
  };
  const monsterPortrait = (art) => (cx, x, y, w, h, t) => {
    const img = enemyImage(art, null); if (!img) return;
    const s = w / img.width * 1.5, sh = Math.sin(t * 30) * (t < 0.3 ? 2 : 0);
    cx.drawImage(img, x + w / 2 - img.width * s / 2 + sh, y - h * 0.08, img.width * s, img.height * s);
  };
  const knightPortrait = (n) => (cx, x, y, w, h) => {
    const sheet = townSprite(n.townsfolkSpriteId, n.palette); if (!sheet) return;
    const f = Math.max(0, townFrameOf(n.townsfolkSpriteId, n.emotion || 'idle'));
    cx.drawImage(sheet, f * TOWN_FRAME_W + 64, 0, 128, 110, x - w * 0.1, y, w * 1.2, w * 1.2 * 110 / 128);
  };
  const speaker = (who) => who === 'hero' ? { name: G.char.name, color: '#9fd0ff', portrait: heroPortrait, voice: { pitch: 1, wave: 'square' } }
    : who === 'cap' ? { name: run.cap.name, color: '#ff9a6a', portrait: monsterPortrait(run.cap.id), voice: { pitch: run.cap.voice || 0.7, wave: 'sawtooth' } }
      : { name: run[who].name, color: who === 'k1' ? '#ffd27a' : '#a8f0c0', portrait: knightPortrait(run[who]), voice: { pitch: who === 'k1' ? 1.15 : 0.9, wave: 'triangle' } };
  /** A spoken line as a cut scene step: who says it, the camera on them, the knight's act. */
  function sayStep(line, o = {}) {
    const sp = speaker(line.who), npc = line.who === 'k1' || line.who === 'k2' ? run[line.who] : null;
    return { say: { ...sp, text: line.text,
      onStart: () => {
        if (npc) { act(npc, line.act, 1.4 + line.text.length * 0.045); if (G.char) npc.face(p().x, p().y); }
        if (line.who === 'cap' && run.capM) { run.capM.animT += 0.5; if (line.act === 'angry' || line.act === 'laugh') camera.shakeAmt = Math.max(camera.shakeAmt, 2); }
        if (o.cam) o.cam();
      } } };
  }
  const camTo = (x, y, zoom = 1, dur = 1.2, wait = false, lv) => ({ cam: { x, y, lv: lv ?? lvAt(x, y), zoom, dur, wait } });

  // ------------------------------------------------------------------ the run
  const run = {
    id: 'skyship', type: 'skybattle', completed: false, failed: false, active: true, stage: 0, markers: [], route: [], escort: null, routeIndex: 0,
    variant: v, phase: 'intro', wave: -1, talk: Math.floor(rand(0, CONVERSATION_COUNT)), t: 0, cap: null, capM: null, k1: null, k2: null, finals: [],
    get title() { return run.completed ? 'The Sky Is Yours' : `${v.name}`; },
    get description() {
      const ph = run.phase;
      return run.completed ? 'The gate is the way on. The hoard chest waits on the hatch.'
        : ph === 'waves' ? `Hold the deck: boarding wave ${run.wave + 1} of ${SKY_WAVES.length}.`
          : ph === 'mid' ? `Defeat ${AIR_CAPTAIN[v.mid_boss].name}.`
            : ph === 'flagship' ? 'The flagship closes in. Survive her broadsides.'
              : ph === 'final' ? 'Defeat the two captains on your deck.' : 'Hold the deck.';
    },
    get objective() { return run.completed ? { x: OX + 0.5, y: OY + GATE.z + 0.6, reach: 1.4 } : { x: OX + 0.5, y: OY + 0.5, reach: 7 }; },
    update(dt) { tick(dt); },
  };
  world.skyRun = run;

  // ---- the arrival: a slow look along the ship, then the gate flares and the hero steps out
  function intro() {
    const pl = p(), gate = tileOf(0.5, GATE.z + 0.1), land = tileOf(LANDING[0] + 0.5, LANDING[1]);
    pl.x = gate[0]; pl.y = gate[1]; pl.alpha = 0;
    const lvM = lvAt(OX, OY);
    Cine.play([
      { do: () => { const [x, y] = [OX + 0.5, OY + 16]; camera.x = isoX(x, y); camera.y = isoY(x, y) - 80; camera.zoom = Cine.zoom0 * 0.55; } },
      { card: [v.name.toUpperCase(), `${v.weather} · Depth ${depth}`], dur: 3.2 },
      { cam: { x: OX + 0.5, y: OY + 2, lv: lvM, zoom: 0.62, dur: 3.2, ease: 'io', wait: true } },
      { cam: { x: gate[0], y: gate[1] + 0.6, lv: lvAt(...land) + 14, zoom: 1.7, dur: 1.8, ease: 'io', wait: true } },
      { do: () => { S.gateFlash = 1.4; sfx('portal'); sparkle(gate[0], gate[1] + 0.4, 60, '#ffb070', 30, 0.8); } },
      { wait: 0.5 },
      { do: () => { run.walkTo(pl, land, 0.9, true); } },
      { wait: 1.0 },
      { say: { name: G.char.name, color: '#9fd0ff', portrait: heroPortrait, text: pick(ARRIVE), voice: { pitch: 1 } } },
      { card: ['HOLD THE DECK', v.hazardText || v.blurb], dur: 2.6 },
      camTo(OX + 0.5, OY - 2, 0.85, 1.4, true),
    ], () => { run.phase = 'waves'; run.wave = -1; run.t = 2; });
  }
  /** Walk `who` (the hero or a knight) to tile `to` over `dur` seconds (scripted, straight line). */
  run.walkTo = (who, to, dur, fadeIn = false, then = null) => {
    const fx = who.x, fy = who.y; let t = 0;
    const tick = (dt) => {
      t += dt; const k = clamp(t / dur, 0, 1);
      who.x = fx + (to[0] - fx) * k; who.y = fy + (to[1] - fy) * k;
      if (fadeIn) who.alpha = k < 1 ? k : undefined;
      if (who.isPlayer) { who.moving = k < 1; who.moveTarget = null; who.path = null; who.attackTarget = null; }
      if (k >= 1 && then) then();
      return k < 1;
    };
    run.scripted.push(tick);
  };
  run.scripted = [];
  /** Walk through `pts` at `speed` tiles a second (scripted: down the grand stairs to the parley). */
  run.walkPath = (who, pts, speed) => {
    const legs = pts.slice();
    const next = () => { const to = legs.shift(); if (!to) return; run.walkTo(who, to, Math.max(0.2, Math.hypot(to[0] - who.x, to[1] - who.y) / speed), false, next); };
    next();
  };

  // ---- waves
  function startWave(n) {
    run.wave = n; run.phase = 'waves';
    const W = SKY_WAVES[n];
    UI.centerMsg(`BOARDING WAVE ${n + 1}`, n === SKY_WAVES.length - 1 ? 'The last of them' : `${W.boats} boat${W.boats > 1 ? 's' : ''} alongside`, 2.2);
    sfx('boss', 0.5);
    const docks = DOCKS.slice().sort(() => Math.random() - 0.5);
    let champ = W.champion || 0, uniq = W.unique || 0;
    for (let b = 0; b < W.boats; b++) {
      const k = Math.min(champ, 1 + (b === 0 ? 1 : 0)), u = Math.min(uniq, 1);
      champ -= k; uniq -= u;
      run.later(b * 2.2, () => launchBoat(boatKind(), docks[b % docks.length], crewList(W.n[b], k, u, n)));
    }
    if (n >= 2) run.later(7, () => { flyover(2 + Math.floor(n / 2), n); UI.centerMsg('', 'Boarders on ropes, overhead!', 1.6); });
  }
  run.timers = [];
  run.later = (s, fn) => run.timers.push([s, fn]);
  const waveLeft = () => S.boats.some((b) => (b.crew.length && b.leap) || (b.st === 'fly' && b.drops > 0)) || [...live].some((m) => !m.dead && m.wave === run.wave && !m.captain) || run.timers.length > 0;

  // ---- the mid-boss: a captain and an escort come over from a gasbag
  function midBoss() {
    run.phase = 'mid';
    const id = v.mid_boss, a = AIR_CAPTAIN[id], dz = 3;
    const b = launchBoat('gasbag', dz, [{ art: id, captain: true }, ...crewList(3, 1, 0, 99)], { wait: 1e9, hold: 3 });
    b.crew[0].h = a.h; b.crew[0].x = 0; b.crew[0].z = 0;
    run.midBoat = b;
    Cine.play([
      { until: () => b.st === 'dock', max: 8 },
      camTo(b.x, b.y, 1.5, 1.2, true, b.lv),
      { card: [a.name.toUpperCase(), a.title], dur: 2.6 },
      { say: { name: a.name, color: '#ff9a6a', portrait: monsterPortrait(id), text: fillLine(pick(CAPTAIN_CRIES), ctx()), voice: { pitch: a.voice, wave: 'sawtooth' } } },
      { do: () => {
        // he takes a rope from the balloon and swings across the deck
        b.crew.shift();
        const to = near(...tileOf(-1.5, b.dz + 0.5));
        run.midM = spawnCaptain(id, [b.x, b.y, b.lv + 1.5], to, 'boss', null, { swing: () => [b.x - 0.3, b.y - 0.4, b.lv + 6.2 * LV] });
        world.boss = run.midM;
      } },
      { until: () => run.midM && !run.midM.entering, max: 4 },
      camTo(OX + 0.5, OY + 0.5, 0.9, 0.9, true),
    ], () => { b.wait = 0.3; });
  }

  // ---- the parley, the truce and the twist
  function parley() {
    run.phase = 'parley';
    const id = v.finals[0], a = AIR_CAPTAIN[id];
    run.cap = a;
    [run.k1, run.k2] = makeKnights();
    // they come over from a gasbag under a white flag, the knights at their captain's side on its deck: the captain
    // stays still (no fighting in a parley)
    const b = launchBoat('gasbag', 3, [], { wait: 0.6, hold: 1e9, leap: false }); b.stay = true; run.parleyBoat = b;
    const onBoat = (dx, dz) => () => [b.x + dx, b.y + dz, b.lv];
    run.k1.follow = onBoat(0.7, -1.2); run.k2.follow = onBoat(0.7, 1.4);
    const pl = p(), heroAt = tileOf(-1.2, 0.2), capAt = tileOf(-4.0, 0.0);
    const lines = conversation(run.talk, ctx());
    const steps = [
      { do: () => { run.walkPath(pl, [[OX + 0.5, OY - 12.3], [OX + 0.5, OY - 7.6], heroAt], 4); } },
      { card: ['PARLEY', 'A white flag flies from a gasbag'], dur: 2.2 },
      { until: () => b.st === 'dock', max: 8 },
      camTo(b.x, b.y, 1.3, 1.0, true, b.lv),
      { do: () => {
        // the captain over the rail, frozen in peace; the knights hop down behind
        const m = makeMonster(world, a.arch, biome, lvl + 2, 'boss', capAt[0], capAt[1], 0, { art: a.id, swap: null });
        m.name = a.name; m.title = a.title; m.captain = a; m.sky = true; m.parley = true; m.scale = 1; world.add(m); run.capM = m;
        m.entering = () => {}; m.targetable = false; m.awake = true; m.flip = true;
        m.x = b.x; m.y = b.y; m.z = b.lv * HS - elevationAt(b.x, b.y);
        const fx = b.x, fy = b.y, flv = b.lv; let t = 0;
        m.entering = (dt) => { t += dt; const k = Math.min(1, t / 1.0); m.x = fx + (capAt[0] - fx) * k; m.y = fy + (capAt[1] - fy) * k; m.z = (flv * (1 - k) + lvAt(capAt[0], capAt[1]) * k) * HS + 120 * Math.sin(Math.PI * k) - elevationAt(m.x, m.y); if (k >= 1) { m.entering = () => {}; m.z = 0; camera.shake(6); sfx('thud'); } };
        for (const [k, at, dly] of [[run.k1, tileOf(-4.2, -1.4), 0.4], [run.k2, tileOf(-4.4, 1.3), 0.7]])
          run.later(dly, () => knightJump(k, () => at, 0.8, 70, () => act(k, 'salute', 1.2)));
      } },
      { wait: 1.6 },
      camTo(OX - 2.5, OY + 0.1, 1.25, 1.2, true),
    ];
    const at = (who) => who === 'hero' ? heroAt : who === 'cap' ? capAt : who === 'k1' ? tileOf(-4.2, -1.4) : tileOf(-4.4, 1.3);
    for (const ln of lines) {
      const [x, y] = at(ln.who);
      steps.push(camTo(x, y, ln.who === 'hero' ? 1.3 : ln.who === 'cap' ? 1.15 : 1.45, 0.7, false));
      steps.push(sayStep(ln));
    }
    // a moment of calm... then the flagship
    steps.push(camTo(OX - 3, OY + 0.5, 0.75, 2.2, false));
    steps.push({ wait: 2.2 });
    steps.push({ do: () => { camera.shakeAmt = 10; sfx('boss'); S.flash = 0.4; spawnGalleon(); } });
    steps.push({ card: ['THE BLACK MOURNING', 'The flagship of Velscour\'s sky fleet'], dur: 3 });
    steps.push(camTo(OX - 22, OY + 4, 0.55, 2.4, true, 30));
    steps.push(sayStep(twistLine(run.talk, ctx())));
    steps.push({ do: () => {
      // the captain leaps back to the gasbag, which runs for the flagship
      const m = run.capM, fx = m.x, fy = m.y, f0 = lvAt(fx, fy); let t = 0;
      m.entering = (dt) => { t += dt; const k = Math.min(1, t / 0.9); m.x = fx + (b.x - fx) * k; m.y = fy + (b.y - fy) * k; m.z = (f0 * (1 - k) + b.lv * k) * HS + 110 * Math.sin(Math.PI * k) - elevationAt(m.x, m.y); if (k >= 1) { m.dead = true; m.hp = 0; m.noLoot = true; m.removeT = 1; live.delete(m); } };
      b.stay = false; b.hold = 1.6;
      // ...leaving his knights on the enemy deck under his own fleet's guns
      for (const k of [run.k1, run.k2]) act(k, 'cry', 2);
      const near1 = [run.k1.x + 0.8, run.k1.y + 0.6, lvAt(run.k1.x, run.k1.y)];
      cannon(galleonPort(), near1, () => { burst(near1[0], near1[1], 8, 'fire', 20, 4); smoke(near1[0], near1[1], 8, '#3a3230', 6, 14); camera.shake(9); sfx('explode', 0.7); for (const k of [run.k1, run.k2]) act(k, 'faint', 1.2); }, 1.3);
    } });
    steps.push({ wait: 2.2 });
    for (const ln of betrayal(run.talk, ctx())) {
      const [x, y] = at(ln.who);
      steps.push(camTo(x, y, 1.35, 0.6, false));
      steps.push(sayStep(ln));
    }
    steps.push({ do: () => { for (const k of [run.k1, run.k2]) { k.ally = true; k.follow = heroSide(k === run.k1 ? -1 : 1); k.chase = true; act(k, 'flex', 1.6); } } });
    steps.push(camTo(OX + 0.5, OY, 0.85, 1.2, true));
    Cine.play(steps, () => { run.phase = 'flagship'; run.t = 0; run.volleyT = 2.5; run.returnT = 2; run.duelT = 0; });
  }

  // ---- the flagship: she closes from far off to port, trading broadsides
  function spawnGalleon() {
    const far = { x: OX - 52, y: OY + 22, lv: 20 }, close = { x: OX - 15.2, y: OY + 0.6, lv: 0.6 * LV };
    S.galleon = { galleon: true, x: far.x, y: far.y, lv: far.lv, alpha: 0, far, close, k: 0, burn: [], crew: [] };
    // her crew along the starboard rail (painted extras; the captains among them)
    const G0 = A.galleon;
    G0.rail.forEach(([x, y, z], i) => { if (i !== 1 && i !== 3) S.galleon.crew.push({ art: pick(AIR_CREW).id, x, y, z, h: 56, flip: false, ph: rand(0, 6) }); });
    // the parley's captain (back aboard) and the second captain stand among them, the two knights beside the first
    const [ida, idb] = v.finals;
    for (const [id, i] of [[ida, 2], [idb, 4]]) { const [x, y, z] = G0.rail[i]; S.galleon.crew.push({ art: id, cap: id, x, y, z, h: AIR_CAPTAIN[id].h * 0.95, flip: false, ph: rand(0, 6) }); }
  }
  function galleonTick(dt) {
    const g = S.galleon; if (!g) return;
    g.alpha = Math.min(1, g.alpha + dt * 0.5);
    if (g.leaving) { g.t2 = (g.t2 || 0) + dt; const k = clamp(g.t2 / 7, 0, 1); g.x = g.close.x - k * k * 40; g.y = g.close.y + k * 30; g.lv = g.close.lv - k * 60; g.alpha = 1 - k; if (k >= 1) S.galleon = null; return; }
    const k = easeOut(clamp(g.k, 0, 1)), bob = Math.sin(G.time * 0.9) * 1.2;
    g.x = g.far.x + (g.close.x - g.far.x) * k; g.y = g.far.y + (g.close.y - g.far.y) * k; g.lv = g.far.lv + (g.close.lv - g.far.lv) * k + bob;
  }
  /** Gun port (world tile + level) of a ship: the galleon's starboard battery or the ironclad's port one. */
  const galleonPort = () => { const g = S.galleon, [x, y, z] = pick(A.galleon.ports); return [g.x + x, g.y + z, g.lv + y * LV]; };
  const shipPort = () => { const ps = A.ship.ports.filter((q) => q[3] < 0), [x, y, z] = pick(ps); return [OX + x, OY + z, y * LV]; };
  /** One cannon shot: an arc from a port to a target, a telegraph where it lands, an explosion. */
  function cannon(from, to, onHit, dur = 1.25) {
    S.shots.push({ from, to, t: 0, dur, arc: 70 + Math.hypot(to[0] - from[0], to[1] - from[1]) * 4, onHit });
    spawn({ type: 'glow', x: from[0], y: from[1], z: from[2] * HS, life: 0.25, size: 26, size1: 4, color: '#ffd080', add: true });
    smoke(from[0], from[1], from[2] * HS, '#9a9088', 3, 10);
    sfx('explode', 0.35);
  }
  function volleyAtDeck(n = 4) {
    const pl = p();
    for (let i = 0; i < n; i++) {
      const tgt = i === 0 && pl ? near(pl.x + rand(-1.5, 1.5), pl.y + rand(-1.5, 1.5)) : near(OX + rand(-5, 5), OY + rand(-9, 15));
      run.later(i * 0.35, () => {
        const to = [tgt[0], tgt[1], lvAt(tgt[0], tgt[1])];
        addEffect(new Telegraph({ kind: 'circle', x: to[0], y: to[1], r: 1.5, dur: 1.4 }), 'ground');
        cannon(S.galleon ? galleonPort() : [OX - 22, OY + rand(-6, 6), 30], to, () => blast(to[0], to[1], 1.5, base.dmg * 2.2, true), 1.4);
      });
    }
  }
  /** An explosion on the deck: hurts both sides (the cannons don't pick), scorches and shakes. */
  function blast(x, y, r, dmg, both) {
    aoe(world, null, x, y, r, dmg, 'fire', { team: 'enemy', knock: 0.8 });
    if (both) aoe(world, null, x, y, r, dmg * 0.7, 'fire', { team: 'player', knock: 0.8 });
    burst(x, y, 10, 'fire', 18, 4); smoke(x, y, 8, '#3a3230', 6, 14);
    addEffect(new Ring(x, y, 0.2, r * 1.6, 0.4, '#ffb060', 5));
    camera.shake(6); sfx('explode', 0.6);
  }

  // ---- the hooks, the knights' farewell, the two captains
  function hooks() {
    run.phase = 'hooks';
    const g = S.galleon, k1 = run.k1, k2 = run.k2;
    const railOf = (dz) => { const s = sAt(dz); return [OX - beam(s) + 0.1, OY + dz, (sheer(s) + 0.1) * LV]; };
    const gRail = (i) => { const [x, y, z] = A.galleon.railTop[i % A.galleon.railTop.length]; return [g.x + x, g.y + z, g.lv + y * LV]; };
    const throwHook = (from, to) => { const h = { from, to, t: 0, taut: 0 }; S.hooks.push(h); run.scripted.push((dt) => { h.t += dt * 1.6; if (h.t >= 1 && !h.hit) { h.hit = true; sfx('thud', 0.5); sparkle(to[0], to[1], to[2] * HS, '#ffe0a0', 6, 0.3); } return h.t < 1; }); };
    const steps = [
      camTo(OX - 7, OY + 1, 0.8, 1.4, true),
      { card: ['GRAPPLING HOOKS', 'The ships are lashed together'], dur: 2.2 },
    ];
    // the knights run to the rail and throw first: nobody fires on their truce and sails away
    for (const [k, dz, i] of [[k1, -2.5, 0], [k2, 4.5, 1]]) {
      const ln = HOOK_LINES2[Math.floor(rand(0, HOOK_LINES2.length))];
      steps.push({ do: () => { k.chase = false; k.follow = null; run.walkTo(k, near(...tileOf(-(inner(sAt(dz)) - 1.0), dz)), 0.7); } });
      steps.push({ wait: 0.75 });
      steps.push(camTo(OX - inner(sAt(dz)) + 1, OY + dz, 1.25, 0.6, false));
      steps.push(sayStep({ who: i ? 'k2' : 'k1', text: fillLine(ln[0], ctx()), act: ln[1] }));
      steps.push({ do: () => throwHook([OX - inner(sAt(dz)) + 0.6, OY + dz, (sheer(sAt(dz)) + 1.0) * LV], gRail(i)) });
    }
    // the flagship's crew answer
    steps.push({ do: () => { for (let i = 0; i < 3; i++) run.later(i * 0.3, () => throwHook(gRail(i + 1), railOf([-6, 1, 9][i]))); } });
    steps.push({ wait: 1.4 });
    steps.push({ do: () => { for (const h of S.hooks) h.taut = 1; g.close.x += 1.2; camera.shake(8); sfx('thud'); } });
    steps.push({ wait: 0.8 });
    // the two captains
    const [ida, idb] = v.finals, a = AIR_CAPTAIN[ida], bb = AIR_CAPTAIN[idb];
    steps.push(camTo(g.x + 2, g.y, 1.1, 1.0, true, g.lv));
    steps.push({ card: [`${a.name.toUpperCase()}  &  ${bb.name.toUpperCase()}`, `${a.title} · ${bb.title}`], dur: 2.8 });
    steps.push({ say: { name: bb.name, color: '#ff9a6a', portrait: monsterPortrait(idb), text: fillLine(pick(CAPTAIN_CRIES), ctx()), voice: { pitch: bb.voice, wave: 'sawtooth' } } });
    steps.push({ do: () => {
      // the captains leave their places on the rail: the first leaps the gap, the second swings over from the mainmast
      const mast = () => [g.x, g.y - 0.8, g.lv + 17 * LV];
      run.finals = [[ida, -1.2, 2, false], [idb, 2.6, 4, true]].map(([id, dz, ri, sw]) => {
        g.crew = g.crew.filter((c) => c.cap !== id);
        return spawnCaptain(id, flagRail(ri), near(...tileOf(-2.2 + (sw ? 1.6 : 0), dz)), 'boss', null, sw ? { swing: mast } : {});
      });
      world.boss = run.finals[0];
    } });
    steps.push({ until: () => run.finals.every((m) => !m.entering), max: 5 });
    // the knights run back to the hero and leap into the captains, runeblades first
    steps.push(camTo(OX - 1, OY + 0.5, 1.0, 0.8, false));
    for (const [k, i] of [[k1, 0], [k2, 1]]) {
      steps.push(sayStep({ who: i ? 'k2' : 'k1', text: fillLine(CHARGE_LINES[(run.talk + i * 2) % CHARGE_LINES.length], ctx()), act: 'rage' }));
      steps.push({ do: () => strike(k, run.finals[i], true) });
      steps.push({ wait: 0.9 });
    }
    steps.push({ until: () => !k1.jumping && !k2.jumping && !k1.slash && !k2.slash, max: 3 });
    steps.push({ do: () => { for (const k of [k1, k2]) { k.ally = true; k.chase = true; k.follow = heroSide(k === k1 ? -1 : 1); } } });
    steps.push(camTo(OX + 0.5, OY + 0.5, 0.9, 1.0, true));
    Cine.play(steps, () => { run.phase = 'final'; run.t = 0; UI.centerMsg('THE LAST FIGHT', 'Both captains are on your deck', 2.2); });
  }

  // ---- victory
  function victory() {
    run.phase = 'victory';
    const g = S.galleon;
    const steps = [
      { wait: 1.0 },
      camTo(OX - 8, OY + 1, 0.7, 1.6, true),
      { do: () => { for (const h of S.hooks) { const [x, y, l] = h.to; sparkle(x, y, l * HS, '#ffd080', 10, 0.4); } S.hooks.length = 0; sfx('thud'); camera.shake(5); } },
    ];
    if (run.k1 && g) {
      // still not joining: they leap onto the limping flagship to have words with whoever fired that broadside
      for (const [i, k] of [[0, run.k1], [1, run.k2]]) {
        const ln = FAREWELLS[(run.talk + i * 3) % FAREWELLS.length];
        steps.push(camTo(k.x, k.y, 1.3, 0.6, false));
        steps.push(sayStep({ who: i ? 'k2' : 'k1', text: fillLine(ln[0], ctx()), act: ln[1] }));
      }
      steps.push({ do: () => { for (const [k, i, dly] of [[run.k1, 1, 0], [run.k2, 3, 0.3]]) run.later(dly, () => { k.ally = false; knightJump(k, () => flagRail(i), 1.1, 110, () => { k.onFlagship = true; }); }); } });
      steps.push({ until: () => !run.k1.jumping && !run.k2.jumping, max: 3 });
    }
    steps.push({ do: () => { if (g) g.leaving = true; } });
    steps.push({ wait: 2.2 });
    steps.push(camTo(OX + 0.5, OY + GATE.z + 1.5, 1.4, 1.6, true, FC_H * LV + 12));
    steps.push({ do: () => { S.gateColor = '#40a0ff'; S.gateFlash = 1.4; sfx('gate'); addEffect(new Ring(OX + 0.5, OY + GATE.z + 0.8, 0.2, 3, 1, '#40a0ff', 5)); } });
    steps.push({ card: ['VICTORY', 'The gate now leads onward'], dur: 2.6 });
    steps.push(camTo(OX + 0.5, OY + 0.5, 1.2, 1.4, true));
    steps.push({ do: () => spawnHoard() });
    steps.push({ wait: 1.2 });
    steps.push({ say: { name: G.char.name, color: '#9fd0ff', portrait: heroPortrait, text: pick(VICTORY), voice: { pitch: 1 } } });
    Cine.play(steps, () => { run.completed = true; run.phase = 'done'; UI.refresh(); onSuccess(); });
  }
  function spawnHoard() {
    const [x, y] = near(OX + 0.5, OY + 0.5);
    const chest = {
      x, y, rare: true, sky: true, opened: false, reach: 1.3,
      use() {
        if (this.opened) return;
        this.opened = true; sfx('chest'); sfx('gold');
        dropChest(world, this, depth);
        // the hoard: a better chance at Epic and above than any other chest
        const st0 = G.player ? G.player.st : { magicFind: 0 }, il = lvl + 2;
        world.addLoot(new GroundItem(this.x, this.y + 0.3, 'item', { item: rollItem(il, { mf: st0.magicFind, bonus: 1.6 }) }));
        if (chance(0.35)) world.addLoot(new GroundItem(this.x + 0.3, this.y + 0.2, 'item', { item: rollItem(il, { rarity: rarityAt(il, chance(0.2) ? 4 : 3) }) }));
        sparkle(this.x, this.y, 20, '#ffd060', 30, 0.6);
      },
    };
    world.chests.push(chest);
    addEffect(new Ring(x, y, 0.2, 2.4, 0.8, '#ffd060', 6)); sparkle(x, y, 40, '#ffd060', 40, 0.8); sfx('gold');
    run.chest = chest;
  }

  // ------------------------------------------------------------------ captains' specials and the weather
  function captainMoves(dt) {
    const pl = p(); if (!pl || pl.dead) return;
    for (const m of live) {
      if (!m.captain || m.dead || m.entering || m.parley) continue;
      if ((m.moveT -= dt) > 0) continue;
      m.moveT = rand(7, 10.5);
      const mv = pick([...m.captain.moves, 'climb', 'swing', 'rappel']);
      if (mv === 'crew') {
        const boat = S.boats.find((b) => b.st === 'dock') , from = boat ? [boat.x, boat.y, boat.lv] : S.galleon ? galleonPort() : [OX - 18, OY + rand(-5, 5), 40];
        for (let i = 0; i < 2 + (lvl > 40 ? 1 : 0); i++) run.later(i * 0.4, () => spawnPirate(pick(AIR_CREW).id, 'normal', from, near(pl.x + rand(-3, 3), pl.y + rand(-3, 3)), 99));
        floatText(m.x, m.y, 80, 'ALL HANDS!', '#ffb070', 16);
      } else if (mv === 'hook') {
        addEffect(new Telegraph({ kind: 'line', x: m.x, y: m.y, ang: Math.atan2(pl.y - m.y, pl.x - m.x), len: Math.hypot(pl.x - m.x, pl.y - m.y), w: 0.5, dur: 0.8, color: '#c0a070' }), 'ground');
        run.later(0.8, () => {
          if (m.dead || pl.dead) return;
          const h = { from: [m.x, m.y, lvAt(m.x, m.y) + 8], to: [pl.x, pl.y, lvAt(pl.x, pl.y) + 6], t: 0, taut: 1 }; S.hooks.push(h);
          let t = 0;
          run.scripted.push((dt) => { t += dt; h.t = Math.min(1, t * 4); h.to = [pl.x, pl.y, lvAt(pl.x, pl.y) + 6]; h.from = [m.x, m.y, lvAt(m.x, m.y) + 8];
            const d = Math.hypot(m.x - pl.x, m.y - pl.y); if (t > 0.25 && d > 1.4) world.map.move(pl, (m.x - pl.x) / d * dt * 9, (m.y - pl.y) / d * dt * 9);
            if (t > 0.75 || m.dead) { S.hooks.splice(S.hooks.indexOf(h), 1); return false; } return true; });
          aoe(world, m, pl.x, pl.y, 0.8, m.dmg * 0.5, 'phys', {}); sfx('swing');
        });
        floatText(m.x, m.y, 80, 'GET OVER HERE!', '#ffb070', 16);
      } else if (mv === 'leap') {
        const to = near(pl.x, pl.y, 1.5);
        addEffect(new Telegraph({ kind: 'circle', x: to[0], y: to[1], r: 2.2, dur: 1.1 }), 'ground');
        leap(m, [m.x, m.y, lvAt(m.x, m.y)], to, { dur: 1.1, arc: 160 });
      } else if (mv === 'barrage') {
        volleyAtDeck(5); floatText(m.x, m.y, 80, S.galleon ? 'FIRE ALL GUNS!' : 'POWDER! NOW!', '#ffb070', 16);
      } else if (mv === 'storm') {
        for (let i = 0; i < 3; i++) run.later(i * 0.45, () => lightningAt(...(i === 0 ? near(pl.x, pl.y, 1) : near(pl.x + rand(-4, 4), pl.y + rand(-4, 4)))));
        floatText(m.x, m.y, 80, 'STORM, ANSWER ME!', '#c0d8ff', 16);
      } else if (mv === 'climb') {
        // up onto something high, a taunt, then down onto the hero
        const perches = [[0, FC_H + 6.6, -14.9], [-1.95, FC_H + 3.6, -13.5], [1.95, FC_H + 3.6, -13.5], [0, sheer(0) + 0.35, 19.6], [-4.44, QD_H + 1.3, 17.6], [4.44, QD_H + 1.3, 17.6]];
        const [px, py, pz] = perches.reduce((a, b) => Math.hypot(OX + b[0] - m.x, OY + b[2] - m.y) < Math.hypot(OX + a[0] - m.x, OY + a[2] - m.y) ? b : a);
        floatText(m.x, m.y, 80, 'CATCH ME IF YOU CAN!', '#ffb070', 15);
        leap(m, [m.x, m.y, lvAt(m.x, m.y)], [OX + px, OY + pz], { toLv: py * LV, arc: 120, dur: 1.0, perch: (mm) => {
          floatText(mm.x, mm.y, 110 + py * LV * HS / 4, 'UP HERE!', '#ffd090', 18);
          const tgt = near(pl.x, pl.y, 1.2);
          run.later(0.6, () => addEffect(new Telegraph({ kind: 'circle', x: tgt[0], y: tgt[1], r: 2.3, dur: 1.0 }), 'ground'));
          run.later(1.6, () => { if (!mm.dead) leap(mm, [mm.x, mm.y, py * LV], tgt, { dur: 0.75, arc: 50 }); });
        } });
      } else if (mv === 'swing') {
        // a rope off the bridge spire (or the flagship's rigging): a long swing through the hero
        const anchor = S.galleon && chance(0.5) ? () => [S.galleon.x, S.galleon.y - 0.8, S.galleon.lv + 17 * LV] : () => [OX + 0.5, OY - 14.9, (FC_H + 13) * LV];
        const dx = pl.x - m.x, dy = pl.y - m.y, d = Math.hypot(dx, dy) || 1, to = near(pl.x + dx / d * 2.5, pl.y + dy / d * 2.5, 1.5);
        addEffect(new Telegraph({ kind: 'line', x: m.x, y: m.y, ang: Math.atan2(to[1] - m.y, to[0] - m.x), len: Math.hypot(to[0] - m.x, to[1] - m.y), w: 1.2, dur: 0.7, color: '#d0a060' }), 'ground');
        floatText(m.x, m.y, 80, 'ROPE!', '#ffb070', 16);
        run.later(0.7, () => { if (!m.dead && !m.entering) swingAcross(m, anchor, to, { dur: 1.3 }); });
      } else if (mv === 'rappel') {
        // boarders slide down ropes out of the sky around the hero
        floatText(m.x, m.y, 80, 'DROP THE LINES!', '#ffb070', 16);
        for (let i = 0; i < 2 + (lvl > 40 ? 1 : 0); i++) run.later(i * 0.35, () => spawnPirate(pick(AIR_CREW).id, 'normal', null, near(pl.x + rand(-3, 3), pl.y + rand(-3, 3)), 99, 'rope'));
      } else if (mv === 'smoke') {
        smoke(m.x, m.y, 10, '#2a2a30', 14, 20);
        const to = near(pl.x - (m.x - pl.x) * 0.5, pl.y - (m.y - pl.y) * 0.5, 1.5);
        m.x = to[0]; m.y = to[1]; smoke(m.x, m.y, 10, '#2a2a30', 10, 16); sfx('arcane', 0.5);
      }
    }
  }
  function lightningAt(x, y) {
    addEffect(new Telegraph({ kind: 'circle', x, y, r: 1.3, dur: 1.1, color: '#a8c8ff' }), 'ground');
    run.later(1.1, () => {
      S.bolts.push({ x, y, lv: lvAt(x, y), t: 0, dx: rand(-120, 120), seed: (Math.random() * 1e6) | 0 }); S.flash = Math.max(S.flash, 0.55);
      const dmg = base.dmg * 1.8;
      aoe(world, null, x, y, 1.3, dmg, 'light', { team: 'enemy' }); aoe(world, null, x, y, 1.3, dmg, 'light', { team: 'player' });
      burst(x, y, 10, 'light', 16, 4); camera.shake(7); sfx('explode', 0.5);
    });
  }
  function weather(dt) {
    const pl = p(); if (!pl) return;
    run.hz = (run.hz ?? rand(6, 9)) - dt;
    if (v.hazard === 'lightning' && run.hz <= 0) { run.hz = rand(5.5, 8.5); const n = 2 + (chance(0.5) ? 1 : 0); for (let i = 0; i < n; i++) run.later(i * 0.6, () => lightningAt(...(i === 0 ? near(pl.x + rand(-1.5, 1.5), pl.y + rand(-1.5, 1.5)) : near(OX + rand(-5, 5), OY + rand(-10, 14))))); }
    if (v.hazard === 'wind') {
      if (run.hz <= 0) { run.hz = rand(7, 10); run.gust = 3; UI.centerMsg('', 'A gust!', 1); }
      if ((run.gust = (run.gust || 0) - dt) > 0) {
        S.windK = 2.4;
        for (const c of world.creatures) if (!c.dead && !c.entering && !c.static) world.map.move(c, -1.4 * dt, 0.7 * dt);
        for (const n of world.npcs) if (n.calm) { const nx = n.x - 0.5 * dt; if (world.map.walkable(nx, n.y)) n.x = nx; }
      } else S.windK = 1;
    }
    if (v.hazard === 'chill' && run.hz <= 0) {
      run.hz = rand(8, 11);
      const z = rand(-9, 15), x0 = OX - 5.5, y = OY + z;
      addEffect(new Telegraph({ kind: 'line', x: x0, y, ang: 0, len: 11, w: 1.6, dur: 1.4, color: '#a0e0ff' }), 'ground');
      run.later(1.4, () => {
        for (let x = x0; x <= x0 + 11; x += 1.2) { aoe(world, null, x, y, 0.9, base.dmg * 0.8, 'cold', { team: 'enemy' }); aoe(world, null, x, y, 0.9, base.dmg * 0.8, 'cold', { team: 'player' }); spawn({ type: 'glow', x, y, z: 10, vz: 30, life: 0.6, size: 10, size1: 0, color: '#d8f4ff', add: true }); }
        sfx('arcane', 0.4);
      });
    }
    if (v.hazard === 'embers' && run.hz <= 0) {
      run.hz = rand(4.5, 7);
      for (let i = 0; i < 3; i++) {
        const [x, y] = i === 0 ? near(pl.x + rand(-2.5, 2.5), pl.y + rand(-2.5, 2.5)) : near(OX + rand(-5, 5), OY + rand(-10, 14));
        addEffect(new Telegraph({ kind: 'circle', x, y, r: 1.1, dur: 1.2, color: '#ff8a30' }), 'ground');
        run.later(1.2, () => world.addHazard(firePatch(x, y)));
      }
    }
  }
  /** A burning patch of deck: hurts whoever stands in it (both sides) for a few seconds. */
  function firePatch(x, y) {
    let t = 0, tick = 0;
    return {
      ground: true, x, y,
      update(dt) {
        t += dt; tick -= dt;
        if (tick <= 0) { tick = 0.5; aoe(world, null, x, y, 1.0, base.dmg * 0.35, 'fire', { team: 'enemy' }); aoe(world, null, x, y, 1.0, base.dmg * 0.35, 'fire', { team: 'player' }); }
        if (chance(dt * 30)) spawn({ type: 'glow', x: x + rand(-0.8, 0.8), y: y + rand(-0.8, 0.8), z: 2, vz: rand(40, 90), life: rand(0.4, 0.8), size: rand(6, 12), size1: 0, color: chance(0.5) ? '#ff7a20' : '#ffc040', add: true });
        if (chance(dt * 5)) smoke(x + rand(-0.5, 0.5), y + rand(-0.5, 0.5), 20, '#2a2220', 1, 10);
        return t < 5;
      },
      draw(ctx) {   // a dark scorch under the flames (the flames themselves are particles)
        const px = isoX(x, y), py = isoY(x, y), k = Math.min(1, t * 3, (5 - t) * 2);
        ctx.globalAlpha = 0.45 * k; ctx.drawImage(glowSprite('#1a0e08'), px - 50, py - 25, 100, 50); ctx.globalAlpha = 1;
      },
    };
  }

  // ------------------------------------------------------------------ every frame
  let started = false;
  function tick(dt) {
    const pl = p();
    if (!started) { started = true; intro(); }
    // scripted motions and timers run in cut scenes too (game.js keeps calling us)
    const sc = run.scripted; run.scripted = [];   // a motion may queue the next one (a walk's next leg) while this runs
    for (const f of sc) if (f(dt) !== false) run.scripted.push(f);
    for (const tm of run.timers.slice()) if ((tm[0] -= dt) <= 0) { run.timers.splice(run.timers.indexOf(tm), 1); tm[1](); }
    for (const b of S.boats) boatTick(b, dt);
    S.boats = S.boats.filter((b) => !b.dead);
    galleonTick(dt);
    knightTick(dt);
    for (const s of S.shots) { s.t += dt; if (s.t >= s.dur && !s.done) { s.done = true; if (s.onHit) s.onHit(); } }
    S.shots = S.shots.filter((s) => !s.done);
    for (const b of S.bolts) b.t += dt;
    S.bolts = S.bolts.filter((b) => b.t < 0.4);
    S.flash = Math.max(0, S.flash - dt * 2.5);
    S.gateFlash = Math.max(0, S.gateFlash - dt * 0.8);
    if (v.lightning && chance(dt * 0.12)) S.flash = Math.max(S.flash, 0.25);   // far-off lightning lights the clouds
    lights();
    for (const m of live) if (m.dead) live.delete(m);
    if (G.cine || !pl || pl.dead) return;
    run.t += dt;
    if (run.phase !== 'intro' && run.phase !== 'victory' && run.phase !== 'done') weather(dt);
    captainMoves(dt);
    knightsFight(dt);
    if (run.phase === 'waves') {
      if (!waveLeft() && (run.t > 1.5)) {
        run.pause = (run.pause ?? 2.5) - dt;
        if (run.pause <= 0) {
          run.pause = undefined;
          const W = SKY_WAVES[run.wave];
          if (run.wave >= 0 && W.mid && !run.midDone) { run.midDone = true; midBoss(); }
          else if (run.wave + 1 < SKY_WAVES.length) { startWave(run.wave + 1); run.t = 0; }
          else parley();
        }
      }
    } else if (run.phase === 'mid') {
      if (run.midM && run.midM.dead && !waveLeft()) { UI.centerMsg(`${run.midM.name.toUpperCase()} FALLS`, 'More sails on the wind', 2.4); world.boss = null; run.phase = 'waves'; run.t = 0; }
    } else if (run.phase === 'flagship') {
      const g = S.galleon; run.duelT += dt;
      g.k = Math.min(1, run.duelT / 26);
      if ((run.volleyT -= dt) <= 0) { run.volleyT = rand(3.2, 4.4); volleyAtDeck(3 + (g.k > 0.5 ? 1 : 0)); }
      if ((run.returnT -= dt) <= 0) {   // the ironclad's port battery answers
        run.returnT = rand(1.2, 2.2);
        const to = [g.x + rand(-2, 2), g.y + rand(-8, 8), g.lv + rand(0, 1) * LV];
        cannon(shipPort(), to, () => { burst(to[0], to[1], to[2] * HS, 'fire', 14, 4); smoke(to[0], to[1], to[2] * HS, '#3a3230', 5, 16); if (chance(0.4) && g.burn.length < 7) g.burn.push([rand(-3, 3), rand(-1, 1), rand(-12, 12)]); sfx('explode', 0.3); }, 1.0);
      }
      if (run.duelT > 9 && !run.drop1) { run.drop1 = true; for (let i = 0; i < 3; i++) run.later(i * 0.4, () => spawnPirate(pick(AIR_CREW).id, i ? 'normal' : 'champion', galleonPort(), near(OX - 3 + rand(-1, 2), OY + rand(-6, 8)), 98)); }
      if (run.duelT > 18 && !run.drop2) { run.drop2 = true; for (let i = 0; i < 4; i++) run.later(i * 0.4, () => spawnPirate(pick(AIR_CREW).id, 'normal', galleonPort(), near(OX - 3 + rand(-1, 2), OY + rand(-6, 8)), 98)); }
      if (g.k >= 1 && ![...live].some((m) => !m.dead)) hooks();
    } else if (run.phase === 'final') {

      if (run.finals.length && run.finals.every((m) => m.dead) && ![...live].some((m) => !m.dead)) { world.boss = null; victory(); }
      else if (world.boss && world.boss.dead) world.boss = run.finals.find((m) => !m.dead) || null;
    }
  }
  /** At night (and in dark weather) the ship's lanterns, braziers, furnaces and the gate light the deck. */
  function lights() {
    if (!world.darkK) return;
    for (const [x, y, z] of A.ship.lamps) addLight(OX + x, OY + z, 3.2, 0.9, y * LV * HS);
    for (const [x, y, z] of A.ship.braziers) addLight(OX + x, OY + z, 3.5, 1, y * LV * HS);
    addLight(OX + 0.5, OY + GATE.z + 0.6, 4.5, 1, (FC_H + 1.2) * LV * HS);
    for (const b of S.boats) if (b.alpha > 0.3) addLight(b.x, b.y, 3, 0.7 * b.alpha, b.lv * HS);
  }
  return run;
}
