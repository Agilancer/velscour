// The Rogue's and the Ninja's steel as live three.js models: thrown, raining and orbiting daggers, the one giant dagger
// that falls out of the sky, daggers that burst from the ground, shuriken, kunai, caltrops and the grappling hook.
// One shared offscreen WebGL canvas renders a model at a pose; small flying pieces are cached as sprites (a roll or spin
// step per sprite, turned in 2D to their heading), the big ones are rendered every frame. three.js loads on first use:
// until then drawBlade3D returns false and the caller draws its 2D shape.
import { isoX, isoY } from '../core/view.js';
import { glowSprite } from './vfx.js';

const TAU = Math.PI * 2, GL = 320, FRUST = 0.62; // the models are about 1 unit long; the camera sees 1.24 units
let T = null, R = null, boot = null, dead = false;
const MODELS = {}, SPR = new Map();

function studio() { // what the steel reflects: a dim room with a few bright panels
  const sc = new T.Scene(), box = new T.BoxGeometry(1, 1, 1);
  sc.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x6a6c7c, side: T.BackSide })));
  for (const [x, y, z, sx, sy, sz, c, k] of [[0, 5.8, 0, 7, 0.1, 7, 0xffffff, 6], [-5.8, 2, 3, 0.1, 4, 5, 0xfff0d8, 3.5], [5.8, 1, -2, 0.1, 3, 4, 0xc0d4ff, 2.5], [0, 1, 5.8, 5, 3, 0.1, 0xffffff, 2]]) {
    const m = new T.Mesh(box, new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k) }));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); sc.add(m);
  }
  return sc;
}
function start() {
  if (dead || typeof document === 'undefined' || typeof globalThis.location === 'undefined') return null;
  return (boot ||= import('three').then((t) => {
    T = t;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = GL;
    const gl = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    gl.setPixelRatio(1); gl.outputColorSpace = T.SRGBColorSpace; gl.setClearColor(0, 0);
    const scene = new T.Scene();
    scene.environment = new T.PMREMGenerator(gl).fromScene(studio(), 0.04).texture; scene.environmentIntensity = 1.5;
    const key = new T.DirectionalLight(0xfff2e0, 3.4); key.position.set(-0.7, 1, 0.9);
    const rim = new T.DirectionalLight(0xaac8ff, 1.3); rim.position.set(0.9, 0.4, -0.5);
    scene.add(key, rim, new T.HemisphereLight(0xdfe4ff, 0x3a2a26, 1.2));
    const cam = new T.OrthographicCamera(-FRUST, FRUST, FRUST, -FRUST, -10, 10); cam.position.z = 4;
    const pivot = new T.Group(); scene.add(pivot);
    build();
    R = { gl, canvas, scene, cam, pivot };
  }).catch((e) => { dead = true; console.warn('3D blades unavailable:', e); }));
}
export function preloadBlades3D() { start(); }
export const blades3DReady = () => !!R;

// ------------------------------------------------------------------ textures
function tex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}
/** Folded steel: a brushed grain along the blade, a wavy temper line, dried blood toward the point when `blood`. */
function steelTex(blood, tone = '#c9d0dc') {
  return tex(64, 256, (x, w, h) => {
    x.fillStyle = tone; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) { // grain
      x.fillStyle = `rgba(${i % 2 ? '255,255,255' : '20,24,34'},${0.03 + (i % 7) * 0.012})`;
      x.fillRect((i * 37) % w, (i * 91) % h, 1, 8 + (i % 23));
    }
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 3; x.beginPath(); // the temper line near both edges
    for (const ex of [10, w - 10]) { x.moveTo(ex, 0); for (let y = 0; y <= h; y += 8) x.lineTo(ex + Math.sin(y * 0.21 + ex) * 3.2, y); }
    x.stroke();
    x.fillStyle = 'rgba(16,18,26,0.5)'; x.fillRect(w / 2 - 2, 20, 4, h - 70); // the fuller
    if (blood) for (let i = 0; i < 26; i++) {
      const y = 6 + ((i * 53) % 120), xx = (i * 29) % w, r = 3 + (i % 5) * 2;
      x.fillStyle = `rgba(${110 + (i % 4) * 16},6,10,${0.5 + (i % 3) * 0.14})`;
      x.beginPath(); x.ellipse(xx, y, r * 0.7, r * 1.9, 0, 0, TAU); x.fill();
    }
  });
}
const wrapTex = (a, b) => tex(32, 64, (x, w, h) => { // a cord grip: crossed lacing
  x.fillStyle = a; x.fillRect(0, 0, w, h); x.strokeStyle = b; x.lineWidth = 3;
  for (let y = -16; y < h + 16; y += 12) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + 14); x.moveTo(w, y); x.lineTo(0, y + 14); x.stroke(); }
});

