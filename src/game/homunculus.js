// Homunculus the Proud, the Hollow's blacksmith (the 'upgrade' vendor). He believes he is a Paladin; his powers are
// Varrow the Rimebound's, a death knight sealed in the great axe on the rack beside his forge. Lines and the story are
// in src/data/homunculus.js; his 30 poses are drawn by src/gfx/homunculus.js.
//
// - homunculusChat: with auto-play on, the hero stops at the forge for a 3-10 s back-and-forth before trading. Every
//   other chat tells the next beat of the axe story (G.char.homunculus), each chapter twice in different words; the
//   rest are generated topics (over 2,000 different Homunculus lines), now and then a recap of an earlier chapter.
// - setupHomunculus (from townlife.js): his poses follow what he says, he hails passing townsfolk by name and they
//   answer fondly, the axe rack glows (green, then frost) as the story goes on, and in later chapters it mutters.
import { G } from '../state.js';
import { pick, rand, chance, dist } from '../core/util.js';
import { POOLS, TOPICS, STORY, AFTER, FOLK_HAILS, FOLK_BACK, AXE_MUTTERS, POSES, IDLE_POSES } from '../data/homunculus.js';
import { CLASSES } from '../data/classes.js';
import { spawn, sparkle, floatText } from '../gfx/vfx.js';
import { rollItem } from '../data/items.js';
import { depthLevel } from '../data/depth.js';
import { GroundItem } from './loot.js';
import { heroHears } from './townlife.js';

export const isHomunculus = (n) => !!(n && n.vendor && n.vendor.id === 'upgrade');
/** The hero's progress with him: talks so far, the story chapter reached, which tellings of each chapter were told. */
export function homunculusState(c = G.char) {
  const s = c.homunculus || (c.homunculus = {});
  s.talks = s.talks || 0; s.chapter = s.chapter || 0; s.told = s.told || []; s.recap = s.recap || [];
  return s;
}

// ------------------------------------------------------------------ the grammar
const allowed = (e, ch) => !Array.isArray(e) || !(e[2] > ch);
const textOf = (e) => (Array.isArray(e) ? e[0] : e);
/** Fill a template: {pool} picks an entry (its pose wins), other {keys} come from ctx. */
export function expand(tpl, ctx) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const pool = POOLS[k];
    if (!pool) return ctx[k] ?? k;
    const e = pick(pool.filter((q) => allowed(q, ctx.chapter ?? 99)));
    if (Array.isArray(e) && e[1]) ctx.pose = e[1];
    return expand(textOf(e), ctx);
  });
}
/** Every distinct line Homunculus can say in the everyday topics (for tests): templates expanded over all pools. */
export function allLines(ctx = {}) {
  const out = new Set();
  const walk = (tpl) => {
    const m = /\{(\w+)\}/.exec(tpl);
    if (!m) return [tpl];
    const pool = POOLS[m[1]];
    const head = tpl.slice(0, m.index), tail = tpl.slice(m.index + m[0].length);
    const opts = pool ? pool.flatMap((e) => walk(textOf(e))) : [ctx[m[1]] ?? m[1]];
    return opts.flatMap((o) => walk(head + o + tail));
  };
  for (const t of TOPICS) for (const [who, tpl] of t.lines) if (who === 'h') for (const l of walk(tpl)) out.add(l);
  return out;
}

const NOUNS = { offhand: 'shield', head: 'helm', body: 'armour', hands: 'gloves', legs: 'leggings', feet: 'boots' };
function context(d) {
  const c = G.char, s = homunculusState(c);
  const gear = Object.values(c.equip || {}).filter(Boolean);
  const it = gear.length ? pick(gear) : null;
  const folk = d ? d.agents.filter((a) => !a.animal && !a.adv && !a.hidden && a.name) : [];
  return {
    chapter: s.chapter,
    cls: (CLASSES[c.classId] || {}).name || 'hero',
    gear: !it ? 'gear' : it.slot === 'weapon' ? (it.base || 'weapon') : /^ring/.test(it.slot) ? 'ring' : NOUNS[it.slot] || 'gear',
    folk: folk.length ? firstName(pick(folk)) : 'Old Mother Wren',
  };
}
const firstName = (a) => (/^(Old|Brother|Mother|Watchman|Duke|Duchess|King|Queen|Prince|Princess|Dowager)\b/.test(a.name) ? a.name.replace(/ (of|the) .*/, '') : a.name.split(' ')[0]);

