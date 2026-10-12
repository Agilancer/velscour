// Asset loading + derived (recoloured / rescaled) sprite caches.
import { makeCanvas, recolor, scaleImage } from './util.js';

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
  floorAtlas: null, wallAtlas: null, tileMeta: null,
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
  jobs.push(track(loadImage('assets/tiles/catacombs_floor.webp').then((i) => { A.floorAtlas = i; })));
  jobs.push(track(loadImage('assets/tiles/catacombs_walls.webp').then((i) => { A.wallAtlas = i; })));
  jobs.push(track(loadJSON('assets/tiles/catacombs.json').then((j) => { A.tileMeta = j; })));
  await Promise.all(jobs);
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
 * Build (and cache) the recoloured tile set for a biome.
 * Returns { floors:[{img,sx,sy,w,h}], details, thresholds, segFwd, segBack, pillars, corners, rubble, towers, arch, gate }
 */
export function biomeTileSet(biome) {
  if (A.biomeSets[biome.id]) return A.biomeSets[biome.id];
  // keep memory bounded: each recoloured set is several MB of canvas
  const keys = Object.keys(A.biomeSets).filter((k) => k !== 'town');
  while (keys.length >= 2) delete A.biomeSets[keys.shift()];
  const pal = biome.palette;
  const floorImg = pal ? recolor(A.floorAtlas, pal) : A.floorAtlas;
  const wallPal = biome.wallPalette || pal;
  const wallImg = wallPal ? recolor(A.wallAtlas, wallPal) : A.wallAtlas;
  const set = { floors: [], details: [], thresholds: [], segFwd: [], segBack: [], pillars: [], corners: [], rubble: [], towers: [], misc: [], arch: null, gate: null, floorImg, wallImg, walls: [] };
  const strips = { wall_body: [], wall_cap: [], wall_ledge: [] };
  for (const f of A.tileMeta.floors) {
    const e = { img: floorImg, sx: f.x, sy: f.y, w: f.w, h: f.h };
    if (f.cat === 'floor') set.floors.push(e);
    else if (f.cat === 'detail') set.details.push(e);
    else set.thresholds.push(e);
  }
  for (const w of A.tileMeta.walls) {
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
  set.walls = composeWalls(strips);
  A.biomeSets[biome.id] = set;
  return set;
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
