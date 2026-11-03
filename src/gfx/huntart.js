// THE GREAT HUNT's ground and frost (docs/GREAT_HUNT.md): each territory's floor set, recoloured once from the packs
// already in the repo (the town pack's outdoor ground, the Dark Forest pack's floors, the Sea of Sand's), and frosted
// copies of props for the White Waste. Floors follow the contract {img, sx, sy, w, h, name, soil} (gfx/mountainart.js).
import { A, biomeTileSet } from '../core/assets.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { makeCanvas, clamp } from '../core/util.js';
import { mountainFloors, MOUNTAIN_FLOORS } from './mountainart.js';
import { seaOfSandFloorTiles } from './seaofsand.js';

// [name, pack ('t' town | 'f' Dark Forest), source floor, adjust {h: hue deg, s: saturation, b: brightness, c: contrast}, soil]
const SETS = {
  tundra: [
    ['snow', 't', 'stone', { s: 0.1, b: 2.15, c: 0.42 }, 'snow'],
    ['snow_scree', 'f', 'shale_chips', { s: 0.1, b: 3, c: 0.5 }, 'snow'],
    ['drift', 'f', 'pale_sand', { s: 0.08, b: 2.3, c: 0.45 }, 'snow'],
    ['snow_tracks', 'f', 'wolf_tracks', { s: 0.12, b: 3.2, c: 0.55 }, 'snow'],
    ['snow_hooves', 'f', 'hoof_marks', { s: 0.12, b: 3.2, c: 0.55 }, 'snow'],
    ['ice', 'f', 'shallow_water', { h: -20, s: 0.45, b: 2.6, c: 0.6 }, 'snow'],
    ['frozen_mud', 'f', 'packed_mud', { s: 0.3, b: 2.2, c: 0.7 }, 'dirt'],
    ['frost_grass', 'f', 'dead_grass', { s: 0.3, b: 2.3, c: 0.6 }, 'snow'],
    ['frost_turf', 't', 'grass', { h: -40, s: 0.25, b: 1.35, c: 0.7 }, 'snow'],
    ['gravel', 't', 'gravel', { s: 0.3, b: 1.4 }, null],
    ['stone', 't', 'stone', { s: 0.4, b: 1.2 }, null],
  ],
  fen: [
    ['bog', 'f', 'shallow_water', { h: 40, s: 0.8, b: 1.45 }, 'moss'],
    ['black_pool', 'f', 'dark_puddle', { h: 20, b: 1.5 }, 'moss'],
    ['reeds', 'f', 'marsh_reeds', { b: 1.75 }, 'moss'],
    ['peat', 'f', 'peat', { b: 1.8 }, 'dirt'],
    ['clay', 'f', 'wet_clay', { b: 1.7 }, 'dirt'],
    ['moss', 'f', 'damp_moss', { b: 1.8, s: 1.1 }, 'moss'],
    ['poison_moss', 'f', 'poison_moss', { b: 1.6 }, 'moss'],
    ['stones', 'f', 'stepping_stones', { b: 1.75 }, 'moss'],
    ['mud', 'f', 'packed_mud', { b: 1.8 }, 'dirt'],
    ['roots', 'f', 'exposed_roots', { b: 1.8 }, 'dirt'],
    ['fungi', 'f', 'black_fungi', { b: 1.7 }, 'moss'],
    ['hooves', 'f', 'hoof_marks', { b: 1.8 }, 'dirt'],
  ],
};
// the Sea of Sand tiles the Badlands use, by their pack names
const SAND = ['red_dune_sand', 'shadowed_dune_sand', 'rippled_amber_sand', 'ochre_hardpan', 'sienna_cracked_clay', 'dried_wadi_bed', 'red_earth',
  'caravan_track_gravel', 'deep_caravan_ruts', 'footprinted_sand', 'pebble_scree', 'dark_coarse_scree', 'fossil_bedrock', 'salt_cracked_clay',
  'flaking_mud_crust', 'ironstone_gravel', 'ash_wadi', 'ochre_loam'];

/** Hue (YIQ turn), saturation, brightness and contrast over a canvas region's pixels. */
function adjust(img, sx, sy, w, h, o) {
  const c = makeCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  if (!o) return c;
  const d = g.getImageData(0, 0, w, h), p = d.data;
  const a = ((o.h || 0) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a), sat = o.s ?? 1, br = o.b ?? 1, ct = o.c ?? 1, add = o.add || 0;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    let r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
    const y = 0.299 * r + 0.587 * gg + 0.114 * b;
    let ii = 0.596 * r - 0.274 * gg - 0.322 * b, q = 0.211 * r - 0.523 * gg + 0.312 * b;
    [ii, q] = [(ii * cs - q * sn) * sat, (ii * sn + q * cs) * sat];
    r = y + 0.956 * ii + 0.621 * q; gg = y - 0.272 * ii - 0.647 * q; b = y - 1.106 * ii + 1.703 * q;
    const f = (v, k) => clamp(((v * br - 0.5) * ct + 0.5 + add * k) * 255, 0, 255);
    p[i] = f(r, 0.9); p[i + 1] = f(gg, 0.95); p[i + 2] = f(b, 1.05);
  }
  g.putImageData(d, 0, 0);
  return c;
}

const sets = {};
/** A territory's floors and their indices by name: 'mountain' (the Mountainside set), 'tundra', 'fen' or 'sand'. */
export function huntFloors(key) {
  if (sets[key]) return sets[key];
  let tiles;
  if (key === 'mountain') tiles = mountainFloors();
  else if (key === 'sand') {
    const all = seaOfSandFloorTiles(), by = new Map(all.map((f) => [f.name, f]));
    tiles = SAND.map((n) => by.get(n)).filter(Boolean).map((f) => ({ ...f, soil: null }));
    if (!tiles.length) throw new Error('Sea of Sand floors missing');
  } else {
    const t = A.town, m = t.meta, forest = new Map(biomeTileSet(BIOME_BY_ID.dark_forest).floors.map((f) => [f.name, f]));
    tiles = SETS[key].map(([name, pack, src, o, soil]) => {
      let s;
      if (pack === 't') { const [x, y] = m.floors[src]; s = { img: t.ground, sx: x, sy: y, w: m.tile[0], h: m.tile[1] }; }
      else s = forest.get(src);
      if (!s) throw new Error('Great Hunt floor source missing: ' + src);
      return { img: adjust(s.img, s.sx, s.sy, s.w, s.h, o), sx: 0, sy: 0, w: s.w, h: s.h, name, soil };
    });
  }
  const names = key === 'mountain' ? MOUNTAIN_FLOORS.map((f) => f[0]) : tiles.map((f) => f.name);
  return (sets[key] = { tiles, idx: Object.fromEntries(names.map((n, i) => [n, i])) });
}
const frosted = new Map();
/** A frosted copy of a prop sprite (pale, blue-white, a dusting of snow): same fields, its own canvas. */
export function frost(spr) {
  if (!spr) return spr;
  const key = spr.name + '|' + spr.sx + ',' + spr.sy;
  let f = frosted.get(key);
  if (!f) {
    const img = adjust(spr.img, spr.sx, spr.sy, spr.w, spr.h, { h: -12, s: 0.3, b: 1.35, c: 0.85, add: 0.22 });
    f = { ...spr, img, sx: 0, sy: 0 };
    frosted.set(key, f);
  }
  return f;
}
