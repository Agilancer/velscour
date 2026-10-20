// People and animals: frames by name, emotions (pose + motion + bubble icon), the bouncing walk, squash and stretch.
// Sheets come from tools/build_people_pack.py: 256 x 200 cells, feet on row 194, the ten painted emotions
// (idle angry scared point dead excited love cheer attack happy) and, on the three Greener sheets, ten more.
// There are no walk frames: people bounce along on their pose like the hero does; animals trot idle <-> point
// (a raised paw) and bound in their attack pose when they run.
// Coordinates are isometric: screen X is proportional to world X minus world Y. Mirroring belongs to the facing.
export const TOWN_FRAME_W = 256, TOWN_FRAME_H = 200, TOWN_BASELINE = 194;
export const STD_FRAMES = ['idle', 'angry', 'scared', 'point', 'dead', 'excited', 'love', 'cheer', 'attack', 'happy'];
export const EXTRA_FRAMES = ['confused', 'embarrassed', 'proud', 'curious', 'worried', 'suspicious', 'sleepy', 'surprised', 'thinking', 'relieved'];
const rich = (spriteId) => String(spriteId || '').startsWith('00_greener');
export const townFrameCount = (spriteId) => (rich(spriteId) ? 20 : 10);
/** Frame index of a named pose on a sheet, or -1. */
export function townFrameOf(spriteId, name) {
  const i = STD_FRAMES.indexOf(name);
  if (i >= 0) return i;
  const j = rich(spriteId) ? EXTRA_FRAMES.indexOf(name) : -1;
  return j < 0 ? -1 : 10 + j;
}

/**
 * Emotions: `pose` (frame names; several = cycled at `fps`), `alt` (poses for sheets without the Greener extras),
 * `motion` (how the body moves), `icon` (the bubble over the head, src/gfx/emotes.js), `walk` (keeps its pose
 * while moving: a scared run, an angry stomp, a cheering skip).
 */
