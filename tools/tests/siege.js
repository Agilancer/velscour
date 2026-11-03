// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md): reached through Velscour's skull ("siege"). 30 seeds: 64 x 64, the
// courtyard, the ballistae's feet, the standard, the exit and the outside of every gate reachable, spawn points in the
// field; the wall-walk (walk, gate flanks, towers) reached from the courtyard and only by its stairs, never from the
// field (nor the field from it). In play: the gates hold the dead on their lines while the hero is
// inside (and let them by when he is out), battering breaks a gate, the winch mends it, a loaded ballista looses and
// hits; the hero on the walk climbs its stairs (A*), the dead below go round by a gate, are seen, shot and never strike
// up; picking lands on the raised tiles. Screenshots: the courtyard, each gate, the stairs, walk and towers, a
// battered gate, a ballista, the field, an overview, the phone layout.
// Then auto-play holds every wave and the exit opens.
//   node tools/tests/siege.js [shots|noshots] [auto|noauto] [depth]      (start the server first: python3 -m http.server 8123)
//   node tools/tests/siege.js noshots auto 150 ; node tools/tests/siege.js noshots auto 320   # the deep sieges (7 waves)
//   SIEGE_CLASS=wizard SIEGE_MORTAL=1 node tools/tests/siege.js noshots auto 150             # another class, mortal
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const DEPTH = +(process.argv[4] || 8);
const CLS = process.env.SIEGE_CLASS || 'paladin';     // the auto-play hero's class
const MORTAL = !!process.env.SIEGE_MORTAL;            // auto-play without god mode: the hero can die (a death leaves the siege)

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ reached through the skull
    await page.evaluate(async (d) => { await window.VELSCOUR.game.newChar('paladin', 'Warden'); window.VELSCOUR.G.char.depth = d; }, DEPTH);
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'siege');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'endless_siege' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const w = G.world, m = w.map, sc = w.overworldScenario, bad = [];
      if (m.w !== 64 || m.h !== 64) bad.push(`map is ${m.w} x ${m.h}`);
      if (!m.hgt || !m.faceArt) bad.push('no height map / wall faces');
      if (!sc || sc.id !== 'endless_siege') bad.push('no siege run: ' + (sc && sc.id));
      const { castleRamparts } = await import('/src/gfx/castle.js');
      if (!castleRamparts()) bad.push('the Castle masonry was released after the build');
      if (w.creatures.filter((c) => c.team === 'enemy' && !c.dead).length > 6) bad.push('monsters before the first wave');
      return { bad, title: sc?.title, waves: sc?.total, props: w.props.length, chests: w.chests.length, buildings: w.buildings.length, hud: !!document.getElementById('siege-objective') };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ 30 seeds
    const gen = await page.evaluate(async () => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateSiege, GATES, BALLISTAE, KEEP, LINE, LV, STAIRS, stairTiles } = await import('/src/world/siege.js');
      const biome = BIOME_BY_ID.endless_siege, bad = [];
      let ms = 0, props = 0, spawns = 0, wallWalk = null;
      for (let n = 1; n <= 30; n++) {
        const seed = n * 7717 + 3, t0 = performance.now();
        let g;
        try { g = generateSiege(8 + n * 10, biome, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w, I = (x, y) => y * W + x, at = (p) => I(Math.floor(p[0]), Math.floor(p[1]));
        const seen = new Uint8Array(W * m.h), q = [at(g.start)]; seen[q[0]] = 1;
        for (let h = 0; h < q.length; h++) {
          const i = q[h], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (m.walkableTile(x + dx, y + dy) && !seen[j] && m.stepOk(i, j)) { seen[j] = 1; q.push(j); } }
        }
        const must = [['exit', KEEP.exit], ['standard', [KEEP.banner[0], KEEP.banner[1] + 1.3]], ...BALLISTAE.map((b) => ['ballista ' + b.id, b.foot]),
          ...GATES.map((G0) => ['outside ' + G0.id, G0.axis === 'x' ? [G0.a0 + 1.5, LINE + 2] : [LINE + 2, G0.a0 + 1.5]]),
          ...GATES.map((G0) => ['passage ' + G0.id, G0.axis === 'x' ? [G0.a0 + 1.5, 33.5] : [33.5, G0.a0 + 1.5]]), ...g.spawnPts.map((p, k) => ['spawn ' + k, p]), ...g.chests.map((c, k) => ['chest ' + k, [c.x, c.y]])];
        for (const [name, p] of must) if (!seen[at(p)]) bad.push(`seed ${seed}: ${name} unreachable`);
        // the wall-walk: every open top (walk, flanks, towers) reached from the courtyard, and only by the stairs
        const flood = (from, cut) => {
          const sn = new Uint8Array(W * m.h), q2 = [from]; sn[from] = 1;
          for (let h = 0; h < q2.length; h++) {
            const i = q2[h], x = i % W, y = (i / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (m.walkableTile(x + dx, y + dy) && !sn[j] && !cut(j) && m.stepOk(i, j)) { sn[j] = 1; q2.push(j); } }
          }
          return sn;
        };
        const stair = new Set(STAIRS.flatMap((st) => stairTiles(st).map(([x, y]) => I(x, y))));
        const passage = (j) => { const x = j % W, y = (j / W) | 0; return GATES.some((G0) => (G0.axis === 'x' ? x >= G0.a0 && x < G0.a0 + 3 && y >= 33 && y <= 35 : y >= G0.a0 && y < G0.a0 + 3 && x >= 33 && x <= 35)); };
        let tops = 0, lost = 0;
        for (let i = 0; i < W * m.h; i++) if (m.hgt[i] >= LV.wall && m.hgt[i] < LV.cliff && m.walkableTile(i % W, (i / W) | 0)) { tops++; if (!seen[i]) lost++; }
        if (tops < 150) bad.push(`seed ${seed}: only ${tops} wall-walk tiles`);
        if (lost) bad.push(`seed ${seed}: ${lost} wall-walk tiles unreachable from the courtyard`);
        const noStairs = flood(at(g.start), (j) => stair.has(j));
        let sneak = 0; for (let i = 0; i < W * m.h; i++) if (noStairs[i] && m.hgt[i] >= LV.wall) sneak++;
        if (sneak) bad.push(`seed ${seed}: ${sneak} wall tops reached without the stairs`);
        // the field: with the gate passages shut, nothing out there reaches the walls or the courtyard (no climbing up)
        // and nothing inside reaches the field (no dropping off the walls)
        const out = flood(at(g.spawnPts[0]), passage), inn = flood(at(g.start), passage);
        let up = 0, off = 0;
        for (let i = 0; i < W * m.h; i++) { const x = i % W, y = (i / W) | 0; if (out[i] && (m.hgt[i] > 0 || (x < LINE && y < LINE))) up++; if (inn[i] && (x >= LINE || y >= LINE)) off++; }
        if (up) bad.push(`seed ${seed}: ${up} wall/courtyard tiles reached from the field without a gate`);
        if (off) bad.push(`seed ${seed}: ${off} field tiles reached from inside without a gate`);
        if (n === 1) wallWalk = { tops, stairs: stair.size };
        if (m.hgt[I(15, 33)] < LV.wall) bad.push(`seed ${seed}: the wall is ${m.hgt[I(15, 33)]} levels`);
        if (g.spawnPts.length < 8) bad.push(`seed ${seed}: ${g.spawnPts.length} spawn points`);
        if (!g.boss) bad.push(`seed ${seed}: no boss look`);
        props += g.props.length; spawns += g.spawnPts.length;
      }
      return { bad, maxMs: Math.round(ms), props: Math.round(props / 30), spawnPts: Math.round(spawns / 30), wallWalk };
    });
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    // ------------------------------------------------ the rules in play
    const rules = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const w = G.world, sc = w.overworldScenario, p = G.player, bad = [], out = {};
      G.godMode = true;
      const step = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
      const g = sc.gates[1], lm = w.creatures.find((c) => c.team === 'enemy' && !c.dead);
      // start the first wave, then put one of the dead in the Great Gate's passage while the hero is inside
      sc.standard.use();
      if (sc.phase !== 'wave') bad.push('the standard did not start the wave');
      step(90);
      const m = [...sc.live].find((q) => !q.dead);
      if (!m) { bad.push('no monster spawned in 3 s'); return { bad }; }
      out.spawned = sc.live.size;
      p.x = 18.5; p.y = 26.5; m.x = g.a0 + 1.5; m.y = 34.2; m.nav = null;
      step(2);
      if (m.y < 35.3) bad.push(`held: monster at y ${m.y.toFixed(2)} inside the line`);
      // battering: the gate loses hp while the dead stand on its line
      const hp0 = g.hp;
      for (let i = 0; i < 300 && !g.broken; i++) { m.x = g.a0 + 1.5; m.y = 35.42; m.hp = m.maxHp; step(1); }
      out.battered = Math.round(hp0 - g.hp);
      if (!(g.hp < hp0)) bad.push('the gate took no damage');
      // the hero outside: the gate lets the dead by
      g.hp = g.max; g.broken = false;
      p.x = g.a0 + 1.5; p.y = 38.5; m.x = g.a0 + 1.5; m.y = 34.2;
      step(1);
      if (m.y > 35) bad.push('the gate held a monster while the hero was outside');
      // break it: the winch mends it (between waves: all of it)
      g.hp = 0; g.broken = true;
      const was = sc.phase; sc.phase = 'lull';
      sc.winches[1].use();
      if (g.broken || g.hp < g.max) bad.push('the winch did not mend the gate');
      sc.phase = was;
      // a ballista with bolts looses at the dead in range
      const b = sc.ballistae[1];
      b.ammo = 0; b.use();
      if (b.ammo !== b.max) bad.push('loading did not fill the ballista');
      sc.queue.length = 0; for (const q of sc.live) if (q !== m) { q.dead = true; q.noLoot = true; }
      p.x = 18.5; p.y = 24.5; m.x = 30.5; m.y = 38.5; m.hp = m.maxHp; const hpm = m.hp;
      for (let i = 0; i < 90 && b.ammo === b.max; i++) step(1);
      step(30);
      out.ballista = { ammo: b.ammo, dmg: Math.round(hpm - m.hp), dead: m.dead };
      if (b.ammo === b.max) bad.push('the ballista never loosed');
      if (!(m.hp < hpm) && !m.dead) bad.push('the bolt did not hit');
      out.resolve = sc.resolve;
      return { bad, ...out };
    });
    console.log('rules', JSON.stringify(rules));
    for (const b of rules.bad) errors.push('[rules] ' + b);

    // ------------------------------------------------ the wall-walk in play
    const walk = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { makeMonster } = await import('/src/game/monster.js');
      const { Projectile } = await import('/src/game/hazards.js');
      const { camera } = await import('/src/core/view.js');
      const { STAIRS, LV } = await import('/src/world/siege.js');
      const w = G.world, m = w.map, sc = w.overworldScenario, p = G.player, bad = [], out = {}, W = m.w;
      const step = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
      const lv = (x, y) => m.hgt[m.tileIdx(x, y)];
      G.godMode = true;
      for (const q of sc.live) { q.dead = true; q.noLoot = true; }
      sc.queue.length = 0; step(2);
      // the hero walks up the flight between the West and Great Gates onto the walk (auto-play's own path finder)
      const st = STAIRS[2]; p.x = st.x + 1.5; p.y = st.y + 1; p.path = null;
      const path = m.findPath(p.x, p.y, 15.5, 33.5, 20000);
      if (!path) bad.push('A* found no way up the stairs onto the walk');
      else {
        let ill = 0, x = p.x, y = p.y;
        for (const [tx, ty] of path) { if (!m.losWide(x, y, tx, ty, 0.28)) ill++; x = tx; y = ty; }
        if (ill) bad.push(`${ill} A* legs onto the walk cross a wall`);
        out.pathLegs = path.length;
      }
      for (const [tx, ty] of path || []) for (let i = 0; i < 60 && Math.hypot(tx - p.x, ty - p.y) > 0.05; i++) {   // walked leg by leg with the body's own collision
        const d = Math.hypot(tx - p.x, ty - p.y), k = Math.min(1, 0.12 / d); m.move(p, (tx - p.x) * k, (ty - p.y) * k);
      }
      out.climbed = lv(p.x, p.y);
      if (lv(p.x, p.y) < LV.wall) bad.push(`the hero did not climb the stairs (at ${p.x.toFixed(1)},${p.y.toFixed(1)} level ${lv(p.x, p.y)})`);
      p.moveVec = [0, 0];
      // the flow field leads the dead in the field to him through a gate, never up the wall
      m.flowFrom = [-1, -1]; m.buildFlow(15.5, 33.5, 200);
      out.flowFromField = m.flowAt(15.5, 40.5);
      if (m.flowAt(15.5, 40.5) < 0) bad.push('the flow field from the walk never reaches the field (through a gate)');
      if (m.flowAt(15.5, 35.5) >= 0 && m.flowAt(15.5, 35.5) < 6) bad.push('the flow field climbs the wall from its foot');
      // on the walk over the Great Gate: one of the dead held at its line can be seen, shot and is never struck at
      p.x = 19.5; p.y = 33.5; step(1);
      const g = sc.gates[1];
      const foe = makeMonster(w, 'skeleton', w.biome, 10, 'normal', g.a0 + 1.5, 36.5);
      w.add(foe); foe.awake = true; foe.hunter = true; sc.live.add(foe);
      step(45);
      out.held = +foe.y.toFixed(2);
      if (foe.y < 35.3) bad.push(`the dead got past the gate under the hero on the walk (y ${foe.y.toFixed(2)})`);
      if (!m.los(p.x, p.y, foe.x, foe.y)) bad.push('no line of sight from the walk down to the gate');
      if (foe.atkRange(p) > 0) bad.push('a monster at the gate can strike the hero on the walk');
      const hp0 = foe.hp;
      let struck = 0;
      for (let k = 0; k < 6 && !struck; k++) {   // (a shot may be blocked or dodged, and a deep monster heals a scratch)
        const pr = new Projectile({ world: w, src: p, x: p.x, y: p.y, ang: Math.atan2(foe.y - p.y, foe.x - p.x), speed: 12, range: 6, fx: 'arrow', el: 'phys', dmg: [foe.maxHp * 0.3, foe.maxHp * 0.3] });
        w.addHazard(pr);
        for (let i = 0; i < 20; i++) { step(1); if (pr.hitSet.size || foe.hp < hp0 - 1 || foe.dead) { struck = k + 1; break; } }
      }
      out.shotDown = struck;
      if (!struck) bad.push('a shot from the walk did not reach the dead at the gate');
      // at the foot of the wall below him: it can't climb up and can't reach him
      const foot = makeMonster(w, 'zombie', w.biome, 10, 'normal', 15.5, 35.6);
      w.add(foot); foot.awake = true; foot.hunter = true; sc.live.add(foot);
      p.x = 15.5; p.y = 33.5; let top = 0;
      for (let i = 0; i < 120; i++) { step(1); top = Math.max(top, lv(foot.x, foot.y)); }
      if (top > 0 && !(foot.x < 35 && foot.y < 35)) bad.push(`a monster climbed onto level ${top} outside`);
      if (foot.y < 35 && lv(foot.x, foot.y) > 0) bad.push('a monster climbed the curtain');
      out.footAt = [+foot.x.toFixed(1), +foot.y.toFixed(1)];
      // picking: the screen point of a lifted walk/tower tile maps back to that tile
      let miss = 0, tried = 0;
      for (const [tx, ty] of [[15, 33], [26, 33], [33, 25], [33, 9], [2, 20], [3, 2], [20, 3], [32, 32], [3, 32], [19, 33]]) {
        if (!m.walkableTile(tx, ty)) continue;
        tried++; p.x = tx + 0.5; p.y = ty + 0.5; camera.follow(p.x, p.y, 0, true);
        const [sx, sy] = camera.tileToScreen(tx + 0.5, ty + 0.5), [px, py] = camera.screenToTile(sx, sy);
        if (Math.floor(px) !== tx || Math.floor(py) !== ty) miss++;
      }
      out.picks = `${tried - miss}/${tried}`;
      if (miss) bad.push(`${miss}/${tried} picks on the walls land on the wrong tile`);
      for (const q of [foe, foot]) { q.dead = true; q.noLoot = true; }
      p.x = 18.5; p.y = 24.5; step(2);
      return { bad, ...out };
    });
    console.log('wall-walk', JSON.stringify(walk));
    for (const b of walk.bad) errors.push('[wall-walk] ' + b);

    // ------------------------------------------------ screenshots
    if (SHOTS) {
      await page.evaluate(() => window.VELSCOUR.game.teleportToBiome(window.VELSCOUR.G.world.biome));
      await page.waitForFunction(() => document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
      const at = async (name, src, zoom = 1, setup = '') => {
        await page.evaluate(async ([src, zoom, setup]) => {
          const { G, game } = window.VELSCOUR;
          const { camera } = await import('/src/core/view.js');
          const w = G.world, m = w.map, p = G.player, sc = w.overworldScenario;
          G.godMode = true;
          if (setup) new Function('G', 'w', 'm', 'p', 'sc', setup)(G, w, m, p, sc);
          const [x, y] = new Function('G', 'w', 'm', 'p', 'sc', src)(G, w, m, p, sc);
          p.x = x; p.y = y; p.moveVec = [0, 0]; p.path = null;
          G.settings.zoom = zoom; camera.computeZoom();
          m.reveal(x, y, 30);
          for (let i = 0; i < 12; i++) { G.time += 1 / 30; game.update(1 / 30); }
          camera.follow(p.x, p.y, 0, true);
          game.render();
        }, [src, zoom, setup]);
        await page.waitForTimeout(150);
        await shot('siege_' + name);
      };
      await at('courtyard', 'return [18.5, 22.5];');
      await at('great_gate_out', 'return [21.5, 39.5];');
      await at('east_gate_out', 'return [39.5, 16.5];');
      await at('ballista', 'const b = sc.ballistae[1]; return [b.foot[0], b.foot[1]];', 1.4);
      await at('field', 'return [46.5, 46.5];', 0.8);
      await at('overview', 'return [30, 30];', 0.42);
      // the wall-walk: a flight between the gates, a tower top with its ballista, the north walk and its stair
      await at('wall_stairs', 'return [15.5, 33.5];', 1.3);
      await at('wall_tower', 'return [32.5, 31.5];', 1.2);
      await at('wall_north', 'return [18.5, 3.5];', 1.1);
      // a wave at the Great Gate: battered, the dead held on its line, the hero behind it, a ballista loosing
      await at('battle', 'return [21.5, 33.6];', 1.1, `
        sc.standard.use(); const g = sc.gates[1]; g.hp = 45;
        for (const b of sc.ballistae) b.ammo = 4;
        for (let i = 0; i < 300 && sc.live.size < 8; i++) { G.time += 1/30; window.VELSCOUR.game.update(1/30); }
        let k = 0; for (const q of sc.live) { if (q.dead) continue; q.x = g.a0 + 0.4 + (k % 4) * 0.7; q.y = 35.5 + Math.floor(k / 4) * 0.9; q.nav = null; k++; }`);
      await at('breach', 'return [17.5, 29.5];', 1, 'const g = sc.gates[0]; g.hp = 0; g.broken = true;');
      // the walk over the Great Gate in a wave: the dead held under it
      await at('wall_walk', 'return [19.5, 33.5];', 1.1, `
        const g = sc.gates[1]; for (let i = 0; i < 300 && sc.live.size < 8; i++) { G.time += 1/30; window.VELSCOUR.game.update(1/30); }
        let k = 0; for (const q of sc.live) { if (q.dead) continue; q.x = g.a0 + 0.4 + (k % 4) * 0.7; q.y = 35.5 + Math.floor(k / 4) * 0.9; q.nav = null; k++; }`);
    }

    // ------------------------------------------------ auto-play holds the walls
    if (AUTO) {
      const res = await page.evaluate(async ([d, cls, mortal]) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // a hero the way one looks arriving at this depth (tools/tests/balance.js): its level, points spent, the best of
        // 200 drops of the last few item levels with +upgrades and gems, skill mastery
        const { depthLevel } = await import('/src/data/depth.js');
        const { rollItem, rollGem } = await import('/src/data/items.js');
        if (cls !== G.char.classId) await game.newChar(cls, 'Warden');
        const c = G.char, p = G.player, L = depthLevel(d);
        c.level = L + 1; c.statPoints += L * 5; c.skillPoints += L + d;
        c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        for (let r = 0; r < 8; r++) {
          c.bag = c.bag.map(() => null);
          for (let i = 0; i < 25 && i < c.bag.length; i++) { const it = rollItem(L - Math.floor(Math.random() * 7), { mf: 60, bonus: Math.random() < 0.12 ? 1.2 : 0.15 }); it.unid = false; c.bag[i] = it; }
          p.recompute(); Auto.optimizeGear();
        }
        c.bag = c.bag.map(() => null);
        for (const it of Object.values(c.equip)) if (it && it.type === 'gear') {
          it.upg = Math.min(6, 2 + Math.floor(L / 40)); it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 2));
          while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); }
        }
        const M = Math.min(1000, Math.round(20 + d * 1.6));
        c.bar.filter(Boolean).forEach((id, i) => { c.mastery[id] = [Math.max(1, Math.round(M * (i < 2 ? 1 : 0.55))), 0]; });
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp; p.mana = p.maxMana;
        G.godMode = !mortal; c.depth = d; c.deaths = 0;
        await game.teleportToBiome(BIOME_BY_ID.endless_siege);
        Auto.toggle(true);
        const t0 = performance.now(), w = G.world, sc = w.overworldScenario, log = [], fellIn = [];
        let sim = 0, lastWave = -1, lastPhase = '';
        let falls = 0, onWall = 0, wallKills = 0, kills0 = 0;
        while (sim < 2400 && !sc.completed && performance.now() - t0 < 420000 && G.world === w) {
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          if (sc.phase === 'lull' && Math.round(sim) % 10 === 0) log.push(`  ${Math.round(sim)}s ${Auto.status} @${G.player.x.toFixed(1)},${G.player.y.toFixed(1)} ${JSON.stringify(sc.objective && [sc.objective.x, sc.objective.y].map((v) => +v.toFixed(1)))}`);
          if (sc.falls > falls) { falls = sc.falls; fellIn.push(sc.wave + 1); }
          const onTop = G.world.map.hgt[G.world.map.tileIdx(G.player.x, G.player.y)] >= 14;
          if (onTop) { if (onWall % 5 === 0) log.push(`  ${Math.round(sim)}s on the walls @${G.player.x.toFixed(1)},${G.player.y.toFixed(1)}: ${Auto.status}`); onWall++; wallKills += sc.kills - kills0; }
          kills0 = sc.kills;
          if (sc.wave !== lastWave || sc.phase !== lastPhase) { log.push(`${Math.round(sim)}s ${sc.phase} w${sc.wave} r${Math.round(sc.resolve)} [${sc.ballistae.map((b) => b.ammo).join(',')}] [${sc.gates.map((g) => (g.broken ? 'X' : Math.round(g.hp))).join(',')}]`); lastWave = sc.wave; lastPhase = sc.phase; }
          await new Promise((r) => setTimeout(r, 0));
        }
        const exit = w.portals.find((q) => q.type === 'exit');
        Auto.toggle(false);
        return { cls: G.char.classId, lvl: G.char.level, secs: Math.round(sim), completed: sc.completed, waves: `${sc.wave}/${sc.total}`, falls: sc.falls, fellIn, deaths: G.char.deaths,
          onWallSecs: onWall, wallKills, kills: sc.kills, status: Auto.status, exit: exit?.active, log, same: G.world === w };
      }, [DEPTH, CLS, MORTAL]);
      console.log('auto-play', JSON.stringify(res));
      if (!res.completed) errors.push(`[auto] did not break the siege in ${res.secs}s (${res.waves}, ${res.status})`);
      if (res.completed && !res.exit) errors.push('[auto] the exit did not open');
      if (res.falls > Math.ceil(res.waves.split('/')[1] / 2)) errors.push(`[auto] the keep fell ${res.falls} times (waves ${res.fellIn.join(', ')})`);
      if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot('siege_auto_end'); }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.endless_siege);
        const p = G.player; p.x = 20.5; p.y = 29.5;
        for (let i = 0; i < 20; i++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(300);
      await m.shot('siege_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
