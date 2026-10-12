// Monster art catalogue: every monster cut from the sheets in assets/source/enemies/<set>/ (see docs/ENEMY_ART.md).
// Each entry is one cell of a sheet (i = reading order, left to right then top to bottom) and says which AI
// archetype it plays (ARCH in enemies.js). `also` lists other archetypes it can stand in for, `h` is its height
// in world px (the player is 60), `el` is the element its art shows (it keeps its own colours and casts that
// element when the biome matches, or when the biome has none), `boss` puts it in the guardian pool.
// Optional overrides: fly, gore, undead, demon.
//
// Palette swaps: a level recolours each look with one of its biome's SWAPS (biomes.js `swaps`), the "greater"
// breed darkens it (greaterSwap), and unique monsters roll their own swap, so 70 drawings make several hundred looks.

export const SWAPS = {
  pale: { sat: 0.35, light: 0.1 },
  ash: { sat: 0.12, light: 0.02, contrast: 1.05 },
  ember: { colorize: [16, 0.62], light: -0.02, contrast: 1.08 },
  frost: { colorize: [200, 0.45], light: 0.08 },
  rime: { hue: 180, sat: 0.6, light: 0.1 },
  venom: { colorize: [95, 0.5], light: -0.02 },
  rot: { colorize: [68, 0.4], light: -0.05 },
  tide: { colorize: [172, 0.4], light: -0.02 },
  blood: { colorize: [356, 0.62], light: -0.05, contrast: 1.08 },
  flesh: { colorize: [340, 0.42], light: 0.02 },
  void: { colorize: [276, 0.48], light: -0.05, contrast: 1.08 },
  abyss: { colorize: [228, 0.5], light: -0.06, contrast: 1.1 },
  storm: { colorize: [212, 0.42], light: 0.04, contrast: 1.12 },
  gilded: { colorize: [44, 0.62], light: 0.04, contrast: 1.12 },
  sand: { colorize: [34, 0.42], light: 0.08 },
  shadow: { sat: 0.25, light: -0.16, contrast: 1.18 },
  obsidian: { sat: 0.22, light: -0.1, contrast: 1.35 },
  crystal: { colorize: [188, 0.6], light: 0.05, contrast: 1.2 },
  thorn: { colorize: [100, 0.32], light: -0.04 },
  infernal: { colorize: [6, 0.75], light: -0.08, contrast: 1.2 },
};
/** The "greater" breed's version of a swap: darker and richer. */
export function greaterSwap(swap) {
  const s = swap || {};
  return { ...s, sat: (s.sat ?? 1) * 1.25, light: (s.light || 0) - 0.06, contrast: (s.contrast ?? 1) * 1.12 };
}
/** Raised corpses (Revive and similar). */
export const REVIVED = { colorize: [130, 0.45], light: 0.04 };

const S1 = 'set1/skeletons', L1 = 'set1/liches', B1 = 'set1/bone_horrors', F1 = 'set1/flesh_brutes';
const D1 = 'set1/demons', T1 = 'set1/tentacles', E1 = 'set1/eyes';
const bone = { gore: 'bone', undead: true };

