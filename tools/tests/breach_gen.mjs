// The Breach generator without a browser (docs/ETERNAL_BREACH.md): N seeds, islands 8/5/3, every island reachable,
// the wards solvable in hop order, walkways, ruins. Tile sets are mocked from the packs' pack.json.
//   node tools/tests/breach_gen.mjs [seeds] [floor]
import { readFileSync } from 'fs';
import { generateBreach } from '../../src/world/breach.js';
const N = +(process.argv[2] || 60), FLOOR = +(process.argv[3] || 3);
const meta = (p) => JSON.parse(readFileSync(new URL(`../../assets/tiles/${p}/pack.json`, import.meta.url)));
function mockSet(pack, more) {
  const m = meta(pack), floors = [], bases = [];
  for (const [pm] of [[m], ...(more ? [[meta(more)]] : [])]) pm.floors.forEach((f) => { if (f.seamless) bases.push(floors.length); floors.push({ name: f.name }); });
  const sl = (r) => ({ arm: r[0], a: r[0], part: Array.isArray(r[0]) ? r[0][0] : r[0], du: 0, dv: 0 });
  const walls = {}; for (const [fam, masks] of Object.entries(m.walls)) { walls[fam] = {}; for (const [k, v] of Object.entries(masks)) walls[fam][k] = v.map((x) => x.map(sl)); }
  const arches = {}; for (const [d, dirs] of Object.entries(m.arches)) { arches[d] = {}; for (const [k, v] of Object.entries(dirs)) arches[d][k] = v.map(sl); }
  const doors = {}; for (const [d, dirs] of Object.entries(m.doors)) { doors[d] = {}; for (const [k, st] of Object.entries(dirs)) { doors[d][k] = {}; for (const [s, v] of Object.entries(st)) doors[d][k][s] = v.map(sl); } }
  const scatter = [...m.scatter, ...(more ? meta(more).scatter : [])].map((s) => ({ name: s.name, block: s.block }));
  return { floors, bases, features: [], walls, families: Object.keys(walls), arches, doors, scatter, k: 0.4 };
}
const ts = mockSet('veilscar_march', 'eternal_breach');
const em = mockSet('eternal_breach');
Object.assign(ts, { walls: em.walls, families: em.families, arches: em.arches, doors: em.doors });
let fails = 0, t0 = Date.now(), sizes = [];
for (let s = 1; s <= N; s++) {
  const seed = s * 104729;
  let g;
  try { g = generateBreach(FLOOR, { roster: [] }, ts, null, seed); } catch (e) { console.log('seed', seed, 'FAILED', e.message); fails++; continue; }
  const I = g.islands, k = (n) => I.filter((o) => o.kind === n).length;
  const errs = [];
  if (k('small') !== 8 || k('medium') !== 5 || k('large') !== 3) errs.push('island counts');
  // solve the wards: from the start, complete any reachable shrine, cross any walkway whose ward is done
  const done = new Set(), reach = new Set([g.startIsland]);
  for (let pass = 0; pass < 40; pass++) {
    for (const b of g.bridges) if ((b.ward < 0 || done.has(b.ward)) && (reach.has(b.a) || reach.has(b.b))) { reach.add(b.a); reach.add(b.b); }
    for (const i of reach) if (I[i].shrine && !I[i].heart) done.add(i);
  }
  if (reach.size !== 16) errs.push('wards leave ' + (16 - reach.size) + ' islands unreachable');
  if (done.size !== 7) errs.push('only ' + done.size + ' of 7 shrines winnable');
  if (!I[g.heart].heart || I[g.heart].kind !== 'large') errs.push('heart');
  // the same on the tiles: closed wards are blocked tiles; walk (hop rules), win every shrine reached, open its wards
  {
    const m = g.map, W = m.w, own = m.breach.own, blk = m.block.slice();
    for (const b of g.bridges) if (b.ward >= 0) for (const i of b.gate) blk[i] = 1;
    const seen = new Uint8Array(W * m.h), won = new Set();
    const s0 = m.tileIdx(g.start[0], g.start[1]); const q = [s0]; seen[s0] = 1;
    for (let pass = 0; pass < 20; pass++) {
      for (let k = 0; k < q.length; k++) {
        const i = q[k], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = i + dx + dy * W;
          if (x + dx < 0 || x + dx >= W || seen[j] || m.t[j] !== 1 || blk[j] || Math.abs(m.hgt[j] - m.hgt[i]) > m.climb) continue;
          seen[j] = 1; q.push(j);
        }
      }
      let more = false;
      for (const o of I) if (o.shrine && !o.heart && !won.has(o.idx) && seen[m.tileIdx(o.cx, o.cy)]) {
        won.add(o.idx); more = true;
        for (const b of g.bridges) if (b.ward === o.idx) for (const i of b.gate) { blk[i] = 0; const x = i % W, y = (i / W) | 0; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[i + dx + dy * W])) { seen[i] = 1; q.push(i); } }
      }
      if (!more) break;
    }
    if (won.size !== 7) errs.push('tiles: only ' + won.size + ' shrines won');
    if (I.some((o) => !seen[m.tileIdx(o.cx, o.cy)])) errs.push('tiles: an island never reached');
    // with no ward opened, the hero can't get past any (a walk round a ward means a leak)
    const s2 = new Uint8Array(W * m.h), q2 = [s0]; s2[s0] = 1;
    const blk2 = m.block.slice(); for (const b of g.bridges) if (b.ward >= 0) for (const i of b.gate) blk2[i] = 1;
    for (let k = 0; k < q2.length; k++) { const i = q2[k], x = i % W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = i + dx + dy * W; if (x + dx < 0 || x + dx >= W || s2[j] || m.t[j] !== 1 || blk2[j] || Math.abs(m.hgt[j] - m.hgt[i]) > m.climb) continue; s2[j] = 1; q2.push(j); } }
    for (const b of g.bridges) if (b.ward >= 0 && I[b.near].hops >= 0) {
      const farIn = I[b.far].tiles.some((i) => s2[i]), nearIn = I[b.near].tiles.some((i) => s2[i]);
      void farIn; void nearIn;
    }
    // islands reached on the tiles with every ward closed must be exactly those the walkway graph allows
    const graph = new Set([g.startIsland]);
    for (let more = true; more;) { more = false; for (const b of g.bridges) if (b.ward < 0 && graph.has(b.a) !== graph.has(b.b)) { graph.add(b.a); graph.add(b.b); more = true; } }
    const tiles = I.filter((o) => o.tiles.some((i) => s2[i])).map((o) => o.idx);
    const leak = tiles.filter((k) => !graph.has(k));
    if (leak.length) errs.push('tiles: past a ward to islands ' + leak.join(',') + ' (graph allows ' + [...graph].join(',') + ')');
    if (![...graph].some((k) => I[k].shrine && !I[k].heart)) errs.push('no shrine reachable at the start');
  }
  const warded = g.bridges.filter((b) => b.ward >= 0).length;
  sizes.push([g.map.w, g.map.h, g.bridges.length, warded, g.ruins.length, g.spawns.length, g.chests.length, g.props.length]);
  if (errs.length) { fails++; console.log('seed', seed, errs.join('; ')); }
}
const avg = (k) => (sizes.reduce((s, r) => s + r[k], 0) / sizes.length).toFixed(1);
console.log(`${N - fails}/${N} seeds ok in ${Date.now() - t0} ms; map ${avg(0)}x${avg(1)}, walkways ${avg(2)} (warded ${avg(3)}), ruins ${avg(4)}, packs ${avg(5)}, chests ${avg(6)}, props ${avg(7)}`);
process.exit(fails ? 1 : 0);
