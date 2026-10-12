// Node-only sanity check of the skill data (no browser needed):
// 60 skills per class, valid kinds/elements, summons exist, unique names, describe() works;
// every monster look points at a cut sheet cell and every archetype has art; biome bag and mixing rules.
//   node tools/tests/data_check.mjs
const { SKILLS, CLASS_SKILLS, describe, skillBaseDamage, manaCost } = await import(new URL('../../src/data/skills.js', import.meta.url));
const { SUMMONS } = await import(new URL('../../src/data/summons.js', import.meta.url));

const KINDS = 'melee proj nova aoe beam chain wall zone orbit cyclone whirl leap dash blink summon buff curse heal trap rain strike fissure corpse'.split(' ');
const ELEMENTS = ['phys', 'fire', 'cold', 'light', 'poison', 'arcane', 'holy', 'shadow', 'blood', 'acid'];
const kinds = {}; const fxs = {}; const bad = [];
for (const [c, list] of Object.entries(CLASS_SKILLS)) {
  if (list.length !== 60) bad.push(`${c} has ${list.length} skills`);
  const names = new Set();
  for (const s of list) {
    kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    fxs[s.kind + ':' + s.fx] = 1;
    if (!KINDS.includes(s.kind)) bad.push(`bad kind ${s.id} ${s.kind}`);
    if (!ELEMENTS.includes(s.el)) bad.push(`bad element ${s.id} ${s.el}`);
    if (s.kind === 'summon' && !SUMMONS[s.m.sum]) bad.push(`missing summon ${s.id} ${s.m.sum}`);
    if (names.has(s.name)) bad.push(`duplicate name ${c} ${s.name}`);
    names.add(s.name);
    describe(s, 1, [1, 2]);
  }
}
console.log('classes', Object.keys(CLASS_SKILLS).length, 'skills', Object.keys(SKILLS).length);
console.log('skills per kind', kinds);
console.log('kind:fx combos', Object.keys(fxs).length);
const s = SKILLS['wizard.0.0'];
console.log('example', s.name, 'dmg L1', skillBaseDamage(s, 1), 'dmg L20', skillBaseDamage(s, 20), 'mana wizard.0.8 L1', manaCost(SKILLS['wizard.0.8'], 1));

// ---- monster art (src/data/bestiary.js vs assets/sprites/enemies/enemies.json)
const { BESTIARY, SWAPS, artPool, rollLooks } = await import(new URL('../../src/data/bestiary.js', import.meta.url));
const { ARCH } = await import(new URL('../../src/data/enemies.js', import.meta.url));
const { BIOMES, drawBiome, mixPartner } = await import(new URL('../../src/data/biomes.js', import.meta.url));
const fs = await import('node:fs');
const meta = JSON.parse(fs.readFileSync(new URL('../../assets/sprites/enemies/enemies.json', import.meta.url)));
const ids = new Set(), cells = new Set();
for (const a of BESTIARY) {
  if (ids.has(a.id)) bad.push(`duplicate monster art id ${a.id}`);
  ids.add(a.id);
  if (!meta[a.sheet] || !meta[a.sheet].cells[a.i]) bad.push(`monster art ${a.id}: no cell ${a.sheet}#${a.i}`);
  if (cells.has(a.sheet + a.i)) bad.push(`monster art ${a.id}: cell ${a.sheet}#${a.i} used twice`);
  cells.add(a.sheet + a.i);
  for (const k of [a.arch, ...(a.also || [])]) if (!ARCH[k]) bad.push(`monster art ${a.id}: unknown archetype ${k}`);
  if (a.el && !ELEMENTS.includes(a.el)) bad.push(`monster art ${a.id}: bad element ${a.el}`);
  if (!(a.h > 20 && a.h < 120)) bad.push(`monster art ${a.id}: height ${a.h}`);
}
for (const [k, s] of Object.entries(meta)) s.cells.forEach((c, i) => { if (c && !cells.has(k + i)) console.log(`note: ${k}#${i} has no bestiary entry yet`); });
for (const k of Object.keys(ARCH)) if (k !== 'velscour' && !artPool(k).length) bad.push(`archetype ${k} has no monster art`);
for (const b of BIOMES) {
  for (const sw of b.swaps || []) if (sw && !SWAPS[sw]) bad.push(`biome ${b.id}: unknown swap ${sw}`);
  const looks = rollLooks(b);
  for (const k of b.roster) if (!looks.pick(k)) bad.push(`biome ${b.id}: no look for ${k}`);
  if (!looks.boss(b.roster)) bad.push(`biome ${b.id}: no guardian art`);
  if (b.id !== 'throne' && !b.family) bad.push(`biome ${b.id}: no colour family`);
}
// shuffle bag: 19 biomes, each once per cycle, never twice in a row
const hero = { biomeBag: [] }, seq = [];
for (let i = 0; i < 19 * 4; i++) { const id = drawBiome(hero, 2); if (id === hero.lastBiome) bad.push('biome repeated back to back'); hero.lastBiome = id; seq.push(id); }
if (new Set(seq.slice(0, 19)).size !== 19) bad.push('first 19 biomes are not all different');
let mixes = 0;
for (let i = 0; i < 200; i++) { const m = mixPartner(BIOMES[0]); if (m) { mixes++; if (m.family !== BIOMES[0].family || m.id === BIOMES[0].id) bad.push('bad mix partner ' + m.id); } }
console.log('monster art', BESTIARY.length, 'looks; biome order sample', seq.slice(0, 6).join(' '), '; mixed levels', mixes, '/ 200');
if (bad.length) { console.log(bad); process.exitCode = 1; } else console.log('OK');