// ------------------------------------------------------------------ models (long axis +Y, point at the top)
/** A blade of rhombic section from y0 to the point at y1: prof(u) its half width along the way, th its half thickness. */
function bladeGeo(y0, y1, prof, th, n = 9, curve = 0) {
  const pos = [], uv = [], ring = (i) => {
    const u = i / n, y = y0 + (y1 - y0) * u, w = prof(u), t = th * (1 - u * 0.55), cx = curve * u * u;
    return [[cx - w, y, 0, 0, u], [cx, y, t, 0.5, u], [cx + w, y, 0, 1, u], [cx, y, -t, 0.5, u]];
  };
  const tri = (a, b, c) => { for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); uv.push(p[3], p[4]); } };
  for (let i = 0; i < n; i++) {
    const A = ring(i), B = ring(i + 1);
    for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; tri(A[k], A[k1], B[k1]); tri(A[k], B[k1], B[k]); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function build() {
  const M = (o) => new T.MeshStandardMaterial(o);
  const steel = M({ map: steelTex(true, '#e4e9f2'), metalness: 0.9, roughness: 0.26, side: T.DoubleSide, emissive: 0x30343c });
  const clean = M({ map: steelTex(false, '#e8eef8'), metalness: 0.9, roughness: 0.22, side: T.DoubleSide, emissive: 0x2c3038 });
  const dark = M({ map: steelTex(false, '#8a92a4'), metalness: 0.9, roughness: 0.3, side: T.DoubleSide, emissive: 0x181a20 });
  const brass = M({ color: 0x8a6a34, metalness: 1, roughness: 0.34 }), pewter = M({ color: 0x70747e, metalness: 1, roughness: 0.3 });
  const grip = M({ map: wrapTex('#1a0c0e', '#5a1218'), roughness: 0.85 }), cord = M({ map: wrapTex('#15151c', '#2c3a58'), roughness: 0.9 });
  const ruby = M({ color: 0xd01828, emissive: 0xa00818, emissiveIntensity: 1.3, roughness: 0.1, metalness: 0.2 });
  const add = (g, ...ms) => { for (const m of ms) g.add(m); return g; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); return m; };

  // the Rogue's dagger: a leaf blade with a fuller, a swept guard, a laced grip, a ruby in the pommel
  const leaf = (u) => 0.012 + 0.075 * Math.sin(Math.min(1, u * 1.08 + 0.12) * Math.PI) ** 0.6 * (1 - u * 0.55) * (u > 0.97 ? (1 - u) / 0.03 : 1);
  const dg = new T.Group();
  add(dg, mesh(bladeGeo(-0.1, 0.5, leaf, 0.02, 12), steel));
  const gd = mesh(new T.BoxGeometry(0.26, 0.032, 0.06), brass, 0, -0.11);
  for (const s of [-1, 1]) { const q = mesh(new T.ConeGeometry(0.022, 0.07, 6), brass, s * 0.135, -0.085); q.rotation.z = s * -0.5; dg.add(q); }
  add(dg, gd, mesh(new T.CylinderGeometry(0.026, 0.03, 0.24, 8), grip, 0, -0.245), mesh(new T.CylinderGeometry(0.036, 0.036, 0.02, 8), brass, 0, -0.37),
    mesh(new T.OctahedronGeometry(0.042, 0), ruby, 0, -0.415));
  MODELS.dagger = { obj: dg, glow: '#ff3040' };

  // kunai: a short broad point, a thin wrapped tang, a ring
  const kn = new T.Group(), kp = (u) => 0.01 + 0.09 * (u < 0.3 ? u / 0.3 : (1 - u) / 0.7);
  const ring = mesh(new T.TorusGeometry(0.055, 0.014, 6, 14), dark, 0, -0.43);
  add(kn, mesh(bladeGeo(-0.08, 0.5, kp, 0.022, 8), dark), mesh(new T.CylinderGeometry(0.018, 0.018, 0.3, 6), cord, 0, -0.23), ring);
  MODELS.kunai = { obj: kn, glow: '#ffb060' };

  // shuriken: a four-point star with swept edges and a pierced centre (spins about +Z, drawn lying nearly flat)
  const sh = new T.Shape(), P = 4;
  for (let i = 0; i < P; i++) {
    const a = (i / P) * TAU, b = a + TAU / P / 2, c = a + TAU / P;
    if (!i) sh.moveTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5);
    sh.quadraticCurveTo(Math.cos(a + 0.5) * 0.2, Math.sin(a + 0.5) * 0.2, Math.cos(b) * 0.15, Math.sin(b) * 0.15);
    sh.lineTo(Math.cos(c) * 0.5, Math.sin(c) * 0.5);
  }
  const hole = new T.Path(); hole.absarc(0, 0, 0.055, 0, TAU, true); sh.holes.push(hole);
  const sg = new T.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.03, bevelSegments: 1, curveSegments: 5 });
  sg.translate(0, 0, -0.015);
  MODELS.shuriken = { obj: add(new T.Group(), mesh(sg, clean)), flat: true, glow: '#9fd8ff' };

  // caltrop: four spikes to the corners of a tetrahedron
  const ct = new T.Group();
  for (const v of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) {
    const c = mesh(new T.ConeGeometry(0.07, 0.5, 5), dark), d = new T.Vector3(...v).normalize();
    c.position.copy(d).multiplyScalar(0.24); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); ct.add(c);
  }
  MODELS.caltrop = { obj: ct, flat: true, glow: '#c0c8d8' };

  // the grappling hook: a shank, an eye for the rope, three barbed claws curling back
  const hk = new T.Group();
  add(hk, mesh(new T.CylinderGeometry(0.03, 0.036, 0.62, 8), pewter, 0, 0.02), mesh(new T.TorusGeometry(0.06, 0.018, 6, 14), pewter, 0, -0.35));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5, pts = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8, th = u * 2.5; pts.push(new T.Vector3(Math.cos(a) * 0.24 * (1 - Math.cos(th)) * 0.9, 0.33 + Math.sin(th) * 0.16 - u * 0.02, Math.sin(a) * 0.24 * (1 - Math.cos(th)) * 0.9)); }
    hk.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, 0.028 , 6), clean));
  }
  MODELS.hook = { obj: hk, glow: '#d0e0ff' };
  for (const m of Object.values(MODELS)) m.obj.visible = false;
}
/** Swap a kind's model for another Object3D (e.g. the Rogue's equipped dagger, a three.js JSON from the held-gear bake):
 *  long axis +Y, `len` its length in its own units, `mid` the y of its middle. */
