// TESSARIEL'S KEEP as a level (docs/TESSARIELS_KEEP.md): the layout (world/tkeep.js) as a height map whose every tile
// draws its baked piece (map.c3only, like the Sky Battle's ship), the balcony a walk 24 levels up reached by the two
// grand stairs, and the props: the hero's chosen banners, windows and trophies, the Castle Keep pack's furniture.
// Rugs go into the floor itself (map.dressTile, gfx/terrain.js drawColumn).
import { TileMap } from './map.js';
import { tkeepLayout, TK, KK } from './tkeep.js';
import { bannerSprite, glassSprite, rugCanvas, drawRugTile, trophySprite, keepProp, windowShaft, chandelierSprite, ghostSprite, drawFire, drawCandle } from '../gfx/keepart.js';
import { TROPHY_BY_ID } from '../data/keep.js';

/** The keep's map: heights, blocking, which tiles are masonry (baked pieces that may hide whoever stands behind). */
export function generateKeep() {
  const L = tkeepLayout(), N = L.W * L.H, map = new TileMap(L.W, L.H);
  map.hgt = new Int16Array(N);
  map.c3struct = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!L.t[i]) continue;
    map.t[i] = 1;
    map.hgt[i] = L.hgt[i];
    map.block[i] = L.solid[i];
    map.c3struct[i] = L.struct[i];
    map.v[i] = 1;
  }
  // the grand stairs rise 3 levels a tile; the dais is one step; nothing jumps off the balcony
  map.climb = 4; map.drop = 4; map.walkStep = 4;
  map.c3only = true; map.tallOcclusion = true; map.noSky = true; map.keep = true;
  // the front (south and east) balconies and parapets: see-through where they stand over the hero (render.js)
  map.cutFront = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const x = i % L.W, y = (i / L.W) | 0; if (L.t[i] && (x >= TK.FR || y >= TK.FR) && L.hgt[i] > 4) map.cutFront[i] = 1; }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (map.t[i] === 1) { lo = Math.min(lo, map.hgt[i]); hi = Math.max(hi, map.hgt[i]); }
  map.minLevel = lo; map.maxLevel = hi; map.baseLevel = lo - 16;
  const A = L.anchors;
  return { map, layout: L, start: A.start.slice(), anchors: A };
}

