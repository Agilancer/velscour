// #8 SEA COMING OVER (docs/PIRATE_SEAS.md): the Shoulder, in a gale. On a beat a heavy sea climbs the Dawnwake's
// weather (starboard) rail and comes over: its lane across the waist is shown first (a pale band, Pip's call, the
// sea heaping up white at the rail), then a sheet of white water sweeps the lane from rail to rail. Whoever stands in
// it goes with it: boarders are carried across the deck and over the lee rail into the sea; the hero too, unless
// braced at the mast in that lane (stand by it), and is hauled back aboard on a Lampwarden line, bruised. Bait the
// boarders into the lane. A sea that takes none of theirs takes one of yours (stores over the side: the meter costs
// the chest). Bosun Garret Blackwater swings over at the end; the seas come faster for him, and a sea that catches
// him knocks him flat against the rail.
import { G } from '../../state.js';
import { camera, isoX, HW, HH } from '../../core/view.js';
import { hit } from '../combat.js';
import { spawn } from '../../gfx/vfx.js';
import { enemyImage } from '../../core/enemyart.js';

// the seas' lanes across her waist (ship z, width) and the mast in each to brace at (null: no mast, get out of it)
const LANES = [{ z: -5.7, w: 3.0, mast: [0, -6.4] }, { z: -0.2, w: 3.0, mast: null }, { z: 4.7, w: 3.0, mast: [0, 4.4] }];
const TELE = 3.0, SWEEP = 0.85, DRAIN = 1.1, BRACE = 1.45;
const rnd = (a, b) => a + Math.random() * (b - a);

export default {
  id: 'sea_coming_over', number: 8, name: 'Sea Coming Over', light: 'the Shoulder', weather: 'storm', weatherName: 'A Full Gale',
  blurb: 'A gale off the Shoulder. Every ninth sea comes green over the rail.', dark: 0.08,
  fleet: ['longboat', 'cutter', 'brig'],
  boats: { longboat: 3, cutter: 1 },
  mid: { id: 'ap_madam_stormglass', line: 'The glass is falling. So are you.' },
  final: { id: 'ap_warden_of_the_rookery', name: 'Bosun Garret Blackwater', title: 'Bosun of the Black Tide', line: 'Every sea that comes over takes one of yours.' },
  hooks: {
    setup(api) {
      const S = api.state;
      S.seaT = 6; S.sea = null; S.over = null; S.seas = 0; S.last = -1; S.barkK = 'sea2';
      // the white water, the lane's arrows and the hauling line: over the sprites
      api.world.addHazard({ update: () => api.world === G.world, draw: (ctx) => drawSea(api, ctx) });
      // auto-play keeps out of a sea while it sweeps (the telegraph covers the warning)
      api.world.addHazard({ team: 'enemy', update: () => api.world === G.world, draw() {},
        danger(out) { const q = S.sea; if (q && q.ph !== 'drain') out.push({ line: true, x: api.OX + q.xi, y: api.OY + q.z, x1: api.OX - q.xi, y1: api.OY + q.z, r: q.L.w / 2 + 0.6 }); } });
    },
    start(api) {
      // the lane as it heaps up, on the planks under the sprites (the boarders baited into it stay in plain view)
      api.addEffect({ update: () => api.world === G.world, draw: (ctx) => drawLane(api, ctx) }, 'ground');
      api.state.meter = api.meter('Every sea takes one', { color: '#8ad8ff', full: 'reward', note: 'bait their boarders into it' });
    },
    tick(api, dt) {
      const S = api.state, run = api.run;
      if (S.over) overboard(api, dt);
      if (run.phase === 'victory' || run.phase === 'done') return;
      if (S.sea) seaTick(api, S.sea, dt);
      else if ((S.seaT -= dt) <= 0) S.sea = startSea(api);
    },
    onVictory(api) { const S = api.state; if (S.meter) { S.meter.hide(); S.meter = null; } },
  },
};

