// #6 THE LIGHTLESS (docs/PIRATE_SEAS.md): the Black Mole, at dusk. Velscour's dreadnought lies astern of the Dawnwake
// and to port, her starboard side to the camera and her whole length an arena deck (tools/seaship3d_dreadnought.js: the starboard
// lane bow to stern, the forecastle stair, the hooded stairs down to the stern walk). A plank drops from the Dawnwake's quarterdeck onto
// her forecastle; the hero boards at the bow and pushes aft down the lane, her crew coming up out of the
// hatches ahead of him. Each of her four turrets traverses and sweeps its guns' blast across the deck in three
// telegraphed arcs (its rear, the glowing breech hatch, is the one place its guns can't reach) until the hero SPIKES it
// at that hatch; while their guns are unspiked they also shell the Dawnwake (the meter: the chest pays for it). The
// Hollow Commodore waits on the stern walk until every turret is spiked.
import { aoe } from '../combat.js';
import { addLight, spawn, Telegraph } from '../../gfx/vfx.js';
import { camera } from '../../core/view.js';
import { bakeDeck } from '../../gfx/seabattle3d.js';

// her origin from the Dawnwake's (OX, OY): astern of her and to port, her bow off the Dawnwake's port quarter, so her
// starboard lane faces the camera with nothing of either ship in front of it (her port side hides behind her turrets)
const DX = -14.5, DZ = 48;
const PLANK = { dz: 14.5, local: [4.0, -30.0] };   // the plank: the Dawnwake's quarterdeck rail to her starboard forecastle
const BASE = { A: 0, B: 0, D: Math.PI / 2, C: Math.PI }, AMP = { A: 2.2, B: 2.2, D: 1.9, C: 2.2 };
const SEG_OF = { A: 0, B: 1, D: 3, C: 4 };
// where her crew come up, per stretch of the push (ship-local [x, z]): the bow, the tower, the stair's foot, mid-deck, aft
const SPOTS = [
  [[4.4, -29.5], [2.6, -31.5], [3.6, -27], [5.0, -24.2], [2.2, -25.0]],
  [[4.8, -21], [4.8, -16], [3.0, -24.6], [5.0, -11], [4.6, -7]],
  [[4.6, 1.5], [1.8, 2.8], [5.6, 5.5], [-3.2, 3.2], [-1.0, 0.2]],
  [[5.6, 9.5], [5.6, 15.0], [0.4, 17.0], [-3.4, 12.5], [5.4, 19]],
  [[4.8, 25.5], [5.0, 31.0], [-3.6, 26.5], [3.0, 34.2], [-3.0, 34.2]],
];
const segOfZ = (z) => (z < -25 ? 0 : z < -6 ? 1 : z < 7 ? 2 : z < 21 ? 3 : 4);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clampAbs = (v, m) => Math.max(-m, Math.min(m, v));
const angOf = (th) => Math.atan2(-Math.cos(th), -Math.sin(th));   // a turret's rotation.y -> the angle its guns point on the tiles
const thOf = (a) => Math.atan2(-Math.cos(a), -Math.sin(a));       // and back (the same map: it is its own inverse)
const holding = (api) => !!(api.state.turrets && api.state.turrets.some((r) => !r.spiked));

