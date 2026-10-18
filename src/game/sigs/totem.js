// Totem Master: the Spirit Pole. A little carved totem pole floats over his head and grows a face for every two
// spells he casts; the face is the spirit of the tree the spell came from (Totems: the bear, Ancestors: the wolf,
// Earth & Storm: the thunderbird, the fourth tree: the serpent). Four faces and the pole slams into the earth as
// a GREAT TOTEM, as tall as a house, for eight seconds: the bear heals him and roars foes back, the wolf howls them
// slow, the thunderbird calls lightning, the serpent spits venom. The same spirit twice works twice.
import { G, later, stat, power, sigO, crowd, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, Bolt, Beam, floatText, spawn, burst, smoke } from '../../gfx/vfx.js';
import { hit, aoe } from '../combat.js';

const FACES = 4, KINDS = ['bear', 'wolf', 'eagle', 'serpent'], TEAL = '#5ac8a0';
const PAINT = { bear: '#a0582a', wolf: '#8a92a0', eagle: '#c8402a', serpent: '#4a9a40' };
const SPIRIT = { bear: '#ffb060', wolf: '#c0d8ff', eagle: '#a8ccff', serpent: '#90ff60' };

/** A carved face on the pole, w x h at (x, y) top-left; `lit` glows its eyes. */
function face(ctx, kind, x, y, w, h, lit) {
  const u = w / 8;
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(x, y, w, h);                       // the log
  ctx.fillStyle = PAINT[kind]; ctx.fillRect(x + u * 0.5, y + u * 0.5, w - u, h - u);
  ctx.fillStyle = '#2a1608'; ctx.fillRect(x, y + h - u * 0.6, w, u * 0.6);    // the seam to the next face
  const eye = lit ? SPIRIT[kind] : '#1a1008';
  if (kind === 'bear') {
    ctx.fillStyle = PAINT.bear; ctx.fillRect(x - u * 0.5, y - u, u * 2, u * 1.6); ctx.fillRect(x + w - u * 1.5, y - u, u * 2, u * 1.6); // round ears
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.6, y + u * 2, u * 1.2, u * 1.2); ctx.fillRect(x + w - u * 2.8, y + u * 2, u * 1.2, u * 1.2);
    ctx.fillStyle = '#e0b080'; ctx.fillRect(x + u * 2.5, y + u * 3.6, u * 3, u * 2.2); ctx.fillStyle = '#1a1008'; ctx.fillRect(x + u * 3.4, y + u * 3.8, u * 1.2, u * 0.8);
  } else if (kind === 'wolf') {
    ctx.fillStyle = PAINT.wolf; ctx.beginPath(); ctx.moveTo(x, y + u); ctx.lineTo(x + u, y - u * 2); ctx.lineTo(x + u * 2.6, y + u); ctx.moveTo(x + w, y + u); ctx.lineTo(x + w - u, y - u * 2); ctx.lineTo(x + w - u * 2.6, y + u); ctx.fill(); // pointed ears
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.4, y + u * 2.2, u * 1.6, u * 0.9); ctx.fillRect(x + w - u * 3, y + u * 2.2, u * 1.6, u * 0.9);
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x + u * 2.6, y + u * 3.4, u * 2.8, u * 2.6); ctx.fillStyle = '#1a1008'; ctx.fillRect(x + u * 3.3, y + u * 3.4, u * 1.4, u);
  } else if (kind === 'eagle') {
    ctx.fillStyle = '#2a8a9a'; ctx.fillRect(x + u * 0.5, y + u * 0.5, w - u, u * 1.4); // a painted brow
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.3, y + u * 2.2, u * 1.4, u * 1.4); ctx.fillRect(x + w - u * 2.7, y + u * 2.2, u * 1.4, u * 1.4);
    ctx.fillStyle = '#ffc040'; ctx.beginPath(); ctx.moveTo(x + u * 2.6, y + u * 3.4); ctx.lineTo(x + w - u * 2.6, y + u * 3.4); ctx.lineTo(x + w / 2, y + h + u * 0.6); ctx.closePath(); ctx.fill(); // the hooked beak
  } else {
    ctx.fillStyle = eye; ctx.fillRect(x + u * 1.5, y + u * 2, u * 1.6, u * 1.6); ctx.fillRect(x + w - u * 3.1, y + u * 2, u * 1.6, u * 1.6);
    ctx.fillStyle = '#1a1008'; ctx.fillRect(x + u * 2.1, y + u * 2, u * 0.5, u * 1.6); ctx.fillRect(x + w - u * 2.5, y + u * 2, u * 0.5, u * 1.6); // slit pupils
    ctx.fillStyle = '#ff3050'; ctx.fillRect(x + w / 2 - u * 0.3, y + u * 4.2, u * 0.6, u * 1.8); ctx.fillRect(x + w / 2 - u * 0.9, y + u * 5.8, u * 0.6, u * 0.8); ctx.fillRect(x + w / 2 + u * 0.3, y + u * 5.8, u * 0.6, u * 0.8); // forked tongue
  }
  if (lit) glow(ctx, SPIRIT[kind], x + w / 2, y + h * 0.35, w * 0.7, 0.35);
}
/** Thunderbird wings that crown a full pole. */
function wings(ctx, x, y, w, open) {
  ctx.fillStyle = '#c8402a';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + s * w * 0.3, y); ctx.lineTo(x + s * w * (0.6 + 0.9 * open), y - w * 0.5 * open - 2); ctx.lineTo(x + s * w * (0.5 + 0.6 * open), y + w * 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a8a9a'; ctx.fillRect(x + s * w * (0.45 + 0.4 * open) - 1, y - w * 0.15 * open, 2, 2); ctx.fillStyle = '#c8402a';
  }
}

