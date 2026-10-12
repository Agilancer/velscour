// Asset loading + derived (recoloured / rescaled) sprite caches.
import { makeCanvas, recolor, scaleImage } from './util.js';
import { TW } from './view.js';
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
  packs: {}, // biome pack id -> { floors, walls, scatter, meta } (assets/tiles/<id>/), a Promise while loading
  town: null, // the town pack (assets/tiles/town/, tools/townpack.py): { ground, objects, meta }
  chestImg: null, chestMeta: null, // assets/props/chests.*
  biomeSets: {}, // `${biome}|${pack}` -> recoloured tile set (biomeTileSet)
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
  jobs.push(track(loadPack(DEFAULT_PACK)));
  jobs.push(track(Promise.all([loadImage('assets/tiles/town/ground.webp'), loadImage('assets/tiles/town/objects.webp'), loadJSON('assets/tiles/town/town.json')])
    .then(([ground, objects, meta]) => { A.town = { ground, objects, meta }; })));
  jobs.push(track(loadImage('assets/props/chests.webp').then((i) => { A.chestImg = i; })));
  jobs.push(track(loadJSON('assets/props/chests.json').then((j) => { A.chestMeta = j; })));
  await Promise.all(jobs);
}

// Biome packs (assets/tiles/<pack>/, imported by tools/biomepack.py; docs/ART.md). Every biome draws from one,
// palette swapped. Catacombs is the only pack so far.
const DEFAULT_PACK = 'catacombs';

function loadPack(id) {
  return A.packs[id] || (A.packs[id] = Promise.all(['floors', 'walls', 'scatter'].map((n) => loadImage(`assets/tiles/${id}/${n}.webp`)).concat(loadJSON(`assets/tiles/${id}/pack.json`)))
    .then(([floors, walls, scatter, meta]) => (A.packs[id] = { floors, walls, scatter, meta })).catch((e) => { delete A.packs[id]; throw e; }));
}
const ready = (v) => v && !(v instanceof Promise);

/** Fetch a biome's pack and the monster art. Safe to call repeatedly. */
export function loadBiomeArt(biome) {
  return Promise.all([
    loadEnemyArt().catch((e) => console.warn(e)), // monsters fall back to their pixel sprites
    loadPack(biome.pack || DEFAULT_PACK),
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
 * Build (and cache) the tile set for a biome: its pack (loadBiomeArt first; until then the default pack stands in),
 * recoloured by `biome.palette` (walls by `wallPalette` when set). Entries are {img,sx,sy,w,h} rects plus:
 * - floors [{lum, seamless, name}]: `bases` are the self-seamless ones (indices), `features` the rest
 * - walls[family][mask] = variants, each a list of arm slices {arm:'NE'|'SE'|'SW'|'NW'|'c', ox, oy}
 *   (ox/oy: native px from the node's ground point; draw at `k` world px per native px)
 * - arches[design][dir] = slices {a (tiles along the span), ox, oy}; doors[design][dir].closed|open = slices
 *   {part:'L'|'R'|'leaf', du, dv (depth anchor, tiles from the doorway centre), ox, oy}
 * - scatter [{name, ox, oy, fp (footprint in tiles), block}], chest {closed, open, rareClosed, rareOpen}
 */
export function biomeTileSet(biome) {
  const id = ready(A.packs[biome.pack || DEFAULT_PACK]) ? biome.pack || DEFAULT_PACK : DEFAULT_PACK;
  const key = biome.id + '|' + id;
  if (A.biomeSets[key]) return A.biomeSets[key];
  // keep memory bounded: each recoloured set is ~25 MB of canvas
  const keys = Object.keys(A.biomeSets).filter((k) => !k.startsWith('town|'));
  while (keys.length >= 2) delete A.biomeSets[keys.shift()]; // a mixed level holds two sets
  const pk = A.packs[id], m = pk.meta, pal = biome.palette, wallPal = biome.wallPalette || pal;
  const floorImg = pal ? recolor(pk.floors, pal) : pk.floors;
  const wallImg = wallPal ? recolor(pk.walls, wallPal) : pk.walls;
  const scatImg = pal ? recolor(pk.scatter, pal) : pk.scatter;
  const rect = (img, r) => ({ img, sx: r[1], sy: r[2], w: r[3], h: r[4], ox: r[5], oy: r[6] });
  const set = { pack: id, k: TW / m.tile[0], zscale: m.zscale, floors: [], bases: [], features: [], walls: {}, arches: {}, doors: {}, scatter: [], chest: null };
  m.floors.forEach((f, i) => {
    set.floors.push({ img: floorImg, sx: f.x, sy: f.y, w: f.w, h: f.h, lum: f.lum, seamless: f.seamless, name: f.name });
    (f.seamless ? set.bases : set.features).push(i);
  });
  for (const [fam, masks] of Object.entries(m.walls)) {
    set.walls[fam] = {};
    for (const [mask, vars] of Object.entries(masks)) set.walls[fam][mask] = vars.map((v) => v.map((r) => ({ ...rect(wallImg, r), arm: r[0] })));
  }
  set.families = Object.keys(set.walls);
  for (const [des, dirs] of Object.entries(m.arches)) {
    set.arches[des] = {};
    for (const [d, sl] of Object.entries(dirs)) set.arches[des][d] = sl.map((r) => ({ ...rect(wallImg, r), a: r[0] }));
  }
  for (const [des, dirs] of Object.entries(m.doors)) {
    set.doors[des] = {};
    for (const [d, st] of Object.entries(dirs)) {
      set.doors[des][d] = {};
      for (const [k, sl] of Object.entries(st)) set.doors[des][d][k] = sl.map((r) => ({ ...rect(wallImg, r), part: r[0][0], du: r[0][1], dv: r[0][2] }));
    }
  }
  for (const s of m.scatter) set.scatter.push({ img: scatImg, sx: s.x, sy: s.y, w: s.w, h: s.h, ox: s.ox, oy: s.oy, fp: s.fp, block: s.block, name: s.name });
  set.pillar = set.walls[set.families[0]]['0'][0][0];
  if (A.chestImg && A.chestMeta) {
    const img = pal ? recolor(A.chestImg, pal) : A.chestImg;
    const c = A.chestMeta;
    const e = (r) => ({ img, sx: r.x, sy: r.y, w: r.w, h: r.h });
    set.chest = { closed: e(c.closed), open: e(c.open), rareClosed: e(c.rareClosed), rareOpen: e(c.rareOpen) };
  }
  A.biomeSets[key] = set;
  return set;
}

/**
 * A level of `biome` mixed with a like-coloured `other` (biomes.js mixPartner): floors from both palettes (`split`
 * marks where the second set starts; dungeon.js paves whole regions with one or the other), walls, arches, doors
 * and scatter from one of them (`wallsFromOther`).
 */
export function mixedTileSet(biome, other, wallsFromOther = false) {
  const a = biomeTileSet(biome);
  if (!other) return a;
  const b = biomeTileSet(other);
  const w = wallsFromOther ? b : a, n = a.floors.length;
  return {
    ...w,
    floors: [...a.floors, ...b.floors], bases: a.bases, features: a.features,
    split: n, chest: a.chest, mixed: other.id,
  };
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
