// ACT III's quest book (data/phobosquests.js, game/phobosquests.js), no browser: 60+ quests with unique ids, every giver,
// target and captive art in the catalogue, every text within its limit, every step type implemented, places known.
//   node tools/tests/phobosquests.mjs
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const { PHOBOS_QUESTS, QUEST_LIMITS: L, STEP_TYPES, CITY_PLACES, CASTLE_PLACES, allSteps } = await import(new URL('src/data/phobosquests.js', root));
const { PHOBOS_BY_ID, DISTRICTS, WINGS } = await import(new URL('src/data/phobos.js', root));
const src = readFileSync(new URL('src/game/phobosquests.js', root), 'utf8');
const block = src.slice(src.indexOf('const STEPS = {'), src.indexOf('\n};', src.indexOf('const STEPS = {')));
const impl = new Set([...block.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]));
const bad = []; const err = (m) => bad.push(m);
const ids = new Set(), byType = {}, byPlace = {};
for (const q of PHOBOS_QUESTS) {
  if (ids.has(q.id)) err(`duplicate id ${q.id}`); ids.add(q.id);
  byPlace[q.at] = (byPlace[q.at] || 0) + 1;
  if (!q.giver.art || !PHOBOS_BY_ID[q.giver.art]) err(`${q.id}: giver art for ${q.giver.name}`);
  for (const k of ['name', 'text', 'offer', 'progress', 'done']) { if (!q[k]) err(`${q.id}: no ${k}`); else if (q[k].length > L[k]) err(`${q.id}: ${k} ${q[k].length} > ${L[k]}`); }
  if (q.after && !PHOBOS_QUESTS.some((o) => o.id === q.after)) err(`${q.id}: after ${q.after}?`);
  const places = q.kind === 'city' ? CITY_PLACES : CASTLE_PLACES;
  for (const s of allSteps(q)) {
    byType[s.t] = (byType[s.t] || 0) + 1;
    if (!STEP_TYPES.includes(s.t) || !impl.has(s.t)) err(`${q.id}: step type ${s.t} not implemented`);
    if (!s.label) err(`${q.id}: ${s.t} has no label`); else if (s.label.length > L.label) err(`${q.id}: label ${s.label.length}`);
    for (const t of [s.line, ...(s.lines || [])]) if (t && t.length > L.line) err(`${q.id}: line ${t.length} > ${L.line}`);
    const pl = s.d ? CITY_PLACES : places; if (s.at && !pl.includes(s.at)) err(`${q.id}: place ${s.at}`);
    if (['slay', 'lord', 'rescue'].includes(s.t) || (s.t === 'talk' && !s.who)) { if (!s.art || !PHOBOS_BY_ID[s.art]) err(`${q.id}: ${s.t} art for ${s.foe || s.name}`); }
    for (const re of [s.match, s.gm, s.mode === 'silence' && s.guard]) if (re) try { new RegExp(re); } catch { err(`${q.id}: bad regex ${re}`); }
    if (s.t === 'choice') { if (!s.prompt || s.prompt.length > L.prompt) err(`${q.id}: prompt`); if (s.opts?.length !== 2) err(`${q.id}: choice needs 2 options`);
      for (const o of s.opts || []) { if (o.label.length > L.optLabel) err(`${q.id}: option label ${o.label}`); if (o.line && o.line.length > L.optLine) err(`${q.id}: option line`); if (o.done && o.done.length > L.done) err(`${q.id}: option done`); } }
  }
}
const city = PHOBOS_QUESTS.filter((q) => q.kind === 'city').length, castle = PHOBOS_QUESTS.length - city;
if (PHOBOS_QUESTS.length < 60) err(`only ${PHOBOS_QUESTS.length} quests`);
for (const d of DISTRICTS) if ((byPlace[d.id] || 0) < 2) err(`district ${d.id} has ${byPlace[d.id] || 0}`);
for (const w of WINGS) if ((byPlace[w.id] || 0) < 2) err(`wing ${w.id} has ${byPlace[w.id] || 0}`);
// no reused filler: no offer/done line said twice
const seen = new Set(); for (const q of PHOBOS_QUESTS) for (const t of [q.offer, q.done, q.progress]) { if (seen.has(t)) err(`${q.id}: repeated line`); seen.add(t); }
console.log(`${PHOBOS_QUESTS.length} quests (${city} city, ${castle} castle)`);
console.log('by place:', JSON.stringify(byPlace));
console.log('by step type:', JSON.stringify(byType));
console.log('implemented:', [...impl].join(','));
if (bad.length) { console.log(`FAIL ${bad.length}:\n  ` + bad.join('\n  ')); process.exit(1); }
console.log('PASS');
