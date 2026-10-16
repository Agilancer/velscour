// Full closed-face helmet QA: verify 80 composite overlays per class, every palette-compatible
// opening mask, stable body coordinates, and generate real in-game head previews.
//   node tools/tests/closed_helms.js paladin
//   node tools/tests/closed_helms.js all
// Requires the same test server and Playwright installation as tools/tests/gear.js.
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
        if (!meta) return { error: 'Missing gear metadata for ' + cid };
        const [fw, fh] = meta.frame;
        const [hx, hy, hw, hh] = meta.helmCell;
        if (fw !== 128 || fh !== 192 || hx !== 40 || hy !== 0 || hw !== 48 || hh !== 56) {
          return { error: 'Unexpected helmet alignment metadata for ' + cid, frame: meta.frame, cell: meta.helmCell };
        }
        const mask = new Image();
        await new Promise((resolve, reject) => {
          mask.onload = resolve;
          mask.onerror = reject;
          mask.src = '/assets/sprites/gear/' + cid + '/helms_mask.png';
        });
        const mcv = document.createElement('canvas');
        mcv.width = mask.naturalWidth; mcv.height = mask.naturalHeight;
        const mx = mcv.getContext('2d', { willReadFrequently: true });
        mx.drawImage(mask, 0, 0);
        const md = mx.getImageData(0, 0, mcv.width, mcv.height).data;

        const preview = document.createElement('canvas');
        preview.id = 'helmqa';
        preview.width = 10 * hw * 3;
        preview.height = 8 * hh * 3;
        Object.assign(preview.style, { position: 'fixed', zIndex: 100000, left: '0', top: '0', background: '#26242a' });
        const pv = preview.getContext('2d');
        pv.imageSmoothingEnabled = false;
        let openings = 0, openCells = 0, covered = 0, unchangedOutside = 0, err = null;

        const look = (slot, design, finish) =>
          ({ type: 'gear', slot, look: [design, finish, -1] });
        for (let design = 1; design <= meta.helms.n && !err; design++) {
          const a = ga.heroLook(cid, look('body', design, 0), null);
          const b = ga.heroLook(cid, look('body', design, 0), look('head', design, 0));
          const original = document.createElement('canvas');
          original.width = fw; original.height = fh;
          const xx = original.getContext('2d', { willReadFrequently: true });
          xx.drawImage(a, 0, 0);
          const ad = xx.getImageData(0, 0, fw, fh).data;
          xx.clearRect(0, 0, fw, fh);
          xx.drawImage(b, 0, 0);
          const bd = xx.getImageData(0, 0, fw, fh).data;
          let hasOpening = false;
          for (let y = 0; y < fh && !err; y++) for (let x = 0; x < fw; x++) {
            const k = (y * fw + x) * 4;
            const inside = x >= hx && x < hx + hw && y >= hy && y < hy + hh;
            if (!inside) {
              for (let c = 0; c < 4; c++) if (ad[k + c] !== bd[k + c]) {
                err = 'Helmet ' + design + ' altered body outside helmet cell at (' + x + ',' + y + ')';
                break;
              }
              unchangedOutside++;
              if (err) break;
            } else {
              const sx = (design - 1) % meta.cols * hw + (x - hx);
              const sy = Math.floor((design - 1) / meta.cols) * hh + (y - hy);
              if (md[(sy * mask.naturalWidth + sx) * 4] === 255) {
                hasOpening = true; openings++;
                if (bd[k + 3] !== 255) {
                  err = 'Helmet ' + design + ' has a transparent faceplate at (' + x + ',' + y + ')';
                  break;
                }
                covered++;
              }
            }
          }
          if (hasOpening) openCells++;
          const col = (design - 1) % 10, row = Math.floor((design - 1) / 10);
          pv.drawImage(b, hx, hy, hw, hh, col * hw * 3, row * hh * 3, hw * 3, hh * 3);
          // Verify palette swapping also composes an opaque plate (sample designs, two finishes).
          if (design % 10 === 1 && !err) {
            const tinted = ga.heroLook(cid, look('body', design, 2), look('head', design, 2));
            xx.clearRect(0, 0, fw, fh); xx.drawImage(tinted, 0, 0);
            const td = xx.getImageData(0, 0, fw, fh).data;
            for (let y = 0; y < hh && !err; y++) for (let x = 0; x < hw; x++) {
              const sx = (design - 1) % meta.cols * hw + x;
              const sy = Math.floor((design - 1) / meta.cols) * hh + y;
              if (md[(sy * mask.naturalWidth + sx) * 4] === 255 &&
                  td[((y + hy) * fw + x + hx) * 4 + 3] !== 255) {
                err = 'Palette-swapped helmet ' + design + ' has transparent face opening';
                break;
              }
            }
          }
        }
        document.body.appendChild(preview);
        return { helmets: meta.helms.n, openedSourceHelms: openCells, openingPixels: openings, opaqueFaceplatePixels: covered, unchangedOutside, error: err };
      }, cls);
      console.log(cls + ': ' + JSON.stringify(result));
      if (result.error || result.helmets !== 80 || result.openingPixels !== result.opaqueFaceplatePixels) {
        failed = true;
      }
      if (!result.error) {
        await page.locator('#helmqa').screenshot({ path: path.join(OUT_DIR, 'closed_helms_' + cls + '.png') });
      }
      await page.evaluate(() => document.querySelector('#helmqa')?.remove());
    }
  } finally {
    report(errors);
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})().catch(err => { console.error(err); process.exitCode = 1; });
