// TESSARIEL'S KEEP's people (docs/TESSARIELS_KEEP.md): your other heroes (every other class's hero on this browser,
// save.js heroesByClass) walking the hall and the balcony in the gear they last wore, talking to you and to each other
// with their own numbers; the Castellan on her dais; and the keep's own folk (painted townsfolk) at their posts.
// Agents are world.npcs entries with update(dt); render.js draws a hero through drawKeepHero, the rest as townsfolk.
import { G } from '../state.js';
import { rand, randi, pick, chance, TAU, clamp } from '../core/util.js';
import { HW, HH } from '../core/view.js';
import { savedGearPreview } from '../core/gearart.js';
import { CLASSES } from '../data/classes.js';
import { heroesByClass } from './save.js';
import { drawTownSpeech } from './townspeech.js';
import { drawRim, RIM } from './creature.js';
import { GREETS, GREETS_WHEN, MUSINGS, CHATS, CLASS_LINES, CASTELLAN_LINES, CASTELLAN_OWED, CASTELLAN_WELCOME, CASTELLAN_NEW, FOLK_LINES } from '../data/keeplines.js';
import { UI } from '../ui/ui.js';
import { CASTELLAN, KEEP_FOLK } from '../data/keep.js';
import { keepSpots, TK, CX, CY } from '../world/tkeep.js';
import { keepState, castellanMark, giverMark, sagaList, takeSaga, progressOf, sagaLock, chapterHint } from './keep.js';
import { SAGA_BY_ID, sagaReward, EMBER_COLOR } from '../data/keep.js';
import { escapeHtml, fmtInt } from '../core/util.js';

const SPEED = 1.35, TALK = 3.6;
/** Fill a line's {fields} for speaker a (a hero record), listener b (or none), and the hero you play. */
function fill(line, a, b) {
  const c = G.char || {}, cls = (id) => CLASSES[id]?.name || id;
  return line.replace(/\{(\w+)\}/g, (m, k) => ({
    me: a?.name, mcls: cls(a?.cls), lvl: a?.lvl, depth: a?.deep, kills: (a?.kills || 0).toLocaleString('en-US'),
    you: c.name || 'hero', ycls: cls(c.classId), ylvl: c.level || 1, ydepth: c.deepest || 0,
    other: b?.name, ocls: cls(b?.cls), olvl: b?.lvl, odepth: b?.deep,
  }[k] ?? m));
}
/** The next of `list` for speaker n: every line once, in a shuffled order, before any repeats. */
function next(n, key, list) {
  const bags = (n.bags ||= {});
  let b = bags[key];
  if (!b || !b.length) { b = bags[key] = list.map((_, i) => i); for (let i = b.length - 1; i > 0; i--) { const j = randi(0, i); [b[i], b[j]] = [b[j], b[i]]; } }
  return list[b.pop()];
}
/** A greeting from companion g: now and then one that fits what is true (rewards waiting, Kindled, who is deeper). */
function greeting(g) {
  const c = G.char, k = keepState(c);
  if (chance(0.45)) { const fit = GREETS_WHEN.filter(([test]) => { try { return test(c, k, g); } catch (e) { return false; } }).map((q) => q[1]); if (fit.length) return next(g, 'when', fit); }
  return chance(0.3) && CLASS_LINES[g.cls] ? next(g, 'cls', CLASS_LINES[g.cls]) : next(g, 'greet', GREETS);
}
export function say(n, text, t = TALK, lines = 2) { n.talkText = text; n.talkT = t; n.talkAge = 0; n.bubbleLines = lines; }

/** Your other heroes as companion records (not the one you play), newest first. */
export function companionsOf(c = G.char) {
  let all = {};
  try { all = heroesByClass(); } catch (e) { all = {}; }
  return Object.values(all).filter((h) => h && h.classId !== c?.classId && h.id !== c?.id)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .map((h) => ({ cls: h.classId, name: h.name, lvl: h.level || 1, deep: h.deepest || 0, kills: h.kills || 0, save: h }));
}

