// The battlefield in Velscour's iso tiles: each region dresses a map in one of the main game's floor/prop packs
// (assets/tiles/*), recoloured where a region needs it (Frostfang's ice, the Rift's blood). A map becomes a set of
// tile columns (top floor + cliff faces down to the next tile or the diorama's base), cached once per battle.
import { makeCanvas, RNG, shade, rgba } from '../core/util.js';
import { loadImage, loadAssetJSON } from '../core/assets.js';
import { K } from '../battle/map.js';

export const TW = 64, TH = 32, HW = 32, HH = 16, HZ = 15;   // tile size and world px per height level
export const isoX = (x, y) => (x - y) * HW;
export const isoY = (x, y, z = 0) => (x + y) * HH - z * HZ;

// pack: assets/tiles/<pack>; ground/path/pad: floor names; big/small: scatter (or town object) names
export const THEMES = {
  outskirts: { town: true, ground: ['grass', 'grass', 'dense_meadow', 'trampled_verge'], path: ['dirt', 'dirt', 'gravel'], pad: 'irregular_flagstone',
    big: ['t_ancient_oak', 't_crooked_oak', 't_mature_ash', 't_orchard_pear', 't_tall_elm', 't_medium_fir', 't_twin_birch'], small: ['moss_boulder', 'hay_bale', 'wildflowers', 'leafy_shrub', 'fieldstone_cluster', 'thorn_bush', 'mushrooms'],
    cliff: '#6b5840', water: '#2f6a8a', sky: ['#1a2a3a', '#0a1018'], ambient: 'firefly', amb: 'forest_night' },
  catacombs: { pack: 'catacombs', ground: ['charcoal_flagstone', 'ossuary_aggregate', 'crypt_limestone', 'grave_gravel'], path: ['weathered_cobbles', 'slate_bricks'], pad: 'mortuary_tesserae',
    big: ['effigy_sarcophagus', 'headless_angel', 'funerary_obelisk', 'torch_stand', 'iron_candelabrum', 'kneeling_mourner'], small: ['skull_pyramid', 'long_bone_heap', 'ossuary_urn', 'vigil_candles', 'burial_urn_cluster', 'offering_bowl'],
    cliff: '#4a4440', water: '#1c3a3a', sky: ['#14100e', '#050404'], ambient: 'dust', amb: 'cave' },
  cathedral: { pack: 'cathedral_graveyard', ground: ['grave_soil', 'dead_grass', 'moss_cobbles', 'grave_gravel'], path: ['nave_flagstone', 'limestone_squares'], pad: 'marble_checker',
    big: ['mourning_angel', 'celtic_cross', 'saint_statue', 'knight_chest_tomb', 'funerary_obelisk', 'confessional'], small: ['rounded_headstone', 'broken_headstone', 'squat_cross', 'votive_candles', 'grave_lantern', 'dry_wreath'],
    cliff: '#5a4c44', water: '#203038', sky: ['#2a1a14', '#0a0606'], ambient: 'ember', amb: 'inside_night' },
  frostfang: { pack: 'castle_keep', filter: 'saturate(0.35) brightness(1.3) hue-rotate(-12deg) contrast(0.95)', ground: ['pale_keep_limestone', 'bluegray_bastion_slate', 'ivory_chapel_marble', 'rough_battlement_block'], path: ['weathered_gatehouse_flag', 'charcoal_guardstone'], pad: 'royal_inlay_slab',
    big: ['knight_memorial', 'stone_gargoyle', 'carved_lion_statue', 'toppled_column'], small: ['cannonball_pile', 'cracked_tile_rubble', 'broken_lance', 'brazier_ash'],
    cliff: '#8aa2b6', water: '#7ab8d8', sky: ['#2a3a4a', '#0c141c'], ambient: 'snow', amb: 'forest_day_storm' },
  sand: { sand: true, ground: ['fine_dune_sand', 'rippled_amber_sand', 'pale_leeward_sand', 'wind_combed_sand', 'mica_sand'], path: ['ochre_hardpan', 'footprinted_sand'], pad: 'rose_quartz_gravel',
    big: ['scatter_01_palm_stump', 'scatter_03_bent_desert_palm', 'scatter_09_wind_carved_boulder', 'scatter_11_fossil_ribcage', 'scatter_12_giant_skull', 'scatter_04_thorn_acacia'], small: ['tree_04_saltbush', 'tree_06_spiny_aloe', 'tree_05_dry_reeds', 'tree_02_dwarf_palm'],
    cliff: '#b8864e', water: '#3a8ab0', sky: ['#5a3a20', '#1a0e06'], ambient: 'sand', amb: 'beach' },
  forest: { pack: 'dark_forest', trees: true, ground: ['black_loam', 'pine_needles', 'dead_leaves', 'damp_moss', 'dark_turf'], path: ['gravel_path', 'packed_mud'], pad: 'shale_chips',
    big: ['@trees'], small: ['moss_boulder', 'fern_clump', 'poison_mushrooms', 'pale_mushrooms', 'twisted_roots', 'stone_cairn', 'lantern_stake'],
    cliff: '#3e3428', water: '#1e3828', sky: ['#0e1a12', '#030604'], ambient: 'spore', amb: 'forest_night' },
  ironcrown: { pack: 'castle_keep', ground: ['pale_keep_limestone', 'bluegray_bastion_slate', 'mossline_foundation_stone', 'rough_battlement_block'], path: ['weathered_gatehouse_flag', 'crimson_armory_brick'], pad: 'royal_inlay_slab',
    big: ['royal_banner_stand', 'empty_suit_of_armor', 'keep_ballista', 'siege_cannon_wreck', 'knight_memorial', 'carved_lion_statue'], small: ['cannonball_pile', 'broken_lance', 'smashed_heraldic_shield', 'spear_bundle', 'armory_barrel'],
    cliff: '#6a6660', water: '#24485a', sky: ['#2a1c18', '#080606'], ambient: 'ember', amb: 'inside_day' },
  rift: { pack: 'cathedral_graveyard', filter: 'hue-rotate(-28deg) saturate(1.7) brightness(0.62) contrast(1.15)', ground: ['grave_soil', 'choir_slate', 'grave_gravel', 'dead_grass'], path: ['nave_flagstone', 'terracotta_nave'], pad: 'marble_checker',
    big: ['saint_statue', 'buttress_fragment', 'pipe_organ', 'funerary_obelisk', 'mourning_angel'], small: ['broken_urn', 'tracery_rubble', 'votive_candles', 'ivy_roots'],
    cliff: '#3a0e16', water: '#5a0a14', lava: true, sky: ['#2a0610', '#060104'], ambient: 'riftmote', amb: 'cave_storm' },
};

