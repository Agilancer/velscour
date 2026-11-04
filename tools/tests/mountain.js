// MOUNTAINSIDE (docs/MOUNTAINSIDE.md): in the overworld rotation now, and Velscour's skull ("mountain"). 30 seeds:
// 72 x 104, a two-way trail to the summit, cliffs on every band, ramps and hop-step scrambles, shelves a hop up with
// their chests, packs along the whole trail. The hop rules in play (a walk, a hop, a wall), the hero's hop arc, pathing
// (A*, the flow field), picking through the 3D ground, screenshots (the foot, a ramp, a scramble, the snow line, the
// summit, an overview, the phone). Then auto-play climbs, takes the summit from its Warden and is carried on into the
// Snowy Summit.
//   node tools/tests/mountain.js [shots|noshots] [auto|noauto] [seeds]   (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
const AUTO = process.argv[3] !== 'noauto';
const SEEDS = +(process.argv[4] || 30);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    // ------------------------------------------------ reached through the skull, and drawn in the rotation
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('paladin', 'Climber'); window.VELSCOUR.G.char.depth = 6; });
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'mountain');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'mountainside' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 60000 });
    const first = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { BIOMES, drawBiome, OVERWORLD_BIOME_IDS } = await import('/src/data/biomes.js');
      const bad = [];
      if (!OVERWORLD_BIOME_IDS.includes('mountainside') || !BIOMES.some((b) => b.id === 'mountainside')) bad.push('not in the overworld rotation');
      if (OVERWORLD_BIOME_IDS.includes('snowy_summit')) bad.push('the Snowy Summit is drawn on its own');
      let seen = 0;
      const c = { biomeBag: [], overworldMisses: 0 };
      for (let i = 0; i < 2000; i++) { c.overworldMisses = i % 4; const id = drawBiome(c, 10 + (i % 30)); if (id === 'mountainside') seen++; if (id === 'snowy_summit') { bad.push('snowy_summit drawn'); break; } c.lastBiome = id; }
      if (!seen) bad.push('never drawn in 2000 draws');
      const m = G.world.map;
      if (m.w !== 72 || m.h !== 104) bad.push(`map is ${m.w} x ${m.h}`);
      if (!m.hgt || !m.smoothField || !m.hopArc) bad.push('no smooth height field with hops');
      if (!G.world.cave || !G.world.cave.av) bad.push('no three.js ground');
      return { bad, seen, title: G.world.overworldScenario?.title, levels: [m.minLevel, m.maxLevel], props: G.world.props.length, mobs: G.world.creatures.length };
    });
    console.log('skull', JSON.stringify(first));
    for (const b of first.bad) errors.push('[skull] ' + b);

    // ------------------------------------------------ seeds
    const gen = await page.evaluate(async (SEEDS) => {
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateMountain, CLIMB, DROP, WALK } = await import('/src/world/mountain.js');
      const { reachFrom, stepStats } = await import('/src/world/alpine.js');
      const biome = BIOME_BY_ID.mountainside, bad = [], stats = [];
      let ms = 0;
      for (let n = 1; n <= SEEDS; n++) {
        const seed = n * 4241 + 9, t0 = performance.now();
        let g;
        try { g = generateMountain(6, biome, seed); } catch (e) { bad.push(`seed ${seed}: ${e.message}`); continue; }
        ms = Math.max(ms, performance.now() - t0);
        const m = g.map, W = m.w, H = m.h, I = (x, y) => y * W + x, walk = Uint8Array.from(m.t);
        const s0 = I(Math.floor(g.start[0]), Math.floor(g.start[1])), e0 = I(Math.floor(g.exit[0]), Math.floor(g.exit[1]));
        const up = reachFrom(W, H, m.hgt, walk, m.block, s0, CLIMB, DROP), down = reachFrom(W, H, m.hgt, walk, m.block, e0, CLIMB, DROP);
        if (!up[e0]) bad.push(`seed ${seed}: summit unreachable from the foot`);
        if (!down[s0]) bad.push(`seed ${seed}: no way back down`);
        for (const ch of g.chests) if (!up[I(Math.floor(ch.x), Math.floor(ch.y))]) bad.push(`seed ${seed}: chest at ${ch.x.toFixed(1)},${ch.y.toFixed(1)} unreachable`);
        const st = stepStats(W, H, m.hgt, walk, WALK, CLIMB);
        if (st.hop < 40) bad.push(`seed ${seed}: only ${st.hop} hop-high steps`);
        let cliffs = 0;
        for (let i = 0; i < W * H; i++) if (!walk[i] && i % W > 6 && i % W < W - 8) cliffs++;
        if (cliffs < 400) bad.push(`seed ${seed}: only ${cliffs} rock tiles inside the slope`);
        const blockedTrail = g.trail.filter((i) => m.block[i]).length;
        if (blockedTrail) bad.push(`seed ${seed}: ${blockedTrail} trail tiles blocked`);
        // the trail walks: every step a walk or a hop (and the scrambles really are hops)
        let hops = 0, walls = 0;
        for (let k = 1; k < g.trail.length; k++) { const d = Math.abs(m.hgt[g.trail[k]] - m.hgt[g.trail[k - 1]]); if (d > CLIMB) walls++; else if (d > WALK) hops++; }
        if (walls) bad.push(`seed ${seed}: ${walls} trail steps taller than a hop`);
        if (hops < 6) bad.push(`seed ${seed}: the trail hops only ${hops} times`);
        if (g.ramps.length < 8) bad.push(`seed ${seed}: only ${g.ramps.length} ways up`);
        if (g.camps.length < 3) bad.push(`seed ${seed}: only ${g.camps.length} climbers' camps (checkpoints)`);
        if (!m.walls.some((o) => o.kind === 'arch')) bad.push(`seed ${seed}: no gateway arch on the summit`);
        // fights all the way: no stretch of 40 trail tiles without a pack near it
        const packs = g.spawns.filter((s) => s.zone === 'trail' || s.zone === 'landing').map((s) => s.ti).sort((a, b) => a - b);
        let gap = packs[0] ?? 999;
        for (let k = 1; k < packs.length; k++) gap = Math.max(gap, packs[k] - packs[k - 1]);
        gap = Math.max(gap, g.trail.length - (packs[packs.length - 1] ?? 0));
        if (gap > 64) bad.push(`seed ${seed}: ${gap} trail tiles without a fight`);   // (the breathers round the camps are meant)
        stats.push({ seed, camps: g.camps.length, trail: g.trail.length, hops, ...st, rise: m.maxLevel - m.minLevel, props: g.props.length, packs: g.spawns.length, leaps: g.leaps.length, chests: g.chests.length, gap });
      }
      const avg = (k) => Math.round(stats.reduce((a, s) => a + s[k], 0) / Math.max(1, stats.length));
      return { bad, maxMs: Math.round(ms), avg: Object.fromEntries(['camps', 'trail', 'hops', 'slope', 'hop', 'wall', 'rise', 'props', 'packs', 'leaps', 'chests', 'gap'].map((k) => [k, avg(k)])) };
    }, SEEDS);
    console.log('generation', JSON.stringify(gen));
    for (const b of gen.bad) errors.push('[gen] ' + b);

    // ------------------------------------------------ the hop rules in play
    const rules = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { camera } = await import('/src/core/view.js');
      const { hopArc } = await import('/src/game/alpine.js');
      const w = G.world, m = w.map, p = G.player, W = m.w, bad = [], out = {};
      G.godMode = true;
      for (const c of w.creatures) if (c !== p && c.team === 'enemy') { c.x = 1; c.y = 1; c.disabled = () => true; }
      // walk into the next tile toward -y/+y and see where the hero ends up
      const tryStep = (x, y, dy) => {
        p.x = x + 0.5; p.y = y + 0.5; p.path = null; p.moveTarget = null;
        for (let i = 0; i < 40 && (dy < 0 ? p.y >= y : p.y < y + 1); i++) m.move(p, 0, dy * 0.05);
        return dy < 0 ? p.y < y : p.y >= y + 1;
      };
      const find = (pred) => {
        for (let y = 3; y < m.h - 3; y++) for (let x = 7; x < W - 8; x++) {
          const a = y * W + x, b = (y - 1) * W + x;
          if ([-1, 0, 1].some((o) => !m.walkableTile(x + o, y) || !m.walkableTile(x + o, y - 1) || m.block[a + o] || m.block[b + o])) continue;
          const d = m.hgt[b] - m.hgt[a];
          if ([-1, 0, 1].every((o) => m.hgt[b + o] - m.hgt[a + o] === d) && pred(d)) return [x, y];
        }
        return null;
      };
      const hop = find((d) => d > m.walkStep && d <= m.climb), wall = find((d) => d > m.climb && d <= m.drop);
      if (!hop) bad.push('no clean hop step found');
      else {
        if (!tryStep(hop[0], hop[1], -1)) bad.push(`could not hop up at ${hop}`);
        // the arc: the hero rides above the ground while he hops
        p.x = hop[0] + 0.5; p.y = hop[1] + 0.55; p._hopMap = null; hopArc(p, m);
        let peak = 0;
        for (let i = 0; i < 30; i++) { m.move(p, 0, -0.04); G.time += 1 / 60; peak = Math.max(peak, hopArc(p, m)); }
        out.hopArc = Math.round(peak);
        if (peak < 6) bad.push(`the hop arc only rose ${peak.toFixed(1)} px`);
      }
      if (wall) { out.wall = m.hgt[(wall[1] - 1) * W + wall[0]] - m.hgt[wall[1] * W + wall[0]]; if (tryStep(wall[0], wall[1], -1)) bad.push(`climbed ${out.wall} levels at ${wall}`); }
      // A* and the flow field respect the cliffs: a path from the foot to the summit only steps legally
      const sc = w.overworldScenario, [sx, sy] = [m.mountain.trail[0] % W + 0.5, ((m.mountain.trail[0] / W) | 0) + 0.5], top = sc.shrine;
      const upP = m.findPath(sx, sy, top.x, top.y + 1.5, 120000);
      if (!upP) bad.push('A* found no way up');
      else {
        let x = sx, y = sy, ill = 0;
        for (const [tx, ty] of upP) { if (!m.losWide(x, y, tx, ty, 0.28)) ill++; x = tx; y = ty; }
        if (ill) bad.push(`${ill} A* legs cross a cliff`);
        out.upLegs = upP.length;
      }
      m.flowFrom = [-1, -1]; m.buildFlow(top.x, top.y + 1.5, 900);
      if (m.flowAt(sx, sy) < 0) bad.push('the flow field from the summit never reaches the foot');
      // picking: the screen point of a walkable tile's ground maps back to that tile
      let miss = 0, tried = 0;
      for (let k = 0; k < 80 && tried < 40; k++) {
        const tx = 7 + (k * 7) % (W - 15), ty = 4 + (k * 11) % (m.h - 8);
        if (!m.walkableTile(tx, ty) || [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]].some(([ox, oy]) => !m.walkableTile(tx + ox, ty + oy) || Math.abs(m.hgt[(ty + oy) * W + tx + ox] - m.hgt[ty * W + tx]) > 2)) continue;
        tried++;
        p.x = tx + 0.5; p.y = ty + 0.5; camera.follow(p.x, p.y, 0, true);
        const [qx, qy] = camera.tileToScreen(tx + 0.5, ty + 0.5), [px, py] = camera.screenToTile(qx, qy);
        if (Math.floor(px) !== tx || Math.floor(py) !== ty) miss++;
      }
      if (miss > 2) bad.push(`${miss}/${tried} picks land on the wrong tile`);
      out.picks = `${tried - miss}/${tried}`;
      return { bad, ...out };
    });
    console.log('rules', JSON.stringify(rules));
    for (const b of rules.bad) errors.push('[rules] ' + b);

    // ------------------------------------------------ screenshots
    if (SHOTS) {
      const at = async (name, fn, zoom = 1) => {
        await page.evaluate(async ([src, zoom]) => {
          const { G, game } = window.VELSCOUR;
          const { camera } = await import('/src/core/view.js');
          const w = G.world, m = w.map, p = G.player;
          const [x, y] = new Function('G', 'w', 'm', 'p', src)(G, w, m, p);
          p.x = x; p.y = y; p.moveVec = [0, 0]; p.path = null;
          G.settings.zoom = zoom; camera.computeZoom();
          m.reveal(x, y, 14);
          for (let i = 0; i < 8; i++) { G.time += 1 / 30; game.update(1 / 30); }
          camera.follow(p.x, p.y, 0, true);
          game.render();
        }, [fn, zoom]);
        await page.waitForTimeout(120);
        await shot('mountain_' + name);
      };
      const T = (f) => `const t = m.mountain.trail; const i = t[Math.floor(t.length * ${f})]; return [i % m.w + 0.5, ((i / m.w) | 0) + 0.5];`;
      await at('start', T(0));
      await at('ramp', 'const r = m.mountain.ramps.find((q) => !q.scramble); return [r.foot[0], r.foot[1] - 2];');
      await at('scramble', 'const r = m.mountain.ramps.find((q) => q.scramble); return [r.foot[0], r.foot[1] - 2.5];');
      await at('trail_mid', T(0.5));
      await at('snowline', T(0.84));
      await at('summit', 'const s = m.mountain.summit; return [s[0] - 1, s[1] + 3.5];');
      await at('shelf', 'const l = m.mountain.shelves[0] || [30, 50]; return [l[0] + 1.5, l[1] + 1.5];');
      await at('overview', 'return [36, 54];', 0.5);
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom(); });
    }

    // ------------------------------------------------ auto-play takes the summit and goes on into the Snowy Summit
    if (AUTO) {
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { Auto } = await import('/src/game/autoplay.js');
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        // a hero geared for the depth, like tools/tests/breach.js (a level-1 hero spends most of a climb on each pack)
        const { rollItem, rollGem } = await import('/src/data/items.js');
        const { xpToNext } = await import('/src/game/player.js');
        const { depthLevel } = await import('/src/data/depth.js');
        game.enterTown();
        const c = G.char, p = G.player, D = 8, L = depthLevel(D) + 2;
        c.level = L; c.xp = Math.round(xpToNext(L) * 0.3); c.statPoints += (L - 1) * 5; c.skillPoints += L - 1; c.depth = D;
        c.potions = { hp: 10, mp: 6, rejuv: 3, fury: 2 };
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
        for (let round = 0; round < 6; round++) { c.bag = c.bag.map(() => null); for (let i = 0; i < 25; i++) { const it = rollItem(L - Math.floor(Math.random() * 4), { mf: 60, bonus: 0.15 }); it.unid = false; c.bag[i] = it; } p.recompute(); Auto.optimizeGear(); }
        c.bag = c.bag.map(() => null);
        for (const it of Object.values(c.equip)) if (it && it.type === 'gear') { it.upg = 2; it.sockets = Math.max(it.sockets, Math.min(it.maxSockets, 1)); while (it.gems.length < it.sockets) { const g = rollGem(L); it.gems.push({ gem: g.gem, tier: g.tier }); } }
        Auto.spendSkills(); Auto.arrangeBar(); p.recompute(); p.hp = p.maxHp;
        G.godMode = true;
        await game.teleportToBiome(BIOME_BY_ID.mountainside);
        Auto.toggle(true);
        const render = game.render; game.render = () => {};   // SwiftShader's 3D readback would run the clock at real time
        const t0 = performance.now(), log = [];
        let sim = 0, best = 0, onSummit = 0;
        while (sim < 1500 && performance.now() - t0 < 420000) {
          if (game._continuing) { await new Promise((r) => setTimeout(r, 40)); continue; }
          for (let i = 0; i < 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); sim += 1 / 30; }
          const w = G.world, sc = w.overworldScenario;
          if (w.biome.id === 'mountainside') best = Math.max(best, sc.altitude);
          if (w.biome.id === 'snowy_summit') { if (!onSummit) log.push(`summit reached at ${Math.round(sim)} s`); onSummit += 1; if (onSummit > 3) break; }
          if (Math.round(sim) % 120 === 0) log.push(`${Math.round(sim)} s: ${w.biome.id} ${sc?.altitude}% ${Auto.status}`);
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false); game.render = render;
        return { secs: Math.round(sim), biome: G.world.biome.id, altitude: best, status: Auto.status, log, depth: G.world.depth, next: G.char.nextBiome };
      });
      console.log('auto-play', JSON.stringify(res));
      if (res.biome !== 'snowy_summit') errors.push(`[auto] did not take the summit in ${res.secs}s (best altitude ${res.altitude}%, ${res.status})`);
      else if (res.next !== 'snowy_summit') errors.push(`[auto] a town trip would not come back to the Snowy Summit (nextBiome ${res.next})`);
      if (SHOTS) { await page.evaluate(() => window.VELSCOUR.game.render()); await shot('mountain_auto_end'); }
    }

    // ------------------------------------------------ phone layout
    if (SHOTS) {
      const m = await openGame({ width: 844, height: 390, mobile: true });
      await m.page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('ranger', 'Phone');
        await game.teleportToBiome(BIOME_BY_ID.mountainside);
        const mm = G.world.map, t = mm.mountain.trail, i = t[Math.floor(t.length * 0.3)], p = G.player;
        p.x = i % mm.w + 0.5; p.y = ((i / mm.w) | 0) + 0.5;
        for (let k = 0; k < 20; k++) { G.time += 1 / 30; game.update(1 / 30); }
        game.render();
      });
      await m.page.waitForTimeout(200);
      await m.shot('mountain_mobile');
      errors.push(...m.errors);
      await m.browser.close();
    }
  } catch (e) { errors.push('[test] ' + e.message); }
  report(errors);
  await browser.close();
})();