export default {
  id: 'the_lightless', number: 6, name: 'The Lightless', light: 'The Black Mole', weather: 'sunset', weatherName: 'Dusk off the Black Mole',
  blurb: "Velscour's dreadnought lies across the Black Mole's light. Board her at the bow.",
  fleet: ['dreadnought'],
  size: [112, 152],   // her stern walk lies 88 tiles astern of the Dawnwake's middle
  boats: { longboat: 1 },
  // no boats: each wave comes up her hatches ahead of the hero (deck: how many)
  waves: [
    { boats: 0, n: [], deck: 4, champion: 0, label: 'Up her forecastle hatches' },
    { boats: 0, n: [], deck: 5, champion: 1, label: 'Down from the tower bridge' },
    { boats: 0, n: [], deck: 6, champion: 2, unique: 1, mid: true, label: 'Up from the stokeholds' },
    { boats: 0, n: [], deck: 6, champion: 2, label: 'Out of the casemates' },
    { boats: 0, n: [], deck: 7, champion: 3, unique: 1, label: 'The stern watch' },
  ],
  mid: { id: 'ap_warden_of_the_rookery', name: 'Coalwarden Hesk', title: "Master of The Lightless's stokeholds", line: 'Stoke her up. Feed them to the fires.',
    from: 'deck', at: (api) => api.state.tile(4.8, 1.8), leapTo: (api) => { const p = api.p(); return [p.x, p.y]; } },
  final: { id: 'ap_the_hollow_commodore', name: 'The Hollow Commodore', title: 'Master of The Lightless', line: "My ship has no lamps. It doesn't need them.",
    from: 'deck', at: (api) => api.state.tile(0, 38.9) },
  hooks: {
    setup(api) {
      const S = api.state, h = S.h = api.spawnShip('dreadnought', { deck: true }), W = h.info.walk;
      h.place(api.OX + DX, api.OY + DZ, 0, 0); h.root.position.set(h.x, 0, h.y); h.root.updateMatrixWorld(true);   // (worldOf before her first tick)
      S.tile = (x, z) => h.worldOf(x, 0, z).slice(0, 2);
      // her turrets, in the order the push meets them: A and B forward, D mid-deck, C aft
      S.turrets = h.info.spikes.map((sp) => {
        const T = W.turrets.find((q) => q.id === sp.id), g = sp.turret, cradle = g.children.find((c) => c.children[0] && c.children[0].name === 'cradle');
        let hatch = null; g.traverse((m) => { if (m.isMesh && /furnace/.test(m.name)) hatch = m; });
        const [cx, cy, cl] = h.worldOf(T.x, T.y + T.bh, T.z);
        return { id: sp.id, T, g, cradle, hatch, marker: sp.marker, rest: sp.rest, base: BASE[sp.id], amp: AMP[sp.id], aim: BASE[sp.id], want: null, cx, cy, cl, seg: SEG_OF[sp.id], cd: 3 + Math.random() * 3, spiked: false, ph: Math.random() * 6 };
      }).sort((a, b) => a.T.z - b.T.z);
      // she holds them to her own aim (the model's idle traverse, unless a sweep or a spike says otherwise)
      const a0 = h.ship.anim;
      h.ship.anim = (t, dt) => {
        a0(t, dt);
        for (const r of S.turrets) {
          const idle = S.baking ? r.base : r.base + Math.sin(t * 0.16 + r.ph) * r.amp * 0.35, want = r.spiked ? r.aim : r.want ?? idle;
          r.aim = S.baking ? r.base : r.aim + clampAbs(wrap(want - r.aim), (r.want != null ? 1.6 : 0.3) * (dt || 0.016));
          r.g.rotation.y = r.aim;
          if (r.cradle) r.cradle.rotation.x = r.spiked ? -0.13 : 0.07 + 0.04 * Math.sin(t * 0.23 + r.ph);
        }
      };
      // her walk map: baked under a cap of 6.2 (her tower's first tier, the superfiring barbette and the port deckhouse
      // stand over the usual 4.5, which would see through them to the deck), the turrets square and their guns left out
      // (they traverse over the deck: overhead, not in the way)
      S.baking = true; for (const r of S.turrets) if (r.cradle) r.cradle.visible = false;
      h.bake = (o) => bakeDeck(h, { cap: h.deckY + 6.2, ...o });
      S.deck = api.addDeck(h, { levels: [0, W.FC_H, h.info.sternWalk.y] });
      S.baking = false; for (const r of S.turrets) if (r.cradle) r.cradle.visible = true;
      // the plank from the Dawnwake's quarterdeck to her stem
      const s = api.sAt(PLANK.dz), b = h.worldOf(PLANK.local[0], W.FC_H, PLANK.local[1]);
      S.plank = api.join([api.OX - api.inner(s) + 0.7, api.OY + PLANK.dz, api.QD_H], [b[0], b[1], b[2] / api.LV], { w: 0.85, plank: true });
      S.hits = 0; S.sweeps = 0; S.globalT = 5; S.shellT = 9; S.trickleT = 0; S.crewT = 12;
    },
    start(api) {
      const S = api.state;
      S.meter = api.meter('Her guns on the Dawnwake', { color: '#ff5a3a', full: 'reward', note: 'spike her turrets' });
      for (const r of S.turrets) {   // the breech hatch: where the push spikes it
        const at = approach(api, r);
        r.mark = api.mark(at[0], at[1], `Spike Turret ${r.id}`, () => spike(api, r), '#ff8a3a'); r.mark.reach = 1.7; r.at = at;
      }
    },
    onWave(api, n, w) {
      const S = api.state;
      if (n === 0 && !S.plank.isOpen) boarding(api);
      else if (n === 1 || n === 3) api.bark('hatches', 1.5);   // Pip, from the Dawnwake's foretop
      let champ = w.champion || 0, uniq = w.unique || 0;
      for (let i = 0; i < (w.deck || 0); i++) {
        const rank = uniq-- > 0 ? 'unique' : champ-- > 0 ? 'champion' : 'normal';
        api.later(0.4 + i * 0.45 + (n === 0 ? 3 : 0), () => upHatch(api, rank, n), n);
      }
    },
    onBoss(api, m, which) {
      // at sea her captains' boarders come off boats; aboard her own ship his come up her hatches (tick)
      m.captain = { ...m.captain, moves: m.captain.moves.filter((q) => q !== 'crew' && q !== 'barrage') };
      if (which === 'final') { api.state.crewT = 9; api.state.cmdr = m; }
    },
    tick(api, dt) {
      const S = api.state, pl = api.p(), run = api.run;
      lights(api);
      if (run.phase === 'victory' || run.phase === 'done') return;
      overboard(api, dt);
      const live = S.turrets.filter((r) => !r.spiked);
      if (S.meter) S.meter.note = live.length ? `${live.length} turret${live.length > 1 ? 's' : ''} firing: spike them` : 'her guns are silent';
      // her big guns shell the Dawnwake while they're unspiked (the meter): water columns round her, now and then a hit
      const big = live.filter((r) => r.id !== 'D');
      if (big.length && (S.shellT -= dt) <= 0) {
        S.shellT = 10 + Math.random() * 3;
        const r = big[Math.floor(Math.random() * big.length)];
        muzzle(api, r, angOf(r.aim), 0.6);
        for (let i = 0; i < 2; i++) api.later(1.1 + i * 0.25, () => {
          const z = -14 + Math.random() * 30, x = api.OX + (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 5);
          if (Math.random() < 0.35) { const t = api.near(api.OX + (Math.random() - 0.5) * 6, api.OY + z * 0.6); api.burst(t[0], t[1], 10, 'fire', 16, 4); api.smoke(t[0], t[1], 8, '#2a2220', 6, 14); }
          else api.splash(x, api.OY + z, 1.2, true);
          api.sfx('explode', 0.35);
        });
        if (S.meter) S.meter.add(0.07 * big.length);
      }
      // a turret near the hero sweeps the deck: one at a time
      S.globalT -= dt;
      for (const r of live) r.cd -= dt;
      if (pl && S.globalT <= 0) {
        const r = live.filter((q) => q.cd <= 0 && !q.busy && Math.hypot(pl.x - q.cx, pl.y - q.cy) < 12.5).sort((a, b) => Math.hypot(pl.x - a.cx, pl.y - a.cy) - Math.hypot(pl.x - b.cx, pl.y - b.cy))[0];
        if (r) { sweep(api, r); S.globalT = 4.2; r.cd = 7.5 + Math.random() * 2; }
      }
      // nothing left to come and a turret still to spike (the Commodore waits): more of her crew come up ahead
      const foes = [...api.live].filter((m) => !m.dead && !m.captain);
      if (holding(api) && run.phase === 'waves' && run.wave >= api.v.waves.length - 1 && foes.length < 2 && (S.trickleT -= dt) <= 0) {
        S.trickleT = 3.5;
        for (let i = 0; i < 2; i++) api.later(0.2 + i * 0.4, () => upHatch(api, 'normal', 98));
      }
      // the Commodore's watch comes up the stern stairs to him
      if (S.cmdr && !S.cmdr.dead && !S.cmdr.entering && (S.crewT -= dt) <= 0) {
        S.crewT = 12 + Math.random() * 3;
        for (let i = 0; i < 2; i++) api.later(i * 0.4, () => upHatch(api, 'normal', 97, 4));
        api.floatText(S.cmdr.x, S.cmdr.y, 90, 'ALL HANDS AFT!', '#ffb070', 16);
      }
    },
    holdFinal: (api) => holding(api),
    objective(api) {   // the next turret to spike, then the Commodore on the stern walk, else the nearest of her crew
      const S = api.state, pl = api.p(), r = S.turrets && S.turrets.find((q) => !q.spiked);
      if (r && r.at) return { x: r.at[0], y: r.at[1], reach: 1.3, use: () => spike(api, r) };
      const c = api.run.capM;
      if (c && !c.dead) return { x: c.x, y: c.y, reach: 1.5 };
      const f = pl && [...api.live].filter((m) => !m.dead && !m.entering).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
      if (f) return { x: f.x, y: f.y, reach: 1.5 };
      const t = S.tile(0, 38.6); return { x: t[0], y: t[1], reach: 2 };
    },
    onVictory(api) { for (const r of api.state.turrets) r.want = null; },
  },
};

