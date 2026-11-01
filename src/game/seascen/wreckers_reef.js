// #10 WRECKERS' REEF (docs/PIRATE_SEAS.md): the Teeth, at dusk. The Dawnwake lies off the Wreckers' Reef
// (tools/seaship3d_props.js buildProp 'reef', an arena deck of rock shelves, ledges and a beached wreck's heeled deck)
// with a plank down from her starboard rail onto the west lamp rock. Three false lamps burn on it, a sickly Lampwarden
// green with a red-glass tell, to steer ships onto the rocks: put each out (stand at it while it's doused, or break it).
// Every false lamp still lit calls another longboat (the meter fills faster for each one; full: a boat rows in). The
// Black Tide's longboats beach at the reef's edges and their crews leap ashore. Drifting mines wash up on the shelves:
// any blow sets one off (ranged: where it lies; melee shoves it, and it blows when it meets a foe), blasting whoever is
// near. Mother Cairn tends the east light; the Red Gale Corsair waits on the wreck's deck until the last boat is beaten.
import { G } from '../../state.js';
import { camera, isoX, HH } from '../../core/view.js';
import { aoe } from '../combat.js';
import { Telegraph, addEffect, sparkle, burst, smoke, addLight } from '../../gfx/vfx.js';

// The reef to the Dawnwake's starboard (the camera's side: it lies low, so it hides nothing of her): local (lx, lz) is
// tile (RX + lx, RY + lz); the plank lands on the west lamp rock (D)
const RX = 90, RY = 73, ZD = 11.4;
const W = (lx, lz) => [RX + lx, RY + lz];
/** Where boats beach: the boat's centre (local) and two landing spots on the shelf above it; `out` the way to open sea. */
const BERTHS = [
  { at: [24.6, 3.6], land: [[18.4, 4.0], [16.6, 6.0]], out: [1, 0.2] },     // off the east lamp rock (C)
  { at: [-2.0, 16.4], land: [[-2.0, 10.0], [0.0, 9.0]], out: [0.1, 1] },     // off the north shelf (E)
  { at: [9.4, 8.6], land: [[9.0, 1.4], [7.0, 2.0]], out: [0.2, 1] },        // off the wreck's shelf (B), north side
  { at: [-6.5, -7.6], land: [[-6.0, 0.9], [-8.0, 1.6]], out: [-0.1, -1] },  // off the high shelf (A), south side
];
const MINE_SPOTS = [[15.6, 4.6], [-3.2, 8.6], [-7.6, 1.4], [6.2, 1.2], [-9.2, 4.8], [13.6, 2.4], [0.4, 9.8]];
const LAMP_NAMES = ['the east rock', 'the west rock', "the wreck's stem"];

