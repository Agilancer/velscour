// ACT III (docs/PHOBOS.md): Bellmourn, City State Phobos and Castle Velscour, played. The maps are world/phobos.js
// (the city) and world/castlevelscour.js (a hundred floors); the raid bosses game/phobosraids.js. Both kinds of level
// are regions (game/regions.js), so game.buildDungeon builds them like any level; their runs here keep Act III's own
// progress in c.phobos and never touch the descent's depth.
//
// c.phobos: { q: quest index, qAt: {kills, raids, deepest} when the quest began, bell: Bellmourn's waypoint open,
//   city: Phobos open, gate: the Castle Gate open, floor: the highest castle floor reached, cleared: {floor: true},
//   wards: [ward boss ids slain], hubs: {hub id: true}, vWins: Velscour's falls, vSeen: [battles won] }
import { G } from '../state.js';
import { rand, chance, pick, dist, angleTo, clamp, TAU, escapeHtml } from '../core/util.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Column, floatText, sparkle, addLight, glowSprite, burst } from '../gfx/vfx.js';
import { UI } from '../ui/ui.js';
import { registerRegion } from './regions.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { SHEER } from '../data/sheer.js';
import { depthLevel, FINAL_DEPTH, MAX_LEVEL } from '../data/depth.js';
import { dropChest } from './loot.js';
import { loadBiomeArt, biomeTileSet } from '../core/assets.js';
import { loadArtFor } from '../core/enemyart.js';
import { makeMonster } from './monster.js';
import { makeRaidBoss } from './raid.js';
import { DISTRICTS, HUBS, WINGS, CASTLE_FLOORS, wingOf, castleDepth, cityDepth, guardianFor, wingLordFor, PHOBOS_FOLK, PHOBOS_BY_ID, FINALE, placeOf, placeLayout, BIBLE_BOSSES } from '../data/phobos.js';
import { generatePhobos, PHOBOS_SEED, planX } from '../world/phobos.js';
import { generateCastleFloor, LAYOUTS, SHEER_LAYOUTS } from '../world/castlevelscour.js';
import { WING_RAIDS, VELSCOUR_RAIDS } from './phobosraids.js';
import { applyPhobosKit } from './phobosattacks.js';
import { applyBossMechanics } from './phobosbosses.js';
import { setupSpires } from './castlespires.js';
import { loadSpires3D } from '../gfx/spires3d.js';
import { setupCityQuests, setupCastleQuests, questObjective } from './phobosquests.js';
import { townObject } from '../world/town.js';
import { phobosTalk, makeTalker } from './phobostalk.js';
import { loadPhobosTex, phobosFloors, phobosProp, floorV, PH_V, phobosTexReady } from '../gfx/phobostex.js';
import { A } from '../core/assets.js';
import { TW } from '../core/view.js';

export const BELLMOURN = 'Bellmourn';
export function phobosState(c = G.char) {
  if (!c) return null;
  return (c.phobos ||= { q: 0, qAt: null, bell: false, city: false, gate: false, floor: 0, cleared: {}, wards: [], hubs: {}, vWins: 0, vSeen: [] });
}

// ------------------------------------------------------------------------------------------- the biomes
const base = (id, fb) => BIOME_BY_ID[id] || BIOME_BY_ID[fb] || BIOME_BY_ID.castle_keep;
const BIOMES = {};
function mkBiome(id, name, src, fb, extra = {}) {
  const B = base(src, fb);
  BIOMES[id] = BIOME_BY_ID[id] = { ...B, id, name, phobos: true, overworld: false, region: true, ...extra };
  return BIOMES[id];
}
mkBiome('phobos_city', 'City State Phobos', 'ph_city', 'castle_keep', { dark: 0.62, light: 10 });
for (const w of WINGS) {
  mkBiome('cv_' + w.id, w.name, w.biome, w.base);
  const S = SHEER.find((s) => s.id === (w.sheer || 'sheer_gilded'));
  if (S) mkBiome('cv_' + w.id + '_sheer', w.name, w.biome, w.base, { sheer: S, dark: S.dark, light: S.light, fog: S.fog, wallPack: null });
}

/** A level's looks drawn from a list of Phobos art (Act III levels field only their own). */
function phobosLooks(arts) {
  const pool = arts.filter(Boolean), used = new Set();
  return {
    pickArt(rng) { const a = pool.length ? pool[Math.floor((rng ? rng.next() : Math.random()) * pool.length)] : null; if (a) used.add(a.id); return a; },
    pick(arch) { const p = pool.filter((a) => a.arch === arch); const a = p.length ? pick(p) : pick(pool); if (!a) return null; used.add(a.id); return { art: a.id, swap: null }; },
    boss() { const a = pick(pool); return a ? { arch: a.arch, look: { art: a.id, swap: null } } : null; },
    ids() { return [...used]; },
    all() { return [...used].map((id) => ({ art: id, swap: null })); },
    add(id) { used.add(id); },
  };
}

// ------------------------------------------------------------------------------------------- the regions
let cityCache = null;
const cityRegion = registerRegion({
  id: 'phobos_city',
  words: ['phobos', 'city state phobos', 'the city state'],
  portal: 'City State Phobos: a walled city of tight streets under Castle Velscour. Eleven wards, each held by its own horrors.',
  townLine: 'The road leads to <b>City State Phobos</b>.',
  load: (biome) => Promise.all([loadBiomeArt(biome), loadArtFor(PHOBOS_FOLK.map((a) => a.id)), loadPhobosTex()]),
  ready: () => true,
  generate(depth, biome, seed) {
    if (!cityCache) cityCache = generatePhobos(biome, biomeTileSet(biome), PHOBOS_SEED);   // one city for every visit: built once a session
    const g = cityCache; g.map.seen.fill(0);
    const all = DISTRICTS.flatMap((d) => [...d.foes, ...d.bosses.filter(Boolean)]);
    g.looks = phobosLooks(all);
    for (const a of all) g.looks.add(a.id);
    g.roster = [...new Set(all.map((a) => a.arch))];
    void seed; return g;
  },
  createRun: (world, gen, biome, depth) => createCityRun(world, gen, biome, depth),
  intro: () => 'You come down out of <b>the Marches</b>, green and quiet. East, through the ridge and the Chasm, the land dies toward the walls of <b>City State Phobos</b>.',
  quest: (sc, step) => sc.questHtml(step),
  winText: null, amb: 'necropolis',
});
const castleRegion = {
  words: [], portal: 'Castle Velscour: a hundred floors climbing to the Throne Above.', townLine: 'The stair climbs on into <b>Castle Velscour</b>.',
  load: (biome) => { const f = G.phobosFloor || 1, w = wingOf(f); return Promise.all([loadPhobosTex(), loadBiomeArt(biome), G.phobosLayout === 'spires' ? loadSpires3D().catch((e) => console.warn('Spires 3D', e)) : null, loadArtFor([...w.foes.map((a) => a.id), guardianFor(f).id, ...(wingLordFor(f) ? [wingLordFor(f).id] : []), ...(f === CASTLE_FLOORS ? Object.values(FINALE).flatMap((v) => v.forms) : [])])]); },
  ready: () => true,
  generate(depth, biome, seed) {
    const f = G.phobosFloor || 1, w = wingOf(f), layout = G.phobosLayout || w.layouts[(f - 1) % w.layouts.length];
    const looks = phobosLooks(w.foes);
    const raid = f % 10 === 0;
    for (let k = 0; k < 6; k++) { try { const g = generateCastleFloor(f, layout, biome, biomeTileSet(biome), (seed + k * 7919) >>> 0, { raid, looks }); textureFloor(g, w); dressFloor(g, w); g.looks = looks; g.roster = [...new Set(w.foes.map((a) => a.arch))]; return g; } catch (e) { if (k === 5) throw e; } }
  },
  createRun: (world, gen, biome, depth) => createCastleRun(world, gen, biome, depth),
  intro: (world, gen) => `${escapeHtml(world.biome.name)} — Floor ${G.phobosFloor}: <b>${escapeHtml(placeOf(G.phobosFloor))}</b> (${escapeHtml(gen.layoutName || '')}).`,
  quest: (sc, step) => sc.questHtml(step), winText: null, amb: 'castle_keep',
};
for (const id of Object.keys(BIOMES)) if (id.startsWith('cv_')) registerRegion({ ...castleRegion, id, words: id === 'cv_gatehouse' ? ['castle velscour', 'velscour castle'] : [] });

