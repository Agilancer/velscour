// TESSARIEL'S KEEP, entered (docs/TESSARIELS_KEEP.md): the world built from the bake and the hero's choices
// (world/keepworld.js), its people (game/keepfolk.js), what can be used in it (the Castellan, the Sacred Flame, the War
// Table, the Chronicle, the pedestals, the Vault, the chests) and the ways out (back to town, the Waygate below).
import { G } from '../state.js';
import { rand } from '../core/util.js';
import { sfx, playMusic, setAmbience } from '../core/audio.js';
import { addLight, addEffect, Ring, sparkle, floatText } from '../gfx/vfx.js';
import { World } from './world.js';
import { UI } from '../ui/ui.js';
import { HUD } from '../ui/hud.js';
import { biomeTileSet } from '../core/assets.js';
import { TOWN_BIOME } from '../data/biomes.js';
import { generateKeep, keepProps, keepDressTile } from '../world/keepworld.js';
import { loadKeepArt, drawSacredFlame } from '../gfx/keepart.js';
import { startKeepFolk, keepWelcome } from './keepfolk.js';
import { keepState, checkProgress, kindle, kindled, kindleReadyIn } from './keep.js';
import { KINDLE, TROPHY_BY_ID, KEEP_NAME, EMBER_COLOR, CASTELLAN, DECOR, renownRank } from '../data/keep.js';
import { input } from '../core/input.js';
import { camera } from '../core/view.js';
import { CX, CY, TK } from '../world/tkeep.js';
import { endgameUnlocked } from './endgame.js';

/** The keep's light and air: an evening hall, cool stone, warm braziers, the green Flame. */
export const KEEP_BIOME = {
  id: 'tkeep', name: KEEP_NAME, pack: 'catacombs', palette: TOWN_BIOME.palette, wallPalette: TOWN_BIOME.wallPalette,
  dark: 0.3, light: 11, ambient: { type: 'firefly', color: '#d8ff90' }, mon: { hue: 0, sat: 1, light: 0 }, blood: '#8a0b08', torch: '#ffb050', fog: '#06080a', keep: true,
};

