// Review shots of the Pirate Seas fleet (tools/seaships3d.html): every scene from preset views, plus a contact sheet.
// Needs the repo served (python -m http.server 8123) and three.js from jsDelivr (or THREE_DIR, as in gunner3d_bake.js).
//   node tools/seaships3d_shots.js [scenes|all] [views] [weather]
//   e.g. node tools/seaships3d_shots.js carrier,kestrel iso,close,side,deck
// Writes tools/tests/out/seaships/<scene>_<view>[_<weather>].png and prints any page errors.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const OUT = path.join(__dirname, 'tests', 'out', 'seaships');
fs.mkdirSync(OUT, { recursive: true });
const ALL = ['longboat', 'cutter', 'brig', 'grappler', 'galleon', 'dreadnought', 'carrier', 'kestrel', 'thunderhawk', 'dawnwake', 'lightship', 'tender', 'hulk'];
const arg = (i, d) => (process.argv[i] && process.argv[i] !== '-' ? process.argv[i] : d);
const scenes = arg(2, 'all') === 'all' ? ALL : arg(2).split(',');
const views = arg(3, 'iso,close,side,top').split(',');
const weather = arg(4, 'day');
(async () => {
  const args = (process.env.CHROMIUM_ARGS || '--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist').split(' ').filter(Boolean);
  const exe = process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH) ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch({ ...exe, args });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  if (process.env.THREE_DIR) {
    await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', (route) => {
      const f = path.join(process.env.THREE_DIR, new URL(route.request().url()).pathname.replace(/^\/npm\/three@0\.170\.0\//, ''));
      return fs.existsSync(f) ? route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: '' });
    });
  }
  await page.goto(`${BASE}/tools/seaships3d.html?scene=${scenes[0]}&px=1&still=1&hud=0&weather=${weather}`);
  await page.waitForFunction(() => window.SEA?.ready, null, { timeout: 120000 });
  for (const s of scenes) {
    await page.evaluate((s) => window.SEA.setScene(s), s);
    for (const v of views) {
      await page.evaluate((v) => { window.SEA.view(v); window.SEA.step(1.5); }, v);
      const f = path.join(OUT, `${s}_${v}${weather !== 'day' ? '_' + weather : ''}.png`);
      await page.screenshot({ path: f });
      console.log('shot', path.relative(process.cwd(), f));
    }
  }
  // the user's rule: sea ships float. The hull must reach below the waterline, and nothing may hang in the air under it.
  const float = await page.evaluate(async (list) => {
    const out = [];
    for (const s of list) {
      if (['kestrel', 'thunderhawk'].includes(s)) continue;
      await window.SEA.setScene(s);
      const g = window.SEA.cur.list[0], ship = g.userData.ship, wl = ship.info.waterline;
      ship.root.updateMatrixWorld(true);
      let minY = Infinity;
      ship.root.traverse((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const y = o.geometry.boundingBox.min.y; if (y < minY) minY = y; } });
      out.push(`${s}: waterline ${wl.toFixed(2)}, lowest point ${minY.toFixed(2)} ${minY < wl - 0.3 ? 'OK (afloat)' : 'FAIL: hull does not reach the water'}`);
    }
    return out;
  }, scenes);
  console.log(float.join('\n'));
  const errs = await page.evaluate(() => window.SEA.errors);
  console.log([...errs, ...errors].length ? 'ERRORS:\n' + [...errs, ...errors].join('\n') : 'NO ERRORS');
  await browser.close();
})();
