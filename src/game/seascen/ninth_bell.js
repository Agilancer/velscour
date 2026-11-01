// #12 THE NINTH BELL, the finale (docs/PIRATE_SEAS.md): offered only after eight bells (game/seabattle.js
// pickSeaVariant; the skull's "sea ninth" and HAIL VELSCOUR reach it at any time). Night off Gullwrack: The Lightless
// steams for Gullwrack to snuff its great light (the lightship off the starboard bow, its light dimming as she closes up
// the port side). Brother Tolland says his one sentence and goes down in his diving bell from its davit on the port
// quarter, and the Dawnwake holds over him: the bell meter fills only while there are foes on her deck (hurry() brings
// the next boat the moment it's clear) and stops while one of them stands at the davit. Every size comes: longboats and
// cutters, a gun-brig's broadsides, a grapple steamer, and The Anvil's Kestrels (strafing runs down telegraphed lanes)
// and Thunderhawks (torpedoes from starboard) from over the horizon. When the bell rings, green light rises from under
// the sea and The Lightless's furnaces gutter; Pip calls it first, Brask says nothing and looks at her; and the Hollow
// Commodore leaps across from his ship as the last boss. It is a sign, not a return.
import { seaScene } from '../../gfx/seabattle3d.js';
import { spawn, addLight } from '../../gfx/vfx.js';
import { camera, isoX, isoY } from '../../core/view.js';
import { aoe } from '../combat.js';
import { G } from '../../state.js';

const HOLD = 90;   // seconds of fighting over the bell
const CMDR = 'ap_the_hollow_commodore';
/** The hold-out's boarding waves: longboats and cutters, more of them as it goes on (more are added until the bell rings). */
const wave = (i) => { const b = 1 + (i % 3 === 2 ? 1 : 0) + (i > 6 ? 1 : 0); return { boats: b, n: Array.from({ length: b }, (_, k) => 3 + ((i + k) % 3)), champion: Math.min(3, 1 + (i >> 2)), unique: i % 4 === 3 ? 1 : 0 }; };
const R = (a, b) => a + Math.random() * (b - a);

