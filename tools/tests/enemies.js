// Monster art check (docs/ENEMY_ART.md): every bestiary look lined up next to the hero (en_lineup_*.png), its
// flash and corpse forms, then real levels in a few biomes, mixed with a like-coloured biome where possible
// (en_<biome>.png), with their guardians (en_<biome>_boss.png). Prints each level's looks and swaps.
//   node tools/tests/enemies.js [biome,biome,...]
const { openGame, report } = require('./harness');
const BIOMES = (process.argv[2] || 'catacombs,frozen,molten,fungal,void,flesh').split(',');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Bestiary');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    G.godMode = true;
    const { loadEnemySheets } = await import('/src/core/enemyart.js');
    await loadEnemySheets(); // every sheet: set 2 normally loads per level
  });

  // ---- lineups: 14 looks per shot in two rows beside the hero, frozen in place
  const n = await page.evaluate(async () => (await import('/src/data/bestiary.js')).BESTIARY.length);
  for (let start = 0; start < n; start += 14) {
    const names = await page.evaluate(async (start) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { BESTIARY } = await import('/src/data/bestiary.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const { camera } = await import('/src/core/view.js');
      if (G.world.kind !== 'town') game.enterTown();
      const w = G.world, p = G.player;
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      w.creatures = w.creatures.filter((c) => !c.dead);
      w.corpses.length = 0;
      const x0 = w.portals[0].x - 9, y0 = w.portals[0].y - 2;
      const out = [];
      BESTIARY.slice(start, start + 14).forEach((a, k) => {
        // two rows along the screen's horizontal (+x -y in tiles)
        const col = k % 7, row = Math.floor(k / 7);
        const x = x0 + col * 1.15 + row * 1.6, y = y0 - col * 1.15 + row * 1.6;
        const m = makeMonster(w, a.arch, BIOME_BY_ID.catacombs, 1, 'normal', x, y, 0, { art: a.id, swap: null });
        m.aggroRange = 0; m.speed = 0; m.update = () => { m.animT += 0.016; m.spawnT = 1; };
        if (k === 3) m.flash = 0.1;
        w.add(m);
        out.push(a.id);
      });
      p.x = x0 - 1; p.y = y0 + 1.5;
      document.querySelectorAll('#center-msg, .center-msg').forEach((e) => e.remove());
      G.settings.zoom = 1.25; camera.computeZoom(); camera.follow(x0 + 4.2, y0 - 2.6, 0, true);
      return out;
    }, start);
    await page.waitForTimeout(400);
    await shot('en_lineup_' + (start / 14));
    console.log('lineup', start / 14, names.join(' '));
  }

  // ---- corpses: kill one of each kind on screen
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { hit } = await import('/src/game/combat.js');
    for (const c of G.world.creatures.filter((c) => c.team === 'enemy')) { delete c.update; hit(G.player, c, c.maxHp * 0.99 + 1, 'phys', { crit: false }); }
  });
  await page.waitForTimeout(700);
  await shot('en_corpses');

  // ---- real levels
  for (const id of BIOMES) {
    const info = await page.evaluate(async (id) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID, mixPartner } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      const { camera } = await import('/src/core/view.js');
      const biome = BIOME_BY_ID[id];
      let mix = null;
      for (let i = 0; i < 20 && !mix; i++) mix = mixPartner(biome);
      await Promise.all([loadBiomeArt(biome), mix && loadBiomeArt(mix)]);
      game.buildDungeon(8, biome, mix);
      const w = G.world, p = G.player;
      const enemies = w.creatures.filter((c) => c.team === 'enemy');
      // walk the hero to a pack outside the start room so monsters and floors fill the shot
      const m = enemies.find((c) => c.rank === 'normal' && Math.hypot(c.x - p.x, c.y - p.y) > 9) || enemies[0];
      p.x = m.x - 1.6; p.y = m.y + 1.6;
      for (const c of enemies) { c.aggroRange = 0; }
      G.settings.zoom = 0.85; camera.computeZoom(); camera.follow(p.x, p.y, 0, true);
      const looks = {};
      for (const c of enemies) looks[c.arch] = [...new Set([...(looks[c.arch] || []), c.art + (c.swap ? '*' : '')])];
      return { biome: id, mixed: w.tileset.mixed || null, boss: w.boss && `${w.boss.name} (${w.boss.art})`, looks, n: enemies.length, noArt: enemies.filter((c) => !c.art).length };
    }, id);
    console.log(JSON.stringify(info));
    await page.waitForTimeout(500);
    await shot('en_' + id);
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { camera } = await import('/src/core/view.js');
      const b = G.world.boss;
      G.player.x = b.x - 2.5; G.player.y = b.y + 2.5;
      G.settings.zoom = 1; camera.computeZoom(); camera.follow(G.player.x, G.player.y, 0, true);
    });
    await page.waitForTimeout(600);
    await shot('en_' + id + '_boss');
  }
  report(errors);
  await browser.close();
})();
