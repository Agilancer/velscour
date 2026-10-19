// Dungeon encounters with the Hollow's people (and its rats). On about half of the ordinary dungeon depths one or two
// of these wait in a room: a captive held by a pack (free them once the guards are dead), a knight's last stand (fight
// beside them; alive at the end, they swear an oath that buffs you; fallen, they leave their pack), a traveling
// merchant camped by a fire (potions for the road), Zebulon the Purple testing a ward (survive his three waves for a
// blessing), Nan Bramble's cauldron (a brew: a blessing, mostly) and a Greener who jumps out at you and then leads
// you to a hidden cache. Rats scurry about on some depths and bolt from the hero.
// Wiring: happenings.setupHappenings -> addEncounters. Each encounter is a world.chests entry (auto-play walks to and
// uses those) whose person is a world.npcs entry from game/folk.js.
import { G } from '../state.js';
import { rand, randi, pick, chance, dist, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Column, sparkle, floatText, addLight, burst } from '../gfx/vfx.js';
import { makeMonster } from './monster.js';
import { ambush } from './mayhem.js';
import { GroundItem, dropChest } from './loot.js';
import { rollItem, rollGem } from '../data/items.js';
import { depthLevel } from '../data/depth.js';
import { UI } from '../ui/ui.js';
import { TOWNSFOLK, ANIMALS } from '../data/townsfolk.js';
import { makeFolk } from './folk.js';
import { townFacingFlip } from './townsfolkvisuals.js';

export const ENCOUNTER_CHANCE = 0.5;
export const ENCOUNTERS = ['captive', 'laststand', 'peddler', 'wizard', 'witch', 'greener'];

/** Roll this depth's encounters into `spots` (room centres; used ones are popped). `force` (tests): a kind list. */
export function addEncounters(world, spots, force = G.encounterForce) {
  const kinds = force ? [].concat(force) : chance(ENCOUNTER_CHANCE) ? [pick(ENCOUNTERS), ...(chance(0.3) ? [pick(ENCOUNTERS)] : [])] : [];
  const out = [];
  for (const k of kinds) { if (!spots.length) break; const e = BUILD[k](world, spots.pop(), spots); if (e) out.push(e); }
  if (force ? G.ratsForce : chance(0.3)) addRats(world, randi(2, 4));
  world.encounters = out;
  return out;
}

const lvlOf = (world) => depthLevel(world.depth || 1);
const near = (world, [x, y], r) => { const p = world.map.randomNear(x, y, r); return p && world.map.walkable(p[0], p[1]) ? p : [x, y]; };
const guardsAround = (e, r = 7) => e.guards.filter((m) => !m.dead && dist(m.x, m.y, e.x, e.y) < r);
const reward = (world, at, { items = 1, rare = false, gold = 1, gem = false } = {}) => {
  const lvl = lvlOf(world), p = world.player;
  for (let i = 0; i < items; i++) world.addLoot(new GroundItem(at.x + rand(-0.6, 0.6), at.y + rand(-0.6, 0.6), 'item', { item: rollItem(lvl + (rare ? 3 : 1), { mf: p ? p.st.magicFind : 0, bonus: rare ? 2 : 1 }) }));
  if (gem) world.addLoot(new GroundItem(at.x + rand(-0.6, 0.6), at.y + rand(-0.6, 0.6), 'item', { item: rollGem(lvl + 4) }));
  world.addLoot(new GroundItem(at.x + rand(-0.5, 0.5), at.y + rand(-0.5, 0.5), 'gold', { amount: Math.round((30 + lvl * 7) * gold * rand(0.8, 1.3)) }));
};
const pack = (world, at, n, rank = 'normal') => {
  const arch = pick(world.roster || ['skeleton']), out = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = near(world, [at[0] + Math.cos(i / n * TAU) * 2.2, at[1] + Math.sin(i / n * TAU) * 2.2], 1.2);
    const m = makeMonster(world, arch, world.biome, lvlOf(world), i === 0 ? rank : 'normal', x, y, 0);
    world.add(m); out.push(m);
  }
  return out;
};
// a spot for the encounter's marker on the minimap and for auto-play to walk to
const site = (world, e, label, dot, use) => {
  const ch = { x: e.x, y: e.y, opened: false, reach: 1.6, far: 30, label, dot, encounter: e, draw() {}, use };
  world.chests.push(ch); e.chest = ch;
  return ch;
};
const leave = (world, n, after = 6) => {
  // walks off the way they came and fades (out of the dungeon, home)
  let t = after;
  n.onTick = (dt) => { if ((t -= dt) < 1.5) n.alpha = Math.max(0, t / 1.5); if (t <= 0) { const i = world.npcs.indexOf(n); if (i >= 0) world.npcs.splice(i, 1); n.onTick = null; } };
};
const buff = (p, id, name, el, stats, t, msg, color) => {
  p.addBuff({ id, name, el, stats, t, max: t });
  addEffect(new Ring(p.x, p.y, 0.2, 4, 0.7, color, 6));
  floatText(p.x, p.y, 90, name.toUpperCase(), color, 16, { life: 2 });
  UI.log(`<b style="color:${color}">${name}</b>: ${msg} for ${t} s.`, color);
  sfx('levelup', 0.6);
};