export default {
  id: 'wreckers_reef', number: 10, name: "Wreckers' Reef", light: 'the Teeth', weather: 'sunset', weatherName: 'Dusk on the Teeth',
  blurb: 'Three false lights burn on the reef. Put them out.', dark: 0.1,
  arrival: 'They moved the lights. Every wreck on this reef steered true.',   // Brask, after her opening line
  fleet: ['reef', 'longboat', 'mine'],
  size: [120, 120],
  noBoats: true,   // (the director's boats lie off the port rail: hers beach on the reef, below)
  waves: [
    { boats: 0, n: [4], champion: 0, crews: [4], label: 'Longboats making for the reef' },
    { boats: 0, n: [7], champion: 1, crews: [3, 2, 2], label: 'Longboats making for the reef' },
    { boats: 0, n: [8], champion: 2, unique: 1, mid: true, crews: [4, 4], label: 'Longboats making for the reef' },
    { boats: 0, n: [8], champion: 2, crews: [4, 4], label: 'Longboats making for the reef' },
    { boats: 0, n: [9], champion: 3, unique: 1, crews: [5, 4], label: 'The last of their boats' },
  ],
  mid: { id: 'ap_madam_stormglass', name: 'Mother Cairn', title: 'Keeper of the False Lights', line: 'Every light on this reef is mine to move.', from: 'deck',
    at: (api) => W(15.4, 4.4) },
  final: { id: 'ap_red_gale_corsair', name: 'Red Gale Corsair', title: "Wrecker of the Teeth", line: "The reef is mine. The wrecks are mine. You're next.", from: 'deck',
    at: (api) => api.state.wreckAt, leapTo: (api) => { const p = api.p(); return p ? reefNear(api, [p.x + 1.5, p.y + 1]) : W(4, 1); } },
  hooks: {
    setup(api) {
      const S = api.state, h = S.h = api.spawnShip('reef', { deck: true }), I = h.info;
      h.place(RX, RY, 0, 0);
      S.deck = api.addDeck(h, { levels: null }); S.D = S.deck.id;
      // the walk map from the reef's own walk data (info.walk: shelves, ledges, the rock steps between them, the wreck's
      // heeled deck in strips and the plank ramp up to it); the bake keeps the rest as rock that hides what's behind it
      reefWalk(api, h, S.D);
      const strips = I.walk.slice(-6);
      const mid = strips[2]; S.wreckAt = W((mid[0] + mid[2]) / 2, (mid[1] + mid[3]) / 2);
      // the plank from her starboard rail down onto the west lamp rock
      const s = api.sAt(ZD), rock = W(-15.4, -4.0);
      S.plank = api.join([api.OX + api.inner(s) - 0.7, api.OY + ZD, 0], [rock[0], rock[1], h.deckY + 0.7], { w: 0.85, plank: true }); S.plank.open();
      // the false lamps: where each burns, and where the hero stands to douse it
      S.lamps = I.lamps.map(([x, y, z], i) => ({ i, at: W(x, z), y, lit: true, stand: reefNear(api, W(x, z)) }));
      S.berths = BERTHS.map((b) => ({ ...b, at: W(...b.at), land: b.land.map((q) => W(...q)), busy: null }));
      S.mines = []; S.idle = 0; S.douse = null; S.mineT = 4; S.bossMove = 6;
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => drawReef(api, ctx) });
    },
    start(api) {
      const S = api.state;
      // each lamp: a light to douse (a mark) and a thing to break (a still foe whose body is the lamp's cage)
      for (const L of S.lamps) {
        const m = L.m = api.spawnArt('ap_violet_fuse_saboteur', 'beetle', 'champion', L.stand, { wave: 96 });
        m.x = L.at[0]; m.y = L.at[1]; m.static = true; m.dmg = 0; m.alpha = 0.04; m.noShadow = true; m.name = 'False Light'; m.prop = 'lamp'; m.hunter = false; m.sea = false; m.rimColor = () => null;
        m.maxHp = api.base.hp * 2.4; m.hp = m.maxHp; m.affixes = []; m.scale = 0.3;
        m.z = Math.max(0, (L.y + api.WL) * api.VZ - api.lvAt(m.x, m.y) * api.HS - 20);   // its bar and name up at the cage
        L.mark = api.mark(L.stand[0], L.stand[1], 'Douse the False Light', () => douse(api, L), '#7dffa0');
      }
      S.meter = api.meter('The false lights call', { color: '#5aff8a', full: (a) => lampBoat(a), note: '3 burning' });
      for (const q of MINE_SPOTS.slice(0, 3)) washIn(api, W(...q), 0);
    },
    onWave(api, n, w) {
      let champ = w.champion || 0, uniq = w.unique || 0;
      (w.crews || []).forEach((k, j) => {
        const c = Math.min(champ, 1 + (j ? 0 : 1)), u = Math.min(uniq, 1); champ -= c; uniq -= u;
        api.later(j * 2.4, () => rowIn(api, api.crewList(k, c, u, n), n), n);
      });
    },
    onBoss(api, m) { m.moveT = Infinity; api.state.bossMove = 4; },   // (the director's specials swing from the Dawnwake's yard: theirs are below)
    tick(api, dt) {
      const S = api.state, pl = api.p(), run = api.run;
      for (const b of api.world.seaState.boats) if (b.reef) boatTick(api, b, dt);
      // three or more boats pulling for the reef at once: Pip counts them
      if (api.world.seaState.boats.filter((b) => b.reef && b.st === 'row').length >= 3) api.bark('sails');
      minesTick(api, dt);
      if (run.phase === 'victory' || run.phase === 'done') return;
      for (const L of S.lamps) {
        if (L.lit && L.m && L.m.dead) out(api, L, true);
        if (L.m && !L.m.dead) L.m.cd = 99;
        if (L.lit && api.world.darkK) addLight(L.at[0], L.at[1], 4, 0.9, 60, '#5aff8a');
      }
      // dousing a light: he stands at it while it's put out
      const D = S.douse;
      if (D) {
        if (!pl || Math.hypot(pl.x - D.L.stand[0], pl.y - D.L.stand[1]) > 1.9 || !D.L.lit) { if (D.L.lit) api.floatText(D.L.at[0], D.L.at[1], 70, 'INTERRUPTED', '#ff9060', 14); S.douse = null; }
        else {
          D.t += dt; if ((D.sp = (D.sp || 0) - dt) <= 0) { D.sp = 0.2; smoke(D.L.at[0], D.L.at[1], 40, '#a0b0a8', 3, 8); }
          if (D.t >= 1.6) { S.douse = null; out(api, D.L, false); }
        }
      }
      const lit = S.lamps.filter((L) => L.lit).length;
      if (S.meter) { if (lit) { S.meter.note = `${lit} burning · each one calls a longboat`; S.meter.add(dt * lit / 34); } else { S.meter.hide(); S.meter = null; } }
      // mines wash up on the shelves now and then
      if ((S.mineT -= dt) <= 0) {
        S.mineT = 12;
        if (S.mines.filter((q) => !q.gone).length < 4) {
          const free = MINE_SPOTS.map((q) => W(...q)).filter((q) => !S.mines.some((o) => !o.gone && Math.hypot(o.x - q[0], o.y - q[1]) < 3) && (!pl || Math.hypot(pl.x - q[0], pl.y - q[1]) > 3));
          if (free.length) { washIn(api, free[Math.floor(Math.random() * free.length)], 0); api.bark('mines'); }
        }
      }
      // nothing within reach for a moment: a boat on its way rows hard, the next one sets out now
      const near = [...api.live].some((m) => !m.dead && !m.prop && m.targetable !== false && !m.entering && pl && Math.hypot(m.x - pl.x, m.y - pl.y) < 13);
      S.idle = near || !pl ? 0 : S.idle + dt;
      if (S.idle > 0.8) {
        S.idle = 0;
        const rowing = api.world.seaState.boats.filter((b) => b.reef && b.st === 'row' && b.crew.length);
        const tm = run.timers.filter((q) => q[2] !== undefined).sort((a, b) => a[0] - b[0])[0];
        if (rowing.length) for (const b of rowing) b.fast = 3;
        else if (tm) tm[0] = 0;
        else if (lit && S.meter && S.meter.value < 0.85) S.meter.set(0.85);   // a false light calls the next one sooner
      }
      // the captains' own moves
      const m = run.phase === 'mid' ? run.midM : run.phase === 'final' ? run.capM : null;
      if (m && !m.dead && !m.entering && pl && (S.bossMove -= dt) <= 0) {
        S.bossMove = 7;
        if (m === run.capM && Math.random() < 0.55) {   // his boat's swivel guns on the reef round the hero
          api.floatText(m.x, m.y, 100, 'GIVE THEM THE GUNS!', '#ffb070', 16);
          for (let i = 0; i < 4; i++) { const to = reefNear(api, [pl.x + api.rand(-2.4, 2.4), pl.y + api.rand(-2.4, 2.4)]);
            api.telegraph(to[0], to[1], 1.5, 1.4); api.later(0.1 + i * 0.25, () => api.cannon([to[0] + 14, to[1] + 6, api.SEA_LV + 4], [to[0], to[1], api.lvAt(to[0], to[1])], () => api.blast(to[0], to[1], 1.5, api.base.dmg * 1.8, true), 1.3)); }
        } else if (m === run.capM || Math.random() < 0.5) {   // a leap onto the hero
          const to = reefNear(api, [pl.x, pl.y]);
          api.telegraph(to[0], to[1], 2.2, 1.1);
          api.leap(m, [m.x, m.y, api.lvAt(m.x, m.y)], to, { dur: 1.1, arc: 160 });
        } else {   // Mother Cairn's lamp oil: three pools of green fire round the hero
          api.floatText(m.x, m.y, 100, 'BURN FOR THE LIGHT!', '#7dffa0', 16);
          for (let i = 0; i < 3; i++) { const to = reefNear(api, [pl.x + api.rand(-2.5, 2.5), pl.y + api.rand(-2.5, 2.5)]); api.telegraph(to[0], to[1], 1.7, 1.2, '#60ff90');
            api.later(1.2, () => { if (!m.dead) api.blast(to[0], to[1], 1.7, api.base.dmg * 1.5, true); }); }
        }
      }
      // his fall: the reef is the Lampwardens' (the last mines and the false lights go with him)
      if (run.capM && run.capM.dead) {
        for (const q of api.live) if (!q.dead && q !== run.capM && q.prop) { q.dead = true; q.hp = 0; }
        for (const L of S.lamps) if (L.lit) out(api, L, true);
      }
    },
    onVictory(api) {
      const S = api.state;
      for (const o of S.mines) if (!o.gone) { o.gone = true; o.h.remove(); if (o.m) { o.m.dead = true; o.m.hp = 0; } }
      for (const b of api.world.seaState.boats) if (b.reef && b.st !== 'away') { b.st = 'away'; b.t = 0; }
      if (S.meter) { S.meter.hide(); S.meter = null; }
    },
    objective(api) {
      const S = api.state, run = api.run, pl = api.p();
      if (run.phase === 'final' && run.capM && !run.capM.dead && !run.capM.entering) return { x: run.capM.x, y: run.capM.y, reach: 1.6 };
      if (S.douse) return { x: S.douse.L.stand[0], y: S.douse.L.stand[1], reach: 0.9, use: () => douse(api, S.douse.L) };
      const lit = S.lamps.filter((L) => L.lit);
      if (lit.length && pl) { const L = lit.reduce((a, b) => (Math.hypot(b.stand[0] - pl.x, b.stand[1] - pl.y) < Math.hypot(a.stand[0] - pl.x, a.stand[1] - pl.y) ? b : a));
        return { x: L.stand[0], y: L.stand[1], reach: 0.9, use: () => douse(api, L) }; }
      if (run.phase === 'mid' && run.midM && !run.midM.dead) return { x: run.midM.x, y: run.midM.y, reach: 1.6 };
      const c = W(-2, 4); return { x: c[0], y: c[1], reach: 8 };
    },
  },
};
const rand = (a, b) => a + Math.random() * (b - a);
/** Write the reef's walk rects into the map: a tile is walked where they cover enough of it (at their floors' mean by
 *  area), unless a boulder or a lamp's cairn stands there (info.cover); every other reef tile is rock. */
