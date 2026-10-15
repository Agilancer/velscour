// Ground grit: pebbles, dirt specks, dust and grass tufts scattered over the floor tiles. The colours are sampled from
// each floor tile's own (palette-swapped) art, so they always fit the biome; town transition tiles get the most, mixing
// both materials they blend. Baked once per world into a few overlay sprites per floor variant, one drawImage a tile.
import { makeCanvas } from '../core/util.js';
import { G } from '../state.js';
import { TW, TH, HW, HH } from '../core/view.js';

const VARIANTS = 4, U = 2; // U: world px per grit pixel (the camera shows tiles small)
let gritFrame = -1, gritMade = 0;
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const css = (c, f, a = 1) => {
  const m = f >= 0 ? (v) => v + (255 - v) * f : (v) => v * (1 + f);
  return `rgba(${m(c[0]) | 0},${m(c[1]) | 0},${m(c[2]) | 0},${a})`;
};

/** Up to 40 opaque colours from inside the tile's diamond. */
function sample(f) {
  const c = makeCanvas(32, 16), x = c.getContext('2d', { willReadFrequently: true });
  try { x.drawImage(f.img, f.sx, f.sy, f.w, f.h, 0, 0, 32, 16); } catch (e) { return null; }
  let d;
  try { d = x.getImageData(0, 0, 32, 16).data; } catch (e) { return null; }
  const out = [];
  for (let y = 2; y < 14; y += 2) for (let i = 4; i < 28; i += 2) {
    if (Math.abs(i - 16) / 16 + Math.abs(y - 8) / 8 > 0.8) continue;
    const k = (y * 32 + i) * 4;
    if (d[k + 3] > 200) out.push([d[k], d[k + 1], d[k + 2]]);
  }
  return out.length ? out : null;
}

function bake(cols, seed, n) {
  const c = makeCanvas(TW, TH), x = c.getContext('2d');
  let r = seed;
  const rnd = () => ((r = Math.imul(r ^ (r >>> 15), 2654435761) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  for (let k = 0; k < n; k++) {
    // a point well inside the diamond
    let px, py;
    for (let g = 0; g < 8; g++) {
      px = rnd() * TW; py = rnd() * TH;
      if (Math.abs(px - HW) / HW + Math.abs(py - HH) / HH < 0.78) break;
    }
    px = (px / U | 0) * U; py = (py / U | 0) * U;
    const col = cols[(rnd() * cols.length) | 0];
    const green = col[1] > col[0] * 0.97 && col[1] > col[2] * 1.15;
    const roll = rnd();
    if (green && roll < 0.55) { // grass tuft: a few blades, dark root, lit tips
      const blades = 2 + ((rnd() * 3) | 0);
      for (let b = 0; b < blades; b++) {
        const h = 2 + ((rnd() * 3) | 0), bx = px + (b - (blades >> 1)) * U;
        x.fillStyle = css(col, -0.4); x.fillRect(bx, py - (h - 1) * U, U, h * U);
        x.fillStyle = css(col, 0.3); x.fillRect(bx, py - (h - 1) * U, U, U);
      }
    } else if (roll < 0.3) { // pebble: lit top, shadow under
      const w = 1 + ((rnd() * 2) | 0);
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(px, py + U, (w + 1) * U, U);
      x.fillStyle = css(col, 0.18 + rnd() * 0.2); x.fillRect(px, py, w * U, U);
      if (w > 1) { x.fillStyle = css(col, -0.15); x.fillRect(px, py + U, w * U, U); }
    } else if (roll < 0.78) { // dirt / grit speck
      x.fillStyle = css(col, -0.35 - rnd() * 0.3, 0.9); x.fillRect(px, py, (1 + ((rnd() * 1.6) | 0)) * U, U);
    } else { // dust / sand fleck
      x.fillStyle = css(col, 0.35 + rnd() * 0.25, 0.7); x.fillRect(px, py, U, U);
    }
  }
  return c;
}

/** The grit overlay for floor tile (tx, ty) of variant v drawn with entry f, or null. */
export function gritAt(world, f, v, tx, ty) {
  const g = world.grit || (world.grit = { cols: new Map(), spr: new Map() });
  const town = !!world.townTiles, trans = town && v >= 6;
  const h = hash(tx, ty, 7);
  if ((h & 255) >= (trans ? 256 : town ? 150 : 105)) return null;
  const key = v * VARIANTS + ((h >>> 8) % VARIANTS);
  let s = g.spr.get(key);
  if (s === undefined) {
    // Spread fresh tile sampling/canvas baking over multiple phone frames.
    // Heavy new biome floors may contain dozens of variants in one viewport;
    // synchronous getImageData on all of them in one render causes a hitch.
    if (G.touch) {
      if (gritFrame !== G.frame) { gritFrame = G.frame; gritMade = 0; }
      if (gritMade >= 2) return null;
      gritMade++;
    }
    let cols = g.cols.get(v);
    if (cols === undefined) g.cols.set(v, cols = sample(f));
    s = cols ? bake(cols, key * 9973 + 17, trans ? 22 : town ? 12 : 8) : null;
    g.spr.set(key, s);
  }
  return s;
}
