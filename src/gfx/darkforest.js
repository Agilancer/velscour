// The Dark Forest's towering trees (assets/tiles/dark_forest/trees.*, tools/darkforestpack.py). Floors, walls,
// arches, doors and props are a regular biome pack (biomeTileSet); the trees are this pack's own category.
// Each tree is drawn in two parts split at the pack's trunk/canopy row, so the canopy can fade over the hero.
import { TW } from '../core/view.js';

const DIR = 'assets/tiles/dark_forest/';
let loading = null, img = null, meta = null;

export function loadDarkForestTrees() {
  if (img) return Promise.resolve();
  return loading || (loading = Promise.all([
    fetch(DIR + 'trees.json').then((r) => { if (!r.ok) throw new Error('Dark Forest tree metadata missing'); return r.json(); }),
    new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Dark Forest trees missing')); i.src = DIR + 'trees.webp'; }),
  ]).then(([m, i]) => { meta = m; img = i; }).catch((e) => { loading = null; throw e; }));
}

export const darkForestTreesReady = () => !!img;
export const DARK_TREE_NAMES = () => (meta ? meta.trees.map((t) => t.name) : []);

/** {img,sx,sy,w,h,ox,oy,split,tree:true}; draw at darkTreeK(scale) world px per atlas px. */
export function darkForestTree(name) {
  const t = meta && meta.trees.find((v) => v.name === name);
  if (!t) return null;
  return { img, sx: t.x, sy: t.y, w: t.w, h: t.h, ox: t.ox, oy: t.oy, split: t.split, tree: true, name: t.name, isometric: true };
}
/** World px per atlas px for a tree drawn at `s` of its native size (the atlas is half resolution). */
export const darkTreeK = (s = 1) => (TW / 160 / ((meta && meta.trees[0].scale) || 0.5)) * s;
