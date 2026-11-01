// THE PIRATE SEAS in three.js (docs/PIRATE_SEAS.md): the open sea (tools/sea3d.js, Bellmourn's water), the Dawnwake
// (tools/seaship3d_dawnwake.js) and the Black Tide's longboats and harpoon cutters (tools/seaship3d_small.js), drawn
// live behind the 2D sprites each frame with the game's own camera (orthographic, 30 degrees down, 45 round; one unit
// = one tile, so tile (x, y) at height h lands where isoX/isoY put it). Like the caverns (gfx/cave3d.js): the view
// renders at one pixel per world px (less on touch, capped and stepped while a cut scene zooms) and is scaled up
// without smoothing. The Dawnwake sits level at (OX, 0, OY) (sprites stand on her deck); the boats ride the swell.
// Boarders still aboard a boat are 3D sprites of their painted art (the hull and the gunwales hide them as they
// should); once they leap they are the game's monsters. No shadow maps; a pool of point lights follows the hero.
import { G } from '../state.js';
import { camera, HW, HH } from '../core/view.js';
import { enemyImage } from '../core/enemyart.js';
import { OX, OY, WL, LV } from '../world/seaship.js';

const SC = HW * Math.SQRT2, VZ = LV * 4;   // world px a tile across the screen; a unit of height (LV levels of 4 px: 39.19)
let T = null, SEA = null, DAWN = null, SMALL = null, KIT = null, M = null;
let R = null;          // the renderer and its camera
let S = null;          // the scene being played
const TEX = 'assets/source/airship/textures/';

/** three.js, the sea, the Dawnwake and the boats' modules and the airship pack's materials. Rejects if any fails. */
export async function loadSea3D() {
  if (M) return;
  const [t, sea, kit, dawn, small] = await Promise.all([import('three'), import('../../tools/sea3d.js'), import('../../tools/seaship3d.js'), import('../../tools/seaship3d_dawnwake.js'), import('../../tools/seaship3d_small.js')]);
  const mats = await kit.seaMaterials(TEX);
  small.smallMaterials(mats);   // the Black Tide's flag (M.jollyRoger) for every pirate hull, the brig's ensign too
  T = t; SEA = sea; KIT = kit; DAWN = dawn; SMALL = small; M = mats;
  MODS['seaship3d_dawnwake'] = dawn; MODS['seaship3d_small'] = small;
}
export const sea3dReady = () => !!M;

// ------------------------------------------------------------------ the fleet (docs/PIRATE_SEAS.md)
/**
 * Every model a scenario can bring: [module in tools/, builder, its arguments, { air: height it flies at }]. Modules
 * load on first use (loadFleet, before the level is built); spawnShip then builds synchronously.
 */
export const FLEET = {
  dawnwake: ['seaship3d_dawnwake', 'buildDawnwake'],
  longboat: ['seaship3d_small', 'buildLongboat'], cutter: ['seaship3d_small', 'buildSeaCutter'],
  brig: ['seaship3d_brig', 'buildBrig'], hulk: ['seaship3d_brig', 'buildBrig', [{ hulk: true }]], grappler: ['seaship3d_brig', 'buildGrappler'],
  galleon: ['seaship3d_galleon', 'buildSeaGalleon'], dreadnought: ['seaship3d_dreadnought', 'buildDreadnought'], carrier: ['seaship3d_carrier', 'buildCarrier'],
  kestrel: ['seaship3d_jets', 'buildJet', ['kestrel'], { air: 6 }], thunderhawk: ['seaship3d_jets', 'buildJet', ['thunderhawk'], { air: 7 }],
  lightship: ['seaship3d_lightship', 'buildLightship'], tender: ['seaship3d_tender', 'buildTender'],
  mine: ['seaship3d_props', 'buildProp', ['mine']], flotsam: ['seaship3d_props', 'buildProp', ['flotsam']], buoy: ['seaship3d_props', 'buildProp', ['buoy']],
  keg: ['seaship3d_props', 'buildProp', ['keg']], torpedo: ['seaship3d_props', 'buildProp', ['torpedo']], wreck: ['seaship3d_props', 'buildProp', ['wreck']],
  reef: ['seaship3d_props', 'buildProp', ['reef']],
  airgalleon: ['airship3d', 'buildAirship', [], { air: 14 }], ironclad: ['airship3d_ironclad', 'buildIronclad', [], { air: 14 }],
  gasbag: ['airship3d_skiffs', 'buildSkiff', ['gasbag', 1], { air: 10 }], aircutter: ['airship3d_skiffs', 'buildSkiff', ['cutter', 1], { air: 9 }],
  hauler: ['airship3d_skiffs', 'buildSkiff', ['hauler', 1], { air: 10 }],
};
const MODS = {};
const MOD_URL = { seaship3d_dawnwake: '../../tools/seaship3d_dawnwake.js', seaship3d_small: '../../tools/seaship3d_small.js', seaship3d_brig: '../../tools/seaship3d_brig.js',
  seaship3d_galleon: '../../tools/seaship3d_galleon.js', seaship3d_dreadnought: '../../tools/seaship3d_dreadnought.js', seaship3d_carrier: '../../tools/seaship3d_carrier.js',
  seaship3d_jets: '../../tools/seaship3d_jets.js', seaship3d_lightship: '../../tools/seaship3d_lightship.js', seaship3d_tender: '../../tools/seaship3d_tender.js',
  seaship3d_props: '../../tools/seaship3d_props.js', airship3d: '../../tools/airship3d.js', airship3d_ironclad: '../../tools/airship3d_ironclad.js', airship3d_skiffs: '../../tools/airship3d_skiffs.js' };
