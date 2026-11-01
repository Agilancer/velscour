// #1 GULLWRACK LIGHT (docs/PIRATE_SEAS.md): Gullwrack, in a sea fog. The Lampwarden lightship Gullwrack lies lashed
// to the Dawnwake's port side by a plank; her great lens turns, throwing one green beam round every six seconds. The
// Black Tide's longboats row out of the fog astern, and their boarders are SHROUDED: outside the beam a blow does
// under a third of its damage (and "SHROUDED" says so); where the beam falls on them they show bright, green-rimmed,
// and take 40% more until a moment after it passes. The deck the beam lights is washed green under the sprites. The common
// boarders don't fight: they run forward along her deck for the plank, cross to the lightship and climb her tower's
// ladder for the lantern gallery (the champions stay to fight). The hero holds the plank head. A climber who reaches
// the gallery puts the lamp out: no beam (every foe shrouded), a thicker fog, and another wave (twice; after that a
// lighter chest). The meter is the highest climber's progress; a climber above the screen shows at its top edge. The
// breaker climbs back down to fight; stand at the ladder's foot (1.5 s) to relight the lamp.
// The mid-boss waits on the lightship's deck; Captain Ezra Wick comes on his gun-brig astern and, the first time, says
// one thing to Pip across the water. No one answers. While he lives his crew keep going up the tower.
import { G } from '../../state.js';
import { addLight, effects } from '../../gfx/vfx.js';
import { seaScene } from '../../gfx/seabattle3d.js';
import { PIP } from '../../data/seabattle.js';
import { HW, HH, camera, isoX, isoY } from '../../core/view.js';
import { fadeSails } from './lashed_together.js';

// where the plank lands on the Dawnwake: her port rail forward, so the view ray from the lightship's ladder to the
// camera clears the paddle box, the funnel and the masts (the ladder's foot reads whole)
const ZP = -10.5;
const GAP = 3.4;        // water between the hulls
const HALF = 0.32, NEAR_W = 1.2, REACH = 27;   // where the beam falls: its half angle, its least half width, its length
const LINGER = 2.4, SHROUD = 0.3, CAP_SHROUD = 0.6, LIT = 1.4, CLIMB = 7, DOWN = 2.5;
const WICK_PIP = 'Ask her who put the light out, girl.';

