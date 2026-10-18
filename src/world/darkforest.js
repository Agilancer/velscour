// THE DARK FOREST: the largest overworld (192 x 192 tiles; docs/DARK_FOREST.md). Built in layers on a 24 x 24 grid
// of 8-tile macro cells:
// - a randomized depth-first maze over the macro cells is the trail network: branching, winding paths through
//   thick woods, dead ends with caches, a few loops, and blobs of trackless deep wood left out of it. The trails
//   from the entry to every glade and labyrinth gate are the wider main paths.
// - three walled labyrinths (a fine maze of 3-tile corridors) from the pack's wall families, entered through arch
//   gates. The biggest (mossy ruins) hides the Heart of the Forest, where the final trial and the exit wait;
//   the other two hold a treasure sanctum.
// - five scenario glades (game/darkforest.js), dressed for their trial, and six small landmark clearings.
// - towering trees on every wooded tile, Poisson spaced (tighter along the trails so the woods read as walls).
// Walls are drawn as the pack's centre-line nodes on blocked wall tiles (arms toward wall neighbours), so a
// labyrinth's corridors and its collision grid are the same thing, and the regular wall pass sorts them.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { rollLooks } from '../data/bestiary.js';
import { darkForestTree, darkTreeK, darkForestTreesReady } from '../gfx/darkforest.js';
import { DF_GLADE_TYPES } from '../data/darkforest.js';

export const DF_W = 192, DF_H = 192;
const W = DF_W, H = DF_H, C = 8, M = W / C;
// tile kinds
const FOREST = 0, MINOR = 1, MAJOR = 2, GLADE = 3, CORRIDOR = 4, HEART = 5, CLEARING = 6, WALL = 7, PIER = 8, ARCH = 9, DOOR = 10;
const WALLISH = new Set([WALL, PIER, DOOR]);
const TREES = {
  pine: ['spire_pine', 'hanging_moss_fir', 'cathedral_redwood', 'thornbound_cypress'],
  oak: ['ancient_black_oak', 'twisted_yew', 'hollow_ash', 'fungal_beech', 'blighted_chestnut', 'lightning_split_oak'],
  dead: ['dead_crowned_elm', 'bone_white_birch', 'root_fused_twins', 'blighted_chestnut'],
  wet: ['weeping_willow', 'hanging_moss_fir', 'twisted_yew'],
};
const UNDERGROWTH = ['fern_clump', 'thorn_bush', 'dead_bramble', 'twisted_roots', 'moss_boulder', 'split_stump', 'hollow_stump', 'dead_sapling', 'pale_mushrooms', 'poison_mushrooms'];
const TRAILSIDE = ['fern_clump', 'pale_mushrooms', 'reeds', 'twisted_roots', 'wolf_bones', 'deer_skull', 'fallen_log', 'hollow_log', 'moss_boulder', 'firewood', 'dead_sapling'];
const LANDMARKS = ['camp', 'well', 'shrine', 'obelisk', 'swamp', 'webs'];
const N4 = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];
const LAB_FLOORS = {
  mossy_ruins: [['gravel_path', 'shale_chips'], ['ancient_paving', 'mossy_cobbles', 'broken_path_stones', 'sunken_rune']],
  thorn_hedge: [['dead_leaves', 'packed_mud'], ['red_leaves', 'bronze_leaves', 'thorn_litter', 'broken_path_stones']],
  tangled_roots: [['pine_needles', 'packed_mud'], ['bark_fragments', 'pine_cones', 'mossy_cobbles', 'exposed_roots']],
  blackwood_trunks: [['packed_mud', 'gravel_path'], ['bark_fragments', 'broken_path_stones', 'hoof_marks', 'pale_mushrooms']],
};

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

export function generateDarkForest(depth, biome, tileset, seed) {
  if (tileset.pack !== 'dark_forest' || !darkForestTreesReady()) throw new Error('The Dark Forest art must load (game.loadLevelArt) before generating it.');
  // a seed whose layout fails its checks (very rare) moves on to the next one, so a saved forest seed still
  // reproduces the same forest
  const errs = [];
  for (let k = 0; k < 8; k++) {
    try { const g = build(depth, biome, tileset, (seed + k * 7919) >>> 0, seed); g.retries = errs; return g; } catch (e) { errs.push(e.message); }
  }
  throw new Error(errs.join('; '));
}

