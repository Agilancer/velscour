// People out in the world (overworld scenarios, the Dark Forest's trials, dungeon encounters): one NPC record that
// the renderer draws from the People and Animals pack, with the town's emotions. `feel`/`say` set a mood or a line;
// the tick keeps their timers and lets them react on their own: cowering (and flinching away) when an awake monster
// is close, lying dead at 0 hp, cheering when the area's scenario is won. Scripts can switch any of it off with
// `n.calm` (no fear), `n.still` (no flinching) or by setting an emotion with a long timer.
import { rand, pick, chance, dist } from '../core/util.js';
import { TOWNSFOLK, folkLabel } from '../data/townsfolk.js';
import { townFacingFlip, EMOTIONS } from './townsfolkvisuals.js';
import { preloadTownSheets } from './render.js';

const SCARED = ['Help!', 'Monsters!', 'Save us!', 'Stay back!', 'Hero! Over here!'];
const CHEER = ['Huzzah!', 'You did it!', 'Bless you, hero!', 'We\'re saved!'];

/** A person from the roster (`who`: a TOWNSFOLK entry, a role/sheet id, or a test) at (x, y). */
export function makeFolk(world, who, x, y, extra = {}) {
  const v = typeof who === 'object' && who.spriteId ? who
    : TOWNSFOLK.find(typeof who === 'function' ? who : (q) => q.role === who || q.spriteId === who) || pick(TOWNSFOLK.filter((q) => !q.royal && !q.child));
  void preloadTownSheets([v.spriteId]);
  const n = {
    name: folkLabel(v), folk: v, role: v.role, sprite: 'townsfolk', townsfolkSpriteId: v.spriteId, frameCount: v.frame.count, child: v.child, knight: v.knight,
    idleH: v.child ? 150 : undefined, x, y, flip: chance(0.5), hp: 100, reach: 1.6, animT: rand(0, 3), walkT: 0, idleSeed: Math.floor(rand(0, 9)),
    walking: false, running: false, emotion: null, emotionT: 0, emoteClock: 0, talkText: '', talkT: 0, talkAge: 0, icon: null, iconT: 0, iconAge: 0,
    feel(emo, dur = 3, icon = true) {
      this.emotion = emo; this.emotionT = dur; this.emoteClock = 0;
      const ic = icon && EMOTIONS[emo]?.icon;
      if (ic) { this.icon = ic; this.iconT = Math.min(dur, 2.8); this.iconAge = 0; }
    },
    say(text, dur = 3, emo = null) { this.talkText = text; this.talkT = dur; this.talkAge = 0; this.iconT = 0; if (emo) this.feel(emo, dur + 0.5, false); },
    face(px, py) { this.flip = townFacingFlip(px - this.x, py - this.y, this.flip); },
    /** Run `fn` after `s` seconds of game time (paused with the game, unlike setTimeout). */
    after(s, fn) { (this.timers || (this.timers = [])).push([s, fn]); },
    update(dt) { folkTick(world, this, dt); if (this.onTick) this.onTick(dt); },
    use() { if (this.onUse) this.onUse(); else if (!this.talkT) this.say(pick(this.chatter || ['Careful out here.', 'Light keep you.', 'Mind the shadows.'])); },
    ...extra,
  };
  return n;
}

export function folkTick(world, n, dt) {
  n.animT += dt; n.emoteClock += dt; n.talkAge += dt; n.iconAge += dt;
  n.talkT = Math.max(0, n.talkT - dt); n.emotionT = Math.max(0, n.emotionT - dt); n.iconT = Math.max(0, n.iconT - dt);
  n.townPoseT = Math.max(0, (n.townPoseT || 0) - dt);
  if (n.timers) for (const t of n.timers.slice()) if ((t[0] -= dt) <= 0) { n.timers.splice(n.timers.indexOf(t), 1); t[1](); }
  if (!n.walking) n.walkT = 0;
  n.walking = false;
  if (n.hp <= 0) { if (n.emotion !== 'dead') n.feel('dead', 1e9, false); n.emotionT = 1e9; return; }
  const sc = world.overworldScenario || world.scenario;
  if (sc && sc.completed && !n.cheered) { n.cheered = true; n.feel(chance(0.5) ? 'cheer' : 'celebrate', 4); if (chance(0.5)) n.say(pick(CHEER), 2.5); }
  if (n.calm || n.emotionT > 30) return;
  if ((n.scanT = (n.scanT || 0) - dt) > 0) return;
  n.scanT = 0.35;
  let threat = null, td = 4;
  for (const m of world.creatures) if (!m.dead && m.team === 'enemy' && m.awake) { const q = dist(m.x, m.y, n.x, n.y); if (q < td) { td = q; threat = m; } }
  if (threat) {
    if (n.emotion !== 'scared' && n.emotion !== 'panic' && chance(0.35) && !n.talkT) n.say(pick(SCARED), 1.8);
    n.feel(td < 2 ? 'panic' : 'scared', 1, n.emotion !== 'scared' && n.emotion !== 'panic');
    n.face(threat.x, threat.y);
    // a flinch away from it (never off the walkable floor)
    if (!n.still && td < 2.2) {
      const k = 0.35 / Math.max(td, 0.3), nx = n.x + (n.x - threat.x) * k, ny = n.y + (n.y - threat.y) * k;
      if (world.map.walkable(nx, ny)) { n.x = nx; n.y = ny; }
    }
  } else if ((n.emotion === 'scared' || n.emotion === 'panic') && n.emotionT < 0.5) n.feel('relieved', 2.5);
}

/** Walk `n` toward `target` along a real path at `speed` tiles/s (bouncing, facing its way). */
export function folkWalk(world, n, target, speed, dt) {
  const map = world.map;
  if (!n.path || (n.repath = (n.repath || 0) - dt) <= 0) { n.path = map.findPath(n.x, n.y, target[0], target[1], 30000, 0.3); n.repath = 0.8; }
  if (!n.path || !n.path.length) return false;
  while (n.path.length > 1 && Math.hypot(n.x - n.path[0][0], n.y - n.path[0][1]) < 0.35) n.path.shift();
  const [tx, ty] = n.path[0], d = Math.hypot(tx - n.x, ty - n.y), k = Math.min(1, dt * speed / Math.max(d, 1e-3));
  const nx = n.x + (tx - n.x) * k, ny = n.y + (ty - n.y) * k;
  if (!map.walkable(nx, ny)) { n.path = null; return false; }
  n.flip = townFacingFlip(nx - n.x, ny - n.y, n.flip); n.walking = true; n.running = speed > 2.5; n.walkT += dt; n.x = nx; n.y = ny;
  return true;
}