/** Load the model modules these kinds need (a scenario's `fleet`, before buildDungeon). */
export async function loadFleet(kinds = []) {
  await loadSea3D();
  const files = [...new Set(kinds.map((k) => FLEET[k] && FLEET[k][0]).filter((f) => f && !MODS[f]))];
  await Promise.all(files.map(async (f) => { MODS[f] = await import(MOD_URL[f]); }));
}
export const fleetReady = (kind) => !!(FLEET[kind] && MODS[FLEET[kind][0]]);

function renderer() {
  if (R) return R;
  const gl = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  gl.setPixelRatio(1);
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 1, 1600);
  const e = Math.PI / 6, a = Math.PI / 4;
  cam.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(800);
  cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  R = { gl, cam, w: 0, h: 0, dir: cam.position.clone().normalize() };
  return R;
}

// ------------------------------------------------------------------ the weathers' light (tools/seaships3d.html)
const SKY = { day: [0x3a6eb8, 0x9cc8ee], storm: [0x2a333c, 0x6a7680], night: [0x05080f, 0x1a2a48], sunset: [0x3a3a7a, 0xf0a070], fog: [0x9aa8b0, 0xc6d0d4], blood: [0x2a0a12, 0xc06048] };
const LIGHT = { day: [1.25, 0xfff1dc, 0.5], storm: [0.55, 0xc8d4e0, 0.45], night: [0.25, 0x8aa0ff, 0.3], sunset: [1.0, 0xffb080, 0.45], fog: [0.75, 0xe8eef0, 0.62], blood: [0.95, 0xff9a78, 0.42] };
/** The 3D sprites' tint per weather (they are unlit): the painted crew in the boats match the 2D ones on the deck. */
const CREW_TINT = { day: 0xffffff, storm: 0xc8d0d8, night: 0x8090b8, sunset: 0xffd8c0, fog: 0xe0e6ea, blood: 0xffc8b8 };

let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#fff8'); g.addColorStop(1, '#fff0');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  haloTex = new T.CanvasTexture(c); haloTex.colorSpace = T.SRGBColorSpace;
  return haloTex;
}
// ------------------------------------------------------------------ the rig at the game's zoom
// Everything of the Dawnwake above her lower masts (yards, tops, topmasts, the rigging's upper runs) dissolves in an
// ordered dither (opaque pixels or none, so nothing sorts wrong) while the hero fights, and comes back for a cut
// scene's wide shots. Kept solid: the bell tower (forward of its front), the funnel, and the foretop Pip stands in.
const BAYER = `float rigB2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float rigB4(vec2 a) { return rigB2(0.5 * a) * 0.25 + rigB2(a); }`;
function rigMaterial(m, U) {
  const c = m.clone(), prev = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  c.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vRigW;' + String.fromCharCode(10) + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + String.fromCharCode(10) + 'vRigW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vRigW; uniform float uRigY, uRigA, uRigZ0; uniform vec2 uRigFun, uRigTop;
${BAYER}
` + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  { float rk = smoothstep(uRigY, uRigY + 0.8, vRigW.y);
    if (vRigW.z < uRigZ0 || length(vRigW.xz - uRigFun) < 1.6 || (length(vRigW.xz - uRigTop) < 1.35 && vRigW.y < 8.75)) rk = 0.0;
    float cov = mix(1.0, uRigA, rk);
    if (cov < 0.999 && rigB4(gl_FragCoord.xy) >= cov) discard; }`);
  };
  c.customProgramCacheKey = () => 'searig' + prev;
  return c;
}
function addGlows(S, root, list, out) {
  for (const gl of list || []) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: halo(), color: gl.c, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.set(gl.x, gl.y, gl.z); s.scale.setScalar(gl.r); s.renderOrder = 3; s.userData.big = gl.r > 2.8; root.add(s); out.push(s);
    if (gl.light || gl.r >= 2.2) S.lightSrc.push({ o: root, p: new T.Vector3(gl.x, gl.y + 0.4, gl.z), c: gl.c, r: gl.lr || 7, i: gl.light ? 1.2 : 0.8, w: new T.Vector3() });
  }
}

