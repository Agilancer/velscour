// Eight-angle, sprite-based Lancer spinning shields, from the four supplied
// golden shield turntables. One complete 360-degree frame cycle per orbit.
// Sheets: 4 columns x 2 rows; each cell 68x84 transparent game pixels.
import { isoX, isoY } from '../core/view.js';
import { TAU } from '../core/util.js';
import { drawShape } from './shapes.js';

export const SHIELD_SHEET = Object.freeze({
  round:   'assets/fx/lancer/spinning_round.png',
  diamond: 'assets/fx/lancer/spinning_diamond.png',
  kite:    'assets/fx/lancer/spinning_kite.png',
  tower:   'assets/fx/lancer/spinning_tower.png',
});
export const SHIELD_FRAME = Object.freeze({w:68,h:84,columns:4,count:8});

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
const cached = new Map();

export function shieldVariantForSkill(name) {
  return LANCER_SHIELD_ABILITY[name] || 'round';
}

/** Lazy, nonblocking load; fallback procedural geometry remains until ready. */
export function preloadLancerShield(variant) {
  if (!SHIELD_SHEET[variant] || typeof Image === 'undefined') return null;
  if (cached.has(variant)) return cached.get(variant);
  const record = {image: new Image(), ready:false, error:false};
  cached.set(variant, record);
  record.image.onload = () => {
    record.ready = record.image.naturalWidth === SHIELD_FRAME.w * SHIELD_FRAME.columns &&
      record.image.naturalHeight === SHIELD_FRAME.h * 2;
    record.error = !record.ready;
  };
  record.image.onerror = () => {record.error = true;};
  record.image.src = SHIELD_SHEET[variant];
  return record;
}

/** Eight angular views in their authored clockwise sequence.
 * In tile space a=pi/4 is toward the screen/front, and a=5*pi/4
 * is away from the camera. This keeps the actual shield front and wooden
 * back consistent with where it sits in the isometric orbit.
 */
export function shieldFrameForAngle(angle) {
  return ((Math.round((angle - Math.PI/4) * 8 / TAU) % 8) + 8) % 8;
}
/** World-space depth of a single shield, not of its containing orbit.
 * Negative sum = behind the lancer; positive sum = in front of lancer.
 * A tiny tie-breaker makes edge-on frames stable beside the body.
 */
export function orbitShieldDepth(x,y,angle) {
  return x+y+(Math.cos(angle)+Math.sin(angle)>=0 ? 0.0001 : -0.0001);
}

/** Render one individual shield as an opaque, correctly turned sprite.
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
    drawShape(ctx,'tshield',px,py,0,orbit.size,orbit.E,orbit.t);
    return false;
  }
  const frame=shieldFrameForAngle(a),sx=(frame%4)*SHIELD_FRAME.w;
  const sy=Math.floor(frame/4)*SHIELD_FRAME.h;
  // At the original attack size this occupies approx. 42x54 world pixels
  // within its padded transparent 104x128 source frame.
  const scale=0.765 * orbit.size;
  const w=SHIELD_FRAME.w*scale,h=SHIELD_FRAME.h*scale;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(record.image,sx,sy,SHIELD_FRAME.w,SHIELD_FRAME.h,
    px-w/2,py-h/2,w,h);
  ctx.restore();
  return true;
}
