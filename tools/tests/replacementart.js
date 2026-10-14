// Painted sprite coverage, real summon rendering/flash/corpses, icon dimensions and a full contact sheet.
// Uses harness.js; TEST_FROM_DISK=1 also checks assets without a local HTTP server.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1400, height: 1000 });
  try {
    const result = await page.evaluate(async () => {
      const { REPLACEMENT_ART } = await import('/src/data/replacementart.js');
      const { replacementImage, replacementIcon } = await import('/src/core/replacementart.js');
      const { enemyImage, enemyArtReady, loadArtFor } = await import('/src/core/enemyart.js');
      const { SUMMONS } = await import('/src/data/summons.js');
      const { buildSummon } = await import('/src/game/monster.js');
      const { itemIcon } = await import('/src/game/loot.js');
      const { gemIcon, ringIcon, goldIcon } = await import('/src/gfx/pixelart.js');
      const { GEMS } = await import('/src/data/items.js');
      const { G, game } = window.VELSCOUR;
      await game.newChar('necromancer', 'Art QA');
      G.godMode = true;
      const bad = [], check = (ok, message) => { if (!ok) bad.push(message); };
      await loadArtFor(REPLACEMENT_ART.map((a) => a.id));
      for (const a of REPLACEMENT_ART) {
        const img = replacementImage(a.id);
        check(img && img.width > 4 && img.height > 4, a.id + ' missing');
        check(enemyArtReady(a.id), a.id + ' not ready');
        const flash = enemyImage(a.id, null, 'flash'), corpse = enemyImage(a.id, null, 'dark');
        check(flash && corpse && flash.width === img.width && corpse.height === img.height, a.id + ' silhouette dimensions');
        const d = flash.getContext('2d').getImageData(0, 0, flash.width, flash.height).data;
        check(d.some((v, i) => i % 4 === 3 && v > 200), a.id + ' empty alpha');
        for (let i = 0; i < d.length; i += 4) if (d[i+3] > 200) { check(d[i] > 250 && d[i+1] > 250 && d[i+2] > 250, a.id + ' flash not white'); break; }
      }
      let summons = 0;
      for (const [key, def] of Object.entries(SUMMONS)) {
        if (!def.look || key === 'clone') continue;
        check(!!def.look.art, key + ' still placeholder');
        if (!String(def.look.art).startsWith('va_')) continue;
        const m = buildSummon(G.player, def, key, 0, 0, 10, 100, 20), img = m.spriteImage();
        check(img && img._art, key + ' fallback active');
        check(m.flashImage(img)?._art, key + ' missing flash');
        const [w,h] = m.spriteDims(img);
        check(w > 5 && w < 220 && h >= 24 && h <= 80, key + ' invalid game scale');
        summons++;
      }
      for (const size of [24, 48, 72]) {
        for (const a of REPLACEMENT_ART.filter((a) => a.id.startsWith('va_item_'))) {
          const icon = itemIcon({ type: 'gear', icon: a.id.slice(8), tier: 0, rarity: 0, base: 'qa' }, size);
          check(icon.width === size && icon.height === size, a.id + ' stretched size');
        }
        for (const [gem, def] of Object.entries(GEMS)) for (const tier of [0, 5, 8]) {
          const icon = gemIcon(gem, def.color, tier, size);
          check(icon.width === size && icon.height === size, gem + ' size');
        }
        check(ringIcon('#aaa', '#c060ff', 4, size).width === size, 'ring size');
        check(goldIcon(size, 800).width === size, 'gold size');
      }
      // Freeze the game canvas, then show every imported cut against a light/dark checker.
      const gallery = document.createElement('canvas');
      gallery.width = 1400; gallery.height = Math.ceil(REPLACEMENT_ART.length / 10) * 150;
      const ctx = gallery.getContext('2d'); ctx.imageSmoothingEnabled = false;
      REPLACEMENT_ART.forEach((a, i) => {
        const x = i % 10 * 140, y = Math.floor(i / 10) * 150;
        ctx.fillStyle = i % 2 ? '#393337' : '#211d22'; ctx.fillRect(x,y,140,150);
        const img = replacementImage(a.id), k = Math.min(118/img.width, 120/img.height);
        ctx.drawImage(img, x+(140-img.width*k)/2,y+124-img.height*k,img.width*k,img.height*k);
        ctx.fillStyle = '#eee3ce'; ctx.font = '11px monospace'; ctx.fillText(a.id.slice(3), x+4,y+142);
      });
      document.body.append(gallery); gallery.id = 'art-qa';
      gallery.style.cssText = 'position:absolute;left:0;top:0;z-index:99999;';
      return { sprites: REPLACEMENT_ART.length, summons, bad };
    });
    console.log(JSON.stringify(result));
    errors.push(...result.bad);
    await page.locator('#art-qa').screenshot({ path: require('path').join(require('./harness').OUT_DIR, 'replacement_gallery.png') });
    report(errors);
  } finally { await browser.close(); }
})();
