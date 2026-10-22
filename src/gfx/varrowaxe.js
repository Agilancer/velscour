// Varrow's great axe on its rack by Homunculus the Proud's forge, from the three.js bake (tools/varrowaxe3d.html ->
// node tools/varrowaxe3d_bake.js -> assets/sprites/npc/varrow_axe.webp/json): 32 turns of the axe, the same turns
// with only its runes (white, tinted here by story chapter and added on top), and the rack. Loads on first use;
// drawVarrowAxe returns false until then and townprops.js draws its flat axe instead.
import { makeCanvas } from '../core/util.js';

const TAU = Math.PI * 2;
let meta = null, img = null, loading = null;
const tints = new Map();

function load() {
  loading = Promise.all([
    fetch('assets/sprites/npc/varrow_axe.json').then((r) => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'assets/sprites/npc/varrow_axe.webp'; }),
  ]).then(([m, im]) => { meta = m; img = im; }).catch((e) => console.warn('varrow axe art', e));
  return loading;
}
export const varrowAxeReady = () => (img ? Promise.resolve() : loading || load());

// the rune row filled with one colour (cached per colour)
function tinted(col) {
  let c = tints.get(col);
  if (c) return c;
  const { S, n, frame: [fw, fh] } = meta;
  c = makeCanvas(n * fw * S, fh * S);
  const g = c.getContext('2d');
  g.drawImage(img, 0, fh * S, n * fw * S, fh * S, 0, 0, n * fw * S, fh * S);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  tints.set(col, c);
  return c;
}

/** The rack, then the axe turned to `yaw` (0: blades broadside), its runes glowing `runeCol` at `runeA`. (x, y) is
 * the ground under the axe in world px. */
export function drawVarrowAxe(ctx, x, y, yaw, runeCol = null, runeA = 0) {
  if (!img) { if (!loading) load(); return false; }
  const { S, n, frame: [fw, fh], anchor: [ax, ay], rack } = meta;
  const [rw, rh] = rack.size;
  ctx.drawImage(img, 0, rack.y * S, rw * S, rh * S, x - rack.anchor[0], y - rack.anchor[1], rw, rh);
  const i = ((Math.round((yaw / TAU) * n) % n) + n) % n;
  ctx.drawImage(img, i * fw * S, 0, fw * S, fh * S, x - ax, y - ay, fw, fh);
  if (runeCol && runeA > 0) {
    const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    for (let k = runeA; k > 0; k -= 1) { ctx.globalAlpha = prevA * Math.min(1, k); ctx.drawImage(tinted(runeCol), i * fw * S, 0, fw * S, fh * S, x - ax, y - ay, fw, fh); }
    ctx.globalCompositeOperation = prevOp; ctx.globalAlpha = prevA;
  }
  return true;
}
