// #7 FLIGHT DECK (docs/PIRATE_SEAS.md): Farhaven Light. The Brass Fraternity's carrier, The Anvil, lies across the
// Dawnwake's stern (tools/seaship3d_carrier.js as an arena deck, turned bow to the east with her island on the far side)
// and a brow runs up from the quarterdeck onto her flight deck. Her waves rise on the two deck-edge elevators from the
// lit hangar (when the hero is far from both, half of them climb the gun-gallery ladders beside him). Her catapults
// launch down telegraphed lanes: a Kestrel off lane 1 comes back on strafing runs across the deck (the parked jets are
// cover), a Thunderhawk off lane 2 comes round and drops a torpedo at the Dawnwake's starboard side (Pip calls both),
// and every torpedo that lands fills her hull meter (full: a lighter chest). Jam both catapults (stand at a shuttle
// while it's spiked) to stop the launches; Lord Thundershroud waits on the island's flag bridge until both are jammed.
import { G } from '../../state.js';
import { camera, isoX, HH, HW } from '../../core/view.js';
import { aoe } from '../combat.js';
import { Telegraph, addEffect, sparkle, burst, smoke } from '../../gfx/vfx.js';

// the Fraternity: renegade Gunners (Air Pirate pistoliers, powdermen, grenadiers), a few heavies to hold the line
const GUNS = ['ap_blackpowder_pistolier', 'ap_twin_pistol_ratliner', 'ap_copper_goggle_powderman', 'ap_crow_s_nest_sharpshooter', 'ap_cinderbomb_grenadier', 'ap_lantern_bomb_mechanic'];
const HEAVY = ['ap_last_ratline_enforcer', 'ap_iron_rib_captain_s_guard', 'ap_powder_keg_runner', 'ap_quartermaster_breaker'];
// The Anvil across the Dawnwake's stern: ship-local (lx, lz) is tile (CX - lz, CY + lx) (heading -90 degrees: her bow
// to +x, her island and port side up the screen toward the Dawnwake, whose stern lies against her port side aft)
const CX = 110, CY = 92.6, HEAD = -Math.PI / 2;
const L2W = (lx, lz) => [CX - lz, CY + lx], W2L = (x, y) => [y - CY, CX - x];
const BROW = [[60.5, 76.4, 2.2], [60.5, CY - 12.4 + 1.7, 3.8]];   // her quarterdeck to the carrier's port deck edge
const CAT_NAME = ['ONE', 'TWO'];

