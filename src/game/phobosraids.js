// CASTLE VELSCOUR's raid bosses (docs/PHOBOS.md): nine wing lords on floors 10..90 and Lord Velscour on floor 100, in
// three battles (the Crimson Dynasty, the Obsidian Eclipse, the Cathedral of Ruin), four forms each. Built on the raid
// framework (game/raid.js makeRaidBoss, `sigs: true` templates) with mechanics after the latest WoW raids:
//   the Keeper of the Third Latch    Vorasius (Voidspire): portcullis walls crush three quarters, a ramping roar
//   the Oubliette Elector             Salhadaar / Dimensius: tethering chains to break, a floor that collapses
//   the Armourer of the Hollow Crown  Gallywix-style heat: bait him into a quench trough before he boils over
//   the Iron Table Marshal            Vaelgor & Ezzorak: a bonded pair, kept apart or both shrug off the blows
//   the Long Stacks Regent            Midnight Falls (L'ura): a memory test, stand where the safe glyph was
//   the Queen of Iron Pennants        Chimaerus (Dreamrift): she slips into the veil; kill what guards it
//   the Ash Chancellor                Belo'ren: Light and Void marks, stand in your own colour when it bursts
//   the Windward Black Knight         Dimensius / Crown of the Cosmos: gales toward the brink, shelter by buttresses
//   the High Ward's Eclipse           Midnight Falls: a total eclipse, a sweeping beam with one safe seam
// Every hazard publishes danger()/autoGoal() so auto-play (game/autoplay.js) can play the fight.
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, angleDiff, dist, pick } from '../core/util.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Bolt, Column, burst, floatText, addLight, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit } from './combat.js';
import { UI } from '../ui/ui.js';
import { SIGS, SIG_NAMES, PASSIVES, blast, line, zone, mover, add, A, randFloor, later, say, live, hero, InRing } from './raidsigs.js';
import { PHOBOS_BY_ID, FINALE, FORM_NAMES, GUARDIANS } from '../data/phobos.js';
import { runMech } from './phobosbosses.js';

const sig = (k, name, fn) => { SIG_NAMES[k] = name; SIGS[k] = fn; };
const artNamed = (re) => (GUARDIANS.find((a) => re.test(a.name)) || GUARDIANS[0]).id;

// ================================================================================== shared signature attacks
sig('ph_cross', 'Gallows Cross', (R) => {
  const p = hero(R); if (!p) return;
  const off = chance(0.5) ? 0 : Math.PI / 4, group = new Set();
  for (let k = 0; k < 4; k++) line(R, p.x, p.y, off + k * Math.PI / 2, 15, 0.7, 1.2, 1.2, R.E.glow, { group });
  sfx('swing');
});
sig('ph_rain', 'Falling Masonry', (R) => {
  const p = hero(R); if (!p) return;
  const n = 5 + R.pi * 2;
  for (let i = 0; i < n; i++) { const a = rand(TAU), d = i === 0 ? 0 : rand(1.5, 6); blast(R, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.6, 1.1 + i * 0.12, 1, { fx: 'explosion' }); }
  sfx('thud', 0.6);
});
sig('ph_ring', 'Closing Ring', (R) => {
  const a = A(R);
  R.m.world.addHazard(new InRing(R, { x: a.cx, y: a.cy, r: 14, speed: 3.2 + R.pi * 0.3, gap: rand(TAU), gapW: 1.1, color: R.E.glow, mul: 1.3 }));
  sfx('arcane');
});
sig('ph_wave', 'Dance of Blades', (R) => {   // rows across the arena in turn: step through the gaps
  const a = A(R), vert = chance(0.5), n = 6, skip = (Math.random() * n) | 0;
  for (let i = 0; i < n; i++) {
    if (i === skip) continue;
    const k = (i + 0.5) / n;
    later(R.m.world, i * 0.25, () => { if (!live(R)) return;
      if (vert) line(R, a.x + a.w * k, a.y + 1, Math.PI / 2, a.h - 2, 1.1, 1.3, 1.1, R.E.glow);
      else line(R, a.x + 1, a.y + a.h * k, 0, a.w - 2, 1.1, 1.3, 1.1, R.E.glow);
    });
  }
  sfx('swing');
});
sig('ph_orbs', 'Seeking Embers', (R, t) => {
  const m = R.m, n = 3 + R.pi;
  for (let i = 0; i < n; i++) mover(R, { x: m.x, y: m.y, ang: angleTo(m.x, m.y, t.x, t.y) + (i - n / 2) * 0.4, speed: 3 + R.pi * 0.4, dur: 6, r: 0.7, color: R.E.glow,
    steer(dt) { const p = hero(R); if (!p) return; const a = Math.atan2(this.vy, this.vx), b = angleTo(this.x, this.y, p.x, p.y), na = a + clamp(angleDiff(a, b), -1.2 * dt, 1.2 * dt); const s = Math.hypot(this.vx, this.vy); this.vx = Math.cos(na) * s; this.vy = Math.sin(na) * s; } });
  sfx('fire');
});
sig('ph_soak', 'Weight of the Crown', (R) => {   // stand in the circle or the whole arena pays
  const [x, y] = randFloor(R, 5), Z = zone(R, { x, y, r: 2.4, dur: 4, color: '#ffe060', good: true });
  UI.centerMsg('SOAK THE CROWN', 'Stand in the golden circle!', 2);
  later(R.m.world, 3.9, () => { const p = hero(R); if (!live(R) || !p) return;
    if (!Z.inside(p)) { hit(R.m, p, R.m.dmg * 3.2, R.tpl.el, { force: true, crit: false }); floatText(p.x, p.y, 70, 'UNSOAKED', '#ff4040', 15); }
    else floatText(p.x, p.y, 70, 'SOAKED', '#ffe060', 13);
    explosionFx(x, y, 2.4, 'holy', 'nova', { shake: 6 });
  });
});