class GreatTotem {
  constructor(p, x, y, faces) { Object.assign(this, { p, x, y, faces, t: 0, dur: 8, cd: faces.map((_, i) => 0.6 + i * 0.3) }); }
  get depth() { return this.x + this.y; }
  update(dt) {
    const p = this.p, w = this.world, up = this.t > 0.4 && this.t < this.dur;
    this.t += dt;
    if (up && !p.dead) this.faces.forEach((k, i) => { if ((this.cd[i] -= dt) <= 0) { this.cd[i] = 1.2; this.act(k, i); } });
    return this.t < this.dur + 0.5;
  }
  /** Where face i sits, in tile + z. */
  at(i) { return [this.x, this.y, 6 + (this.faces.length - 1 - i) * 30 + 15]; }
  act(k, i) {
    const p = this.p, w = this.world, P = power(p), [x, y, z] = this.at(i);
    if (k === 'bear') {
      if (Math.hypot(p.x - x, p.y - y) < 8) { p.heal(p.maxHp * 0.025); burst(p.x, p.y, 30, 'holy', 6, 1.5); }
      addEffect(new Ring(x, y, 0.2, 2.5, 0.4, SPIRIT.bear, 4)); aoe(w, p, x, y, 2.5, P * 0.6, 'phys', sigO({ knock: 1 }));
    } else if (k === 'wolf') {
      addEffect(new Ring(x, y, 0.2, 4.5, 0.6, SPIRIT.wolf, 3)); addEffect(new Ring(x, y, 0.2, 3.5, 0.5, '#ffffff', 1));
      for (const c of foesNear(p, x, y, 4.5)) { hit(p, c, P * 0.5, 'cold', sigO({ slow: true })); }
      if (Math.random() < 0.4) sfx('roar', 0.25);
    } else if (k === 'eagle') {
      const c = foesNear(p, x, y, 7)[Math.floor(rand(3))] || foesNear(p, x, y, 7)[0];
      if (c) { addEffect(new Bolt(x, y, z + 10, c.x, c.y, 20, SPIRIT.eagle, 0.3, 3)); hit(p, c, P * 1.2, 'light', sigO({ noArc: false })); sfx('light', 0.5); }
    } else {
      const c = foesNear(p, x, y, 6)[0];
      if (c) { addEffect(new Beam(x, y, c.x, c.y, SPIRIT.serpent, 4, 0.3, { z, core: '#e8ff90' })); hit(p, c, P * 0.9, 'poison', sigO({ poison: true })); burst(c.x, c.y, 28, 'poison', 8, 2); }
    }
  }
  draw(ctx) {
    const t = this.t, rise = Math.min(1, t / 0.4) * Math.min(1, Math.max(0, (this.dur + 0.5 - t) / 0.5));
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), W = 36, H = 30, n = this.faces.length, tall = n * H;
    ctx.save();
    ctx.beginPath(); ctx.rect(px - 80, py - 400, 160, 400); ctx.clip(); // it grows out of the ground
    const top = py - tall * rise - 6;
    glow(ctx, TEAL, px, top + tall / 2, tall * 0.8, 0.3);
    this.faces.forEach((k, i) => face(ctx, k, px - W / 2, top + i * H, W, H, (this.cd[i] > 1.0) || t < 0.6));
    wings(ctx, px, top, W * 1.2, 1);
    ctx.restore();
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, py, 22, 8, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
}

