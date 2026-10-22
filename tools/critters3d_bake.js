// Bake the gilded critters (tools/critters3d.html: three.js models of the wisp, starmoth, scarab and prismatic wisp)
// into assets/sprites/critters/critters.webp + critters.json, which src/game/critters.js draws. Needs the repo served
// (BASE_URL, default http://localhost:8123) and jsDelivr (three.js, for this tool only). On Windows a GPU helps:
// CHROMIUM_ARGS="--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist".
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const page = await browser.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`${BASE}/tools/critters3d.html`);
  await page.waitForFunction(() => window.CRITTERBAKE, null, { timeout: 60000 });
  const t0 = Date.now(), r = await page.evaluate(() => window.CRITTERBAKE.bake());
  const dir = path.join(ROOT, 'assets/sprites/critters'); fs.mkdirSync(dir, { recursive: true });
  const img = Buffer.from(r.webp.split(',')[1], 'base64');
  fs.writeFileSync(path.join(dir, 'critters.webp'), img);
  fs.writeFileSync(path.join(dir, 'critters.json'), JSON.stringify(r.meta));
  console.log(`critters: ${Object.entries(r.meta.sets).map(([k, s]) => `${k} ${s.dirs}x${s.frames}`).join(', ')}; ${(img.length / 1024).toFixed(0)} KB in ${Date.now() - t0} ms`);
  await browser.close();
})();
