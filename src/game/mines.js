// THE DEEP RAIL MINES, played (docs/DEEP_RAIL_MINES.md; the map is world/mines.js). The hero starts at the Lift Head.
// Each shaft's minecart waits at its out stop; using it rides the line to the next shaft down (a short cut scene:
// input locked, the camera on the cart, the hero standing in it). At a junction a switch by the cart picks the line.
// The cart then waits at the lower buffer stop, facing back up, and rides the same line back to its own shaft: so the
// hero can back out of a junction and take the other line, or leave the Bottom. At the Bottom something waits; its
// death opens the exit there. Auto-play follows `objective` (autoplay.js): to the cart and down, never back up unless
// the shaft has no cart down; then the boss. Each variant (world/mines.js MINE_VARIANTS) has a twist, run here: ore
// (more chests, in the map), water (flooded tunnels, pools that slow, slow carts), glow (a ride mends you), magma
// (lava under the rails, pools that flare under the hero), cavein (loose roofs rain rock on some rides).
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { isoX, isoY, camera, HW, HH } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { Cine } from './cinema.js';
import { addEffect, Ring, sparkle, addLight, spawn, smoke, floatText } from '../gfx/vfx.js';
import { Delayed } from './hazards.js';
import { hit } from './combat.js';
import { drawCart, drawLever, drawRails, drawBuffer, railArt } from '../gfx/mines.js';
import { monsterBase } from './monster.js';
import { depthLevel } from '../data/depth.js';

const VMAX = 7.5, ACC = 4.5;   // a ride's top speed (tiles a second) and how fast it gets there and stops (the flooded mine's are lower)

/** A point on line `e` at arc length `s`: [x, y, heading down the line]. */
function lineAt(e, s) {
  const P = e.pts, f = Math.max(0, Math.min(e.len, s)) / e.step, i = Math.min(P.length - 1, Math.floor(f)), k = f - i, a = P[i], b = P[Math.min(P.length - 1, i + 1)];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2]];
}