// ------------------------------------------------------------------ agents
function walkTo(world, n, x, y) {
  const p = world.map.findPath(n.x, n.y, x, y, 4000);
  n.path = p && p.length ? p : null; n.goal = [x, y];
  return !!n.path;
}
function step(world, n, dt) {
  if (!n.path) return false;
  const [tx, ty] = n.path[0], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), s = (n.speed || SPEED) * dt;
  if (d <= s) { n.x = tx; n.y = ty; n.path.shift(); if (!n.path.length) n.path = null; }
  else { n.x += (dx / d) * s; n.y += (dy / d) * s; }
  if (Math.abs(dx - dy) > 0.01) n.flip = dx - dy < 0;   // screen x = (x - y): facing left when it shrinks
  n.walking = !!n.path; n.animT += dt;
  return true;
}
const face = (n, o) => { const d = (o.x - o.y) - (n.x - n.y); if (Math.abs(d) > 0.05) n.flip = d < 0; };
const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;

/** Places a companion likes to stand, with what they'd muse about there. */
function interestSpots(A) {
  const out = [];
  const [fx, fy] = A.flame;
  for (const a of [0.6, 2.2, 3.8, 5.4]) out.push({ x: fx + Math.cos(a) * 2.6, y: fy + Math.sin(a) * 2.6, about: 'flame', look: [fx, fy] });
  for (const p of A.pedestals) out.push({ x: p.face === 'e' ? p.x + 1.1 : p.face === 'w' ? p.x - 1.1 : p.face === 's' ? p.x : p.x + 1.1, y: p.face === 's' ? p.y + 1.1 : p.y, about: 'trophy', look: [p.x, p.y], ped: p });
  for (const p of A.plinths) out.push({ x: p.x + 1.8, y: p.y + 1.8, about: 'dragon', look: [p.x, p.y], plinth: p });
  for (const w of A.windows) out.push({ x: w.axis === 'x' ? w.a : w.c + 1.4, y: w.axis === 'x' ? w.c + 1.4 : w.a, about: 'window', look: w.axis === 'x' ? [w.a, w.c] : [w.c, w.a] });
  out.push({ x: A.chronicle[0], y: A.chronicle[1] + 1.1, about: 'chronicle', look: A.chronicle });
  for (let k = 0; k < 6; k++) out.push({ x: TK.FR + 1.5, y: TK.F0 + 3 + k * 4, about: 'balcony', look: [CX, TK.F0 + 3 + k * 4] });
  return out;
}

/**
 * Bring the keep to life in `world` (world/keepworld.js): the Castellan, the keep folk and your companions.
 * Returns the director; world.keepFolk.update(dt) runs it (game/keepgame.js).
 */
