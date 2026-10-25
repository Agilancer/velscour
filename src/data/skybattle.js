import { SKY_STORIES } from './skystories.js';

// The Sky Battle's eight scenarios (docs/SKY_BATTLE.md): the same battle (boarding waves, a mid-boss, more waves, the
// parley, the flagship, the hooks, two captains) under different skies. In six of them the weather fights too.
// Captains are Air Pirate ids (data/airpirates.js). `sky` is the gradient top to bottom; `far`/`mid` the two cloud
// layers' four tones (shadow to highlight); `boats` weights the boarding craft; `hazard` is game/skybattle.js's.
export const SKY_VARIANTS = [
  {
    id: 'clear', name: 'The Black-Sail Ambush', weather: 'Clear Skies',
    blurb: 'A cloudless day, a long way down, and black sails on the horizon.',
    sky: ['#2f5fae', '#5d93d8', '#8fc2ef'], far: ['#86a9d6', '#a5c3e8', '#bed6f1', '#d3e5f8'], mid: ['#a9c4e6', '#d6e6f7', '#eef5fd', '#ffffff'],
    wind: 1, boats: { cutter: 2, gasbag: 2, hauler: 2 }, hazard: null,
    mid_boss: 'ap_brass_beak', finals: ['ap_admiral_veyl', 'ap_red_gale_corsair'], amb: 'skyship_clear',
  },
  {
    id: 'storm', name: 'Eye of the Storm', weather: 'Thunderstorm',
    blurb: 'Lightning walks the deck. It does not care whose side you are on.',
    sky: ['#161c26', '#27313f', '#3d4a5a'], far: ['#252c38', '#2f3846', '#394352', '#444f5f'], mid: ['#353f4c', '#47525f', '#586472', '#6b7785'],
    wind: 1.6, rain: true, lightning: true, dark: 0.32, boats: { cutter: 3, gasbag: 1, hauler: 2 }, hazard: 'lightning',
    hazardText: 'Lightning strikes the deck: watch for the crackling marks.',
    mid_boss: 'ap_madam_stormglass', finals: ['ap_captain_sable_vane', 'ap_lord_thundershroud'], amb: 'skyship_storm',
  },
  {
    id: 'night', name: 'Lanterns at Midnight', weather: 'Moonless Night',
    blurb: 'They come running dark. Only their lanterns give them away.',
    sky: ['#05080f', '#0c1428', '#18243f'], far: ['#0c1324', '#111a30', '#17213b', '#1d2946'], mid: ['#172036', '#1f2a45', '#283554', '#324062'],
    wind: 0.8, night: true, stars: true, dark: 0.6, boats: { cutter: 2, gasbag: 1, hauler: 2 }, hazard: 'darkness',
    hazardText: 'Night: the pirates come out of the dark. Stay near the lanterns.',
    mid_boss: 'ap_the_hollow_commodore', finals: ['ap_the_gallows_king', 'ap_the_last_boarding_saint'], amb: 'skyship_night',
  },
  {
    id: 'fog', name: 'Ghosts in the Fog', weather: 'Fog Bank',
    blurb: 'A wall of cloud swallows the ship. Something out there is singing shanties.',
    sky: ['#76838d', '#95a2ab', '#b2bcc3'], far: ['#8b98a2', '#9da9b1', '#adb7bd', '#bec6cb'], mid: ['#a3adb3', '#b6bec3', '#c7cdd1', '#d8dcdf'],
    wind: 0.5, fog: true, boats: { cutter: 1, gasbag: 3, hauler: 1 }, hazard: 'fog',
    hazardText: 'Fog: you can only see what is close. Boarders come out of nowhere.',
    mid_boss: 'ap_warden_of_the_rookery', finals: ['ap_the_hollow_commodore', 'ap_madam_stormglass'], amb: 'skyship_fog',
  },
  {
    id: 'sunset', name: 'Red Sky Reckoning', weather: 'Sunset',
    blurb: 'The sun goes down in gold and crimson. Somebody here goes down with it.',
    sky: ['#2b2350', '#a0456a', '#f2a25a'], far: ['#734766', '#9c566c', '#c3776a', '#e49d70'], mid: ['#a8687a', '#d2867f', '#ecab8f', '#ffd6a6'],
    wind: 1, sunset: true, boats: { cutter: 2, gasbag: 2, hauler: 2 }, hazard: null,
    mid_boss: 'ap_red_gale_corsair', finals: ['ap_admiral_veyl', 'ap_brass_beak'], amb: 'skyship_sunset',
  },
  {
    id: 'gale', name: 'Against the Gale', weather: 'Gale',
    blurb: 'A howling gale. Hold on to something. Hold on to anything.',
    sky: ['#355f99', '#6390c8', '#a3c3e4'], far: ['#7f9fc8', '#9db9dc', '#b8cfe9', '#cfe0f3'], mid: ['#a3bddd', '#cfdff1', '#e8f1fb', '#ffffff'],
    wind: 3, gusts: true, boats: { cutter: 3, gasbag: 0, hauler: 2 }, hazard: 'wind',
    hazardText: 'Gale: gusts shove everyone across the deck.',
    mid_boss: 'ap_captain_sable_vane', finals: ['ap_red_gale_corsair', 'ap_warden_of_the_rookery'], amb: 'skyship_gale',
  },
  {
    id: 'blizzard', name: 'Frostbitten Rigging', weather: 'Blizzard',
    blurb: 'Snow in the rigging, ice on the deck, and frostbite on everyone.',
    sky: ['#7e8c9c', '#a8b4c2', '#d0d8e2'], far: ['#a2aebb', '#b6c1cc', '#c7d0d9', '#d8dfe6'], mid: ['#c0c9d2', '#d4dbe2', '#e5e9ee', '#f6f8fa'],
    wind: 2, snow: true, dark: 0.12, boats: { cutter: 2, gasbag: 1, hauler: 3 }, hazard: 'chill',
    hazardText: 'Blizzard: frost gusts sweep the deck and slow whatever they touch.',
    mid_boss: 'ap_the_last_boarding_saint', finals: ['ap_warden_of_the_rookery', 'ap_lord_thundershroud'], amb: 'skyship_blizzard',
  },
  {
    id: 'ash', name: 'Ember Skies', weather: 'Ashfall',
    blurb: 'Over the burning lands the sky rains ash, and the ash is still on fire.',
    sky: ['#180b0a', '#3a1612', '#7a2a14'], far: ['#3a2220', '#4a2a26', '#5a322c', '#6a3a32'], mid: ['#4a2c28', '#5c3630', '#6e4038', '#804a40'],
    wind: 1.2, ash: true, glow: '#ff5a1a', dark: 0.22, boats: { cutter: 2, gasbag: 1, hauler: 2 }, hazard: 'embers',
    hazardText: 'Ashfall: burning embers land on the deck and set it alight.',
    mid_boss: 'ap_the_gallows_king', finals: ['ap_the_last_boarding_saint', 'ap_captain_sable_vane'], amb: 'skyship_ash',
  },
];
/** The thirty stories (data/skystories.js, docs/SKY_STORIES.md), each laid over its `base` weather: the base's sky, clouds,
 *  boats and hazard unless the story names its own. `story` marks them. */