export const BESTIARY = [
  // ---- set 1: skeleton warband
  { id: 'bone_cleaver', sheet: S1, i: 0, arch: 'skeleton', name: 'Bone Cleaver', h: 54, ...bone },
  { id: 'skeleton_bowman', sheet: S1, i: 1, arch: 'archer', name: 'Skeleton Bowman', h: 56, ...bone },
  { id: 'bone_spearman', sheet: S1, i: 2, arch: 'skeleton', also: ['knight'], name: 'Bone Spearman', h: 56, ...bone },
  { id: 'sickle_reaver', sheet: S1, i: 3, arch: 'skeleton', name: 'Sickle Reaver', h: 54, ...bone },
  { id: 'bone_shieldwall', sheet: S1, i: 4, arch: 'knight', name: 'Bone Shieldwall', h: 58, ...bone },
  { id: 'skeleton_crossbowman', sheet: S1, i: 5, arch: 'archer', name: 'Skeleton Crossbowman', h: 52, ...bone },
  { id: 'chained_dead', sheet: S1, i: 6, arch: 'skeleton', also: ['zombie'], name: 'Chained Dead', h: 54, ...bone },
  { id: 'ramskull_headsman', sheet: S1, i: 7, arch: 'knight', also: ['skeleton'], name: 'Ramskull Headsman', h: 60, boss: true, ...bone },
  { id: 'gravedigger', sheet: S1, i: 8, arch: 'skeleton', also: ['ghoul'], name: 'Gravedigger', h: 50, ...bone },
  { id: 'bone_standard', sheet: S1, i: 9, arch: 'cultist', name: 'Bone Standard-Bearer', h: 62, ...bone },
  // ---- set 1: liches
  { id: 'pyre_lich', sheet: L1, i: 0, arch: 'cultist', also: ['wraith'], name: 'Pyre Lich', h: 58, el: 'fire', fly: false, ...bone },
  { id: 'rime_lich', sheet: L1, i: 1, arch: 'wraith', also: ['cultist'], name: 'Rime Lich', h: 58, el: 'cold', fly: false, ...bone },
  { id: 'plague_lich', sheet: L1, i: 2, arch: 'cultist', name: 'Plague Lich', h: 56, el: 'poison', ...bone },
  { id: 'storm_lich', sheet: L1, i: 3, arch: 'wraith', also: ['cultist'], name: 'Storm Lich', h: 58, el: 'light', fly: false, ...bone },
  { id: 'bone_priest', sheet: L1, i: 4, arch: 'cultist', name: 'Bone Priest', h: 58, el: 'holy', ...bone },
  { id: 'lich_king', sheet: L1, i: 5, arch: 'wraith', name: 'Lich King', h: 62, el: 'arcane', fly: false, boss: true, ...bone },
  { id: 'sunstaff_lich', sheet: L1, i: 6, arch: 'cultist', name: 'Sunstaff Lich', h: 60, el: 'fire', boss: true, ...bone },
  { id: 'rootbound_lich', sheet: L1, i: 7, arch: 'shroom', name: 'Rootbound Lich', h: 60, el: 'poison', ...bone },
  { id: 'lantern_lich', sheet: L1, i: 8, arch: 'wraith', name: 'Lantern Lich', h: 58, el: 'cold', fly: false, ...bone },
  { id: 'bonecaller', sheet: L1, i: 9, arch: 'cultist', also: ['wraith'], name: 'Bonecaller', h: 56, el: 'shadow', fly: false, ...bone },
  // ---- set 1: bone horrors
  { id: 'powder_keg', sheet: B1, i: 0, arch: 'beetle', name: 'Powder Keg Dead', h: 52, el: 'fire', ...bone },
  { id: 'bloated_bonesack', sheet: B1, i: 1, arch: 'beetle', also: ['zombie'], name: 'Bloated Bonesack', h: 52, el: 'poison', ...bone },
  { id: 'cinder_husk', sheet: B1, i: 2, arch: 'ghoul', also: ['skeleton'], name: 'Cinder Husk', h: 52, el: 'fire', ...bone },
  { id: 'rime_husk', sheet: B1, i: 3, arch: 'ghoul', also: ['skeleton'], name: 'Rime Husk', h: 52, el: 'cold', ...bone },
  { id: 'bone_hound', sheet: B1, i: 4, arch: 'hound', name: 'Bone Hound', h: 36, ...bone },
  { id: 'four_armed_reaver', sheet: B1, i: 5, arch: 'skeleton', also: ['knight'], name: 'Four-Armed Reaver', h: 58, boss: true, ...bone },
  { id: 'bone_colossus', sheet: B1, i: 6, arch: 'golem', name: 'Bone Colossus', h: 68, boss: true, ...bone },
  { id: 'coffin_knight', sheet: B1, i: 7, arch: 'knight', name: 'Coffin Knight', h: 60, ...bone },
  { id: 'grim_reaper', sheet: B1, i: 8, arch: 'wraith', name: 'Grim Reaper', h: 64, el: 'shadow', boss: true, ...bone },
  { id: 'bone_serpent', sheet: B1, i: 9, arch: 'worm', name: 'Bone Serpent', h: 50, ...bone },
  // ---- set 1: flesh brutes
  { id: 'chained_brute', sheet: F1, i: 0, arch: 'abomination', also: ['zombie'], name: 'Chained Brute', h: 68 },
  { id: 'ossuary_golem', sheet: F1, i: 1, arch: 'golem', name: 'Ossuary Golem', h: 74, boss: true, ...bone },
  { id: 'reliquary_bearer', sheet: F1, i: 2, arch: 'abomination', name: 'Reliquary Bearer', h: 66 },
  { id: 'many_armed_horror', sheet: F1, i: 3, arch: 'abomination', name: 'Many-Armed Horror', h: 70, boss: true },
  { id: 'corpse_hauler', sheet: F1, i: 4, arch: 'zombie', also: ['abomination'], name: 'Corpse Hauler', h: 56 },
  { id: 'ossified_bishop', sheet: F1, i: 5, arch: 'demon', name: 'Ossified Bishop', h: 76, boss: true, gore: 'bone' },
  { id: 'conjoined_horror', sheet: F1, i: 6, arch: 'abomination', also: ['zombie'], name: 'Conjoined Horror', h: 64, boss: true },
  { id: 'butcher', sheet: F1, i: 7, arch: 'abomination', also: ['demon'], name: 'Butcher', h: 68, boss: true },
  { id: 'bone_juggernaut', sheet: F1, i: 8, arch: 'golem', also: ['knight'], name: 'Bone Juggernaut', h: 74, boss: true, ...bone },
  { id: 'flesh_crawler', sheet: F1, i: 9, arch: 'spider', also: ['scorpion'], name: 'Flesh Crawler', h: 40 },
  // ---- set 1: demons and beasts
  { id: 'imp', sheet: D1, i: 0, arch: 'imp', name: 'Imp', h: 34, el: 'fire' },
  { id: 'gargoyle', sheet: D1, i: 1, arch: 'gargoyle', also: ['bat'], name: 'Gargoyle', h: 46, gore: 'rock' },
  { id: 'magma_maw', sheet: D1, i: 2, arch: 'demon', also: ['golem'], name: 'Magma Maw', h: 46, el: 'fire' },
  { id: 'frost_fiend', sheet: D1, i: 3, arch: 'imp', also: ['ghoul'], name: 'Frost Fiend', h: 48, el: 'cold' },
  { id: 'molten_behemoth', sheet: D1, i: 4, arch: 'demon', name: 'Molten Behemoth', h: 56, el: 'fire', boss: true },
  { id: 'carapace_spider', sheet: D1, i: 5, arch: 'spider', name: 'Carapace Spider', h: 36 },
  { id: 'horned_stalker', sheet: D1, i: 6, arch: 'ghoul', also: ['hound'], name: 'Horned Stalker', h: 44 },
  { id: 'gullet_worm', sheet: D1, i: 7, arch: 'worm', name: 'Gullet Worm', h: 40 },
  { id: 'shadow_panther', sheet: D1, i: 8, arch: 'hound', name: 'Shadow Panther', h: 38 },
  { id: 'gore_crab', sheet: D1, i: 9, arch: 'scorpion', also: ['spider'], name: 'Gore Crab', h: 44 },
  // ---- set 1: tentacle horrors
  { id: 'writhing_maw', sheet: T1, i: 0, arch: 'slime', name: 'Writhing Maw', h: 44, gore: 'goo' },
  { id: 'maw_bloom', sheet: T1, i: 1, arch: 'shroom', name: 'Maw Bloom', h: 52 },
  { id: 'tentacled_brute', sheet: T1, i: 2, arch: 'abomination', also: ['golem'], name: 'Tentacled Brute', h: 64 },
  { id: 'deep_squid', sheet: T1, i: 3, arch: 'elemental', name: 'Deep Squid', h: 60 },
  { id: 'starmaw', sheet: T1, i: 4, arch: 'shroom', also: ['slime'], name: 'Starmaw', h: 48 },
  { id: 'clawed_crawler', sheet: T1, i: 5, arch: 'scorpion', also: ['spider'], name: 'Clawed Crawler', h: 40 },
  { id: 'hydra_spawn', sheet: T1, i: 6, arch: 'worm', also: ['slime'], name: 'Hydra Spawn', h: 50, gore: 'goo' },
  { id: 'shell_horror', sheet: T1, i: 7, arch: 'golem', also: ['abomination'], name: 'Shell Horror', h: 62, boss: true },
  { id: 'gnashing_thicket', sheet: T1, i: 8, arch: 'shroom', also: ['abomination'], name: 'Gnashing Thicket', h: 58 },
  { id: 'hive_of_mouths', sheet: T1, i: 9, arch: 'abomination', name: 'Hive of Mouths', h: 64, boss: true },
  // ---- set 1: eyes
  { id: 'spined_eye', sheet: E1, i: 0, arch: 'eye', name: 'Spined Eye', h: 40 },
  { id: 'eye_tyrant', sheet: E1, i: 1, arch: 'eye', name: 'Eye Tyrant', h: 48, el: 'arcane', boss: true },
  { id: 'eye_spider', sheet: E1, i: 2, arch: 'spider', name: 'Eye Spider', h: 34 },
  { id: 'eye_stalker', sheet: E1, i: 3, arch: 'eye', also: ['wraith'], name: 'Eye Stalker', h: 66, el: 'fire', fly: false },
  { id: 'gazing_horror', sheet: E1, i: 4, arch: 'eye', name: 'Gazing Horror', h: 46 },
  { id: 'drifting_eye', sheet: E1, i: 5, arch: 'wraith', also: ['elemental'], name: 'Drifting Eye', h: 52, el: 'cold', gore: 'ecto' },
  { id: 'skull_eye', sheet: E1, i: 6, arch: 'bat', also: ['eye'], name: 'Skull Eye', h: 30, fly: true },
  { id: 'hundred_eyes', sheet: E1, i: 7, arch: 'eye', also: ['elemental'], name: 'Hundred Eyes', h: 46 },
  { id: 'eyestalk_crawler', sheet: E1, i: 8, arch: 'spider', also: ['eye'], name: 'Eyestalk Crawler', h: 40, fly: false },
  { id: 'all_seeing', sheet: E1, i: 9, arch: 'eye', name: 'The All-Seeing', h: 60, el: 'poison', boss: true },
];

