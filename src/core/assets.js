// Asset loading + derived (recoloured / rescaled) sprite caches.
import { makeCanvas, recolor, scaleImage } from './util.js';
import { generateDesertTemplePack } from '../gfx/deserttemple.js';
import { generateIceTemplePack } from '../gfx/icetemple.js';
import { generateHellPack } from '../gfx/hellpack.js';
import { generateAstralPlanePack } from '../gfx/astralplane.js';
import { generateHeavenlyPack } from '../gfx/heavenlypack.js';
import { expandBiomePack } from '../gfx/biomeexpansion.js';
import { TW } from './view.js';
import { loadReplacementArt } from './replacementart.js';
import { loadEnemyArt } from './enemyart.js';
import { preloadSong } from './audio.js';

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
  gibImg: null, gibMeta: null, // assets/sprites/gibs.* (tools/gibpack.py): { set: [[x, y, w, h], ...] }
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
  let done = 0, song = 0;   // the title song is ~3.6 MB, so it counts as a third of the bar by its own bytes
  const report = () => progress && progress(done / jobs.length * 2 / 3 + song / 3);
  const track = (p) => p.then((v) => { done++; report(); return v; });
  jobs.push(track(loadReplacementArt()));
  jobs.push(track(preloadSong('hymn_of_the_abyss', (k) => { song = k; report(); }).then(() => { song = 1; })));
  for (const id of CLASS_IDS) jobs.push(track(loadImage(`assets/sprites/classes/${id}.webp`).then((img) => { A.classes[id] = img; })));
  jobs.push(track(loadImage('assets/ui/hud.webp').then((i) => { A.hud = i; })));
  jobs.push(track(loadJSON('assets/ui/hud.json').then((j) => { A.hudGeo = j; })));
  jobs.push(track(loadImage('assets/ui/logo.webp').then((i) => { A.logo = i; })));
  for (const c of ['red', 'blue', 'purple', 'orange']) jobs.push(track(loadImage(`assets/ui/potion_${c}.png`).then((i) => { A.potions[c] = i; })));
  jobs.push(track(loadPack(DEFAULT_PACK)));
  jobs.push(track(Promise.all([loadImage('assets/tiles/town/ground.webp'), loadImage('assets/tiles/town/objects.webp'), loadJSON('assets/tiles/town/town.json')])
    .then(([ground, objects, meta]) => { A.town = { ground, objects, meta }; })));
  jobs.push(track(loadImage('assets/props/chests.webp').then((i) => { A.chestImg = i; })));
  jobs.push(track(loadImage('assets/sprites/gibs.webp').then((i) => { A.gibImg = i; })));
  jobs.push(track(loadJSON('assets/sprites/gibs.json').then((j) => { A.gibMeta = j; })));
  jobs.push(track(loadJSON('assets/props/chests.json').then((j) => { A.chestMeta = j; })));
  await Promise.all(jobs);
}

// Biome packs (assets/tiles/<pack>/, imported by tools/biomepack.py; docs/ART.md). Every biome draws from one,
// palette swapped. Desert Temple is a Canvas-generated pack with source in gfx/deserttemple.js.
const DEFAULT_PACK = 'catacombs';

function loadPack(id) {
  if (id === 'heavenly') {
    return A.packs[id] || (A.packs[id] = loadPack('catacombs').then(base =>
      (A.packs[id] = generateHeavenlyPack(base))).catch(e => { delete A.packs[id]; throw e; }));
  }
  if (id === 'astral_plane') {
    // Celestial artwork is generated once, matching the existing tile/door silhouette metadata.
    return A.packs[id] || (A.packs[id] = loadPack('catacombs').then((base) =>
      (A.packs[id] = generateAstralPlanePack(base))).catch((e) => { delete A.packs[id]; throw e; }));
  }
  if (id === 'hell') {
    // Reuse the proven wall/arch/door geometry and generate original Hell material art.
    return A.packs[id] || (A.packs[id] = loadPack('catacombs').then((base) =>
      (A.packs[id] = generateHellPack(base))).catch((e) => { delete A.packs[id]; throw e; }));
  }
  if (id === 'ice_temple') {
    // Ice Temple material/prop atlas, preserving exact Catacombs geometry and depth slices.
    return A.packs[id] || (A.packs[id] = loadPack('catacombs').then((base) =>
      (A.packs[id] = generateIceTemplePack(base))).catch((e) => { delete A.packs[id]; throw e; }));
  }
  if (id === 'desert_temple') {
    // New art is built once from the already-supported isometric mask/slice geometry.
    // All 60 floor cells, 40 temple props and sandstone/relief textures are generated
    // as original Canvas art; geometry and door animation remain battle-tested.
    return A.packs[id] || (A.packs[id] = loadPack('catacombs').then((base) =>
      (A.packs[id] = generateDesertTemplePack(base))).catch((e) => { delete A.packs[id]; throw e; }));
  }
  return A.packs[id] || (A.packs[id] = Promise.all(['floors', 'walls', 'scatter'].map((n) => loadImage(`assets/tiles/${id}/${n}.webp`)).concat(loadJSON(`assets/tiles/${id}/pack.json`)))
    .then(([floors, walls, scatter, meta]) => (A.packs[id] = { floors, walls, scatter, meta })).catch((e) => { delete A.packs[id]; throw e; }));
}
const ready = (v) => v && !(v instanceof Promise);