export default {
  id: 'gullwrack_light', number: 1, name: 'Gullwrack Light', light: 'Gullwrack', weather: 'fog', weatherName: 'Sea Fog',
  blurb: 'The Gullwrack lies lashed to port. Hold the plank; strike them in her light.', fogK: 1, dark: 0.12,
  fleet: ['longboat', 'cutter', 'brig', 'lightship'],
  boats: { longboat: 4, cutter: 1 },
  docks: [[12.5, 12], [17, 10.5], [21.5, 9]],   // all astern of the lightship: their boarders cross her whole deck
  waves: [
    { boats: 1, n: [4], champion: 0 },
    { boats: 2, n: [3, 3], champion: 1 },
    { boats: 2, n: [4, 3], champion: 2, unique: 1, mid: true },
    { boats: 2, n: [4, 4], champion: 2 },
    { boats: 3, n: [4, 3, 3], champion: 3, unique: 1 },
  ],
  mid: { id: 'ap_madam_stormglass', line: "Gullwrack's lamp is mine. Come and take it.", from: 'deck',
    at: (api) => api.state.deck.tile(2.3, -5.6) },
  final: { id: 'ap_warden_of_the_rookery', name: 'Captain Ezra Wick', title: 'Lamp-Breaker', line: "Every light you love, I've put out.",
    // the first time he comes: one line to Pip across the water, and her silence (seabattle.js finalCaptain `after`)
    after(api, { face, speaker }) {
      const seen = (G.char.seaSeen ||= {}), pip = api.world.npcs.find((n) => n.name === 'Pip Gannet');
      if (seen['wick:pip'] || !pip) return [];
      return [
        { say: { ...speaker, text: WICK_PIP, focus: face } },
        { do: () => { seen['wick:pip'] = 1; pip.feel('sad', 4, false); } },
        { cam: { on: () => api.faceOf(pip), zoom: 2.3, dur: 1.2, wait: true, push: 0.015 } },
        { wait: 2.0 },
      ];
    } },
  hooks: {
    setup(api) {
      PIP.ladder ??= "On the ladder! They're climbing!";
      const S = api.state, h = S.h = api.spawnShip('lightship', { deck: true }), P = h.info.plank, s = api.sAt(ZP);
      // her plank spot (starboard rail) faces the Dawnwake's port rail across GAP tiles of water, forward
      h.place(api.OX - api.beam(s) - GAP - P[0], api.OY + ZP - P[2], 0);
      S.deck = api.addDeck(h, { levels: [0] });
      // her tower, gallery and lantern stay solid at the game's zoom (an arena deck's rig dissolves above 4.6): she lies
      // beyond the Dawnwake's port rail, so nothing of her can stand between the camera and the deck being fought on
      if (h.RIG) h.RIG.uRigY.value = 99;
      fadeSails(h);
      const [bx, by] = h.worldOf(P[0] - 1.2, 0, P[2]);
      S.head = [api.OX - (api.inner(s) - 0.7), api.OY + ZP];
      S.plank = api.join([S.head[0], S.head[1], 0], [bx, by, h.deckY], { w: 0.85, plank: true });
      S.plank.open();
      const L = h.info.ladder[0];
      S.foot = api.near(...h.worldOf(L[0] + 0.3, 0, L[2]).slice(0, 2), 1.2);
      S.gal = h.worldOf(...h.info.gallery);
      S.route = [[S.head[0] + 0.4, S.head[1]], [bx, by], S.foot];   // the runners' way: the plank head, over, the ladder
      S.lit = true; S.fog = new Set(); S.relT = 0; S.wickT = 9; S.B = null;
      // auto-play: the lamp out, it goes to the ladder's foot and stands there to relight it; a climber on the ladder
      // draws it there too (game/autoplay.js `duty`)
      Object.defineProperty(api.run, 'duty', { configurable: true, get: () => {
        if (!S.lit) return S.mark ? { x: S.foot[0], y: S.foot[1], reach: 1.1, hold: true, label: 'Relighting Gullwrack' } : null;
        return [...S.fog].some((m) => !m.dead && m.runner && m.runner.climb != null) ? { x: S.foot[0], y: S.foot[1], reach: 1.3, label: 'To the ladder' } : null;
      } });
      // the lamp out: the fog closes in round the hero (over everything but the HUD)
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => { drawDark(api, ctx); drawClimbers(api, ctx); } });
    },
    start(api) {
      const S = api.state;
      S.meter = api.meter('Gullwrack Light', { color: '#ff7a40', full: () => {}, note: 'hold the plank' });
    },
    onWave(api, n) {
      // two of them are already over the bow rail out of the fog, by the hero: something to strike at once (shrouded)
      if (n === 0) for (const [x, z] of [[-3.2, -9.2], [2.6, -8.6]]) { const m = api.spawnOnDeck(null, 'normal', api.tileOf(x, z), 0); m.noRun = true; }
    },
    tick(api, dt) {
      const S = api.state, pl = api.p();
      S.B = S.lit ? beamNow(S.h) : null;
      // the light falls: a green wash on the planks the beam crosses (under the sprites; the level's start clears effects)
      if (!S.fx || !effects.includes(S.fx)) S.fx = api.addEffect({ update: () => api.world === G.world, draw: (ctx) => drawBeam(api, ctx) }, 'ground');
      for (const m of api.live) if (!m.dead && !m.entering && !S.fog.has(m) && m.team === 'enemy') enroll(api, m);
      let top = 0, breaker = false, climbing = false;
      for (const m of S.fog) {
        if (m.dead) { if (m.z) m.z = 0; S.fog.delete(m); continue; }
        if (m.entering) continue;
        // the beam: lit where it falls (and a moment after), shrouded everywhere else
        if (m.breaker || (S.B && inBeam(S.B, m.x, m.y))) m.litT = LINGER; else m.litT = Math.max(0, m.litT - dt);
        const on = m.shown = m.litT > 0;
        m.ward = on ? LIT : m.captain ? CAP_SHROUD : SHROUD;
        m.alpha = on ? undefined : 0.5;
        if (on && m.litT > LINGER - 0.05) addLight(m.x, m.y, 1.6, 0.55, 30, '#7dffa0');
        if (m.runner) runner(api, m, dt);
        if (m.breaker) breaker = true;
        else if (m.runner && m.runner.climb != null) { climbing = true; top = Math.max(top, m.runner.climb); }
      }
      // the lamp out: once the breaker is dead, stand at the ladder's foot to relight it
      if (!S.lit) {
        if (!breaker && !S.mark) S.mark = api.mark(S.foot[0], S.foot[1], 'Relight Gullwrack', () => relight(api), '#46ff8a');
        if (!breaker && pl && Math.hypot(pl.x - S.foot[0], pl.y - S.foot[1]) < 1.3) {
          if (!S.relT) api.floatText(S.foot[0], S.foot[1], 70, 'RELIGHTING...', '#9dffc0', 14);
          if ((S.relT += dt) > 1.5) relight(api);
        } else S.relT = 0;
      }
      if (S.meter) {
        S.meter.value = Math.min(0.99, top);
        S.meter.note = !S.lit ? (breaker ? 'DARK · the breaker is on the gallery' : 'DARK · relight it at the ladder') : climbing ? 'on the ladder!' : 'hold the plank';
      }
      // Wick's crew keep going up the tower while he lives
      const cap = api.run.capM, b = api.run.finalBoat;
      const foes = [...api.live].filter((m) => !m.dead).length, running = [...S.fog].filter((m) => !m.dead && m.runner).length;
      if (api.run.phase === 'final' && cap && !cap.dead && !cap.entering && (S.wickT -= dt) <= 0 && running < 3 && foes < 8) {
        S.wickT = 15;
        api.floatText(cap.x, cap.y, 90, 'UP THE TOWER!', '#ffb070', 16);
        for (let i = 0; i < 2; i++) api.later(0.3 + i * 0.45, () => {
          const to = api.near(...api.tileOf(-3.6 + i * 0.8, 12.5 - i * 1.2), 1.5);
          const from = b && !b.dead ? b.h.worldOf(1.6, 0.6, api.rand(-3, 3)) : [api.OX - api.beam(api.sAt(12)) - 0.6, to[1], api.SEA_LV + 4];
          if (!b) api.splash(from[0], from[1], 0.5);
          api.spawnPirate(api.pickCrew().id, 'normal', from, to, 99);
        });
      }
    },
    onBoss(api, m, which) {
      // Wick sends his crew up the tower himself (tick): his own moves are the chain and the guns
      if (which === 'final') m.captain = { ...m.captain, moves: ['hook', 'barrage'] };
    },
    onVictory(api) { if (!api.state.lit) relight(api, true); },
    objective(api) {
      const S = api.state, up = [...S.fog].some((m) => !m.dead && (m.breaker || (m.runner && m.runner.climb != null)));
      if (!S.lit && S.mark) return { x: S.foot[0], y: S.foot[1], reach: 1.0, use: () => relight(api) };
      if (up) return { x: S.foot[0], y: S.foot[1], reach: 1.1 };
      return { x: S.head[0] + 0.6, y: S.head[1], reach: 1.6 };   // hold the plank head
    },
  },
};

