// A castle variant's story told in person (src/data/castles.js `story`): the herald waits by the road where the hero
// arrives and the lord (or whoever holds the castle now) in the keep's council chamber. Each says their lines in turn
// when the hero comes near, once through, and answers a click with one of them after that.
import { makeFolk } from './folk.js';
import { TOWNSFOLK } from '../data/townsfolk.js';

const NEAR = 5, GAP = 4.2;

/** Put the castle's herald and lord into `world` (gen: castleworld.js's result). */
export function addCastleStory(world, gen) {
  const st = gen.variant?.story;
  if (!st || !gen.story) return;
  for (const [key, at] of [['herald', gen.story.herald], ['lord', gen.story.lord]]) {
    const who = st[key];
    if (!who || !at) continue;
    const folk = TOWNSFOLK.find((v) => v.role === who.role) || TOWNSFOLK.find((v) => v.knight);
    const n = makeFolk(world, folk, at[0], at[1], { calm: key === 'lord', still: true, chatter: who.lines });
    n.storyLines = who.lines; n.storyNext = 0; n.storyT = 0;
    n.onTick = (dt) => {
      const p = world.player;
      if (!p || p.dead || n.hp <= 0) return;
      if ((n.storyT -= dt) > 0 || n.storyNext >= n.storyLines.length) return;
      if (Math.hypot(p.x - n.x, p.y - n.y) > NEAR) return;
      n.face(p.x, p.y);
      n.say(n.storyLines[n.storyNext++], GAP - 0.4);
      n.storyT = GAP;
    };
    world.npcs.push(n);
  }
}
