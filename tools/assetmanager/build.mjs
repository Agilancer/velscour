// Builds tools/assetmanager/manifest.json and the thumbnail sheets (thumbs/) for the asset manager page.
// It reads the game's own catalogs (src/data/*.js) and the generated atlases under assets/, so a rebuild after new
// art lands puts the new art in the right list. Needs Node 18+ and python3 with Pillow (thumbs.py).
//   node tools/assetmanager/build.mjs            (from the repo root or anywhere)
// Statuses (KINDS): art/ai/3d are "custom", recolor/ascii/code/flat3d are "placeholder".
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(ROOT);
const imp = (p) => import(new URL('../../' + p, import.meta.url));
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);
const warns = [];
const warn = (m) => warns.push(m);

const KINDS = {
  art: { label: 'Custom art', list: 'custom', tag: 'ART', blurb: 'Painted or imported art from your art packs.' },
  ai: { label: 'Generated art', list: 'custom', tag: 'GEN', blurb: 'Made for the game with an image generator or a script (the replacement pack, the small Heavenly sprites, the wall hangings), not from your own art packs.' },
  '3d': { label: 'Textured 3D', list: 'custom', tag: '3D', blurb: 'A three.js model with image textures, live in the game or baked to sprites.' },
  flat3d: { label: 'Untextured 3D', list: 'ph', tag: '3D', blurb: 'A three.js model with flat or procedural colours only, no image textures.' },
  recolor: { label: 'Recoloured / borrowed', list: 'ph', tag: 'SWAP', blurb: 'Uses art made for something else, recoloured or reused.' },
  ascii: { label: 'ASCII pixel art', list: 'ph', tag: 'ASCII', blurb: 'Tiny pixel art typed as text in src/gfx/pixelart.js.' },
  code: { label: 'Drawn in code', list: 'ph', tag: 'CODE', blurb: 'Shapes, gradients and particles drawn by code, no art file.' },
  none: { label: 'No art yet', list: 'ph', tag: 'NONE', blurb: 'Not drawn at all yet, or shown with a generic stand-in.' },
};

const sections = [], groups = [], items = [], files = [], fileIx = new Map(), ids = new Set();
let curSec = -1;
function F(p) {
  if (!fileIx.has(p)) { if (!exists(p)) warn('missing file ' + p); fileIx.set(p, files.length); files.push(p); }
  return fileIx.get(p);
}
function section(id, name, blurb) { sections.push({ id, name, blurb }); curSec = sections.length - 1; }
// o: note, doc, cmd, dir (source folder for new art), v (live viewer page), code (source files), w (default why), files
function group(name, o = {}) { groups.push({ s: curSec, name, ...o }); return groups.length - 1; }
// it: id, n (name), k (kind), y (sprite|texture|model), src [path, rect?] thumb + preview, fr [[path, rect?], ...] frames,
//     files [paths], w (why), d (about), c (variant count), names [sub names], px (pixel art thumb), thumb [path, rect] (thumb only)
function add(g, it) {
  let id = String(it.id);
  if (ids.has(id)) { let n = 2; while (ids.has(`${id}~${n}`)) n++; warn('duplicate id ' + id); id = `${id}~${n}`; }
  ids.add(id);
  const o = { id, n: it.n, g, k: it.k || 'art' };
  if (it.y && it.y !== 'sprite') o.y = it.y;
  const fr = it.fr || (it.src ? [it.src] : null);
  if (fr && fr.length) {
    o.fr = fr.map(([p, r]) => [F(p), ...(r || [])]);
    if (o.fr.length === 1) { o.p = o.fr[0]; delete o.fr; }
  }
  const fl = [...new Set([...(it.files || []), ...(fr || []).map(([p]) => p)])];
  if (fl.length) o.f = fl.map(F);
  for (const k of ['w', 'd', 'c', 'names', 'px']) if (it[k] != null && it[k] !== '' && !(Array.isArray(it[k]) && !it[k].length)) o[k] = it[k];
  o._thumb = it.thumb || (fr && fr[0]) || null;
  o._tf = (it.px ? 'p' : '') + (it.tf || '');
  o._pal = it.pal || null;
  items.push(o);
  return o;
}
const titleCase = (s) => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

// ====================================================================================== shared lookups
const ENEMIES = json('assets/sprites/enemies/enemies.json');
const REP = json('assets/sprites/replacements/atlas.json');
const SOS = json('assets/tiles/sea_of_sand/pack.json');
const SOS_FOES = [...SOS.atlases.monster.map((f) => ['monster', f]), ...SOS.atlases.boss.map((f) => ['boss', f])];
const CAPS = exists('tools/assetmanager/captures/captures.json') ? json('tools/assetmanager/captures/captures.json') : {};
const rect = (o) => [o.x, o.y, o.w, o.h];
const rep = (key) => REP[key] ? ['assets/sprites/replacements/atlas.webp', rect(REP[key])] : null;
let ART_BY_ID = {};
/** [image, rect] of a monster/summon art id, the way src/core/enemyart.js finds it. */
function artSrc(id) {
  if (!id) return null;
  if (id.startsWith('va_')) return rep(id.slice(3));
  const a = ART_BY_ID[id];
  if (!a) return null;
  if (id.startsWith('ss_')) {
    const [cat, f] = SOS_FOES[a.i] || [];
    return f ? [`assets/tiles/sea_of_sand/${cat}.webp`, rect(f)] : null;
  }
  if (id.startsWith('hv_')) {
    const v = a.i % 5, fam = Math.floor(a.i / 5);
    if (v === 0) return ['assets/tiles/approved_biomes/heavenly_monsters.webp', [(fam % 4) * 120, Math.floor(fam / 4) * 150, 120, 150]];
    return ['assets/tiles/ai_biomes/heavenly_monsters.webp', [(a.i % 8) * 64, Math.floor(a.i / 8) * 64, 64, 64]];
  }
  const m = ENEMIES[a.sheet], c = m && m.cells[a.i];
  return c ? [`assets/sprites/enemies/${m.file}`, rect(c)] : null;
}
/** Frames of a capture made by capture.js (code-drawn placeholders rendered by the game's own functions). */
function cap(key) {
  const c = CAPS[key];
  return c ? c.cells.map((r) => [c.f, r]) : null;
}
const capNames = (key) => CAPS[key]?.names || [];
const ENEMY_DOC = 'docs/ENEMY_ART.md';

