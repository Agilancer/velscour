// THE PIRATE SEAS (docs/PIRATE_SEAS.md): a sea battle on the Dawnwake's deck. The ship (world/seaship.js, the Sky
// Battle ironclad's deck plan) is drawn live in three.js on Bellmourn's water (gfx/seabattle3d.js); this is the
// director, forked from the Sky Battle's (game/skybattle.js) without its parley, flagship and hooks. The hero steps out
// of the bell tower's great door; Commodore Brask names the Ember aloud and Brother Tolland rings his hand bell; the
// Black Tide's longboats and harpoon cutters come up from astern, lie off the port side and their boarders leap the
// rail in five waves, a captain swinging over after the third; then the Tide's captain comes himself under his title
// card. His fall lays a chest on the hatch, rings Tolland's bell (one a scenario, the first time it is won: G.char.
// seaBells) and turns the bell tower's portal into the way on. Pip Gannet calls what's coming from the masthead.
// world.cave is this run's hook into render.js (the caverns' interface): the 3D draws behind the sprites, and
// horizon/mask hide whoever stands behind the bulwarks, the raised decks, the paddle boxes, the masts and the funnel.
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { HUD } from '../ui/hud.js';
import { camera, isoX, isoY, elevationAt, HW, HH } from '../core/view.js';
import { rand, pick, chance, clamp } from '../core/util.js';
import { sfx, setAmbience } from '../core/audio.js';
import { makeMonster, monsterBase } from './monster.js';
import { aoe, kill } from './combat.js';
import { makeFolk } from './folk.js';
import { townSprite } from './render.js';
import { TOWN_FRAME_W, townFrameOf } from './townsfolkvisuals.js';
import { Cine } from './cinema.js';
import { GroundItem, dropChest } from './loot.js';
import { addEffect, addLight, Ring, Telegraph, smoke, burst, sparkle, floatText, spawn, glowSprite } from '../gfx/vfx.js';
import { enemyImage } from '../core/enemyart.js';
import { depthLevel } from '../data/depth.js';
import { rollItem, rarityAt } from '../data/items.js';
import { TOWNSFOLK } from '../data/townsfolk.js';
import { AIR_CREW, AIR_CAPTAIN } from '../data/airpirates.js';
import { SEA_VARIANT, SEA_VARIANTS, SEA_WAVES, BRASK, PIP, SEA_CRIES } from '../data/seabattle.js';
import { OX, OY, LV, GATE, LANDING, WL, SEA_LV, SEA_DOCKS, SEA_QUARTER, SEA_BRIG, SEA_COLUMNS, DAWNWAKE, seaDeck, applyDeck, joinDecks, unjoin, mapChanged } from '../world/seaship.js';
import { FC_H, QD_H, beam, sheer, inner, sAt } from '../world/skyship.js';
import { buildSea3D, drawSea3D, tickSea3D, disposeSea3D, seaScene, seaBoat, seaRope, seaSplash, seaPortal, seaSails, spawnShip, seaPlank, berth } from '../gfx/seabattle3d.js';

const HS = 4, VZ = LV * HS;
/** Tear the 3D down when the hero leaves for anywhere but a sea battle (game.js setWorld). */
export function useSea(world) {
  document.body.classList.toggle('at-sea', !!(world && world.seaRun));   // the level-up banner keeps out of the top band (css)
  if (!(world && world.seaRun) && seaScene()) disposeSea3D();
}
/**
 * One Air Pirate sprite plays many named sea captains: each name its own palette swap and height (data/airpirates.js
 * art, game/enemyart.js recolour), so no two names share a face. The art's own captain keeps his. Wick is the most
 * distinct: drowned-lamp pale and tall.
 */
const NAME_LOOKS = {
  'Captain Ezra Wick': [{ colorize: [188, 0.55], light: 0.08, contrast: 1.08 }, 1.14],
  'Foreman Gristle Mott': [{ hue: 32, sat: 1.35, light: -0.04 }, 0.94],
  'Coalwarden Hesk': [{ colorize: [16, 0.7], light: -0.08 }, 1.0],
  'Hangar Chief Bolt': [{ hue: 205, sat: 1.25, light: 0.02 }, 0.96],
  'Bosun Garret Blackwater': [{ sat: 0.3, light: -0.1, contrast: 1.1 }, 1.06],
  'Mother Cairn': [{ colorize: [140, 0.5], light: 0.02 }, 0.92],
  'Captain Hesper Lowe': [{ hue: 318, sat: 1.2, light: 0.03 }, 0.97],
  'Harpooner Nan Gaff': [{ colorize: [44, 0.55], light: 0.05 }, 0.93],
};
function nameLook(name, base) {
  if (!name || name === base.name) return null;
  if (NAME_LOOKS[name]) return NAME_LOOKS[name];
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;   // any other name: a hue of its own
  return [{ hue: 40 + (h % 280), sat: 0.9 + (h >> 9) % 5 * 0.1, light: ((h >> 13) % 5 - 2) * 0.025 }, 0.92 + ((h >> 17) % 7) * 0.03];
}

/** The next sea battle: `id`, else one the hero hasn't won (never the one just played, if there is a choice), else any
 *  but the last (docs/PIRATE_SEAS.md "Bells and order"). `won` is G.char.seaSeen. */
export function pickSeaVariant(id, last, won = {}, bells = G.char?.seaBells || 0) {
  if (id && SEA_VARIANT[id]) return SEA_VARIANT[id];
  // the finale (finale: true, #12) only after eight bells, and then it is the one offered until it is won; once it is,
  // every battle is in the pool (the skull's "sea <id>" and HAIL VELSCOUR still reach it at any time, above)
  const fin = SEA_VARIANTS.find((v) => v.finale);
  if (fin && !won[fin.id] && bells >= 8) return fin;
  const all = fin && !won[fin.id] ? SEA_VARIANTS.filter((v) => !v.finale) : SEA_VARIANTS;
  const fresh = fin && won[fin.id] ? [] : all.filter((v) => !won[v.id]), pool = fresh.length ? fresh : all;
  const not = pool.filter((v) => v.id !== last);
  return pick(not.length ? not : pool);
}
const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];

/**
 * A Lampwarden's own sheet from a townsfolk sheet (10 cells of 256 x 200, feet on row 194): Brask's red hair turned
 * salt-white and her brass lantern with its green flame at her hip; Tolland's brass diving helmet hung at his belt.
 * Each cell finds the figure's edge at hip height, so the piece sits on the body in every pose (mirrored with it).
 */
