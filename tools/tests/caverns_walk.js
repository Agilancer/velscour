// DEPTH'S EDGE CAVERNS, walked in: the hero walks the delve route from the start to the passage at the falls' foot,
// a step at a time, and must come out in the shaft. Nothing at the top of the falls may stir on the way: the plateau
// stands right above the passage, so a boss that woke there left the hero stuck at a door that would not open (a
// player report). The look at the falls when the lake opens must keep the hero on screen, and end early when he's hurt.
//   node tools/tests/caverns_walk.js [variants e.g. 0,2|all] [seeds]   (server first: python -m http.server 8123)
const { openGame, report } = require('./harness');
const range = (s, all) => !s || s === 'all' ? all : s.split(',').map(Number);
const VARIANTS = range(process.argv[2], [0, 1, 2, 3, 4, 5]), SEEDS = Number(process.argv[3]) || 2;

(async () => {
  const { browser, page, errors } = await openGame({ width: 1366, height: 820 });
  try {
    await page.evaluate(async () => { await window.VELSCOUR.game.newChar('wizard', 'Walker'); const { G } = window.VELSCOUR; G.char.depth = 12; G.godMode = true; });
    for (const vi of VARIANTS) for (let s = 0; s < SEEDS; s++) {
      await page.evaluate(async (vi) => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.caveVariant = vi; G.caveBosses = 2;
        await game.teleportToBiome(BIOME_BY_ID.depths_edge);
      }, vi);
      await page.waitForFunction(() => window.VELSCOUR.G.world?.cave && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 90000 });
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, cr = w.cave, cv = cr.cv, p = w.player, bad = [];
        const { camera, isoX, isoY } = await import('/src/core/view.js');
        const tick = () => { G.time += 1 / 60; game.update(1 / 60); };
        // the route from the start to the passage, walked at 5 tiles a second; every foe in reach falls
        const pts = cv.route, look = { on: 0, off: 0, worst: 0 };
        let firstSummit = null;
        for (let k = 1; k < pts.length && run.phase === 'delve'; k++) {
          const [ax, ay] = pts[k - 1], [bx, by] = pts[k], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (5 / 60)));
          for (let j = 1; j <= n && run.phase === 'delve'; j++) {
            p.x = ax + (bx - ax) * j / n; p.y = ay + (by - ay) * j / n; p.path = null; p.moveTarget = null;
            for (const c of w.creatures) if (c.team === 'enemy' && !c.dead && !c.entering && Math.hypot(c.x - p.x, c.y - p.y) < 8) c.hp = 0, c.dead = true;
            tick();
            if (cr.lookT > 0) {   // the hero stays well inside the view while the camera leans to the falls
              look.on++;
              const hx = isoX(p.x, p.y), hy = isoY(p.x, p.y) - 24, z = camera.zoom;
              const off = Math.max(Math.abs(hx - camera.x) * z / (G.W / 2), Math.abs(hy - camera.y) * z / (G.H / 2));
              look.worst = Math.max(look.worst, off);
            }
            if (run.phase === 'summit' && !firstSummit) firstSummit = [p.x, p.y];
          }
        }
        // and on into the passage: a moment at its far end
        for (let i = 0; i < 120 && run.phase === 'delve'; i++) { p.x = cv.notchIn[0]; p.y = cv.notchIn[1]; tick(); }
        for (let i = 0; i < 90; i++) tick();
        if (firstSummit) bad.push(`the top of the falls woke at ${firstSummit.map((q) => q.toFixed(1))} before the shaft`);
        if (run.phase !== 'climb') bad.push(`phase ${run.phase} after the passage (expected climb)`);
        if (Math.hypot(p.x - cv.arrive[0], p.y - cv.arrive[1]) > 2.5) bad.push('the party did not come out in the shaft');
        if (look.worst > 0.8) bad.push(`the hero left the view during the look at the falls (${look.worst.toFixed(2)} of the half-screen)`);
        // a hit during the look ends it at once
        cr.look = [cv.plunge[0], cv.plunge[1], 4]; cr.lookT = cr.lookDur = 3;
        p.flash = 0.1; cr.frame(1 / 60);
        const ended = cr.lookT <= 0.35;   // (a third of a second to ease back)
        if (!ended) bad.push('the look at the falls did not end when the hero was hurt');
        cr.look = null; cr.lookT = 0;
        return { bad, v: cv.v.id, phase: run.phase, look: { frames: look.on, worst: +look.worst.toFixed(2) }, ended };
      });
      console.log('variant', vi, 'seed', s, JSON.stringify(res));
      for (const b of res.bad) errors.push(`[variant ${vi}/${s}] ${b}`);
    }
  } catch (e) { errors.push(String(e && e.stack || e)); }
  await browser.close();
  report(errors);
})();