/** The beam now: [origin x, origin y, dir x, dir y] in tiles (the model turns +X toward -Z: rotation.y = angle). */
function beamNow(h) {
  const a = h.ship.beamAngle ? h.ship.beamAngle() : 0, o = h.info.lamp.origin;
  const p0 = h.worldOf(o[0], o[1], o[2]), p1 = h.worldOf(o[0] + Math.cos(a), o[1], o[2] - Math.sin(a));
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
  return [p0[0], p0[1], dx / l, dy / l];
}
function inBeam(B, x, y) {
  const ax = x - B[0], ay = y - B[1], along = ax * B[2] + ay * B[3], perp = Math.abs(ay * B[2] - ax * B[3]);
  return along > -0.6 && along < REACH && perp < Math.max(NEAR_W, along * Math.tan(HALF));
}

/** A foe in the fog: shrouded until the beam finds it. The common boarders run for the lamp. */
function enroll(api, m) {
  const S = api.state;
  S.fog.add(m); m.litT = 0; m.shown = false;
  m.rimColor = () => (m.shown ? '#7dffa0' : '#76848a');
  const od = m.onDamaged;
  m.onDamaged = function (src, d) {
    od.call(this, src, d);
    const hero = src && (src.isPlayer || (src.owner && src.owner.isPlayer));
    if (hero && this.runner) this.runner.engT = 2.2;
    if (hero && !this.shown && api.world.time > (this.shT || 0)) { this.shT = api.world.time + 1.4; api.floatText(this.x, this.y, 74, 'SHROUDED', '#aab8be', 12); }
  };
  if (m.rank === 'normal' && !m.captain && !m.noRun) {
    const onLight = api.map.deck[api.map.tileIdx(m.x, m.y)] === S.deck.id;
    m.runner = { i: onLight ? 2 : 0, engT: 0, best: Infinity, stallT: 0, climb: null };
  }
}

