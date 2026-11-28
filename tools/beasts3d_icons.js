// Skill-icon portraits of the 3D beasts, rendered by the game's own renderer (src/gfx/beasts3d.js) and saved as
// assets/models/beasts/icons/<name>.webp (128 x 128, transparent). A summon's look.icon3d names one (ui/icons.js).
//   node tools/beasts3d_icons.js            (needs the local server on :8123 and Pillow for the WebP)
// Add a line to ICONS for a new portrait: [name, model, { k, yaw, clip, t, skin, eskin, y (0..1 origin height), ... }].
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ICONS = [
  ['grub', 'grub', { k: 62, yaw: 1.05, clip: 'spit', t: 0.36, y: 0.80, x: 0.5 }],
];
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await p.goto('http://localhost:8123/tools/beasts3d.html?m=grub&clips=idle&cols=1');
  await p.waitForFunction('window.DONE');
  const dir = path.join(__dirname, '..', 'assets', 'models', 'beasts', 'icons'); fs.mkdirSync(dir, { recursive: true });
  for (const [name, model, o] of ICONS) {
    const url = await p.evaluate(async ([model, o]) => {
      const B = await import('/src/gfx/beasts3d.js'), m = B.beast(model);
      if (o.skin) B.preloadBeasts(model + ':' + o.skin); if (o.eskin) B.preloadBeasts(model + ':' + o.eskin);
      for (let i = 0; i < 200 && !m.ready; i++) await new Promise((r) => setTimeout(r, 50));
      await new Promise((r) => setTimeout(r, 600));
      const S = 4, c = document.createElement('canvas'); c.width = c.height = 128 * S; const g = c.getContext('2d'); g.scale(S, S);
      for (let i = 0; i < 3; i++) { g.clearRect(0, 0, 128, 128); B.drawBeast(g, model, 128 * (o.x ?? 0.5), 128 * (o.y ?? 0.8), { key: 'icon', loop: false, ...o }); B.flushBeasts(); }
      const d = document.createElement('canvas'); d.width = d.height = 128; const dg = d.getContext('2d'); dg.imageSmoothingQuality = 'high'; dg.drawImage(c, 0, 0, 128, 128);
      return d.toDataURL('image/png');
    }, [model, o]);
    const png = path.join(dir, name + '.png'); fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
    execFileSync('python3', ['-c', `from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2], lossless=True, method=6)`, png, path.join(dir, name + '.webp')]);
    fs.unlinkSync(png); console.log('wrote', path.join(dir, name + '.webp'));
  }
  await b.close();
})();
