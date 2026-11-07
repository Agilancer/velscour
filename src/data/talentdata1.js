// Bespoke 5-Tier Branching Talent Trees (Part 1: Classes 1–9)
// Rows: 0 (Lv 1, 5 ranks), 1A/1B (Lv 10, 3 ranks), 2 (Lv 20, 5 ranks), 3A/3B (Lv 30, 3 ranks), 4A/4B (Lv 45, 1 rank).

export const TALENT_DATA_1 = {
  // =========================================================================
  // 1. PALADIN — Holy Wrath / Bulwark / Crusade (1:1 with 01_paladin.md & paladin_talents.png)
  // =========================================================================
  paladin: [
    {
      name: 'Holy Wrath',
      el: 'holy',
      nodes: [
        {
          key: 'radiant_fervor', row: 0, maxRank: 5, el: 'holy', fx: 'hammer',
          name: 'Radiant Fervor',
          stats: { holyPct: 5, castSpeed: 3, manaMax: 15 },
          desc: (r) => `+${r * 5}% Holy Damage, +${r * 3}% Cast Speed, and +${r * 15} Maximum Mana.`,
        },
        {
          key: 'limitless_hammerstorm', row: 1, choice: 'A', maxRank: 3, el: 'holy', fx: 'hammer',
          name: 'Limitless Hammerstorm',
          stats: { holyPct: 4 },
          morph: {
            skills: ['Blessed Hammer', 'Solar Hammer'],
            extraNPerRank: 1, areaPct: 10, dmgPct: 6,
            label: (r) => `+${r} Hammer(s), +${r * 10}% AoE, +${r * 6}% Hammer Damage`,
          },
          desc: (r) => `<b>Morph — Blessed Hammer & Solar Hammer:</b> Conjures <b>+${r}</b> extra spiraling hammer${r > 1 ? 's' : ''} with +${r * 10}% radius and +${r * 6}% damage. +${r * 4}% Holy Damage.`,
        },
        {
          key: 'thunderstruck_tether', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Thunderstruck Tether',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Blessed Hammer', 'Solar Hammer'],
            el: 'light', stun: true, dmgPct: 9,
            label: (r) => `Lightning Hammers, shocks/stuns foes, +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Blessed Hammer & Solar Hammer:</b> Hammers crackle with <b>Lightning</b>, shocking and stunning struck enemies for +${r * 9}% skill damage. +${r * 5}% Lightning Damage.`,
        },
        {
          key: 'vigor_blessed_aim', row: 2, maxRank: 5, el: 'holy', fx: 'pillar',
          name: 'Vigor & Blessed Aim',
          stats: { moveSpeed: 4, critDmg: 8, cdr: 2 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 4}% Move Speed, +${r * 8}% Critical Strike Damage, +${r * 2}% Cooldown Reduction, and +${r * 4}% Divine Wrath Skill Damage.`,
        },
        {
          key: 'holy_bolt_fissure', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'bolt',
          name: 'Holy Bolt Fissure',
          stats: { holyPct: 5 },
          morph: {
            skills: ['Fist of the Heavens', 'Holy Bolt', "Heaven's Fury"],
            extraNPerRank: 1, pierce: true, healPct: 2, dmgPct: 7,
            label: (r) => `+${r} Piercing Bolt/Strike, heals ${r * 2}% Max Life on cast`,
          },
          desc: (r) => `<b>Morph — Fist of the Heavens, Holy Bolt & Heaven's Fury:</b> Fires <b>+${r}</b> piercing bolt/pillar, deals +${r * 7}% damage, and heals ${r * 2}% Max Life on cast.`,
        },
        {
          key: 'divine_wellstorm', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Divine Wellstorm',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Fist of the Heavens', "Heaven's Fury", 'Consecration'],
            el: 'light', trail: 'light', durPct: 20, dmgPct: 7,
            label: (r) => `Persistent Lightning Storm field, +${r * 20}% Duration, +${r * 7}% Damage`,
          },
          desc: (r) => `<b>Morph — Fist of the Heavens, Heaven's Fury & Consecration:</b> Converts to <b>Lightning</b>, leaves a persistent Storm field, extends duration by +${r * 20}%, and deals +${r * 7}% damage.`,
        },
        {
          key: 'aegis_of_valor', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'hammer',
          name: 'Aegis of Valor',
          stats: { holyPct: 25, castSpeed: 12, cdr: 10 },
          morph: {
            skills: ['Blessed Hammer', 'Fist of the Heavens', 'Apocalypse of Light'],
            extraN: 2, dmgPct: 16,
            label: () => '+2 Trident Hammers/Strikes & +16% Skill Damage',
          },
          desc: () => `<b>Keystone:</b> +25% Holy Damage, +12% Cast Speed, and +10% Cooldown Reduction. Blessed Hammer, Fist of the Heavens, and Apocalypse of Light unleash +2 extra hammers/strikes in trident formation (+16% damage).`,
        },
        {
          key: 'archon_of_light', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'pillar',
          name: 'Archon of Light',
          stats: { holyPct: 30, critChance: 8, critDmg: 35 },
          morph: {
            tree: [0, 3], novaOnCast: 'holy', dmgPct: 15,
            label: () => 'Unleashes a Purifying Holy Nova on cast (+15% Damage)',
          },
          desc: () => `<b>Keystone:</b> +30% Holy Damage, +8% Crit Chance, and +35% Crit Damage. Divine Wrath and Dawnbringer spells unleash an automatic Purifying Nova on cast and deal +15% damage.`,
        },
      ],
    },
    {
      name: 'Bulwark',
      el: 'phys',
      nodes: [
        {
          key: 'defiance_faith', row: 0, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Defiance & Faith',
          stats: { armorPct: 7, lifePct: 3, block: 2 },
          desc: (r) => `+${r * 7}% Armor, +${r * 3}% Maximum Life, and +${r * 2}% Shield Block Chance.`,
        },
        {
          key: 'war_steed_trample', row: 1, choice: 'A', maxRank: 3, el: 'holy', fx: 'charge',
          name: 'War Steed Trample',
          stats: { moveSpeed: 5 },
          morph: {
            skills: ["Crusader's Charge", 'Seraph Wings', 'Falling Sword'],
            trail: 'holy', cdPct: 10, dmgPct: 9,
            label: (r) => `Leaves consecrated trample wake, -${r * 10}% Cooldown, +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Crusader's Charge, Seraph Wings & Falling Sword:</b> Charges atop a celestial warhorse wake that burns foes with Holy Light, cuts cooldown by ${r * 10}%, and deals +${r * 9}% damage.`,
        },
        {
          key: 'shield_ram_impact', row: 1, choice: 'B', maxRank: 3, el: 'phys', fx: 'shield',
          name: 'Shield Ram Impact',
          stats: { block: 3 },
          morph: {
            skills: ["Crusader's Charge", 'Smite'],
            novaOnCast: 'holy', stun: true, areaPct: 12, dmgPct: 9,
            label: (r) => `Explosive Shield Slam shockwave, Stuns, +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Crusader's Charge & Smite:</b> Detonates an explosive holy shield slam on impact that stuns nearby enemies (+${r * 12}% AoE, +${r * 9}% damage). +${r * 3}% Block Chance.`,
        },
        {
          key: 'iron_maiden_thorns', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Iron Maiden Thorns',
          stats: { thorns: 24, armorPct: 4, reduce: 2 },
          skillMult: { skills: ['Smite', 'Blessed Shield', 'Bastion of Faith'], pct: 6 },
          desc: (r) => `+${r * 24} Thorns, +${r * 4}% Armor, +${r * 2}% Damage Reduction, and +${r * 6}% Smite, Blessed Shield & Bastion of Faith Damage.`,
        },
        {
          key: 'combusting_aegis', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Combusting Aegis',
          stats: { firePct: 5 },
          morph: {
            skills: ['Blessed Shield', 'Holy Shield'],
            el: 'fire', extraBounce: 2, burn: true, dmgPct: 8,
            label: (r) => `+${r * 2} Shield Ricochets, Holy Fire ignition, +${r * 8}% Damage`,
          },
          desc: (r) => `<b>Morph — Blessed Shield & Holy Shield:</b> Blessed Shield gains <b>+${r * 2}</b> extra bounces and ignites targets in Holy Fire (+${r * 8}% damage). +${r * 5}% Fire Damage.`,
        },
        {
          key: 'shattering_shards', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'shield',
          name: 'Shattering Shards',
          stats: { physPct: 5, holyPct: 4 },
          morph: {
            skills: ['Blessed Shield'],
            extraNPerRank: 1, extraBounce: 1, dmgPct: 6,
            label: (r) => `+${r} Fractured Buckler(s) & +${r} Ricochet`,
          },
          desc: (r) => `<b>Morph — Blessed Shield:</b> Hurls <b>+${r}</b> additional fracturing buckler${r > 1 ? 's' : ''} with +${r} extra ricochet and +${r * 6}% damage.`,
        },
        {
          key: 'smiters_crushing_blow', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'smash',
          name: "Smiter's Crushing Blow",
          stats: { bossDmg: 35, physPct: 20, block: 10 },
          morph: {
            skills: ['Smite', 'Holy Shield', 'Bastion of Faith'],
            stun: true, dmgPct: 28,
            label: () => 'Crushing Blow: +28% Damage & heavy Boss Stun pressure',
          },
          desc: () => `<b>Keystone:</b> +35% Boss Damage, +20% Physical Damage, and +10% Block Chance. Smite, Holy Shield, and Bastion of Faith deal +28% damage with relentless stun lockdown.`,
        },
        {
          key: 'invokers_retribution', row: 4, choice: 'B', maxRank: 1, el: 'light', fx: 'lightning',
          name: "Invoker's Retribution",
          stats: { thorns: 120, resAll: 15, lifePct: 15 },
          cheatDeath: { name: 'DIVINE AEGIS!', el: 'holy', healPct: 0.45, cd: 120 },
          morph: {
            skills: ['Holy Shield', 'Bastion of Faith', 'Conviction', 'Holy Freeze Aura'],
            novaOnCast: 'light', dmgPct: 18,
            label: () => 'Unleashes Holy Lightning Retribution on cast (+18% Damage)',
          },
          desc: () => `<b>Keystone:</b> +120 Thorns, +15% All Resistances, and +15% Max Life. Defensive auras blast attackers with Holy Lightning, and fatal damage triggers <b>Divine Aegis</b> (restores 45% Life, 120s CD).`,
        },
      ],
    },
    {
      name: 'Crusade',
      el: 'fire',
      nodes: [
        {
          key: 'righteous_zeal', row: 0, maxRank: 5, el: 'phys', fx: 'blade',
          name: 'Righteous Zeal',
          stats: { physPct: 5, atkSpeed: 3, str: 3 },
          desc: (r) => `+${r * 5}% Physical Melee Damage, +${r * 3}% Attack Speed, and +${r * 3} Strength.`,
        },
        {
          key: 'fanatic_flurry', row: 1, choice: 'A', maxRank: 3, el: 'holy', fx: 'blade',
          name: 'Fanatic Flurry',
          stats: { atkSpeed: 4 },
          morph: {
            skills: ['Zeal', 'Dawnblade'],
            extraNPerRank: 1, dmgPct: 6,
            label: (r) => `+${r} Extra Swing(s) & +${r * 6}% Flurry Damage`,
          },
          desc: (r) => `<b>Morph — Zeal & Dawnblade:</b> Unleashes <b>+${r}</b> additional rapid swing${r > 1 ? 's' : ''} per flurry and deals +${r * 6}% damage. +${r * 4}% Attack Speed.`,
        },
        {
          key: 'cleaving_wrath', row: 1, choice: 'B', maxRank: 3, el: 'blood', fx: 'slash',
          name: 'Cleaving Wrath',
          stats: { physPct: 5, lifeSteal: 1.5 },
          morph: {
            skills: ['Zeal', 'Sweep'],
            bleed: true, leech: true, areaPct: 12, dmgPct: 8,
            label: (r) => `Wide Cleave (+${r * 12}% AoE), inflicts Bleed & Life Steal`,
          },
          desc: (r) => `<b>Morph — Zeal & Sweep:</b> Widens strike arc by +${r * 12}%, inflicts rupturing Bleeds, leeches Life, and deals +${r * 8}% damage.`,
        },
        {
          key: 'elemental_avenger', row: 2, maxRank: 5, el: 'fire', fx: 'blade',
          name: 'Elemental Avenger',
          stats: { firePct: 6, coldPct: 6, lightPct: 6, resAll: 3 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 6}% Fire, Cold & Lightning Damage, +${r * 3}% All Resistances, and +${r * 4}% Zealot Combat Skill Damage.`,
        },
        {
          key: 'instant_vacuum_detonation', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'nova',
          name: 'Instant Vacuum Detonation',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Condemn', 'Inquisition'],
            pull: true, stun: true, areaPct: 12, cdPct: 10, dmgPct: 8,
            label: (r) => `Instant Vacuum Pull + Stun, +${r * 12}% AoE, -${r * 10}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Condemn & Inquisition:</b> Violently vacuums surrounding enemies into melee range and stuns them (+${r * 12}% radius, -${r * 10}% cooldown, +${r * 8}% damage).`,
        },
        {
          key: 'reciprocating_retaliation', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'pillar',
          name: 'Reciprocating Retaliation',
          stats: { holyPct: 5, firePct: 5 },
          morph: {
            skills: ['Condemn', 'Vengeance', 'Holy Fire Blade'],
            novaOnCast: 'holy', trail: 'fire', dmgPct: 10,
            label: (r) => `Secondary Holy Detonation + Consecrated Aftershock (+${r * 10}% Damage)`,
          },
          desc: (r) => `<b>Morph — Condemn, Vengeance & Holy Fire Blade:</b> Triggers an extra Holy shockwave and leaves burning ground behind (+${r * 10}% damage). +${r * 5}% Holy & Fire Damage.`,
        },
        {
          key: 'avenging_executioner', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'blade',
          name: 'Avenging Executioner',
          stats: { critDmg: 50, bossDmg: 25, critChance: 6 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.2 },
          morph: {
            skills: ['Final Judgment', 'Blade Barrage', 'Vengeance'],
            resetOnKill: true, dmgPct: 25,
            label: () => 'Kills instantly reset Cooldown; +25% Skill Damage',
          },
          desc: () => `<b>Keystone:</b> +50% Crit Damage, +25% Boss Damage, and +6% Crit Chance. Kills with Final Judgment, Blade Barrage, or Vengeance reset their cooldowns (+25% damage), and burning foes explode on death.`,
        },
        {
          key: 'crusader_kings_fervor', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'aura',
          name: "Crusader King's Fervor",
          stats: { cdr: 18, atkSpeed: 15, dmgPct: 15 },
          morph: {
            skills: ['Zeal', 'Crusade', 'Avatar of Dawn'],
            waveProj: { fx: 'blade', el: 'holy', nPerRank: 2, dmgMul: 0.45 },
            cdPct: 20,
            label: () => '-20% Skill Cooldown & launches 2 Holy Blade Waves',
          },
          desc: () => `<b>Keystone:</b> +18% Cooldown Reduction, +15% Attack Speed, and +15% All Damage. Zeal launches twin piercing Holy Blade waves and cuts Crusade & Avatar of Dawn cooldowns by 20%.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 2. RANGER — Deadeye Marksman / Primal Packleader / Saboteur & Starbow
  // =========================================================================
  ranger: [
    {
      name: 'Deadeye Marksman',
      el: 'phys',
      nodes: [
        {
          key: 'keen_aim', row: 0, maxRank: 5, el: 'phys', fx: 'arrow',
          name: 'Eagle Eye',
          stats: { dex: 3, critChance: 2, projSpeed: 5 },
          desc: (r) => `+${r * 3} Dexterity, +${r * 2}% Critical Chance, and +${r * 5}% Projectile Speed.`,
        },
        {
          key: 'frost_quiver', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Glacial Quiver',
          stats: { coldPct: 5 },
          morph: {
            skills: ['Quick Shot', 'Multishot', 'Rain of Arrows'],
            el: 'cold', slow: true, freeze: true, dmgPct: 7,
            label: (r) => `Frost conversion, chills/freezes packs (+${r * 7}% Damage)`,
          },
          desc: (r) => `<b>Morph — Quick Shot, Multishot & Rain of Arrows:</b> Infuses arrows with <b>Cold</b>, chilling and freezing enemies while dealing +${r * 7}% damage. +${r * 5}% Cold Damage.`,
        },
        {
          key: 'splinter_broadheads', row: 1, choice: 'B', maxRank: 3, el: 'phys', fx: 'arrow',
          name: 'Broadhead Volley',
          stats: { physPct: 5 },
          morph: {
            skills: ['Quick Shot', 'Multishot', 'Strafe', 'Starlight Arrow'],
            extraNPerRank: 1, bleed: true, dmgPct: 6,
            label: (r) => `+${r} Arrow(s) per volley & inflicts Bleed`,
          },
          desc: (r) => `<b>Morph — Quick Shot, Multishot, Strafe & Starlight Arrow:</b> Fires <b>+${r}</b> extra arrow${r > 1 ? 's' : ''}, inflicts Bleeding, and deals +${r * 6}% damage. +${r * 5}% Physical Damage.`,
        },
        {
          key: 'lethal_draw', row: 2, maxRank: 5, el: 'phys', fx: 'arrow',
          name: 'Lethal Draw',
          stats: { critDmg: 9, atkSpeed: 3, pierce: 0.4 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 9}% Critical Damage, +${r * 3}% Attack Speed, and +${r * 4}% Bowmastery Skill Damage.`,
        },
        {
          key: 'ricochet_seeker', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'star',
          name: 'Astral Ricochet',
          stats: { arcanePct: 5 },
          morph: {
            skills: ['Guided Arrow', 'Piercing Arrow', 'Constellation Shot', "Orion's Bow"],
            extraBounce: 2, home: true, dmgPct: 8,
            label: (r) => `Homing + ${r * 2} Ricochets (+${r * 8}% Damage)`,
          },
          desc: (r) => `<b>Morph — Guided Arrow, Piercing Arrow, Constellation Shot & Orion's Bow:</b> Arrows seek targets and chain/ricochet <b>+${r * 2}</b> extra times with +${r * 8}% damage.`,
        },
        {
          key: 'headshot_assassin', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Explosive Caliber',
          stats: { bossDmg: 6, firePct: 4 },
          morph: {
            skills: ['Sniper Shot', 'Nova Arrow', 'Arrow Storm'],
            el: 'fire', burn: true, curse: 'mark', resetOnKill: true, dmgPct: 9,
            label: (r) => `Solar Fire conversion, Marks target, resets CD on kill`,
          },
          desc: (r) => `<b>Morph — Sniper Shot, Nova Arrow & Arrow Storm:</b> Converts to <b>Fire</b>, applies Hunter's Mark, deals +${r * 9}% damage, and resets cooldown on kill!`,
        },
        {
          key: 'windforce_sharpshooter', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'arrow',
          name: 'Windforce Sovereign',
          stats: { extraProj: 2, atkSpeed: 16, moveSpeed: 12 },
          morph: {
            tree: [0, 3], kind: 'proj', pierce: true, dmgPct: 14,
            label: () => 'All bow projectiles pierce & deal +14% Damage',
          },
          desc: () => `<b>Keystone:</b> +2 Projectiles, +16% Attack Speed, and +12% Move Speed. All Bowmastery and Astral Archer projectiles pierce targets and deal +14% damage.`,
        },
        {
          key: 'supernova_hunter', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'star',
          name: 'Voidstar Horizon',
          stats: { arcanePct: 30, critDmg: 45, cdr: 12 },
          morph: {
            skills: ['Black Hole Arrow', 'Lunar Flare', 'Falling Stars', 'Supernova Barrage'],
            pull: true, areaPct: 25, dmgPct: 20,
            label: () => 'Gravitational Pull, +25% AoE & +20% Damage',
          },
          desc: () => `<b>Keystone:</b> +30% Arcane Damage, +45% Crit Damage, and +12% Cooldown Reduction. Astral AoE skills violently pull enemies inward with +25% radius and +20% damage.`,
        },
      ],
    },
    {
      name: 'Primal Packleader',
      el: 'poison',
      nodes: [
        {
          key: 'wild_bond', row: 0, maxRank: 5, el: 'poison', fx: 'claw',
          name: 'Kinship of the Wild',
          stats: { summonPct: 7, lifePct: 3, poisonPct: 4 },
          desc: (r) => `+${r * 7}% Companion Damage & Life, +${r * 3}% Max Life, and +${r * 4}% Poison Damage.`,
        },
        {
          key: 'dire_alpha', row: 1, choice: 'A', maxRank: 3, el: 'blood', fx: 'claw',
          name: 'Alpha Direwolves',
          stats: { summonPct: 6 },
          morph: {
            skills: ['Wolf Companion'],
            sumSwap: 'direwolf', summonHpPct: 25, summonDmgPct: 20,
            label: (r) => `Summons Dire Wolves (+${r * 25}% HP, +${r * 20}% Dmg, Life Leech)`,
          },
          desc: (r) => `<b>Morph — Wolf Companion:</b> Summons ferocious <b>Dire Wolves</b> that leech life for you, with +${r * 25}% Life and +${r * 20}% Damage.`,
        },
        {
          key: 'storm_pack', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Tempest Pack',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Wolf Companion', 'Hawk Companion'],
            sumSwap: 'stormwolf', extraN: 1, extraMax: 1, summonDmgPct: 16,
            label: (r) => `Summons +1 Storm Wolf w/ Chain Lightning (+${r * 16}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Wolf & Hawk Companion:</b> Calls <b>Storm Wolves</b> (+1 max pack size) whose strikes arc Chain Lightning across foes (+${r * 16}% minion damage).`,
        },
        {
          key: 'bramble_venom', row: 2, maxRank: 5, el: 'poison', fx: 'blob',
          name: 'Venomous Thorns',
          stats: { poisonPct: 6, resPoison: 6, lifeRegen: 3 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 6}% Poison Damage, +${r * 6}% Poison Resist, +${r * 3} Life/s, and +${r * 4}% Nature's Warden Skill Damage.`,
        },
        {
          key: 'strangling_briars', row: 3, choice: 'A', maxRank: 3, el: 'poison', fx: 'blob',
          name: 'Virulent Briars',
          stats: { poisonPct: 6 },
          morph: {
            skills: ['Entangling Roots', 'Poison Ivy Shot', 'Ghost Stampede'],
            el: 'poison', poison: true, slow: true, areaPct: 14, dmgPct: 8,
            label: (r) => `Poison infusion, snares & +${r * 14}% AoE (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Entangling Roots, Poison Ivy Shot & Ghost Stampede:</b> Inflicts virulent <b>Poison</b> and Slow across +${r * 14}% larger area (+${r * 8}% damage).`,
        },
        {
          key: 'spirit_ursine', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'claw',
          name: 'Celestial Guardian',
          stats: { lifePct: 4, reduce: 2 },
          morph: {
            skills: ['Great Bear', 'Heart of the Oak'],
            sumSwap: 'spiritbear', summonHpPct: 30, healPct: 3,
            label: (r) => `Summons Spirit Bear (+${r * 30}% HP) & heals ${r * 3}% Life`,
          },
          desc: (r) => `<b>Morph — Great Bear & Heart of the Oak:</b> Transforms your bear into a sacred <b>Spirit Bear</b> (+${r * 30}% HP) and heals ${r * 3}% Max Life on cast.`,
        },
        {
          key: 'beastlord_sovereign', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'claw',
          name: 'Lord of the Stampede',
          stats: { summonPct: 40, atkSpeed: 15, lifePct: 15 },
          morph: {
            tree: 1, kind: 'summon', extraN: 1, extraMax: 1, summonDmgPct: 25,
            label: () => '+1 Max Companion & +25% Companion Attack Power',
          },
          desc: () => `<b>Keystone:</b> +40% Companion Power, +15% Attack Speed, and +15% Max Life. All Nature's Warden summon skills raise <b>+1 additional companion</b> with +25% damage.`,
        },
        {
          key: 'plaguebloom_avatar', row: 4, choice: 'B', maxRank: 1, el: 'poison', fx: 'blob',
          name: 'Blightbloom Avatar',
          stats: { poisonPct: 35, dmgPct: 15, lifeSteal: 4 },
          onKill: { status: 'poison', el: 'poison', pctMaxHp: 0.18 },
          desc: () => `<b>Keystone:</b> +35% Poison Damage, +15% All Damage, and +4% Life Steal. Poisoned enemies burst into toxic spores on death for 18% of their Max Life.`,
        },
      ],
    },
    {
      name: 'Saboteur & Gadgeteer',
      el: 'light',
      nodes: [
        {
          key: 'tinker_rigging', row: 0, maxRank: 5, el: 'fire', fx: 'trap',
          name: 'Cunning Sabotage',
          stats: { cdr: 3, firePct: 4, lightPct: 4 },
          desc: (r) => `+${r * 3}% Cooldown Reduction and +${r * 4}% Fire & Lightning Damage.`,
        },
        {
          key: 'cluster_rig', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'explosion',
          name: 'Cluster Munitions',
          stats: { firePct: 4 },
          morph: {
            skills: ['Spike Trap', 'Explosive Trap', 'Cluster Minefield'],
            extraNPerRank: 1, burn: true, dmgPct: 7,
            label: (r) => `Deploys +${r} extra Trap(s) & ignites enemies`,
          },
          desc: (r) => `<b>Morph — Spike Trap, Explosive Trap & Cluster Minefield:</b> Throws <b>+${r}</b> additional trap${r > 1 ? 's' : ''}, ignites enemies, and deals +${r * 7}% damage.`,
        },
        {
          key: 'arc_pylons', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Arc Sentry Network',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Lightning Pylon', 'Death Machine'],
            sumSwap: 'chainsentry', extraN: 1, extraMax: 1, summonDmgPct: 18,
            label: (r) => `Upgrades to Chain Sentries (+1 Max, +${r * 18}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Lightning Pylon & Death Machine:</b> Upgrades sentries into <b>Chain Sentries</b> (+1 max turret) that arc lightning across 5 targets (+${r * 18}% damage).`,
        },
        {
          key: 'evasive_tactics', row: 2, maxRank: 5, el: 'phys', fx: 'smoke',
          name: 'Shadow Footwork',
          stats: { moveSpeed: 4, critChance: 2, reduce: 1.5 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 4}% Move Speed, +${r * 2}% Crit Chance, +${(r * 1.5).toFixed(1)}% Damage Reduction, and +${r * 4}% Traps & Tricks Skill Damage.`,
        },
        {
          key: 'assassin_step', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'shadow',
          name: 'Phantom Ambush',
          stats: { critDmg: 10 },
          morph: {
            skills: ['Smoke Screen', 'Shadow Step', 'Decoy'],
            cdPct: 12, trail: 'poison', healPct: 3,
            label: (r) => `-${r * 12}% Cooldown, drops toxic cloud & heals ${r * 3}% Life`,
          },
          desc: (r) => `<b>Morph — Smoke Screen, Shadow Step & Decoy:</b> Reduces cooldown by ${r * 12}%, leaves a choking poison cloud behind, and restores ${r * 3}% Max Life.`,
        },
        {
          key: 'death_pylon', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'explosion',
          name: 'Pyroclast Turrets',
          stats: { firePct: 5, areaPct: 5 },
          morph: {
            skills: ['Lightning Pylon', 'Caltrops'],
            sumSwap: 'deathsentry', el: 'fire', burn: true, dmgPct: 9,
            label: (r) => `Converts to Death Sentries / Fire Caltrops (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Lightning Pylon & Caltrops:</b> Converts Lightning Pylon into fiery <b>Death Sentries</b> that call down flame pillars, and makes Caltrops burn (+${r * 9}% damage).`,
        },
        {
          key: 'master_trapper', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'trap',
          name: 'Grand Machinist',
          stats: { cdr: 15, areaPct: 20, dmgPct: 16 },
          morph: {
            tree: 2, pull: true, extraN: 1,
            label: () => '+1 Trap/Sentry & Magnetic Pull on detonation',
          },
          desc: () => `<b>Keystone:</b> +15% Cooldown Reduction, +20% Area Size, and +16% All Damage. Traps & Tricks skills deploy +1 device and pull enemies into the blast.`,
        },
        {
          key: 'nightstalker_cloak', row: 4, choice: 'B', maxRank: 1, el: 'shadow', fx: 'smoke',
          name: "Nightstalker's Veil",
          stats: { moveSpeed: 15, critChance: 10, resAll: 12 },
          cheatDeath: { name: 'VANISH!', el: 'shadow', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +15% Move Speed, +10% Crit Chance, and +12% All Resistances. Fatal damage triggers <b>Vanish</b>, cloaking you in smoke and restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
  ],

  // =========================================================================
  // 3. WIZARD — Pyromancy / Cryomancy / Storm & Prism
  // =========================================================================
  wizard: [
    {
      name: 'Conflagration',
      el: 'fire',
      nodes: [
        {
          key: 'pyromaniac', row: 0, maxRank: 5, el: 'fire', fx: 'fireball',
          name: 'Kindled Soul',
          stats: { firePct: 6, int: 3, castSpeed: 2 },
          desc: (r) => `+${r * 6}% Fire Damage, +${r * 3} Intelligence, and +${r * 2}% Cast Speed.`,
        },
        {
          key: 'meteoric_wake', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Scorched Earth',
          stats: { firePct: 4 },
          morph: {
            skills: ['Fireball', 'Meteor', 'Volcano'],
            trail: 'fire', areaPct: 12, dmgPct: 7,
            label: (r) => `Leaves burning magma pool, +${r * 12}% AoE (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Fireball, Meteor & Volcano:</b> Impacts leave a burning magma pool for 3.5s, expand blast radius by +${r * 12}%, and deal +${r * 7}% damage.`,
        },
        {
          key: 'phoenix_hydra', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'dragon',
          name: 'Phoenix Familiar',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Summon Hydra'],
            sumSwap: 'phoenix', extraN: 1, durPct: 25, summonDmgPct: 18,
            label: (r) => `Conjures swooping Phoenixes (+1 bird, +${r * 18}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Summon Hydra:</b> Replaces stationary Hydras with mobile blazing <b>Phoenixes</b> (+1 bird, +${r * 25}% duration, +${r * 18}% damage).`,
        },
        {
          key: 'searing_focus', row: 2, maxRank: 5, el: 'fire', fx: 'fireball',
          name: 'Searing Intensity',
          stats: { critChance: 2, critDmg: 8, manaRegenPct: 5 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 8}% Crit Damage, +${r * 5}% Mana Regen, and +${r * 4}% Pyromancy Skill Damage.`,
        },
        {
          key: 'starfire_meteor', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'star',
          name: 'Astral Starfall',
          stats: { arcanePct: 6 },
          morph: {
            skills: ['Meteor', 'Inferno Beam', 'Armageddon'],
            el: 'arcane', pull: true, cdPct: 10, dmgPct: 8,
            label: (r) => `Arcane Starfire conversion, pulls foes, -${r * 10}% CD`,
          },
          desc: (r) => `<b>Morph — Meteor, Inferno Beam & Armageddon:</b> Converts to <b>Arcane Starfire</b>, pulls enemies inward, reduces cooldown by ${r * 10}%, and deals +${r * 8}% damage.`,
        },
        {
          key: 'living_inferno', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'nova',
          name: 'Flashpoint Wave',
          stats: { firePct: 5, castSpeed: 3 },
          morph: {
            skills: ['Combustion', 'Flame Wave', 'Fire Wall'],
            extraNPerRank: 1, burn: true, dmgPct: 8,
            label: (r) => `+${r} extra wave/pulse & intense Ignite (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Combustion, Flame Wave & Fire Wall:</b> Unleashes <b>+${r}</b> additional wave/pulse, guarantees Ignite, and deals +${r * 8}% damage.`,
        },
        {
          key: 'solar_apocalypse', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'meteor',
          name: 'Heart of the Sun',
          stats: { firePct: 32, areaPct: 20, critDmg: 35 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +32% Fire Damage, +20% Area Size, and +35% Crit Damage. Ignited enemies detonate on death for 22% of their Max Life as Fire damage.`,
        },
        {
          key: 'phoenix_rebirth_key', row: 4, choice: 'B', maxRank: 1, el: 'fire', fx: 'fireball',
          name: 'Ashen Rebirth',
          stats: { lifePct: 15, resFire: 25, dmgPct: 16 },
          cheatDeath: { name: 'ASHEN REBIRTH!', el: 'fire', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +15% Max Life, +25% Fire Resist, and +16% All Damage. Fatal damage triggers <b>Ashen Rebirth</b>, erupting in flame and restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Absolute Cryomancy',
      el: 'cold',
      nodes: [
        {
          key: 'permafrost', row: 0, maxRank: 5, el: 'cold', fx: 'frost',
          name: 'Rimeheart',
          stats: { coldPct: 6, armorPct: 5, manaMax: 8 },
          desc: (r) => `+${r * 6}% Cold Damage, +${r * 5}% Armor, and +${r * 8} Max Mana.`,
        },
        {
          key: 'splintering_ice', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'shard',
          name: 'Shatter Lance',
          stats: { coldPct: 4 },
          morph: {
            skills: ['Frost Bolt', 'Glacial Spike', 'Frozen Orb'],
            extraNPerRank: 1, pierce: true, dmgPct: 6,
            label: (r) => `+${r} Ice Projectile(s) & Piercing Shards`,
          },
          desc: (r) => `<b>Morph — Frost Bolt, Glacial Spike & Frozen Orb:</b> Fires <b>+${r}</b> extra projectile${r > 1 ? 's' : ''} that pierce through enemies and deal +${r * 6}% damage.`,
        },
        {
          key: 'crystal_carapace', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'shield',
          name: 'Glacial Aegis',
          stats: { armorPct: 6, resCold: 8 },
          morph: {
            skills: ['Ice Armor', 'Frost Nova', 'Ice Wall'],
            novaOnCast: 'cold', freeze: true, durPct: 20,
            label: (r) => `Triggers Freezing Nova on cast, +${r * 20}% Duration`,
          },
          desc: (r) => `<b>Morph — Ice Armor, Frost Nova & Ice Wall:</b> Casting unleashes a freezing shockwave and increases duration by +${r * 20}%. +${r * 6}% Armor.`,
        },
        {
          key: 'winter_embrace', row: 2, maxRank: 5, el: 'cold', fx: 'frost',
          name: "Winter's Precision",
          stats: { critChance: 2.5, cdr: 3, resAll: 3 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${(r * 2.5).toFixed(1)}% Crit Chance, +${r * 3}% Cooldown Reduction, +${r * 3}% All Resistances, and +${r * 4}% Cryomancy Skill Damage.`,
        },
        {
          key: 'whiteout_vortex', row: 3, choice: 'A', maxRank: 3, el: 'cold', fx: 'blizzard',
          name: 'Polar Vortex',
          stats: { areaPct: 6 },
          morph: {
            skills: ['Blizzard', 'Deep Freeze', 'Absolute Zero'],
            pull: true, freeze: true, areaPct: 14, dmgPct: 8,
            label: (r) => `Pulls foes into blizzard, Freezes & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Blizzard, Deep Freeze & Absolute Zero:</b> Draws enemies into the eye of the storm, freezes them solid, and expands area by +${r * 14}% (+${r * 8}% damage).`,
        },
        {
          key: 'frostfire_orb', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'orb',
          name: 'Frostfire Singularity',
          stats: { firePct: 5, coldPct: 5 },
          morph: {
            skills: ['Frozen Orb', 'Chromatic Orb'],
            burn: true, slow: true, dmgPct: 12,
            label: (r) => `Inflicts both Burn & Chill (+${r * 12}% Orb Damage)`,
          },
          desc: (r) => `<b>Morph — Frozen Orb & Chromatic Orb:</b> Fuses ice and flame to inflict both Burn and Chill while dealing +${r * 12}% damage. +${r * 5}% Fire & Cold Damage.`,
        },
        {
          key: 'eternal_winter', row: 4, choice: 'A', maxRank: 1, el: 'cold', fx: 'frost',
          name: 'Lord of Eternal Winter',
          stats: { coldPct: 30, reduce: 8, critDmg: 40 },
          onKill: { status: 'chill', el: 'cold', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +30% Cold Damage, +8% Damage Reduction, and +40% Crit Damage. Chilled or Frozen enemies shatter on death for 20% Max Life Cold damage.`,
        },
        {
          key: 'archon_prism_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'beam',
          name: 'Sovereign Archon',
          stats: { arcanePct: 28, castSpeed: 16, cdr: 14 },
          morph: {
            tree: 3, dmgPct: 18, pierce: true,
            label: () => '+18% Prismatic Spell Damage & Piercing Beams/Bolts',
          },
          desc: () => `<b>Keystone:</b> +28% Arcane Damage, +16% Cast Speed, and +14% Cooldown Reduction. All Prismatic Savant spells pierce targets and deal +18% damage.`,
        },
      ],
    },
    {
      name: 'Tempest & Prism',
      el: 'light',
      nodes: [
        {
          key: 'arc_conduit', row: 0, maxRank: 5, el: 'light', fx: 'lightning',
          name: 'High Voltage',
          stats: { lightPct: 5, arcanePct: 4, castSpeed: 3 },
          desc: (r) => `+${r * 5}% Lightning Damage, +${r * 4}% Arcane Damage, and +${r * 3}% Cast Speed.`,
        },
        {
          key: 'superconductor', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Superconductor',
          stats: { lightPct: 4 },
          morph: {
            skills: ['Charged Bolt', 'Lightning Bolt', 'Chain Lightning', 'Ball Lightning'],
            extraBounce: 2, extraNPerRank: 1, dmgPct: 6,
            label: (r) => `+${r} Bolt(s) & +${r * 2} Chain Jumps (+${r * 6}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Charged Bolt, Lightning Bolt, Chain Lightning & Ball Lightning:</b> Adds <b>+${r}</b> projectile and <b>+${r * 2}</b> chain arcs with +${r * 6}% damage.`,
        },
        {
          key: 'aether_step', row: 1, choice: 'B', maxRank: 3, el: 'arcane', fx: 'lightning',
          name: 'Aether Slipstream',
          stats: { moveSpeed: 4, cdr: 3 },
          morph: {
            skills: ['Teleport', 'Prismatic Ward'],
            novaOnCast: 'light', cdPct: 12, stun: true,
            label: (r) => `-${r * 12}% Cooldown & Stuns nearby foes on arrival`,
          },
          desc: (r) => `<b>Morph — Teleport & Prismatic Ward:</b> Arrival blasts nearby enemies with stunning lightning and reduces cooldown by ${r * 12}%. +${r * 4}% Move Speed.`,
        },
        {
          key: 'arcane_torrent_flow', row: 2, maxRank: 5, el: 'arcane', fx: 'orb',
          name: 'Leyline Surge',
          stats: { manaRegenPct: 8, echoChance: 2, dmgPct: 4 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 8}% Mana Regen, +${r * 2}% Spell Echo Chance, +${r * 4}% All Damage, and +${r * 4}% Stormcalling Skill Damage.`,
        },
        {
          key: 'prism_convergence', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'beam',
          name: 'Focused Spectrum',
          stats: { arcanePct: 5, bossDmg: 5 },
          morph: {
            skills: ['Spectral Blades', 'Disintegrate Beam', 'Singularity Lens', 'Chromatic Wave'],
            pull: true, leech: true, dmgPct: 9,
            label: (r) => `Draws foes inward, leeches Life & +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Spectral Blades, Disintegrate Beam, Singularity Lens & Chromatic Wave:</b> Pulls enemies toward the beam/wave, leeches Life, and deals +${r * 9}% damage.`,
        },
        {
          key: 'eye_of_thunder', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Tempest Overcharge',
          stats: { lightPct: 6 },
          morph: {
            skills: ['Static Field', 'Thunderstorm', 'Tempest Cyclone', 'Wrath of the Sky'],
            extraNPerRank: 1, stun: true, durPct: 20, dmgPct: 7,
            label: (r) => `+${r} Cyclone/Strike, Stuns & +${r * 20}% Duration`,
          },
          desc: (r) => `<b>Morph — Static Field, Thunderstorm, Tempest Cyclone & Wrath of the Sky:</b> Adds +${r} cyclone/bolt, stuns struck foes, and extends duration by +${r * 20}%.`,
        },
        {
          key: 'stormgod_conduit', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'lightning',
          name: 'Avatar of Thunder',
          stats: { lightPct: 32, echoChance: 10, castSpeed: 15 },
          morph: {
            tree: 2, curse: 'mark', dmgPct: 16,
            label: () => 'Marks enemies on hit & +16% Stormcalling Damage',
          },
          desc: () => `<b>Keystone:</b> +32% Lightning Damage, +10% Spell Echo Chance, and +15% Cast Speed. Stormcalling spells mark foes to take increased damage and deal +16% damage.`,
        },
        {
          key: 'prismatic_savant_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'orb',
          name: 'Grand Prism',
          stats: { firePct: 18, coldPct: 18, lightPct: 18, arcanePct: 18, resAll: 12 },
          desc: () => `<b>Keystone:</b> Harmonizes all four elements, granting +18% Fire, Cold, Lightning, and Arcane Damage plus +12% All Resistances.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 4. NECROMANCER — Bone & Blood / Undying Legion / Blight & Curses
  // =========================================================================
  necromancer: [
    {
      name: 'Ossuary & Blood',
      el: 'blood',
      nodes: [
        {
          key: 'ivory_marrow', row: 0, maxRank: 5, el: 'phys', fx: 'bone',
          name: 'Serrated Marrow',
          stats: { physPct: 4, bloodPct: 5, castSpeed: 3 },
          desc: (r) => `+${r * 4}% Physical Damage, +${r * 5}% Blood Damage, and +${r * 3}% Cast Speed.`,
        },
        {
          key: 'splinter_spear', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'bone',
          name: 'Teeth & Splinters',
          stats: { critChance: 2 },
          morph: {
            skills: ['Bone Spear', 'Bone Spirit'],
            extraNPerRank: 1, pierce: true, dmgPct: 6,
            label: (r) => `Fires +${r} extra Spear/Spirit & Pierces`,
          },
          desc: (r) => `<b>Morph — Bone Spear & Bone Spirit:</b> Fires <b>+${r}</b> additional projectile${r > 1 ? 's' : ''}, pierces enemies, and deals +${r * 6}% damage. +${r * 2}% Crit Chance.`,
        },
        {
          key: 'crimson_lance', row: 1, choice: 'B', maxRank: 3, el: 'blood', fx: 'blood',
          name: 'Sanguine Lance',
          stats: { bloodPct: 5, lifeSteal: 2 },
          morph: {
            skills: ['Bone Spear', 'Corpse Explosion', 'Bone Storm'],
            el: 'blood', leech: true, bleed: true, dmgPct: 8,
            label: (r) => `Blood conversion, Bleeds & Leeches Life (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Bone Spear, Corpse Explosion & Bone Storm:</b> Converts to <b>Blood</b> damage, inflicts Bleed, leeches Life, and deals +${r * 8}% damage.`,
        },
        {
          key: 'crimson_pact', row: 2, maxRank: 5, el: 'blood', fx: 'blood',
          name: 'Crimson Reservoir',
          stats: { lifePct: 4, critDmg: 8, armorPct: 4 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 4}% Max Life, +${r * 8}% Crit Damage, +${r * 4}% Armor, and +${r * 4}% Bone & Blood Skill Damage.`,
        },
        {
          key: 'blight_corpse', row: 3, choice: 'A', maxRank: 3, el: 'poison', fx: 'blob',
          name: 'Miasmic Detonation',
          stats: { poisonPct: 5, areaPct: 5 },
          morph: {
            skills: ['Corpse Explosion', 'Blood Nova'],
            el: 'poison', poison: true, trail: 'poison', areaPct: 14, dmgPct: 8,
            label: (r) => `Toxic conversion, leaves Plague Pool & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Corpse Explosion & Blood Nova:</b> Detonates in virulent <b>Poison</b>, leaves a lingering plague cloud, and expands radius by +${r * 14}%.`,
        },
        {
          key: 'soul_prison', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'skull',
          name: 'Reaper Vortex',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Bone Armor', 'Bone Prison', 'Exsanguinate', 'Blood Drain'],
            pull: true, leech: true, durPct: 20, dmgPct: 9,
            label: (r) => `Draws enemies in, Leeches Life & +${r * 20}% Duration`,
          },
          desc: (r) => `<b>Morph — Bone Armor, Bone Prison, Blood Drain & Exsanguinate:</b> Pulls nearby enemies inward, leeches Life, and extends duration by +${r * 20}% (+${r * 9}% damage).`,
        },
        {
          key: 'vampire_sov', row: 4, choice: 'A', maxRank: 1, el: 'blood', fx: 'blood',
          name: 'Sanguine Sovereign',
          stats: { bloodPct: 30, lifePct: 20, lifeSteal: 5 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +30% Blood Damage, +20% Max Life, and +5% Life Steal. Bleeding enemies rupture in a crimson mist on death for 20% Max Life.`,
        },
        {
          key: 'phylactery_key', row: 4, choice: 'B', maxRank: 1, el: 'shadow', fx: 'skull',
          name: 'Lich Phylactery',
          stats: { shadowPct: 25, critDmg: 40, cdr: 12 },
          cheatDeath: { name: 'PHYLACTERY!', el: 'shadow', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +25% Shadow Damage, +40% Crit Damage, and +12% Cooldown Reduction. Fatal damage shatters your <b>Phylactery</b> instead, restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Undying Legion',
      el: 'shadow',
      nodes: [
        {
          key: 'grave_mastery', row: 0, maxRank: 5, el: 'shadow', fx: 'skull',
          name: 'Skeleton Mastery',
          stats: { summonPct: 8, vit: 3, armorPct: 4 },
          desc: (r) => `+${r * 8}% Minion Damage & Life, +${r * 3} Vitality, and +${r * 4}% Armor.`,
        },
        {
          key: 'ranged_legion', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'arrow',
          name: 'Skeletal Marksmen',
          stats: { summonPct: 6 },
          morph: {
            skills: ['Raise Skeleton'],
            sumSwap: 'skelarcher', extraN: 1, extraMax: 1, summonDmgPct: 18,
            label: (r) => `Raises Skeletal Archers (+1 Max, +${r * 18}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Raise Skeleton:</b> Raises ranged <b>Skeletal Archers</b> (+1 max skeleton) whose volleys deal +${r * 18}% damage.`,
        },
        {
          key: 'shieldwall_legion', row: 1, choice: 'B', maxRank: 3, el: 'phys', fx: 'shield',
          name: 'Ironbone Phalanx',
          stats: { summonPct: 6, block: 2 },
          morph: {
            skills: ['Raise Skeleton', 'Skeletal Reaver'],
            sumSwap: 'berserker', summonHpPct: 28, summonDmgPct: 15,
            label: (r) => `Raises Ramskull Berserkers (+${r * 28}% HP & Life Leech)`,
          },
          desc: (r) => `<b>Morph — Raise Skeleton & Skeletal Reaver:</b> Transforms warriors into cleaving <b>Ramskull Berserkers</b> that leech life for you (+${r * 28}% HP, +${r * 15}% damage).`,
        },
        {
          key: 'unholy_frenzy', row: 2, maxRank: 5, el: 'shadow', fx: 'skull',
          name: 'Danse Macabre',
          stats: { summonPct: 7, cdr: 3, resAll: 3 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 7}% Minion Power, +${r * 3}% Cooldown Reduction, +${r * 3}% All Resistances, and +${r * 4}% Undying Legion Skill Damage.`,
        },
        {
          key: 'elemental_golem', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Hellfire Golem & Pyromancers',
          stats: { firePct: 5, summonPct: 5 },
          morph: {
            skills: ['Summon Golem', 'Skeletal Mage'],
            sumSwap: 'pyromancer', summonDmgPct: 22, burn: true,
            label: (r) => `Summons Skeletal Pyromancers (+${r * 22}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Skeletal Mage & Summon Golem:</b> Raises fireball-hurling <b>Skeletal Pyromancers</b> with +${r * 22}% explosive damage.`,
        },
        {
          key: 'blood_colossus', row: 3, choice: 'B', maxRank: 3, el: 'blood', fx: 'blood',
          name: 'Bone Colossus',
          stats: { lifePct: 4, summonPct: 5 },
          morph: {
            skills: ['Summon Golem'],
            sumSwap: 'bonecolossus', summonHpPct: 35, summonDmgPct: 20,
            label: (r) => `Summons a towering Bone Colossus (+${r * 35}% HP)`,
          },
          desc: (r) => `<b>Morph — Summon Golem:</b> Replaces Clay Golem with a towering AoE-cleaving <b>Bone Colossus</b> with +${r * 35}% Life and +${r * 20}% Damage.`,
        },
        {
          key: 'overlord_of_bones', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'skull',
          name: 'Supreme Overlord',
          stats: { summonPct: 45, lifePct: 15, resAll: 10 },
          morph: {
            tree: [1, 3], kind: 'summon', extraN: 1, extraMax: 2, summonHpPct: 25,
            label: () => '+1 Summoned Minion per cast & +2 Max Minion Cap',
          },
          desc: () => `<b>Keystone:</b> +45% Minion Power, +15% Max Life, and +10% All Resistances. All Necromancer summon skills raise +1 minion per cast and gain +2 maximum cap.`,
        },
        {
          key: 'conclave_archliches', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'skull',
          name: 'Conclave of Archliches',
          stats: { summonPct: 35, shadowPct: 25, castSpeed: 12 },
          morph: {
            skills: ['Grave Warband', 'Skeletal Mage', 'Skeletal Stormcaller'],
            sumSwap: 'conclave', extraMax: 2, summonDmgPct: 25,
            label: () => 'Raises Risen Sorcerers & Archliches (+2 Max Cap)',
          },
          desc: () => `<b>Keystone:</b> +35% Minion Power, +25% Shadow Damage, and +12% Cast Speed. Grave Warband, Skeletal Mage, and Stormcaller summon the <b>Conclave of Risen Sorcerers</b> (+2 max cap).`,
        },
      ],
    },
    {
      name: 'Blight & Malediction',
      el: 'poison',
      nodes: [
        {
          key: 'festering_hex', row: 0, maxRank: 5, el: 'poison', fx: 'blob',
          name: 'Venomous Malediction',
          stats: { poisonPct: 6, shadowPct: 4, int: 3 },
          desc: (r) => `+${r * 6}% Poison Damage, +${r * 4}% Shadow Damage, and +${r * 3} Intelligence.`,
        },
        {
          key: 'eruption_hex', row: 1, choice: 'A', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Soul Rupture',
          stats: { shadowPct: 5 },
          morph: {
            skills: ['Amplify Damage', 'Decrepify', 'Life Tap', 'Terror'],
            novaOnCast: 'shadow', areaPct: 15, durPct: 18,
            label: (r) => `Blasts cursed targets w/ Shadow Nova (+${r * 15}% AoE)`,
          },
          desc: (r) => `<b>Morph — Amplify Damage, Decrepify, Life Tap & Terror:</b> Casting a curse detonates a Shadow blast on cursed ground (+${r * 15}% radius, +${r * 18}% duration).`,
        },
        {
          key: 'plague_javelins', row: 1, choice: 'B', maxRank: 3, el: 'poison', fx: 'spear',
          name: 'Pandemic Volley',
          stats: { poisonPct: 5 },
          morph: {
            skills: ['Poison Nova', 'Plague Spear', 'Plague Cloud'],
            extraNPerRank: 1, poison: true, slow: true, dmgPct: 7,
            label: (r) => `+${r} Spear/Pulse, Crippling Slow & +${r * 7}% Damage`,
          },
          desc: (r) => `<b>Morph — Poison Nova, Plague Spear & Plague Cloud:</b> Adds <b>+${r}</b> projectile/wave, slows poisoned foes, and deals +${r * 7}% damage.`,
        },
        {
          key: 'entropy_aura', row: 2, maxRank: 5, el: 'poison', fx: 'void',
          name: 'Creeping Entropy',
          stats: { areaPct: 4, cdr: 3, bossDmg: 4 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 4}% Area Size, +${r * 3}% Cooldown Reduction, +${r * 4}% Boss Damage, and +${r * 4}% Curses & Blight Skill Damage.`,
        },
        {
          key: 'bishop_inquisition', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'spirit',
          name: 'Sanctified Reliquary',
          stats: { summonPct: 6, lifeRegen: 4 },
          morph: {
            skills: ['Bone Standard-Bearer', 'Mend Bones'],
            sumSwap: 'bishop', healPct: 3, durPct: 20,
            label: (r) => `Summons healing Bone Bishops & heals ${r * 3}% Life`,
          },
          desc: (r) => `<b>Morph — Bone Standard-Bearer & Mend Bones:</b> Summons holy-smiting <b>Bone Bishops</b> that continually mend you and your army, and heals ${r * 3}% Max Life on cast.`,
        },
        {
          key: 'knell_doom', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Harbinger of Doom',
          stats: { shadowPct: 6, poisonPct: 6 },
          morph: {
            skills: ['Pestilence Aura', 'Doom', 'Reaper King'],
            pull: true, curse: 'amp', dmgPct: 10,
            label: (r) => `Pulls foes in, applies Amplify Damage (+${r * 10}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Pestilence Aura, Doom & Reaper King:</b> Draws foes inward, brands them with Amplify Damage, and deals +${r * 10}% damage.`,
        },
        {
          key: 'lord_of_pestilence', row: 4, choice: 'A', maxRank: 1, el: 'poison', fx: 'blob',
          name: 'Avatar of Pestilence',
          stats: { poisonPct: 35, areaPct: 20, reduce: 8 },
          onKill: { status: 'poison', el: 'poison', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +35% Poison Damage, +20% Area Size, and +8% Damage Reduction. Poisoned enemies explode in a virulent cloud on death for 22% Max Life.`,
        },
        {
          key: 'death_bell_key', row: 4, choice: 'B', maxRank: 1, el: 'shadow', fx: 'void',
          name: 'Toll of the Dead',
          stats: { shadowPct: 30, cdr: 15, bossDmg: 25 },
          morph: {
            tree: 2, curse: 'weaken', dmgPct: 18,
            label: () => 'Applies Weaken & deals +18% Curse/Blight Damage',
          },
          desc: () => `<b>Keystone:</b> +30% Shadow Damage, +15% Cooldown Reduction, and +25% Boss Damage. All Curses & Blight skills also inflict Weaken and deal +18% damage.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 5. BARBARIAN — Berserker Fury / Warlord Shouts / Earthshaker & Blood
  // =========================================================================
  barbarian: [
    {
      name: 'Berserker Fury',
      el: 'phys',
      nodes: [
        {
          key: 'savagery', row: 0, maxRank: 5, el: 'phys', fx: 'axe',
          name: 'Relentless Savagery',
          stats: { physPct: 5, atkSpeed: 4, str: 3 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 4}% Attack Speed, and +${r * 3} Strength.`,
        },
        {
          key: 'hurricane_steel', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'spin',
          name: 'Eye of the Bloodstorm',
          stats: { lifeSteal: 2 },
          morph: {
            skills: ['Whirlwind', 'Crimson Cleave', 'Bloodbath'],
            pull: true, leech: true, areaPct: 12, dmgPct: 7,
            label: (r) => `Pulls foes into spin, Leeches Life & +${r * 12}% AoE`,
          },
          desc: (r) => `<b>Morph — Whirlwind, Crimson Cleave & Bloodbath:</b> Pulls surrounding enemies into your blades, leeches Life, and grows +${r * 12}% wider (+${r * 7}% damage).`,
        },
        {
          key: 'volcanic_cyclone', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Cinder Cyclone',
          stats: { firePct: 6 },
          morph: {
            skills: ['Whirlwind', 'Frenzy', 'Double Throw'],
            el: 'fire', burn: true, extraNPerRank: 1, dmgPct: 8,
            label: (r) => `Volcanic Fire conversion, Ignites & +${r * 8}% Damage`,
          },
          desc: (r) => `<b>Morph — Whirlwind, Frenzy & Double Throw:</b> Imbues weapons with <b>Volcanic Fire</b>, igniting enemies and adding +${r} extra throw/strike (+${r * 8}% damage).`,
        },
        {
          key: 'carnage_momentum', row: 2, maxRank: 5, el: 'blood', fx: 'axe',
          name: 'Thirst for Carnage',
          stats: { critChance: 2.5, critDmg: 9, moveSpeed: 3 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${(r * 2.5).toFixed(1)}% Crit Chance, +${r * 9}% Crit Damage, +${r * 3}% Move Speed, and +${r * 4}% Berserker Skill Damage.`,
        },
        {
          key: 'guillotine_reset', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'slash',
          name: 'Merciless Execution',
          stats: { bloodPct: 6, bossDmg: 5 },
          morph: {
            skills: ['Executioner', 'Furious Charge', 'Massacre'],
            resetOnKill: true, bleed: true, rageGain: 6, dmgPct: 9,
            label: (r) => `Resets CD on kill, +${r * 6} Rage & Bleeds (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Executioner, Furious Charge & Massacre:</b> Killing an enemy immediately <b>resets cooldown</b>, grants +${r * 6} Rage, and inflicts heavy Bleed (+${r * 9}% damage).`,
        },
        {
          key: 'reaper_axes', row: 3, choice: 'B', maxRank: 3, el: 'blood', fx: 'axe',
          name: 'Crimson Rupture',
          stats: { bloodPct: 6 },
          morph: {
            skills: ['Rending Chop', 'Bloodletting Nova', 'Axe Rain'],
            extraNPerRank: 1, leech: true, areaPct: 14, dmgPct: 8,
            label: (r) => `+${r} Wave/Volley, Leeches Life & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Rending Chop, Bloodletting Nova & Axe Rain:</b> Adds +${r} strike/wave, leeches Life, and expands radius by +${r * 14}% (+${r * 8}% damage).`,
        },
        {
          key: 'wrath_eternal', row: 4, choice: 'A', maxRank: 1, el: 'blood', fx: 'axe',
          name: 'God of Slaughter',
          stats: { physPct: 25, bloodPct: 25, atkSpeed: 18 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +25% Physical & Blood Damage and +18% Attack Speed. Bleeding foes explode in a geyser of gore on death for 22% Max Life.`,
        },
        {
          key: 'undying_berserker', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'shout',
          name: 'Too Angry to Die',
          stats: { lifePct: 22, reduce: 8, lifeSteal: 4 },
          cheatDeath: { name: 'UNDYING RAGE!', el: 'blood', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +22% Max Life, +8% Damage Reduction, and +4% Life Steal. Fatal blows trigger <b>Undying Rage</b>, roaring back to 45% Max Life with brief invulnerability (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Warchief & Ancients',
      el: 'light',
      nodes: [
        {
          key: 'booming_lungs', row: 0, maxRank: 5, el: 'phys', fx: 'shout',
          name: 'Booming Voice',
          stats: { lifePct: 4, cdr: 3, resAll: 3 },
          desc: (r) => `+${r * 4}% Max Life, +${r * 3}% Cooldown Reduction, and +${r * 3}% All Resistances.`,
        },
        {
          key: 'thunder_bellow', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'shout',
          name: 'Thunderous Roar',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Battle Orders', 'Howl', 'Taunt', 'War Cry', 'Battle Command', 'Blood Howl'],
            novaOnCast: 'light', stun: true, rageGain: 5,
            label: (r) => `Shouts blast Lightning Nova, Stun & grant +${r * 5} Rage`,
          },
          desc: (r) => `<b>Morph — Warcries & Howls:</b> Every shout unleashes a stunning Lightning shockwave around you and generates +${r * 5} Rage.`,
        },
        {
          key: 'inspiring_rally', row: 1, choice: 'B', maxRank: 3, el: 'holy', fx: 'shout',
          name: 'Chieftain Medicine',
          stats: { lifeRegen: 4, summonPct: 6 },
          morph: {
            skills: ['Battle Orders', 'War Cry', 'Battle Command', 'Rallying Cry'],
            healPct: 5, durPct: 25,
            label: (r) => `Heals ${r * 5}% Max Life on cast & +${r * 25}% Buff Duration`,
          },
          desc: (r) => `<b>Morph — Battle Orders, War Cry, Battle Command & Rallying Cry:</b> Shouting heals you for ${r * 5}% Max Life and extends shout duration by +${r * 25}%.`,
        },
        {
          key: 'iron_hide', row: 2, maxRank: 5, el: 'phys', fx: 'shield',
          name: 'Iron Skin & Courage',
          stats: { armorPct: 7, thorns: 20, reduce: 1.5 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 7}% Armor, +${r * 20} Thorns, +${(r * 1.5).toFixed(1)}% Damage Reduction, and +${r * 4}% Warcries Skill Damage.`,
        },
        {
          key: 'storm_ancients', row: 3, choice: 'A', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Ancients of the Peak',
          stats: { summonPct: 8, lightPct: 5 },
          morph: {
            skills: ['Call of the Ancients'],
            sumSwap: 'ancientstorm', extraN: 1, durPct: 25, summonDmgPct: 20,
            label: (r) => `Summons +1 Storm Ancient w/ Chain Lightning (+${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Call of the Ancients:</b> Summons <b>Storm Ancients</b> (+1 extra Ancient, +${r * 25}% duration) whose cleaves arc lightning for +${r * 20}% damage.`,
        },
        {
          key: 'blood_standards', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'totem',
          name: 'War Standards',
          stats: { dmgPct: 5 },
          morph: {
            skills: ['Grim Ward', 'Blood Totem'],
            sumSwap: 'firebanner', extraN: 1, extraMax: 1, curse: 'amp',
            label: (r) => `Plants blazing Battle Standards (+1 Max) & Amplifies Damage`,
          },
          desc: (r) => `<b>Morph — Grim Ward & Blood Totem:</b> Plants blazing <b>Battle Standards</b> (+1 max ward) that empower you and curse nearby enemies.`,
        },
        {
          key: 'council_of_arreat', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'shout',
          name: 'Voice of Mount Arreat',
          stats: { cdr: 18, summonPct: 35, dmgPct: 16 },
          morph: {
            tree: 1, curse: 'weaken', areaPct: 25,
            label: () => '+25% Shout/Ancient AoE & Weakens nearby enemies',
          },
          desc: () => `<b>Keystone:</b> +18% Cooldown Reduction, +35% Summon Power, and +16% All Damage. All Warcries weaken enemy attacks and affect a +25% wider radius.`,
        },
        {
          key: 'juggernaut_warlord', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'shield',
          name: 'Bastion of Iron',
          stats: { armorPct: 35, lifePct: 18, bossDmg: 25 },
          desc: () => `<b>Keystone:</b> Forges an unyielding frame: +35% Armor, +18% Max Life, and +25% Damage to Champions and Bosses.`,
        },
      ],
    },
    {
      name: 'Tectonic Titan',
      el: 'fire',
      nodes: [
        {
          key: 'heavy_impact', row: 0, maxRank: 5, el: 'phys', fx: 'earth',
          name: 'Crushing Weight',
          stats: { str: 4, areaPct: 4, firePct: 4 },
          desc: (r) => `+${r * 4} Strength, +${r * 4}% Area Size, and +${r * 4}% Fire Damage.`,
        },
        {
          key: 'meteor_leap', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Crater Impact',
          stats: { firePct: 5 },
          morph: {
            skills: ['Leap Attack', 'Ground Stomp', 'Seismic Step'],
            trail: 'fire', stun: true, rageGain: 8, dmgPct: 8,
            label: (r) => `Leaves molten crater, Stuns & grants +${r * 8} Rage`,
          },
          desc: (r) => `<b>Morph — Leap Attack, Ground Stomp & Seismic Step:</b> Slamming down leaves a molten crater, stuns enemies, and generates +${r * 8} Rage (+${r * 8}% damage).`,
        },
        {
          key: 'glacier_boulder', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Avalanche Hurl',
          stats: { coldPct: 6 },
          morph: {
            skills: ['Boulder Toss', 'Avalanche'],
            el: 'cold', freeze: true, extraNPerRank: 1, pierce: true, dmgPct: 7,
            label: (r) => `Glacial conversion, Freezes & hurls +${r} Boulder(s)`,
          },
          desc: (r) => `<b>Morph — Boulder Toss & Avalanche:</b> Hurls <b>+${r}</b> freezing glacial boulders that plow through packs (+${r * 7}% damage). +${r * 6}% Cold Damage.`,
        },
        {
          key: 'faultline', row: 2, maxRank: 5, el: 'fire', fx: 'earth',
          name: 'Tectonic Force',
          stats: { critDmg: 9, physPct: 4, bossDmg: 4 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 9}% Crit Damage, +${r * 4}% Physical Damage, +${r * 4}% Boss Damage, and +${r * 4}% Earthshaker Skill Damage.`,
        },
        {
          key: 'magma_fissures', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Volcanic Faults',
          stats: { firePct: 6 },
          morph: {
            skills: ['Fissure', 'Earthquake', 'Worldsplitter'],
            el: 'fire', burn: true, extraNPerRank: 1, areaPct: 12, dmgPct: 8,
            label: (r) => `Volcanic Fire conversion, +${r} Fissure & +${r * 12}% AoE`,
          },
          desc: (r) => `<b>Morph — Fissure, Earthquake & Worldsplitter:</b> Erupts with <b>Volcanic Fire</b>, adds +${r} fissure crack, and widens AoE by +${r * 12}% (+${r * 8}% damage).`,
        },
        {
          key: 'gravity_stomp', row: 3, choice: 'B', maxRank: 3, el: 'phys', fx: 'earth',
          name: 'Subduction Pull',
          stats: { reduce: 2, armorPct: 5 },
          morph: {
            skills: ['Ground Stomp', 'Earthquake', 'Stone Skin'],
            pull: true, curse: 'amp', cdPct: 10,
            label: (r) => `Pulls foes in, Sunder Armor & -${r * 10}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Ground Stomp, Earthquake & Stone Skin:</b> Draws enemies into the quake, sunders their armor (Amplify), and reduces cooldown by ${r * 10}%.`,
        },
        {
          key: 'worldbreaker_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'earth',
          name: 'Cataclysmic Titan',
          stats: { firePct: 28, physPct: 22, areaPct: 24 },
          morph: {
            tree: 2, extraN: 1, dmgPct: 18,
            label: () => '+1 Fault/Slam Wave & +18% Earthshaker Damage',
          },
          desc: () => `<b>Keystone:</b> +28% Fire Damage, +22% Physical Damage, and +24% Area Size. All Earthshaker skills unleash +1 extra wave/crack and deal +18% damage.`,
        },
        {
          key: 'skyfall_brute', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'smash',
          name: 'Skybreaker Colossus',
          stats: { critChance: 10, critDmg: 45, cdr: 12 },
          morph: {
            skills: ['Leap Attack', 'Worldsplitter', 'Avatar of Carnage'],
            resetOnKill: true, dmgPct: 20,
            label: () => 'Resets cooldown on kill & deals +20% Damage',
          },
          desc: () => `<b>Keystone:</b> +10% Crit Chance, +45% Crit Damage, and +12% Cooldown Reduction. Kills with Leap Attack or Worldsplitter reset their cooldowns (+20% damage).`,
        },
      ],
    },
  ],

  // =========================================================================
  // 6. DRAGOON — Lance Mastery / Skyborne Diver / Wyrmblood Covenant
  // =========================================================================
  dragoon: [
    {
      name: 'Spear Sovereign',
      el: 'phys',
      nodes: [
        {
          key: 'keen_halberd', row: 0, maxRank: 5, el: 'phys', fx: 'spear',
          name: 'Valkyrie Reach',
          stats: { physPct: 5, dex: 3, critChance: 2 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 3} Dexterity, and +${r * 2}% Critical Chance.`,
        },
        {
          key: 'impaling_flurry', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'spear',
          name: 'Heartseeker Thrusts',
          stats: { critDmg: 8 },
          morph: {
            skills: ['Lance Jab', 'Twin Thrust', 'Lance Flurry', 'Thousandfold Impalement'],
            bleed: true, extraNPerRank: 1, dmgPct: 7,
            label: (r) => `+${r} Thrust/Volley & inflicts Bleed (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Lance Jab, Twin Thrust, Lance Flurry & Thousandfold Impalement:</b> Adds +${r} thrust, inflicts Bleeding, and deals +${r * 7}% damage.`,
        },
        {
          key: 'tempest_glaive', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Thunder Glaive',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Sweeping Lance', 'Spiral Lance', 'Spear Vortex'],
            el: 'light', pull: true, areaPct: 12, dmgPct: 7,
            label: (r) => `Lightning conversion, pulls foes in & +${r * 12}% AoE`,
          },
          desc: (r) => `<b>Morph — Sweeping Lance, Spiral Lance & Spear Vortex:</b> Electrifies your polearm with <b>Lightning</b>, pulls enemies in, and widens reach by +${r * 12}%.`,
        },
        {
          key: 'spearstorm_tempo', row: 2, maxRank: 5, el: 'phys', fx: 'spear',
          name: 'Relentless Cadence',
          stats: { atkSpeed: 4, pierce: 0.4, bossDmg: 4 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 4}% Attack Speed, +${r * 4}% Boss Damage, and +${r * 4}% Lance Mastery Skill Damage.`,
        },
        {
          key: 'solar_gungnir', row: 3, choice: 'A', maxRank: 3, el: 'holy', fx: 'spear',
          name: 'Heavensfall Javelins',
          stats: { holyPct: 6 },
          morph: {
            skills: ['Spear Rain', 'Gungnir', 'Triune Spearfall', 'Sunfall Lance'],
            el: 'holy', stun: true, areaPct: 14, dmgPct: 9,
            label: (r) => `Holy conversion, Stuns & +${r * 14}% Impact Radius`,
          },
          desc: (r) => `<b>Morph — Spear Rain, Gungnir, Triune Spearfall & Sunfall Lance:</b> Sanctifies spears in <b>Holy Light</b>, stunning struck enemies across +${r * 14}% wider area (+${r * 9}% damage).`,
        },
        {
          key: 'bladed_bastion', row: 3, choice: 'B', maxRank: 3, el: 'phys', fx: 'shield',
          name: 'Whirling Guard',
          stats: { armorPct: 6, block: 3 },
          morph: {
            skills: ['Lance Barrier', 'Storm of Barbs', 'Aegis of the Wyrm'],
            extraNPerRank: 1, durPct: 20, leech: true,
            label: (r) => `+${r} Orbiting Spear, Leeches Life & +${r * 20}% Duration`,
          },
          desc: (r) => `<b>Morph — Lance Barrier, Storm of Barbs & Aegis of the Wyrm:</b> Adds +${r} orbiting spear, leeches Life on hit, and extends duration by +${r * 20}%.`,
        },
        {
          key: 'sovereign_impaler', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'spear',
          name: 'Grandmaster of the Spear',
          stats: { physPct: 25, critDmg: 45, atkSpeed: 15 },
          morph: {
            tree: [0, 3], curse: 'mark', dmgPct: 16,
            label: () => 'Marks impaled targets & deals +16% Spear Damage',
          },
          desc: () => `<b>Keystone:</b> +25% Physical Damage, +45% Crit Damage, and +15% Attack Speed. Lance Mastery and Spearstorm skills Mark enemies to take extra damage (+16% skill damage).`,
        },
        {
          key: 'gungnir_eternal', row: 4, choice: 'B', maxRank: 1, el: 'light', fx: 'lightning',
          name: 'Odinic Bolt',
          stats: { lightPct: 28, holyPct: 28, extraProj: 1 },
          morph: {
            skills: ['Gungnir', 'Sovereign Spearstorm', 'Phalanx Breaker'],
            pierce: true, extraBounce: 3, dmgPct: 20,
            label: () => 'Pierces all foes, +3 Lightning Arcs & +20% Damage',
          },
          desc: () => `<b>Keystone:</b> +28% Lightning & Holy Damage and +1 Projectile. Gungnir, Phalanx Breaker, and Sovereign Spearstorm arc across +3 targets and deal +20% damage.`,
        },
      ],
    },
    {
      name: 'Skyborne Diver',
      el: 'light',
      nodes: [
        {
          key: 'wind_rider', row: 0, maxRank: 5, el: 'light', fx: 'spear',
          name: 'Gale Stride',
          stats: { moveSpeed: 4, cdr: 3, lightPct: 4 },
          desc: (r) => `+${r * 4}% Move Speed, +${r * 3}% Cooldown Reduction, and +${r * 4}% Lightning Damage.`,
        },
        {
          key: 'thunder_plunge', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Thunderbolt Dive',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Jump', 'Dragon Dive', 'Storm Dive'],
            el: 'light', stun: true, areaPct: 14, dmgPct: 8,
            label: (r) => `Lightning Dive, Stuns on landing & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Jump, Dragon Dive & Storm Dive:</b> Plunges as a bolt of <b>Lightning</b>, stunning enemies in a +${r * 14}% wider impact zone (+${r * 8}% damage).`,
        },
        {
          key: 'meteor_plunge', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Starfall Crater',
          stats: { firePct: 5 },
          morph: {
            skills: ['Jump', 'Comet Dive', 'Dragonfall'],
            el: 'fire', trail: 'fire', burn: true, dmgPct: 9,
            label: (r) => `Leaves burning crater on impact & +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Jump, Comet Dive & Dragonfall:</b> Crashes down in <b>Draconic Flame</b>, leaving a burning magma crater and dealing +${r * 9}% damage.`,
        },
        {
          key: 'aerial_supremacy', row: 2, maxRank: 5, el: 'light', fx: 'spear',
          name: 'Aerial Supremacy',
          stats: { critChance: 2, critDmg: 8, reduce: 1.5 },
          skillMult: { tree: 1, pct: 5 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 8}% Crit Damage, +${(r * 1.5).toFixed(1)}% Damage Reduction, and +${r * 5}% Aerial Leap Skill Damage.`,
        },
        {
          key: 'reset_jump', row: 3, choice: 'A', maxRank: 3, el: 'phys', fx: 'spear',
          name: 'Relentless Vault',
          stats: { cdr: 4 },
          morph: {
            skills: ['Jump', 'Dragon Dive', 'Wind Step', 'Spearstep'],
            resetOnKill: true, cdPct: 10, dmgPct: 8,
            label: (r) => `Kills reset Leap/Dash cooldown (-${r * 10}% Base CD)`,
          },
          desc: (r) => `<b>Morph — Jump, Dragon Dive, Wind Step & Spearstep:</b> Slaying an enemy <b>resets the skill's cooldown</b>; base cooldown reduced by ${r * 10}% (+${r * 8}% damage).`,
        },
        {
          key: 'cyclone_draft', row: 3, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Jetstream Vortex',
          stats: { areaPct: 6 },
          morph: {
            skills: ['Updraft Cyclone', 'Skyward Sweep', 'Feather Fall'],
            pull: true, healPct: 3, durPct: 20,
            label: (r) => `Pulls enemies inward & heals ${r * 3}% Life on cast`,
          },
          desc: (r) => `<b>Morph — Updraft Cyclone, Skyward Sweep & Feather Fall:</b> Sweeps enemies into a tight vortex, extends duration by +${r * 20}%, and heals ${r * 3}% Max Life.`,
        },
        {
          key: 'heavens_dragoon', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'lightning',
          name: 'Lord of the High Heavens',
          stats: { cdr: 16, critDmg: 45, moveSpeed: 12 },
          morph: {
            tree: 1, kind: 'leap', novaOnCast: 'light', dmgPct: 22,
            label: () => 'Every Leap triggers a Lightning Shockwave (+22% Dmg)',
          },
          desc: () => `<b>Keystone:</b> +16% Cooldown Reduction, +45% Crit Damage, and +12% Move Speed. Every Aerial Leap detonates a secondary Lightning Nova and deals +22% damage.`,
        },
        {
          key: 'valkyrie_wings_key', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'spirit',
          name: 'Wings of the Immortal',
          stats: { lifePct: 16, resAll: 12, dmgPct: 15 },
          cheatDeath: { name: 'SKYWARD ESCAPE!', el: 'light', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +16% Max Life, +12% All Resistances, and +15% All Damage. Fatal blows trigger <b>Skyward Escape</b>, restoring 45% Max Life and stunning nearby foes (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Wyrmblood Covenant',
      el: 'fire',
      nodes: [
        {
          key: 'dragon_heart_blood', row: 0, maxRank: 5, el: 'fire', fx: 'dragon',
          name: 'Draconic Vitality',
          stats: { firePct: 5, lifePct: 3, armorPct: 4 },
          desc: (r) => `+${r * 5}% Fire Damage, +${r * 3}% Max Life, and +${r * 4}% Armor.`,
        },
        {
          key: 'frostwyrm_pact', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Rimefang Lineage',
          stats: { coldPct: 6 },
          morph: {
            skills: ['Dragon Breath', 'Flame Lash', 'Bloodfire Nova'],
            el: 'cold', freeze: true, slow: true, dmgPct: 8,
            label: (r) => `Frostwyrm conversion, Freezes foes (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dragon Breath, Flame Lash & Bloodfire Nova:</b> Channels ancient <b>Frostwyrm</b> ice instead of fire, freezing enemies and dealing +${r * 8}% damage.`,
        },
        {
          key: 'crimson_wyrm', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Searing Dragonfire',
          stats: { firePct: 5, lifeSteal: 1.5 },
          morph: {
            skills: ['Dragon Breath', 'Wyrm Coil', 'Bloodfire Nova'],
            burn: true, leech: true, areaPct: 12, dmgPct: 8,
            label: (r) => `Ignites, Leeches Life & +${r * 12}% Area (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dragon Breath, Wyrm Coil & Bloodfire Nova:</b> Sears foes, leeches Life, and expands AoE by +${r * 12}% (+${r * 8}% damage).`,
        },
        {
          key: 'wyrm_scales_passive', row: 2, maxRank: 5, el: 'fire', fx: 'shield',
          name: 'Ancient Scales',
          stats: { resFire: 6, resCold: 6, summonPct: 6, str: 3 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 6}% Fire & Cold Resist, +${r * 6}% Companion Power, +${r * 3} Strength, and +${r * 4}% Dragon Blood Skill Damage.`,
        },
        {
          key: 'elder_wyvern_brood', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'dragon',
          name: 'Elder Wyrm Familiar',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Wyvern Familiar', 'Rallying Standard'],
            sumSwap: 'elderwyrm', summonHpPct: 25, summonDmgPct: 20,
            label: (r) => `Summons an Elder Wyrm (+${r * 25}% HP, +${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Wyvern Familiar & Rallying Standard:</b> Summons a massive fire-breathing <b>Elder Wyrm</b> with +${r * 25}% Life and +${r * 20}% Damage.`,
        },
        {
          key: 'dragonsoul_frenzy', row: 3, choice: 'B', maxRank: 3, el: 'blood', fx: 'dragon',
          name: 'Awakened Bloodline',
          stats: { dmgPct: 5 },
          morph: {
            skills: ['Wyrm Scale', 'Blood Pact', 'Draconic Roar', 'Dragonsoul'],
            durPct: 22, healPct: 4, novaOnCast: 'fire',
            label: (r) => `+${r * 22}% Duration, heals ${r * 4}% Life & Fire Nova`,
          },
          desc: (r) => `<b>Morph — Wyrm Scale, Blood Pact, Draconic Roar & Dragonsoul:</b> Unleashes a Dragonfire burst on cast, heals ${r * 4}% Max Life, and lasts +${r * 22}% longer.`,
        },
        {
          key: 'bahamut_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'dragon',
          name: 'Avatar of the First Wyrm',
          stats: { firePct: 30, coldPct: 30, bossDmg: 25 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +30% Fire & Cold Damage and +25% Boss Damage. Burning foes erupt in draconic flame on death for 20% Max Life.`,
        },
        {
          key: 'dragonlord_banner_key', row: 4, choice: 'B', maxRank: 1, el: 'phys', fx: 'dragon',
          name: 'Covenant of Scales',
          stats: { summonPct: 40, reduce: 8, lifeSteal: 4 },
          morph: {
            skills: ['Wyvern Familiar'],
            extraN: 1, extraMax: 1,
            label: () => 'Summons +1 additional Wyrm Companion',
          },
          desc: () => `<b>Keystone:</b> +40% Companion Power, +8% Damage Reduction, and +4% Life Steal. Wyvern Familiar summons <b>2 dragons</b> at once.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 7. TOTEM MASTER — Totemic Conduit / Spiritwalker / Primal Storm
  // =========================================================================
  totem_master: [
    {
      name: 'Totemic Architect',
      el: 'fire',
      nodes: [
        {
          key: 'carved_oak', row: 0, maxRank: 5, el: 'fire', fx: 'totem',
          name: 'Runed Heartwood',
          stats: { summonPct: 8, cdr: 2.5, lifePct: 3 },
          desc: (r) => `+${r * 8}% Totem & Spirit Power, +${(r * 2.5).toFixed(1)}% Cooldown Reduction, and +${r * 3}% Max Life.`,
        },
        {
          key: 'volcano_totems', row: 1, choice: 'A', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Volcanic Spire',
          stats: { firePct: 5 },
          morph: {
            skills: ['Elemental Totem', 'Magma Totem'],
            sumSwap: 'totem_volcano', summonDmgPct: 20, burn: true,
            label: (r) => `Upgrades into Volcano Totems (+${r * 20}% Meteor Dmg)`,
          },
          desc: (r) => `<b>Morph — Elemental Totem & Magma Totem:</b> Carves <b>Volcano Totems</b> that bombard nearby packs with fiery meteors (+${r * 20}% totem damage).`,
        },
        {
          key: 'frost_storm_totems', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Thunderhead Totems',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Elemental Totem', 'Windfury Totem'],
            sumSwap: 'totem_thunder', extraN: 1, extraMax: 1, summonDmgPct: 16,
            label: (r) => `Summons +1 Thunderhead Totem (+${r * 16}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Elemental Totem & Windfury Totem:</b> Places <b>Thunderhead Totems</b> (+1 max totem) that call lightning bolts from the sky (+${r * 16}% damage).`,
        },
        {
          key: 'sanctuary_circle', row: 2, maxRank: 5, el: 'holy', fx: 'totem',
          name: 'Sacred Grove',
          stats: { resAll: 4, armorPct: 5, manaRegenPct: 6 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 4}% All Resistances, +${r * 5}% Armor, +${r * 6}% Mana Regen, and +${r * 4}% Totemic Mastery Skill Damage.`,
        },
        {
          key: 'recall_detonation', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'nova',
          name: 'Overloaded Recall',
          stats: { areaPct: 6 },
          morph: {
            skills: ['Totemic Recall', 'Totem Transmute', 'Earthbind Totem'],
            pull: true, stun: true, areaPct: 16, dmgPct: 10,
            label: (r) => `Pulls enemies in, Stuns & +${r * 16}% Blast Radius`,
          },
          desc: (r) => `<b>Morph — Totemic Recall, Totem Transmute & Earthbind Totem:</b> Draws enemies toward your totems, stuns them, and expands AoE by +${r * 16}% (+${r * 10}% damage).`,
        },
        {
          key: 'lifespring_totems', row: 3, choice: 'B', maxRank: 3, el: 'holy', fx: 'totem',
          name: 'Tidecaller Spires',
          stats: { lifeRegen: 5, summonPct: 6 },
          morph: {
            skills: ['Healing Stream Totem', 'Stoneclaw Totem', 'Spirit Link Totem'],
            summonHpPct: 35, healPct: 4, durPct: 25,
            label: (r) => `+${r * 35}% Totem HP, heals ${r * 4}% Life on plant`,
          },
          desc: (r) => `<b>Morph — Healing Stream, Stoneclaw & Spirit Link Totem:</b> Grants totems +${r * 35}% Life, +${r * 25}% duration, and heals you for ${r * 4}% Max Life when planted.`,
        },
        {
          key: 'pantheon_architect', row: 4, choice: 'A', maxRank: 1, el: 'arcane', fx: 'totem',
          name: 'Forest of Pillars',
          stats: { summonPct: 42, cdr: 14, areaPct: 18 },
          morph: {
            tree: 0, kind: 'summon', extraN: 1, extraMax: 2,
            label: () => 'Plants +1 Totem per cast & +2 Max Totem Cap',
          },
          desc: () => `<b>Keystone:</b> +42% Totem & Spirit Power, +14% Cooldown Reduction, and +18% Area Size. All Totem skills plant +1 additional totem per cast and gain +2 max cap.`,
        },
        {
          key: 'ancestral_rebirth_key', row: 4, choice: 'B', maxRank: 1, el: 'holy', fx: 'spirit',
          name: 'Reincarnation',
          stats: { lifePct: 20, resAll: 15, reduce: 6 },
          cheatDeath: { name: 'REINCARNATION!', el: 'holy', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +20% Max Life, +15% All Resistances, and +6% Damage Reduction. Fatal damage triggers <b>Ancestral Reincarnation</b>, restoring 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Spiritwalker',
      el: 'holy',
      nodes: [
        {
          key: 'ancestral_sight', row: 0, maxRank: 5, el: 'holy', fx: 'spirit',
          name: 'Ancestral Wisdom',
          stats: { holyPct: 5, int: 3, castSpeed: 3 },
          desc: (r) => `+${r * 5}% Holy/Spirit Damage, +${r * 3} Intelligence, and +${r * 3}% Cast Speed.`,
        },
        {
          key: 'ghost_pack', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'claw',
          name: 'Alpha Spirit Pack',
          stats: { summonPct: 6 },
          morph: {
            skills: ['Spirit Wolf', 'Spirit Bear'],
            extraN: 1, extraMax: 1, summonHpPct: 25, summonDmgPct: 18,
            label: (r) => `+1 Spirit Beast, +${r * 25}% HP & +${r * 18}% Dmg`,
          },
          desc: (r) => `<b>Morph — Spirit Wolf & Spirit Bear:</b> Summons <b>+1 additional spirit beast</b> with +${r * 25}% Life and +${r * 18}% Damage.`,
        },
        {
          key: 'soul_chains', row: 1, choice: 'B', maxRank: 3, el: 'holy', fx: 'spirit',
          name: 'Tethered Souls',
          stats: { holyPct: 5 },
          morph: {
            skills: ['Ancestral Bolt', 'Wisp Bolt', 'Spirit Chain'],
            extraBounce: 2, home: true, leech: true, dmgPct: 7,
            label: (r) => `Homing Spirits, +${r * 2} Chains & Life Leech`,
          },
          desc: (r) => `<b>Morph — Ancestral Bolt, Wisp Bolt & Spirit Chain:</b> Spirits seek foes, bounce <b>+${r * 2}</b> additional times, and leech Life (+${r * 7}% damage).`,
        },
        {
          key: 'ethereal_drum', row: 2, maxRank: 5, el: 'holy', fx: 'spirit',
          name: 'Rhythm of the Ancients',
          stats: { critChance: 2, critDmg: 8, moveSpeed: 3 },
          skillMult: { tree: [1, 3], pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 8}% Crit Damage, +${r * 3}% Move Speed, and +${r * 4}% Spiritcaller & Ancestral Skill Damage.`,
        },
        {
          key: 'voodoo_hex', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Crippling Jinx',
          stats: { bossDmg: 6 },
          morph: {
            skills: ['Hex', 'Soul Drum', 'Ghostly Gale'],
            curse: 'amp', novaOnCast: 'holy', durPct: 20,
            label: (r) => `Applies Amplify Damage & triggers Spirit Nova`,
          },
          desc: (r) => `<b>Morph — Hex, Soul Drum & Ghostly Gale:</b> Brands enemies with Amplify Damage, blasts nearby foes with Spirit light, and lasts +${r * 20}% longer.`,
        },
        {
          key: 'astral_palm', row: 3, choice: 'B', maxRank: 3, el: 'arcane', fx: 'smash',
          name: 'Astral Projection',
          stats: { arcanePct: 6 },
          morph: {
            skills: ['Ghostpalm Strike', 'Ancestral Step', 'Ancestral Wrath'],
            waveProj: { fx: 'spirit', el: 'holy', nPerRank: 1, dmgMul: 0.45 },
            cdPct: 10, dmgPct: 8,
            label: (r) => `Launches ${r} Spirit Wave(s) & -${r * 10}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Ghostpalm Strike, Ancestral Step & Ancestral Wrath:</b> Launches ${r} piercing Spirit projection${r > 1 ? 's' : ''} and cuts cooldown by ${r * 10}% (+${r * 8}% damage).`,
        },
        {
          key: 'elder_council_key', row: 4, choice: 'A', maxRank: 1, el: 'holy', fx: 'spirit',
          name: 'Chieftain of the Spirit Realm',
          stats: { holyPct: 30, summonPct: 35, cdr: 12 },
          morph: {
            skills: ['Ancestral Guardian', 'Council of Elders'],
            extraN: 1, durPct: 35, summonDmgPct: 25,
            label: () => '+1 Ancestral Elder, +35% Duration & +25% Damage',
          },
          desc: () => `<b>Keystone:</b> +30% Holy Damage, +35% Summon Power, and +12% Cooldown Reduction. Ancestral Guardian and Council of Elders summon +1 Elder for +35% longer (+25% damage).`,
        },
        {
          key: 'spiritwalker_ascendant', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'spirit',
          name: 'Astral Walker',
          stats: { castSpeed: 18, moveSpeed: 14, echoChance: 10, dmgPct: 15 },
          desc: () => `<b>Keystone:</b> Walk between worlds: +18% Cast Speed, +14% Move Speed, +10% Spell Echo Chance, and +15% All Damage.`,
        },
      ],
    },
    {
      name: 'Primal Fury',
      el: 'light',
      nodes: [
        {
          key: 'storm_attunement', row: 0, maxRank: 5, el: 'light', fx: 'lightning',
          name: 'Fury of Sky & Earth',
          stats: { lightPct: 5, firePct: 5, critChance: 1.5 },
          desc: (r) => `+${r * 5}% Lightning & Fire Damage and +${(r * 1.5).toFixed(1)}% Critical Chance.`,
        },
        {
          key: 'overload_chain', row: 1, choice: 'A', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Lightning Overload',
          stats: { lightPct: 5 },
          morph: {
            skills: ['Elemental Shock', 'Lightning Bolt', 'Chain Lightning'],
            extraBounce: 2, stun: true, dmgPct: 7,
            label: (r) => `+${r * 2} Chain Jumps, Stun chance & +${r * 7}% Dmg`,
          },
          desc: (r) => `<b>Morph — Elemental Shock, Lightning Bolt & Chain Lightning:</b> Jumps to <b>+${r * 2}</b> extra targets, stuns foes, and deals +${r * 7}% damage.`,
        },
        {
          key: 'glacial_shock', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Permafrost Surge',
          stats: { coldPct: 6 },
          morph: {
            skills: ['Elemental Shock', 'Lava Burst', 'Earthquake'],
            el: 'cold', freeze: true, slow: true, dmgPct: 8,
            label: (r) => `Frost conversion, Freezes packs (+${r * 8}% Damage)`,
          },
          desc: (r) => `<b>Morph — Elemental Shock, Lava Burst & Earthquake:</b> Converts to <b>Glacial Cold</b>, chilling and freezing enemies while dealing +${r * 8}% damage.`,
        },
        {
          key: 'elemental_harmony', row: 2, maxRank: 5, el: 'fire', fx: 'fireball',
          name: 'Elemental Devastation',
          stats: { critDmg: 9, castSpeed: 3, areaPct: 3 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 9}% Crit Damage, +${r * 3}% Cast Speed, +${r * 3}% Area Size, and +${r * 4}% Primal Fury Skill Damage.`,
        },
        {
          key: 'molten_eruption', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Magma Chamber',
          stats: { firePct: 6 },
          morph: {
            skills: ['Lava Burst', 'Primal Stomp', 'Earthquake'],
            trail: 'fire', burn: true, extraNPerRank: 1, dmgPct: 8,
            label: (r) => `+${r} Lava Burst/Pulse & leaves molten ground`,
          },
          desc: (r) => `<b>Morph — Lava Burst, Primal Stomp & Earthquake:</b> Launches +${r} extra burst, leaves burning magma pools, and deals +${r * 8}% damage.`,
        },
        {
          key: 'maelstrom_wall', row: 3, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Cyclonic Convergence',
          stats: { lightPct: 5, cdr: 3 },
          morph: {
            skills: ['Thunderstorm', 'Earthen Wall', 'Avatar of Storms'],
            pull: true, durPct: 20, dmgPct: 8,
            label: (r) => `Draws foes inward & +${r * 20}% Storm Duration`,
          },
          desc: (r) => `<b>Morph — Thunderstorm, Earthen Wall & Avatar of Storms:</b> Pulls enemies into the storm and increases duration by +${r * 20}% (+${r * 8}% damage).`,
        },
        {
          key: 'stormbringer_key', row: 4, choice: 'A', maxRank: 1, el: 'light', fx: 'lightning',
          name: 'Voice of the Maelstrom',
          stats: { lightPct: 28, firePct: 28, echoChance: 12 },
          desc: () => `<b>Keystone:</b> +28% Lightning & Fire Damage and +12% Spell Echo Chance, causing Primal spells to frequently cast twice.`,
        },
        {
          key: 'cataclysm_shaman_key', row: 4, choice: 'B', maxRank: 1, el: 'fire', fx: 'earth',
          name: 'Worldshatter',
          stats: { critChance: 10, critDmg: 45, bossDmg: 25 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +10% Crit Chance, +45% Crit Damage, and +25% Boss Damage. Burning enemies explode in molten shrapnel for 20% Max Life.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 8. DEATH KNIGHT — Rimeblade / Unholy Plague / Blood & Runeblade
  // =========================================================================
  death_knight: [
    {
      name: 'Frozen Throne',
      el: 'cold',
      nodes: [
        {
          key: 'icy_talons', row: 0, maxRank: 5, el: 'cold', fx: 'frost',
          name: 'Icy Talons',
          stats: { coldPct: 5, atkSpeed: 3.5, str: 3 },
          desc: (r) => `+${r * 5}% Cold Damage, +${(r * 3.5).toFixed(1)}% Attack Speed, and +${r * 3} Strength.`,
        },
        {
          key: 'killing_machine', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'blade',
          name: 'Killing Machine',
          stats: { critDmg: 10 },
          morph: {
            skills: ['Frost Strike', 'Obliterate', 'Spectral Scythe'],
            el: 'cold', freeze: true, waveProj: { fx: 'shard', el: 'cold', nPerRank: 1, dmgMul: 0.4 }, dmgPct: 7,
            label: (r) => `Launches ${r} Glacial Wave(s) & Freezes (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Frost Strike, Obliterate & Spectral Scythe:</b> Converts to <b>Cold</b>, freezes targets, and launches ${r} piercing glacial wave${r > 1 ? 's' : ''} (+${r * 7}% damage).`,
        },
        {
          key: 'rime_howl', row: 1, choice: 'B', maxRank: 3, el: 'cold', fx: 'blizzard',
          name: 'Gathering Whiteout',
          stats: { coldPct: 5 },
          morph: {
            skills: ['Howling Blast', 'Remorseless Winter', 'Glacial Advance'],
            pull: true, areaPct: 14, durPct: 18, dmgPct: 7,
            label: (r) => `Pulls foes into frost, +${r * 14}% AoE & +${r * 18}% Dur`,
          },
          desc: (r) => `<b>Morph — Howling Blast, Remorseless Winter & Glacial Advance:</b> Draws enemies inward, expands area by +${r * 14}%, and extends winter duration by +${r * 18}%.`,
        },
        {
          key: 'permafrost_plate', row: 2, maxRank: 5, el: 'cold', fx: 'shield',
          name: 'Runic Permafrost',
          stats: { armorPct: 6, resCold: 8, critChance: 2 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 6}% Armor, +${r * 8}% Cold Resist, +${r * 2}% Crit Chance, and +${r * 4}% Frost Skill Damage.`,
        },
        {
          key: 'frostwyrm_call', row: 3, choice: 'A', maxRank: 3, el: 'cold', fx: 'dragon',
          name: 'Scourge Frostwyrm',
          stats: { coldPct: 6, cdr: 3 },
          morph: {
            skills: ["Sindragosa's Fury", 'Summon Gargoyle'],
            sumSwap: 'frostwyrm', freeze: true, cdPct: 10, dmgPct: 9,
            label: (r) => `Summons Frost Wyrm / -${r * 10}% Cooldown (+${r * 9}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Sindragosa's Fury & Summon Gargoyle:</b> Replaces Gargoyle with an icy <b>Frost Wyrm</b>, cuts cooldowns by ${r * 10}%, and adds +${r * 9}% damage.`,
        },
        {
          key: 'shattering_chains', row: 3, choice: 'B', maxRank: 3, el: 'cold', fx: 'frost',
          name: 'Inexorable Grip',
          stats: { bossDmg: 6 },
          morph: {
            skills: ['Chains of Ice', 'Icebound Fortitude', 'Horn of Winter'],
            novaOnCast: 'cold', curse: 'amp', durPct: 20,
            label: (r) => `Blasts Frost Nova, Amplifies Damage & +${r * 20}% Dur`,
          },
          desc: (r) => `<b>Morph — Chains of Ice, Icebound Fortitude & Horn of Winter:</b> Triggers a brittle Frost Nova on cast that causes foes to take increased damage (+${r * 20}% duration).`,
        },
        {
          key: 'lichborne_king', row: 4, choice: 'A', maxRank: 1, el: 'cold', fx: 'frost',
          name: 'Wrath of the Lich Lord',
          stats: { coldPct: 32, critDmg: 45, reduce: 8 },
          onKill: { status: 'chill', el: 'cold', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +32% Cold Damage, +45% Crit Damage, and +8% Damage Reduction. Chilled or Frozen enemies shatter on death for 20% Max Life.`,
        },
        {
          key: 'apocalypse_runeblade_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'blade',
          name: 'Master of Runeblades',
          stats: { dmgPct: 20, atkSpeed: 15, extraProj: 1 },
          morph: {
            tree: 3, extraN: 1, pierce: true, dmgPct: 16,
            label: () => '+1 Runeblade Projectile/Orbit & +16% Runeblade Damage',
          },
          desc: () => `<b>Keystone:</b> +20% All Damage, +15% Attack Speed, and +1 Projectile. All Runeblade tree skills conjure +1 additional blade and deal +16% damage.`,
        },
      ],
    },
    {
      name: 'Unholy Scourge',
      el: 'poison',
      nodes: [
        {
          key: 'virulent_plague', row: 0, maxRank: 5, el: 'poison', fx: 'skull',
          name: 'Ebon Plaguebringer',
          stats: { poisonPct: 5, shadowPct: 5, summonPct: 6 },
          desc: (r) => `+${r * 5}% Poison & Shadow Damage and +${r * 6}% Undead Minion Power.`,
        },
        {
          key: 'abomination_stitch', row: 1, choice: 'A', maxRank: 3, el: 'poison', fx: 'claw',
          name: 'Stitched Abomination',
          stats: { summonPct: 7 },
          morph: {
            skills: ['Raise Ghoul'],
            sumSwap: 'abomination', summonHpPct: 30, summonDmgPct: 22,
            label: (r) => `Raises a hulking Abomination (+${r * 30}% HP, +${r * 22}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Raise Ghoul:</b> Replaces your ghoul pack with a massive cleaving <b>Abomination</b> (+${r * 30}% Life, +${r * 22}% Damage).`,
        },
        {
          key: 'crypt_ghoul_swarm', row: 1, choice: 'B', maxRank: 3, el: 'poison', fx: 'skull',
          name: 'Risen Scourge Pack',
          stats: { summonPct: 6, moveSpeed: 3 },
          morph: {
            skills: ['Raise Ghoul', 'Army of the Dead'],
            extraNPerRank: 1, extraMaxPerRank: 1, poison: true,
            label: (r) => `Raises +${r} extra Ghoul(s) w/ venomous claws`,
          },
          desc: (r) => `<b>Morph — Raise Ghoul & Army of the Dead:</b> Raises <b>+${r}</b> additional ghoul${r > 1 ? 's' : ''} (+${r} max cap) with poisoned claws.`,
        },
        {
          key: 'unholy_blight', row: 2, maxRank: 5, el: 'shadow', fx: 'void',
          name: 'Crypt Fever',
          stats: { cdr: 3, areaPct: 4, resPoison: 6 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 3}% Cooldown Reduction, +${r * 4}% Area Size, +${r * 6}% Poison Resist, and +${r * 4}% Unholy Skill Damage.`,
        },
        {
          key: 'death_coil_volley', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'skull',
          name: 'Doombolt Barrage',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Death Coil', 'Rune Blade Throw', 'Soul Reaper'],
            extraNPerRank: 1, leech: true, home: true, dmgPct: 8,
            label: (r) => `+${r} Homing Skull/Blade & Leeches Life (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Death Coil, Rune Blade Throw & Soul Reaper:</b> Fires +${r} homing projectile, leeches Life, and deals +${r * 8}% damage.`,
        },
        {
          key: 'defile_vortex', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Desecrated Ground',
          stats: { areaPct: 6 },
          morph: {
            skills: ['Plague Strike', 'Pestilence', 'Defile', 'Anti-Magic Shell'],
            pull: true, slow: true, trail: 'poison', dmgPct: 8,
            label: (r) => `Spreads Plague Ground, Slows & Pulls foes in`,
          },
          desc: (r) => `<b>Morph — Plague Strike, Pestilence, Defile & Anti-Magic Shell:</b> Corrupts the ground with toxic blight, slowing and pulling enemies inward (+${r * 8}% damage).`,
        },
        {
          key: 'horseman_apocalypse', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'skull',
          name: 'Fourth Horseman',
          stats: { summonPct: 40, shadowPct: 25, poisonPct: 25 },
          onKill: { status: 'poison', el: 'poison', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +40% Undead Minion Power and +25% Shadow & Poison Damage. Diseased enemies burst on death for 20% Max Life.`,
        },
        {
          key: 'null_ward_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'shield',
          name: 'Spellbreaker Runes',
          stats: { resAll: 20, reduce: 8, castSpeed: 15, dmgPct: 14 },
          desc: () => `<b>Keystone:</b> Carves anti-magic runes into your armor: +20% All Resistances, +8% Damage Reduction, +15% Cast Speed, and +14% All Damage.`,
        },
      ],
    },
    {
      name: 'Sanguine Knights',
      el: 'blood',
      nodes: [
        {
          key: 'crimson_thirst', row: 0, maxRank: 5, el: 'blood', fx: 'blood',
          name: 'Veteran of the Third War',
          stats: { lifePct: 4, bloodPct: 5, lifeSteal: 1 },
          desc: (r) => `+${r * 4}% Max Life, +${r * 5}% Blood Damage, and +${r}% Life Steal.`,
        },
        {
          key: 'heartbreaker_strike', row: 1, choice: 'A', maxRank: 3, el: 'blood', fx: 'slash',
          name: 'Heartstrike Cleave',
          stats: { bloodPct: 5 },
          morph: {
            skills: ['Blood Strike', 'Death Strike', 'Rune Strike'],
            leech: true, healPct: 2, areaPct: 14, dmgPct: 8,
            label: (r) => `Heals ${r * 2}% Life on cast, Leeches & +${r * 8}% Dmg`,
          },
          desc: (r) => `<b>Morph — Blood Strike, Death Strike & Rune Strike:</b> Restores ${r * 2}% Max Life on cast, leeches heavily, and deals +${r * 8}% damage.`,
        },
        {
          key: 'gore_tendrils', row: 1, choice: 'B', maxRank: 3, el: 'blood', fx: 'void',
          name: 'Sanguine Grasp',
          stats: { areaPct: 5, cdr: 3 },
          morph: {
            skills: ['Death Grip', "Gorefiend's Grasp", 'Blood Boil'],
            pull: true, bleed: true, cdPct: 10, dmgPct: 8,
            label: (r) => `Mass Pull, inflicts Bleed & -${r * 10}% Cooldown`,
          },
          desc: (r) => `<b>Morph — Death Grip, Gorefiend's Grasp & Blood Boil:</b> Yanks packs together, inflicts Bleeding, and reduces cooldown by ${r * 10}% (+${r * 8}% damage).`,
        },
        {
          key: 'ossuary_plate', row: 2, maxRank: 5, el: 'blood', fx: 'bone',
          name: 'Ossuary Bulwark',
          stats: { armorPct: 6, reduce: 1.5, thorns: 20 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 6}% Armor, +${(r * 1.5).toFixed(1)}% Damage Reduction, +${r * 20} Thorns, and +${r * 4}% Blood Skill Damage.`,
        },
        {
          key: 'twin_dancing_blades', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'blade',
          name: 'Crimson Blade Dance',
          stats: { summonPct: 8 },
          morph: {
            skills: ['Dancing Rune Weapon', 'Dark Runeweapon'],
            extraN: 1, durPct: 25, summonDmgPct: 20,
            label: (r) => `Summons +1 Flying Runeblade (+${r * 25}% Dur, +${r * 20}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Dancing Rune Weapon & Dark Runeweapon:</b> Conjures <b>+1 additional flying runeblade</b> that fights for +${r * 25}% longer and deals +${r * 20}% damage.`,
        },
        {
          key: 'vampiric_aegis', row: 3, choice: 'B', maxRank: 3, el: 'blood', fx: 'shield',
          name: 'Blood Tap Barrier',
          stats: { lifePct: 5 },
          morph: {
            skills: ['Bone Shield', 'Vampiric Blood', 'Runic Shield', 'Rune Tap'],
            healPct: 5, durPct: 22, novaOnCast: 'blood',
            label: (r) => `Heals ${r * 5}% Life, +${r * 22}% Duration & Blood Nova`,
          },
          desc: (r) => `<b>Morph — Bone Shield, Vampiric Blood, Runic Shield & Rune Tap:</b> Unleashes a Blood Nova, heals ${r * 5}% Max Life, and extends shield duration by +${r * 22}%.`,
        },
        {
          key: 'purgatory_key', row: 4, choice: 'A', maxRank: 1, el: 'blood', fx: 'skull',
          name: 'Shroud of Purgatory',
          stats: { lifePct: 20, bloodPct: 25, lifeSteal: 5 },
          cheatDeath: { name: 'PURGATORY!', el: 'blood', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +20% Max Life, +25% Blood Damage, and +5% Life Steal. Fatal blows trigger <b>Purgatory</b>, siphoning nearby life to restore 45% Max HP (120s cooldown).`,
        },
        {
          key: 'red_thirst_key', row: 4, choice: 'B', maxRank: 1, el: 'blood', fx: 'blade',
          name: 'Sovereign of Blood',
          stats: { bloodPct: 35, critDmg: 40, bossDmg: 25 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +35% Blood Damage, +40% Crit Damage, and +25% Boss Damage. Bleeding enemies detonate in a crimson nova on death for 20% Max Life.`,
        },
      ],
    },
  ],

  // =========================================================================
  // 9. ARCANE SORCERER (ASTRONOMER) — Astral Conduit / Celestial Bodies / Gravity
  // =========================================================================
  arcane_sorcerer: [
    {
      name: 'Astral Conduit',
      el: 'arcane',
      nodes: [
        {
          key: 'starlight_mind', row: 0, maxRank: 5, el: 'arcane', fx: 'star',
          name: 'Astral Resonance',
          stats: { arcanePct: 6, castSpeed: 3, manaRegenPct: 5 },
          desc: (r) => `+${r * 6}% Arcane Damage, +${r * 3}% Cast Speed, and +${r * 5}% Mana Regeneration.`,
        },
        {
          key: 'binary_missiles', row: 1, choice: 'A', maxRank: 3, el: 'arcane', fx: 'missile',
          name: 'Starlight Volley',
          stats: { arcanePct: 4 },
          morph: {
            skills: ['Star Missiles', 'Arcane Torrent', 'Twinkle', 'Shooting Star'],
            extraNPerRank: 1, home: true, dmgPct: 6,
            label: (r) => `+${r} Homing Starlight Bolt(s) (+${r * 6}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Star Missiles, Arcane Torrent, Twinkle & Shooting Star:</b> Fires <b>+${r}</b> additional homing starlight bolt${r > 1 ? 's' : ''} (+${r * 6}% damage).`,
        },
        {
          key: 'solar_beam_lens', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'beam',
          name: 'Quasar Ray',
          stats: { firePct: 5, arcanePct: 4 },
          morph: {
            skills: ['Disintegrate', 'Arcane Orb', 'Supernova'],
            burn: true, pierce: true, areaPct: 12, dmgPct: 8,
            label: (r) => `Ignites targets, Pierces & +${r * 12}% AoE (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Disintegrate, Arcane Orb & Supernova:</b> Superheats astral energy to ignite enemies, pierce packs, and expand radius by +${r * 12}% (+${r * 8}% damage).`,
        },
        {
          key: 'cosmic_echo', row: 2, maxRank: 5, el: 'arcane', fx: 'orb',
          name: 'Harmonic Alignment',
          stats: { critChance: 2, critDmg: 8, echoChance: 2 },
          skillMult: { tree: [0, 3], pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 8}% Crit Damage, +${r * 2}% Spell Echo, and +${r * 4}% Astral & Starweaver Skill Damage.`,
        },
        {
          key: 'mirror_constellation', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'star',
          name: 'Prism of Mirrors',
          stats: { cdr: 4 },
          morph: {
            skills: ['Celestial Mirror', 'Star Chart', 'Cosmic Ascension'],
            durPct: 25, cdPct: 10, healPct: 3,
            label: (r) => `+${r * 25}% Duration, -${r * 10}% CD & heals ${r * 3}% Life`,
          },
          desc: (r) => `<b>Morph — Celestial Mirror, Star Chart & Cosmic Ascension:</b> Extends duration by +${r * 25}%, cuts cooldown by ${r * 10}%, and heals ${r * 3}% Max Life on cast.`,
        },
        {
          key: 'pulsar_overload', row: 3, choice: 'B', maxRank: 3, el: 'arcane', fx: 'nova',
          name: 'Magnetar Pulse',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Pulsar', 'Big Bang', 'Constellation', 'Grand Conjunction'],
            pull: true, stun: true, dmgPct: 9,
            label: (r) => `Pulls foes inward, Stuns & +${r * 9}% Damage`,
          },
          desc: (r) => `<b>Morph — Pulsar, Big Bang, Constellation & Grand Conjunction:</b> Draws enemies toward the stellar center and stuns them (+${r * 9}% damage).`,
        },
        {
          key: 'starcaster_key', row: 4, choice: 'A', maxRank: 1, el: 'arcane', fx: 'star',
          name: 'Architect of the Cosmos',
          stats: { arcanePct: 32, echoChance: 12, castSpeed: 15 },
          desc: () => `<b>Keystone:</b> +32% Arcane Damage, +12% Spell Echo Chance, and +15% Cast Speed, weaving double constellations across the battlefield.`,
        },
        {
          key: 'ursa_guardian_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'claw',
          name: 'Celestial Menagerie',
          stats: { summonPct: 40, lifePct: 16, resAll: 12 },
          morph: {
            skills: ['Ursa Major'],
            extraN: 1, extraMax: 1, summonHpPct: 30,
            label: () => 'Summons Twin Great Bears (+30% HP)',
          },
          desc: () => `<b>Keystone:</b> +40% Companion Power, +16% Max Life, and +12% All Resistances. Ursa Major calls down <b>both Ursa Major and Ursa Minor</b> (+1 bear, +30% HP).`,
        },
      ],
    },
    {
      name: 'Solar & Lunar Cycles',
      el: 'fire',
      nodes: [
        {
          key: 'solstice', row: 0, maxRank: 5, el: 'fire', fx: 'meteor',
          name: 'Equinox Balance',
          stats: { firePct: 5, coldPct: 5, int: 3 },
          desc: (r) => `+${r * 5}% Fire & Cold Damage and +${r * 3} Intelligence.`,
        },
        {
          key: 'cryo_comets', row: 1, choice: 'A', maxRank: 3, el: 'cold', fx: 'comet',
          name: 'Halley Frostfall',
          stats: { coldPct: 5 },
          morph: {
            skills: ['Falling Star', 'Comet', 'Lunar Tide', 'Moonfall'],
            el: 'cold', freeze: true, areaPct: 12, dmgPct: 8,
            label: (r) => `Glacial Starlight, Freezes & +${r * 12}% AoE`,
          },
          desc: (r) => `<b>Morph — Falling Star, Comet, Lunar Tide & Moonfall:</b> Freezes enemies in <b>Glacial Starlight</b> across a +${r * 12}% wider radius (+${r * 8}% damage).`,
        },
        {
          key: 'helios_flare', row: 1, choice: 'B', maxRank: 3, el: 'fire', fx: 'fireball',
          name: 'Coronal Mass Ejection',
          stats: { firePct: 5 },
          morph: {
            skills: ['Solar Wind', 'Meteor Shower', 'Corona', 'Sun Slam'],
            el: 'fire', burn: true, trail: 'fire', dmgPct: 8,
            label: (r) => `Solar Fire wake, Ignites & +${r * 8}% Damage`,
          },
          desc: (r) => `<b>Morph — Solar Wind, Meteor Shower, Corona & Sun Slam:</b> Leaves a burning solar wake, ignites foes, and deals +${r * 8}% damage.`,
        },
        {
          key: 'syzygy', row: 2, maxRank: 5, el: 'arcane', fx: 'star',
          name: 'Celestial Syzygy',
          stats: { cdr: 3, areaPct: 4, bossDmg: 4 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 3}% Cooldown Reduction, +${r * 4}% Area Size, +${r * 4}% Boss Damage, and +${r * 4}% Celestial Bodies Skill Damage.`,
        },
        {
          key: 'eclipse_shroud', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Total Umbra',
          stats: { reduce: 2, shadowPct: 5 },
          morph: {
            skills: ['Eclipse', 'Zodiac Wheel', "Heaven's Map"],
            curse: 'weaken', novaOnCast: 'arcane', durPct: 22,
            label: (r) => `Weakens nearby foes, Arcane Nova & +${r * 22}% Dur`,
          },
          desc: (r) => `<b>Morph — Eclipse, Zodiac Wheel & Heaven's Map:</b> Blinds and Weakens nearby enemies on cast while extending duration by +${r * 22}%.`,
        },
        {
          key: 'meteor_barrage_ast', row: 3, choice: 'B', maxRank: 3, el: 'fire', fx: 'meteor',
          name: 'Perseid Shower',
          stats: { firePct: 5, coldPct: 5 },
          morph: {
            skills: ['Falling Star', 'Meteor Shower', 'Starlines'],
            extraNPerRank: 2, dmgPct: 7,
            label: (r) => `+${r * 2} Falling Stars/Meteors (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Falling Star, Meteor Shower & Starlines:</b> Calls down <b>+${r * 2}</b> extra meteors/stars and deals +${r * 7}% damage.`,
        },
        {
          key: 'twin_suns_key', row: 4, choice: 'A', maxRank: 1, el: 'fire', fx: 'meteor',
          name: 'Binary Sun',
          stats: { firePct: 28, coldPct: 28, critDmg: 40 },
          onKill: { status: 'burn', el: 'fire', pctMaxHp: 0.2 },
          desc: () => `<b>Keystone:</b> +28% Fire & Cold Damage and +40% Crit Damage. Enemies burning with solar fire erupt on death for 20% Max Life.`,
        },
        {
          key: 'astral_aegis_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'star',
          name: 'Starlight Reborn',
          stats: { lifePct: 16, resAll: 15, cdr: 12 },
          cheatDeath: { name: 'STARBORN!', el: 'arcane', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +16% Max Life, +15% All Resistances, and +12% Cooldown Reduction. Fatal damage reforms your body from starlight at 45% Max Life (120s cooldown).`,
        },
      ],
    },
    {
      name: 'Singularity & Void',
      el: 'shadow',
      nodes: [
        {
          key: 'heavy_mass', row: 0, maxRank: 5, el: 'arcane', fx: 'void',
          name: 'Event Horizon',
          stats: { areaPct: 5, arcanePct: 4, shadowPct: 4 },
          desc: (r) => `+${r * 5}% Area Size and +${r * 4}% Arcane & Shadow Damage.`,
        },
        {
          key: 'crushing_wells', row: 1, choice: 'A', maxRank: 3, el: 'arcane', fx: 'void',
          name: 'Tidal Shear',
          stats: { arcanePct: 5 },
          morph: {
            skills: ['Gravity Well', 'Black Hole', 'Singularity'],
            pull: true, slow: true, areaPct: 15, dmgPct: 8,
            label: (r) => `Stronger Pull, Slows & +${r * 15}% Horizon Radius`,
          },
          desc: (r) => `<b>Morph — Gravity Well, Black Hole & Singularity:</b> Intensifies gravitational pull, slows trapped foes, and widens radius by +${r * 15}% (+${r * 8}% damage).`,
        },
        {
          key: 'graviton_pierce', row: 1, choice: 'B', maxRank: 3, el: 'arcane', fx: 'beam',
          name: 'Relativistic Lance',
          stats: { projSpeed: 8, critChance: 2 },
          morph: {
            skills: ['Gravity Bolt', 'Graviton Lance', 'Neutron Star'],
            pierce: true, stun: true, extraNPerRank: 1, dmgPct: 7,
            label: (r) => `+${r} Piercing Bolt/Pulse & Stuns (+${r * 7}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Gravity Bolt, Graviton Lance & Neutron Star:</b> Adds +${r} piercing projectile, stuns struck foes, and deals +${r * 7}% damage.`,
        },
        {
          key: 'dark_matter', row: 2, maxRank: 5, el: 'shadow', fx: 'void',
          name: 'Dark Matter Density',
          stats: { armorPct: 6, reduce: 1.5, critDmg: 8 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 6}% Armor, +${(r * 1.5).toFixed(1)}% Damage Reduction, +${r * 8}% Crit Damage, and +${r * 4}% Gravity & Void Skill Damage.`,
        },
        {
          key: 'wormhole_fold', row: 3, choice: 'A', maxRank: 3, el: 'arcane', fx: 'void',
          name: 'Folded Space',
          stats: { moveSpeed: 5 },
          morph: {
            skills: ['Wormhole', 'Repulse'],
            cdPct: 14, novaOnCast: 'arcane', pull: true,
            label: (r) => `-${r * 14}% Cooldown & Gravitational Implosion on blink`,
          },
          desc: (r) => `<b>Morph — Wormhole & Repulse:</b> Cuts cooldown by ${r * 14}% and collapses space at your destination to pull and blast enemies.`,
        },
        {
          key: 'accretion_orbit', row: 3, choice: 'B', maxRank: 3, el: 'arcane', fx: 'orb',
          name: 'Debris Ring',
          stats: { arcanePct: 6 },
          morph: {
            skills: ['Accretion Disk'],
            extraNPerRank: 1, durPct: 25, dmgPct: 10,
            label: (r) => `+${r} Orbiting Asteroid(s) & +${r * 25}% Duration`,
          },
          desc: (r) => `<b>Morph — Accretion Disk:</b> Adds <b>+${r}</b> orbiting star-fragment${r > 1 ? 's' : ''}, +${r * 25}% duration, and +${r * 10}% damage.`,
        },
        {
          key: 'supermassive_key', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'void',
          name: 'Supermassive Collapse',
          stats: { arcanePct: 25, shadowPct: 25, bossDmg: 30 },
          morph: {
            tree: 2, curse: 'amp', dmgPct: 18,
            label: () => 'Crushes enemy defenses (Amplify) & +18% Void Damage',
          },
          desc: () => `<b>Keystone:</b> +25% Arcane & Shadow Damage and +30% Boss Damage. All Gravity & Void skills crush enemy defenses (Amplify Damage) and deal +18% damage.`,
        },
        {
          key: 'time_dilation_key', row: 4, choice: 'B', maxRank: 1, el: 'arcane', fx: 'void',
          name: 'Relativistic Time Dilation',
          stats: { cdr: 20, castSpeed: 15, moveSpeed: 12 },
          desc: () => `<b>Keystone:</b> Bends local spacetime: +20% Cooldown Reduction, +15% Cast Speed, and +12% Movement Speed.`,
        },
      ],
    },
  ],
};
