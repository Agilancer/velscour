// THE BROKEN SPIRES of Castle Velscour (world/castlevelscour.js layout 'spires'; the run is game/castlespires.js, the
// three.js view gfx/spires3d.js). Tall towers stand in a void, each climbed by a spiral stair wound round its outside,
// joined crown to foot by bridges, and the bridges are broken: Velscour leaves you his own ways across (CROSSINGS).
//
// The game plays the level as one long RIBBON of tiles, the way the Serpentine Tower plays its stair (world/tower.js):
// the grid holds the whole route unrolled as a strip along -x (s = X1 - x is the distance travelled, y - YC the step
// sideways, + outward), and game/castlespires.js warps every tile position onto the 3D route: a gate tower's top, a
// bridge, a helix round the next spire, a bridge, ... the summit. Pieces join tangent to tangent, so the strip is
// seamless in 3D. Lines run straight (bridges, the round tower tops, their lateral span a disc); helices wind round a
// spire (lateral = radius, + out from the drum). One height polyline over s carries the route up.
import { TileMap } from './map.js';
import { RNG, clamp, TAU } from '../core/util.js';
import { ARCH } from '../data/enemies.js';
import { placeOf, wingOf } from '../data/phobos.js';
import { G } from '../state.js';

// The ways across a gap (game/castlespires.js plays them, gfx/spires3d.js draws them). gap: its length in tiles;
// dh: the rise from near side to far; lane: what the void looks like before the crossing is used.
export const CROSSINGS = {
  bridge: { name: 'A Bridge That Holds', gap: [0, 0], dh: [0, 2] },
  leap: { name: 'The Broken Span', gap: [6, 7], dh: [0, 0], how: 'Leap stones fling you over the break.' },
  gondola: { name: 'The Gibbet Gondola', gap: [12, 15], dh: [-3, -1], how: 'Smash the winch that holds the cage away; it comes for you, then hauls you over.' },
  masonry: { name: 'The Obedient Stones', gap: [10, 13], dh: [0, 1], how: 'The broken bridge floats in pieces: walk, and its stones fly up under your feet.' },
  hands: { name: 'His Open Hands', gap: [8, 10], dh: [0, 0], how: 'Velscour\'s own hands hold the span up out of the abyss. They let go when the fingers are all open.' },
  bellrope: { name: 'The Tolling Rope', gap: [8, 10], dh: [0, 0], how: 'Catch the bell-rope as it swings to you; it tolls you over.' },
  collapse: { name: 'The Ossein Run', gap: [11, 14], dh: [3, 5], how: 'A stair of bone that falls away behind you. Do not stop.' },
  cart: { name: 'The Carrion Line', gap: [13, 16], dh: [-1, 1], how: 'Ride the corpse-cart down the bone rail. Its cargo is not all dead.' },
  spine: { name: 'The Marrow Bridge', gap: [8, 11], dh: [1, 3], how: 'Feed the reliquary your blood and a spine grows across the gap.' },
};
export const SPIRE_METHODS = ['gondola', 'masonry', 'hands', 'bellrope', 'collapse', 'cart', 'spine'];
// the crossings Bellmourn's layout bible names (bm-phobos PHOBOS-LAYOUT.md), each with the ways it is crossed
const PLACE_PLAN = [
  [/Storm Bridge/, { helices: 2, cross: ['masonry', 'bellrope', 'gondola'], style: 'storm' }],
  [/Ossein Stair/, { helices: 2, cross: ['collapse', 'spine', 'collapse'], style: 'bone' }],
  [/Gloam Balconies/, { helices: 2, cross: ['gondola', 'hands', 'bellrope'], style: 'gloam' }],
  [/Red Span/, { helices: 2, cross: ['hands', 'cart', 'spine'], style: 'blood' }],
  [/Last Stair/, { helices: 3, cross: ['collapse', 'hands', 'masonry', 'spine'], style: 'throne' }],
  [/Ember Spire/, { helices: 3, cross: ['bridge', 'cart', 'leap', 'gondola'], style: 'ember' }],
  [/Storm Spire/, { helices: 3, cross: ['bridge', 'bellrope', 'masonry', 'hands'], style: 'storm' }],
  [/Shadow Spire/, { helices: 3, cross: ['bridge', 'spine', 'gondola', 'hands'], style: 'gloam' }],
  [/Blood Spire/, { helices: 3, cross: ['bridge', 'cart', 'collapse', 'hands'], style: 'blood' }],
  [/Bone Spire/, { helices: 3, cross: ['bridge', 'spine', 'collapse', 'bellrope'], style: 'bone' }],
  [/Throne Tower/, { helices: 3, cross: ['bridge', 'hands', 'masonry', 'collapse'], style: 'throne' }],
];
const WING_STYLE = { stormspire: 'storm', bonespire: 'bone', throne: 'throne', gatehouse: 'iron', greathall: 'gloam', library: 'storm', sanctuaries: 'bone', menagerie: 'gloam', oubliettes: 'bone', armoury: 'ember' };
const SPIRE_NAMES = ['the Gate Tower', 'the Gibbet Spire', 'the Lantern Spire', 'the Weeping Spire', 'the Crooked Spire', 'the Spire of Hooks', 'the Belfry', 'the Needle', 'the Choir Spire', 'the Widow Spire', 'the Rook Spire', 'the Summit'];