export default {
  id: 'totem_master', name: 'Spirit Pole', color: TEAL,
  desc: 'A carved pole over his head grows a spirit face for every two spells: bear, wolf, thunderbird or serpent by the spell\'s tree. Four faces and it slams down as a GREAT TOTEM that heals, howls, calls lightning and spits venom.',
  init: () => ({ faces: [], prog: 0, flash: 0, slam: 0 }),
  cast(p, s, sk) {
    if (s.faces.length >= FACES || (sk.m.free && Math.random() < 0.5)) return;
    if (++s.prog < 2) return;
    s.prog = 0; s.flash = 0.6;
    s.faces.push(KINDS[Number(String(sk.id).split('.')[1]) % 4] || 'bear');
  },
  update(p, s, dt) {
    s.flash = Math.max(0, s.flash - dt * 2); s.slam = Math.max(0, s.slam - dt);
    if (s.faces.length >= FACES && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (foesNear(p, p.x, p.y, 8).length) this.fire(p, s); }
  },
  fill: (s) => s.faces.length / FACES,
  fire(p, s) {
    while (s.faces.length < FACES) s.faces.push(KINDS[s.faces.length]);
    const c = crowd(p, 6), w = p.world;
    let [x, y] = c || [p.x + 1.5, p.y + 1.5];
    const a = Math.atan2(y - p.y, x - p.x), d = Math.min(3, Math.hypot(x - p.x, y - p.y)); // planted between him and them
    x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d;
    if (!w.map.walkable(x, y)) { x = p.x; y = p.y; }
    w.addHazard(new GreatTotem(p, x, y, s.faces.splice(0)));
    s.slam = 0.5;
    addEffect(new Ring(x, y, 0.2, 2.2, 0.45, TEAL, 6, { fill: true }));
    smoke(x, y, 4, '#6a5a40', 8, 12);
    for (let i = 0; i < 16; i++) { const b = rand(TAU), v = rand(1.5, 4); spawn({ type: 'shard', x, y, z: 2, vx: Math.cos(b) * v, vy: Math.sin(b) * v, vz: rand(60, 140), g: 300, life: rand(0.4, 0.8), size: rand(2, 4), size1: 1, color: '#5a4a30', rot: b }); }
    floatText(x, y, 120, 'GREAT TOTEM', TEAL, 18, { life: 1.8, vz: 14 });
    camera.shake(7); sfx('thud', 1);
    later(w, 0.3, () => sfx('roar', 0.4));
    stat('totem_master', 'fire');
  },
  draw(ctx, p, s, t) {
    const [cx, cy] = headAt(p, 4), n = s.faces.length, W = G.touch ? 9 : 11, H = Math.round(W * 0.85);
    const bob = Math.sin(t * 2) * 1.5;
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#3a2412'; ctx.fillRect(cx - 1, cy - 3 + bob, 2, 4); ctx.globalAlpha = 1; // the stub it grows from
    for (let i = 0; i < FACES; i++) { // empty sockets show what is to come
      const y = cy - (i + 1) * H + bob;
      if (i < n) face(ctx, s.faces[i], cx - W / 2, y, W, H, i === n - 1 && s.flash > 0);
      else { ctx.globalAlpha = 0.2; ctx.strokeStyle = '#c0a080'; ctx.lineWidth = 1; ctx.strokeRect(cx - W / 2 + 0.5, y + 0.5, W - 1, H - 1); ctx.globalAlpha = 1; }
    }
    if (n >= FACES) wings(ctx, cx, cy - FACES * H + bob, W * 1.2, 0.6 + 0.4 * Math.sin(t * 6));
  },
};
