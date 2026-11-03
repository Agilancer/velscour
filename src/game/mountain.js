// MOUNTAINSIDE (docs/MOUNTAINSIDE.md): the climb (world/mountain.js), drawn in three.js (gfx/alpine3d.js, game/alpine.js).
// Live from the start: follow the switchback trail up, fighting the packs that hold it all the way, the champions at
// the top of every way up and the things that leap down off the cliffs onto it; take the summit from its Warden, and the
// way on climbs straight into the Snowy Summit (game/summit.js; game.continueTo). Auto-play follows `objective`.
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { camera } from '../core/view.js';
import { rand, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { VZ } from '../world/caverns.js';
import { LV } from '../world/alpine.js';
import { alpineHook } from './alpine.js';
import { makeMonster } from './monster.js';
import { depthLevel } from '../data/depth.js';
import { addEffect, Ring, Telegraph, smoke, burst } from '../gfx/vfx.js';

export function createMountainRun(world, gen, biome, depth, onSummit) {
  const map = world.map, W = map.w, trail = gen.trail, [sx, sy] = gen.summit, lvl = depthLevel(depth || 1);
  const mt = map.mountain, F = gen.alpine.F;
  world.ambushT = Infinity;   // the mountain directs its own ambushes (the leaps)
  world.biome = { ...world.biome, dark: 0.05 };   // daylight on the mountain (the 3D carries the light)
  world.darkK = 0; world.night = false; world.raining = false;
  const exit = world.portals.find((q) => q.type === 'exit');
  if (exit) { exit.x = exit.y = -100; }   // no exit here: the summit leads on into the Snowy Summit
  const cr = alpineHook(world, gen.alpine, { zoom: 0.92 });
  const tx = (k) => trail[clamp(k, 0, trail.length - 1)] % W + 0.5, ty = (k) => ((trail[clamp(k, 0, trail.length - 1)] / W) | 0) + 0.5;
  const bandAt = (x, y) => mt.band[map.tileIdx(x, y)];
  const top = map.hgt[map.tileIdx(sx, sy)];
  const leaps = (gen.leaps || []).map((l) => ({ ...l, done: false }));
  let snowSaid = false, halfSaid = false, winT = -1;

  const run = {
    id: 'mountainside', type: 'climb', completed: false, failed: false, active: true, reached: false, won: false,
    markers: [], route: [], stage: 0, escort: null, routeIndex: 0, progress: 0,
    shrine: { x: sx, y: sy, reach: 2, label: 'Summit', use() {} },
    get title() { return run.won ? 'The Summit Is Won' : run.reached ? 'Defeat the Summit Warden' : 'Climb to the Summit'; },
    get description() {
      return run.won ? 'The way on climbs into the Snowy Summit.' : run.reached ? `${world.boss ? world.boss.name : 'The Summit Warden'} guards the peak.` : 'Follow the switchback trail up the cliffs to the summit, fighting all the way.';
    },
    /** How far up the hero is, 0..100 % of the climb. */
    get altitude() {
      const p = world.player;
      if (!p || !map.hgt) return 0;
      const lv = map.hgt[map.tileIdx(p.x, p.y)];
      return Math.round(clamp((lv - map.minLevel) / Math.max(1, top - map.minLevel), 0, 1) * 100);
    },
    get objective() {
      if (run.won) return undefined;
      if (run.progress > trail.length - 14 || run.reached) return { x: sx, y: sy + 1.5, reach: 2.5 };
      const k = Math.min(trail.length - 1, run.progress + 10);
      return { x: tx(k), y: ty(k), reach: 1.6 };
    },
    update(dt) {
      cr.frame(dt);
      const p = world.player;
      if (!p) return;
      // how far along the trail the hero has come: the nearest trail tile a little way ahead of the last one
      for (let k = Math.min(trail.length - 1, run.progress + 30); k > run.progress; k--) if (Math.hypot(tx(k) - p.x, ty(k) - p.y) < 2.6) { run.progress = k; break; }
      const b = bandAt(p.x, p.y);
      world.ambientFx = b >= mt.snowBand - 1 ? { type: 'snow', color: '#f4f8ff' } : null;
      if (!snowSaid && b >= mt.snowBand) { snowSaid = true; UI.centerMsg('THE SNOW LINE', 'The Snowy Summit looms above', 2.6); }
      if (!halfSaid && run.progress > trail.length / 2) { halfSaid = true; UI.log('Halfway up. The air thins, and the things on the trail grow bolder.', '#cfe0f0'); }
      for (const l of leaps) if (!l.done && run.progress >= l.ti - 8 && Math.hypot(p.x - l.at[0], p.y - l.at[1]) < 6) leap(l);
      if (!run.reached && Math.hypot(p.x - sx, p.y - sy) < 9) {
        run.reached = true;
        UI.centerMsg('THE SUMMIT', world.boss ? `${world.boss.name}, its Warden, stirs` : 'Its Warden stirs', 3);
      }
      if (!run.won && world.boss && world.boss.dead) {
        run.won = true; winT = 3.2;
        UI.centerMsg('SUMMIT WON', 'The trail climbs on into the Snowy Summit', 3.5);
        UI.log('The Warden falls. Above the summit the trail climbs on, into the snow and the high ridges of the range.', '#cfe8ff');
        sfx('gate');
        addEffect(new Ring(sx, sy + 1, 0.2, 4, 1.2, '#cfe8ff', 6));
      }
      if (winT > 0 && (winT -= dt) <= 0) { run.completed = true; onSummit(); }
    },
  };

  /** Things on the cliff top above the trail leap down onto it as the hero passes beneath. */
  function leap(l) {
    l.done = true;
    const p = world.player, h0 = F.H2(l.from[0], l.from[1]);
    for (let i = 0; i < l.n; i++) {
      const [x, y] = map.randomNear(l.at[0] + rand(-1, 1), l.at[1] + rand(-1, 1), 1.4);
      const arch = world.biome.roster[(Math.random() * world.biome.roster.length) | 0];
      const look = gen.looks.pick(arch, Math.random);
      const m = makeMonster(world, arch, world.biome, lvl + (i === 0 ? 1 : 0), i === 0 ? 'champion' : 'normal', x, y, 0, l.snow ? { ...look, swap: { colorize: [200, 0.45], light: 0.08 }, tint: 'Frostbitten' } : look);
      world.add(m);
      const from = [l.from[0] + rand(-1, 1), l.from[1] + rand(-0.4, 0.4)], to = [x, y], h1 = F.H2(x, y), dur = 0.8 + i * 0.14;
      m.x = from[0]; m.y = from[1]; m.targetable = false; m.awake = true; m.moving = true;
      addEffect(new Telegraph({ kind: 'circle', x, y, r: 0.9, dur, color: '#c0d8ff' }), 'ground');
      let t = -i * 0.12;
      m.entering = (dt) => {
        t += dt; m.animT = (m.animT || 0) + dt;
        const k = clamp(t / dur, 0, 1);
        m.x = from[0] + (to[0] - from[0]) * k; m.y = from[1] + (to[1] - from[1]) * k;
        m.z = ((h0 + (h1 - h0) * k) - F.H2(m.x, m.y)) * VZ + 70 * Math.sin(Math.PI * k);
        if (k >= 1) {
          m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.moving = false; m.cd = rand(0.2, 0.5);
          smoke(m.x, m.y, 4, '#d8e0e8', 8, 12); burst(m.x, m.y, 4, 'phys', 12, 3); camera.shake(3); sfx('thud', 0.6);
        }
      };
    }
    sfx('roar', 0.5);
    UI.log('Something drops off the cliff above!', '#ffc0a0');
    void p;
  }
  void LV;
  return run;
}

/** The Quest Log's steps while on the mountain (src/ui/quest.js, through the region registry). */
export function mountainQuest(sc, step) {
  let h = step(sc.reached || sc.won, `Climb the switchback trail to the summit <span class="dim">— altitude ${sc.altitude}%</span>.`);
  h += step(false, '<span class="dim">A ledge a hop high can be climbed (the hero hops up it); a cliff can be neither climbed nor jumped down. Things wait on the cliff tops.</span>');
  h += step(sc.won, 'Defeat the <b>Summit Warden</b> on the peak.');
  h += step(sc.won, sc.won ? 'The trail climbs on into <b>the Snowy Summit</b>.' : 'Above the summit lies the Snowy Summit.');
  return h;
}