// Player minions: the Necromancer's skeletons (assets/source/enemies/minions/). Never rolled as monsters; summon
// definitions (data/summons.js) point at them with `look: { art: id }`.
const NW = 'minions/necro_warriors', NC = 'minions/necro_casters';
export const SUMMON_ART = [
  { id: 'ns_warrior', sheet: NW, i: 0, name: 'Skeleton Warrior', h: 50 },
  { id: 'ns_archer', sheet: NW, i: 1, name: 'Skeletal Archer', h: 54 },
  { id: 'ns_spearman', sheet: NW, i: 2, name: 'Skeletal Spearman', h: 54 },
  { id: 'ns_reaver', sheet: NW, i: 3, name: 'Skeletal Reaver', h: 52 },
  { id: 'ns_coffin', sheet: NW, i: 4, name: 'Coffin Guard', h: 56 },
  { id: 'ns_crossbow', sheet: NW, i: 5, name: 'Skeletal Crossbowman', h: 50 },
  { id: 'ns_jailer', sheet: NW, i: 6, name: 'Chained Jailer', h: 54 },
  { id: 'ns_ramskull', sheet: NW, i: 7, name: 'Ramskull Berserker', h: 60 },
  { id: 'ns_digger', sheet: NW, i: 8, name: 'Gravedigger', h: 50 },
  { id: 'ns_banner', sheet: NW, i: 9, name: 'Bone Standard-Bearer', h: 66 },
  { id: 'ns_pyro', sheet: NC, i: 0, name: 'Skeletal Pyromancer', h: 56 },
  { id: 'ns_frost', sheet: NC, i: 1, name: 'Skeletal Mage', h: 60 },
  { id: 'ns_plague', sheet: NC, i: 2, name: 'Skeletal Plaguecaller', h: 50 },
  { id: 'ns_storm', sheet: NC, i: 3, name: 'Skeletal Stormcaller', h: 58 },
  { id: 'ns_bishop', sheet: NC, i: 4, name: 'Bone Bishop', h: 60 },
  { id: 'ns_reaper', sheet: NC, i: 5, name: 'Reaper King', h: 66 },
  { id: 'ns_pyre', sheet: NC, i: 6, name: 'Pyre Inquisitor', h: 62 },
  { id: 'ns_druid', sheet: NC, i: 7, name: 'Thornbone Druid', h: 58 },
  { id: 'ns_bell', sheet: NC, i: 8, name: 'Knell Ringer', h: 60 },
  { id: 'ns_archlich', sheet: NC, i: 9, name: 'Skeletal Archlich', h: 56 },
];

