// The Death Knight's Runeblade as a familiar (src/game/sigs/deathknight.js) and his frost skulls (src/gfx/dkskull.js):
//  1. the frost skulls: the Velscour contact skull recoloured, eye dots removed; Death Coil flies it ('dkskull')
//  2. all 15 idle patterns: the sword moves, stays near him (the 3 far ones dance 2-3 tiles out), never NaN; depth order
//  3. a swing for every kind of skill, every Death Knight skill maps to one, each finishes
//  4. its five skills hurt a pack (and never charge the runes)
//  5. a soak: auto-play-style casting at a live pack, the sword uses every skill and many swings, no errors
//   node tools/tests/runeblade_familiar.js [soak seconds, default 60] [mobile]
// Shots: dk_skulls.png, dk_patterns.png (12 patterns x 4 moments), dk_swings.png (each swing, 4 moments),
//        dk_pet.png (each sword skill, 4 moments), dk_runeweapon.png (both summons), dk_blades.png (thrown, rained and
//        orbiting swords), dk_deathcoil.png
const fs = require('fs'), path = require('path');
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = '--enable-unsafe-swiftshader';   // WebGL in headless
const { openGame, report, OUT_DIR } = require('./harness');
const SOAK = process.argv[2] !== undefined && !isNaN(+process.argv[2]) ? +process.argv[2] : 60, MOBILE = process.argv.includes('mobile');

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  const ok = (c, msg) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${msg}`) || (c || (process.exitCode = 1));
  const save = (name, url) => fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  const vp = page.viewportSize(), CW = MOBILE ? 300 : 420, CH = MOBILE ? 300 : 360;
  const clip = { x: vp.width / 2 - CW / 2, y: vp.height / 2 - CH * 0.62, width: CW, height: CH };
  const strip = (rows, w, h, labels) => page.evaluate(async ({ rows, w, h, labels }) => {
    const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + u; });
    const cols = Math.max(...rows.map((r) => r.length)), c = document.createElement('canvas'); c.width = w * cols + 110; c.height = h * rows.length;
    const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#e8e0c8'; g.font = '13px monospace';
    for (let j = 0; j < rows.length; j++) { g.fillText(labels[j], 6, j * h + 20); for (let i = 0; i < rows[j].length; i++) g.drawImage(await load(rows[j][i]), 110 + i * w, j * h); }
    return c.toDataURL();
  }, { rows: rows.map((r) => r.map((s) => s.toString('base64'))), w, h, labels });
  try {
    const setup = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('death_knight', 'Rime');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      game.buildDungeon(6, BIOME_BY_ID.overworld);
      await new Promise((r) => setTimeout(r, 300));
      G.godMode = true; G.settings.zoom = 1.6; G.settings.gore = 0; G.settings.dmgNumbers = false; G.paused = false;
      (await import('/src/core/view.js')).camera.computeZoom();
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
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      for (const sk of CLASS_SKILLS.death_knight) G.char.skills[sk.id] = 5;
      G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
      G.sigStats = {};
      for (let i = 0; i < 10; i++) w.update(1 / 30);
      const R3 = await import('/src/gfx/runeblade3d.js'), K = await import('/src/gfx/dkskull.js');
      for (let i = 0; i < 80 && !R3.runeblade3DReady(R3.runebladeLook(30).skin); i++) await new Promise((r) => setTimeout(r, 50));
      // 1. the frost skulls
      const c = document.createElement('canvas'); c.width = 560; c.height = 150; const g = c.getContext('2d');
      g.fillStyle = '#26242e'; g.fillRect(0, 0, 560, 150);
      let drawn = K.drawDkSkull(g, 0, 0, 1);
      for (let i = 0; i < 40 && !drawn; i++) { await new Promise((r) => setTimeout(r, 50)); drawn = K.drawDkSkull(g, -50, -50, 10); }
      const src = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'assets/ui/velscour_contact_skull.png'; });
      g.drawImage(src, 10, 10, 128, 128);
      const pals = ['#e8f4ff', '#bfeaff'];
      pals.forEach((b, i) => { K.drawDkSkull(g, 210 + i * 95, 52, 72, b); K.drawDkSkull(g, 190 + i * 95, 125, 14, b); K.drawDkSkull(g, 225 + i * 95, 122, 22, b); });
      // its colours: no warm bone left
      const d = g.getImageData(160, 10, 400, 90).data; let warm = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i] === 0x26 && d[i + 1] === 0x24) continue; n++; if (d[i] > d[i + 2] + 40) warm++; }
      // and no eye dots: the sockets stay dark (eyes at (46, 66) and (81, 66) of 128, drawn 72 px tall at (174, 16))
      let eyes = 0;
      for (const [ex, ey] of [[46, 66], [81, 66]]) { const e = g.getImageData(174 + Math.round(ex * 72 / 128) - 1, 16 + Math.round(ey * 72 / 128) - 1, 3, 3).data; for (let i = 0; i < e.length; i += 4) eyes = Math.max(eyes, e[i], e[i + 1], e[i + 2]); }
      return { drawn, warm: warm / Math.max(1, n), eyes, sheet: c.toDataURL(), sig: !!p.sig };
    });
    ok(setup.sig, 'Death Knight has his signature');
    ok(setup.drawn && setup.warm < 0.02, `frost skulls draw from the contact skull (warm px ${(setup.warm * 100).toFixed(1)}%)`);
    ok(setup.eyes < 110, `no eye dots: the sockets stay dark (brightest ${setup.eyes})`);
    save('dk_skulls', setup.sheet);

    // the particles his casts and hits throw use it, and Death Coil flies it
    const coil = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR, p = G.player, w = G.world;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const m = makeMonster(w, (w.biome.roster || ['skeleton'])[0], w.biome, 6, 'normal', p.x + 4, p.y - 1); m.maxHp = m.hp = 1e8; m.speed = 0; m.awake = true; w.add(m); w.rebuildGrid();
      const sk = CLASS_SKILLS.death_knight.find((s) => s.name === 'Death Coil');
      p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, m.x, m.y, m);
      for (let i = 0; i < 6; i++) w.update(1 / 30);
      game.render();
      const pr = w.hazards.find((h) => h.constructor.name === 'Projectile' && h.src === p);
      return { fx: pr && pr.fx };
    });
    ok(coil.fx === 'dkskull', 'Death Coil flies the frost skull: ' + coil.fx);
    await page.waitForTimeout(60); await page.evaluate(() => window.VELSCOUR.game.render());
    fs.writeFileSync(path.join(OUT_DIR, 'dk_deathcoil.png'), await page.screenshot({ clip }));

    const clear = () => page.evaluate(async () => {
      const { G } = window.VELSCOUR, w = G.world;
      const { effects, texts, particles } = await import('/src/gfx/vfx.js');
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
      w.hazards = w.hazards.filter((h) => h.constructor.name === 'SigBack');
      for (let i = effects.length - 1; i >= 0; i--) if (effects[i].constructor.name !== 'SigLayer') effects.splice(i, 1);
      texts.length = 0; particles.length = 0;
      const p = G.player; p.sig.s.runes = ['frost', 'unholy', 'blood']; p.sig.s.wait = 99;
      if (p.sig.s.fam) { p.sig.s.fam.gcd = 99; p.sig.s.fam.act = null; }
    });
    const stepShot = async (n) => { await page.evaluate((n) => { const { G, game } = window.VELSCOUR; for (let i = 0; i < n; i++) G.world.update(1 / 30); game.render(); }, n); return page.screenshot({ clip }); };

    // 2. the idle patterns
    await clear();
    const P = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, s = p.sig.s;
      const D = await import('/src/game/sigs/deathknight.js'), M = D.default, out = {};
      for (const id of Object.keys(D.PATTERNS)) {
        M.pattern(p, s, id); s.fam.gcd = 99;
        let len = 0, far = 0, nan = false, back = 0, lx = s.fam.x, ly = s.fam.y, lz = s.fam.z, la = s.fam.a, ls = s.fam.spin;
        for (let i = 0; i < 150; i++) {
          G.world.update(1 / 30);
          const F = s.fam;
          if (i > 30) { len += Math.hypot(F.x - lx, F.y - ly) + Math.abs(F.z - lz) / 32 + (Math.abs(F.a - la) + Math.abs(F.spin - ls) * 0.3) * 0.15; far = Math.max(far, Math.hypot(F.x - p.x, F.y - p.y)); if (F.x + F.y < p.x + p.y - 0.05) back++; }
          lx = F.x; ly = F.y; lz = F.z; la = F.a; ls = F.spin;
          if (![F.x, F.y, F.z, F.a, F.spin, F.tilt, F.len].every(Number.isFinite)) nan = true;
        }
        out[id] = { len: +len.toFixed(2), far: +far.toFixed(2), nan, back, pat: s.fam.pat };
      }
      return out;
    });
    const ids = Object.keys(P);
    console.log('       ' + ids.map((k) => `${k} ${P[k].len}/${P[k].far}${P[k].back ? ' (behind ' + P[k].back + ')' : ''}`).join(', '));
    ok(ids.length === 15, `${ids.length} idle patterns`);
    ok(ids.every((k) => !P[k].nan && P[k].pat === k), 'patterns hold and never go NaN');
    const FAR = ['rove', 'dance', 'scout'], near = ids.filter((k) => !FAR.includes(k));
    ok(near.every((k) => P[k].far < 2.6), 'near patterns stay near him (max ' + Math.max(...near.map((k) => P[k].far)) + ' tiles)');
    ok(FAR.every((k) => P[k] && P[k].far > 2.2 && P[k].far < 3.6), 'far patterns dance out 2.2-3.6 tiles: ' + FAR.map((k) => P[k] && P[k].far).join(', '));
    ok(ids.filter((k) => P[k].len > 0.6).length >= 9, 'patterns move or turn' + (ids.some((k) => P[k].len <= 0.6) ? ' (calm: ' + ids.filter((k) => P[k].len <= 0.6).join(', ') + ')' : ''));
    ok(ids.some((k) => P[k].back > 10), 'some patterns pass behind him');
    const rows = [];
    for (const id of ids) {
      await page.evaluate(async (id) => { const { G } = window.VELSCOUR, p = G.player; const M = (await import('/src/game/sigs/deathknight.js')).default; M.pattern(p, p.sig.s, id); p.sig.s.fam.gcd = 99; }, id);
      const r = []; await stepShot(20); for (let i = 0; i < 4; i++) r.push(await stepShot(9)); rows.push(r);
    }
    save('dk_patterns', await strip(rows, CW, CH, ids));

    // 3. a swing for every kind of skill
    const S = await page.evaluate(async () => {
      const D = await import('/src/game/sigs/deathknight.js');
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const map = {};
      for (const sk of CLASS_SKILLS.death_knight) { const m = D.swingFor(sk); (map[m] = map[m] || []).push(sk.name); }
      return { names: Object.keys(D.SWINGS), map, bad: CLASS_SKILLS.death_knight.filter((sk) => !D.SWINGS[D.swingFor(sk)]).map((s) => s.name) };
    });
    ok(!S.bad.length, 'every Death Knight skill has a swing ' + S.bad.join(','));
    console.log('       ' + Object.entries(S.map).map(([k, v]) => `${k}: ${v.length}`).join(', '));
    const srows = [];
    for (const nm of S.names) {
      await clear();
      const done = await page.evaluate(async (nm) => {
        const { G } = window.VELSCOUR, p = G.player, s = p.sig.s; const M = (await import('/src/game/sigs/deathknight.js')).default;
        M.pattern(p, s, 'shoulder'); s.fam.gcd = 99; for (let i = 0; i < 20; i++) G.world.update(1 / 30);
        M.swingNow(p, s, nm, 0.5, 3);
        return s.fam.act && s.fam.act.name;
      }, nm);
      const r = []; for (let i = 0; i < 4; i++) r.push(await stepShot(i ? 5 : 3)); srows.push(r);
      const end = await page.evaluate(() => { const { G } = window.VELSCOUR, s = G.player.sig.s; for (let i = 0; i < 40; i++) G.world.update(1 / 30); return !s.fam.act && Number.isFinite(s.fam.x + s.fam.a); });
      if (done !== nm || !end) ok(false, `swing ${nm} started ${done}, finished ${end}`);
    }
    ok(true, `${S.names.length} swings: ${S.names.join(', ')}`);
    save('dk_swings', await strip(srows, CW, CH, S.names));

    // 4. the sword's own skills against a pack
    const prow = [], pnames = [];
    const pack = () => page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { makeMonster } = await import('/src/game/monster.js');
      const roster = w.biome.roster || ['skeleton'];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 2 * Math.PI, d = k % 2 ? 1.4 : 2.6;
        const m = makeMonster(w, roster[k % roster.length], w.biome, 6, k === 0 ? 'champion' : 'normal', p.x + 1.5 + Math.cos(a) * d * 0.6, p.y - 0.5 + Math.sin(a) * d * 0.6);
        m.maxHp = m.hp = 1e8; m.speed = 0; m.awake = true; w.add(m);
      }
      w.rebuildGrid();
    });
    const pet = await page.evaluate(async () => (await import('/src/game/sigs/deathknight.js')).PET.map((q) => q.id));
    for (const id of pet) {
      await clear(); await pack();
      const r0 = await page.evaluate(async (id) => {
        const { G } = window.VELSCOUR, p = G.player, s = p.sig.s, M = (await import('/src/game/sigs/deathknight.js')).default;
        M.pattern(p, s, 'shoulder'); for (let i = 0; i < 15; i++) G.world.update(1 / 30);
        s.runes = ['frost']; s.gap = 99;
        return M.pet(p, s, id);
      }, id);
      const r = []; for (let i = 0; i < 4; i++) r.push(await stepShot(i ? 9 : 5)); prow.push(r); pnames.push(id);
      const res = await page.evaluate(() => {
        const { G } = window.VELSCOUR, p = G.player, s = p.sig.s;
        for (let i = 0; i < 50; i++) G.world.update(1 / 30);
        const lost = G.world.creatures.filter((c) => c.team === 'enemy').reduce((a, c) => a + (c.maxHp - c.hp), 0);
        return { lost, runes: s.runes.length };
      });
      ok(r0 && res.lost > 0 && res.runes === 1, `sword skill ${id}: started ${r0}, dealt ${Math.round(res.lost)}, runes untouched (${res.runes})`);
    }
    save('dk_pet', await strip(prow, CW, CH, pnames));

    // 4b. the Rune Weapon summons: the same 3D Runeblade, the same size as the familiar, swinging as it attacks
    const rwRows = [], rwNames = [];
    for (const name of ['Dancing Rune Weapon', 'Dark Runeweapon']) {
      await clear(); await pack();
      const got = await page.evaluate(async (name) => {
        const { G } = window.VELSCOUR, p = G.player, w = G.world;
        const { CLASS_SKILLS } = await import('/src/data/skills.js');
        const sk = CLASS_SKILLS.death_knight.find((s) => s.name === name);
        if (!sk) return 'no skill';
        for (const c of w.creatures) if (c.summonKey === 'runeweapon') c.dead = true;
        p.castLock = 0; p.cooldowns = {}; p.mana = 99999; w.rebuildGrid();
        const f = w.nearestHostile('player', p.x, p.y, 12, false);
        p.tryUseSkill(sk, f ? f.x : p.x + 1, f ? f.y : p.y, f);
        for (let i = 0; i < 12; i++) w.update(1 / 30);
        return w.creatures.filter((c) => c.summonKey === 'runeweapon' && c.owner === p && !c.dead).length;
      }, name);
      const r = []; for (let i = 0; i < 4; i++) r.push(await stepShot(i ? 5 : 2)); rwRows.push(r); rwNames.push(name.split(' ').slice(-2).join(' '));
      const res = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, p = G.player, w = G.world;
        const { RUNEBLADE_LEN } = await import('/src/gfx/runeblade3d.js');
        const m = w.creatures.find((c) => c.summonKey === 'runeweapon' && c.owner === p && !c.dead);
        if (!m) return null;
        const kinds = new Set(); let swings = 0, last = 0;
        for (let i = 0; i < 240; i++) { w.update(1 / 30); game.render(); if (m.lunge > last + 0.3) swings++; last = m.lunge; if (m._rw) kinds.add(m._rw.kind); }
        return { drawn: !!m._rw, swings, kinds: [...kinds], len: RUNEBLADE_LEN * (m.scale || 1), fam: RUNEBLADE_LEN, top: Number.isFinite(m.screenTop) };
      });
      ok(got >= 1 && res && res.drawn && res.top, `${name}: summoned (${got}), drawn as the 3D Runeblade`);
      if (res) ok(res.swings > 0 && res.len === res.fam, `${name}: ${res.swings} attacks, swings ${res.kinds.join('/')}, ${res.len} px long like the familiar (${res.fam})`);
    }
    save('dk_runeweapon', await strip(rwRows, CW, CH, rwNames));

    // 4c. every sword he throws, rains, orbits or whirls is the 3D Runeblade ('dkblade'), never the flat blade
    const bladeRows = [], bladeNames = [];
    const BLADES = await page.evaluate(async () => (await import('/src/data/skills.js')).CLASS_SKILLS.death_knight.filter((s) => s.fx === 'blade' && ['proj', 'orbit', 'rain', 'whirl', 'cyclone'].includes(s.kind)).map((s) => s.name));
    for (const name of BLADES) {
      await clear(); await pack();
      const r = await page.evaluate(async (name) => {
        const { G } = window.VELSCOUR, p = G.player, w = G.world;
        const sk = (await import('/src/data/skills.js')).CLASS_SKILLS.death_knight.find((s) => s.name === name);
        p.castLock = 0; p.cooldowns = {}; p.mana = 99999; p.channel = null; w.rebuildGrid();
        const f = w.nearestHostile('player', p.x, p.y, 12, false);
        p.tryUseSkill(sk, f ? f.x : p.x + 2, f ? f.y : p.y, f);
        for (let i = 0; i < 8; i++) w.update(1 / 30);
        const mine = w.hazards.filter((h) => h.src === p && h.fx);
        return { dk: mine.filter((h) => h.fx === 'dkblade').length, flat: mine.filter((h) => h.fx === 'blade').length };
      }, name);
      ok(r.dk > 0 && !r.flat, `${name}: ${r.dk} drawn as the 3D Runeblade, ${r.flat} flat blades`);
      const row = []; for (let i = 0; i < 3; i++) row.push(await stepShot(i ? 4 : 1)); bladeRows.push(row); bladeNames.push(name.slice(0, 14));
    }
    // the 3D blade's draw cost (SwiftShader in headless: an upper bound)
    const cost = await page.evaluate(async () => {
      const { drawShape } = await import('/src/gfx/shapes.js'), { elem } = await import('/src/gfx/vfx.js');
      const c = document.createElement('canvas'); c.width = c.height = 300; const g = c.getContext('2d'), E = elem('cold');
      const t0 = performance.now(); for (let i = 0; i < 60; i++) drawShape(g, 'dkblade', 150, 150, i * 0.1, 1, E, i * 0.05);
      return (performance.now() - t0) / 60;
    });
    console.log(`       3D blade draw: ${cost.toFixed(2)} ms each (headless software GL)`);
    if (bladeRows.length) save('dk_blades', await strip(bladeRows, CW, CH, bladeNames));

    // 5. soak: casting at a live pack
    await clear();
    const soak = await page.evaluate(async (secs) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const skills = CLASS_SKILLS.death_knight;
      p.sig.s.runes = []; p.sig.s.wait = 0; p.sig.s.gap = 0; p.sig.s.fam.gcd = 0; G.sigStats = {};
      let t = 0, castT = 0, nan = 0, flat = 0; const kinds = {};
      while (t < secs) {
        if (w.creatures.filter((c) => c.team === 'enemy' && !c.dead).length < 4) {
          const roster = w.biome.roster || ['skeleton'];
          for (let k = 0; k < 6; k++) { const [x, y] = w.map.randomNear(p.x, p.y, 4); const m = makeMonster(w, roster[k % roster.length], w.biome, 6, k ? 'normal' : 'champion', x, y); m.awake = true; w.add(m); }
          w.rebuildGrid();
        }
        if ((castT -= 1 / 30) <= 0) {
          castT = 0.35; w.rebuildGrid();
          const f = w.nearestHostile('player', p.x, p.y, 12, false);
          if (f) { const sk = Math.random() < 0.4 ? skills[0] : skills[Math.floor(Math.random() * skills.length)]; p.castLock = 0; p.cooldowns = {}; p.channel = null; p.mana = 99999; p.tryUseSkill(sk, f.x, f.y, f); }
        }
        w.update(1 / 30); t += 1 / 30;
        const F = p.sig.s.fam; if (F && !Number.isFinite(F.x + F.y + F.z + F.a)) nan++;
        for (const h of w.hazards) if (h.src === p && (h.fx === 'blade' || h.fx === 'skull')) { flat++; kinds[h.constructor.name + (h.mode ? '.' + h.mode : '') + ':' + h.fx] = 1; }
      }
      return { stats: G.sigStats.death_knight || {}, nan, flat, kinds: Object.keys(kinds) };
    }, SOAK);
    const st = soak.stats, petUsed = pet.filter((id) => st['pet_' + id]), swings = Object.keys(st).filter((k) => k.startsWith('swing_'));
    console.log('       ' + JSON.stringify(st));
    ok(!soak.nan, 'no NaN in the soak');
    ok(!soak.flat, 'no flat blade or drawn skull from him in the soak (' + soak.flat + ' ' + soak.kinds.join(', ') + ')');
    if (SOAK >= 30) {
      ok(petUsed.length >= 4, `the sword used ${petUsed.length}/5 of its skills: ${petUsed.join(', ')}`);
      ok(swings.length >= 6, `${swings.length} kinds of swing in play`);
      ok((st.fire || 0) >= 1, 'RUNIC OBLITERATION still fires: ' + (st.fire || 0));
    }
    console.log('  shots: dk_skulls, dk_deathcoil, dk_patterns, dk_swings, dk_pet, dk_runeweapon, dk_blades');
  } finally {
    report(errors);
    await browser.close();
  }
})();