/** The route as pieces along s, and the maps from (s, u) to the level frame (X, Z: tiles; h: tiles up). */
export class Ribbon {
  constructor(pieces, hp, X1, YC) {
    Object.assign(this, { pieces, hp, X1, YC, S: pieces[pieces.length - 1].s1, pi: 0, hi: 0 });
  }
  sOf(x) { return this.X1 - x; }
  uOf(y) { return y - this.YC; }
  gx(s) { return this.X1 - s; }
  gy(u) { return this.YC + u; }
  piece(s) {
    const P = this.pieces;
    let i = this.pi;
    if (s < P[i].s0 || s >= P[i].s1) { i = 0; while (i < P.length - 1 && s >= P[i].s1) i++; this.pi = i; }
    return P[i];
  }
  /** Height of the route at s (the polyline hp: [[s, h], ...]). */
  h(s) {
    const H = this.hp;
    if (s <= H[0][0]) return H[0][1];
    if (s >= H[H.length - 1][0]) return H[H.length - 1][1];
    let i = this.hi;
    if (!(H[i][0] <= s && s < H[i + 1][0])) { let a = 0, b = H.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (H[m][0] <= s) a = m; else b = m; } i = this.hi = a; }
    const [s0, h0] = H[i], [s1, h1] = H[i + 1];
    return h0 + (h1 - h0) * (s - s0) / (s1 - s0 || 1);
  }
  /** The tangent angle (level frame) at s. */
  tau(s) { const p = this.piece(s); return p.k === 'helix' ? p.th0 + (s - p.s0) / p.R + Math.PI / 2 : p.tau; }
  /** Level-frame point of (s, u): out = [X, Z, h]. */
  pos(s, u, out = [0, 0, 0]) {
    const p = this.piece(s);
    if (p.k === 'helix') {
      const t = p.th0 + (s - p.s0) / p.R, r = p.R + u;
      out[0] = p.cx + r * Math.cos(t); out[1] = p.cz + r * Math.sin(t);
    } else {
      const d = s - p.s0, c = Math.cos(p.tau), sn = Math.sin(p.tau);
      out[0] = p.x0 + d * c + u * sn; out[1] = p.z0 + d * sn - u * c;
    }
    out[2] = this.h(s);
    return out;
  }
}