function reefWalk(api, h, D) {
  const map = api.map, I = h.info, lv = (y) => Math.round((h.deckY + y) * api.LV);
  for (let ty = Math.floor(RY - 14); ty < RY + 14; ty++) for (let tx = Math.floor(RX - 25); tx < RX + 25; tx++) {
    const t = map.tileIdx(tx + 0.5, ty + 0.5); if (map.deck[t] && map.deck[t] !== D) continue;
    const ax = tx - RX, az = ty - RY; let fy = 0, tot = 0;
    for (const [x0, z0, x1, z1, y] of I.walk) {   // the floors under it, by area (half-tile rock steps average into a walkable rise)
      const o = Math.max(0, Math.min(ax + 1, x1) - Math.max(ax, x0)) * Math.max(0, Math.min(az + 1, z1) - Math.max(az, z0));
      if (o > 0) { tot += o; fy += o * y; }
    }
    fy /= tot || 1;
    const rock = I.cover.some(([cx, cz, r]) => Math.hypot(ax + 0.5 - cx, az + 0.5 - cz) < r * 0.85);
    if (tot >= 0.45 && !rock) { map.t[t] = 1; map.deck[t] = D; map.block[t] = 0; map.hgt[t] = lv(fy); }
    // rock: waist high at most (boulders are cover, a lamp's pole is no wall: the bake's tops would hide whoever stands by it)
    else if (map.deck[t] === D) { map.block[t] = 1; map.hgt[t] = Math.min(map.hgt[t], lv(tot > 0.05 ? fy + 0.6 : 0.9)); }
  }
  api.mapChanged();
}
/** A walkable tile of the reef near (x, y). */
function reefNear(api, [x, y]) {
  const m = api.map, ok = (q) => m.walkable(q[0], q[1]) && m.deck[m.tileIdx(q[0], q[1])] === api.state.D;
  if (ok([x, y])) return [x, y];
  for (let r = 0.5; r < 5; r += 0.5) for (let a = 0; a < 6.28; a += 0.45) { const q = [x + Math.cos(a) * r, y + Math.sin(a) * r]; if (ok(q)) return q; }
  return [x, y];
}

