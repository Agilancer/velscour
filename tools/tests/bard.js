// The Bard's notation (src/data/notation.js, src/gfx/notation.js, src/game/bard.js):
//  1. glyph sheet: all 22 glyphs and the particle staff at the five skill-rank tiers -> bard_glyphs.png, bard_icons.png
//  2. composition: four quarter notes play a Cadence (+Harmony), an overfull bar is a Discord, clefs change the key,
//     the bass key lands a chord, Da Capo plays a part-filled bar, Rubato forgives an overfull bar (neither writes its own
//     note into the next bar: one bar at a time)
//  3. showcase shots of the note skills at ranks 1/5/10/15/20, the game stepped frame by frame -> bard_<skill>_L<n>.png
//  4. auto-play: a Bard plays N game minutes and must play Cadences far more often than Discords
//   node tools/tests/bard.js [autoplay minutes, default 4] [mobile]
const { openGame, report, OUT_DIR } = require('./harness');
const minutes = +(process.argv[2] || 4);
const MOBILE = process.argv.includes('mobile');
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

(async () => {
  const { browser, page, errors } = await openGame(MOBILE ? { width: 844, height: 390, mobile: true } : {});
  // ------------------------------------------------------------ 1. glyph sheet + icons
  const sheet = await page.evaluate(async () => {
    const { NOTES } = await import('/src/data/notation.js');
    const { drawGlyph, drawStaff, drawNoteShape, TIERS } = await import('/src/gfx/notation.js');
    const { skillIcon } = await import('/src/ui/icons.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const c = document.createElement('canvas'); c.id = 'glyphsheet'; c.width = 1200; c.height = 700;
    Object.assign(c.style, { position: 'fixed', left: 0, top: 0, zIndex: 9999 });
    const x = c.getContext('2d');
    x.fillStyle = '#0c0812'; x.fillRect(0, 0, c.width, c.height);
    x.font = '12px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#c8b8a0';
    const ids = Object.keys(NOTES);
    ids.forEach((id, i) => {
      const cx = 60 + (i % 10) * 112, cy = 70 + Math.floor(i / 10) * 140;
      x.strokeStyle = 'rgba(242,230,196,0.25)';
      for (let l = 0; l < 5; l++) { x.beginPath(); x.moveTo(cx - 48, cy - 16 + l * 8); x.lineTo(cx + 48, cy - 16 + l * 8); x.stroke(); }
      drawGlyph(x, id, cx, cy, 2.3, '#fff8e2');
      x.fillStyle = '#c8b8a0'; x.fillText(NOTES[id].name.replace('Pair of tied', 'Tied'), cx, cy + 58);
    });
    // the staff trail at each tier (a sine path, as a note would leave)
    for (let t = 0; t < 5; t++) {
      const y0 = 360 + t * 66, pts = [];
      for (let i = 0; i < 16; i++) pts.push([1060 - i * 52, y0 + Math.sin(i * 0.5) * 10]);
      drawStaff(x, pts, t, 0.4 + t, 2, 1, t);
      x.save(); x.translate(pts[0][0], pts[0][1]); drawNoteShape(x, ['q', 'e2', 's4', 't8', 'treble'][t], 2, 0.3, t); x.restore();
      x.fillStyle = TIERS[t].staff; x.textAlign = 'left'; x.fillText(`ranks ${[1, 5, 10, 15, 20][t]}${t < 4 ? '-' + [4, 9, 14, 19][t] : '+'}`, 14, y0 + 4); x.textAlign = 'center';
    }
    document.body.appendChild(c);
    const ic = document.createElement('canvas'); ic.id = 'iconsheet'; ic.width = 20 * 60; ic.height = 4 * 60;
    Object.assign(ic.style, { position: 'fixed', left: 0, top: '710px', zIndex: 9999 });
    const ix = ic.getContext('2d');
    CLASS_SKILLS.bard.forEach((sk, i) => ix.drawImage(skillIcon(sk, 58), (i % 20) * 60 + 1, Math.floor(i / 20) * 60 + 1));
    document.body.appendChild(ic);
    return ids.length;
  });
  await page.setViewportSize({ width: 1200, height: 960 });
  await page.locator('#glyphsheet').screenshot({ path: `${OUT_DIR}/bard_glyphs.png` });
  await page.locator('#iconsheet').screenshot({ path: `${OUT_DIR}/bard_icons.png` });
  await page.evaluate(() => { document.querySelector('#glyphsheet').remove(); document.querySelector('#iconsheet').remove(); });
  await page.setViewportSize(MOBILE ? { width: 844, height: 390 } : { width: 1280, height: 720 });
  console.log(`glyph sheet: ${sheet} glyphs`);
  if (sheet !== 22) fail(`expected 22 glyphs, got ${sheet}`);

  // ------------------------------------------------------------ 1b. engraving: melodies written in many rhythms, read as sheet music
  const eng = await page.evaluate(async () => {
    const { melodies, keyName, STYLES } = await import('/src/data/melodies.js');
    const { realize, drawn } = await import('/src/game/bardmusic.js');
    const { drawMeasure } = await import('/src/gfx/notation.js');
    const { NOTES } = await import('/src/data/notation.js');
    const M = melodies();
    const names = new Set(M.map((j) => j.name)).size;
    // bars that fill 4/4 exactly, covering every glyph a skill writes (and a few more)
    const BARS = [['q', 'q', 'q', 'q'], ['e2', 'e2', 'h'], ['qd', 'e', 'q', 'q'], ['h', 'rq', 'q'], ['hd', 'q'], ['t8', 's2', 'e', 'q', 'rq'],
      ['qd', 'qd', 'e', 'e'], ['e', 'e', 'e', 'e', 's2', 's2', 'rq'], ['s4', 'e2', 'rs', 's3', 'e', 're'], ['re', 'e', 'h', 'q'], ['q', 's4', 'rq', 'e2'], ['h', 'h']];
    const REG = ['song', 'trick', 'sonic'];
    const c = document.createElement('canvas'); c.id = 'engrave'; c.width = 1400; c.height = 1000;
    Object.assign(c.style, { position: 'fixed', left: 0, top: 0, zIndex: 9999 });
    const x = c.getContext('2d');
    x.fillStyle = '#f4ecd8'; x.fillRect(0, 0, c.width, c.height);
    const bad = [];
    for (let i = 0; i < 12; i++) {
      const j = M[i * 167 % M.length], notes = [], reg = REG[i % 3], clef = i % 4 === 3 ? 'bass' : 'treble';
      let at = 0;
      for (const g of BARS[i]) { notes.push({ g, at, tier: 0, reg }); at += NOTES[g].beats; }
      realize(j, notes, clef);
      if (Math.abs(at - 4) > 1e-6) bad.push(`bar ${i} = ${at} beats`);
      const cx = 30 + (i % 2) * 690, cy = 70 + Math.floor(i / 2) * 155;
      drawMeasure(x, { x: cx, top: cy, w: 640, u: 11, clef, key: j.key, notes: drawn(notes), col: '#1a1020', final: true });
      x.fillStyle = '#5a3a20'; x.font = 'italic 14px Georgia'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillText(`${j.name} · ${STYLES[j.style].name} · ${keyName(j.key)} · ♩=${j.tempo} · ${j.A.chords.map((ch) => ch.roman).join('–')} · ${reg}`, cx, cy - 28);
    }
    document.body.appendChild(c);
    return { names, count: M.length, bad };
  });
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.locator('#engrave').screenshot({ path: `${OUT_DIR}/bard_engraving.png` });
  await page.evaluate(() => document.querySelector('#engrave').remove());
  await page.setViewportSize(MOBILE ? { width: 844, height: 390 } : { width: 1280, height: 720 });
  console.log(`melodies: ${eng.count}, ${eng.names} names (rules and uniqueness: tools/tests/melodies.mjs)`);
  if (eng.count !== 2000 || eng.names !== 2000) fail('expected 2000 distinct melodies');
  for (const b of eng.bad) fail(b);

  // ------------------------------------------------------------ 2. composition rules
  const comp = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('bard', 'Minstrel');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true;
    game.buildDungeon(3, BIOME_BY_ID.catacombs);
    await new Promise((r) => setTimeout(r, 400));
    const { SKILLS, CLASS_SKILLS } = await import('/src/data/skills.js');
    const p = G.player;
    for (const sk of CLASS_SKILLS.bard) G.char.skills[sk.id] = 1;
    G.char.level = 40; p.recompute(); p.mana = p.maxMana = 99999;
    const byName = (n) => CLASS_SKILLS.bard.find((s) => s.name === n);
    const settle = () => { if (p.score && p.score.play && !p.score.play.done) p.score.play.flush(); }; // let a performed bar land
    const cast = (n) => { settle(); p.castLock = 0; p.cooldowns = {}; p.channel = null; p.mana = 99999; return p.tryUseSkill(byName(n), p.x + 3, p.y + 1); };
    const sc = () => ({ beats: p.score.beats, harmony: p.score.harmony, key: p.score.key, cad: p.score.cadences, dis: p.score.discords, notes: p.score.notes.length });
    const out = {};
    for (let i = 0; i < 4; i++) cast('Plucked Note');
    out.fourQuarters = sc();
    cast('Plucked Note'); cast('Plucked Note'); cast('Plucked Note'); cast('Ballad of Valor'); // 3 + 2 beats
    out.overfull = sc();
    cast('Sonic Boom'); out.bassKey = sc();
    const hp0 = G.world.creatures.filter((c) => c.team === 'enemy' && !c.dead).length;
    cast('Plucked Note'); cast('Plucked Note'); cast('Ballad of Valor'); out.bassCadence = sc();
    cast('Symphony of Storms'); out.trebleKey = sc();
    const clear = () => { p.score.notes.length = 0; p.score.beats = 0; };
    clear(); const cad0 = p.score.cadences;
    cast('Plucked Note'); cast('Sharp Note'); cast('Da Capo'); out.daCapo = { ...sc(), played: p.score.cadences - cad0 };
    clear(); cast('Plucked Note'); cast('Plucked Note'); cast('Plucked Note'); cast('Sharp Note'); const cad2 = p.score.cadences; cast('Plucked Note'); out.fits = { ...sc(), played: p.score.cadences - cad2, glyphs: p.score.play.notes.map((n) => n.g).join() }; // 3.5 + the basic note as an eighth
    clear(); const cad1 = p.score.cadences, dis1 = p.score.discords;
    cast('Tempo Rubato'); cast('Plucked Note'); cast('Plucked Note'); cast('Plucked Note'); cast('Anthem of Heroes');
    out.rubato = { ...sc(), played: p.score.cadences - cad1, broke: p.score.discords - dis1 };
    out.rests = (() => { settle(); p.score.notes.length = 0; p.score.beats = 0; p.mana = 10; p.cooldowns = {}; p.castLock = 0; p.tryUseSkill(byName('Requiem'), p.x, p.y); p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(byName('Hymn of Mending'), p.x, p.y); return Math.round(p.mana); })(); // two half rests
    // one song at a time: while the written bar is performed, casts write nothing; during its finishing bar they write
    // the next bar silently, and a bar completed then waits for the finishing bar to end
    settle(); p.score.notes.length = 0; p.score.beats = 0;
    const pluck = () => { p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(byName('Plucked Note'), p.x + 3, p.y); };
    for (let i = 0; i < 4; i++) pluck();
    const perf = p.score.play;
    pluck();
    const during = p.score.notes.length;
    for (let i = 0; i < 400 && perf.t < perf.lock + 0.02; i++) G.game.update(1 / 60);
    for (let i = 0; i < 4; i++) pluck();
    const queued = !!p.score.pending, samePerf = p.score.play === perf;
    for (let i = 0; i < 600 && p.score.play === perf; i++) G.game.update(1 / 60);
    const next = p.score.play !== perf && !p.score.pending, gap = next && perf.start ? +(p.score.play.start - (perf.start + perf.end)).toFixed(3) : null;
    out.oneSong = { during, queued, samePerf, next, gap, song: perf.song, finish: +(perf.end / perf.spb).toFixed(2) };
    out.harmonyDmg = (() => { const sk = SKILLS['bard.0.0'], h = p.score.harmony; p.score.harmony = 0; const a = p.skillDamage(sk, 1)[1]; p.score.harmony = 5; const b = p.skillDamage(sk, 1)[1]; p.score.harmony = h; return +(b / a).toFixed(2); })();
    void hp0;
    return out;
  });
  console.log('composition', JSON.stringify(comp));
  const c = comp;
  if (c.fourQuarters.cad !== 1 || c.fourQuarters.harmony !== 1 || c.fourQuarters.beats !== 0) fail('four quarter notes should play one Cadence');
  if (c.overfull.dis !== 1 || c.overfull.harmony !== 0 || c.overfull.beats !== 2) fail('3 beats + a half note should be a Discord leaving the half note');
  if (c.bassKey.key !== 'bass' || c.bassKey.beats !== 2) fail('Sonic Boom (bass clef) should change the key without taking beats');
  if (c.bassCadence.cad !== 2) fail('the bass measure should play a Cadence');
  if (c.trebleKey.key !== 'treble') fail('Symphony of Storms (treble clef) should change the key back');
  if (c.daCapo.played !== 1 || c.daCapo.notes !== 0) fail('Da Capo should play the part-filled measure without writing ahead');
  if (c.fits.beats !== 0 || c.fits.dis !== 1 || c.fits.played !== 1 || c.fits.glyphs !== 'q,q,q,e,e') fail(`the basic note should shrink to an eighth to fill the last half beat (${c.fits.glyphs})`);
  if (c.rubato.broke !== 0 || c.rubato.played !== 1 || c.rubato.notes !== 0) fail('Rubato should turn an overfull bar into a Cadence, writing nothing ahead');
  if (!(c.rests > 10)) fail('a bar of rests should restore mana at its Cadence');
  if (!(c.harmonyDmg > 1.25)) fail('Harmony 5 should add ~30% damage');
  if (c.oneSong.during !== 0) fail('nothing should be written while the written bar is performed');
  if (!c.oneSong.queued || !c.oneSong.samePerf || !c.oneSong.next) fail('a bar written during the finishing bar should wait for it, then play');
  if (c.oneSong.finish !== 8) fail(`a song should be the written bar plus a finishing bar (8 beats), got ${c.oneSong.finish}`);

  // ------------------------------------------------------------ 2b. the sampler and the performed bar
  const mus = await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player;
    const { initAudio } = await import('/src/core/audio.js');
    const { loadInstruments, keysLoaded } = await import('/src/core/sampler.js');
    const { melodies } = await import('/src/data/melodies.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const { registerOf } = await import('/src/data/notation.js');
    initAudio();
    const keys = await loadInstruments();
    const regs = {}; for (const sk of CLASS_SKILLS.bard) regs[registerOf(sk)] = (regs[registerOf(sk)] || 0) + 1;
    // four quarter notes: pitched from the bar's melody, then performed in its tempo
    if (p.score.play) p.score.play.done = true; // let no earlier performance flush into the count
    for (const h of G.world.hazards) h.dead = true; G.world.hazards.length = 0;
    p.score.notes.length = 0; p.score.beats = 0; p.score.key = 'treble';
    p.score.pending = null;
    const sk = CLASS_SKILLS.bard.find((s) => s.name === 'Plucked Note');
    const written = [];
    for (let i = 0; i < 3; i++) { p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + 3, p.y); written.push(p.score.notes[i].heads[0].midi); }
    const J = melodies()[p.score.mel], refit = p.score.notes.map((n) => n.heads[0].midi);
    p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + 3, p.y);
    const pl = p.score.play, seen = new Set(), launched = [];
    for (let i = 0; i < 60; i++) { // one second of the performance: notes leave the staff one by one
      G.game.update(1 / 60);
      for (const h of G.world.hazards) if (h.cadence) seen.add(h);
      launched.push(seen.size);
    }
    const cad0 = launched[0], cad1 = launched[59];
    return { keys, loaded: keysLoaded(), regs, written, refit, spb: pl && pl.spb, tempo: pl && pl.M.tempo, land: pl && pl.land, cad0, cad1, t: pl && +pl.t.toFixed(2) };
  });
  console.log('music', JSON.stringify(mus));
  if (mus.loaded !== 244) fail(`the harpsichord should load 244 samples (61 keys x 4 banks), got ${mus.loaded}`);
  if (Object.keys(mus.regs).length !== 3) fail('Bard skills should use all three touches');
  if (!mus.refit.every((m) => m >= 57 && m <= 84)) fail('written notes should sit in the treble (A3-C6)');
  if (!mus.spb || Math.abs(mus.spb - 60 / mus.tempo) > 1e-6 || mus.land !== 4) fail('a full bar should be performed in its melody tempo, the finishing bar from beat 4');
  if (!(mus.cad0 <= 1 && mus.cad1 >= 2)) fail(`treble cadence notes should launch as the playhead reaches them, not all at once (${mus.cad0} then ${mus.cad1})`);

  // ------------------------------------------------------------ 3. showcase shots, stepped frame by frame
  await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    // an open Wilds map, gore off, a closer camera: readable showcase shots
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(4, BIOME_BY_ID.overworld);
    await new Promise((r) => setTimeout(r, 600));
    for (const c of G.world.creatures) if (c.team === 'enemy') c.dead = true;
    G.world.creatures = G.world.creatures.filter((c) => c.team !== 'enemy');
    const { camera } = await import('/src/core/view.js'); G.settings.zoom = 1.45; G.settings.gore = 0; camera.computeZoom();
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    G.char.level = 40; for (const sk of CLASS_SKILLS.bard) G.char.skills[sk.id] = G.char.skills[sk.id] || 1;
    G.player.recompute(); G.player.mana = G.player.maxMana = 99999;
    const upd = window.__realUpdate = game.update.bind(game);
    window.__step = 0;
    game.update = (dt) => upd(window.__step > 0 ? (window.__step--, 1 / 60) : 0);
  });
  const step = async (n) => { await page.evaluate((k) => { window.__step = k; }, n); await page.waitForFunction(() => window.__step === 0); };
  const vp = page.viewportSize(), cw = Math.min(720, vp.width), ch = Math.min(440, vp.height);
  const clip = { x: (vp.width - cw) / 2, y: (vp.height - ch) / 2 - (MOBILE ? 0 : 30), width: cw, height: ch };
  const SHOW = [
    ['Plucked Note', [1, 5, 10, 15, 20], 9], ['Fan of Notes', [1, 10, 20], 12], ['Deadly Sonata', [20], 12], ['Screech', [5, 15], 10],
    ['Power Chord', [10], 10], ['Sound Wave', [15], 12], ['Tremolo', [20], 14], ['Shatter Note', [20], 18], ['Finale', [20], 40],
    ['Supersonic', [20], 30], ['Death Metal', [15], 26], ['Bass Drop', [10], 16], ['Harmonic Beam', [20], 30], ['Spinning Records', [20], 24],
    ['Feedback Loop', [10], 24], ['Thousand Notes', [15], 30], ['Lullaby', [5], 22], ['Sleight of Hand', [20], 16], ['Ballad of Valor', [20], 18],
    ['Sonic Boom', [15], 12], ['Showstopper', [20], 16], ['Pickpocket', [10], 20], ['Juggler\'s Toss', [15], 16],
  ];
  let shots = 0;
  for (const [name, levels, frames] of SHOW) {
    for (const L of levels) {
      const ok = await page.evaluate(async ([name, L]) => {
        const { G } = window.VELSCOUR, p = G.player, w = G.world;
        const { CLASS_SKILLS } = await import('/src/data/skills.js');
        const { camera } = await import('/src/core/view.js');
        const sk = CLASS_SKILLS.bard.find((s) => s.name === name);
        if (!sk) return false;
        for (const h of w.hazards) h.dead = true;
        w.hazards.length = 0;
        const { effects, particles } = await import('/src/gfx/vfx.js'); effects.length = 0; particles.length = 0;
        if (p.score.play) p.score.play.done = true;
        p.score.notes.length = 0; p.score.beats = 0;
        // a fresh crowd ahead of the Bard so the notes have something to hit
        let spot = null;
        for (let t = 0; t < 4000 && !spot; t++) {
          const x = 3 + Math.random() * (w.map.w - 6), y = 3 + Math.random() * (w.map.h - 6);
          let ok = true;
          for (let dx = -2; dx <= 6 && ok; dx++) for (let dy = -3; dy <= 3 && ok; dy++) ok = w.map.walkable(x + dx, y + dy);
          if (ok) spot = [x, y];
        }
        if (!spot) return false;
        p.x = spot[0]; p.y = spot[1]; p.path = null; p.moveTarget = null;
        const { makeMonster } = await import('/src/game/monster.js');
        w.creatures = w.creatures.filter((c) => c.team !== 'enemy');
        for (let k = 0; k < 5; k++) { // a fresh, tough little crowd ahead
          const m = makeMonster(w, 'skeleton', w.biome, 4, 'normal', p.x + 3.6 + (k % 2) * 1.1, p.y - 1.6 + k * 0.8);
          m.maxHp = m.hp = 1e7; m.awake = true; m.speed = 0; w.add(m);
        }
        G.char.skills[sk.id] = L; p.recompute(); p.mana = p.maxMana = 99999; p.castLock = 0; p.cooldowns = {}; p.channel = null;
        camera.follow(p.x + 1, p.y - 1, 0, true);
        p.tryUseSkill(sk, p.x + 4, p.y + 0.2);
        return true;
      }, [name, L]);
      if (!ok) { fail(`could not stage ${name}`); continue; }
      await page.mouse.move(vp.width / 2 + 150, vp.height / 2 + 40); // channelled beams follow the cursor
      await step(frames);
      await page.waitForTimeout(30);
      await page.screenshot({ path: `${OUT_DIR}/bard_${name.replace(/[^a-z]/gi, '')}_L${L}.png`, clip });
      shots++;
    }
  }
  // the measure over the head, part-filled, and a Cadence leaving the staff
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    if (p.score.play) p.score.play.done = true;
    p.score.notes.length = 0; p.score.beats = 0; p.score.harmony = 3; p.score.harmonyT = 99; p.score.key = 'treble';
    for (const n of ['Sharp Note', 'Fan of Notes', 'Power Chord', 'Echo']) { const sk = CLASS_SKILLS.bard.find((s) => s.name === n); G.char.skills[sk.id] = 12; p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + 4, p.y); }
  });
  await step(20);
  await page.screenshot({ path: `${OUT_DIR}/bard_measure.png`, clip });
  await page.evaluate(async () => {
    const { G } = window.VELSCOUR, p = G.player;
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    const sk = CLASS_SKILLS.bard.find((s) => s.name === 'Plucked Note'); p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + 4, p.y);
    p.castLock = 0; p.cooldowns = {}; p.tryUseSkill(sk, p.x + 4, p.y); // 2 + 1 + 1 beats: the bar is performed
  });
  await step(40);
  await page.screenshot({ path: `${OUT_DIR}/bard_cadence.png`, clip });
  console.log(`${shots} showcase shots`);

  // ------------------------------------------------------------ 4. auto-play
  const auto = await page.evaluate(async (minutes) => {
    const { G, game } = window.VELSCOUR;
    game.update = window.__realUpdate; G.bardStats = { cad: 0, dis: 0 };
    await game.newChar('bard', 'Autobard');
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(true);
    let sim = 0;
    while (sim < minutes * 60) {
      for (let i = 0; i < 15; i++) {
        if (G.mode !== 'game' || !G.world) break;
        G.dt = 1 / 30; G.time += G.dt; G.frame++;
        game.update(1 / 30);
        sim += 1 / 30;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    const sc = G.bardStats;
    return { cad: sc.cad, dis: sc.dis, harmony: G.player.score ? G.player.score.harmony : 0, lvl: G.char.level, depth: G.char.depth, kills: G.char.kills, deaths: G.char.deaths || 0 };
  }, minutes);
  console.log(`auto-play ${minutes} min: ${JSON.stringify(auto)}`);
  await page.screenshot({ path: `${OUT_DIR}/bard_autoplay.png` });
  if (!(auto.cad >= 5)) fail('auto-play played too few Cadences');
  if (auto.dis > auto.cad / 4) fail('auto-play hit too many Discords');
  console.log(bad ? `${bad} FAILURES` : 'BARD OK');
  if (bad) process.exitCode = 1;
  report(errors, 20);
  await browser.close();
})();
