// Global game state singleton. Modules import G and read fields at runtime.
export const G = {
  canvas: null,
  ctx: null,
  W: 0, // css pixels
  H: 0,
  dpr: 1,
  touch: false,
  assets: null,
  world: null,
  player: null,
  char: null, // persistent character record (saved)
  mode: 'loading', // loading | title | game
  paused: false, // simulation paused (menus on desktop keep running in town)
  time: 0,
  dt: 0,
  frame: 0,
  hitStop: 0,
  settings: {
    sfx: 0.6,
    music: 0.35,
    amb: 0.5,
    gore: 2, // 0 off, 1 normal, 2 extreme
    dmgNumbers: true,
    shake: true,
    zoom: 1,
    mobileSkillBar: true,
    lockSkillBar: false, // auto-play only fills empty bar slots
    hideItemNames: false, // no item name labels on the ground (hover still shows one)
    autoSkillPoints: true, // auto-play spends skill points
    autoGear: true, // auto-play equips, sells, buys, stashes and upgrades gear (off: hands off, potions only)
  },
};

export const SETTINGS_KEY = 'velscour_settings_v1';

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    Object.assign(G.settings, s);
  } catch (e) { /* ignore */ }
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) { /* ignore */ }
}
