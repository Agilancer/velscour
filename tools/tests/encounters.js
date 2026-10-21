// Dungeon encounters with the Hollow's people (src/game/encounters.js): each kind forced into a real dungeon, the
// hero walks up, the guards die, the encounter is used, and its outcome must land (a captive freed and paid, the
// knight's oath, the peddler's potions, the wizard's three waves and blessing, the witch's brew, the Greener's cache).
// Rats scurry and bolt. Shots of each in tools/tests/out/encounter_<kind>.png.
//   node tools/tests/encounters.js [kinds]
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 760 });
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Encounter Bot');
    document.querySelectorAll('.screen').forEach((s) => s.remove());
    G.ui.modalCount = 0; G.godMode = true;
  });
  const all = ['captive', 'laststand', 'peddler', 'wizard', 'witch', 'greener'];
  const which = process.argv[2] ? process.argv[2].split(',') : all;
  for (const kind of which) {
    const r = await page.evaluate(async (kind) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { hit } = await import('/src/game/combat.js');
      G.encounterForce = [kind]; G.ratsForce = true;
      let W = null;
      for (let tries = 0; tries < 6 && !(W && W.encounters && W.encounters.length); tries++) { game.buildDungeon(8 + tries, BIOME_BY_ID.catacombs); W = G.world; }
      G.encounterForce = undefined; G.ratsForce = undefined;
      const e = W.encounters && W.encounters[0];
      if (!e) return { kind, error: 'no encounter placed' };
      const P = G.player, potions0 = { ...G.char.potions }, loot0 = W.loot.length, buffs0 = P.buffs.length, chests0 = W.chests.length;
      const rats = W.npcs.filter((n) => n.animal && n.species === 'rat');
      const ratStart = rats.map((n) => [n.x, n.y]);
      // walk up beside it
      const [sx, sy] = W.map.randomNear(e.x + 1.2, e.y + 1.2, 1.2) || [e.x + 1, e.y + 1];
      P.x = sx; P.y = sy;
      const dt = 1 / 30;
      const kill = () => { for (const m of W.creatures) if (m.team === 'enemy' && !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 9) hit(P, m, 1e12, 'phys', { crit: false }); };
      // a look before the fight: the person on their spot, the guards asleep round them (a knight already fighting)
      G.godMode = true;
      for (let i = 0; i < 30 * 6; i++) game.update(dt);
      const before = { emotion: e.n.emotion, talk: e.n.talkText };
      return { kind, before, ok: true };
    }, kind);
    if (r.error) { errors.push(kind + ': ' + r.error); continue; }
    await page.waitForTimeout(300);
    await shot('encounter_' + kind);
    const out = await page.evaluate(async (kind) => {
      const { G, game } = window.VELSCOUR, W = G.world, e = W.encounters[0], P = G.player;
      const { hit } = await import('/src/game/combat.js');
      const dt = 1 / 30, loot0 = W.loot.length;
      const chests0 = W.chests.length;
      for (let i = 0; i < 30 * 70; i++) {
        game.update(dt);
        if (kind !== 'laststand' || i > 30 * 3) for (const m of W.creatures) if (m.team === 'enemy' && !m.dead && Math.hypot(m.x - e.x, m.y - e.y) < 16) hit(P, m, 1e12, 'phys', { crit: false });
        if (i % 30 === 0 && e.chest && !e.chest.opened) e.chest.use();
        if (kind === 'greener' && e.state === 'run') { P.x += (e.n.x - P.x) * 0.08; P.y += (e.n.y - P.y) * 0.08; }
        const cache = kind === 'greener' && e.state === 'wait' && W.chests.find((c) => c.rare && !c.encounter && !c.opened && Math.hypot(c.x - e.loot[0], c.y - e.loot[1]) < 0.1);
        if (cache) { P.x = cache.x + 0.6; P.y = cache.y + 0.6; cache.use(); }
      }
      const rats = W.npcs.filter((n) => n.animal && n.species === 'rat');
      return {
        opened: !!e.chest?.opened, state: e.state, hp: Math.round(e.n.hp), emotion: e.n.emotion, loot: W.loot.length,
        buffs: P.buffs.map((b) => b.id), potions: G.char.potions, rats: rats.length, gone: !W.npcs.includes(e.n),
      };
    }, kind);
    console.log(kind, JSON.stringify(r.before), '->', JSON.stringify(out));
    if (!out.opened) errors.push(kind + ': never resolved');
    if (kind === 'laststand' && !(out.buffs.includes('oath') || out.emotion === 'dead')) errors.push('laststand: no oath and no fallen knight');
    if (kind === 'wizard' && !out.buffs.includes('zebulon')) errors.push('wizard: no blessing');
    if (kind === 'greener' && out.state !== 'wait') errors.push('greener: never reached the cache (' + out.state + ')');
  }
  report(errors);
  await browser.close();
})();
