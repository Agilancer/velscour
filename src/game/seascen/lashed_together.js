// #11 LASHED TOGETHER (docs/PIRATE_SEAS.md): the convoy's own stern lamps, at sunset. Three Lampwarden tenders, the
// Tern, the Kittiwake and the Fulmar, lie lashed abeam off the Dawnwake's starboard side (the near side: nothing of
// her stands between them and the camera), a plank from her rail to the Tern and a leap from gate to gate across the
// rest. The Black Tide's longboats come up astern of the Tern and the Kittiwake and alongside the Fulmar, and their
// boarders go for each tender's keepers, not the hero: while he is away they hack at the crew and throw fire pots
// (telegraphed rings; a pot left burning eats the deck: stand in it to stamp it out). Each tender's crew is a bar over
// her deckhouse; a crew wiped is a tender lost (the chest lighter, her deck afire). The hero leaps deck to deck to
// clear each one. Brass-Beak waits on the Fulmar after the third wave; Boarding-Master Quill Dunmore on the Kittiwake
// after the fifth, and while he lives his crew fire whichever tender the hero is furthest from.
import { G } from '../../state.js';
import { hit } from '../combat.js';
import { makeFolk } from '../folk.js';
import { townSprite } from '../render.js';
import { addLight } from '../../gfx/vfx.js';
import { seaRope, seaScene } from '../../gfx/seabattle3d.js';
import { PIP } from '../../data/seabattle.js';
import { TOWNSFOLK } from '../../data/townsfolk.js';
import { HW, HH } from '../../core/view.js';

const TZC = 7;          // the tenders' midships (ship z): their leap gates at TZC + 0.5, abreast the Dawnwake's waist
const G0 = 2.6;         // water between the Dawnwake and the Tern
const SP = 6;           // centre to centre, lashed abeam (fenders between)
const NAMES = ['Tern', 'Kittiwake', 'Fulmar'];
const KEEPERS = [['46_townsfolk_ferryman', [1.25, 2.7]], ['39_townsfolk_candle_maker', [0.95, -1.15]]];
const LAMP_BLUE = { hue: 205, sat: 0.75, light: 0.04 };
const DRAIN = 0.012, FIRE_DRAIN = 0.018, POT_T = 7.5, GRACE = 30, FLOOR = 0.35;

