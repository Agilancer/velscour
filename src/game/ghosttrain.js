// THE IRON EXPRESS (region id ghost_train; docs/GHOST_TRAIN.md): the run. Raiders have taken the night express; the
// hero boards at the caboose and fights forward car by car while it runs (world/ghosttrain.js), and more of them leap
// aboard from the line-side now and then. Their lieutenant holds the prison car halfway along, and the line crosses a
// gorge on an iron trestle. Five times, as the cars are cleared (STATIONS), it pulls in at a station:
// the platform is walkable while it stands there (chests and raiders on it), and when it pulls out whoever is still
// on it is left behind (the hero leaps back aboard). The raiders' chief holds the tender; once he falls the brakes go
// on, the train runs into the Last Stop, and the exit opens on that platform. world.cave is the hook into render.js
// (gfx/ghosttrain3d.js draws; each car's roof and near side are cut away while the hero is in it).
// The chief fights with the train (chiefTick): he heaves burning coal back down the cars in telegraphed lanes, calls
// the furnace to vent steam over the front of the tender, and whistles raiders aboard as his life runs down.
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { camera, HW, HH } from '../core/view.js';
import { rand, pick, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { makeMonster } from './monster.js';
import { dropChest } from './loot.js';
import { addEffect, addLight, Telegraph, Ring, sparkle, smoke, burst, spawn, floatText } from '../gfx/vfx.js';
import { lineTargets } from './hazards.js';
import { depthLevel } from '../data/depth.js';
import { FIGHT_CARS, TENDER, ENGINE, CABOOSE, CZ, ROW0, ROWS, PLAT0, PLAT1, PLAT_LEN, STATIONS, LT_CAR, GORGE_AFTER, platformOn, platformOff, onPlatform, aboardSpot, carAt } from '../world/ghosttrain.js';
import { buildTrain3D, tickTrain3D, drawTrain3D, trainStation, trainCutaway, trainVent, trainGorge, trainGorgeX, ENGINE_BOXES } from '../gfx/ghosttrain3d.js';

const V = 9, A = 3.2;                 // cruising speed (tiles a second) and braking
const STOP = 30, WHISTLE = 8;         // seconds at a station; the warning before she pulls out
const LAST = 'The Last Stop';
const VZ1 = HW * Math.SQRT2 * Math.cos(Math.PI / 6);   // world px a unit of height
/** How much deeper depths press (0 at depth 1, 1 from 150): boarders come sooner and more of them. */
const press = (depth) => Math.min(1, Math.max(0, depth - 1) / 150);
const BARK = {
  coal: ["Stoke 'em!", 'Have some coal!', 'Shovel it on!'],
  vent: ['Open the firebox!', 'Let her blow!', 'Mind the steam!'],
  whistle: ['All hands!', 'Boys, to me!', 'Off my train!'],
  lieutenant: ['Hold the line!', 'Lads! Over here!', 'Not past me!'],
};

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
  // the lieutenant on the prison car halfway along: a guardian a level under the chief, two thirds of his life, no
  // affix (game.js spawns one guardian a level, world.boss; he is the run's own)
  let lieutenant = null;
  if (gen.lieutenant) {
    const L = gen.lieutenant;
    lieutenant = makeMonster(world, L.arch, biome, lvl + 1, 'boss', L.x, L.y, 0, L.look);
    lieutenant.maxHp *= 0.66; lieutenant.hp = lieutenant.maxHp; lieutenant.affixes = []; lieutenant.lieutenant = true;
    lieutenant.name = 'Lieutenant ' + lieutenant.name.replace(/^THE /, '');
    world.add(lieutenant);
  }
  // each fight car's pack (game.js has spawned them from gen.spawns)
  const packs = FIGHT_CARS.map(() => []);
  for (const m of world.creatures) {
    if (m.team !== 'enemy' || m === world.boss) continue;
    const k = FIGHT_CARS.findIndex((c) => m.x >= c.x0 - 0.5 && m.x < c.x1 + 0.5);
    if (k >= 0) packs[k].push(m);
  }
  const boss = world.boss;
  // the chief is the ride's one big fight: a guardian's life (game.js) x1.0 at first, rising to x1.6 by depth 150
  // (deep down he otherwise fell in seconds)
  if (boss) { boss.maxHp *= 1 + 0.6 * press(depth); boss.hp = boss.maxHp; }
  world.onBossAwake = (m) => {
    if (m === lieutenant) { UI.centerMsg(m.name, 'He holds the middle of the train', 3); floatText(m.x, m.y, (m.artH || 60) * (m.scale || 1) + 12, pick(BARK.lieutenant), '#ffc080', 16, { life: 1.6, vz: 18 }); sfx('boss', 0.7); return; }
    UI.centerMsg(m.name, 'He holds the engine', 3); sfx('boss');
  };
  const hull = engineHull();

  const run = {
    id: 'ghost_train', type: 'train', completed: false, failed: false, active: true, markers: [], route: [], stage: 0,
    shrine: { x: CABOOSE.x0 + 4, y: CZ, reach: 2, label: 'Caboose', use() {} },
    phase: 'run',          // run | brake | stop | leave | dying | last | done
    speed: V, stationX: null, stop: null, nextStation: 0, stationsSeen: 0, stations: STATIONS.length, fire: 1, t: 0, gorge: 0, lieutenant,
    cleared: 0, carDone: FIGHT_CARS.map(() => false), boardT: 20, boarders: new Set(),
    chief: { t: 4, k: 0, whistles: [0.66, 0.33], casts: { coal: 0, vent: 0, whistle: 0 }, later: [] },
    get title() { return run.completed ? 'The Last Stop' : run.cleared >= FIGHT_CARS.length ? 'Stop the Engine' : 'Fight to the Engine'; },
    get description() {
      if (run.completed) return 'The train has stopped. The exit is open on the platform.';
      if (run.stop && run.phase === 'stop') return `${run.stop.name}: step off to loot, or stay aboard.`;
      if (lieutenant && !lieutenant.dead && run.cleared >= LT_CAR) return 'Their lieutenant holds the prison car.';
      return run.cleared >= FIGHT_CARS.length ? "The raiders' chief holds the tender." : `Clear the cars: ${run.cleared}/${FIGHT_CARS.length}.`;
    },
    /** Seconds before she pulls out of the station she stands at (null: not at one). */
    get leavesIn() { return run.phase === 'stop' && run.stop && !run.stop.last ? Math.max(0, Math.ceil(STOP - run.stop.t)) : null; },
    get objective() { return objective(); },
    update(dt) { tick(dt); },
  };
  world.trainRun = run;
  run.packs = packs;   // (each fight car's monsters: the test reads them)

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
  function station(name, last = false, look = 'hall') {
    const pl = p();
    const x = Math.round(clamp(pl ? pl.x : CABOOSE.x0 + 12, CABOOSE.x0 + PLAT_LEN / 2 - 3, TENDER.x1 - PLAT_LEN / 2 + 2));
    run.stop = { name, x, last, t: 0, chests: [], whistled: false };
    run.stationX = x + 110; run.phase = 'brake'; run.stationsSeen += last ? 0 : 1;
    trainStation(name, look);
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
      // the long ride pays: five chests, two of them rare
      chest(S.x - 8, true); chest(S.x - 4, Math.random() < 0.5); chest(S.x + 0.5, false); chest(S.x + 4, true); chest(S.x + 8, false);
      if (exit) { exit.x = S.x - 0.5; exit.y = PLAT0 + 2.4; }
      finish();
      return;
    }
    chest(S.x - rand(4, 8), Math.random() < 0.35); chest(S.x + rand(3, 8), false);
    // raiders waiting on the platform
    const n = 3 + (run.stationsSeen > 1 ? 2 : 0) + (depth >= 60 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const at = [S.x + rand(-PLAT_LEN / 2 + 2, PLAT_LEN / 2 - 2), PLAT0 + rand(0.8, 4.2)];
      if (map.walkable(at[0], at[1])) spawnAt(pick(roster), at[0], at[1], i === 0 && (run.stationsSeen > 1 || depth >= 60) ? 'champion' : 'normal');
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

  // ------------------------------------------------------------------ the chief's fight
  // A cast every 6-8 s, coal and steam in turn, and a whistle at 2/3 and 1/3 of his life. Each stands him still for
  // its wind-up (startAction: his own patterns wait) under a telegraph auto-play steps out of (autoplay.dangers).
  const C = run.chief;
  const later = (t, fn) => C.later.push({ t, fn });
  const bark = (k, x = boss.x, y = boss.y) => floatText(x, y, (boss.artH || 60) * (boss.scale || 1) + 12, pick(BARK[k]), '#ffc080', 16, { life: 1.6, vz: 18 });
  const busy = () => boss.state === 'windup' || boss.state === 'act' || boss.entering;
  const LANES = [ROW0 + 0.5, ROW0 + 1.5, ROW0 + 2.5];
  /** Burning coal down two of the three rows, from his feet back along the cars; `safe` is the row it spares. */
  function coalVolley(safe, delay) {
    const x0 = boss.x - 0.6, len = 10, wind = 1.2;
    const lanes = LANES.filter((y, i) => i !== safe);
    later(delay, () => {
      for (const y of lanes) for (const [w, color] of [[0.7, '#ff3a14'], [0.16, '#ffe070']]) addEffect(new Telegraph({ kind: 'line', x: x0, y, ang: Math.PI, len, w, dur: wind, color }), 'ground');   // a red lane, a hot core (the wood floors are orange)
    });
    later(delay + wind, () => {
      if (boss.dead) return;
      for (const y of lanes) {
        for (const c of lineTargets(world, boss.team, x0, y, x0 - len, y, 0.35)) boss.deal(c, boss.dmg * 1.5, 'fire', { knock: 0.5, ang: Math.PI });
        for (let i = 0; i < 9; i++) spawn({ type: 'glow', x: x0 - rand(0, 1), y: y + rand(-0.15, 0.15), z: rand(14, 30), vx: -rand(14, 22), vy: 0, vz: rand(-10, 20), life: rand(0.45, 0.65), size: rand(3.5, 6), size1: 1, color: i % 3 ? '#ff7a20' : '#ffd060', add: true });
        for (let d = 1; d < len; d += 2) later(d * 0.035, () => { burst(x0 - d, y, 6, 'fire', 5, 2.2); smoke(x0 - d, y, 4, '#1c1612', 2, 6); });
      }
      sfx('fire'); sfx('thud', 0.5); camera.shake(4);
    });
  }
  function cast(k) {
    C.casts[k]++; if (k !== 'vent') bark(k);
    boss.bossT = Math.max(boss.bossT || 0, 2);   // his own patterns wait their turn after it
    if (k === 'coal') {
      // two lanes, sparing a row the hero is not on; below half his life a second volley spares another row
      const pl = p(), row = clamp(Math.floor(pl.y - ROW0), 0, 2), safe = pick([0, 1, 2].filter((i) => i !== row));
      boss.face(Math.PI); boss.startAction('train_coal', 1.2);
      coalVolley(safe, 0);
      if (boss.hp < boss.maxHp * 0.5) coalVolley(pick([0, 1, 2].filter((i) => i !== safe)), 1.45);
    } else if (k === 'vent') {
      // he leaps to the coal heap and the furnace blows steam over the front of the tender: stand back
      const to = [TENDER.x1 - 2.6, CZ], from = [boss.x, boss.y], vx = TENDER.x1 - 2.2, r = 3.4, wind = 1.5;
      if (Math.hypot(to[0] - from[0], to[1] - from[1]) > 0.5) {
        let t = 0;
        boss.entering = (dt2) => {
          t += dt2; const k2 = Math.min(1, t / 0.4);
          boss.x = from[0] + (to[0] - from[0]) * k2; boss.y = from[1] + (to[1] - from[1]) * k2; boss.z = 50 * Math.sin(Math.PI * k2);
          if (k2 >= 1) { boss.entering = null; boss.z = 0; boss.nav = null; boss.path = null; }
        };
      }
      boss.startAction('train_vent', wind); bark(k, to[0], to[1]);
      addEffect(new Telegraph({ kind: 'circle', x: vx, y: CZ, r, dur: wind, color: '#e8f4ff' }), 'ground');
      for (let i = 0; i < 5; i++) later(i * 0.25, () => smoke(vx + rand(-1, 1), CZ + rand(-1.2, 1.2), 4, '#d8e0e6', 2, 6));   // the hiss before it blows
      later(wind, () => {
        if (boss.dead) return;
        for (const c of world.hostiles(boss.team, vx, CZ, r + 0.6)) if (Math.hypot(c.x - vx, c.y - CZ) <= r + c.r) boss.deal(c, boss.dmg * 2.2, 'fire', { knock: 1.6, ang: Math.PI });
        addEffect(new Ring(vx, CZ, 0.4, r, 0.45, '#f2f8ff', 6));
        for (let i = 0; i < 16; i++) smoke(vx + rand(-r, r) * 0.8, CZ + rand(-1.4, 1.4), rand(0, 20), '#e6edf2', 2, 14);
        trainVent('vent'); sfx('explode', 0.6); sfx('cold', 0.7); camera.shake(6);
      });
    } else {
      // the whistle: raiders leap aboard round the hero (board()'s own landing rings)
      boss.startAction('train_whistle', 0.9);
      trainVent('whistle'); sfx('bell'); sfx('roar', 0.6);
      later(0.5, () => { if (!boss.dead) board(2 + Math.round(press(depth))); });
    }
  }
  C.cast = cast;   // (the test casts them on cue)
  function chiefTick(dt, fighting) {
    for (let i = C.later.length - 1; i >= 0; i--) { const e = C.later[i]; if ((e.t -= dt) <= 0) { C.later.splice(i, 1); e.fn(); } }
    if (!fighting || busy() || ['stun', 'freeze'].some((k) => boss.status && boss.status[k] && boss.status[k].t > 0)) return;
    if (C.whistles.length && boss.hp < boss.maxHp * C.whistles[0]) { C.whistles.shift(); cast('whistle'); C.t = Math.max(C.t, 3); return; }
    if ((C.t -= dt) > 0) return;
    C.t = rand(6, 8);
    cast(C.k++ % 2 ? 'vent' : 'coal');
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
    if (st && run.cleared >= st.after && run.phase === 'run' && !run.completed && trainGorgeX() == null) { run.nextStation++; station(st.name, false, st.look); }
    // the gorge: once, between stations, while she runs
    if (!run.gorge && run.cleared >= GORGE_AFTER && run.phase === 'run' && !run.completed) {
      run.gorge = 1; trainGorge();
      UI.centerMsg("HANGMAN'S GORGE", 'She crosses on the old iron trestle.', 3); sfx('gate', 0.5);
    }
    // the raiders' chief falls: the brakes go on, the train runs into the Last Stop
    if (boss && boss.dead && run.fire >= 1 && run.phase !== 'dying') {
      if (run.phase === 'stop' && run.stop && !run.stop.last) depart();
      run.phase = 'dying'; run.fire = 0.999; run.stop = null; run.stationX = null; run.speed = V;
      UI.centerMsg('THE ENGINE IS YOURS', 'Brakes on. She slows.', 3);
      sfx('gate', 0.7);
    }
    // the lieutenant whistles his men aboard once, at half his life
    if (lieutenant && !lieutenant.dead && !lieutenant.whistled && lieutenant.hp < lieutenant.maxHp * 0.5) {
      lieutenant.whistled = true; trainVent('whistle'); sfx('bell', 0.7);
      floatText(lieutenant.x, lieutenant.y, (lieutenant.artH || 60) * (lieutenant.scale || 1) + 12, pick(BARK.whistle), '#ffc080', 16, { life: 1.6, vz: 18 });
      board(2 + Math.round(press(depth)));
    }
    // the chief's fight with the train
    if (boss && !boss.dead) chiefTick(dt, boss.awake && pl && !pl.dead && Math.abs(pl.x - boss.x) < 14 && !onPlatform(pl.x, pl.y));
    else run.chief.later.length = 0;
    // raiders board while she runs
    if (run.phase === 'run' && pl && !pl.dead && !run.completed) {
      for (const m of run.boarders) if (m.dead) run.boarders.delete(m);
      if ((run.boardT -= dt) <= 0) {
        run.boardT = rand(22, 32) / (1 + 0.5 * press(depth));   // ~15-21 s from depth 150
        if (run.boarders.size < 8 && run.cleared < FIGHT_CARS.length) board(2 + Math.min(3, run.cleared >> 2) + Math.floor(press(depth)));   // none once the tender is reached
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
