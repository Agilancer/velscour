// LocalStorage persistence for heroes.
import { CLASSES } from '../data/classes.js';
import { rollItem } from '../data/items.js';
import { drawBiome } from '../data/biomes.js';

const KEY = 'velscour_saves_v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
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

export function newCharData(classId, name) {
  const C = CLASSES[classId];
  const c = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    version: 1, name, classId, level: 1, xp: 0,
    attrs: { ...C.base }, statPoints: 0, skillPoints: 1,
    skills: {}, granted: {}, bar: Array(10).fill(null),
    equip: { weapon: null, offhand: null, head: null, body: null, hands: null, legs: null, feet: null },
    bag: Array(60).fill(null),
    gold: 150, potions: { hp: 6, mp: 4, rejuv: 1, fury: 1 },
    depth: 1, deepest: 0, nextBiome: null, biomeBag: [], cleared: {},
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
  if (!Array.isArray(c.biomeBag)) c.biomeBag = [];
  // heroes made before the shuffle bag always started in the catacombs: give an unexplored hero a random start
  if (c.nextBiome === 'catacombs' && !c.deepest && !c.lastBiome) c.nextBiome = drawBiome(c, c.depth || 1);
  if (!Array.isArray(c.bar) || c.bar.length !== 10) c.bar = Array(10).fill(null);
  while (c.bag.length < 60) c.bag.push(null);
  return c;
}