const atlases = new Map();
/** Load a theme's floor and prop atlases; returns { floors: name -> src, props: name -> src } (src = {img,x,y,w,h,ox,oy,k}). */
export async function loadTheme(id) {
  if (atlases.has(id)) return atlases.get(id);
  const T = THEMES[id], floors = {}, props = {};
  if (T.town) {
    const [j, ground, objects] = await Promise.all([loadAssetJSON('assets/tiles/town/town.json'), loadImage('assets/tiles/town/ground.webp'), loadImage('assets/tiles/town/objects.webp')]);
    for (const [n, [x, y]] of Object.entries(j.floors)) floors[n] = { img: ground, x, y, w: 160, h: 80 };
    for (const [n, [x, y, w, h, ox, oy]] of Object.entries(j.objects)) props[n] = { img: objects, x, y, w, h, ox, oy, k: 0.4 };
  } else if (T.sand) {
    const p = 'assets/tiles/sea_of_sand/', [j, fl, sc, tr] = await Promise.all([loadAssetJSON(p + 'pack.json'), loadImage(p + 'floor.webp'), loadImage(p + 'scatter.webp'), loadImage(p + 'tree.webp')]);
    for (const f of j.atlases.floor) floors[f.name] = { img: fl, x: f.x, y: f.y, w: f.w, h: f.h };
    for (const [list, img] of [[j.atlases.scatter, sc], [j.atlases.tree, tr]]) for (const s of list) props[s.name.replace(/^scatter_\d+_|^tree_\d+_/, (m) => m)] = { img, x: s.x, y: s.y, w: s.w, h: s.h, ox: -s.pivot[0], oy: -s.pivot[1], k: 0.42 };
  } else {
    const p = `assets/tiles/${T.pack}/`, [j, fl, sc] = await Promise.all([loadAssetJSON(p + 'pack.json'), loadImage(p + 'floors.webp'), loadImage(p + 'scatter.webp')]);
    for (const f of j.floors) floors[f.name] = { img: fl, x: f.x, y: f.y, w: f.w, h: f.h };
    for (const s of j.scatter) props[s.name] = { img: sc, x: s.x, y: s.y, w: s.w, h: s.h, ox: s.ox, oy: s.oy, k: 0.4 };
    if (T.trees) {
      const [tj, ti] = await Promise.all([loadAssetJSON(p + 'trees.json'), loadImage(p + 'trees.webp')]);
      T.big = [];
      for (const t of tj.trees) { props['tree:' + t.name] = { img: ti, x: t.x, y: t.y, w: t.w, h: t.h, ox: t.ox, oy: t.oy, k: 0.62 * (t.scale || 0.5) * 2 * 0.55 }; T.big.push('tree:' + t.name); }
    }
  }
  if (T.filter) { // recolour every floor/prop atlas once (Frostfang's ice, the Rift's blood)
    const done = new Map();
    const recolor = (img) => {
      if (done.has(img)) return done.get(img);
      const c = makeCanvas(img.width, img.height), x = c.getContext('2d');
      x.filter = T.filter; x.drawImage(img, 0, 0);
      done.set(img, c);
      return c;
    };
    for (const s of [...Object.values(floors), ...Object.values(props)]) s.img = recolor(s.img);
  }
  const r = { floors, props };
  atlases.set(id, r);
  return r;
}

