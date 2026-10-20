// Art review of every dungeon biome with the lights up: each biome's level built without monsters, darkness lowered
// (LIGHT, default 0.25, the level's own darkness if 'off'), and SHOTS rooms photographed from above at ZOOM, biggest
// first, with the room's theme name in the file name. Also prints the level's layout style and room themes.
// Usage: node tools/tests/biome_looks.js [ids,comma,separated] [depth] [prefix]
const { openGame, report } = require('./harness');
const only = (process.argv[2] || '').split(',').filter(Boolean);
const depth = +(process.argv[3] || 13), prefix = process.argv[4] || 'looks';
const SHOTS = +(process.env.SHOTS || 3), ZOOM = +(process.env.ZOOM || 1.15), LIGHT = process.env.LIGHT || '0.25';
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  try {
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Biome Looks');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0; G.godMode = true;
    });
    const ids = await page.evaluate(async (only) => {
      const { BIOMES } = await import('/src/data/biomes.js');
      return BIOMES.filter((b) => !b.overworld && b.id !== 'throne' && (!only.length || only.includes(b.id))).map((b) => b.id);
    }, only);
    for (const id of ids) {
      const info = await page.evaluate(async ([id, depth, ZOOM, LIGHT, SHOTS]) => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        const { loadBiomeArt } = await import('/src/core/assets.js');
        const b = BIOME_BY_ID[id];
        await loadBiomeArt(b);
        game.buildDungeon(depth, b);
        const w = G.world;
        w.creatures = w.creatures.filter((c) => c === G.player);
        if (LIGHT !== 'off') w.biome = { ...w.biome, dark: +LIGHT };
        G.settings.zoom = ZOOM; (await import('/src/core/view.js')).camera.computeZoom();
        const rooms = (w.rooms || []).filter((r) => r.w && r.type !== 'arena').sort((a, c) => c.w * c.h - a.w * a.h).slice(0, SHOTS);
        return { style: b.style, pack: w.tileset.pack, floors: w.tileset.floors.length, scatter: w.tileset.scatter.length,
          themes: (w.rooms || []).map((r) => r.theme).filter(Boolean), spots: rooms.map((r) => [r.mx, r.my, r.theme || r.type]) };
      }, [id, depth, ZOOM, LIGHT, SHOTS]);
      console.log(id, JSON.stringify({ ...info, spots: undefined }));
      for (let i = 0; i < info.spots.length; i++) {
        const [x, y, th] = info.spots[i];
        await page.evaluate(([x, y]) => { const { G } = window.VELSCOUR; G.player.x = x; G.player.y = y; G.hitStop = 1e9; }, [x, y]);
        await page.waitForTimeout(i ? 400 : 2500);
        await shot(`${prefix}_${id}_${i}_${String(th).replace(/[^a-z_]/gi, '')}`);
      }
    }
  } catch (e) { errors.push('[LOOKS] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
