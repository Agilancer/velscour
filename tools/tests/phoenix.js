// The Ranger's golden phoenix (src/gfx/phoenix3d.js, drawn by src/game/sigs/ranger.js):
//  1. the 3D model: a turntable of 8 headings x (wing up, level, down, gliding, folded for the stoop, banked)
//  2. phoenixPoints: wing and tail tips finite, the wings mirror each other, the tail trails behind the heading
//  3. in play: it circles the hero, banks into the turn, beats and glides, and leaves a trail of embers
//  4. the stoop: folded wings, a flame streak, the hit; it pulls up and opens its wings again
//  5. frame cost of one drawPhoenix3D call (software GL in headless Chromium: an upper bound)
//   node tools/tests/phoenix.js [mobile]
// Shots: phoenix_turntable.png, phoenix_flight.png (8 moments circling), phoenix_stoop.png (6 moments)
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';   // WebGL in headless
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  try {
    // 1-2. the model on its own
    const m = await page.evaluate(async () => {
      const P = await import('/src/gfx/phoenix3d.js');
      if (!P.phoenix3DReady()) return { gl: false };
      const rows = [['wings up', { flap: Math.PI / 2 }], ['level', { flap: 0 }], ['wings down', { flap: -Math.PI / 2 }],
        ['gliding', { amp: 0.12, flap: 1 }], ['stoop', { fold: 1, pitch: 0.8 }], ['banked', { flap: 0.6, roll: -0.6 }]];
      const CW = 170, CH = 150, c = document.createElement('canvas'); c.width = 90 + CW * 8; c.height = CH * rows.length;
      const g = c.getContext('2d'); g.fillStyle = '#1c1a22'; g.fillRect(0, 0, c.width, c.height);
      g.font = '13px monospace'; g.fillStyle = '#e8e0c8';
      let drawn = 0, bad = 0;
      rows.forEach(([label, o], j) => {
        g.fillText(label, 6, j * CH + 20);
        for (let i = 0; i < 8; i++) {
          g.save(); g.translate(90 + i * CW + CW / 2, j * CH + CH / 2); g.scale(2.2, 2.2);
          if (P.drawPhoenix3D(g, 0, 0, { yaw: i * Math.PI / 4, t: i * 0.3, k: 1, heat: j === 4 ? 1 : 0.3, ...o })) drawn++;
          g.restore();
          const pts = P.phoenixPoints({ yaw: i * Math.PI / 4, k: 1, ...o });
          if (![...pts.wings, ...pts.tail, pts.crest].flat().every(Number.isFinite)) bad++;
        }
      });
      // the wings mirror each other across the heading; the tail lies behind it
      const q = P.phoenixPoints({ yaw: 0.7, k: 1, flap: 0.4, lean: 0 }), fx = Math.cos(0.7), fy = Math.sin(0.7);
      const along = (v) => v[0] * fx + v[1] * fy, across = (v) => -v[0] * fy + v[1] * fx;
      const mirror = Math.abs(along(q.wings[0]) - along(q.wings[1])) < 1e-6 && Math.abs(across(q.wings[0]) + across(q.wings[1])) < 1e-6 && Math.abs(q.wings[0][2] - q.wings[1][2]) < 1e-6;
      const behind = q.tail.every((v) => along(v) < -0.4);
      // the pixels: something gold drawn
      const d = g.getImageData(0, 0, c.width, c.height).data; let gold = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 140 && d[i + 1] < 235 && d[i + 2] < 120) gold++;
      // cost of one draw at game size
      const s = document.createElement('canvas'); s.width = s.height = 200; const sg = s.getContext('2d'); sg.scale(1.6, 1.6);
      const t0 = performance.now(); for (let i = 0; i < 60; i++) P.drawPhoenix3D(sg, 60, 60, { yaw: i * 0.1, flap: i * 0.4, k: 1.15, t: i / 60 }); const ms = (performance.now() - t0) / 60;
      return { gl: true, drawn, bad, mirror, behind, gold, ms, url: c.toDataURL() };
    });
    ok(m.gl, 'WebGL available for the 3D phoenix');
    if (m.gl) {
      save('phoenix_turntable', m.url);
      ok(m.drawn === 48, `turntable: ${m.drawn}/48 poses drawn`);
      ok(m.bad === 0, 'phoenixPoints finite in every pose');
      ok(m.mirror, 'the wing tips mirror each other across the heading');
      ok(m.behind, 'the tail plume tips trail behind the heading');
      ok(m.gold > 20000, `gold pixels in the turntable (${m.gold})`);
      console.log(`  info drawPhoenix3D: ${m.ms.toFixed(2)} ms per call (software GL)`);
    }

    // 3-4. in play
    const r = await page.evaluate(async (MOBILE) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('ranger', 'Phoebe');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 300));
      G.godMode = true; G.settings.zoom = MOBILE ? 1.3 : 1.8; G.settings.gore = 0; G.settings.dmgNumbers = false; G.paused = false;
      (await import('/src/core/view.js')).camera.computeZoom();
      for (const id of ['#log', '#center-msg']) { const e = document.querySelector(id); if (e) e.style.display = 'none'; }
      const p = G.player, w = G.world;
      for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
      let spot = null;
      for (let t = 0; t < 8000 && !spot; t++) {
        const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
        let o = true;
        for (let dx = -5; dx <= 5 && o; dx++) for (let dy = -5; dy <= 5 && o; dy++) o = w.map.walkable(x + dx, y + dy);
        if (o) spot = [x, y];
      }
      if (spot) { p.x = spot[0]; p.y = spot[1]; }
      // step the game by hand: game.update runs only while __step > 0
      const upd = window.__realUpdate = window.__realUpdate || game.update.bind(game);
      window.__step = 0; game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
      return { ok: !!p.sig && p.sig.cls === 'ranger' };
    }, MOBILE);
    ok(r.ok, 'the Ranger has The Hunt');
    const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
    const vp = page.viewportSize(), CW = MOBILE ? 360 : 440, CH = MOBILE ? 300 : 380;
    const clip = { x: vp.width / 2 - CW / 2, y: vp.height / 2 - CH * 0.62, width: CW, height: CH };
    const state = () => page.evaluate(async () => {
      const { G } = window.VELSCOUR, s = G.player.sig.s, { particles } = await import('/src/gfx/vfx.js');
      const near = particles.filter((q) => q.life > 0 && ['#fff0a0', '#ffd050', '#ffa028', '#ff6414'].includes(q.color)).length;
      return { yaw: s.yaw, pitch: s.pitch, roll: s.roll, amp: s.amp, fv: s.fv, flap: s.flap, embers: near, hz: s.hz, fin: [s.yaw, s.pitch, s.roll, s.flap, s.hx, s.hy, s.hz].every(Number.isFinite) };
    });
    await step(120);
    const flight = []; let rolls = [], amps = [], embers = 0, fin = true;
    for (let i = 0; i < 8; i++) {
      await step(i === 4 ? 70 : 9);
      flight.push(await page.screenshot({ clip }));
      const st = await state(); rolls.push(st.roll); amps.push(st.amp); embers = Math.max(embers, st.embers); fin = fin && st.fin;
    }
    for (let i = 0; i < 300; i += 30) { await step(30); const st = await state(); rolls.push(st.roll); amps.push(st.amp); fin = fin && st.fin; }
    ok(fin, 'flight pose stays finite');
    ok(Math.max(...rolls.map(Math.abs)) > 0.15, `banks into its turns (max roll ${Math.max(...rolls.map(Math.abs)).toFixed(2)})`);
    ok(Math.min(...amps) < 0.5 && Math.max(...amps) > 0.8, `beats and glides (amp ${Math.min(...amps).toFixed(2)}..${Math.max(...amps).toFixed(2)})`);
    ok(embers >= (MOBILE ? 8 : 15), `a trail of embers behind it (${embers} alive)`);

    // the stoop on a tough foe
    const st0 = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world, { makeMonster } = await import('/src/game/monster.js');
      const roster = w.biome.roster || ['skeleton'];
      const m = makeMonster(w, roster[0], w.biome, 6, 'champion', p.x + 2.4, p.y - 1.2); m.maxHp = m.hp = 1e8; m.speed = 0; m.awake = true; w.add(m); w.rebuildGrid();
      const s = p.sig.s; s.quarry = m; s.look = 99; s.feathers = 6; G.sigStats = {};
      return { hp: m.hp };
    });
    const stoop = []; let folded = 0;
    for (const n of [1, 8, 8, 8, 14, 30]) { await step(n); stoop.push(await page.screenshot({ clip })); folded = Math.max(folded, (await state()).fv); }
    const after = await page.evaluate(() => { const { G } = window.VELSCOUR, s = G.player.sig.s; return { fired: (G.sigStats.ranger || {}).fire || 0, hp: s.quarry ? s.quarry.hp : null }; });
    await step(60); const opened = (await state()).fv;
    ok(after.fired === 1, 'six feathers: the phoenix stoops');
    ok(folded > 0.8, `wings fold for the dive (${folded.toFixed(2)})`);
    ok(after.hp !== null && after.hp < st0.hp, 'the stoop hits the quarry');
    ok(opened < 0.2, `wings open again after the dive (${opened.toFixed(2)})`);
    const strip = (shots, labels) => page.evaluate(async ({ shots, w, h, labels }) => {
      const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + u; });
      const cols = 4, rows = Math.ceil(shots.length / cols), c = document.createElement('canvas'); c.width = w * cols; c.height = h * rows;
      const g = c.getContext('2d'); g.font = '14px monospace';
      for (let i = 0; i < shots.length; i++) { const x = (i % cols) * w, y = Math.floor(i / cols) * h; g.drawImage(await load(shots[i]), x, y); g.fillStyle = '#000a'; g.fillRect(x, y, 120, 20); g.fillStyle = '#ffe8a0'; g.fillText(labels[i], x + 5, y + 15); }
      return c.toDataURL();
    }, { shots: shots.map((b) => b.toString('base64')), w: CW * (MOBILE ? 2 : 1), h: CH * (MOBILE ? 2 : 1), labels });
    save('phoenix_flight' + (MOBILE ? '_mobile' : ''), await strip(flight, flight.map((_, i) => 'circling ' + (i + 1))));
    save('phoenix_stoop' + (MOBILE ? '_mobile' : ''), await strip(stoop, ['stoop!', 'diving', 'diving', 'strike', 'pull up', 'wheeling']));
  } catch (e) { console.log('ERROR', e); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