function build(depth, biome, tileset, seed, savedSeed) {
  const rng = new RNG(seed), map = new TileMap(W, H), N = W * H;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  map.t.fill(1); map.block.fill(1); map.losBlocks = true; map.darkForest = true;
  const kind = new Uint8Array(N), fam = new Array(N), labOf = new Int8Array(N).fill(-1);
  const I = (x, y) => y * W + x, inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const open = (x, y, k) => {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return;
    const i = I(x, y);
    if (kind[i] >= WALL) return; // labyrinth walls are never carved through by a trail
    if (kind[i] === FOREST || k > kind[i] && kind[i] < GLADE) kind[i] = k;
    map.block[i] = 0;
  };

  // ---------------------------------------------------------------- macro layout
  const cellOf = new Int16Array(M * M).fill(-1); // -1 free, else index into regions
  const regions = [];
  const free = (mx, my, w, h, pad = 1) => {
    if (mx - pad < 0 || my - pad < 0 || mx + w + pad > M || my + h + pad > M) return false;
    for (let y = my - pad; y < my + h + pad; y++) for (let x = mx - pad; x < mx + w + pad; x++) if (cellOf[y * M + x] >= 0) return false;
    return true;
  };
  const claim = (r) => { r.id = regions.length; regions.push(r); for (let y = r.my; y < r.my + r.h; y++) for (let x = r.mx; x < r.mx + r.w; x++) cellOf[y * M + x] = r.id; return r; };
  const ENTRY_M = [1, 22];
  const entryNear = (mx, my, w, h, d) => Math.hypot(mx + w / 2 - ENTRY_M[0], my + h / 2 - ENTRY_M[1]) < d;
  claim({ kind: 'entry', mx: 0, my: 21, w: 3, h: 3 });
  // the Heart labyrinth: far from the entry, in the north-east
  const heart = claim({ kind: 'labyrinth', heart: true, mx: 14 + rng.int(0, 3), my: 1 + rng.int(0, 3), w: 5, h: 5, family: 'mossy_ruins', arch: 'ancient_root_arch' });
  const labs = [heart];
  for (const [w, h, family, arch] of [[4, 4, 'thorn_hedge', 'thorn_ruin_arch'], [rng.chance(0.5) ? 4 : 3, rng.chance(0.5) ? 3 : 4, rng.pick(['tangled_roots', 'blackwood_trunks']), 'timber_gateway']]) {
    for (let a = 0; a < 400; a++) {
      const mx = rng.int(2, M - w - 2), my = rng.int(2, M - h - 2);
      if (free(mx, my, w, h) && !entryNear(mx, my, w, h, 7)) { labs.push(claim({ kind: 'labyrinth', mx, my, w, h, family, arch })); break; }
    }
  }
  // five scenario glades (2 x 2 cells), spread out; their trials are dealt from DF_GLADE_TYPES without repeats
  const types = shuffle(DF_GLADE_TYPES.slice());
  const glades = [];
  for (let n = 0; n < 5; n++) {
    let best = null, bd = -1;
    for (let a = 0; a < 120; a++) {
      const mx = rng.int(1, M - 3), my = rng.int(1, M - 3);
      if (!free(mx, my, 2, 2) || entryNear(mx, my, 2, 2, 5)) continue;
      const d = Math.min(...glades.map((g) => Math.hypot(g.mx - mx, g.my - my)), Math.hypot(mx - ENTRY_M[0], my - ENTRY_M[1]), ...labs.map((l) => Math.hypot(l.mx + l.w / 2 - mx - 1, l.my + l.h / 2 - my - 1)));
      if (d > bd) { bd = d; best = [mx, my]; }
    }
    if (!best) throw new Error('Dark Forest: no room for glade ' + n);
    glades.push(claim({ kind: 'glade', mx: best[0], my: best[1], w: 2, h: 2, type: types[n % types.length], index: n }));
  }
  const marks = [];
  for (const what of shuffle(LANDMARKS.slice())) {
    for (let a = 0; a < 200; a++) {
      const mx = rng.int(1, M - 2), my = rng.int(1, M - 2);
      if (free(mx, my, 1, 1) && !entryNear(mx, my, 1, 1, 4)) { marks.push(claim({ kind: 'landmark', mx, my, w: 1, h: 1, what })); break; }
    }
  }
  const isLab = (m) => cellOf[m] >= 0 && regions[cellOf[m]].kind === 'labyrinth';
  // trackless deep wood: blobs of cells the trail maze leaves out
  const deep = new Uint8Array(M * M);
  for (let b = 0; b < 9; b++) {
    const cx = rng.int(2, M - 3), cy = rng.int(2, M - 3), r = rng.range(1, 2.2);
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) if (Math.hypot(x - cx, y - cy) < r && cellOf[y * M + x] < 0) deep[y * M + x] = 1;
  }
  // a free cell right next to a labyrinth may carry its gate, so it stays in the maze
  for (const l of labs) for (let y = l.my - 1; y <= l.my + l.h; y++) for (let x = l.mx - 1; x <= l.mx + l.w; x++) if (x >= 0 && y >= 0 && x < M && y < M) deep[y * M + x] = 0;

  // ---------------------------------------------------------------- the trail maze (macro DFS)
  const links = new Map(); // key a*M*M+b (a<b) -> {a,b,major}
  const lk = (a, b) => (a < b ? a * M * M + b : b * M * M + a);
  const link = (a, b) => { const k = lk(a, b); if (!links.has(k)) links.set(k, { a: Math.min(a, b), b: Math.max(a, b), major: false }); };
  const seen = new Uint8Array(M * M), start = ENTRY_M[1] * M + ENTRY_M[0];
  const grow = (stack) => {
  let lastDir = -1;
  while (stack.length) {
    const c = stack[stack.length - 1], cx = c % M, cy = (c / M) | 0;
    const opts = [];
    for (let d = 0; d < 4; d++) {
      const nx = cx + N4[d][0], ny = cy + N4[d][1], n = ny * M + nx;
      if (nx < 0 || ny < 0 || nx >= M || ny >= M || seen[n] || deep[n] || isLab(n)) continue;
      opts.push(d);
    }
    if (!opts.length) { stack.pop(); lastDir = -1; continue; }
    // a slight bias to run on in the same direction makes long winding trails rather than a mesh
    const d = opts.includes(lastDir) && rng.chance(0.35) ? lastDir : rng.pick(opts);
    const n = (cy + N4[d][1]) * M + cx + N4[d][0];
    seen[n] = 1; link(c, n); stack.push(n); lastDir = d;
  }
  };
  seen[start] = 1; grow([start]);
  // deep wood that walled a glade or landmark off gives way: the maze grows on into it from every trail it has
  const cut = () => [...glades, ...marks, regions[0]].some((r) => !seen[r.my * M + r.mx]);
  if (cut()) { deep.fill(0); for (const c of shuffle(Array.from({ length: M * M }, (_, i) => i).filter((i) => seen[i]))) grow([c]); }
  for (const r of [...glades, ...marks, regions[0]]) {
    for (let y = r.my; y < r.my + r.h; y++) for (let x = r.mx; x < r.mx + r.w; x++) {
      if (!seen[y * M + x]) throw new Error('Dark Forest: region cut off');
      if (x + 1 < r.mx + r.w) link(y * M + x, y * M + x + 1);
      if (y + 1 < r.my + r.h) link(y * M + x, (y + 1) * M + x);
    }
  }
  // a few loops, so not every branch is a dead end
  for (let n = 0; n < 34; n++) {
    const x = rng.int(0, M - 2), y = rng.int(0, M - 2), a = y * M + x, b = rng.chance(0.5) ? a + 1 : a + M;
    if (seen[a] && seen[b] && !isLab(a) && !isLab(b)) link(a, b);
  }
  // labyrinth gates: the Heart has one, the others two, each on a side facing a maze cell
  for (const l of labs) {
    const cand = [];
    for (let x = l.mx; x < l.mx + l.w; x++) { cand.push([x, l.my - 1, 'N', x]); cand.push([x, l.my + l.h, 'S', x]); }
    for (let y = l.my; y < l.my + l.h; y++) { cand.push([l.mx - 1, y, 'W', y]); cand.push([l.mx + l.w, y, 'E', y]); }
    const ok = shuffle(cand.filter(([x, y]) => x >= 0 && y >= 0 && x < M && y < M && seen[y * M + x] && cellOf[y * M + x] < 0));
    if (l.heart) ok.sort((a, b) => Math.hypot(a[0] - ENTRY_M[0], a[1] - ENTRY_M[1]) - Math.hypot(b[0] - ENTRY_M[0], b[1] - ENTRY_M[1]));
    l.gates = [];
    for (const g of ok) { if (l.gates.length >= (l.heart ? 1 : 2) || l.gates.some((h) => h[2] === g[2])) continue; l.gates.push(g); }
    if (!l.gates.length) throw new Error('Dark Forest: labyrinth without a gate');
  }
  // the main paths: entry -> every glade and every gate cell, along the maze
  const adj = Array.from({ length: M * M }, () => []);
  for (const L of links.values()) { adj[L.a].push(L); adj[L.b].push(L); }
  const prev = new Int32Array(M * M).fill(-1), q = [start]; prev[start] = start;
  for (let h = 0; h < q.length; h++) for (const L of adj[q[h]]) { const n = L.a === q[h] ? L.b : L.a; if (prev[n] < 0) { prev[n] = q[h]; q.push(n); } }
  const trace = (m) => { for (let c = m; c !== start && prev[c] >= 0; c = prev[c]) links.get(lk(c, prev[c])).major = true; };
  for (const g of glades) trace(g.my * M + g.mx);
  for (const l of labs) for (const g of l.gates) trace(g[1] * M + g[0]);
  for (const r of marks) trace(r.my * M + r.mx);

  // ---------------------------------------------------------------- carve trails, glades, clearings
  const nodePt = new Array(M * M);
  for (let m = 0; m < M * M; m++) nodePt[m] = [(m % M) * C + 4 + rng.range(-1.2, 1.2), ((m / M) | 0) * C + 4 + rng.range(-1.2, 1.2)];
  const stamp = (ax, ay, bx, by, r, k) => {
    const x0 = Math.floor(Math.min(ax, bx) - r - 1), x1 = Math.ceil(Math.max(ax, bx) + r + 1);
    const y0 = Math.floor(Math.min(ay, by) - r - 1), y1 = Math.ceil(Math.max(ay, by) + r + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y) && segDist(x + 0.5, y + 0.5, ax, ay, bx, by) < r) open(x, y, k);
  };
  const trail = (a, b, major) => {
    // two legs through a sideways-shifted midpoint, so trails wander instead of running on the grid
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, s = rng.range(-1.6, 1.6);
    const mid = [(a[0] + b[0]) / 2 - dy / l * s, (a[1] + b[1]) / 2 + dx / l * s];
    const r = major ? 1.6 : 1.1;
    stamp(a[0], a[1], mid[0], mid[1], r, major ? MAJOR : MINOR);
    stamp(mid[0], mid[1], b[0], b[1], r, major ? MAJOR : MINOR);
  };
  for (const L of links.values()) trail(nodePt[L.a], nodePt[L.b], L.major);
  const disc = (cx, cy, r, k, wob = 0.18) => {
    const ph = rng.range(0, 6.3);
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), rr = r * (1 + wob * Math.sin(a * 3 + ph) * Math.cos(a * 2 - ph));
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < rr) { open(x, y, k); if (kind[I(x, y)] < k && kind[I(x, y)] < WALL) kind[I(x, y)] = k; }
    }
  };
  const ENTRY = [nodePt[start][0], nodePt[start][1]];
  disc(ENTRY[0] + 2, ENTRY[1] - 1, 5.5, CLEARING);
  for (const g of glades) {
    g.cx = g.mx * C + C; g.cy = g.my * C + C;
    disc(g.cx, g.cy, g.type === 'palisade' ? 8.6 : rng.range(6.3, 7.4), GLADE);
  }
  for (const r of marks) { const p = nodePt[r.my * M + r.mx]; r.cx = p[0]; r.cy = p[1]; disc(r.cx, r.cy, r.what === 'swamp' ? 4.6 : 3.6, CLEARING, 0.25); }

  // ---------------------------------------------------------------- labyrinths
  const arches = [], doors = [];
  for (const l of labs) {
    const x0 = l.mx * C, y0 = l.my * C, wT = l.w * C, hT = l.h * C;
    const nx = Math.floor((wT - 1) / 4), ny = Math.floor((hT - 1) / 4);
    const ox = x0 + Math.floor((wT - (4 * nx + 1)) / 2), oy = y0 + Math.floor((hT - (4 * ny + 1)) / 2);
    Object.assign(l, { ox, oy, nx, ny });
    const cellOpen = new Uint8Array((nx * 2 + 1) * (ny * 2 + 1)); // the classic doubled grid: odd/odd = cells
    const GW = nx * 2 + 1, gi = (gx, gy) => gy * GW + gx;
    const cseen = new Uint8Array(nx * ny), st = [[rng.int(0, nx - 1), rng.int(0, ny - 1)]];
    cseen[st[0][1] * nx + st[0][0]] = 1; cellOpen[gi(st[0][0] * 2 + 1, st[0][1] * 2 + 1)] = 1;
    while (st.length) {
      const [cx, cy] = st[st.length - 1];
      const o = N4.filter(([dx, dy]) => { const a = cx + dx, b = cy + dy; return a >= 0 && b >= 0 && a < nx && b < ny && !cseen[b * nx + a]; });
      if (!o.length) { st.pop(); continue; }
      const [dx, dy] = rng.pick(o), a = cx + dx, b = cy + dy;
      cseen[b * nx + a] = 1; cellOpen[gi(a * 2 + 1, b * 2 + 1)] = 1; cellOpen[gi(cx * 2 + 1 + dx, cy * 2 + 1 + dy)] = 1;
      st.push([a, b]);
    }
    // braid: knock through a third of the dead ends so it is a labyrinth, not a chore
    for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
      const exits = N4.filter(([dx, dy]) => cellOpen[gi(cx * 2 + 1 + dx, cy * 2 + 1 + dy)]);
      if (exits.length !== 1 || !rng.chance(0.33)) continue;
      const o = N4.filter(([dx, dy]) => { const a = cx + dx, b = cy + dy; return a >= 0 && b >= 0 && a < nx && b < ny && !cellOpen[gi(cx * 2 + 1 + dx, cy * 2 + 1 + dy)]; });
      if (o.length) { const [dx, dy] = rng.pick(o); cellOpen[gi(cx * 2 + 1 + dx, cy * 2 + 1 + dy)] = 1; }
    }
    // the centre: the Heart's chamber (3 x 3 cells) or a treasure sanctum (2 x 2)
    const span = l.heart ? 3 : 2, c0x = Math.floor((nx - span) / 2), c0y = Math.floor((ny - span) / 2);
    for (let gy = c0y * 2 + 1; gy <= (c0y + span) * 2 - 1; gy++) for (let gx = c0x * 2 + 1; gx <= (c0x + span) * 2 - 1; gx++) cellOpen[gi(gx, gy)] = 1;
    l.center = [ox + (c0x * 2 + span) * 2 + 0.5, oy + (c0y * 2 + span) * 2 + 0.5];
    // to tiles: doubled-grid even coordinates are the wall lines (one tile), odd ones the 3-tile corridors
    const tileOf = (v) => (v % 2 ? (v - 1) * 2 + 1 : v * 2); // grid -> first tile offset
    for (let gy = 0; gy < ny * 2 + 1; gy++) for (let gx = 0; gx < GW; gx++) {
      const tx = ox + tileOf(gx), ty = oy + tileOf(gy), w = gx % 2 ? 3 : 1, h = gy % 2 ? 3 : 1;
      const inCentre = gx >= c0x * 2 + 1 && gx <= (c0x + span) * 2 - 1 && gy >= c0y * 2 + 1 && gy <= (c0y + span) * 2 - 1;
      for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
        const i = I(x, y);
        labOf[i] = labs.indexOf(l);
        if (cellOpen[gi(gx, gy)]) { kind[i] = inCentre ? (l.heart ? HEART : GLADE) : CORRIDOR; map.block[i] = 0; }
        else { kind[i] = WALL; fam[i] = l.family; map.block[i] = 1; }
      }
    }
    // the ring between the labyrinth wall and its macro cells stays wood
    for (const [gmx, gmy, side] of l.gates) {
      const outside = nodePt[gmy * M + gmx];
      // the corridor along this side nearest to the outside cell
      const alongX = side === 'N' || side === 'S';
      const n = alongX ? nx : ny, base = alongX ? ox : oy, want = alongX ? outside[0] : outside[1];
      let k = Math.max(0, Math.min(n - 1, Math.round((want - base - 2) / 4)));
      const g = base + 4 * k + 2;
      const line = side === 'N' ? oy : side === 'S' ? oy + 4 * ny : side === 'W' ? ox : ox + 4 * nx;
      const [gx, gy] = alongX ? [g, line] : [line, g];
      kind[I(gx, gy)] = ARCH; map.block[I(gx, gy)] = 0;
      for (const s of [-1, 1]) { const [px, py] = alongX ? [gx + s, gy] : [gx, gy + s]; kind[I(px, py)] = PIER; fam[I(px, py)] = l.family; map.block[I(px, py)] = 1; }
      const out = side === 'N' ? [gx, gy - 1] : side === 'S' ? [gx, gy + 1] : side === 'W' ? [gx - 1, gy] : [gx + 1, gy];
      stamp(out[0] + 0.5, out[1] + 0.5, outside[0], outside[1], 1.6, MAJOR);
      open(out[0], out[1], MAJOR);
      arches.push({ x: gx + 0.5, y: gy + 0.5, axis: alongX ? 'x' : 'y', design: l.arch, flip: rng.chance(0.5) });
      l.gateAt = l.gateAt || [gx + 0.5, gy + 0.5];
    }
  }

  // ---------------------------------------------------------------- the palisade stockade (bandit glade)
  for (const g of glades.filter((v) => v.type === 'palisade')) {
    const R = 6, x0 = Math.round(g.cx) - R, y0 = Math.round(g.cy) - R, x1 = x0 + 2 * R, y1 = y0 + 2 * R;
    const sides = [[x0, y0, 1, 0, 0, -1], [x0, y1, 1, 0, 0, 1], [x0, y0, 0, 1, -1, 0], [x1, y0, 0, 1, 1, 0]];
    for (const [sx, sy, dx, dy, ex, ey] of sides) {
      const outsideOpen = [];
      for (let t = 0; t <= 2 * R; t++) { const x = sx + dx * t, y = sy + dy * t; outsideOpen.push(t > 1 && t < 2 * R - 1 && !map.block[I(x + ex, y + ey)]); }
      for (let t = 0; t <= 2 * R; t++) { const i = I(sx + dx * t, sy + dy * t); kind[i] = WALL; fam[i] = 'timber_palisade'; map.block[i] = 1; }
      for (let t = 2; t < 2 * R - 1; t++) {
        if (!outsideOpen[t] || outsideOpen[t - 1] && t > 2) continue;
        let e = t; while (e + 1 < 2 * R - 1 && outsideOpen[e + 1]) e++;
        const m = Math.round((t + e) / 2), x = sx + dx * m, y = sy + dy * m, i = I(x, y);
        kind[i] = DOOR; map.block[i] = 0;
        doors.push({ x: x + 0.5, y: y + 0.5, axis: dx ? 'x' : 'y', design: 'ironbound_blackwood', first: rng.chance(0.5) });
        t = e;
      }
    }
    g.palisade = [x0, y0, x1, y1];
  }

  // ---------------------------------------------------------------- floors
  const F = Object.fromEntries(tileset.floors.map((f, i) => [f.name, i]));
  const f = (n) => F[n] ?? 0;
  const pickF = (list) => f(rng.pick(list));
  const noise = (x, y, s, o) => Math.sin(x * s + o) * Math.cos(y * s * 0.8 - o * 1.3) + Math.sin((x + y) * s * 0.5 + o * 2) * 0.5;
  const so = (seed % 1000) * 0.37;
  const special = []; // [cx, cy, r, floors[]]
  for (const r of marks) {
    if (r.what === 'swamp') special.push([r.cx, r.cy, 6, ['shallow_water', 'marsh_reeds', 'dark_puddle', 'wet_clay', 'damp_moss']]);
    if (r.what === 'webs') special.push([r.cx, r.cy, 6, ['spider_silk', 'beetle_shells', 'black_fungi', 'spider_silk']]);
    if (r.what === 'camp') special.push([r.cx, r.cy, 3.5, ['old_camp_ash', 'packed_mud', 'bark_fragments']]);
  }
  for (const g of glades) {
    const th = { nest: ['spider_silk', 'beetle_shells'], thorns: ['thorn_litter', 'torn_roots'], barrow: ['ancient_bones', 'skeletal_remains', 'stone_cairn_base'],
      fairyring: ['pale_mushrooms', 'white_petals', 'blue_spores'], woodcutters: ['bark_fragments', 'tangled_twigs', 'old_camp_ash'],
      wolfmoon: ['wolf_tracks', 'claw_gouges', 'feather_scatter'], effigies: ['charred_patch', 'burnt_roots'], lanterns: ['white_petals', 'mossy_cobbles'],
      druids: ['ritual_spiral', 'green_lichen'], wisps: ['blue_spores', 'poison_moss'], lostchildren: ['crushed_berries', 'scattered_acorns'], palisade: ['hoof_marks', 'cart_ruts', 'arrow_debris'] }[g.type] || [];
    special.push([g.cx, g.cy, 7.5, th, true]);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), k = kind[i], n = noise(x, y, 0.07, so);
    let v;
    if (k === MAJOR) v = rng.chance(0.09) ? pickF(['cart_ruts', 'hoof_marks', 'wolf_tracks', 'deer_tracks', 'broken_path_stones']) : f('packed_mud');
    else if (k === MINOR) v = rng.chance(0.08) ? pickF(['fern_litter', 'exposed_roots', 'scattered_acorns', 'deer_tracks', 'red_leaves']) : f(n > 0.3 ? 'pine_needles' : 'dead_leaves');
    else if (k === CORRIDOR || k === ARCH || k === PIER || k === WALL) {
      // each labyrinth's corridors in a floor that stands out from its walls
      const fl = LAB_FLOORS[labs[labOf[i]]?.family] || LAB_FLOORS.mossy_ruins;
      v = rng.chance(0.14) ? pickF(fl[1]) : f(fl[0][(n > 0) | 0]);
    }
    else if (k === HEART) v = rng.chance(0.25) ? pickF(['ancient_paving', 'sunken_rune', 'mossy_cobbles']) : f('damp_moss');
    else if (k === GLADE || k === CLEARING) v = rng.chance(0.07) ? pickF(['fern_litter', 'white_petals', 'pale_mushrooms', 'dead_grass']) : f(n > 0.4 ? 'damp_moss' : 'dark_turf');
    else v = rng.chance(0.05) ? pickF(['exposed_roots', 'rotting_wood', 'pine_cones', 'bark_fragments', 'green_lichen', 'black_fungi']) :
      f(n > 0.75 ? 'pine_needles' : n > 0.2 ? 'black_loam' : n > -0.4 ? 'dead_leaves' : n > -0.9 ? 'root_soil' : 'peat');
    for (const [cx, cy, r, list, glade] of special) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (list.length && d < r && (glade ? k === GLADE && rng.chance(0.16) : rng.chance(1.1 - d / r))) v = pickF(list);
    }
    map.v[i] = v;
  }
  for (const l of labs) if (l.heart) map.v[I(Math.floor(l.center[0]), Math.floor(l.center[1]) + 3)] = f('ritual_spiral');

  // ---------------------------------------------------------------- walls, arches and doors as draw items
  const OFF = { NE: [0, -0.25], SE: [0.25, 0], SW: [0, 0.25], NW: [-0.25, 0] };
  map.walls = []; map.doors = []; map.segments = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = I(x, y);
    if (kind[i] !== WALL) continue;
    let mask = 0;
    for (const [dx, dy, bit] of N4) if (WALLISH.has(kind[I(x + dx, y + dy)])) mask |= bit;
    const set = tileset.walls[fam[i]] || tileset.walls[tileset.families[0]];
    const vars = set[mask] || set[0];
    const piece = vars[(((x * 73856093) ^ (y * 19349663)) >>> 0) % vars.length];
    for (const sl of piece) {
      const [ox, oy] = OFF[sl.arm] || [0, 0];
      map.walls.push({ kind: 'wall', x: x + 0.5, y: y + 0.5, r: sl, front: false, depth: x + y + 1 + ox + oy });
    }
  }
  for (const o of arches) {
    const dir = o.axis === 'x' ? (o.flip ? 'NW' : 'SE') : (o.flip ? 'NE' : 'SW');
    const sls = tileset.arches[o.design]?.[dir] || Object.values(tileset.arches)[0][dir];
    for (const sl of sls) {
      const a = dir === 'NW' || dir === 'NE' ? -sl.a : sl.a;
      map.walls.push({ kind: 'arch', x: o.x, y: o.y, axis: o.axis, r: sl, depth: o.x + o.y + a });
    }
  }
  for (const o of doors) {
    const dir = o.axis === 'x' ? (o.first ? 'SE' : 'NW') : (o.first ? 'SW' : 'NE');
    const door = { kind: 'door', x: o.x, y: o.y, axis: o.axis, open: false, art: tileset.doors[o.design][dir] };
    map.doors.push(door);
    for (const part of ['L', 'R', 'leaf']) {
      const sl = door.art[part === 'leaf' ? 'open' : 'closed'].find((p) => p.part === part);
      if (sl) map.walls.push({ kind: 'door', door, part, x: o.x, y: o.y, depth: o.x + o.y + sl.du + sl.dv });
    }
  }
  map.indexWalls();

  // ---------------------------------------------------------------- props: trees, undergrowth, dressing
  const props = [], scat = new Map(tileset.scatter.map((s) => [s.name, s]));
  const prop = (name, x, y, o = {}) => {
    const s = scat.get(name);
    if (!s) return null;
    const p = { kind: 'scatter', x, y, spr: s, k: tileset.k * (o.scale || 1), flip: o.flip ?? rng.chance(0.5), light: o.light || 0 };
    props.push(p);
    return p;
  };
  const walkable = (x, y) => inb(x, y) && !map.block[I(x, y)];
  const nearOpen = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (walkable(x + dx, y + dy)) return true; return false; };
  // tree species follow broad stands (a pine ridge, an old oak wood, a dead quarter, wet hollows)
  const stand = (x, y) => {
    for (const s of special) if (s[3].includes('shallow_water') && Math.hypot(x - s[0], y - s[1]) < 10) return 'wet';
    const a = noise(x, y, 0.045, so + 11), b = noise(x, y, 0.03, so + 29);
    return a > 0.55 ? 'pine' : b > 0.7 ? 'dead' : b < -0.85 ? 'wet' : a < -0.6 ? 'pine' : 'oak';
  };
  const treeGrid = new Uint8Array(N), placed = [];
  const order = shuffle(Array.from({ length: N }, (_, i) => i));
  for (const i of order) {
    if (kind[i] !== FOREST || !map.block[i]) continue;
    const x = i % W, y = (i / W) | 0;
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    const edge = nearOpen(x, y, 1), far = !nearOpen(x, y, 3);
    const sp = edge ? 1.3 : far ? 2.3 : 1.75;
    const px = x + 0.5 + rng.range(-0.22, 0.22), py = y + 0.5 + rng.range(-0.22, 0.22);
    let ok = true;
    const R = Math.ceil(sp);
    for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R && ok; dx++) {
      const j = I(Math.min(W - 1, Math.max(0, x + dx)), Math.min(H - 1, Math.max(0, y + dy)));
      if (treeGrid[j]) { const t = placed[treeGrid[j] - 1]; if (Math.hypot(t.x - px, t.y - py) < sp) ok = false; }
    }
    if (!ok) continue;
    const spr = darkForestTree(rng.pick(TREES[stand(x, y)]));
    if (!spr) continue;
    const p = { kind: 'scatter', x: px, y: py, spr, k: darkTreeK(rng.range(0.7, 0.9)), flip: rng.chance(0.5), tree: true };
    placed.push(p); treeGrid[i] = placed.length;
  }
  // undergrowth fills the gaps along the wood's edge; trailside clutter is walk-over only
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = I(x, y);
    if (kind[i] === FOREST && map.block[i] && !treeGrid[i] && nearOpen(x, y, 1) && rng.chance(0.45)) prop(rng.pick(UNDERGROWTH), x + 0.5 + rng.range(-0.2, 0.2), y + 0.5 + rng.range(-0.2, 0.2));
    else if ((kind[i] === MINOR || kind[i] === MAJOR) && !map.block[i] && rng.chance(0.022)) {
      const s = scat.get(rng.pick(TRAILSIDE));
      if (s && !s.block) prop(s.name, x + 0.5 + rng.range(-0.3, 0.3), y + 0.5 + rng.range(-0.3, 0.3));
    }
  }
  // lanterns mark the main paths now and then; signposts stand where trails fork
  const torches = [];
  for (const L of links.values()) {
    if (!L.major || !rng.chance(0.16)) continue;
    const [x, y] = nodePt[L.a];
    const at = [x + rng.range(-1.6, 1.6), y + rng.range(-1.6, 1.6)];
    if (walkable(Math.floor(at[0]), Math.floor(at[1]))) prop('lantern_stake', at[0], at[1], { light: 3.5, flip: false });
  }
  for (let m = 0; m < M * M; m++) if (adj[m].length >= 3 && cellOf[m] < 0 && rng.chance(0.35)) { const [x, y] = nodePt[m]; prop('trail_sign', x + 1.2, y - 1.2); }
  // landmark set pieces
  for (const r of marks) {
    const { cx, cy } = r;
    const put = (n, dx, dy, o) => prop(n, cx + dx, cy + dy, o);
    if (r.what === 'camp') { put('campfire', 0, 0, { light: 5 }); put('bedroll', 1.3, 0.6); put('bedroll', -1.1, 1.0); put('firewood', 1.0, -1.2); put('wooden_crate', -1.6, -0.8); }
    if (r.what === 'well') { put('stone_well', 0, 0); put('rope_post', 1.6, 0.8); put('wooden_crate', -1.4, 1.2); }
    if (r.what === 'shrine') { put('ruined_shrine', 0, -0.4, { light: 3 }); put('vine_altar', 1.8, 1); put('lost_shield', -1.4, 1.1); }
    if (r.what === 'obelisk') { put('forest_obelisk', 0, 0, { light: 3 }); put('stone_cairn', 1.6, 1.2); put('stone_cairn', -1.6, -1.0); }
    if (r.what === 'swamp') { put('reeds', 1.5, 0.5); put('reeds', -1.4, -0.6); put('bridge_planks', 0, 0); put('hollow_log', 2.2, -1.2); }
    if (r.what === 'webs') { put('spider_eggs', 0.8, 0.2); put('wrapped_corpse', -1.2, 0.8); put('spider_eggs', -0.6, -1.3); put('wrapped_corpse', 1.6, -1.0); }
  }
  for (const g of glades) {
    const put = (n, dx, dy, o) => prop(n, g.cx + dx, g.cy + dy, o);
    put('druid_stone', 0, -2.4, { light: 3, flip: false }); // the glade's shrine stone
    put('raven_perch', rng.range(-5, 5), -5.6);
    for (let n = 0; n < 6; n++) { const a = rng.range(0, 6.3), d = rng.range(5, 6.6), s = scat.get(rng.pick(['fern_clump', 'pale_mushrooms', 'reeds', 'deer_skull', 'feather_scatter'])); if (s && !s.block) prop(s.name, g.cx + Math.cos(a) * d, g.cy + Math.sin(a) * d); }
  }
  // the Heart: the elder heartwood, ringed by druid stones
  const H0 = heart.center;
  const elder = darkForestTree('elder_heartwood');
  if (elder) {
    placed.push({ kind: 'scatter', x: H0[0], y: H0[1], spr: elder, k: darkTreeK(1.08), flip: false, tree: true, elder: true });
  }
  map.block[I(Math.floor(H0[0]), Math.floor(H0[1]))] = 1;
  for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2 + Math.PI / 6; prop(n % 2 ? 'forest_obelisk' : 'druid_stone', H0[0] + Math.cos(a) * 4.6, H0[1] + Math.sin(a) * 4.6, { light: 2.5, flip: false }); }
  for (const l of labs) if (!l.heart) { prop('ruined_shrine', l.center[0] - 1.6, l.center[1] - 1.6, { light: 3 }); prop('buried_urn', l.center[0] + 1.4, l.center[1] - 1.2); }
  // blocking props mark their tile, so trees and pathing agree with what is drawn
  for (const p of props) if (p.spr.block && p.spr.fp >= 0.5) {
    const i = I(Math.floor(p.x), Math.floor(p.y));
    if (kind[i] === FOREST) map.block[i] = 1;
  }

  // ---------------------------------------------------------------- chests at dead ends and sanctums, monsters
  const chests = [], spawns = [], looks = rollLooks(biome, rng.fn());
  const dead = [];
  for (let m = 0; m < M * M; m++) if (adj[m].length === 1 && cellOf[m] < 0 && seen[m]) dead.push(m);
  shuffle(dead);
  const archs = biome.roster;
  const pack = (x, y, n, rank = 'normal', arch = rng.pick(archs)) => spawns.push({ x, y, arch, n, rank, look: looks.pick(arch) });
  const dist = (x, y, p) => Math.hypot(x - p[0], y - p[1]);
  for (const m of dead.slice(0, 12)) {
    const [x, y] = nodePt[m];
    if (dist(x, y, ENTRY) < 18 || !walkable(Math.floor(x), Math.floor(y))) continue;
    chests.push({ x, y, rare: rng.chance(0.25), far: 40 });
    if (rng.chance(0.7)) pack(x + 1.5, y + 1.2, rng.int(2, 4), rng.chance(0.4) ? 'champion' : 'normal');
  }
  for (const l of labs) if (!l.heart) { chests.push({ x: l.center[0] + 0.3, y: l.center[1] + 0.6, rare: true, far: 40 }); pack(l.center[0] - 1.5, l.center[1] + 1.5, 3, 'champion'); }
  for (let m = 0; m < M * M; m++) {
    if (!seen[m] || cellOf[m] >= 0 || !rng.chance(0.15)) continue;
    const [x, y] = nodePt[m];
    if (dist(x, y, ENTRY) < 16 || glades.some((g) => dist(x, y, [g.cx, g.cy]) < 11)) continue;
    pack(x, y, rng.int(2, 4), spawns.length % 9 === 0 ? 'champion' : 'normal');
  }
  for (const l of labs) for (let n = 0; n < (l.heart ? 7 : 4); n++) {
    const x = l.ox + 4 * rng.int(0, l.nx - 1) + 2.5, y = l.oy + 4 * rng.int(0, l.ny - 1) + 2.5;
    if (walkable(Math.floor(x), Math.floor(y)) && dist(x, y, l.center) > 6) pack(x, y, rng.int(2, 3), n === 0 ? 'champion' : 'normal');
  }

  // ---------------------------------------------------------------- portals, objectives, checks
  const exit = [H0[0] + 3.9, H0[1] - 0.2];
  const reach = new Uint8Array(N), qq = [I(Math.floor(ENTRY[0]), Math.floor(ENTRY[1]))];
  if (map.block[qq[0]]) throw new Error('Dark Forest: blocked entry');
  reach[qq[0]] = 1;
  for (let h = 0; h < qq.length; h++) {
    const i = qq[h], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of N4) { const j = I(x + dx, y + dy); if (walkable(x + dx, y + dy) && !reach[j]) { reach[j] = 1; qq.push(j); } }
  }
  const must = [exit, [H0[0], H0[1] + 2.5], ...glades.map((g) => [g.cx, g.cy]), ...chests.map((c) => [c.x, c.y])];
  for (const [x, y] of must) if (!reach[I(Math.floor(x), Math.floor(y))]) throw new Error('Dark Forest: unreachable objective at ' + x.toFixed(1) + ',' + y.toFixed(1));
  // eight spots round a glade (and its centre), each pulled in until it stands on open ground
  const ring = (cx, cy, r = 5.5) => Array.from({ length: 9 }, (_, i) => {
    const a = i * Math.PI * 2 / 8;
    for (let rr = r; rr > 1.5; rr -= 0.5) {
      const p = [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9];
      if (walkable(Math.floor(p[0]), Math.floor(p[1])) && reach[I(Math.floor(p[0]), Math.floor(p[1]))]) return p;
    }
    return [cx, cy];
  });
  // dead ends far from a glade (for the lost children)
  const hideouts = dead.map((m) => nodePt[m]).filter(([x, y]) => walkable(Math.floor(x), Math.floor(y)));
  const gladeOut = glades.map((g) => ({
    index: g.index, type: g.type, center: [g.cx, g.cy], shrine: [g.cx, g.cy - 1.2], sites: ring(g.cx, g.cy), palisade: g.palisade || null,
    hideouts: hideouts.filter(([x, y]) => dist(x, y, [g.cx, g.cy]) > 10 && dist(x, y, [g.cx, g.cy]) < 30).slice(0, 6),
  }));
  map.kind = kind;
  // ~18,000 trees never move: the renderer takes them from 8 x 8 tile buckets around the view (render.js)
  const B = 8, bw = W / B, bh = H / B, cells = Array.from({ length: bw * bh }, () => []);
  for (const t of placed) cells[Math.floor(t.y / B) * bw + Math.floor(t.x / B)].push(t);
  map.treeCells = { B, bw, bh, cells };
  return {
    map, props, trees: placed, buildings: [], wallHangings: [], townTiles: null, looks, spawns, chests, torches,
    start: ENTRY, exit, shrine: [H0[0], H0[1] + 2.6], sites: ring(H0[0], H0[1], 5),
    glades: gladeOut, heart: { center: H0, gate: heart.gateAt, shrine: [H0[0], H0[1] + 2.6], sites: ring(H0[0], H0[1], 5.2) },
    labyrinths: labs.map((l) => ({ heart: !!l.heart, family: l.family, rect: [l.ox, l.oy, l.ox + 4 * l.nx, l.oy + 4 * l.ny], center: l.center, gates: l.gates.length })),
    landmarks: marks.map((r) => ({ what: r.what, at: [r.cx, r.cy] })),
    scenarioId: 0, seed: savedSeed, layoutSeed: seed,
  };
}
