// Townsfolk animation: frames by name, emotions (pose + motion + bubble icon), walk cycle, squash and stretch.
// Sheets come from tools/build_townsfolk_pack.py: 256 x 192 cells, the standard eleven poses, then per-identity
// extras (knights: attack_1/2; the steward: gesture; the court lady: fan, shy; the scribe: read).
// Coordinates are isometric: screen X is proportional to world X minus world Y. Mirroring belongs to the facing.
export const TOWN_WALK_FPS = 4.25;
export const TOWN_FRAME_W = 256, TOWN_FRAME_H = 192;
export const STD_FRAMES = ['idle_1', 'idle_2', 'idle_3', 'walk_1', 'walk_2', 'dying', 'dead', 'scream', 'point', 'happy', 'celebrate'];
// extras after the eleven standard frames, by source identity (sheet k > 25 repeats identity (k-1)%10+1)
const EXTRAS = { 19: ['attack_1', 'attack_2'], 20: ['attack_1', 'attack_2'], 21: ['attack_1', 'attack_2'], 22: ['attack_1', 'attack_2'],
  23: ['gesture'], 24: ['fan', 'shy'], 25: ['read'] };
const identity = (spriteId) => { const k = +String(spriteId || '').slice(-3) || 1; return k > 25 ? (k - 1) % 10 + 1 : k; };
export const townFrameCount = (spriteId) => 11 + (EXTRAS[identity(spriteId)]?.length || 0);
/** Frame index of a named pose on a sheet, or -1. */
export function townFrameOf(spriteId, name) {
  const i = STD_FRAMES.indexOf(name);
  if (i >= 0) return i;
  const e = EXTRAS[identity(spriteId)], j = e ? e.indexOf(name) : -1;
  return j < 0 ? -1 : 11 + j;
}

/**
 * Emotions: `pose` (frame names; several = cycled at `fps`), `motion` (how the body moves), `icon` (the bubble over
 * the head, src/gfx/emotes.js), `alt` (a fallback pose when a sheet lacks an extra).
 */
