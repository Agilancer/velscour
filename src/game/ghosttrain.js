// THE IRON EXPRESS (region id ghost_train; docs/GHOST_TRAIN.md): the run. Raiders have taken the night express; the
// hero boards at the caboose and fights forward car by car while it runs (world/ghosttrain.js), and more of them leap
// aboard from the line-side now and then. After the second and the fourth car are cleared it pulls in at a station:
// the platform is walkable while it stands there (chests and raiders on it), and when it pulls out whoever is still
// on it is left behind (the hero leaps back aboard). The raiders' chief holds the tender; once he falls the brakes go
// on, the train runs into the Last Stop, and the exit opens on that platform. world.cave is the hook into render.js
// (gfx/ghosttrain3d.js draws; each car's roof and near side are cut away while the hero is in it).
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { camera, HW, HH } from '../core/view.js';
import { rand, pick, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { makeMonster } from './monster.js';
import { dropChest } from './loot.js';
import { addEffect, addLight, Telegraph, sparkle, smoke } from '../gfx/vfx.js';
import { depthLevel } from '../data/depth.js';
import { FIGHT_CARS, TENDER, ENGINE, CABOOSE, CZ, ROW0, ROWS, PLAT0, PLAT1, PLAT_LEN, platformOn, platformOff, onPlatform, aboardSpot, carAt } from '../world/ghosttrain.js';
import { buildTrain3D, tickTrain3D, drawTrain3D, trainStation, trainCutaway, ENGINE_BOXES } from '../gfx/ghosttrain3d.js';

const V = 9, A = 3.2;                 // cruising speed (tiles a second) and braking
const STOP = 30, WHISTLE = 8;         // seconds at a station; the warning before she pulls out
const STATIONS = [{ after: 2, name: 'Hollowmere Halt' }, { after: 4, name: "Saint Vey's Crossing" }];
const LAST = 'The Last Stop';
const VZ1 = HW * Math.SQRT2 * Math.cos(Math.PI / 6);   // world px a unit of height

/** The engine's silhouette on screen (world px): one convex hull of its boxes, for cutting sprites behind it. */
function engineHull() {
  const pts = [];
  for (const [x0, x1, z0, z1, y0, y1] of ENGINE_BOXES) for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [y0, y1]) pts.push([(x - z) * HW, (x + z) * HH - y * VZ1]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const h = lo.slice(0, -1).concat(hi.slice(0, -1));
  return { h, x0: Math.min(...h.map((p) => p[0])), x1: Math.max(...h.map((p) => p[0])), y0: Math.min(...h.map((p) => p[1])), y1: Math.max(...h.map((p) => p[1])) };
}

export function createGhostTrainRun(world, gen, biome, depth, onSuccess) {
  const map = world.map, lvl = depthLevel(depth), looks = world.looks;
  world.ambushT = Infinity;   // the train directs its own arrivals
  world.raining = false;
  const exit = world.portals.find((q) => q.type === 'exit');
  if (exit) { exit.x = exit.y = -100; }   // the exit opens on the Last Stop's platform
  const p = () => world.player;
  // each fight car's pack (game.js has spawned them from gen.spawns)
  const packs = FIGHT_CARS.map(() => []);
  for (const m of world.creatures) {
    if (m.team !== 'enemy' || m === world.boss) continue;
    const k = FIGHT_CARS.findIndex((c) => m.x >= c.x0 - 0.5 && m.x < c.x1 + 0.5);
    if (k >= 0) packs[k].push(m);
  }
  const boss = world.boss;
  world.onBossAwake = (m) => { UI.centerMsg(m.name, 'He holds the engine', 3); sfx('boss'); };
  const hull = engineHull();

  const run = {
    id: 'ghost_train', type: 'train', completed: false, failed: false, active: true, markers: [], route: [], stage: 0,
    shrine: { x: CABOOSE.x0 + 4, y: CZ, reach: 2, label: 'Caboose', use() {} },
    phase: 'run',          // run | brake | stop | leave | dying | last | done
    speed: V, stationX: null, stop: null, nextStation: 0, stationsSeen: 0, fire: 1, t: 0,
    cleared: 0, carDone: FIGHT_CARS.map(() => false), boardT: 20, boarders: new Set(),
    get title() { return run.completed ? 'The Last Stop' : run.cleared >= FIGHT_CARS.length ? 'Stop the Engine' : 'Fight to the Engine'; },
    get description() {
      if (run.completed) return 'The train has stopped. The exit is open on the platform.';
      if (run.stop && run.phase === 'stop') return `${run.stop.name}: step off to loot, or stay aboard.`;
      return run.cleared >= FIGHT_CARS.length ? "The raiders' chief holds the tender." : `Clear the cars: ${run.cleared}/${FIGHT_CARS.length}.`;
    },
    /** Seconds before she pulls out of the station she stands at (null: not at one). */
    get leavesIn() { return run.phase === 'stop' && run.stop && !run.stop.last ? Math.max(0, Math.ceil(STOP - run.stop.t)) : null; },
    get objective() { return objective(); },
    update(dt) { tick(dt); },
  };
  world.trainRun = run;

  // ------------------------------------------------------------------ the renderer's hook (world.cave)
  const cr = world.cave = {
    focus: [CABOOSE.x0 + 4, 0, CZ], zoomK: 0.9, cut: false, elev: null, pick: null,
    /** Who the cars hide (game/caverns.js horizon): -Infinity inside a roofed car the hero isn't in (rims still
     *  show), the top of an open car's near side, else null. */
    horizon(o) {
      if (onPlatform(o.x, o.y) || o.y < ROW0 - 0.2) return null;
      const car = carAt(o.x), pl = p();
      if (!car || car.kind === 'engine' || o.x >= car.x1 || (pl && pl.x >= car.x0 - 0.6 && pl.x <= car.x1 + 0.6)) return null;
      if (car.roof) return -Infinity;
      if (car.wall <= 0.4) return null;
      const z1 = ROW0 + ROWS + 0.1, fy = (o.x + o.y) * HH - (o.z || 0), top = (o.x - o.y + 2 * z1) * HH - car.wall * VZ1;
      if (top >= fy - 5) return null;
      return top <= fy - (o.viewH || 46 * (o.scale || 1)) ? -Infinity : top;
    },
    /** The engine in front of a creature on the tender: its outline cut out of the sprite. */
    mask(o) {
      if (o.x >= ENGINE.x0 || o.x < TENDER.x0 - 2) return null;
      const sx = (o.x - o.y) * HW, fy = (o.x + o.y) * HH - (o.z || 0), top = fy - (o.viewH || 60);
      if (sx + 30 < hull.x0 || sx - 30 > hull.x1 || fy < hull.y0 || top > hull.y1) return null;
      return (ctx) => { ctx.moveTo(hull.h[0][0], hull.h[0][1]); for (let i = 1; i < hull.h.length; i++) ctx.lineTo(hull.h[i][0], hull.h[i][1]); ctx.closePath(); };
    },
    drawProp() {},
    frame(dt, snap = false) {
      const pl = p(); if (pl) { cr.focus[0] = pl.x; cr.focus[2] = pl.y; }
      if (snap || Math.abs(camera.zoomK - cr.zoomK) > 0.002) { camera.zoomK = cr.zoomK; camera.computeZoom(); }
    },
    draw(ctx) { drawTrain3D(ctx, cr.focus); },
  };
  buildTrain3D(world);

  // ------------------------------------------------------------------ monsters
  const roster = biome.roster;
  const spawnAt = (arch, x, y, rank = 'normal') => {
    const m = makeMonster(world, arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, x, y, 0, looks ? looks.pick(arch) : undefined);
    world.add(m); return m;
  };
  /** A walkable tile on the cars near tile x (null: none). */
  const carSpot = (x) => {
    for (let k = 0; k < 12; k++) {
      const tx = clamp(x + rand(-1.5, 1.5), CABOOSE.x0 + 2, TENDER.x1 - 2.5), ty = ROW0 + Math.floor(rand(0, ROWS)) + 0.5;
      if (map.walkable(tx, ty)) return [tx, ty];
    }
    return null;
  };
  /** Raiders leap aboard from the line-side: a ring where each lands, then the leap. */
  function board(n) {
    const pl = p(); if (!pl) return;
    const ahead = pl.x + (Math.random() < 0.7 ? rand(3, 6) : -rand(3, 5));
    for (let i = 0; i < n; i++) {
      const to = carSpot(ahead + i * 0.8); if (!to) continue;
      addEffect(new Telegraph({ kind: 'circle', x: to[0], y: to[1], r: 0.9, dur: 0.9, color: '#ff9040' }), 'ground');
      const from = [to[0] - rand(1, 3), ROW0 + ROWS + rand(3, 5)], arch = pick(roster), dur = 0.9 + i * 0.12;
      const m = spawnAt(arch, to[0], to[1]);
      m.x = from[0]; m.y = from[1]; m.targetable = false; m.awake = true; m.moving = true;
      run.boarders.add(m);
      let t = 0;
      m.entering = (dt2) => {
        t += dt2; m.animT = (m.animT || 0) + dt2;
        const k = Math.min(1, t / dur);
        m.x = from[0] + (to[0] - from[0]) * k; m.y = from[1] + (to[1] - from[1]) * k; m.z = 120 * Math.sin(Math.PI * k) - 50 * (1 - k);
        if (k >= 1) {
          m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.moving = false; m.cd = rand(0.2, 0.5);
          smoke(m.x, m.y, 4, '#6a5a4a', 3, 9); sfx('thud', 0.5);
        }
      };
    }
    sfx('roar', 0.5);
  }

  // ------------------------------------------------------------------ stations
  function station(name, last = false) {
    const pl = p();
    const x = Math.round(clamp(pl ? pl.x : CABOOSE.x0 + 12, CABOOSE.x0 + PLAT_LEN / 2 - 3, TENDER.x1 - PLAT_LEN / 2 + 2));
    run.stop = { name, x, last, t: 0, chests: [], whistled: false };
    run.stationX = x + 110; run.phase = 'brake'; run.stationsSeen += last ? 0 : 1;
    trainStation(name);
    UI.centerMsg(name.toUpperCase(), last ? 'Brakes on. She runs into her last stop.' : 'A station ahead. She slows.', 3);
    sfx('bell', 0.8);
  }
  function arrive() {
    const S = run.stop, x0 = S.x - PLAT_LEN / 2, x1 = S.x + PLAT_LEN / 2;
    run.phase = 'stop'; run.speed = 0; run.stationX = S.x;
    platformOn(map, x0, x1);
    camera.shake(3); sfx('thud', 0.8);
    const chest = (cx, rare) => {
      const ch = { x: cx, y: PLAT1 - 1.4, rare, opened: false, reach: 1.3, train: true,
        use() { if (this.opened) return; this.opened = true; sfx('chest'); sfx('gold'); dropChest(world, this, depth); sparkle(this.x, this.y, 20, '#ffd060', 20, 0.5); } };
      world.chests.push(ch); S.chests.push(ch);
    };
    if (S.last) {
      chest(S.x - 4, true); chest(S.x + 4, Math.random() < 0.5); chest(S.x + 0.5, false);
      if (exit) { exit.x = S.x - 0.5; exit.y = PLAT0 + 2.4; }
      finish();
      return;
    }
    chest(S.x - rand(4, 8), Math.random() < 0.35); chest(S.x + rand(3, 8), false);
    // raiders waiting on the platform
    const n = 3 + (run.stationsSeen > 1 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const at = [S.x + rand(-PLAT_LEN / 2 + 2, PLAT_LEN / 2 - 2), PLAT0 + rand(0.8, 4.2)];
      if (map.walkable(at[0], at[1])) spawnAt(pick(roster), at[0], at[1], i === 0 && run.stationsSeen > 1 ? 'champion' : 'normal');
    }
    UI.log(`${S.name}. Step off to loot, or stay aboard. She leaves in ${STOP} seconds.`, '#ffd8a0');
  }
  function depart() {
    const S = run.stop;
    run.phase = 'leave';
    // whoever is still on the platform: the hero and his allies leap aboard, raiders are left behind, loot is swept on
    const pl = p();
    for (const c of world.creatures) {
      if (c.dead || !onPlatform(c.x, c.y)) continue;
      if (c.team === 'enemy') { c.dead = true; c.hp = 0; c.noLoot = true; c.removeT = 1; continue; }
      const to = aboardSpot(map, c.x);
      c.x = to[0]; c.y = to[1]; c.path = null; c.moveTarget = null;
      if (c === pl) { UI.log('You leap for the train as she pulls out.', '#ffd8a0'); smoke(c.x, c.y, 4, '#6a5a4a', 3, 9); }
    }
    for (const l of world.loot) if (onPlatform(l.x, l.y)) { const to = aboardSpot(map, l.x + rand(-1, 1)); l.x = to[0]; l.y = to[1]; }
    for (const ch of S.chests) { const i = world.chests.indexOf(ch); if (i >= 0) world.chests.splice(i, 1); }
    platformOff(map);
    sfx('bell', 0.6);
  }
  function finish() {
    if (run.completed) return;
    run.completed = true; run.phase = 'done';
    UI.centerMsg('THE LAST STOP', 'The train is still. The exit is open.', 3.5);
    onSuccess();
    UI.refresh();
    if (G.game?.autosave) G.game.autosave();
  }

  // ------------------------------------------------------------------ auto-play's goal (autoplay.js reads ow.objective)
  function objective() {
    const pl = p();
    if (run.completed || !pl) return undefined;
    const S = run.stop;
    if (run.phase === 'stop' && S) {
      const left = STOP - S.t, ch = S.chests.filter((c) => !c.opened).sort((a, b) => Math.abs(a.x - pl.x) - Math.abs(b.x - pl.x))[0];
      if (ch && left > 6) return { x: ch.x, y: ch.y + 0.4, reach: 1.1, use: () => ch.use() };
      if (onPlatform(pl.x, pl.y)) { const to = aboardSpot(map, pl.x); return { x: to[0], y: to[1], reach: 0.8 }; }   // back aboard
    }
    if (run.phase === 'dying' || run.phase === 'last' || (run.phase === 'brake' && S && S.last)) return { x: pl.x, y: pl.y, reach: 3 };   // ride it out
    const k = run.carDone.indexOf(false);
    if (k >= 0) {
      const live = packs[k].filter((m) => !m.dead);
      const m = live.sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
      const car = FIGHT_CARS[k];
      return m ? { x: m.x, y: m.y, reach: 2 } : { x: (car.x0 + car.x1) / 2, y: CZ, reach: 2 };
    }
    if (boss && !boss.dead) return { x: boss.x, y: boss.y, reach: 2 };
    return { x: pl.x, y: pl.y, reach: 3 };
  }

  // ------------------------------------------------------------------ each tick
  function tick(dt) {
    run.t += dt;
    const pl = p();
    // the train's motion
    if (run.phase === 'brake' || run.phase === 'last') {
      const S = run.stop, brakeAt = (V * V) / (2 * A), off = run.stationX - S.x;
      if (off > brakeAt + 0.01 && run.speed >= V) run.stationX -= run.speed * dt;
      else {
        run.speed = Math.max(0, run.speed - A * dt);
        run.stationX = S.x + (run.speed * run.speed) / (2 * A);
        if (run.speed <= 0) arrive();
      }
    } else if (run.phase === 'stop') {
      const S = run.stop;
      if (!S.last) {
        S.t += dt;
        if (!S.whistled && S.t > STOP - WHISTLE) { S.whistled = true; UI.centerMsg('ALL ABOARD!', `${WHISTLE} seconds`, 2.2); sfx('bell'); }
        if (S.t >= STOP) depart();
      }
    } else if (run.phase === 'leave') {
      run.speed = Math.min(V, run.speed + A * 0.7 * dt);
      run.stationX -= run.speed * dt;
      if (run.stationX < -80) { run.stationX = null; run.stop = null; run.phase = 'run'; }
    } else if (run.phase === 'dying') {
      run.fire = Math.max(0.3, run.fire - dt / 3);   // steam shut off: the smoke thins as she brakes
      if (run.fire <= 0.3) { run.phase = 'last'; station(LAST, true); run.phase = 'last'; }
    }
    // cars cleared, one by one
    FIGHT_CARS.forEach((car, k) => {
      if (run.carDone[k] || packs[k].some((m) => !m.dead)) return;
      run.carDone[k] = true; run.cleared++;
      UI.centerMsg(`CAR ${k + 1} CLEAR`, run.cleared >= FIGHT_CARS.length ? 'The tender. Their chief holds the engine.' : `${FIGHT_CARS.length - run.cleared} to go`, 2.2);
    });
    const st = STATIONS[run.nextStation];
    if (st && run.cleared >= st.after && run.phase === 'run' && !run.completed) { run.nextStation++; station(st.name); }
    // the raiders' chief falls: the brakes go on, the train runs into the Last Stop
    if (boss && boss.dead && run.fire >= 1 && run.phase !== 'dying') {
      if (run.phase === 'stop' && run.stop && !run.stop.last) depart();
      run.phase = 'dying'; run.fire = 0.999; run.stop = null; run.stationX = null; run.speed = V;
      UI.centerMsg('THE ENGINE IS YOURS', 'Brakes on. She slows.', 3);
      sfx('gate', 0.7);
    }
    // raiders board while she runs
    if (run.phase === 'run' && pl && !pl.dead && !run.completed) {
      for (const m of run.boarders) if (m.dead) run.boarders.delete(m);
      if ((run.boardT -= dt) <= 0) {
        run.boardT = rand(22, 32);
        if (run.boarders.size < 8 && run.cleared < FIGHT_CARS.length) board(2 + Math.min(3, run.cleared >> 1));   // none once the tender is reached
      }
    }
    // lamplight for the 2D darkness: the cars' lamps near the hero, the firebox, the headlamp, the station's lamps
    if (pl) {
      for (let x = Math.floor((pl.x - 14) / 5) * 5; x < pl.x + 14; x += 5) if (x > CABOOSE.x0 && x < TENDER.x1) addLight(x, CZ, 4.6, 0.6, 40, '#ffc070');
      if (Math.abs(pl.x - ENGINE.x0) < 18) { addLight(ENGINE.x0 + 1.5, CZ, 6, 0.4 + 0.5 * run.fire, 30, '#ff8a3a'); addLight(ENGINE.x1 + 1, CZ, 7, 0.9, 50, '#fff0c8'); }
      if (run.stationX != null && Math.abs(run.stationX - pl.x) < 30) for (let x = -11; x <= 11; x += 5.5) addLight(run.stationX + x, PLAT1 - 0.2, 5, 0.8, 70, '#ffd890');
    }
    trainCutaway(pl ? pl.x : null);
    tickTrain3D(dt, { speed: run.speed, stationX: run.stationX, fire: run.fire });
    cr.frame(dt);
  }
  return run;
}