let gen = null;
/** Build the keep for the hero and step in through its portal (game.enterKeep calls this behind the loading screen). */
export async function buildKeep(game) {
  await loadKeepArt();
  const c = G.char, k = keepState(c);
  gen ||= generateKeep();
  const map = gen.map, A = gen.anchors;
  map.seen.fill(0);
  const world = new World('town', { map, tileset: biomeTileSet(TOWN_BIOME), biome: KEEP_BIOME, depth: 0, props: [], buildings: [], wallHangings: [] });
  world.keep = true; world.layout = gen.layout; world.anchors = A;
  map.dressTile = keepDressTile(world);
  world.props = keepProps(world, k.decor, k.have);
  world.npcs = [];
  // the Sacred Flame (kneel: the blessing), the War Table, the Chronicle, the Vault, the pedestals
  const [fx, fy, flv] = A.flame;
  const flame = { keepFlame: true, name: 'The Sacred Flame', x: fx + 0.3, y: fy + 0.3,   // (sorted after the bowl's nearest tile, so nothing of the brazier is drawn over the fire)
      // sorted behind the brazier's near rim and blades: it burns inside the crown
    lv: flv, reach: 2.7, flip: false,
    use: () => kneel(world, flame), update: (dt) => keepLights(world, dt) };
  world.npcs.push(flame);
  const mark = (o) => world.npcs.push({ keepMarker: true, reach: 1.7, flip: false, ...o });
  mark({ name: 'The War Table', x: A.warTable[0], y: A.warTable[1], h: 34, use: () => G.ui.keep.open('war') });
  mark({ name: 'The Chronicle of Deeds', x: A.chronicle[0], y: A.chronicle[1], h: 40, use: () => G.ui.keep.open('chronicle') });
  mark({ name: 'The Vault of the Flame', x: A.vault[0], y: A.vault[1], h: 30, use: () => G.ui.keep.open('vault') });
  A.pedestals.forEach((p, i) => world.npcs.push({ keepMarker: true, pedestal: i, x: p.x, y: p.y, h: 26, reach: 1.9, flip: false,
    get name() { const id = keepState().decor.pedestal[i]; return id ? TROPHY_BY_ID[id]?.name : 'An empty pedestal'; }, use: () => G.ui.keep.open('furnish', { pedestal: i }) }));
  // what hangs on the walls: click a banner or a window to change it (Furnish opens on that place)
  const hang = (kind, list) => list.forEach((s, i) => {
    const [x, y] = s.axis === 'x' ? [s.a, s.c + 0.1] : [s.c + 0.1, s.a];
    world.npcs.push({ keepMarker: true, decorSlot: [kind, i], x: x + 0.012, y: y + 0.012, reach: 2.4, flip: false,
      get name() { const id = keepState().decor[kind][i], d = id && DECOR[kind].find((q) => q.id === id); return d ? d.name : ''; },
      use: () => G.ui.keep.open('furnish', { slot: [kind, i] }) });
  });
  hang('banner', A.banners); hang('glass', A.windows);
  // the chests every town has, by the portal
  world.npcs.push({ stash: true, name: 'Storage Chest', x: A.stash[0], y: A.stash[1], reach: 1.6, flip: false, use: () => G.ui.stash.open() });
  world.npcs.push({ stash: true, reliquary: true, name: 'The Reliquary', x: A.reliquary[0], y: A.reliquary[1], reach: 1.6, flip: false, use: () => G.ui.reliquary.open() });
  world.npcs.push({ stash: true, jewelBox: true, name: 'Jewel Box', x: A.jewelBox[0], y: A.jewelBox[1], reach: 1.6, flip: false, use: () => G.ui.jewelBox.open() });
  const folk = startKeepFolk(world, A);
  folk.castellan.use = () => G.ui.keep.open('sagas');
  world.npcs.push({ hidden: true, name: '', x: -9, y: -9, update: (dt) => folk.update(dt) });
  // the ways out: home to town, or the Waygate down
  const home = c.lastTown === 'act2' && c.visitedAct2Town ? 'Sunscorch Oasis' : 'Herrington Hollow';
  world.portals = [
    { x: A.townPortal[0], y: A.townPortal[1], active: true, color: '#c8f060', reach: 1.8, keepGate: true, label: `Portal — ${home}`,
      use: () => { sfx('portal'); if (home === 'Sunscorch Oasis') game.enterAct2Town(); else game.enterTown(); } },
    { x: A.waygate[0], y: A.waygate[1], active: true, color: '#ff7a30', reach: 1.8, label: 'The Waygate', use: () => waygate(game) },
  ];
  checkProgress(c);
  return { world, start: A.start };
}

/** The hero has stepped out of the portal: the Flame leaps, light rings out from where they stand, the hall looks up. */
export function keepArrive(world) {
  const p = world.player, A = world.anchors;
  if (!p) return;
  world.flameSurge = 0.7;
  addEffect(new Ring(p.x, p.y, 0.2, 2.6, 0.9, '#c8f060', 3));
  sparkle(p.x, p.y, 30, '#e8ffb0', 22, 0.9);
  addEffect(new Ring(A.flame[0], A.flame[1], 0.6, 5, 1.4, '#9cff5a', 2));
  keepWelcome(world);
}

/** The Waygate: down to the hero's depth, or the Breach, or the Rift, without the walk through town. */
function waygate(game) {
  const c = G.char, rows = [{ label: `The descent — Depth ${game.maxPortalFloor(c)}`, cls: 'red', fn: () => game.confirmDungeon() }];
  if ((c.deepest || 0) >= 20 || (c.breach?.best || 0) > 0) rows.push({ label: 'THE ETERNAL BREACH', fn: () => game.confirmBreach() });
  if (endgameUnlocked(c)) rows.push({ label: 'An Abyssal Rift', fn: () => game.confirmRift() });
  rows.push({ label: 'Not yet' });
  UI.dialog({ title: 'The Waygate', html: '<p>Tessariel\'s fire opens the way down from here as well as from town.</p>', buttons: rows });
}

