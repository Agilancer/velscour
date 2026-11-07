// Class Ultimates: a signature 1-shot power move for each of the 17 hero classes that fills from kills
// (champions, uniques and guardians count more). When full, pressing F or tapping the HUD button arms it,
// and the next click/tap on the world unleashes the class's bespoke strike. Only ever fired by the player
// (auto-play never arms it), and the tap that aims it never moves the hero or takes over from auto-play.
// Damage scales off each class's primary attribute (STR, DEX, INT, VIT).
import { G } from '../state.js';
import { rand, chance, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, Column, Beam, Slash, SkyBolts, burst, sparkle, smoke, gibs, addDecal, spawn, floatText, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit } from './combat.js';
import { UI } from '../ui/ui.js';
import {
  PaladinHolySigil, PaladinCathedralShaft,
  BarbarianTectonicFissure, BarbarianStoneSpikes,
  LancerRunicLock, LancerCelestialJavelin,
  RangerWindVortex, RangerArrowRain,
  GunnerFlareBeacon, GunnerArtilleryShell,
  BardStaffSpiral,
  WizardSingularity,
  NecroAbyssPool, NecroBonePikes,
  WitchPentagram, WitchCrowCyclone,
  MonkLotusMandala, MonkSevenStrike,
  DragoonSkyDiveSigil, DragoonMeteorSpear,
  TotemMasterMonolith, TotemSpiritStorm,
  DeathKnightGlacierSigil, DeathKnightIceSpikes,
  AstronomerAstralVortex,
  SlimeLordAcidPool, SlimeLordRoyalGeyser,
  BoomerangGaleVortex, BoomerangBladeStorm,
  DragonKnightHellfireRune, DragonKnightBreathOfFlame,
} from '../gfx/ultimates_fx.js';

export const SMITE_KILLS = 45; // plain kills to fill the meter
export const SMITE_R = 4.6; // default blast radius (tiles)
const WORTH = { normal: 1, champion: 3, unique: 6, boss: 12, raid: 12 };
// at least this share of a foe's life goes per ultimate strike, by rank (normal packs vanish, guardians lose heavy chunks)
const SHARE = { normal: 1.1, champion: 0.45, unique: 0.32, boss: 0.12, raid: 0.06 };
let striking = false; // a strike's own kills don't feed the next meter