// each wing's rooms furnished for their use (the town pack's props): stacks in the library, anvils at the forge
const WING_DRESS = {
  gatehouse: ['tool_rack', 'crate_stack', 'closed_barrel', 'arrow_milestone'], oubliettes: ['rope_and_hook', 'stone_boundary', 'fieldstone_cluster', 'water_bucket'],
  armoury: ['anvil_stump', 'cold_forge', 'smith_bellows', 'tool_rack', 'workbench'], greathall: ['market_table', 'market_table', 'stone_bench', 'closed_barrel', 'grain_sacks'],
  library: ['scroll_rack', 'scroll_rack', 'workbench', 'potion_jars', 'stone_bench'], menagerie: ['hay_bale', 'horse_trough', 'water_barrel', 'rope_and_hook'],
  sanctuaries: ['stone_bench', 'stone_bench', 'potion_jars', 'scroll_rack'], stormspire: ['crate_stack', 'rope_and_hook'], bonespire: ['fieldstone_cluster', 'stone_boundary'],
  throne: ['stone_bench', 'cloth_crate', 'potion_jars'],
};
function dressFloor(g, w) {
  const list = WING_DRESS[w.id], m = g.map; if (!list || !A.town || m.sheer) return;
  const k = TW / A.town.meta.tile[0];
  for (const r of g.rooms || []) {
    if (r.w < 6 || r.h < 6 || r === g.raid) continue;
    const n = Math.min(10, Math.round((r.w + r.h) / 4));
    for (let j = 0; j < n; j++) {
      const side = j % 4, u = 1 + Math.random() * (side < 2 ? r.w - 2 : r.h - 2);
      const x = side < 2 ? r.x + u : side === 2 ? r.x + 1.2 : r.x + r.w - 1.2, y = side < 2 ? (side ? r.y + r.h - 1.2 : r.y + 1.2) : r.y + u;
      const i = Math.floor(y) * m.w + Math.floor(x), spr = townObject(list[j % list.length]);
      const tx = Math.floor(x), ty = Math.floor(y);
      if (!spr || !m.t[i] || m.block[i]) continue;
      // never in a doorway: no open floor beside it outside the room
      if ([[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => { const X = tx + dx, Y = ty + dy; return (X < r.x || Y < r.y || X >= r.x + r.w || Y >= r.y + r.h) && m.t[Y * m.w + X]; })) continue;
      g.props.push({ kind: 'scatter', x, y, spr, k, flip: Math.random() < 0.5 }); m.block[i] = 1;
    }
  }
}

// each wing's floors from Bellmourn's Phobos set (gfx/phobostex.js): [corridors and halls, rooms]
const WING_FLOOR = {
  gatehouse: ['walk_paving', 'rutted_setts'], oubliettes: ['scree', 'bone_joint_flags'], armoury: ['keep_basalt', 'walk_paving'],
  greathall: ['bone_checker', 'worn_floorboards'], library: ['oxblood_marble', 'worn_floorboards'], menagerie: ['ash_clay_ground', 'wharf_deck'],
  sanctuaries: ['bone_checker', 'mausoleum_marble'], stormspire: ['bridge_ashlar', 'keep_basalt'], bonespire: ['bone_joint_flags', 'bloodstone'],
  throne: ['oxblood_marble', 'obsidian'],
};
// shelves along the back walls (and, in the Library, rows of stacks): book spines and jar shelves from the same set
const WING_SHELVES = { library: ['bookcase', 'bookcase', 'bookcase', 'jar_shelf'], sanctuaries: ['bookcase', 'jar_shelf'], greathall: ['jar_shelf'], armoury: [], throne: ['bookcase'] };
function textureFloor(g, w) {
  const m = g.map; if (m.sheer || m.hgt || !phobosTexReady()) return;   // (no atlas: the biome's own floors)
  const [hall, room] = WING_FLOOR[w.id] || WING_FLOOR.gatehouse, inRoom = new Uint8Array(m.w * m.h);
  for (const r of g.rooms || []) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h) inRoom[y * m.w + x] = 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const i = y * m.w + x; if (m.t[i]) m.v[i] = floorV(inRoom[i] ? room : hall, x, y); }
  g.phTex = true;
  const kinds = WING_SHELVES[w.id]; if (!kinds || !kinds.length) return;
  const k = TW / 160, doorway = (r, tx, ty) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => { const X = tx + dx, Y = ty + dy; return (X < r.x || Y < r.y || X >= r.x + r.w || Y >= r.y + r.h) && m.t[Y * m.w + X]; });
  // never on the floor's own places (start, exit, guardian, chests, packs, leap stones), and never cutting floor off
  const keep = [g.start, g.exit, g.guardian, ...(g.chests || []).map((c) => [c.x, c.y]), ...(g.spawns || []).map((s) => [s.x, s.y]), ...(g.leaps || []).flatMap((L) => [[L.x, L.y], [L.tx, L.ty]])].filter(Boolean);
  const placed = [];
  const shelf = (r, tx, ty, flip, x, y) => {
    const i = ty * m.w + tx, spr = phobosProp(kinds[(tx + ty) % kinds.length]);
    if (!spr || !m.t[i] || m.block[i] || doorway(r, tx, ty) || keep.some(([a, b]) => Math.abs(a - tx - 0.5) < 2 && Math.abs(b - ty - 0.5) < 2)) return;
    const pr = { kind: 'scatter', x, y, spr, k, flip, fixed: true }; g.props.push(pr); m.block[i] = 1; placed.push([i, pr]);
  };
  const reach = () => { const seen = new Uint8Array(m.w * m.h), q = [Math.floor(g.start[1]) * m.w + Math.floor(g.start[0])]; seen[q[0]] = 1; for (let h = 0; h < q.length; h++) { const j = q[h]; for (const n of [j + 1, j - 1, j + m.w, j - m.w]) if (!seen[n] && m.t[n] && !m.block[n]) { seen[n] = 1; q.push(n); } } return q.length; };
  const before = reach();
  for (const r of g.rooms || []) {
    if (r.w < 6 || r.h < 6 || r === g.raid) continue;
    for (let x = r.x + 1; x < r.x + r.w - 2; x++) shelf(r, x, r.y, false, x + 0.5, r.y + 0.22);    // against the back wall (-y), facing the room
    for (let y = r.y + 1; y < r.y + r.h - 2; y++) shelf(r, r.x, y, true, r.x + 0.22, y + 0.5);      // and the other (-x)
  }
  // (the Library's own stacks come from its layout: world/castlevelscour.js). Anything sealed off: the shelves go
  if (reach() < before - placed.length) for (const [i, pr] of placed) { m.block[i] = 0; g.props.splice(g.props.indexOf(pr), 1); }
}