export default {
  id: 'ninth_bell', number: 12, name: 'The Ninth Bell', light: 'Gullwrack', weather: 'night', weatherName: 'Night off Gullwrack', finale: true,
  bellCard: ['THE NINTH BELL', 'Something heard it'],   // the victory's bell card (and Brask is silent: the director's finale rule)
  blurb: 'The Lightless steams for Gullwrack. Hold the Dawnwake over the diving bell.', dark: 0.22,
  fleet: ['longboat', 'cutter', 'brig', 'grappler', 'kestrel', 'thunderhawk', 'torpedo', 'dreadnought', 'lightship'],
  art: [CMDR],
  boats: { longboat: 3, cutter: 2 },
  // wave 0 is Tolland going down (no boats); the rest come until the bell rings (tick adds more)
  waves: [{ boats: 0, n: [], label: 'Brother Tolland goes down' }, ...Array.from({ length: 9 }, (_, i) => wave(i))],
  final: { id: CMDR, name: 'The Hollow Commodore', title: 'Master of The Lightless', line: "My ship has no lamps. It doesn't need them.",
    from: 'deck', at: (api) => api.tileOf(-3.0, 1.0) },   // (he comes in the bell's cut scene, from his own ship: ring())
  hooks: {
    setup(api) {
      const S = api.state, sc = seaScene();
      S.dw = sc.dawn.ship.info; S.bell = S.dw.bell; S.bellY = S.bell.position.y; S.bellAt = api.tileOf(S.dw.divingBell[0], S.dw.divingBell[2]);
      // the davit's foot on her quarterdeck: the walkable tile nearest it (where a boarder hacks at the bell's falls)
      const [fx, fy] = api.tileOf(S.dw.davit[0], S.dw.davit[2]);
      S.davit = [fx + 1, fy];
      for (let d = 0, best = 1e9; d < 9; d++) for (const [ox, oy] of [[1, 0], [1.5, 0.5], [1.5, -0.5], [2, 0], [2, 1], [2, -1], [2.5, 0], [3, 0], [3, 1]].slice(d, d + 1)) {
        const q = [Math.floor(fx + ox) + 0.5, Math.floor(fy + oy) + 0.5]; if (api.walk(q[0], q[1]) && Math.hypot(q[0] - fx, q[1] - fy) < best) { best = Math.hypot(q[0] - fx, q[1] - fy); S.davit = q; }
      }
      sc.sea.U.wCurrent.value.set(0.04, 0.12);   // she lies to over the bell: the water no longer streams past her
      S.sea = sc.sea; S.deep0 = sc.sea.U.wDeep.value.clone(); S.shallow0 = sc.sea.U.wShallow.value.clone();
      // Gullwrack's great light off the starboard bow; The Lightless far astern on the port quarter, closing
      S.light = api.spawnShip('lightship'); S.light.place(api.OX + 26, api.OY - 30, 0.35, 0.05);
      S.dn = api.spawnShip('dreadnought'); S.dnFrom = [api.OX - 44, api.OY + 62]; S.dnTo = [api.OX - 31, api.OY - 4];
      S.dn.place(...S.dnFrom, 0, 0.9);
      S.k = 0; S.t = 0; S.ev = {}; S.raidT = 16; S.tollT = 4; S.volleyT = 6; S.torps = [];
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => runLines(api, ctx) });
    },
    onWave(api, n) {
      const S = api.state;
      if (n === 0) return goDown(api);
      // keep them coming until the bell rings
      if (!S.rung && n >= api.v.waves.length - 3) api.v.waves.push(wave(api.v.waves.length - 1));
    },
    onBoss(api, m) { m.captain = { ...m.captain }; },
    tick(api, dt) {
      const S = api.state, run = api.run;
      S.t += dt;
      lights(api);
      overboard(api, dt);
      // The Lightless closes up the port side as the bell is rung; Gullwrack's light dims as she comes
      if (!S.rung) {
        const k = S.k, e = k * k * (3 - 2 * k);
        S.dn.place(S.dnFrom[0] + (S.dnTo[0] - S.dnFrom[0]) * e, S.dnFrom[1] + (S.dnTo[1] - S.dnFrom[1]) * e, 0, 0.9 - 0.6 * k);
      }
      dimLight(api, S.rung ? S.lightK ?? 0.2 : 1 - 0.8 * S.k);
      if (!S.meter || S.rung || run.phase !== 'waves') { S.contested = false; return; }
      // the bell: it fills while her deck is being fought for, and stops while a boarder stands at the davit
      const foes = [...api.live].filter((m) => !m.dead && !m.entering && m.targetable !== false && api.map.deck[api.map.tileIdx(m.x, m.y)] === 1);
      const atDavit = foes.filter((m) => Math.hypot(m.x - S.davit[0], m.y - S.davit[1]) < 1.3);
      S.contested = atDavit.length > 0 || !!(S.raider && !S.raider.dead && (S.raider.static || S.raider.entering));
      if (atDavit.length) { S.meter.note = 'A boarder at the davit! The bell has stopped'; S.meter.color = '#ff6a4a'; }
      else if (foes.length) { S.meter.note = 'Tolland rings below. Hold the deck'; S.meter.color = '#46ff8a'; S.meter.add(dt / HOLD); if (S.rung) return; }
      else { S.meter.note = 'The next boat is coming'; S.meter.color = '#2a9a5a'; }
      S.k = S.meter.value;
      // the bell beneath, muffled through the hull while it is rung
      if (foes.length && !atDavit.length && (S.tollT -= dt) <= 0) { S.tollT = 6; api.sfx('bell', 0.22, 0.55); const b = bellAt(S); api.splash(b[0], b[1], 0.25); }
      events(api, dt, foes);
    },
    holdFinal: (api) => !api.state.bossOn,
    objective(api) {   // a boarder at the davit first; otherwise the nearest foe
      const S = api.state, r = S.raider, pl = api.p();
      if (r && !r.dead) return { x: r.x, y: r.y, reach: 1.3 };
      // else the nearest of them on her deck (the default, her middle, would leave one aft standing)
      const f = pl && [...api.live].filter((m) => !m.dead && !m.entering && api.walk(m.x, m.y)).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
      return f ? { x: f.x, y: f.y, reach: 1.5 } : null;
    },
    onVictory(api) {   // the bell comes up and Tolland with it, back at his place by the bell tower door
      const S = api.state, T = api.cast.tolland;
      S.bell.position.y = S.bellY;
      const [x, y] = api.tileOf(-2.1, -12.55); T.x = x; T.y = y; T.alpha = undefined; T.face(api.OX, api.OY + 4);
    },
  },
};

const bellAt = (S) => S.bellAt;   // where the bell went down, on the water off the port quarter