export function startKeepFolk(world, A) {
  const L = world.layout, spots = keepSpots(L), interest = interestSpots(A).filter((s) => world.map.walkable(s.x, s.y));
  const d = { agents: [], heroes: [], chatT: rand(2, 4), greetT: 0, world };
  const base = (o) => ({ x: 0, y: 0, flip: false, animT: rand(0, 5), idleSeed: randi(0, 9), talkText: '', talkT: 0, talkAge: 0, emotion: null, emotionT: 0, iconT: 0, iconAge: 0, reach: 1.6, ...o });
  const upd = (n) => (dt) => { n.talkT = Math.max(0, n.talkT - dt); n.talkAge += dt; n.emotionT = Math.max(0, n.emotionT - dt); n.iconT = Math.max(0, (n.iconT || 0) - dt); };

  // the Castellan on her dais
  const cas = base({ keepCastellan: true, name: CASTELLAN.name, title: CASTELLAN.title, townsfolkSpriteId: CASTELLAN.sprite, x: A.castellan[0], y: A.castellan[1] + 0.2, flip: false, aura: 0.6, auraCol: '#c8f060', idleH: 172 });
  cas.update = (dt) => {
    upd(cas)(dt); cas.animT += dt;
    cas.lineT = (cas.lineT ?? rand(8, 14)) - dt;
    const p = world.player;
    if (cas.lineT <= 0 && p && near(cas, p, 7)) {
      const mark = castellanMark();
      say(cas, fill(!cas.welcomed ? pick(CASTELLAN_WELCOME) : mark === 'claim' ? next(cas, 'owed', CASTELLAN_OWED) : mark === 'new' && chance(0.6) ? next(cas, 'new', CASTELLAN_NEW) : next(cas, 'line', CASTELLAN_LINES), null, null), 4.2, 3);
      cas.welcomed = true;
      cas.lineT = rand(16, 26);
    }
    if (p) face(cas, p);
  };
  world.npcs.push(cas); d.castellan = cas;

  // the keep's folk at their posts (the friar by the Flame, a knight on the balcony, the priest at the Chronicle...)
  const post = { flame: [A.flame[0] - 2.7, A.flame[1] + 1.2], hall: [A.columns[1][0] - 1.6, A.columns[1][1] + 2], balcony: [TK.FR + 1.5, CY],
    chronicle: [A.chronicle[0] + 1.3, A.chronicle[1] + 0.6], gate: [A.townPortal[0] + 3.2, A.townPortal[1] - 1.2],
    envoy: [A.waygate[0] + 2.4, A.waygate[1] - 2.2], arms: [TK.F1 - 2.2, TK.F0 + 14.4] };
  for (const [sprite, name, role, where, sagas] of KEEP_FOLK) {
    const [x, y] = post[where] || A.start;
    const f = base({ keepFolk: true, name, role, sagas, townsfolkSpriteId: sprite, x, y, home: [x, y], idleH: 172 });
    f.use = () => { face(f, world.player || f); say(f, next(f, 'line', FOLK_LINES[name] || CASTELLAN_LINES), TALK + 0.6, 3); giverTalk(f); };   // a word, and their Sagas
    f.update = (dt) => {
      upd(f)(dt);
      if (step(world, f, dt)) return;
      f.walking = false; f.animT += dt;
      f.waitT = (f.waitT ?? rand(6, 14)) - dt;
      if (f.waitT <= 0) {   // a short round from their post and back
        f.waitT = rand(10, 22);
        const away = Math.hypot(f.x - f.home[0], f.y - f.home[1]) > 0.5;
        if (away) walkTo(world, f, ...f.home);
        else { const [rx, ry] = world.map.randomNear(f.home[0], f.home[1], 3) || f.home; walkTo(world, f, rx, ry); }
      }
    };
    world.npcs.push(f); d.agents.push(f);
  }

  // your other heroes
  const away = new Set((keepState()?.exp || []).map((e) => e.cls));
  const list = companionsOf().filter((h) => !away.has(h.cls)).slice(0, 12);
  list.forEach((h, k) => {
    const s = spots[(k * 97 + 13) % spots.length] || A.start;
    const n = base({ keepHero: true, ...h, plate: `${CLASSES[h.cls]?.name || h.cls} ${h.lvl}`, x: s[0], y: s[1], img: null, state: 'idle', waitT: rand(1, 6), speed: SPEED * rand(0.9, 1.1) });
    void savedGearPreview(h.cls, h.save.equip || {}).then((img) => { n.img = img || null; }).catch(() => {});
    n.update = (dt) => tickHero(d, n, dt);
    n.use = () => heroCard(n);
    world.npcs.push(n); d.heroes.push(n);
  });
  d.update = (dt) => director(d, dt, interest);
  world.keepFolk = d;
  return d;
}

function tickHero(d, n, dt) {
  const w = d.world;
  n.talkT = Math.max(0, n.talkT - dt); n.talkAge += dt;
  if (n.state === 'walk') {
    if (!step(w, n, dt)) { n.state = 'idle'; n.walking = false; n.waitT = rand(3, 8); if (n.at) { if (n.at.look) face(n, { x: n.at.look[0], y: n.at.look[1] }); if (chance(0.55)) say(n, fill(next(n, n.at.about, MUSINGS[n.at.about] || MUSINGS.hall), n)); } }
    return;
  }
  n.walking = false; n.animT += dt * 0.6;
  if (n.state === 'chat') { if (n.partner) face(n, n.partner); return; }
  n.waitT -= dt;
  if (n.waitT <= 0) n.state = 'pick';
}

