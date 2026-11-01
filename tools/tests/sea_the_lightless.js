// #6 THE LIGHTLESS's own checks (tools/tests/seabattle.js runs this after its arena check): the dreadnought is the
// arena and the plank to her is down; every turret's breech hatch and the stern walk can be walked to from the Dawnwake;
// each turret sweeps its telegraphed arcs at a hero near it (shots), and spiking it at its hatch silences it (its guns
// stop, the meter goes when the last one is); the Commodore waits until then. Auto-play spikes them itself.
module.exports = async ({ page, run, look, shot, expect, auto, id }) => {
  const r = await page.evaluate(() => {
    const { G } = window.VELSCOUR, api = G.world.seaRun.api, S = api.state, m = G.world.map, p = G.player;
    const path = (q) => !!(q && m.findPath(p.x, p.y, q[0], q[1], 90000));
    return { plank: S.plank.isOpen, deck: S.deck.walkN, marks: S.turrets.map((r) => [r.id, !!r.mark, path(r.at)]), stern: path(m.randomNear(...S.tile(0, 38.9), 1)),
      hold: !!G.world.seaRun.pushObjective, meter: G.world.seaRun.meter && G.world.seaRun.meter.label };
  });
  console.log(`  the lightless: ${JSON.stringify(r)}`);
  expect(r.plank && r.deck > 400, `${id}: the plank is down to her deck (${JSON.stringify(r)})`);
  expect(r.marks.length === 4 && r.marks.every((q) => q[1] && q[2]), `${id}: every breech hatch is marked and walkable to (${JSON.stringify(r.marks)})`);
  expect(r.stern && r.hold && /guns/.test(r.meter || ''), `${id}: the stern walk is reachable, the Commodore waits, her guns' meter (${JSON.stringify(r)})`);
  if (auto) return null;
  // each turret in turn: the hero on the lane near it, a sweep (shot at its arcs), then spiked at its hatch
  const out = [];
  for (const tid of ['A', 'B', 'D', 'C']) {
    const sw = await page.evaluate((tid) => {
      const { G, game } = window.VELSCOUR, S = G.world.seaRun.api.state, t = S.turrets.find((q) => q.id === tid), p = G.player, m = G.world.map;
      const lane = { A: [3.6, -27.5], B: [4.8, -20.5], D: [5.6, 15.5], C: [4.6, 25.5] }[tid], q = m.randomNear(...S.tile(...lane), 1.2) || t.at;
      for (let i = 0; i < 30 * 40 && G.cine; i++) { G.time += 1 / 30; game.update(1 / 30); }   // (the boarding's cut scene)
      p.x = q[0]; p.y = q[1]; p.moveTarget = null; p.path = null;
      for (const o of S.turrets) o.cd = o === t ? 0 : 9; S.globalT = 0;
      const n0 = S.sweeps; let i = 0;
      for (; i < 30 * 6 && S.sweeps === n0; i++) { G.time += 1 / 30; game.update(1 / 30); }
      return { swept: S.sweeps > n0, busy: !!t.busy, at: [p.x, p.y] };
    }, tid);
    s = await run(1.3, null, false);
    await shot(`sea_${id}_sweep_${tid}`);
    s = await run(1.6, null, false);
    const sp = await page.evaluate((tid) => {
      const { G, game } = window.VELSCOUR, S = G.world.seaRun.api.state, t = S.turrets.find((q) => q.id === tid), p = G.player;
      p.x = t.at[0]; p.y = t.at[1]; const mk = t.mark; mk.use();
      for (let i = 0; i < 30 * 1.5; i++) { G.time += 1 / 30; game.update(1 / 30); }
      return { spiked: t.spiked, gone: !G.world.portals.includes(mk), aim: +t.aim.toFixed(2), droop: t.cradle && +t.cradle.rotation.x.toFixed(2) };
    }, tid);
    out.push({ tid, ...sw, ...sp });
    if (tid === 'A' || tid === 'C') await shot(`sea_${id}_spiked_${tid}`);
  }
  console.log(`  turrets: ${JSON.stringify(out)}`);
  expect(out.every((q) => q.swept), `${id}: every turret sweeps its arcs at a hero near it (${JSON.stringify(out.map((q) => [q.tid, q.swept]))})`);
  expect(out.every((q) => q.spiked && q.gone && q.droop < 0), `${id}: spiked at its hatch, each turret's guns droop and stop (${JSON.stringify(out)})`);
  const after = await page.evaluate(() => { const { G } = window.VELSCOUR; return { hold: !!G.world.seaRun.pushObjective, meter: !!G.world.seaRun.meter, swept: G.world.seaRun.api.state.sweeps }; });
  expect(!after.hold && !after.meter, `${id}: every turret spiked, her guns' meter goes and the Commodore no longer waits (${JSON.stringify(after)})`);
  return null;
};
let s;
