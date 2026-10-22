// Homunculus the Proud (src/game/homunculus.js, src/data/homunculus.js), no browser: over 2,000 distinct everyday
// lines, every line fits a three-line bubble, poses and emotions exist, the axe story has three tellings per chapter,
// and a simulated hero hears the whole story (each chapter twice, recaps after) in a sensible number of visits.
// node tools/tests/homunculus.mjs
import { readFileSync } from 'fs';
import { G } from '../../src/state.js';
import { allLines, planChat, chatTimes, homunculusState } from '../../src/game/homunculus.js';
import { POOLS, TOPICS, STORY, AFTER, FOLK_HAILS, FOLK_BACK, AXE_MUTTERS, POSES, IDLE_POSES } from '../../src/data/homunculus.js';
import { EMOTIONS } from '../../src/game/townsfolkvisuals.js';

const errors = [], fail = (m) => errors.push(m);
const MAX = 88; // characters in a three-line bubble (townspeech.js, 196 px)
const meta = JSON.parse(readFileSync(new URL('../../assets/sprites/npc/homunculus.json', import.meta.url)));
for (const p of [...Object.keys(POSES), ...IDLE_POSES]) if (!(p in meta.poses)) fail('pose missing from the sheet: ' + p);
if (Object.keys(meta.poses).length !== 30) fail('the sheet should hold 30 poses');
for (const e of Object.values(POSES)) if (!EMOTIONS[e]) fail('pose emotion is not a town emotion: ' + e);

const lines = [...allLines({ gear: 'leggings', folk: 'Bartholomew', cls: 'Arcane Sorcerer' })];
if (lines.length < 2000) fail('only ' + lines.length + ' distinct Homunculus lines (want over 2,000)');
const long = lines.filter((l) => l.length > MAX);
if (long.length) fail(long.length + ' lines too long: ' + long.slice(0, 3).join(' / '));
for (const [k, pool] of Object.entries(POOLS)) for (const e of pool) {
  if (Array.isArray(e) && e[1] && !POSES[e[1]]) fail(`${k}: unknown pose ${e[1]}`);
  if (Array.isArray(e) && e[2] > STORY.length) fail(`${k}: chapter gate past the story`);
}
for (const t of TOPICS) for (const [who, tpl] of t.lines) if (who === 'p' && tpl.length > MAX) fail('hero template too long ' + tpl);
const scripted = [...STORY.flatMap((c) => c.tellings.flat()), ...AFTER.flat()];
STORY.forEach((c, i) => { if (c.tellings.length !== 3) fail(`chapter ${i} needs three tellings`); });
for (const [who, text, pose] of scripted) {
  if (!['h', 'p', 'a'].includes(who)) fail('bad speaker ' + who);
  if (text.length > MAX) fail('story line too long: ' + text);
  if (who === 'h' && !POSES[pose]) fail('story line without a pose: ' + text);
}
for (const [t, p] of FOLK_HAILS) { if (!POSES[p]) fail('folk hail pose ' + p); if (t.replace('{name}', 'Bartholomew').length > MAX) fail('hail too long ' + t); }
for (const [t, e] of FOLK_BACK) { if (!EMOTIONS[e]) fail('folk reply emotion ' + e); if (t.length > 56) fail('folk reply too long ' + t); }
for (const [, t] of AXE_MUTTERS) if (t.length > MAX) fail('mutter too long ' + t);

// a hero visits the forge 80 times
G.char = { classId: 'paladin', equip: { weapon: { slot: 'weapon', base: 'sword' }, head: { slot: 'head' } } };
const kinds = {}, chapterAt = [];
let maxChat = 0, minChat = 99, finale = 0;
for (let v = 0; v < 80; v++) {
  const plan = planChat(null), t = chatTimes(plan.lines);
  const total = t.reduce((a, b) => a + b + 0.25, 0);
  maxChat = Math.max(maxChat, total); minChat = Math.min(minChat, total);
  kinds[plan.kind] = (kinds[plan.kind] || 0) + 1;
  if (plan.finale) finale++;
  chapterAt.push(homunculusState().chapter);
}
const s = homunculusState();
if (s.chapter !== STORY.length) fail('story not finished after 80 visits (chapter ' + s.chapter + ')');
if (s.told.some((t) => t.length !== 2 || t[0] === t[1])) fail('each chapter should be told twice, two different ways');
if (finale !== 1) fail('the finale gift should come exactly once, came ' + finale);
if (!kinds.recap) fail('no recaps of earlier chapters');
if (!kinds.after) fail('no Varrow banter after the story');
if (minChat < 3 || maxChat > 10.05) fail(`chats last ${minChat.toFixed(1)}-${maxChat.toFixed(1)} s (want 3-10)`);
const done = chapterAt.indexOf(STORY.length) + 1;
console.log('Homunculus', JSON.stringify({ lines: lines.length, longest: Math.max(...lines.map((l) => l.length)), chapters: STORY.length, storyDoneAtVisit: done, chat: [+minChat.toFixed(1), +maxChat.toFixed(1)], kinds }));
if (errors.length) { console.log(errors.map((e) => '[check] ' + e).join('\n')); process.exit(1); }
console.log('NO ERRORS');