export default {
  id: 'lashed_together', number: 11, name: 'Lashed Together', light: "The Convoy's Stern Lamps", weather: 'sunset', weatherName: 'Sunset',
  blurb: 'Three tenders lashed abeam to starboard. Keep their crews alive.', dark: 0.06,
  fleet: ['longboat', 'tender'],
  // the boarding craft are the scenario's own (each lies off a tender): `land` [tender, boarders, champions]
  waves: [
    { boats: 0, label: 'Boats astern of the Tern', land: [[0, 4, 0]] },
    { boats: 0, label: 'The Fulmar and the Kittiwake', land: [[2, 3, 1], [1, 3, 0]] },
    { boats: 0, label: 'Two tenders boarded', land: [[1, 4, 1], [2, 3, 1]], mid: true },
    { boats: 0, label: 'The Tern and the Fulmar', land: [[0, 3, 1], [2, 4, 1]] },
    { boats: 0, label: 'All three tenders', land: [[0, 3, 1], [1, 3, 1], [2, 3, 1]] },
  ],
  mid: { id: 'ap_brass_beak', line: 'Grapnels! Grapnels and knives!', from: 'deck', at: (api) => api.state.t[2].deck.tile(0.3, 0.6) },
  final: { id: 'ap_the_last_boarding_saint', name: 'Quill Dunmore', title: 'Boarding-Master of the Black Tide', line: "Three decks, one rope. Don't look down.",
    from: 'deck', at: (api) => api.state.t[1].deck.tile(0.2, 0.8) },
  hooks: {
    setup(api) {
      PIP.tern ??= 'Boarders on the Tern!'; PIP.kittiwake ??= 'Boarders on the Kittiwake!'; PIP.fulmar ??= 'Boarders on the Fulmar!';
      PIP.firepot ??= 'Fire pots! Mind the tenders!';
      const S = api.state, gz = TZC + 0.5, s = api.sAt(gz);
      S.t = []; S.fires = []; S.hop = new Set(); S.gaps = []; S.dunT = 8;
      // each centred on a whole tile: her deck between the rails then bakes four full columns of walkable planks
      const x0 = Math.round(api.OX + api.beam(s) + G0 + 2.5);
      for (let i = 0; i < 3; i++) {
        const h = api.spawnShip('tender', { deck: true });
        h.place(x0 + i * SP, api.OY + TZC, 0); fadeSails(h);
        const deck = api.addDeck(h, { levels: [0] }), L = h.info.leap[1][2], hw = h.info.deck.halfWidth - 0.45;
        const T = { i, h, deck, name: NAMES[i], key: NAMES[i].toLowerCase(), hp: 1, lost: false, keepers: [], potT: POT_T * (0.5 + i * 0.2), work: 0 };
        T.gateP = h.worldOf(-hw, 0, L); T.gateS = h.worldOf(hw, 0, L);
        T.mid = h.worldOf(0, 0, 0.8); T.top = h.worldOf(0, 2.6, 4.8);
        T.posts = KEEPERS.map(([, [lx, lz]]) => h.worldOf(lx - 0.8, 0, lz).slice(0, 2));
        // her ensign: the spawn gave every ship but the Dawnwake the Tide's flag; she flies it only while boarded
        T.flags = []; h.ship.root.traverse((o) => { if (o.isMesh && (o.name === 'ensign' || o.name === 'flag')) { T.flags.push(o); o.userData.tide = o.material; } });
        S.t.push(T);
      }
      // the plank from her starboard rail to the Tern's port gate; gate to gate across the lashings, leapt
      const T0 = S.t[0];
      S.plank = api.join([api.OX + api.inner(s) - 0.7, api.OY + gz, 0], [T0.gateP[0], T0.gateP[1], T0.h.deckY], { w: 0.85, plank: true });
      S.plank.open();
      for (let i = 0; i < 2; i++) {
        const a = S.t[i].gateS, b = S.t[i + 1].gateP, j = api.join([a[0], a[1], S.t[i].h.deckY], [b[0], b[1], S.t[i + 1].h.deckY], { w: 0.8 });
        j.open(); S.gaps.push([a, b]);
      }
      // each tender's two keepers, Lampwarden blue
      for (const T of S.t) for (const [id, [lx, lz]] of KEEPERS) {
        const q = TOWNSFOLK.find((f) => f.spriteId === id) || TOWNSFOLK[0], [kx, ky] = T.h.worldOf(lx, 0, lz);
        townSprite(id, LAMP_BLUE);
        const n = makeFolk(api.world, q, kx, ky, { calm: true, still: true, palette: LAMP_BLUE, cheered: true });
        n.name = 'Lampwarden'; n.first = 'Keeper'; n.face?.(kx - 1, ky); api.world.npcs.push(n); T.keepers.push(n);
      }
      let lamp = null; seaScene()?.dawn?.ship.root.traverse((o) => { if (o.isMesh && o.name === 'ensign') lamp = o.material; });
      S.lampFlag = lamp; S.time = 0; S.kills = 0;
      for (const T of S.t) flagOf(S, T, false);
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => drawTenders(api, ctx) });
    },
    start(api) {
      api.state.meter = api.meter('The convoy', { color: '#ff8a3a', full: () => {}, note: 'Tern · Kittiwake · Fulmar' });
    },
    onWave(api, n, w) {
      const S = api.state;
      (w.land || []).forEach(([ti, k, ch], j) => api.later(j * 1.6, () => boatTo(api, ti, k, ch, n), n));
      if ((w.land || []).length >= 3) api.bark('sails', 2.5);
    },
    onBoss(api, m, which) {
      // the captains fight on the decks: they leap (and hook, or smoke), they don't call boarders from over the far rail
      m.captain = { ...m.captain, moves: which === 'final' ? ['leap', 'hook'] : ['leap', 'smoke'] };
    },
    tick(api, dt) {
      const S = api.state, pl = api.p(), w = api.world;
      // boarders on a tender: at her keepers while the hero is away; at him when he comes (or hits them)
      for (const T of S.t) { T.work = 0; T.aboard = 0; }
      S.time += dt;
      for (const m of api.live) {
        if (m.dead && m.tender != null && !m.counted) { m.counted = true; S.kills++; }
        if (m.dead || m.entering || m.tender == null || m.captain) continue;
        if (api.map.deck[api.map.tileIdx(m.x, m.y)] === S.t[m.tender].deck.id) S.t[m.tender].aboard++;
        const T = S.t[m.tender];
        if (!m.wrapped) wrap(api, m);
        m.engT = Math.max(0, (m.engT || 0) - dt);
        const d = pl ? Math.hypot(pl.x - m.x, pl.y - m.y) : 99;
        if (T.lost || d < 5 || m.engT > 0) { m.static = false; continue; }
        m.static = true;
        const post = T.posts[m.id % T.posts.length], gx = post[0] + Math.cos(m.id * 2.4) * 0.7, gy = post[1] + Math.sin(m.id * 2.4) * 0.7;
        if (m.navTo(gx, gy, dt, m.speed) > 1.0) continue;
        T.work++;
        if ((m.hackT = (m.hackT || 0) - dt) <= 0) {   // a blow at the keepers: a spark, the crew bar drops
          m.hackT = 1.1 + Math.random() * 0.6; m.face?.(Math.atan2(post[1] - m.y, post[0] - m.x));
          const k = T.keepers.find((q) => q.hp > 0); if (k) { api.burst(k.x, k.y, 30, 'phys', 4, 2); k.feel('scared', 1.2, false); }
        }
      }
      for (const T of S.t) {
        if (T.lost) { if (Math.random() < dt * 6) burnFx(api, T); continue; }
        const burning = S.fires.filter((f) => f.i === T.i).length;
        T.hp -= dt * (T.work * DRAIN + burning * FIRE_DRAIN);
        // no tender is lost before the hero has had a fair go: 30 s into the waves, or his first kill
        if (S.time < GRACE && !S.kills) T.hp = Math.max(T.hp, FLOOR);
        const boarded = T.aboard > 0 || !!T.lost;
        if (boarded !== T.boarded) flagOf(S, T, boarded);
        if (T.hp < 0.5 && T.keepers[1].hp > 0) { T.keepers[1].hp = 0; api.floatText(T.keepers[1].x, T.keepers[1].y, 70, 'A KEEPER FALLS', '#ff9a6a', 13); }
        if (T.hp <= 0) lose(api, T);
        // a fire pot: while her boarders work at the keepers, now and then a telegraphed ring on her deck, then fire
        if (T.work && (T.potT -= dt) <= 0) { T.potT = POT_T + Math.random() * 3; firePot(api, T); }
      }
      // fires burn, hurt the hero standing in them, and go out under his boots
      for (const f of S.fires.slice()) {
        f.t -= dt;
        if (Math.random() < dt * 14) api.burst(f.x + api.rand(-0.4, 0.4), f.y + api.rand(-0.4, 0.4), 6, 'fire', 2, 1.5);
        addLight(f.x, f.y, 2.2, 0.7, 20, '#ff9040');
        const on = pl && Math.hypot(pl.x - f.x, pl.y - f.y) < 1.0;
        if (on) { f.stamp = (f.stamp || 0) + dt; if (!G.godMode) hit(null, pl, api.base.dmg * 0.25 * dt, 'fire', { dot: true }); }
        if (on && f.stamp > 0.8) { api.floatText(f.x, f.y, 50, 'STAMPED OUT', '#ffd0a0', 13); api.smoke(f.x, f.y, 6, '#4a4040', 6, 12); }
        if (f.t <= 0 || (on && f.stamp > 0.8) || S.t[f.i].lost) S.fires.splice(S.fires.indexOf(f), 1);
      }
      // the leap across the lashings: whoever crosses a gap between two tenders jumps it
      for (const c of [pl, ...api.live]) {
        if (!c || c.dead || c.entering || (c.isPlayer && c.channel)) continue;
        let z = 0;
        for (const [a, b] of S.gaps) {
          const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, k = ((c.x - a[0]) * dx + (c.y - a[1]) * dy) / L2;
          if (k < 0.15 || k > 0.85 || Math.abs((c.y - a[1]) * dx - (c.x - a[0]) * dy) / Math.sqrt(L2) > 1.0) continue;
          z = Math.sin(Math.PI * (k - 0.15) / 0.7) * 22;
        }
        if (z) { c.z = z; S.hop.add(c); } else if (S.hop.has(c)) { c.z = 0; S.hop.delete(c); }
      }
      if (S.meter) {
        const live = S.t.filter((T) => !T.lost);
        S.meter.value = live.length ? Math.min(0.99, 1 - Math.min(...live.map((T) => T.hp))) : 0;
        S.meter.note = S.t.map((T) => `${T.name} ${T.lost ? 'LOST' : Math.max(0, Math.round(T.hp * 100))}`).join(' · ');
      }
      // Dunmore: while he lives, his crew fire whichever tender the hero is furthest from
      const cap = api.run.capM;
      if (api.run.phase === 'final' && cap && !cap.dead && !cap.entering && (S.dunT -= dt) <= 0) {
        S.dunT = 12;
        const far = S.t.filter((T) => !T.lost).sort((a, b) => Math.hypot(pl.x - b.mid[0], pl.y - b.mid[1]) - Math.hypot(pl.x - a.mid[0], pl.y - a.mid[1]))[0];
        if (far) { api.floatText(cap.x, cap.y, 90, `FIRE THE ${far.name.toUpperCase()}!`, '#ffb070', 16); firePot(api, far); api.later(0.5, () => firePot(api, far)); }
      }
    },
    objective(api) {
      const S = api.state, pl = api.p(), T = worst(S);
      if (!T || !pl) return null;
      const f = S.fires.filter((q) => q.i === T.i).sort((a, b) => Math.hypot(pl.x - a.x, pl.y - a.y) - Math.hypot(pl.x - b.x, pl.y - b.y))[0];
      return f ? { x: f.x, y: f.y, reach: 0.5 } : { x: T.posts[0][0], y: T.posts[0][1], reach: 1.6 };
    },
  },
};