// ------------------------------------------------------------------ the false lamps
function douse(api, L) {
  const S = api.state, pl = api.p();
  if (!L.lit || !pl || (S.douse && S.douse.L === L)) return;
  if (Math.hypot(pl.x - L.stand[0], pl.y - L.stand[1]) > 1.9) return;
  S.douse = { L, t: 0 }; api.floatText(L.at[0], L.at[1], 70, 'DOUSING THE FALSE LIGHT', '#a0ffc0', 14); api.sfx('cold', 0.5);
}
function out(api, L, broken) {
  const S = api.state;
  if (!L.lit) return;
  L.lit = false; S.h.ship.setLamp?.(L.i, false);
  api.unmark(L.mark);
  if (L.m && !L.m.dead) { L.m.dead = true; L.m.hp = 0; }
  const [x, y] = L.at;
  if (broken) { burst(x, y, 50, 'cold', 18, 4); sparkle(x, y, 60, '#ff4030', 10, 0.6); api.sfx('hit', 0.9); }
  else { smoke(x, y, 50, '#9aa8a0', 12, 14); api.sfx('cold', 0.8); }
  if (api.run.phase === 'victory' || api.run.capM?.dead) return;
  const left = S.lamps.filter((q) => q.lit).length;
  api.banner(left ? 'A FALSE LIGHT GOES OUT' : 'THE FALSE LIGHTS ARE OUT', left ? `${left} still burn${left > 1 ? '' : 's'}` : 'No more boats answer them');
}
/** A lit lamp calls a longboat in: its light flares and it rows for the berth nearest that lamp. */
function lampBoat(api) {
  const S = api.state, lit = S.lamps.filter((L) => L.lit); if (!lit.length) return;
  const L = lit[Math.floor(Math.random() * lit.length)];
  burst(L.at[0], L.at[1], 60, 'poison', 16, 3); api.sfx('cold', 0.6);
  api.floatText(L.at[0], L.at[1], 90, 'A FALSE LIGHT CALLS', '#7dffa0', 15);
  const b = rowIn(api, api.crewList(3, 0, 0, api.run.wave), api.run.phase === 'waves' ? api.run.wave : 94, L);
  if (b) b.lamp = L;
}