// ------------------------------------------------------------------ build
/**
 * The scene for one battle: weather (a SEAS key), its sea, the Dawnwake at (OX, 0, OY) in her fighting sail. Returns
 * the scene; boats are added with seaBoat(). Synchronous once loadSea3D has run.
 */
export function buildSea3D(o = {}) {
  disposeSea3D();
  const rd = renderer(), weather = SEA.SEAS[o.weather] ? o.weather : 'day', few = G.touch;
  const scene = new T.Scene();
  const [k, c, h] = LIGHT[weather] || LIGHT.day, [s0, s1] = SKY[weather] || SKY.day;
  const hemi = new T.HemisphereLight(0xd4e6ff, 0x2a4a6a, h * Math.PI), amb = new T.AmbientLight(0xffffff, 0.25 * Math.PI), sun = new T.DirectionalLight(c, k * Math.PI);
  scene.add(hemi, amb, sun, sun.target);
  // the sun from the upper left, a little in front (camera space), as in the 3D tools
  const d = new T.Vector3(-0.6, 0.85, 0.5).normalize().transformDirection(rd.cam.matrixWorld);
  sun.target.position.set(OX, 0, OY); sun.position.copy(d).multiplyScalar(180).add(sun.target.position);
  const sea = SEA.buildSea(scene, { size: 320, seg: few ? 120 : 190, level: WL, weather, low: few });
  // she is under way: the water streams astern past her (the swell keeps its own heading)
  sea.U.wCurrent.value.set(0.12, 1.25);
  S = { scene, sea, weather, hemi, amb, sun, t: 0, boats: [], rigSets: [], planks: [], glows: [], lightSrc: [], pool: [], ropes: [], fx: [], tex: new Map(), sky: [new T.Color(s0), new T.Color(s1)],
    crewTint: new T.Color(CREW_TINT[weather] || 0xffffff), fogK: weather === 'fog' ? 1 : 0 };
  if (S.fogK) scene.fog = new T.Fog(0xc6d0d4, 50, 200);
  else if (weather === 'storm' || weather === 'blood') scene.fog = new T.Fog(s1, 50, 200);   // a haze on the far water
  // the Dawnwake, level, her courses brailed up and every sail over the deck faded so the deck being fought on reads
  const dw = DAWN.buildDawnwake(M), root = new T.Group();
  root.position.set(OX, 0, OY); root.add(dw.root); scene.add(root);
  dw.root.traverse((m) => { if ((m.isSprite || m.isPoints) && m.renderOrder < 3) m.renderOrder = 3; });
  const sails = [];
  dw.root.traverse((m) => { if (m.isMesh && (m.name === 'sail' || m.name === 'trisail')) sails.push({ mesh: m }); });
  KIT.fightingSail(sails, { alpha: 0.5 });
  for (const s of sails) s.mesh.renderOrder = 6;
  const rig = [], RIG = { uRigY: { value: 7.2 }, uRigA: { value: 1 }, uRigZ0: { value: OY - 13.2 }, uRigFun: { value: new T.Vector2(OX, OY - 1.2) }, uRigTop: { value: new T.Vector2(OX, OY - 6.4) } };
  const own = new Map();
  dw.root.traverse((m) => {
    if (m.isLineSegments) { m.material = m.material.clone(); m.material.transparent = true; rig.push(m.material); return; }
    if (!m.isMesh || sails.some((s) => s.mesh === m) || !m.material || Array.isArray(m.material) || m.material.isShaderMaterial) return;
    if (!own.has(m.material)) own.set(m.material, rigMaterial(m.material, RIG));   // her own copies: the boats share the pack's
    m.material = own.get(m.material);
  });
  addGlows(S, dw.root, dw.info.glow, S.glows);
  // the portal in the bell tower's great door: green while she sails (sealed), the exit's colour once the battle is won
  dw.root.traverse((m) => {
    if (m.name !== 'portal' || !m.material || !m.material.isShaderMaterial) return;
    const mt = m.material;
    Object.assign(mt.uniforms, { uTint: { value: new T.Color(0x40a0ff) }, uTintK: { value: 0 }, uBright: { value: 0.55 } });
    mt.fragmentShader = 'uniform vec3 uTint; uniform float uTintK, uBright;\n' + mt.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);',
      'col = mix(col, uTint * (0.35 + 1.25 * dot(col, vec3(0.3, 0.59, 0.11))), uTintK) * uBright; gl_FragColor = vec4(col, 1.0);');
    mt.needsUpdate = true; S.portal = mt;
  });
  dw.root.traverse((m) => { if (m.isPointLight) S.portalLight = m; });
  S.dawn = { ship: dw, root, sails: sails.map((s) => s.mesh.material), rig, sailA: 0.5, RIG };
  for (let i = 0; i < (few ? 4 : 7); i++) { const L = new T.PointLight(0xffffff, 0, 8, 1.5); scene.add(L); S.pool.push(L); }
  return S;
}