/** Kneel at the Sacred Flame: Kindled for KINDLE.minutes (XP, gold and magic find), once an hour. */
function kneel(world, flame) {
  const c = G.char, p = world.player;
  if (kindled(c)) { floatText(p.x, p.y, 60, 'The Flame already burns in you', EMBER_COLOR, 12); return; }
  const wait = kindleReadyIn(c), k = keepState(c);
  if (wait > 0) {
    // the Flame rests: it can be fed Embers to burn again now (a sink for a hero who plays all day)
    if (k.embers < KINDLE.rekindle) { floatText(p.x, p.y, 60, `The Flame rests (${Math.ceil(wait / 60000)} min)`, '#b8c0a0', 12); sfx('error', 0.5); return; }
    UI.dialog({ title: 'The Flame rests', html: `<p>It will burn for you again in <b>${Math.ceil(wait / 60000)} minutes</b>. Fed <b style="color:${EMBER_COLOR}">${KINDLE.rekindle} Embers</b> (you have ${k.embers}), it burns now.</p>`,
      buttons: [{ label: 'Let it rest' }, { label: `Feed it · ${KINDLE.rekindle}`, cls: 'red', fn: () => { if (kindle(c, true)) blessed(world, flame); } }] });
    return;
  }
  kindle(c);
  blessed(world, flame);
}
function blessed(world, flame) {
  const p = world.player;
  sfx('levelup', 0.6);
  world.flameSurge = 1;
  addEffect(new Ring(world.anchors.flame[0], world.anchors.flame[1], 0.3, 3.2, 1, '#9cff5a', 4)); addEffect(new Ring(world.anchors.flame[0], world.anchors.flame[1], 0.3, 6.5, 1.6, '#e8ffb0', 2));
  sparkle(p.x, p.y, 40, '#c8f060', 24, 0.8);
  UI.centerMsg('KINDLED', `+${KINDLE.xp}% XP · +${KINDLE.gf}% gold · +${KINDLE.mf} magic find for ${KINDLE.minutes} minutes`, 3);
  UI.log(`Tessariel's fire burns in you: <b style="color:${EMBER_COLOR}">Kindled</b> for ${KINDLE.minutes} minutes.`, '#d8f0a0');
  G.game?.autosave?.();
}

/** The keep's lights, every frame (world.update clears them first). */
function keepLights(world, dt) {
  const A = world.anchors, t = world.time;
  world.flameSurge = Math.max(0, (world.flameSurge || 0) - dt * 0.45);
  addLight(A.flame[0], A.flame[1], 7 + (world.flameSurge || 0) * 3, 1, 60, null, true);   // light without colour far out: the stone keeps its own
  addLight(A.flame[0], A.flame[1], 2.6 + Math.sin(t * 3.1) * 0.25 + (world.flameSurge || 0) * 3, 0.5, 80, '#7dff5a', true);
  // the upper walls and their wall-heads, out of the dark
  for (let s = TK.F0 + 1; s <= TK.F1; s += 5.5) { addLight(s, TK.OW + 2.2, 6, 0.4, 250, null, true); addLight(TK.OW + 2.2, s, 6, 0.4, 250, null, true); }
  for (const [x, y] of A.braziers) { addLight(x, y, 3.4, 0.8, 22, null); addLight(x, y, 1.8 + Math.sin(t * 7 + x) * 0.15, 0.6, 22, '#ffb060'); }
  for (const [x, y, z] of A.chandeliers) { addLight(x, y, 4.6, 0.6, 20, null); addLight(x, y, 2.2, 0.6, z * 4 + 6, '#ffd090'); }
  for (const w of A.windows) addLight(w.axis === 'x' ? w.a : w.c + 2.2, w.axis === 'x' ? w.c + 2.2 : w.a, w.wide ? 4.6 : 3.2, 0.6, (w.z0 + 6) * 4, null);
  addLight(A.castellan[0], A.castellan[1] + 0.6, 3.2, 0.7, 30, null);
  for (const p of world.portals) { addLight(p.x, p.y, 3, 0.8, 30, null); addLight(p.x, p.y, 1.6, 0.6, 30, p.color); }
  for (const s of [A.stash, A.reliquary]) addLight(s[0], s[1], 2, 0.5, 20, '#ffd070');
  for (const pr of world.props) if (pr.trophy) addLight(pr.x, pr.y, 1.7, 0.6, 40, '#ffe8b0');   // a lamp on every trophy
  for (const [x, y] of A.frontLights || []) addLight(x, y, 2.6, 0.7, 30, null);
}

