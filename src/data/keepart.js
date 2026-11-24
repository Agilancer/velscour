// Tessariel's Keep: the trophies' 3D models and how the bake stands them (tools/tkeep3d.html; docs/TESSARIELS_KEEP.md).
// The models are the user's, from github.com/Agilancer/vesperwrithe (shields, skulls, staves) and .../bm (the four Elder
// Dragon Gods of its eighth delve); tools/tkeep3d_bake.js copies them in from clones of those repos, the bake turns each
// into a sprite (assets/tiles/tkeep/: 'trophy_<id>'). size: tiles (the largest side, or the height with `tall`);
// yaw: degrees off facing the camera; pre: [x, y, z] degrees turned first (a model lying down stood up).
const SH = (id, model, o = {}) => ({ id, model: 'vw/' + model + '.glb', size: 1.05, tall: true, yaw: o.yaw ?? 0, ...o });
const ST = (id, model, o = {}) => ({ id, model: 'vw/' + model + '.glb', size: 1.55, tall: true, yaw: 0, ...o });
export const TROPHY_ART = [
  // the four Elder Dragon Gods, on the plinths round the Sacred Flame
  { id: 'dragon_green', model: 'bm/dragon_green.glb', size: 2.45, yaw: 0, plinth: true },
  { id: 'dragon_red', model: 'bm/dragon_red.glb', size: 2.45, yaw: 0, plinth: true },
  { id: 'dragon_undead', model: 'bm/dragon_undead.glb', size: 2.45, yaw: 0, plinth: true },
  { id: 'dragon_black', model: 'bm/dragon_black.glb', size: 2.45, yaw: 0, plinth: true },
  // shields: Tessariel's T, the holy orders' and the free towns' devices
  SH('shield_t_blue', 'kite_t_blue'), SH('shield_t_white', 'kite_t_white'), SH('shield_t_red', 'kite_t_red'), SH('shield_t_black', 'kite_t_black'),
  SH('shield_dragon', 'tower_dragon'), SH('shield_tree', 'tower_world_tree'), SH('shield_sun', 'tower_sunburst'), SH('shield_keep', 'tower_keep'),
  SH('shield_elder', 'kite_elder'), SH('shield_crown', 'kite_solar_crown'), SH('shield_stag', 'kite_stag_crown'), SH('shield_radiant', 'kite_radiant'),
  SH('shield_dawn', 'kite_dawnstar'), SH('shield_griffin', 'kite_griffin'), SH('shield_lionsun', 'tower_lion_sun'), SH('shield_north', 'kite_northstar'),
  // skulls of things slain
  { id: 'skull', model: 'vw/skull_01.glb', size: 0.62, yaw: 0 },
  { id: 'skull_gems', model: 'vw/skull_gems.glb', size: 0.7, yaw: 0 },
  // relics: staves and a lance stood upright
  ST('staff_dawn', 'angels_dawn'), ST('staff_phoenix', 'phoenix_ascendant'), ST('staff_winter', 'winterstar'), ST('staff_seraph', 'seraphs_coil'),
  ST('staff_orrery', 'celestial_orrery'), ST('staff_hourglass', 'hourglass_of_ages'), ST('staff_sunbanner', 'sunbanner_staff'), ST('lance_radiant', 'radiant_lance', { size: 1.75 }),
];
export const TROPHY_ART_BY_ID = Object.fromEntries(TROPHY_ART.map((t) => [t.id, t]));