export const SKY_STORY_VARIANTS = SKY_STORIES.map((s) => {
  const b = SKY_VARIANTS.find((v) => v.id === s.base) || SKY_VARIANTS[0];
  return { ...b, mid_boss: s.mid, ...s, story: true, amb: s.amb || b.amb };
});
/** The eight weathers and the thirty stories. */
export const SKY_ALL = [...SKY_VARIANTS, ...SKY_STORY_VARIANTS];
export const SKY_VARIANT = Object.fromEntries(SKY_ALL.map((v) => [v.id, v]));

/**
 * The boarding waves, easy to hard: each boat brings `n` boarders; `champion`/`unique` of them are elites.
 * `mid` after a wave is the mid-boss. Waves scale with the depth through the monsters' levels.
 */
export const SKY_WAVES = [
  { boats: 1, n: [4], champion: 0 },
  { boats: 2, n: [3, 4], champion: 1 },
  { boats: 2, n: [5, 4], champion: 2, unique: 1, mid: true },
  { boats: 3, n: [4, 4, 3], champion: 2 },
  { boats: 3, n: [5, 5, 4], champion: 3, unique: 1 },
];
/** Where boats lie alongside to port (ship z): forward, amidships, on the quarter. */
export const DOCKS = [-6, 3, 13.5];
