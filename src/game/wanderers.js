// Wanderers: Herrington Hollow's townsfolk out on the overworld maps (the Wilds, the Castle, the Sea of Sand).
// They walk real paths between landmarks with their animated sheets (facing their way), cower and flee when monsters
// come near, cheer when the area is won, and talk. One or two of them carry a bounty ("!" over the head): walk up to
// them (auto-play does) and they ask for a number of kills, a guardian slain or a relic fetched, and pay out on the spot.
import { G } from '../state.js';
import { rand, chance, pick, dist, angleTo } from '../core/util.js';
import { TOWNSFOLK, folkLabel } from '../data/townsfolk.js';
import { townFacingFlip } from './townsfolkvisuals.js';
import { preloadTownSheets } from './render.js';
import { GroundItem } from './loot.js';
import { rollItem, rollGem } from '../data/items.js';
import { depthLevel } from '../data/depth.js';
import { floatText, sparkle, addEffect, Ring } from '../gfx/vfx.js';
import { sfx } from '../core/audio.js';
import { UI } from '../ui/ui.js';

const LINES = {
  idle: ['Keep to the road, friend.', 'These woods were safer once.', 'Mind the ruins after dark.', 'I heard wolves at dawn.', 'Bless you for walking this way.', 'My cart broke a mile back.'],
  scared: ['Monsters! Run!', 'Help! Over here!', 'Not again!', 'Save us!', 'Back, foul thing!'],
  cheer: ['Huzzah! The way is clear!', 'You did it!', 'Herrington Hollow owes you!', 'Drinks are on me tonight!'],
  ask: ['A word, hero! I have coin for you.', 'Please — I need a sword arm!', 'Over here! A bounty!'],
};
const BOUNTIES = [
  { kind: 'kills', text: (n) => `Thin out the beasts on this road — slay ${n} of them.`, n: () => 12 + Math.floor(rand(0, 10)) },
  { kind: 'elite', text: () => 'A champion pack hounds us. Put down its leader.', n: () => 1 },
  { kind: 'relic', text: () => 'I dropped my family heirloom out there. Fetch it?', n: () => 1 },
];

/** Put `n` townsfolk on the overworld map, walking between `spots` ([x, y] list of reachable places). */
export function addWanderers(world, spots, n = 5) {
  const map = world.map, depth = world.depth;
  const folk = TOWNSFOLK.filter((v) => !v.royal && !v.courtier && !v.child);
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(pick(folk));
  void preloadTownSheets(picked.map((v) => v.spriteId));
  const givers = 1 + (chance(0.5) ? 1 : 0);
  picked.forEach((v, i) => {
    const [sx, sy] = map.randomNear(...pick(spots), 2.5);
    const w = {
      name: folkLabel(v), wanderer: true, x: sx, y: sy, reach: 2.2, flip: chance(0.5),
      townsfolkSpriteId: v.spriteId, pal: v.palette, frameCount: v.frame.count, knight: v.knight,
      animT: rand(3), walkT: 0, idleSeed: i % 3, walking: false, talkT: 0, talkText: '', waitT: rand(0, 3), chatT: rand(8, 20),
      path: null, goal: null, mood: 'calm', fleeT: 0,
      bounty: i < givers ? { ...pick(BOUNTIES), state: 'offer' } : null,
      say(t, d = 3) { this.talkText = t; this.talkT = d; },
      use() {
        const b = this.bounty;
        if (!b || b.state === 'paid') { this.say(pick(LINES.idle)); return; }
        if (b.state === 'offer') startBounty(world, this);
        else this.say(b.kind === 'relic' ? 'The heirloom lies where the beacon shines.' : `Still ${Math.max(0, b.need - progress(world, b))} to go!`);
      },
      update(dt) { wanderTick(world, this, spots, dt); },
    };
    world.npcs.push(w);
  });
}

