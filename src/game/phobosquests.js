// ACT III's quest book, played (data/phobosquests.js holds the quests). State: phobosState(c).quests[id] =
// { s: 'active'|'ready'|'done', i: step, n: count, c: carrying, b: chosen option }; on offer = no entry yet.
// setupCityQuests / setupCastleQuests arm the steps that can be done on this map (markers are hazards, foes are spawned
// with the run's levels), questObjective(world) steers auto-play, onFoeKilled(m) counts kills.
import { G } from '../state.js';
import { rand, pick, dist, TAU, escapeHtml } from '../core/util.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, floatText, sparkle } from '../gfx/vfx.js';
import { UI } from '../ui/ui.js';
import { makeMonster } from './monster.js';
import { applyPhobosKit } from './phobosattacks.js';
import { makeTalker } from './phobostalk.js';
import { loadArtFor } from '../core/enemyart.js';
import { GroundItem } from './loot.js';
import { rollItem, rarityAt } from '../data/items.js';
import { depthLevel, MAX_LEVEL } from '../data/depth.js';
import { DISTRICTS, HUBS, WINGS, PHOBOS_BY_ID, PHOBOS_FOLK, cityDepth, castleDepth } from '../data/phobos.js';
import { PHOBOS_QUESTS, PQ_BY_ID, HUB_DISTRICT, poolOf, lordsOf } from '../data/phobosquests.js';

const FOLK = Object.fromEntries(PHOBOS_FOLK.map((a) => [a.name, a]));
const say = (n, text, t = 3.6) => { n.talkText = text; n.talkT = t; n.talkAge = 0; n.bubbleLines = text.length > 84 ? 4 : 3; };
const fill = (s, L, st) => (s.label || '').replace('{n}', st.n || 0).replace('{need}', s.n || 1).replace('{time}', Math.ceil(L?.left ?? s.time ?? 0));

// ---------------------------------------------------------------------------------------------- markers
class Mark {
  constructor(x, y, o = {}) { Object.assign(this, { x, y, t: rand(0, 3), ground: true, kind: 'place', col: '#ffd860', label: '', r: 0.9, hold: 0, held: 0 }, o); }
  update(dt) { this.t += dt; return !this.dead; }
  draw(ctx) {
    if (this.hidden) return;
    const p = G.player; if (this.kind === 'cache' && (!p || dist(p.x, p.y, this.x, this.y) > 5)) return;   // a cache shows only up close
    const x = isoX(this.x, this.y), y = isoY(this.x, this.y), pu = 0.6 + Math.sin(this.t * 4) * 0.3;
    ctx.save(); ctx.strokeStyle = this.col; ctx.fillStyle = this.col;
    ctx.globalAlpha = 0.25 * pu; ctx.beginPath(); ctx.ellipse(x, y, HW * this.r, HH * this.r, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, HW * this.r, HH * this.r, 0, 0, TAU); ctx.stroke();
    if (this.hold && this.held > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, HW * this.r * 1.15, HH * this.r * 1.15, 0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, this.held / this.hold)); ctx.stroke(); }
    const by = y - 34 + Math.sin(this.t * 3) * 3; ctx.globalAlpha = 1; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
    ctx.fillText(this.kind === 'bell' ? '\u{1F514}' : this.kind === 'zone' ? '⚔' : this.kind === 'dest' ? '⚑' : '◆', x, by);
    if (this.label && p && dist(p.x, p.y, this.x, this.y) < 7) { ctx.font = '11px monospace'; ctx.fillStyle = '#f0e0c0'; ctx.fillText(this.label, x, by - 16); }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------- the run's helpers
function reachFlood(world, from, gen) {   // tiles reachable from the start, pad jumps included
  const map = world.map, W = map.w, seen = new Uint8Array(W * map.h), q = [];
  const push = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= W || ty >= map.h) return; const i = ty * W + tx; if (seen[i] || !map.walkableTile(tx, ty)) return; seen[i] = 1; q.push(i); };
  const jumps = new Map(); for (const L of gen.leaps || []) jumps.set(map.tileIdx(L.x, L.y), [L.tx, L.ty]);
  push(Math.floor(from[0]), Math.floor(from[1]));
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    const j = jumps.get(i); if (j) push(Math.floor(j[0]), Math.floor(j[1]));
  }
  return seen;
}
const ok = (R, x, y) => R.world.map.walkable(x, y) && R.reach[R.world.map.tileIdx(x, y)];
function spotNear(R, x, y, r = 2) { for (let k = 0; k < 20; k++) { const p = R.world.map.randomNear(x, y, r); if (p && ok(R, p[0], p[1])) return p; } return ok(R, x, y) ? [x, y] : null; }