/** A sea heaps up at her weather rail: its lane across the deck, the brace ring at its mast, Pip's call. */
function startSea(api) {
  const S = api.state;
  const forced = S.forceLane != null;   // (the test picks the lane)
  let i = forced ? S.forceLane : Math.floor(Math.random() * LANES.length); S.forceLane = null;
  if (!forced && i === S.last) i = (i + 1 + Math.floor(Math.random() * (LANES.length - 1))) % LANES.length;
  S.last = i;
  const L = LANES[i], z = L.z, s = api.sAt(z), xi = api.inner(s) - 0.15, bm = api.beam(s);
  if (L.mast) {
    api.telegraph(api.OX + L.mast[0], api.OY + L.mast[1], BRACE - 0.2, TELE, '#40ff60');   // (green: the safe ring, auto-play doesn't flee it)
    api.floatText(api.OX + L.mast[0], api.OY + L.mast[1], 90, 'BRACE AT THE MAST', '#a8ffb8', 14);
  }
  S.barkK = S.barkK === 'sea' ? 'sea2' : 'sea'; api.bark(S.barkK);
  api.splash(api.OX + bm + 1.2, api.OY + z, 0.7, true);
  api.later(1.4, () => api.splash(api.OX + bm + 1.0, api.OY + z + rnd(-1, 1), 0.9, true));
  api.sfx('splash', 0.5);
  return { L, z, xi, bm, t: 0, ph: 'tele', front: api.OX + xi + 0.4, taken: new Set(), carried: [], hits: 0, seed: Math.random() * 100 };
}
const inLane = (api, q, o) => {
  const m = api.map, t = m.tileIdx(o.x, o.y);
  return m.deck[t] === 1 && !m.block[t] && Math.abs(o.y - (api.OY + q.z)) < q.L.w / 2 + 0.25 && Math.abs(o.x - api.OX) < q.xi + 0.4 && !(o.z > 14);
};
const braced = (api, q, o) => q.L.mast && Math.hypot(o.x - api.OX - q.L.mast[0], o.y - api.OY - q.L.mast[1]) < BRACE;

