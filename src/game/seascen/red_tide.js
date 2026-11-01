// #9 THE RED TIDE (docs/PIRATE_SEAS.md): Redwater Beacon, on Velscour's blood sea. A dismasted, listing hulk lies
// alongside to port with the blood idol on her deck, and while it stands the drowned climb the Dawnwake's hull out of
// the red water. A plank runs across to the hulk for melee heroes; twice the Dawnwake's port guns can be called onto
// it from a lever at her rail. The tide rises while it stands (the meter: each time it fills, another boat). The
// Gallows King waits on the hulk until the idol is broken and the boats are beaten, then comes over.
const DROWNED = [['drowned_spearman', 'zombie'], ['drowned_boatswain', 'zombie'], ['weeping_drowned', 'wraith'], ['drowned_hound', 'hound']];
const ZD = 11.4;   // where the plank lands on the Dawnwake

export default {
  id: 'red_tide', number: 9, name: 'The Red Tide', light: 'Redwater Beacon', weather: 'blood', weatherName: 'The Red Tide',
  blurb: "Velscour's red tide, and a dead hulk riding it.", dark: 0.18,
  fleet: ['longboat', 'cutter', 'hulk'],
  art: DROWNED.map((d) => d[0]),
  boats: { longboat: 1, cutter: 2 },
  docks: [[-16, 12], [-7, 12.5]],   // the hulk fills the after berths
  mid: { id: 'ap_red_gale_corsair', line: 'Red water, red sails. The idol wants your lamps.', from: 'deck', at: (api) => api.state.deck.tile(0.5, -3), leapTo: (api) => api.tileOf(-3.0, 9.0) },
  final: { id: 'ap_the_gallows_king', line: "The sea's red with my dead. Room for one more.", from: 'deck', at: (api) => api.state.deck.tile(0.4, 4), leapTo: (api) => api.tileOf(-3.0, 9.5) },
  hooks: {
    setup(api) {
      const h = api.spawnShip('hulk', { deck: true }), L = h.info.landing, W = h.info.walk || {}, s = api.sAt(ZD);
      // her starboard bulwark gap (where boarders crossed) faces the Dawnwake's port rail across 3 tiles of red water
      h.place(api.OX - api.beam(s) - 2.0 - L.c[0], api.OY + ZD - L.c[2], 0);   // close aboard: her idol in the hero's view
      const deck = api.state.deck = api.addDeck(h, { levels: [0, W.QH || 1.2, W.FH || 1.0] });
      const b = h.worldOf(L.c[0] - 1.3, L.c[1], L.c[2]);
      api.state.plank = api.join([api.OX - (api.inner(s) - 0.7), api.OY + ZD, 0], [b[0], b[1], b[2] / api.LV], { w: 0.85, plank: true });
      api.state.plank.open();
      api.state.h = h; api.state.idolAt = h.worldOf(...h.info.idol);
      api.state.charges = 2; api.state.leverCd = 0; api.state.climbT = 5;
    },
    start(api) {
      const S = api.state, [x, y, l] = S.idolAt;
      // the idol: a foe that doesn't move or strike, its body the 3D idol (drawn faint as a sprite: its bar and rim show)
      const m = S.idol = api.spawnArt('drowned_captain', 'golem', 'unique', [x, y], { wave: 95 });
      m.x = x; m.y = y; m.static = true; m.dmg = 0; m.alpha = 0.04; m.noShadow = true; m.name = 'The Blood Idol'; m.idol = true;
      m.maxHp = api.base.hp * 7; m.hp = m.maxHp; m.affixes = [];
      S.meter = api.meter('The red tide rises', { color: '#d02840', full: 'wave', note: 'break the idol' });
      // the lever at her port rail: the Dawnwake's guns onto the idol, twice
      const s = api.sAt(ZD + 2.6);
      S.lever = api.mark(api.OX - (api.inner(s) - 0.9), api.OY + ZD + 2.6, 'Gun Lever (2)', () => fire(api), '#ffb040');
      api.point(() => (S.idol && !S.idol.dead ? [S.idol.x, S.idol.y] : null), '#b060ff', 'The Blood Idol');
      api.nudge([x, y], 3);   // the hulk and her idol, once, as the fight opens
    },
    tick(api, dt) {
      const S = api.state, idol = S.idol;
      S.leverCd = Math.max(0, S.leverCd - dt);
      if (!idol) return;
      idol.cd = 99;   // it never strikes
      if (idol.dead) {
        if (!S.broken) {   // the heart goes dark and the veil with it
          S.broken = true; const P = S.h.info.idolParts; if (P) { P.core.visible = false; P.veil.visible = false; }
          api.burst(idol.x, idol.y, 40, 'shadow', 40, 6); api.addEffect(new api.Ring(idol.x, idol.y, 0.3, 4, 0.8, '#b060ff', 6)); api.sfx('explode', 1);
          api.banner('THE IDOL BREAKS', 'The dead stop climbing'); if (S.meter) { S.meter.hide(); S.meter = null; }
          if (S.lever) { api.unmark(S.lever); S.lever = null; }
        }
        return;
      }
      if (S.meter) S.meter.add(dt / 45);
      // the drowned climb her starboard side out of the red water, the side the camera sees
      if ((S.climbT -= dt) > 0) return;
      S.climbT = 3.6 + Math.random() * 1.8;
      if ([...api.live].filter((m) => !m.dead && m.drowned).length >= 6) return;
      for (let i = 0; i < 1 + (Math.random() < 0.4 ? 1 : 0); i++) {
        const z = (Math.random() < 0.5 ? -1 : 1) * (4.2 + Math.random() * 6.5), s = api.sAt(z), [art, arch] = DROWNED[Math.floor(Math.random() * DROWNED.length)];
        const from = [api.OX + api.beam(s) + 0.5, api.OY + z, api.SEA_LV + 2];
        api.splash(from[0], from[1], 0.7);
        const m = api.spawnArt(art, arch, 'normal', [api.OX + api.inner(s) - 1.2, api.OY + z], { from, arc: 70, wave: 94 }); m.drowned = true;
      }
    },
    holdFinal(api) { return !!(api.state.idol && !api.state.idol.dead); },   // the Gallows King waits until it's broken
    objective(api) {   // auto-play calls the guns when they're ready
      const S = api.state;
      if (!S.idol || S.idol.dead) return null;
      if (S.lever && S.charges > 0 && !S.leverCd) return { x: S.lever.x, y: S.lever.y, reach: 1.2, use: () => fire(api) };
      // the guns are spent (or cooling): over the plank to break it by hand
      return S.charges > 0 && S.leverCd ? null : { x: S.idol.x, y: S.idol.y, reach: 1.6 };
    },
  },
};
/** The lever: the Dawnwake's port battery fires on the idol (a third of its life a volley). */
function fire(api) {
  const S = api.state;
  if (!S.idol || S.idol.dead || S.charges <= 0 || S.leverCd > 0) { api.sfx('error'); return; }
  S.charges--; S.leverCd = 6;
  if (S.lever) S.lever.label = S.charges ? `Gun Lever (${S.charges})` : 'Gun Lever (spent)';
  api.banner('FIRE ON THE IDOL!', S.charges ? 'One more volley in her guns' : 'Her guns are spent', S.idolAt);   // the camera leans onto the hulk for the volley
  const [x, y, l] = S.idolAt;
  for (let i = 0; i < 3; i++) api.later(i * 0.3, () => {
    const z = 6 + i * 2.5, s = api.sAt(z);
    api.cannon([api.OX - api.beam(s) + 0.2, api.OY + z, -9], [x, y, l], () => {
      api.burst(x, y, 12, 'fire', 24, 4); api.splash(x - 1, y + 1, 0.4); api.sfx('explode', 0.8);
      const m = S.idol; if (!m || m.dead) return;
      m.hp -= m.maxHp * 0.12; if (m.hp <= 0) { m.hp = 1; api.kill(m); }
    }, 1.0);
  });
  if (S.charges <= 0 && S.lever) { api.unmark(S.lever); S.lever = null; }
}
