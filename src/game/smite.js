// Divine Smite: a second meter beside MADNESS that fills from kills (champions, uniques and guardians count more).
// When it is full the SMITE button (or F) arms it, and the next tap or click on the world calls a pillar of holy
// fire down on that spot. Only ever fired by the player (auto-play never arms it), and the tap that aims it never
// moves the hero or takes over from auto-play (spectate.js catches it first).
// Wiring: happenings.onKill -> smiteKill, hud.js shows the meter/button, spectate.js -> smiteAt.
import { G } from '../state.js';
import { rand, chance, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, Column, burst, sparkle, spawn, floatText, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit } from './combat.js';
import { UI } from '../ui/ui.js';

export const SMITE_KILLS = 45; // plain kills to fill the meter
export const SMITE_R = 3.4; // blast radius (tiles)
const WORTH = { normal: 1, champion: 3, unique: 6, boss: 12, raid: 12 };
// at least this share of a foe's life goes per smite, by rank (normal packs vanish, a guardian loses a chunk)
const SHARE = { normal: 0.9, champion: 0.4, unique: 0.28, boss: 0.08, raid: 0.04 };
let striking = false; // a smite's own kills don't feed the next one

export const smiteReady = () => !!G.char && (G.char.smite || 0) >= 1 && !!G.world && G.world.kind === 'dungeon' && !!G.player && !G.player.dead;
export const smiteArmed = () => !!G.smiteArmed && smiteReady();

/** A kill feeds the meter. */
export function smiteKill(m) {
  const c = G.char;
  if (!c || striking || m.team !== 'enemy' || m.summon || (c.smite || 0) >= 1) return;
  c.smite = Math.min(1, (c.smite || 0) + (WORTH[m.rank] || 1) / SMITE_KILLS);
  if (c.smite >= 1) { sfx('holy', 0.5); UI.log(`SMITE is ready: press SMITE (F), then ${G.touch ? 'tap' : 'click'} where the heavens should strike.`, '#ffe070'); }
}

/** The button / F key: arm (or disarm) the strike. */
export function toggleSmite(v = !G.smiteArmed) {
  if (v && !smiteReady()) return false;
  G.smiteArmed = v;
  if (v) { sfx('ui'); UI.centerMsg('SMITE', `${G.touch ? 'Tap' : 'Click'} where the heavens should strike`, 1.8); } else hideBanner();
  return true;
}
function hideBanner() { if (UI.msgEl && /^SMITE/.test(UI.msgEl.textContent)) UI.msgEl.style.opacity = '0'; }

/** Call the strike down on tile (x, y). */
export function smiteAt(x, y) {
  const w = G.world, p = G.player, c = G.char;
  if (!smiteReady()) { G.smiteArmed = false; return false; }
  G.smiteArmed = false;
  c.smite = 0;
  hideBanner();
  c.smites = (c.smites || 0) + 1;
  addEffect(new Column(x, y, '#fff0a0', 0.55, 34, 520));
  addEffect(new Ring(x, y, SMITE_R, 0.3, 0.4, '#ffe070', 3));
  sfx('holy', 0.8);
  setTimeout(() => {
    if (G.world !== w || !G.player) return;
    explosionFx(x, y, 2.4, 'holy', 'explosion', { sound: false });
    addEffect(new Ring(x, y, 0.2, SMITE_R + 0.4, 0.5, '#fff6c0', 7));
    addEffect(new Ring(x, y, 0.2, SMITE_R * 0.6, 0.35, '#ffd040', 4, { fill: true }));
    burst(x, y, 20, 'holy', 40, 6);
    sparkle(x, y, 30, '#ffffff', 24, SMITE_R * 0.5);
    for (let i = 0; i < 18; i++) { const a = rand(TAU), r = rand(0.3, SMITE_R); spawn({ type: 'glow', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: 0, vz: rand(80, 200), life: rand(0.5, 1), size: rand(3, 6), size1: 0, color: chance(0.5) ? '#ffe070' : '#ffffff', add: true }); }
    camera.shake(10); G.flash = Math.max(G.flash || 0, 0.35);
    sfx('explode', 0.8); sfx('boss', 0.35);
    const base = heroHit(p) * 14;
    let n = 0;
    striking = true;
    try {
      for (const m of w.hostiles('player', x, y, SMITE_R)) {
        if (m.team !== 'enemy' || m.dead) continue;
        const rank = m.raid ? 'raid' : m.rank || 'normal';
        if (hit(p, m, Math.max(base, m.maxHp * (SHARE[rank] ?? 0.5)), 'holy', { noArc: true, knock: 1.2 }) > 0) n++;
      }
    } finally { striking = false; }
    floatText(x, y, 90, n ? `SMITE ×${n}` : 'SMITE', '#ffe070', 22, { life: 1.6 });
  }, 380);
  return true;
}

/** About one of the hero's main-skill hits (the same yardstick as falling stars and shrine lightning). */
function heroHit(p) {
  const wpn = p.st.weapon;
  return Math.max(10, ((wpn[0] + wpn[1]) / 2) * (1 + (p.st.dmgPct + p.st.primary) / 100) * 1.5);
}

/** The aiming reticle under the mouse while armed (desktop; touch aims with the tap itself). Drawn in world space. */
export const reticle = {
  layer: 'top', add: true,
  update() { return true; },
  draw(ctx) {
    if (!smiteArmed() || G.touch || !G.input || G.input.lastPointerType !== 'mouse') return;
    const [x, y] = camera.screenToTile(G.input.mouse.x, G.input.mouse.y);
    const px = isoX(x, y), py = isoY(x, y), t = G.time;
    ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 8);
    ctx.beginPath(); ctx.ellipse(px, py, SMITE_R * 32 * Math.SQRT2, SMITE_R * 16 * Math.SQRT2, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.drawImage(glowSprite('#ffd040'), px - 18, py - 18, 36, 36);
    ctx.globalAlpha = 1;
  },
};
