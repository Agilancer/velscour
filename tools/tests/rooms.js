// Shaped dungeon rooms and scatter set pieces: builds levels in a few biomes, checks every floor tile is reachable from
// the start, counts shapes/plans and screenshots one room of each. Usage: node tools/tests/rooms.js [biomes] [levels]
const { openGame, report } = require('./harness');
const biomes = (process.argv[2] || 'catacombs,cathedral,necropolis,frozen,hell').split(','), levels = +(process.argv[3] || 6);
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  await page.evaluate(async () => { const { G, game } = window.VELSCOUR; await game.newChar('paladin', 'Rooms'); document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.godMode = true; });
  const shotDone = new Set();
  for (const id of biomes) for (let l = 0; l < levels; l++) {
    const r = await page.evaluate(async ([id, l]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      const b = BIOME_BY_ID[id]; await loadBiomeArt(b);
      game.buildDungeon(8 + l * 7, b);
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const w = G.world, m = w.map, p = G.player;
      // flood fill from the hero over walkable tiles
      const seen = new Uint8Array(m.t.length), q = [Math.floor(p.y) * m.w + Math.floor(p.x)]; seen[q[0]] = 1;
      while (q.length) { const i = q.pop(), x = i % m.w, y = (i / m.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * m.w + x + dx; if (!seen[j] && m.walkableTile(x + dx, y + dy)) { seen[j] = 1; q.push(j); } } }
      let lost = 0; for (let i = 0; i < m.t.length; i++) if (m.walkableTile(i % m.w, (i / m.w) | 0) && !seen[i]) lost++;
      const ex = w.portals.find((o) => o.type === 'exit'), exitOk = !!seen[Math.floor(ex.y) * m.w + Math.floor(ex.x)];
      const chestsOk = w.chests.every((c) => m.walkable(c.x, c.y));
      w.creatures = w.creatures.filter((c) => c === p);
      return { lost, exitOk, chestsOk, rooms: (w.genRooms || []).length };
    }, [id, l]);
    const info = await page.evaluate(async () => (window.VELSCOUR.G.world.rooms || []).map((r) => [r.shape, r.plan, r.mx, r.my]));
    console.log(`${id} L${l}: lost=${r.lost} exitOk=${r.exitOk} chestsOk=${r.chestsOk} rooms=${info.map((x) => (x[0] || '-') + '/' + (x[1] || '-')).join(' ')}`);
    if (r.lost || !r.exitOk || !r.chestsOk) errors.push(`${id} L${l}: lost ${r.lost} exit ${r.exitOk} chests ${r.chestsOk}`);
    for (const [shape, plan, mx, my] of info) {
      const key = (shape !== 'rect' ? shape : '') + (plan || '');
      if (!key || shotDone.has(key)) continue;
      shotDone.add(key);
      await page.evaluate(([x, y]) => { const { G } = window.VELSCOUR; const p = G.player; const m = G.world.map; let [px, py] = [x, y]; if (!m.walkable(px, py)) [px, py] = m.randomNear(x, y, 3); p.x = px; p.y = py; }, [mx, my]);
      await page.waitForTimeout(700);
      await shot(`room_${key}_${id}`);
    }
  }
  report(errors);
  await browser.close();
})();
