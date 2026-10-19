// Gear art check (docs/CLASS_ART.md): a contact sheet of hero looks (body armor designs per rarity in random
// finishes, with and without helms), the inventory with gear icons, and close-ups of every armor aura in a
// dungeon. Screenshots gear_*.png.
//   node tools/tests/gear.js [paladin,ranger,...]   (default: paladin; "all" = every class)
const path = require('path');
const { openGame, report, OUT_DIR } = require('./harness');
const ALL = ['paladin', 'ranger', 'wizard', 'necromancer', 'barbarian', 'dragoon', 'totem_master', 'death_knight', 'arcane_sorcerer',
  'carrion_witch', 'bard', 'slime_lord', 'boomerang_knight', 'lancer', 'dragon_knight', 'gunner'];
const arg = process.argv[2] || 'paladin';
const CLASSES = arg === 'all' ? ALL : arg.split(',');
const FX_SHOTS = process.argv[3] !== 'nofx';

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1400, height: 900 });
  let fail = false;
  for (const cls of CLASSES) {
    // contact sheet: rows = rarities, columns = designs across the band; odd columns wear a helm
    const info = await page.evaluate(async (cls) => {
      const { G, game } = window.VELSCOUR;
      if (G.char) game.quitToTitle && game.quitToTitle();
      await game.newChar(cls, 'Gear');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
      const ga = await import('/src/core/gearart.js');
      const { rollItem } = await import('/src/data/items.js');
      const meta = ga.gearMeta(cls);
      if (!meta) return { error: 'no gear art for ' + cls };
      const cols = 12, cw = 110, ch = 150;
      const cv = document.createElement('canvas'); cv.id = 'gearsheet';
      cv.width = cols * cw; cv.height = 6 * ch;
      Object.assign(cv.style, { position: 'fixed', left: '0', top: '0', zIndex: 9999, background: '#2a2a32' });
      const x = cv.getContext('2d');
      x.fillStyle = '#2a2a32'; x.fillRect(0, 0, cv.width, cv.height);
      const looks = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < cols; c++) {
          const body = rollItem(1 + Math.round((c / (cols - 1)) * 99), { slot: 'body', rarity: r });
          const head = c % 2 ? rollItem(1 + Math.round((c / (cols - 1)) * 99), { slot: 'head', rarity: r }) : null;
          const img = ga.heroLook(cls, body, head);
          const top = meta.headTop - 14, k = Math.min(cw / img.width, (ch - 12) / (meta.feet + 2 - top));
          x.drawImage(img, 0, top, img.width, meta.feet + 2 - top, c * cw + (cw - img.width * k) / 2, r * ch, img.width * k, (meta.feet + 2 - top) * k);
          const fin = ga.finishOf(body);
          x.fillStyle = '#ddd'; x.font = '10px sans-serif';
          x.fillText(`${body.look[0]}${head ? '+h' + head.look[0] : ''} ${fin ? fin.name : 'Original'}`, c * cw + 2, r * ch + ch - 3);
          looks.push(body.look);
        }
      }
      document.body.appendChild(cv);
      return { n: looks.length, bands: meta.armor.bands };
    }, cls);
    console.log(cls, JSON.stringify(info));
    if (info.error) { fail = true; continue; }
    await page.locator('#gearsheet').screenshot({ path: path.join(OUT_DIR, `gear_${cls}_sheet.png`) });
    await page.evaluate(() => document.getElementById('gearsheet').remove());
  }

  // inventory + in-world look for the first class
  const cls = CLASSES[0];
  await page.evaluate(async (cls) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar(cls, 'Gear');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { rollItem } = await import('/src/data/items.js');
    for (const r of [1, 2, 3, 4, 5]) for (const slot of ['body', 'head']) G.char.bag[G.char.bag.indexOf(null)] = rollItem(20 * r, { slot, rarity: r });
    G.char.equip.body = rollItem(70, { slot: 'body', rarity: 4 });
    G.char.equip.head = rollItem(70, { slot: 'head', rarity: 4 });
    G.player.recompute();
  }, cls);
  await page.keyboard.press('i');
  await page.waitForTimeout(700);
  await shot('gear_inventory');
  await page.keyboard.press('i');

  if (FX_SHOTS) {
    const n = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { camera } = await import('/src/core/view.js');
      G.godMode = true;
      game.buildDungeon(1, BIOME_BY_ID.catacombs);
      await new Promise((r) => setTimeout(r, 300));
      for (const c of G.world.creatures) if (c.team === 'enemy') c.dead = true;
      G.settings.zoom = 2.2; camera.computeZoom();
      const { GEAR_FX } = await import('/src/data/gear.js');
      return GEAR_FX.length;
    });
    for (let i = 0; i < n; i++) {
      const name = await page.evaluate(async (i) => {
        const { G } = window.VELSCOUR;
        const { rollItem } = await import('/src/data/items.js');
        const { GEAR_FX } = await import('/src/data/gear.js');
        const { itemLook } = await import('/src/core/gearart.js');
        const fx = GEAR_FX[i];
        const body = rollItem(80, { slot: 'body', rarity: Math.max(2, fx.tier) });
        itemLook(body); body.look[2] = i;
        G.char.equip.body = body; G.player.recompute();
        const { camera } = await import('/src/core/view.js');
        camera.follow(G.player.x, G.player.y, 0, true);
        return fx.name;
      }, i);
      await page.waitForTimeout(900); // particles build up
      const clip = await page.evaluate(async () => {
        const { G } = window.VELSCOUR; const { camera } = await import('/src/core/view.js');
        const [x, y] = camera.tileToScreen(G.player.x, G.player.y, 0);
        return { x: Math.max(0, x - 150), y: Math.max(0, y - 230), width: 300, height: 290 };
      });
      await page.screenshot({ path: path.join(OUT_DIR, `gear_fx_${String(i).padStart(2, '0')}_${name.replace(/[^a-z]/gi, '')}.png`), clip });
    }
  }
  if (fail) { console.log('FAIL'); process.exitCode = 1; }
  report(errors);
  await browser.close();
})();
