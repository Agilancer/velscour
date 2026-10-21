// Listen to the Bard: a level-40 Bard with the everyday Bard skills on his bar auto-plays a dungeon while every note
// the harpsichord is asked for is logged (src/core/sampler.js setNoteTap), timed as it would sound in real time.
//  1. one tune at a time: no two songs may sound together (the last chord is allowed its damper); a song is its
//     written bar then its finishing bar, and bars written during a finishing bar wait silently for their downbeat
//  2. clashes: share of sounding time with a minor second / major seventh / tritone between notes of the same bar
//     (the Discord cluster is meant to clash and is left out)
//  3. melody: notes per bar, the share of 16th/32nd figures written, leaps in the right hand; songs never repeat
//  4. renders the first N seconds to tools/tests/out/bard_listen.wav (the real samples, an OfflineAudioContext)
//   node tools/tests/bard_listen.js [game minutes, default 3] [seconds to render, default 60]
const fs = require('fs');
const { openGame, report, OUT_DIR } = require('./harness');
const minutes = +(process.argv[2] || 3), renderSec = +(process.argv[3] || 60);
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const BAR = ['bard.0.0', 'bard.1.0', 'bard.2.0', 'bard.2.1', 'bard.1.11', 'bard.1.1', 'bard.1.2', 'bard.1.6', 'bard.3.3', 'bard.0.1', 'bard.2.15', 'bard.3.1', 'bard.1.13', 'bard.0.11', 'bard.2.7'];

