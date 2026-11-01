// #7 FLIGHT DECK's own checks (run by tools/tests/seabattle.js flight_deck): the carrier is the arena. Up the brow from
// the Dawnwake's quarterdeck to both catapults' jam stations, both lifts and up the flag bridge's stair; a lift brings
// riders up from the hangar; a Kestrel launches down lane 1 and comes back strafing; a Thunderhawk off lane 2 torpedoes
// the Dawnwake (the hull meter fills); both catapults are jammed (unless auto-play is fighting it: then it must).
module.exports = async ({ page, run, look, shot, expect, auto, id }) => {
  let s;
  const r7 = await page.evaluate(() => {
    const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, m = G.world.map, p = G.player;
    const to = (q) => { const r = m.walkable(q[0], q[1]) ? q : m.randomNear(q[0], q[1], 1.2); return !!(r && m.findPath(p.x, p.y, r[0], r[1], 80000)); };
    return { brow: st.brow.isOpen, jams: st.cats.map((c) => to(c.jam)), lifts: st.el.map((e) => to(e.c)), boss: to(st.bossAt), walk: st.deck.walkN, tiles: st.el.map((e) => e.tiles.length), guards: st.guards.length };
  });
  console.log(`  carrier: ${JSON.stringify(r7)}`);
  expect(r7.brow && r7.jams.every(Boolean) && r7.lifts.every(Boolean) && r7.boss, `${id}: over the brow to both catapults, both lifts and the flag bridge (${JSON.stringify(r7)})`);
  expect(r7.tiles.every((n) => n > 20), `${id}: both lifts are walkable platforms (${JSON.stringify(r7.tiles)})`);
  const lift = () => page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.el.find((e) => e.st === 'rising')?.c || null);
  await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.raise(1, 4));
  let lf = null; for (let i = 0; i < 80 && !lf; i++) { s = await run(0.25, null, false); lf = await lift(); }
  if (lf) { s = await run(1.0, null, false); await look(lf[0], lf[1], 1, 37); await shot(`sea_${id}_lift`); }
  expect(!!lf, `${id}: a lift comes up from the hangar with riders`);
  // a launch down lane 1 and the strafing run after it, the hero standing in the open on her deck
  const L = await page.evaluate(() => {
    const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, p = G.player, c = st.cats[0], m = G.world.map;
    st.cats[1].t = 99; c.t = 0; const q = m.randomNear(c.from[0] - 7, c.from[1] + 3, 2) || [c.from[0] - 7, c.from[1] + 3]; p.x = q[0]; p.y = q[1]; p.moveTarget = null; p.path = null;
    return [c.from[0] + 6, c.from[1]];
  });
  s = await run(1.4, null, false); await look(L[0], L[1], 0.9, 37); await shot(`sea_${id}_launch`);
  s = await run(1.3, null, false); await look(L[0] + 6, L[1], 0.9, 37); await shot(`sea_${id}_launch2`);
  let sf = false; for (let i = 0; i < 80 && !sf; i++) { s = await run(0.1, null, false); sf = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.jets.some((j) => j.st === 'run' && j.kind === 'kestrel' && j.t > 0.9 && j.t < 1.6)); }
  expect(sf, `${id}: the Kestrel comes back on a strafing run`);
  const hero = () => page.evaluate(() => [window.VELSCOUR.G.player.x, window.VELSCOUR.G.player.y]);
  if (sf) { const p = await hero(); await look(p[0], p[1], 1, 37); await shot(`sea_${id}_strafe`); s = await run(1.0, null, false); await look(p[0], p[1], 1, 37); await shot(`sea_${id}_strafe2`); }
  // a Thunderhawk off lane 2, round to the Dawnwake's starboard beam: its torpedo, the hull meter
  const h0 = await page.evaluate(() => { const st = window.VELSCOUR.G.world.seaRun.api.state; st.cats[1].t = 0; return st.hull.value; });
  let tp = null; for (let i = 0; i < 160 && !tp; i++) { s = await run(0.2, null, false); tp = await page.evaluate(() => { const t = window.VELSCOUR.G.world.seaRun.api.state.torps[0]; return t && t.t > 1.0 ? [t.x, t.y] : null; }); }
  expect(!!tp, `${id}: a Thunderhawk drops a torpedo at her`);
  if (tp) { await look(tp[0] - 9, tp[1] + 3, 0.75, 0); await shot(`sea_${id}_torpedo`); }
  for (let i = 0; i < 60; i++) { s = await run(0.25, null, false); if (!(await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.torps.length))) break; }
  const h1 = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.hull.value);
  expect(h1 > h0, `${id}: the torpedo holes her (hull ${h0.toFixed(2)} -> ${h1.toFixed(2)})`);
  if (!auto) {   // jam both catapults: the hero stands at each shuttle while it's spiked
    for (const i of [0, 1]) {
      await page.evaluate((i) => { const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, p = G.player, c = st.cats[i]; p.x = c.jam[0]; p.y = c.jam[1]; p.moveTarget = null; p.path = null; st.marks[i].use(); }, i);
      s = await run(1.2, null, false); if (i === 0) await shot(`sea_${id}_jamming`);
      s = await run(1.6, null, false);
    }
    const j7 = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.cats.map((c) => c.jammed));
    expect(j7.every(Boolean), `${id}: both catapults jammed (${JSON.stringify(j7)})`);
    await page.evaluate(() => { const { G } = window.VELSCOUR, st = G.world.seaRun.api.state, p = G.player, q = G.world.map.randomNear(st.el[1].c[0] + 9, st.el[1].c[1], 2); if (q) { p.x = q[0]; p.y = q[1]; } });
  }
  const bd = await page.evaluate(() => window.VELSCOUR.G.world.seaRun.api.state.bossAt);
  await look(bd[0], bd[1], 0.9, 37); await shot(`sea_${id}_island`);
  return s;
};
