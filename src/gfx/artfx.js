// Class art ability effects: a skill's 6-stage sequence (start, gather, release, peak, decay, fade) from the
// class art pack, played over the skill's own procedural VFX. Mapping: SKILL_FX in data/classart.js.
import { isoX, isoY } from '../core/view.js';
import { clamp } from '../core/util.js';
import { classArt, artStrip } from '../core/classart.js';
import { SKILL_FX } from '../data/classart.js';
import { addEffect } from './vfx.js';

const HW = 32;
// where a kind's effect plays: ahead of the hero toward the aim, on the hero, or at the target point
const AHEAD = new Set(['melee', 'proj', 'beam', 'fissure', 'cyclone', 'dash', 'chain']);
const AT_TARGET = new Set(['aoe', 'strike', 'rain', 'curse', 'trap', 'wall']);
// effect radius in tiles per kind (as castSkill sizes them), for scaling the art to the skill's area
const RADIUS = { aoe: 1.6, nova: 3, zone: 1.8, curse: 2.2, rain: 2, strike: 1.1, orbit: 1.6, whirl: 1.35, leap: 1.6, trap: 1.2, wall: 2.4 };

class ArtFx {
  constructor(img, cw, ch, x, y, z, w, flip, dur) {
    Object.assign(this, { img, cw, ch, x, y, z, w, flip, dur, t: 0 });
  }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const f = Math.min(5, Math.floor((this.t / this.dur) * 6));
    const w = this.w, h = (w * this.ch) / this.cw;
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(px, py);
    if (this.flip) ctx.scale(-1, 1);
    ctx.drawImage(this.img, f * this.cw, 0, this.cw, this.ch, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

/** The effect strip path ("fx/F12") for a skill, or null if its class has no art for it. */
export function skillFxPath(sk) {
  const id = SKILL_FX[sk.classId] && SKILL_FX[sk.classId][sk.name];
  return id ? 'fx/' + id : null;
}

/** Play a skill's art effect for a cast by `p` aimed at (tx, ty). Quietly does nothing until the art has loaded. */
export function castArtFx(p, sk, tx, ty) {
  const path = skillFxPath(sk);
  const meta = path && classArt(sk.classId);
  const img = meta && artStrip(sk.classId, path);
  if (!img) return;
  const [cw, ch] = meta.fx[path.slice(3)].cell;
  const m = sk.m || {};
  const ang = Math.atan2(ty - p.y, tx - p.x);
  const flip = Math.cos(ang) - Math.sin(ang) < 0; // the art faces screen-right
  let x = p.x, y = p.y, z = 30, w = 72;
  if (AHEAD.has(sk.kind)) {
    x += Math.cos(ang) * 0.9; y += Math.sin(ang) * 0.9; z = 26; w = sk.kind === 'melee' ? 70 * (m.r || 1) : 78;
  } else if (AT_TARGET.has(sk.kind) && !(sk.kind === 'curse' && m.at === 'self')) {
    x = tx; y = ty; z = 14;
  }
  if (RADIUS[sk.kind] && !AHEAD.has(sk.kind)) w = clamp(RADIUS[sk.kind] * (m.r || 1) * HW * 2.6, 60, 230);
  if (['nova', 'zone', 'aoe', 'rain', 'curse', 'trap'].includes(sk.kind)) z = 6;
  addEffect(new ArtFx(img, cw, ch, x, y, z, w, flip, 0.55));
}

/** Fetch the effect strips of the skills on the hero's bar (first casts then already have their art). */
export function preloadBarFx(p, skills) {
  const paths = [];
  for (const id of p.char.bar) {
    const path = id && skills[id] && skillFxPath(skills[id]);
    if (path) paths.push(path);
  }
  if (paths.length && classArt(p.classId)) for (const path of paths) artStrip(p.classId, path);
}
