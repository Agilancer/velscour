// THE ENDLESS SIEGE (docs/ENDLESS_SIEGE.md), all five variants (world/siege.js SIEGE_VARIANTS). Reached through
// Velscour's skull ("siege 2" picks the second). Per variant, 8 seeds: 64 x 64, the courtyard, the ballistae's feet,
// the standard, the exit and the outside of every gate reachable, spawn points in the field; the wall-walk (walk, gate
// flanks, towers) reached from the courtyard and only by its stairs, never from the field (nor the field from it).
// In play, per variant: every gate holds the dead on its line while the hero is inside (and lets them by when he is
// out), battering breaks a gate, the winch mends it, a loaded ballista looses and hits; the hero climbs a flight
// (A*), stands on the walk over a gate, sees and shoots the dead held below, who never strike up; the dead at the
// wall's foot go round by a gate; picking lands on the raised tiles; the variant's twist works (ice slows, the
// blizzard; the fire-pots; the rockfalls; the mire spawns and the plague). Screenshots per variant: an overview, the
// courtyard, a gate in a wave from the walk, a flight of stairs, the twist; the phone layout. Then auto-play holds
// every wave of every variant and the exit opens.
//   node tools/tests/siege.js [shots|noshots] [auto|noauto] [depth] [variants|all]   (start the server first)
//   node tools/tests/siege.js noshots auto 150 ; node tools/tests/siege.js noshots auto 320   # the deep sieges (7 waves)
//   node tools/tests/siege.js shots auto 8 frost,pass                                        # some variants only
//   SIEGE_CLASS=wizard SIEGE_MORTAL=1 node tools/tests/siege.js noshots auto 150             # another class, mortal
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const DEPTH = +(process.argv[4] || 8);
const VARIANTS = (process.argv[5] && process.argv[5] !== 'all') ? process.argv[5].split(',') : ['keep', 'frost', 'river', 'pass', 'mire'];
const CLS = process.env.SIEGE_CLASS || 'paladin';     // the auto-play hero's class
const MORTAL = !!process.env.SIEGE_MORTAL;            // auto-play without god mode: the hero can die (a death leaves the siege)

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  // into a variant of the siege (G.regionWant: game/regions.js), the loading screen gone
  const enter = async (id) => {
    await page.evaluate(async (id) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      (G.regionWant ||= {}).endless_siege = id;
      await game.teleportToBiome(BIOME_BY_ID.endless_siege);
    }, id);
    await page.waitForFunction(() => document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
  };
  try {
    // ------------------------------------------------ reached through the skull: 'siege 2' is the frozen fort
    await page.evaluate(async (d) => { const { G, game } = window.VELSCOUR; await game.newChar('paladin', 'Warden'); G.char.depth = d; G.char.level = 40; G.player.recompute(); }, DEPTH);   // (no level-up banners over the shots)
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'siege 2');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'endless_siege' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const w = G.world, m = w.map, sc = w.overworldScenario, bad = [];
      if (m.w !== 64 || m.h !== 64) bad.push(`map is ${m.w} x ${m.h}`);
      if (!m.hgt || !m.faceArt) bad.push('no height map / wall faces');
      if (!sc || sc.id !== 'endless_siege') bad.push('no siege run: ' + (sc && sc.id));
      if (sc?.variant !== 'frost') bad.push(`'siege 2' built ${sc?.variant}, not the frozen fort`);
      const { castleRamparts } = await import('/src/gfx/castle.js');
      if (!castleRamparts()) bad.push('the Castle masonry was released after the build');
      if (w.creatures.filter((c) => c.team === 'enemy' && !c.dead).length > 6) bad.push('monsters before the first wave');
      const { REGIONS } = await import('/src/game/regions.js');
      if ((REGIONS.endless_siege.variants || []).length !== 5) bad.push('the region does not list five variants');
      return { bad, variant: sc?.variant, title: sc?.title, waves: sc?.total, hud: !!document.getElementById('siege-objective') };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ 8 seeds of every variant
    const gen = await page.evaluate(async (ids) => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateSiege, LV, stairTiles } = await import('/src/world/siege.js');
      const biome = BIOME_BY_ID.endless_siege, bad = [], out = {};
      for (const id of ids) {
        let ms = 0, props = 0, spawns = 0, info = null;
        for (let n = 1; n <= 8; n++) {
          const seed = n * 7717 + 3, t0 = performance.now(), tag = `${id} seed ${seed}`;
          let g;
          try { g = generateSiege(8 + n * 40, biome, seed, id); } catch (e) { bad.push(`${tag}: ${e.message}`); continue; }
          ms = Math.max(ms, performance.now() - t0);
          const m = g.map, L = g.lay, W = m.w, I = (x, y) => y * W + x, at = (p) => I(Math.floor(p[0]), Math.floor(p[1]));
          const flood = (from, cut = () => false) => {
            const sn = new Uint8Array(W * m.h), q2 = [from]; sn[from] = 1;
            for (let h = 0; h < q2.length; h++) {
              const i = q2[h], x = i % W, y = (i / W) | 0;
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (m.walkableTile(x + dx, y + dy) && !sn[j] && !cut(j) && m.stepOk(i, j)) { sn[j] = 1; q2.push(j); } }
            }
            return sn;
          };
          const seen = flood(at(g.start));
          const must = [['exit', L.keep.exit], ['standard', [L.keep.banner[0], L.keep.banner[1] + 1.3]], ...L.ballistae.map((b) => ['ballista ' + b.id, b.foot]),
            ...L.gates.map((G0) => ['outside ' + G0.id, L.gateOut(G0, 2)]), ...L.gates.map((G0) => ['passage ' + G0.id, L.gateOut(G0, -1.5)]),
            ...L.gates.map((G0) => ['post ' + G0.id, G0.axis === 'x' ? [G0.a0 - 0.5, G0.inner + 0.5] : [G0.inner + 0.5, G0.a0 - 0.5]]),
            ...g.spawnPts.map((p, k) => ['spawn ' + k, p]), ...g.chests.map((c, k) => ['chest ' + k, [c.x, c.y]])];
          for (const [name, p] of must) if (!seen[at(p)]) bad.push(`${tag}: ${name} unreachable`);
          // the wall-walk: every open top (walk, flanks, towers) reached from the courtyard, and only by the stairs
          const stair = new Set(L.stairs.flatMap((st) => stairTiles(st).map(([x, y]) => I(x, y))));
          const passage = (j) => { const x = j % W, y = (j / W) | 0; return L.gates.some((G0) => (G0.axis === 'x' ? x >= G0.a0 && x < G0.a0 + 3 && y >= G0.inner && y <= G0.line : y >= G0.a0 && y < G0.a0 + 3 && x >= G0.inner && x <= G0.line)); };
          let tops = 0, lost = 0;
          for (let i = 0; i < W * m.h; i++) if (m.siegeDeck[i]) { tops++; if (!seen[i]) lost++; }
          if (tops < 100) bad.push(`${tag}: only ${tops} wall-walk tiles`);
          if (lost) bad.push(`${tag}: ${lost} wall-walk tiles unreachable from the courtyard`);
          const noStairs = flood(at(g.start), (j) => stair.has(j));
          let sneak = 0; for (let i = 0; i < W * m.h; i++) if (noStairs[i] && m.hgt[i] >= LV.wall) sneak++;
          if (sneak) bad.push(`${tag}: ${sneak} wall tops reached without the stairs`);
          // the field: with the gate passages shut, nothing out there reaches the walls or the courtyard (no climbing up)
          // and nothing inside reaches the field (no dropping off the walls)
          const outside = flood(at(g.spawnPts[0]), passage), inn = flood(at(g.start), passage);
          let up = 0, off = 0;
          for (let i = 0; i < W * m.h; i++) { const x = i % W, y = (i / W) | 0; if (outside[i] && (m.hgt[i] > 0 || L.insideKeep(x, y))) up++; if (inn[i] && !L.insideKeep(x, y)) off++; }
          if (up) bad.push(`${tag}: ${up} wall/courtyard tiles reached from the field without a gate`);
          if (off) bad.push(`${tag}: ${off} field tiles reached from inside without a gate`);
          if (g.spawnPts.length < 8) bad.push(`${tag}: ${g.spawnPts.length} spawn points`);
          if (!g.boss) bad.push(`${tag}: no boss look`);
          if (n === 1) info = { gates: L.gates.length, towers: L.towers.length, ballistae: L.ballistae.length, stairs: L.stairs.length, tops, near: Math.round(Math.min(...g.spawnPts.map((p) => L.outFrom(...p)))) };
          props += g.props.length; spawns += g.spawnPts.length;
        }
        out[id] = { maxMs: Math.round(ms), props: Math.round(props / 8), spawnPts: Math.round(spawns / 8), ...info };
      }
      return { bad, out };
    }, VARIANTS);
    console.log('generation', JSON.stringify(gen.out));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    for (const id of VARIANTS) {
      await enter(id);
      // ------------------------------------------------ the rules in play: every gate, the winch, a ballista
      const rules = await page.evaluate(async (id) => {
        const { G, game } = window.VELSCOUR;
        const { makeMonster } = await import('/src/game/monster.js');
        const w = G.world, sc = w.overworldScenario, p = G.player, bad = [], out = {};
        G.godMode = true;
        const lay = sc.lay;
        if (sc.variant !== id) bad.push(`built ${sc.variant}`);
        const step = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
        const along = (g, u, v) => (g.axis === 'x' ? [u, v] : [v, u]);   // (u along the wall, v across it)
        sc.standard.use();
        if (sc.phase !== 'wave') bad.push('the standard did not start the wave');
        step(60);
        sc.queue.length = 0; for (const q of sc.live) { q.dead = true; q.noLoot = true; }
        step(2);
        const m = makeMonster(w, 'skeleton', w.biome, 10, 'normal', lay.keep.start[0], lay.keep.start[1]);
        w.add(m); m.awake = true; m.hunter = true; sc.live.add(m);
        out.held = 0;
        for (const g of sc.gates) {
          p.x = lay.keep.start[0]; p.y = lay.keep.start[1];
          [m.x, m.y] = along(g, g.a0 + 1.5, g.line - 0.8); m.nav = null;
          step(2);
          const v = g.axis === 'x' ? m.y : m.x;
          if (v < g.line + 0.3) bad.push(`${g.id}: monster at ${v.toFixed(2)} inside the line`); else out.held++;
        }
        const g = sc.gates[0];
        // battering: the gate loses hp while the dead stand on its line
        const hp0 = g.hp;
        for (let i = 0; i < 300 && !g.broken; i++) { [m.x, m.y] = along(g, g.a0 + 1.5, g.line + 0.42); m.hp = m.maxHp; step(1); }
        out.battered = Math.round(hp0 - g.hp);
        if (!(g.hp < hp0)) bad.push('the gate took no damage');
        // the hero outside: the gate lets the dead by
        g.hp = g.max; g.broken = false;
        [p.x, p.y] = along(g, g.a0 + 1.5, g.line + 3.5); [m.x, m.y] = along(g, g.a0 + 1.5, g.line - 0.8);
        step(1);
        if ((g.axis === 'x' ? m.y : m.x) > g.line) bad.push('the gate held a monster while the hero was outside');
        // break it: the winch mends it (between waves: all of it)
        g.hp = 0; g.broken = true;
        const was = sc.phase; sc.phase = 'lull';
        sc.winches[0].use();
        if (g.broken || g.hp < g.max) bad.push('the winch did not mend the gate');
        sc.phase = was;
        // a ballista with bolts looses at the dead in range (the one nearest the gate)
        const b = sc.ballistae.reduce((a, q) => (Math.hypot(q.x - g.out[0], q.y - g.out[1]) < Math.hypot(a.x - g.out[0], a.y - g.out[1]) ? q : a));
        b.ammo = 0; b.use();
        if (b.ammo !== b.max) bad.push('loading did not fill the ballista');
        p.x = lay.keep.start[0]; p.y = lay.keep.start[1]; [m.x, m.y] = along(g, g.a0 + 1.5, g.line + 3); m.hp = m.maxHp; m.static = true; const hpm = m.hp;
        for (let i = 0; i < 90 && b.ammo === b.max; i++) step(1);
        step(30);
        out.ballista = { ammo: b.ammo, dmg: Math.round(hpm - m.hp), dead: m.dead };
        if (b.ammo === b.max) bad.push('the ballista never loosed');
        if (!(m.hp < hpm) && !m.dead) bad.push('the bolt did not hit');
        m.dead = true; m.noLoot = true; step(2);
        return { bad, ...out };
      }, id);
      console.log(`${id} rules`, JSON.stringify(rules));
      for (const b of rules.bad) errors.push(`[${id} rules] ` + b);

      // ------------------------------------------------ the wall-walk in play
      const walk = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { makeMonster } = await import('/src/game/monster.js');
        const { Projectile } = await import('/src/game/hazards.js');
        const { camera } = await import('/src/core/view.js');
        const { LV } = await import('/src/world/siege.js');
        const { hiddenBehind } = await import('/src/gfx/terrain.js');
        const w = G.world, m = w.map, sc = w.overworldScenario, lay = sc.lay, p = G.player, bad = [], out = {}, W = m.w;
        const step = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
        const lv = (x, y) => m.hgt[m.tileIdx(x, y)];
        G.godMode = true;
        // the hero walks up the first flight onto the walk (the game's A*, his body's own collision)
        const st = lay.stairs[0], foot = [st.x - st.dx + 0.5 + (st.dx ? 0 : 0.5), st.y - st.dy + 0.5 + (st.dx ? 0.5 : 0)], top = [st.x + st.dx * 3 + 0.5, st.y + st.dy * 3 + 0.5];
        p.x = foot[0]; p.y = foot[1]; p.path = null;
        const path = m.findPath(p.x, p.y, top[0], top[1], 20000);
        if (!path) bad.push('A* found no way up the stairs onto the walk');
        else {
          let ill = 0, x = p.x, y = p.y;
          for (const [tx, ty] of path) { if (!m.losWide(x, y, tx, ty, 0.28)) ill++; x = tx; y = ty; }
          if (ill) bad.push(`${ill} A* legs onto the walk cross a wall`);
        }
        for (const [tx, ty] of path || []) for (let i = 0; i < 80 && Math.hypot(tx - p.x, ty - p.y) > 0.05; i++) {
          const d = Math.hypot(tx - p.x, ty - p.y), k = Math.min(1, 0.12 / d); m.move(p, (tx - p.x) * k, (ty - p.y) * k);
        }
        out.climbed = lv(p.x, p.y);
        if (lv(p.x, p.y) < LV.wall) bad.push(`the hero did not climb the stairs (at ${p.x.toFixed(1)},${p.y.toFixed(1)} level ${lv(p.x, p.y)})`);
        p.moveVec = [0, 0];
        // on the walk over the first gate: the dead held at its line are seen, shot and never strike up
        const g = sc.gates[0], [px, py] = g.posts[0];
        p.x = px; p.y = py; step(1);
        if (lv(p.x, p.y) < LV.wall) bad.push(`the post over ${g.id} is not on the walk`);
        // the flow field leads the dead in the field to him through a gate, never up the wall
        m.flowFrom = [-1, -1]; m.buildFlow(p.x, p.y, 300);
        const far = lay.gateOut(g, 6);
        if (m.flowAt(...far) < 0) bad.push('the flow field from the walk never reaches the field (through a gate)');
        const [fx, fy] = lay.gateOut(g, 2.5);
        const foe = makeMonster(w, 'skeleton', w.biome, 10, 'normal', fx, fy);
        w.add(foe); foe.awake = true; foe.hunter = true; sc.live.add(foe);
        step(45);
        const v = g.axis === 'x' ? foe.y : foe.x;
        out.held = +v.toFixed(2);
        if (v < g.line + 0.2) bad.push(`the dead got past the gate under the hero on the walk (${v.toFixed(2)})`);
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
        // at the foot of a curtain wall away from the gates: it can't climb up and can't reach him on the walk above
        let spot = null;
        for (let x = 6; x < lay.LX - 6 && !spot; x++) if (m.walkableTile(x, lay.LY) && m.walkableTile(x, lay.LY - 2) && !lay.gates.some((q) => q.axis === 'x' && x >= q.a0 - 3 && x < q.a0 + 6)) spot = [x + 0.5, lay.LY + 0.6, x + 0.5, lay.LY - 1.5];
        for (let y = 6; y < lay.LY - 6 && !spot; y++) if (m.walkableTile(lay.LX, y) && m.walkableTile(lay.LX - 2, y) && !lay.gates.some((q) => q.axis === 'y' && y >= q.a0 - 3 && y < q.a0 + 6)) spot = [lay.LX + 0.6, y + 0.5, lay.LX - 1.5, y + 0.5];
        if (spot) {
          const under = makeMonster(w, 'zombie', w.biome, 10, 'normal', spot[0], spot[1]);
          w.add(under); under.awake = true; under.hunter = true; sc.live.add(under);
          p.x = spot[2]; p.y = spot[3]; let hi = 0, swung = 0;
          for (let i = 0; i < 120; i++) { step(1); if (!lay.insideKeep(under.x, under.y)) hi = Math.max(hi, lv(under.x, under.y)); if (under.atkRange(p) > 0 && Math.hypot(under.x - p.x, under.y - p.y) < 2) swung++; }
          if (hi > 0) bad.push(`a monster outside climbed onto level ${hi}`);
          if (lay.insideKeep(under.x, under.y) && lv(under.x, under.y) > 0) bad.push('a monster climbed the curtain');
          if (swung) bad.push('a monster under the wall could strike the hero on the walk');
          out.under = [+under.x.toFixed(1), +under.y.toFixed(1)];
          under.dead = true; under.noLoot = true;
        } else out.under = 'no open foot of wall';
        // picking: the screen point of a lifted walk/tower tile maps back to that tile
        let miss = 0, tried = 0;
        for (let i = 0, k = 0; i < W * m.h && tried < 12; i++) {
          if (!m.siegeDeck[i] || (k++ % 9)) continue;
          const tx = i % W, ty = (i / W) | 0;
          if (hiddenBehind(m, tx + 0.5, ty + 0.5) || [[1, 0], [0, 1], [1, 1]].some(([ox, oy]) => m.hgt[(ty + oy) * W + tx + ox] > m.hgt[i])) continue;   // (behind a taller column)
          tried++; p.x = tx + 0.5; p.y = ty + 0.5; camera.follow(p.x, p.y, 0, true);
          const [sx, sy] = camera.tileToScreen(tx + 0.5, ty + 0.5), [qx, qy] = camera.screenToTile(sx, sy);
          if (Math.floor(qx) !== tx || Math.floor(qy) !== ty) miss++;
        }
        out.picks = `${tried - miss}/${tried}`;
        if (miss > 1) bad.push(`${miss}/${tried} picks on the walls land on the wrong tile`);
        foe.dead = true; foe.noLoot = true;
        p.x = lay.keep.start[0]; p.y = lay.keep.start[1]; step(2);
        return { bad, ...out };
      });
      console.log(`${id} wall-walk`, JSON.stringify(walk));
      for (const b of walk.bad) errors.push(`[${id} wall-walk] ` + b);

      // ------------------------------------------------ the twist
      const tw = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { makeMonster } = await import('/src/game/monster.js');
        const { Delayed, Area } = await import('/src/game/hazards.js');
        const w = G.world, m = w.map, sc = w.overworldScenario, lay = sc.lay, p = G.player, bad = [], out = { twist: sc.twist };
        const step = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
        const mk = (arch, x, y, rank = 'normal') => { const q = makeMonster(w, arch, w.biome, 10, rank, x, y); w.add(q); q.awake = true; q.hunter = true; sc.live.add(q); return q; };
        const tough = (q) => { q.maxHp = q.hp = 1e12; return q; };   // (a deep level's ballistae and rocks would kill a level-10 stand-in)
        for (const b of sc.ballistae) b.ammo = 0;
        const clear = () => { sc.queue.length = 0; for (const q of sc.live) { q.dead = true; q.noLoot = true; } step(2); };
        p.x = lay.keep.start[0]; p.y = lay.keep.start[1];
        if (sc.twist === 'frost') {
          let ice = -1; for (let i = 0; i < m.w * m.h && ice < 0; i++) if (m.siegeIce[i] && m.walkableTile(i % m.w, (i / m.w) | 0) && m.circleFree(i % m.w + 0.5, ((i / m.w) | 0) + 0.5, 0.4)) ice = i;
          if (ice < 0) bad.push('no ice on the field');
          else { const q = mk('zombie', ice % m.w + 0.5, ((ice / m.w) | 0) + 0.5); q.static = true; step(3); out.slowed = q.speedMul(); if (!(q.speedMul() < 0.9)) bad.push('the ice did not slow the dead'); }
          clear(); sc.phase = 'lull'; sc.wave = sc.total - 2; sc.standard.use();
          out.blizzard = sc.blizzard; if (!sc.blizzard) bad.push('the wave before the last brought no blizzard');
        } else if (sc.twist === 'fire') {
          if (sc.pots.length !== sc.gates.length) bad.push(`${sc.pots.length} fire-pots for ${sc.gates.length} gates`);
          const pot = sc.pots[0], g = pot.gate, crowd = [0, 1, 2, 3].map((k) => mk('zombie', g.out[0] + (k % 2) - 0.5, g.out[1] + (k >> 1) - 0.5));
          const hp0 = crowd.reduce((a, q) => a + q.hp, 0);
          pot.use(); step(2);
          out.burnt = Math.round(hp0 - crowd.reduce((a, q) => a + Math.max(0, q.hp), 0));
          if (!(out.burnt > 0)) bad.push('the fire-pot burnt nobody');
          if (pot.full) bad.push('the fire-pot is still full');
          clear(); sc.phase = 'lull'; sc.wave = sc.total - 2; sc.standard.use(); step(150);
          out.burning = [...sc.live].filter((q) => q.burning).length;
          if (!out.burning) bad.push('the fire wave came without burning dead');
        } else if (sc.twist === 'rockfall') {
          clear();
          const q = tough(mk('zombie', ...lay.gateOut(sc.gates[0], 10))); q.static = true; sc.phase = 'wave'; sc.bossDue = false;
          let rocks = 0; for (let i = 0; i < 300 && !rocks; i++) { step(1); rocks = w.hazards.filter((h) => h instanceof Delayed).length; }
          out.rocks = rocks; if (!rocks) bad.push('no rocks fell on the dead in the pass');
        } else if (sc.twist === 'plague') {
          clear();
          const lord = tough(mk('abomination', lay.keep.start[0] + 2, lay.keep.start[1], 'boss')); lord.plague = true; lord.plagueT = 0.1; lord.static = true; sc.phase = 'wave'; sc.bossDue = false;
          step(10);
          out.clouds = w.hazards.filter((h) => h instanceof Area && h.src === lord).length;
          if (!out.clouds) bad.push('the plague lord left no plague');
          const r0 = sc.resolve; step(60); out.drain = +(r0 - sc.resolve).toFixed(1);
          if (!(sc.resolve < r0)) bad.push('the plague lord in the courtyard did not wear the resolve');
          lord.dead = true; lord.noLoot = true;
        }
        clear();
        return { bad, ...out };
      });
      console.log(`${id} twist`, JSON.stringify(tw));
      for (const b of tw.bad) errors.push(`[${id} twist] ` + b);

      // ------------------------------------------------ screenshots
      if (SHOTS) {
        await enter(id);
        const at = async (name, src, zoom = 1, setup = '') => {
          await page.evaluate(async ([src, zoom, setup]) => {
            const { G, game } = window.VELSCOUR;
            const { camera } = await import('/src/core/view.js');
            const w = G.world, m = w.map, p = G.player, sc = w.overworldScenario, lay = sc.lay;
            G.godMode = true;
            const run = (s) => new Function('G', 'w', 'm', 'p', 'sc', 'lay', s)(G, w, m, p, sc, lay);
            if (setup) run(setup);
            const [x, y] = run(src);
            p.x = x; p.y = y; p.moveVec = [0, 0]; p.path = null;
            G.settings.zoom = zoom; camera.computeZoom();
            m.reveal(x, y, 40);
            for (let i = 0; i < 12; i++) { G.time += 1 / 30; game.update(1 / 30); }
            camera.follow(p.x, p.y, 0, true);
            game.render();
          }, [src, zoom, setup]);
          await page.waitForTimeout(150);
          await shot(`siege_${id}_${name}`);
        };
        await at('overview', 'return [(lay.LX + 64) / 2 - 8, (lay.LY + 64) / 2 - 8];', 0.42);
        await at('courtyard', 'return [lay.keep.start[0], lay.keep.start[1] - 1];');
        const st = 'const st = lay.stairs[0]; return [st.x + st.dx * 3 + 0.5, st.y + st.dy * 3 + 0.5];';
        await at('stairs', st, 1.2);
        // a wave at the first gate, seen from the walk over it: battered, the dead held on its line, a ballista loosing
        await at('gate', 'return sc.gates[0].posts[0];', 1.05, `
          sc.standard.use(); const g = sc.gates[0]; g.hp = 55;
          for (const b of sc.ballistae) b.ammo = 4;
          for (let i = 0; i < 300 && sc.live.size < 9; i++) { G.time += 1/30; window.VELSCOUR.game.update(1/30); }
          let k = 0; for (const q of sc.live) { if (q.dead) continue; const u = g.a0 + 0.4 + (k % 4) * 0.7, v = g.line + 0.5 + Math.floor(k / 4) * 0.9; [q.x, q.y] = g.axis === 'x' ? [u, v] : [v, u]; q.nav = null; k++; }`);
        // the twist
        const twist = {
          keep: ['return [lay.LX + 10, lay.LY + 10];', 0.8, ''],
          frost: ['return [lay.LX - 6, lay.LY + 4];', 0.8, "sc.phase = 'lull'; sc.wave = sc.total - 2; sc.standard.use();"],
          river: ['return lay.gateOut(sc.pots[0].gate, 3.5);', 0.8, "const o = sc.pots[0]; o.full = true; o.use();"],
          pass: ['return [22, 44];', 0.8, "for (let i = 0; i < 600 && !w.hazards.some((h) => h.fx === 'meteor'); i++) { G.time += 1/30; window.VELSCOUR.game.update(1/30); }"],
          mire: ['return [lay.LX + 8, lay.LY + 6];', 0.8, ''],
        }[id];
        await at('twist', twist[0], twist[1], twist[2]);
      }
    }

    // ------------------------------------------------ auto-play holds the walls of every variant
    if (AUTO) {
      await page.evaluate(async ([d, cls]) => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        // a hero the way one looks arriving at this depth (tools/tests/balance.js): its level, points spent, the best of
        // 200 drops of the last few item levels with +upgrades and gems, skill mastery
        const { depthLevel } = await import('/src/data/depth.js');
        const { rollItem, rollGem } = await import('/src/data/items.js');
        if (cls !== G.char.classId) await game.newChar(cls, 'Warden');
        const c = G.char, p = G.player, L = depthLevel(d);
        c.level = L + 1; c.statPoints += L * 5; c.skillPoints += L + d;
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
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute();
      }, [DEPTH, CLS]);
      for (const id of VARIANTS) {
        const res = await page.evaluate(async ([d, mortal, id]) => {
          const { G, game } = window.VELSCOUR;
          const { Auto } = await import('/src/game/autoplay.js');
          const { BIOME_BY_ID } = await import('/src/data/biomes.js');
          const c = G.char, p = G.player;
          c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 }; p.hp = p.maxHp; p.mana = p.maxMana;
          G.godMode = !mortal; c.depth = d; c.deaths = 0;
          (G.regionWant ||= {}).endless_siege = id;
          await game.teleportToBiome(BIOME_BY_ID.endless_siege);
          Auto.toggle(true);
          const t0 = performance.now(), w = G.world, sc = w.overworldScenario, log = [], fellIn = [];
          let sim = 0, lastWave = -1, lastPhase = '', falls = 0, onWall = 0;
          while (sim < 2400 && !sc.completed && performance.now() - t0 < 420000 && G.world === w) {
            for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
            if (sc.falls > falls) { falls = sc.falls; fellIn.push(sc.wave + 1); }
            if (w.map.siegeDeck[w.map.tileIdx(G.player.x, G.player.y)]) onWall++;
            if (sc.wave !== lastWave || sc.phase !== lastPhase) { log.push(`${Math.round(sim)}s ${sc.phase} w${sc.wave} r${Math.round(sc.resolve)} [${sc.ballistae.map((b) => b.ammo).join(',')}] [${sc.gates.map((g) => (g.broken ? 'X' : Math.round(g.hp))).join(',')}]`); lastWave = sc.wave; lastPhase = sc.phase; }
            await new Promise((r) => setTimeout(r, 0));
          }
          const exit = w.portals.find((q) => q.type === 'exit');
          Auto.toggle(false);
          return { variant: sc.variant, cls: G.char.classId, lvl: G.char.level, secs: Math.round(sim), completed: sc.completed, waves: `${sc.wave}/${sc.total}`, falls: sc.falls, fellIn, deaths: G.char.deaths,
            onWallSecs: onWall, kills: sc.kills, status: Auto.status, exit: exit?.active, log, same: G.world === w };
        }, [DEPTH, MORTAL, id]);
        console.log(`${id} auto-play`, JSON.stringify(res));
        if (res.variant !== id) errors.push(`[${id} auto] built ${res.variant}`);
        if (!res.completed) errors.push(`[${id} auto] did not break the siege in ${res.secs}s (${res.waves}, ${res.status})`);
        if (res.completed && !res.exit) errors.push(`[${id} auto] the exit did not open`);
        if (res.falls > Math.ceil(res.waves.split('/')[1] / 2)) errors.push(`[${id} auto] the keep fell ${res.falls} times (waves ${res.fellIn.join(', ')})`);
        if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot(`siege_${id}_auto_end`); }
      }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        (G.regionWant ||= {}).endless_siege = 'river';
        await game.teleportToBiome(BIOME_BY_ID.endless_siege);
        const p = G.player; p.x = 16.5; p.y = 27.5;
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