// ================================================================================== the wing lords
// 1 THE KEEPER OF THE THIRD LATCH: portcullises crush three quarters of the yard; the open hinge is the fourth
sig('ph_latch', 'Portcullis Fall', (R) => {
  const a = A(R), safe = (Math.random() * 4) | 0, qx = [0, 1, 0, 1], qy = [0, 0, 1, 1];
  const Z = zone(R, { x: a.x + a.w * (0.25 + 0.5 * qx[safe]), y: a.y + a.h * (0.25 + 0.5 * qy[safe]), r: 4, dur: 3.2, color: '#a0ffa0', good: true });
  for (let q = 0; q < 4; q++) if (q !== safe) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    blast(R, a.x + a.w * (qx[q] * 0.5 + (i + 0.5) / 6), a.y + a.h * (qy[q] * 0.5 + (j + 0.5) / 6), 2.7, 2.8, 1.6, { fx: 'explosion' });
  UI.centerMsg('PORTCULLIS FALL', 'Keep the open hinge in view!', 2.2);
  sfx('gate');
  return Z;
});
sig('ph_roar', 'Primordial Roar', (R) => {
  const m = R.m, p = hero(R); R.roar = (R.roar || 0) + 1;
  addEffect(new Ring(m.x, m.y, 0.5, 14, 0.8, R.E.glow, 8));
  if (p) { hit(m, p, m.dmg * (0.4 + 0.15 * R.roar), 'phys', { force: true, crit: false, knock: 1.4, ang: angleTo(m.x, m.y, p.x, p.y) }); floatText(p.x, p.y, 70, 'ROAR ×' + R.roar, '#ffd0a0', 13); }
  G.shake = Math.max(G.shake || 0, 8); sfx('roar');
});
// 2 THE OUBLIETTE ELECTOR: chains from the pit walls bind the hero (slow, bleeding) until their bright hinges break
sig('ph_chains', 'Elector\'s Chains', (R) => {
  const a = A(R), m = R.m, n = 2 + (R.pi >= 2 ? 1 : 0), p = hero(R);
  for (let i = 0; i < n; i++) {
    const ang = rand(TAU), x = a.cx + Math.cos(ang) * a.w * 0.38, y = a.cy + Math.sin(ang) * a.h * 0.38;
    const c = add(R, x, y, { name: 'Bright Hinge', static: true, hp: 0.025, priority: 7, ai: 'ranged', range: 0, art: null, sprite: 'crystal',
      tick: (c, dt) => { const q = hero(R); if (!q) return; if ((c.fx = (c.fx || 0) - dt) <= 0) { c.fx = 0.1; addEffect(new Bolt(c.x, c.y, 30, q.x, q.y, 40, '#c0a070', 0.12, 3)); }
        q.status.slow = { t: 0.3, k: 0.6 }; if ((c.hurt = (c.hurt || 0) - dt) <= 0) { c.hurt = 1; hit(m, q, m.dmg * 0.18, 'phys', { force: true, crit: false, dot: true }); } } });
    c.raidPriority = 7;
  }
  if (p) floatText(p.x, p.y, 80, 'CHAINED', '#c0a070', 15);
  UI.centerMsg("ELECTOR'S CHAINS", 'Strike the chains through their bright hinges!', 2.2);
  sfx('chain');
});
sig('ph_collapse', 'Oubliette Collapse', (R) => {
  const w = R.m.world;
  for (let i = 0; i < 2 + R.pi; i++) {
    const [x, y] = randFloor(R, 4), Z = zone(R, { x, y, r: 1, dur: 12, color: '#301010', good: false });
    Z.tick = (dt) => { Z.r = Math.min(3.6, Z.r + dt * 0.45); const p = hero(R); if (p && Z.inside(p) && (Z.h = (Z.h || 0) - dt) <= 0) { Z.h = 0.5; hit(R.m, p, R.m.dmg * 0.5, 'shadow', { force: true, crit: false, dot: true }); } };
  }
  sfx('thud'); void w;
});
// 3 THE ARMOURER OF THE HOLLOW CROWN: his heat rises; bait him into a quench trough or the forge boils over
PASSIVES.ph_forge = (R, dt) => {
  const m = R.m, a = A(R), p = hero(R); if (!p) return;
  if (!R.troughs) {
    R.troughs = [[a.cx - a.w * 0.3, a.cy], [a.cx + a.w * 0.3, a.cy]].map(([x, y]) => zone(R, { x, y, r: 2.3, dur: 1e9, color: '#40a0ff', good: true, goal: false }));
    R.heat = 0;
  }
  if (R.inter) return;
  R.heat += dt * (5 + R.pi * 1.5);
  const tr = R.troughs.find((z) => z.inside(m));
  if (tr && R.heat > 25) { R.heat = 0; R.quench = 8; floatText(m.x, m.y, 140, 'QUENCHED!', '#80d0ff', 18); explosionFx(m.x, m.y, 2.5, 'cold', 'nova', { shake: 5 }); sfx('freeze'); }
  if ((R.quench = (R.quench || 0) - dt) > 0) m.ward = 1.6; else if (!R.inter) m.ward = 1;
  // lead him to the nearest trough when he runs hot (auto-play)
  const near = R.troughs.reduce((b, z) => (!b || dist(p.x, p.y, z.x, z.y) < dist(p.x, p.y, b.x, b.y) ? z : b), null);
  R.autoGoalNow = R.heat > 55 ? { x: near.x, y: near.y, r: 1.2 } : null;
  if (!R.goalHaz) R.goalHaz = m.world.addHazard({ t: 0, autoGoal: () => R.autoGoalNow, update() { return live(R); }, draw() {} });
  if (R.heat >= 100) { R.heat = 0; UI.centerMsg('THE FORGE BOILS OVER', '', 1.6); for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU; blast(R, m.x + Math.cos(ang) * 4, m.y + Math.sin(ang) * 4, 2.4, 0.9, 1.5, { fx: 'explosion', el: 'fire' }); } hit(m, p, m.dmg * 1.5, 'fire', { force: true, crit: false }); }
  if (chance(dt * (R.heat / 12))) burst(m.x, m.y, 2, 'fire', 30, 2);
};
sig('ph_anvil', 'Anvil Strike', (R, t) => { const m = R.m, a0 = angleTo(m.x, m.y, t.x, t.y), group = new Set(); for (const o of [-0.45, 0, 0.45]) line(R, m.x, m.y, a0 + o, 13, 0.75, 1, 1.25, '#ff9030', { el: 'fire', group }); sfx('thud'); });
// 4 THE IRON TABLE MARSHAL (and the Brazier Duke, seated at the table's head): a bonded pair
PASSIVES.ph_banquet = (R, dt) => {
  const m = R.m, a = A(R), p = hero(R); if (!p) return;
  if (!R.duke) {
    R.duke = add(R, a.x + a.w - 5, a.cy, { name: 'BRAZIER DUKE', art: artNamed(/Brazier/), artH: 76, hp: 0.4, dmg: 0.6, ai: 'ranged', range: 9, priority: 4, static: true, aura: '#ff7020',
      tick: (c, dt2) => { const q = hero(R); if (q && (c.cd2 = (c.cd2 || 0) - dt2) <= 0) { c.cd2 = 3; blast(R, q.x, q.y, 1.8, 1.2, 0.9, { el: 'fire', fx: 'explosion' }); } } });
    R.duke.scale = 1.6;
  }
  const bonded = !R.duke.dead && dist(m.x, m.y, R.duke.x, R.duke.y) < 9;
  if (!R.inter) m.ward = bonded ? 0.3 : R.duke.dead ? 1.15 : 1;
  if (bonded && (R.bfx = (R.bfx || 0) - dt) <= 0) { R.bfx = 0.15; addEffect(new Bolt(m.x, m.y, 60, R.duke.x, R.duke.y, 60, '#ff5030', 0.15, 3)); }
  R.autoGoalNow = !R.duke.dead ? { x: a.x + 4, y: a.cy + (p.y > a.cy ? 3 : -3), r: 2.5 } : null;   // drag the Marshal away from the Duke
  if (!R.goalHaz) R.goalHaz = m.world.addHazard({ t: 0, autoGoal: () => R.autoGoalNow, update() { return live(R); }, draw() {} });
};
sig('ph_settings', 'Lit Place Settings', (R) => {   // candle rows down the long table fire one after another
  const a = A(R);
  for (let r = 0; r < 4; r++) later(R.m.world, r * 0.6, () => { if (!live(R)) return; const y = a.y + a.h * (0.2 + r * 0.2) + (r % 2 ? 1 : -1); line(R, a.x + 2, y, 0, a.w - 4, 0.9, 1.2, 1.2, '#ffd070', { el: 'fire' }); });
  sfx('fire');
});
// 5 THE LONG STACKS REGENT: four glyphs, one safe; they fade, and the stacks fall everywhere but where it stood
sig('ph_memory', 'The Loose Rung', (R) => {
  const a = A(R), spots = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([u, v]) => [a.x + a.w * u, a.y + a.h * v]), safe = (Math.random() * 4) | 0;
  const marks = spots.map(([x, y], k) => zone(R, { x, y, r: 2.2, dur: 6, color: k === safe ? '#80ffb0' : '#ff5050', good: k === safe }));
  for (const z of marks) { const d0 = z.draw.bind(z); z.draw = (ctx) => { if (z.t < 1.8 || z.t > 5.4) d0(ctx); }; }   // shown, hidden, shown as it falls
  UI.centerMsg('THE LOOSE RUNG', 'Remember the green glyph!', 2.2);
  later(R.m.world, 5.6, () => { const p = hero(R); if (!live(R) || !p) return;
    if (!marks[safe].inside(p)) { hit(R.m, p, R.m.dmg * 3, 'arcane', { force: true, crit: false }); floatText(p.x, p.y, 70, 'FORGOTTEN', '#ff5050', 15); }
    for (let k = 0; k < 4; k++) if (k !== safe) explosionFx(spots[k][0], spots[k][1], 3, 'arcane', 'nova', { shake: 4 });
    sfx('arcane');
  });
});
sig('ph_pages', 'Storm of Pages', (R) => { const m = R.m, n = 10 + R.pi * 3, a0 = rand(TAU); for (let i = 0; i < n; i++) mover(R, { x: m.x, y: m.y, ang: a0 + (i / n) * TAU, speed: 3.4, dur: 4, r: 0.45, color: '#d0c0ff', bounce: false, mul: 0.6 }); sfx('arcane'); });
// 6 THE QUEEN OF IRON PENNANTS: she withdraws into the veil (immune) until the veil's three wardens fall
PASSIVES.ph_veil = (R, dt) => {
  const m = R.m, a = A(R);
  if (R.inter) return;
  if (!R.veil && (R.veilT = (R.veilT ?? 14) - dt) <= 0) {
    R.veil = []; const [x, y] = randFloor(R, 5);
    zone(R, { x, y, r: 4, dur: 30, color: '#60ff90', good: true, goal: true });
    for (let i = 0; i < 3; i++) R.veil.push(add(R, x + Math.cos(i * 2.1) * 2, y + Math.sin(i * 2.1) * 2, { name: 'Veil Warden', hp: 0.03, priority: 8, ai: 'melee', arch: 'wraith' }));
    UI.centerMsg('INTO THE VEIL', 'She is untouchable: slay the Veil Wardens!', 2.4); sfx('arcane');
  }
  if (R.veil) { m.ward = 0; if (R.veil.every((c) => c.dead)) { R.veil = null; R.veilT = 26 - R.pi * 2; m.ward = 1; UI.log('The veil tears: the Queen of Iron Pennants is exposed.', '#a0ffb0'); } }
  void a;
};
sig('ph_pennants', 'Pennant Lash', (R) => { const a = A(R); for (let i = 0; i < 3 + R.pi; i++) { const y = a.y + rand(3, a.h - 3); line(R, chance(0.5) ? a.x + 1 : a.x + a.w - 1, y, chance(0.5) ? 0 : Math.PI, a.w - 2, 0.8, 1.2 + i * 0.2, 1, '#90ff90'); } sfx('swing'); });
// 7 THE ASH CHANCELLOR: LIGHT and VOID marks; the feathers burst on your colour's circle or on you
PASSIVES.ph_polarity = (R, dt) => {
  const p = hero(R), a = A(R); if (!p || R.inter) return;
  if (!R.pz) { R.pz = [zone(R, { x: a.cx - a.w * 0.28, y: a.cy, r: 3, dur: 1e9, color: '#fff2b0', good: true, goal: false }), zone(R, { x: a.cx + a.w * 0.28, y: a.cy, r: 3, dur: 1e9, color: '#9040ff', good: true, goal: false })]; R.markT = 6; }
  for (const [k, z] of R.pz.entries()) { z.x = a.cx + Math.cos(G.time * 0.25 + k * Math.PI) * a.w * 0.28; z.y = a.cy + Math.sin(G.time * 0.25 + k * Math.PI) * a.h * 0.25; }
  if ((R.markT -= dt) <= 0) {
    if (R.mark != null && !R.pz[R.mark].inside(p)) { hit(R.m, p, p.maxHp * 0.42, R.mark ? 'shadow' : 'holy', { force: true, crit: false }); floatText(p.x, p.y, 70, 'FEATHERBURST', '#ff4040', 15); explosionFx(p.x, p.y, 2, R.mark ? 'shadow' : 'holy', 'nova', { shake: 6 }); }
    R.mark = R.mark == null ? (chance(0.5) ? 0 : 1) : 1 - R.mark; R.markT = 12 - R.pi;
    floatText(p.x, p.y, 90, R.mark ? 'VOID MARK' : 'LIGHT MARK', R.mark ? '#b070ff' : '#fff0a0', 16);
  }
  R.autoGoalNow = R.markT < 5 && R.mark != null ? { x: R.pz[R.mark].x, y: R.pz[R.mark].y, r: 1.6 } : null;
  if (!R.goalHaz) R.goalHaz = R.m.world.addHazard({ t: 0, autoGoal: () => R.autoGoalNow, update() { return live(R); }, draw() {} });
};
sig('ph_candles', 'The Surviving Candle Line', (R) => {   // the nave goes dark but for one line of candles
  const a = A(R), vert = chance(0.5), k = rand(0.25, 0.75), path = [];
  for (let i = 1; i < 8; i++) { const u = i / 8, x = vert ? a.x + a.w * k : a.x + a.w * u, y = vert ? a.y + a.h * u : a.y + a.h * k; path.push(zone(R, { x, y, r: 1.4, dur: 4.2, color: '#ffe8a0', good: true, goal: i === 4 })); }
  UI.centerMsg('THE CANDLES GUTTER', 'Follow the surviving candle line!', 2);
  later(R.m.world, 4, () => { const p = hero(R); if (!live(R) || !p) return; if (!path.some((z) => dist(p.x, p.y, z.x, z.y) < 1.9)) { hit(R.m, p, R.m.dmg * 2.6, 'shadow', { force: true, crit: false }); floatText(p.x, p.y, 70, 'IN THE DARK', '#a060ff', 14); } G.flash = 0.35; });
});
// 8 THE WINDWARD BLACK KNIGHT: gales sweep the bridge top toward the brink; shelter behind the buttresses
PASSIVES.ph_gale = (R, dt) => {
  const p = hero(R), a = A(R), m = R.m; if (!p || R.inter) return;
  if (!R.butt) R.butt = [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]].map(([u, v]) => zone(R, { x: a.x + a.w * u, y: a.y + a.h * v, r: 1.8, dur: 1e9, color: '#c0d8ff', good: true, goal: false }));
  if ((R.galeT = (R.galeT ?? 10) - dt) <= 0 && !R.gale) { R.gale = { t: 4, ang: rand(TAU) }; UI.centerMsg('WINDWARD GALE', 'Crouch behind a buttress!', 1.8); sfx('wind'); }
  if (R.gale) {
    const shelter = R.butt.find((z) => z.inside(p));
    if (!shelter) { const s = 2.2 * dt, nx = p.x + Math.cos(R.gale.ang) * s, ny = p.y + Math.sin(R.gale.ang) * s; if (m.world.map.circleFree(nx, ny, 0.3)) { p.x = nx; p.y = ny; } if ((R.gh = (R.gh || 0) - dt) <= 0) { R.gh = 0.5; hit(m, p, m.dmg * 0.25, 'light', { force: true, crit: false, dot: true }); } }
    if (chance(dt * 30)) burst(p.x + rand(-4, 4), p.y + rand(-4, 4), 1, 'light', 10, 1);
    if ((R.gale.t -= dt) <= 0) { R.gale = null; R.galeT = 13 - R.pi; }
  }
  const near = R.butt.reduce((b, z) => (!b || dist(p.x, p.y, z.x, z.y) < dist(p.x, p.y, b.x, b.y) ? z : b), null);
  R.autoGoalNow = R.gale || (R.galeT ?? 10) < 2.5 ? { x: near.x, y: near.y, r: 1 } : null;
  if (!R.goalHaz) R.goalHaz = m.world.addHazard({ t: 0, autoGoal: () => R.autoGoalNow, update() { return live(R); }, draw() {} });
};
sig('ph_storm', 'Storm Cells', (R) => { for (let i = 0; i < 3 + R.pi; i++) { const [x, y] = randFloor(R, 3); mover(R, { x, y, ang: rand(TAU), speed: 2.6, dur: 8, r: 0.9, color: '#a8ccff', el: 'light', teeth: 5 }); } sfx('light'); });
// 9 THE HIGH WARD'S ECLIPSE: the sweeping beam with a seam; a total eclipse where only the lamp is safe
sig('ph_beam', 'Sweep of the Bright Seam', (R) => {
  const m = R.m, w = m.world, dir = chance(0.5) ? 1 : -1, seam = 0.35;
  let ang = rand(TAU);
  const H = w.addHazard({ t: 0, ground: true, world: w, team: m.team,
    danger(out) { for (const o of [0, Math.PI]) out.push({ line: true, x: m.x, y: m.y, x1: m.x + Math.cos(ang + o) * 15, y1: m.y + Math.sin(ang + o) * 15, r: 1.1 }); },
    update(dt) { if (!live(R)) return false; this.t += dt; if (this.t < 1.2) return true; ang += dir * dt * 0.9;
      for (const c of w.hostiles(m.team, m.x, m.y, 15)) { const d = Math.abs(angleDiff(ang, angleTo(m.x, m.y, c.x, c.y))) % Math.PI; const off = Math.min(d, Math.PI - d); if (off < seam && dist(m.x, m.y, c.x, c.y) > 1.5 && (c.beamT || 0) < this.t) { c.beamT = this.t + 0.5; hit(m, c, m.dmg * 0.8, 'holy', { crit: false }); } }
      return this.t < 7; },
    draw(ctx) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.t < 1.2 ? 0.25 : 0.7; ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = this.t < 1.2 ? 3 : 14;
      for (const o of [0, Math.PI]) { ctx.beginPath(); ctx.moveTo(isoX(m.x, m.y), isoY(m.x, m.y) - 30); ctx.lineTo(isoX(m.x + Math.cos(ang + o) * 15, m.y + Math.sin(ang + o) * 15), isoY(m.x + Math.cos(ang + o) * 15, m.y + Math.sin(ang + o) * 15) - 30); ctx.stroke(); }
      ctx.restore(); } });
  UI.centerMsg('THE BRIGHT SEAM', 'Track the seam for the safe angle!', 2);
  sfx('holy');
  return H;
});
sig('ph_eclipse', 'Total Eclipse', (R) => {
  const [x, y] = randFloor(R, 4), Z = zone(R, { x, y, r: 3, dur: 9, color: '#fff8d0', good: true });
  UI.centerMsg('TOTAL ECLIPSE', 'Only the lamp\'s light is safe!', 2.2);
  Z.tick = (dt) => { G.dark = Math.max(G.dark || 0, 0.7); const p = hero(R); if (p && Z.t > 2 && !Z.inside(p) && (Z.h = (Z.h || 0) - dt) <= 0) { Z.h = 0.5; hit(R.m, p, p.maxHp * 0.09, 'shadow', { force: true, crit: false, dot: true }); } };
  sfx('arcane');
});

