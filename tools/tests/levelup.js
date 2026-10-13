// Velscour's level-up lines (src/data/taunts.js on the banner in src/ui/hud.js): real level-ups never repeat a mood
// back to back and fill in the hero, the deck survives in localStorage, and the longest line of every mood fits the
// banner (desktop 1280x720 and phone 844x390, worst-case hero name). Screenshots: levelup_<mood>[_mobile].
//   node tools/tests/levelup.js
const { openGame, report } = require('./harness');

const fail = (msg) => { console.log('FAIL', msg); process.exitCode = 1; };

async function run(mobile) {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : {});
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    localStorage.removeItem('velscour_taunts_v1');
    await game.newChar('bard', 'Wwwwwwwwwwwwwwwwww');
    G.godMode = true;
  });
  await page.waitForTimeout(1200);
  // real level-ups (skipping the banner's wait), checking mood and text each time
  const seen = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, out = [];
    for (let i = 0; i < 30; i++) {
      if (G.ui.hud.lu) G.ui.hud.lu.end = 0;
      G.player.levelUp();
      const box = document.querySelector('#levelup');
      out.push({ mood: box.dataset.mood, l1: document.querySelector('#lu-l1').textContent, l2: document.querySelector('#lu-l2').textContent, level: G.char.level });
    }
    return { out, deck: JSON.parse(localStorage.getItem('velscour_taunts_v1') || 'null') };
  });
  seen.out.forEach((t, i) => {
    if (!t.mood || !t.l1 || !t.l2 || /[{}|]/.test(t.l1 + t.l2)) fail('bad banner text ' + JSON.stringify(t));
    if (i && t.mood === seen.out[i - 1].mood) fail('mood repeated ' + t.mood);
  });
  if (!seen.deck || !seen.deck.last || !seen.deck.used) fail('deck not saved');
  if (!mobile) for (const t of seen.out) console.log(`  L${t.level} [${t.mood}] ${t.l1} / ${t.l2}`);
  // the longest line of each mood, with a worst-case name, must fit on at most two rows each
  const moods = await page.evaluate(async () => Object.keys((await import('/src/data/taunts.js')).TAUNTS));
  for (const mood of moods) {
    const fit = await page.evaluate(async (mood) => {
      const { G } = window.VELSCOUR;
      const { TAUNTS } = await import('/src/data/taunts.js');
      const len = (s) => s.replaceAll('{name}', G.char.name).replaceAll('{class}', 'Boomerang Knight').length;
      const pick = TAUNTS[mood].reduce((a, b) => (Math.max(...b.split('|').map(len)) > Math.max(...a.split('|').map(len)) ? b : a));
      G.ui.hud.lu.end = 0;
      G.ui.hud.levelUp(G.char.level, null);
      const [l1, l2] = pick.replaceAll('{name}', G.char.name).replaceAll('{class}', 'Boomerang Knight').replaceAll('{level}', '100').split('|');
      document.querySelector('#levelup').dataset.mood = mood;
      document.querySelector('#lu-l1').textContent = l1; document.querySelector('#lu-l2').textContent = l2;
      const rows = (e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
      const r = (e) => e.getBoundingClientRect();
      const a = document.querySelector('#lu-l1'), b = document.querySelector('#lu-l2');
      return { l1, l2, rows: [rows(a), rows(b)], inside: r(a).left >= 0 && r(b).right <= innerWidth, color: getComputedStyle(b).color };
    }, mood);
    if (Math.max(...fit.rows) > 2 || !fit.inside) fail(`${mood} line does not fit: ${JSON.stringify(fit)}`);
    await page.waitForTimeout(4600);
    await shot(`levelup_${mood}${mobile ? '_mobile' : ''}`);
    console.log(`  ${mobile ? 'mobile' : 'desktop'} ${mood} rows ${fit.rows} ${fit.color}: ${fit.l1} / ${fit.l2}`);
  }
  report(errors);
  await browser.close();
}

(async () => {
  await run(false);
  await run(true);
})();
