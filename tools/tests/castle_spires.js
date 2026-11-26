// The Broken Spires (world/castlespires.js, gfx/spires3d.js): every crossing kind forced through G.spiresPlan on a
// spires floor; the level loads, start -> each crossing's brink -> exit is reachable over floor or leap pads, shots.
//   node tools/tests/castle_spires.js [kinds]
const { openGame, report } = require('./harness');
(async () => {
const kinds = (process.argv[2] || 'bridge,leap,gondola,masonry,hands,bellrope,collapse,cart,spine').split(',');
  const { browser, page, errors, shot } = await openGame({ width: 1280, height: 720 });
let bad = 0;
for (const kind of kinds) {
  const r = await page.evaluate(async (kind) => {
    const { G, game } = window.VELSCOUR;
    if (!G.player) { await game.newChar('paladin', 'Spirewalker'); document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; }
    G.godMode = true; G.phobosLayoutWant = 'spires'; G.spiresPlan = { helices: 2, cross: ['bridge', kind], style: 'storm' };
    await game.enterCastleFloor(73);
    const w = G.world, gen = G.lastSpires || {}, m = w.map, sp = gen.spires;
    if (!sp) return { err: 'keys ' + Object.keys(G.lastSpires || {}).join() + ' no spires gen (layout ' + G.phobosLayout + ', world ' + (w.biome && w.biome.id) + ' ' + m.w + 'x' + m.h + ', depth ' + G.depth + ')' };
    const pads = (w.hazards || []).filter((h) => h.L).map((h) => h.L);
    // flood fill over walkable tiles, jumping along pads
    const key = (x, y) => (y | 0) * m.w + (x | 0), seen = new Set([key(...gen.start)]), q = [gen.start.map((v) => v | 0)];
    while (q.length) {
      const [x, y] = q.pop();
      for (const L of pads) if (Math.hypot(L.x - x - 0.5, L.y - y - 0.5) < 1.6 && !seen.has(key(L.tx, L.ty))) { seen.add(key(L.tx, L.ty)); q.push([L.tx | 0, L.ty | 0]); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(key(nx, ny))) continue;
        if (!m.walkable(nx + 0.5, ny + 0.5)) continue; seen.add(key(nx, ny)); q.push([nx, ny]);
      }
    }
    const exitOk = seen.has(key(...gen.exit));
    return { kind, crossings: sp.crossings.map((c) => c.kind), towers: sp.towers.length, exitOk, pads: pads.length, size: [m.w, m.h] };
  }, kind).catch((e) => ({ err: String(e) }));
  console.log(JSON.stringify(r));
  if (r.err || !r.exitOk) bad++;
  await page.waitForTimeout(1500);
  await shot('castle_spires_' + kind);
}
report(errors);
await browser.close();
if (bad) { console.log(`FAIL: ${bad} floor(s)`); process.exit(1); }
console.log('castle_spires: ok');
})().catch((e) => { console.error(e); process.exit(1); });
