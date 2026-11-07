// Storage expansions:
// - Hero's Bag: 10 slots a row, 6 rows to start, up to 6 more bought with gold (5k..160k).
// - Dedicated Gem Bag, Stash, Jewel Box, and Reliquary: expanded with Infernal Marks.
import { marksFree, deductMarks } from '../game/marks.js';
import { reliquary, saveReliquary } from '../game/reliquary.js';

// --- BAG (HERO'S INVENTORY) ---
export const BAG_COLS = 10, BAG_ROWS = 6;
export const BAG_ROW_COST = [5000, 10000, 20000, 40000, 80000, 160000]; // rows 7..12
export const BAG_MAX_ROWS = BAG_ROWS + BAG_ROW_COST.length;

export function bagRows(c) {
  if (!c || !Array.isArray(c.bag)) return BAG_ROWS;
  return Math.max(BAG_ROWS, Math.ceil(c.bag.length / BAG_COLS));
}

/** Gold for the next row, or 0 when the bag is as big as it gets. */
export function nextRowCost(c) {
  return BAG_ROW_COST[bagRows(c) - BAG_ROWS] || 0;
}

/** Buy the next row if there is one and the gold is there. */
export function buyBagRow(c) {
  if (!c || !Array.isArray(c.bag)) return false;
  const cost = nextRowCost(c);
  if (!cost || c.gold < cost) return false;
  c.gold -= cost;
  for (let i = 0; i < BAG_COLS; i++) c.bag.push(null);
  return true;
}

/** Saves: a full grid of at least 6 rows, never more than 12 (empty slots past that are dropped). */
export function fixBag(c) {
  if (!c) return;
  if (!Array.isArray(c.bag)) c.bag = [];
  while (c.bag.length < BAG_COLS * BAG_ROWS || c.bag.length % BAG_COLS) c.bag.push(null);
  while (c.bag.length > BAG_COLS * BAG_MAX_ROWS && c.bag[c.bag.length - 1] === null) c.bag.pop();
}

export const BAG_ROW_MARK_COST = 10;
export function nextBagRowCost(c) { return nextRowCost(c); }
export function canBuyBagRow(c) { return !!c && nextRowCost(c) > 0 && c.gold >= nextRowCost(c); }

// --- GEM BAG (HERO'S GEM CARRIER) ---
export const GEM_BAG_COLS = 10, GEM_BAG_BASE_ROWS = 3, GEM_BAG_MAX_ROWS = 8;
export const GEM_BAG_ROW_MARK_COST = 5;

export function gemBagRows(c) {
  if (!c || !Array.isArray(c.gemBag)) return GEM_BAG_BASE_ROWS;
  return Math.max(GEM_BAG_BASE_ROWS, Math.ceil(c.gemBag.length / GEM_BAG_COLS));
}

export function nextGemBagRowCost(c) {
  return gemBagRows(c) < GEM_BAG_MAX_ROWS ? GEM_BAG_ROW_MARK_COST : 0;
}

export function canBuyGemBagRow(c) {
  return gemBagRows(c) < GEM_BAG_MAX_ROWS && marksFree() >= GEM_BAG_ROW_MARK_COST;
}

export function buyGemBagRow(c) {
  if (!c) return false;
  if (!Array.isArray(c.gemBag)) c.gemBag = Array(GEM_BAG_COLS * GEM_BAG_BASE_ROWS).fill(null);
  if (gemBagRows(c) >= GEM_BAG_MAX_ROWS) return false;
  if (!deductMarks(GEM_BAG_ROW_MARK_COST)) return false;
  for (let i = 0; i < GEM_BAG_COLS; i++) c.gemBag.push(null);
  return true;
}

export function fixGemBag(c) {
  if (!c) return;
  if (!Array.isArray(c.gemBag)) c.gemBag = [];
  while (c.gemBag.length < GEM_BAG_COLS * GEM_BAG_BASE_ROWS || c.gemBag.length % GEM_BAG_COLS) c.gemBag.push(null);
  while (c.gemBag.length > GEM_BAG_COLS * GEM_BAG_MAX_ROWS && c.gemBag[c.gemBag.length - 1] === null) c.gemBag.pop();
}

// --- STASH (TOWN STORAGE CHEST) ---
export const STASH_COLS = 10, STASH_BASE_ROWS = 30, STASH_MAX_ROWS = 60;
export const STASH_ROW_MARK_COST = 10;

export function stashRows(c) {
  if (!c || !Array.isArray(c.stash)) return STASH_BASE_ROWS;
  return Math.max(STASH_BASE_ROWS, Math.ceil(c.stash.length / STASH_COLS));
}

export function nextStashRowCost(c) {
  return stashRows(c) < STASH_MAX_ROWS ? STASH_ROW_MARK_COST : 0;
}

export function canBuyStashRow(c) {
  return stashRows(c) < STASH_MAX_ROWS && marksFree() >= STASH_ROW_MARK_COST;
}

