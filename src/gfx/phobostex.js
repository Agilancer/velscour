// Phobos's own textures (tools/phobostex.py, from Bellmourn's PHOBOS-TEXTURES set): iso floor quarters and textured
// bookcases / jar shelves. Floors live in the map's variants from PH_V up (render.js floorEntry reads world.extraFloors):
// first the town pack's ground (one each), then every Phobos floor as four quarters, picked by tile parity so a
// texture spans 2 x 2 tiles without a seam.
import { A, loadImage } from '../core/assets.js';

export const PH_V = 130;   // (the ph_ packs hold at most 60 floors; 10 + 26 x 4 variants above this fit a byte)
export const TOWN_GROUND = ['grass', 'dense_meadow', 'trampled_verge', 'dirt', 'mud', 'gravel', 'irregular_flagstone', 'slate_paving', 'stone', 'concrete'];
export const PH_FLOORS = ['rutted_setts', 'slum_cobbles', 'ash_street', 'wharf_deck', 'bone_joint_flags', 'ward_paving', 'walk_paving', 'dead_grass', 'ash_clay_ground',
  'scree', 'oxblood_marble', 'bone_checker', 'worn_floorboards', 'mausoleum_marble', 'obsidian', 'bloodstone', 'bridge_ashlar', 'keep_basalt',
  // the dressing's (tools/phobosdress.py, dress.webp): the wings' carpets in the four liveries and more
  'carpet_gold', 'carpet_blue', 'carpet_red', 'carpet_green', 'bronze_plates', 'fishscale_slate', 'dye_flags', 'arena_sand'];
let img = null, meta = null, loading = null, dimg = null, dmeta = null;
export function loadPhobosTex() {
  return loading || (loading = Promise.all([loadImage('assets/tiles/phobos/phobos.webp'), fetch('assets/tiles/phobos/phobos.json').then((r) => r.json()),
    loadImage('assets/tiles/phobos/dress.webp').catch(() => null), fetch('assets/tiles/phobos/dress.json').then((r) => r.json()).catch(() => null)]).then(([i, m, di, dm]) => { img = i; meta = m; if (di && dm) { dimg = di; dmeta = dm; } })
    .catch((e) => { loading = null; console.warn('Phobos textures:', e); }));   // a failed load never blocks the way in; it retries next time
}
export const phobosTexReady = () => !!(img && meta);
/** The map variant for a floor at map tile (mx, my). */
export function floorV(name, mx, my) {
  const t = TOWN_GROUND.indexOf(name); if (t >= 0) return PH_V + t;
  const b = PH_FLOORS.indexOf(name); return PH_V + TOWN_GROUND.length + Math.max(0, b) * 4 + (mx & 1) + 2 * (my & 1);
}
/** world.extraFloors for a Phobos world (after loadPhobosTex). */
export function phobosFloors() {
  const out = [], tm = A.town?.meta, T = tm?.tile || [160, 80];
  for (const n of TOWN_GROUND) { const r = tm?.floors[n] || tm?.floors.dirt || [0, 0]; out.push({ img: A.town?.ground, sx: r[0], sy: r[1], w: T[0], h: T[1], name: n, material: n, lum: 0.4 }); }
  const stand = out[3];   // (no atlas: dirt for every Phobos floor)
  for (const n of PH_FLOORS) for (let q = 0; q < 4; q++) { const own = meta?.floors[n]?.[q], r = own || dmeta?.floors[n]?.[q], im = own ? img : dimg; out.push(r && im ? { img: im, sx: r[0], sy: r[1], w: 160, h: 80, name: n, material: /board|deck|carpet/.test(n) ? 'wood' : /grass|clay|scree/.test(n) ? 'dirt' : 'stone', lum: 0.35 } : stand); }
  return out;
}
/** A prop sprite (scatter format: native px, ground pivot): the bookcases and jar shelves, and the dressing's furniture. */
export function phobosProp(name) {
  const r = meta?.props[name]; if (r && img) return { img, sx: r[0], sy: r[1], w: r[2], h: r[3], ox: r[4], oy: r[5], name };
  const d = dmeta?.props[name]; return d && dimg ? { img: dimg, sx: d[0], sy: d[1], w: d[2], h: d[3], ox: d[4], oy: d[5], name } : null;
}

// ------------------------------------------------------------------------------------------------ ground cover
// No ground ends in a straight saw-tooth line: where two unlike grounds meet, a ragged band of gravel, moss, straw,
// ash, scree or bones lies over the join on both sides (map.seam: low 4 bits the tile's sides +x -x +y -y, high 4 the
// cover), and plain ground is strewn with patches of the same (map.patch: 1 + cover * 4 + variant). render.js draws
// them into the floor chunks right after the tile (drawGroundCover).
export const COVERS = ['gravel', 'moss', 'scree', 'rubble', 'bones', 'straw', 'litter', 'ash', 'puddle'];
const KIND = [[/carpet|marble|obsidian|bloodstone|checker|bronze|fishscale|basalt|floorboards|dye_flags|arena_sand/, 'fine'], [/deck/, 'wood'], [/bone/, 'bone'], [/scree/, 'scree'], [/ash/, 'ash'],
  [/grass|meadow/, 'grass'], [/dirt|mud|verge|gravel/, 'earth'], [/./, 'paved']];
