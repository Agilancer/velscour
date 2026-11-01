// #10 WRECKERS' REEF's own checks (run by tools/tests/seabattle.js wreckers_reef): the reef is the arena. Down the plank
// from the Dawnwake's starboard rail onto the west lamp rock, to every false lamp, up the ramp onto the wreck's heeled
// deck and to every berth's landing; a longboat beaches and its crew leap ashore; a mine struck from range blows where
// it lies, one shoved by a melee blow rolls into a foe and blows; a lamp is doused and another broken (unless auto-play
// is fighting it: then it must put them out itself).
module.exports = async ({ page, run, look, shot, expect, auto, id }) => {
  let s;
  const r10 = await page.evaluate(() => {
    const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, m = G.world.map, p = G.player;
    const to = (q) => { const r = m.walkable(q[0], q[1]) ? q : m.randomNear(q[0], q[1], 1.0); return !!(r && m.findPath(p.x, p.y, r[0], r[1], 80000)); };
    return { plank: st.plank.isOpen, walk: st.deck.walkN, lamps: st.lamps.map((L) => to(L.stand)), wreck: to(st.wreckAt), wreckWalk: m.walkable(...st.wreckAt),
      land: st.berths.map((b) => b.land.map((q) => m.walkable(q[0], q[1]) && to(q))), mines: st.mines.length };
  });
  console.log(`  reef: ${JSON.stringify(r10)}`);
  expect(r10.plank && r10.lamps.every(Boolean) && r10.wreck && r10.wreckWalk, `${id}: down the plank to every false lamp and up onto the wreck (${JSON.stringify(r10)})`);
  expect(r10.land.every((q) => q.every(Boolean)), `${id}: every berth's landing is on the reef (${JSON.stringify(r10.land)})`);
  // a longboat beaches and leaps her crew ashore
  let bt = null; for (let i = 0; i < 120 && !bt; i++) { s = await run(0.2, null, false); bt = await page.evaluate(() => { const b = window.VELSCOUR.G.world.seaState.boats.find((q) => q.reef && q.st === 'dock' && q.crew.length); return b ? [b.x, b.y] : null; }); }
  expect(!!bt, `${id}: a longboat beaches on the reef`);
  if (bt) { s = await run(0.5, null, false); await look(bt[0] - 3, bt[1] - 2, 0.95, 0); await shot(`sea_${id}_beach`); s = await run(1.0, null, false); await look(bt[0] - 3, bt[1] - 2, 0.95, 0); await shot(`sea_${id}_beach2`); }
  // the mines: one struck from range blows where it lies; one shoved rolls into a foe and blows
  const mn = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR, api = G.world.seaRun.api, st = api.state, p = G.player, tick = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 30; game.update(1 / 30); } };
    for (let i = 0; i < 200 && st.mines.filter((o) => o.st === 'rest').length < 2; i++) tick(3);
    const rest = st.mines.filter((o) => o.st === 'rest'); if (rest.length < 2) return { rest: rest.length };
    const [a, b] = rest, out = { rest: rest.length };
    // from range: a foe beside it, the hero 6 tiles off
    const f1 = api.spawnOnDeck(null, 'normal', [a.x + 0.8, a.y + 0.6], 99); f1.static = true;
    const q1 = G.world.map.randomNear(a.x - 5, a.y, 2) || [a.x - 5, a.y]; p.x = q1[0]; p.y = q1[1]; p.moveTarget = null; p.path = null;
    a.m.hp -= 10; tick(20); out.ranged = a.gone; out.f1 = f1.dead || f1.hp < f1.maxHp;
    // up close: the hero beside it, a foe 3 tiles beyond, the shove carries it there
    const dx = 1, f2 = api.spawnOnDeck(null, 'normal', [b.x + 2.6 * dx, b.y], 99); f2.static = true;
    p.x = b.x - 1.2; p.y = b.y; b.m.hp -= 10; tick(2); out.shoved = b.st === 'shove'; tick(40); out.blew = b.gone; out.f2 = f2.dead || f2.hp < f2.maxHp;
    return out;
  });
  console.log(`  mines: ${JSON.stringify(mn)}`);
  expect(mn.rest >= 2 && mn.ranged && mn.f1 && mn.shoved && mn.blew, `${id}: mines blow when struck, and shoved ones roll on (${JSON.stringify(mn)})`);
  if (!auto) {   // douse one light, break another
    const L = await page.evaluate(() => { const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, p = G.player, L = st.lamps[1]; p.x = L.stand[0]; p.y = L.stand[1]; p.moveTarget = null; p.path = null; L.mark.use(); return L.at; });
    s = await run(1.0, null, false); await look(L[0], L[1], 1.1, 0); await shot(`sea_${id}_dousing`);
    s = await run(1.0, null, false);
    const lit = await page.evaluate(() => { const { G } = window.VELSCOUR, api = G.world.seaRun.api, st = api.state; api.kill(st.lamps[2].m); for (let i = 0; i < 10; i++) { G.time += 1 / 30; window.VELSCOUR.game.update(1 / 30); } return st.lamps.map((q) => q.lit); });
    expect(!lit[1] && !lit[2] && lit[0], `${id}: a light doused and a light broken (${JSON.stringify(lit)})`);
  }
  const w = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.wreckAt);
  await look(w[0], w[1], 0.9, 0); await shot(`sea_${id}_wreck`);
  const e = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.lamps[0].at);
  await look(e[0] - 4, e[1], 0.9, 0); await shot(`sea_${id}_eastlight`);
  return s;
};
