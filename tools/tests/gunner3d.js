// The Gunner's 3D turrets and Bombing Run biplane (three.js bake: tools/gunner3d.html, node tools/gunner3d_bake.js;
// drawn by src/gfx/gunner3d.js):
//  1. the sheets: all four turrets (48 turns) and the biplane (32 headings) load and draw at every turn
//  2. in play: Gun, Flame, Rocket and Cryo Turrets beside the hero, dummies round them: every head turns onto its
//     target, every turret fires, and its shots leave from the barrel's tip
//  3. walking through: the hero walks a straight line through each of his turrets and is never pushed aside
//  4. the Bombing Run: ten marks, the biplane flies over, eight bombs fall
//   [BIOME=castle_keep] node tools/tests/gunner3d.js [video] [mobile]     (default: the Forsaken Wilds, open ground)
// Shots: gunner3d_sheet.png (every turret at 8 turns, the plane at 8 headings), gunner3d_play.png (stepped frames).
// With video: tools/tests/out/gunner3d_action.mp4 and .gif (needs ffmpeg) of turrets fighting a pack, the hero
// walking through them and a Bombing Run.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile'), VIDEO = process.argv.includes('video'), BIOME = process.env.BIOME || 'overworld';

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  try {
    // 1. the sheets on their own
    const s = await page.evaluate(async () => {
      const T = await import('/src/gfx/gunner3d.js');
      T.preloadGunner3D();
      const kinds = [...T.TURRET3D];
      const fake = (k, yaw) => ({ summonKey: k, x: 0, y: 0, z: 0, animT: 5, spawnT: 9, attackAnimT: 0, facing: yaw, target: { x: Math.cos(yaw) * 3, y: Math.sin(yaw) * 3 }, flash: 0, drawRim() {}, drawOverhead() {} });
      for (let i = 0; i < 100 && !T.drawTurret3D(document.createElement('canvas').getContext('2d'), fake('cryoturret', 0)); i++) await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => setTimeout(r, 500));
      const metas = await Promise.all([...kinds, 'biplane'].map((k) => fetch(`/assets/sprites/gunner/${k}.json`).then((r) => r.json())));
      const CW = 150, CH = 120, c = document.createElement('canvas'); c.width = CW * 8; c.height = CH * 5;
      const g = c.getContext('2d'); g.fillStyle = '#3a3428'; g.fillRect(0, 0, c.width, c.height);
      let drawn = 0, empty = 0;
      const ink = (x, y) => { const d = g.getImageData(x, y, CW, CH).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== 0x3a || d[i + 1] !== 0x34) n++; return n; };
      kinds.forEach((k, r) => { for (let i = 0; i < 8; i++) {
        const yaw = (i / 8) * Math.PI * 2, m = fake(k, yaw); m._t3 = { yaw, base: yaw, t: 5, spin: 0 };
        g.save(); g.translate(i * CW + CW / 2, r * CH + 88); g.scale(1.5, 1.5); if (T.drawTurret3D(g, Object.assign(m, { x: 0, y: 0 }))) drawn++; g.restore();
        if (ink(i * CW, r * CH) < 400) empty++;
      } });
      for (let i = 0; i < 8; i++) { g.save(); g.translate(i * CW + CW / 2, 4 * CH + 60); if (T.drawBiplane3D(g, 0, 0, 0, (i / 8) * Math.PI * 2, 0, 0.9)) drawn++; g.restore(); }
      return { drawn, empty, metas, url: c.toDataURL() };
    });
    save('gunner3d_sheet', s.url);
    ok(s.drawn === 40, `sheets: ${s.drawn}/40 turret turns and plane headings drawn`);
    ok(s.empty === 0, `no turret turn draws empty (${s.empty})`);
    ok(s.metas.slice(0, 4).every((m) => m.dirs === 48 && m.frames >= 2 && m.muzzle[0] > 0.4) && s.metas[4].dirs === 32, 'turret sheets: 48 turns, firing frames, a muzzle; plane: 32 headings');

    // 2. in play
    await page.evaluate(async ([MOBILE, BIOME]) => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('gunner', 'Turretwright');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      game.buildDungeon(6, BIOME_BY_ID[BIOME]);
      await new Promise((r) => setTimeout(r, 300));
      G.godMode = true; G.settings.zoom = MOBILE ? 1.1 : 1.7; G.settings.gore = 0; G.settings.dmgNumbers = false;
      const { camera } = await import('/src/core/view.js'); camera.computeZoom();
      for (const id of ['#log', '#center-msg']) { const e = document.querySelector(id); if (e) e.style.display = 'none'; }
      const p = G.player, w = G.world;
      for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
      w.creatures = w.creatures.filter((c) => !c.dead);
      let spot = null;
      let best = -1;   // the most open floor there is
      for (let y = 2; y < w.map.h - 2; y++) for (let x = 2; x < w.map.w - 2; x++) {
        let R = 0;
        while (R < 7) { let o = true; for (let dx = -R - 1; dx <= R + 3 && o; dx++) for (let dy = -R - 1; dy <= R + 1 && o; dy++) o = w.map.walkable(x + 0.5 + dx, y + 0.5 + dy); if (!o) break; R++; }
        if (R > best) { best = R; spot = [x - 0.5, y + 0.5]; }
      }
      p.x = spot[0]; p.y = spot[1];
      const { createSummon } = await import('/src/game/monster.js');
      const T = await import('/src/gfx/gunner3d.js');
      window.__turrets = [...T.TURRET3D].map((k, i) => createSummon(p, { id: 'test_' + k, m: { sum: k } }, 10, p.x + 1.5 + (i % 2) * 1.6, p.y - 2.4 + i * 1.6, [40, 60]));
      // every shot a turret fires: where it starts
      window.__shots = [];
      const add = w.addHazard.bind(w);
      w.addHazard = (h) => { if (h && h.src && window.__turrets.includes(h.src) && h.x !== undefined) window.__shots.push({ k: h.src.summonKey, d: Math.hypot(h.x - h.src.x, h.y - h.src.y), z: h.z }); return add(h); };
      for (const t of window.__turrets) { const at = t.summonAttack.bind(t); t.__fired = 0; t.summonAttack = (...a) => { t.__fired++; return at(...a); }; }
      const upd = window.__realUpdate = window.__realUpdate || game.update.bind(game);
      window.__step = 0;
      game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
      camera.follow(p.x + 2.2, p.y, 0, true);
    }, [MOBILE, BIOME]);
    const step = async (k) => { await page.evaluate((k) => { window.__step = k; }, k); await page.waitForFunction(() => window.__step === 0); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); };
    const dummies = (n, speed) => page.evaluate(async ([n, speed]) => {
      const { G } = window.VELSCOUR, w = G.world, p = G.player;
      const { makeMonster } = await import('/src/game/monster.js');
      const roster = w.biome.roster || ['skeleton'], out = [];
      for (let k = 0; k < n; k++) {
        const a = -1.2 + (k / Math.max(1, n - 1)) * 2.4, r = 5.2 + (k % 2) * 0.8, x = p.x + 2.3 + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (!w.map.walkable(x, y)) continue;
        const m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', x, y);
        m.maxHp = m.hp = speed ? window.__turrets[0].dmg * 18 : 1e9; if (!speed) m.speed = 0; m.awake = true; w.add(m); out.push(m);
      }
      w.rebuildGrid();
      await window.VELSCOUR.game.warmArt();   // their sprites, not the loading placeholders
      return out.length;
    }, [n, speed]);
    ok((await dummies(6, 0)) >= 4, 'dummies placed round the turrets');
    await step(150);
    const r = await page.evaluate(() => window.__turrets.map((t) => {
      const tg = t.target, want = tg ? Math.atan2(tg.y - t.y, tg.x - t.x) : null, S = t._t3;
      const off = S && want !== null ? Math.abs(((S.yaw - want + Math.PI * 3) % (Math.PI * 2)) - Math.PI) : 9;
      return { k: t.summonKey, off, fired: t.__fired, dead: t.dead };
    }));
    for (const t of r) {
      ok(t.off < 0.2, `${t.k}: the head is on its target (${t.off.toFixed(3)} rad off)`);
      ok(t.fired > 0, `${t.k}: fired ${t.fired} times in 2.5 s`);
    }
    const shots = await page.evaluate(() => window.__shots);
    const gun = shots.filter((q) => q.k === 'turret'), rock = shots.filter((q) => q.k === 'rocketturret');
    ok(gun.length && gun.every((q) => q.d > 0.9 && q.z > 30), `Gun Turret bullets leave from the barrel (${gun.length}: ${gun.length ? Math.min(...gun.map((q) => q.d)).toFixed(2) : '-'} tiles out, ${gun.length ? gun[0].z.toFixed(0) : '-'} px up)`);
    ok(rock.length && rock.every((q) => q.d > 0.3), `Rocket Turret rockets leave from the pods (${rock.length})`);
    const shotsAt = [];
    const vp = page.viewportSize(), cw = MOBILE ? 420 : 560, ch = MOBILE ? 330 : 420;
    const clipNow = async () => {
      const xy = await page.evaluate(async () => {
        const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js'), q = camera.tileToScreen(G.player.x + 2.4, G.player.y, 0);
        const r = document.querySelector('canvas').getBoundingClientRect(), f = r.width / G.W; return [r.left + q[0] * f, r.top + q[1] * f];
      });
      return { x: Math.max(0, Math.min(vp.width - cw, xy[0] - cw / 2)), y: Math.max(0, Math.min(vp.height - ch, xy[1] - ch / 2)), width: cw, height: ch };
    };
    for (let i = 0; i < 4; i++) { await step(9); shotsAt.push({ label: `firing +${(i * 0.15).toFixed(2)} s`, png: (await page.screenshot({ clip: await clipNow() })).toString('base64') }); }

    // 3. walking through each turret, in a straight line
    const walk = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world, out = [];
      for (const c of w.creatures) if (!c.isPlayer && !c.summon) c.dead = true;
      for (const t of window.__turrets) {
        const y = t.y, x0 = t.x - 1.6, x1 = t.x + 1.6;
        if (!w.map.walkable(x0, y) || !w.map.walkable(x1, y)) continue;
        p.x = x0; p.y = y; p.setMoveTarget(x1, y);
        let dev = 0, n = 0;
        while (p.moveTarget && n < 200) { window.__step = 1; await new Promise((r) => requestAnimationFrame(r)); while (window.__step) await new Promise((r) => setTimeout(r, 1)); dev = Math.max(dev, Math.abs(p.y - y)); n++; }
        out.push({ k: t.summonKey, dev, got: Math.hypot(p.x - x1, p.y - y), n });
      }
      return out;
    });
    ok(walk.length === 4, `walked through ${walk.length}/4 turrets`);
    for (const q of walk) ok(q.dev < 0.05 && q.got < 0.2, `${q.k}: walked straight through (pushed ${q.dev.toFixed(3)} tiles aside, ${q.got.toFixed(2)} from the goal, ${q.n} frames)`);

    // 4. the Bombing Run
    await dummies(8, 1);
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, s = p.sig.s;
      s.marks = 10; s.locks = G.world.creatures.filter((c) => c.team === 'enemy' && !c.dead).slice(0, 8);
      G.sigStats = {};
    });
    let flew = 0, bombs = 0;
    for (let i = 0; i < 8; i++) {
      await step(i ? 14 : 22);
      const q = await page.evaluate(() => { const h = window.VELSCOUR.G.world.hazards; return { run: h.some((x) => x.constructor.name === 'Run'), bombs: h.filter((x) => x.constructor.name === 'Bomb').length }; });
      flew += q.run; bombs += q.bombs;
      if (i < 5) shotsAt.push({ label: `bombing run ${i}`, png: (await page.screenshot({ clip: await clipNow() })).toString('base64') });
    }
    const st = await page.evaluate(() => (window.VELSCOUR.G.sigStats || {}).gunner || {});
    ok(st.fire === 1, 'the Bombing Run was called in');
    ok(flew >= 3 && bombs > 0, `the biplane flew over (${flew} frames) and dropped bombs (${bombs} seen falling)`);
    const sheet = await page.evaluate(async ([shots, cw, ch]) => {
      const c = document.createElement('canvas'), cols = 3; c.width = cw * cols; c.height = (ch + 20) * Math.ceil(shots.length / cols);
      const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.font = '14px monospace';
      for (let i = 0; i < shots.length; i++) {
        const im = new Image(); im.src = 'data:image/png;base64,' + shots[i].png; await im.decode();
        const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + 20);
        g.drawImage(im, x, y + 20, cw, ch); g.fillStyle = '#e8e0c8'; g.fillText(shots[i].label, x + 6, y + 15);
      }
      return c.toDataURL();
    }, [shotsAt, cw, ch]);
    save('gunner3d_play' + (MOBILE ? '_mobile' : ''), sheet);

    // the film: turrets against a charging pack, the hero walking through them, then a Bombing Run (30 fps)
    if (VIDEO) {
      const dir = path.join(OUT_DIR, 'gunner3d_frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
      let n = 0;
      // a close crop round the turrets (the camera follows the hero, so it is placed every frame)
      const FW = Math.min(vp.width, 1100), FH = vp.height;
      const film = async (frames, k = 2) => { for (let i = 0; i < frames; i++) {   // k game frames (1/60 s) per film frame at 30 fps
        await step(k);
        const xy = await page.evaluate(async () => {
          const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js'), T = window.__turrets;
          const q = camera.tileToScreen(T.reduce((a, t) => a + t.x, 0) / T.length + 1.2, T.reduce((a, t) => a + t.y, 0) / T.length - 0.6, 0);
          const r = document.querySelector('canvas').getBoundingClientRect(), f = r.width / G.W; return [r.left + q[0] * f, r.top + q[1] * f];
        });
        const clip = { x: Math.max(0, Math.min(vp.width - FW, Math.round(xy[0] - FW / 2))), y: 0, width: FW, height: FH };
        fs.writeFileSync(path.join(dir, `f${String(n++).padStart(4, '0')}.png`), await page.screenshot({ clip }));
      } };
      await page.evaluate(async () => {
        const { G } = window.VELSCOUR, p = G.player, w = G.world, { camera } = await import('/src/core/view.js');
        G.settings.zoom = 2.1; camera.computeZoom();
        const hud = document.getElementById('hud'); if (hud) hud.style.visibility = 'hidden';   // the film shows the field only
        for (const c of w.creatures) if (!c.isPlayer && !c.summon) c.dead = true;
        p.x = window.__turrets[0].x - 1.8; p.y = window.__turrets[1].y - 0.8; p.moveTarget = null;
        camera.follow(p.x + 2.6, p.y + 0.4, 0, true);
        for (const t of window.__turrets) { t._t3 = null; t.spawnT = 0; }   // they land again on camera
      });
      await film(30);
      await dummies(6, 1);
      await film(150);
      await page.evaluate(() => { const { G } = window.VELSCOUR, p = G.player, t = window.__turrets[2]; p.setMoveTarget(t.x + 2.2, t.y + 0.1); });
      await film(60);
      await page.evaluate(async () => {   // a clear field and a wider view for the plane
        const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js');
        for (const c of G.world.creatures) if (c.team === 'enemy') c.dead = true;
        G.settings.zoom = 1.5; camera.computeZoom();
      });
      await dummies(7, 1);
      await page.evaluate(() => { const { G } = window.VELSCOUR, s = G.player.sig.s; s.busy = 0; s.marks = 10; s.locks = G.world.creatures.filter((c) => c.team === 'enemy' && !c.dead).slice(0, 8); });
      await film(150, 1);   // the Bombing Run at half speed
      const mp4 = path.join(OUT_DIR, 'gunner3d_action.mp4'), gif = path.join(OUT_DIR, 'gunner3d_action.gif');
      try {
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.png'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4]);
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.png'), '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif]);
        console.log(`  info film: ${n} frames -> ${path.relative(process.cwd(), mp4)}, ${path.relative(process.cwd(), gif)}`);
      } catch (e) { console.log('  info ffmpeg failed: ' + e.message); }
    }
  } catch (e) { console.log('FAIL ' + e.stack); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
