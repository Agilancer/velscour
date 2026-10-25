// Velscour's throne: the Castle pack's throne dais recoloured to match him (tools/velscourthrone.py writes
// assets/tiles/throne/velscour_throne.webp and .json). A 2 x 2 tile scatter prop in his throne room
// (world/dungeon.js generateThrone); he sits on it until the fight begins (game/velscour.js).
const SRC = 'assets/tiles/throne/velscour_throne.webp';
// from velscour_throne.json: the image is 2.5x its drawn size; the pivot is the dais's front corner
export const THRONE_ART = { w: 320, h: 420, ox: -160, oy: -418, over: 2.5 };
const img = typeof Image !== 'undefined' ? new Image() : null;
let loading = null;
export function loadVelscourThrone() {
  if (!img) return Promise.resolve();
  if (!loading) loading = new Promise((resolve) => { img.onload = resolve; img.onerror = () => { console.warn('Velscour\'s throne art missing'); resolve(); }; img.src = SRC; });
  return loading;
}
/** The prop sprite (drawn at k = 1 / over by render.js drawProp). */
export function throneSprite() {
  return { img, sx: 0, sy: 0, w: THRONE_ART.w, h: THRONE_ART.h, ox: THRONE_ART.ox, oy: THRONE_ART.oy, name: 'velscour_throne' };
}
