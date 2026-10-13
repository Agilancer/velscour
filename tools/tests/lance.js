// Dragoon leap art (src/gfx/lancefx.js): casts each of the 9 leap skills with the game stepped frame by frame and
// shoots the rise, the peak, the dive, the planted lance and the shatter. Screenshots lance_<skill>_<n>.png.
//   node tools/tests/lance.js [mobile]
const { openGame, report } = require('./harness');
const MOBILE = process.argv[2] === 'mobile';

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : {});
  const leaps = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('dragoon', 'Lance');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true;
    game.buildDungeon(3, BIOME_BY_ID.catacombs);
    await new Promise((r) => setTimeout(r, 400));
    for (const c of G.world.creatures) if (c.team === 'enemy') c.dead = true;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { LANCE_LEAPS } = await import('/src/gfx/lancefx.js');
    const p = G.player;
    for (const sk of CLASS_SKILLS.dragoon) G.char.skills[sk.id] = 5;
    G.char.level = 40; p.recompute(); p.mana = p.maxMana = 99999;
    const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom();
    // step the game by hand: each animation frame consumes one 1/60 s step, otherwise time stands still
    const upd = game.update.bind(game);
    window.__step = 0;
    game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
    const sks = CLASS_SKILLS.dragoon.filter((s) => s.kind === 'leap');
    return { ids: sks.map((s) => s.id), names: sks.map((s) => s.name), styled: sks.filter((s) => LANCE_LEAPS.includes(s.name)).length };
  });
  console.log(`${leaps.ids.length} leap skills, ${leaps.styled} with a lance style: ${leaps.names.join(', ')}`);
  if (leaps.styled !== leaps.ids.length) { console.log('FAIL: a leap skill has no lance style'); process.exitCode = 1; }

  const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
  const vp = page.viewportSize(), cw = Math.min(640, vp.width), ch = Math.min(420, vp.height);
  const clip = { x: (vp.width - cw) / 2, y: (vp.height - ch) / 2 - (MOBILE ? 0 : 40), width: cw, height: ch };
  const stages = [[5, 'rise'], [9, 'peak'], [10, 'dive'], [6, 'plant'], [22, 'shatter']];
  let bad = 0;
  for (let i = 0; i < leaps.ids.length; i++) {
    // cycle the jump direction round the compass, so every lance angle is seen
    const res = await page.evaluate(async ([id, i]) => {
      const { G } = window.VELSCOUR, p = G.player, w = G.world;
      const { SKILLS } = await import('/src/data/skills.js');
      const { effects } = await import('/src/gfx/vfx.js');
      // stand somewhere with room to jump 4 tiles in the chosen direction
      const a = i * Math.PI / 4 + 0.3;
      let spot = null;
      for (let tries = 0; tries < 4000 && !spot; tries++) {
        const x = 2 + Math.random() * (w.map.w - 4), y = 2 + Math.random() * (w.map.h - 4);
        let ok = true;
        for (let d = 0; d <= 4.5 && ok; d += 0.25) ok = w.map.walkable(x + Math.cos(a) * d, y + Math.sin(a) * d);
        if (ok) spot = [x, y];
      }
      if (!spot) return { err: 'no room' };
      p.x = spot[0]; p.y = spot[1]; p.path = null; p.moveTarget = null;
      const { camera } = await import('/src/core/view.js'); camera.follow(p.x, p.y, 0, true);
      p.castLock = 0; p.cooldowns = {}; p.channel = null;
      const n0 = effects.length;
      p.tryUseSkill(SKILLS[id], p.x + Math.cos(a) * 4, p.y + Math.sin(a) * 4);
      return { lance: effects.slice(n0).some((e) => e.leap), channel: !!p.channel };
    }, [leaps.ids[i], i]);
    if (res.err || !res.lance || !res.channel) { console.log(`FAIL ${leaps.names[i]}: ${JSON.stringify(res)}`); bad++; continue; }
    // let the camera catch up a little without moving the leap: snap it to the hero
    await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); camera.follow(G.player.x, G.player.y, 0, true); });
    for (const [n, tag] of stages) {
      await step(n);
      await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); camera.follow(G.player.x, G.player.y, 0, true); });
      await page.waitForTimeout(40);
      await page.screenshot({ path: `${require('./harness').OUT_DIR}/lance_${i}_${leaps.names[i].replace(/[^a-z]/gi, '')}_${tag}.png`, clip });
    }
    const st = await page.evaluate(async () => {
      const { G } = window.VELSCOUR; const { effects } = await import('/src/gfx/vfx.js');
      return { z: G.player.z, channel: !!G.player.channel, live: effects.filter((e) => e.leap).length };
    });
    if (st.z !== 0 || st.channel) { console.log(`FAIL ${leaps.names[i]}: still airborne ${JSON.stringify(st)}`); bad++; }
    await step(40);
  }
  const left = await page.evaluate(async () => (await import('/src/gfx/vfx.js')).effects.filter((e) => e.leap).length);
  if (left) { console.log(`FAIL: ${left} lance effects never ended`); bad++; }
  console.log(bad ? `${bad} FAILURES` : 'ALL LEAPS OK');
  if (bad) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
