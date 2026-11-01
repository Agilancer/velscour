// #3 THREE CHAINS (docs/PIRATE_SEAS.md): the Gannet Rocks lamp, at dusk. Foreman Gristle Mott's grapple steamer, the
// Haulfast, lies bow-on off the Dawnwake's port beam. With the first wave her three grapples (two bow launchers and the
// crane's great hook) bite the port rail, and she hauls the Dawnwake for the Gannet Rocks: the haul meter fills with
// every chain still fast. Each chain is a target at the rail (iron: it sparks, it doesn't bleed); her boarders come over
// hand over hand along the chains (cut one and whoever is on it drops into the sea), and her bow gun covers the chains.
// Full means grounding: she lists to port (the whole view heels, everyone slides), the rocks stave the planks in under
// telegraphed rings, another wave comes and the chest gets lighter. Mott waits on his bow until the chains are cut;
// then his drop ramp falls on her rail, his crane hooks her again ("Haul away") and he comes over it at a run.
import { G } from '../../state.js';
import { camera, elevationAt, HW, HH } from '../../core/view.js';
import { aoe } from '../combat.js';
import { Cine } from '../cinema.js';

const ZC = 7.6;   // the Haulfast's beam line: bow-on off the port side, abaft the paddle box, short of the quarterdeck
const CHAINS = [['grapple:port', 4.4], ['grapple:crane', 7.8], ['grapple:starboard', 11.0]];   // marker, where it bites (ship z)
// her ramp at rest on the Dawnwake's rail (setRamp 0.65: its lip level with the rail top, 3.38 out from the hinge)
const RAMP_F = 0.65, RAMP_REACH = 3.38, LIP = [0, 1.79, -14.36], HINGE = [0, 0.06, -10.98], MOTT_AT = [0.3, 0, -9.5];
const CREW_ART = ['ap_chainhook_climber', 'ap_tarcoat_deckhand', 'ap_hook_leg_veteran', 'ap_salt_rust_boarding_shield', 'ap_saltwind_cutlass_raider'];
const HS = 4;
let LV = 9.8;

