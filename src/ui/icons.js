// Procedural skill icons and cached data-URLs for DOM use.
import { makeCanvas, TAU, shade, rgba } from '../core/util.js';
import { elem, glowSprite } from '../gfx/vfx.js';
import { drawShape } from '../gfx/shapes.js';
import { pixelSprite } from '../gfx/pixelart.js';
import { classSprite } from '../core/assets.js';
import { artIcon } from '../core/classart.js';
import { itemLook } from '../core/gearart.js';
import { heldIconKey } from '../gfx/heldart.js';
import { SUMMONS } from '../data/summons.js';
import { itemIcon } from '../game/loot.js';
import { enemyImage } from '../core/enemyart.js';
import { NOTES } from '../data/notation.js';
import { drawGlyph } from '../gfx/notation.js';
import { drawSun, drawMoon, drawBlackHole, drawChartStar } from '../gfx/cosmos.js';
import { slimeIconParts } from '../gfx/slimeart.js';

const cache = new Map();
const urlCache = new Map();

// Optional painted icon atlases in assets/ui/skills/:
//   - ${classId}_skills.png  : 4 rows (trees 0..3) x 9 cols (skills 0..8), 64x64 px per cell (576x256)
//   - ${classId}_talents.png : 3 rows (branches 0..2) x 8 cols (nodes 0..7), 64x64 px per cell (512x192)
// Falls back seamlessly to procedural HTML5 canvas icons whenever a sheet does not exist yet.
const SKILL_SHEET_DIR = 'assets/ui/skills/';
const skillSheets = new Map(); // `${classId}_${kind}` -> { status: 'loading'|'ready'|'missing', img, promise }
let sheetLoadFn = null, sheetLoadTimer = 0;

/** Register a batched callback invoked whenever a skill or talent PNG sheet finishes loading. */
export function onSkillSheetLoad(fn) { sheetLoadFn = fn; }

function notifySheetLoaded() {
  cache.clear();
  urlCache.clear();
  if (sheetLoadFn && !sheetLoadTimer) {
    sheetLoadTimer = setTimeout(() => { sheetLoadTimer = 0; sheetLoadFn(); }, 20);
  }
}

function requestSheet(classId, kind) {
  if (!classId || typeof globalThis.location === 'undefined') return { status: 'missing', img: null };
  const k = `${classId}_${kind}`;
  let rec = skillSheets.get(k);
  if (rec) return rec;
  rec = { status: 'loading', img: null, promise: null };
  rec.promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      rec.status = 'ready';
      rec.img = img;
      notifySheetLoaded();
      resolve(img);
    };
    img.onerror = () => {
      rec.status = 'missing';
      resolve(null);
    };
    img.src = `${SKILL_SHEET_DIR}${k}.png`;
  });
  skillSheets.set(k, rec);
  return rec;
}

/** Preload both `${classId}_skills.png` and `${classId}_talents.png` ahead of rendering; resolves cleanly if missing. */
export function preloadSkillSheets(classId) {
  if (!classId || typeof globalThis.location === 'undefined') return Promise.resolve();
  return Promise.all([
    requestSheet(classId, 'skills').promise,
    requestSheet(classId, 'talents').promise,
  ]);
}

function sheetCellFor(sk) {
  if (!sk) return null;
  if (sk.isTalent && sk.classId && Number.isInteger(sk.sheetRow) && Number.isInteger(sk.sheetCol)) {
    if (sk.sheetRow >= 0 && sk.sheetRow < 3 && sk.sheetCol >= 0 && sk.sheetCol < 8) {
      return { kind: 'talents', classId: sk.classId, row: sk.sheetRow, col: sk.sheetCol, rows: 3, cols: 8 };
    }
    return null;
  }
  const parts = typeof sk.id === 'string' ? sk.id.split('.') : [];
  if (parts.length === 3) {
    const cls = sk.classId || parts[0];
    const row = Number(parts[1]), col = Number(parts[2]);
    if (cls && Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < 4 && col >= 0 && col < 9) {
      return { kind: 'skills', classId: cls, row, col, rows: 4, cols: 9 };
    }
  }
  return null;
}

