// Contact sheets of the Blender-built 3D beasts through the game's own renderer (tools/beasts3d.html):
//   node tools/tests/beasts3d_sheet.js <model> [query string, e.g. "clips=idle,fly&cols=8&k=120&yaws=0.5,2.6"] [out name]
// Needs the local server (python3 -m http.server 8123). Writes tools/tests/out/beast_<name>.png.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [m, qs = '', name = m] = process.argv.slice(2);
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  p.on('console', (e) => { if (e.type() === 'error' || e.type() === 'warning') console.log('[page]', e.text()); });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.goto(`http://localhost:8123/tools/beasts3d.html?m=${m}&${qs}`);
  await p.waitForFunction('window.DONE', null, { timeout: 60000 });
  await p.waitForTimeout(300);
  const info = await p.evaluate('window.INFO');
  console.log(JSON.stringify({ rad: info.rad, failed: info.failed, clips: info.clips }));
  if (process.env.NODES) console.log(info.nodes.join(' '));
  const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
  await (await p.$('#c')).screenshot({ path: path.join(out, `beast_${name}.png`) });
  await b.close();
})();
