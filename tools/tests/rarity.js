// Gear rarity and item level: how strong each rarity is, in item levels, as auto-play's own hero score sees it
// (charScore: log offense + log effective life). A hero of a class at a level wears Common gear and one slot at a
// time takes an item of one (item level, rarity); the score is averaged over every slot and many seeded rolls, and
// each rarity is matched to the Common item level that scores the same: its "worth" in levels. Checks the rules of
// the rarity overhaul (docs/HANDOFF.md, "Gear rarity overhaul"):
//   - every item level beats the one before it (Common and Rare items rise level by level),
//   - each rarity is worth more levels than the one below it, and Epic -> Legendary -> Mythic steps grow,
//   - a level 25 Rare beats a level 10 Mythic (averaged over slots, and the weapon and body armor alone),
//   - drop rates: each rarity rarer than the last, Mythic at most 0.02% of plain drops.
//   node tools/tests/rarity.js [classes] [samples]       # default paladin,wizard,ranger 30
const { openGame, report } = require('./harness');
const classes = (process.argv[2] || 'paladin,wizard,ranger').split(',');
const samples = +(process.argv[3] || 30);

(async () => {
  const { browser, page, errors } = await openGame();
  let fail = 0;
  const bad = (m) => { fail++; console.log('FAIL ' + m); };

  // drop rates
  const rates = await page.evaluate(async () => {
    const { rollRarity, RARITY } = await import('/src/data/items.js');
    const N = 400000, out = {};
    for (const [name, mf, bonus] of [['normal', 0, 0], ['champion', 0, 0.3], ['unique', 0, 0.6], ['boss', 0, 1.2], ['100% MF', 100, 0], ['gamble', 120, 0.5]]) {
      const n = RARITY.map(() => 0);
      for (let i = 0; i < N; i++) n[rollRarity(mf, bonus)]++;
      out[name] = n.map((x) => (x / N) * 100);
    }
    return { out, names: RARITY.map((r) => r.name), lv: RARITY.map((r) => r.lv) };
  });
  console.log('drop rates (% of items)      ' + rates.names.map((n) => n.padStart(10)).join(''));
  for (const [k, v] of Object.entries(rates.out)) console.log(k.padEnd(28) + v.map((x) => x.toFixed(x < 1 ? 3 : 1).padStart(10)).join(''));
  const nr = rates.out.normal;
  for (let r = 1; r < nr.length; r++) if (!(nr[r] < nr[r - 1])) bad(`${rates.names[r]} is not rarer than ${rates.names[r - 1]}`);
  if (!(nr[5] <= 0.02)) bad(`Mythic drops ${nr[5].toFixed(3)}% of the time at no magic find (want <= 0.02%)`);
  if (!(rates.out.boss[4] > nr[4] && rates.out['100% MF'][3] > nr[3])) bad('bosses or magic find do not improve the odds');

  const all = []; // worth rows of every class and hero level
  for (const cls of classes) {
    const res = await page.evaluate(async ({ cls, samples }) => {
      const { G, game } = window.VELSCOUR;
      const { Auto, charScore } = await import('/src/game/autoplay.js');
      const { rollItem, RARITY, RING_SLOTS } = await import('/src/data/items.js');
      const { CLASSES } = await import('/src/data/classes.js');
      if (Auto.on) Auto.toggle(false);
      let c, p;
      const C = CLASSES[cls];
      const slots = ['weapon', ...(C.offhand ? ['offhand'] : []), 'head', 'body', 'hands', 'legs', 'feet', ...RING_SLOTS];
      // a fresh hero of level lvl, stats and skills spent the way auto-play spends them
      const setLevel = async (lvl) => {
        await game.newChar(cls, 'Rarity');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        c = G.char; p = G.player;
        c.level = lvl; c.depth = lvl; c.statPoints = (lvl - 1) * 5; c.skillPoints = lvl * 2;
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
      };
      const roll = (slot, ilvl, rarity) => rollItem(ilvl, { slot: slot.startsWith('ring') ? 'ring' : slot, rarity, base: slot === 'weapon' ? C.weapon : slot === 'offhand' ? C.offhand : undefined });
      // seeded rolls: every call draws the same random numbers, so two item levels compare on identical rolls
      const realRandom = Math.random;
      const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      // average score over single-item swaps: the hero wears Common gear of item level baseIlvl and one slot at a
      // time (every slot, or just `only`) takes an item of (ilvl, rarity)
      const score = (ilvl, rarity, only, baseIlvl = ilvl, n = samples) => {
        let t = 0, k = 0;
        const rb = seeded(1234), ri = seeded(98765);
        try {
          for (let i = 0; i < n; i++) {
            Math.random = rb;
            const base = {}; for (const s of slots) base[s] = roll(s, baseIlvl, 0);
            for (const s of only || slots) {
              for (const x of slots) c.equip[x] = base[x];
              Math.random = ri;
              c.equip[s] = roll(s, ilvl, rarity);
              Math.random = realRandom;
              p.recompute(); p.hp = p.maxHp; p.mana = p.maxMana; t += charScore(p); k++;
            }
          }
        } finally { Math.random = realRandom; }
        return t / k;
      };
      // the Common item level that scores s (linear between the two Common levels around it)
      const worth = (curve, s) => {
        for (let i = 1; i < curve.length; i++) if (curve[i][1] >= s) {
          const [l0, s0] = curve[i - 1], [l1, s1] = curve[i];
          return l0 + (l1 - l0) * (s - s0) / Math.max(1e-9, s1 - s0);
        }
        return Infinity;
      };
      const out = { worth: {}, mono: [], checks: [] };
      for (const H of [12, 30, 60, 120]) {
        await setLevel(H + 4);
        const curve = []; for (let l = Math.max(1, H - 12); l <= H + 34; l += 2) curve.push([l, score(l, 0, null, H)]);
        out.worth[H] = RARITY.map((r) => +(worth(curve, score(H, r.id, null, H)) - H).toFixed(1));
        if (H === 30) {
          // level by level: Common and Rare items, ilvl 20..40
          let prevC = -Infinity, prevR = -Infinity;
          for (let l = 20; l <= 40; l++) {
            const sc = score(l, 0, null, 30), sr = score(l, 2, null, 30);
            out.mono.push([l, +sc.toFixed(4), +sr.toFixed(4)]);
            if (sc <= prevC) out.checks.push(`Common ilvl ${l} scores no better than ilvl ${l - 1}`);
            if (sr <= prevR) out.checks.push(`Rare ilvl ${l} scores no better than ilvl ${l - 1}`);
            prevC = sc; prevR = sr;
          }
        }
      }
      // the headline rule at a level 25 hero (single slots get many more rolls: they are noisier)
      await setLevel(25);
      const h = {
        any: [score(25, 2, null, 18), score(10, 5, null, 18)],
        weapon: [score(25, 2, ['weapon'], 18, samples * 8), score(10, 5, ['weapon'], 18, samples * 8)],
        body: [score(25, 2, ['body'], 18, samples * 8), score(10, 5, ['body'], 18, samples * 8)],
      };
      for (const [k, [r, m]] of Object.entries(h)) if (!(r > m)) out.checks.push(`a level 25 Rare ${k === 'any' ? 'item (average over slots)' : k} loses to a level 10 Mythic (${r.toFixed(4)} vs ${m.toFixed(4)})`);
      out.head = h;
      return out;
    }, { cls, samples });
    console.log(`\n${cls}: rarity worth in item levels over Common (hero level H+4, one item at a time)`);
    console.log('  H     ' + rates.names.map((n) => n.slice(0, 6).padStart(8)).join(''));
    for (const [H, w] of Object.entries(res.worth)) {
      console.log('  ' + String(H).padEnd(6) + w.map((x) => String(x).padStart(8)).join(''));
      all.push(w);
    }
    const h = res.head;
    console.log('  level 25 hero, Rare 25 vs Mythic 10: ' + Object.entries(h).map(([k, [r, m]]) => `${k} ${r.toFixed(4)} vs ${m.toFixed(4)}`).join(' | '));
    console.log('  ilvl 20-40 (Common, Rare item scores): ' + res.mono.map(([l, a, b]) => `${l}:${a}/${b}`).join(' '));
    for (const m of res.checks) bad(`${cls}: ${m}`);
  }
  // averaged over every class and hero level (single rows are noisy: a few lucky +skill lines move them)
  const mean = rates.names.map((_, r) => all.reduce((a, w) => a + Math.min(w[r], 60), 0) / all.length);
  console.log('\nmean worth  ' + mean.map((x) => x.toFixed(1).padStart(8)).join('') + '    (rarity lv ' + rates.lv.join('/') + ')');
  for (let r = 1; r < mean.length; r++) if (!(mean[r] > mean[r - 1] + 1)) bad(`${rates.names[r]} is worth no more than ${rates.names[r - 1]}`);
  const steps = [3, 4, 5].map((r) => mean[r] - mean[r - 1]);
  if (!(steps[1] > steps[0] - 0.5 && steps[2] > steps[1] - 0.5)) bad(`Epic/Legendary/Mythic steps ${steps.map((x) => x.toFixed(1))} don't grow`);
  if (!(mean[5] < 20)) bad(`Mythic is worth ${mean[5].toFixed(1)} levels: too many for a level 25 Rare to beat a level 10 one`);
  console.log(fail ? `\n${fail} FAILED` : '\nALL RARITY CHECKS PASSED');
  if (fail) process.exitCode = 1;
  report(errors);
  await browser.close();
})();