export function skillIcon(sk, size = 64) {
  const key = sk.id + '|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  let keep = true; // false while a sheet or summon's painted art is still loading: draw the fallback, don't cache it
  const x = c.getContext('2d', { willReadFrequently: true }); // CPU-backed: read back by toDataURL with no GPU stall (~10-150 ms)
  const cell = sheetCellFor(sk);
  if (cell) {
    const sh = requestSheet(cell.classId, cell.kind);
    if (sh.status === 'ready' && sh.img && sh.img.naturalWidth > 0 && sh.img.naturalHeight > 0) {
      const cw = sh.img.naturalWidth / cell.cols;
      const ch = sh.img.naturalHeight / cell.rows;
      x.drawImage(sh.img, cell.col * cw, cell.row * ch, cw, ch, 0, 0, size, size);
      x.strokeStyle = 'rgba(0,0,0,0.45)';
      x.lineWidth = 1;
      x.strokeRect(0.5, 0.5, size - 1, size - 1);
      cache.set(key, c);
      return c;
    }
    if (sh.status === 'loading') keep = false;
  }
  const E = elem(sk.classId === 'arcane_sorcerer' && sk.el === 'arcane' ? 'astral' : sk.el); // the Astronomer's blue starlight
  const s = size / 64;
  // background
  const g = x.createRadialGradient(size * 0.5, size * 0.42, 2, size * 0.5, size * 0.5, size * 0.75);
  g.addColorStop(0, shade(E.glow, -0.15)); g.addColorStop(0.45, shade(E.dark, -0.35)); g.addColorStop(1, '#070405');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  // subtle rune ring by tree
  x.strokeStyle = rgba(E.glow, 0.25); x.lineWidth = 2 * s;
  x.beginPath(); x.arc(size / 2, size / 2, size * 0.4, 0, TAU); x.stroke();
  x.save();
  const note = NOTES[sk.m.note] ? sk.m.note : null;
  const body = { sunslam: 1, moonfall: 1, blackhole: 1, well: 1, singularity: 1, mirror: 1, bigbang: 1, eclipse: 1, heavensmap: 1, chart: 1, ignite: 1 }[sk.m.astro];
  if (sk.classId === 'arcane_sorcerer') { // a starfield behind every Astronomer icon
    for (let i = 0; i < 14; i++) { x.fillStyle = rgba('#ffffff', 0.25 + (i % 3) * 0.2); const a = i * 2.39996, r = size * (0.18 + (i * 0.037) % 0.3); x.fillRect(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, Math.max(1, s), Math.max(1, s)); }
  }
  if (body) { // the special spells show their heavenly body
    const h = size / 2, m = sk.m.astro;
    if (m === 'sunslam') drawSun(x, h, h, size * 0.25, 1.3, 0.8);
    else if (m === 'moonfall') drawMoon(x, h, h, size * 0.22, 0.5);
    else if (m === 'blackhole' || m === 'well') drawBlackHole(x, h, h + size * 0.06, size * (m === 'well' ? 0.2 : 0.26), 0.7, 1);
    else if (m === 'eclipse') { drawSun(x, h, h, size * 0.22, 0.4, 0.5); x.fillStyle = '#05040a'; x.beginPath(); x.arc(h + size * 0.05, h, size * 0.22, 0, TAU); x.fill(); }
    else if (m === 'bigbang') { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.strokeStyle = ['#4aa8ff', '#ffd060', '#ff80e0'][i % 3]; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(h + Math.cos(a) * size * 0.08, h + Math.sin(a) * size * 0.08); x.lineTo(h + Math.cos(a) * size * 0.4, h + Math.sin(a) * size * 0.4); x.stroke(); } drawChartStar(x, h, h, 1.3 * s, 0); }
    else if (m === 'mirror') for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; drawChartStar(x, h + Math.cos(a) * size * 0.3, h + Math.sin(a) * size * 0.3, 0.55 * s, i); }
    else { // the chart skills: a little constellation
      const P = [[0.2, 0.7], [0.38, 0.45], [0.55, 0.55], [0.7, 0.3], [0.84, 0.42]];
      x.strokeStyle = rgba('#9fe6ff', 0.8); x.lineWidth = 1.5 * s; x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a * size, b * size) : x.moveTo(a * size, b * size))); x.stroke();
      for (const [a, b] of P) drawChartStar(x, a * size, b * size, 0.5 * s, a * 9);
    }
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineWidth = 3 * s; x.strokeRect(1, 1, size - 2, size - 2);
    x.strokeStyle = rgba(E.glow, 0.5); x.lineWidth = 1; x.strokeRect(3, 3, size - 6, size - 6);
    cache.set(key, c);
    return c;
  }
  if (note) { // a Bard skill: its glyph on a staff, with the kind's emblem shrunk into the corner
    x.strokeStyle = rgba('#f2e6c4', 0.4); x.lineWidth = Math.max(1, s);
    for (let i = 0; i < 5; i++) { const y = size * (0.34 + i * 0.075); x.beginPath(); x.moveTo(size * 0.08, y); x.lineTo(size * 0.92, y); x.stroke(); }
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.8;
    x.drawImage(glowSprite(E.glow), size * 0.12, size * 0.08, size * 0.76, size * 0.76);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    drawGlyph(x, note, size * 0.46, size * 0.46, s * (note === 's4' ? 1.25 : 1.55), '#fff8e2');
    x.translate(size * 0.8, size * 0.8);
    x.scale(s * 0.3, s * 0.3);
  } else {
    x.translate(size / 2, size / 2);
    x.scale(s, s);
  }
  x.lineCap = 'round'; x.lineJoin = 'round';
  const core = E.core, glow = E.glow;
  const stroke = (w, col = core) => { x.lineWidth = w; x.strokeStyle = col; x.stroke(); };
  switch (sk.kind) {
    case 'proj': case 'rain': {
      const n = sk.kind === 'rain' ? 3 : Math.min(3, sk.m.n || 1);
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i - (n - 1) / 2) * 12 : 0;
        if (sk.kind === 'rain') drawShape(x, sk.fx === 'ice' ? 'shard' : sk.fx === 'acid' ? 'blob' : sk.fx, off, -4 + Math.abs(off) * 0.4, Math.PI / 2 + 0.3, 1.4, E, 0.3);
        else if (sk.fx === 'tshield') drawShape(x, 'tshield', off * 0.6, off, 0, 1.5 - (n - 1) * 0.25, E, 0.4);
        else drawShape(x, sk.fx, off * 0.6, off, -0.6, 2.1 - n * 0.3, E, 0.4);
      }
      break;
    }
    case 'orbit':
      x.beginPath(); x.arc(0, 0, 17, 0, TAU); stroke(1.5, rgba(glow, 0.6));
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU - 0.5; drawShape(x, sk.fx, Math.cos(a) * 17, Math.sin(a) * 17, a + 1.6, 1, E, 0.2); }
      break;
    case 'melee': {
      if (sk.fx === 'smash') {
        x.save(); x.rotate(-0.7);
        x.fillStyle = '#8a6a40'; x.fillRect(-2.5, -6, 5, 30);
        x.fillStyle = core; x.strokeStyle = '#100808'; x.lineWidth = 2;
        x.fillRect(-12, -18, 24, 13); x.strokeRect(-12, -18, 24, 13);
        x.restore();
      } else if (sk.fx === 'thrust') {
        x.beginPath(); x.moveTo(-20, 20); x.lineTo(16, -16); stroke(4, '#a08060');
        x.beginPath(); x.moveTo(22, -22); x.lineTo(12, -16); x.lineTo(16, -12); x.closePath(); x.fillStyle = core; x.fill();
      } else if (sk.fx === 'claw' || sk.fx === 'bite') {
        for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(-16 + i * 7, -18); x.quadraticCurveTo(i * 7, 0, -4 + i * 7, 20); stroke(4); }
      } else if (sk.fx === 'spin') {
        x.beginPath(); x.arc(0, 0, 18, 0.3, TAU - 0.3); stroke(5);
        x.beginPath(); x.moveTo(18, -6); x.lineTo(14, 4); x.lineTo(24, 2); x.fillStyle = core; x.fill();
      } else {
        x.save(); x.rotate(-0.8);
        x.fillStyle = core; x.strokeStyle = '#100808'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(0, -26); x.lineTo(4, -20); x.lineTo(4, 8); x.lineTo(-4, 8); x.lineTo(-4, -20); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = '#c0a040'; x.fillRect(-10, 8, 20, 4); x.fillStyle = '#6a4a2a'; x.fillRect(-2, 12, 4, 10);
        x.restore();
        x.beginPath(); x.arc(0, 0, 22, -2.4, -0.4); stroke(2, rgba(glow, 0.8));
      }
      if ((sk.m.n || 1) > 1) { x.fillStyle = '#fff'; x.font = 'bold 13px sans-serif'; x.fillText('x' + sk.m.n, 8, 26); }
      break;
    }
    case 'nova':
      for (let r = 6; r <= 24; r += 9) { x.beginPath(); x.arc(0, 0, r, 0, TAU); stroke(3, r > 20 ? glow : core); }
      break;
    case 'aoe':
      x.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? 9 : 24; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      x.closePath(); x.fillStyle = glow; x.fill(); x.fillStyle = core; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill();
      if (sk.fx === 'meteor') drawShape(x, 'meteor', -10, -12, 0.8, 1.2, E, 0);
      break;
    case 'beam':
      if (sk.m.cone) { x.beginPath(); x.moveTo(-20, 18); x.lineTo(24, -10); x.lineTo(10, -24); x.closePath(); x.fillStyle = rgba(glow, 0.8); x.fill(); }
      else { x.beginPath(); x.moveTo(-22, 22); x.lineTo(22, -22); stroke(10, glow); x.beginPath(); x.moveTo(-22, 22); x.lineTo(22, -22); stroke(3, '#fff'); }
      break;
    case 'chain': case 'strike':
      x.beginPath(); x.moveTo(6, -26); x.lineTo(-6, -4); x.lineTo(6, -2); x.lineTo(-6, 24); stroke(6, glow); x.beginPath(); x.moveTo(6, -26); x.lineTo(-6, -4); x.lineTo(6, -2); x.lineTo(-6, 24); stroke(2, '#fff');
      break;
    case 'wall':
      for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * 13 - 6, 18); x.quadraticCurveTo(i * 13, -26 + Math.abs(i) * 8, i * 13 + 6, 18); x.fillStyle = i ? glow : core; x.fill(); }
      break;
    case 'zone': case 'trap':
      x.beginPath(); x.ellipse(0, 6, 24, 12, 0, 0, TAU); x.fillStyle = rgba(glow, 0.5); x.fill(); stroke(2, core);
      if (sk.kind === 'trap') for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * 8 - 3, 8); x.lineTo(i * 8, -6); x.lineTo(i * 8 + 3, 8); x.fillStyle = '#d0d0d8'; x.fill(); }
      else for (let i = 0; i < 6; i++) { x.fillStyle = core; x.fillRect(Math.cos(i) * 14 - 2, 4 + Math.sin(i * 2) * 5 - 6 - i, 4, 4); }
      break;
    case 'cyclone':
      x.beginPath();
      for (let t = 0; t < 1; t += 0.02) { const a = t * 14, r = 4 + t * 20; x.lineTo(Math.cos(a) * r * (1 - t * 0.2), 22 - t * 44 + Math.sin(a) * r * 0.25); }
      stroke(3, glow);
      break;
    case 'whirl':
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(0, 0, 10 + i * 6, i * 2, i * 2 + 3.6); stroke(3, i === 1 ? core : glow); }
      break;
    case 'leap':
      x.beginPath(); x.moveTo(-22, 14); x.quadraticCurveTo(-4, -34, 18, 10); stroke(4, glow);
      x.beginPath(); x.moveTo(18, 18); x.lineTo(10, 6); x.lineTo(24, 6); x.closePath(); x.fillStyle = core; x.fill();
      x.beginPath(); x.ellipse(18, 22, 12, 4, 0, 0, TAU); stroke(2, core);
      break;
    case 'dash':
      for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-18 + i * 12, -14); x.lineTo(-6 + i * 12, 0); x.lineTo(-18 + i * 12, 14); stroke(5, i === 2 ? core : glow); }
      break;
    case 'blink':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; x.beginPath(); x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); x.lineTo(Math.cos(a) * (i % 2 ? 14 : 24), Math.sin(a) * (i % 2 ? 14 : 24)); stroke(3, core); }
      break;
    case 'summon': {
      const def = SUMMONS[sk.m.sum];
      if (def && (def.slime || def.court)) { // the Slime Lord's court: its Glymmora slimes (gfx/slimeart.js)
        const parts = slimeIconParts(def);
        if (!parts) { keep = false; x.beginPath(); x.ellipse(0, 10, 18, 12, 0, 0, TAU); x.fillStyle = glow; x.fill(); }
        else parts.forEach((q, i) => {
          const n = parts.length, k = (n > 1 ? 26 : 40) / q.bh, ox = n > 1 ? (i - 1) * 15 : 0, oy = n > 1 ? (i === 1 ? -6 : 8) : 0;
          x.save(); x.translate(ox, 22 + oy); if (q.flip) x.scale(-1, 1);
          x.drawImage(q.img, q.sx, q.sy, q.sw, q.sh, -q.ax * k, -q.ay * k, q.sw * k, q.sh * k); x.restore();
        });
        if ((sk.m.n || 1) > 1) { x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.fillText('x' + sk.m.n, 10, 26); }
        break;
      }
      const look = def && def.look;
      const art = look && (look.icon || (Array.isArray(look.art) ? look.art[0] : look.art));
      let img = art ? enemyImage(art) : null;
      if (art && !img) keep = false;
      if (!img && look && look.sprite) img = pixelSprite(look.sprite, look.pal, 3);
      else if (!img && look && look.cls) img = classSprite(look.cls === true ? sk.classId : look.cls, 120, look.pal || null);
      else if (!img) img = pixelSprite('skeleton', { w: '#a0ffa0', e: '#40ff40' }, 3);
      const k = Math.min(46 / img.width, 48 / img.height);
      x.globalAlpha = 0.95;
      x.drawImage(img, -img.width * k / 2, 24 - img.height * k, img.width * k, img.height * k);
      x.globalAlpha = 1;
      if ((sk.m.n || 1) > 1) { x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.fillText('x' + sk.m.n, 10, 26); }
      break;
    }
    case 'buff':
      if (sk.m.transform) {
        x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 10 : 24; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fillStyle = glow; x.fill(); stroke(2, core);
      } else {
        x.beginPath(); x.moveTo(0, -24); x.lineTo(20, -14); x.lineTo(16, 10); x.lineTo(0, 24); x.lineTo(-16, 10); x.lineTo(-20, -14); x.closePath(); x.fillStyle = rgba(glow, 0.7); x.fill(); stroke(2.5, core);
        x.beginPath(); x.moveTo(0, -12); x.lineTo(9, 0); x.lineTo(3, 0); x.lineTo(3, 12); x.lineTo(-3, 12); x.lineTo(-3, 0); x.lineTo(-9, 0); x.closePath(); x.fillStyle = '#fff'; x.fill();
      }
      break;
    case 'curse':
      x.beginPath(); x.ellipse(0, 0, 24, 13, 0, 0, TAU); x.fillStyle = rgba(glow, 0.35); x.fill(); stroke(2.5, core);
      x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fillStyle = core; x.fill(); x.fillStyle = '#000'; x.beginPath(); x.arc(0, 0, 3, 0, TAU); x.fill();
      break;
    case 'heal':
      x.fillStyle = glow; x.fillRect(-7, -22, 14, 44); x.fillRect(-22, -7, 44, 14);
      x.fillStyle = '#fff'; x.fillRect(-3, -18, 6, 36); x.fillRect(-18, -3, 36, 6);
      break;
    case 'fissure':
      x.beginPath(); x.moveTo(-24, 20); x.lineTo(-10, 8); x.lineTo(-14, -2); x.lineTo(2, -8); x.lineTo(0, -18); x.lineTo(22, -24); stroke(5, glow);
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-18 + i * 11, 14 - i * 10); x.lineTo(-14 + i * 11, 2 - i * 10); x.lineTo(-10 + i * 11, 14 - i * 10); x.fillStyle = core; x.fill(); }
      break;
    case 'corpse': {
      const img = pixelSprite('skeleton', { w: '#e8dcc0', e: '#ff3030' }, 2);
      x.drawImage(img, -14, -16, 28, 36);
      x.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r = i % 2 ? 18 : 26; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); stroke(2, glow);
      break;
    }
    default:
      x.beginPath(); x.arc(0, 0, 14, 0, TAU); x.fillStyle = glow; x.fill();
  }
  x.restore();
  // frame
  x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineWidth = 3 * s; x.strokeRect(1, 1, size - 2, size - 2);
  x.strokeStyle = rgba(E.glow, 0.5); x.lineWidth = 1; x.strokeRect(3, 3, size - 6, size - 6);
  if (keep) cache.set(key, c);
  return c;
}