/** A place on this map for a step (fresh each time where it can be). */
function placeFor(R, s, q) {
  const g = R.gen, p = G.player, used = R.used, at = s.at || 'street';
  const fresh = (list) => { const L = list.filter((c) => c && ok(R, c[0], c[1]) && !used.some((u) => dist(u[0], u[1], c[0], c[1]) < 5)); return L.length ? L : list.filter(Boolean); };
  const far = (list) => { const L = fresh(list); if (!p || !L.length) return pick(L); L.sort((a, b) => dist(b[0], b[1], p.x, p.y) - dist(a[0], a[1], p.x, p.y)); return pick(L.slice(0, Math.max(1, L.length >> 2))); };
  let c = null;
  if (R.kind === 'city') {
    const dId = s.d || (q.kind === 'city' ? q.at : null) || q.at, k = DISTRICTS.findIndex((d) => d.id === dId), sp = (g.spots[k] || []), sq = g.squares[dId];
    if (at === 'square' && sq) c = spotNear(R, sq.x + rand(-2, 2), sq.y + rand(-2, 2), 3);
    else if (at === 'far') c = far(sp);
    else if (at === 'house') c = pick(fresh(g.buildings.filter((b) => b.door && g.district[R.world.map.tileIdx(...b.door)] === k).map((b) => b.door))) || pick(fresh(sp));
    else if (at === 'hub') { const h = g.hubHouse(dId); c = h ? [h.mx, h.my] : null; }
    else if (at === 'drawbridge') c = spotNear(R, g.gateW[0] + 3, g.gateW[1], 3);
    else if (at === 'gate') c = spotNear(R, g.castleGate[0] - 2, g.castleGate[1], 3);
    else if (at === 'sill') c = spotNear(R, g.sill[0], g.sill[1], 3);
    else if (at === 'marches' || at === 'notch' || at === 'span') { const P = g.pickets[{ marches: 0, notch: 1, span: 2 }[at]]; c = P && spotNear(R, P[0], P[1], 3); }
    if (!c) c = pick(fresh(sp.filter((v) => !sq || dist(v[0], v[1], sq.x, sq.y) < 26))) || pick(sp);
  } else {
    const rooms = g.rooms.filter((r) => ok(R, r.mx, r.my)), cs = rooms.map((r) => [r.mx, r.my]);
    if (at === 'start') c = g.start;
    else if (at === 'guard') c = g.guardian || g.exit;
    else if (at === 'far') c = far(cs);
    else c = pick(fresh(cs.filter((v) => dist(v[0], v[1], g.start[0], g.start[1]) > 6))) || pick(cs);
    if (c) c = spotNear(R, c[0], c[1], 2) || c;
  }
  if (!c) c = [p ? p.x : 0, p ? p.y : 0];
  used.push(c); return c;
}
function spawn(R, art, x, y, rank = 'normal', lv = 0) {
  if (!art) return null;
  const [sx, sy] = spotNear(R, x, y, 2.5) || [x, y];
  const m = makeMonster(R.world, art.arch, R.world.biome, Math.min(MAX_LEVEL + 2, R.lvl + lv), rank, sx, sy, 0, { art: art.id, swap: null });
  applyPhobosKit(m, art); if (art.title && rank !== 'normal') m.name = art.name;
  R.world.add(m); makeTalker(m); m.aggro = G.player;
  const prev = m.onDeath; m.onDeath = function (src) { if (prev) prev.call(this, src); onFoeKilled(this); };
  return m;
}
const foesFor = (R, q, s, re) => { const pool = poolOf(q, s), f = re ? pool.filter((a) => new RegExp(re).test(a.name)) : pool; return f.length ? f : pool; };
function npc(R, name, art, x, y, title, use) {
  const n = { name, title, enemyArt: art, x, y, reach: 1.8, flip: Math.random() < 0.5, talkText: '', talkT: 0, talkAge: 0, bubbleLines: 3, pqNpc: true, use,
    update(dt) { this.talkAge += dt; this.talkT = Math.max(0, this.talkT - dt); } };
  R.world.npcs.push(n); loadArtFor([art]); return n;
}