/** An arena deck's sails fade at the game's zoom (seabattle3d fadeRigs sets their opacity): their materials (this
 *  handle's own clones) must blend for it to show, or the gaff sails hide half of each deck. */
export function fadeSails(h) {
  h.ship.root.traverse((o) => { if (o.isMesh && /sail/.test(o.name) && o.material && !o.material.transparent) { o.material.transparent = true; o.material.needsUpdate = true; } });
}

/** Her ensign: the Lampwardens' Peal of Nine, or the Tide's skull and V while their boarders hold her deck. */
function flagOf(S, T, boarded) {
  T.boarded = boarded;
  for (const o of T.flags) o.material = boarded || !S.lampFlag ? o.userData.tide : S.lampFlag;
}

/** The tender in most need: boarders at her keepers or a fire on her deck, lowest crew first. */
function worst(S) {
  return S.t.filter((T) => !T.lost && (T.work || S.fires.some((f) => f.i === T.i))).sort((a, b) => a.hp - b.hp)[0] || null;
}

/** A boarder's hits from the hero turn it on him for a while. */
function wrap(api, m) {
  m.wrapped = true;
  const od = m.onDamaged;
  m.onDamaged = function (src, d) { od.call(this, src, d); if (src && (src.isPlayer || (src.owner && src.owner.isPlayer))) this.engT = 3; };
}

