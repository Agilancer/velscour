// World-space size contract for the Castle's painted furniture (src/world/castleworld.js): the pack paints it at
// wildly different pixel sizes, so each piece is drawn at a height relative to the 60 px hero. Grand pieces (the
// throne dais, the pulpit) may be drawn up to 1.5x of this; tools/tests/castle_overworld.mjs checks it.
export const CASTLE_FURNITURE_HEIGHT = Object.freeze({
  furniture_01_throne_dais: 92,          // a raised, taller-than-hero seat
  furniture_02_cathedral_pew: 34,       // waist-high rows, never giant benches
  furniture_03_cathedral_pulpit: 78,    // slightly taller than the hero
  furniture_04_hanging_chandelier: 55,  // overhead fixture, not a tower
  furniture_05_floor_candelabrum: 48,   // about shoulder height
});