const BUILD = {
  // a captive held by a pack: kill the guards, then cut them loose
  captive(world, at) {
    const royal = chance(0.12);
    const who = royal ? pick(TOWNSFOLK.filter((v) => v.courtier || v.role === 'princess' || v.role === 'prince'))
      : pick(TOWNSFOLK.filter((v) => v.merchant || v.worker || v.guard || v.role === 'bookseller' || v.role === 'friar'));
    const n = makeFolk(world, who, at[0], at[1], { calm: true, still: true });
    n.feel('worried', 1e9);
    n.chatter = ['Help me! Please!', 'Are they gone?', 'Untie me, quick!'];
    world.npcs.push(n);
    const e = { kind: 'captive', x: at[0], y: at[1], n, guards: pack(world, at, randi(3, 5), 'champion') };
    site(world, e, `Free ${n.name}`, '#ffd890', function () {
      if (this.opened) return;
      if (guardsAround(e).length) { if (!n.talkT) n.say(pick(['Behind you!', 'They\'re still here!', 'Watch out!']), 1.6); n.feel('scared', 1.5); return; }
      this.opened = true;
      n.calm = false; n.feel('relieved', 2.5); n.face(world.player.x, world.player.y);
      n.say(royal ? 'You... you saved me! The crown will hear of this!' : pick(['Free! Bless you, hero!', 'I thought I was done for!', 'Take this. Take all of it!']), 3);
      n.after(2, () => n.feel('cheer', 3));
      sparkle(n.x, n.y, 20, '#ffd890', 30, 0.6); sfx('gold');
      reward(world, n, royal ? { items: 2, rare: true, gold: 3, gem: true } : { items: 1, gold: 1.5 });
      UI.log(`You freed <b>${n.name}</b>${royal ? ' — a royal ransom is yours' : ''}.`, '#ffd890');
      leave(world, n, 7);
    });
    return e;
  },

  // a knight holding out against a pack; fight beside them
  laststand(world, at) {
    const k = makeFolk(world, (v) => v.knight, at[0], at[1], { calm: true, still: true });
    k.hp = 160; k.feel('fight', 1e9, false);
    world.npcs.push(k);
    const e = { kind: 'laststand', x: at[0], y: at[1], n: k, guards: pack(world, at, randi(4, 6), 'champion'), started: false, swingT: 0 };
    const ch = site(world, e, `${k.name}'s Last Stand`, '#a0c0ff', function () { if (!e.started) { e.started = true; k.say('To me! Hold the line!', 2.5); } });
    k.onTick = (dt) => {
      if (ch.opened) return;
      const p = world.player;
      if (!e.started && p && dist(p.x, p.y, k.x, k.y) < 10) { e.started = true; k.say(pick(['Hero! To me!', 'Help! I can\'t hold them!', 'Steel and faith — with me!']), 2.5); }
      if (!e.started) return;
      if (!e.woke) { e.woke = true; for (const m of e.guards) m.awake = true; }
      const foes = guardsAround(e, 3);
      if (foes.length) {
        k.hp -= dt * foes.length * (p && dist(p.x, p.y, k.x, k.y) < 8 ? 1.1 : 3);
        if ((e.swingT -= dt) <= 0) { e.swingT = 1.2; const m = foes[0]; k.face(m.x, m.y); k.townAttackT = 0.45; m.hp -= m.maxHp * 0.1; if (m.hp <= 0 && !m.dead) m.hp = 1; }
      }
      if (k.hp <= 0) {
        ch.opened = true; k.feel('dead', 1e9, false); k.name += ' (fallen)';
        UI.log(`<b>${k.name}</b> has fallen. Their pack is yours.`, '#c0c8d8');
        dropChest(world, { x: k.x + 0.6, y: k.y + 0.4, rare: true }, world.depth);
      } else if (!guardsAround(e, 12).length) {
        ch.opened = true; k.feel('proud', 5); k.say('We held! I swear my oath to you, hero.', 3.5);
        if (p) buff(p, 'oath', 'Knight\'s Oath', 'holy', { dmg: 35, reduce: 10 }, 90, '+35% damage, 10% less damage taken', '#a0c0ff');
        reward(world, k, { items: 1, gold: 1 });
        k.after(3.5, () => k.feel('cheer', 3));
        leave(world, k, 9);
      }
    };
    return e;
  },

  // a traveling merchant camped by a fire: potions for the road, once
  peddler(world, at) {
    const n = makeFolk(world, (v) => v.merchant, at[0], at[1], { calm: true });
    n.feel('happy', 4);
    n.chatter = ['Mind the dark, friend.', 'Business is slow down here.', 'Don\'t tell the guardian I\'m here.'];
    world.npcs.push(n);
    world.props.push({ x: at[0] + 1.1, y: at[1] + 0.5, kind: 'campfire', light: 4 });
    const e = { kind: 'peddler', x: at[0], y: at[1], n, guards: [] };
    site(world, e, `${n.name}'s Camp`, '#ffb060', function () {
      if (this.opened) return;
      this.opened = true;
      const c = G.char;
      n.face(world.player.x, world.player.y); n.feel('excited', 3);
      n.say(pick(['A hero! Potions for the road, on the house!', 'You look half dead. Here!', 'Free samples! Tell your friends!']), 3);
      if (c?.potions) { c.potions.hp = (c.potions.hp || 0) + 2; c.potions.mp = (c.potions.mp || 0) + 1; }
      floatText(n.x, n.y, 70, '+2 HEALING, +1 MANA', '#ff9080', 13, { life: 2 });
      if (chance(0.5)) reward(world, n, { items: 1, gold: 0.5 });
      UI.log(`<b>${n.name}</b> shares potions from their pack.`, '#ffb060');
      sfx('gold');
    });
    return e;
  },

  // Zebulon the Purple tests a ward: three waves; survive them for a blessing
  wizard(world, at) {
    const z = makeFolk(world, 'wandering wizard', at[0], at[1], { calm: true, still: true });
    z.feel('thinking', 1e9);
    world.npcs.push(z);
    const e = { kind: 'wizard', x: at[0], y: at[1], n: z, guards: [], wave: 0, state: 'wait' };
    const ch = site(world, e, 'Zebulon the Purple', '#c890ff', function () {
      if (e.state !== 'wait') return;
      e.state = 'waves'; z.feel('fight', 1e9, false);
      z.say('Splendid! Stand there. This may summon... things.', 3);
    });
    z.onTick = (dt) => {
      if (e.state === 'waves') {
        if ((e.glowT = (e.glowT || 0) - dt) <= 0) { e.glowT = 0.4; sparkle(z.x, z.y, 3, '#c890ff', 30, 0.4); addLight(z.x, z.y, 3, 0.5, 20, '#c890ff'); }
        if (!guardsAround(e, 14).length) {
          if (e.wave >= 3) {
            e.state = 'done'; ch.opened = true; z.feel('cheer', 4); z.say('It works! You have my thanks — and my blessing.', 3.5);
            const p = world.player;
            if (p) buff(p, 'zebulon', 'Purple Blessing', 'arcane', { xp: 60, cdr: 20 }, 120, '+60% experience, 20% faster cooldowns', '#c890ff');
            addEffect(new Column(z.x, z.y, '#c890ff', 0.8, 30, 260));
            reward(world, z, { items: 1, gold: 1, gem: true });
            leave(world, z, 10);
          } else {
            e.wave++;
            addEffect(new Ring(z.x, z.y, 0.3, 5, 0.6, '#c890ff', 5));
            e.guards.push(...pack(world, [z.x + rand(-4, 4), z.y + rand(-4, 4)], 2 + e.wave * 2, e.wave === 3 ? 'champion' : 'normal'));
            for (const m of e.guards) m.awake = true;
            if (e.wave > 1) z.say(pick(['More of them! Fascinating!', 'Hold! The ward is nearly stable!', 'Oh dear. Oh dear oh dear.']), 2.2);
          }
        }
      }
    };
    return e;
  },

  // Nan Bramble's cauldron: drink and see
  witch(world, at) {
    const w = makeFolk(world, 'hedge witch', at[0], at[1], { calm: true });
    w.feel('thinking', 1e9);
    world.npcs.push(w);
    world.props.push({ x: at[0] + 1, y: at[1] + 0.4, kind: 'campfire', light: 3.5 });
    const e = { kind: 'witch', x: at[0], y: at[1], n: w, guards: [] };
    site(world, e, 'Nan Bramble\'s Cauldron', '#80ff90', function () {
      if (this.opened) return;
      this.opened = true;
      const p = world.player;
      w.face(p.x, p.y);
      burst(w.x + 1, w.y + 0.4, 20, 'poison', 30, 4, { up: 2 });
      if (chance(0.72)) {
        w.feel('proud', 4); w.say(pick(['Drink up, dearie. Good for what ails you.', 'Nettle and moonmoss. You\'ll feel ten feet tall.', 'Only a little frog in it.']), 3.5);
        p.hp = p.maxHp; p.mana = p.maxMana;
        buff(p, 'bramble', 'Bramble Brew', 'poison', pick([{ life: 30, regen: 20 }, { as: 30 }, { mf: 120, gf: 120 }, { dmg: 30 }]), 90, 'a witch\'s blessing', '#80ff90');
      } else {
        w.feel('embarrassed', 4); w.say('Ah. That was the OTHER cauldron. Run, dearie!', 3);
        ambush(world, 'drop', randi(3, 5));
      }
    });
    return e;
  },

  // a Greener jumps out at you, then runs to the treasure they found and waits there, pointing
  greener(world, at, spots) {
    const g = makeFolk(world, (v) => v.familyId === 'greener', at[0], at[1], { calm: true });
    g.feel('suspicious', 1e9); g.hidden = false;
    world.npcs.push(g);
    const loot = spots.length ? spots.pop() : near(world, at, 8);
    const e = { kind: 'greener', x: at[0], y: at[1], n: g, guards: [], state: 'lurk', loot };
    const cache = { x: loot[0], y: loot[1], opened: false, reach: 1.3, rare: true, far: 30, hidden: true,
      use() { if (this.opened || this.hidden) return; this.opened = true; sfx('chest'); sfx('gold'); dropChest(world, this, world.depth); sparkle(this.x, this.y, 20, '#ffd060', 20, 0.5); g.feel('cheer', 4); g.say('Told you! Half is mine. ...Fine, all yours.', 3); leave(world, g, 5); } };
    const ch = site(world, e, `${g.name}?`, '#a0ff80', function () { spring(); });
    const spring = () => {
      if (e.state !== 'lurk') return;
      e.state = 'lead'; ch.opened = true;
      g.feel('spooky', 1.8); g.say(pick(['BOO!', 'RAAAH! Got you!', 'Woooo, a dungeon ghost!']), 1.8);
      g.after(1.8, () => { g.feel('laugh', 2.5); g.say('Ha! Your face! Come on, I found treasure!', 2.5); });
      g.after(3.8, () => { e.state = 'run'; });
    };
    g.onTick = (dt) => {
      const p = world.player;
      if (e.state === 'lurk' && p && dist(p.x, p.y, g.x, g.y) < 3) spring();
      if (e.state === 'run') {
        const d = dist(g.x, g.y, loot[0], loot[1]);
        if (d < 1.4) { e.state = 'wait'; cache.hidden = false; world.chests.push(cache); g.feel('point', 1e9); g.face(loot[0] + 1, loot[1]); g.say('Here! HERE!', 2); }
        else {
          // run ahead, but wait up for the hero
          if (p && dist(p.x, p.y, g.x, g.y) > 9) { g.face(p.x, p.y); if (!g.talkT && chance(dt * 0.4)) g.say('Keep up!', 1.4); g.feel('impatient', 0.5, false); return; }
          walk(world, g, loot, 3.4, dt);
        }
      }
    };
    return e;
  },
};