export const EMOTIONS = {
  neutral: { pose: null, motion: 'idle' },
  talk: { pose: ['idle_1', 'idle_2'], fps: 1.6, motion: 'talk' },
  happy: { pose: ['happy'], motion: 'bounce', icon: 'smile' },
  laugh: { pose: ['happy', 'celebrate'], fps: 3, motion: 'laugh', icon: 'laugh' },
  celebrate: { pose: ['celebrate', 'happy'], fps: 2.2, motion: 'hop', icon: 'star' },
  cheer: { pose: ['celebrate'], motion: 'hop', icon: 'cheer' },
  love: { pose: ['happy'], motion: 'sway', icon: 'heart' },
  sad: { pose: ['idle_3'], motion: 'slump', icon: 'rain' },
  cry: { pose: ['happy'], motion: 'sob', icon: 'tear' },
  grief: { pose: ['happy'], motion: 'slump', icon: 'candle' },
  pray: { pose: ['happy'], motion: 'breathe', icon: 'pray' },
  angry: { pose: ['point', 'idle_2'], fps: 1.4, motion: 'shake', icon: 'anger' },
  argue: { pose: ['point', 'scream'], fps: 1.8, motion: 'shake', icon: 'anger' },
  scared: { pose: ['scream'], motion: 'tremble', icon: 'sweat' },
  panic: { pose: ['scream'], motion: 'tremble', icon: 'panic' },
  alarm: { pose: ['point', 'scream'], fps: 2.5, motion: 'shake', icon: 'alarm' },
  surprised: { pose: ['scream'], motion: 'jolt', icon: 'surprise' },
  point: { pose: ['point'], motion: 'idle', icon: 'look' },
  think: { pose: ['idle_3'], motion: 'breathe', icon: 'think' },
  question: { pose: ['idle_3'], motion: 'tilt', icon: 'question' },
  idea: { pose: ['point'], motion: 'jolt', icon: 'idea' },
  proud: { pose: ['idle_2'], motion: 'puff', icon: 'crown' },
  impatient: { pose: ['idle_2'], motion: 'tap', icon: 'clock' },
  shy: { pose: ['shy'], alt: ['idle_3'], motion: 'sway', icon: 'blush' },
  fan: { pose: ['fan', 'shy'], alt: ['idle_2'], fps: 0.8, motion: 'breathe', icon: 'sparkle' },
  gesture: { pose: ['gesture', 'idle_1'], alt: ['point', 'idle_1'], fps: 0.9, motion: 'talk' },
  read: { pose: ['read'], alt: ['idle_3'], motion: 'breathe', icon: 'scroll' },
  music: { pose: ['happy', 'celebrate'], fps: 1.5, motion: 'dance', icon: 'music' },
  dance: { pose: ['celebrate', 'happy', 'walk_1', 'walk_2'], fps: 2.6, motion: 'dance', icon: 'music' },
  drunk: { pose: ['idle_1', 'walk_1'], fps: 0.8, motion: 'stagger', icon: 'hic' },
  sleep: { pose: ['dead'], motion: 'snore', icon: 'zzz' },
  tired: { pose: ['idle_3'], motion: 'slump', icon: 'sweat' },
  hungry: { pose: ['idle_1'], motion: 'breathe', icon: 'food' },
  greedy: { pose: ['idle_2'], motion: 'bounce', icon: 'coin' },
  haggle: { pose: ['point', 'idle_2'], fps: 1.1, motion: 'talk', icon: 'coin' },
  work: { pose: ['idle_3', 'point'], fps: 1.7, motion: 'work', icon: null },
  fight: { pose: ['attack_1', 'attack_2'], alt: ['point', 'scream'], fps: 3.2, motion: 'lunge', icon: 'swords' },
  spar: { pose: ['attack_1', 'idle_2', 'attack_2', 'idle_1'], alt: ['point', 'idle_2'], fps: 2.4, motion: 'lunge', icon: 'swords' },
  hurt: { pose: ['dying'], motion: 'tremble', icon: 'hurt' },
  dying: { pose: ['dying'], motion: 'idle', icon: 'hurt' },
  dead: { pose: ['dead'], motion: 'still', icon: null },
  sick: { pose: ['idle_3'], motion: 'sob', icon: 'sick' },
  wave: { pose: ['celebrate', 'happy'], fps: 2, motion: 'bounce', icon: 'wave' },
  bow: { pose: ['happy'], motion: 'bow', icon: null },
  mischief: { pose: ['idle_3', 'happy'], fps: 1.2, motion: 'tilt', icon: 'mischief' },
};

export function townFacingFlip(dx, dy, previous = false) {
  const screenDx = dx - dy;
  return Math.abs(screenDx) <= 0.02 ? previous : screenDx < 0;
}

/** The frame to draw for a townsperson (an emotion, a forced pose, a knight's attack, walking or idling). */
export function townFrame(n) {
  const sid = n.townsfolkSpriteId || n.spriteId;
  if (n.knight && n.townAttackT > 0) {
    const a = townFrameOf(sid, 'attack_1'), b = townFrameOf(sid, 'attack_2');
    if (a >= 0) return Math.floor((n.animT || 0) * 4.5 + (n.townAttackSeed || 0)) % 2 ? b : a;
  }
  if (n.townPoseT > 0) return Math.max(0, Math.min(10, n.townPoseFrame ?? 1));
  const e = n.emotion && n.emotionT > 0 ? EMOTIONS[n.emotion] : null;
  if (e && e.pose && !(n.walking && e.motion !== 'stagger')) {
    let list = e.pose.map((p) => townFrameOf(sid, p)).filter((i) => i >= 0);
    if (list.length < e.pose.length && e.alt) list = e.alt.map((p) => townFrameOf(sid, p)).filter((i) => i >= 0);
    if (list.length) return list[Math.floor((n.emoteClock || 0) * (e.fps || 1)) % list.length];
  }
  // walk: stride, pass, stride, pass (the idle pose stands in for the passing frame), so two drawn strides read as a
  // four-beat cycle; the run is the same cycle faster
  if (n.walking) {
    const beat = Math.floor((n.walkT || 0) * TOWN_WALK_FPS * 2 * (n.running ? 1.7 : 1)) % 4;
    return beat === 0 ? 3 : beat === 2 ? 4 : 0;
  }
  // idle: mostly the first pose; now and then a shift of weight or a thoughtful moment, held for a few seconds
  const t = (n.animT || 0) + (n.idleSeed || 0) * 4.7, slot = Math.floor(t / 3.3) % 7;
  return slot === 3 ? 1 : slot === 5 ? 2 : 0;
}

