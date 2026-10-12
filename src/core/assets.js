// Asset loading + derived (recoloured / rescaled) sprite caches.
import { makeCanvas, recolor, scaleImage } from './util.js';
import { loadEnemyArt } from './enemyart.js';

export const CLASS_IDS = [
  'paladin', 'ranger', 'wizard', 'necromancer',
  'barbarian', 'dragoon', 'totem_master', 'death_knight',
  'arcane_sorcerer', 'carrion_witch', 'bard', 'slime_lord',
  'boomerang_knight', 'lancer', 'dragon_knight', 'gunner',
];

export const A = {
  classes: {}, // id -> HTMLImageElement
  classScaled: {}, // `${id}|${h}|${palette}` -> canvas
  hud: null, hudGeo: null, logo: null, potions: {},
  tileSets: {}, // art id -> { floor, walls, meta } (assets/tiles/<id>*), loaded per biome
  propMeta: null, propImgs: {}, // assets/props/props.json + atlases by name, loaded per biome
  biomeSets: {},
};

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Failed to load ' + src));
    img.src = src;
  });
}
async function loadJSON(src) {
  const r = await fetch(src);
  if (!r.ok) throw new Error('Failed to load ' + src);
  return r.json();
}

export async function loadAssets(progress) {
  const jobs = [];
  let done = 0;
  const track = (p) => p.then((v) => { done++; progress && progress(done / jobs.length); return v; });
  for (const id of CLASS_IDS) jobs.push(track(loadImage(`assets/sprites/classes/${id}.webp`).then((img) => { A.classes[id] = img; })));
  jobs.push(track(loadImage('assets/ui/hud.webp').then((i) => { A.hud = i; })));
  jobs.push(track(loadJSON('assets/ui/hud.json').then((j) => { A.hudGeo = j; })));
  jobs.push(track(loadImage('assets/ui/logo.webp').then((i) => { A.logo = i; })));
  for (const c of ['red', 'blue', 'purple', 'orange']) jobs.push(track(loadImage(`assets/ui/potion_${c}.png`).then((i) => { A.potions[c] = i; })));
  jobs.push(track(loadTileSet(DEFAULT_ART)));
  jobs.push(track(loadJSON('assets/props/props.json').then((j) => { A.propMeta = j; })));
  jobs.push(track(loadPropImg(CHEST_SHEET)));
  await Promise.all(jobs);
}

const DEFAULT_ART = 'skull'; // town walls, and the fallback while a biome's own art is still loading
const CHEST_SHEET = 'dungeon_mechanisms';
// loot-chest art per scatter sheet: [closed, open, rare closed, rare open] variant rows
const CHEST_ART = { dungeon_mechanisms: [0, 1, 4, 5], desert_ruins: [2, 3, 4, 5], swamp_obstacles: [0, 1, 3, 4] };

function loadTileSet(id) {
  return A.tileSets[id] || (A.tileSets[id] = Promise.all([
    loadImage(`assets/tiles/${id}_floor.webp`), loadImage(`assets/tiles/${id}_walls.webp`), loadJSON(`assets/tiles/${id}.json`),
  ]).then(([floor, walls, meta]) => (A.tileSets[id] = { floor, walls, meta })).catch((e) => { delete A.tileSets[id]; throw e; }));
}
function loadPropImg(name) {
  return A.propImgs[name] || (A.propImgs[name] = loadImage(`assets/props/${name}.webp`)
    .then((img) => (A.propImgs[name] = img)).catch((e) => { delete A.propImgs[name]; throw e; }));
}
const ready = (v) => v && !(v instanceof Promise);

/** Fetch a biome's tile set, scatter sheets and barricades (about 1 MB), and the monster art. Safe to call repeatedly. */
export function loadBiomeArt(biome) {
  return Promise.all([
    loadEnemyArt().catch((e) => console.warn(e)), // monsters fall back to their pixel sprites
    loadTileSet(biome.art || DEFAULT_ART),
    ...(biome.scatter || []).map(loadPropImg),
    ...(biome.barricade ? [loadPropImg('barricades_' + biome.barricade)] : []),
  ]);
}