export default {
  id: 'flight_deck', number: 7, name: 'Flight Deck', light: 'Farhaven Light', weather: 'day', weatherName: 'Clear Skies',
  blurb: 'The Anvil lies across our stern. Her catapults are hot.', dark: 0,
  fleet: ['carrier', 'kestrel', 'thunderhawk', 'torpedo'],
  size: [196, 118],
  noBoats: true,   // (tools/tests/seabattle.js: her waves come up the lifts, not in boats)
  waves: [
    { boats: 0, n: [6], champion: 0, label: 'Over the brow, and up her lifts', brow: 3, lifts: [[0, 3]] },
    { boats: 0, n: [5], champion: 1, label: 'Up the lifts from the hangar', lifts: [[1, 3], [0, 2]] },
    { boats: 0, n: [6], champion: 2, unique: 1, mid: true, label: 'Both lifts coming up', lifts: [[0, 3], [1, 3]] },
    { boats: 0, n: [6], champion: 2, label: 'Up the lifts from the hangar', lifts: [[1, 3], [0, 3]] },
    { boats: 0, n: [7], champion: 3, unique: 1, label: 'Every lift she has', lifts: [[0, 4], [1, 3]] },
  ],
  mid: { id: 'ap_warden_of_the_rookery', name: 'Hangar Chief Bolt', title: "Master of The Anvil's lifts", line: 'Lifts up! Every gun on deck!', from: 'deck',
    at: (api) => api.state.liftAt(0) },
  final: { id: 'ap_lord_thundershroud', name: 'Lord Thundershroud', title: 'Air Boss of The Anvil', line: "Clear the deck. I'm launching.", from: 'deck',
    at: (api) => api.state.bossAt, stay: true },
  hooks: {
    setup(api) {
      const S = api.state, h = S.h = api.spawnShip('carrier', { deck: true, speed: 0 }), I = h.info;
      h.place(CX, CY, HEAD, 0);
      if (h.RIG) h.RIG.uRigY.value = 1e4;   // her island, jets and deflectors stay solid at the game's zoom (no rig to fade)
      I.lift[0] = I.lift[1] = 0;   // both lifts up at the flight deck while the walk map bakes
      const B = I.bossDeck;
      S.deck = api.addDeck(h, { levels: [0, B.y] });
      S.D = S.deck.id;
      // the flag bridge's outside stair (info.bossDeck.stair): from the flight deck up to Thundershroud's platform
      const sx = (B.stair.x0 + B.stair.x1) / 2, foot = h.worldOf(sx, 0, B.stair.z0 - 0.6), top = h.worldOf(sx, B.y, B.stair.z1 + 0.5);
      api.join([foot[0], foot[1], foot[2] / api.LV], [top[0], top[1], top[2] / api.LV], { w: 1.0 }).open();
      S.bossAt = L2W((B.x0 + B.x1) / 2 + 0.3, (B.z0 + B.z1) / 2 + 0.4);
      // the brow from the Dawnwake's quarterdeck up onto her flight deck
      S.brow = api.join(BROW[0], BROW[1], { w: 0.9, plank: true }); S.brow.open();
      // the elevators: platform rects in tiles, their middles, the tiles they block while down
      S.el = I.elevators.map((e, i) => {
        const a = L2W(e.x0, e.z0), b = L2W(e.x1, e.z1);
        const r = { i, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]), f: 0, st: 'up', queue: [], riders: [], upT: 9, blocked: false, tiles: [] };
        r.c = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
        for (let y = Math.floor(r.y0 + 0.3); y < r.y1 - 0.3; y++) for (let x = Math.floor(r.x0 + 0.3); x < r.x1 - 0.3; x++) { const t = api.map.tileIdx(x + 0.5, y + 0.5); if (api.map.deck[t] === S.D && !api.map.block[t]) r.tiles.push(t); }
        return r;
      });
      S.liftAt = (i) => S.el[i].c;
      S.raise = (i, n = 3) => raise(api, S.el[i], Array.from({ length: n }, () => ({ art: pick(GUNS), rank: 'normal' })), 95);   // (tests)
      // the catapults: the lane (from the jet's spot to the bow end), the jam station beside the shuttle, launch timers
      S.cats = I.catapults.map(([x, zb, za], i) => {
        const side = x < 0 ? -1 : 1, spot = I.jetSpots.find((q) => !q[4] && Math.sign(q[0]) === side) || [x, 0, za - 4];
        return { i, x, za, zb, side, from: L2W(x, spot[2] + 1), to: L2W(x, zb - 2), jam: deckNear(api, L2W(x + side * 1.9, za - 0.5)), jammed: false, t: 10 + i * 8, jet: I.catJets[i], kind: i ? 'thunderhawk' : 'kestrel' };
      });
      // the parked jets: cover from the strafing runs
      S.cover = I.jetSpots.filter((q) => q[4]).map(([x, , z]) => L2W(x, z));
      // the jets and torpedoes she flies: built now (a model built mid-fight is a hitch), reused, hidden while unused
      S.pool = { kestrel: [], thunderhawk: [], torpedo: [] };
      for (const [k, n] of [['kestrel', 3], ['thunderhawk', 1], ['torpedo', 2]]) for (let i = 0; i < n; i++) { const q = api.spawnShip(k); if (q) { q.setAlpha(0); q.place(CX, CY + 200); S.pool[k].push(q); } }
      S.jets = []; S.torps = []; S.idle = 0; S.fill = 0; S.jamming = null; S.hull = null; S.bossT = 0; S.bossMove = 0; S.holding = {};
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => drawTorpedoes(api, ctx) });
    },
    start(api) {
      const S = api.state;
      // her catapult crews at their stations (they keep to the shuttles until the hero comes)
      S.guards = [];
      for (const c of S.cats) for (let k = 0; k < 2; k++) {
        const m = api.spawnOnDeck(k ? pick(HEAVY) : pick(GUNS), k ? 'champion' : 'normal', L2W(c.x - c.side * (1.4 + k * 1.4), c.za - 2 - k * 2), 96);
        m.hunter = false; m.awake = false; S.guards.push(m);
      }
      S.marks = S.cats.map((c) => api.mark(c.jam[0], c.jam[1], `Jam Catapult ${c.i + 1}`, () => jam(api, c), '#ffb040'));
      S.hull = api.meter("The Dawnwake's hull", { color: '#6ab4ff', full: 'reward', note: 'jam both catapults (0/2)' });
    },
    onWave(api, n, w) {
      const S = api.state;
      // the deck crew waiting at the brow's head come straight over it
      for (let i = 0; i < (w.brow || 0); i++) api.later(0.3 + i * 0.4, () => {
        const m = api.spawnOnDeck(pick(GUNS), 'normal', [BROW[1][0] + rand(-2, 2), BROW[1][1] + rand(1, 3)], n); m.awake = true;
      }, n);
      let champ = w.champion || 0, uniq = w.unique || 0;
      (w.lifts || []).forEach(([li, k], j) => api.later(0.8 + j * 2.4, () => {
        const crew = Array.from({ length: k }, () => ({ art: uniq > 0 ? pick(HEAVY) : pick(GUNS.concat(HEAVY.slice(0, 2))), rank: uniq-- > 0 ? 'unique' : champ-- > 0 ? 'champion' : 'normal' }));
        // far from both lifts: half of them climb the gun-gallery ladders beside the hero instead
        const P = api.p(), far = P && Math.min(...S.el.map((e) => Math.hypot(e.c[0] - P.x, e.c[1] - P.y))) > 24;
        const lift = far ? crew.splice(0, Math.ceil(crew.length / 2)) : crew;
        raise(api, nearestLift(api, li, far), lift, n);
        if (far && crew.length) gallery(api, crew, n);
      }, n));
    },
    onBoss(api, m, which) {
      const S = api.state;
      m.moveT = Infinity;   // (the director's captain specials swing from the Dawnwake's yard: their own moves are below)
      S.bossMove = which === 'mid' ? 5 : 1.2;   // Thundershroud launches the moment his line is done
      if (which !== 'mid') return;
      // Hangar Chief Bolt comes up on the port lift under his card
      const e = S.el[0], depth = S.h.info.liftDepth * api.VZ;
      e.st = 'boss'; e.queue = []; e.f = 1; S.h.info.lift[0] = 1; block(api, e, true);
      m.z = -depth; let t = -0.4;
      api.scripted((dt) => {
        t += dt; const k = Math.max(0, Math.min(1, t / 3.4)), f = 1 - k * k * (3 - 2 * k);
        e.f = f; S.h.info.lift[0] = f; if (!m.dead) m.z = -f * depth;
        if (k >= 1) { e.st = 'up'; e.upT = 0; block(api, e, false); m.z = 0; api.sfx('thud', 0.9); camera.shake(4); return false; }
        return true;
      });
    },
    tick(api, dt) {
      const S = api.state, pl = api.p(), run = api.run;
      for (const e of S.el) liftTick(api, e, dt);
      jetsTick(api, dt);
      if (run.phase === 'victory' || run.phase === 'done') return;
      // the jam in hand: he stands at the shuttle while it's spiked
      const J = S.jamming;
      if (J) {
        if (!pl || Math.hypot(pl.x - J.c.jam[0], pl.y - J.c.jam[1]) > 1.9) { S.jamming = null; api.floatText(J.c.jam[0], J.c.jam[1], 70, 'JAM INTERRUPTED', '#ff9060', 14); }
        else {
          J.t += dt; if ((J.sp = (J.sp || 0) - dt) <= 0) { J.sp = 0.25; sparkle(J.c.jam[0], J.c.jam[1], 30, '#ffd070', 6, 0.5); api.sfx('hit', 0.3); }
          if (J.t >= 2.4) jammed(api, J.c);
        }
      }
      for (const c of S.cats) if (!c.jammed && (c.t -= dt) <= 0) { c.t = c.i ? 24 : 16; launch(api, c); }
      if (S.hull) S.hull.note = S.cats.every((c) => c.jammed) ? 'the catapults are jammed' : `jam both catapults (${S.cats.filter((c) => c.jammed).length}/2)`;
      // nothing within reach for a moment: the next lift comes up now, or a few of her crew climb the galleries beside him
      const near = [...api.live].some((m) => !m.dead && m.targetable !== false && !m.entering && pl && Math.hypot(m.x - pl.x, m.y - pl.y) < 13);
      S.idle = near || !pl ? 0 : S.idle + dt;
      if (S.idle > 0.8) {
        S.idle = 0;
        const rising = S.el.find((e) => e.st !== 'up' && e.st !== 'boss' && (e.queue.length || e.riders.length));
        const tm = run.timers.filter((q) => q[2] !== undefined && q[3] !== 'hold').sort((a, b) => a[0] - b[0])[0];
        if (rising) rising.rush = true;
        else if (tm) tm[0] = 0;
        else if (S.fill <= 0 && foes(api) < 7 && /waves|mid|final/.test(run.phase)) {
          S.fill = 3; gallery(api, [{ art: pick(GUNS), rank: 'normal' }, { art: pick(GUNS.concat(HEAVY)), rank: 'normal' }], 95);
        }
      }
      S.fill -= dt;
      // the captains' own moves: the Hangar Chief leaps and calls his lifts; Thundershroud calls strafing runs and his hands
      const m = run.phase === 'mid' ? run.midM : run.phase === 'final' ? run.capM : null;
      if (m && !m.dead && !m.entering && pl && (S.bossMove -= dt) <= 0) {
        S.bossMove = m === run.capM ? 6.5 : 8;
        if (m === run.capM) {
          if ((S.bossT++) % 2 === 0 || foes(api) >= 7) { api.floatText(m.x, m.y, 100, 'STRAFE THE DECK!', '#ffd070', 16); strafe(api, null); }
          else { api.floatText(m.x, m.y, 100, 'ALL HANDS!', '#ffb070', 16); raise(api, nearestLift(api, 0, true), [{ art: pick(GUNS), rank: 'normal' }, { art: pick(GUNS), rank: 'normal' }, { art: pick(HEAVY), rank: 'champion' }], 95); }
        } else if (Math.random() < 0.6 && Math.hypot(pl.x - m.x, pl.y - m.y) < 14) {
          const to = deckNear(api, [pl.x, pl.y]);
          addEffect(new Telegraph({ kind: 'circle', x: to[0], y: to[1], r: 2.2, dur: 1.1 }), 'ground');
          api.leap(m, [m.x, m.y, api.lvAt(m.x, m.y)], to, { dur: 1.1, arc: 160 });
        } else if (foes(api) < 7) { api.floatText(m.x, m.y, 100, 'LIFTS UP!', '#ffb070', 16); raise(api, nearestLift(api, 0, true), [{ art: pick(GUNS), rank: 'normal' }, { art: pick(GUNS), rank: 'normal' }], 95); }
      }
      // his fall: the Fraternity throw down their guns
      if (run.capM && run.capM.dead) for (const q of api.live) if (!q.dead && q !== run.capM) { q.dead = true; q.hp = 0; smoke(q.x, q.y, 10, '#5a5048', 4, 8); }
    },
    holdFinal(api) { return !api.state.cats.every((c) => c.jammed); },
    onVictory(api) {
      const S = api.state;
      for (const j of S.jets.slice()) dropJet(api, j);
      for (const e of S.el) e.queue = [];
      if (S.hull) S.hull.hide();
    },
    objective(api) {
      const S = api.state, run = api.run, pl = api.p();
      if (run.phase === 'final' && run.capM && !run.capM.dead) return { x: run.capM.x, y: run.capM.y, reach: 1.6 };
      if (S.jamming) return { x: S.jamming.c.jam[0], y: S.jamming.c.jam[1], reach: 0.9, use: () => jam(api, S.jamming.c) };
      const open = S.cats.filter((c) => !c.jammed);
      if (open.length) {
        const c = pl ? open.reduce((a, b) => (Math.hypot(b.jam[0] - pl.x, b.jam[1] - pl.y) < Math.hypot(a.jam[0] - pl.x, a.jam[1] - pl.y) ? b : a)) : open[0];
        return { x: c.jam[0], y: c.jam[1], reach: 0.9, use: () => jam(api, c) };
      }
      if (run.phase === 'mid' && run.midM && !run.midM.dead) return { x: run.midM.x, y: run.midM.y, reach: 1.6 };
      const c = S.el[run.wave % 2] || S.el[0];
      return { x: c.c[0], y: c.c[1] + 4, reach: 6 };
    },
  },
};
const rand = (a, b) => a + Math.random() * (b - a);
/** Pip's calls (docs/PIRATE_SEAS.md barks): the hero is aboard the carrier, so off screen she is heard from the
 *  Dawnwake's signal lamp, not "the foretop" (the director's bark); same bubble, one call 15 s apart. */