/** Draw a keep thing render.js handed over (drawNpc): the Flame and the click targets. */
export function drawKeepNpc(ctx, n, x, y, t) {
  if (n.keepFlame) {
    const k = 1 + renownRank(keepState().renown) * 0.012 + (kindled() ? 0.08 : 0) + (G.world.flameSurge || 0) * 0.45;   // it grows with the hero's Renown, burns higher while Kindled
    y -= 9.6;   // (its sort point is 0.3 tiles in front of the bowl's middle)
    drawSacredFlame(ctx, x, y - 36, t, k);   // its foot in the bowl of coals (the rim is 15 levels up; the tile under it 6)
    if (kindled()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2 + Math.sin(t * 4) * 0.08; ctx.fillStyle = '#c8f060'; ctx.beginPath(); ctx.ellipse(x, y - 4, 46, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    n.sbox = [x - 34, y - 36 - 150 * k, x + 34, y - 20];   // its name stands over the fire
    return true;
  }
  if (n.decorSlot) {
    // a banner or a window: its click box is its own sprite; under the mouse it lights up and says what it is
    const w = G.world;
    if (n._props !== w.props) { n._props = w.props; n._prop = w.props.find((p) => p.slot && p.slot[0] === n.decorSlot[0] && p.slot[1] === n.decorSlot[1]) || null; }
    const pr = n._prop;
    if (!pr) { n.sbox = null; return true; }
    const s = pr.spr, k = pr.k, bx = x + s.ox * k, by = y + s.oy * k, bw = s.w * k, bh = s.h * k;
    n.sbox = [bx + bw * 0.22, by + bh * 0.12, bx + bw * 0.78, by + bh * 0.88];
    if (!G.touch && input.mouse.inside && !G.ui?.modalCount) {
      const [a, b] = camera.toScreen(n.sbox[0], n.sbox[1]), [c, d] = camera.toScreen(n.sbox[2], n.sbox[3]), m = input.mouse;
      if (m.x >= a && m.x <= c && m.y >= b && m.y <= d) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + Math.sin(t * 5) * 0.06;
        ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, bx, by, bw, bh); ctx.restore();
        ctx.save(); ctx.font = '700 9px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#f0e0a0';
        const label = `${n.name} · change`; ctx.strokeText(label, bx + bw / 2, by + bh * 0.1); ctx.fillText(label, bx + bw / 2, by + bh * 0.1); ctx.restore();
      }
    }
    return true;
  }
  if (n.keepMarker) { n.sbox = [x - 20, y - (n.h || 30) - 10, x + 20, y + 6]; return true; }
  return false;
}

/** Bonus folk for tests and the HUD's area line. */
export function keepAreaLine() { const c = G.char, k = keepState(c); return `${CASTELLAN.name} keeps the Flame · ${k.embers} Embers`; }
export { CX, CY, rand, HUD, playMusic, setAmbience };