function weighted(list) {
  let r = Math.random() * list.reduce((a, t) => a + t.w, 0);
  for (const t of list) if ((r -= t.w) <= 0) return t;
  return list[0];
}
const telling = (ch, used) => { const left = [0, 1, 2].filter((i) => !used.includes(i)); return left.length ? pick(left) : pick([0, 1, 2]); };

/** The next chat: a story beat every other visit until the story is told, else a recap, Varrow banter or a topic. */
export function planChat(d) {
  const s = homunculusState(), ctx = context(d);
  s.talks++;
  const ch = s.chapter;
  if (ch < STORY.length && s.talks % 2 === 1) {
    const used = s.told[ch] || (s.told[ch] = []), i = telling(ch, used);
    used.push(i);
    if (used.length >= 2) s.chapter++;
    const finale = s.chapter >= STORY.length && !s.gift;
    if (finale) s.gift = true;
    return { kind: 'story', ch, title: STORY[ch].title, lines: STORY[ch].tellings[i], holy: true, finale };
  }
  if (ch > 1 && chance(ch >= STORY.length ? 0.15 : 0.22)) {
    // a recap of a chapter already told, in a telling the hero heard least lately
    const k = Math.floor(rand(0, Math.min(ch, STORY.length))), i = ((s.recap[k] ?? (s.told[k] || [0])[0]) + 1) % 3;
    s.recap[k] = i;
    return { kind: 'recap', ch: k, title: STORY[k].title, lines: STORY[k].tellings[i] };
  }
  if (ch >= STORY.length && chance(0.35)) return { kind: 'after', lines: pick(AFTER), holy: true };
  const t = weighted(TOPICS);
  const lines = t.lines.map(([who, tpl]) => { ctx.pose = null; const text = expand(tpl, ctx); return [who, text, ctx.pose]; });
  return { kind: t.id, lines, holy: t.holy };
}

/** Bubble times for a chat: long enough to read, the whole exchange kept to about 3-10 seconds. */
export function chatTimes(lines, cap = 9.8) {
  const t = lines.map(([, text]) => Math.min(4.2, Math.max(2.2, 1.3 + text.length * 0.042)));
  const sum = t.reduce((a, b) => a + b, 0) + lines.length * 0.25;
  const k = sum > cap ? cap / sum : 1;
  return t.map((x) => Math.max(1.8, x * k));
}

// ------------------------------------------------------------------ speaking
const poseFor = (emo) => Object.keys(POSES).find((p) => POSES[p] === emo) || 'confident';
/** Homunculus says a line in a given pose (his bubbles are three lines wide). */
export function hSay(d, v, text, pose, dur) {
  v.forcePose = pose || 'confident';
  return d.say(v, text, POSES[v.forcePose], dur);
}
function heroSay(text, dur) {
  const p = G.player;
  if (!p) return;
  p.talkText = text; p.talkT = dur; p.talkAge = 0; p.bubbleLines = 3;
}
function axeSay(d, text, dur) {
  const ax = d.axe;
  if (!ax) return;
  ax.talkText = text; ax.talkT = dur; ax.talkAge = 0;
  for (let i = 0; i < 6; i++) spawn({ type: 'dot', x: ax.x + rand(-0.3, 0.3), y: ax.y + rand(-0.3, 0.3), z: rand(20, 50), vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), vz: rand(4, 14), g: -4, life: rand(1, 1.8), size: rand(1.2, 2), color: pick(['#9fffc8', '#b8f0ff', '#e8fff4']) });
}
/** His "holy" light: gold-ish at first, then the axe's sickly green, then frost; warm again once he knows. */
export function holyFlare(v, ch, n = 18) {
  const cols = ch >= STORY.length ? ['#ffe080', '#9fffc8', '#c8f4ff'] : ch >= 5 ? ['#9fffc8', '#bff4ff', '#e8fff8', '#6affa8'] : ch >= 2 ? ['#7dffb0', '#b8ffd8', '#e0ffe8'] : ['#fff0b0', '#d8ffd0', '#ffe9a0'];
  v.aura = 1.6; v.auraCol = cols[0];
  for (let i = 0; i < n; i++) spawn({ type: 'dot', x: v.x + rand(-0.5, 0.5), y: v.y + rand(-0.5, 0.5), z: rand(10, 60), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(10, 35), g: -6, life: rand(0.9, 1.7), size: rand(1.3, 2.4), color: pick(cols) });
}

