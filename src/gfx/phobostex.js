// Phobos's own textures (tools/phobostex.py, from Bellmourn's PHOBOS-TEXTURES set): iso floor quarters and textured
// bookcases / jar shelves. Floors live in the map's variants from PH_V up (render.js floorEntry reads world.extraFloors):
// first the town pack's ground (one each), then every Phobos floor as four quarters, picked by tile parity so a
// texture spans 2 x 2 tiles without a seam.
import { A, loadImage } from '../core/assets.js';

export const PH_V = 160;
export const TOWN_GROUND = ['grass', 'dense_meadow', 'trampled_verge', 'dirt', 'mud', 'gravel', 'irregular_flagstone', 'slate_paving', 'stone', 'concrete'];
export const PH_FLOORS = ['rutted_setts', 'slum_cobbles', 'ash_street', 'wharf_deck', 'bone_joint_flags', 'ward_paving', 'walk_paving', 'dead_grass', 'ash_clay_ground',
  'scree', 'oxblood_marble', 'bone_checker', 'worn_floorboards', 'mausoleum_marble', 'obsidian', 'bloodstone', 'bridge_ashlar', 'keep_basalt'];
let img = null, meta = null, loading = null;
export function loadPhobosTex() {
  return loading || (loading = Promise.all([loadImage('assets/tiles/phobos/phobos.webp'), fetch('assets/tiles/phobos/phobos.json').then((r) => r.json())]).then(([i, m]) => { img = i; meta = m; })
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
  for (const n of PH_FLOORS) for (let q = 0; q < 4; q++) { const r = meta?.floors[n]?.[q]; out.push(r && img ? { img, sx: r[0], sy: r[1], w: 160, h: 80, name: n, material: /board|deck/.test(n) ? 'wood' : /grass|clay|scree/.test(n) ? 'dirt' : 'stone', lum: 0.35 } : stand); }
  return out;
}
/** A bookcase or jar shelf sprite (scatter format: native px, ground pivot). */
export function phobosProp(name) { const r = meta?.props[name]; return r && img ? { img, sx: r[0], sy: r[1], w: r[2], h: r[3], ox: r[4], oy: r[5], name } : null; }