/** Her sails and rigging: nearly solid in a cut scene's wide shots, faded at the game's zoom so the deck reads (k 0..1). */
export function seaSails(k) {
  if (!S) return;
  const a = 0.1 + 0.84 * k;
  if (Math.abs(a - S.dawn.sailA) < 0.01) return;
  S.dawn.sailA = a;
  for (const m of S.dawn.sails) m.opacity = a;
  for (const m of S.dawn.rig) m.opacity = 0.14 + 0.86 * k;
  S.dawn.RIG.uRigA.value = k > 0.6 ? 1 : 0.1;   // all or a ghost: a half dither reads as a checkerboard
  fadeRigs(k);
}
/** The exit colour on the bell tower's portal (k 0..1 from the sealed green), its brightness, a flash. */
/** Her sails and rig, and every arena deck's (spawnShip deck: true): k 0..1 (the game's zoom .. a wide shot). */
function fadeRigs(k) {
  for (const r of S.rigSets) {
    for (const m of r.sails) { if (!m.transparent) { m.transparent = true; m.depthWrite = false; m.needsUpdate = true; } m.opacity = (r.sailOp ?? 1) * (0.1 + 0.9 * k); }
    r.U.uRigA.value = k > 0.6 ? 1 : 0.1;
  }
}
export function seaPortal(k, bright = 1, flash = false) {
  if (!S || !S.portal) return;
  S.portal.uniforms.uTintK.value = k; S.portal.uniforms.uBright.value = bright;
  if (S.portalLight) S.portalLight.color.setHex(k > 0.5 ? 0x60b0ff : 0x7dffa0);
  if (flash) S.dawn.ship.arrive();
}

// ------------------------------------------------------------------ boats
const crewTex = (art, swap) => {
  const key = art + '|' + JSON.stringify(swap || null);
  if (S.tex.has(key)) return S.tex.get(key);
  const img = enemyImage(art, swap);
  if (!img) return null;
  const t = new T.CanvasTexture(img); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.LinearFilter;
  t.userData = { fx: img._art ? img._art.fx / img.width : 0.5, ar: img.width / img.height };
  S.tex.set(key, t);
  return t;
};
/**
 * Any ship or prop of the fleet on the sea (FLEET kinds; its module loaded by loadFleet). The game places it (place:
 * tile position, heading 0 = bow toward -Z like the Dawnwake, speed for its wake and oars); by default it rides the
 * swell. opts:
 *   deck: true      an arena deck: held level at its waterline (or opts.y, ship units over the Dawnwake's main deck),
 *                   not riding, its rig and sails fading at the game's zoom like hers (its walk map: bakeDeck)
 *   air: h          flies h units over the sea (the jets and the Air Pirates' ships do by default), bobbing
 *   fight: k        a ship with setFightingSail: courses brailed, sails faded (0 full sail .. 1)
 *   at: [x, y], heading, speed
 * The handle: place, setAlpha, addCrew/dropCrew (crew records drawn as sprites of their art until they leap),
 * worldOf(x, y, z) -> [tile x, tile y, level], lv (its deck's level now), info (crew spots, plank, idol, lamps... as the
 * model gives them), ship (the builder's own: setPlank, setRamp, setFightingSail, anim), mastTop, remove().
 */
