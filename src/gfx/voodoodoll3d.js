// The Carrion Witch's Hex Poppet in 3D: the hanged burlap doll built by tools/blender/voodoodoll.py
// (assets/models/beasts/voodoodoll.glb), drawn through gfx/beasts3d.js. The model is ~1 unit from its feet (the
// origin) to its crown and hangs from a rope that ends ~1.35 up. It carries eight needles (meshes needle_1..8) and
// their rotten twins (rotten_1..8); drawDoll shows the first `pins` as live needles and the next `rot` as rotten
// ones. Each needle rides a bone pin_N whose head is its wound: dollPin() gives where that was drawn.
// Clips: idle (4 s loop), jab1..jab8 (0.6 s: needle N flies in at 0.14 s and the doll convulses), squeeze (1 s:
// crushed at 0.45 s, sprung back), dance (1.6 s loop).
import { drawBeast, beastPoint, preloadBeasts, beastReady } from './beasts3d.js';

export const DOLL = 'voodoodoll', DOLL_SLOTS = 8, JAB = 0.6, JAB_HIT = 0.14;
const NEEDLES = Array.from({ length: DOLL_SLOTS }, (_, i) => 'needle_' + (i + 1)), ROTTEN = NEEDLES.map((n, i) => 'rotten_' + (i + 1));
const POINTS = NEEDLES.map((n, i) => 'pin_' + (i + 1)).concat('head');
export const preloadDoll = () => preloadBeasts(DOLL);
export const dollReady = () => beastReady(DOLL);

/**
 * Draw the doll with its feet at (x, y). o: { key, k: px per unit (about its height), yaw (tile angle it faces), pins, rot,
 * clip, t, loop, clip2, t2, mix, jab: { slot, t } (plays jab<slot+1> over the clip, blending back out), alpha, add, tint, ember, light }.
 * Returns false until the model is loaded and posed (draw the old doll then).
 */
export function drawDoll(ctx, x, y, o = {}) {
  const pins = Math.min(DOLL_SLOTS, o.pins | 0), rot = Math.min(DOLL_SLOTS - pins, o.rot | 0), hide = [];
  for (let i = 0; i < DOLL_SLOTS; i++) { if (i >= pins) hide.push(NEEDLES[i]); if (i < pins || i >= pins + rot) hide.push(ROTTEN[i]); }
  const b = { key: o.key || DOLL, k: o.k || 40, yaw: o.yaw ?? Math.PI / 4, clip: o.clip || 'idle', t: o.t || 0, loop: o.loop, clip2: o.clip2, t2: o.t2, mix: o.mix,
    alpha: o.alpha, add: o.add, tint: o.tint, ember: o.ember, light: o.light, hide, points: POINTS, roll: o.roll, pitch: o.pitch };
  const j = o.jab;
  if (j && j.t < JAB) { // the stab takes the doll over, then lets it go
    const out = Math.min(1, (JAB - j.t) / 0.18);
    if (b.clip2) { b.clip = 'jab' + (j.slot + 1); b.t = j.t; b.loop = false; b.clip2 = undefined; }
    else { b.clip2 = 'jab' + (j.slot + 1); b.t2 = j.t; b.mix = out; }
  }
  return drawBeast(ctx, DOLL, x, y, b);
}
/** Where needle `slot`'s wound (or 'head') was last drawn: [dx, dy] px from the doll's feet, or null. */
export const dollPin = (key, slot) => beastPoint(key || DOLL, slot === 'head' ? 'head' : 'pin_' + (slot + 1));