// ====================================================================================== monsters
async function monsters() {
  section('monsters', 'Monsters & Bosses', 'Every monster and boss look: the painted enemy sets, the area rosters, raid bosses and Velscour, and the few foes still on stand-in art. Levels recolour these looks with palette swaps.');
  const B = await imp('src/data/bestiary.js');
  ART_BY_ID = B.ART_BY_ID;
  const { RAID_BOSSES } = await imp('src/game/raid.js');
  const desc = (a) => [`Plays ${a.arch}${a.also?.length ? ` (also ${a.also.join(', ')})` : ''}`, `${a.h} px tall`, a.el && a.el !== 'phys' ? a.el : '',
    a.lone ? 'giant: bosses only' : a.boss ? 'can be a guardian' : ''].filter(Boolean).join(' · ');
  const sets = [
    ['set1/', 'Enemy set 1', { note: '7 painted sheets of 10. The first monster art.', dir: 'assets/source/enemies/set1', cmd: 'python3 tools/process_assets.py enemies', doc: ENEMY_DOC }],
    ['set2/', 'Enemy set 2', { note: '300 single sprites in 11 families (Enemy_300.zip). Its giants only play bosses.', dir: 'assets/source/enemies/set2', cmd: 'python3 tools/process_assets.py enemies', doc: ENEMY_DOC }],
    ['set3/', 'Enemy set 3', { note: '260 monsters and bosses cut from VELSCOUR_Monsters_Enemies_Bosses.zip.', dir: 'assets/source/enemies/set3', cmd: 'python tools/set3plates.py <zip>', doc: ENEMY_DOC, code: 'src/data/bestiary3.js' }],
    ['breach/', 'The Eternal Breach', { note: "The purple portal's own monsters; they never join the regular draws.", dir: 'assets/source/enemies/breach', cmd: 'python tools/eternalbreach.py', doc: 'docs/ETERNAL_BREACH.md', code: 'src/data/breachroster.js' }],
    ['air/', 'Air Pirates', { note: 'The Sky Battle crews and captains; the Serpentine Tower and the Pirate Seas borrow them.', dir: 'assets/source/enemies/air', doc: 'docs/SKY_BATTLE.md', code: 'src/data/airpirates.js' }],
    ['depths_edge/', "Depth's Edge Caverns", { note: 'The caverns roster and their 10 bosses.', dir: 'assets/source/enemies/depths_edge', cmd: 'python tools/depthsedge.py <pack zip> <monsters zip>; python tools/process_assets.py enemies depths_edge', doc: 'docs/DEPTHS_EDGE.md', code: 'src/data/depthsedge.js' }],
    ['sea_of_sand', 'Sea of Sand', { note: '60 desert creatures and 10 bosses from the Sea of Sand pack.', cmd: 'python tools/seaofsandpack.py <Sea_of_Sand_Biome_Pack directory>', doc: 'docs/SEA_OF_SAND.md', code: 'src/data/seaofsand.js' }],
  ];
  for (const [pre, name, o] of sets) {
    const g = group(name, o);
    for (const a of B.BESTIARY.filter((a) => a.sheet === pre || a.sheet.startsWith(pre))) add(g, { id: a.id, n: a.name, k: 'art', src: artSrc(a.id), d: desc(a) });
  }
  const hv = B.BESTIARY.filter((a) => a.id.startsWith('hv_'));
  let g = group('Heavenly: painted', { note: "The first of each Heavenly family is the user's painting.", doc: 'docs/HEAVENLY.md', code: 'src/gfx/approvedbiomeart.js src/data/heavenly.js' });
  for (const a of hv.filter((a) => a.i % 5 === 0)) add(g, { id: a.id, n: a.name, k: 'art', src: artSrc(a.id), d: desc(a) });
  g = group('Heavenly: generated', { note: '48 small generated sprites (64 px), drawn 2.5x: they look soft next to the painted art.', doc: 'docs/HEAVENLY.md', cmd: 'python tools/build_ai_biome_atlases.py', code: 'src/gfx/aibiomeart.js src/data/heavenly.js' });
  for (const a of hv.filter((a) => a.i % 5)) add(g, { id: a.id, n: a.name, k: 'ai', src: artSrc(a.id), px: 1, d: desc(a), w: 'A 64 px generated sprite drawn 2.5x, so it reads blurry or blocky beside the painted monsters.' });

  g = group('Raid bosses (BOSS ROOMs)', { note: 'Every 5th depth. Each boss picks one of its painted looks; Rift Guardians and the Unbound court are these bosses too.', code: 'src/game/raid.js src/game/raidsigs.js', doc: ENEMY_DOC });
  for (const r of RAID_BOSSES) {
    const fr = r.art.map(artSrc).filter(Boolean);
    add(g, { id: 'raid_' + r.id, n: `${r.name}, ${r.title}`, k: 'art', fr, names: r.art.map((id) => ART_BY_ID[id]?.name || id), d: `${r.sigs ? 'Signature boss. ' : ''}${r.art.length} possible looks; element ${r.el}.` });
  }
  g = group('Velscour and the wards', { note: 'Generated art (docs/SPRITE_REPLACEMENTS.md): one still frame each.', cmd: 'python tools/replacementart.py', dir: 'assets/source/replacements', doc: 'docs/SPRITE_REPLACEMENTS.md', code: 'src/game/velscour.js src/core/replacementart.js' });
  add(g, { id: 'va_velscour', n: 'Demon Lord Velscour', k: 'ai', src: rep('velscour'), d: 'The final boss at depth 500 (and Velscour Unbound). One frame; his five phases are tints and effects.' });
  add(g, { id: 'va_crystal', n: 'Warding Crystal', k: 'ai', src: rep('crystal'), d: 'Raid wards, seals, Heart Shards, obelisks and the Unstable Crystal, tinted to the element.' });
  g = group('3D monsters', { note: 'Baked from a three.js model into sprite sheets and tinted at runtime.', v: 'tools/breachdragon3d.html', code: 'src/gfx/breachdragon.js tools/breachdragon3d.html', doc: 'docs/ETERNAL_BREACH.md' });
  const dj = json('assets/sprites/breach_dragon/dragon.json');
  add(g, { id: 'breach_wyrm', n: 'Ethereal Wyrm of the Breach', k: 'flat3d', y: 'model', thumb: ['assets/sprites/breach_dragon/parts.webp', rect(dj.heads.amethyst)],
    fr: [...Object.values(dj.heads), ...Object.values(dj.claws)].map((h) => ['assets/sprites/breach_dragon/parts.webp', rect(h)]).concat([['assets/sprites/breach_dragon/body.webp', [0, 0, Math.round(dj.seg.cw * dj.S), Math.round(dj.tail.y * dj.S)]]]),
    w: 'The body is a three.js model with procedural canvas scales (no painted texture); its 10 heads and 6 claws are cut from the set 2 dragons.', files: ['assets/sprites/breach_dragon/dragon.json'] });

  g = group('Stand-ins and borrowed looks', { note: 'Foes that show art made for something else, or none at all.', code: 'src/game/happenings.js src/game/raidsigs.js src/game/seabattle.js src/data/dunes.js' });
  add(g, { id: 'ph_treasure_imp', n: 'Treasure Imp', k: 'ascii', fr: cap('imp'), w: 'Spawned with no look (makeMonster(..., null) in src/game/happenings.js), so it always draws the ASCII imp, though 11 painted imp looks exist.' });
  add(g, { id: 'ph_velscour_mirror', n: 'Mirror of Velscour', k: 'recolor', src: rep('velscour'), w: "Velscour's own art tinted pink (src/game/velscour.js)." });
  add(g, { id: 'ph_raid_mirrors', n: 'Raid boss mirror clones', k: 'recolor', w: "The boss's own art at 60% alpha (src/game/raid.js)." });
  add(g, { id: 'ph_grimscale_head', n: 'Grimscale Head', k: 'recolor', w: "The boss's own art, tinted (src/game/raidsigs.js)." });
  for (const n of ['Frozen Corpse', 'Organ Pipe', 'Blood Thrall'])
    add(g, { id: 'ph_' + n.toLowerCase().replace(/ /g, '_'), n, k: 'recolor', w: 'A random zombie, golem or ghoul look, tinted (src/game/raidsigs.js); ASCII until a sheet loads.' });
  const AIR = B.BESTIARY.filter((a) => a.id.startsWith('ap_'));
  add(g, { id: 'ph_sea_captains', n: 'Pirate Seas captains', k: 'recolor', fr: AIR.filter((a) => a.captain).map((a) => artSrc(a.id)), w: 'The Air Pirate captains, hue-shifted and renamed per scenario (NAME_LOOKS in src/game/seabattle.js).' });
  add(g, { id: 'ph_sea_crew', n: 'Pirate Seas crews', k: 'recolor', fr: AIR.filter((a) => !a.captain).map((a) => artSrc(a.id)), w: 'The Air Pirate crews (src/game/seabattle.js): the seas have no crew art of their own.' });
  add(g, { id: 'ph_harpoon_line', n: 'Harpoon Line', k: 'code', w: 'A monster with a boarding-shield look whose draw is replaced by canvas strokes (src/game/seascen/harpoon_weather.js).' });
  add(g, { id: 'ph_haulfast_chain', n: 'Haulfast Chain', k: 'code', w: 'Canvas strokes drawn over a borrowed look (src/game/seascen/three_chains.js).' });
  add(g, { id: 'ph_singing_obelisk', n: 'Singing Obelisk (dune relic)', k: 'recolor', src: rep('crystal'), w: 'The Warding Crystal art (src/data/dunes.js).' });
  add(g, { id: 'ph_scarab_egg_sac', n: 'Scarab Egg Sac (dune relic)', k: 'recolor', src: artSrc('eb_m105'), w: 'An Eternal Breach monster look (src/data/dunes.js).' });
  add(g, { id: 'ph_canopic_jar', n: 'Canopic Jar (dune relic)', k: 'recolor', src: artSrc('gold_chalice'), w: 'A set 2 slime look (src/data/dunes.js).' });
  const SKY = ['cr1', 'cr2', 'da0', 'db7', 'ea1', 'ea2', 'ea6', 'ea12', 'ea14', 'eb17', 'wf0', 'wf4', 'wf5', 'wf9', 'wf10', 'wf11', 'wf12', 'wf13', 'wf14', 'wf16', 'ns_frost'];
  add(g, { id: 'ph_sky_story_foes', n: 'Sky Battle story foes', k: 'recolor', c: SKY.length, fr: SKY.map(artSrc).filter(Boolean), names: SKY.map((id) => ART_BY_ID[id]?.name || id),
    w: 'The Sky Battle stories use pet and minion art as enemies (src/data/skystories/).' });
}

// ====================================================================================== heroes
const CLS_NAME = {};
async function heroes() {
  section('heroes', 'Heroes & Armor', 'The 16 classes: menu portraits, the Grim Nocturne armors and helmets they wear in play, and what the hero still lacks.');
  const { CLASSES } = await imp('src/data/classes.js');
  for (const c in CLASSES) CLS_NAME[c] = c === 'arcane_sorcerer' ? 'Astronomer' : CLASSES[c].name;
  const cls = json('assets/sprites/gear/classes.json');
  const NOC = { dir: 'assets/source/gear_nocturne', cmd: 'python tools/nocturnegear.py build', doc: 'docs/art_style/00_START_HERE.md', code: 'src/core/gearart.js src/data/gear.js' };
  let g = group('Class portraits', { note: 'The hero select portraits, rendered from each class\'s first Nocturne armor.', cmd: 'node tools/selectportraits.js', code: 'src/ui/heroanim.js', dir: 'assets/source/gear_nocturne' });
  for (const c of cls) add(g, { id: 'portrait_' + c, n: CLS_NAME[c], k: 'art', src: [`assets/sprites/select/nocturne/${c}.webp`] });
  g = group('Body armor (Grim Nocturne)', { ...NOC, note: '26 armors per class (2-7 per rarity), recoloured in play by 69 palette finishes. This is the whole hero in play.' });
  for (const c of cls) {
    const gj = json(`assets/sprites/gear/${c}/gear.json`), [fw, fh] = gj.frame, n = gj.armor.n;
    add(g, { id: 'armor_' + c, n: `${CLS_NAME[c]} armors`, k: 'art', c: n, files: [`assets/sprites/gear/${c}/gear.json`, `assets/sprites/gear/${c}/armor_mask.png`],
      fr: Array.from({ length: n }, (_, i) => [`assets/sprites/gear/${c}/armor.webp`, [(i % gj.cols) * fw, Math.floor(i / gj.cols) * fh, fw, fh]]), names: gj.armor.names });
  }
  const hj = json('assets/sprites/gear/helmets/index.json');
  g = group('Enclosed helmets', { ...NOC, note: '15 helmets per class in three sets, fitted to each class\'s head.', cmd: 'python tools/nocturnegear.py build (nudges: Fit Helmets.cmd)' });
  hj.classes.forEach((c, ci) => add(g, { id: 'helmets_' + c, n: `${CLS_NAME[c] || c} helmets`, k: 'art', c: hj.designs.length, files: ['assets/sprites/gear/helmets/index.json'],
    fr: hj.designs.map((d) => ['assets/sprites/gear/helmets/atlas.webp', [ci * hj.frame[0], (d.id - 1) * hj.frame[1], hj.frame[0], hj.frame[1]]]), names: hj.designs.map((d) => d.name) }));
  g = group('The original 16-class sheet', { note: 'Cut from assets/FinalClasses/All 16 Classes.png. Still the fallback for the hero, Mirror Image and vendors, and the portraits of visiting adventurers and the Sky/Sea battle heroes.', cmd: 'python3 tools/process_assets.py select', code: 'src/core/assets.js src/game/render.js', dir: 'assets/FinalClasses' });
  for (const c of cls) add(g, { id: 'classsprite_' + c, n: `${CLS_NAME[c]} (full body)`, k: 'art', src: [`assets/sprites/classes/${c}.webp`] });
  for (const c of cls) add(g, { id: 'selectportrait_' + c, n: `${CLS_NAME[c]} (old portrait)`, k: 'art', src: [`assets/sprites/select/${c}.webp`] });
  g = group('Missing from the hero', { note: 'Planned in docs/art_style/00_START_HERE.md but not drawn.', doc: 'docs/art_style/00_START_HERE.md', code: 'src/core/gearart.js src/game/creature.js' });
  add(g, { id: 'ph_hero_anim', n: 'Hero animation frames', k: 'code', c: 16, names: cls.map((c) => CLS_NAME[c]),
    w: 'One still frame per armor. Walking, attacking, casting and dying are a bob, squash, lunge and mirror done in code (creature.drawArt).' });
  for (const [s, n] of [['hands', 'Gloves'], ['legs', 'Leg armor'], ['feet', 'Boots']])
    add(g, { id: 'ph_hero_' + s, n: `${n} on the hero`, k: 'none', src: rep('item_' + { hands: 'gloves', legs: 'legs', feet: 'boots' }[s]),
      w: `Only the head and body show on the hero (heroLook). ${n} have a single generic bag icon, tinted by material.` });
}

