// Fits the horde's health curve to a simulated Commander's growth: plays the campaign as if every battle were won
// (each stage once, plus a replay), spending like a player and like auto-play, and records the power of the heroes
// that would take the field at each stage. Writes defense/src/data/curve.js: the health multiplier at the start of
// each stage, so that (monsters x health) keeps pace with that power, rising a little faster toward the end.
//   node defense/tests/calibrate.mjs [K=1] [slope=0.7]
import { writeFileSync } from 'fs';
import './node_env.mjs';
import { freshSave } from '../src/state.js';
import { finishStage } from '../src/meta/progress.js';
import { pickSquad, upgradeCharacters } from '../src/meta/autopilot.js';
import { PACKS, openPack, canOpen } from '../src/meta/gacha.js';
import { LOGIN, hourlyRate, give } from '../src/meta/rewards.js';
import { RESEARCH, researchCost, buyResearch, researchBonus } from '../src/meta/research.js';
import { LEVELS } from '../src/data/campaign.js';
import { stageWaves, deployLimit } from '../src/data/waves.js';
import { unitDef } from '../src/meta/power.js';
import { RNG } from '../src/core/util.js';
import { TUNE } from '../src/data/waves.js';
import { startStage } from '../src/meta/progress.js';
import { STEP } from '../src/battle/sim.js';
import { autoBattle } from '../src/battle/autoplay.js';