// ---------------------------------------------------------------------------------------------- the steps
// each: arm(R, q, s, st, L) sets up the step on this map; tick(R, q, s, st, L, dt); kill(R, q, s, st, L, m); goal → {x, y, reach, use}
const markAt = (R, L, x, y, o) => { const m = R.world.addHazard(new Mark(x, y, o)); L.marks.push(m); return m; };
const holdAt = (R, L, mk, dt, need) => { const p = G.player; if (!p || dist(p.x, p.y, mk.x, mk.y) > 1.3) { mk.held = Math.max(0, mk.held - dt * 2); return false; } mk.held += dt; return mk.held >= (need || 0.01); };
const STEPS = {
  visit: {
    arm(R, q, s, st, L) { for (let i = st.n || 0; i < (s.n || 1); i++) { const [x, y] = placeFor(R, s, q); const m = markAt(R, L, x, y, { label: s.mark || 'Inspect', hold: s.hold || 0.6 }); m.line = s.lines ? s.lines[i % s.lines.length] : s.line; } },
    tick(R, q, s, st, L, dt) { for (const m of L.marks) if (!m.dead && holdAt(R, L, m, dt, m.hold)) { m.dead = true; st.n = (st.n || 0) + 1; sfx('click'); if (m.line) floatText(m.x, m.y, 70, m.line, '#f0e0c0', 12, { life: 3 }); if (st.n >= (s.n || 1)) advance(R, q, st, L); } },
    goal: (R, q, s, st, L) => nearest(L.marks.filter((m) => !m.dead), 0.6),
  },
  cache: {
    arm(R, q, s, st, L) { for (let i = st.n || 0; i < (s.n || 1); i++) { const [x, y] = placeFor(R, s, q); markAt(R, L, x, y, { kind: 'cache', col: '#e0b050', label: s.item || 'a cache', hold: 0.8 }); } },
    tick(R, q, s, st, L, dt) { for (const m of L.marks) if (!m.dead && holdAt(R, L, m, dt, m.hold)) { m.dead = true; st.n = (st.n || 0) + 1; sfx('gold'); sparkle(m.x, m.y, 14, '#ffd860', 14, 0.5); floatText(m.x, m.y, 60, `Found ${s.item || 'a cache'}`, '#ffd860', 13, { life: 2 }); if (st.n >= (s.n || 1)) advance(R, q, st, L); } },
    goal: (R, q, s, st, L) => nearest(L.marks.filter((m) => !m.dead), 0.6),
  },
  slay: {
    arm(R, q, s, st, L) {
      const [x, y] = placeFor(R, s, q), pool = poolOf(q, s), art = PHOBOS_BY_ID[s.art] || pool.find((a) => a.name === s.foe) || pick(pool);
      loadArtFor([art.id]); const m = spawn(R, art, x, y, 'unique', 2); if (!m) return;
      m.name = s.name || art.name; m.title = s.title || ''; m.maxHp *= s.hp || 1.6; m.hp = m.maxHp; m.aggro = null; m.pqTarget = q.id; L.target = m;
      for (let i = 0; i < (s.guard || 0); i++) spawn(R, pick(pool), x, y, 'normal', 0);
    },
    kill(R, q, s, st, L, m) { if (m === L.target) advance(R, q, st, L); },
    goal: (R, q, s, st, L) => L.target && !L.target.dead ? { x: L.target.x, y: L.target.y, reach: 3 } : null,
  },
  lord: {
    arm(R, q, s, st, L) { if (R.S.wards.includes((s.d || q.at) + ':' + s.art)) return advance(R, q, st, L); L.lord = R.world.creatures.find((m) => m.wardLord === s.art && !m.dead); if (!L.lord) { const sq = R.gen.squares[s.d || q.at]; if (sq) { const art = PHOBOS_BY_ID[s.art]; loadArtFor([s.art]); L.lord = spawn(R, art, sq.x, sq.y, 'boss', 3); if (L.lord) { L.lord.maxHp *= 1.6; L.lord.hp = L.lord.maxHp; } } } },
    tick(R, q, s, st, L) { if ((L.lord && L.lord.dead) || R.S.wards.includes((s.d || q.at) + ':' + s.art)) advance(R, q, st, L); },
    goal: (R, q, s, st, L) => L.lord && !L.lord.dead ? { x: L.lord.x, y: L.lord.y, reach: 3 } : null,
  },
  boss: {
    arm(R, q, s, st, L) { if (R.world.boss?.dead) advance(R, q, st, L); },
    tick(R, q, s, st, L) { if (R.world.boss?.dead) advance(R, q, st, L); },
    goal: (R) => R.world.boss && !R.world.boss.dead ? { x: R.world.boss.x, y: R.world.boss.y, reach: 3 } : null,
  },
  kill: {
    arm(R, q, s, st, L) { L.seedT = 0; },
    tick(R, q, s, st, L, dt) { reseed(R, q, s, L, dt); },
    kill(R, q, s, st, L, m) { if (matches(m, q, s)) { st.n = (st.n || 0) + 1; floatText(m.x, m.y, 60, fill(s, L, st).replace(/^.*: /, '') || `${st.n}/${s.n}`, '#ffd0a0', 12, { life: 1.4 }); if (st.n >= s.n) advance(R, q, st, L); } },
    goal: (R, q, s, st, L) => nearestFoe(R, q, s),
  },
  collect: {
    arm(R, q, s, st, L) { L.seedT = 0; L.pity = 0; },
    tick(R, q, s, st, L, dt) { reseed(R, q, s, L, dt); for (const m of L.marks) if (!m.dead && G.player && dist(G.player.x, G.player.y, m.x, m.y) < 1.2) { m.dead = true; st.n = (st.n || 0) + 1; sfx('gold'); floatText(m.x, m.y, 60, `${s.item} (${st.n}/${s.n})`, '#ffd860', 12, { life: 1.6 }); if (st.n >= s.n) advance(R, q, st, L); } },
    kill(R, q, s, st, L, m) { if (!matches(m, q, s)) return; if (Math.random() < (s.rate || 0.5) + (L.pity++) * 0.15) { L.pity = 0; markAt(R, L, m.x, m.y, { kind: 'drop', col: '#ffd860', r: 0.5, label: s.item }); } },
    goal: (R, q, s, st, L) => nearest(L.marks.filter((m) => !m.dead), 0.5) || nearestFoe(R, q, s),
  },
  bell: {
    arm(R, q, s, st, L) {
      const ring = s.mode !== 'silence', pool = poolOf(q, s), rg = s.guard && pool.filter((a) => new RegExp(s.guard).test(a.name));
      for (let i = st.n || 0; i < (s.n || 1); i++) {
        const [x, y] = placeFor(R, s, q), b = markAt(R, L, x, y, { kind: 'bell', col: ring ? '#ffd860' : '#a0c0ff', label: ring ? `Ring the ${s.item || 'bell'}` : `Muffle the ${s.item || 'bell'}`, hold: ring ? 0.8 : 1.4 });
        if (!ring) { b.ringers = []; if (rg && rg.length) loadArtFor(rg.map((a) => a.id)); for (let k = 0; k < 2; k++) { const m = spawn(R, pick(rg && rg.length ? rg : pool), x, y); if (m) { m.aggro = null; b.ringers.push(m); } } }
      }
    },
    tick(R, q, s, st, L, dt) {
      for (const b of L.marks) {
        if (b.dead) continue;
        if (b.ringers && b.ringers.some((m) => !m.dead)) { b.held = 0; if ((b.ringT = (b.ringT || 0) - dt) <= 0) { b.ringT = 4; sfx('bell', 0.3); addEffect(new Ring(b.x, b.y, 0.2, 2, 0.8, '#ffd860', 2)); } continue; }
        if (!holdAt(R, L, b, dt, b.hold)) continue;
        b.dead = true; st.n = (st.n || 0) + 1;
        if (s.mode !== 'silence') { sfx('bell'); addEffect(new Ring(b.x, b.y, 0.2, 6, 1.2, '#ffd860', 4)); for (let k = 0; k < (s.answer || 0); k++) spawn(R, pick(poolOf(q, s)), b.x + rand(-6, 6), b.y + rand(-6, 6)); }
        else floatText(b.x, b.y, 60, 'Silenced', '#a0c0ff', 13, { life: 1.6 });
        if (st.n >= (s.n || 1)) advance(R, q, st, L);
      }
    },
    goal(R, q, s, st, L) { const b = nearest(L.marks.filter((m) => !m.dead), 0.6); if (!b) return null; const r = b.ringers?.find((m) => !m.dead); return r ? { x: r.x, y: r.y, reach: 3 } : b; },
  },
  clear: {
    arm(R, q, s, st, L) { const [x, y] = placeFor(R, s, q); L.zone = markAt(R, L, x, y, { kind: 'zone', col: '#ff8060', r: 2.2, label: 'Clear the square' }); L.go = false; L.cd = 0; },
    tick(R, q, s, st, L, dt) {
      const z = L.zone, p = G.player; if (!p) return;
      if (!L.go) { if ((L.cd -= dt) <= 0 && dist(p.x, p.y, z.x, z.y) < 4) { L.go = true; L.left = s.time; st.n = 0; L.wave = []; const pool = poolOf(q, s); for (let i = 0; i < s.n; i++) { const m = spawn(R, pick(pool), z.x + rand(-4, 4), z.y + rand(-4, 4)); if (m) { m.pqClear = q.id; L.wave.push(m); } } UI.centerMsg('CLEAR IT', `${s.n} foes, ${s.time} seconds`, 2); sfx('roar', 0.5); } return; }
      L.left -= dt; st.n = L.wave.filter((m) => m.dead).length;
      if (st.n >= s.n) return advance(R, q, st, L);
      if (L.left <= 0) { L.go = false; L.cd = 8; floatText(p.x, p.y, 70, 'Too slow. The patrols are back.', '#ff6040', 13, { life: 2 }); for (const m of L.wave) if (!m.dead) m.aggro = p; }
    },
    goal(R, q, s, st, L) { if (!L.go) return { x: L.zone.x, y: L.zone.y, reach: 2 }; const m = L.wave.find((w) => !w.dead); return m ? { x: m.x, y: m.y, reach: 2.5 } : null; },
  },
  survive: {
    arm(R, q, s, st, L) { const [x, y] = placeFor(R, s, q); L.zone = markAt(R, L, x, y, { kind: 'zone', col: '#ff4040', r: 2, label: 'Hold here' }); L.go = false; },
    tick(R, q, s, st, L, dt) {
      const p = G.player; if (!p) return;
      if (!L.go) { if (dist(p.x, p.y, L.zone.x, L.zone.y) < 3) { L.go = true; L.left = s.time; L.waveT = 0; L.waves = 0; UI.centerMsg('AMBUSH', `Survive ${s.time} seconds`, 2); sfx('roar', 0.6); } return; }
      L.left -= dt;
      if ((L.waveT -= dt) <= 0 && L.waves < (s.waves || 4)) { L.waves++; L.waveT = s.time / (s.waves || 4); const pool = poolOf(q, s); for (let i = 0; i < 3; i++) { const a = rand(0, TAU); spawn(R, pick(pool), p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7); } }
      if (L.left <= 0) advance(R, q, st, L);
    },
    goal: (R, q, s, st, L) => (L.go ? null : { x: L.zone.x, y: L.zone.y, reach: 1.5 }),
  },
  rescue: {
    arm(R, q, s, st, L) {
      const [x, y] = placeFor(R, s, q); const guards = foesFor(R, q, s, s.gm);
      L.guards = []; for (let i = 0; i < (s.guard || 0); i++) { const m = spawn(R, pick(guards), x, y); if (m) { m.aggro = null; L.guards.push(m); } }
      L.who = npc(R, s.name, s.art, x, y, s.title, () => { if (L.guards.some((m) => !m.dead)) return say(L.who, 'Not with them watching!', 2); if (!L.free) { L.free = true; say(L.who, s.line || 'Lead on.', 3.4); sfx('click'); } });
      L.dest = destFor(R, q, s);
      if (L.dest) markAt(R, L, L.dest[0], L.dest[1], { kind: 'dest', col: '#80ff80', label: `Bring ${s.name} here`, hidden: true });
    },
    tick(R, q, s, st, L, dt) {
      const n = L.who, p = G.player; if (!n || !p) return;
      if (!L.free && G.autoplayOn && !L.guards.some((m) => !m.dead) && dist(p.x, p.y, n.x, n.y) < 2.5) n.use();
      if (!L.free) return;
      if (L.marks[0]) L.marks[0].hidden = false;
      const d = dist(p.x, p.y, n.x, n.y);
      if (d > 15) { const c = spotNear(R, p.x, p.y, 1.5); if (c) [n.x, n.y] = c; n.path = null; }
      else if (d > 1.8) { if (!n.path || (L.pathT -= dt) <= 0) { n.path = R.world.map.findPath(n.x, n.y, p.x, p.y, 2500, 0.25); L.pathT = 0.8; } if (n.path && n.path.length) { const [tx, ty] = n.path[0], dx = tx - n.x, dy = ty - n.y, l = Math.hypot(dx, dy); if (l < 0.15) n.path.shift(); else { const k = Math.min(l, 4.2 * dt); n.x += dx / l * k; n.y += dy / l * k; n.flip = dx - dy < 0; n.walking = true; } } }
      if (!L.dest || dist(n.x, n.y, L.dest[0], L.dest[1]) < 3) { say(n, 'Home. Or near enough.', 3); sfx('gold'); n.leaveT = 8; L.who = null; setTimeout(() => { const i = R.world.npcs.indexOf(n); if (i >= 0) R.world.npcs.splice(i, 1); }, 8000); advance(R, q, st, L); }
    },
    goal(R, q, s, st, L) { const n = L.who; if (!n) return null; if (!L.free) { const g = L.guards.find((m) => !m.dead); return g ? { x: g.x, y: g.y, reach: 3 } : { x: n.x, y: n.y, reach: 1.6, use: n.use }; } return L.dest ? { x: L.dest[0], y: L.dest[1], reach: 1.5 } : null; },
  },
  deliver: {
    arm(R, q, s, st, L) {
      if (s.from !== 'carry' && s.from !== 'giver' && !st.c) { const src = whoAt(R, q, s.from); if (src) L.src = src; else if (R.kind === 'city' || !s.from) st.c = 1; }
      if (s.from === 'carry' || s.from === 'giver') st.c = 1;
      L.dst = whoAt(R, q, s.to);
    },
    tick(R, q, s, st, L) { if (L.src && !st.c) hookTalk(L, L.src, () => { st.c = 1; say(L.src, `Take ${s.item}. Mind it.`, 3); sfx('click'); }); if (L.dst && st.c) hookTalk(L, L.dst, () => { say(L.dst, s.line || 'Received.', 4); sfx('gold'); st.c = 0; advance(R, q, st, L); }); },
    goal(R, q, s, st, L) { const n = st.c ? L.dst : L.src; return n ? { x: n.x, y: n.y, reach: 1.6, use: n.use } : null; },
  },
  talk: {
    arm(R, q, s, st, L) { if (s.who) L.who = R.world.npcs.find((n) => n.name === s.who); else { const [x, y] = placeFor(R, s, q); L.who = npc(R, s.name, s.art, x, y, s.title || ''); L.made = true; } },
    tick(R, q, s, st, L) { if (L.who) hookTalk(L, L.who, () => { say(L.who, s.line || '...', 4.5); sfx('click'); advance(R, q, st, L); }); },
    goal: (R, q, s, st, L) => (L.who ? { x: L.who.x, y: L.who.y, reach: 1.6, use: L.who.use } : null),
  },
  choice: {
    arm() {}, tick(R, q, s, st, L) { if (G.autoplayOn) chooseQuest(R.world, q.id, 0); },
    goal: (R, q) => { const n = R.givers[q.id]; return n ? { x: n.x, y: n.y, reach: 1.6, use: n.use } : null; },
  },
};
function hookTalk(L, n, fn) { if (n._pqHook === L) return; n._pqHook = L; const prev = n._pqBase || n.use; n._pqBase = prev; n.use = () => { if (n._pqHook === L && !L.over) { n._pqHook = null; n.use = n._pqBase; n._pqBase = null; fn(); } else if (prev) prev(); }; }
function matches(m, q, s) { const a = PHOBOS_BY_ID[m.art || m.look?.art]; const nm = a?.name || m.name || ''; return !s.match || new RegExp(s.match).test(nm); }
function nearestFoe(R, q, s) { const p = G.player; let b = null, bd = 1e9; for (const m of R.world.creatures) if (m.team === 'enemy' && !m.dead && !m.clutter && matches(m, q, s)) { const d = dist(m.x, m.y, p.x, p.y); if (d < bd) { bd = d; b = m; } } return b ? { x: b.x, y: b.y, reach: 3 } : null; }
function reseed(R, q, s, L, dt) {   // keep a few of the right foes about
  if ((L.seedT -= dt) > 0) return; L.seedT = 12; const p = G.player; if (!p) return;
  const live = R.world.creatures.filter((m) => m.team === 'enemy' && !m.dead && matches(m, q, s) && dist(m.x, m.y, p.x, p.y) < 40).length;
  if (live >= 3) return; const pool = foesFor(R, q, s, s.match); loadArtFor(pool.map((a) => a.id));
  const sp = placeFor(R, { at: 'street' }, q); R.used.pop();
  for (let i = 0; i < 3; i++) { const m = spawn(R, pick(pool), sp[0], sp[1]); if (m) m.aggro = null; }
}
const nearest = (list, reach) => { const p = G.player; if (!p || !list.length) return null; const m = list.reduce((a, b) => (dist(b.x, b.y, p.x, p.y) < dist(a.x, a.y, p.x, p.y) ? b : a)); return { x: m.x, y: m.y, reach }; };
/** Who a delivery or rescue goes to: 'giver', a hub ('pennyless'...), 'hub:x', a folk name, 'start', 'square'. */
function whoAt(R, q, to) {
  if (!to) return null;
  if (to === 'giver') return R.givers[q.id] || null;
  const hub = to.replace(/^hub:/, '');
  if (HUBS[hub]) return R.world.npcs.find((n) => n.hub === hub) || null;
  return R.world.npcs.find((n) => n.name === to || n.name.startsWith(to + ' (')) || null;
}
function destFor(R, q, s) {
  if (s.to === 'start') return R.gen.start; if (s.to === 'square') return placeFor(R, { at: 'square' }, q);
  const n = whoAt(R, q, s.to); return n ? [n.x, n.y] : R.gen.start;
}

