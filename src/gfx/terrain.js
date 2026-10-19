// Height-mapped terrain (world/mountain.js, docs/MOUNTAINSIDE.md): every tile is a column `map.hgt[i]` levels tall
// (HS world px a level). The ground drawn here is baked into the floor chunks like any floor: tile tops lifted by their
// height and, wherever the ground in front is lower, rock cliff faces down to it (the two faces the camera sees: SW
// toward +y and SE toward +x). Terrain rises away from the camera, so faces mostly face it; a column that rises toward
// the camera (`occluders`) is drawn again in the depth-sorted pass over anyone standing behind it.
import { G } from '../state.js';
import { HW, HH, TW, TH, setElevation } from '../core/view.js';
import { makeCanvas, clamp } from '../core/util.js';

export const HS = 4; // world px per height level

const hash = (x, y, s) => {
  let h = Math.imul(x ^ 0x2c1b3c6d, 0x297a2d39) ^ Math.imul(y ^ s, 0x1b873593);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// ------------------------------------------------------------------ rock
let rock = null;
/** Two 64x64 tiling rock faces (lit SW faces, shaded SE faces): broken granite in angular facets, taller than wide,
 * each lit along its top and shadowed at its foot, with thin broken cracks between and a little lichen. */
function rockPatterns(ctx) {
  if (!rock) {
    const S = 64, pts = [];
    for (let k = 0; k < 26; k++) pts.push([hash(k, 1, 91) * S, hash(k, 2, 91) * S]);
    const make = (dark) => {
      const c = makeCanvas(S, S), g = c.getContext('2d'), d = g.createImageData(S, S), p = d.data;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let d1 = Infinity, d2 = Infinity, near = 0, vy = 0;
        for (let k = 0; k < pts.length; k++) {
          let dx = x - pts[k][0], dy = y - pts[k][1];
          dx -= S * Math.round(dx / S); dy -= S * Math.round(dy / S);
          const dd = Math.hypot(dx * 1.5, dy * 0.85);
          if (dd < d1) { d2 = d1; d1 = dd; near = k; vy = dy; } else if (dd < d2) d2 = dd;
        }
        const edge = d2 - d1, tone = hash(near, 3, 7);
        // a facet: lit on top, falling into shadow at its foot
        let v = 0.34 + tone * 0.16 - vy * 0.012 + (hash(x, y, 5) - 0.5) * 0.08 + (hash(x >> 1, y >> 1, 9) - 0.5) * 0.05;
        const crack = hash((x + near * 7) >> 2, (y + near * 3) >> 2, 21) > 0.35;
        if (edge < 0.9 && crack) v -= 0.2; else if (edge < 1.8) v -= vy > 0 ? 0.09 : -0.05;
        let r = v * 1.02 + 0.015, gg = v * 0.96 + 0.01, b = v * 0.86;
        if (hash(near, 4, 13) > 0.8 && edge > 2 && hash(x >> 1, y >> 1, 17) > 0.5) { r = r * 0.82 + 0.05; gg = gg * 0.85 + 0.11; b *= 0.72; }
        if (dark) { r *= 0.7; gg *= 0.72; b *= 0.82; }
        const i = (y * S + x) * 4;
        p[i] = 255 * clamp(r, 0, 1); p[i + 1] = 255 * clamp(gg, 0, 1); p[i + 2] = 255 * clamp(b, 0, 1); p[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
      return c;
    };
    rock = { lit: make(false), dark: make(true) };
  }
  if (!rock.pl || rock.ctx !== ctx) { rock.ctx = ctx; rock.pl = ctx.createPattern(rock.lit, 'repeat'); rock.pd = ctx.createPattern(rock.dark, 'repeat'); }
  return rock;
}

/** A floor's earth bank (the face of a step one level high): its own ground, darker, as a 32x16 tile. */
function bankOf(f, dark) {
  const key = dark ? '_bankD' : '_bankL';
  if (!f[key]) {
    const c = makeCanvas(32, 16), g = c.getContext('2d');
    g.drawImage(f.img, f.sx + f.w * 0.3, f.sy + f.h * 0.3, f.w * 0.4, f.h * 0.4, 0, 0, 32, 16);
    g.fillStyle = dark ? 'rgba(14,12,10,0.52)' : 'rgba(14,12,10,0.3)'; g.fillRect(0, 0, 32, 16);
    f[key] = c;
  }
  return f[key];
}

// ------------------------------------------------------------------ per-map cache
/** Draw order, face depths, screen boxes and occluders of a height map (built once). */
export function terrainOf(map) {
  if (map._terr) return map._terr;
  const { w, h, hgt, t } = map, N = w * h, base = map.baseLevel ?? 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h || t[y * w + x] !== 1 ? null : hgt[y * w + x]);
  const sw = new Int16Array(N), se = new Int16Array(N), box = new Float32Array(N * 4), order = [], occ = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (t[i] !== 1) continue;
    const v = hgt[i], s = at(x, y + 1), e = at(x + 1, y);
    sw[i] = s === null ? v - base : Math.max(0, v - s);
    se[i] = e === null ? v - base : Math.max(0, v - e);
    const px = (x - y) * HW, py = (x + y) * HH - v * HS;
    box[i * 4] = px - HW; box[i * 4 + 1] = py; box[i * 4 + 2] = px + HW; box[i * 4 + 3] = py + TH + Math.max(sw[i], se[i]) * HS;
    order.push(i);
    // rises toward the camera over a tile behind it: may hide someone standing there
    const b1 = at(x - 1, y), b2 = at(x, y - 1), b3 = at(x - 1, y - 1);
    if ((b1 !== null && b1 < v) || (b2 !== null && b2 < v) || (b3 !== null && b3 < v)) occ.push(i);
  }
  order.sort((a, b) => ((a % w) + ((a / w) | 0)) - ((b % w) + ((b / w) | 0)) || a - b);
  return (map._terr = { sw, se, box, order, occ, objs: new Map() });
}

