// The Ninja's katanas and nunchaku and the Rogue's daggers (tools/weapons3d.js SETS katanas, nunchakus, stilettos,
// offstilettos): 50 designs each, every one its own recipe (within a rarity no two share a blade or a guard, and no two
// of the 50 share blade + guard + pommel), finer by rarity. Conventions as the greatswords: the grip at the origin, the
// blade up +Y, +Z its face; markers 'grip', 'guard', 'tip', 'slot', 'head', 'l0'/'l1', 'orbit'; every material carries
// userData.region. A katana's edge is on +X and it curves back toward its spine (-X). Textures: the material library
// and the small generated ones in assets/models/held/textures/ (tools/weapons3d_textures.py). Outlines are rounded to
// 0.01 so the three.js JSON models stay small.
import * as THREE from 'three';
import { mat, cyl, band, ball, spike } from './handheld3d.js';
import { V, put, box, tube, torus, lathe, oct, mark, jewel, shards, halo, solid, gemM, tag, range, pick, int, chance, rng, hash } from './weapons3d_parts.js';
import { HELD_PER } from '../src/data/held.js';

const PI = Math.PI, TAU = PI * 2, BEV = 0.16, r2 = (v) => Math.round(v * 100) / 100, P2 = (pts) => pts.map(([x, y]) => [r2(x), r2(y)]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), step = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
/** A run of an outline to draw as one curve through its points (a few numbers in the model's JSON instead of a line each). */
const sm = (pts) => { pts = pts.slice(); pts.smooth = true; return pts; };
/** Trace an outline into a path: points [[x, y]], or runs of them, each straight-sided or sm() smooth. */
function trace(s, pts) {
  (typeof pts[0][0] === 'number' ? [pts] : pts).forEach((run, n) => {
    const p = P2(run);
    if (!n) s.moveTo(...p.shift());
    if (run.smooth && p.length > 1) s.splineThru(p.map(([x, y]) => new THREE.Vector2(x, y))); else for (const q of p) s.lineTo(...q);
  });
  s.closePath();
  return s;
}
/** A flat part from an outline with holes, extruded `depth` along Z, centred on z = 0 (its faces at +-(depth / 2 + bevel)). */
function plate(pts, holes, depth, m, bevel = BEV) {
  const s = trace(new THREE.Shape(), pts);
  for (const h of holes) s.holes.push(trace(new THREE.Path(), h));
  const g = new THREE.ExtrudeGeometry(s, { depth: r2(depth), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 2 });
  g.translate(0, 0, -r2(depth) / 2);
  return new THREE.Mesh(g, m);
}
/** A strip between two polylines (both base to tip). */
const strip = (a, b, depth, m, smooth = true) => plate(smooth ? [sm(a), sm(b.slice().reverse())] : [...a, ...b.slice().reverse()], [], depth, m, 0);
const polar = (n, f, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * TAU, k = f(a); return [Math.cos(a) * k, Math.sin(a) * k]; });
const circle = (cx, cy, rr, n = 10) => polar(n, () => rr).map(([x, y]) => [x + cx, y + cy]);
const flat = (m) => { const c = m.clone(); c.flatShading = true; return c; };
const lighter = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();

