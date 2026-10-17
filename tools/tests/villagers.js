// Town villagers: painted art (no recoloured/green class sprites), one speech bubble at a time, every bark fits.
// node tools/tests/villagers.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(4500);
  const info = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { replacementImage } = await import('/src/core/replacementart.js');
    const vs = G.world.npcs.filter((n) => n.villager), p = G.player;
    vs.forEach((n, i) => { n.x = p.x + (i - 1.5) * 1.7; n.y = p.y - 2 - (i - 1.5) * 1.7; n.tx = n.x; n.ty = n.y; n.waitT = 999; n.barkT = 999; });
    const v = await import('/src/core/view.js'); v.camera.zoom = 1.5; v.camera.follow(p.x, p.y - 1.5, 0, true);
    return vs.map((n) => ({ name: n.name, art: !!replacementImage(n.art), pal: !!n.pal }));
  });
  console.log(JSON.stringify(info));
  if (info.length !== 4 || info.some((v) => !v.art || v.pal)) errors.push('villager art missing or recoloured');
  for (let i = 0; i < 4; i++) {
    const talking = await page.evaluate((i) => {
      const { G } = window.VELSCOUR, vs = G.world.npcs.filter((n) => n.villager);
      vs[i].use(); return G.world.npcs.filter((n) => n.say).length;
    }, i);
    if (talking !== 1) errors.push(`${talking} villagers talking at once`);
    await page.waitForTimeout(400); await shot(`villager_say_${i}`);
  }
  report(errors); await browser.close();
})();
