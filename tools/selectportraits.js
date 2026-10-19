// Hero select portraits from the Grim Nocturne hero sprites: each class in its first common armor, original colours,
// trimmed to its pixels. Writes assets/sprites/select/nocturne/<class>.webp (lossless) + portraits.json ({w, h}).
// Generated; never hand-edit. Rerun after the gear art changes (python tools/nocturnegear.py build):
//   node tools/selectportraits.js            (TEST_FROM_DISK=1 when no server runs on BASE_URL)
const fs = require('fs');
const path = require('path');
const { openGame, ALL_CLASSES } = require('./tests/harness');

(async () => {
  const out = path.resolve(__dirname, '../assets/sprites/select/nocturne');
  fs.mkdirSync(out, { recursive: true });
  const { browser, page } = await openGame();
  const shots = await page.evaluate(async (ids) => {
    const { savedGearPreview, trimCanvas } = await import('/src/core/gearart.js');
    const res = {};
    for (const id of ids) {
      const c = trimCanvas(await savedGearPreview(id, null, null));
      res[id] = { w: c.width, h: c.height, url: c.toDataURL('image/webp', 1) };
    }
    return res;
  }, ALL_CLASSES);
  const meta = {};
  for (const [id, s] of Object.entries(shots)) {
    fs.writeFileSync(path.join(out, id + '.webp'), Buffer.from(s.url.split(',')[1], 'base64'));
    meta[id] = { w: s.w, h: s.h };
  }
  fs.writeFileSync(path.join(out, 'portraits.json'), JSON.stringify(meta, null, 1) + '\n');
  console.log(Object.entries(meta).map(([id, m]) => `${id} ${m.w}x${m.h}`).join('\n'));
  await browser.close();
})();