// ====================================================================================== summons
async function summons() {
  section('summons', 'Summons & Pets', "Everything the classes call up: animated pets, the Slime Lord's court, 3D turrets and companions, and the class signatures still drawn in code.");
  const { SUMMONS } = await imp('src/data/summons.js');
  const { CLASS_SKILLS } = await imp('src/data/skills.js');
  const { SLIME_SETS, setsOf } = await imp('src/gfx/slimeart.js');
  const PETS = json('assets/sprites/pets/catalog.json'), SL = json('assets/sprites/slimes/slimes.json');
  const owner = {}, by = {};
  for (const [c, list] of Object.entries(CLASS_SKILLS)) for (const s of list) if (s.kind === 'summon' && s.m?.sum) { (owner[s.m.sum] ||= c); (by[s.m.sum] ||= []).push(s.name); }
  const petFrames = (key) => { const m = PETS[key]; return m && Array.from({ length: m.frames }, (_, f) => [`assets/sprites/pets/${m.sheet}.webp`, [f * m.cellW, m.row * m.cellH, m.cellW, m.cellH]]); };
  const petThumb = (key) => { const m = PETS[key]; return m && [`assets/sprites/pets/${m.sheet}.webp`, [m.states.idle[0] * m.cellW, m.row * m.cellH, m.cellW, m.cellH]]; };
  const slimeFrames = (sets) => sets.filter((s) => SL[s]).map((s) => [`assets/sprites/slimes/${s}.webp`, [0, 0, SL[s].cw, SL[s].ch]]);
  const T3D = ['turret', 'flameturret', 'rocketturret', 'cryoturret'];
  const PET = { dir: 'assets/source/pet_animations', cmd: 'python tools/build_pet_animations.py', doc: 'docs/PET_SUMMON_ANIMATIONS.md', code: 'src/core/petart.js', v: 'tools/pet_viewer.html' };
  const groupsBy = {};
  const gFor = (c) => groupsBy[c] ??= group(c === 'other' ? 'Other summons and spare rows' : `${CLS_NAME[c] || titleCase(c)} summons`, { ...PET, note: c === 'slime_lord' ? "The Slime Lord's court: Glymmora slime sheets (src/gfx/slimeart.js)." : 'Mostly animated pet sheets (idle, walk, attack, summoned, cheer, scared, dead); each card says if not.' });
  const fallback = [];
  for (const [key, s] of Object.entries(SUMMONS)) {
    const c = owner[key] || (key.startsWith('kn_') || key === 'hoplite' || key === 'squire' || key === 'captain' ? 'lancer' : key.startsWith('sl') || s.slime || s.court ? 'slime_lord' : 'other');
    const arts = [].concat(s.look?.art || []);
    const base = { n: s.name || titleCase(key), names: by[key] ? [...new Set(by[key])].map((x) => 'Skill: ' + x) : ['Not summoned by any skill'] };
    if (T3D.includes(key)) {
      const tj = json(`assets/sprites/gunner/${key}.json`), S = tj.S, H = tj.head;
      add(gFor(c), { ...base, id: 'sum_' + key, k: '3d', y: 'model', files: [`assets/sprites/gunner/${key}.json`],
        fr: Array.from({ length: tj.dirs }, (_, i) => [`assets/sprites/gunner/${key}.webp`, [i * H.w * S, 0, H.w * S, H.h * S]]),
        w: 'Baked from a three.js model textured with the airship pack (tools/gunner3d.js, docs/GUNNER_3D.md).' });
    } else if (key === 'runeweapon') {
      add(gFor(c), { ...base, id: 'sum_' + key, k: '3d', y: 'model', fr: ['frozen_sand', 'funeral_sash', 'blank_epitaph', 'reliquary_sliver', 'verdigris_weeper'].map((k) => [`assets/fx/runeblade/runeblade3d_${k}.png`]),
        w: 'The live 3D Runeblade, built from painted views (src/gfx/runeblade3d.js, docs/RUNEBLADE_3D.md).' });
    } else if (s.slime || s.court) {
      const kind = key.startsWith('sl_') ? key.slice(3) : s.slime;
      let sets = { bombslime: KINDS_SETS('volatile'), motherooze: KINDS_SETS('mother'), slimetitan: setsOf('berserker') }[key] || (kind && SLIME_SETS ? setsOf(kind) : []);
      if (!sets?.length) sets = Object.keys(SL);
      add(gFor('slime_lord'), { ...base, id: 'sum_' + key, k: 'art', fr: slimeFrames(sets), c: sets.length,
        w: "Glymmora slime sheets (src/gfx/slimeart.js); each cast picks one of these sets." });
    } else if (PETS[key] || key === 'clone' || s.pool) {
      const keys = key === 'clone' ? ['clone_ranger', 'clone_arcane_sorcerer', 'clone_bard'] : s.pool && !PETS[key] ? s.pool.filter((p) => PETS[p]) : [key];
      add(gFor(c), { ...base, id: 'sum_' + key, k: 'art', thumb: petThumb(keys[0]), fr: keys.flatMap(petFrames),
        w: key === 'clone' ? 'Mirror Image: the Ranger, Astronomer and Bard have their own copies; other casters copy the hero.' : s.pool ? 'A pool of the skeleton pets above.' : 'An animated pet sheet (assets/sprites/pets/).' });
      if (arts.length) fallback.push([key, s, arts]);
    } else if (key === 'revive') {
      add(gFor(c), { ...base, id: 'sum_' + key, k: 'recolor', w: "Revive shows the corpse's own monster art tinted green (or its ASCII sprite)." });
    } else {
      const src = artSrc(arts[0]);
      add(gFor(c), { ...base, id: 'sum_' + key, k: arts[0]?.startsWith('va_') ? 'ai' : src ? 'recolor' : 'ascii', src, w: src ? 'No pet sheet: shows its stand-in look.' : 'No art: ASCII pixel sprite.' });
    }
  }
  for (const k of ['dkghoul', 'gale_marten']) if (PETS[k]) add(gFor('other'), { id: 'pet_' + k, n: titleCase(k) + ' (unused row)', k: 'art', thumb: petThumb(k), fr: petFrames(k), w: 'A pet row no summon uses.' });

  let g = group('Signature companions', { note: 'Class signatures (src/game/sigs/) and their companions.', code: 'src/game/sigs/' });
  const gs = json('assets/sprites/held/greatswords.json');
  add(g, { id: 'sig_dk_sword', n: 'Death Knight flying sword', k: '3d', y: 'model', fr: gs.designs.map((d) => ['assets/sprites/held/greatswords.webp', d.free]).filter((f) => f[1]),
    w: 'His equipped greatsword: a baked 2D sprite by default, or the live three.js model (setting dkBlade), textured from assets/source/materials.', d: '50 designs (tools/weapons3d_greatswords.js).' });
  const bj = json('assets/sprites/gunner/biplane.json');
  add(g, { id: 'sig_biplane', n: 'Gunner Bombing Run biplane', k: '3d', y: 'model', files: ['assets/sprites/gunner/biplane.json'],
    fr: Array.from({ length: bj.dirs }, (_, i) => ['assets/sprites/gunner/biplane.webp', [i * bj.body.w * bj.S, 0, bj.body.w * bj.S, bj.body.h * bj.S]]), w: 'Baked from three.js, textured with the airship pack.' });
  for (const s of ['round', 'diamond', 'kite', 'tower'])
    add(g, { id: 'sig_lancer_' + s, n: `Lancer spinning ${s} shield`, k: 'art', src: [`assets/fx/lancer/spinning_${s}.png`], w: 'A painted 4 x 2 turntable, spun as a 2.5D slab (src/gfx/lancershields.js).' });
  add(g, { id: 'sig_lancer_banner', n: 'Lancer cloth banner', k: 'art', fr: [['assets/fx/lancer/banner_skin.png'], ['assets/fx/lancer/banner_pole.png']], w: 'Painted skin and pole on a cloth simulation (src/gfx/lancerbanner.js).' });
  add(g, { id: 'sig_phoenix', n: 'Ranger golden phoenix', k: 'flat3d', y: 'model', fr: cap('phoenix'), w: 'A live WebGL model built in code (src/gfx/phoenix3d.js) with no textures.' });
  add(g, { id: 'sig_totem', n: 'Totem Master great totem', k: 'flat3d', y: 'model', fr: cap('totem'), w: 'A live WebGL model with a procedural wood shader (src/gfx/totem3d.js), no image textures.' });
  add(g, { id: 'sig_dk_skulls', n: 'Death Knight frost skulls', k: 'recolor', src: ['assets/ui/velscour_contact_skull.png'], w: 'The UI contact skull, recoloured frost blue (src/gfx/dkskull.js).' });
  for (const [id, n, f] of [['necro_lantern', 'Necromancer skull-lantern', 'necromancer'], ['witch_poppet', 'Carrion Witch hex poppet', 'witch'], ['wizard_orbs', 'Wizard orbiting orbs', 'wizard'],
    ['dk_wings', 'Dragon Knight flame wings', 'dragonknight'], ['dragoon_lances', 'Dragoon energy lances', 'lancefx']])
    add(g, { id: 'sig_' + id, n, k: 'code', w: `Drawn in code each frame (src/game/sigs/, ${f === 'lancefx' ? 'src/gfx/lancefx.js' : 'class signature'}); no art file.` });

  g = group('Load-time stand-ins', { note: 'Generated (va_) and familiar art these summons show only while their animated sheets load.', dir: 'assets/source/replacements', cmd: 'python tools/replacementart.py', doc: 'docs/SPRITE_REPLACEMENTS.md' });
  for (const [key, s, arts] of fallback) {
    const fr = arts.map(artSrc).filter(Boolean);
    if (fr.length) add(g, { id: 'fb_' + key, n: s.name || titleCase(key), k: arts[0].startsWith('va_') ? 'ai' : 'art', fr, c: arts.length > 1 ? arts.length : undefined });
  }
  function KINDS_SETS(k) { return { volatile: ['ember', 'volcano', 'ember_2', 'doom', 'blood_moon'], mother: ['tidal_beast', 'ice_emperor', 'deep_diver', 'music'] }[k]; }
  const { FAMILIAR_ART, SUMMON_ART } = await imp('src/data/bestiary.js');
  g = group('Pet and minion sheets', { note: 'The painted familiar and skeleton sheets behind the pet looks (most blue slime cells are catalogued but unused).', dir: 'assets/source/enemies/familiars', cmd: 'python3 tools/process_assets.py enemies familiars', doc: ENEMY_DOC });
  const bySheet = {};
  for (const a of [...SUMMON_ART, ...FAMILIAR_ART]) (bySheet[a.sheet] ||= []).push(a);
  for (const [sheet, list] of Object.entries(bySheet)) add(g, { id: 'sheet_' + sheet.replace(/\W+/g, '_'), n: titleCase(sheet.split('/').pop()), k: 'art', c: list.length, fr: list.map((a) => artSrc(a.id)).filter(Boolean), names: list.slice(0, 80).map((a) => a.name) });
}

