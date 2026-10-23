// Auto-play soak test: a new hero with auto-play on, simulated at about 30x speed. Prints a progress line per
// game minute (depth, level, kills, deaths, gold, what the bot is doing) and screenshots now and then.
//   node tools/tests/autoplay.js paladin 20        # class, game minutes (default 15)
//   node tools/tests/autoplay.js wizard 30 mobile  # 844x390 touch layout
//   AP_FILTER=1 node tools/tests/autoplay.js ...   # loot filter on: rings Uncommon+, gear Epic+, all gems, keepers to the chest
const { openGame, report } = require('./harness');
const cls = process.argv[2] || 'paladin';
const minutes = +(process.argv[3] || 15);
const mobile = process.argv[4] === 'mobile';

(async () => {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : {});
  await page.evaluate(async ({ cls, filter }) => {
    await window.VELSCOUR.game.newChar(cls, 'Autobot');
    if (filter) Object.assign((await import('/src/game/lootfilter.js')).lootFilter(), { on: true, weapon: 3, offhand: 3, armor: 3, ring: 1, gems: true, upgrades: true, keep: true });
    const { Auto } = await import('/src/game/autoplay.js');
    window.VELSCOUR.G.autoOpenSeals = true; // nobody is watching: auto-play breaks sealed treasures itself instead of waiting in town
    Auto.toggle(true);
  }, { cls, filter: !!process.env.AP_FILTER });
  await page.waitForTimeout(500);
  await shot(`auto_${cls}_start`);
  let lastDepth = 0;
  for (let min = 1; min <= minutes; min++) {
    const res = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { Auto } = await import('/src/game/autoplay.js');
      const { SKILLS } = await import('/src/data/skills.js');
      const { itemName } = await import('/src/data/items.js');
      const t0 = performance.now();
      let sim = 0;
      while (sim < 60) {
        for (let i = 0; i < 15; i++) {
          if (G.mode !== 'game' || !G.world) break;
          G.dt = 1 / 30; G.time += G.dt; G.frame++;
          game.update(1 / 30);
          sim += 1 / 30;
        }
        await new Promise((r) => setTimeout(r, 0)); // let timers (portal loading, death screen) run
        if (performance.now() - t0 > 60000) break;
      }
      game.render();
      const c = G.char, p = G.player, w = G.world;
      return {
        sim: Math.round(sim), depth: c.depth, where: w ? (w.kind === 'town' ? 'town' : `D${w.depth}`) : '-', lvl: c.level, kills: c.kills, deaths: c.deaths || 0,
        gold: c.gold, hp: `${Math.round(p.hp)}/${p.maxHp}`, pots: Object.values(c.potions).join('/'), bag: c.bag.filter(Boolean).length,
        status: Auto.status, attrs: Object.values(c.attrs).join('/'), sp: c.skillPoints,
        bar: c.bar.map((id) => (id ? SKILLS[id].name + ':' + (c.skills[id] || 0) : '-')).join(', '),
        gear: Object.values(c.equip).filter(Boolean).map((it) => `${itemName(it)}[r${it.rarity} i${it.ilvl} g${it.gems.length}/${it.sockets}]`).join('; '),
        raids: (G.raidLog || []).splice(0).map((r) => `${r.boss}@D${r.depth} ${r.secs}s minHp=${r.minHp} ${r.mods}`).join('; '),
        bossHp: w && w.boss ? Math.round(w.boss.hp) + '/' + Math.round(w.boss.maxHp) + (w.boss.dead ? ' dead' : '') : '',
      };
    });
    console.log(`[${min}m] ${res.where} depth=${res.depth} lvl=${res.lvl} kills=${res.kills} deaths=${res.deaths} gold=${res.gold} hp=${res.hp} pots=${res.pots} bag=${res.bag} boss=${res.bossHp} | ${res.status}`);
    if (res.raids) console.log(`   RAID BOSS KILLED: ${res.raids}`);
    if (min % 5 === 0 || min === minutes) console.log(`   attrs=${res.attrs} sp=${res.sp}\n   bar: ${res.bar}\n   gear: ${res.gear}`);
    if (res.depth !== lastDepth || min === minutes) { lastDepth = res.depth; await shot(`auto_${cls}_m${min}`); }
  }
  report(errors, 20);
  await browser.close();
})();
