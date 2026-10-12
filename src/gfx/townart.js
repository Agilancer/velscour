// Procedural placeholder art for the town: ground tiles and isometric buildings.
import { makeCanvas, shade, RNG } from '../core/util.js';
import { HW, HH } from '../core/view.js';
import { pixelSprite } from './pixelart.js';

const LW = 64, LH = 32, UP = 3; // low-res tile then upscale x3 for a pixel look

function inDiamond(x, y) { return Math.abs(x + 0.5 - LW / 2) / (LW / 2) + Math.abs(y + 0.5 - LH / 2) / (LH / 2) <= 1.02; }

function finish(lo) {
  const c = makeCanvas(LW * UP, LH * UP);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(lo, 0, 0, c.width, c.height);
  return c;
}

export function groundTile(kind, seed) {
  const rng = new RNG(seed);
  const lo = makeCanvas(LW, LH);
  const x = lo.getContext('2d');
  const pal = {
    grass: ['#33502a', '#3b5a2e', '#2b4524', '#46663a', '#56743e'],
    dirt: ['#5e4630', '#6a4f36', '#523c28', '#77593c', '#43301f'],
    cobble: ['#5a5650', '#66615a', '#4a4640', '#76716a', '#3a3632'],
    plaza: ['#6e665a', '#7a7164', '#5c554b', '#887e70', '#4a443c'],
  }[kind];
  for (let py = 0; py < LH; py++) {
    for (let px = 0; px < LW; px++) {
      if (!inDiamond(px, py)) continue;
      const r = rng.next();
      x.fillStyle = r < 0.55 ? pal[0] : r < 0.8 ? pal[1] : r < 0.93 ? pal[2] : pal[3];
      x.fillRect(px, py, 1, 1);
    }
  }
  if (kind === 'grass') {
    for (let i = 0; i < 26; i++) {
      const px = rng.int(4, LW - 5), py = rng.int(2, LH - 3);
      if (!inDiamond(px, py)) continue;
      x.fillStyle = pal[4]; x.fillRect(px, py, 1, 2);
      x.fillStyle = pal[2]; x.fillRect(px + 1, py + 1, 1, 1);
    }
    if (rng.chance(0.35)) for (let i = 0; i < 3; i++) {
      const px = rng.int(10, LW - 10), py = rng.int(6, LH - 6);
      if (!inDiamond(px, py)) continue;
      x.fillStyle = rng.pick(['#d8c050', '#c05050', '#a070d0', '#e0e0e0']); x.fillRect(px, py, 1, 1);
    }
  } else if (kind === 'dirt') {
    for (let i = 0; i < 12; i++) {
      const px = rng.int(4, LW - 5), py = rng.int(3, LH - 4);
      if (!inDiamond(px, py)) continue;
      x.fillStyle = pal[3]; x.fillRect(px, py, 2, 1);
      x.fillStyle = pal[4]; x.fillRect(px, py + 1, 2, 1);
    }
  } else {
    // stones: draw a grid of rounded stones following the iso axes
    const step = kind === 'plaza' ? 8 : 6;
    for (let u = 0; u < LW; u += step) {
      for (let v = 0; v < LH * 2; v += step) {
        // iso-ish brick layout
        const cx = u + ((v / step) % 2 ? step / 2 : 0), cy = v / 2;
        if (!inDiamond(cx, cy)) continue;
        x.fillStyle = pal[4];
        x.fillRect(cx - step / 2, cy, step, 1);
        x.fillRect(cx - step / 2, cy - step / 4, 1, step / 4);
      }
    }
  }
  return finish(lo);
}

// ------------------------------------------------------------- buildings
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * spec: { w, d, wall: '#hex', roof: '#hex', style: 'timber'|'stone', door: 'sw'|'se', sign: spriteName, h, tower }
 * Returns { img, ox, oy } - draw at (isoX(x0,y0) - ox, isoY(x0,y0) - oy).
 */