export default {
  id: 'three_chains', number: 3, name: 'Three Chains', light: 'The Gannet Rocks lamp', weather: 'sunset', weatherName: 'Dusk off the Gannet Rocks',
  blurb: 'The Haulfast lies off to port, her grapples run out.', dark: 0.05,
  fleet: ['longboat', 'cutter', 'grappler', 'reef'],
  boats: { longboat: 1, cutter: 1 },
  docks: [[-16, 12], [-7.5, 12.5]],   // her bow fills the after berths
  // chain: how many of her crew come over hand over hand along the chains with the wave
  waves: [
    { boats: 1, n: [3], champion: 0, chain: 2 },
    { boats: 1, n: [4], champion: 1, chain: 2 },
    { boats: 2, n: [3, 3], champion: 1, unique: 1, mid: true, chain: 2 },
    { boats: 2, n: [4, 3], champion: 2, chain: 3 },
    { boats: 3, n: [4, 3, 3], champion: 2, unique: 1, chain: 2 },
  ],
  mid: { id: 'ap_madam_stormglass', name: 'Madam Stormglass', title: 'Pilot of the Haulfast', line: 'The Haulfast pays by the fathom. Over!' },
  final: { id: 'ap_warden_of_the_rookery', name: 'Foreman Gristle Mott', title: 'Foreman of the Haulfast', line: "Reef's two cables off. Haul away.", from: 'deck',
    at: (api) => api.tileOf(-2, ZC), leapTo: (api) => api.tileOf(-(api.inner(api.sAt(ZC)) - 1.4), ZC) },
  hooks: {
    setup(api) {
      const S = api.state; LV = api.LV;
      // the Haulfast, held level so her ramp lands true, bow-on (heading -90 degrees: her bow toward the Dawnwake)
      const h = S.h = api.spawnShip('grappler', { deck: true });
      h.place(api.OX - api.beam(api.sAt(ZC)) + 0.15 - RAMP_REACH + HINGE[2], api.OY + ZC, -Math.PI / 2, 0.5);
      h.ship.setRamp?.(0);
      // the Gannet Rocks, off the port bow: they close as she is hauled
      const rf = S.reef = api.spawnShip('reef', { deck: true });
      if (rf) { for (let i = 0; i < 3; i++) rf.ship.setLamp?.(i, false); S.reefFrom = [api.OX - 36, api.OY - 40]; S.reefTo = [api.OX - 22, api.OY - 26]; rf.place(...S.reefFrom, 0.5, 0); }
      // her deck crew (3D sprites until they go over), and Mott on her bow by the gallows
      S.crew = [];
      const spots = S.spots = (h.info.crew || []).filter((c) => c[1] < 0.5);
      for (let i = 0; i < 5; i++) { const c = spots[i % spots.length]; S.crew.push(h.addCrew({ art: CREW_ART[i], x: c[0], y: c[1], z: c[2], h: 55, ph: i, bob: true })); }
      S.mott = h.addCrew({ art: 'ap_warden_of_the_rookery', x: MOTT_AT[0], y: 0, z: MOTT_AT[2], h: 93, ph: 0, bob: false });
      S.chains = CHAINS.map(([mk, z]) => chainOf(api, h, mk, z));
      S.riders = new Set(); S.gunT = 7; S.trickleT = 9; S.hullT = 4; S.grounded = false;
      api.world.addHazard({ ground: true, update: () => api.world === G.world, draw: (ctx) => drawChains(api, ctx) });
      // the grapples fly as the arrival looks out to port at her (after its HOLD THE DECK card); else with the first wave
      let card = false;
      api.scripted(() => { if (S.hooked) return false; if (Cine.card && Cine.card.title === 'HOLD THE DECK') card = true; else if (card) { hook(api, 0.35); return false; } return true; });
    },
    onWave(api, n, w) {
      const S = api.state;
      if (n === 0) { hook(api, 0.9); api.later(1.0, () => api.banner('THREE CHAINS', 'Her grapples hold the rail: cut them')); }
      for (let i = 0; i < (w.chain || 0); i++) api.later(2.8 + i * 1.1, () => cross(api, n, i === 0 && n > 1 ? 'champion' : 'normal'), n);
    },
    onBoss(api, m, which) {
      if (which !== 'final') return;
      const S = api.state, h = S.h;
      // Mott on his bow for his card (he was a crew sprite there); held still by the director until his line is said
      const [x, y, l] = h.worldOf(...MOTT_AT); h.dropCrew(S.mott);
      m.x = x; m.y = y; m.z = l * HS - elevationAt(x, y); m.static = true; m.flip = false; S.still = m.entering; S.mottM = m;
      // his drop ramp comes down on her rail, and the crane swings its hook in again
      let f = 0;
      api.scripted((dt) => { f = Math.min(RAMP_F, f + dt * 0.55); h.ship.setRamp?.(f); if (f >= RAMP_F) { api.sfx('thud', 1); camera.shake(6); api.splash(x + 3.5, y, 0.6); return false; } return true; });
      const crane = S.chains[1];
      api.later(2.6, () => { if (!crane.live) fire(api, crane); });
      // when the director leaps him over, he runs down his ramp instead
      api.scripted(() => {
        if (m.dead || S.ran) return false;
        if (!m.entering || m.entering === S.still) return true;
        S.ran = true; runRamp(api, m); return false;
      });
    },
    tick(api, dt) {
      const S = api.state, ph = api.run.phase, fight = ph === 'waves' || ph === 'mid' || ph === 'final';
      for (const c of S.chains) if (c.live && c.m && c.m.dead) cut(api, c);
      for (const c of S.chains) if (c.m && !c.m.dead) c.m.cd = 99;   // iron doesn't strike back
      const live = S.chains.filter((c) => c.live);
      // the haul: the Gannet Rocks close while any chain holds
      if (S.meter) {
        const n = live.length;
        if (n && ph !== 'victory') S.meter.add(dt * n / 3 / (S.grounded ? 55 : 46));
        const cab = Math.max(0, 2 - 2 * S.meter.value);
        S.meter.note = !n ? 'the chains are cut' : S.grounded ? `aground · ${n} chain${n > 1 ? 's' : ''} still fast` : `${n} chain${n > 1 ? 's' : ''} fast · the rocks ${cab.toFixed(1)} cables off`;
        if (!n || ph === 'victory') S.meter.hide(); else api.run.meter = S.meter;
        if (S.reef && !S.grounded) { const k = S.meter.value; S.reef.place(S.reefFrom[0] + (S.reefTo[0] - S.reefFrom[0]) * k, S.reefFrom[1] + (S.reefTo[1] - S.reefFrom[1]) * k, 0.5, 0); }
      }
      S.h.place(S.h.x, S.h.y, S.h.heading, live.length ? 1.1 : 0.4);   // her paddles churn while she hauls
      if (!fight) return;
      rescue(api, dt);
      // her trickle of climbers while any chain holds (beside the waves', who don't wait on them)
      if (live.length && ph !== 'final' && (S.trickleT -= dt) <= 0) { S.trickleT = 6.5 + Math.random() * 3; if (S.riders.size < 3) cross(api, 93, 'normal'); }
      // her bow gun covers the chains: a ring on whoever works at the nearest one
      if (live.length && (S.gunT -= dt) <= 0) { S.gunT = 6.2; bowGun(api, live); }
      // aground: she lists, everyone slides to port, and the rocks come up through her planks
      if (S.grounded) { S.list = (S.list || 0) + dt; listView(api, -2.2 - 0.3 * Math.sin(S.list * 0.9)); slide(api, dt, -0.42, 0.06); if ((S.hullT -= dt) <= 0) { S.hullT = 5.2; rocks(api); } }
    },
    holdFinal(api) { return api.state.chains.some((c) => c.live); },   // Mott hauls from his bow until every chain is cut
    objective(api) {   // the nearest chain still fast (auto-play hunts the targets anyway)
      const p = api.p(), live = api.state.chains.filter((c) => c.live && c.m && !c.m.dead);
      if (!p || !live.length || api.run.phase === 'final') return null;
      const c = live.reduce((a, b) => (Math.hypot(b.m.x - p.x, b.m.y - p.y) < Math.hypot(a.m.x - p.x, a.m.y - p.y) ? b : a));
      return { x: c.m.x, y: c.m.y, reach: 1.3 };
    },
    onVictory(api) {
      const S = api.state;
      for (const c of S.chains) if (c.live) { if (c.m && !c.m.dead) { c.m.hp = 0; c.m.dead = true; } cut(api, c, true); }
      listView(api, 0); S.h.ship.setRamp?.(0);
    },
  },
};