/** Tolland's one sentence, and down he goes in his bell. Then the hold-out. */
function goDown(api) {
  const S = api.state, T = api.cast.tolland, foot = api.tileOf(S.dw.davit[0] + 0.9, S.dw.davit[2] - 0.8);
  const bellPx = () => { const b = S.bell.position; return api.flat(api.OX + b.x, api.OY + b.z, b.y * api.LV); };
  const dnAt = () => api.flat(S.dn.x, S.dn.y, 4 * api.LV);
  api.scene('ninth_bell_down', [
    { do: () => { T.x = foot[0]; T.y = foot[1]; T.face(S.davit[0] - 1, S.davit[1]); } },
    api.on(() => api.faceOf(T), 2.2, 1.6, { pace: 900, wait: true }),
    api.say(T, "Eight I've rung. The ninth is under the water, and it's his."),
    { do: () => api.cast.tolland && fadeInto(api, T) },
    { wait: 0.9 },
    api.fit(() => [bellPx(), api.flat(S.davit[0], S.davit[1], api.lvAt(...S.davit), 50), api.flat(...bellAt(S), api.SEA_LV)], 1.3, 1.0, { wait: true, min: 0.8 }),
    { do: () => lower(api) },
    { wait: 3.6 },
    // The Lightless, coming up out of the dark astern: steaming for Gullwrack
    api.fit(() => [dnAt(), api.flat(api.OX, api.OY + 16, api.QD_H * api.LV)], 0.7, 2.2, { wait: true, min: 0.3 }),
    { card: ['HOLD OVER THE BELL', 'The Lightless steams for Gullwrack'], dur: 2.8 },
    api.backToHero(1.0),
  ], () => {
    S.meter = api.meter('The Ninth Bell', { color: '#46ff8a', full: () => ring(api), note: 'Tolland rings below. Hold the deck' });
  });
}
/** He climbs into the bell: he fades out at its davit. */
function fadeInto(api, T) {
  let t = 0; api.sfx('swing', 0.5);
  api.scripted((dt) => { t += dt; T.alpha = Math.max(0, 1 - t / 0.7); if (t >= 0.7) { T.alpha = 0; T.x = 1.5; T.y = 1.5; return false; } return true; });
}
/** The bell goes down on its falls into the sea. */
function lower(api) {
  const S = api.state, y0 = S.bellY, y1 = api.WL - 2.6; let t = 0, wet = false;
  api.sfx('gate', 0.4, 0.6);
  api.scripted((dt) => {
    t += dt; const k = Math.min(1, t / 3.4);
    S.bell.position.y = y0 + (y1 - y0) * k * k;
    if (!wet && S.bell.position.y < api.WL + 0.2) { wet = true; const b = bellAt(S); api.splash(b[0], b[1], 1.2); api.sfx('splash', 0.8); }
    return k < 1;
  });
}

