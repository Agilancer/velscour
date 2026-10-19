// Boomerang Knight: every thrown boomerang must come back to his hand, along a curve (never a straight snap back).
// Casts each of his throwing skills in an open field (empty, then into a pack), steps the game frame by frame and
// tracks every boomerang: it must be caught (end within reach of the hero), bow out to the side of the straight
// line, and on the way home never turn more than a smooth amount in one frame (ricochets off foes may be sharp). Shots of the flight: tools/tests/out/rang_*.png
//   node tools/tests/boomerang_return.js
const { openGame, report, OUT_DIR } = require('./harness');
const SKILLS = ['Boomerang', 'Tri-Rang', 'Ricochet', 'Chakram', 'Splitting Rang', 'Rang Storm', 'Gale Rang', 'Ricochet Storm', 'Thunder Return', 'Halo of Rangs', 'Rang Rain'];
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

(async () => {
  const { browser, page, errors } = await openGame();
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('boomerang_knight', 'Rangtest');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true;
    game.buildDungeon(6, BIOME_BY_ID.overworld);
    await new Promise((r) => setTimeout(r, 400));
    const p = G.player, w = G.world;
    G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
    let spot = null;
    for (let t = 0; t < 8000 && !spot; t++) {
      const x = 10 + Math.random() * (w.map.w - 20), y = 10 + Math.random() * (w.map.h - 20);
      let ok = true;
      for (let dx = -8; dx <= 8 && ok; dx++) for (let dy = -8; dy <= 8 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
      if (ok) spot = [x, y];
    }
    window.__home = spot || [p.x, p.y];
    const upd = window.__realUpdate = game.update.bind(game);
    window.__step = 0;
    game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
  });
  for (const name of SKILLS) for (const packed of [false, true]) {
    const r = await page.evaluate(async ([name, packed]) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { CLASS_SKILLS } = await import('/src/data/skills.js');
      const { castSkill } = await import('/src/game/skillrun.js');
      const { Projectile } = await import('/src/game/hazards.js');
      const { makeMonster } = await import('/src/game/monster.js');
      const sk = CLASS_SKILLS.boomerang_knight.find((s) => s.name === name);
      if (!sk) return { err: 'no skill ' + name };
      for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
      w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
      w.hazards.length = 0;
      [p.x, p.y] = window.__home;
      if (packed) for (let k = 0; k < 6; k++) {
        const m = makeMonster(w, (w.biome.roster || ['skeleton'])[0], w.biome, 6, 'normal', p.x + 2.4 + k * 0.75, p.y + (k % 2 ? 0.45 : -0.45));
        m.hp = m.maxHp = 1e9; m.speed = 0; m.awake = true; w.add(m);
      }
      if (packed) w.rebuildGrid();
      castSkill(p, sk, 5, p.x + 6, p.y);
      const tracks = new Map(), step = () => new Promise((res) => { window.__step = 1; const k = () => (window.__step ? requestAnimationFrame(k) : res()); k(); });
      for (let f = 0; f < 60 * 6; f++) {
        await step();
        for (const h of w.hazards) if (h instanceof Projectile && h.ret) {
          if (!tracks.has(h)) tracks.set(h, { pts: [], child: !!h.child, startRet: !!h.returning });
          tracks.get(h).pts.push([h.x, h.y, Math.atan2(h.vy, h.vx), !!h.returning]);
        }
        for (const [h, tr] of tracks) if (!tr.end && !w.hazards.includes(h)) tr.end = [h.x, h.y, Math.hypot(h.x - p.x, h.y - p.y)];
        if (tracks.size && [...tracks.values()].every((t) => t.end) && f > 30) break;
      }
      const out = [];
      for (const [, tr] of tracks) {
        const P = tr.pts, s = P[0];
        let far = s, fd = 0, side = 0, maxTurn = 0;
        for (const q of P) { const d = Math.hypot(q[0] - s[0], q[1] - s[1]); if (d > fd) { fd = d; far = q; } }
        const L = fd || 1, ux = (far[0] - s[0]) / L, uy = (far[1] - s[1]) / L;
        for (const q of P) side = Math.max(side, Math.abs((q[0] - s[0]) * uy - (q[1] - s[1]) * ux));
        for (let i = 1; i < P.length - 4; i++) { if (!P[i][3] || !P[i - 1][3]) continue; let d = Math.abs(P[i][2] - P[i - 1][2]); if (d > Math.PI) d = 2 * Math.PI - d; maxTurn = Math.max(maxTurn, d); }
        out.push({ n: P.length, caught: tr.end ? tr.end[2] : -1, far: +fd.toFixed(2), side: +side.toFixed(2), maxTurn: +maxTurn.toFixed(2), child: tr.child, startRet: tr.startRet });
      }
      return { out };
    }, [name, packed]);
    if (r.err) { fail(r.err); continue; }
    const o = r.out;
    const caught = o.filter((t) => t.caught >= 0 && t.caught < 0.9).length;
    const curved = o.filter((t) => t.side >= 0.5).length, snaps = o.filter((t) => t.maxTurn > 0.6).length;
    console.log(`${name.padEnd(16)} ${packed ? 'pack ' : 'empty'} rangs=${o.length} caught=${caught} curved=${curved} snaps=${snaps} far~${(o.reduce((a, t) => a + t.far, 0) / (o.length || 1)).toFixed(1)} side~${(o.reduce((a, t) => a + t.side, 0) / (o.length || 1)).toFixed(2)}`);
    if (!o.length) fail(`${name}: no boomerangs`);
    if (caught < o.length) fail(`${name}${packed ? ' (pack)' : ''}: ${o.length - caught} not caught ${JSON.stringify(o.filter((t) => !(t.caught >= 0 && t.caught < 0.9)).slice(0, 2))}`);
    if (curved < o.length * 0.8) fail(`${name}${packed ? ' (pack)' : ''}: only ${curved}/${o.length} curve`);
    if (snaps) fail(`${name}${packed ? ' (pack)' : ''}: ${snaps} snap turns`);
  }
  // flight shots: Tri-Rang mid-flight and swinging home, and the larger blue boomerangs round his helm
  const shots = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { castSkill } = await import('/src/game/skillrun.js');
    for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
    w.hazards.length = 0; [p.x, p.y] = window.__home;
    if (p.sig) p.sig.s.n = 5;
    castSkill(p, CLASS_SKILLS.boomerang_knight.find((s) => s.name === 'Tri-Rang'), 5, p.x + 6, p.y + 1);
    return !!p.sig;
  }).catch((e) => 'err ' + e.message);
  const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
  const clip = { x: 340, y: 160, width: 600, height: 400 };
  await step(18); await page.screenshot({ path: `${OUT_DIR}/rang_out.png`, clip });
  await step(30); await page.screenshot({ path: `${OUT_DIR}/rang_swing.png`, clip });
  await step(30); await page.screenshot({ path: `${OUT_DIR}/rang_home.png`, clip });
  await page.evaluate(() => { const { G } = window.VELSCOUR; if (G.player.sig) { G.player.sig.s.n = 8; G.player.sig.s.busy = 0; G.player.sig.s.wait = 99; } });
  await step(2); await page.screenshot({ path: `${OUT_DIR}/rang_helm.png`, clip: { x: 540, y: 260, width: 200, height: 200 } });
  console.log('shots', shots);
  report(errors);
  if (bad) { console.log(bad + ' FAILED'); process.exitCode = 1; } else console.log('ALL BOOMERANGS CAME HOME');
  await browser.close();
})();
