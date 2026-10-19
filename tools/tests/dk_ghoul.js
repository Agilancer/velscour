// The Death Knight's ghoul and skulls: Raise Ghoul / Army of the Dead summon the small frost ghoul (dk_ghoul atlas),
// which leaps onto foes from range; Death Coil and his class particles draw the HUD skull in frost.
// Shots: dk_ghoul_size.png (ghoul by the hero), dk_ghoul_leap.png (mid-leap), dk_ghoul_coil.png (Death Coil skulls).
//   node tools/tests/dk_ghoul.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
  const step = (n) => page.evaluate((n) => { const { G, game } = window.VELSCOUR; for (let i = 0; i < n; i++) G.world.update(1 / 30); game.render(); }, n);
  const setup = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('death_knight', 'Rime');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    game.buildDungeon(6, BIOME_BY_ID.catacombs);
    G.godMode = true; G.settings.zoom = 2; G.settings.gore = 0; G.paused = false;
    (await import('/src/core/view.js')).camera.computeZoom();
    document.getElementById('center-msg').style.display = 'none';
    const p = G.player, w = G.world;
    for (const c of w.creatures) if (!c.isPlayer) c.dead = true;
    const sk = (n) => CLASS_SKILLS.death_knight.find((s) => s.name === n);
    window.dk = { sk };
    const raise = sk('Raise Ghoul'), army = sk('Army of the Dead');
    G.char.skills[raise.id] = 5; p.mana = p.maxMana = 9999; p.cooldowns = {};
    p.tryUseSkill(raise, p.x + 1, p.y, null);
    return { raise: raise.m.sum, army: army.m.sum };
  });
  console.log(`  ${setup.raise === 'dkghoul' && setup.army === 'dkghoul' ? 'ok  ' : 'FAIL'} Raise Ghoul -> ${setup.raise}, Army of the Dead -> ${setup.army}`);
  await step(30); await page.waitForTimeout(400); await step(10);
  const size = await page.evaluate(() => {
    const { G } = window.VELSCOUR, p = G.player;
    const g = G.world.creatures.find((c) => c.summonKey === 'dkghoul' && !c.dead);
    if (!g) return null;
    g.x = p.x + 0.9; g.y = p.y + 0.3;
    return { petH: g.petH, sheet: g.petAnim ? 1 : 0 };
  });
  console.log(`  ${size ? 'ok  ' : 'FAIL'} ghoul summoned ${JSON.stringify(size)}`);
  await step(1); await shot('dk_ghoul_size');
  // a foe 5 tiles off: the ghoul should leap rather than run
  const leap = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player, w = G.world;
    const { makeMonster } = await import('/src/game/monster.js');
    const g = w.creatures.find((c) => c.summonKey === 'dkghoul' && !c.dead);
    let spot = null;
    for (let a = 0; a < 12 && !spot; a++) { const x = g.x + Math.cos(a) * 5, y = g.y + Math.sin(a) * 5; if (w.map.circleFree(x, y, 0.4) && w.map.losWide(g.x, g.y, x, y, 0.35)) spot = [x, y]; }
    if (!spot) return { err: 'no open spot' };
    const m = makeMonster(w, 'zombie', w.biome, 6, 'normal', spot[0], spot[1]);
    m.maxHp = m.hp = 1e6; m.speed = 0; m.awake = true; w.add(m); w.rebuildGrid();
    g.leapCd = 0; g.foe = m; g.aggro = m;
    let leaped = false, maxZ = 0, d0 = Math.hypot(g.x - m.x, g.y - m.y);
    for (let i = 0; i < 90; i++) {
      w.update(1 / 60);
      if (g.action && g.action.leap) leaped = true;
      maxZ = Math.max(maxZ, g.z);
      if (g.z > 25 && !window.dk.shotAt) { window.dk.shotAt = 1; break; }
    }
    return { leaped, maxZ: Math.round(maxZ), d0: +d0.toFixed(1), d1: +Math.hypot(g.x - m.x, g.y - m.y).toFixed(1) };
  });
  await page.evaluate(() => window.VELSCOUR.game.render()); await shot('dk_ghoul_leap');
  const after = await page.evaluate(() => {
    const { G } = window.VELSCOUR, w = G.world, g = w.creatures.find((c) => c.summonKey === 'dkghoul' && !c.dead);
    for (let i = 0; i < 40; i++) w.update(1 / 60);
    const m = w.creatures.find((c) => c.team === 'enemy' && !c.dead);
    return { d: +Math.hypot(g.x - m.x, g.y - m.y).toFixed(1), hurt: m.hp < m.maxHp };
  });
  console.log(`  ${leap.leaped && leap.maxZ > 20 && after.d < 1.6 && after.hurt ? 'ok  ' : 'FAIL'} leap ${JSON.stringify(leap)} landed ${JSON.stringify(after)}`);
  // Death Coil: skull projectiles in frost
  const coil = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR, p = G.player, w = G.world;
    const s = window.dk.sk('Death Coil'); G.char.skills[s.id] = 5;
    const m = w.creatures.find((c) => c.team === 'enemy' && !c.dead);
    const [x, y] = w.map.randomNear(m.x, m.y, 5); p.x = x; p.y = y; for (const c of w.creatures) if (c.summon) c.dead = true;
    p.castLock = 0; p.cooldowns = {}; const ok = p.tryUseSkill(s, m.x, m.y, m);
    let pr = null;
    for (let i = 0; i < 40 && !pr; i++) { w.update(1 / 60); pr = w.hazards.find((h) => h.fx === 'skull'); }
    for (let i = 0; i < 3; i++) w.update(1 / 60);
    game.render();
    return pr ? pr.skullV : 'none ok=' + ok + ' fx=' + s.fx + ' ' + w.hazards.map((h) => h.fx || h.constructor.name).join(',');
  });
  console.log(`  ${coil === 'frost' ? 'ok  ' : 'FAIL'} Death Coil skull variant: ${coil}`);
  await shot('dk_ghoul_coil');
  report(errors);
  await browser.close();
})();
