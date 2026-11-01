// #2 ACROSS THE PLANK (docs/PIRATE_SEAS.md): Skerrow Light, in a sea fog. Captain Hesper Lowe's gun-brig, the Widow's
// Due, lies alongside to port with her corvus hauled up. It drops onto the Dawnwake's rail with the first wave and her
// crew come over it on foot, wave after wave beside the boats from astern; her starboard battery fires telegraphed
// rings across the Dawnwake's deck until her gunners fall (each broadside that lands holes her: the meter costs the
// chest). Her bosun comes over after the third wave. After the fifth the plank is ours: Lowe waits at her helm on her
// quarterdeck and fights there, and the hero crosses to her.
const GUNS = ['ap_blackpowder_pistolier', 'ap_twin_pistol_ratliner', 'ap_crow_s_nest_sharpshooter', 'ap_windlass_crossbowman'];
const ZD = 11.4;   // where the corvus lands on the Dawnwake: her port rail between the dinghy davits and the quarterdeck

export default {
  id: 'across_the_plank', number: 2, name: 'Across the Plank', light: 'Skerrow Light', weather: 'fog', weatherName: 'Sea Fog',
  blurb: "The Widow's Due lies alongside in the fog, her corvus raised.", fogK: 1, dark: 0.12,
  fleet: ['longboat', 'cutter', 'brig'],
  boats: { longboat: 3, cutter: 1 },
  barks: { longboats: null },   // her first call is the corvus, not the fog's longboats
  docks: [[-16, 12], [-7, 12.5]],   // her brig fills the after berths
  // deck: how many of her crew come over the corvus with the wave
  waves: [
    { boats: 1, n: [3], champion: 0, deck: 3 },
    { boats: 1, n: [4], champion: 1, deck: 3 },
    { boats: 2, n: [4, 3], champion: 2, unique: 1, mid: true, deck: 2 },
    { boats: 2, n: [4, 4], champion: 2, deck: 3 },
    { boats: 3, n: [4, 4, 3], champion: 3, unique: 1 },
  ],
  mid: { id: 'ap_brass_beak', name: 'Brass-Beak', title: "Bosun of the Widow's Due", line: 'Douse that green fire, and them with it!', from: 'deck',
    at: (api) => api.state.deck.tile(0.6, 2.0), leapTo: (api) => api.tileOf(-3.0, 9.0) },
  final: { id: 'ap_captain_sable_vane', name: 'Captain Hesper Lowe', title: "Captain of the Widow's Due", line: "Strike, and I'll let your marines swim.",
    from: 'deck', at: (api) => api.state.helm, stay: true },
  hooks: {
    setup(api) {
      const h = api.spawnShip('brig', { deck: true, fight: 0.8 }), P = h.info.plank, W = h.info.walk || {};
      const s = api.sAt(ZD);
      h.place(api.OX - api.beam(s) - P.x - P.len + 0.35, api.OY + ZD - P.z, 0);
      h.ship.setPlank?.(0);
      const deck = api.state.deck = api.addDeck(h, { levels: [0, W.QH || 1.2, W.FH || 1.0] });
      // the corvus: from inside her starboard rail over the plank to inside the Dawnwake's port rail
      const [bx, by] = h.worldOf(P.x - 1.2, 0, P.z);
      api.state.corvus = api.join([api.OX - (api.inner(s) - 0.7), api.OY + ZD, 0], [bx, by, h.deckY], { w: 0.85 });
      // her helm (the quarterdeck's crew spot) and her gunners' stations along her starboard rail
      const qd = (h.info.crew || []).find((c) => c[1] > 0.5) || [0.9, W.QH || 1.2, 10];
      api.state.helm = h.worldOf(qd[0], qd[1], qd[2]).slice(0, 2);
      api.state.guns = [-3.4, -1.2, 1.2, 3.4].map((z) => h.worldOf(2.0, 0, z).slice(0, 2));
      api.state.h = h; api.state.gunners = [];
      api.point(() => (api.run.phase === 'final' && api.run.capM && !api.run.capM.dead ? [api.run.capM.x, api.run.capM.y] : null), '#ff9a6a', 'Her helm');
    },
    start(api) {
      // her gunners take their stations, and the broadside's meter shows what her guns cost the Dawnwake
      const S = api.state;
      S.gunners = S.guns.map((at, i) => { const m = api.spawnOnDeck(GUNS[i % GUNS.length], i ? 'normal' : 'champion', at, 96); m.static = true; m.gunner = true; return m; });
      S.meter = api.meter("Her broadside", { color: '#ff7a3a', full: 'reward', note: `${S.gunners.length} gunners` });
      S.volleyT = 9;
    },
    onWave(api, n, w) {
      const S = api.state;
      if (n === 0 && !S.corvus.isOpen) {   // the corvus comes down on the rail, her crew behind it
        const land = [api.OX - (api.inner(api.sAt(ZD)) - 0.7), api.OY + ZD];
        api.banner('THE CORVUS DROPS', "Her crew come over the plank", land); api.bark("Plank's coming down!");
        let f = 0; api.scripted((dt) => { f = Math.min(1, f + dt * 1.4); S.h.ship.setPlank?.(f); if (f >= 1) { S.corvus.open(); api.sfx('thud', 1); api.splash(api.OX - 8, api.OY + ZD, 0.6); return false; } return true; });
      }
      for (let i = 0; i < (w.deck || 0); i++) api.later(0.6 + i * 0.5, () => api.spawnOnDeck(null, i === 0 && n > 1 ? 'champion' : 'normal', S.deck.tile(rand2(1.2, 2.4), rand2(-4, 4)), n), n);
    },
    tick(api, dt) {
      const S = api.state, alive = S.gunners.filter((m) => !m.dead);
      if (S.meter) S.meter.note = alive.length ? `${alive.length} gunner${alive.length > 1 ? 's' : ''} at her guns` : 'her guns are silent';
      if (!alive.length) { if (S.meter) { S.meter.hide(); S.meter = null; } return; }
      if ((S.volleyT -= dt) > 0 || api.run.phase === 'victory') return;
      S.volleyT = 8.5;
      // a broadside: a ring where each live gun's shot will land, then the shot
      const pl = api.p();
      alive.forEach((g, i) => {
        const to = i === 0 && pl ? api.near(pl.x + rand2(-1.2, 1.2), pl.y + rand2(-1.2, 1.2)) : api.near(api.OX + rand2(-5, 5), api.OY + rand2(-9, 12));
        api.telegraph(to[0], to[1], 1.5, 1.4, '#ff7040');
        api.later(0.15 * i, () => api.cannon([g.x, g.y, api.lvAt(g.x, g.y) + 6], [to[0], to[1], api.lvAt(to[0], to[1])], () => {
          api.blast(to[0], to[1], 1.5, api.base.dmg * 1.6, true); if (S.meter) S.meter.add(0.07);
        }, 1.3));
      });
      api.floatText(alive[0].x, alive[0].y, 80, 'FIRE!', '#ffb070', 16);
    },
    objective(api) {   // the plank is ours: auto-play goes over to her helm
      return api.run.phase === 'final' && api.run.capM && !api.run.capM.dead ? { x: api.run.capM.x, y: api.run.capM.y, reach: 1.5 } : null;
    },
  },
};
const rand2 = (a, b) => a + Math.random() * (b - a);