// ================================================================================== WoW signatures (docs/RAID_MECHANICS.md)
// Each wing lord gains a catalogue mechanic of its own (game/phobosbosses.js MECHS, run by runMech): soaks, an
// intermission behind a ward, or an energy bar under the boss bar whose 100 fires the big cast (Rasha'nan, Gallywix).
function energy(R, dt, secs, k) {
  if (!R.energyLabel) { R.energyLabel = true; const base = R.label; R.label = function () { return `${base.call(this)} · ${SIG_NAMES[k]} ${Math.floor(R.energy || 0)}%`; }; }
  if (R.inter || !R.m.awake) return;
  R.energy = Math.min(100, (R.energy || 0) + dt * (100 / secs) * (1 + 0.12 * R.pi));
  if (R.energy >= 100 && SIGS[k](R)) { R.energy = 0; R.say(k); }
}
const mechSig = (k, name, id, o = {}) => sig(k, name, (R) => runMech(R, id, name, o));
mechSig('ph_latch_soak', 'Weight of the Latch', 'soak');                       // M01 split soak (pets count half)
mechSig('ph_latch_hold', 'The Last Latch Holds', 'shield', { big: true });     // M39 at 100 energy: break the ward or die
PASSIVES.ph_latch_e = (R, dt) => energy(R, dt, 34, 'ph_latch_hold');
mechSig('ph_ballot', 'The Ballot Falls', 'brk', { big: true });                // M35 at 100 energy: the pit floor round him falls
PASSIVES.ph_elector_e = (R, dt) => energy(R, dt, 32, 'ph_ballot');
mechSig('ph_ingot', 'Quench the Crown', 'carry', { item: 'Cold Ingot', socket: 'the Quench Trough' });   // M23 carry
mechSig('ph_servers', 'The Serving Line', 'march', { add: 'Table Servant' });  // M18 marchers to the Marshal
mechSig('ph_index', 'Index of Ruin', 'combo', { big: true });                  // M12 at 100 energy: a five-glyph string
mechSig('ph_ink', 'Ink Index', 'pool');                                        // M07 drop the ink at the shelves
PASSIVES.ph_regent_e = (R, dt) => energy(R, dt, 30, 'ph_index');
mechSig('ph_pwave', 'The Pennant Wave', 'wave', { big: true });                // M32 a wall with gaps
mechSig('ph_mass', 'The Black Mass', 'shield');                                // M39 intermission: ward and a long channel
mechSig('ph_rod', 'Lightning Rod', 'soak');                                    // M01 the rod takes the strike, or the bridge does
mechSig('ph_well', 'The Umbral Well', 'pull', { big: true });                  // M29 at 100 energy: pulled toward his maw
mechSig('ph_lance', 'Umbral Lance', 'beam');                                   // M04 intercept the beam before it feeds him
PASSIVES.ph_eclipse_e = (R, dt) => energy(R, dt, 30, 'ph_well');
// Lord Velscour: one per form, in every battle
mechSig('ph_v_edict', "Velscour's Edict", 'combo');                            // M12
mechSig('ph_v_tithe', 'Tithe of the Damned', 'soak');                          // M01
mechSig('ph_v_ascend', 'Ascension', 'shield');                                 // M39
mechSig('ph_v_unmake', 'The World Breaks', 'brk', { big: true });              // M35