export function spawnShip(kind, opts = {}) {
  if (!S) return null;
  const F = FLEET[kind], mod = F && MODS[F[0]];
  if (!mod) { console.warn(`seabattle3d: ${kind} isn't loaded (loadFleet)`); if (F) void loadFleet([kind]); return null; }
  const ship = mod[F[1]](M, ...(F[2] || []));
  ship.info ||= {}; ship.info.waterline ??= 0;
  const air = opts.air ?? (F[3] && F[3].air);
  if (opts.fight != null) ship.setFightingSail?.(opts.fight);
  ship.root.traverse((m) => { if (m.isMesh && (m.name === 'ensign' || m.name === 'flag') && kind !== 'dawnwake' && !air) m.material = M.jollyRoger; });   // the Tide's flag
  const outer = new T.Group(), mats = new Map(), deck = !!opts.deck;
  outer.add(ship.root); S.scene.add(outer);
  const sails = [], RIG = deck ? { uRigY: { value: 4.6 }, uRigA: { value: 1 }, uRigZ0: { value: -1e9 }, uRigFun: { value: new T.Vector2(1e9, 1e9) }, uRigTop: { value: new T.Vector2(1e9, 1e9) } } : null;
  ship.root.traverse((m) => {
    if ((m.isSprite || m.isPoints) && m.renderOrder < 3) m.renderOrder = 3;
    if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
    const sail = /sail/.test(m.name);
    if (!mats.has(m.material)) mats.set(m.material, deck && !sail && !m.material.isShaderMaterial ? rigMaterial(m.material, RIG) : m.material.clone());   // its own, so it can fade
    m.material = mats.get(m.material);
    if (sail) sails.push(m.material);
    if (m.renderOrder < 2) m.renderOrder = 2;   // while it fades it blends over the sea (renderOrder 1), not the clear colour
  });
  if (deck) S.rigSets.push({ sails, U: RIG, sailOp: sails[0] ? sails[0].opacity : 1, kind });
  const glows = [];
  addGlows(S, ship.root, ship.info.glow, glows);
  // the masthead (a rope's anchor for a captain's swing): the top of her sails
  const bb = new T.Box3();
  ship.root.updateMatrixWorld(true);
  ship.root.traverse((m) => { if (m.isMesh && /sail/.test(m.name)) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix)); } });
  const info = ship.info, hb = (info.beam || 4) / 2;
  const b = {
    kind, ship, root: outer, info, x: OX - 30, y: OY + 40, heading: opts.heading || 0, speed: opts.speed ?? 0.6, alpha: 1, row: 1, at: Math.random() * 10, crew: [], dead: false, lines: [],
    hb, wl: info.waterline || 0, deck, air, deckY: opts.y ?? (deck ? WL - (info.waterline || 0) : 0), RIG,
    mastTop: bb.isEmpty() ? [0, 5, -1] : [(bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2],
    place(x, y, heading = this.heading, speed = this.speed) { this.x = x; this.y = y; this.heading = heading; this.speed = speed; },
    setAlpha(a) {
      a = Math.max(0, Math.min(1, a));
      if (Math.abs(a - this.alpha) < 0.004) return;
      const tr = a < 0.999;
      for (const m of mats.values()) { const b0 = m.userData.base ||= { op: m.opacity, tr: m.transparent }, t2 = b0.tr || tr; if (m.transparent !== t2) { m.transparent = t2; m.needsUpdate = true; } m.opacity = b0.op * a; }
      for (const c of this.crew) if (c.spr) c.spr.material.opacity = a;
      for (const g of glows) g.material.opacity = a * 0.6;
      this.alpha = a; outer.visible = a > 0.01;
    },
    /** A crew record aboard: a sprite of its art standing at (x, y, z) on the boat. */
    addCrew(rec) { this.crew.push(rec); rec.boat = this; return rec; },
    dropCrew(rec) {
      const i = this.crew.indexOf(rec); if (i >= 0) this.crew.splice(i, 1);
      if (rec.spr) { ship.root.remove(rec.spr); rec.spr.material.dispose(); rec.spr = null; }
    },
    /** Where a crew record (or a ship-local point) stands in the game: [tile x, tile y, level]. */
    worldOf(x, y, z) { const v = new T.Vector3(x, y, z); ship.root.localToWorld(v); return [v.x, v.z, v.y * LV]; },
    /** The deck's level now (it rides the swell). */
    get lv() { return (outer.position.y + ship.root.position.y) * LV; },
    /** The walk map of its decks (bakeDeck) and the tiles it covers. */
    bake(o) { return bakeDeck(this, o); },
    remove() {
      this.dead = true; S.scene.remove(outer);
      for (const c of this.crew.slice()) this.dropCrew(c);
      for (const l of this.lines) l.remove();
      for (const m of mats.values()) m.dispose();
      for (const g of glows) g.material.dispose();
      S.lightSrc = S.lightSrc.filter((l) => l.o !== ship.root);
      S.rigSets = S.rigSets.filter((r) => r.U !== RIG);
      const i = S.boats.indexOf(this); if (i >= 0) S.boats.splice(i, 1);
    },
  };
  if (opts.at) b.place(opts.at[0], opts.at[1]);
  S.boats.push(b);
  tickShip(b, 0, S.t);
  return b;
}
/** The Black Tide's boarding boats (the director's waves): a longboat or a cutter riding the swell. */
export const seaBoat = (kind) => spawnShip(kind);
/**
 * Where a ship of half beam hb and half length hl lies, relative to the Dawnwake (tile x, tile y of its origin):
 * 'port' (lying off, her boarders' berths), 'alongside' (gap tiles off her port side at z), 'starboard', 'astern' (off
 * her port quarter), 'far' (out on the port bow, a sail on the horizon).
 */
