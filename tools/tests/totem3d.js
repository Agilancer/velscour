// The Totem Master's GREAT TOTEM as a 3D model (src/gfx/totem3d.js, raised by src/game/sigs/totem.js):
//  1. the model: every face order draws; a sheet of the rise (buried .. standing), the wing fold, the eye glow
//     and the blast flash; the inside shows only through the ground cut; four orders side by side
//  2. in play: the Spirit Pole fills, the totem bursts out of the ground (dirt, dust, spirit motes, cracks),
//     explodes once it stands (rings, flash, sparks, rocks), its faces act, then it sinks back; shots stepped
//  3. frame cost of one drawTotem3D call (software GL in headless Chromium: an upper bound)
//   node tools/tests/totem3d.js [mobile]
// Shots: totem_model.png (states), totem_orders.png, totem_rise.png (the rise and the blast, frame by frame)
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';   // WebGL in headless
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  try {
    // 1. the model on its own
    const m = await page.evaluate(async () => {
      const T = await import('/src/gfx/totem3d.js');
      if (!T.totem3DReady()) return { gl: false };
      const F = ['bear', 'wolf', 'eagle', 'serpent'];
      const states = [['buried', { rise: 0, fold: 1 }], ['rising 25%', { rise: 0.25, fold: 1, rim: 1 }], ['rising 60%', { rise: 0.6, fold: 1, rim: 1 }],
        ['wings folded', { rise: 1, fold: 1 }], ['half open', { rise: 1, fold: 0.5 }], ['standing', { rise: 1 }],
        ['eyes lit', { rise: 1, glow: [1, 1, 1, 1], rune: 1 }], ['blast flash', { rise: 1, flash: 0.6, rune: 1 }]];
      const CW = 230, CH = 330, c = document.createElement('canvas'); c.width = CW * states.length; c.height = CH;
      const g = c.getContext('2d'); g.fillStyle = '#2a3020'; g.fillRect(0, 0, c.width, c.height);
      g.font = '13px monospace'; let drawn = 0;
      states.forEach(([label, o], i) => {
        g.fillStyle = '#e8e0c8'; g.fillText(label, i * CW + 8, 18);
        g.save(); g.translate(i * CW + CW / 2, CH - 40); g.scale(1.6, 1.6);
        if (i) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2); g.fill(); }
        if (T.drawTotem3D(g, 0, 0, F, { k: 1, ...o })) drawn++;
        g.restore();
      });
      // the buried state draws nothing; standing draws plenty; the inside never shows on a standing totem
      const px = (x0, x1) => { const d = g.getImageData(x0, 24, x1 - x0, CH - 24).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x2a) + Math.abs(d[i + 1] - 0x30) + Math.abs(d[i + 2] - 0x20) > 40) k++; return k; };
      const buried = px(0, CW) , standing = px(CW * 5, CW * 6);
      const o2 = document.createElement('canvas'); o2.width = 4 * 260; o2.height = CH; const h = o2.getContext('2d'); h.fillStyle = '#2a3020'; h.fillRect(0, 0, o2.width, o2.height);
      const orders = [F, ['serpent', 'eagle', 'wolf', 'bear'], ['eagle', 'eagle', 'bear', 'bear'], ['wolf', 'serpent', 'wolf', 'serpent']];
      orders.forEach((f, i) => { h.save(); h.translate(i * 260 + 130, CH - 40); h.scale(1.6, 1.6); if (T.drawTotem3D(h, 0, 0, f, { k: 1, glow: [0.4, 0.4, 0.4, 0.4] })) drawn++; h.restore(); });
      const s = document.createElement('canvas'); s.width = s.height = 400; const sg = s.getContext('2d'); sg.scale(1.6, 1.6);
      const t0 = performance.now(); for (let i = 0; i < 60; i++) T.drawTotem3D(sg, 120, 220, F, { k: 0.95, rise: (i % 30) / 30, fold: 1 - (i % 30) / 30, glow: [i % 2, 0, 1, 0] }); const ms = (performance.now() - t0) / 60;
      return { gl: true, drawn, buried, standing, ms, tris: T.totemTris(F), url: c.toDataURL(), url2: o2.toDataURL() };
    });
    ok(m.gl, 'WebGL available for the 3D totem');
    if (m.gl) {
      save('totem_model', m.url); save('totem_orders', m.url2);
      ok(m.drawn === 12, `model: ${m.drawn}/12 states and orders drawn`);
      ok(m.buried < 20, `buried: nothing shows above the ground (${m.buried} px)`);
      ok(m.standing > 15000, `standing: the totem fills its cell (${m.standing} px)`);
      console.log(`  info ${m.tris} triangles; drawTotem3D ${m.ms.toFixed(2)} ms per call (software GL)`);
    }
    // 2. in play, stepped frame by frame
    await page.evaluate(async (MOBILE) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('totem_master', 'Totemic');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 300));
      G.godMode = true; G.settings.zoom = MOBILE ? 0.95 : 1.6; G.settings.gore = 0; G.settings.dmgNumbers = false;
      const { camera } = await import('/src/core/view.js'); camera.computeZoom();
      for (const id of ['#log', '#center-msg']) { const e = document.querySelector(id); if (e) e.style.display = 'none'; }
      const p = G.player, w = G.world;
      for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
      let spot = null;
      for (let t = 0; t < 8000 && !spot; t++) {
        const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
        let o = true;
        for (let dx = -6; dx <= 6 && o; dx++) for (let dy = -6; dy <= 6 && o; dy++) o = w.map.walkable(x + dx, y + dy);
        if (o) spot = [x, y];
      }
      if (spot) { p.x = spot[0]; p.y = spot[1]; }
      const { makeMonster } = await import('/src/game/monster.js');
      const roster = w.biome.roster || ['skeleton'];
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', p.x + 2.6 + Math.cos(a) * 1.8, p.y - 1.6 + Math.sin(a) * 1.8); m.maxHp = m.hp = 1e8; m.speed = 0; m.awake = true; w.add(m); }
      w.rebuildGrid();
      const upd = window.__realUpdate = window.__realUpdate || game.update.bind(game);
      window.__step = 0;
      game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
      camera.follow(p.x + 1.6, p.y + 0.4, 0, true);
      const S = await import('/src/game/signature.js');
      G.sigStats = {};
      const s = p.sig.s; s.faces = ['bear', 'wolf', 'eagle', 'serpent'];
      S.sigFire(p);
    }, MOBILE);
    const step = async (k) => { await page.evaluate((k) => { window.__step = k; }, k); await page.waitForFunction(() => window.__step === 0); };
    const at = async () => page.evaluate(async () => {
      const { G } = window.VELSCOUR, h = G.world.hazards.find((q) => q.constructor.name === 'GreatTotem');
      const { camera } = await import('/src/core/view.js');
      const q = h && camera.tileToScreen(h.x, h.y, 0), r = document.querySelector('canvas').getBoundingClientRect(), f = r.width / G.W;   // the page may be scaled (phones)
      return h ? { t: h.t, xy: [r.left + q[0] * f, r.top + q[1] * f] } : null;
    });
    const frames = [[8, 'cracks'], [25, 'rising'], [50, 'rising'], [64, 'breaking free'], [70, 'blast'], [80, 'blast'], [100, 'wings settle'], [260, 'standing'], [528, 'sinking'], [548, 'sinking']];
    const vp = page.viewportSize(), cw = MOBILE ? 380 : 440, ch = MOBILE ? 380 : 420;
    let done = 0, seen = 0, shots = [];
    for (const [f, label] of frames) {
      await step(f - done); done = f;
      const h = await at();
      if (!h) break;
      seen++;
      const clip = { x: Math.max(0, Math.min(vp.width - cw, h.xy[0] - cw / 2)), y: Math.max(0, Math.min(vp.height - ch, h.xy[1] - ch * 0.78)), width: cw, height: ch };
      shots.push({ label: `${label} ${h.t.toFixed(2)} s`, png: (await page.screenshot({ clip })).toString('base64') });
    }
    ok(seen === frames.length, `the great totem stands through all ${frames.length} stepped frames (${seen})`);
    const sheet = await page.evaluate(async ([shots, cw, ch]) => {
      const c = document.createElement('canvas'), cols = 5; c.width = cw * cols; c.height = (ch + 20) * Math.ceil(shots.length / cols);
      const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.font = '14px monospace';
      for (let i = 0; i < shots.length; i++) {
        const im = new Image(); im.src = 'data:image/png;base64,' + shots[i].png; await im.decode();
        const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + 20);
        g.drawImage(im, x, y + 20, cw, ch); g.fillStyle = '#e8e0c8'; g.fillText(shots[i].label, x + 6, y + 15);
      }
      return c.toDataURL();
    }, [shots, cw, ch]);
    save('totem_rise' + (MOBILE ? '_mobile' : ''), sheet);
    await step(80);
    const gone = await page.evaluate(() => window.VELSCOUR.G.world.hazards.some((q) => q.constructor.name === 'GreatTotem'));
    ok(!gone, 'the totem has sunk away after its 8.7 s');
    const fx = await page.evaluate(() => (window.VELSCOUR.G.sigStats || {}).totem_master || {});
    ok(fx.fire === 1, 'the signature fired once');
  } catch (e) { console.log('FAIL ' + e.stack); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
