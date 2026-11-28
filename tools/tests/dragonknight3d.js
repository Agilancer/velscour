// The Dragon Knight's 3D dragons and wings (src/gfx/dragons3d.js, src/game/sigs/dragonknight.js; models from
// tools/blender/dragons.py and tools/blender/dkwings.py):
//  1. model sheets through the game's renderer: each dragon (Elder Red Drake, Drake Whelp, Wyvern, Frost Wyrm) turned
//     through 6 headings hovering, flying and breathing; the wings' clips at three heats
//  2. in play: the four summons beside the hero fighting a pack (drawn in 3D, the breath leaves the mouth)
//  3. her wings at 0 / 50 / 100% heat in both facings
//  4. the Dragonheart stepped over time (the dragon of fire rises, breathes from its jaws, fades)
//  5. the upgraded skills: Dragon Leap, Dragon Wings, Wyrm Coil, Draconic Roar, True Dragon Form, Ironclad Wyrmform
//   node tools/tests/dragonknight3d.js [mobile]
// Shots: tools/tests/out/dk3d_*.png
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';   // WebGL in headless
const { openGame, report, OUT_DIR } = require('./harness');
const MOBILE = process.argv.includes('mobile');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  try {
    // ---------------------------------------------------------------- 1. the models on their own
    const sheets = await page.evaluate(async () => {
      const B = await import('/src/gfx/beasts3d.js'), D = await import('/src/gfx/dragons3d.js');
      const sheet = async (W, H, cells, labels, zoom = 1) => {
        const c = document.createElement('canvas'); c.width = W * zoom; c.height = H * zoom; const g = c.getContext('2d');
        const paint = () => {
          g.setTransform(zoom, 0, 0, zoom, 0, 0); g.fillStyle = '#231f29'; g.fillRect(0, 0, W, H); g.font = '12px monospace'; g.fillStyle = '#e8d8a0';
          for (const [t, x, y] of labels) g.fillText(t, x, y);
          let n = 0;
          for (const [id, x, y, o] of cells) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + (o.sh || 0), o.k * 0.3, o.k * 0.13, 0, 0, 7); g.fill(); if (B.drawBeast(g, id, x, y, o)) n++; }
          return n;
        };
        let n = 0;
        for (let i = 0; i < 100 && n < cells.length; i++) { paint(); await new Promise((r) => setTimeout(r, 120)); B.flushBeasts(); n = paint(); }
        // a skin texture arrives after the model: once more when the textures have had time
        await new Promise((r) => setTimeout(r, 1200)); paint(); B.flushBeasts(); n = paint();
        return { n, of: cells.length, url: c.toDataURL() };
      };
      const out = {}, kinds = Object.keys(D.DRAGONS);
      D.preloadDragons(...kinds);
      // dragons: rows = kind x (hover, fly banked, breath), columns = 6 headings
      for (const kind of kinds) {
        const K = D.DRAGONS[kind], cells = [], labels = [], k = 150, cw = 300, ch = 250;
        [['fly_hover', {}], ['fly', { roll: 0.35 }], ['hover_breath_hold', { ember: K.ember * 2.2 }]].forEach(([clip, extra], r) => {
          labels.push([kind + ' ' + clip, 6, r * ch + 16]);
          for (let i = 0; i < 6; i++) cells.push([K.id, 40 + i * cw + cw / 2, r * ch + ch * 0.62, { key: kind + r + '_' + i, k: k * (kind === 'whelp' ? 1.25 : 1), yaw: 0.35 + i * Math.PI / 3, clip, t: 0.3 + i * 0.37, skin: K.skin, bones: K.bones, ember: K.ember, sh: 60, ...extra }]);
        });
        out[kind] = await sheet(40 + 6 * cw, 3 * ch, cells, labels);
      }
      // the line-up at game scale (their real sizes side by side, x2)
      { const cells = [], labels = []; let x = 90;
        for (const kind of kinds) { const K = D.DRAGONS[kind]; for (const yaw of [0.3, 2.3]) { cells.push([K.id, x, 150, { key: 'lu' + kind + yaw, k: K.k, yaw, clip: 'fly_hover', t: 0.8, skin: K.skin, bones: K.bones, ember: K.ember, sh: K.hover }]); x += K.k * 1.5 + 30; } labels.push([kind, x - K.k * 2.4, 14]); }
        out.lineup = await sheet(x, 230, cells, labels, 2); }
      // wings: rows = clip, columns = 3 heats x 2 facings, sampled through the clip
      { const cells = [], labels = [], cw = 250, ch = 220;
        ['rest', 'idle', 'spread', 'flap', 'dash', 'unfurl'].forEach((clip, r) => {
          labels.push([clip, 6, r * ch + 16]);
          for (let i = 0; i < 6; i++) cells.push(['dkwings', 50 + i * cw + cw / 2, r * ch + ch * 0.62, { key: 'w' + r + '_' + i, k: 74, yaw: Math.PI / 4 + (i % 2 ? 0.36 : -0.36), clip, t: [0.1, 0.25, 0.4, 0.55, 0.7, 0.9][i] * B.beast('dkwings').clips[clip], ember: [0.08, 0.08, 0.7, 0.7, 2.2, 2.2][i], loop: false, rad: 1.95, sh: 60 }]);
        });
        out.wings = await sheet(50 + 6 * cw, 6 * ch, cells, labels); }
      out.clips = { dragon: Object.keys(B.beast('dragon').clips), wings: Object.keys(B.beast('dkwings').clips) };
      return out;
    });
    for (const k of ['whelp', 'wyvern', 'frostwyrm', 'elderwyrm', 'lineup', 'wings']) { save('dk3d_model_' + k, sheets[k].url); ok(sheets[k].n === sheets[k].of, `model sheet ${k}: ${sheets[k].n}/${sheets[k].of} cells drawn`); }
    ok(['fly', 'fly_hover', 'hover_breath_in', 'hover_breath_hold', 'hover_breath_out', 'hit_air', 'death_air', 'roar'].every((c) => sheets.clips.dragon.includes(c)), 'dragon.glb has the clips the game plays');
    ok(['rest', 'idle', 'spread', 'flap', 'dash', 'unfurl'].every((c) => sheets.clips.wings.includes(c)), 'dkwings.glb has its six clips');

    // ---------------------------------------------------------------- the game, stepped
    const err = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('dragon_knight', 'Showcase');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      G.godMode = true; G.settings.gore = 0; G.settings.dmgNumbers = false;
      game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 400));
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const p = G.player, w = G.world;
      for (const sk of CLASS_SKILLS.dragon_knight) G.char.skills[sk.id] = 5;
      G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
      let spot = null;
      for (let t = 0; t < 8000 && !spot; t++) {
        const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
        let free = true;
        for (let dx = -7; dx <= 7 && free; dx++) for (let dy = -7; dy <= 7 && free; dy++) free = w.map.walkable(x + dx, y + dy);
        if (free) spot = [x, y];
      }
      if (!spot) return 'no open spot';
      p.x = spot[0]; p.y = spot[1]; window.__home = spot;
      const upd = game.update.bind(game);
      window.__step = 0;
      game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
      for (const id of ['#log', '#center-msg']) { const e = document.querySelector(id); if (e) e.style.display = 'none'; }
      window.__pack = async (n = 8, d0 = 2.6) => {
        const { makeMonster } = await import('/src/game/monster.js');
        w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
        const roster = w.biome.roster || ['skeleton'];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * 2 * Math.PI, d = d0 + (k % 3) * 0.9;
          const m = makeMonster(w, roster[k % roster.length], w.biome, 6, 'normal', window.__home[0] + 2.6 + Math.cos(a) * d * 0.7, window.__home[1] - 0.9 + Math.sin(a) * d * 0.7);
          m.maxHp = m.hp = 1e9; m.speed = 0; m.dmg = 0; m.awake = true; w.add(m);
        }
        w.rebuildGrid();
      };
      window.__clean = async (zoom, keep) => {
        const { effects, texts, particles } = await import('/src/gfx/vfx.js');
        const { camera } = await import('/src/core/view.js');
        if (!keep) { w.hazards = w.hazards.filter((h) => h.constructor.name === 'SigBack'); for (let i = effects.length - 1; i >= 0; i--) if (!['SigLayer', 'Fall'].includes(effects[i].constructor.name)) effects.splice(i, 1); texts.length = 0; particles.length = 0; }
        w.loot.length = 0; p.channel = null; p.x = window.__home[0]; p.y = window.__home[1]; p.z = 0;
        G.settings.zoom = zoom; camera.computeZoom(); camera.follow(p.x + (zoom > 1.6 ? 0 : 1.2), p.y - (zoom > 1.6 ? 0.5 : 0.6), 0, true);
      };
      return null;
    });
    if (err) throw new Error(err);
    const vp = page.viewportSize();
    const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); await page.waitForTimeout(60); };
    const shot = async (name, w = 760, h = 480, dy = -40) => page.screenshot({ path: `${OUT_DIR}/dk3d_${name}.png`, clip: { x: Math.max(0, (vp.width - w) / 2), y: Math.max(0, (vp.height - h) / 2 + dy), width: Math.min(w, vp.width), height: Math.min(h, vp.height) } });

    // ---------------------------------------------------------------- 2. the summons
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { SUMMONS } = await import('/src/data/summons.js'); const { buildSummon } = await import('/src/game/monster.js');
      await window.__pack(8, 3.4); await window.__clean(1.35);
      const at = { whelp: [-1.2, 1.4], wyvern: [1.3, 1.6], frostwyrm: [-1.6, -1.6], elderwyrm: [1.2, -2.2] };
      window.__dragons = Object.keys(at).map((k) => { const m = buildSummon(p, SUMMONS[k], k, p.x + at[k][0], p.y + at[k][1], 20, 1e6, 0); w.add(m); return m; });
      { const m = buildSummon(p, SUMMONS.whelp, 'whelp', p.x - 0.4, p.y + 2.2, 20, 1e6, 0); w.add(m); window.__dragons.push(m); }
    });
    await step(50); await step(40);
    await shot('summons_a', 900, 560);
    await step(37);
    await shot('summons_b', 900, 560);
    const sum = await page.evaluate(async () => {
      const D = await import('/src/gfx/dragons3d.js');
      return window.__dragons.map((m) => ({ k: m.summonKey, ok: !!(m.d3 && m.d3.ok), mz: D.dragonMuzzle(m), atk: m.d3 && m.d3.pa }));
    });
    for (const s of sum) ok(s.ok && s.mz && s.mz.z > 8, `${s.k}: drawn in 3D, breath from the mouth (z ${s.mz ? s.mz.z.toFixed(0) : '-'})`);
    await page.evaluate(async () => { await window.__clean(2.1, true); });
    await step(31);
    await shot('summons_zoom', 1100, 640);
    // one dies: it falls
    await page.evaluate(() => { const m = window.__dragons[3]; m.dead = true; });
    await step(22);
    await shot('summons_fall', 900, 560);
    console.log('  info summons after the fight:', await page.evaluate(() => window.VELSCOUR.G.world.creatures.filter((c) => c.summon).map((c) => c.summonKey + (c.dead ? ' dead' : '')).join(', ')));
    await page.evaluate(() => { const { G } = window.VELSCOUR; G.world.creatures = G.world.creatures.filter((c) => c.isPlayer); });
    await step(80);

    // ---------------------------------------------------------------- 3. her wings by heat, both facings
    for (const heat of [0, 50, 100]) for (const flip of [false, true]) {
      await page.evaluate(async ([heat, flip]) => {
        const { G } = window.VELSCOUR, p = G.player;
        await window.__clean(2.4);
        const s = p.sig.s; s.heat = heat; s.busy = 0; s.vent = 0; s.beat = 0;
        p.facing = flip ? Math.PI * 0.75 + 0.6 : -Math.PI / 4 + 0.6; p.flip = flip; p.flipAt = -1;
      }, [heat, flip]);
      await step(70);
      await shot(`wings_${heat}_${flip ? 'L' : 'R'}`, 420, 360, -50);
    }
    const wings = await page.evaluate(async () => { const B = await import('/src/gfx/beasts3d.js'); const { G } = window.VELSCOUR; return { ready: B.beast('dkwings').ready, open: G.player.sig.s.open }; });
    ok(wings.ready, 'dkwings.glb loaded'); ok(wings.open > 0.9, `wings spread at full heat (open ${wings.open.toFixed(2)})`);

    // ---------------------------------------------------------------- 4. the Dragonheart
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player;
      await window.__clean(1.35); await window.__pack(9, 3.2);
      p.facing = 0; p.flip = false; G.sigStats = {};
    });
    await step(2);
    const frames = [6, 20, 36, 60, 90, 118];
    let at = 0, mouth = null;
    for (let i = 0; i < frames.length; i++) {
      if (i === 0) await page.evaluate(async () => { const { G } = window.VELSCOUR, p = G.player; p.sig.s.heat = 100; p.sig.s.busy = 0; p.sig.s.wait = 0; });
      await step(frames[i] - at + (i === 0 ? 20 : 0)); at = frames[i];
      await shot('heart_' + i, 900, 580, -60);
      const m = await page.evaluate(() => { const h = window.VELSCOUR.G.world.hazards.find((h) => h.constructor.name === 'Wake'); return h ? h.mouth : null; });
      if (m) mouth = m;
    }
    const fired = await page.evaluate(() => (window.VELSCOUR.G.sigStats.dragon_knight || {}).fire || 0);
    ok(fired >= 1, `the Dragonheart fired (${fired}x)`);
    ok(mouth && mouth[2] > 30, `the river of fire leaves the dragon's jaws (height ${mouth ? mouth[2].toFixed(0) : '-'})`);

    // ---------------------------------------------------------------- 5. the skills
    const cast = (name, frames, zoom = 2, far = 3) => page.evaluate(async ([name, zoom, far]) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      await window.__clean(zoom); await window.__pack(3, 3.6);
      const s = p.sig.s; s.heat = 30; s.busy = 0; s.vent = 0;
      for (const b of p.buffs.slice()) if (b.transform) p.buffs.splice(p.buffs.indexOf(b), 1);
      const sk = CLASS_SKILLS.dragon_knight.find((k) => k.name === name);
      p.castLock = 0; p.cooldowns = {}; p.mana = 99999; p.facing = 0; p.flip = false;
      const f = w.nearestHostile('player', p.x, p.y, 12, false);
      return !!sk && p.tryUseSkill(sk, f ? f.x : p.x + far, f ? f.y : p.y, f) !== false;
    }, [name, zoom, far]);
    for (const [name, n, file] of [['Dragon Leap', 13, 'leap'], ['Dragon Wings', 6, 'dash'], ['Wyrm Coil', 50, 'coil'], ['Draconic Roar', 24, 'roar'], ['True Dragon Form', 60, 'trueform'], ['Ironclad Wyrmform', 60, 'ironform']]) {
      const did = await cast(name);
      await step(n);
      await shot('skill_' + file, 760, 520, -50);
      ok(did, `${name} cast`);
    }
  } catch (e) { console.log('FAIL', e.stack || e); process.exitCode = 1; }
  report(errors.filter((e) => !/status of 404/.test(e))); // (the class's skill-icon sheets are not painted yet: two 404s)
  await browser.close();
})();