// ------------------------------------------------------------------ the longboats
/** A longboat rows in from the open sea to a free berth (the one nearest `L`, if given) and beaches there; the
 *  director's boat tick leaps its crew ashore onto the berth's landing spots (game/seabattle.js boatTick 'dock'). */
function rowIn(api, crew, wave, L = null) {
  const S = api.state, boats = api.world.seaState.boats;
  const free = S.berths.filter((q) => !boats.some((b) => b.reef && b.berth === q && b.st !== 'away'));
  const pool = free.length ? free : S.berths, pl = api.p();
  const B = L ? pool.reduce((a, b) => (Math.hypot(b.at[0] - L.at[0], b.at[1] - L.at[1]) < Math.hypot(a.at[0] - L.at[0], a.at[1] - L.at[1]) ? b : a))
    : pool[Math.floor(Math.random() * pool.length)];
  const h = api.spawnShip('longboat'); if (!h) return null;
  const spots = h.info.crew.slice().sort(() => Math.random() - 0.5);
  crew.forEach((c, i) => { const sp = spots[i % spots.length], extra = Math.floor(i / spots.length);
    h.addCrew({ ...c, x: sp[0] + rand(-0.12, 0.12) - extra * 0.35, y: sp[1], z: sp[2] + rand(-0.15, 0.15) + extra * 0.4, h: c.h ?? 56, ph: rand(0, 6), bob: true }); });
  const off = free.length ? 0 : 1.6, dock = { x: B.at[0] + off * B.out[1], y: B.at[1] - off * B.out[0] };
  const from = { x: dock.x + B.out[0] * 34 + 10, y: dock.y + B.out[1] * 34 - 6 };
  const b = { kind: 'longboat', dz: 'reef', reef: true, berth: B, h, x: from.x, y: from.y, heading: 0, st: 'row', t: 0, rt: 0, dock, from, wait: 0.8, hold: 2.5, leap: true, stay: true,
    wave, crew: h.crew, lines: [], dur: 6.5, land: B.land, fast: 1 };
  h.place(b.x, b.y, 0, 1.1); h.setAlpha(0);
  boats.push(b);
  return b;
}
function boatTick(api, b, dt) {
  const h = b.h, ease = (k) => 1 - (1 - k) ** 3;
  if (b.st === 'row') {
    b.rt += dt * (b.fast || 1);
    const k = ease(Math.min(1, b.rt / b.dur)), nx = b.from.x + (b.dock.x - b.from.x) * k, ny = b.from.y + (b.dock.y - b.from.y) * k, vx = nx - b.x, vy = ny - b.y;
    if (vx || vy) b.heading += (Math.max(-0.5, Math.min(0.5, -Math.atan2(vx, -vy))) * (1 - k) - b.heading) * Math.min(1, dt * 3);
    b.x = nx; b.y = ny; h.place(b.x, b.y, b.heading, 0.55 + 0.9 * (1 - k)); h.row = 1; h.setAlpha(Math.min(1, k / 0.25));
    if (k >= 1) {   // she beaches: rings where her crew will land, then the director leaps them ashore
      b.st = 'dock'; b.t = 0; api.sfx('thud', 0.6); api.splash(b.x, b.y, 0.6);
      for (const [x, y] of b.land) addEffect(new Telegraph({ kind: 'circle', x, y, r: 1.25, dur: b.wait + 0.6, color: '#ff7040' }), 'ground');
    }
  } else if (b.st === 'dock') {
    b.heading = 0;
    if (!b.crew.length && b.t > b.wait + 1.5) { b.st = 'away'; b.t = 0; }
  } else if (b.st === 'away') {   // back out to sea the way she came, and gone
    b.rt += dt; const k = Math.min(1, b.t / 6), e = k * k;
    h.place(b.dock.x + (b.from.x - b.dock.x) * e, b.dock.y + (b.from.y - b.dock.y) * e, b.heading, 0.4); h.row = 1;
    h.setAlpha(1 - Math.max(0, (k - 0.5) / 0.5));
    if (k >= 1) { b.dead = true; h.remove(); }
  }
}

