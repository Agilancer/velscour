// The spectator's taps: things the player does while the hero plays (on auto-play or not) that must never move the
// hero or take over from auto-play. input.js hands every canvas press to G.tapHook first; a press it claims is
// swallowed whole. Claims, in order: aiming an armed SMITE (game/smite.js), catching a gilded critter
// (game/critters.js). Right-click or Esc disarms SMITE.
import { G } from '../state.js';
import { camera } from '../core/view.js';
import { effects, addEffect } from '../gfx/vfx.js';
import { smiteArmed, smiteAt, reticle } from './smite.js';
import { catchCritterAt, crittersTick } from './critters.js';

export function initSpectate() {
  G.tapHook = (sx, sy, e) => {
    if (G.mode !== 'game' || !G.world || !G.player || G.paused) return false;
    if (smiteArmed()) {
      if (e && e.pointerType === 'mouse' && e.button !== 0) { G.smiteArmed = false; return true; }
      const [x, y] = camera.screenToTile(sx, sy);
      return smiteAt(x, y);
    }
    return catchCritterAt(sx, sy);
  };
}

/** Per frame (game.update, while the world runs): critters come and go; the SMITE reticle stays on the effect list. */
export function spectateTick(world, dt) {
  crittersTick(world, dt);
  if (smiteArmed() && !effects.includes(reticle)) addEffect(reticle, 'top');
}
