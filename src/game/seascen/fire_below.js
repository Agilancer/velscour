// #4 FIRE BELOW THE BLACK SAILS (docs/PIRATE_SEAS.md): Saint Ivo's Lantern, at night. Admiral Veyl's black-sail galleon
// lies alongside to starboard, a gangway across from the Dawnwake's waist to hers, and the fight is on her decks: her
// crew come up through the hatches of her waist, wave on wave, while her Cinderbomb Grenadiers on the quarterdeck and
// the forecastle lob fire down onto the planks. The fires spread tile by tile and close the waist (they burn whoever
// stands in them, hers too); two fire-bucket stations douse their half of the waist; climbing the stairs to the raised
// decks silences the bombers. The more of her deck that burns, the more of her prize goes up (the meter costs the
// chest). Veyl watches from her quarterdeck the whole fight and fights there at the end, throwing cinderbombs of his own.
import { isoX, isoY, HW, HH } from '../../core/view.js';
import { hit } from '../combat.js';
import { glowSprite, spawn, addLight, addDecal } from '../../gfx/vfx.js';

const GX = 15.2, GZ = 0;   // her origin off the Dawnwake's (tiles): to starboard, nothing between her deck and the camera
const ZG = -4.4;           // the gangway's ship z: the Dawnwake's waist between her foremast and the funnel, clear of the paddle box
const BOMBER = 'ap_cinderbomb_grenadier';
const DOUSE_R = 6;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export default {
  id: 'fire_below', number: 4, name: 'Fire Below the Black Sails', light: "Saint Ivo's Lantern", weather: 'night', weatherName: 'Night',
  blurb: "Veyl's galleon lies alongside. Cross the gangway and take her deck.", dark: 0.1,
  fleet: ['galleon'],
  art: [BOMBER, 'ap_admiral_veyl', 'ap_the_last_boarding_saint'],
  boats: { longboat: 1 },
  // no boats: her own crew come up her hatches (crew: how many), the label under the wave's banner
  waves: [
    { boats: 0, crew: 4, champion: 0, label: 'Up from her hold' },
    { boats: 0, crew: 5, champion: 1, label: 'Up from her hold' },
    { boats: 0, crew: 6, champion: 2, unique: 1, mid: true, label: 'Up from her gun deck' },
    { boats: 0, crew: 6, champion: 2, label: 'Up from her hold' },
    { boats: 0, crew: 7, champion: 3, unique: 1, label: 'The last of her crew' },
  ],
  mid: { id: 'ap_the_last_boarding_saint', name: 'The Last Boarding Saint', title: "Champion of Veyl's Flagship", line: "The Admiral's deck. Earn it.", from: 'deck',
    at: (api) => api.state.deck.tile(0, 9.0), leapTo: (api) => api.state.deck.tile(0.5, 0.8) },
  final: { id: 'ap_admiral_veyl', line: "Strike your colours, or I'll strike them for you.", from: 'deck', stay: true,
    at: (api) => api.state.deck.tile(0, 14.4) },
  hooks: {
    setup(api) {
      const S = api.state, h = api.spawnShip('galleon', { deck: true, fight: 1 }), W = h.info.walk;
      h.place(api.OX + GX, api.OY + GZ, 0);
      // her stairs as the director walks them ([foot x, y, z, top x, y, z, width]): the twin quarterdeck flights and the forecastle's
      h.info.stairs = (h.info.stairs || []).map((s) => (s.athwart ? [...s.foot, ...s.top, s.z1 - s.z0] : [s.x, s.y0, s.z0, s.x, s.y1, s.z1, s.w]));
      // her yards span the whole deck high overhead: only what stands up from the planks (masts, the helm) hides a sprite
      const bake = h.bake.bind(h);
      h.bake = (o) => { const B = bake(o); for (let k = 0; k < B.top.length; k++) if (B.hi[k] - B.lo[k] < 2.5) B.top[k] = B.hi[k]; return B; };
      S.deck = api.addDeck(h, { levels: [0, W.QD_H, W.FC_H] });
      S.h = h; S.W = W;
      // each quarterdeck flight's foot stands against the bulwark behind its stringer: step round the newel onto it
      const qf = W.zAt(W.QD_S) - W.QD_FLIGHT;
      for (const sx of [-1, 1]) { const a = h.worldOf(sx * 3.7, 0, qf - 1.0), b = h.worldOf(sx * 4.7, 0, qf + 0.1); api.join([a[0], a[1], h.deckY], [b[0], b[1], h.deckY], { w: 0.8 }).open(); }
      // the gangway: from inside the Dawnwake's starboard rail to inside the galleon's port rail
      const s = api.sAt(ZG), lz = ZG - GZ, [bx, by] = h.worldOf(-(W.inner(W.sAt(lz)) - 1.0), 0, lz);
      S.gang = api.join([api.OX + (api.inner(s) - 0.7), api.OY + ZG, 0], [bx, by, h.deckY], { w: 0.9, plank: true });
      S.gang.open();
      // Veyl on his quarterdeck, watching (a figure aboard until he is the captain)
      S.veyl = h.addCrew({ art: 'ap_admiral_veyl', swap: null, x: 0, y: W.QD_H, z: 14.4, h: 92, flip: true });
      // the planks that can burn: every walkable tile of her deck; the waist's count for the meter
      const map = api.map, zq = W.zAt(W.QD_S), zf = W.zAt(W.FC_S);
      S.cells = new Set(); S.waistN = 0;
      for (let t = 0; t < map.w * map.h; t++) {
        if (map.deck[t] !== S.deck.id || map.block[t]) continue;
        S.cells.add(t);
        const lz2 = Math.floor(t / map.w) + 0.5 - (api.OY + GZ);
        if (lz2 > zf && lz2 < zq) S.waistN++;
      }
      S.fires = new Map(); S.spreadT = 1; S.burnT = 0.5; S.bombers = []; S.veylT = 6;
      S.hatches = [S.deck.tile(0, 3.4), S.deck.tile(0, -7.2)];
      // the bombers' posts: the quarterdeck's front rail (both sides of the stair head) and the forecastle's
      S.posts = [[-3.3, zq + 0.9], [3.3, zq + 0.9], [2.9, zf - 1.4]].map(([x, z]) => S.deck.tile(x, z));
    },
    start(api) {
      const S = api.state;
      S.meter = api.meter('Her deck burns', { color: '#ff8a2a', full: 'reward', note: 'the bombers are on her raised decks' });
      postBombers(api, 2);
      // the fire buckets: one station a half of her waist, each douses the fires round it
      S.buckets = [[4.3, -5.4, 'fore'], [-4.2, 3.2, 'aft']].map(([x, z, k]) => {
        const at = api.near(...S.deck.tile(x, z), 1.5), o = api.mark(at[0], at[1], 'Fire Buckets', (m) => douse(api, m), '#70c8ff');
        o.cd = 0; o.half = k; return o;
      });
      // the fire on her planks, under the sprites
      api.addEffect({ update: () => api.world.seaRun === api.run && !S.out, draw: (ctx) => drawFires(api, ctx) }, 'ground');
      // burning planks are ground auto-play keeps off (it walks through after a moment's wait at the edge)
      api.world.addHazard({ team: 'enemy', update: () => api.world.seaRun === api.run, draw() {},
        danger(out) { for (const c of S.fires.values()) if (c.age > 0.5) out.push({ x: c.x, y: c.y, r: 0.62, linger: true }); } });
    },
    onWave(api, n, w) {
      const S = api.state;
      if (n > 0) postBombers(api, n >= 2 ? 3 : 2);
      // her crew come up the hatches, one after another (tagged with the wave: hurry() brings the next one on)
      let champ = w.champion || 0, uniq = w.unique || 0;
      for (let i = 0; i < (w.crew || 0); i++) {
        const rank = uniq-- > 0 ? 'unique' : champ-- > 0 ? 'champion' : 'normal';
        api.later(0.4 + i * 0.7, () => rise(api, S.hatches[i % 2], rank, n), n);
      }
      api.bark('hatches', 0.6);
      for (const [x, y] of S.hatches) api.smoke(x, y, 6, '#2a2220', 8, 16);   // the hatches smoke: the fire is below too
    },
    onBoss(api, m, which) {
      const S = api.state;
      if (which === 'final' && S.veyl) { S.h.dropCrew(S.veyl); S.veyl = null; }
      // their specials are her own deck's: the champion leaps, the Admiral throws his chain; his crew come up the
      // hatches and his cinderbombs fall round the hero (tick), not boats or the Dawnwake's yards
      m.captain = { ...m.captain, moves: which === 'final' ? ['hook'] : ['leap'] };
      S.crewT = 10;
    },
    tick(api, dt) {
      const S = api.state, pl = api.p(), run = api.run;
      if (run.phase === 'victory' || run.phase === 'done') return;
      tickFires(api, dt);
      // the bombers on her raised decks lob cinderbombs onto the planks
      for (const b of S.bombers) {
        if (b.dead || b.entering) continue;
        if ((b.bombT -= dt) > 0) continue;
        b.bombT = rnd(6.5, 8.5);
        const onHer = pl && onGalleon(api, pl.x, pl.y);
        const to = onHer && Math.random() < 0.7 ? api.near(pl.x + rnd(-1.4, 1.4), pl.y + rnd(-1.4, 1.4)) : api.near(...S.deck.tile(rnd(-4, 4), rnd(-10, 6)));
        bomb(api, [b.x, b.y, api.lvAt(b.x, b.y) + 7], to);
        api.floatText(b.x, b.y, 80, 'CINDERS!', '#ffb070', 14);
      }
      // the Admiral's own: three bombs round the hero from his quarterdeck
      const V = run.capM;
      if (run.phase === 'final' && V && !V.dead && !V.entering && pl && (S.veylT -= dt) <= 0) {
        S.veylT = 9;
        for (let i = 0; i < 3; i++) {
          const a = i * TAU / 3 + Math.random(), r = i ? 2.2 : 0.4;
          api.later(i * 0.25, () => bomb(api, [V.x, V.y, api.lvAt(V.x, V.y) + 9], api.near(pl.x + Math.cos(a) * r, pl.y + Math.sin(a) * r)));
        }
        api.floatText(V.x, V.y, 100, 'BURN HER!', '#ffb070', 16);
      }
      if (run.phase === 'final' && V && !V.dead && !V.entering && (S.crewT -= dt) <= 0) {   // "All hands!": two more up the hatches
        S.crewT = 13;
        for (let i = 0; i < 2; i++) api.later(i * 0.6, () => rise(api, S.hatches[i], 'normal', 98));
        api.floatText(V.x, V.y, 100, 'ALL HANDS!', '#ffb070', 16);
      }
      for (const o of S.buckets || []) { o.cd = Math.max(0, o.cd - dt); o.label = o.cd > 0 ? 'Fire Buckets (refilling)' : 'Fire Buckets'; }
      if (S.meter) {
        const f = S.fires.size / Math.max(1, S.waistN), live = S.bombers.filter((b) => !b.dead).length;
        S.meter.add(dt * f * 0.03);
        S.meter.note = `${Math.round(f * 100)}% alight · ${live ? `${live} bomber${live > 1 ? 's' : ''} above` : 'the bombers are down'}`;
      }
    },
    onVictory(api) {   // her fires go out under the Dawnwake's hoses; the gangway stays for the walk home
      const S = api.state;
      for (const c of S.fires.values()) api.smoke(c.x, c.y, 2, '#c8d0d8', 6, 14);
      S.fires.clear(); if (S.meter) { S.meter.hide(); S.meter = null; }
      for (const o of S.buckets || []) api.unmark(o);
      S.buckets = [];
    },
    objective(api) {
      const S = api.state, pl = api.p(), run = api.run;
      if (!pl || run.phase === 'victory' || run.phase === 'done') return null;
      // a bucket ready by a half of the waist well alight
      let best = null;
      for (const o of S.buckets || []) {
        if (o.cd > 0) continue;
        let n = 0; for (const c of S.fires.values()) if (Math.hypot(c.x - o.x, c.y - o.y) < DOUSE_R) n++;
        if (n >= 10 && (!best || n > best.n)) best = { n, o };
      }
      if (best) return { x: best.o.x, y: best.o.y, reach: 1.2, use: () => douse(api, best.o) };
      // else the nearest of hers still standing (the bombers up the stairs, the Admiral at the end), so auto-play goes over
      let foe = null, d = Infinity;
      for (const m of api.live) if (!m.dead && !m.entering && m.targetable !== false) { const q = Math.hypot(m.x - pl.x, m.y - pl.y); if (q < d) { d = q; foe = m; } }
      return foe ? { x: foe.x, y: foe.y, reach: 1.8 } : { x: S.hatches[0][0], y: S.hatches[0][1], reach: 4 };
    },
  },
};