/** Send heroes about, start conversations, greet the hero you play. */
function director(d, dt, interest) {
  const w = d.world, p = w.player, H = d.heroes;
  // wanderers pick somewhere to go: a place of interest, now and then just a walk round the hall or the balcony
  for (const n of H) if (n.state === 'pick') {
    const s = chance(0.7) && interest.length ? pick(interest) : null;
    const [x, y] = s ? [s.x, s.y] : (() => { const q = pick(keepSpots(w.layout)); return [q[0], q[1]]; })();
    n.at = s; n.state = walkTo(w, n, x, y) ? 'walk' : 'idle'; n.waitT = rand(2, 5);
  }
  // a conversation: two idle heroes, the second walks over, then they take turns
  d.chatT -= dt;
  const free = H.filter((n) => n.state === 'idle' && !n.partner);
  if (d.chatT <= 0 && free.length >= 2 && !d.chat) {
    const a = pick(free), b = free.filter((n) => n !== a).sort((u, v) => Math.hypot(u.x - a.x, u.y - a.y) - Math.hypot(v.x - a.x, v.y - a.y))[0];
    const [sx, sy] = w.map.randomNear(a.x, a.y, 1.4) || [a.x + 1, a.y];
    if (b && walkTo(w, b, sx, sy)) { b.state = 'walk'; b.at = null; a.state = 'chat'; b.partner = a; a.partner = b; d.chat = { a, b, script: next(d, 'chat', CHATS), k: 0, t: 0, ready: false }; }
    d.chatT = rand(7, 14);
  }
  if (d.chat) {
    const C = d.chat;
    if (!C.ready) {
      if (C.b.state === 'walk' && C.b.path) { C.t += dt; if (C.t > 12) endChat(d); }
      else { C.ready = true; C.b.state = 'chat'; C.t = 0.4; }
    } else {
      C.t -= dt;
      if (C.t <= 0) {
        if (C.k >= C.script.length) endChat(d);
        else {
          const [who, line] = C.script[C.k++], sp = who ? C.b : C.a, other = who ? C.a : C.b;
          face(sp, other); face(other, sp);
          say(sp, fill(line, sp, other), TALK, 3);
          C.t = TALK * 0.85;
        }
      }
    }
  }
  // the hero you play: whoever is close and hasn't spoken to you lately says so
  d.greetT -= dt;
  if (p && d.greetT <= 0) {
    const g = H.find((n) => n.state !== 'chat' && near(n, p, 2.6) && (n.greeted || 0) < w.time - 40);
    if (g) {
      g.greeted = w.time; face(g, p);
      say(g, fill(greeting(g), g), TALK + 0.6, 3);
      d.greetT = 3;
    }
  }
}
function endChat(d) {
  const C = d.chat;
  for (const n of [C.a, C.b]) { n.partner = null; n.state = 'idle'; n.waitT = rand(2, 6); }
  d.chat = null;
}