export function buyStashRow(c) {
  if (!c) return false;
  if (!Array.isArray(c.stash)) c.stash = Array(STASH_COLS * STASH_BASE_ROWS).fill(null);
  if (stashRows(c) >= STASH_MAX_ROWS) return false;
  if (!deductMarks(STASH_ROW_MARK_COST)) return false;
  for (let i = 0; i < STASH_COLS; i++) c.stash.push(null);
  return true;
}

export function fixStash(c) {
  if (!c) return;
  if (!Array.isArray(c.stash)) c.stash = [];
  while (c.stash.length < STASH_COLS * STASH_BASE_ROWS || c.stash.length % STASH_COLS) c.stash.push(null);
  while (c.stash.length > STASH_COLS * STASH_MAX_ROWS && c.stash[c.stash.length - 1] === null) c.stash.pop();
}

// --- JEWEL BOX (TOWN GEM & RUNES VAULT) ---
export const JEWEL_BOX_COLS = 10, JEWEL_BOX_BASE_ROWS = 30, JEWEL_BOX_MAX_ROWS = 60;
export const JEWEL_BOX_ROW_MARK_COST = 5;

export function jewelBoxRows(c) {
  if (!c || !Array.isArray(c.jewelBox)) return JEWEL_BOX_BASE_ROWS;
  return Math.max(JEWEL_BOX_BASE_ROWS, Math.ceil(c.jewelBox.length / JEWEL_BOX_COLS));
}

export function nextJewelBoxRowCost(c) {
  return jewelBoxRows(c) < JEWEL_BOX_MAX_ROWS ? JEWEL_BOX_ROW_MARK_COST : 0;
}

export function canBuyJewelBoxRow(c) {
  return jewelBoxRows(c) < JEWEL_BOX_MAX_ROWS && marksFree() >= JEWEL_BOX_ROW_MARK_COST;
}

export function buyJewelBoxRow(c) {
  if (!c) return false;
  if (!Array.isArray(c.jewelBox)) c.jewelBox = Array(JEWEL_BOX_COLS * JEWEL_BOX_BASE_ROWS).fill(null);
  if (jewelBoxRows(c) >= JEWEL_BOX_MAX_ROWS) return false;
  if (!deductMarks(JEWEL_BOX_ROW_MARK_COST)) return false;
  for (let i = 0; i < JEWEL_BOX_COLS; i++) c.jewelBox.push(null);
  return true;
}

export function fixJewelBox(c) {
  if (!c) return;
  if (!Array.isArray(c.jewelBox)) c.jewelBox = [];
  while (c.jewelBox.length < JEWEL_BOX_COLS * JEWEL_BOX_BASE_ROWS || c.jewelBox.length % JEWEL_BOX_COLS) c.jewelBox.push(null);
  while (c.jewelBox.length > JEWEL_BOX_COLS * JEWEL_BOX_MAX_ROWS && c.jewelBox[c.jewelBox.length - 1] === null) c.jewelBox.pop();
}

// --- RELIQUARY (ACCOUNT-WIDE VAULT) ---
export const RELIQUARY_COLS = 12, RELIQUARY_BASE_ROWS = 8, RELIQUARY_MAX_ROWS = 16;
export const RELIQUARY_ROW_MARK_COST = 10;

export function reliquaryTabRows(tabIdx) {
  const r = reliquary();
  const t = r.tabs[tabIdx] || [];
  return Math.max(RELIQUARY_BASE_ROWS, Math.ceil(t.length / RELIQUARY_COLS));
}

export function nextReliquaryRowCost(tabIdx) {
  return reliquaryTabRows(tabIdx) < RELIQUARY_MAX_ROWS ? RELIQUARY_ROW_MARK_COST : 0;
}

export function canBuyReliquaryRow(tabIdx) {
  return reliquaryTabRows(tabIdx) < RELIQUARY_MAX_ROWS && marksFree() >= RELIQUARY_ROW_MARK_COST;
}

export function buyReliquaryRow(tabIdx) {
  const r = reliquary();
  if (!r.tabs[tabIdx]) return false;
  if (reliquaryTabRows(tabIdx) >= RELIQUARY_MAX_ROWS) return false;
  if (!deductMarks(RELIQUARY_ROW_MARK_COST)) return false;
  for (let i = 0; i < RELIQUARY_COLS; i++) r.tabs[tabIdx].push(null);
  saveReliquary();
  return true;
}

export function fixReliquary(r) {
  if (!r || !Array.isArray(r.tabs)) return;
  for (const t of r.tabs) {
    while (t.length < RELIQUARY_COLS * RELIQUARY_BASE_ROWS || t.length % RELIQUARY_COLS) t.push(null);
    while (t.length > RELIQUARY_COLS * RELIQUARY_MAX_ROWS && t[t.length - 1] === null) t.pop();
  }
}
