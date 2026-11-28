// CASTLE VELSCOUR (docs/PHOBOS.md): the hundred floors' maps. Built with the dungeon's own tools (world/dungeon.js:
// finishMap walls the floor in the wing's Phobos-textured pack, placeObstacles dresses it, wallMounts hangs torches),
// but every floor is one of the castle's authored kinds of place and sprawls well past a dungeon's size: gatehouses and
// drill yards, pits and crypts, forges, great halls and fighting pits, the library's stacks, sewers and aqueducts,
// cathedral naves, and in the spires towers joined by bridges over the void, stairs wound round their outsides and
// gaps you leap or swing across (a Sheer Drop: data/sheer.js, game/sheer.js). A floor is the same for a seed.
//
// gen extras: leaps [{x, y, tx, ty, kind: 'leap'|'swing'}] (pads game/phobos.js flings the hero across on),
// route [[x, y]...] (the way through, for auto-play over the gaps), raid (the sealed arena on raid floors).
import { TileMap } from './map.js';
import { RNG, clamp } from '../core/util.js';
import { ARCH } from '../data/enemies.js';
import { finishMap, placeObstacles, wallMounts, themeDeck, shuffleWith } from './dungeon.js';
import { wallHangingCount } from '../gfx/wallhangings.js';
import { phobosProp } from '../gfx/phobostex.js';
import { TW } from '../core/view.js';
import { generateSpires } from './castlespires.js';

// layout name -> [family, options]
export const LAYOUTS = {
  gatehouse: ['halls', { rooms: [9, 13], size: [9, 16], pillars: 0.4, step: 24, name: 'Gatehouse' }],
  yard: ['halls', { rooms: [6, 8], size: [18, 26], pillars: 0.1, step: 34, name: 'Drill Yard' }],
  barracks: ['halls', { rooms: [12, 16], size: [8, 12], pillars: 0.2, step: 20, cells: true, name: 'Barracks' }],
  cells: ['halls', { rooms: [10, 14], size: [8, 12], pillars: 0, step: 20, cells: true, name: 'Cell Blocks' }],
  kitchens: ['halls', { rooms: [11, 15], size: [9, 14], pillars: 0.5, step: 22, name: 'Kitchens' }],
  antechamber: ['halls', { rooms: [8, 11], size: [14, 20], pillars: 0.9, step: 30, name: 'Throne Antechambers' }],
  stairwell: ['halls', { rooms: [14, 18], size: [7, 10], pillars: 0, step: 16, loops: 6, name: 'Stairwells' }],
  forge: ['naves', { naves: 3, w: [14, 18], l: [34, 44], pillars: 'pairs', name: 'Forge Halls' }],
  greathall: ['naves', { naves: 2, w: [18, 22], l: [46, 56], pillars: 'rows', table: true, name: 'Great Hall' }],
  cathedral: ['naves', { naves: 2, w: [20, 24], l: [48, 60], pillars: 'rows', aisles: true, apse: true, name: 'Cathedral' }],
  nave: ['naves', { naves: 3, w: [16, 20], l: [40, 50], pillars: 'rows', aisles: true, apse: true, name: 'Black Nave' }],
  arena: ['arenas', { n: [5, 7], r: [9, 13], name: 'Fighting Pits' }],
  colosseum: ['arenas', { n: [3, 4], r: [15, 19], ring: true, name: 'Colosseum' }],
  crypt: ['halls', { rooms: [14, 18], size: [7, 11], pillars: 0.6, step: 18, loops: 5, name: "Generals' Crypt" }],
  pits: ['pits', { n: [6, 8], name: 'The Oubliette Pits' }],
  library: ['stacks', { halls: 4, name: 'Ancient Library' }],
  stacks: ['stacks', { halls: 6, long: true, name: 'The Long Stacks' }],
  sewers: ['sewers', { name: 'Sewers' }],
  aqueduct: ['sewers', { aqueduct: true, name: 'The Aqueduct' }],
  cages: ['arenas', { n: [7, 9], r: [7, 10], cages: true, name: 'Cage Rows' }],
  bridges: ['bridges', { n: [12, 16], name: 'Tower Bridges' }],
  outerstair: ['outerstair', { name: 'The Outer Stair' }],
  leaps: ['leaps', { name: 'The Broken Spans' }],
  // the castle's great rooms (furnished from gfx/phobostex.js, tools/phobosdress.py)
  sanctuary: ['sanctuary', { name: 'Sanctuary' }],          // a great church: pews either side of the aisle, a pulpit, the altar in its apse; chapels off a cloister walk
  auditorium: ['auditorium', { name: 'Auditorium' }],       // horseshoes of tiered benches round a stage
  stadium: ['stadium', { name: 'The Tilt Stadium' }],       // an oval of sand ringed by a parapet and four tiers of stands, the lord's box over it
  cloister: ['cloister', { name: 'Cloisters' }],            // garths open to the sky, an arcade of columns round each
  spires: ['spires', { name: 'The Broken Spires' }],   // towers in the void, stairs round them, Velscour's crossings (world/castlespires.js)
};
export const SHEER_LAYOUTS = new Set(['pits', 'bridges', 'outerstair', 'leaps', 'spires']);

const ARENA_W = 32, ARENA_H = 28;