/** A runner: for the plank and the ladder, fighting only what stands in its way (or hits it). */
function runner(api, m, dt) {
  const S = api.state, R = m.runner, pl = api.p();
  if (R.climb != null) {   // up the ladder: pinned to it, rising; it doesn't strike. At the top it smashes the lamp,
    // then climbs back down to fight (the lamp stays dark until the hero relights it from the ladder's foot)
    m.static = true; m.cd = 9; m.noShadow = true; m.x = S.foot[0]; m.y = S.foot[1]; m.moving = true;
    if (!m.breaker) {
      R.climb = Math.min(1, R.climb + dt / CLIMB);
      if (R.climb >= 1) { m.breaker = true; R.downT = -1; douse(api); }
    } else if ((R.downT += dt) > 0) R.climb = Math.max(0, 1 - R.downT / DOWN);
    m.z = (S.gal[2] - api.lvAt(S.foot[0], S.foot[1])) * api.HS * R.climb;
    if (m.breaker && R.climb <= 0) { m.breaker = false; m.runner = null; m.static = false; m.cd = 0.4; m.noShadow = false; m.z = 0; }
    return;
  }
  R.engT = Math.max(0, R.engT - dt);
  const d = pl ? Math.hypot(pl.x - m.x, pl.y - m.y) : 99;
  if (d < 2.4 || R.engT > 0) { m.static = false; return; }   // the hero in the way: fight him
  m.static = true;
  const wp = S.route[R.i], left = m.navTo(wp[0], wp[1], dt, m.speed * 1.05);
  // no headway for 5 s: it gives up the run and fights
  if (left < R.best - 0.4) { R.best = left; R.stallT = 0; } else if ((R.stallT += dt) > 5) { m.runner = null; m.static = false; return; }
  if (left < 0.75) {
    R.i++; R.best = Infinity; R.stallT = 0;
    if (R.i >= S.route.length) { R.climb = 0; api.bark('ladder'); api.floatText(m.x, m.y, 80, 'CLIMBING!', '#ff9a6a', 14); }
  }
}

/** A climber at the gallery: the lamp goes out. Thicker fog, every foe shrouded, and another boat. */
function douse(api) {
  const S = api.state;
  if (!S.lit) return;
  S.lit = false; lamp(S.h, false);
  api.world.darkK = 0.34;
  const ph = api.run.phase;
  S.outN = (S.outN || 0) + 1;
  if (S.outN > 2) api.costReward(0.15);   // two extra waves at most: after that the dark costs the chest
  else if (ph === 'waves' || ph === 'mid') api.addWave();
  else {
    const dz = api.v.docks[Math.floor(Math.random() * api.v.docks.length)][0];
    api.launchBoat('longboat', dz, api.crewList(4, 1, 0, api.run.wave), { wave: api.run.wave });
  }
  api.banner('GULLWRACK GOES DARK', S.outN > 2 ? 'The fog closes in · the chest will be lighter' : 'The fog closes in · another boat comes');
  api.sfx('explode', 0.6); api.burst(S.foot[0], S.foot[1], (S.gal[2] - api.lvAt(S.foot[0], S.foot[1])) * api.HS, 'shadow', 40, 5);
}
function relight(api, quiet = false) {
  const S = api.state;
  if (S.lit) return;
  if ([...S.fog].some((m) => !m.dead && m.breaker)) { api.sfx('error'); return; }
  S.lit = true; S.relT = 0; lamp(S.h, true);
  api.world.darkK = api.v.dark;
  if (S.mark) { api.unmark(S.mark); S.mark = null; }
  if (quiet) return;
  api.banner('GULLWRACK BURNS', 'The beam turns again');
  api.sfx('gate', 0.7); api.sparkle(S.foot[0], S.foot[1], 120, '#7dffa0', 40, 1);
}
/** The lantern lit or dark: the beam, the lens and its halo and light. */
function lamp(h, on) {
  h.ship.root.traverse((o) => {
    if (o.name === 'beam' || o.name === 'lens') o.visible = on;
    if (o.isSprite && o.scale.x > 5) o.visible = on;   // the lens's halo (r 5.5; the rail lanterns' are small)
  });
  const sc = seaScene();
  if (sc) for (const l of sc.lightSrc) if (l.o === h.ship.root && l.r >= 12) l.i = on ? 1.2 : 0;
}

