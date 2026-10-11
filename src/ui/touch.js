// Mobile touch controls: virtual joystick (handled in input.js) + skill button cluster.
import { G } from '../state.js';
import { el } from '../core/util.js';
import { $ } from './ui.js';
import { skillIcon } from './icons.js';
import { SKILLS, cooldown, manaCost, effLevel } from '../data/skills.js';
import { SLOT_LABELS } from './skills.js';
import { chooser } from './hud.js';

// [barIndex, ring, angleDeg]  ring 0 = big attack button, 1 = inner arc, 2 = outer arc
const LAYOUT = [
  [0, 0, 0], [9, 1, 180], [1, 1, 225], [2, 1, 270],
  [3, 2, 198], [4, 2, 213.4], [5, 2, 228.8], [6, 2, 244.2], [7, 2, 259.6], [8, 2, 275],
];

export const TouchUI = {
  btns: [],
  init() {
    G.touchUI = this;
    const root = $('#touch-buttons');
    for (const [bar, ring] of LAYOUT) {
      const b = el('div', 'tbtn' + (ring === 0 ? ' main' : ''));
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const cd = el('div', 'cd'); cd.style.height = '0%';
      const k = el('div', 'k', SLOT_LABELS[bar] === 'LMB' ? 'ATK' : SLOT_LABELS[bar]);
      b.append(cv, cd, k);
      let holdT = null, longT = null, fired = false;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        b.classList.add('pressed');
        fired = false;
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const id = G.char && G.char.bar[bar];
        if (!id) { longT = setTimeout(() => chooser(bar), 10); return; }
        G.controls.useSlot(bar); fired = true;
        holdT = setInterval(() => G.controls.useSlot(bar), 120);
        longT = setTimeout(() => { clearInterval(holdT); holdT = null; if (!fired) chooser(bar); }, 1200);
      });
      const up = () => { b.classList.remove('pressed'); clearInterval(holdT); clearTimeout(longT); holdT = null; longT = null; };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); chooser(bar); });
      root.appendChild(b);
      this.btns.push({ b, cv, cd, bar, ring, last: {} });
    }
    window.addEventListener('resize', () => this.layout());
    this.layout();
  },
  layout() {
    const W = innerWidth, H = innerHeight;
    const s = Math.max(0.72, Math.min(1.15, Math.min(W, H) / 400));
    const main = 72 * s, small = 44 * s;
    const cx = W - 14 - main / 2, cy = H - 14 - main / 2 - (H < 420 ? 0 : 10);
    const radii = [0, 92 * s, 170 * s];
    const root = $('#touch-buttons');
    root.style.width = W + 'px'; root.style.height = H + 'px';
    root.style.left = '0'; root.style.top = '0'; root.style.right = 'auto'; root.style.bottom = 'auto';
    for (const t of this.btns) {
      const [, ring, ang] = LAYOUT.find((l) => l[0] === t.bar);
      const r = radii[ring], a = (ang * Math.PI) / 180;
      const size = ring === 0 ? main : small;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      Object.assign(t.b.style, { width: size + 'px', height: size + 'px', left: x - size / 2 + 'px', top: y - size / 2 + 'px' });
    }
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
        const nm = L > 0 && p.mana < manaCost(sk, L);
        if (t.last.nm !== nm) { t.last.nm = nm; t.b.style.filter = nm ? 'saturate(0.3) brightness(0.7)' : ''; }
      }
      if (t.last.k !== k) { t.last.k = k; t.cd.style.height = k + '%'; }
    }
  },
  show(v) { $('#touch-ui').classList.toggle('hidden', !v); if (v) { this.layout(); this.refresh(); } },
};
