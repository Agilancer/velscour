// The Carrion Witch's 3D voodoo doll (tools/blender/voodoodoll.py -> assets/models/beasts/voodoodoll.glb,
// src/gfx/voodoodoll3d.js, drawn by src/game/sigs/witch.js):
//  1. the model: clips and needle meshes present; sheets of a turntable, every clip stepped, needle counts 0..8 with rotten ones
//  2. in play: the witch with 0 / 3 / 6 pins (3 rotten), a jab stepped, the SQUEEZE stepped, threads start at the needles
//  3. the Voodoo Doll curse: a spectral doll over the cursed pack, stabbed
//   node tools/tests/voodoodoll.js [model|game] [mobile]
// Shots: tools/tests/out/doll_*.png
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist';   // WebGL in headless
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile'), ONLY = process.argv.slice(2).find((a) => a === 'model' || a === 'game');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  page.on('response', (r) => { if (r.status() === 404) console.log('  404 ' + r.url()); });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  try {
    // a sheet of doll poses drawn through the game's own renderer: rows of cells, each { label, ...drawDoll options }
    await page.evaluate(async () => {
      const D = await import('/src/gfx/voodoodoll3d.js'), B = await import('/src/gfx/beasts3d.js');
      B.beast(D.DOLL);
      for (let i = 0; i < 300 && !D.dollReady(); i++) await new Promise((r) => setTimeout(r, 50));
      window.DOLLSHEET = (name, cells, cols, cw, ch, k, bg = '#1c1a22') => {
        const c = document.createElement('canvas'); c.width = cols * cw; c.height = Math.ceil(cells.length / cols) * ch;
        const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
        let drawn = 0;
        const per = k > 100 ? 4 : 16;   // cells a flush (the atlas holds a few big ones)
        for (let s = 0; s < cells.length; s += per) {
          const paint = (real) => cells.slice(s, s + per).forEach((o, j) => {
            const i = s + j, x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + ch * 0.8;
            if (real) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x, y + k * 0.08, k * 0.3, k * 0.15, 0, 0, 7); g.fill(); }
            const d = D.drawDoll(g, x, y, { ...o, key: name + i, k });
            if (real) { if (d) drawn++; g.fillStyle = '#e8e0c8'; g.font = '12px monospace'; g.fillText(o.label || '', (i % cols) * cw + 5, Math.floor(i / cols) * ch + 14); }
          });
          paint(false); B.flushBeasts(); paint(true);
        }
        return { url: c.toDataURL(), drawn };
      };
    });
    const info = await page.evaluate(async () => { const B = await import('/src/gfx/beasts3d.js'), m = B.beast('voodoodoll'); return { ready: m.ready, clips: m.clips, meshes: Object.keys(m.meshes || {}), nodes: Object.keys(m.nodes || {}) }; });
    ok(info.ready, 'the model loads (WebGL)');
    if (!info.ready) throw new Error('no model');
    const want = ['idle', 'squeeze', 'dance', ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'jab' + i)];
    ok(want.every((c) => info.clips[c] > 0), `clips: ${Object.entries(info.clips).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', ')}`);
    ok([1, 2, 3, 4, 5, 6, 7, 8].every((i) => info.meshes.includes('needle_' + i) && info.meshes.includes('rotten_' + i) && info.nodes.includes('pin_' + i)), '8 needles, 8 rotten twins, 8 pin bones');
    const sheet = async (name, cells, cols, cw, ch, k) => { const r = await page.evaluate(([n, c, a, b, d, e]) => window.DOLLSHEET(n, c, a, b, d, e), [name, cells, cols, cw, ch, k]); save(name, r.url); ok(r.drawn === cells.length, `${name}: ${r.drawn}/${cells.length} poses drawn`); };
    if (ONLY !== 'game') {
      const Y = Math.PI / 4;   // facing the camera
      await sheet('doll_turntable', Array.from({ length: 8 }, (_, i) => ({ label: 'yaw ' + (i * 45), yaw: Y + i * Math.PI / 4, pins: 0, t: 0.3 })), 4, 440, 600, 330);
      await sheet('doll_turntable_pins', Array.from({ length: 8 }, (_, i) => ({ label: 'yaw ' + (i * 45) + ' 5 pins 3 rotten', yaw: Y + i * Math.PI / 4, pins: 5, rot: 3, t: 0.3 })), 4, 440, 600, 330);
      await sheet('doll_needles', Array.from({ length: 12 }, (_, i) => (i < 9 ? { label: i + ' pins', pins: i, yaw: Y + 0.3 } : { label: `${[4, 2, 0][i - 9]} pins ${[2, 4, 8][i - 9]} rotten`, pins: [4, 2, 0][i - 9], rot: [2, 4, 8][i - 9], yaw: Y - 0.3 })), 6, 300, 400, 215);
      for (const [clip, n, pins] of [['idle', 12, 3], ['squeeze', 12, 6], ['dance', 12, 2], ['jab2', 12, 2], ['jab5', 12, 5], ['jab8', 12, 8]])
        await sheet('doll_clip_' + clip, Array.from({ length: n }, (_, i) => { const t = info.clips[clip] * i / n; return { label: clip + ' ' + t.toFixed(2), clip, t, loop: false, pins, yaw: Y + 0.25 }; }), 6, 300, 400, 215);
      await sheet('doll_gamesize', Array.from({ length: 16 }, (_, i) => ({ yaw: Y + i * 0.4, pins: i % 7, rot: i % 3, t: i * 0.3 })), 16, 80, 110, 42);
      await sheet('doll_face', [{ yaw: Y, pins: 0 }, { yaw: Y + 0.5, pins: 3, rot: 1 }, { yaw: Y - 0.5, pins: 0, rot: 3 }], 3, 640, 900, 560);
    }
    if (ONLY !== 'model') {
      // ---- in play: a witch, a pack that stays put, the game stepped by hand
      const vp = page.viewportSize();
      await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR;
        await game.newChar('carrion_witch', 'Poppet');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js'), { CLASS_SKILLS } = await import('/src/data/skills.js'), { makeMonster } = await import('/src/game/monster.js'), { camera } = await import('/src/core/view.js');
        G.godMode = true; G.settings.gore = 0; G.settings.dmgNumbers = false;
        game.buildDungeon(6, BIOME_BY_ID.overworld);
        await new Promise((r) => setTimeout(r, 400));
        const p = G.player, w = G.world;
        for (const sk of CLASS_SKILLS.carrion_witch) G.char.skills[sk.id] = 5;
        G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
        for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
        w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
        let spot = null;
        for (let t = 0; t < 8000 && !spot; t++) {
          const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16); let ok = true;
          for (let dx = -6; dx <= 6 && ok; dx++) for (let dy = -6; dy <= 6 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
          if (ok || t > 7000 && w.map.walkable(x, y)) spot = [x, y];
        }
        p.x = spot[0]; p.y = spot[1];
        const roster = w.biome.roster || ['skeleton'];
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', p.x + 3.6 + Math.cos(a) * 1.7, p.y - 2.2 + Math.sin(a) * 1.7); m.maxHp = m.hp = 1e9; m.speed = 0; m.awake = true; w.add(m); }
        w.rebuildGrid();
        const upd = game.update.bind(game); window.__step = 0;
        game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
        for (const id of ['#log', '#center-msg']) { const e = document.querySelector(id); if (e) e.style.display = 'none'; }
        window.__zoom = (z) => { G.settings.zoom = z; camera.computeZoom(); camera.follow(p.x + (z > 1.6 ? 0.5 : 1.2), p.y - 0.8, 0, true); return camera.tileToScreen(p.x, p.y, 50); };
        window.__sig = () => p.sig.s;
      });
      const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); await page.waitForTimeout(120); };
      const zoom = (z) => page.evaluate((z) => window.__zoom(z), z);
      const crop = async (hc0, w, h, dx = 0, dy = 0) => { const hc = await page.evaluate(async ([dx, dy]) => { const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js'); const c = camera.tileToScreen(G.player.x, G.player.y, 50); return [c[0] + dx, c[1] + dy]; }, [dx, dy]); return (await page.screenshot({ clip: { x: Math.max(0, Math.min(vp.width - w, hc[0] - w / 2 + 30)), y: Math.max(0, Math.min(vp.height - h, hc[1] - h / 2)), width: w, height: h } })).toString('base64'); };
      const strip = async (name, shots, scale = 1) => save(name, await page.evaluate(async ([shots, scale]) => {
        const ims = await Promise.all(shots.map((b) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b; })));
        const c = document.createElement('canvas'); c.width = ims.reduce((s, i) => s + i.width * scale + 2, 0); c.height = ims[0].height * scale;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false; let x = 0; for (const i of ims) { g.drawImage(i, x, 0, i.width * scale, i.height * scale); x += i.width * scale + 2; } return c.toDataURL();
      }, [shots, scale]));
      const pin = (n) => page.evaluate(async (n) => { const { G } = window.VELSCOUR, p = G.player, s = p.sig.s, { hit } = await import('/src/game/combat.js'); let k = 0;
        for (const c of G.world.creatures) if (k < n && c.team === 'enemy' && !c.dead && !s.pins.includes(c)) { hit(p, c, 1, 'phys', { silent: true }); k++; } return { pins: s.pins.length, jab: s.jab && s.jab.slot }; }, n);
      const wound = (i) => page.evaluate(async (i) => (await import('/src/gfx/voodoodoll3d.js')).dollPin('hexpoppet', i), i);
      let hc = await zoom(2.1); await step(4); await step(4);
      const s0 = await crop(hc, 300, 260);
      ok(await wound('head'), 'the 3D poppet is drawn by her shoulder (its head is placed)');
      let r = await pin(2); await step(40); r = await pin(1);
      ok(r.pins === 3 && r.jab === 2, `three foes struck: ${r.pins} pins, needle ${r.jab + 1} is stabbing`);
      const jabs = []; for (const n of [3, 3, 3, 3, 4, 6]) { await step(n); jabs.push(await crop(hc, 220, 220)); }
      await strip('doll_game_jab', jabs, 2);
      await step(30);
      const w0 = await wound(0), w2 = await wound(2);
      ok(w0 && w2 && Math.hypot(w0[0] - w2[0], w0[1] - w2[1]) > 2, `threads start at the needles' wounds (${JSON.stringify(w0)} ${JSON.stringify(w2)})`);
      const s3 = await crop(hc, 300, 260);
      await page.evaluate(() => { const s = window.__sig(); s.busy = 99; s.rot = 3; }); await step(20);
      const s6 = await crop(hc, 300, 260);
      await strip('doll_game_pins', [s0, s3, s6], 2);
      hc = await zoom(1.35); await step(2); await page.screenshot({ path: path.join(OUT_DIR, 'doll_game_wide.png') });
      hc = await zoom(2.1);
      await page.evaluate(() => { window.__sig().busy = 0; });
      const sq = []; let fired = false, peak = 0;
      for (const n of [4, 8, 8, 6, 4, 6, 10, 14]) { await step(n); const s = await page.evaluate(() => { const s = window.__sig(); return { t: s.sqT, q: s.squeeze }; }); fired = fired || s.t >= 0; peak = Math.max(peak, s.q); sq.push(await crop(hc, 300, 260)); }
      await strip('doll_game_squeeze', sq, 1.5);
      ok(fired && peak > 0.6, `six pins: she SQUEEZES, the doll is crushed (squeeze peaked at ${peak.toFixed(2)})`);
      await step(40);
      ok(await page.evaluate(() => window.__sig().sqT < 0), 'the squeeze clip ends and the doll hangs limp again');
      // ---- the Voodoo Doll curse
      hc = await zoom(1.6);
      const cast = await page.evaluate(async () => {
        const { G } = window.VELSCOUR, p = G.player, { CLASS_SKILLS } = await import('/src/data/skills.js'), { effects } = await import('/src/gfx/vfx.js');
        const sk = CLASS_SKILLS.carrion_witch.find((s) => s.name === 'Voodoo Doll'), f = G.world.nearestHostile('player', p.x, p.y, 12, false);
        p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, f.x, f.y, f);
        for (let i = 0; i < 40; i++) G.world.update(1 / 60);   // through her cast time
        return { sk: !!sk, effigy: effects.some((e) => e.constructor.name === 'Effigy'), marked: G.world.creatures.filter((c) => c.curses && c.curses.mark).length };
      });
      ok(cast.sk && cast.effigy, `Voodoo Doll cast: a spectral effigy hangs over the cursed (${cast.marked} marked)`);
      const vd = []; for (const n of [4, 14, 10, 12, 12, 16]) { await step(n); vd.push(await crop(hc, 420, 340, 90, -50)); }
      await strip('doll_game_voodoo', vd, 1);
    }
  } catch (e) { console.log('ERROR', e.message); process.exitCode = 1; }
  report(errors.filter((e) => !/status of 404/.test(e)));   // (missing optional icon sheets are listed above as 404s)
  await browser.close();
})();