const PIP_CALL = { jets: 'Jets off the catapult!', torpedo: 'Torpedo, starboard!' };
function pipCall(api, key) {
  const S = api.state, pip = api.world.npcs.find((n) => n.name === 'Pip Gannet'), text = PIP_CALL[key], t = api.world.time;
  if (!pip || G.cine || api.run.completed || t - ((S.called ||= {})[key] ?? -99) < 15) return;
  S.called[key] = t; pip.say(text, 2.6, 'excited'); api.sfx('note', 0.4, 1.6);
  const [sx, sy] = camera.toScreen(isoX(pip.x, pip.y), (pip.x + pip.y) * HH - (pip.lift || 0) - 60);
  if (sx < 40 || sx > G.W - 40 || sy < 40 || sy > G.H - 40) api.banner('', `Pip, on the signal lamp: "${text}"`);
}
/** Her crew on deck and coming (not the catapult crews, not the captains): the calls for more wait while it's crowded. */
const foes = (api) => [...api.live].filter((m) => !m.dead && !m.captain && m.wave !== 96).length + api.state.el.reduce((n, e) => n + e.queue.length, 0);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
/** A walkable tile of her flight deck near (x, y). */
function deckNear(api, [x, y]) {
  const m = api.map, ok = (q) => q && m.walkable(q[0], q[1]) && m.deck[m.tileIdx(q[0], q[1])] === api.state.D;
  if (ok([x, y])) return [x, y];
  for (let r = 0.6; r < 4; r += 0.6) for (let a = 0; a < 6.28; a += 0.5) { const q = [x + Math.cos(a) * r, y + Math.sin(a) * r]; if (ok(q)) return q; }
  return [x, y];
}