export function createMinesRun(world, gen, biome, depth, win) {
  world.tileset = gen.tileset;   // the floors and walls were built from the mine's own set (world/mines.js)
  const map = world.map, M = gen.mine, { shafts, edges } = M, bottom = shafts[shafts.length - 1], V = M.variant || { twist: 'ore' };
  const vmax = V.vmax || VMAX, acc = V.acc || ACC;
  const p0 = () => world.player;
  const shaftAt = (x, y) => { const r = M.room[map.tileIdx(x, y)]; return r >= 0 ? shafts[r] : null; };
  // monsters a level tougher every second tier down (as if that much deeper: data/depth.js depthLevel)
  const lvl0 = depthLevel(depth);
  for (const m of world.creatures) {
    if (m.team !== 'enemy' || m.dead || !m.level || m === world.boss) continue;   // (the boss is two levels up already)
    const s = shaftAt(m.x, m.y), up = s ? depthLevel(depth + (s.k >> 1)) - lvl0 : 0;
    if (up <= 0) continue;
    const a = monsterBase(m.level), b = monsterBase(m.level + up);
    m.maxHp *= b.hp / a.hp; m.hp = m.maxHp; m.dmg *= b.dmg / a.dmg; m.xp *= b.xp / a.xp; m.level += up;
  }
  // a free spot by a stop to step off onto: in the shaft, on open floor, clear of its rails
  const railNear = (q) => edges.flatMap((e) => e.pts.filter((r) => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) < 5));
  const stepOff = (q, s) => {
    const rails = railNear(q);
    let best = null, score = -Infinity;
    for (const r of [1.5, 2.2]) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = q[0] + Math.cos(a) * r, y = q[1] + Math.sin(a) * r;
      if (!map.walkable(x, y) || shaftAt(x, y) !== s || !map.circleFree(x, y, 0.3)) continue;
      const clear = Math.min(1.2, ...rails.map((p) => Math.hypot(p[0] - x, p[1] - y))), v = clear * 10 - Math.hypot(x - s.x, y - s.y) * 0.2 - r;
      if (v > score) { score = v; best = [x, y]; }
    }
    return best || map.randomNear(q[0], q[1], 2);
  };
  for (const s of shafts) { s.offIn = s.in.length ? stepOff(s.inAt, s) : null; s.offOut = s.out.length ? stepOff(s.outAt, s) : null; }
  // which line goes left on screen: the one heading down +y
  for (const s of shafts) if (s.out.length > 1) s.out.sort((a, b) => (a.xDom ? 1 : 0) - (b.xDom ? 1 : 0));
  // the carts: one per shaft with a line down. Home at its out stop (`at` null), or parked at the foot of line `at`
  const carts = [];
  const home = (c) => { const s = c.shaft; c.at = null; c.x = s.outAt[0]; c.y = s.outAt[1]; c.ang = s.out[s.pick].pts[0][2]; };
  const park = (c, e) => { const q = e.pts[e.pts.length - 1]; c.at = e; c.x = q[0]; c.y = q[1]; c.ang = q[2] + Math.PI; };   // facing back up
  for (const s of shafts) {
    if (!s.out.length) continue;
    s.pick = 0;
    const cart = { shaft: s, at: null, x: 0, y: 0, ang: 0, get used() { return !!cart.at; } };
    home(cart);
    carts.push(cart); s.cart = cart;
    cart.portal = {
      get x() { return cart.x; }, get y() { return cart.y; },
      type: 'minecart', seagate: true, active: false, color: '#ffc070', reach: 1.7,   // seagate: drawPortal draws nothing (the cart is ours); inactive: no portal glow
      get label() {
        if (run.ride) return null;
        const e = cart.at || s.out[s.pick], loose = e.caveAt ? ' · loose roof' : '';
        return cart.at ? `Minecart back up → ${s.name}${loose}` : `Minecart → ${e.to.name}${loose}`;
      },
      use: () => (cart.at ? rideUp(cart) : ride(s)),
    };
    world.portals.push(cart.portal);
    if (s.out.length > 1) {
      s.lever = { x: s.leverAt[0], y: s.leverAt[1], type: 'switch', seagate: true, active: false, color: '#ffcf70', reach: 1.5,
        get label() { return cart.at || run.ride ? null : `Switch: ${s.pick ? 'right' : 'left'} line`; },
        use: () => flip(s) };
      world.portals.push(s.lever);
    }
  }
  const parkedAt = (s) => carts.find((c) => c.at && c.at.to === s);

  const run = {
    id: 'deep_mines', type: 'mines', mine: M, variant: V, caveins: 0, flares: 0, mends: 0, completed: false, failed: false, active: true, markers: [], route: [], stage: 0,
    shrine: { x: gen.start[0], y: gen.start[1], reach: 2, label: 'The Lift Head', use() {} },
    at: shafts[0], ride: null, rides: 0, ridesUp: 0, seen: new Set([shafts[0]]), path: [shafts[0].name], carts,
    get bottom() { return run.at === bottom; },
    get title() { return run.completed ? 'The Mines Are Quiet' : run.bottom ? 'Kill What Waits Below' : 'Ride the Carts Down'; },
    get description() {
      return run.completed ? 'The exit at the Bottom is open.' : run.bottom ? 'Something waits at the Bottom.' : 'Ride the minecarts down to the Bottom.';
    },
    /** Auto-play's next step: always down toward the Bottom; back up only when this shaft has no cart down. */
    get objective() {
      if (run.ride || (run.completed && run.bottom)) return undefined;
      const s = run.at;
      if (s === bottom) { const b = world.boss; return b && !b.dead ? { x: b.x, y: b.y, reach: 2.2 } : undefined; }
      const c = s.cart;
      if (c && !c.at) return { x: s.offOut[0], y: s.offOut[1], reach: 1.2, use: () => { if (s.out.length > 1 && Math.random() < 0.5) flip(s); ride(s); } };
      const u = parkedAt(s);   // stuck: no cart down here, so ride back up and try again
      return u ? { x: s.offIn[0], y: s.offIn[1], reach: 1.2, use: () => rideUp(u) } : undefined;
    },
    /** Which shaft (if any) the tile at (x, y) belongs to. */
    shaftAt, flip: (s) => flip(s), rideUp: (c) => rideUp(c), parkedAt, ridesLeft: () => run.at.k < M.L,
    update(dt) {
      if (run.ride) tickRide(dt);
      else if (V.twist === 'magma') flare(dt);
      else {   // the hero was carried somewhere else (a town portal back, a test): that's the shaft he's in now
        const p = p0(), s = p && shaftAt(p.x, p.y);
        if (s && s !== run.at) { run.at = s; if (s.cart && s.cart.at) home(s.cart); }
      }
      if (!run.completed && world.boss && world.boss.dead) {
        run.completed = true;
        UI.centerMsg('THE BOTTOM IS QUIET', 'The exit is open', 3.5);
        win();
        UI.refresh();
        if (G.game?.autosave) G.game.autosave();
      }
    },
  };

  function flip(s) {
    if (!s.cart || s.cart.at || s.out.length < 2 || run.ride) return;
    s.pick = 1 - s.pick;
    s.cart.ang = s.out[s.pick].pts[0][2];
    sfx('block', 0.6, 0.7);
    sparkle(s.leverAt[0], s.leverAt[1], 30, '#ffcf70', 6, 0.4);
    UI.log(`Switch thrown: the cart goes to <b>${s.out[s.pick].to.name}</b>.`, '#e8d0a0');
  }

  function start(c, e, up) {
    const p = p0();
    if (!c || run.ride || !p || p.dead || G.cine) return false;
    if (Math.hypot(p.x - c.x, p.y - c.y) > 3) return false;
    run.ride = { e, s: 0, v: 0, cart: c, up, caved: !e.caveAt };
    p.path = null; p.moveTarget = null; p.attackTarget = null; p.interact = null; p.lootTarget = null;
    sfx('door', 0.8, 0.8);
    const lead = () => { const q = p0(); return [isoX(q.x, q.y), isoY(q.x, q.y) - 30]; };
    Cine.play([{ cam: { on: lead, zoom: 0.86, dur: 0.7 } }, { until: () => !run.ride, max: 40 }]);
    tickRide(0);
    return true;
  }
  function ride(s) { const c = s.cart; if (c && !c.at) start(c, s.out[s.pick], false); }
  function rideUp(c) { if (c && c.at) start(c, c.at, true); }

  function tickRide(dt) {
    const R = run.ride, p = p0(), e = R.e, end = e.len;
    // speed up, run, brake for the buffer
    const brake = Math.sqrt(Math.max(0, 2 * acc * (end - R.s)));
    R.v = Math.min(vmax, R.v + acc * dt, Math.max(0.6, brake));
    R.s = Math.min(end, R.s + R.v * dt);
    const [x, y, a] = lineAt(e, R.up ? end - R.s : R.s), ang = R.up ? a + Math.PI : a;   // the cart faces the way it goes
    R.cart.x = x; R.cart.y = y; R.cart.ang = ang;
    if (p) {
      p.x = x; p.y = y; p.z = 15; p.moving = false;
      if (p.face && Math.abs(Math.cos(ang) - Math.sin(ang)) > 0.2) p.face(ang);
      map.reveal(x, y, 7);
    }
    // a cut scene skips the world's own lights: the lamps along the way, and the cart's
    const lamp = world.biome.torch || '#ff9a40';
    for (const t of world.torches) if (Math.abs(t.x - x) + Math.abs(t.y - y) < 16) addLight(t.x, t.y, 5.5 + Math.sin(world.time * 9 + t.x) * 0.3, 0.9, t.flameZ ?? 20, lamp);
    addLight(x, y, 3, 0.7, 30, '#ffc070');
    if (!R.caved && (R.up ? 1 - e.caveAt : e.caveAt) * end <= R.s) caveIn(R, x, y);
    if (V.twist === 'water' && R.v > 1.5 && Math.random() < dt * 18) spawn({ type: 'glow', x: x + Math.cos(ang + 2.4) * 0.5, y: y + Math.sin(ang + 2.4) * 0.5, z: 2, vz: 40, life: 0.35, size: 2.5, size1: 0.5, color: '#a0f0ff', add: true });
    if (V.twist === 'magma' && Math.random() < dt * 10) spawn({ type: 'glow', x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2, z: 2, vz: 30, life: 0.6, size: 2, size1: 0, color: '#ff8a30', add: true });
    if (R.v > 3 && Math.random() < dt * 14) spawn({ type: 'glow', x: x + Math.cos(ang + 2.6) * 0.6, y: y + Math.sin(ang + 2.6) * 0.6, z: 4, vz: 20, life: 0.3, size: 2, size1: 0.4, color: '#ffd080', add: true });
    if (R.s >= end - 1e-3) arrive();
  }

  function arrive() {
    const R = run.ride, p = p0(), up = R.up, t = up ? R.e.from : R.e.to;
    if (up) home(R.cart);
    else {
      for (const o of carts) if (o !== R.cart && o.at && o.at.to === t) home(o);   // one cart to a stop: another one there is hauled home
      park(R.cart, R.e);
      if (t.cart && t.cart.at) home(t.cart);
    }
    run.ride = null; run.at = t; run.rides++; if (up) run.ridesUp++; run.seen.add(t); run.path.push((up ? '^' : '') + t.name);
    const stop = up ? t.outAt : t.inAt;
    if (p) {
      p.z = 0;
      const [x, y] = (up ? t.offOut : t.offIn) || map.randomNear(stop[0], stop[1], 2);
      p.x = x; p.y = y;
      for (const c of world.creatures) if (c !== p && c.team === 'player' && !c.dead) { [c.x, c.y] = map.randomNear(x, y, 1.6); c.aggro = null; c.foe = null; c.nav = null; c.fol = null; }
      map.flowFrom = [-9, -9];
      map.reveal(x, y, 10);
    }
    sfx('thud', 0.9, 0.7); camera.shakeAmt = Math.max(camera.shakeAmt || 0, 4);
    addEffect(new Ring(stop[0], stop[1], 0.2, 2, 0.6, '#ffc070', 3));
    if (V.twist === 'glow' && p && !p.dead) {   // the Crystal Vein mends a rider
      run.mends++; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2); if (p.maxMana) p.mana = Math.min(p.maxMana, p.mana + p.maxMana * 0.2);
      sparkle(p.x, p.y, 30, '#a0ffff', 14, 0.6); floatText(p.x, p.y, 50, 'the vein mends you', '#a0ffff', 11);
    }
    if (t === bottom) UI.centerMsg('THE BOTTOM', run.completed ? 'The exit is open' : 'Something stirs below', 3);
    else UI.centerMsg(t.name.toUpperCase(), `Shaft ${t.k + 1} of ${M.L + 1}${up ? ' · back up' : ''}${t.out.length > 1 ? ' · a junction' : ''}`, 2.4);
  }

  // the Collapsed Dig: a loose roof gives way over the cart; it brakes hard, rock rains, the rubble stays by the rails
  function caveIn(R, x, y) {
    R.caved = true; R.v = Math.min(R.v, 1); run.caveins++;
    const p = p0();
    camera.shakeAmt = Math.max(camera.shakeAmt || 0, 11); sfx('thud', 1, 0.5); sfx('block', 0.7, 0.4);
    smoke(x, y, 20, '#5a5048', 10, 14);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * 1.6;
      spawn({ type: 'gib', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: 120 + Math.random() * 160, vx: 0, vy: 0, vz: -Math.random() * 60, g: 420, life: 2.2, size: 2 + Math.random() * 3.5, color: Math.random() < 0.5 ? '#5a5048' : '#3e3832', w: 1, bounces: 1, rot: 0, vr: (Math.random() - 0.5) * 10 });
    }
    const n = R.e.pts.length, e = R.e;
    e.rubble ||= [];
    for (let i = 0; i < 7; i++) {   // heaps beside the rails, out of the cart's way
      const q = e.pts[Math.min(n - 1, Math.max(0, Math.round(e.caveAt * n) + ((Math.random() * 9) | 0) - 4))], side = Math.random() < 0.5 ? -1 : 1, off = 0.75 + Math.random() * 0.4;
      e.rubble.push({ x: q[0] - Math.sin(q[2]) * side * off, y: q[1] + Math.cos(q[2]) * side * off, s: 3 + Math.random() * 4, c: Math.random() < 0.5 ? '#4a423a' : '#5e554c' });
    }
    if (p && !p.dead) {
      const d = Math.min(p.maxHp * 0.08, p.hp - 1);
      if (d > 0) hit(null, p, d, 'phys', { force: true, crit: false, dot: true });
      UI.log('The roof gives way over the cart!', '#d0b090');
    }
  }
  // the Forge-Deep: a magma pool near the hero swells and bursts at its rim, under him (a ring to step out of)
  let flareT = 3;
  const flareDmg = () => monsterBase(depthLevel(depth)).dmg * 1.6;
  function flare(dt) {
    const p = p0();
    if (!p || p.dead || G.cine || (flareT -= dt) > 0) return;
    flareT = 4 + Math.random() * 3;
    if (run.at === bottom) return;   // the Bottom's pools only glow: the boss is fight enough
    const near = M.pools.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.r + 3.5);
    if (!near.length) return;
    const q = near[(Math.random() * near.length) | 0], a = Math.atan2(p.y - q.y, p.x - q.x), d = Math.min(q.r + 1.4, Math.hypot(p.x - q.x, p.y - q.y));
    const x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d, dm = flareDmg();
    world.addHazard(new Delayed({ world, team: 'enemy', x, y, r: 1.6, delay: 1.3, dmg: [dm, dm * 1.3], el: 'fire', fx: 'eruption' }));
    run.flares++;
  }

  // the drawing: rails on the floor, buffer stops at both ends, carts and switches in the depth-sorted pass
  const arts = edges.map(railArt);
  // flooded or molten tunnels: water or lava under the rails (every blocked tunnel tile), in culled 8x8 buckets
  if (V.twist === 'water' || V.twist === 'magma') {
    const W = map.w, B = new Map(), lava = V.twist === 'magma';
    for (let i = 0; i < map.t.length; i++) {
      if (!map.t[i] || !map.block[i] || M.room[i] >= 0) continue;
      const x = i % W, y = (i / W) | 0, k = ((y >> 3) << 12) | (x >> 3);
      let b = B.get(k); if (!b) B.set(k, (b = { q: [], x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }));
      const c = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([u, v]) => [isoX(u, v), isoY(u, v)]);
      b.q.push(c); for (const [u, v] of c) { b.x0 = Math.min(b.x0, u); b.x1 = Math.max(b.x1, u); b.y0 = Math.min(b.y0, v); b.y1 = Math.max(b.y1, v); }
    }
    const buckets = [...B.values()];
    world.addHazard({ ground: true, keep: true, update: () => true, draw(ctx) {
      const vr = camera.viewRect(40), t = world.time;
      ctx.fillStyle = lava ? `rgba(255,${86 + Math.round(Math.sin(t * 2.3) * 14)},20,0.5)` : 'rgba(30,110,125,0.5)';
      ctx.beginPath();
      for (const b of buckets) {
        if (b.x1 < vr.x0 || b.x0 > vr.x1 || b.y1 < vr.y0 || b.y0 > vr.y1) continue;
        for (const c of b.q) { ctx.moveTo(...c[0]); ctx.lineTo(...c[1]); ctx.lineTo(...c[2]); ctx.lineTo(...c[3]); ctx.closePath(); }
      }
      ctx.fill();
    } });
  }
  // pools: water (slows whatever wades in) and magma (rock to walk round, glowing; it flares)
  for (const q of M.pools || []) {
    const lava = q.kind === 'magma';
    world.addHazard({ ground: true, keep: true, x: q.x, y: q.y,
      update(dt) {
        if (lava) { if (near(q.x, q.y)) addLight(q.x, q.y, q.r + 2.5, 0.8, 4, '#ff7020'); return true; }
        for (const c of world.creatures) {
          if (c.dead || Math.hypot(c.x - q.x, c.y - q.y) > q.r) continue;
          const sl = c.status.slow; if (!sl || sl.t < 0.2 || sl.amt < 0.35) c.status.slow = { t: 0.25, amt: 0.35 };
          if (c.moving && Math.random() < dt * 6) spawn({ type: 'glow', x: c.x, y: c.y, z: 2, vz: 30, life: 0.3, size: 2, size1: 0.4, color: '#b0f0ff', add: true });
        }
        return true;
      },
      draw(ctx) {
        if (!near(q.x, q.y)) return;
        const t = world.time, R = (q.r + 0.35) * HW * 1.41;
        ctx.save(); ctx.translate(isoX(q.x, q.y), isoY(q.x, q.y)); ctx.scale(1, HH / HW);   // a circle on the floor
        ctx.fillStyle = lava ? '#1a0804' : 'rgba(8,28,34,0.6)';
        ctx.beginPath(); ctx.arc(0, 0, R + 5, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R), f = lava ? 0.08 * Math.sin(t * 2.2 + q.x) : 0;
        if (lava) { g.addColorStop(0, '#fff2a8'); g.addColorStop(0.3 + f, '#ffb22e'); g.addColorStop(0.72, '#e0500e'); g.addColorStop(1, '#5a1606'); }
        else { g.addColorStop(0, 'rgba(110,200,210,0.5)'); g.addColorStop(0.7, 'rgba(40,130,150,0.55)'); g.addColorStop(1, 'rgba(18,64,80,0.75)'); }
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
        if (lava) {   // a crust drifting on it
          ctx.fillStyle = 'rgba(40,12,4,0.55)';
          for (let k = 0; k < 6; k++) { const a = q.x * 7 + k * 1.9 + t * 0.06 * (k % 2 ? 1 : -1), d = R * (0.3 + ((k * 0.37 + q.y) % 0.5)); ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * 0.16, R * 0.1, a, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.strokeStyle = lava ? 'rgba(255,236,150,0.7)' : 'rgba(190,240,255,0.45)'; ctx.lineWidth = 1.4;
        for (let k = 0; k < 2; k++) { const u = ((t * (lava ? 0.25 : 0.4) + k * 0.5 + q.x) % 1); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(0, 0, R * u, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
      } });
  }
  // the rubble of the roofs that came down
  world.addHazard({ ground: true, keep: true, update: () => true, draw(ctx) {
    for (const e of edges) if (e.rubble) for (const r of e.rubble) {
      if (!near(r.x, r.y)) continue;
      const px = isoX(r.x, r.y), py = isoY(r.x, r.y);
      ctx.fillStyle = r.c; ctx.beginPath(); ctx.moveTo(px - r.s * 1.4, py); ctx.lineTo(px - r.s * 0.5, py - r.s * 1.1); ctx.lineTo(px + r.s * 0.7, py - r.s * 0.9); ctx.lineTo(px + r.s * 1.3, py); ctx.closePath(); ctx.fill();
    }
  } });
  const buffers = shafts.filter((s) => s.in.length).map((s) => { const e = s.in[0], q = e.pts[e.pts.length - 1]; return { x: q[0] + Math.cos(q[2]) * 0.75, y: q[1] + Math.sin(q[2]) * 0.75, ang: q[2] }; });
  // the out stops too (a cart rides back up into them): behind the stop, square to its line (a junction's: the diagonal)
  for (const s of shafts) if (s.out.length) { const a = s.out.length > 1 ? Math.PI / 4 : s.out[0].pts[0][2]; buffers.push({ x: s.outAt[0] - Math.cos(a) * 0.75, y: s.outAt[1] - Math.sin(a) * 0.75, ang: a }); }
  world.addHazard({ ground: true, keep: true, update: () => true, draw(ctx) { drawRails(ctx, arts); } });
  const near = (x, y) => { const vr = camera.viewRect(120), px = isoX(x, y), py = isoY(x, y); return px > vr.x0 && px < vr.x1 && py > vr.y0 && py < vr.y1 + 60; };
  for (const b of buffers) world.addHazard({ keep: true, x: b.x, y: b.y, get depth() { return b.x + b.y - 0.6; }, update: () => true, draw(ctx) { if (near(b.x, b.y)) drawBuffer(ctx, b.x, b.y, b.ang); } });
  for (const c of carts) {
    const riding = () => run.ride && run.ride.cart === c;
    world.addHazard({ keep: true, get x() { return c.x; }, get y() { return c.y; }, get depth() { return c.x + c.y - 0.05; },
      update: () => { if (!riding() && near(c.x, c.y)) addLight(c.x, c.y, 2.2, 0.6, 30, '#ffc070'); return true; },
      draw(ctx) { if (riding() || near(c.x, c.y)) drawCart(ctx, c.x, c.y, c.ang, 0); } });
    world.addHazard({ keep: true, get x() { return c.x; }, get y() { return c.y; }, get depth() { return c.x + c.y + 0.08; }, update: () => true,
      draw(ctx) { if (riding()) drawCart(ctx, c.x, c.y, c.ang, 1); } });
  }
  for (const s of shafts) if (s.lever) {
    const l = s.lever;
    world.addHazard({ keep: true, x: l.x, y: l.y, depth: l.x + l.y, update: () => true, draw(ctx) { if (near(l.x, l.y)) drawLever(ctx, l.x, l.y, s.pick ? 1 : -1, !s.cart.at); } });
  }
  return run;
}

/** The Quest Log's steps inside (ui/quest.js). */
export function minesQuest(sc, step) {
  const L = sc.at ? sc.at.tiers : 0, boss = G.world && G.world.boss;
  let h = step(sc.bottom || sc.completed, `Ride the minecarts down to the Bottom <span class="dim">— shaft ${sc.at.k + 1} of ${L + 1}, ${sc.at.name}</span>.`);
  h += step(false, '<span class="dim">At a junction, throw the switch by the cart to pick the line. A cart that brought you down rides back up.</span>');
  h += step(sc.completed, `Kill ${boss && (boss.awake || boss.dead) ? `<b>${boss.name}</b>` : 'what waits at the Bottom'}.`);
  h += step(sc.completed, sc.completed ? 'The exit at the Bottom is open.' : 'Its death opens the way out.');
  return h;
}