/** Lay out the route: the towers, their helices and the bridges between, tangent to tangent. Throws when they collide. */
function planRoute(rng, plan, raid) {
  const pieces = [], hp = [], towers = [], bridges = [];
  let s = 0, h = 0, tau = rng.range(0, TAU), x = 0, z = 0;
  const fwd = (d) => { x += Math.cos(tau) * d; z += Math.sin(tau) * d; s += d; };
  // the gate tower's top: a disc you arrive on
  const R0 = rng.int(7, 8);
  pieces.push({ k: 'line', s0: 0, s1: 2 * R0, x0: x, z0: z, tau });
  towers.push({ kind: 'disc', start: true, sc: R0, rd: R0, cx: x + Math.cos(tau) * R0, cz: z + Math.sin(tau) * R0, top: 0, name: SPIRE_NAMES[0] });
  hp.push([0, 0]); fwd(2 * R0); hp.push([s, 0]);
  const names = SPIRE_NAMES.slice(1, -1).sort(() => rng.next() - 0.5);
  for (let i = 0; i <= plan.helices; i++) {
    // a bridge, and on it the crossing (gap) that this one is
    const kind = plan.cross[i] || 'bridge', C = CROSSINGS[kind] || CROSSINGS.bridge;
    const gap = kind === 'bridge' ? 0 : rng.int(C.gap[0], C.gap[1]), dh = kind === 'bridge' ? rng.int(0, 2) : rng.int(C.dh[0], C.dh[1]);
    const app = kind === 'bridge' ? 0 : 5;
    const rNext = i < plan.helices ? rng.range(8, 9.6) : (raid ? 13 : rng.int(9, 11));
    const prevR = towers[towers.length - 1].rd + (towers[towers.length - 1].kind === 'helix' ? 5 : 1);
    const minL = (i < plan.helices ? rNext + 7 : rNext + 1) + prevR + 3;   // the drums must stand clear of each other
    const L = Math.max(minL, gap + 2 * app + 2, kind === 'bridge' ? rng.int(18, 26) : 0) + rng.int(0, 3);
    const b = { k: 'line', s0: s, s1: s + L, x0: x, z0: z, tau, bridge: true, kind, i };
    pieces.push(b);
    const g0 = s + (L - gap) / 2, g1 = g0 + gap;
    if (gap) { hp.push([g0, h]); hp.push([g1, h + dh]); } else hp.push([s + L, h + dh]);
    bridges.push({ ...b, g0, g1, h0: h, h1: h + dh, gap, dh });
    fwd(L); h += dh; hp.push([s, h]);
    if (i === plan.helices) break;
    // a spire: its stair winds round the drum from this foot up to its crown
    const R = rNext, turns = rng.pick([1, 1.125, 1.25, 1.375, 1.5]), P = rng.range(7, 8.6), len = TAU * R * turns, rise = P * turns;
    const cx = x - Math.sin(tau) * R, cz = z + Math.cos(tau) * R, th0 = Math.atan2(z - cz, x - cx);
    pieces.push({ k: 'helix', s0: s, s1: s + len, cx, cz, R, th0, turns, P });
    const foot = h;
    hp.push([s + 3, h]); hp.push([s + len - 5, h + rise]);
    const end = th0 + len / R;
    s += len; h += rise; x = cx + R * Math.cos(end); z = cz + R * Math.sin(end); tau = end + Math.PI / 2;
    hp.push([s, h]);
    towers.push({ kind: 'helix', cx, cz, R, rd: R - 2, foot, top: h, s0: s - len, s1: s, turns, P, name: names[i % names.length] });
  }
  // the summit: the last tower's broad top, where the floor's lord waits
  const Rs = towers.length && raid ? 13 : rng.int(9, 11);
  pieces.push({ k: 'line', s0: s, s1: s + 2 * Rs, x0: x, z0: z, tau });
  towers.push({ kind: 'disc', summit: true, sc: s + Rs, rd: Rs, cx: x + Math.cos(tau) * Rs, cz: z + Math.sin(tau) * Rs, top: h, name: SPIRE_NAMES[SPIRE_NAMES.length - 1] });
  hp.push([s + 2 * Rs, h]);
  hp.sort((a, b) => a[0] - b[0]);
  // nothing may stand in another tower: the drums apart, no bridge through a drum it doesn't join
  const rad = (t) => t.kind === 'helix' ? t.R + 8 : t.rd + 1.5;
  for (let a = 0; a < towers.length; a++) for (let b = a + 1; b < towers.length; b++) {
    const A = towers[a], B = towers[b], d = Math.hypot(A.cx - B.cx, A.cz - B.cz);
    if (d < rad(A) + rad(B) - (b === a + 1 ? 4 : 0)) throw new Error('spires: towers collide');
  }
  for (const br of bridges) for (let d = 3; d < br.s1 - br.s0 - 3; d += 2) {
    const px = br.x0 + Math.cos(br.tau) * d, pz = br.z0 + Math.sin(br.tau) * d;
    for (const t of towers) {
      const r = Math.hypot(px - t.cx, pz - t.cz), inside = r < (t.kind === 'helix' ? t.R + 3.5 : t.rd + 0.5);
      if (!inside) continue;
      const own = towers.indexOf(t) === br.i || towers.indexOf(t) === br.i + 1;
      if (!own) throw new Error('spires: a bridge runs through a tower');
    }
  }
  return { pieces, hp, towers, bridges, S: s + 2 * Rs };
}