export function buildingSprite(spec) {
  const { w, d } = spec;
  const H = spec.h || 52;
  const roofH = spec.roofH || Math.max(26, Math.min(w, d) * 13);
  const S = 2; // supersample
  const left = d * HW + 10, right = w * HW + 10;
  const top = H + roofH + 30, bottom = (w + d) * HH + 10;
  const cw = left + right, ch = top + bottom;
  const c = makeCanvas(cw * S, ch * S);
  const x = c.getContext('2d');
  x.scale(S, S);
  x.translate(left, top);
  const N = [0, 0], E = [w * HW, w * HH], Sx = [(w - d) * HW, (w + d) * HH], Wc = [-d * HW, d * HH];
  const up = (p, h) => [p[0], p[1] - h];
  const poly = (pts, fill, stroke) => {
    x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath();
    if (fill) { x.fillStyle = fill; x.fill(); }
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.stroke(); }
  };
  const rng = new RNG(spec.seed || 7);

  // shadow
  x.fillStyle = 'rgba(0,0,0,0.35)';
  poly([[N[0] + 6, N[1] + 6], [E[0] + 10, E[1] + 6], [Sx[0] + 6, Sx[1] + 8], [Wc[0] + 2, Wc[1] + 6]], 'rgba(0,0,0,.35)');

  const faces = {
    sw: { a: Wc, b: Sx, base: shade(spec.wall, -0.12) },
    se: { a: Sx, b: E, base: shade(spec.wall, -0.32) },
  };
  for (const key of ['sw', 'se']) {
    const f = faces[key];
    const quad = [f.a, f.b, up(f.b, H), up(f.a, H)];
    x.save();
    poly(quad, f.base);
    x.clip();
    // texture
    const len = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
    if (spec.style === 'stone') {
      for (let row = 0; row * 8 < H; row++) {
        const v = row * 8;
        x.strokeStyle = shade(f.base, -0.3); x.lineWidth = 1;
        const p0 = up(f.a, v), p1 = up(f.b, v);
        x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.stroke();
        for (let u = (row % 2) * 7; u < len; u += 14) {
          const p = up(lerp2(f.a, f.b, u / len), v);
          x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0], p[1] - 8); x.stroke();
        }
        if (rng.chance(0.5)) {
          const p = up(lerp2(f.a, f.b, rng.next()), v + 4);
          x.fillStyle = shade(f.base, 0.12); x.fillRect(p[0], p[1], 4, 2);
        }
      }
    } else {
      // plaster with dark timber frame
      x.fillStyle = shade(f.base, 0.05);
      const beams = Math.max(2, Math.round(len / 28));
      x.strokeStyle = '#2a1a0e'; x.lineWidth = 3;
      for (let i = 0; i <= beams; i++) {
        const p = lerp2(f.a, f.b, i / beams);
        x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0], p[1] - H); x.stroke();
      }
      for (const v of [2, H * 0.5, H - 2]) {
        const p0 = up(f.a, v), p1 = up(f.b, v);
        x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.stroke();
      }
      x.lineWidth = 2;
      for (let i = 0; i < beams; i++) {
        const p0 = lerp2(f.a, f.b, i / beams), p1 = lerp2(f.a, f.b, (i + 1) / beams);
        x.beginPath(); x.moveTo(p0[0], p0[1] - H * 0.5); x.lineTo(p1[0], p1[1] - 2); x.stroke();
      }
    }
    // windows
    const nWin = Math.max(1, Math.floor(len / 40));
    for (let i = 0; i < nWin; i++) {
      const t = (i + 0.5) / nWin;
      if (spec.door === key && Math.abs(t - 0.5) < 0.2) continue;
      const p = up(lerp2(f.a, f.b, t), H * 0.62);
      const dirx = (f.b[0] - f.a[0]) / len, diry = (f.b[1] - f.a[1]) / len;
      const ww = 7, wh = 10;
      const q = [[p[0] - dirx * ww, p[1] - diry * ww], [p[0] + dirx * ww, p[1] + diry * ww], [p[0] + dirx * ww, p[1] + diry * ww - wh], [p[0] - dirx * ww, p[1] - diry * ww - wh]];
      poly(q, '#ffcf6a', '#1a0e06');
      x.strokeStyle = '#3a2210'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0], p[1] - wh); x.stroke();
    }
    x.restore();
    // door
    if (spec.door === key) {
      const dirx = (f.b[0] - f.a[0]) / len, diry = (f.b[1] - f.a[1]) / len;
      const p = lerp2(f.a, f.b, 0.5);
      const dw = 9, dh = 26;
      poly([[p[0] - dirx * dw, p[1] - diry * dw], [p[0] + dirx * dw, p[1] + diry * dw], [p[0] + dirx * dw, p[1] + diry * dw - dh], [p[0] - dirx * dw, p[1] - diry * dw - dh]], '#2a160a', '#0e0804');
      x.fillStyle = '#ffb040'; x.fillRect(p[0] + dirx * 5 - 1, p[1] + diry * 5 - dh / 2, 2, 2);
      // light spill on the ground
      const g = x.createRadialGradient(p[0], p[1] + 8, 2, p[0], p[1] + 8, 40);
      g.addColorStop(0, 'rgba(255,190,90,0.35)'); g.addColorStop(1, 'rgba(255,190,90,0)');
      x.fillStyle = g; x.fillRect(p[0] - 40, p[1] - 30, 80, 70);
      // sign
      if (spec.sign) {
        const sp = up(lerp2(f.a, f.b, 0.5 + (key === 'sw' ? 0.22 : -0.22)), H * 0.92);
        x.strokeStyle = '#1a0e06'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(sp[0], sp[1] - 4); x.lineTo(sp[0], sp[1] + 4); x.stroke();
        x.fillStyle = '#5a3a1a'; x.strokeStyle = '#d0a050';
        x.fillRect(sp[0] - 11, sp[1] + 3, 22, 18); x.strokeRect(sp[0] - 11, sp[1] + 3, 22, 18);
        const icon = pixelSprite(spec.sign, spec.signPal || {}, 2);
        const s = Math.min(18 / icon.width, 15 / icon.height);
        x.drawImage(icon, sp[0] - icon.width * s / 2, sp[1] + 4.5, icon.width * s, icon.height * s);
      }
    }
  }
  // roof (gable)
  const eave = H, rH = H + roofH;
  const roofC = spec.roof;
  if (spec.tower) {
    const apex = up([(N[0] + Sx[0]) / 2, (N[1] + Sx[1]) / 2], rH + 18);
    poly([up(N, eave), up(E, eave), apex], shade(roofC, -0.3), '#120a06');
    poly([up(N, eave), up(Wc, eave), apex], shade(roofC, -0.2), '#120a06');
    poly([up(Wc, eave), up(Sx, eave), apex], shade(roofC, 0.08), '#120a06');
    poly([up(Sx, eave), up(E, eave), apex], shade(roofC, -0.12), '#120a06');
  } else if (w >= d) {
    const rW = up(lerp2(N, Wc, 0.5), rH), rE = up(lerp2(E, Sx, 0.5), rH);
    poly([up(N, eave), up(E, eave), rE, rW], shade(roofC, -0.35), '#120a06');
    poly([up(E, eave), up(Sx, eave), rE], shade(spec.wall, -0.32), '#120a06');
    poly([up(Wc, eave), up(Sx, eave), rE, rW], roofC, '#120a06');
    shingles(x, up(Wc, eave), up(Sx, eave), rE, rW, roofC);
  } else {
    const rN = up(lerp2(N, E, 0.5), rH), rS = up(lerp2(Wc, Sx, 0.5), rH);
    poly([up(N, eave), up(Wc, eave), rS, rN], shade(roofC, -0.35), '#120a06');
    poly([up(Wc, eave), up(Sx, eave), rS], shade(spec.wall, -0.12), '#120a06');
    poly([up(Sx, eave), up(E, eave), rN, rS], shade(roofC, -0.1), '#120a06');
    shingles(x, up(Sx, eave), up(E, eave), rN, rS, shade(roofC, -0.1));
  }
  // chimney
  if (spec.chimney) {
    const p = up(lerp2(N, Sx, 0.35), rH - 6);
    poly([[p[0] - 5, p[1]], [p[0] + 5, p[1] + 3], [p[0] + 5, p[1] - 18], [p[0] - 5, p[1] - 21]], '#4a3a30', '#120a06');
  }
  return { img: c, ox: left, oy: top, scale: 1 / S, w: cw, h: ch };
}

function shingles(x, a, b, c, d, col) {
  x.save();
  x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(c[0], c[1]); x.lineTo(d[0], d[1]); x.closePath(); x.clip();
  x.strokeStyle = shade(col, -0.35); x.lineWidth = 1;
  for (let t = 0.12; t < 1; t += 0.12) {
    const p = lerp2(a, d, t), q = lerp2(b, c, t);
    x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke();
  }
  x.restore();
}
