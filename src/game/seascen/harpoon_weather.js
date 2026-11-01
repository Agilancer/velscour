// #5 HARPOON WEATHER (docs/PIRATE_SEAS.md): Hookstone, in a gale. Harpoon cutters come up out of the rain and lie off
// the port side; each one's ballista throws a harpoon into the Dawnwake's rail (a ring where it will bite) and the line
// comes taut (Pip: "Harpoon line, port rail!"). Every taut line heels her further to port: the whole view lists, and
// everyone on deck slides toward the low rail, the boarders too. Cut a line at the rail (a target with a life bar) and
// she comes back up; leave them and she ships green water over the low rail (the meter: a telegraphed sea sweeps the
// port side and the chest gets lighter). The Air Pirates' gasbag and hauler fly over and let boarders down on ropes
// from above (rings first where they'll land). After the last wave Harpooner Nan Gaff's own cutter comes up on the
// port quarter; under her card she puts a harpoon into the Dawnwake's mainmast and swings over on her own line, and
// her ballista keeps throwing lines while she fights.
import { G } from '../../state.js';
import { camera, elevationAt, HW, HH } from '../../core/view.js';
import { aoe } from '../combat.js';
import { Cine } from '../cinema.js';
import { seaRope } from '../../gfx/seabattle3d.js';
import { spawn, addEffect, Telegraph } from '../../gfx/vfx.js';

const STATIONS = [[-8.5, 17.5], [6.5, 17.5], [-14.5, 16.5], [10.4, 19.5]];   // where her cutters lie off: [ship z, out]
const GAFF_AT = [22.5, 10.5];           // Nan Gaff's cutter, off the port quarter [z, out] (nothing of the Dawnwake before the camera)
const MAST = [0, 4.4, 7.2];             // her harpoon bites the mainmast here [x, z, height] (SEA_COLUMNS)
const DEG = 3, SLIDE = 0.32, HS = 4;    // the heel per taut line (degrees of the view: 3, 6, 9) and the slide (tiles a second)
const AIR_ART = ['ap_gallows_rope_snarer', 'ap_tarred_sail_ripper', 'ap_veil_cloaked_infiltrator', 'ap_saltwind_cutlass_raider', 'ap_storm_eye_lookout'];
let LV = 9.8;

