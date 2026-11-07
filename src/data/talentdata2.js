// Bespoke 5-Tier Branching Talent Trees (Part 2: Classes 10–17)
// Rows: 0 (Lv 1, 5 ranks), 1A/1B (Lv 10, 3 ranks), 2 (Lv 20, 5 ranks), 3A/3B (Lv 30, 3 ranks), 4A/4B (Lv 45, 1 rank).

export const TALENT_DATA_2 = {
  // =========================================================================
  // 10. CARRION WITCH — Pestilence Hive / Murder of Crows / Hexes & Moon
  // =========================================================================
  carrion_witch: [
    {
      name: 'Pestilence Hive',
      el: 'poison',
      nodes: [
        {
          key: 'festering_ichor', row: 0, maxRank: 5, el: 'poison', fx: 'locust',
          name: 'Putrid Brew',
          stats: { poisonPct: 6, int: 3, castSpeed: 2.5 },
          desc: (r) => `+${r * 6}% Poison Damage, +${r * 3} Intelligence, and +${(r * 2.5).toFixed(1)}% Cast Speed.`,
        },
        {
          key: 'devouring_locusts', row: 1, choice: 'A', maxRank: 3, el: 'poison', fx: 'locust',
          name: 'Ravenous Swarm',
          stats: { lifeSteal: 1.5 },
          morph: {
            skills: ['Rot Bolt', 'Locust Swarm', 'Pestilent Spray', 'Infest'],
            extraNPerRank: 1, leech: true, slow: true, dmgPct: 7,
            label: (r) => `+${r} Swarm/Bolt, Leeches Life & Slows (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Rot Bolt, Locust Swarm, Pestilent Spray & Infest:</b> Unleashes <b>+${r}</b> extra bolt/swarm, slows enemies, and leeches Life (+${r * 7}% damage).`,
        },
        {
          key: 'caustic_bile', row: 1, choice: 'B', maxRank: 3, el: 'acid', fx: 'blob',
          name: 'Caustic Bile',
          stats: { acidPct: 6 },
          morph: {
            skills: ['Plague Cloud', 'Corpse Burst', 'Rain of Rot', 'Pandemic'],
            el: 'acid', areaPct: 14, dmgPct: 8,
            label: (r) => `Acid conversion (shreds armor) & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Plague Cloud, Corpse Burst, Rain of Rot & Pandemic:</b> Converts to <b>Acid</b> (melting enemy defenses) across +${r * 14}% wider AoE (+${r * 8}% damage).`,
        },
        {
          key: 'miasma_veil', row: 2, maxRank: 5, el: 'poison', fx: 'blob',
          name: 'Spore Shroud',
          stats: { resPoison: 7, lifePct: 3, cdr: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 7}% Poison Resist, +${r * 3}% Max Life, +${r * 3}% Cooldown Reduction, and +${r * 4}% Rot & Swarm Skill Damage.`,
        },
        {
          key: 'broodmother_hives', row: 3, choice: 'A', maxRank: 3, el: 'poison', fx: 'locust',
          name: 'Brood Colonies',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Hive Mother', "Witch's Cauldron"],
            extraN: 1, extraMax: 1, summonHpPct: 25, summonDmgPct: 20,
            label: (r) => `+1 Hive/Cauldron (+${r * 25}% HP, +${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Hive Mother & Witch's Cauldron:</b> Spawns <b>+1 additional Hive or Cauldron</b> with +${r * 25}% Life and +${r * 20}% Damage.`,
        },
        {
          key: 'plague_vortex', row: 3, choice: 'B', maxRank: 3, el: 'poison', fx: 'void',
          name: 'Choking Contagion',
          stats: { poisonPct: 6 },
          morph: {
            skills: ['Plague Cloud', 'Pandemic', 'Witchlight Zone'],
            pull: true, durPct: 22, dmgPct: 9,
            label: (r) => `Pulls foes into cloud & +${r * 22}% Duration`,
          },
          desc: (r) => `<b>Morph — Plague Cloud, Pandemic & Witchlight Zone:</b> Draws nearby foes into the pestilence and extends duration by +${r * 22}% (+${r * 9}% damage).`,
        },
        {
          key: 'plague_matriarch', row: 4, choice: 'A', maxRank: 1, el: 'poison', fx: 'locust',
          name: 'Queen of the Swarm',
          stats: { poisonPct: 32, acidPct: 32, areaPct: 20 },
          onKill: { status: 'poison', el: 'poison', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +32% Poison & Acid Damage and +20% Area Size. Poisoned foes burst into virulent swarms on death for 22% Max Life.`,
        },
        {
          key: 'bog_immortal_key', row: 4, choice: 'B', maxRank: 1, el: 'poison', fx: 'crow',
          name: 'Hag of the Black Bog',
          stats: { lifePct: 18, reduce: 8, lifeSteal: 4 },
          cheatDeath: { name: 'SWAMP REBIRTH!', el: 'poison', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +18% Max Life, +8% Damage Reduction, and +4% Life Steal. Fatal blows trigger <b>Swamp Rebirth</b>, dissolving into locusts and restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Murder of Crows',
      el: 'shadow',
      nodes: [
        {
          key: 'black_feathers', row: 0, maxRank: 5, el: 'shadow', fx: 'crow',
          name: 'Razor Plumes',
          stats: { shadowPct: 5, physPct: 4, critChance: 2 },
          desc: (r) => `+${r * 5}% Shadow Damage, +${r * 4}% Physical Damage, and +${r * 2}% Critical Chance.`,
        },
        {
          key: 'razor_talons', row: 1, choice: 'A', maxRank: 3, el: 'blood', fx: 'crow',
          name: 'Bloodbeak Flock',
          stats: { bloodPct: 5 },
          morph: {
            skills: ['Crow Swarm', 'Eye Gouge', 'Feather Blades', 'Moon Moths'],
            extraNPerRank: 1, bleed: true, pierce: true, dmgPct: 7,
            label: (r) => `+${r} Piercing Bird/Blade & inflicts Bleed`,
          },
          desc: (r) => `<b>Morph — Crow Swarm, Eye Gouge, Feather Blades & Moon Moths:</b> Adds <b>+${r}</b> piercing projectile${r > 1 ? 's' : ''} and inflicts Bleeding (+${r * 7}% damage).`,
        },
        {
          key: 'coven_ravens', row: 1, choice: 'B', maxRank: 3, el: 'shadow', fx: 'crow',
          name: 'Coven Familiars',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Raven Familiar'],
            extraN: 1, extraMax: 2, summonHpPct: 25, summonDmgPct: 20,
            label: (r) => `+2 Max Ravens (+${r * 25}% HP, +${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Raven Familiar:</b> Calls <b>+1 extra Raven per cast (+2 max flock)</b> with +${r * 25}% Life and +${r * 20}% Damage.`,
        },
        {
          key: 'carrion_feast', row: 2, maxRank: 5, el: 'shadow', fx: 'crow',
          name: 'Carrion Feast',
          stats: { critDmg: 9, moveSpeed: 3, summonPct: 5 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 9}% Crit Damage, +${r * 3}% Move Speed, +${r * 5}% Companion Power, and +${r * 4}% Murder of Crows Skill Damage.`,
        },
        {
          key: 'nevermore_storm', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'crow',
          name: 'Blackout Tornado',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Murder of Crows', 'Unkindness', 'Nevermore', 'Eclipse of Wings'],
            extraNPerRank: 1, leech: true, pull: true, dmgPct: 8,
            label: (r) => `+${r} Crow Cyclone/Wave, Pulls & Leeches Life`,
          },
          desc: (r) => `<b>Morph — Murder of Crows, Unkindness, Nevermore & Eclipse of Wings:</b> Spawns +${r} cyclone/wave, pulls foes in, and leeches Life (+${r * 8}% damage).`,
        },
        {
          key: 'nightwing_escape', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'feather',
          name: 'Corvid Step',
          stats: { cdr: 4 },
          morph: {
            skills: ['Feathered Cloak', 'Night Wings'],
            cdPct: 12, novaOnCast: 'shadow', healPct: 4,
            label: (r) => `-${r * 12}% Cooldown, Shadow Nova & heals ${r * 4}% Life`,
          },
          desc: (r) => `<b>Morph — Feathered Cloak & Night Wings:</b> Reduces cooldown by ${r * 12}%, unleashes a burst of razor feathers, and heals ${r * 4}% Max Life.`,
        },
        {
          key: 'queen_of_crows_key', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'crow',
          name: 'Morrigan Sovereign',
          stats: { shadowPct: 30, summonPct: 35, critChance: 10 },
          morph: {
            tree: 1, curse: 'mark', dmgPct: 16,
            label: () => 'Marks pecked foes & +16% Crow Skill Damage',
          },
          desc: () => `<b>Keystone:</b> +30% Shadow Damage, +35% Companion Power, and +10% Crit Chance. All Murder of Crows skills Mark targets and deal +16% damage.`,
        },
        {
          key: 'moonlit_coven_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'star',
          name: 'High Priestess of the Moon',
          stats: { arcanePct: 28, shadowPct: 25, castSpeed: 15 },
          morph: {
            tree: 3, dmgPct: 18, areaPct: 20,
            label: () => '+18% Mooncraft Damage & +20% Lunar Radius',
          },
          desc: () => `<b>Keystone:</b> +28% Arcane Damage, +25% Shadow Damage, and +15% Cast Speed. All Mooncraft rituals gain +20% radius and +18% damage.`,
        },
      ],
    },
    {
      name: 'Hexcraft & Moon',
      el: 'arcane',
      nodes: [
        {
          key: 'evil_eye', row: 0, maxRank: 5, el: 'shadow', fx: 'void',
          name: 'Wicked Eye',
          stats: { shadowPct: 5, arcanePct: 5, cdr: 2.5 },
          desc: (r) => `+${r * 5}% Shadow & Arcane Damage and +${(r * 2.5).toFixed(1)}% Cooldown Reduction.`,
        },
        {
          key: 'soul_pins', row: 1, choice: 'A', maxRank: 3, el: 'shadow', fx: 'skull',
          name: 'Piercing Needles',
          stats: { critDmg: 9 },
          morph: {
            skills: ['Hex Bolt', 'Moonlit Hex', 'Voodoo Doll'],
            extraBounce: 2, curse: 'amp', dmgPct: 8,
            label: (r) => `+${r * 2} Bounces, applies Amplify Damage (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Hex Bolt, Moonlit Hex & Voodoo Doll:</b> Bounces/chains <b>+${r * 2}</b> extra times, brands targets with Amplify Damage, and deals +${r * 8}% damage.`,
        },
        {
          key: 'scarecrow_effigy', row: 1, choice: 'B', maxRank: 3, el: 'shadow', fx: 'totem',
          name: 'Haunted Effigies',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Effigy Totem', 'Lantern Procession', 'Gravecall'],
            extraN: 1, extraMax: 1, summonHpPct: 30, fear: true,
            label: (r) => `+1 Effigy/Lantern (+${r * 30}% HP) & Terrifies`,
          },
          desc: (r) => `<b>Morph — Effigy Totem, Lantern Procession & Gravecall:</b> Conjures <b>+1 additional totem/spirit</b> with +${r * 30}% Life.`,
        },
        {
          key: 'witching_echo', row: 2, maxRank: 5, el: 'arcane', fx: 'void',
          name: 'Midnight Chant',
          stats: { echoChance: 2, bossDmg: 5, manaRegenPct: 6 },
          skillMult: { tree: [2, 3], pct: 4 },
          desc: (r) => `+${r * 2}% Spell Echo, +${r * 5}% Boss Damage, +${r * 6}% Mana Regen, and +${r * 4}% Hexcraft & Mooncraft Damage.`,
        },
        {
          key: 'blood_moon_ritual', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'void',
          name: 'Crimson Sabbath',
          stats: { bloodPct: 6 },
          morph: {
            skills: ['Withering Hex', 'Blood Hex', 'Mass Hysteria', 'Blood Moon Hex'],
            novaOnCast: 'shadow', healPct: 4, durPct: 20,
            label: (r) => `Shadow Blast on cast, heals ${r * 4}% Life & +${r * 20}% Dur`,
          },
          desc: (r) => `<b>Morph — Withering Hex, Blood Hex, Mass Hysteria & Blood Moon Hex:</b> Detonates a Shadow Nova on cursed foes, heals ${r * 4}% Max Life, and lasts +${r * 20}% longer.`,
        },
        {
          key: 'lunar_cataclysm', row: 3, choice: 'B', maxRank: 3, el: 'arcane', fx: 'star',
          name: 'Crushing Moonfall',
          stats: { arcanePct: 6 },
          morph: {
            skills: ['Witching Hour', 'Grave Moon Rising', 'Moonfall Cataclysm'],
            pull: true, stun: true, cdPct: 10, dmgPct: 10,
            label: (r) => `Pulls foes in, Stuns, -${r * 10}% CD & +${r * 10}% Dmg`,
          },
          desc: (r) => `<b>Morph — Witching Hour, Grave Moon Rising & Moonfall Cataclysm:</b> Pulls enemies under the falling moon, stuns them, and cuts cooldown by ${r * 10}% (+${r * 10}% damage).`,
        },
        {
          key: 'grand_coven_key', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'skull',
          name: 'Mother of Hexes',
          stats: { shadowPct: 30, cdr: 16, bossDmg: 28 },
          morph: {
            tree: 2, curse: 'weaken', dmgPct: 18,
            label: () => 'Weakens cursed foes & deals +18% Hex Damage',
          },
          desc: () => `<b>Keystone:</b> +30% Shadow Damage, +16% Cooldown Reduction, and +28% Boss Damage. All Hexes also inflict Weaken and deal +18% damage.`,
        },
        {
          key: 'puppeteer_master_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'void',
          name: 'Threads of Fate',
          stats: { echoChance: 14, castSpeed: 16, resAll: 14 },
          desc: () => `<b>Keystone:</b> Weaves fate twice over: +14% Spell Echo Chance, +16% Cast Speed, and +14% All Resistances.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 11. BARD — Virtuoso Ballads / Heavy Metal Resonance / Showstopper
  // =========================================================================
  bard: [
    {
      name: 'Virtuoso Choir',
      el: 'holy',
      nodes: [
        {
          key: 'silver_strings', row: 0, maxRank: 5, el: 'holy', fx: 'note',
          name: 'Golden Resonance',
          stats: { holyPct: 5, castSpeed: 3.5, manaRegenPct: 6 },
          desc: (r) => `+${r * 5}% Holy Damage, +${(r * 3.5).toFixed(1)}% Cast Speed, and +${r * 6}% Mana Regeneration.`,
        },
        {
          key: 'harmonic_chords', row: 1, choice: 'A', maxRank: 3, el: 'holy', fx: 'note',
          name: 'Polyphonic Arpeggio',
          stats: { holyPct: 4 },
          morph: {
            skills: ['Plucked Note', 'Bright Note', 'Rhapsody Nova'],
            extraNPerRank: 1, home: true, dmgPct: 7,
            label: (r) => `+${r} Homing Note(s)/Wave (+${r * 7}% Damage)`,
          },
          desc: (r) => `<b>Morph — Plucked Note, Bright Note & Rhapsody Nova:</b> Plays <b>+${r}</b> additional homing note${r > 1 ? 's' : ''} and deals +${r * 7}% damage.`,
        },
        {
          key: 'soothing_anthem', row: 1, choice: 'B', maxRank: 3, el: 'holy', fx: 'note',
          name: 'Restorative Anthem',
          stats: { lifeRegen: 4, cdr: 3 },
          morph: {
            skills: ['Hymn of Mending', 'Ballad of Valor', 'Song of Swiftness', 'Spotlight'],
            novaOnCast: 'holy', healPct: 4, durPct: 22,
            label: (r) => `Radiant Pulse on cast, heals ${r * 4}% Life & +${r * 22}% Dur`,
          },
          desc: (r) => `<b>Morph — Hymn of Mending, Ballad of Valor, Song of Swiftness & Spotlight:</b> Pulses a damaging Holy ring, restores ${r * 4}% Max Life, and extends duration by +${r * 22}%.`,
        },
        {
          key: 'standing_ovation', row: 2, maxRank: 5, el: 'holy', fx: 'note',
          name: 'Standing Ovation',
          stats: { critChance: 2, summonPct: 6, resAll: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 6}% Choir Power, +${r * 3}% All Resistances, and +${r * 4}% Ballads Skill Damage.`,
        },
        {
          key: 'angelic_choir', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'spirit',
          name: 'Grand Ensemble',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Chorus of Spirits', 'Backup Singers'],
            extraN: 1, extraMax: 1, summonHpPct: 25, summonDmgPct: 20,
            label: (r) => `+1 Singer per cast (+${r * 25}% HP, +${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Chorus of Spirits & Backup Singers:</b> Summons <b>+1 additional singer</b> (+1 max cap) with +${r * 25}% Life and +${r * 20}% Damage.`,
        },
        {
          key: 'requiem_dirge', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Requiem of Sorrow',
          stats: { shadowPct: 6, lightPct: 5 },
          morph: {
            skills: ['Dirge of Sorrow', 'Symphony of Storms', 'Magnum Opus'],
            curse: 'amp', pull: true, areaPct: 15, dmgPct: 8,
            label: (r) => `Pulls foes in, Amplifies Damage & +${r * 15}% AoE`,
          },
          desc: (r) => `<b>Morph — Dirge of Sorrow, Symphony of Storms & Magnum Opus:</b> Draws enemies inward, amplifies damage taken, and widens area by +${r * 15}% (+${r * 8}% damage).`,
        },
        {
          key: 'maestro_immortal', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'note',
          name: 'Celestial Maestro',
          stats: { holyPct: 28, echoChance: 12, cdr: 14 },
          desc: () => `<b>Keystone:</b> +28% Holy Damage, +12% Spell Echo Chance, and +14% Cooldown Reduction — your phrases echo across the hall.`,
        },
        {
          key: 'encore_cheat_key', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'light',
          name: 'Final Encore',
          stats: { lifePct: 18, resAll: 14, moveSpeed: 12 },
          cheatDeath: { name: 'ENCORE!', el: 'holy', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +18% Max Life, +14% All Resistances, and +12% Move Speed. Fatal damage triggers <b>Final Encore</b>, healing to 45% Max Life in a blinding spotlight (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Thunderous Riff',
      el: 'light',
      nodes: [
        {
          key: 'overdrive', row: 0, maxRank: 5, el: 'light', fx: 'sonic',
          name: 'Overdrive Amp',
          stats: { lightPct: 5, arcanePct: 5, critDmg: 7 },
          desc: (r) => `+${r * 5}% Lightning & Arcane Damage and +${r * 7}% Critical Damage.`,
        },
        {
          key: 'reverb_chords', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'sonic',
          name: 'Reverb & Distortion',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Power Chord', 'Echo', 'Shockwave Riff', 'Crescendo Wave'],
            extraBounce: 2, pierce: true, stun: true, dmgPct: 7,
            label: (r) => `Pierces, +${r * 2} Ricochets & Stuns (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Power Chord, Echo, Shockwave Riff & Crescendo Wave:</b> Chords pierce, bounce <b>+${r * 2}</b> extra times, and stun enemies (+${r * 7}% damage).`,
        },
        {
          key: 'thunder_stack', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'totem',
          name: 'Stadium Stack',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Amplifier Pylon', 'Drum Roll'],
            sumSwap: 'drum', extraN: 1, extraMax: 1, summonDmgPct: 20,
            label: (r) => `Deploys +1 Thunder Drum (+${r * 20}% Sonic Nova Dmg)`,
          },
          desc: (r) => `<b>Morph — Amplifier Pylon & Drum Roll:</b> Deploys booming <b>Thunder Drums</b> (+1 max stack) with +${r * 20}% sonic damage.`,
        },
        {
          key: 'sonic_pressure', row: 2, maxRank: 5, el: 'arcane', fx: 'sonic',
          name: 'Wall of Decibels',
          stats: { areaPct: 4, castSpeed: 3, bossDmg: 4 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 4}% Area Size, +${r * 3}% Cast Speed, +${r * 4}% Boss Damage, and +${r * 4}% Resonance Skill Damage.`,
        },
        {
          key: 'subwoofer_quake', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'sonic',
          name: 'Sub-Bass Implosion',
          stats: { arcanePct: 6 },
          morph: {
            skills: ['Bass Drop', 'Mic Drop', 'Sonic Boom', 'The Grand Finale'],
            pull: true, stun: true, areaPct: 16, dmgPct: 9,
            label: (r) => `Pulls crowd in, Stuns & +${r * 16}% Blast Radius`,
          },
          desc: (r) => `<b>Morph — Bass Drop, Mic Drop, Sonic Boom & The Grand Finale:</b> Sucks enemies inward before blasting and stunning them (+${r * 16}% AoE, +${r * 9}% damage).`,
        },
        {
          key: 'laser_lightshow', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'beam',
          name: 'Laser Lightshow',
          stats: { lightPct: 6 },
          morph: {
            skills: ['Resonance Beam', 'Feedback Loop', 'Wall of Sound'],
            el: 'light', leech: true, durPct: 20, dmgPct: 9,
            label: (r) => `Lightning conversion, Leeches Life & +${r * 20}% Dur`,
          },
          desc: (r) => `<b>Morph — Resonance Beam, Feedback Loop & Wall of Sound:</b> Electrifies into <b>Lightning</b>, leeches Life, and extends duration by +${r * 20}% (+${r * 9}% damage).`,
        },
        {
          key: 'rock_god_key', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'lightning',
          name: 'Thunderstruck Legend',
          stats: { lightPct: 30, critChance: 10, critDmg: 45 },
          morph: {
            tree: [1, 3], curse: 'mark', dmgPct: 16,
            label: () => 'Marks enemies & +16% Resonance/Virtuoso Damage',
          },
          desc: () => `<b>Keystone:</b> +30% Lightning Damage, +10% Crit Chance, and +45% Crit Damage. Resonance and Virtuoso skills Mark enemies and deal +16% damage.`,
        },
        {
          key: 'feedback_cascade_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'sonic',
          name: 'Infinite Feedback',
          stats: { arcanePct: 30, castSpeed: 18, manaSteal: 4 },
          desc: () => `<b>Keystone:</b> +30% Arcane Damage, +18% Cast Speed, and +4% Mana Steal for relentless spell-weaving.`,
        },
      ],
    },
    {
      name: 'Dashing Showman',
      el: 'fire',
      nodes: [
        {
          key: 'flair', row: 0, maxRank: 5, el: 'phys', fx: 'blade',
          name: 'Stage Presence',
          stats: { dex: 3, moveSpeed: 3.5, firePct: 4 },
          desc: (r) => `+${r * 3} Dexterity, +${(r * 3.5).toFixed(1)}% Move Speed, and +${r * 4}% Fire Damage.`,
        },
        {
          key: 'trick_cards', row: 1, choice: 'A', maxRank: 3, el: 'arcane', fx: 'note',
          name: 'Razor Fan',
          stats: { critChance: 2 },
          morph: {
            skills: ['Fan of Notes', 'Dancing Notes'],
            extraNPerRank: 1, bleed: true, pierce: true, dmgPct: 7,
            label: (r) => `+${r} Piercing Note/Blade & inflicts Bleed`,
          },
          desc: (r) => `<b>Morph — Fan of Notes & Dancing Notes:</b> Throws/orbits <b>+${r}</b> razor-edged note${r > 1 ? 's' : ''} that pierce and cause Bleeding (+${r * 7}% damage).`,
        },
        {
          key: 'pyro_stage', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'explosion',
          name: 'Pyrotechnic Rig',
          stats: { firePct: 6 },
          morph: {
            skills: ['Pyrotechnics', 'Flashbang', 'Firework Finale', 'Stage Dive'],
            el: 'fire', burn: true, trail: 'fire', dmgPct: 8,
            label: (r) => `Leaves burning sparks, Ignites & +${r * 8}% Damage`,
          },
          desc: (r) => `<b>Morph — Pyrotechnics, Flashbang, Stage Dive & Firework Finale:</b> Leaves burning pyrotechnic embers on the floor and deals +${r * 8}% Fire damage.`,
        },
        {
          key: 'duelist_grace', row: 2, maxRank: 5, el: 'phys', fx: 'blade',
          name: 'Acrobatic Panache',
          stats: { atkSpeed: 4, critDmg: 8, block: 2 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 4}% Attack Speed, +${r * 8}% Crit Damage, +${r * 2}% Block, and +${r * 4}% Trickster Skill Damage.`,
        },
        {
          key: 'phantom_troupe', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'spirit',
          name: 'Illusionist Troupe',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Mirror Images', 'Smoke Screen'],
            extraN: 1, durPct: 25, cdPct: 10,
            label: (r) => `+1 Mirror Clone, +${r * 25}% Duration & -${r * 10}% CD`,
          },
          desc: (r) => `<b>Morph — Mirror Images & Smoke Screen:</b> Conjures <b>+1 additional Mirror Image</b>, extends duration by +${r * 25}%, and cuts cooldown by ${r * 10}%.`,
        },
        {
          key: 'swashbuckler_reset', row: 3, choice: 'B', maxRank: 3, el: 'phys', fx: 'blade',
          name: 'Daredevil Flourish',
          stats: { physPct: 6 },
          morph: {
            skills: ['Swashbuckle', 'Stage Dive', 'Bladestorm Waltz', 'Rock Legend'],
            resetOnKill: true, leech: true, dmgPct: 9,
            label: (r) => `Kills reset cooldown, Leeches Life (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Swashbuckle, Stage Dive & Bladestorm Waltz:</b> Slaying an enemy <b>resets cooldown</b>, leeches Life, and deals +${r * 9}% damage.`,
        },
        {
          key: 'grand_showman_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'explosion',
          name: 'Showstopper Finale',
          stats: { firePct: 30, areaPct: 22, cdr: 14 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +30% Fire Damage, +22% Area Size, and +14% Cooldown Reduction. Burning enemies explode in dazzling fireworks on death for 20% Max Life.`,
        },
        {
          key: 'blade_dancer_key', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'blade',
          name: 'Phantom Duelist',
          stats: { critChance: 12, atkSpeed: 16, dmgPct: 16 },
          desc: () => `<b>Keystone:</b> +12% Critical Chance, +16% Attack Speed, and +16% All Damage.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 12. SLIME LORD — Caustic Tide / Royal Brood / Colossal Mutation
  // =========================================================================
  slime_lord: [
    {
      name: 'Caustic Tide',
      el: 'acid',
      nodes: [
        {
          key: 'corrosive_enzymes', row: 0, maxRank: 5, el: 'acid', fx: 'blob',
          name: 'Corrosive Enzymes',
          stats: { acidPct: 6, poisonPct: 4, castSpeed: 3 },
          desc: (r) => `+${r * 6}% Acid Damage, +${r * 4}% Poison Damage, and +${r * 3}% Cast Speed.`,
        },
        {
          key: 'splitting_globs', row: 1, choice: 'A', maxRank: 3, el: 'acid', fx: 'blob',
          name: 'Mitotic Globs',
          stats: { acidPct: 5 },
          morph: {
            skills: ['Slime Ball', 'Primal Glob', 'Cell Split', 'Gloop Cannon'],
            extraNPerRank: 1, extraBounce: 1, dmgPct: 6,
            label: (r) => `+${r} Glob(s) & +${r} Bounce(s) (+${r * 6}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Slime Ball, Primal Glob, Cell Split & Gloop Cannon:</b> Spits <b>+${r}</b> extra glob${r > 1 ? 's' : ''} that bounce +${r} more time${r > 1 ? 's' : ''} (+${r * 6}% damage).`,
        },
        {
          key: 'napalm_sludge', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Thermite Sludge',
          stats: { firePct: 6 },
          morph: {
            skills: ['Slime Pool', 'Ooze Wave', 'Acid Rain', 'Acid Geyser'],
            el: 'fire', burn: true, areaPct: 12, dmgPct: 8,
            label: (r) => `Volatile Fire conversion, Ignites & +${r * 12}% AoE`,
          },
          desc: (r) => `<b>Morph — Slime Pool, Ooze Wave, Acid Rain & Acid Geyser:</b> Ignites into <b>Volatile Fire</b>, burning enemies across +${r * 12}% wider pools (+${r * 8}% damage).`,
        },
        {
          key: 'dissolve_armor', row: 2, maxRank: 5, el: 'acid', fx: 'blob',
          name: 'Melting Point',
          stats: { areaPct: 4, critChance: 2, bossDmg: 4 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 4}% Area Size, +${r * 2}% Crit Chance, +${r * 4}% Boss Damage, and +${r * 4}% Acidic Ooze Skill Damage.`,
        },
        {
          key: 'undertow_soup', row: 3, choice: 'A', maxRank: 3, el: 'acid', fx: 'void',
          name: 'Quicksand Mire',
          stats: { acidPct: 6 },
          morph: {
            skills: ['Primordial Soup', 'Primordial Flood', 'Primordial Singularity', 'Gelatinous Wall'],
            pull: true, slow: true, durPct: 22, dmgPct: 8,
            label: (r) => `Sucks foes into mire, Slows & +${r * 22}% Duration`,
          },
          desc: (r) => `<b>Morph — Gelatinous Wall, Primordial Soup, Flood & Singularity:</b> Drags enemies into the mire, slows them, and lasts +${r * 22}% longer (+${r * 8}% damage).`,
        },
        {
          key: 'cryo_gel', row: 3, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Subzero Gel',
          stats: { coldPct: 6 },
          morph: {
            skills: ['Sludge Beam', 'Viscous Orbs', 'Primeval Downpour'],
            el: 'cold', freeze: true, extraNPerRank: 1, dmgPct: 8,
            label: (r) => `Cryo-Gel conversion, Freezes & +${r} Orb/Stream`,
          },
          desc: (r) => `<b>Morph — Sludge Beam, Viscous Orbs & Primeval Downpour:</b> Supercools into <b>Cryo-Gel</b>, freezing foes solid and adding +${r} orb/wave (+${r * 8}% damage).`,
        },
        {
          key: 'abyssal_dissolver_key', row: 4, choice: 'A', maxRank: 1, el: 'acid', fx: 'blob',
          name: 'Universal Solvent',
          stats: { acidPct: 35, areaPct: 22, bossDmg: 25 },
          morph: {
            tree: [0, 3], curse: 'amp', dmgPct: 16,
            label: () => 'Melts defenses (Amplify) & +16% Ooze Damage',
          },
          desc: () => `<b>Keystone:</b> +35% Acid Damage, +22% Area Size, and +25% Boss Damage. Acidic Ooze and Primordial skills apply Amplify Damage and deal +16% damage.`,
        },
        {
          key: 'rainbow_cataclysm_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'orb',
          name: 'Chromatic Ooze',
          stats: { acidPct: 20, firePct: 20, coldPct: 20, poisonPct: 20, echoChance: 10 },
          desc: () => `<b>Keystone:</b> +20% Acid, Fire, Cold, and Poison Damage plus +10% Spell Echo Chance.`,
        },
      ],
    },
    {
      name: 'Royal Slime Court',
      el: 'poison',
      nodes: [
        {
          key: 'royal_jelly', row: 0, maxRank: 5, el: 'acid', fx: 'blob',
          name: 'Royal Jelly',
          stats: { summonPct: 8, lifePct: 3, cdr: 2 },
          desc: (r) => `+${r * 8}% Slime Court Damage & Life, +${r * 3}% Max Life, and +${r * 2}% Cooldown Reduction.`,
        },
        {
          key: 'ember_brood', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Crimson Berserker Brood',
          stats: { summonPct: 6, firePct: 4 },
          morph: {
            skills: ['Spawn Slimeling', 'Volatile Brood'],
            sumSwap: 'sl_berserker', summonDmgPct: 20, summonHpPct: 20,
            label: (r) => `Spawns Crimson Berserkers (+${r * 20}% HP & Dmg)`,
          },
          desc: (r) => `<b>Morph — Spawn Slimeling & Volatile Brood:</b> Breeds rolling, AoE-cleaving <b>Crimson Berserker</b> slimes with +${r * 20}% Life and Damage.`,
        },
        {
          key: 'gilded_brood', row: 1, choice: 'B', maxRank: 3, el: 'holy', fx: 'shield',
          name: 'Gilded Bulwark Court',
          stats: { summonPct: 6, armorPct: 5 },
          morph: {
            skills: ['Spawn Slimeling', 'Sap Mender'],
            sumSwap: 'sl_bulwark', summonHpPct: 35, healPct: 3,
            label: (r) => `Spawns Gilded Bulwark Tanks (+${r * 35}% HP)`,
          },
          desc: (r) => `<b>Morph — Spawn Slimeling & Sap Mender:</b> Summons taunting golden <b>Gilded Bulwarks</b> (+${r * 35}% HP) that shield you when hurt, and heals ${r * 3}% Life on cast.`,
        },
        {
          key: 'hivemind_synapse', row: 2, maxRank: 5, el: 'poison', fx: 'blob',
          name: 'Hivemind Link',
          stats: { summonPct: 7, resAll: 3, lifeRegen: 4 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 7}% Court Power, +${r * 3}% All Resistances, +${r * 4} Life/s, and +${r * 4}% Brood Spawning Skill Damage.`,
        },
        {
          key: 'caster_court', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Void Hexer Cabal',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Frost Sage', 'Prismatic Jelly', 'Mitosis'],
            sumSwap: 'sl_hexer', extraN: 1, extraMax: 1, summonDmgPct: 20,
            label: (r) => `+1 Void Hexer Slime (+${r * 20}% Curse/Orb Dmg)`,
          },
          desc: (r) => `<b>Morph — Frost Sage, Mitosis & Prismatic Jelly:</b> Spawns cursing, vortex-lobbing <b>Void Hexers</b> (+1 max cap, +${r * 20}% damage).`,
        },
        {
          key: 'titan_synthesis', row: 3, choice: 'B', maxRank: 3, el: 'acid', fx: 'blob',
          name: 'Colossal Fusion',
          stats: { lifePct: 5 },
          morph: {
            skills: ['Ooze Titan', 'Mother Ooze', 'Cannibalize'],
            summonHpPct: 35, summonDmgPct: 25, healPct: 5,
            label: (r) => `+${r * 35}% Titan/Mother HP, +${r * 25}% Dmg & Heals`,
          },
          desc: (r) => `<b>Morph — Ooze Titan, Mother Ooze & Cannibalize:</b> Grants your apex slimes +${r * 35}% Life and +${r * 25}% Damage, and restores ${r * 5}% Max Life on cast.`,
        },
        {
          key: 'endless_mitosis_key', row: 4, choice: 'A', maxRank: 1, el: 'acid', fx: 'blob',
          name: 'Legion of Gel',
          stats: { summonPct: 45, cdr: 14, lifePct: 15 },
          morph: {
            tree: 1, kind: 'summon', extraN: 1, extraMax: 2,
            label: () => '+1 Slime Spawned per cast & +2 Max Court Cap',
          },
          desc: () => `<b>Keystone:</b> +45% Slime Court Power, +14% Cooldown Reduction, and +15% Max Life. All Brood Spawning summons create +1 extra slime and gain +2 max cap.`,
        },
        {
          key: 'idol_choir_key', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'note',
          name: 'Serenade of Glymmora',
          stats: { summonPct: 35, atkSpeed: 15, castSpeed: 15, resAll: 12 },
          desc: () => `<b>Keystone:</b> Empowers you and your Royal Court with +35% Summon Power, +15% Attack & Cast Speed, and +12% All Resistances.`,
        },
      ],
    },
    {
      name: 'Apex Amoeba',
      el: 'phys',
      nodes: [
        {
          key: 'elastic_mass', row: 0, maxRank: 5, el: 'phys', fx: 'smash',
          name: 'Elastic Mass',
          stats: { vit: 4, lifePct: 4, armorPct: 5 },
          desc: (r) => `+${r * 4} Vitality, +${r * 4}% Max Life, and +${r * 5}% Armor.`,
        },
        {
          key: 'crushing_bounce', row: 1, choice: 'A', maxRank: 3, el: 'acid', fx: 'smash',
          name: 'Meteor Bounce',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Body Slam', 'Bounce', 'Rolling Blob'],
            stun: true, trail: 'acid', cdPct: 10, dmgPct: 8,
            label: (r) => `Leaves Acid Trail, Stuns & -${r * 10}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Body Slam, Bounce & Rolling Blob:</b> Leaves corrosive acid pools, stuns struck foes, and cuts cooldown by ${r * 10}% (+${r * 8}% damage).`,
        },
        {
          key: 'leeching_pseudopods', row: 1, choice: 'B', maxRank: 3, el: 'blood', fx: 'claw',
          name: 'Vampiric Pseudopods',
          stats: { lifeSteal: 2 },
          morph: {
            skills: ['Tendril Lash', 'Engulf', 'Devour Whole'],
            pull: true, leech: true, healPct: 3, dmgPct: 8,
            label: (r) => `Pulls prey in, Leeches & heals ${r * 3}% Life`,
          },
          desc: (r) => `<b>Morph — Tendril Lash, Engulf & Devour Whole:</b> Yanks enemies into your mass, leeches Life, and heals ${r * 3}% Max Life on cast (+${r * 8}% damage).`,
        },
        {
          key: 'rubbery_hide', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Shock-Absorbing Gel',
          stats: { reduce: 2, thorns: 22, lifeRegen: 4 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 2}% Damage Reduction, +${r * 22} Thorns, +${r * 4} Life/s, and +${r * 4}% Mutation Skill Damage.`,
        },
        {
          key: 'razor_spines', row: 3, choice: 'A', maxRank: 3, el: 'poison', fx: 'bone',
          name: 'Toxic Spines',
          stats: { thorns: 30, poisonPct: 5 },
          morph: {
            skills: ['Spike Mutation', 'Slime Armor', 'Jelly Rampart'],
            poison: true, extraNPerRank: 2, durPct: 20, dmgPct: 8,
            label: (r) => `+${r * 2} Spines, Poisons & +${r * 20}% Duration`,
          },
          desc: (r) => `<b>Morph — Spike Mutation, Slime Armor & Jelly Rampart:</b> Fires +${r * 2} venomous spines, poisons attackers, and extends duration by +${r * 20}%.`,
        },
        {
          key: 'kaiju_form', row: 3, choice: 'B', maxRank: 3, el: 'acid', fx: 'smash',
          name: 'Kaiju Overgrowth',
          stats: { dmgPct: 5, areaPct: 5 },
          morph: {
            skills: ['Colossal Form', 'Slime God', 'Slime Hivemind'],
            durPct: 25, novaOnCast: 'acid', healPct: 5,
            label: (r) => `+${r * 25}% Form Duration, Acid Nova & heals ${r * 5}% Life`,
          },
          desc: (r) => `<b>Morph — Colossal Form, Slime Hivemind & Slime God:</b> Erupts with an Acid Nova on cast, heals ${r * 5}% Max Life, and extends duration by +${r * 25}%.`,
        },
        {
          key: 'cell_regrowth_key', row: 4, choice: 'A', maxRank: 1, el: 'acid', fx: 'blob',
          name: 'Split & Reform',
          stats: { lifePct: 24, reduce: 8, resAll: 12 },
          cheatDeath: { name: 'REFORMED!', el: 'acid', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +24% Max Life, +8% Damage Reduction, and +12% All Resistances. Fatal damage splits and reforms your core at 45% Max Life (120s cooldown).`,
        },
        {
          key: 'juggernaut_blob_key', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'smash',
          name: 'Unstoppable Mass',
          stats: { physPct: 28, acidPct: 28, critDmg: 40 },
          desc: () => `<b>Keystone:</b> Crushes everything beneath sheer mass: +28% Physical & Acid Damage and +40% Critical Damage.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 13. BOOMERANG KNIGHT — Returning Glaives / Razor Gale / Tempest Orbit
  // =========================================================================
  boomerang_knight: [
    {
      name: 'Returning Glaives',
      el: 'phys',
      nodes: [
        {
          key: 'aerodynamics', row: 0, maxRank: 5, el: 'phys', fx: 'rang',
          name: 'Aerodynamic Edge',
          stats: { physPct: 5, projSpeed: 6, critChance: 2 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 6}% Projectile Speed, and +${r * 2}% Critical Chance.`,
        },
        {
          key: 'flame_chakrams', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Sunfire Chakrams',
          stats: { firePct: 6 },
          morph: {
            skills: ['Curved Boomerang', 'Twin Boomerangs', 'Chakram', 'Buzzsaw'],
            el: 'fire', burn: true, extraNPerRank: 1, dmgPct: 7,
            label: (r) => `Fire conversion, Ignites & +${r} Glaive(s)`,
          },
          desc: (r) => `<b>Morph — Curved Boomerang, Twin Boomerangs, Chakram & Buzzsaw:</b> Blazes with <b>Solar Fire</b>, ignites targets, and throws +${r} extra glaive (+${r * 7}% damage).`,
        },
        {
          key: 'voltaic_ricochet', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Voltaic Ricochet',
          stats: { lightPct: 6 },
          morph: {
            skills: ['Curved Boomerang', 'Seeking Rang', 'Ricochet Rang'],
            el: 'light', extraBounce: 2, home: true, dmgPct: 8,
            label: (r) => `Lightning conversion, Homing & +${r * 2} Ricochets`,
          },
          desc: (r) => `<b>Morph — Curved Boomerang, Seeking Rang & Ricochet Rang:</b> Electrifies into <b>Lightning</b>, homes onto targets, and bounces +${r * 2} extra times (+${r * 8}% damage).`,
        },
        {
          key: 'catch_tempo', row: 2, maxRank: 5, el: 'phys', fx: 'rang',
          name: 'Momentum Catch',
          stats: { atkSpeed: 4, critDmg: 8, dex: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 4}% Attack Speed, +${r * 8}% Crit Damage, +${r * 3} Dexterity, and +${r * 4}% Throwing Mastery Skill Damage.`,
        },
        {
          key: 'serrated_heavy', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'rang',
          name: 'Sawtooth Cleaver',
          stats: { bloodPct: 6, bossDmg: 5 },
          morph: {
            skills: ['Heavy Rang', 'Buzzsaw', 'Catch & Release', 'Horizon Rang'],
            bleed: true, stun: true, areaPct: 14, dmgPct: 9,
            label: (r) => `Inflicts Bleed & Stun, +${r * 14}% Size (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Heavy Rang, Buzzsaw, Catch & Release & Horizon Rang:</b> Inflicts heavy Bleeding and Stun with +${r * 14}% larger blades (+${r * 9}% damage).`,
        },
        {
          key: 'infinite_arc', row: 3, choice: 'B', maxRank: 3, el: 'arcane', fx: 'rang',
          name: 'Phantom Return',
          stats: { cdr: 4 },
          morph: {
            skills: ['Twin Boomerangs', 'Chakram', 'Horizon Rang'],
            pierce: true, cdPct: 12, leech: true, dmgPct: 8,
            label: (r) => `Pierces all, Leeches Life & -${r * 12}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Twin Boomerangs, Chakram & Horizon Rang:</b> Slices cleanly through every foe, leeches Life, and reduces cooldown by ${r * 12}% (+${r * 8}% damage).`,
        },
        {
          key: 'sky_arsenal_key', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'rang',
          name: 'Master of a Thousand Glaives',
          stats: { extraProj: 2, atkSpeed: 16, critDmg: 35 },
          desc: () => `<b>Keystone:</b> +2 Projectiles, +16% Attack Speed, and +35% Critical Damage — fills the air with returning steel.`,
        },
        {
          key: 'crimson_saw_key', row: 4, choice: 'B', maxRank: 1, el: 'blood', fx: 'rang',
          name: 'Red Horizon',
          stats: { physPct: 25, bloodPct: 25, lifeSteal: 5 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +25% Physical & Blood Damage and +5% Life Steal. Bleeding enemies shredded by your glaives rupture on death for 20% Max Life.`,
        },
      ],
    },
    {
      name: 'Bladedancer',
      el: 'phys',
      nodes: [
        {
          key: 'swift_steel', row: 0, maxRank: 5, el: 'phys', fx: 'blade',
          name: 'Whirling Footwork',
          stats: { atkSpeed: 4, moveSpeed: 3, str: 3 },
          desc: (r) => `+${r * 4}% Attack Speed, +${r * 3}% Move Speed, and +${r * 3} Strength.`,
        },
        {
          key: 'vacuum_slashes', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'spin',
          name: 'Cyclone Edge',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Cross Cut', 'Whirling Slash', 'Blade Flurry', 'Bladestorm Dance'],
            pull: true, leech: true, dmgPct: 8,
            label: (r) => `Pulls foes into blades & Leeches Life (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Cross Cut, Whirling Slash, Blade Flurry & Bladestorm Dance:</b> Draws nearby enemies into your spin, leeches Life, and deals +${r * 8}% damage.`,
        },
        {
          key: 'wind_crescents', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'blade',
          name: 'Storm Crescents',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Cross Cut', 'Wind Slash', 'Razor Wind Arc'],
            el: 'light', waveProj: { fx: 'blade', el: 'light', nPerRank: 1, dmgMul: 0.42 }, dmgPct: 7,
            label: (r) => `Launches ${r} Lightning Wind-Blade(s) (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Cross Cut, Wind Slash & Razor Wind Arc:</b> Converts to <b>Lightning</b> and fires ${r} piercing wind-blade${r > 1 ? 's' : ''} (+${r * 7}% damage).`,
        },
        {
          key: 'parry_ward', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Deflecting Gyre',
          stats: { block: 3, armorPct: 5, critChance: 2 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 3}% Block Chance, +${r * 5}% Armor, +${r * 2}% Crit Chance, and +${r * 4}% Bladedancer Skill Damage.`,
        },
        {
          key: 'guillotine_execution', row: 3, choice: 'A', maxRank: 3, el: 'phys', fx: 'slash',
          name: 'Relentless Rush',
          stats: { bossDmg: 6 },
          morph: {
            skills: ['Gale Rush', 'Tempest Dash', "Executioner's Guillotine"],
            resetOnKill: true, bleed: true, dmgPct: 10,
            label: (r) => `Kills reset cooldown & inflict Bleed (+${r * 10}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Gale Rush, Tempest Dash & Executioner's Guillotine:</b> Slaying a foe <b>resets cooldown</b>, inflicts Bleed, and deals +${r * 10}% damage.`,
        },
        {
          key: 'orbiting_guard', row: 3, choice: 'B', maxRank: 3, el: 'arcane', fx: 'rang',
          name: 'Ring of Steel',
          stats: { reduce: 2 },
          morph: {
            skills: ['Blade Barrier', 'Orbiting Rang', 'Chakram Shield', 'Tri-Chakram Orbit'],
            extraNPerRank: 1, durPct: 25, dmgPct: 8,
            label: (r) => `+${r} Orbiting Chakram(s) & +${r * 25}% Duration`,
          },
          desc: (r) => `<b>Morph — Blade Barrier, Orbiting Rang, Chakram Shield & Tri-Chakram Orbit:</b> Adds <b>+${r}</b> orbiting blade${r > 1 ? 's' : ''} and extends duration by +${r * 25}%.`,
        },
        {
          key: 'dervish_key', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'spin',
          name: 'Eternal Dervish',
          stats: { atkSpeed: 20, moveSpeed: 15, dmgPct: 18 },
          desc: () => `<b>Keystone:</b> +20% Attack Speed, +15% Movement Speed, and +18% All Damage.`,
        },
        {
          key: 'gale_rebirth_key', row: 4, choice: 'B', maxRank: 1, el: 'cold', fx: 'shield',
          name: 'Second Wind',
          stats: { lifePct: 18, block: 12, resAll: 12 },
          cheatDeath: { name: 'SECOND WIND!', el: 'cold', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +18% Max Life, +12% Block, and +12% All Resistances. Fatal blows trigger <b>Second Wind</b>, knocking back attackers and restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Tempest Sovereign',
      el: 'cold',
      nodes: [
        {
          key: 'jetstream', row: 0, maxRank: 5, el: 'cold', fx: 'frost',
          name: 'Howling Jetstream',
          stats: { coldPct: 5, lightPct: 5, cdr: 2.5 },
          desc: (r) => `+${r * 5}% Cold & Lightning Damage and +${(r * 2.5).toFixed(1)}% Cooldown Reduction.`,
        },
        {
          key: 'arctic_twisters', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'blizzard',
          name: 'Arctic Cyclones',
          stats: { coldPct: 5 },
          morph: {
            skills: ['Gust', 'Wind Spout', 'Razor Tornado', 'Slicing Maelstrom'],
            el: 'cold', freeze: true, extraNPerRank: 1, dmgPct: 7,
            label: (r) => `Frost conversion, Freezes & +${r} Tornado(es)`,
          },
          desc: (r) => `<b>Morph — Gust, Wind Spout, Razor Tornado & Slicing Maelstrom:</b> Chills into <b>Arctic Frost</b>, freezes foes, and spawns +${r} extra cyclone (+${r * 7}% damage).`,
        },
        {
          key: 'vacuum_vortex', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Storm Eye',
          stats: { lightPct: 5, areaPct: 5 },
          morph: {
            skills: ['Gale Vortex', 'Eye of the Hurricane', 'Cataclysmic Typhoon', 'Supernova Vortex'],
            el: 'light', pull: true, areaPct: 15, dmgPct: 8,
            label: (r) => `Lightning Vortex, Pulls foes & +${r * 15}% AoE`,
          },
          desc: (r) => `<b>Morph — Gale Vortex, Eye of the Hurricane, Cataclysmic Typhoon & Supernova Vortex:</b> Electrifies with <b>Lightning</b>, pulls packs inward, and widens AoE by +${r * 15}%.`,
        },
        {
          key: 'tailwind_grace', row: 2, maxRank: 5, el: 'light', fx: 'lightning',
          name: 'Eye of the Gale',
          stats: { castSpeed: 3.5, critChance: 2, resCold: 6 },
          skillMult: { tree: [2, 3], pct: 4 },
          desc: (r) => `+${(r * 3.5).toFixed(1)}% Cast Speed, +${r * 2}% Crit Chance, +${r * 6}% Cold Resist, and +${r * 4}% Windcaller & Tempest Skill Damage.`,
        },
        {
          key: 'razor_squall', row: 3, choice: 'A', maxRank: 3, el: 'phys', fx: 'rang',
          name: 'Shredding Squall',
          stats: { critDmg: 10 },
          morph: {
            skills: ['Sky Cutter', 'Blade Ring Nova', 'Razor Ring Fissure'],
            extraNPerRank: 1, bleed: true, dmgPct: 9,
            label: (r) => `+${r} Ring/Wave & inflicts Bleed (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Sky Cutter, Blade Ring Nova & Razor Ring Fissure:</b> Unleashes +${r} extra ring/crack and inflicts heavy Bleeding (+${r * 9}% damage).`,
        },
        {
          key: 'zephyr_mantle', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'shield',
          name: 'Sanctified Tailwind',
          stats: { moveSpeed: 5 },
          morph: {
            skills: ['Tailwind Aura', 'Gale Barrier', 'Tempest Sovereign'],
            durPct: 25, healPct: 4, novaOnCast: 'cold',
            label: (r) => `+${r * 25}% Duration, heals ${r * 4}% Life & Gale Burst`,
          },
          desc: (r) => `<b>Morph — Tailwind Aura, Gale Barrier & Tempest Sovereign:</b> Blasts a chilling gale on cast, heals ${r * 4}% Max Life, and lasts +${r * 25}% longer.`,
        },
        {
          key: 'lord_of_winds_key', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'lightning',
          name: 'Avatar of the Typhoon',
          stats: { coldPct: 28, lightPct: 28, areaPct: 22 },
          onKill: { status: 'chill', el: 'cold', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +28% Cold & Lightning Damage and +22% Area Size. Chilled enemies shatter into razor wind on death for 20% Max Life.`,
        },
        {
          key: 'chakram_overload_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'rang',
          name: 'Perpetual Gyre',
          stats: { cdr: 16, echoChance: 12, dmgPct: 16 },
          morph: {
            tree: 3, extraN: 1, durPct: 30,
            label: () => '+1 Tempest Ring/Chakram & +30% Orbit Duration',
          },
          desc: () => `<b>Keystone:</b> +16% Cooldown Reduction, +12% Echo Chance, and +16% All Damage. All Tempest Chakram skills conjure +1 blade and last +30% longer.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 14. LANCER — Vanguard Joust / Phalanx Bulwark / Grand Knight Order
  // =========================================================================
  lancer: [
    {
      name: 'Vanguard Joust',
      el: 'light',
      nodes: [
        {
          key: 'couched_lance', row: 0, maxRank: 5, el: 'phys', fx: 'spear',
          name: 'Couched Momentum',
          stats: { physPct: 5, lightPct: 4, str: 3 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 4}% Lightning Damage, and +${r * 3} Strength.`,
        },
        {
          key: 'trampling_charge', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'spear',
          name: 'Breakthrough Charge',
          stats: { moveSpeed: 4 },
          morph: {
            skills: ['Lance Charge', 'Valiant Leap', 'Phalanx Leap'],
            resetOnKill: true, stun: true, dmgPct: 9,
            label: (r) => `Kills reset Charge/Leap CD & Stuns (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Lance Charge, Valiant Leap & Phalanx Leap:</b> Slaying an enemy <b>resets cooldown</b>, stuns targets on impact, and deals +${r * 9}% damage.`,
        },
        {
          key: 'blazing_joust', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Solar Joust',
          stats: { firePct: 5, holyPct: 4 },
          morph: {
            skills: ['Lance Charge', 'Sweeping Cleave', 'Sunspear'],
            el: 'fire', trail: 'fire', burn: true, dmgPct: 8,
            label: (r) => `Blazing Fire wake, Ignites & +${r * 8}% Damage`,
          },
          desc: (r) => `<b>Morph — Lance Charge, Sweeping Cleave & Sunspear:</b> Converts to <b>Solar Fire</b>, leaves a scorching trail, and deals +${r * 8}% damage.`,
        },
        {
          key: 'impaler_precision', row: 2, maxRank: 5, el: 'light', fx: 'spear',
          name: 'Heartpiercer',
          stats: { critChance: 2.5, critDmg: 8, atkSpeed: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${(r * 2.5).toFixed(1)}% Crit Chance, +${r * 8}% Crit Damage, +${r * 3}% Attack Speed, and +${r * 4}% Lance Vanguard Skill Damage.`,
        },
        {
          key: 'storm_bolts_lance', row: 3, choice: 'A', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Thunderlance Conduit',
          stats: { lightPct: 6 },
          morph: {
            skills: ['Lance Thrust', 'Lance Barrage', 'Storm Lance', 'Radiant Thrust'],
            waveProj: { fx: 'spear', el: 'light', nPerRank: 1, dmgMul: 0.42 }, dmgPct: 7,
            label: (r) => `Fires ${r} piercing Lightning Spear(s) per thrust`,
          },
          desc: (r) => `<b>Morph — Lance Thrust, Radiant Thrust, Lance Barrage & Storm Lance:</b> Launches ${r} piercing lightning javelin${r > 1 ? 's' : ''} alongside your thrusts (+${r * 7}% damage).`,
        },
        {
          key: 'prism_beam_lance', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'beam',
          name: 'Longinus Ray',
          stats: { holyPct: 6, bossDmg: 5 },
          morph: {
            skills: ['Lance of Light', 'Lance of Ruin', 'Prismatic Lance', 'Final Lance'],
            pierce: true, leech: true, areaPct: 15, dmgPct: 9,
            label: (r) => `Leeches Life, +${r * 15}% Width & +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Lance of Light, Lance of Ruin, Prismatic Lance & Final Lance:</b> Leeches Life, widens beam/blast by +${r * 15}%, and deals +${r * 9}% damage.`,
        },
        {
          key: 'spear_of_destiny_key', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'spear',
          name: 'Paragon of the Sunlance',
          stats: { holyPct: 28, lightPct: 28, critDmg: 40 },
          morph: {
            tree: [0, 3], curse: 'mark', dmgPct: 16,
            label: () => 'Marks impaled targets & +16% Lance Damage',
          },
          desc: () => `<b>Keystone:</b> +28% Holy & Lightning Damage and +40% Crit Damage. Vanguard and Paragon Lance skills Mark targets and deal +16% damage.`,
        },
        {
          key: 'unstoppable_cavalry_key', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'spear',
          name: 'Thunderous Cavalry',
          stats: { physPct: 30, atkSpeed: 18, moveSpeed: 14 },
          desc: () => `<b>Keystone:</b> +30% Physical Damage, +18% Attack Speed, and +14% Movement Speed.`,
        },
      ],
    },
    {
      name: 'Phalanx Bulwark',
      el: 'phys',
      nodes: [
        {
          key: 'tower_plate', row: 0, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Tower Pavise',
          stats: { armorPct: 7, block: 3, vit: 3 },
          desc: (r) => `+${r * 7}% Armor, +${r * 3}% Block Chance, and +${r * 3} Vitality.`,
        },
        {
          key: 'orbiting_pavise', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'shield',
          name: 'Whirling Pavise',
          stats: { armorPct: 5 },
          morph: {
            skills: ['Tower Shield', 'Bastion of Ten'],
            extraN: 1, durPct: 25, dmgPct: 8,
            label: (r) => `+1 Orbiting Shield, +${r * 25}% Dur & +${r * 8}% Dmg`,
          },
          desc: (r) => `<b>Morph — Tower Shield & Bastion of Ten:</b> Conjures <b>+1 additional orbiting tower shield</b>, lasts +${r * 25}% longer, and deals +${r * 8}% damage.`,
        },
        {
          key: 'ricochet_disc', row: 1, choice: 'B', maxRank: 3, el: 'holy', fx: 'shield',
          name: 'Sun-Disc Ricochet',
          stats: { holyPct: 5 },
          morph: {
            skills: ['Shield Throw', 'Shield Disc', 'Shield Slam'],
            extraBounce: 2, stun: true, dmgPct: 8,
            label: (r) => `+${r * 2} Shield Ricochets & Stuns (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Shield Throw, Shield Disc & Shield Slam:</b> Bounces <b>+${r * 2}</b> additional times, stuns struck foes, and deals +${r * 8}% damage.`,
        },
        {
          key: 'spartan_resolve', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Iron Resolve',
          stats: { resAll: 4, reduce: 2, thorns: 20 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 4}% All Resistances, +${r * 2}% Damage Reduction, +${r * 20} Thorns, and +${r * 4}% Phalanx Bulwark Skill Damage.`,
        },
        {
          key: 'magma_bulwark', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'explosion',
          name: 'Furnace Bastion',
          stats: { firePct: 6, thorns: 25 },
          morph: {
            skills: ['Bulwark Nova', 'Spear Wall', 'Ironclad Juggernaut'],
            el: 'fire', burn: true, pull: true, dmgPct: 9,
            label: (r) => `Molten Fire conversion, Pulls & Ignites (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Bulwark Nova, Spear Wall & Ironclad Juggernaut:</b> Erupts in <b>Molten Fire</b>, pulls nearby foes against your shield, and deals +${r * 9}% damage.`,
        },
        {
          key: 'sanctified_wall', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'shield',
          name: 'Cathedral Wall',
          stats: { lifePct: 5 },
          morph: {
            skills: ['Shield Wall', 'Holy Bastion', 'Living Fortress', 'Hold the Line'],
            healPct: 5, durPct: 25, novaOnCast: 'holy',
            label: (r) => `Heals ${r * 5}% Life, Holy Nova & +${r * 25}% Duration`,
          },
          desc: (r) => `<b>Morph — Shield Wall, Hold the Line, Holy Bastion & Living Fortress:</b> Emits a Holy shockwave, heals ${r * 5}% Max Life, and extends duration by +${r * 25}%.`,
        },
        {
          key: 'immortal_phalanx_key', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'shield',
          name: 'Last Stand of the Ten',
          stats: { lifePct: 20, block: 14, resAll: 12 },
          cheatDeath: { name: 'LAST STAND!', el: 'holy', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +20% Max Life, +14% Block, and +12% All Resistances. Fatal damage triggers <b>Last Stand</b>, restoring 45% Max Life behind an unbreakable shield (120s cooldown).`,
        },
        {
          key: 'spiked_citadel_key', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'shield',
          name: 'Walking Citadel',
          stats: { armorPct: 38, reduce: 8, thorns: 120, dmgPct: 14 },
          desc: () => `<b>Keystone:</b> +38% Armor, +8% Damage Reduction, +120 Thorns, and +14% All Damage.`,
        },
      ],
    },
    {
      name: 'Grand Knight Order',
      el: 'holy',
      nodes: [
        {
          key: 'chivalry', row: 0, maxRank: 5, el: 'holy', fx: 'totem',
          name: 'Oath of Chivalry',
          stats: { summonPct: 8, holyPct: 4, cdr: 2 },
          desc: (r) => `+${r * 8}% Knight Order Damage & Life, +${r * 4}% Holy Damage, and +${r * 2}% Cooldown Reduction.`,
        },
        {
          key: 'flame_templars', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Order of the Flame',
          stats: { summonPct: 6, firePct: 4 },
          morph: {
            skills: ['Squire Knight'],
            sumSwap: 'kn_flame', summonDmgPct: 20, burn: true,
            label: (r) => `Recruits Flame Templars (+${r * 20}% Cleave/Aura Dmg)`,
          },
          desc: (r) => `<b>Morph — Squire Knight:</b> Promotes squires into greatsword-wielding <b>Flame Templars</b> whose burning aura scorches packs (+${r * 20}% knight damage).`,
        },
        {
          key: 'frost_wardens', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Order of the Rime Pavise',
          stats: { summonPct: 6, armorPct: 4 },
          morph: {
            skills: ['Squire Knight'],
            sumSwap: 'kn_frost', summonHpPct: 30, slow: true,
            label: (r) => `Recruits Frost Wardens (+${r * 30}% HP, Taunt & Heal)`,
          },
          desc: (r) => `<b>Morph — Squire Knight:</b> Promotes squires into taunting <b>Frost Wardens</b> that chill enemies, mend allies, and have +${r * 30}% Life.`,
        },
        {
          key: 'lord_marshal_tactics', row: 2, maxRank: 5, el: 'holy', fx: 'totem',
          name: 'Marshal Command',
          stats: { summonPct: 7, lifePct: 3, atkSpeed: 3 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 7}% Knight Order Power, +${r * 3}% Max Life, +${r * 3}% Attack Speed, and +${r * 4}% Knight Commander Skill Damage.`,
        },
        {
          key: 'royal_standard', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'totem',
          name: 'Banner of Kings',
          stats: { dmgPct: 5 },
          morph: {
            skills: ['War Banner', 'Rallying Cry', 'Shout of Valor'],
            sumSwap: 'kingbanner', healPct: 4, durPct: 25,
            label: (r) => `Plants Banner of Kings & heals ${r * 4}% Max Life`,
          },
          desc: (r) => `<b>Morph — War Banner, Rallying Cry & Shout of Valor:</b> Upgrades War Banner into the <b>Banner of Kings</b> (+60% ally dmg, +30% AS) and heals ${r * 4}% Max Life.`,
        },
        {
          key: 'storm_paladins', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Stormblade Captains',
          stats: { summonPct: 8, lightPct: 5 },
          morph: {
            skills: ['Knight Captain', 'Knights of the Round'],
            sumSwap: 'kn_storm', summonDmgPct: 22, summonHpPct: 20,
            label: (r) => `Summons thunder-calling Storm Paladins (+${r * 22}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Knight Captain & Knights of the Round:</b> Calls <b>Storm Paladins</b> that smite enemies with lightning bolts (+${r * 22}% damage, +${r * 20}% HP).`,
        },
        {
          key: 'grand_commander_key', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'totem',
          name: 'High King of the Round',
          stats: { summonPct: 42, cdr: 14, lifePct: 14 },
          knightCapPlus: 2,
          morph: {
            skills: ['Squire Knight', 'Knight Captain', 'Knights of the Round'],
            extraN: 1, summonHpPct: 25,
            label: () => '+2 Max Knight Order Cap (6 total) & +1 Knight per cast',
          },
          desc: () => `<b>Keystone:</b> +42% Knight Power, +14% Cooldown Reduction, and +14% Max Life. Raises your <b>Knight Order cap from 4 to 6</b> and summons +1 knight per cast.`,
        },
        {
          key: 'grand_marshal_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'spear',
          name: 'Champion of the Realm',
          stats: { summonPct: 35, dmgPct: 18, bossDmg: 25 },
          morph: {
            skills: ['Knight Captain'],
            sumSwap: 'kn_marshal', summonDmgPct: 30,
            label: () => 'Promotes Captain into a colossal Grand Marshal',
          },
          desc: () => `<b>Keystone:</b> +35% Knight Power, +18% All Damage, and +25% Boss Damage. Knight Captain summons a colossal <b>Grand Marshal</b> that calls down holy pillars.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 15. DRAGON KNIGHT — Inferno Breath / Ironclad Scales / Elder Dragonflight
  // =========================================================================
  dragon_knight: [
    {
      name: 'Inferno Maw',
      el: 'fire',
      nodes: [
        {
          key: 'furnace_lungs', row: 0, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Furnace Heart',
          stats: { firePct: 6, str: 3, castSpeed: 2.5 },
          desc: (r) => `+${r * 6}% Fire Damage, +${r * 3} Strength, and +${(r * 2.5).toFixed(1)}% Cast Speed.`,
        },
        {
          key: 'rimewyrm_breath', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Glacial Wyrmfire',
          stats: { coldPct: 6 },
          morph: {
            skills: ['Dragon Fang Strike', 'Fire Breath', 'Inferno Breath', 'Flame Nova'],
            el: 'cold', freeze: true, slow: true, dmgPct: 8,
            label: (r) => `Frostwyrm conversion, Freezes packs (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dragon Fang Strike, Fire Breath, Flame Nova & Inferno Breath:</b> Breathes <b>Glacial Frost</b> instead of fire, freezing enemies (+${r * 8}% damage).`,
        },
        {
          key: 'napalm_spit', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Hellfire Bombard',
          stats: { firePct: 5 },
          morph: {
            skills: ['Fireball Spit', 'Molten Fissure', 'Magma Geyser', 'Meteor Impact'],
            extraNPerRank: 1, trail: 'fire', burn: true, dmgPct: 7,
            label: (r) => `+${r} Spit/Fissure & leaves molten pools`,
          },
          desc: (r) => `<b>Morph — Fireball Spit, Molten Fissure, Magma Geyser & Meteor Impact:</b> Launches +${r} extra projectile/crack and leaves burning magma (+${r * 7}% damage).`,
        },
        {
          key: 'searing_fangs', row: 2, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Searing Maw',
          stats: { critChance: 2, critDmg: 9, areaPct: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 9}% Crit Damage, +${r * 3}% Area Size, and +${r * 4}% Dragonfire Skill Damage.`,
        },
        {
          key: 'prismatic_torrent', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'beam',
          name: 'Chromatic Breath',
          stats: { arcanePct: 6, lightPct: 6 },
          morph: {
            skills: ['Prism Breath', 'Inferno Breath', 'Cataclysm of Flame'],
            pierce: true, leech: true, areaPct: 16, dmgPct: 9,
            label: (r) => `Leeches Life, +${r * 16}% Cone/AoE & +${r * 9}% Dmg`,
          },
          desc: (r) => `<b>Morph — Inferno Breath, Prism Breath & Cataclysm of Flame:</b> Leeches Life, widens breath/blast by +${r * 16}%, and deals +${r * 9}% damage.`,
        },
        {
          key: 'immolation_mantle', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'nova',
          name: 'Living Cinder',
          stats: { firePct: 6 },
          morph: {
            skills: ['Fire Aura', 'Wyrmfire Barrier', 'Dragon Tempest'],
            pull: true, durPct: 25, dmgPct: 8,
            label: (r) => `Draws foes into aura & +${r * 25}% Duration`,
          },
          desc: (r) => `<b>Morph — Fire Aura, Wyrmfire Barrier & Dragon Tempest:</b> Pulls enemies into searing range and lasts +${r * 25}% longer (+${r * 8}% damage).`,
        },
        {
          key: 'worldburner_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'dragon',
          name: 'Calamity Wyrm',
          stats: { firePct: 32, coldPct: 25, areaPct: 20 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +32% Fire Damage, +25% Cold Damage, and +20% Area Size. Burning foes detonate in dragonfire on death for 22% Max Life.`,
        },
        {
          key: 'dragon_king_verdict_key', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'pillar',
          name: 'Sovereign Wyrmking',
          stats: { dmgPct: 20, critDmg: 45, cdr: 12 },
          morph: {
            tree: 3, curse: 'amp', dmgPct: 16,
            label: () => 'Sunders foes (Amplify) & +16% Sovereign Skill Damage',
          },
          desc: () => `<b>Keystone:</b> +20% All Damage, +45% Crit Damage, and +12% Cooldown Reduction. Sovereign Wyrm skills apply Amplify Damage and deal +16% damage.`,
        },
      ],
    },
    {
      name: 'Obsidian Scales',
      el: 'phys',
      nodes: [
        {
          key: 'drake_plate', row: 0, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Obsidian Hide',
          stats: { armorPct: 7, lifePct: 3.5, resFire: 6 },
          desc: (r) => `+${r * 7}% Armor, +${(r * 3.5).toFixed(1)}% Max Life, and +${r * 6}% Fire Resistance.`,
        },
        {
          key: 'storm_claws', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'claw',
          name: 'Thunderous Claws',
          stats: { lightPct: 5, atkSpeed: 3 },
          morph: {
            skills: ['Dragon Claw', 'Tail Swipe', 'Wyrmfire Thrust'],
            el: 'light', stun: true, extraNPerRank: 1, dmgPct: 7,
            label: (r) => `Lightning Claws, +${r} Swipe & Stuns (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dragon Claw, Tail Swipe & Wyrmfire Thrust:</b> Electrifies claws with <b>Lightning</b>, adds +${r} strike, and stuns enemies (+${r * 7}% damage).`,
        },
        {
          key: 'crushing_rush', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Comet Rush',
          stats: { moveSpeed: 4 },
          morph: {
            skills: ['Dragon Charge', 'Dragon Leap', 'Sunfall Dragon Dive'],
            trail: 'fire', resetOnKill: true, dmgPct: 9,
            label: (r) => `Leaves magma wake & resets CD on kill (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dragon Charge, Dragon Leap & Sunfall Dragon Dive:</b> Leaves a burning wake and <b>resets cooldown on kill</b> (+${r * 9}% damage).`,
        },
        {
          key: 'spiked_ridge', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Adamantine Ridge',
          stats: { reduce: 2, thorns: 24, resAll: 3 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 2}% Damage Reduction, +${r * 24} Thorns, +${r * 3}% All Resistances, and +${r * 4}% Draconic Might Skill Damage.`,
        },
        {
          key: 'molten_thorns', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'shield',
          name: 'Magma Carapace',
          stats: { thorns: 35, armorPct: 6 },
          morph: {
            skills: ['Dragon Scales', 'Spiked Carapace', 'Ironclad Wyrmform'],
            novaOnCast: 'fire', durPct: 25, burn: true,
            label: (r) => `Erupts w/ Fire Nova on cast & +${r * 25}% Duration`,
          },
          desc: (r) => `<b>Morph — Dragon Scales, Spiked Carapace & Ironclad Wyrmform:</b> Detonates a scorching Fire Nova on cast and extends duration by +${r * 25}%.`,
        },
        {
          key: 'ancient_heart_regen', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'dragon',
          name: 'Immortal Dragonheart',
          stats: { lifeRegen: 6 },
          morph: {
            skills: ['Draconic Roar', 'Dragon Heart', 'Sovereign Roar'],
            healPct: 5, curse: 'weaken', areaPct: 16,
            label: (r) => `Heals ${r * 5}% Max Life & Weakens nearby foes`,
          },
          desc: (r) => `<b>Morph — Draconic Roar, Dragon Heart & Sovereign Roar:</b> Restores ${r * 5}% Max Life and weakens nearby enemies across +${r * 16}% wider range.`,
        },
        {
          key: 'dragonheart_rebirth_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'dragon',
          name: 'Heart of the Immortal Wyrm',
          stats: { lifePct: 22, resAll: 14, armorPct: 20 },
          cheatDeath: { name: 'DRAGONHEART!', el: 'fire', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +22% Max Life, +14% All Resistances, and +20% Armor. Fatal blows ignite your <b>Dragonheart</b>, restoring 45% Max Life in a roar of flame (120s cooldown).`,
        },
        {
          key: 'behemoth_claw_key', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'claw',
          name: 'Dreadnought Wyrm',
          stats: { physPct: 28, lightPct: 28, lifeSteal: 5 },
          desc: () => `<b>Keystone:</b> +28% Physical & Lightning Damage and +5% Life Steal.`,
        },
      ],
    },
    {
      name: 'Elder Dragonflight',
      el: 'arcane',
      nodes: [
        {
          key: 'brood_kinship', row: 0, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Broodlord Kinship',
          stats: { summonPct: 8, cdr: 2.5, dmgPct: 3 },
          desc: (r) => `+${r * 8}% Dragon Companion Power, +${(r * 2.5).toFixed(1)}% Cooldown Reduction, and +${r * 3}% All Damage.`,
        },
        {
          key: 'wyvern_clutch', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'dragon',
          name: 'Twin Wyverns',
          stats: { summonPct: 6 },
          morph: {
            skills: ['Drake Whelp', 'Wyvern Spirit'],
            sumSwap: 'wyvern', extraN: 1, extraMax: 1, summonDmgPct: 18,
            label: (r) => `Upgrades to Wyverns (+1 Max, +${r * 18}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Drake Whelp & Wyvern Spirit:</b> Upgrades whelps into fierce flying <b>Wyverns</b> (+1 max dragon, +${r * 18}% damage).`,
        },
        {
          key: 'ice_brood', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Frostwyrm Brood',
          stats: { summonPct: 6, coldPct: 5 },
          morph: {
            skills: ['Drake Whelp', 'Elder Red Drake'],
            sumSwap: 'frostwyrm', summonHpPct: 25, freeze: true,
            label: (r) => `Summons icy Frost Wyrms (+${r * 25}% HP)`,
          },
          desc: (r) => `<b>Morph — Drake Whelp & Elder Red Drake:</b> Summons cone-breathing <b>Frost Wyrms</b> (+${r * 25}% Life) that chill packs.`,
        },
        {
          key: 'sky_tyrant', row: 2, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Wings of Dominion',
          stats: { summonPct: 7, moveSpeed: 3.5, bossDmg: 4 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 7}% Dragonflight Power, +${(r * 3.5).toFixed(1)}% Move Speed, +${r * 4}% Boss Damage, and +${r * 4}% Elder Lineage Skill Damage.`,
        },
        {
          key: 'swarm_skies', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'dragon',
          name: 'Cloud of Wings',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Wyrm Coil', 'Dragonflight Swarm', 'Dragon Fear'],
            extraNPerRank: 2, fear: true, dmgPct: 8,
            label: (r) => `+${r * 2} Swooping Dragons & Terrifies (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dragon Fear, Wyrm Coil & Dragonflight Swarm:</b> Calls +${r * 2} additional swooping drakes and terrifies lesser foes (+${r * 8}% damage).`,
        },
        {
          key: 'ascendant_wyrmform', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'dragon',
          name: 'Awakened Aspect',
          stats: { atkSpeed: 4, castSpeed: 4 },
          morph: {
            skills: ['Dragon Wings', 'Blood Frenzy', 'True Dragon Form', 'Avatar of the Wyrm'],
            durPct: 25, cdPct: 10, leech: true,
            label: (r) => `+${r * 25}% Form Duration, -${r * 10}% CD & Life Leech`,
          },
          desc: (r) => `<b>Morph — Dragon Wings, Blood Frenzy, True Dragon Form & Avatar of the Wyrm:</b> Extends duration by +${r * 25}% and reduces cooldown by ${r * 10}%.`,
        },
        {
          key: 'father_of_dragons_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'dragon',
          name: 'Progenitor of Dragons',
          stats: { summonPct: 45, firePct: 20, cdr: 12 },
          morph: {
            skills: ['Drake Whelp', 'Wyvern Spirit', 'Elder Red Drake'],
            extraN: 1, extraMax: 1, summonDmgPct: 25,
            label: () => '+1 Max Dragon Companion & +25% Dragon Damage',
          },
          desc: () => `<b>Keystone:</b> +45% Dragon Companion Power, +20% Fire Damage, and +12% Cooldown Reduction. Dragon summons call +1 additional dragon (+25% damage).`,
        },
        {
          key: 'eternal_aspect_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'dragon',
          name: 'True Aspect',
          stats: { allStats: 15, critChance: 10, dmgPct: 18 },
          desc: () => `<b>Keystone:</b> Awakens pure draconic blood: +15 All Attributes, +10% Crit Chance, and +18% All Damage.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 16. GUNNER — Deadshot Firearms / Heavy Ordnance / Mechanist Corps
  // =========================================================================
  gunner: [
    {
      name: 'Deadshot Arsenal',
      el: 'phys',
      nodes: [
        {
          key: 'rifled_barrels', row: 0, maxRank: 5, el: 'phys', fx: 'bullet',
          name: 'Rifled Barrels',
          stats: { physPct: 5, dex: 3, critChance: 2 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 3} Dexterity, and +${r * 2}% Critical Chance.`,
        },
        {
          key: 'double_tap', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'bullet',
          name: 'Full-Metal Salvo',
          stats: { atkSpeed: 3 },
          morph: {
            skills: ['Burst Fire', 'Shotgun Blast', 'Full Auto', 'Heavy Shell'],
            extraNPerRank: 1, pierce: true, dmgPct: 6,
            label: (r) => `+${r} Piercing Round(s) per burst (+${r * 6}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Burst Fire, Shotgun Blast, Full Auto & Heavy Shell:</b> Fires <b>+${r}</b> extra armor-piercing round${r > 1 ? 's' : ''} (+${r * 6}% damage).`,
        },
        {
          key: 'cryo_magazines', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Subzero Rounds',
          stats: { coldPct: 6 },
          morph: {
            skills: ['Burst Fire', 'Piercing Shot', 'Cryo Shell', 'Minigun Fury'],
            el: 'cold', freeze: true, slow: true, dmgPct: 8,
            label: (r) => `Cryo conversion, Chills/Freezes (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Burst Fire, Piercing Shot, Cryo Shell & Minigun Fury:</b> Loads <b>Cryo Rounds</b> that chill and freeze enemies (+${r * 8}% damage).`,
        },
        {
          key: 'hair_trigger', row: 2, maxRank: 5, el: 'phys', fx: 'bullet',
          name: 'Hair Trigger',
          stats: { critDmg: 9, atkSpeed: 3.5, projSpeed: 5 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 9}% Crit Damage, +${(r * 3.5).toFixed(1)}% Attack Speed, +${r * 5}% Bullet Velocity, and +${r * 4}% Firearms Skill Damage.`,
        },
        {
          key: 'railgun_caliber', row: 3, choice: 'A', maxRank: 3, el: 'light', fx: 'beam',
          name: 'Gauss Accelerator',
          stats: { lightPct: 6, bossDmg: 5 },
          morph: {
            skills: ['Snipe', 'Magnum Execution', 'Rail Shot', 'Annihilator Beam'],
            el: 'light', stun: true, resetOnKill: true, dmgPct: 10,
            label: (r) => `Gauss Lightning conversion, Stuns & resets CD on kill`,
          },
          desc: (r) => `<b>Morph — Snipe, Magnum Execution, Rail Shot & Annihilator Beam:</b> Fires hyper-velocity <b>Lightning</b> slugs that stun and <b>reset cooldown on kill</b> (+${r * 10}% damage).`,
        },
        {
          key: 'incendiary_belt', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Dragonbreath Belt',
          stats: { firePct: 6 },
          morph: {
            skills: ['Shotgun Blast', 'Incendiary Shell', 'Gunslinger Stance', 'Orbital Death Laser'],
            el: 'fire', burn: true, areaPct: 14, dmgPct: 8,
            label: (r) => `Incendiary Fire, Ignites & +${r * 14}% Blast Radius`,
          },
          desc: (r) => `<b>Morph — Shotgun Blast, Incendiary Shell, Gunslinger Stance & Orbital Death Laser:</b> Ignites targets in +${r * 14}% wider blasts (+${r * 8}% damage).`,
        },
        {
          key: 'desperado_key', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'bullet',
          name: 'High Noon Desperado',
          stats: { extraProj: 2, critChance: 10, atkSpeed: 16 },
          morph: {
            tree: [0, 3], curse: 'mark',
            label: () => 'Marks targets on hit for increased damage',
          },
          desc: () => `<b>Keystone:</b> +2 Projectiles, +10% Crit Chance, and +16% Attack Speed. Firearms and Munitions hits Mark targets to take increased damage.`,
        },
        {
          key: 'plasma_cannon_key', row: 4, choice: 'B', maxRank: 1, el: 'light', fx: 'beam',
          name: 'Experimental Plasma Core',
          stats: { lightPct: 28, firePct: 28, critDmg: 45 },
          desc: () => `<b>Keystone:</b> Supercharges weapons with plasma: +28% Lightning & Fire Damage and +45% Critical Damage.`,
        },
      ],
    },
    {
      name: 'Demolitions',
      el: 'fire',
      nodes: [
        {
          key: 'high_explosives', row: 0, maxRank: 5, el: 'fire', fx: 'explosion',
          name: 'High-Yield Payload',
          stats: { firePct: 6, areaPct: 4, cdr: 2 },
          desc: (r) => `+${r * 6}% Fire Damage, +${r * 4}% Blast Radius, and +${r * 2}% Cooldown Reduction.`,
        },
        {
          key: 'mirv_warheads', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'rocket',
          name: 'MIRV Cluster Shells',
          stats: { firePct: 5 },
          morph: {
            skills: ['Frag Grenade', 'Rocket Launcher', 'Sticky Bomb', 'Rocket Barrage'],
            extraNPerRank: 1, dmgPct: 7,
            label: (r) => `+${r} Grenade/Rocket per volley (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Frag Grenade, Rocket Launcher, Sticky Bomb & Rocket Barrage:</b> Launches <b>+${r}</b> additional warhead${r > 1 ? 's' : ''} (+${r * 7}% damage).`,
        },
        {
          key: 'thermite_gel', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'White Phosphorus',
          stats: { firePct: 5 },
          morph: {
            skills: ['Frag Grenade', 'Landmine', 'Napalm Zone', 'Carpet Bomb'],
            trail: 'fire', burn: true, durPct: 22, dmgPct: 8,
            label: (r) => `Leaves scorching napalm ground (+${r * 22}% Dur)`,
          },
          desc: (r) => `<b>Morph — Frag Grenade, Landmine, Napalm Zone & Carpet Bomb:</b> Coats the ground in burning thermite and extends hazard duration by +${r * 22}% (+${r * 8}% damage).`,
        },
        {
          key: 'blast_shielding', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Flak Plating',
          stats: { armorPct: 6, resFire: 7, bossDmg: 4 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 6}% Armor, +${r * 7}% Fire Resist, +${r * 4}% Boss Damage, and +${r * 4}% Ordnance Skill Damage.`,
        },
        {
          key: 'concussion_gravity', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'explosion',
          name: 'Implosion Charges',
          stats: { areaPct: 6 },
          morph: {
            skills: ['Concussion Grenade', 'Smoke Grenade', 'Saturation Bombing', 'Tactical Nuke'],
            pull: true, stun: true, cdPct: 10, dmgPct: 9,
            label: (r) => `Vacuum Pull, Stuns & -${r * 10}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Smoke Grenade, Concussion Grenade, Saturation Bombing & Tactical Nuke:</b> Pulls enemies into ground zero, stuns them, and cuts cooldown by ${r * 10}%.`,
        },
        {
          key: 'minefield_grid', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'trap',
          name: 'Perimeter Defense',
          stats: { cdr: 4 },
          morph: {
            skills: ['Landmine', 'Flak Vest'],
            extraNPerRank: 2, healPct: 4, dmgPct: 8,
            label: (r) => `+${r * 2} Mines & heals ${r * 4}% Life on cast`,
          },
          desc: (r) => `<b>Morph — Landmine & Flak Vest:</b> Scatters +${r * 2} extra mines and restores ${r * 4}% Max Life when rigging defenses (+${r * 8}% damage).`,
        },
        {
          key: 'doomsday_bomber_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'explosion',
          name: 'Carpet Bombardier',
          stats: { firePct: 32, areaPct: 24, cdr: 14 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +32% Fire Damage, +24% Area Size, and +14% Cooldown Reduction. Burning enemies detonate like live munitions on death for 22% Max Life.`,
        },
        {
          key: 'ejection_seat_key', row: 4, choice: 'B', maxRank: 1, el: 'fire', fx: 'shield',
          name: 'Emergency Protocol',
          stats: { lifePct: 18, reduce: 8, resAll: 12 },
          cheatDeath: { name: 'EMERGENCY SHIELD!', el: 'light', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +18% Max Life, +8% Damage Reduction, and +12% All Resistances. Fatal damage triggers <b>Emergency Shield</b>, restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Mechanist Corps',
      el: 'light',
      nodes: [
        {
          key: 'servo_motors', row: 0, maxRank: 5, el: 'light', fx: 'turret',
          name: 'Precision Servos',
          stats: { summonPct: 8, lightPct: 4, cdr: 2 },
          desc: (r) => `+${r * 8}% Turret & Drone Power, +${r * 4}% Lightning Damage, and +${r * 2}% Cooldown Reduction.`,
        },
        {
          key: 'rocket_turrets', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'rocket',
          name: 'Heavy Rocket Sentries',
          stats: { summonPct: 6, firePct: 4 },
          morph: {
            skills: ['Gun Turret'],
            sumSwap: 'rocketturret', summonDmgPct: 22,
            label: (r) => `Upgrades to homing Rocket Turrets (+${r * 22}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Gun Turret:</b> Retrofits turrets into armored <b>Rocket Turrets</b> firing homing explosive shells (+${r * 22}% damage).`,
        },
        {
          key: 'cryo_turrets', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Cryo-Beam Sentries',
          stats: { summonPct: 6, coldPct: 4 },
          morph: {
            skills: ['Gun Turret'],
            sumSwap: 'cryoturret', summonHpPct: 28, freeze: true,
            label: (r) => `Upgrades to freezing Cryo Turrets (+${r * 28}% HP)`,
          },
          desc: (r) => `<b>Morph — Gun Turret:</b> Retrofits turrets into <b>Cryo Turrets</b> whose subzero beams freeze advancing monsters (+${r * 28}% turret HP).`,
        },
        {
          key: 'power_grid', row: 2, maxRank: 5, el: 'light', fx: 'lightning',
          name: 'High-Capacity Grid',
          stats: { summonPct: 7, armorPct: 5, manaRegenPct: 6 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 7}% Construct Power, +${r * 5}% Armor, +${r * 6}% Mana Regen, and +${r * 4}% Gadgets Skill Damage.`,
        },
        {
          key: 'seeker_drones', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'explosion',
          name: 'Kamikaze Drone Bay',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Support Drone', 'Drone Swarm Pod'],
            sumSwap: 'bombdrone', extraN: 1, extraMax: 1, summonDmgPct: 20,
            label: (r) => `Deploys +1 Explosive Bomb Drone (+${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Support Drone & Drone Swarm Pod:</b> Launches high-speed <b>Bomb Drones</b> (+1 extra drone, +${r * 20}% blast damage).`,
        },
        {
          key: 'tesla_overdrive', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Overclocked Generators',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Tesla Coil', 'Shield Generator', 'Overclock', 'Repair Kit', 'Mech Suit'],
            novaOnCast: 'light', durPct: 25, healPct: 4,
            label: (r) => `EMP Pulse on cast, +${r * 25}% Dur & heals ${r * 4}% Life`,
          },
          desc: (r) => `<b>Morph — Tesla Coil, Shield Generator, Repair Kit, Overclock & Mech Suit:</b> Emits a Lightning pulse, heals ${r * 4}% Max Life, and extends duration by +${r * 25}%.`,
        },
        {
          key: 'iron_architect_key', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'turret',
          name: 'Supreme Engineer',
          stats: { summonPct: 45, cdr: 14, armorPct: 20 },
          morph: {
            tree: 2, kind: 'summon', extraN: 1, extraMax: 2, summonHpPct: 25,
            label: () => '+1 Turret/Drone deployed & +2 Max Construct Cap',
          },
          desc: () => `<b>Keystone:</b> +45% Turret & Drone Power, +14% Cooldown Reduction, and +20% Armor. All Gadget summon skills deploy +1 unit and gain +2 max cap.`,
        },
        {
          key: 'titanfall_mech_key', row: 4, choice: 'B', maxRank: 1, el: 'fire', fx: 'turret',
          name: 'Goliath Protocol',
          stats: { summonPct: 35, dmgPct: 18, bossDmg: 28 },
          morph: {
            skills: ['War Machine', 'Mech Suit', 'Laser Fence'],
            durPct: 40, dmgPct: 25,
            label: () => '+40% Duration & +25% War Machine / Mech Power',
          },
          desc: () => `<b>Keystone:</b> +35% Construct Power, +18% All Damage, and +28% Boss Damage. War Machine, Mech Suit, and Laser Fence last +40% longer and deal +25% damage.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 17. MONK — Iron Fist / Enlightened Spirit / Dragon & Tiger Aspect
  // =========================================================================
  monk: [
    {
      name: 'Way of the Hundred Fists',
      el: 'phys',
      nodes: [
        {
          key: 'flowing_strikes', row: 0, maxRank: 5, el: 'phys', fx: 'smash',
          name: 'Flowing Tempo',
          stats: { atkSpeed: 4, dex: 3, physPct: 4 },
          desc: (r) => `+${r * 4}% Attack Speed, +${r * 3} Dexterity, and +${r * 4}% Physical Damage.`,
        },
        {
          key: 'thunderclap_fists', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Fists of Thunder',
          stats: { lightPct: 6 },
          morph: {
            skills: ['Fist of Fury', 'Hundred Fists', 'Palm of the Dawn'],
            el: 'light', stun: true, waveProj: { fx: 'bolt', el: 'light', nPerRank: 1, dmgMul: 0.38 }, dmgPct: 7,
            label: (r) => `Lightning conversion, Stuns & fires ${r} Spark(s)`,
          },
          desc: (r) => `<b>Morph — Fist of Fury, Hundred Fists & Palm of the Dawn:</b> Converts to <b>Lightning</b>, stuns foes, and releases ${r} lightning arc${r > 1 ? 's' : ''} (+${r * 7}% damage).`,
        },
        {
          key: 'vortex_cyclone_kick', row: 1, choice: 'B', maxRank: 3, el: 'phys', fx: 'spin',
          name: 'Cyclone Strike',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Sweeping Crescent', 'Spinning Crane Kick', 'Sweeping Gale'],
            pull: true, leech: true, areaPct: 14, dmgPct: 8,
            label: (r) => `Draws foes inward, Leeches Life & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Sweeping Crescent, Spinning Crane Kick & Sweeping Gale:</b> Pulls surrounding enemies into your kicks, leeches Life, and grows +${r * 14}% wider.`,
        },
        {
          key: 'sixth_sense', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Sixth Sense',
          stats: { critChance: 2.5, block: 2.5, moveSpeed: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${(r * 2.5).toFixed(1)}% Crit Chance, +${(r * 2.5).toFixed(1)}% Dodge/Block, +${r * 3}% Move Speed, and +${r * 4}% Martial Arts Skill Damage.`,
        },
        {
          key: 'exploding_palm', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'smash',
          name: 'Sundering Palm',
          stats: { critDmg: 10, bloodPct: 5 },
          morph: {
            skills: ['Iron Palm', 'Quivering Palm', 'Grandmaster Flurry'],
            curse: 'amp', bleed: true, areaPct: 15, dmgPct: 10,
            label: (r) => `Applies Amplify Damage, Bleeds & +${r * 10}% Dmg`,
          },
          desc: (r) => `<b>Morph — Iron Palm, Quivering Palm & Grandmaster Flurry:</b> Ruptures internal meridians (Amplify Damage + Bleed) with +${r * 15}% AoE and +${r * 10}% damage.`,
        },
        {
          key: 'gale_vault', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Dashing Strike',
          stats: { cdr: 4 },
          morph: {
            skills: ['Flying Kick', 'Zen Dash', 'Asura Stance'],
            resetOnKill: true, cdPct: 10, dmgPct: 9,
            label: (r) => `Kills reset Kick/Dash CD (-${r * 10}% Base CD)`,
          },
          desc: (r) => `<b>Morph — Flying Kick, Zen Dash & Asura Stance:</b> Slaying an enemy <b>resets cooldown</b>; base cooldown reduced by ${r * 10}% (+${r * 9}% damage).`,
        },
        {
          key: 'asura_six_arms_key', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'smash',
          name: 'Six-Armed Asura',
          stats: { atkSpeed: 20, critDmg: 45, physPct: 22 },
          morph: {
            tree: 0, kind: 'melee', extraN: 1,
            label: () => '+1 Extra Strike on all Martial Arts melee skills',
          },
          desc: () => `<b>Keystone:</b> +20% Attack Speed, +45% Crit Damage, and +22% Physical Damage. All Martial Arts melee skills strike an additional time.`,
        },
        {
          key: 'crimson_palm_key', row: 4, choice: 'B', maxRank: 1, el: 'blood', fx: 'smash',
          name: 'Touch of Death',
          stats: { critChance: 10, bossDmg: 30, lifeSteal: 5 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +10% Crit Chance, +30% Boss Damage, and +5% Life Steal. Bleeding foes struck by your palms rupture on death for 22% Max Life.`,
        },
      ],
    },
    {
      name: 'Enlightened Spirit',
      el: 'holy',
      nodes: [
        {
          key: 'inner_harmony', row: 0, maxRank: 5, el: 'holy', fx: 'spirit',
          name: 'Harmony',
          stats: { holyPct: 5, resAll: 3.5, manaRegenPct: 6 },
          desc: (r) => `+${r * 5}% Holy Damage, +${(r * 3.5).toFixed(1)}% All Resistances, and +${r * 6}% Mana Regeneration.`,
        },
        {
          key: 'temple_bells', row: 1, choice: 'A', maxRank: 3, el: 'holy', fx: 'pillar',
          name: 'Golden Temple Bell',
          stats: { holyPct: 5 },
          morph: {
            skills: ['Radiant Bell', 'Resonating Bellstrike', 'Wave of Light', 'Heavenly Palm'],
            stun: true, areaPct: 16, dmgPct: 8,
            label: (r) => `Stuns on impact, +${r * 16}% AoE & +${r * 8}% Dmg`,
          },
          desc: (r) => `<b>Morph — Radiant Bell, Resonating Bellstrike, Wave of Light & Heavenly Palm:</b> Stuns enemies across a +${r * 16}% wider radius (+${r * 8}% damage).`,
        },
        {
          key: 'prayer_beads_orbit', row: 1, choice: 'B', maxRank: 3, el: 'holy', fx: 'orb',
          name: 'Sacred Rosary',
          stats: { holyPct: 4, armorPct: 4 },
          morph: {
            skills: ['Chi Bolt', 'Spirit Chains', 'Orbiting Prayer Beads'],
            extraNPerRank: 1, extraBounce: 1, home: true, dmgPct: 7,
            label: (r) => `+${r} Bead/Bolt, Homing & +${r} Chain Jump`,
          },
          desc: (r) => `<b>Morph — Chi Bolt, Spirit Chains & Orbiting Prayer Beads:</b> Adds <b>+${r}</b> bead/bolt, homes in on enemies, and arcs +${r} extra time (+${r * 7}% damage).`,
        },
        {
          key: 'serenity_focus', row: 2, maxRank: 5, el: 'holy', fx: 'spirit',
          name: 'Diamond Mind',
          stats: { cdr: 3.5, reduce: 1.5, castSpeed: 3 },
          skillMult: { tree: [1, 3], pct: 4 },
          desc: (r) => `+${(r * 3.5).toFixed(1)}% Cooldown Reduction, +${(r * 1.5).toFixed(1)}% Damage Reduction, +${r * 3}% Cast Speed, and +${r * 4}% Spirit & Nirvana Skill Damage.`,
        },
        {
          key: 'mantra_resonance', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'light',
          name: 'Resounding Mantras',
          stats: { lifeRegen: 5 },
          morph: {
            skills: ['Mantra of Healing', 'Inner Peace', 'Mantra of Retribution', 'Chakras Open'],
            novaOnCast: 'holy', healPct: 5, durPct: 25,
            label: (r) => `Radiant Burst on cast, heals ${r * 5}% Life & +${r * 25}% Dur`,
          },
          desc: (r) => `<b>Morph — Mantra of Healing, Inner Peace, Mantra of Retribution & Chakras Open:</b> Emits a Holy Nova, heals ${r * 5}% Max Life, and lasts +${r * 25}% longer.`,
        },
        {
          key: 'purifying_vortex', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'pillar',
          name: 'Sanctuary of Nirvana',
          stats: { holyPct: 6 },
          morph: {
            skills: ['Purifying Wave', 'Pillar of Nirvana', 'Avatar of Enlightenment', 'Nirvana Flash'],
            pull: true, curse: 'weaken', dmgPct: 9,
            label: (r) => `Pulls foes in, Weakens & +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Purifying Wave, Pillar of Nirvana, Avatar of Enlightenment & Nirvana Flash:</b> Draws enemies inward and weakens their blows (+${r * 9}% damage).`,
        },
        {
          key: 'near_death_experience_key', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'light',
          name: 'Near Death Experience',
          stats: { lifePct: 18, resAll: 15, cdr: 12 },
          cheatDeath: { name: 'SERENITY!', el: 'holy', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +18% Max Life, +15% All Resistances, and +12% Cooldown Reduction. Fatal damage triggers <b>Serenity</b>, restoring 45% Max Life in golden light (120s cooldown).`,
        },
        {
          key: 'bodhisattva_key', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'pillar',
          name: 'Enlightened Avatar',
          stats: { holyPct: 32, echoChance: 12, castSpeed: 15 },
          desc: () => `<b>Keystone:</b> +32% Holy Damage, +12% Spell Echo Chance, and +15% Cast Speed.`,
        },
      ],
    },
    {
      name: 'Dragon & White Tiger',
      el: 'fire',
      nodes: [
        {
          key: 'burning_chi', row: 0, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Blazing Meridians',
          stats: { firePct: 6, critChance: 2, str: 3 },
          desc: (r) => `+${r * 6}% Fire Damage, +${r * 2}% Critical Chance, and +${r * 3} Strength.`,
        },
        {
          key: 'flaming_wyrm_strikes', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Vermilion Bird Talons',
          stats: { firePct: 5 },
          morph: {
            skills: ['Dragon Strike', 'Breath of the Wyrm', 'Inferno Palm'],
            burn: true, trail: 'fire', dmgPct: 8,
            label: (r) => `Leaves burning lotus ground & +${r * 8}% Damage`,
          },
          desc: (r) => `<b>Morph — Dragon Strike, Breath of the Wyrm & Inferno Palm:</b> Ignites the ground in burning lotus flames and deals +${r * 8}% damage.`,
        },
        {
          key: 'white_tiger_claws', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'claw',
          name: 'White Tiger Frostfang',
          stats: { coldPct: 6, critDmg: 8 },
          morph: {
            skills: ['Tiger Pounce', 'Dragon Strike', 'Flaming Lotus'],
            el: 'cold', freeze: true, resetOnKill: true, dmgPct: 8,
            label: (r) => `Frost conversion, Freezes & resets CD on kill`,
          },
          desc: (r) => `<b>Morph — Tiger Pounce, Dragon Strike & Flaming Lotus:</b> Channels the <b>White Tiger's Frost</b>, freezing foes and resetting cooldown on kill (+${r * 8}% damage).`,
        },
        {
          key: 'celestial_beasts', row: 2, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Four Beasts Stance',
          stats: { critDmg: 9, dmgPct: 4, lifeSteal: 1 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 9}% Crit Damage, +${r * 4}% All Damage, +${r}% Life Steal, and +${r * 4}% Dragon & Tiger Skill Damage.`,
        },
        {
          key: 'rising_dragon_cyclone', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'dragon',
          name: 'Coiling Firestorm',
          stats: { firePct: 6 },
          morph: {
            skills: ['Fiery Ascent', 'Dragon Tempest', 'Cataclysmic Dragon Slam'],
            pull: true, extraNPerRank: 1, areaPct: 14, dmgPct: 9,
            label: (r) => `Pulls foes in, +${r} Wyrm/Wave & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Fiery Ascent, Dragon Tempest & Cataclysmic Dragon Slam:</b> Pulls enemies into the coiling dragon, adds +${r} cyclone/strike, and widens AoE by +${r * 14}%.`,
        },
        {
          key: 'roar_of_tigers', row: 3, choice: 'B', maxRank: 3, el: 'phys', fx: 'shout',
          name: 'King of Beasts',
          stats: { atkSpeed: 5 },
          morph: {
            skills: ['Tiger Roar'],
            novaOnCast: 'fire', durPct: 30, healPct: 5,
            label: (r) => `Fire Burst on roar, +${r * 30}% Dur & heals ${r * 5}% Life`,
          },
          desc: (r) => `<b>Morph — Tiger Roar:</b> Unleashes a scorching shockwave, heals ${r * 5}% Max Life, and extends buff duration by +${r * 30}%.`,
        },
        {
          key: 'avatar_of_the_dragon', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'dragon',
          name: 'Avatar of the Crimson Dragon',
          stats: { firePct: 32, critDmg: 45, areaPct: 18 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +32% Fire Damage, +45% Crit Damage, and +18% Area Size. Burning foes erupt in spiralling dragonfire on death for 22% Max Life.`,
        },
        {
          key: 'white_tiger_strike', row: 4, choice: 'B', maxRank: 1, el: 'cold', fx: 'claw',
          name: 'Wrath of the White Tiger',
          stats: { coldPct: 28, critChance: 12, bossDmg: 28 },
          onKill: { status: 'chill', el: 'cold', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +28% Cold Damage, +12% Crit Chance, and +28% Boss Damage. Chilled or Frozen enemies shatter on death for 20% Max Life.`,
        },
      ],
    },
  ],
};

