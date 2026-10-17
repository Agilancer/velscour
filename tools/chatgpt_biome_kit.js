// Builds docs/biome_kit/: the outlined templates and Catacombs examples to hand to ChatGPT (image generation)
// for a new dungeon biome pack. See docs/CHATGPT_BIOME_SPRITES.md.
//
//   unzip assets/source/biomes/Catacombs_Biome_Pack.zip -d <dir>
//   NODE_PATH=<global node_modules> node tools/chatgpt_biome_kit.js <dir>/Catacombs_Biome_Pack
//   ... --clean <out dir>   only the example sheets, without labels or outlines (a stand-in for ChatGPT's replies,
//                           used to test tools/chatgpt_biome.py)
//
// The examples are the Catacombs pack's own sprites un-projected back into flat source cells (square floor
// textures, wall faces, arch and door elevations), laid out exactly like the templates.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const PACK = process.argv[2];
if (!PACK || !fs.existsSync(path.join(PACK, 'manifest.json'))) { console.error('usage: node tools/chatgpt_biome_kit.js <extracted Catacombs_Biome_Pack dir>'); process.exit(1); }
const ci = process.argv.indexOf('--clean'), CLEAN = ci > 0;
const OUT = CLEAN ? process.argv[ci + 1] : path.join(__dirname, '..', 'docs', 'biome_kit');
for (const d of ['templates', 'examples']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const man = JSON.parse(fs.readFileSync(path.join(PACK, 'manifest.json'), 'utf8'));
const sprites = {};
for (const a of man.assets) sprites[a.id] = 'data:image/png;base64,' + fs.readFileSync(path.join(PACK, a.file)).toString('base64');
const names = cat => man.assets.filter(a => a.category === cat);
const floors = names('floors').map(a => a.id), scatter = names('scatter').map(a => a.id);
const walls = [...new Set(names('walls').map(a => a.wall_set))];
const arches = [...new Set(names('arches').map(a => a.arch_design))], doors = [...new Set(names('doors').map(a => a.door_design))];

(async () => {
  const exe = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => p && fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  page.on('console', m => console.log('page:', m.text()));
  const files = await page.evaluate(async ({ sprites, floors, scatter, walls, arches, doors, CLEAN }) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const px = async id => { const im = await load(sprites[id]); const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data }; };
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
    // un-project: fn(tx,ty) -> [sx,sy,shade] in the sprite; returns a canvas of the flat texture
    const unproject = (s, tw, th, fn, alphaOnly) => {
      const [c, g] = canvas(tw, th), out = g.createImageData(tw, th);
      for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const [sx, sy, sh] = fn(tx, ty), x = Math.floor(sx), y = Math.floor(sy);
        if (x < 0 || y < 0 || x >= s.w || y >= s.h) continue;
        const i = (y * s.w + x) * 4, o = (ty * tw + tx) * 4;
        if (s.d[i + 3] < 128) continue;
        for (let k = 0; k < 3; k++) out.data[o + k] = Math.min(255, s.d[i + k] / sh);
        out.data[o + 3] = 255;
      }
      // fill holes in full-bleed textures from the nearest neighbour row-wise
      if (!alphaOnly) for (let pass = 0; pass < 8; pass++) for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const o = (ty * tw + tx) * 4; if (out.data[o + 3]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= tw || y >= th) continue;
          const p = (y * tw + x) * 4; if (out.data[p + 3] === 255) { for (let k = 0; k < 3; k++) out.data[o + k] = out.data[p + k]; out.data[o + 3] = 254; break; }
        }
      }
      for (let o = 3; o < out.data.length; o += 4) if (out.data[o]) out.data[o] = 255;
      g.putImageData(out, 0, 0); return c;
    };
    const intersect = (a, b) => { // keep a's pixels where b is opaque too
      const ga = a.getContext('2d'), da = ga.getImageData(0, 0, a.width, a.height), db = b.getContext('2d').getImageData(0, 0, a.width, a.height).data;
      for (let i = 3; i < da.data.length; i += 4) if (!db[i]) da.data[i] = 0;
      ga.putImageData(da, 0, 0); return a;
    };
    const floorTex = async id => { const s = await px(id); return unproject(s, 160, 160, (tx, ty) => { const u = (tx + .5) / 160, v = (ty + .5) / 160; return [80 * (u - v) + 79.5, 40 * (u + v) - 1, 1]; }); };
    const wallTex = async (fam, rev) => {
      const s = await px(Object.keys(sprites).find(k => k.includes(fam) && k.endsWith(rev ? 'panel_NW' : 'panel_SE')));
      return unproject(s, 80, 128, (tx, ty) => { let u = (tx + .5) / 80 - .5; if (rev) u = -u; const z = 128 - (ty + .5); return [128 + 80 * (u - .1), 192 + 40 * (u + .1) - z, .94]; });
    };
    const elev = async (front, back, pivot, w, h, half, span) => {
      const f = (s, sgn) => unproject(s, w, h, (tx, ty) => { const u = sgn * (-span / 2 + span * (tx + .5) / w), z = h - (ty + .5); return [pivot[0] + 80 * (u - half), pivot[1] + 40 * (u + half) - z, .98]; }, true);
      const sf = await px(front), sb = await px(back);
      const a = f(sf, 1), b = f(sb, -1);
      return [intersect(a, b), intersect(f(sb, -1), f(sf, 1))];
    };

    const CY = '#00e5ff', MAG = '#ff00ff', INK = '#ffffff';
    const label = (g, x, y, text, size = 15, col = INK) => { if (CLEAN) return; g.font = `bold ${size}px monospace`; g.textBaseline = 'top'; g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); };
    const box = (g, x, y, w, h, col = CY, dash = []) => { if (CLEAN) return; g.save(); g.setLineDash(dash); g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.restore(); };
    const diamond = (g, cx, cy, w, col = CY, dash = [6, 4]) => { if (CLEAN) return; g.save(); g.setLineDash(dash); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - w / 4); g.lineTo(cx + w / 2, cy); g.lineTo(cx, cy + w / 4); g.lineTo(cx - w / 2, cy); g.closePath(); g.stroke(); g.restore(); };
    const out = {};
    const save = (name, c) => { out[name] = c.toDataURL('image/png'); };
    const BASES = 10;

    // ---- floors: 4 sheets of 4x4 square cells, 1024x1024 ----
    const floorSheet = async (sheet, example) => {
      const [c, g] = canvas(1024, 1024); g.fillStyle = '#20262a'; g.fillRect(0, 0, 1024, 1024);
      for (let k = 0; k < 16; k++) {
        const n = sheet * 16 + k + 1, x = (k % 4) * 256, y = Math.floor(k / 4) * 256;
        if (n > 60) { g.fillStyle = '#111'; g.fillRect(x, y, 256, 256); box(g, x, y, 256, 256, '#555'); label(g, x + 10, y + 10, 'UNUSED - leave empty', 14, '#999'); continue; }
        if (example) g.drawImage(await floorTex(floors[n - 1]), x, y, 256, 256);
        else {
          g.fillStyle = n <= BASES ? '#3a3226' : '#2b3138'; g.fillRect(x, y, 256, 256);
          g.save(); g.setLineDash([5, 5]); g.lineWidth = 2; g.strokeStyle = '#ffffff55'; g.beginPath(); g.arc(x + 128, y + 128, 92, 0, 7); g.stroke(); g.restore();
        }
        box(g, x, y, 256, 256);
        label(g, x + 8, y + 8, `FLOOR ${String(n).padStart(2, '0')}`, 16);
        label(g, x + 8, y + 230, n <= BASES ? 'BASE - tiles seamlessly' : `FEATURE on base ${((n - 11) % BASES) + 1}`, 13, n <= BASES ? '#ffd27a' : '#9fe6ff');
      }
      return c;
    };
    for (let s = 0; s < 4; s++) {
      const nm = `${s + 1}_floors_${String(s * 16 + 1).padStart(2, '0')}-${String(Math.min(60, s * 16 + 16)).padStart(2, '0')}.png`;
      save('templates/' + nm, await floorSheet(s, false)); save('examples/' + nm, await floorSheet(s, true));
    }

    // ---- wall faces: 5 families x front/back, 1536x1024, cells 307x512 (5:8) ----
    const wallSheet = async example => {
      const [c, g] = canvas(1536, 1024); g.fillStyle = '#20262a'; g.fillRect(0, 0, 1536, 1024);
      const cw = 1536 / 5;
      for (let r = 0; r < 2; r++) for (let f = 0; f < 5; f++) {
        const x = Math.round(f * cw), y = r * 512, w = Math.round((f + 1) * cw) - x;
        if (example) g.drawImage(await wallTex(walls[f], r === 1), x, y, w, 512);
        else { g.fillStyle = r ? '#2e2a33' : '#33302a'; g.fillRect(x, y, w, 512); for (let k = 1; k < 4; k++) { g.save(); g.setLineDash([4, 6]); g.strokeStyle = '#ffffff33'; g.beginPath(); g.moveTo(x, y + k * 128); g.lineTo(x + w, y + k * 128); g.stroke(); g.restore(); } }
        box(g, x, y, w, 512);
        label(g, x + 8, y + 8, `WALL ${f + 1} ${r ? 'BACK' : 'FRONT'}`, 16);
        label(g, x + 8, y + 30, r ? 'same wall, other side' : 'room-facing side', 12, '#9fe6ff');
        label(g, x + 8, y + 486, 'v floor contact v', 12, '#ffd27a');
        label(g, x + 8, y + 52, '<- tiles L/R ->', 12, '#ffd27a');
      }
      return c;
    };
    save('templates/5_wall_faces.png', await wallSheet(false)); save('examples/5_wall_faces.png', await wallSheet(true));

    // ---- arches: 3 designs x front/back on magenta, 1536x1024, cells 512 ----
    const AH = [160, 184, 144];
    const archSheet = async example => {
      const [c, g] = canvas(1536, 1024); g.fillStyle = MAG; g.fillRect(0, 0, 1536, 1024);
      for (let i = 0; i < 3; i++) {
        const ex = example ? await elev(`arch_0${i + 1}_${arches[i]}_SE`, `arch_0${i + 1}_${arches[i]}_NW`, [192, 248], 240, AH[i], .1, 3) : null;
        for (let r = 0; r < 2; r++) {
          const cx = i * 512, cy = r * 512, w = 480, h = AH[i] * 2, x = cx + 16, y = cy + 488 - h;
          if (ex) g.drawImage(ex[r], x, y, w, h);
          else {
            for (const t of [1, 2]) { g.save(); g.setLineDash([3, 6]); g.strokeStyle = '#ffffff88'; g.beginPath(); g.moveTo(x + t * 160, y); g.lineTo(x + t * 160, y + h); g.stroke(); g.restore(); }
            g.save(); g.setLineDash([8, 5]); g.strokeStyle = '#ffffffaa'; g.lineWidth = 2; g.beginPath(); // suggested opening
            const oy = y + h * .2 + 136; g.moveTo(x + 104, y + h); g.lineTo(x + 104, oy); g.arc(x + 240, oy, 136, Math.PI, 0); g.lineTo(x + 376, y + h); g.stroke(); g.restore();
            label(g, x + 8, y + h - 24, 'pier', 12); label(g, x + w - 46, y + h - 24, 'pier', 12);
          }
          box(g, x, y, w, h);
          if (!CLEAN) { g.fillStyle = '#ffd27a'; g.fillRect(x, y + h, w, 3); }
          label(g, cx + 16, cy + 10, `ARCH ${i + 1} ${r ? 'BACK' : 'FRONT'}`, 16);
          label(g, cx + 16, cy + 30, `outer span 3 tiles, height ${AH[i]} (box ${w}x${h})`, 12, '#ffffff');
        }
      }
      return c;
    };
    save('templates/6_arches.png', await archSheet(false)); save('examples/6_arches.png', await archSheet(true));

    // ---- door leaves: 3 designs x front/back on magenta, 1536x1024, leaf box 256x448 (4:7) ----
    const doorSheet = async example => {
      const [c, g] = canvas(1536, 1024); g.fillStyle = MAG; g.fillRect(0, 0, 1536, 1024);
      for (let i = 0; i < 3; i++) {
        const ex = example ? await elev(`door_0${i + 1}_${doors[i]}_SE_closed`, `door_0${i + 1}_${doors[i]}_NW_closed`, [160, 208], 64, 112, .025, .8) : null;
        for (let r = 0; r < 2; r++) {
          const cx = i * 512, cy = r * 512, x = cx + 128, y = cy + 40;
          if (ex) g.drawImage(ex[r], x, y, 256, 448);
          box(g, x, y, 256, 448);
          if (!ex) label(g, x + 10, y + 214, 'hinge side ->', 12, '#ffffff');
          label(g, cx + 12, cy + 10, `DOOR ${i + 1} ${r ? 'BACK' : 'FRONT'}`, 16);
          label(g, cx + 12, cy + 490, 'leaf only (no frame), 0.8 tile x 112', 12, '#ffffff');
        }
      }
      return c;
    };
    save('templates/7_door_leaves.png', await doorSheet(false)); save('examples/7_door_leaves.png', await doorSheet(true));

    // ---- scatter props: 2 sheets of 5x4 on magenta, 1536x1024 ----
    const W = [136, 136, 122, 86, 98, 130, 54, 78, 86, 38, 50, 58, 136, 76, 68, 88, 106, 80, 122, 64, 128, 134, 148, 100, 58, 60, 84, 80, 112, 70, 80, 58, 90, 58, 50, 100, 110, 126, 70, 74];
    const ROLE = ['large tomb / coffer', 'open large container', 'fallen lid / slab', 'pile of skulls / trophies', 'low debris heap *', 'remains lying flat *', 'tall urn / jar', 'broken pot', 'chest / strongbox', 'small floor lantern [LIGHT]', 'candle cluster [LIGHT] *', 'candelabrum [LIGHT]', 'altar', 'lectern / pedestal', 'kneeling figure statue', 'standing statue', 'fallen column', 'column stump', 'rubble pile', 'grave marker / small stele', 'closed coffin', 'broken open coffin', 'cart / wagon', 'basin / font', 'brazier [LIGHT]', 'torch stand [LIGHT]', 'cluster of urns', 'rolled cloth / bedroll *', 'heap of planks *', 'chains & shackles *', 'leaning slab / seal', 'obelisk (tall, used as arena columns)', 'wall corbel / bracket', 'small idol', 'offering bowl *', 'bell / gong', 'fallen railing / fence', 'bench', 'small book / tool clutter *', 'boots / belt / small kit *'];
    const scatterSheet = async (sheet, example) => {
      const [c, g] = canvas(1536, 1024); g.fillStyle = MAG; g.fillRect(0, 0, 1536, 1024);
      const cw = 1536 / 5, S = 1.4;
      for (let k = 0; k < 20; k++) {
        const n = sheet * 20 + k, x = Math.round((k % 5) * cw), y = Math.floor(k / 5) * 256, w = Math.round(((k % 5) + 1) * cw) - x;
        const bw = Math.round(W[n] * S), maxH = 150 * S, bx = x + Math.round((w - bw) / 2), groundY = y + 236;
        if (example) {
          const im = await load(sprites[scatter[n]]); const s = await px(scatter[n]);
          let x0 = s.w, y0 = s.h, x1 = 0, y1 = 0;
          for (let yy = 0; yy < s.h; yy++) for (let xx = 0; xx < s.w; xx++) if (s.d[(yy * s.w + xx) * 4 + 3] > 127) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
          const ow = (x1 - x0 + 1) * S, oh = (y1 - y0 + 1) * S;
          g.drawImage(im, x0, y0, x1 - x0 + 1, y1 - y0 + 1, x + (w - ow) / 2, groundY - oh, ow, oh);
        } else {
          diamond(g, x + w / 2, groundY - bw / 4, bw);
          box(g, bx, groundY - maxH, bw, maxH, CY, [6, 4]);
        }
        box(g, x, y, w, 256, '#ffffff');
        label(g, x + 6, y + 6, `PROP ${String(n + 1).padStart(2, '0')}`, 14);
        label(g, x + 6, y + 24, ROLE[n], 11, '#ffffff');
      }
      return c;
    };
    save('templates/8_props_01-20.png', await scatterSheet(0, false)); save('examples/8_props_01-20.png', await scatterSheet(0, true));
    save('templates/9_props_21-40.png', await scatterSheet(1, false)); save('examples/9_props_21-40.png', await scatterSheet(1, true));

    // ---- how each source cell becomes game sprites (Catacombs) ----
    const [c, g] = canvas(1536, 1024); g.fillStyle = '#171c1e'; g.fillRect(0, 0, 1536, 1024);
    label(g, 20, 14, 'WHAT YOU DRAW (flat)  ->  WHAT THE BUILDER MAKES (isometric)', 22, '#ffd27a');
    const put = async (id, x, y, s = 1) => { const im = await load(sprites[id]); g.drawImage(im, x, y, im.width * s, im.height * s); };
    g.drawImage(await floorTex(floors[0]), 30, 80, 160, 160); await put(floors[0], 230, 120); await put(floors[16], 410, 120);
    label(g, 30, 250, 'square floor texture -> 160x80 diamond (rotated 45, half height)', 13);
    g.drawImage(await wallTex(walls[0], false), 30, 300, 80, 128); g.drawImage(await wallTex(walls[0], true), 120, 300, 80, 128);
    for (const [j, m] of ['straight_SE_NW', 'corner_SE_SW', 'tee_NE_SE_SW', 'cross_NE_SE_SW_NW', 'panel_SW'].entries()) await put(`wall_01_${walls[0]}_${m}`, 220 + j * 200, 250, .8);
    label(g, 30, 460, 'front + back wall faces -> all 16 joins, corners, tees, panels (5 families)', 13);
    const ae = await elev(`arch_02_${arches[1]}_SE`, `arch_02_${arches[1]}_NW`, [192, 248], 240, 184, .1, 3);
    g.drawImage(ae[0], 30, 520, 240, 184); await put(`arch_02_${arches[1]}_SE`, 300, 480, .8); await put(`arch_02_${arches[1]}_SW`, 620, 480, .8);
    const de = await elev(`door_01_${doors[0]}_SE_closed`, `door_01_${doors[0]}_NW_closed`, [160, 208], 64, 112, .025, .8);
    g.drawImage(de[0], 960, 560, 64, 112); await put(`door_01_${doors[0]}_SE_closed`, 1040, 500, .8); await put(`door_01_${doors[0]}_SE_open`, 1290, 500, .8);
    label(g, 30, 760, 'arch elevation -> 4 directions, sliced for depth      door leaf -> 4 directions x closed/open, frame added', 13);
    for (let k = 0; k < 6; k++) await put(scatter[[0, 9, 15, 22, 24, 31][k]], 30 + k * 200, 790, 1);
    label(g, 30, 990, 'props are drawn already in the game view (3/4 isometric, ground diamond at the base); used as-is', 13);
    save('pipeline.png', c);
    return out;
  }, { sprites, floors, scatter, walls, arches, doors, CLEAN });
  for (const [n, d] of Object.entries(files)) if (!CLEAN || n.startsWith('examples/')) fs.writeFileSync(path.join(OUT, CLEAN ? path.basename(n) : n), Buffer.from(d.split(',')[1], 'base64'));
  console.log('wrote', Object.keys(files).filter(n => !CLEAN || n.startsWith('examples/')).length, 'images to', OUT);
  await browser.close();
})();