export default {
  id: 'harpoon_weather', number: 5, name: 'Harpoon Weather', light: 'Hookstone', weather: 'storm', weatherName: 'A Gale off Hookstone',
  blurb: 'Harpoon cutters in the rain, and airships over the masts.', dark: 0.14,
  fleet: ['longboat', 'cutter', 'gasbag', 'hauler'],
  boats: { longboat: 1 },               // the harpoon cutters are the scenario's own: these only row boarders over
  // lines: harpoon cutters sent with the wave; air: boarders let down on ropes from an airship
  waves: [
    { boats: 1, n: [3], champion: 0, lines: 0, air: 2 },
    { boats: 1, n: [3], champion: 1, lines: 1, air: 3 },
    { boats: 1, n: [3], champion: 1, unique: 1, mid: true, lines: 1, air: 2 },
    { boats: 1, n: [4], champion: 2, lines: 2, air: 3 },
    { boats: 3, n: [3, 3, 2], champion: 2, unique: 1, lines: 1, air: 4 },
  ],
  mid: { id: 'ap_the_last_boarding_saint', line: 'Heel her over and take her!' },
  final: { id: 'ap_captain_sable_vane', name: 'Harpooner Nan Gaff', title: 'Harpooner of the Black Tide', line: "I never miss a hull. I've had practice.", from: 'deck',
    at: (api) => api.tileOf(-2.5, 11), leapTo: (api) => api.tileOf(-3.0, 10.5) },
  hooks: {
    setup(api) {
      const S = api.state; LV = api.LV;
      S.cutters = []; S.lines = []; S.ships = []; S.rain = Array.from({ length: 140 }, () => [Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
      S.sendT = 0; S.heel = 0; S.sloshT = 0; S.debris = []; S.debrisT = 0;
      api.world.addHazard({ ground: true, update: () => api.world === G.world, draw: (ctx) => { drawLines(api, ctx); drawDebris(api, ctx); } });
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => drawRain(api, ctx) });
    },
    start(api) {
      const S = api.state;
      S.meter = api.meter('Shipping water', { color: '#5ab0e8', full: () => sweep(api), note: 'no lines on her' });
      // the first cutter is already coming up out of the rain: she throws as the arrival looks out to port (after its
      // HOLD THE DECK card), else with the first wave
      const c = S.first = sendCutter(api, { at: STATIONS[0], fireT: 999 });
      let card = false;
      api.scripted(() => { if (!c || c.line || S.started) return false; if (Cine.card && Cine.card.title === 'HOLD THE DECK') card = true; else if (card) { c.fireT = 0.4; return false; } return true; });
    },
    onWave(api, n, w) {
      const S = api.state;
      if (n === 0) { S.started = true; if (S.first && !S.first.line) S.first.fireT = Math.min(S.first.fireT, 0.6); }
      for (let i = 0; i < (w.lines || 0); i++) api.later(1.2 + i * 2.6, () => sendCutter(api));
      if (w.air) api.later(n === 1 ? 3.5 : 5, () => airPass(api, n, w.air), n);
      if (n === api.v.waves.length - 1) api.later(4, () => gaffComes(api));
    },
    onBoss(api, m, which) {
      if (which !== 'final') return;
      const S = api.state, g = S.gaff;
      // Nan Gaff at her cutter's ballista for her card (she was a crew sprite there); held still until her line is said
      const spot = g ? g.h.worldOf(0.2, 0.9, -4.6) : null;
      if (spot) { g.h.dropCrew(g.capRec); m.x = spot[0]; m.y = spot[1]; m.z = spot[2] * HS - elevationAt(spot[0], spot[1]); m.flip = false; }
      m.static = true; S.still = m.entering; S.gaffM = m;
      // when the director leaps her over, she harpoons the mainmast and swings across on her line instead
      api.scripted(() => {
        if (m.dead || S.swung) return false;
        if (!m.entering || m.entering === S.still) return true;
        S.swung = true; gaffSwing(api, m); return false;
      });
    },
    tick(api, dt) {
      const S = api.state, ph = api.run.phase, fight = ph === 'waves' || ph === 'mid' || ph === 'final';
      for (const L of S.lines) if (L.live && L.m && L.m.dead) cutLine(api, L);
      for (const L of S.lines) if (L.m && !L.m.dead) L.m.cd = 99;   // a rope doesn't strike back
      const taut = S.lines.filter((L) => L.live && !L.flying);
      // the heel follows the taut lines (eased, so she leans over and comes back up), a gust's roll on top
      S.heel += (taut.length - S.heel) * Math.min(1, dt * 1.6);
      S.t = (S.t || 0) + dt;
      const deg = S.heel * DEG + (S.heel > 0.2 ? 0.35 * Math.sin(S.t * 1.1) * Math.min(1, S.heel) : 0);
      listView(api, ph === 'victory' ? 0 : -Math.min(9.5, deg));
      debris(api, dt);
      if (S.meter) {
        const n = taut.length;
        if (n >= 2) S.meter.add(dt * (n - 1) * (n - 1) / 34);
        S.meter.note = n ? `${n} harpoon line${n > 1 ? 's' : ''} taut · heeled ${deg.toFixed(0)}°` : 'no lines on her';
      }
      // her cutters ride in, lie off, throw their harpoons, and fall astern when their line is cut
      for (const c of S.cutters) cutterTick(api, c, dt);
      S.cutters = S.cutters.filter((c) => !c.gone);
      for (const a of S.ships) airTick(api, a, dt);
      S.ships = S.ships.filter((a) => !a.gone);
      if (!fight) return;
      rescue(api, dt);
      // she lies over: everyone slides to port, water runs down her deck and slops over the low rail
      if (S.heel > 0.15) {
        slide(api, dt, -SLIDE * S.heel, 0);
        if ((S.sloshT -= dt) <= 0) { S.sloshT = 1.6 / S.heel; const z = (Math.random() - 0.5) * 22, s = api.sAt(z); api.splash(api.OX - api.beam(s) - 0.4, api.OY + z, 0.35 + 0.15 * S.heel); }
        runoff(api, S.heel);
      }
      // keep a line coming while she rides level too long (the waves bring the rest)
      if (ph !== 'victory' && (S.sendT += dt) > (ph === 'final' ? 13 : 18) && S.cutters.filter((c) => !c.gaff && c.st !== 'out').length < (ph === 'final' ? 2 : 1) + (taut.length ? 0 : 1)) sendCutter(api);
    },
    holdFinal(api) { const g = api.state.gaff; return !(g && g.st === 'dock'); },   // her cutter on her station first
    objective(api) {   // the nearest line still taut (auto-play hunts the targets anyway)
      const p = api.p(), live = api.state.lines.filter((L) => L.live && L.m && !L.m.dead);
      if (!p || !live.length) return null;
      const L = live.reduce((a, b) => (Math.hypot(b.m.x - p.x, b.m.y - p.y) < Math.hypot(a.m.x - p.x, a.m.y - p.y) ? b : a));
      return { x: L.m.x, y: L.m.y, reach: 1.3 };
    },
    onVictory(api) {
      const S = api.state;
      for (const L of S.lines) if (L.live) { if (L.m && !L.m.dead) { L.m.hp = 0; L.m.dead = true; } cutLine(api, L, true); }
      listView(api, 0);
    },
  },
};

