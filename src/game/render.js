// World renderer: floors, decals, depth-sorted walls/entities, effects, lighting, minimap.
import { G } from '../state.js';
import { camera, isoX, isoY, HW, HH, TW, TH } from '../core/view.js';
import { makeCanvas, TAU, clamp, rgba, shade, hexToRgb } from '../core/util.js';
import { drawDecals, drawEffects, drawParticles, drawTexts, lights, glowSprite } from '../gfx/vfx.js';
import { pixelSprite } from '../gfx/pixelart.js';
import { classSprite } from '../core/assets.js';
import { drawLootLabels } from './loot.js';

const WALL_K = (HW * 1.06) / 66;

let lightCanvas = null, vignette = null, vigKey = '';

function floorEntry(world, v) {
  if (world.townTiles) return world.townTiles[v] || world.townTiles[0];
  const ts = world.tileset;
  return v >= 100 ? ts.details[v - 100] || ts.floors[0] : ts.floors[v] || ts.floors[0];
}

function segRect(s) {
  const spr = s.spr;
  const k = WALL_K;
  const lx = isoX(s.lx, s.ly), ly = isoY(s.lx, s.ly);
  const yl = s.flip ? spr.base + spr.slope * spr.w : spr.base;
  return [lx - 1, ly - yl * k + 2, spr.w * k, spr.h * k];
}

function drawSeg(ctx, s, alpha) {
  const spr = s.spr;
  const [dx, dy, w, h] = segRect(s);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (s.flip) {
    ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1);
    ctx.drawImage(spr.img, spr.sx, spr.sy, spr.w, spr.h, 0, 0, w, h);
    ctx.restore();
  } else ctx.drawImage(spr.img, spr.sx, spr.sy, spr.w, spr.h, dx, dy, w, h);
  if (alpha < 1) ctx.globalAlpha = 1;
}

function drawPillar(ctx, p, alpha) {
  const spr = p.spr;
  const k = WALL_K * 1.05;
  const x = isoX(p.x, p.y), y = isoY(p.x, p.y);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(spr.img, spr.sx, spr.sy, spr.w, spr.h, x - (spr.w * k) / 2, y - spr.h * k + 4, spr.w * k, spr.h * k);
  if (alpha < 1) ctx.globalAlpha = 1;
}

function drawProp(ctx, pr, alpha) {
  const x = isoX(pr.x, pr.y), y = isoY(pr.x, pr.y);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (pr.spr) {
    const s = pr.spr;
    const k = (pr.kind === 'tower' ? 0.55 : 0.5) * (pr.scale || 1);
    ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, x - (s.w * k) / 2, y - s.h * k + HH * 0.6, s.w * k, s.h * k);
  } else if (pr.sprite) {
    const img = pixelSprite(pr.sprite, pr.pal || {}, 4);
    const px = pr.px || 2.4;
    const w = (img.width / 4) * px, h = (img.height / 4) * px;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.35, w * 0.15, 0, 0, TAU); ctx.fill();
    if (pr.sway) {
      ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, Math.sin(G.time * 1.3 + pr.x) * 0.03, 1, 0, 0);
      ctx.drawImage(img, -w / 2, -h + 2, w, h); ctx.restore();
    } else ctx.drawImage(img, x - w / 2, y - h + 2, w, h);
    if (pr.light) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 + Math.sin(G.time * 8 + pr.x) * 0.1;
      ctx.drawImage(glowSprite('#ffb050'), x - 22, y - h - 14, 44, 44);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (alpha < 1 || pr.light) ctx.globalAlpha = 1;
}

function drawBuilding(ctx, b, alpha) {
  const s = b.spr;
  const x = isoX(b.x0, b.y0) - s.ox, y = isoY(b.x0, b.y0) - s.oy;
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(s.img, x, y, s.w, s.h);
  if (alpha < 1) ctx.globalAlpha = 1;
}

