// Mobile touch controls: virtual joystick (handled in input.js) + skill button cluster.
import { G } from '../state.js';
import { el } from '../core/util.js';
import { $ } from './ui.js';
import { skillIcon } from './icons.js';
import { SKILLS, cooldown, manaCost, rageCost, effLevel } from '../data/skills.js';
import { SLOT_LABELS, RMB } from '../data/bar.js';
import { chooser } from './hud.js';

// Positions [ring, angleDeg]: ring 0 = big attack button, 1 = inner arc, 2 = outer arc. The arcs show one page of
// the 15-slot bar at a time; the small flip button swaps pages.
const POS = [[1, 180], [1, 225], [1, 270], [2, 198], [2, 213.4], [2, 228.8], [2, 244.2], [2, 259.6], [2, 275]];
const PAGES = [[RMB, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 1]]; // RMB 1-8 | 9 0 - = `
const FLIP = [1.5, 186]; // between the arcs, left of RMB

export const TouchUI = {
  btns: [],
  page: 0,
  init() {
    G.touchUI = this;
    const root = $('#touch-buttons');
    const slots = [[0, 0, 0], ...POS.map(([ring, ang], i) => [PAGES[0][i], ring, ang])];
    for (const [bar, ring, ang] of slots) {
      const b = el('div', 'tbtn' + (ring === 0 ? ' main' : ''));
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const cd = el('div', 'cd'); cd.style.height = '0%';
      const k = el('div', 'k');
      b.append(cv, cd, k);
      const t = { b, cv, cd, k, bar, ring, ang, last: {} };
      let holdT = null, longT = null, fired = false;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        b.classList.add('pressed');
        fired = false;
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const bar = t.bar;
        const id = G.char && G.char.bar[bar];
        if (!id) { longT = setTimeout(() => chooser(bar), 10); return; }
        G.controls.useSlot(bar); fired = true;
        holdT = setInterval(() => G.controls.useSlot(bar), 120);
        longT = setTimeout(() => { clearInterval(holdT); holdT = null; if (!fired) chooser(bar); }, 1200);
      });
      const up = () => { b.classList.remove('pressed'); clearInterval(holdT); clearTimeout(longT); holdT = null; longT = null; };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); chooser(t.bar); });
      root.appendChild(b);
      this.btns.push(t);
    }
    const f = this.flipBtn = el('div', 'tbtn flip', '&#8644;<span>1/2</span>');
    f.title = 'More skills';
    f.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.setPage(1 - this.page); });
    root.appendChild(f);
    window.addEventListener('resize', () => this.layout());
    this.setPage(0);
  },
  /** Show page n of the bar on the arcs. */
  setPage(n) {
    this.page = n;
    const page = PAGES[n];
    this.btns.forEach((t, i) => {
      if (!i) return;
      const bar = page[i - 1];
      t.b.classList.toggle('hidden', bar === undefined);
      if (bar === undefined) return;
      t.bar = bar; t.last = {}; t.b.style.filter = ''; t.cd.style.height = '0%';
      t.k.textContent = SLOT_LABELS[bar];
    });
    this.btns[0].k.textContent = 'ATK';
    this.flipBtn.querySelector('span').textContent = `${n + 1}/${PAGES.length}`;
    this.flipBtn.classList.toggle('on', n > 0);
    this.layout();
    this.refresh();
  },
  layout() {
    const W = innerWidth, H = innerHeight;
    const s = Math.max(0.72, Math.min(1.15, Math.min(W, H) / 400));
    const main = 72 * s, small = 44 * s;
    const cx = W - 14 - main / 2, cy = H - 14 - main / 2 - (H < 420 ? 0 : 10);
    const radii = [0, 92 * s, 170 * s];
    const rad = (ring) => (ring % 1 ? (radii[Math.floor(ring)] + radii[Math.ceil(ring)]) / 2 : radii[ring]);
    const root = $('#touch-buttons');
    root.style.width = W + 'px'; root.style.height = H + 'px';
    root.style.left = '0'; root.style.top = '0'; root.style.right = 'auto'; root.style.bottom = 'auto';
    const put = (b, ring, ang, size) => {
      const r = rad(ring), a = (ang * Math.PI) / 180;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      Object.assign(b.style, { width: size + 'px', height: size + 'px', left: x - size / 2 + 'px', top: y - size / 2 + 'px' });
    };
    for (const t of this.btns) put(t.b, t.ring, t.ang, t.ring === 0 ? main : small);
    if (this.flipBtn) put(this.flipBtn, FLIP[0], FLIP[1], 32 * s);
  },
  refresh() {
    for (const t of this.btns) {
      const id = G.char ? G.char.bar[t.bar] : null;
      if (t.last.id === id) continue;
      t.last.id = id;
      const x = t.cv.getContext('2d');
      x.clearRect(0, 0, 64, 64);
      if (id && SKILLS[id]) x.drawImage(skillIcon(SKILLS[id], 64), 0, 0);
      t.b.style.opacity = id ? '1' : '0.45';
    }
  },
  update() {
    const p = G.player;
    if (!p) return;
    for (const t of this.btns) {
      const id = G.char.bar[t.bar];
      const sk = id && SKILLS[id];
      let k = 0;
      if (sk) {
        const rem = p.cooldowns[id] || 0, tot = cooldown(sk) * (1 - p.st.cdr / 100);
        if (rem > 0 && tot > 0) k = Math.round((rem / tot) * 100);
        const L = effLevel(p, sk);
        const nm = L > 0 && (p.mana < manaCost(sk, L) || p.rage < rageCost(sk) ||
          (sk.classId === 'barbarian' && sk.kind === 'whirl' && p.rage < 10));
        if (t.last.nm !== nm) { t.last.nm = nm; t.b.style.filter = nm ? 'saturate(0.3) brightness(0.7)' : ''; }
      }
      if (t.last.k !== k) { t.last.k = k; t.cd.style.height = k + '%'; }
    }
  },
  show(v) { $('#touch-ui').classList.toggle('hidden', !v); if (v) { this.layout(); this.refresh(); } },
};