// ------------------------------------------------------------------ the elevators
/** Send a lift down to the hangar for these riders; it brings them up. A wave's lift keeps the wave coming (the
 *  director's coming(n) counts its tagged timers) until its riders step off. */
function raise(api, e, crew, wave) {
  const S = api.state;
  for (const c of crew) e.queue.push({ ...c, wave });
  if (wave >= 90 || S.holding[wave]) return;
  S.holding[wave] = true;
  const busy = () => S.el.some((q) => q.queue.some((c) => c.wave === wave) || q.riders.some((m) => m.wave === wave && m.entering && !m.dead));
  const again = () => api.run.timers.push([0.4, () => { if (busy()) again(); else S.holding[wave] = false; }, wave, 'hold']);
  again();
}
/** The lift by index, or (any) the one nearest the hero. */
function nearestLift(api, i, any) {
  const S = api.state, pl = api.p();
  if (!any || !pl) return S.el[i];
  return S.el.reduce((a, b) => (Math.hypot(b.c[0] - pl.x, b.c[1] - pl.y) < Math.hypot(a.c[0] - pl.x, a.c[1] - pl.y) ? b : a));
}
function block(api, e, on) {
  if (e.blocked === on) return;
  e.blocked = on; for (const t of e.tiles) api.map.block[t] = on ? 1 : 0;
  api.mapChanged();
}
const onLift = (e, o) => o && !o.dead && o.x > e.x0 - 0.2 && o.x < e.x1 + 0.2 && o.y > e.y0 - 0.2 && o.y < e.y1 + 0.2;
function liftTick(api, e, dt) {
  const S = api.state, I = S.h.info, depth = I.liftDepth * api.VZ, pl = api.p(), sp = e.rush ? 3 : 1;
  if (e.st === 'boss') return;
  if (e.st === 'up') {
    e.upT += dt;
    // down again for the next riders once nobody stands on it
    if (e.queue.length && e.upT > 1.2) {
      if (!onLift(e, pl) && ![...api.live].some((m) => onLift(e, m) && !m.static)) {
        e.st = 'lowering'; e.held = 0; block(api, e, true); api.sfx('gate', 0.4);
        addEffect(new Telegraph({ kind: 'circle', x: e.c[0], y: e.c[1], r: 3.4, dur: (1.6 + 2.2) / sp, color: '#ffd040' }), 'ground');
      } else if ((e.held = (e.held || 0) + dt) > 2.5) {   // someone holds it up: they climb the gun galleries instead
        e.held = 0; const q = e.queue.splice(0); for (const w of new Set(q.map((c) => c.wave))) gallery(api, q.filter((c) => c.wave === w), w);
      }
    }
  } else if (e.st === 'lowering') {
    e.f = Math.min(1, e.f + dt * sp / 1.6); I.lift[e.i] = e.f;
    if (e.f >= 1) {
      e.st = 'rising';
      // the riders step onto the platform down in the hangar
      const spots = [];
      for (let y = e.y0 + 1.3; y < e.y1 - 1; y += 1.6) for (let x = e.x0 + 1.3; x < e.x1 - 1; x += 1.6) spots.push([x, y]);
      spots.sort(() => Math.random() - 0.5);
      block(api, e, false);
      e.riders = e.queue.splice(0, 6).map((c, k) => {
        const [x, y] = spots[k % spots.length], m = api.spawnOnDeck(c.art, c.rank, [x, y], c.wave);
        m.x = x; m.y = y; m.z = -depth; m.targetable = false; m.boarding = true; m.entering = (dt2) => { m.animT += dt2; if (m.rush) e.rush = true; };
        return m;
      });
      block(api, e, true);
    }
  } else if (e.st === 'rising') {
    e.f = Math.max(0, e.f - dt * sp / 2.2); I.lift[e.i] = e.f;
    for (const m of e.riders) if (!m.dead) m.z = -e.f * depth;
    if (e.f <= 0) {
      e.st = 'up'; e.upT = 0; e.rush = false; block(api, e, false);
      for (const m of e.riders) if (!m.dead) { m.entering = null; m.targetable = true; m.boarding = false; m.rush = false; m.z = 0; m.cd = rand(0.2, 0.5); m.awake = true; }
      e.riders = [];
      api.sfx('thud', 0.7); smoke(e.c[0], e.c[1], 4, '#6a5a4a', 6, 12);
    }
  }
}
/** Up the gun-gallery ladders at the deck edge beside the hero. */
function gallery(api, crew, wave) {
  const S = api.state, map = api.map;
  const onDeck = (lx, lz) => { const [x, y] = L2W(lx, lz), t = map.tileIdx(x, y); return map.deck[t] === S.D && map.t[t]; };
  crew.forEach((c, k) => api.later(k * 0.5, () => {
    const pl = api.p(); if (!pl) return;
    const [hx, hz] = W2L(pl.x, pl.y);
    for (let tries = 0; tries < 10; tries++) {
      const side = Math.random() < 0.5 ? -1 : 1, lz = Math.max(-56, Math.min(60, hz + rand(-6, 6)));
      let lx = side * 2; while (Math.abs(lx) < 20 && onDeck(lx + side, lz)) lx += side * 0.5;
      if (Math.abs(lx) >= 20) continue;
      const to = deckNear(api, L2W(lx - side * 1.5, lz)), from = S.h.worldOf(lx + side * 1.4, -2.6, lz);
      const d = Math.hypot(to[0] - pl.x, to[1] - pl.y);
      if (d < 2.5 || d > 12) continue;
      const m = api.spawnOnDeck(c.art, c.rank, to, wave); m.x = to[0]; m.y = to[1];
      api.leap(m, from, to, { board: true, arc: 70, dur: 0.7 });
      return;
    }
  }, wave < 90 ? wave : undefined));
}

