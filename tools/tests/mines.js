// THE DEEP RAIL MINES (docs/DEEP_RAIL_MINES.md): the skull ("mines") reaches it; many seeds generate whole mines (every
// shaft reached by cart from the Lift Head, the Bottom among them, each shaft's cart walkable from its buffer stop,
// tunnels blocked, no line through a foreign shaft, the boss and the exit in reach); the cart sprites bake in
// three.js; a ride carries the hero down a line in a cut scene; a junction's switch changes the line; riding to the
// Bottom and killing what waits there opens the exit. The carts ride back up: down then up lands in the shaft above,
// a junction can be backed out of to take the other line, and the Bottom rides up too. Monsters level up by tier, and
// tunnel mouths get arches. Then the five variants (world/mines.js MINE_VARIANTS): each builds over many seeds with its
// own lattice and twist, then live: its tile set, light and roster, a ride with its twist (slow carts and wading pools,
// the vein's mending, magma flares, a cave-in on a loose roof), shots, and auto-play clears it without riding back up.
// Screenshots in out/mines_* (mines_v_<variant>*.png per variant).
//   node tools/tests/mines.js [seeds=30 a variant] [noauto] [noshots] [variants=dwarven,flooded,...]
//   (start the server first: python3 -m http.server 8123)
const { openGame, report } = require('./harness');
const arg = (k) => process.argv.slice(2).includes(k);
const SEEDS = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 30);
const ONLY = (process.argv.slice(2).find((a) => a.startsWith('variants=')) || '').slice(9).split(',').filter(Boolean);
const AUTO = !arg('noauto'), SHOTS = !arg('noshots');

