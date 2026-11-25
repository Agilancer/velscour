// Desktop frame rate with the frame cap off: how many frames a second the game can make on this PC's GPU, not what
// the display's refresh lets through. Chromium runs with vsync and its frame-rate limit off, the page on the real GPU
// (d3d11 on Windows, unless CHROMIUM_ARGS says otherwise), a desktop window, auto-play playing. Per scene: fps, the
// frame-time spread (median, 95th/99th percentile, worst), CPU ms in game.update and game.render, and with PROFILE=1
// the functions that cost the most (self time, render and update together).
// Usage: node tools/tests/fps.js [scenes,comma] [secs] [WxH]
//   scenes: reload (a fresh page in the same browser, e.g. stress,reload,stress), purge (critical memory pressure in
//   every process: the browser's caches let go), town, a biome id (catacombs, cathedral, castle, dark_forest, sea_of_sand, overworld...), raid (a depth 30
//   BOSS ROOM), peak (a level 100 Wizard deep in a dungeon with 40 extra foes on him), peaknecro (the same with a
//   Necromancer's army), stress (a fixed load, the same in any build: full resolution held, the world frozen, 40 foes and 20 minions round the
//   hero, 1,600 Sigil-fire flames + 300 glows + blood, smoke, gibs and numbers from a private seed), keep (Tessariel's
//   Keep with all twelve companions: a hero of every other class is saved first), keepwalk (the same, the hero walking
//   the stair, the balconies and the terrace round and round; auto-play stays off in both), 'all' = a sample of everything
//   CLASS=necromancer for the hero of the plain scenes (default wizard), GIFT=1 makes him level 100 with the best gear,
//   VSYNC=1 keeps the frame cap (upd/rnd are then plain CPU cost, not waits on a saturated GPU process)
//   SEED=n (default 1; 0 = off) seeds Math.random so two runs (before/after a change) build the same levels and crowds
//   HEADED=1 (with VSYNC=1) runs in a real window at the display's refresh. late = frames over 1.5x the median frame
//   (with vsync: a missed refresh); 1% / 0.1% low = 1000 / the 99th / 99.9th percentile frame
//   SLOW=1 lists the slowest update/render calls; on screen: the particles and effects drawn, the foes awake in view
//   MEM=1 (Windows) after each scene: the JS heap, the renderer's and the GPU process's private memory, and the GPU
//   process's dedicated video memory (raster sprites keep their pixels in the renderer as well as on the GPU)
//   NORASTER=1: plain canvases for sprites in this build; PROBE=file.js: a script run in the page before the game, and
//   after each scene window.__probe()'s value is printed (e.g. tools/tests/out/probe_draw.js: drawImage time by source)
//   MOBILE=1: a phone instead (844x390 unless WxH, DPR 2, touch: the phone path, plain canvases for sprites), and
//   THROTTLE=n slows the CPU n times while measuring (4 = perf.js's phone proxy), here on the real GPU, not SwiftShader
const { openGame, report } = require('./harness');
const { execFileSync } = require('child_process');
const fs = require('fs');
async function osMem(browser, page) {
  const s = await browser.newBrowserCDPSession(), { processInfo } = await s.send('SystemInfo.getProcessInfo'); await s.detach();
  const heap = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0)), by = {};
  for (const pr of processInfo.filter((q) => /renderer|gpu/i.test(q.type))) {
    const ps = `$p = Get-Process -Id ${pr.id}; $v = (Get-Counter '\\GPU Process Memory(pid_${pr.id}_*)\\Dedicated Usage' -ErrorAction SilentlyContinue).CounterSamples | Measure-Object CookedValue -Sum; "$($p.PrivateMemorySize64) $($v.Sum)"`;
    try {
      const [priv, vram] = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim().split(' ').map(Number);
      const o = (by[/gpu/i.test(pr.type) ? 'gpu' : 'renderer'] ||= { priv: 0, vram: 0 }); o.priv += priv || 0; o.vram += vram || 0;
    } catch (e) { /* the process is gone */ }
  }
  const mb = (v) => ((v || 0) / 1048576).toFixed(0);
  return `heap ${mb(heap)} MB | renderer ${mb(by.renderer?.priv)} MB | gpu process ${mb(by.gpu?.priv)} MB + ${mb(by.gpu?.vram)} MB video`;
}
if (!process.env.CHROMIUM_ARGS) process.env.CHROMIUM_ARGS = (process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=vulkan') + ' --enable-gpu --ignore-gpu-blocklist';
if (process.env.VSYNC !== '1') process.env.CHROMIUM_ARGS += ' --disable-gpu-vsync --disable-frame-rate-limit'; // VSYNC=1: capped at the refresh, CPU ms without GPU back-pressure
const DEF = 'town,catacombs,cathedral,overworld,castle,dark_forest,sea_of_sand,raid,peak,peaknecro,stress';
let scenes = (process.argv[2] || 'all').split(',').filter(Boolean).flatMap((s) => (s === 'all' ? DEF.split(',') : [s]));
const MOBILE = process.env.MOBILE === '1', THROTTLE = +(process.env.THROTTLE || 0);
const secs = +(process.argv[3] || 6), [W, H] = (process.argv[4] || (MOBILE ? '844x390' : '1920x1080')).split('x').map(Number);
const PROFILE = process.env.PROFILE === '1', TRACE = process.env.TRACE === '1';

(async () => {
  const SEED = +(process.env.SEED ?? 1);
  const seed = SEED ? `(() => { let s = ${SEED} >>> 0; Math.random = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();` : '';
  // NORASTER=1: this build with plain canvases for sprites (util.js rasterSprites off), for A/Bs inside one build
  const init = (seed + (process.env.NORASTER === '1' ? 'globalThis.VELSCOUR_NO_RASTER = true;' : '') + (process.env.PROBE ? fs.readFileSync(process.env.PROBE, 'utf8') : '')) || undefined;
  const { browser, ctx, page, errors } = await openGame({ width: W, height: H, init, mobile: MOBILE });
  const gpu = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  console.log(`GPU: ${gpu}  window ${W}x${H}${MOBILE ? ' phone (touch, DPR 2)' : ''}${THROTTLE ? `, ${THROTTLE}x CPU throttle while measuring` : ''}`);
  const cdp = await ctx.newCDPSession(page);
  if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); }
  const summary = [];
  for (const scene of scenes) {
    if (scene === 'reload') {   // a fresh page in the same browser (the seeded Math.random runs again first)
      await page.reload();
      await page.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 30000 });
      console.log('-- reload: a fresh page, same browser');
      continue;
    }
    if (scene === 'purge') {    // critical memory pressure in every process: Chromium drops what its caches hold
      try { await cdp.send('Memory.simulatePressureNotification', { level: 'critical' }); console.log('-- purge: critical memory pressure sent'); }
      catch (e) { console.log('-- purge failed: ' + e.message); }
      await page.waitForTimeout(1500);
      continue;
    }
    if (scene === 'fallback') {  // util.js rasterFallback by hand: raster sprites drawn from plain canvas copies
      const r = await page.evaluate(async () => { const u = await import('/src/core/util.js'); if (!u.rasterFallback) return 'n/a'; u.rasterFallback(); return u.rasterFallbackOn() ? 'on' : 'off'; });
      console.log('-- fallback: ' + r);
      continue;
    }
    const ok = await page.evaluate(async ([scene, cls, gift]) => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { Auto } = await import('/src/game/autoplay.js');
      if (Auto.on) Auto.toggle(false);
      if (window.__fpsUpd) { game.update = window.__fpsUpd; window.__fpsUpd = null; delete G.resScale; G.resScale = 1; }   // the stress scene froze them
      if (window.__fpsWalk) { clearInterval(window.__fpsWalk); window.__fpsWalk = null; }   // keepwalk's route
      const until = (f) => new Promise((res) => { const t0 = performance.now(), k = () => (f() || performance.now() - t0 > 60000 ? res() : setTimeout(k, 100)); setTimeout(k, 200); });
      const loaded = () => document.querySelector('#loading').classList.contains('hidden');
      const peak = scene.startsWith('peak'), stress = scene === 'stress';
      const want = peak ? (scene === 'peaknecro' ? 'necromancer' : 'wizard') : cls;
      if (!G.char || G.char.classId !== want) {
        await game.newChar(want, 'Fps');
        document.querySelectorAll('.screen').forEach((s) => s.remove());
        G.ui.modalCount = 0;
        if (peak || gift) { const { grantDeathGift } = await import('/src/game/deathgift.js'); grantDeathGift(); await until(loaded); }
      }
      G.godMode = true;
      const depth = peak ? 60 : 24;
      G.char.depth = depth;
      if (G.world && (G.world.kind !== 'town' || G.world.keep)) { game.enterTown(); await until(loaded); }
      if (scene === 'town') { if (G.world.kind !== 'town') { game.enterTown(); await until(loaded); } }
      else if (scene === 'keep' || scene === 'keepwalk') {
        // Tessariel's Keep with a full roster: a hero of every other class on this browser, in Legendary armour and
        // Epic arms, so the hall shows its twelve companions; keepwalk walks the hero up the grand stair to the north
        // balcony, round the east terrace, along the west balcony and back to the Flame, over and over
        if (!window.__fpsKeepHeroes) {
          const { newCharData, writeSave } = await import('/src/game/save.js');
          const { rollItem } = await import('/src/data/items.js');
          const { CLASSES } = await import('/src/data/classes.js');
          const ids = (Array.isArray(CLASSES) ? CLASSES.map((k) => k.id) : Object.keys(CLASSES)).filter((id) => id !== G.char.classId);
          ids.forEach((cls, i) => {
            const c = newCharData(cls, 'Fps ' + i), lvl = 20 + (i * 7) % 80;
            c.level = lvl; c.deepest = lvl + 10; c.kills = lvl * 400; c.lastPlayed = Date.now() - 1000 * (i + 1);
            for (const [slot, rarity] of [['body', 4], ['head', 4], ['hands', 3], ['legs', 3], ['feet', 3], ['weapon', 3], ['offhand', 3]]) c.equip[slot] = rollItem(lvl, { slot, rarity });
            writeSave(c);
          });
          window.__fpsKeepHeroes = true;
        }
        await game.enterKeep(); await until(loaded);
        if (scene === 'keepwalk') {
          const route = [[21, 7.4], [34.6, 21], [7, 20], [21, 26]];
          let k = 0;
          G.player.setMoveTarget(...route[0]);
          window.__fpsWalk = setInterval(() => {
            const p = G.player, [x, y] = route[k % route.length];
            if (Math.hypot(p.x - x, p.y - y) < 0.8 || !p.moveTarget) { k++; p.setMoveTarget(...route[k % route.length]); }
          }, 250);
        }
      }
      else if (scene === 'raid') { G.char.depth = 30; await game.teleportToBiome(BIOME_BY_ID.cathedral); }
      else if (peak || stress) await game.teleportToBiome(BIOME_BY_ID.catacombs);
      else if (BIOME_BY_ID[scene]) await game.teleportToBiome(BIOME_BY_ID[scene]);
      else return false;
      await until(loaded);
      document.querySelectorAll('.screen').forEach((s) => s.remove());
      G.ui.modalCount = 0;
      if (peak) {
        // a crowd round the hero: 40 more foes from the level's own roster, awake
        const w = G.world, p = G.player, base = w.creatures.filter((m) => m.team !== p.team && !m.boss);
        const { makeMonster } = await import('/src/game/monster.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const archs = [...new Set(base.map((m) => m.archId || m.arch).filter(Boolean))];
        let n = 0;
        for (let i = 0; i < 600 && n < 40 && archs.length; i++) {
          const a = Math.random() * 6.283, r = 3 + Math.random() * 6, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
          if (!w.map.walkable(x, y)) continue;
          try { const m = w.add(makeMonster(w, archs[i % archs.length], w.biome, depthLevel(G.char.depth), 'normal', x, y, 0)); m.awake = true; n++; } catch (e) { if (!i) console.warn(e); }
        }
        G.fpsCrowd = n;
      }
      if (stress) {
        // the same load in any build: nothing updates (game.update stubbed, the clock still runs the animations), the
        // crowd and the particles come from a private seed, and the particles never age
        window.__fpsUpd = game.update; game.update = () => {};
        const w = G.world, p = G.player, V = await import('/src/gfx/vfx.js');
        // the hero's summons from an earlier stress run follow him through the portal (game.js keeps lasting summons):
        // drop them, or every repeat would add 20 more (run k carried 20k)
        if (w.creatures.some((c) => c.summon && c.owner === p)) { w.creatures = w.creatures.filter((c) => !(c.summon && c.owner === p)); w.rebuildGrid(); }
        const { makeMonster, buildSummon } = await import('/src/game/monster.js');
        const { depthLevel } = await import('/src/data/depth.js');
        const { SUMMONS } = await import('/src/data/summons.js');
        let sd = 4242; const r = () => ((sd = (Math.imul(sd ^ (sd >>> 15), 2654435761) + 0x9e3779b9) | 0) >>> 0) / 4294967296;
        const ring = (k, n, r0, r1) => { const a = (k / n) * 6.283 + r() * 0.3, d = r0 + r() * (r1 - r0); return [p.x + Math.cos(a) * d, p.y + Math.sin(a) * d]; };
        const archs = [...new Set(w.creatures.filter((m) => m.team !== p.team && !m.boss).map((m) => m.archId || m.arch).filter(Boolean))].sort();
        let nf = 0, ns = 0;
        for (let i = 0; i < 600 && nf < 40 && archs.length; i++) { const [x, y] = ring(i, 40, 2.5, 8); if (!w.map.walkable(x, y)) continue; try { w.add(makeMonster(w, archs[nf % archs.length], w.biome, depthLevel(G.char.depth), 'normal', x, y, 0)); nf++; } catch (e) { /* skip */ } }
        const keys = ['skeleton', 'skelarcher', 'crossbowman', 'berserker', 'gravedigger'].filter((k) => SUMMONS[k]);
        for (let i = 0; i < 300 && ns < 20 && keys.length; i++) { const [x, y] = ring(i, 20, 1, 3); if (!w.map.walkable(x, y)) continue; const k = keys[ns % keys.length]; w.add(buildSummon(p, SUMMONS[k], k, x, y, 10, 100, 0)); ns++; }
        for (const c of w.creatures) { c.spawnT = 99; c.awake = true; }
        V.clearVfx();
        const put = (q, f) => { const o = V.spawn(q); o.life = o.max * f; };
        const cols = ['#60c0ff', '#ff8020', '#c070ff', '#80ff60', '#ffffff', '#ffc050'];
        for (let i = 0; i < 1600; i++) { const [x, y] = ring(i, 1600, 0.4, 3.6); put({ type: 'flame', x, y, z: r() * 40, life: 0.3, size: 2.2 + r() * 1.6, size1: 0.3, add: true }, 0.15 + r() * 0.8); }
        for (let i = 0; i < 300; i++) { const [x, y] = ring(i, 300, 0.5, 6); put({ type: 'glow', x, y, z: r() * 60, life: 1, size: 1 + r() * 3, size1: 0.2, color: cols[i % cols.length], add: true }, 0.2 + r() * 0.7); }
        for (let i = 0; i < 150; i++) { const [x, y] = ring(i, 150, 0.5, 5); put({ type: 'blood', x, y, z: r() * 30, life: 1, size: 1 + r() * 2, color: '#9a1010' }, 0.3 + r() * 0.6); }
        for (let i = 0; i < 40; i++) { const [x, y] = ring(i, 40, 1, 6); put({ type: 'smoke', x, y, z: 10 + r() * 30, life: 3, size: 4 + r() * 4, size1: 15 + r() * 8, color: '#3b3733', alpha: 0.26 }, 0.3 + r() * 0.6); }
        for (let i = 0; i < 12; i++) { const [x, y] = ring(i, 12, 0.5, 3); V.addDecal(x, y, '#7a0808', 1.2); }
        for (let i = 0; i < 3; i++) { const [x, y] = ring(i, 3, 1, 2.5); V.gibs(x, y, 20, 18, '#9a1010', '#e8dcc0', 1.2); }
        for (let i = 0; i < 20; i++) { const [x, y] = ring(i, 20, 0.5, 4); V.damageText(x, y, 30, Math.floor(r() * 99999), i % 5 ? 'hit' : 'crit'); }
        G.fpsCrowd = nf + '+' + ns;
        // and at full resolution, held there (a baseline build's adaptRes drops to 85% after the level load and again
        // whenever a 2 s window runs under 50 fps): the same pixels in any build
        Object.defineProperty(G, 'resScale', { configurable: true, enumerable: true, get: () => 1, set() {} });
        window.dispatchEvent(new Event('resize'));
        window.__vfx = V;
        return true;
      }
      if (!scene.startsWith('keep')) Auto.toggle(true);   // in the keep auto-play would leave by the portal home
      window.__vfx = await import('/src/gfx/vfx.js');
      return true;
    }, [scene, process.env.CLASS || 'wizard', process.env.GIFT === '1']).catch((e) => { console.log(scene, 'setup failed', e.message); return false; });
    if (!ok) { console.log(scene, ': unknown or failed'); continue; }
    await page.waitForTimeout(3500);   // auto-play gets going, the art warms
    if (PROFILE) await cdp.send('Profiler.start');
    if (TRACE) await browser.startTracing(page, { categories: (process.env.TRACE_CATS || 'toplevel,__metadata').split(',') });
    if (THROTTLE) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    const r = await page.evaluate((secs) => new Promise((res) => {
      const { G, game } = window.VELSCOUR, u = game.update, rd = game.render, s = { u: 0, r: 0, n: 0, nu: 0, gaps: [] };
      game.update = function (dt) { const t = performance.now(); u.call(this, dt); const d = performance.now() - t; s.u += d; s.nu++; if (d > 8) (s.su ||= []).push(+d.toFixed(1)); };
      game.render = function () { const t = performance.now(); rd.call(this); const d = performance.now() - t; s.r += d; s.n++; if (d > 8) (s.sr ||= []).push(+d.toFixed(1)); };
      let last = performance.now(), go = true;
      const V = window.__vfx, seen = { p: 0, e: 0, m: 0, k: 0 };
      const raf = (t) => {
        s.gaps.push(t - last); last = t;
        if (V && s.gaps.length % 10 === 0) { // what was on screen: particles live, effects, foes awake within ~12 tiles
          const p = G.player; seen.k++; seen.p += V.particles.length; seen.e += V.effects.length + ((G.world && G.world.projectiles) || []).length;
          seen.m += G.world.creatures.filter((m) => m.team !== p.team && !m.dead && m.awake && Math.abs(m.x - p.x) + Math.abs(m.y - p.y) < 12).length;
        }
        if (go) requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      const t0 = performance.now();
      setTimeout(() => {
        go = false; game.update = u; game.render = rd;
        const w = G.world, g = s.gaps.slice(2).sort((a, b) => a - b), q = (f) => g[Math.min(g.length - 1, Math.floor(g.length * f))] || 0;
        res({ fps: s.n / ((performance.now() - t0) / 1000), upd: s.u / Math.max(1, s.nu), rnd: s.r / Math.max(1, s.n), p50: q(0.5), p95: q(0.95), p99: q(0.99), p999: q(0.999), worst: g[g.length - 1] || 0,
          late: g.filter((v) => v > q(0.5) * 1.5).length / Math.max(1, g.length),
          slowU: (s.su || []).sort((a, b) => b - a).slice(0, 8), slowR: (s.sr || []).sort((a, b) => b - a).slice(0, 8), mobs: w.creatures.length, awake: Math.round(seen.m / Math.max(1, seen.k)), fx: Math.round(seen.e / Math.max(1, seen.k)), parts: Math.round(seen.p / Math.max(1, seen.k)), dpr: G.dpr.toFixed(2), kind: w.kind + (w.biome ? ':' + w.biome.id : '') });
      }, secs * 1000);
    }), secs);
    if (THROTTLE) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    let top = [];
    if (TRACE) {
      // how busy each process's main threads were over the window (top-level tasks): is the GPU process the bottleneck?
      const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents, names = {}, busy = {}, span = [Infinity, 0], gpuTop = {}, mainTop = {};
      for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') names[e.pid + ':' + e.tid] = e.args.name;
      for (const e of ev) {
        if (e.ph !== 'X' || !e.dur) continue;
        const k = e.pid + ':' + e.tid, n = names[k] || '?';
        if (e.cat === 'toplevel' && /RunTask|ProcessTask/.test(e.name)) { busy[n] = (busy[n] || 0) + e.dur; span[0] = Math.min(span[0], e.ts); span[1] = Math.max(span[1], e.ts + e.dur); }
        if (n === 'CrRendererMain' && /devtools\.timeline|v8/.test(e.cat)) mainTop[e.name] = (mainTop[e.name] || 0) + e.dur;
        if (n === 'CrGpuMain' && e.cat !== 'toplevel' && !/^(Scheduler::RunTask|GpuChannel::ExecuteDeferredRequest|RendererMainThread|CommandBuffer::Flush|CommandBufferStub::OnAsyncFlush|CommandBufferService:PutChanged|ThreadControllerImpl::RunTask)$/.test(e.name)) gpuTop[e.name] = (gpuTop[e.name] || 0) + e.dur;
      }
      const T = span[1] - span[0];
      top.push('busy: ' + Object.entries(busy).filter(([n]) => /CrGpuMain|CrRendererMain|VizCompositor|Compositor$/.test(n)).map(([n, v]) => `${n} ${(100 * v / T).toFixed(0)}%`).join('  '));
      if (Object.keys(mainTop).length) top.push('renderer main: ' + Object.entries(mainTop).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([n, v]) => `${n} ${(100 * v / T).toFixed(1)}%`).join('  '));
      top.push('gpu main: ' + Object.entries(gpuTop).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([n, v]) => `${n} ${(100 * v / T).toFixed(0)}%`).join('  '));
    }
    if (PROFILE) {
      const { profile } = await cdp.send('Profiler.stop');
      const self = {}, byId = {}, parent = {}, callers = {};
      profile.nodes.forEach((n) => { byId[n.id] = n; (n.children || []).forEach((c) => { parent[c] = n.id; }); });
      const nm = (f) => `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
      let tot = 0;
      profile.samples.forEach((id, i) => {
        const f = byId[id].callFrame, d = profile.timeDeltas[i] || 0; tot += d; const k = nm(f); self[k] = (self[k] || 0) + d;
        if (!f.url && f.functionName) {   // a native call (canvas): who called it, three deep
          const st = []; for (let p = parent[id]; p !== undefined && st.length < 4; p = parent[p]) st.push(nm(byId[p].callFrame).replace(/ \S*\//, ' '));
          const c = (callers[k] ||= {}), ck = st.join(' < '); c[ck] = (c[ck] || 0) + d;
        }
      });
      top = Object.entries(self).filter(([k]) => !/^\((idle|program)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => {
        const c = callers[k] ? '\n' + Object.entries(callers[k]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, w]) => `          ${(100 * w / tot).toFixed(1).padStart(5)}% < ${s}`).join('\n') : '';
        return `${(100 * v / tot).toFixed(1).padStart(5)}% ${k}` + ((100 * v / tot) > 3 ? c : '');
      });
    }
    const line = `${scene.padEnd(12)} ${r.kind.padEnd(24)} ${r.fps.toFixed(0).padStart(4)} fps  p50 ${r.p50.toFixed(1).padStart(5)}  p95 ${r.p95.toFixed(1).padStart(5)}  p99 ${r.p99.toFixed(1).padStart(5)}  worst ${r.worst.toFixed(0).padStart(4)} ms  1% low ${(1000 / r.p99).toFixed(0).padStart(3)}  0.1% low ${(1000 / r.p999).toFixed(0).padStart(3)}  late ${(100 * r.late).toFixed(1).padStart(4)}%  upd ${r.upd.toFixed(2).padStart(5)}  rnd ${r.rnd.toFixed(2).padStart(5)}  mobs ${r.mobs} awake ${r.awake} fx ${r.fx} parts ${r.parts} dpr ${r.dpr}`;
    // SLOW=1: the slowest update/render calls (ms) in the window: a 1% low spike in the JS, or not (then the GPU's)
    const slow = process.env.SLOW === '1' ? `\n   slow update ms ${JSON.stringify(r.slowU)}  slow render ms ${JSON.stringify(r.slowR)}` : '';
    const mem = process.env.MEM === '1' ? '\n   memory: ' + await osMem(browser, page).catch((e) => 'n/a ' + e.message) : '';
    const probe = process.env.PROBE ? '\n   probe: ' + await page.evaluate(() => (window.__probe ? JSON.stringify(window.__probe()) : 'none')).catch((e) => e.message) : '';
    // main.js rasterWatch switched raster sprites to canvas copies (util.js rasterFallback)?
    const fb = await page.evaluate(async () => { const u = await import('/src/core/util.js'); return !!(u.rasterFallbackOn && u.rasterFallbackOn()); }).catch(() => false);
    console.log(line + (fb ? '  [raster fallback]' : '') + slow + mem + probe + (top.length ? '\n   ' + top.join('\n   ') : ''));
    summary.push(line + (fb ? '  [raster fallback]' : ''));
  }
  console.log('\nSUMMARY\n' + summary.join('\n'));
  report(errors, 10);
  await browser.close();
})();