// ------------------------------------------------------------------ the catapults and the jets
function jam(api, c) {
  const S = api.state, pl = api.p();
  if (c.jammed || !pl || (S.jamming && S.jamming.c === c)) return;
  if (Math.hypot(pl.x - c.jam[0], pl.y - c.jam[1]) > 1.9) return;
  S.jamming = { c, t: 0 };
  api.floatText(c.jam[0], c.jam[1], 70, 'JAMMING THE SHUTTLE', '#ffd070', 14); api.sfx('swing', 0.6);
}
function jammed(api, c) {
  const S = api.state;
  S.jamming = null; c.jammed = true;
  api.unmark(S.marks[c.i]);
  api.sfx('explode', 0.8); burst(c.jam[0], c.jam[1], 30, 'fire', 20, 4); smoke(c.jam[0], c.jam[1], 20, '#3a3230', 14, 18); camera.shake(5);
  if (c.jet) { c.jet.setThrottle(0); c.jet.root.visible = true; }
  const both = S.cats.every((q) => q.jammed);
  api.banner(both ? 'BOTH CATAPULTS JAMMED' : `CATAPULT ${CAT_NAME[c.i]} JAMMED`, both ? 'No more jets off her deck' : 'One lane still launching');
}
/** A jet down a catapult lane: the lane telegraphed while it spools, then it runs the lane (anything in it is hit). */
function launch(api, c) {
  const S = api.state, [x0, y0] = c.from, [x1, y1] = c.to, ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  addEffect(new Telegraph({ kind: 'line', x: x0, y: y0, ang, len, w: 2.0, dur: 2.4, color: '#ff5030' }), 'ground');
  api.floatText(x0, y0, 70, 'LAUNCH!', '#ff9060', 16);
  if (c.jet) c.jet.setThrottle(1);
  api.later(2.4, () => {
    if (c.jammed) return;
    pipCall(api, 'jets');
    const h = take(api, c.kind); if (!h) return;
    if (c.jet) c.jet.root.visible = false;
    h.ship.setGear?.(true); h.ship.setThrottle?.(1);
    const j = { h, kind: c.kind, st: 'cat', t: 0, x0, y0, ang, len, hit: new Set(), runs: c.kind === 'kestrel' ? 2 : 1, cat: c };
    S.jets.push(j); placeJet(j, x0, y0, ang, S.h.deckY + 0.1);
    api.sfx('explode', 0.5); camera.shake(2);
  });
}
const headOf = (ang) => Math.atan2(-Math.cos(ang), -Math.sin(ang));   // a world direction to the models' heading (bows to -Z)
function placeJet(j, x, y, ang, air) { j.h.air = air; j.h.place(x, y, headOf(ang), 1.2); }
function dropJet(api, j) { give(api, j.h); const i = api.state.jets.indexOf(j); if (i >= 0) api.state.jets.splice(i, 1); }
/** A jet (or torpedo) from her pool, or a new one if they're all up; give() hides it and puts it back. */
function take(api, kind) {
  const h = api.state.pool[kind].pop() || api.spawnShip(kind); if (!h) return null;
  h.kindP = kind; h.setAlpha(1); h.ship.setThrottle?.(1); h.ship.fire?.(false); h.ship.setGear?.(false);
  return h;
}
function give(api, h) { h.setAlpha(0); h.place(CX, CY + 200, 0, 0); api.state.pool[h.kindP || h.kind].push(h); }
function jetsTick(api, dt) {
  const S = api.state, pl = api.p(), deckY = S.h.deckY;
  for (const j of S.jets.slice()) {
    j.t += dt;
    if (j.st === 'cat') {   // down the lane, off the horn and climbing
      const k = Math.min(1, j.t / 1.1), d = j.len * k * k + Math.max(0, j.t - 1.1) * 40;
      const x = j.x0 + Math.cos(j.ang) * d, y = j.y0 + Math.sin(j.ang) * d, air = deckY + 0.1 + Math.max(0, d - j.len * 0.8) * 0.22;
      placeJet(j, x, y, j.ang, air);
      if (j.t > 0.4) j.h.ship.setGear?.(false);
      if (k < 1 && !G.cine) for (const q of [pl, ...api.live]) if (q && !q.dead && !j.hit.has(q) && q.targetable !== false && segD(q.x, q.y, j.x0, j.y0, x, y) < 1.1) {
        j.hit.add(q); aoe(api.world, null, q.x, q.y, 0.4, api.base.dmg * 1.5, 'fire', { team: q === pl ? 'enemy' : 'player', knock: 1.4 });   // (aoe's team: whose blow it is)
      }
      if (j.t > 2.6) {
        j.st = 'away'; j.t = 0; j.h.setAlpha(0);
        if (j.cat.jet) api.later(4, () => { j.cat.jet.root.visible = true; j.cat.jet.setThrottle(j.cat.jammed ? 0 : 0.6); });   // the next one towed up
      }
    } else if (j.st === 'away') {   // round the far side of the sky; then a strafing run (a Kestrel) or a torpedo run (a Thunderhawk)
      if (j.t > (j.kind === 'kestrel' ? 4.5 : 5.5)) {
        j.t = 0;
        if (j.runs-- <= 0 || api.run.phase === 'victory') dropJet(api, j);
        else if (j.kind === 'kestrel') strafe(api, j); else torpedoRun(api, j);
      }
    } else if (j.run) j.run(dt);
  }
  // torpedoes running at her starboard side
  for (const tp of S.torps.slice()) {
    tp.t += dt; const k = Math.min(1, tp.t / tp.dur);
    tp.x = tp.a[0] + (tp.b[0] - tp.a[0]) * k; tp.y = tp.a[1] + (tp.b[1] - tp.a[1]) * k; tp.h.place(tp.x, tp.y, tp.head, 1.6);
    if (k >= 1) {
      give(api, tp.h); S.torps.splice(S.torps.indexOf(tp), 1);
      api.splash(tp.b[0] + 0.4, tp.b[1], 1.4, true); api.sfx('explode', 1); camera.shake(4);
      api.floatText(tp.b[0] - 1, tp.b[1], 90, 'HULL HIT!', '#ff7060', 18);
      if (S.hull && api.run.phase !== 'victory') S.hull.add(0.34);
    }
  }
}
const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)); return Math.hypot(px - ax - dx * k, py - ay - dy * k); };
/** A run along a line through (cx, cy), trimmed to her flight deck so the lane lies on it: [x0, y0, len]. */
function deckLane(api, cx, cy, ang, half) {
  const S = api.state, on = (x, y) => { const t = api.map.tileIdx(x, y); return api.map.deck[t] === S.D && api.map.t[t]; };
  const ux = Math.cos(ang), uy = Math.sin(ang);
  let a = 0, b = 0;
  while (a < half && on(cx - ux * (a + 0.5), cy - uy * (a + 0.5))) a += 0.5;
  while (b < half && on(cx + ux * (b + 0.5), cy + uy * (b + 0.5))) b += 0.5;
  return [cx - ux * a, cy - uy * a, a + b];
}
const inCover = (api, o) => api.state.cover.some(([x, y]) => Math.hypot(o.x - x, o.y - y) < 2.6);
/** A Kestrel's strafing run: a lane telegraphed through the hero, then it comes down it, its nose guns walking the deck. */
function strafe(api, j) {
  const S = api.state, pl = api.p(); if (!pl) return;
  if (!j) {   // Thundershroud calls one down out of the sky
    const h = take(api, 'kestrel'); if (!h) return;
    h.ship.setGear?.(false); j = { h, kind: 'kestrel', st: 'run', t: 0, runs: 0, cat: null, hit: new Set() }; S.jets.push(j);
  }
  const angs = [0, Math.PI, Math.PI / 2 + 0.35, -Math.PI / 2 - 0.35, 0.6, Math.PI + 0.6];
  const ang = angs[Math.floor(Math.random() * angs.length)], [x0, y0, len] = deckLane(api, pl.x + rand(-0.6, 0.6), pl.y + rand(-0.6, 0.6), ang, 13);
  if (len < 6) { j.st = 'away'; j.t = 2; j.runs++; return; }
  addEffect(new Telegraph({ kind: 'line', x: x0, y: y0, ang, len, w: 1.7, dur: 1.7, color: '#ffd040' }), 'ground');
  if (!S.strafed) { S.strafed = true; api.banner('STRAFING RUN', 'Out of the lane, or down behind a parked jet'); }
  j.st = 'run'; j.t = 0; j.h.setAlpha(0); j.h.ship.setThrottle?.(1);
  const deckY = S.h.deckY, ux = Math.cos(ang), uy = Math.sin(ang), lead = 16, dur = 1.05, imp = [];
  for (let d = 0.6; d < len; d += 1.25) imp.push(d);
  let ii = 0, covered = false;
  j.run = () => {
    const k = (j.t - 1.7) / dur, d = -lead + (len + 2 * lead) * Math.max(0, k);
    if (k < 0) return;
    placeJet(j, x0 + ux * d, y0 + uy * d, ang, deckY + 2.0 + Math.max(0, Math.abs(d - len / 2) - len / 2) * 0.3);
    j.h.setAlpha(1); j.h.ship.fire?.(true);
    while (ii < imp.length && d >= imp[ii]) {   // her nose guns walk down the lane
      const ix = x0 + ux * imp[ii] + rand(-0.3, 0.3), iy = y0 + uy * imp[ii] + rand(-0.3, 0.3); ii++;
      burst(ix, iy, 6, 'fire', 5, 3); sparkle(ix, iy, 4, '#ffe8a0', 4, 0.4); if (ii % 2) api.sfx('shoot', 0.5);
      if (G.cine) continue;
      aoe(api.world, null, ix, iy, 0.95, api.base.dmg * 1.3, 'phys', { team: 'player' });   // her own crew in the lane
      if (Math.hypot(pl.x - ix, pl.y - iy) < 1.6) {
        if (inCover(api, pl)) { if (!covered) { covered = true; api.floatText(pl.x, pl.y, 80, 'COVER', '#a0ffb0', 15); } }
        else aoe(api.world, null, ix, iy, 0.95, api.base.dmg * 1.3, 'phys', { team: 'enemy' });
      }
    }
    if (k > 1) { j.run = null; j.st = 'away'; j.t = 0; j.h.setAlpha(0); j.h.ship.fire?.(false); }
  };
}
/** A Thunderhawk comes in low off the Dawnwake's starboard beam and drops its torpedo at her. */
function torpedoRun(api, j) {
  const S = api.state, OX = api.OX, OY = api.OY;
  const z = pick([-14, -9, 9, 14]), s = api.sAt(z), hit = [OX + api.beam(s) + 0.2, OY + z];
  const drop = [hit[0] + 28, hit[1] - 7 + rand(-3, 3)], from = [drop[0] + 26, drop[1] - 6], ang = Math.atan2(drop[1] - from[1], drop[0] - from[0]);
  j.st = 'run'; j.t = 0; j.h.setAlpha(1); j.h.ship.setGear?.(false);
  let dropped = false;
  j.run = () => {
    const k = Math.min(1.7, j.t / 2.4), x = from[0] + (drop[0] - from[0]) * k, y = from[1] + (drop[1] - from[1]) * k;
    placeJet(j, x, y, ang, 6.5 - Math.min(1, k) * 3 + Math.max(0, k - 1) * 9);
    if (k >= 1 && !dropped) {
      dropped = true; api.splash(drop[0], drop[1], 1.0); api.sfx('thud', 0.8);
      const h = take(api, 'torpedo'); if (h) {
        const a2 = Math.atan2(hit[1] - drop[1], hit[0] - drop[0]);
        S.torps.push({ h, a: drop, b: hit, x: drop[0], y: drop[1], t: 0, dur: Math.hypot(hit[0] - drop[0], hit[1] - drop[1]) / 6.5, head: headOf(a2) });
      }
      pipCall(api, 'torpedo');
    }
    if (k >= 1.7) { j.run = null; dropJet(api, j); }
  };
}
/** Each torpedo's track on the water to her hull (red), and an arrow at the screen's edge while it runs off screen. */
function drawTorpedoes(api, ctx) {
  const S = api.state; if (G.cine) return;
  const J = S.jamming;
  if (J) {   // the jam's progress: one bar over the shuttle station
    const x = isoX(J.c.jam[0], J.c.jam[1]), y = (J.c.jam[0] + J.c.jam[1]) * HH - api.lvAt(J.c.jam[0], J.c.jam[1]) * api.HS - 78, w = 56, k = Math.min(1, J.t / 2.4);
    ctx.save(); ctx.fillStyle = 'rgba(8,6,10,0.75)'; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 9); ctx.fillStyle = '#ffd070'; ctx.fillRect(x - w / 2, y, w * k, 5); ctx.restore();
  }
  if (!S.torps.length) return;
  const sea = api.SEA_LV * api.HS, pt = (x, y) => [isoX(x, y), (x + y) * HH - sea];
  ctx.save();
  for (const tp of S.torps) {
    const a = pt(tp.x, tp.y), b = pt(...tp.b);
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(api.world.time * 10); ctx.strokeStyle = '#ff3a2a'; ctx.lineWidth = 0.9 * HW; ctx.setLineDash([HW * 0.8, HW * 0.5]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
    const [sx, sy] = camera.toScreen(a[0], a[1]), M = 34;
    if (sx > M && sx < G.W - M && sy > M + 30 && sy < G.H - M - 90) continue;
    const cx = G.W / 2, cy = G.H / 2, dx = sx - cx, dy = sy - cy, k = Math.min((G.W / 2 - M) / Math.abs(dx || 1e-6), (G.H / 2 - M - 50) / Math.abs(dy || 1e-6)), d = G.dpr;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate((cx + dx * k) * d, (cy + dy * k) * d); ctx.rotate(Math.atan2(dy, dx)); ctx.globalAlpha = 0.9;
    const r = 15 * d; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.75); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.75); ctx.closePath();
    ctx.fillStyle = '#ff3a2a'; ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = '#2a0606'; ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