/** A longboat comes up to tender `ti` (astern of the Tern and the Kittiwake, alongside the Fulmar) and its `n` boarders
 *  leap aboard her. Its arrival and each leap are the wave's timers, so hurry() brings them on when the decks are clear. */
function boatTo(api, ti, n, ch, wave) {
  const S = api.state, T = S.t[ti], h = api.spawnShip('longboat');
  if (!h) return;
  const side = ti === 2, hl = h.info.hl || 4.5;
  const dock = side ? [T.h.x + T.h.info.beam / 2 + 3.2 + h.info.beam / 2, T.h.y + 0.6] : [T.h.x + 0.2, T.h.y + T.h.info.hl + hl + 1.6];
  const from = [dock[0] + (side ? 10 : 6), dock[1] + 34], dur = 6;
  const crew = api.crewList(n, ch, 0, wave), spots = h.info.crew.slice().sort(() => Math.random() - 0.5);
  crew.forEach((c, i) => { const sp = spots[i % spots.length]; h.addCrew({ ...c, x: sp[0], y: sp[1], z: sp[2] + Math.floor(i / spots.length) * 0.4, h: c.h || 56, ph: Math.random() * 6, bob: true }); });
  // the director's list holds it too, as a passive record (no branch of its own moves it while it rows; docked it is
  // held there, never leaping or leaving on the director's say): the victory casts it off, the test sees it alongside
  const B = { kind: 'longboat', h, st: 'row', t: 0, x: from[0], y: from[1], heading: 0, dock: { x: dock[0], y: dock[1] }, crew: h.crew, lines: [], leap: false, stay: true, wait: 1e9, hold: 1e9, wave };
  api.world.seaState.boats.push(B);
  h.place(from[0], from[1], 0, 1.1); h.setAlpha(0);
  const land = () => {
    if (B.st !== 'row') return;
    B.st = 'dock'; B.t = 0; B.x = dock[0]; B.y = dock[1]; h.place(dock[0], dock[1], 0, 0.5); h.setAlpha(1); h.row = 0; api.sfx('thud', 0.6);
    // grapnel lines up to her rail, a ring where they'll land, and Pip's call
    for (const [lx, lz, tx, tz] of side ? [[-h.info.hb * 0.8, -hl * 0.4, 2.3, -1.6], [-h.info.hb * 0.8, hl * 0.4, 2.3, 2.6]] : [[0.3, -hl * 0.9, -0.8, 7.6], [-0.3, -hl * 0.9, 0.8, 7.6]]) {
      const a = () => h.worldOf(lx, 0.6, lz), b = () => T.h.worldOf(tx, T.h.info.deck.rail + 0.1, tz), r = seaRope(a(), b());
      r.update = () => r.set(a(), b()); B.lines.push(r);
    }
    api.telegraph(T.mid[0], T.mid[1], 2.0, 1.4, '#ff7040');
    api.bark(T.key);
    if (api.point) api.point(() => T.mid, '#ff7040', 'Boarders: the ' + T.name);
  };
  let rowT = 0, holdT = 0, outT = 0;
  api.scripted((dt) => {
    if (h.dead || B.dead) return false;   // (cast off by the victory: the director's own 'out')
    if (B.st === 'row') { if ((rowT += dt) >= dur) land(); const k = 1 - (1 - Math.min(1, rowT / dur)) ** 3; B.x = from[0] + (dock[0] - from[0]) * k; B.y = from[1] + (dock[1] - from[1]) * k; h.place(B.x, B.y, 0, 0.5 + 0.9 * (1 - k)); h.setAlpha(Math.min(1, k * 3)); }
    if (B.st === 'dock' && !h.crew.length && (holdT += dt) > 2.2) { B.st = 'away'; for (const r of B.lines) r.remove(); B.lines = []; }
    if (B.st === 'away') { const k = Math.min(1, (outT += dt) / 5); h.place(dock[0] + 4 * k * k, dock[1] + 30 * k * k, 0.3 * k, 0.4); h.row = 1; h.setAlpha(1 - Math.max(0, (k - 0.5) * 2)); if (k >= 1) { B.dead = true; h.remove(); return false; } }
    return true;
  });
  const rush = () => { rowT = Math.max(rowT, dur - 0.4); };   // hurry(): the last stretch at speed, not a jump
  api.later(dur, rush, wave);
  crew.forEach((c, i) => api.later(dur + 0.6 + i * 0.4, function leapOne() {
    if (B.st === 'row') { rush(); api.later(0.5 + i * 0.3, leapOne, wave); return; }
    const rec = h.crew[0]; if (!rec) return;
    const from2 = h.worldOf(rec.x, rec.y, rec.z); h.dropCrew(rec); api.splash(from2[0], from2[1], 0.25);
    const to = api.near(...T.h.worldOf(api.rand(-1.4, 1.4), 0, api.rand(-1.4, 2.6)).slice(0, 2), 1.2);
    const m = api.spawnPirate(rec.art, rec.rank || 'normal', from2, to, wave); m.tender = ti;
  }, wave));
}

