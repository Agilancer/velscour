// Living class portraits for the menus (assets/sprites/select/, sliced from the 16-class sheet by tools/selectart.py).
// Every hero breathes and sways to a rhythm of its own (seeded from its class id); while hovered (or just after a tap)
// it gets excited: it hops with squash and stretch, cheers side to side, and glows with sparks in its class colour.
// The portrait is redrawn in thin horizontal strips so the feet stay planted while the body bends above them.
import { CLASSES } from '../data/classes.js';

const imgs = {};
const live = new Set();
let raf = 0, last = 0;
const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const AURA = { death_knight: '#7ab8ff' }; // where the art's colour differs from the class colour

function portrait(id) {
  if (!imgs[id]) { imgs[id] = new Image(); imgs[id].src = `assets/sprites/select/${id}.webp`; }
  return imgs[id];
}
/** Start fetching all portraits (the class grid needs them at once). */
export function preloadPortraits(ids) { for (const id of ids) portrait(id); }

/** Stable per-class rhythm: idle breathing and sway periods, and the style of its excitement. */
function rhythm(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  return {
    breath: 2.2 + r() * 1.9, sway: 3.4 + r() * 3.2, swayAmp: 0.008 + r() * 0.01, ph: r() * 6.28, ph2: r() * 6.28,
    hopHz: 1.7 + r() * 0.9, hopAmp: 0.045 + r() * 0.035, lean: 0.04 + r() * 0.04,
    wobble: id === 'slime_lord' ? 1 : 0, // the slime jiggles
  };
}

function tick(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  for (const a of live) { if (!a.canvas.isConnected) live.delete(a); else a.frame(dt); }
  raf = live.size ? requestAnimationFrame(tick) : 0;
  if (!raf) last = 0;
}

/**
 * Animated portrait on a canvas sized by CSS. Returns { canvas, setId(id), hover(on), burst(sec) }.
 * The canvas drops out of the animation loop by itself once it leaves the document.
 */
export function heroCanvas(id, cls = 'hero-cv') {
  const canvas = document.createElement('canvas');
  canvas.className = cls;
  const ctx = canvas.getContext('2d');
  const a = {
    canvas, id: null, R: null, t: Math.random() * 20, ex: 0, hov: false, burstT: 0, hopT: 0, sparks: [], color: '#ffd860',
    setId(nid) { if (nid === this.id) return; this.id = nid; this.R = rhythm(nid); this.color = AURA[nid] || (CLASSES[nid] && CLASSES[nid].color) || '#ffd860'; this.sparks.length = 0; },
    hover(on) { this.hov = on; },
    burst(sec = 1.6) { this.burstT = Math.max(this.burstT, sec); },
    frame(dt) {
      const img = portrait(this.id);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.round(canvas.clientWidth * dpr), ch = Math.round(canvas.clientHeight * dpr);
      if (!cw || !ch) return;
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      ctx.clearRect(0, 0, cw, ch);
      if (!img.complete || !img.naturalWidth) return;
      this.t += dt;
      this.burstT = Math.max(0, this.burstT - dt);
      const want = this.hov || this.burstT > 0 ? 1 : 0;
      this.ex += (want - this.ex) * Math.min(1, dt * (want ? 7 : 3));
      const R = this.R, t = this.t, ex = calm ? this.ex * 0.4 : this.ex, idle = calm ? 0.5 : 1;
      if (ex > 0.01) this.hopT += dt * R.hopHz; else this.hopT = 0;
      // fit: leave headroom for the hop and stretch; the feet sit just above the card's name plaque edge
      const k = Math.min(cw / (img.naturalWidth * 1.12), ch / (img.naturalHeight * 1.1));
      const W = img.naturalWidth * k, H = img.naturalHeight * k;
      const cx = cw / 2, base = ch - Math.max(2, ch * 0.02);
      const b = Math.sin(t * 6.283 / R.breath + R.ph) * idle;                  // breathing, -1..1
      const s = (Math.sin(t * 6.283 / R.sway + R.ph2) + 0.35 * Math.sin(t * 2.1 + R.ph)) * R.swayAmp * idle;
      const hs = Math.sin(Math.PI * this.hopT);                                  // hop arc
      const hop = Math.abs(hs) * R.hopAmp * ex;
      const squash = Math.pow(1 - Math.abs(hs), 6) * 0.07 * ex;                  // landing
      const stretch = Math.abs(hs) * 0.035 * ex;
      const sy = 1 + 0.012 * b + stretch - squash + R.wobble * 0.02 * Math.sin(t * 7.3) * (0.5 + ex);
      const sx = 1 - (sy - 1) * 0.6;
      const lean = (s + Math.sin(Math.PI * this.hopT * 0.5) * R.lean * ex) * H;  // top-of-head offset
      const feet = base - hop * H;
      // ground: a shadow that shrinks as the hero leaves it, and a class-coloured glow when excited
      ctx.save();
      ctx.globalAlpha = 0.55 - hop * 3;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(cx, base - 1, W * 0.36 * (1 - hop * 2), H * 0.035, 0, 0, 6.283); ctx.fill();
      if (ex > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ex * (0.55 + 0.15 * Math.sin(t * 9));
        const rx = Math.min(cw * 0.5, W * 0.85), ry = H * 0.55;               // an ellipse that fits the canvas
        ctx.translate(cx, base - H * 0.38); ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, this.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      }
      ctx.restore();
      // the body, in strips from the feet up: the chest rises with each breath, the top bends further than the hips
      const strip = Math.max(2, Math.round(2 * dpr));
      const n = Math.max(8, Math.ceil(H * sy / strip));
      const srcH = img.naturalHeight / n, sw = img.naturalWidth;
      const lift = (v) => H * sy * (v + 0.022 * b * Math.max(0, v - 0.45));
      const jig = R.wobble * 0.02 * (0.5 + ex);
      for (let i = 0; i < n; i++) {
        const v0 = i / n, v1 = (i + 1) / n, vm = (v0 + v1) / 2;
        const y1 = feet - lift(v1), y0 = feet - lift(v0);
        const wx = W * sx * (1 + jig * Math.sin(t * 6 + vm * 9));
        const x = cx - wx / 2 + lean * vm * vm;
        ctx.drawImage(img, 0, img.naturalHeight - (i + 1) * srcH, sw, srcH, x, y1, wx, y0 - y1 + 0.6);
      }
      // sparks rising off an excited hero
      if (ex > 0.25 && !calm) {
        const rate = dt * 26 * ex, cnt = Math.min(8, Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0));
        for (let i = 0; i < cnt; i++) {
          this.sparks.push({ x: cx + (Math.random() - 0.5) * W * 0.9, y: base - Math.random() * H * 0.7, vx: (Math.random() - 0.5) * 12 * dpr,
            vy: -(18 + Math.random() * 40) * dpr, life: 0.6 + Math.random() * 0.8, age: 0, r: (0.8 + Math.random() * 1.6) * dpr });
        }
      }
      if (this.sparks.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.sparks = this.sparks.filter((p) => (p.age += dt) < p.life);
        for (const p of this.sparks) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.globalAlpha = 1 - p.age / p.life;
          ctx.fillStyle = p.age < p.life * 0.3 ? '#fff6d0' : this.color;
          ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        }
        ctx.restore();
      }
    },
  };
  a.setId(id);
  live.add(a);
  if (!raf) raf = requestAnimationFrame(tick);
  return a;
}

/** Wire an element so hovering it excites the hero (mouse), and a tap gives a short burst (touch). */
export function excitable(node, anim) {
  node.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') anim.hover(true); });
  node.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') anim.hover(false); });
  node.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') anim.burst(); });
}
