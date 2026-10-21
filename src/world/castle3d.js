// The Castle's masonry as one 3D description (docs/CASTLE_3D.md), shared by the game and the bake:
//  - castleworld.js reads the per-tile heights and flags: curtain walls walked along the top, stairs up to them, towers,
//    gate tunnels, the explorable keep and the halls (a height map: src/world/map.js, src/gfx/terrain.js);
//  - tools/castle3d.html builds the same parts in three.js and bakes them from the game camera into per-tile pieces
//    (assets/tiles/castle3d/), plus the drawbridge and door frames. The game never runs three.js.
// Pure data (no canvas or DOM), so it runs under Node. Heights are terrain levels (HS = 4 world px); x, y are tiles.
export const C3 = Object.freeze({
  W: 336, H: 304,
  OW: 26, IW: 34,          // wall-walk levels: outer and inner curtain (the inner wall commands the outer)
  GH: 42,                  // outer gatehouse
  KF: 2, KW: 34, KT: 50,   // keep: floor, walls, great tower
});
const { W, H, OW, IW, GH, KF, KW, KT } = C3;
// curtain rings and gates in wall cells (a cell is 2 x 2 tiles), as castleworld.js
const OUT = { x0: 48, y0: 34, x1: 120, y1: 100 }, INN = { x0: 62, y0: 48, x1: 106, y1: 86 };
const GATES = { outer: [84, 100], postern: [104, 34], inner: [96, 86], innerNorth: [72, 48] };

export const K = Object.freeze({ none: 0, wall: 1, walk: 2, parapet: 3, stair: 4, tower: 5, gate: 6, keep: 7, floor: 8, door: 9, pier: 10, bridge: 11 });
/** Buildings: their roofs lift off while the hero is inside. */
export const BLD = Object.freeze({ keep: 1, cathedral: 2, great_hall: 3 });

let cache = null;
/**
 * The castle: per tile `hgt` (level), `kind`, `solid` (blocked), `walk` (a wall-walk tile), `cover` (masonry over a
 * walkway: tunnels, doorways), `bld` (inside a building), `struct` (drawn from the bake); and `parts` (the bake's
 * geometry), `doors`, `drawbridge`, `stairs`, `rooms`, `posts` (wall-walk muster points).
 */
