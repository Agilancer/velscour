// Bake arch models (tools/arch3d.py extract -> tools/arch3d.html) to the game's iso view, all four directions:
// assets/source/arches3d/<pack>/<design>/<DIR>.png (raised colour, 1 px = 1 native px) + <DIR>_tags.png (R = 1 + half-tile
// slice along the span, 0 = empty) + bake.json (canvas size and ground pivot per direction). tools/biomepack.py slices
// these instead of ray casting the pack sprite. Needs the repo served (python -m http.server 8123) and internet (three.js
// comes from jsDelivr, for this tool only).
//   node tools/arch3d_bake.js <pack> [design,...] [--review]
// --review also writes tools/tests/out/arch3d_<design>.png: the current game sprite next to the bake, per direction.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const [pack, list] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const review = process.argv.includes('--review');
  if (!pack) { console.log('usage: node tools/arch3d_bake.js <pack> [design,...] [--review]'); process.exit(1); }
  const dir = path.join(ROOT, 'assets/source/arches3d', pack);
  const designs = list ? list.split(',') : fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'meta.json')));
  const browser = await chromium.launch({ args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`${BASE}/tools/arch3d.html?bake`);
  await page.waitForFunction(() => window.ARCH3D, null, { timeout: 30000 });
  for (const design of designs) {
    const t0 = Date.now();
    const res = await page.evaluate(async ([pack, design]) => {
      const { loadArch, bake } = window.ARCH3D;
      const arch = await loadArch(pack, design), out = {};
      for (const d of ['SE', 'SW', 'NW', 'NE']) {
        const r = bake(arch, d);
        // tags as a PNG too (R channel)
        const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
        const id = new ImageData(r.w, r.h);
        r.tags.forEach((t, i) => { id.data[i * 4] = t; id.data[i * 4 + 3] = 255; });
        c.getContext('2d').putImageData(id, 0, 0);
        out[d] = { png: r.png, tags: c.toDataURL('image/png'), w: r.w, h: r.h, pivot: r.pivot };
      }
      return out;
    }, [pack, design]);
    const meta = {};
    for (const [d, r] of Object.entries(res)) {
      fs.writeFileSync(path.join(dir, design, `${d}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(dir, design, `${d}_tags.png`), Buffer.from(r.tags.split(',')[1], 'base64'));
      meta[d] = { w: r.w, h: r.h, pivot: r.pivot };
    }
    fs.writeFileSync(path.join(dir, design, 'bake.json'), JSON.stringify(meta, null, 1));
    console.log(`${pack}/${design}: 4 views in ${Date.now() - t0} ms`);
    if (review) {
      const out = path.join(ROOT, 'tools/tests/out'); fs.mkdirSync(out, { recursive: true });
      const shot = await page.evaluate(async ([pack, design, res]) => {
        // current game sprite: the pack.json slices from walls.webp, against the bake, per direction
        const pj = await (await fetch(`../assets/tiles/${pack}/pack.json`)).json();
        const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
        const atlas = await load(`../assets/tiles/${pack}/walls.webp`);
        const dirs = ['SE', 'SW', 'NW', 'NE'], cw = res.SE.w, ch = res.SE.h, Z = 2;
        const c = document.createElement('canvas'); c.width = cw * 4 * Z; c.height = ch * 2 * Z;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        x.fillStyle = '#26232e'; x.fillRect(0, 0, c.width, c.height);
        for (let k = 0; k < 4; k++) {
          const d = dirs[k], r = res[d], [px, py] = r.pivot;
          for (const [, sx, sy, w, h, ox, oy] of (pj.arches[design] || {})[d] || [])
            x.drawImage(atlas, sx, sy, w, h, (k * cw + px + ox) * Z, (py + oy) * Z, w * Z, h * Z);
          x.drawImage(await load(r.png), k * cw * Z, ch * Z, cw * Z, ch * Z);
        }
        return c.toDataURL('image/png');
      }, [pack, design, res]);
      fs.writeFileSync(path.join(out, `arch3d_${design}.png`), Buffer.from(shot.split(',')[1], 'base64'));
    }
  }
  await browser.close();
})();