// ====================================================================================== npcs
async function npcs() {
  section('npcs', 'Townsfolk & NPCs', 'The people and animals of Herrington Hollow and the road, the vendors, Homunculus the blacksmith, and the gilded critters.');
  const { TOWNSFOLK, ANIMALS } = await imp('src/data/townsfolk.js');
  const PEOPLE = { dir: 'assets/source', cmd: 'python tools/build_people_pack.py <VELSCOUR_People_and_Animals.zip>', doc: 'docs/PEOPLE_AND_ANIMALS.md', code: 'src/data/townsfolk.js src/game/townsfolkvisuals.js' };
  const strip = (v) => Array.from({ length: v.frame?.count || 10 }, (_, i) => [`assets/sprites/people/${v.spriteId}.webp`, [i * 256, 0, 256, 200]]);
  let g = group('Townsfolk', { ...PEOPLE, note: '47 painted people, each a strip of poses. Also the dungeon encounters, captives and castle story folk.' });
  for (const v of TOWNSFOLK) add(g, { id: 'folk_' + v.spriteId, n: v.name.includes(' ') || v.child ? `${v.name} (${v.role})` : `${v.name} the ${v.role}`, k: 'art', fr: strip(v) });
  g = group('Animals', { ...PEOPLE, note: 'Town animals and the dungeon rats.' });
  for (const v of ANIMALS) add(g, { id: 'animal_' + v.spriteId, n: `${v.name} (${v.species})`, k: 'art', fr: strip(v) });
  g = group('Homunculus the Proud', { note: 'The blacksmith: 30 poses cut from three painted sheets, and Varrow\'s great axe.', dir: 'assets/source/npc/homunculus', cmd: 'python tools/homunculus.py', code: 'src/game/homunculus.js src/gfx/homunculus.js' });
  const hu = json('assets/sprites/npc/homunculus.json');
  add(g, { id: 'npc_homunculus', n: 'Homunculus the Proud', k: 'art', c: Object.keys(hu.poses).length, names: Object.keys(hu.poses),
    fr: Object.values(hu.poses).map((i) => ['assets/sprites/npc/homunculus.webp', [i * hu.cell[0], 0, hu.cell[0], hu.cell[1]]]), files: ['assets/sprites/npc/homunculus.json'] });
  const va = json('assets/sprites/npc/varrow_axe.json'), aw = va.frame[0] * va.S, ah = va.frame[1] * va.S;
  add(g, { id: 'npc_varrow_axe', n: "Varrow's great axe", k: '3d', y: 'model', fr: Array.from({ length: va.n }, (_, i) => ['assets/sprites/npc/varrow_axe.webp', [i * aw, 0, aw, ah]]), files: ['assets/sprites/npc/varrow_axe.json'],
    w: 'Baked from three.js (tools/varrowaxe3d.js), skinned with chunks of the Runeblade skins.' });
  const { VENDORS } = await imp('src/world/town.js').catch(() => ({ VENDORS: [] }));
  g = group('Vendors', { note: 'Generated portraits (docs/SPRITE_REPLACEMENTS.md); the upgrader is Homunculus.', dir: 'assets/source/replacements', cmd: 'python tools/replacementart.py', doc: 'docs/SPRITE_REPLACEMENTS.md', code: 'src/world/town.js src/game/render.js' });
  const vend = Object.fromEntries((VENDORS || []).map((v) => [v.id, v.name]));
  for (const k of ['weapons', 'armor', 'enchant', 'alchemist', 'gems', 'socket', 'gamble', 'upgrade']) {
    if (k === 'upgrade') continue;
    add(g, { id: 'npc_' + k, n: vend[k] || titleCase(k), k: 'ai', src: rep('npc_' + k) });
  }
  for (const k of ['tobin', 'mira', 'cael', 'gorm']) add(g, { id: 'npc_' + k, n: `${titleCase(k)} (unused)`, k: 'ai', src: rep('npc_' + k), w: 'Generated villager art that nothing in src/ draws any more.' });
  g = group('Gilded critters', { note: 'The tappable critters (spectator play). Baked from procedural three.js models.', v: 'tools/critters3d.html', cmd: 'node tools/critters3d_bake.js', code: 'src/game/critters.js' });
  const cj = json('assets/sprites/critters/critters.json');
  for (const [k, s] of Object.entries(cj.sets)) {
    const n = s.dirs * s.frames;
    add(g, { id: 'critter_' + k, n: { wisp: 'Gilded Wisp', prism: 'Prism', moth: 'Starmoth', scarab: 'Golden Scarab' }[k] || titleCase(k), k: 'flat3d', y: 'model', files: ['assets/sprites/critters/critters.json'],
      fr: Array.from({ length: n }, (_, j) => { const i = s.at + j; return ['assets/sprites/critters/critters.webp', [(i % cj.cols) * cj.cell, Math.floor(i / cj.cols) * cj.cell, cj.cell, cj.cell]]; }),
      w: 'A three.js model with flat colours and canvas-made wings, baked to a sprite sheet (no image textures).' });
  }
  g = group('Borrowed people', { note: 'Characters shown with another character\'s art.', code: 'src/game/skybattle.js src/game/seabattle.js src/game/townlife.js' });
  add(g, { id: 'ph_sky_knights', n: 'Sky-Knights', k: 'recolor', fr: TOWNSFOLK.filter((v) => /knight|guard|veteran/.test(v.spriteId)).slice(0, 6).map((v) => strip(v)[0]), w: 'Knight townsfolk sheets with random hue shifts (src/game/skybattle.js).' });
  add(g, { id: 'ph_lampwardens', n: 'Pirate Seas Lampwardens (Pip, Brask, Tolland)', k: 'recolor', fr: ['25_royal_heir', '05_road_guard', '41_friar'].map((s) => TOWNSFOLK.find((v) => v.spriteId === s)).filter(Boolean).map((v) => strip(v)[0]),
    w: 'Pip is the royal heir hue-shifted; Brask and Tolland are the road guard and friar repainted in code (lampSheet in src/game/seabattle.js).' });
  add(g, { id: 'ph_visitors', n: 'Visiting adventurers', k: 'recolor', fr: json('assets/sprites/gear/classes.json').map((c) => [`assets/sprites/select/${c}.webp`]), w: 'The old class-select portraits standing in as full-body visitors in town (src/game/townlife.js).' });
  g = group('Retired: first townsfolk pack', { note: 'assets/sprites/townsfolk/ is no longer read (docs/PEOPLE_AND_ANIMALS.md). It could be deleted to save 66 MB.', doc: 'docs/PEOPLE_AND_ANIMALS.md' });
  const old = fs.readdirSync('assets/sprites/townsfolk').filter((f) => f.endsWith('.webp')).sort();
  add(g, { id: 'old_townsfolk', n: 'Old generated townsfolk', k: 'ai', c: old.length, fr: old.map((f) => [`assets/sprites/townsfolk/${f}`, [0, 0, 256, 192]]), w: 'Unused: replaced by the People and Animals pack.' });
}