/** A fire pot at tender T: a ring on her deck, then a fire that eats her crew until it burns out or is stamped out. */
function firePot(api, T) {
  const S = api.state, [x, y] = api.near(...T.h.worldOf(api.rand(-1.3, 1.3), 0, api.rand(-1.2, 2.4)).slice(0, 2), 1);
  api.telegraph(x, y, 1.1, 1.3, '#ff9a3a');
  if (!S.potBarked) { S.potBarked = 1; api.bark('firepot'); }
  api.later(1.3, () => {
    if (T.lost) return;
    api.blast(x, y, 1.1, api.base.dmg * 0.8, false); api.sfx('explode', 0.5);
    S.fires.push({ i: T.i, x, y, t: 11 });
  });
}

/** Her crew wiped: the tender is lost (the chest lighter), her deck afire. */
function lose(api, T) {
  T.lost = true; T.hp = 0;
  for (const k of T.keepers) k.hp = 0;
  api.costReward(0.2);
  api.banner(`THE ${T.name.toUpperCase()} IS LOST`, 'Her keepers are down · the chest will be lighter');
  api.sfx('explode', 0.8); for (let i = 0; i < 4; i++) burnFx(api, T);
}
function burnFx(api, T) {
  const [x, y] = T.h.worldOf(api.rand(-1.5, 1.5), 0, api.rand(-4, 4));
  api.burst(x, y, 8, 'fire', 5, 2); if (Math.random() < 0.3) api.smoke(x, y, 3, '#2a2420', 8, 16);
  addLight(x, y, 3, 0.6, 30, '#ff7030');
}

