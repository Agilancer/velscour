// Eight-angle, sprite-based Lancer spinning shields, from the four supplied
// golden shield turntables. One complete 360-degree frame cycle per orbit.
// Sheets: 4 columns x 2 rows; each cell 44x56 transparent game pixels.
import { isoX, isoY } from '../core/view.js';
import { TAU } from '../core/util.js';
import { drawShape } from './shapes.js';

export const SHIELD_SHEET = Object.freeze({
  round:   'assets/fx/lancer/spinning_round.png',
  diamond: 'assets/fx/lancer/spinning_diamond.png',
  kite:    'assets/fx/lancer/spinning_kite.png',
  tower:   'assets/fx/lancer/spinning_tower.png',
});
export const SHIELD_FRAME = Object.freeze({w:44,h:56,columns:4,count:8});

// Every Bulwark spinning shield ability is assigned one of the four sets.
// Later abilities intentionally reuse upgraded styles, not a generic oval.
export const LANCER_SHIELD_ABILITY = Object.freeze({
  'Tower Shield': 'round',
  'Storm Bulwark': 'diamond',
  'Burning Aegis': 'kite',
  'Frost Rampart': 'tower',
  'Holy Citadel': 'round',
  'Shield Storm': 'diamond',
  'Bastion of Ten': 'tower',
});
// Compact Bulwark rings: half the original radius and 0.275-tile separation.
// Each skill keeps its own concentric orbit and eight-angle shield artwork.
export const SHIELD_ORBIT_RADIUS = Object.freeze({
  'Tower Shield': 0.70, 'Storm Bulwark': 0.975, 'Burning Aegis': 1.25,
  'Frost Rampart': 1.525, 'Holy Citadel': 1.80,
  'Shield Storm': 2.075, 'Bastion of Ten': 2.35,
});
export function shieldOrbitRadius(name) { return SHIELD_ORBIT_RADIUS[name] ?? 1.6; }
const cached = new Map();

export function shieldVariantForSkill(name) {
  return LANCER_SHIELD_ABILITY[name] || 'round';
}

/** Lazy, nonblocking load; fallback procedural geometry remains until ready. */
export function preloadLancerShield(variant) {
  if (!SHIELD_SHEET[variant] || typeof Image === 'undefined') return null;
  if (cached.has(variant)) return cached.get(variant);
  const record = {image: new Image(), atlas:null, ready:false, error:false};
  cached.set(variant, record);
  record.image.onload = () => {
    record.ready = record.image.naturalWidth === SHIELD_FRAME.w * SHIELD_FRAME.columns &&
      record.image.naturalHeight === SHIELD_FRAME.h * 2;
    record.error = !record.ready;
    if (record.ready) {
      // Preserve the authored transparent gaps and antialiased alpha as-is.
      record.atlas = record.image;
    }
  };
  record.image.onerror = () => {record.error = true;};
  record.image.src = SHIELD_SHEET[variant];
  return record;
}

/** The source atlas is authored in clockwise frame order. The shields now
 * orbit in the opposite direction from the previous build, so reverse the
 * visible turntable frame order independently of their world-space motion.
 * Keep frame 0 facing the camera at a=pi/4 and frame 4 showing the shield
 * back at a=5*pi/4; an increasing angle selects 0,7,6,...,1,0.
 */
export function shieldFrameForAngle(angle) {
  const clockwise = ((Math.round((angle - Math.PI/4) * SHIELD_FRAME.count / TAU) %
    SHIELD_FRAME.count) + SHIELD_FRAME.count) % SHIELD_FRAME.count;
  return (SHIELD_FRAME.count - clockwise) % SHIELD_FRAME.count;
}
/** World-space depth of a single shield, not of its containing orbit.
 * Negative sum = behind the lancer; positive sum = in front of lancer.
 * A tiny tie-breaker makes edge-on frames stable beside the body.
 */
export function orbitShieldDepth(x,y,angle) {
  return x+y+(Math.cos(angle)+Math.sin(angle)>=0 ? 0.0001 : -0.0001);
}

/** Render one individual shield as a correctly turned sprite.
 * The source cell is deliberately larger than the art to prevent cropped
 * spikes on the ornate gold rims. Pixel edges use nearest-neighbour scaling.
 */
export function drawLancerOrbitShield(ctx, orbit, position) {
  if(!position) return false;
  const [x,y,a] = position,variant=orbit.shieldVariant;
  const record=preloadLancerShield(variant);
  const px=isoX(x,y),py=isoY(x,y)-24;
  if (!record?.ready) {
    // Keep the skill visually functional on the first frame/offline.
    drawShape(ctx,'tshield',px,py,0,0.82*orbit.size,orbit.E,orbit.t);
    return false;
  }
  const frame=shieldFrameForAngle(a),sx=(frame%4)*SHIELD_FRAME.w;
  const sy=Math.floor(frame/4)*SHIELD_FRAME.h;
  // Pixel-art shield source is smaller than its padded cell; this scale
  // gives readable, class-proportional shield sprites on the map.
  const scale=0.72 * orbit.size;
  const w=SHIELD_FRAME.w*scale,h=SHIELD_FRAME.h*scale;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(record.atlas || record.image,sx,sy,SHIELD_FRAME.w,SHIELD_FRAME.h,
    px-w/2,py-h/2,w,h);
  ctx.restore();
  return true;
}