// ====================================================================================== thumbnails + manifest
async function main() {
  for (const fn of SECTIONS) await fn();
  const job = { cell: 96, out: 'tools/assetmanager/thumbs', items: [] };
  for (const it of items) if (it._thumb && exists(it._thumb[0])) job.items.push([it.id, it._thumb[0], it._thumb[1] || null, it._tf, ...(it._pal ? [it._pal] : [])]);
  console.log(`thumbnails: ${job.items.length} crops…`);
  const py = spawnSync('python3', ['tools/assetmanager/thumbs.py'], { input: JSON.stringify(job), maxBuffer: 64 << 20, encoding: 'utf8' });
  if (py.status) { console.error(py.stderr); process.exit(1); }
  const th = JSON.parse(py.stdout);
  for (const [key, p, e] of th.bad) warn(`thumbnail ${key} (${p}): ${e}`);
  for (const it of items) { if (th.at[it.id]) it.t = th.at[it.id]; delete it._thumb; delete it._tf; delete it._pal; }
  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { /* not a checkout */ }
  const manifest = { built: new Date().toISOString(), commit, repo: 'Agilancer/velscour', branch: 'main', kinds: KINDS, sections, groups, files, sheets: th.sheets, items };
  fs.writeFileSync('tools/assetmanager/manifest.json', JSON.stringify(manifest));
  // report
  const tally = {};
  for (const it of items) { const s = sections[groups[it.g].s].id; (tally[s] ||= {})[it.k] = (tally[s][it.k] || 0) + 1; }
  console.table(tally);
  console.log(`${items.length} assets, ${groups.length} groups, ${files.length} files, ${th.sheets.length} thumbnail sheets`);
  if (warns.length) console.log(`${warns.length} warnings:\n  ` + warns.slice(0, 60).join('\n  ') + (warns.length > 60 ? `\n  … ${warns.length - 60} more` : ''));
}

// ====================================================================================== items
async function itemsSec() {
  section('items', 'Items & Loot', 'Bag and ground icons: gems, rings, gold, globes, potions, chests and the generic item icons, plus the loot still drawn in code.');
  const { WEAPONS, OFFHANDS, ARMORS, GEMS } = await imp('src/data/items.js');
  const R = { dir: 'assets/source/replacements', cmd: 'python tools/replacementart.py', doc: 'docs/SPRITE_REPLACEMENTS.md', code: 'src/core/replacementart.js src/game/loot.js' };
  const baseNames = {};
  for (const [k, b] of Object.entries({ ...WEAPONS, ...OFFHANDS, ...ARMORS })) (baseNames[b.icon || k] ||= []).push(...(b.names || [k]));
  let g = group('Gems', { ...R, note: 'One drawing per gem kind; tiers grow it, and tiers 6-9 add a halo and stars drawn in code.' });
  for (const k of Object.keys(REP).filter((k) => k.startsWith('gem_'))) add(g, { id: 'item_' + k, n: GEMS?.[k.slice(4)]?.name || titleCase(k.slice(4)), k: 'ai', src: rep(k) });
  g = group('Rings, gold and globes', R);
  for (const [k, n] of [['ring_0', 'Ring (common)'], ['ring_1', 'Ring (rare)'], ['ring_2', 'Ring (legendary and up)'], ['gold_1', 'Gold: small pile'], ['gold_2', 'Gold: pile'], ['gold_3', 'Gold: hoard'], ['orb_hp', 'Health globe'], ['orb_mp', 'Mana globe']])
    add(g, { id: 'item_' + k, n, k: 'ai', src: rep(k) });
  g = group('Generic item icons', { ...R, note: 'Weapons and off-hands normally show their 3D held design (Held Weapons); these show while that art loads. Gloves, leg armor and boots always use them, tinted by material.' });
  for (const k of Object.keys(REP).filter((k) => k.startsWith('item_'))) add(g, { id: 'icon_' + k, n: titleCase(k.slice(5)), k: 'ai', src: rep(k), names: [...new Set(baseNames[k.slice(5)] || [])].slice(0, 12) });
  g = group('Potions and chests', { note: 'Cut from the HUD bar and the dungeon mechanisms sheet.', dir: 'assets/source', cmd: 'python3 tools/process_assets.py ui|props', code: 'src/core/assets.js' });
  for (const c of ['red', 'blue', 'purple', 'orange']) add(g, { id: 'potion_' + c, n: `${{ red: 'Health', blue: 'Mana', purple: 'Rejuvenation', orange: 'Fury' }[c]} potion`, k: 'art', src: [`assets/ui/potion_${c}.png`] });
  const ch = json('assets/props/chests.json');
  for (const [k, r] of Object.entries(ch)) add(g, { id: 'chest_' + k, n: `Chest: ${titleCase(k.replace(/([A-Z])/g, ' $1'))}`, k: 'art', src: ['assets/props/chests.webp', rect(r)], files: ['assets/props/chests.json'] });
  const { HEIRLOOMS, COVENANTS } = await imp('src/data/relics.js');
  g = group('Drawn in code or borrowed', { note: 'Loot with no art file of its own.', code: 'src/game/loot.js src/gfx/notation.js src/data/relics.js' });
  add(g, { id: 'ph_sigils', n: 'Sigil Stones (20 ranks)', k: 'code', c: 20, fr: cap('sigils'), names: capNames('sigils'), w: 'sigilIcon() in src/game/loot.js draws each rank.' });
  add(g, { id: 'ph_abyssal_key', n: 'Abyssal Key', k: 'code', fr: cap('key'), w: 'keyIcon() in src/game/loot.js.' });
  add(g, { id: 'ph_sealed', n: 'Sealed treasure casket', k: 'code', fr: cap('sealed'), w: 'sealedIcon() in src/game/loot.js.' });
  add(g, { id: 'ph_music_sheet', n: 'Music Sheet', k: 'code', fr: cap('sheet'), names: capNames('sheet'), w: 'sheetIcon() in src/gfx/notation.js (blank, written and locked states).' });
  add(g, { id: 'ph_gem_halo', n: 'Gem tiers 6-9 (halo and stars)', k: 'code', fr: cap('gemtiers'), w: 'gemIcon() in src/gfx/pixelart.js adds a code-drawn halo and stars above tier 5.' });
  add(g, { id: 'ph_heirlooms', n: `Heirlooms (${HEIRLOOMS.length})`, k: 'recolor', c: HEIRLOOMS.length, names: HEIRLOOMS.map((h) => h.name), w: "No art of their own: they show their base item's held or gear icon (shapeRelic drops `art`)." });
  const pieces = COVENANTS.flatMap((c) => c.pieces || []);
  add(g, { id: 'ph_covenants', n: `Covenant set pieces (${pieces.length || COVENANTS.length})`, k: 'recolor', c: pieces.length || COVENANTS.length, names: (pieces.length ? pieces : COVENANTS).map((p) => p.name), w: "No art of their own: they show their base item's icon." });
}

// ====================================================================================== held weapons
async function weapons() {
  section('weapons', 'Held Weapons', 'Every weapon and off-hand in a hero\'s fist: 35 sets of 50 three.js designs baked to sprites and textured from the material library, the Death Knight\'s greatsword models, and the painted Paladin pack.');
  const idx = json('assets/sprites/held/index.json');
  let g = group('3D held sets', { note: 'Baked by tools/weapons3d_bake.js; 10 Common to 6 Mythic designs per set, recoloured in play by finish and element.', cmd: 'node tools/weapons3d_bake.js all', v: 'tools/weapons3d.html', code: 'tools/weapons3d.js src/gfx/heldart.js src/data/held.js', dir: 'assets/source/materials', doc: 'CLAUDE.md' });
  for (const [set, s] of Object.entries(idx.sets)) {
    const j = json(`assets/sprites/held/${set}.json`), D = j.designs;
    add(g, { id: 'held_' + set, n: `${titleCase(set)}${s.cls ? ` (${CLS_NAME[s.cls] || s.cls})` : ''}`, k: '3d', y: 'model', c: D.length, thumb: [`assets/sprites/held/${set}.webp`, D[D.length - 1].icon],
      fr: D.map((d) => [`assets/sprites/held/${set}.webp`, d.icon]), names: D.map((d) => d.name), files: [`assets/sprites/held/${set}.json`], d: `${s.slot === 'offhand' ? 'Off-hand' : 'Weapon'} set, ${s.hand === 'L' ? 'left' : 'right'} hand.` });
  }
  const gi = json('assets/models/held/greatswords/index.json');
  g = group('Greatsword models (live 3D)', { note: 'three.js JSON models of the 50 Death Knight greatswords, textured from assets/source/materials; his flying sword when the dkBlade setting is "model".', v: 'tools/dkblade.html', cmd: 'node tools/weapons3d_bake.js greatswords', code: 'src/gfx/heldmodel3d.js tools/weapons3d_greatswords.js' });
  const gs = json('assets/sprites/held/greatswords.json');
  add(g, { id: 'greatsword_models', n: 'Death Knight greatswords', k: '3d', y: 'model', c: gi.length, fr: gs.designs.map((d) => ['assets/sprites/held/greatswords.webp', d.free || d.icon]),
    names: gi.map((m) => `${m.name} (${m.form})`), files: ['assets/models/held/greatswords/index.json', ...gi.slice(0, 3).map((m) => `assets/models/held/greatswords/${m.file}`)] });
  const pj = json('assets/sprites/classes/paladin/paladin.json');
  g = group('Paladin class pack', { note: 'The only class art pack so far: 42 painted weapons and 18 shields (catalog items win over held art).', dir: 'assets/source/classes/paladin', cmd: 'python3 tools/process_assets.py classes paladin', doc: 'docs/CLASS_ART.md', code: 'src/core/classart.js src/data/classart.js' });
  for (const [id, it] of Object.entries(pj.items)) add(g, { id: 'pal_' + id, n: it.name, k: 'art', src: ['assets/sprites/classes/paladin/items.webp', it.rect], d: `${it.rarity} ${it.kind}`, files: ['assets/sprites/classes/paladin/paladin.json'] });
}