// ------------------------------------------------------------------ the harpoon cutters and their lines
/** A harpoon cutter comes up from astern to a free station off the port side; her ballista crewed. */
function sendCutter(api, o = {}) {
  const S = api.state;
  S.sendT = 0;
  const busy = new Set(S.cutters.filter((c) => c.st !== 'out').map((c) => c.at));
  const free = o.at ? [o.at] : STATIONS.filter((q) => !busy.has(q));
  if (!free.length) return null;
  const at = free[Math.floor(Math.random() * free.length)], h = api.spawnShip('cutter');
  if (!h) return null;
  const dock = { x: api.OX - at[1], y: api.OY + at[0] }, from = { x: dock.x - 8, y: dock.y + 46 };
  for (let i = 0; i < 3; i++) { const sp = (h.info.crew || [[0, 0, 0]])[i % (h.info.crew || [1]).length]; h.addCrew({ art: AIR_ART[(i + S.cutters.length) % AIR_ART.length], x: sp[0], y: sp[1], z: sp[2], h: 55, ph: Math.random() * 6, bob: true }); }
  const c = { h, at, dock, from, st: 'in', t: 0, dur: o.dur ?? 6, heading: 0, gaff: !!o.gaff, fireT: o.fireT ?? 0.6, line: null };
  h.place(from.x, from.y, 0, 1.2); h.setAlpha(0);
  S.cutters.push(c);
  return c;
}
function cutterTick(api, c, dt) {
  const h = c.h; c.t += dt;
  if (c.st === 'in') {
    const k = 1 - (1 - Math.min(1, c.t / c.dur)) ** 3, nx = c.from.x + (c.dock.x - c.from.x) * k, ny = c.from.y + (c.dock.y - c.from.y) * k;
    c.heading += (Math.max(-0.5, Math.min(0.5, -Math.atan2(nx - h.x, -(ny - h.y)))) * (1 - k) - c.heading) * Math.min(1, dt * 3);
    h.place(nx, ny, c.heading, 0.6 + 0.9 * (1 - k)); h.setAlpha(Math.min(1, k / 0.3));
    if (k >= 1) { c.st = 'dock'; c.t = 0; }
  } else if (c.st === 'dock') {
    c.heading *= Math.max(0, 1 - dt * 2); h.place(c.dock.x, c.dock.y, c.heading, 0.5);
    // her ballista throws (the first time, and again if the line was cut and she still lies here: Gaff's does)
    if (!c.line && (c.fireT -= dt) <= 0 && api.run.phase !== 'victory') {
      if (c.gaff ? !!api.state.gaffM && !api.state.gaffM.dead && api.state.gaffM.targetable : true) throwLine(api, c);
      c.fireT = 9;
    }
    if (!c.gaff && c.cut && (c.hold = (c.hold || 0) + dt) > 1.5) { c.st = 'out'; c.t = 0; }
  } else {
    const k = Math.min(1, c.t / 6), e = k * k;
    c.heading += (0.35 - c.heading) * Math.min(1, dt * 1.2);
    h.place(c.dock.x - 9 * e, c.dock.y + 34 * e, c.heading, 0.4); h.setAlpha(1 - Math.max(0, (k - 0.55) / 0.45));
    if (k >= 1) { c.gone = true; h.remove(); }
  }
}
/** Her ballista throws: a ring where the harpoon will bite the rail, the shot, the bite, the line comes taut. */
function throwLine(api, c) {
  const S = api.state, z = c.gaff ? 14.6 : c.at[0], s = api.sAt(z);
  const L = { c, z, live: true, flying: true, fly: 0, whip: 0, m: null,
    rail: [api.OX - api.beam(s) + 0.15, api.OY + z, (api.sheer(s) + 0.1) * LV], land: [api.OX - (api.inner(s) - 1.1), api.OY + z],
    end: () => c.h.worldOf(0, 1.3, -5.6) };
  c.line = L; S.lines.push(L);
  api.telegraph(L.land[0] - 0.4, L.land[1], 1.0, 0.9, '#7ad0ff');
  api.floatText(L.end()[0], L.end()[1], L.end()[2] * HS + 26, 'HARPOON!', '#bfe6ff', 15);
  api.later(0.45, () => {
    api.sfx('swing', 0.8);
    api.scripted((dt) => {
      L.fly = Math.min(1, L.fly + dt / 0.4);
      if (L.fly < 1) return true;
      L.flying = false; api.sfx('thud', 1); camera.shake(5);
      api.sparkle(L.rail[0], L.rail[1], L.rail[2] * HS, '#ffe0a0', 10, 0.3);
      L.m = lineTarget(api, L);
      api.bark('harpoon');
      return false;
    });
  });
}
/** The line's bite as a foe: a harpoon in the rail with a life bar, its rope running off to her bow. */
function lineTarget(api, L) {
  const m = api.spawnArt('ap_salt_rust_boarding_shield', 'golem', 'normal', L.land, { wave: 95 });
  m.x = L.land[0]; m.y = L.land[1]; m.static = true; m.dmg = 0; m.cd = 99; m.noShadow = true; m.affixes = []; m.sprite = null; m.goreType = 'rock';
  m.name = 'Harpoon Line'; m.maxHp = api.base.hp * 2.4; m.hp = m.maxHp; m.xp = (m.xp || 0) * 2;
  m.draw = (ctx) => drawHarpoon(ctx, m, L);
  return m;
}
/** Cut: the line parts with a crack and whips back to her bow; she comes back up a little. */
function cutLine(api, L, quiet = false) {
  L.live = false; L.m = null; L.c.cut = true; if (L.c.gaff) L.c.line = null;   // Nan Gaff's ballista reloads
  if (quiet) { L.whip = 1; return; }
  api.sfx('swing', 1); api.sfx('thud', 0.6); camera.shake(4);
  api.burst(L.rail[0], L.rail[1], L.rail[2] * HS, 'phys', 16, 4);
  api.floatText(L.land[0], L.land[1], 70, 'LINE CUT', '#bfe6ff', 15);
  api.scripted((dt) => { L.whip = Math.min(1, L.whip + dt / 0.5); if (L.whip < 1) return true; const e = L.end(); api.splash(e[0] + 2, e[1], 0.5); return false; });
}