// ---------------------------------------------------------------------------------------------- flow
function stepsOf(q, st) {
  const i = q.steps.findIndex((s) => s.t === 'choice'); if (i < 0 || st.b == null) return q.steps;
  return [...q.steps.slice(0, i + 1), ...(q.steps[i].opts[st.b].steps || []), ...q.steps.slice(i + 1)];
}
const here = (R, q, s) => {
  if (R.kind === 'city') return !!s.d || (q.kind === 'city' && !s.w);
  if (s.d) return false; const w = s.w || q.at; if (w !== R.wing.id) return false;
  return R.off >= (s.f || 1) && (R.off < 10 || s.t === 'boss');
};
function arm(R, q) {
  disarm(R, q); const st = R.S.quests[q.id]; if (!st || st.s !== 'active') return;
  const s = stepsOf(q, st)[st.i]; if (!s || !here(R, q, s)) return;
  const L = R.live[q.id] = { marks: [], s, i: st.i }; STEPS[s.t].arm(R, q, s, st, L);
}
function disarm(R, q) { const L = R.live[q.id]; if (!L) return; L.over = true; for (const m of L.marks) m.dead = true; if (L.made && L.who) { const i = R.world.npcs.indexOf(L.who); if (i >= 0) R.world.npcs.splice(i, 1); } delete R.live[q.id]; }
function advance(R, q, st, L) {
  if (L.over) return; L.over = true; for (const m of L.marks) m.dead = true;
  st.i++; st.n = 0; const steps = stepsOf(q, st);
  if (st.i >= steps.length) { st.s = 'ready'; UI.log(`<b>${escapeHtml(q.name)}</b>: done. Return to ${escapeHtml(q.giver.name)}.`, '#ffd860'); sfx('levelup', 0.5); syncGivers(R); }
  else { UI.log(`<b>${escapeHtml(q.name)}</b>: ${escapeHtml(fill(steps[st.i], null, st))}`, '#e0d0b0'); if (steps[st.i].t === 'choice') syncGivers(R); }
  delete R.live[q.id]; arm(R, q); G.game?.autosave?.();
}
function available(R, q) {
  const S = R.S.quests; if (S[q.id]) return false;
  if (q.after && S[q.after]?.s !== 'done') return false;
  if (R.kind === 'city') return q.kind === 'city';
  return q.at === R.wing.id && R.off >= (q.fl || 1) && R.off < 10;
}
function rewardOf(q, st) {
  const r = { ...q.reward }, o = st.b != null ? q.steps.find((s) => s.t === 'choice')?.opts[st.b] : null;
  if (o?.reward) for (const k of ['g', 'x', 'skill']) r[k] = (r[k] || 0) + (o.reward[k] || 0);
  if (o?.reward?.item != null) r.item = Math.max(r.item ?? -1, o.reward.item);
  return { r, done: o?.done || q.done };
}
export function acceptQuest(world, id) { const R = world._pq, q = PQ_BY_ID[id]; if (!R || !q) return false; R.S.quests[id] = { s: 'active', i: 0, n: 0 }; sfx('click'); UI.log(`Quest taken: <b>${escapeHtml(q.name)}</b>.`, '#ffd860'); arm(R, q); syncGivers(R); return true; }
export function chooseQuest(world, id, k) {
  const R = world._pq, q = PQ_BY_ID[id], st = R?.S.quests[id]; if (!st || st.s !== 'active') return false;
  const s = stepsOf(q, st)[st.i]; if (s?.t !== 'choice') return false;
  st.b = k; const o = s.opts[k]; const n = R.givers[id]; if (n && o.line) say(n, o.line, 4);
  const L = R.live[id] || { marks: [] }; R.live[id] = L; advance(R, q, st, L); return true;
}
export function turnInQuest(world, id) {
  const R = world._pq, q = PQ_BY_ID[id], st = R?.S.quests[id]; if (!st || st.s !== 'ready') return false;
  const { r, done } = rewardOf(q, st), c = G.char, p = G.player, lvl = c.level || 1;
  const gold = Math.round((r.g || 0) * 60 * lvl), xp = Math.round((r.x || 0) * 6 * lvl * lvl);
  c.gold = (c.gold || 0) + gold; if (p?.gainXp) p.gainXp(xp, true);
  if (r.skill) c.skillPoints = (c.skillPoints || 0) + r.skill;
  let it = '';
  if (r.item != null && p) { const il = lvl + 2, item = rollItem(il, { rarity: rarityAt(il, r.item) }); R.world.addLoot(new GroundItem(p.x + 0.6, p.y + 0.4, 'item', { item })); it = ', and something worth keeping'; }
  st.s = 'done'; const n = R.givers[id]; if (n) say(n, done, 5);
  sfx('gold'); if (p) floatText(p.x, p.y, 70, `+${gold} gold`, '#ffd860', 14, { life: 1.8 });
  UI.log(`<b>${escapeHtml(q.name)}</b> is done: <b style="color:#ffd860">${gold} gold</b>, ${xp} experience${r.skill ? `, <b>+${r.skill} skill point</b>` : ''}${it}.`, '#ffd860');
  syncGivers(R); for (const o of PHOBOS_QUESTS) if (o.after === id) syncGivers(R); G.game?.autosave?.(); UI.refresh?.(); return true;
}
export const questStep = (world, id) => { const R = world._pq, q = PQ_BY_ID[id], st = R?.S.quests[id]; return st ? { ...st, step: stepsOf(q, st)[st.i] || null, live: !!R.live[id] } : null; };

