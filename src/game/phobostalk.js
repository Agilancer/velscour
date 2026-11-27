// Phobos talks (data/phobostalk.js has the lines). The folk walk the lanes of their own district, stop to talk with
// each other, greet the hero and set errands (a gold "!" over the head; clear so many foes from their district for
// gold and experience). The occupiers grumble to each other on watch, taunt the hero in a fight, cry out when hurt
// and have a last word. Bubbles are rationed so a busy street never drowns in text.
import { G } from '../state.js';
import { rand, chance, pick, dist } from '../core/util.js';
import { floatText } from '../gfx/vfx.js';
import { sfx } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { talkLine, convoLines } from '../data/phobostalk.js';

const say = (n, text, t = 3.6) => { n.talkText = text; n.talkT = t; n.talkAge = 0; n.bubbleLines = text.length > 84 ? 4 : 3; };
const busy = (n) => n.talkT > 0;
const VIEW = 15;   // only those near enough to be seen speak

/** Phobos's voices for one world. `placeOf(x, y)` names where a speaker stands ({place}, {lord}); `folk` the townsfolk;
 *  `homes(n)` the street spots a folk walks between. Returns the per-frame update. */
export function phobosTalk(world, { placeOf, folk = [], homes = () => null, questDistrict = () => null, errands = null } = {}) {
  let foeT = 2, convoT = 4, deathT = 0; const later = [];   // [seconds, fn]: answers, on game time
  const ctxAt = (x, y) => placeOf(x, y) || {};
  // ---- the folk: a walk round home, talk, errands
  for (const n of folk) {
    n.talkText = ''; n.talkT = 0; n.talkAge = 0; n.animT = rand(0, 5); n.walkT = 0; n.home = [n.x, n.y]; n.wanderT = rand(1, 8); n.greetT = 0;
    const good = n.folk?.cat !== 'gray' && !n.hub;
    // errands keep across visits (S.errands, by name): one offered, taken or done stays so
    if (errands && errands[n.name]) n.errand = errands[n.name];
    else if (good && chance(0.45)) { n.errand = { state: 'offer', need: 6 + Math.floor(Math.random() * 7), got: 0, district: questDistrict(n) }; if (errands) errands[n.name] = n.errand; }
    // the "!" over the head (render.js drawNpc) while it's on offer or ready to hand in, "?" while it runs
    if (n.errand) { const e = n.errand; n.bounty = { get state() { return e.state === 'active' && e.got >= e.need ? 'offer' : e.state; } }; }
    const base = n.use;
    n.use = () => {
      const e = n.errand, c = ctxAt(n.x, n.y);
      if (!e || e.state === 'paid') { if (!busy(n)) say(n, talkLine(n.folk?.cat === 'gray' ? 'gray' : 'good', c)); else if (base) base(); return; }
      if (e.state === 'offer') {
        if (G.autoplayOn) { e.state = 'active'; say(n, 'Bless you. Go!', 2.4); return; }
        UI.dialog({ title: n.name, html: `<p>${talkLine('questOffer', c)}</p><p class="dim">Slay ${e.need} foes in ${c.place || 'this district'}.</p>`,
          buttons: [{ label: 'I\'ll do it', fn: () => { e.state = 'active'; say(n, 'Bless you. Go!', 2.4); sfx('click'); } }, { label: 'Not now' }] });
      } else if (e.got >= e.need) {
        e.state = 'paid'; const p = G.player, lvl = G.char?.level || 1, gold = 60 * lvl;
        G.char.gold = (G.char.gold || 0) + gold; if (p?.gainXp) p.gainXp(Math.round(lvl * lvl * 6), true);
        say(n, talkLine('questDone', c), 3.2); sfx('gold'); floatText(n.x, n.y, 70, `+${gold} gold`, '#ffd860', 14, { life: 1.8 });
        UI.log(`${n.name}'s errand is done: <b style="color:#ffd860">${gold} gold</b> and their thanks.`, '#ffd860');
      } else say(n, `${talkLine('questActive', c)} (${e.got}/${e.need})`, 2.8);
    };
    n.update = (dt) => {
      n.animT += dt; n.talkAge += dt; n.talkT = Math.max(0, n.talkT - dt); n.greetT -= dt; n.walking = false;
      if (n.hidden) return;
      const p = world.player;
      // a walk: to another spot on the home streets, by the path
      if (n.path) {
        const [px, py] = n.path[0], dx = px - n.x, dy = py - n.y, l = Math.hypot(dx, dy);
        if (l < 0.1) { n.path.shift(); if (!n.path.length) { n.path = null; n.wanderT = rand(4, 12); } }
        else if (!busy(n)) { const s = Math.min(l, 0.95 * dt), nx = n.x + dx / l * s, ny = n.y + dy / l * s; if (world.map.walkable(nx, ny)) { n.flip = dx - dy < 0; n.x = nx; n.y = ny; n.walking = true; } else n.path = null; }
      } else if ((n.wanderT -= dt) <= 0 && !busy(n)) {
        const spots = homes(n), to = spots && spots.length ? pick(spots.filter(([x, y]) => dist(x, y, n.home[0], n.home[1]) < 12)) : null;
        n.path = to ? world.map.findPath(n.x, n.y, to[0], to[1], 2500, 0.25) : null; n.wanderT = rand(5, 12);
      }
      // the hero close by: a greeting (an errand on offer says so)
      if (p && !busy(n) && n.greetT <= 0 && dist(p.x, p.y, n.x, n.y) < 3.2) {
        n.greetT = rand(14, 26); n.flip = p.x - n.x - (p.y - n.y) < 0;
        const c = ctxAt(n.x, n.y);
        say(n, n.errand?.state === 'offer' ? talkLine('questOffer', c) : n.folk?.cat === 'gray' ? talkLine('gray', c) : talkLine('greet', c));
      }
    };
  }
  const near = (x, y, r) => { const p = world.player; return p && dist(p.x, p.y, x, y) < r; };
  return function talk(dt) {
    const p = world.player; if (!p) return;
    deathT -= dt;
    for (let i = later.length - 1; i >= 0; i--) if ((later[i][0] -= dt) <= 0) { const f = later[i][1]; later.splice(i, 1); f(); }
    // the folk: two neighbours stop and talk
    if ((convoT -= dt) <= 0) {
      convoT = rand(5, 11);
      const idle = folk.filter((n) => !n.hidden && !busy(n) && n.folk?.cat !== 'gray' && near(n.x, n.y, VIEW));   // (the good folk; the gray keep to themselves)
      for (const a of idle) {
        const b = idle.find((o) => o !== a && dist(o.x, o.y, a.x, a.y) < 6); if (!b) continue;
        const [l1, l2] = convoLines(ctxAt(a.x, a.y)); a.path = b.path = null; a.flip = b.x - a.x - (b.y - a.y) < 0; b.flip = !a.flip;
        say(a, l1, 3.4); b.talkT = 0.01; later.push([2.9, () => say(b, l2, 3.2)]); break;
      }
    }
    // errands: foes dying in an errand's district count toward it
    for (const m of world.creatures) {
      if (!m.dead || m._counted || m.team === p.team || m.clutter) continue;
      m._counted = true;
      if (m.talks && deathT <= 0 && near(m.x, m.y, VIEW) && chance(0.35)) { deathT = 0.8; const l = talkLine('death', ctxAt(m.x, m.y)); if (l) floatText(m.x, m.y, 66, l, '#d8c8a8', 11, { life: 2.2 }); }
      const d = m.district;
      if (d != null) for (const n of folk) if (n.errand?.state === 'active' && n.errand.district === d && n.errand.got < n.errand.need && ++n.errand.got === n.errand.need) UI.log(`${n.name}: that's enough of them. Come and see me.`, '#ffd860');
    }
    // the occupiers: count who is talking, so no more than a few bubbles are up at once
    let up = 0; for (const m of world.creatures) if (m.talkT > 0) { m.talkT -= dt; m.talkAge += dt; up++; }
    if ((foeT -= dt) > 0 || up >= 3) return;
    foeT = rand(0.8, 2.2);
    const cands = world.creatures.filter((m) => m.talks && !m.dead && !(m.talkT > 0) && near(m.x, m.y, VIEW));
    if (!cands.length) return;
    const m = pick(cands), c = ctxAt(m.x, m.y), fighting = m.awake && dist(m.x, m.y, p.x, p.y) < 9;
    const hurt = m.maxHp && m.hp < m.maxHp * 0.5 && !m._hurtSaid;
    if (hurt && chance(0.6)) { m._hurtSaid = true; say(m, talkLine('hurt', c), 2.2); return; }
    if (fighting) { if (chance(0.55)) say(m, talkLine('taunt', c), 2.6); return; }
    // on watch: a word to a mate nearby, and their answer
    say(m, talkLine('foeIdle', c), 3.8);
    const mate = cands.find((o) => o !== m && dist(o.x, o.y, m.x, m.y) < 4);
    if (mate) later.push([2.6, () => { if (!mate.dead && world.creatures.filter((o) => o.talkT > 0).length < 4) say(mate, talkLine('foeReply', c), 2.8); }]);
  };
}
/** Mark the foes that talk (painted art, not clutter, statues or summons) and where they belong. */
export function makeTalker(m, district = null) { if (!m || m.clutter || m.static) return m; m.talks = true; m.talkText = ''; m.talkT = 0; m.talkAge = 0; m.bubbleLines = 3; m.district = district; return m; }
