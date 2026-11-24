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
if (Object.keys(k.sagas).length !== D.SAGAS.filter((s) => s.min <= 0 && !s.minLevel).length) fail('took the wrong Sagas at depth 0');
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
  h.deepest = d; h.level = Math.min(100, Math.round(d * 0.2 + 1 + (d > 100 ? d * 0.1 : 0)));
  K.keepLevel(h);
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

// ---- the veteran: weeks of play behind them (level cap, depth 1,400, millions slain, every endgame door open, all 19
// classes made), then three more weeks of playing all day. What the keep hands them on the first visit, what a day is
// worth after that, and that nothing in it out-earns playing.
{
  const { MAX_LEVEL, depthLevel } = await import('../../src/data/depth.js');
  for (const q of D.CHALLENGES) if (q.m === 'level' && q.n > MAX_LEVEL) fail(`deed ${q.id} asks for level ${q.n}, past the cap of ${MAX_LEVEL}`);
  const v = G.char = { ...fresh(), level: MAX_LEVEL, deepest: 1400, kills: 4200000, gold: 1e12, breach: { best: 62 }, rifts: { best: 140 }, unbound: { wins: 24 } };
  const vk = K.keepState(v);
  // their life so far, as the counters would have it had the keep stood from the start
  Object.assign(vk.st, { kill: 4200000, elite: 160000, unique: 30000, guardian: 9000, raid: 2600, clear: 14000, clearBoss: 2600, region: 900, breach: 700, rift: 500, heresyClear: 800,
    gold: 1e12, epic: 20000, legendary: 2500, mythic: 220, potion: 9000, socket: 900, upgrade: 700, cleanClear: 5000, fastClear: 7000, blitzClear: 2500, raidFast: 1500, raidClean: 900, velscour: 30 });
  for (const b of D.DUNGEON_IDS) vk.st['clear:' + b] = 400;
  for (const r of D.REGION_IDS) vk.st['region:' + r] = 60;
  // a veteran whose save is older than the keep has only the absolute numbers: what does the door pay them?
  const old = G.char = { ...fresh(), level: MAX_LEVEL, deepest: 1400, kills: 4200000, breach: { best: 62 }, rifts: { best: 140 }, unbound: { wins: 24 } };
  K.checkProgress(old); const door = K.claimAll(old)[0];
  console.log(`a veteran's first step in (a save older than the keep): ${door.n} deeds, ${door.embers} Embers, Renown ${D.renownRank(K.keepState(old).renown)}`);
  if (door.embers > 1500) fail(`the door pays a veteran ${door.embers} Embers at once`);
  G.char = v;
  for (const s of K.sagaList(v)) if (s.open) K.takeSaga(s.saga.id, v);
  K.checkProgress(v); const first = K.claimAll(v)[0];
  console.log(`every deed there is, done: ${first.n} deeds, ${first.embers} Embers, Renown ${D.renownRank(vk.renown)} (cap ${D.RENOWN_MAX})`);
  if (K.tradeLevel(v) !== Math.min(depthLevel(1400), MAX_LEVEL + 20)) fail(`a veteran's trade level is ${K.tradeLevel(v)}, not what their depth drops`);
  const piece = K.buyArmor(2, 'body', (vk.embers = 150, v)); if (!piece || piece.ilvl !== K.tradeLevel(v)) fail('the veteran\'s Legendary is not their trade level');
  if (K.vaultOffer((vk.vault.marks = 12, v)).some((it) => it.ilvl > MAX_LEVEL + 20)) fail('the Vault forges above what the deep drops');
  // the Long Watch pays nothing for the past
  if (vk.owed.length) fail('the Long Watch paid for the past');
  // a day of playing all day (16 h): ~20 depths an hour with their lords, a trial now and then, or Rifts all day
  const day = (rifts) => {
    const e0 = vk.embers; vk.embers = 0;
    for (let hr = 0; hr < 16; hr++) {
      if (rifts) K.keepEvent('rift', 7); else { K.keepEvent('clear', 20); K.keepEvent('raid', 4); K.keepEvent('kill', 2400); K.keepEvent('region', 1); }
    }
    const g = K.claimAll(v)[0], watch = g ? g.embers : 0; vk.embers = e0;
    return watch;
  };
  for (let d = 0; d < 40; d++) { day(false); day(true); }   // the Sagas they took up late run out first: what is left is the steady day
  const delve = day(false), rift = day(true), bounties = D.BOUNTIES_A_DAY * D.BOUNTY_REWARD.embers;
  // the War Table worked as hard as it can be: every seat, the best errand by the hour, collected the minute it ends
  const seats = D.warSeats(D.renownRank(vk.renown));
  const perHour = Math.max(...D.EXPEDITIONS.map((E) => E.embers * 60 / E.min)), idle = seats * 3 * D.EXPEDITIONS.at(-1).embers;
  const war = Math.min(D.WAR_EMBERS_A_DAY, Math.round(seats * perHour * 24));
  const total = Math.max(delve, rift) + bounties + war, L = D.TRADE[2].cost;
  console.log(`a veteran's day: the Long Watch ${delve} Embers delving (${rift} in Rifts), bounties ${bounties}, the War Table ${Math.min(idle, D.WAR_EMBERS_A_DAY)} left alone / ${war} at most (${seats} seats) = ${total} Embers: ${(total / L).toFixed(1)} Legendary rolls, a Mythic every ${(L / total / D.TRADE[2].mythic).toFixed(1)} days; three weeks: ${total * 21} Embers`);
  if (war > D.WAR_EMBERS_A_DAY || war > 3 * bounties) fail(`the War Table out-earns the board: ${war} a day`);
  if (Math.max(delve, rift) < 60 || Math.max(delve, rift) > 200) fail(`the Long Watch pays ${Math.max(delve, rift)} Embers a day of play (60-200 wanted)`);
  if (total / L > 2.5) fail(`a veteran forges ${(total / L).toFixed(1)} Legendaries a day`);
  if (war >= Math.max(delve, rift)) fail('the War Table pays more than playing all day');
  // the table's rules: seats, the daily cap
  const sent = ['wizard', 'ranger', 'monk', 'bard', 'rogue', 'ninja', 'gunner', 'lancer'].filter((cls) => K.sendExpedition(cls, 100, 'vigil', v)).length;
  if (sent !== seats) fail(`sent ${sent} heroes with ${seats} seats`);
  for (const e of vk.exp) e.end = 0;
  vk.war = { day: K.today(), embers: D.WAR_EMBERS_A_DAY - 5 };
  const e1 = vk.embers; K.collectExpedition(vk.exp[0].cls, v); K.collectExpedition(vk.exp[0].cls, v);
  if (vk.embers - e1 !== 5) fail(`the War Table's daily cap let ${vk.embers - e1} Embers through with 5 left`);
  // feeding the Flame
  vk.kindled = { at: Date.now(), until: Date.now() - 1 }; vk.embers = D.KINDLE.rekindle - 1;
  if (K.kindle(v, true)) fail('rekindled without the Embers');
  vk.embers = D.KINDLE.rekindle; if (!K.kindle(v, true) || vk.embers !== 0) fail('feeding the Flame did not rekindle it');
}

