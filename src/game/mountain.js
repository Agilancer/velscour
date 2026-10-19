// MOUNTAINSIDE (beta): the climb (world/mountain.js). The run is live from the start: reach the summit, defeat the
// Summit Warden waiting there, and the exit on the peak opens. Auto-play follows `objective` (autoplay.js).
import { G } from '../state.js';
import { UI } from '../ui/ui.js';

export function createMountainRun(world, gen, biome, onSuccess) {
  const [sx, sy] = gen.summit, map = world.map;
  const run = {
    id: 'mountainside', type: 'climb', completed: false, failed: false, active: true, reached: false,
    markers: [], route: [], stage: 0, escort: null, routeIndex: 0,
    shrine: { x: sx, y: sy, reach: 2, label: 'Summit', use() {} },
    get title() { return run.completed ? 'The Summit Is Won' : run.reached ? 'Defeat the Summit Warden' : 'Climb to the Summit'; },
    get description() {
      return run.completed ? 'The way on lies open on the peak.' : run.reached ? 'The Summit Warden guards the peak.' : 'Follow the switchback trail up the cliffs to the summit.';
    },
    /** How far up the hero is, 0..100 % of the climb. */
    get altitude() {
      const p = world.player;
      if (!p || !map.hgt) return 0;
      const lv = map.hgt[map.tileIdx(p.x, p.y)], top = map.hgt[map.tileIdx(sx, sy)];
      return Math.round(Math.max(0, Math.min(1, (lv - map.minLevel) / Math.max(1, top - map.minLevel))) * 100);
    },
    get objective() { return run.completed ? undefined : { x: sx, y: sy + 1.5, reach: 2.5 }; },
    update() {
      const p = world.player;
      if (!run.reached && p && Math.hypot(p.x - sx, p.y - sy) < 8) {
        run.reached = true;
        UI.centerMsg('THE SUMMIT', 'The Summit Warden stirs', 3);
      }
      if (!run.completed && world.boss && world.boss.dead) {
        run.completed = true;
        UI.centerMsg('SUMMIT WON', 'The exit on the peak is open', 3.5);
        onSuccess();
        UI.refresh();
        if (G.game?.autosave) G.game.autosave();
      }
    },
  };
  return run;
}
