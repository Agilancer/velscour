// Tessariel's Keep's quests, no browser (docs/TESSARIELS_KEEP.md): the Sagas, Bounties and Deeds are sound (ids unique,
// every metric one the game counts, every trophy and decoration earnable, every trophy's art in the bake), the rules
// work on a save (chapters advance and pay, deeds pay once, the board rolls three a day, claims add Embers, Renown and
// Vault marks), and the economy holds: Embers a hero earns over a played-through game against the trade's prices.
//   node tools/tests/keep_quests.mjs
import { G } from '../../src/state.js';
import * as D from '../../src/data/keep.js';
import { TROPHY_ART_BY_ID } from '../../src/data/keepart.js';
import { BIOME_BY_ID } from '../../src/data/biomes.js';
import * as K from '../../src/game/keep.js';
import { tkeepLayout, keepSpots } from '../../src/world/tkeep.js';

const errs = [];
const fail = (m) => { errs.push(m); console.log('FAIL', m); };
const okMetric = (m) => m in D.METRICS || (m.startsWith('clear:') && BIOME_BY_ID[m.slice(6)]) || (m.startsWith('region:') && D.REGION_IDS.includes(m.slice(7)));

// ---- the data
const n = D.questCount(), total = n.sagas + n.bounties + n.challenges;
console.log(`quests: ${n.sagas} saga chapters in ${D.SAGAS.length} Sagas, ${n.bounties} bounties, ${n.challenges} deeds = ${total}`);
if (total < 300) fail('fewer than 300 quests and challenges: ' + total);
const ids = new Set();
for (const s of D.SAGAS) s.ch.forEach((q, k) => { if (!okMetric(q.m)) fail(`saga ${s.id}#${k}: metric ${q.m}`); if (!(q.n > 0)) fail(`saga ${s.id}#${k}: count`); if (!q.text) fail(`saga ${s.id}#${k}: text`); });
for (const b of D.BOUNTIES) { if (ids.has('b:' + b.id)) fail('bounty id twice ' + b.id); ids.add('b:' + b.id); if (!okMetric(b.m)) fail('bounty metric ' + b.m); }
for (const q of D.CHALLENGES) { if (ids.has(q.id)) fail('deed id twice ' + q.id); ids.add(q.id); if (!okMetric(q.m)) fail('deed metric ' + q.m); if (!(q.embers > 0)) fail('deed pays nothing ' + q.id); }
for (const T of D.TROPHIES) if (!TROPHY_ART_BY_ID[T.art]) fail('trophy without art ' + T.id);
const ts = D.trophySources(), ds = D.decorSources();
for (const T of D.TROPHIES) if (!ts[T.id]) fail('trophy no one can earn ' + T.id);
for (const [kind, L] of Object.entries(D.DECOR)) for (const d of L) if (!d.free && !ds[kind + ':' + d.id]) fail(`${kind} ${d.id} no one can earn`);
for (const [kind, id] of Object.values(D.SAGAS).flatMap((s) => s.ch.filter((c) => c.decor).map((c) => c.decor)).concat(D.CHALLENGES.filter((c) => c.decor).map((c) => c.decor)))
  if (!D.DECOR[kind].some((d) => d.id === id)) fail(`a reward hangs ${kind} ${id}, which isn't one`);
// the keep's layout: spots to walk, every anchor slot count the decor expects
const L = tkeepLayout(), A = L.anchors;
if (A.banners.length !== 14 || A.windows.length !== 10 || A.rugs.length !== 3 || A.pedestals.length !== 16 || A.plinths.length !== 4) fail('layout slot counts changed: update defaultDecor');
if (keepSpots(L).length < 300) fail('too few walkable spots: ' + keepSpots(L).length);