export function setBladeModel(kind, obj, len, mid = 0) {
  if (!R || !MODELS[kind]) return;
  const g = new T.Group(); obj.position.y = -mid; g.add(obj); g.scale.setScalar(1 / len); g.visible = false;
  MODELS[kind] = { ...MODELS[kind], obj: g };
  for (const k of [...SPR.keys()]) if (k.startsWith(kind + '|')) SPR.delete(k);
}

// ------------------------------------------------------------------ rendering
/** Render `kind` into the GL canvas' bottom-left px x px. A long piece points along screen +X rolled `roll` about its
 *  axis and pitched `pitch` toward the camera; a flat one lies tilted `pitch` from the camera, spun `roll`. */
function render(kind, px, roll, pitch) {
  const M = MODELS[kind], { gl, scene, cam, pivot } = R;
  if (M.obj.parent !== pivot) pivot.add(M.obj);
  for (const c of pivot.children) c.visible = c === M.obj;
  const o = M.obj;
  o.rotation.set(0, 0, 0);
  if (M.flat) { o.rotation.order = 'XZY'; o.rotation.x = -pitch; o.rotation.z = roll; }
  else { o.rotation.order = 'ZXY'; o.rotation.z = -Math.PI / 2; o.rotation.x = pitch; o.rotation.y = roll; }
  px = Math.min(GL, px);
  gl.setViewport(0, 0, px, px); gl.setScissor(0, 0, px, px); gl.setScissorTest(true); gl.clear(); gl.render(scene, cam);
  return px;
}
function sprite(kind, px, step, steps, pitch) {
  const key = `${kind}|${px}|${step}|${pitch}`;
  let c = SPR.get(key);
  if (c) return c;
  if (SPR.size > 1400) SPR.clear();
  const n = render(kind, px, (step / steps) * TAU, pitch);
  c = document.createElement('canvas'); c.width = c.height = n;
  c.getContext('2d').drawImage(R.canvas, 0, GL - n, n, n, 0, 0, n, n);
  SPR.set(key, c);
  return c;
}
const wrap = (v, n) => ((Math.round(v) % n) + n) % n;

