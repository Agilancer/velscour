// Builds tools/assetmanager/manifest.json and the thumbnail sheets (thumbs/) for the asset manager page.
// It reads the game's own catalogs (src/data/*.js) and the generated atlases under assets/, so a rebuild after new
// art lands puts the new art in the right list. Needs Node 18+ and python3 with Pillow (thumbs.py).
//   node tools/assetmanager/build.mjs            (from the repo root or anywhere)
// Statuses (KINDS): art/ai/3d are "custom", recolor/ascii/code/flat3d are "placeholder".
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(ROOT);
const imp = (p) => import(new URL('../../' + p, import.meta.url));
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);
const warns = [];
const warn = (m) => warns.push(m);

const KINDS = {
  art: { label: 'Custom art', list: 'custom', tag: 'ART', blurb: 'Painted or imported art from your art packs.' },
  ai: { label: 'Generated art', list: 'custom', tag: 'GEN', blurb: 'Art from a generated pack made for this game (AI or derived from your art).' },
  '3d': { label: 'Textured 3D', list: 'custom', tag: '3D', blurb: 'A three.js model with image textures, live in the game or baked to sprites.' },
  flat3d: { label: 'Untextured 3D', list: 'ph', tag: '3D', blurb: 'A three.js model with flat or procedural colours only, no image textures.' },
  recolor: { label: 'Recoloured / borrowed', list: 'ph', tag: 'SWAP', blurb: 'Uses art made for something else, recoloured or reused.' },
  ascii: { label: 'ASCII pixel art', list: 'ph', tag: 'ASCII', blurb: 'Tiny pixel art typed as text in src/gfx/pixelart.js.' },
  code: { label: 'Drawn in code', list: 'ph', tag: 'CODE', blurb: 'Shapes, gradients and particles drawn by code, no art file.' },
};

const sections = [], groups = [], items = [], files = [], fileIx = new Map(), ids = new Set();
let curSec = -1;
function F(p) {
  if (!fileIx.has(p)) { if (!exists(p)) warn('missing file ' + p); fileIx.set(p, files.length); files.push(p); }
  return fileIx.get(p);
}
function section(id, name, blurb) { sections.push({ id, name, blurb }); curSec = sections.length - 1; }
// o: note, doc, cmd, dir (source folder for new art), v (live viewer page), code (source files), w (default why), files
function group(name, o = {}) { groups.push({ s: curSec, name, ...o }); return groups.length - 1; }
// it: id, n (name), k (kind), y (sprite|texture|model), src [path, rect?] thumb + preview, fr [[path, rect?], ...] frames,
//     files [paths], w (why), d (about), c (variant count), names [sub names], px (pixel art thumb), thumb [path, rect] (thumb only)
function add(g, it) {
  let id = String(it.id);
  if (ids.has(id)) { let n = 2; while (ids.has(`${id}~${n}`)) n++; warn('duplicate id ' + id); id = `${id}~${n}`; }
  ids.add(id);
  const o = { id, n: it.n, g, k: it.k || 'art' };
  if (it.y && it.y !== 'sprite') o.y = it.y;
  const fr = it.fr || (it.src ? [it.src] : null);
  if (fr && fr.length) {
    o.fr = fr.map(([p, r]) => [F(p), ...(r || [])]);
    if (o.fr.length === 1) { o.p = o.fr[0]; delete o.fr; }
  }
  const fl = [...new Set([...(it.files || []), ...(fr || []).map(([p]) => p)])];
  if (fl.length) o.f = fl.map(F);
  for (const k of ['w', 'd', 'c', 'names', 'px']) if (it[k] != null && it[k] !== '' && !(Array.isArray(it[k]) && !it[k].length)) o[k] = it[k];
  o._thumb = it.thumb || (fr && fr[0]) || null;
  items.push(o);
  return o;
}
const titleCase = (s) => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

// ====================================================================================== catalogs
// (filled in below, one function per section)

// ====================================================================================== thumbnails + manifest
async function main() {
  for (const fn of SECTIONS) await fn();
  const job = { cell: 96, out: 'tools/assetmanager/thumbs', items: [] };
  for (const it of items) if (it._thumb && exists(it._thumb[0])) job.items.push([it.id, it._thumb[0], it._thumb[1] || null, it.px ? 'p' : '']);
  console.log(`thumbnails: ${job.items.length} crops…`);
  const py = spawnSync('python3', ['tools/assetmanager/thumbs.py'], { input: JSON.stringify(job), maxBuffer: 64 << 20, encoding: 'utf8' });
  if (py.status) { console.error(py.stderr); process.exit(1); }
  const th = JSON.parse(py.stdout);
  for (const [key, p, e] of th.bad) warn(`thumbnail ${key} (${p}): ${e}`);
  for (const it of items) { if (th.at[it.id]) it.t = th.at[it.id]; delete it._thumb; }
  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { /* not a checkout */ }
  const manifest = { built: new Date().toISOString(), commit, repo: 'Agilancer/velscour', branch: 'main', kinds: KINDS, sections, groups, files, sheets: th.sheets, items };
  fs.writeFileSync('tools/assetmanager/manifest.json', JSON.stringify(manifest));
  // report
  const tally = {};
  for (const it of items) { const s = sections[groups[it.g].s].id; (tally[s] ||= {})[it.k] = (tally[s][it.k] || 0) + 1; }
  console.table(tally);
  console.log(`${items.length} assets, ${groups.length} groups, ${files.length} files, ${th.sheets.length} thumbnail sheets`);
  if (warns.length) console.log(`${warns.length} warnings:\n  ` + warns.slice(0, 60).join('\n  ') + (warns.length > 60 ? `\n  … ${warns.length - 60} more` : ''));
}
