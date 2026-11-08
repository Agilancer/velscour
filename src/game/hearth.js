// The Hearthstone: a third special button beside MADNESS and SMITE. It refills over HEARTH_FILL seconds spent in
// the dungeon (like MADNESS) and, when full, the button (or H) carries the hero straight back to town from
// anywhere in a level — opening a two-way portal between the dungeon and town.
// Wiring: game.update -> hearthTick, hud.js shows the button, game.js -> useHearth (H key / button).
import { G } from '../state.js';
import { rand, chance, TAU } from '../core/util.js';
import { sfx, playMusic, setAmbience } from '../core/audio.js';
import { camera } from '../core/view.js';
import { addEffect, Ring, Column, sparkle, spawn, floatText } from '../gfx/vfx.js';
import { UI } from '../ui/ui.js';
import { HUD } from '../ui/hud.js';
import { keepTileSets } from '../core/assets.js';
import { FINAL_DEPTH } from '../data/depth.js';

export const HEARTH_FILL = 600; // seconds in the dungeon to refill (10 minutes)
const CHANNEL = 1.6; // seconds of swirling light before the hero is carried home

let channel = null; // { t, world, startX, startY, effects } while the stone is being invoked
let activeHearth = null; // { dungeonWorld, dungeonX, dungeonY, dungeonPortal, townPortal, townWorld, depth }

/** Meter 0..1; a hero who has never used the stone starts with it full. */
export const hearthOf = (c = G.char) => (c ? (c.hearth ?? 1) : 0);
const inDungeon = () => !!G.world && G.world.kind === 'dungeon' && !!G.player && !G.player.dead;
export const hearthReady = () => !!G.char && hearthOf() >= 1 && inDungeon();
export const hearthChanneling = () => !!channel;
export const hearthPortalActive = () => !!activeHearth;
/** Seconds left until the stone is ready again. */
export const hearthSecondsLeft = (c = G.char) => Math.max(0, Math.ceil((1 - hearthOf(c)) * HEARTH_FILL));

/** Cancel active channel if hero moves or leaves. */
export function cancelHearth(reason = 'moved') {
  if (!channel) return;
  const p = G.player;
  if (channel.effects) {
    for (const ef of channel.effects) {
      if (ef) ef.t = ef.dur;
    }
  }
  channel = null;
  if (reason === 'moved' && p) {
    floatText(p.x, p.y, 90, 'Interrupted', '#ff8888', 14, { life: 1.0 });
    UI.log('Hearthstone teleport cancelled: you moved.', '#ff9999');
    sfx('error', 0.8);
  }
}

/** Close active Hearthstone portals in dungeon and town. */
export function closeHearthPortals() {
  if (!activeHearth) return;
  const { dungeonWorld, dungeonPortal, townPortal, townWorld } = activeHearth;
  if (dungeonWorld?.portals && dungeonPortal) {
    const idx = dungeonWorld.portals.indexOf(dungeonPortal);
    if (idx >= 0) dungeonWorld.portals.splice(idx, 1);
  }
  if (G.world?.portals && townPortal) {
    const idx = G.world.portals.indexOf(townPortal);
    if (idx >= 0) G.world.portals.splice(idx, 1);
  }
  if (townWorld?.portals && townPortal && townWorld !== G.world) {
    const idx = townWorld.portals.indexOf(townPortal);
    if (idx >= 0) townWorld.portals.splice(idx, 1);
  }
  activeHearth = null;
}

/** Fills while the hero is in the dungeon; carries out the channel once it finishes. */
export function hearthTick(dt) {
  const c = G.char;
  if (!c) return;

  // Keep town portal present if activeHearth is open in town
  if (activeHearth) {
    if (G.world?.kind === 'town') {
      if (!G.world.portals.includes(activeHearth.townPortal)) {
        G.world.portals.push(activeHearth.townPortal);
      }
    } else if (G.world?.kind === 'dungeon' && G.world !== activeHearth.dungeonWorld) {
      // Left for a different dungeon without taking the portal; close the old portals
      closeHearthPortals();
    }
  }

  if (channel) {
    const p = G.player;
    if (G.world !== channel.world || !p || p.dead) {
      cancelHearth('lost');
      return;
    }

    // Check if player moved
    const moved = p.moving || (Math.hypot(p.x - channel.startX, p.y - channel.startY) > 0.05);
    if (moved) {
      cancelHearth('moved');
      return;
    }

    channel.t += dt;
    if (chance(dt * 40)) {
      const a = rand(TAU), r = rand(0.4, 1.1);
      spawn({ type: 'glow', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: rand(0, 20), vz: rand(60, 140), life: rand(0.5, 0.9), size: rand(2, 4), size1: 0, color: chance(0.5) ? '#7fd8ff' : '#ffffff', add: true });
    }
    if (channel.t >= CHANNEL) finish();
    return;
  }

  if (inDungeon() && hearthOf(c) < 1) {
    c.hearth = Math.min(1, hearthOf(c) + dt / HEARTH_FILL);
    if (c.hearth >= 1) {
      sfx('ready_hearth', 0.5);
      UI.log('Your <b style="color:#7fd8ff">Hearthstone</b> is ready: press HEARTH (H) to return to town from anywhere.', '#9fe4ff');
    }
  }
}