/** What a floor is: its place in the bible picks the spires' style and the crossings (tests force them: G.spiresPlan). */
export function spirePlan(floor, rng) {
  const place = placeOf(floor), w = wingOf(floor);
  const forced = G.spiresPlan;
  let plan = forced ? { helices: forced.helices ?? 2, cross: forced.cross.slice(), style: forced.style || WING_STYLE[w.id] || 'iron' } : null;
  if (!plan) for (const [re, P] of PLACE_PLAN) if (re.test(place)) { plan = { ...P, cross: P.cross.slice() }; break; }
  if (!plan) {   // another wing's tower floor: two of the ways, shuffled
    const pool = SPIRE_METHODS.slice().sort(() => rng.next() - 0.5);
    plan = { helices: 2, cross: ['bridge', pool[0], pool[1]], style: WING_STYLE[w.id] || 'iron' };
  }
  plan.place = place;
  return plan;
}

export function generateSpires(floor, O, biome, tileset, seed, opts = {}) {
  const rng = new RNG(seed), plan = spirePlan(floor, rng);
  let route = null;
  for (let k = 0; k < 40 && !route; k++) { try { route = planRoute(rng, plan, opts.raid); } catch (e) { if (k === 39) throw e; } }
  const { pieces, hp, towers, bridges } = route;
  const S = route.S, X1 = Math.ceil(S) + 6, W = X1 + 6, Hh = 2 * 14 + 4, YC = Hh >> 1;
  const rb = new Ribbon(pieces, hp, X1, YC);
  const map = new TileMap(W, Hh);
  map.sheer = biome.sheer || { id: 'sheer_spires' };
  const I = (x, y) => y * W + x;
  const set = (x, y, t, b = 0) => { if (x >= 1 && y >= 1 && x < W - 1 && y < Hh - 1) { map.t[I(x, y)] = t; map.block[I(x, y)] = b; } };
  // ---- the lanes: four rows to walk (u -2..2), a wall row inside (the drum, a parapet) and a parapet row outside
  const broken = (s, seedK) => { const k = Math.floor(s / 3) * 7919 + seedK; return ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 < 0.16; };
  const balconies = [];
  for (const t of towers) if (t.kind === 'helix') {
    const n = rng.int(1, 2);
    for (let j = 0; j < n; j++) balconies.push({ s: t.s0 + 14 + (t.s1 - t.s0 - 26) * (n === 1 ? rng.range(0.3, 0.7) : (j + rng.range(0.2, 0.8)) / n), half: 4.5, out: 5, tower: t });
  }
  const crossAt = (s) => bridges.find((b) => b.gap && s >= b.g0 && s < b.g1);
  for (let x = 1; x < W - 1; x++) {
    const s = X1 - x - 0.5;
    if (s < 0 || s > S) continue;
    const p = rb.piece(s);
    for (let y = 1; y < Hh - 1; y++) {
      const u = y + 0.5 - YC;
      if (p.k === 'line' && !p.bridge) {   // a round tower top: a disc of floor in (s, u), a parapet round it
        const T = towers.find((q) => q.kind === 'disc' && Math.abs(q.sc - s) <= q.rd + 1.2);
        const d = Math.hypot(s - T.sc, u);
        const toward = T.start ? s > T.sc : s < T.sc;
        if (d < T.rd) set(x, y, 1);
        else if (d < T.rd + 1) { if (toward && Math.abs(u) < 2) set(x, y, 1); else set(x, y, 1, 1); }
        continue;
      }
      if (u > -2 && u < 2) { set(x, y, 1); continue; }
      if (p.k === 'helix') {
        const bal = balconies.find((B) => Math.abs(s - B.s) < B.half);
        if (u < -2 && u > -3) { set(x, y, 1, 1); continue; }   // the drum
        if (bal) {
          const e = ((s - bal.s) / bal.half) ** 2 + ((u - 2) / bal.out) ** 2;
          if (u > 2 && e < 1) { set(x, y, 1); continue; }
          if (u > 2 && e < 1.45 && u < 2 + bal.out + 1.2) { set(x, y, 1, 1); continue; }
        }
        if (u > 2 && u < 3) { if (broken(s, 11) && s > p.s0 + 6 && s < p.s1 - 6) set(x, y, 0); else set(x, y, 1, 1); }
        continue;
      }
      // a bridge: parapets both sides, some fallen
      if (Math.abs(u) > 2 && Math.abs(u) < 3) { const near = s < p.s0 + 3 || s > p.s1 - 3; if (!near && broken(s, u > 0 ? 3 : 5)) set(x, y, 0); else set(x, y, 1, 1); }
    }
  }
  // the gaps: void across lanes and parapets (their crossings fill them: game/castlespires.js)
  for (const br of bridges) if (br.gap) for (let s = Math.floor(br.g0); s < Math.ceil(br.g1); s++) for (let y = YC - 3; y <= YC + 2; y++) { const x = X1 - s - 1; if (x > 0) { map.t[I(x, y)] = 0; map.block[I(x, y)] = 0; } }
  // the parapets beside the gaps' approaches stay whole, and no fallen parapet lies on a landing
  for (const br of bridges) if (br.gap) for (const [a, b] of [[br.g0 - 5, br.g0], [br.g1, br.g1 + 5]]) for (let s = Math.floor(a); s < Math.ceil(b); s++) for (const y of [YC - 3, YC + 2]) { const x = X1 - s - 1, i = I(x, y); if (!map.t[i]) { map.t[i] = 1; map.block[i] = 1; } }

  // ---- the crossings
  const crossings = [], leaps = [], landings = [];
  const P = (s, u = 0) => [X1 - s, YC + u];
  landings.push({ s: towers[0].sc, at: P(towers[0].sc), name: 'the gate tower' });
  for (const br of bridges) {
    if (br.gap) {
      const c = { kind: br.kind, name: CROSSINGS[br.kind].name, how: CROSSINGS[br.kind].how, i: br.i, s0: br.g0, s1: br.g1, h0: br.h0, h1: br.h1, gap: br.gap, near: P(br.g0 - 1.6), far: P(br.g1 + 1.6), tau: br.tau };
      if (br.kind === 'leap' || !opts.live) {   // leap stones both ways (game/phobos.js Pad); every gap gets them until the crossings' runtime (opts.live) exists
        const k = rng.chance(0.5) ? 'leap' : 'swing';
        leaps.push({ x: c.near[0], y: c.near[1], tx: c.far[0], ty: c.far[1], kind: k, from: br.i, to: br.i + 1 });
        leaps.push({ x: c.far[0], y: c.far[1], tx: c.near[0], ty: c.near[1], kind: k, from: br.i + 1, to: br.i, back: true });
      }
      crossings.push(c);
      landings.push({ s: br.g0 - 1.6, at: c.near, name: 'the brink of ' + c.name, cross: c, side: 0 });
      landings.push({ s: br.g1 + 1.6, at: c.far, name: 'the far side of ' + c.name, cross: c, side: 1 });
    }
  }
  for (const t of towers) if (t.kind === 'helix') {
    landings.push({ s: t.s0 + 1.5, at: P(t.s0 + 1.5), name: 'the foot of ' + t.name });
    landings.push({ s: t.s1 - 2.5, at: P(t.s1 - 2.5), name: 'the crown of ' + t.name });
  }
  const summit = towers[towers.length - 1];
  landings.push({ s: summit.sc, at: P(summit.sc), name: summit.name });
  landings.sort((a, b) => a.s - b.s);

  // ---- rooms (the places other systems look for spots), the start, the guardian's summit, a raid arena
  const rooms = [];
  const rect = (s0, s1, u0, u1, o = {}) => { const x0 = Math.floor(X1 - s1), x1 = Math.ceil(X1 - s0), y0 = Math.floor(YC + u0), y1 = Math.ceil(YC + u1); const r = { type: 'room', x: x0, y: y0, w: x1 - x0, h: y1 - y0, mx: (x0 + x1) / 2, my: (y0 + y1) / 2, ...o }; r.idx = rooms.length; rooms.push(r); return r; };
  const start = rect(towers[0].sc - towers[0].rd + 1, towers[0].sc + towers[0].rd - 1, -towers[0].rd + 1, towers[0].rd - 1, { mx: X1 - towers[0].sc, my: YC, shape: 'disc', rr: towers[0].rd });
  for (const B of balconies) rect(B.s - B.half, B.s + B.half, -2, 2 + B.out - 0.5, { mx: X1 - B.s, my: YC + 3, balcony: true });
  for (const t of towers) if (t.kind === 'helix') { rect(t.s0, t.s0 + 6, -2, 2, { landing: true }); rect(t.s1 - 7, t.s1, -2, 2, { landing: true, crown: true }); }
  const top = rect(summit.sc - summit.rd + 1, summit.sc + summit.rd - 1, -summit.rd + 1, summit.rd - 1, { mx: X1 - summit.sc, my: YC, shape: 'disc', rr: summit.rd, summit: true });
  let raid = null, guardRoom = top;
  if (opts.raid) {
    const a = summit.rd - 1.5, ax = Math.floor(top.mx - a), ay = Math.floor(YC - a), aw = Math.ceil(2 * a), cx = top.mx, cy = YC;
    raid = { type: 'arena', x: ax, y: ay, w: aw, h: aw, cx, cy, mx: cx, my: cy, pillars: [], gate: { x: ax + aw + 2, y0: YC - 2, y1: YC + 1 } };
    rooms.push(raid); guardRoom = raid;
  }

  // ---- who lives here: packs up every stair, on the balconies and bridges, the lord on the summit
  const looks = opts.looks, spawns = [], chests = [];
  const keepClear = (s) => bridges.some((b) => b.gap && s > b.g0 - 5 && s < b.g1 + 5) || s < towers[0].sc + towers[0].rd + 2;
  const lane = (s) => { const u = rng.range(-1.4, 1.4), [x, y] = P(s, u); return map.walkable(x, y) ? [x, y] : null; };
  const pack = (at, rank = 'normal', n) => {
    const a = looks && looks.pickArt(rng); if (!a || !at) return;
    const A = ARCH[a.arch] || ARCH.knight;
    spawns.push({ x: at[0], y: at[1], arch: a.arch, n: n ?? rng.int(A.pack[0], A.pack[1]) + (floor > 50 ? 1 : 0), rank, look: { art: a.id, swap: null } });
  };
  const spots = [];
  for (const t of towers) if (t.kind === 'helix') for (let s = t.s0 + 12; s < t.s1 - 8; s += rng.range(18, 26)) if (!keepClear(s)) spots.push(s);
  for (const br of bridges) if (br.s1 - br.s0 > 20) for (const s of br.gap ? [br.s0 + 4, br.s1 - 4] : [(br.s0 + br.s1) / 2]) if (!keepClear(s)) spots.push(s);
  for (const s of spots) pack(lane(s));
  for (const B of balconies) { const at = P(B.s, 3.5); if (map.walkable(...at)) { pack(at); if (chests.length < 3) chests.push({ x: at[0] + 0.5, y: at[1] + 1.2, rare: rng.chance(0.25) }); } }
  const champs = 2 + Math.floor(floor / 20), uniques = 1 + Math.floor(floor / 30);
  for (let k = 0; k < champs + uniques; k++) { const s = rng.pick(spots.length ? spots : [summit.sc]); pack(lane(s + rng.range(-3, 3)), k < champs ? 'champion' : 'unique', rng.int(2, 4)); }
  pack(P(summit.sc + summit.rd * 0.45, -summit.rd * 0.4)); pack(P(summit.sc + summit.rd * 0.45, summit.rd * 0.4));
  if (chests.length < 3) chests.push({ x: X1 - summit.sc - summit.rd * 0.5, y: YC - summit.rd * 0.5, rare: true });
  const gs = raid ? null : P(summit.sc - 1, 0);
  const exitAt = raid ? [raid.cx - 4, raid.cy] : [gs[0] - 2.4, gs[1]];
  const waypoints = crossings.map((c) => c.near);
  return G.lastSpires = {
    map, rooms, spawns, props: [], chests, torches: [], wallHangings: [], leaps, route: waypoints, family: 'spires', layoutName: O.name,
    start: [start.mx, start.my], townPortal: [start.mx + 2.2, start.my - 2.2], exit: exitAt, guardian: gs, bossRoom: guardRoom, raid,
    spires: { rb, towers, bridges, crossings, landings, balconies, plan, style: plan.style, place: plan.place, X1, YC, S, seed },
  };
}