// ------------------------------------------------------------------ the deck lies over
/** She ships green water over the low rail: a sea sweeps the port side (a lane, telegraphed), and the chest is lighter. */
function sweep(api) {
  const S = api.state;
  api.costReward(0.15);
  api.banner('SHE SHIPS A SEA', 'Green water over the low rail: the chest will be lighter');
  const z0 = -11 + Math.random() * 4, len = 20;
  for (const off of [1.4, 3.2]) addEffect(new Telegraph({ kind: 'line', x: api.OX - api.inner(api.sAt(0)) + off, y: api.OY + z0, ang: Math.PI / 2, len, w: 1.9, dur: 1.4, color: '#7ad0ff' }), 'ground');
  api.later(1.4, () => {
    camera.shake(10); api.sfx('explode', 0.6);
    for (let z = z0; z < z0 + len; z += 2.2) { api.splash(api.OX - 7, api.OY + z, 1.0, z % 4 < 2.2); api.sparkle(api.OX - 4.5, api.OY + z, 14, '#d8f4ff', 6, 1.2); }
    // everyone in the low third of her deck, both sides (aoe's team is the striker's: 'enemy' strikes the hero's side)
    const w = api.world, ex = new Set(), inBand = (m) => m.y > api.OY + z0 - 0.5 && m.y < api.OY + z0 + len && m.x < api.OX - api.inner(api.sAt(m.y - api.OY)) + 4.6;
    if (!G.cine) for (const m of [...w.creatures]) if (!m.dead && inBand(m)) aoe(w, null, m.x, m.y, 0.5, api.base.dmg * 1.2, 'cold', { team: m.team === 'enemy' ? 'player' : 'enemy', knock: 1.4, exclude: ex });
  });
  S.sweeps = (S.sweeps || 0) + 1;
}
/** Spray running down her deck toward the low rail, more of it the further she lies over. */
function runoff(api, heel) {
  const p = api.p(); if (!p || Math.random() > 0.35 * heel) return;
  for (let i = 0; i < Math.ceil(heel); i++) {
    const x = p.x + (Math.random() - 0.3) * 9, y = p.y + (Math.random() - 0.5) * 9;
    if (!api.walk(x, y)) continue;
    spawn({ type: 'glow', x, y, z: 2, vx: -2.2 - heel * 0.6, vy: (Math.random() - 0.5) * 0.4, life: 0.7, size: 1.6, size1: 0.6, color: '#cfe8ff', add: true });
  }
}