const step = (page, secs) => page.evaluate(async (secs) => {   // run the game for `secs` at 60 fps, rendering every 4th frame
  const { G, game } = window.VELSCOUR;
  for (let i = 0; i < secs * 60; i++) { G.time += 1 / 60; game.update(1 / 60); if (i % 4 === 3) game.render(); }
  game.render();
}, secs);
const waitMine = (page) => page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'deep_mines' && window.VELSCOUR.G.world.overworldScenario?.type === 'mines'
  && window.VELSCOUR.G.world !== window.__oldWorld && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 90000 });
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
    await page.fill('#velscour-message', 'mines dwarven');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await waitMine(page);
    await page.waitForTimeout(300);
    // (before the generation pass below loads every variant's packs, which evicts the level's recoloured set from the cache)
    await page.evaluate(async () => { const { mineTileSet } = await import('/src/world/mines.js'), w = window.VELSCOUR.G.world; window.__ts = w.tileset === mineTileSet(w.overworldScenario.variant); });

    // ------------------------------------------------ generation over many seeds
    const gen = await page.evaluate(async (SEEDS) => {
      const { generateMines, checkMines, MINE_VARIANTS, applyMineLook } = await import('/src/world/mines.js'), { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      const bad = [], shapes = {}, t0 = performance.now(), per = {};
      let rides = 0, junctions = 0, tunnels = 0, worst = 0, arches = 0, n = 0;
      for (const V of MINE_VARIANTS) {
        await loadBiomeArt(V.art);
        const b = { ...BIOME_BY_ID.deep_mines }; applyMineLook(b, V);
        const pv = (per[V.id] = { shapes: {}, pools: 0, caveLines: 0, roster: new Set(), bosses: new Set(), off: [], bossOff: 0 });
      for (let i = 0; i < SEEDS; i++, n++) {
        const depth = [3, 12, 30, 60, 150][i % 5], seed = (i * 2654435761 + V.id.length * 97) >>> 0;
        const t = performance.now(), g = generateMines(depth, b, seed, V); worst = Math.max(worst, performance.now() - t);
        const c = checkMines(g);
        if (!c.ok) bad.push(`${V.id} seed ${seed} depth ${depth}: ${c.bad.slice(0, 3).join('; ')}`);
        pv.shapes[g.mine.shape.join('')] = (pv.shapes[g.mine.shape.join('')] || 0) + 1;
        pv.pools += g.mine.pools.length; pv.caveLines += g.mine.edges.filter((e) => e.caveAt).length;
        for (const sp of g.spawns) { if (sp.rank === 'boss') { pv.bosses.add(sp.arch); if (!V.boss.includes(sp.arch)) pv.bossOff++; } else pv.roster.add(sp.arch); }
        for (const sp of g.spawns) if (sp.rank !== 'boss' && !V.look.roster.includes(sp.arch)) pv.off.push(sp.arch);
        if (!V.shapes.some((sh) => sh.join() === g.mine.shape.join())) bad.push(`${V.id}: a shape not its own (${g.mine.shape})`);
        shapes[g.mine.shape.join('')] = (shapes[g.mine.shape.join('')] || 0) + 1;
        rides += c.rides; junctions += c.junctions; tunnels += g.mine.edges.length; arches += g.mine.arches;
      }
        pv.roster = [...pv.roster]; pv.bosses = [...pv.bosses]; pv.off = [...new Set(pv.off)];
      }
      return { bad, per, shapes, rides: rides / n, junctions: junctions / n, lines: tunnels / n, arches: arches / n, ms: Math.round(performance.now() - t0), worstMs: Math.round(worst) };
    }, SEEDS);
    console.log('generation', JSON.stringify({ ...gen, per: undefined, bad: gen.bad.length }));
    for (const [id, pv] of Object.entries(gen.per)) {
      console.log(`  ${id}`, JSON.stringify(pv));
      if (pv.off.length) errors.push(`[gen] ${id}: monsters off its roster: ${pv.off.join(', ')}`);
      if (pv.bossOff > SEEDS * 0.25) errors.push(`[gen] ${id}: ${pv.bossOff} of ${SEEDS} bosses not its own kind`);
      if ((id === 'flooded' || id === 'forge') && pv.pools < SEEDS) errors.push(`[gen] ${id}: too few pools (${pv.pools} in ${SEEDS} mines)`);
      if (id === 'haunted' && pv.caveLines < SEEDS) errors.push(`[gen] haunted: too few loose roofs (${pv.caveLines} in ${SEEDS} mines)`);
      if (id !== 'haunted' && pv.caveLines) errors.push(`[gen] ${id}: loose roofs outside the Collapsed Dig`);
    }
    for (const b of gen.bad.slice(0, 10)) errors.push('[gen] ' + b);
    if (gen.junctions < 1) errors.push('[gen] no junctions');
    if (gen.arches < gen.lines * 0.5) errors.push(`[gen] few tunnel mouths have arches (${gen.arches} for ${gen.lines} lines)`);

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
        const t = (tiers[s.k] ||= { n: 0, elite: 0, lv: 0, nn: 0, shafts: new Set() }); t.n++; t.shafts.add(s.id); if (c.rank !== 'normal') t.elite++; else { t.lv += c.level; t.nn++; }
      }
      const perTier = Object.entries(tiers).map(([k, t]) => [+k, +(t.n / t.shafts.size).toFixed(1), t.elite, t.nn ? +(t.lv / t.nn).toFixed(1) : 0]);
      const atlas = minecartAtlas();
      return { L: run.mine.L, carts: shafts, levers, variant: run.variant.id, tileset: window.__ts, atlas: atlas ? [atlas.width, atlas.height] : null, shafts: mine.length, perTier,
        boss: w.boss && { name: w.boss.name, art: w.boss.art, at: run.shaftAt(w.boss.x, w.boss.y)?.name }, title: run.title, start: run.at.name };
    });
    console.log('live', JSON.stringify(info));
    if (!info.tileset) errors.push('[live] the world does not draw with the mine tile set');
    if (info.variant !== 'dwarven') errors.push('[live] the skull word "mines dwarven" built ' + info.variant);
    if (!info.atlas) errors.push('[live] the minecart was not baked (three.js)');
    if (!info.carts) errors.push('[live] no carts');
    if (!info.boss || info.boss.at !== 'The Bottom') errors.push('[live] no boss at the Bottom');
    const pt = info.perTier.filter(([k]) => k > 0 && k < info.L);   // monsters per shaft by tier: more below
    if (pt.length >= 2 && pt[pt.length - 1][1] < pt[0][1]) errors.push('[live] the deep shafts hold fewer monsters than the first: ' + JSON.stringify(info.perTier));
    const lv = info.perTier.filter((t) => t[3]).sort((a, b) => a[0] - b[0]);   // normal monsters' mean level by tier: higher below
    if (lv.length >= 2 && !(lv[lv.length - 1][3] > lv[0][3])) errors.push('[live] monster levels do not grow by tier: ' + JSON.stringify(info.perTier));

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
    // ------------------------------------------------ and back up: the cart waits at the lower stop
    const upRide = async (name) => {
      const r = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, s = run.at, c = run.parkedAt(s);
        if (!c) return { err: 'no cart parked at ' + s.name };
        const portal = w.portals.find((q) => q.type === 'minecart' && Math.abs(q.x - c.x) < 0.01 && Math.abs(q.y - c.y) < 0.01), want = c.shaft;
        const p = w.player; [p.x, p.y] = s.offIn;   // where the hero stepped off
        for (const m of w.creatures) if (m.team === 'enemy' && !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 9 && m !== w.boss) m.dead = true;
        const label = portal && portal.label, n0 = run.ridesUp;
        portal.use();
        const started = !!run.ride && run.ride.up && !!G.cine;
        for (let i = 0; i < 100; i++) { G.time += 1 / 60; game.update(1 / 60); }
        game.render();
        // the cart faces the way it goes: back up the line (the reverse of the line's own heading)
        const R = run.ride, fwd = R ? R.e.pts[Math.min(R.e.pts.length - 1, Math.round((R.e.len - R.s) / R.e.step))][2] : 0;
        const faces = R ? Math.cos(R.cart.ang - fwd) < -0.7 : false;
        return { label, started, faces, want: want.name, n0 };
      });
      if (r.err) { errors.push('[up] ' + r.err); return r; }
      if (SHOTS) await shot(name + '_riding');
      const end = await page.evaluate(() => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, p = w.player;
        for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); }
        const s = run.at, c = s.cart;
        return { at: s.name, shaft: run.shaftAt(p.x, p.y)?.name, walk: w.map.walkable(p.x, p.y) && w.map.circleFree(p.x, p.y, 0.3), z: p.z, home: !!c && !c.at && Math.hypot(c.x - s.outAt[0], c.y - s.outAt[1]) < 0.01, ridesUp: run.ridesUp, cine: !!G.cine };
      });
      Object.assign(r, end);
      await step(page, 1.2); if (SHOTS) await shot(name + '_arrival');
      return r;
    };
    const up1 = await upRide('mines_up');
    console.log('up', JSON.stringify(up1));
    if (!up1.err) {
      if (!up1.started) errors.push('[up] the parked cart did not ride back up');
      if (!/back up/.test(up1.label || '')) errors.push('[up] the parked cart has no "back up" label: ' + up1.label);
      if (!up1.faces) errors.push('[up] the cart does not face the way it rides (up the line)');
      if (up1.at !== up1.want || up1.shaft !== up1.want || !up1.walk || up1.z) errors.push(`[up] the ride up did not set the hero down on open ground in ${up1.want}: ${JSON.stringify(up1)}`);
      if (!up1.home || up1.ridesUp !== up1.n0 + 1) errors.push('[up] the cart is not home at its out stop after the ride up');
    }
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
    // ------------------------------------------------ back out of a junction: down one line, back up, the other line
    const backout = await page.evaluate(() => {
      const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, p = w.player;
      const J = run.mine.shafts.find((s) => s.out.length > 1 && !s.cart.at);
      if (!J) return null;
      const settle = () => { for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); } for (let i = 0; i < 20; i++) { G.time += 1 / 60; game.update(1 / 60); } };
      const clear = () => { for (const m of w.creatures) if (m.team === 'enemy' && !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 9 && m !== w.boss) m.dead = true; };
      [p.x, p.y] = J.offOut; run.at = J; clear();
      const first = J.out[J.pick].to; J.cart.portal.use(); settle();
      const a = run.at;
      [p.x, p.y] = a.offIn; clear(); run.parkedAt(a).portal.use(); settle();
      const back = run.at;
      J.lever.use();
      const second = J.out[J.pick].to; [p.x, p.y] = J.offOut; J.cart.portal.use(); settle();
      return { junction: J.name, first: first.name, a: a.name, back: back.name, second: second.name, b: run.at.name, inB: run.shaftAt(p.x, p.y)?.name };
    });
    console.log('back out', JSON.stringify(backout));
    if (backout && (backout.a !== backout.first || backout.back !== backout.junction || backout.second === backout.first || backout.b !== backout.second || backout.inB !== backout.second))
      errors.push('[back out] could not back out of the junction and take the other line: ' + JSON.stringify(backout));
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
    // ------------------------------------------------ the Bottom rides back up too (the exit stays the way on)
    const up2 = await upRide('mines_up_bottom');
    console.log('up from the Bottom', JSON.stringify(up2));
    if (up2.err || !up2.started || up2.at !== up2.want || up2.shaft !== up2.want || !up2.walk) errors.push('[up] could not ride up from the Bottom: ' + JSON.stringify(up2));
    const again = await page.evaluate(() => {   // and down again: the run still knows it's won, the exit still open
      const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, p = w.player, o = run.objective;
      if (!o) return { err: 'no way back down' };
      [p.x, p.y] = [o.x, o.y]; o.use();
      for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); }
      const ex = w.portals.find((q) => q.type === 'exit');
      return { bottom: run.bottom, done: run.completed, exit: ex && ex.active };
    });
    console.log('down again', JSON.stringify(again));
    if (!again.bottom || !again.done || !again.exit) errors.push('[up] riding back down to the Bottom failed: ' + JSON.stringify(again));
    const q = await page.evaluate(async () => { const { renderQuest } = await import('/src/ui/quest.js'); const d = document.createElement('div'); renderQuest(d); return d.textContent.slice(0, 400); });
    console.log('quest', q.replace(/\s+/g, ' '));
    if (!/Ride the minecarts/.test(q)) errors.push('[quest] the Quest Log has no mine steps');

    // ------------------------------------------------ the five variants: live, their twists, shots, auto-play
    const VARIANTS = ONLY.length ? ONLY : ['dwarven', 'flooded', 'crystal', 'forge', 'haunted'];
    for (const vid of VARIANTS) {
      await page.evaluate(async (vid) => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
        window.__oldWorld = G.world;
        await game.newChar('paladin', 'Digger');
        G.char.depth = 3; G.godMode = true;
        if (G.world) G.world.depth = 3;
        (G.regionWant ||= {}).deep_mines = vid;
        await game.teleportToBiome(BIOME_BY_ID.deep_mines);
      }, vid);
      await waitMine(page);
      const live = await page.evaluate(async () => {
        const { G } = window.VELSCOUR, w = G.world, run = w.overworldScenario, V = run.variant, { mineTileSet } = await import('/src/world/mines.js');
        const foes = w.creatures.filter((c) => c.team === 'enemy' && !c.dead);
        return { id: V.id, name: V.name, shape: run.mine.shape.join(''), tileset: w.tileset === mineTileSet(V), torch: w.biome.torch === V.look.torch, dark: w.biome.dark,
          off: [...new Set(foes.filter((c) => c !== w.boss && !V.look.roster.includes(c.arch)).map((c) => c.arch))], boss: w.boss && w.boss.arch, pools: run.mine.pools.length,
          caves: run.mine.edges.filter((e) => e.caveAt).length, intro: [...document.querySelectorAll('#log *')].map((e) => e.textContent).filter((t) => t.includes(V.name)).length };
      });
      console.log(`variant ${vid}`, JSON.stringify(live));
      if (live.id !== vid) errors.push(`[${vid}] G.regionWant built ${live.id}`);
      if (!live.tileset || !live.torch) errors.push(`[${vid}] the world is not in the variant's tile set or light`);
      if (live.off.length) errors.push(`[${vid}] monsters off its roster: ${live.off}`);
      // a ride with the twist: the haunted one on a loose roof, the crystal one hurt first
      const r1 = await page.evaluate(() => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, V = run.variant, p = w.player, M = run.mine;
        let S = M.shafts[0], k = 0;
        if (V.twist === 'cavein') { const e = M.edges.find((q) => q.caveAt && q.from.cart); if (e) { S = e.from; k = S.out.indexOf(e); } }
        S.pick = k; run.at = S; S.cart.ang = S.out[k].pts[0][2];
        [p.x, p.y] = S.offOut;
        for (const m of w.creatures) if (m.team === 'enemy' && !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 10 && m !== w.boss) m.dead = true;
        if (V.twist === 'glow') p.hp = p.maxHp * 0.4;
        S.cart.portal.use();
        const e = run.ride && run.ride.e, half = e ? (e.caveAt || 0.45) * e.len + 0.6 : 0;
        let maxV = 0, i = 0;
        for (; i < 60 * 30 && run.ride && run.ride.s < half; i++) { G.time += 1 / 60; game.update(1 / 60); maxV = Math.max(maxV, run.ride.v); }
        game.render();
        return { riding: !!run.ride, to: e && e.to.name, maxV, caveins: run.caveins, t: i / 60 };
      });
      if (SHOTS) await shot(`mines_v_${vid}_ride`);
      const r2 = await page.evaluate(() => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, p = w.player, t0 = w.time;
        let maxV = 0;
        for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); if (run.ride) maxV = Math.max(maxV, run.ride.v); }
        return { at: run.at.name, inShaft: run.shaftAt(p.x, p.y)?.name, walk: w.map.walkable(p.x, p.y), hp: p.hp / p.maxHp, mends: run.mends, caveins: run.caveins, maxV, rubble: run.mine.edges.some((e) => e.rubble && e.rubble.length) };
      });
      console.log(`  ride`, JSON.stringify({ ...r1, ...r2 }));
      if (!r1.riding || r2.at !== r1.to || r2.inShaft !== r1.to || !r2.walk) errors.push(`[${vid}] the ride did not set the hero down in ${r1.to}: ${JSON.stringify(r2)}`);
      if (vid === 'flooded' && Math.max(r1.maxV, r2.maxV) > 4.9) errors.push(`[flooded] the cart ran at ${Math.max(r1.maxV, r2.maxV)} tiles/s (should crawl)`);
      if (vid !== 'flooded' && Math.max(r1.maxV, r2.maxV) < 7) errors.push(`[${vid}] the cart never reached full speed`);
      if (vid === 'crystal' && (!r2.mends || !(r2.hp > 0.55))) errors.push(`[crystal] the vein did not mend the rider (life ${r2.hp})`);
      if (vid === 'haunted' && live.caves && (r2.caveins !== 1 || !r2.rubble)) errors.push(`[haunted] no cave-in on a loose roof: ${JSON.stringify(r2)}`);
      if (vid === 'haunted' && SHOTS) {   // the cave-in from close up: ride the loose line back up and stop as it comes down
        await page.evaluate(() => {
          const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, s = run.at, c = run.parkedAt(s), p = w.player;
          if (!c || !c.at.caveAt) return;
          [p.x, p.y] = s.offIn; c.portal.use();
          const n0 = run.caveins;
          for (let i = 0; i < 60 * 30 && run.ride && run.caveins === n0; i++) { G.time += 1 / 60; game.update(1 / 60); }
          for (let i = 0; i < 20; i++) { G.time += 1 / 60; game.update(1 / 60); }
          game.render();
        });
        await shot('mines_v_haunted_cavein');
        await page.evaluate(() => { const { G, game } = window.VELSCOUR, run = G.world.overworldScenario; for (let i = 0; i < 60 * 30 && (run.ride || G.cine); i++) { G.time += 1 / 60; game.update(1 / 60); } });
      }
      // pools: wade into water (slowed), stand by magma (it flares under you)
      if (live.pools) {
        const pool = await page.evaluate(() => {
          const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, p = w.player, M = run.mine;
          const q = M.pools.find((o) => M.shafts[o.shaft] === run.at) || M.pools[0], S = M.shafts[q.shaft];
          run.at = S;
          const lava = q.kind === 'magma';
          if (lava) { const a = Math.atan2(S.y - q.y, S.x - q.x); [p.x, p.y] = [q.x + Math.cos(a) * (q.r + 1.3), q.y + Math.sin(a) * (q.r + 1.3)]; if (!w.map.walkable(p.x, p.y)) [p.x, p.y] = w.map.randomNear(p.x, p.y, 2); }
          else [p.x, p.y] = [q.x, q.y];
          for (const m of w.creatures) if (m.team === 'enemy' && !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 12 && m !== w.boss) m.dead = true;
          p.path = null; p.moveTarget = null;
          const f0 = run.flares;
          let slowed = false, ring = false;
          for (let i = 0; i < 60 * 7; i++) {
            G.time += 1 / 60; game.update(1 / 60);
            if (p.status.slow && p.status.slow.t > 0) slowed = true;
            if (lava && run.flares > f0 && !ring) { ring = true; for (let j = 0; j < 40; j++) { G.time += 1 / 60; game.update(1 / 60); } break; }
          }
          game.render();
          return { kind: q.kind, slowed, flares: run.flares - f0 };
        });
        console.log('  pool', JSON.stringify(pool));
        if (pool.kind === 'water' && !pool.slowed) errors.push('[flooded] wading a pool did not slow the hero');
        if (pool.kind === 'magma' && !pool.flares) errors.push('[forge] a magma pool beside the hero never flared');
      } else if (vid === 'flooded' || vid === 'forge') errors.push(`[${vid}] this mine has no pools`);
      if (SHOTS) { if (!live.pools) await step(page, 0.6); await shot(`mines_v_${vid}`); }
      if (!AUTO) continue;
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { Auto } = await import('/src/game/autoplay.js');
        const w = G.world, run = w.overworldScenario, t0 = performance.now(), log = [];
        Auto.toggle(true);
        let last = '';
        for (let s = 0; s < 60 * 30 && G.world === w; s++) {   // up to 30 game minutes
          for (let i = 0; i < 60; i++) { G.time += 1 / 60; game.update(1 / 60); }
          const ph = run.at.name + (run.completed ? ' done' : '');
          if (ph !== last) { log.push(`${(s / 60).toFixed(1)} min: ${ph}`); last = ph; }
          if (run.completed) break;
        }
        Auto.toggle(false);
        const ex = w.portals.find((q) => q.type === 'exit');
        return { log, done: run.completed, rides: run.rides, ridesUp: run.ridesUp, path: run.path, exit: ex && ex.active, caveins: run.caveins, flares: run.flares, ms: Math.round(performance.now() - t0) };
      });
      console.log('  auto-play', JSON.stringify(res));
      if (!res.done || !res.exit) errors.push(`[${vid} auto-play] did not clear the mine`);
      // the twist ride above went down one line by hand (and the haunted one back up): only auto-play's own rides count
      const handUp = vid === 'haunted' && SHOTS && live.caves ? 1 : 0;
      if (res.ridesUp > handUp) errors.push(`[${vid} auto-play] rode back up (ping-pong): ` + res.path.join(' > '));
      if (SHOTS) { await step(page, 0.5); await shot(`mines_v_${vid}_end`); }
    }
  } catch (e) { errors.push(String(e && e.stack || e)); }
  await browser.close();
  report(errors);
})();
