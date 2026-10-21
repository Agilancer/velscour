// Iso alignment close-ups: wall hangings and torch holders on both wall axes of a room corner, and scatter props in
// a row across a room, at ZOOM (default 3), so their angles can be checked against the floor diamonds and walls.
// Usage: node tools/tests/isofix.js [biome] [hangings|torches|props] [first] [count]
//   hangings: designs first..first+count-1, one per wall axis each (shots isofix_<biome>_hang_<n>.png)
//   torches:  holder styles, the same way;  props: the biome's scatter, 6 per shot (isofix_<biome>_props_<n>.png)
const { openGame, report } = require('./harness');
const biome = process.argv[2] || 'catacombs', mode = process.argv[3] || 'hangings';
const first = +(process.argv[4] || 0), count = +(process.argv[5] || (mode === 'props' ? 60 : 50));
(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 800 });
  try {
    await page.evaluate(async (id) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Iso Check');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0; G.godMode = true;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { loadBiomeArt } = await import('/src/core/assets.js');
      await loadBiomeArt(BIOME_BY_ID[id]);
      for (let tries = 0; tries < 40 && !window.__corner; tries++) {
      const depth = [11, 12, 13, 14, 16, 17, 18, 19][tries % 8] + 10 * Math.floor(tries / 8); // never a raid depth (multiples of 5)
      game.buildDungeon(depth, BIOME_BY_ID[id]);
      const w = G.world;
      w.creatures = w.creatures.filter((c) => c === G.player);
      G.settings.zoom = 2.6; (await import('/src/core/view.js')).camera.computeZoom();
      document.querySelectorAll('#hud, .hud, canvas#ui').forEach((e) => (e.style.display = 'none'));
      // a room corner with five straight back-wall edges on each axis
      const segs = w.map.segments.filter((s) => !s.front), S = new Map(segs.map((s) => [s.dir + s.mx + ',' + s.my, s]));
      for (const s of segs) {
        if (s.dir !== 'f') continue;
        const X = s.ex, Y = s.ey0;
        let ok = true;
        for (let k = 0; k < 6; k++) if (!S.has('f' + X + ',' + (Y + k + 0.5)) || !S.has('b' + (X + k + 0.5) + ',' + Y)) ok = false;
        for (let y = Y; y < Y + 6 && ok; y++) for (let x = X; x < X + 6; x++) if (!w.map.tile(x, y)) ok = false;
        if (ok) { window.__corner = [X, Y, S]; break; }
      }
      }
      if (!window.__corner) throw new Error('no clear room corner');
    }, biome);
    await page.evaluate((z) => { window.ZOOM = z; }, +(process.env.ZOOM || 3));
    const shoot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: require('path').join(require('./harness').OUT_DIR, name + '.png') }); };
    if (mode === 'props') {
      const n = await page.evaluate(() => window.VELSCOUR.G.world.tileset.scatter.length);
      for (let i = first; i < Math.min(n, first + count); i += 6) {
        await page.evaluate(async (i) => {
          const { G } = window.VELSCOUR, w = G.world, [X, Y] = window.__corner, sc = w.tileset.scatter;
          w.props = w.props.filter((p) => Math.hypot(p.x - X - 3, p.y - Y - 3) > 7);
          w.wallHangings = []; w.torches = [];
          for (let k = 0; k < 6 && i + k < sc.length; k++)
            w.props.push({ kind: 'scatter', x: X + 1.5 + (k % 3) * 1.6, y: Y + 1.5 + Math.floor(k / 3) * 2.2, spr: sc[i + k], k: w.tileset.k, flip: false });
          G.player.x = X + 6; G.player.y = Y + 6; G.hitStop = 1e9;
          G.settings.zoom = 2; (await import('/src/core/view.js')).camera.computeZoom();
        }, i);
        await shoot(`isofix_${biome}_props_${i / 6 | 0}`);
      }
    } else {
      for (let i = first; i < first + count; i += 3) {
        await page.evaluate(async ([i, mode]) => {
          const { G } = window.VELSCOUR, w = G.world, [X, Y, S] = window.__corner;
          const { wallHangingAtWallSegment } = await import('/src/gfx/wallhangings.js');
          const { torchAtWallSegment } = await import('/src/world/dungeon.js');
          w.props = w.props.filter((p) => Math.hypot(p.x - X - 3, p.y - Y - 3) > 7);
          w.wallHangings = []; w.torches = [];
          for (let k = 0; k < 3; k++) for (const s of [S.get('f' + X + ',' + (Y + 1.5 + k * 2)), S.get('b' + (X + 1.5 + k * 2) + ',' + Y)]) {
            if (mode === 'torches') { const t = torchAtWallSegment(s); t.holderStyle = (i + k) % 20; w.torches.push(t); }
            else w.wallHangings.push(wallHangingAtWallSegment(s, (i + k) % (w.biome.id === 'castle_keep' ? 16 : 50)));
          }
          G.player.x = X + 4.2; G.player.y = Y + 4.2; G.hitStop = 1e9; // freeze the simulation, the camera still follows
        }, [i, mode]);
        await shoot(`isofix_${biome}_${mode === 'torches' ? 'torch' : 'hang'}_${i / 3 | 0}`);
      }
    }
  } catch (e) { errors.push('[ISOFIX] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