/** The elevation and picking functions for view.js; null clears them (flat maps). */
export function useTerrain(map) {
  if (!map || !map.hgt) { setElevation(null, null); return; }
  const { w, h, hgt, t } = map;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < w * h; i++) if (t[i] === 1) { lo = Math.min(lo, hgt[i]); hi = Math.max(hi, hgt[i]); }
  const elev = (x, y) => hgt[Math.min(h - 1, Math.max(0, Math.floor(y))) * w + Math.min(w - 1, Math.max(0, Math.floor(x)))] * HS;
  // the first lifted column met going into the screen: from the highest level (nearest the camera) down
  const pick = (wx, wy) => {
    for (let k = hi; k >= lo; k--) {
      const yy = wy + k * HS, x = (wx / HW + yy / HH) / 2, y = (yy / HH - wx / HW) / 2;
      const tx = Math.floor(x), ty = Math.floor(y);
      if (tx < 0 || ty < 0 || tx >= w || ty >= h || t[ty * w + tx] !== 1) continue;
      const v = hgt[ty * w + tx];
      if (v === k) return [x, y];
      if (v > k) return [tx + 0.5, ty + 0.5]; // on that column's cliff face
    }
    const yy = wy + lo * HS;
    return [(wx / HW + yy / HH) / 2, (yy / HH - wx / HW) / 2];
  };
  setElevation(elev, pick);
}

// ------------------------------------------------------------------ drawing
const SOIL = { grass: '#3f5222', moss: '#3c4a22', dirt: '#5a4330', snow: '#d8dde0' };
const pats = new WeakMap();
function bankPattern(ctx, f, dark) {
  const img = bankOf(f, dark);
  let m = pats.get(img);
  if (!m || m.ctx !== ctx) pats.set(img, (m = { ctx, p: ctx.createPattern(img, 'repeat') }));
  return m.p;
}

