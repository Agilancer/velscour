// Heirlooms and Covenants in item levels, measured like tools/tests/rarity.js: a hero wears Common gear of item level H,
// one slot at a time takes an item, and its score (auto-play's charScore) is matched to the Common item level that
// scores the same. Targets (data/relics.js): a Heirloom drops about as often as a Legendary, so it should be worth about
// a Legendary (11.5 levels); a Covenant piece about an Epic (8); a full set's bonuses add on top, spread over 5 slots.
//   node tools/tests/relic_balance.js [classes] [samples]     # default paladin,wizard,ranger 16
const { openGame, report } = require('./harness');
const classes = (process.argv[2] || 'paladin,wizard,ranger').split(',');
const samples = +(process.argv[3] || 16);

(async () => {
  const { browser, page, errors } = await openGame();
  let fail = 0;
  const bad = (m) => { fail++; console.log('FAIL ' + m); };
  const rows = [];
  for (const cls of classes) {
    const res = await page.evaluate(async ({ cls, samples }) => {
      const { G, game } = window.VELSCOUR;
      const { Auto, charScore } = await import('/src/game/autoplay.js');
      const { rollItem, RING_SLOTS } = await import('/src/data/items.js');
      const R = await import('/src/data/relics.js');
      const { CLASSES } = await import('/src/data/classes.js');
      if (Auto.on) Auto.toggle(false);
      let c, p;
      const C = CLASSES[cls];
      const slots = ['weapon', ...(C.offhand ? ['offhand'] : []), 'head', 'body', 'hands', 'legs', 'feet', ...RING_SLOTS];
      const setLevel = async (lvl) => {
        await game.newChar(cls, 'Relics');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        c = G.char; p = G.player;
        c.level = lvl; c.depth = lvl; c.statPoints = (lvl - 1) * 5; c.skillPoints = lvl * 2;
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
      };
      const slotOf = (s) => (s.startsWith('ring') ? 'ring' : s);
      const roll = (slot, ilvl, kind) => {
        const sl = slotOf(slot);
        if (kind === 'heir') return R.makeHeirloom(ilvl, { slot: sl }) || rollItem(ilvl, { slot: sl, rarity: 4 });
        if (kind === 'cov') return R.makeCovenant(ilvl, { slot: sl }) || rollItem(ilvl, { slot: sl, rarity: 3 });
        return rollItem(ilvl, { slot: sl, rarity: kind, base: slot === 'weapon' ? C.weapon : slot === 'offhand' ? C.offhand : undefined });
      };
      const realRandom = Math.random;
      const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const score = (ilvl, kind, H, only = null) => {
        let t = 0, k = 0;
        const rb = seeded(1234), ri = seeded(98765);
        try {
          for (let i = 0; i < samples; i++) {
            Math.random = rb;
            const base = {}; for (const s of slots) base[s] = roll(s, H, 0);
            for (const s of only || slots) {
              for (const x of slots) c.equip[x] = base[x];
              Math.random = ri;
              c.equip[s] = roll(s, ilvl, kind);
              Math.random = realRandom;
              p.recompute(); t += charScore(p); k++;
            }
          }
        } finally { Math.random = realRandom; }
        return t / k;
      };
      // a whole set worn over the Commons, per set: score of the set vs the same five slots holding Epics / Mythics
      const setScore = (H, kind) => {
        let t = 0, k = 0;
        const rb = seeded(555), ri = seeded(777);
        try {
          for (const S of R.COVENANTS) {
            for (let i = 0; i < Math.max(4, samples / 4); i++) {
              Math.random = rb;
              for (const x of slots) c.equip[x] = roll(x, H, 0);
              Math.random = ri;
              const used = new Set();
              for (const q of S.pieces) {
                const slot = q.slot === 'ring' ? RING_SLOTS.find((r) => !used.has(r)) : q.slot;
                used.add(slot);
                if (!slots.includes(slot) && q.slot !== 'ring') continue;
                c.equip[slot] = kind === 'set' ? R.makeCovenant(H, { pieceId: q.id }) : rollItem(H, { slot: q.slot, rarity: kind, base: q.base });
              }
              Math.random = realRandom;
              p.recompute(); t += charScore(p); k++;
            }
          }
        } finally { Math.random = realRandom; }
        return t / k;
      };
      const worth = (curve, s) => {
        for (let i = 1; i < curve.length; i++) if (curve[i][1] >= s) { const [l0, s0] = curve[i - 1], [l1, s1] = curve[i]; return l0 + (l1 - l0) * (s - s0) / Math.max(1e-9, s1 - s0); }
        return Infinity;
      };
      const out = {};
      for (const H of [60, 120, 200]) {
        await setLevel(H + 4);
        const curve = []; for (let l = H - 10; l <= H + 60; l += 2) curve.push([l, score(l, 0, H)]);
        const w = (k) => +(worth(curve, score(H, k, H)) - H).toFixed(1);
        out[H] = { epic: w(3), legendary: w(4), mythic: w(5), heir: w('heir'), cov: w('cov'),
          set: +(setScore(H, 'set') - setScore(H, 3)).toFixed(3), setVsMythic: +(setScore(H, 'set') - setScore(H, 5)).toFixed(3) };
      }
      return out;
    }, { cls, samples });
    console.log(`\n${cls}: worth in item levels over Common (one item at a time); set: score of a whole set minus five Epics / five Mythics`);
    for (const [H, r] of Object.entries(res)) { console.log(`  H ${String(H).padEnd(4)} ${JSON.stringify(r)}`); rows.push(r); }
  }
  const avg = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const A = { epic: avg('epic'), legendary: avg('legendary'), mythic: avg('mythic'), heir: avg('heir'), cov: avg('cov'), set: avg('set'), setVsMythic: avg('setVsMythic') };
  console.log('\naverage', JSON.stringify(Object.fromEntries(Object.entries(A).map(([k, v]) => [k, +v.toFixed(2)]))));
  if (!(A.heir > A.epic && A.heir < A.mythic + 3)) bad(`a Heirloom should sit between an Epic and a little over a Mythic (${A.heir.toFixed(1)} levels)`);
  if (!(A.cov > A.epic - 3 && A.cov < A.legendary + 2)) bad(`a Covenant piece should be about an Epic (${A.cov.toFixed(1)} levels)`);
  if (!(A.set > 0)) bad('a full set should beat five Epics');
  if (!(A.setVsMythic < 0.25)) bad(`a full set should not beat five Mythics by much (${A.setVsMythic.toFixed(3)})`);
  report(errors);
  if (fail) process.exitCode = 1;
  await browser.close();
})();