// ====================================================================================== effects
async function effects() {
  section('effects', 'Spells, Effects & Icons', 'Skill icons, spell effects, gore and the class effect art. Most spell effects and every skill icon are still drawn in code.');
  const pj = json('assets/sprites/classes/paladin/paladin.json');
  let g = group('Paladin ability effects', { note: '60 painted six-frame effect strips (start, gather, release, peak, decay, fade).', dir: 'assets/source/classes/paladin', cmd: 'python3 tools/process_assets.py classes paladin', doc: 'docs/CLASS_ART.md', code: 'src/gfx/artfx.js src/data/classart.js' });
  for (const [id, f] of Object.entries(pj.fx)) add(g, { id: 'palfx_' + id, n: f.name, k: 'art', d: f.desc, fr: Array.from({ length: 6 }, (_, i) => [`assets/sprites/classes/paladin/fx/${id}.webp`, [i * f.cell[0], 0, f.cell[0], f.cell[1]]]), thumb: [`assets/sprites/classes/paladin/fx/${id}.webp`, [3 * f.cell[0], 0, f.cell[0], f.cell[1]]] });
  g = group('Gore', { note: 'Painted gib chunks, plus bone gibs baked from three.js models.', code: 'src/gfx/vfx.js src/gfx/bonegibs.js', dir: 'assets/source/gibs' });
  const gj = json('assets/sprites/gibs.json');
  for (const [k, list] of Object.entries(gj)) add(g, { id: 'gibs_' + k, n: `${titleCase(k)} gibs`, k: 'art', c: list.length, fr: list.map((r) => ['assets/sprites/gibs.webp', r]), files: ['assets/sprites/gibs.json'] });
  const bo = json('assets/sprites/bones.json');
  for (const [k, b] of Object.entries(bo.bones)) add(g, { id: 'bones_' + k, n: `${titleCase(k)} (bone gib)`, k: 'flat3d', y: 'model', tf: 'g', fr: b.t.map((t) => ['assets/sprites/bones.webp', t.slice(0, 4)]), files: ['assets/sprites/bones.json'],
    w: 'Baked from a three.js model (tools/bones3d.js) into a data sheet the game paints in bone and blood colours; no image texture.' });
  g = group('Effect sprites', { note: 'Generated silhouettes tinted by the skill element.', dir: 'assets/source/replacements', cmd: 'python tools/replacementart.py', doc: 'docs/SPRITE_REPLACEMENTS.md', code: 'src/gfx/shapes.js' });
  add(g, { id: 'fx_wolf', n: 'Wolf projectile', k: 'ai', src: rep('fx_wolf') });
  add(g, { id: 'fx_dragon', n: 'Dragon projectile', k: 'ai', src: rep('fx_dragon') });

  const { CLASS_SKILLS } = await imp('src/data/skills.js');
  const { CLASSES } = await imp('src/data/classes.js');
  g = group('Skill icons', { note: 'Every skill icon is a gradient and a shape drawn by skillIcon() in src/ui/icons.js; only summon skills show their summon\'s art. No painted skill icons exist yet.', code: 'src/ui/icons.js', doc: 'docs/PLACEHOLDER_ART.md' });
  for (const [c, list] of Object.entries(CLASS_SKILLS)) {
    const code = list.filter((s) => s.kind !== 'summon');
    add(g, { id: 'skillicons_' + c, n: `${CLS_NAME[c] || CLASSES[c]?.name || c} skill icons`, k: 'code', c: code.length, fr: cap('skills_' + c), names: code.map((s) => s.name),
      w: `${code.length} of ${list.length} skills draw a code icon (${c === 'bard' ? 'notation glyphs' : c === 'arcane_sorcerer' ? 'heavenly bodies and shapes' : 'element gradient and a shape per kind'}); summon skills use the summon's art.` });
  }
  const shapes = [...new Set((fs.readFileSync('src/gfx/shapes.js', 'utf8').match(/case '([a-z_0-9]+)'/g) || []).map((s) => s.slice(6, -1)))];
  const { GEAR_FX } = await imp('src/data/gear.js');
  const lance = [...fs.readFileSync('src/gfx/lancefx.js', 'utf8').matchAll(/^\s+'([A-Z][^']+)': \{ trail/gm)].map((m) => m[1]);
  g = group('Spell effects drawn in code', { note: 'Projectiles, blasts, beams, auras and portals: shapes, gradients and particles. Only the Paladin has painted effects.', doc: 'docs/PLACEHOLDER_ART.md', code: 'src/gfx/vfx.js src/gfx/shapes.js' });
  const FX = [
    ['projectiles', 'Projectiles and missiles', 'src/gfx/shapes.js', shapes, 'drawShape() draws each projectile kind as canvas shapes.', 'shapes'],
    ['blasts', 'Explosions, novas and rings', 'src/gfx/vfx.js src/gfx/shapes.js', ['Ring', 'explosionFx', 'Column', 'Sigil'], 'Ring, Column and explosionFx in vfx.js / shapes.js.'],
    ['beams', 'Beams, slashes and lightning', 'src/gfx/vfx.js', ['Beam', 'Slash', 'Bolt'], 'Beam, Slash and Bolt classes in vfx.js.'],
    ['telegraphs', 'Boss telegraphs and ground warnings', 'src/gfx/vfx.js src/game/raid.js', ['Telegraph'], 'Telegraph in vfx.js.'],
    ['auras', 'Gear auras (20 presets)', 'src/gfx/gearfx.js src/data/gear.js', GEAR_FX.map((f) => f.name), 'gearfx.js particles round the hero for rare-and-up gear.'],
    ['heldfx', 'Held weapon glows and gem dots', 'src/gfx/heldfx.js', [], 'heldfx.js draws rarity effects on held gear.'],
    ['lance', 'Dragoon leap lances and trails', 'src/gfx/lancefx.js', lance, 'lancefx.js: a glowing lance and a trail per leap skill.'],
    ['whirl', 'Barbarian Whirlwind cyclone', 'src/gfx/barbarianwhirl.js', [], 'barbarianwhirl.js.'],
    ['notation', 'Bard notation projectiles and staves', 'src/gfx/notation.js', [], 'notation.js engraves notes, glyphs and staves.'],
    ['cosmos', 'Astronomer star charts and heavenly bodies', 'src/gfx/cosmos.js', [], 'cosmos.js.'],
    ['classfx', 'Class effects (auras, halos, signatures)', 'src/gfx/classfx.js', [], 'classfx.js.'],
    ['portals', 'Town portal and exit gates', 'src/game/render.js', [], 'drawPortal() in render.js.'],
    ['riftgate', 'The Riftgate', 'src/gfx/riftgate.js', [], 'riftgate.js (the way into VELSCOUR DEFENSE).'],
    ['torchflame', 'Torch flames and embers', 'src/gfx/walltorches.js', [], 'The holders are painted; the flame is drawn in code.'],
  ];
  for (const [id, n, code, names, w, c] of FX) add(g, { id: 'fx_' + id, n, k: 'code', names, c: names.length > 1 ? names.length : undefined, fr: cap('fx_' + id), w: `${w} (${code})` });
  add(g, { id: 'fx_hammer3d', n: 'Paladin spinning hammers', k: 'flat3d', y: 'model', fr: cap('hammer'), w: 'Canvas-2D 3D prisms with flat colours (src/gfx/hammer3d.js).' });
  add(g, { id: 'fx_boomerang3d', n: 'Boomerang Knight boomerangs and chakrams', k: 'flat3d', y: 'model', fr: cap('boomerang'), names: capNames('boomerang'), w: 'Canvas-2D 3D models with flat colours (src/gfx/boomerang3d.js).' });
}