// ------------------------------------------------------------------ the drifting mines
/** A mine washes in from the sea onto the shelf at `to`; once it lies there any blow sets it off. */
function washIn(api, to, delay) {
  const S = api.state, h = api.spawnShip('mine', { deck: true }); if (!h) return;
  const [lx, lz] = [to[0] - RX, to[1] - RY], d = Math.hypot(lx, lz) || 1, from = [to[0] + lx / d * 6, to[1] + lz / d * 6];
  const o = { h, x: from[0], y: from[1], from, to, st: 'wash', t: -delay, vx: 0, vy: 0, gone: false };
  S.mines.push(o); h.place(o.x, o.y, 0, 0.2); h.deckY = api.WL - 0.1;
  h.ship.root.scale.setScalar(1.6);   // big enough to read at the game's zoom
}
const groundY = (api, x, y) => api.lvAt(x, y) / api.LV;   // the reef's top there, units over the Dawnwake's main deck
function minesTick(api, dt) {
  const S = api.state, pl = api.p(), t = api.world.time;
  for (const o of S.mines) {
    if (o.gone) continue;
    o.t += dt;
    if (o.st === 'wash') {   // in on the swell, up onto the rock
      const k = Math.max(0, Math.min(1, o.t / 2.4)), e = k * k * (3 - 2 * k);
      o.x = o.from[0] + (o.to[0] - o.from[0]) * e; o.y = o.from[1] + (o.to[1] - o.from[1]) * e;
      o.h.deckY = (api.WL - 0.1) * (1 - e) + (groundY(api, ...o.to) + 0.62) * e;
      if (k >= 1) {
        o.st = 'rest';
        const m = o.m = api.spawnArt('ap_powder_keg_runner', 'beetle', 'normal', o.to, { wave: 96 });
        m.x = o.to[0]; m.y = o.to[1]; m.static = true; m.dmg = 0; m.alpha = 0.04; m.noShadow = true; m.name = 'Drifting Mine'; m.prop = 'mine'; m.hunter = false; m.sea = false; m.rimColor = () => null;
        m.maxHp = 1e6; m.hp = m.maxHp; m.affixes = []; m.scale = 0.45; m.awake = false;
        api.splash(o.x, o.y, 0.4);
      }
    } else if (o.st === 'rest') {
      const m = o.m; m.cd = 99; m.x = o.x; m.y = o.y;
      o.h.deckY = groundY(api, o.x, o.y) + 0.62 + Math.sin(t * 2 + o.x) * 0.04;
      if (m.dead) { blow(api, o); continue; }
      if (m.hp < m.maxHp - 0.5) {   // struck: a blow up close shoves it, from range it goes up where it lies
        m.hp = m.maxHp;
        const d = pl ? Math.hypot(o.x - pl.x, o.y - pl.y) : 99;
        if (d < 2.4 && pl) { o.st = 'shove'; o.t = 0; o.vx = (o.x - pl.x) / (d || 1) * 9; o.vy = (o.y - pl.y) / (d || 1) * 9; api.floatText(o.x, o.y, 50, 'SHOVED!', '#ffd070', 14); api.sfx('thud', 0.5); }
        else { o.st = 'fuse'; o.t = 0; api.telegraph(o.x, o.y, 2.6, 0.35, '#ffb040'); }
      }
    } else if (o.st === 'shove') {   // it rolls off across the rock and blows on the first foe it meets
      const m = o.m; m.cd = 99;
      const sx = o.vx * dt, sy = o.vy * dt;
      const ok = api.map.walkable(o.x + sx, o.y + sy) && api.map.deck[api.map.tileIdx(o.x + sx, o.y + sy)] === S.D;
      if (ok) { o.x += sx; o.y += sy; } o.vx *= Math.pow(0.35, dt); o.vy *= Math.pow(0.35, dt);
      m.x = o.x; m.y = o.y; o.h.deckY = groundY(api, o.x, o.y) + 0.62;
      if ((o.rot = (o.rot || 0) + dt * 9)) o.h.place(o.x, o.y, o.rot, 0.2);
      const hit = [...api.live].some((q) => !q.dead && !q.prop && q.targetable !== false && Math.hypot(q.x - o.x, q.y - o.y) < 1.2);
      if (hit || !ok || o.t > 1.1 || Math.hypot(o.vx, o.vy) < 1) blow(api, o);
    } else if (o.st === 'fuse' && o.t >= 0.35) blow(api, o);
    if (!o.gone) o.h.place(o.x, o.y, o.rot || 0, 0.2);
  }
  S.mines = S.mines.filter((o) => !o.gone);
}
function blow(api, o) {
  const S = api.state, pl = api.p();
  o.gone = true; o.h.remove();
  if (o.m && !o.m.dead) { o.m.dead = true; o.m.hp = 0; }
  const [x, y] = [o.x, o.y];
  burst(x, y, 20, 'fire', 30, 6); smoke(x, y, 20, '#2a2420', 12, 20); api.addEffect(new api.Ring(x, y, 0.2, 4, 0.5, '#ffb060', 6));
  api.splash(x, y, 1.2, true); api.sfx('explode', 1); camera.shake(7);
  aoe(api.world, null, x, y, 2.8, api.base.hp * 1.4, 'fire', { team: 'player', knock: 1.6 });   // (aoe's team: whose blow it is)
  if (pl && Math.hypot(pl.x - x, pl.y - y) < 1.8 && !G.cine) aoe(api.world, null, x, y, 1.8, api.base.dmg * 1.5, 'fire', { team: 'enemy', knock: 1 });
}