export function generateCastleFloor(floor, layoutId, biome, tileset, seed, opts = {}) {
  const [family, O] = LAYOUTS[layoutId] || LAYOUTS.gatehouse;
  if (family === 'spires') return generateSpires(floor, O, biome, tileset, seed, opts);
  const rng = new RNG(seed);
  const W = opts.w || 200, Hh = opts.h || 170;
  const map = new TileMap(W, Hh);
  if (biome.sheer) map.sheer = biome.sheer;
  map.wallMix = true;   // the castle changes its stone from run to run of wall
  const I = (x, y) => y * W + x, inb = (x, y) => x > 1 && y > 1 && x < W - 2 && y < Hh - 2;
  const set = (x, y, v = 1) => { x |= 0; y |= 0; if (inb(x, y)) map.t[I(x, y)] = v; };
  const rect = (x, y, w, h, v = 1) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, v); };
  const stackT = [], shelfRun = (x, y, w, h) => { rect(x, y, w, h, 0); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) stackT.push([xx, yy, h > w]); };   // the library's stacks (bookcases once walled)
  const disc = (cx, cy, r, v = 1, ry = r) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (((x + 0.5 - cx) / r) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, v); };
  const ring = (cx, cy, r0, r1, v) => { for (let y = Math.floor(cy - r1); y <= cy + r1; y++) for (let x = Math.floor(cx - r1); x <= cx + r1; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d >= r0 && d <= r1) set(x, y, v); } };
  const lineW = (x0, y0, x1, y1, w = 1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; rect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); if (marking) for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) { const X = Math.round(x - w / 2) + a, Y = Math.round(y - w / 2) + b; if (inb(X, Y)) clear[I(X, Y)] = 1; } } };
  const corridor = (a, b, w = 3) => { // an L between two rooms' centres, the bend picked by the seed
    marking = true;
    if (rng.chance(0.5)) { lineW(a.mx, a.my, b.mx, a.my, w); lineW(b.mx, a.my, b.mx, b.my, w); }
    else { lineW(a.mx, a.my, a.mx, b.my, w); lineW(a.mx, b.my, b.mx, b.my, w); }
    marking = false;
  };
  const rooms = [], leaps = [], extra = [];
  // furniture [name, x, y, flip, extra tiles it also fills], columns, floors laid over the wing's own ([x, y, name]; 'carpet' = the wing's livery), tiles kept clear (corridor lines)
  const furn = [], cols = [], over = [], clear = new Uint8Array(W * Hh);
  let marking = false;
  const F = (name, x, y, flip = false, more = null) => furn.push([name, x, y, flip, more]);
  const carpet = (x, y, w, h, name = 'carpet') => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) over.push([xx, yy, name]); };
  const room = (o) => { const r = { type: 'room', idx: rooms.length, ...o }; r.mx ??= r.x + r.w / 2; r.my ??= r.y + r.h / 2; rooms.push(r); return r; };
  // the sprawl: a meandering chain of room sites across the canvas, west to east, with side branches
  const sites = (n, step) => {
    const out = [[14 + rng.int(0, 8), Hh / 2 + rng.int(-30, 30)]];
    let dir = 0;
    while (out.length < n) {
      const [px, py] = out[out.length - 1];
      dir = clamp(dir + rng.range(-0.9, 0.9), -1.2, 1.2);
      let x = px + Math.cos(dir) * step, y = py + Math.sin(dir) * step * 1.1;
      if (y < 20 || y > Hh - 20) { dir = -dir; y = clamp(y, 20, Hh - 20); }
      if (x > W - ARENA_W - 30) break;
      out.push([x, y]);
    }
    return out;
  };
  const pillarsIn = (r, rate, every = 4) => {
    if (!rate) return;
    for (let y = r.y + 2; y < r.y + r.h - 2; y += every) for (let x = r.x + 2; x < r.x + r.w - 2; x += every)
      if (rng.chance(rate) && Math.abs(x + 1 - r.mx) + Math.abs(y + 1 - r.my) > 3) cols.push([x, y]);   // a column (the stone drum of gfx/phobostex.js), not a hollow box of wall
  };

  // ------------------------------------------------------------------ the families
  if (family === 'halls') {
    const S = sites(rng.int(...O.rooms), O.step);
    for (const [x, y] of S) {
      const w = rng.int(...O.size), h = rng.int(...O.size);
      const r = room({ x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h });
      rect(r.x, r.y, w, h);
      pillarsIn(r, O.pillars);
      if (O.cells) for (let k = 0; k < 4; k++) { // a row of cells off the room's long side
        const cx = r.x + 1 + k * 4; if (cx + 3 > r.x + r.w) break;
        rect(cx, r.y - 4, 3, 3); set(cx + 1, r.y - 1);
      }
    }
    for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i], rng.chance(0.3) ? 4 : 3);
    for (let k = 0; k < (O.loops || 3); k++) { const a = rng.pick(rooms), b = rng.pick(rooms); if (a !== b && Math.hypot(a.mx - b.mx, a.my - b.my) < O.step * 2.2) corridor(a, b, 2); }
  } else if (family === 'naves') {
    let x = 10, y = Hh / 2;
    let prev = null;
    for (let n = 0; n < O.naves; n++) {
      const wN = rng.int(...O.w), l = rng.int(...O.l), along = n % 2 === 0;  // naves run east-west, then north-south...
      const r = along ? room({ x, y: Math.round(y - wN / 2), w: l, h: wN }) : room({ x: Math.round(x), y: Math.round(clamp(y - l / 2, 6, Hh - l - 6)), w: wN, h: l });
      rect(r.x, r.y, r.w, r.h);
      // two rows of columns down its length, and aisles beyond them
      const len = along ? r.w : r.h, span = along ? r.h : r.w;
      for (let k = 4; k < len - 4; k += 4) for (const s of [Math.floor(span * 0.28), Math.ceil(span * 0.72) - 1]) {
        const [px, py] = along ? [r.x + k, r.y + s] : [r.x + s, r.y + k];
        if (O.pillars === 'rows' || k % 8 === 4) cols.push([px, py]);
      }
      if (O.aisles) for (let k = 6; k < len - 6; k += 10) { // side chapels
        const [cx, cy] = along ? [r.x + k, r.y - 6] : [r.x - 6, r.y + k];
        rect(cx, cy, 6, 6); along ? rect(cx + 2, cy + 6, 2, 1) : rect(cx + 6, cy + 2, 1, 2);
        const [dx, dy] = along ? [r.x + k, r.y + r.h] : [r.x + r.w, r.y + k];
        rect(dx, dy, 6, 6); along ? rect(dx + 2, dy - 1, 2, 1) : rect(dx - 1, dy + 2, 1, 2);
      }
      if (O.apse) disc(along ? r.x + r.w : r.mx, along ? r.my : r.y + r.h, span * 0.45);
      // the long tables down a great hall; pews, a pulpit and the altar in a church's nave
      if (O.table) { r.bare = true; for (const off of [-3, 3]) for (let k = 9; k < len - 9; k += 4) { const [tx, ty] = along ? [r.x + k, Math.floor(r.my) + off] : [Math.floor(r.mx) + off, r.y + k]; F('hall_table', tx + 0.5, ty + 0.5, !along, [along ? [tx - 1, ty] : [tx, ty - 1]]); }
        along ? carpet(r.x + 3, Math.floor(r.my) - 1, r.w - 6, 2) : carpet(Math.floor(r.mx) - 1, r.y + 3, 2, r.h - 6); F('lord_box', along ? r.x + r.w - 3.5 : r.mx, along ? r.my : r.y + r.h - 3.5, along); }
      if (O.aisles) {
        r.bare = true;
        const s0 = Math.floor(span * 0.28) + 1, s1 = Math.ceil(span * 0.72) - 2, mid = Math.floor(span / 2);
        for (let k = 5; k < len - 10; k += 2) for (let q = s0; q <= s1; q++) { if (Math.abs(q - mid) <= 1) continue; const [tx, ty] = along ? [r.x + k, r.y + q] : [r.x + q, r.y + k]; F('pew', tx + 0.5, ty + 0.5, along); }
        along ? carpet(r.x + 2, r.y + mid - 1, r.w - 2, 3) : carpet(r.x + mid - 1, r.y + 2, 3, r.h - 2);
        const [ax, ay] = along ? [r.x + r.w - 3, r.y + mid] : [r.x + mid, r.y + r.h - 3];
        F('altar', ax + 0.5, ay + 0.5, along, along ? [[ax, ay - 1], [ax, ay + 1]] : [[ax - 1, ay], [ax + 1, ay]]);
        const [qx, qy] = along ? [r.x + r.w - 8, r.y + mid - 3] : [r.x + mid - 3, r.y + r.h - 8]; F('pulpit', qx + 0.5, qy + 0.5, along);
        for (const o of [-3, 3]) F('candle_stand', (along ? ax : ax + o) + 0.5, (along ? ay + o : ay) + 0.5);
      }
      if (prev) corridor(prev, r, 4);
      prev = r;
      x = along ? r.x + r.w + 14 : r.x + r.w + 14; y = along ? r.my + rng.int(-20, 20) : clamp(r.my + rng.int(-25, 25), 30, Hh - 30);
      // a cluster of side rooms off each nave (vestries, ossuaries, forge stores)
      for (let k = 0; k < 3; k++) {
        const sw = rng.int(7, 11), sh = rng.int(7, 11), sx = r.x + rng.int(0, Math.max(1, r.w - sw)), sy = rng.chance(0.5) ? r.y - sh - 10 : r.y + r.h + 10;
        if (sy < 4 || sy + sh > Hh - 4) continue;
        const s = room({ x: sx, y: sy, w: sw, h: sh }); rect(s.x, s.y, sw, sh); corridor(r, s, 2);
      }
    }
  } else if (family === 'arenas' || family === 'pits') {
    const n = rng.int(...(O.n || [6, 8])), S = sites(n, family === 'pits' ? 26 : (O.r ? O.r[1] * 2 + 10 : 28));
    for (const [x, y] of S) {
      const rr = family === 'pits' ? rng.int(10, 14) : rng.int(...O.r);
      const r = room({ x: Math.round(x - rr), y: Math.round(y - rr * 0.85), w: rr * 2, h: Math.round(rr * 1.7), mx: x, my: y, shape: 'disc', rr });
      disc(x, y, rr, 1, rr * 0.85);
      if (family === 'pits') disc(x, y, rr * 0.45, 0, rr * 0.38);   // the shaft: a bottomless drop (sheer)
      else if (O.ring) { ring(x, y, rr * 0.35, rr * 0.42, 0); for (let a = 0; a < 4; a++) lineW(x + Math.cos(a * 1.57 + 0.78) * rr * 0.3, y + Math.sin(a * 1.57 + 0.78) * rr * 0.3, x + Math.cos(a * 1.57 + 0.78) * rr * 0.5, y + Math.sin(a * 1.57 + 0.78) * rr * 0.5, 3); }
      else if (O.cages) { for (let a = 0; a < 6; a++) rect(Math.round(x + Math.cos(a * 1.05) * rr * 0.6) - 1, Math.round(y + Math.sin(a * 1.05) * rr * 0.5) - 1, 2, 2, 0); }
      else pillarsIn(r, 0.25, 5);
    }
    for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i], family === 'pits' ? 3 : 4);
    if (family === 'pits') for (const r of rooms) { ring(r.mx, r.my, r.rr * 0.45, r.rr * 0.47, 1); } // keep a lip round each shaft
  } else if (family === 'stacks') {
    const S = sites(O.halls + 1, O.long ? 40 : 34);
    for (const [x, y] of S) {
      const w = O.long ? rng.int(30, 38) : rng.int(22, 28), h = rng.int(18, 24);
      const r = room({ x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h });
      rect(r.x, r.y, w, h);
      // the shelves: long one-tile runs with a cross-aisle through the middle and gaps at both ends
      const vertical = rng.chance(0.5);
      if (vertical) for (let sx = r.x + 3; sx < r.x + w - 3; sx += 3) { shelfRun(sx, r.y + 3, 1, Math.floor(h / 2) - 4); shelfRun(sx, Math.floor(r.my) + 2, 1, Math.floor(h / 2) - 4); }
      else for (let sy = r.y + 3; sy < r.y + h - 3; sy += 3) { shelfRun(r.x + 3, sy, Math.floor(w / 2) - 4, 1); shelfRun(Math.floor(r.mx) + 2, sy, Math.floor(w / 2) - 4, 1); }
      // a reading room off it
      const rr = room({ x: r.x + rng.int(2, w - 10), y: rng.chance(0.5) ? r.y - 10 : r.y + h + 2, w: 8, h: 8 }); rect(rr.x, rr.y, 8, 8); corridor(r, rr, 2);
    }
    const halls = rooms.filter((r) => r.w > 12);
    for (let i = 1; i < halls.length; i++) corridor(halls[i - 1], halls[i], 3);
  } else if (family === 'sewers') {
    // tunnels on a coarse grid (a maze of mains), cisterns at some crossings; the aqueduct adds a long straight run
    const G = 14, gx = Math.floor((W - ARENA_W - 30) / G), gy = Math.floor((Hh - 20) / G), seen = new Set(), st = [[0, Math.floor(gy / 2)]];
    const node = (i, j) => [10 + i * G, 10 + j * G];
    seen.add('0,' + st[0][1]);
    while (st.length) {
      const [i, j] = st[st.length - 1], nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < gx && b < gy && !seen.has(a + ',' + b));
      if (!nb.length) { st.pop(); continue; }
      const [a, b] = nb[rng.int(0, nb.length - 1)];
      seen.add(a + ',' + b); st.push([a, b]);
      const [x0, y0] = node(i, j), [x1, y1] = node(a, b); lineW(x0, y0, x1, y1, 3);
    }
    for (let k = 0; k < gx * gy * 0.25; k++) { const i = rng.int(0, gx - 2), j = rng.int(0, gy - 1), [x0, y0] = node(i, j), [x1, y1] = node(i + 1, j); lineW(x0, y0, x1, y1, 2); }
    for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) if (rng.chance(0.22) || (i === 0 && j === Math.floor(gy / 2))) {
      const [x, y] = node(i, j), s = rng.int(7, 11), r = room({ x: x - (s >> 1), y: y - (s >> 1), w: s, h: s }); rect(r.x, r.y, s, s); pillarsIn(r, 0.5, 3);
    }
    if (O.aqueduct) { const y = node(0, Math.floor(gy / 2))[1]; lineW(10, y, W - ARENA_W - 20, y, 5); }
    rooms.sort((a, b) => a.mx - b.mx);
    if (rooms[0].mx > 20) { const r = room({ x: 6, y: Math.floor(node(0, Math.floor(gy / 2))[1]) - 4, w: 9, h: 9 }); rect(r.x, r.y, 9, 9); rooms.unshift(rooms.pop()); }
  } else if (family === 'bridges') {
    // round towers' tops over the void, joined by narrow bridges (a minimum spanning tree plus a few loops)
    const n = rng.int(...O.n), pts = [];
    for (let k = 0; k < n * 6 && pts.length < n; k++) {
      const x = 14 + rng.next() * (W - ARENA_W - 50), y = 16 + rng.next() * (Hh - 32);
      if (pts.every(([a, b]) => Math.hypot(a - x, b - y) > 26)) pts.push([x, y]);
    }
    pts.sort((a, b) => a[0] - b[0]);
    for (const [x, y] of pts) { const rr = rng.int(5, 8); room({ x: Math.round(x - rr), y: Math.round(y - rr), w: rr * 2, h: rr * 2, mx: x, my: y, shape: 'disc', rr }); disc(x, y, rr); ring(x, y, rr + 0.1, rr + 0.9, 1); }
    const inT = new Set([0]), edges = [];
    while (inT.size < rooms.length) {
      let best = null;
      for (const a of inT) for (let b = 0; b < rooms.length; b++) if (!inT.has(b)) { const d = Math.hypot(rooms[a].mx - rooms[b].mx, rooms[a].my - rooms[b].my); if (!best || d < best[2]) best = [a, b, d]; }
      inT.add(best[1]); edges.push(best);
    }
    for (let k = 0; k < 3; k++) { const a = rng.int(0, rooms.length - 1), b = rng.int(0, rooms.length - 1); if (a !== b) edges.push([a, b]); }
    for (const [a, b] of edges) lineW(rooms[a].mx, rooms[a].my, rooms[b].mx, rooms[b].my, 2);
    // a few leap pads between towers that no bridge joins: shortcuts over the gap
    for (let k = 0; k < 3; k++) { const a = rng.pick(rooms), b = rooms.filter((r) => r !== a).sort((p, q) => Math.hypot(p.mx - a.mx, p.my - a.my) - Math.hypot(q.mx - a.mx, q.my - a.my))[1]; if (b) padPair(a, b, k % 2 ? 'swing' : 'leap'); }
  } else if (family === 'outerstair') {
    // a stair wound round the outside of a great tower: an Archimedean spiral of steps from the foot (the rim) to the
    // tower's crown (the middle), landings on the way; the drum's middle is the crown platform
    const cx = (W - ARENA_W - 30) / 2 + 10, cy = Hh / 2, R0 = Math.min(cx - 8, cy - 8), turns = 3.2, rC = 8;
    disc(cx, cy, rC);
    const steps = 900, route = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, a = k * turns * Math.PI * 2, r = R0 - (R0 - rC - 3) * k, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
      rect(Math.round(x - 1), Math.round(y - 1), 3, 3); if (i % 30 === 0) route.push([x, y]);
      if (i % 110 === 0) { const s = room({ x: Math.round(x - 4), y: Math.round(y - 4), w: 8, h: 8, mx: x, my: y, shape: 'disc', rr: 4 }); disc(x, y, 4.5); }
    }
    const crown = room({ x: Math.round(cx - rC), y: Math.round(cy - rC), w: rC * 2, h: rC * 2, mx: cx, my: cy, shape: 'disc', rr: rC });
    // the foot: where the climb starts; leap pads down a turn (shortcuts) as the stair is learnt
    rooms.sort((a, b) => (a === crown ? 1 : b === crown ? -1 : 0));
    for (let k = 1; k + 2 < rooms.length - 1; k += 3) padPair(rooms[k], rooms[k + 2], k % 2 ? 'leap' : 'swing', true);
    // the crown's bridge east to the arena / exit
    rooms.push(rooms.splice(rooms.indexOf(crown), 1)[0]);
  } else if (family === 'leaps') {
    // broken spans: platforms in a line with gaps a body cannot walk, crossed on leap stones and swing chains;
    // a long way round on a ruined parapet exists for the stubborn (and the monsters)
    let x = 12, y = Hh / 2;
    const n = rng.int(9, 12);
    for (let k = 0; k < n; k++) {
      const rr = rng.int(4, 7), r = room({ x: Math.round(x - rr), y: Math.round(y - rr), w: rr * 2, h: rr * 2, mx: x, my: y, shape: 'disc', rr });
      disc(x, y, rr, 1, rr * 0.9);
      if (k > 0) padPair(rooms[k - 1], r, rng.chance(0.4) ? 'swing' : 'leap');
      x += rr + rng.int(9, 13) + 6; y = clamp(y + rng.int(-14, 14), 20, Hh - 20);
      if (x > W - ARENA_W - 30) break;
    }
    // the long way round: a thin parapet looping south of everything
    const py = Math.min(Hh - 6, Math.max(...rooms.map((r) => r.my)) + 16);
    for (const r of [rooms[0], rooms[rooms.length - 1]]) lineW(r.mx, r.my, r.mx, py, 2);
    lineW(rooms[0].mx, py, rooms[rooms.length - 1].mx, py, 2);
  }

  if (family === 'sanctuary') {
    // a narthex, the great church (nave, side chapels, crossing, chancel and apse), a cloister walk to two lesser
    // chapels, the sacristy beyond. Every church runs west to east: pews face the altar, the aisle carpeted in the
    // wing's livery, columns down both sides, a pulpit by the crossing
    const cy = Math.round(Hh / 2 + rng.int(-10, 10));
    const nar = room({ x: 8, y: cy - 5, w: 10, h: 11, bare: true }); rect(nar.x, nar.y, nar.w, nar.h);
    for (const dy of [-4, 4]) F('standard', nar.x + 8.5, cy + dy + 0.5);
    const church = (x0, yc, L, Wd, big) => {
      const r = room({ x: x0, y: yc - (Wd >> 1), w: L, h: Wd, bare: true, packs: big ? 6 : 2 }); rect(r.x, r.y, L, Wd);
      const end = r.x + L - (big ? 13 : 7);                                    // where the pews stop: the crossing
      for (let px = r.x + 4; px < end; px += big ? 3 : 2) for (let py = r.y + 2; py < r.y + Wd - 2; py++) {   // (a great church: room to fight between the rows, a five-wide aisle)
        if (Math.abs(py - yc) <= (big ? 2 : 1)) continue;
        if ((py === r.y + 2 || py === r.y + Wd - 3) && (px - r.x) % 6 === 4) cols.push([px, py]); else if (py !== r.y + 2 && py !== r.y + Wd - 3) F('pew', px + 0.5, py + 0.5, true);
      }
      carpet(r.x + 1, yc - (big ? 2 : 1), L - 1, big ? 5 : 3);
      if (big) { carpet(end + 1, r.y + 2, r.x + L - end - 3, Wd - 4); disc(r.x + L, yc + 0.5, Wd * 0.36); carpet(r.x + L, yc - 2, 3, 5); }
      const ax = r.x + L - (big ? 3 : 2);
      F('altar', ax + 0.5, yc + 0.5, true, [[ax, yc - 1], [ax, yc + 1]]);
      for (const o of [-3, 3]) F('candle_stand', ax + 0.5, yc + o + 0.5);
      F('pulpit', end + 1.5, yc - 3 + 0.5, true); F('lectern', end + 1.5, yc + 3 + 0.5, true);
      if (big) {
        F('font', r.x + 2.5, yc + 4.5); for (const o of [-(Wd >> 1) + 1, (Wd >> 1) - 1]) { F('standard', end + 3.5, yc + o + 0.5); F('brazier', r.x + L - 5.5, yc + o * 0.7 + 0.5); }
        for (let k = 8; k < L - 22; k += 14) for (const s of [-1, 1]) {   // side chapels: an altar, two candles, a tomb
          const cx0 = r.x + k, cy0 = s < 0 ? r.y - 7 : r.y + Wd + 1;
          rect(cx0, cy0, 7, 6); rect(cx0 + 2, s < 0 ? r.y - 1 : r.y + Wd, 3, 1);
          const fy = s < 0 ? cy0 : cy0 + 5;
          F('sarcophagus', cx0 + 3.5, fy + 0.5, false, [[cx0 + 2, fy]]); F('candle_stand', cx0 + 0.5, fy + 0.5); F('candle_stand', cx0 + 6.5, fy + 0.5);
          carpet(cx0 + 2, Math.min(cy0, s < 0 ? cy0 : r.y + Wd), 3, 7);
        }
      }
      return r;
    };
    const big = church(26, cy, rng.int(58, 66), 17, true);
    marking = true; lineW(nar.mx, cy, big.x + 2, cy, 3); marking = false;
    let prev = big;
    for (const s of rng.chance(0.5) ? [-1, 1] : [1, -1]) {
      const L = rng.int(24, 30), yc = clamp(cy + s * rng.int(30, 38), 14, Hh - 14), ch = church(Math.min(W - ARENA_W - 34 - L, big.x + big.w + rng.int(-22, 8)), yc, L, 11, false);
      corridor(prev === big ? { mx: big.x + big.w - 16, my: cy } : prev, { mx: ch.x + 2, my: yc }, 3); prev = ch;
    }
    const sac = room({ x: Math.min(W - ARENA_W - 22, big.x + big.w + 14), y: cy - 6, w: 13, h: 13 }); rect(sac.x, sac.y, 13, 13);
    corridor({ mx: big.x + big.w - 9, my: cy - 6 }, sac, 3); corridor(prev, sac, 3);
  } else if (family === 'auditorium') {
    // halls of tiered benches in a horseshoe round a stage (the stage toward the eye, the tiers rising away), lobbies between
    const S = sites(rng.int(3, 4), 50);
    let prev = null;
    for (const [sx, sy] of S) {
      const r0 = 6, R = r0 + 9, fx = Math.round(clamp(sx, R + 6, W - ARENA_W - R - 22)), fy = Math.round(clamp(sy, R + 6, Hh - R - 6));
      const r = room({ x: fx - R, y: fy - R, w: R * 2 + 9, h: R * 2, mx: fx + 2, my: fy, bare: true, packs: 5, hall: true });
      disc(fx, fy, R); rect(fx, fy - 7, 12, 14);
      for (let y = fy - R; y <= fy + R; y++) for (let x = fx - R; x <= fx + 2; x++) {
        const d = Math.hypot(x + 0.5 - fx, y + 0.5 - fy), a = Math.atan2(y + 0.5 - fy, x + 0.5 - fx);
        if (d < r0 || d >= r0 + 8 || Math.abs(a) < 1.25) continue;
        if ([Math.PI, 2.2, -2.2, 1.45, -1.45].some((q) => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q))) * d < 1.05)) { over.push([x, y, 'carpet']); continue; }   // the aisles up the tiers
        F('tier' + Math.min(4, 1 + Math.floor((d - r0) / 2)), x + 0.5, y + 0.5, Math.abs(Math.cos(a)) > 0.7);
      }
      carpet(fx + 5, fy - 5, 6, 10); F('lectern', fx + 6.5, fy + 0.5, true);
      for (const o of [-5, 4]) F('standard', fx + 10.5, fy + o + 0.5);
      for (const o of [-6, 5]) F('brazier', fx + 4.5, fy + o + 0.5);
      if (prev) corridor({ mx: prev.mx + 6, my: prev.my }, { mx: fx - R + 1, my: fy }, 3);
      marking = true; lineW(fx - R + 1, fy, fx + 8, fy, 3); marking = false;
      prev = r;
    }
    const lob = room({ x: 5, y: Math.round(rooms[0].my) - 5, w: 9, h: 10 }); rect(lob.x, lob.y, 9, 10); rooms.unshift(rooms.pop()); rooms.forEach((q, i) => (q.idx = i));
    corridor(lob, { mx: rooms[1].x + 1, my: rooms[1].my }, 3);
    const last2 = rooms[rooms.length - 1], gr = room({ x: Math.min(W - ARENA_W - 20, Math.round(last2.mx) + 22), y: Math.round(last2.my) - 6, w: 12, h: 12 }); rect(gr.x, gr.y, 12, 12);
    corridor({ mx: last2.mx + 7, my: last2.my }, gr, 3);
  } else if (family === 'stadium') {
    // the gate hall, the great oval (sand, a parapet, four tiers of stands rising away from the eye, the lord's box,
    // four tunnels through the stands), undercrofts, a lesser pit, the champion's hall
    const cy = Math.round(Hh / 2 + rng.int(-8, 8));
    const gate = room({ x: 6, y: cy - 5, w: 10, h: 11 }); rect(gate.x, gate.y, 10, 11);
    const oval = (cx, yc, a, b, packs) => {
      const A = a + 9, B = b + 9, r = room({ x: cx - a, y: yc - b, w: a * 2, h: b * 2, mx: cx, my: yc, bare: true, packs, stadium: true });
      disc(cx, yc, A, 1, B);
      for (let y = yc - B; y <= yc + B; y++) for (let x = cx - A; x <= cx + A; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - yc, e = Math.hypot(dx / a, dy / b), rim = Math.hypot(dx / A, dy / B);
        if (e < 1) { over.push([x, y, 'sand']); continue; }
        if (rim > 1) continue;
        if (Math.abs(dx) < 1.6 || Math.abs(dy) < 1.6) { over.push([x, y, 'carpet']); continue; }               // the four tunnels
        const out = (e - 1) * Math.min(a, b), far = dx + dy < 0;
        if (out < 1) { F('parapet', x + 0.5, y + 0.5, Math.abs(dx) / a > Math.abs(dy) / b); continue; }
        if (out < 1.9) continue;                                                                                 // the walk behind the parapet
        const lv = Math.min(far ? 4 : 2, 1 + Math.floor((out - 1.9) / 1.7));
        F(far && lv === 2 && Math.abs(dx - dy) < 1.2 ? 'lord_box' : 'tier' + lv, x + 0.5, y + 0.5, Math.abs(dx) / a > Math.abs(dy) / b);
      }
      for (let k = 0; k < 10; k++) { const t = (k + 0.5) / 10 * Math.PI * 2; F(k % 2 ? 'standard' : 'brazier', cx + Math.cos(t) * (a - 1.2) + 0.5, yc + Math.sin(t) * (b - 1.2) + 0.5); }
      marking = true; lineW(cx - A, yc, cx + A, yc, 3); lineW(cx, yc - B, cx, yc + B, 3); marking = false;
      return r;
    };
    const a1 = rng.int(15, 17), b1 = rng.int(11, 13), big = oval(18 + a1 + 12, cy, a1, b1, 7);
    marking = true; lineW(gate.mx, cy, big.mx - a1 - 9, cy, 3); marking = false;
    const under = [];
    for (const s of [-1, 1]) { const w = rng.int(10, 14), h = rng.int(8, 10), yy = s < 0 ? Math.max(4, cy - b1 - 12 - h - 8) : Math.min(Hh - h - 4, cy + b1 + 12 + 8); const u = room({ x: big.mx - (w >> 1) + rng.int(-8, 8), y: yy, w, h }); rect(u.x, u.y, w, h); pillarsIn(u, 0.3); marking = true; lineW(big.mx, cy + s * (b1 + 8), big.mx, u.my, 3); lineW(big.mx, u.my, u.mx, u.my, 3); marking = false; under.push(u); }
    const a2 = rng.int(9, 11), b2 = rng.int(7, 8), x2 = Math.min(W - ARENA_W - 40 - a2, big.mx + a1 + 9 + a2 + 16), pit = oval(x2, clamp(cy + rng.int(-14, 14), b2 + 14, Hh - b2 - 14), a2, b2, 4);
    marking = true; lineW(big.mx + a1 + 8, cy, pit.mx - a2 - 8, cy, 3); lineW(pit.mx - a2 - 10, cy, pit.mx - a2 - 10, pit.my, 3); lineW(pit.mx - a2 - 10, pit.my, pit.mx - a2 - 6, pit.my, 3); marking = false;
    const ch = room({ x: Math.min(W - ARENA_W - 18, pit.mx + a2 + 14), y: pit.my - 6, w: 12, h: 12 }); rect(ch.x, ch.y, 12, 12);
    marking = true; lineW(pit.mx + a2 + 8, pit.my, ch.mx, pit.my, 3); marking = false;
  } else if (family === 'cloister') {
    // garths open to the sky: dead grass, a font or an obelisk at the middle, an arcade of columns round each, the
    // walk between the columns and the wall carpeted; cells and chapter rooms off the walks
    const S = sites(rng.int(5, 6), 36);
    for (const [sx, sy] of S) {
      const w = rng.int(16, 22), h = rng.int(14, 18), r = room({ x: Math.round(sx - w / 2), y: Math.round(sy - h / 2), w, h, bare: true, packs: 3 });
      rect(r.x, r.y, w, h);
      carpet(r.x + 3, r.y + 3, w - 6, h - 6, 'garth');
      for (let x = r.x + 2; x < r.x + w - 2; x += 2) { cols.push([x, r.y + 2]); cols.push([x, r.y + h - 3]); }
      for (let y = r.y + 4; y < r.y + h - 3; y += 2) { cols.push([r.x + 2, y]); cols.push([r.x + w - 3, y]); }
      for (let x = r.x; x < r.x + w; x++) for (const y of [r.y + 1, r.y + h - 2]) over.push([x, y, 'carpet']);
      for (let y = r.y; y < r.y + h; y++) for (const x of [r.x + 1, r.x + w - 2]) over.push([x, y, 'carpet']);
      F(rooms.length % 2 ? 'font' : 'obelisk', Math.floor(r.mx) + 0.5, Math.floor(r.my) + 0.5);
      for (const [dx, dy] of [[-3, -2], [3, 2]]) F('sarcophagus', Math.floor(r.mx) + dx + 0.5, Math.floor(r.my) + dy + 0.5, dx > 0, [[Math.floor(r.mx) + dx - (dx > 0 ? 0 : 1), Math.floor(r.my) + dy - (dx > 0 ? 1 : 0)]]);
      for (const [dx, dy] of [[4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5]]) F(rng.chance(0.5) ? 'standard' : 'brazier', r.x + dx + 0.5, r.y + dy + 0.5);
      if (rng.chance(0.7)) { const cw = rng.int(7, 9), cr = room({ x: r.x + rng.int(0, w - cw), y: rng.chance(0.5) ? r.y - cw - 6 : r.y + h + 6, w: cw, h: cw }); if (cr.y > 3 && cr.y + cw < Hh - 3) { rect(cr.x, cr.y, cw, cw); corridor(r, cr, 2); } else rooms.pop(); }
    }
    const garths = rooms.filter((r) => r.bare);
    for (let i = 1; i < garths.length; i++) corridor(garths[i - 1], garths[i], 3);
    rooms.sort((p, q) => (p === garths[0] ? -1 : q === garths[0] ? 1 : 0)); rooms.forEach((q, i) => (q.idx = i));
  }

  /** Two pads, one each side of a gap, that fling the hero across both ways. */
  function padPair(a, b, kind, oneWay = false) {
    const ang = Math.atan2(b.my - a.my, b.mx - a.mx), ra = (a.rr || Math.min(a.w, a.h) / 2) - 1.5, rb = (b.rr || Math.min(b.w, b.h) / 2) - 1.5;
    const p = [a.mx + Math.cos(ang) * ra, a.my + Math.sin(ang) * ra], q = [b.mx - Math.cos(ang) * rb, b.my - Math.sin(ang) * rb];
    leaps.push({ x: p[0], y: p[1], tx: q[0], ty: q[1], kind, from: a.idx, to: b.idx });
    if (!oneWay) leaps.push({ x: q[0], y: q[1], tx: p[0], ty: p[1], kind, from: b.idx, to: a.idx, back: true });
  }

  // ------------------------------------------------------------------ the raid arena or the guardian's hall, east
  const last = rooms.reduce((a, b) => (b.mx > a.mx ? b : a));
  let raid = null, guardRoom = last;
  if (opts.raid) {
    const ax = Math.min(W - ARENA_W - 3, Math.floor(last.mx) + 22), ay = clamp(Math.round(last.my - ARENA_H / 2), 3, Hh - ARENA_H - 3), cut = 6;
    for (let y = 0; y < ARENA_H; y++) for (let x = 0; x < ARENA_W; x++) { const ex = Math.min(x, ARENA_W - 1 - x), ey = Math.min(y, ARENA_H - 1 - y); if (ex + ey >= cut) set(ax + x, ay + y); }
    const cx = ax + ARENA_W / 2, cy = ay + ARENA_H / 2, gy = Math.floor(cy);
    lineW(last.mx, last.my, last.mx + 6, last.my, 3); lineW(last.mx + 6, last.my, last.mx + 6, gy, 3); lineW(last.mx + 6, gy, ax + 2, gy, 3);
    const pillars = [];
    if (!map.sheer) for (const [dx, dy] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) { const px = Math.floor(cx + dx) - 1, py = Math.floor(cy + dy) - 1; rect(px, py, 2, 2, 0); pillars.push([px + 1, py + 1]); }
    raid = { type: 'arena', x: ax, y: ay, w: ARENA_W, h: ARENA_H, cx, cy, mx: cx, my: cy, pillars, gate: { x: ax, y0: gy - 1, y1: gy + 1 } };
    rooms.push(raid);
    guardRoom = raid;
  }
  // ------------------------------------------------------------------ connectivity: keep what the start reaches
  const start = rooms[0];
  const sx = Math.floor(start.mx), sy = Math.floor(start.my);
  set(sx, sy); set(sx + 1, sy);
  const reach = new Uint8Array(W * Hh), q = [I(sx, sy)]; reach[q[0]] = 1;
  const flood = () => { for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; for (const j of [i + 1, i - 1, i + W, i - W]) if (!reach[j] && map.t[j]) { reach[j] = 1; q.push(j); } } };
  flood();
  for (const L of leaps) { const j = I(Math.floor(L.tx), Math.floor(L.ty)); if (reach[I(Math.floor(L.x), Math.floor(L.y))] && map.t[j] && !reach[j]) { reach[j] = 1; q.push(j); flood(); } }
  for (let i = 0; i < map.t.length; i++) if (map.t[i] && !reach[i]) map.t[i] = 0;
  const live = rooms.filter((r) => reach[I(Math.floor(r.mx), Math.floor(r.my))]);
  if (!reach[I(Math.floor(guardRoom.mx), Math.floor(guardRoom.my))]) throw new Error('castle floor: the far end is cut off');

  // ------------------------------------------------------------------ dress, wall, light
  const nextTheme = themeDeck(biome, rng);
  for (const r of live) if (r !== start && r !== raid && r.w >= 6 && r.h >= 6 && !r.shape && !r.bare) Object.assign(r, nextTheme(false));
  // the stacks stand as bookcases (Bellmourn's book spines, gfx/phobostex.js), not walls, where that art has loaded
  const shelves = [];
  if (phobosProp('bookcase')) for (const [x, y, flip] of stackT) { const i = I(x, y); if (!map.t[i] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => map.t[I(x + a, y + b)])) { map.t[i] = 1; shelves.push([x, y, flip]); } }
  finishMap(map, tileset, rng, null, live.filter((r) => r.type === 'room' && !r.shape), extra);
  for (const [x, y] of shelves) map.block[I(x, y)] = 1;
  const packRooms = live.filter((r) => r !== start && r !== raid && r.w * r.h >= 30);
  // (no chapel windows stood free on the floor in rows: the rig packs' window props are for walls)
  const props = map.sheer ? [] : placeObstacles(map, packRooms.filter((r) => !r.shape && !r.bare), { ...tileset, scatter: tileset.scatter.filter((q) => !/window|glass_shards/.test(q.name)) }, rng, start);
  // the furniture and the columns (gfx/phobostex.js): never on a corridor's line or the start, and never sealing the floor
  if (!map.sheer) {
    const k = TW / 160, placed = [], color = opts.color || 'gold';
    const flood2 = () => { const seen = new Uint8Array(W * Hh), qq = [I(sx, sy)]; seen[qq[0]] = 1; for (let h = 0; h < qq.length; h++) { const j = qq[h]; for (const n of [j + 1, j - 1, j + W, j - W]) if (!seen[n] && map.t[n] && !map.block[n]) { seen[n] = 1; qq.push(n); } } return seen; };
    const put = (name, x, y, flip, more) => {
      const nm = name === 'standard' ? 'standard_' + color : name === 'altar' ? 'altar_' + color : name, spr = phobosProp(nm), tiles = [[x | 0, y | 0], ...(more || [])];
      if (!spr || tiles.some(([a, b]) => !inb(a, b) || !map.t[I(a, b)] || map.block[I(a, b)] || clear[I(a, b)]) || Math.hypot(x - start.mx, y - start.my) < 3) return;
      const pr = { kind: 'scatter', x, y, spr, k, flip: !!flip, fixed: true }; props.push(pr);
      for (const [a, b] of tiles) { map.block[I(a, b)] = 1; placed.push([I(a, b), pr]); }
    };
    for (const [x, y] of cols) put((x * 5 + y * 3) % 23 === 0 ? 'column_broken' : 'column', x + 0.5, y + 0.5, false);
    for (const [name, x, y, flip, more] of furn) put(name, x, y, flip, more);
    // a corridor's line cut off: the furniture goes. A pocket no one can reach (behind the stands): filled in
    const seen = flood2(); let cut = 0;
    for (let i = 0; i < clear.length; i++) if (clear[i] && map.t[i] && !map.block[i] && !seen[i]) cut++;
    if (cut) { for (const [i, pr] of placed) { map.block[i] = 0; const j = props.indexOf(pr); if (j >= 0) props.splice(j, 1); } console.warn('castle floor: furniture cut ' + cut + ' corridor tiles off; cleared'); }
    else for (let i = 0; i < seen.length; i++) if (map.t[i] && !map.block[i] && !seen[i]) map.block[i] = 1;
  }
  for (const [x, y, flip] of shelves) props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr: phobosProp((x * 7 + y * 3) % 9 ? 'bookcase' : 'jar_shelf'), k: TW / 160, flip, fixed: true });
  const { torches, wallHangings } = map.sheer ? { torches: [], wallHangings: [] } : wallMounts(map, rng, biome, () => 0.3, 0.5, wallHangingCount(biome));
  // Velscour's V from every wall: most hangings are his banner in the wing's livery, some his black war banner
  for (const h of wallHangings) { const q = rng.next(); if (q < 0.62) h.vb = opts.color || 'gold'; else if (q < 0.8) h.vb = 'war'; }

  // ------------------------------------------------------------------ who lives here
  const looks = opts.looks;
  const spot = (r) => {
    for (let i = 0; i < 40; i++) { const x = r.x + rng.range(0.8, r.w - 0.8), y = r.y + rng.range(0.8, r.h - 0.8); if (map.walkable(x, y)) return [x, y]; }
    return map.walkable(r.mx, r.my) ? [r.mx, r.my] : null;
  };
  const spawns = [];
  const pickFoe = () => looks.pickArt(rng);
  const per = family === 'bridges' || family === 'leaps' || family === 'outerstair' ? 1 : family === 'naves' ? 3 : 2;
  for (const r of packRooms) for (let k = 0; k < (r.packs || per); k++) {
    const s = spot(r), a = pickFoe(); if (!s || !a) continue;
    const A = ARCH[a.arch] || ARCH.knight;
    spawns.push({ x: s[0], y: s[1], arch: a.arch, n: rng.int(A.pack[0], A.pack[1]) + (floor > 50 ? 1 : 0), rank: 'normal', look: looks.lookOf(a) });
  }
  const champs = 2 + Math.floor(floor / 20), uniques = 1 + Math.floor(floor / 30);
  for (let k = 0; k < champs + uniques; k++) {
    const r = rng.pick(packRooms.length ? packRooms : [last]), s = spot(r), a = pickFoe(); if (!s || !a) continue;
    spawns.push({ x: s[0], y: s[1], arch: a.arch, n: rng.int(2, 4), rank: k < champs ? 'champion' : 'unique', champ: k === 0, look: looks.lookOf(a) });
  }
  const gs = raid ? null : spot(guardRoom);
  const chests = [];
  for (const r of shuffleWith(packRooms.slice(), rng).slice(0, 3)) { const s = spot(r); if (s) chests.push({ x: s[0], y: s[1], rare: rng.chance(0.25) }); }
  const exitAt = raid ? [raid.cx + 9, raid.cy] : (gs ? [gs[0] + 1.2, gs[1]] : [guardRoom.mx, guardRoom.my]);
  if (!map.walkable(exitAt[0], exitAt[1])) { const r = map.randomNear(exitAt[0], exitAt[1], 3); if (r) exitAt.splice(0, 2, ...r); }
  // the way through for auto-play: start, every pad on the main line, the end
  const route = leaps.filter((L) => !L.back).map((L) => [L.x, L.y]);
  return {
    map, rooms: live, spawns, props, chests, torches, wallHangings, leaps, route, family, layoutName: O.name, floorOver: over,
    start: [start.mx, start.my], exit: exitAt, guardian: gs, bossRoom: guardRoom, raid,
  };
}
