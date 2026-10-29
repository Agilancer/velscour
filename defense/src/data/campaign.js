// The campaign: 8 regions x 10 stages. Every 10th stage is the region's boss; every 5th has a lieutenant.
// featured: the four heroes who lead extra dialogs in the region (docs/STORY.md).
export const REGIONS = [
  { id: 'outskirts', name: 'Herrington Outskirts', boss: 'Horned Warlord', lieutenant: 'Bastille Beast',
    featured: ['corwin', 'wren', 'brakka', 'jasper'],
    blurb: 'The Riftgate tore open beside Herrington Hollow. Velscour\'s vanguard spills across the farms, mills and roads around the town.' },
  { id: 'catacombs', name: 'The Catacomb Breach', boss: 'King Below the Floor', lieutenant: 'Bone Leviathan',
    featured: ['mortimer', 'maudlin', 'flint', 'ismene'],
    blurb: 'The rift\'s roots run under the Hollow. The dead come up the old catacomb stairs; the company goes down to seal the breach.' },
  { id: 'cathedral', name: 'The Ashen Cathedral', boss: 'The Candle King', lieutenant: 'Bone Chorister',
    featured: ['corwin', 'varric', 'jasper', 'selene'],
    blurb: 'The burned cathedral of the Dawn Order, where Corwin and Varric took their vows, and its graveyard, where the faithful will not stay buried.' },
  { id: 'frostfang', name: 'Frostfang Pass', boss: 'Frost Leviathan', lieutenant: 'Rime Warden',
    featured: ['varric', 'halvard', 'kestrel', 'cassius'],
    blurb: 'A mountain pass of ice and switchbacks. Halvard\'s monastery hangs over it; Varric fell to the Runeblade\'s whisper here.' },
  { id: 'sand', name: 'The Sea of Sand', boss: 'Grave-Star Colossus', lieutenant: 'Tidal Basilisk',
    featured: ['flint', 'selene', 'brakka', 'cassius'],
    blurb: 'Endless dunes, sunken tombs and the wreck of Flint\'s old salvage rig. Sandstorms hide the horde until it is at the posts.' },
  { id: 'forest', name: 'The Dark Forest', boss: 'Sleeper in the Roots', lieutenant: 'Gallows Tree',
    featured: ['wren', 'nkemi', 'maudlin', 'gloop'],
    blurb: 'Wren\'s home woods, rotting from the roots up. The spirits Nkemi speaks with are frightened; Maudlin\'s old hut stands somewhere inside.' },
  { id: 'ironcrown', name: 'The Siege of Ironcrown', boss: 'Black Throne Engine', lieutenant: 'Siege Maw',
    featured: ['ysolde', 'kestrel', 'gloop', 'halvard'],
    blurb: 'Ironcrown Castle is besieged by Velscour\'s war engines. Walls, wall-walks and a great hall to hold, and a slime embassy arrives.' },
  { id: 'rift', name: 'Beyond the Riftgate', boss: 'The Wound Without End', lieutenant: 'Horned Warlord',
    featured: ['mortimer', 'nkemi', 'ysolde', 'ismene'],
    blurb: 'Through the Riftgate itself, down the bleeding steps toward Velscour\'s throne, to break the Avatar that keeps the rift open.' },
];

