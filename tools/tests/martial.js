// The Rogue and the Ninja (src/game/rogue.js, src/game/ninja.js, src/gfx/blades3d.js, src/gfx/shadowfx.js): their
// rules, and showcase shots of every move of their own, the game stepped frame by frame.
//  1. rules: Combo Points build once a cast and cap, finishers spend them and scale (finisherMul), Stealth hides her and
//     an Ambush is a sure critical; the Ninja's hook pulls 1..5 by rank (hookCount), his shadows follow and repeat a cut,
//     his flips turn the sprite, nobody is left in the air or untargetable afterwards
//  2. shots: tools/tests/out/martial_<class>_<nn>_<move>_<frame>.png and one sheet per class, martial_<class>.png
//  3. auto-play: each class plays N game seconds without errors
//   node tools/tests/martial.js [rogue,ninja] [autoplay seconds, default 40, 0 skips] [noshots] [mobile]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { openGame, report, OUT_DIR } = require('./harness');
const CLASSES = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : ['rogue', 'ninja'];
const AUTO = process.argv[3] !== undefined && !isNaN(+process.argv[3]) ? +process.argv[3] : 40;
const NOSHOTS = process.argv.includes('noshots'), MOBILE = process.argv.includes('mobile');
// [skill name, frames (60 fps) to shoot at, options: cp (Combo Points first), L (rank), self (cast on himself), pre (a skill to cast first), far (the pack stands off)]
const MOVES = {
  rogue: [
    ['Sinister Strike', [5]], ['Eviscerate', [6], { cp: 5 }], ['Backstab', [3, 9], { far: 1 }], ['Rupture', [6], { cp: 5 }],
    ['Death from Above', [14, 34, 44], { cp: 5, far: 1 }], ['Stealth', [20], { self: 1 }], ['Secret Technique', [14, 26], { cp: 5 }],
    ['Throwing Knife', [8], { far: 1 }], ['Fan of Knives', [9]], ['Rain of Daggers', [22, 44]], ['Fangs of the Earth', [8, 14, 30]],
    ["Executioner's Blade", [24, 40, 47, 70], { cp: 5 }], ['Blade Vortex', [30]], ['Crimson Tempest', [8], { cp: 5 }], ['Thousand Cuts', [30, 60]],
    ['Night of Knives', [12, 24, 70], { cp: 5 }],
  ],
  ninja: [
    ['Crescent Cut', [6, 22, 38], { times: 3 }], ["Swallow's Flight", [4, 9, 16], { far: 1 }], ['Rising Moon', [6, 13, 20]], ['Iaido', [3, 24, 28], { far: 1 }],
    ['Crossing Blades', [6, 20, 34]], ["Heaven's Drop", [12, 26, 36, 42]], ['Falling Petals', [16, 40]], ['Hundred-Cut Reckoning', [14, 40, 74, 80]],
    ['Shadow Step', [4, 10], { far: 1 }], ['Crescent Cut', [8, 14], { pre: 'Mirror Shadows', walk: 1 }], ['Grappling Hook', [6, 12, 20, 30], { L: 17, far: 1 }],
    ['Hook Swing', [8, 20], { far: 1 }], ['Umbral Legion', [10, 18]], ['Thousand Shadows', [12, 26, 54]], ['Shuriken', [7], { far: 1 }], ['Caltrops', [10, 40]],
    ['Windmill Shuriken', [10, 40], { far: 1 }], ['Backflip Scatter', [8, 16, 30]], ['Storm of Steel', [16, 34, 50]], ['Demon Wind Shuriken', [30]],
    ['Nunchaku Flurry', [6, 14]], ['Dragon Flail', [20]], ['Lightning Kick', [14, 30], { far: 1 }], ['True Dragon Technique', [14, 30]],
  ],
};
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : {});
  const VW = MOBILE ? 844 : 1280, VH = MOBILE ? 390 : 720;
  const setup = (cls) => page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    if (window.__realUpdate) game.update = window.__realUpdate;
    await game.newChar(cls, 'Showcase');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true; G.settings.gore = 1; G.settings.zoom = 1.5;
    game.buildDungeon(6, BIOME_BY_ID.overworld);
    await new Promise((r) => setTimeout(r, 500));
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const p = G.player, w = G.world;
    for (const sk of CLASS_SKILLS[cls]) G.char.skills[sk.id] = 5;
    G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
    let spot = null;
    for (let t = 0; t < 12000 && !spot; t++) {
      const x = 9 + Math.random() * (w.map.w - 18), y = 9 + Math.random() * (w.map.h - 18), R = t < 5000 ? 8 : t < 9000 ? 6 : 5;
      let ok = true;
      for (let dx = -R; dx <= R && ok; dx++) for (let dy = -R; dy <= R && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
      if (ok) spot = [x, y];
    }
    if (!spot) return 'no open spot';
    window.__home = spot;
    const upd = window.__realUpdate = game.update.bind(game); game.update = () => upd(0); // the live loop stands still: the test steps the world itself
    const V = await import('/src/core/view.js');
    // (the frozen loop no longer moves the camera: it is put on the fight, a little ahead of where the hero began)
    window.__step = (n) => { for (let i = 0; i < n; i++) { G.world.update(1 / 60); G.time = (G.time || 0) + 1 / 60; } const [hx, hy] = window.__home, q = G.player; V.camera.x = V.isoX((hx + q.x) / 2 + 0.8, (hy + q.y) / 2 - 0.2); V.camera.y = V.isoY((hx + q.x) / 2 + 0.8, (hy + q.y) / 2 - 0.2) - 30; game.render(); };
    return null;
  }, cls);
  const pack = (far, tough = true) => page.evaluate(async ([far, tough]) => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { makeMonster } = await import('/src/game/monster.js');
    const { clearVfx } = await import('/src/gfx/vfx.js');
    for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
    w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
    w.hazards.length = 0; w.corpses.length = 0; clearVfx();
    p.x = window.__home[0]; p.y = window.__home[1]; p.z = 0; p.channel = null; p.acro = null; p.cooldowns = {}; p.castLock = 0; p.queued = null; p.buffs.length = 0;
    p.targetable = true; p.alpha = undefined; p.path = null; p.moveTarget = null; p.face(0.6); p.mana = p.maxMana;
    if (p.rogue) Object.assign(p.rogue, { cp: 0, stealth: 0, dance: 0, rush: 0, flurry: 0 });
    if (p.ninja) Object.assign(p.ninja, { mirror: 0, smoke: 0 });
    const roster = w.biome.roster || ['skeleton'], foes = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 2 * Math.PI, d = k ? 1.2 + (k % 3) * 0.45 : 0, cx = far ? 4.2 : 1.7, cy = far ? -1 : -0.4;
      const m = makeMonster(w, roster[k % roster.length], w.biome, 6, k === 0 ? 'champion' : 'normal', p.x + cx + Math.cos(a) * d, p.y + cy + Math.sin(a) * d * 0.8);
      if (tough) { m.maxHp = m.hp = 1e9; } m.speed = 0; m.baseSpeed = 0; m.awake = false; m.dmg = [0, 0];
      w.add(m); foes.push(m);
    }
    w.rebuildGrid();
    window.__foes = foes;
    G.world.update(1 / 60);
  }, [far, tough]);
  const cast = (name, opt) => page.evaluate(async ([name, opt]) => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const find = (n) => CLASS_SKILLS[p.classId].find((s) => s.name === n);
    const sk = find(name);
    if (!sk) return 'no skill ' + name;
    G.char.skills[sk.id] = opt.L || 5;
    const t = window.__foes[0];
    if (opt.pre) { const q = find(opt.pre); G.char.skills[q.id] = 5; p.tryUseSkill(q, p.x, p.y); for (let i = 0; i < 50; i++) { if (opt.walk) { p.x += 0.035; p.y -= 0.012; p.moving = true; } w.update(1 / 60); } p.castLock = 0; }
    if (opt.cp && p.rogue) p.rogue.cp = opt.cp;
    for (let i = 1; i < (opt.times || 1); i++) { p.castLock = 0; p.tryUseSkill(sk, t.x, t.y, t); for (let k = 0; k < 16; k++) w.update(1 / 60); }
    p.castLock = 0; p.cooldowns = {};
    const ok = opt.self ? p.tryUseSkill(sk, p.x, p.y) : p.tryUseSkill(sk, t.x, t.y, t);
    return ok === false ? 'refused ' + name : null;
  }, [name, opt]);
  const state = () => page.evaluate(() => { const { G } = window.VELSCOUR, p = G.player; return { z: p.z, targetable: p.targetable !== false, channel: !!p.channel, alpha: p.alpha, cp: p.rogue ? p.rogue.cp : null, x: p.x, y: p.y }; });

  for (const cls of CLASSES) {
    const err = await setup(cls);
    if (err) { fail(`${cls}: ${err}`); continue; }
    // ---------------------------------------------------------------- 1. rules
    const rules = await page.evaluate(async (cls) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world, out = [];
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const find = (n) => CLASS_SKILLS[cls].find((s) => s.name === n);
      const step = (n) => { for (let i = 0; i < n; i++) w.update(1 / 60); };
      const fresh = (n = 1, d = 1.2) => {
        for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
        w.creatures = w.creatures.filter((c) => c.team !== 'enemy'); w.hazards.length = 0;
        p.x = window.__home[0]; p.y = window.__home[1]; p.z = 0; p.channel = null; p.cooldowns = {}; p.castLock = 0; p.targetable = true;
        const list = [];
        for (let k = 0; k < n; k++) { const m = makeMonster(w, (w.biome.roster || ['skeleton'])[0], w.biome, 6, 'normal', p.x + d + k * 0.5, p.y + (k % 2) * 0.5); m.maxHp = m.hp = 1e9; m.speed = 0; m.baseSpeed = 0; m.dmg = [0, 0]; w.add(m); list.push(m); }
        w.rebuildGrid(); step(1);
        return list;
      };
      const use = (name, t, L = 5) => { const sk = find(name); G.char.skills[sk.id] = L; p.castLock = 0; p.cooldowns = {}; return p.tryUseSkill(sk, t ? t.x : p.x, t ? t.y : p.y, t || null); };
      if (cls === 'rogue') {
        const R = await import('/src/game/rogue.js');
        let [t] = fresh(3);
        const S = R.rogueOf(p); S.cp = 0;
        use('Sinister Strike', t); step(30);
        if (S.cp !== 1) out.push(`Sinister Strike (2 strikes, 3 foes) gave ${S.cp} Combo Points, want 1`);
        use('Mutilate', t); step(30);
        if (S.cp !== 3) out.push(`Mutilate should add 2: ${S.cp}`);
        for (let i = 0; i < 6; i++) { use('Sinister Strike', t); step(30); }
        if (S.cp !== R.cpMax(p)) out.push(`points should cap at ${R.cpMax(p)}: ${S.cp}`);
        // a finisher spends them all and hits harder for each (her signature would add its own blows: off for the count)
        G.settings.signatures = false;
        const hpOf = (cp) => { [t] = fresh(1); S.cp = cp; G.char.madT = 0; const h0 = t.hp; let sum = 0; for (let i = 0; i < 12; i++) { S.cp = cp; const b = t.hp; use('Eviscerate', t); step(24); sum += b - t.hp; } return sum / 12; };
        const d0 = hpOf(0), d5 = hpOf(5), want = R.finisherMul(5) / R.finisherMul(0);
        if (S.cp !== 0) out.push(`a finisher should spend every point: ${S.cp} left`);
        G.settings.signatures = true;
        if (!(d5 / d0 > want * 0.7 && d5 / d0 < want * 1.4)) out.push(`Eviscerate at 5 points hits ${(d5 / d0).toFixed(2)}x of 0 points, want about ${want.toFixed(2)}x`);
        out.push(`info Eviscerate 0 cp ${Math.round(d0)}, 5 cp ${Math.round(d5)} (${(d5 / d0).toFixed(2)}x)`);
        // Stealth: untargetable, broken by a strike, the strike is an Ambush
        [t] = fresh(1);
        use('Stealth'); step(20);
        if (p.targetable !== false) out.push('Stealth did not hide her');
        S.cp = 0; use('Sinister Strike', t); step(30);
        if (p.targetable === false) out.push('a strike did not break Stealth');
        if (S.cp !== 2) out.push(`an Ambush builder should give 2 points: ${S.cp}`);
        use('Stealth'); step(60 * 9);
        if (p.targetable === false || p.alpha !== undefined) out.push('Stealth never ran out');
        // Backstab puts her behind the foe
        [t] = fresh(1, 3.5);
        const before = Math.hypot(p.x - t.x, p.y - t.y); use('Backstab', t); step(10);
        const after = Math.hypot(p.x - t.x, p.y - t.y);
        if (!(after < 1.3 && before > 3 && p.x > t.x)) out.push(`Backstab: was ${before.toFixed(1)} away, now ${after.toFixed(1)} (${(p.x - t.x).toFixed(1)} past it)`);
        // the points drain out of a fight
        S.cp = 3; S.idle = 0; step(60 * 16);
        if (S.cp >= 3) out.push('Combo Points never drain');
      } else {
        const N = await import('/src/game/ninja.js');
        if ([1, 4, 5, 9, 13, 16, 17, 20].map(N.hookCount).join() !== '1,1,2,3,4,4,5,5') out.push('hookCount: ' + [1, 4, 5, 9, 13, 16, 17, 20].map(N.hookCount).join());
        for (const [L, n] of [[1, 1], [9, 3], [20, 5]]) {
          const foes = fresh(6, 5), at = foes.map((m) => Math.hypot(m.x - p.x, m.y - p.y));
          use('Grappling Hook', foes[0], L); step(60);
          const pulled = foes.filter((m, i) => Math.hypot(m.x - p.x, m.y - p.y) < at[i] - 2).length;
          if (pulled !== n) out.push(`Grappling Hook rank ${L} pulled ${pulled}, want ${n}`);
          if (foes.some((m) => m.z)) out.push('a hooked foe was left in the air');
        }
        // his shadows repeat a cut
        let [t] = fresh(1);
        G.char.madT = 0;
        const cut = () => { let s = 0; for (let i = 0; i < 12; i++) { const b = t.hp; use('Crescent Cut', t); step(40); s += b - t.hp; } return s / 12; };
        const plain = cut();
        use('Mirror Shadows'); step(10);
        const S = N.ninjaOf(p);
        if (!(S.mirror > 0) || S.mirrorN !== N.mirrorCount(5)) out.push(`Mirror Shadows: ${S.mirror} s, ${S.mirrorN} shadows`);
        const mirrored = cut(), buff = 1 + (p.buffs.find((b) => b.stats && b.stats.dmg) ? p.buffs.find((b) => b.stats && b.stats.dmg).stats.dmg / 100 : 0);
        if (!(mirrored > plain * buff * 1.15)) out.push(`shadows did not add to a cut: ${Math.round(plain)} -> ${Math.round(mirrored)}`);
        out.push(`info Crescent Cut ${Math.round(plain)}, with ${S.mirrorN} shadows ${Math.round(mirrored)}`);
        // flips turn the sprite; every move ends on the ground, targetable, free to act
        [t] = fresh(1, 4);
        use("Swallow's Flight", t); step(4);
        if (!p.acro) out.push("Swallow's Flight: no flip");
        for (const sk of CLASS_SKILLS[cls].filter((s) => s.m.nin)) {
          [t] = fresh(4, 2.5); use(sk.name, t); step(60 * 4);
          if (p.z !== 0 || p.channel || p.targetable === false || p.acro) out.push(`${sk.name}: left z=${p.z} channel=${!!p.channel} targetable=${p.targetable} acro=${!!p.acro}`);
          if (!w.map.walkable(p.x, p.y)) out.push(`${sk.name}: left him off the floor`);
        }
      }
      return out;
    }, cls);
    for (const l of rules) l.startsWith('info') ? console.log(`  ${cls} ${l.slice(5)}`) : fail(`${cls}: ${l}`);
    // ---------------------------------------------------------------- 2. shots
    const files = [];
    if (!NOSHOTS) for (const [n, [name, frames, opt = {}]] of MOVES[cls].entries()) {
      await pack(!!opt.far);
      const e = await cast(name, opt);
      if (e) { fail(`${cls}: ${e}`); continue; }
      let at = 0;
      for (const f of frames) {
        await page.evaluate((k) => window.__step(k), f - at); at = f;
        const file = path.join(OUT_DIR, `martial_${cls}_${String(n).padStart(2, '0')}_${name.replace(/[^a-z]+/gi, '')}_${String(f).padStart(2, '0')}.png`);
        const w = MOBILE ? 420 : 560, h = MOBILE ? 300 : 400;
        await page.screenshot({ path: file, clip: { x: VW / 2 - w * 0.42, y: VH / 2 - h * 0.62, width: w, height: h } });
        files.push(file);
      }
      await page.evaluate(() => window.__step(240));
      const s = await state();
      if (s.z !== 0 || !s.targetable && name !== 'Stealth' || s.channel) fail(`${cls} ${name}: left z=${s.z} targetable=${s.targetable} channel=${s.channel}`);
    }
    if (files.length) { // one sheet per class
      const py = 'import sys\nfrom PIL import Image\nout, files = sys.argv[1], sys.argv[2:]\nims = [Image.open(f).convert("RGB") for f in files]\nw, h = ims[0].size\ncols = 5\nrows = -(-len(ims) // cols)\nsheet = Image.new("RGB", (cols * w // 2, rows * h // 2), (20, 20, 24))\nfor i, im in enumerate(ims):\n    sheet.paste(im.resize((w // 2, h // 2), Image.LANCZOS), ((i % cols) * w // 2, (i // cols) * h // 2))\nsheet.save(out)\n';
      spawnSync(process.env.PYTHON || 'python', ['-c', py, path.join(OUT_DIR, `martial_${cls}.png`), ...files], { stdio: 'inherit' });
      console.log(`  ${cls}: ${files.length} shots, sheet martial_${cls}.png`);
    }
    // ---------------------------------------------------------------- 3. auto-play
    if (AUTO > 0) {
      const res = await page.evaluate(async ([cls, secs]) => {
        const { G, game } = window.VELSCOUR;
        if (window.__realUpdate) game.update = window.__realUpdate;
        await game.newChar(cls, 'Auto');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
        const { CLASS_SKILLS } = await import('/src/data/skills.js');
        for (const sk of CLASS_SKILLS[cls]) G.char.skills[sk.id] = 3;
        G.char.level = 30; G.player.recompute();
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        game.buildDungeon(4, BIOME_BY_ID.catacombs);
        const { Auto } = await import('/src/game/autoplay.js');
        G.settings.autoGear = true; Auto.toggle(true);
        const k0 = G.char.kills || 0, x0 = G.player.x, y0 = G.player.y;
        let stuck = 0, sx = x0, sy = y0, still = 0;
        for (let i = 0; i < secs * 30; i++) {
          if (G.mode !== 'game' || !G.world) break;
          G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30);
          if (i % 15 === 0) await new Promise((r) => setTimeout(r, 0));
          if (i % 30 === 0) { // a hero who neither moves nor kills for 12 s is stuck somewhere
            const p = G.player;
            still = Math.hypot(p.x - sx, p.y - sy) < 0.3 && (G.char.kills || 0) === stuck ? still + 1 : 0;
            sx = p.x; sy = p.y; stuck = G.char.kills || 0;
            if (still >= 12) break;
          }
        }
        const status = Auto.status, p = G.player;
        Auto.toggle(false);
        return { kills: (G.char.kills || 0) - k0, deaths: G.char.deaths || 0, depth: G.world.depth, kind: G.world.kind, still, status, channel: p.channel ? p.channel.constructor.name : null, z: p.z, floor: G.world.map.walkable(p.x, p.y), targetable: p.targetable !== false };
      }, [cls, AUTO]);
      console.log(`  ${cls} auto-play ${AUTO}s: ${JSON.stringify(res)}`);
      if (!res.kills) fail(`${cls}: auto-play killed nothing in ${AUTO}s`);
      if (res.still >= 12) fail(`${cls}: auto-play stood still for 12 s (${res.status})`);
    }
  }
  await browser.close();
  report(errors.filter((e) => !/404/.test(e)));
  if (bad) process.exitCode = 1;
  console.log(bad ? `${bad} FAILED` : 'martial: all checks passed');
})();
