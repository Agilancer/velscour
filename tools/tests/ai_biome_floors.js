// Regression for AI biome floor backgrounds, seamless bases, and approved art priority.
// Start from the repository root: python3 -m http.server 8123
// Then: node tools/tests/ai_biome_floors.js [--all]
// --all saves a character-in-biome screenshot for every indoor biome.
const { openGame, report } = require('./harness');

const ALL = process.argv.includes('--all');
const REPRESENTATIVE = ['catacombs', 'frozen', 'fungal', 'amber', 'hell', 'heavenly'];
const APPROVED = new Set(['desert_temple', 'ice_temple', 'hell', 'astral_plane', 'heavenly']);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1440, height: 900 });
  try {
    // Deliberately make the AI source an opaque rectangle. Neither a repeatable
    // base, nor a previously processed cell, nor the boundary band may change.
    const synthetic = await page.evaluate(async () => {
      const { paintAIBiomeFloors } = await import('/src/gfx/aibiomeart.js');
      const canvas = document.createElement('canvas');
      canvas.width = 486;
      canvas.height = 80;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      for (let i = 0; i < 3; i++) {
        g.fillStyle = ['#102030', '#203040', '#304050'][i];
        g.fillRect(i * 162, 0, 160, 80);
      }
      const atlas = document.createElement('canvas');
      atlas.width = atlas.height = 512;
      const a = atlas.getContext('2d');
      a.fillStyle = '#ff00ff';
      a.fillRect(128, 16, 64, 32); // source index 2
      const cell = (x, seamless) => ({ x, y: 0, w: 160, h: 80, seamless });
      paintAIBiomeFloors({
        floors: canvas,
        meta: { floors: [cell(0, true), cell(162, false), cell(324, false)],
          expansion: { floorStart: 2 } },
      }, atlas);
      const rgb = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data).slice(0, 3).join(',');
      const checks = [
        ['seamless base', rgb(80, 40), '16,32,48'],
        ['previously processed floor', rgb(242, 40), '32,48,64'],
        ['AI accent at center', rgb(404, 40), '255,0,255'],
        ['top seam protected', rgb(404, 5), '48,64,80'],
        ['left seam protected', rgb(330, 40), '48,64,80'],
        ['right seam protected', rgb(475, 40), '48,64,80'],
        ['bottom seam protected', rgb(404, 75), '48,64,80'],
        ['source corner protected', rgb(325, 1), '48,64,80'],
      ];
      return checks.filter(c => c[1] !== c[2]).map(c => c[0] + ': got ' + c[1] + ', expected ' + c[2]);
    });
    errors.push(...synthetic);

    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'AI Floor QA');
      document.querySelectorAll('.screen').forEach(s => s.remove());
      G.ui.modalCount = 0;
      G.godMode = true;
    });
    const ids = ALL ? await page.evaluate(async () => {
      const { BIOMES } = await import('/src/data/biomes.js');
      return BIOMES.filter(b => !b.overworld && b.id !== 'throne').map(b => b.id);
    }) : REPRESENTATIVE;

    for (const id of ids) {
      try {
        const result = await page.evaluate(async (id) => {
          const { G, game } = window.VELSCOUR;
          const { BIOME_BY_ID } = await import('/src/data/biomes.js');
          const { A, loadBiomeArt } = await import('/src/core/assets.js');
          const biome = BIOME_BY_ID[id];
          await loadBiomeArt(biome);
          const pack = A.packs['expanded_' + id];
          const issues = [];
          if(id==='catacombs'){
            if(pack)issues.push('Catacombs master must not be expanded');
            const {biomeTileSet}=await import('/src/core/assets.js');
            const set=biomeTileSet(biome);
            if(set.bases.length!==10)issues.push('Catacombs base paving was altered');
            game.buildDungeon(15,biome);
            return {issues};
          }
          if (!pack?.meta?.expansion) return { issues: ['No expanded pack for ' + id] };
          const meta = pack.meta;
          const start = meta.expansion.floorStart;
          const appended = meta.floors.slice(start);
          if (appended.length !== 120) issues.push(id + ': missing expanded floor tiles');
          if (appended.filter(f => f.seamless).length !== 10)
            issues.push(id + ': incorrect repeatable floor count');
          const g = pack.floors.getContext('2d', { willReadFrequently: true });
          // A 2:1 floor must never paint any rectangle-corner pixels.
          for (const f of appended.slice(0, 25)) {
            for (const [dx, dy] of [[0, 0], [f.w - 1, 0], [0, f.h - 1], [f.w - 1, f.h - 1]]) {
              if (g.getImageData(f.x + dx, f.y + dy, 1, 1).data[3] !== 0) {
                issues.push(id + ': opaque bounding-box corner in ' + f.name);
                break;
              }
            }
          }
          if (['desert_temple', 'ice_temple', 'hell', 'astral_plane', 'heavenly'].includes(id)) {
            const approved = meta.approvedArt;
            if (!approved || approved.floorCount !== 8)
              issues.push(id + ': approved floor art missing after import');
          }
          game.buildDungeon(15, biome);
          return { issues };
        }, id);
        errors.push(...result.issues);
        await page.waitForTimeout(250);
        await shot('ai_biome_floor_' + id);
        console.log('Captured ' + id);
      } catch (e) {
        errors.push(id + ': ' + (e.stack || e));
      }
    }
  } catch (e) {
    errors.push('AI BIOME FLOORS: ' + (e.stack || e));
  } finally {
    report(errors);
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