function quad(ctx, x0, y0, dx, dy, top, bot) {
  ctx.beginPath();
  ctx.moveTo(x0, y0 + top); ctx.lineTo(x0 + dx, y0 + dy + top); ctx.lineTo(x0 + dx, y0 + dy + bot); ctx.lineTo(x0, y0 + bot); ctx.closePath();
}
function face(ctx, R, f, i, x0, y0, dx, dy, depth, dark, deep) {
  const D = depth * HS, soil = f.soil || null, skew = new DOMMatrix([1, dy / dx, 0, 1, 0, 0]);
  // an earth bank under grass, dirt or snow (the whole face of a one-level step), rock below it
  const bank = soil ? Math.min(D, 10) : 0;
  if (bank < D) {
    quad(ctx, x0, y0, dx, dy, bank, D);
    const pat = dark ? R.pd : R.pl;
    pat.setTransform(skew); ctx.fillStyle = pat; ctx.fill();
  }
  if (bank) {
    quad(ctx, x0, y0, dx, dy, 0, bank);
    const pat = bankPattern(ctx, f, dark);
    pat.setTransform(skew); ctx.fillStyle = pat; ctx.fill();
  }
  // darker toward the foot; a skirt over the void fades into the haze below
  quad(ctx, x0, y0, dx, dy, 0, D);
  const gr = ctx.createLinearGradient(0, y0, 0, y0 + D + Math.abs(dy));
  if (deep) { gr.addColorStop(0, 'rgba(10,14,22,0)'); gr.addColorStop(0.3, 'rgba(10,14,22,0.3)'); gr.addColorStop(1, 'rgba(10,14,22,0.95)'); }
  else { gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); }
  ctx.fillStyle = gr; ctx.fill();
  // the turf's lip, with a few tufts hanging over
  if (soil) {
    const lip = 2;
    quad(ctx, x0, y0, dx, dy, 0, lip);
    ctx.fillStyle = SOIL[soil]; ctx.fill();
    ctx.fillStyle = soil === 'snow' ? '#eef2f4' : soil === 'dirt' ? '#4a3626' : '#56702c';
    for (let k = 0; k < 6; k++) {
      const u = hash(i, k, dark ? 41 : 43);
      if (u > 0.75) continue;
      const t = 0.08 + 0.84 * hash(i, k, 47);
      ctx.fillRect(Math.round(x0 + dx * t), Math.round(y0 + dy * t + lip - 1), 2, 1 + Math.floor(u * 4));
    }
  }
  ctx.strokeStyle = soil ? 'rgba(20,16,12,0.3)' : 'rgba(20,16,12,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y0 + 0.5); ctx.lineTo(x0 + dx, y0 + dy + 0.5); ctx.stroke();
}

/** One terrain column: its cliff faces, its top and the shadow cast on it by higher ground behind. */
export function drawColumn(ctx, world, i, floorEntry) {
  const map = world.map, T = terrainOf(map), w = map.w, x = i % w, y = (i / w) | 0, v = map.hgt[i];
  const px = (x - y) * HW, py = (x + y) * HH - v * HS;
  const R = rockPatterns(ctx);
  const f = floorEntry(world, map.v[i]);
  if (T.sw[i]) face(ctx, R, f, i, px - HW, py + HH, HW, HH, T.sw[i], false, y + 1 >= map.h || map.t[i + w] !== 1);
  if (T.se[i]) face(ctx, R, f, i, px, py + TH, HW, -HH, T.se[i], true, x + 1 >= w || map.t[i + 1] !== 1);
  ctx.drawImage(f.img, f.sx, f.sy, f.w, f.h, px - HW - 0.6, py - 0.6, TW + 1.2, TH + 1.2);
  // a higher neighbour behind (NE: y-1, NW: x-1) shades the strip of this top along their shared edge
  const nb = (j) => (j >= 0 && map.t[j] === 1 ? map.hgt[j] - v : 0);
  const ne = y > 0 ? nb(i - w) : 0, nw = x > 0 ? nb(i - 1) : 0;
  if (ne > 0 || nw > 0) {
    ctx.fillStyle = 'rgba(8,10,16,0.2)';
    for (const [d, ax, ay, bx, by] of [[ne, px, py, px + HW, py + HH], [nw, px, py, px - HW, py + HH]]) {
      if (d <= 0) continue;
      const k = Math.min(0.42, 0.14 + d * 0.025);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.lineTo(bx + (px - bx) * k, by + (py + HH - by) * k + HH * k); ctx.lineTo(ax + (px - ax) * k, ay + HH * k * 2);
      ctx.closePath(); ctx.fill();
    }
  }
}

/** Every column overlapping the world px rect, back to front (the floor chunk bake and its fallback). */
export function drawTerrain(ctx, world, x0, y0, x1, y1, floorEntry) {
  const T = terrainOf(world.map), b = T.box;
  for (const i of T.order) {
    const k = i * 4;
    if (b[k] > x1 || b[k + 2] < x0 || b[k + 1] > y1 || b[k + 3] < y0) continue;
    drawColumn(ctx, world, i, floorEntry);
  }
}

/**
 * The sort key of something standing at (x,y) on a height map: its tile's diagonal, nudged by where in the tile it
 * stands, so the column of a tile it stands behind (key tx+ty+0.5) always sorts after it.
 */
