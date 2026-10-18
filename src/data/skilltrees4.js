// The fourth skill tree of the fourteen classes that had three (the Necromancer and Dragoon already had four):
// flashier, combo-heavy spells that lean on the class's own look. Same line format and 5x4 layout as skilldata.js.
export const TREE4_NAMES = {
  paladin: 'Radiant Ascension', ranger: 'Starshot', wizard: 'Prismatic', barbarian: 'Bloodrage', totem_master: 'Spirit Walk',
  death_knight: 'Runeblade', arcane_sorcerer: 'Constellations', carrion_witch: 'Grave Moon', bard: 'Grand Finale', slime_lord: 'Primordial',
  boomerang_knight: 'Tempest Orbit', lancer: 'Radiant Lance', dragon_knight: 'Wyrmfire Ascendant', gunner: 'Heavy Ordnance',
};

export const TREE4 = {
  paladin: [
    'Dawnblade|melee|holy|slash|free wc=1 cleave', 'Halo Toss|proj|holy|disc|bounce=3', 'Lightwell|zone|holy|holy|heal r=1.2 dur=6 cd=10', 'Censure|curse|holy|sigil|curse=amp r=1.2',
    'Seraph Wings|dash|holy|charge|range=1.3 exp', 'Prism Lance|proj|holy|laser|pierce n=3 spread=20', 'Hallowed Ground|zone|holy|holy|r=1.5 dur=6', 'Choir of Blades|orbit|holy|blade|n=5 dur=6 cd=8',
    'Radiant Cascade|chain|holy|lightning|n=6', 'Solar Hammer|aoe|holy|pillar|r=1.6 dmg=1.8 cd=3', 'Beacon of Valor|buff|holy|aura|buff=dmg,armor amt=30 dur=15 cd=30 party', 'Ascendant Leap|leap|holy|holy|r=1.6 dmg=1.5',
    'Wings of Judgment|rain|holy|star|n=18 r=1.6', 'Sunfire Nova|nova|holy|holy|n=2 r=1.6', 'Seraphic Host|summon|holy|guardian|sum=guardian n=2 dur=20 cd=30', 'Halo of Spears|proj|holy|spear|n=12 ring',
    'Day of Reckoning|strike|holy|holy|n=12 cd=8', 'Avatar of Dawn|buff|holy|aura|pulse buff=dmg,speed amt=40 dur=12 cd=40', 'Throne of Light|aoe|holy|pillar|r=2.4 dmg=3 cd=8', 'Eternal Sunrise|beam|holy|laser|dur=3 dmg=1.6 cd=8',
  ],
  ranger: [
    'Star Shot|proj|light|arrow|free wc=1', 'Comet Arrow|proj|fire|arrow|exp r=1.1', 'Moonfall Mark|curse|arcane|sigil|curse=mark amt=30 r=0.8', 'Skyward Roll|dash|phys|wind|range=0.9',
    'Constellation|proj|light|arrow|n=6 ring', 'Shooting Star|aoe|light|meteor|r=1.3 dmg=1.6', 'Nebula Trap|trap|arcane|rune|n=3', 'Starhawk|summon|light|bird|sum=stormhawk n=1 dur=20 cd=15',
    'Meteor Volley|rain|fire|meteor|n=12 r=1.6', 'Orbit Arrows|orbit|light|blade|n=4 dur=6 cd=8', 'Polaris|proj|light|arrow|pierce dmg=2.4 spd=2 cd=2', 'Twin Moons|cyclone|cold|wind|n=2',
    'Celestial Hail|rain|cold|arrow|n=30 r=1.8 cd=4', 'Starburst Arrow|proj|light|arrow|split n=4 spread=30 exp', 'Lunar Sentry|summon|light|tesla|sum=chainsentry n=1 dur=15 cd=12', 'Gravity Shot|proj|arcane|blob|stun exp r=1.2',
    'Supernova Arrow|aoe|fire|explosion|r=2.4 dmg=2.6 cd=6', 'Zodiac|proj|light|arrow|n=16 ring dmg=0.9', 'Starlit Hunt|buff|light|aura|buff=crit,as amt=35 dur=12 cd=30', 'Falling Sky|rain|light|meteor|n=24 r=2.2 dur=3 cd=10',
  ],
  wizard: [
    'Prism Bolt|proj|arcane|orb|free wc=0.6', 'Spectrum Ray|beam|light|laser|dur=1.5 range=0.6', 'Mirror Ward|buff|arcane|shield|buff=res amt=30 dur=20 cd=25', 'Refraction|chain|light|lightning|n=4',
    'Rainbow Orb|proj|arcane|orb|home exp r=1.1', 'Crystal Lattice|wall|cold|ice|dur=6', 'Chromatic Nova|nova|arcane|frost|r=1.3', 'Lens Flare|aoe|fire|explosion|r=1.5 delay=0.5',
    'Prismatic Spray|proj|arcane|shard|n=9 spread=70', 'Spectral Hydra|summon|arcane|hydra|sum=hydra max=2 dur=12 cd=6', 'Light Bender|blink|arcane|smoke|range=1.3', 'Kaleidoscope|orbit|arcane|orb|n=6 dur=6 cd=8',
    'Prism Storm|rain|light|star|n=16 r=1.8', 'Dispersion Field|zone|arcane|frost|r=1.6 dur=6 slow', 'Elemental Weave|proj|fire|fireball|n=3 spread=30 exp', 'Arc Prism|cyclone|light|storm|n=2',
    'Singularity Lens|aoe|arcane|eruption|r=2.2 dmg=2.4 cd=6', 'Prismatic Cataclysm|rain|arcane|meteor|n=14 r=2.2 dur=3 cd=10', 'Overcharge|buff|light|aura|buff=dmg amt=35 dur=10 cd=30', 'White Beam|beam|light|laser|dur=3 dmg=1.5 cd=6',
  ],
  barbarian: [
    'Rending Chop|melee|blood|axe|free wc=1 bleed', 'Blood Howl|buff|blood|shout|buff=dmg amt=20 dur=15 cd=20', 'Gore Rush|dash|blood|charge|range=1.1 knock', 'Hamstring|melee|phys|slash|slow arc=90',
    'Crimson Cleave|melee|blood|axe|cleave dmg=1.3', 'Bloodletting|nova|blood|shock|r=1.1 leech', 'Raging Leap|leap|blood|earth|r=1.4 dmg=1.4', 'Sanguine Fury|buff|blood|aura|buff=as,leech amt=25 dur=12 cd=25',
    'Red Whirl|whirl|blood|axe|dur=2.5', 'Butcher Swing|melee|blood|axe|arc=360 r=1.3 dmg=1.4', 'Blood Totem|summon|blood|totem|sum=totem_fire n=1 dur=15 cd=15', 'Torn Earth|fissure|blood|earth|range=1.4',
    'Massacre|melee|blood|slash|n=6 dmg=0.6', 'Heartquake|nova|blood|eruption|n=2 r=1.5', 'Berserk Hymn|buff|blood|shout|buff=dmg,speed amt=35 dur=12 cd=30 party', 'Axe Rain|rain|phys|axe|n=14 r=1.6',
    'Bloodbath|aoe|blood|eruption|r=2.4 dmg=2.6 leech cd=6', 'Avatar of Carnage|buff|blood|transform|buff=dmg,as,armor amt=45 dur=15 cd=45', 'Crimson Tide|fissure|blood|wave|range=1.8 knock cd=4', 'Endless Rage|whirl|blood|axe|dur=4 cd=10',
  ],
  totem_master: [
    'Ghostpalm Strike|melee|arcane|smash|free wc=1', 'Ghost Totem|summon|shadow|totem|sum=totem_link n=1 dur=15 cd=10', 'Spirit Mend|heal|holy|light|amt=18 cd=8', 'Wisp Bolt|proj|arcane|spirit|home',
    'Ancestral Step|blink|arcane|smoke|range=1.2', 'Spirit Wolves Howl|summon|cold|spiritwolf|sum=spiritwolf n=2 dur=20 cd=20', 'Soul Drum|nova|arcane|shock|r=1.2 slow', 'Totem of Echoes|summon|light|totem|sum=totem_thunder n=1 dur=15 cd=15',
    'Soul Tether Chain|chain|arcane|spirit|n=5', 'Ancestor Circle|zone|holy|holy|heal r=1.4 dur=6 cd=12', 'Vision Quest|buff|arcane|aura|buff=dmg,crit amt=30 dur=15 cd=30', 'Phantom Herd|fissure|arcane|earth|range=1.5 knock',
    'Ancestral Tempest|rain|arcane|spirit|n=16 r=1.6', 'Grand Totem Call|summon|fire|totem|sum=totem_grand n=1 dur=20 cd=30', 'Soul Harvest|nova|shadow|drain|r=1.5 leech', 'Wandering Spirits|orbit|arcane|spirit|n=5 dur=6 cd=8',
    'Great Spirit|summon|arcane|ancient|sum=ancestor n=1 dur=25 cd=40', 'Spiritwalk|buff|arcane|transform|buff=speed,res amt=40 dur=12 cd=30', 'Ancestral Avalanche|aoe|cold|eruption|r=2.4 dmg=2.5 cd=6', 'World Tree Pulse|nova|holy|holy|n=3 r=1.6 cd=6',
  ],
  death_knight: [
    'Rune Strike|melee|shadow|slash|free wc=1', 'Rune of Frost|curse|cold|sigil|curse=slow r=1.2', 'Rune Shield|buff|shadow|shield|buff=armor amt=45 dur=20 cd=25', 'Grim Lash|melee|shadow|blade|arc=120',
    'Rune Blade Throw|proj|shadow|blade|pierce', 'Runic Ward|wall|cold|ice|block dur=6', 'Rune Burst|nova|shadow|void|r=1.2', 'Bone Rune|trap|shadow|rune|n=3',
    'Runic Cleave|melee|cold|slash|cleave dmg=1.4', 'Rune Chain|chain|shadow|chain|n=5', 'Dark Runeweapon|summon|shadow|blade|sum=runeweapon n=1 dur=15 cd=20', 'Grave Leap|leap|shadow|eruption|r=1.4 dmg=1.4',
    'Rune Storm|rain|shadow|blade|n=16 r=1.6', 'Glyph of Doom|curse|shadow|sigil|curse=decay r=1.4', 'Runic Whirl|whirl|cold|blade|dur=2.5', 'Shatter Rune|aoe|cold|eruption|r=1.8 dmg=1.8 freeze cd=4',
    'Runeforged Avatar|buff|shadow|transform|buff=dmg,armor amt=40 dur=15 cd=40', 'Rune of Ending|aoe|shadow|void|r=2.4 dmg=2.8 cd=8', 'Endless Runes|orbit|shadow|blade|n=6 dur=8 cd=10', 'Soulreaver Beam|beam|shadow|laser|dur=2.5 dmg=1.5 cd=6',
  ],
  arcane_sorcerer: [ // the Astronomer's star chart: drawing, igniting and wearing constellations
    'Twinkle|proj|arcane|stardust|n=2 spread=14 spd=1.5', 'Star Chart|aoe|arcane|starfall|astro=chart r=0.9', 'Lodestar|zone|arcane|lodestar|r=1.2 dur=6 slow', 'Stargazer|buff|arcane|aura|buff=crit amt=40 dur=25 cd=25',
    'Constellation|aoe|arcane|starfall|astro=ignite r=1 cd=4', 'Shooting Star|dash|arcane|shootingstar|range=1.4', 'Ursa Major|summon|arcane|ursa|sum=ursa max=1 dur=20 cd=30', 'Celestial Sphere|orbit|arcane|zodiac|n=6 dur=8 cd=10',
    'Astral Projection|summon|arcane|clone|sum=clone n=2 dur=12 cd=20', 'Starlines|wall|arcane|starline|len=1.2 dur=6 cd=6', 'Polaris|strike|arcane|polaris|n=1 dmg=1.6', 'Zodiac Wheel|nova|arcane|zodiac|n=2 r=1.6',
    "Orion's Volley|proj|arcane|starmissile|n=7 spread=20 pierce dmg=1.2", 'Draco|cyclone|arcane|draco|n=2 dur=5', 'Northern Cross|fissure|arcane|starline|n=4 spread=270', 'Astrolabe|buff|arcane|aura|buff=cdr,res amt=40 dur=20 cd=40',
    'Grand Conjunction|buff|arcane|transform|astro=conjunction transform buff=dmg,crit,as amt=45 dur=12 cd=60', 'Starfall|rain|arcane|starfall|n=36 r=2.6 dur=2.5 cd=6', "Heaven's Map|aoe|arcane|starfall|astro=heavensmap r=1 cd=20", 'Orrery|orbit|arcane|planet|n=8 r=1.4 dur=10 cd=14',
  ],
  carrion_witch: [
    'Moonlit Hex|proj|shadow|feather|free wc=0.6', 'Moon Moths|proj|poison|locust|n=4 spread=50 home', 'Bone Charm|buff|shadow|shield|buff=armor amt=40 dur=20 cd=25', 'Witchlight|zone|poison|poison|r=1.1 dur=5',
    'Crow Gale|cyclone|shadow|wind|n=1 dur=4', 'Gravecall|summon|shadow|ghoul|sum=ghoul n=2 dur=20 cd=20', 'Blood Moon Hex|curse|blood|sigil|curse=amp r=1.3', 'Hex Burst|nova|poison|acid|r=1.2',
    'Murder Swarm|rain|shadow|feather|n=16 r=1.6', 'Moon Cauldron|summon|poison|cauldron|sum=cauldron n=1 dur=15 cd=15', 'Witchfire|chain|poison|drain|n=5 leech', 'Effigy Ward|summon|shadow|scarecrow|sum=effigy n=1 dur=15 cd=20',
    'Grave Moon Rising|aoe|shadow|eruption|r=1.8 dmg=1.8 cd=4', 'Plague Moths|orbit|poison|locust|n=6 dur=6 cd=8', 'Coven Call|summon|shadow|witch|sum=witch n=2 dur=20 cd=30', 'Rot Tide|fissure|poison|wave|range=1.5',
    'Eclipse Hex|curse|shadow|void|curse=decay,slow r=1.8 cd=6', 'Night Mother|buff|shadow|transform|buff=dmg,leech amt=35 dur=12 cd=40', 'Lantern Procession|summon|fire|lantern|sum=lantern n=3 dur=15 cd=25', 'Moonfall|rain|shadow|meteor|n=14 r=2.2 dur=3 cd=10',
  ],
  bard: [
    'Opening Act|proj|light|n_q|free wc=1 canon dmg=0.6', 'Bright Note|proj|light|n_e|home cresc', 'Rousing Chorus|buff|holy|aura|buff=as amt=20 dur=15 cd=20 party note=s4', 'Drum Roll|nova|phys|drum|n=3 r=1 stun note=e2',
    'Spotlight|zone|light|flash|r=1.2 dur=5 note=rq', 'Pyro Finale|proj|fire|n_h|exp r=1.2', 'Backup Singers|summon|light|clone|sum=chorus n=2 dur=20 cd=20 note=s2', 'Stage Dive|leap|phys|eruption|r=1.4 dmg=1.3 note=bass',
    'Crescendo Wave|fissure|light|sonic|range=1.5 knock note=q', 'Confetti Bombs|rain|fire|n_e|n=14 r=1.6', 'Curtain Call|curse|light|flash|curse=slow,stun r=1.4 note=rq', 'Mic Drop|aoe|light|eruption|r=1.6 dmg=1.8 cd=4 note=w',
    'Grand Fireworks|rain|fire|n_t8|n=22 r=2 cd=5', 'Tempo Rubato|buff|holy|aura|buff=as,speed amt=35 dur=12 cd=30 party rubato note=treble', 'Amp Overload|chain|light|sonic|n=6 note=e2', 'Spinning Records|orbit|phys|n_w|n=5 dur=6 cd=8',
    'Grand Finale|aoe|fire|nuke|r=2.6 dmg=3 cd=8 note=w', 'Rock Legend|buff|light|transform|buff=dmg,as amt=40 dur=12 cd=40 note=t8', 'Sonic Bulwark|wall|light|sonic|dur=6 cd=6 note=rq', 'Da Capo|nova|arcane|wave|n=2 r=1.6 dacapo cd=6 note=re',
  ],
  slime_lord: [
    'Ooze Slap|melee|acid|smash|free wc=1', 'Primal Glob|proj|acid|blob|exp r=1', 'Gel Coat|buff|acid|shield|buff=armor amt=45 dur=20 cd=25', 'Puddle|zone|acid|slime|r=1.2 dur=6 slow',
    'Cell Split|summon|acid|slime|sum=slimeling n=2 dur=20 cd=15', 'Sludge Wave|fissure|acid|wave|range=1.3', 'Bubble Burst|nova|poison|acid|r=1.2', 'Primordial Leap|leap|acid|eruption|r=1.4 dmg=1.4',
    'Primeval Downpour|rain|acid|blob|n=16 r=1.6', 'Devour Whole|melee|acid|bite|dmg=1.6 leech', 'Prism Slime|summon|light|slime|sum=prismslime n=1 dur=20 cd=20', 'Ooze Orbit|orbit|acid|blob|n=5 dur=6 cd=8',
    'Primordial Soup|zone|acid|acid|r=1.8 dur=6 cd=8', 'Jelly Rampart|wall|acid|slime|block dur=6', 'Slime Comet|aoe|acid|meteor|r=1.8 dmg=1.9 cd=4', 'Corrosive Chain|chain|acid|acid|n=5',
    'Mother of Ooze|summon|acid|slime|sum=motherooze n=1 dur=25 cd=40', 'Primal Form|buff|acid|transform|buff=dmg,armor,res amt=35 dur=15 cd=40', 'Deluge of Slime|rain|acid|meteor|n=14 r=2.2 dur=3 cd=10', 'Big Bang Blob|aoe|acid|nuke|r=2.6 dmg=2.8 cd=8',
  ],
  boomerang_knight: [
    'Gale Rang|proj|phys|rang|free wc=1 bounce=1', 'Twin Chakrams|proj|light|chakram|n=2 spread=30 bounce=2', 'Wind Guard|buff|phys|shield|buff=block amt=25 dur=20 cd=25', 'Tempest Dash|dash|light|wind|range=1.1',
    'Storm Orbit|orbit|light|chakram|n=3 dur=6 cd=6', 'Ricochet Storm|proj|phys|rang|bounce=5', 'Cyclone Catch|cyclone|phys|wind|n=1 dur=4', 'Thunder Return|proj|light|rang|pierce exp',
    'Halo of Rangs|proj|phys|rang|n=8 ring', 'Eye of the Gale|zone|light|storm|r=1.4 dur=5 slow', 'Stormcaller Leap|leap|light|storm|r=1.5 dmg=1.4', 'Spinning Edge|whirl|phys|blade|dur=2.5',
    'Blade Hurricane|cyclone|light|wind|n=4 dur=5 cd=8', 'Lightning Wheel|chain|light|lightning|n=6', 'Gale Knight Stance|buff|light|aura|buff=as,speed amt=35 dur=12 cd=30', 'Orbit Barrage|rain|phys|rang|n=16 r=1.6',
    'Thousand Rangs|proj|phys|rang|n=16 ring dmg=0.9 cd=4', 'Tempest Ascendant|buff|light|transform|buff=dmg,as amt=40 dur=12 cd=40', 'Heart of the Gale|orbit|light|chakram|n=8 dur=8 cd=12', 'Skybreaker|aoe|light|eruption|r=2.4 dmg=2.6 cd=6',
  ],
  lancer: [
    'Radiant Thrust|melee|holy|thrust|free wc=1', 'Lance Beam|beam|holy|laser|dur=1.5 range=0.7', 'Prism Guard|buff|holy|tshield|buff=block,armor amt=25 dur=20 cd=25', 'Shield Disc|proj|holy|disc|bounce=3',
    'Lightspear Charge|dash|holy|charge|range=1.3 knock', 'Sunlance Volley|proj|holy|spear|n=5 spread=40 pierce', 'Holy Bastion|wall|holy|holy|block dur=6', 'Radiant Burst|nova|holy|shock|r=1.2 stun',
    'Lance of Dawn|proj|holy|laser|pierce dmg=2 spd=2', 'Banner of Light|summon|holy|banner|sum=kingbanner n=1 dur=20 cd=25', 'Phalanx Leap|leap|holy|holy|r=1.5 dmg=1.4', 'Spear Rain|rain|holy|spear|n=16 r=1.6',
    'Order of the Sun|summon|holy|knight|sum=kn_chaplain n=2 dur=20 cd=30', 'Prism Spears|orbit|holy|spear|n=5 dur=6 cd=8', 'Radiant Fissure|fissure|holy|holy|range=1.6', 'Sun Pillar|aoe|holy|pillar|r=1.8 dmg=1.9 cd=4',
    'Solar Lancestorm|rain|holy|spear|n=26 r=2.2 dur=3 cd=10', 'Paragon|buff|holy|transform|buff=dmg,armor,block amt=35 dur=15 cd=40', 'Final Lance|beam|holy|laser|dur=3 dmg=1.7 cd=8', 'Judgment Ring|nova|holy|holy|n=3 r=1.6 cd=6',
  ],
  dragon_knight: [
    'Wyrmfire Slash|melee|fire|slash|free wc=1 burn', 'Ember Breath|beam|fire|breath|dur=1.5 cone', 'Scale Ward|buff|fire|shield|buff=armor,res amt=30 dur=20 cd=25', 'Pinion Gust|nova|phys|wind|r=1.1 knock',
    'Wyrm Plunge|leap|fire|eruption|r=1.4 dmg=1.4', 'Cinder Claw|melee|fire|claw|n=3 dmg=0.7', 'Wyrmling Call|summon|fire|dragon|sum=whelp n=2 dur=20 cd=20', 'Magma Wave|fissure|fire|wave|range=1.4',
    'Phoenix Rise|dash|fire|phoenix|range=1.4 exp', 'Dragonfire Rain|rain|fire|meteor|n=14 r=1.6', 'Searing Roar|curse|fire|shout|curse=amp,slow r=1.4', 'Flame Orbit|orbit|fire|fireball|n=4 dur=6 cd=8',
    'Wyvern Ally|summon|fire|dragon|sum=wyvern n=1 dur=25 cd=30', 'Inferno Spiral|proj|fire|fireball|n=10 ring', 'Dragon Heart|buff|fire|aura|buff=dmg,leech amt=30 dur=12 cd=30', 'Molten Pillar|aoe|fire|pillar|r=1.8 dmg=1.9 cd=4',
    'Elder Wyrm Call|summon|fire|dragon|sum=elderwyrm n=1 dur=25 cd=45', 'Ascendant Wyrmform|buff|fire|transform|buff=dmg,armor,as amt=40 dur=15 cd=45', 'Dragonstorm|rain|fire|meteor|n=22 r=2.4 dur=3 cd=10', 'Cataclysm Breath|beam|fire|breath|dur=3 dmg=1.6 cone cd=8',
  ],
  gunner: [
    'Heavy Round|proj|phys|bullet|free wc=1 pierce', 'Incendiary Shell|proj|fire|rocket|exp r=1.1 burn', 'Flak Vest|buff|phys|shield|buff=armor amt=45 dur=20 cd=25', 'Concussion Grenade|aoe|phys|bomb|r=1.2 stun delay=0.4',
    'Gatling Burst|proj|phys|bullet|n=8 rand dmg=0.55', 'Cryo Shell|proj|cold|shard|exp r=1.2 freeze', 'Mortar Team|summon|fire|turret|sum=rocketturret n=1 dur=15 cd=12', 'Shock Mine|trap|light|mine|n=3',
    'Howitzer Volley|proj|fire|rocket|n=6 spread=50 exp', 'Rail Shot|beam|light|laser|dur=1.2 dmg=1.4 cd=3', 'Drone Swarm|summon|light|drone|sum=drone n=3 dur=15 cd=20', 'Napalm Strip|fissure|fire|fire|range=1.5',
    'Saturation Bombing|rain|fire|bomb|n=18 r=1.8 cd=4', 'Tesla Grid|summon|light|tesla|sum=tesla n=2 dur=15 cd=15', 'Overclocked Rounds|buff|light|aura|buff=as,crit amt=35 dur=12 cd=30', 'Cluster Rockets|proj|fire|rocket|split n=3 spread=30 exp',
    'Kinetic Lance|aoe|light|nuke|r=2.6 dmg=3 delay=1 cd=8', 'War Machine|summon|fire|mech|sum=mech n=1 dur=25 cd=45', 'Thermite Rain|rain|fire|meteor|n=22 r=2.2 dur=3 cd=10', 'Annihilator Beam|beam|light|laser|dur=3 dmg=1.7 cd=8',
  ],
};
