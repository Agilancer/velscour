// SHEER DROPS (docs/SHEER_DROPS.md): ten dungeon biomes laid out like any other (world/dungeon.js), but where a
// dungeon has walls the floor simply ends at a brink and falls away forever. Flyers and leaps cross the gaps; anything
// that comes to rest over one (knocked off, frozen in the air) falls and dies at once, the hero too (game/sheer.js).
//
// base: the biome whose floors, props, monsters and lighting it borrows (data/biomes.js copies it).
// tex: the cliff faces' seamless texture, assets/tiles/sheer/<tex>.webp (tools/sheerpack.py from assets/source/sheer/).
// below: 'dark' a black nothingness, the cliffs fading into it; 'fog' a pale fog sea swallowing the cliffs' feet.
// sky: the abyss behind everything, top to bottom of the screen; deep: what the cliffs fade into;
// mist: the fog banks drifting below (fog variants); motes: what drifts in the void ('dust', 'ember', 'star', 'snow',
// 'glint', 'gold', 'ash'); glow: a light welling up from far below; flash: lightning in the clouds.
export const SHEER = [
  { id: 'sheer_ossuary', name: 'The Hanging Ossuary', base: 'catacombs', act: 1, tex: 'ossuary', below: 'dark',
    sky: ['#0d0a08', '#020101'], deep: '#020101', motes: { kind: 'dust', color: '#bfae8c' }, rim: '#d8c8a4',
    dark: 0.8, light: 7.5, fog: '#0d0805', amb: ['inside_night', 'cave_storm'],
    adj: ['Hanging', 'Bone-Slung', 'Chasm'] },
  { id: 'sheer_drowned', name: 'The Drowned Precipice', base: 'sunken', act: 1, tex: 'drowned', below: 'fog',
    sky: ['#3d6866', '#b4d4cc'], deep: '#a6c8c0', mist: ['rgba(196,226,218,A)', 'rgba(150,196,188,A)'], motes: { kind: 'spray', color: '#e4fff8' }, rim: '#c8f0e8',
    dark: 0.42, light: 8, fog: '#173634', amb: ['sea', 'beach_rain', 'cave_rain'],
    adj: ['Drowned', 'Spray-Lashed', 'Tidebroken'] },
  { id: 'sheer_canyon', name: 'The Red Canyon Tombs', base: 'desert', act: 2, tex: 'canyon', below: 'fog',
    sky: ['#9a5a34', '#efc690'], deep: '#e8b27a', mist: ['rgba(246,206,150,A)', 'rgba(214,150,96,A)'], motes: { kind: 'ash', color: '#f6d8a8' }, rim: '#ffd8a0',
    dark: 0.34, light: 9, fog: '#3a1e0c', amb: ['inside_day_storm', 'beach_storm'],
    adj: ['Sunscorched', 'Canyon', 'Red-Walled'] },
  { id: 'sheer_gilded', name: 'The Gilded Abyss', base: 'gilded', act: 2, tex: 'gilded', below: 'dark',
    sky: ['#1a1004', '#030200'], deep: '#040200', motes: { kind: 'gold', color: '#ffd870' }, glow: '#a06a10', rim: '#ffe090',
    dark: 0.74, light: 8.5, fog: '#1a1204', amb: ['inside_night', 'cave'],
    adj: ['Gilded', 'Pharaonic', 'Fathomless'] },
  { id: 'sheer_rime', name: 'Rimefall Chasm', base: 'frozen', act: 3, tex: 'rime', below: 'fog',
    sky: ['#7d9fba', '#eef6fc'], deep: '#e2eef8', mist: ['rgba(240,248,255,A)', 'rgba(196,220,240,A)'], motes: { kind: 'snow', color: '#ffffff' }, rim: '#f4fbff',
    dark: 0.34, light: 8, fog: '#1a2c40', amb: ['cave_storm', 'forest_night_storm'],
    adj: ['Rimebound', 'Glacial', 'Windscoured'] },
  { id: 'sheer_crystal', name: 'The Shardfall Rift', base: 'crystal', act: 3, tex: 'shard', below: 'dark',
    sky: ['#04141c', '#010406'], deep: '#010508', motes: { kind: 'glint', color: '#a8ffff' }, glow: '#1890c0', rim: '#a0f4ff',
    dark: 0.72, light: 9, fog: '#041418', amb: ['cave_rain', 'cave_storm'],
    adj: ['Shardborn', 'Prismatic', 'Riven'] },
  { id: 'sheer_cloister', name: 'Cloudbreak Cloister', base: 'cathedral', act: 4, tex: 'cloister', below: 'fog',
    sky: ['#c4ae84', '#fff8ea'], deep: '#f6ecd6', mist: ['rgba(255,250,236,A)', 'rgba(236,220,186,A)'], motes: { kind: 'dust', color: '#fff4d0' }, rim: '#fff6dc',
    dark: 0.3, light: 9, fog: '#3a3020', amb: ['inside_day', 'waterfall_loop'],
    adj: ['Cloudborne', 'Hallowed', 'High'] },
  { id: 'sheer_storm', name: 'The Stormbreak Bastion', base: 'shattered', act: 4, tex: 'storm', below: 'fog',
    sky: ['#2e3442', '#8a93a6'], deep: '#7c8598', mist: ['rgba(150,160,178,A)', 'rgba(96,104,122,A)'], motes: { kind: 'spray', color: '#c8d4e8' }, flash: true, rim: '#d0dcf0',
    dark: 0.46, light: 8.5, fog: '#141a26', amb: ['forest_night_storm', 'sea_storm', 'cave_storm'],
    adj: ['Stormbroken', 'Thunderstruck', 'Windward'] },
  { id: 'sheer_cinder', name: 'The Cinder Spires', base: 'molten', act: 5, tex: 'cinder', below: 'dark',
    sky: ['#1a0602', '#040100'], deep: '#0a0200', motes: { kind: 'ember', color: '#ff8a30' }, glow: '#c03008', rim: '#ffb070',
    dark: 0.72, light: 8, fog: '#200802', amb: ['torch_loop', 'cave_storm'],
    adj: ['Cinder', 'Magma-Lit', 'Smouldering'] },
  { id: 'sheer_starless', name: 'The Starless Rift', base: 'void', act: 5, tex: 'starless', below: 'dark',
    sky: ['#0a0414', '#000000'], deep: '#000000', motes: { kind: 'star', color: '#d8c8ff' }, rim: '#c8a8ff',
    dark: 0.84, light: 7, fog: '#0c0418', amb: ['inside_night_storm', 'cave'],
    adj: ['Starless', 'Nether', 'Unending'] },
];
export const SHEER_BY_ID = Object.fromEntries(SHEER.map((v) => [v.id, v]));