function shuffled(r, a) { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
const TABLES = new Map();
/** A set's 50 recipes { a, b, c, j, R }: the least used forms first, so every form shows. */
function table(name, A, B, C, openA, openB) {
  if (TABLES.has(name)) return TABLES.get(name);
  const r = rng(hash(name, 'recipes')), seen = new Set(), used = {}, out = [];
  const fresh = (a) => shuffled(r, a).sort((x, y) => (used[x] || 0) - (used[y] || 0));
  HELD_PER.forEach((n, R) => {
    const as = fresh(A.slice(0, openA[R])), bs = fresh(B.slice(0, openB[R])), cs = fresh(C);
    for (let j = 0; j < n; j++) {
      const a = as[j % as.length], b = bs[j % bs.length];
      let c = cs[j % cs.length], k = 0;
      while (seen.has(`${a}|${b}|${c}`) && k < C.length) c = C[(C.indexOf(c) + ++k) % C.length];
      seen.add(`${a}|${b}|${c}`);
      for (const u of [a, 'g:' + b, 'p:' + c]) used[u] = (used[u] || 0) + 1;
      out.push({ a, b, c, j, R });
    }
  });
  TABLES.set(name, out);
  return out;
}

// ================================================================== katanas
export const K_BLADES = ['katana', 'wakizashi', 'uchigatana', 'tachi', 'ninjato', 'chokuto', 'nodachi', 'nagamaki', 'dotanuki', 'shobu', 'kogarasu', 'unokubi', 'nokogiri', 'mikazuki'];
export const K_TSUBA = ['maru', 'kaku', 'mokko', 'hachi', 'hishi', 'juji', 'aoi', 'sukashi', 'kiku', 'shuriken', 'tsuki', 'hasu', 'ryu', 'hi'];
export const K_KASHIRA = ['cap', 'kabuto', 'ring', 'knot', 'fang', 'gem', 'dragon', 'lotus'];
const K_OPEN_B = [11, 12, 14, 14, 14, 14], K_OPEN_T = [10, 11, 12, 13, 14, 14];
const K_HAMON = [['suguha', 'notare'], ['suguha', 'notare', 'gunome'], ['notare', 'gunome', 'midare', 'sanbon'], ['gunome', 'midare', 'sanbon', 'choji'], ['midare', 'choji', 'toran', 'sanbon'], ['choji', 'toran', 'midare']];
const K_FINERY = [['plain', 'plain', 'hi'], ['plain', 'hi', 'futasuji'], ['hi', 'futasuji', 'bonji'], ['hi', 'bonji', 'ryu'], ['bonji', 'ryu', 'futasuji'], ['ryu', 'bonji']];
const K_ITO = [[0, 3], [0, 1, 3], [1, 2, 6], [2, 4, 5, 6], [2, 4, 5, 7], [0, 2, 5, 7]];
const K_FORM = {
  katana: 'Katana', wakizashi: 'Wakizashi', uchigatana: 'Uchigatana', tachi: 'Tachi', ninjato: 'Ninjato', chokuto: 'Chokuto', nodachi: 'Nodachi', nagamaki: 'Nagamaki',
  dotanuki: 'Dotanuki', shobu: 'Iris Blade', kogarasu: 'Crow Blade', unokubi: 'Cormorant Blade', nokogiri: 'Saw-back Ninjato', mikazuki: 'Crescent Tachi',
};
// len: guard to point; sori: how far the point sits back, per unit of length; p: where it bends (2 even, more: toward the point); tip: the point's cut
const K_SPEC = {
  katana: { len: 37, sori: 0.07, tsuka: 12 }, wakizashi: { len: 27, sori: 0.055, tsuka: 9 }, uchigatana: { len: 34, sori: 0.1, p: 2.8, tsuka: 11 },
  tachi: { len: 41, sori: 0.13, p: 1.6, tsuka: 12 }, ninjato: { len: 31, sori: 0, tsuka: 11, tip: 'kiri' }, chokuto: { len: 35, sori: 0, tsuka: 10, tip: 'ko' },
  nodachi: { len: 49, sori: 0.11, tsuka: 15, w: 1.12 }, nagamaki: { len: 33, sori: 0.09, tsuka: 19, w: 1.15 }, dotanuki: { len: 35, sori: 0.05, tsuka: 12, w: 1.32 },
  shobu: { len: 36, sori: 0.09, tsuka: 12, tip: 'shobu', taper: 0.38 }, kogarasu: { len: 36, sori: 0.08, tsuka: 12, tip: 'ken' }, unokubi: { len: 34, sori: 0.08, tsuka: 11 },
  nokogiri: { len: 32, sori: 0, tsuka: 11, tip: 'kiri' }, mikazuki: { len: 38, sori: 0.19, tsuka: 12 },
};
// the temper line: how far it reaches in from the edge along the blade, -1 .. 1
const HAMON = {
  suguha: () => () => 0, notare: (r) => { const p = r() * 6; return (t) => Math.sin(t * 15 + p); },
  gunome: (r) => { const p = r() * 6; return (t) => Math.abs(Math.sin(t * 34 + p)) * 2 - 1; },
  midare: (r) => { const p = r() * 6; return (t) => (Math.sin(t * 23 + p) + 0.7 * Math.sin(t * 53 + 1.3 + p)) / 1.5; },
  sanbon: () => (t) => { const u = (t * 26) % 3; return [-0.6, 0.1, 1][Math.floor(u)] * (1 - Math.abs((u % 1) - 0.5) * 1.4); },
  choji: (r) => { const p = r() * 6; return (t) => Math.abs(Math.sin(t * 50 + p)) ** 0.5 * 1.6 - 0.7 + 0.3 * Math.sin(t * 11); },
  toran: (r) => { const p = r() * 6; return (t) => Math.sin(t * 10 + p) ** 3 * 1.5; },
};

/** A katana's blade: its edge and spine (base to point), the smooth width and the kissaki's start. */
function katanaBlade(type, S, len, w, y0) {
  const N = 24, kl = w * ({ kiri: 3.6, ko: 2.1, ken: 4.2, shobu: 6.5 }[S.tip] || 3.1), tk = 1 - kl / len, p = S.p || 2, taper = S.taper ?? 0.2;
  const xc = (t) => -S.sori * len * t ** p, ts = [];
  for (let i = 0; i <= N; i++) ts.push(tk * i / N);
  for (let i = 1; i <= 6; i++) ts.push(tk + (1 - tk) * i / 6);
  const E = [], Sp = [], S0 = [], Wd = [];
  ts.forEach((t, i) => {
    const y = y0 + t * len, k = 1 - taper * t, q = t > tk ? (t - tk) / (1 - tk) : 0, we = w * k;
    let ws = w * 0.8 * k, xe, xs;
    if (type === 'unokubi') ws *= 1 - 0.5 * step(0.16, 0.28, t) * (1 - step(0.6, 0.74, t)); // the spine thinned like a cormorant's neck
    if (S.tip === 'ken') { const m = 1 - q ** 1.6; xe = xc(t) + we * m; xs = xc(t) - ws * m; } // both sides run to the point
    else { xe = xc(t) + we - (we + ws) * q ** (S.tip === 'kiri' ? 1 : S.tip === 'shobu' ? 1.3 : 1.55); xs = xc(t) - ws; }
    Wd.push(xe - xs); S0.push(xs);
    if (type === 'nokogiri' && i % 2 && t > 0.1 && t < tk - 0.04) xs -= w * 0.6; // saw teeth down the spine
    E.push([xe, y]); Sp.push([xs, y]);
  });
  return { E, Sp, S0, Wd, ts, tk, xc, tip: E[E.length - 1] };
}

/** A tsuba: a plate across the blade (its outline in X and Z), round the blade at height y. */
function tsuba(g, type, rt, y, m, M, R) {
  let pts, holes = [], th = 0.5, round = true;
  switch (type) {
    case 'maru': pts = polar(20, () => 1); break;
    case 'kaku': pts = polar(24, (a) => 0.9 / (Math.cos(a) ** 4 + Math.sin(a) ** 4) ** 0.25); break;
    case 'mokko': pts = polar(32, (a) => 0.84 + 0.2 * Math.abs(Math.cos(2 * a)) ** 0.6, PI / 4); break;
    case 'hachi': pts = polar(8, () => 1.04, PI / 8); round = false; break;
    case 'hishi': pts = [[1.3, 0], [0, 0.95], [-1.3, 0], [0, -0.95]]; round = false; break;
    case 'juji': pts = [[0.36, 0.36], [1.2, 0.36], [1.2, -0.36], [0.36, -0.36], [0.36, -1.15], [-0.36, -1.15], [-0.36, -0.36], [-1.2, -0.36], [-1.2, 0.36], [-0.36, 0.36], [-0.36, 1.15], [0.36, 1.15]]; round = false; break;
    case 'aoi': pts = polar(32, (a) => 0.82 + 0.24 * Math.abs(Math.sin(2 * a)) ** 0.8); holes = [1, 3, 5, 7].map((i) => circle(Math.cos(i * PI / 4) * 0.74, Math.sin(i * PI / 4) * 0.74, 0.13, 6)); break;
    case 'sukashi': pts = polar(20, () => 1.04); holes = [[0, 0.62], [0, -0.62], [0.74, 0.3], [-0.74, 0.3], [0.74, -0.3], [-0.74, -0.3]].map(([x, z]) => circle(x, z, 0.2, 8)); break;
    case 'kiku': pts = polar(48, (a) => 0.94 + 0.1 * Math.cos(16 * a)); break;
    case 'shuriken': pts = polar(32, (a) => 0.5 + 0.85 * Math.abs(Math.cos(2 * a)) ** 3); round = false; break;
    case 'tsuki': pts = polar(22, () => 1.08); holes = [circle(0, 0.5, 0.42, 12)]; break; // a moon: the dark of it cut away
    case 'hasu': pts = polar(48, (a) => 0.66 + 0.46 * Math.abs(Math.cos(4 * a)) ** 1.6); break;
    case 'ryu': pts = polar(20, () => 0.86); th = 0.7; break;
    default: pts = polar(48, (a) => 0.62 + 0.55 * Math.abs(Math.sin(6 * a + 0.5 * Math.sin(6 * a))) ** 2.2); // 'hi': flames
  }
  const sc = (a) => a.map(([x, z]) => [x * rt, z * rt]), cl = (a) => (round ? [sm([...a, a[0]])] : a);
  const t = plate(cl(sc(pts)), holes.map((h) => cl(sc(h))), th, m, 0.1);
  t.rotation.x = PI / 2; g.add(put(t, 0, y));
  if (['maru', 'sukashi', 'tsuki', 'ryu'].includes(type) && R >= 1) { const rim = torus(rt * (type === 'ryu' ? 0.95 : 1.04), type === 'ryu' ? 0.42 : 0.2, R >= 2 ? M.trim : M.metal2, 20); rim.rotation.x = PI / 2; g.add(put(rim, 0, y)); }
  if (type === 'ryu') for (const s of [-1, 1]) g.add(put(ball(0.34, 0, M.glow, 6), s * rt * 0.5, y + 0.2, rt * 0.86));
  if (R >= 3) g.add(put(box(rt * 1.1, 0.16, rt * 1.1, M.glow), 0, y + th / 2 + 0.12)); // an inlaid seat under the collar
}

/** One katana: recipe from the design index, details from r. */
export function katana(r, R, M, d) {
  const rc = table(d.set || 'katanas', K_BLADES, K_TSUBA, K_KASHIRA, K_OPEN_B, K_OPEN_T)[d.i], g = new THREE.Group();
  const S = K_SPEC[rc.a], len = S.len * range(r, 0.96, 1.05), w = 1.62 * (S.w || 1) * range(r, 0.94, 1.08), y0 = 6.5, gy = 5.2;
  const B = katanaBlade(rc.a, S, len, w, y0), D = 0.6 + w * 0.1, fz = D / 2 + BEV, n = B.ts.length, saw = rc.a === 'nokogiri';
  const hamon = pick(r, K_HAMON[R]), finery = K_FINERY[R][(rc.j + R) % K_FINERY[R].length], wave = HAMON[hamon](r);
  // steel: the folded flat (ji), the pale tempered edge (ha: living light at Mythic), a bright cutting edge
  const bc = M.blade.color.getHex();
  const ji = tag(mat('HADA', { tile: 9, metal: 0.55, rough: Math.max(0.4, M.blade.roughness), color: lighter(bc, 0.12), env: 0.7 }), 'metal'); // not too mirror-like: it must read from every side
  const ha = R >= 5 ? M.glow : solid(lighter(bc, 0.7), 0.6, 0.28, 0.9, 'metal');
  g.add(plate([sm(B.E), saw ? B.Sp.slice(0, -1).reverse() : sm(B.Sp.slice(0, -1).reverse())], [], D, ji));
  const Hm = B.E.map(([xe, y], i) => [xe - B.Wd[i] * clamp(0.36 + 0.15 * wave(B.ts[i]), 0.14, 0.62), y]);
  g.add(strip(B.E.map(([x, y]) => [x + BEV * 0.6, y]), Hm.slice(0, -1), fz * 2 + 0.06, ha));
  const q = (i) => (B.ts[i] > B.tk ? (B.ts[i] - B.tk) / (1 - B.tk) : 0);
  g.add(strip(B.E.map(([x, y], i) => [x + 0.46, y + 0.5 * q(i)]), B.E.map(([x, y]) => [x - 0.1, y]), D * 0.5, R >= 4 ? M.glow : M.edge));
  if (S.tip === 'ken') { const k0 = Math.floor(n * 0.5); g.add(strip(B.Sp.slice(k0).map(([x, y]) => [x - 0.44, y]), B.Sp.slice(k0).map(([x, y]) => [x + 0.1, y]), D * 0.5, R >= 4 ? M.glow : M.edge)); }
  // the ridge line, and what is cut into the flat above it
  const upto = B.ts.findIndex((t) => t > B.tk), at = (i, f) => [B.S0[i] + B.Wd[i] * f, B.Sp[i][1]];
  const run = (f0, f1, i0, i1, m, k) => { const a = [], b = []; for (let i = i0; i <= i1; i++) { a.push(at(i, f1)); b.push(at(i, f0)); } g.add(strip(a, b, fz * 2 + k, m)); };
  if (S.tip !== 'shobu') run(0.37, 0.45, 1, upto - 1, solid(lighter(bc, 0.34), 0.9, 0.25, 0.8, 'metal'), 0.16);
  const mid = (t) => { const i = clamp(Math.round(t / B.tk * 24), 0, upto - 1); return [...at(i, 0.2), i]; };
  if (finery === 'hi') run(0.1, 0.31, 2, Math.floor(upto * 0.72), M.dark, 0.05);
  if (finery === 'futasuji') { run(0.08, 0.17, 2, Math.floor(upto * 0.66), M.dark, 0.05); run(0.23, 0.32, 2, Math.floor(upto * 0.6), M.dark, 0.05); }
  if (finery === 'bonji') for (let t = 0.07; t < 0.4; t += 0.055) for (const s of [1, -1]) { // characters cut into the flat, lit from Epic
    const [x, y] = mid(t), m = R >= 3 ? M.glow : M.dark;
    g.add(put(box(w * 0.42, 0.34, 0.14, m), x, y, s * (fz + 0.05)), put(box(0.3, 1.1, 0.14, m), x + (int(r, 0, 2) - 1) * w * 0.14, y + 0.2, s * (fz + 0.05)));
  }
  if (finery === 'ryu') for (const s of [1, -1]) { // a dragon winding up the flat
    const pts = []; for (let t = 0.05; t <= 0.56; t += 0.03) { const [x, y] = mid(t); pts.push([x + Math.sin(t * 70) * w * 0.17, y, s * (fz + 0.06)]); }
    g.add(tube(pts, 0.17, M.glow, 40, 4)); const hd = pts[pts.length - 1]; g.add(put(oct(0.5, M.glow2), hd[0], hd[1] + 0.3, hd[2]));
  }
  { const [x0, yA] = mid(0.08), [x1, yB] = mid(0.86); mark(g, 'l0', x0 + w * 0.3, yA); mark(g, 'l1', x1 + w * 0.3, yB); }
  // habaki (the blade's collar), tsuba, fuchi
  const gm = R >= 2 ? M.trim : M.metal2;
  g.add(put(box(w * 1.9, 2, fz * 2 + 0.3, R >= 1 ? M.trim : M.metal2), w * 0.1, y0 + 0.4));
  tsuba(g, rc.b, (w * 1.55 + 0.35) * range(r, 0.96, 1.08), gy, rc.b === 'ryu' || R < 2 ? M.metal2 : gm, M, R);
  // the handle: braid over ray skin, a fuchi under the guard, menuki in the braid, the kashira
  const tl = S.tsuka * range(r, 0.96, 1.04), ty = gy - 0.5 - tl, oval = (o) => { o.scale.z = 0.74; return o; };
  g.add(oval(cyl(1.02, 1.12, ty, gy - 0.5, tag(mat(`ITO-${pick(r, K_ITO[R])}`, { rep: [1, tl / 4.6], metal: 0, rough: 0.85 }), 'grip'), 14)));
  g.add(oval(cyl(1.2, 1.26, gy - 1.5, gy - 0.4, gm, 14)));
  if (R >= 2) for (const s of [1, -1]) { const mn = put(ball(0.5, 0, M.trim, 8), s * 0.2, ty + tl * (s > 0 ? 0.62 : 0.36), s * 0.78); mn.scale.set(0.8, 1.9, 0.5); g.add(mn); }
  const K = rc.c, ky = ty;
  if (K === 'cap' || K === 'knot' || K === 'gem') g.add(oval(cyl(1.16, 1.22, ky - 1, ky + 0.3, gm, 14)), oval(ball(1.16, ky - 1, gm, 10)));
  if (K === 'kabuto') { g.add(oval(ball(1.5, ky - 0.6, gm, 12))); for (const s of [-1, 1]) g.add(spike(0.3, 1.5, gm, [s * 0.9, ky - 0.2, 0], [s * 0.8, 0.9, 0], 5)); }
  if (K === 'ring') { g.add(oval(cyl(1.16, 1.22, ky - 0.6, ky + 0.3, gm, 14)), put(torus(1.5, 0.36, gm, 16), 0, ky - 2.1)); }
  if (K === 'knot') { const k = torus(0.9, 0.3, tag(solid(0xb02030, 0, 0.8), 'grip'), 12); k.rotation.y = PI / 2; g.add(put(k, 0, ky - 1.9)); }
  if (K === 'fang') g.add(oval(cyl(1.16, 1.22, ky - 0.5, ky + 0.3, gm, 14)), spike(0.9, 3.2, M.edge, [0, ky - 0.5, 0], [-0.25, -1, 0], 4));
  if (K === 'gem') g.add(put(ball(0.95, 0, M.gem, 10), 0, ky - 1.9));
  if (K === 'dragon') { g.add(oval(ball(1.45, ky - 0.7, gm, 12)), spike(0.5, 1.6, gm, [0.5, ky - 1.2, 0], [0.9, -0.5, 0], 5)); for (const s of [-1, 1]) g.add(put(ball(0.3, 0, M.glow, 6), 0.7, ky - 0.5, s * 0.75), spike(0.24, 1.3, gm, [-0.2, ky, s * 0.7], [-0.6, 0.7, s * 0.4], 4)); }
  if (K === 'lotus') { g.add(oval(cyl(1.16, 1.22, ky - 0.4, ky + 0.3, gm, 14))); for (let i = 0; i < 6; i++) { const a = i * PI / 3; g.add(spike(0.55, 1.9, i % 2 ? gm : M.trim, [Math.cos(a) * 0.5, ky - 0.4, Math.sin(a) * 0.4], [Math.cos(a) * 0.7, -1, Math.sin(a) * 0.6], 4)); } }
  // a tassel off the kashira: now and then at Rare, always from Legendary
  const kb = ky - ({ ring: 3.6, knot: 2.8, fang: 1.2, gem: 2.6, kabuto: 2, dragon: 2, lotus: 1.4 }[K] || 2);
  if (R >= 4 || (R >= 2 && chance(r, 0.45))) {
    const tm = R >= 5 ? M.glow2 : tag(solid(pick(r, [0xb02030, 0x2a3a8a, 0xd8d0c0, 0x5a2a8a, 0xc8a040]), 0, 0.8), 'grip'), L = range(r, 5, 8);
    g.add(tube([[0, kb + 0.6, 0], [-1.1, kb - 0.6, 0.3], [-1.7, kb - L * 0.5, 0.4], [-1.5, kb - L, 0.2]], 0.2, tm, 14, 4), put(ball(0.5, 0, gm, 6), -1.5, kb - L));
    g.add(spike(0.75, 2.6, tm, [-1.5, kb - L - 2.8, 0.2], [0, 1, 0], 6));
  }
  // jewels, and the Mythic's drifting petals and moon ring
  if (R >= 3) jewel(g, M, [0, gy, (w * 1.55 + 0.35) * 0.98], 0.6);
  if (R >= 4) jewel(g, M, [w * 0.1, y0 + 0.4, fz + 0.2], 0.55, [0, 0, 1], 'ball');
  const extra = R >= 5 ? ['petals', 'moon', 'both'][rc.j % 3] : null, [hx, hy] = mid(0.55);
  if (extra === 'petals' || extra === 'both') shards(g, M, [hx, hy, 0], w * 3.2, extra === 'both' ? 3 : 5, r, 0.7);
  if (extra === 'moon' || extra === 'both') halo(g, M, [hx, hy, 0], w * 2.6, 1.25, 0.3);
  { const [sx, sy] = mid(0.14), [tx, tz] = mid(0.3); mark(g, 'slot', sx, sy, fz); mark(g, 'slot', 0, gy, (w * 1.55 + 0.35)); mark(g, 'slot', 0, ky - 1, 0.9); mark(g, 'slot', tx, tz, fz); mark(g, 'slot', 0, ty + tl * 0.5, 0.9); }
  mark(g, 'tip', ...B.tip); mark(g, 'grip', 0, 0); mark(g, 'guard', 0, gy); mark(g, 'head', hx, hy, 0, len * 0.5);
  return { g, form: K_FORM[rc.a], recipe: { blade: rc.a, tsuba: rc.b, kashira: rc.c, hamon, finery, extra } };
}

// ================================================================== the Rogue's daggers
export const D_BLADES = ['dirk', 'stiletto', 'leaf', 'tanto', 'serrated', 'parrying', 'kris', 'kukri', 'cinquedea', 'rondel', 'karambit', 'hook', 'flame', 'forked'];
export const D_GUARDS = ['bar', 'collar', 'drooped', 'curved', 'disc', 'ring', 'sail', 'prongs', 'thorn', 'bat', 'skull'];
export const D_POMMELS = ['ball', 'disc', 'spike', 'ring', 'gem', 'claw', 'skull', 'cap'];
const D_OPEN_B = [11, 12, 13, 14, 14, 14], D_OPEN_G = [10, 10, 11, 11, 11, 11];
const D_FINERY = [['plain', 'fuller', 'ridge'], ['fuller', 'ridge', 'notch', 'holes'], ['ridge', 'holes', 'etched', 'blood'], ['blood', 'etched', 'runes', 'venom'], ['runes', 'blood', 'venom', 'gemline'], ['runes', 'venom', 'gemline', 'blood']];
const D_FORM = {
  dirk: 'Dirk', stiletto: 'Stiletto', leaf: 'Leaf Dagger', tanto: 'Tanto', serrated: 'Sawtooth Knife', parrying: 'Main-gauche', kris: 'Kris', kukri: 'Kukri',
  cinquedea: 'Cinquedea', rondel: 'Rondel', karambit: 'Karambit', hook: 'Gut Hook', flame: 'Flame Dagger', forked: 'Fork-tongue',
};
/** Her steel: blued to black blades, pewter fittings, oxblood leather, garnets. */
function rogueKit(r, R, M) {
  const bl = [[0x56585e, 0.75, 0.5], [0x4a4e5a, 0.8, 0.42], [0x3c4456, 0.85, 0.36], [0x2e3242, 0.88, 0.32], [0x26202c, 0.9, 0.28], [0x1e1824, 0.9, 0.26]][R];
  const grip = pick(r, [[0x6a2026, 0x561a1e, 0x40302e], [0x74222a, 0x56141a, 0x32303a], [0x80202a, 0x440e16, 0x2c2832], [0x8a1c22, 0x34101a, 0x24202a], [0x961820, 0x2c0c16, 0x1c1824], [0xa0141e, 0x240a16, 0x16121c]][R]);
  return {
    ...M, blade: solid(R >= 3 && chance(r, 0.3) ? 0x4c1822 : bl[0], bl[1], bl[2], 0.6, 'metal'),
    trim: tag(mat('MET-06', { tile: 8, metal: 0.85, rough: 0.5 - R * 0.05, color: [0x8e8e96, 0x9a9aa4, 0xa8a8b4, 0xb6b6c4, 0xc6c6d4, 0xd4d4e2][R] }), 'trim'),
    metal2: tag(mat('MET-01', { tile: 8, metal: 0.8, rough: 0.5, color: 0xa09ea8 }), 'trim'),
    grip: tag(mat(R >= 4 && chance(r, 0.4) ? 'SAME' : 'WRAP', { rep: [1, 2.6], metal: 0, rough: 0.8, color: grip }), 'grip'),
    gem: gemM(R >= 3 && chance(r, 0.45) ? M.e : pick(r, [0xc01828, 0xe02a3a, 0x9a1030]), 1 + R * 0.15),
  };
}
/** A dagger blade's outline, its holes, the point and the centre line x(y). */
function daggerBlade(type, len, w, y0) {
  const N = 26, lft = [], rgt = [], holes = [];
  const cx = (t) => (type === 'kris' ? Math.sin(t * PI * 5) * w * 0.5 * (1 - t * 0.6) : type === 'karambit' ? w * 3.4 * t ** 1.9 : type === 'kukri' ? w * 1.5 * t * t : 0);
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = y0 + t * len;
    let tipK = t > 0.8 ? Math.max(0.03, (1 - t) / 0.2) : 1, k = 1 - 0.3 * t, l, rr;
    switch (type) {
      case 'stiletto': k = 0.5 * (1 - 0.9 * t) + 0.04; tipK = 1; break;
      case 'rondel': k = 0.62 * (1 - 0.82 * t) + 0.04; tipK = 1; break;
      case 'parrying': k = 0.72 * (1 - 0.75 * t) + 0.04; tipK = 1; break;
      case 'dirk': k = 1 - 0.78 * t ** 1.3; tipK = t > 0.92 ? Math.max(0.03, (1 - t) / 0.08) : 1; break;
      case 'leaf': k = 0.66 + 0.52 * Math.sin(PI * Math.min(1, t * 1.12)); break;
      case 'cinquedea': k = 1.95 * (1 - t) + 0.04; tipK = 1; break;
      case 'flame': k *= 1 + 0.26 * Math.sin(t * 24); break;
      case 'karambit': k = 1.05 * (1 - 0.92 * t) + 0.03; tipK = 1; break;
      case 'kris': k = 0.9 * (1 - 0.45 * t); break;
    }
    l = rr = w * k * tipK;
    if (type === 'tanto') { rr = w * 0.9; l = w * 0.62; if (t > 0.78) rr = w * 0.9 - (w * 1.52) * ((t - 0.78) / 0.22); } // one edge, a chisel point on the spine
    if (type === 'kukri') { rr = w * (0.75 + 0.95 * Math.exp(-(((t - 0.62) / 0.22) ** 2))) * tipK; l = w * 0.55 * tipK; }
    if (type === 'serrated' && i % 2 && t > 0.12 && t < 0.7) l += w * 0.42;
    if (type === 'hook' && i >= 17 && i <= 20) l += w * (i - 16) * 0.34;
    lft.push([cx(t) - l, y]); rgt.push([cx(t) + rr, y]);
  }
  const sharp = ['serrated', 'hook', 'tanto'].includes(type);
  let out = sharp ? [...rgt, ...lft.reverse()] : [sm(rgt), sm(lft.reverse())], tip = type === 'tanto' ? [-w * 0.62, y0 + len] : [cx(1), y0 + len];
  if (type === 'forked') { // two tines round a notch
    const top = y0 + len, cut = y0 + len * 0.66, wt = w * 0.86;
    out = [...rgt.filter(([, y]) => y < cut - 1), [wt * 1.05, top - len * 0.08], [wt * 0.62, top], [0, cut], [-wt * 0.62, top], [-wt * 1.05, top - len * 0.08], ...lft.filter(([, y]) => y < cut - 1)];
    tip = [0, top];
  }
  return { out, holes, tip, cx: (y) => cx(clamp((y - y0) / len, 0, 1)) };
}
/** One of the Rogue's daggers. */
export function stiletto(r, R, M0, d) {
  const rc = table(d.set || 'stilettos', D_BLADES, D_GUARDS, D_POMMELS, D_OPEN_B, D_OPEN_G)[d.i], g = new THREE.Group(), M = rogueKit(r, R, M0);
  const T = rc.a, len = 16.5 * range(r, 0.94, 1.08) * ({ stiletto: 1.22, rondel: 1.12, parrying: 1.26, cinquedea: 0.9, karambit: 0.82, kukri: 1.05, tanto: 0.95 }[T] || 1);
  const w = 1.75 * range(r, 0.92, 1.1) * ({ leaf: 1.05, kukri: 1.05, karambit: 1.1 }[T] || 1), y0 = 5.2, gy = 4.4;
  const B = daggerBlade(T, len, w, y0), slim = ['stiletto', 'rondel', 'parrying'].includes(T), D = slim ? 0.9 : 0.6 + w * 0.12, fz = D / 2 + BEV;
  const f = D_FINERY[R][(rc.j + R) % D_FINERY[R].length], holes = f === 'holes' && !slim && T !== 'forked' && T !== 'karambit' ? [0.22, 0.4].map((t) => circle(B.cx(y0 + len * t), y0 + len * t, w * 0.3, 8)) : [];
  g.add(plate(B.out, holes, D, M.blade));
  const runs = typeof B.out[0][0] === 'number' ? [B.out] : B.out, remap = (f) => { const o = runs.map((a) => { const b = a.map(f); b.smooth = a.smooth; return b; }); return o.length > 1 ? o : o[0]; };
  const grow = ([x, y]) => [x + Math.sign(x - B.cx(y) || 1) * (0.42 + Math.abs(x - B.cx(y)) * 0.06), y + (y > y0 + len * 0.97 ? 0.7 : 0)];
  g.add(plate(remap(grow), holes.map((h) => h.map(([x, y]) => [x + (B.cx(y) - x) * 0.14, y])), D * 0.46, R >= 4 ? M.glow : M.edge, 0)); // the edge
  const at = (t) => [B.cx(y0 + len * t), y0 + len * t];
  const groove = (x, ww, t0, t1, m = M.dark, z = 0.03) => { for (const s of [1, -1]) g.add(put(box(ww, len * (t1 - t0), 0.12, m), x + B.cx(y0 + len * (t0 + t1) / 2), y0 + len * (t0 + t1) / 2, s * (fz + z))); };
  const straight = !['kris', 'karambit', 'kukri'].includes(T);
  if (slim || f === 'ridge') groove(0, w * 0.16, 0.02, 0.8, M.edge, 0.1);
  else if (f === 'fuller' && straight) groove(0, w * 0.34, 0.04, 0.56);
  if (f === 'notch') for (const t of [0.08, 0.14, 0.2]) g.add(put(box(w * 0.5, 0.4, fz * 2 + 0.1, M.dark), at(t)[0] - w * 0.6, at(t)[1]));
  if (f === 'etched') for (let t = 0.1; t < 0.62; t += 0.1) for (const s of [1, -1]) { const [x, y] = at(t), e = oct(w * 0.26, R >= 3 ? M.glow : M.dark); e.scale.set(1, 1.5, 0.2); g.add(put(e, x, y, s * fz)); }
  if (f === 'blood' && straight) groove(0, w * 0.2, 0.03, 0.68, M.glow, 0.05); // a channel that still runs red
  if (f === 'blood' && !straight) for (let t = 0.08; t < 0.7; t += 0.07) for (const s of [1, -1]) g.add(put(box(w * 0.2, len * 0.05, 0.12, M.glow), ...at(t), s * (fz + 0.05)));
  if (f === 'runes') for (let t = 0.08; t < 0.62; t += 0.09) for (const s of [1, -1]) { const [x, y] = at(t); g.add(put(box(w * 0.7, 0.36, 0.14, M.glow), x, y, s * (fz + 0.05)), put(box(0.3, len * 0.05, 0.14, M.glow), x, y + len * 0.03, s * (fz + 0.05))); }
  if (f === 'venom') { g.add(put(ball(0.8, 0, M.glow, 8), 0, y0 + 0.9, fz + 0.3)); for (let t = 0.14; t < 0.8; t += 0.11) g.add(put(ball(0.3, 0, M.glow2, 5), at(t)[0] + w * 0.2, at(t)[1], fz + 0.1)); }
  if (f === 'gemline') for (const t of [0.14, 0.3]) jewel(g, M, [...at(t), fz + 0.1], 0.5);
  mark(g, 'l0', ...at(0.06)); mark(g, 'l1', ...at(0.86));
  // the guard
  const gm = M.trim, gw = w * range(r, 1.9, 2.5) + 1.2, G = rc.b;
  if (G === 'bar' || G === 'ring' || G === 'skull' || G === 'sail') g.add(put(box(gw * 2, 1.1, 1.7, gm), 0, gy));
  if (G === 'collar') g.add(cyl(1.5, 1.2, gy - 0.6, gy + 0.6, gm, 10));
  if (G === 'drooped' || G === 'curved') { const k = G === 'curved' ? 1 : -1; g.add(tube([[-gw, gy + k * 2.4], [-gw * 0.6, gy + 0.1], [0, gy], [gw * 0.6, gy + 0.1], [gw, gy + k * 2.4]], 0.6, gm, 16, 5)); }
  if (G === 'disc') { const k = put(cyl(gw * 0.78, gw * 0.78, -0.35, 0.35, gm, 16), 0, gy); g.add(k); }
  if (G === 'ring') { const t = torus(1.9, 0.32, gm, 14); t.rotation.y = PI / 2; g.add(put(t, gw * 0.4, gy + 1.2, 0)); }
  if (G === 'sail') g.add(plate([[gw, gy + 0.4], [gw * 0.9, gy - 2.6], [gw * 0.3, gy - 6.6], [-0.4, gy - 7.4], [0.9, gy - 0.4]], [], 0.5, M.metal2, 0.12)); // the shell that turns a blade
  if (G === 'prongs') for (const s of [-1, 1]) g.add(tube([[0, gy], [s * gw * 0.7, gy + 0.2], [s * gw, gy + 2], [s * gw * 0.96, gy + len * 0.4]], 0.5, gm, 14, 5), spike(0.5, 1.6, gm, [s * gw * 0.96, gy + len * 0.4, 0], [0, 1, 0], 5));
  if (G === 'thorn') for (const s of [-1, 1]) { g.add(spike(0.75, gw * 1.1, gm, [0, gy, 0], [s, 0.45, 0], 5), spike(0.5, gw * 0.7, gm, [0, gy - 0.2, 0], [s, -0.5, 0], 5)); }
  if (G === 'bat') for (const s of [-1, 1]) { const p = [[s * 1, gy - 0.8], [s * gw * 1.15, gy + 1.6], [s * gw * 0.95, gy - 0.1], [s * gw * 0.7, gy + 0.5], [s * gw * 0.45, gy - 0.7], [s * gw * 0.25, gy + 0.1], [s * 1, gy + 0.9]]; g.add(plate(s > 0 ? p : p.reverse(), [], 1, gm, 0.2)); }
  if (G === 'skull') { g.add(put(ball(1.5, 0, M.bone, 10), 0, gy + 0.2, 0.5), put(box(1.5, 0.9, 1.2, M.bone), 0, gy - 1, 0.7)); for (const x of [-0.55, 0.55]) g.add(put(ball(0.36, 0, R >= 3 ? M.glow : M.dark, 6), x, gy + 0.4, 1.8)); }
  else if (G !== 'collar' && G !== 'disc') g.add(put(box(2.5, 1.5, 1.9, gm), 0, gy));
  // grip and pommel
  g.add(cyl(0.95, 0.9, -3.8, gy - 0.5, M.grip, 10));
  for (let i = 0, n = Math.min(3, R); i < n; i++) g.add(band(1.06, -3.4 + (6.6 * i) / Math.max(1, n - 1), gm, 0.5));
  const P = T === 'karambit' ? 'ring' : rc.c;
  if (P === 'ball') g.add(ball(1.35, -4.9, gm, 10));
  if (P === 'disc') { const k = put(cyl(1.7, 1.7, -0.45, 0.45, gm, 14), 0, -5); k.rotation.x = PI / 2; g.add(k); }
  if (P === 'spike') g.add(ball(1.15, -4.6, gm, 8), spike(0.8, 2.8, gm, [0, -5.4, 0], [0, -1, 0], 5));
  if (P === 'ring') g.add(put(torus(1.75, 0.42, gm, 16), 0, -5.9));
  if (P === 'gem') { g.add(cyl(1.2, 1, -4.6, -3.8, gm, 10), put(oct(1.25, M.gem), 0, -5.5)); }
  if (P === 'claw') { g.add(put(ball(1.15, 0, M.gem, 10), 0, -5.3)); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; g.add(tube([[0, -3.8, 0], [Math.cos(a) * 1.5, -4.8, Math.sin(a) * 1.5], [Math.cos(a) * 0.9, -6.4, Math.sin(a) * 0.9]], 0.26, gm, 8, 4)); } }
  if (P === 'skull') { g.add(ball(1.4, -5.1, M.bone, 10)); for (const x of [-0.5, 0.5]) g.add(put(ball(0.33, 0, R >= 3 ? M.glow : M.dark, 6), x, -5, 1.2)); }
  if (P === 'cap') g.add(cyl(1.25, 1.05, -4.9, -3.8, gm, 8), spike(0.5, 1, gm, [0, -4.9, 0], [0, -1, 0], 4));
  if (R >= 2 && G !== 'skull') jewel(g, M, [0, gy, 1.05], 0.62);
  if (R >= 5) { if (rc.j % 2) shards(g, M, [...at(0.5), 0], w * 3, 4, r, 0.6); else halo(g, M, [...at(0.5), 0], w * 2.4, 1.25, 0.3); }
  for (const t of [0.14, 0.34]) mark(g, 'slot', ...at(t), fz);
  mark(g, 'slot', 0, gy, 1.2); mark(g, 'slot', 0, -5, 1);
  mark(g, 'tip', ...B.tip); mark(g, 'grip', 0, 0); mark(g, 'guard', 0, gy); mark(g, 'head', ...at(0.5), 0, len * 0.5);
  return { g, form: D_FORM[T], recipe: { blade: T, guard: G, pommel: P, finery: f } };
}