function progress(world, b) {
  if (b.kind === 'kills') return world.kills - b.k0;
  if (b.kind === 'elite') return b.target && b.target.dead ? 1 : 0;
  return b.found ? 1 : 0;
}

function startBounty(world, n) {
  const b = n.bounty, p = world.player;
  b.state = 'active'; b.k0 = world.kills; b.need = b.n();
  n.say(b.text(b.need), 5);
  if (b.kind === 'elite') {
    // the nearest living champion or unique leader, else any monster with a few friends
    let best = null, bd = Infinity;
    for (const m of world.creatures) if (!m.dead && m.team === 'enemy' && (m.rank === 'champion' || m.rank === 'unique')) { const d = dist(m.x, m.y, n.x, n.y); if (d < bd) { bd = d; best = m; } }
    if (!best) best = world.creatures.find((m) => !m.dead && m.team === 'enemy' && m !== world.boss);
    b.target = best;
    if (best) { best.bountyMark = true; best.awake = true; best.hunter = true; }
    if (!best) b.kind = 'kills', b.need = 8;
  }
  if (b.kind === 'relic') {
    // a glinting heirloom somewhere reachable, well away from the giver
    let spot = null;
    for (let i = 0; i < 40 && !spot; i++) {
      const [x, y] = world.map.randomNear(n.x + rand(-18, 18), n.y + rand(-18, 18), 3);
      if (dist(x, y, n.x, n.y) > 9 && world.map.walkable(x, y) && world.map.findPath(p.x, p.y, x, y, 20000)) spot = [x, y];
    }
    if (!spot) { b.kind = 'kills'; b.need = 10; }
    else {
      const relic = { x: spot[0], y: spot[1], type: 'objective', active: true, color: '#ffe080', reach: 1.4, label: 'Heirloom',
        use: () => { b.found = true; world.portals.splice(world.portals.indexOf(relic), 1); sparkle(relic.x, relic.y, 30, '#ffe080', 30, 0.6); sfx('gold'); } };
      world.portals.push(relic);
      b.relic = relic;
    }
  }
  UI.log(`<b>Bounty</b> from ${n.name}: ${b.text(b.need)}`, '#ffe2a0');
  sfx('chest');
}

function payBounty(world, n) {
  const b = n.bounty, lvl = depthLevel(world.depth), p = world.player;
  b.state = 'paid';
  const at = p || n;
  const add = (kind, data) => world.addLoot(new GroundItem(at.x + rand(-0.5, 0.5), at.y + rand(-0.5, 0.5), kind, data));
  add('item', { item: rollItem(lvl + 2, { mf: p ? p.st.magicFind : 0, bonus: 1 }) });
  if (chance(0.5)) add('item', { item: rollGem(lvl + 4) });
  add('gold', { amount: Math.round((40 + lvl * 9) * rand(0.8, 1.3)) });
  if (p && G.char) { p.gainXp && p.gainXp(Math.round(120 * Math.pow(lvl, 1.5))); } // ~30 kills' worth (monsterBase xp); 60 * 1.11^lvl was hundreds of levels deep down
  n.say(pick(LINES.cheer), 4);
  addEffect(new Ring(at.x, at.y, 0.3, 2.5, 0.6, '#ffe080', 4));
  floatText(at.x, at.y, 80, 'BOUNTY COMPLETE', '#ffe080', 15, { life: 2 });
  UI.log(`<b>Bounty complete!</b> ${n.name} pays up.`, '#ffe080');
  sfx('gold'); sfx('levelup', 0.5);
}

