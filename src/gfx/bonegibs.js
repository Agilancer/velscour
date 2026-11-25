// Bone gibs: the skulls, rib cages, ribs, femurs, pelvises, jaws and vertebrae a monster bursts into (gibs() in
// vfx.js). They are three.js models (tools/bones3d.js) baked by tools/bones3d_bake.js into assets/sprites/bones.webp,
// a data sheet (R = light, G = the half-blood field, B = the soak field, A = 255 body / 128 outline; see
// tools/bones3d.html) of every bone's 16 tumbling turns and the poses it lies in. Each bone colour + blood colour +
// look paints each bone once, the first time it is drawn, into an image of its own (packOf; a raster sprite on PC).
// Looks: 0 clean, 1 blood on one end, 2 on the other end, 3 soaked.
import { G } from '../state.js';
import { A } from '../core/assets.js';
import { makeCanvas, hexToRgb, mixHex, pick, shuffle, TAU, spriteCanvas, frozen } from '../core/util.js';

let src = null, kinds = null, onceKinds = null;
const paints = new Map(); // `${bone}|${blood}|${look}` -> { kinds: bone kind -> its painted image, ramps }, oldest first

export const bonesReady = () => !!(A.boneImg && A.boneMeta);

/** The bones one burst of n chunks is made of: now and then one skull, rib cage, pelvis or jaw (BONES[k].once; not
 *  when `loose`, bits off the living), the rest ribs, vertebrae, femurs and arm bones by weight; shuffled. */
export function boneDeck(n, loose = false) {
  const B = A.boneMeta.bones;
  if (!kinds) {
    kinds = []; onceKinds = Object.keys(B).filter((k) => B[k].once);
    for (const [k, b] of Object.entries(B)) for (let i = 0; i < b.w; i++) kinds.push(k);
  }
  const deck = loose ? [] : onceKinds.filter((k) => Math.random() < B[k].once);
  while (deck.length < n) deck.push(pick(kinds));
  return shuffle(deck).slice(0, n);
}

/** A blood look for a bone gib with blood on it to show: clean, either end, or soaked. */
export function boneLook(coat) {
  if (!coat) return 0;
  const r = Math.random();
  return r < 0.3 ? 0 : r < 0.5 ? 1 : r < 0.7 ? 2 : 3;
}

const RAMP = [[0.78, '#1c0f14'], [0.5, '#2a1820'], [0.26, '#3a2826'], [0, '#000000'], [0.4, '#fffaf0']];
const GORE = [[0.75, '#0a0002'], [0.52, '#0a0002'], [0.28, '#0a0002'], [0, '#000000'], [0.5, '#fff0f0']];
const LEVEL = (r) => (r < 70 ? 0 : r < 115 ? 1 : r < 160 ? 2 : r < 215 ? 3 : 4);
// Each bone's cells (its turns, then its rest poses) packed into a strip of their own, 2 px apart, once from the meta:
// a colour paints only the bones it shows, each into an image of that bone's size, never the whole sheet again. (A
// sheet per colour cost a whole-sheet upload for every new bone in it, and a necromancer's army of colours over the
// cache's size re-made ~90 sheets a second.)
const packs = {};
function packOf(kind) {
  if (packs[kind]) return packs[kind];
  const b = A.boneMeta.bones[kind], P = 2, W = 256, at = [];
  let x = P, y = P, row = 0, w = 0;
  for (const [, , cw, ch] of b.t.concat(b.r)) {
    if (x > P && x + cw + P > W) { x = P; y += row + P; row = 0; }
    at.push([x, y]); x += cw + P; row = Math.max(row, ch); w = Math.max(w, x);
  }
  return (packs[kind] = { w, h: y + row + P, at });
}
function painted(bone, coat, look, kind) {
  const key = bone + '|' + (look ? coat : '') + '|' + look;
  let e = paints.get(key);
  if (e) { paints.delete(key); paints.set(key, e); } // most recently used last
  else {
    // five shades of bone and of blood (the top one of blood a wet sheen); a dark outline in the colour on top
    const bones = RAMP.map(([t, to]) => hexToRgb(mixHex(bone, to, t)));
    e = { kinds: {}, bones, blood: coat ? GORE.map(([t, to]) => hexToRgb(mixHex(coat, to, t))) : bones,
      line: hexToRgb(mixHex(look === 3 ? coat : bone, '#0a0406', look === 3 ? 0.8 : 0.86)) };
    paints.set(key, e);
    if (paints.size > (G.touch ? 12 : 64)) paints.delete(paints.keys().next().value);
  }
  if (e.kinds[kind]) return e.kinds[kind];
  const w = A.boneImg.width, b = A.boneMeta.bones[kind], pk = packOf(kind);
  if (!src) {
    const t = makeCanvas(w, A.boneImg.height), tg = t.getContext('2d', { willReadFrequently: true });
    tg.drawImage(A.boneImg, 0, 0); src = tg.getImageData(0, 0, w, t.height).data;
  }
  const c = spriteCanvas(pk.w, pk.h), g = c.getContext('2d'), out = g.createImageData(pk.w, pk.h), d = out.data;
  b.t.concat(b.r).forEach(([x0, y0, cw, ch], n) => {
    const [X, Y] = pk.at[n];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = ((y0 + y) * w + x0 + x) * 4, a = src[i + 3];
      if (!a) continue;
      let col = e.line;
      if (a > 200) {
        const half = src[i + 1], soak = src[i + 2];
        const wet = look === 1 ? half >= b.half : look === 2 ? half < b.half : look === 3 ? soak >= b.soak : false;
        // blood thins to a darker, clotted rim where it gives out
        const rim = wet && (look === 1 ? half < b.half + 10 : look === 2 ? half > b.half - 10 : soak < b.soak + 12);
        const lv = LEVEL(src[i]);
        col = wet ? e.blood[Math.max(0, lv - (rim ? 1 : 0))] : e.bones[lv];
      }
      const o = ((Y + y) * pk.w + X + x) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  });
  g.putImageData(out, 0, 0);
  return (e.kinds[kind] = frozen(c));
}

/** Draw bone gib `p` (vfx particle: bone, look, color, coat, rot, rest, size) with its floor point at px, py (already
 *  raised by its height): a turn of its tumble in flight, a pose lying on the floor once it has settled. */
export function drawBoneGib(ctx, p, px, py) {
  const M = A.boneMeta, b = M.bones[p.bone];
  const lying = p.z <= 0 && p.vr === 0, k = p.size / M.S;
  const n = lying ? b.t.length + p.rest % b.r.length : Math.floor((((p.rot / TAU) % 1) + 1) % 1 * b.t.length) % b.t.length;
  const [, , sw, sh, ax, ay] = lying ? b.r[n - b.t.length] : b.t[n], img = painted(p.color, p.coat, p.look, p.bone), [sx, sy] = packOf(p.bone).at[n];
  ctx.drawImage(img, sx, sy, sw, sh, px - ax * k, py - (lying ? 0 : b.lift * p.size) - ay * k, sw * k, sh * k);
}
