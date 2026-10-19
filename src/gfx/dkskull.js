// The Death Knight's skulls: the Velscour contact skull by the minimap (assets/ui/velscour_contact_skull.png),
// recoloured to his frost palette (bone -> ice, the glowing eye dots taken out: dark empty sockets) and baked small,
// so the skulls his casts and hits throw off (classfx.js) and Death Coil (shapes.js 'dkskull') share the button's art.
const SRC = 'assets/ui/velscour_contact_skull.png';
const EYES = [[46, 66], [81, 66]];           // the eye sockets in the 128 x 128 source
let img = null, ready = false;
const CACHE = new Map();

function load() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = SRC;
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** A colour ramp through the stops [[v, '#rrggbb'], ...] at v (0..1). */
function ramp(stops, v) {
  let i = 1;
  while (i < stops.length - 1 && v > stops[i][0]) i++;
  const [v0, c0] = stops[i - 1], [v1, c1] = stops[i], k = Math.max(0, Math.min(1, (v - v0) / (v1 - v0 || 1)));
  return c0.map((c, j) => c + (c1[j] - c) * k);
}
function bake(bone) {
  const W = img.naturalWidth || 128, H = img.naturalHeight || 128, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H), px = d.data, sx = W / 128, sy = H / 128;
  const B = [[0, hex('#03060f')], [0.3, hex('#16306c')], [0.62, hex('#6cbcf0')], [1, hex(bone)]];
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const r = px[i], gg = px[i + 1], b = px[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), v = mx / 255;
    const x = (i / 4) % W / sx, y = Math.floor(i / 4 / W) / sy;
    const red = r === mx && mx - mn > mx * 0.55 && gg < r * 0.6 && v > 0.3;
    const d2 = Math.min(...EYES.map(([ex, ey]) => (x - ex) ** 2 + (y - ey) ** 2));
    const dot = (d2 < 150 && red) || (d2 < 30 && r > b + 30);   // the red glow and its yellow core: the sockets go dark
    const [nr, ng, nb] = dot ? B[0][1] : ramp(B, (r * 0.3 + gg * 0.55 + b * 0.15) / 255 * 1.05);
    px[i] = nr; px[i + 1] = ng; px[i + 2] = nb;
  }
  g.putImageData(d, 0, 0);
  // halve with smoothing down to 64 and 32 px, so small skulls stay readable
  const half = (src) => {
    const h = document.createElement('canvas'); h.width = Math.max(1, src.width >> 1); h.height = Math.max(1, src.height >> 1);
    const hg = h.getContext('2d'); hg.imageSmoothingEnabled = true; hg.imageSmoothingQuality = 'high';
    hg.drawImage(src, 0, 0, h.width, h.height);
    return h;
  };
  const s64 = half(c), s32 = half(s64);
  return { s64, s32 };
}

/**
 * The frost skull drawn `size` px tall centred on (x, y), or false while the art loads (callers fall back).
 * bone: the bone colour ('#e8f4ff' or '#bfeaff').
 */
export function drawDkSkull(ctx, x, y, size, bone = '#e8f4ff', rot = 0) {
  load();
  if (!ready) return false;
  let s = CACHE.get(bone);
  if (!s) CACHE.set(bone, (s = bake(bone)));
  const im = size <= 34 ? s.s32 : s.s64, w = size * (im.width / im.height);
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  if (rot) { ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(im, -w / 2, -size / 2, w, size); ctx.rotate(-rot); ctx.translate(-x, -y); }
  else ctx.drawImage(im, x - w / 2, y - size / 2, w, size);
  ctx.imageSmoothingEnabled = sm;
  return true;
}
export const preloadDkSkull = load;
