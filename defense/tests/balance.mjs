// The difficulty curve, measured: a simulated Commander plays the campaign from a fresh save with battle auto-play and
// the auto-pilot's character upgrades, and (like a player would) claims the free rewards, opens packs with the
// shards it earns and buys Bastion Works. Prints, per stage, how many tries the first win took. No browser.
//   node defense/tests/balance.mjs [maxStage=80] [maxBattles=1500] [battlesPerDay=30]
import './node_env.mjs';
import { freshSave } from '../src/state.js';
import { startStage, finishStage } from '../src/meta/progress.js';
import { STEP } from '../src/battle/sim.js';
import { autoBattle } from '../src/battle/autoplay.js';
import { pickSquad, upgradeCharacters, nextStage } from '../src/meta/autopilot.js';
import { PACKS, openPack, canOpen } from '../src/meta/gacha.js';
import { LOGIN, hourlyRate, give } from '../src/meta/rewards.js';
import { RESEARCH, researchCost, buyResearch } from '../src/meta/research.js';
import { LEVELS } from '../src/data/campaign.js';
import { unitDef } from '../src/meta/power.js';
import { RNG } from '../src/core/util.js';
const rng = new RNG('balance');

const [maxStage = 80, maxBattles = 1500, perDay = 30] = process.argv.slice(2).map(Number);
const save = freshSave();
const firstWin = {}, tries = {};
let fails = 0, day = 0, t0 = Date.now();
const dt = STEP * 2;

function playerDay() { // what a day of logging in brings, then the player's own spending
  give(save, LOGIN[day % 7]); day++;
  const r = hourlyRate(save); save.gold += r.gold * 12; save.shards += r.shards * 12;
  save.shards += 150; save.gold += 2600;                                      // four daily quests, roughly
  openPack(save, PACKS.find((p) => p.daily), false, rng);
}
function playerSpend() {
  // shards: hero summons first (ten at a time when it can), then gear packs
  for (let g = 0; g < 50; g++) {
    const p = canOpen(save, PACKS[0], true) ? [PACKS[0], true] : canOpen(save, PACKS[0]) ? [PACKS[0], false]
      : save.shards >= 400 ? [PACKS[1 + (g % 3)], false] : null;
    if (!p || !openPack(save, p[0], p[1], rng)) break;
  }
  // a third of the gold on the Bastion Works, cheapest first
  let budget = save.gold * 0.33;
  for (let g = 0; g < 40; g++) {
    const k = Object.keys(RESEARCH).filter((k) => (save.research[k] || 0) < RESEARCH[k].max).sort((a, b) => researchCost(a, save.research[a] || 0) - researchCost(b, save.research[b] || 0))[0];
    if (!k || researchCost(k, save.research[k] || 0) > budget) break;
    budget -= researchCost(k, save.research[k] || 0); buyResearch(save, k);
  }
}

let battles = 0;
while (battles < maxBattles && save.frontier <= maxStage) {
  if (battles > 0 && battles % perDay === 0) playerDay();   // a day of logins, quests and bounty, after a day of battles
  playerSpend();
  pickSquad(save); upgradeCharacters(save);
  const n = nextStage(save, fails), b = startStage(save, n);
  let steps = 0;
  while (!b.done && steps < 60 * 60 * 25) { autoBattle(b, dt); b.step(dt); b.events.length = 0; steps++; }
  const res = finishStage(save, n, b);
  battles++;
  tries[n] = (tries[n] || 0) + 1;
  if (n === save.frontier - 1 && res.unlocked) { firstWin[n] = { tries: tries[n], battle: battles, stars: b.stars, heart: `${b.heart}/${b.heartMax}`, t: Math.round(b.t) }; fails = 0; }
  else if (!b.won && n >= save.frontier) fails++;
  else if (b.won) fails = 0;
  if (!b.won && n >= save.frontier) { const d = firstWin[n] || {}; d.lastLoss = `${b.kills}/${b.total + b.splits} wave ${b.waveI}/${b.waves.length}`; firstWin[n] = { ...d, pending: true }; }
}
const lvls = save.squad.map((id) => save.cards['h:' + id]).map((e) => e.lvl);
console.log(`${battles} battles, ${day} days, frontier ${save.frontier}, ${((Date.now() - t0) / 1000).toFixed(0)}s real`);
console.log('stage  tries  battle#  stars  heart  secs');
for (let n = 1; n <= Math.min(80, save.frontier); n++) {
  const f = firstWin[n];
  if (!f) continue;
  console.log(String(n).padStart(5), String(f.tries ?? tries[n]).padStart(6), String(f.battle ?? '-').padStart(8), String(f.stars ?? '-').padStart(6), String(f.heart ?? '-').padStart(6), String(f.t ?? '-').padStart(5), f.pending ? 'PENDING ' + f.lastLoss : '', LEVELS[n - 1].boss ? 'BOSS' : '');
}
console.log('squad levels', lvls.join(','), 'stars', save.squad.map((id) => save.cards['h:' + id].stars).join(','), 'power', save.squad.map((id) => unitDef(id, save).power).join(','));
console.log('gold', save.gold, 'shards', save.shards, 'research', JSON.stringify(save.research), 'heroes', Object.keys(save.cards).filter((k) => k.startsWith('h:')).length, 'cards', Object.keys(save.cards).length);