/** Loose barrels, crates and buckets on her deck: they break loose while she lies over, slide and roll downhill to the
 *  low rail and go over it (a splash); she comes back up and they fetch up where they are, then are cleared away. */
function debris(api, dt) {
  const S = api.state, p = api.p(), h = S.heel, L = S.debris;
  if (p && h > 0.5 && L.length < 4 + 3 * Math.min(3, h) && (S.debrisT -= dt) <= 0) {
    S.debrisT = 1.1 / h;
    const x = api.OX + Math.random() * 4.5, y = p.y + (Math.random() - 0.5) * 10;   // up on her high (starboard) side, near the hero
    if (api.walk(x, y)) L.push({ x, y, v: 0, rot: Math.random() * 6, kind: ['barrel', 'barrel', 'crate', 'bucket'][Math.floor(Math.random() * 4)], t: 0, still: 0 });
  }
  for (const d of L) {
    d.t += dt;
    if (h < 0.3) { d.v *= Math.max(0, 1 - dt * 3); d.still += dt; } else d.v = Math.min(1.2 + h * 1.2, d.v + dt * (0.8 + h * 0.9));
    const nx = d.x - d.v * dt;
    if (d.v > 0.01) {
      if (api.walk(nx, d.y) && api.lvAt(nx, d.y) === api.lvAt(d.x, d.y)) { d.x = nx; d.rot += d.v * dt * (d.kind === 'crate' ? 1.2 : 3.5); }
      else if (nx < api.OX - api.inner(api.sAt(d.y - api.OY)) + 0.9 && d.v > 0.6) { d.gone = true; api.splash(api.OX - api.beam(api.sAt(d.y - api.OY)) - 0.6, d.y, 0.45); api.sfx('thud', 0.3); }   // over the low rail
      else { d.v = 0.3; const ny = d.y + (d.y > api.OY ? 0.6 : -0.6) * dt * 3; if (api.walk(d.x, ny)) d.y = ny; }   // fetched up on a mast or a hatch: it works round it
    }
    if (d.still > 4) d.gone = true;
  }
  S.debris = L.filter((d) => !d.gone);
}
function drawDebris(api, ctx) {
  for (const d of api.state.debris) {
    const [x, y] = wpt([d.x, d.y, api.lvAt(d.x, d.y)]), a = d.still > 3 ? 4 - d.still : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 2, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (d.kind === 'crate') {
      ctx.translate(0, -8); ctx.rotate(Math.sin(d.rot) * 0.25);
      ctx.fillStyle = '#7a5a34'; ctx.fillRect(-9, -8, 18, 16); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.strokeRect(-9, -8, 18, 16);
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, 8); ctx.moveTo(9, -8); ctx.lineTo(-9, 8); ctx.stroke();
    } else {
      const big = d.kind === 'barrel', w = big ? 10 : 7, hh = big ? 8 : 6;
      ctx.translate(0, -hh - 1); ctx.rotate(-0.46);   // lying on its side, rolling to port
      ctx.fillStyle = big ? '#6a4424' : '#8a8a80'; ctx.beginPath(); ctx.ellipse(0, 0, w, hh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = big ? '#3a3430' : '#4a4a44'; ctx.lineWidth = 2;
      for (const o of [-0.5, 0.5]) { const s = Math.sin(d.rot + o * 3); ctx.beginPath(); ctx.moveTo(-w * 0.9, s * hh * 0.7); ctx.lineTo(w * 0.9, s * hh * 0.7); ctx.stroke(); }
      ctx.fillStyle = big ? '#8a5a30' : '#a8a89c'; ctx.beginPath(); ctx.ellipse(w * 0.85, 0, 2.5, hh * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the Air Pirates over the masts
/** An airship comes over from the starboard quarter, hovers over her deck and lets `n` boarders down on ropes. */
function airPass(api, wave, n) {
  const S = api.state, kind = S.ships.length % 2 || wave % 2 ? 'hauler' : 'gasbag', h = api.spawnShip(kind, { air: 6.8 });
  if (!h) return;
  const p = api.p(), dz = p ? Math.max(-9, Math.min(10, p.y - api.OY)) : 0, hover = [api.OX - 2.5, api.OY + dz - 2];
  const a = { h, st: 'in', t: 0, from: [api.OX + 34, api.OY + 30], hover, to: [api.OX - 44, api.OY - 26], n, wave, drops: [], ropes: [] };
  h.place(...a.from, 0, 1); h.setAlpha(0);
  S.ships.push(a);
  // where they'll land: rings now, the ropes when she's over them
  for (let i = 0; i < n; i++) a.drops.push(api.near(hover[0] + 1.5 + (Math.random() - 0.5) * 3, hover[1] + 2 + (i - (n - 1) / 2) * 1.6, 1.2));
  for (let i = 0; i < n; i++) api.later(4.2 + i * 0.45, () => dropBoarder(api, a, i), wave);
}
function airTick(api, a, dt) {
  const h = a.h; a.t += dt;
  const go = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
  const head = (A, B) => Math.atan2(-(B[0] - A[0]), -(B[1] - A[1]));
  if (a.st === 'in') {
    const k = Math.min(1, a.t / 4.2), e = 1 - (1 - k) ** 2;
    h.place(...go(a.from, a.hover, e), head(a.from, a.hover), 1); h.setAlpha(Math.min(1, k * 3));
    if (k >= 1) { a.st = 'hover'; a.t = 0; for (const d of a.drops) api.telegraph(d[0], d[1], 0.95, 1.6, '#ff7040'); }
  } else if (a.st === 'hover') {
    h.place(...a.hover, h.heading, 0.3);
    if (a.t > 2.6 + a.n * 0.45 && a.drops.every((d) => d.done)) { a.st = 'out'; a.t = 0; a.ropes = []; }
  } else {
    const k = Math.min(1, a.t / 6), e = k * k;
    h.place(...go(a.hover, a.to, e), head(a.hover, a.to), 1); h.setAlpha(1 - Math.max(0, (k - 0.6) / 0.4));
    if (k >= 1) { a.gone = true; h.remove(); }
  }
}
/** One boarder down a rope from the airship's belly to the deck (if hurried, she's already over them). */
function dropBoarder(api, a, i) {
  if (a.gone) return;
  if (a.st === 'in') { a.t = 4.2; airTick(api, a, 0); }
  const to = a.drops[i]; to.done = true;
  const top = () => a.h.worldOf((i % 2 ? 0.6 : -0.6), -0.4, (i - 1) * 1.2);
  a.ropes.push({ top, to: [to[0], to[1], api.lvAt(to[0], to[1])] });   // drawn with the harpoon lines (drawLines)
  const from = top(), m = api.spawnPirate(AIR_ART[(i + a.wave) % AIR_ART.length], i === 0 && a.wave > 2 ? 'champion' : 'normal', from, to, a.wave);
  const lvTo = api.lvAt(to[0], to[1]);
  let k = 0;
  m.entering = (dt) => {   // down the rope hand under hand, faster at the bottom
    k = Math.min(1, k + dt * (m.rush ? 3 : 0.95)); m.animT += dt;
    const e = k * k, f = top();
    m.x = f[0] + (to[0] - f[0]) * e; m.y = f[1] + (to[1] - f[1]) * e;
    m.z = (f[2] * (1 - e) + lvTo * e) * HS - (m.artH || 55) * 0.8 * (1 - e) - elevationAt(m.x, m.y);
    if (k < 1) return;
    m.boarding = m.rush = false; m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.moving = false; m.cd = 0.4;
    api.smoke(m.x, m.y, 4, '#6a5a4a', 3, 9); api.sfx('thud', 0.4);
  };
}

// ------------------------------------------------------------------ Harpooner Nan Gaff
/** Her own cutter comes up on the port quarter after the last wave starts; she stands at its ballista. */
function gaffComes(api) {
  const S = api.state; if (S.gaff) return;
  const c = S.gaff = sendCutter(api, { at: GAFF_AT, gaff: true, dur: 7, fireT: 999 });
  if (!c) return;
  c.capRec = c.h.addCrew({ art: 'ap_captain_sable_vane', x: 0.2, y: 0.9, z: -4.6, h: 88, ph: 0, bob: false });
}
/** Under her card she puts a harpoon into the mainmast, then swings across on her own line. */
function gaffSwing(api, m) {
  const S = api.state, g = S.gaff, from = g ? g.h.worldOf(0, 1.3, -5.6) : [m.x, m.y, 4];
  const mast = [api.OX + MAST[0], api.OY + MAST[1], MAST[2] * LV], to = api.run.capTo || api.near(api.OX - 3, api.OY + 10.5);
  const z0 = m.z;
  const r = seaRope(from, from, 0x2a2420); r.sag = 0.05;
  let t = 0;
  api.sfx('swing', 1); api.floatText(m.x, m.y, 100, 'HARPOON!', '#bfe6ff', 16);
  m.entering = (dt) => {   // the harpoon flies to the mast and bites; she takes the line
    t += dt; m.z = z0; m.animT += dt;
    const k = Math.min(1, t / 0.45);
    r.set(from, [from[0] + (mast[0] - from[0]) * k, from[1] + (mast[1] - from[1]) * k, from[2] + (mast[2] - from[2]) * k]);
    if (k < 1) return;
    api.sfx('thud', 1); api.sparkle(mast[0], mast[1], mast[2] * HS, '#ffe0a0', 10, 0.3); camera.shake(4);
    api.swingAcross(m, () => mast, to, { dur: 1.6, onLand: (q) => { q.static = false; r.remove(); if (S.gaff) S.gaff.fireT = 4; } });
  };
}

// ------------------------------------------------------------------ the deck heels (the same shape in #3)
/** The whole view lists by `deg` (the game canvas; the HUD stays level), scaled to keep its corners covered. The
 *  pointer is mapped back through the tilt (aimTilt), so clicks land where they look. */
function listView(api, deg) {
  const S = api.state, c = G.canvas; if (!c) return;
  if (Math.abs((S.viewDeg ?? 0) - deg) < 0.02) return;
  S.viewDeg = deg;
  const r = Math.abs(deg) * Math.PI / 180, a = Math.max(G.W / G.H, G.H / G.W) || 1.8, k = Math.cos(r) + a * Math.sin(r);
  S.viewK = k;
  c.style.transform = Math.abs(deg) > 0.01 ? `rotate(${deg.toFixed(2)}deg) scale(${k.toFixed(3)})` : '';
  if (!S.viewWatch && deg) {   // put it back when the hero leaves the battle (any way at all)
    S.viewWatch = true; const w = api.world, aim = aimTilt(S, c);
    const f = () => { if (G.world !== w || !w.seaRun || w.seaRun.completed) { c.style.transform = ''; S.viewWatch = false; S.viewDeg = 0; aim(); return; } requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
}
/** While the canvas is tilted, each pointer event on it is caught first (window, capture) and sent on with its point
 *  turned back through the tilt about the canvas's centre (core/input.js reads clientX/Y as canvas pixels). Returns the
 *  remover. */
function aimTilt(S, c) {
  const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
  const on = (e) => {
    if (e.target !== c || e.__untilted || !S.viewDeg) return;
    const th = -S.viewDeg * Math.PI / 180, k = S.viewK || 1, cx = G.W / 2, cy = G.H / 2, dx = (e.clientX - cx) / k, dy = (e.clientY - cy) / k;
    const x = cx + dx * Math.cos(th) - dy * Math.sin(th), y = cy + dx * Math.sin(th) + dy * Math.cos(th);
    e.stopImmediatePropagation();
    const q = new PointerEvent(e.type, { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: e.screenX, screenY: e.screenY, pointerId: e.pointerId, pointerType: e.pointerType,
      isPrimary: e.isPrimary, button: e.button, buttons: e.buttons, pressure: e.pressure, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey });
    q.__untilted = true;
    if (!c.dispatchEvent(q)) e.preventDefault();
  };
  for (const t of types) window.addEventListener(t, on, true);
  return () => { for (const t of types) window.removeEventListener(t, on, true); };
}
/** Everyone on her decks slides downhill (tiles a second): the hero, the boarders, the pets; not the ropes or the still. */
function slide(api, dt, vx, vy) {
  const seen = new Set(), p = api.p();
  for (const m of [p, ...api.world.creatures]) {
    if (!m || seen.has(m) || m.dead || m.entering || m.static) continue;
    seen.add(m);
    // never over an edge onto another level (a pocket nobody could path out of)
    const lv = api.lvAt(m.x, m.y), x = m.x, y = m.y;
    api.map.move(m, vx * dt, vy * dt);
    if (api.lvAt(m.x, m.y) !== lv) { m.x = x; m.y = y; }
  }
}

/** A boarder who landed (or was knocked) into a pocket of deck nobody can path out of is put back on her main deck. */
function rescue(api, dt) {
  const S = api.state, p = api.p();
  if (!p || (S.rescueT = (S.rescueT ?? 4) - dt) > 0) return;
  S.rescueT = 4;
  for (const m of api.live) {
    if (m.dead || m.entering || m.static || m.captain || m.targetable === false || Math.hypot(m.x - p.x, m.y - p.y) < 2) continue;
    if (api.map.findPath(m.x, m.y, p.x, p.y, 6000)) continue;
    const to = api.near(api.OX - 2.5, api.OY + Math.max(-9, Math.min(9, m.y - api.OY)), 2);
    api.smoke(m.x, m.y, 4, '#6a5a4a', 3, 8); m.x = to[0]; m.y = to[1]; m.nav = null; m.path = null;
  }
}

// ------------------------------------------------------------------ drawing
const wpt = (q) => [(q[0] - q[1]) * HW, (q[0] + q[1]) * HH - q[2] * HS];
/** The harpoon lines (under the sprites): tarred rope, straight when taut, a flicker of strain; flying and parting. */
function drawLines(api, ctx) {
  const S = api.state, t = api.world.time;
  ctx.save(); ctx.lineCap = 'round';
  for (const L of S.lines) {
    if (!L.live && (L.whip >= 1 || !L.whip)) continue;
    const a = L.end();
    let b = L.rail, sag = 0;
    if (L.flying) { const k = L.fly; b = [a[0] + (L.rail[0] - a[0]) * k, a[1] + (L.rail[1] - a[1]) * k, a[2] + (L.rail[2] - a[2]) * k + Math.sin(Math.PI * k) * 12]; }
    else if (!L.live) { const k = L.whip; b = [L.rail[0] + (a[0] + 1.5 - L.rail[0]) * k, L.rail[1] + (a[1] - L.rail[1]) * k, L.rail[2] + (api.SEA_LV - L.rail[2]) * k]; sag = 0.6 * k; }
    const A = wpt(a), pts = [];
    for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(wpt([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - Math.sin(Math.PI * k) * sag * LV])); }
    const shiver = L.live && !L.flying ? Math.sin(t * 40 + L.z) * 0.8 : 0;
    const path = () => { ctx.beginPath(); ctx.moveTo(A[0], A[1]); pts.forEach((q, i) => ctx.lineTo(q[0], q[1] + (i % 2 ? shiver : -shiver))); };
    path(); ctx.strokeStyle = 'rgba(8,10,12,0.9)'; ctx.lineWidth = 7; ctx.stroke();
    path(); ctx.strokeStyle = '#8a6e4c'; ctx.lineWidth = 4; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(240,222,180,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
    if (L.flying) { const q = pts[pts.length - 1]; ctx.fillStyle = '#dfe8ef'; ctx.beginPath(); ctx.arc(q[0], q[1], 3.5, 0, Math.PI * 2); ctx.fill(); }
  }
  // the airships' boarding ropes, straight down from the belly to the deck
  for (const a of S.ships) for (const r of a.ropes) {
    const A = wpt(r.top()), B = wpt(r.to), sw = Math.sin(t * 2 + r.to[1]) * 3;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo((A[0] + B[0]) / 2 + sw, (A[1] + B[1]) / 2, B[0], B[1]);
    ctx.strokeStyle = 'rgba(8,10,12,0.85)'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#8a6e4c'; ctx.lineWidth = 2.6; ctx.stroke();
  }
  ctx.restore();
}
/** The harpoon in her rail: an iron shaft and barbs, the rope's eye, a strain pulse, the life bar over it. */
function drawHarpoon(ctx, m, L) {
  const [x, y] = wpt(L.rail), A = wpt(L.end()), t = m.animT || 0, d = Math.hypot(A[0] - x, A[1] - y) || 1, ux = (A[0] - x) / d, uy = (A[1] - y) / d;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 7);
  ctx.strokeStyle = '#7ad0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 4, 24, 12, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineCap = 'round';
  const tx = x - ux * 13, ty = y - uy * 13 + 9, sx = x + ux * 22, sy = y + uy * 22;   // the head buried in the rail, the shaft back toward her
  ctx.strokeStyle = '#101214'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.strokeStyle = '#c8d4dc'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx, sy); ctx.stroke();
  for (const sd of [-1, 1]) { ctx.strokeStyle = '#101214'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x - ux * 3, y - uy * 3 + 2); ctx.lineTo(x + ux * 7 - uy * sd * 11, y + uy * 7 + ux * sd * 11); ctx.stroke(); }
  ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
  if (m.flash > 0) { ctx.globalAlpha = Math.min(1, m.flash * 6); ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  m.screenTop = y - 30;
  m.drawOverhead(ctx, x, y - 26, 40);
}
/** The gale's rain: slanting streaks over everything (screen space), thinner in a cut scene. */
function drawRain(api, ctx) {
  const S = api.state, t = api.world.time, d = G.dpr, W = G.W * d, H = G.H * d;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = 'rgba(190,210,230,0.32)'; ctx.lineWidth = 1 * d; ctx.beginPath();
  for (const [u, v, s] of S.rain) {
    const x = ((u * W + t * 260 * s * d) % (W + 80 * d)) - 40 * d, y = ((v * H + t * 900 * s * d) % (H + 60 * d)) - 30 * d;
    ctx.moveTo(x, y); ctx.lineTo(x - 7 * s * d, y - 26 * s * d);
  }
  ctx.stroke(); ctx.restore();
}