function seaTick(api, q, dt) {
  const S = api.state, pl = api.p();
  q.t += dt;
  if (q.ph === 'tele') {
    if (q.t < TELE) return;
    // it comes over: green water at the rail, the deck shudders
    q.ph = 'sweep'; q.t = 0; S.seas++;
    q.foes = [...api.live].filter((m) => !m.dead && !m.entering && api.map.deck[api.map.tileIdx(m.x, m.y)] === 1).length;   // boarders on her deck it could have had
    for (let k = -1; k <= 1; k++) api.splash(api.OX + q.bm + 0.8, api.OY + q.z + k * q.L.w * 0.35, 1.2, true);
    api.sfx('explode', 0.35); api.sfx('splash', 1); camera.shake(8);
    return;
  }
  if (q.ph === 'sweep') {
    const k = Math.min(1, q.t / SWEEP), xs = api.OX + q.xi + 0.4, xp = api.OX - q.xi - 0.3;
    q.front = xs + (xp - xs) * (1 - (1 - k) * (1 - k) * 0.35 - 0.65 * (1 - k)) ;
    // spray off the crest
    for (let n = 0; n < 7; n++) spawn({ type: 'glow', x: q.front + rnd(-0.2, 0.4), y: api.OY + q.z + rnd(-q.L.w / 2, q.L.w / 2), z: rnd(4, 26), vz: rnd(40, 110), life: rnd(0.35, 0.7), size: rnd(2, 4), size1: 0.5, color: Math.random() < 0.6 ? '#f2fbff' : '#a8dcef', add: false });
    // whoever the front reaches is taken (the hero holds on at the lane's mast)
    const who = [...api.live].filter((m) => !m.dead && !m.entering && m.targetable !== false);
    if (pl && !pl.dead && !S.over) who.push(pl);
    for (const o of who) {
      if (q.taken.has(o) || o.x < q.front - 0.25 || !inLane(api, q, o)) continue;
      q.taken.add(o);
      if (o === pl && braced(api, q, o)) { api.floatText(o.x, o.y, 70, 'HELD ON!', '#a8ffb8', 15); continue; }
      if (o === pl) { pl.status.stun = { t: 6 }; pl.moveTarget = null; pl.path = null; pl.attackTarget = null; api.floatText(o.x, o.y, 70, 'SWEPT!', '#bfe8ff', 15); }
      else { o.entering = () => {}; o.targetable = false; o.moving = true; }
      q.carried.push(o);
    }
    // the carried go with the water, down to the lee rail
    const rail = api.OX - q.xi + 0.35;
    for (const o of q.carried) { o.x = Math.max(rail, Math.min(o.x, q.front + 0.15)); o.y += (api.OY + q.z - o.y) * Math.min(1, dt * 1.5); o.z = 6 + Math.sin(q.t * 18 + o.x) * 3; }
    if (k < 1) return;
    q.ph = 'drain'; q.t = 0;
    overTheRail(api, q);
    return;
  }
  if (q.ph === 'drain') {
    if (q.t < 0.25) for (let n = 0; n < 2; n++) api.splash(api.OX - q.bm - 1 - Math.random(), api.OY + q.z + rnd(-1.2, 1.2), 0.5);
    if (q.t >= DRAIN) { S.sea = null; S.seaT = api.run.phase === 'final' ? 4.5 : 6.5; }
  }
}
/** The sea goes out over the lee rail: what it carried goes with it. */
function overTheRail(api, q) {
  const S = api.state, pl = api.p(), world = api.world;
  for (const o of q.carried) {
    o.z = 0;
    if (o === pl) {   // over the side; a Lampwarden line hauls the hero back
      S.over = { t: 0, ph: 'over', y: o.y, rail: o.x, sea: api.OX - q.bm - 1.8, land: api.near(o.x + 0.6, o.y, 2) };
      if (S.meter) S.meter.add(0.3);
      api.floatText(o.x, o.y, 80, 'OVERBOARD!', '#ff9a7a', 17);
      continue;
    }
    o.entering = null; o.targetable = true; o.moving = false;
    if (o.captain) {   // the bosun is too heavy to go over: the sea throws him down against the rail
      o.status.stun = { t: 2.2 }; hit(pl, o, o.maxHp * 0.12, 'cold', { force: true });
      api.floatText(o.x, o.y, 100, 'KNOCKED FLAT!', '#bfe8ff', 17); api.splash(o.x - 1.5, o.y, 0.6);
      continue;
    }
    // a boarder over the side: killed at the rail (what it carried stays on the deck), its body tumbling into the sea
    const nC = world.corpses ? world.corpses.length : 0;
    api.kill(o);
    if (world.corpses) world.corpses.length = nC;
    fall(api, o, q);
    q.hits++; S.thrown = (S.thrown || 0) + 1;
  }
  if (S.meter) {
    if (q.hits) { S.meter.add(-0.08 * q.hits); api.floatText(api.OX - q.xi + 1, api.OY + q.z, 90, q.hits > 1 ? `${q.hits} OVERBOARD!` : 'OVERBOARD!', '#bfe8ff', 17); }
    else if (q.foes) { S.meter.add(0.2); api.floatText(api.OX - q.xi + 1, api.OY + q.z, 80, 'STORES OVER THE SIDE', '#ffb070', 14); }
    S.meter.note = `${S.seas} sea${S.seas > 1 ? 's' : ''} come over · bait their boarders into it`;
  }
}
/** A boarder's body going over the lee rail and into the sea (drawn over the sprites, then a splash). */
function fall(api, m, q) {
  const img = enemyImage(m.art, m.swap); if (!img) { api.splash(api.OX - q.bm - 1.5, m.y, 0.8); return; }
  const x0 = m.x, y = m.y, x1 = api.OX - q.bm - 1.6 - Math.random(), h = (m.artH || 56) * (m.scale || 1), w = h * img.width / img.height, spin = Math.random() < 0.5 ? -1 : 1;
  let t = 0;
  api.addEffect({
    update(dt) { t += dt; if (t >= 0.75) { api.splash(x1, y, 0.9); return false; } return true; },
    draw(ctx) {
      const k = t / 0.75, x = x0 + (x1 - x0) * k, z = Math.sin(Math.PI * k) * 26 + (api.SEA_LV * api.HS) * k * k;
      const px = isoX(x, y), py = (x + y) * HH - z;
      ctx.save(); ctx.translate(px, py - h * 0.5); ctx.rotate(spin * k * 2.2); ctx.globalAlpha = 1 - Math.max(0, k - 0.8) * 5;
      ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
    },
  });
}
/** The hero over the side: into the sea, under a moment, then hauled up the side on a line to the lee rail. */
function overboard(api, dt) {
  const S = api.state, o = S.over, pl = api.p();
  if (!pl) { S.over = null; return; }
  o.t += dt; pl.moveTarget = null; pl.path = null; pl.attackTarget = null; pl.moving = false; pl.kbx = pl.kby = 0;
  const seaZ = api.SEA_LV * api.HS;
  if (o.ph === 'over') {
    const k = Math.min(1, o.t / 0.6);
    pl.x = o.rail + (o.sea - o.rail) * k; pl.y = o.y; pl.z = seaZ * k * k + Math.sin(Math.PI * k) * 30;
    if (k >= 1) { o.ph = 'under'; o.t = 0; pl.alpha = 0; api.splash(pl.x, pl.y, 1.1); api.sfx('splash', 1); }
  } else if (o.ph === 'under') {
    pl.x = o.sea; pl.y = o.y; pl.z = seaZ;
    if (o.t >= 0.7) { o.ph = 'haul'; o.t = 0; pl.alpha = undefined; api.splash(pl.x, pl.y, 0.6); }
  } else if (o.ph === 'haul') {
    const k = Math.min(1, o.t / 1.0), e = k * k * (3 - 2 * k);
    pl.x = o.sea + (o.land[0] - o.sea) * e; pl.y = o.y + (o.land[1] - o.y) * e; pl.z = seaZ * (1 - e) + Math.sin(Math.PI * e) * 34;
    if (k >= 1) {
      S.over = null; pl.z = 0; pl.x = o.land[0]; pl.y = o.land[1]; pl.status.stun = { t: 0 }; pl.invuln = Math.max(pl.invuln || 0, 1.2);
      if (!G.godMode) pl.hp = Math.max(1, pl.hp - pl.maxHp * 0.12);
      api.floatText(pl.x, pl.y, 70, 'HAULED ABOARD', '#a8ffb8', 14);
    }
  }
}
/** The white water across the lane, the lane's arrows while it heaps up, the hauling line. */
function drawSea(api, ctx) {
  const S = api.state, q = S.sea, OX = api.OX, OY = api.OY, HSv = api.HS;
  const P = (x, y, up = 0) => [(x - y) * HW, (x + y) * HH - up];
  ctx.save();
  if (q && (q.ph === 'sweep' || q.ph === 'drain')) {
    const y0 = OY + q.z - q.L.w / 2 - 0.1, y1 = OY + q.z + q.L.w / 2 + 0.1, xs = OX + q.xi + 0.4;
    const fade = q.ph === 'drain' ? 1 - q.t / DRAIN : 1, f = q.ph === 'drain' ? OX - q.xi - 0.3 : q.front, b = q.ph === 'drain' ? xs : Math.min(xs, f + 6);
    // the sheet: white at the crest, green-grey behind it
    const g = ctx.createLinearGradient(...P(f, OY + q.z), ...P(b, OY + q.z));
    g.addColorStop(0, `rgba(240,250,255,${0.92 * fade})`); g.addColorStop(0.3, `rgba(160,210,220,${0.75 * fade})`); g.addColorStop(1, `rgba(70,125,140,${0.4 * fade})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...P(b, y0, 3)); ctx.lineTo(...P(f, y0, 3)); ctx.lineTo(...P(f, y1, 3)); ctx.lineTo(...P(b, y1, 3)); ctx.closePath(); ctx.fill();
    // foam streaks on it
    ctx.fillStyle = `rgba(255,255,255,${0.55 * fade})`;
    for (let i = 0; i < 26; i++) {
      const u = ((i * 0.6180339 + q.seed) % 1), v = ((i * 0.4142 + q.seed * 0.37) % 1), x = f + (b - f) * u, yy = y0 + (y1 - y0) * v, [px, py] = P(x, yy, 4);
      ctx.beginPath(); ctx.ellipse(px, py, 7 + 5 * v, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the sea standing up over her weather rail as it comes aboard, falling in
    if (q.ph === 'sweep' && q.t < SWEEP * 0.5) {
      const k = q.t / (SWEEP * 0.5), hgt = 70 * (1 - k * k), x = xs + 0.2 - k * 0.8;
      ctx.fillStyle = `rgba(150,205,215,${0.75 * (1 - k)})`; ctx.beginPath(); ctx.moveTo(...P(xs + 0.6, y0, 0));
      for (let i = 0; i <= 10; i++) { const yy = y0 + (y1 - y0) * i / 10; ctx.lineTo(...P(x - 0.5 * Math.sin(Math.PI * i / 10), yy, hgt * (0.7 + 0.3 * Math.sin(i * 2.1 + q.seed)))); }
      ctx.lineTo(...P(xs + 0.6, y1, 0)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 5; ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const yy = y0 + (y1 - y0) * i / 10, [px, py] = P(x - 0.5 * Math.sin(Math.PI * i / 10), yy, hgt * (0.7 + 0.3 * Math.sin(i * 2.1 + q.seed))); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    // the crest: a wall of broken water standing up at the front
    if (q.ph === 'sweep') {
      ctx.fillStyle = 'rgba(250,253,255,0.95)'; ctx.beginPath(); ctx.moveTo(...P(f, y0, 0));
      for (let i = 0; i <= 10; i++) { const yy = y0 + (y1 - y0) * i / 10, hgt = 16 + 9 * Math.abs(Math.sin(i * 1.7 + q.t * 22 + q.seed)); ctx.lineTo(...P(f + 0.15, yy, hgt)); }
      ctx.lineTo(...P(f, y1, 0)); ctx.lineTo(...P(f + 0.7, y1, 2)); ctx.lineTo(...P(f + 0.7, y0, 2)); ctx.closePath(); ctx.fill();
    }
  }
  // the Lampwarden line hauling the hero back up the side
  const o = S.over, pl = api.p();
  if (o && o.ph === 'haul' && pl) {
    const a = P(o.rail + 0.2, o.y, 1.4 * api.LV * HSv), bx = isoX(pl.x, pl.y), by = (pl.x + pl.y) * HH - (pl.z || 0) - 50;
    ctx.globalAlpha = 1; ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(bx, by); ctx.stroke();
  }
  ctx.restore();
}
/** The lane while the sea heaps up: dark green water-shadow filling in from the weather rail over a second, a
 *  foam-white edge along that rail, chevrons running down it toward the lee rail (on the ground layer). */
function drawLane(api, ctx) {
  const q = api.state.sea; if (!q || q.ph !== 'tele') return;
  const P = (x, y, up = 0) => [(x - y) * HW, (x + y) * HH - up];
  const OX = api.OX, y = api.OY + q.z, hw = q.L.w / 2, xs = OX + q.xi + 0.3, xp = OX - q.xi - 0.2;
  const fill = Math.min(1, q.t / 1.0), xf = xs + (xp - xs) * fill, k = q.t / TELE, pulse = 0.5 + 0.5 * Math.sin(q.t * 9);
  ctx.save();
  // the band: deep blue-green, darker toward the lee rail it will run to
  const g = ctx.createLinearGradient(...P(xs, y), ...P(xp, y));
  g.addColorStop(0, 'rgba(18,92,104,0.72)'); g.addColorStop(1, 'rgba(8,44,58,0.6)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...P(xs, y - hw)); ctx.lineTo(...P(xf, y - hw)); ctx.lineTo(...P(xf, y + hw)); ctx.lineTo(...P(xs, y + hw)); ctx.closePath(); ctx.fill();
  // its sides, so the lane's edge reads against the planks
  ctx.strokeStyle = 'rgba(150,230,235,0.75)'; ctx.lineWidth = 2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(...P(xs, y + s * hw)); ctx.lineTo(...P(xf, y + s * hw)); ctx.stroke(); }
  // the foam-white leading edge at the weather rail, where the sea will come over: thickens as it nears
  ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * pulse})`; ctx.lineWidth = 4 + 6 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...P(xs, y - hw)); ctx.lineTo(...P(xs, y + hw)); ctx.stroke();
  // the fill's own front while it fills
  if (fill < 1) { ctx.strokeStyle = 'rgba(230,250,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...P(xf, y - hw)); ctx.lineTo(...P(xf, y + hw)); ctx.stroke(); }
  // chevrons down the lane toward the lee rail
  ctx.globalAlpha = fill * (0.55 + 0.4 * k); ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    const x = xs - 1 - ((i / 4 + q.t * 0.6) % 1) * (xs - xp - 2), h2 = hw - 0.4;
    ctx.beginPath(); ctx.moveTo(...P(x + 0.7, y - h2)); ctx.lineTo(...P(x - 0.3, y)); ctx.lineTo(...P(x + 0.7, y + h2)); ctx.stroke();
  }
  ctx.restore();
}