// ================================================================== nunchaku
export const N_STICKS = ['round', 'octagon', 'tapered', 'flared', 'bamboo', 'banded', 'studded', 'hex', 'bone', 'fluted'];
export const N_CAPS = ['plain', 'ferrule', 'ball', 'spike', 'ring', 'gem', 'dragon', 'crescent'];
const N_OPEN_S = [10, 10, 10, 10, 10, 10], N_OPEN_C = [4, 5, 6, 8, 8, 8];
const N_FORM = { round: 'Nunchaku', octagon: 'Eight-side Sticks', tapered: 'Tapered Nunchaku', flared: 'Flared Sticks', bamboo: 'Bamboo Flail', banded: 'Banded Sticks', studded: 'Studded Sticks', hex: 'Hex Sticks', bone: 'Bone Sticks', fluted: 'Fluted Sticks' };
/** One stick, from its cord end at the origin up +Y to its free end at L. */
function stick(type, cap, L, R, M, r, body, inlay) {
  const g = new THREE.Group(), rad = 0.92, gm = R >= 2 ? M.trim : M.metal2;
  if (type === 'round' || type === 'banded' || type === 'studded' || type === 'fluted') g.add(cyl(rad, rad, 0, L, body, 12));
  if (type === 'octagon') g.add(cyl(rad * 1.06, rad * 1.06, 0, L, flat(body), 8));
  if (type === 'hex') g.add(cyl(rad * 1.1, rad * 1.1, 0, L, flat(body), 6));
  if (type === 'tapered') g.add(cyl(rad * 0.74, rad * 1.2, 0, L, flat(body), 8));
  if (type === 'flared') g.add(lathe([[rad * 0.9, 0], [rad * 0.7, L * 0.2], [rad * 0.72, L * 0.55], [rad * 1.25, L * 0.92], [rad * 1.1, L]], body, 10));
  if (type === 'bamboo') { g.add(cyl(rad * 0.9, rad * 0.9, 0, L, body, 10)); for (let y = L * 0.24; y < L; y += L * 0.25) g.add(band(rad * 1.06, y, body, 0.5)); }
  if (type === 'bone') g.add(lathe([[rad * 1.15, 0], [rad * 0.7, L * 0.12], [rad * 0.62, L * 0.5], [rad * 0.75, L * 0.86], [rad * 1.3, L * 0.95], [rad * 0.9, L]], M.bone, 10));
  if (type === 'banded') for (const t of [0.3, 0.55, 0.8]) g.add(band(rad * 1.1, L * t, gm, 0.7));
  if (type === 'studded') for (let i = 0; i < 8; i++) { const a = i * 2.4, y = L * (0.5 + 0.055 * i); g.add(spike(0.3, 0.7, gm, [Math.cos(a) * rad, y, Math.sin(a) * rad], [Math.cos(a), 0, Math.sin(a)], 4)); }
  if (type === 'fluted') for (let i = 0; i < 6; i++) { const a = i * PI / 3; g.add(put(box(0.24, L * 0.8, 0.24, gm), Math.cos(a) * rad, L * 0.5, Math.sin(a) * rad)); }
  // the swivel at the cord end, a wrapped hand hold, the inlay, the butt
  if (R >= 1) g.add(cyl(rad * 1.12, rad * 1.02, -0.2, 1.3, gm, 10));
  const eye = torus(0.48, 0.17, gm, 8); eye.rotation.y = PI / 2; g.add(put(eye, 0, -0.5));
  if (inlay === 'wrap') g.add(cyl(rad * 1.07, rad * 1.07, L * 0.52, L * 0.9, M.grip, 10));
  if (inlay === 'rings') for (const t of [0.42, 0.5, 0.58]) g.add(band(rad * 1.09, L * t, M.trim, 0.35));
  if (inlay === 'glow') for (const s of [1, -1]) g.add(put(box(0.34, L * 0.56, 0.2, M.glow), 0, L * 0.52, s * rad), put(box(0.2, L * 0.56, 0.34, M.glow), s * rad, L * 0.52, 0));
  if (inlay === 'coil') { const pts = []; for (let i = 0; i <= 28; i++) { const a = i * 0.62, y = L * (0.16 + 0.7 * i / 28); pts.push([Math.cos(a) * rad * 1.04, y, Math.sin(a) * rad * 1.04]); } g.add(tube(pts, 0.17, R >= 4 ? M.glow : M.trim, 44, 4)); } // a dragon coiled round it
  if (cap !== 'plain' && type !== 'bone') g.add(cyl(rad * 1.1, rad * 1.16, L - 1.5, L + 0.15, gm, 10));
  if (cap === 'ball') g.add(ball(rad * 1.25, L + 0.6, gm, 10));
  if (cap === 'spike') g.add(spike(rad * 0.95, 2.2, gm, [0, L, 0], [0, 1, 0], 6));
  if (cap === 'ring') g.add(put(torus(1.1, 0.3, gm, 12), 0, L + 1.2));
  if (cap === 'gem') g.add(put(oct(1.05, M.gem), 0, L + 0.8));
  if (cap === 'dragon') { g.add(ball(rad * 1.3, L + 0.5, gm, 10)); for (const s of [-1, 1]) g.add(put(ball(0.26, 0, M.glow, 5), s * 0.5, L + 0.8, rad), spike(0.24, 1.2, gm, [s * 0.5, L + 1.2, 0], [s * 0.5, 1, -0.3], 4)); }
  if (cap === 'crescent') g.add(put(plate(polar(14, () => 1.5), [circle(0, 0.6, 1, 10)], 0.5, R >= 4 ? M.glow : M.trim, 0.08), 0, L + 1.3));
  return g;
}
/** A cord through points: rope, braid, chain links, or links of light. */
function cord(g, pts, type, M, R) {
  if (type === 'rope' || type === 'braid') { g.add(tube(pts, type === 'rope' ? 0.3 : 0.26, type === 'rope' ? tag(mat('ROPE', { rep: [6, 1], metal: 0, rough: 0.9 }), 'grip') : tag(solid(0x8a1a22, 0, 0.8), 'grip'), 20, 5)); return; }
  const c = new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), n = Math.max(4, Math.round(c.getLength() / 0.95)), m = type === 'glow' ? M.glow : R >= 3 ? M.metal : M.metal2;
  for (let i = 0; i <= n; i++) {
    const p = c.getPoint(i / n), t = c.getTangent(i / n), k = torus(0.44, 0.15, i % 2 && type === 'glow' ? M.glow2 : m, 8);
    k.quaternion.setFromUnitVectors(V(0, 1, 0), t); k.rotateY(i % 2 ? PI / 2 : 0); k.scale.y = 1.5; g.add(put(k, p.x, p.y, p.z));
  }
}
/**
 * A nunchaku. d.view lays it out: (none) hanging over the belt at the origin, both sticks down; 'free' in one line, stick
 * A up from the cord and B down (markers a0, a1, b0, b1: each stick's cord and free ends; 'knot': the cord's middle);
 * 'icon' spread in a V.
 */
