// The Reliquary: a vault in Herrington Hollow shared by every hero on this browser (six tabs of 96 slots, two open
// at first), and its Codex of every Heirloom, Covenant piece, Glyphword and Sigil any hero has found. It lives in its
// own localStorage key, beside the heroes' saves (game/save.js), so deleting a hero keeps the collection.
// Tabs open by collecting (25% and 80% of the Codex) and by Town Commission lines finished (1 and 3; game/commissions.js).
import { G } from '../state.js';
import { GEMS, SIGILS, itemName, itemColor } from '../data/items.js';
import { codexKey, CODEX_TOTAL, HEIRLOOMS, GLYPHWORDS, PIECE_BY_ID } from '../data/relics.js';

const KEY = 'velscour_reliquary_v1';
export const VAULT_TABS = 6, VAULT_SIZE = 96;
export const MILESTONES = [
  { pct: 25, text: 'Vault III opens' },
  { pct: 40, text: '+3% Magic Find for every hero', mf: 3 },
  { pct: 60, text: '+5% Magic Find for every hero (in all)', mf: 5 },
  { pct: 80, text: 'Vault VI opens' },
  { pct: 100, text: 'The title "Keeper of Relics" and a golden aura', title: 'Keeper of Relics' },
];
let R = null;

function blank() { return { tabs: Array.from({ length: VAULT_TABS }, () => Array(VAULT_SIZE).fill(null)), codex: {}, lines: 0 }; }
/** The shared Reliquary (loaded once). */
export function reliquary() {
  if (R) return R;
  try { R = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { R = null; }
  if (!R || !Array.isArray(R.tabs)) R = blank();
  while (R.tabs.length < VAULT_TABS) R.tabs.push([]);
  for (const t of R.tabs) while (t.length < VAULT_SIZE) t.push(null);
  R.codex = R.codex || {};
  R.lines = R.lines || 0;
  return R;
}
export function saveReliquary() { try { localStorage.setItem(KEY, JSON.stringify(reliquary())); } catch (e) { /* storage full or blocked: the vault lives on for this visit */ } }
/** Tests: forget the cached copy (the next call reads localStorage again). */
export function resetReliquaryCache() { R = null; }

/** Codex progress: {by: {h, c, g, s}, have, total, pct}. */
export function codexProgress() {
  const r = reliquary(), by = { h: 0, c: 0, g: 0, s: 0 };
  for (const k of Object.keys(r.codex)) if (by[k[0]] !== undefined) by[k[0]]++;
  const total = CODEX_TOTAL.h + CODEX_TOTAL.c + CODEX_TOTAL.g + CODEX_TOTAL.s;
  const have = by.h + by.c + by.g + by.s;
  return { by, have, total, pct: Math.floor((have / total) * 100) };
}
/** How many vault tabs are open. */
export function openTabs() {
  const pct = codexProgress().pct, lines = reliquary().lines;
  return 2 + (pct >= 25) + (lines >= 1) + (lines >= 3) + (pct >= 80);
}
/** Magic find every hero gets from the Codex. */
export function codexMf() { const pct = codexProgress().pct; return pct >= 60 ? 5 : pct >= 40 ? 3 : 0; }
export function codexTitle() { return codexProgress().pct >= 100 ? 'Keeper of Relics' : null; }

/** The codex key of anything collectable (relics, and Sigils by rank). */
export function findKey(it) {
  if (!it) return null;
  if (it.type === 'gem' && GEMS[it.gem] && GEMS[it.gem].sigil) return 's:' + it.tier;
  return codexKey(it);
}
/** Record a find in the Codex; true when it's new (with a log line and any milestone it reached). */
export function noteFind(it) {
  const k = findKey(it);
  if (!k) return false;
  const r = reliquary();
  if (r.codex[k]) return false;
  const before = codexProgress().pct, tabs = openTabs();
  r.codex[k] = Date.now();
  saveReliquary();
  const after = codexProgress();
  if (G.ui && G.ui.log) {
    G.ui.log(`New in the Codex: <span style="color:${itemColor(it)}">${itemName(it)}</span> <span class="dim">(${after.have}/${after.total})</span>`, '#e8d8a0');
    for (const m of MILESTONES) if (before < m.pct && after.pct >= m.pct) G.ui.log(`<b style="color:#ffe2a0">Codex ${m.pct}%:</b> ${m.text}.`, '#ffe2a0');
    if (openTabs() > tabs) G.ui.log('A new vault opens in the Reliquary.', '#ffe2a0');
  }
  if (G.player && codexMf() !== (G.player.codexMf || 0)) G.player.recompute();
  return true;
}
/** A Town Commission line finished (by any hero): may open a vault. */
export function noteLineDone() {
  const r = reliquary(), tabs = openTabs();
  r.lines++;
  saveReliquary();
  if (openTabs() > tabs && G.ui && G.ui.log) G.ui.log('A new vault opens in the Reliquary.', '#ffe2a0');
}
/** Every collectable entry for the Codex page: [{key, kind, name, slot}]. */
export function codexEntries() {
  return [
    ...HEIRLOOMS.map((h) => ({ key: 'h:' + h.id, kind: 'h', name: h.name, slot: h.slot })),
    ...Object.values(PIECE_BY_ID).map((p) => ({ key: 'c:' + p.id, kind: 'c', name: p.name, slot: p.slot, set: p.set })),
    ...GLYPHWORDS.map((g) => ({ key: 'g:' + g.id, kind: 'g', name: g.name, slot: g.slots[0], sig: g.sig, slots: g.slots })),
    ...SIGILS.map((s, i) => ({ key: 's:' + i, kind: 's', name: s.name + ' Sigil', rank: i })),
  ];
}
/** Put an item in the first free slot of an open vault tab (gems stack). */
export function addToVault(it, tab = null) {
  const r = reliquary(), n = openTabs();
  const order = tab != null ? [tab] : [...Array(n).keys()];
  if (it.type === 'gem') for (const t of order) { const same = r.tabs[t].find((b) => b && b.type === 'gem' && b.gem === it.gem && b.tier === it.tier); if (same) { same.count = (same.count || 1) + (it.count || 1); saveReliquary(); return true; } }
  for (const t of order) {
    if (t >= n) continue;
    const i = r.tabs[t].findIndex((b) => !b);
    if (i >= 0) { r.tabs[t][i] = it; saveReliquary(); return true; }
  }
  return false;
}
