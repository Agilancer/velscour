// Exercise all authored Castle Keep layouts through the real browser runtime.
// Run with: node tools/tests/castle_keep.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  try {
    await page.click('text=Heroes');
    await page.click('.class-card[data-id="paladin"]');
    await page.click('text=Begin');
    await page.waitForTimeout(500);
    const result = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { CASTLE_KEEP_LAYOUTS } = await import('/src/data/castlekeeplayouts.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      const biome = BIOME_BY_ID.castle_keep;
      await loadBiomeArt(biome);
      const seen = new Set(), failures = [];
      for (let i = 0; i < CASTLE_KEEP_LAYOUTS.length; i++) {
        let depth = i + 1;
        if (depth % 5 === 0) depth += 23; // preserve layout index while avoiding raid depth
        game.buildDungeon(depth, biome);
        const world = G.world, map = world.map, expected = CASTLE_KEEP_LAYOUTS[i];
        if (world.layoutId !== expected.id) failures.push(`${expected.id}: got ${world.layoutId}`);
        seen.add(world.layoutId);
        const start = [Math.floor(G.player.x), Math.floor(G.player.y)];
        const exit = [world.portals[1].x, world.portals[1].y];
        if (!map.walkableTile(start[0], start[1])) failures.push(`${expected.id}: blocked start`);
        if (!map.walkableTile(Math.floor(exit[0]), Math.floor(exit[1]))) failures.push(`${expected.id}: blocked exit`);
        const q = [start[1] * map.w + start[0]], reached = new Uint8Array(map.t.length);
        reached[q[0]] = 1;
        while (q.length) {
          const at = q.pop(), x = at % map.w, y = Math.floor(at / map.w);
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            const next = ny * map.w + nx;
            if (nx >= 0 && ny >= 0 && nx < map.w && ny < map.h && !reached[next] && map.walkableTile(nx, ny)) {
              reached[next] = 1; q.push(next);
            }
          }
        }
        if (!reached[Math.floor(exit[1]) * map.w + Math.floor(exit[0])]) failures.push(`${expected.id}: exit unreachable`);
        for (let at = 0; at < map.t.length; at++) {
          if (map.walkableTile(at % map.w, Math.floor(at / map.w)) && !reached[at]) {
            failures.push(`${expected.id}: disconnected floor tile ${at}`); break;
          }
        }
      }
      return { layouts: seen.size, expected: CASTLE_KEEP_LAYOUTS.length, failures };
    });
    console.log('Castle Keep layouts', JSON.stringify(result));
    if (result.layouts !== result.expected || result.failures.length) errors.push('[castle_keep] ' + JSON.stringify(result));
  } finally {
    await browser.close();
  }
  report(errors);
})();