// ====================================================================================== environments
async function environments() {
  section('environments', 'Environments & Textures', 'Dungeon biomes, overworlds and their tile packs, the 3D scenes and ships, and the texture library the 3D models are painted with.');
  const { BIOMES } = await imp('src/data/biomes.js');
  const PACKS = { catacombs: 'Catacombs', castle_keep: 'Castle Keep', cathedral_graveyard: 'Cathedral and Graveyard', sewers: 'Sewers', dark_forest: 'Dark Forest', eternal_breach: 'Eternal Breach (walls)', veilscar_march: 'Veilscar March (floors and props)' };
  const P = {};
  for (const k in PACKS) P[k] = json(`assets/tiles/${k}/pack.json`);
  const biggest = (pack, list) => { const s = P[pack].scatter; const ids = list || s.map((_, i) => i); let b = ids[0]; for (const i of ids) if (s[i] && s[i].w * s[i].h > s[b].w * s[b].h) b = i; return [`assets/tiles/${pack}/scatter.webp`, rect(s[b])]; };
  const scatterIds = (b) => { const r = b.part?.scatter; return r ? r.flatMap(([a, z]) => Array.from({ length: z - a + 1 }, (_, i) => a - 1 + i)).filter((i) => P[b.pack].scatter[i]) : null; };
  const BA = { doc: 'docs/BIOME_ART.md', code: 'src/data/biomes.js src/core/assets.js', cmd: 'python3 tools/process_assets.py biomes', dir: 'assets/source/biomes' };
  const OUT = new Set(['overworld', 'castle', 'sea_of_sand', 'dark_forest', 'skyship', 'pirate_seas', 'serpentine_tower', 'depths_edge']);
  let g = group('Dungeon biomes', { ...BA, note: 'Dungeons are built from the painted packs; most biomes recolour a pack (palette swap) and borrow floors and props from others.' });
  for (const b of BIOMES.filter((b) => !OUT.has(b.id))) {
    const own = !b.palette, packs = [b.pack, b.wallPack, ...(b.morePacks || []).map((m) => m[0]), ...(b.moreFloors || []).map((m) => m[0])].filter(Boolean);
    const k = b.painted ? 'ai' : own ? 'art' : 'recolor';
    const src = b.painted ? ['assets/tiles/approved_biomes/props.webp', [0, ({ desert_temple: 0, ice_temple: 1, hell: 2, astral_plane: 3, heavenly: 4 }[b.id]) * 80, 80, 80]] : b.id === 'throne' ? ['assets/tiles/throne/velscour_throne.webp'] : biggest(b.pack, scatterIds(b));
    add(g, { id: 'biome_' + b.id, n: b.name, k, y: 'texture', thumb: src, pal: b.painted ? null : b.palette,
      fr: [src, ...P[b.pack].floors.slice(0, 12).map((f) => [`assets/tiles/${b.pack}/floors.webp`, rect(f)])],
      w: b.painted ? `Its own painted floors and props (assets/tiles/approved_biomes/), over the ${PACKS[b.pack]} pack recoloured.` : own ? `Its own ${PACKS[b.pack]} pack.` : `The ${[...new Set(packs)].map((p) => PACKS[p] || p).join(' + ')} pack art recoloured with a palette swap: no art of its own.`,
      d: `Layout style: ${b.style}.` });
  }
  g = group('Overworlds and special areas', { note: 'The outdoor maps and challenge areas.', code: 'src/world/ src/gfx/' });
  const sky = json('assets/tiles/skyship/index.json');
  const skyFr = (k) => { const f = sky.sprites[k].f[0]; return [`assets/tiles/skyship/${sky.pages[f[0]]}`, f.slice(1, 5)]; };
  const AREAS = [
    ['town', 'Herrington Hollow (town)', 'art', ['docs/art-review/town.png'], 'The Overworld and Town pack: ground, buildings, trees and props.', 'docs/ART.md'],
    ['overworld', 'The Forsaken Wilds', 'art', ['assets/tiles/approved_biomes/forsaken_wilds_supplemental.webp', [0, 0, 128, 128]], 'The town pack plus imported trees, scatter, shrines and a caravan. Code-drawn fallbacks remain for some shrines.', 'docs/OVERWORLD.md'],
    ['castle', 'The Castle (11 variants)', 'art', ['art-review/castle-walltops-landmarks.png'], "The user's Castle artwork pack, height-mapped ramparts and a baked 3D bake per variant.", 'docs/CASTLE_OVERWORLD.md'],
    ['sea_of_sand', 'Sea of Sand (classic maze)', 'art', ['assets/tiles/sea_of_sand/tree.webp', rect(SOS.atlases.tree[0])], 'The Sea of Sand pack.', 'docs/SEA_OF_SAND.md'],
    ['dunes', 'Sea of Sand dunes and pyramids', 'recolor', null, 'Live three.js: the sand is the Sea of Sand floor art recoloured, tomb and pyramid masonry is drawn in code, props bake with flat colours (src/gfx/dunes3d.js).', 'docs/SEA_OF_SAND_DUNES.md'],
    ['dark_forest', 'The Dark Forest', 'art', ['assets/tiles/dark_forest/trees.webp', rect(json('assets/tiles/dark_forest/trees.json').trees[0])], 'The Dark Forest pack and its 15 towering trees.', 'docs/DARK_FOREST.md'],
    ['mountainside', 'Mountainside (beta)', 'recolor', null, 'Town and Dark Forest floors recoloured, with procedural rock cliffs (src/gfx/mountainart.js, src/gfx/terrain.js).', 'docs/MOUNTAINSIDE.md'],
    ['breach', 'The Eternal Breach', 'art', exists('assets/The_Eternal_Breach_Expanded_Pack/The_Eternal_Breach/Overview.png') ? ['assets/The_Eternal_Breach_Expanded_Pack/The_Eternal_Breach/Overview.png'] : null, 'Veilscar March floors and props, Eternal Breach walls. The void and island undersides are drawn in code.', 'docs/ETERNAL_BREACH.md'],
    ['skyship', 'The Sky Lanes (Sky Battle)', '3d', skyFr('galleon'), 'Airships baked from three.js models textured with the airship pack; the sky and clouds are drawn in code.', 'docs/SKY_BATTLE.md'],
    ['pirate_seas', 'The Pirate Seas', '3d', null, 'Live three.js ships textured with the airship pack; the sea is a procedural shader.', 'docs/PIRATE_SEAS.md'],
    ['serpentine_tower', 'The Serpentine Tower', '3d', null, 'Live three.js: castle and airship textures recoloured per variant, canvas emblems and sky.', 'docs/SERPENTINE_TOWER.md'],
    ['depths_edge', "Depth's Edge Caverns", '3d', ['assets/tiles/depths_edge/hd/DEC-HD01.webp'], "Live three.js caverns textured with the Depth's Edge pack, recoloured per variant.", 'docs/DEPTHS_EDGE.md'],
    ['throne', "Velscour's throne", 'art', ['assets/tiles/throne/velscour_throne.webp'], "The throne dais from the user's Castle artwork, recoloured red (src/gfx/velscourthrone.js).", 'docs/HANDOFF.md'],
  ];
  for (const [id, n, k, src, w, doc] of AREAS) add(g, { id: 'area_' + id, n, k, y: k === '3d' ? 'model' : 'texture', src: src || undefined, w, files: doc ? [doc] : [] });

  g = group('Dungeon tile packs', { ...BA, note: 'Each pack: 60 floors, walls in 16 joins with arches and doors, and 40 props (160 x 80 template).' });
  for (const [k, name] of Object.entries(PACKS)) {
    const p = P[k], dir = `assets/tiles/${k}`;
    add(g, { id: `pack_${k}_floors`, n: `${name}: floors`, k: 'art', y: 'texture', c: p.floors.length, fr: p.floors.map((f) => [`${dir}/floors.webp`, rect(f)]), names: p.floors.map((f) => f.name), files: [`${dir}/pack.json`] });
    const walls = [];
    for (const fam of Object.values(p.walls || {})) for (const m of ['10', '5', '0']) { const v = fam[m]?.[0]; if (v) { const best = v.reduce((a, b) => (b[3] * b[4] > a[3] * a[4] ? b : a)); walls.push([`${dir}/walls.webp`, best.slice(1, 5)]); } }
    for (const d of Object.values(p.arches || {})) { const v = Object.values(d)[0]; if (v?.length) walls.push([`${dir}/walls.webp`, v.reduce((a, b) => (b[3] * b[4] > a[3] * a[4] ? b : a)).slice(1, 5)]); }
    if (walls.length) add(g, { id: `pack_${k}_walls`, n: `${name}: walls and arches`, k: 'art', y: 'texture', c: walls.length, fr: walls, files: [`${dir}/pack.json`] });
    add(g, { id: `pack_${k}_scatter`, n: `${name}: props`, k: 'art', y: 'texture', c: p.scatter.length, fr: p.scatter.map((f) => [`${dir}/scatter.webp`, rect(f)]), names: p.scatter.map((f) => f.name), thumb: biggest(k), files: [`${dir}/pack.json`] });
  }
  const ap = 'assets/tiles/approved_biomes';
  g = group('Temple biome and wilds art', { note: 'The five temple biomes\' painted floors and props, and the Forsaken Wilds trees and scatter.', doc: 'docs/APPROVED_BIOME_ART.md', code: 'src/gfx/approvedbiomeart.js src/gfx/overworldart.js' });
  const grid = (f, w, h, cols, rows) => Array.from({ length: cols * rows }, (_, i) => [`${ap}/${f}`, [(i % cols) * w, Math.floor(i / cols) * h, w, h]]);
  add(g, { id: 'approved_floors', n: 'Temple floors', k: 'art', y: 'texture', c: 40, fr: grid('floors.webp', 80, 40, 8, 5), px: 1 });
  add(g, { id: 'approved_props', n: 'Temple props', k: 'art', y: 'texture', c: 40, fr: grid('props.webp', 80, 80, 8, 5) });
  add(g, { id: 'wilds_scatter', n: 'Forsaken Wilds scatter', k: 'art', y: 'texture', c: 20, fr: grid('velscour_overworld_scatter.webp', 80, 80, 5, 4), doc: 'docs/OVERWORLD_SCATTER_ART.md' });
  add(g, { id: 'wilds_supplemental', n: 'Forsaken Wilds shrines, caravan and trees', k: 'art', y: 'texture', c: 16, fr: grid('forsaken_wilds_supplemental.webp', 128, 128, 4, 4) });
  add(g, { id: 'wilds_variants', n: 'Overworld variants', k: 'art', y: 'texture', c: 15, fr: grid('velscour_variants.webp', 80, 80, 5, 3) });

  const cp = json('assets/tiles/castle/pack.json');
  g = group('Castle artwork pack', { note: "The user's VELSCOUR_Castle_Artwork_Complete.zip, cut into 20 atlases.", dir: 'assets/source/biomes', cmd: 'python tools/castleramparts.py', doc: 'docs/CASTLE_OVERWORLD.md', code: 'src/gfx/castle.js src/gfx/castlewalls.js' });
  for (const [cat, list] of Object.entries(cp.atlases)) add(g, { id: 'castle_' + cat, n: `Castle: ${titleCase(cat)}`, k: 'art', y: 'texture', c: list.length, fr: list.map((f) => [`assets/tiles/castle/${cat}.webp`, rect(f)]), names: list.map((f) => f.name), files: ['assets/tiles/castle/pack.json'] });
  add(g, { id: 'castle_ramparts', n: 'Castle: rampart textures', k: 'art', y: 'texture', src: ['assets/tiles/castle/ramparts.webp'], files: ['assets/tiles/castle/ramparts.json'] });

  g = group('Castle 3D bakes', { note: 'One three.js bake per castle variant (masonry textured from the Castle Keep pack).', v: 'tools/castle3d.html', cmd: 'node tools/castle3d_bake.js <id>; python tools/castle3d.py pack <id>', doc: 'docs/CASTLE_3D.md', code: 'src/gfx/castle3dart.js' });
  const variants = ['', ...fs.readdirSync('assets/tiles/castle3d').filter((f) => fs.statSync(`assets/tiles/castle3d/${f}`).isDirectory())];
  for (const v of variants) {
    const dir = `assets/tiles/castle3d${v ? '/' + v : ''}`, ix = json(`${dir}/index.json`);
    const top = ix.pieces.map((p, i) => [p, i]).sort((a, b) => b[0][3] * b[0][4] - a[0][3] * a[0][4]).slice(0, 48).map(([p]) => [`${dir}/${ix.pages[p[0]]}`, p.slice(1, 5)]);
    add(g, { id: 'castle3d_' + (v || 'ironcrown'), n: `${titleCase(v || 'ironcrown')} castle`, k: '3d', y: 'model', fr: top, c: ix.pieces.length, files: [`${dir}/index.json`] });
  }
  g = group('Ships and airships', { note: 'Sky Battle ships are baked; the Pirate Seas fleet is built live in three.js. All textured with the airship pack.', v: 'tools/seaships3d.html', code: 'tools/sea3d.js src/gfx/seabattle3d.js src/gfx/skyship.js', doc: 'docs/PIRATE_SEAS.md', dir: 'assets/source/airship' });
  for (const k of Object.keys(sky.sprites)) add(g, { id: 'sky_' + k, n: `Sky Battle: ${titleCase(k)}`, k: '3d', y: 'model', fr: sky.sprites[k].f.slice(0, 24).map((f) => [`assets/tiles/skyship/${sky.pages[f[0]]}`, f.slice(1, 5)]), files: ['assets/tiles/skyship/index.json'] });
  for (const f of fs.readdirSync('tools').filter((f) => /^seaship3d_.*\.js$/.test(f)).sort()) {
    const k = f.slice(10, -3);
    add(g, { id: 'sea_' + k, n: `Pirate Seas: ${k === 'props' ? 'mines, flotsam, buoys and wrecks' : k === 'small' ? 'longboat, cutter and small craft' : k === 'jets' ? 'Kestrel and Thunderhawk jets' : titleCase(k)}`, k: '3d', y: 'model', fr: cap('sea_' + k),
      files: ['tools/' + f], w: 'A live three.js model textured with the airship pack and canvas cloth (no baked preview).' });
  }

  g = group('Wall dressing', { note: 'Torch holders (the flames are code) and wall hangings, hue-shifted per biome.', code: 'src/gfx/walltorches.js src/gfx/wallhangings.js', dir: 'assets/source/biome-variants' });
  for (let s = 1; s <= 4; s++) for (let r = 0; r < 5; r++) add(g, { id: `torch_${s}_${r}`, n: `Torch holder ${(s - 1) * 5 + r + 1}`, k: 'art', y: 'texture', fr: Array.from({ length: 4 }, (_, c) => [`assets/fx/wall_torches/holders_${s}.webp`, [c * 96, r * 96, 96, 96]]), doc: 'docs/WALL_TORCH_HOLDERS.md' });
  const wh = json('assets/fx/wall_hangings/manifest.json');
  for (const it of wh.items) add(g, { id: 'hang_' + it.id, n: titleCase(it.id), k: 'ai', y: 'texture', fr: Array.from({ length: 4 }, (_, c) => [`assets/fx/wall_hangings/hangings_${it.atlas}.webp`, [c * 96, it.row * 96, 96, 96]]), files: ['assets/fx/wall_hangings/manifest.json'],
    w: 'Generated décor (docs/WALL_HANGINGS.md), four authored views.' });
  const ckh = json('assets/tiles/castle_keep/wall_hangings.json');
  for (const it of ckh.items) add(g, { id: 'ckhang_' + it.id, n: `Castle Keep: ${it.name || titleCase(it.id)}`, k: 'art', y: 'texture', fr: it.views.map((v) => ['assets/tiles/castle_keep/wall_hangings.webp', rect(v)]) });

  g = group('3D texture library', { note: 'The material swatches the 3D models are painted with: held weapons, ships, castles, the tower and the caverns.', code: 'tools/handheld3d.js tools/castle3d.py src/gfx/cave3d.js' });
  const mat = 'assets/source/materials/textures';
  for (const cat of fs.readdirSync(mat).sort()) for (const f of fs.readdirSync(`${mat}/${cat}`).filter((f) => f.endsWith('.png')).sort())
    add(g, { id: 'mat_' + f.slice(0, -4), n: titleCase(f.slice(0, -4).replace(/^[A-Z]+-\d+_/, '')) + ` (${cat.replace('_', ' ')})`, k: 'art', y: 'texture', src: [`${mat}/${cat}/${f}`], tf: 'n' });
  for (const f of fs.readdirSync('assets/source/castle3d/tex').filter((f) => f.endsWith('.png')).sort()) {
    const roof = f.startsWith('roof_');
    add(g, { id: 'c3dtex_' + f.slice(0, -4), n: `Castle 3D: ${titleCase(f.slice(0, -4))}`, k: roof ? 'code' : 'art', y: 'texture', src: [`assets/source/castle3d/tex/${f}`], tf: 'n',
      w: roof ? 'Generated in Python (ROOFS in tools/castle3d.py), not painted.' : 'Cut from the Castle Keep pack.' });
  }
  for (const sub of ['tex', 'hd', 'water']) for (const f of fs.readdirSync(`assets/tiles/depths_edge/${sub}`).filter((f) => f.endsWith('.webp')).sort())
    add(g, { id: 'dec_' + f.slice(0, -5), n: `Depth's Edge ${sub === 'hd' ? 'HD rock' : sub === 'water' ? 'water' : 'rock'} ${f.slice(0, -5)}`, k: 'art', y: 'texture', src: [`assets/tiles/depths_edge/${sub}/${f}`], tf: 'n' });
}