function drawChest(ctx, c) {
  const x = isoX(c.x, c.y), y = isoY(c.x, c.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 16, 7, 0, 0, TAU); ctx.fill();
  const body = c.rare ? '#5a3a6a' : '#5a3a1a', trim = c.rare ? '#e0c0ff' : '#d0a040';
  // box faces
  ctx.fillStyle = shade(body, -0.2);
  ctx.beginPath(); ctx.moveTo(x - 14, y - 4); ctx.lineTo(x, y + 3); ctx.lineTo(x, y - 9); ctx.lineTo(x - 14, y - 16); ctx.fill();
  ctx.fillStyle = shade(body, -0.4);
  ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + 14, y - 4); ctx.lineTo(x + 14, y - 16); ctx.lineTo(x, y - 9); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x, y - 3); ctx.lineTo(x + 14, y - 10); ctx.stroke();
  if (c.opened) {
    ctx.fillStyle = shade(body, 0.1);
    ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x, y - 9); ctx.lineTo(x + 2, y - 26); ctx.lineTo(x - 12, y - 33); ctx.fill();
  } else {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x, y - 9); ctx.lineTo(x + 14, y - 16); ctx.lineTo(x, y - 23); ctx.fill();
    ctx.strokeStyle = trim; ctx.beginPath(); ctx.moveTo(x - 7, y - 19.5); ctx.lineTo(x + 7, y - 12.5); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 3) * 0.15;
    ctx.drawImage(glowSprite(c.rare ? '#c080ff' : '#ffd060'), x - 24, y - 34, 48, 40);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

function drawPortal(ctx, p) {
  const x = isoX(p.x, p.y), y = isoY(p.x, p.y);
  const active = p.active;
  const col = active ? p.color || '#ff5020' : '#5a5a60';
  const t = G.time;
  // floor rune ring
  ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 34, 17, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, 26, 13, 0, t, t + 5); ctx.stroke();
  // side pillars
  const ps = G.world && G.world.tileset && G.world.tileset.pillars[0];
  if (ps) {
    const k = 0.5;
    for (const sx of [-30, 26]) ctx.drawImage(ps.img, ps.sx, ps.sy, ps.w, ps.h, x + sx - (ps.w * k) / 2 + 2, y - ps.h * k + 6 + (sx < 0 ? -4 : 4), ps.w * k, ps.h * k);
  }
  // swirling vortex
  ctx.save();
  ctx.translate(x, y - 34);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = active ? 0.45 - i * 0.05 : 0.15;
    ctx.strokeStyle = i % 2 ? col : '#ffffff';
    ctx.lineWidth = 3 - i * 0.3;
    ctx.beginPath(); ctx.ellipse(0, 0, 18 - i * 2.4, 30 - i * 4, 0, t * (2 + i * 0.6), t * (2 + i * 0.6) + 4.2); ctx.stroke();
  }
  ctx.globalAlpha = active ? 0.8 : 0.25;
  ctx.drawImage(glowSprite(col), -26, -38, 52, 76);
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawCorpse(ctx, c) {
  const img = pixelSprite(c.sprite, c.pal, 6, { dark: true });
  const px = (c.px || 2.3) * (c.scale || 1) / 6;
  const w = img.width * px, h = img.height * px;
  const x = isoX(c.x, c.y), y = isoY(c.x, c.y);
  const fade = c.t > 34 ? 1 - (c.t - 34) / 6 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.translate(x, y - 4);
  ctx.scale(c.flip ? -1 : 1, 0.62);
  ctx.rotate(-Math.PI / 2 * 0.92);
  ctx.drawImage(img, -h * 0.1 - h * 0.45, -w / 2, w, h * 0.95);
  ctx.restore();
}

