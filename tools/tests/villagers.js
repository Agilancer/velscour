// Town villagers: no runtime palette swaps, every scripted line fits its two-line speech bubble untruncated,
// clicking talks in a bubble only; screenshots of townsfolk talking.
// node tools/tests/villagers.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(4500);
  const info = await page.evaluate(async () => {
    const T = await import('/src/data/townsfolk.js'), S = await import('/src/data/townscripts.js');
    const c = document.createElement('canvas').getContext('2d');
    c.font = '600 11px "Alegreya Sans", "Segoe UI", sans-serif';
    const lines = (t) => { let n = 1, line = ''; for (const w of t.split(/\s+/)) { const x = line ? line + ' ' + w : w; if (line && c.measureText(x).width > 128) { n++; line = w; } else line = x; } return n; };
    const texts = [...S.CHATS, ...S.ADVENTURER_CHATS].flatMap((x) => x.lines.map((l) => l[1]));
    texts.push(...Object.values(S.BARKS).flat().map((l) => l[0]), ...S.ADVENTURER_BARKS.map((l) => l[0]), ...Object.values(S.SHOPPING).flat(2).map((l) => l[0]));
    for (const ev of Object.values(S.EVENT_LINES)) texts.push(ev.intro, ...(ev.beats || []).map((l) => l[1]), ...(ev.vows || []).map((l) => l[1]), ...(ev.crowd || []).map((l) => l[0]));
    return { hues: T.TOWNSFOLK.filter((p) => p.palette).length, tooLong: [...new Set(texts.filter((t) => lines(t) > 2))].slice(0, 5) };
  });
  console.log('runtime recolours', info.hues, 'lines over 2:', JSON.stringify(info.tooLong));
  if (info.hues) errors.push('townsfolk must not be recoloured at runtime');
  if (info.tooLong.length) errors.push('speech lines do not fit their bubble');
  const said = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player;
    const vs = G.world.npcs.filter((n) => n.townsfolkId).slice(0, 4);
    vs.forEach((n, i) => { G.world.townLife.show(n, p.x + (i - 1.5) * 2.2, p.y - 2.5 - (i - 1.5) * 2.2); n.alpha = 1; n.busy = true; n.goal = n.path = null; n.barkT = 999; });
    vs[0].use(); vs[2].use();
    const v = await import('/src/core/view.js'); v.camera.zoom = 1.5; v.camera.follow(p.x, p.y - 2, 0, true);
    return vs.filter((n) => n.talkT > 0).map((n) => `${n.name}: ${n.talkText}`);
  });
  console.log(said.join('\n'));
  await page.waitForTimeout(500); await shot('villagers_talk');
  report(errors); await browser.close();
})();
