// Minion pathing and behaviour (Necromancer skeletons, Slime Lord slimes): in a Catacombs level,
//  1. wall:   pets start behind a wall from the standing hero (long way round) and must walk to them,
//  2. walk:   the hero walks several long paths; pets must keep up (few blinks back, none left behind),
//  3. fight:  foes sit round a corner near the idle hero; pets must go and kill them,
//  4. leash:  a foe far away (by walking) must be left alone,
//  5. potter: the hero stands still with nothing about; pets must amble round them, not wander off.
// Prints per-scenario numbers and PASS/FAIL; pets_walk.png, pets_potter.png.
//   node tools/tests/pets.js [seeds=3]
const { openGame, report } = require('./harness');
const SEEDS = +(process.argv[2] || 3);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('necromancer', 'Petkeeper');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
  });
  const fails = [];
  for (let seed = 0; seed < SEEDS; seed++) {
    const r = await page.evaluate(async (seed) => {
      const { G, game } = window.VELSCOUR;
      const { SUMMONS } = await import('/src/data/summons.js');
      const { buildSummon, makeMonster } = await import('/src/game/monster.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { dist } = await import('/src/core/util.js');
      G.char.level = 30; G.player.recompute();
      game.buildDungeon(4 + seed * 7, BIOME_BY_ID.catacombs);
      const p = G.player, w = G.world, map = w.map;
      G.godMode = true; G.paused = true;
      const clear = () => { for (const c of w.creatures) if (!c.isPlayer && c.team === 'enemy') c.dead = true; w.update(1 / 30); };
      clear();
      const KEYS = ['skeleton', 'skeleton', 'reaver', 'spearman', 'skelarcher', 'pyromancer', 'sl_pouncer', 'sl_charmer', 'sl_mender', 'sl_frost', 'sl_bulwark', 'slimetitan'];
      let pets = [];
      const summon = (x, y) => {
        for (const c of pets) c.dead = true;
        pets = KEYS.map((k, i) => { const [px, py] = map.randomNear(x, y, 1.2); return w.add(buildSummon(p, SUMMONS[k], k, px, py, 30, 5000, 0)); });
        w.update(1 / 30);
      };
      const plen = (x0, y0, path) => { let L = 0, ax = x0, ay = y0; for (const [x, y] of path) { L += dist(ax, ay, x, y); ax = x; ay = y; } return L; };
      // run n steps, counting blinks (a pet jumping over a tile in one step) and time spent wedged
      const run = (n, each) => {
        const st = { blinks: 0, wedged: 0, steps: 0 };
        const last = new Map(pets.map((c) => [c, [c.x, c.y]]));
        for (let i = 0; i < n; i++) {
          w.update(1 / 30);
          for (const c of pets) {
            const [lx, ly] = last.get(c);
            if (dist(lx, ly, c.x, c.y) > 1 && !(c.slime && c.slime.act && c.slime.act.type === 'blink')) st.blinks++; // a blue slime's blink is meant
            last.set(c, [c.x, c.y]);
          }
          if (each && each(i) === false) break;
          st.steps++;
        }
        return st;
      };
      const rnd = () => { let x, y; do { x = Math.random() * map.w; y = Math.random() * map.h; } while (!map.circleFree(x, y, 0.45)); return [Math.floor(x) + 0.5, Math.floor(y) + 0.5]; };
      const out = { seed };

      // 1. behind a wall: close as the crow flies, far round
      let A = null, B = null;
      for (let k = 0; k < 4000 && !A; k++) {
        const a = rnd(), b = [a[0] + (Math.random() * 2 - 1) * 6, a[1] + (Math.random() * 2 - 1) * 6];
        if (!map.circleFree(b[0], b[1], 0.45) || map.los(a[0], a[1], b[0], b[1]) || dist(a[0], a[1], b[0], b[1]) < 3.5) continue;
        const path = map.findPath(b[0], b[1], a[0], a[1], 6000);
        const L = path && plen(b[0], b[1], path);
        if (L && L > dist(a[0], a[1], b[0], b[1]) * 2.2 && L < 26) { A = a; B = b; out.wall = { crow: +dist(a[0], a[1], b[0], b[1]).toFixed(1), walk: +L.toFixed(1) }; }
      }
      if (A) {
        p.x = A[0]; p.y = A[1]; summon(B[0], B[1]);
        const s = run(30 * 12);
        const near = pets.filter((c) => dist(c.x, c.y, p.x, p.y) < 4.5).length;
        Object.assign(out.wall, { near: near + '/' + pets.length, blinks: s.blinks });
      }

      // 2. long walks
      out.walk = { legs: 0, blinks: 0, behind: 0, maxBehind: 0 };
      let start = rnd();
      p.x = start[0]; p.y = start[1]; summon(p.x, p.y);
      run(30);
      for (let leg = 0; leg < 4; leg++) {
        let goal = null;
        for (let k = 0; k < 400 && !goal; k++) {
          const g = rnd(), path = map.findPath(p.x, p.y, g[0], g[1], 8000);
          if (path && plen(p.x, p.y, path) > 20 && plen(p.x, p.y, path) < 45) goal = g;
        }
        if (!goal) continue;
        out.walk.legs++;
        p.setMoveTarget(goal[0], goal[1]);
        const s = run(30 * 25, () => (p.moveTarget ? undefined : false));
        p.moveTarget = null;
        const s2 = run(30 * 4);
        out.walk.blinks += s.blinks + s2.blinks;
        const far = pets.filter((c) => dist(c.x, c.y, p.x, p.y) > 5);
        out.walk.behind += far.length;
        out.walk.maxBehind = Math.max(out.walk.maxBehind, ...pets.map((c) => +dist(c.x, c.y, p.x, p.y).toFixed(1)));
      }
      game.render();

      // 3. foes round a corner, 5-9 tiles' walk from the idle hero
      let F = null;
      for (let k = 0; k < 4000 && !F; k++) {
        const a = rnd(), b = [a[0] + (Math.random() * 2 - 1) * 7, a[1] + (Math.random() * 2 - 1) * 7];
        if (!map.circleFree(b[0], b[1], 0.45)) continue;
        const path = map.findPath(a[0], a[1], b[0], b[1], 4000);
        const L = path && plen(a[0], a[1], path);
        if (L && L > 5 && L < 9 && !map.los(a[0], a[1], b[0], b[1])) F = [a, b];
      }
      if (!F) for (let k = 0; k < 4000 && !F; k++) {
        const a = rnd(), b = [a[0] + (Math.random() * 2 - 1) * 7, a[1] + (Math.random() * 2 - 1) * 7];
        if (map.circleFree(b[0], b[1], 0.45) && dist(a[0], a[1], b[0], b[1]) > 5) { const path = map.findPath(a[0], a[1], b[0], b[1], 4000); if (path && plen(a[0], a[1], path) < 9) F = [a, b]; }
      }
      if (F) {
        p.x = F[0][0]; p.y = F[0][1]; summon(p.x, p.y);
        const foes = [];
        for (let k = 0; k < 4; k++) {
          const [x, y] = map.randomNear(F[1][0], F[1][1], 0.8);
          const m = makeMonster(w, 'skeleton', w.biome, 5, 'normal', x, y);
          m.maxHp = m.hp = 600; m.speed = 0; m.dmg = 0.01; m.awake = false; m.aggroRange = 0;
          foes.push(w.add(m));
        }
        let firstHit = -1;
        const s = run(30 * 15, (i) => {
          if (firstHit < 0 && foes.some((m) => m.hp < m.maxHp)) firstHit = +(i / 30).toFixed(1);
          return foes.every((m) => m.dead) ? false : undefined;
        });
        out.fight = { walk: +plen(F[0][0], F[0][1], map.findPath(F[0][0], F[0][1], F[1][0], F[1][1], 4000)).toFixed(1), los: map.los(F[0][0], F[0][1], F[1][0], F[1][1]), firstHit, killed: foes.filter((m) => m.dead).length + '/4', secs: +(s.steps / 30).toFixed(1) };
      }

      // 4. a foe 25+ tiles' walk away is left alone
      clear();
      let far = null;
      for (let k = 0; k < 6000 && !far; k++) {
        const a = rnd(), b = [a[0] + (Math.random() * 2 - 1) * 9, a[1] + (Math.random() * 2 - 1) * 9];
        if (!map.circleFree(b[0], b[1], 0.45) || dist(a[0], a[1], b[0], b[1]) < 5 || dist(a[0], a[1], b[0], b[1]) > 9) continue;
        const path = map.findPath(a[0], a[1], b[0], b[1], 8000);
        if (!path || plen(a[0], a[1], path) > 25) { far = b; p.x = a[0]; p.y = a[1]; }
      }
      if (far) {
        const m = w.add(makeMonster(w, 'skeleton', w.biome, 5, 'normal', far[0], far[1]));
        m.maxHp = m.hp = 600; m.speed = 0; m.dmg = 0.01; m.aggroRange = 0;
        summon(p.x, p.y);
        run(30 * 8);
        out.leash = { crow: +dist(p.x, p.y, m.x, m.y).toFixed(1), flow: map.flowAt(m.x, m.y), los: map.los(p.x, p.y, m.x, m.y), by: m.aggro && m.aggro.summonKey, hurt: m.hp < m.maxHp, petsNearFoe: pets.filter((c) => dist(c.x, c.y, m.x, m.y) < 3).length };
        m.dead = true;
      }

      // 5. potter: idle hero, nothing about
      clear();
      const o = rnd(); p.x = o[0]; p.y = o[1]; summon(p.x, p.y);
      run(30 * 2);
      const pos = new Map(pets.map((c) => [c, [c.x, c.y, 0]]));
      let maxD = 0;
      run(30 * 12, () => {
        for (const c of pets) {
          const q = pos.get(c);
          q[2] += dist(q[0], q[1], c.x, c.y); q[0] = c.x; q[1] = c.y;
          maxD = Math.max(maxD, dist(c.x, c.y, p.x, p.y));
        }
      });
      const moved = pets.filter((c) => pos.get(c)[2] > 1.5).length;
      out.potter = { moved: moved + '/' + pets.length, maxFromHero: +maxD.toFixed(1) };
      return out;
    }, seed);
    console.log(JSON.stringify(r));
    if (seed === 0) {
      await page.evaluate(() => window.VELSCOUR.game.render());
      await shot('pets_potter');
    }
    const n = 12;
    if (r.wall && +r.wall.near.split('/')[0] < n - 1) fails.push(`seed ${seed}: only ${r.wall.near} pets got round the wall`);
    if (r.walk.legs && r.walk.behind > r.walk.legs) fails.push(`seed ${seed}: ${r.walk.behind} pets left behind over ${r.walk.legs} walks`);
    if (r.walk.blinks > r.walk.legs * 3) fails.push(`seed ${seed}: ${r.walk.blinks} blinks over ${r.walk.legs} walks`);
    if (r.fight && r.fight.killed !== '4/4') fails.push(`seed ${seed}: pets killed ${r.fight.killed} foes round the corner`);
    if (r.leash && r.leash.hurt) fails.push(`seed ${seed}: pets chased a far-off foe`);
    if (+r.potter.moved.split('/')[0] < n / 2) fails.push(`seed ${seed}: only ${r.potter.moved} pets pottered about`);
    if (r.potter.maxFromHero > 6) fails.push(`seed ${seed}: a pet wandered ${r.potter.maxFromHero} tiles off`);
  }
  // a shot mid-walk
  await page.evaluate(() => {
    const { G, game } = window.VELSCOUR;
    const p = G.player, map = G.world.map;
    for (let k = 0; k < 200; k++) { const [x, y] = map.randomNear(p.x, p.y, 10); if (Math.hypot(x - p.x, y - p.y) > 6) { p.setMoveTarget(x, y); break; } }
    for (let i = 0; i < 45; i++) G.world.update(1 / 30);
    game.render();
  });
  await shot('pets_walk');
  console.log(fails.length ? fails.map((f) => 'FAIL ' + f).join('\n') : 'PASS');
  if (fails.length) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
