// #12 THE NINTH BELL's own checks (tools/tests/seabattle.js runs this after its arena check): the finale is never rolled
// before eight bells and always offered at eight until it is won (then everything is in the pool); Tolland's line and
// his bell goes down; the bell meter fills only while foes are on the Dawnwake's deck and stops while one stands at the
// davit; every size comes as it fills (the brig's broadsides, the grapple steamer, Kestrel strafing lanes, Thunderhawk
// torpedoes; shots of each); The Lightless closes and Gullwrack's light dims. It leaves the meter nearly full, so the
// battle's own run rings it (the cut scene) and the Hollow Commodore comes.
module.exports = async ({ page, run, look, shot, expect, auto, id }) => {
  const gate = await page.evaluate(async () => {
    const { pickSeaVariant } = await import('/src/game/seabattle.js'), { SEA_VARIANTS } = await import('/src/data/seabattle.js');
    const others = SEA_VARIANTS.filter((v) => !v.finale).map((v) => v.id), won8 = Object.fromEntries(others.slice(0, 8).map((k) => [k, 1]));
    const before = [...Array(200)].map((_, i) => pickSeaVariant(null, null, i % 2 ? {} : { [others[0]]: 1 }, i % 8).id);
    const at8 = [...Array(20)].map(() => pickSeaVariant(null, others[0], won8, 8).id);
    const after = new Set([...Array(300)].map(() => pickSeaVariant(null, 'x', { ...won8, ninth_bell: 1 }, 9).id));
    return { never: !before.includes('ninth_bell'), at8: at8.every((q) => q === 'ninth_bell'), after: after.size, all: SEA_VARIANTS.length, skull: pickSeaVariant('ninth_bell', null, {}, 0).id };
  });
  console.log(`  bells and order: ${JSON.stringify(gate)}`);
  expect(gate.never && gate.at8 && gate.after === gate.all && gate.skull === 'ninth_bell', `${id}: offered only after eight bells (then until won), every battle after it, the skull reaches it any time (${JSON.stringify(gate)})`);
  // Tolland goes down: his cut scene plays out
  const down = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR, run = G.world.seaRun, S = run.api.state;
    for (let i = 0; i < 30 * 40 && G.cine; i++) { G.time += 1 / 30; game.update(1 / 30); window.__seaSeen.add(run.phase + (run.phase === 'waves' ? run.wave : '')); }
    return { bell: +S.bell.position.y.toFixed(2), wl: run.api.WL, meter: run.meter && run.meter.label, tolland: run.api.cast.tolland.alpha };
  });
  console.log(`  down: ${JSON.stringify(down)}`);
  expect(down.bell < down.wl && down.meter === 'The Ninth Bell' && down.tolland === 0, `${id}: Tolland goes down in his bell, and the bell's meter shows (${JSON.stringify(down)})`);
  if (auto) return null;
  // the meter: still with an empty deck, still with a foe at the davit, filling while a foe stands elsewhere on her deck
  const fill = await page.evaluate(() => {
    const { G, game } = window.VELSCOUR, run = G.world.seaRun, api = run.api, S = api.state, M = run.meter;
    const clear = () => { for (const m of G.world.creatures) if (m.sea && !m.dead && m.team === 'enemy') api.kill(m); };
    const tick = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(); G.time += 1 / 30; game.update(1 / 30); window.__seaSeen.add(run.phase + (run.phase === 'waves' ? run.wave : '')); } };
    const out = {};
    clear(); tick(2); let v = M.value; tick(30, clear); out.empty = +(M.value - v).toFixed(4);
    const a = api.spawnOnDeck(null, 'normal', S.davit, 99); a.static = true; a.cd = 99; tick(3);
    v = M.value; tick(30); out.davit = +(M.value - v).toFixed(4); out.note = M.note; api.kill(a);
    const b = api.spawnOnDeck(null, 'normal', api.tileOf(2.5, -3), 99); b.static = true; b.cd = 99; tick(3);
    v = M.value; tick(30); out.fight = +(M.value - v).toFixed(4); api.kill(b);
    return out;
  });
  console.log(`  bell meter: ${JSON.stringify(fill)}`);
  expect(fill.empty < 0.004 && fill.davit < 0.004 && /davit/.test(fill.note) && Math.abs(fill.fight - 1 / 90) < 0.004, `${id}: the bell fills only while foes are on her deck, not with one at the davit (${JSON.stringify(fill)})`);
  // every size comes as it fills: shots of each
  const at = (k, foe = true) => page.evaluate(([k, foe]) => {
    const { G } = window.VELSCOUR, run = G.world.seaRun, api = run.api, S = api.state;
    run.meter.set(k); S.k = k;
    if (foe && ![...api.live].some((m) => !m.dead && m.keep)) { const m = api.spawnOnDeck(null, 'normal', api.tileOf(-2.5, 6), 99); m.static = true; m.keep = true; m.cd = 99; }
    return { k, ev: Object.keys(S.ev) };
  }, [k, foe]);
  await at(0.2); s = await run(5, null, false);
  const pl = await page.evaluate(() => [window.VELSCOUR.G.player.x, window.VELSCOUR.G.player.y]);
  await at(0.3); s = await run(1.6, null, false); await shot(`sea_${id}_strafe_lane`);
  s = await run(0.9, null, false); await shot(`sea_${id}_strafe_run`);
  s = await run(4, null, false);
  const brig = await page.evaluate(() => { const b = window.VELSCOUR.G.world.seaRun.api.state.brig; return b && [b.x, b.y, b.st]; });
  if (brig) { await look((brig[0] + pl[0]) / 2, (brig[1] + pl[1]) / 2, 0.75, 0); await shot(`sea_${id}_brig`); }
  await at(0.48); s = await run(2.0, null, false);
  await look(pl[0] + 6, pl[1], 0.85, 0); await shot(`sea_${id}_torpedo`);
  s = await run(2.5, null, false); await shot(`sea_${id}_torpedo_hit`);
  await at(0.7); s = await run(3, null, false);
  const ev = await page.evaluate(() => {
    const { G } = window.VELSCOUR, S = G.world.seaRun.api.state, kinds = new Set(G.world.seaState.boats.map((b) => b.kind));
    return { ev: Object.keys(S.ev), kinds: [...kinds], dn: [Math.round(S.dn.x - G.world.seaRun.api.OX), Math.round(S.dn.y - G.world.seaRun.api.OY)], light: +(S.lightAt ?? 1).toFixed(2), reward: G.world.seaRun.rewardK };
  });
  console.log(`  every size: ${JSON.stringify(ev)}`);
  expect(['brig', 'jet1', 'grapple', 'torp1', 'jet2', 'torp2'].every((q) => ev.ev.includes(q)), `${id}: the brig, the grapple steamer, the jets and the torpedoes come as the bell fills (${JSON.stringify(ev)})`);
  expect(ev.light < 0.6 && ev.dn[1] < 40, `${id}: The Lightless closes and Gullwrack's light dims (${JSON.stringify(ev)})`);
  // the waves keep coming while it is rung (the test's run counts them); nearly rung: the battle's own run rings it
  for (let k = 0; k < 40 && s.wave < 6 && s.phase === 'waves'; k++) { await page.evaluate(() => window.VELSCOUR.G.world.seaRun.meter.set(0.7)); s = await run(2); }
  await page.evaluate(() => { const { G } = window.VELSCOUR, run = G.world.seaRun; for (const m of run.api.live) if (m.keep) run.api.kill(m); run.meter.set(0.985); });
  return null;
};
let s;