/** The button / H key: begin the trip home. */
export function useHearth() {
  if (channel || !hearthReady()) {
    if (!channel && G.char && G.world?.kind === 'dungeon' && hearthOf() < 1) {
      const s = hearthSecondsLeft();
      UI.log(`The Hearthstone is still cold: ready in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.`, '#8aa8c0');
      sfx('error');
    }
    return false;
  }
  const p = G.player;
  const ring = new Ring(p.x, p.y, 1.4, 0.2, CHANNEL, '#7fd8ff', 4);
  const col = new Column(p.x, p.y, '#9fe4ff', CHANNEL, 26, 280);
  addEffect(ring);
  addEffect(col);

  channel = {
    t: 0,
    world: G.world,
    startX: p.x,
    startY: p.y,
    effects: [ring, col],
  };

  G.smiteArmed = false;
  p.path = null; p.moveTarget = null; p.attackTarget = null;
  p.moving = false;

  floatText(p.x, p.y, 90, 'Hearthstone', '#9fe4ff', 16, { life: 1.6 });
  sfx('portal', 0.8);
  return true;
}

function finish() {
  const p = G.player, w = G.world;
  channel = null;
  if (!p || !w) return;

  // Consume charge now that channel has successfully completed
  if (G.char) G.char.hearth = 0;

  // Close any existing previous hearth portals
  closeHearthPortals();

  const dungeonX = p.x, dungeonY = p.y, dungeonWorld = w, depth = w.depth;

  // Create portal in dungeon at departure spot
  const dungeonPortal = {
    x: dungeonX,
    y: dungeonY,
    type: 'town',
    active: true,
    color: '#7fd8ff',
    reach: 1.6,
    label: 'Town Portal',
    hearth: true,
    use: () => {
      sfx('portal');
      G.game?.enterTown?.();
    },
  };
  if (dungeonWorld.portals) {
    dungeonWorld.portals.push(dungeonPortal);
  }

  addEffect(new Ring(p.x, p.y, 0.2, 3, 0.4, '#ffffff', 6));
  sparkle(p.x, p.y, 30, '#bfeaff', 26, 0.8);
  camera.shake(3);
  sfx('portal');

  if (w.depth) {
    G.char.depth = w.depth;
  }

  G.game?.enterTown?.();

  // In town, open the corresponding portal back to the dungeon
  if (G.world) {
    const townMap = G.world.map;
    let [tx, ty] = [G.player.x - 1.5, G.player.y];
    if (!townMap.walkable(tx, ty)) {
      const near = townMap.randomNear(G.player.x, G.player.y, 2.0);
      if (near) [tx, ty] = near;
      else [tx, ty] = [G.player.x, G.player.y];
    }

    const isExploration = !!dungeonWorld?.unboundExploration;
    const uFloor = dungeonWorld?.unboundExploration?.floor;
    const portalLabel = isExploration
      ? `Portal — Unbound Floor ${uFloor}`
      : (dungeonWorld?.unbound ? 'Portal — Velscour Unbound' : `Portal — Depth ${depth || 1}`);
    const logLabel = isExploration
      ? `Unbound Floor ${uFloor}`
      : (dungeonWorld?.unbound ? 'Velscour Unbound' : `Depth ${depth || 1}`);

    const townPortal = {
      x: tx,
      y: ty,
      type: 'dungeon',
      active: true,
      color: '#7fd8ff',
      reach: 1.6,
      label: portalLabel,
      hearth: true,
      use: () => returnFromHearth(),
    };

    if (G.world.portals) {
      G.world.portals.push(townPortal);
    }

    activeHearth = {
      dungeonWorld,
      dungeonX,
      dungeonY,
      dungeonPortal,
      townPortal,
      townWorld: G.world,
      depth,
    };

    addEffect(new Ring(tx, ty, 0.2, 2.5, 0.5, '#7fd8ff', 5));
    sparkle(tx, ty, 25, '#bfeaff', 20, 0.6);
    UI.log(`A portal to <b>${logLabel}</b> remains open in town.`, '#9fe4ff');
  }
}

export function returnFromHearth() {
  if (!activeHearth) return;
  const { dungeonWorld, dungeonX, dungeonY, depth } = activeHearth;

  // When a player goes back through their portal in town to return to the depths, the portals close
  closeHearthPortals();

  sfx('portal');
  if (G.game && dungeonWorld) {
    const p = G.player;
    // Clean any prior player references in the cached dungeon world creatures
    if (dungeonWorld.creatures && p) {
      dungeonWorld.creatures = dungeonWorld.creatures.filter((c) => c !== p && !(c.summon && c.owner === p));
    }
    if (G.game.reconcileDungeonWorld) {
      G.game.reconcileDungeonWorld(dungeonWorld);
    }
    G.game.setWorld(dungeonWorld, [dungeonX, dungeonY], G.world);
    if (dungeonWorld.tileset) keepTileSets(dungeonWorld.tileset);

    addEffect(new Ring(dungeonX, dungeonY, 0.2, 3, 0.4, '#ffffff', 6));
    sparkle(dungeonX, dungeonY, 30, '#bfeaff', 26, 0.8);
    camera.shake(3);

    const title = dungeonWorld.unbound
      ? 'Velscour Unbound'
      : (dungeonWorld.unboundExploration
        ? `Unbound Floor ${dungeonWorld.unboundExploration.floor}`
        : `Depth ${dungeonWorld.depth}${dungeonWorld.depth > FINAL_DEPTH ? ' — Endless Torment' : ''}`);
    const sub = dungeonWorld.biome ? dungeonWorld.biome.name : 'Dungeon';
    HUD.setArea(title, sub);
    playMusic('wilds', { delay: 2 });
    if (dungeonWorld.biome) setAmbience(dungeonWorld.biome.id);

    UI.log('Returned to the depths. The portals have closed.', '#9fe4ff');
  } else if (G.game) {
    G.game.enterDungeonAt(depth || 1);
  }
}