export const ULTIMATES = {
  paladin: {
    id: 'smite',
    name: 'Divine Smite',
    title: 'SMITE',
    stat: 'str',
    el: 'holy',
    r: 4.6,
    color: '#ffe070',
    haloColor: '#ffd040',
    desc: 'Calls down a consecrated pillar of holy cathedral light that obliterates evil.',
    chargeSound: 'holy',
    opts: { noArc: true, knock: 1.4 },
  },
  barbarian: {
    id: 'cataclysm',
    name: 'Cataclysm',
    title: 'CATACLYSM',
    stat: 'str',
    el: 'phys',
    r: 4.4,
    color: '#ff6a20',
    haloColor: '#d84010',
    desc: 'Shatters the earth in a devastating tectonic eruption of magma and rock.',
    chargeSound: 'roar',
    opts: { noArc: true, knock: 2.4, stun: 1.5 },
  },
  lancer: {
    id: 'gungnir',
    name: "Gungnir's Fall",
    title: 'GUNGNIR',
    stat: 'str',
    el: 'light',
    r: 4.2,
    color: '#70c8ff',
    haloColor: '#2080ff',
    desc: 'Calls down a colossal celestial lightning lance that detonates on impact.',
    chargeSound: 'light',
    opts: { noArc: true, knock: 1.6, slow: 2.0 },
  },
  ranger: {
    id: 'shafts',
    name: 'Storm of Shafts',
    title: 'SHAFTS',
    stat: 'dex',
    el: 'phys',
    r: 4.8,
    color: '#7cd850',
    haloColor: '#40a020',
    desc: 'Unleashes an overwhelming skyfall of barbed arrows and hunting raptors.',
    chargeSound: 'bow',
    opts: { noArc: true, bleed: true, knock: 0.8 },
  },
  gunner: {
    id: 'artillery',
    name: 'Siege Artillery',
    title: 'ARTILLERY',
    stat: 'dex',
    el: 'fire',
    r: 4.5,
    color: '#ff9030',
    haloColor: '#c04010',
    desc: 'Orders a devastating heavy siege artillery bombardment and shrapnel storm.',
    chargeSound: 'shoot',
    opts: { noArc: true, burn: true, aoe: true, knock: 2.2 },
  },
  bard: {
    id: 'crescendo',
    name: 'Grand Crescendo',
    title: 'CRESCENDO',
    stat: 'dex',
    el: 'arcane',
    r: 4.4,
    color: '#ff6090',
    haloColor: '#b02060',
    desc: 'Detonates a deafening symphonic acoustic shockwave that shatters defenses.',
    chargeSound: 'note',
    opts: { noArc: true, knock: 1.8, silent: true },
  },
  wizard: {
    id: 'supernova',
    name: 'Supernova',
    title: 'SUPERNOVA',
    stat: 'int',
    el: 'fire',
    r: 4.8,
    color: '#ffb040',
    haloColor: '#ff4020',
    desc: 'Collapses a cosmic singularity into an apocalyptic stellar firestorm.',
    chargeSound: 'fire',
    opts: { noArc: true, burn: true, aoe: true },
  },
  necromancer: {
    id: 'grave',
    name: 'Grave Eruption',
    title: 'GRAVE',
    stat: 'int',
    el: 'shadow',
    r: 4.5,
    color: '#b070ff',
    haloColor: '#6020c0',
    desc: 'Ruptures the ground with giant skeletal arms, bone spikes, and soul vortexes.',
    chargeSound: 'bones',
    opts: { noArc: true, leech: 0.25 },
  },
  carrion_witch: {
    id: 'crows',
    name: 'Feast of Crows',
    title: 'CROWS',
    stat: 'int',
    el: 'poison',
    r: 4.6,
    color: '#a0e040',
    haloColor: '#509010',
    desc: 'Unleashes a ravenous swarm of flesh-eating shadow crows and toxic plague.',
    chargeSound: 'poison',
    opts: { noArc: true, poison: true },
  },
  monk: {
    id: 'nirvana',
    name: 'Seven-Sided Strike',
    title: 'NIRVANA',
    stat: 'dex',
    el: 'holy',
    r: 4.8,
    color: '#ffc830',
    haloColor: '#e08010',
    desc: 'Dashes with supersonic grace, striking all nearby enemies with radiant palm shockwaves and resonant temple bells.',
    chargeSound: 'holy',
    opts: { noArc: true, knock: 1.6, stun: true },
  },
  dragoon: {
    id: 'skydive',
    name: 'Skyfall Dive',
    title: 'SKYFALL',
    stat: 'str',
    el: 'light',
    r: 4.8,
    color: '#6aa8ff',
    haloColor: '#2060ff',
    desc: 'Leaps beyond the stratosphere and descends as a celestial dragon lance that shatters the earth.',
    chargeSound: 'thunder',
    opts: { noArc: true, knock: 2.2, stun: 1.5 },
  },
  totem_master: {
    id: 'totem_cataclysm',
    name: 'Grand Totemic Cataclysm',
    title: 'TOTEM',
    stat: 'int',
    el: 'light',
    r: 4.8,
    color: '#5ac8a0',
    haloColor: '#208060',
    desc: 'Erects an ancient spiritual monolith that channels thunder, spiritual fire, and ancestral fury.',
    chargeSound: 'summon',
    opts: { noArc: true, aoe: true, knock: 1.6 },
  },
  death_knight: {
    id: 'glacial_oblivion',
    name: 'Glacial Oblivion',
    title: 'OBLIVION',
    stat: 'str',
    el: 'cold',
    r: 4.6,
    color: '#7ad0ff',
    haloColor: '#1060b0',
    desc: 'Impales the earth with a runeblade, erecting a colossal frozen citadel of razor ice spikes.',
    chargeSound: 'freeze',
    opts: { noArc: true, freeze: true, knock: 1.4 },
  },
  arcane_sorcerer: {
    id: 'astral_collapse',
    name: 'Astral Collapse',
    title: 'COLLAPSE',
    stat: 'int',
    el: 'arcane',
    r: 5.0,
    color: '#4aa8ff',
    haloColor: '#7020ff',
    desc: 'Manifests a celestial star that implodes into a devastating gravitational supernova.',
    chargeSound: 'portal',
    opts: { noArc: true, aoe: true, knock: 1.8 },
  },
  slime_lord: {
    id: 'royal_deluge',
    name: 'Royal Deluge',
    title: 'DELUGE',
    stat: 'vit',
    el: 'poison',
    r: 4.8,
    color: '#4ae880',
    haloColor: '#108030',
    desc: 'Ruptures the earth with a catastrophic geyser of corrosive living slime and acidic ooze.',
    chargeSound: 'acid',
    opts: { noArc: true, poison: true, knock: 1.5 },
  },
  boomerang_knight: {
    id: 'cyclone_tempest',
    name: 'Cyclone Tempest',
    title: 'TEMPEST',
    stat: 'dex',
    el: 'phys',
    r: 4.6,
    color: '#3ac8a8',
    haloColor: '#108060',
    desc: 'Hurls an apocalyptic hurricane of whirling razor boomerangs that shred everything in their orbit.',
    chargeSound: 'crit',
    opts: { noArc: true, bleed: true, knock: 1.8 },
  },
  dragon_knight: {
    id: 'dragons_inferno',
    name: "Dragon's Inferno",
    title: 'INFERNO',
    stat: 'str',
    el: 'fire',
    r: 4.8,
    color: '#ff5a2a',
    haloColor: '#b01808',
    desc: 'Channels the primordial fury of the red wyrm, incinerating the battlefield with apocalyptic dragonflame.',
    chargeSound: 'roar',
    opts: { noArc: true, burn: true, aoe: true, knock: 2.0 },
  },
};