/** Auto-play's chat at the forge. Returns the scene (done when the last bubble has been read). */
export function homunculusChat(d, v) {
  const plan = planChat(d), times = chatTimes(plan.lines);
  const s = homunculusState();
  v.chatting = true;
  return d.run((function* () {
    const p = G.player;
    if (p) d.face(v, p.x, p.y);
    if (plan.kind === 'story') G.ui?.log?.(`<b>Homunculus</b> · ${plan.title}`, '#bff4c8');
    for (let i = 0; i < plan.lines.length; i++) {
      const [who, text, pose] = plan.lines[i], dur = times[i];
      if (who === 'h') { hSay(d, v, text, pose, dur); if (plan.holy && i === 0) holyFlare(v, s.chapter); }
      else if (who === 'p') heroSay(text, dur);
      else axeSay(d, text, dur);
      yield dur + 0.25;
    }
    if (plan.finale) finaleGift(v);
    v.chatting = false;
  })(), [], 'homunculus');
}

// the story's end: Homunculus and Varrow forge the hero something together
function finaleGift(v) {
  const p = G.player, w = G.world, c = G.char;
  if (!p || !w) return;
  const item = rollItem(depthLevel(c.depth || 1) + 3, { bonus: 2, mf: p.st ? p.st.magicFind : 0 });
  w.addLoot(new GroundItem(p.x + 0.4, p.y + 0.3, 'item', { item }));
  holyFlare(v, STORY.length, 40);
  sparkle(p.x, p.y, 30, '#ffe080', 24, 0.6);
  floatText(v.x, v.y, 90, 'A GIFT FROM THE FORGE', '#bff4c8', 15, { life: 2.4 });
  G.ui?.log?.('<b>Homunculus and Varrow</b> forged you a gift.', '#bff4c8');
}

