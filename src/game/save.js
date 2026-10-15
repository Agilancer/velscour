// LocalStorage persistence for heroes.
import { CLASSES } from '../data/classes.js';
import { rollItem } from '../data/items.js';
import { drawBiome } from '../data/biomes.js';
import { migrateBar, BAR_SIZE } from '../data/bar.js';

const KEY = 'velscour_saves_v1';

function readAll() {
  let list;
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  return Array.isArray(list) ? list : [];
}
function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { console.warn('Save failed', e); return false; }
}

export function listSaves() {
  return readAll().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
}
export function writeSave(char) {
  char.lastPlayed = Date.now();
  const list = readAll().filter((c) => c.id !== char.id);
  list.push(char);
  return writeAll(list);
}
export function deleteSave(id) { writeAll(readAll().filter((c) => c.id !== id)); }
/** One hero per class: classId -> that class's most recently played hero. (Older saves may hold several heroes of a
 * class; the newest one is the class's hero, and deleting it deletes them all.) */
export function heroesByClass() {
  const out = {};
  for (const c of listSaves()) if (!out[c.classId]) out[c.classId] = c;
  return out;
}
export function deleteClassSaves(classId) { writeAll(readAll().filter((c) => c.classId !== classId)); }

export function newCharData(classId, name) {
  const C = CLASSES[classId];
  const c = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    version: 1, name, classId, level: 1, xp: 0,
    attrs: { ...C.base }, statPoints: 0, skillPoints: 1,
    skills: {}, granted: {}, bar: Array(BAR_SIZE).fill(null),
    equip: { weapon: null, offhand: null, head: null, body: null, hands: null, legs: null, feet: null, ring1: null, ring2: null, ring3: null, ring4: null },
    mastery: {}, townSeed: (Math.random() * 1e9) | 0,
    bag: Array(60).fill(null),
    stash: Array(300).fill(null),
    gold: 150, potions: { hp: 6, mp: 4, rejuv: 1, fury: 1 },
    depth: 1, deepest: 0, nextBiome: null, biomeBag: [], cleared: {}, overworldMisses: 0, overworldLastVisit: null,
    kills: 0, deaths: 0, created: Date.now(), lastPlayed: Date.now(), tips: {},
  };
  c.equip.weapon = rollItem(1, { slot: 'weapon', base: C.weapon, rarity: 0 });
  c.equip.weapon.affixes = c.equip.weapon.affixes.filter((a) => a.implicit);
  if (C.offhand) { c.equip.offhand = rollItem(1, { slot: 'offhand', base: C.offhand, rarity: 0 }); }
  c.equip.body = rollItem(1, { slot: 'body', rarity: 0 });
  c.equip.body.affixes = [];
  c.equip.weapon.sockets = 1;
  c.nextBiome = drawBiome(c, 1); // the first descent is a random biome too
  return c;
}

/** Fill in fields added by later versions. */
export function migrate(c) {
  c.potions = Object.assign({ hp: 0, mp: 0, rejuv: 0, fury: 0 }, c.potions);
  c.cleared = c.cleared || {};
  c.granted = c.granted || {};
  c.tips = c.tips || {};
  c.mastery = c.mastery || {}; // skill mastery: {skillId: [level 1-1000, xp]}
  for (const s of ['ring1', 'ring2', 'ring3', 'ring4']) if (!(s in c.equip)) c.equip[s] = null;
  if (c.townSeed === undefined) c.townSeed = (Math.random() * 1e9) | 0;
  if (!Array.isArray(c.biomeBag)) c.biomeBag = [];
  if (!Number.isInteger(c.overworldMisses)) c.overworldMisses = 0;
  c.overworldMisses = Math.max(0, Math.min(6, c.overworldMisses));
  if (!('overworldLastVisit' in c)) c.overworldLastVisit = c.lastBiome ? String(c.depth) + ':' + c.lastBiome : null;
  // heroes made before the shuffle bag always started in the catacombs: give an unexplored hero a random start
  if (c.nextBiome === 'catacombs' && !c.deepest && !c.lastBiome) c.nextBiome = drawBiome(c, c.depth || 1);
  c.bar = migrateBar(c.bar); // 10 slots (LMB, 1-8, RMB) -> 15 (LMB, ` 1-9 0 - =, RMB)
  while (c.bag.length < 60) c.bag.push(null);
  if (!Array.isArray(c.stash)) c.stash = [];
  while (c.stash.length < 300) c.stash.push(null);
  // body armor and helmets of the first Paladin art pack: their look now comes from the gear art
  for (const it of [...Object.values(c.equip), ...c.bag]) if (it && it.art && (it.slot === 'body' || it.slot === 'head')) { delete it.art; delete it.artCls; }
  return c;
}