/** Each tender's name and her crew's bar over her deckhouse (world space, under the HUD). */
function drawTenders(api, ctx) {
  if (G.cine) return;
  const S = api.state, t = api.world.time;
  ctx.save();
  for (const T of S.t) {
    const [x, y, l] = T.top, px = (x - y) * HW, py = (x + y) * HH - l * api.HS;
    const w = 54, hgt = 5, danger = !T.lost && (T.work || T.aboard || S.fires.some((f) => f.i === T.i));
    if (danger) {   // under attack: a pulsing red ring round her deck
      const [mx, my, ml] = T.mid, cx = (mx - my) * HW, cy = (mx + my) * HH - ml * api.HS, k = 0.5 + 0.5 * Math.sin(t * 6), r = 3.4 + 0.3 * k;
      ctx.globalAlpha = 0.35 + 0.4 * k; ctx.strokeStyle = '#ff5a30'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * HW * 1.41, r * HH * 1.41, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(8,6,10,0.7)'; ctx.fillRect(px - w / 2 - 2, py - 2, w + 4, hgt + 4);
    ctx.fillStyle = T.lost ? '#5a4a40' : T.hp > 0.5 ? '#46d08a' : T.hp > 0.25 ? '#e0b040' : '#e04a30';
    ctx.fillRect(px - w / 2, py, w * Math.max(0, T.hp), hgt);
    ctx.font = '700 11px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const label = T.lost ? `${T.name} · lost` : T.name;
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(label, px, py - 3);
    ctx.fillStyle = T.lost ? '#9a8a80' : danger ? (Math.sin(t * 8) > 0 ? '#ff8a5a' : '#ffd0b0') : '#e8f4ff'; ctx.fillText(label, px, py - 3);
  }
  ctx.restore();
}
