// Long-session probe: does the game get slower or bigger the longer it runs? A new hero auto-plays on a phone-sized
// touch screen (844x390, DPR 2) with a frame drawn every other update, and every game minute the probe prints the
// JS heap after a forced GC, live canvases, DOM nodes, live timers, the biggest arrays/maps reachable from G and the
// median cost of a frame.
//   node tools/tests/longrun.js [class] [game minutes] [renderEvery]     (defaults: wizard 30 2)
//   LR_FAIL=1.6 ...   fail when the late frame cost or heap is over 1.6x the early one (default: report only)
const { openGame, report } = require('./harness');
const cls = process.argv[2] || 'wizard', minutes = +(process.argv[3] || 30), every = +(process.argv[4] || 2);

(async () => {
  const { browser, ctx, page, errors, shot } = await openGame({ width: 844, height: 390, mobile: true });
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => {
    // count canvases made and timers alive
    const w = window; w.__lr = { canv: 0, off: 0, iv: new Set(), to: 0 };
    const ce = document.createElement.bind(document);
    w.__lr.by = new Map(); w.__lr.refs = [];
    document.createElement = (t, o) => {
      if (String(t).toLowerCase() === 'canvas') {
        w.__lr.canv++;
        const st = (new Error().stack || '').split('\n').slice(2, 4).map((l) => l.replace(/.*\/src\//, '').replace(/\)$/, '').replace(/:\d+$/, '')).join(' < ');
        w.__lr.by.set(st, (w.__lr.by.get(st) || 0) + 1);
        const c = ce(t, o); w.__lr.refs.push([new WeakRef(c), st]); return c;
      }
      return ce(t, o);
    };
    if (w.OffscreenCanvas) { const O = w.OffscreenCanvas; w.OffscreenCanvas = function (a, b) { w.__lr.off++; return new O(a, b); }; w.OffscreenCanvas.prototype = O.prototype; }
    const si = w.setInterval, ci = w.clearInterval;
    w.setInterval = (f, t, ...a) => { const id = si(f, t, ...a); w.__lr.iv.add(id); return id; };
    w.clearInterval = (id) => { w.__lr.iv.delete(id); ci(id); };
  });
  await page.evaluate(async (cls) => {
    await window.VELSCOUR.game.newChar(cls, 'Longrun');
    const { Auto } = await import('/src/game/autoplay.js');
    window.VELSCOUR.G.autoOpenSeals = true;
    Auto.toggle(true);
  }, cls);
  await page.waitForTimeout(800);
  const count = async (proto) => {
    const p = await cdp.send('Runtime.evaluate', { expression: proto, objectGroup: 'probe' });
    const q = await cdp.send('Runtime.queryObjects', { prototypeObjectId: p.result.objectId, objectGroup: 'probe' });
    const n = await cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function(){let px=0;for(const c of this)px+=(c.width||0)*(c.height||0);return this.length+"/"+(px*4/1048576).toFixed(0)+"MB"}', returnByValue: true });
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'probe' }); // (an unreleased result keeps every object it found alive)
    return n.result.value;
  };
  const rows = [];
  for (let min = 1; min <= minutes; min++) {
    const res = await page.evaluate(async (every) => {
      const { G, game } = window.VELSCOUR;
      let sim = 0, k = 0;
      const t0 = performance.now();
      while (sim < 60) {
        for (let i = 0; i < 10; i++) {
          if (G.mode !== 'game' || !G.world) break;
          G.dt = 1 / 30; G.time += G.dt; G.frame++;
          game.update(1 / 30); sim += 1 / 30;
          if (++k % every === 0) game.render();
          G.input && G.input.endFrame && G.input.endFrame();
        }
        await new Promise((r) => setTimeout(r, 0));
        if (performance.now() - t0 > 120000) break;
      }
      // median frame cost of the scene as it stands
      const ts = [];
      for (let i = 0; i < 25; i++) { const a = performance.now(); G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); const b = performance.now(); game.render(); ts.push([b - a, performance.now() - b]); }
      const med = (j) => ts.map((t) => t[j]).sort((x, y) => x - y)[12];
      // the biggest collections reachable from G (depth-limited walk)
      const big = [], seen = new WeakSet();
      const walk = (o, path, d) => {
        if (!o || typeof o !== 'object' || seen.has(o) || d > 5) return;
        if (o instanceof Node || o instanceof CanvasRenderingContext2D || ArrayBuffer.isView(o) || o instanceof HTMLImageElement || (window.ImageBitmap && o instanceof ImageBitmap)) return;
        seen.add(o);
        const n = Array.isArray(o) ? o.length : (o instanceof Map || o instanceof Set) ? o.size : 0;
        if (n > 200) big.push([path, n]);
        if (Array.isArray(o)) { for (let i = 0; i < Math.min(o.length, 40); i++) walk(o[i], path + '[' + i + ']', d + 1); return; }
        if (o instanceof Map) { let i = 0; for (const [kk, v] of o) { if (i++ > 40) break; walk(v, path + '{' + String(kk).slice(0, 20) + '}', d + 1); } return; }
        if (o instanceof Set) return;
        for (const kk of Object.keys(o)) { try { walk(o[kk], path + '.' + kk, d + 1); } catch (e) { /* getter */ } }
      };
      walk(G, 'G', 0);
      big.sort((a, b) => b[1] - a[1]);
      const w = G.world;
      return { sim: Math.round(sim), real: Math.round(performance.now() - t0), where: w ? (w.kind === 'town' ? 'town' : `${(w.biome && w.biome.id) || w.biome || ''}:D${w.depth}`) : '-', lvl: G.char.level,
        upd: med(0), rnd: med(1), dom: document.getElementsByTagName('*').length, canv: window.__lr.canv, off: window.__lr.off, iv: window.__lr.iv.size,
        res: G.resScale || 1, live: (() => {
          // live canvas memory by the code that made it
          const m = new Map(), keep = [];
          for (const r of window.__lr.refs) { const c = r[0].deref(); if (!c) continue; keep.push(r); const e = m.get(r[1]) || [0, 0]; e[0]++; e[1] += c.width * c.height * 4; m.set(r[1], e); }
          window.__lr.refs = keep;
          return [...m].sort((a, b) => b[1][1] - a[1][1]).slice(0, 10).map(([k, [n, b]]) => `${(b / 1048576).toFixed(1)}MB/${n} ${k}`).join('\n       ');
        })(), by: [...window.__lr.by].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => n + ' ' + k).join('\n       '), big: big.slice(0, 12).map(([p, n]) => `${p}=${n}`).join(' ') };
    }, every);
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576;
    const liveCanv = await count('HTMLCanvasElement.prototype'), liveOff = await count('OffscreenCanvas.prototype').catch(() => 0);
    const liveBmp = await count('ImageBitmap.prototype').catch(() => 0), liveImg = await count('HTMLImageElement.prototype');
    rows.push({ min, heap, ...res, liveCanv, liveOff });
    console.log(`[${min}m] ${res.where} L${res.lvl} upd ${res.upd.toFixed(1)} rnd ${res.rnd.toFixed(1)} ms | heap ${heap.toFixed(0)} MB | canvases live ${liveCanv}+${liveOff}off (made ${res.canv}+${res.off}) bmp ${liveBmp} img ${liveImg} | dom ${res.dom} iv ${res.iv} | ${res.real} ms real`);
    console.log(`     ${res.big}`);
    if (min % 5 === 0) console.log(`     canvas makers:\n       ${res.by}\n     live canvas memory by maker:\n       ${res.live}`);
    if (min % 10 === 0) await shot(`longrun_${cls}_m${min}`);
  }
  const avg = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
  const early = rows.slice(1, 4), late = rows.slice(-3);
  if (early.length && late.length) {
    const nc = (r) => parseInt(r.liveCanv), f = { rnd: avg(late, 'rnd') / avg(early, 'rnd'), upd: avg(late, 'upd') / avg(early, 'upd'), heap: avg(late, 'heap') / avg(early, 'heap'), canv: late.reduce((s2, r) => s2 + nc(r), 0) / Math.max(1, early.reduce((s2, r) => s2 + nc(r), 0)) };
    console.log(`late/early: render x${f.rnd.toFixed(2)} update x${f.upd.toFixed(2)} heap x${f.heap.toFixed(2)} canvases x${f.canv.toFixed(2)}`);
    const lim = +process.env.LR_FAIL;
    if (lim && (f.rnd > lim || f.upd > lim || f.heap > lim)) { console.log('FAIL: the game grew slower or bigger over the run'); process.exitCode = 1; }
  }
  report(errors, 20);
  await browser.close();
})();