export function berth(info, where = 'port', z = 0, gap = 2) {
  const hb = (info.beam || 4) / 2, hl = info.hl || (info.length || 10) / 2;
  if (where === 'alongside') return [OX - 6.2 - gap - hb, OY + z];
  if (where === 'starboard') return [OX + 6.2 + gap + hb, OY + z];
  if (where === 'astern') return [OX - 7.6 - hb, OY + 21 + hl];
  if (where === 'far') return [OX - 34 - hb, OY - 30 + z];
  return [OX - 10.7 - hb, OY + z];
}
function tickShip(b, dt, t) {
  const sr = b.ship.root;
  b.root.position.set(b.x, 0, b.y); b.root.rotation.y = b.heading;
  if (b.deck) sr.position.y = b.deckY;   // an arena deck: level, held at its waterline
  else if (b.air != null) { sr.position.y = b.air + Math.sin(t * 0.7 + b.at) * 0.3; sr.rotation.z = Math.sin(t * 0.5 + b.at) * 0.02; }
  else {
    const r = S.sea.ride(b.x, b.y, b.heading, b.info.hl || 4, b.info.hb || 2, t), big = Math.min(1, 14 / (b.info.hl || 4));
    sr.position.y = r.y - b.wl;
    sr.rotation.x = -r.pitch * (0.4 + 0.6 * big); sr.rotation.z = r.roll * (0.35 + 0.65 * big) + (b.info.list || 0);
  }
  // oars pull while she makes way, and lie still alongside
  b.at += dt * Math.min(1, b.row);
  b.ship.anim?.(b.at, dt * Math.min(1, b.row));
  for (const c of b.crew) {
    if (c.spr) continue;
    const tx = crewTex(c.art, c.swap); if (!tx) continue;
    const s = new T.Sprite(new T.SpriteMaterial({ map: tx, alphaTest: 0.4, transparent: true, color: S.crewTint, opacity: b.alpha, fog: true }));
    const h = (c.h || 56) / SC;
    s.center.set(c.flip ? 1 - tx.userData.fx : tx.userData.fx, 0.02); s.scale.set(h * tx.userData.ar * (c.flip ? -1 : 1), h, 1);
    s.position.set(c.x, c.y + 0.02, c.z); s.renderOrder = 2;
    sr.add(s); c.spr = s;
  }
  for (const c of b.crew) if (c.spr) c.spr.position.y = c.y + 0.02 + (c.bob ? Math.abs(Math.sin(t * 5 + c.ph)) * 0.05 : 0);
}

// ------------------------------------------------------------------ arena decks: the walk map baked from the model
const BAKE_V = `varying float vY;
void main() {
  #include <begin_vertex>
  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  #endif
  wp = modelMatrix * wp; vY = wp.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const BAKE_F = `uniform float uCap, uLo, uHi; varying float vY;
