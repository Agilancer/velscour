// Emotion bubbles over townsfolk: an 11 x 11 pixel icon in a round, dark-outlined parchment bubble with a tail,
// baked once per icon at 3 px per art pixel and drawn pixel-crisp. drawEmote pops it in (overshoot), floats it and
// pops it out.
import { makeCanvas } from '../core/util.js';

const PAL = { k: '#1c130e', w: '#fffaf0', y: '#ffd23c', Y: '#fff2a0', o: '#f08a24', r: '#e03a3a', R: '#8c1c1c', p: '#ff7aa8',
  b: '#3f8fe0', c: '#a8e0ff', g: '#8a8a94', G: '#62b347', n: '#8a5a2c', N: '#5a3a1c', s: '#f2c9a0', v: '#9a62d8', W: '#d8d0c0' };
// '.' is transparent. Each icon is 11 rows of 11.
const ICONS = {
  smile: ['...kkkkk...', '..kyyyyyk..', '.kyyyyyyyk.', 'kyykyyykyyk', 'kyykyyykyyk', 'kyyyyyyyyyk', 'kykyyyyykyk', 'kyykkkkkyyk', '.kyyyyyyyk.', '..kyyyyyk..', '...kkkkk...'],
  laugh: ['...kkkkk...', '..kyyyyyk..', '.kyyyyyyyk.', 'kykkyyykkyk', 'kyyyyyyyyyk', 'kykkkkkkkyk', 'kykRRRRRkyk', 'kyykrrrkyyk', '.kyykkkyyk.', '..kyyyyyk..', '...kkkkk...'],
  star: ['.....k.....', '....kyk....', '....kyk....', 'kkkkkyykkkk', 'kyyyyyyyyyk', '.kyyyYyyyk.', '..kyyyyyk..', '..kyykyyk..', '.kyyk.kyyk.', '.kyk...kyk.', '.kk.....kk.'],
  cheer: ['.y...k...y.', '....kok....', 'y..kooo k..', '...koook..y', '..koYook...', '..kooook...', '.koooYook..', '.kooooook..', '..kkkkkk...', '.y.......y.', '...y...y...'],
  heart: ['...........', '.kkk...kkk.', 'krrrk.krrrk', 'krwrrkrrrrk', 'krwrrrrrrrk', 'krrrrrrrrrk', '.krrrrrrrk.', '..krrrrrk..', '...krrrk...', '....krk....', '.....k.....'],
  rain: ['...kkkk....', '..kgggggk..', '.kgWWWggkk.', 'kgWWggggggk', 'kgggggggggk', '.kkkkkkkkk.', '...........', '.b..b..b...', '..b..b..b..', '.b..b..b...', '...........'],
  tear: ['.....k.....', '....kck....', '....kck....', '...kcbck...', '..kcwbbck..', '..kcbbbck..', '.kcwbbbbck.', '.kcbbbbbck.', '.kcbbbbbck.', '..kcbbbck..', '...kkkkk...'],
  candle: ['.....y.....', '....yoy....', '....yoy....', '.....k.....', '....kwk....', '....kwk....', '....kwk....', '....kWk....', '....kWk....', '..kkkkkkk..', '..knnnnnk..'],
  pray: ['.....k.....', '....kyk....', '...kyYyk...', '....kyk....', '.k..kyk..k.', 'kyk.kyk.kyk', '.k..kyk..k.', '....kyk....', '...kyyyk...', '..kkkkkkk..', '...........'],
  anger: ['...........', '.kk.....kk.', 'krrk...krrk', 'kRrrk.krrRk', '.kRrk.krRk.', '...........', '.kRrk.krRk.', 'kRrrk.krrRk', 'krrk...krrk', '.kk.....kk.', '...........'],
  sweat: ['...........', '.....kk....', '....kcck...', '...kcwbck..', '..kcwbbck..', '..kcbbbck..', '..kcbbbck..', '...kcbck...', '....kkk....', '...........', '...........'],
  panic: ['.kk.....kk.', '.krk...krk.', '.krk...krk.', '.krk...krk.', '.krk...krk.', '.krk...krk.', '..k.....k..', '...........', '.kk.....kk.', '.krk...krk.', '.kk.....kk.'],
  alarm: ['....kkk....', '...krrrk...', '...krrrk...', '...krrrk...', '...krrrk...', '...krrrk...', '....krk....', '....krk....', '...........', '....kkk....', '....kkk....'],
  surprise: ['....kkk....', '...kyyyk...', '...kyyyk...', '...kyyyk...', '...kyyyk...', '....kyk....', '....kyk....', '...........', '....kkk....', '...kyyyk...', '....kkk....'],
  look: ['...........', '...kkkkk...', '.kkwwwwwkk.', 'kwwwkkkwwwk', 'kwwkbbbkwwk', 'kwwkbkbkwwk', 'kwwkbbbkwwk', 'kwwwkkkwwwk', '.kkwwwwwkk.', '...kkkkk...', '...........'],
  think: ['...........', '...........', '...........', '...........', '.kk..kk..kk', 'kgk.kgk.kgk', '.kk..kk..kk', '...........', '...........', '...........', '...........'],
  question: ['...kkkkk...', '..kbbbbbk..', '.kbbkkkbbk.', '.kbk...kbk.', '.....kkbbk.', '....kbbbk..', '....kbbk...', '....kbk....', '.....k.....', '....kbk....', '....kkk....'],
  idea: ['...kkkkk...', '..kYYYYYk..', '.kYYwYYYYk.', '.kYwYYYYYk.', '.kYYYYYYYk.', '..kYYYYYk..', '...kYYYk...', '...kgggk...', '...kWWWk...', '...kgggk...', '....kkk....'],
  crown: ['...........', 'k...kk...k.', 'kk.kyyk.kk.', 'kyk.kk.kyk.', 'kyykkykkyyk', 'kyyyyyyyyyk', 'kyryybyyryk', 'kyyyyyyyyyk', 'kkkkkkkkkkk', '...........', '...........'],
  clock: ['...kkkkk...', '..kwwkwwk..', '.kwwwkwwwk.', 'kwwwwkwwwwk', 'kwwwwkwwwwk', 'kwwwwkkkkwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', '.kwwwwwwwk.', '..kwwwwwk..', '...kkkkk...'],
  blush: ['...........', '...........', '.kk.....kk.', 'k..k...k..k', '...........', 'pp.......pp', 'pppp...pppp', 'pp.......pp', '....kkk....', '...........', '...........'],
  sparkle: ['.....k.....', '....kYk....', '....kYk..k.', '.kkkYYYkkYk', 'kYYYYwYYYk.', '.kkkYYYkk..', '....kYk.k..', '.k..kYk.kYk', 'kYk..k...k.', '.k.........', '...........'],
  scroll: ['.kkkkkkkk..', 'kWWWWWWWWk.', '.kwwwwwwwk.', '.kwkkkkkwk.', '.kwwwwwwwk.', '.kwkkkkwwk.', '.kwwwwwwwk.', '.kwkkkkkwk.', '.kwwwwwwwk.', 'kWWWWWWWWk.', '.kkkkkkkk..'],
  music: ['.....kkkkk.', '.....kvvvk.', '.....kkkvk.', '.....k..vk.', '.....k..vk.', '.....k..vk.', '..kkkk.kvk.', '.kvvvk.kvk.', '.kvvvk.kkk.', '..kkk.kvvvk', '.......kkk.'],
  hic: ['......kk...', '.....kcck..', '......kk...', '..kk.......', '.kcck......', '.kcwck..kk.', '.kccck.kck.', '..kkk...kk.', '....kkk....', '...kcwck...', '....kkk....'],
  zzz: ['......kkkkk', '......kbbbk', '.......kbk.', '......kbbbk', 'kkkkk.kkkkk', 'kbbbk......', '..kbk......', '.kbk.......', 'kbbbk......', 'kkkkk......', '...........'],
  food: ['...........', '...kkkkk...', '..knnonnk..', '.knonnnonk.', '.knnnonnnk.', 'kkkkkkkkkkk', 'kwwwwwwwwwk', '.kwwwwwwwk.', '..kkkkkkk..', '...........', '...........'],
  coin: ['...kkkkk...', '..kyyyyyk..', '.kyYYYYYyk.', 'kyYykkkYyyk', 'kyYkyyyYyyk', 'kyYkyyyyyyk', 'kyYkyyyYyyk', 'kyYykkkYyyk', '.kyYYYYYyk.', '..kyyyyyk..', '...kkkkk...'],
  swords: ['k.........k', 'kWk.....kWk', '.kWk...kWk.', '..kWk.kWk..', '...kWkWk...', '....kWk....', '...kWkWk...', '.knkk.kknk.', 'knNk...kNnk', '.kk.....kk.', '...........'],
  hurt: ['...........', '.....k.....', '....krk....', '...krrrk...', '..krRrrrk..', '..krrrrrk..', '...krrrk...', '....kkk....', '.k.......k.', 'krk.....krk', '.k.......k.'],
  sick: ['...kkkkk...', '..kGGGGGk..', '.kGGGGGGGk.', 'kGGkGGGkGGk', 'kGGGGGGGGGk', 'kGGGGGGGGGk', 'kGkkkkkkkGk', 'kGkGGGGGkGk', '.kGGGGGGGk.', '..kGGGGGk..', '...kkkkk...'],
  wave: ['...k.k.k...', '..kskskskk.', '..ksksksksk', '..kssssssk.', '.kkssssssk.', 'kssksssssk.', '.kssssssk..', '..kssssk...', '...kssk....', '...........', 'y.y......y.'],
  mischief: ['...kkkkk...', '..kyyyyyk..', '.kyyyyyyyk.', 'kyykkyykkyk', 'kyyyyyyyyyk', 'kyyyyyyyyyk', 'kyyyyykkyyk', 'kyykkkyyyyk', '.kyyyyyyyk.', '..kyyyyyk..', '...kkkkk...'],
  bread: ['...........', '...kkkkk...', '..knnnnnk..', '.knoonoonk.', 'knnnnnnnnnk', 'knnnnnnnnnk', '.kkkkkkkkk.', '...........', '...........', '...........', '...........'],
  dots: ['...........', '...........', '...........', '...........', '...........', '.kk..kk..kk', '.kk..kk..kk', '...........', '...........', '...........', '...........'],
};
// a thought bubble (round with trailing circles) for these; the rest get a speech-style tail
const THOUGHT = new Set(['think', 'question', 'idea', 'dots', 'zzz', 'food', 'coin', 'clock']);
// icons whose bubble is tinted (warning or tender moments)
const TINT = { alarm: '#ffe2d8', panic: '#ffe2d8', anger: '#ffe2d8', heart: '#ffe8ef', love: '#ffe8ef', sick: '#e8f6dc', zzz: '#e4ecff', rain: '#e4ecff', tear: '#e4ecff' };