// ---- what the quest critic found (round 1): farming far beneath the hero, the board that never rolled, places the
// hero's act does not reach, the practice fight, the gap between the March and the Long Watch
{
  const { MAX_LEVEL } = await import('../../src/data/depth.js');
  const v = G.char = { ...fresh(), level: MAX_LEVEL, deepest: 900, kills: 0 }, vk = K.keepState(v);
  K.checkProgress(v); K.claimAll(v);
  const low = { depth: 5, kind: 'dungeon', biome: { id: 'catacombs' }, time: 30 }, deep = { depth: 890, kind: 'dungeon', biome: { id: 'molten' }, time: 30 };
  if (K.keepWorthy(low, v)) fail('Depth 5 counts for a level 100 hero at Depth 900');
  if (!K.keepWorthy(deep, v)) fail('a depth near the hero\'s deepest does not count');
  const c0 = vk.st.clear || 0; K.keepClear(low); K.keepKill(low, { team: 'enemy', rank: 'raid' });
  if ((vk.st.clear || 0) !== c0 || vk.st.raid) fail('a trivial depth fed the keep\'s counters');
  K.keepClear(deep); if ((vk.st.clear || 0) !== c0 + 1) fail('a worthy depth did not count');
  if (K.keepWorthy({ depth: 890, practice: true }, v)) fail('a practice fight counts');
  const lowHero = { ...fresh(), level: 9, deepest: 8 };
  if (!K.keepWorthy({ depth: 3 }, lowHero)) fail('a new hero replaying Depth 3 does not count');
  // the board rolls itself
  G.char = lowHero; const lk = K.keepState(lowHero);
  K.keepEvent('kill', 1, lowHero);
  if (lk.bounty.day !== K.today() || lk.bounty.list.length !== 3) fail('the board did not roll without its page being opened');
  // a low hero's board asks only for places their act deals (40 heroes' boards)
  for (let i = 0; i < 40; i++) { const h = { ...fresh(), level: 9, deepest: 8 }; for (const b of K.bountyBoard(h)) if (b.m.includes(':') && K.actOf(b.m) !== 1) fail(`an Act 1 hero's board asks for ${b.m}`); }
  if (!K.chapterHint(lowHero, { m: 'clear:cathedral' }) || K.chapterHint(lowHero, { m: 'clear:catacombs' })) fail('chapter hints wrong');
  // Saints of the Deep: its chapters in the order of the acts
  const acts = D.SAGA_BY_ID.saints_deep.ch.filter((q) => q.m.includes(':')).map((q) => K.actOf(q.m));
  if (acts.some((a, i) => !a || (i && a < acts[i - 1]))) fail('Saints of the Deep is not in act order: ' + acts);
  // one of the March and the Long Watch always runs, never both
  for (const [lvl, dp] of [[1, 0], [50, 200], [100, 300], [80, 500], [100, 900]]) { const h = { level: lvl, deepest: dp }; if (K.watchOpen(h) === K.marchOpen(h)) fail(`March and Watch both or neither at level ${lvl}, depth ${dp}`); }
  // the Armsmaster's Sagas open by level
  if (K.sagaOpen(D.SAGA_BY_ID.veterans_ascent, { level: 59, deepest: 400 }) || !K.sagaOpen(D.SAGA_BY_ID.veterans_ascent, { level: 60, deepest: 0 })) fail('the Veteran\'s Ascent does not open at level 60');
  // every Saga has a giver in the hall
  const given = new Set([...D.CASTELLAN.sagas, ...D.KEEP_FOLK.flatMap((f) => f[4])]);
  for (const sg of D.SAGAS) if (!given.has(sg.id)) fail('no one in the hall gives ' + sg.id);
}
console.log(errs.length ? `${errs.length} FAILED` : 'NO ERRORS');
process.exit(errs.length ? 1 : 0);
