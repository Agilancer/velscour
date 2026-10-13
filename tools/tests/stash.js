// Storage chest: it stands in town, holds 300 slots, moves items both ways, and auto-play stashes gems/future gear.
// node tools/tests/stash.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors } = await openGame();
  const r = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('paladin', 'Stasher');
    const { Stash } = await import('/src/ui/stash.js');
    const { rollItem, makeGem } = await import('/src/data/items.js');
    const { addToBag } = await import('/src/game/player.js');
    const { Auto } = await import('/src/game/autoplay.js');
    const c = G.char, npc = G.world.npcs.find((n) => n.stash);
    const out = { size: c.stash.length, npc: !!npc, walkable: npc && G.world.map.walkable(npc.x, npc.y) };
    G.player.x = npc.x + 1; G.player.y = npc.y;
    addToBag(c, rollItem(5, { slot: 'body', rarity: 2 }));
    npc.use();
    const i = c.bag.findIndex(Boolean);
    Stash.store(i);
    out.stored = c.stash.filter(Boolean).length;
    Stash.take(c.stash.findIndex(Boolean));
    out.back = c.stash.filter(Boolean).length;
    addToBag(c, makeGem('ruby', 1)); const fut = rollItem(20, { slot: 'body', rarity: 3 }); addToBag(c, fut);
    Auto.stashExtras();
    out.auto = c.stash.filter(Boolean).map((b) => b.type + (b.req || ''));
    return out;
  });
  console.log(JSON.stringify(r));
  await page.screenshot({ path: 'tools/tests/out/stash.png' });
  report(errors); await browser.close();
})();
