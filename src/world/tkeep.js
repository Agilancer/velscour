// TESSARIEL'S KEEP (docs/TESSARIELS_KEEP.md): the great hall of the Sacred Flame, as one description shared by the
// game and the bake (tools/tkeep3d.html), like the Castle's (world/castle3d.js) and the Sky Battle's ship.
//  - the game reads the per-tile heights and flags (a height map: the floor, the dais, two grand stairs, a balcony on
//    all four sides) and the anchors (where every decoration slot, trophy, light, NPC and portal stands);
//  - the bake builds the same parts in three.js and cuts the render into per-tile pieces (assets/tiles/tkeep/).
// Pure data (no canvas or DOM), so it runs under Node. Heights are terrain levels (4 world px); x, y are tiles.
// The camera looks from +x+y: the north (y small) and west (x small) walls are the back walls, seen face on; the south
// and east sides are the front, cut down to the balcony and its parapet, so the hall is seen over them.

export const TK = Object.freeze({
  W: 42, H: 42,
  OW: 4,             // the back walls' first tile (2 thick: 4, 5)
  BW: 6,             // the back balconies' walk (6, 7) and rail (8)
  F0: 9, F1: 32,     // the hall's floor, 24 x 24
  FR: 33,            // the front rails (33), walks (34, 35) and parapets (36)
  BAL: 24,           // the back balconies' walking level (96 px up: a hero and a half)
  RAIL: 27,          // a rail tile's top (blocked: its balustrade)
  BALF: 12,          // the front (south and east) terraces: half as high, so the hall's floor is seen over them
  FS: 11,            // the south terrace's first tile: three steps (8, 9, 10) come down to it from the west balcony's end
  FSE: 14,           // the east terrace's: the north balcony's end is a landing as deep as the east grand stair, which
                     // runs straight onto it; so its three steps are 11, 12, 13
  WALL: 84,          // the back walls
  PARA: 29,          // the front parapets
  DAIS: 3,           // the Castellan's dais, one step up
  STEP: 3,           // levels a stair tile rises
});
const { W, H, OW, BW, F0, F1, FR, BAL, RAIL, BALF, FS, FSE, WALL, PARA, DAIS, STEP } = TK;
const E = FSE - FS;   // how much further south the east side's corner stairs stand
const RAILF = BALF + 3, PARAF = BALF + 5, UNDER = -12;   // the front rail and parapet; how far down the keep's own wall is shown
export const KK = Object.freeze({ none: 0, floor: 1, wall: 2, walk: 3, rail: 4, parapet: 5, stair: 6, dais: 7, column: 8, pedestal: 9, plinth: 10, basin: 11, gap: 12, tower: 13, furniture: 14 });
/** Tile centre (x, y) of the hall's middle. */
export const CX = (F0 + F1 + 1) / 2, CY = (F0 + F1 + 1) / 2;   // 21, 21

let cache = null;
/**
 * The keep: per tile `hgt` (level), `kind`, `solid` (blocked), `struct` (drawn from the bake as masonry that may hide
 * someone), `t` (part of the map); `parts` (the bake's geometry); `anchors` (slots and places for the game).
 */
