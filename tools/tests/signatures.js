// Class signatures (src/game/signature.js, src/game/sigs/*.js), for every class that has one:
//  1. it charges from real play: a hero casts its skills at a live pack and must pay off at least once
//  2. showcase shots, the game stepped frame by frame: the charge building (sig_<class>_0.png), then the payoff
//     (sig_<class>_1..3.png); tools/tests/out/signatures.html lays them out for review
//  3. auto-play: each class plays N game seconds; no errors, and the signature should fire
//   node tools/tests/signatures.js [classes,comma,separated|all] [autoplay seconds per class, default 60, 0 skips] [noplay] [noshots]
const fs = require('fs');
const path = require('path');
const { openGame, report, OUT_DIR } = require('./harness');
const ALL = ['paladin', 'ranger', 'wizard', 'necromancer', 'barbarian', 'dragoon', 'totem_master', 'death_knight', 'carrion_witch', 'slime_lord', 'boomerang_knight', 'lancer', 'dragon_knight', 'gunner'];
const CLASSES = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : ALL;
const AUTO = process.argv[3] !== undefined ? +process.argv[3] : 60;
// frames (at 60 fps) after the payoff starts for the three payoff shots
const SHOTS = {
  paladin: [20, 36, 70], ranger: [14, 30, 50], wizard: [18, 42, 62], necromancer: [10, 30, 55], barbarian: [18, 37, 50],
  dragoon: [12, 40, 60], totem_master: [20, 70, 110], death_knight: [12, 21, 32], carrion_witch: [18, 29, 40],
  slime_lord: [30, 56, 66], boomerang_knight: [30, 62, 96], lancer: [20, 36, 52], dragon_knight: [40, 70, 95], gunner: [40, 62, 84],
};
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