export function nunchaku(r, R, M, d) {
  const rc = table(d.set || 'nunchakus', N_STICKS, N_CAPS, ['a', 'b', 'c'], N_OPEN_S, N_OPEN_C)[d.i], g = new THREE.Group();
  const L = range(r, 12, 14.5), T = rc.a, C = rc.b;
  const type = R === 0 ? 'rope' : R === 1 ? (rc.c === 'a' ? 'chain' : 'rope') : R <= 3 ? (rc.c === 'a' ? 'braid' : 'chain') : R === 4 ? (rc.c === 'a' ? 'chain' : 'glow') : 'glow';
  const lac = () => tag(solid(pick(r, [0x8a1a1e, 0x1e1a20, 0x1e2a4a, 0x2a4a34]), 0.25, 0.3, 1.1), 'grip'); // lacquer
  const body = R <= 1 ? M.wood : R === 2 ? lac() : R === 3 ? (chance(r, 0.5) ? M.metal : lac()) : R === 4 ? (chance(r, 0.6) ? tag(mat('SCALE', { rep: [2, 3], metal: 0.6, rough: 0.35 }), 'trim') : M.metal) : chance(r, 0.5) ? M.metal : tag(mat('SCALE', { rep: [2, 3], metal: 0.7, rough: 0.3, color: 0xd8c8ff }), 'trim');
  const inlay = [null, null, 'rings', pick(r, ['wrap', 'coil', 'rings']), pick(r, ['coil', 'glow']), pick(r, ['glow', 'coil'])][R];
  const A = stick(T, C, L, R, M, r, body, inlay), B = stick(T, C, L, R, M, r, body, inlay), cl = 4.4;
  g.add(A, B);
  const place = (o, x, y, deg) => { o.position.set(x, y, 0); o.rotation.z = deg * PI / 180; return [x - Math.sin(deg * PI / 180) * L, y + Math.cos(deg * PI / 180) * L]; };
  let a0, a1, b0, b1, knot = [0, 0];
  if (d.view === 'free') {
    a0 = [0, cl / 2]; b0 = [0, -cl / 2]; a1 = place(A, ...a0, 0); b1 = place(B, ...b0, 180);
    cord(g, [[0, cl / 2 - 0.6, 0], [0, 0, 0], [0, -cl / 2 + 0.6, 0]], type, M, R);
  } else if (d.view === 'icon') {
    a0 = [-1.5, 0]; b0 = [1.5, 0]; a1 = place(A, ...a0, 158); b1 = place(B, ...b0, 202); knot = [0, 1.2];
    cord(g, [[-1.6, 0.5, 0], [-0.8, 1.5, 0], [0.8, 1.5, 0], [1.6, 0.5, 0]], type, M, R);
  } else {
    a0 = [-1.25, -1.9]; b0 = [1.35, -2.6]; a1 = place(A, ...a0, 176); b1 = place(B, ...b0, 185);
    cord(g, [[-1.3, -1.4, 0], [-1, 0, 0.3], [0, 0.55, 0.5], [1, 0, 0.3], [1.4, -2.1, 0]], type, M, R);
  }
  const midA = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2], midB = [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2], c = [(midA[0] + midB[0]) / 2, (midA[1] + midB[1]) / 2];
  if (R >= 5 && d.view !== 'free') { if (rc.j % 2) shards(g, M, [...c, 0], 5, 4, r, 0.6); else halo(g, M, [...c, 0], 4.6, 1.25, 0.3); } // not on the sticks the game swings
  else if (R >= 5) mark(g, 'orbit', ...c, 0, 5);
  mark(g, 'a0', ...a0); mark(g, 'a1', ...a1); mark(g, 'b0', ...b0); mark(g, 'b1', ...b1); mark(g, 'knot', ...knot);
  mark(g, 'slot', ...a1, 0.9); mark(g, 'slot', ...b1, 0.9); mark(g, 'slot', ...midA, 0.95); mark(g, 'slot', ...midB, 0.95);
  mark(g, 'l0', ...a0); mark(g, 'l1', ...a1); mark(g, 'tip', ...b1); mark(g, 'head', ...c, 0, L * 0.5);
  const out = { g, form: R === 4 && body.map && inlay === 'coil' ? 'Dragon Sticks' : type === 'chain' && R >= 3 ? 'Chain Sticks' : N_FORM[T], recipe: { stick: T, cap: C, cord: type, inlay } };
  if (d.view === 'icon') out.grip = [0, 0];
  return out;
}
