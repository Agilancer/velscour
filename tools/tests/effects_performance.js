// Same-world A/B against the pre-optimization code. Pixel comparison is exact;
// timings are diagnostic, not a flaky speed threshold. Uses harness env vars.
// node tools/tests/effects_performance.js [mobile]
// PERF_BASE_REF can override the original main commit for future comparisons.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert/strict');
const { openGame, report, OUT_DIR } = require('./harness');
const base = process.env.PERF_BASE_REF || 'b53e287';
for (const [name, file] of Object.entries({ render: 'game/render', world: 'game/world', vfx: 'gfx/vfx' })) {
  const source = execFileSync('git', ['show', `${base}:src/${file}.js`], { encoding: 'utf8' })
    .replace(/from '\.\.\//g, "from '/src/")
    .replace(/from '\.\//g, `from '/src/${file.split('/')[0]}/`);
  fs.writeFileSync(path.join(OUT_DIR, `baseline_${name}.js`), source);
}

(async () => {
  const mobile = process.argv.includes('mobile');
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile } : {});
  try {
    await page.evaluate(() => window.VELSCOUR.game.newChar('wizard', 'Effects QA'));
    for (const id of ['catacombs', 'ice_temple', 'hell', 'astral_plane', 'heavenly', 'overworld']) {
      const result = await page.evaluate(async id => {
        const { G, game } = window.VELSCOUR;
        const { BIOME_BY_ID } = await import('/src/data/biomes.js');
        const { loadBiomeArt } = await import('/src/core/assets.js');
        const { renderWorld } = await import('/src/game/render.js');
        const { renderWorld: oldRender } = await import('/tools/tests/out/baseline_render.js');
        const { World: OldWorld } = await import('/tools/tests/out/baseline_world.js');
        const { World } = await import('/src/game/world.js');
        const vfx = await import('/src/gfx/vfx.js');
        const oldVfx = await import('/tools/tests/out/baseline_vfx.js');
        const { camera } = await import('/src/core/view.js');
        // Repeated cached loads must stay awaitable and retain expanded art.
        const biome = BIOME_BY_ID[id];
        await loadBiomeArt(biome); await loadBiomeArt(biome);
        const random = Math.random;
        let seed = 71829;
        Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
        try { game.buildDungeon(8, biome); } finally { Math.random = random; }
        const w = G.world;
        G.godMode = true; w.rebuildGrid();
        const positions = [w.player, ...w.creatures.filter(c => c.team === 'enemy').slice(0, 3)];
        let changedPixels = 0, calls = 0, oldCalls = 0, renderMs = 0, oldRenderMs = 0;
        const proto = CanvasRenderingContext2D.prototype, draw = proto.drawImage;
        const measure = fn => {
          let n = 0;
          proto.drawImage = function (...args) { n++; return draw.apply(this, args); };
          G.ctx.getImageData(0, 0, 1, 1); // drain queued raster work before timing
          const start = performance.now();
          try {
            for (let i = 0; i < 20; i++) fn(G.ctx, w);
            G.ctx.getImageData(0, 0, 1, 1);
          }
          finally { proto.drawImage = draw; }
          return [performance.now() - start, n / 20];
        };
        // Fixed live scene, same time, particles, dimensions and resolution.
        vfx.clearVfx();
        for (let i = 0; i < (G.touch ? 1400 : 3000); i++) vfx.spawn({ type: i % 2 ? 'glow' : 'dot',
          x: w.player.x + ((i * 17) % 80 - 40) / 10, y: w.player.y + ((i * 31) % 80 - 40) / 10,
          z: i % 70, life: 2, color: i % 2 ? '#ff8a30' : '#c5f4ff', add: !!(i % 2) });
        for (const p of positions) {
          camera.follow(p.x, p.y, 0, true);
          for (let i = 0; i < 180; i++) { G.frame++; renderWorld(G.ctx, w); }
          oldRender(G.ctx, w);
          const before = G.ctx.getImageData(0, 0, G.canvas.width, G.canvas.height).data;
          renderWorld(G.ctx, w);
          const after = G.ctx.getImageData(0, 0, G.canvas.width, G.canvas.height).data;
          for (let i = 0; i < before.length; i += 4)
            if (before[i] !== after[i] || before[i+1] !== after[i+1] || before[i+2] !== after[i+2] || before[i+3] !== after[i+3]) changedPixels++;
          const a = measure(oldRender), b = measure(renderWorld);
          oldRenderMs += a[0]; renderMs += b[0]; oldCalls += a[1]; calls += b[1];
        }
        let mismatches = 0;
        const synthetic = new World('dungeon', { map: { los: (x,y,cx,cy) => cy >= 0 } });
        synthetic.creatures = [
          { x: 1, y: 0, r: .5, team: 'enemy' }, { x: -1, y: 0, r: .5, team: 'enemy' },
          { x: 0, y: -1, r: .5, team: 'enemy' }, { x: 0, y: 1, r: .5, team: 'enemy' },
          { x: 0, y: 0, r: .5, team: 'player' }, { x: 0, y: 0, r: .5, team: 'enemy', dead: true },
          { x: 0, y: 0, r: .5, team: 'enemy', targetable: false },
        ];
        for (let rebuild = 0; rebuild < 3; rebuild++) {
          synthetic.rebuildGrid();
          for (const r of [.5, 3, 30]) for (const los of [false, true])
            if (synthetic.nearestHostile('player',0,0,r,los) !== OldWorld.prototype.nearestHostile.call(synthetic,'player',0,0,r,los)) mismatches++;
        }
        // Include target ties, dead/untargetable units, sparse/dense and LOS searches.
        for (const p of positions) for (const r of [0.5, 3, 8, 30]) for (const los of [false, true]) {
          if (w.nearestHostile('player', p.x, p.y, r, los) !== OldWorld.prototype.nearestHostile.call(w, 'player', p.x, p.y, r, los)) mismatches++;
          if (w.nearestHostile('enemy', p.x, p.y, r, los) !== OldWorld.prototype.nearestHostile.call(w, 'enemy', p.x, p.y, r, los)) mismatches++;
        }
        const queryTime = fn => {
          const start = performance.now();
          for (let i = 0; i < 2000; i++) fn.call(w, 'enemy', w.player.x, w.player.y, 30);
          return performance.now() - start;
        };
        const oldQueryMs = queryTime(OldWorld.prototype.nearestHostile), queryMs = queryTime(w.nearestHostile);
        // Alternating expired/live particles exercise compaction and survivor order.
        vfx.clearVfx(); oldVfx.clearVfx();
        for (let i = 0; i < 1000; i++) for (const fx of [vfx, oldVfx]) fx.spawn({ type: 'dot',
          x: i / 100, y: 2, life: i % 2 ? 1 : 0.01, vx: 1, drag: 2, color: '#ffffff' });
        vfx.updateVfx(0.02, w); oldVfx.updateVfx(0.02, w);
        const particleMatch = JSON.stringify(vfx.particles) === JSON.stringify(oldVfx.particles);
        vfx.clearVfx();
        return { changedPixels, mismatches, particleMatch, oldCalls, calls, oldRenderMs, renderMs, oldQueryMs, queryMs };
      }, id);
      console.log(mobile ? 'mobile' : 'desktop', id, JSON.stringify(result));
      assert.equal(result.changedPixels, 0, id + ' must preserve all rendered pixels');
      assert.equal(result.mismatches, 0, id + ' target selection changed');
      assert.equal(result.particleMatch, true, id + ' particle simulation changed');
      if (id === 'hell') await shot('effects_perf_' + (mobile ? 'mobile' : 'desktop'));
    }
  } finally { report(errors); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