/** Click a companion: a word from them and a card of who they are. */
function heroCard(n) {
  const cls = CLASSES[n.cls]?.name || n.cls, h = n.save || {}, R = (h.keep && h.keep.rec) || {};
  const talk = () => say(n, fill(next(n, 'cls', CLASS_LINES[n.cls] || GREETS), n), TALK, 3);
  if (G.world?.player) face(n, G.world.player);
  talk();
  const t = (s) => (s == null ? '—' : s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
  const row = (a, b) => `<tr><td class="dim">${a}</td><td style="text-align:right"><b>${b}</b></td></tr>`;
  UI.dialog({
    title: n.name,
    html: `<p class="dim" style="margin-top:0">${cls} · one of your heroes, at rest in the keep</p><table style="width:100%;border-spacing:0 3px">${row('Level', n.lvl)}${row('Deepest depth', n.deep)}${row('Slain', n.kills.toLocaleString('en-US'))}
      ${row('Eternal Breach', h.breach?.best || '—')}${row('Abyssal Rift', h.rifts?.best || '—')}${row('Fastest depth', t(R.clear?.t))}${row('Fastest BOSS ROOM', t(R.raid?.t))}</table>`,
    buttons: [{ label: 'A word', fn: talk }, { label: 'Send on an errand', cls: 'red', fn: () => G.ui.keep.open('war') }, { label: 'Farewell' }],
  });
}
/** A quest giver spoken to: each of their Sagas, to take up or to see how it stands. */
export function giverTalk(f) {
  const c = G.char, k = keepState(c), mine = sagaList(c).filter((s) => (f.sagas || []).includes(s.saga.id));
  if (!mine.length) return;
  const row = (s) => {
    const S = s.saga, st = k.sagas[S.id];
    const total = S.ch.reduce((n, q, i) => n + sagaReward(i, i === S.ch.length - 1).embers, 0), prizes = S.ch.filter((q) => q.trophy).length;
    let h = `<div style="border-left:3px solid ${S.color};padding:4px 8px;margin:6px 0;background:rgba(24,18,10,.6)"><b style="color:${S.color}">${escapeHtml(S.name)}</b> <span class="dim">· ${S.ch.length} chapters · <b style="color:${EMBER_COLOR}">${total}</b> Embers${prizes ? ` · ${prizes} troph${prizes > 1 ? 'ies' : 'y'}` : ''}</span><br>`;
    if (!s.open) h += `<span class="dim">"Come back when you have reached ${sagaLock(S)}."</span>`;
    else if (!s.taken) h += `<i>"${escapeHtml(S.pitch)}"</i>`;
    else if (s.done) h += '<span class="dim">Every chapter told.</span>';
    else { const q = S.ch[st.ch], [have, need] = progressOf(c, q, st.base), pay = sagaReward(st.ch, st.ch === S.ch.length - 1); h += `Chapter ${st.ch + 1}: ${escapeHtml(q.text)} <b>${fmtInt(have)} / ${fmtInt(need)}</b> <span class="dim">· <b style="color:${EMBER_COLOR}">${pay.embers}</b> Embers</span>${chapterHint(c, q) ? `<br><span class="dim">${chapterHint(c, q)}</span>` : ''}`; }
    return h + '</div>';
  };
  const can = mine.filter((s) => s.open && !s.taken);
  UI.dialog({
    title: f.name,
    html: `<p class="dim" style="margin-top:0">${escapeHtml(f.role || '')}</p>${mine.map(row).join('')}<p class="dim" style="margin-bottom:0">Rewards are paid by the Castellan on the dais.</p>`,
    buttons: [...(can.length ? [{ label: can.length > 1 ? `Take up ${can.length} Sagas` : 'Take it up', cls: 'red', fn: () => { for (const s of can) takeSaga(s.saga.id, c); G.game?.autosave?.(); say(f, 'Good. Come back with it done.', TALK, 2); } }] : []),
      { label: "The Castellan's book", fn: () => G.ui.keep.open('sagas') }, { label: 'Farewell' }],
  });
}
/** A giver's mark over their head: 'new' when one of their Sagas can be taken up. */
export const folkMark = (n) => (n.keepFolk && n.sagas ? giverMark(n.sagas) : null);
void SAGA_BY_ID;
/** The hero steps in: the Castellan's welcome, and whoever stands near turns to look. */
export function keepWelcome(world) {
  const d = world.keepFolk, p = world.player;
  if (!d || !p) return;
  d.castellan.lineT = 1.6; d.castellan.welcomed = false;
  for (const n of d.heroes) if (near(n, p, 9) && n.state === 'idle') face(n, p);
  d.greetT = 2.5;
}

// ------------------------------------------------------------------ drawing a companion (render.js drawNpc)
/** A hero of yours: their gear preview at a hero's height, bobbing as they walk, facing their way, a bubble over them. */
export function drawKeepHero(ctx, n, x, y, t) {
  const img = n.img, H = 60;
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.beginPath(); ctx.ellipse(x, y, 13, 6, 0, 0, TAU); ctx.fill();
  let top = y - 56;
  if (img && img._bodyH) {
    const k = H / img._bodyH, w = img.width * k, h = img.height * k, bob = n.walking ? Math.abs(Math.sin(n.animT * 9)) * 2 : Math.sin(n.animT * 2) * 0.6;
    const ax = img._centerX * k, foot = (img._feetFromBottom || 0) * k;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - bob + foot));
    if (n.flip) ctx.scale(-1, 1);
    if (n.walking) ctx.rotate(Math.sin(n.animT * 9) * 0.03);
    drawRim(ctx, RIM.hero, img, 0, 0, img.width, img.height, -ax, -h, w, h);
    ctx.drawImage(img, -ax, -h, w, h);
    ctx.restore();
    top = y - bob + foot - h;
  }
  n.sbox = [x - 16, top, x + 16, y];
  n.viewH = y - top;
  drawTownSpeech(ctx, n, x, top);
}
export { clamp, HW, HH };
