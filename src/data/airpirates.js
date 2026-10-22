// The Air Pirates (the user's Air Pirate Expansion Pack, assets/source/enemies/air/, packed by
// `python tools/process_assets.py enemies air`): 30 boarders and 10 captains who only fight in the Sky Battle
// (docs/SKY_BATTLE.md). Like the Breach's creatures they never join the regular bestiary's draws (artPool skips `air`).
// Rows: [name, arch, h, extras]; the id is 'ap_' + the name in snake case. `shot` swaps a gunner's arrow for a bullet.
const mortal = { undead: false, gore: 'flesh', demon: false };

export const AIR_CREW_ROWS = [
  ['Tarcoat Deckhand', 'skeleton', 55, {}],
  ['Saltwind Cutlass Raider', 'ghoul', 55, {}],
  ['Blackpowder Pistolier', 'archer', 55, { shot: 'bullet' }],
  ['Boarding Pike Corsair', 'knight', 57, {}],
  ['Chainhook Climber', 'ghoul', 54, {}],
  ['Gale-Glass Harpooner', 'archer', 58, { shot: 'javelin' }],
  ['Powder-Keg Runner', 'beetle', 52, { el: 'fire' }],
  ["Crow's Nest Sharpshooter", 'archer', 56, { shot: 'bullet' }],
  ['Rift-Compass Navigator', 'cultist', 56, { el: 'arcane' }],
  ['Sky-Chart Thief', 'ghoul', 53, {}],
  ['Quartermaster Breaker', 'demon', 60, {}],
  ['Red-Sash Duelist', 'hound', 56, {}],
  ['Brass-Mask Ship Surgeon', 'cultist', 55, { el: 'poison' }],
  ['Cinderbomb Grenadier', 'cultist', 56, { el: 'fire' }],
  ['Black-Banner Standard Bearer', 'knight', 58, {}],
  ['Hook-Leg Veteran', 'skeleton', 56, {}],
  ['Twin-Pistol Ratliner', 'archer', 55, { shot: 'bullet' }],
  ['Shipbreaker Mauler', 'demon', 62, {}],
  ['Storm-Eye Lookout', 'skeleton', 55, {}],
  ['Violet-Fuse Saboteur', 'beetle', 52, { el: 'arcane' }],
  ["Iron-Rib Captain's Guard", 'knight', 59, {}],
  ['Gallows-Rope Snarer', 'hound', 55, {}],
  ['Windlass Crossbowman', 'archer', 56, {}],
  ['Salt-Rust Boarding Shield', 'knight', 57, {}],
  ['Veil-Cloaked Infiltrator', 'ghoul', 54, {}],
  ['Lantern-Bomb Mechanic', 'cultist', 55, { el: 'fire' }],
  ['Mourning-Coat Corsair', 'skeleton', 57, {}],
  ['Tarred Sail-Ripper', 'ghoul', 55, {}],
  ['Copper-Goggle Powderman', 'cultist', 55, { el: 'fire' }],
  ['Last-Ratline Enforcer', 'knight', 60, {}],
];
// Captains: [name, title, arch, h, extras]: about one and a half heroes tall (the hero is 60). `moves` are the Sky Battle's boss specials (game/skybattle.js): `crew`
// calls boarders over the rail, `hook` throws a chain that drags the hero in, `leap` lands on the hero with a shockwave,
// `barrage` calls the flagship's guns (or a powder volley without it), `storm` calls lightning, `smoke` blinds the deck.
export const AIR_CAPTAIN_ROWS = [
  ['Admiral Veyl', 'the Black-Sail Overlord', 'knight', 92, { el: 'arcane', moves: ['barrage', 'leap', 'crew'], voice: 0.55 }],
  ['Captain Sable Vane', 'Storm Widow', 'archer', 88, { el: 'light', shot: 'bullet', moves: ['storm', 'hook', 'smoke'], voice: 1.25 }],
  ['The Hollow Commodore', 'Lord of the Empty Plate', 'knight', 92, { el: 'cold', moves: ['hook', 'crew', 'leap'], voice: 0.5 }],
  ['Madam Stormglass', 'Navigator of the Rift', 'cultist', 86, { el: 'arcane', moves: ['storm', 'smoke', 'crew'], voice: 1.3 }],
  ['The Gallows King', 'Boarding Tyrant', 'demon', 94, { moves: ['hook', 'leap', 'barrage'], voice: 0.45 }],
  ['Brass-Beak', 'the Rookery Duelist', 'ghoul', 86, { moves: ['leap', 'smoke', 'crew'], voice: 1.1 }],
  ['Red Gale Corsair', 'Captain of the Crimson Storm', 'knight', 90, { el: 'fire', moves: ['barrage', 'hook', 'leap'], voice: 0.8 }],
  ['Warden of the Rookery', 'Jailer of the Fleet', 'golem', 93, { moves: ['hook', 'crew', 'barrage'], voice: 0.5 }],
  ['Lord Thundershroud', 'the Storm Captain', 'archer', 91, { el: 'light', shot: 'bullet', moves: ['storm', 'barrage', 'smoke'], voice: 0.6 }],
  ['The Last Boarding Saint', 'Champion of the Flagship', 'knight', 93, { el: 'holy', moves: ['leap', 'crew', 'storm'], voice: 0.7 }],
];
export const apId = (name) => 'ap_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const AIR_CREW = AIR_CREW_ROWS.map(([name, arch, h, o], i) => ({ id: apId(name), sheet: 'air/crew', i, arch, name, h, air: true, ...mortal, ...o }));
export const AIR_CAPTAINS = AIR_CAPTAIN_ROWS.map(([name, title, arch, h, o], i) => ({
  id: apId(name), sheet: 'air/captains', i, arch, name, title, h, air: true, boss: true, lone: true, captain: true, ...mortal, ...o,
}));
export const AIR_ART = [...AIR_CREW, ...AIR_CAPTAINS];
export const AIR_CAPTAIN = Object.fromEntries(AIR_CAPTAINS.map((a) => [a.id, a]));
/** The boarders who play an archetype, and every archetype the crew plays. */
export const crewFor = (arch) => AIR_CREW.filter((a) => a.arch === arch);
export const AIR_ARCHS = [...new Set(AIR_CREW.map((a) => a.arch))];