export function skillIconURL(sk) {
  let u = urlCache.get(sk.id);
  if (!u) { u = skillIcon(sk, 64).toDataURL(); if (cache.has(sk.id + '|64')) urlCache.set(sk.id, u); }
  return u;
}

function talentIconSpec(node) {
  return {
    id: 'tal_' + node.id,
    isTalent: true,
    classId: node.classId,
    sheetRow: node.sheetRow ?? node.branch ?? 0,
    sheetCol: node.sheetCol ?? 0,
    el: node.el || 'phys',
    fx: node.fx || 'light',
    kind: node.choice ? 'aoe' : 'buff',
    m: {},
  };
}

export function talentIcon(node, size = 64) {
  return skillIcon(talentIconSpec(node), size);
}

export function talentIconURL(node) {
  return skillIconURL(talentIconSpec(node));
}

const itemUrlCache = new Map();
export function itemIconURL(item) {
  const art = item.art && artIcon(item, 48); // catalog art (null until the class pack has loaded)
  const look = !art && itemLook(item); // gear art of body armor and helmets
  const held = !art && !look && !item.sealed && item.type === 'gear' && heldIconKey(item); // the held weapon designs (once their set has loaded)
  const key = item.sealed ? 'sealed' : item.type === 'gem' ? `g|${item.gem}|${item.tier}` : item.type === 'potion' ? `p|${item.kind}` : item.type === 'sheet' ? `s|${item.inked ? 1 : 0}|${item.text && item.text.trim() ? 1 : 0}` : item.type === 'banner_kit' ? 'banner_kit' : art ? `a|${item.artCls}|${item.art}` : look ? `l|${item.slot}|${look[0]}|${look[1]}` : held || `${item.icon}|${item.tier}|${item.rarity}|${item.base}`;
  let u = itemUrlCache.get(key);
  if (!u) { u = itemIcon(item, 48).toDataURL(); itemUrlCache.set(key, u); }
  return u;
}

export function smiteIcon(size = 64) {
  const key = 'special_smite|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64;
  const h = size / 2;

  // Circular clip for clean round button art
  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Dark holy backdrop
  const bg = x.createRadialGradient(h, h * 0.42, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#5e3a0a');
  bg.addColorStop(0.5, '#241204');
  bg.addColorStop(1, '#070302');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Radiant celestial sunbeams radiating downward from top center
  x.save();
  x.translate(h, size * 0.1);
  const nRays = 8;
  for (let i = 0; i < nRays; i++) {
    const a = (i / (nRays - 1) - 0.5) * Math.PI * 0.72 + Math.PI / 2;
    const len = size * 0.75;
    const gBeam = x.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    gBeam.addColorStop(0, 'rgba(255, 242, 190, 0.5)');
    gBeam.addColorStop(1, 'rgba(255, 170, 30, 0)');
    x.fillStyle = gBeam;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a - 0.07) * len, Math.sin(a - 0.07) * len);
    x.lineTo(Math.cos(a + 0.07) * len, Math.sin(a + 0.07) * len);
    x.closePath();
    x.fill();
  }
  x.restore();

  // Sacred solar halo behind the hammer head
  x.strokeStyle = 'rgba(255, 220, 90, 0.45)';
  x.lineWidth = 2 * s;
  x.beginPath();
  x.arc(h, h * 0.74, size * 0.28, 0, TAU);
  x.stroke();

  // Celestial Hammer Emblem
  x.save();
  x.translate(h, h * 0.96);

  // Hammer handle
  const hGrip = x.createLinearGradient(-3 * s, 0, 3 * s, 0);
  hGrip.addColorStop(0, '#4a2c0f');
  hGrip.addColorStop(0.5, '#8c5a24');
  hGrip.addColorStop(1, '#2c1806');
  x.fillStyle = hGrip;
  x.fillRect(-2.5 * s, -6 * s, 5 * s, 22 * s);

  // Handle pommel & wrap bands
  x.fillStyle = '#ffcf52';
  x.fillRect(-3.5 * s, 14 * s, 7 * s, 3 * s);
  x.fillRect(-3 * s, 0 * s, 6 * s, 1.5 * s);
  x.fillRect(-3 * s, 6 * s, 6 * s, 1.5 * s);

  // Massive Golden Hammer Head
  x.save();
  x.translate(0, -12 * s);
  const hHead = x.createLinearGradient(-15 * s, -9 * s, 15 * s, 9 * s);
  hHead.addColorStop(0, '#fff6c2');
  hHead.addColorStop(0.35, '#ffcc33');
  hHead.addColorStop(0.75, '#cc8810');
  hHead.addColorStop(1, '#663905');
  x.fillStyle = hHead;
  x.strokeStyle = '#ffe894';
  x.lineWidth = 1.5 * s;

  // Ornate beveled head polygon
  x.beginPath();
  x.moveTo(-15 * s, -8 * s);
  x.lineTo(-12 * s, -11 * s);
  x.lineTo(12 * s, -11 * s);
  x.lineTo(15 * s, -8 * s);
  x.lineTo(17 * s, 0);
  x.lineTo(15 * s, 8 * s);
  x.lineTo(12 * s, 11 * s);
  x.lineTo(-12 * s, 11 * s);
  x.lineTo(-15 * s, 8 * s);
  x.lineTo(-17 * s, 0);
  x.closePath();
  x.fill();
  x.stroke();

  // Holy cross rune on the hammer face
  x.strokeStyle = '#ffffff';
  x.lineWidth = 2 * s;
  x.beginPath();
  x.moveTo(0, -6 * s); x.lineTo(0, 6 * s);
  x.moveTo(-5 * s, 0); x.lineTo(5 * s, 0);
  x.stroke();

  // Divine lightning sparks
  x.strokeStyle = '#fff8e0';
  x.lineWidth = 1.8 * s;
  x.beginPath();
  x.moveTo(-16 * s, -2 * s); x.lineTo(-21 * s, -7 * s); x.lineTo(-23 * s, -5 * s);
  x.moveTo(16 * s, -2 * s); x.lineTo(21 * s, -7 * s); x.lineTo(23 * s, -5 * s);
  x.moveTo(-16 * s, 3 * s); x.lineTo(-22 * s, 7 * s);
  x.moveTo(16 * s, 3 * s); x.lineTo(22 * s, 7 * s);
  x.stroke();

  x.restore(); // end hammer head
  x.restore(); // end hammer emblem
  x.restore(); // end clip

  cache.set(key, c);
  return c;
}