/** Where the beam falls on the decks: a soft green wash, tile by tile, brightest along its core. */
function drawBeam(api, ctx) {
  const S = api.state, B = S.B;
  if (!B) return;
  // where it will fall in half a second (it turns -1/6 of a turn a second in tile space), faint: the hero can step
  // into it before the rims switch
  const per = S.h.info.lamp.period || 6, da = -(Math.PI * 2 / per) * 0.5, ca = Math.cos(da), sa = Math.sin(da);
  wedge(api, ctx, [B[0], B[1], B[2] * ca - B[3] * sa, B[2] * sa + B[3] * ca], 0.12, false);
  wedge(api, ctx, B, 0.4, true);
}
/** The beam's footprint: every walkable tile under it, hard-edged and flat, and a bright rim along its two edges. */
function wedge(api, ctx, B, alpha, rim) {
  const map = api.map, seen = new Set();
  const tile = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx < 0 || ty < 0 || tx >= map.w || ty >= map.h ? -1 : ty * map.w + tx; };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#46ff8a'; ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let a = 0.5; a < REACH; a += 0.5) {
    const hw = Math.max(NEAR_W, a * Math.tan(HALF));
    for (let c = -hw; c <= hw; c += 0.5) {
      const t = tile(B[0] + B[2] * a - B[3] * c, B[1] + B[3] * a + B[2] * c);
      if (t < 0 || seen.has(t) || !map.t[t] || map.block[t]) continue;
      seen.add(t);
      const cx = t % map.w + 0.5, cy = Math.floor(t / map.w) + 0.5, px = (cx - cy) * HW, py = (cx + cy) * HH - map.hgt[t] * api.HS;
      ctx.moveTo(px, py - HH); ctx.lineTo(px + HW, py); ctx.lineTo(px, py + HH); ctx.lineTo(px - HW, py); ctx.closePath();
    }
  }
  ctx.fill();
  if (rim) {   // its edges on the decks: a brighter line, so the cone reads as a shape
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#b8ffd0'; ctx.lineWidth = 2;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); let on = false;
      for (let a = 0.5; a < REACH; a += 0.5) {
        const hw = Math.max(NEAR_W, a * Math.tan(HALF)), x = B[0] + B[2] * a - B[3] * hw * sd, y = B[1] + B[3] * a + B[2] * hw * sd, t = tile(x, y);
        if (t < 0 || !map.t[t] || map.block[t]) { on = false; continue; }
        const px = (x - y) * HW, py = (x + y) * HH - map.hgt[t] * api.HS;
        if (on) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        on = true;
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
/** A climber above the top of the screen (the gallery stands ~9 tiles over her deck): a green mark at the top edge
 *  over him, with how far up he is. */
function drawClimbers(api, ctx) {
  if (G.cine) return;
  const d = G.dpr, top = 150;
  for (const m of api.state.fog) {
    const R = m.runner;
    if (m.dead || !R || R.climb == null || m.breaker) continue;
    const [sx, sy] = camera.toScreen(isoX(m.x, m.y), isoY(m.x, m.y) - (m.z || 0) - 40);
    if (sy > top || sx < 0 || sx > G.W) continue;
    const x = Math.max(30, Math.min(G.W - 30, sx)) * d, y = top * d, r = 13 * d, pulse = 0.7 + 0.3 * Math.sin(api.world.time * 9);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y + r * 0.5); ctx.lineTo(x - r * 0.8, y + r * 0.5); ctx.closePath();
    ctx.fillStyle = '#ff7a40'; ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = '#2a0c06'; ctx.stroke();
    ctx.globalAlpha = 1; ctx.font = `700 ${Math.round(12 * d)}px "Alegreya Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const t = `CLIMBING ${Math.round(R.climb * 100)}%`;
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.strokeText(t, x, y + r * 0.8); ctx.fillStyle = '#ffd0b0'; ctx.fillText(t, x, y + r * 0.8);
    ctx.restore();
  }
}
/** The lamp out: the fog thickens round the hero. */
function drawDark(api, ctx) {
  const S = api.state;
  if (S.lit || G.cine) return;
  const d = G.dpr, W = G.W * d, H = G.H * d, r = Math.hypot(W, H) * 0.5;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.52, r * 0.12, W / 2, H * 0.52, r);
  g.addColorStop(0, 'rgba(176,188,194,0)'); g.addColorStop(0.35, 'rgba(176,188,194,0.32)'); g.addColorStop(1, 'rgba(186,196,200,0.8)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
