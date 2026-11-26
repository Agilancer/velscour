// The top-of-screen ticker (after bm/bsv's emergency ticker): a bar across the top that every on-screen message crawls
// along right to left. Three kinds, each with its own tag and colour: WARNING (red: boss calls, attack patterns, ambushes),
// QUEST (gold: quest, bounty, scenario and trial updates) and NOTICE (slate: everything else). The bar drops in while
// anything is crawling and goes back up when the last call has gone off the left edge.
// Settings: `ticker` (off = the old centre message + log lines) and `tickerSize` (scale). UI.centerMsg/UI.log feed it.
import { G } from '../state.js';

const SPEED = 12, GAP = 3.4, RUSH = 2.6, MAX_WAIT = 8;
const KINDS = {
  warn: { tag: 'Warning', bar: 'linear-gradient(#c0170f,#8a0a07 42%,#5c0505)', ink: '#ffd23a', em: '#ffdca0' },
  quest: { tag: 'Quest', bar: 'linear-gradient(#7a5410,#4e3306 50%,#2e1d02)', ink: '#ffe08a', em: '#fff0c0' },
  info: { tag: 'Notice', bar: 'linear-gradient(#2c3346,#1b2030 50%,#0f121c)', ink: '#bcd0ff', em: '#dfe6ff' },
};
const RANK = { info: 0, quest: 1, warn: 2 };
const WARN_RE = /!|\b(beware|warning|incoming|dodge|get (behind|out|away|clear)|stand (in|on|behind)|run\b|move\b|sealed|boss|guardian|ambush|charg|quake|enrag|frenzy|madness|breath|gaze|summon|nemesis|cursed|beam|nova|storm|slam|pull|danger|fire|flood|collapse)/i;
const QUEST_RE = /\b(quest|bounty|bounties|scenario|trial|objective|complete|cleared|reward|shrine|depth \d|level up|unlocked|portal|heart|summit|treasure|challenge|paid|victory|defeated|slain)\b/i;