function drawNpc(ctx, n) {
  const img = classSprite(n.vendor ? n.vendor.sprite : n.sprite, 180, n.vendor ? n.vendor.pal : n.pal);
  const h = 58, w = (h * img.width) / img.height;
  const x = isoX(n.x, n.y), y = isoY(n.x, n.y);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.ellipse(x, y, 13, 6, 0, 0, TAU); ctx.fill();
  const bob = Math.sin(G.time * 2 + n.x) * 0.6;
  if (n.flip) { ctx.save(); ctx.translate(x + w / 2, y - h + bob); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(img, x - w / 2, y - h + bob, w, h);
  if (n.vendor) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 3) * 0.1;
    ctx.drawImage(glowSprite('#ffd060'), x - 6, y - h - 18, 12, 12);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  n.sbox = [x - w / 2, y - h, x + w / 2, y];
}

/** Main world render. */
export function renderWorld(ctx, world) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  lights.length = 0;
  camera.apply(ctx);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  const vr = camera.viewRect(40);
  const map = world.map;

  // tile bounds of the view
  const corners = [[vr.x0, vr.y0 - 40], [vr.x1, vr.y0 - 40], [vr.x0, vr.y1 + 140], [vr.x1, vr.y1 + 140]].map(([wx, wy]) => [(wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2]);
  const tx0 = clamp(Math.floor(Math.min(...corners.map((c) => c[0]))) - 1, 0, map.w - 1);
  const tx1 = clamp(Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1, 0, map.w - 1);
  const ty0 = clamp(Math.floor(Math.min(...corners.map((c) => c[1]))) - 1, 0, map.h - 1);
  const ty1 = clamp(Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1, 0, map.h - 1);

  // floors
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * map.w + tx;
      if (map.t[i] !== 1) continue;
      const px = (tx - ty) * HW, py = (tx + ty) * HH;
      if (px < vr.x0 - TW || px > vr.x1 + TW || py < vr.y0 - TH || py > vr.y1 + TH) continue;
      const f = floorEntry(world, map.v[i]);
      ctx.drawImage(f.img, f.sx, f.sy, f.w, f.h, px - HW - 0.6, py - 0.6, TW + 1.2, TH + 1.2);
    }
  }
  drawDecals(ctx, vr);
  for (const c of world.corpses) {
    const px = isoX(c.x, c.y), py = isoY(c.x, c.y);
    if (px > vr.x0 - 40 && px < vr.x1 + 40 && py > vr.y0 - 40 && py < vr.y1 + 40) drawCorpse(ctx, c);
  }
  // ground layer hazards & effects
  const sorted = [], top = [];
  for (const h of world.hazards) {
    if (h.ground) h.draw(ctx);
    else if (typeof h.depth === 'number') sorted.push({ d: h.depth, f: 1, o: h });
    else top.push(h);
  }
  drawEffects(ctx, 'ground');

  // depth sorted pass
  const p = world.player;
  const pd = p ? p.x + p.y : 0;
  const ppx = p ? isoX(p.x, p.y) : 0, ppy = p ? isoY(p.x, p.y) : 0;
  const prect = [ppx - 16, ppy - 62, ppx + 16, ppy - 4];
  const occludes = (r) => p && r[0] < prect[2] && r[0] + r[2] > prect[0] && r[1] < prect[3] && r[1] + r[3] > prect[1];
  const walls = map.wallsIn(tx0 - 2, ty0 - 2, tx1 + 3, ty1 + 3, []);
  for (const s of walls) sorted.push({ d: s.depth, f: s.spr && s.dir ? 2 : 3, o: s });
  for (const pr of world.props) {
    const px = isoX(pr.x, pr.y), py = isoY(pr.x, pr.y);
    if (px < vr.x0 - 100 || px > vr.x1 + 100 || py < vr.y0 - 40 || py > vr.y1 + 220) continue;
    sorted.push({ d: pr.x + pr.y, f: 4, o: pr });
  }
  for (const b of world.buildings) sorted.push({ d: b.depth, f: 5, o: b });
  for (const c of world.creatures) {
    if (c.dead) continue;
    const px = isoX(c.x, c.y), py = isoY(c.x, c.y);
    if (px < vr.x0 - 80 || px > vr.x1 + 80 || py < vr.y0 - 40 || py > vr.y1 + 160) { c.sbox = null; continue; }
    sorted.push({ d: c.x + c.y + (c.fly ? 0.2 : 0), f: 6, o: c });
  }
  for (const n of world.npcs) sorted.push({ d: n.x + n.y, f: 7, o: n });
  for (const l of world.loot) sorted.push({ d: l.x + l.y - 0.2, f: 8, o: l });
  for (const c of world.chests) sorted.push({ d: c.x + c.y, f: 9, o: c });
  for (const po of world.portals) sorted.push({ d: po.x + po.y, f: 10, o: po });
  sorted.sort((a, b) => a.d - b.d);
  for (const it of sorted) {
    const o = it.o;
    switch (it.f) {
      case 1: o.draw(ctx); break;
      case 2: drawSeg(ctx, o, o.depth > pd + 0.6 && occludes(segRect(o)) ? 0.3 : 1); break;
      case 3: drawPillar(ctx, o, o.depth > pd + 0.6 && p && Math.abs(isoX(o.x, o.y) - ppx) < 24 && isoY(o.x, o.y) > ppy - 10 && isoY(o.x, o.y) - 64 < ppy ? 0.3 : 1); break;
      case 4: {
        let a = 1;
        if (p && it.d > pd + 0.5 && (o.spr || (o.sprite === 'tree' || o.sprite === 'pine'))) {
          const px = isoX(o.x, o.y), py = isoY(o.x, o.y);
          if (Math.abs(px - ppx) < 40 && py > ppy - 8 && py - 90 < ppy) a = 0.35;
        }
        drawProp(ctx, o, a);
        break;
      }
      case 5: {
        let a = 1;
        if (p && o.depth > pd) {
          const s = o.spr, x = isoX(o.x0, o.y0) - s.ox, y = isoY(o.x0, o.y0) - s.oy;
          if (occludes([x + s.w * 0.15, y, s.w * 0.7, s.h * 0.85])) a = 0.4;
        }
        drawBuilding(ctx, o, a);
        break;
      }
      case 6: {
        o.draw(ctx);
        const img = o.spriteImage();
        const [w, h] = o.spriteDims(img);
        const [sx, sy] = camera.tileToScreen(o.x, o.y, o.z + (o.fly ? 16 : 0));
        const z = camera.zoom;
        o.sbox = [sx - (w / 2) * z, sy - h * z, sx + (w / 2) * z, sy];
        break;
      }
      case 7: drawNpc(ctx, o); break;
      case 8: o.draw(ctx); break;
      case 9: drawChest(ctx, o); break;
      case 10: drawPortal(ctx, o); break;
    }
  }
  drawParticles(ctx, vr);
  for (const h of top) h.draw(ctx);
  ctx.globalCompositeOperation = 'lighter';
  drawEffects(ctx, 'top');
  ctx.globalCompositeOperation = 'source-over';

  // ---------------------------------------------------------- screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawLighting(ctx, world);
  if (G.hurtFlash > 0) {
    ctx.fillStyle = `rgba(160,0,0,${Math.min(0.45, G.hurtFlash)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,250,230,${Math.min(0.8, G.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (p && p.hp < p.maxHp * 0.3 && !p.dead) {
    ctx.fillStyle = `rgba(120,0,0,${0.15 + Math.sin(G.time * 6) * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawOverheadNames(ctx, world);
  G.lootBoxes = drawLootLabels(ctx, world, G.input && G.input.lastPointerType === 'mouse' ? G.input.mouse : null);
  drawTexts(ctx);
}

function drawLighting(ctx, world) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  const b = world.biome;
  const lw = Math.ceil(W / 4), lh = Math.ceil(H / 4);
  if (!lightCanvas || lightCanvas.width !== lw || lightCanvas.height !== lh) lightCanvas = makeCanvas(lw, lh);
  const lc = lightCanvas.getContext('2d');
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, lw, lh);
  const [fr, fg, fb] = hexToRgb(b.fog || '#000000');
  lc.fillStyle = `rgba(${fr},${fg},${fb},${b.dark})`;
  lc.fillRect(0, 0, lw, lh);
  lc.globalCompositeOperation = 'destination-out';
  const scale = (HW * 1.25 * camera.zoom * G.dpr) / 4;
  const p = world.player;
  const add = (x, y, r, inten) => {
    const [sx, sy] = camera.tileToScreen(x, y, 20);
    const cx = (sx * G.dpr) / 4, cy = (sy * G.dpr) / 4, rr = r * scale;
    if (cx + rr < 0 || cy + rr < 0 || cx - rr > lw || cy - rr > lh) return;
    const g = lc.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, `rgba(0,0,0,${Math.min(1, inten)})`);
    g.addColorStop(0.55, `rgba(0,0,0,${Math.min(1, inten) * 0.6})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  };
  if (p) add(p.x, p.y, b.light * (1 + (p.st.lightPct || 0)), 1);
  for (const l of lights) add(l.x, l.y, l.radius, l.intensity * 0.85);
  ctx.drawImage(lightCanvas, 0, 0, W, H);
  // vignette
  const key = W + 'x' + H;
  if (vigKey !== key) {
    vigKey = key;
    vignette = makeCanvas(W, H);
    const v = vignette.getContext('2d');
    const g = v.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    v.fillStyle = g; v.fillRect(0, 0, W, H);
  }
  ctx.drawImage(vignette, 0, 0);
}

function drawOverheadNames(ctx, world) {
  ctx.textAlign = 'center';
  const d = G.dpr;
  ctx.font = `700 ${Math.round(11 * d)}px Cinzel, Georgia, serif`;
  for (const c of world.creatures) {
    if (c.dead || !c.sbox) continue;
    if (c.rank === 'champion' || c.rank === 'unique') {
      const x = (c.sbox[0] + c.sbox[2]) / 2, y = c.sbox[1] - 8;
      ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
      ctx.strokeText(c.name, x * d, y * d);
      ctx.fillStyle = c.rank === 'unique' ? '#ffc040' : '#80b0ff';
      ctx.fillText(c.name, x * d, y * d);
    }
  }
  for (const n of world.npcs) {
    if (!n.sbox) continue;
    const x = (n.sbox[0] + n.sbox[2]) / 2;
    const [sx, sy] = camera.toScreen(x, n.sbox[1] - 10);
    const label = n.vendor ? n.vendor.name : n.name;
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
    ctx.strokeText(label, sx * d, sy * d);
    ctx.fillStyle = n.vendor ? '#ffe090' : '#c8c0b0';
    ctx.fillText(label, sx * d, sy * d);
    if (n.vendor) {
      ctx.font = `${Math.round(10 * d)}px "Alegreya Sans", sans-serif`;
      ctx.fillStyle = '#b0a080';
      ctx.fillText(n.vendor.title, sx * d, (sy + 12) * d);
      ctx.font = `700 ${Math.round(11 * d)}px Cinzel, Georgia, serif`;
    }
  }
  // portal labels
  for (const po of world.portals) {
    const [sx, sy] = camera.tileToScreen(po.x, po.y, 82);
    ctx.lineWidth = 3 * d; ctx.strokeStyle = '#000';
    ctx.strokeText(po.label, sx * d, sy * d);
    ctx.fillStyle = po.active ? '#ffd0a0' : '#909090';
    ctx.fillText(po.label, sx * d, sy * d);
  }
  // hovered monster info (desktop)
  const h = G.hover;
  if (h && !h.dead && h.team === 'enemy' && h.rank !== 'boss') {
    const W = G.W * d;
    const bw = Math.min(360, G.W * 0.5) * d;
    const y = 18 * d;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(W / 2 - bw / 2, y, bw, 22 * d);
    ctx.fillStyle = h.rank === 'unique' ? '#a06010' : h.rank === 'champion' ? '#2a4a90' : '#7a0a06';
    ctx.fillRect(W / 2 - bw / 2 + 2 * d, y + 2 * d, (bw - 4 * d) * clamp(h.hp / h.maxHp, 0, 1), 18 * d);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(12 * d)}px Cinzel, Georgia, serif`;
    ctx.fillText(h.name, W / 2, y + 15 * d);
    if (h.affixes && h.affixes.length) {
      ctx.font = `${Math.round(11 * d)}px "Alegreya Sans", sans-serif`;
      ctx.fillStyle = '#c8b0ff';
      ctx.fillText(h.affixes.map((a) => ({ strong: 'Extra Strong', fast: 'Extra Fast', tough: 'Stone Skin', fiery: 'Fire Enchanted', frozen: 'Cold Aura', shocking: 'Lightning Enchanted', vampiric: 'Vampiric', teleport: 'Teleporting', multishot: 'Multishot', thorns: 'Thorns', regen: 'Regenerating' }[a] || a)).join(' · '), W / 2, y + 36 * d);
    }
  }
}

