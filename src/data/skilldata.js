import { TREE4 } from './skilltrees4.js';
// 16 classes x 3 trees x 20 skills = 960 skills, plus Necromancer's Skeletal Legion and Dragoon's Spearstorm trees: 1000.
// Each line: "Name|kind|element|fx|mods"
// Tree layout is 5 rows x 4 columns; each column is a prerequisite chain.
// Row level requirements: 1, 6, 12, 20, 30.
// kinds: melee proj nova aoe beam chain wall zone orbit cyclone whirl leap dash blink
//        summon buff curse heal trap rain strike fissure corpse
export const SKILLDATA = {
  paladin: [
    [
      'Smite|melee|holy|smash|free wc=1', 'Holy Bolt|proj|holy|bolt|', 'Blessed Light|heal|holy|light|amt=15 cd=6', 'Radiant Spark|chain|holy|spirit|n=3',
      'Blessed Hammer|orbit|holy|hammer|spiral n=1 dur=2.5', 'Sacred Lance|proj|holy|spear|pierce spd=1.4', 'Consecration|zone|holy|holy|r=1.2 dur=5', 'Divine Strike|strike|holy|holy|n=1',
      'Hammerstorm|orbit|holy|hammer|spiral n=3 dur=2.5', 'Fist of the Heavens|strike|holy|lightning|n=3', 'Sanctuary|zone|holy|holy|follow heal dur=8 cd=12', 'Judgment Beam|beam|holy|holy|range=1.2',
      'Wheel of Hammers|orbit|holy|hammer|n=6 dur=6 cd=8', "Heaven's Wrath|rain|holy|star|n=14 r=1.4", 'Purifying Nova|nova|holy|holy|r=1.4', "Seraph's Gaze|beam|holy|laser|dur=2 cd=6",
      'Hammer of the Gods|aoe|holy|pillar|r=2 dmg=2.2 cd=4', 'Apocalypse of Light|strike|holy|holy|n=8 cd=8', 'Divine Intervention|buff|holy|shield|buff=armor,res amt=60 dur=8 cd=30', "Archon's Radiance|nova|holy|holy|n=4 r=1.6 cd=6",
    ],
    [
      'Shield Bash|melee|phys|smash|knock stun arc=70', 'Holy Shield|buff|holy|shield|buff=armor amt=40 dur=20 cd=25', 'Rally Banner|summon|holy|banner|sum=banner dur=20 cd=20', 'Defiance|buff|phys|shield|buff=res amt=25 dur=20 cd=25',
      'Charge|dash|holy|charge|range=1.2 knock', 'Vengeance Aura|buff|fire|aura|buff=thorns amt=40 dur=30 cd=30 pulse', 'Bulwark Slam|nova|phys|shock|r=0.8 stun', 'Guardian Angel|summon|holy|spirit|sum=guardian n=1 dur=20 cd=25',
      'Righteous Fire Aura|buff|fire|aura|pulse buff=dmg amt=10 dur=30 cd=30', 'Shield Throw|proj|holy|disc|bounce=4', 'Holy Freeze Aura|buff|cold|aura|pulse slow buff=armor amt=10 dur=30 cd=30', 'Avenging Charge|dash|holy|charge|range=1.5 exp',
      'Aegis|buff|holy|shield|buff=block amt=30 dur=15 cd=30', 'Conviction|curse|holy|sigil|curse=amp r=1.6 at=self', 'Martyrdom|nova|blood|holy|r=1.5 dmg=1.8', "Crusader's Leap|leap|holy|holy|range=1.2 r=1.3",
      'Divine Shield Nova|nova|holy|shield|n=3 stun', 'Fanaticism|buff|holy|aura|buff=as,dmg amt=30 dur=20 cd=40 party', 'Bastion|wall|holy|holy|block len=1.5 dur=8', "Champion's Call|summon|holy|guardian|sum=guardian n=3 dur=25 cd=40",
    ],
    [
      'Zealous Strike|melee|phys|slash|n=2', 'Sacrifice|melee|blood|slash|dmg=1.6 leech', 'Holy Fire|melee|fire|smash|burn exp', 'Sweep|melee|phys|spin|arc=360 r=1.1',
      'Zeal|melee|phys|slash|n=5 dmg=0.6', 'Vengeance|melee|light|smash|exp', 'Thunder Strike|melee|light|smash|chain=3', 'Cleansing Blade|melee|holy|slash|cleave',
      "Crusader's Flurry|melee|holy|slash|n=7 dmg=0.55", 'Elemental Wrath|melee|cold|smash|exp freeze', 'Sword of Justice|proj|holy|blade|n=3 spread=30 pierce', "Templar's Whirl|whirl|holy|blade|dur=2",
      'Blade Barrage|proj|holy|blade|n=7 spread=70', 'Valkyrie Strike|leap|holy|holy|r=1.5 dmg=1.6', 'Inquisition|curse|fire|sigil|curse=decay r=1.2', 'Swords of Light|orbit|holy|blade|n=4 dur=8 cd=10',
      'Final Judgment|melee|holy|smash|dmg=3 exp r=1.5 cd=3', 'Storm of Swords|rain|holy|blade|n=20 r=1.6', 'Crusade|buff|holy|aura|buff=dmg,speed amt=35 dur=12 cd=30', "Heaven's Edge|fissure|holy|holy|range=1.4",
    ],
  ],
  ranger: [
    [
      'Quick Shot|proj|phys|arrow|free wc=1', 'Piercing Arrow|proj|phys|arrow|pierce spd=1.4', 'Multishot|proj|phys|arrow|n=5 spread=40', 'Fire Arrow|proj|fire|arrow|exp burn',
      'Guided Arrow|proj|phys|arrow|home dmg=1.3', 'Strafe|proj|phys|arrow|n=8 rand dmg=0.6', 'Ice Arrow|proj|cold|arrow|freeze', 'Explosive Shot|proj|fire|arrow|exp r=1.3',
      'Rain of Arrows|rain|phys|arrow|n=20 r=1.3', 'Ricochet Shot|proj|phys|arrow|bounce=4', 'Frost Volley|proj|cold|arrow|n=7 spread=60 slow', 'Lightning Arrow|proj|light|arrow|chain=4',
      'Arrow Storm|rain|light|arrow|n=30 r=1.6 cd=4', 'Penetrating Volley|proj|phys|arrow|n=5 spread=30 pierce dmg=1.3', 'Split Arrow|proj|phys|arrow|split n=3 spread=20', 'Immolation Arrow|proj|fire|arrow|exp lob r=1.4',
      'Hail of Arrows|rain|cold|arrow|n=40 r=2 cd=5', 'Dead Eye|proj|phys|arrow|pierce dmg=3.5 spd=2 cd=2', 'Phantom Barrage|proj|arcane|arrow|n=12 ring', 'Starfall Arrow|aoe|light|meteor|r=2 dmg=2.5 cd=4',
    ],
    [
      'Hawk Companion|summon|phys|bird|sum=hawk max=1', 'Thornlash|melee|poison|claw|poison', 'Wolf Pack|summon|phys|wolf|sum=wolf n=2 max=4', "Nature's Mend|heal|poison|light|amt=20 cd=8",
      'Vine Wall|wall|poison|thorn|dur=6 slow', 'Poison Arrow|proj|poison|arrow|poison', 'Bear Spirit|summon|phys|bear|sum=bear max=1 cd=15', 'Barkskin|buff|phys|shield|buff=armor amt=50 dur=20 cd=25',
      'Briar Patch|zone|poison|thorn|r=1.3 dur=6 slow', 'Plague Arrow|proj|poison|arrow|exp poison r=1.5', 'Spirit Wolves|summon|cold|spiritwolf|sum=spiritwolf n=3 dur=20 cd=20', 'Gale|cyclone|phys|wind|n=1 dur=4',
      'Twister Volley|cyclone|phys|wind|n=3', 'Hawk Talons|summon|light|bird|sum=stormhawk n=3 dur=20 cd=20', 'Entangle|curse|poison|thorn|curse=slow,stun r=1.4', 'Wild Stampede|fissure|phys|earth|range=1.5 knock',
      'Hurricane|cyclone|cold|wind|n=6 dur=6 cd=10', 'Alpha Wolf|summon|blood|wolf|sum=direwolf max=1 cd=30', 'Thornstorm|nova|poison|thorn|n=3 r=1.5', 'Wrath of the Wild|buff|poison|aura|buff=dmg,as amt=40 dur=12 cd=40 party',
    ],
    [
      'Spike Trap|trap|phys|spike|n=1', 'Smoke Bomb|curse|shadow|smoke|curse=slow r=1.1', 'Caltrops|zone|phys|spike|r=1 dur=6 slow', 'Tumble|dash|phys|wind|range=0.8',
      'Fire Trap|trap|fire|fire|n=2', 'Net Shot|proj|phys|blob|stun', 'Frost Trap|trap|cold|frost|freeze', 'Snare|curse|phys|thorn|curse=slow r=1.2',
      'Lightning Sentry|summon|light|tesla|sum=sentry max=2 dur=15 cd=8', 'Bear Trap|trap|blood|bear|stun dmg=1.8', 'Cluster Trap|trap|fire|bomb|n=4', 'Vanish|blink|shadow|smoke|range=1.2',
      'Death Sentry|summon|fire|tesla|sum=deathsentry max=1 dur=15 cd=10', 'Rune Field|trap|arcane|rune|n=6', 'Mark for Death|curse|blood|sigil|curse=mark amt=50 r=0.8', 'Evasion|buff|phys|wind|buff=speed,crit amt=35 dur=10 cd=20',
      'Minefield|trap|fire|mine|n=10 r=1.5 cd=6', 'Shadow Clones|summon|shadow|clone|sum=clone n=2 dur=12 cd=25', 'Chain Sentry|summon|light|tesla|sum=chainsentry n=2 dur=15 cd=15', "Huntress' Fury|rain|phys|arrow|n=50 r=1.8 dur=3 cd=10",
    ],
  ],
  wizard: [
    [
      'Fire Bolt|proj|fire|fireball|free wc=0.6', 'Inferno|beam|fire|flame|dur=1.5 range=0.5', 'Fireball|proj|fire|fireball|exp r=1.2', 'Blaze|zone|fire|fire|follow dur=6 cd=8',
      'Fire Wall|wall|fire|fire|dur=5', 'Flame Spiral|proj|fire|orb|n=8 ring', 'Combustion|aoe|fire|explosion|r=1.3 delay=0.5', 'Firestorm|fissure|fire|fire|range=1.2',
      'Meteor|aoe|fire|meteor|r=1.6 delay=1 dmg=2 burn', 'Hydra|summon|fire|hydra|sum=hydra max=2 dur=12 cd=6', 'Fire Nova|nova|fire|fire|r=1.3', "Dragon's Breath|beam|fire|breath|dur=2 cone",
      'Pyroclasm|aoe|fire|eruption|n=6 r=0.9 dur=2', 'Flame Tornado|cyclone|fire|fire|n=2', 'Living Bomb|curse|fire|sigil|curse=bomb r=1.0', 'Phoenix Strike|dash|fire|fire|range=1.4 exp',
      'Meteor Shower|rain|fire|meteor|n=10 r=2 dur=3 cd=8', 'Armageddon|buff|fire|aura|pulse buff=dmg amt=20 dur=10 cd=30', 'Inferno Ring|wall|fire|fire|ring dur=6', 'Sunbeam|beam|fire|laser|dur=2.5 dmg=1.3 cd=5',
    ],
    [
      'Ice Bolt|proj|cold|shard|slow', 'Frost Nova|nova|cold|frost|freeze', 'Frozen Armor|buff|cold|shield|buff=armor amt=45 dur=30 cd=30', 'Ice Shards|proj|cold|shard|n=5 spread=30',
      'Glacial Spike|proj|cold|spear|exp freeze', 'Ice Wall|wall|cold|ice|block dur=6', 'Frost Field|zone|cold|frost|r=1.3 dur=6 slow', 'Shiver Armor|buff|cold|shield|buff=thorns amt=50 dur=30 cd=30',
      'Blizzard|aoe|cold|blizzard|r=1.8 dur=4 cd=2', 'Frozen Orb|proj|cold|orb|spray spd=0.5', 'Ice Lance|proj|cold|spear|pierce dmg=1.4', 'Cold Snap|curse|cold|frost|curse=slow freeze r=1.5 at=self',
      'Ice Storm|rain|cold|ice|n=20 r=1.8', 'Frost Spikes|fissure|cold|ice|range=1.4', 'Glacier|aoe|cold|eruption|r=2 dmg=2 freeze cd=4', 'Comet|aoe|cold|meteor|r=1.5 delay=0.9 dmg=2.2',
      'Absolute Zero|nova|cold|frost|r=2.2 n=2 freeze cd=8', 'Frozen Orb Barrage|proj|cold|orb|n=3 spray spread=60 cd=4', 'Ice Golem|summon|cold|golem|sum=icegolem max=1 cd=20', 'Cryo Beam|beam|cold|laser|dur=2.5 freeze cd=5',
    ],
    [
      'Charged Bolt|proj|light|spark|n=5 rand spd=0.8', 'Static Field|nova|light|lightning|r=1', 'Telekinesis|proj|arcane|orb|knock stun', 'Teleport|blink|light|lightning|range=1.5 cd=1',
      'Lightning|beam|light|lightning|range=1.2', 'Chain Lightning|chain|light|lightning|n=5', 'Thunder Clap|nova|light|lightning|stun r=1.1', 'Ball Lightning|proj|light|orb|pierce spd=0.6 r=1.5',
      'Thunderstorm|summon|light|cloud|sum=stormcloud max=1 dur=15 cd=15', 'Lightning Nova|nova|light|lightning|r=1.5', 'Energy Shield|buff|arcane|shield|buff=res,armor amt=40 dur=30 cd=30', 'Shock Wave|fissure|light|shock|range=1.3',
      'Storm Lances|strike|light|lightning|n=5', 'Tesla Coil|summon|light|tesla|sum=tesla max=2 dur=15 cd=10', 'Arc Field|zone|light|storm|r=1.5 dur=5', 'Overload|buff|light|aura|pulse buff=as amt=30 dur=12 cd=25',
      'Tempest|cyclone|light|storm|n=4 dur=6 cd=8', "Thor's Hammer|aoe|light|pillar|r=2.2 dmg=2.6 cd=4", 'Lightning Mastery|buff|light|aura|buff=crit,dmg amt=40 dur=15 cd=40', 'Hand of Zeus|strike|light|lightning|n=12 r=1.5 cd=8',
    ],
  ],
  necromancer: [
    [
      'Bone Spike|proj|phys|bone|free wc=0.6', 'Teeth|proj|shadow|tooth|n=5 spread=40', 'Bone Armor|buff|phys|bone|buff=armor amt=60 dur=30 cd=30', 'Blood Drain|beam|blood|drain|leech range=0.7',
      'Bone Spear|proj|phys|spear|pierce dmg=1.3', 'Bone Wall|wall|phys|bone|block dur=8', 'Corpse Explosion|corpse|fire|gore|n=3 r=1.2', 'Blood Nova|nova|blood|blood|leech',
      'Bone Spirit|proj|shadow|skull|home dmg=1.6', 'Bone Prison|curse|phys|bone|curse=stun r=1 dur=3', 'Blood Lance|proj|blood|spear|pierce leech', 'Bone Spikes|fissure|phys|bone|range=1.3',
      'Bone Storm|orbit|phys|bone|n=8 dur=6 cd=10', 'Blood Boil|aoe|blood|eruption|r=1.5', 'Spirit Barrage|proj|shadow|skull|n=6 home spread=90', 'Corpse Lance|corpse|phys|bone|n=5 r=1.5',
      'Bone Apocalypse|rain|phys|bone|n=30 r=2 cd=6', 'Exsanguinate|nova|blood|blood|r=2 leech n=2 cd=6', 'Death Laser|beam|shadow|laser|dur=3 dmg=1.4 cd=6', 'Grim Harvest|corpse|shadow|gore|n=10 r=2.2',
    ],
    [
      'Raise Skeleton|summon|phys|skeleton|sum=skeleton n=1 max=6', 'Clay Golem|summon|phys|golem|sum=claygolem max=1', 'Skeletal Archer|summon|phys|skeleton|sum=skelarcher max=4', 'Dark Pact|buff|shadow|aura|buff=dmg amt=20 dur=30 party cd=30',
      'Skeletal Mage|summon|cold|skeleton|sum=skelmage max=4', 'Blood Golem|summon|blood|golem|sum=bloodgolem max=1', 'Revive|summon|shadow|revive|sum=revive n=1 max=3', 'Bone Ward|buff|phys|bone|buff=armor amt=30 party dur=30 cd=30',
      'Iron Maiden|curse|blood|sigil|curse=thorns r=1.4', 'Fire Golem|summon|fire|golem|sum=firegolem max=1', 'Ghoul Horde|summon|poison|ghoul|sum=ghoul n=3 dur=20 cd=15', 'Unholy Command|buff|shadow|aura|buff=as,speed amt=30 party dur=15 cd=25',
      'Army of the Dead|summon|shadow|skeleton|sum=skeleton n=6 dur=15 cd=30', 'Bone Colossus|summon|phys|golem|sum=bonecolossus max=1 cd=30', 'Soul Harvest|corpse|shadow|spirit|n=6 heal', 'Lich Form|buff|cold|transform|transform buff=dmg,res amt=40 dur=15 cd=40',
      'Legion|summon|shadow|skeleton|sum=deathknight n=4 dur=20 cd=40', 'Necrotic Bloom|corpse|poison|plague|n=8 r=2', 'Wraith Host|summon|shadow|wraith|sum=wraith n=4 dur=20 cd=30', 'Master of Death|buff|shadow|aura|buff=dmg,as amt=50 party dur=15 cd=45',
    ],
    [
      'Amplify Damage|curse|shadow|sigil|curse=amp r=1', 'Poison Dagger|melee|poison|slash|poison', 'Weaken|curse|shadow|sigil|curse=weaken', 'Life Tap|curse|blood|sigil|curse=leech',
      'Poison Nova|nova|poison|poison|poison', 'Terror|curse|shadow|sigil|curse=fear at=self', 'Plague Cloud|zone|poison|poison|r=1.3 dur=6', 'Decrepify|curse|shadow|sigil|curse=slow,weaken',
      'Confuse|curse|shadow|sigil|curse=confuse', 'Toxic Burst|aoe|poison|explosion|r=1.4 poison', 'Lower Resist|curse|arcane|sigil|curse=amp amt=40', 'Plague Spear|proj|poison|spear|pierce poison exp',
      'Pestilence|zone|poison|poison|follow r=1.5 dur=10 cd=15', 'Bone Curse|curse|phys|bone|curse=decay r=1.4', 'Blight Wave|fissure|poison|plague|range=1.5', 'Soul Rend|chain|shadow|spirit|n=6 leech',
      'Plague Apocalypse|rain|poison|acid|n=30 r=2 cd=6', "Death's Embrace|curse|shadow|sigil|curse=amp,slow,fear r=2 at=self cd=10", 'Contagion|nova|poison|poison|n=3 r=1.8 cd=6', 'Doom|curse|shadow|sigil|curse=doom r=0.8 dmg=4 cd=8',
    ],
    // Skeletal Legion: a 4th tree, one skill per skeleton the user drew (src/data/summons.js, docs/ENEMY_ART.md)
    [
      'Skeletal Reaver|summon|phys|skeleton|sum=reaver max=3', 'Skeletal Crossbowman|summon|phys|skeleton|sum=crossbowman max=3', 'Skeletal Pyromancer|summon|fire|skeleton|sum=pyromancer max=3', 'Mend Bones|heal|shadow|bone|amt=12 party cd=6',
      'Skeletal Spearman|summon|phys|skeleton|sum=spearman max=3', 'Coffin Guard|summon|phys|skeleton|sum=coffinguard max=2', 'Skeletal Plaguecaller|summon|poison|skeleton|sum=plaguecaller max=3', 'Bone Bishop|summon|holy|skeleton|sum=bishop max=1',
      'Chained Jailer|summon|phys|skeleton|sum=jailer max=2', 'Gravedigger|summon|phys|skeleton|sum=gravedigger max=2', 'Skeletal Stormcaller|summon|light|skeleton|sum=stormcaller max=3', 'Knell Ringer|summon|shadow|skeleton|sum=bellringer max=2',
      'Ramskull Berserker|summon|phys|skeleton|sum=berserker max=2', 'Bone Standard-Bearer|summon|phys|skeleton|sum=standard max=1', 'Pyre Inquisitor|summon|fire|skeleton|sum=pyreknight max=2', 'Thornbone Druid|summon|poison|skeleton|sum=druid max=2',
      'Reaper King|summon|shadow|skeleton|sum=reaperking max=1 cd=10', 'Grave Warband|summon|phys|skeleton|sum=warband n=5 dur=20 cd=30', 'Skeletal Archlich|summon|shadow|skeleton|sum=archlich max=1 cd=10', 'Conclave of Bones|summon|shadow|skeleton|sum=conclave n=4 dur=20 cd=35',
    ],
  ],
  barbarian: [
    [
      'Bash|melee|phys|smash|free wc=1.1 knock', 'Double Swing|melee|phys|slash|n=2', 'Frenzy|melee|phys|slash|n=3 dmg=0.7', 'Leap|leap|phys|smash|range=0.9',
      'Whirlwind|whirl|phys|blade|dur=12 r=1.35 suck=0.35', 'Berserk|melee|shadow|slash|dmg=1.8', 'Leap Attack|leap|phys|smash|range=1.4 dmg=1.6', 'Double Throw|proj|phys|axe|n=2 spread=15 ret',
      'Cleave|melee|phys|slash|cleave arc=200 dmg=1.3', 'Rampage|whirl|blood|blade|dur=12 r=1.5 leech suck=0.7', 'Ground Breaker|melee|phys|smash|exp r=1.4 stun', 'Axe Storm|proj|phys|axe|n=5 spread=60 ret',
      'Bloodlust|buff|blood|aura|buff=as,leech amt=30 dur=12 cd=25', 'Furious Charge|dash|phys|charge|range=2 knock', 'Executioner|melee|blood|slash|dmg=3 cd=1.5', 'Razor Cyclones|cyclone|phys|wind|n=3 r=1.1 dur=5 cd=8',
      'Annihilate|melee|phys|smash|dmg=4 r=1.6 exp cd=4', 'Eternal Whirlwind|whirl|phys|blade|dur=12 cd=2 r=1.8 suck=1.1 lightning tornado=2', 'Wrath of the Berserker|buff|blood|transform|transform buff=dmg,as,speed amt=50 dur=15 cd=45', 'Thousand Cuts|melee|phys|slash|n=12 dmg=0.4 cd=3',
    ],
    [
      'Howl|curse|phys|shout|curse=fear at=self r=1.2', 'Shout|buff|phys|shout|buff=armor amt=50 dur=30 cd=30 party', 'Taunt|curse|phys|shout|curse=amp at=self amt=20', 'Find Potion|heal|phys|light|amt=25 cd=15',
      'Battle Cry|curse|phys|shout|curse=weaken,amp at=self r=1.4', 'War Cry|nova|phys|shock|stun r=1.2', 'Battle Orders|buff|phys|shout|buff=life amt=35 dur=30 cd=30 party', 'Grim Ward|summon|phys|totem|sum=grimward dur=15 cd=20',
      'Battle Command|buff|phys|shout|buff=dmg amt=25 dur=30 cd=30 party', 'Thunder Shout|nova|light|lightning|r=1.5', 'Iron Skin|buff|phys|shield|buff=armor,res amt=40 dur=20 cd=30', 'Ancestral Call|summon|phys|ancient|sum=ancient n=1 dur=20 cd=30',
      'Earsplitter|nova|phys|sonic|r=1.8 stun', 'Rallying Cry|heal|phys|light|amt=40 party cd=20', 'Intimidate|curse|shadow|shout|curse=fear,weaken at=self r=2', "Ancients' Fury|summon|phys|ancient|sum=ancient n=3 dur=20 cd=45",
      "Warlord's Roar|nova|blood|sonic|r=2.4 n=2 dmg=2 cd=6", 'Undying Rage|buff|blood|aura|buff=regen,armor amt=60 dur=10 cd=60', 'Call of the Ancients|summon|light|ancient|sum=ancientstorm n=3 dur=25 cd=60', 'Battle Trance|buff|phys|aura|buff=as,crit amt=40 dur=15 cd=40 party',
    ],
    [
      'Ground Slam|nova|phys|shock|r=0.8', 'Stomp|melee|phys|smash|stun arc=360 r=0.9', 'Rock Throw|proj|phys|rock|lob exp', 'Seismic Step|dash|phys|charge|range=1.3 knock',
      'Fissure|fissure|phys|earth|range=1.2', 'Earthquake|aoe|phys|eruption|r=2 dur=3 rage=25 cd=5', 'Boulder Toss|proj|phys|rock|lob exp r=1.5 dmg=1.5', 'Tremor|nova|phys|shock|n=2 slow',
      'Seismic Slam|fissure|phys|earth|range=1.4 dmg=1.3', 'Avalanche|rain|phys|rock|n=10 r=1.6', 'Stone Skin|buff|phys|shield|buff=armor amt=80 dur=20 cd=30', 'Magma Rift|fissure|fire|fire|range=1.4 burn',
      'Earthen Spikes|nova|phys|earth|r=1.6', 'Mountain Vortex|cyclone|phys|wind|n=3 r=1.3 dur=5 cd=8', 'Landslide|fissure|phys|earth|n=3 spread=50', 'Volcanic Eruption|aoe|fire|eruption|n=6 r=1 dur=3 cd=4',
      'Cataclysm|aoe|fire|eruption|r=3 dmg=3 cd=8', 'Mountain King|buff|phys|transform|transform buff=armor,dmg amt=50 dur=20 cd=45', 'Ancestral Storm|cyclone|light|storm|n=4 r=1.4 dur=6 cd=6', 'Worldsplitter|fissure|phys|earth|range=2.5 dmg=2.5 cd=4',
    ],
  ],
  dragoon: [
    [
      'Lance Jab|melee|phys|thrust|free wc=1.1 range=1.3', 'Twin Thrust|melee|phys|thrust|n=2 range=1.3', 'Sweeping Lance|melee|phys|slash|arc=200', 'Piercing Thrust|melee|phys|thrust|range=1.8 dmg=1.3',
      'Spiral Lance|proj|phys|spear|pierce spd=1.4', 'Impale|melee|blood|thrust|bleed dmg=1.6', 'Lance Flurry|melee|phys|thrust|n=6 dmg=0.55 range=1.3', 'Wind Lance|proj|phys|wave|pierce',
      'Dragon Fang|melee|fire|thrust|exp dmg=1.6', 'Hundred Spears|proj|phys|spear|n=6 spread=40', 'Cross Thrust|melee|light|thrust|n=2 chain=3', 'Lance Barrier|orbit|phys|spear|n=4 dur=6 cd=10',
      'Skewer|dash|phys|charge|range=1.4 dmg=1.5', 'Spear Rain|rain|phys|javelin|n=16 r=1.5', 'Gungnir|proj|light|spear|pierce dmg=2.4 cd=2', 'Vortex Lance|cyclone|phys|blade|n=1 r=1.4 dur=4',
      'Thousand Lances|rain|phys|javelin|n=40 r=2 cd=6', 'Dragon Lance|proj|fire|dragon|pierce dmg=2.8 cd=3', 'Lance of Longinus|beam|holy|laser|dur=2 dmg=1.4 cd=6', 'Infinite Thrust|melee|phys|thrust|n=15 dmg=0.4 range=1.6 cd=3',
    ],
    [
      'Jump|leap|phys|smash|range=1.1', 'Wind Step|dash|phys|wind|range=0.9', 'Aerial Strike|leap|phys|smash|dmg=1.4', 'Feather Fall|buff|phys|wind|buff=speed amt=25 dur=20 cd=25',
      'Dragon Dive|leap|fire|dragon|range=1.4 dmg=1.6', 'Gale Slash|proj|phys|wave|n=3 spread=30', 'High Jump|leap|phys|smash|range=1.6 r=1.3 cd=2', 'Updraft|cyclone|phys|wind|n=1',
      'Comet Dive|leap|fire|meteor|dmg=2 r=1.5 cd=3', 'Skyward Sweep|nova|phys|wind|r=1.3 knock', 'Stardive|leap|arcane|star|dmg=1.8 r=1.4 cd=2.5', 'Falcon Rush|dash|phys|wind|range=1.5 n=2',
      'Meteor Lance|aoe|fire|meteor|r=1.5 delay=0.7 dmg=2.2', 'Storm Dive|leap|light|lightning|r=1.6 dmg=2 cd=3', 'Sky Splitter|fissure|phys|wind|range=1.6', 'Tailwind|buff|phys|wind|buff=as,speed amt=35 dur=15 cd=25',
      'Dragonfall|leap|fire|dragon|r=2.4 dmg=3.2 cd=6', 'Heavenly Spears|strike|holy|spear|n=10 cd=6', 'Cyclone Dive|leap|phys|wind|r=2 dmg=2.4 cd=4 nova', 'Wings of the Wyrm|buff|fire|transform|transform buff=dmg,speed amt=45 dur=15 cd=45',
    ],
    [
      'Dragon Breath|beam|fire|breath|dur=1 cone', 'Wyrm Scale|buff|fire|shield|buff=armor,res amt=30 dur=30 cd=30', 'Blood Pact|buff|blood|aura|buff=leech amt=8 dur=20 cd=25', 'Ember Spit|proj|fire|fireball|n=3 spread=20',
      'Wyvern Spirit|summon|fire|dragon|sum=wyvern max=1 dur=20 cd=20', 'Frost Breath|beam|cold|breath|dur=1.5 cone slow', 'Draconic Roar|curse|fire|shout|curse=fear at=self', 'Flame Lash|melee|fire|slash|arc=180 burn',
      'Storm Breath|beam|light|breath|dur=1.5 cone', 'Wyrmfire Pool|zone|fire|fire|r=1.4 dur=6', 'Blood Frenzy|buff|blood|aura|buff=as amt=35 dur=15 cd=25', 'Drake Whelps|summon|fire|dragon|sum=whelp n=3 dur=20 cd=20',
      'Venom Breath|beam|poison|breath|dur=2 cone poison', 'Dragon Heart|buff|fire|aura|buff=regen,dmg amt=30 dur=20 cd=40', 'Wyrm Coil|orbit|fire|dragon|n=2 dur=8 cd=12', 'Inferno Breath|beam|fire|breath|dur=2.5 cone dmg=1.4 cd=4',
      'Elder Wyrm|summon|fire|dragon|sum=elderwyrm max=1 dur=25 cd=60', 'Prismatic Breath|beam|arcane|breath|dur=3 cone dmg=1.6 cd=5', 'Bloodfire Nova|nova|blood|fire|r=2.2 leech cd=5', 'Dragonsoul|buff|fire|transform|transform buff=dmg,armor,res amt=50 dur=20 cd=60',
    ],
    // Spearstorm: a full fourth tree. All 60 original Dragoon IDs stay stable.
    [
      'Thousandfold Impalement|aoe|phys|spear|barrage=1 r=1.55 dmg=3 wc=0 cd=8', 'Triune Spearfall|aoe|phys|spear|barrage=3 r=1.55 dmg=4.5 wc=0 cd=14', 'Spearstep|dash|phys|charge|range=1.3 dmg=1.1 cd=2 weave', 'Rallying Standard|buff|phys|aura|buff=as,speed amt=22 dur=12 cd=24 weave',
      'Pinning Volley|rain|phys|javelin|n=12 r=1.35 slow cd=4', 'Storm of Barbs|nova|light|lightning|r=1.25 n=2 cd=6', 'Vaulting Reprisal|leap|phys|smash|range=1.4 dmg=1.7 cd=2', 'Wyrmblood Momentum|buff|fire|aura|buff=dmg,speed amt=25 dur=12 cd=24',
      'Spear Vortex|cyclone|phys|blade|n=2 dur=3.5 r=1.3 cd=6', 'Crimson Impact|aoe|blood|eruption|r=2 bleed dmg=2 cd=7', 'Falling Stars|rain|arcane|star|n=14 r=1.6 cd=7', 'Phalanx Breaker|dash|phys|charge|range=1.7 dmg=2 cd=4',
      'Impaler Spiral|orbit|phys|spear|n=6 dur=6 cd=10', 'Thunderhead Pierce|strike|light|lightning|n=8 cd=8', 'Sunfall Lance|leap|fire|meteor|r=1.8 dmg=2.5 cd=5', 'Fury of the Nine|buff|fire|transform|buff=crit,dmg amt=32 dur=15 cd=40',
      'Sovereign Spearstorm|rain|phys|javelin|n=40 r=2.2 cd=8', 'Heavenbreaker|aoe|holy|star|r=2.7 dmg=3.5 cd=10', 'Cataclysm Descent|leap|fire|dragon|r=2.2 dmg=3.3 cd=6', 'Aegis of the Wyrm|buff|fire|shield|buff=armor,res amt=50 dur=15 cd=35',
    ],
  ],
  totem_master: [
    [
      'Spirit Strike|melee|phys|smash|free wc=1', 'Searing Totem|summon|fire|totem|sum=totem_fire max=2', 'Healing Totem|summon|holy|totem|sum=totem_heal max=1 cd=10', 'Stoneclaw Totem|summon|phys|totem|sum=totem_stone max=1 cd=8',
      'Storm Totem|summon|light|totem|sum=totem_storm max=2', 'Frost Totem|summon|cold|totem|sum=totem_frost max=2', 'Windfury Totem|summon|phys|totem|sum=totem_wind max=1 cd=15', 'Totem Slam|aoe|phys|eruption|r=1.2',
      'Magma Totem|summon|fire|totem|sum=totem_magma max=2', 'Venom Totem|summon|poison|totem|sum=totem_poison max=2', 'Spirit Link Totem|summon|holy|totem|sum=totem_link max=1 cd=20', 'Totemic Recall|nova|arcane|spirit|r=1.4',
      'Thunderhead Totem|summon|light|totem|sum=totem_thunder max=2', 'Ancestral Pillar|summon|holy|totem|sum=totem_pillar max=1 cd=20', 'Totem Barrage|proj|phys|totem|n=3 spread=40 lob exp', 'Earthbind Totem|summon|phys|totem|sum=totem_earthbind max=1 cd=15',
      'Grand Totem|summon|arcane|totem|sum=totem_grand max=1 cd=30', 'Totemic Mastery|buff|arcane|aura|buff=dmg amt=40 party dur=20 cd=40', 'Volcano Totem|summon|fire|totem|sum=totem_volcano max=1 cd=20', 'Pantheon|summon|light|totem|sum=totem_storm n=4 dur=15 cd=40',
    ],
    [
      'Spirit Wolf|summon|phys|spiritwolf|sum=spiritwolf max=3', 'Ancestral Bolt|proj|holy|spirit|home', 'Spirit Shield|buff|holy|shield|buff=armor amt=40 dur=30 cd=30', 'Hex|curse|shadow|sigil|curse=slow,weaken',
      'Ghost Wolves|proj|cold|wolf|n=3 spread=40 pierce', 'Ancestral Guardian|summon|holy|ancient|sum=guardian max=2', 'Spirit Walk|blink|holy|spirit|range=1.2', 'Soul Link|buff|holy|aura|buff=regen amt=30 dur=20 party cd=30',
      'Ancestral Swarm|proj|holy|spirit|n=8 home spread=120', 'Spirit Bear|summon|holy|bear|sum=spiritbear max=1 cd=15', 'Haunt|curse|shadow|spirit|curse=decay,fear', 'Rebirth|heal|holy|light|amt=50 cd=30',
      'Spirit Chain|chain|holy|spirit|n=7', 'Ancestral Hammer|orbit|holy|hammer|n=3 spiral', 'Wolf Pack Alpha|summon|light|spiritwolf|sum=stormwolf n=4 dur=20 cd=30', 'Ghost Walk|buff|shadow|transform|buff=speed,res amt=40 dur=10 cd=30',
      'Council of Elders|summon|holy|ancient|sum=ancestor n=4 dur=20 cd=50', 'Spirit Storm|cyclone|holy|spirit|n=5 dur=6 cd=8', 'Soul Beam|beam|holy|drain|dur=2.5 leech cd=5', 'Ancestral Wrath|strike|holy|spirit|n=10 cd=8',
    ],
    [
      'Earth Shock|proj|phys|rock|knock', 'Lightning Bolt|beam|light|lightning|range=1.1', 'Flame Shock|proj|fire|fireball|burn', 'Frost Shock|proj|cold|shard|slow',
      'Chain Lightning|chain|light|lightning|n=5', 'Primal Stomp|nova|phys|shock|stun r=1.2', 'Lava Burst|proj|fire|fireball|exp dmg=1.5', 'Thunderstorm|nova|light|lightning|knock r=1.4',
      'Earthquake|aoe|phys|eruption|r=2 dur=3 cd=3', 'Storm Strike|melee|light|smash|exp chain=3', 'Magma Fissure|fissure|fire|fire|range=1.3', 'Hailstorm|rain|cold|ice|n=16 r=1.6',
      'Tornado|cyclone|phys|wind|n=2 dur=5', 'Eruption|aoe|fire|eruption|r=1.6 dmg=2', 'Static Shock|buff|light|aura|pulse buff=as amt=20 dur=15 cd=25', 'Earthen Wall|wall|phys|earth|block dur=8',
      'Elemental Fury|nova|arcane|prism|n=4 r=2 cd=6', 'Sky Splitter|strike|light|lightning|n=14 cd=8', 'Avatar of Storms|buff|light|transform|transform buff=dmg,as amt=50 dur=15 cd=50', 'Molten Core|aoe|fire|meteor|r=2.6 dmg=3 cd=6',
    ],
  ],
  death_knight: [
    [
      'Frost Strike|melee|cold|slash|free wc=1.1 slow', 'Icy Touch|proj|cold|shard|slow', 'Howling Blast|nova|cold|frost|r=1.2', 'Chains of Ice|curse|cold|frost|curse=slow r=0.8',
      'Obliterate|melee|cold|smash|dmg=1.8', 'Frost Wyrm Breath|beam|cold|breath|cone dur=1.5', 'Remorseless Winter|zone|cold|frost|follow r=1.4 dur=8 cd=12', 'Glacial Advance|fissure|cold|ice|range=1.3',
      'Frostscythe|melee|cold|slash|arc=200 dmg=1.4', 'Rime Storm|aoe|cold|blizzard|r=1.6 dur=3', 'Icebound Fortitude|buff|cold|shield|buff=armor,res amt=50 dur=12 cd=30', 'Frozen Runeblade|orbit|cold|blade|n=3 dur=6 cd=8',
      'Breath of Sindragosa|beam|cold|breath|cone dur=3 dmg=1.3 cd=5', 'Avalanche Strike|melee|cold|smash|exp r=1.6 freeze', 'Frost Wyrm|summon|cold|dragon|sum=frostwyrm max=1 dur=15 cd=40', 'Pillar of Frost|buff|cold|aura|buff=dmg amt=40 dur=15 cd=40',
      "Winter's End|nova|cold|frost|n=3 r=2.2 freeze cd=8", 'Frozen Throne|zone|cold|frost|r=2.4 dur=6 freeze cd=12', 'Glacial Cataclysm|rain|cold|ice|n=30 r=2 cd=6', 'Runeblade Storm|cyclone|cold|blade|n=3 dur=5 cd=6',
    ],
    [
      'Death Coil|proj|shadow|skull|leech', 'Plague Strike|melee|poison|slash|poison', 'Raise Ghoul|summon|shadow|ghoul|sum=dkghoul max=1', 'Death Grip|proj|shadow|chain|pull stun',
      'Death and Decay|zone|shadow|void|r=1.4 dur=6', 'Festering Strike|melee|poison|smash|poison exp', 'Scourge Strike|melee|shadow|slash|dmg=1.5', 'Unholy Blight|zone|poison|poison|follow dur=8 cd=10',
      'Army of the Dead|summon|shadow|ghoul|sum=dkghoul n=6 dur=12 cd=40', 'Epidemic|nova|poison|poison|r=1.6', 'Dark Transformation|buff|shadow|aura|buff=dmg amt=30 party dur=15 cd=30', 'Necrotic Strike|melee|shadow|slash|curse=amp',
      'Defile|zone|shadow|void|r=1.8 dur=8 cd=8', 'Apocalypse|nova|shadow|void|r=1.8 dmg=1.8', 'Abomination|summon|poison|abomination|sum=abomination max=1 cd=30', 'Soul Reaper|melee|shadow|slash|dmg=2.6 cd=2',
      'Unholy Frenzy|buff|shadow|aura|buff=as,speed amt=40 dur=12 cd=30', 'Dark Rider|dash|shadow|charge|range=1.8 dmg=2.2 cd=3', 'Death Pact|heal|shadow|light|amt=40 cd=30', 'Plaguebringer|rain|poison|acid|n=30 r=2 cd=6',
    ],
    [
      'Heart Strike|melee|blood|slash|leech', 'Blood Boil|nova|blood|blood|r=1', 'Vampiric Blood|buff|blood|aura|buff=regen,life amt=30 dur=15 cd=30', 'Mark of Blood|curse|blood|sigil|curse=leech',
      'Death Strike|melee|blood|smash|leech dmg=1.4', 'Blood Tap|heal|blood|light|amt=15 cd=10', 'Rune Tap|buff|blood|shield|buff=armor amt=40 dur=20 cd=25', 'Blood Plague|curse|blood|sigil|curse=decay r=1.2',
      'Consumption|nova|blood|blood|r=1.4 leech', 'Bonestorm|whirl|blood|blade|dur=3', 'Blood Mirror|buff|blood|shield|buff=thorns amt=60 dur=15 cd=30', "Gorefiend's Grasp|nova|shadow|void|pull r=1.8",
      'Dancing Rune Weapon|summon|blood|blade|sum=runeweapon max=1 dur=15 cd=30', 'Blood Lance|proj|blood|spear|pierce leech', 'Crimson Scourge|zone|blood|blood|r=1.6 dur=6', 'Tombstone|buff|blood|shield|buff=armor,res amt=60 dur=10 cd=40',
      'Sanguine Storm|cyclone|blood|blood|n=3 dur=5 cd=6', 'Bloodbath|aoe|blood|eruption|r=2.5 dmg=2.6 leech cd=6', 'Purgatory|buff|blood|aura|buff=regen amt=80 dur=8 cd=60', 'Blood Moon|rain|blood|blood|n=24 r=2 cd=6',
    ],
  ],
  // The Astronomer (id kept): star missiles, falling bodies, gravity. Every non-basic cast charts a star on the
  // battlefield (game/astronomer.js); `astro=` names a special cast handled there.
  arcane_sorcerer: [
    [
      'Star Missiles|proj|arcane|starmissile|free wc=0.6 n=3 spread=26 home', 'Moonbeam|beam|arcane|moonbeam|dur=1.5', 'Stardust Volley|proj|arcane|stardust|n=6 spread=60 home spd=1.2', 'Astral Ward|buff|arcane|shield|buff=armor,res amt=35 dur=30 cd=30',
      'Comet Swarm|proj|arcane|starmissile|n=8 rand home spd=1.15', 'Lunar Lance|proj|arcane|moon|pierce spd=1.3 r=1.3 dmg=1.3', 'Twinkling Ring|proj|arcane|stardust|n=12 ring home', 'Starlight Step|blink|arcane|starblink|range=1.3 nova cd=1',
      'Starstream|proj|arcane|starmissile|n=14 rand home dmg=1.1', 'Solar Flare|beam|fire|flare|cone dur=2', 'Pulsar|beam|light|pulsar|astro=pulsar dur=3 cd=6', 'Celestial Mirror|buff|arcane|mirror|astro=mirror buff=dmg amt=20 dur=3.5 cd=24',
      'Missile Galaxy|proj|arcane|starmissile|n=24 ring home dmg=1.1 cd=3', 'Quasar|beam|arcane|quasar|dur=3 dmg=1.6 cd=6', 'Supernova|nova|arcane|supernova|astro=supernova r=2.2 dmg=2 cd=6', 'Starborn|buff|arcane|transform|transform buff=dmg,as,crit amt=40 dur=15 cd=45',
      'Starstorm|proj|arcane|starmissile|n=40 rand home dmg=1.3 cd=4', 'Gamma Ray Burst|beam|light|quasar|n=5 range=1.3 dmg=1.5 cd=5', 'Big Bang|aoe|arcane|bigbang|astro=bigbang r=3.4 dmg=4 delay=1.4 cd=14', 'Cosmic Ascension|buff|arcane|transform|transform buff=dmg,cdr,speed amt=50 dur=15 cd=60',
    ],
    [
      'Falling Star|aoe|arcane|starfall|astro=meteor r=0.9 delay=0.5', 'Sunspot|zone|fire|sunspot|r=1.1 dur=4', 'Comet|proj|arcane|comet|pierce r=1.3 spd=1.4 dmg=1.3', 'Starlight|heal|arcane|light|amt=25 cd=14',
      'Meteor|aoe|fire|meteor|astro=meteor r=1.5 dmg=1.9 delay=0.9', 'Solar Wind|proj|fire|flare|n=7 spread=60 knock spd=1.3', 'Comet Volley|proj|arcane|comet|n=3 spread=30 pierce', 'Solstice|buff|fire|aura|buff=dmg,regen amt=25 dur=20 cd=30',
      'Meteor Shower|rain|fire|meteor|astro=shower n=16 r=2.2 dur=2.4 cd=4', 'Corona|zone|fire|corona|follow r=1.6 dur=8 cd=12', "Halley's Comet|proj|arcane|comet|ret pierce r=1.8 dmg=2 cd=3", 'Lunar Tide|nova|arcane|tide|r=1.8 knock heal',
      'Great Meteor|aoe|fire|meteor|astro=meteor r=2.6 dmg=3.2 delay=1.4 burn cd=8', 'Sun Slam|aoe|fire|sun|astro=sunslam r=3.2 dmg=3.8 delay=2.2 burn cd=10', 'Comet Storm|strike|arcane|comet|n=10 cd=5', 'Equinox|buff|arcane|aura|buff=dmg,as,cdr amt=35 dur=15 cd=40',
      'Extinction Event|rain|fire|meteor|astro=shower n=40 r=3 dur=4 dmg=1.2 cd=14', 'Eclipse|curse|shadow|eclipse|astro=eclipse curse=amp,fear r=2.2 cd=16', 'Moonfall|aoe|cold|moon|astro=moonfall r=3.4 dmg=4.2 delay=2.6 cd=16', 'Syzygy|buff|arcane|transform|astro=align transform buff=dmg,crit amt=50 dur=15 cd=50',
    ],
    [
      'Gravity Bolt|proj|shadow|gravorb|pull slow', 'Repulse|nova|shadow|gravwave|r=1.2 knock', 'Dark Matter|proj|shadow|darkmatter|n=3 spread=30 home spd=0.8 r=1.2', 'Orbital Decay|curse|shadow|gravwave|curse=decay',
      'Gravity Well|aoe|shadow|blackhole|astro=well pull r=1.3 dur=4', 'Graviton Lance|beam|shadow|graviton|dur=1.5 slow', 'Antimatter|proj|shadow|antimatter|exp r=1.4 dmg=1.5', 'Accretion Disk|orbit|arcane|accretion|n=10 r=1.3 spiral dur=5 cd=8',
      'Black Hole|aoe|shadow|blackhole|astro=blackhole pull r=2 dur=4 dmg=1.2 cd=8', 'Tidal Force|curse|shadow|gravwave|curse=slow,amp r=1.6', 'Wormhole|blink|shadow|wormhole|astro=wormhole range=1.6 nova cd=2', 'Neutron Star|zone|light|neutron|astro=neutron r=1.2 dur=8 cd=14',
      'Event Horizon|nova|shadow|void|n=3 r=2 pull cd=8', 'Spaghettify|chain|shadow|graviton|n=6 pull dmg=1.4', 'Dark Energy|buff|shadow|aura|buff=speed,cdr amt=30 dur=15 cd=30', 'Gravity Lens|buff|arcane|lens|buff=crit,dmg amt=35 dur=15 cd=35',
      'Singularity|aoe|shadow|blackhole|astro=blackhole pull r=3.2 dur=6 dmg=2 cd=18', 'Crushing Gravity|curse|shadow|gravwave|curse=stun,amp r=2.4 at=self cd=20', 'Annihilation|aoe|shadow|antimatter|astro=bigbang r=3 dmg=3.6 delay=1.2 cd=10', 'Gravitational Collapse|nova|shadow|void|r=2.6 pull dmg=2.4 cd=10',
    ],
  ],
  carrion_witch: [
    [
      'Rot Bolt|proj|poison|blob|free wc=0.6 poison', 'Locust Swarm|cyclone|poison|locust|n=1 dur=4', 'Blight|zone|poison|poison|r=1 dur=4', 'Rot Touch|melee|poison|claw|poison',
      'Plague Cloud|zone|poison|poison|r=1.4 dur=6', 'Corpse Burst|corpse|poison|plague|n=3', 'Pestilent Spray|beam|poison|breath|cone dur=1.5', 'Infest|curse|poison|locust|curse=decay r=1.2',
      'Swarm Storm|cyclone|poison|locust|n=3 dur=5', 'Toxic Rain|rain|poison|acid|n=18 r=1.6', 'Rotting Flesh|nova|poison|poison|r=1.5', 'Blood Flies|proj|blood|locust|n=8 home rand leech',
      'Plague Bearer|summon|poison|abomination|sum=plaguebearer max=1 dur=20 cd=30', 'Miasma|zone|poison|poison|follow r=1.8 dur=10 cd=15', 'Carrion Feast|corpse|blood|gore|n=6 heal', 'Locust Plague|cyclone|poison|locust|n=6 dur=6 cd=8',
      'Black Death|nova|poison|plague|n=3 r=2.2 cd=8', 'Rain of Rot|rain|poison|acid|n=40 r=2.2 cd=6', 'Pandemic|curse|poison|plague|curse=decay,amp r=2.4 at=self cd=10', 'Hive Mother|summon|poison|hive|sum=hive max=1 dur=20 cd=30',
    ],
    [
      'Crow Swarm|proj|shadow|crow|n=3 spread=30 home', 'Raven Familiar|summon|shadow|bird|sum=raven max=2', 'Peck|melee|phys|claw|n=3 dmg=0.6', 'Feathered Cloak|buff|shadow|feather|buff=speed amt=25 dur=20 cd=25',
      'Murder of Crows|cyclone|shadow|crow|n=2 dur=4', 'Eye Gouge|curse|blood|crow|curse=slow,amp r=1', 'Crow Storm|proj|shadow|crow|n=10 rand home', 'Scarecrow|summon|phys|scarecrow|sum=scarecrow max=1 cd=15',
      'Raven Flock|summon|shadow|bird|sum=raven n=5 dur=15 cd=20', 'Feather Blades|proj|phys|feather|n=7 spread=50 pierce', 'Carrion Call|corpse|shadow|crow|n=5 r=1.5', 'Night Wings|blink|shadow|feather|range=1.4 nova',
      'Dark Murder|cyclone|shadow|crow|n=5 dur=6 cd=8', 'Feather Storm|orbit|phys|feather|n=8 dur=6 cd=8', 'Crow Queen|buff|shadow|transform|transform buff=dmg,speed amt=40 dur=15 cd=45', 'Talon Rain|rain|shadow|feather|n=24 r=1.8',
      'Unkindness|summon|shadow|bird|sum=raven n=10 dur=15 cd=40', 'Eclipse of Wings|nova|shadow|crow|n=3 r=2.2 cd=6', 'Soul Crows|proj|shadow|crow|n=16 ring home dmg=1.2 cd=4', 'Nevermore|strike|shadow|crow|n=12 cd=8',
    ],
    [
      'Hex Bolt|proj|shadow|rune|curse=amp', 'Voodoo Doll|curse|blood|sigil|curse=mark amt=50 r=0.6', 'Withering|curse|shadow|sigil|curse=weaken,slow r=1.2', 'Soul Siphon|beam|shadow|drain|leech dur=1.5',
      'Cauldron|summon|poison|cauldron|sum=cauldron max=1 cd=15', 'Bone Totem|summon|phys|totem|sum=totem_bone max=2', "Hag's Curse|curse|shadow|sigil|curse=decay,fear r=1.4", 'Blood Hex|curse|blood|sigil|curse=leech r=1.4',
      'Witch Bolt|chain|shadow|spirit|n=5', 'Grave Hex|curse|phys|bone|curse=stun r=1.2', 'Spirit Lantern|summon|holy|lantern|sum=lantern max=1 cd=15', 'Wither Wave|fissure|shadow|shadow|range=1.4',
      'Effigy|summon|blood|scarecrow|sum=effigy max=1 cd=20', 'Mass Hysteria|curse|shadow|sigil|curse=confuse r=2 cd=10', 'Death Rattle|nova|phys|bone|r=1.8', 'Hexstorm|rain|shadow|rune|n=20 r=1.8',
      'Coven|summon|shadow|witch|sum=witch n=3 dur=20 cd=45', 'Doom Hex|curse|shadow|sigil|curse=doom dmg=5 r=0.8 cd=8', 'Puppeteer|curse|shadow|sigil|curse=charm r=1.2 cd=20', 'Witching Hour|buff|shadow|aura|buff=dmg,cdr amt=40 dur=15 cd=50',
    ],
  ],
  // The Bard shoots musical notation: proj/orbit/rain/beam skills fly their glyph ('n_<note>' fx), every other skill
  // writes its `note=` and flings it as a cosmetic note flight. Each cast fills his 4/4 measure (data/notation.js).
  bard: [
    [
      'Plucked Note|proj|arcane|n_q|free wc=0.9', 'Ballad of Valor|buff|holy|note|buff=dmg amt=20 dur=30 cd=30 party note=h', 'Hymn of Mending|buff|holy|note|buff=regen amt=20 dur=30 cd=30 party note=rh', 'Dirge|curse|shadow|note|curse=slow r=1.4 at=self note=rq',
      'Battle Hymn|buff|phys|note|buff=as amt=25 dur=30 cd=30 party note=e2', 'Lullaby|proj|arcane|n_re|n=3 spread=30 spd=0.55 wavy hush stun cd=3', 'Song of Swiftness|buff|phys|note|buff=speed amt=30 dur=30 cd=30 party note=s2', 'Requiem|curse|shadow|note|curse=amp,weaken r=1.6 at=self cd=10 note=rw',
      'Anthem of Heroes|buff|holy|note|buff=dmg,armor amt=30 dur=30 cd=35 party note=w', 'Chorus|summon|holy|clone|sum=chorus n=2 dur=15 cd=25 note=t8', 'Siren Song|curse|arcane|note|curse=charm r=1 cd=20 note=h', 'Rhapsody|nova|holy|note|r=1.6 heal note=e2',
      'Symphony of Storms|buff|light|note|pulse buff=dmg amt=20 dur=20 cd=30 note=treble', 'Crescendo|proj|phys|n_h|cresc pierce dmg=1.5 spd=0.8 cd=1.5', 'Elegy|zone|shadow|note|r=1.8 dur=8 cd=12 note=re', 'Ode to Joy|heal|holy|note|amt=50 party cd=25 note=re',
      'Magnum Opus|buff|holy|note|buff=dmg,as,speed amt=40 dur=20 cd=50 party note=w', 'Finale|proj|arcane|n_w|ferm hold=2 r=1.6 dmg=2.4 spd=0.8 cd=8', 'Orchestra|summon|holy|clone|sum=chorus n=5 dur=20 cd=50 note=t8', 'Song of the Ages|curse|arcane|note|curse=stun,amp r=2.5 at=self cd=20 note=rq',
    ],
    [
      'Sound Wave|proj|phys|n_e2|pierce wavy', 'Power Chord|proj|phys|n_q|n=3 spread=22', 'Echo|proj|phys|n_e|bounce=3 canon dmg=0.7', 'Dissonance|curse|phys|note|curse=confuse r=1 note=re',
      'Shockwave Riff|fissure|phys|sonic|range=1.3 note=e2', 'Resonance|proj|phys|n_h|ferm hold=2.5 spd=0.8 cd=4', 'Tremolo|proj|phys|n_e|n=6 spread=40 rand wavy', 'Feedback Loop|orbit|phys|n_t8|n=3 dur=6 cd=8',
      'Sonic Boom|nova|phys|sonic|r=1.8 knock note=bass', 'Bass Drop|proj|phys|n_w|lob exp r=1.8 dmg=2 stun cd=5', 'Harmonic Beam|beam|arcane|n_treble|dur=2', 'Screech|proj|phys|n_e|n=9 spread=90 slow',
      'Thunder Drum|summon|light|drum|sum=drum max=1 cd=15 note=rq', 'Shatter Note|proj|phys|n_e2|scatter exp', 'Wall of Sound|wall|phys|sonic|block dur=6 cd=6 note=rw', 'Amplifier|summon|arcane|drum|sum=amp max=1 cd=15 note=e2',
      'Brown Note|proj|poison|n_h|n=3 spread=30 spd=0.6 pull exp cd=6', 'Encore|buff|arcane|note|buff=cdr amt=50 dur=10 cd=60 note=w', 'Death Metal|proj|shadow|n_bass|spd=0.7 pierce cresc r=1.5 dmg=2.2 cd=6', 'Supersonic|proj|light|n_treble|spray pierce spd=0.6 r=1.3 cd=4',
    ],
    [
      'Sharp Note|proj|phys|n_e|spd=1.5', 'Fan of Notes|proj|phys|n_e|n=8 ring', 'Smoke Screen|curse|shadow|smoke|curse=slow r=1.2 note=re', 'Pickpocket|proj|phys|n_e|home ret gold',
      'Dancing Notes|orbit|phys|n_e2|n=3 dur=8 cd=8', 'Pyrotechnics|aoe|fire|firework|n=5 r=0.8 dur=1 note=q', 'Misdirection|blink|arcane|smoke|range=1.2 nova note=re', "Juggler's Toss|proj|fire|n_e2|n=3 lob exp spread=40",
      'Mirror Images|summon|arcane|clone|sum=clone n=2 dur=15 cd=20 note=e2', 'Sleight of Hand|proj|arcane|n_e|n=5 spread=40 home stac', 'Flashbang|curse|holy|flash|curse=stun r=1.4 dur=1.5 note=rq', 'Staccato Flurry|proj|phys|n_e2|n=2 spread=16 stac pierce dmg=0.8',
      'Grand Illusion|summon|arcane|clone|sum=clone n=4 dur=15 cd=30 note=q', 'Firework Finale|rain|fire|n_q|n=20 r=1.8', 'Swashbuckle|dash|phys|wind|range=1.3 n=3 note=e', 'Deadly Sonata|proj|arcane|n_t8|n=12 ring home trip dmg=0.55',
      'Showstopper|aoe|arcane|firework|r=2.6 dmg=3 cd=6 note=w', 'Thousand Notes|rain|phys|n_e2|n=40 r=2 cd=6', 'Vanishing Act|buff|shadow|transform|buff=crit,dmg,speed amt=40 dur=10 cd=40 note=rw', 'Bladestorm Waltz|whirl|phys|blade|dur=4 r=1.4 cd=5 note=t8',
    ],
  ],
  slime_lord: [
    [
      'Slime Ball|proj|acid|blob|free wc=0.6', 'Acid Splash|proj|acid|blob|n=3 spread=30 exp r=0.7', 'Slime Pool|zone|acid|slime|r=1.2 dur=6 slow', 'Goo Spit|proj|acid|blob|lob exp slow',
      'Ooze Wave|fissure|acid|slime|range=1.2', 'Gelatinous Wall|wall|acid|slime|block dur=6 slow', 'Acid Rain|rain|acid|acid|n=14 r=1.4', 'Corrosive Bolt|proj|acid|blob|pierce curse=amp',
      'Slime Nova|nova|acid|slime|r=1.4 slow', 'Toxic Flood|wall|acid|slime|dur=6 len=1.6', 'Bouncing Blob|proj|acid|blob|bounce=6 r=1.3', 'Sludge Beam|beam|acid|slime|dur=2',
      'Acid Geyser|aoe|acid|eruption|n=5 r=1 dur=2', 'Slime Tsunami|fissure|acid|slime|n=3 spread=40 range=1.6', 'Melt|curse|acid|slime|curse=amp,slow amt=40 r=1.4', 'Viscous Orbs|orbit|acid|blob|n=6 dur=6 cd=8',
      'Deluge|rain|acid|acid|n=40 r=2.2 cd=6', 'Primordial Ooze|zone|acid|slime|r=2.6 dur=8 cd=12', 'Acid Comet|aoe|acid|meteor|r=2 dmg=2.8 cd=4', 'Gloop Cannon|proj|acid|blob|r=3 dmg=3 exp pierce cd=3',
    ],
    [
      'Slimeling|summon|acid|slime|sum=slimeling max=4', 'Split|nova|acid|slime|r=0.9', 'Ooze Buddy|summon|acid|slime|sum=oozebuddy max=1', 'Slime Trail|zone|acid|slime|follow r=0.8 dur=10 cd=12',
      'Brood|summon|acid|slime|sum=slimeling n=3 dur=20 cd=12', 'Volatile Slime|summon|acid|slime|sum=bombslime n=2 dur=10 cd=6', 'Frost Jelly|summon|cold|slime|sum=frostslime max=2', 'Feed|buff|acid|aura|buff=regen amt=25 party dur=20 cd=25',
      'King Slime|summon|acid|slime|sum=kingslime max=1 cd=30', 'Mitosis|summon|acid|slime|sum=slimeling n=5 dur=15 cd=20', 'Slime Rain|rain|acid|blob|n=12 r=1.5', 'Swarming Ooze|buff|acid|aura|buff=dmg,as amt=30 party dur=20 cd=30',
      'Ooze Titan|summon|acid|slime|sum=slimetitan max=1 cd=40', 'Explosive Brood|summon|acid|slime|sum=bombslime n=6 dur=10 cd=15', 'Prismatic Jellies|summon|acid|slime|sum=prismslime n=3 dur=20 cd=25', 'Symbiosis|heal|acid|light|amt=40 party cd=25',
      'Slime Empire|summon|acid|slime|sum=kingslime n=3 dur=25 cd=60', 'Gelatinous Horde|summon|acid|slime|sum=slimeling n=12 dur=15 cd=40', 'Hivemind|buff|acid|aura|buff=dmg,as,speed amt=45 party dur=20 cd=50', 'Mother Ooze|summon|acid|slime|sum=motherooze max=1 cd=60',
    ],
    [
      'Body Slam|melee|acid|smash|knock', 'Absorb|melee|acid|bite|leech', 'Slime Armor|buff|acid|shield|buff=armor amt=50 dur=30 cd=30', 'Bounce|leap|acid|slime|range=1',
      'Engulf|melee|acid|bite|dmg=1.6 stun', 'Elastic Lash|melee|acid|thrust|range=2', 'Splatter Leap|leap|acid|slime|r=1.4 dmg=1.4', 'Regenerate|buff|acid|aura|buff=regen amt=40 dur=15 cd=30',
      'Rolling Blob|dash|acid|slime|range=1.4 dmg=1.3', 'Acidic Skin|buff|acid|shield|buff=thorns amt=60 dur=20 cd=30', 'Spike Mutation|nova|acid|spike|r=1.4', 'Tendril Whip|melee|acid|slash|arc=240 range=1.6',
      'Colossal Form|buff|acid|transform|transform buff=dmg,armor amt=50 dur=15 cd=45', 'Mega Bounce|leap|acid|slime|r=2 dmg=2 cd=3', 'Devour|melee|acid|bite|dmg=3 leech cd=2', 'Amorphous|buff|acid|aura|buff=res,speed amt=40 dur=15 cd=30',
      'Cataclysmic Splash|leap|acid|slime|r=2.8 dmg=3.2 cd=6', 'Slime God|buff|acid|transform|transform buff=dmg,as,armor amt=60 dur=20 cd=60', 'Gooey Vortex|cyclone|acid|slime|n=4 dur=6 cd=8', 'Ooze Apocalypse|nova|acid|slime|n=4 r=2.5 cd=8',
    ],
  ],
  boomerang_knight: [
    [
      'Boomerang|proj|phys|rang|free wc=1 ret pierce', 'Twin Rang|proj|phys|rang|n=2 spread=30 ret pierce', 'Ricochet|proj|phys|rang|bounce=5', 'Heavy Rang|proj|phys|rang|ret pierce r=1.5 dmg=1.4 knock',
      'Tri-Rang|proj|phys|rang|n=3 spread=45 ret pierce', 'Seeking Rang|proj|phys|rang|home ret pierce', 'Flame Rang|proj|fire|rang|ret pierce burn', 'Frost Rang|proj|cold|rang|ret pierce slow',
      'Rang Storm|proj|phys|rang|n=6 ring ret pierce', 'Storm Rang|proj|light|rang|ret pierce chain=2', 'Splitting Rang|proj|phys|rang|split ret', 'Chakram|proj|phys|chakram|bounce=8 spd=1.3',
      'Infinity Rang|proj|arcane|rang|ret pierce r=2 dmg=1.6 dur=2', 'Blade Comet|aoe|phys|meteor|r=1.5 dmg=2.2', 'Rang Barrage|proj|phys|rang|n=10 spread=90 ret pierce', 'Orbiting Rangs|orbit|phys|rang|n=4 dur=8 cd=8',
      'Rangnarok|proj|phys|rang|n=20 ring ret pierce cd=5', 'Celestial Chakram|proj|holy|chakram|bounce=12 dmg=1.6 cd=3', 'Black Hole Rang|proj|shadow|rang|pull ret pierce r=2 cd=5', 'Rang Rain|rain|phys|rang|n=30 r=2 cd=6',
    ],
    [
      'Cross Slash|melee|phys|slash|n=2', 'Swirling Blades|orbit|phys|blade|n=2 dur=6 cd=6', 'Riposte|buff|phys|shield|buff=block,thorns amt=25 dur=20 cd=25', 'Lunge|dash|phys|charge|range=0.8',
      'Sword Spin|melee|phys|spin|arc=360', 'Blade Dance|whirl|phys|blade|dur=2', 'Twin Fang|melee|blood|slash|n=2 bleed', 'Parry|buff|phys|shield|buff=block amt=35 dur=10 cd=20',
      'Blade Fury|melee|phys|slash|n=8 dmg=0.5', 'Swirling Storm|orbit|phys|blade|n=5 dur=8 cd=10', 'Crescent Wave|proj|phys|wave|pierce n=3 spread=40', 'Iaido|dash|phys|charge|range=1.4 dmg=1.6',
      'Blade Vortex|cyclone|phys|blade|n=2 dur=5', 'Thousand Swords|rain|phys|blade|n=24 r=1.8', "Knight's Honor|buff|holy|aura|buff=dmg,armor amt=40 dur=15 cd=40", 'X-Slash|melee|phys|slash|n=2 dmg=2 cd=1.5 exp',
      'Omnislash|dash|phys|charge|n=6 range=1 dmg=1.5 cd=6', 'Blade Halo|orbit|holy|blade|n=10 dur=10 cd=15', 'Sword Saint|buff|phys|transform|transform buff=as,crit,dmg amt=45 dur=15 cd=50', 'Excalibur|beam|holy|laser|dur=1 dmg=3 cd=5',
    ],
    [
      'Wind Rang|proj|phys|wave|ret pierce spd=1.3', 'Gust|nova|phys|wind|knock r=1', 'Air Dash|dash|phys|wind|range=1.1', 'Tailwind|buff|phys|wind|buff=speed amt=25 dur=20 cd=25',
      'Cyclone|cyclone|phys|wind|n=1 dur=4', 'Gale Wall|wall|phys|wind|dur=5', 'Vacuum Slash|melee|phys|slash|pull r=1.3', 'Squall|proj|cold|wave|n=5 spread=40',
      'Twin Cyclones|cyclone|phys|wind|n=2 dur=5', 'Hurricane Rang|proj|phys|rang|ret pierce r=1.8 slow', 'Wind Shear|fissure|phys|wind|range=1.4', 'Eye of the Storm|zone|light|storm|follow r=1.6 dur=8 cd=12',
      'Tempest Rang|proj|light|rang|n=3 spread=40 ret pierce chain=2', 'Typhoon|cyclone|cold|wind|n=4 dur=6 cd=8', 'Skyward Blades|rain|phys|blade|n=20 r=1.6', 'Zephyr|buff|phys|transform|buff=speed,as amt=40 dur=15 cd=30',
      'Maelstrom|cyclone|light|storm|n=6 dur=6 cd=10', 'Gale Force|nova|phys|wind|n=3 r=2.4 knock cd=6', 'Storm Knight|buff|light|transform|transform buff=dmg,as,speed amt=50 dur=20 cd=50', 'Thunder Rang|proj|light|rang|ret pierce r=2.5 dmg=2.5 cd=4',
    ],
  ],
  lancer: [
    [ // Energy Lance: a huge spear of raw element for every attack ('lance'), some of them charges
      'Lance Thrust|melee|light|thrust|free wc=1.1 range=1.5 lance', 'Flame Lance|melee|fire|thrust|range=1.8 burn lance', 'Lance Charge|dash|light|charge|range=1.2 knock lance', 'Frost Lance|melee|cold|thrust|range=1.8 slow lance',
      'Thunder Lance|melee|light|thrust|range=2 chain=3 lance', 'Inferno Charge|dash|fire|charge|range=1.4 exp lance', 'Lance of Light|beam|holy|laser|dur=0.35 range=0.7 dmg=1.4 lance', 'Glacial Pike|melee|cold|thrust|range=2.2 freeze dmg=1.3 lance',
      'Storm Lance|beam|light|laser|dur=0.4 range=0.9 dmg=1.6 lance', 'Comet Charge|dash|fire|charge|range=1.6 exp dmg=1.5 lance', 'Void Lance|melee|shadow|thrust|range=2.4 dmg=1.5 lance', 'Venom Pike|melee|poison|thrust|range=2.2 poison exp lance',
      'Lance Barrage|melee|arcane|thrust|n=4 dmg=0.7 range=2 lance', 'Blizzard Charge|dash|cold|charge|n=2 range=1.6 freeze lance', 'Sunspear|beam|holy|laser|dur=0.6 range=1.1 dmg=2 cd=3 lance', 'Blood Lance|melee|blood|thrust|range=2.4 bleed leech dmg=1.6 lance',
      'Dragon Lance|beam|fire|laser|dur=0.8 range=1.3 dmg=2.4 cd=4 lance', 'Omni-Charge|dash|light|charge|n=6 range=1.2 dmg=1.5 cd=6 lance', 'Lance of Ruin|melee|shadow|thrust|range=3 dmg=3 exp cd=3 lance', 'Prismatic Lance|beam|arcane|laser|dur=1 range=1.5 dmg=3 cd=5 lance prism',
    ],
    [ // Bulwark: tower shields ('shields': 1 more every 2 ranks, up to 10) circle and batter foes; armor and walls
      'Tower Shield|orbit|phys|tshield|shields dur=20 cd=6', 'Shield Wall|buff|phys|shield|buff=block,armor amt=30 dur=20 cd=25', 'Shield Slam|melee|phys|smash|stun knock', 'Brace|buff|phys|shield|buff=armor amt=60 dur=10 cd=20',
      'Storm Bulwark|orbit|light|tshield|shields n=2 dur=20 cd=6 r=1.1', 'Tortoise|buff|phys|shield|buff=res amt=40 dur=15 cd=25', 'Shield Bash Nova|nova|phys|shield|stun r=1.2', 'Iron Skin|buff|phys|shield|buff=armor,life amt=30 dur=20 cd=30',
      'Burning Aegis|orbit|fire|tshield|shields n=3 dur=20 cd=6 burn r=1.2', 'Shield Throw|proj|phys|disc|bounce=4', 'Unbreakable|buff|phys|shield|buff=armor,res,block amt=40 dur=12 cd=40', 'Bulwark Slam|nova|phys|shock|r=1.6 stun knock',
      'Frost Rampart|orbit|cold|tshield|shields n=4 dur=20 cd=6 slow r=1.3', 'Spear Wall|wall|phys|spike|block dur=6', 'Ironclad|buff|phys|transform|transform buff=armor,dmg amt=50 dur=15 cd=45', 'Aegis Nova|nova|holy|shield|n=3 r=2.2 stun cd=8',
      'Holy Citadel|orbit|holy|tshield|shields n=5 dur=25 cd=6 r=1.4 dmg=1.4', 'Shield Storm|orbit|arcane|tshield|shields n=5 spiral dur=4 cd=5 dmg=1.6', 'Living Fortress|buff|phys|aura|buff=armor,res,regen amt=60 dur=15 cd=50', 'Bastion of Ten|orbit|light|tshield|shields n=10 dur=30 cd=10 r=1.6 dmg=2',
    ],
    [ // Knight Order: knights that follow and fight for him ('grow': one more every 5 ranks), banners and battle cries
      'Squire Knight|summon|phys|knight|sum=kn_squire n=1 max=1 grow', 'Rally|heal|holy|light|amt=20 party cd=12', 'War Banner|summon|holy|banner|sum=banner dur=20 cd=20', 'Taunt|curse|phys|shout|curse=amp at=self',
      'Lance Knight|summon|light|knight|sum=kn_lance n=1 max=1 grow', 'Valor|buff|holy|aura|buff=dmg amt=15 dur=30 cd=30 party', 'Glorious Charge|dash|holy|charge|range=1.6 exp lance', 'Hold the Line|buff|phys|shield|buff=armor,res amt=35 party dur=20 cd=30',
      'Flame Templar|summon|fire|knight|sum=kn_flame n=1 max=1 grow', 'Frost Warden|summon|cold|knight|sum=kn_frost n=1 max=1 grow', 'Battle Standard|summon|fire|banner|sum=firebanner dur=20 cd=20', 'Shout of Valor|nova|holy|sonic|stun r=1.4',
      'Knight Captain|summon|holy|knight|sum=kn_captain max=1 cd=20', 'Storm Paladin|summon|light|knight|sum=kn_storm n=1 max=1 grow', 'Heroic Presence|buff|holy|aura|pulse buff=dmg amt=25 dur=20 cd=30 party', 'Valiant Leap|leap|holy|holy|r=1.6 dmg=1.8',
      'Knights of the Round|summon|holy|knight|sum=kn_round n=4 dur=30 cd=50', 'Banner of Kings|summon|holy|banner|sum=kingbanner dur=25 cd=40', 'Grand Marshal|summon|arcane|knight|sum=kn_marshal max=1 cd=40', "Hero's Ascension|buff|holy|transform|transform buff=dmg,as,armor amt=50 dur=20 cd=60",
    ],
  ],
  dragon_knight: [
    [
      'Flame Slash|melee|fire|slash|free wc=1.1 burn', 'Fire Breath|beam|fire|breath|cone dur=1', 'Searing Blade|melee|fire|slash|exp', 'Ember Burst|nova|fire|fire|r=0.9',
      'Flame Strike|aoe|fire|pillar|r=1.2', 'Dragonfire Sweep|melee|fire|slash|arc=220 dmg=1.3', 'Fire Pillar|strike|fire|pillar|n=3', 'Magma Blade|melee|fire|smash|burn exp r=1.3',
      "Dragon's Fury|melee|fire|slash|n=5 dmg=0.6 burn", 'Volcanic Wave|fissure|fire|fire|range=1.4', 'Blazing Spin|whirl|fire|fire|dur=2', 'Inferno Breath|beam|fire|breath|cone dur=2 dmg=1.3',
      'Hellfire|zone|fire|fire|follow r=1.6 dur=10 cd=12', 'Firestorm Slash|proj|fire|wave|n=5 spread=50 pierce', 'Eruption|aoe|fire|eruption|r=2 dmg=2', 'Burning Soul|buff|fire|aura|pulse buff=dmg amt=25 dur=15 cd=30',
      'Dragon Slave|beam|fire|laser|dur=2 dmg=2 cd=6', 'Meteor Storm|rain|fire|meteor|n=12 r=2.2 dur=3 cd=8', 'Supernova|nova|fire|fire|n=3 r=2.6 dmg=2 cd=8', 'Phoenix|summon|fire|phoenix|sum=phoenix max=1 dur=20 cd=40',
    ],
    [
      'Dragon Scales|buff|fire|shield|buff=armor amt=50 dur=30 cd=30', 'Tail Swipe|melee|phys|spin|arc=360 knock', 'Molten Shield|buff|fire|shield|buff=thorns amt=50 dur=20 cd=25', 'Scale Shards|proj|phys|shard|n=5 spread=40',
      'Dragonhide|buff|phys|shield|buff=res amt=35 dur=30 cd=30', 'Claw Rend|melee|blood|claw|bleed n=3 dmg=0.7', 'Ember Skin|zone|fire|fire|follow r=1 dur=12 cd=15', 'Scale Burst|nova|phys|shard|r=1.3',
      'Wing Buffet|nova|phys|wind|r=1.5 knock', 'Obsidian Scales|buff|fire|shield|buff=armor,res amt=45 dur=20 cd=30', 'Horn Charge|dash|phys|charge|range=1.4 knock dmg=1.4', 'Scale Barrage|proj|fire|shard|n=12 ring',
      "Dragon's Resilience|buff|fire|aura|buff=regen,armor amt=40 dur=15 cd=40", 'Molten Armor|zone|fire|fire|follow r=1.4 dur=15 cd=20', 'Tail Quake|nova|phys|shock|r=1.8 stun', 'Scale Storm|orbit|fire|shard|n=8 dur=8 cd=10',
      'Adamantine Scales|buff|phys|shield|buff=armor,res,block amt=60 dur=15 cd=60', 'Primal Roar|curse|fire|shout|curse=fear,weaken,amp r=2.4 at=self cd=12', 'Dragonbone Spikes|nova|phys|spike|n=3 r=2.2 cd=6', 'Indomitable|buff|fire|transform|transform buff=regen,dmg amt=60 dur=15 cd=60',
    ],
    [
      'Wing Dash|dash|fire|wind|range=1', 'Summon Whelp|summon|fire|dragon|sum=whelp max=2', 'Dragon Eye|curse|fire|sigil|curse=amp', 'Drake Bolt|proj|fire|dragon|exp',
      'Dragon Leap|leap|fire|dragon|r=1.4 dmg=1.5', 'Twin Drakes|proj|fire|dragon|n=2 spread=30 home', "Wyrm's Call|summon|fire|dragon|sum=wyvern max=1 cd=15", 'Draconic Rune|trap|fire|rune|n=3',
      'Dragon Dive|leap|fire|meteor|r=1.8 dmg=2 cd=3', 'Drake Swarm|proj|fire|dragon|n=6 home spread=90', 'Dragon Ward|summon|fire|totem|sum=dragonstatue max=1 cd=15', 'Sky Fire|rain|fire|fireball|n=14 r=1.6',
      'Dragon Form|buff|fire|transform|transform buff=dmg,armor,speed amt=40 dur=20 cd=45', 'Elder Drake|summon|fire|dragon|sum=elderwyrm max=1 cd=40', "Dragon's Roar|nova|fire|sonic|r=2 stun", "Bahamut's Gaze|beam|fire|laser|dur=2 cd=5",
      'Megaflare|aoe|fire|nuke|r=3.2 dmg=4 delay=1.2 cd=10', 'Dragon Legion|summon|fire|dragon|sum=whelp n=8 dur=20 cd=50', 'Dragonlord|buff|fire|transform|transform buff=dmg,as,res amt=60 dur=20 cd=60', 'Dragonfall|strike|fire|meteor|n=10 cd=8',
    ],
  ],
  gunner: [
    [
      'Pistol Shot|proj|phys|bullet|free wc=1 spd=1.6', 'Buckshot|proj|phys|bullet|n=7 spread=40 spd=1.3 range=0.6', 'Double Tap|proj|phys|bullet|n=2 spread=4 spd=1.6', 'Ricochet Round|proj|phys|bullet|bounce=4 spd=1.6',
      'Sniper Shot|proj|phys|bullet|pierce dmg=2 spd=2.5 range=1.5', 'Fan the Hammer|proj|phys|bullet|n=6 spread=50 spd=1.6', 'Incendiary Rounds|proj|fire|bullet|burn spd=1.6 n=2 spread=6', 'Cryo Rounds|proj|cold|bullet|slow spd=1.6 n=2 spread=6',
      'Gatling Barrage|proj|phys|bullet|n=12 rand spread=30 spd=1.6 dmg=0.6', 'Armor Piercer|proj|phys|bullet|pierce dmg=1.8 spd=2.2', 'Shock Rounds|proj|light|bullet|chain=3 spd=1.6', "Dragon's Breath Shell|beam|fire|breath|cone dur=0.5 dmg=1.6",
      'Bullet Hell|proj|phys|bullet|n=24 ring spd=1.2', 'Rail Gun|beam|light|laser|dur=0.4 dmg=3 cd=2', 'Explosive Rounds|proj|fire|bullet|exp n=3 spread=10 spd=1.6', 'Deadeye|buff|phys|aura|buff=crit,dmg amt=40 dur=12 cd=30',
      'Death Laser|beam|fire|laser|dur=3 dmg=1.6 cd=6', 'Minigun Fury|proj|phys|bullet|n=40 rand spread=40 spd=1.8 dmg=0.5 cd=5', 'Orbital Strike|strike|fire|laser|n=6 r=1.5 dmg=2 cd=8', 'Hand Cannon|proj|fire|bomb|r=2.5 exp dmg=3.5 spd=1.2 cd=3',
    ],
    [
      'Grenade|proj|fire|bomb|lob exp', 'Landmine|trap|fire|mine|n=1', 'Flashbang|curse|holy|flash|curse=stun r=1.2 dur=1.5', 'Smoke Grenade|curse|shadow|smoke|curse=slow r=1.4',
      'Cluster Bomb|proj|fire|bomb|lob exp split', 'Napalm|zone|fire|fire|r=1.4 dur=6', 'Frag Grenade|proj|phys|bomb|lob exp r=1.4', 'Sticky Bomb|proj|fire|bomb|exp dmg=1.6',
      'Rocket|proj|fire|rocket|exp r=1.4 spd=1.2', 'Mine Field|trap|fire|mine|n=6 r=1.5', 'Firebomb Barrage|proj|fire|bomb|lob exp n=4 spread=50', 'Shrapnel Nova|nova|phys|shard|r=1.5',
      'Rocket Barrage|proj|fire|rocket|n=6 spread=40 home exp spd=1.1', 'Carpet Bomb|fissure|fire|explosion|range=1.6', 'Nitro Charge|aoe|fire|explosion|r=2 delay=1 dmg=2.4', 'Cryo Grenade|proj|cold|bomb|lob exp freeze r=1.5',
      'Nuke|aoe|fire|nuke|r=3.5 dmg=4.5 delay=1.5 cd=12', 'Airstrike|rain|fire|rocket|n=20 r=2.2 dur=2.5 cd=8', 'Chain Reaction|trap|fire|bomb|n=10 r=2 cd=6', 'Mega Rocket|proj|fire|rocket|exp r=3 dmg=3.2 spd=0.9 cd=4',
    ],
    [
      'Gun Turret|summon|phys|turret|sum=turret max=2', 'Repair Kit|heal|phys|light|amt=25 cd=12', 'Bear Trap|trap|phys|bear|stun', 'Scrap Shield|buff|phys|shield|buff=armor amt=40 dur=30 cd=30',
      'Flame Turret|summon|fire|turret|sum=flameturret max=2', 'Drone|summon|light|drone|sum=drone max=2', 'Tesla Coil|summon|light|tesla|sum=tesla max=1 cd=10', 'Overclock|buff|light|aura|buff=as amt=30 dur=15 cd=25 party',
      'Rocket Turret|summon|fire|turret|sum=rocketturret max=1 cd=10', 'Shield Generator|zone|arcane|holy|r=1.6 dur=8 heal cd=15', 'Combat Drones|summon|phys|drone|sum=drone n=3 dur=15 cd=20', 'Laser Fence|wall|light|storm|dur=6',
      'Mech Suit|buff|phys|transform|transform buff=armor,dmg amt=50 dur=20 cd=50', 'Cryo Turret|summon|cold|turret|sum=cryoturret max=1 cd=10', 'Gravity Mine|trap|arcane|mine|pull n=3', 'Bomb Drones|summon|fire|drone|sum=bombdrone n=4 dur=10 cd=15',
      'Death Machine|summon|fire|mech|sum=mech max=1 cd=60', 'Satellite Laser|beam|light|laser|dur=3 dmg=1.8 cd=6', 'Turret Fortress|summon|phys|turret|sum=turret n=4 dur=15 cd=40', 'Overdrive|buff|light|transform|buff=dmg,as,cdr amt=50 party dur=15 cd=60',
    ],
  ],
};
// every class gets a fourth tree (data/skilltrees4.js); the Necromancer's and Dragoon's are already in
for (const [c, tree] of Object.entries(TREE4)) if (SKILLDATA[c].length === 3) SKILLDATA[c].push(tree);