const [K = 0.75, slope = 1] = process.argv.slice(2).map(Number);   // share of the margin at stage 1 and at stage 80
const save = freshSave(), rng = new RNG('calibrate');
let battles = 0, day = 0;
const PI = [];
const power = (n) => {
  const R = researchBonus(save), lim = deployLimit(n) + R.deploy;
  return save.squad.map((id) => unitDef(id, save).power).sort((a, b) => b - a).slice(0, lim).reduce((a, b) => a + b, 0);
};
function battle(n) {
  if (battles > 0 && battles % 30 === 0) {
    give(save, LOGIN[day % 7]); day++;
    const r = hourlyRate(save); save.gold += r.gold * 12; save.shards += r.shards * 12; save.shards += 150; save.gold += 2600;
    openPack(save, PACKS.find((p) => p.daily), false, rng);
  }
  for (let g = 0; g < 50; g++) {
    const p = canOpen(save, PACKS[0], true) ? [PACKS[0], true] : canOpen(save, PACKS[0]) ? [PACKS[0], false] : save.shards >= 400 ? [PACKS[1 + (g % 3)], false] : null;
    if (!p || !openPack(save, p[0], p[1], rng)) break;
  }
  let budget = save.gold * 0.33;
  for (let g = 0; g < 40; g++) {
    const k = Object.keys(RESEARCH).filter((k) => (save.research[k] || 0) < RESEARCH[k].max).sort((a, b) => researchCost(a, save.research[a] || 0) - researchCost(b, save.research[b] || 0))[0];
    if (!k || researchCost(k, save.research[k] || 0) > budget) break;
    budget -= researchCost(k, save.research[k] || 0); buyResearch(save, k);
  }
  pickSquad(save); upgradeCharacters(save);
  // the battle, as if won with three stars: kill gold as the sim pays it
  const W = stageWaves(n, 1), L = LEVELS[n - 1];
  let gold = 0, kills = 0;
  for (const w of W) for (const g of w.groups) { kills += g.count; gold += g.count * Math.round((g.role === 'boss' ? 80 : g.role === 'lieutenant' ? 30 : 2) * (1 + w.g / 40)); }
  finishStage(save, n, { won: true, stars: 3, pct: 1, gold, kills, total: kills, splits: 0, units: [], waveI: L.waves, waves: W });
  battles++;
}
// the margin: the biggest health multiplier the squad (with battle auto-play) still beats at stage n (worst of 2 seeds)
const margin = (n) => {
  let best = Infinity;
  for (const seed of ['a', 'b']) {
    let lo = 0.05, hi = 600;
    for (let it = 0; it < 9; it++) {
      const mid = Math.sqrt(lo * hi);
      TUNE.flat = mid; TUNE.terrain = 1;
      const b = startStage(save, n, { seed: 'cal:' + seed + n });
      let steps = 0;
      while (!b.done && steps < 60 * 60 * 30) { autoBattle(b, STEP * 2); b.step(STEP * 2); b.events.length = 0; steps++; }
      if (b.won && b.pct >= 0.9) lo = mid; else hi = mid;   // a solid win: 90% of the horde destroyed
    }
    best = Math.min(best, lo);
  }
  TUNE.flat = 0; TUNE.terrain = 0;
  return best;
};
const M = [];
for (let n = 1; n <= 80; n++) {
  pickSquad(save); upgradeCharacters(save);
  PI[n] = power(n); M[n] = margin(n);
  battle(n); battle(n);   // the first clear and one replay
}
// each stage's target: a share of its margin (K at stage 1 to `slope` at stage 80), easier at a region's start, building
// to its boss. The target splits into a smooth rising CURVE (every wave a little stronger) and a TERRAIN factor per
// stage that evens out how easy its map is.
const saw = (n) => (0.95 + 0.1 * ((n - 1) % 10) / 9) * (n % 10 === 0 ? 0.85 : n % 5 === 0 ? 0.93 : 1);
const tutorial = (n) => [0.5, 0.6, 0.7, 0.8, 0.85, 0.92][n - 1] ?? 1;   // the first stages: a fresh squad wins them
const T = LEVELS.map((L) => M[L.n] * (K + (slope - K) * (L.n - 1) / 79) * saw(L.n) * tutorial(L.n));
// least-squares fit of log T = a + b log(n) + c n, then forced to rise
const X = T.map((_, i) => [1, Math.log(i + 1), (i + 1) / 80]), Y = T.map((v) => Math.log(v));
const XtX = [0, 1, 2].map((r) => [0, 1, 2].map((c) => X.reduce((s, x) => s + x[r] * x[c], 0))), XtY = [0, 1, 2].map((r) => X.reduce((s, x, i) => s + x[r] * Y[i], 0));
const solve = (A, y) => { A = A.map((r, i) => [...r, y[i]]); for (let i = 0; i < 3; i++) { for (let j = i + 1; j < 3; j++) { const f = A[j][i] / A[i][i]; for (let k = i; k < 4; k++) A[j][k] -= f * A[i][k]; } } const x = [0, 0, 0]; for (let i = 2; i >= 0; i--) x[i] = (A[i][3] - A[i].slice(i + 1, 3).reduce((s, v, k) => s + v * x[i + 1 + k], 0)) / A[i][i]; return x; };
const [a, bb, c] = solve(XtX, XtY);
const sm = T.map((_, i) => Math.exp(a + bb * Math.log(i + 1) + c * (i + 1) / 80));
for (let i = 1; i < sm.length; i++) sm[i] = Math.max(sm[i], sm[i - 1] * 1.008);
const end = sm[79] * 1.02;
const terrain = T.map((v, i) => Math.pow(Math.min(2.2, Math.max(0.2, v / sm[i])), 0.7) * 0.96);   // damped: one sample per map is noisy
writeFileSync(new URL('../src/data/curve.js', import.meta.url),
  `// Generated by defense/tests/calibrate.mjs (share ${K} -> ${slope}): CURVE is the horde's health multiplier at the first wave
` +
  `// of each stage (waves.js eases between them, so every wave is a little stronger than the last); TERRAIN evens out
` +
  `// how easy each stage's map is, fitted to a simulated Commander's margin there.
` +
  `export const CURVE = [${sm.map((v) => v.toFixed(3)).join(', ')}, ${end.toFixed(3)}];
` +
  `export const TERRAIN = [${terrain.map((v) => v.toFixed(3)).join(', ')}];
`);
console.log('margin', M.filter(Boolean).map((v, i) => (i % 10 === 0 ? '\n' + (i + 1) + ': ' : '') + v.toFixed(1)).join(' '));
console.log('PI', PI.filter(Boolean).map((v, i) => (i % 10 === 0 ? '\n' + (i + 1) + ': ' : '') + Math.round(v)).join(' '));
console.log('terrain', terrain.map((v, i) => (i % 10 === 0 ? '\n' + (i + 1) + ': ' : '') + v.toFixed(2)).join(' '));
console.log('curve', sm.map((v, i) => (i % 10 === 0 ? '\n' + (i + 1) + ': ' : '') + v.toFixed(2)).join(' '));
console.log('levels', save.squad.map((id) => save.cards['h:' + id].lvl).join(','), 'battles', battles);
