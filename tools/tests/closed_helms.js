// Grim Nocturne helmet QA (assets/sprites/gear/helmets/, tools/nocturnegear.py): every enclosed helmet on every one
// of the class's 12 body armors must cover the face, sit centred on the head, leave the body below the neck alone
// and keep its silhouette under a palette swap. Sheet closed_helms_<class>.png: a row per helmet, a column per armor.
//   node tools/tests/closed_helms.js paladin
//   node tools/tests/closed_helms.js all
// (Fits are tuned in tools/helmet-fitter, served by tools/helmet_fit_server.py.)
const path = require('path');
const { openGame, report, ALL_CLASSES, OUT_DIR } = require('./harness');
const arg = process.argv[2] || 'paladin';
const CLASSES = arg === 'all' ? ALL_CLASSES : arg.split(',');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1800, height: 1000 });
  let failed = false;
  try {
    for (const cls of CLASSES) {
      const result = await page.evaluate(async (cid) => {
        const ga = await import('/src/core/gearart.js');
        const meta = await ga.loadGearArt(cid);
        if (!meta) return { issues: ['Missing gear metadata for ' + cid] };
        const [fw, fh] = meta.frame, headTop = meta.headTop;
        const designs = (await fetch('/assets/sprites/gear/helmets/index.json').then((r) => r.json())).designs;
        const issues = [], stats = [];
        const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
        const xx = cv.getContext('2d', { willReadFrequently: true });
        const read = (c) => { xx.clearRect(0, 0, fw, fh); xx.imageSmoothingEnabled = false; xx.drawImage(c, 0, 0, fw, fh); return xx.getImageData(0, 0, fw, fh).data; };
        const same = (a, b, k) => a[k] === b[k] && a[k + 1] === b[k + 1] && a[k + 2] === b[k + 2] && a[k + 3] === b[k + 3];
        const cell = 48, s = 3, n = meta.armor.n;
        const preview = document.createElement('canvas');
        preview.id = 'helmqa'; preview.width = n * cell * s; preview.height = designs.length * cell * s;
        Object.assign(preview.style, { position: 'fixed', zIndex: 100000, left: '0', top: '0', background: '#26242a' });
        const pv = preview.getContext('2d'); pv.imageSmoothingEnabled = false;
        // the head: armor 1's top rows, then each armor's measured head offset (gear.json armor.head)
        let hx = 0, hn = 0;
        const first = read(ga.heroLook(cid, { type: 'gear', slot: 'body', rarity: 0, look: [1, 0, -1, 2] }, null));
        for (let y = headTop; y < headTop + 10; y++) for (let x = 0; x < fw; x++) if (first[(y * fw + x) * 4 + 3]) { hx += x; hn++; }
        for (let a = 1; a <= n; a++) {
          const body = { type: 'gear', slot: 'body', rarity: Math.floor((a - 1) / 2), look: [a, 0, -1, 2] };
          const bare = read(ga.heroLook(cid, body, null));
          const [odx, ody] = meta.armor.head?.[a - 1] || [0, 0], cx = Math.round(hx / hn) + odx, top = headTop + ody;
          for (const d of designs) {
            const helm = (finish) => ({ type: 'gear', slot: 'head', rarity: d.rarity, look: [d.id, finish, -1, 2] });
            const name = 'armor ' + a + ' + ' + d.catalog.toLowerCase() + ' helm';
            const worn = ga.heroLook(cid, body, helm(0)), w = read(worn);
            let changed = 0, x0 = fw, y0 = fh, x1 = -1, y1 = -1, face = 0, covered = 0, vx0 = fw, vx1 = -1;
            for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
              const k = (y * fw + x) * 4;
              const inFace = y >= top + 4 && y < top + 16 && Math.abs(x - cx) <= 5 && bare[k + 3];
              if (inFace) face++;
              if (same(w, bare, k)) continue;
              changed++; if (inFace) covered++;
              if (y >= top + 6 && y < top + 14) { vx0 = Math.min(vx0, x); vx1 = Math.max(vx1, x); } // the visor rows
              x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
            }
            stats.push([name, changed, x0, y0, x1, y1, cx, covered / face]);
            if (changed < 200) { issues.push(name + ': helmet barely visible (' + changed + ' px)'); continue; }
            if (covered < face * 0.85) issues.push(name + ': face not covered (' + Math.round(100 * covered / face) + '%)');
            if (y1 > top + 30) issues.push(name + ': helmet reaches the body (down to y ' + y1 + ')');
            // the visor rows span the head on both sides (crests may sweep far back, so not a centre test)
            if (vx0 > cx - 7 || vx1 < cx + 6) issues.push(name + ': off the head (visor x ' + vx0 + '-' + vx1 + ', head ' + cx + ')');
            if (a === 1) { // a finish recolours the same silhouette
              const t = read(ga.heroLook(cid, body, helm(20)));
              let tc = 0;
              for (let k = 0; k < t.length; k += 4) if (!same(t, bare, k)) tc++;
              if (Math.abs(tc - changed) > changed * 0.15) issues.push(name + ': palette swap changes the silhouette (' + changed + ' vs ' + tc + ' px)');
            }
            const u = worn._res || 1; pv.imageSmoothingEnabled = true; pv.imageSmoothingQuality = 'high';
            pv.drawImage(worn, (cx - cell / 2) * u, (top - 10) * u, cell * u, cell * u, (a - 1) * cell * s, (d.id - 1) * cell * s, cell * s, cell * s);
          }
        }
        document.body.appendChild(preview);
        return { helmets: designs.length, issues, stats };
      }, cls);
      console.log(cls + ': ' + JSON.stringify({ helmets: result.helmets, issues: result.issues }));
      if (process.env.HELM_DEBUG) console.log(JSON.stringify(result.stats));
      if (!result.helmets || result.issues.length) failed = true;
      if (result.helmets) await page.locator('#helmqa').screenshot({ path: path.join(OUT_DIR, 'closed_helms_' + cls + '.png') });
      await page.evaluate(() => document.querySelector('#helmqa')?.remove());
    }
  } finally {
    report(errors);
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})().catch(err => { console.error(err); process.exitCode = 1; });