/** Her three grapples fly, one after another, each bite ringed first; the haul meter comes with them. */
function hook(api, t0) {
  const S = api.state; if (S.hooked) return;
  S.hooked = true;
  S.chains.forEach((c, i) => api.later(t0 + i * 0.6, () => fire(api, c)));
  S.meter = api.meter('The haul', { color: '#e8a040', full: () => fullHaul(api) });
}
/** One of her three chains: its marker on the Haulfast, where it bites the Dawnwake's port rail, its state. */
function chainOf(api, h, name, z) {
  let mk = null; for (const o of h.info.grapples || []) if (o.name === name) mk = o;
  const s = api.sAt(z);
  return {
    name, z, mk, live: false, fly: 0, whip: 0, m: null,
    rail: [api.OX - api.beam(s) + 0.15, api.OY + z, (api.sheer(s) + 0.05) * LV],
    land: [api.OX - (api.inner(s) - 1.2), api.OY + z],
    /** Its end on the Haulfast now (tile x, tile y, level): the shackle at the marker. */
    end() { if (!mk) return h.worldOf(0, 1.4, -9); mk.updateMatrixWorld(true); const e = mk.matrixWorld.elements; return [e[12], e[14], e[13] * LV]; },
  };
}
/** A grapple fires: a ring where it will bite, then the chain flies and comes taut; the target at the rail. */
function fire(api, c) {
  if (c.live) return;
  const [tx, ty] = c.land;
  api.telegraph(tx - 0.3, ty, 1.0, 0.7, '#ffb050');
  c.live = true; c.fly = 0; c.whip = 0; c.flying = true;
  api.sfx('swing', 0.9);
  api.scripted((dt) => {
    c.fly = Math.min(1, c.fly + dt / 0.55);
    if (c.fly < 1) return true;
    c.flying = false; api.sfx('thud', 1); camera.shake(4);
    api.sparkle(c.rail[0], c.rail[1], c.rail[2] * HS, '#ffe0a0', 10, 0.3);
    c.m = target(api, c);
    return false;
  });
}
/** The chain's bite as a foe: iron with a life bar, drawn as the grapple's tines over the rail. */
function target(api, c) {
  const m = api.spawnArt('ap_salt_rust_boarding_shield', 'golem', 'normal', c.land, { wave: 95 });
  m.x = c.land[0]; m.y = c.land[1]; m.static = true; m.dmg = 0; m.cd = 99; m.noShadow = true; m.affixes = []; m.sprite = null; m.goreType = 'spark';
  m.name = 'Haulfast Chain'; m.chain = c; m.maxHp = api.base.hp * 3.2; m.hp = m.maxHp; m.xp = (m.xp || 0) * 2;
  m.draw = (ctx) => drawBite(ctx, m, c);
  return m;
}
/** Cut: the chain whips back to the Haulfast and falls in the sea; whoever was on it goes with it. */
function cut(api, c, quiet = false) {
  const S = api.state;
  c.live = false; c.whip = 0; c.m = null;
  for (const r of [...S.riders]) if (r.onChain === c) drop(api, r);
  if (quiet) { c.whip = 1; return; }
  api.sfx('explode', 0.5); api.sfx('thud', 0.8); camera.shake(5);
  api.burst(c.rail[0], c.rail[1], c.rail[2] * HS, 'fire', 26, 5);
  const left = S.chains.filter((q) => q.live).length;
  api.banner(left ? 'CHAIN CUT' : 'THE LAST CHAIN PARTS', left ? `${left} still fast` : 'The Haulfast has lost her grip');
  api.scripted((dt) => {
    c.whip = Math.min(1, c.whip + dt / 0.6);
    if (c.whip < 1) return true;
    const e = c.end(); api.splash(e[0] + 2.2, e[1], 0.8); return false;
  });
}
/** One of her crew comes over hand over hand along a chain (or jumps from her bow if none holds). */
function cross(api, wave, rank = 'normal') {
  const S = api.state, live = S.chains.filter((c) => c.live && !c.flying);
  const art = Math.random() < 0.4 ? 'ap_chainhook_climber' : null;
  if (S.crew.length) S.h.dropCrew(S.crew.pop());
  api.later(5, () => { if (S.crew.length < 5 && !S.h.dead) { const c = S.spots[S.crew.length % S.spots.length]; S.crew.push(S.h.addCrew({ art: CREW_ART[S.crew.length], x: c[0], y: c[1], z: c[2], h: 55, ph: Math.random() * 6, bob: true })); } });
  if (!live.length) {   // no chain to climb: over her bow and across the gap
    const from = S.h.worldOf(0, 0.6, -10.6), to = api.near(api.OX - (api.inner(api.sAt(ZC)) - 1.3), api.OY + ZC + (Math.random() - 0.5) * 3, 1.2);
    return api.spawnPirate(art, rank, from, to, wave);
  }
  const c = live[Math.floor(Math.random() * live.length)], to = api.near(c.land[0] + Math.random() * 0.6, c.land[1] + (Math.random() - 0.5) * 1.2, 1.2);
  const m = api.spawnPirate(art, rank, c.end(), to, wave);
  m.onChain = c; S.riders.add(m); m.boarding = true; m.targetable = false;
  api.telegraph(to[0], to[1], 1.0, 3.2, '#ff7040');
  let k = 0;
  m.entering = (dt) => {
    if (!c.live) { drop(api, m); return; }
    const a = c.end(), len = Math.hypot(c.rail[0] - a[0], c.rail[1] - a[1]) || 1;
    k = Math.min(1, k + dt * (m.rush ? 7 : 1.9) / len); m.animT += dt; m.moving = true;
    const [x, y, l] = chainPt(a, c.rail, k, 0.25);
    m.x = x; m.y = y; m.z = l * HS - elevationAt(x, y) - (m.artH || 55) * 0.82; m.flip = false;
    if (k >= 1) { S.riders.delete(m); m.onChain = null; api.leap(m, [x, y, l - (m.artH || 55) * 0.82 / HS], to, { board: true, arc: 34, dur: 0.4 }); }
  };
  return m;
}
/** A climber off a parted chain: down into the sea (no loot in the water; the hero still has the kill). */
function drop(api, m) {
  const S = api.state; S.riders.delete(m); m.onChain = null;
  let vz = 0;
  m.entering = (dt) => {
    vz += 600 * dt; m.z -= vz * dt; m.animT += dt;
    if (m.z + elevationAt(m.x, m.y) > api.SEA_LV * HS) return;
    api.splash(m.x, m.y, 0.6); m.entering = null; m.hp = 0; m.dead = true; m.sprite = null;
    const p = api.p(); if (p && p.gainXp) p.gainXp(m.xp || 0);
  };
}
/** Her bow gun covers the chains: a ring on whoever works at the nearest one, then the shot. */
function bowGun(api, live) {
  const S = api.state, p = api.p(); if (!p) return;
  const c = live.reduce((a, b) => (Math.hypot(b.land[0] - p.x, b.land[1] - p.y) < Math.hypot(a.land[0] - p.x, a.land[1] - p.y) ? b : a));
  const close = Math.hypot(c.land[0] - p.x, c.land[1] - p.y) < 4;
  const to = close ? api.near(p.x + (Math.random() - 0.5) * 1.2, p.y + (Math.random() - 0.5) * 1.2) : api.near(c.land[0] + 1 + Math.random(), c.land[1] + (Math.random() - 0.5) * 2);
  const from = S.h.worldOf(0, 3.1, -10.2);
  api.telegraph(to[0], to[1], 1.45, 1.3, '#ffb040');
  api.floatText(from[0], from[1], from[2] * HS + 20, 'FIRE!', '#ffb070', 15);
  api.cannon(from, [to[0], to[1], api.lvAt(to[0], to[1])], () => api.blast(to[0], to[1], 1.45, api.base.dmg * 1.5, true), 1.3);
}
/** The haul meter is full: the first time she grounds on the Gannet Rocks; after that the rocks grind her keel. */
function fullHaul(api) {
  const S = api.state;
  if (S.grounded) { api.costReward(0.15); api.banner('THE ROCKS GRIND HER KEEL', 'The chest will be lighter'); camera.shake(8); return; }
  S.grounded = true;
  if (S.reef) S.reef.place(...S.reefTo, 0.5, 0);
  api.costReward(0.25); api.addWave();
  api.banner('SHE GROUNDS ON THE GANNET ROCKS', 'She lists to port · the rocks stave her planks');
  api.sfx('explode', 1); api.sfx('thud', 1); camera.shake(22);
  for (let i = 0; i < 6; i++) api.later(i * 0.12, () => api.splash(api.OX - 7.5 - Math.random() * 2, api.OY - 14 + i * 5, 1.2, i % 2 === 0));
  rocks(api, 3);
}
/** Rocks through her planks: telegraphed rings (one at the hero), then splintered deck and spray that hits everyone. */
function rocks(api, n = 2) {
  const p = api.p();
  for (let i = 0; i < n; i++) {
    const at = i === 0 && p ? api.near(p.x + (Math.random() - 0.5) * 2, p.y + (Math.random() - 0.5) * 2) : api.near(api.OX - 4 + Math.random() * 5, api.OY - 9 + Math.random() * 20);
    api.telegraph(at[0], at[1], 1.3, 1.25, '#a8e8ff');
    api.later(1.25 + i * 0.1, () => {
      const w = api.world;
      if (!G.cine) { aoe(w, null, at[0], at[1], 1.3, api.base.dmg * 1.3, 'phys', { team: 'enemy', knock: 1.2 }); aoe(w, null, at[0], at[1], 1.3, api.base.dmg * 1.3, 'phys', { team: 'player', knock: 1.2 }); }
      api.burst(at[0], at[1], 8, 'phys', 18, 4); api.sparkle(at[0], at[1], 10, '#d8f4ff', 16, 0.7);
      api.smoke(at[0], at[1], 4, '#9aa8b0', 5, 10); api.addEffect(new api.Ring(at[0], at[1], 0.2, 2.0, 0.45, '#c8f0ff', 5));
      api.floatText(at[0], at[1], 70, 'CRACK!', '#d8f4ff', 15); api.sfx('explode', 0.5); camera.shake(5);
    });
  }
}
/** Mott comes down his ramp at a run and over her rail (the director had him leap; this is his own way over). */
function runRamp(api, m) {
  const S = api.state, h = S.h, to = api.run.capTo || api.near(...S.chains[1].land), pts = [h.worldOf(...MOTT_AT), h.worldOf(...HINGE), h.worldOf(...LIP)];
  const lvTo = api.lvAt(to[0], to[1]);
  let i = 0, k = 0, hop = 0;
  m.targetable = false; m.moving = true;
  m.entering = (dt) => {
    m.animT += dt;
    if (i < pts.length - 1) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      k = Math.min(1, k + dt * 4.2 / len);
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, l = a[2] + (b[2] - a[2]) * k;
      m.x = x; m.y = y; m.z = l * HS - elevationAt(x, y); m.flip = false;
      if (k >= 1) { i++; k = 0; api.sfx('thud', 0.4); }
      return;
    }
    const a = pts[pts.length - 1];
    hop = Math.min(1, hop + dt / 0.5);
    m.x = a[0] + (to[0] - a[0]) * hop; m.y = a[1] + (to[1] - a[1]) * hop;
    m.z = (a[2] * (1 - hop) + lvTo * hop) * HS + 50 * Math.sin(Math.PI * hop) - elevationAt(m.x, m.y);
    if (hop < 1) return;
    m.entering = null; m.targetable = true; m.moving = false; m.static = false; m.z = 0; m.x = to[0]; m.y = to[1]; m.cd = 0.4;
    api.smoke(m.x, m.y, 4, '#6a5a4a', 4, 10); api.sfx('thud', 1); camera.shake(10);
    api.addEffect(new api.Ring(m.x, m.y, 0.2, 2.6, 0.5, '#e8d0a0', 6));
    if (!G.cine) aoe(api.world, m, m.x, m.y, 2.2, m.dmg * 0.6, 'phys', { knock: 1 });
  };
}