function talkTo(R, q) {
  const st = R.S.quests[q.id], n = R.givers[q.id], auto = G.autoplayOn;
  if (!st) {
    if (auto) return acceptQuest(R.world, q.id);
    return UI.dialog({ title: escapeHtml(q.giver.name) + (q.giver.title ? ' — ' + escapeHtml(q.giver.title) : ''), html: `<p>${escapeHtml(q.offer)}</p><p class="dim"><b>${escapeHtml(q.name)}</b>: ${escapeHtml(q.text)}</p>`,
      buttons: [{ label: "I'll do it", fn: () => { acceptQuest(R.world, q.id); const s = R.S.quests[q.id] && stepsOf(q, R.S.quests[q.id])[0]; if (s?.t === 'choice') setTimeout(() => talkTo(R, q), 50); } }, { label: 'Not now' }] });
  }
  if (st.s === 'ready') return turnInQuest(R.world, q.id);
  const s = stepsOf(q, st)[st.i];
  if (s?.t === 'choice') {
    if (auto) return chooseQuest(R.world, q.id, 0);
    return UI.dialog({ title: escapeHtml(q.name), html: `<p>${escapeHtml(s.prompt)}</p>`, buttons: s.opts.map((o, k) => ({ label: o.label, fn: () => chooseQuest(R.world, q.id, k) })) });
  }
  if (n) say(n, `${q.progress} (${fill(s, R.live[q.id], st)})`.slice(0, 200), 3.6);
}

