// Which summons are drawn as live 3D beasts (gfx/beasts3d.js) and by whom. Creature.draw asks here first; a drawer
// returns false while its model loads (or without WebGL) and the creature's painted art is drawn instead.
// One line per family: import its drawer and name the summon keys it draws (a monster that is no summon sets `beastKey`).
// (var: a drawer's module may register while this one is still loading, in an import cycle)
var LOOKS;
/** fn(ctx, creature) -> true when it drew the creature. */
export function registerBeastLook(keys, fn) { LOOKS ||= new Map(); for (const k of keys) LOOKS.set(k, fn); }
export function drawBeastLook(ctx, c) { const f = LOOKS && LOOKS.get(c.summonKey || c.beastKey); return !!f && f(ctx, c); }
import './grubs3d.js';
import './dragons3d.js';
import './birds3d.js';
import './treasureimp3d.js';