/** The walkable tile nearest a turret's breech hatch (at its rear: the one place its guns can't reach), on the lane. */
function approach(api, r) {
  const S = api.state, [hx, hy] = S.tile(r.rest[0], r.rest[2]), from = onDeck(api, 4.8, -16, 2) || S.tile(4.8, -16);
  let best = null, bd = Infinity;
  for (let dy = -3.5; dy <= 3.5; dy += 0.5) for (let dx = -3.5; dx <= 3.5; dx += 0.5) {
    const q = [Math.floor(hx + dx) + 0.5, Math.floor(hy + dy) + 0.5], d = Math.hypot(q[0] - hx, q[1] - hy);
    if (d >= bd || d > 3.6 || Math.hypot(q[0] - r.cx, q[1] - r.cy) < r.T.r + 0.3) continue;
    if (!api.walk(q[0], q[1]) || api.map.deck[api.map.tileIdx(q[0], q[1])] !== S.deck.id || !api.map.findPath(from[0], from[1], q[0], q[1], 40000)) continue;
    best = q; bd = d;
  }
  return best || S.tile(r.rest[0], r.rest[2]);
}
/** A walkable tile on her deck near ship-local (x, z), or null. */
function onDeck(api, x, z, r = 1.6) {
  const S = api.state, [tx, ty] = S.tile(x, z), ok = (q) => q && api.walk(q[0], q[1]) && api.map.deck[api.map.tileIdx(q[0], q[1])] === S.deck.id;
  if (ok([tx, ty])) return [tx, ty];
  for (let i = 0; i < 8; i++) { const q = api.map.randomNear(tx, ty, r); if (ok(q)) return q; }
  return null;
}
/** The stretch of her deck her crew come up in: ahead of the hero, but not past the next turret still to spike. */
function frontier(api) {
  const S = api.state, pl = api.p(), onHer = pl && api.map.deck[api.map.tileIdx(pl.x, pl.y)] === S.deck.id;
  const hs = onHer ? segOfZ(pl.y - (api.OY + DZ)) : -1, next = S.turrets.find((r) => !r.spiked);
  return Math.max(0, Math.min(hs + 1, next ? next.seg : 4, 4));
}
/** One of her crew comes up a hatch ahead of the hero (a puff of stokehold smoke, fading in). */
function upHatch(api, rank, wave, seg = frontier(api)) {
  const pl = api.p(), list = SPOTS[seg].slice().sort(() => Math.random() - 0.5);
  let at = null;
  for (const [x, z] of list) { const q = onDeck(api, x, z); if (q && (!pl || Math.hypot(q[0] - pl.x, q[1] - pl.y) > 2.5)) { at = q; break; } }
  at ||= onDeck(api, ...SPOTS[seg][0], 3);
  if (!at) return null;
  const m = api.spawnOnDeck(null, rank, at, wave);
  m.alpha = 0; let t = 0;
  api.scripted((dt) => { t += dt; m.alpha = t < 0.4 ? t / 0.4 : undefined; return t < 0.4 && !m.dead; });
  api.smoke(m.x, m.y, 4, '#2a1a14', 5, 12); spawn({ type: 'glow', x: m.x, y: m.y, z: 6, vz: 20, life: 0.5, size: 22, size1: 4, color: '#ff6a2a', add: true });
  return m;
}

