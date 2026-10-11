// Node-only sanity check of the skill data (no browser needed):
// 60 skills per class, valid kinds/elements, summons exist, unique names, describe() works.
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
if (bad.length) { console.log(bad); process.exitCode = 1; } else console.log('OK');