// ================================================================================== the wing lords' templates
const T = (id, re, o) => ({ id: 'ph_' + id, art: [artNamed(re)], sigs: true, phobos: true, hp: 1.15, spd: 0.9, ...o });
export const WING_RAIDS = {
  latch: T('latch', /Third Latch/, { name: 'Keeper of the Third Latch', title: 'Warden of the Lower Ward Gate', el: 'phys', fx: 'bone', adds: ['knight'], mech: ['ph_latch', 'ph_latch_soak'], passive: 'ph_latch_e',
    phases: [{ name: 'The Bent Passage', pool: { ph_latch: 2, ph_latch_soak: 2, ph_roar: 2, ph_cross: 3, ph_rain: 2 } }, { name: 'Murder Holes', pool: { ph_latch: 2, ph_rain: 3, ph_roar: 2, adds: 1 } }, { name: 'Killing Ground', pool: { ph_latch: 2, ph_wave: 2, ph_roar: 2, ph_cross: 2 } }, { name: 'The Last Latch', pool: { ph_latch: 3, ph_roar: 3, ph_rain: 2, ph_wave: 2 } }] }),
  elector: T('elector', /Oubliette Elector/, { name: 'The Oubliette Elector', title: 'Who Votes Who Falls', el: 'shadow', fx: 'shadow', adds: ['skeleton', 'zombie'], mech: ['ph_chains'], passive: 'ph_elector_e',
    phases: [{ name: 'The Ballot of Chains', pool: { ph_chains: 2, ph_collapse: 2, ph_cross: 2, ph_orbs: 2 } }, { name: 'The Pit Opens', pool: { ph_collapse: 3, ph_chains: 2, ph_rain: 2, adds: 1 } }, { name: 'Forgotten Below', pool: { ph_chains: 2, ph_collapse: 2, ph_ring: 2, ph_orbs: 2 } }, { name: 'The Last Vote', pool: { ph_chains: 3, ph_collapse: 3, ph_ring: 2, ph_cross: 2 } }] }),
  armourer: T('armourer', /Armourer/, { name: 'Armourer of the Hollow Crown', title: 'Who Tempers in Blood', el: 'fire', fx: 'fireball', adds: ['knight', 'golem'], passive: 'ph_forge', mech: ['ph_ingot'],
    phases: [{ name: 'Banked Coals', pool: { ph_anvil: 3, ph_ingot: 2, ph_rain: 2, ph_orbs: 2 } }, { name: 'The Bellows', pool: { ph_anvil: 2, ph_orbs: 3, ph_wave: 2, adds: 1 } }, { name: 'White Heat', pool: { ph_anvil: 3, ph_ring: 2, ph_rain: 2 } }, { name: 'The Crown Is Cast', pool: { ph_anvil: 3, ph_orbs: 2, ph_wave: 2, ph_ring: 2 } }] }),
  banquet: T('banquet', /Iron Table/, { name: 'The Iron Table Marshal', title: 'and the Brazier Duke', el: 'fire', fx: 'fireball', adds: ['zombie', 'abomination'], passive: 'ph_banquet', mech: ['ph_settings', 'ph_servers'],
    phases: [{ name: 'Grace Is Said', pool: { ph_settings: 2, ph_servers: 2, ph_cross: 3, ph_rain: 2 } }, { name: 'The Second Course', pool: { ph_settings: 2, ph_orbs: 2, ph_wave: 2, adds: 1 } }, { name: 'The Feast That Walks', pool: { ph_settings: 2, ph_ring: 2, ph_rain: 3 } }, { name: 'Last Supper', pool: { ph_settings: 3, ph_wave: 2, ph_orbs: 2, ph_soak: 1 } }] }),
  regent: T('regent', /Long Stacks/, { name: 'The Long Stacks Regent', title: 'Keeper of the Forbidden Index', el: 'arcane', fx: 'shard', adds: ['cultist', 'eye'], mech: ['ph_memory'], passive: 'ph_regent_e',
    phases: [{ name: 'The Reading Room', pool: { ph_memory: 2, ph_ink: 2, ph_pages: 3, ph_cross: 2 } }, { name: 'The Long Stacks', pool: { ph_memory: 2, ph_pages: 2, ph_wave: 2, adds: 1 } }, { name: 'Forbidden Index', pool: { ph_memory: 2, ph_ring: 2, ph_pages: 3 } }, { name: 'Burning Library', pool: { ph_memory: 3, ph_pages: 3, ph_ring: 2, ph_wave: 2 } }] }),
  pennants: T('pennants', /Iron Pennants/, { name: 'The Queen of Iron Pennants', title: 'Mistress of the Menagerie', el: 'poison', fx: 'poison', adds: ['hound', 'spider'], passive: 'ph_veil', mech: ['ph_pwave'],
    phases: [{ name: 'The Cage Rows', pool: { ph_pennants: 3, ph_pwave: 2, ph_orbs: 2, ph_rain: 2 } }, { name: 'The Drowned Glass', pool: { ph_pennants: 2, ph_wave: 2, ph_orbs: 2, adds: 1 } }, { name: 'Into the Veil', pool: { ph_pennants: 3, ph_ring: 2, ph_rain: 2 } }, { name: 'The Pennants Fall', pool: { ph_pennants: 3, ph_wave: 3, ph_orbs: 2 } }] }),
  chancellor: T('chancellor', /Ash Chancellor/, { name: 'Ash Chancellor of the Sanctuaries', title: 'Voice of the Black Nave', el: 'holy', fx: 'holy', adds: ['cultist', 'wraith'], passive: 'ph_polarity', mech: ['ph_candles', 'ph_mass'],
    phases: [{ name: 'Vespers', pool: { ph_candles: 2, ph_mass: 2, ph_cross: 3, ph_orbs: 2 } }, { name: 'The Black Mass', pool: { ph_candles: 2, ph_ring: 2, ph_wave: 2, adds: 1 } }, { name: 'Light and Void', pool: { ph_candles: 2, ph_rain: 2, ph_cross: 3 } }, { name: 'Compline', pool: { ph_candles: 3, ph_ring: 2, ph_wave: 2, ph_soak: 1 } }] }),
  windward: T('windward', /Windward/, { name: 'The Windward Black Knight', title: 'Who Holds the Storm Bridge', el: 'light', fx: 'spark', adds: ['knight', 'gargoyle'], passive: 'ph_gale', mech: ['ph_rod'],
    phases: [{ name: 'The Storm Bridge', pool: { ph_storm: 2, ph_rod: 2, ph_cross: 3, ph_rain: 2 } }, { name: 'Crosswinds', pool: { ph_storm: 3, ph_wave: 2, adds: 1 } }, { name: 'Eye of the Storm', pool: { ph_storm: 2, ph_ring: 2, ph_cross: 2 } }, { name: 'The Fall', pool: { ph_storm: 3, ph_rain: 2, ph_ring: 2, ph_wave: 2 } }] }),
  eclipse: T('eclipse', /Eclipse/, { name: "The High Ward's Eclipse", title: 'Shadow on the Throne Antechambers', el: 'shadow', fx: 'shadow', adds: ['wraith', 'cultist'], mech: ['ph_eclipse', 'ph_beam'], passive: 'ph_eclipse_e',
    phases: [{ name: 'Penumbra', pool: { ph_beam: 2, ph_lance: 2, ph_eclipse: 2, ph_orbs: 2, ph_cross: 2 } }, { name: 'Umbra', pool: { ph_beam: 2, ph_eclipse: 2, ph_ring: 2, adds: 1 } }, { name: 'Totality', pool: { ph_eclipse: 2, ph_beam: 3, ph_rain: 2 } }, { name: 'The Diamond Ring', pool: { ph_eclipse: 2, ph_beam: 3, ph_ring: 2, ph_orbs: 2 } }] }),
};