/** The boarding: the plank comes down onto her forecastle, Brask's line, the push begins. */
function boarding(api) {
  const S = api.state, B = api.cast.brask, head = S.tile(PLANK.local[0], PLANK.local[1]);
  const tower = () => { const [x, y, l] = S.h.worldOf(0, 6, -16); return api.flat(x, y, l); };
  const headAt = () => api.flat(head[0], head[1], api.lvAt(...head), 30);
  const bow = () => { const [x, y, l] = S.h.worldOf(0, 3.5, -29); return api.flat(x, y, l); };
  api.scene('lightless_board', [
    api.fit(() => [api.faceOf(api.p(), 0.4), tower(), headAt()], 0.9, 1.8, { wait: true, min: 0.45 }),
    { do: () => { S.plank.open(); api.sfx('thud', 1); api.splash(head[0] - 4, head[1] + 1, 0.7); camera.shake(4); } },
    { wait: 0.6 },
    // Brask at her helm, The Lightless's bow and turrets looming beyond her
    api.on(() => api.mix(api.faceOf(B), bow(), 0.3), 1.4, 1.4, { pace: 900, wait: true }),
    api.say(B, "He fell on one of the Fiend's knights once. Let's give him a ship to aim at."),
    api.on(headAt, 1.3, 1.2, { wait: true }),
    { card: ['BOARD HER AT THE BOW', 'Spike her turrets at their breech hatches'], dur: 2.6 },
    api.backToHero(0.9),
  ]);
}