// ------------------------------------------------------------------ the deck heels (the same shape in #5)
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
/** Everyone on her decks slides downhill (tiles a second): the hero, the boarders, the pets; not the iron or the still. */
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
/** A point on a chain from a to b ([tile x, tile y, level]) at k, sagging `sag` ship units in the middle. */
const chainPt = (a, b, k, sag) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - Math.sin(Math.PI * k) * sag * LV];
const wpt = (q) => [(q[0] - q[1]) * HW, (q[0] + q[1]) * HH - q[2] * HS];
/** The chains (under the sprites, over the sea and the ships): taut iron, links picked out, a strain shiver. */
function drawChains(api, ctx) {
  const S = api.state, t = api.world.time;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const c of S.chains) {
    if (!c.live && (c.whip >= 1 || !c.whip)) continue;
    const a = c.end();
    let b = c.rail, sag = 0.12 + 0.05 * Math.sin(t * 7 + c.z);
    if (c.flying) { const k = c.fly; b = [a[0] + (c.rail[0] - a[0]) * k, a[1] + (c.rail[1] - a[1]) * k, a[2] + (c.rail[2] - a[2]) * k + Math.sin(Math.PI * k) * 20]; sag = 0; }
    else if (!c.live) { const k = c.whip; b = [c.rail[0] + (a[0] + 2 - c.rail[0]) * k, c.rail[1] + (a[1] - c.rail[1]) * k, c.rail[2] + (api.SEA_LV - c.rail[2]) * k]; sag = 0.4 * k; }
    const pts = []; for (let i = 0; i <= 16; i++) pts.push(wpt(chainPt(a, b, i / 16, sag)));
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); };
    path(); ctx.strokeStyle = 'rgba(10,8,6,0.85)'; ctx.lineWidth = 8; ctx.stroke();
    path(); ctx.strokeStyle = '#4c4640'; ctx.lineWidth = 5; ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = c.live ? -t * 6 : 0;   // the links creep toward her winch as she hauls
    path(); ctx.strokeStyle = '#a89478'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.setLineDash([]);
    if (c.live && !c.flying) {   // a hot glint where it strains at the rail
      const q = pts[pts.length - 1]; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 9 + c.z);
      ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
