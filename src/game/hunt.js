// THE GREAT HUNT (docs/GREAT_HUNT.md): one colossal beast per hunt, a giant of the bestiary scaled up. Its signs lead
// from clue to clue (world/hunt.js lays three on each leg of the trail); at each of three hunting grounds it turns to
// fight, and at a quarter of its life gone it flees down the next leg, bleeding: the blood is the trail. Its wounds
// carry over (one monster all hunt long; a life gate in `vel.absorb` keeps a big hit from ending it early). In its
// lair it is cornered and fights to the death; the kill opens the exit there.
// The run speaks the overworld scenario API for game.js, the Quest Log and auto-play (`objective`).
import { makeMonster } from './monster.js';
import { depthLevel } from '../data/depth.js';
import { ART_BY_ID } from '../data/bestiary.js';
import { UI } from '../ui/ui.js';
import { G } from '../state.js';
import { sfx } from '../core/audio.js';
import { addDecal, addEffect, Ring, floatText, smoke } from '../gfx/vfx.js';
import { GroundItem } from './loot.js';
import { rollItem, rarityAt } from '../data/items.js';
import { CLUE_BLOOD } from '../world/hunt.js';

// the quarry: a lone giant of set 2 (data/bestiary.js), its hunt name and the brood that follows its kills
export const HUNT_BEASTS = [
  { id: 'moon_eater', art: 'antlered_moon_eater', name: 'The Moon-Eater', brood: 'hound' },
  { id: 'tuskfather', art: 'armored_boar_patriarch', name: 'Old Tuskfather', brood: 'hound' },
  { id: 'thornback', art: 'thornback_mammoth', name: 'The Thornback', brood: 'beetle' },
  { id: 'frostmane', art: 'frostmane_werebear', name: 'Frostmane', brood: 'hound' },
  { id: 'rotwing', art: 'rotwing_vulture_queen', name: 'The Rotwing Queen', brood: 'bat' },
  { id: 'hundred_legs', art: 'ravenous_centipede_king', name: 'The Hundred-Legged King', brood: 'spider' },
  { id: 'brood_duchess', art: 'chitin_brood_duchess', name: 'The Brood Duchess', brood: 'spider' },
  { id: 'bloodcrest', art: 'bloodcrest_hydra', name: 'The Bloodcrest', brood: 'scorpion' },
  { id: 'blackhorn', art: 'obsidian_horn_dragon', name: 'Blackhorn', brood: 'imp' },
];
const BEAST_HP = 2.2;            // times a guardian's life: four fights' worth
const GATES = [0.75, 0.5, 0.25, 0]; // it flees from ground k at this share of its life (the lair: never)
const FLEE_SPEED = 7.5;          // tiles a second down the trail
const CLUE_TEXT = {
  kill: ['A stag, torn open. Still warm.', 'What is left of a wolf pack.', 'A carcass, half eaten. Something disturbed it.'],
  claws: ['Bark torn away, higher than a man.', 'Claw marks. Deep ones.'],
  trap: ["A hunter's trap, snapped like a twig.", 'A sprung trap. Empty. Bloody.'],
  tracks: ['Tracks, deep as graves. Fresh.', 'Prints the size of a cartwheel.'],
  hunter: ["A hunter's shield, bitten through.", 'A hunter. He found it first.'],
  raven: ['Ravens. They always know first.', 'The crows follow it. So do you.'],
  flattened: ["Brush flattened a cart's width.", 'Saplings snapped. It ran through, not round.'],
  blood: ['Its blood. Plenty of it.', 'Blood, dark and fresh. It is slowing.', 'A blood trail. It will not get far.'],
};
const CLOSE = ['It is close. You can smell it.', 'The trail ends ahead. So does it.', 'Quiet. Too quiet. It is here.'];
const ENCOUNTER = ['It turns to fight', 'Wounded, and angrier', 'It will not run far', 'Cornered in its lair'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** The beast this hunt is after: G.huntBeast (tests), else a random one, never the last one twice. */
export function pickHuntBeast(c) {
  const want = HUNT_BEASTS.find((b) => b.id === G.huntBeast || b.art === G.huntBeast);
  if (want) return want;
  const pool = HUNT_BEASTS.filter((b) => b.id !== c?.lastHunt && ART_BY_ID[b.art]);
  return pick(pool.length ? pool : HUNT_BEASTS);
}

export function createHuntRun(world, gen, biome, depth, onWin) {
  const H = gen.hunt, c = G.char, map = world.map, lvl = depthLevel(depth);
  const def = pickHuntBeast(c), art = ART_BY_ID[def.art];
  if (c) c.lastHunt = def.id;
  const g0 = H.grounds[0];
  const m = makeMonster(world, art.arch, biome, lvl + 2, 'boss', g0[0], g0[1], 0, { art: def.art, swap: null });
  m.name = def.name; m.maxHp *= BEAST_HP; m.hp = m.maxHp; m.xp *= 3; m.scale = (m.scale || 1) * 1.25;
  m.affixes = (m.affixes || []).filter((k) => !['regen', 'teleport', 'fast'].includes(k));
  m.home = [g0[0], g0[1]];
  const blood = m.bloodColor || biome.blood || '#7c1610';
  world.add(m);
  world.boss = m;
  world.looks?.pick?.(def.brood); // the brood's look is chosen now, so its art loads with the level's
  const brood = [];

  const run = {
    id: 'great_hunt', type: 'hunt', completed: false, failed: false, active: true,
    markers: [], route: [], escort: null, routeIndex: 0,
    shrine: { x: H.start[0], y: H.start[1], reach: 2, label: 'Hunters\' camp', use() {} },
    beast: m, def, stage: 0, phase: 'track', painted: false, clues: H.clues.map((cl) => ({ ...cl, read: false, text: pick(CLUE_TEXT[cl.kind]) })),
    get gate() { return run.stage < 3 ? GATES[run.stage] * m.maxHp : 0; },
    get life() { return Math.max(0, Math.round(m.hp / m.maxHp * 100)); },
    get read() { return run.clues.filter((cl) => cl.read).length; },
    get title() {
      if (run.completed) return 'The Hunt Is Done';
      if (run.phase === 'flee') return 'Follow the Blood';
      if (run.phase === 'fight') return run.stage === 3 ? `Kill ${def.name}` : `Wound ${def.name}`;
      return run.stage === 3 ? 'Corner It in Its Lair' : `Track ${def.name}`;
    },
    get description() {
      if (run.completed) return `${def.name} is dead. The exit in its lair is open.`;
      if (run.phase === 'flee') return 'It flees, bleeding. Follow the blood.';
      if (run.phase === 'fight') return run.stage === 3 ? 'Cornered. Finish it.' : 'Wear it down until it runs.';
      return run.stage === 3 ? 'The blood leads to its lair.' : 'Read its signs. They lead to it.';
    },
    /** Where auto-play goes next (autoplay.js): the next sign, then the beast; while it flees, down the blood trail. */
    get objective() {
      if (run.completed) return undefined;
      if (run.phase === 'fight') return { x: m.x, y: m.y, reach: 3 };
      const cl = next();
      if (cl) return { x: cl.x, y: cl.y, reach: 1.6, use: () => read(cl) };
      if (run.phase === 'flee') { const g = H.grounds[run.stage]; return { x: g[0], y: g[1], reach: 4 }; }
      return { x: m.x, y: m.y, reach: 4 };
    },
    update(dt) {
      const p = world.player;
      if (run.completed || !p) return;
      if (!run.painted) { run.painted = true; paintClues(0); markNext(); } // decals after setWorld's clearVfx
      if (m.dead) return finish();
      for (const cl of run.clues) if (cl.leg === run.stage && !cl.read && Math.hypot(p.x - cl.x, p.y - cl.y) < 2.6) read(cl);
      if (run.phase === 'track' && m.awake) startFight();
      else if (run.phase === 'fight' && run.stage < 3 && m.hp <= run.gate + 1e-6) startFlee();
    },
  };
  // the boss bar's line under the name (hud.js reads boss.vel.label); the gate holds its life at the flee mark
  m.vel = {
    absorb: (d) => (run.phase === 'flee' ? 0 : run.gate > 0 ? Math.max(0, Math.min(d, m.hp - run.gate)) : d),
    holdBoss: () => false,
    label: () => run.phase === 'flee' ? 'Fleeing · follow the blood' : run.stage < 3 ? `Wounded ${100 - run.life}% · runs at ${Math.round(GATES[run.stage] * 100)}%` : 'Cornered',
  };
  // the beast wakes to its own banner (startFight), not the guardian's
  const prevAwake = world.onBossAwake;
  world.onBossAwake = (b) => { if (b !== m && prevAwake) prevAwake(b); };

  const next = () => run.clues.find((cl) => cl.leg === run.stage && !cl.read);
  const mark = (x, y, label, color, use) => {
    const mk = { x, y, type: 'objective', active: true, reach: 1.8, color, label, use };
    world.portals.push(mk); run.markers.push(mk);
    return mk;
  };
  const unmarkAll = () => {
    for (const mk of run.markers) { const i = world.portals.indexOf(mk); if (i >= 0) world.portals.splice(i, 1); }
    run.markers.length = 0;
  };
  function markNext() {
    unmarkAll();
    if (run.completed || run.phase === 'fight') return;
    const cl = next();
    if (cl) mark(cl.x, cl.y, 'A sign', '#e0a860', () => read(cl));
    else if (run.phase === 'track') { const g = H.grounds[run.stage]; mark(g[0], g[1], run.stage === 3 ? 'Its lair' : 'The beast', '#ff4030', () => {}); }
  }
  function paintClues(leg) {
    for (const cl of run.clues) {
      if (cl.leg !== leg) continue;
      for (let i = 0; i < (CLUE_BLOOD[cl.kind] || 0); i++) addDecal(cl.x + (Math.random() - 0.5) * 2, cl.y + (Math.random() - 0.5) * 2, blood, 0.35 + Math.random() * 0.55, 'splat', 0.88);
    }
  }
  function read(cl) {
    if (cl.read || cl.leg !== run.stage) return;
    for (const o of run.clues) if (o.leg === cl.leg && o.n < cl.n) o.read = true;
    cl.read = true;
    UI.log(`<i>${cl.text}</i>`, '#e8c890');
    floatText(cl.x, cl.y, 50, 'A sign', '#e8c080', 13, { life: 1.4 });
    if (!next() && run.phase === 'track') UI.log(pick(CLOSE), '#ff9070');
    markNext();
  }
  function startFight() {
    run.phase = 'fight';
    for (const cl of run.clues) if (cl.leg === run.stage) cl.read = true;
    unmarkAll();
    UI.centerMsg(def.name.toUpperCase(), ENCOUNTER[run.stage], 2.8);
    sfx('roar'); sfx('boss', 0.7);
    addEffect(new Ring(m.x, m.y, 0.3, 4.5, 0.9, '#ff3020', 5));
    // its brood, drawn by the blood: none at first, more each time
    for (let i = 0; i < [0, 2, 3, 4][run.stage]; i++) {
      const [x, y] = map.randomNear(m.x, m.y, 4.5);
      const b = makeMonster(world, def.brood, biome, lvl, 'normal', x, y, 0, world.looks?.pick?.(def.brood));
      b.awake = true; b.hunter = true;
      world.add(b); brood.push(b);
    }
    UI.refresh();
  }
  function startFlee() {
    run.stage++; run.phase = 'flee';
    m.targetable = false; m.state = 'idle'; m.action = null; m.aggro = null; m.target = null;
    for (const s of Object.values(m.status)) if (s) s.t = 0;
    UI.centerMsg('IT FLEES', 'Follow the blood', 2.6);
    UI.log(`${def.name} breaks off and crashes into the woods.`, '#ff9070');
    sfx('roar', 0.8);
    paintClues(run.stage);
    markNext();
    // down the next leg of the trail, from the point on it nearest where it stood
    const path = H.paths[run.stage];
    let k0 = 0;
    for (let k = 1; k < Math.min(path.length, 14); k++) if (Math.hypot(path[k][0] - m.x, path[k][1] - m.y) < Math.hypot(path[k0][0] - m.x, path[k0][1] - m.y)) k0 = k;
    const line = [[m.x, m.y], ...path.slice(k0)];
    let t = 0, s = 0, drip = 0.6;
    m.entering = (dt) => {
      t += dt;
      if (t < 0.7) { m.moving = false; if (Math.random() < dt * 8) smoke(m.x, m.y, 4, '#4a3a2a', 3, 10); return; } // the roar before it runs
      s += FLEE_SPEED * dt;
      const i = Math.min(line.length - 2, Math.floor(s)), f = Math.min(1, s - i), a = line[i], b = line[i + 1];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      m.face(Math.atan2(y - m.y, x - m.x)); m.x = x; m.y = y; m.moving = true;
      for (; drip <= s && drip < line.length - 1; drip += 1.2) bleed(line, drip);
      const p = world.player, far = !p || Math.hypot(p.x - m.x, p.y - m.y) > 24;
      if (s >= line.length - 1 || (far && s > 10)) {
        for (; drip < line.length - 1; drip += 1.2) bleed(line, drip); // the rest of the trail, out of sight
        park(H.grounds[run.stage]);
      }
    };
  }
  function bleed(line, d) {
    const i = Math.min(line.length - 2, Math.floor(d)), f = d - i, a = line[i], b = line[i + 1];
    addDecal(a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * 0.9, a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * 0.9, blood, 0.25 + Math.random() * 0.35, 'splat', 0.85);
  }
  function park(g) {
    m.entering = null; m.x = g[0]; m.y = g[1]; m.home = [g[0], g[1]];
    m.targetable = true; m.awake = false; m.aggro = null; m.target = null; m.moving = false;
    run.phase = 'track';
    markNext();
  }
  function finish() {
    if (run.completed) return;
    run.completed = true; run.phase = 'done';
    unmarkAll();
    const L = lvl + 2;
    world.addLoot(new GroundItem(m.x + 0.6, m.y + 0.4, 'item', { item: rollItem(L, { rarity: rarityAt(L, Math.random() < 0.5 ? 4 : 3) }) }));
    UI.centerMsg('THE HUNT IS DONE', `${def.name} is slain · the exit is open`, 3.6);
    UI.log(`${def.name} is dead. Take a trophy.`, '#ffd860');
    onWin();
    UI.refresh();
  }
  return run;
}

/** Quest Log steps while inside (ui/quest.js). */
export function huntQuest(sc, step) {
  const name = `<b style="color:#ff9070">${sc.def.name}</b>`, total = sc.clues.length;
  let h = step(sc.stage > 0 || sc.completed, `Track ${name} by its signs <span class="dim">— ${sc.read}/${total} read</span>.`);
  for (let k = 0; k < 3; k++) h += step(sc.stage > k || sc.completed, `Hunting ground ${k + 1}: wound it until it flees${sc.stage === k && sc.phase === 'fight' ? ' <span class="dim">— fighting</span>' : ''}.`);
  h += step(sc.completed, 'Follow its blood to its lair and finish it.');
  h += step(sc.completed, sc.completed ? 'The exit in the lair is open.' : 'Its death opens the way on.');
  if (!sc.completed) h += `<div class="dim q-note">Its life: ${sc.life}%. Its wounds carry over.</div>`;
  return h;
}
