// Node-only check of the Depth's Edge Caverns generator (src/world/caverns.js, docs/DEPTHS_EDGE.md): seeds of every
// variant generate, the main route joins the start to the notch at the waterfall's foot and the ledge's foot joins the
// plateau (the map's own climb rules), no rock hides walkable ground on screen (the cap), and a map image per variant.
//   node tools/tests/caverns_map.mjs [seeds per variant]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { generateCaverns, CAVE_VARIANTS, REG } = await import(pathToFileURL(path.join(root, 'src/world/caverns.js')));
const out = path.join(root, 'tools/tests/out'); fs.mkdirSync(out, { recursive: true });
const per = +(process.argv[2] || 4);

function png(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

let fails = 0;
const t0 = Date.now();
for (let vi = 0; vi < CAVE_VARIANTS.length; vi++) {
  for (let n = 0; n < per; n++) {
    const seed = 1000 + vi * 97 + n * 7919;
    const t = Date.now();
    const gen = generateCaverns(10, { roster: [] }, seed, vi), m = gen.map, cv = gen.cave;
    const ms = Date.now() - t;
    let walk = 0; for (let i = 0; i < m.w * m.h; i++) walk += m.t[i];
    // hidden walkable ground: any walkable tile whose centre lies behind (on screen) rock in front of it, same column
    const { hv, VW, VH, S, cls } = cv;
    let hidden = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      if (!m.t[i] || cv.reg[i] === REG.shaft) continue;
      const k = (y * S + 1) * VW + x * S + 1, h0 = hv[k];
      for (let s = 1; s < 40; s++) {
        const ii = x * S + 1 + s, jj = y * S + 1 + s;
        if (ii >= VW || jj >= VH) break;
        const kk = jj * VW + ii;
        if (cls[kk]) continue;
        if (hv[kk] - h0 > (s / S) * 2 * 0.408 + 0.6) { hidden++; break; }
      }
    }
    const ok = cv.okMain && cv.okClimb && hidden < walk * 0.01;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${CAVE_VARIANTS[vi].id.padEnd(9)} seed ${seed}: ${m.w}x${m.h}, ${walk} walkable, ${gen.spawns.length} packs, ${gen.props.length} props, ${cv.torches.length} torches, ${cv.wallStal.length} wall stalactites, ${gen.chests.length} chests, route ${cv.okMain ? 'ok' : 'CUT'}, climb ${cv.okClimb ? 'ok' : 'CUT'}, hidden ${hidden}, ${ms} ms`);
    if (n) continue;
    // the map image: 3 px a tile, top-down; height shaded, water blue, region tints, props, torches, the route
    const K = 3, w = m.w * K, h = m.h * K, rgb = Buffer.alloc(w * h * 3);
    const put = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const o = (y * w + x) * 3; rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2]; };
    const tint = { [REG.passage]: [1, 1, 1], [REG.cavern]: [1, 0.95, 0.85], [REG.lake]: [0.85, 0.95, 1], [REG.plateau]: [1, 0.9, 0.7], [REG.shaft]: [0.9, 1, 0.85], [REG.gallery]: [1, 0.85, 1], [REG.notch]: [1, 0.5, 0.5] };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, k = (y * S + 1) * VW + x * S + 1, hh = hv[k];
      let c;
      if (m.wet[i] === 2) c = [20, 60, 140];
      else if (m.t[i]) { const l = 90 + Math.max(-60, Math.min(150, hh * 9)), tt = tint[cv.reg[i]] || [1, 1, 1]; c = [l * tt[0], l * tt[1], l * tt[2]]; if (m.wet[i] === 1) c = [c[0] * 0.6, c[1] * 0.8, 200]; if (m.block[i]) c = [200, 120, 60]; }
      else { const l = Math.max(0, Math.min(60, 10 + hh * 1.5)); c = [l, l * 0.9, l * 0.8]; }
      for (let oy = 0; oy < K; oy++) for (let ox = 0; ox < K; ox++) put(x * K + ox, y * K + oy, c);
    }
    for (const [x, y] of [...cv.route, ...cv.climbRoute]) put(Math.round(x * K), Math.round(y * K), [255, 255, 0]);
    for (const t of cv.torches) put(Math.round(t.x * K), Math.round(t.y * K), [255, 140, 20]);
    for (const s of gen.spawns) { put(Math.round(s.x * K), Math.round(s.y * K), [255, 0, 0]); put(Math.round(s.x * K) + 1, Math.round(s.y * K), [255, 0, 0]); }
    for (const c of gen.chests) put(Math.round(c.x * K), Math.round(c.y * K), [255, 230, 0]);
    for (const [x, y] of [gen.start, cv.arrive, cv.notchIn, cv.lip]) for (let o = -2; o <= 2; o++) { put(Math.round(x * K) + o, Math.round(y * K), [0, 255, 255]); put(Math.round(x * K), Math.round(y * K) + o, [0, 255, 255]); }
    png(path.join(out, `caverns_map_${CAVE_VARIANTS[vi].id}.png`), w, h, rgb);
  }
}
console.log(`${fails ? fails + ' FAILED' : 'all ok'} (${((Date.now() - t0) / 1000).toFixed(1)} s); maps in tools/tests/out/caverns_map_*.png`);
process.exit(fails ? 1 : 0);