export const ART_BY_ID = Object.fromEntries([...BESTIARY, ...SUMMON_ART].map((a) => [a.id, a]));

/** Looks that can play an archetype. */
export function artPool(arch) {
  return BESTIARY.filter((a) => a.arch === arch || (a.also && a.also.includes(arch)));
}

const weighted = (list, w, rnd) => {
  let tot = 0;
  for (const x of list) tot += w(x);
  let r = rnd() * tot;
  for (const x of list) if ((r -= w(x)) <= 0) return x;
  return list[list.length - 1];
};

/**
 * Roll a level's bestiary: for each archetype up to two looks (art that matches the biome's element is favoured),
 * and each look's palette swap from the biome's list (art whose element matches keeps its own colours).
 * Returns { pick(arch, rnd) -> look | null, boss(roster, rnd) -> {arch, look} | null }; a look is
 * { art, swap } with swap = recolor params or null. `rnd` is a () => [0,1) function.
 */
export function rollLooks(biome, rnd = Math.random) {
  const bel = biome.el && biome.el !== 'phys' ? biome.el : null;
  const swaps = biome.swaps || [null];
  const affinity = (a) => (a.el && a.el === bel ? 4 : 1) * (biome.prefer && biome.prefer.includes(a.sheet) ? 2 : 1);
  const swapFor = (a) => {
    if (a.el && a.el === bel) return null;
    const k = swaps[Math.floor(rnd() * swaps.length)];
    return k ? SWAPS[k] : null;
  };
  const chosen = {};
  const looksFor = (arch) => {
    if (chosen[arch]) return chosen[arch];
    const pool = artPool(arch);
    const out = [];
    for (let n = 0; n < 2 && pool.length; n++) {
      const a = weighted(pool, affinity, rnd);
      pool.splice(pool.indexOf(a), 1);
      out.push({ art: a.id, swap: swapFor(a) });
    }
    return (chosen[arch] = out);
  };
  return {
    pick(arch, r = rnd) {
      const l = looksFor(arch);
      return l.length ? l[Math.floor(r() * l.length)] : null;
    },
    boss(roster, r = rnd) {
      const pool = BESTIARY.filter((a) => a.boss);
      const a = weighted(pool, (x) => affinity(x) * (roster && roster.includes(x.arch) ? 3 : 1), r);
      return a ? { arch: a.arch, look: { art: a.id, swap: swapFor(a) } } : null;
    },
  };
}

/** A unique monster's own palette swap. */
export function uniqueSwap(rnd = Math.random) {
  const keys = Object.keys(SWAPS);
  return SWAPS[keys[Math.floor(rnd() * keys.length)]];
}