// ------------------------------------------------------------------------------------------- shared run bits
function townPortalTo(world, game) {
  for (const p of world.portals) if (p.type === 'town') { p.label = 'Town Portal — Bellmourn'; p.use = () => UI.dialog({ title: 'Return to Bellmourn?', html: '<p>The portal opens on Bellmourn, the town under the bells.</p>', buttons: [{ label: 'Stay' }, { label: 'Return', fn: () => { sfx('portal'); game.enterBellmourn(); } }] }); }
}
function spawnFoe(world, biome, art, level, rank, x, y) {
  const m = makeMonster(world, art.arch, biome, level, rank, x, y, 0, { art: art.id, swap: null });
  applyPhobosKit(m, art);
  if (art.title && rank !== 'normal') m.name = art.name;
  world.add(m);
  return m;
}

// ------------------------------------------------------------------------------------------- the city
/** A leap or swing cut short by a portal or a death must not carry into the next world. */
export function clearFlight() { const p = G.player; if (p) { p.padFly = null; p.leaping = false; p.z = 0; } }
function createCityRun(world, gen, biome, depth) {
  const c = G.char, S = phobosState(c), game = G.game;
  townPortalTo(world, game); clearFlight();
  // the road in wears the town pack's ground: grass, meadow, a trampled verge, then dirt, mud and gravel by the moat
  world.extraFloors = phobosFloors(); world.extraBase = PH_V;   // (the town pack's ground stands in for Phobos's own if its atlas failed: phobosFloors)
  world.phobos = true;
  world.roster = [...new Set(DISTRICTS.flatMap((d) => d.foes.map((a) => a.arch)))];
  const exit = world.portals.find((p) => p.type === 'exit');
  // the Castle Gate: closed until the wards are broken
  const live = (get) => ({ get, set() {}, configurable: true, enumerable: true });
  Object.defineProperties(exit, {
    active: live(() => S.gate), color: live(() => (S.gate ? '#ff3030' : '#5a3a3a')),
    label: live(() => (S.gate ? 'The Castle Gate — Castle Velscour' : `The Castle Gate (sealed: ${S.wards.length}/${WARDS_TO_OPEN} ward lords slain)`)),
  });
  Object.assign(exit, {
    use: () => { if (!S.gate) { floatText(exit.x, exit.y, 70, `Sealed — break ${WARDS_TO_OPEN - S.wards.length} more ward lords`, '#ff6040', 13, { life: 1.6 }); sfx('error'); return; } game.enterCastleFloor(Math.max(1, S.floor || 1)); },
  });
  // packs in every district's streets, a district's lords at its square, its folk in its lanes
  const packs = [], lords = [];
  const lvlOf = (d) => depthLevel(Math.round(cityDepth(d.lv)));
  DISTRICTS.forEach((d, k) => {
    const sp = gen.spots[k]; if (!sp.length) return;
    const n = Math.round(clamp(sp.length / 22, 4, 16));
    for (let i = 0; i < n; i++) packs.push({ d, k, at: sp[Math.floor(Math.random() * sp.length)], live: [] });
    const s = gen.squares[d.id];
    d.bosses.filter(Boolean).forEach((art, i) => {
      const a = (i / Math.max(1, d.bosses.length)) * TAU, [x, y] = world.map.randomNear(s.x + Math.cos(a) * 2.5, s.y + Math.sin(a) * 2.5, 2) || [s.x, s.y];
      const key = d.id + ':' + art.id;
      if (!S.gate && S.wards.includes(key)) return;   // a broken lord stays down until the Castle Gate opens; then they all return
      const m = makeTalker(spawnFoe(world, biome, art, lvlOf(d) + 3, 'boss', x, y), k);
      m.maxHp *= 1.6; m.hp = m.maxHp; m.wardLord = art.id; m.title = `Ward Lord of ${d.name}`;
      applyBossMechanics(m, art, 'ward');
      lords.push(m);
      const prev = m.onDeath; m.onDeath = (src) => { if (prev) prev.call(m, src); wardSlain(art, d, key); };
    });
  });
  const fill = (P) => { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { const [x, y] = i ? world.map.randomNear(P.at[0], P.at[1], 1.8) || P.at : P.at; const art = pick(P.d.foes); if (art) P.live.push(makeTalker(spawnFoe(world, biome, art, lvlOf(P.d) + (i === 0 && chance(0.2) ? 1 : 0), i === 0 && chance(0.15) ? 'champion' : 'normal', x, y), P.k)); } };
  // the occupiers' pickets on the road in: the Marches, the Chasm's two chambers, the Sill (bm PHOBOS-LAYOUT's patrols)
  for (const at of gen.pickets || []) packs.push({ d: DISTRICTS[0], k: 0, at: world.map.randomNear(at[0], at[1], 2.5) || at, live: [] });
  for (const P of packs) fill(P);
  // the folk: gray residents (peaceable until crossed: one in five turns when you come near) and the good (helpers)
  const folk = [];
  DISTRICTS.forEach((d, k) => d.folk.forEach((art) => {
    const sp = gen.spots[k]; if (!sp.length) return;
    const sq = gen.squares[d.id], by = sp.filter(([x, y]) => dist(x, y, sq.x, sq.y) < 11);   // they live round the square
    const [x, y] = (by.length ? by : sp)[Math.floor(Math.random() * (by.length || sp.length))];
    const n = { name: art.name, title: art.title, enemyArt: art.id, x, y, reach: 1.8, flip: chance(0.5), folk: art, district: d,
      turns: art.cat === 'gray' && chance(0.2),
      use: () => UI.dialog({ title: `${escapeHtml(art.name)}${art.title ? ' — ' + escapeHtml(art.title) : ''}`, html: `<p>${escapeHtml(art.does || art.title || '')}.</p>${art.cat === 'gray' ? `<p class="dim">Word is you'd lose this one's goodwill if you were to: ${escapeHtml(art.trigger)}</p>` : '<p class="dim">One of the city\'s good folk: they help, even under the occupation.</p>'}`, buttons: [{ label: 'Leave' }] }) };
    world.npcs.push(n); folk.push(n);
  }));
  // the hubs' givers, in their safe houses
  const hubs = [];
  for (const d of DISTRICTS) if (d.hub) {
    const H = HUBS[d.hub], h = gen.hubHouse(d.id), at = h ? [h.mx, h.my] : [gen.squares[d.id].x + 3, gen.squares[d.id].y];
    const n = { name: `${H.giver.name} (${H.name})`, enemyArt: H.giver.id, x: at[0], y: at[1], reach: 2, flip: false, hub: d.hub, aura: 1, auraCol: '#ffd060',
      use: () => { S.hubs[d.hub] = true; sfx('gold'); UI.dialog({ title: H.name, html: `<p><b>${escapeHtml(H.giver.name)}</b>, ${escapeHtml(H.where)}.</p><p>${escapeHtml(HUB_LINES[d.hub])}</p><p class="dim">${Object.keys(S.hubs).length}/3 of the city's hidden houses know you now.</p>`, buttons: [{ label: 'Farewell' }] }); questTick(); } };
    world.npcs.push(n); hubs.push(n);
  }
  // the streets talk (game/phobostalk.js): folk walk their own lanes, chat and set errands; the occupiers grumble and taunt
  const placeAt = (x, y) => { const k = gen.district[world.map.tileIdx(x, y)], d = DISTRICTS[k]; if (!d) return { place: 'the road in' }; const L = lords.find((m) => !m.dead && m.wardDistrict === k); return { place: d.name, lord: L ? L.name : null }; };
  for (const L of lords) L.wardDistrict = L.district;
  const talk = phobosTalk(world, { placeOf: placeAt, folk, errands: (S.errands ||= {}), homes: (n) => gen.spots[DISTRICTS.indexOf(n.district)], questDistrict: (n) => DISTRICTS.indexOf(n.district) });
  const pq = setupCityQuests(world, gen, S);
  let respawnT = 60;
  const run = {
    title: 'City State Phobos', description: 'Break the ward lords to open the Castle Gate.', active: true, completed: false, failed: false, markers: [], phobosCity: true,
    get objective() {   // auto-play: the nearest living ward lord, then the hubs it hasn't met, then the gate
      const qo = questObjective(world); if (qo) return qo;
      const p = G.player; if (!p) return null;
      const L = lords.filter((m) => !m.dead).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
      if (!S.gate && L) return { x: L.x, y: L.y, reach: 4 };
      const h = hubs.find((n) => !S.hubs[n.hub]);
      if (h) return { x: h.x, y: h.y, reach: 1.6, use: h.use };
      return S.gate ? { x: exit.x, y: exit.y, reach: 1.4, use: exit.use } : null;
    },
    update(dt) {
      const p = world.player; if (!p) return;
      talk(dt); pq.update(dt);
      // gray residents who turn
      for (const n of folk) if (n.turns && !n.turned && dist(n.x, n.y, p.x, p.y) < 3) {
        n.turned = true; n.hidden = true;
        const m = makeTalker(spawnFoe(world, biome, n.folk, lvlOf(n.district) + 1, 'champion', n.x, n.y), DISTRICTS.indexOf(n.district));
        m.name = n.name; floatText(m.x, m.y, 80, `${n.name} turns on you!`, '#ff6040', 14, { life: 2 }); sfx('roar', 0.5);
      }
      // the dead come back: packs refill away from the hero
      if ((respawnT -= dt) <= 0) { respawnT = 45; for (const P of packs) { P.live = P.live.filter((m) => !m.dead); if (!P.live.length && dist(P.at[0], P.at[1], p.x, p.y) > 22 && chance(0.5)) fill(P); } }
      // the road in: the Chasm, then first sight from the Sill
      if (!run.chasm && planX(p.x, p.y) > 46 && planX(p.x, p.y) < 84) { run.chasm = true; UI.centerMsg('THE CHASM', "Widow's Notch, and the long way down to the Sill", 3); }
      if (!run.sill && dist(p.x, p.y, gen.sill[0], gen.sill[1]) < 6) { run.sill = true; UI.centerMsg('CITY STATE PHOBOS', 'The walls, and Castle Velscour above them', 4.5); sfx('bell'); G.flash = 0.25; }
      // the district the hero walks in
      const k = gen.district[world.map.tileIdx(p.x, p.y)];
      if (k !== run.lastD && DISTRICTS[k]) {
        run.lastD = k; const d = DISTRICTS[k], first = !(S.seenD ||= []).includes(d.id);
        const foes = [...new Set(d.foes.map((a) => a.name.split(' ').slice(-1)[0]))].slice(0, 3).join(', ');
        UI.centerMsg(d.name.toUpperCase(), d.verb.length > 52 ? d.verb.slice(0, d.verb.lastIndexOf(' ', 50)) + '…' : d.verb, first ? 3.4 : 2.2); void foes;   // (who holds it goes to the log)
        if (first) { S.seenD.push(d.id); UI.log(`<b>${escapeHtml(d.name)}</b>: ${escapeHtml(d.verb)} Its streets are held by ${escapeHtml(foes)}; ${d.bosses.filter(Boolean).length} ward lords hold its square.${d.hub ? ` A hidden house is somewhere near the square (${escapeHtml(HUBS[d.hub].name)}).` : ''}`, '#e0d0b0'); }
      }
      questTick(dt);
    },
    questHtml(step) {
      const d = DISTRICTS[run.lastD ?? 0];
      let h = `<div class="q-title">City State Phobos${d ? ' &middot; ' + escapeHtml(d.name) : ''}</div>`;
      h += questLogHtml(step); h += pq.questHtml(step);
      h += step(S.wards.length >= WARDS_TO_OPEN, `Break the ward lords: <b>${S.wards.length}/${WARDS_TO_OPEN}</b> slain (the Castle Gate opens at ${WARDS_TO_OPEN}).`);
      h += step(Object.keys(S.hubs).length >= 3, `Find the city's hidden houses: the Pennyless, the Quiet Watch, the Ashwardens (<b>${Object.keys(S.hubs).length}/3</b>).`);
      h += step(S.gate, S.gate ? 'The Castle Gate stands open at the east end of the King\'s Mile.' : 'The Castle Gate waits at the east end of the King\'s Mile.');
      return h;
    },
  };
  function wardSlain(art, d, key) {
    if (!S.wards.includes(key)) { S.wards.push(key); UI.log(`<b style="color:#ffb060">${escapeHtml(art.name)}</b>, a ward lord of ${escapeHtml(d.name)}, is broken (${S.wards.length}/${WARDS_TO_OPEN}).`, '#ffd0a0'); }
    if (!S.gate && S.wards.length >= WARDS_TO_OPEN) { S.gate = true; UI.centerMsg('THE CASTLE GATE OPENS', 'Castle Velscour awaits at the east end of the city', 4); sfx('gate'); addEffect(new Ring(exit.x, exit.y, 0.2, 4, 1.4, '#ff3030', 6)); }
    questTick(); game.autosave();
  }
  UI.centerMsg('CITY STATE PHOBOS', 'Castle Velscour', 3.5);
  return run;
}
export const WARDS_TO_OPEN = 12;
const HUB_LINES = {
  pennyless: 'We steal from the dukes and give to the Rookeries. The Barbican\'s lords hold the drawbridge; break them and the whole Low Road breathes.',
  quietwatch: 'We show no colours here. Help the city and we\'ll man the Water Gate for you. The castle\'s gate opens only when the wards are broken.',
  ashwardens: 'The dead rise by rows in the Bone Yards. Every ward lord you break stills a row. Velscour cannot truly die — but he can be thrown down.',
};

