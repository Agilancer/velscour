// Town villagers: no green (full-wheel) palette swaps, every line fits its speech bubble untruncated,
// clicking talks in a bubble only; screenshots of townsfolk talking.
// node tools/tests/villagers.js
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors, shot } = await openGame();
  await page.click('text=Heroes'); await page.click('.class-card[data-id="paladin"]'); await page.click('text=Begin');
  await page.waitForTimeout(4500);
  const info = await page.evaluate(async () => {
    const T = await import('/src/data/townsfolk.js');
    const c = document.createElement('canvas').getContext('2d');
    c.font = '600 12px "Alegreya Sans", "Segoe UI", sans-serif';
    const lines = (t) => { let n = 1, line = ''; for (const w of t.split(/\s+/)) { const x = line ? line + ' ' + w : w; if (line && c.measureText(x).width > 146) { n++; line = w; } else line = x; } return n; };
    const texts = [...T.TOWN_SITUATIONS.map((s) => s.text), ...T.TOWN_CONVERSATIONS.flatMap((s) => s.lines)];
    for (let i = 0; i < 100; i++) for (let b = 0; b < 8; b++) texts.push(T.townLine(T.TOWNSFOLK[i].id, i, b));
    return { hues: Math.max(...T.TOWNSFOLK.map((p) => Math.abs(p.palette.hue))), tooLong: [...new Set(texts.filter((t) => lines(t) > 3))].slice(0, 5) };
  });
  console.log('max hue shift', info.hues, 'lines over 3:', JSON.stringify(info.tooLong));
  if (info.hues > 20) errors.push('townsfolk palette hue shift too large (green people)');
  if (info.tooLong.length) errors.push('speech lines do not fit their bubble');
  const said = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player;
    const vs = G.world.npcs.filter((n) => n.townsfolkId).slice(0, 4);
    vs.forEach((n, i) => { n.x = p.x + (i - 1.5) * 2.2; n.y = p.y - 2.5 - (i - 1.5) * 2.2; n.tx = n.x; n.ty = n.y; n.waitT = 999; n.barkT = 999; n.chatT = 999; });
    vs[0].use(); vs[2].use();
    const v = await import('/src/core/view.js'); v.camera.zoom = 1.5; v.camera.follow(p.x, p.y - 2, 0, true);
    return vs.filter((n) => n.talkT > 0).map((n) => `${n.name}: ${n.talkText}`);
  });
  console.log(said.join('\n'));
  await page.waitForTimeout(500); await shot('villagers_talk');
  report(errors); await browser.close();
})();