// Materialize only the currently used expanded packs: the original wall atlas
// is several MB, and retaining one full transformed atlas per 32 biomes would
// blow past iOS Safari's Canvas memory budget.
const EXPANSION_ORDER=[];
async function expandedPack(biome) {
  if (!biome || biome.overworld || biome.id === 'town') return;
  const id='expanded_'+biome.id;
  const previous=A.packs[id];
  if(previous) {
    const i=EXPANSION_ORDER.indexOf(id);
    if(i>=0)EXPANSION_ORDER.splice(i,1);
    EXPANSION_ORDER.push(id);
    return await previous;
  }
  const promise=loadPack(biome.pack || DEFAULT_PACK).then(base=>expandBiomePack(base,biome))
    .then(pack=>{
      A.packs[id]=pack;
      while(EXPANSION_ORDER.length>2){
        const old=EXPANSION_ORDER.shift();
        if(old===id)continue;
        delete A.packs[old];
        for(const key of Object.keys(A.biomeSets))
          if(key.endsWith('|'+old))delete A.biomeSets[key];
      }
      return pack;
    }).catch(e=>{delete A.packs[id];throw e;});
  A.packs[id]=promise;
  EXPANSION_ORDER.push(id);
  return await promise;
}
/** Fetch a biome's pack and the monster art. Safe to call repeatedly. */
export function loadBiomeArt(biome) {
  return Promise.all([
    loadEnemyArt().catch((e) => console.warn(e)), // monsters fall back to their pixel sprites
    biome && !biome.overworld && biome.id !== 'town' ? expandedPack(biome) : loadPack(biome.pack || DEFAULT_PACK),
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
 * - arches[design][dir] = slices {a (tiles along the span), ox, oy}; archSpan[design] = outer span in tiles (3, 5, 7); doors[design][dir].closed|open = slices
 *   {part:'L'|'R'|'leaf', du, dv (depth anchor, tiles from the doorway centre), ox, oy}
 * - scatter [{name, ox, oy, fp (footprint in tiles), block}], chest {closed, open, rareClosed, rareOpen}
 */
export function biomeTileSet(biome) {
  const ext='expanded_'+biome.id;
  const id = ready(A.packs[ext]) ? ext :
    ready(A.packs[biome.pack || DEFAULT_PACK]) ? biome.pack || DEFAULT_PACK : DEFAULT_PACK;
  const key = biome.id + '|' + id;
  if (A.biomeSets[key]) return A.biomeSets[key];
  // keep memory bounded: each recoloured set is ~25 MB of canvas
  const keys = Object.keys(A.biomeSets).filter((k) => !k.startsWith('town|'));
  while (keys.length >= 2) delete A.biomeSets[keys.shift()]; // a mixed level holds two sets
  // The expanded atlas is already tinted and sculpted for THIS biome;
  // applying its old blanket palette again would flatten the new pigments.
  const pk=A.packs[id],m=pk.meta,pal=m.expansion?null:biome.palette,
    wallPal=m.expansion?null:(biome.wallPalette||pal);
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
  set.families=Object.keys(set.walls);
  if(m.expansion){
    set.bases=set.bases.filter(i=>i>=m.expansion.floorStart);
    set.features=set.features.filter(i=>i>=m.expansion.floorStart);
  }
  set.archSpan = {};
  for (const [des, dirs] of Object.entries(m.arches)) {
    set.archSpan[des] = (m.archSpan && m.archSpan[des]) || 3;
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
  const part = biome.part;
  if (part) {
    const inR = (rs, i) => rs.some(([a, b]) => i + 1 >= a && i + 1 <= b);
    set.bases=set.bases.filter(i=>(m.expansion&&i>=m.expansion.floorStart)||inR(part.floors,i));
    set.features=set.features.filter(i=>(m.expansion&&i>=m.expansion.floorStart)||inR(part.floors,i));
    set.scatter=set.scatter.filter((s,i)=>(m.expansion&&i>=m.expansion.scatterStart)||inR(part.scatter,i));
    set.families = set.families.filter((f) => part.families.includes(f));
    for (const k of ['arches', 'doors']) for (const d of Object.keys(set[k])) if (!part[k].includes(d)) delete set[k][d];
  }
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