function walk(world, n, target, speed, dt) {
  const map = world.map;
  if (!n.path || (n.repath = (n.repath || 0) - dt) <= 0) { n.path = map.findPath(n.x, n.y, target[0], target[1], 30000, 0.3) || []; n.repath = 1; }
  while (n.path.length > 1 && Math.hypot(n.x - n.path[0][0], n.y - n.path[0][1]) < 0.35) n.path.shift();
  if (!n.path.length) { n.x = target[0]; n.y = target[1]; return; }
  const [tx, ty] = n.path[0], d = Math.hypot(tx - n.x, ty - n.y), k = Math.min(1, dt * speed / Math.max(d, 1e-3));
  const nx = n.x + (tx - n.x) * k, ny = n.y + (ty - n.y) * k;
  if (map.walkable(nx, ny)) { n.flip = townFacingFlip(nx - n.x, ny - n.y, n.flip); n.walking = true; n.running = true; n.walkT += dt; n.x = nx; n.y = ny; } else n.path = null;
}

// ------------------------------------------------------------------------------------------------ rats
/** A few rats that scurry about the rooms and bolt from the hero (harmless, not monsters). */
export function addRats(world, n) {
  const v = ANIMALS.find((a) => a.species === 'rat'), map = world.map, rooms = world.rooms || [];
  if (!v || !rooms.length) return;
  for (let i = 0; i < n; i++) {
    const r = pick(rooms), [x, y] = near(world, [r.mx ?? r.x + r.w / 2, r.my ?? r.y + r.h / 2], 3);
    const rat = makeFolk(world, v, x, y, { calm: true, animal: true, species: 'rat', idleH: v.h, name: 'Rat', reach: 1 });
    rat.townsfolkSpriteId = v.spriteId; rat.frameCount = v.frame.count;
    rat.onTick = (dt) => {
      const p = world.player;
      if (p && dist(p.x, p.y, rat.x, rat.y) < 3.5 && !rat.fleeT) {
        rat.fleeT = 2.5; rat.feel('scared', 0.5);
        const a = Math.atan2(rat.y - p.y, rat.x - p.x) + rand(-0.6, 0.6);
        rat.goal = map.randomNear(rat.x + Math.cos(a) * 7, rat.y + Math.sin(a) * 7, 2); rat.path = null;
      }
      if (rat.fleeT) rat.fleeT = Math.max(0, rat.fleeT - dt);
      if (!rat.goal && (rat.waitT = (rat.waitT || rand(1, 4)) - dt) <= 0) { rat.waitT = rand(2, 6); rat.goal = map.randomNear(rat.x + rand(-5, 5), rat.y + rand(-5, 5), 2); rat.path = null; if (chance(0.3)) rat.feel('curious', 2); }
      if (rat.goal) {
        walk(world, rat, rat.goal, rat.fleeT ? 3.6 : 1.4, dt);
        rat.running = !!rat.fleeT;
        if (Math.hypot(rat.x - rat.goal[0], rat.y - rat.goal[1]) < 0.3) rat.goal = null;
      }
    };
    world.npcs.push(rat);
  }
}
