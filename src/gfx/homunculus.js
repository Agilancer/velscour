// Homunculus the Proud's 30 painted poses (assets/sprites/npc/homunculus.webp, cut by tools/homunculus.py): one canvas
// per pose, feet on the bottom row, centred. Loads on first use; null until then (render.js falls back to the vendor art).
import { makeCanvas } from '../core/util.js';

let meta = null, poses = null, loading = null;

function load() {
  loading = Promise.all([
    fetch('assets/sprites/npc/homunculus.json').then((r) => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'assets/sprites/npc/homunculus.webp'; }),
  ]).then(([m, im]) => {
    const [w, h] = m.cell, out = {};
    for (const [name, i] of Object.entries(m.poses)) {
      const cv = makeCanvas(w, h);
      cv.getContext('2d').drawImage(im, i * w, 0, w, h, 0, 0, w, h);
      out[name] = cv;
    }
    meta = m; poses = out;
  }).catch((e) => { console.warn('homunculus art', e); });
  return loading;
}

/** {img, scale}: the pose's canvas and how tall to draw it for a given standing height (null while loading). */
export function homunculusPose(name, stand = 64) {
  if (!poses) { if (!loading) load(); return null; }
  const img = poses[name] || poses.confident;
  return { img, h: stand * meta.cell[1] / meta.stand };
}
export const homunculusReady = () => (poses ? Promise.resolve() : loading || load());