// ------------------------------------------------------------------ what's drawn over the sprites
/** Each mine lying on the reef: the reach of its blast, faint on the rock. A lit lamp's green call out to the boat it
 *  brought; an arrow at the screen's edge to each boat rowing in off screen. */
function drawReef(api, ctx) {
  if (G.cine) return;
  const sea = api.SEA_LV * api.HS, boats = api.world.seaState.boats.filter((b) => b.reef && b.st === 'row' && b.crew.length);
  ctx.save();
  for (const o of api.state.mines) {
    if (o.gone || o.st === 'wash') continue;
    const x = isoX(o.x, o.y), y = (o.x + o.y) * HH - api.lvAt(o.x, o.y) * api.HS, r = 2.8 * Math.SQRT2;
    ctx.globalAlpha = 0.22 + 0.12 * Math.sin(api.world.time * 4 + o.x); ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.ellipse(x, y, r * 32, r * 16, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  for (const b of boats) {
    if (b.lamp && b.lamp.lit) {
      const a = [isoX(...b.lamp.at), (b.lamp.at[0] + b.lamp.at[1]) * HH - sea - 70], c = [isoX(b.x, b.y), (b.x + b.y) * HH - sea - 20];
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(api.world.time * 6); ctx.strokeStyle = '#5aff8a'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    const [sx, sy] = camera.toScreen(isoX(b.x, b.y), (b.x + b.y) * HH - sea - 30), M = 34;
    if (sx > M && sx < G.W - M && sy > M + 30 && sy < G.H - M - 90) continue;
    const cx = G.W / 2, cy = G.H / 2, dx = sx - cx, dy = sy - cy, k = Math.min((G.W / 2 - M) / Math.abs(dx || 1e-6), (G.H / 2 - M - 50) / Math.abs(dy || 1e-6)), d = G.dpr, r = 15 * d;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate((cx + dx * k) * d, (cy + dy * k) * d); ctx.rotate(Math.atan2(dy, dx)); ctx.globalAlpha = 0.65 + 0.35 * Math.sin(api.world.time * 8);
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.75); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.75); ctx.closePath();
    ctx.fillStyle = b.lamp ? '#5aff8a' : '#ff6a3a'; ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = '#06200c'; ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
