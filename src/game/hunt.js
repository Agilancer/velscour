// THE GREAT HUNT (docs/GREAT_HUNT.md): one colossal beast per hunt, a giant of the bestiary scaled up. Its signs lead
// from clue to clue (world/hunt.js lays three on each leg of the trail); at each of three hunting grounds it turns to
// fight, and at a quarter of its life gone it flees down the next leg, bleeding: the blood is the trail. Its wounds
// carry over (one monster all hunt long; a life gate in `vel.absorb` keeps a big hit from ending it early). In its
// lair it is cornered and fights to the death; the kill opens the exit there.
// Five territories (data/huntlands.js), each with its own quarry, brood, signs and twist:
//   blizzard (the White Waste): squalls between the fights white out the land and hide the marked sign;
//   mire (the Drowned Fen): green poison pools beside the trail and round the hunting grounds;
//   burrow (the Red Badlands): it lies under the sand, surfaces beneath you at its signs, and burrows when it flees;
//   wings (the Storm Crags): it flees by air, straight over the rock, to the next ground and at last its peak.
// The run speaks the overworld scenario API for game.js, the Quest Log and auto-play (`objective`).
import { makeMonster } from './monster.js';
import { depthLevel } from '../data/depth.js';
import { ART_BY_ID } from '../data/bestiary.js';
import { ARCH } from '../data/enemies.js';
import { HUNT_LANDS, landOf } from '../data/huntlands.js';
import { UI } from '../ui/ui.js';
import { G } from '../state.js';
import { sfx, setAmbience } from '../core/audio.js';
import { camera } from '../core/view.js';
import { addDecal, addEffect, Ring, floatText, smoke, spawn } from '../gfx/vfx.js';
import { Area, Delayed } from './hazards.js';
import { GroundItem } from './loot.js';
import { rollItem, rarityAt, potionItem } from '../data/items.js';

// every quarry of every land (data/huntlands.js): a lone giant, its hunt name and the brood that follows its kills
export const HUNT_BEASTS = HUNT_LANDS.flatMap((l) => l.beasts.map((b) => ({ ...b, land: l.id })));
const BEAST_HP = 1.6;            // times a guardian's life, over four fights (2.2 kept weak heroes at it 10+ minutes)
const BEAST_DMG = 0.8;           // times a guardian's blows: four fights with no town between (x1.15 once enraged)
const GATES = [0.75, 0.5, 0.25, 0]; // it flees from ground k at this share of its life (the lair: never)
const FLEE_SPEED = 7.5;          // tiles a second down the trail
const ENCOUNTER = ['It turns to fight', 'Wounded, and angrier', 'It will not run far', 'Cornered in its lair'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);

/** The beast this hunt is after: G.huntBeast (tests: any land's), else one of the land's, never the last one twice. */
export function pickHuntBeast(c, land = HUNT_LANDS[0]) {
  const want = HUNT_BEASTS.find((b) => b.id === G.huntBeast || b.art === G.huntBeast);
  if (want) return want;
  const pool = land.beasts.filter((b) => b.id !== c?.lastHunt && ART_BY_ID[b.art]);
  return pick(pool.length ? pool : land.beasts);
}