/** What the hold-out brings as the bell fills (k 0..1): the brig, the grapple steamer, the jets, the torpedoes, a boarder at the davit. */
function events(api, dt, foes) {
  const S = api.state, k = S.k, E = S.ev;
  if (k > 0.14 && !E.brig) { E.brig = true; brig(api); }
  if (k > 0.24 && !E.jet1) { E.jet1 = true; strafe(api); }
  if (k > 0.36 && !E.grapple) { E.grapple = true; grappler(api); }
  if (k > 0.46 && !E.torp1) { E.torp1 = true; torpedo(api); }
  if (k > 0.56 && !E.jet2) { E.jet2 = true; strafe(api); }
  if (k > 0.66 && !E.torp2) { E.torp2 = true; torpedo(api); }
  if (k > 0.66 && S.brig && !E.brigOff) { E.brigOff = true; S.brig.stay = false; }
  if (k > 0.76 && !E.jet3) { E.jet3 = true; strafe(api); api.later(1.4, () => strafe(api)); }
  if (k > 0.86 && !E.torp3) { E.torp3 = true; torpedo(api); }
  // the brig's broadside while she lies off the quarter
  const b = S.brig;
  if (b && !b.dead && b.st === 'dock' && b.stay && (S.volleyT -= dt) <= 0) { S.volleyT = 9; broadside(api, b); }
  // a boarder goes for the bell's falls (the davit): up the quarter on a grapnel
  if (k > 0.08 && !(S.raider && !S.raider.dead) && (S.raidT -= dt) <= 0) { S.raidT = R(15, 20); raider(api); }
  const r = S.raider;
  if (r && !r.dead && r.static) {
    const pl = api.p();
    if (r.hp < r.maxHp || (pl && Math.hypot(pl.x - r.x, pl.y - r.y) < 2.4)) r.static = false;
    else if ((r.hackT = (r.hackT || 0) - dt) <= 0) { r.hackT = 0.7; api.floatText(r.x, r.y, 70, 'HACK', '#ff8a5a', 13, { life: 0.6 }); api.sparkle(S.davit[0], S.davit[1], 40, '#ffd080', 4, 0.3); api.sfx('thud', 0.3); }
  }
}
function raider(api) {
  const S = api.state, to = api.near(S.davit[0] + 0.3, S.davit[1] - 0.4, 1), from = [api.OX - api.beam(api.sAt(S.dw.davit[2] - 1)) - 0.8, to[1], api.SEA_LV + 4];
  api.telegraph(to[0], to[1], 1.3, 1.6, '#ff5040');
  api.splash(from[0], from[1], 0.6);
  api.later(1.4, () => {
    const m = S.raider = api.spawnPirate(api.pickCrew().id, 'champion', from, to, 92);
    m.static = true; m.raider = true;
  });
}
function brig(api) {
  const S = api.state, b = S.brig = api.launchBoat('brig', 'brig', api.crewList(5, 2, 0, 90), { hold: 3, dur: 8 });
  if (b) { b.stay = true; b.h.setFightingSail?.(0.8); }
}
function grappler(api) {
  const S = api.state, boats = api.world.seaState.boats, busy = boats.some((q) => q.dz === -16 && q.st !== 'out');
  const b = api.launchBoat('grappler', busy ? 12 : -16, api.crewList(6, 2, 1, 91), { dur: 7 });
  if (b) S.grappler = b;
}
/** The brig's starboard battery: a ring where each shot will land, then the shot, her gun flashes along her side. */
function broadside(api, b) {
  const pl = api.p();
  for (let i = 0; i < 4; i++) {
    const to = i === 0 && pl ? api.near(pl.x + R(-1.2, 1.2), pl.y + R(-1.2, 1.2)) : api.near(api.OX + R(-4, 4), api.OY + R(4, 17));
    api.telegraph(to[0], to[1], 1.5, 1.5, '#ff7040');
    api.later(0.2 * i, () => api.cannon(b.h.worldOf(b.h.hb * 0.95, 0.9, -6 + i * 4), [to[0], to[1], api.lvAt(to[0], to[1])], () => api.blast(to[0], to[1], 1.5, api.base.dmg * 1.6, true), 1.3));
  }
  api.floatText(b.x, b.y, 120, 'BROADSIDE!', '#ffb070', 16);
}

/** A Kestrel off The Anvil's catapult: a lane down her deck (telegraphed), then the jet along it, guns firing. */
function strafe(api) {
  const S = api.state, pl = api.p(); if (!pl) return;
  const ang = Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1) + R(-0.45, 0.45), ux = Math.cos(ang), uy = Math.sin(ang), L = 13, P = [pl.x + R(-0.8, 0.8), pl.y + R(-1.5, 1.5)];
  api.addEffect(laneMark(P, ux, uy, L, 1.6, 2.2), 'ground');
  api.bark('jets');
  const j = api.spawnShip('kestrel'); if (!j) return;
  j.ship.setGear?.(false); j.ship.setThrottle?.(1);
  const D = 52, dur = 2.7, hit = new Set(); let t = -0.55;
  const at = (k) => [P[0] + ux * (-D + 2 * D * k), P[1] + uy * (-D + 2 * D * k)];
  j.place(...at(0), Math.atan2(-ux, -uy), 1.4); j.setAlpha(0);
  api.scripted((dt) => {
    t += dt; if (t < 0) return true;
    const k = t / dur, [x, y] = at(k), along = (k * 2 - 1) * D;
    j.place(x, y, Math.atan2(-ux, -uy), 1.4); j.setAlpha(Math.min(1, k * 6, (1 - k) * 6));
    const firing = Math.abs(along) < L + 2;
    j.ship.fire?.(firing);
    if (firing && Math.abs(along) < L && (S.gunT = (S.gunT || 0) - dt) <= 0) {
      S.gunT = 0.06;
      api.sparkle(x + R(-0.4, 0.4), y + R(-0.4, 0.4), 6, '#ffe080', 3, 0.2); spawn({ type: 'glow', x, y, z: 4, life: 0.15, size: 12, size1: 2, color: '#ffd060', add: true });
      for (const team of ['enemy', 'player']) aoe(api.world, null, x, y, 0.9, api.base.dmg * (team === 'enemy' ? 1.1 : 0.8), 'phys', { team, exclude: hit });
      if (Math.random() < 0.3) api.sfx('hit', 0.25);
    }
    if (k >= 1) { j.remove(); return false; }
    return true;
  });
  api.sfx('swing', 0.6, 0.5);
}
/** A strafing lane on her deck: a red strip with hard edges, chevrons running the way the jet will come (it fills as the
 *  run nears). The game's line telegraph is too faint on her pale planks. */
