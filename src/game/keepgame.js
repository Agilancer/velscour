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
import { startKeepFolk } from './keepfolk.js';
import { keepState, checkProgress, kindle, kindled, kindleReadyIn } from './keep.js';
import { KINDLE, TROPHY_BY_ID, KEEP_NAME, EMBER_COLOR, CASTELLAN } from '../data/keep.js';
import { CX, CY } from '../world/tkeep.js';
import { endgameUnlocked } from './endgame.js';

/** The keep's light and air: an evening hall, cool stone, warm braziers, the green Flame. */
export const KEEP_BIOME = {
  id: 'tkeep', name: KEEP_NAME, pack: 'catacombs', palette: TOWN_BIOME.palette, wallPalette: TOWN_BIOME.wallPalette,
  dark: 0.36, light: 11, ambient: { type: 'firefly', color: '#d8ff90' }, mon: { hue: 0, sat: 1, light: 0 }, blood: '#8a0b08', torch: '#ffb050', fog: '#06080a', keep: true,
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
  const flame = { keepFlame: true, name: 'The Sacred Flame', x: fx + 0.02, y: fy + 0.02, lv: flv, reach: 2.3, flip: false,
    use: () => kneel(world, flame), update: (dt) => keepLights(world, dt) };
  world.npcs.push(flame);
  const mark = (o) => world.npcs.push({ keepMarker: true, reach: 1.7, flip: false, ...o });
  mark({ name: 'The War Table', x: A.warTable[0], y: A.warTable[1], h: 34, use: () => G.ui.keep.open('war') });
  mark({ name: 'The Chronicle of Deeds', x: A.chronicle[0], y: A.chronicle[1], h: 40, use: () => G.ui.keep.open('chronicle') });
  mark({ name: 'The Vault of the Flame', x: A.vault[0], y: A.vault[1], h: 30, use: () => G.ui.keep.open('vault') });
  A.pedestals.forEach((p, i) => world.npcs.push({ keepMarker: true, pedestal: i, x: p.x, y: p.y, h: 26, reach: 1.9, flip: false,
    get name() { const id = keepState().decor.pedestal[i]; return id ? TROPHY_BY_ID[id]?.name : 'An empty pedestal'; }, use: () => G.ui.keep.open('furnish', { pedestal: i }) }));
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
  const wait = kindleReadyIn(c);
  if (wait > 0) { floatText(p.x, p.y, 60, `The Flame rests (${Math.ceil(wait / 60000)} min)`, '#b8c0a0', 12); sfx('error', 0.5); return; }
  kindle(c);
  sfx('levelup', 0.6);
  addEffect(new Ring(flame.x, flame.y, 0.3, 3.2, 1, '#9cff5a', 4));
  sparkle(p.x, p.y, 40, '#c8f060', 24, 0.8);
  UI.centerMsg('KINDLED', `+${KINDLE.xp}% XP · +${KINDLE.gf}% gold · +${KINDLE.mf} magic find for ${KINDLE.minutes} minutes`, 3);
  UI.log(`Tessariel's fire burns in you: <b style="color:${EMBER_COLOR}">Kindled</b> for ${KINDLE.minutes} minutes.`, '#d8f0a0');
  G.game?.autosave?.();
}

/** The keep's lights, every frame (world.update clears them first). */
function keepLights(world, dt) {
  const A = world.anchors, t = world.time;
  addLight(A.flame[0], A.flame[1], 6.5 + Math.sin(t * 3.1) * 0.4, 1, 34, '#7dff5a', true);
  for (const [x, y] of A.braziers) addLight(x, y, 3.2 + Math.sin(t * 7 + x) * 0.2, 0.85, 22, '#ffb060');
  for (const [x, y, z] of A.chandeliers) addLight(x, y, 4.2, 0.55, z * 4 - 40, '#ffd090');
  for (const w of A.windows) addLight(w.axis === 'x' ? w.a : w.c + 2.2, w.axis === 'x' ? w.c + 2.2 : w.a, w.wide ? 4.6 : 3.2, 0.6, (w.z0 + 6) * 4, null);
  addLight(A.castellan[0], A.castellan[1] + 0.6, 3.2, 0.7, 30, '#ffe0a0');
  for (const p of world.portals) addLight(p.x, p.y, 3, 0.8, 30, p.color);
  for (const s of [A.stash, A.reliquary]) addLight(s[0], s[1], 2, 0.5, 20, '#ffd070');
  for (const pr of world.props) if (pr.trophy) addLight(pr.x, pr.y, 1.7, 0.6, 40, '#ffe8b0');   // a lamp on every trophy
  for (const [x, y] of A.frontLights || []) addLight(x, y, 2.6, 0.7, 30, '#ffb060');
}

/** Draw a keep thing render.js handed over (drawNpc): the Flame and the click targets. */
export function drawKeepNpc(ctx, n, x, y, t) {
  if (n.keepFlame) {
    drawSacredFlame(ctx, x, y - 26, t, 1);
    if (kindled()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2 + Math.sin(t * 4) * 0.08; ctx.fillStyle = '#c8f060'; ctx.beginPath(); ctx.ellipse(x, y - 4, 46, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    n.sbox = [x - 30, y - 62, x + 30, y + 4];
    return true;
  }
  if (n.keepMarker) { n.sbox = [x - 20, y - (n.h || 30) - 10, x + 20, y + 6]; return true; }
  return false;
}

/** Bonus folk for tests and the HUD's area line. */
export function keepAreaLine() { const c = G.char, k = keepState(c); return `${CASTELLAN.name} keeps the Flame · ${k.embers} Embers`; }
export { CX, CY, rand, HUD, playMusic, setAmbience };