/** The grapple's bite on her rail: four black tines over the bulwark, a pulse round it, the life bar over it. */
function drawBite(ctx, m, c) {
  const [x, y] = wpt(c.rail), t = m.animT || 0;
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6);
  ctx.strokeStyle = '#ff8a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 4, 20, 10, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineCap = 'round';
  for (const [dx, dy] of [[-9, 6], [-3, 9], [4, 9], [10, 5]]) {
    ctx.strokeStyle = '#121010'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 1, y - 10); ctx.quadraticCurveTo(x + dx * 1.2, y - 6, x + dx, y + dy); ctx.stroke();
    ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 1, y - 10); ctx.quadraticCurveTo(x + dx * 1.2, y - 6, x + dx, y + dy); ctx.stroke();
  }
  ctx.fillStyle = '#1a1714'; ctx.beginPath(); ctx.arc(x - 1, y - 12, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b0a48c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 1, y - 12, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  if (m.flash > 0) { ctx.globalAlpha = Math.min(1, m.flash * 6); ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.arc(x - 1, y - 6, 12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // a ring on the deck where it's struck from, and a bouncing arrow over its bar (cut here)
  const [gx, gy] = wpt([c.land[0], c.land[1], 0]), b = Math.abs(Math.sin(t * 4)) * 6;
  ctx.save(); ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 5); ctx.strokeStyle = '#ffc860'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(gx, gy, 26, 13, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffc860'; ctx.strokeStyle = '#2a1606'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 8, y - 52 - b); ctx.lineTo(x + 8, y - 52 - b); ctx.lineTo(x, y - 40 - b); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillRect(x - 3, y - 62 - b, 6, 10); ctx.strokeRect(x - 3, y - 62 - b, 6, 10);
  ctx.restore();
  m.screenTop = y - 30;
  m.drawOverhead(ctx, x, y - 26, 40);
}