const kindOf = (n) => KIND.find(([re]) => re.test(n))[1];
const PAIR = { 'grass|paved': 'moss', 'earth|paved': 'gravel', 'ash|paved': 'ash', 'earth|grass': 'straw', 'ash|earth': 'ash', 'ash|grass': 'ash', 'earth|earth': 'straw', 'grass|grass': 'moss',
  'paved|paved': 'gravel', 'ash|ash': 'ash', 'paved|wood': 'gravel', 'earth|wood': 'gravel', 'grass|wood': 'moss' };
const hash = (x, y, k) => { let h = Math.imul(x * 374761393 + y * 668265263 + k * 2147483647, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 8) & 0xffff) / 65536; };
/** Lay the cover over a Phobos map's ground. kerb: floor names whose edges stay crisp (kerbs, carpets); patches: how
 *  thickly plain ground is strewn (0..1). */
export function layGroundCover(map, { kerb = /walk_paving|carpet/, patches = 0.06, mood = null } = {}) {
  const W = map.w, n = W * map.h, names = new Array(n).fill(null), seam = new Uint8Array(n), patch = new Uint8Array(n);
  const nameOf = (v) => { const k = v - PH_V; return k < 0 ? null : k < TOWN_GROUND.length ? TOWN_GROUND[k] : PH_FLOORS[(k - TOWN_GROUND.length) >> 2] || null; };
  for (let i = 0; i < n; i++) if (map.t[i] === 1) names[i] = nameOf(map.v[i]);
  const cover = (a, b, i) => {
    if (!a || !b || a === b || kerb.test(a) || kerb.test(b)) return -1;
    const ka = kindOf(a), kb = kindOf(b); if (ka === 'fine' || kb === 'fine') return -1;
    const c = ka === 'bone' || kb === 'bone' ? 'bones' : ka === 'scree' || kb === 'scree' ? 'scree' : PAIR[ka < kb ? ka + '|' + kb : kb + '|' + ka] || 'gravel';
    return COVERS.indexOf((mood && mood(i, c)) || c);
  };
  for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = names[i]; if (!a) continue;
    let m = 0, c = -1;
    [i + 1, i - 1, i + W, i - W].forEach((j, s) => { const k = cover(a, names[j], Math.min(i, j)); if (k >= 0) { m |= 1 << s; c = k; } });
    if (m) seam[i] = m | (c << 4);
    else if (patches && !map.block[i] && hash(x, y, 3) < patches) {
      const ka = kindOf(a), r = hash(x, y, 5);
      const c2 = ka === 'fine' || ka === 'wood' ? null : ka === 'bone' ? 'bones' : ka === 'ash' ? (r < 0.6 ? 'ash' : 'rubble') : ka === 'scree' ? 'scree' : ka === 'grass' ? (r < 0.5 ? 'moss' : r < 0.8 ? 'straw' : 'gravel')
        : ka === 'earth' ? (r < 0.35 ? 'straw' : r < 0.6 ? 'puddle' : r < 0.8 ? 'litter' : 'gravel') : (r < 0.35 ? 'gravel' : r < 0.6 ? 'litter' : r < 0.8 ? 'puddle' : 'moss');
      const k = COVERS.indexOf((mood && c2 && mood(i, c2)) || c2); if (k >= 0) patch[i] = 1 + k * 4 + ((hash(x, y, 9) * 4) | 0);
    }
  }
  map.seam = seam; map.patch = patch;
}
/** The cover over floor tile i, drawn after the tile itself (px, py: the tile's top corner on the screen, in world px). */
export function drawGroundCover(ctx, map, i, tx, ty, px, py, HW, TW, TH) {
  if (!dimg) return;
  const s = map.seam[i], p = map.patch[i];
  if (s) {
    const list = dmeta.seams[COVERS[s >> 4]], q = (tx & 1) + 2 * (ty & 1); if (!list) return;
    for (let k = 0; k < 4; k++) if (s & (1 << k)) { const r = list[k * 4 + q]; ctx.drawImage(dimg, r[0], r[1], 160, 80, px - HW, py, TW, TH); }
  } else if (p) { const r = dmeta.patches[COVERS[(p - 1) >> 2]]?.[(p - 1) & 3]; if (r) ctx.drawImage(dimg, r[0], r[1], 160, 80, px - HW, py, TW, TH); }
}

// ------------------------------------------------------------------------------------------------ Velscour's V
// His banner on the castle's walls: one cloth per livery (gold = black and gold, blue, red, green, and the war banner),
// rendered flat on a wall running along map x; mirrored for a wall along map y. A wall hanging with `vb` (the livery).
export function vBannerRect(item, k) {
  const sp = phobosProp('wallbanner_' + item.vb); if (!sp) return null;
  const flip = item.dir === 'f';
  return [flip ? -(sp.ox + sp.w) * k : sp.ox * k, sp.oy * k, sp.w * k, sp.h * k, sp, flip];
}
export function drawVBanner(ctx, item, x, y, k, alpha = 1) {
  const r = vBannerRect(item, k); if (!r) return;
  const sp = r[4], a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * alpha;
  if (r[5]) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(sp.img, sp.sx, sp.sy, sp.w, sp.h, sp.ox * k, sp.oy * k, sp.w * k, sp.h * k); ctx.restore(); }
  else ctx.drawImage(sp.img, sp.sx, sp.sy, sp.w, sp.h, x + sp.ox * k, y + sp.oy * k, sp.w * k, sp.h * k);
  ctx.globalAlpha = a0;
}