const lvAt = (L, x, y) => L.hgt[Math.floor(y) * L.W + Math.floor(x)];
/** The props the keep shows for this hero's choices (c.keep.decor) and trophies, and the rugs the floor lays in. */
export function keepProps(world, decor, have) {
  const L = tkeepLayout(), A = L.anchors, props = [];
  const add = (x, y, rec, o = {}) => { if (rec) props.push({ kind: 'scatter', x, y, spr: rec.spr || rec, k: rec.k || 0.5, keepDecor: true, ...o }); };
  // banners: on the balcony faces they stand on the floor tile in front; up the walls, on the balcony walk
  A.banners.forEach((s, i) => {
    const id = decor.banner[i];
    if (!id) return;
    const [x, y] = s.axis === 'x' ? [s.a, s.c + 0.08] : [s.c + 0.08, s.a];
    add(x, y, bannerSprite(id, s, lvAt(L, x, y)), { slot: ['banner', i] });
  });
  // windows: on the walk under them
  world.keepWindows = [];
  A.windows.forEach((win, i) => {
    const id = decor.glass[i];
    const [x, y] = win.axis === 'x' ? [win.a, win.c + 0.1] : [win.c + 0.1, win.a];
    const spr = id && glassSprite(id, win, lvAt(L, x, y));
    add(x, y, spr, { slot: ['glass', i] });
    if (spr) world.keepWindows.push({ glow: spr.glow, shaft: windowShaft(win), phase: i * 1.3 });
  });
  // trophies: on their pedestals; the Elders on their plinths once earned
  A.pedestals.forEach((p, i) => {
    const id = decor.pedestal[i], T = id && TROPHY_BY_ID[id];
    if (T) add(p.x, p.y, trophySprite(T.art), { slot: ['pedestal', i], trophy: id });
  });
  for (const p of A.plinths) {
    const T = Object.values(TROPHY_BY_ID).find((t) => t.plinth === p.corner);
    if (T && have.trophy.includes(T.id)) add(p.x, p.y, trophySprite(T.art), { trophy: T.id });
    else if (T) add(p.x, p.y, ghostSprite(T.art), { ghost: T.id });   // not yet carved: its shade waits on the plinth
  }
  // the chandeliers over the hall, their candles lit
  const ch = chandelierSprite();
  if (ch) for (const [x, y, z] of A.chandeliers) add(x, y, ch, { z: z * 4, noHide: true, fx: (ctx, px, py, t) => { ch.candles.forEach(([cx, cy], i) => drawCandle(ctx, px + cx, py + cy, t, i + x)); } });
  // furniture (the Castle Keep pack's painted props): armour and candelabra by the dais, lions by the portal,
  // benches under the colonnades, the war table, the Chronicle's lectern, the Vault's chest
  const F = (name, x, y, o = {}) => add(x, y, keepProp(name), o);
  F('empty_suit_of_armor', TK.F0 + 5.6, TK.F0 + 3.6); F('empty_suit_of_armor', TK.F1 - 4.6, TK.F0 + 3.6, { flip: true });   // clear of the braziers at the dais' corners
  const glow = (ctx, px, py, t) => { for (const [dx, dy] of [[0, -50], [-7, -43], [7, -43], [-11, -38], [11, -38]]) drawCandle(ctx, px + dx, py + dy, t, dx + px); };
  F('keep_candelabrum', TK.F0 + 8.5, TK.F0 + 2.5, { fx: glow }); F('keep_candelabrum', TK.F1 - 7.5, TK.F0 + 2.5, { fx: glow });
  F('carved_lion_statue', A.townPortal[0] - 2.4, TK.F1 + 0.35); F('carved_lion_statue', A.townPortal[0] + 2.4, TK.F1 + 0.35, { flip: true });
  for (const [cx, cy] of A.columns) F('stone_bench', cx + (cx < 20 ? -1.5 : 1.5), cy + 0.4, { flip: cx > 20 });   // in the aisles (the Elders' plinths stand inside the colonnades)
  F('war_map_table', A.warTable[0], A.warTable[1]);
  F('royal_lectern', A.chronicle[0], A.chronicle[1]);
  F('jeweled_reliquary', A.chronicle[0] - 2.2, A.chronicle[1] - 0.2); F('knight_memorial', A.chronicle[0] + 2.4, A.chronicle[1] - 0.1);
  F('treasury_chest', A.vault[0], A.vault[1]);
  F('shield_rack', TK.F1 - 0.7, TK.F0 + 12.5, { flip: true }); F('weapon_chest', TK.F0 + 0.8, TK.F0 + 12.6);
  for (const [x, y] of A.braziers) F('brazier_ash', x, y, { fx: (ctx, px, py, t) => drawFire(ctx, px, py - 13, t, 30, 9, 'ember', x * 7 + y, 8) });
  // the front balconies: candelabra along their parapets, a banner stand at each corner
  A.frontLights = [];
  for (let k = 0; k < 5; k++) {
    const a = TK.F0 + 2 + k * 5.5;
    const e = Math.max(a, TK.FSE + 0.5);   // the east terrace starts three tiles further on (the stair's landing)
    F('keep_candelabrum', a, TK.FR + 2.55, { fx: glow }); F('keep_candelabrum', TK.FR + 2.55, e, { fx: glow });
    A.frontLights.push([a, TK.FR + 2.4], [TK.FR + 2.4, e]);
  }
  // (the pack's banner stands fly a red lion: nothing in the Fiend's colour stands in this hall)
  // the rugs, laid into the floor tiles they cover
  world.keepRugs = A.rugs.map((r, i) => (decor.rug[i] ? rugCanvas(decor.rug[i], r) : null)).filter(Boolean);
  return props;
}

/** map.dressTile for the floor pass: the rugs over the tiles they cover. */
export function keepDressTile(world) {
  return (ctx, i) => {
    const rugs = world.keepRugs;
    if (!rugs || !rugs.length) return;
    const W = world.map.w, x = i % W, y = (i / W) | 0;
    for (const r of rugs) {
      const q = r.rect;
      if (x + 1 <= q.x0 || x >= q.x1 || y + 1 <= q.y0 || y >= q.y1) continue;
      drawRugTile(ctx, r, x, y, world.map.hgt[i]);
    }
  };
}
export { KK };