// ================================================================================== LORD VELSCOUR, four forms
const FORM_SCALE = [2.4, 2.6, 2.8, 3.0];
PASSIVES.ph_velscour = (R, dt) => {
  const m = R.m, v = R.tpl.variant, forms = FINALE[v].forms;
  if (R.form !== R.pi) {   // he burns and rises in his next form
    R.form = R.pi;
    const id = forms[Math.min(R.pi, forms.length - 1)], a = PHOBOS_BY_ID[id];
    if (a) { m.art = id; m.artH = a.h; m.look = { art: id, swap: null }; m.sprite = null; }
    m.scale = FORM_SCALE[R.pi] || 3.3; m.r = 1.05 + R.pi * 0.2;
    m.name = FORM_NAMES[R.pi].toUpperCase();
    if (R.pi > 0) { UI.centerMsg(FORM_NAMES[R.pi].toUpperCase(), ['', 'His body catches fire and the demon rises', 'The Alpha Being', 'Destroyer of Worlds'][R.pi], 3.5); explosionFx(m.x, m.y, 4 + R.pi, R.tpl.el, 'eruption', { shake: 14 }); addEffect(new Column(m.x, m.y, '#ff3010', 1.4, 60, 500)); sfx('roar'); G.flash = 0.6; }
  }
  const p = hero(R), a = A(R); if (!p) return;
  // each battle's own fight-long mechanic, by form
  if (v === 'crimson') {
    if (R.pi === 1 && (R.tide = (R.tide ?? 6) - dt) <= 0) { R.tide = 9; const [x, y] = randFloor(R, 3); const Z = zone(R, { x, y, r: 2.6, dur: 40, color: '#a00010', good: false }); Z.tick = (d) => { if (Z.inside(p) && (Z.h = (Z.h || 0) - d) <= 0) { Z.h = 0.5; hit(m, p, m.dmg * 0.4, 'blood', { force: true, crit: false, dot: true }); } }; }
    if (R.pi === 2) { // the Dynasty's Debt: blows taken stack; a blood font cleanses them
      R.debt = Math.min(10, (R.debt || 0) + dt * 0.6); p.raidTakenMul = 1 + R.debt * 0.06;
      R.fonts ||= [];
      for (let k = 0; k < 2; k++) if (!R.fonts[k] || R.fonts[k].dead || R.fonts[k].t > R.fonts[k].dur) { const [x, y] = randFloor(R, 4); R.fonts[k] = zone(R, { x, y, r: 1.8, dur: 14 + k * 7, color: '#ff6080', good: true, goal: R.debt > 4 }); }
      if (R.fonts.some((F) => F.inside(p)) && R.debt > 1) { R.debt = 0; floatText(p.x, p.y, 70, 'DEBT PAID', '#ff90a0', 14); }
    } else p.raidTakenMul = 1;
    if (R.pi === 3) shrink(R, dt, a, p);
  } else if (v === 'obsidian') {
    if (R.pi === 0 && PASSIVES.vexis) PASSIVES.vexis(R, dt);
    else p.raidDmgMul = 1;
    if ((R.pi === 1 || R.pi === 3) && !p.leaping && !p.dashT && !p.blink) { const d = dist(p.x, p.y, m.x, m.y), pull = (R.pi === 3 ? 1.4 : 0.9) * dt; if (d > 2.5) { const nx = p.x + (m.x - p.x) / d * pull, ny = p.y + (m.y - p.y) / d * pull; if (m.world.map.circleFree(nx, ny, 0.3)) { p.x = nx; p.y = ny; } } if (chance(dt * 8)) addEffect(new Bolt(p.x, p.y, 30, m.x, m.y, 60, '#7020c0', 0.15, 2)); }
    if (R.pi === 2 && (R.ecl = (R.ecl ?? 4) - dt) <= 0) { R.ecl = 18; SIGS.ph_eclipse(R); }
    if (R.pi === 3 && (R.hole = (R.hole ?? 5) - dt) <= 0) { R.hole = 14; mover(R, { x: a.cx, y: a.cy, ang: rand(TAU), speed: 1.4, dur: 12, r: 1.8, color: '#300060', mul: 2.2, teeth: 12, spin: 2 }); UI.centerMsg('EVENT HORIZON', 'Do not touch the black star', 1.6); }
  } else {   // the Cathedral of Ruin: the bell tolls on a beat; glass falls; the nave collapses
    if ((R.bell = (R.bell ?? 7) - dt) <= 0) { const knell = R.pi === 3; R.bell = knell ? 3.2 : 9 - R.pi; if (knell && !R.knell) { R.knell = true; UI.centerMsg('THE DEATH KNELL', 'The bells ring in quick time: step through each gap', 2.6); } const ring = new InRing(R, { x: m.x, y: m.y, r: 2, speed: knell ? -5 : -4, gap: rand(TAU), gapW: knell ? 0.8 : 1, color: '#ffe0a0', mul: 1 }), up = ring.update.bind(ring); ring.update = (d) => up(d) && ring.r < 17; m.world.addHazard(ring); floatText(m.x, m.y, 160, 'THE BELL TOLLS', '#ffe0a0', 16); sfx('bell'); }
  }
};
// the arena closing in (the world ending round the fight): outside the radius burns
function shrink(R, dt, a, p, text = 'The world unmakes itself') {
  if (!R.wall) { R.wall = Math.min(a.w, a.h) / 2; UI.centerMsg('DESTROYER OF WORLDS', text, 2.6); R.wallHaz = R.m.world.addHazard({ ground: true, t: 0, danger(out) { out.push({ ring: true, x: a.cx, y: a.cy, r0: R.wall, r1: 40 }); }, autoGoal: () => (dist(p.x, p.y, a.cx, a.cy) > R.wall - 1.5 ? { x: a.cx, y: a.cy, r: R.wall - 2 } : null), update() { return live(R); },
    draw(ctx) { ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ff2010'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(isoX(a.cx, a.cy), isoY(a.cx, a.cy), R.wall * HW * 1.41, R.wall * HH * 1.41, 0, 0, TAU); ctx.stroke(); ctx.restore(); } }); }
  R.wall = Math.max(6, R.wall - dt * 0.12);
  if (dist(p.x, p.y, a.cx, a.cy) <= R.wall) R.burnN = 0;
  else if ((R.wh = (R.wh || 0) - dt) <= 0) { R.wh = 0.5; R.burnN = (R.burnN || 0) + 1; hit(R.m, p, p.maxHp * Math.min(0.07, 0.02 + 0.01 * R.burnN), 'fire', { force: true, crit: false, dot: true }); }
}
sig('ph_dominion', 'Crimson Dominion', (R) => { const m = R.m; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + R.pi * 0.2; line(R, m.x, m.y, a, 14, 0.6, 1.1, 1.1, '#ff2030', { el: 'blood' }); } sfx('swing'); });
sig('ph_court', 'The Crimson Court', (R) => { const a = A(R); for (let i = 0; i < 3; i++) add(R, a.cx + Math.cos(i * 2.1) * 6, a.cy + Math.sin(i * 2.1) * 5, { name: 'Dynasty Knight', arch: 'knight', ai: 'melee', hp: 0.035, dmg: 0.5, priority: 4, artH: 60 }); UI.centerMsg('THE CRIMSON COURT', 'His knights kneel no more', 1.8); });
sig('ph_starfall', 'Starfall', (R) => { const a = A(R); for (let i = 0; i < 12 + R.pi * 4; i++) blast(R, a.x + rand(2, a.w - 2), a.y + rand(2, a.h - 2), 1.8, 1 + rand(0, 1.6), 1.1, { el: 'shadow', fx: 'explosion' }); sfx('arcane'); });
sig('ph_glass', 'Shattered Glass', (R) => { const a = A(R), off = (Math.random() * 2) | 0; for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) if ((i + j + off) % 2 === 0) blast(R, a.x + a.w * (i + 0.5) / 7, a.y + a.h * (j + 0.5) / 6, 1.7, 1.5, 1.1, { el: 'holy', fx: 'explosion' }); UI.centerMsg('SHATTERED GLASS', 'Step onto the dark squares', 1.6); sfx('glass'); });
sig('ph_pillars', 'Falling Pillars', (R) => { const a = A(R); for (let i = 0; i < 3 + R.pi; i++) { const x = a.x + rand(3, a.w - 3); line(R, x, a.y + 1, Math.PI / 2, a.h - 2, 1.2, 1.4 + i * 0.3, 1.6, '#d0b890'); } sfx('thud'); });

const FORM_SIGS = ['ph_v_edict', 'ph_v_tithe', 'ph_v_ascend', 'ph_v_unmake'];   // one WoW mechanic per form
const VT = (variant, el, fx, phases, adds) => ({ id: 'ph_velscour_' + variant, variant, name: 'Lord Velscour', title: FINALE[variant].name, art: [FINALE[variant].forms[0]], el, fx, sigs: true, phobos: true,
  passive: 'ph_velscour', hp: 2.6, spd: 0.85, adds, mech: [...FORM_SIGS], phases: phases.map((P, i) => ({ ...P, pool: { ...P.pool, [FORM_SIGS[i]]: 2 } })) });
// each wing boss is its own fight: its signatures in every phase, growing heavier, and at most two shared patterns, light
const GENERIC = new Set(['ph_cross', 'ph_rain', 'ph_ring', 'ph_wave', 'ph_orbs', 'ph_soak']);
for (const T of Object.values(WING_RAIDS)) {
  const own = [...new Set(T.phases.flatMap((P) => Object.keys(P.pool).filter((k) => !GENERIC.has(k) && k !== 'adds')))];
  T.phases.forEach((P, i) => {
    const gen = Object.keys(P.pool).filter((k) => GENERIC.has(k)).slice(0, 2), pool = {};
    for (const k of own) pool[k] = (P.pool[k] || 2) + Math.floor(i / 2);
    for (const k of gen) pool[k] = 1;
    if (P.pool.adds) pool.adds = P.pool.adds;
    P.pool = pool;
  });
}
export const VELSCOUR_RAIDS = {
  crimson: VT('crimson', 'blood', 'fire', [
    { name: 'The Crimson Dynasty', pool: { ph_dominion: 3, ph_court: 2, ph_cross: 2, ph_soak: 1 } },
    { name: 'Sanguine Tide', pool: { ph_dominion: 2, ph_orbs: 3, ph_rain: 2, ph_wave: 2 } },
    { name: "The Dynasty's Debt", pool: { ph_dominion: 3, ph_ring: 2, ph_court: 1, ph_soak: 2 } },
    { name: 'Destroyer of Worlds', pool: { ph_dominion: 3, ph_rain: 3, ph_ring: 2, ph_wave: 2, ph_soak: 1 } }], ['knight', 'demon']),
  obsidian: VT('obsidian', 'shadow', 'shadow', [
    { name: 'Umbral Polarity', pool: { ph_starfall: 2, ph_cross: 3, ph_orbs: 2 } },
    { name: 'Gravity Well', pool: { ph_starfall: 3, ph_ring: 2, ph_wave: 2 } },
    { name: 'Eclipse', pool: { ph_beam: 2, ph_starfall: 2, ph_orbs: 2, ph_soak: 1 } },
    { name: 'Event Horizon', pool: { ph_beam: 2, ph_starfall: 3, ph_ring: 2, ph_cross: 2 } }], ['wraith', 'demon']),
  cathedral: VT('cathedral', 'holy', 'holy', [
    { name: 'The Tolling Bell', pool: { ph_cross: 3, ph_candles: 2, ph_pillars: 2 } },
    { name: 'Shattered Glass', pool: { ph_glass: 3, ph_pillars: 2, ph_orbs: 2 } },
    { name: 'Choir of the Damned', pool: { ph_glass: 2, ph_candles: 2, ph_ring: 2, ph_soak: 2 } },
    { name: 'The Cathedral of Ruin', pool: { ph_pillars: 3, ph_glass: 2, ph_ring: 2, ph_wave: 2 } }], ['cultist', 'demon']),
};
void addLight; void glowSprite; void say; void Ring;