// [name, blurb] per stage, ten per region in order
const STAGES = [
  // Herrington Outskirts
  ['The Riftgate Wakes', 'The first monsters trickle out of the blue-black rift onto the miller\'s road. The company\'s first stand.'],
  ['Millbrook Crossing', 'A stone bridge over a stream; two roads meet at it.'],
  ['The Turnip Fields', 'Open farmland; the horde tramples the harvest.'],
  ['Old Lantern Road', 'Nightfall. The road lamps are the only light.'],
  ['Shepherd\'s Rise', 'A hill with high ground over a winding sheep track. A lieutenant, the Bastille Beast, leads the charge.'],
  ['The Burning Granary', 'The horde raids the granary; smoke and fire everywhere.'],
  ['The Hollow Gate', 'The town\'s outer gate, attacked from two directions at once.'],
  ['Crow\'s Orchard', 'An orchard full of crows. Maudlin insists they are on our side.'],
  ['The Long Ditch', 'One long serpentine ditch; nowhere for the horde to go but along it.'],
  ['The Horned Warlord', 'BOSS: the Horned Warlord, Velscour\'s vanguard champion, comes through the rift for the Hollow.'],
  // The Catacomb Breach
  ['Stairs of the Dead', 'Down the catacomb stairs beneath the Hollow; bone crawlers come up them.'],
  ['The Ossuary Walk', 'Walls of stacked skulls. Mortimer knows every one by name.'],
  ['Candlemere Crypts', 'Candle-lit crypts; the candles never go out.'],
  ['The Drowned Vault', 'Flooded passages; things swim in the black water.'],
  ['Hall of Nameless Kings', 'A tomb hall of forgotten kings. A lieutenant, the Bone Leviathan, coils through it.'],
  ['The Bone Market', 'Where ghouls once traded. Maudlin haggled here in her youth.'],
  ['Whispering Galleries', 'Echoing galleries; three ways in.'],
  ['The Charnel Pit', 'A deep pit crossed by high walkways.'],
  ['The Sealed Reliquary', 'The tomb of Mortimer\'s old teacher, broken open from below.'],
  ['King Below the Floor', 'BOSS: the King Below the Floor, a great worm, bursts up through the catacomb floor.'],
  // The Ashen Cathedral
  ['Gravewardens\' Gate', 'The gate of the Dawn Order\'s cathedral grounds, burned and broken.'],
  ['The Weeping Yard', 'The graveyard; the faithful are climbing out of their graves.'],
  ['Nave of Cinders', 'The burned nave; embers still glow in the pews.'],
  ['The Belfry Climb', 'Up the bell tower; the bells ring by themselves.'],
  ['Chapel of Broken Glass', 'A side chapel of shattered stained glass. A lieutenant, the Bone Chorister, sings in it.'],
  ['Choir of the Hollow', 'The dead choir sings; Jasper takes it personally.'],
  ['The Unhallowed Font', 'The font that blessed Corwin and Varric now spills black water.'],
  ['Reliquary Stair', 'The stair to the relic vault; old oaths are carved on every step.'],
  ['The Bishop\'s Garden', 'The bishop\'s garden of ash trees, the last calm before the Candle King.'],
  ['The Candle King', 'BOSS: the Candle King, a burning tyrant who wears the cathedral\'s fire as a crown.'],
  // Frostfang Pass
  ['The Thawless Road', 'A frozen road up into the mountains.'],
  ['Icefall Switchbacks', 'Switchbacks under an icefall; the horde winds up and up.'],
  ['Wolfhowl Ridge', 'A ridge where things howl that are not wolves.'],
  ['The Frozen Lake', 'A wide frozen lake; the ice groans under the horde.'],
  ['Avalanche Hollow', 'A hollow under heavy snow. A lieutenant, the Rime Warden, marches through it.'],
  ['The Hanging Monastery', 'Halvard\'s monastery, hanging over the pass. He took his vow here.'],
  ['Rimeglass Caves', 'Caves of blue ice that reflect everything.'],
  ['The Knight\'s Cairn', 'A cairn of stones where Varric fell to the Runeblade\'s whisper.'],
  ['Summit Watch', 'The watchtower at the top of the pass.'],
  ['Frost Leviathan', 'BOSS: the Frost Leviathan, a vast beast of ice, crawls over the summit.'],
  // The Sea of Sand
  ['Dune Reach', 'The first dunes; hot wind and shifting sand.'],
  ['Caravans\' Graveyard', 'Wrecked caravans half buried in sand.'],
  ['Mirage Wells', 'Wells that may or may not be there.'],
  ['The Glass Flats', 'Flats of lightning-glass that shine like mirrors.'],
  ['Scorpion Narrows', 'A narrow canyon. A lieutenant, the Tidal Basilisk, hunts in it.'],
  ['The Rusted Dredge', 'The wreck of Flint\'s old salvage rig.'],
  ['Sandstorm Night', 'A night sandstorm; the horde is upon the posts before anyone sees it.'],
  ['Tomb of the Sun Kings', 'A sunken royal tomb; the stars over it are wrong, says Cassius.'],
  ['The Sinking Oasis', 'An oasis being swallowed by the sand.'],
  ['Grave-Star Colossus', 'BOSS: the Grave-Star Colossus, a giant of bone and starlight, walks out of the desert.'],
  // The Dark Forest
  ['Edge of the Thornwood', 'The edge of the Dark Forest; thorns everywhere.'],
  ['Wren\'s Old Trail', 'The hunting trail Wren grew up on, now overgrown and wrong.'],
  ['The Lantern Vigil', 'Lanterns hung in the trees must be kept burning.'],
  ['The Rootmaze', 'A maze of roots taller than houses.'],
  ['The Spirit Glade', 'A glade of frightened spirits. A lieutenant, the Gallows Tree, uproots itself to fight.'],
  ['Maudlin\'s Hut', 'Maudlin\'s old hut on chicken-bone stilts. She is not happy about the visitors.'],
  ['The Weeping Willows', 'Willows that weep sap like blood.'],
  ['The Briar Labyrinth', 'A labyrinth of briars; three paths through it.'],
  ['The Rotting Heart', 'The approach to the forest\'s rotting heart.'],
  ['Sleeper in the Roots', 'BOSS: the Sleeper in the Roots, the fungal thing poisoning the forest from below.'],
  // The Siege of Ironcrown
  ['The Burning Village', 'The village under Ironcrown\'s walls is on fire.'],
  ['Drawbridge Defense', 'Hold the drawbridge while it is raised.'],
  ['The Outer Bailey', 'The outer bailey, full of stalls and panic.'],
  ['Siege Engines', 'The horde\'s war engines roll in.'],
  ['The Wall-Walk', 'High on the wall-walk. A lieutenant, the Siege Maw, batters the walls.'],
  ['Courtyard of Banners', 'The courtyard of banners; Ironcrown\'s colours must not fall.'],
  ['The Great Hall', 'The great hall; the feast tables become barricades.'],
  ['The Gloopish Embassy', 'A slime embassy from King Gloop\'s lost kingdom arrives at the worst moment.'],
  ['The Throne Stair', 'The stair to Ironcrown\'s throne.'],
  ['Black Throne Engine', 'BOSS: the Black Throne Engine, Velscour\'s greatest siege machine.'],
  // Beyond the Riftgate
  ['Through the Riftgate', 'The company steps through the blue-black Riftgate into the Abyss.'],
  ['The Bleeding Steps', 'Steps of red stone that bleed.'],
  ['Field of Chains', 'A field of hanging chains; some still hold prisoners.'],
  ['The Screaming Bridge', 'A bridge over the void that screams when walked.'],
  ['Velscour\'s Menagerie', 'Velscour\'s menagerie of monsters. A lieutenant, the Horned Warlord, returns stronger.'],
  ['The Mirror of Varric', 'A hall of mirrors where Varric faces what he was.'],
  ['Furnace of Souls', 'The furnace where Velscour forges his horde from souls.'],
  ['The Last Bastion', 'The heroes build their own bastion inside the Abyss.'],
  ['The Throne Approach', 'The road to the throne; everything Velscour has left.'],
  ['The Wound Without End', 'FINAL BOSS: the Wound Without End, the Avatar of Velscour that holds the rift open.'],
];

export const LEVELS = STAGES.map(([name, blurb], i) => {
  const region = REGIONS[Math.floor(i / 10)], k = i % 10;
  return { n: i + 1, name, blurb, region: region.id, boss: k === 9, lieutenant: k === 4 };
});

// 1,000 waves over the 80 stages, each wave harder than the last: stage n has about 6 + 13(n-1)/79 waves
export const TOTAL_WAVES = 1000;
{
  const raw = LEVELS.map((L) => 6 + 13 * (L.n - 1) / 79);
  const sum = raw.reduce((a, b) => a + b, 0), counts = raw.map((r) => Math.floor(r * TOTAL_WAVES / sum));
  let left = TOTAL_WAVES - counts.reduce((a, b) => a + b, 0);
  for (let i = LEVELS.length - 1; left > 0; i = (i + LEVELS.length - 1) % LEVELS.length) { counts[i]++; left--; }
  let w = 0;
  LEVELS.forEach((L, i) => { L.waves = counts[i]; L.wave0 = w; w += counts[i]; });
}