function laneMark(P, ux, uy, L, w, dur) {
  const px = -uy * w / 2, py = ux * w / 2, pt = (a, s) => [isoX(P[0] + ux * a + px * s, P[1] + uy * a + py * s), isoY(P[0] + ux * a + px * s, P[1] + uy * a + py * s)];
  return { t: 0, update(dt) { this.t += dt; return this.t < dur; }, draw(ctx) {
    const k = Math.min(1, this.t / dur), c = [pt(-L, -1), pt(L, -1), pt(L, 1), pt(-L, 1)];
    ctx.save();
    ctx.globalAlpha = 0.16 + 0.3 * k; ctx.fillStyle = '#ff3a1a';
    ctx.beginPath(); ctx.moveTo(...c[0]); for (const q of c.slice(1)) ctx.lineTo(...q); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(...c[0]); ctx.lineTo(...c[1]); ctx.moveTo(...c[3]); ctx.lineTo(...c[2]); ctx.stroke();
    ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 3;
    for (let a = -L + ((this.t * 9) % 3); a < L; a += 3) { const l = pt(a - 0.6, -0.6), m = pt(a, 0), r = pt(a - 0.6, 0.6); ctx.beginPath(); ctx.moveTo(...l); ctx.lineTo(...m); ctx.lineTo(...r); ctx.stroke(); }
    ctx.restore();
  } };
}

/** A Thunderhawk comes in low from starboard and drops a torpedo, which runs in at the hull (telegraphed on the water
 *  and where it will strike her deck). */
function torpedo(api) {
  const S = api.state, z0 = R(-13, 13), z = Math.abs(z0) < 4.5 ? z0 + (z0 < 0 ? -5 : 5) : z0;   // (not into the paddle box)
  const hull = [api.OX + api.beam(api.sAt(z)) + 0.2, api.OY + z], drop = [api.OX + 23, api.OY + z], hit = api.near(api.OX + api.inner(api.sAt(z)) - 1.0, api.OY + z, 1.2);
  const h = api.spawnShip('thunderhawk'); if (!h) return;
  h.ship.setGear?.(false); h.ship.setThrottle?.(1);
  api.bark('torpedo');
  const from = [api.OX + 70, api.OY + z - 8], to = [api.OX - 50, api.OY + z + 8], hd = Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]));
  const run = { x: drop[0], y: drop[1], to: hull, k: -1, m: null };
  let t = 0;
  api.scripted((dt) => {
    t += dt; const k = t / 4.2, x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k;
    if (k < 1) { h.place(x, y, hd, 1.3); h.setAlpha(Math.min(1, k * 5, (1 - k) * 5)); } else if (!h.dead) h.remove();
    if (run.k < 0 && x <= drop[0] + 2) {   // the drop: a splash, the torpedo running in, the ring where it will strike
      run.k = 0; h.ship.drop?.(); api.splash(drop[0], drop[1], 0.9);
      run.m = api.spawnShip('torpedo'); run.m?.place(drop[0], drop[1], Math.PI / 2, 1);
      api.telegraph(hit[0], hit[1], 2.1, 3.0, '#ff4030');
      (S.torps ||= []).push(run);
    }
    if (run.k >= 0 && run.k < 1) {
      run.k = Math.min(1, run.k + dt / 3.0); run.x = drop[0] + (hull[0] - drop[0]) * run.k;
      run.m?.place(run.x, drop[1], Math.PI / 2, 1);
      if (run.k >= 1) {   // it strikes her hull below the starboard rail
        api.splash(hull[0] + 0.5, hull[1], 1.6, true); api.blast(hit[0], hit[1], 2.1, api.base.dmg * 2.2, true);
        camera.shake(11); api.sfx('explode', 1); api.costReward(0.06); api.floatText(hit[0], hit[1], 80, 'HULL HIT!', '#ff7050', 18);
        run.m?.remove(); S.torps = S.torps.filter((q) => q !== run);
      }
    }
    return k < 1 || (run.k >= 0 && run.k < 1);
  });
}