export function getUltimate(classId) {
  return ULTIMATES[classId] || ULTIMATES.paladin;
}

export const smiteReady = () => !!G.char && (G.char.smite || 0) >= 1 && !!G.world && G.world.kind === 'dungeon' && !!G.player && !G.player.dead;
export const smiteArmed = () => !!G.smiteArmed && smiteReady();

/** A kill feeds the meter. */
export function smiteKill(m) {
  const c = G.char;
  if (!c || striking || m.team !== 'enemy' || m.summon || (c.smite || 0) >= 1) return;
  c.smite = Math.min(1, (c.smite || 0) + (WORTH[m.rank] || 1) / SMITE_KILLS);
  if (c.smite >= 1) {
    const ult = getUltimate(c.classId);
    sfx(ult.chargeSound || 'holy', 0.6);
    UI.log(`<b>${ult.name}</b> is ready: press ${ult.title} (F), then ${G.touch ? 'tap' : 'click'} where to strike.`, ult.color);
  }
}

/** The button / F key: arm (or disarm) the strike. */
export function toggleSmite(v = !G.smiteArmed) {
  if (v && !smiteReady()) return false;
  G.smiteArmed = v;
  const ult = getUltimate(G.char?.classId);
  if (v) {
    sfx('ui');
    UI.centerMsg(ult.title, `${G.touch ? 'Tap' : 'Click'} where to strike`, 1.8);
  } else {
    hideBanner();
  }
  return true;
}

function hideBanner() {
  if (UI.msgEl) {
    const ult = getUltimate(G.char?.classId);
    if (new RegExp(`^(${ult.title}|SMITE)`).test(UI.msgEl.textContent)) {
      UI.msgEl.style.opacity = '0';
    }
  }
}

/** Call the ultimate strike down on tile (x, y). */
export function smiteAt(x, y) {
  const w = G.world, p = G.player, c = G.char;
  if (!smiteReady()) { G.smiteArmed = false; return false; }
  G.smiteArmed = false;
  c.smite = 0;
  hideBanner();
  c.smites = (c.smites || 0) + 1;
  const ult = getUltimate(c.classId);
  executeUltimate(ult, x, y, w, p);
  return true;
}

