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
// Each Bulwark skill uses its own concentric orbit, spaced 0.55 world tiles
// apart so even the larger shield sprites remain visually distinguishable.
export const SHIELD_ORBIT_RADIUS = Object.freeze({
  'Tower Shield': 1.40, 'Storm Bulwark': 1.95, 'Burning Aegis': 2.50,
  'Frost Rampart': 3.05, 'Holy Citadel': 3.60,
  'Shield Storm': 4.15, 'Bastion of Ten': 4.70,
});
export function shieldOrbitRadius(name) { return SHIELD_ORBIT_RADIUS[name] ?? 1.6; }
const cached = new Map();

// Keep atlas padding transparent but seal translucent/empty pixels INSIDE each
// shield's row silhouette. No new artwork or smoothing is introduced.
function opaqueAtlas(image) {
  if (typeof document === 'undefined') return image;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), d = pixels.data;
  for (let frame = 0; frame < SHIELD_FRAME.count; frame++) {
    const ox = (frame % 4) * SHIELD_FRAME.w, oy = Math.floor(frame / 4) * SHIELD_FRAME.h;
    for (let y = oy; y < oy + SHIELD_FRAME.h; y++) {
      let first = -1, last = -1;
      for (let x = ox; x < ox + SHIELD_FRAME.w; x++) {
        if (d[(y * canvas.width + x) * 4 + 3] > 24) { if (first < 0) first = x; last = x; }
      }
      if (first < 0) continue;
      let previous = (y * canvas.width + first) * 4;
      for (let x = first; x <= last; x++) {
        const i = (y * canvas.width + x) * 4;
        if (d[i + 3] <= 24) {
          d[i] = d[previous]; d[i + 1] = d[previous + 1]; d[i + 2] = d[previous + 2];
        } else previous = i;
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

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
      try { record.atlas = opaqueAtlas(record.image); }
      catch (e) { console.warn('Shield opacity processing failed', variant, e); record.atlas = record.image; }
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
  // Pixel-art shield source is smaller than its padded cell; this scale
  // gives readable, class-proportional shield sprites on the map.
  const scale=1.09 * orbit.size;
  const w=SHIELD_FRAME.w*scale,h=SHIELD_FRAME.h*scale;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(record.atlas || record.image,sx,sy,SHIELD_FRAME.w,SHIELD_FRAME.h,
    px-w/2,py-h/2,w,h);
  ctx.restore();
  return true;
}