(async () => {
  const { browser, page, errors } = await openGame();
  const results = {};
  const setup = (cls) => page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    if (window.__realUpdate) game.update = window.__realUpdate;
    await game.newChar(cls, 'Showcase');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true; G.settings.gore = 1;
    game.buildDungeon(6, BIOME_BY_ID.overworld);
    await new Promise((r) => setTimeout(r, 400));
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const p = G.player, w = G.world;
    for (const sk of CLASS_SKILLS[cls]) G.char.skills[sk.id] = 5;
    G.char.level = 30; p.recompute(); p.mana = p.maxMana = 99999;
    for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
    let spot = null;
    for (let t = 0; t < 8000 && !spot; t++) {
      const x = 8 + Math.random() * (w.map.w - 16), y = 8 + Math.random() * (w.map.h - 16);
      let ok = true;
      for (let dx = -7; dx <= 7 && ok; dx++) for (let dy = -7; dy <= 7 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
      if (ok || t > 6000 && w.map.walkable(x, y) && w.map.walkable(x + 4, y) && w.map.walkable(x, y - 3)) spot = [x, y];
    }
    if (!spot) return 'no open spot';
    p.x = spot[0]; p.y = spot[1];
    window.__home = spot;
    G.sigStats = {};
    return null;
  }, cls);
  // a pack in front of the hero; tough = they will not die (payoff shots)
  const pack = (tough) => page.evaluate(async (tough) => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { makeMonster } = await import('/src/game/monster.js');
    for (const c of w.creatures) if (c.team === 'enemy') c.dead = true;
    w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
    const roster = w.biome.roster || ['skeleton'];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * Math.PI, d = 2.6 + (k % 3) * 0.9;
      const m = makeMonster(w, roster[k % roster.length], w.biome, 6, k === 0 ? 'champion' : 'normal', p.x + 2.2 + Math.cos(a) * d * 0.7, p.y - 0.8 + Math.sin(a) * d * 0.7);
      if (tough) { m.maxHp = m.hp = 1e8; m.speed = 0; }
      m.awake = true; w.add(m);
    }
    w.rebuildGrid();
  }, tough);
  // cast the class's damaging skills at the nearest foe; returns { fill, fired }
  const fight = (secs, stopAt, stepped) => page.evaluate(async ([secs, stopAt, stepped]) => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const S = await import('/src/game/signature.js');
    const M = S.SIGNATURES[p.classId];
    const skills = CLASS_SKILLS[p.classId].filter((s) => !['buff', 'heal'].includes(s.kind) && (s.kind !== 'summon' || p.classId === 'necromancer'));
    const fired = () => ((G.sigStats[p.classId] || {}).fire || 0);
    let t = 0, castT = 0, maxFill = 0;
    while (t < secs) {
      if ((castT -= 1 / 30) <= 0) {
        castT = 0.3;
        w.rebuildGrid();
        const f = w.nearestHostile('player', p.x, p.y, 12, false);
        if (f) {
          const sk = Math.random() < 0.3 ? skills[0] : skills[Math.floor(Math.random() * skills.length)];
          p.castLock = 0; p.cooldowns = {}; p.channel = null; p.mana = 99999;
          if (Math.hypot(f.x - p.x, f.y - p.y) > 2 && (sk.kind === 'melee' || sk.kind === 'whirl')) { p.x += (f.x - p.x) * 0.5; p.y += (f.y - p.y) * 0.5; }
          p.tryUseSkill(sk, f.x, f.y, f);
        }
      }
      if (stepped) { window.__step = 2; await new Promise((r) => { const k = () => (window.__step ? requestAnimationFrame(k) : r()); k(); }); t += 2 / 60; }
      else { w.update(1 / 30); t += 1 / 30; }
      const fl = M.fill(p.sig.s); maxFill = Math.max(maxFill, fl);
      if (stopAt != null && fl >= stopAt && !fired()) break;
      if (w.creatures.filter((c) => c.team === 'enemy' && !c.dead).length < 4) {
        const { makeMonster } = await import('/src/game/monster.js');
        const roster = w.biome.roster || ['skeleton'];
        for (let k = 0; k < 6; k++) { const [x, y] = w.map.randomNear(p.x, p.y, 4); const m = makeMonster(w, roster[k % roster.length], w.biome, 6, k ? 'normal' : 'champion', x, y); m.awake = true; w.add(m); }
        w.rebuildGrid();
      }
    }
    return { fill: +M.fill(p.sig.s).toFixed(2), maxFill: +maxFill.toFixed(2), fired: fired(), stats: G.sigStats[p.classId] || {}, t: +t.toFixed(1) };
  }, [secs, stopAt, stepped]);

  // ------------------------------------------------------------ 1. it charges and pays off in play
  for (const cls of process.argv.includes('noplay') ? [] : CLASSES) {
    const err = await setup(cls);
    if (err) { fail(`${cls}: ${err}`); continue; }
    await pack(false);
    const r = await fight(60, null, false);
    results[cls] = { play: r };
    console.log(`${cls.padEnd(17)} 60 s of casting: fired ${r.fired}x, ${JSON.stringify(r.stats)}`);
    if (!(r.fired >= 1)) fail(`${cls}: the signature never paid off in 60 s of casting`);
  }

  // ------------------------------------------------------------ 2. showcase shots
  const vp = page.viewportSize(), cw = 860, chh = 520;
  const clip = { x: (vp.width - cw) / 2, y: (vp.height - chh) / 2 - 50, width: cw, height: chh };
  const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
  // clear the skills' own effects so the signature reads; zoom: the camera zoom setting
  const clean = (zoom) => page.evaluate(async (zoom) => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { effects, texts, particles } = await import('/src/gfx/vfx.js');
    const { camera } = await import('/src/core/view.js');
    w.hazards = w.hazards.filter((h) => h.constructor.name === 'SigBack');
    for (let i = effects.length - 1; i >= 0; i--) if (effects[i].constructor.name !== 'SigLayer') effects.splice(i, 1);
    texts.length = 0; particles.length = 0; w.loot.length = 0; p.channel = null;
    G.settings.zoom = zoom; camera.computeZoom(); camera.follow(p.x + (zoom > 1.6 ? 0 : 1.2), p.y - (zoom > 1.6 ? 0.3 : 0.6), 0, true);
  }, zoom);
  const meta = {};
  for (const cls of process.argv.includes('noshots') ? [] : CLASSES) {
    if (await setup(cls)) continue;
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1.35; camera.computeZoom();
      const upd = window.__realUpdate = window.__realUpdate || game.update.bind(game);
      window.__step = 0;
      game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
      const p = G.player; camera.follow(p.x + 1.2, p.y - 0.6, 0, true);
      G.settings.gore = 0; G.settings.dmgNumbers = false;
      for (const id of ['#log', '#center-msg']) { const e = document.querySelector(id); if (e) e.style.display = 'none'; }
    });
    await pack(false);
    const ch = await fight(40, 0.7, true);
    // the charge, close up
    await clean(2.1);
    await step(3);
    const hc = await page.evaluate(async () => { const { G } = window.VELSCOUR, p = G.player; const { camera } = await import('/src/core/view.js'); return camera.tileToScreen(p.x, p.y, 40); });
    const cc = { width: 620, height: 400 };
    await page.screenshot({ path: `${OUT_DIR}/sig_${cls}_0.png`, clip: { ...cc, x: Math.max(0, Math.min(vp.width - cc.width, hc[0] - cc.width / 2)), y: Math.max(0, Math.min(vp.height - cc.height, hc[1] - cc.height / 2)) } });
    // the payoff on a crowd that stays put
    const info = await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player;
      const S = await import('/src/game/signature.js');
      const M = S.SIGNATURES[p.classId];
      return { name: M.name, desc: M.desc, color: M.color };
    });
    await clean(1.35);
    await pack(true);
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR, p = G.player;
      const S = await import('/src/game/signature.js');
      if (p.classId === 'gunner' || p.classId === 'carrion_witch') { // they paint what they hit: hit every foe once
        const { hit } = await import('/src/game/combat.js');
        for (const c of G.world.creatures) if (c.team === 'enemy' && !c.dead) hit(p, c, 1, 'phys', { silent: true });
      }
      if (p.classId === 'ranger') { const s = p.sig.s; s.quarry = null; s.look = 0; }
      S.sigFire(p);
    });
    let at = 0;
    for (let i = 0; i < 3; i++) { await step(SHOTS[cls][i] - at); at = SHOTS[cls][i]; await page.screenshot({ path: `${OUT_DIR}/sig_${cls}_${i + 1}.png`, clip }); }
    meta[cls] = { ...info, charge: ch };
    console.log(`${cls.padEnd(17)} shots: charge fill ${ch.fill}`);
  }
  if (Object.keys(meta).length) fs.writeFileSync(path.join(OUT_DIR, 'signatures.json'), JSON.stringify(meta, null, 1));

  // ------------------------------------------------------------ 3. auto-play
  if (AUTO > 0) {
    for (const cls of CLASSES) {
      const a = await page.evaluate(async ([cls, secs]) => {
        const { G, game } = window.VELSCOUR;
        if (window.__realUpdate) game.update = window.__realUpdate;
        G.godMode = false; G.sigStats = {};
        await game.newChar(cls, 'Autosig');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
        const { Auto } = await import('/src/game/autoplay.js');
        Auto.toggle(true);
        let sim = 0;
        while (sim < secs) {
          for (let i = 0; i < 15; i++) {
            if (G.mode !== 'game' || !G.world) break;
            G.dt = 1 / 30; G.time += G.dt; G.frame++;
            game.update(1 / 30); sim += 1 / 30;
          }
          await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false);
        return { stats: G.sigStats[cls] || {}, depth: G.char.depth, kills: G.char.kills || 0 };
      }, [cls, AUTO]);
      console.log(`${cls.padEnd(17)} auto-play ${AUTO} s: ${JSON.stringify(a)}`);
      if (results[cls]) results[cls].auto = a;
    }
  }
  console.log(bad ? `${bad} FAILURES` : 'SIGNATURES OK');
  if (bad) process.exitCode = 1;
  report(errors, 20);
  await browser.close();
})();
