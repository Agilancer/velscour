// Monster rims and the enlargeable target window. A Slime Lord in a dungeon with a few pets
// and the depth's monsters: checks every monster/summon gets a rim colour (by rank; green for summons, pale gold for the
// hero), shoots a pet held behind a wall (rims_wall_pet vs rims_wall_nopet: the wall fades), and that a click on the target window toggles it 2x+ and
// back while staying on screen, on desktop and on a phone in landscape and portrait. Shots: rims_*.png.
//   node tools/tests/rims.js
const { openGame, report } = require('./harness');

const SIZES = [['desktop', { width: 1400, height: 800 }], ['land', { width: 844, height: 390, mobile: true }], ['port', { width: 390, height: 844, mobile: true }]];

(async () => {
  const out = [];
  let errs = [];
  for (const [tag, opts] of SIZES) {
    const { browser, page, errors, shot } = await openGame(opts);
    const res = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('slime_lord', 'Gloop');
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0;
      const { loadPetArt } = await import('/src/core/enemyart.js');
      const { SUMMONS } = await import('/src/data/summons.js');
      const { buildSummon } = await import('/src/game/monster.js');
      await loadPetArt();
      G.char.depth = 3; const w0 = G.world; game.enterDungeon();
      for (let i = 0; i < 100 && (G.world === w0 || !document.getElementById('loading').classList.contains('hidden')); i++) await new Promise((r) => setTimeout(r, 100));
      G.paused = false; G.godMode = true; G.settings.gore = 0;
      document.getElementById('center-msg').style.display = 'none';
      const p = G.player, w = G.world, map = w.map, o = [];
      const keys = Object.keys(SUMMONS).filter((k) => SUMMONS[k].look && Array.isArray(SUMMONS[k].look.art)).slice(0, 3);
      const pets = keys.map((k, i) => { const m = buildSummon(p, SUMMONS[k], k, p.x + 0.8 * i, p.y + 0.8, 1, 100, 0); m.spawnT = 1; return w.add(m) || m; });
      // pull a few monsters next to the hero for the shot and the target window
      const foes = w.creatures.filter((c) => c.team === 'enemy' && !c.dead).slice(0, 4);
      foes.forEach((m, i) => { m.x = p.x + 2 + i * 0.7; m.y = p.y - 1.5 + i * 0.4; m.awake = false; });
      const rims = w.creatures.filter((c) => !c.dead).map((c) => [c.isPlayer ? 'hero' : c.summon ? 'pet' : c.team, c.rank, c.rimColor()]);
      const bad = rims.filter(([, , col]) => !col);
      o.push((bad.length ? 'FAIL ' + JSON.stringify(bad) : '  ok ') + ` rims: ${rims.length} creatures, ${[...new Set(rims.map((r) => r[0] + ':' + (r[1] || '') + '=' + r[2]))].join(' ')}`);
      // a pet behind a wall: find a wall tile with open floor right behind it (larger x+y) near the hero
      let spot = null;
      for (let r = 2; r < 14 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
        const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy;
        if (!map.isFloor(x, y) && map.isFloor(x - 1, y - 1) && map.isFloor(x - 2, y - 2) && Math.hypot(x - p.x, y - p.y) > 3) spot = [x, y];
      }
      o.push('  .. wall spot ' + JSON.stringify(spot));
      G.lastHit = foes[0];
      return { o, spot, petN: pets.length };
    });
    out.push(...res.o.map((l) => `[${tag}] ${l}`));
    await page.waitForTimeout(700);
    await shot(`rims_${tag}_small`);
    if (tag === 'desktop' && res.spot) { // the pet walks behind the wall (held there), then the same view with it gone
      await page.evaluate(([x, y]) => { const { G } = window.VELSCOUR, m = G.world.creatures.find((c) => c.summon); m.x = x - 0.6; m.y = y - 0.6; m.speed = 0; m.followOwner = () => {}; m.update = () => {}; }, res.spot);
      await page.waitForTimeout(300); await shot('rims_wall_pet');
      await page.evaluate(() => { const m = window.VELSCOUR.G.world.creatures.find((c) => c.summon); m.x += 60; });
      await page.waitForTimeout(300); await shot('rims_wall_nopet');
    }
    const box = async () => page.evaluate(() => { const b = document.getElementById('target-box'), r = b.getBoundingClientRect(), pic = document.getElementById('tb-pic').getBoundingClientRect(); return { cls: b.className, w: pic.width, x: r.left, y: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
    const a = await box();
    await page.click('#target-box');
    await page.waitForTimeout(200);
    const b = await box();
    await shot(`rims_${tag}_big`);
    await page.click('#target-box');
    await page.waitForTimeout(200);
    const c = await box();
    const fits = b.x >= 0 && b.y >= 0 && b.r <= b.vw && b.b <= b.vh;
    out.push(`[${tag}] ${b.w >= a.w * 2 && fits && /big/.test(b.cls) && !/big/.test(c.cls) && c.w === a.w ? '  ok ' : 'FAIL '} target window ${a.w}px -> ${b.w}px (box ${Math.round(b.r - b.x)}x${Math.round(b.b - b.y)} at ${Math.round(b.x)},${Math.round(b.y)} in ${b.vw}x${b.vh}) -> ${c.w}px`);
    errs = errs.concat(errors);
    await browser.close();
  }
  console.log(out.join('\n'));
  report(errs);
})();