/** The great light, dimmed toward k (its beam and its halos). */
function dimLight(api, k) {
  const S = api.state; if (!S.light || Math.abs((S.lightAt ?? -1) - k) < 0.01) return;
  S.lightAt = k;
  S.light.ship.root.traverse((m) => {
    if (m.isMesh && m.name === 'beam' && m.material.uniforms) { m.material.userData.k0 ??= m.material.uniforms.k.value; m.material.uniforms.k.value = m.material.userData.k0 * k; }
    if (m.isSprite && m.material.blending === 2) { m.material.userData.o0 ??= m.material.opacity; m.material.opacity = m.material.userData.o0 * k; }
  });
}
/** At night: the torpedoes' wakes, the bell's green glow on the water while it's rung; after the ring the sea glows. */
function lights(api) {
  const S = api.state;
  if (S.onRail) addLight(S.onRail.x, S.onRail.y, 3, 1, S.onRail.z + 40, '#a0c8ff');
  if (S.green) { const b = bellAt(S); addLight(b[0], b[1], 14 * S.green, 1.2 * S.green, api.SEA_LV * api.HS, '#46ff8a'); addLight(api.OX + 8, api.OY, 12 * S.green, 0.9 * S.green, api.SEA_LV * api.HS, '#46ff8a'); }
  for (const t of S.torps || []) addLight(t.x, t.y, 2, 0.8, api.SEA_LV * api.HS, '#ffb060');
}
/** Each torpedo's run to the hull, a dashed line drawn on the water at sea level (a telegraph on the deck's plane would
 *  float over the sea). A hazard in the world's top layer (world px). */
function runLines(api, ctx) {
  const S = api.state, sea = api.SEA_LV * api.HS, P = (x, y) => [isoX(x, y), (x + y) * 16 - sea];
  if (S.contested && !G.cine) davitMark(api, ctx);
  for (const t of S.torps || []) {
    const a = P(t.x, t.y), b = P(t.to[0], t.to[1]);
    ctx.save(); ctx.globalAlpha = 0.55 + 0.3 * Math.sin(api.world.time * 14); ctx.strokeStyle = '#ff5030'; ctx.lineWidth = 5; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
  }
}

/** The davit contested (a boarder at the bell's falls): a pulsing ring and a down-arrow on it, and an arrow at the
 *  screen's edge pointing to it while it is off screen. */
function davitMark(api, ctx) {
  const S = api.state, [x, y] = S.davit, t = api.world.time, px = isoX(x, y), py = isoY(x, y), k = 0.5 + 0.5 * Math.sin(t * 8);
  ctx.save();
  ctx.strokeStyle = '#ff4030'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * k;
  for (const r of [1.1, 1.1 + 0.5 * k]) { ctx.beginPath(); ctx.ellipse(px, py, r * 45, r * 22.6, 0, 0, Math.PI * 2); ctx.stroke(); }
  const ay = py - 118 - 8 * k;
  ctx.fillStyle = '#ff4030'; ctx.strokeStyle = '#2a0806'; ctx.lineWidth = 2; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(px - 13, ay - 20); ctx.lineTo(px + 13, ay - 20); ctx.lineTo(px + 13, ay - 4); ctx.lineTo(px + 22, ay - 4); ctx.lineTo(px, ay + 16); ctx.lineTo(px - 22, ay - 4); ctx.lineTo(px - 13, ay - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  // off screen: an arrow at the edge toward it
  const [sx, sy] = camera.toScreen(px, py - 40), M = 40;
  if (sx < M || sx > G.W - M || sy < M + 30 || sy > G.H - M - 90) {
    const d = G.dpr, cx = G.W / 2, cy = G.H / 2, dx = sx - cx, dy = sy - cy, kk = Math.min((G.W / 2 - M) / Math.abs(dx || 1e-6), (G.H / 2 - M - 50) / Math.abs(dy || 1e-6));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate((cx + dx * kk) * d, (cy + dy * kk) * d); ctx.rotate(Math.atan2(dy, dx));
    const r = 16 * d; ctx.globalAlpha = 0.7 + 0.3 * k; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.75); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.75); ctx.closePath();
    ctx.fillStyle = '#46ff8a'; ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = '#06200e'; ctx.stroke();
  }
  ctx.restore();
}