const onGalleon = (api, x, y) => api.map.deck[api.map.tileIdx(x, y)] === api.state.deck.id;

/** Fill the bombers' empty posts (the first n): each comes up her companion in a puff of smoke. */
function postBombers(api, n) {
  const S = api.state;
  S.bombers = S.bombers.filter((b) => !b.dead);
  for (let i = 0; i < Math.min(n, S.posts.length); i++) {
    if (S.bombers.some((b) => b.post === i)) continue;
    const m = api.spawnOnDeck(BOMBER, i === 2 ? 'champion' : 'normal', S.posts[i], 96);
    m.static = true; m.bomber = true; m.post = i; m.bombT = 2.5 + i * 1.6;
    api.smoke(m.x, m.y, 5, '#2a2220', 6, 12);
    S.bombers.push(m);
  }
}
/** One of her crew climbs out of a hatch onto the waist. */
function rise(api, at, rank, wave) {
  const [x, y] = api.near(at[0] + rnd(-0.5, 0.5), at[1] + rnd(-0.5, 0.5), 1.2);
  const m = api.spawnOnDeck(null, rank, [x, y], wave);
  api.leap(m, [m.x, m.y, api.lvAt(m.x, m.y) - 14], [m.x, m.y], { arc: 30, dur: 0.45, board: true });
  api.smoke(m.x, m.y, 3, '#2a2220', 5, 10);
  return m;
}
/** A cinderbomb lobbed from `from` [tile x, tile y, level] onto tile `to`: a ring, the bomb, a blast and fire round it. */
function bomb(api, from, to) {
  const lv = api.lvAt(to[0], to[1]);
  api.telegraph(to[0], to[1], 1.5, 1.3, '#ff9a30');
  api.bark('cinder', 0.2);
  api.cannon(from, [to[0], to[1], lv], () => {
    api.blast(to[0], to[1], 1.3, api.base.dmg * 1.1, true);
    ignite(api, to[0], to[1], 1.7);
    if (api.state.meter) api.state.meter.add(0.015);
  }, 1.3);
}
function ignite(api, x, y, r) {
  const S = api.state, map = api.map;
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
    if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) <= r) light(S, ty * map.w + tx, map.w);
  }
}
function light(S, t, w) {
  if (!S.cells.has(t) || S.fires.has(t)) return false;
  S.fires.set(t, { x: t % w + 0.5, y: Math.floor(t / w) + 0.5, age: 0, life: rnd(18, 26), ph: Math.random() * 6 });
  return true;
}
/** The fires: they age and burn out (a scorch left), spread to the planks beside them, and burn whoever stands in them. */
function tickFires(api, dt) {
  const S = api.state, map = api.map, w = map.w, wave = Math.max(0, api.run.wave);
  for (const [t, c] of S.fires) {
    c.age += dt;
    if (c.age >= c.life) { S.fires.delete(t); addDecal(c.x, c.y, '#1a120e', 0.8, 'scorch', 0.7); continue; }
    if (Math.random() < dt * 1.6) spawn({ type: 'glow', x: c.x + rnd(-0.3, 0.3), y: c.y + rnd(-0.3, 0.3), z: rnd(8, 26), vz: rnd(30, 70), life: rnd(0.5, 1.1), size: rnd(1.5, 3), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ff7020', add: true });
    if (Math.random() < dt * 0.35) api.smoke(c.x, c.y, 24, '#241c1a', 1, 9);
  }
  // the clock: the deck closes faster wave by wave (to a cap, so it is never all ablaze)
  if ((S.spreadT -= dt) <= 0) {
    S.spreadT = 1;
    // (only while someone up there keeps throwing: with the bombers down and the Admiral not yet at it, the fires burn out)
    const throwing = S.bombers.some((b) => !b.dead) || (api.run.phase === 'final' && api.run.capM && !api.run.capM.dead);
    const cap = throwing ? Math.floor(S.waistN * Math.min(0.42, 0.2 + 0.05 * wave)) : 0, p = 0.05 + 0.02 * wave;
    for (const [t, c] of [...S.fires]) {
      if (S.fires.size >= cap) break;
      if (c.age < 1.5 || Math.random() > p) continue;
      light(S, [t + 1, t - 1, t + w, t - w][Math.floor(Math.random() * 4)], w);
    }
  }
  // the burn, twice a second: the hero, and her own crew too
  if ((S.burnT -= dt) <= 0) {
    S.burnT = 0.5;
    const pl = api.p(), at = (o) => S.fires.has(map.tileIdx(o.x, o.y));
    if (pl && !pl.dead && !(pl.z > 20) && at(pl)) hit(null, pl, api.base.dmg * 0.3, 'fire', {});
    for (const m of api.live) if (!m.dead && !m.entering && m.targetable !== false && at(m)) hit(pl, m, m.maxHp * (m.captain ? 0.012 : 0.05), 'fire', {});
  }
  // the fires light her deck at night (one in five carries a light)
  let k = 0;
  for (const c of S.fires.values()) if ((k++ % 5) === 0 && k < 70) addLight(c.x, c.y, 2.8, 0.8, 20, '#ff8030');
}
/** A fire-bucket station: every fire in its half of the waist goes out in steam. */
function douse(api, o) {
  const S = api.state;
  if (o.cd > 0) { api.sfx('error'); return; }
  o.cd = 12;
  let n = 0;
  for (const [t, c] of S.fires) if (Math.hypot(c.x - o.x, c.y - o.y) < DOUSE_R) { S.fires.delete(t); n++; if (n % 2) api.smoke(c.x, c.y, 10, '#d8e0e8', 2, 12); }
  api.addEffect(new api.Ring(o.x, o.y, 0.3, DOUSE_R, 0.7, '#80d0ff', 5));
  api.sfx('splash', 0.8);
  api.floatText(o.x, o.y, 70, n ? 'DOUSED!' : 'WET PLANKS', '#a8e0ff', 15);
  if (S.meter) S.meter.add(-0.08);
}
/** Her burning planks: a char under each fire, an orange glow, flame tongues licking up (under the sprites). */
function drawFires(api, ctx) {
  const S = api.state; if (!S.fires.size) return;
  const t = api.world.time, fade = (c) => Math.min(1, c.age / 0.6) * Math.min(1, (c.life - c.age) / 2.5);
  ctx.save();
  ctx.fillStyle = '#140a06';
  for (const c of S.fires.values()) {
    ctx.globalAlpha = 0.55 * fade(c); ctx.beginPath(); ctx.ellipse(isoX(c.x, c.y), isoY(c.x, c.y), HW * 0.66, HH * 0.66, 0, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  const gl = glowSprite('#ff6a18');
  for (const c of S.fires.values()) {
    const k = fade(c), px = isoX(c.x, c.y), py = isoY(c.x, c.y), f = 0.75 + 0.25 * Math.sin(t * 11 + c.ph) * Math.sin(t * 7.3 + c.ph * 2);
    ctx.globalAlpha = 0.6 * k * f; ctx.drawImage(gl, px - 48, py - 28, 96, 52);
    for (let j = 0; j < 3; j++) {
      const ox = (j - 1) * 10 + Math.sin(c.ph * 3 + j) * 3, hgt = (12 + 14 * Math.abs(Math.sin(t * (5 + j) + c.ph + j))) * k, sw = Math.sin(t * 6 + c.ph + j * 2) * 4;
      ctx.globalAlpha = 0.8 * k; ctx.fillStyle = '#ff7a18';
      ctx.beginPath(); ctx.moveTo(px + ox - 6, py + 2); ctx.quadraticCurveTo(px + ox - 4, py - hgt * 0.5, px + ox + sw, py - hgt); ctx.quadraticCurveTo(px + ox + 4, py - hgt * 0.5, px + ox + 6, py + 2); ctx.fill();
      ctx.fillStyle = '#ffe07a';
      ctx.beginPath(); ctx.moveTo(px + ox - 3, py + 1); ctx.quadraticCurveTo(px + ox - 2, py - hgt * 0.3, px + ox + sw * 0.6, py - hgt * 0.55); ctx.quadraticCurveTo(px + ox + 2, py - hgt * 0.3, px + ox + 3, py + 1); ctx.fill();
    }
  }
  ctx.restore();
}
