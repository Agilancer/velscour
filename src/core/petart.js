// Animated companion atlases packed from the labeled source sheets. Summon keys
// intentionally omit Slime Lord pets, structures, and revived monsters.
import { makeCanvas } from './util.js';

const SHEETS = {
  companions_land: { frames: 9, rows: ['wolf', 'spiritwolf', 'direwolf', 'stormwolf'] },
  creatures_land: { frames: 9, rows: ['bear', 'spiritbear', 'ghoul', 'abomination'] },
  companions_winged: { frames: 6, rows: ['hawk', 'stormhawk', 'raven', 'phoenix'] },
  companions_dragons: { frames: 6, rows: ['whelp', 'wyvern', 'frostwyrm', 'elderwyrm'] },
  skeletal_warriors: { frames: 9, rows: ['skeleton', 'reaver', 'spearman', 'berserker'] },
  skeletal_ranged: { frames: 9, rows: ['skelarcher', 'crossbowman', 'skelmage', 'pyromancer'] },
  skeletal_support: { frames: 9, rows: ['plaguecaller', 'stormcaller', 'bishop', 'archlich'] },
  lancer_knights_i: { frames: 9, rows: ['kn_squire', 'kn_lance', 'kn_flame', 'kn_frost'] },
  lancer_knights_ii: { frames: 9, rows: ['kn_storm', 'kn_captain', 'kn_chaplain', 'kn_marshal'] },
  elemental_golems: { frames: 9, rows: ['claygolem', 'bloodgolem', 'firegolem', 'icegolem'] },
  humanoid_warriors: { frames: 9, rows: ['deathknight', 'hoplite', 'squire', 'captain'] },
  class_allies: { frames: 9, rows: ['ancient', 'stormancient', 'ancestor', 'guardian'] },
  skeletal_guards: { frames: 9, rows: ['jailer', 'coffinguard', 'standard', 'gravedigger'] },
  skeletal_champions: { frames: 9, rows: ['pyreknight', 'druid', 'bellringer', 'reaperking'] },
  misc_humanoids: { frames: 9, rows: ['clone', 'chorus', 'witch', 'bonecolossus'] },
};

const BY_KEY = {};
for (const [sheet, meta] of Object.entries(SHEETS))
  meta.rows.forEach((key, row) => { BY_KEY[key] = { sheet, row, ...meta }; });
const loaded = {};

function atlas(sheet) {
  if (loaded[sheet]) return loaded[sheet];
  const img = new Image();
  img.onload = () => { img._pet = { frames: SHEETS[sheet].frames, rows: SHEETS[sheet].rows.length }; };
  img.onerror = () => { console.warn(`Failed to load pet animation atlas ${sheet}`); };
  img.src = `assets/sprites/pets/${sheet}.webp`;
  loaded[sheet] = img;
  return img;
}

/** Return the selected atlas frame, or null while its compact art is loading. */
export function petAnimation(c) {
  const meta = BY_KEY[c.summonKey];
  if (!meta || !c.summon || !c.alive) return null;
  const img = atlas(meta.sheet);
  if (!img.complete || !img.naturalWidth || !img._pet) return null;
  const cw = img.naturalWidth / meta.frames, ch = img.naturalHeight / meta.rows.length;
  let frame;
  if (meta.frames === 6) {
    frame = c.moving ? 3 + (Math.floor(c.animT * 8) % 3) : Math.floor(c.animT * 2.5) % 3;
  } else if (c.spawnT < 0.54) {
    frame = Math.min(3, 1 + Math.floor(c.spawnT / 0.18));
  } else if (c.attackAnimT > 0) {
    frame = 7 + (Math.floor(c.animT * 12) % 2);
  } else if (c.moving) {
    frame = 4 + (Math.floor(c.animT * 8) % 3);
  } else frame = 0;
  return { img, sx: frame * cw, sy: meta.row * ch, cw, ch, frames: meta.frames, h: c.artH || c.spriteH || 48 };
}

/** Keep hit tint generation bounded to the shared source atlas. */
export function petTintImage(img, filter) {
  if (!filter) return img;
  img._petTint ||= {};
  if (img._petTint[filter]) return img._petTint[filter];
  const c = makeCanvas(img.width, img.height), x = c.getContext('2d');
  if (!('filter' in x)) return img;
  x.filter = filter;
  x.drawImage(img, 0, 0);
  img._petTint[filter] = c;
  return c;
}