/** The bell rings: green light rises from under the sea, The Lightless's furnaces gutter, Pip calls it, Brask looks at
 *  her and says nothing, and the Hollow Commodore leaps across from his ship. */
function ring(api) {
  const S = api.state, run = api.run, P = api.cast.pip, B = api.cast.brask;
  if (S.rung) return;
  S.rung = true; run.phase = 'finalIntro';
  if (S.meter) { S.meter.hide(); S.meter = null; }
  run.timers = run.timers.filter((q) => q[2] === undefined);   // no more boats set out
  if (S.brig) S.brig.stay = false;
  const rail = () => S.dn.worldOf(6.0, 0.05, 6.0), railPx = () => { const [x, y, l] = rail(); return api.flat(x, y, l, 60); };
  const stern = () => [api.flat(api.OX + 9, api.OY + 15, api.SEA_LV), api.flat(S.davit[0], S.davit[1], api.lvAt(...S.davit), 30), api.flat(api.OX - 3, api.OY + 25, api.SEA_LV)];
  const dn = (x, y, z, up = 0) => { const [a, b, l] = S.dn.worldOf(x, y, z); return api.flat(a, b, l, up); };
  // the fight holds still for it: every foe on her deck stands where it is, its blows held, until the Commodore leaps
  const frozen = [...api.live].filter((q) => !q.dead).map((q) => [q, q.static]);
  for (const [q] of frozen) q.static = true;
  api.scripted(() => { for (const [q] of frozen) q.cd = Math.max(q.cd || 0, 0.5); return !S.bossOn; });
  const helm = [B.x, B.y], mast = api.tileOf(1.5, -3.2);
  let m = null;
  api.scene('ninth_bell_rings', [
    { do: () => { api.sfx('bell', 1, 0.5); camera.shake(4); } },
    api.fit(stern, 1.1, 1.6, { wait: true, min: 0.6 }),
    { do: () => { greenRise(api); B.x = mast[0]; B.y = mast[1]; B.face(P.x, P.y); } },   // (Brask has come forward to the foremast)
    { wait: 3.4 },
    api.on(() => api.faceOf(P), 2.3, 1.2, { wait: true, pace: 900 }),
    api.say(P, "Green light, under the water! It's him!"),
    // Brask says nothing: below Pip's foretop she looks up at her, and the bell carries it (the two of them in one shot)
    api.fit(() => [api.faceOf(B, 0.2), api.faceOf(P, 0.9)], 1.5, 1.4, { wait: true, pace: 900, min: 0.9 }),
    { do: () => { B.face(P.x, P.y); B.feel('look', 3.4, false); api.sfx('bell', 0.7, 0.5); } },
    { wait: 2.6 },
    // and on The Lightless the furnaces gutter: her funnels and the tower, close
    api.fit(() => [dn(0, 12, -9), dn(0, 1, -12), dn(0, 7, -16), dn(4, 3, -6)], 1.2, 1.8, { wait: true, min: 0.55 }),
    { do: () => gutter(api) },
    { wait: 2.6 },
    { do: () => {   // he stands at her starboard rail, riding her (still, not yet to be struck), under his card
      const to = S.landTo = api.near(...api.tileOf(-3.0, 1.0), 1.5);
      m = run.capM = api.spawnCaptain(CMDR, rail(), to, 'boss', null, { hp: 1.2 });
      m.entering = (dt) => { m.animT += dt; const [x, y, l] = rail(); m.x = x; m.y = y; m.z = (l - api.lvAt(x, y)) * api.HS; m.flip = false; };
      S.onRail = m;
    } },
    api.on(railPx, 2.0, 1.4, { wait: true, push: 0.02 }),
    { card: ['THE HOLLOW COMMODORE', 'Master of The Lightless'], dur: 2.8 },
    api.capSay(CMDR, "My ship has no lamps. It doesn't need them.", railPx),
    { do: () => {   // and leaps across to the Dawnwake
      S.onRail = null; api.leap(m, rail(), S.landTo, { arc: 190, dur: 2.0, board: false });
      for (const [q, st] of frozen) if (!q.dead) q.static = st;
      api.world.boss = m; S.bossOn = true; api.sfx('swing', 0.9, 0.7);
    } },
    api.fit(() => [railPx(), api.faceOf(m, 0.5), api.flat(S.landTo[0], S.landTo[1], api.lvAt(...S.landTo), 40)], 1.0, 0.4, { min: 0.4 }),
    { until: () => m && !m.entering, max: 5 },
    { wait: 0.5 },
    api.on(() => api.faceOf(m), 1.9, 0.5, { push: 0.02 }),
    { wait: 0.5 },
    api.backToHero(0.8),
  ], () => { run.phase = 'final'; B.x = helm[0]; B.y = helm[1]; api.banner('THE HOLLOW COMMODORE', 'Master of The Lightless'); });
}
/** Green light up out of the sea round her, brightest where the bell went down. */
function greenRise(api) {
  const S = api.state, U = S.sea.U, deep = U.wDeep.value, shallow = U.wShallow.value, d1 = deep.clone().setHex(0x0a4a2c), s1 = shallow.clone().setHex(0x3ad88a);
  let t = 0; S.green = 0.01;
  const b = bellAt(S);
  for (let i = 0; i < 8; i++) api.later(i * 0.3, () => { api.splash(b[0] - i * 0.4, b[1] + R(-1, 1), 0.5 + i * 0.12); api.splash(api.OX + 6.5 + i * 1.2, api.OY + 16 + R(-5, 5), 0.5 + i * 0.1); });
  api.scripted((dt) => {
    t += dt; const k = Math.min(1, t / 2.5);
    deep.copy(S.deep0).lerp(d1, k); shallow.copy(S.shallow0).lerp(s1, k); S.green = k;
    // motes of green light rising off the water all round her (the starboard side is the one the camera sees)
    for (let i = 0; i < 3; i++) {
      const side = Math.random() < 0.65 ? 1 : -1, z = R(-18, 22), x = api.OX + side * (api.beam(api.sAt(Math.max(-19, Math.min(19, z)))) + R(1, 9));
      spawn({ type: 'glow', x, y: api.OY + z, z: api.SEA_LV * api.HS + R(0, 20), vz: R(25, 70), life: R(1.6, 2.8), size: R(5, 10), size1: 1, color: Math.random() < 0.3 ? '#eaffd0' : '#6aff9a', add: true });
    }
    if (t > 2.5 && !S.greenLit) { S.greenLit = true; const L = seaScene().lightSrc, src = L[0]; if (src) L.push({ o: seaScene().dawn.root, p: src.p.clone().set(S.dw.davit[0] - 2.5, -1, S.dw.davit[2]), c: 0x46ff8a, r: 30, i: 2.2, w: src.w.clone() }); }
    return t < 9;   // the motes keep rising a while
  });
  api.sfx('portal', 0.8, 0.6);
}
/** The Lightless's furnaces gutter: her fire-glows and her furnace-lit plates go dim. */
function gutter(api) {
  const S = api.state, mats = new Set(), halos = [];
  S.dn.ship.root.traverse((m) => {
    if (m.isSprite && m.material.blending === 2) halos.push(m.material);
    else if (m.isMesh && m.material && m.material.emissive && m.material.emissive.r > 0.4 && m.material.emissive.g < m.material.emissive.r * 0.7) mats.add(m.material);
  });
  const e0 = [...mats].map((q) => q.emissiveIntensity), o0 = halos.map((q) => q.opacity);
  let t = 0; S.guttering = true; api.sfx('fizzle', 0.8); api.smoke(S.dn.x, S.dn.y, 200, '#1a1414', 12, 30);
  api.scripted((dt) => {
    t += dt; const k = Math.min(1, t / 2.2), f = (1 - k * 0.88) * (0.85 + 0.15 * Math.sin(t * 23) * (1 - k));
    [...mats].forEach((q, i) => { q.emissiveIntensity = e0[i] * f; });
    halos.forEach((q, i) => { q.opacity = o0[i] * f; });
    return k < 1;
  });
  S.dn.place(S.dn.x, S.dn.y, S.dn.heading, 0.05);
}

/** A foe knocked off the deck (a blast, a strafe) and stranded over the water goes over the side: a splash, gone. */
function overboard(api, dt) {
  for (const m of api.live) {
    if (m.dead || m.entering || api.walk(m.x, m.y)) { m.offT = 0; continue; }
    if ((m.offT = (m.offT || 0) + dt) > 1.5) { api.splash(m.x, m.y, 0.8); api.kill(m); }
  }
}
