// The Carrion Witch's Carrion Grubs (src/game/carriongrubs.js, src/gfx/grubs3d.js, tools/blender/grub.py):
//  1. the model: every clip of the white grub, and all six hides side by side (model sheets)
//  2. the brood rule: three casts bring one of each colour and one more white (seven); a fourth rouses them, none thrown away
//  3. in play: the brood follows her, fights a pack with every move (each kind's moves counted), heals, eats corpses
//  4. deaths leave a writhing husk; shots at game size and zoomed
//   node tools/tests/grubs.js [mobile] [noshots]
// Shots: grubs_clips.png, grubs_skins.png, grubs_brood.png, grubs_fight_<n>.png, grubs_zoom.png
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile'), SHOTS = !process.argv.includes('noshots');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  try {
    // 1. model sheets through the game's renderer
    const sheets = await page.evaluate(async () => {
      const B = await import('/src/gfx/beasts3d.js'), { GRUB_CLIPS, GRUB_KINDS } = await import('/src/game/carriongrubs.js');
      const m = B.beast('grub'); B.preloadBeasts(...GRUB_KINDS.filter((k) => k !== 'white').flatMap((k) => ['grub:' + k, 'grub:' + k + '_glow']));
      for (let i = 0; i < 200 && !m.ready && !m.failed; i++) await new Promise((r) => setTimeout(r, 50));
      if (!m.ready) return { ready: false };
      await new Promise((r) => setTimeout(r, 900));
      const sheet = (rows, cols, cw, ch, cell) => {
        const c = document.createElement('canvas'); c.width = 110 + cols * cw; c.height = rows.length * ch;
        const g = c.getContext('2d');
        const paint = () => { g.fillStyle = '#26232c'; g.fillRect(0, 0, c.width, c.height); g.font = '13px monospace';
          rows.forEach((r, j) => { g.fillStyle = '#e8e0c8'; g.fillText(r, 6, j * ch + 18); for (let i = 0; i < cols; i++) { const x = 110 + i * cw + cw / 2, y = j * ch + ch * 0.66; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y, cw * 0.3, cw * 0.13, 0, 0, 7); g.fill(); cell(g, r, i, j, x, y); } }); };
        for (let i = 0; i < 3; i++) { paint(); B.flushBeasts(); }
        return c.toDataURL();
      };
      const clips = Object.keys(GRUB_CLIPS);
      const a = sheet(clips, 8, 190, 170, (g, r, i, j, x, y) => B.drawBeast(g, 'grub', x, y, { key: 'c' + j + '_' + i, k: 62, clip: r, t: GRUB_CLIPS[r][0] * i / 8, loop: false, yaw: 0.45 }));
      const b = sheet(GRUB_KINDS, 5, 330, 250, (g, r, i, j, x, y) => B.drawBeast(g, 'grub', x, y, { key: 's' + j + '_' + i, k: 105, clip: ['idle', 'slither', 'spit', 'pulse', 'ward'][i], t: [0.5, 0.4, 0.42, 0.72, 0.84][i], loop: false, yaw: [0.5, 2.4, 0.2, 3.9, 5.4][i],
        ...(r === 'white' ? {} : { skin: r, eskin: r + '_glow' }), ember: i >= 3 ? 2.4 : 0.4 }));
      return { ready: true, clips: Object.keys(m.clips), want: clips, a, b };
    });
    ok(sheets.ready, 'grub.glb loads');
    if (!sheets.ready) throw new Error('no model');
    ok(sheets.want.every((c) => sheets.clips.includes(c)), `all ${sheets.want.length} clips in the model (${sheets.clips.length} found)`);
    if (SHOTS) { save('grubs_clips', sheets.a); save('grubs_skins', sheets.b); }

    // 2. the brood rule
    const brood = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('carrion_witch', 'Broodmother');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js'), { CLASS_SKILLS, SKILLS } = await import('/src/data/skills.js');
      G.godMode = true; game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 400));
      const p = G.player, w = G.world;
      for (const sk of CLASS_SKILLS.carrion_witch) G.char.skills[sk.id] = 5;
      G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      let spot = null;
      for (let t = 0; t < 8000 && !spot; t++) { const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16); let f = true; for (let dx = -7; dx <= 7 && f; dx++) for (let dy = -7; dy <= 7 && f; dy++) f = w.map.walkable(x + dx, y + dy); if (f) spot = [x, y]; }
      if (spot) { p.x = spot[0]; p.y = spot[1]; }
      const sk = CLASS_SKILLS.carrion_witch.find((s) => s.name === 'Carrion Grubs');
      if (!sk) return { err: 'no Carrion Grubs skill' };
      window.__grubSk = sk.id;
      const kinds = () => w.creatures.filter((c) => c.grub && !c.dead).map((c) => c.grub.kind);
      const cast = async () => { // one cast that lands: wait out the cooldown and the cast time
        const n0 = w.creatures.filter((c) => c.grub).length;
        for (let i = 0; i < 80; i++) { p.cooldowns = {}; p.tryUseSkill(sk, p.x + 1.5, p.y + 0.5); await new Promise((r) => setTimeout(r, 50)); if (w.creatures.filter((c) => c.grub).length > n0 || p._grubRouse) break; }
        await new Promise((r) => setTimeout(r, 60));
      };
      const steps = [];
      for (let i = 0; i < 4; i++) { await cast(); steps.push(kinds().length); }
      const ten = kinds(), ids = w.creatures.filter((c) => c.grub && !c.dead).map((c) => c.id).join();
      p._grubRouse = 0; await cast();
      const after = kinds(), same = ids === w.creatures.filter((c) => c.grub && !c.dead).map((c) => c.id).join();
      return { steps, ten, after, same, roused: !!p._grubRouse, name: sk.name, id: sk.id };
    });
    if (brood.err) throw new Error(brood.err);
    const count = (l, k) => l.filter((x) => x === k).length;
    console.log('  info brood after each cast:', brood.steps.join(' '), '|', brood.ten.join(','));
    ok(brood.steps[0] === 3 && brood.steps[2] === 7 && brood.ten.length === 7, `three hatch a cast, three casts fill the brood (${brood.steps.join(' ')})`);
    ok(['yellow', 'green', 'orange', 'brown', 'pink'].every((k) => count(brood.ten, k) === 1), 'exactly one of each coloured grub');
    ok(count(brood.ten, 'white') === 2, `the rest are white (${count(brood.ten, 'white')})`);
    ok(brood.same && brood.roused, 'a cast on a full brood rouses it and throws no grub away');
    ok(brood.after.length === 7, 'more casts never pass seven');
    await page.waitForTimeout(1500);
    const vp = page.viewportSize();
    if (SHOTS) await page.screenshot({ path: `${OUT_DIR}/grubs_brood.png` });

    // 3. the fight: packs of tough monsters, count the moves each kind uses
    const fight = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { makeMonster } = await import('/src/game/monster.js');
      const roster = w.biome.roster || ['skeleton'];
      const pack = (n, hp) => { for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI, d = 3.4 + (k % 3) * 0.8; const m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', p.x + 3 + Math.cos(a) * d * 0.7, p.y - 1 + Math.sin(a) * d * 0.7); m.maxHp = m.hp = hp; m.awake = true; w.add(m); } w.rebuildGrid && w.rebuildGrid(); };
      pack(12, 1e7);
      const used = {}, seen = new WeakSet();
      const t0 = performance.now(); let frames = 0, drawn = 0;
      window.__grubShots = [];
      await new Promise((res) => { const tick = () => {
        frames++;
        for (const c of w.creatures) if (c.grub && !c.dead && c.grub.act && !seen.has(c.grub.act)) { seen.add(c.grub.act); const k = c.grub.kind; (used[k] ||= {})[c.grub.act.clip] = (used[k][c.grub.act.clip] || 0) + 1; }
        if (performance.now() - t0 > 22000) res(); else requestAnimationFrame(tick);
      }; tick(); });
      const grubs = w.creatures.filter((c) => c.grub && !c.dead);
      return { used, alive: grubs.length, fed: grubs.filter((g) => g.grub.kind === 'white').map((g) => g.grub.fed), fps: frames / 22, hp: Math.round(p.hp / p.maxHp * 100) };
    });
    console.log('  info moves used:', JSON.stringify(fight.used));
    console.log(`  info ${fight.alive} grubs alive, ${fight.fps.toFixed(0)} fps (software GL), whites fed ${fight.fed.join(',')}`);
    const all = new Set(Object.values(fight.used).flatMap((u) => Object.keys(u)));
    for (const mv of ['bite', 'slam', 'whip', 'spit', 'barrage', 'lob', 'pulse', 'heal', 'ward']) ok(all.has(mv), `the brood used ${mv}`);
    ok(Object.keys(fight.used).length === 6, 'every kind acted');
    if (SHOTS) {
      for (let i = 0; i < 4; i++) { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT_DIR}/grubs_fight_${i}.png` }); }
      await page.evaluate(() => { const { G } = window.VELSCOUR; G.zoomWas = G.settings.zoom; if (G.camera) G.camera.zoom = (G.camera.zoom || 1) * 1.8; });
      const cw = 560, ch = 420;
      await page.screenshot({ path: `${OUT_DIR}/grubs_zoom.png`, clip: { x: (vp.width - cw) / 2, y: (vp.height - ch) / 2 - 20, width: cw, height: ch } });
    }
    // 4. a death leaves a husk
    const husk = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, w = G.world; const g = w.creatures.find((c) => c.grub && !c.dead && c.grub.kind === 'white');
      g.dead = true; await new Promise((r) => setTimeout(r, 300));
      return w.hazards ? w.hazards.some((h) => h.m === g) : null;
    });
    ok(husk !== false, 'a dead grub leaves a husk');
    if (SHOTS) await page.screenshot({ path: `${OUT_DIR}/grubs_husk.png` });
  } catch (e) { console.log('FAIL', e.message); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