export function executeUltimate(ult, x, y, w, p) {
  switch (ult.id) {
    case 'smite': {
      // Paladin: Consecrated Holy Sigil & Cathedral God-Ray Cascade
      addEffect(new PaladinHolySigil(x, y, ult.r));
      addEffect(new PaladinCathedralShaft(x, y, ult.r));
      sfx('holy', 1.0); sfx('buff', 0.8);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.4, 'holy', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.65, '#ffffff', 8));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.75, 0.45, '#ffd040', 6, { fill: true }));
        burst(x, y, 30, 'holy', 55, 8);
        sparkle(x, y, 45, '#ffffff', 36, ult.r * 0.7);
        addEffect(new Beam(x - ult.r * 1.1, y, x + ult.r * 1.1, y, '#fff6b0', 0.5, 10));
        addEffect(new Beam(x, y - ult.r * 1.1, x, y + ult.r * 1.1, '#fff6b0', 0.5, 10));
        for (let i = 0; i < 28; i++) {
          const a = rand(TAU), r = rand(0.3, ult.r);
          spawn({ type: 'glow', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: 0, vz: rand(90, 240), life: rand(0.7, 1.3), size: rand(3, 7), size1: 0, color: chance(0.5) ? '#ffe070' : '#ffffff', add: true });
        }
        camera.shake(14); G.flash = Math.max(G.flash || 0, 0.5);
        sfx('explode', 0.9); sfx('boss', 0.45); sfx('holy', 0.85);
        dealUltimateDamage(ult, x, y, w, p);
      }, 360);
      break;
    }

    case 'cataclysm': {
      // Barbarian: Tectonic Earth Eruption & Magma Fissures
      addEffect(new BarbarianTectonicFissure(x, y, ult.r));
      sfx('thud', 1.4); sfx('roar', 0.9);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        addEffect(new BarbarianStoneSpikes(x, y, ult.r));
        explosionFx(x, y, 3.2, 'fire', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.6, 0.55, '#ff8020', 8));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.65, 0.4, '#d03010', 5, { fill: true }));
        burst(x, y, 32, 'fire', 54, 9);
        gibs(x, y, 14, 20, '#603010', '#904010', 2.4);
        smoke(x, y, 14, '#2a1a10', 16, 26);
        camera.shake(17); G.flash = Math.max(G.flash || 0, 0.4);
        sfx('explode', 1.1); sfx('roar', 0.95); sfx('thud', 1.5);
        dealUltimateDamage(ult, x, y, w, p);
      }, 300);
      break;
    }

    case 'gungnir': {
      // Lancer: Celestial Runic Lock & Plunging Lightning Spear
      addEffect(new LancerRunicLock(x, y, ult.r));
      addEffect(new LancerCelestialJavelin(x, y));
      sfx('light', 1.0); sfx('thunder', 0.8);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        addEffect(new Column(x, y, '#c0f0ff', 0.6, 36, 750));
        explosionFx(x, y, 3.0, 'light', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.7, 0.6, '#a0e8ff', 8));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.7, 0.38, '#50b0ff', 5, { fill: true }));
        sparkle(x, y, 42, '#c0f8ff', 34, ult.r * 0.75);
        burst(x, y, 26, 'light', 46, 8);
        for (let i = 0; i < 4; i++) {
          const a = (i * TAU) / 4 + rand(-0.3, 0.3);
          const ex = x + Math.cos(a) * ult.r * 0.9, ey = y + Math.sin(a) * ult.r * 0.9;
          addEffect(new SkyBolts(ex, ey, 1, 0.25, '#90e0ff'));
        }
        camera.shake(14); G.flash = Math.max(G.flash || 0, 0.45);
        sfx('thunder', 1.15); sfx('explode', 0.85); sfx('light', 1.0);
        dealUltimateDamage(ult, x, y, w, p);
      }, 280);
      break;
    }

    case 'shafts': {
      // Ranger: Woodland Wind Vortex & Skyfall Arrow Rain
      addEffect(new RangerWindVortex(x, y, ult.r));
      addEffect(new RangerArrowRain(x, y, ult.r));
      sfx('bow', 1.1); sfx('buff', 0.7);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 2.9, 'phys', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.7, 0.6, '#a0f060', 7));
        sparkle(x, y, 36, '#80ff60', 28, ult.r * 0.8);
        burst(x, y, 24, 'phys', 40, 7);
        for (let i = 0; i < 10; i++) {
          addEffect(new Slash(x + rand(-ult.r * 0.7, ult.r * 0.7), y + rand(-ult.r * 0.7, ult.r * 0.7), rand(TAU), Math.PI * 0.7, rand(0.6, 1.1), 0.3, '#90e850'));
        }
        camera.shake(11); G.flash = Math.max(G.flash || 0, 0.28);
        sfx('bow', 1.0); sfx('crit', 1.1); sfx('hit', 0.9);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'artillery': {
      // Gunner: Flare Beacon & Heavy Siege Artillery Shell
      addEffect(new GunnerFlareBeacon(x, y, ult.r));
      addEffect(new GunnerArtilleryShell(x, y));
      smoke(x, y, 8, '#d02818', 10, 16);
      sfx('shoot', 1.1); sfx('hit', 0.7);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.6, 'fire', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.65, '#ff8020', 9));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.7, 0.45, '#ffe040', 6, { fill: true }));
        sparkle(x, y, 48, '#ffea90', 40, ult.r * 0.8);
        burst(x, y, 30, 'fire', 54, 9);
        gibs(x, y, 12, 18, '#302018', '#604030', 2.2);
        smoke(x, y, 16, '#181614', 22, 32);
        camera.shake(17); G.flash = Math.max(G.flash || 0, 0.46);
        sfx('explode', 1.2); sfx('boss', 0.55); sfx('shoot', 0.8);
        dealUltimateDamage(ult, x, y, w, p);
      }, 340);
      break;
    }

    case 'crescendo': {
      // Bard: Golden Musical Staff Spiral & Acoustic Pressure Waves
      addEffect(new BardStaffSpiral(x, y, ult.r));
      sfx('note', 1.1, 1.6); sfx('arcane', 0.8);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.1, 'arcane', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.1, ult.r + 0.8, 0.65, '#ff80b0', 8));
        addEffect(new Ring(x, y, 0.3, ult.r + 0.4, 0.5, '#ffd0e0', 6));
        addEffect(new Ring(x, y, 0.5, ult.r * 0.7, 0.4, '#ffffff', 4));
        sparkle(x, y, 42, '#ffa0c0', 34, ult.r * 0.7);
        burst(x, y, 25, 'arcane', 44, 7);
        camera.shake(12); G.flash = Math.max(G.flash || 0, 0.38);
        sfx('sonic', 1.2); sfx('critping', 0.95); sfx('arcane', 0.9);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'supernova': {
      // Wizard: Cosmic Singularity Inward Collapse & Supernova Detonation
      addEffect(new WizardSingularity(x, y, ult.r));
      sfx('portal', 0.85); sfx('fire', 0.9);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.7, 'fire', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.1, ult.r + 1.0, 0.75, '#ffffff', 10));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.75, 0.5, '#ff5020', 7, { fill: true }));
        burst(x, y, 35, 'fire', 58, 9);
        sparkle(x, y, 50, '#fff4d0', 44, ult.r * 0.85);
        camera.shake(16); G.flash = Math.max(G.flash || 0, 0.55);
        sfx('explode', 1.15); sfx('fire', 1.05); sfx('boss', 0.45);
        dealUltimateDamage(ult, x, y, w, p);
      }, 380);
      break;
    }

    case 'grave': {
      // Necromancer: Swirling Abyssal Pool & Erupting Ivory Bone Pikes
      addEffect(new NecroAbyssPool(x, y, ult.r));
      sfx('shadow', 1.0); sfx('summon', 0.8);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        addEffect(new NecroBonePikes(x, y, ult.r));
        explosionFx(x, y, 3.2, 'shadow', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.7, 0.65, '#a060ff', 8));
        gibs(x, y, 14, 20, '#e0d8c0', '#f0e8d0', 2.1);
        burst(x, y, 26, 'shadow', 46, 7);
        sparkle(x, y, 40, '#c080ff', 34, ult.r * 0.75);
        if (p) {
          for (let i = 0; i < 10; i++) {
            const a = rand(TAU), d = rand(0.4, ult.r * 0.8);
            const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
            spawn({ type: 'glow', x: sx, y: sy, z: rand(4, 16), vx: (p.x - sx) * 2, vy: (p.y - sy) * 2, vz: rand(20, 60), life: 0.65, size: 5, size1: 1, color: '#b060ff', add: true });
          }
        }
        camera.shake(13); G.flash = Math.max(G.flash || 0, 0.38);
        sfx('bones', 1.1); sfx('shadow', 1.05); sfx('die', 0.7);
        dealUltimateDamage(ult, x, y, w, p);
      }, 300);
      break;
    }

    case 'crows': {
      // Carrion Witch: Toxic Occult Pentagram & Screeching Crow Cyclone
      addEffect(new WitchPentagram(x, y, ult.r));
      addEffect(new WitchCrowCyclone(x, y, ult.r));
      sfx('poison', 1.0); sfx('roar', 0.6);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.3, 'poison', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.65, '#80e030', 8));
        smoke(x, y, 12, '#203810', 16, 26);
        addDecal(x, y, '#408010', ult.r * 0.9, 'splat', 0.9);
        burst(x, y, 26, 'poison', 46, 8);
        sparkle(x, y, 40, '#90ff40', 34, ult.r * 0.75);
        camera.shake(12); G.flash = Math.max(G.flash || 0, 0.35);
        sfx('acid', 1.05); sfx('poison', 1.05); sfx('squish', 0.9);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'nirvana': {
      // Monk: Sacred Chakra Lotus Mandala & Seven-Sided Palm Shockwaves
      addEffect(new MonkLotusMandala(x, y, ult.r));
      addEffect(new MonkSevenStrike(x, y, ult.r));
      sfx('holy', 1.0); sfx('buff', 0.8);
      addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.65, '#ffe060', 6));
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.4, 'holy', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r * 0.8, 0.5, '#ffd840', 5));
        burst(x, y, 36, 'holy', 60, 9);
        sparkle(x, y, 50, '#ffffff', 40, ult.r * 0.8);
        camera.shake(16); G.flash = Math.max(G.flash || 0, 0.5);
        sfx('explode', 1.0); sfx('holy', 1.0); sfx('thud', 1.2);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'skydive': {
      // Dragoon: Celestial Skyfall Dive & Dragon Meteor Lance
      addEffect(new DragoonSkyDiveSigil(x, y, ult.r));
      addEffect(new DragoonMeteorSpear(x, y));
      sfx('thunder', 1.1); sfx('roar', 0.85);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        addEffect(new Column(x, y, '#a0e0ff', 0.6, 40, 750));
        explosionFx(x, y, 3.6, 'light', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.9, 0.65, '#80d0ff', 9));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.75, 0.45, '#ffd040', 6, { fill: true }));
        burst(x, y, 35, 'light', 58, 9);
        sparkle(x, y, 50, '#ffffff', 42, ult.r * 0.8);
        for (let i = 0; i < 4; i++) {
          const a = (i * TAU) / 4 + rand(-0.25, 0.25);
          const ex = x + Math.cos(a) * ult.r * 0.85, ey = y + Math.sin(a) * ult.r * 0.85;
          addEffect(new SkyBolts(ex, ey, 1, 0.22, '#70c8ff'));
        }
        camera.shake(18); G.flash = Math.max(G.flash || 0, 0.55);
        sfx('explode', 1.2); sfx('thunder', 1.2); sfx('light', 1.0);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'totem_cataclysm': {
      // Totem Master: Ancient Ancestral Monolith & Spirit Storm
      addEffect(new TotemMasterMonolith(x, y, ult.r));
      addEffect(new TotemSpiritStorm(x, y, ult.r));
      sfx('summon', 1.0); sfx('buff', 0.8);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.4, 'light', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.65, '#50e8a0', 8));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.7, 0.45, '#ffe050', 5, { fill: true }));
        burst(x, y, 30, 'light', 50, 8);
        sparkle(x, y, 45, '#60ffc0', 38, ult.r * 0.75);
        for (let i = 0; i < 4; i++) {
          const a = (i * TAU) / 4;
          const ex = x + Math.cos(a) * ult.r * 0.75, ey = y + Math.sin(a) * ult.r * 0.75;
          addEffect(new SkyBolts(ex, ey, 1, 0.2, '#50e8a0'));
        }
        camera.shake(14); G.flash = Math.max(G.flash || 0, 0.42);
        sfx('thunder', 1.1); sfx('explode', 0.9); sfx('summon', 1.0);
        dealUltimateDamage(ult, x, y, w, p);
      }, 330);
      break;
    }

    case 'glacial_oblivion': {
      // Death Knight: Glacial Frost Citadel & Erupting Ice Spikes
      addEffect(new DeathKnightGlacierSigil(x, y, ult.r));
      addEffect(new DeathKnightIceSpikes(x, y, ult.r));
      sfx('freeze', 1.1); sfx('shadow', 0.85);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.4, 'cold', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.7, '#80e0ff', 8));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.7, 0.45, '#4090ff', 6, { fill: true }));
        addDecal(x, y, '#60b8e8', ult.r * 0.9, 'splat', 1.2);
        burst(x, y, 32, 'cold', 52, 8);
        gibs(x, y, 16, 22, '#c8f0ff', '#e0f8ff', 2.0);
        sparkle(x, y, 48, '#ffffff', 40, ult.r * 0.8);
        camera.shake(15); G.flash = Math.max(G.flash || 0, 0.45);
        sfx('freeze', 1.2); sfx('explode', 0.95); sfx('bones', 1.0);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'astral_collapse': {
      // Arcane Sorcerer (Astronomer): Celestial Planetary Singularity & Cosmic Supernova
      addEffect(new AstronomerAstralVortex(x, y, ult.r));
      sfx('portal', 1.0); sfx('arcane', 0.9);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.8, 'arcane', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.1, ult.r + 1.1, 0.75, '#c080ff', 10));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.8, 0.5, '#40c0ff', 7, { fill: true }));
        burst(x, y, 36, 'arcane', 58, 9);
        sparkle(x, y, 54, '#ffffff', 44, ult.r * 0.85);
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6;
          addEffect(new Beam(x, y, x + Math.cos(a) * ult.r * 1.1, y + Math.sin(a) * ult.r * 1.1, '#80c0ff', 0.4, 8));
        }
        camera.shake(17); G.flash = Math.max(G.flash || 0, 0.58);
        sfx('sonic', 1.2); sfx('explode', 1.1); sfx('arcane', 1.1);
        dealUltimateDamage(ult, x, y, w, p);
      }, 350);
      break;
    }

    case 'royal_deluge': {
      // Slime Lord: Corrosive Acid Pool & Crowned Living Ooze Geyser
      addEffect(new SlimeLordAcidPool(x, y, ult.r));
      addEffect(new SlimeLordRoyalGeyser(x, y, ult.r));
      sfx('squish', 1.2); sfx('poison', 1.0);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.5, 'poison', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.8, 0.65, '#50ff70', 8));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.7, 0.45, '#20aa40', 6, { fill: true }));
        addDecal(x, y, '#30a840', ult.r * 0.95, 'splat', 1.2);
        burst(x, y, 32, 'poison', 52, 8);
        gibs(x, y, 16, 22, '#40d050', '#80ff90', 2.2);
        smoke(x, y, 14, '#1a3a14', 18, 28);
        camera.shake(14); G.flash = Math.max(G.flash || 0, 0.4);
        sfx('acid', 1.15); sfx('squish', 1.1); sfx('explode', 0.85);
        dealUltimateDamage(ult, x, y, w, p);
      }, 330);
      break;
    }

    case 'cyclone_tempest': {
      // Boomerang Knight: Slicing Gale Vortex & Orbital Razor Boomerang Storm
      addEffect(new BoomerangGaleVortex(x, y, ult.r));
      addEffect(new BoomerangBladeStorm(x, y, ult.r));
      sfx('bow', 1.2); sfx('critping', 1.0);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.2, 'phys', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.1, ult.r + 0.8, 0.6, '#40e8b0', 7));
        addEffect(new Ring(x, y, 0.3, ult.r + 0.4, 0.5, '#a0ffe0', 5));
        burst(x, y, 28, 'phys', 46, 8);
        sparkle(x, y, 42, '#a0ffe0', 36, ult.r * 0.8);
        for (let i = 0; i < 12; i++) {
          addEffect(new Slash(x + rand(-ult.r * 0.7, ult.r * 0.7), y + rand(-ult.r * 0.7, ult.r * 0.7), rand(TAU), Math.PI * 0.8, rand(0.7, 1.2), 0.3, '#3ac8a8'));
        }
        camera.shake(13); G.flash = Math.max(G.flash || 0, 0.35);
        sfx('crit', 1.2); sfx('hit', 1.1); sfx('sonic', 0.9);
        dealUltimateDamage(ult, x, y, w, p);
      }, 320);
      break;
    }

    case 'dragons_inferno': {
      // Dragon Knight: Primordial Wyrm Hellfire Rune & Roaring Flame Torrent
      addEffect(new DragonKnightHellfireRune(x, y, ult.r));
      addEffect(new DragonKnightBreathOfFlame(x, y, ult.r));
      sfx('roar', 1.2); sfx('fire', 1.0);
      setTimeout(() => {
        if (G.world !== w || !G.player) return;
        explosionFx(x, y, 3.7, 'fire', 'explosion', { sound: false });
        addEffect(new Ring(x, y, 0.2, ult.r + 0.9, 0.7, '#ff6020', 9));
        addEffect(new Ring(x, y, 0.2, ult.r * 0.75, 0.48, '#ffa030', 6, { fill: true }));
        addDecal(x, y, '#501004', ult.r * 0.9, 'splat', 1.2);
        burst(x, y, 36, 'fire', 58, 9);
        gibs(x, y, 14, 20, '#501408', '#802010', 2.4);
        smoke(x, y, 16, '#200804', 20, 30);
        camera.shake(18); G.flash = Math.max(G.flash || 0, 0.55);
        sfx('explode', 1.2); sfx('roar', 1.1); sfx('fire', 1.1);
        dealUltimateDamage(ult, x, y, w, p);
      }, 340);
      break;
    }
  }
}