export function castle3d() {
  if (cache) return cache;
  const N = W * H, I = (x, y) => y * W + x;
  const hgt = new Int16Array(N), kind = new Uint8Array(N), solid = new Uint8Array(N), walk = new Uint8Array(N);
  const cover = new Uint8Array(N), bld = new Uint8Array(N), struct = new Uint8Array(N);
  const parts = [], doors = [], stairs = [], posts = [], rooms = [];
  const rect = (x0, y0, x1, y1, fn) => { for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) fn(x, y, I(x, y)); };
  const set = (x0, y0, x1, y1, lv, k, o = {}) => rect(x0, y0, x1, y1, (x, y, i) => {
    hgt[i] = lv; kind[i] = k; solid[i] = o.solid ? 1 : 0; walk[i] = o.walk ? 1 : 0; cover[i] = o.cover ? 1 : 0; struct[i] = o.flat ? 0 : 1;
  });
  const mass = (x0, y0, x1, y1, top, k = K.wall) => set(x0, y0, x1, y1, top, k, { solid: true });
  const deck = (x0, y0, x1, y1, lv, k = K.walk, rampart = true) => set(x0, y0, x1, y1, lv, k, { walk: rampart });
  const tunnel = (x0, y0, x1, y1, lv, k = K.gate) => set(x0, y0, x1, y1, lv, k, { cover: true });
  // geometry for the bake: boxes span tile edges x0..x1, y0..y1; z in levels
  const box = (x0, y0, x1, y1, z0, z1, m, o = {}) => parts.push({ t: 'box', x0, y0, x1, y1, z0, z1, m, ...o });
  const cyl = (x, y, r, z0, z1, m, o = {}) => parts.push({ t: 'cyl', x, y, r, z0, z1, m, ...o });
  // a wall face's dressing: along `axis` from a0 to a1 at c (the face plane), facing dir (-1 / +1): arrow slits, string
  // courses, buttress pilasters, framed lancet windows (see tools/castle3d.html)
  const face = (axis, a0, a1, c, dir, z0, z1, o) => parts.push({ t: 'face', axis, a0, a1, c, dir, z0, z1, ...o });

  // ------------------------------------------------------------- curtains
  // A ring of wall cells thickened by one tile on the ward side: the outermost row is the parapet (blocked; its
  // breastwork and merlons stand on it), the two rows inside it are the wall-walk. Gates leave a tunnel through.
  const sideOf = (R, [gx, gy]) => gy === R.y0 ? 'N' : gy === R.y1 ? 'S' : gx === R.x0 ? 'W' : 'E';
  const curtain = (R, lv, gates, tag) => {
    const X0 = R.x0 * 2, Y0 = R.y0 * 2, X1 = R.x1 * 2 + 1, Y1 = R.y1 * 2 + 1;
    const gateAt = (x, y) => gates.some((g) => {
      const s = sideOf(R, g), u = s === 'N' || s === 'S';
      return u ? x >= g[0] * 2 && x <= g[0] * 2 + 1 && (s === 'N' ? y - Y0 : Y1 - y) <= 2 : y >= g[1] * 2 && y <= g[1] * 2 + 1 && (s === 'W' ? x - X0 : X1 - x) <= 2;
    });
    rect(X0, Y0, X1, Y1, (x, y) => {
      const d = Math.min(x - X0, X1 - x, y - Y0, Y1 - y);
      if (d > 2) return;
      if (gateAt(x, y)) tunnel(x, y, x, y, 0);
      else if (d === 0) mass(x, y, x, y, lv, K.parapet);
      else deck(x, y, x, y, lv);
    });
    for (const side of ['N', 'S', 'W', 'E']) {
      const u = side === 'N' || side === 'S';
      const [a0, a1] = u ? [X0, X1 + 1] : [Y0, Y1 + 1];                                 // along (tile edges)
      const [c0, c1] = { N: [Y0, Y0 + 3], S: [Y1 - 2, Y1 + 1], W: [X0, X0 + 3], E: [X1 - 2, X1 + 1] }[side];   // across
      const cuts = gates.filter((g) => sideOf(R, g) === side).map((g) => (u ? g[0] : g[1]) * 2).sort((p, q) => p - q);
      let s = a0;
      for (const c of [...cuts, a1]) {
        if (c > s) {
          if (u) box(s, c0, c, c1, 0, lv, 'ashlar', { top: 'walk' }); else box(c0, s, c1, c, 0, lv, 'ashlar', { top: 'walk' });
          const out = { N: [Y0, Y0 + 1], S: [Y1, Y1 + 1], W: [X0, X0 + 1], E: [X1, X1 + 1] }[side];
          parts.push({ t: 'parapet', axis: u ? 'x' : 'y', a0: s, a1: c, c0: out[0], c1: out[1], z: lv, side, m: 'ashlar' });
          const fc = { N: [Y0, -1], S: [Y1 + 1, 1], W: [X0, -1], E: [X1 + 1, 1] }[side];
          face(u ? 'x' : 'y', s, c, fc[0], fc[1], 0, lv, { slits: 4, course: lv - 3 });
          const ic = { N: [Y0 + 3, 1], S: [Y1 - 2, -1], W: [X0 + 3, 1], E: [X1 - 2, -1] }[side];
          face(u ? 'x' : 'y', s, c, ic[0], ic[1], 0, lv, { course: lv - 3 });
          const o = { N: [Y0 - 0.3, Y0 + 0.5], S: [Y1 + 0.5, Y1 + 1.3], W: [X0 - 0.3, X0 + 0.5], E: [X1 + 0.5, X1 + 1.3] }[side];
          if (u) box(s, o[0], c, o[1], 0, 3, 'ashlar', { batter: side }); else box(o[0], s, o[1], c, 0, 3, 'ashlar', { batter: side });
        }
        s = c + 2;
      }
    }
    return { X0, Y0, X1, Y1, tag };
  };
  const outer = curtain(OUT, OW, [GATES.outer, GATES.postern], 'outer');
  const inner = curtain(INN, IW, [GATES.inner, GATES.innerNorth], 'inner');

  // ------------------------------------------------------------- towers
  // Round drums on the corners: a platform at the walk's level inside a crenellated rim (blocked), open on the side the
  // two walls come in from (gap: degrees, tile x toward y), so the walk runs straight through. The inner curtain's
  // drums are roofed and taller: their upper walls are open on that side too, the walk passing under the roof.
  const inGap = (a, [g0, g1]) => { const t = ((a - g0) % 360 + 360) % 360; return t <= ((g1 - g0) % 360 + 360) % 360; };
  const drum = (cx, cy, r, lv, roofed, gap) => {
    rect(Math.floor(cx - r), Math.floor(cy - r), Math.ceil(cx + r), Math.ceil(cy + r), (x, y, i) => {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx) * 180 / Math.PI;
      if (d > r) return;
      if (d > r - 1.15 && !inGap(a, gap)) mass(x, y, x, y, lv + (roofed ? 14 : 0), K.tower);
      else if (roofed) set(x, y, x, y, lv, K.tower, { walk: true, cover: true });
      else deck(x, y, x, y, lv, K.tower);
    });
    cyl(cx, cy, r, 0, lv, 'ashlar', { top: 'walk' });
    cyl(cx, cy, r + 0.3, 0, 3, 'ashlar');
    if (roofed) {
      cyl(cx, cy, r, lv, lv + 14, 'ashlar', { shell: 0.8, cover: true, gap });
      parts.push({ t: 'cone', x: cx, y: cy, r: r + 0.5, z: lv + 14, h: 40, m: 'slate', cover: true });
    } else parts.push({ t: 'ringParapet', x: cx, y: cy, r, z: lv, m: 'ashlar', gap });
  };
  // the gap faces the two walls: NW -> +x and +y, NE -> -x and +y, SW -> +x and -y, SE -> -x and -y
  const GAP = { NW: [-30, 120], NE: [60, 210], SW: [-120, 30], SE: [150, 300] };
  // Square towers stand two tiles out from the wall, crenellated on their three outer sides; the walk runs through.
  const squareTower = (R, side, c, lv) => {
    const X0 = R.x0 * 2, Y0 = R.y0 * 2, X1 = R.x1 * 2 + 1, Y1 = R.y1 * 2 + 1;
    const u = side === 'N' || side === 'S';
    const [x0, x1, y0, y1] = u ? [c * 2 - 1, c * 2 + 2, side === 'N' ? Y0 - 2 : Y1 - 2, side === 'N' ? Y0 + 2 : Y1 + 2]
      : [side === 'W' ? X0 - 2 : X1 - 2, side === 'W' ? X0 + 2 : X1 + 2, c * 2 - 1, c * 2 + 2];
    rect(x0, y0, x1, y1, (x, y) => {
      const outward = { N: y <= Y0, S: y >= Y1, W: x <= X0, E: x >= X1 }[side];
      if (outward) mass(x, y, x, y, lv + 2, K.tower); else deck(x, y, x, y, lv, K.tower);
    });
    box(x0, y0, x1 + 1, y1 + 1, 0, lv, 'ashlar', { top: 'walk' });
    const o = { N: [x0, y0, x1 + 1, Y0 + 1], S: [x0, Y1, x1 + 1, y1 + 1], W: [x0, y0, X0 + 1, y1 + 1], E: [X1, y0, x1 + 1, y1 + 1] }[side];
    box(o[0], o[1], o[2], o[3], lv, lv + 2, 'ashlar', { top: 'walk' });
    parts.push({ t: 'towerParapet', x0, y0, x1: x1 + 1, y1: y1 + 1, z: lv + 2, open: { N: 'S', S: 'N', W: 'E', E: 'W' }[side], m: 'ashlar' });
    box(x0 - 0.3, y0 - 0.3, x1 + 1.3, y1 + 1.3, 0, 3, 'ashlar');
  };
  for (const [cx, cy, c] of [[98, 70, 'NW'], [240, 70, 'NE'], [98, 200, 'SW'], [240, 200, 'SE']]) drum(cx, cy, 3.4, OW, false, GAP[c]);
  for (const c of [60, 78, 92]) squareTower(OUT, 'N', c, OW);
  for (const c of [52, 67, 82]) { squareTower(OUT, 'W', c, OW); squareTower(OUT, 'E', c, OW); }
  for (const c of [64, 104]) squareTower(OUT, 'S', c, OW);
  for (const [cx, cy, c] of [[126, 98, 'NW'], [212, 98, 'NE'], [126, 172, 'SW'], [212, 172, 'SE']]) drum(cx, cy, 3.2, IW, true, GAP[c]);
  squareTower(INN, 'W', 67, IW); squareTower(INN, 'E', 67, IW); squareTower(INN, 'N', 84, IW); squareTower(INN, 'S', 80, IW);

  // ------------------------------------------------------------- the gatehouse, the moat crossing, the twin gates
  const gx = GATES.outer[0] * 2;    // tunnel tiles gx, gx + 1
  mass(gx - 6, 196, gx + 7, 201, GH, K.gate);
  tunnel(gx, 196, gx + 1, 203, 0);
  box(gx - 6, 196, gx, 202, 0, GH, 'ashlar', { top: 'walk' });
  box(gx + 2, 196, gx + 8, 202, 0, GH, 'ashlar', { top: 'walk' });
  parts.push({ t: 'arch', axis: 'y', x0: gx, x1: gx + 2, y0: 196, y1: 202, z0: 0, z1: GH, spring: 11, apex: 17, m: 'ashlar', cover: true });
  parts.push({ t: 'towerParapet', x0: gx - 6, y0: 196, x1: gx + 8, y1: 202, z: GH, open: null, m: 'ashlar' });
  // the drums flank the mouth and stand out over the berm; between them the tunnel runs on to the drawbridge
  for (const cx of [gx - 3.2, gx + 5.2]) {
    rect(Math.floor(cx - 3), 199, Math.ceil(cx + 3), 203, (x, y) => { if (Math.hypot(x + 0.5 - cx, y + 0.5 - 201.8) <= 2.5 && (x < gx || x > gx + 1)) mass(x, y, x, y, GH + 8, K.gate); });
    cyl(cx, 201.8, 2.5, 0, GH + 8, 'ashlar', { top: 'walk' });
    cyl(cx, 201.8, 2.8, 0, 3, 'ashlar');
    parts.push({ t: 'ringParapet', x: cx, y: 201.8, r: 2.5, z: GH + 8, m: 'ashlar' });
  }
  parts.push({ t: 'arch', axis: 'y', x0: gx - 0.8, x1: gx + 2.8, y0: 202, y1: 203.6, z0: 0, z1: GH, spring: 11, apex: 19, m: 'ashlar', cover: true });
  face('x', gx - 6, gx + 8, 196, -1, 0, GH, { course: GH - 3 });
  face('x', gx - 1, gx + 3, 203.6, 1, 0, GH, { course: GH - 3, slits: 2 });
  // the drawbridge (tiles gx..gx+1 x 204..207: water until it is down), a stone pier, a stone causeway to the bank
  const drawbridge = { x0: gx, x1: gx + 2, hinge: 204, y1: 208 };
  rect(gx, 204, gx + 1, 207, (x, y, i) => { kind[i] = K.bridge; solid[i] = 1; });
  set(gx - 2, 208, gx + 3, 209, 0, K.pier);
  box(gx - 2, 208, gx + 4, 210, -6, 0, 'ashlar', { top: 'setts' });
  set(gx, 210, gx + 1, 211, 0, K.bridge);
  box(gx - 0.15, 210, gx + 2.15, 212, -6, 0, 'ashlar', { top: 'setts' });
  // twin-towered gates: the postern and both inner gates (towers 3 wide, 5 deep; the tunnel between)
  const twin = ([cx, cy], R, lv) => {
    const side = sideOf(R, [cx, cy]), u = side === 'N' || side === 'S';
    const X0 = R.x0 * 2, Y0 = R.y0 * 2, X1 = R.x1 * 2 + 1, Y1 = R.y1 * 2 + 1;
    const [b0, b1] = { N: [Y0 - 2, Y0 + 2], S: [Y1 - 2, Y1 + 2], W: [X0 - 2, X0 + 2], E: [X1 - 2, X1 + 2] }[side];
    const g = (u ? cx : cy) * 2;
    const at = (a0, a1, fn) => (u ? fn(a0, b0, a1, b1) : fn(b0, a0, b1, a1));
    for (const [a0, a1] of [[g - 3, g - 1], [g + 2, g + 4]]) at(a0, a1, (x0, y0, x1, y1) => {
      mass(x0, y0, x1, y1, lv + 8, K.gate);
      box(x0, y0, x1 + 1, y1 + 1, 0, lv + 8, 'ashlar', { top: 'walk' });
      parts.push({ t: 'towerParapet', x0, y0, x1: x1 + 1, y1: y1 + 1, z: lv + 8, open: null, m: 'ashlar' });
    });
    at(g, g + 1, (x0, y0, x1, y1) => {
      tunnel(x0, y0, x1, y1, 0);
      parts.push(u ? { t: 'arch', axis: 'y', x0, x1: x1 + 1, y0, y1: y1 + 1, z0: 0, z1: lv + 8, spring: 10, apex: 15, m: 'ashlar', cover: true }
        : { t: 'arch', axis: 'x', x0: y0, x1: y1 + 1, y0: x0, y1: x1 + 1, z0: 0, z1: lv + 8, spring: 10, apex: 15, m: 'ashlar', cover: true });
    });
    // gate leaves across the tunnel's mouth on the camera's side (the south or east end), swinging into the tunnel
    doors.push(u ? { x: g + 1, y: b1 + 1, axis: 'x', w: 2, lv: 0, kind: 'gate', open: -1 } : { x: b1 + 1, y: g + 1, axis: 'y', w: 2, lv: 0, kind: 'gate', open: -1 });
  };
  twin(GATES.postern, OUT, OW);
  twin(GATES.inner, INN, IW);
  twin(GATES.innerNorth, INN, IW);

  // ------------------------------------------------------------- stairs up to the wall-walks
  // Two tiles wide against the ward side of the wall, three levels a step, rising along it; the top step is a hop below
  // the walk beside it.
  const stair = (x0, y0, dir, lv, tag) => {
    const n = Math.ceil((lv - 2) / 3), steps = [];
    for (let k = 0; k < n; k++) {
      const s = Math.min(lv - 2, 3 * (k + 1));
      const [ax, ay] = dir === '+x' ? [x0 + k, y0] : dir === '-x' ? [x0 - k, y0] : dir === '+y' ? [x0, y0 + k] : [x0, y0 - k];
      const [bx, by] = dir === '+x' || dir === '-x' ? [ax, ay + 1] : [ax + 1, ay];
      const [lx, ly, hx, hy] = [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
      deck(lx, ly, hx, hy, s, K.stair, false);
      box(lx, ly, hx + 1, hy + 1, 0, s, 'ashlar', { top: 'setts' });
      steps.push([ax, ay, s]);
    }
    stairs.push({ x0, y0, dir, lv, tag, steps });
  };
  stair(140, 197, '+x', OW, 'outer');    // south: rows 197-198, steps up to the walk at y 199
  stair(184, 71, '-x', OW, 'outer');     // north
  stair(99, 120, '+y', OW, 'outer');     // west
  stair(237, 154, '-y', OW, 'outer');    // east
  stair(164, 169, '+x', IW, 'inner');     // (east of the great hall)
  stair(191, 99, '-x', IW, 'inner');
  stair(127, 108, '+y', IW, 'inner');
  stair(209, 140, '+y', IW, 'inner');

  // ------------------------------------------------------------- buildings: the keep, the cathedral, the great hall
  // Walls two tiles thick outside and one inside, floors on the inside; roofs come off while the hero is inside.
  const building = (id, x0, y0, x1, y1, wallH, floorLv) => {
    rect(x0, y0, x1, y1, (x, y, i) => { bld[i] = id; });
    set(x0 + 2, y0 + 2, x1 - 2, y1 - 2, floorLv, K.floor, { flat: true });
    for (const [a, b, c, d] of [[x0, y0, x1, y0 + 1], [x0, y1 - 1, x1, y1], [x0, y0 + 2, x0 + 1, y1 - 2], [x1 - 1, y0 + 2, x1, y1 - 2]]) mass(a, b, c, d, wallH, K.keep);
  };
  const innerWall = (x0, y0, x1, y1, h, m) => { mass(x0, y0, x1, y1, h, K.keep); box(x0, y0, x1 + 1, y1 + 1, 0, h, m, { cap: true }); };
  // a doorway through a wall: walkable under an arched lintel, with its door leaves
  const door = (x0, y0, x1, y1, axis, floorLv, h, id, out) => {
    tunnel(x0, y0, x1, y1, floorLv, K.door);
    rect(x0, y0, x1, y1, (x, y, i) => { bld[i] = id; });
    const w = axis === 'x' ? x1 - x0 + 1 : y1 - y0 + 1;
    parts.push(axis === 'x' ? { t: 'arch', axis: 'y', x0, x1: x1 + 1, y0, y1: y1 + 1, z0: floorLv, z1: h, spring: floorLv + 10, apex: floorLv + 14, m: 'ashlar', cover: true }
      : { t: 'arch', axis: 'x', x0: y0, x1: y1 + 1, y0: x0, y1: x1 + 1, z0: floorLv, z1: h, spring: floorLv + 10, apex: floorLv + 14, m: 'ashlar', cover: true });
    doors.push(axis === 'x' ? { x: x0 + w / 2, y: out === 'S' ? y1 + 1 : y0, axis, w, lv: floorLv, kind: 'door', bld: id, open: out === 'S' ? -1 : 1 }
      : { x: out === 'E' ? x1 + 1 : x0, y: y0 + w / 2, axis, w, lv: floorLv, kind: 'door', bld: id, open: out === 'E' ? -1 : 1 });
  };
  // The keep: 50 x 33. The throne room fills the west wing; the entrance hall the south-east; the great tower at the
  // back holds the council chamber and the armoury, its walls rising to KT with a turret on each corner.
  const KX0 = 130, KY0 = 103, KX1 = 179, KY1 = 135, TX = 154;
  building(BLD.keep, KX0, KY0, KX1, KY1, KW, KF);
  rect(TX, KY0, KX1, KY0 + 1, (x, y, i) => { hgt[i] = KT; });
  rect(KX1 - 1, KY0 + 2, KX1, 119, (x, y, i) => { hgt[i] = KT; });
  box(KX0, KY0, TX, KY0 + 2, 0, KW, 'ashlar', { cap: true });
  box(KX0, KY0 + 2, KX0 + 2, KY1 + 1, 0, KW, 'ashlar', { cap: true });
  box(KX0 + 2, KY1 - 1, KX1 + 1, KY1 + 1, 0, KW, 'ashlar', { cap: true, cuts: [[141, 144], [165, 169]] });
  box(KX1 - 1, 120, KX1 + 1, KY1 - 1, 0, KW, 'ashlar', { cap: true });
  box(TX, KY0, KX1 + 1, KY0 + 2, 0, KT, 'ashlar', { cap: true });
  box(KX1 - 1, KY0 + 2, KX1 + 1, 120, 0, KT, 'ashlar', { cap: true });
  innerWall(TX, KY0 + 2, TX, KY1 - 2, KW - 4, 'ashlar');
  rect(TX, KY0 + 2, TX, 119, (x, y, i) => { hgt[i] = KT; });
  box(TX, KY0 + 2, TX + 1, 120, KW - 4, KT, 'ashlar', { cap: true });
  innerWall(TX + 1, 119, KX1 - 2, 119, KT, 'ashlar');
  innerWall(166, KY0 + 2, 166, 118, KT, 'ashlar');
  for (const [cx, cy] of [[TX + 0.5, KY0 + 0.5], [KX1 + 0.5, KY0 + 0.5], [KX1 + 0.5, 119.5], [TX + 0.5, 119.5]]) {
    cyl(cx, cy, 1.6, KT - 12, KT + 6, 'ashlar', { corbel: true });
    parts.push({ t: 'cone', x: cx, y: cy, r: 2, z: KT + 6, h: 12, m: 'slate', roof: BLD.keep });
  }
  const dress = { pilasters: 6, windows: { every: 6, w: 1.1, z0: 14, z1: 26 }, course: 6, course2: KW - 5 };
  face('x', KX0, TX, KY0, -1, 0, KW, dress);
  face('y', KY0, KY1 + 1, KX0, -1, 0, KW, dress);
  face('x', KX0, KX1 + 1, KY1 + 1, 1, 0, KW, { ...dress, skip: [[140, 145], [164, 170]] });
  face('y', 120, KY1 + 1, KX1 + 1, 1, 0, KW, dress);
  face('x', TX, KX1 + 1, KY0, -1, 0, KT, { ...dress, windows: { every: 5, w: 1.1, z0: 26, z1: 40 }, course2: KT - 5 });
  face('y', KY0, 120, KX1 + 1, 1, 0, KT, { ...dress, windows: { every: 5, w: 1.1, z0: 26, z1: 40 }, course2: KT - 5 });
  box(163.4, KY1 + 1, 164.4, KY1 + 2, 0, 22, 'ashlar');   // the porch: pilasters and a gabled hood over the doors
  box(169.6, KY1 + 1, 170.6, KY1 + 2, 0, 22, 'ashlar');
  box(163.2, KY1 + 0.6, 170.8, KY1 + 2.1, 20, 22, 'ashlar');
  parts.push({ t: 'roof', kind: 'gable', axis: 'y', x0: 163.1, y0: KY1 + 0.6, x1: 170.9, y1: KY1 + 2.2, z: 22, h: 9, m: 'slate' });
  door(165, KY1 - 1, 168, KY1, 'x', KF, KW - 4, BLD.keep, 'S');    // main doors
  door(141, KY1 - 1, 143, KY1, 'x', KF, KW - 4, BLD.keep, 'S');    // the throne room's own doors
  door(TX, 124, TX, 126, 'y', KF, KW - 6, BLD.keep, 'E');          // entrance hall -> throne room
  door(159, 119, 161, 119, 'x', KF, KT - 12, BLD.keep, 'S');       // -> council chamber
  door(170, 119, 172, 119, 'x', KF, KT - 12, BLD.keep, 'S');       // -> armoury
  for (const [a, b] of [[164, 169], [140, 144]]) { deck(a, KY1 + 1, b, KY1 + 1, 1, K.stair, false); box(a, KY1 + 1, b + 1, KY1 + 2, 0, 1, 'ashlar', { top: 'setts' }); }
  // the throne dais at the north end of the throne room, two steps up
  deck(137, KY0 + 2, 148, KY0 + 6, KF + 2, K.floor, false);
  deck(136, KY0 + 7, 149, KY0 + 7, KF + 1, K.floor, false);
  box(137, KY0 + 2, 149, KY0 + 7, 0, KF + 2, 'marble', { top: 'marble' });
  box(136, KY0 + 7, 150, KY0 + 8, 0, KF + 1, 'marble', { top: 'marble' });
  // battlements round the wings and the great tower; flat lead roofs inside them (lifted off while you are inside)
  parts.push({ t: 'towerParapet', x0: KX0, y0: KY0, x1: TX + 1, y1: KY1 + 1, z: KW, open: 'E', m: 'ashlar' });
  parts.push({ t: 'towerParapet', x0: TX, y0: 120, x1: KX1 + 1, y1: KY1 + 1, z: KW, open: 'N', m: 'ashlar' });
  parts.push({ t: 'towerParapet', x0: TX, y0: KY0, x1: KX1 + 1, y1: 120, z: KT, open: null, m: 'ashlar' });
  // behind the battlements, rows of pitched roofs about 8 tiles across (as real keeps hide theirs)
  const ridges = (x0, y0, x1, y1, z, axis, n, h) => {
    for (let k = 0; k < n; k++) {
      const r = axis === 'y' ? { x0: x0 + (x1 - x0) * k / n, x1: x0 + (x1 - x0) * (k + 1) / n, y0, y1 } : { y0: y0 + (y1 - y0) * k / n, y1: y0 + (y1 - y0) * (k + 1) / n, x0, x1 };
      parts.push({ t: 'roof', kind: 'gable', axis, ...r, z, h, m: 'slate', roof: BLD.keep });
    }
  };
  ridges(KX0 + 0.6, KY0 + 0.6, TX + 0.4, KY1 + 0.4, KW - 1, 'y', 3, 24);
  ridges(TX + 0.4, 120.4, KX1 + 0.4, KY1 + 0.4, KW - 1, 'x', 2, 22);
  parts.push({ t: 'roof', kind: 'hip', x0: TX + 0.6, y0: KY0 + 0.6, x1: KX1 + 0.4, y1: 119.4, z: KT - 1, h: 30, m: 'slate', roof: BLD.keep });
  rooms.push({ id: 'throne_hall', name: 'Throne Room', tiles: [KX0 + 2, KY0 + 2, TX - 1, KY1 - 2], bld: BLD.keep, floor: KF });
  rooms.push({ id: 'keep_hall', name: 'Entrance Hall', tiles: [TX + 1, 120, KX1 - 2, KY1 - 2], bld: BLD.keep, floor: KF });
  rooms.push({ id: 'council', name: 'Council Chamber', tiles: [TX + 1, KY0 + 2, 165, 118], bld: BLD.keep, floor: KF });
  rooms.push({ id: 'armoury', name: 'Armoury', tiles: [167, KY0 + 2, KX1 - 2, 118], bld: BLD.keep, floor: KF });
  // the cathedral (with a belfry over its south front) and the great hall
  const hall = (id, name, x0, y0, x1, y1, wallH, roofs, list, m) => {
    building(id, x0, y0, x1, y1, wallH, 0);
    box(x0, y0, x1 + 1, y0 + 2, 0, wallH, m, { cap: true });
    box(x0, y1 - 1, x1 + 1, y1 + 1, 0, wallH, m, { cap: true });
    box(x0, y0 + 2, x0 + 2, y1 - 1, 0, wallH, m, { cap: true });
    box(x1 - 1, y0 + 2, x1 + 1, y1 - 1, 0, wallH, m, { cap: true });
    const skip = list.map(([a, b, c, d, axis]) => axis === 'x' ? [a - 1, c + 2] : [b - 1, d + 2]);
    const dr = { pilasters: 5, windows: { every: 5, w: 1, z0: 9, z1: wallH - 6 }, course: 5, course2: wallH - 4, skip };
    face('x', x0, x1 + 1, y0, -1, 0, wallH, dr); face('x', x0, x1 + 1, y1 + 1, 1, 0, wallH, dr);
    face('y', y0, y1 + 1, x0, -1, 0, wallH, dr); face('y', y0, y1 + 1, x1 + 1, 1, 0, wallH, dr);
    for (const [a, b, c, d, axis, out] of list) door(a, b, c, d, axis, 0, wallH - 4, id, out);
    for (const r of roofs) parts.push({ t: 'roof', m: 'slate', roof: id, ...r });
    rooms.push({ id, name, tiles: [x0 + 2, y0 + 2, x1 - 2, y1 - 2], bld: id, floor: 0 });
  };
  // the cathedral: a raised nave (clerestory walls over the aisles) under a steep roof, lean-to aisle roofs, a belfry
  hall(BLD.cathedral, 'Cathedral', 182, 102, 209, 133, 30, [
    { kind: 'lean', side: 'W', x0: 181.7, y0: 101.7, x1: 190, y1: 134.3, z: 30, h: 12 },
    { kind: 'lean', side: 'E', x0: 202, y0: 101.7, x1: 210.3, y1: 134.3, z: 30, h: 12 },
    { kind: 'gable', axis: 'y', x0: 189.7, y0: 101.7, x1: 202.3, y1: 128, z: 44, h: 34 }],
  [[182, 116, 183, 119, 'y', 'W'], [194, 132, 197, 133, 'x', 'S']], 'chapel');
  box(190, 102, 191, 128, 30, 44, 'chapel', { roof: BLD.cathedral }); box(201, 102, 202, 128, 30, 44, 'chapel', { roof: BLD.cathedral });
  box(192, 127, 200, 134, 30, 58, 'chapel', { roof: BLD.cathedral });
  parts.push({ t: 'cone', x: 196, y: 130.5, r: 4.6, z: 58, h: 40, m: 'slate', roof: BLD.cathedral, seg: 4 });
  // the great hall: two parallel roofs
  hall(BLD.great_hall, 'Great Hall', 128, 140, 155, 169, 24, [
    { kind: 'gable', axis: 'y', x0: 127.7, y0: 139.7, x1: 141.9, y1: 170.3, z: 24, h: 30 },
    { kind: 'gable', axis: 'y', x0: 141.9, y0: 139.7, x1: 156.3, y1: 170.3, z: 24, h: 30 }],
  [[154, 152, 155, 155, 'y', 'E'], [140, 140, 143, 141, 'x', 'N']], 'ashlar');

  // ------------------------------------------------------------- wall-walk muster posts (rampart scenarios)
  for (let x = 104; x <= 236; x += 12) if (walk[I(x, 199)] && !solid[I(x, 199)]) posts.push([x + 0.5, 199.5]);
  for (let y = 80; y <= 190; y += 12) if (walk[I(239, y)] && !solid[I(239, y)]) posts.push([239.5, y + 0.5]);

  return (cache = { hgt, kind, solid, walk, cover, bld, struct, parts, doors, stairs, posts, rooms, drawbridge, outer, inner,
    keep: [KX0, KY0, KX1, KY1] });
}
