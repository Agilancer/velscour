// THE DEEP RAIL MINES, drawn (docs/DEEP_RAIL_MINES.md): the rails (ties and two steel rails along each line, on the
// floor under everything else), the junction switches, and the minecart: a three.js model baked once into sprites
// from the game's own camera (orthographic, 30 degrees down, 45 round; one unit = one tile), 32 headings round a full
// turn (a lamp hangs off its front, so it faces the way it rolls, down a line or back up it), each twice: the whole
// cart, and only its near walls and wheels, drawn again over a rider so he stands inside it. Without three.js a flat
// 2D cart stands in.
import { isoX, isoY, camera, HW } from '../core/view.js';
import { makeCanvas } from '../core/util.js';

const SC = HW * Math.SQRT2;            // world px per tile (one three.js unit) across the screen
const N = 32, OS = 2, CW = 220, CH = 170, OY = 0.7;   // headings; oversampling; cell size (baked px); the foot's height in the cell
let T = null, ATLAS = null;

/** three.js and the cart sprites. Rejects if three.js can't be fetched (the 2D cart stands in). */
export async function loadMinecart3D() {
  if (ATLAS) return;
  if (!T) T = await import('three');
  ATLAS = bakeCart();
}
export const minecartReady = () => !!ATLAS;

function planks() {   // a weathered plank texture for the hull
  const c = makeCanvas(64, 64), g = c.getContext('2d');
  g.fillStyle = '#6a4a2e'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = ['#714f31', '#5f4128', '#6d4c2f', '#5a3d26'][i]; g.fillRect(0, i * 16 + 1, 64, 14);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 16 + 15, 64, 2);
    for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(${k % 2 ? '255,230,190' : '30,18,8'},0.08)`; g.fillRect((k * 23) % 64, i * 16 + 2 + (k * 7) % 12, 10 + (k % 5) * 3, 1); }
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter;
  return t;
}

function bakeCart() {
  const gl = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  gl.setPixelRatio(1); gl.setSize(CW, CH, false); gl.setClearColor(0x000000, 0);
  const sc = SC * OS, cam = new T.OrthographicCamera(-CW / 2 / sc, CW / 2 / sc, (CH * OY) / sc, -(CH * (1 - OY)) / sc, 0.1, 200);
  const e = Math.PI / 6, a = Math.PI / 4;
  cam.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(60);
  cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  const scene = new T.Scene();
  scene.add(new T.AmbientLight(0xfff0e0, 1.25));
  const sun = new T.DirectionalLight(0xffe6c0, 2.4); sun.position.set(-0.6, 2, 1.4); scene.add(sun);
  const wood = new T.MeshLambertMaterial({ map: planks() }), iron = new T.MeshLambertMaterial({ color: 0x3a3a42 }), dark = new T.MeshLambertMaterial({ color: 0x24242a });
  const rust = new T.MeshLambertMaterial({ color: 0x6a4030 }), ore = new T.MeshLambertMaterial({ color: 0x5c4a3a, flatShading: true });
  const gold = new T.MeshLambertMaterial({ color: 0xd8a838, emissive: 0x3a2808, flatShading: true });
  const cart = new T.Group(); scene.add(cart);
  const Lx = 1.55, Wz = 0.98, H = 0.58, y0 = 0.22, th = 0.08;
  const part = (geo, mat, x, y, z, front) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.userData.c = [x, z]; m.userData.front = front; cart.add(m); return m; };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  // the hull: four plank walls and a floor, iron bands round the top and the middle, iron corner posts
  part(box(Lx, th, Wz), wood, 0, y0, 0, false);
  for (const s of [-1, 1]) {
    part(box(th, H, Wz), wood, s * (Lx / 2 - th / 2), y0 + H / 2, 0, true);
    part(box(Lx, H, th), wood, 0, y0 + H / 2, s * (Wz / 2 - th / 2), true);
    part(box(th + 0.03, 0.07, Wz + 0.03), iron, s * (Lx / 2 - th / 2), y0 + H - 0.03, 0, true);
    part(box(Lx + 0.03, 0.07, th + 0.03), iron, 0, y0 + H - 0.03, s * (Wz / 2 - th / 2), true);
    part(box(th + 0.02, 0.05, Wz + 0.02), rust, s * (Lx / 2 - th / 2), y0 + H * 0.45, 0, true);
    part(box(Lx + 0.02, 0.05, th + 0.02), rust, 0, y0 + H * 0.45, s * (Wz / 2 - th / 2), true);
    for (const t of [-1, 1]) part(box(0.09, H + 0.04, 0.09), iron, s * (Lx / 2 - 0.03), y0 + H / 2, t * (Wz / 2 - 0.03), true);
  }
  // the chassis and four iron wheels
  for (const s of [-1, 1]) part(box(Lx * 0.92, 0.08, 0.1), dark, 0, y0 - 0.06, s * 0.26, false);
  const wheel = new T.CylinderGeometry(0.17, 0.17, 0.08, 14), hub = new T.CylinderGeometry(0.05, 0.05, 0.1, 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(wheel, dark, sx * 0.5, 0.17, sz * (Wz / 2 + 0.02), true).rotation.x = Math.PI / 2;
    part(hub, rust, sx * 0.5, 0.17, sz * (Wz / 2 + 0.05), true).rotation.x = Math.PI / 2;
  }
  // a load of ore, a few nuggets catching the lamp light
  const rock = (r, m, x, y, z) => { const g = new T.IcosahedronGeometry(r, 0); part(g, m, x, y, z, false).rotation.set(x * 7, z * 5, y * 3); };
  for (let i = 0; i < 14; i++) { const u = (i * 0.618) % 1, v = (i * 0.414) % 1; rock(0.11 + (i % 4) * 0.03, i % 7 === 3 ? gold : ore, (u - 0.5) * (Lx - 0.35), y0 + H * 0.62 + (i % 3) * 0.05, (v - 0.5) * (Wz - 0.3)); }
  // the front (+x, the way it rolls): a lamp on an iron bracket; the back: a brake lever
  part(box(0.05, 0.42, 0.05), iron, Lx / 2 + 0.04, y0 + H + 0.12, 0, true);
  part(box(0.2, 0.04, 0.05), iron, Lx / 2 + 0.12, y0 + H + 0.32, 0, true);
  part(box(0.13, 0.16, 0.13), new T.MeshLambertMaterial({ color: 0xffd070, emissive: 0xffa020, emissiveIntensity: 1.4 }), Lx / 2 + 0.2, y0 + H + 0.22, 0, true);
  part(box(0.15, 0.03, 0.15), dark, Lx / 2 + 0.2, y0 + H + 0.31, 0, true);
  part(box(0.05, 0.5, 0.05), rust, -Lx / 2 - 0.05, y0 + H * 0.5, Wz * 0.3, true).rotation.z = 0.35;
  // bake: every heading, the whole cart (row 0) and its near half (row 1)
  const atlas = makeCanvas(CW * N, CH * 2), ag = atlas.getContext('2d');
  const toCam = [Math.SQRT1_2, Math.SQRT1_2];
  for (let i = 0; i < N; i++) {
    const phi = -(i * 2 * Math.PI) / N;
    cart.rotation.y = phi;
    for (const layer of [0, 1]) {
      for (const m of cart.children) {
        if (!layer) { m.visible = true; continue; }
        const [x, z] = m.userData.c, wx = x * Math.cos(phi) + z * Math.sin(phi), wz = -x * Math.sin(phi) + z * Math.cos(phi);
        m.visible = m.userData.front && wx * toCam[0] + wz * toCam[1] > 0.02;
      }
      gl.render(scene, cam);
      ag.drawImage(gl.domElement, i * CW, layer * CH);
    }
  }
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  gl.dispose(); gl.forceContextLoss?.();
  return atlas;
}

/** A heading in tiles (radians) to its baked column. */
const col = (ang) => { const T2 = 2 * Math.PI, a = ((ang % T2) + T2) % T2; return Math.round(a / (T2 / N)) % N; };

/** The minecart at (x, y) heading `ang`; layer 0 the whole cart, 1 its near walls only (over a rider). */
export function drawCart(ctx, x, y, ang, layer = 0, alpha = 1) {
  const px = isoX(x, y), py = isoY(x, y);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (layer === 0) {   // its shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(px, py + 2, 34, 15, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (ATLAS) {
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(ATLAS, col(ang) * CW, layer * CH, CW, CH, px - CW / 2 / OS, py - (CH * OY) / OS, CW / OS, CH / OS);
    ctx.imageSmoothingEnabled = sm;
  } else flatCart(ctx, x, y, ang, layer);
  if (alpha < 1) ctx.globalAlpha = 1;
}
function flatCart(ctx, x, y, ang, layer) {
  const c = Math.cos(ang), s = Math.sin(ang), L = 0.65, Wd = 0.41, h = 22;
  const P = (u, v) => [isoX(x + c * u - s * v, y + s * u + c * v), isoY(x + c * u - s * v, y + s * u + c * v) - 6];
  const q = [P(-L, -Wd), P(L, -Wd), P(L, Wd), P(-L, Wd)];
  ctx.fillStyle = layer ? 'rgba(92,64,40,0.9)' : '#5a3e26'; ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2;
  ctx.beginPath(); q.forEach(([a, b], i) => (i ? ctx.lineTo(a, b - h) : ctx.moveTo(a, b - h))); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (layer) return;
  ctx.beginPath(); q.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fill(); ctx.stroke();
  const [lx, ly] = P(L + 0.12, 0); ctx.fillStyle = '#ffd070'; ctx.fillRect(lx - 3, ly - h - 10, 6, 7);   // the lamp at its front
}

/** A junction switch: an iron post, a lever thrown toward the line it's set to (-1 left / +1 right), a lamp on top. */
export function drawLever(ctx, x, y, side, hot) {
  const px = isoX(x, y), py = isoY(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px, py + 1, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3a42'; ctx.fillRect(px - 9, py - 6, 18, 6);   // the base plate
  ctx.fillStyle = '#24242a'; ctx.fillRect(px - 9, py - 1, 18, 2);
  ctx.strokeStyle = '#6a4a30'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px + side * 12, py - 30); ctx.stroke();
  ctx.fillStyle = hot ? '#ffcf70' : '#c04030';
  ctx.beginPath(); ctx.arc(px + side * 12, py - 31, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';
}

// --------------------------------------------------------------------------- the rails
/** Precompute a line's ties and rails (world px) in pieces with bounds, for cheap culling. */
export function railArt(line) {
  const pieces = [], P = line.pts, gauge = 0.3, tie = 0.48, tw = 0.09;
  for (let i0 = 0; i0 < P.length - 1; i0 += 24) {
    const pc = { ties: [], l: [], r: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (let i = i0; i <= Math.min(P.length - 1, i0 + 24); i++) {
      const [x, y, a] = P[i], c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
      const w = (u, v) => [isoX(x + c * u + nx * v, y + s * u + ny * v), isoY(x + c * u + nx * v, y + s * u + ny * v)];
      if (i % 2 === 0 && i < P.length - 1) pc.ties.push([w(-tw, -tie), w(tw, -tie), w(tw, tie), w(-tw, tie)]);
      pc.l.push(w(0, -gauge)); pc.r.push(w(0, gauge));
      const [wx, wy] = w(0, 0);
      pc.x0 = Math.min(pc.x0, wx - 24); pc.x1 = Math.max(pc.x1, wx + 24); pc.y0 = Math.min(pc.y0, wy - 16); pc.y1 = Math.max(pc.y1, wy + 16);
    }
    pieces.push(pc);
  }
  return pieces;
}
/** Every line's rails in view (on the floor, under everything; render.js draws ground hazards there). */
export function drawRails(ctx, arts) {
  const vr = camera.viewRect(40);
  const line = (pts, dy) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy))); ctx.stroke(); };
  ctx.lineJoin = 'round';
  for (const pieces of arts) for (const pc of pieces) {
    if (pc.x1 < vr.x0 || pc.x0 > vr.x1 || pc.y1 < vr.y0 || pc.y0 > vr.y1) continue;
    ctx.fillStyle = '#3e2c1e'; ctx.strokeStyle = 'rgba(16,10,6,0.6)'; ctx.lineWidth = 1;
    for (const q of pc.ties) { ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.lineTo(...q[2]); ctx.lineTo(...q[3]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = '#1c1a1c'; ctx.lineWidth = 3.2; line(pc.l, 1); line(pc.r, 1);
    ctx.strokeStyle = '#7c7a80'; ctx.lineWidth = 2; line(pc.l, -0.5); line(pc.r, -0.5);
    ctx.strokeStyle = 'rgba(220,210,200,0.55)'; ctx.lineWidth = 0.8; line(pc.l, -1.2); line(pc.r, -1.2);
  }
}
/** A buffer stop at the end of a line: a timber beam across the rails. */
export function drawBuffer(ctx, x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const w = (u, v, z = 0) => [isoX(x + c * u + nx * v, y + s * u + ny * v), isoY(x + c * u + nx * v, y + s * u + ny * v) - z];
  ctx.fillStyle = '#4a3220'; ctx.strokeStyle = '#21160e'; ctx.lineWidth = 1.5;
  for (const v of [-0.38, 0.38]) { const [a, b] = w(0, v); ctx.fillRect(a - 2.5, b - 12, 5, 12); }
  const p = [w(-0.08, -0.48, 12), w(0.08, -0.48, 12), w(0.08, 0.48, 12), w(-0.08, 0.48, 12)];
  ctx.beginPath(); ctx.moveTo(...p[0]); p.slice(1).forEach((q) => ctx.lineTo(...q)); ctx.closePath(); ctx.fill(); ctx.stroke();
  const [a, b] = w(0, 0, 12); ctx.fillStyle = '#a02818'; ctx.fillRect(a - 4, b - 7, 8, 5);
}
/** The baked atlas (tests look at it). */
export const minecartAtlas = () => ATLAS;