// ------------------------------------------------------------------ minimap
let mmT = 0;
export function drawMinimap(world, dt, canvas, big = false) {
  if (!canvas) return;
  mmT -= dt;
  if (!big && mmT > 0) return;
  mmT = 0.2;
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  const p = world.player;
  if (!p) return;
  const map = world.map;
  const s = big ? Math.max(2, Math.min(W / (map.w + map.h), H / ((map.w + map.h) / 2)) * 0.95) : 2.4;
  const cx = W / 2, cy = H / 2;
  const ox = big ? cx : cx - (p.x - p.y) * s, oy = big ? cy - ((map.w + map.h) / 4) * s + (big ? 0 : 0) : cy - ((p.x + p.y) * s) / 2;
  const toS = (x, y) => big ? [cx + (x - y) * s - ((map.w - map.h) * s) / 2, cy - ((map.w + map.h) * s) / 4 + ((x + y) * s) / 2] : [ox + (x - y) * s, oy + ((x + y) * s) / 2];
  c.fillStyle = big ? 'rgba(200,180,140,0.35)' : 'rgba(170,150,120,0.55)';
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const i = y * map.w + x;
      if (map.t[i] !== 1 || !map.seen[i]) continue;
      const [sx, sy] = toS(x, y);
      if (!big && (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4)) continue;
      c.fillRect(sx - s * 0.5, sy, s, s * 0.6);
    }
  }
  const dot = (x, y, col, r) => { const [sx, sy] = toS(x, y); c.fillStyle = col; c.beginPath(); c.arc(sx, sy + s * 0.3, r, 0, TAU); c.fill(); };
  for (const po of world.portals) if (map.seen[Math.floor(po.y) * map.w + Math.floor(po.x)] || world.kind === 'town') dot(po.x, po.y, po.active ? po.color || '#ff5020' : '#888', big ? 6 : 4);
  for (const ch of world.chests) if (!ch.opened && map.seen[Math.floor(ch.y) * map.w + Math.floor(ch.x)]) dot(ch.x, ch.y, '#ffd040', big ? 4 : 2.5);
  for (const n of world.npcs) dot(n.x, n.y, '#ffe090', big ? 4 : 2.5);
  for (const m of world.creatures) {
    if (m.dead || m === p) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (m.team === 'enemy' && d < 14) dot(m.x, m.y, m.rank === 'boss' ? '#ff8000' : m.rank !== 'normal' ? '#ffb040' : '#ff3030', m.rank === 'boss' ? 4 : 2);
    else if (m.team === 'player') dot(m.x, m.y, '#40ff60', 1.8);
  }
  dot(p.x, p.y, '#ffffff', big ? 5 : 3.2);
}
