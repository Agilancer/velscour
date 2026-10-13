// Biome pack levels: build many dungeons and check the architecture (wall arms, arches, doors, scatter), that every
// open tile is still reachable, and that doors open when the hero walks up. Screenshots a door (closed, then open),
// an arch, and a room per biome given.
//   node tools/tests/pack.js [biome,biome,...]      (default catacombs,blood,frozen)
const { openGame, report } = require('./harness');

(async () => {
  const biomes = (process.argv[2] || 'catacombs,blood,frozen').split(',');
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(800);
  const stats = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { BIOMES } = await import('/src/data/biomes.js');
    const { loadBiomeArt } = await import('/src/core/assets.js');
    const out = { levels: 0, arches: 0, doors: 0, arms: 0, props: 0, unreachable: 0, bad: [] };
    for (let i = 0; i < 24; i++) {
      const b = BIOMES[i % BIOMES.length];
      await loadBiomeArt(b);
      game.buildDungeon(1 + i * 4, b);
      const m = G.world.map;
      out.levels++;
      out.arms += m.walls.filter((w) => w.kind === 'wall').length;
      out.arches += new Set(m.walls.filter((w) => w.kind === 'arch').map((w) => w.x + ',' + w.y)).size;
      out.doors += m.doors.length;
      out.props += G.world.props.length;
      if (m.walls.some((w) => !isFinite(w.depth))) out.bad.push('NaN depth in ' + b.id);
      // reachability from the hero
      const W = m.w, seen = new Uint8Array(m.t.length), q = [Math.floor(G.player.y) * W + Math.floor(G.player.x)];
      seen[q[0]] = 1;
      while (q.length) {
        const j = q.pop();
        for (const k of [j - 1, j + 1, j - W, j + W]) if (!seen[k] && m.walkableTile(k % W, (k / W) | 0)) { seen[k] = 1; q.push(k); }
      }
      for (let j = 0; j < m.t.length; j++) if (m.walkableTile(j % W, (j / W) | 0) && !seen[j]) out.unreachable++;
    }
    return out;
  });
  console.log('pack levels', JSON.stringify(stats));
  if (stats.unreachable || stats.bad.length || !stats.arches || !stats.doors) errors.push('[pack] ' + JSON.stringify(stats));

  for (const b of biomes) {
    // a level with a door
    const found = await page.evaluate(async (id) => {
      const { G, game } = window.VELSCOUR; G.godMode = true;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      await loadBiomeArt(BIOME_BY_ID[id]);
      for (let t = 0; t < 30; t++) {
        game.buildDungeon(5, BIOME_BY_ID[id]);
        if (G.world.map.doors.length) break;
      }
      for (const c of G.world.creatures) if (c !== G.player) { c.x = -999; c.y = -999; }
      const d = G.world.map.doors[0];
      if (!d) return null;
      // stand in front of the doorway (toward the camera), two tiles off
      const n = d.axis === 'x' ? [0, 1] : [1, 0];
      G.player.x = d.x + n[0] * 2.2 + (d.axis === 'x' ? 0.5 : 0); G.player.y = d.y + n[1] * 2.2 + (d.axis === 'y' ? 0.5 : 0);
      return { x: d.x, y: d.y };
    }, b);
    if (!found) { errors.push(`[pack] no door in 30 ${b} levels`); continue; }
    await page.evaluate(async () => { const { camera } = await import('/src/core/view.js'); camera.zoom = 2.2; });
    await page.waitForTimeout(3200);
    await shot(`pack_${b}_door_closed`);
    const opened = await page.evaluate(async () => {
      const { G } = window.VELSCOUR; const d = G.world.map.doors[0];
      G.player.x = d.x + 0.4; G.player.y = d.y + 0.4;
      await new Promise((r) => setTimeout(r, 400));
      const p = G.world.map.doors.filter((o) => o.open).length;
      const n = d.axis === 'x' ? [0, 1] : [1, 0];
      G.player.x = d.x + n[0] * 2.2 + (d.axis === 'x' ? 0.5 : 0); G.player.y = d.y + n[1] * 2.2 + (d.axis === 'y' ? 0.5 : 0);
      return p;
    });
    if (!opened) errors.push(`[pack] door did not open in ${b}`);
    await page.waitForTimeout(600);
    await shot(`pack_${b}_door_open`);
    // an arch
    await page.evaluate(() => {
      const { G } = window.VELSCOUR; const a = G.world.map.walls.find((w) => w.kind === 'arch');
      if (!a) return;
      const n = a.axis === 'x' ? [0, 1] : [1, 0];
      G.player.x = a.x + n[0] * 2.2; G.player.y = a.y + n[1] * 2.2;
    });
    await page.waitForTimeout(600);
    await shot(`pack_${b}_arch`);
  }
  report(errors);
  await browser.close();
})();