export const EMOTIONS = {
  neutral: { pose: null, motion: 'idle' },
  talk: { pose: ['idle', 'happy'], fps: 1.3, motion: 'talk' },
  happy: { pose: ['happy'], motion: 'bounce', icon: 'smile', walk: true },
  laugh: { pose: ['cheer', 'happy'], fps: 3, motion: 'laugh', icon: 'laugh' },
  celebrate: { pose: ['cheer', 'excited'], fps: 2.2, motion: 'hop', icon: 'star', walk: true },
  cheer: { pose: ['cheer'], motion: 'hop', icon: 'cheer', walk: true },
  excited: { pose: ['excited'], motion: 'bounce', icon: 'star', walk: true },
  love: { pose: ['love'], motion: 'sway', icon: 'heart', walk: true },
  sad: { pose: ['worried'], alt: ['idle'], motion: 'slump', icon: 'rain' },
  cry: { pose: ['worried', 'love'], alt: ['love'], fps: 0.8, motion: 'sob', icon: 'tear' },
  grief: { pose: ['love'], motion: 'slump', icon: 'candle' },
  pray: { pose: ['love'], motion: 'breathe', icon: 'pray' },
  angry: { pose: ['angry'], motion: 'shake', icon: 'anger', walk: true },
  argue: { pose: ['angry', 'point'], fps: 1.8, motion: 'shake', icon: 'anger' },
  scared: { pose: ['scared'], motion: 'tremble', icon: 'sweat', walk: true },
  panic: { pose: ['scared'], motion: 'tremble', icon: 'panic', walk: true },
  alarm: { pose: ['point', 'scared'], fps: 2.5, motion: 'shake', icon: 'alarm', walk: true },
  surprised: { pose: ['surprised'], alt: ['scared'], motion: 'jolt', icon: 'surprise' },
  point: { pose: ['point'], motion: 'idle', icon: 'look' },
  look: { pose: ['curious'], alt: ['point'], motion: 'tilt', icon: 'look' },
  curious: { pose: ['curious'], alt: ['point'], motion: 'tilt', icon: 'question' },
  think: { pose: ['thinking'], alt: ['idle'], motion: 'breathe', icon: 'think' },
  thinking: { pose: ['thinking'], alt: ['idle'], motion: 'breathe', icon: 'think' },
  question: { pose: ['confused'], alt: ['happy'], motion: 'tilt', icon: 'question' },
  confused: { pose: ['confused'], alt: ['happy'], motion: 'tilt', icon: 'question' },
  idea: { pose: ['excited', 'point'], alt: ['point'], fps: 1.5, motion: 'jolt', icon: 'idea' },
  proud: { pose: ['proud'], alt: ['idle'], motion: 'puff', icon: 'crown', walk: true },
  impatient: { pose: ['suspicious'], alt: ['angry'], motion: 'tap', icon: 'clock' },
  suspicious: { pose: ['suspicious'], alt: ['angry'], motion: 'tilt', icon: 'look' },
  shy: { pose: ['embarrassed'], alt: ['love'], motion: 'sway', icon: 'blush' },
  embarrassed: { pose: ['embarrassed'], alt: ['love'], motion: 'sway', icon: 'blush' },
  worried: { pose: ['worried'], alt: ['scared'], motion: 'breathe', icon: 'sweat' },
  relieved: { pose: ['relieved'], alt: ['happy'], motion: 'slump', icon: 'smile' },
  fan: { pose: ['happy'], motion: 'breathe', icon: 'sparkle' },
  gesture: { pose: ['happy', 'point'], fps: 0.9, motion: 'talk' },
  read: { pose: ['thinking'], alt: ['idle'], motion: 'breathe', icon: 'scroll' },
  music: { pose: ['excited', 'cheer'], fps: 1.5, motion: 'dance', icon: 'music' },
  dance: { pose: ['cheer', 'happy', 'excited', 'love'], fps: 2.6, motion: 'dance', icon: 'music' },
  drunk: { pose: ['happy', 'sleepy'], alt: ['happy', 'idle'], fps: 0.8, motion: 'stagger', icon: 'hic', walk: true },
  sleep: { pose: ['dead'], motion: 'snore', icon: 'zzz' },
  tired: { pose: ['sleepy'], alt: ['idle'], motion: 'slump', icon: 'sweat' },
  sleepy: { pose: ['sleepy'], alt: ['idle'], motion: 'slump', icon: 'zzz' },
  hungry: { pose: ['idle'], motion: 'breathe', icon: 'food' },
  greedy: { pose: ['excited'], motion: 'bounce', icon: 'coin' },
  haggle: { pose: ['point', 'happy'], fps: 1.1, motion: 'talk', icon: 'coin' },
  work: { pose: ['attack', 'idle'], fps: 1.7, motion: 'work', icon: null },
  fight: { pose: ['attack', 'angry'], fps: 3.2, motion: 'lunge', icon: 'swords', walk: true },
  spar: { pose: ['attack', 'idle', 'attack', 'proud'], alt: ['attack', 'idle', 'attack', 'angry'], fps: 2.4, motion: 'lunge', icon: 'swords' },
  hurt: { pose: ['dead'], motion: 'tremble', icon: 'hurt' },
  dying: { pose: ['dead'], motion: 'idle', icon: 'hurt' },
  dead: { pose: ['dead'], motion: 'still', icon: null },
  sick: { pose: ['worried'], alt: ['scared'], motion: 'sob', icon: 'sick' },
  wave: { pose: ['happy', 'cheer'], fps: 2, motion: 'bounce', icon: 'wave' },
  bow: { pose: ['love'], motion: 'bow', icon: null },
  mischief: { pose: ['suspicious', 'happy'], alt: ['excited', 'happy'], fps: 1.2, motion: 'tilt', icon: 'mischief', walk: true },
  spooky: { pose: ['scared', 'attack'], fps: 2, motion: 'shake', icon: 'mischief', walk: true },
};
const LYING = new Set(['sleep', 'dead', 'dying', 'hurt']);
export const isLying = (n) => !!n.lying || (n.emotionT > 0 && LYING.has(n.emotion));