function dealUltimateDamage(ult, x, y, w, p) {
  const base = heroHit(p, ult);
  let n = 0;
  striking = true;
  try {
    for (const m of w.hostiles('player', x, y, ult.r)) {
      if (m.team !== 'enemy' || m.dead) continue;
      const rank = m.raid ? 'raid' : m.rank || 'normal';
      const res = Math.min(0.9, (m.res && m.res[ult.el]) || 0);
      const minLifeShare = m.maxHp * (SHARE[rank] ?? 0.5) / (1 - res);
      const dmg = Math.max(base, minLifeShare);
      if (hit(p, m, dmg, ult.el, ult.opts || {}) > 0) n++;
    }
  } finally {
    striking = false;
  }
  floatText(x, y, 90, n ? `${ult.title} ×${n}` : ult.title, ult.color, 22, { life: 1.6 });
}

/** Compute base damage from hero stats: scaled by main stat and weapon. */
function heroHit(p, ult) {
  const wpn = (p && p.st && p.st.weapon) || [1, 3];
  const avgWpn = (wpn[0] + wpn[1]) / 2;
  const primaryVal = (p.st && p.st[ult.stat]) || (p.st && p.st.primary) || 20;
  // Scaled by primary stat (+2% per stat point) plus dmgPct and 16x baseline multiplier
  const statMult = 1 + (primaryVal * 0.02) + ((p.st && p.st.dmgPct ? p.st.dmgPct : 0) / 100);
  return Math.max(30, avgWpn * statMult * 16);
}

/** The aiming reticle under the mouse while armed (desktop; touch aims with the tap itself). Drawn in world space. */
export const reticle = {
  layer: 'top', add: true,
  update() { return true; },
  draw(ctx) {
    if (!smiteArmed() || G.touch || !G.input || G.input.lastPointerType !== 'mouse') return;
    const [x, y] = camera.screenToTile(G.input.mouse.x, G.input.mouse.y);
    const px = isoX(x, y), py = isoY(x, y), t = G.time;
    const ult = getUltimate(G.char?.classId);
    const r = ult.r;
    ctx.strokeStyle = ult.color; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 8);
    ctx.beginPath(); ctx.ellipse(px, py, r * 32 * Math.SQRT2, r * 16 * Math.SQRT2, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.drawImage(glowSprite(ult.haloColor), px - 18, py - 18, 36, 36);
    ctx.globalAlpha = 1;
  },
};