/**
 * Draw a flying piece at screen (x, y): `a` its heading on screen (rad), `s` its size, `t` its age (it rolls or spins),
 * o.len px length at size 1, o.glow a halo's strength. False until three.js is in (the caller draws its 2D shape).
 */
export function drawBlade3D(ctx, kind, x, y, a, s, t, o = {}) {
  if (!R) { start(); return false; }
  const M = MODELS[kind];
  if (!M) return false;
  const len = (o.len || (kind === 'shuriken' ? 20 : kind === 'caltrop' ? 12 : 30)) * s, px = Math.max(8, Math.round(len * 1.24 / 2) * 2);
  if (o.glow !== 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= o.glow ?? 0.35;
    const r = len * 0.7; ctx.drawImage(glowSprite(o.color || M.glow), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha /= o.glow ?? 0.35; ctx.globalCompositeOperation = 'source-over';
  }
  if (M.flat) {
    const img = sprite(kind, px, wrap((o.still ? o.seed || 0 : t * (o.spin ?? 22)) / TAU * 24, 24), 24, o.pitch ?? 1.02);
    ctx.drawImage(img, x - px / 2, y - px / 2);
  } else {
    const img = sprite(kind, px, wrap((t * (o.spin ?? 10) + (o.seed || 0)) / TAU * 12, 12), 12, o.pitch ?? 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.drawImage(img, -px / 2, -px / 2); ctx.restore();
  }
  return true;
}
let STAR = null; // the shuriken's outline at radius 1 (as the model's: points at 0.5, waist 0.15)
function starPath() {
  if (STAR) return STAR;
  STAR = new Path2D();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU, b = a + TAU / 8, c = a + TAU / 4;
    if (!i) STAR.moveTo(Math.cos(a), Math.sin(a));
    STAR.quadraticCurveTo(Math.cos(a + 0.5) * 0.4, Math.sin(a + 0.5) * 0.4, Math.cos(b) * 0.3, Math.sin(b) * 0.3);
    STAR.lineTo(Math.cos(c), Math.sin(c));
  }
  return STAR;
}
/** A shuriken's shadow on the ground at screen (x, gy), `lift` px below the star, size `s`, age `t` (it turns with the
 *  star's spin). Spread wider and fainter the higher it flies, so a falling star's shadow closes in under it. */
export function drawStarShadow(ctx, x, gy, lift, s, t, spin = 22) {
  if (typeof Path2D === 'undefined') return;
  const h = Math.max(0, lift), r = 10 * s * (1 + Math.min(h, 320) / 400), prev = ctx.globalAlpha;
  const ang = Math.round(t * spin / TAU * 24) / 24 * TAU; // the sprite's spin step
  ctx.save(); ctx.translate(x, gy); ctx.scale(r, r * 0.5); ctx.rotate(ang);
  ctx.globalAlpha = prev * 0.62 * Math.max(0.35, 1 - h / 300); ctx.fillStyle = '#000';
  ctx.fill(starPath());
  ctx.restore(); ctx.globalAlpha = prev;
}
/** A big piece rendered now (no cache): centred at (x, y), `len` px long, heading `a`, rolled and pitched. */
export function drawBigBlade3D(ctx, kind, x, y, a, len, roll, pitch = 0.3) {
  if (!R) { start(); return false; }
  const want = Math.round(len * 1.24), n = render(kind, Math.min(GL, want), roll, pitch);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.drawImage(R.canvas, 0, GL - n, n, n, -want / 2, -want / 2, want, want);
  ctx.restore();
  return true;
}

// ------------------------------------------------------------------ effects
/** One giant dagger falls out of the sky onto (x, y), buries its point, quivers and fades (the impact is the caller's).
 *  o.model(ctx, px, tipY, len, spin) -> bool draws another blade in its place (the Rogue's own equipped dagger). */
export class GiantBlade {
  constructor(x, y, o = {}) { Object.assign(this, { x, y, t: 0, fall: 0.9, hold: 1.1, len: 230, h: 620, kind: 'dagger', color: '#ff2030' }, o); start(); }
  update(dt) { this.t += dt; return this.t < this.fall + this.hold; }
  get depth() { return this.x + this.y + 0.5; }
  draw(ctx) {
    const k = Math.min(1, this.t / this.fall), z = this.h * (1 - k * k * k), land = this.t - this.fall;
    const px = isoX(this.x, this.y), gy = isoY(this.x, this.y), L = this.len, prev = ctx.globalAlpha;
    const fade = land > this.hold - 0.35 ? Math.max(0, (this.hold - land) / 0.35) : 1;
    ctx.globalAlpha = prev * 0.45 * k * fade; ctx.fillStyle = '#000'; // its shadow closes in
    ctx.beginPath(); ctx.ellipse(px, gy, L * 0.28 * (1.6 - 0.6 * k), L * 0.11 * (1.6 - 0.6 * k), 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = prev * 0.6 * fade;
    const r = L * 0.75; ctx.drawImage(glowSprite(this.color), px - r, gy - z - L * 0.55 - r, r * 2, r * 2);
    if (land < 0) { // streaks of its fall
      ctx.strokeStyle = 'rgba(255,220,220,0.5)'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(px + i * L * 0.045, gy - z - L * 0.9); ctx.lineTo(px + i * L * 0.045, gy - z - L * (1.5 + (i & 1) * 0.5)); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = prev * fade;
    const tip = gy - z + L * 0.16 * k, shake = land > 0 && land < 0.5 ? Math.sin(land * 60) * (0.5 - land) * 0.09 : 0;
    ctx.save();
    if (land >= 0) { ctx.beginPath(); ctx.rect(px - L, gy - L * 2, L * 2, L * 2); ctx.clip(); } // the point is in the ground
    ctx.translate(px, tip); ctx.rotate(shake); ctx.translate(-px, -tip);
    const spin = 0.35 + (land < 0 ? this.t * 5 : this.fall * 5);
    if (!(this.model && this.model(ctx, px, tip, L, spin)) && !drawBigBlade3D(ctx, this.kind, px, tip - L / 2, Math.PI / 2, L, spin, 0.22)) {
      ctx.fillStyle = '#d0d6e0'; ctx.beginPath(); ctx.moveTo(px, tip); ctx.lineTo(px - L * 0.07, tip - L * 0.7); ctx.lineTo(px + L * 0.07, tip - L * 0.7); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = prev;
  }
}

/** Daggers burst point-first out of the ground around (x, y) and sink back: o.n of them inside o.r tiles, o.spread s apart. */
export class GroundBlades {
  constructor(x, y, o = {}) {
    Object.assign(this, { x, y, t: 0, r: 1.5, n: 9, len: 46, hold: 0.55, spread: 0.3, kind: 'dagger', color: '#ff2030', onPop: null }, o);
    start();
    this.b = [];
    for (let i = 0; i < this.n; i++) {
      const a = o.line != null ? o.line : Math.random() * TAU, d = o.line != null ? (i + 1) / this.n * this.r : Math.sqrt(Math.random()) * this.r;
      const j = o.line != null ? (Math.random() - 0.5) * 0.5 : 0;
      this.b.push({ x: x + Math.cos(a) * d - Math.sin(a) * j, y: y + Math.sin(a) * d + Math.cos(a) * j, at: o.line != null ? (i / this.n) * this.spread : Math.random() * this.spread,
        lean: (Math.random() - 0.5) * 0.5, k: 0.75 + Math.random() * 0.6, seed: Math.random() * 6, popped: false });
    }
    this.b.sort((p, q) => p.x + p.y - q.x - q.y);
    this.life = this.spread + 0.16 + this.hold + 0.3;
  }
  get depth() { return this.x + this.y + 0.3; }
  update(dt) {
    this.t += dt;
    for (const b of this.b) if (!b.popped && this.t >= b.at) { b.popped = true; if (this.onPop) this.onPop(b.x, b.y); }
    return this.t < this.life;
  }
  draw(ctx) {
    for (const b of this.b) {
      const u = this.t - b.at;
      if (u < 0 || u > 0.16 + this.hold + 0.3) continue;
      const L = this.len * b.k, up = u < 0.16 ? 1 - (1 - u / 0.16) ** 3 : u < 0.16 + this.hold ? 1 : Math.max(0, 1 - (u - 0.16 - this.hold) / 0.3);
      const px = isoX(b.x, b.y), gy = isoY(b.x, b.y), top = gy - L * 0.82 * up * (u < 0.16 ? 1.12 : 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(px - L, gy - L * 2, L * 2, L * 2); ctx.clip();
      ctx.translate(px, gy); ctx.rotate(b.lean); ctx.translate(-px, -gy);
      if (!drawBlade3D(ctx, this.kind, px, top + L / 2, -Math.PI / 2, 1, 0, { len: L, spin: 0, seed: b.seed, color: this.color, glow: 0.3 })) {
        ctx.fillStyle = '#d0d6e0'; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px - L * 0.08, gy); ctx.lineTo(px + L * 0.08, gy); ctx.fill();
      }
      ctx.restore();
    }
  }
}
