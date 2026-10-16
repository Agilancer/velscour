// Settings zoom must update the active camera when Done closes the dialog,
// without requiring a resize or rebuilding the town/dungeon.
const assert = require('node:assert/strict');
const { openGame, report } = require('./harness');

(async () => {
  for (const mobile of [false, true]) {
    const { browser, page, errors } = await openGame({
      width: mobile ? 844 : 1280, height: mobile ? 390 : 720, mobile,
    });
    try {
      await page.evaluate(async () => {
        const { game, G } = window.VELSCOUR;
        const { newCharData } = await import('/src/game/save.js');
        await game.loadClassPack('paladin');
        game.startChar(newCharData('paladin', 'Zoom Test'), false);
        window.zoomWorldBefore = G.world;
      });
      const before = await page.evaluate(async () => {
        const { camera } = await import('/src/core/view.js');
        return { zoom: camera.zoom, preference: window.VELSCOUR.G.settings.zoom };
      });
      await page.evaluate(async () => {
        const { settingsDialog } = await import('/src/ui/screens.js');
        settingsDialog();
        const slider = document.querySelector('.dialog-box [data-k="zoom"]');
        slider.value = '1.4';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.click('.dialog-box .row button');
      const after = await page.evaluate(async () => {
        const { camera } = await import('/src/core/view.js');
        const { G } = window.VELSCOUR;
        return {
          zoom: camera.zoom,
          preference: G.settings.zoom,
          saved: JSON.parse(localStorage.getItem('velscour_settings_v1')).zoom,
          sameWorld: G.world === window.zoomWorldBefore,
          closed: !document.querySelector('.dialog-box'),
        };
      });
      assert.equal(after.preference, 1.4, 'zoom preference updated');
      assert.equal(after.saved, 1.4, 'zoom preference persisted');
      assert.ok(Math.abs(after.zoom - before.zoom * (1.4 / before.preference)) < 1e-6,
        'camera zoom recomputed on Done');
      assert.ok(after.sameWorld, 'world stays active');
      assert.ok(after.closed, 'Settings closed');
      console.log(`Settings zoom Done: ${mobile ? 'mobile' : 'desktop'} PASS`);
      report(errors);
    } finally {
      await browser.close();
    }
  }
})().catch((err) => { console.error(err); process.exitCode = 1; });
