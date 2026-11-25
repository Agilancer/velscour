// Raster sprites (util.js spriteCanvas/frozen: ImageBitmaps painted on the CPU, the desktop's frame-rate fix) must look
// like the plain canvases they replace. Two pages with the same seeded Math.random build the same scene, one with
// raster sprites and one with globalThis.VELSCOUR_NO_RASTER; the world is frozen (no update, a fixed clock, every
// creature's animation clock set), foes are stood round the hero fully spawned (one mid hit-flash), two fall as corpses,
// and a burst of gibs and bone gibs, blood (flying and splatted into the floor), glows and damage numbers is spawned the
// same way in both; the frame is drawn at a fixed clock. Prints how many pixels differ and by how much, and what was in
// view (fails if the foes, corpses or particles are missing); writes out/rasterlook_<scene>_{raster,canvas,diff}.png
// (diff: x8, grey = equal) and _crop.png (the middle of the screen at 3x, raster | canvas | diff). 'sharp': the fine
// detail (Laplacian energy) of this build's frame over the other's where they differ: below 1 is softer.
// Usage: node tools/tests/rasterlook.js [scenes,comma]
//   scene = town | a biome id | gear (a level 350 Paladin in Mythic +10 gear, catacombs), optionally
//   :zoom[:dpr[:WxH[:from]]] (zoom 0.7..1.6 = the mouse wheel's range; dpr 1/1.25/1.5 = Windows display scaling; WxH the
//   window, default 1600x900; from: the zoom the level is entered and drawn at first, then the wheel goes to zoom), e.g.
//   catacombs:0.7:1.5 or catacombs:1.6:1:1366x768:0.7
//   RL_BASE=http://localhost:8392: compare with another build served there (the baseline before raster sprites) instead
//   of this build with VELSCOUR_NO_RASTER; the frames are named _base instead of _canvas
//   RL_PURGE=1: critical memory pressure in this build's page (the one with raster sprites) once its caches have filled,
//   3 s before its frame is drawn: do the sprites the browser let go of come back looking the same? (files get _purge)
//   RL_FALLBACK=1: this build's page draws its raster sprites through util.js rasterFallback (plain canvas copies, the
//   safety valve main.js switches on when drawing collapses) (files get _fallback)
const fs = require('fs'), path = require('path');
const { openGame, OUT_DIR } = require('./harness');
const scenes = (process.argv[2] || 'town,catacombs,cathedral,castle,gear,catacombs:0.7,cathedral:0.7:1.25,gear:1.6:1.5,catacombs:0.7:1:1366x768,cathedral:1.6:1:1366x768:0.7,castle:0.7:1.25').split(',');
const RL_BASE = process.env.RL_BASE || '', RL_PURGE = process.env.RL_PURGE === '1', RL_FALLBACK = process.env.RL_FALLBACK === '1';
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = (process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=vulkan') + ' --enable-gpu --ignore-gpu-blocklist';

const seeded = (noRaster) => `(() => {
  let s = 0x9e3779b9; window.__reseed = (n) => { s = n; }; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  ${noRaster ? 'globalThis.VELSCOUR_NO_RASTER = true;' : ''}
})();`;

async function frame(spec, noRaster, url, purge, fallback) {
  const [scene, zoom, dpr, size, from] = spec.split(':'), [width, height] = (size || '1600x900').split('x').map(Number);
  const { browser, ctx, page, errors } = await openGame({ width, height, init: seeded(noRaster && !url), dpr: +dpr || 0, ...(url && { url }) });
  await page.evaluate(async ([scene, zoom, from]) => {
    const { G, game } = window.VELSCOUR;
    const until = (f) => new Promise((res) => { const t0 = performance.now(), k = () => (f() || performance.now() - t0 > 60000 ? res() : setTimeout(k, 100)); setTimeout(k, 200); });
    const loaded = () => document.querySelector('#loading').classList.contains('hidden');
    await game.newChar(scene === 'gear' ? 'paladin' : 'wizard', 'Look');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    // frozen: nothing moves or draws on its own, so nothing spends random numbers at a speed of its own (the title
    // screen's flames before this ran for however long the page took); the seed starts over before the level is built
    const render = game.render; game.render = () => {}; game.update = () => {};
    if (scene === 'gear') { const { grantDeathGift } = await import('/src/game/deathgift.js'); grantDeathGift(); await until(loaded); }
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { camera } = await import('/src/core/view.js');
    G.godMode = true; G.char.depth = 24;
    const z0 = from || zoom;   // from: enter and draw the level at one zoom (floor chunks, decoded art at that scale), then wheel
    if (z0) { G.settings.zoom = +z0; camera.computeZoom(); }
    window.__reseed(12345); G.char.townSeed = 4242;   // the hero's town layout was rolled at newChar, after the title screen's own draws
    if (scene === 'town') game.enterTown();
    else await game.teleportToBiome(BIOME_BY_ID[scene === 'gear' ? 'catacombs' : scene]);
    await until(loaded);
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    if (z0) { G.settings.zoom = +z0; camera.computeZoom(); }
    await new Promise((r) => setTimeout(r, 6000));   // art loads
    // full resolution in both (the baseline's adaptRes drops to 85% after every level load)
    if ((G.resScale || 1) !== 1) { G.resScale = 1; window.dispatchEvent(new Event('resize')); }
    if (from) { G.time = 100; for (let i = 0; i < 4; i++) render.call(game); G.settings.zoom = +zoom; camera.computeZoom(); }
    window.__reseed(777);
    const V = await import('/src/gfx/vfx.js'), p = G.player, w = G.world;
    // foes round the hero, fully spawned (a new monster grows in from nothing as update runs), standing still
    const foes = w.creatures.filter((m) => m !== p && m.team !== p.team && !m.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 7);
    const spots = [[1.6, -1.2], [2.6, 0.4], [1.2, 1.6], [-1.4, 1.8], [-2.2, -0.6], [0.4, -2.4], [3.2, -1.8]];
    foes.forEach((m, i) => { m.x = p.x + spots[i][0]; m.y = p.y + spots[i][1]; m.moving = false; m.awake = true; });
    for (const c of w.creatures) { c.spawnT = 99; c.animT = 1.25; c.alpha = c.alpha ?? 1; }
    if (foes[0]) foes[0].flash = 0.08;                                       // a hit flash (the white silhouette)
    // two corpses on the floor (their dark silhouettes) where the last two foes stood
    // (combat.js leaves a corpse only for a monster with a sprite; borrow the look of the nearest one that has one)
    const looks = w.creatures.filter((m) => m.sprite && m.team !== p.team);
    foes.slice(5).forEach((m, i) => {
      const k = m.sprite ? m : looks[i % Math.max(1, looks.length)];
      if (k) w.corpses.push({ x: m.x, y: m.y, sprite: k.sprite, pal: k.pal, art: k.art, swap: k.swap, artH: k.artH, px: k.px, scale: k.scale, flip: k.flip, t: 0.4, maxHp: k.maxHp, arch: k.arch, level: k.level, fly: k.fly });
      m.dead = true;
    });
    try { for (const m of foes.slice(0, 2)) V.gibs(m.x, m.y, 20, 18, '#9a1010', '#e8dcc0', 1.2); } catch (e) { console.error('gibs', e); }
    try { V.bloodSpray(p.x + 1, p.y, 20, 0.5, 24, '#9a1010'); for (let i = 0; i < 12; i++) V.addDecal(p.x + (i % 4) - 1.5, p.y + ((i / 4) | 0) - 1, '#7a0808', 1.2); } catch (e) { console.error('blood', e); }
    try { V.sparkle(p.x + 1, p.y, 20, '#60c0ff', 30, 0.6); V.sparkle(p.x - 1, p.y + 1, 20, '#ff8020', 30, 0.6); } catch (e) { console.error('sparkle', e); }
    try { V.damageText(p.x + 1.5, p.y - 1, 30, 12345, 'crit'); V.damageText(p.x - 1, p.y - 1, 30, 678, 'hit'); V.damageText(p.x, p.y + 1, 30, 90, 'dot', '#80ff60'); } catch (e) { console.error('text', e); }
    for (const q of V.particles) q.life = q.max * 0.6;   // part-way through, the same in both
    // flying particles a little way along their flight (positions from their own velocities: no update run)
    for (const q of V.particles) { q.x += (q.vx || 0) * 0.15; q.y += (q.vy || 0) * 0.15; q.z = Math.max(0, (q.z || 0) + (q.vz || 0) * 0.15); q.rot = (q.rot || 0) + (q.vr || 0) * 0.15; }
    G.time = 100;
    for (let i = 0; i < 4; i++) render.call(game);   // lazy caches (glows, rims, grit, numbers, floor chunks) fill on the first draws
    window.__shot = () => {
      G.time = 100; render.call(game);
      const inView = { foes: foes.slice(0, 5).filter((m) => m.sbox).length, corpses: w.corpses.length, particles: V.particles.length, bones: V.particles.filter((q) => q.bone).length, decals: V.bakedDecals.length, dpr: G.dpr, zoom: +camera.zoom.toFixed(2) };
      return { url: G.canvas.toDataURL('image/png'), inView };
    };
  }, [scene, zoom, from]);
  if (purge) { const cdp = await ctx.newCDPSession(page); await cdp.send('Memory.simulatePressureNotification', { level: 'critical' }); await new Promise((r) => setTimeout(r, 3000)); }
  if (fallback) await page.evaluate(async () => { (await import('/src/core/util.js')).rasterFallback(); });
  const out = await page.evaluate(() => window.__shot());
  // how many sprites it drew from canvas copies, so a run that changed nothing can't pass for one that did
  if (fallback) out.inView.copies = await page.evaluate(async () => (await import('/src/core/util.js')).rasterFallbackCopies());
  const errs = errors.slice();
  await browser.close();
  return { ...out, errs };
}

(async () => {
  let worst = 0, soft = 9, sharpest = 0, empty = [];
  for (const spec of scenes) {
    const tag = spec.replace(/:/g, '_') + (RL_PURGE ? '_purge' : '') + (RL_FALLBACK ? '_fallback' : '');
    const a = await frame(spec, false, '', RL_PURGE, RL_FALLBACK), b = await frame(spec, true, RL_BASE), other = RL_BASE ? 'base' : 'canvas';
    fs.writeFileSync(path.join(OUT_DIR, `rasterlook_${tag}_raster.png`), Buffer.from(a.url.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT_DIR, `rasterlook_${tag}_${other}.png`), Buffer.from(b.url.split(',')[1], 'base64'));
    if (a.inView.dpr !== b.inView.dpr || a.inView.zoom !== b.inView.zoom) empty.push(`${spec}: drawn at dpr/zoom ${a.inView.dpr}/${a.inView.zoom} vs ${b.inView.dpr}/${b.inView.zoom}`);
    // compare in a page: decode both, per-pixel max channel difference; a 3x crop of the middle, side by side
    const { browser, page } = await openGame({ width: 400, height: 300 });
    const r = await page.evaluate(async ([ua, ub]) => {
      const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
      const [ia, ib] = await Promise.all([load(ua), load(ub)]), w = ia.width, h = ia.height;
      const px = (i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0); return g.getImageData(0, 0, w, h).data; };
      const A = px(ia), B = px(ib), out = new ImageData(w, h), hist = [0, 0, 0, 0, 0];
      let mx = 0;
      for (let i = 0; i < A.length; i += 4) {
        const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
        mx = Math.max(mx, d); hist[d === 0 ? 0 : d <= 2 ? 1 : d <= 8 ? 2 : d <= 32 ? 3 : 4]++;
        const v = Math.min(255, 128 + d * 8 * Math.sign((A[i] + A[i + 1] + A[i + 2]) - (B[i] + B[i + 1] + B[i + 2]) || 1));
        out.data[i] = d ? v : 128; out.data[i + 1] = d ? (d > 32 ? 0 : v) : 128; out.data[i + 2] = d ? (d > 32 ? 0 : v) : 128; out.data[i + 3] = 255;
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(out, 0, 0);
      const cw = Math.round(w * 0.2), ch = Math.round(h * 0.3), cx = Math.round(w / 2 - cw / 2), cy = Math.round(h * 0.42 - ch / 2), Z = 3;
      const crop = document.createElement('canvas'); crop.width = cw * Z * 3 + 8; crop.height = ch * Z;
      const g = crop.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#fff'; g.fillRect(0, 0, crop.width, crop.height);
      [ia, ib, c].forEach((im, k) => g.drawImage(im, cx, cy, cw, ch, k * (cw * Z + 4), 0, cw * Z, ch * Z));
      const n = A.length / 4;
      // fine detail: Laplacian energy of the luminance where the frames differ (a pixel or its 4 neighbours), this build's
      // over the other's (1 = as sharp; below 1 softer), and over the whole frame
      const L = (D, i) => D[i] * 0.299 + D[i + 1] * 0.587 + D[i + 2] * 0.114, ne = (i) => A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2];
      let ea = 0, eb = 0, fa = 0, fb = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4, r = 4 * w;
        const la = 4 * L(A, i) - L(A, i - 4) - L(A, i + 4) - L(A, i - r) - L(A, i + r), lb = 4 * L(B, i) - L(B, i - 4) - L(B, i + 4) - L(B, i - r) - L(B, i + r);
        fa += la * la; fb += lb * lb;
        if (ne(i) || ne(i - 4) || ne(i + 4) || ne(i - r) || ne(i + r)) { ea += la * la; eb += lb * lb; }
      }
      return { sharp: eb ? (ea / eb).toFixed(4) : '1.0000', sharpAll: fb ? (fa / fb).toFixed(4) : '1.0000', max: mx, same: (100 * hist[0] / n).toFixed(2), le2: (100 * hist[1] / n).toFixed(2), le8: (100 * hist[2] / n).toFixed(3), le32: (100 * hist[3] / n).toFixed(3), gt32: (100 * hist[4] / n).toFixed(3), diff: c.toDataURL('image/png'), crop: crop.toDataURL('image/png') };
    }, [a.url, b.url]);
    await browser.close();
    const sfx = RL_BASE ? '_vsbase' : '';
    fs.writeFileSync(path.join(OUT_DIR, `rasterlook_${tag}${sfx}_diff.png`), Buffer.from(r.diff.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT_DIR, `rasterlook_${tag}${sfx}_crop.png`), Buffer.from(r.crop.split(',')[1], 'base64'));
    const v = a.inView, town = spec.startsWith('town');
    const missing = (town ? [] : [v.foes < 3 && 'foes', v.corpses < 2 && 'corpses', v.bones < 5 && 'bone gibs']).concat([v.particles < 20 && 'particles']).filter(Boolean);
    if (missing.length) empty.push(`${spec}: ${missing.join(', ')}`);
    console.log(`${spec.padEnd(20)} sharp ${r.sharp} (changed px) ${r.sharpAll} (frame)  identical ${r.same}%  <=2: ${r.le2}%  <=8: ${r.le8}%  <=32: ${r.le32}%  >32: ${r.gt32}%  max ${r.max}   in view ${JSON.stringify(v)}` + (a.errs.length || b.errs.length ? `  ERRORS ${[...a.errs, ...b.errs].filter((e) => !/404/.test(e)).slice(0, 3).join(' | ')}` : ''));
    worst = Math.max(worst, +r.gt32); soft = Math.min(soft, +r.sharp); sharpest = Math.max(sharpest, +r.sharp);
  }
  if (empty.length) { console.log('FAIL: missing from the frame: ' + empty.join('; ')); process.exitCode = 1; }
  console.log(worst > 0.5 ? 'CHECK: some frames differ by more than 32 levels on over 0.5% of pixels (look at the diff shots)' : 'LOOKS THE SAME (within resampling noise)');
  console.log(`fine detail where the frames differ, this build / the other: ${soft.toFixed(4)} .. ${sharpest.toFixed(4)}` + (soft < 0.99 || sharpest > 1.01 ? '  CHECK: more than 1% softer or sharper somewhere' : ''));
  if (worst > 0.5) process.exitCode = 1;
})();