export function standKey(x, y) {
  const s = Math.floor(x) + Math.floor(y) + 1;
  return s + (x + y - s) * 0.2;
}

/** Occluding columns in front of someone in `views` (render.js): [[key, obj], ...] to add to the sorted pass. */
export function occludersFor(map, vr, views, out) {
  const T = terrainOf(map), b = T.box, w = map.w;
  for (const i of T.occ) {
    const k = i * 4;
    if (b[k] > vr.x1 || b[k + 2] < vr.x0 || b[k + 1] > vr.y1 || b[k + 3] < vr.y0) continue;
    const key = (i % w) + ((i / w) | 0) + 0.5;
    for (const v of views) {
      if (v.d >= key || v.x + v.hw < b[k] || v.x - v.hw > b[k + 2] || v.y1 < b[k + 1] || v.y0 > b[k + 3]) continue;
      let o = T.objs.get(i);
      if (!o) T.objs.set(i, (o = { ti: i }));
      out.push(key, o);
      break;
    }
  }
  return out;
}

/** World px a creature's sprite rides above its tile's ground while it hops up or drops down a step (0 at rest). */
export function hopZ(o, map) {
  const lv = map.hgt[map.tileIdx(o.x, o.y)];
  if (o._hopMap !== map) { o._hopMap = map; o._lv = lv; o._hop = null; return 0; }
  const now = (hp) => {
    const t = clamp((G.time - hp.t0) / hp.dur, 0, 1);
    return hp.from * (1 - (hp.up ? 1 - (1 - t) * (1 - t) : t * t)) + hp.arc * Math.sin(Math.PI * t);
  };
  if (lv !== o._lv) {
    const cur = o._hop ? now(o._hop) : 0, dl = o._lv - lv; // dl > 0: dropped down
    // a level or so is just walked; a real step up is hopped, a drop fallen
    o._hop = { t0: G.time, from: dl * HS + cur, up: dl < 0, dur: dl < 0 ? 0.1 + -dl * 0.035 : 0.06 + dl * 0.02, arc: dl < -1 ? 2 + -dl * 1.8 : dl > 2 ? 2 : 0 };
    o._lv = lv;
  }
  if (!o._hop) return 0;
  if (G.time - o._hop.t0 >= o._hop.dur) { o._hop = null; return 0; }
  return now(o._hop);
}

// ------------------------------------------------------------------ sky
let skyKey = '', skyCanvas = null;
/** The open sky behind a mountain (screen space): a gradient and two ranges of far peaks drifting with the camera. */
export function drawSky(ctx, W, H, camX, camY, night) {
  const key = W + 'x' + H + (night ? 'n' : 'd');
  if (key !== skyKey) {
    skyKey = key;
    skyCanvas = makeCanvas(W, H);
    const g = skyCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, H);
    if (night) { gr.addColorStop(0, '#0b1426'); gr.addColorStop(0.6, '#1d2a40'); gr.addColorStop(1, '#2a3346'); }
    else { gr.addColorStop(0, '#5f8fc0'); gr.addColorStop(0.55, '#a9c3d6'); gr.addColorStop(1, '#d9dcd2'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  ctx.drawImage(skyCanvas, 0, 0);
  // far ranges: a jagged ridge line per layer, scrolled a little with the camera
  const layers = night ? [['#1a2436', 0.04, 0.5], ['#141c2b', 0.09, 0.62]] : [['#8ea6bb', 0.04, 0.5], ['#71889d', 0.09, 0.62]];
  for (const [col, par, lvl] of layers) {
    const off = camX * par, base = H * lvl - camY * par * 0.5;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, H);
    const step = Math.max(24, W / 40);
    for (let u = Math.floor(off / step) - 1; u <= Math.ceil((off + W) / step) + 1; u++) {
      const sx = u * step - off, peak = hash(u, 1, (par * 1000) | 0), ridge = Math.sin(u * step * 0.004) * H * 0.06;
      ctx.lineTo(sx, base - ridge - peak * H * 0.12);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
}

// ------------------------------------------------------------------ minimap
/** Minimap colour of a tile by height (paler higher up). */
export function terrainShade(map, i) {
  const k = clamp((map.hgt[i] - (map.minLevel || 0)) / Math.max(1, (map.maxLevel || 1) - (map.minLevel || 0)), 0, 1);
  return `rgba(${(120 + 110 * k) | 0},${(140 + 85 * k) | 0},${(95 + 120 * k) | 0},0.6)`;
}
