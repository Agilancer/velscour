// Lancer cloth banner (src/gfx/lancerbanner.js): the skin and pole load at their template sizes, the cloth hangs still
// when he stands, trails opposite his motion in all four screen directions, stays finite through a blink, and the
// shots show it at three Valor levels and while running (banner_<case>.png).
//   node tools/tests/lancer_banner.js
const { openGame, report, OUT_DIR } = require('./harness');
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

(async () => {
  const { browser, page, errors } = await openGame({ width: 1000, height: 700 });
  try {
    const err = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('lancer', 'Banner');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      G.godMode = true; game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 500));
      const p = G.player, w = G.world;
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      let spot = null;
      for (let t = 0; t < 8000 && !spot; t++) {
        const x = 10 + Math.random() * (w.map.w - 20), y = 10 + Math.random() * (w.map.h - 20); let ok = true;
        for (let dx = -6; dx <= 6 && ok; dx++) for (let dy = -6; dy <= 6 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
        if (ok) spot = [x, y];
      }
      if (!spot) return 'no open spot';
      window.__home = spot; p.x = spot[0]; p.y = spot[1];
      const upd = window.__realUpdate = game.update.bind(game);
      window.__step = 0; window.__vel = [0, 0];
      game.update = (dt) => {
        const on = window.__step > 0; if (on) window.__step--;
        if (on) { G.player.x += window.__vel[0] / 60; G.player.y += window.__vel[1] / 60; G.player.moving = !!(window.__vel[0] || window.__vel[1]); }
        upd(on ? 1 / 60 : 0);
      };
      return null;
    });
    if (err) { fail(err); return; }
    await page.waitForFunction(async () => { const m = await import('/src/gfx/lancerbanner.js'); const a = m.preloadBanner(); return a.skin && a.skin.ok && a.pole && a.pole.ok; }, null, { timeout: 10000 })
      .catch(() => fail('banner_skin.png / banner_pole.png did not load'));
    const sizes = await page.evaluate(async () => {
      const m = await import('/src/gfx/lancerbanner.js'), a = m.preloadBanner();
      return [a.skin.im.naturalWidth, a.skin.im.naturalHeight, a.pole.im.naturalWidth, a.pole.im.naturalHeight];
    });
    if (sizes.join() !== '48,96,64,200') fail('art sizes ' + sizes.join() + ', want 48x96 skin and 64x200 pole');
    const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
    // trail: the bottom-centre node relative to the crossbar centre, in physics a/b/h px
    const probe = () => page.evaluate(() => {
      const cl = window.VELSCOUR.G.player.sig.s.cloth; if (!cl) return null;
      const P = cl.pos, C = 5, R = 9, top = 2 * 3, bot = ((R - 1) * C + 2) * 3;
      if (![...P].every(Number.isFinite)) return { nan: true };
      return { da: P[bot] - P[top], db: P[bot + 1] - P[top + 1], dh: P[bot + 2] - P[top + 2], th: cl.th };
    });
    const setCase = (valor, vel) => page.evaluate(([valor, vel]) => {
      const { G } = window.VELSCOUR, p = G.player; p.x = window.__home[0]; p.y = window.__home[1];
      p.sig.s.valor = valor; p.sig.s.busy = 9; p.sig.s.cloth = null; window.__vel = vel;
    }, [valor, vel]);
    const clip = { x: 300, y: 120, width: 400, height: 380 };
    for (const [name, valor] of [['idle_0', 0], ['idle_50', 50], ['idle_100', 100]]) {
      await setCase(valor, [0, 0]); await step(150);
      const q = await probe();
      if (!q || q.nan) { fail(name + ' no cloth / NaN'); continue; }
      if (Math.abs(q.da) > 3 || q.dh > -4) fail(`${name}: should hang straight down, got da=${q.da.toFixed(1)} dh=${q.dh.toFixed(1)}`);
      await page.screenshot({ path: `${OUT_DIR}/banner_${name}.png`, clip });
    }
    // world velocity (tiles/s) per screen direction; expected sign of the trail along a (screen x) or b (toward camera)
    const runs = [['right', [3, -3], 'da', -1], ['left', [-3, 3], 'da', 1], ['toward', [3, 3], 'db', -1], ['away', [-3, -3], 'db', 1]];
    for (const [name, vel, axis, sign] of runs) {
      await setCase(100, vel); await step(70);
      const q = await probe();
      if (!q || q.nan) { fail(name + ' NaN'); continue; }
      console.log(`run ${name}: da=${q.da.toFixed(1)} db=${q.db.toFixed(1)} dh=${q.dh.toFixed(1)} lean=${q.th.toFixed(3)}`);
      if (Math.sign(q[axis]) !== sign || Math.abs(q[axis]) < 8) fail(`${name}: cloth should trail ${sign > 0 ? '+' : '-'}${axis}, got ${q[axis].toFixed(1)}`);
      // keep the hero in frame for the shot: the camera follows him
      await page.screenshot({ path: `${OUT_DIR}/banner_run_${name}.png`, clip });
    }
    // stop after running: it must swing back and settle
    await page.evaluate(() => { window.__vel = [0, 0]; }); await step(240);
    const q = await probe();
    if (!q || q.nan || Math.abs(q.da) > 4) fail('did not settle after stopping: ' + JSON.stringify(q));
    // a blink: 20 tiles in one frame resets the cloth instead of stretching it
    await page.evaluate(() => { window.VELSCOUR.G.player.x += 20; }); await step(2);
    const b = await probe();
    if (!b || b.nan || Math.hypot(b.da, b.db, b.dh) > 60) fail('blink stretched the cloth: ' + JSON.stringify(b));
    const cost = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, s = p.sig.s, m = await import('/src/gfx/lancerbanner.js');
      const c = document.createElement('canvas'); c.width = 400; c.height = 400; const g = c.getContext('2d');
      g.setTransform(3, 0, 0, 3, -((p.x - p.y) * 32) * 3 + 200, -((p.x + p.y) * 16) * 3 + 300);
      const t0 = performance.now(); for (let i = 0; i < 200; i++) { m.stepBanner(p, s, 1 / 60, 1, true); m.drawBanner(g, p, s); }
      return (performance.now() - t0) / 200;
    });
    console.log(`banner cost: ${cost.toFixed(3)} ms per step+draw`);
    if (cost > 3) fail('banner too slow: ' + cost.toFixed(2) + ' ms');
  } finally {
    report(errors); if (bad) process.exitCode = 1;
    console.log(bad ? `${bad} FAILED` : 'lancer banner OK');
    await browser.close();
  }
})();