function lampSheet(img, o = {}) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, id = x.getImageData(0, 0, W, H), d = id.data, CW = 256;
  if (o.hair) for (let y = 0; y < Math.min(H, 96); y++) for (let X = 0; X < W; X++) {
    const i = (y * W + X) * 4; if (d[i + 3] < 8) continue;
    if (y >= 60 && X % CW > 100) continue;   // below the shoulders only the braid down her back (the leather is red-brown too)
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
    if (mx !== r || s <= 0.62 || mx <= 0.15) continue;
    const h = ((g - b) / (mx - mn || 1)) / 6;   // hue round red (0..1/6 for orange)
    if (h <= 0 || h >= 0.07) continue;
    const v = 0.42 + 0.6 * mx;
    d[i] = Math.min(255, v * 0.94 * 255); d[i + 1] = Math.min(255, v * 0.97 * 255); d[i + 2] = Math.min(255, v * 255);
  }
  x.putImageData(id, 0, 0);
  const edge = (f, y, right) => {   // the figure's outer column on row y of cell f
    for (let k = 0; k < CW; k++) { const X = f * CW + (right ? CW - 1 - k : k); if (d[(y * W + X) * 4 + 3] > 40) return X; }
    return f * CW + CW / 2;
  };
  for (let f = 0; f < W / CW; f++) {
    if (o.lantern) {   // a small brass lantern, its green flame bright (2-3 px at the game's scale)
      const X = edge(f, 106, true) - 7, Y = 104;
      x.fillStyle = '#5a4214'; x.fillRect(X, Y, 8, 11); x.fillStyle = '#c89a3c'; x.fillRect(X + 1, Y, 6, 1); x.fillRect(X + 3, Y - 2, 2, 2);
      x.fillStyle = '#46ff8a'; x.fillRect(X + 1, Y + 2, 6, 7); x.fillStyle = '#eaffef'; x.fillRect(X + 3, Y + 4, 2, 3);
    }
    if (o.helmet) {    // Brother Tolland's diving helmet at his belt: a brass dome, a dark rim, a round glass port
      const X = edge(f, 112, false) - 3, Y = 104;
      x.fillStyle = '#4a3410'; x.beginPath(); x.ellipse(X + 7, Y + 7, 8, 8, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#d8a848'; x.beginPath(); x.ellipse(X + 7, Y + 7, 6.5, 6.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff0b0'; x.fillRect(X + 4, Y + 3, 3, 2);
      x.fillStyle = '#2a3a3a'; x.beginPath(); x.ellipse(X + 8, Y + 8, 3, 3, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#8ac8c8'; x.fillRect(X + 7, Y + 7, 1, 1);
      x.fillStyle = '#6a4a18'; x.fillRect(X, Y + 13, 14, 2);
    }
  }
  return c;
}

/**
 * A scenario plugin (game/seascen/<id>.js, docs/PIRATE_SEAS.md "Building a scenario") on the director's fields: the
 * shared flow reads v.mid_boss, v.final, v.waves, v.docks...; the plugin's hooks run beside it.
 */
function scenarioOf(P) {
  const mid = P.mid || {}, fin = P.final || {};
  return {
    ...P, mid, final: fin.id, fin, mid_boss: mid.id, finalName: fin.name, finalTitle: fin.title, finalLine: fin.line, midName: mid.name, midTitle: mid.title,
    waves: (P.waves || SEA_WAVES).map((w) => ({ ...w })), docks: P.docks || SEA_DOCKS, boats: P.boats || { longboat: 2, cutter: 1 },
    amb: P.amb || `pirate_seas_${P.weather}`, weatherName: P.weatherName || P.weather, hooks: P.hooks || {},
  };
}

export function createSeaBattle(world, gen, biome, depth, opts, onSuccess) {
  const map = world.map, c0 = G.char, v = scenarioOf(pickSeaVariant(opts.variant, opts.last, opts.seen)), H_ = v.hooks;
  const lvl = depthLevel(depth), base = monsterBase(lvl);
  const CREW = AIR_CREW.map((a) => ({ ...a, art: a.id, swap: null }));
  const ARCHS = [...new Set(CREW.map((a) => a.arch))];
  const crewFor = (arch) => CREW.filter((a) => a.arch === arch);
  const pickCrew = () => pick(CREW);
  /** A captain by Air Pirate id; the battle's own captain under his (or her) sea name and title. */
  const capOf = (key) => {
    const base = AIR_CAPTAIN[key] || {}, a = { ...base, art: key, swap: null, ...(key === v.final && v.finalName ? { name: v.finalName, title: v.finalTitle } : {}),
      ...(key === v.mid_boss && v.midName ? { name: v.midName, title: v.midTitle } : {}) };
    const nl = nameLook(a.name, base);
    if (nl) { a.swap = nl[0]; a.h = Math.round((base.h || 90) * nl[1]); }
    return a;
  };
  world.ambushT = Infinity;
  if (v.dark) world.darkK = v.dark;
  world.raining = false;
  const p = () => world.player;
  const tileOf = (x, z) => [OX + x, OY + z];
  const lvAt = (x, y) => map.hgt[map.tileIdx(x, y)];
  const walk = (x, y) => map.walkable(x, y);
  const near = (x, y, r = 2) => { if (walk(x, y)) return [x, y]; const q = map.randomNear(x, y, r); return q && walk(q[0], q[1]) ? q : [OX + 0.5, OY + 2.5]; };
  const live = new Set();
  const drop = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); };
  const S = world.seaState = { v, boats: [], shots: [], ropes: [], hooks: [], portalK: 0, calm: 0 };

  // ------------------------------------------------------------------ the deck as the renderer sees it (world.cave)
  const W = map.w, H = map.h, K = HH / VZ;
  /** The top of what stands at tile position (x, y), ship units: the decks (the stairs smooth), struct tiles at their
   *  top (bulwarks, the raised decks' fronts, the paddle boxes), the sea off the ship. */
  const groundT = (x, y) => {
    const i = map.tileIdx(x, y);
    if (!map.t[i]) return WL;
    if (!map.block[i] && map.deck[i] === DAWNWAKE) { const d = seaDeck(x - OX, y - OY); return d == null ? map.hgt[i] / LV : d; }
    return map.hgt[i] / LV;
  };
  const elev = (x, y) => { const i = map.tileIdx(x, y); return map.t[i] ? map.hgt[i] * HS : 0; };
  /** Tall things that hide sprites behind them: the Dawnwake's masts and funnel, and every arena deck's (applyDeck). */
  const cols = SEA_COLUMNS.map(([x, z, r, y0, h]) => [OX + x, OY + z, r, y0, h]);
  const cr = world.cave = {
    focus: [OX, 0, OY], zoomK: 0.86, cut: false,
    elev,
    /** World px to the tile whose deck shows there: the first lifted column met going into the screen (gfx/terrain.js). */
    pick(wx, wy) {
      for (let k = map.maxLevel; k >= map.minLevel; k--) {
        const yy = wy + k * HS, x = (wx / HW + yy / HH) / 2, y = (yy / HH - wx / HW) / 2, tx = Math.floor(x), ty = Math.floor(y);
        if (tx < 0 || ty < 0 || tx >= W || ty >= H || !map.t[ty * W + tx]) continue;
        const h = map.hgt[ty * W + tx];
        if (h === k) return [x, y];
        if (h > k) return [tx + 0.5, ty + 0.5];
      }
      const yy = wy; return [(wx / HW + yy / HH) / 2, (yy / HH - wx / HW) / 2];
    },
    /** Where the ship in front of a creature hides it (game/caverns.js horizon): null, a world px y above which it shows,
     *  or -Infinity (all of it hidden). */
    horizon(o) {
      const x = o.x, y = o.y, fy = isoY(x, y) - (o.z || 0);
      let top = Infinity;
      for (let s = 0.25, sMax = (map.maxLevel / LV - WL) / (2 * K) + 1; s < sMax; s += s < 2 ? 0.25 : 0.5) {
        const sx = x + s, sy = y + s;
        if (sx >= W || sy >= H) break;
        const py = (sx + sy) * HH - groundT(sx, sy) * VZ;
        if (py < top) top = py;
      }
      if (top >= fy - 5) return null;
      const hgt = o.viewH || 46 * (o.scale || 1);
      return top <= fy - hgt ? -Infinity : top;
    },
    /** The masts and the funnel in front of a creature: a path of their silhouettes to cut out of its sprite, or null. */
    mask(o) {
      const sx = isoX(o.x, o.y), fy = isoY(o.x, o.y) - (o.z || 0), top = fy - (o.viewH || 60), d = o.x + o.y;
      let hit = null;
      for (const [x, z, r, y0, h] of cols) {
        if (x + z <= d + r * 0.6) continue;   // behind it, or beside it
        const cx = (x - z) * HW, by = (x + z) * HH - y0 * VZ, w = r * HW * Math.SQRT2;
        if (sx + 22 < cx - w || sx - 22 > cx + w || fy < by - h * VZ || top > by + w / 2) continue;
        (hit ||= []).push([cx, by - h * VZ, w, by]);
      }
      if (!hit) return null;
      return (ctx) => { for (const [cx, t, w, by] of hit) { ctx.moveTo(cx - w, t); ctx.lineTo(cx + w, t); ctx.lineTo(cx + w, by); ctx.ellipse(cx, by, w, w / 2, 0, 0, Math.PI); ctx.closePath(); } };
    },
    drawProp() {},
    frame(dt, snap = false) {
      const pl = p(); if (!pl) return;
      cr.focus[0] = pl.x; cr.focus[1] = groundT(pl.x, pl.y); cr.focus[2] = pl.y;
      if (snap || Math.abs(camera.zoomK - cr.zoomK) > 0.002) { camera.zoomK = cr.zoomK; camera.computeZoom(); }
      // the sails: solid in a cut scene's wide shots of the ship, faded at the game's zoom (the deck being fought on)
      const z = camera.zoom; camera.computeZoom(); const zr = z / camera.zoom; camera.zoom = z;
      seaSails(clamp((0.85 - zr) / 0.3, 0, 1));
      // a nudge: the camera leans toward an announced event and back (never in a cut scene: the director frames those)
      const L = run && run.lean;
      if (L && !G.cine) {
        L.t += dt; const k = clamp(Math.min(L.t, L.dur - L.t) / 0.6, 0, 1) * 0.55, q = typeof L.pos === 'function' ? L.pos() : L.pos;
        if (q && L.t < L.dur) { camera.leadX = (isoX(q[0], q[1]) - isoX(pl.x, pl.y)) * k; camera.leadY = (isoY(q[0], q[1]) - isoY(pl.x, pl.y)) * k; }
        else { run.lean = null; camera.leadX = camera.leadY = 0; }
      } else if (L && G.cine) { run.lean = null; camera.leadX = camera.leadY = 0; }
    },
    draw(ctx) {
      drawSea3D(ctx, cr.focus);
      if (!v.fogK) return;
      // sea fog: the water and the ships thicken into it away from the middle of the view (the sprites stay clear)
      const Wd = G.W * G.dpr, Hd = G.H * G.dpr, r = Math.hypot(Wd, Hd) * 0.55;
      const g = ctx.createRadialGradient(Wd / 2, Hd * 0.55, r * 0.22, Wd / 2, Hd * 0.55, r);
      g.addColorStop(0, 'rgba(198,208,212,0)'); g.addColorStop(0.45, 'rgba(198,208,212,0.22)'); g.addColorStop(1, 'rgba(206,214,218,0.72)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
    },
  };
  buildSea3D({ weather: v.weather });
  seaPortal(0, 0.55);

  // ------------------------------------------------------------------ boats
  const easeOut = (k) => 1 - (1 - k) ** 3;
  /** Where a boat lies off the port side at ship z = dz: its centre (tile) clear of the hull's fittings. */
  const dockSpot = (kind, h, dz) => (dz === 'quarter' ? { x: OX + SEA_QUARTER.x, y: OY + SEA_QUARTER.z } : dz === 'brig' ? { x: OX + SEA_BRIG.x, y: OY + SEA_BRIG.z }
    : { x: OX - v.docks.find((d) => d[0] === dz)[1], y: OY + dz });
  const astern = (b) => b.dz === 'quarter' || b.dz === 'brig';
  function launchBoat(kind, dz, crew, o = {}) {
    const h = seaBoat(kind); if (!h) return null;
    const dock = dockSpot(kind, h, dz), from = { x: dock.x - (dz === 'quarter' || dz === 'brig' ? 3 : 7), y: dock.y + (dz === 'brig' ? 52 : 44) };
    const spots = h.info.crew.slice().sort(() => Math.random() - 0.5);
    const b = { kind, dz, h, x: from.x, y: from.y, heading: 0, st: 'in', t: 0, dock, from, wait: o.wait ?? 1.4, hold: o.hold ?? 2.2, leap: o.leap !== false, wave: o.wave, crew: h.crew, lines: [], dur: o.dur ?? 6.5 };
    crew.forEach((c, i) => {   // the boat's crew list is the 3D handle's (its sprites), so a leap off is one drop
      const sp = spots[i % spots.length], extra = Math.floor(i / spots.length);
      h.addCrew({ ...c, x: sp[0] + rand(-0.12, 0.12) - extra * 0.35, y: sp[1], z: sp[2] + rand(-0.15, 0.15) + extra * 0.4, h: c.h ?? CREW.find((a) => a.art === c.art)?.h ?? 56, ph: rand(0, 6), bob: true });
    });
    h.place(b.x, b.y, 0, 1.1); h.setAlpha(0);
    S.boats.push(b);
    if (kind === 'longboat' && v.fogK) bark('longboats', 2.2);   // out of the fog: her first call in a fog
    return b;
  }
  /** Bring a boat still coming in alongside within `s` seconds. */
  const rushBoat = (b, s) => { if (b.st === 'in') b.fast = Math.max(b.fast || 1, (b.dur - b.t) / s); };
  /** An empty boat lying at dock `dz` casts off: another is coming in there. */
  const castOff = (dz) => { for (const b of S.boats) if (b.dz === dz && b.st === 'dock' && !b.crew.length && !b.stay) leave(b); };
  function leave(b) { b.st = 'out'; b.t = 0; for (const r of b.lines || []) r.remove(); b.lines = []; }
  function freeDock() {
    const busy = (d) => S.boats.some((b) => b.dz === d && (b.st === 'in' || (b.st === 'dock' && (b.crew.length || b.stay))));
    const zs = v.docks.map((q) => q[0]), free = zs.filter((d) => !busy(d)), d = pick(free.length ? free : zs);
    castOff(d);
    return d;
  }
  /** The Dawnwake's port rail at ship z (tile x, tile y, level). */
  const portRail = (z) => { const s = sAt(z); return [OX - beam(s) + 0.05, OY + z, (sheer(s) + 0.15) * LV]; };
  function boatTick(b, dt) {
    const rush = run.rushing === b, h = b.h, sp = b.st === 'in' && b.fast ? b.fast : 1;
    b.t += dt * sp;
    if (b.st === 'in') {
      const k = easeOut(clamp(b.t / b.dur, 0, 1));
      const nx = b.from.x + (b.dock.x - b.from.x) * k, ny = b.from.y + (b.dock.y - b.from.y) * k, vx = nx - b.x, vy = ny - b.y;
      if (vx || vy) b.heading += (clamp(-Math.atan2(vx, -vy), -0.5, 0.5) * (1 - k) - b.heading) * Math.min(1, dt * 3);
      b.x = nx; b.y = ny;
      h.place(b.x, b.y, b.heading, 0.55 + 0.9 * (1 - k)); h.row = 1;
      h.setAlpha(clamp(k / (v.fogK ? 0.5 : 0.25), 0, 1));
      if (k >= 1) docked(b);
    } else if (b.st === 'dock') {
      b.heading *= Math.max(0, 1 - dt * 2);
      h.place(b.dock.x, b.dock.y, b.heading, 0.55); h.row = Math.max(0, h.row - dt * 1.5); h.setAlpha(1);
      for (const r of b.lines) r.update();
      if (b.leap && b.crew.length && b.t > (rush ? Math.min(b.wait, 0.1) : b.wait) && ((b.nextLeap = (b.nextLeap ?? 0) - dt) <= 0 || rush)) { b.nextLeap = 0.34; leapOff(b, b.crew[0]); }
      if (!b.crew.length && b.t > b.wait + 0.5) { b.holdT = (b.holdT || 0) + dt; if (b.holdT > b.hold && !b.stay) leave(b); }
    } else if (b.st === 'out') {
      const k = clamp(b.t / 6, 0, 1), e = k * k;
      b.heading += (0.35 - b.heading) * Math.min(1, dt * 1.2);
      h.place(b.dock.x - 9 * e, b.dock.y + 34 * e, b.heading, 0.3);
      if (b.kind === 'brig') h.setFightingSail?.(0.45); h.row = Math.min(1, h.row + dt);
      h.setAlpha(1 - clamp((k - 0.55) / 0.45, 0, 1));
      if (k >= 1) { b.dead = true; h.remove(); }
    }
  }
  /** Where her boarders will land: a ring on the deck at each grapnel, shown before anyone leaps. */
  function landing(b, spots) {
    b.land = spots.map(([x, z]) => near(...tileOf(x, z), 1.2));
    if (!G.cine) for (const [x, y] of b.land) addEffect(new Telegraph({ kind: 'circle', x, y, r: 1.25, dur: b.wait + 0.5, color: '#ff7040' }), 'ground');
  }
  /** She lies alongside: grapnel lines up to the rail; a cutter's harpoon bites the hull. */
  function docked(b) {
    b.st = 'dock'; b.t = 0; sfx('thud', 0.6); camera.shake(2);
    const h = b.h, ln = (lx, ly, lz, z) => {
      const r = seaRope(h.worldOf(lx, ly, lz), portRail(z));
      r.update = () => r.set(h.worldOf(lx, ly, lz), portRail(z));
      return r;
    };
    if (astern(b)) {   // off the quarter: lines from her bow (the brig's waist) up to the Dawnwake's stern rail
      const at = (x, z) => () => [OX + x, OY + z, (sheer(sAt(z)) + 0.15) * LV], lz = b.kind === 'brig' ? -2 : -h.info.hl * 0.8;
      for (const [lx, x, z] of [[0.4, -3.6, 19.75], [h.hb * 0.8, -5.4, 18.2]]) {
        const tgt = at(x, z), r = seaRope(h.worldOf(lx, 0.6, lz), tgt());
        r.update = () => r.set(h.worldOf(lx, 0.6, lz), tgt()); b.lines.push(r);
      }
      landing(b, [[-3.4, 15.6], [-2.0, 17.8]]);
      return;
    }
    const zs = [b.dz - h.info.hl * 0.4, b.dz + h.info.hl * 0.4];
    b.lines = [ln(h.hb * 0.9, 0.6, -h.info.hl * 0.45, zs[0]), ln(h.hb * 0.9, 0.6, h.info.hl * 0.45, zs[1])];
    landing(b, zs.map((z) => { const zz = clamp(z, -11, 11); return [-(inner(sAt(zz)) - 1.4), zz]; }));
    if (b.kind === 'cutter') {
      // the harpoon flies from her bow ballista, bites the hull, and the line comes taut: Pip calls it then
      const hz = clamp(b.dz - 2, -14, 14), s = sAt(hz), at = [OX - beam(s) + 0.1, OY + hz, (WL + 1.4) * LV], from = () => h.worldOf(0, 1.3, -5.6);
      const r = seaRope(from(), from(), 0x2a2420); r.sag = 0.35; let t = 0;
      r.update = () => { const a = from(), k = Math.min(1, t / 0.45); r.set(a, [a[0] + (at[0] - a[0]) * k, a[1] + (at[1] - a[1]) * k, a[2] + (at[2] - a[2]) * k]); };
      b.lines.push(r);
      run.scripted.push((dt) => {
        t += dt;
        if (t >= 0.45 && !r.bit) { r.bit = true; sparkle(at[0], at[1], at[2] * HS, '#ffe0a0', 8, 0.3); sfx('thud', 0.8); }
        if (r.bit) r.sag = Math.max(0.03, r.sag - dt * 0.8);
        if (r.bit && r.sag <= 0.03) { bark('harpoon'); return false; }
        return !b.dead;
      });
    }
  }
  /** A boarder (or captain) leaps from a boat onto the Dawnwake's deck. */
  function leapOff(b, c) {
    const L0 = b.land && b.land[(b.landI = (b.landI || 0) + 1) % b.land.length];
    const to = L0 ? near(L0[0] + rand(-0.8, 0.8), L0[1] + rand(-0.8, 0.8), 1.2) : near(...tileOf(-(inner(sAt(clamp(b.dz, -11, 11))) - 1.1), clamp(b.dz, -11, 11)));
    const from = b.h.worldOf(c.x, c.y, c.z);
    b.h.dropCrew(c);
    seaSplash(from[0] + 0.6, from[1], 0.25);
    return c.captain ? spawnCaptain(c.art, from, to, c.rank, c.onLand) : spawnPirate(c.art, c.rank || 'normal', from, to, c.wave);
  }
  /** Fly a monster from `from` [tile x, tile y, level] to `to` [tile x, tile y] in an arc; it can't act until it lands. */
  function leap(m, from, to, o = {}) {
    const d = Math.hypot(to[0] - from[0], to[1] - from[1]), dur = o.dur ?? 0.6 + d / 11, arc = o.arc ?? 110 + d * 6;
    const lvTo = o.toLv ?? lvAt(to[0], to[1]);
    let t = 0, fast = 0;
    m.targetable = false; m.awake = true; m.moving = true; m.boarding = !!o.board;
    m.entering = (dt) => {
      if (!fast && o.board && m.rush) fast = Math.max(1, (dur - t) / 0.25);
      t += dt * (fast || 1); m.animT += dt;
      const k = Math.min(1, t / dur);
      m.x = from[0] + (to[0] - from[0]) * k; m.y = from[1] + (to[1] - from[1]) * k;
      m.z = (from[2] * (1 - k) + lvTo * k) * HS + arc * Math.sin(Math.PI * k) - elevationAt(m.x, m.y);
      if (k >= 1) {
        m.boarding = m.rush = false;
        m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.cd = rand(0.2, 0.5); m.moving = false;
        smoke(m.x, m.y, 4, '#6a5a4a', 3, 9); sfx('thud', m.captain ? 1 : 0.4);
        if (m.captain) { addEffect(new Ring(m.x, m.y, 0.2, 2.6, 0.5, '#e8d0a0', 6)); camera.shake(9); if (!G.cine) aoe(world, m, m.x, m.y, 2.2, m.dmg * 0.6, 'phys', { knock: 1 }); }
        if (o.onLand) o.onLand(m);
      }
    };
  }
  /** Swing on a rope from `anchor()` [tile x, tile y, level] across to `to` (a captain off a boat's masthead or the yard). */
  function swingAcross(m, anchor, to, o = {}) {
    const from = [m.x, m.y, (m.z + elevationAt(m.x, m.y)) / HS], dur = o.dur ?? 1.5, rope = { a: anchor, m };
    let t = 0; const hit = new Set();
    m.targetable = false; m.awake = true; m.moving = true; S.ropes.push(rope); sfx('swing', 0.8);
    m.entering = (dt) => {
      t += dt; m.animT += dt;
      const k = Math.min(1, t / dur), e = k * k * (3 - 2 * k);
      m.x = from[0] + (to[0] - from[0]) * e; m.y = from[1] + (to[1] - from[1]) * e;
      const lvl2 = from[2] * (1 - e) + lvAt(to[0], to[1]) * e;
      m.z = Math.max(groundT(m.x, m.y) * LV + 6, lvl2 + Math.sin(Math.PI * e) * 22) * HS - elevationAt(m.x, m.y);
      if (k > 0.3 && k < 0.85 && !G.cine) for (const q of world.hostiles('enemy', m.x, m.y, 1.2)) if (!hit.has(q)) { hit.add(q); aoe(world, m, q.x, q.y, 0.6, m.dmg * 0.9, 'phys', { knock: 1.2 }); }
      if (k >= 1) {
        drop(S.ropes, rope);
        m.entering = null; m.targetable = true; m.z = 0; m.x = to[0]; m.y = to[1]; m.moving = false; m.cd = rand(0.2, 0.4);
        smoke(m.x, m.y, 4, '#6a5a4a', 4, 10); sfx('thud', 0.8); camera.shake(m.captain ? 7 : 3);
        if (o.onLand) o.onLand(m);
      }
    };
  }
  function spawnPirate(art, rank, from, to, wave = run.wave) {
    const a = CREW.find((q) => q.art === art) || pickCrew();
    const m = makeMonster(world, a.arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, to[0], to[1], 0, { art: a.art, swap: a.swap });
    if (a.shot && m.proj) m.proj = { ...m.proj, fx: a.shot };
    world.add(m); m.sea = true; m.wave = wave; live.add(m);
    leap(m, from, to, { board: true });
    return m;
  }
  function spawnCaptain(id, from, to, rank = 'boss', onLand, o = {}) {
    const a = capOf(id);
    const m = makeMonster(world, a.arch, biome, lvl + (o.lv ?? 2), rank, to[0], to[1], 0, { art: a.art, swap: a.swap });
    if (a.shot && m.proj) m.proj = { ...m.proj, fx: a.shot };
    m.name = a.name; m.title = a.title; m.captain = a; m.castKey = id; m.sea = true; m.moveT = rand(5, 8); m.split = false;
    m.scale = 1; m.artH = a.h;   // the boss rank's 1.9 would make a captain three heroes tall (game/skybattle.js)
    if (o.hp) { m.maxHp *= o.hp; m.hp = m.maxHp; }
    world.add(m); live.add(m);
    if (o.swing) { m.x = from[0]; m.y = from[1]; m.z = from[2] * HS - elevationAt(m.x, m.y); swingAcross(m, o.swing, to, { dur: 1.7, onLand }); }
    else leap(m, from, to, { arc: 150, onLand, board: true });
    return m;
  }
  function crewList(n, champions, uniques, wave) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const heavy = ARCHS.filter((x) => x === 'demon' || x === 'knight'), light = ARCHS.filter((x) => x !== 'demon');
      const arch = heavy.length && chance(0.18) ? pick(heavy) : pick(light);
      const a = pick(crewFor(arch));
      out.push({ art: a.art, swap: a.swap, h: a.h, rank: i < uniques ? 'unique' : i < uniques + champions ? 'champion' : 'normal', wave });
    }
    return out;
  }
  const boatKind = () => { const w = Object.entries(v.boats).filter(([, n]) => n > 0); let r = rand(0, w.reduce((s, [, n]) => s + n, 0)); for (const [k, n] of w) if ((r -= n) <= 0) return k; return w[0][0]; };

  /** A combat banner: in the top band under the boss bar, held under 2 s (ui.js centerMsg top). */
  const banner = (title, sub = '', pos = null) => { UI.centerMsg(title, sub, 1.8, { top: true }); if (pos) nudge(pos, 2.4); };
  /** Lean the camera toward pos ([tile x, tile y] or a function giving it) for secs (eased out and back): an announced event. */
  const nudge = (pos, secs = 2.4) => { run.lean = { pos, t: 0, dur: secs }; };
  // ------------------------------------------------------------------ the Lampwardens: Brask, Pip, Tolland
  const folk = (sprite, palette, name, x, z, o = {}) => {
    const q = TOWNSFOLK.find((f) => f.spriteId === sprite) || TOWNSFOLK[0], [tx, ty] = tileOf(x, z);
    const n = makeFolk(world, q, tx, ty, { calm: true, still: true, palette, cheered: true, ...o });   // (no town cheers: they keep to their few lines)
    n.name = name; n.first = name.split(' ').pop(); n.lift = 0;
    n.motion = () => ({ dy: n.lift + (n.hop ? n.hop() : 0) });
    world.npcs.push(n);
    return n;
  };
  const CAST = {
    brask: ['05_road_guard', { key: 'brask', build: (img) => lampSheet(img, { hair: true, lantern: true }) }, 'Commodore Brask'],
    pip: ['25_royal_heir', { hue: 200, sat: 0.8, light: 0.06 }, 'Pip Gannet'],
    tolland: ['41_friar', { key: 'tolland', build: (img) => lampSheet(img, { helmet: true }) }, 'Brother Tolland'],
  };
  S.warm = () => { for (const [id, pal] of Object.values(CAST)) townSprite(id, pal); };
  const brask = folk(...CAST.brask, 2.0, 14.6, { chatter: ['Hold the deck.', 'Mind the port rail.', 'Keep that green fire lit.'] });
  const tolland = folk(...CAST.tolland, -2.1, -12.55, { onUse: () => ringHandBell() });   // the deep took his voice: he only rings
  tolland.motion = () => ({ dy: tolland.hop ? tolland.hop() : 0, sx: 1.28, sy: 1.28 });   // a huge man
  const pip = folk(...CAST.pip, 0.75, -6.1, { onUse: () => {} });
  brask.face(OX - 4, OY); tolland.face(OX, OY + 4);
  // Pip stands in the foretop, a mast's height over the deck
  const FORETOP = 8.36;
  pip.lift = Math.max(0, FORETOP * VZ - elevationAt(pip.x, pip.y));
  let barkT = 0;
  const barked = {};
  /** Pip calls what's coming: her bubble in the foretop, and the line under the centre when she is off screen. A call
   *  waits out a cut scene or her last call (one at a time, 5 s apart); the same call not twice in 15 s. */
  function bark(key, delay = 0) {
    if (delay) { run.later(delay, () => bark(key)); return; }
    if (world.time - (barked[key] ?? -99) < 15 || run.completed) return;
    const text = v.barks && key in v.barks ? v.barks[key] : PIP[key] || key;   // (plugin barks: { key: text | null }, or words of its own)
    if (!text) return;
    if (G.cine || barkT > 0) { run.later(G.cine ? 1 : barkT + 0.1, () => bark(key)); return; }
    barkT = 5; barked[key] = world.time;
    pip.say(text, 2.6, 'excited');
    const [sx, sy] = camera.toScreen(isoX(pip.x, pip.y), isoY(pip.x, pip.y) - pip.lift - 60);
    if (sx < 40 || sx > G.W - 40 || sy < 40 || sy > G.H - 40) banner('', `Pip, from the foretop: "${text}"`);
    sfx('note', 0.4, 1.6);
  }

  // ------------------------------------------------------------------ portraits and the director's camera
  let heroImg = null;
  const heroPortrait = (cx, x, y, w) => {
    if (!heroImg) { heroImg = new Image(); heroImg.src = `assets/sprites/select/${G.char.classId}.webp`; }
    if (heroImg.complete && heroImg.naturalWidth) { const s = w / heroImg.naturalWidth * 1.6; cx.drawImage(heroImg, x + w / 2 - heroImg.naturalWidth * s / 2, y - 4, heroImg.naturalWidth * s, heroImg.naturalHeight * s); }
  };
  const monsterPortrait = (art, swap = null) => (cx, x, y, w, h, t) => {
    const img = enemyImage(art, swap); if (!img) return;
    const s = w / img.width * 1.5, sh = Math.sin(t * 30) * (t < 0.3 ? 2 : 0);
    cx.drawImage(img, x + w / 2 - img.width * s / 2 + sh, y - h * 0.08, img.width * s, img.height * s);
  };
  const folkPortrait = (n, filter = '') => (cx, x, y, w) => {
    const sheet = townSprite(n.townsfolkSpriteId, n.palette); if (!sheet) return;
    const f = Math.max(0, townFrameOf(n.townsfolkSpriteId, n.emotion || 'idle'));
    if (filter) cx.filter = filter;   // Brask's: sixty, weathered (darker, a touch of sepia, harder)
    cx.drawImage(sheet, f * TOWN_FRAME_W + 64, 0, 128, 110, x - w * 0.1, y, w * 1.2, w * 1.2 * 110 / 128);
    if (filter) cx.filter = 'none';
  };
  const capSpeaker = (a) => ({ name: a.name, color: '#ff9a6a', portrait: monsterPortrait(a.art, a.swap), voice: { pitch: a.voice || 0.7, wave: 'sawtooth' } });
  const flat = (x, y, lv = 0, up = 0) => [(x - y) * HW, (x + y) * HH - lv * HS - up];
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const faceOf = (e, k = 0.62) => {
    if (!e) return faceOf(p(), k);
    const h = e.isPlayer ? 60 : e.townsfolkSpriteId ? 57 : (e.artH || 50) * (e.scale || 1);
    return [isoX(e.x, e.y), isoY(e.x, e.y) - (e.z || 0) - (e.lift || 0) - h * k];
  };
  /** A crew record still aboard a boat: its face (world px). */
  const crewFace = (b, c) => { const [x, y, l] = b.h.worldOf(c.x, c.y, c.z); return flat(x, y, l, c.h * 0.62); };
  const boatAt = (b) => flat(b.x, b.y, b.h.lv, 50);
  const gateAt = () => flat(OX + 0.5, OY + GATE.z, (FC_H + 1.4) * LV);
  const on = (f, zoom = 1, dur = 1, o = {}) => ({ cam: { on: f, zoom, dur, pace: o.pace, ease: o.ease, wait: !!o.wait, push: o.push, drift: o.drift } });
  const fit = (f, zoom = 2, dur = 1, o = {}) => ({ cam: { fit: f, zoom, dur, pace: o.pace, ease: o.ease, wait: !!o.wait, push: o.push, drift: o.drift, margin: o.margin, min: o.min } });
  const backToHero = (dur = 1) => on(() => faceOf(p(), 0.4), 1, dur, { wait: true });
  const folkSay = (n, text, color, pitch) => ({ say: { name: n.name, color, portrait: folkPortrait(n, n === brask ? 'sepia(0.3) brightness(0.8) contrast(1.15) saturate(0.8)' : ''), text, voice: { pitch, wave: 'triangle' }, focus: () => faceOf(n),
    mark: /Tessariel/.test(text) ? { word: 'Tessariel', color: '#d8f070' } : null,
    onStart: () => { n.feel('talk', 1.4 + text.length * 0.045, false); } } });

  // ------------------------------------------------------------------ the run
  const run = {
    id: 'pirate_seas', type: 'seabattle', completed: false, failed: false, active: true, stage: 0, markers: [], route: [], escort: null, routeIndex: 0,
    variant: v, phase: 'intro', wave: -1, t: 0, midM: null, capM: null, chest: null, bell: 0,
    get title() { return run.completed ? 'The Deck Is Held' : v.name; },
    get description() {
      const ph = run.phase;
      return run.completed ? "The bell tower's door is the way on. The chest waits on the hatch."
        : ph === 'waves' ? `Hold the deck: boarding wave ${run.wave + 1} of ${v.waves.length}.`
          : ph === 'mid' ? `Defeat ${capOf(v.mid_boss).name}.`
            : ph === 'final' ? `Defeat ${capOf(v.final).name}.` : 'Hold the deck.';
    },
    get objective() { return run.completed ? { x: OX + 0.5, y: OY + GATE.z + 0.6, reach: 1.4 } : (H_.objective && H_.objective(api)) || { x: OX + 0.5, y: OY + 0.5, reach: 7 }; },
    rewardK: 1, meter: null,
    /** Auto-play pushes through to the objective while the scenario holds the captain back for it (game/autoplay.js). */
    get pushObjective() { return !!(H_.holdFinal && H_.holdFinal(api)); },
    update(dt) { tick(dt); },
  };
  world.seaRun = run;
  run.timers = [];
  run.later = (s, fn, tag) => run.timers.push([s, fn, tag]);
  run.scripted = [];
  /** Walk `who` to tile `to` over `dur` seconds (scripted, straight line), facing the way. */
  run.walkTo = (who, to, dur, fadeIn = false, then = null) => {
    const fx = who.x, fy = who.y; let t = 0;
    if (who.isPlayer) who.face(Math.atan2(to[1] - fy, to[0] - fx)); else if (who.face) who.face(to[0], to[1]);
    run.scripted.push((dt) => {
      t += dt; const k = clamp(t / dur, 0, 1);
      who.x = fx + (to[0] - fx) * k; who.y = fy + (to[1] - fy) * k;
      if (fadeIn) who.alpha = k < 1 ? k : undefined;
      if (who.isPlayer) { who.moving = k < 1; who.moveTarget = null; who.path = null; who.attackTarget = null; } else who.walking = k < 1;
      if (k >= 1 && then) then();
      return k < 1;
    });
  };

  // ---- cut scenes a hero has watched once fast-forward at 20x the next time (game/cinema.js Cine.fast)
  const seen = (c0.seaSeen ||= {});
  function scene(name, steps, onEnd) {
    const k = 'cine:' + name, was = !!seen[k];
    Cine.play([{ do: () => { Cine.fast = was && !G.settings.noSkipCine; } }, ...steps, { do: () => { Cine.fast = false; seen[k] = 1; } }], onEnd);
  }

  // ---- the arrival: the Dawnwake on the water from astern, along her deck to the bell tower, in on its door; it flares
  // and the hero steps out; Tolland rings his hand bell; Brask, at the helm, says the name aloud
  function intro() {
    const pl = p(), gate = tileOf(0.5, GATE.z + 0.1), land = tileOf(LANDING[0] + 0.5, LANDING[1]);
    pl.x = gate[0]; pl.y = gate[1]; pl.alpha = 0;
    const first = !seen['cine:open'];
    const landing = () => flat(land[0], land[1], lvAt(...land), 30);
    scene('intro', [
      { do: () => { [camera.x, camera.y] = flat(OX - 4, OY + 30, -10); camera.zoom = Cine.zoom0 * 0.42; } },
      { card: [v.name.toUpperCase(), `${v.weatherName} · Depth ${depth}`], dur: 3.4 },
      on(() => flat(OX + 0.5, OY + 1, 6), 0.55, 3.6, { wait: true, ease: 'out', drift: [-6, -3] }),
      on(gateAt, 1.1, 2.2, { wait: true }),
      on(() => mix(gateAt(), landing(), 0.55), 2.0, 1.2, { wait: true, push: 0.03 }),
      { do: () => { seaPortal(0, 1.4, true); sfx('portal'); sparkle(gate[0], gate[1] + 0.4, 60, '#7dffa0', 30, 0.8); } },
      { wait: 0.5 },
      { do: () => { run.walkTo(pl, land, 0.9, true); } },
      { wait: 1.0 },
      { do: () => { seaPortal(0, 0.55); } },
      // Tolland, by the door, rings his hand bell once
      on(() => mix(faceOf(tolland), faceOf(pl), 0.3), 2.2, 0.8, { wait: true }),
      { do: () => ringHandBell() },
      { wait: 1.3 },
      // Brask at the helm: the name aloud (the first sea battle), else her order
      on(() => faceOf(brask), 2.4, 1.6, { pace: 900, wait: true }),
      folkSay(brask, first ? BRASK.open : BRASK.again, '#8fe8d0', 0.8),
      ...(v.arrival ? [folkSay(brask, v.arrival, '#8fe8d0', 0.8)] : []),   // a scenario's own line for her (plugin `arrival`)
      { do: () => { seen['cine:open'] = 1; rangingShots(); } },
      { card: ['HOLD THE DECK', v.blurb], dur: 2.8 },
      on(() => mix(faceOf(p(), 0.4), flat(OX - 9, OY + 4, SEA_LV), 0.45), 0.7, 1.6, { wait: true }),
      { wait: 0.9 },
      backToHero(1.0),
    ], () => { run.phase = 'waves'; run.wave = -1; run.t = 2; });
  }
  function ringHandBell() {
    sfx('bell', 0.9); tolland.feel('excited', 1.2, false);
    let t = 0; tolland.hop = () => (t < 0.5 ? Math.sin(t / 0.5 * Math.PI) * 4 : 0);
    run.scripted.push((dt) => { t += dt; return t < 0.6; });
    floatText(tolland.x, tolland.y, 80, '* DONG *', '#ffe0a0', 15, { life: 1.4 });
  }
  /** The Tide's guns ranging on her: water columns off the port side, falling short. */
  function rangingShots(n = 3) {
    for (let i = 0; i < n; i++) run.later(0.4 + i * 0.35, () => { const x = OX - 12 - rand(0, 8), y = OY + rand(-14, 14); seaSplash(x, y, 1.1, true); sfx('explode', 0.3); });
  }

  // ---- waves
  function startWave(n, quiet = false) {
    run.wave = n; run.phase = 'waves'; run.t = 0;
    const Wv = v.waves[n];
    if (!quiet) banner(`BOARDING WAVE ${n + 1}`, n === v.waves.length - 1 && !Wv.label ? 'The last boats' : Wv.boats ? `${Wv.boats} boat${Wv.boats > 1 ? 's' : ''} from astern` : (Wv.label || ''));
    if (H_.onWave) H_.onWave(api, n, Wv);
    sfx('boss', 0.5);
    let champ = Wv.champion || 0, uniq = Wv.unique || 0;
    for (let b = 0; b < (Wv.boats || 0); b++) {
      const k = Math.min(champ, 1 + (b === 0 ? 1 : 0)), u = Math.min(uniq, 1);
      champ -= k; uniq -= u;
      run.later(b * 2.2, () => launchBoat(n === 0 && b === 0 && v.fogK ? 'longboat' : boatKind(), freeDock(), crewList(Wv.n[b], k, u, n), { wave: n }), n);
    }
    if (Wv.boats >= 3) bark('sails', 3.2);
  }
  /** Boarders of wave `w` still to come over the rail: not yet set out, or aboard a boat alongside or coming in. */
  const coming = (w) => run.timers.some((q) => q[2] === w) || S.boats.some((b) => b.wave === w && b.crew.length && b.leap);
  /** Nothing on the deck to hit (game/skybattle.js hurry): the next foe on its way hurries, one arrival at a time. */
  function hurry() {
    let air = false;
    for (const m of live) if (!m.dead && m.entering && m.boarding) air = m.rush = true;
    if (air) return null;
    const crewed = S.boats.filter((b) => b.leap && b.crew.length);
    const dk = crewed.find((b) => b.st === 'dock'); if (dk) return dk;
    const inb = crewed.reduce((a, b) => (b.st === 'in' && (!a || b.t > a.t) ? b : a), null); if (inb) { rushBoat(inb, 0.5); return null; }
    const tm = run.timers.reduce((a, q) => (q[2] !== undefined && (!a || q[0] < a[0]) ? q : a), null); if (tm) tm[0] = 0;
    return null;
  }

  // ---- the mid-boss: a captain off a harpoon cutter, swinging across from her masthead
  function midBoat() {
    if (run.midBoat || v.mid.from === 'deck') return run.midBoat;
    const a = capOf(v.mid_boss);
    const b = run.midBoat = launchBoat('cutter', 'quarter', [{ art: a.art, swap: a.swap, h: a.h, cap: v.mid_boss, captain: true }, ...crewList(3, 1, 0, 99)], { leap: false, hold: 3 });
    const c = b.crew[0]; c.x = 0.3; c.z = 1.6; c.y = 0; c.bob = false;
    return b;
  }
  function midBoss() {
    if (v.mid.from === 'deck') return deckCaptain('mid');
    run.phase = 'mid';
    const id = v.mid_boss, a = capOf(id), b = midBoat();
    const capFace = () => (b.crew[0] && b.crew[0].captain ? crewFace(b, b.crew[0]) : faceOf(run.midM));
    scene('mid', [
      { do: () => rushBoat(b, 1.5) },
      on(() => boatAt(b), 0.85, 1.3, { pace: 900 }),
      { until: () => b.st === 'dock', max: 8 },
      on(capFace, 2.1, 0.9, { wait: true, push: 0.03 }),
      { card: [a.name.toUpperCase(), a.title], dur: 2.6 },
      ...(v.mid.line ? [{ say: { ...capSpeaker(a), text: v.mid.line, focus: capFace } }] : [{ wait: 0.8 }]),
      { do: () => {
        const c = b.crew[0], from = b.h.worldOf(c.x, c.y, c.z); b.h.dropCrew(c);
        const mast = b.h.mastTop || [0, 6, -1];
        const to = near(...tileOf(-2.2, 15.2));
        run.midAnchor = () => b.h.worldOf(mast[0], mast[1], mast[2]); run.midTo = to;
        run.midM = spawnCaptain(id, from, to, 'boss', null, { swing: run.midAnchor });
        world.boss = run.midM; if (H_.onBoss) H_.onBoss(api, run.midM, 'mid');
      } },
      // the swing held in frame: her masthead, him on the rope, where he lands
      fit(() => [flat(...run.midAnchor()), faceOf(run.midM, 0.5), flat(run.midTo[0], run.midTo[1], lvAt(...run.midTo), 40)], 1.3, 0.35, { min: 0.55 }),
      { until: () => run.midM && !run.midM.entering, max: 4 },
      { wait: 0.5 },
      on(() => faceOf(run.midM), 1.7, 0.5, { push: 0.02 }),
      { wait: 0.6 },
      backToHero(0.8),
    ], () => { b.leap = true; b.wait = 0.3; });
  }

  // ---- the Tide's captain: his own gun-brig comes up out of the weather off the port quarter, his card and his line
  // with him at her starboard rail, and he swings over from her main yard
  function finalBoat() {
    if (run.finalBoat || v.fin.from === 'deck') return run.finalBoat;
    const a = capOf(v.final);
    const b = run.finalBoat = launchBoat('brig', 'brig', [{ art: a.art, swap: a.swap, h: a.h, cap: v.final, captain: true }, ...crewList(4, 2, 0, 97)], { leap: false, hold: 3, dur: 8 });
    const c = b.crew[0]; c.x = 2.3; c.z = -0.6; c.y = 0; c.bob = false;
    return b;
  }
  function finalCaptain() {
    if (v.fin.from === 'deck') return deckCaptain('final');
    run.phase = 'finalIntro';
    const id = v.final, a = capOf(id), b = finalBoat();
    const capFace = () => (b.crew[0] && b.crew[0].captain ? crewFace(b, b.crew[0]) : faceOf(run.capM));
    scene('final', [
      { do: () => rushBoat(b, 2.5) },
      on(() => boatAt(b), 0.75, 1.4, { pace: 900 }),
      { until: () => b.st === 'dock', max: 9 },
      on(capFace, 2.2, 1.0, { wait: true, push: 0.025 }),
      { card: [a.name.toUpperCase(), a.title], dur: 2.8 },
      { say: { ...capSpeaker(a), text: v.finalLine, focus: capFace } },
      ...(v.fin.after ? v.fin.after(api, { face: capFace, speaker: capSpeaker(a) }) : []),   // a plugin's own steps after his line (#1: Wick to Pip)
      { do: () => {
        const c = b.crew[0], from = b.h.worldOf(c.x, c.y, c.z); b.h.dropCrew(c);
        const mast = b.h.mastTop || [0, 12, 0], to = near(...tileOf(-2.4, 16.8));
        run.capAnchor = () => b.h.worldOf(mast[0], mast[1] * 0.8, mast[2]); run.capTo = to;
        run.capM = spawnCaptain(id, from, to, 'boss', null, { hp: 1.2, swing: run.capAnchor });
        world.boss = run.capM; if (H_.onBoss) H_.onBoss(api, run.capM, 'final');
      } },
      fit(() => [flat(...run.capAnchor()), faceOf(run.capM, 0.5), flat(run.capTo[0], run.capTo[1], lvAt(...run.capTo), 40)], 1.2, 0.35, { min: 0.5 }),
      { until: () => run.capM && !run.capM.entering, max: 5 },
      { wait: 0.5 },
      on(() => faceOf(run.capM), 1.9, 0.5, { push: 0.02 }),
      { wait: 0.6 },
      backToHero(0.8),
    ], () => { b.leap = true; b.wait = 0.4; run.phase = 'final'; banner(a.name.toUpperCase(), a.title); });
  }

  /**
   * A captain who waits on an arena deck (plugin mid/final { from: 'deck', at(api) -> [tile x, tile y] }): framed
   * there under his card and his line, held still for it; then he comes over (leapTo(api) -> a Dawnwake tile) or stays
   * and fights where he stands (stay: true, e.g. at her helm).
   */
  function deckCaptain(which) {
    const fin = which === 'final', c = fin ? v.fin : v.mid, id = c.id, a = capOf(id), at = near(...c.at(api), 1.5);
    run.phase = fin ? 'finalIntro' : 'mid';
    const m = makeMonster(world, a.arch, biome, lvl + (fin ? 2 : 2), 'boss', at[0], at[1], 0, { art: a.art, swap: a.swap });
    if (a.shot && m.proj) m.proj = { ...m.proj, fx: a.shot };
    m.name = a.name; m.title = a.title; m.captain = a; m.castKey = id; m.sea = true; m.moveT = rand(5, 8); m.split = false; m.scale = 1; m.artH = a.h;
    if (fin) { m.maxHp *= 1.2; m.hp = m.maxHp; }
    m.static = !!c.stay; m.awake = true; m.targetable = false; m.entering = () => {};   // still for his card
    world.add(m); live.add(m);
    if (fin) run.capM = m; else run.midM = m;
    world.boss = m; if (H_.onBoss) H_.onBoss(api, m, which);
    const face = () => faceOf(m);
    scene(which, [
      on(face, 2.2, 1.4, { wait: true, pace: 900, push: 0.025 }),
      { card: [a.name.toUpperCase(), a.title], dur: 2.8 },
      ...(c.line ? [{ say: { ...capSpeaker(a), text: c.line, focus: face } }] : [{ wait: 0.8 }]),
      ...(c.after ? c.after(api, { face, speaker: capSpeaker(a) }) : []),
      { do: () => {
        m.entering = null; m.targetable = true;
        if (c.leapTo) { const to = near(...c.leapTo(api), 1.5); run.capTo = to; leap(m, [m.x, m.y, lvAt(m.x, m.y)], to, { arc: 150, dur: 1.3 }); }
      } },
      c.leapTo ? fit(() => [face(), faceOf(p(), 0.4)], 1.3, 0.5, { min: 0.5 }) : { wait: 0.1 },
      c.leapTo ? { until: () => !m.entering, max: 3 } : { wait: 0.6 },
      backToHero(0.8),
    ], () => { if (fin) { run.phase = 'final'; banner(a.name.toUpperCase(), a.title); } });
  }

  // ---- victory: the boats fall astern, the chest on the hatch, Tolland's bell, the door turns to the way on
  function victory() {
    run.phase = 'victory';
    UI.clearCenterMsg(); run.meter = null;
    if (H_.onVictory) H_.onVictory(api);
    for (const b of S.boats) if (b.st !== 'out') leave(b);
    const won = !seen[v.id], bellN = won ? (c0.seaBells || 0) + 1 : 0;
    const wins = c0.seaWins || 0, braskLine = v.finale ? null : wins === 0 ? BRASK.win : BRASK.wins[(wins - 1) % BRASK.wins.length];
    c0.seaWins = wins + 1;
    const card = typeof v.bellCard === 'function' ? v.bellCard(api, bellN, won) : v.bellCard
      || (won ? ['THE BELL RINGS', `Brother Tolland's ${ORD[bellN] || bellN + 'th'} bell · ${v.light} burns again`] : ['VICTORY', `${v.light} burns again · the door leads onward`]);
    const chestAt = () => { const c = run.chest; return c ? flat(c.x, c.y, lvAt(c.x, c.y), 20) : faceOf(p(), 0.3); };
    run.hoardAt = near(OX + 0.5, OY + 2.6);
    const steps = [
      { wait: 1.0 },
      fit(() => [faceOf(p(), 0), flat(OX - 12, OY + 6, SEA_LV), flat(OX - 12, OY - 8, SEA_LV)], 0.9, 1.4, { wait: true, min: 0.5 }),
      { wait: 1.0 },
      on(() => { const [x, y] = run.hoardAt; return flat(x, y, lvAt(x, y), 20); }, 1.8, 1.4, { wait: true }),
      { do: () => spawnHoard() },
      { wait: 1.2 },
      ...(braskLine ? [on(() => faceOf(brask), 2.3, 1.4, { pace: 900, wait: true }), folkSay(brask, braskLine, '#8fe8d0', 0.8)] : []),
      on(() => mix(faceOf(tolland), gateAt(), 0.35), 1.7, 1.6, { wait: true, pace: 900 }),
      { do: () => {
        ringHandBell(); camera.shake(3);
        if (won) { seen[v.id] = 1; c0.seaBells = bellN; run.bell = bellN; }
      } },
      { wait: 0.8 },
      { do: () => { seaPortal(1, 1.25, true); sfx('gate'); addEffect(new Ring(OX + 0.5, OY + GATE.z + 0.8, 0.2, 3, 1, '#40a0ff', 5)); } },
      { card, dur: 3 },
      { wait: 3.0 },
      on(() => mix(faceOf(p()), chestAt(), 0.3), 2.0, 0.9, { pace: 700, wait: true }),
      backToHero(0.9),
    ];
    scene('victory', steps, () => { run.completed = true; run.phase = 'done'; UI.refresh(); onSuccess(); area(); });
  }
  function spawnHoard() {
    const [x, y] = run.hoardAt;
    const chest = {
      x, y, rare: true, sea: true, opened: false, reach: 1.3,
      use() {
        if (this.opened) return;
        this.opened = true; sfx('chest'); sfx('gold');
        dropChest(world, this, depth);
        const st0 = G.player ? G.player.st : { magicFind: 0 }, il = lvl + 2;
        world.addLoot(new GroundItem(this.x, this.y + 0.3, 'item', { item: rollItem(il, { mf: st0.magicFind, bonus: 1.6 * run.rewardK }) }));
        if (run.rewardK > 0.75 && chance(0.35)) world.addLoot(new GroundItem(this.x + 0.3, this.y + 0.2, 'item', { item: rollItem(il, { rarity: rarityAt(il, chance(0.2) ? 4 : 3) }) }));
        sparkle(this.x, this.y, 20, '#ffd060', 30, 0.6);
      },
    };
    world.chests.push(chest);
    addEffect(new Ring(x, y, 0.2, 2.4, 0.8, '#ffd060', 6)); sparkle(x, y, 40, '#ffd060', 40, 0.8); sfx('gold');
    run.chest = chest;
  }

  // ------------------------------------------------------------------ captains' specials (game/skybattle.js, at sea)
  function captainMoves(dt) {
    const pl = p(); if (!pl || pl.dead) return;
    for (const m of live) {
      if (!m.captain || m.dead || m.entering) continue;
      if ((m.moveT -= dt) > 0) continue;
      m.moveT = rand(7, 10.5);
      const mv = pick(m.static ? m.captain.moves.filter((q) => q === 'barrage' || q === 'hook' || q === 'crew') : [...m.captain.moves.filter((q) => q !== 'storm'), 'swing']);
      if (!mv) continue;
      if (mv === 'crew') {
        // up the side from the water on grapnels, or over from a boat alongside
        const boat = S.boats.find((b) => b.st === 'dock');
        for (let i = 0; i < 2 + (lvl > 40 ? 1 : 0); i++) run.later(i * 0.4, () => {
          const to = near(pl.x + rand(-3, 3), pl.y + rand(-3, 3)), from = boat ? boat.h.worldOf(0, 0.2, rand(-2, 2)) : [OX - beam(sAt(to[1] - OY)) - 0.6, to[1], SEA_LV + 4];
          if (!boat) seaSplash(from[0], from[1], 0.5);
          spawnPirate(pickCrew().id, 'normal', from, to, 99);
        });
        floatText(m.x, m.y, 80, 'ALL HANDS!', '#ffb070', 16);
      } else if (mv === 'hook') {
        addEffect(new Telegraph({ kind: 'line', x: m.x, y: m.y, ang: Math.atan2(pl.y - m.y, pl.x - m.x), len: Math.hypot(pl.x - m.x, pl.y - m.y), w: 0.5, dur: 0.8, color: '#c0a070' }), 'ground');
        run.later(0.8, () => {
          if (m.dead || pl.dead) return;
          const h = { from: [m.x, m.y, lvAt(m.x, m.y) + 8], to: [pl.x, pl.y, lvAt(pl.x, pl.y) + 6] }; S.hooks.push(h);
          let t = 0;
          run.scripted.push((dt2) => { t += dt2; h.to = [pl.x, pl.y, lvAt(pl.x, pl.y) + 6]; h.from = [m.x, m.y, lvAt(m.x, m.y) + 8];
            const d = Math.hypot(m.x - pl.x, m.y - pl.y); if (t > 0.25 && d > 1.4) world.map.move(pl, (m.x - pl.x) / d * dt2 * 9, (m.y - pl.y) / d * dt2 * 9);
            if (t > 0.75 || m.dead) { drop(S.hooks, h); return false; } return true; });
          aoe(world, m, pl.x, pl.y, 0.8, m.dmg * 0.5, 'phys', {}); sfx('swing');
        });
        floatText(m.x, m.y, 80, 'GET OVER HERE!', '#ffb070', 16);
      } else if (mv === 'leap') {
        const to = near(pl.x, pl.y, 1.5);
        addEffect(new Telegraph({ kind: 'circle', x: to[0], y: to[1], r: 2.2, dur: 1.1 }), 'ground');
        leap(m, [m.x, m.y, lvAt(m.x, m.y)], to, { dur: 1.1, arc: 160 });
      } else if (mv === 'barrage') {
        volleyAtDeck(5); floatText(m.x, m.y, 80, 'POWDER! NOW!', '#ffb070', 16);
      } else if (mv === 'swing') {
        // a line off the main yard: a long swing through the hero
        const anchor = () => [OX + 0.5, OY + 4.4, 8.7 * LV];
        const dx = pl.x - m.x, dy = pl.y - m.y, d = Math.hypot(dx, dy) || 1, to = near(pl.x + dx / d * 2.5, pl.y + dy / d * 2.5, 1.5);
        addEffect(new Telegraph({ kind: 'line', x: m.x, y: m.y, ang: Math.atan2(to[1] - m.y, to[0] - m.x), len: Math.hypot(to[0] - m.x, to[1] - m.y), w: 1.2, dur: 0.7, color: '#d0a060' }), 'ground');
        floatText(m.x, m.y, 80, 'ROPE!', '#ffb070', 16);
        run.later(0.7, () => { if (!m.dead && !m.entering) swingAcross(m, anchor, to, { dur: 1.3 }); });
      } else if (mv === 'smoke') {
        smoke(m.x, m.y, 10, '#2a2a30', 14, 20);
        const to = near(pl.x - (m.x - pl.x) * 0.5, pl.y - (m.y - pl.y) * 0.5, 1.5);
        m.x = to[0]; m.y = to[1]; smoke(m.x, m.y, 10, '#2a2a30', 10, 16); sfx('arcane', 0.5);
      }
    }
  }
  /** A boat's swivel guns on the deck: telegraphed rings, shot arcing over from the port side; a miss throws up water. */
  function volleyAtDeck(n = 4) {
    const pl = p();
    for (let i = 0; i < n; i++) {
      const tgt = i === 0 && pl ? near(pl.x + rand(-1.5, 1.5), pl.y + rand(-1.5, 1.5)) : near(OX + rand(-5, 5), OY + rand(-9, 15));
      run.later(i * 0.35, () => {
        const to = [tgt[0], tgt[1], lvAt(tgt[0], tgt[1])], boat = S.boats.find((b) => b.st === 'dock');
        const from = boat ? boat.h.worldOf(0, 0.9, -boat.h.info.hl * 0.7) : [OX - 16, OY + rand(-8, 8), SEA_LV + 3];
        addEffect(new Telegraph({ kind: 'circle', x: to[0], y: to[1], r: 1.5, dur: 1.3 }), 'ground');
        cannon(from, to, () => blast(to[0], to[1], 1.5, base.dmg * 2.0, true), 1.3);
      });
    }
  }
  function cannon(from, to, onHit, dur = 1.25) {
    S.shots.push({ from, to, t: 0, dur, arc: 60 + Math.hypot(to[0] - from[0], to[1] - from[1]) * 4, onHit });
    spawn({ type: 'glow', x: from[0], y: from[1], z: from[2] * HS - elevationAt(from[0], from[1]), life: 0.25, size: 26, size1: 4, color: '#ffd080', add: true });
    sfx('explode', 0.3);
  }
  function blast(x, y, r, dmg, both) {
    aoe(world, null, x, y, r, dmg, 'fire', { team: 'enemy', knock: 0.8 });
    if (both && !G.cine) aoe(world, null, x, y, r, dmg * 0.7, 'fire', { team: 'player', knock: 0.8 });
    burst(x, y, 10, 'fire', 18, 4); smoke(x, y, 8, '#3a3230', 6, 14);
    addEffect(new Ring(x, y, 0.2, r * 1.6, 0.4, '#ffb060', 5));
    camera.shake(6); sfx('explode', 0.6);
  }
  // a fog variant's banks drifting astern past her (world px, wrapped round the view), thinner near the hero
  const banks = v.fogK ? Array.from({ length: 22 }, () => ({ x: rand(-40, 40), y: rand(-40, 40), w: rand(260, 480), a: rand(0.18, 0.32) })) : null;
  // shot in flight, swing lines and the captains' chains: drawn over the sprites (a hazard in the top layer)
  world.addHazard({
    update() { return world === G.world; },
    draw(ctx) {
      const pt = (q) => [isoX(q[0], q[1]), (q[0] + q[1]) * HH - q[2] * HS];
      ctx.save();
      if (banks) {
        const vr = camera.viewRect(0), cx = (vr.x0 + vr.x1) / 2, cy = (vr.y0 + vr.y1) / 2, t = world.time, pl = p(), hx = pl ? isoX(pl.x, pl.y) : cx, hy = pl ? isoY(pl.x, pl.y) - 30 : cy;
        const img = glowSprite('#d4dde0'), W2 = (vr.x1 - vr.x0) / 2 + 300, H2 = (vr.y1 - vr.y0) / 2 + 200;
        for (const b of banks) {
          // tile drift +z (astern): screen (-32, +16) a tile; wrapped into the view
          const wx = b.x * 40 - t * 26, wy = b.y * 22 + t * 13;
          const x = cx + ((((wx - cx) % (2 * W2)) + 3 * W2) % (2 * W2)) - W2, y = cy + ((((wy - cy) % (2 * H2)) + 3 * H2) % (2 * H2)) - H2;
          const near = Math.min(1, Math.hypot((x - hx) / 260, (y - hy) / 150));
          const tx = (x / HW + y / HH) / 2, ty = (y / HH - x / HW) / 2, deck = map.t[map.tileIdx(clamp(tx, 0, W - 1), clamp(ty, 0, H - 1))];
          ctx.globalAlpha = b.a * (0.25 + 0.75 * near) * (deck ? 0.25 : 1);   // thick on the water beyond the rail, thin over her deck
          ctx.drawImage(img, x - b.w / 2, y - b.w / 4, b.w, b.w / 2);
        }
        ctx.globalAlpha = 1;
      }
      for (const s of S.shots) {
        const k = clamp(s.t / s.dur, 0, 1), a = pt(s.from), b = pt(s.to), x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(Math.PI * k) * s.arc;
        ctx.fillStyle = 'rgba(40,30,24,0.5)'; ctx.beginPath(); ctx.arc(x - 3, y + 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1614'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#3a2a1a';
      for (const r of S.ropes) { const a = pt(r.a()), m = r.m; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(isoX(m.x, m.y), isoY(m.x, m.y) - (m.z || 0) - (m.artH || 60) * 0.85); ctx.stroke(); }
      ctx.strokeStyle = '#7a6a58'; ctx.lineWidth = 2;
      for (const h of S.hooks) { const a = pt(h.from), b = pt(h.to); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      // boarders coming: an arrow at the screen's edge toward each crewed boat still off screen
      if (!G.cine) {
        const dpr = G.dpr, M = 34, pulse = 0.65 + 0.35 * Math.sin(world.time * 8);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (const b of S.boats) {
          if (b.st !== 'in' || !b.crew.length || b.h.alpha < 0.02) continue;
          const [sx, sy] = camera.toScreen(...flat(b.x, b.y, b.h.lv, 30));
          if (sx > M && sx < G.W - M && sy > M + 30 && sy < G.H - M - 90) continue;
          const cx = G.W / 2, cy = G.H / 2, dx = sx - cx, dy = sy - cy, k = Math.min((G.W / 2 - M) / Math.abs(dx || 1e-6), (G.H / 2 - M - 50) / Math.abs(dy || 1e-6));
          const ex = (cx + dx * k) * dpr, ey = (cy + dy * k) * dpr, an = Math.atan2(dy, dx), r = 15 * dpr;
          ctx.save(); ctx.translate(ex, ey); ctx.rotate(an); ctx.globalAlpha = pulse;
          ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.75); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.75); ctx.closePath();
          ctx.fillStyle = '#ff6a3a'; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#2a0c06'; ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    },
  });

  // ------------------------------------------------------------------ every frame
  const area = () => HUD.setArea(`Depth ${depth}`, `${v.name} · ${run.title}`);
  let started = false;
  function tick(dt) {
    const pl = p();
    if (!started) { started = true; UI.clearLog(); intro(); setAmbience(v.amb); if (H_.start) H_.start(api); }   // the town's tips and commissions stay in town
    cr.frame(dt);
    tickSea3D(dt);
    barkT = Math.max(0, barkT - dt);
    const sc = run.scripted; run.scripted = [];
    for (const f of sc) if (f(dt) !== false) run.scripted.push(f);
    for (const tm of run.timers.slice()) if ((tm[0] -= dt) <= 0) { drop(run.timers, tm); tm[1](); }
    for (const b of S.boats) boatTick(b, dt);
    S.boats = S.boats.filter((b) => !b.dead);
    run.rushing = null;
    for (const s of S.shots) { s.t += dt; if (s.t >= s.dur && !s.done) { s.done = true; if (s.onHit) s.onHit(); } }
    S.shots = S.shots.filter((s) => !s.done);
    lights();
    for (const m of live) if (m.dead) { live.delete(m); if (!m.splashed && !walk(m.x, m.y)) { m.splashed = true; seaSplash(m.x, m.y, 0.6); } }
    if (G.cine || !pl || pl.dead) return;
    run.t += dt;
    if (H_.tick) H_.tick(api, dt);
    captainMoves(dt);
    // nothing on the deck to fight: whatever is on its way hurries (hurry), so the hero never stands about waiting
    S.calm = world.creatures.some((m) => m.team === 'enemy' && !m.dead && !m.entering && m.targetable !== false) ? 0 : (S.calm || 0) + dt;
    if (S.calm > 0.05) run.rushing = hurry();
    if (run.phase === 'waves') {
      const Wv = v.waves[run.wave], last = run.wave + 1 >= v.waves.length, mid = Wv && Wv.mid && !run.midDone;
      const left = [...live].filter((m) => !m.dead && !(m.wave >= 90)), over = !coming(run.wave), few = over && left.length <= 2 && left.every((m) => !m.entering);
      if (run.wave < 0) startWave(0);
      else if (few && !last && !mid) startWave(run.wave + 1);
      else if (few && mid) midBoat();
      else if (few && last) finalBoat();
      const hold = last && H_.holdFinal && H_.holdFinal(api);
      if (run.wave >= 0 && over && !left.length && (last || mid) && !hold && (run.pause = (run.pause ?? 0.3) - dt) <= 0) { run.pause = undefined; if (last) finalCaptain(); else { run.midDone = true; midBoss(); } }
    } else if (run.phase === 'mid') {
      if (run.midM && run.midM.dead && !(run.midBoat && run.midBoat.crew.length)) { banner(`${run.midM.name.toUpperCase()} FALLS`, 'More oars on the water'); world.boss = null; startWave(run.wave + 1, true); }
    } else if (run.phase === 'final') {
      if (run.capM && run.capM.dead && !run.capDeadT) { run.capDeadT = 1; UI.clearCenterMsg(); }   // his banner goes with him
      if (run.capM && run.capM.dead && !(run.finalBoat && run.finalBoat.crew.length) && ![...live].some((m) => !m.dead)) { world.boss = null; victory(); }
    }
  }
  /** In dark weather the Dawnwake's green lanterns and the gate light the deck's sprites. Brask's lantern always glows. */
  function lights() {
    if (chance(0.25)) spawn({ type: 'glow', x: brask.x + (brask.flip ? -0.12 : 0.12), y: brask.y + 0.05, z: 24, vz: rand(4, 12), life: rand(0.3, 0.6), size: rand(3, 5), size1: 1, color: '#46ff8a', add: true });
    if (!world.darkK) return;
    addLight(OX + 0.5, OY + GATE.z + 0.6, 4.5, 1, (FC_H + 1.2) * LV * HS, '#7dffa0');
    for (const z of [-9, -3, 3, 9]) for (const sd of [-1, 1]) addLight(OX + sd * (inner(sAt(z)) - 0.3), OY + z, 3, 0.7, (sheer(sAt(z)) + 0.3) * LV * HS, '#9dffc0');
    for (const b of S.boats) if (b.h.alpha > 0.3) addLight(b.x, b.y, 3, 0.6 * b.h.alpha, b.h.lv * HS + 20, '#ff6a40');
  }
  // ------------------------------------------------------------------ the scenario plugin's API
  /**
   * What a plugin (game/seascen/<id>.js) gets in its hooks: the world, the run, the scenario, the ships, the decks, the
   * meter, the director's pieces. docs/PIRATE_SEAS.md "Building a scenario".
   */
  const points = [];   // api.point's
  const api = {
    world, run, v, depth, lvl, base, map, OX, OY, LV, HS, VZ, WL, SEA_LV, live, state: {},
    p, tileOf, near, lvAt, walk, groundT, flat, faceOf, rand, chance, pick, clamp,
    /** Any fleet model (gfx/seabattle3d.js spawnShip; its kind in the scenario's `fleet` so it is loaded) and where to put it. */
    spawnShip: (kind, o) => spawnShip(kind, o), berth,
    /**
     * An arena deck: a ship spawned with deck: true becomes walkable ground. levels: its deck heights, ship-local (main
     * deck 0, quarterdeck, forecastle). Returns { id, h, tile(lx, lz) -> [tile x, tile y], walkN }.
     */
    addDeck(h, { levels = [0] } = {}) {
      const id = (api.decks.length ? api.decks[api.decks.length - 1].id : DAWNWAKE) + 1;
      const bake = h.bake(), r = applyDeck(map, bake, id, { levels: levels && levels.map((l) => l + h.deckY) });
      cols.push(...r.cols);
      // its stairs (model info.stairs: [x, y, z] foot, [x, y, z] top, width): walked as ramps from deck to deck
      for (const st of h.info.stairs || []) {
        const f = h.worldOf(st[0], st[1], st[2]), t = h.worldOf(st[3], st[4], st[5]);
        api.join([f[0], f[1], f[2] / LV], [t[0], t[1], t[2] / LV], { w: Math.max(0.5, st[6] / 2) }).open();
      }
      const d = { id, h, walkN: r.walkN, tile: (lx, lz) => { const [x, y] = h.worldOf(lx, 0, lz); return [x, y]; } };
      api.decks.push(d);
      return d;
    },
    decks: [],
    /** Join two decks along a to b ([tile x, tile y, ship units]): plank: true lays a plank in 3D too. open() / close(). */
    join(a, b, { w = 0.8, plank = false } = {}) {
      let was = null, mesh = null;
      return {
        open() { if (was) return; was = joinDecks(map, a, b, w); if (plank) mesh = seaPlank(a, b, w * 1.4); },
        close() { if (!was) return; unjoin(map, was); was = null; if (mesh) { mesh.remove(); mesh = null; } },
        get isOpen() { return !!was; },
      };
    },
    mapChanged: () => mapChanged(map),
    /** A boarder on a deck tile (the enemy's own deck: it comes over a plank on foot). */
    spawnOnDeck(art, rank, at, wave = run.wave) {
      const a = (art && CREW.find((q) => q.art === art)) || pickCrew(), [x, y] = near(at[0], at[1], 1.5);
      const m = makeMonster(world, a.arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, x, y, 0, { art: a.art, swap: a.swap });
      if (a.shot && m.proj) m.proj = { ...m.proj, fx: a.shot };
      world.add(m); m.sea = true; m.wave = wave; m.awake = true; m.hunter = true; live.add(m);
      return m;
    },
    /** Any painted art as a foe (bestiary id + archetype) at tile `at`; o.from [tile x, tile y, level] leaps it there. */
    spawnArt(art, arch, rank, at, o = {}) {
      const [x, y] = near(at[0], at[1], 1.5), m = makeMonster(world, arch, biome, lvl + (rank === 'normal' ? 0 : 1), rank, x, y, 0, { art, swap: null });
      world.add(m); m.sea = true; m.wave = o.wave ?? run.wave; m.awake = true; m.hunter = true; live.add(m);
      if (o.from) leap(m, o.from, [x, y], { board: true, arc: o.arc });
      return m;
    },
    kill: (m) => kill(m, world.player), beam, inner, sheer, sAt, FC_H, QD_H,
    spawnPirate, spawnCaptain, leap, swingAcross, launchBoat, crewList, pickCrew, capOf,
    cannon, blast, telegraph: (x, y, r, dur, color = '#ff7040') => { if (!G.cine) addEffect(new Telegraph({ kind: 'circle', x, y, r, dur, color }), 'ground'); },
    splash: seaSplash, bark, banner, later: run.later, scripted: (f) => run.scripted.push(f), scene, sfx, floatText, burst, smoke, sparkle, addEffect, Ring,
    /** The Lampwardens (NPCs) for a plugin's own cut scenes: cast.brask / pip / tolland; say(n, text) is a scene step of
     *  that one speaking (portrait, voice, framed on the face); on / fit / backToHero are the director's camera steps. */
    cast: { brask, pip, tolland },
    say: (n, text) => folkSay(n, text, n === brask ? '#8fe8d0' : n === pip ? '#9fd8ff' : '#ffe0a0', n === brask ? 0.8 : n === pip ? 1.4 : 0.55),
    on, fit, backToHero, mix, ringHandBell,
    /** A captain's spoken line as a scene step (his portrait and voice), framed on focus() (world px). */
    capSay: (id, text, focus) => ({ say: { ...capSpeaker(capOf(id)), text, focus } }),
    /** One more boarding wave before the captain (a lost objective: the meter's 'wave'). */
    addWave(w) { v.waves.push(w || { ...v.waves[v.waves.length - 1], mid: false }); banner('MORE OF THEM', 'Another boat comes up from astern'); },
    /** The victory chest pays less (a lost objective: the meter's 'reward'); never below 40%. */
    costReward(k = 0.25) { run.rewardK = Math.max(0.4, run.rewardK - k); },
    /**
     * The run's pressure meter, shown in the top band under the boss bar: { label, color, full: 'wave' | 'reward' |
     * fn(api) } and value 0..1 (add / set). Full does its thing and empties; it never ends the run. null hides it.
     */
    meter(label, o = {}) {
      const M = run.meter = { label, color: o.color || '#ff5a40', value: 0, full: o.full || 'reward', note: o.note || '',
        add(dv) { M.set(M.value + dv); }, set(x) {
          M.value = clamp(x, 0, 1);
          if (M.value >= 1) { M.value = 0; if (M.full === 'wave') api.addWave(); else if (M.full === 'reward') { api.costReward(); banner(label.toUpperCase(), 'It costs you: the chest will be lighter'); } else M.full(api); }
        }, hide() { if (run.meter === M) run.meter = null; } };
      return M;
    },
    /** An interactive mark on a deck (a lever, a lamp to douse): the player or auto-play uses it (run.objective). */
    mark(x, y, label, use, color = '#ffd060') { const o = { x, y, type: 'objective', active: true, color, reach: 1.4, label, use: () => use(o) }; world.portals.push(o); return o; },
    unmark(o) { const i = world.portals.indexOf(o); if (i >= 0) world.portals.splice(i, 1); },
    /**
     * An edge-of-screen pointer while getPos() ([tile x, tile y], or null to hide) is off screen: an idol, a tender, a
     * corvus. Every mark has one already. Returns { remove() }.
     */
    point(getPos, color = '#ffd060', label = '') { const q = { getPos, color, label, remove() { const i = points.indexOf(q); if (i >= 0) points.splice(i, 1); } }; points.push(q); return q; },
    /** Lean the camera toward pos ([tile x, tile y] or () => it) for secs: an announced event. banner(title, sub, pos) does it too. */
    nudge,
  };
  // pointers: an arrow at the screen's edge, in its colour, toward each mark (a lever, a lamp...) and each point off screen
  world.addHazard({ update() { return world === G.world; }, draw(ctx) {
    if (G.cine || run.completed) return;
    const d = G.dpr, M = 40, list = [...world.portals.filter((o) => o.type === 'objective' && o.active !== false).map((o) => ({ pos: [o.x, o.y], color: o.color || '#ffd060', label: o.label })),
      ...points.map((q) => ({ pos: q.getPos(), color: q.color, label: q.label }))];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const q of list) {
      if (!q.pos) continue;
      const [sx, sy] = camera.toScreen(isoX(q.pos[0], q.pos[1]), isoY(q.pos[0], q.pos[1]) - 30);
      if (sx > M && sx < G.W - M && sy > M + 40 && sy < G.H - M - 100) continue;
      const cx = G.W / 2, cy = G.H / 2, dx = sx - cx, dy = sy - cy, k = Math.min((G.W / 2 - M) / Math.abs(dx || 1e-6), (G.H / 2 - M - 60) / Math.abs(dy || 1e-6));
      const ex = (cx + dx * k) * d, ey = (cy + dy * k) * d, an = Math.atan2(dy, dx), r = 12 * d;
      ctx.save(); ctx.translate(ex, ey);
      ctx.save(); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.6, -r * 0.7); ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.6, r * 0.7); ctx.closePath();
      ctx.fillStyle = q.color; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(world.time * 6); ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 2 * d; ctx.strokeStyle = '#120a06'; ctx.stroke(); ctx.restore();
      if (q.label) { ctx.font = `600 ${Math.round(11 * d)}px "Alegreya Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const ly = -Math.sin(an) * 22 * d, lx = -Math.cos(an) * 30 * d;
        ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; ctx.strokeText(q.label, lx, ly); ctx.fillStyle = q.color; ctx.fillText(q.label, lx, ly); }
      ctx.restore();
    }
    ctx.restore();
  } });
  // the meter, drawn in screen space under the top band's banners
  world.addHazard({ update() { return world === G.world; }, draw(ctx) {
    const M = run.meter; if (!M || G.cine) return;
    const d = G.dpr, w = 240 * d, h = 9 * d, x = G.W * d / 2 - w / 2, y = 146 * d;   // under the boss bar and the banners
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(8,6,10,0.7)'; ctx.fillRect(x - 3 * d, y - 3 * d, w + 6 * d, h + 6 * d);
    ctx.fillStyle = M.color; ctx.fillRect(x, y, w * M.value, h);
    ctx.strokeStyle = '#c9a060'; ctx.lineWidth = 1 * d; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.font = `600 ${Math.round(12 * d)}px "Alegreya Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000'; const t = M.label + (M.note ? ` · ${M.note}` : '');
    ctx.strokeText(t, G.W * d / 2, y - 4 * d); ctx.fillStyle = '#f2e6d0'; ctx.fillText(t, G.W * d / 2, y - 4 * d);
    ctx.restore();
  } });
  document.body.classList.add('at-sea');
  if (H_.setup) H_.setup(api);
  run.api = api;   // (tools/tests/seabattle.js reads the scenario's decks and pieces here)
  world.overworldScenario = run;
  return run;
}