export function townFacingFlip(dx, dy, previous = false) {
  const screenDx = dx - dy;
  return Math.abs(screenDx) <= 0.02 ? previous : screenDx < 0;
}

const poseList = (sid, e) => {
  let list = e.pose.map((p) => townFrameOf(sid, p)).filter((i) => i >= 0);
  if (list.length < e.pose.length && e.alt) list = e.alt.map((p) => townFrameOf(sid, p)).filter((i) => i >= 0);
  return list;
};
/** The frame to draw for a person or animal (a forced pose, an emotion, a knight's swing, a trot, or idling). */
export function townFrame(n) {
  const sid = n.townsfolkSpriteId || n.spriteId;
  if (n.townPoseT > 0 && n.townPose) return Math.max(0, townFrameOf(sid, n.townPose));
  if (n.townAttackT > 0) return townFrameOf(sid, 'attack');
  const e = n.emotion && n.emotionT > 0 ? EMOTIONS[n.emotion] : null;
  if (e && e.pose && (!n.walking || e.walk || n.animal)) {
    const list = poseList(sid, e);
    if (list.length) return list[Math.floor((n.emoteClock || 0) * (e.fps || 1)) % list.length];
  }
  if (n.animal && n.walking) {
    // a bound when running (the attack leap), a trot otherwise (paw up, paw down)
    if (n.running) return n.species === 'rabbit' ? (Math.floor((n.walkT || 0) * 5) % 2 ? 7 : 0) : 8;
    return Math.floor((n.walkT || 0) * 4.5) % 2 ? 3 : 0;
  }
  if (n.walking) return 0;
  // idle: mostly the first pose; now and then a glance or a little smile, held for a few seconds
  const t = (n.animT || 0) + (n.idleSeed || 0) * 4.7, slot = Math.floor(t / 3.6) % 9;
  if (n.animal) return slot === 4 ? 9 : slot === 7 ? 6 : 0;
  if (rich(sid)) return slot === 3 ? 13 : slot === 6 ? 18 : slot === 8 ? 9 : 0;
  return slot === 4 ? 9 : 0;
}

/**
 * Body motion for a frame: bob (px up), sx/sy (scale about the feet), rot (radians about the feet), dx (px).
 * Walking is the hero's bounce (2.2 px stepping bob, 3% squash) with a little more spring and a sway, since the
 * painted pose doesn't step; running bounds higher. Animals trot or hop; rabbits hop everywhere.
 */
export function townMotion(animT = 0, moving = false, emotion = null, running = false, animal = null) {
  const m = { bob: 0, sx: 1, sy: 1, rot: 0, dx: 0, lean: 0 };
  if (moving) {
    if (animal === 'rabbit') {
      const ph = (animT * (running ? 3.4 : 2.2)) % 1, air = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI) : 0;
      m.bob = air * (running ? 9 : 6); m.sy = air ? 1 + air * 0.1 : 1 - Math.sin(((ph - 0.6) / 0.4) * Math.PI) * 0.12; m.sx = 2 - m.sy;
      return m;
    }
    const f = animal ? (running ? 16 : 12) : running ? 13 : 9;
    m.bob = Math.abs(Math.sin(animT * f)) * (animal ? (running ? 3 : 1.4) : running ? 4.2 : 2.8);
    const s = Math.sin(animT * f * 2) * (running ? 0.05 : 0.035);
    m.sy = 1 + s; m.sx = 1 - s * 0.6;
    m.rot = animal ? 0 : Math.sin(animT * f) * (running ? 0.035 : 0.045);
    m.lean = running ? 0.07 : 0.02;
    if (emotion !== 'drunk') return m;
  }
  const b = Math.sin(animT * 2.1);
  m.sy = 1 + b * 0.012; m.sx = 1 - b * 0.006; // breathing
  switch (EMOTIONS[emotion]?.motion) {
    case 'bounce': m.bob = Math.abs(Math.sin(animT * 6)) * 2.4; m.sy = 1 + Math.sin(animT * 12) * 0.03; break;
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
