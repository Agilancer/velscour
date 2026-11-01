// THE PIRATE SEAS (docs/PIRATE_SEAS.md): the sea battles. Each scenario is a plugin, one module in src/game/seascen/
// (docs/PIRATE_SEAS.md "Building a scenario"): its light, weather, arena, boats, waves, captains, lines and hooks into
// the director (game/seabattle.js), which keeps the shared flow: the arrival, the waves, the mid-boss, the captain, the
// chest, Tolland's bell and the exit. Register a new one here, in its doc number's order.
import GULLWRACK_LIGHT from '../game/seascen/gullwrack_light.js';
import ACROSS_THE_PLANK from '../game/seascen/across_the_plank.js';
import THREE_CHAINS from '../game/seascen/three_chains.js';
import FIRE_BELOW from '../game/seascen/fire_below.js';
import HARPOON_WEATHER from '../game/seascen/harpoon_weather.js';
import THE_LIGHTLESS from '../game/seascen/the_lightless.js';
import FLIGHT_DECK from '../game/seascen/flight_deck.js';
import SEA_COMING_OVER from '../game/seascen/sea_coming_over.js';
import RED_TIDE from '../game/seascen/red_tide.js';
import WRECKERS_REEF from '../game/seascen/wreckers_reef.js';
import LASHED_TOGETHER from '../game/seascen/lashed_together.js';
import NINTH_BELL from '../game/seascen/ninth_bell.js';

// in doc order; a scenario still a stub (null) is left out
export const SEA_SCENARIOS = [GULLWRACK_LIGHT, ACROSS_THE_PLANK, THREE_CHAINS, FIRE_BELOW, HARPOON_WEATHER, THE_LIGHTLESS, FLIGHT_DECK, SEA_COMING_OVER, RED_TIDE, WRECKERS_REEF, LASHED_TOGETHER, NINTH_BELL].filter(Boolean);
/** (The director's older name for them.) */
export const SEA_VARIANTS = SEA_SCENARIOS;
export const SEA_VARIANT = Object.fromEntries(SEA_VARIANTS.map((v) => [v.id, v]));

/** The boarding waves, easy to hard (the Sky Battle's): each boat brings `n` boarders, `champion`/`unique` of them elites. */
export const SEA_WAVES = [
  { boats: 1, n: [4], champion: 0 },
  { boats: 2, n: [3, 4], champion: 1 },
  { boats: 2, n: [5, 4], champion: 2, unique: 1, mid: true },
  { boats: 3, n: [4, 4, 3], champion: 2 },
  { boats: 3, n: [5, 5, 4], champion: 3, unique: 1 },
];

/** Commodore Brask's opening line (the hero's first sea battle, whichever it is) and her line after a win. */
export const BRASK = {
  open: 'On land they whisper it. Out here we say it. Tessariel. Run out the guns.',
  win: "Relight the stern lamp. He'll want something to steer by.",   // the first win only
  wins: ['Pump her out. Count the living.', 'Trim the lamps.', 'Bring her about.', 'Mark the log. One more light.'],
  again: 'Run out the guns.',
};
/** Pip Gannet's barks from the masthead, each tied to a telegraph (at most 8 words). */
export const PIP = {
  longboats: 'Longboats, out of the fog!',
  harpoon: 'Harpoon line, port rail!',
  sails: "Black sails, three... four... I'm not counting.",
  turret: "Turret's turning, get down!",
  torpedo: 'Torpedo, starboard!',
  jets: 'Jets off the catapult!',
  green: "Green light, under the water! It's him!",   // the finale only (#12), said in its cut scene
  cinder: 'Cinderbombs, off her quarterdeck!',   // #4
  hatches: "They're coming up her hatches!",     // #4
  sea: 'Sea coming over, hold on!',               // #8: one call at every sea (two keys, so the 15 s rule lets it come round each time)
  sea2: 'Sea coming over, hold on!',
  mines: 'Mines in the water!',                   // #10
};
/** A captain's cry as he comes over (the mid-boss: no title line of his own at sea yet). */
export const SEA_CRIES = ['Douse that green fire, and them with it!', 'Over the rail, you dogs! Over!', "Lampwarden ship. Lampwarden bones. Take her!", 'Douse that green fire, and them with it!', 'Grapnels! Grapnels and knives!'];
