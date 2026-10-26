import { hexToRgb } from '../core/util.js';
// Procedural drawing of skill projectiles / orbiters and impact explosions.
import { G } from '../state.js';
import { TAU, rand, shade } from '../core/util.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { glowSprite, spawn, burst, addDecal, addEffect, Ring, Column, smoke, sparkle, addLight, elem } from './vfx.js';
import { replacementImage } from '../core/replacementart.js';
import { pixelSprite, shiftPalette } from './pixelart.js';
import { sfx } from '../core/audio.js';
import { drawNoteShape } from './notation.js';
import { drawCosmic, cosmicTrail } from './cosmos.js';
import { drawDkSkull } from './dkskull.js';
import { drawRuneblade3D, runeblade3DReady, runebladeLook, RUNEBLADE_LEN } from './runeblade3d.js';
import { drawHammer3D, headingOfScreen } from './hammer3d.js';

function glow(ctx, x, y, r, color, a = 1) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Draw a projectile-like object at world px (x, y) facing screen angle `a`.
 * s = size scale (1 = normal), E = element palette, t = time alive (for spin).
 */
export function drawShape(ctx, fx, x, y, a, s, E, t, extra = {}) {
  if (fx && fx[1] === '_' && fx[0] === 'n') { // a Bard note glyph
    ctx.save(); ctx.translate(x, y); drawNoteShape(ctx, fx.slice(2), s, t, (extra && extra.bardT) || 0); ctx.restore();
    return;
  }
  if (drawCosmic(ctx, fx, x, y, a, s, E, t, extra)) return; // the Astronomer's stars, comets, moons, planets
  ctx.save();
  ctx.translate(x, y);
  const spin = t * 18;
  switch (fx) {
    case 'arrow': case 'javelin': case 'spear': case 'bone': {
      const len = (fx === 'arrow' ? 14 : 22) * s;
      if (E.name !== 'Physical' || fx !== 'arrow') glow(ctx, 0, 0, 14 * s, E.glow, 0.7);
      ctx.rotate(a);
      ctx.strokeStyle = fx === 'bone' ? '#e8dcc0' : fx === 'arrow' ? '#6a4a2a' : '#8a6a3a';
      ctx.lineWidth = fx === 'arrow' ? 1.6 : 2.6 * s;
      ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len * 0.6, 0); ctx.stroke();
      ctx.fillStyle = fx === 'bone' ? '#fff8e0' : E.name === 'Physical' ? '#d0d8e0' : E.core;
      ctx.beginPath(); ctx.moveTo(len * 0.95, 0); ctx.lineTo(len * 0.45, -3.5 * s); ctx.lineTo(len * 0.45, 3.5 * s); ctx.fill();
      if (fx === 'arrow') { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(-len, -2.5, 4, 1.5); ctx.fillRect(-len, 1, 4, 1.5); }
      break;
    }
    case 'bullet': {
      glow(ctx, 0, 0, 8 * s, E.name === 'Physical' ? '#ffd060' : E.glow, 0.9);
      ctx.rotate(a);
      ctx.fillStyle = '#fff6c0'; ctx.fillRect(-6 * s, -1.3 * s, 10 * s, 2.6 * s);
      break;
    }
    case 'hammer': { // the 3D hammer (gfx/hammer3d.js), tumbling end over end along its line of flight
      if (drawHammer3D(ctx, 0, 0, { head: headingOfScreen(a), spin: -t * 13 - ((extra && extra.i) || 0), size: s, E, glow: 0.6, shadow: (extra && extra.lift) ?? 24 })) break;
      glow(ctx, 0, 0, 18 * s, E.glow, 0.8);
      ctx.rotate(spin * 0.6);
      ctx.fillStyle = '#7a5a30'; ctx.fillRect(-1.5 * s, -2 * s, 3 * s, 14 * s);
      ctx.fillStyle = E.name === 'Physical' ? '#b0b8c0' : E.core; ctx.strokeStyle = '#201008'; ctx.lineWidth = 1;
      ctx.fillRect(-7 * s, -8 * s, 14 * s, 7 * s); ctx.strokeRect(-7 * s, -8 * s, 14 * s, 7 * s);
      break;
    }
    case 'tshield': { // the Lancer's tower shield: upright, steel-rimmed, its face lit by the skill's element
      const sw = 11 * s * (0.7 + 0.3 * Math.abs(Math.cos(a))), sh = 24 * s;
      glow(ctx, 0, 0, 22 * s, E.glow, 0.55 + 0.15 * Math.sin(t * 8));
      ctx.fillStyle = '#20242c';
      ctx.beginPath(); ctx.moveTo(-sw - 1.5, -sh / 2 - 1.5); ctx.lineTo(sw + 1.5, -sh / 2 - 1.5); ctx.lineTo(sw + 1.5, sh * 0.3); ctx.lineTo(0, sh / 2 + 3); ctx.lineTo(-sw - 1.5, sh * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b8c4d4';
      ctx.beginPath(); ctx.moveTo(-sw, -sh / 2); ctx.lineTo(sw, -sh / 2); ctx.lineTo(sw, sh * 0.3); ctx.lineTo(0, sh / 2 + 1); ctx.lineTo(-sw, sh * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = E.name === 'Physical' ? '#5a6a88' : E.dark;
      ctx.beginPath(); ctx.moveTo(-sw * 0.72, -sh * 0.4); ctx.lineTo(sw * 0.72, -sh * 0.4); ctx.lineTo(sw * 0.72, sh * 0.24); ctx.lineTo(0, sh * 0.4); ctx.lineTo(-sw * 0.72, sh * 0.24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = E.name === 'Physical' ? '#e8eef8' : E.core; // a glowing cross emblem
      ctx.fillRect(-1.4 * s, -sh * 0.32, 2.8 * s, sh * 0.6); ctx.fillRect(-sw * 0.5, -sh * 0.12, sw, 2.8 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-sw, -sh / 2, sw * 0.35, sh * 0.75);
      break;
    }
    case 'dkblade': { // the Death Knight's thrown, falling and orbiting swords: his 3D Runeblade, the familiar's size, point first
      const L = runebladeLook((G.char && G.char.level) || 1), len = RUNEBLADE_LEN * (G.touch ? 0.85 : 1) * s;
      if (runeblade3DReady(L.skin)) {
        glow(ctx, 0, 0, len * 0.55, E.glow, 0.55);
        if (drawRuneblade3D(ctx, -Math.cos(a) * len / 2, -Math.sin(a) * len / 2, a, len, { skin: L.skin, palette: L.palette, spin: t * 9, tilt: 0.25, glow: E.glow, glowAmt: 0.3 })) break;
      }
      fx = 'blade';
    }
    // falls through to the drawn blade while the model loads
    case 'blade': case 'axe': case 'chakram': case 'rang': case 'disc': {
      glow(ctx, 0, 0, 14 * s, E.glow, E.name === 'Physical' ? 0.35 : 0.75);
      ctx.rotate(spin);
      ctx.fillStyle = E.name === 'Physical' ? '#d8e0e8' : E.core; ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 1;
      if (fx === 'rang') {
        ctx.fillStyle = E.name === 'Physical' ? '#c89a50' : E.core;
        ctx.beginPath(); ctx.moveTo(-9 * s, -6 * s); ctx.quadraticCurveTo(0, 0, 9 * s, -6 * s); ctx.lineTo(8 * s, -2 * s); ctx.quadraticCurveTo(0, 4 * s, -8 * s, -2 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (fx === 'chakram' || fx === 'disc') {
        ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, TAU); ctx.arc(0, 0, 3.5 * s, 0, TAU, true); ctx.fill();
        for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(6 * s, -2 * s); ctx.lineTo(10 * s, 0); ctx.lineTo(6 * s, 2 * s); ctx.fill(); }
      } else if (fx === 'axe') {
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-1, -8 * s, 2, 16 * s);
        ctx.fillStyle = '#c8d0d8'; ctx.beginPath(); ctx.moveTo(0, -8 * s); ctx.quadraticCurveTo(9 * s, -6 * s, 8 * s, 2 * s); ctx.lineTo(0, -2 * s); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(-10 * s, 0); ctx.lineTo(0, -2 * s); ctx.lineTo(11 * s, 0); ctx.lineTo(0, 2 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c0a040'; ctx.fillRect(-11 * s, -3 * s, 2 * s, 6 * s);
      }
      break;
    }
    case 'dkskull': { // Death Coil: the contact skull in frost, rocking as it flies, a cold glow behind
      glow(ctx, 0, 0, 20 * s, '#40c0ff', 0.85);
      glow(ctx, 0, 0, 12 * s, E.glow, 0.6);
      if (drawDkSkull(ctx, 0, 0, 17 * s, '#e8f4ff', Math.sin(t * 9) * 0.18)) break;
      fx = 'skull';
    }
    // falls through to the drawn skull while the art loads
    case 'skull': case 'spirit': {
      glow(ctx, 0, 0, 18 * s, E.glow, 0.9);
      ctx.fillStyle = fx === 'skull' ? '#f0e8d8' : E.core;
      ctx.globalAlpha = fx === 'spirit' ? 0.8 : 1;
      ctx.beginPath(); ctx.arc(0, -1 * s, 5 * s, 0, TAU); ctx.fill();
      if (fx === 'skull') {
        ctx.fillRect(-3 * s, 2 * s, 6 * s, 3 * s);
        ctx.fillStyle = E.glow; ctx.fillRect(-3 * s, -2 * s, 2 * s, 2 * s); ctx.fillRect(1 * s, -2 * s, 2 * s, 2 * s);
      } else {
        ctx.rotate(a + Math.PI);
        ctx.beginPath(); ctx.moveTo(0, -4 * s); ctx.quadraticCurveTo(10 * s, Math.sin(t * 20) * 4, 16 * s, 0); ctx.quadraticCurveTo(10 * s, 3, 0, 4 * s); ctx.fill();
      }
      break;
    }
    case 'shard': case 'ice': case 'tooth': {
      glow(ctx, 0, 0, 10 * s, E.glow, 0.7);
      ctx.rotate(a);
      ctx.fillStyle = fx === 'tooth' ? '#f8f0e0' : E.core; ctx.strokeStyle = shade(E.glow, -0.2); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9 * s, 0); ctx.lineTo(0, -3 * s); ctx.lineTo(-6 * s, 0); ctx.lineTo(0, 3 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 'crow': case 'feather': case 'locust': {
      if (fx === 'locust') {
        for (let i = 0; i < 6; i++) {
          const aa = t * 12 + i * 1.7, rr = 4 + (i % 3) * 2;
          ctx.fillStyle = i % 2 ? '#2a3010' : E.glow;
          ctx.fillRect(Math.cos(aa) * rr * s - 1, Math.sin(aa * 1.3) * rr * 0.6 * s - 1, 2.4, 2);
        }
        break;
      }
      glow(ctx, 0, 0, 12 * s, E.glow, 0.5);
      ctx.rotate(a);
      if (fx === 'feather') {
        ctx.fillStyle = E.name === 'Physical' ? '#d0c8e0' : E.core;
        ctx.beginPath(); ctx.ellipse(0, 0, 8 * s, 2.5 * s, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#302040'; ctx.beginPath(); ctx.moveTo(-9 * s, 0); ctx.lineTo(8 * s, 0); ctx.stroke();
      } else {
        const flap = Math.sin(t * 30) * 5 * s;
        ctx.fillStyle = '#140c18';
        ctx.beginPath(); ctx.moveTo(6 * s, 0); ctx.lineTo(-2 * s, -6 * s - flap); ctx.lineTo(-4 * s, 0); ctx.lineTo(-2 * s, 6 * s + flap); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff3030'; ctx.fillRect(3 * s, -1, 2, 2);
      }
      break;
    }
    case 'note': {
      glow(ctx, 0, 0, 12 * s, E.glow, 0.8);
      ctx.fillStyle = E.core; ctx.strokeStyle = E.core; ctx.lineWidth = 1.8 * s;
      ctx.rotate(Math.sin(t * 8) * 0.3);
      ctx.beginPath(); ctx.ellipse(-2 * s, 4 * s, 3.2 * s, 2.4 * s, -0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1 * s, 3.5 * s); ctx.lineTo(1 * s, -7 * s); ctx.lineTo(6 * s, -4 * s); ctx.stroke();
      break;
    }
    case 'blob': case 'acid': case 'blood': {
      glow(ctx, 0, 0, 12 * s, E.glow, 0.6);
      ctx.fillStyle = fx === 'blood' ? '#a00808' : E.glow;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * s * (1 + Math.sin(t * 15) * 0.1), 5 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-2 * s, -2 * s, 1.6 * s, 0, TAU); ctx.fill();
      break;
    }
    case 'star': case 'firework': {
      glow(ctx, 0, 0, 14 * s, E.glow, 0.9);
      ctx.rotate(spin * 0.5);
      ctx.fillStyle = fx === 'firework' ? `hsl(${(t * 400) % 360},100%,70%)` : E.core;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.5 * s : 7 * s, aa = (i / 10) * TAU; ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); }
      ctx.fill();
      break;
    }
    case 'rocket': {
      glow(ctx, 0, 0, 12 * s, '#ff8020', 0.8);
      ctx.rotate(a);
      ctx.fillStyle = '#8a8a90'; ctx.fillRect(-7 * s, -2.5 * s, 12 * s, 5 * s);
      ctx.fillStyle = '#c02010'; ctx.beginPath(); ctx.moveTo(5 * s, -2.5 * s); ctx.lineTo(9 * s, 0); ctx.lineTo(5 * s, 2.5 * s); ctx.fill();
      ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(-7 * s, -2 * s); ctx.lineTo(-12 * s - Math.random() * 4, 0); ctx.lineTo(-7 * s, 2 * s); ctx.fill();
      break;
    }
    case 'bomb': case 'rock': case 'totem': case 'meteor': {
      const big = fx === 'meteor' ? 2 : 1;
      if (fx === 'meteor') glow(ctx, 0, 0, 26 * s, E.glow, 1);
      ctx.rotate(spin * 0.3);
      ctx.fillStyle = fx === 'bomb' ? '#2a2a30' : fx === 'totem' ? '#7a4a2a' : fx === 'meteor' ? shade(E.dark, -0.2) : '#6a6058';
      ctx.strokeStyle = '#0a0606'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 5.5 * s * big, 0, TAU); ctx.fill(); ctx.stroke();
      if (fx === 'meteor') { ctx.fillStyle = E.core; ctx.beginPath(); ctx.arc(-2 * s, -2 * s, 3 * s, 0, TAU); ctx.fill(); }
      if (fx === 'bomb') { ctx.fillStyle = '#ffd040'; ctx.fillRect(3 * s, -7 * s, 2.5, 2.5); }
      if (fx === 'rock') { ctx.fillStyle = '#8a8078'; ctx.fillRect(-3 * s, -3 * s, 3 * s, 2 * s); }
      break;
    }
    case 'wave': {
      ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i === 0 ? E.glow : E.core; ctx.globalAlpha = 0.9 - i * 0.25; ctx.lineWidth = (5 - i) * s;
        ctx.beginPath(); ctx.arc(-6 * s - i * 4, 0, 12 * s, -0.9, 0.9); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'wolf': case 'dragon': {
      glow(ctx, 0, 0, 18 * s, E.glow, 0.7);
      const painted = replacementImage('fx_' + fx, { tint: [...hexToRgb(E.glow), 0.7] });
      const img = painted || pixelSprite(fx === 'wolf' ? 'hound' : 'dragon', fx === 'wolf' ? { a: E.glow, e: '#ffffff', r: E.core } : { a: E.glow, c: E.dark, w: E.core, e: '#ffffff' }, 3);
      const flip = Math.cos(a) < 0;
      ctx.globalAlpha = 0.9;
      if (flip) ctx.scale(-1, 1);
      const k = painted ? 24 * s / img.height : 0.44 * s;
      ctx.drawImage(img, -img.width * k / 2, -img.height * k * 0.68, img.width * k, img.height * k);
      break;
    }
    case 'rune': case 'card': {
      glow(ctx, 0, 0, 12 * s, E.glow, 0.7);
      ctx.rotate(spin * 0.4);
      if (fx === 'card') {
        ctx.fillStyle = '#f8f0e0'; ctx.strokeStyle = '#300'; ctx.fillRect(-4 * s, -6 * s, 8 * s, 12 * s); ctx.strokeRect(-4 * s, -6 * s, 8 * s, 12 * s);
        ctx.fillStyle = Math.floor(t * 4) % 2 ? '#c01010' : '#101010'; ctx.beginPath(); ctx.arc(0, 0, 2 * s, 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = E.core; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4 * s, -3 * s); ctx.lineTo(4 * s, 3 * s); ctx.moveTo(4 * s, -3 * s); ctx.lineTo(-4 * s, 3 * s); ctx.moveTo(0, -5 * s); ctx.lineTo(0, 5 * s); ctx.stroke();
      }
      break;
    }
    case 'fireball': {
      glow(ctx, 0, 0, 20 * s, E.glow, 1);
      glow(ctx, 0, 0, 9 * s, E.core, 1);
      break;
    }
    case 'chain': {
      ctx.fillStyle = '#a0a0b0'; ctx.strokeStyle = '#202020';
      ctx.beginPath(); ctx.arc(0, 0, 4 * s, 0, TAU); ctx.fill(); ctx.stroke();
      glow(ctx, 0, 0, 10 * s, E.glow, 0.6);
      break;
    }
    default: { // bolt, orb, missile, spark, etc.
      const big = fx === 'orb' ? 1.6 : fx === 'spark' ? 0.7 : 1;
      glow(ctx, 0, 0, 16 * s * big, E.glow, 0.9);
      glow(ctx, 0, 0, 6 * s * big, E.core, 1);
      if (fx === 'orb') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = E.core; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(0, 0, 7 * s, spin * 0.3, spin * 0.3 + 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 9 * s, -spin * 0.4, -spin * 0.4 + 1.5); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  ctx.restore();
}

/** Trail particles emitted by projectiles each frame. */
export function trail(fx, x, y, z, E, dt, s = 1) {
  if (cosmicTrail(fx, x, y, z, E, dt, s)) return;
  const p = Math.random();
  switch (fx) {
    case 'fireball': case 'meteor': case 'rocket':
      if (p < dt * 60) spawn({ type: 'glow', x: x + rand(-0.05, 0.05), y: y + rand(-0.05, 0.05), z: z + rand(-3, 3), vz: rand(5, 25), life: rand(0.2, 0.45), size: rand(2, 4) * s, size1: 0, color: Math.random() < 0.5 ? E.glow : E.core, add: true });
      if (fx !== 'fireball' && p < dt * 20) smoke(x, y, z, '#2a2420', 1, 4);
      break;
    case 'orb': case 'bolt': case 'missile': case 'spirit': case 'skull': case 'dkskull': case 'dkblade': case 'spark': case 'star': case 'note':
      if (p < dt * 40) spawn({ type: 'glow', x, y, z, vz: rand(-5, 5), life: rand(0.2, 0.4), size: rand(1.5, 3) * s, size1: 0, color: E.glow, add: true });
      break;
    case 'blob': case 'acid':
      if (p < dt * 20) spawn({ type: 'dot', x, y, z, vz: -20, g: 200, life: 0.6, size: 2, color: E.glow });
      break;
    case 'pshield': // Shield Throw: a streak of holy light behind the shield
      if (p < dt * 40) spawn({ type: 'glow', x: x + rand(-0.05, 0.05), y: y + rand(-0.05, 0.05), z: z + rand(-3, 3), vz: rand(-6, 6), life: rand(0.2, 0.4), size: rand(1.5, 3) * s, size1: 0, color: Math.random() < 0.7 ? E.glow : '#ffffff', add: true });
      break;
    case 'shard':
      if (p < dt * 25) spawn({ type: 'dot', x, y, z, vz: rand(-10, 10), life: 0.4, size: 1.5, color: E.core, add: true });
      break;
    default:
      if (E.name !== 'Physical' && p < dt * 18) spawn({ type: 'glow', x, y, z, life: 0.3, size: 2, size1: 0, color: E.glow, add: true });
  }
}

/** Impact / explosion visuals (no damage). size in tiles. */
export function explosionFx(x, y, r, el, fx = 'explosion', opts = {}) {
  const E = elem(el);
  const big = r >= 1.6;
  addEffect(new Ring(x, y, 0.2, r, 0.35 + r * 0.08, E.glow, 4 + r * 2, { fill: true }));
  if (big) addEffect(new Ring(x, y, 0.1, r * 1.25, 0.6, E.core, 2));
  burst(x, y, 10, el, Math.min(160, Math.round(14 + r * 12)), 2.5 + r * 2, { size: 1.2 });
  spawn({ type: 'glow', x, y, z: 12, life: 0.25, size: 18 * r, size1: 26 * r, color: E.core, add: true });
  addLight(x, y, 4 + r * 3, 1.4);
  switch (fx) {
    case 'meteor': case 'nuke': case 'eruption':
      for (let i = 0; i < 8 + r * 4; i++) {
        const a = rand(TAU), s = rand(1, 4) * r;
        spawn({ type: 'gib', x, y, z: 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(60, 200), g: 400, life: rand(1, 2), size: rand(2, 4), color: fx === 'eruption' && el === 'phys' ? '#6a6058' : shade(E.dark, -0.2), w: 1, bounces: 2, rot: 0, vr: rand(-8, 8) });
      }
      smoke(x, y, 6, '#1a1410', 6 + Math.round(r * 3), 10 * r);
      addDecal(x, y, 'rgba(10,6,4,0.75)', r * 0.75, 'scorch', 0.8);
      if (fx === 'nuke') { addEffect(new Ring(x, y, 0.3, r * 2.2, 1.2, '#ffffff', 10)); G.flash = 0.6; }
      break;
    case 'pillar': case 'holy':
      addEffect(new Column(x, y, E.glow, 0.5, 26 * Math.max(1, r * 0.8), 300));
      break;
    case 'void':
      addEffect(new Ring(x, y, r * 1.4, 0.1, 0.5, E.glow, 6));
      smoke(x, y, 10, '#100018', 6, 12);
      break;
    case 'firework':
      for (let i = 0; i < 30; i++) {
        const a = rand(TAU), s = rand(2, 6);
        spawn({ type: 'glow', x, y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(-40, 80), g: 80, drag: 1.5, life: rand(0.5, 1), size: 2.5, size1: 0, color: `hsl(${rand(360)},100%,65%)`, add: true });
      }
      break;
    case 'sonic':
      for (let i = 0; i < 3; i++) addEffect(new Ring(x, y, 0.1, r * (0.7 + i * 0.3), 0.3 + i * 0.12, E.glow, 3));
      break;
    case 'blizzard': case 'frost':
      addDecal(x, y, '#b0e0ff', r * 0.8, 'frost', 0.6);
      break;
    default:
      if (el === 'fire') addDecal(x, y, 'rgba(12,6,4,0.6)', r * 0.6, 'scorch', 0.7);
  }
  if (opts.shake !== false) camera.shake(Math.min(14, 2 + r * 3 * (opts.shakeMul ?? 1)));
  if (opts.sound !== false) sfx(r > 1.2 || fx === 'meteor' || fx === 'nuke' || el === 'fire' ? 'explode' : E.sfx, Math.min(1, 0.5 + r * 0.25));
}

/** Small hit spark at a target. */
export function hitSpark(x, y, z, el) {
  const E = elem(el);
  burst(x, y, z, el, 5, 2.2, { size: 0.8, life: 0.6 });
  if (el === 'light') sparkle(x, y, z, E.core, 2, 0.2);
}

export { isoX, isoY, HW, HH, shiftPalette };