/** A turret traverses and sweeps its guns' blast across the deck: three arcs in turn, each telegraphed. */
function sweep(api, r) {
  const S = api.state, pl = api.p();
  const clampA = (a) => angOf(r.base + clampAbs(wrap(thOf(a) - r.base), r.amp));
  const a0 = clampA(Math.atan2(pl.y - r.cy, pl.x - r.cx)), side = Math.random() < 0.5 ? -1 : 1, STEP = 0.42, HALF = 0.26, LEN = 11;
  const arcs = [-1, 0, 1].map((i) => clampA(a0 + side * i * STEP));
  r.busy = true; S.sweeps++;
  if (S.sweeps === 1 || Math.random() < 0.5) api.bark('turret');
  api.sfx('thud', 0.6); api.floatText(r.cx, r.cy, 60, 'TRAVERSING', '#ff9a5a', 13, { life: 1.1 });
  arcs.forEach((a, i) => {
    const dur = 1.5 + i * 0.5;
    api.addEffect(new Telegraph({ kind: 'cone', x: r.cx, y: r.cy, ang: a, half: HALF, len: LEN, dur, color: '#ff4a1a' }), 'ground');
    api.later(i ? dur - 0.5 : 0.01, () => { if (!r.spiked) r.want = thOf(a); });
    api.later(dur, () => {
      if (r.spiked) return;
      boom(api, r, a, HALF, LEN);
      if (i === 2) { r.busy = false; api.later(1.2, () => { if (!r.busy) r.want = null; }); }
    });
  });
}
/** Her guns' flash and smoke at the muzzles, toward angle a. */
function muzzle(api, r, a, k = 1) {
  const L = r.T.r + (r.id === 'D' ? 3.6 : 5.8), x = r.cx + Math.cos(a) * L, y = r.cy + Math.sin(a) * L, z = Math.max(0, r.cl - api.lvAt(x, y)) * api.HS + 8;
  spawn({ type: 'glow', x, y, z, life: 0.3, size: 70 * k, size1: 8, color: '#ffd080', add: true });
  api.smoke(x, y, z, '#2a2420', 6, 18 * k);
  api.sfx('explode', 0.7 * k); camera.shake(5 * k);
}
/** One arc of the sweep: the blast along it hits whoever stands in it, his foes and hers alike. */
function boom(api, r, a, half, len) {
  const S = api.state, w = api.world;
  muzzle(api, r, a, 1.2);
  for (let d = 2.5; d < len; d += 2.2) { const x = r.cx + Math.cos(a) * d, y = r.cy + Math.sin(a) * d; api.burst(x, y, 12, 'fire', 8, 3); }
  api.splash(r.cx + Math.cos(a) * 28, r.cy + Math.sin(a) * 28, 1.4, true);
  const inArc = (t) => { const d = Math.hypot(t.x - r.cx, t.y - r.cy); return d < len && d > 1 && Math.abs(wrap(Math.atan2(t.y - r.cy, t.x - r.cx) - a)) < half + 0.4 / d; };
  const ex = new Set();
  for (const t of w.hostiles('enemy', r.cx, r.cy, len)) if (inArc(t)) { aoe(w, null, t.x, t.y, 0.3, api.base.dmg * 2.4, 'fire', { team: 'enemy', knock: 1.4, exclude: ex }); if (t.isPlayer) S.hits++; }
  for (const t of w.hostiles('player', r.cx, r.cy, len)) if (inArc(t) && !t.captain) aoe(w, null, t.x, t.y, 0.3, api.base.dmg * 1.5, 'fire', { team: 'player', knock: 1.4, exclude: ex });
}
/** Spiked at its breech hatch: the guns droop and stop, the hatch's fire goes out. */
function spike(api, r) {
  if (r.spiked) return;
  const S = api.state;
  r.spiked = true; r.want = null; r.busy = false;
  if (r.mark) { api.unmark(r.mark); r.mark = null; }
  if (r.hatch) { r.hatch.material = r.hatch.material.clone(); r.hatch.material.emissiveIntensity = 0.12; r.hatch.material.color.multiplyScalar(0.3); }
  const [x, y] = r.at;
  api.sparkle(x, y, 40, '#ffd080', 24, 0.6); api.smoke(x, y, 40, '#3a3230', 10, 16);
  api.addEffect(new api.Ring(x, y, 0.2, 2.2, 0.5, '#ffb060', 5));
  api.sfx('thud', 1); api.sfx('gate', 0.5); camera.shake(4);
  api.floatText(x, y, 70, 'SPIKED!', '#ffd080', 18);
  const left = S.turrets.filter((q) => !q.spiked).length;
  api.banner(`TURRET ${r.id} SPIKED`, left ? `${left} still turning` : 'Her guns are silent. The Commodore waits aft.');
  if (!left && S.meter) { S.meter.hide(); S.meter = null; }
}