export function tickerKind(text, color) {
  if (/#ff[0-6][0-9a-f]{3}/i.test(color || '')) return 'warn';
  return WARN_RE.test(text) ? 'warn' : QUEST_RE.test(text) ? 'quest' : 'info';
}
const plain = (html) => { const d = document.createElement('div'); d.innerHTML = String(html || ''); return d.textContent.replace(/\s+/g, ' ').trim(); };

const CSS = `
  #ticker { position: fixed; left: 0; right: 0; top: env(safe-area-inset-top, 0px); z-index: 30; height: 2.1em; display: flex; align-items: stretch; overflow: hidden; pointer-events: none;
    font: 900 calc(16px * var(--tk-s, 1))/1 Cinzel, Georgia, serif; letter-spacing: .07em; color: #fff; background: var(--tk-bar);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 2px 0 rgba(0,0,0,.85), 0 0 18px var(--tk-glow, transparent);
    transform: translateY(-115%); transition: transform .22s cubic-bezier(.2,.9,.3,1.15), background .3s; }
  #ticker.on { transform: none; }
  #ticker.warn { --tk-glow: rgba(255,36,14,.5); animation: tkThrob 1.8s ease-in-out infinite; }
  #ticker::before { content: ''; position: absolute; inset: 0 -2.2em 0 0; opacity: .12; background: repeating-linear-gradient(-45deg,#000 0 .5em,transparent .5em 1em); animation: tkGrain 1.1s linear infinite; }
  #ticker::after { content: ''; position: absolute; inset: 0; opacity: 0; background: linear-gradient(#fff3d8,#ff5a2a 60%,#ff2a10); mix-blend-mode: screen; }
  #ticker.flash::after { animation: tkFlash .95s ease-out; }
  #ticker .tk-tag { position: relative; z-index: 1; flex: none; display: flex; align-items: center; gap: .45em; padding: 0 1.25em 0 .7em; min-width: 6.2em;
    background: linear-gradient(#1a0606,#060101); clip-path: polygon(0 0,calc(100% - .85em) 0,100% 50%,calc(100% - .85em) 100%,0 100%);
    font-size: .74em; letter-spacing: .22em; color: var(--tk-ink); text-transform: uppercase; }
  #ticker.warn .tk-tag span { animation: tkBlink 1.1s steps(1,end) infinite; }
  #ticker .tk-tag svg { width: 1.5em; height: 1.4em; flex: none; }
  #ticker .tk-lane { position: relative; z-index: 1; flex: 1; min-width: 0; overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg,transparent 0,#000 1.2em,#000 calc(100% - 1.6em),transparent 100%); mask-image: linear-gradient(90deg,transparent 0,#000 1.2em,#000 calc(100% - 1.6em),transparent 100%); }
  #ticker .tk-call { position: absolute; left: 0; top: 0; bottom: 0; display: flex; align-items: center; white-space: nowrap; will-change: transform; text-shadow: 0 1px 0 #000, 0 2px 3px rgba(0,0,0,.75); }
  #ticker .tk-call i { flex: none; width: .5em; height: .5em; margin-right: .7em; transform: rotate(45deg); background: var(--c); box-shadow: 0 0 0 1.5px #000, 0 0 8px var(--c); }
  #ticker .tk-call b { color: #fff; } #ticker .tk-call em { font-style: normal; font-weight: 700; margin-left: .8em; color: var(--e); }
  #ticker .tk-call u { text-decoration: none; font-size: .7em; letter-spacing: .18em; margin-right: .7em; color: var(--c); }
  @keyframes tkFlash { 0% { opacity: .9; } 16% { opacity: .08; } 30% { opacity: .7; } 46% { opacity: .05; } 60% { opacity: .45; } 100% { opacity: 0; } }
  @keyframes tkThrob { 50% { box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 2px 0 rgba(0,0,0,.85), 0 0 32px rgba(255,46,16,.8); } }
  @keyframes tkGrain { to { transform: translateX(-1.4142em); } }
  @keyframes tkBlink { 50% { color: #ff4a2e; } }
  body.touch #ticker { font-size: calc(12px * var(--tk-s, 1)); }
  @media (prefers-reduced-motion: reduce) { #ticker::before, #ticker.warn { animation: none; } }
`;
const SIGN = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 1.6 23 20.4H1z" fill="currentColor" stroke="#1a0303" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 7.6v6.6" stroke="#1a0303" stroke-width="2.7" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.5" fill="#1a0303"/></svg>';

class Ticker {
  constructor() {
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    this.el = document.createElement('div'); this.el.id = 'ticker';
    this.el.innerHTML = `<div class="tk-tag">${SIGN}<span></span></div><div class="tk-lane"></div><div class="tk-said" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></div>`;
    this.lane = this.el.querySelector('.tk-lane'); this.tagText = this.el.querySelector('.tk-tag span'); this.said = this.el.querySelector('.tk-said');
    document.body.appendChild(this.el);
    this.calls = []; this.raf = 0; this.last = 0; this.kind = null;
    this.tick = (now) => this.step(now);
  }
  setKind(k) {
    if (this.kind === k) return;
    this.kind = k; const K = KINDS[k];
    this.el.classList.toggle('warn', k === 'warn');
    this.el.style.setProperty('--tk-bar', K.bar); this.el.style.setProperty('--tk-ink', K.ink);
    this.tagText.textContent = K.tag;
  }
  push(head, rest = '', kind = 'info') {
    head = String(head || ''); if (kind !== 'info') head = head.toUpperCase(); rest = String(rest || '');
    if (!head) return;
    this.el.style.setProperty('--tk-s', G.settings.tickerSize || 1);
    const key = `${head}|${rest}`;
    if (this.calls.some((c) => c.key === key && c.x > 0)) { if (kind === 'warn') this.flash(); return; }
    // (A flood of notices never holds back a warning: the oldest waiting notices are dropped.)
    const waiting = this.calls.filter((c) => c.x > (this.lane.clientWidth || 0));
    if (waiting.length >= MAX_WAIT) { const drop = waiting.find((c) => c.kind === 'info'); if (!drop && kind === 'info') return; if (drop) this.drop(drop); }
    const K = KINDS[kind] || KINDS.info;
    const el = document.createElement('div'); el.className = 'tk-call';
    el.style.setProperty('--c', K.ink); el.style.setProperty('--e', K.em);
    el.append(document.createElement('i'), Object.assign(document.createElement('u'), { textContent: K.tag }), Object.assign(document.createElement('b'), { textContent: head }));
    if (rest) el.append(Object.assign(document.createElement('em'), { textContent: rest }));
    this.lane.appendChild(el);
    if (!this.el.classList.contains('on')) { this.el.classList.add('on'); }
    if (kind === 'warn') this.flash();
    this.said.textContent = `${head} ${rest}`;
    const em = parseFloat(getComputedStyle(this.lane).fontSize) || 16, laneW = this.lane.clientWidth;
    const tail = this.calls.at(-1);
    const call = { key, kind, el, x: Math.max(laneW, tail ? tail.x + tail.w + GAP * em : -Infinity), w: el.offsetWidth };
    el.style.transform = `translate3d(${call.x}px,0,0)`;
    this.calls.push(call);
    this.recolor();
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  drop(c) {
    const i = this.calls.indexOf(c); if (i < 0) return;
    this.calls.splice(i, 1); c.el.remove();
    for (let j = i; j < this.calls.length; j++) this.calls[j].x -= c.w + GAP * 16; // (close the gap)
  }
  recolor() { // the bar takes the colour of the most urgent call on screen
    const laneW = this.lane.clientWidth || 1;
    let best = 'info';
    for (const c of this.calls) if (c.x < laneW && c.x + c.w > 0 && RANK[c.kind] > RANK[best]) best = c.kind;
    if (!this.calls.some((c) => c.x < laneW) && this.calls[0]) best = this.calls[0].kind;
    this.setKind(best);
  }
  step(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const em = parseFloat(getComputedStyle(this.lane).fontSize) || 16, laneW = this.lane.clientWidth || 1;
    const wait = Math.max(0, (this.calls.at(-1)?.x ?? 0) - laneW);
    const v = SPEED * em * (1 + Math.min(1, wait / (0.5 * laneW)) * (RUSH - 1));
    for (const c of this.calls) { c.x -= v * dt; c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,0,0)`; }
    while (this.calls.length && this.calls[0].x + this.calls[0].w < 0) this.calls.shift().el.remove();
    this.recolor();
    if (this.calls.length) this.raf = requestAnimationFrame(this.tick);
    else { this.raf = 0; this.el.classList.remove('on', 'flash'); }
  }
  flash() { if (G.settings.reduceFlashing) return; this.el.classList.remove('flash'); void this.el.offsetWidth; this.el.classList.add('flash'); }
  clear() { for (const c of this.calls) c.el.remove(); this.calls = []; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.el.classList.remove('on', 'flash'); }
}

let T = null;
export const tickerOn = () => G.settings.ticker !== false && typeof document !== 'undefined';
export function ticker() { return (T ||= new Ticker()); }
// UI.centerMsg(title, sub): a headline. UI.log(html, color): a line.
export function tickHeadline(title, sub, kind) { ticker().push(title, sub, kind || tickerKind(`${title} ${sub}`)); }
export function tickLine(html, color, kind) {
  const t = plain(html); if (!t) return;
  ticker().push(t, '', kind || tickerKind(t, color));
}