export function cataclysmIcon(size = 64) {
  const key = 'special_cataclysm|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Dark volcanic magma backdrop
  const bg = x.createRadialGradient(h, h * 0.7, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#541404');
  bg.addColorStop(0.5, '#220802');
  bg.addColorStop(1, '#080201');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Volcanic fissure cracks in ground
  x.save();
  x.translate(h, h * 1.1);
  x.strokeStyle = '#ff5010';
  x.lineWidth = 2 * s;
  x.beginPath();
  x.moveTo(-22 * s, 6 * s); x.lineTo(-12 * s, 0); x.lineTo(-2 * s, 4 * s); x.lineTo(10 * s, -2 * s); x.lineTo(22 * s, 5 * s);
  x.stroke();
  x.strokeStyle = '#ffd030';
  x.lineWidth = 1 * s;
  x.stroke();
  x.restore();

  // Crossed Barbarian Battleaxes
  const drawAxe = (angle) => {
    x.save();
    x.translate(h, h * 0.95);
    x.rotate(angle);

    // Ashwood Haft
    const haft = x.createLinearGradient(-2.5 * s, 0, 2.5 * s, 0);
    haft.addColorStop(0, '#381c0e');
    haft.addColorStop(0.5, '#784422');
    haft.addColorStop(1, '#200e06');
    x.fillStyle = haft;
    x.fillRect(-2 * s, -18 * s, 4 * s, 36 * s);

    // Iron bindings
    x.fillStyle = '#caa050';
    x.fillRect(-2.5 * s, 14 * s, 5 * s, 2 * s);
    x.fillRect(-2.5 * s, -8 * s, 5 * s, 1.5 * s);

    // Curved crescent heavy bearded axe head
    const blade = x.createLinearGradient(-16 * s, -18 * s, 0, -6 * s);
    blade.addColorStop(0, '#f0e8e0');
    blade.addColorStop(0.4, '#9c8c82');
    blade.addColorStop(1, '#4a3830');
    x.fillStyle = blade;
    x.strokeStyle = '#ff7030';
    x.lineWidth = 1.2 * s;
    x.beginPath();
    x.moveTo(0, -16 * s);
    x.quadraticCurveTo(-14 * s, -18 * s, -18 * s, -10 * s);
    x.quadraticCurveTo(-15 * s, -4 * s, -2 * s, -6 * s);
    x.lineTo(0, -6 * s);
    x.closePath();
    x.fill();
    x.stroke();

    x.restore();
  };

  drawAxe(-0.55);
  drawAxe(0.55);

  // Erupting Magma Sparks
  x.fillStyle = '#ffe060';
  for (let i = 0; i < 7; i++) {
    const sx = h + (Math.sin(i * 1.7) * 16) * s;
    const sy = h * 0.6 + (Math.cos(i * 2.1) * 12) * s;
    x.beginPath();
    x.arc(sx, sy, (1.2 + (i % 2) * 0.8) * s, 0, TAU);
    x.fill();
  }

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function gungnirIcon(size = 64) {
  const key = 'special_gungnir|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Storm-sky electric navy backdrop
  const bg = x.createRadialGradient(h, h * 0.45, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#103454');
  bg.addColorStop(0.5, '#071828');
  bg.addColorStop(1, '#02080f');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Concentric electric forcefield rings
  x.strokeStyle = 'rgba(100, 200, 255, 0.35)';
  x.lineWidth = 1.5 * s;
  x.beginPath();
  x.arc(h, h * 0.9, size * 0.32, 0, TAU);
  x.stroke();
  x.beginPath();
  x.arc(h, h * 0.9, size * 0.2, 0, TAU);
  x.stroke();

  // Celestial Lightning Spear
  x.save();
  x.translate(h, h * 0.95);
  x.rotate(-0.45);

  // Steel/silver shaft
  const shaft = x.createLinearGradient(-2 * s, 0, 2 * s, 0);
  shaft.addColorStop(0, '#4a6078');
  shaft.addColorStop(0.5, '#b0d0f0');
  shaft.addColorStop(1, '#2c3c4e');
  x.fillStyle = shaft;
  x.fillRect(-1.8 * s, -12 * s, 3.6 * s, 34 * s);

  // Winged Celestial Spearhead
  const head = x.createLinearGradient(-8 * s, -26 * s, 8 * s, -8 * s);
  head.addColorStop(0, '#ffffff');
  head.addColorStop(0.35, '#a6e2ff');
  head.addColorStop(0.7, '#4890d0');
  head.addColorStop(1, '#1c4470');
  x.fillStyle = head;
  x.strokeStyle = '#e0f4ff';
  x.lineWidth = 1.4 * s;
  x.beginPath();
  x.moveTo(0, -28 * s);
  x.lineTo(7 * s, -14 * s);
  x.lineTo(5 * s, -10 * s);
  x.lineTo(1 * s, -11 * s);
  x.lineTo(0, -6 * s);
  x.lineTo(-1 * s, -11 * s);
  x.lineTo(-5 * s, -10 * s);
  x.lineTo(-7 * s, -14 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Central glowing lightning rune in spear
  x.strokeStyle = '#ffffff';
  x.lineWidth = 1.5 * s;
  x.beginPath();
  x.moveTo(0, -24 * s); x.lineTo(-2 * s, -17 * s); x.lineTo(2 * s, -15 * s); x.lineTo(0, -9 * s);
  x.stroke();

  x.restore();

  // Electric spark arcs
  x.strokeStyle = '#b8f0ff';
  x.lineWidth = 1.5 * s;
  x.beginPath();
  x.moveTo(h + 8 * s, h * 0.4); x.lineTo(h + 16 * s, h * 0.35); x.lineTo(h + 14 * s, h * 0.25);
  x.moveTo(h - 12 * s, h * 0.5); x.lineTo(h - 18 * s, h * 0.42); x.lineTo(h - 22 * s, h * 0.48);
  x.stroke();

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function shaftsIcon(size = 64) {
  const key = 'special_shafts|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Deep emerald forest canopy backdrop
  const bg = x.createRadialGradient(h, h * 0.4, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#1c441a');
  bg.addColorStop(0.5, '#0c220c');
  bg.addColorStop(1, '#030a04');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Recurve longbow arched horizontally
  x.save();
  x.translate(h, h * 1.05);

  // Bow Wood Arch
  const wood = x.createLinearGradient(-22 * s, 0, 22 * s, 0);
  wood.addColorStop(0, '#8c5828');
  wood.addColorStop(0.5, '#d4a34b');
  wood.addColorStop(1, '#8c5828');
  x.strokeStyle = wood;
  x.lineWidth = 3.5 * s;
  x.beginPath();
  x.moveTo(-22 * s, -4 * s);
  x.quadraticCurveTo(0, 16 * s, 22 * s, -4 * s);
  x.stroke();

  // Drawn Bowstring
  x.strokeStyle = '#e8dcc4';
  x.lineWidth = 1.2 * s;
  x.beginPath();
  x.moveTo(-22 * s, -4 * s);
  x.lineTo(0, 8 * s);
  x.lineTo(22 * s, -4 * s);
  x.stroke();

  // Triple Fanned Arrows
  const drawArrow = (ang, col) => {
    x.save();
    x.rotate(ang);
    // Shaft
    x.strokeStyle = '#b8a07c';
    x.lineWidth = 1.8 * s;
    x.beginPath();
    x.moveTo(0, 8 * s); x.lineTo(0, -24 * s);
    x.stroke();
    // Broadhead Arrowhead
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, -28 * s);
    x.lineTo(4 * s, -21 * s);
    x.lineTo(1 * s, -22 * s);
    x.lineTo(0, -18 * s);
    x.lineTo(-1 * s, -22 * s);
    x.lineTo(-4 * s, -21 * s);
    x.closePath();
    x.fill();
    // Fletching
    x.fillStyle = '#68c438';
    x.fillRect(-3 * s, 2 * s, 6 * s, 3 * s);
    x.fillRect(-3 * s, -3 * s, 6 * s, 3 * s);
    x.restore();
  };

  drawArrow(-0.25, '#c0e0b0');
  drawArrow(0.25, '#c0e0b0');
  drawArrow(0, '#ffffff'); // Center bright prime arrow

  x.restore();

  // Glowing green wind motes
  x.fillStyle = '#80ff50';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + 0.3;
    x.beginPath();
    x.arc(h + Math.cos(a) * 18 * s, h * 0.45 + Math.sin(a) * 8 * s, 1.5 * s, 0, TAU);
    x.fill();
  }

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function artilleryIcon(size = 64) {
  const key = 'special_artillery|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Smoldering black powder backdrop
  const bg = x.createRadialGradient(h * 1.1, h * 0.4, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#421a08');
  bg.addColorStop(0.5, '#1e0c04');
  bg.addColorStop(1, '#070301');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Black Iron Siege Mortar Barrel (angled at 45 deg)
  x.save();
  x.translate(h * 0.8, h * 1.1);
  x.rotate(-0.75);

  // Main cannon barrel body
  const iron = x.createLinearGradient(-8 * s, 0, 8 * s, 0);
  iron.addColorStop(0, '#5a626a');
  iron.addColorStop(0.4, '#a2abb4');
  iron.addColorStop(1, '#242a30');
  x.fillStyle = iron;
  x.fillRect(-7 * s, -24 * s, 14 * s, 32 * s);

  // Reinforced muzzle reinforcement ring
  x.fillStyle = '#caa050';
  x.fillRect(-9 * s, -26 * s, 18 * s, 4 * s);
  x.fillRect(-8 * s, -14 * s, 16 * s, 3 * s);

  // Dark cannon bore
  x.fillStyle = '#110401';
  x.beginPath();
  x.ellipse(0, -26 * s, 7 * s, 2.5 * s, 0, 0, TAU);
  x.fill();

  x.restore();

  // Muzzle Flash & High Explosive Fire Burst
  x.save();
  x.translate(h * 1.1, h * 0.4);

  const burst = x.createRadialGradient(0, 0, 2 * s, 0, 0, 18 * s);
  burst.addColorStop(0, '#ffffff');
  burst.addColorStop(0.25, '#ffe260');
  burst.addColorStop(0.65, '#ff5010');
  burst.addColorStop(1, 'rgba(180, 20, 0, 0)');
  x.fillStyle = burst;
  x.beginPath();
  x.arc(0, 0, 18 * s, 0, TAU);
  x.fill();

  // Shrapnel sparks
  x.strokeStyle = '#ffe890';
  x.lineWidth = 1.5 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    x.beginPath();
    x.moveTo(Math.cos(a) * 6 * s, Math.sin(a) * 6 * s);
    x.lineTo(Math.cos(a) * 16 * s, Math.sin(a) * 16 * s);
    x.stroke();
  }
  x.restore();

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function crescendoIcon(size = 64) {
  const key = 'special_crescendo|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Velvet magenta/plum skaldic backdrop
  const bg = x.createRadialGradient(h, h * 0.45, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#4a1028');
  bg.addColorStop(0.5, '#200512');
  bg.addColorStop(1, '#080105');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Concentric Sonic Shockwaves
  x.strokeStyle = 'rgba(255, 120, 180, 0.35)';
  x.lineWidth = 1.5 * s;
  for (let r = 10; r <= 24; r += 7) {
    x.beginPath();
    x.arc(h, h * 0.9, r * s, 0, TAU);
    x.stroke();
  }

  // Renaissance Acoustic Lute
  x.save();
  x.translate(h, h * 0.95);

  // Pear-shaped bowl body
  const luteWood = x.createRadialGradient(-3 * s, 4 * s, 2, 0, 4 * s, 14 * s);
  luteWood.addColorStop(0, '#ffd070');
  luteWood.addColorStop(0.4, '#c87828');
  luteWood.addColorStop(1, '#66320e');
  x.fillStyle = luteWood;
  x.strokeStyle = '#ffb040';
  x.lineWidth = 1.5 * s;
  x.beginPath();
  x.ellipse(0, 4 * s, 12 * s, 15 * s, 0, 0, TAU);
  x.fill();
  x.stroke();

  // Rosette soundhole
  x.fillStyle = '#1a0a03';
  x.beginPath();
  x.arc(0, 1 * s, 4 * s, 0, TAU);
  x.fill();
  x.strokeStyle = '#ffd870';
  x.lineWidth = 1 * s;
  x.stroke();

  // Neck and Angled Pegbox
  x.fillStyle = '#50280c';
  x.fillRect(-3 * s, -14 * s, 6 * s, 12 * s);
  x.fillStyle = '#ffd870';
  x.fillRect(-5 * s, -16 * s, 10 * s, 4 * s); // Pegbox nut

  // Vibrating strings
  x.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  x.lineWidth = 1 * s;
  x.beginPath();
  x.moveTo(-2 * s, -14 * s); x.lineTo(-2 * s, 13 * s);
  x.moveTo(0, -14 * s); x.lineTo(0, 13 * s);
  x.moveTo(2 * s, -14 * s); x.lineTo(2 * s, 13 * s);
  x.stroke();

  x.restore();

  // Floating Treble Rune / Musical Note Motifs
  x.fillStyle = '#ff80b0';
  x.font = `bold ${Math.round(14 * s)}px serif`;
  x.fillText('♪', h - 18 * s, h * 0.45);
  x.fillText('♫', h + 10 * s, h * 0.4);

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function supernovaIcon(size = 64) {
  const key = 'special_supernova|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Cosmic void backdrop
  const bg = x.createRadialGradient(h, h, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#2e0842');
  bg.addColorStop(0.55, '#12021c');
  bg.addColorStop(1, '#040008');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Swirling galaxy dust arms
  x.save();
  x.translate(h, h);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    x.strokeStyle = 'rgba(255, 120, 40, 0.35)';
    x.lineWidth = 2 * s;
    x.beginPath();
    x.arc(0, 0, 16 * s, a, a + 1.2);
    x.stroke();
  }

  // Brilliant Supernova Core
  const star = x.createRadialGradient(0, 0, 2 * s, 0, 0, 15 * s);
  star.addColorStop(0, '#ffffff');
  star.addColorStop(0.25, '#fff6a0');
  star.addColorStop(0.65, '#ff7010');
  star.addColorStop(1, 'rgba(255, 30, 0, 0)');
  x.fillStyle = star;
  x.beginPath();
  x.arc(0, 0, 15 * s, 0, TAU);
  x.fill();

  // 8-Point Cosmic Diffraction Flare Spikes
  x.strokeStyle = '#ffffff';
  x.lineWidth = 1.8 * s;
  x.beginPath();
  // Primary Cardinal Rays
  x.moveTo(0, -22 * s); x.lineTo(0, 22 * s);
  x.moveTo(-22 * s, 0); x.lineTo(22 * s, 0);
  x.stroke();
  // Diagonal Rays
  x.strokeStyle = '#ffd060';
  x.lineWidth = 1.2 * s;
  x.beginPath();
  x.moveTo(-13 * s, -13 * s); x.lineTo(13 * s, 13 * s);
  x.moveTo(13 * s, -13 * s); x.lineTo(-13 * s, 13 * s);
  x.stroke();

  x.restore();

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function graveIcon(size = 64) {
  const key = 'special_grave|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Abyssal tomb shadow backdrop
  const bg = x.createRadialGradient(h, h * 0.45, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#2e1044');
  bg.addColorStop(0.5, '#12041c');
  bg.addColorStop(1, '#05010a');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Erupting Ivory Bone Pikes in Background
  x.fillStyle = '#dcd4c0';
  x.strokeStyle = '#7c6894';
  x.lineWidth = 1 * s;
  const drawSpike = (sx, sy, hgt, rot) => {
    x.save();
    x.translate(sx, sy);
    x.rotate(rot);
    x.beginPath();
    x.moveTo(0, -hgt);
    x.lineTo(3.5 * s, 0);
    x.lineTo(-3.5 * s, 0);
    x.closePath();
    x.fill();
    x.stroke();
    x.restore();
  };
  drawSpike(h - 14 * s, h * 1.05, 22 * s, -0.3);
  drawSpike(h + 14 * s, h * 1.05, 22 * s, 0.3);
  drawSpike(h - 8 * s, h * 1.15, 26 * s, -0.12);
  drawSpike(h + 8 * s, h * 1.15, 26 * s, 0.12);

  // Ancient Weathered Skull in Center
  x.save();
  x.translate(h, h * 0.88);

  const cranium = x.createRadialGradient(-3 * s, -4 * s, 2, 0, 0, 14 * s);
  cranium.addColorStop(0, '#ffffff');
  cranium.addColorStop(0.6, '#d8d0be');
  cranium.addColorStop(1, '#5a4c62');
  x.fillStyle = cranium;
  x.strokeStyle = '#2c2234';
  x.lineWidth = 1.4 * s;

  // Cranium
  x.beginPath();
  x.arc(0, -3 * s, 11 * s, 0, TAU);
  x.fill();
  x.stroke();

  // Maxilla / teeth row
  x.fillStyle = '#e8e2d4';
  x.fillRect(-5 * s, 5 * s, 10 * s, 6 * s);
  x.strokeRect(-5 * s, 5 * s, 10 * s, 6 * s);

  // Hollow green/violet glowing eye sockets
  x.fillStyle = '#100418';
  x.beginPath();
  x.ellipse(-4.5 * s, -2 * s, 3.2 * s, 4 * s, -0.2, 0, TAU);
  x.ellipse(4.5 * s, -2 * s, 3.2 * s, 4 * s, 0.2, 0, TAU);
  x.fill();

  // Glowing Soul Flame in eye sockets
  x.fillStyle = '#a060ff';
  x.beginPath();
  x.arc(-4.5 * s, -2 * s, 1.6 * s, 0, TAU);
  x.arc(4.5 * s, -2 * s, 1.6 * s, 0, TAU);
  x.fill();

  x.restore();

  // Swirling soul wisps
  x.strokeStyle = 'rgba(180, 100, 255, 0.45)';
  x.lineWidth = 1.5 * s;
  x.beginPath();
  x.arc(h, h, 20 * s, -0.5, 1.4);
  x.stroke();

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function crowsIcon(size = 64) {
  const key = 'special_crows|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Caustic toxic mire backdrop
  const bg = x.createRadialGradient(h, h * 0.45, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#1c340a');
  bg.addColorStop(0.5, '#0a1a04');
  bg.addColorStop(1, '#020601');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Toxic crescent / mist ring
  x.strokeStyle = 'rgba(130, 220, 40, 0.4)';
  x.lineWidth = 2 * s;
  x.beginPath();
  x.arc(h, h * 0.85, 20 * s, 0.2, Math.PI - 0.2);
  x.stroke();

  // Silhouette of the Great Raven / Crow
  x.save();
  x.translate(h, h * 0.92);

  // Jet black with occult violet feather sheen
  const crowFeather = x.createLinearGradient(0, -14 * s, 0, 12 * s);
  crowFeather.addColorStop(0, '#2c1e38');
  crowFeather.addColorStop(0.5, '#121612');
  crowFeather.addColorStop(1, '#060a06');
  x.fillStyle = crowFeather;
  x.strokeStyle = '#80e030';
  x.lineWidth = 1 * s;

  // Crow Body & Spread Wings
  x.beginPath();
  x.moveTo(0, -10 * s); // Beak tip
  x.lineTo(3 * s, -5 * s); // Head
  // Right Wing
  x.lineTo(12 * s, -12 * s);
  x.lineTo(21 * s, -8 * s);
  x.lineTo(16 * s, -2 * s);
  x.lineTo(19 * s, 3 * s);
  x.lineTo(12 * s, 4 * s);
  x.lineTo(14 * s, 8 * s);
  x.lineTo(6 * s, 8 * s);
  x.lineTo(0, 14 * s); // Tail
  // Left Wing
  x.lineTo(-6 * s, 8 * s);
  x.lineTo(-14 * s, 8 * s);
  x.lineTo(-12 * s, 4 * s);
  x.lineTo(-19 * s, 3 * s);
  x.lineTo(-16 * s, -2 * s);
  x.lineTo(-21 * s, -8 * s);
  x.lineTo(-12 * s, -12 * s);
  x.lineTo(-3 * s, -5 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Piercing yellow eye
  x.fillStyle = '#ffe030';
  x.beginPath();
  x.arc(1.5 * s, -6 * s, 1.4 * s, 0, TAU);
  x.arc(-1.5 * s, -6 * s, 1.4 * s, 0, TAU);
  x.fill();

  x.restore();

  // Bubbling Caustic Spores
  x.fillStyle = '#90f030';
  for (let i = 0; i < 6; i++) {
    const bx = h + (Math.sin(i * 2.3) * 18) * s;
    const by = h * 0.4 + (Math.cos(i * 1.9) * 10) * s;
    x.beginPath();
    x.arc(bx, by, (1.2 + (i % 3) * 0.6) * s, 0, TAU);
    x.fill();
  }

  x.restore(); // end clip
  cache.set(key, c);
  return c;
}

export function nirvanaIcon(size = 64) {
  const key = 'special_nirvana|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Warm golden spiritual background
  const bg = x.createRadialGradient(h, h * 0.65, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#5a3606');
  bg.addColorStop(0.5, '#261402');
  bg.addColorStop(1, '#080401');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Radiating chakra rays
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    x.strokeStyle = i % 2 === 0 ? 'rgba(255, 200, 50, 0.28)' : 'rgba(255, 240, 150, 0.16)';
    x.lineWidth = 1.8 * s;
    x.beginPath();
    x.moveTo(h, h);
    x.lineTo(h + Math.cos(a) * h * 0.95, h + Math.sin(a) * h * 0.95);
    x.stroke();
  }

  // Golden concentric chakra rings
  x.strokeStyle = '#ffc840';
  x.lineWidth = 1.4 * s;
  x.beginPath();
  x.arc(h, h, 18 * s, 0, TAU);
  x.stroke();
  x.strokeStyle = 'rgba(255, 255, 220, 0.6)';
  x.lineWidth = 1 * s;
  x.beginPath();
  x.arc(h, h, 12 * s, 0, TAU);
  x.stroke();

  // Golden Open Palm / Lotus Hand
  x.save();
  x.translate(h, h * 1.05);
  x.fillStyle = '#ffe070';
  x.strokeStyle = '#ffffff';
  x.lineWidth = 1.2 * s;

  // Palm base
  x.beginPath();
  x.ellipse(0, 0, 8 * s, 10 * s, 0, 0, TAU);
  x.fill();
  x.stroke();

  // Five fingers radiating upward
  const fingers = [
    { x: -7 * s, y: -6 * s, w: 2.2 * s, l: 7 * s, rot: -0.35 },
    { x: -3.5 * s, y: -10 * s, w: 2.4 * s, l: 9 * s, rot: -0.15 },
    { x: 0, y: -11 * s, w: 2.5 * s, l: 11 * s, rot: 0 },
    { x: 3.5 * s, y: -10 * s, w: 2.4 * s, l: 9 * s, rot: 0.15 },
    { x: 7 * s, y: -6 * s, w: 2.2 * s, l: 7 * s, rot: 0.35 },
  ];
  for (const f of fingers) {
    x.save();
    x.translate(f.x, f.y);
    x.rotate(f.rot);
    x.beginPath();
    x.roundRect(-f.w / 2, -f.l, f.w, f.l, f.w / 2);
    x.fill();
    x.stroke();
    x.restore();
  }
  x.restore();

  // Glowing center eye / bindu pearl
  const pearlGlow = x.createRadialGradient(h, h, 0, h, h, 6 * s);
  pearlGlow.addColorStop(0, '#ffffff');
  pearlGlow.addColorStop(0.5, '#ffee80');
  pearlGlow.addColorStop(1, 'rgba(255, 200, 40, 0)');
  x.fillStyle = pearlGlow;
  x.beginPath();
  x.arc(h, h, 6 * s, 0, TAU);
  x.fill();

  x.restore();
  cache.set(key, c);
  return c;
}

export function skydiveIcon(size = 64) {
  const key = 'special_skydive|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Celestial deep space blue backdrop
  const bg = x.createRadialGradient(h, h * 0.45, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#103468');
  bg.addColorStop(0.5, '#061632');
  bg.addColorStop(1, '#020814');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Speed contrails
  x.strokeStyle = 'rgba(120, 190, 255, 0.35)';
  x.lineWidth = 1.8 * s;
  for (let i = -2; i <= 2; i++) {
    x.beginPath();
    x.moveTo(h + i * 10 * s, 4 * s);
    x.lineTo(h + i * 4 * s, h * 0.9);
    x.stroke();
  }

  // Diving Dragon Lance
  x.save();
  x.translate(h, h * 1.05);

  // Flaming contrail
  const flame = x.createLinearGradient(0, -32 * s, 0, 0);
  flame.addColorStop(0, 'rgba(100, 180, 255, 0)');
  flame.addColorStop(0.6, 'rgba(160, 220, 255, 0.6)');
  flame.addColorStop(1, '#ffffff');
  x.fillStyle = flame;
  x.beginPath();
  x.moveTo(-10 * s, -32 * s);
  x.lineTo(10 * s, -32 * s);
  x.lineTo(0, 6 * s);
  x.closePath();
  x.fill();

  // Dragon Wings / Flared Spear Crossguard
  x.fillStyle = '#4090f0';
  x.strokeStyle = '#a0d0ff';
  x.lineWidth = 1.4 * s;
  x.beginPath();
  x.moveTo(0, -6 * s);
  x.lineTo(18 * s, -18 * s);
  x.lineTo(12 * s, -4 * s);
  x.lineTo(0, 0);
  x.lineTo(-12 * s, -4 * s);
  x.lineTo(-18 * s, -18 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Gleaming Silver/Gold Spear Head
  const spearGrad = x.createLinearGradient(-5 * s, 0, 5 * s, 14 * s);
  spearGrad.addColorStop(0, '#ffffff');
  spearGrad.addColorStop(0.5, '#c0e0ff');
  spearGrad.addColorStop(1, '#60a0f0');
  x.fillStyle = spearGrad;
  x.beginPath();
  x.moveTo(0, 18 * s);
  x.lineTo(6 * s, -4 * s);
  x.lineTo(-6 * s, -4 * s);
  x.closePath();
  x.fill();
  x.stroke();

  x.restore();
  x.restore();

  cache.set(key, c);
  return c;
}

export function totemCataclysmIcon(size = 64) {
  const key = 'special_totem_cataclysm|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Shamanic emerald spirit aura
  const bg = x.createRadialGradient(h, h * 0.7, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#0c4030');
  bg.addColorStop(0.5, '#041c14');
  bg.addColorStop(1, '#010806');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Lightning arcs radiating
  x.strokeStyle = 'rgba(80, 240, 180, 0.4)';
  x.lineWidth = 1.6 * s;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    x.beginPath();
    x.moveTo(h, h);
    x.lineTo(h + Math.cos(a) * 24 * s, h + Math.sin(a) * 24 * s);
    x.stroke();
  }

  // Carved Spirit Totem
  x.save();
  x.translate(h, h * 1.05);

  // Totem Wood Base
  x.fillStyle = '#1e3c30';
  x.strokeStyle = '#5ac8a0';
  x.lineWidth = 1.8 * s;
  x.beginPath();
  x.roundRect(-12 * s, -22 * s, 24 * s, 32 * s, 3 * s);
  x.fill();
  x.stroke();

  // Horned Crest
  x.fillStyle = '#2c5846';
  x.beginPath();
  x.moveTo(-12 * s, -22 * s);
  x.lineTo(-18 * s, -30 * s);
  x.lineTo(-8 * s, -25 * s);
  x.lineTo(0, -29 * s);
  x.lineTo(8 * s, -25 * s);
  x.lineTo(18 * s, -30 * s);
  x.lineTo(12 * s, -22 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Glowing Turquoise Eyes
  x.fillStyle = '#60ffd0';
  x.fillRect(-8 * s, -16 * s, 5 * s, 3.5 * s);
  x.fillRect(3 * s, -16 * s, 5 * s, 3.5 * s);

  // Carved Grimace Mouth
  x.fillStyle = '#ffe070';
  x.beginPath();
  x.moveTo(-7 * s, -6 * s);
  x.lineTo(7 * s, -6 * s);
  x.lineTo(5 * s, -2 * s);
  x.lineTo(-5 * s, -2 * s);
  x.closePath();
  x.fill();

  x.restore();
  x.restore();

  cache.set(key, c);
  return c;
}

export function glacialOblivionIcon(size = 64) {
  const key = 'special_glacial_oblivion|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Deep glacial icy backdrop
  const bg = x.createRadialGradient(h, h * 0.7, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#0e2c48');
  bg.addColorStop(0.5, '#051424');
  bg.addColorStop(1, '#01050a');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Erupting Ice Crystal Spikes
  x.fillStyle = 'rgba(120, 200, 255, 0.45)';
  x.strokeStyle = '#a0e4ff';
  x.lineWidth = 1.2 * s;

  // Left spike
  x.beginPath();
  x.moveTo(h - 18 * s, h * 1.2);
  x.lineTo(h - 12 * s, h * 0.4);
  x.lineTo(h - 6 * s, h * 1.2);
  x.closePath();
  x.fill();
  x.stroke();

  // Right spike
  x.beginPath();
  x.moveTo(h + 6 * s, h * 1.2);
  x.lineTo(h + 14 * s, h * 0.35);
  x.lineTo(h + 19 * s, h * 1.2);
  x.closePath();
  x.fill();
  x.stroke();

  // Central Runeblade planted downward
  x.save();
  x.translate(h, h * 0.95);

  // Blade
  const bladeGrad = x.createLinearGradient(-3 * s, 0, 3 * s, 0);
  bladeGrad.addColorStop(0, '#90d4ff');
  bladeGrad.addColorStop(0.5, '#ffffff');
  bladeGrad.addColorStop(1, '#4090d0');
  x.fillStyle = bladeGrad;
  x.strokeStyle = '#c0f0ff';
  x.lineWidth = 1.4 * s;
  x.beginPath();
  x.moveTo(-4 * s, -8 * s);
  x.lineTo(0, 22 * s);
  x.lineTo(4 * s, -8 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Crossguard & Skull Pommel
  x.fillStyle = '#204060';
  x.fillRect(-10 * s, -11 * s, 20 * s, 3 * s);
  x.fillRect(-2 * s, -18 * s, 4 * s, 7 * s);
  x.fillStyle = '#a0d8ff';
  x.beginPath();
  x.arc(0, -19 * s, 3 * s, 0, TAU);
  x.fill();

  x.restore();
  x.restore();

  cache.set(key, c);
  return c;
}

export function astralCollapseIcon(size = 64) {
  const key = 'special_astral_collapse|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Cosmic void indigo/magenta backdrop
  const bg = x.createRadialGradient(h, h, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#2c0e48');
  bg.addColorStop(0.5, '#0e0420');
  bg.addColorStop(1, '#020108');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Orbital planetary ellipses
  x.strokeStyle = 'rgba(140, 200, 255, 0.45)';
  x.lineWidth = 1.4 * s;
  x.beginPath();
  x.ellipse(h, h, 22 * s, 8 * s, 0.6, 0, TAU);
  x.stroke();
  x.strokeStyle = 'rgba(200, 140, 255, 0.35)';
  x.beginPath();
  x.ellipse(h, h, 22 * s, 8 * s, -0.6, 0, TAU);
  x.stroke();

  // 8-Point Diffraction Astral Starburst Rays
  x.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  x.lineWidth = 1.5 * s;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    x.beginPath();
    x.moveTo(h - Math.cos(a) * 20 * s, h - Math.sin(a) * 20 * s);
    x.lineTo(h + Math.cos(a) * 20 * s, h + Math.sin(a) * 20 * s);
    x.stroke();
  }

  // Blinding Core Singularity
  const coreGrad = x.createRadialGradient(h, h, 0, h, h, 8 * s);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, '#a0e0ff');
  coreGrad.addColorStop(0.8, '#7040ff');
  coreGrad.addColorStop(1, 'rgba(60, 20, 180, 0)');
  x.fillStyle = coreGrad;
  x.beginPath();
  x.arc(h, h, 8 * s, 0, TAU);
  x.fill();

  x.restore();
  cache.set(key, c);
  return c;
}

export function royalDelugeIcon(size = 64) {
  const key = 'special_royal_deluge|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Toxic ooze green backdrop
  const bg = x.createRadialGradient(h, h * 0.7, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#1a4816');
  bg.addColorStop(0.5, '#08200a');
  bg.addColorStop(1, '#020a03');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Royal King Slime Body
  x.save();
  x.translate(h, h * 1.05);

  const slimeGrad = x.createRadialGradient(0, -6 * s, 2, 0, 0, 20 * s);
  slimeGrad.addColorStop(0, '#70ff90');
  slimeGrad.addColorStop(0.6, '#30c850');
  slimeGrad.addColorStop(1, '#107028');
  x.fillStyle = slimeGrad;
  x.strokeStyle = '#90ffa8';
  x.lineWidth = 1.8 * s;

  // Chubby gelatinous dome
  x.beginPath();
  x.moveTo(-18 * s, 8 * s);
  x.quadraticCurveTo(-20 * s, -14 * s, 0, -16 * s);
  x.quadraticCurveTo(20 * s, -14 * s, 18 * s, 8 * s);
  x.quadraticCurveTo(0, 14 * s, -18 * s, 8 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Cute royal eyes
  x.fillStyle = '#061a08';
  x.beginPath();
  x.arc(-6 * s, -2 * s, 2.4 * s, 0, TAU);
  x.arc(6 * s, -2 * s, 2.4 * s, 0, TAU);
  x.fill();
  x.fillStyle = '#ffffff';
  x.fillRect(-7 * s, -3.5 * s, 1.5 * s, 1.5 * s);
  x.fillRect(5 * s, -3.5 * s, 1.5 * s, 1.5 * s);

  // Golden 3-Spire Crown
  x.fillStyle = '#ffcf30';
  x.strokeStyle = '#b08010';
  x.lineWidth = 1.2 * s;
  x.beginPath();
  x.moveTo(-10 * s, -16 * s);
  x.lineTo(-12 * s, -24 * s);
  x.lineTo(-5 * s, -20 * s);
  x.lineTo(0, -26 * s);
  x.lineTo(5 * s, -20 * s);
  x.lineTo(12 * s, -24 * s);
  x.lineTo(10 * s, -16 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Crown ruby
  x.fillStyle = '#ff2040';
  x.beginPath();
  x.arc(0, -19 * s, 1.8 * s, 0, TAU);
  x.fill();

  x.restore();
  x.restore();

  cache.set(key, c);
  return c;
}

export function cycloneTempestIcon(size = 64) {
  const key = 'special_cyclone_tempest|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Gale wind seafoam backdrop
  const bg = x.createRadialGradient(h, h, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#0c4038');
  bg.addColorStop(0.5, '#041c18');
  bg.addColorStop(1, '#010a08');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Slicing whirlwind spirals
  x.strokeStyle = 'rgba(140, 255, 220, 0.4)';
  x.lineWidth = 1.8 * s;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    x.beginPath();
    x.arc(h, h, (10 + i * 5) * s, a, a + Math.PI * 0.9);
    x.stroke();
  }

  // Dual Curved Razor Boomerangs
  const drawRang = (rot) => {
    x.save();
    x.translate(h, h);
    x.rotate(rot);

    x.fillStyle = '#e8fffa';
    x.strokeStyle = '#3ac8a8';
    x.lineWidth = 1.5 * s;

    x.beginPath();
    x.moveTo(-16 * s, 6 * s);
    x.quadraticCurveTo(0, -12 * s, 16 * s, 6 * s);
    x.lineTo(13 * s, 11 * s);
    x.quadraticCurveTo(0, -6 * s, -13 * s, 11 * s);
    x.closePath();
    x.fill();
    x.stroke();

    // Gold tip caps
    x.fillStyle = '#ffd050';
    x.fillRect(-16 * s, 6 * s, 3.5 * s, 5 * s);
    x.fillRect(12.5 * s, 6 * s, 3.5 * s, 5 * s);

    x.restore();
  };

  drawRang(-0.4);
  drawRang(Math.PI - 0.4);

  x.restore();
  cache.set(key, c);
  return c;
}

export function dragonsInfernoIcon(size = 64) {
  const key = 'special_dragons_inferno|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64, h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  // Volcanic inferno magma backdrop
  const bg = x.createRadialGradient(h, h * 0.7, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#5a1406');
  bg.addColorStop(0.5, '#240602');
  bg.addColorStop(1, '#0a0201');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  // Roaring Dragon Head
  x.save();
  x.translate(h, h * 0.9);

  // Curved dragon horns
  x.fillStyle = '#2c0a06';
  x.strokeStyle = '#ff6020';
  x.lineWidth = 1.4 * s;
  x.beginPath();
  x.moveTo(-6 * s, -10 * s);
  x.quadraticCurveTo(-18 * s, -24 * s, -14 * s, -28 * s);
  x.quadraticCurveTo(-10 * s, -20 * s, -2 * s, -12 * s);
  x.closePath();
  x.fill();
  x.stroke();

  x.beginPath();
  x.moveTo(6 * s, -10 * s);
  x.quadraticCurveTo(18 * s, -24 * s, 14 * s, -28 * s);
  x.quadraticCurveTo(10 * s, -20 * s, 2 * s, -12 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Dragon Snout & Head
  x.fillStyle = '#b8240c';
  x.strokeStyle = '#ff8030';
  x.lineWidth = 1.6 * s;
  x.beginPath();
  x.moveTo(-10 * s, -10 * s);
  x.lineTo(0, -16 * s);
  x.lineTo(10 * s, -10 * s);
  x.lineTo(8 * s, 2 * s);
  x.lineTo(0, 8 * s);
  x.lineTo(-8 * s, 2 * s);
  x.closePath();
  x.fill();
  x.stroke();

  // Glowing amber dragon eye
  x.fillStyle = '#ffee40';
  x.beginPath();
  x.ellipse(-4 * s, -5 * s, 2 * s, 1.2 * s, -0.2, 0, TAU);
  x.ellipse(4 * s, -5 * s, 2 * s, 1.2 * s, 0.2, 0, TAU);
  x.fill();

  // Breath of Dragonfire erupting from jaws
  const flame = x.createRadialGradient(0, 10 * s, 2, 0, 14 * s, 16 * s);
  flame.addColorStop(0, '#ffffff');
  flame.addColorStop(0.3, '#ffea40');
  flame.addColorStop(0.7, '#ff5010');
  flame.addColorStop(1, 'rgba(180, 20, 0, 0)');
  x.fillStyle = flame;
  x.beginPath();
  x.arc(0, 14 * s, 15 * s, 0.2, Math.PI - 0.2);
  x.fill();

  x.restore();
  x.restore();

  cache.set(key, c);
  return c;
}

export function ultimateIcon(classId, size = 64) {
  switch (classId) {
    case 'paladin': return smiteIcon(size);
    case 'barbarian': return cataclysmIcon(size);
    case 'lancer': return gungnirIcon(size);
    case 'ranger': return shaftsIcon(size);
    case 'gunner': return artilleryIcon(size);
    case 'bard': return crescendoIcon(size);
    case 'wizard': return supernovaIcon(size);
    case 'necromancer': return graveIcon(size);
    case 'carrion_witch': return crowsIcon(size);
    case 'monk': return nirvanaIcon(size);
    case 'dragoon': return skydiveIcon(size);
    case 'totem_master': return totemCataclysmIcon(size);
    case 'death_knight': return glacialOblivionIcon(size);
    case 'arcane_sorcerer': return astralCollapseIcon(size);
    case 'slime_lord': return royalDelugeIcon(size);
    case 'boomerang_knight': return cycloneTempestIcon(size);
    case 'dragon_knight': return dragonsInfernoIcon(size);
    default: return smiteIcon(size);
  }
}

export function ultimateIconURL(classId, size = 64) {
  const key = `special_ult_${classId}|${size}`;
  let u = urlCache.get(key);
  if (!u) {
    u = ultimateIcon(classId, size).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

export function madnessIcon(size = 64) {
  const key = 'special_madness|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d', { willReadFrequently: true });
  const s = size / 64;
  const h = size / 2;

  x.save();
  x.beginPath();
  x.arc(h, h, h - 2 * s, 0, TAU);
  x.clip();

  const bg = x.createRadialGradient(h, h * 0.5, 2, h, h, h * 1.15);
  bg.addColorStop(0, '#46092e');
  bg.addColorStop(0.5, '#1e0316');
  bg.addColorStop(1, '#060105');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);

  x.save();
  x.translate(h, h);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    x.strokeStyle = rgba('#ff1060', 0.28);
    x.lineWidth = 2.5 * s;
    x.beginPath();
    x.moveTo(Math.cos(a) * 8 * s, Math.sin(a) * 8 * s);
    x.quadraticCurveTo(
      Math.cos(a + 0.6) * 18 * s, Math.sin(a + 0.6) * 18 * s,
      Math.cos(a + 1.2) * 28 * s, Math.sin(a + 1.2) * 28 * s
    );
    x.stroke();
  }
  x.restore();

  x.save();
  x.translate(h, h);
  const drawFlame = (fx, fy, scaleY, col) => {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(fx - 4 * s, fy);
    x.quadraticCurveTo(fx - 6 * s, fy - 10 * s * scaleY, fx, fy - 18 * s * scaleY);
    x.quadraticCurveTo(fx + 6 * s, fy - 10 * s * scaleY, fx + 4 * s, fy);
    x.closePath();
    x.fill();
  };
  drawFlame(-12 * s, 6 * s, 0.7, 'rgba(180, 20, 100, 0.5)');
  drawFlame(12 * s, 6 * s, 0.7, 'rgba(180, 20, 100, 0.5)');
  drawFlame(-6 * s, -4 * s, 1.1, 'rgba(255, 30, 110, 0.7)');
  drawFlame(6 * s, -4 * s, 1.1, 'rgba(255, 30, 110, 0.7)');
  drawFlame(0, -6 * s, 1.3, '#ff4090');
  x.restore();

  x.save();
  x.translate(h, h);

  const eyeGrad = x.createRadialGradient(0, 0, 1, 0, 0, 16 * s);
  eyeGrad.addColorStop(0, '#ffd8ea');
  eyeGrad.addColorStop(0.35, '#ff2070');
  eyeGrad.addColorStop(0.7, '#880845');
  eyeGrad.addColorStop(1, '#2c0418');

  x.beginPath();
  x.moveTo(-20 * s, 0);
  x.quadraticCurveTo(-10 * s, -13 * s, 0, -13 * s);
  x.quadraticCurveTo(10 * s, -13 * s, 20 * s, 0);
  x.quadraticCurveTo(10 * s, 13 * s, 0, 13 * s);
  x.quadraticCurveTo(-10 * s, 13 * s, -20 * s, 0);
  x.closePath();
  x.fillStyle = eyeGrad;
  x.fill();
  x.strokeStyle = '#ff6aa8';
  x.lineWidth = 1.8 * s;
  x.stroke();

  x.strokeStyle = 'rgba(60, 0, 30, 0.8)';
  x.lineWidth = 2 * s;
  x.beginPath();
  x.arc(0, 0, 8.5 * s, 0, TAU);
  x.stroke();

  x.fillStyle = '#080105';
  x.beginPath();
  x.moveTo(0, -10 * s);
  x.quadraticCurveTo(3.5 * s, 0, 0, 10 * s);
  x.quadraticCurveTo(-3.5 * s, 0, 0, -10 * s);
  x.closePath();
  x.fill();

  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(-1.5 * s, -2.5 * s, 1.5 * s, 0, TAU);
  x.fill();

  x.restore();
  x.restore();

  cache.set(key, c);
  return c;
}

export function smiteIconURL(size = 64) {
  const key = 'special_smite_url|' + size;
  let u = urlCache.get(key);
  if (!u) { u = smiteIcon(size).toDataURL(); urlCache.set(key, u); }
  return u;
}

export function madnessIconURL(size = 64) {
  const key = 'special_madness_url|' + size;
  let u = urlCache.get(key);
  if (!u) { u = madnessIcon(size).toDataURL(); urlCache.set(key, u); }
  return u;
}
