// Class art pack check (docs/CLASS_ART.md): a Paladin with catalog weapons/shields, the inventory with catalog
// icons, and a run of ability effects. Screenshots ca_*.png. (Body armor and helmets: gear.js.)
//   node tools/tests/classart.js [paladin]
const { openGame, report } = require('./harness');
const CLS = process.argv[2] || 'paladin';

(async () => {
  const { browser, page, errors, shot } = await openGame();
  const info = await page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Art');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { classArt } = await import('/src/core/classart.js');
    const meta = classArt(cls);
    if (!meta) return { error: 'no pack for ' + cls };
    const eq = G.char.equip;
    const { rollItem, itemName } = await import('/src/data/items.js');
    // some mythic catalog gear in the bag
    for (const slot of ['weapon', 'offhand']) {
      const it = rollItem(60, { slot, rarity: 5 });
      G.char.bag[G.char.bag.indexOf(null)] = it;
    }
    return {
      items: Object.keys(meta.items).length, fx: Object.keys(meta.fx).length,
      start: ['weapon', 'offhand'].map((s) => eq[s] && `${s}: ${itemName(eq[s])} ${eq[s].art || '(generic)'}`),
      bag: G.char.bag.filter(Boolean).map((it) => `${itemName(it)} ${it.art || ''} r${it.rarity}`),
    };
  }, CLS);
  console.log(JSON.stringify(info, null, 1));
  if (info.error) { console.log('FAIL'); process.exitCode = 1; await browser.close(); return; }

  // inventory with catalog icons
  await page.keyboard.press('i');
  await page.waitForTimeout(800);
  await shot('ca_inventory');
  await page.keyboard.press('i');

  // into a dungeon
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true;
    game.buildDungeon(1, BIOME_BY_ID.catacombs);
    await new Promise((r) => setTimeout(r, 300));
    for (const c of G.world.creatures) if (c.team === 'enemy') c.dead = true;
  });

  // ability effects: cast a spread of skills (all points learned)
  const fx = await page.evaluate(async () => {
    const { G } = window.VELSCOUR; const p = G.player;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { skillFxPath } = await import('/src/gfx/artfx.js');
    const { artStrip } = await import('/src/core/classart.js');
    for (const sk of CLASS_SKILLS[p.classId]) { G.char.skills[sk.id] = 5; artStrip(p.classId, skillFxPath(sk)); }
    G.char.level = 40; p.recompute(); p.mana = p.maxMana = 99999;
    await new Promise((r) => setTimeout(r, 1500)); // effect strips load
    return CLASS_SKILLS[p.classId].map((s) => s.id);
  });
  await page.evaluate(async () => { const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1; camera.computeZoom(); });
  const picks = [0, 5, 6, 13, 15, 16, 20, 24, 29, 33, 41, 47, 50, 57];
  for (const i of picks) {
    const name = await page.evaluate((id) => {
      const { G } = window.VELSCOUR; const p = G.player;
      const { SKILLS } = window.__sk || {};
      return import('/src/data/skills.js').then(({ SKILLS }) => {
        const sk = SKILLS[id];
        p.castLock = 0; p.cooldowns = {}; p.channel = null;
        p.tryUseSkill(sk, p.x + 2.5, p.y + 0.5);
        return sk.name;
      });
    }, fx[i]);
    await page.waitForTimeout(230); // about the "release/peak" stage
    await shot('ca_fx_' + String(i).padStart(2, '0') + '_' + name.replace(/[^a-z]/gi, ''));
    await page.waitForTimeout(450);
  }
  report(errors);
  await browser.close();
})();
