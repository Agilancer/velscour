// Fitted helmet QA: every Common and Rare helmet of the shared atlases (assets/sprites/gear/{common,rare}_helmets/)
// must draw on the hero's head through its placements.json fit, leave the body below the head untouched, and look
// the same through a palette swap. Writes a head preview sheet per class.
//   node tools/tests/closed_helms.js paladin
//   node tools/tests/closed_helms.js all
// (The legacy per-class helms.webp / helms_mask.png closed-faceplate check retired when the fitted atlases replaced
// them, 2af0460 "Replace helmet overlays with fitted class atlas and visual editor".)
const path = require('path');
const { openGame, report, ALL_CLASSES, OUT_DIR } = require('./harness');
const arg = process.argv[2] || 'paladin';
const CLASSES = arg === 'all' ? ALL_CLASSES : arg.split(',');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1600, height: 1400 });
  let failed = false;
  try {
    for (const cls of CLASSES) {
      const result = await page.evaluate(async (cid) => {
        const ga = await import('/src/core/gearart.js');
        const meta = await ga.loadGearArt(cid);
        if (!meta) return { issues: ['Missing gear metadata for ' + cid] };
        const [fw, fh] = meta.frame, [ax] = meta.anchor, headTop = meta.headTop;
        const sets = {};
        for (const set of ['common', 'rare']) sets[set] = (await fetch('/assets/sprites/gear/' + set + '_helmets/index.json').then((r) => r.json())).designs.length;
        const issues = [], stats = [];
        const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
        const xx = cv.getContext('2d', { willReadFrequently: true });
        const read = (c) => { xx.clearRect(0, 0, fw, fh); xx.drawImage(c, 0, 0); return xx.getImageData(0, 0, fw, fh).data; };
        const body = { type: 'gear', slot: 'body', rarity: 0, look: [1, 0, -1] };
        const bare = read(ga.heroLook(cid, body, null));
        const total = sets.common + sets.rare, cell = 64;
        const preview = document.createElement('canvas');
        preview.id = 'helmqa'; preview.width = 10 * cell * 2; preview.height = Math.ceil(total / 10) * cell * 2;
        Object.assign(preview.style, { position: 'fixed', zIndex: 100000, left: '0', top: '0', background: '#26242a' });
        const pv = preview.getContext('2d'); pv.imageSmoothingEnabled = false;
        let n = 0;
        for (const [set, count] of Object.entries(sets)) for (let design = 1; design <= count; design++, n++) {
          const helm = (finish) => ({ type: 'gear', slot: 'head', rarity: set === 'rare' ? 2 : 0, look: [design, finish, -1] });
          const name = set + ' ' + design;
          const worn = ga.heroLook(cid, body, helm(1)), d = read(worn);
          let changed = 0, x0 = fw, y0 = fh, x1 = -1, y1 = -1;
          for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
            const k = (y * fw + x) * 4;
            if (d[k] === bare[k] && d[k + 1] === bare[k + 1] && d[k + 2] === bare[k + 2] && d[k + 3] === bare[k + 3]) continue;
            changed++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
          stats.push([name, changed, x0, y0, x1, y1]);
          if (changed < 150) { issues.push(name + ' helmet barely visible (' + changed + ' px)'); continue; }
          // masks (Gunner, Death Knight Rare) leave the hair showing, so the art only has to reach the face
          if (y0 > headTop + 16) issues.push(name + ' helmet does not reach the face (starts at y ' + y0 + ')');
          if (y1 > headTop + 64) issues.push(name + ' helmet alters the body below the head (down to y ' + y1 + ')');
          if (Math.abs((x0 + x1) / 2 - ax) > 20) issues.push(name + ' helmet is off the head anchor (centre x ' + (x0 + x1) / 2 + ')');
          // a different finish recolours the same silhouette
          const t = read(ga.heroLook(cid, body, helm(2)));
          let tChanged = 0;
          for (let k = 3; k < t.length; k += 4) if (t[k - 3] !== bare[k - 3] || t[k - 2] !== bare[k - 2] || t[k - 1] !== bare[k - 1] || t[k] !== bare[k]) tChanged++;
          if (Math.abs(tChanged - changed) > changed * 0.25) issues.push(name + ' palette swap changes the silhouette (' + changed + ' vs ' + tChanged + ' px)');
          pv.drawImage(worn, ax - cell / 2, Math.max(0, headTop - 16), cell, cell, (n % 10) * cell * 2, Math.floor(n / 10) * cell * 2, cell * 2, cell * 2);
        }
        document.body.appendChild(preview);
        return { helmets: sets, issues, stats };
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