function wanderTick(world, n, spots, dt) {
  const map = world.map;
  n.animT += dt;
  n.talkT = Math.max(0, n.talkT - dt);
  if (!n.walking) n.walkT = 0;
  n.walking = false;
  n.townPoseT = Math.max(0, (n.townPoseT || 0) - dt);
  n.emotionT = Math.max(0, (n.emotionT || 0) - dt); n.emoteClock = (n.emoteClock || 0) + dt;
  const b = n.bounty;
  if (b && b.state === 'active' && progress(world, b) >= b.need) payBounty(world, n);
  if (b && b.state === 'offer' && (n.askT = (n.askT || 0) - dt) <= 0) { n.askT = rand(9, 15); if (world.player && dist(world.player.x, world.player.y, n.x, n.y) < 12) n.say(pick(LINES.ask), 2.5); }
  // won the area: everybody cheers once
  const sc = world.overworldScenario;
  if (sc && sc.completed && !n.cheered) { n.cheered = true; n.townPose = 'cheer'; n.townPoseT = 3; n.say(pick(LINES.cheer), 3); }
  // danger: an awake monster close by
  let threat = null;
  if ((n.scanT = (n.scanT || 0) - dt) <= 0) {
    n.scanT = 0.4;
    threat = world.creatures.find((m) => !m.dead && m.team === 'enemy' && m.awake && dist(m.x, m.y, n.x, n.y) < 5);
    if (threat) {
      if (n.mood !== 'scared') { n.say(pick(LINES.scared), 2); n.townPose = chance(0.5) ? 'scared' : 'point'; n.townPoseT = 0.8; }
      n.emotion = 'scared'; n.emotionT = 2.5;
      n.mood = 'scared'; n.fleeT = 2.5;
      const a = angleTo(threat.x, threat.y, n.x, n.y) + rand(-0.6, 0.6);
      n.goal = map.randomNear(n.x + Math.cos(a) * 7, n.y + Math.sin(a) * 7, 2); n.path = null;
    }
  }
  if (n.fleeT > 0 && (n.fleeT -= dt) <= 0) n.mood = 'calm';
  if (n.townPoseT > 0) return;
  // walk
  if (!n.goal) {
    if ((n.waitT -= dt) > 0) return;
    n.goal = map.randomNear(...pick(spots), 3); n.path = null;
  }
  if (!n.path) {
    n.path = map.findPath(n.x, n.y, n.goal[0], n.goal[1], 6000, 0.28) || [];
    if (!n.path.length) { n.goal = null; n.waitT = rand(1, 3); return; }
  }
  const [tx, ty] = n.path[0], d = dist(n.x, n.y, tx, ty);
  if (d < 0.2) { n.path.shift(); if (!n.path.length) { n.goal = null; n.path = null; n.waitT = rand(3, 9); if (chance(0.3)) n.say(pick(LINES.idle)); else if (chance(0.4)) { n.emotion = pick(['curious', 'happy', 'think', 'worried', 'proud']); n.emotionT = rand(2.5, 4); } } return; }
  const sp = (n.mood === 'scared' ? 2.6 : 1.1) * dt, k = Math.min(1, sp / d), nx = n.x + (tx - n.x) * k, ny = n.y + (ty - n.y) * k;
  if (!map.walkable(nx, ny)) { n.path = null; n.goal = null; n.waitT = 0.5; return; }
  n.flip = townFacingFlip(nx - n.x, ny - n.y, n.flip);
  n.x = nx; n.y = ny; n.walking = true; n.walkT += dt * (n.mood === 'scared' ? 2 : 1);
  n.running = n.mood === 'scared';
}

/** For auto-play: a bounty giver worth walking to, or an heirloom to pick up. */
export function bountyGoal(world) {
  for (const n of world.npcs) {
    const b = n.wanderer && n.bounty;
    if (!b) continue;
    if (b.state === 'offer') return { x: n.x, y: n.y, reach: 1.8, use: () => n.use(), what: `Talking to ${n.name}` };
    if (b.state === 'active' && b.kind === 'relic' && b.relic && !b.found) return { x: b.relic.x, y: b.relic.y, reach: 1.2, use: b.relic.use, what: 'Fetching the heirloom' };
    if (b.state === 'active' && b.kind === 'elite' && b.target && !b.target.dead) return { x: b.target.x, y: b.target.y, reach: 4, what: 'Hunting the bounty mark', target: b.target };
  }
  return null;
}

