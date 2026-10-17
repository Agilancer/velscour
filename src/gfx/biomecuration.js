// Environmental art direction for the authored biome atlases.
// No newly generated line art, geometry, palette swaps or cross-biome sprites.
// All wall indices address *that biome's own* existing ten-material AI strip;
// no connectivity mask can accidentally replace a wall with a different color.
const cool=[0,2,6], dark=[0,3,8], warm=[1,9,3], damp=[4,7,0], hot=[3,5,0];
const profiles={
  frozen:{wall:[0,6,2],base:[2,8,0]},
  molten:{wall:hot,base:[8,0,6]},
  fungal:{wall:[4,7,0],base:[4,1,3]},
  sunken:{wall:[6,4,0],base:[4,2,7]},
  blood:{wall:[3,5,0],base:[6,8,0]},
  ashen:{wall:dark,base:[0,8,2]},
  void:{wall:[8,0,2],base:[8,0,2]},
  // Lighter crypt limestone with restrained mortuary tesserae, distinct
  // from Amber's rust-colored burial paving.
  gilded:{wall:warm,base:[5,9]},
  plague:{wall:damp,base:[4,7,1]},
  crystal:{wall:cool,base:[2,5,8]},
  desert:{wall:warm,base:[5,6,1]},
  shadow:{wall:dark,base:[8,0,2]},
  forge:{wall:hot,base:[8,6,0]},
  abyss:{wall:[6,8,0],base:[8,2,0]},
  thorn:{wall:damp,base:[4,1,7]},
  storm:{wall:cool,base:[2,0,5]},
  obsidian:{wall:dark,base:[8,0,2]},
  flesh:{wall:hot,base:[6,0,8]},
  serpent:{wall:[1,4,9],base:[5,4,6]},
  shattered:{wall:[1,2,9],base:[5,2,1]},
  library:{wall:[2,0,9],base:[0,2,5]},
  necropolis:{wall:[0,2,6],base:[5,6,8]},
  // Nave flagstone + choir slate: exclude black/white marble_checker (#3).
  cathedral:{wall:[1,2,9],base:[0,2]},
  amber:{wall:[1,3,9],base:[6,7]},
  desert_temple:{wall:[1,9,2],base:[5,6,1]},
  // Dark ice, sapphire slate and quiet snowbound stone. Reject the oversized
  // repeated white rhombus grids (#0 and #5) that overwhelm room geometry.
  ice_temple:{wall:[6,0,2],base:[2,6,7]},
  hell:{wall:hot,base:[8,0,6]},
  astral_plane:{wall:[8,2,6],base:[8,2,0]},
  heavenly:{wall:[9,1,2],base:[5,9,2]},
  throne:{wall:hot,base:[8,0,6]},
};
// Source cell positions in each biome's own 32-floor generated atlas.
// These are the calmer, material-first selections; alpha hygiene is
// validated at runtime before any supplied motif is drawn.
const accentSources=Object.freeze([0,2,5,8,10,13,16,19,21,24,27,30]);
export const CURATED_BIOMES=Object.freeze(Object.fromEntries(
  Object.entries(profiles).map(([id,p])=>[id,Object.freeze({
    wallMaterials:Object.freeze([...p.wall]),baseSources:Object.freeze([...p.base]),
    accentSources, maxImportedPaletteSwaps:0,
  })])));
export function biomeArtProfile(id){return CURATED_BIOMES[id]||null;}
export function materialForWall(id,familyIndex){
  const materials=biomeArtProfile(id)?.wallMaterials;
  return materials ? materials[familyIndex%materials.length] : familyIndex%10;
}
export function curatedBaseOffsets(id){
  return biomeArtProfile(id)?.baseSources||[0,1,2];
}