void main() { if (vY > uCap) discard; float v = clamp((vY - uLo) / (uHi - uLo), 0.0, 1.0) * 255.0; gl_FragColor = vec4(floor(v) / 255.0, fract(v), 0.0, 1.0); }`;
/**
 * A ship's decks seen from straight above, res px a tile: per tile (world tiles x0.., z0..) the median, lowest and
 * highest top below `cap` (ship units over the Dawnwake's main deck; the deck's own height + 4.5 by default, so yards
 * and tops don't roof it), how much of it is covered, and the uncapped top (masts, deckhouses: the sprite masks).
 * Sails, flags, lines, sprites and glass don't count. world/seaship.js applyDeck turns it into the walk map.
 */
export function bakeDeck(h, { cap = null, res = 4, pad = 1 } = {}) {
  const rd = renderer(), root = h.root;
  tickShip(h, 0, S.t);
  root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(root);
  const x0 = Math.floor(box.min.x) - pad, x1 = Math.ceil(box.max.x) + pad, z0 = Math.floor(box.min.z) - pad, z1 = Math.ceil(box.max.z) + pad;
  const w = x1 - x0, hh = z1 - z0, W = w * res, H = hh * res, lo = -8, hi = 40;
  const hidden = [];
  root.traverse((o) => {
    const skip = o.isSprite || o.isPoints || o.isLine || (o.isMesh && (/sail|flag|pennant|ensign|banner|smoke|plume|spray|glass|halo/i.test(o.name) || (o.material && o.material.transparent && o.material.opacity < 0.6)));
    if (skip && o.visible) { o.visible = false; hidden.push(o); }
  });
  const mat = new T.ShaderMaterial({ uniforms: { uCap: { value: cap ?? h.deckY + 4.5 }, uLo: { value: lo }, uHi: { value: hi } }, vertexShader: BAKE_V, fragmentShader: BAKE_F, side: T.DoubleSide });
  const scene = new T.Scene(); scene.overrideMaterial = mat;
  const parent = root.parent; scene.add(root);
  const cam = new T.OrthographicCamera(x0, x1, -z0, -z1, 1, 1000);
  cam.position.set(0, 500, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  const rt = new T.WebGLRenderTarget(W, H), buf = new Uint8Array(W * H * 4);
  const read = (capV) => {
    mat.uniforms.uCap.value = capV;
    rd.gl.setRenderTarget(rt); rd.gl.setClearColor(0x000000, 0); rd.gl.clear(); rd.gl.render(scene, cam);
    rd.gl.readRenderTargetPixels(rt, 0, 0, W, H, buf); rd.gl.setRenderTarget(null);
    const out = Array.from({ length: w * hh }, () => []);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const k = (r * W + c) * 4; if (!buf[k + 3]) continue;
      const tz = Math.floor((H - 1 - r) / res), tx = Math.floor(c / res);   // row 0 of the read is the bottom (z1)
      out[tz * w + tx].push(lo + (buf[k] + buf[k + 1] / 255) / 255 * (hi - lo));
    }
    return out;
  };
  const capped = read(cap ?? h.deckY + 4.5), full = read(1e4);
  parent.add(root); for (const o of hidden) o.visible = true;
  rt.dispose(); mat.dispose();
  const N = w * hh, B = { x0, z0, w, h: hh, med: new Float32Array(N), lo: new Float32Array(N), hi: new Float32Array(N), p20: new Float32Array(N), p80: new Float32Array(N), top: new Float32Array(N), cover: new Float32Array(N) };
  for (let k = 0; k < N; k++) {
    const a = capped[k].sort((p, q) => p - q), f = full[k];
    B.cover[k] = a.length / (res * res);
    if (!a.length) continue;
    B.med[k] = a[a.length >> 1]; B.lo[k] = a[0]; B.hi[k] = a[a.length - 1]; B.p20[k] = a[Math.floor(a.length * 0.2)]; B.p80[k] = a[Math.floor(a.length * 0.8)]; B.top[k] = f.length ? Math.max(...f) : a[a.length - 1];
  }
  return B;
}
/** A plank between two decks: from a to b, [tile x, tile y, height in ship units], w wide; remove() takes it up. */
export function seaPlank(a, b, w = 1.1) {
  if (!S) return null;
  const A = new T.Vector3(a[0], a[2], a[1]), B = new T.Vector3(b[0], b[2], b[1]), len = A.distanceTo(B);
  const g = new T.BoxGeometry(w, 0.12, len), mesh = new T.Mesh(g, M.deck || M.cedar || Object.values(M).find((m) => m && m.isMaterial));
  mesh.position.copy(A).add(B).multiplyScalar(0.5); mesh.lookAt(B); mesh.renderOrder = 2;
  const rails = [-1, 1].map((sd) => { const r = new T.Mesh(new T.BoxGeometry(0.06, 0.06, len), M.rope || mesh.material); r.position.set(sd * w / 2, 0.55, 0); mesh.add(r); return r; });
  S.scene.add(mesh);
  const p = { mesh, remove() { S && S.scene.remove(mesh); g.dispose(); for (const r of rails) r.geometry.dispose(); if (S) S.planks = S.planks.filter((q) => q !== p); } };
  S.planks.push(p);
  return p;
}

/** A rope from a to b (tile x, tile y, level), e.g. a boat's grapnel line to the rail; set() moves its ends. */
export function seaRope(a, b, color = 0x3a2a1a) {
  if (!S) return null;
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(24 * 3), 3));
  const line = new T.Line(g, new T.LineBasicMaterial({ color }));
  line.frustumCulled = false; line.renderOrder = 2; S.scene.add(line);
  const r = {
    a, b, sag: 0.6,
    set(a2, b2) { this.a = a2; this.b = b2; const p = g.attributes.position.array;
      const len = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), sg = this.sag * Math.min(1.6, Math.max(0.3, len / 5));
      for (let i = 0; i < 24; i++) { const k = i / 23, s = Math.sin(Math.PI * k) * sg; p[i * 3] = a2[0] + (b2[0] - a2[0]) * k; p[i * 3 + 1] = (a2[2] + (b2[2] - a2[2]) * k) / LV - s; p[i * 3 + 2] = a2[1] + (b2[1] - a2[1]) * k; }
      g.attributes.position.needsUpdate = true; },
    remove() { S && S.scene.remove(line); g.dispose(); line.material.dispose(); if (S) S.ropes = S.ropes.filter((q) => q !== r); },
  };
  r.set(a, b); S.ropes.push(r);
  return r;
}
/** Water thrown up at tile (x, y): a splash ring (a body, a small shot) or a shot's tall column. */
export function seaSplash(x, y, k = 1, column = false) { if (S) (column ? S.sea.column(x, y, k) : S.sea.splash(x, y, k)); }
/** The sea's level under tile (x, y) now (levels). */
export const seaLevelAt = (x, y) => (S ? S.sea.heightAt(x, y) * LV : WL * LV);

// ------------------------------------------------------------------ each frame
/** Game time for the 3D: the sea runs, the ships animate, the boats ride, the lamps flicker. */
export function tickSea3D(dt) {
  if (!S) return;
  S.t += dt;
  const t = S.t, foam = [{ x: OX, z: OY + 0.4, heading: 0, hl: 19.7, hb: 6.1, speed: 0.55, wake: 70, spray: false }];
  S.dawn.ship.anim(t, dt);
  for (const b of S.boats.slice()) {
    tickShip(b, dt, t);
    if (b.alpha > 0.2 && b.air == null && b.info.hl) foam.push({ x: b.x, z: b.y, heading: b.heading, hl: b.info.hl, hb: b.info.hb, speed: b.speed, wake: b.info.hl * 3.2 });
  }
  S.sea.setShips(foam);
  S.glows.forEach((g, i) => { g.material.opacity = (g.userData.big ? 0.6 : 0.38) + 0.1 * Math.sin(t * 9 + i * 1.7); });
  const rd = renderer();
  S.sea.update(dt, t, { camera: rd.cam, height: rd.h || 720, sun: S.sun, hemi: S.hemi });
}

/** The world px of the screen's centre down to the sea: [tile x, tile y] (the sea's grid follows the view). */
const seaCentre = (cx, cy) => { const yy = cy + WL * VZ; return [(cx / HW + yy / HH) / 2, (yy / HH - cx / HW) / 2]; };
/**
 * Draw the sea, the ships and the boats behind the sprites. focus: the hero's [tile x, height (units), tile y] for the
 * light pool and the fog. One pixel per world px (0.75 on touch); while a cut scene zooms out the buffer is capped
 * and its size held to steps 12% apart, so it isn't reallocated every frame (the frustum follows the true zoom).
 */
export function drawSea3D(ctx, focus) {
  const W = G.W * G.dpr, H = G.H * G.dpr;
  if (!S) { ctx.fillStyle = '#0d2a40'; ctx.fillRect(0, 0, W, H); return; }
  const rd = renderer(), z = camera.zoom, q = G.touch ? 0.75 : 1;
  const zq = G.zoomFlux ? 2 ** (Math.round(Math.log2(z) * 6) / 6) : z;
  let pw = G.W / zq * q, ph = G.H / zq * q;
  const cap = G.touch ? 1.1e6 : 2.4e6, k = Math.min(1, Math.sqrt(cap / (pw * ph)));
  pw = Math.max(16, Math.round(pw * k)); ph = Math.max(16, Math.round(ph * k));
  if (rd.w !== pw || rd.h !== ph) { rd.gl.setSize(pw, ph, false); rd.w = pw; rd.h = ph; }
  const cx = camera.x + camera.shakeX, cy = camera.y + camera.shakeY, hw = G.W / 2 / z, hh = G.H / 2 / z, cam = rd.cam;
  cam.left = (cx - hw) / SC; cam.right = (cx + hw) / SC; cam.top = -(cy - hh) / SC; cam.bottom = -(cy + hh) / SC; cam.updateProjectionMatrix();
  const [sx, sz] = seaCentre(cx, cy); S.sea.follow(sx, sz);
  const [fx, fy, fz] = focus || [OX, 0, OY];
  if (S.scene.fog) {   // the haze thickens with distance beyond the hero (camera depth: the far water is up the screen)
    const d0 = 800 - (fx * rd.dir.x + fy * rd.dir.y + fz * rd.dir.z);
    S.scene.fog.near = d0 + (S.fogK ? 3 : 30); S.scene.fog.far = d0 + (S.fogK ? 42 : 140);
  }
  // the lamps nearest the hero get the point lights; the rest glow on their own
  const near = [];
  for (const l of S.lightSrc) {
    l.o.localToWorld(l.w.copy(l.p));
    const dd = (l.w.x - fx) ** 2 + (l.w.y - fy) ** 2 * 0.5 + (l.w.z - fz) ** 2;
    if (dd < 600) near.push([dd, l]);
  }
  near.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < S.pool.length; i++) {
    const L = S.pool[i], n = near[i];
    if (!n) { L.intensity = 0; continue; }
    const l = n[1], fl = 0.88 + 0.12 * Math.sin(S.t * 9 + i * 1.7) * Math.sin(S.t * 5.3 + i);
    L.position.copy(l.w); L.color.setHex(l.c); L.distance = l.r; L.intensity = 10 * l.i * fl;
  }
  rd.gl.setClearColor(S.sky[1], 1);
  rd.gl.render(S.scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rd.gl.domElement, 0, 0, W, H);
  ctx.imageSmoothingEnabled = sm;
}

export function disposeSea3D() {
  if (!S) return;
  for (const b of S.boats.slice()) b.remove();
  for (const r of S.ropes.slice()) r.remove();
  S.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  for (const t of S.tex.values()) t.dispose();
  S.sea.U.wTex.value.dispose();
  S = null;
  if (R) { R.w = R.h = 0; }
}
export const seaScene = () => S;