/** The breech hatches still live glow hot (the brightest thing on her deck); at night her grates glow dim red too. */
function lights(api) {
  const S = api.state, t = api.world.time;
  for (const r of S.turrets) {
    if (r.spiked) continue;
    const p = r.marker.position.clone(); r.marker.parent.localToWorld(p);
    const z = Math.max(0, p.y * api.LV - api.lvAt(p.x, p.z)) * api.HS, k = 0.8 + 0.2 * Math.sin(t * 6 + r.ph);
    addLight(p.x, p.z, 3.2, 1.1 * k, z, '#ff7a30');
    if (Math.random() < 0.3) spawn({ type: 'glow', x: p.x + (Math.random() - 0.5) * 0.5, y: p.z, z, vz: 14, life: 0.5, size: 4, size1: 0, color: '#ffb060', add: true });
  }
  if (!api.world.darkK) return;
  for (const [x, z] of [[4.6, -11], [4.4, -24.6], [2.2, 1.4], [-2, 6.6], [3, 26.4], [0, 38.6], [4.6, 18], [4.8, -30]]) {
    const [tx, ty] = S.tile(x, z); addLight(tx, ty, 4.5, 0.55, 16, '#ff5a2a');
  }
}

/** A foe knocked off the deck (a blast, a strafe) and stranded over the water goes over the side: a splash, gone. */
function overboard(api, dt) {
  for (const m of api.live) {
    if (m.dead || m.entering || api.walk(m.x, m.y)) { m.offT = 0; continue; }
    if ((m.offT = (m.offT || 0) + dt) > 1.5) { api.splash(m.x, m.y, 0.8); api.kill(m); }
  }
}
