// TESSARIEL'S KEEP as a level (docs/TESSARIELS_KEEP.md): the layout (world/tkeep.js) as a height map whose every tile
// draws its baked piece (map.c3only, like the Sky Battle's ship), the balcony a walk 24 levels up reached by the two
// grand stairs, and the props: the hero's chosen banners, windows and trophies, the Castle Keep pack's furniture.
// Rugs go into the floor itself (map.dressTile, gfx/terrain.js drawColumn).
import { TileMap } from './map.js';
import { tkeepLayout, TK, KK } from './tkeep.js';
import { bannerSprite, glassSprite, rugCanvas, drawRugTile, trophySprite, keepProp, windowShaft } from '../gfx/keepart.js';
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
  }
  // furniture (the Castle Keep pack's painted props): armour and candelabra by the dais, lions by the portal,
  // benches under the colonnades, the war table, the Chronicle's lectern, the Vault's chest
  const F = (name, x, y, o = {}) => add(x, y, keepProp(name), o);
  F('empty_suit_of_armor', TK.F0 + 7.5, TK.F0 + 3.4); F('empty_suit_of_armor', TK.F1 - 6.5, TK.F0 + 3.4, { flip: true });
  F('keep_candelabrum', TK.F0 + 7.6, TK.F0 + 0.6); F('keep_candelabrum', TK.F1 - 6.6, TK.F0 + 0.6);
  F('carved_lion_statue', A.townPortal[0] - 2.4, TK.F1 + 0.35); F('carved_lion_statue', A.townPortal[0] + 2.4, TK.F1 + 0.35, { flip: true });
  F('royal_banner_stand', A.waygate[0] + 1.6, TK.F1 + 0.3);
  for (const [cx, cy] of A.columns) F('stone_bench', cx + (cx < 20 ? 1.4 : -1.4), cy + 1.3, { flip: cx > 20 });
  F('war_map_table', A.warTable[0], A.warTable[1]);
  F('royal_lectern', A.chronicle[0], A.chronicle[1]);
  F('jeweled_reliquary', A.chronicle[0] - 2.2, A.chronicle[1] - 0.2); F('knight_memorial', A.chronicle[0] + 2.4, A.chronicle[1] - 0.1);
  F('treasury_chest', A.vault[0], A.vault[1]);
  F('shield_rack', TK.F1 - 0.7, TK.F0 + 12.5, { flip: true }); F('weapon_chest', TK.F0 + 0.8, TK.F0 + 12.6);
  for (const [x, y] of A.braziers) F('brazier_ash', x, y);
  // the front balconies: candelabra along their parapets, a banner stand at each corner
  A.frontLights = [];
  for (let k = 0; k < 5; k++) {
    const a = TK.F0 + 2 + k * 5.5;
    F('keep_candelabrum', a, TK.FR + 2.55); F('keep_candelabrum', TK.FR + 2.55, a);
    A.frontLights.push([a, TK.FR + 2.4], [TK.FR + 2.4, a]);
  }
  F('royal_banner_stand', TK.FR + 2.3, TK.FR + 2.3); F('royal_banner_stand', TK.BW + 0.7, TK.FR + 2.3); F('royal_banner_stand', TK.FR + 2.3, TK.BW + 0.7);
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