// a rock face texture per cliff colour: strata, cracks and grit (generated once)
const rockCache = new Map();
function rockTexture(col, lava) {
  if (rockCache.has(col)) return rockCache.get(col);
  const c = makeCanvas(64, 64), x = c.getContext('2d'), rng = new RNG('rock:' + col);
  x.fillStyle = col; x.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 6 + rng.int(0, 5)) { x.fillStyle = rgba(shade(col, -0.35), 0.5); x.fillRect(0, y, 64, 1); x.fillStyle = rgba(shade(col, 0.18), 0.35); x.fillRect(0, y + 1, 64, 1); }
  for (let i = 0; i < 140; i++) { x.fillStyle = rgba(rng.chance(0.5) ? shade(col, 0.25) : shade(col, -0.4), rng.range(0.2, 0.6)); x.fillRect(rng.int(0, 63), rng.int(0, 63), rng.int(1, 3), rng.int(1, 2)); }
  for (let i = 0; i < 6; i++) {
    x.strokeStyle = lava ? 'rgba(255,90,40,0.75)' : rgba(shade(col, -0.55), 0.7); x.lineWidth = lava ? 1.4 : 1;
    x.beginPath(); let px = rng.int(0, 63), py = rng.int(0, 63); x.moveTo(px, py);
    for (let k = 0; k < 4; k++) { px += rng.int(-8, 8); py += rng.int(3, 9); x.lineTo(px, py); }
    x.stroke();
  }
  rockCache.set(col, c);
  return c;
}

const diamond = (x, cx, cy) => { x.beginPath(); x.moveTo(cx, cy - HH); x.lineTo(cx + HW, cy); x.lineTo(cx, cy + HH); x.lineTo(cx - HW, cy); x.closePath(); };

/**
 * The map dressed: { cols: [{x,y,key,img,ox,oy,occl}], props: [...], base, bounds } with every column a canvas whose
 * (ox,oy) is the offset of the tile's north vertex at its height. occl: a column taller than a tile behind it
 * (drawn again over sprites behind it).
 */
