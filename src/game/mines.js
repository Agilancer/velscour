// THE DEEP RAIL MINES, played (docs/DEEP_RAIL_MINES.md; the map is world/mines.js). The hero starts at the Lift Head.
// Each shaft's minecart waits at its out stop; using it rides the line to the next shaft down (a short cut scene:
// input locked, the camera on the cart, the hero standing in it). At a junction a switch by the cart picks the line.
// The cart stays where it stopped; the next shaft's own cart waits across it. At the Bottom something waits; its death
// opens the exit there. Auto-play follows `objective` (autoplay.js): to the cart and use it, then the boss.
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { isoX, isoY, camera } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { Cine } from './cinema.js';
import { addEffect, Ring, sparkle, addLight, spawn } from '../gfx/vfx.js';
import { drawCart, drawLever, drawRails, drawBuffer, railArt } from '../gfx/mines.js';

const VMAX = 7.5, ACC = 4.5;   // a ride's top speed (tiles a second) and how fast it gets there and stops

export function createMinesRun(world, gen, biome, depth, win) {
  world.tileset = gen.tileset;   // the floors and walls were built from the mine's own set (world/mines.js)
  const map = world.map, M = gen.mine, { shafts, edges } = M, bottom = shafts[shafts.length - 1];
  const p0 = () => world.player;
  // the carts: one waits at every shaft's out stop, set to the first of its lines
  const carts = [];
  for (const s of shafts) {
    if (!s.out.length) continue;
    s.pick = 0;
    const cart = { x: s.outAt[0], y: s.outAt[1], ang: s.out[0].pts[0][2], shaft: s, used: false };
    carts.push(cart); s.cart = cart;
    cart.portal = {
      x: cart.x, y: cart.y, type: 'minecart', seagate: true, active: false, color: '#ffc070', reach: 1.7,   // seagate: drawPortal draws nothing (the cart is ours); inactive: no portal glow
      get label() { return cart.used ? null : `Minecart → ${s.out[s.pick].to.name}`; },
      use: () => ride(s),
    };
    world.portals.push(cart.portal);
    if (s.out.length > 1) {
      s.lever = { x: s.leverAt[0], y: s.leverAt[1], type: 'switch', seagate: true, active: false, color: '#ffcf70', reach: 1.5,
        get label() { return cart.used ? null : `Switch: ${s.pick ? 'right' : 'left'} line`; },
        use: () => flip(s) };
      world.portals.push(s.lever);
    }
  }
  // which line goes left on screen: the one heading down +y
  for (const s of shafts) if (s.out.length > 1) s.out.sort((a, b) => (a.xDom ? 1 : 0) - (b.xDom ? 1 : 0));
  for (const s of shafts) if (s.cart) s.cart.ang = s.out[s.pick].pts[0][2];
  const parked = [];   // carts that rode down and stopped at a buffer

  const run = {
    id: 'deep_mines', type: 'mines', mine: M, completed: false, failed: false, active: true, markers: [], route: [], stage: 0,
    shrine: { x: gen.start[0], y: gen.start[1], reach: 2, label: 'The Lift Head', use() {} },
    at: shafts[0], ride: null, rides: 0, seen: new Set([shafts[0]]), path: [shafts[0].name],
    get bottom() { return run.at === bottom; },
    get title() { return run.completed ? 'The Mines Are Quiet' : run.bottom ? 'Kill What Waits Below' : 'Ride the Carts Down'; },
    get description() {
      return run.completed ? 'The exit at the Bottom is open.' : run.bottom ? 'Something waits at the Bottom.' : 'Ride the minecarts down to the Bottom.';
    },
    get objective() {
      if (run.completed || run.ride) return undefined;
      const s = run.at;
      if (s === bottom) { const b = world.boss; return b && !b.dead ? { x: b.x, y: b.y, reach: 2.2 } : undefined; }
      const c = s.cart;
      return c && !c.used ? { x: c.x - 0.9, y: c.y - 0.9, reach: 1.2, use: () => { if (s.out.length > 1 && Math.random() < 0.5) flip(s); ride(s); } } : undefined;
    },
    /** Which shaft (if any) the tile at (x, y) belongs to. */
    shaftAt(x, y) { const r = M.room[map.tileIdx(x, y)]; return r >= 0 ? shafts[r] : null; },
    flip: (s) => flip(s), ridesLeft: () => run.at.k < M.L,
    update(dt) {
      if (run.ride) tickRide(dt);
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
    if (!s.cart || s.cart.used || s.out.length < 2 || run.ride) return;
    s.pick = 1 - s.pick;
    s.cart.ang = s.out[s.pick].pts[0][2];
    sfx('block', 0.6, 0.7);
    sparkle(s.leverAt[0], s.leverAt[1], 30, '#ffcf70', 6, 0.4);
    UI.log(`Switch thrown: the cart goes to <b>${s.out[s.pick].to.name}</b>.`, '#e8d0a0');
  }

  function ride(s) {
    const c = s.cart, p = p0();
    if (!c || c.used || run.ride || !p || p.dead || G.cine) return;
    if (Math.hypot(p.x - c.x, p.y - c.y) > 3) return;
    const e = s.out[s.pick];
    c.used = true;
    run.ride = { e, s: 0, v: 0, cart: c };
    p.path = null; p.moveTarget = null; p.attackTarget = null; p.interact = null; p.lootTarget = null;
    sfx('door', 0.8, 0.8);
    const lead = () => { const q = p0(); return [isoX(q.x, q.y), isoY(q.x, q.y) - 30]; };
    Cine.play([{ cam: { on: lead, zoom: 0.86, dur: 0.7 } }, { until: () => !run.ride, max: 40 }]);
    tickRide(0);
  }

  function tickRide(dt) {
    const R = run.ride, p = p0(), e = R.e, P = e.pts, end = e.len;
    // speed up, run, brake for the buffer
    const brake = Math.sqrt(Math.max(0, 2 * ACC * (end - R.s)));
    R.v = Math.min(VMAX, R.v + ACC * dt, Math.max(0.6, brake));
    R.s = Math.min(end, R.s + R.v * dt);
    const f = R.s / e.step, i = Math.min(P.length - 1, Math.floor(f)), k = f - i, a = P[i], b = P[Math.min(P.length - 1, i + 1)];
    const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, ang = a[2];
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
    if (R.v > 3 && Math.random() < dt * 14) spawn({ type: 'glow', x: x + Math.cos(ang + 2.6) * 0.6, y: y + Math.sin(ang + 2.6) * 0.6, z: 4, vz: 20, life: 0.3, size: 2, size1: 0.4, color: '#ffd080', add: true });
    if (R.s >= end - 1e-3) arrive();
  }

  function arrive() {
    const R = run.ride, p = p0(), t = R.e.to;
    R.cart.ang = R.e.pts[R.e.pts.length - 1][2];
    parked.push(R.cart);
    run.ride = null; run.at = t; run.rides++; run.seen.add(t); run.path.push(t.name);
    if (p) {
      // step off toward the middle of the shaft; the party catches up
      p.z = 0;
      const d = Math.hypot(t.x - t.inAt[0], t.y - t.inAt[1]) || 1;
      let [x, y] = [t.inAt[0] + ((t.x - t.inAt[0]) / d) * 1.4, t.inAt[1] + ((t.y - t.inAt[1]) / d) * 1.4];
      if (!map.walkable(x, y)) [x, y] = map.randomNear(t.inAt[0], t.inAt[1], 2);
      p.x = x; p.y = y;
      for (const c of world.creatures) if (c !== p && c.team === 'player' && !c.dead) { [c.x, c.y] = map.randomNear(x, y, 1.6); c.aggro = null; c.foe = null; c.nav = null; c.fol = null; }
      map.flowFrom = [-9, -9];
      map.reveal(x, y, 10);
    }
    sfx('thud', 0.9, 0.7); camera.shakeAmt = Math.max(camera.shakeAmt || 0, 4);
    addEffect(new Ring(t.inAt[0], t.inAt[1], 0.2, 2, 0.6, '#ffc070', 3));
    if (t === bottom) UI.centerMsg('THE BOTTOM', 'Something stirs below', 3);
    else UI.centerMsg(t.name.toUpperCase(), `Shaft ${t.k + 1} of ${M.L + 1}${t.out.length > 1 ? ' · a junction' : ''}`, 2.4);
  }

  // the drawing: rails on the floor, buffer stops, carts and switches in the depth-sorted pass
  const arts = edges.map(railArt);
  const buffers = shafts.filter((s) => s.in.length).map((s) => { const e = s.in[0], q = e.pts[e.pts.length - 1]; return { x: q[0], y: q[1], ang: q[2] }; });
  world.addHazard({ ground: true, keep: true, update: () => true, draw(ctx) { drawRails(ctx, arts); } });
  const near = (x, y) => { const vr = camera.viewRect(120), px = isoX(x, y), py = isoY(x, y); return px > vr.x0 && px < vr.x1 && py > vr.y0 && py < vr.y1 + 60; };
  for (const b of buffers) world.addHazard({ keep: true, x: b.x, y: b.y, get depth() { return b.x + b.y - 0.6; }, update: () => true, draw(ctx) { if (near(b.x, b.y)) drawBuffer(ctx, b.x + Math.cos(b.ang) * 0.75, b.y + Math.sin(b.ang) * 0.75, b.ang); } });
  for (const c of carts) {
    const riding = () => run.ride && run.ride.cart === c;
    world.addHazard({ keep: true, get x() { return c.x; }, get y() { return c.y; }, get depth() { return c.x + c.y - 0.05; },
      update: () => { if (!c.used && near(c.x, c.y)) addLight(c.x, c.y, 2.2, 0.6, 30, '#ffc070'); return true; },
      draw(ctx) { if (riding() || near(c.x, c.y)) drawCart(ctx, c.x, c.y, c.ang, 0); } });
    world.addHazard({ keep: true, get x() { return c.x; }, get y() { return c.y; }, get depth() { return c.x + c.y + 0.08; }, update: () => true,
      draw(ctx) { if (riding()) drawCart(ctx, c.x, c.y, c.ang, 1); } });
  }
  for (const s of shafts) if (s.lever) {
    const l = s.lever;
    world.addHazard({ keep: true, x: l.x, y: l.y, depth: l.x + l.y, update: () => true, draw(ctx) { if (near(l.x, l.y)) drawLever(ctx, l.x, l.y, s.pick ? 1 : -1, !s.cart.used); } });
  }
  return run;
}

/** The Quest Log's steps inside (ui/quest.js). */
export function minesQuest(sc, step) {
  const L = sc.at ? sc.at.tiers : 0, boss = G.world && G.world.boss;
  let h = step(sc.bottom || sc.completed, `Ride the minecarts down to the Bottom <span class="dim">— shaft ${sc.at.k + 1} of ${L + 1}, ${sc.at.name}</span>.`);
  h += step(false, '<span class="dim">At a junction, throw the switch by the cart to pick the line.</span>');
  h += step(sc.completed, `Kill ${boss && (boss.awake || boss.dead) ? `<b>${boss.name}</b>` : 'what waits at the Bottom'}.`);
  h += step(sc.completed, sc.completed ? 'The exit at the Bottom is open.' : 'Its death opens the way out.');
  return h;
}