// ---- the rules on a save
const fresh = () => ({ id: 'qa' + Math.random(), name: 'QA', classId: 'paladin', level: 1, deepest: 0, kills: 0, gold: 0, breach: { best: 0 }, rifts: { best: 0 }, unbound: { wins: 0 } });
G.char = fresh();
const c = G.char, k = K.keepState(c);
for (const s of K.sagaList(c)) if (s.open) K.takeSaga(s.saga.id, c);
if (Object.keys(k.sagas).length !== D.SAGAS.filter((s) => s.min <= 0).length) fail('took the wrong Sagas at depth 0');
for (let i = 0; i < 39; i++) K.keepEvent('kill');
if (k.owed.some((o) => o.id === 'ember_road#0')) fail('chapter 1 paid at 39 of 40');
K.keepEvent('kill');
if (!k.owed.some((o) => o.id === 'ember_road#0')) fail('chapter 1 not paid at 40');
if (k.sagas.ember_road.ch !== 1) fail('saga did not move on');
const before = k.embers, got = K.claimAll(c);
if (!(k.embers > before) || k.owed.length) fail('claim did not pay');
if (k.vault.marks !== got[0].n) fail('vault marks not counted');
c.kills = 600; K.checkProgress(c);
if (!k.owed.some((o) => o.id === 'slay_1')) fail('Slayer I not done at 600 kills');
const owed = k.owed.length; K.checkProgress(c); if (k.owed.length !== owed) fail('a deed paid twice');
const board = K.bountyBoard(c);
if (board.length !== 3 || new Set(board.map((b) => b.id)).size !== 3) fail('the board is not three bounties');
if (K.bountyBoard(c) !== board) fail('the board rolled again the same day');
// the trade: a Legendary costs what it says and is the hero's level
c.level = 60; c.deepest = 120; k.embers = 1000;
const it = K.buyArmor(2, 'head', c);
if (!it || it.ilvl !== K.tradeLevel(c) || it.rarity < 4 || k.embers !== 1000 - D.TRADE[2].cost) fail('Legendary trade wrong: ' + JSON.stringify(it && { r: it.rarity, i: it.ilvl }));
c.level = 20; c.deepest = 12;
const low = K.buyArmor(2, 'head', c); if (low) fail('the smiths sold a Legendary below its item level');
if (!K.buyArmor(0, 'feet', c)) fail('a level 20 hero could not buy a Rare');
// Renown bonus and Kindled
k.renown = D.renownNeed(10); if (D.renownRank(k.renown) !== 10 || K.keepBonuses(c).gf !== 10) fail('Renown 10 bonus wrong');
K.kindle(c); if (K.keepBonuses(c).gf !== 10 + D.KINDLE.gf) fail('Kindled bonus wrong'); if (K.kindle(c)) fail('kindled twice in an hour');

// ---- the economy: a hero played from depth 1 to 500 and on, events in rough proportion to a real run
G.char = fresh();
const h = G.char, hk = K.keepState(h);
for (const s of K.sagaList(h)) if (s.open) K.takeSaga(s.saga.id, h);
let embers = 0, hours = 0, legendaryAt = null;
const steps = [];
for (let d = 1; d <= 600; d++) {
  h.deepest = d; h.level = Math.min(3000, Math.round(d * 0.2 + 1 + (d > 100 ? d * 0.1 : 0)));
  K.keepEvent('kill', 120); h.kills += 120; K.keepEvent('elite', 5); K.keepEvent('unique', 1); K.keepEvent('guardian', 1); K.keepEvent('gold', 80 * d);
  K.keepEvent('clear', 1); K.keepEvent('clear:' + D.DUNGEON_IDS[d % D.DUNGEON_IDS.length], 1);
  if (d % 5 === 0) { K.keepEvent('raid', 1); K.keepEvent('clearBoss', 1); if (d % 10 === 0) K.keepEvent('raidFast', 1); if (d % 15 === 0) K.keepEvent('raidClean', 1); }
  if (d % 7 === 0) { K.keepEvent('region', 1); K.keepEvent('region:' + D.REGION_IDS[d % D.REGION_IDS.length], 1); }
  if (d % 3 === 0) K.keepEvent('cleanClear', 1);
  if (d % 4 === 0) K.keepEvent('fastClear', 1);
  if (d % 20 === 0) { K.keepEvent('epic', 2); K.keepEvent('socket', 2); K.keepEvent('upgrade', 2); }
  if (d % 60 === 0) K.keepEvent('legendary', 1);
  if (d > 60 && d % 4 === 0) K.keepEvent('breach', 1);
  if (d === 500) K.keepEvent('velscour', 1);
  for (const s of K.sagaList(h)) if (s.open && !s.taken) K.takeSaga(s.saga.id, h);
  hours += 0.05;   // ~3 minutes a depth
  if (d % 20 === 0) hours += 0.15 * D.BOUNTIES_A_DAY / 3, (embers += D.BOUNTY_REWARD.embers);   // a bounty or so a session
  const g = K.claimAll(h)[0]; if (g) embers += g.embers;
  if (legendaryAt === null && embers >= D.TRADE[2].cost) legendaryAt = d;
  if (d % 100 === 0) steps.push(`depth ${d}: ${embers} Embers (~${Math.round(hours)} h), Renown ${D.renownRank(hk.renown)}, ${Object.keys(hk.done).length} deeds`);
}
console.log(steps.join('\n'));
const legendaries = Math.floor(embers / D.TRADE[2].cost);
console.log(`a played-through hero earns ${embers} Embers: ${legendaries} Legendary pieces at ${D.TRADE[2].cost}, the first at depth ${legendaryAt}; Renown ${D.renownRank(hk.renown)}`);
if (legendaries < 8 || legendaries > 60) fail(`the Ember economy is off: ${legendaries} Legendaries over a full game`);
console.log(errs.length ? `${errs.length} FAILED` : 'NO ERRORS');
process.exit(errs.length ? 1 : 0);