(async () => {
  const { browser, page, errors } = await openGame();
  const log = await page.evaluate(async ({ minutes, BAR }) => {
    const { G, game } = window.VELSCOUR;
    await game.newChar('bard', 'Listener');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0;
    const { initAudio } = await import('/src/core/audio.js');
    const { loadInstruments, setNoteTap } = await import('/src/core/sampler.js');
    initAudio(); await loadInstruments();
    const { CLASS_SKILLS, SKILLS } = await import('/src/data/skills.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    G.godMode = true; G.char.level = 40;
    for (const sk of CLASS_SKILLS.bard) G.char.skills[sk.id] = 10;
    G.char.bar = BAR.slice(); G.char.sp = 0;
    game.buildDungeon(8, BIOME_BY_ID.catacombs);
    await new Promise((r) => setTimeout(r, 400));
    G.player.recompute(); G.bardStats = { cad: 0, dis: 0, songs: [] };
    const { Auto } = await import('/src/game/autoplay.js');
    Auto.toggle(true);
    const rec = [], casts = {};
    setNoteTap((e) => rec.push({ ...e, t: G.time + (e.at - e.now) }));
    const { NOTES } = await import('/src/data/notation.js');
    const orig = G.player.tryUseSkill.bind(G.player);
    G.player.tryUseSkill = (sk, ...a) => { const r = orig(sk, ...a); if (r !== false && sk && sk.m.note) casts[sk.m.note] = (casts[sk.m.note] || 0) + 1; return r; };
    let sim = 0;
    while (sim < minutes * 60) {
      for (let i = 0; i < 15; i++) {
        if (G.mode !== 'game' || !G.world) break;
        G.dt = 1 / 30; G.time += G.dt; G.frame++;
        game.update(1 / 30); sim += 1 / 30;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    setNoteTap(null);
    const t0 = rec.length ? rec[0].t : 0;
    return { songs: (G.bardStats && G.bardStats.songs) || [], rec: rec.map((e) => ({ ...e, t: e.t - t0 })), casts, cad: G.player.score.cadences, dis: G.player.score.discords, beats: Object.fromEntries(Object.entries(NOTES).map(([k, n]) => [k, n.beats])) };
  }, { minutes, BAR });

  // ---------------------------------------------------------------- analysis
  const SHORT = { normal_short: 0.7, soft_short: 0.7, staccato_short: 0.35, marcato_short: 0.49 };
  const notes = log.rec.filter((e) => !e.stop), stops = new Map();
  for (const e of log.rec) if (e.stop && !stops.has(e.stop)) stops.set(e.stop, e);   // the first stop is the one that counts
  for (const n of notes) {
    n.end = n.t + (SHORT[n.art] || n.dur + 0.09);
    const s = stops.get(n.id);
    n.loud = n.t + Math.max(0.15, n.dur);
    if (s) { n.end = s.t < n.t ? n.t : Math.min(n.end, s.t + s.fade); n.loud = Math.min(n.loud, Math.max(n.t, s.t)); }   // a fading note is not loud
  }
  // 1. one tune at a time
  let overlaps = 0, overlapSec = 0;
  const okinds = {}, ckinds = {};
  const sorted = notes.slice().sort((a, b) => a.t - b.t);
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length && sorted[j].t < sorted[i].end; j++) {
    const a = sorted[i], b = sorted[j];
    if (!a.tag || !b.tag || a.tag.bar === b.tag.bar) continue;
    const o = Math.min(a.end, b.end) - b.t;
    if (o > 0.06) { overlaps++; overlapSec += o; const k = [a.tag.kind, b.tag.kind].join('>'); okinds[k] = (okinds[k] || 0) + 1; }
  }
  // 2. clashes inside a bar, sampled every 20 ms over the loud part of each note
  let sounding = 0, clash = 0;
  const end = Math.max(0, ...notes.map((n) => n.end));
  for (let t = 0; t < end; t += 0.02) {
    const on = notes.filter((n) => n.tag && n.tag.kind !== 'discord' && n.t <= t && t < n.loud);
    if (on.length < 2) { if (on.length) sounding++; continue; }
    sounding++;
    let harsh = false;
    for (let i = 0; i < on.length && !harsh; i++) for (let j = i + 1; j < on.length; j++) {
      const iv = Math.abs(on[i].midi - on[j].midi) % 12;
      if (iv === 1 || iv === 11 || iv === 6) { harsh = true; const k = [on[i].tag.kind, on[j].tag.kind].sort().join('+') + (on[i].tag.bar === on[j].tag.bar ? '' : ' (2 bars)'); ckinds[k] = (ckinds[k] || 0) + 1; break; }
    }
    if (harsh) clash++;
  }
  // 3. melody of the performed bars
  const bars = {};
  for (const n of notes) if (n.tag && n.tag.kind === 'perf' && n.tag.hand === 'rh' && n.vel >= 0.7) (bars[n.tag.bar + n.tag.part] = bars[n.tag.bar + n.tag.part] || []).push(n);
  let leaps = 0, steps = 0, big = 0, count = 0;
  for (const b of Object.values(bars)) {
    b.sort((x, y) => x.t - y.t); count += b.length;
    for (let i = 1; i < b.length; i++) { const d = Math.abs(b[i].midi - b[i - 1].midi); if (d <= 2) steps++; else leaps++; if (d > 9) big++; }
  }
  const total = Object.values(log.casts).reduce((a, b) => a + b, 0) || 1;
  const fast = ['s', 's2', 's3', 's4', 't16', 't32', 'rs', 'rt'].reduce((a, k) => a + (log.casts[k] || 0), 0);
  const nb = Object.keys(bars).length, ints = steps + leaps || 1;
  const res = {
    minutes, cadences: log.cad, discords: log.dis, notesPlayed: notes.length, bars: nb, notesPerBar: +(count / Math.max(1, nb)).toFixed(1),
    overlaps, overlapSec: +overlapSec.toFixed(2), clashPct: +(100 * clash / Math.max(1, sounding)).toFixed(1),
    stepPct: +(100 * steps / ints).toFixed(0), bigLeapPct: +(100 * big / ints).toFixed(0), fastFigurePct: +(100 * fast / total).toFixed(1),
    songs: log.songs.length, repeatedSongs: log.songs.length - new Set(log.songs).size, overlapKinds: okinds, clashKinds: ckinds,
    casts: Object.fromEntries(Object.entries(log.casts).sort((a, b) => b[1] - a[1])),
  };
  console.log('listen', JSON.stringify(res));
  if (process.env.SPANS) { const sp = {}; for (const n of notes) if (n.tag && n.tag.kind === 'perf') { const k = n.tag.bar, o = sp[k] || (sp[k] = { a: 1e9, b: 0, e: 0 }); o.a = Math.min(o.a, n.t); o.b = Math.max(o.b, n.t + n.dur); o.e = Math.max(o.e, n.end); }
    console.log(Object.entries(sp).slice(0, 12).map(([k, o]) => `${k}: ${o.a.toFixed(2)}-${o.b.toFixed(2)} (ring ${o.e.toFixed(2)})`).join(' | ')); }
  if (overlaps) fail(`${overlaps} times two bars sounded together (${res.overlapSec}s)`);
  if (res.clashPct > 6) fail(`harsh intervals ${res.clashPct}% of the time`);
  if (res.fastFigurePct > 10) fail(`${res.fastFigurePct}% of written notes are 16th/32nd figures`);
  if (!(log.cad >= 3)) fail('too few bars performed to judge');
  if (res.repeatedSongs) fail(`${res.repeatedSongs} songs were played twice`);

  // ---------------------------------------------------------------- 4. render to WAV
  const wav = await page.evaluate(async ({ rec, renderSec }) => {
    const sr = 44100, ctx = new OfflineAudioContext(1, sr * renderSec, sr), bufs = {};
    const man = (await (await fetch('/assets/audio/inst/instruments.json')).json()).harpsichord, A = (e) => man.articulations[e.art] || man.articulations.normal_held;
    const need = new Set(rec.filter((e) => !e.stop && e.t < renderSec).map((e) => A(e).bank + '/' + e.midi));
    for (const id of need) if (!bufs[id]) bufs[id] = await ctx.decodeAudioData(await (await fetch(`/assets/audio/inst/harpsichord/${id}.mp3`)).arrayBuffer());
    const stops = new Map(); for (const e of rec) if (e.stop && !stops.has(e.stop)) stops.set(e.stop, e);
    const out = ctx.createGain(); out.gain.value = 0.6;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6; out.connect(comp); comp.connect(ctx.destination);
    for (const e of rec) {
      if (e.stop || e.t >= renderSec) continue;
      const a = A(e), src = ctx.createBufferSource(), g = ctx.createGain(), held = a.bank === 'held';
      src.buffer = bufs[a.bank + '/' + e.midi];
      const peak = e.vel * a.gain * 0.9, s = stops.get(e.id);
      let off = held ? e.t + Math.min(src.buffer.duration, Math.max(0.05, e.dur)) : e.t + src.buffer.duration, endT = held ? off + 0.09 : off;
      g.gain.setValueAtTime(peak, e.t);
      if (s && s.t < endT) { const st = Math.max(e.t, s.t); g.gain.setValueAtTime(peak, st); g.gain.exponentialRampToValueAtTime(0.0001, st + s.fade); endT = st + s.fade; }
      else if (held) { g.gain.setValueAtTime(peak, off); g.gain.exponentialRampToValueAtTime(0.0001, endT); }
      src.connect(g); g.connect(out); src.start(e.t); src.stop(endT + 0.02);
    }
    const buf = await ctx.startRendering(), d = buf.getChannelData(0), n = d.length;
    const ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    let peakV = 0;
    for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, d[i])); peakV = Math.max(peakV, Math.abs(x)); v.setInt16(44 + i * 2, x * 32767, true); }
    let bin = ''; const u = new Uint8Array(ab);
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return { b64: btoa(bin), peak: peakV };
  }, { rec: log.rec, renderSec });
  fs.writeFileSync(`${OUT_DIR}/bard_listen.wav`, Buffer.from(wav.b64, 'base64'));
  console.log(`rendered ${renderSec}s -> ${OUT_DIR}/bard_listen.wav (peak ${wav.peak.toFixed(2)})`);
  console.log(bad ? `${bad} FAILURES` : 'LISTEN OK');
  if (bad) process.exitCode = 1;
  report(errors, 20);
  await browser.close();
})();
