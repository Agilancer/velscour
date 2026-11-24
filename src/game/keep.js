// TESSARIEL'S KEEP (docs/TESSARIELS_KEEP.md): the rules. The counters the quests read (keepEvent and its helpers, called
// from combat, the level flow, loot, the vendors), the Sagas, the daily Bounties and the Challenges, the rewards waiting
// at the Castellan (Embers, Renown, gold, trophies, decorations), the Ember trade, the weekly Vault of the Flame, the
// Sacred Flame's blessing and the War Table's expeditions. State: G.char.keep (saved with the hero; migrate() fills it).
import { G } from '../state.js';
import { pick, fmtInt, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import {
  METRICS, ABS, SAGAS, SAGA_BY_ID, sagaReward, BOUNTIES, BOUNTY_REWARD, BOUNTIES_A_DAY, CHALLENGES, TROPHY_BY_ID, DECOR,
  defaultDecor, renownRank, renownBonus, TRADE, TRADE_SLOTS, VAULT_STEPS, VAULT_MYTHIC, KINDLE, EXPEDITIONS, EMBER_COLOR,
} from '../data/keep.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { depthLevel, MAX_LEVEL, isRaidDepth } from '../data/depth.js';
import { rollItem, rarityAt, RARITY, itemName, itemColor, goldPile, rollGem } from '../data/items.js';

const DAY = 86400000, WEEK = DAY * 7;
export const today = (t = Date.now()) => Math.floor(t / DAY);
export const thisWeek = (t = Date.now()) => Math.floor((t - 4 * DAY) / WEEK);   // weeks turn on Monday (UTC)

/** The hero's keep record, made (or filled in) on first use. */
export function keepState(c = G.char) {
  if (!c) return null;
  const k = c.keep || (c.keep = {});
  k.v ||= 1;
  k.embers ??= 0; k.renown ??= 0; k.st ||= {}; k.rec ||= {}; k.sagas ||= {}; k.done ||= {}; k.owed ||= [];
  k.bounty ||= { day: -1, list: [] };
  k.vault ||= { week: -1, marks: 0, claimed: false, offer: null };
  k.have ||= { banner: [], glass: [], rug: [], trophy: [] };
  k.decor ||= defaultDecor();
  for (const [kind, n] of [['banner', 14], ['glass', 10], ['rug', 3], ['pedestal', 16]]) {
    if (!Array.isArray(k.decor[kind])) k.decor[kind] = defaultDecor()[kind];
    while (k.decor[kind].length < n) k.decor[kind].push(defaultDecor()[kind][k.decor[kind].length]);
  }
  k.exp ||= [];
  return k;
}

// ------------------------------------------------------------------ metrics
/** A metric's value now: an absolute one off the save, a counter off the keep. */
export function metricValue(c, m) {
  const k = keepState(c);
  switch (m) {
    case 'level': return c.level || 1;
    case 'deepest': return c.deepest || 0;
    case 'breachBest': return c.breach?.best || 0;
    case 'riftBest': return c.rifts?.best || 0;
    case 'kills': return c.kills || 0;
    case 'unboundWins': return c.unbound?.wins || 0;
    case 'heresyRank': return 0;
    default: return k.st[m] || 0;
  }
}
const isAbs = (q) => q.abs || ABS.has(q.m);

/** Add n to counter m (and any per-biome / per-region form of it), then see what that finished. */
export function keepEvent(m, n = 1, c = G.char) {
  if (!c || !n) return;
  const k = keepState(c);
  k.st[m] = (k.st[m] || 0) + n;
  checkProgress(c, m);
}
function bumpMany(c, list) {
  const k = keepState(c);
  for (const [m, n] of list) if (n) k.st[m] = (k.st[m] || 0) + n;
  for (const [m] of list) checkProgress(c, m);
}

// ------------------------------------------------------------------ hooks the game calls
const live = (w) => !!w && !G.cine && !(G.world?.keepTest);
/** A monster slain (combat.js). */
export function keepKill(world, m) {
  const c = G.char;
  if (!c || !live(world) || m.team !== 'enemy' || m.summon || m.critter) return;
  const list = [['kill', 1]];
  if (m.rank === 'champion' || m.rank === 'unique') list.push(['elite', 1]);
  if (m.rank === 'unique') list.push(['unique', 1]);
  if (m.rank === 'boss') list.push(['guardian', 1]);
  if (m.rank === 'raid') list.push(['raid', 1]);
  if (m.isVelscour) list.push(['velscour', 1]);
  bumpMany(c, list);
}
/** A level the hero just won (game.brokeThrough): a depth cleared, an overworld trial won; its time and potions. */
export function keepClear(world) {
  const c = G.char;
  if (!c || !world || world.keepCleared || world.kind !== 'dungeon' || world.breach || world.rift) return;
  world.keepCleared = true;
  const b = world.biome?.id, t = world.time || 0, pots = world.keepPotions || 0, k = keepState(c);
  const list = [['clear', 1]];
  if (b) list.push(['clear:' + b, 1]);
  if (world.biome?.overworld || world.overworldScenario || world.sky || world.seaRun) { list.push(['region', 1]); if (b) list.push(['region:' + b, 1]); }
  const raid = isRaidDepth(world.depth) && !world.biome?.overworld;
  if (raid) list.push(['clearBoss', 1]);
  if (!pots) list.push(['cleanClear', 1]);
  if (t > 0 && t < 90) list.push(['fastClear', 1]);
  if (t > 0 && t < 45) list.push(['blitzClear', 1]);
  if (raid && t > 0 && t < 120) list.push(['raidFast', 1]);
  if (raid && !pots) list.push(['raidClean', 1]);
  if (world.heresy && world.heresy.rank > 0) list.push(['heresyClear', 1]);
  // records for the Chronicle
  if (t > 0) {
    const R = k.rec;
    if (!R.clear || t < R.clear.t) R.clear = { t: Math.round(t * 10) / 10, depth: world.depth, biome: b };
    if (raid && (!R.raid || t < R.raid.t)) R.raid = { t: Math.round(t * 10) / 10, depth: world.depth, biome: b };
    if (world.biome?.overworld && (!R.region || t < R.region.t)) R.region = { t: Math.round(t * 10) / 10, depth: world.depth, biome: b };
  }
  bumpMany(c, list);
}
export function keepBreach(floor) { const c = G.char; if (!c) return; keepEvent('breach', 1); const R = keepState(c).rec; R.breach = Math.max(R.breach || 0, floor); }
export function keepRift(tier, time) {
  const c = G.char; if (!c) return;
  keepEvent('rift', 1);
  const R = keepState(c).rec;
  if (!R.rift || tier > R.rift.tier || (tier === R.rift.tier && time < R.rift.t)) R.rift = { tier, t: Math.round(time * 10) / 10 };
}
export function keepGold(n) { if (n > 0 && G.char) keepEvent('gold', Math.round(n)); }
export function keepItem(it) {
  if (!it || it.type !== 'gear' || !G.char) return;
  const list = [];
  if (it.rarity >= 3) list.push(['epic', 1]);
  if (it.rarity >= 4) list.push(['legendary', 1]);
  if (it.rarity >= 5) list.push(['mythic', 1]);
  if (list.length) bumpMany(G.char, list);
}
export function keepPotion() { const w = G.world; if (w && w.kind === 'dungeon') w.keepPotions = (w.keepPotions || 0) + 1; keepEvent('potion', 1); }
export function keepSocket() { keepEvent('socket', 1); }
export function keepUpgrade() { keepEvent('upgrade', 1); }
export function keepDeath() { keepEvent('death', 1); }

// ------------------------------------------------------------------ Sagas
/** The Sagas the hero may take (deep enough), and where each stands. */
export function sagaList(c = G.char) {
  const k = keepState(c), deep = c.deepest || 0;
  return SAGAS.map((s) => {
    const st = k.sagas[s.id];
    return { saga: s, open: deep >= s.min, taken: !!st, ch: st ? st.ch : 0, done: !!st && st.ch >= s.ch.length };
  });
}
export function takeSaga(id, c = G.char) {
  const s = SAGA_BY_ID[id], k = keepState(c);
  if (!s || k.sagas[id] || (c.deepest || 0) < s.min) return false;
  k.sagas[id] = { ch: 0, base: snapshot(c, s.ch[0]) };
  checkSaga(c, s);
  return true;
}
const snapshot = (c, q) => (q && !isAbs(q) ? metricValue(c, q.m) : 0);
/** A quest's progress: [have, need]. */
export function progressOf(c, q, base) {
  const v = metricValue(c, q.m), have = isAbs(q) ? v : v - (base || 0);
  return [Math.max(0, Math.min(q.n, have)), q.n];
}
function checkSaga(c, s) {
  const k = keepState(c), st = k.sagas[s.id];
  let moved = false;
  while (st && st.ch < s.ch.length) {
    const q = s.ch[st.ch], [have, need] = progressOf(c, q, st.base);
    if (have < need) break;
    const last = st.ch === s.ch.length - 1, r = sagaReward(st.ch, last);
    owe(c, { kind: 'saga', id: `${s.id}#${st.ch}`, name: `${s.name}: chapter ${st.ch + 1}`, text: q.text, ...r, trophy: q.trophy, decor: q.decor, color: s.color });
    st.ch++;
    st.base = snapshot(c, s.ch[st.ch]);
    moved = true;
  }
  return moved;
}

// ------------------------------------------------------------------ Bounties
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** The bounties a hero can do: breach and rifts once open, the dungeons and trials every hero can reach. */
function bountyPool(c) {
  return BOUNTIES.filter((b) => (b.m !== 'breach' || (c.deepest || 0) >= 20) && (b.m !== 'rift' || (c.rifts?.best || 0) > 0 || (c.deepest || 0) >= 500)
    && (b.m !== 'region:great_hunt' || (c.level || 1) >= 10) && (b.m !== 'raid' || (c.deepest || 0) >= 4));
}
/** Scale a bounty's count to the hero: gold by their level, the rest as written. */
function bountyN(c, b) {
  if (b.m === 'gold') return Math.round(goldPile(Math.max(1, c.level)) * 40 / 10) * 10;
  return b.n;
}
/** Today's board (rolled once a day per hero; finished ones stay ticked). */
export function bountyBoard(c = G.char) {
  const k = keepState(c), d = today();
  if (k.bounty.day !== d) {
    const pool = bountyPool(c), list = [];
    let h = hash(c.id + ':' + d);
    while (list.length < Math.min(BOUNTIES_A_DAY, pool.length)) {
      h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
      const b = pool[h % pool.length];
      if (list.some((e) => e.id === b.id) || (b.m.includes(':') && list.some((e) => e.m.includes(':')))) continue;
      list.push({ id: b.id, m: b.m, n: bountyN(c, b), base: metricValue(c, b.m), done: false });
    }
    k.bounty = { day: d, list };
  }
  return k.bounty.list;
}
export function bountyText(b) {
  const B = BOUNTIES.find((q) => q.id === b.id);
  const biome = b.m.startsWith('clear:') ? BIOME_BY_ID[b.m.slice(6)]?.name || b.m.slice(6) : '';
  return (B ? B.text : '').replace('{n}', fmtInt(b.n)).replace('{biome}', biome);
}
function checkBounties(c, m) {
  const k = keepState(c);
  if (k.bounty.day !== today()) return;
  for (const b of k.bounty.list) {
    if (b.done || (m && b.m !== m)) continue;
    if (metricValue(c, b.m) - b.base >= b.n) {
      b.done = true;
      owe(c, { kind: 'bounty', id: `${b.id}@${k.bounty.day}`, name: 'Bounty', text: bountyText(b), ...BOUNTY_REWARD });
    }
  }
}

// ------------------------------------------------------------------ Challenges
const biomeName = (id) => BIOME_BY_ID[id]?.name || id;
export const challengeName = (q) => q.name.replace('{biome}', biomeName(q.m.split(':')[1]));
export const challengeText = (q) => q.text.replace(/\{biome\}/g, biomeName(q.m.split(':')[1]));
function checkChallenges(c, m) {
  const k = keepState(c);
  for (const q of CHALLENGES) {
    if ((m && q.m !== m) || k.done[q.id]) continue;
    if (metricValue(c, q.m) >= q.n) {
      k.done[q.id] = Date.now();
      owe(c, { kind: 'challenge', id: q.id, name: challengeName(q), text: challengeText(q), embers: q.embers, renown: q.renown, trophy: q.trophy, decor: q.decor });
    }
  }
}

/** Everything a counter might have finished (or everything, with no m: arriving at the keep, a new board). */
export function checkProgress(c = G.char, m = null) {
  if (!c) return;
  const k = keepState(c);
  for (const s of SAGAS) { const st = k.sagas[s.id]; if (st && st.ch < s.ch.length && (!m || s.ch[st.ch].m === m)) checkSaga(c, s); }
  checkBounties(c, m);
  checkChallenges(c, m);
}

// ------------------------------------------------------------------ rewards owed (claimed at the Castellan)
function owe(c, r) {
  const k = keepState(c);
  if (k.owed.some((o) => o.id === r.id)) return;
  k.owed.push(r);
  const w = G.world;
  if (G.ui && w && !w.keepTest) {
    const where = w.keep ? 'Claim it from the Castellan.' : `The Castellan holds your reward in <b style="color:${EMBER_COLOR}">Tessariel's Keep</b>.`;
    G.ui.log(`<b style="color:${r.color || EMBER_COLOR}">${r.kind === 'challenge' ? 'Deed done' : r.kind === 'bounty' ? 'Bounty done' : 'Saga'}:</b> ${escapeHtml(r.name)}. ${where}`, '#e8f0c0');
  }
  if (G.player && w && !w.keepTest) sfx('levelup', 0.25);
}
/** Gold a reward pays: its weight times a pile at the hero's level. */
const rewardGold = (c, g) => Math.round(goldPile(Math.max(1, c.level || 1)) * 8 * (g || 0));
/** Hand over every reward the hero is owed; returns a list of what was given (for the panel and the log). */
export function claimAll(c = G.char) {
  const k = keepState(c), got = [];
  if (!k.owed.length) return got;
  let embers = 0, renown = 0, gold = 0;
  for (const r of k.owed) {
    embers += r.embers || 0; renown += r.renown || 0; gold += rewardGold(c, r.gold);
    if (r.trophy && !k.have.trophy.includes(r.trophy)) { k.have.trophy.push(r.trophy); got.push({ trophy: r.trophy }); autoPlaceTrophy(c, r.trophy); }
    if (r.decor) { const [kind, id] = r.decor; if (!k.have[kind].includes(id)) { k.have[kind].push(id); got.push({ decor: r.decor }); } }
    const v = k.vault; if (v.week !== thisWeek()) Object.assign(v, { week: thisWeek(), marks: 0, claimed: false, offer: null });
    v.marks++;
  }
  const before = renownRank(k.renown);
  k.embers += embers; k.renown += renown; c.gold += gold;
  got.unshift({ embers, renown, gold, n: k.owed.length, rankUp: renownRank(k.renown) > before ? renownRank(k.renown) : 0 });
  k.owed.length = 0;
  if (G.player) G.player.recompute();
  return got;
}
/** A new trophy goes onto the first empty pedestal (the Elders onto their own plinths, always). */
function autoPlaceTrophy(c, id) {
  const T = TROPHY_BY_ID[id], k = keepState(c);
  if (!T || T.plinth) return;
  const i = k.decor.pedestal.indexOf(null);
  if (i >= 0 && !k.decor.pedestal.includes(id)) k.decor.pedestal[i] = id;
}
/** Is decoration (kind, id) the hero's to hang? */
export function hasDecor(c, kind, id) {
  const L = DECOR[kind], d = L && L.find((x) => x.id === id);
  return !!d && (d.free || keepState(c).have[kind].includes(id));
}
export function setDecor(kind, slot, id, c = G.char) {
  const k = keepState(c);
  if (kind === 'pedestal') {
    if (id && !k.have.trophy.includes(id)) return false;
    if (id) { const j = k.decor.pedestal.indexOf(id); if (j >= 0) k.decor.pedestal[j] = null; }
    k.decor.pedestal[slot] = id || null;
    return true;
  }
  if (!hasDecor(c, kind, id) || !k.decor[kind] || slot < 0 || slot >= k.decor[kind].length) return false;
  k.decor[kind][slot] = id;
  return true;
}

// ------------------------------------------------------------------ Renown and the Flame's blessing
export const renownOf = (c = G.char) => renownRank(keepState(c)?.renown || 0);
export const kindled = (c = G.char) => !!c?.keep?.kindled && c.keep.kindled.until > Date.now();
export function kindleReadyIn(c = G.char) { const t = c?.keep?.kindled?.at || 0; return Math.max(0, t + KINDLE.cooldownMin * 60000 - Date.now()); }
export function kindle(c = G.char) {
  const k = keepState(c);
  if (kindleReadyIn(c) > 0) return false;
  k.kindled = { at: Date.now(), until: Date.now() + KINDLE.minutes * 60000 };
  if (G.player) G.player.recompute();
  return true;
}
/** What the keep adds to the hero's stats (Player.recompute): Renown always, the blessing while it burns. */
export function keepBonuses(c = G.char) {
  if (!c || !c.keep) return { gf: 0, mf: 0, xp: 0 };
  const b = renownBonus(renownRank(c.keep.renown || 0));
  if (kindled(c)) { b.gf += KINDLE.gf; b.mf += KINDLE.mf; b.xp += KINDLE.xp; }
  return b;
}

// ------------------------------------------------------------------ the Ember trade
/** The item level the Castellan's smiths work at: the hero's own (never past where their deepest depth drops). */
export function tradeLevel(c = G.char) {
  return Math.max(1, Math.min(c.level || 1, depthLevel(Math.max(1, c.deepest || 1)) + 2, MAX_LEVEL + 20));
}
/** Buy armour (rarity of TRADE[i], slot) for Embers: the item, or null. */
/** Can the smiths forge TRADE[i] yet? A rarity opens at the item level it opens at in the deep (data/items.js). */
export const tradeOpen = (i, c = G.char) => !!TRADE[i] && rarityAt(tradeLevel(c), TRADE[i].rarity) === TRADE[i].rarity;
export function buyArmor(i, slot, c = G.char, addToBag = null) {
  const T = TRADE[i], k = keepState(c);
  if (!T || !TRADE_SLOTS.includes(slot) || k.embers < T.cost || !tradeOpen(i, c)) return null;
  const il = tradeLevel(c);
  let rar = rarityAt(il, T.rarity);
  if (T.mythic && rar === 4 && rarityAt(il, 5) === 5 && Math.random() < T.mythic) rar = 5;
  const it = rollItem(il, { slot, rarity: rar });
  if (addToBag && !addToBag(c, it)) return null;
  k.embers -= T.cost;
  return it;
}

// ------------------------------------------------------------------ the Vault of the Flame (weekly)
export function vaultState(c = G.char) {
  const v = keepState(c).vault;
  if (v.week !== thisWeek()) Object.assign(v, { week: thisWeek(), marks: 0, claimed: false, offer: null });
  const picks = VAULT_STEPS.filter((s) => v.marks >= s).length;
  return { ...v, picks, next: VAULT_STEPS.find((s) => v.marks < s) || null };
}
/** The week's offer (rolled once, when first opened with a choice earned): Legendary gear of the hero's level. */
export function vaultOffer(c = G.char) {
  const v = keepState(c).vault, s = vaultState(c);
  if (!s.picks || v.claimed) return [];
  v.offer ||= [];
  const il = tradeLevel(c) + 2;
  while (v.offer.length < s.picks) {
    let rar = rarityAt(il, 4);
    if (rar === 4 && rarityAt(il, 5) === 5 && Math.random() < VAULT_MYTHIC) rar = 5;
    const slot = pick(['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'feet', 'ring']);
    v.offer.push(rollItem(il, { slot, rarity: rar }));
  }
  return v.offer;
}
export function claimVault(i, c = G.char, addToBag = null) {
  const v = keepState(c).vault, offer = vaultOffer(c), it = offer[i];
  if (!it || v.claimed || (addToBag && !addToBag(c, it))) return null;
  v.claimed = true; v.offer = null;
  return it;
}

// ------------------------------------------------------------------ the War Table (your other heroes' errands)
/** The current hero's companions: every other class's newest hero (save.js heroesByClass), passed in. */
export function expeditionsOf(c = G.char) { return keepState(c).exp; }
export function sendExpedition(heroCls, heroLevel, expId, c = G.char) {
  const k = keepState(c), E = EXPEDITIONS.find((e) => e.id === expId);
  if (!E || heroLevel < E.lvl || k.exp.some((e) => e.cls === heroCls)) return false;
  k.exp.push({ cls: heroCls, id: expId, start: Date.now(), end: Date.now() + E.min * 60000, lvl: heroLevel });
  return true;
}
export const expeditionDone = (e) => Date.now() >= e.end;
/** Bring a finished expedition home: its Embers, gold (at the companion's level) and gems. */
export function collectExpedition(cls, c = G.char, addToBag = null) {
  const k = keepState(c), i = k.exp.findIndex((e) => e.cls === cls && expeditionDone(e));
  if (i < 0) return null;
  const e = k.exp[i], E = EXPEDITIONS.find((q) => q.id === e.id);
  k.exp.splice(i, 1);
  if (!E) return null;
  const lv = Math.max(1, Math.min(e.lvl, c.level || 1) || 1), gold = Math.round(goldPile(lv) * E.gold);
  k.embers += E.embers; c.gold += gold;
  const gems = [];
  for (let g = 0; g < E.gems; g++) { const gem = rollGem(lv); if (!addToBag || addToBag(c, gem)) gems.push(gem); }
  return { embers: E.embers, gold, gems, name: E.name };
}

/** One line for the Quest Log / HUD: rewards waiting, and the first Saga chapter in hand. */
export function keepLogLine(c = G.char) {
  const k = keepState(c);
  if (!k) return '';
  const owed = k.owed.length, s = SAGAS.find((q) => k.sagas[q.id] && k.sagas[q.id].ch < q.ch.length);
  let h = '';
  if (owed) h += `<b style="color:${EMBER_COLOR}">${owed} reward${owed > 1 ? 's' : ''}</b> wait${owed > 1 ? '' : 's'} at the Castellan in Tessariel's Keep. `;
  if (s) { const st = k.sagas[s.id], q = s.ch[st.ch], [have, need] = progressOf(c, q, st.base); h += `<span style="color:${s.color}">${escapeHtml(s.name)}</span>: ${escapeHtml(q.text)} <b>${fmtInt(have)}/${fmtInt(need)}</b>`; }
  return h;
}
export { METRICS };