export function dressMap(map, themeId, tex) {
  const T = THEMES[themeId], rng = new RNG('dress:' + map.n), cols = [], props = [];
  const minH = Math.min(...map.hgt), base = minH - 2;
  const pickFloor = (list, x, y) => { const n = list[(x * 7 + y * 13 + (rng.next() * 3 | 0)) % list.length]; return tex.floors[n] || Object.values(tex.floors)[0]; };
  const rock = rockTexture(T.cliff, T.lava);
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const i = map.I(x, y), k = map.kind[i], h = map.hgt[i], water = k === K.WATER;
    const top = water ? h - 0.35 : h;
    // faces drop to the neighbour in front (+x: SE face, +y: SW face) or, at the edge, to the diorama's base
    const se = x + 1 < map.w ? Math.max(0, top - (map.kind[map.I(x + 1, y)] === K.WATER ? map.hgt[map.I(x + 1, y)] - 0.35 : map.hgt[map.I(x + 1, y)])) : top - base;
    const sw = y + 1 < map.h ? Math.max(0, top - (map.kind[map.I(x, y + 1)] === K.WATER ? map.hgt[map.I(x, y + 1)] - 0.35 : map.hgt[map.I(x, y + 1)])) : top - base;
    const depth = Math.max(se, sw) * HZ, cw = TW + 2, chh = TH + depth + 2;
    const c = makeCanvas(cw, chh), g = c.getContext('2d'), cx = HW + 1, cy = HH + 1;
    // cliff faces
    for (const [face, d] of [['sw', sw], ['se', se]]) {
      if (d <= 0) continue;
      const dz = d * HZ;
      g.save();
      g.beginPath();
      if (face === 'sw') { g.moveTo(cx - HW, cy); g.lineTo(cx, cy + HH); g.lineTo(cx, cy + HH + dz); g.lineTo(cx - HW, cy + dz); }
      else { g.moveTo(cx, cy + HH); g.lineTo(cx + HW, cy); g.lineTo(cx + HW, cy + dz); g.lineTo(cx, cy + HH + dz); }
      g.closePath(); g.clip();
      g.setTransform(1, face === 'sw' ? 0.5 : -0.5, 0, 1, 0, 0);
      g.fillStyle = g.createPattern(rock, 'repeat'); g.fillRect(-10, -40, 120, chh + 80);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const gr = g.createLinearGradient(0, cy, 0, cy + HH + dz);
      gr.addColorStop(0, face === 'sw' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)');
      g.fillStyle = gr; g.fillRect(0, 0, cw, chh);
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
      g.beginPath();
      if (face === 'sw') { g.moveTo(cx - HW, cy); g.lineTo(cx - HW, cy + dz); } else { g.moveTo(cx + HW, cy); g.lineTo(cx + HW, cy + dz); }
      g.stroke();
    }
    // the top
    g.save(); diamond(g, cx, cy); g.clip();
    if (water) {
      const wg = g.createLinearGradient(cx - HW, cy - HH, cx + HW, cy + HH);
      wg.addColorStop(0, shade(T.water, 0.15)); wg.addColorStop(1, shade(T.water, -0.3));
      g.fillStyle = wg; g.fillRect(0, 0, cw, TH + 2);
    } else {
      const src = k === K.PATH ? pickFloor(T.path, x, y) : k === K.POST ? (tex.floors[T.pad] || pickFloor(T.ground, x, y)) : pickFloor(T.ground, x, y);
      g.drawImage(src.img, src.x, src.y, src.w, src.h, cx - HW - 0.6, cy - HH - 0.6, TW + 1.2, TH + 1.2);
      if (k === K.PATH) { // a darker rim where the road meets the ground
        g.strokeStyle = 'rgba(20,12,6,0.35)'; g.lineWidth = 2;
        const edge = (nx, ny) => !map.isRoad(nx, ny) && !(map.inb(nx, ny) && map.kind[map.I(nx, ny)] === K.WATER);
        g.beginPath();
        if (edge(x, y - 1)) { g.moveTo(cx, cy - HH); g.lineTo(cx + HW, cy); }
        if (edge(x + 1, y)) { g.moveTo(cx + HW, cy); g.lineTo(cx, cy + HH); }
        if (edge(x, y + 1)) { g.moveTo(cx, cy + HH); g.lineTo(cx - HW, cy); }
        if (edge(x - 1, y)) { g.moveTo(cx - HW, cy); g.lineTo(cx, cy - HH); }
        g.stroke();
      }
      // higher neighbours behind cast a shadow strip
      for (const [nx, ny, a, b] of [[x - 1, y, [cx - HW, cy], [cx, cy - HH]], [x, y - 1, [cx, cy - HH], [cx + HW, cy]]]) {
        if (!map.inb(nx, ny) || map.hgt[map.I(nx, ny)] <= h) continue;
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 7; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      }
    }
    g.restore();
    // a bright lip along the top's front edges where a face drops
    g.strokeStyle = water ? 'rgba(180,230,255,0.35)' : 'rgba(255,240,200,0.18)'; g.lineWidth = 1;
    g.beginPath(); if (sw > 0) { g.moveTo(cx - HW, cy); g.lineTo(cx, cy + HH); } if (se > 0) { g.moveTo(cx, cy + HH); g.lineTo(cx + HW, cy); } g.stroke();
    const behind = Math.min(x > 0 ? map.hgt[map.I(x - 1, y)] : 99, y > 0 ? map.hgt[map.I(x, y - 1)] : 99);
    const col = { x, y, key: x + y + 0.5, img: c, ox: -cx, oy: -cy, h: top, water, occl: h > behind };
    cols.push(col);
    const sx = isoX(x + 0.5, y + 0.5), sy = isoY(x + 0.5, y + 0.5, top);
    bx0 = Math.min(bx0, sx - HW); bx1 = Math.max(bx1, sx + HW); by0 = Math.min(by0, sy - HH - 70); by1 = Math.max(by1, sy + HH + (top - base) * HZ);
  }
  // props: the map's T and r cells, plus a little extra scatter on open ground away from the road
  const put = (x, y, names, scale) => {
    const n = names[Math.floor(rng.next() * names.length)], s = tex.props[n];
    if (!s) return;
    props.push({ x: x + 0.5 + rng.range(-0.08, 0.08), y: y + 0.5 + rng.range(-0.08, 0.08), z: map.hgt[map.I(x, y)], src: s, k: s.k * scale, flip: rng.chance(0.5) });
  };
  for (const p of map.props) put(p.x, p.y, p.big ? T.big : T.small, p.big ? 1 : 0.85);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const i = map.I(x, y);
    if (map.kind[i] !== K.GROUND || rng.next() > 0.07) continue;
    let nearRoad = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (map.isRoad(x + dx, y + dy)) nearRoad = true;
    if (!nearRoad && !map.posts.some((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1)) put(x, y, T.small, 0.75);
  }
  return { cols, props, base, bounds: [bx0, by0, bx1, by1], theme: T };
}