// ====================================================================================== ui
async function ui() {
  section('ui', 'Interface', 'The HUD, buttons, logo and credits, and the parts of the interface that are still CSS and code.');
  const U = { dir: 'assets/source', cmd: 'python3 tools/process_assets.py ui', code: 'src/ui/hud.js css/style.css' };
  let g = group('HUD and buttons', { ...U, note: 'Cut from hud_bar.webp and hud_frames.webp.' });
  const hj = json('assets/ui/hud.json');
  add(g, { id: 'ui_hud', n: 'HUD bar (orbs, 15 skill and 4 potion slots)', k: 'art', src: ['assets/ui/hud.webp'], files: ['assets/ui/hud.json'] });
  for (const f of ['hud-orbs', 'hud-orb-life', 'hud-orb-mana']) add(g, { id: 'ui_' + f, n: titleCase(f.replace('hud-', '')), k: 'art', src: [`assets/ui/${f}.webp`] });
  add(g, { id: 'ui_minimap_ring', n: 'Minimap ring', k: 'art', src: ['assets/ui/minimap_ring.webp'] });
  for (const b of hj.buttons.names) add(g, { id: 'ui_btn_' + b, n: `${titleCase(b)} button`, k: 'art', src: [`assets/ui/btn_${b}.webp`] });
  g = group('Logo, icon and credits', { dir: 'assets/source', cmd: 'python3 tools/process_assets.py ui', code: 'src/ui/screens.js' });
  add(g, { id: 'ui_logo', n: 'VELSCOUR logo', k: 'art', src: ['assets/ui/logo.webp'] });
  add(g, { id: 'ui_icon', n: 'App icon', k: 'art', src: ['assets/ui/icon.png'], px: 1 });
  for (const f of fs.readdirSync('assets/ui').filter((f) => f.startsWith('credits-'))) add(g, { id: 'ui_' + f.split('.')[0], n: `Credits: ${titleCase(f.split('.')[0].slice(8))}`, k: 'art', src: [`assets/ui/${f}`] });
  add(g, { id: 'ui_contact_skull', n: "Velscour's contact skull", k: 'art', src: ['assets/ui/velscour_contact_skull.png'] });
  g = group('Still CSS or code', { note: 'Interface parts with no art file.', code: 'css/style.css src/ui/' });
  const { EMOTE_ICONS } = await imp('src/gfx/emotes.js').catch(() => ({ EMOTE_ICONS: [] }));
  add(g, { id: 'ph_emotes', n: `Townsfolk emotion icons (${EMOTE_ICONS.length})`, k: 'ascii', c: EMOTE_ICONS.length, names: EMOTE_ICONS, fr: cap('emotes'), w: '11 x 11 text grids in src/gfx/emotes.js.' });
  add(g, { id: 'ph_panels', n: 'Panels, tooltips and menus', k: 'code', w: 'Inventory, skill tree, vendors, stash and every dialog are CSS boxes and gradients (css/style.css), no frame art.' });
  add(g, { id: 'ph_cursor', n: 'Mouse cursor', k: 'code', w: 'An inline SVG in css/style.css.' });
  add(g, { id: 'ph_title_fx', n: 'Title flames and eyes', k: 'code', w: 'Drawn in code (src/ui/titlefx.js) over the painted logo.' });
  add(g, { id: 'ph_death_screen', n: 'Death and victory screens', k: 'code', w: 'Text over a dark backdrop (src/ui/screens.js); the victory screen adds the logo.' });
  add(g, { id: 'ph_minimap', n: 'Minimap contents', k: 'code', w: 'Walls, foes and markers drawn as coloured dots and lines.' });
}

const SECTIONS = [monsters, heroes, summons, npcs, itemsSec, weapons, effects, environments, ui];
await main();