export function tkeepLayout() {
  if (cache) return cache;
  const N = W * H, I = (x, y) => y * W + x;
  const hgt = new Int16Array(N), kind = new Uint8Array(N), solid = new Uint8Array(N), struct = new Uint8Array(N), t = new Uint8Array(N);
  const parts = [];
  const rect = (x0, y0, x1, y1, fn) => { for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) fn(x, y, I(x, y)); };
  const set = (x0, y0, x1, y1, lv, k, o = {}) => rect(x0, y0, x1, y1, (x, y, i) => { hgt[i] = lv; kind[i] = k; solid[i] = o.solid ? 1 : 0; struct[i] = o.solid ? 1 : 0; t[i] = 1; });
  // geometry for the bake: boxes span tile edges x0..x1, y0..y1 (x1, y1 exclusive edges); z in levels; m: material
  const box = (x0, y0, x1, y1, z0, z1, m, o = {}) => parts.push({ t: 'box', x0, y0, x1, y1, z0, z1, m, ...o });
  const cyl = (x, y, r, z0, z1, m, o = {}) => parts.push({ t: 'cyl', x, y, r, z0, z1, m, ...o });

  // ---------------------------------------------------------------- the ground floor
  set(F0, F0, F1, F1, 0, KK.floor);
  box(F0, F0, F1 + 1, F1 + 1, -2, 0, 'flags');
  // a border of pale limestone round the flagstones, and a cross of it under the runner and the flame
  box(F0, F0, F1 + 1, F0 + 0.5, -2, 0.02, 'lime'); box(F0, F1 + 0.5, F1 + 1, F1 + 1, -2, 0.02, 'lime');
  box(F0, F0, F0 + 0.5, F1 + 1, -2, 0.02, 'lime'); box(F1 + 0.5, F0, F1 + 1, F1 + 1, -2, 0.02, 'lime');

  // bands of limestone let into the flagstones: down the two colonnades, and across the aisles at every column
  for (const cx of [F0 + 4.5, F1 - 3.5]) box(cx - 0.16, F0 + 0.5, cx + 0.16, F1 + 0.5, -2, 0.03, 'lime');
  for (const cy of [F0 + 7.5, F0 + 11.5, F0 + 15.5, F0 + 19.5]) { box(F0 + 0.5, cy - 0.16, F0 + 4.5, cy + 0.16, -2, 0.03, 'lime'); box(F1 - 3.5, cy - 0.16, F1 + 0.5, cy + 0.16, -2, 0.03, 'lime'); }
  // ---------------------------------------------------------------- the back walls (north: y 4-5, west: x 4-5)
  set(OW, OW, F1 + 4, OW + 1, WALL, KK.wall, { solid: true });
  set(OW, OW, OW + 1, F1 + 4, WALL, KK.wall, { solid: true });
  box(OW, OW, F1 + 4, OW + 2, -2, WALL, 'stone');
  box(OW, OW + 2, OW + 2, F1 + 4, -2, WALL, 'stone');
  // the wall-head: a corbelled cornice and a crenellated parapet against the dark
  box(OW, OW + 2, F1 + 4, OW + 2.35, WALL - 6, WALL - 3.5, 'lime'); box(OW + 2, OW, OW + 2.35, F1 + 4, WALL - 6, WALL - 3.5, 'lime');
  parts.push({ t: 'merlons', axis: 'x', a0: OW, a1: F1 + 4, c0: OW, c1: OW + 1, z: WALL, m: 'stone' });
  parts.push({ t: 'merlons', axis: 'y', a0: OW + 1, a1: F1 + 4, c0: OW, c1: OW + 1, z: WALL, m: 'stone' });
  // corner towers: the great tower behind the far corner, drums at the ends of the back walls (tiles under a drum's
  // round are blocked; none reaches the balcony's walk but one corner tile of the east walk)
  const drum = (cx, cy, r, lv) => rect(Math.floor(cx - r), Math.floor(cy - r), Math.floor(cx + r), Math.floor(cy + r), (x, y, i) => {
    if (Math.hypot(Math.max(Math.abs(x + 0.5 - cx) - 0.5, 0), Math.max(Math.abs(y + 0.5 - cy) - 0.5, 0)) > r + 0.2) return;   // every tile its round touches (bands and merlons stand proud of it), or a strip of it has no piece to draw
    hgt[i] = lv; kind[i] = KK.tower; solid[i] = 1; struct[i] = 1; t[i] = 1;
  });
  drum(OW - 0.8, OW - 0.8, 2.5, WALL + 24);
  cyl(OW - 0.8, OW - 0.8, 2.5, -2, WALL + 24, 'stone', { top: 'lime' });
  parts.push({ t: 'ringMerlons', x: OW - 0.8, y: OW - 0.8, r: 2.5, z: WALL + 24, m: 'stone' });
  parts.push({ t: 'band', x: OW - 0.8, y: OW - 0.8, r: 2.56, z0: WALL - 6, z1: WALL - 4, m: 'lime' });
  for (const [cx, cy] of [[F1 + 5.5, OW + 0.5], [OW + 0.5, F1 + 5.5]]) {
    drum(cx, cy, 2.2, WALL + 10);
    cyl(cx, cy, 2.2, -2, WALL + 10, 'stone', { top: 'lime' });
    parts.push({ t: 'ringMerlons', x: cx, y: cy, r: 2.3, z: WALL + 10, m: 'stone' });
    parts.push({ t: 'band', x: cx, y: cy, r: 2.36, z0: BAL - 1, z1: BAL + 1, m: 'lime' });
    parts.push({ t: 'band', x: cx, y: cy, r: 2.36, z0: WALL - 6, z1: WALL - 4, m: 'lime' });
  }

  // ---------------------------------------------------------------- the balcony (a walk on all four sides)
  // back walks (6, 7) on a solid mass over the hall's floor; its face is an arcade of blind arches
  set(BW, BW, F1 + 3, BW + 1, BAL, KK.walk);
  set(BW, BW, BW + 1, F1 + 3, BAL, KK.walk);
  set(FR + 1, FSE, FR + 2, F1 + 3, BALF, KK.walk);
  set(FS, FR + 1, F1 + 3, FR + 2, BALF, KK.walk);
  // the corner stairs: three steps down from the ends of the back balconies to the front terraces
  const cornerSteps = [];
  for (let k = 0; k < 3; k++) {
    const a = BW + 2 + k, lv = BAL - STEP * (k + 1);
    set(FR + 1, a + E, FR + 2, a + E, lv, KK.stair); set(a, FR + 1, a, FR + 2, lv, KK.stair);
    cornerSteps.push([a, lv]);
  }
  // the east landing: the north balcony's end carried south past the stair, where the east grand stair arrives straight on
  set(FR + 1, BW + 2, FR + 2, F0 + 1, BAL, KK.walk);
  box(FR, BW + 2, FR + 3, F0 + 2, -2, BAL, 'plinth', { top: 'walk' });
  box(BW, BW, F1 + 4, BW + 2, -2, BAL, 'plinth', { top: 'walk' });
  box(BW, BW + 2, BW + 2, F1 + 4, -2, BAL, 'plinth', { top: 'walk' });
  box(FR + 1, FSE, FR + 3, F1 + 4, -2, BALF, 'plinth', { top: 'walk' });
  box(FS, FR + 1, FR + 1, FR + 3, -2, BALF, 'plinth', { top: 'walk' });
  for (const [a, lv] of cornerSteps) { box(FR + 1, a + E, FR + 3, a + E + 1, -2, lv, 'lime', { top: 'tread' }); box(a, FR + 1, a + 1, FR + 3, -2, lv, 'lime', { top: 'tread' }); box(FR + 1, a + E + 0.9, FR + 3, a + E + 1, lv - 0.5, lv + 0.04, 'plinth'); box(a + 0.9, FR + 1, a + 1, FR + 3, lv - 0.5, lv + 0.04, 'plinth'); }
  // rails: a tile wide, blocked; their mass up to the walk, a moulded balustrade on top
  set(BW + 2, BW + 2, FR, BW + 2, RAIL, KK.rail, { solid: true });
  set(BW + 2, BW + 2, BW + 2, FR, RAIL, KK.rail, { solid: true });
  set(FR, FSE, FR, FR, RAILF, KK.rail, { solid: true });
  set(FS, FR, FR, FR, RAILF, KK.rail, { solid: true });
  for (const [a, lv] of cornerSteps.slice(1)) set(a, FR, a, FR, lv + 3, KK.rail, { solid: true });
  for (const [a, lv] of cornerSteps) set(FR, a + E, FR, a + E, lv + 3, KK.rail, { solid: true });   // (the east side's stand clear of the north rail: all three)
  // the stair heads: each grand stair runs straight on into a balcony, through an opening as wide as the flight. The
  // west one into the west balcony (the rail open at its first two tiles), the east one onto the east landing.
  const heads = [[BW + 2, F0], [FR, F0]];
  for (const [gx, gy] of heads) set(gx, gy, gx, gy + 1, BAL, KK.gap);
  box(BW + 2, BW + 2, FR + 1, BW + 3, -2, BAL, 'plinth', { top: 'walk' });
  box(BW + 2, BW + 3, BW + 3, FR + 1, -2, BAL, 'plinth', { top: 'walk' });
  box(FR, FSE, FR + 1, FR + 1, -2, BALF, 'plinth', { top: 'walk' });
  box(FS, FR, FR, FR + 1, -2, BALF, 'plinth', { top: 'walk' });
  for (const [a, lv] of cornerSteps.slice(1)) {   // the string walls down the corner stairs, stepped and gilt-capped
    box(a, FR + 0.2, a + 1, FR + 0.8, -2, lv + 3, 'lime'); box(a - 0.02, FR + 0.15, a + 1.02, FR + 0.85, lv + 3, lv + 3.5, 'gold');
  }
  for (const [a, lv] of cornerSteps) { box(FR + 0.2, a + E, FR + 0.8, a + E + 1, -2, lv + 3, 'lime'); box(FR + 0.15, a + E - 0.02, FR + 0.85, a + E + 1.02, lv + 3, lv + 3.5, 'gold'); }
  const rails = [
    { axis: 'x', a0: BW + 2, a1: FR + 1, c: BW + 2.5 },
    { axis: 'y', a0: F0 + 2, a1: FR + 1, c: BW + 2.5 },   // from the west stair's head on
    { axis: 'y', a0: FSE, a1: FR, c: FR + 0.5, z: BALF },
    { axis: 'x', a0: FS, a1: FR, c: FR + 0.5, z: BALF },
  ];
  for (const r of rails) parts.push({ t: 'balustrade', z: BAL, ...r, h: 3.6, m: 'lime' });
  // the hall faces of the back balconies: string course at the walk, a blind arcade below, pilasters between
  parts.push({ t: 'arcade', axis: 'x', a0: F0, a1: F1 + 1, c: BW + 3, dir: +1, z0: 0, z1: BAL, bay: 4, m: 'stone', trim: 'lime' });
  parts.push({ t: 'arcade', axis: 'y', a0: F0, a1: F1 + 1, c: BW + 3, dir: +1, z0: 0, z1: BAL, bay: 4, m: 'stone', trim: 'lime' });
  // the front: parapets on the outer edge (blocked), the outer faces dressed as the keep's own wall seen in section
  // stepped: full height round the back balconies' ends, down with the corner stairs, low along the terraces
  const paraAt = (a) => (a < BW + 2 ? PARA : a < FS ? BAL - STEP * (a - BW - 1) + 5 : PARAF);
  for (let a = BW; a <= FR + 3; a++) {
    const lv = a === FR + 3 ? PARAF : paraAt(a), lvE = a === FR + 3 ? PARAF : paraAt(Math.max(BW, a - E));   // the east side's steps down three tiles later
    set(a, FR + 3, a, FR + 3, lv, KK.parapet, { solid: true }); set(FR + 3, a, FR + 3, a, lvE, KK.parapet, { solid: true });
    if (a < FS) { box(a, FR + 3, a + 1, FR + 4, UNDER, lv, 'stone'); box(a - 0.03, FR + 2.95, a + 1.03, FR + 4.05, lv, lv + 0.6, 'lime'); }
    if (a < FSE) { box(FR + 3, a, FR + 4, a + 1, UNDER, lvE, 'stone'); box(FR + 2.95, a - 0.03, FR + 4.05, a + 1.03, lvE, lvE + 0.6, 'lime'); }
  }
  box(FS, FR + 3, FR + 4, FR + 4, UNDER, PARAF, 'stone');
  box(FR + 3, FSE, FR + 4, FR + 3, UNDER, PARAF, 'stone');
  parts.push({ t: 'merlons', axis: 'x', a0: FS, a1: FR + 4, c0: FR + 3, c1: FR + 4, z: PARAF, m: 'stone', low: true });
  parts.push({ t: 'merlons', axis: 'y', a0: FSE, a1: FR + 3, c0: FR + 3, c1: FR + 4, z: PARAF, m: 'stone', low: true });
  // their outer faces: the keep's own wall seen in section, a deep blind arcade under a string course, down into the dark
  // (plain masonry under a string course: an arcade here stood half in the dark and read as missing art)
  parts.push({ t: 'face', axis: 'x', a0: FS, a1: FR + 4, c: FR + 4, dir: +1, z0: UNDER, z1: PARAF, course: PARAF - 3 });
  parts.push({ t: 'face', axis: 'y', a0: FSE, a1: FR + 4, c: FR + 4, dir: +1, z0: UNDER, z1: PARAF, course: PARAF - 3 });

  // ---------------------------------------------------------------- the dais and the grand stairs (north side)
  const DX0 = F0 + 8, DX1 = F1 - 8, DY1 = F0 + 2;   // dais 17..24 x 9..11
  set(DX0, F0, DX1, DY1, DAIS, KK.dais);
  // the altar of the Flame at the back of the dais: a stone table, the Sword of Light standing on it point down
  set(CX - 1, F0, CX, F0, DAIS + 6, KK.furniture, { solid: true });
  parts.push({ t: 'altar', x: CX, y: F0 + 0.5, z: DAIS });
  box(DX0, F0, DX1 + 1, DY1 + 1, -2, DAIS, 'marble');
  box(DX0 - 0.15, DY1 + 0.85, DX1 + 1.15, DY1 + 1.12, DAIS - 0.4, DAIS + 0.15, 'gold');   // its gilt nosing
  const stairs = [];
  for (const side of [-1, 1]) {
    const steps = [];
    for (let k = 0; k < (BAL / STEP); k++) {
      const x = side < 0 ? DX0 - 1 - k : DX1 + 1 + k, lv = STEP * (k + 1);
      set(x, F0, x, F0 + 1, lv, KK.stair);
      box(x, F0, x + 1, F0 + 2, -2, lv, 'lime', { top: 'tread' });
      box(side < 0 ? x + 0.9 : x, F0, side < 0 ? x + 1 : x + 0.1, F0 + 2, lv - 0.5, lv + 0.04, 'plinth');   // a dark nosing: each step reads as a step
      steps.push([x, F0, lv]);
    }
    // the open side: a stone string wall with a balustrade that climbs with the flight
    const xs = steps.map((s) => s[0]), a0 = Math.min(...xs), a1 = Math.max(...xs) + 1;
    parts.push({ t: 'stairRail', axis: 'x', a0, a1, c: F0 + 2, side, lv0: STEP, lv1: BAL, m: 'lime' });
    stairs.push({ dir: side < 0 ? '-x' : '+x', steps, head: side < 0 ? heads[0] : heads[1] });
  }

  // ---------------------------------------------------------------- the hall: the Sacred Flame, columns, plinths
  // the flame's basin in the middle (2 x 2 tiles), on a round of three steps
  set(CX - 1, CY - 1, CX, CY, 6, KK.basin, { solid: true });
  parts.push({ t: 'medallion', x: CX, y: CY });   // rings of limestone and gilt inlaid in the flagstones round the Flame
  parts.push({ t: 'basin', x: CX, y: CY, r: 1.05, z: 6, m: 'marble', trim: 'gold' });
  // two colonnades of six columns down the hall
  const columns = [];
  for (const cx of [F0 + 4, F1 - 4]) for (const cy of [F0 + 7, F0 + 11, F0 + 15]) {   // clear of the grand stairs' sight lines (x - y), and of the line from the camera to the Flame
    set(cx, cy, cx, cy, 64, KK.column, { solid: true });
    parts.push({ t: 'column', x: cx + 0.5, y: cy + 0.5, r: 0.36, z0: 0, z1: 64, m: 'lime', trim: 'gold' });
    columns.push([cx + 0.5, cy + 0.5]);
  }
  // the four Elder plinths round the flame (2 x 2): their dragons are trophies (src/data/keep.js)
  const plinths = [];
  // a fan of four behind and beside the Flame as the camera sees it: none on the line through it (the dragon that stood
  // straight behind merged with the fire), none in front of it
  for (const [sx, sy, dx, dy] of [[-1, -1, -7, -3], [1, -1, -3, -7], [-1, 1, -6, 4], [1, 1, 4, -6]]) {
    const x0 = CX + dx, y0 = CY + dy;
    set(x0, y0, x0 + 1, y0 + 1, 7, KK.plinth, { solid: true });
    parts.push({ t: 'plinth', x0, y0, x1: x0 + 2, y1: y0 + 2, z: 7, m: 'stone', trim: 'gold', top: 'marble' });
    plinths.push({ x: x0 + 1, y: y0 + 1, z: 7, corner: sx < 0 ? (sy < 0 ? 'nw' : 'sw') : (sy < 0 ? 'ne' : 'se') });
  }
  // trophy pedestals: on the floor along the west and east sides, on the back balconies against the wall
  const pedestals = [];
  const ped = (x, y, lv, face) => { set(x, y, x, y, lv + 5, KK.pedestal, { solid: true }); parts.push({ t: 'pedestal', x: x + 0.5, y: y + 0.5, z0: lv, z1: lv + 5, m: 'marble', trim: 'gold' }); pedestals.push({ x: x + 0.5, y: y + 0.5, z: lv + 5, face }); };
  for (const y of [F0 + 4, F0 + 8, F1 - 7, F1 - 3]) ped(F0, y, 0, 'e');
  for (const y of [F0 + 4, F0 + 8, F1 - 7, F1 - 3]) ped(F1, y, 0, 'w');
  for (const x of [F0 + 3, F0 + 7, F1 - 6, F1 - 2]) ped(x, BW, BAL, 's');
  for (const y of [F0 + 3, F0 + 7, F1 - 6, F1 - 2]) ped(BW, y, BAL, 'e');

  // ---------------------------------------------------------------- the back walls' upper faces: windows, string courses
  // five tall lancets a wall over the balcony; the middle one of the north wall is the great window over the dais
  const windows = [];
  const winAt = (axis, a, wide) => {
    const w = wide ? 3.2 : 1.7, z0 = BAL + 12, z1 = wide ? WALL - 12 : WALL - 18;
    parts.push({ t: 'window', axis, a, c: OW + 2, dir: +1, w, z0, z1, m: 'lime' });
    windows.push({ axis, a, c: OW + 2, w, z0, z1, wide: !!wide });
  };
  for (const a of [F0 + 1.5, F0 + 6.5, CX, F1 - 5.5, F1 - 0.5]) winAt('x', a, a === CX);
  for (const a of [F0 + 1.5, F0 + 6.5, CX, F1 - 5.5, F1 - 0.5]) winAt('y', a, false);
  parts.push({ t: 'face', axis: 'x', a0: OW + 2, a1: F1 + 3, c: OW + 2, dir: +1, z0: BAL, z1: WALL, course: BAL + 8, course2: WALL - 8, pilasters: 5, pilasterOff: F0 + 4 });
  parts.push({ t: 'face', axis: 'y', a0: OW + 2, a1: F1 + 3, c: OW + 2, dir: +1, z0: BAL, z1: WALL, course: BAL + 8, course2: WALL - 8, pilasters: 5, pilasterOff: F0 + 4 });

  // ---------------------------------------------------------------- anchors for the game
  const banner = (axis, a, c, lv0, lv1, w, size) => ({ axis, a, c, z0: lv0, z1: lv1, w, size });
  const anchors = {
    start: [CX, F1 - 3.6],                 // where the town portal sets the hero down (clear of the front balcony's shadow)
    townPortal: [CX, F1 - 2.4],
    waygate: [F0 + 5.5, F1 - 0.4],         // the dungeon portal, west of the way in
    castellan: [CX, F0 + 1.2, DAIS],
    vault: [DX1 + 0.2, F0 + 0.7, DAIS],    // the Vault of the Flame (treasury chest) on the dais
    chronicle: [CX, BW + 0.9, BAL],        // the Chronicle of Deeds on the north balcony, under the great window
    warTable: [F1 - 5, F1 - 5.5],
    // the chests, one in each of the west arcade's three arches by the Waygate (storage nearest the way in): in full view
    // there, clear of the columns in front and of the banners' click boxes (on the front edge the terrace hid them)
    stash: [F0 + 1.2, F1 - 5], jewelBox: [F0 + 1.2, F1 - 9], reliquary: [F0 + 1.2, F1 - 13],
    dummies: [[F1 - 2.2, F1 - 1.6], [F1 - 4.2, F1 - 0.9], [F1 - 1.4, F1 - 3.8]],
    flame: [CX, CY, 6],
    columns, plinths, pedestals, windows, stairs,
    // banners: on the back balconies' faces (hanging from the rail) and the upper walls between the windows
    banners: [
      banner('y', F0 + 2, BW + 3, BAL - 2, 7, 1.3, 'm'), banner('y', F0 + 6, BW + 3, BAL - 2, 7, 1.3, 'm'), banner('y', CY - 2, BW + 3, BAL - 2, 7, 1.3, 'm'),
      banner('y', CY + 2, BW + 3, BAL - 2, 7, 1.3, 'm'), banner('y', F1 - 5, BW + 3, BAL - 2, 7, 1.3, 'm'), banner('y', F1 - 1, BW + 3, BAL - 2, 7, 1.3, 'm'),
      banner('x', DX0 + 1.5, BW + 3, BAL - 2, 6, 1.6, 'l'), banner('x', DX1 - 0.5, BW + 3, BAL - 2, 6, 1.6, 'l'),
      banner('x', F0 + 4, OW + 2, WALL - 14, BAL + 14, 1.9, 'xl'), banner('x', F1 - 3, OW + 2, WALL - 14, BAL + 14, 1.9, 'xl'),
      banner('y', F0 + 4, OW + 2, WALL - 14, BAL + 14, 1.9, 'xl'), banner('y', CY - 2.5, OW + 2, WALL - 14, BAL + 14, 1.9, 'xl'),
      banner('y', CY + 2.5, OW + 2, WALL - 14, BAL + 14, 1.9, 'xl'), banner('y', F1 - 3, OW + 2, WALL - 14, BAL + 14, 1.9, 'xl'),
    ],
    // runners: carpets laid on the floor (tile rects) and the dais
    rugs: [
      { id: 'north', x0: CX - 1, y0: DY1 + 1, x1: CX + 1, y1: CY - 2, z: 0 },
      { id: 'south', x0: CX - 1, y0: CY + 2, x1: CX + 1, y1: F1 + 0.6, z: 0 },
      { id: 'dais', x0: DX0 + 0.3, y0: F0 + 0.2, x1: DX1 + 0.7, y1: DY1 + 0.8, z: DAIS },
    ],
    // chandeliers over the hall (level of their candles), braziers by the stairs
    chandeliers: [[CX - 5, CY + 1, 58], [CX + 1, CY - 5, 58], [CX + 6, CY, 58], [CX, CY + 6, 58]],   // off the diagonal through the Flame, so none hangs in front of it
    braziers: [[CX - 2.4, F0 + 0.7], [CX + 2.4, F0 + 0.7], [CX - 2.6, F1 + 0.2], [CX + 2.6, F1 + 0.2]],   // two flank the altar on the dais (clear of the Elders' plinths), two the way in
  };
  // what isn't part of the keep stays out of the map
  cache = { W, H, hgt, kind, solid, struct, t, parts, anchors, stairs };
  return cache;
}

/** Where a hero can stand at random on the hall's floor or the balcony (for companions' walks). */
export function keepSpots(L = tkeepLayout()) {
  const out = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const i = y * L.W + x;
    if (!L.t[i] || L.solid[i]) continue;
    const k = L.kind[i];
    if (k === KK.floor || k === KK.walk || k === KK.dais) out.push([x + 0.5, y + 0.5, L.hgt[i]]);
  }
  return out;
}