// ------------------------------------------------------------------ the forge on a town visit
/** Called by startTownLife: poses, the axe rack beside him, townsfolk greetings and the axe's mutters. */
export function setupHomunculus(d) {
  const v = d.vendors.find(isHomunculus), c = G.char;
  if (!v || !c) return;
  const s = homunculusState(c);
  v.vendor.title = s.chapter >= STORY.length ? 'Blacksmith & Varrow' : 'Blacksmith · Paladin';
  v.bubbleLines = 3; v.chatting = false; v.pose = 'confident'; v.poseT = 0; v.aura = 0;
  // his poses follow what he says (scenes call d.say with a town emotion; hSay names the pose)
  v.onSay = (text, emo, dur) => { v.pose = v.forcePose || poseFor(emo); v.forcePose = null; v.poseT = dur + 0.8; };
  // his anvil by the door (town.js always puts one there)
  let anvil = null, near = 6;
  for (const pr of d.world.props) if (pr.spr && pr.spr.name === 'anvil_stump') { const r = dist(pr.x, pr.y, v.x, v.y); if (r < near) { near = r; anvil = pr; } }
  d.anvil = anvil;
  const base = v.update;
  v.update = (dt) => {
    base(dt);
    v.aura = Math.max(0, (v.aura || 0) - dt);
    if ((v.poseT -= dt) <= 0) { v.pose = pick(IDLE_POSES); v.poseT = v.pose === 'sleepy' || v.pose === 'exhausted' ? rand(3, 5) : rand(5, 11); }
    // idling in a working mood, he gives the anvil a few taps: sparks
    if (anvil && !(v.talkT > 0) && (v.pose === 'focused' || v.pose === 'concentrating' || v.pose === 'determined') && chance(dt * 1.4)) {
      for (let i = 0; i < 7; i++) spawn({ type: 'dot', x: anvil.x + rand(-0.15, 0.15), y: anvil.y + rand(-0.15, 0.15), z: 22, vx: rand(-1.2, 1.2), vy: rand(-1.2, 1.2), vz: rand(25, 55), g: 120, life: rand(0.35, 0.7), size: rand(1, 1.8), color: pick(['#ffd060', '#ff9a40', '#fff0b0']) });
    }
    // even standing about, the axe's power leaks into him now and then
    if (s.chapter >= 2 && chance(dt * (s.chapter >= 5 ? 0.35 : 0.15))) holyFlare(v, s.chapter, 5);
  };
  // the axe on its rack, beside him
  const spots = [[1.2, -0.7], [-0.7, 1.2], [1.3, 0.5], [0.5, 1.3], [-1.1, -0.5]];
  const [ox, oy] = spots.find(([x, y]) => d.map.walkable(v.x + x, v.y + y)) || spots[0];
  d.axe = d.addProp(null, v.x + ox, v.y + oy, { kind: 'axe_rack', ch: s.chapter, talkText: '', talkT: 0, talkAge: 0, bubbleLines: 3, dark: true, name: 'the great axe' });
  d.homunculus = v;
  d.run(hailFolk(d, v), [], 'homunculus:folk');
}

function* hailFolk(d, v) {
  const s = homunculusState();
  for (;;) {
    yield rand(8, 16);
    const ax = d.axe;
    // the axe mutters to itself once it has found its voice
    if (ax && s.chapter >= 4 && chance(0.25) && !(ax.talkT > 0) && G.player && dist(G.player.x, G.player.y, ax.x, ax.y) < 9) {
      const list = AXE_MUTTERS.filter(([min]) => min <= s.chapter), [, text] = pick(list), dur = 3;
      axeSay(d, text, dur);
      heroHears(ax, dur);
      continue;
    }
    if (v.chatting || v.talkT > 0) continue;
    for (let w = 0; w < 4 && !d.canSpeak(v); w += 0.25) yield 0.25;   // wait a moment for a speech slot
    if (v.chatting || !d.canSpeak(v)) continue;
    // the nearest free townsperson; from further off they come over when he calls
    let a = null, best = 16;
    for (const q of d.agents) { const r = dist(q.x, q.y, v.x, v.y); if (!q.busy && !q.hidden && !q.animal && !q.adv && !q.fixed && r < best) { best = r; a = q; } }
    if (!a) continue;
    const sc = d.run(greetFolk(d, v, a, s.chapter), [a], 'homunculus:greet');
    yield () => sc.done;
  }
}

function* greetFolk(d, v, a, ch) {
  if (dist(a.x, a.y, v.x, v.y) > 3) {
    const ang = Math.atan2(a.y - v.y, a.x - v.x);
    yield d.go(a, v.x + Math.cos(ang) * 1.8, v.y + Math.sin(ang) * 1.8);
    if (dist(a.x, a.y, v.x, v.y) > 4 || v.chatting) return;
  }
  d.face(a, v.x, v.y); d.face(v, a.x, a.y);
  const ok = (l) => !(l[2] > ch);
  const [text, pose] = pick(FOLK_HAILS.filter(ok)), line = text.replace('{name}', firstName(a));
  yield (hSay(d, v, line, pose, Math.min(4, 1.6 + line.length * 0.045))) + 0.3;
  const [back, emo] = pick(FOLK_BACK.filter(ok));
  yield* d.line(a, back, emo, 0, 3);
  if (chance(0.5)) d.feel(a, pick(['happy', 'love', 'laugh', 'wave']), 3);
  yield rand(0.5, 1.5);
}