/** A class sprite scaled to `h` px tall, optionally palette swapped (for NPCs). */
export function classSprite(id, h, palette = null) {
  const key = `${id}|${h}|${palette ? JSON.stringify(palette) : ''}`;
  let c = A.classScaled[key];
  if (!c) {
    let src = A.classes[id];
    if (palette) src = recolor(src, palette);
    c = scaleImage(src, h);
    A.classScaled[key] = c;
  }
  return c;
}

/**
 * Build (and cache) the tile set for a biome from its own art (loadBiomeArt first; until then the
 * default set stands in), recoloured by `biome.palette` when it has one.
 * Returns { floors:[{img,sx,sy,w,h,busy}], details, thresholds, walls, segFwd, segBack, pillars, corners, rubble,
 * towers, arch, gate, scatter, barricades:{fwd,back}, chest:{closed,open,rareClosed,rareOpen} }
 */
export function biomeTileSet(biome) {
  const art = ready(A.tileSets[biome.art]) ? biome.art : DEFAULT_ART;
  const key = biome.id + '|' + art;
  if (A.biomeSets[key]) return A.biomeSets[key];
  // keep memory bounded: each recoloured set is several MB of canvas
  const keys = Object.keys(A.biomeSets).filter((k) => !k.startsWith('town|'));
  while (keys.length >= 3) delete A.biomeSets[keys.shift()]; // a mixed level holds two sets
  const { floor, walls, meta } = A.tileSets[art];
  const pal = biome.palette;
  const floorImg = pal ? recolor(floor, pal) : floor;
  const wallPal = biome.wallPalette || pal;
  const wallImg = wallPal ? recolor(walls, wallPal) : walls;
  const set = { floors: [], details: [], thresholds: [], segFwd: [], segBack: [], pillars: [], corners: [], rubble: [], towers: [], misc: [], arch: null, gate: null, floorImg, wallImg, walls: [], scatter: [], barricades: { fwd: [], back: [] }, chest: null };
  const strips = { wall_body: [], wall_cap: [], wall_ledge: [] };
  for (const f of meta.floors) {
    const e = { img: floorImg, sx: f.x, sy: f.y, w: f.w, h: f.h, busy: f.busy || 0 };
    if (f.cat === 'floor') set.floors.push(e);
    else if (f.cat === 'detail') set.details.push(e);
    else set.thresholds.push(e);
  }
  for (const w of meta.walls) {
    const e = { img: wallImg, sx: w.x, sy: w.y, w: w.w, h: w.h, slope: w.slope, base: w.base, kind: w.kind };
    switch (w.kind) {
      case 'seg_fwd': set.segFwd.push(e); break;
      case 'seg_back': set.segBack.push(e); break;
      case 'pillar': set.pillars.push(e); break;
      case 'corner': set.corners.push(e); break;
      case 'rubble': set.rubble.push(e); break;
      case 'tower': set.towers.push(e); break;
      case 'arch': set.arch = e; break;
      case 'gate': set.gate = e; break;
      case 'wall_body': case 'wall_cap': case 'wall_ledge': e.rows = w.rows; strips[w.kind].push(e); break;
      default: set.misc.push(e);
    }
  }
  set.pillars.sort((a, b) => b.w - a.w);
  set.floors.sort((a, b) => a.busy - b.busy); // calm paving first (finishMap favours it)
  set.walls = composeWalls(strips);
  // props: only what has loaded (a set built before loadBiomeArt finishes just has fewer props)
  const tinted = {};
  const sheetImg = (name) => (!ready(A.propImgs[name]) ? null : !pal ? A.propImgs[name] : tinted[name] || (tinted[name] = recolor(A.propImgs[name], pal)));
  const pm = A.propMeta || { scatter: {}, barricades: {} };
  let chestSheet = null;
  for (const name of biome.scatter || []) {
    const img = sheetImg(name);
    if (!img) continue;
    for (const p of pm.scatter[name] || []) {
      if (p.kind !== 'chest') set.scatter.push({ img, sx: p.x, sy: p.y, w: p.w, h: p.h, kind: p.kind, block: p.block, size: p.size });
    }
    if (!chestSheet && CHEST_ART[name]) chestSheet = name;
  }
  chestSheet = chestSheet || CHEST_SHEET;
  const chestImg = sheetImg(chestSheet);
  if (chestImg) {
    const byVar = {};
    for (const p of pm.scatter[chestSheet] || []) if (p.kind === 'chest') byVar[p.var] = { img: chestImg, sx: p.x, sy: p.y, w: p.w, h: p.h };
    const [c, o, rc, ro] = CHEST_ART[chestSheet];
    set.chest = { closed: byVar[c], open: byVar[o], rareClosed: byVar[rc], rareOpen: byVar[ro] };
  }
  const bImg = biome.barricade && sheetImg('barricades_' + biome.barricade);
  if (bImg) for (const p of pm.barricades[biome.barricade] || []) set.barricades[p.kind].push({ img: bImg, sx: p.x, sy: p.y, w: p.w, h: p.h });
  A.biomeSets[key] = set;
  return set;
}

