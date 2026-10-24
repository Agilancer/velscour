// DEPTH'S EDGE CAVERNS (docs/DEPTHS_EDGE.md): the skull ("caverns") reaches it and it is in the overworld draw; every
// variant builds its 3D cave; the height field lifts the hero where the 3D floor is and picking inverts it; the route
// runs from the start to the passage at the falls' foot, the passage moves the party into the shaft, the ledge climbs
// to the top of the falls, the bosses come and the portal opens. Screenshots of each variant: the start, a cavern,
// the lake and its waterfall, the shaft from its foot and halfway up, the top of the falls, a boss; then auto-play.
//   node tools/tests/caverns.js [variants e.g. 0,2|all] [noauto] [noshots]   (server first: python -m http.server 8123)
// Windows with a GPU: CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist" (SwiftShader is slow).
const { openGame, report } = require('./harness');
const arg = (k) => process.argv.slice(2).includes(k);
const range = (s, all) => !s || s === 'all' || !/^[\d,-]+$/.test(s) ? all : s.includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(s.split('-').map(Number)) : s.split(',').map(Number);
const VARIANTS = range(process.argv[2], [0, 1, 2, 3, 4, 5]);
const AUTO = !arg('noauto'), SHOTS = !arg('noshots');

const step = (page, secs) => page.evaluate(async (secs) => {   // run the game for `secs` at 60 fps, rendering every 4th frame
  const { G, game } = window.VELSCOUR;
  for (let i = 0; i < secs * 60; i++) { G.time += 1 / 60; game.update(1 / 60); if (i % 4 === 3) game.render(); }
  game.render();
}, secs);
/** Put the hero at (x, y), clear monsters off the spot, let the camera settle. */
const place = (page, x, y, clear = 10) => page.evaluate(({ x, y, clear }) => {
  const { G } = window.VELSCOUR, w = G.world, p = w.player, m = w.map;
  let [px, py] = [x, y];
  if (!m.walkable(px, py)) [px, py] = m.randomNear(x, y, 3);
  p.x = px; p.y = py; p.path = null; p.moveTarget = null; p.attackTarget = null;
  for (const c of w.creatures) if (c !== p && c.team === 'enemy' && Math.hypot(c.x - p.x, c.y - p.y) < clear) { c.dead = true; }
  return [px, py];
}, { x, y, clear });

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 820 });
  try {
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('wizard', 'Delver'); const { G } = window.VELSCOUR; G.char.depth = 12; G.godMode = true; });
    // ------------------------------------------------ the skull and the draw
    await page.waitForTimeout(300);
    await page.click('#velscour-skull');
    await page.fill('#velscour-message', 'caverns');
    await page.click('.velscour-contact-dialog button:has-text("Send")');
    await page.waitForFunction(() => window.VELSCOUR.G.world?.biome?.id === 'depths_edge' && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 90000 });
    const draw = await page.evaluate(async () => {
      const { drawBiome, OVERWORLD_BIOME_IDS } = await import('/src/data/biomes.js');
      const c = { biomeBag: [], overworldMisses: 0 }; let n = 0;
      for (let i = 0; i < 4000; i++) { c.overworldMisses = i % 4; const id = drawBiome(c, 10 + (i % 30)); if (id === 'depths_edge') n++; c.lastBiome = id; }
      return { drawn: n, overworld: OVERWORLD_BIOME_IDS.includes('depths_edge') };
    });
    console.log('draw', JSON.stringify(draw));
    if (!draw.drawn || !draw.overworld) errors.push('[draw] the caverns are not in the rotation');

    for (const vi of VARIANTS) {
      await page.evaluate(async (vi) => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.caveVariant = vi; G.caveBosses = 1 + (vi % 3);
        await game.teleportToBiome(BIOME_BY_ID.depths_edge);
      }, vi);
      await page.waitForFunction(() => window.VELSCOUR.G.world?.cave && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 90000 });
      await page.waitForTimeout(400);
      const info = await page.evaluate(async () => {
        const { G } = window.VELSCOUR, w = G.world, cr = w.cave, cv = cr.cv, m = w.map, bad = [];
        const { isoX, isoY } = await import('/src/core/view.js');
        const { caveScene } = await import('/src/gfx/cave3d.js');
        const S = caveScene();
        if (!S || S.cv !== cv) bad.push('the 3D cave was not built');
        // picking inverts the lift round the hero (on walkable ground)
        let worst = 0, n = 0;
        for (let i = 0; i < 200 && n < 40; i++) {
          const x = w.player.x + (Math.random() - 0.5) * 12, y = w.player.y + (Math.random() - 0.5) * 12;
          if (!m.walkable(x, y) || m.wet[m.tileIdx(x, y)]) continue;   // (shallow water sits under the deep water's surface)
          n++;
          // the ground picked must show at that very point of the screen (a point hidden behind higher ground picks
          // what hides it), and be the point itself when nothing in front reaches above it
          const wx = isoX(x, y), wy = isoY(x, y), [px, py] = cr.pick(wx, wy);
          worst = Math.max(worst, Math.hypot(isoX(px, py) - wx, isoY(px, py) - wy) / 32);
          if (!cr.horizon({ x, y, viewH: 1 }) && Math.hypot(px - x, py - y) > 0.3) worst = Math.max(worst, Math.hypot(px - x, py - y));
        }
        if (worst > 0.3) bad.push('picking misses by ' + worst.toFixed(3));
        if (!cv.okMain || !cv.okClimb) bad.push('the route is cut');
        const props = S && S.props ? Object.fromEntries(Object.entries(S.props).map(([k, l]) => [k, l.length])) : null;
        return { bad, v: cv.v.id, size: [m.w, m.h], mobs: w.creatures.length, droppers: w.creatures.filter((c) => c.caveDrop).length, torches: cv.torches.length, props, pick: worst.toFixed(3),
          arts: [...new Set(w.creatures.filter((c) => c.team === 'enemy').map((c) => c.art))].length, faction: w.creatures.filter((c) => c.team === 'enemy').every((c) => c.art && c.art.startsWith('de_')) };
      });
      console.log('variant', vi, JSON.stringify(info));
      for (const b of info.bad) errors.push(`[variant ${vi}] ${b}`);
      if (!info.faction) errors.push(`[variant ${vi}] a monster that is not a Depth's Edge creature`);
      await step(page, 0.6); if (SHOTS) await shot(`caverns_${vi}_start`);
      const P = await page.evaluate(() => { const cv = window.VELSCOUR.G.world.cave.cv; return { cav: cv.caverns.map((c) => [c.x, c.y]), lake: [cv.lake.x, cv.lake.y], entry: cv.entry, notch: cv.notch, plunge: cv.plunge, arrive: cv.arrive, plat: [cv.plateau.x, cv.plateau.y], mid: cv.spiral(cv.shaft.thEnd * 0.55), top: cv.spiral(cv.shaft.thEnd * 0.9) }; });
      await place(page, ...P.cav[1]); await step(page, 1.2); if (SHOTS) await shot(`caverns_${vi}_cavern`);
      await place(page, P.entry[0], P.entry[1]); await step(page, 1.5); if (SHOTS) await shot(`caverns_${vi}_lake`);
      await place(page, P.notch[0] + 1.5, P.notch[1] + 1.5); await step(page, 1.2); if (SHOTS) await shot(`caverns_${vi}_falls`);
      await page.evaluate(() => { const cr = window.VELSCOUR.G.world.cave, cv = cr.cv; cr.look = [cv.plunge[0] + 1, cv.plunge[1] + 1, (cv.HP - cv.WL) * 0.4]; cr.lookT = 999; cr.lookDur = 1000; });
      await step(page, 1.6); if (SHOTS) await shot(`caverns_${vi}_waterfall`);
      await page.evaluate(() => { window.VELSCOUR.G.world.cave.lookT = 0; });
      // through the passage at the falls' foot: the party comes out in the shaft
      const moved = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, w = G.world, cv = w.cave.cv, p = w.player;
        p.x = cv.notchIn[0]; p.y = cv.notchIn[1];
        for (let i = 0; i < 120; i++) { G.time += 1 / 60; game.update(1 / 60); }
        return { phase: w.overworldScenario.phase, at: [p.x, p.y], arrive: cv.arrive };
      });
      console.log('  passage', JSON.stringify(moved));
      if (moved.phase !== 'climb' || Math.hypot(moved.at[0] - moved.arrive[0], moved.at[1] - moved.arrive[1]) > 2) errors.push(`[variant ${vi}] the passage did not move the party into the shaft`);
      await step(page, 0.8); if (SHOTS) await shot(`caverns_${vi}_shaft_foot`);
      await place(page, P.mid.x, P.mid.y); await step(page, 1.2); if (SHOTS) await shot(`caverns_${vi}_shaft_mid`);
      await place(page, P.top.x, P.top.y); await step(page, 1.2); if (SHOTS) await shot(`caverns_${vi}_shaft_top`);
      // the top of the falls: the bosses come one after another; the last one's fall opens the portal
      await place(page, P.plat[0] + 2, P.plat[1] + 2, 30);
      await step(page, 4.5);
      if (SHOTS) await shot(`caverns_${vi}_summit`);
      const fight = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, seen = [], { kill } = await import('/src/game/combat.js');
        for (let s = 0; s < 120 && !run.completed; s++) {
          for (let i = 0; i < 30; i++) { G.time += 1 / 60; game.update(1 / 60); }
          const b = run.top && run.top.boss;
          if (b && !b.entering && !b.dead) { if (!seen.includes(b.name)) seen.push(b.name); kill(b, w.player); }
          for (const c of w.creatures) if (c.team === 'enemy' && !c.dead && !c.entering && Math.hypot(c.x - w.player.x, c.y - w.player.y) < 20 && !c.isRaid) kill(c, w.player);
        }
        const ex = w.portals.find((q) => q.type === 'exit');
        return { done: run.completed, bosses: seen, n: run.top && run.top.n, exit: ex && ex.active, at: ex && [ex.x, ex.y] };
      });
      console.log('  summit', JSON.stringify(fight));
      if (!fight.done || !fight.exit) errors.push(`[variant ${vi}] the top of the falls was not won`);
      await step(page, 1); if (SHOTS) await shot(`caverns_${vi}_portal`);
    }
    // ------------------------------------------------ auto-play takes a whole cave
    if (AUTO) {
      await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
        await game.newChar('paladin', 'Climber');   // as in tower.js: a level-1 paladin at depth 3 (a wizard can kite a unique for ever)
        G.caveVariant = null; G.caveBosses = 2; G.char.depth = 3; G.godMode = true;
        if (G.world) G.world.depth = 3;   // the skull keeps the current depth: a level-1 hero should face depth 3
        await game.teleportToBiome(BIOME_BY_ID.depths_edge);
      });
      await page.waitForFunction(() => window.VELSCOUR.G.world?.cave && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 90000 });
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { Auto } = await import('/src/game/autoplay.js');
        const w = G.world, run = w.overworldScenario, t0 = performance.now(), log = [];
        Auto.toggle(true);
        let last = '';
        for (let s = 0; s < 60 * 25 && G.world === w; s++) {   // up to 25 game minutes
          for (let i = 0; i < 60; i++) { G.time += 1 / 60; game.update(1 / 60); }
          const ph = run.phase + (run.completed ? ' done' : '');
          if (ph !== last) { log.push(`${(s / 60).toFixed(1)} min: ${ph}`); last = ph; }
          if (run.completed) break;
        }
        Auto.toggle(false);
        return { log, done: run.completed, phase: run.phase, wp: run.wp, cwp: run.cwp, ms: Math.round(performance.now() - t0) };
      });
      console.log('auto-play', JSON.stringify(res));
      if (!res.done) errors.push(`[auto-play] did not take the cave (phase ${res.phase})`);
    }
  } catch (e) { errors.push(String(e && e.stack || e)); }
  await browser.close();
  report(errors);
})();