// ---------------------------------------------------------------------------------------------- givers
function giverQuests(R, n) { return PHOBOS_QUESTS.filter((q) => R.givers[q.id] === n); }
function giverMark(R, n) {
  let mark = null;
  for (const q of giverQuests(R, n)) { const st = R.S.quests[q.id]; if (!st) { if (available(R, q)) return 'offer'; continue; } if (st.s === 'ready' || (st.s === 'active' && stepsOf(q, st)[st.i]?.t === 'choice')) return 'offer'; if (st.s === 'active') mark = 'active'; }
  return mark;
}
function giverUse(R, n) {
  const qs = giverQuests(R, n), S = R.S.quests;
  const q = qs.find((q) => S[q.id]?.s === 'ready') || qs.find((q) => S[q.id]?.s === 'active' && stepsOf(q, S[q.id])[S[q.id].i]?.t === 'choice') || qs.find((q) => available(R, q)) || qs.find((q) => S[q.id]?.s === 'active');
  if (q) { talkTo(R, q); return true; } return false;
}
function hookGiver(R, n) {
  if (n._pqGiver) return; n._pqGiver = true; n.turns = false;
  const prevUse = n.use, prevB = Object.getOwnPropertyDescriptor(n, 'bounty');
  const prevBounty = prevB ? (prevB.get ? prevB.get.call(n) : prevB.value) : null;
  n.use = () => { const e = n.errand; if (e && e.state === 'active' && e.got >= e.need && prevUse) return prevUse();   // a finished street errand is paid first
    if (!giverUse(R, n) && prevUse) prevUse(); };
  Object.defineProperty(n, 'bounty', { configurable: true, enumerable: true, get: () => { const m = giverMark(R, n); if (m) return { state: m }; return prevBounty || null; }, set() {} });
}
function syncGivers(R) {
  for (const q of PHOBOS_QUESTS) {
    if (R.givers[q.id] || q.kind !== R.kind) continue;
    const st = R.S.quests[q.id];
    if (R.kind === 'castle') { const want = available(R, q) || (st && (st.s === 'ready' || (st.s === 'active' && (q.at === R.wing.id || stepsOf(q, st)[st.i]?.t === 'choice')))); if (!want) continue; }
    let n = R.world.npcs.find((o) => o.name === q.giver.name || (q.giver.name && o.name.startsWith(q.giver.name + ' (')));
    if (!n) {
      const [x, y] = R.kind === 'city' ? placeFor(R, { at: q.giver.place || 'square' }, q) : spotNear(R, R.gen.start[0] + rand(-2.5, 2.5), R.gen.start[1] + rand(-2.5, 2.5), 2.5) || R.gen.start;
      n = npc(R, q.giver.name, q.giver.art, x, y, q.giver.title || '');
    }
    R.givers[q.id] = n; hookGiver(R, n);
  }
}