/**
 * A level of `biome` mixed with a like-coloured `other` (biomes.js mixPartner): floors and floor details from both
 * sets (`split` marks where the second set starts; dungeon.js paves whole regions with one or the other), walls,
 * pillars and rubble from one of them (`wallsFromOther`), both biomes' scatter, and either barricade set.
 * Falls back to the plain set while the other biome's art has not loaded.
 */
export function mixedTileSet(biome, other, wallsFromOther = false) {
  const a = biomeTileSet(biome);
  if (!other || other.art === undefined || !ready(A.tileSets[other.art])) return a;
  const b = biomeTileSet(other);
  if (!b.floors.length || !a.floors.length) return a;
  const w = wallsFromOther && b.walls.length ? b : a;
  return {
    ...w,
    floors: [...a.floors, ...b.floors], details: [...a.details, ...b.details], thresholds: a.thresholds,
    split: { floors: a.floors.length, details: a.details.length },
    scatter: [...a.scatter, ...b.scatter],
    barricades: (wallsFromOther ? b : a).barricades.fwd.length ? (wallsFromOther ? b : a).barricades : a.barricades,
    chest: a.chest || b.chest, mixed: other.id,
  };
}

export const WALL_TIERS = 2; // skull-niche tiers stacked per wall (the corner posts have two as well)

/**
 * Stack the seamless strips from tools/process_assets.py (ledge + WALL_TIERS niche bodies + cap) into
 * whole "/" wall sections, one tile edge wide. Each strip is already sheared to 2:1, so stacking them at
 * their row offsets keeps every edge aligned. `base` is the row where the wall face meets the floor at
 * the section's left column; that line rises 1px per 2px to the right.
 */
function composeWalls(strips) {
  const bodies = strips.wall_body, cap = strips.wall_cap[0], ledge = strips.wall_ledge[0];
  if (!bodies.length || !cap || !ledge) return [];
  const w = cap.w, ext = cap.h - cap.rows;
  const rows = cap.rows + WALL_TIERS * bodies[0].rows + ledge.rows;
  const out = [];
  let seed = 7;
  const pick = () => { seed = (seed * 16807) % 2147483647; return bodies[seed % bodies.length]; };
  for (let i = 0; i < 24; i++) {
    const c = makeCanvas(w, rows + ext);
    const x = c.getContext('2d');
    const put = (s, y) => x.drawImage(s.img, s.sx, s.sy, s.w, s.h, 0, y, s.w, s.h);
    let y = cap.rows;
    for (let t = 0; t < WALL_TIERS; t++) { put(pick(), y); y += bodies[0].rows; }
    put(ledge, y);
    put(cap, 0);
    out.push({ img: c, sx: 0, sy: 0, w, h: rows + ext, base: y + ext });
  }
  return out;
}

/** Make a canvas icon from a potion image (for inventory / shop). */
export function potionIcon(color, size = 48) {
  const img = A.potions[color];
  const c = makeCanvas(size, size);
  const x = c.getContext('2d');
  const s = Math.min(size / img.width, size / img.height) * 0.92;
  x.drawImage(img, (size - img.width * s) / 2, (size - img.height * s) / 2, img.width * s, img.height * s);
  return c;
}
