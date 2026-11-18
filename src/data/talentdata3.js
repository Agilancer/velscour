// Passive talent trees of the Rogue and the Ninja (same shape as talentdata1/2.js: 3 branches x 8 nodes; rows 1 and 3
// are A/B skill morphs, row 4 A/B keystones). Keys read by the game: deeper_stratagem (game/rogue.js: a sixth Combo
// Point), living_shadows and kage_bunshin (game/ninja.js: one more Mirror Shadow, shadows that hit harder).
export const TALENT_DATA_3 = {
  rogue: [
    {
      name: "Assassin's Mark",
      el: 'blood',
      nodes: [
        {
          key: 'honed_edges', row: 0, maxRank: 5, el: 'blood', fx: 'slash',
          name: 'Honed Edges',
          stats: { critChance: 2, bloodPct: 5, dex: 3 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 5}% Blood Damage, and +${r * 3} Dexterity.`,
        },
        {
          key: 'serrated_blades', row: 1, choice: 'A', maxRank: 3, el: 'blood', fx: 'claw',
          name: 'Serrated Blades',
          stats: { bloodPct: 5 },
          morph: {
            skills: ['Sinister Strike', 'Mutilate', 'Hemorrhage'],
            bleed: true, leech: true, dmgPct: 8,
            label: (r) => `Bleeds, leeches Life & +${r * 8}% Dmg`,
          },
          desc: (r) => `<b>Morph — Sinister Strike, Mutilate & Hemorrhage:</b> Your builders open bleeding wounds and leech Life (+${r * 8}% damage).`,
        },
        {
          key: 'venomous_wounds', row: 1, choice: 'B', maxRank: 3, el: 'poison', fx: 'void',
          name: 'Venomous Wounds',
          stats: { poisonPct: 6 },
          morph: {
            skills: ['Eviscerate', 'Envenom', 'Rupture'],
            poison: true, areaPct: 12, dmgPct: 7,
            label: (r) => `Poisons, +${r * 12}% AoE & +${r * 7}% Dmg`,
          },
          desc: (r) => `<b>Morph — Eviscerate, Envenom & Rupture:</b> Your finishers leave venom in the wound, reach +${r * 12}% wider and deal +${r * 7}% damage.`,
        },
        {
          key: 'relentless_strikes', row: 2, maxRank: 5, el: 'phys', fx: 'slash',
          name: 'Relentless Strikes',
          stats: { atkSpeed: 3, critDmg: 6 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 3}% Attack Speed, +${r * 6}% Crit Damage, and +${r * 4}% Assassination Skill Damage.`,
        },
        {
          key: 'cut_to_the_chase', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'slash',
          name: 'Cut to the Chase',
          stats: { critDmg: 10 },
          morph: {
            skills: ['Eviscerate', 'Kidney Shot', 'Death from Above'],
            curse: 'amp', areaPct: 12, dmgPct: 10,
            label: (r) => `Applies Amplify Damage & +${r * 10}% Dmg`,
          },
          desc: (r) => `<b>Morph — Eviscerate, Kidney Shot & Death from Above:</b> The wound is left open (Amplify Damage), with +${r * 12}% AoE and +${r * 10}% damage.`,
        },
        {
          key: 'improved_backstab', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'smoke',
          name: 'Find Weakness',
          stats: { cdr: 4 },
          morph: {
            skills: ['Backstab', 'Cheap Shot', 'Shadowstrike'],
            resetOnKill: true, cdPct: 10, dmgPct: 9,
            label: (r) => `Kills reset the cooldown (-${r * 10}% Base CD)`,
          },
          desc: (r) => `<b>Morph — Backstab, Cheap Shot & Shadowstrike:</b> Slaying an enemy <b>resets the cooldown</b>; base cooldown reduced by ${r * 10}% (+${r * 9}% damage).`,
        },
        {
          key: 'deeper_stratagem', row: 4, choice: 'A', maxRank: 1, el: 'blood', fx: 'slash',
          name: 'Deeper Stratagem',
          stats: { critChance: 8, bloodPct: 20 },
          desc: () => `<b>Keystone:</b> You hold <b>6 Combo Points</b>, and a finisher that spends six hits harder still. +8% Crit Chance and +20% Blood Damage.`,
        },
        {
          key: 'crimson_harvest', row: 4, choice: 'B', maxRank: 1, el: 'blood', fx: 'claw',
          name: 'Crimson Harvest',
          stats: { critDmg: 40, bossDmg: 25, lifeSteal: 5 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +40% Crit Damage, +25% Boss Damage, and +5% Life Steal. Bleeding foes burst when they die, for 22% of their Max Life.`,
        },
      ],
    },
    {
      name: 'Shadowcraft',
      el: 'shadow',
      nodes: [
        {
          key: 'night_stalker', row: 0, maxRank: 5, el: 'shadow', fx: 'smoke',
          name: 'Night Stalker',
          stats: { shadowPct: 5, moveSpeed: 3, resAll: 3 },
          desc: (r) => `+${r * 5}% Shadow Damage, +${r * 3}% Move Speed, and +${r * 3}% All Resistances.`,
        },
        {
          key: 'shadow_blades', row: 1, choice: 'A', maxRank: 3, el: 'shadow', fx: 'void',
          name: 'Shadow Blades',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Shadowstrike', 'Shadowstep', 'Backstab'],
            novaOnCast: 'shadow', dmgPct: 8,
            label: (r) => `Shadow nova on arrival & +${r * 8}% Dmg`,
          },
          desc: (r) => `<b>Morph — Shadowstrike, Shadowstep & Backstab:</b> She arrives in a burst of shadow (+${r * 8}% damage).`,
        },
        {
          key: 'smoke_and_mirrors', row: 1, choice: 'B', maxRank: 3, el: 'shadow', fx: 'smoke',
          name: 'Smoke and Mirrors',
          stats: { reduce: 2 },
          morph: {
            skills: ['Smoke Bomb', 'Stealth', 'Cloak of Shadows'],
            durPct: 15, healPct: 4, cdPct: 8,
            label: (r) => `+${r * 15}% Duration, heals ${r * 4}% Life`,
          },
          desc: (r) => `<b>Morph — Smoke Bomb, Stealth & Cloak of Shadows:</b> Last ${r * 15}% longer, come back ${r * 8}% sooner and restore ${r * 4}% of your Life.`,
        },
        {
          key: 'master_of_shadows', row: 2, maxRank: 5, el: 'shadow', fx: 'shield',
          name: 'Master of Shadows',
          stats: { critChance: 2, cdr: 2, armorPct: 5 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 2}% Cooldown Reduction, +${r * 5}% Armor, and +${r * 4}% Subtlety Skill Damage.`,
        },
        {
          key: 'premeditation', row: 3, choice: 'A', maxRank: 3, el: 'phys', fx: 'smash',
          name: 'Premeditation',
          stats: { critChance: 2 },
          morph: {
            skills: ['Cheap Shot', 'Shadowstrike', 'Marked for Death'],
            stun: true, areaPct: 12, dmgPct: 9,
            label: (r) => `Stuns, +${r * 12}% AoE & +${r * 9}% Dmg`,
          },
          desc: (r) => `<b>Morph — Cheap Shot, Shadowstrike & Marked for Death:</b> Stun what they strike, reach +${r * 12}% wider and deal +${r * 9}% damage.`,
        },
        {
          key: 'dark_shadow', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'spirit',
          name: 'Dark Shadow',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Secret Technique', 'Shadow Dance'],
            extraNPerRank: 1, durPct: 10, dmgPct: 8,
            label: (r) => `+${r} shadow strike(s), +${r * 10}% Duration`,
          },
          desc: (r) => `<b>Morph — Secret Technique & Shadow Dance:</b> ${r} more shadow${r > 1 ? 's' : ''} step out to strike, and the Dance lasts ${r * 10}% longer (+${r * 8}% damage).`,
        },
        {
          key: 'cheat_death', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'shield',
          name: 'Cheat Death',
          stats: { lifePct: 15, resAll: 10 },
          cheatDeath: { name: 'CHEAT DEATH!', el: 'shadow', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +15% Max Life and +10% All Resistances. A killing blow leaves you at 45% Life instead (2 min cooldown).`,
        },
        {
          key: 'shadow_dancer', row: 4, choice: 'B', maxRank: 1, el: 'shadow', fx: 'smoke',
          name: 'Shadow Dancer',
          stats: { atkSpeed: 15, critChance: 10, shadowPct: 22 },
          morph: {
            tree: 1, kind: 'dash', extraN: 1,
            label: () => 'Shadowstrike dashes a second time',
          },
          desc: () => `<b>Keystone:</b> +15% Attack Speed, +10% Crit Chance, and +22% Shadow Damage. Shadowstrike dashes a second time, to the nearest foe.`,
        },
      ],
    },
    {
      name: 'Knifework',
      el: 'phys',
      nodes: [
        {
          key: 'razor_wind', row: 0, maxRank: 5, el: 'phys', fx: 'blade',
          name: 'Razor Wind',
          stats: { physPct: 5, projSpeed: 6, dex: 3 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 6}% Projectile Speed, and +${r * 3} Dexterity.`,
        },
        {
          key: 'fan_of_blades', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'blade',
          name: 'A Knife for Everyone',
          stats: { physPct: 5 },
          morph: {
            skills: ['Throwing Knife', 'Fan of Knives', 'Poisoned Volley'],
            extraNPerRank: 1, dmgPct: 6,
            label: (r) => `+${r} dagger(s) & +${r * 6}% Dmg`,
          },
          desc: (r) => `<b>Morph — Throwing Knife, Fan of Knives & Poisoned Volley:</b> Throw ${r} more dagger${r > 1 ? 's' : ''} (+${r * 6}% damage).`,
        },
        {
          key: 'trick_shots', row: 1, choice: 'B', maxRank: 3, el: 'phys', fx: 'blade',
          name: 'Trick Shots',
          stats: { critChance: 2 },
          morph: {
            skills: ['Throwing Knife', 'Ricochet Blade', 'Between the Eyes'],
            extraBounce: 1, pierce: true, dmgPct: 7,
            label: (r) => `Pierces, +${r} bounce(s) & +${r * 7}% Dmg`,
          },
          desc: (r) => `<b>Morph — Throwing Knife, Ricochet Blade & Between the Eyes:</b> The blade goes through what it hits and bounces ${r} more time${r > 1 ? 's' : ''} (+${r * 7}% damage).`,
        },
        {
          key: 'steel_tempest', row: 2, maxRank: 5, el: 'phys', fx: 'spin',
          name: 'Steel Tempest',
          stats: { areaPct: 4, critDmg: 6 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 4}% Area of Effect, +${r * 6}% Crit Damage, and +${r * 4}% Knives Skill Damage.`,
        },
        {
          key: 'iron_rain', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'blade',
          name: 'Iron Rain',
          stats: { bloodPct: 5 },
          morph: {
            skills: ['Rain of Daggers', 'Night of Knives', 'Blade Vortex'],
            extraNPerRank: 2, areaPct: 12, dmgPct: 8,
            label: (r) => `More daggers, +${r * 12}% AoE & +${r * 8}% Dmg`,
          },
          desc: (r) => `<b>Morph — Rain of Daggers, Night of Knives & Blade Vortex:</b> Far more steel in the air, over +${r * 12}% more ground (+${r * 8}% damage).`,
        },
        {
          key: 'buried_blades', row: 3, choice: 'B', maxRank: 3, el: 'blood', fx: 'smash',
          name: 'Buried Blades',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Fangs of the Earth', "Executioner's Blade", 'Thousand Cuts'],
            slow: true, curse: 'amp', areaPct: 14, dmgPct: 9,
            label: (r) => `Slows, Amplify Damage & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Fangs of the Earth, Executioner's Blade & Thousand Cuts:</b> What they strike is slowed and laid open (Amplify Damage), over +${r * 14}% more ground (+${r * 9}% damage).`,
        },
        {
          key: 'kingsbane', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'blade',
          name: 'Kingsbane',
          stats: { extraProj: 1, critDmg: 45, physPct: 22 },
          desc: () => `<b>Keystone:</b> Every throw looses <b>one more dagger</b>. +45% Crit Damage and +22% Physical Damage.`,
        },
        {
          key: 'bladestorm', row: 4, choice: 'B', maxRank: 1, el: 'blood', fx: 'spin',
          name: 'Red Wheel',
          stats: { atkSpeed: 18, areaPct: 25, bloodPct: 20 },
          morph: {
            tree: 3, kind: ['whirl', 'orbit'], durPct: 40,
            label: () => 'Blood Dance and Blade Vortex last 40% longer',
          },
          desc: () => `<b>Keystone:</b> +18% Attack Speed, +25% Area of Effect, and +20% Blood Damage. Blood Dance and Blade Vortex last 40% longer.`,
        },
      ],
    },
  ],
  ninja: [
    {
      name: 'Kenjutsu',
      el: 'phys',
      nodes: [
        {
          key: 'keen_edge', row: 0, maxRank: 5, el: 'phys', fx: 'slash',
          name: 'Keen Edge',
          stats: { physPct: 5, critChance: 2, dex: 3 },
          desc: (r) => `+${r * 5}% Physical Damage, +${r * 2}% Crit Chance, and +${r * 3} Dexterity.`,
        },
        {
          key: 'moon_cutter', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'blade',
          name: 'Moon Cutter',
          stats: { physPct: 5 },
          morph: {
            skills: ['Crescent Cut', 'Rising Moon', 'Falling Petals'],
            waveProj: { fx: 'blade', el: 'phys', nPerRank: 1, dmgMul: 0.38 }, dmgPct: 7,
            label: (r) => `Flings ${r} blade wave(s) & +${r * 7}% Dmg`,
          },
          desc: (r) => `<b>Morph — Crescent Cut, Rising Moon & Falling Petals:</b> The cut flies on as ${r} wave${r > 1 ? 's' : ''} of steel that pass through everything (+${r * 7}% damage).`,
        },
        {
          key: 'flash_step', row: 1, choice: 'B', maxRank: 3, el: 'light', fx: 'lightning',
          name: 'Flash Step',
          stats: { moveSpeed: 3 },
          morph: {
            skills: ["Swallow's Flight", 'Crossing Blades', 'Thunder Step'],
            resetOnKill: true, cdPct: 10, dmgPct: 8,
            label: (r) => `Kills reset the cooldown (+${r * 8}% Dmg)`,
          },
          desc: (r) => `<b>Morph — Swallow's Flight, Crossing Blades & Thunder Step:</b> Slaying an enemy <b>resets the cooldown</b> (+${r * 8}% damage).`,
        },
        {
          key: 'bladesong', row: 2, maxRank: 5, el: 'phys', fx: 'slash',
          name: 'Bladesong',
          stats: { atkSpeed: 3, critDmg: 6 },
          skillMult: { tree: 0, pct: 4 },
          desc: (r) => `+${r * 3}% Attack Speed, +${r * 6}% Crit Damage, and +${r * 4}% Way of the Blade Skill Damage.`,
        },
        {
          key: 'severing_draw', row: 3, choice: 'A', maxRank: 3, el: 'blood', fx: 'slash',
          name: 'Severing Draw',
          stats: { critDmg: 10 },
          morph: {
            skills: ['Iaido', "Heaven's Drop", 'Hundred-Cut Reckoning'],
            bleed: true, curse: 'amp', dmgPct: 10,
            label: (r) => `Bleeds, Amplify Damage & +${r * 10}% Dmg`,
          },
          desc: (r) => `<b>Morph — Iaido, Heaven's Drop & Hundred-Cut Reckoning:</b> The cut does not close (Bleed + Amplify Damage), with +${r * 10}% damage.`,
        },
        {
          key: 'storm_of_petals', row: 3, choice: 'B', maxRank: 3, el: 'phys', fx: 'spin',
          name: 'Storm of Petals',
          stats: { areaPct: 5 },
          morph: {
            skills: ['Falling Petals', 'Dragon Flail', 'Rising Moon'],
            pull: true, leech: true, areaPct: 14, dmgPct: 8,
            label: (r) => `Draws foes in, leeches Life & +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Falling Petals, Dragon Flail & Rising Moon:</b> Pull enemies into the wheel, leech Life, and reach +${r * 14}% wider (+${r * 8}% damage).`,
        },
        {
          key: 'thousandfold_blade', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'slash',
          name: 'Thousand-Fold Blade',
          stats: { atkSpeed: 20, critDmg: 45, physPct: 22 },
          morph: {
            tree: 0, kind: 'melee', extraN: 1,
            label: () => '+1 Extra Cut on all Way of the Blade melee skills',
          },
          desc: () => `<b>Keystone:</b> +20% Attack Speed, +45% Crit Damage, and +22% Physical Damage. Every Way of the Blade melee skill cuts an additional time.`,
        },
        {
          key: 'certain_death', row: 4, choice: 'B', maxRank: 1, el: 'blood', fx: 'slash',
          name: 'Certain Death',
          stats: { critChance: 10, bossDmg: 30, lifeSteal: 5 },
          onKill: { status: 'bleed', el: 'blood', pctMaxHp: 0.22 },
          desc: () => `<b>Keystone:</b> +10% Crit Chance, +30% Boss Damage, and +5% Life Steal. Bleeding foes come apart when they die, for 22% of their Max Life.`,
        },
      ],
    },
    {
      name: 'Shadow Arts',
      el: 'shadow',
      nodes: [
        {
          key: 'shadow_walker', row: 0, maxRank: 5, el: 'shadow', fx: 'smoke',
          name: 'Shadow Walker',
          stats: { shadowPct: 5, moveSpeed: 3, resAll: 3 },
          desc: (r) => `+${r * 5}% Shadow Damage, +${r * 3}% Move Speed, and +${r * 3}% All Resistances.`,
        },
        {
          key: 'living_shadows', row: 1, choice: 'A', maxRank: 3, el: 'shadow', fx: 'spirit',
          name: 'Living Shadows',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Mirror Shadows', 'Eclipse Veil', 'Ninpo Trance'],
            durPct: 15, cdPct: 8,
            label: (r) => `+1 shadow, +${r * 15}% Duration`,
          },
          desc: (r) => `<b>Morph — Mirror Shadows, Eclipse Veil & Ninpo Trance:</b> <b>One more shadow</b> follows you, and they last ${r * 15}% longer and come back ${r * 8}% sooner.`,
        },
        {
          key: 'iron_hook', row: 1, choice: 'B', maxRank: 3, el: 'phys', fx: 'chain',
          name: 'Iron Hook',
          stats: { cdr: 3 },
          morph: {
            skills: ['Grappling Hook', 'Hook Swing', 'Shadow Bind'],
            curse: 'amp', cdPct: 10, dmgPct: 9,
            label: (r) => `Applies Amplify Damage (-${r * 10}% Base CD)`,
          },
          desc: (r) => `<b>Morph — Grappling Hook, Hook Swing & Shadow Bind:</b> What the hook bites takes Amplified Damage; cooldown reduced by ${r * 10}% (+${r * 9}% damage).`,
        },
        {
          key: 'night_veil', row: 2, maxRank: 5, el: 'shadow', fx: 'shield',
          name: 'Night Veil',
          stats: { critChance: 2, armorPct: 5, cdr: 2 },
          skillMult: { tree: 1, pct: 4 },
          desc: (r) => `+${r * 2}% Crit Chance, +${r * 5}% Armor, +${r * 2}% Cooldown Reduction, and +${r * 4}% Shadow Arts Skill Damage.`,
        },
        {
          key: 'umbral_host', row: 3, choice: 'A', maxRank: 3, el: 'shadow', fx: 'spirit',
          name: 'Umbral Host',
          stats: { shadowPct: 6 },
          morph: {
            skills: ['Umbral Legion', 'Thousand Shadows', 'Shadow Step'],
            extraNPerRank: 1, areaPct: 10, dmgPct: 9,
            label: (r) => `+${r} shadow(s), +${r * 10}% AoE & +${r * 9}% Dmg`,
          },
          desc: (r) => `<b>Morph — Umbral Legion, Thousand Shadows & Shadow Step:</b> ${r} more shadow${r > 1 ? 's' : ''} run them through, over +${r * 10}% more ground (+${r * 9}% damage).`,
        },
        {
          key: 'smoke_and_knives', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'smoke',
          name: 'Smoke and Knives',
          stats: { reduce: 2 },
          morph: {
            skills: ['Smoke Bomb', 'Shadow Bind', 'Shadow Step'],
            novaOnCast: 'shadow', durPct: 15, dmgPct: 8,
            label: (r) => `Shadow burst, +${r * 15}% Duration`,
          },
          desc: (r) => `<b>Morph — Smoke Bomb, Shadow Bind & Shadow Step:</b> Burst in shadow as they land and last ${r * 15}% longer (+${r * 8}% damage).`,
        },
        {
          key: 'substitution', row: 4, choice: 'A', maxRank: 1, el: 'shadow', fx: 'shield',
          name: 'Substitution',
          stats: { lifePct: 15, resAll: 10 },
          cheatDeath: { name: 'SUBSTITUTION!', el: 'shadow', healPct: 0.45, cd: 120 },
          desc: () => `<b>Keystone:</b> +15% Max Life and +10% All Resistances. A killing blow strikes a log of wood: you stand at 45% Life instead (2 min cooldown).`,
        },
        {
          key: 'kage_bunshin', row: 4, choice: 'B', maxRank: 1, el: 'shadow', fx: 'spirit',
          name: 'Shadows of Substance',
          stats: { shadowPct: 22, critChance: 8, atkSpeed: 12 },
          desc: () => `<b>Keystone:</b> Your Mirror Shadows repeat your strikes for <b>32%</b> of their damage, not 20%. +22% Shadow Damage, +8% Crit Chance, and +12% Attack Speed.`,
        },
      ],
    },
    {
      name: 'Hidden Arsenal',
      el: 'fire',
      nodes: [
        {
          key: 'steady_hand', row: 0, maxRank: 5, el: 'phys', fx: 'blade',
          name: 'Steady Hand',
          stats: { physPct: 4, firePct: 4, projSpeed: 6 },
          desc: (r) => `+${r * 4}% Physical Damage, +${r * 4}% Fire Damage, and +${r * 6}% Projectile Speed.`,
        },
        {
          key: 'storm_of_stars', row: 1, choice: 'A', maxRank: 3, el: 'phys', fx: 'blade',
          name: 'Storm of Stars',
          stats: { physPct: 5 },
          morph: {
            skills: ['Shuriken', 'Windmill Shuriken', 'Storm of Steel'],
            extraNPerRank: 1, dmgPct: 6,
            label: (r) => `+${r} shuriken & +${r * 6}% Dmg`,
          },
          desc: (r) => `<b>Morph — Shuriken, Windmill Shuriken & Storm of Steel:</b> Throw ${r} more (three times that from the Storm), with +${r * 6}% damage.`,
        },
        {
          key: 'barbed_caltrops', row: 1, choice: 'B', maxRank: 3, el: 'poison', fx: 'spike',
          name: 'Barbed Caltrops',
          stats: { poisonPct: 6 },
          morph: {
            skills: ['Caltrops', 'Backflip Scatter', 'Blast Tags'],
            poison: true, areaPct: 15, durPct: 15, dmgPct: 8,
            label: (r) => `Poisons, +${r * 15}% AoE & Duration`,
          },
          desc: (r) => `<b>Morph — Caltrops, Backflip Scatter & Blast Tags:</b> The points are poisoned, cover +${r * 15}% more ground and lie ${r * 15}% longer (+${r * 8}% damage).`,
        },
        {
          key: 'ninpo_mastery', row: 2, maxRank: 5, el: 'fire', fx: 'fire',
          name: 'Ninpo Mastery',
          stats: { areaPct: 4, lightPct: 4, critDmg: 5 },
          skillMult: { tree: 2, pct: 4 },
          desc: (r) => `+${r * 4}% Area of Effect, +${r * 4}% Lightning Damage, +${r * 5}% Crit Damage, and +${r * 4}% Tools of War Skill Damage.`,
        },
        {
          key: 'inferno_scroll', row: 3, choice: 'A', maxRank: 3, el: 'fire', fx: 'fire',
          name: 'Inferno Scroll',
          stats: { firePct: 6 },
          morph: {
            skills: ['Kunai Burst', 'Art of the Inferno', 'Art of the Fire Wheels', 'True Dragon Technique'],
            burn: true, trail: 'fire', areaPct: 14, dmgPct: 10,
            label: (r) => `Leaves burning ground, +${r * 14}% AoE`,
          },
          desc: (r) => `<b>Morph — Kunai Burst, Art of the Inferno, Fire Wheels & True Dragon Technique:</b> Leave the ground burning, over +${r * 14}% more of it (+${r * 10}% damage).`,
        },
        {
          key: 'demon_wind', row: 3, choice: 'B', maxRank: 3, el: 'shadow', fx: 'wind',
          name: 'Demon Wind',
          stats: { critChance: 2 },
          morph: {
            skills: ['Demon Wind Shuriken', 'Windmill Shuriken', 'Poison Darts'],
            pierce: true, home: true, durPct: 12, dmgPct: 9,
            label: (r) => `Seeks foes, pierces & +${r * 9}% Dmg`,
          },
          desc: (r) => `<b>Morph — Demon Wind Shuriken, Windmill Shuriken & Poison Darts:</b> They seek their marks and pass through them (+${r * 9}% damage).`,
        },
        {
          key: 'master_of_arms', row: 4, choice: 'A', maxRank: 1, el: 'phys', fx: 'blade',
          name: 'Master of Arms',
          stats: { extraProj: 1, critDmg: 40, physPct: 20 },
          desc: () => `<b>Keystone:</b> Every throw looses <b>one more</b> shuriken or kunai. +40% Crit Damage and +20% Physical Damage.`,
        },
        {
          key: 'dragon_heart', row: 4, choice: 'B', maxRank: 1, el: 'fire', fx: 'fire',
          name: 'Dragon Heart',
          stats: { firePct: 25, lightPct: 25, areaPct: 20, cdr: 8 },
          morph: {
            tree: 3, kind: ['proj', 'strike', 'leap'], novaOnCast: 'fire',
            label: () => 'Dragon Ninpo spells burst in a ring of fire',
          },
          desc: () => `<b>Keystone:</b> +25% Fire Damage, +25% Lightning Damage, +20% Area of Effect, and +8% Cooldown Reduction. Your Dragon Ninpo spells burst in a ring of fire around you.`,
        },
      ],
    },
  ],
};