// ---------------------------------------------------------------------------------------------- the run
function setup(world, gen, S, kind, extra) {
  S.quests ||= {};
  const R = { world, gen, S, kind, live: {}, used: [], givers: {}, ...extra };
  R.reach = reachFlood(world, gen.start, gen); world._pq = R;
  syncGivers(R);
  for (const q of PHOBOS_QUESTS) arm(R, q);
  const run = {
    update(dt) {
      for (const q of PHOBOS_QUESTS) { const L = R.live[q.id], st = S.quests[q.id]; if (L && st && !L.over) { const s = L.s; STEPS[s.t].tick?.(R, q, s, st, L, dt); } }
      if ((R.syncT = (R.syncT || 0) - dt) <= 0) { R.syncT = 2; syncGivers(R); for (const q of PHOBOS_QUESTS) if (S.quests[q.id]?.s === 'active' && !R.live[q.id]) arm(R, q); }
    },
    questHtml(step) {
      const all = PHOBOS_QUESTS.filter((q) => q.kind === kind), done = all.filter((q) => S.quests[q.id]?.s === 'done').length;
      let h = `<div class="q-title">${kind === 'city' ? "Phobos's folk" : "The castle's household"} <span class="dim">(${done}/${all.length} quests done)</span></div>`;
      const act = PHOBOS_QUESTS.filter((q) => ['active', 'ready'].includes(S.quests[q.id]?.s)).slice(0, 10);
      for (const q of act) { const st = S.quests[q.id], s = stepsOf(q, st)[st.i]; h += step(st.s === 'ready', `<b>${escapeHtml(q.name)}</b> <span class="dim">(${escapeHtml(q.where)})</span>: ${st.s === 'ready' ? `return to ${escapeHtml(q.giver.name)}.` : escapeHtml(fill(s, R.live[q.id], st))}${st.s === 'active' && !R.live[q.id] && s?.t !== 'choice' ? ' <span class="dim">(not here)</span>' : ''}`); }
      const offers = PHOBOS_QUESTS.filter((q) => available(R, q)).length;
      if (offers) h += step(false, `<span class="dim">${offers} more ${offers === 1 ? 'asks' : 'ask'} for help here (a gold <b>!</b> over their heads).</span>`);
      return h;
    },
  };
  R.run = run; return run;
}
/** The city's quests: call once in createCityRun after phobosTalk. ctx is unused (kept for the call site). */
export function setupCityQuests(world, gen, S, ctx = {}) { void ctx; return setup(world, gen, S, 'city', { lvl: depthLevel(Math.round(cityDepth(DISTRICTS[5]?.lv ?? 5))) + 1 }); }
/** A castle floor's quests: call once in createCastleRun after the talkers. */
export function setupCastleQuests(world, gen, S, floor, wing) {
  return setup(world, gen, S, 'castle', { floor, wing, off: ((floor - 1) % 10) + 1, lvl: Math.min(MAX_LEVEL - 2, depthLevel(castleDepth(floor))) });
}
/** A foe died (spawned quest foes report themselves; call it from a death hook for the rest). */
export function onFoeKilled(m) {
  const R = G.world?._pq || m?.world?._pq; if (!R || !m || m._pqDone || m.clutter) return; m._pqDone = true;
  for (const q of PHOBOS_QUESTS) { const L = R.live[q.id], st = R.S.quests[q.id]; if (L && st && !L.over) STEPS[L.s.t].kill?.(R, q, L.s, st, L, m); }
}
/** Auto-play: the nearest thing to do for a quest here (a giver with a "!", or a live step's goal), or null. */
export function questObjective(world) {
  const R = world._pq, p = G.player; if (!R || !p) return null;
  // the dead the death hook missed (killed before the hook, or by something that skips onDeath)
  for (const m of world.creatures) if (m.dead && !m._pqDone && m.team === 'enemy') onFoeKilled(m);
  const cands = [];
  for (const n of new Set(Object.values(R.givers))) if (giverMark(R, n) === 'offer') cands.push({ x: n.x, y: n.y, reach: 1.6, use: n.use, key: 'g:' + n.name });
  for (const q of PHOBOS_QUESTS) { const L = R.live[q.id], st = R.S.quests[q.id]; if (!L || !st || L.over) continue; const g = STEPS[L.s.t].goal?.(R, q, L.s, st, L); if (g) cands.push({ ...g, key: q.id + ':' + st.i }); }
  const now = world.time || 0; R.skip ||= {};
  const live = cands.filter((c) => !(R.skip[c.key] > now) && R.reach[world.map.tileIdx(c.x, c.y)] !== 0);
  if (!live.length) return null;
  live.sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y));
  const o = live[0];
  if (R.objKey !== o.key) { R.objKey = o.key; R.objT = 0; } else if ((R.objT += 1 / 60) > 90) { R.skip[o.key] = now + 120; R.objKey = null; }
  return { x: o.x, y: o.y, reach: o.reach || 1.4, use: o.use };
}
export { STEPS as QUEST_STEPS };
