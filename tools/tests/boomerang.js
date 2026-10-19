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
  report(errors);
  await browser.close();
})();
