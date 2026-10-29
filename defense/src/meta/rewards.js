// Free things for showing up: a 7-day login calendar, an hourly bounty that fills while you're away, daily quests
// and one-time achievements. Everything pays in gold, Soul Shards and summon tickets; nothing is sold.
import { RNG } from '../core/util.js';
import { today } from './gacha.js';
import { REGIONS } from '../data/campaign.js';

export const LOGIN = [
  { shards: 100, label: '100 Shards', icon: '◆' }, { gold: 1500, label: '1,500 Gold', icon: '◉' }, { tickets: { hero: 1 }, label: 'Hero Ticket', icon: '🎟' },
  { shards: 150, label: '150 Shards', icon: '◆' }, { gold: 4000, label: '4,000 Gold', icon: '◉' }, { packs: { armory: 1, forge: 1 }, label: '2 Gear Packs', icon: '🂠' },
  { shards: 300, tickets: { legend: 1 }, label: 'Legend Ticket + 300', icon: '★' },
];
export const HOURLY_CAP = 12;
export const hourlyRate = (save) => { const reg = Math.min(7, Math.floor((save.frontier - 1) / 10)); return { gold: 80 + 45 * reg, shards: 6 + reg }; };

export function loginReady(save) { return save.daily.last !== today(); }
export function claimLogin(save) {
  if (!loginReady(save)) return null;
  const r = LOGIN[save.daily.day % 7];
  save.daily.last = today(); save.daily.day++;
  give(save, r);
  return r;
}
export function hourlyReady(save, now = Date.now()) {
  const h = Math.min(HOURLY_CAP, (now - save.hourly.last) / 3600000), rate = hourlyRate(save);
  return { hours: h, gold: Math.floor(rate.gold * h), shards: Math.floor(rate.shards * h) };
}
export function claimHourly(save, now = Date.now()) {
  const r = hourlyReady(save, now);
  if (r.hours < 1 / 6) return null;
  save.hourly.last = now; save.gold += r.gold; save.shards += r.shards;
  return r;
}

const QUEST_POOL = [
  { id: 'win', text: 'Win {n} battles', stat: 'wins', n: 3, shards: 40, gold: 600 },
  { id: 'kills', text: 'Defeat {n} monsters', stat: 'kills', n: 400, shards: 40, gold: 800 },
  { id: 'deploys', text: 'Deploy heroes {n} times', stat: 'deploys', n: 25, shards: 30, gold: 500 },
  { id: 'skills', text: 'Unleash {n} hero skills', stat: 'skills', n: 30, shards: 30, gold: 500 },
  { id: 'empower', text: 'Empower heroes {n} times in battle', stat: 'empowers', n: 12, shards: 30, gold: 500 },
  { id: 'stars', text: 'Win {n} battles with 3 stars', stat: 'perfects', n: 2, shards: 50, gold: 700 },
  { id: 'packs', text: 'Open {n} packs', stat: 'packs', n: 1, shards: 25, gold: 400 },
  { id: 'levels', text: 'Level up heroes {n} times', stat: 'levelups', n: 10, shards: 35, gold: 300 },
];
/** Today's four quests (rolled once a day), with progress measured from the day's starting stats. */
export function quests(save) {
  if (save.quests.date !== today()) {
    const rng = new RNG('q:' + today()), pool = rng.shuffle(QUEST_POOL.slice()).slice(0, 4);
    save.quests = { date: today(), list: pool.map((q) => ({ id: q.id, base: save.stats[q.stat] || 0, claimed: false })) };
  }
  return save.quests.list.map((q) => { const d = QUEST_POOL.find((x) => x.id === q.id), p = Math.min(d.n, (save.stats[d.stat] || 0) - q.base); return { ...d, ...q, prog: p, done: p >= d.n, text: d.text.replace('{n}', d.n) }; });
}
export function claimQuest(save, id) {
  const q = quests(save).find((x) => x.id === id), raw = save.quests.list.find((x) => x.id === id);
  if (!q || !q.done || raw.claimed) return null;
  raw.claimed = true; save.shards += q.shards; save.gold += q.gold;
  return q;
}

export const ACHIEVEMENTS = [
  ...[5, 10, 20, 30, 40, 50, 60, 70, 80].map((n) => ({ id: 'clear' + n, text: `Clear stage ${n}` + (n % 10 === 0 ? ` (${REGIONS[n / 10 - 1].name})` : ''), test: (s) => s.frontier > n, shards: 80 + n * 4, tickets: n % 20 === 0 ? { hero: 2 } : null })),
  ...[100, 250, 500, 750, 1000].map((w) => ({ id: 'wave' + w, text: `Survive wave ${w} of 1,000`, test: (s) => s.stats.bestWave >= w, shards: Math.round(w * 0.5), tickets: w === 1000 ? { legend: 3 } : { hero: 1 } })),
  ...[10, 30, 60, 80].map((n) => ({ id: 'perfect' + n, text: `Earn 3 stars on ${n} stages`, test: (s) => Object.values(s.progress).filter((p) => p.stars >= 3).length >= n, shards: n * 5 })),
  ...[8, 16, 32, 64].map((n) => ({ id: 'heroes' + n, text: `Have ${n} heroes`, test: (s) => Object.keys(s.cards).filter((k) => k.startsWith('h:') && s.cards[k].n > 0).length >= n, shards: n * 6, tickets: n === 64 ? { legend: 2 } : null })),
  ...[50, 150, 400].map((n) => ({ id: 'cards' + n, text: `Collect ${n} different cards`, test: (s) => s.stats.cards >= n, shards: n })),
  ...[25, 100, 300].map((n) => ({ id: 'wins' + n, text: `Win ${n} battles`, test: (s) => s.stats.wins >= n, shards: n })),
];
export const achievementReady = (save) => ACHIEVEMENTS.filter((a) => !save.achieved[a.id] && a.test(save));
export function claimAchievement(save, id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || save.achieved[id] || !a.test(save)) return null;
  save.achieved[id] = true; give(save, { shards: a.shards, tickets: a.tickets });
  return a;
}

export function give(save, r) {
  if (r.shards) save.shards += r.shards;
  if (r.gold) save.gold += r.gold;
  for (const [k, v] of Object.entries(r.tickets || {})) save.tickets[k] = (save.tickets[k] || 0) + v;
  for (const [k, v] of Object.entries(r.packs || {})) { save.freePacks ||= {}; save.freePacks[k] = (save.freePacks[k] || 0) + v; }
}
