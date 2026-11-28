// The Treasure Imp in 3D (src/gfx/treasureimp3d.js, tools/blender/treasureimp.py; its rules: src/game/happenings.js):
//  1. the model: every clip and a turntable through the game's renderer (model sheets)
//  2. in play: it spawns near the hero drawn as the 3D model, flees (run / panic), jeers when nobody is near
//  3. struck: it flinches and sheds coins, the gold on the floor is real; shots at game size and zoomed
//  4. it escapes through its rift when its time is up (no loot), and killed it tumbles and its sack bursts (loot as before)
//   node tools/tests/treasureimp.js [mobile] [noshots]
// Shots: imp_clips.png, imp_turn.png, imp_flee_<n>.png, imp_zoom.png, imp_taunt.png, imp_hit_<n>.png, imp_escape_<n>.png, imp_death_<n>.png
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile'), SHOTS = !process.argv.includes('noshots');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  const vp = page.viewportSize();
  // a shot round the imp (or a point): game size, or `zoom` times larger
  const near = async (name, zoom = 1, w = 520, h = 380) => {
    if (!SHOTS) return;
    const c = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, V = await import('/src/core/view.js'), m = window.__imp, at = window.__impAt || m;
      const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), z = V.camera.zoom || 1;
      return { x: r.left + r.width / 2 + (V.isoX(at.x, at.y) - V.camera.x) * z * r.width / cv.width * (window.devicePixelRatio || 1), y: r.top + r.height / 2 + (V.isoY(at.x, at.y) - V.camera.y) * z * r.height / cv.height * (window.devicePixelRatio || 1) };
    }).catch(() => null);
    const cx = c && isFinite(c.x) ? c.x : vp.width / 2, cy = c && isFinite(c.y) ? c.y - 30 : vp.height / 2;
    const cw = Math.min(vp.width, w / zoom), ch = Math.min(vp.height, h / zoom);
    const clip = { x: Math.max(0, Math.min(vp.width - cw, cx - cw / 2)), y: Math.max(0, Math.min(vp.height - ch, cy - ch / 2)), width: cw, height: ch };
    await page.screenshot({ path: `${OUT_DIR}/${name}.png`, clip, scale: 'css' });
    if (zoom > 1) { // enlarge with nearest-neighbour, as a player zooming would see the pixels
      const url = await page.evaluate(async ({ b64, zoom }) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width * zoom; c.height = im.height * zoom; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL(); },
        { b64: fs.readFileSync(`${OUT_DIR}/${name}.png`).toString('base64'), zoom });
      save(name, url);
    }
  };
  try {
    // 1. model sheets
    const sheets = await page.evaluate(async () => {
      const B = await import('/src/gfx/beasts3d.js');
      const m = B.beast('treasureimp');
      for (let i = 0; i < 300 && !m.ready && !m.failed; i++) await new Promise((r) => setTimeout(r, 50));
      if (!m.ready) return { ready: false };
      const sheet = (rows, cols, cw, ch, cell) => {
        const c = document.createElement('canvas'); c.width = 70 + cols * cw; c.height = rows.length * ch;
        const g = c.getContext('2d');
        const paint = () => { g.fillStyle = '#26232c'; g.fillRect(0, 0, c.width, c.height); g.font = '13px monospace';
          rows.forEach((r, j) => { g.fillStyle = '#e8e0c8'; g.fillText(r, 6, j * ch + 18); for (let i = 0; i < cols; i++) { const x = 70 + i * cw + cw / 2, y = j * ch + ch * 0.8; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y, cw * 0.22, cw * 0.1, 0, 0, 7); g.fill(); cell(g, r, i, j, x, y); } }); };
        for (let i = 0; i < 3; i++) { paint(); B.flushBeasts(); }
        return c.toDataURL();
      };
      const clips = ['idle', 'peek', 'taunt', 'run', 'panic', 'hit', 'jump', 'death'];
      const bounce = (i) => ({ sack: { rx: Math.sin(i * 1.6) * 0.13 }, sack_top: { rx: Math.sin(i * 1.6) * 0.2 }, lantern: { rx: -Math.sin(i * 1.6) * 0.5 }, keys: { rx: Math.sin(i * 1.6) * 0.5 } });
      const a = sheet(clips, 8, 200, 210, (g, r, i, j, x, y) => B.drawBeast(g, 'treasureimp', x, y, { key: 'c' + j + '_' + i, k: 120, clip: r, t: m.clips[r] * i / 8, loop: false, yaw: 0.55, bones: r === 'run' || r === 'panic' ? bounce(i) : undefined }));
      const b = sheet(['game size', 'x3'], 8, 300, 330, (g, r, i, j, x, y) => B.drawBeast(g, 'treasureimp', x, y, { key: 't' + j + '_' + i, k: j ? 190 : 54, clip: 'run', t: 0.3, loop: false, yaw: i * Math.PI / 4 + 0.3 }));
      return { ready: true, clips: Object.keys(m.clips), want: clips, a, b, tris: (() => { let n = 0; m.root.traverse((o) => { if (o.isMesh && !o.name.includes('~')) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; })(), bones: ['sack', 'sack_top', 'lantern', 'keys'].filter((n) => m.nodes[n]) };
    });
    ok(sheets.ready, 'treasureimp.glb loads');
    if (!sheets.ready) throw new Error('no model');
    ok(sheets.want.every((c) => sheets.clips.includes(c)), `all ${sheets.want.length} clips in the model (${sheets.clips.join(', ')})`);
    ok(sheets.tris <= 8000, `${sheets.tris} triangles (<= 8000)`);
    ok(sheets.bones.length === 4, `hoard bones for the game to swing (${sheets.bones.join(', ')})`);
    if (SHOTS) { save('imp_clips', sheets.a); save('imp_turn', sheets.b); }

    // 2. in play
    const start = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Impcatcher');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js'), H = await import('/src/game/happenings.js');
      G.godMode = true; game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 400));
      const p = G.player, w = G.world;
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      w.happen.impT = undefined; w.happen.challengeAt = undefined;
      let spot = null;
      for (let R = 8; R >= 3 && !spot; R--) for (let t = 0; t < 4000 && !spot; t++) { const x = 10 + Math.random() * (w.map.w - 20), y = 10 + Math.random() * (w.map.h - 20); let f = true; for (let dx = -R; dx <= R && f; dx++) for (let dy = -R; dy <= R && f; dy++) f = w.map.walkable(x + dx, y + dy); if (f) spot = [x, y]; }   // the widest open floor
      if (spot) { p.x = spot[0]; p.y = spot[1]; }
      window.__spawn = () => { for (let i = 0; i < 20 && !w.happen.imp; i++) H.spawnImp(w); const m = w.happen.imp; if (m) { m.x = p.x + 3; m.y = p.y - 2; window.__imp = m; window.__impAt = null; } return m; };
      const m = window.__spawn();
      return m ? { key: m.beastKey, name: m.name, speed: m.speed, hp: m.maxHp, spot: !!spot } : null;
    });
    ok(start && start.key === 'treasure_imp', `the imp spawns with beastKey treasure_imp (${start && start.name}, speed ${start && start.speed})`);
    ok(start && start.speed === 3.5, 'its speed is unchanged (3.5)');
    await page.waitForTimeout(900);
    const flee = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, m = window.__imp, p = G.player, d0 = Math.hypot(m.x - p.x, m.y - p.y);
      await new Promise((r) => setTimeout(r, 1200));
      return { d0, d1: Math.hypot(m.x - p.x, m.y - p.y), drawn: !!m.imp3, mv: m.imp3 && m.imp3.mv, loot: G.world.loot.length };
    });
    ok(flee.drawn, 'it is drawn by the 3D drawer (imp3 state)');
    ok(flee.d1 > flee.d0 + 0.5, `it flees the hero (${flee.d0.toFixed(1)} -> ${flee.d1.toFixed(1)} tiles), stride ${flee.mv && flee.mv.toFixed(2)}`);
    await near('imp_flee_0'); await page.waitForTimeout(350); await near('imp_flee_1'); await near('imp_zoom', 3);
    // far from the hero it stops and jeers
    await page.evaluate(async () => { const { G } = window.VELSCOUR, m = window.__imp, p = G.player; G.world.happen.impLeft = 99; const V = await import('/src/core/view.js'); window.__zoom = V.camera.zoom; V.camera.zoom = 1; window.__home = [p.x, p.y]; m.x = p.x + 1; m.y = p.y - 1; p.x -= 6.5; p.y += 6.5; G.godMode = true; p.ghost = true; await new Promise((r) => setTimeout(r, 1700)); });
    const idle = await page.evaluate(() => { const S = window.__imp.imp3; return { mv: S.mv, idle: S.idle, t: S.idleT }; });
    ok(idle.mv < 0.2 && idle.t > 0.3, `nobody near: it stands and plays '${idle.idle}' (${idle.t.toFixed(1)} s)`);
    await page.evaluate(async () => { const V = await import('/src/core/view.js'), m = window.__imp; window.__cam = [V.camera.x, V.camera.y]; });
    await near('imp_taunt', 3);
    await page.evaluate(async () => { const V = await import('/src/core/view.js'), p = window.VELSCOUR.G.player; V.camera.zoom = window.__zoom; p.ghost = false; [p.x, p.y] = window.__home; });

    // 3. struck
    const hit = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, m = window.__imp, p = G.player, w = G.world, { hit } = await import('/src/game/combat.js'), fx = await import('/src/gfx/vfx.js');
      await new Promise((r) => setTimeout(r, 250));
      const e0 = fx.effects.length, hp0 = m.hp; let gold = 0;
      for (let i = 0; i < 6; i++) { const l0 = w.loot.length; hit(p, m, m.maxHp * 0.03, 'phys', {}); gold += w.loot.length - l0; await new Promise((r) => setTimeout(r, 120)); if (i === 1) window.__h1 = true; }
      return { fxAdded: fx.effects.length - e0, lost: hp0 - m.hp, gold, hitT: m.imp3.hitT };
    });
    ok(hit.lost > 0, `blows land (${Math.round(hit.lost)} life)`);
    ok(hit.fxAdded > 0, `coins fly from the sack (${hit.fxAdded} coin sprays live)`);
    await near('imp_hit_0'); await near('imp_hit_1', 3);
    console.log(`  info real gold piles dropped by 6 blows: ${hit.gold} (45% a blow, as before)`);

    // 4a. the escape
    const esc = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, m = window.__imp, w = G.world, p = G.player;
      await new Promise((r) => setTimeout(r, 300));
      const items0 = w.loot.filter((l) => l.kind === 'item').length;
      w.happen.impLeft = 0.01; await new Promise((r) => setTimeout(r, 120));
      const hz = w.hazards.find((h) => h.gx !== undefined && h.id === m.id);
      window.__impAt = hz ? { x: (hz.x0 + hz.gx) / 2, y: (hz.y0 + hz.gy) / 2 } : { x: m.x, y: m.y };
      if (hz) { const up = hz.update.bind(hz); hz.update = () => true; window.__step = (t) => { hz.t = t; up(0); if (t >= hz.dur) hz.update = () => false; }; } // stepped by hand for the shots
      return { dead: m.dead, gone: !w.happen.imp, rift: !!hz, items: w.loot.filter((l) => l.kind === 'item').length - items0 };
    });
    ok(esc.dead && esc.gone, 'time up: the imp is gone');
    ok(esc.rift, 'it leaps into a rift (ImpEscape plays)');
    ok(esc.items === 0, 'an escaped imp leaves no items');
    for (let i = 0; i < 6; i++) { await page.evaluate((t) => window.__step && window.__step(t), [0.2, 0.42, 0.6, 0.78, 1.0, 9][i]); await page.waitForTimeout(250); if (i < 5) await near('imp_escape_' + i, i === 2 || i === 3 ? 3 : 1); }

    // 4b. the kill
    await page.waitForTimeout(1200);
    const kill = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, w = G.world, p = G.player, { hit } = await import('/src/game/combat.js');
      const m = window.__spawn(); if (!m) return null;
      w.happen.impLeft = 99; await new Promise((r) => setTimeout(r, 700));
      const gold0 = w.loot.filter((l) => l.kind === 'gold').length, items0 = w.loot.filter((l) => l.kind === 'item').length, corpses0 = w.corpses.length;
      hit(p, m, m.maxHp * 1.05, 'phys', {});
      await new Promise((r) => setTimeout(r, 150));
      window.__impAt = { x: m.x, y: m.y };
      const hz = w.hazards.find((h) => h.wave !== undefined && h.id === m.id);
      if (hz) { const up = hz.update.bind(hz); hz.update = () => true; window.__step = (t) => { up(t - hz.t); if (t >= hz.dur) hz.update = () => false; }; }
      return { dead: m.dead, tumble: w.hazards.some((h) => h.wave !== undefined && h.id === m.id), gold: w.loot.filter((l) => l.kind === 'gold').length - gold0, items: w.loot.filter((l) => l.kind === 'item').length - items0, corpse: w.corpses.length - corpses0 };
    });
    ok(kill && kill.dead, 'a killing blow kills it');
    ok(kill && kill.tumble, 'it tumbles and its sack bursts (ImpDeath plays)');
    ok(kill && kill.gold >= 20 && kill.items >= 3, `its hoard drops as before (${kill && kill.gold} gold piles, ${kill && kill.items} items)`);
    ok(kill && kill.corpse === 0, 'no old-sprite corpse is left under the 3D tumble');
    for (let i = 0; i < 6; i++) { await page.evaluate((t) => window.__step && window.__step(t), [0.15, 0.35, 0.6, 1.0, 1.8, 9][i]); await page.waitForTimeout(300); if (i < 5) await near('imp_death_' + i, i === 1 || i === 3 ? 3 : 1); }
    if (SHOTS) await page.screenshot({ path: `${OUT_DIR}/imp_scene.png` });
  } catch (e) { console.log('FAIL', e.message); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