// ------------------------------------------------------------------------------------------- the castle
function createCastleRun(world, gen, biome, depth) {
  const c = G.char, S = phobosState(c), game = G.game, f = G.phobosFloor || 1, wing = wingOf(f);
  townPortalTo(world, game); clearFlight();
  world.phobos = true; world.castleFloor = f;
  if (!world.roster || !world.roster.length) world.roster = [...new Set(wing.foes.map((a) => a.arch))];
  S.floor = Math.max(S.floor || 0, f);
  const exit = world.portals.find((p) => p.type === 'exit');
  exit.label = 'Sealed Stair — slay the guardian';
  const lvl = Math.min(MAX_LEVEL - 2, depthLevel(depth));   // bosses at most MAX_LEVEL + 2
  // the floor's lord: Velscour (100), a wing's raid boss (every 10th), a castle boss (every 5th), else a captain
  let boss;
  if (f === CASTLE_FLOORS) {
    const order = ['crimson', 'obsidian', 'cathedral'], v = G.velscourVariant || order[(S.vWins || 0) % 3];
    boss = makeRaidBoss(world, gen.raid, depth, lvl + 4, { tpl: VELSCOUR_RAIDS[v], art: FINALE[v].forms[0], hp: 1.4, dmg: 1.05 });
    boss.velscourBattle = v;
  } else if (f % 10 === 0) {
    const tpl = WING_RAIDS[wing.boss] || WING_RAIDS.latch;
    boss = makeRaidBoss(world, gen.raid, depth, lvl + 3, { tpl, art: tpl.art[0] });
  } else {
    const lord = f % 5 === 0 ? null : wingLordFor(f), art = f % 5 === 0 ? guardianFor(f) : lord || pick(wing.foes), [x, y] = gen.guardian || gen.exit;
    boss = makeMonster(world, art.arch, biome, lvl + 2, 'boss', x, y, 0, { art: art.id, swap: null });
    boss.name = BIBLE_BOSSES[f] || art.name; if (f % 5 === 0) { boss.maxHp *= 1.5; boss.hp = boss.maxHp; boss.title = art.title || 'Guardian of the Castle'; }
    else if (lord) { boss.maxHp *= 1.3; boss.hp = boss.maxHp; boss.title = 'A Lord of ' + wing.name.replace(/^The /, 'the '); }   // a wing's own horror lord
    applyBossMechanics(boss, art, f % 5 === 0 ? 'guardian' : 'lord');
  }
  if (boss.raid) world.raid = boss.raid;
  world.add(boss); world.boss = boss;
  if (gen.phTex) { world.extraFloors = phobosFloors(); world.extraBase = PH_V; }
  // the castle's garrison talks too (the raid bosses keep their own voices)
  for (const m of world.creatures) if (m.team === 'enemy' && !m.raid) { makeTalker(m); applyPhobosKit(m); }
  const pq = setupCastleQuests(world, gen, S, f, wing);
  const talk = phobosTalk(world, { placeOf: () => ({ place: placeOf(f), lord: boss.name }) });
  // leap stones and swing chains
  const pads = gen.leaps.map((L) => world.addHazard(new Pad(world, L)));
  const route = gen.leaps.filter((L) => !L.back);
  const run = {
    title: `Castle Velscour — Floor ${f}`, description: placeOf(f), active: true, completed: false, failed: false, markers: [],
    get objective() {   // auto-play over the gaps: the next pad on the main line the hero hasn't crossed
      const qo = questObjective(world); if (qo) return qo;
      if (gen.family !== 'leaps' && gen.family !== 'spires') return undefined;
      const p = G.player; if (!p) return undefined;
      const next = gen.family === 'spires' ? route.find((L) => !L.crossed) : route.find((L) => !L.crossed && L.x > p.x - 4);   // (spires: the route's own order, tower to tower)
      if (!next) return undefined;
      return { x: next.x, y: next.y, reach: 0.6 };
    },
    update(dt) { questTick(dt); talk(dt); pq.update(dt); },
    questHtml(step) {
      let h = `<div class="q-title">Castle Velscour &middot; Floor ${f}/${CASTLE_FLOORS} <span class="dim">(${escapeHtml(wing.name)})</span></div><div class="dim">${escapeHtml(placeOf(f))} &middot; wing ${((f - 1) % 10) + 1}/10</div>`;
      const goal = Math.min(CASTLE_FLOORS, Math.ceil(f / 10) * 10);
      h += step(!!S.cleared[goal], `<b>Climb goal:</b> clear Floor ${goal}${goal === CASTLE_FLOORS ? ', the Throne Above' : `, ${escapeHtml(wing.name)}'s great room`} <span class="dim">(the stair leads only up; leave by a town portal and the Bellmourn waypoint brings you back)</span>.`);
      h += questLogHtml(step); h += pq.questHtml(step);
      h += step(boss.dead, `${f === CASTLE_FLOORS ? '<b style="color:#ff3030">Lord Velscour</b> waits in the Throne Above' : f % 10 === 0 ? `<b style="color:#ff8050">${escapeHtml(boss.raid ? boss.raid.tpl.name : boss.name)}</b> holds this wing's great room` : f % 5 === 0 ? `<b>${escapeHtml(boss.name)}</b> guards the stair` : 'A captain of Velscour\'s own guards the stair'}.`);
      if (gen.leaps.length) h += step(false, '<span class="dim">Glowing stones fling you over the gaps; iron rings swing you across on a chain.</span>');
      h += step(boss.dead, boss.dead ? 'The stair up is open.' : 'Its fall opens the stair up.');
      return h;
    },
  };
  if (gen.spires) setupSpires(world, gen, run);   // the Broken Spires in three.js: stairs round the towers, the camera turning with the climb
  world.onBossKilled = (m) => {
    if (m.raid && m.raid.court) return;
    const first = !S.cleared[f];
    S.cleared[f] = true; S.floor = Math.max(S.floor, Math.min(CASTLE_FLOORS, f + 1));
    exit.active = true; exit.color = '#ff4040'; exit.label = f === CASTLE_FLOORS ? 'The Throne Above — the balcony' : `Stair up — Floor ${f + 1}`;
    addEffect(new Ring(exit.x, exit.y, 0.2, 3, 1, '#ff4040', 5)); sfx('gate');
    if (first && f % 10 === 0) { c.skillPoints = (c.skillPoints || 0) + 1; UI.log('+1 skill point for breaking a wing of Castle Velscour.', '#ffd860'); }
    // the hoard: a raid boss always leaves rare chests (more the first time), a castle boss one
    const hoard = f === CASTLE_FLOORS ? 4 : f % 10 === 0 ? (first ? 3 : 2) : f % 5 === 0 ? 1 : 0;
    for (let i = 0; i < hoard; i++) { const a = (i / Math.max(1, hoard)) * TAU, [hx, hy] = world.map.randomNear(m.x + Math.cos(a) * 2, m.y + Math.sin(a) * 2, 1.5) || [m.x, m.y]; dropChest(world, { x: hx, y: hy, rare: true }, depth); }
    UI.centerMsg(m.raid ? `${(m.raid.tpl.name || m.name).toUpperCase()} FALLS` : 'GUARDIAN SLAIN', f === CASTLE_FLOORS ? 'The world shudders' : first ? `Floor ${f + 1} opens` : 'The stair is open', 3.5);
    if (f === CASTLE_FLOORS) velscourFalls(m.velscourBattle || 'crimson');
    questTick(); UI.refresh(); game.autosave();
  };
  exit.use = () => {
    if (!exit.active) { floatText(exit.x, exit.y, 70, 'Sealed — slay the guardian!', '#ff6040', 13, { life: 1.6 }); sfx('error'); return; }
    if (f === CASTLE_FLOORS) { endingCinematic(game); return; }
    sfx('portal'); game.enterCastleFloor(f + 1);
  };
  UI.centerMsg(placeOf(f).split(':')[0].toUpperCase(), f % 10 === 1 ? `${wing.name} · a waypoint in Bellmourn now leads here` : `Floor ${f} · ${wing.name}`, 3);
  return run;
}

/** A leap stone or a swing chain: step on it and you are flung across the gap (game/sheer.js reads `leaping`). */
class Pad {
  constructor(world, L) { Object.assign(this, { world, L, t: Math.random() * 3, cd: 0, charge: 0, ground: true, x: L.x, y: L.y }); }
  // the swing's chain sweeps between this stone and the far one (period 2.4 s); it can be caught only near this side
  swingPhase() { return 0.5 + 0.5 * Math.cos((this.t * TAU) / 2.4); }   // 1 = at this stone, 0 = at the far one
  watch(p, dt = 1 / 60) {
    const L = this.L;
    if (this.cd > 0 || p.leaping || p.padFly) { this.charge = 0; return; }
    if (dist(p.x, p.y, L.x, L.y) > 0.75) { this.charge = Math.max(0, this.charge - dt * 3); return; }
    if (L.kind === 'swing') { if (this.swingPhase() < 0.9) return; }   // wait for the chain: step on as it comes round
    else if ((this.charge += dt) < 0.55) return;                           // crouch: the ring fills, then the leap
    this.cd = 2; this.charge = 0;
    const fly = { t: 0, dur: L.kind === 'swing' ? 1.1 : 0.8, x0: p.x, y0: p.y, x1: L.tx, y1: L.ty, kind: L.kind };
    p.padFly = fly; p.leaping = true; p.invuln = Math.max(p.invuln || 0, 0.3);   // only the take-off is safe: bolts still find you in the air
    L.crossed = true;
    for (const h of this.world.hazards || []) if (h instanceof Pad && dist(h.L.x, h.L.y, L.tx, L.ty) < 1.5) h.cd = 2.5;  // don't bounce straight back
    sfx(L.kind === 'swing' ? 'swing' : 'jump');
  }
  update(dt) {
    this.t += dt; this.cd -= dt;
    const p = this.world.player, F = p && p.padFly;
    if (p && !p.dead) this.watch(p, dt);
    if (F && F.owner === undefined) F.owner = this;
    if (F && F.owner === this) {
      F.t += dt; const k = Math.min(1, F.t / F.dur), e = k * k * (3 - 2 * k);
      p.x = F.x0 + (F.x1 - F.x0) * e; p.y = F.y0 + (F.y1 - F.y0) * e;
      p.z = F.kind === 'swing' ? 40 * Math.sin(k * Math.PI) * 0.6 : 70 * Math.sin(k * Math.PI);
      p.path = null; p.moveTarget = null; p.nav = null;
      if (k >= 1) { p.padFly = null; p.leaping = false; p.z = 0; sparkle(p.x, p.y, 14, '#ffe0a0', 14, 0.4); }
    }
    addLight(this.L.x, this.L.y, 1.4, 0.5, 6);
    return true;
  }
  draw(ctx) {
    const L = this.L, x = isoX(L.x, L.y), y = isoY(L.x, L.y), pulse = 0.6 + Math.sin(this.t * 4) * 0.25, col = L.kind === 'swing' ? '#c8a060' : '#ffd860';
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse; ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, HW * 0.7, HH * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, HW * 0.7, HH * 0.7, 0, 0, TAU); ctx.stroke();
    // an arrow toward the far side (leap) or a ring on a post with its chain (swing)
    const ax = isoX(L.tx, L.ty), ay = isoY(L.tx, L.ty), a = Math.atan2(ay - y, ax - x);
    if (this.charge > 0) { ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, HW * 0.85, HH * 0.85, 0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, this.charge / 0.55)); ctx.stroke(); ctx.lineWidth = 2; }
    if (L.kind === 'swing') {
      const ph = this.swingPhase(), mx = (x + ax) / 2, my = (y + ay) / 2 - 140, hx = ax + (x - ax) * ph, hy = ay + (y - ay) * ph - 30;
      ctx.globalAlpha = 0.9; ctx.strokeStyle = ph >= 0.9 ? '#80ff80' : '#c8a060'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 7, 0, TAU); ctx.stroke(); ctx.strokeStyle = col;
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#8a7050'; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x, y - 30); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(mx, my, 6, 0, TAU); ctx.stroke();
    } else {
      ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(4, -7); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------------------------------- the end
function velscourFalls(v) {
  const S = phobosState();
  S.vWins = (S.vWins || 0) + 1;
  if (!S.vSeen.includes(v)) S.vSeen.push(v);
  UI.log(`<b style="color:#ff3030">Lord Velscour</b> falls (${FINALE[v].name}). ${S.vSeen.length < 3 ? 'But he cannot truly die: the Throne Above will hold another battle.' : 'All three of his battles are won.'}`, '#ffb0a0');
}
function endingCinematic(game) {
  const S = phobosState();
  UI.dialog({
    title: 'The Throne Above',
    html: `<p>You step out onto the balcony at the top of his tower and look out over the world. A terrible feeling comes over you: that the world has just changed for the worse.</p>
      <p>The castle begins to shake. Light bursts from you, a beam climbing into the sky &mdash;</p>
      <p>&mdash; and you wake in Bellmourn, under the bells. Something pulled you out before the evil swallowed the castle. Velscour can never truly die.</p>
      <p class="dim">Lord Velscour has fallen ${S.vWins} time${S.vWins > 1 ? 's' : ''}. The Throne Above holds ${3 - S.vSeen.length ? `${3 - S.vSeen.length} more of his battles` : 'his three battles in turn'}; every wing stays open from Bellmourn's waypoint.</p>`,
    buttons: [{ label: 'Wake in Bellmourn', cls: 'red', fn: () => { sfx('portal'); G.flash = 1; game.enterBellmourn(); } }],
  });
}

// ------------------------------------------------------------------------------------------- entering
/** Build an Act III level through the region pipeline (game.buildDungeon) without touching the descent's depth. */
export async function enterActIII(game, biome, depth, title, sub) {
  const { LoadingScreen } = await import('../ui/loading.js');
  const LS = LoadingScreen;
  LS?.show?.({ title, subtitle: sub, text: `${sub}…`, progress: 15 });
  sfx('portal');
  try {
    await game.loadLevelArt(biome);
    LS?.setProgress?.(50, 'Raising the walls…');
    game.buildDungeon(depth, biome);
    const w = G.world;
    LS?.setProgress?.(75, 'Waking the castle…');
    await loadArtFor([...w.creatures.map((m) => m.art), ...(w.looks ? w.looks.ids() : []), ...w.npcs.map((n) => n.enemyArt).filter(Boolean)], true).catch((e) => console.warn(e));
    LS?.setProgress?.(100, 'Arriving…');
  } finally { await LS?.hide?.(); }
}
export function enterPhobos(game) {
  const S = phobosState(); S.city = true; G.char.lastTown = 'act3';
  return enterActIII(game, BIOMES.phobos_city, Math.round(cityDepth(0)), 'City State Phobos', 'The Marches, on the road in');
}
export function enterCastleFloor(game, floor) {
  const S = phobosState(); floor = clamp(floor | 0, 1, CASTLE_FLOORS);
  const w = wingOf(floor), layout = G.phobosLayoutWant || (floor % 10 ? placeLayout(floor) : null) || w.layouts[(floor - 1) % w.layouts.length];
  G.phobosLayoutWant = null;
  G.phobosFloor = floor; G.phobosLayout = layout; G.char.lastTown = 'act3';
  S.floor = Math.max(S.floor || 0, floor);
  const sheer = SHEER_LAYOUTS.has(layout) || (floor % 10 === 0 && w.sheer && floor !== CASTLE_FLOORS);
  const biome = BIOMES['cv_' + w.id + (sheer && BIOMES['cv_' + w.id + '_sheer'] ? '_sheer' : '')];
  return enterActIII(game, biome, castleDepth(floor), `Castle Velscour — Floor ${floor}`, w.name);
}

// ------------------------------------------------------------------------------------------- Bellmourn
/** Bellmourn's own folk and portals, laid into the town game.enterBellmourn built. */
export function setupBellmourn(world, t, game) {
  const c = G.char, S = phobosState(c);
  S.bell = true; c.lastTown = 'act3';
  const C = t.center, at = (dx, dy) => { const [x, y] = world.map.randomNear(C.x + dx, C.y + dy, 2.5) || [C.x + dx, C.y + dy]; return [x, y]; };
  // the bell-warden: the quest chain's voice
  const giver = PHOBOS_FOLK.find((a) => /Ashwarden|bell/i.test(a.name + a.title)) || PHOBOS_FOLK[50];
  const [gx, gy] = at(-3, 2.5);
  world.npcs.push({ name: 'The Bell-Warden of Bellmourn', enemyArt: giver.id, x: gx, y: gy, reach: 2, flip: false, aura: 1, auraCol: '#ffd060', use: () => questDialog() });
  const [rx, ry] = at(1.5, 1.5);
  world.npcs.push({ stash: true, reliquary: true, name: 'The Reliquary', x: rx, y: ry, reach: 1.6, flip: false, use: () => G.ui.reliquary.open() });
  if (!S.greeted) {
    S.greeted = true;
    setTimeout(() => UI.dialog({ title: 'The Bell-Warden of Bellmourn', html: `<p>The bells ring for Phobos, stranger. A city of tight streets under <b>Castle Velscour</b>, eleven wards, each held by its own horrors. The few who got out are here.</p><p>The road to the Sill opens when you've proven yourself. Talk to me when you're ready; my quests are in your Quest Log (Q).</p>`, buttons: [{ label: 'I will go', cls: 'red' }] }), 900);
  }
  // a few of Phobos' good folk who fled here
  PHOBOS_FOLK.filter((a) => a.cat === 'good').slice(0, 6).forEach((a, i) => {
    const [x, y] = at(Math.cos(i * 1.05) * 7, Math.sin(i * 1.05) * 6);
    world.npcs.push({ name: a.name, enemyArt: a.id, x, y, reach: 1.8, flip: chance(0.5), use: () => UI.dialog({ title: escapeHtml(a.name), html: `<p>${escapeHtml(a.does || a.title)}. I came out of Phobos with the last cart before the drawbridge went up.</p>`, buttons: [{ label: 'Farewell' }] }) });
  });
  // the waypoints: Phobos, and every wing of Castle Velscour reached
  const add = (dx, dy, o) => { const [x, y] = at(dx, dy); world.portals.push({ x, y, active: true, reach: 2, ...o }); };
  add(5, -4, { color: '#ff4030', get label() { return S.city ? 'Waypoint — City State Phobos' : 'The road to Phobos (closed: ask the Bell-Warden)'; }, use: () => { if (!S.city) { questDialog(); return; } enterPhobos(game); } });
  add(6, 1.5, { color: '#c02040', get label() { return S.gate ? `Waypoint — Castle Velscour (Floor ${Math.max(1, S.floor)})` : 'Castle Velscour (the Castle Gate is shut)'; }, use: () => { if (!S.gate) { UI.log('The Castle Gate opens from inside Phobos: break its ward lords.', '#ffb0a0'); return; } castleWaypoints(game); } });
  add(-6, -3, { color: '#38bdf8', label: 'Waypoint — Herrington Hollow (Act I)', use: () => { sfx('portal'); c.lastTown = 'act1'; game.enterTown(); } });
  if (c.visitedAct2Town) add(-6, 2, { color: '#f3c778', label: 'Waypoint — Sunscorch Oasis (Act II)', use: () => { sfx('portal'); game.enterAct2Town(); } });
}
/** HAIL VELSCOUR!'s Act III destinations (game.js openVelscourTeleport): [value, label, go(game)]. */
export function act3Destinations() {
  // a look at a castle floor from the list doesn't count as having climbed to it (the castle's waypoints stay earned)
  const look = (f) => async (g) => { const S = phobosState(), was = S.floor; await g.enterCastleFloor(f); S.floor = was; };
  return [
    ['act3:bellmourn', 'Bellmourn (Act III town)', (g) => g.enterBellmourn()],
    ['act3:phobos', 'City State Phobos (the walled city)', (g) => g.enterPhobos()],
    ...WINGS.map((w, i) => [`act3:f${i * 10 + 1}`, `Castle ${i * 10 + 1}-${i * 10 + 10}: ${w.short || w.name.replace(/^The /, '').split(/ and |:|,/)[0].trim()}`, look(i * 10 + 1)]),
    [`act3:f${CASTLE_FLOORS}`, `Castle ${CASTLE_FLOORS}: Lord Velscour`, look(CASTLE_FLOORS)],
  ];
}
function castleWaypoints(game) {
  const S = phobosState(), lvl = G.char.level || 1;
  const rows = WINGS.map((w, i) => {
    const start = i * 10 + 1, open = S.floor >= start, need = Math.max(1, depthLevel(castleDepth(start)) - 12);
    return { w, start, open, need };
  });
  UI.dialog({
    title: 'Castle Velscour — Waypoints',
    html: `<p>Each wing you have reached can be returned to. The castle climbs to Floor ${CASTLE_FLOORS}, the Throne Above.</p><p class="dim">Highest floor reached: ${Math.max(1, S.floor)}.</p>`,
    cls: 'portal-choice',
    buttons: [
      { label: `Continue — Floor ${Math.max(1, S.floor)}`, cls: 'red', fn: () => game.enterCastleFloor(Math.max(1, S.floor)) },
      ...rows.filter((r) => r.open).map((r) => ({ label: `${r.w.name} (Floor ${r.start})${lvl < r.need ? ` · level ${r.need}+ advised` : ''}`, fn: () => game.enterCastleFloor(r.start) })),
      { label: 'Stay' },
    ],
  });
}

// ------------------------------------------------------------------------------------------- the quests
// From Act I and II into Bellmourn, from Bellmourn into Phobos, and through the castle to Lord Velscour.
const raidsWon = (c) => Object.keys(c.cleared || {}).filter((d) => +d % 5 === 0 && c.cleared[d]).length;
export const QUESTS = [
  { id: 'toll', where: 'Herrington Hollow', name: 'A Bell Tolls in the North', text: 'A courier in Bellmourn\'s grey brings word: the bells of Bellmourn ring for the dead of Phobos. Prove yourself: break three BOSS ROOMs.', need: (c) => (c.level || 1) >= 30 || (c.deepest || 0) >= 60,
    done: (c, a) => raidsWon(c) - a.raids >= 3 || raidsWon(c) >= 20 || (c.deepest || 0) >= 200, prog: (c, a) => `${Math.min(3, raidsWon(c) - a.raids)}/3 BOSS ROOMs` },
  { id: 'courier', where: 'Sunscorch Oasis', name: "The Courier's Road", text: 'The courier waits at the edge of the Scorched Wastes. Push the descent ten depths deeper.', done: (c, a) => (c.deepest || 0) - a.deepest >= 10 || (c.deepest || 0) >= 200, prog: (c, a) => `${Math.min(10, (c.deepest || 0) - a.deepest)}/10 depths` },
  { id: 'road', where: 'the descent', name: 'The Road to Bellmourn', text: 'Bellmourn stands where the Frozen Peaks begin. Reach Depth 200, or hero level 60, and the waypoint opens.', done: (c) => (c.deepest || 0) >= 200 || (c.level || 1) >= 60 || phobosState(c).bell, prog: (c) => `Depth ${c.deepest || 0}/200`, then: (c) => { phobosState(c).bell = true; UI.log('<b style="color:#c0d0ff">Bellmourn</b>\'s waypoint opens in Herrington Hollow and Sunscorch Oasis.', '#c0d0ff'); } },
  { id: 'tongue', where: BELLMOURN, name: 'The Bell Without a Tongue', text: 'The Bell-Warden asks you to thin what comes up the roads from Phobos: slay 300 foes.', done: (c, a) => (c.kills || 0) - a.kills >= 300, prog: (c, a) => `${Math.min(300, (c.kills || 0) - a.kills)}/300 slain` },
  { id: 'smoke', where: BELLMOURN, name: 'Smoke over Phobos', text: 'Break one more BOSS ROOM and the Bell-Warden will open the road to the Sill.', done: (c, a) => raidsWon(c) - a.raids >= 1 || (c.deepest || 0) >= 230, prog: (c, a) => `${Math.min(1, raidsWon(c) - a.raids)}/1 BOSS ROOM`, then: (c) => { phobosState(c).city = true; UI.log('The road to <b style="color:#ff6040">City State Phobos</b> opens from Bellmourn.', '#ffb0a0'); } },
  { id: 'friends', where: 'Phobos', name: 'Friends in Low Places', then: (c) => { c.skillPoints = (c.skillPoints || 0) + 1; UI.log('The hidden houses teach you their tricks: +1 skill point.', '#ffd860'); }, text: 'Find the city\'s hidden houses: the Pennyless, the Quiet Watch and the Ashwardens.', done: (c) => Object.keys(phobosState(c).hubs).length >= 3, prog: (c) => `${Object.keys(phobosState(c).hubs).length}/3 houses` },
  { id: 'wards', where: 'Phobos', name: 'The Wards of Phobos', text: `Break ${WARDS_TO_OPEN} ward lords and the Castle Gate opens.`, done: (c) => phobosState(c).gate, prog: (c) => `${phobosState(c).wards.length}/${WARDS_TO_OPEN} ward lords` },
  ...WINGS.map((w, i) => ({ id: 'wing' + i, where: 'Castle Velscour', name: i === 9 ? 'The Throne Above' : w.name, text: i === 9 ? 'Climb the Keep to Floor 100 and throw Lord Velscour down.' : `Fight through ${w.name} and break its lord on Floor ${(i + 1) * 10}.`,
    done: (c) => !!phobosState(c).cleared[(i + 1) * 10], prog: (c) => `Floor ${Math.max(1, phobosState(c).floor)}/${(i + 1) * 10}` })),
  { id: 'again', where: 'Castle Velscour', name: 'He Cannot Truly Die', text: 'Lord Velscour rises again on the Throne Above in another of his battles. Win all three: the Crimson Dynasty, the Obsidian Eclipse, the Cathedral of Ruin.', done: (c) => phobosState(c).vSeen.length >= 3, prog: (c) => `${phobosState(c).vSeen.length}/3 battles` },
];
const snap = (c) => ({ kills: c.kills || 0, raids: raidsWon(c), deepest: c.deepest || 0 });
let qT = 0;
/** Move the chain on (every couple of seconds, and on events). */
export function questTick(dt = 99) {
  const c = G.char; if (!c) return;
  if ((qT -= dt) > 0) return; qT = 2;
  const S = phobosState(c);
  if (S.q >= QUESTS.length) return;
  const Q = QUESTS[S.q];
  if (!S.qAt) { if (Q.need && !Q.need(c)) return; S.qAt = snap(c); UI.log(`<b style="color:#c0d0ff">New quest — ${Q.name}</b> (${Q.where}): ${Q.text}`, '#d0dcff'); }
  if (Q.done(c, S.qAt)) {
    if (Q.then) Q.then(c);
    UI.centerMsg('QUEST COMPLETE', Q.name, 3); sfx('levelup');
    c.gold = (c.gold || 0) + Math.round(2000 * (1 + S.q) * (1 + (c.level || 1) / 20));
    S.q++; S.qAt = null; qT = 0;
    if (G.game) G.game.autosave();
  }
}
/** The Quest Log's Act III lines. */
export function questLogHtml(step) {
  const c = G.char; if (!c) return '';
  const S = phobosState(c);
  if (S.q >= QUESTS.length) return step(true, '<b>Act III</b>: every quest is done. Velscour\'s battles can be fought again from Bellmourn.');
  const Q = QUESTS[S.q];
  if (!S.qAt) return Q.need && !Q.need(c) ? '' : '';
  return step(false, `<b style="color:#c0d0ff">${escapeHtml(Q.name)}</b> <span class="dim">(${escapeHtml(Q.where)})</span> — ${escapeHtml(Q.text)} <b>${Q.prog(c, S.qAt)}</b>`);
}
function questDialog() {
  const c = G.char, S = phobosState(c), Q = QUESTS[S.q];
  UI.dialog({ title: 'The Bell-Warden', html: Q ? `<p><b>${escapeHtml(Q.name)}</b></p><p>${escapeHtml(Q.text)}</p>${S.qAt ? `<p class="dim">${Q.prog(c, S.qAt)}</p>` : ''}` : '<p>The bells are quiet. Velscour has fallen — for now.</p>', buttons: [{ label: 'Farewell' }] });
  questTick();
}
void Column; void glowSprite; void burst; void angleTo; void rand; void FINAL_DEPTH; void LAYOUTS; void PHOBOS_BY_ID; void cityRegion;