export function createHuntRun(world, gen, biome, depth, onWin) {
  const H = gen.hunt, c = G.char, map = world.map, lvl = depthLevel(depth), land = landOf(H.land), twist = land.twist;
  const def = pickHuntBeast(c, land), art = ART_BY_ID[def.art];
  if (c) c.lastHunt = def.id;
  // the land's light, fog, blood and drift (a copy of the biome: the region's biome is shared by all five)
  world.biome = { ...biome, dark: land.look.dark, fog: land.look.fog, blood: land.look.blood, ambient: land.look.ambient };
  world.ambientFx = land.look.ambient;
  const g0 = H.grounds[0];
  const m = makeMonster(world, art.arch, world.biome, lvl + 2, 'boss', g0[0], g0[1], 0, { art: def.art, swap: null });
  // one beast as fair as the next: an abomination hits over three times as hard as a spider, so both are pulled in
  const A = ARCH[art.arch] || {};
  m.name = def.name; m.maxHp *= BEAST_HP * Math.pow(1.4 / (A.hp || 1.4), 0.25); m.hp = m.maxHp; m.xp *= 3;
  m.dmg *= BEAST_DMG * Math.pow(1.2 / (A.dmg || 1.2), 0.6); m.scale = (m.scale || 1) * 1.25;
  m.affixes = (m.affixes || []).filter((k) => !['regen', 'teleport', 'fast'].includes(k));
  // a beast's blows: stomp, charge, spines, boulders. No summons (its brood is its help), no nova or spiral (fired
  // from inside a body this big, every shot hit a melee hero: 300 life in a blink), no beam, and none of a boss's
  // 50% enrage (it cut the gaps between blows under 2 s and auto-play dodged all third fight); it angers by fight
  m.patterns = ['slam', 'charge', 'volley', 'meteor'];
  m.phase = 0; m.patternQ = [];
  m.home = [g0[0], g0[1]];
  const blood = land.look.blood || m.bloodColor || '#7c1610', SAND = '#b07a48';
  world.add(m);
  world.boss = m;
  world.ambushT = Infinity; // no ambushes (game/mayhem.js): these are its lands, and the hunt is the danger
  world.looks?.pick?.(def.brood); // the brood's look is chosen now, so its art loads with the level's
  const brood = [], pools = [];

  const run = {
    id: 'great_hunt', type: 'hunt', completed: false, failed: false, active: true,
    markers: [], route: [], escort: null, routeIndex: 0,
    shrine: { x: H.start[0], y: H.start[1], reach: 2, label: 'Hunters\' camp', use() {} },
    beast: m, def, land, stage: 0, phase: 'track', painted: false, storm: null,
    clues: H.clues.map((cl) => ({ ...cl, read: false, text: pick(land.text[cl.kind] || land.text.blood) })),
    get gate() { return run.stage < 3 ? GATES[run.stage] * m.maxHp : 0; },
    get life() { return Math.max(0, Math.round(m.hp / m.maxHp * 100)); },
    get read() { return run.clues.filter((cl) => cl.read).length; },
    get title() {
      if (run.completed) return 'The Hunt Is Done';
      if (run.phase === 'flee') return twist === 'burrow' ? 'Follow the Seam' : twist === 'wings' ? 'Climb After It' : 'Follow the Blood';
      if (run.phase === 'fight') return run.stage === 3 ? `Kill ${def.name}` : `Wound ${def.name}`;
      return run.stage === 3 ? 'Corner It in Its Lair' : `Track ${def.name}`;
    },
    get description() {
      if (run.completed) return `${def.name} is dead. The exit in its lair is open.`;
      if (run.phase === 'flee') return twist === 'burrow' ? 'It dives under the sand. Follow the seam.' : twist === 'wings' ? 'It takes wing, bleeding. Climb after it.' : 'It flees, bleeding. Follow the blood.';
      if (run.phase === 'fight') return run.stage === 3 ? 'Cornered. Finish it.' : 'Wear it down until it runs.';
      if (run.storm?.on) return 'The blizzard hides the trail. Push on.';
      return run.stage === 3 ? (twist === 'wings' ? 'Its lair is the peak.' : 'The blood leads to its lair.') : 'Read its signs. They lead to it.';
    },
    /** Where auto-play goes next (autoplay.js): the next sign, then the beast; while it flees, down the trail. */
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
      if (!run.painted) arrive();
      // nobody raises the dead here: a cultist's endless skeletons buried long fights (100+ of them)
      if ((run.calmT = (run.calmT || 0) - dt) <= 0) { run.calmT = 1; for (const c of world.creatures) if (c.summoner && c.team === 'enemy') c.summoner = false; }
      if (m.dead) return finish();
      if (twist === 'blizzard') blizzard(dt);
      for (const cl of run.clues) if (cl.leg === run.stage && !cl.read && Math.hypot(p.x - cl.x, p.y - cl.y) < 2.6) read(cl);
      if (run.phase === 'track' && m.awake) startFight();
      else if (run.phase === 'fight' && run.stage < 3 && m.hp <= run.gate + 1e-6) startFlee();
    },
  };
  // the boss bar's line under the name (hud.js reads boss.vel.label); the gate holds its life at the flee mark
  m.vel = {
    absorb: (d) => (run.phase === 'flee' ? 0 : run.gate > 0 ? Math.max(0, Math.min(d, m.hp - run.gate)) : d),
    holdBoss: () => false,
    label: () => run.phase === 'flee' ? (twist === 'burrow' ? 'Burrowing · follow the seam' : twist === 'wings' ? 'On the wing · climb after it' : 'Fleeing · follow the blood')
      : run.stage < 3 ? `Wounded ${100 - run.life}% · runs at ${Math.round(GATES[run.stage] * 100)}%` : 'Cornered',
  };
  // the beast wakes to its own banner (startFight), not the guardian's
  const prevAwake = world.onBossAwake;
  world.onBossAwake = (b) => { if (b !== m && prevAwake) prevAwake(b); };
  if (twist === 'burrow') bury();

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
    if (run.completed || run.phase === 'fight' || run.storm?.on) return; // (a blizzard hides it)
    const cl = next();
    if (cl) mark(cl.x, cl.y, 'A sign', '#e0a860', () => read(cl));
    else if (run.phase === 'track') { const g = H.grounds[run.stage]; mark(g[0], g[1], run.stage === 3 ? 'Its lair' : 'The beast', '#ff4030', () => {}); }
  }
  function paintClues(leg) {
    for (const cl of run.clues) {
      if (cl.leg !== leg) continue;
      for (let i = 0; i < (land.blood[cl.kind] || 0); i++) addDecal(cl.x + (Math.random() - 0.5) * 2, cl.y + (Math.random() - 0.5) * 2, blood, 0.35 + Math.random() * 0.55, 'splat', 0.88);
    }
  }
  // the first frame (after setWorld cleared the decals, and game.js set the Wilds' weather and ambience)
  function arrive() {
    run.painted = true;
    paintClues(0); markNext();
    setAmbience(land.look.amb);
    run.darkK = world.darkK || 0;
    if (twist === 'blizzard') run.storm = { on: false, t: rand(14, 22) };
    if (twist === 'mire') {
      const d = m.dmg;
      for (const q of H.pools || []) {
        const a = new Area({ world, src: m, x: q.x, y: q.y, r: q.r, dur: 1e9, tick: 0.5, dmg: [d * 0.06, d * 0.09], el: 'poison', fx: 'poison', o: { poison: true } });
        world.addHazard(a); pools.push(a);
        for (let i = 0; i < 4; i++) addDecal(q.x + (Math.random() - 0.5) * q.r, q.y + (Math.random() - 0.5) * q.r, '#3a6a18', q.r * 0.6, 'splat', 0.7);
      }
    }
  }
  function read(cl) {
    if (cl.read || cl.leg !== run.stage) return;
    for (const o of run.clues) if (o.leg === cl.leg && o.n < cl.n) o.read = true;
    cl.read = true;
    UI.log(`<i>${cl.text}</i>`, '#e8c890');
    floatText(cl.x, cl.y, 50, 'A sign', '#e8c080', 13, { life: 1.4 });
    if (twist === 'burrow' && run.phase === 'track') surfaceAt(world.player);
    if (!next() && run.phase === 'track') UI.log(pick(land.close), '#ff9070');
    markNext();
  }
  function startFight() {
    run.phase = 'fight';
    for (const cl of run.clues) if (cl.leg === run.stage) cl.read = true;
    if (run.storm?.on) endStorm('The wind drops. It turns to fight.');
    unmarkAll();
    if (m.buried) unbury();
    UI.centerMsg(def.name.toUpperCase(), ENCOUNTER[run.stage], 2.8);
    if (run.stage >= 2 && !m.angry) { m.angry = true; m.atkCd *= 0.88; m.speed *= 1.1; m.dmg *= 1.15; floatText(m.x, m.y, 90, 'ENRAGED!', '#ff4020', 22, { life: 1.5 }); }
    sfx('roar'); sfx('boss', 0.7);
    addEffect(new Ring(m.x, m.y, 0.3, 4.5, 0.9, '#ff3020', 5));
    // its brood, drawn by the blood: none at first, more each time
    for (let i = 0; i < [0, 2, 3, 4][run.stage]; i++) {
      const [x, y] = map.randomNear(m.x, m.y, 4.5);
      const b = makeMonster(world, def.brood, world.biome, lvl, 'normal', x, y, 0, world.looks?.pick?.(def.brood));
      b.awake = true; b.hunter = true;
      world.add(b); brood.push(b);
    }
    UI.refresh();
  }
  function startFlee() {
    run.stage++; run.phase = 'flee';
    m.targetable = false; m.state = 'idle'; m.action = null; m.aggro = null; m.target = null;
    for (const s of Object.values(m.status)) if (s) s.t = 0;
    UI.centerMsg(twist === 'burrow' ? 'IT BURROWS' : twist === 'wings' ? 'IT TAKES WING' : 'IT FLEES', twist === 'burrow' ? 'Follow the seam' : twist === 'wings' ? 'Climb after it' : 'Follow the blood', 2.6);
    UI.log(`${def.name} ${twist === 'burrow' ? 'dives under the sand' : twist === 'wings' ? 'beats into the air' : 'breaks off and crashes away'}. A dead hunter's satchel lies where it stood.`, '#ff9070');
    // the satchel: a hunt is four fights with no town between, so each flight leaves a little to drink
    for (const [k, dx] of [['hp', -0.5], ['hp', 0], ['rejuv', 0.5]]) world.addLoot(new GroundItem(m.x + dx, m.y + 0.5, 'potion', { item: potionItem(k) }));
    sfx('roar', 0.8);
    paintClues(run.stage);
    markNext();
    // down the next leg of the trail, from the point on it nearest where it stood; on the Crags straight to the next ground
    const path = H.paths[run.stage], to = H.grounds[run.stage];
    let k0 = 0;
    for (let k = 1; k < Math.min(path.length, 14); k++) if (Math.hypot(path[k][0] - m.x, path[k][1] - m.y) < Math.hypot(path[k0][0] - m.x, path[k0][1] - m.y)) k0 = k;
    let line = [[m.x, m.y], ...path.slice(k0)];
    if (twist === 'wings') { const L = Math.hypot(to[0] - m.x, to[1] - m.y), n = Math.max(2, Math.ceil(L)); line = Array.from({ length: n + 1 }, (_, i) => [m.x + (to[0] - m.x) * i / n, m.y + (to[1] - m.y) * i / n]); }
    const speed = twist === 'wings' ? FLEE_SPEED * 1.2 : FLEE_SPEED, total = line.length - 1;
    let t = 0, s = 0, drip = 0.6;
    m.entering = (dt) => {
      t += dt;
      if (t < 0.7) { m.moving = false; if (Math.random() < dt * 8) smoke(m.x, m.y, 4, twist === 'burrow' ? SAND : '#4a3a2a', 3, 10); return; } // the roar before it runs
      if (twist === 'burrow') m.alpha = Math.max(0, 1 - (t - 0.7) * 2);
      s += speed * dt;
      const i = Math.min(line.length - 2, Math.floor(s)), f = Math.min(1, s - i), a = line[i], b = line[i + 1];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      m.face(Math.atan2(y - m.y, x - m.x)); m.x = x; m.y = y; m.moving = true;
      if (twist === 'wings') m.z = 90 * Math.sin(Math.PI * Math.min(1, s / total));
      if (twist === 'burrow' && Math.random() < dt * 14) smoke(x, y, 0, SAND, 3, 8);
      for (; drip <= s && drip < line.length - 1; drip += 1.2) bleed(line, drip);
      const p = world.player, far = !p || Math.hypot(p.x - m.x, p.y - m.y) > 24;
      if (s >= line.length - 1 || (far && s > 10)) {
        for (; drip < line.length - 1; drip += 1.2) bleed(line, drip); // the rest of the trail, out of sight
        park(to);
      }
    };
  }
  function bleed(line, d) {
    if (run.storm?.on && Math.random() < 0.5) return; // the snow covers half of it
    const i = Math.min(line.length - 2, Math.floor(d)), f = d - i, a = line[i], b = line[i + 1];
    const x = a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * 0.9, y = a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * 0.9;
    if (twist === 'burrow') addDecal(x, y, Math.random() < 0.35 ? blood : SAND, 0.3 + Math.random() * 0.4, 'splat', 0.8); // the seam it leaves, and some blood
    else addDecal(x, y, blood, 0.25 + Math.random() * 0.35, 'splat', 0.85);
  }
  function park(g) {
    m.entering = null; m.x = g[0]; m.y = g[1]; m.home = [g[0], g[1]]; m.z = 0;
    m.targetable = true; m.awake = false; m.aggro = null; m.target = null; m.moving = false;
    if (twist === 'burrow') bury();
    run.phase = 'track';
    markNext();
  }
  // ---- the Badlands: under the sand between fights, up through it to fight, and beneath the hero at its signs
  function bury() { m.buried = true; m.alpha = 0; m.targetable = false; }
  function unbury() {
    m.buried = false; m.alpha = 1; m.targetable = true;
    smoke(m.x, m.y, 0, SAND, 14, 30); camera.shake?.(6);
    addEffect(new Ring(m.x, m.y, 0.3, 3.5, 0.7, SAND, 6));
    for (let i = 0; i < 10; i++) addDecal(m.x + (Math.random() - 0.5) * 4, m.y + (Math.random() - 0.5) * 4, SAND, 0.5 + Math.random() * 0.6, 'splat', 0.8);
  }
  function surfaceAt(p) {
    if (!p || p.dead) return;
    world.addHazard(new Delayed({ world, src: m, x: p.x, y: p.y, r: 1.7, delay: 1.1, fx: 'eruption', el: 'phys', dmg: [m.dmg * 0.7, m.dmg * 0.9], o: { knock: 1.2 } }));
    smoke(p.x, p.y, 0, SAND, 8, 14);
    if (!run.warned) { run.warned = true; UI.log('The sand bulges under your feet. Move!', '#ffb070'); }
  }
  // ---- the White Waste: squalls while tracking, never in a fight
  function blizzard(dt) {
    const S = run.storm;
    if (!S) return;
    if (run.phase === 'fight') { if (S.on) endStorm(); return; }
    S.t -= dt;
    if (!S.on && S.t <= 0) {
      S.on = true; S.t = rand(10, 14);
      world.darkK = Math.max(run.darkK, 0.55);
      UI.log('A blizzard sweeps in. The trail is lost in the white.', '#d8e8ff');
      markNext();
    } else if (S.on && S.t <= 0) endStorm('The wind drops. The trail shows again.');
    if (S.on) for (let i = 0; i < (G.touch ? 3 : 7); i++) {
      const [x, y] = camera.screenToTile(Math.random() * G.W, (Math.random() * 1.1 - 0.1) * G.H);
      spawn({ type: 'streak', x, y, z: rand(60, 160), vx: 1.6, vy: -0.4, vz: -40, life: 1.1, size: G.touch ? 1.2 : 1.6, color: '#f4f8ff' });
    }
  }
  function endStorm(say) {
    const S = run.storm;
    S.on = false; S.t = rand(22, 32);
    world.darkK = run.darkK;
    if (say) UI.log(say, '#d8e8ff');
    markNext();
  }
  function finish() {
    if (run.completed) return;
    run.completed = true; run.phase = 'done';
    unmarkAll();
    for (const a of pools) a.t = a.dur; // the pools go with it
    if (run.storm?.on) endStorm();
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
  let h = `<div class="dim q-note">${sc.land.name}</div>`;
  h += step(sc.stage > 0 || sc.completed, `Track ${name} by its signs <span class="dim">— ${sc.read}/${total} read</span>.`);
  for (let k = 0; k < 3; k++) h += step(sc.stage > k || sc.completed, `Hunting ground ${k + 1}: wound it until it flees${sc.stage === k && sc.phase === 'fight' ? ' <span class="dim">— fighting</span>' : ''}.`);
  h += step(sc.completed, sc.land.twist === 'wings' ? 'Climb to its lair on the peak and finish it.' : 'Follow it to its lair and finish it.');
  h += step(sc.completed, sc.completed ? 'The exit in the lair is open.' : 'Its death opens the way on.');
  if (!sc.completed) h += `<div class="dim q-note">Its life: ${sc.life}%. Its wounds carry over.</div>`;
  return h;
}
