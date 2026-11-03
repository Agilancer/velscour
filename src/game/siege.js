// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): tower defence inside the ARPG. The dead come up the field in waves and
// make for the hero; while he is inside the keep its three gates hold them on their lines, where they batter the
// portcullis down. Between waves the hero mends the gates at their winches, loads the ballistae on the corner towers
// (they loose on their own while they have bolts) and sounds the horn under the keep's standard when he is ready. The
// dead inside the walls wear down the keep's Resolve; at none the keep is overrun and the wave comes again. Hold every
// wave (the last brings their lord) and the exit in the courtyard opens. Auto-play follows `objective` (autoplay.js).
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { rand, pick, chance, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { makeMonster, monsterBase } from './monster.js';
import { hit } from './combat.js';
import { dropChest } from './loot.js';
import { addEffect, addLight, Ring, burst, smoke, sparkle, floatText, spawn } from '../gfx/vfx.js';
import { depthLevel } from '../data/depth.js';
import { LV } from '../world/siege.js';
import { drawGate, drawWinch, drawBallista, drawStandard, drawFirePot, SiegeBolt, resetSiegeArt } from '../gfx/siege.js';
import { Area, Delayed } from './hazards.js';
import { HS } from '../gfx/terrain.js';
import { SKILLS } from '../data/skills.js';

const PREP = 40, LULL = 30, BOLTS = 6, RANGE = 21;
const CAPTAIN = (t) => `<b style="color:#ffcf80">Captain Hale:</b> ${t}`;
/** How many waves a siege at this depth asks for: 4, one more every 50 depths, at most 7. */
export const siegeWaves = (depth) => Math.min(7, 4 + Math.floor(depth / 50));

export function createSiegeRun(world, gen, biome0, depth, onSuccess) {
  resetSiegeArt();
  // the variant's keep (world/siege.js siegeLayout): its gates, ballistae, standard, horde, lord and twist; its season
  // (the element and tint of the dead, the drift in the air, the torches) laid over the biome for this level
  const L = gen.lay, { gates: GATES, ballistae: BALLISTAE, keep: KEEP, insideKeep, inCourtyard } = L;
  const biome = L.biome ? { ...biome0, ...L.biome } : biome0;
  if (L.biome) { world.biome = biome; world.ambientFx = L.biome.ambient || null; }
  if (L.fog) { world.darkK = L.fog; world.night = true; }   // the swamp's fog: always dim, never pitch dark
  const map = world.map, lvl = depthLevel(depth), base = monsterBase(lvl), total = siegeWaves(depth);
  const live = new Set(), queue = [], twist = L.twist, special = total - 2;   // the twist's own wave: the one before the last
  // ---- the gates, their winches, the ballistae and the standard (world.chests entries: drawn and clicked like chests)
  const gates = GATES.map((G0) => {
    const g = { ...G0, hp: 100, max: 100, broken: false, lift: 0, hitT: 0, attackers: 0, mendCd: 0, inert: true, opened: true, reach: 0 };
    const c = g.a0 + 1.5;
    [g.x, g.y] = g.axis === 'x' ? [c, g.line] : [g.line, c];
    g.stand = g.axis === 'x' ? [c, g.inner + 0.5] : [g.inner + 0.5, c];     // in the passage, behind the portcullis
    g.out = g.axis === 'x' ? [c, g.line + 2] : [g.line + 2, c];
    // on the wall-walk over it: the flanks' inner tiles, either side of the passage (a shooter's post)
    g.posts = [g.a0 - 0.5, g.a0 + 3.5].map((u) => (g.axis === 'x' ? [u, g.inner + 0.5] : [g.inner + 0.5, u]));
    g.draw = (ctx) => drawGate(ctx, g);
    return g;
  });
  const winches = gates.map((g) => {
    const [x, y] = g.axis === 'x' ? [g.a0 - 0.9, g.inner - 1.4] : [g.inner - 1.4, g.a0 - 0.9];
    const w = { x, y, gate: g, reach: 1.6, flip: g.axis === 'y', label: 'Gate winch', dot: '#ffb040',
      needs: () => g.broken || g.hp < g.max,
      get opened() { return !w.needs(); },
      use() { mend(g); },
      draw: (ctx, px, py) => drawWinch(ctx, w, px, py) };
    return w;
  });
  const balls = BALLISTAE.map((B) => {
    const b = { ...B, x: B.at[0], y: B.at[1], ammo: 0, max: BOLTS, cd: rand(0.3, 1), aim: Math.PI / 4, recoil: 0, reach: 4.6, label: 'Ballista', dot: '#ff9040',
      get opened() { return b.ammo >= b.max; },
      use() { load(b); },
      draw: (ctx, px, py) => drawBallista(ctx, b, px, py) };
    return b;
  });
  const standard = { x: KEEP.banner[0], y: KEEP.banner[1], reach: 2.2, label: "The keep's standard", dot: '#ffe060',
    ready: () => run.phase === 'prep' || run.phase === 'lull',
    get opened() { return !standard.ready(); },
    use() { if (standard.ready()) startWave(); else floatText(standard.x, standard.y, 70, 'Hold the walls!', '#ffd080', 13); },
    draw: (ctx, px, py) => drawStandard(ctx, standard, px, py) };
  // the river wall's fire-pots: one on the walk over each gate, tipped onto the dead at its foot (refilled between waves)
  const pots = twist === 'fire' ? gates.map((g) => {
    const [x, y] = g.posts[0], o = { x, y, gate: g, full: true, reach: 1.6, label: 'Fire-pot', dot: '#ff7030',
      get opened() { return !o.full; },
      use() { pour(o); },
      draw: (ctx, px, py) => drawFirePot(ctx, o, px, py) };
    return o;
  }) : [];
  world.chests.push(...gates, ...winches, ...balls, ...pots, standard);

  const run = {
    id: 'endless_siege', type: 'siege', active: true, completed: false, failed: false, markers: [], route: [], stage: 0,
    shrine: { x: standard.x, y: standard.y, reach: 2, use() {} },
    phase: 'prep', wave: 0, total, t: PREP, resolve: 100, falls: 0, kills: 0, spawnT: 0, lastSpawn: 0, boss: null, bossDue: false,
    gates, winches, ballistae: balls, pots, standard, live, queue, variant: L.id, lay: L, twist, blizzard: false,
    get title() {
      return run.completed ? 'The Siege Is Broken' : run.phase === 'wave' ? `Hold the Walls — Wave ${run.wave + 1}/${total}` : `Ready the Walls — Wave ${run.wave + 1}/${total}`;
    },
    get description() {
      return run.completed ? 'The dead are broken. The exit in the courtyard is open.'
        : run.phase === 'wave' ? 'Hold the gates. The dead inside the walls wear down the keep.'
          : 'Mend the gates, load the ballistae, then sound the horn.';
    },
    /** The HUD line: wave, the keep's resolve, what comes next. */
    get hud() {
      const left = queue.length + [...live].filter((m) => !m.dead).length;
      return { title: run.completed ? 'The Siege Is Broken' : `Wave ${Math.min(run.wave + 1, total)}/${total}`, resolve: Math.round(run.resolve),
        progress: run.completed ? 'The exit is open' : run.phase === 'wave' ? `${left} of the dead left` : `Next wave in ${Math.ceil(run.t)}s`,
        gates: gates.map((g) => (g.broken ? 0 : Math.round((g.hp / g.max) * 100))) };
    },
    /** Where auto-play should be: the next chore between waves, the gate under the heaviest attack during one. */
    get objective() {
      if (run.completed) return undefined;
      const p = world.player;
      if (!p) return null;
      const near = (list) => list.reduce((a, o) => (!a || Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? o : a), null);
      if (run.phase !== 'wave') {
        const c = near(chores());
        return c || { x: standard.x, y: standard.y + 1.3, reach: 1.4, use: () => standard.use() };
      }
      const foes = [...live].filter((m) => !m.dead && !m.entering);
      const inside = foes.filter((m) => inCourtyard(m.x, m.y));
      if (inside.length) { const m = near(inside); return { x: m.x, y: m.y, reach: 2 }; }
      const hot = gates.filter((g) => !g.broken).map((g) => [g, foes.filter((m) => Math.hypot(m.x - g.out[0], m.y - g.out[1]) < 5).length]).sort((a, b) => b[1] - a[1])[0];
      // a full fire-pot over a gate with a crowd at its foot: tip it
      const pot = pots.find((o) => o.full && foes.filter((m) => Math.hypot(m.x - o.gate.out[0], m.y - o.gate.out[1]) < 3.2).length >= 4);
      if (pot) return { x: pot.x, y: pot.y, reach: 1.2, use: () => pour(pot) };
      if (hot && hot[1]) {
        // a shooter takes the wall-walk over that gate (the nearer flank) and looses down; a fighter stands behind the gate
        if (ranged()) { const [x, y] = hot[0].posts.reduce((a, q) => (Math.hypot(q[0] - p.x, q[1] - p.y) < Math.hypot(a[0] - p.x, a[1] - p.y) ? q : a)); return { x, y, reach: 0.8 }; }
        return { x: hot[0].stand[0], y: hot[0].stand[1], reach: 1 };
      }
      const empty = balls.filter((b) => b.ammo < 2);
      if (empty.length) { const b = near(empty); return { x: b.foot[0], y: b.foot[1], reach: 1.1, use: () => load(b) }; }
      const broke = gates.find((g) => g.broken && !foes.some((m) => Math.hypot(m.x - g.x, m.y - g.y) < 6));
      if (broke) { const w = winches[gates.indexOf(broke)]; return { x: w.x, y: w.y, reach: 1.1, use: () => mend(broke) }; }
      const m = near(foes.filter((q) => !insideKeep(q.x, q.y)));
      if (m) { const g = near(gates.map((q) => ({ x: q.out[0], y: q.out[1], g: q }))); return { x: g.g.stand[0], y: g.g.stand[1], reach: 1 }; }
      return { x: standard.x, y: standard.y + 1.3, reach: 2 };
    },
    update(dt) { tick(dt); },
  };
  /** Does the hero fight from range (auto-play's own test, Auto.meleeBuild, turned round)? */
  function ranged() {
    const c = G.char, sk = c && SKILLS[c.bar[0]];
    return !!c && !['lancer', 'barbarian', 'dragoon'].includes(c.classId) && !(sk && ['melee', 'whirl', 'leap', 'dash'].includes(sk.kind));
  }
  /** The work waiting between waves: gates to mend, ballistae to load (auto-play's objectives). */
  function chores() {
    const out = [];
    for (const w of winches) if (w.needs()) out.push({ x: w.x, y: w.y, reach: 1.1, use: () => mend(w.gate) });
    for (const b of balls) if (b.ammo < b.max) out.push({ x: b.foot[0], y: b.foot[1], reach: 1.1, use: () => load(b) });
    return out;
  }
  function mend(g) {
    if (!g.broken && g.hp >= g.max) return;
    const lull = run.phase !== 'wave', foesNear = [...live].some((m) => !m.dead && Math.hypot(m.x - g.x, m.y - g.y) < 4.5);
    if (!lull && foesNear) { floatText(g.x, g.y, 80, 'Too many of them!', '#ff9070', 12); sfx('error'); return; }
    if (!lull && g.mendCd > 0) { floatText(g.x, g.y, 80, 'The winch is still turning…', '#c0b0a0', 12); return; }
    g.hp = lull ? g.max : Math.min(g.max, (g.broken ? 0 : g.hp) + 40);
    g.broken = false; g.mendCd = 6;
    sfx('door'); sfx('gate', 0.6);
    sparkle(g.x, g.y, 40, '#ffd080', 14, 1.4);
    floatText(g.x, g.y, 90, lull ? 'Gate mended' : 'Gate shored up', '#ffd080', 13);
  }
  function load(b) {
    if (b.ammo >= b.max) return;
    b.ammo = b.max;
    sfx('chest', 0.6); sfx('bow', 0.8, 0.7);
    floatText(b.x, b.y, 110, `${b.max} bolts`, '#ffe0a0', 13);
  }
  // ---- the waves
  // the variant's horde: its first three kinds from the first wave, two more from the second, the rest from the third;
  // its heavies come as Gate-Breakers
  const ROSTER = L.roster.length ? L.roster : ['skeleton', 'zombie'], HEAVY = L.heavy;
  const tier = (k) => ROSTER.slice(0, k >= 2 ? ROSTER.length : k >= 1 ? 5 : 3);
  function buildWave(k) {
    const n = Math.min(42, 10 + 4 * k + Math.floor(depth / 25)), pool = tier(k).length ? tier(k) : ROSTER;
    const heavy = HEAVY;
    for (let i = 0; i < n; i++) queue.push({ arch: pick(pool), rank: i < k ? 'champion' : 'normal' });
    if (k >= 2 && heavy.length) for (let i = 0; i < 1 + (k >> 1); i++) queue.splice(Math.floor(rand(0.3, 1) * queue.length), 0, { arch: pick(heavy), rank: 'normal', ram: true });
    run.bossDue = k === total - 1;
  }
  function startWave() {
    if (run.phase === 'wave' || run.completed) return;
    run.phase = 'wave'; run.t = 0; run.spawnT = 1.5; run.lastSpawn = world.time;
    buildWave(run.wave);
    const sp = run.wave === special && TWIST_WAVE[twist];
    if (twist === 'frost') setBlizzard(run.wave === special);
    UI.centerMsg(run.wave === total - 1 ? 'THE LAST WAVE' : sp ? sp[0] : `WAVE ${run.wave + 1}`, run.wave === total - 1 ? 'Their lord comes with it' : sp ? sp[1] : 'Hold the walls', 2.6);
    UI.log(CAPTAIN(pick(['Here they come!', 'To the gates!', 'They never stop. Neither do we.', 'Bolts loose at will!'])), '#e8d8b8');
    sfx('boss', 0.5);
  }
  function spawnOne(e, at) {
    const look = gen.looks.pick(e.arch), rank = e.rank;
    const m = makeMonster(world, e.arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, at[0], at[1], 0, look);
    world.add(m);
    m.awake = true; m.hunter = true; m.siegeWave = run.wave; m.ram = !!e.ram;
    if (e.ram) { m.name = 'Gate-Breaker ' + m.name; m.scale = (m.scale || 1) * 1.1; }
    if (run.wave === special && twist === 'fire') m.burning = true;          // the fire wave: they come burning
    if (run.blizzard) m.speed *= 1.15;                                         // the blizzard drives them on
    live.add(m);
    if (twist === 'plague') { smoke(m.x, m.y, 2, '#3a4a20', 4, 10); burst(m.x, m.y, 4, 'poison', 8, 1.2); }   // up out of the mire
    else { smoke(m.x, m.y, 4, '#2a2018', 3, 9); burst(m.x, m.y, 6, 'phys', 6, 1.5); }
    return m;
  }
  function spawnBoss() {
    const b = gen.boss || { arch: 'knight', look: gen.looks.pick('knight') }, at = pick(gen.spawnPts);
    const m = makeMonster(world, b.arch, biome, lvl + 2, 'boss', at[0], at[1], 0, b.look);
    world.add(m);
    m.awake = true; m.hunter = true; m.siegeWave = run.wave; m.ram = true;
    live.add(m); world.boss = m; run.boss = m; run.bossDue = false;
    if (twist === 'plague') { m.plague = true; m.plagueT = 3; }
    UI.centerMsg(m.name, L.lord, 3.2);
    sfx('boss'); smoke(m.x, m.y, 6, '#1a1210', 8, 14);
  }
  function clearWave() {
    run.wave++; run.resolve = Math.min(100, run.resolve + 20);
    if (run.wave >= total) return victory();
    run.phase = 'lull'; run.t = LULL; refill(); setBlizzard(false);
    UI.centerMsg(`WAVE ${run.wave} HELD`, 'Mend the gates. Load the ballistae.', 2.8);
    UI.log(CAPTAIN(pick(['Breathe. Then back to the walls.', 'Mend what they broke.', 'More are coming. Always more.'])), '#e8d8b8');
    sfx('gate');
  }
  function overrun() {
    run.falls++;
    for (const m of live) if (!m.dead) { m.dead = true; m.hp = 0; m.noLoot = true; m.removeT = 1; smoke(m.x, m.y, 4, '#2a2018', 3, 8); }
    live.clear(); queue.length = 0;
    if (run.boss && run.boss.dead) world.boss = null;
    for (const g of gates) { g.broken = false; g.hp = Math.max(g.hp, g.max * 0.5); }
    run.resolve = 100; run.phase = 'lull'; run.t = LULL; refill(); setBlizzard(false);
    UI.centerMsg('THE KEEP IS OVERRUN', 'Fall back. They come again.', 3.2);
    UI.log(CAPTAIN('We held the inner yard. Barely. Again!'), '#e8b8a8');
    sfx('die', 0.6);
  }
  function victory() {
    run.completed = true; run.phase = 'done'; setBlizzard(false);
    world.boss = null;
    UI.centerMsg('THE SIEGE IS BROKEN', 'The exit is open', 3.5);
    UI.log(CAPTAIN('They break! The keep stands. Go, before the next tide.'), '#ffe2a0');
    dropChest(world, { x: standard.x + 0.6, y: standard.y + 1.2, rare: true }, depth);
    addEffect(new Ring(standard.x, standard.y, 0.2, 4, 1.2, '#ffd060', 5));
    onSuccess();
    UI.refresh();
  }
  // ---- the ballistae: each looses at the nearest of the dead in range while it has bolts
  const shooter = { team: 'player', dead: true, x: 0, y: 0, level: lvl };   // (dead: struck foes don't turn on it)
  function loose(b, m) {
    const ang = Math.atan2(m.y - b.y, m.x - b.x), d = Math.hypot(m.x - b.x, m.y - b.y);
    b.aim = ang; b.ammo--; b.recoil = 1; b.cd = 1.7;
    const hitSet = new Set(), dmg = base.hp * 0.6;
    shooter.owner = world.player; shooter.x = b.x; shooter.y = b.y;
    addEffect(new SiegeBolt(b.x, b.y, LV.tower * HS + 30, ang, Math.min(RANGE + 2, d + 4), 14, (x0, y0, x1, y1) => {
      if (hitSet.size >= 4) return;
      const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
      for (const q of live) {
        if (q.dead || hitSet.has(q) || q.targetable === false) continue;
        const t = clamp(((q.x - x0) * dx + (q.y - y0) * dy) / L2, 0, 1), px = x0 + dx * t, py = y0 + dy * t;
        if (Math.hypot(q.x - px, q.y - py) > 0.45 + (q.r || 0.3)) continue;
        hitSet.add(q);
        hit(shooter, q, dmg * (q.rank === 'boss' ? 0.5 : 1), 'phys', { crit: false, knock: 0.6, ang });
        burst(q.x, q.y, 24, 'phys', 5, 2);
        if (hitSet.size >= 4) break;
      }
    }));
    sfx('bow', 1, 0.55); sfx('thud', 0.4, 1.4);
    smoke(b.x, b.y, LV.tower * HS + 20, '#5a5048', 2, 6);
  }
  function ballistae(dt) {
    for (const b of balls) {
      b.recoil = Math.max(0, b.recoil - dt * 3);
      if ((b.cd -= dt) > 0 || !b.ammo) continue;
      let best = null, bd = Infinity;
      for (const m of live) {
        if (m.dead || m.entering || m.targetable === false) continue;
        const d = Math.hypot(m.x - b.x, m.y - b.y);
        if (d > (run.blizzard ? RANGE * 0.6 : RANGE)) continue;
        const held = gates.some((g) => !g.broken && Math.hypot(m.x - g.out[0], m.y - g.out[1]) < 3.5), s = d - (held ? 8 : 0) - (inCourtyard(m.x, m.y) ? 4 : 0);
        if (s < bd) { bd = s; best = m; }
      }
      if (best) loose(b, best); else b.cd = 0.4;
    }
  }
  // ---- the gates hold the dead on their lines while the hero is inside the keep; there they batter at them
  const HIT = { normal: 2, champion: 4, unique: 5, boss: 9 };
  function holdGates(dt) {
    const p = world.player, heroIn = p && !p.dead && insideKeep(p.x, p.y);
    for (const g of gates) {
      g.attackers = 0; g.hitT = Math.max(0, g.hitT - dt); g.mendCd = Math.max(0, g.mendCd - dt);
      // the portcullis rises for the hero in its passage
      const at = p && Math.hypot(p.x - g.x, p.y - g.y) < 1.9 && !g.broken;
      g.lift = clamp(g.lift + (at ? 3 : -2) * dt, 0, 1);
    }
    if (!heroIn) return;
    for (const m of live) {
      if (m.dead || m.entering) continue;
      for (const g of gates) {
        if (g.broken) continue;
        const [u, v] = g.axis === 'x' ? [m.x, m.y] : [m.y, m.x];
        if (u < g.a0 - 0.3 || u > g.a0 + 3.3 || v < g.inner - 0.05 || v >= g.line + 0.42) continue;
        if (g.axis === 'x') m.y = g.line + 0.42; else m.x = g.line + 0.42;
        g.attackers++;
        if (p && Math.hypot(p.x - m.x, p.y - m.y) < 1.5) continue;   // the hero is right there: it fights him instead
        if ((m.batT = (m.batT ?? rand(0, 0.8)) - dt) > 0) continue;
        m.batT = (m.atkCd || 1.2) * rand(0.9, 1.3);
        m.face && m.face(g.axis === 'x' ? -Math.PI / 2 : Math.PI);
        m.lunge = 1;
        g.hp -= (HIT[m.rank] || 2) * (m.ram ? 3 : 1) * (m.burning ? 1.5 : 1);
        g.hitT = 0.15;
        burst(m.x - (g.axis === 'y' ? 0.4 : 0), m.y - (g.axis === 'x' ? 0.4 : 0), 26, 'phys', 3, 1.2);
        if (chance(0.5)) sfx('thud', 0.35, rand(0.8, 1.1));
        if (g.hp <= 0) {
          g.hp = 0; g.broken = true;
          UI.centerMsg(`${g.name.replace(/^the /, 'THE ').toUpperCase()} IS BREACHED`, 'The dead are in the walls', 2.4);
          sfx('explode', 0.7); smoke(g.x, g.y, 20, '#3a2a20', 10, 14);
          for (let k = 0; k < 14; k++) spawn({ type: 'dot', x: g.x + rand(-1.5, 1.5), y: g.y + rand(-0.3, 0.3), z: rand(10, 60), vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(20, 80), g: 160, life: rand(0.5, 1), size: rand(2, 4), color: '#6a4a2a' });
        }
      }
    }
  }
  // ---- the variants' twists
  const TWIST_WAVE = { frost: ['A BLIZZARD', 'The ballistae can barely see. The dead come faster.'], fire: ['THE FIRE WAVE', 'They come burning. Their blows set the gates alight.'] };
  function refill() { for (const o of pots) o.full = true; }
  /** Tip a fire-pot: burning oil on the dead at its gate's foot, and the ground there burning a while. */
  function pour(o) {
    if (!o.full) { floatText(o.x, o.y, 90, 'Empty until the wave is held', '#c0b0a0', 12); return; }
    o.full = false;
    const [x, y] = o.gate.out;
    shooter.owner = world.player; shooter.x = x; shooter.y = y;
    for (const m of live) if (!m.dead && Math.hypot(m.x - x, m.y - y) < 3.2) hit(shooter, m, base.hp * (m.rank === 'boss' ? 0.3 : 0.9), 'fire', { crit: false });
    world.addHazard(new Area({ world, src: shooter, x, y, r: 2.4, dur: 4, tick: 0.5, dmg: [base.hp * 0.06, base.hp * 0.08], el: 'fire', fx: 'fire' }));
    for (let k = 0; k < 24; k++) spawn({ type: 'flame', x: x + rand(-2, 2), y: y + rand(-1.6, 1.6), z: rand(0, 20), vz: rand(20, 60), life: rand(0.5, 1.1), size: rand(4, 7), size1: 0.3, add: true });
    sfx('fire', 0.8); sfx('explode', 0.4);
    floatText(o.x, o.y, 100, 'Burning oil!', '#ff9050', 14);
  }
  function setBlizzard(on) {
    if (twist !== 'frost' || run.blizzard === on) return;
    run.blizzard = on;
    world.darkK = on ? Math.max(world.darkK || 0, 0.45) : (world.night ? 0.6 : 0);
  }
  let rockT = 5;
  function twistTick(dt) {
    const p = world.player;
    if (twist === 'frost') {
      // ice: the dead slip and slow on it
      for (const m of live) if (!m.dead && !m.fly && map.siegeIce[map.tileIdx(m.x, m.y)]) { const s = m.status; if (!s.slow || s.slow.t < 0.2) s.slow = { t: 0.35, amt: 0.4 }; }
      if (run.blizzard && p) for (let k = 0; k < 8; k++) spawn({ type: 'streak', x: p.x + rand(-11, 9), y: p.y + rand(-11, 9), z: rand(60, 170), vx: -3, vy: 1.6, vz: -60, life: 1.4, size: 2, color: '#f2f8ff' });
    } else if (twist === 'fire') {
      if (chance(dt * 8)) { const m = pick([...live]); if (m && m.burning && !m.dead) spawn({ type: 'flame', x: m.x + rand(-0.2, 0.2), y: m.y + rand(-0.2, 0.2), z: rand(20, 50), vz: rand(15, 35), life: rand(0.3, 0.6), size: rand(3, 5), size1: 0.3, add: true }); }
    } else if (twist === 'rockfall') {
      // rocks come down the slopes onto the dead in the pass (never once they are at the gate or inside)
      if (run.phase === 'wave' && (rockT -= dt) <= 0) {
        rockT = rand(3.5, 6.5);
        const out = [...live].filter((m) => !m.dead && !insideKeep(m.x, m.y) && L.outFrom(m.x, m.y) > 3);
        if (out.length) {
          const m = pick(out), x = m.x + rand(-1, 1), y = m.y + rand(-1, 1);
          shooter.owner = world.player; shooter.x = x; shooter.y = y;
          world.addHazard(new Delayed({ world, src: shooter, x, y, r: 1.8, delay: 1.1, fx: 'meteor', el: 'phys', dmg: [base.hp * 0.5, base.hp * 0.6], showRing: true }));
          sfx('thud', 0.5, 0.6);
        }
      }
    } else if (twist === 'plague') {
      // fog over the mire; their lord leaves the plague behind him
      if (chance(dt * 5) && gen.spawnPts.length) { const [x, y] = pick(gen.spawnPts); smoke(x, y, 2, '#2a3418', 5, 14); }
      for (const m of live) if (m.plague && !m.dead && (m.plagueT -= dt) <= 0) {
        m.plagueT = 4.5;
        world.addHazard(new Area({ world, src: m, x: m.x, y: m.y, r: 2.1, dur: 5, tick: 0.5, dmg: [m.dmg * 0.2, m.dmg * 0.3], el: 'poison', fx: 'poison' }));
      }
    }
  }
  // ---- the frame
  let hudEl = null, hudT = 0, chaseT = 0;
  function tick(dt) {
    const p = world.player;
    // a fighter on the walls goes down the stairs to what he fights below (and up to what climbed them), as on the
    // Castle's walls (autoplay.js offTier reads rampartDeck); a shooter stays up there and looses down
    map.rampartDeck = ranged() ? null : map.siegeDeck;
    holdGates(dt);
    ballistae(dt);
    twistTick(dt);
    for (const m of live) if (m.dead) { if (!m.noLoot) run.kills++; live.delete(m); }
    if (world.darkK || world.night) for (const [x, y] of gen.braziers) addLight(x, y, 4, 0.9, 30, '#ffa050');
    if (chance(dt * 3)) { const [x, y] = pick(gen.braziers); spawn({ type: 'flame', x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: 30, vz: rand(10, 30), life: rand(0.3, 0.6), size: rand(2.5, 4), size1: 0.3, add: true }); }
    hudTick(dt);
    if (run.completed || G.cine || !p || p.dead) return;
    if (run.phase === 'prep' || run.phase === 'lull') {
      if ((run.t -= dt) <= 0) startWave();
      return;
    }
    // spawning: the wave comes up the field in clumps of one to three over about twenty seconds
    if (queue.length && (run.spawnT -= dt) <= 0) {
      const at = pick(gen.spawnPts), n = Math.min(queue.length, 1 + Math.floor(rand(0, 3)));
      for (let i = 0; i < n; i++) spawnOne(queue.shift(), map.randomNear(at[0], at[1], 1.4));
      run.spawnT = rand(0.8, 2.2) * (1 - Math.min(0.5, run.wave * 0.06)); run.lastSpawn = world.time;
      if (n && chance(0.4)) sfx('bones', 0.5);
    }
    if (run.bossDue && queue.length < 6) spawnBoss();
    // the dead inside the walls wear down the keep
    let drain = 0;
    for (const m of live) if (!m.dead && (m.rank !== 'boss' || m.plague) && inCourtyard(m.x, m.y)) drain += m.plague ? 1.2 : m.rank === 'champion' ? 0.6 : 0.3;   // (their lord is the fight itself; but the plague spreads)
    run.resolve -= Math.min(3, drain) * dt;
    if (run.resolve <= 0) { run.resolve = 0; return overrun(); }
    // stragglers that lost their way (a fight carried off somewhere) are brought back to the gates
    const left = [...live].filter((m) => !m.dead);
    if (!queue.length && !run.bossDue && left.length && left.length <= 4 && world.time - run.lastSpawn > 40 && (chaseT -= dt) <= 0) {
      chaseT = 12;
      for (const m of left) if (!p || Math.hypot(m.x - p.x, m.y - p.y) > 16) { const g = pick(gates.filter((q) => !q.broken)) || gates[0]; [m.x, m.y] = map.randomNear(g.out[0] + (g.axis === 'y' ? 2 : 0), g.out[1] + (g.axis === 'x' ? 2 : 0), 1.2); m.nav = null; }
    }
    if (!queue.length && !run.bossDue && !left.length) clearWave();
  }
  // ---- the HUD line under the top bar (its own element: index.html's scenario panel belongs to other maps)
  function hudTick(dt) {
    if ((hudT -= dt) > 0) return;
    hudT = 0.25;
    if (G.world !== world) { if (hudEl) { hudEl.remove(); hudEl = null; } return; }
    if (typeof document === 'undefined') return;
    if (!hudEl) {
      if (!document.getElementById('siege-style')) {
        const st = document.createElement('style'); st.id = 'siege-style';
        st.textContent = '#siege-objective{position:absolute;z-index:4;top:54px;left:50%;transform:translateX(-50%);width:min(560px,74vw);padding:6px 12px;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid rgba(226,150,90,.6);border-radius:5px;background:rgba(28,12,8,.84);color:#f3dfbd;font:600 13px/1.2 var(--font-body);text-align:center;text-shadow:0 1px 2px #000;pointer-events:none}'
          + '#siege-objective b{color:#ffb070;font:800 14px var(--font-head)}#siege-objective .sg-res{display:inline-flex;align-items:center;gap:5px}#siege-objective .sg-bar{width:70px;height:7px;background:#000a;border:1px solid #6a4a30}#siege-objective .sg-bar i{display:block;height:100%;background:linear-gradient(#ffcf70,#d07a30)}'
          + '#siege-objective .sg-gates{color:#d8c8a8}body.touch #siege-objective{top:80px;width:min(420px,52vw);padding:4px 8px;gap:7px;font-size:11px}';
        document.head.appendChild(st);
      }
      hudEl = document.createElement('div'); hudEl.id = 'siege-objective';
      (document.getElementById('sand-objective')?.parentElement || document.body).appendChild(hudEl);
      const watch = setInterval(() => { if (G.world !== world) { hudEl?.remove(); hudEl = null; clearInterval(watch); } }, 500);
    }
    const h = run.hud;
    hudEl.innerHTML = `<b>${h.title}</b><span class="sg-res">Resolve <span class="sg-bar"><i style="width:${h.resolve}%"></i></span></span><span>${h.progress}</span><span class="sg-gates">Gates ${h.gates.map((v) => (v ? v + '%' : '<span style="color:#ff7050">down</span>')).join(' · ')}</span>`;
  }
  return run;
}