/**
 * Body motion for a frame: bob (px up), sx/sy (scale about the feet), rot (radians about the feet), dx (px).
 * Walking keeps the hero's 2.2 px stepping bob and 3% squash; emotions add their own.
 */
export function townMotion(animT = 0, moving = false, emotion = null, running = false) {
  const m = { bob: 0, sx: 1, sy: 1, rot: 0, dx: 0, lean: 0 };
  if (moving) {
    const f = running ? 13 : 9;
    m.bob = Math.abs(Math.sin(animT * f)) * (running ? 3.4 : 2.2);
    const s = Math.sin(animT * f * 2) * (running ? 0.045 : 0.03);
    m.sy = 1 + s; m.sx = 1 - s * 0.6;
    m.lean = running ? 0.07 : 0.025;
    if (emotion !== 'drunk') return m;
  }
  const b = Math.sin(animT * 2.1);
  m.sy = 1 + b * 0.012; m.sx = 1 - b * 0.006; // breathing
  switch (EMOTIONS[emotion]?.motion) {
    case 'bounce': m.bob = Math.abs(Math.sin(animT * 6)) * 2.2; m.sy = 1 + Math.sin(animT * 12) * 0.03; break;
    case 'laugh': m.bob = Math.abs(Math.sin(animT * 11)) * 2; m.sy = 1 + Math.sin(animT * 22) * 0.04; m.sx = 1 - Math.sin(animT * 22) * 0.02; break;
    case 'hop': {
      const ph = (animT * 1.9) % 1, air = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI) : 0;
      m.bob = air * 9; m.sy = air ? 1 + air * 0.08 : 1 - Math.sin(((ph - 0.55) / 0.45) * Math.PI) * 0.1; m.sx = 2 - m.sy; break;
    }
    case 'sway': m.rot = Math.sin(animT * 1.8) * 0.05; break;
    case 'dance': m.rot = Math.sin(animT * 4) * 0.08; m.bob = Math.abs(Math.sin(animT * 8)) * 3; m.sy = 1 + Math.sin(animT * 16) * 0.04; break;
    case 'slump': m.sy = 0.96 + Math.sin(animT * 1.1) * 0.01; m.sx = 1.02; m.rot = 0.03; break;
    case 'sob': m.sy = 0.97 + Math.abs(Math.sin(animT * 7)) * 0.025; m.rot = Math.sin(animT * 7) * 0.012; break;
    case 'shake': m.dx = Math.sin(animT * 40) * 0.9; m.sy = 1.02 + Math.sin(animT * 5) * 0.02; break;
    case 'tremble': m.dx = Math.sin(animT * 55) * 0.7; m.sy = 0.98 + Math.sin(animT * 31) * 0.01; break;
    case 'jolt': { const k = Math.max(0, 1 - ((animT * 2) % 3)); m.bob = k * 6; m.sy = 1 + k * 0.08; m.sx = 1 - k * 0.04; break; }
    case 'tilt': m.rot = -0.06 + Math.sin(animT * 1.3) * 0.02; break;
    case 'puff': m.sy = 1.035 + b * 0.01; m.sx = 1.03; break;
    case 'tap': m.bob = Math.max(0, Math.sin(animT * 9)) * 1.2; break;
    case 'talk': m.bob = Math.max(0, Math.sin(animT * 7)) * 0.8; m.rot = Math.sin(animT * 2.3) * 0.02; break;
    case 'stagger': m.rot = Math.sin(animT * 1.7) * 0.13; m.dx = Math.sin(animT * 1.7) * 3; break;
    case 'snore': m.sy = 1 + Math.sin(animT * 1.6) * 0.03; break;
    case 'work': { const k = Math.max(0, Math.sin(animT * 6)); m.bob = k * 1.5; m.sy = 1 - k * 0.04; m.sx = 1 + k * 0.03; break; }
    case 'lunge': m.dx = Math.max(0, Math.sin(animT * 6)) * 4; m.bob = Math.abs(Math.sin(animT * 6)) * 1.5; break;
    case 'bow': { const k = (Math.sin(animT * 1.6) + 1) / 2; m.rot = k * 0.22; m.sy = 1 - k * 0.06; break; }
    case 'still': m.sx = m.sy = 1; break;
  }
  return m;
}