const S = 3, cache = new Map();
function bake(name) {
  const g = ICONS[name];
  if (!g) return null;
  // bubble: a 17 x 17 art-px rounded body plus a tail, around the 11 x 11 icon
  const W = 19, H = 23, c = makeCanvas(W * S, H * S), x = c.getContext('2d');
  const px = (cx, cy, col) => { x.fillStyle = col; x.fillRect(cx * S, cy * S, S, S); };
  const fill = TINT[name] || '#f6ecd4', edge = '#2a1a10';
  // rounded body: a 17 x 15 box with 3 px corner cut
  const body = (cx, cy) => { const dx = Math.min(cx - 1, 17 - cx), dy = Math.min(cy - 1, 15 - cy); return cx >= 1 && cx <= 17 && cy >= 1 && cy <= 15 && !(dx + dy < 2); };
  for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
    if (body(cx, cy)) px(cx, cy, fill);
    else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => body(cx + a, cy + b))) px(cx, cy, edge);
  }
  // shading inside the bottom edge
  for (let cx = 3; cx <= 15; cx++) if (body(cx, 15)) px(cx, 15, '#d9c39a');
  if (THOUGHT.has(name)) {
    for (const [cx, cy, r] of [[7, 18, 1], [5, 21, 0]]) for (let a = -r - 1; a <= r + 1; a++) for (let b = -r - 1; b <= r + 1; b++) {
      const d = Math.abs(a) + Math.abs(b);
      if (d <= r) px(cx + a, cy + b, fill); else if (d === r + 1) px(cx + a, cy + b, edge);
    }
  } else {
    for (let i = 0; i < 4; i++) { for (let k = 0; k <= 3 - i; k++) px(7 + k, 16 + i, fill); px(6, 16 + i, edge); px(7 + 4 - i, 16 + i, edge); }
    px(7, 20, edge);
  }
  for (let r = 0; r < 11; r++) for (let q = 0; q < 11; q++) { const ch = g[r][q]; if (ch !== '.' && ch !== ' ' && PAL[ch]) px(4 + q, 3 + r, PAL[ch]); }
  return c;
}
export function emoteIcon(name) {
  if (!cache.has(name)) cache.set(name, bake(name));
  return cache.get(name);
}
export const EMOTE_ICONS = Object.keys(ICONS);

/**
 * Draw an emotion bubble with its tail tip at (x, y) (world px, above a head). `age` is the time since it appeared,
 * `left` the time until it goes; it pops in with an overshoot, bobs gently and shrinks away.
 */
export function drawEmote(ctx, name, x, y, age, left, t) {
  const img = emoteIcon(name);
  if (!img) return null;
  const pop = age < 0.28 ? 1 + Math.sin((age / 0.28) * Math.PI) * 0.35 - (1 - age / 0.28) * 0.9 : 1;
  const out = left < 0.25 ? Math.max(0, left / 0.25) : 1;
  const k = Math.max(0.05, pop * out), w = (img.width / S) * 1.5 * k, h = (img.height / S) * 1.5 * k;
  const bob = Math.sin(t * 3.1) * 1.4;
  const bx = Math.round(x - w * 0.4), by = Math.round(y - h + bob);
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, bx, by, w, h);
  ctx.imageSmoothingEnabled = sm;
  return [bx, by, bx + w, by + h];
}
