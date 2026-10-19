// Boomerang Knight: every boomerang and chakram he throws comes back to his hand. Casts each of his projectile skills
// at a pack of pinned, immortal dummies in an open Wilds map and prints the damage per cast (for balancing), then
// checks every thrown blade was caught by him: standing still, running sideways while they fly, and thrown into a
// dungeon wall. Ends with shots of the eight blue boomerangs circling his helm.
//   node tools/tests/boomerang.js [casts per skill, default 6] [json|text] [skill names,...]   # json: {skill: dmg} for diffing
const { openGame, report } = require('./harness');
const casts = +(process.argv[2] || 6), json = process.argv[3] === 'json', only = process.argv[4] ? process.argv[4].split(',') : null;

(async () => {
  const { browser, page, errors, shot } = await openGame();
  const res = await page.evaluate(async ({ casts, only }) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('boomerang_knight', 'Rang' + Math.random());
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { makeMonster } = await import('/src/game/monster.js');
    const { Projectile } = await import('/src/game/hazards.js');
    G.godMode = true; G.char.level = 40; G.settings.signatures = false; // no Trick Shots in the numbers
    const sks = CLASS_SKILLS.boomerang_knight.filter((s) => ['proj', 'rain'].includes(s.kind) && /rang|chakram/.test(s.fx) && (!only || only.includes(s.name)));
    for (const sk of CLASS_SKILLS.boomerang_knight) G.char.skills[sk.id] = 10;
    const out = { dmg: {}, fails: [], lines: [] };
    const missing = sks.filter((s) => !s.m.ret).map((s) => s.name);
    if (missing.length) out.fails.push('no ret: ' + missing.join(', '));
    // every blade thrown and every one caught (and where)
    let thrown = 0, caught = 0, far = 0;
    const P = Projectile.prototype, orig = P.caught;
    if (orig) P.caught = function (s) { if (this.src === G.player) { caught++; if (Math.hypot(this.x - s.x, this.y - s.y) > 0.6) far++; } return orig.call(this, s); };
    const step = (n, f) => { for (let i = 0; i < n; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; f && f(i); G.world.update(1 / 30); } };
    const setup = (biome, open) => {
      game.buildDungeon(6, BIOME_BY_ID[biome]);
      const w = G.world, p = G.player;
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
      const orig = w.addHazard.bind(w);
      w.addHazard = (h) => { if (h instanceof Projectile && h.src === p && /rang|chakram/.test(h.fx)) thrown++; return orig(h); };
      let spot = null;
      for (let t = 0; t < 8000 && !spot; t++) {
        const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
        let ok = true;
        for (let dx = -open; dx <= open && ok; dx++) for (let dy = -open; dy <= open && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
        if (ok) spot = [x, y];
        if (t % 2000 === 1999) open--; // settle for a smaller clearing
      }
      p.x = spot[0]; p.y = spot[1]; p.recompute();
      return { w, p };
    };
    const reset = (p) => { p.mana = p.maxMana = 99999; p.castLock = 0; p.channel = null; p.cooldowns = {}; };
    const drain = (w, p, f) => { for (let k = 0; k < 600 && w.hazards.some((h) => h instanceof Projectile && h.src === p); k++) step(1, f); };

    // 1. damage per cast on a pack (8 dummies 3-6 tiles ahead)
    {
      const { w, p } = setup('overworld', 7);
      const OFF = [[4, 0], [4.6, 0.9], [4.4, -1], [3.4, 0.5], [5.4, -0.3], [3.6, -0.8], [5.8, 1.1], [6.2, -1.2]];
      const dummies = OFF.map(([dx, dy]) => {
        const m = makeMonster(w, 'skeleton', w.biome, 30, 'normal', p.x + dx, p.y + dy);
        m.maxHp = m.hp = 1e12; m.awake = true; m.speed = 0; m.dmg = [0, 0]; m.x0 = m.x; m.y0 = m.y; w.add(m); return m;
      });
      const pin = () => { for (const d of dummies) { d.x = d.x0; d.y = d.y0; d.dead = false; } };
      const px = p.x, py = p.y;
      for (const sk of sks) {
        let tot = 0;
        for (let c = 0; c < casts; c++) {
          reset(p); p.x = px; p.y = py; pin(); for (const d of dummies) { d.hp = d.maxHp; d.status = {}; } w.rebuildGrid();
          const hp0 = dummies.map((d) => d.hp), t0 = thrown, c0 = caught;
          p.tryUseSkill(sk, px + 4.5, py, dummies[0]);
          step(2, pin); drain(w, p, pin); step(20, pin);
          tot += dummies.reduce((s, d, i) => s + (hp0[i] - d.hp), 0);
          if (orig && thrown - t0 !== caught - c0) out.fails.push(`${sk.name}: threw ${thrown - t0}, caught ${caught - c0}`);
        }
        out.dmg[sk.name] = Math.round(tot / casts);
      }
      // 2. he runs sideways while they fly: they must find him where he is now
      const t0 = thrown, c0 = caught, far0 = far;
      for (const sk of sks.slice(0, 6)) {
        reset(p); p.x = px; p.y = py; pin(); w.rebuildGrid();
        p.tryUseSkill(sk, px + 4.5, py, dummies[0]);
        drain(w, p, (i) => { pin(); if (i < 25) w.map.move(p, 0, 0.12, false); });
      }
      out.lines.push(`running: threw ${thrown - t0}, caught ${caught - c0}, caught away from him ${far - far0}`);
      if (orig && (thrown - t0 !== caught - c0 || far > far0)) out.fails.push('running: not every blade came back to his hand');
      w.creatures = w.creatures.filter((c) => !dummies.includes(c));
    }
    // 3. thrown at a wall in a dungeon: they come home over the wall instead of sticking to it
    {
      const { w, p } = setup('catacombs', 1);
      const t0 = thrown, c0 = caught;
      let worst = 0;
      for (const sk of sks) {
        for (let a = 0; a < 4; a++) {
          reset(p); const ang = a * Math.PI / 2;
          p.tryUseSkill(sk, p.x + Math.cos(ang) * 9, p.y + Math.sin(ang) * 9, null);
          let k = 0; for (; k < 600 && w.hazards.some((h) => h instanceof Projectile && h.src === p); k++) step(1);
          worst = Math.max(worst, k / 30);
        }
      }
      out.lines.push(`walls: threw ${thrown - t0}, caught ${caught - c0}, longest flight ${worst.toFixed(1)}s`);
      if (orig && thrown - t0 !== caught - c0) out.fails.push('walls: blades lost');
      if (worst > 8) out.fails.push('walls: a blade flew for ' + worst.toFixed(1) + 's');
    }
    // 4. the circling boomerangs (shots below)
    setup('overworld', 4); G.settings.signatures = true; G.settings.zoom = 2;
    out.lines.push(`total: threw ${thrown}, caught ${caught}`);
    return out;
  }, { casts, only });
  if (json) console.log(JSON.stringify(res.dmg));
  else {
    for (const [k, v] of Object.entries(res.dmg)) console.log(`  ${k.padEnd(20)} ${v}`);
    for (const l of res.lines) console.log('  ' + l);
  }
  for (const f of res.fails) console.log('FAIL ' + f);
  if (res.fails.length) process.exitCode = 1;
  for (const n of [5, 8]) {
    await page.evaluate((n) => { const { G } = window.VELSCOUR; const s = G.player.sig && G.player.sig.s; if (s) { s.n = n; s.busy = 0; } }, n);
    await page.waitForTimeout(600);
    await shot(`boomerang_ring_${n}`);
    for (const k of [0, 1]) { // close-ups a moment apart, so the ring turns
      await page.waitForTimeout(k * 350);
      await page.screenshot({ path: require('path').join(process.env.OUT_DIR || require('path').join(__dirname, 'out'), `boomerang_ring_${n}_close${k}.png`), clip: { x: 560, y: 260, width: 160, height: 140 } });
    }
  }
  // in play, mid-throw: a pack ahead, a few skills thrown at once
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { makeMonster } = await import('/src/game/monster.js');
    const p = G.player, w = G.world; G.settings.zoom = 1.4;
    for (let k = 0; k < 6; k++) { const m = makeMonster(w, 'skeleton', w.biome, 6, 'normal', p.x + 3 + (k % 3) * 0.8, p.y + 1 + Math.floor(k / 3)); m.maxHp = m.hp = 1e9; m.speed = 0; m.dmg = [0, 0]; w.add(m); }
  });
  for (const [i, names] of [['Tri-Rang', 'Rang Storm'], ['Chakram', 'Heavy Rang', 'Orbiting Rangs'], ['Rang Rain']].entries()) {
    await page.evaluate(async (names) => {
      const { G } = window.VELSCOUR;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const p = G.player; p.mana = p.maxMana = 99999;
      for (const n of names) { p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(CLASS_SKILLS.boomerang_knight.find((s) => s.name === n), p.x + 4, p.y + 1.5, null); }
    }, names);
    for (const d of [180, 420]) { await page.waitForTimeout(d); await shot(`boomerang_play_${i}_${d}`); }
  }
  // the 3D models: every look at four spins (upright, half laid over, flat, flat from another heading), and one
  // throw as a filmstrip (laying over as it flies out, flat on the way home), on a plain canvas scaled x3
  const sheets = await page.evaluate(async () => {
    const { RANG_SKINS, drawRang3D } = await import('/src/gfx/boomerang3d.js');
    const names = Object.keys(RANG_SKINS), cw = 64, chh = 56, S = 3;
    const sheet = (cols, rows, fn) => {
      const c = document.createElement('canvas'); c.width = cols * cw * S; c.height = rows * chh * S;
      const x = c.getContext('2d'); x.fillStyle = '#2a3020'; x.fillRect(0, 0, c.width, c.height); x.scale(S, S);
      fn(x); return c.toDataURL('image/png');
    };
    const poses = [[1.2, 0.3, 0], [0.7, 1.4, 0.6], [0.2, 2.2, 1.2], [0.2, 3.6, 2.5]];
    const models = sheet(8, Math.ceil(names.length / 2), (x) => names.forEach((n, i) => poses.forEach(([bank, spin, head], j) => {
      const col = (i % 2) * 4 + j, row = Math.floor(i / 2);
      drawRang3D(x, col * cw + cw / 2, row * chh + chh / 2 - 6, { skin: RANG_SKINS[n], bank, spin, head, lift: 14, blur: 0 });
      if (j === 0) { x.fillStyle = '#e8e0c8'; x.font = '6px sans-serif'; x.fillText(n, col * cw + 2, row * chh + chh - 3); }
    })));
    const film = sheet(10, 2, (x) => {
      for (let k = 0; k < 20; k++) {
        const out = Math.min(1, k / 10), e = out * out * (3 - 2 * out), bank = k < 10 ? 1.15 - 0.9 * e : 0.22;
        drawRang3D(x, (k % 10) * cw + cw / 2, Math.floor(k / 10) * chh + chh / 2 - 6, { skin: RANG_SKINS['Gale Rang'], bank: k < 10 ? -bank : bank, spin: k * 0.9, head: k < 10 ? 0.5 : 0.5 + Math.PI, lift: 16 });
      }
    });
    return { models, film };
  });
  const fs = require('fs'), path = require('path'), OUT = process.env.OUT_DIR || path.join(__dirname, 'out');
  for (const [k, v] of Object.entries(sheets)) fs.writeFileSync(path.join(OUT, `boomerang_${k}.png`), Buffer.from(v.split(',')[1], 'base64'));
  report(errors);
  await browser.close();
})();
