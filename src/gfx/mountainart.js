// Mountainside floors (world/mountain.js): the town pack's outdoor ground and the Dark Forest pack's forest floors,
// recoloured once into a 21-tile mountain set (the forest's floors are night-dark; brightened they read as alpine moss,
// turf, lichen, scree and snow). Each entry follows the floor contract {img, sx, sy, w, h} plus `soil`, the lip colour
// drawn under its cliff edges (gfx/terrain.js).
import { A, biomeTileSet } from '../core/assets.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { makeCanvas, clamp } from '../core/util.js';

// [name, pack ('t' town | 'f' Dark Forest), source floor, adjust {h: hue deg, s: saturation, b: brightness, c: contrast}, soil]
export const MOUNTAIN_FLOORS = [
  ['grass', 't', 'grass', null, 'grass'],
  ['meadow', 't', 'grass', { h: -14, s: 1.1, b: 1.08 }, 'grass'],
  ['deep_grass', 't', 'grass', { h: 10, s: 0.95, b: 0.86 }, 'grass'],
  ['alpine', 't', 'grass', { h: -26, s: 0.72, b: 1.1 }, 'grass'],
  ['moss', 'f', 'damp_moss', { b: 1.9, s: 1.15 }, 'moss'],
  ['turf', 'f', 'dark_turf', { b: 2.1, s: 1.1 }, 'grass'],
  ['ferns', 'f', 'fern_litter', { b: 1.8, s: 1.1 }, 'grass'],
  ['dry_grass', 'f', 'dead_grass', { b: 1.75, s: 0.95 }, 'grass'],
  ['lichen', 'f', 'green_lichen', { b: 1.55, s: 0.9 }, 'moss'],
  ['dirt', 't', 'dirt', null, 'dirt'],
  ['gravel', 't', 'gravel', null, null],
  ['stone', 't', 'stone', null, null],
  ['scree', 'f', 'shale_chips', { b: 1.9, s: 0.6 }, null],
  ['wash', 'f', 'gravel_wash', { b: 1.75, s: 0.7 }, null],
  ['vein', 'f', 'mineral_vein', { b: 1.6, s: 0.8 }, null],
  ['steps', 'f', 'broken_path_stones', { b: 1.75, s: 0.8 }, null],
  ['snow', 't', 'stone', { s: 0.1, b: 2.15, c: 0.42 }, 'snow'],
  ['snow_scree', 'f', 'shale_chips', { s: 0.1, b: 3, c: 0.5 }, 'snow'],
  ['cairn', 'f', 'stone_cairn_base', { b: 1.8, s: 0.7 }, null],
  ['petals', 'f', 'white_petals', { b: 1.6 }, 'grass'],
  ['mud', 'f', 'packed_mud', { b: 1.8 }, 'dirt'],
];
export const MF = Object.fromEntries(MOUNTAIN_FLOORS.map((f, i) => [f[0], i]));

function adjust(img, sx, sy, w, h, o) {
  const c = makeCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  if (!o) return c;
  const d = g.getImageData(0, 0, w, h), p = d.data;
  const a = ((o.h || 0) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a), sat = o.s ?? 1, br = o.b ?? 1, ct = o.c ?? 1;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    let r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
    // hue turn in YIQ, saturation about the luma, then brightness and contrast
    const y = 0.299 * r + 0.587 * gg + 0.114 * b;
    let ii = 0.596 * r - 0.274 * gg - 0.322 * b, q = 0.211 * r - 0.523 * gg + 0.312 * b;
    [ii, q] = [(ii * cs - q * sn) * sat, (ii * sn + q * cs) * sat];
    r = y + 0.956 * ii + 0.621 * q; gg = y - 0.272 * ii - 0.647 * q; b = y - 1.106 * ii + 1.703 * q;
    const f = (v) => clamp(((v * br - 0.5) * ct + 0.5) * 255, 0, 255);
    p[i] = f(r); p[i + 1] = f(gg); p[i + 2] = f(b);
  }
  g.putImageData(d, 0, 0);
  return c;
}

let floors = null;
/** The mountain floor set (needs the town art and the Dark Forest pack loaded: game.loadLevelArt). */
export function mountainFloors() {
  if (floors) return floors;
  const t = A.town, m = t.meta, forest = new Map(biomeTileSet(BIOME_BY_ID.dark_forest).floors.map((f) => [f.name, f]));
  floors = MOUNTAIN_FLOORS.map(([name, pack, src, o, soil]) => {
    let s;
    if (pack === 't') { const [x, y] = m.floors[src]; s = { img: t.ground, sx: x, sy: y, w: m.tile[0], h: m.tile[1] }; }
    else s = forest.get(src);
    if (!s) throw new Error('Mountainside floor source missing: ' + src);
    return { img: adjust(s.img, s.sx, s.sy, s.w, s.h, o), sx: 0, sy: 0, w: s.w, h: s.h, name, soil };
  });
  return floors;
}
