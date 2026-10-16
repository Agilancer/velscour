// Seed sweep: every door must join the plaza over visible, unobstructed paving.
// node tools/tests/town_paths.js [count]
const { openGame, report } = require('./harness');
(async () => {
  const { browser, page, errors } = await openGame();
  const result = await page.evaluate(async (count) => {
    const { generateTown, VENDORS } = await import('/src/world/town.js');
    const failures = [], sides = new Set();
    let entrances = 0;
    const seeds = [1337, 42, 20261015, 0, 0xffffffff, ...Array.from({ length: count }, (_, i) => Math.imul(i + 1, 2654435761) >>> 0)];
    for (const seed of seeds) {
      const t = generateTown(null, seed), m = t.map;
      const seen = new Set(), q = [[Math.floor(t.start[0]), Math.floor(t.start[1])]];
      for (let h = 0; h < q.length; h++) {
        const [x, y] = q[h], i = y * m.w + x;
        if (seen.has(i) || !m.walkableTile(x, y) || m.v[i] === 0) continue;
        seen.add(i);
        q.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
      }
      if (t.npcs.length !== VENDORS.length) failures.push(`${seed}: missing vendors`);
      for (const b of t.buildings) {
        entrances++; sides.add(b.sx);
        const x = b.x0 + (b.sx ? 3 : 1), y = b.y0 + (b.sx ? 1 : 3);
        const door = b.approach[b.approach.length - 1];
        if (!seen.has(y * m.w + x) || !door || door[0] !== x || door[1] !== y || b.approach.some(([px, py], i, a) =>
          !seen.has(py * m.w + px) || (i && Math.abs(px - a[i - 1][0]) + Math.abs(py - a[i - 1][1]) !== 1))) {
          failures.push(`${seed}: ${b.name} lacks a continuous paved approach to its door`);
        }
      }
      if (!t.props.some((p) => p.spr?.name === 'village_well')) failures.push(`${seed}: plaza well lost`);
    }
    if (sides.size !== 2) failures.push('Did not exercise both door orientations');
    return { towns: seeds.length, entrances, failures };
  }, Number(process.argv[2] || 256));
  console.log(`Checked ${result.entrances} entrances across ${result.towns} towns`);
  errors.push(...result.failures);
  report(errors);
  await browser.close();
})();
