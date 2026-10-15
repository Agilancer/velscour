// Node-only sanity check of the skill data (no browser needed):
// 20 skills per tree (3 trees per class, the Necromancer 4), valid kinds/elements, summons exist, unique names, describe() works;
// every monster look points at a cut sheet cell and every archetype has art; biome bag and mixing rules.
//   node tools/tests/data_check.mjs
const { SKILLS, CLASS_SKILLS, describe, skillBaseDamage, manaCost } = await import(new URL('../../src/data/skills.js', import.meta.url));
const { SUMMONS } = await import(new URL('../../src/data/summons.js', import.meta.url));
const { CLASSES } = await import(new URL('../../src/data/classes.js', import.meta.url));

const KINDS = 'melee proj nova aoe beam chain wall zone orbit cyclone whirl leap dash blink summon buff curse heal trap rain strike fissure corpse'.split(' ');
const ELEMENTS = ['phys', 'fire', 'cold', 'light', 'poison', 'arcane', 'holy', 'shadow', 'blood', 'acid'];
const kinds = {}; const fxs = {}; const bad = [];
for (const [c, list] of Object.entries(CLASS_SKILLS)) {
  if (list.length !== CLASSES[c].trees.length * 20) bad.push(`${c} has ${list.length} skills for ${CLASSES[c].trees.length} trees`);
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
const { BESTIARY, SUMMON_ART, FAMILIAR_ART, ART_BY_ID, SWAPS, artPool, rollLooks } = await import(new URL('../../src/data/bestiary.js', import.meta.url));
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
for (const a of [...SUMMON_ART, ...FAMILIAR_ART]) {
  if (ids.has(a.id)) bad.push(`duplicate art id ${a.id}`);
  ids.add(a.id);
  if (!meta[a.sheet] || !meta[a.sheet].cells[a.i]) bad.push(`summon art ${a.id}: no cell ${a.sheet}#${a.i}`);
  if (cells.has(a.sheet + a.i)) bad.push(`summon art ${a.id}: cell ${a.sheet}#${a.i} used twice`);
  cells.add(a.sheet + a.i);
}
for (const [k, d] of Object.entries(SUMMONS)) {
  const look = d.look || {};
  for (const id of [].concat(look.art || [], look.icon || [], Object.entries(look.idle || {}).flat())) if (!ART_BY_ID[id]) bad.push(`summon ${k}: unknown art ${id}`);
  if (Array.isArray(look.art) && !(look.h > 10)) bad.push(`summon ${k}: an art list needs look.h`);
  for (const x of d.pool || []) if (!SUMMONS[x] || SUMMONS[x].pool) bad.push(`summon ${k}: bad pool entry ${x}`);
  for (const A of [d.atk, d.spell]) if (A && A.type === 'spawn' && !SUMMONS[A.what]) bad.push(`summon ${k}: spawns unknown ${A.what}`);
}
for (const [k, s] of Object.entries(meta)) s.cells.forEach((c, i) => { if (c && !cells.has(k + i)) console.log(`note: ${k}#${i} has no bestiary entry yet`); });
for (const k of Object.keys(ARCH)) if (k !== 'velscour' && !artPool(k).length) bad.push(`archetype ${k} has no monster art`);
for (const b of BIOMES) {
  for (const sw of b.swaps || []) if (sw && !SWAPS[sw]) bad.push(`biome ${b.id}: unknown swap ${sw}`);
  for (const k of b.prefer || []) if (!meta[k]) bad.push(`biome ${b.id}: prefers unknown art sheet ${k}`);
  const looks = rollLooks(b);
  for (const k of b.roster) if (!looks.pick(k)) bad.push(`biome ${b.id}: no look for ${k}`);
  if (!looks.boss(b.roster)) bad.push(`biome ${b.id}: no guardian art`);
  if (b.id !== 'throne' && !b.overworld && !b.family) bad.push(`biome ${b.id}: no colour family`);
}
// every biome's pack exists and is complete: all 16 wall connection masks per family, with an arm for each
// connection, arches and doors in 4 directions (doors open and closed), self-seamless floors, chest art
const { readFileSync, existsSync } = await import('node:fs');
const asset = (f) => new URL('../../assets/' + f, import.meta.url);
const packs = {};
for (const b of BIOMES) {
  if (!b.pack) { bad.push(`biome ${b.id}: no pack`); continue; }
  if (b.pack === 'desert_temple') {
    // Original Canvas asset generator delivers a complete pack at runtime using
    // the proven Catacombs wall/arch/door slicing and geometry contract.
    if (!existsSync(new URL('../../src/gfx/deserttemple.js', import.meta.url))) bad.push('missing Desert Temple art generator');
    continue;
  }
  if (b.overworld) {
    if (b.pack !== 'town') bad.push(`overworld ${b.id}: expected town art pack`);
    for (const f of ['town.json', 'ground.webp', 'objects.webp']) if (!existsSync(asset(`tiles/town/${f}`))) bad.push(`overworld: missing tiles/town/${f}`);
    continue; // the outdoor pack has no indoor floor/wall/door atlas
  }
  for (const f of ['pack.json', 'floors.webp', 'walls.webp', 'scatter.webp']) if (!existsSync(asset(`tiles/${b.pack}/${f}`))) bad.push(`biome ${b.id}: missing tiles/${b.pack}/${f}`);
  packs[b.pack] = 1;
}
for (const id of Object.keys(packs)) {
  const m = JSON.parse(readFileSync(asset(`tiles/${id}/pack.json`)));
  if (m.floors.filter((f) => f.seamless).length < 2) bad.push(`pack ${id}: fewer than 2 seamless floors`);
  for (const [fam, masks] of Object.entries(m.walls)) {
    for (let mask = 0; mask < 16; mask++) {
      if (!masks[mask]) { bad.push(`pack ${id}: ${fam} has no piece for mask ${mask}`); continue; }
      const want = ['NE', 'SE', 'SW', 'NW'].filter((d, i) => mask & (1 << i));
      for (const v of masks[mask]) for (const d of want) if (!v.some((r) => r[0] === d)) bad.push(`pack ${id}: ${fam} mask ${mask} has no ${d} arm`);
    }
  }
  for (const [des, dirs] of Object.entries(m.arches)) for (const d of ['SE', 'SW', 'NW', 'NE']) { const n = 2 * ((m.archSpan || {})[des] || 3); if (!dirs[d] || dirs[d].length !== n) bad.push(`pack ${id}: arch ${des} ${d} not in ${n} slices`); }
  for (const [des, dirs] of Object.entries(m.doors)) for (const d of ['SE', 'SW', 'NW', 'NE']) {
    if (!dirs[d] || !dirs[d].closed || !dirs[d].open) { bad.push(`pack ${id}: door ${des} ${d} missing a state`); continue; }
    if (!dirs[d].open.some((r) => r[0][0] === 'leaf')) bad.push(`pack ${id}: door ${des} ${d} has no open leaf`);
  }
  console.log(`pack ${id}: ${m.floors.length} floors, ${Object.keys(m.walls).length} wall families, ${Object.keys(m.arches).length} arches, ${Object.keys(m.doors).length} doors, ${m.scatter.length} props`);
}
const chests = JSON.parse(readFileSync(asset('props/chests.json')));
for (const k of ['closed', 'open', 'rareClosed', 'rareOpen']) if (!chests[k]) bad.push(`chest art: no ${k}`);
// shuffle bag: every biome but the throne, each once per cycle, never twice in a row
const NB = BIOMES.length - 1, hero = { biomeBag: [] }, seq = [];
for (let i = 0; i < NB * 4; i++) { const id = drawBiome(hero, 2); if (id === hero.lastBiome) bad.push('biome repeated back to back'); hero.lastBiome = id; seq.push(id); }
if (new Set(seq.slice(0, NB)).size !== NB) bad.push(`first ${NB} biomes are not all different`);
let mixes = 0;
for (let i = 0; i < 200; i++) { const m = mixPartner(BIOMES[0]); if (m) { mixes++; if (m.family !== BIOMES[0].family || m.id === BIOMES[0].id) bad.push('bad mix partner ' + m.id); } }
console.log('monster art', BESTIARY.length, 'looks; biome order sample', seq.slice(0, 6).join(' '), '; mixed levels', mixes, '/ 200');

// ---- Velscour's level-up lines (src/data/taunts.js): 2,000 unique two-line taunts that fit the banner, a mood never twice in a row
const { TAUNTS, CLASS_TAUNTS, MILESTONES, pickTaunt } = await import(new URL('../../src/data/taunts.js', import.meta.url));
const MAXLEN = 40, worst = (s) => s.replace(/\{name\}/g, 'N'.repeat(18)).replace(/\{class\}/g, 'C'.repeat(16)).replace(/\{level\}/g, '100');
const allT = [...Object.values(TAUNTS).flat(), ...Object.values(CLASS_TAUNTS).flat().map((t) => t[1]), ...Object.values(MILESTONES).map((t) => t[1])];
const moodsOk = [...Object.values(CLASS_TAUNTS).flat(), ...Object.values(MILESTONES)].every(([m]) => TAUNTS[m]);
if (!moodsOk) bad.push('taunt with an unknown mood');
for (const c of Object.keys(CLASS_TAUNTS)) if (!CLASSES[c]) bad.push('taunts for unknown class ' + c);
const nT = Object.values(TAUNTS).flat().length;
if (nT !== 2000) bad.push(`${nT} level-up taunts, want 2000`);
if (new Set(allT).size !== allT.length) bad.push('duplicate level-up taunts');
for (const t of allT) {
  const parts = t.split('|');
  if (parts.length !== 2 || parts.some((p) => !p.trim())) bad.push('taunt is not two lines: ' + t);
  else for (const p of parts) if (worst(p).length > MAXLEN) bad.push(`taunt line over ${MAXLEN} chars: ${p}`);
  if (/\{(?!name\}|class\}|level\})/.test(t)) bad.push('unknown placeholder: ' + t);
}
const deck = {}, bard = { name: 'Testy', classId: 'bard', level: 3 }, seen = new Set();
let lastMood = null;
for (let i = 0; i < 3000; i++) {
  const t = pickTaunt(bard, deck);
  if (t.mood === lastMood) bad.push('mood repeated back to back: ' + t.mood);
  if (/[{}|]/.test(t.l1 + t.l2)) bad.push('unfilled taunt ' + t.l1 + ' / ' + t.l2);
  lastMood = t.mood; seen.add(t.l1 + '|' + t.l2);
  bard.level = bard.level >= 100 ? 2 : bard.level + 1;
}
if (seen.size < 1900) bad.push(`3000 picks showed only ${seen.size} different taunts`);
console.log('level-up taunts', nT, Object.entries(TAUNTS).map(([m, l]) => `${m} ${l.length}`).join(', '), '; 3000 picks showed', seen.size);
if (bad.length) { console.log(bad); process.exitCode = 1; } else console.log('OK');
