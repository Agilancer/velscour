// THE DEEP RAIL MINES (docs/DEEP_RAIL_MINES.md): the skull ("mines") reaches it; many seeds generate whole mines (every
// shaft reached by cart from the Lift Head, the Bottom among them, each shaft's cart walkable from its buffer stop,
// tunnels blocked, no line through a foreign shaft, the boss and the exit in reach); the cart sprites bake in
// three.js; a ride carries the hero down a line in a cut scene; a junction's switch changes the line; riding to the
// Bottom and killing what waits there opens the exit; then auto-play takes a whole mine. Screenshots in out/mines_*.
//   node tools/tests/mines.js [seeds=60] [noauto] [noshots]   (server first: python -m http.server 8203; BASE_URL=http://localhost:8203)
const { openGame, report } = require('./harness');
const arg = (k) => process.argv.slice(2).includes(k);
const SEEDS = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 60);
const AUTO = !arg('noauto'), SHOTS = !arg('noshots');

const step = (page, secs) => page.evaluate(async (secs) => {   // run the game for `secs` at 60 fps, rendering every 4th frame
  const { G, game } = window.VELSCOUR;
  for (let i = 0; i < secs * 60; i++) { G.time += 1 / 60; game.update(1 / 60); if (i % 4 === 3) game.render(); }
  game.render();
}, secs);
const waitMine = (page) => page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'deep_mines' && window.VELSCOUR.G.world.overworldScenario?.type === 'mines'
  && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 90000 });
/** Stand the hero by shaft `sid`'s cart (as if he had ridden there), monsters near it gone. */
const toCart = (page, sid) => page.evaluate((sid) => {
  const { G } = window.VELSCOUR, w = G.world, run = w.overworldScenario, S = run.mine.shafts[sid], p = w.player;
  run.at = S;
  p.x = S.outAt[0] - 0.9; p.y = S.outAt[1] - 0.9; p.path = null; p.moveTarget = null;
  for (const c of w.creatures) if (c.team === 'enemy' && !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 9 && c !== w.boss) c.dead = true;
  return [p.x, p.y];
}, sid);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 820 });
  try {
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('wizard', 'Delver'); const { G } = window.VELSCOUR; G.char.depth = 12; G.godMode = true; });
    // ------------------------------------------------ the skull
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'mines');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await waitMine(page);
    await page.waitForTimeout(300);

    // ------------------------------------------------ generation over many seeds
    const gen = await page.evaluate(async (SEEDS) => {
      const { generateMines, checkMines } = await import('/src/world/mines.js'), { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const b = BIOME_BY_ID.deep_mines, bad = [], shapes = {}, t0 = performance.now();
      let rides = 0, junctions = 0, tunnels = 0, worst = 0;
      for (let i = 0; i < SEEDS; i++) {
        const depth = [3, 12, 30, 60, 150][i % 5], seed = (i * 2654435761) >>> 0;
        const t = performance.now(), g = generateMines(depth, b, seed); worst = Math.max(worst, performance.now() - t);
        const c = checkMines(g);
        if (!c.ok) bad.push(`seed ${seed} depth ${depth}: ${c.bad.slice(0, 3).join('; ')}`);
        shapes[g.mine.shape.join('')] = (shapes[g.mine.shape.join('')] || 0) + 1;
        rides += c.rides; junctions += c.junctions; tunnels += g.mine.edges.length;
        // packs grow down the mine: the mean pack size and rank per tier
      }
      return { bad, shapes, rides: rides / SEEDS, junctions: junctions / SEEDS, lines: tunnels / SEEDS, ms: Math.round(performance.now() - t0), worstMs: Math.round(worst) };
    }, SEEDS);
    console.log('generation', JSON.stringify({ ...gen, bad: gen.bad.length }));
    for (const b of gen.bad.slice(0, 10)) errors.push('[gen] ' + b);
    if (gen.junctions < 1) errors.push('[gen] no junctions');

    // ------------------------------------------------ the live mine
    const info = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, w = G.world, run = w.overworldScenario, { minecartAtlas } = await import('/src/gfx/mines.js');
      const { mineTileSet } = await import('/src/world/mines.js');
      const shafts = w.portals.filter((p) => p.type === 'minecart').length, levers = w.portals.filter((p) => p.type === 'switch').length;
      const mine = run.mine.shafts;
      const tiers = {};
      for (const c of w.creatures) {
        if (c.team !== 'enemy' || c.dead) continue;
        const s = run.shaftAt(c.x, c.y); if (!s) continue;
        const t = (tiers[s.k] ||= { n: 0, elite: 0, shafts: new Set() }); t.n++; t.shafts.add(s.id); if (c.rank !== 'normal') t.elite++;
      }
      const perTier = Object.entries(tiers).map(([k, t]) => [+k, +(t.n / t.shafts.size).toFixed(1), t.elite]);
      const atlas = minecartAtlas();
      return { L: run.mine.L, carts: shafts, levers, tileset: w.tileset === mineTileSet(), atlas: atlas ? [atlas.width, atlas.height] : null, shafts: mine.length, perTier,
        boss: w.boss && { name: w.boss.name, art: w.boss.art, at: run.shaftAt(w.boss.x, w.boss.y)?.name }, title: run.title, start: run.at.name };
    });
    console.log('live', JSON.stringify(info));
    if (!info.tileset) errors.push('[live] the world does not draw with the mine tile set');
    if (!info.atlas) errors.push('[live] the minecart was not baked (three.js)');
    if (!info.carts) errors.push('[live] no carts');
    if (!info.boss || info.boss.at !== 'The Bottom') errors.push('[live] no boss at the Bottom');
    const pt = info.perTier.filter(([k]) => k > 0 && k < info.L);   // monsters per shaft by tier: more below
    if (pt.length >= 2 && pt[pt.length - 1][1] < pt[0][1]) errors.push('[live] the deep shafts hold fewer monsters than the first: ' + JSON.stringify(info.perTier));

    await step(page, 1.2); if (SHOTS) await shot('mines_start');
    // ------------------------------------------------ a ride, frame by frame
    await toCart(page, 0);
    await step(page, 0.8); if (SHOTS) await shot('mines_cart');
    const ride = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, s = run.at, cart = w.portals.find((p) => p.type === 'minecart' && Math.hypot(p.x - s.outAt[0], p.y - s.outAt[1]) < 0.1);
      const want = s.out[s.pick].to;
      cart.use();
      const started = !!run.ride && G.cine, t0 = w.time;
      let off = 0, n = 0, maxV = 0;
      for (let i = 0; i < 60 * 30 && run.ride; i++) {
        G.time += 1 / 60; game.update(1 / 60);
        if (i === 90) game.render();
        if (run.ride) { n++; maxV = Math.max(maxV, run.ride.v); if (w.map.walkable(w.player.x, w.player.y) && !run.shaftAt(w.player.x, w.player.y)) off++; }
      }
      const p = w.player;
      return { started, secs: +(w.time - t0).toFixed(1), at: run.at.name, want: want.name, shaft: run.shaftAt(p.x, p.y)?.name, walk: w.map.walkable(p.x, p.y), z: p.z, off, maxV: +maxV.toFixed(1), cine: !!G.cine };
    });
    console.log('ride', JSON.stringify(ride));
    if (!ride.started) errors.push('[ride] the cart did not start a ride (cut scene)');
    if (ride.at !== ride.want || ride.shaft !== ride.want || !ride.walk) errors.push('[ride] the ride did not set the hero down in ' + ride.want);
    if (ride.off) errors.push('[ride] the hero rode over walkable ground outside the shafts (an open tunnel)');
    await step(page, 1.5); if (SHOTS) await shot('mines_arrival');
    // mid-ride shot on the next line
    const mid = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, s = run.at, p = w.player;
      p.x = s.outAt[0] - 0.9; p.y = s.outAt[1] - 0.9;
      for (const c of w.creatures) if (c.team === 'enemy' && !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 9 && c !== w.boss) c.dead = true;
      // a junction: throw the switch and see the line change
      let junction = null;
      if (s.out.length > 1) { const a = s.out[s.pick].to.name; run.flip(s); junction = [a, s.out[s.pick].to.name]; }
      for (let i = 0; i < 30; i++) { G.time += 1 / 60; game.update(1 / 60); }
      run.objective.use();
      for (let i = 0; i < 100; i++) { G.time += 1 / 60; game.update(1 / 60); }
      game.render();
      return { junction, riding: !!run.ride };
    });
    console.log('mid', JSON.stringify(mid));
    if (mid.junction && mid.junction[0] === mid.junction[1]) errors.push('[switch] the switch did not change the line');
    if (SHOTS) await shot('mines_riding');
    await page.evaluate(() => { const { G, game } = window.VELSCOUR, run = G.world.overworldScenario; for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); } });
    // a junction shaft, if there is one: the switch and the cart side by side
    const jn = await page.evaluate(() => { const j = window.VELSCOUR.G.world.overworldScenario.mine.shafts.find((s) => s.out.length > 1 && !s.cart.used); return j ? j.id : -1; });
    let back = null;
    if (jn >= 0) { back = await page.evaluate(() => { const r = window.VELSCOUR.G.world.overworldScenario, p = window.VELSCOUR.G.world.player; return [r.at.id, p.x, p.y]; }); await toCart(page, jn); await step(page, 0.8); if (SHOTS) await shot('mines_junction'); }
    if (back) await page.evaluate((b) => { const w = window.VELSCOUR.G.world, r = w.overworldScenario; r.at = r.mine.shafts[b[0]]; w.player.x = b[1]; w.player.y = b[2]; }, back);
    // ------------------------------------------------ down to the Bottom: ride on, then kill what waits there
    const down = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, p = w.player, path = [];
      run.at = run.shaftAt(p.x, p.y) || run.at;
      for (let r = 0; r < 12 && !run.bottom; r++) {
        const s = run.at;
        if (s.cart.used) break;
        p.x = s.outAt[0] - 0.9; p.y = s.outAt[1] - 0.9;
        run.objective.use();
        for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); }
        path.push(run.at.name);
      }
      return { path, bottom: run.bottom };
    });
    console.log('down', JSON.stringify(down));
    if (!down.bottom) errors.push('[down] the carts did not reach the Bottom');
    await step(page, 1.5); if (SHOTS) await shot('mines_bottom');
    const fight = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, { kill } = await import('/src/game/combat.js');
      const b = w.boss, p = w.player;
      p.x = b.x - 2; p.y = b.y - 2;
      for (let i = 0; i < 120; i++) { G.time += 1 / 60; game.update(1 / 60); }
      kill(b, p);
      for (let i = 0; i < 60; i++) { G.time += 1 / 60; game.update(1 / 60); }
      const ex = w.portals.find((q) => q.type === 'exit');
      return { done: run.completed, exit: ex && ex.active, title: run.title };
    });
    console.log('bottom', JSON.stringify(fight));
    if (!fight.done || !fight.exit) errors.push('[bottom] killing the boss did not open the exit');
    await step(page, 1); if (SHOTS) await shot('mines_exit');
    const q = await page.evaluate(async () => { const { renderQuest } = await import('/src/ui/quest.js'); const d = document.createElement('div'); renderQuest(d); return d.textContent.slice(0, 400); });
    console.log('quest', q.replace(/\s+/g, ' '));
    if (!/Ride the minecarts/.test(q)) errors.push('[quest] the Quest Log has no mine steps');

    // ------------------------------------------------ auto-play takes a whole mine
    if (AUTO) {
      await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('paladin', 'Digger');
        G.char.depth = 3; G.godMode = true;
        if (G.world) G.world.depth = 3;
        await game.teleportToBiome(BIOME_BY_ID.deep_mines);
      });
      await waitMine(page);
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { Auto } = await import('/src/game/autoplay.js');
        const w = G.world, run = w.overworldScenario, t0 = performance.now(), log = [];
        Auto.toggle(true);
        let last = '';
        for (let s = 0; s < 60 * 25 && G.world === w; s++) {   // up to 25 game minutes
          for (let i = 0; i < 60; i++) { G.time += 1 / 60; game.update(1 / 60); }
          const ph = run.at.name + (run.completed ? ' done' : '');
          if (ph !== last) { log.push(`${(s / 60).toFixed(1)} min: ${ph}`); last = ph; }
          if (run.completed) break;
        }
        Auto.toggle(false);
        const ex = w.portals.find((q) => q.type === 'exit');
        return { log, done: run.completed, rides: run.rides, exit: ex && ex.active, ms: Math.round(performance.now() - t0) };
      });
      console.log('auto-play', JSON.stringify(res));
      if (!res.done || !res.exit) errors.push('[auto-play] did not clear the mine');
      if (SHOTS) { await step(page, 0.5); await shot('mines_auto_end'); }
    }
  } catch (e) { errors.push(String(e && e.stack || e)); }
  await browser.close();
  report(errors);
})();
