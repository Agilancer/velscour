// Catacombs-based, no-procedural-art biome curation regression.
// Run: node tools/tests/biome_art_direction.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BIOMES, mixPartner } from '../../src/data/biomes.js';
import { CURATED_BIOMES, biomeArtProfile, materialForWall } from '../../src/gfx/biomecuration.js';
import { cleanAuthoredCell } from '../../src/gfx/aibiomeart.js';

const dungeon=BIOMES.filter(b=>!b.overworld&&b.id!=='catacombs');
assert.equal(Object.keys(CURATED_BIOMES).length,dungeon.length,
  'Each non-Catacombs dungeon must have a curated profile');
for(const biome of dungeon){
  const profile=biomeArtProfile(biome.id);
  assert.ok(profile,'Missing biome '+biome.id);
  assert.ok(profile.wallMaterials.length>=2&&profile.wallMaterials.length<=4,
    'Wall materials are too disparate for '+biome.id);
  assert.ok(profile.baseSources.length>=2&&profile.baseSources.length<=3,
    'Too many base paving styles in '+biome.id);
  for(const [type,arr] of [['wall',profile.wallMaterials],['base',profile.baseSources]]){
    assert.equal(new Set(arr).size,arr.length,'Repeated '+type+' asset: '+biome.id);
    assert.ok(arr.every(n=>Number.isInteger(n)&&n>=0&&n<(type==='wall'?10:10)),
      'Invalid '+type+' atlas cell for '+biome.id);
  }
  for(let family=0;family<10;family++)
    assert.equal(materialForWall(biome.id,family),profile.wallMaterials[family%profile.wallMaterials.length],
      'Mask-dependent wall texture accidentally reintroduced');
  assert.ok(profile.maxImportedPaletteSwaps<=0.25,
    'Exceeded maximum imported palette swap ratio for '+biome.id);
  assert.equal(mixPartner(biome,()=>0),null,
    'Cross-biome floor mixing reintroduced into '+biome.id);
}
const catacombs=JSON.parse(fs.readFileSync('assets/tiles/catacombs/pack.json','utf8'));
assert.equal(catacombs.floors.filter(f=>f.seamless).length,10,'Gold-standard paving changed');
assert.ok(catacombs.floors.filter(f=>!f.seamless).length>40,'Gold-standard details missing');
function pixelFixture(w,h,paint){
  const data=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const rgba=paint(x,y,w,h);
    const idx=(y*w+x)*4;
    data.set(rgba,idx);
  }
  return {data};
}
const bad=pixelFixture(64,32,()=>[250,0,0,255]);
assert.equal(cleanAuthoredCell(bad,64,32,true),false,'Red chroma-key bleed accepted');
const good=pixelFixture(64,32,(x,y,w,h)=>
  Math.abs(x-(w-1)/2)/(w/2)+Math.abs(y-(h-1)/2)/(h/2)<.8
    ?[48,46,51,255]:[0,0,0,0]);
assert.equal(cleanAuthoredCell(good,64,32,true),true,'Valid alpha diamond rejected');
const badProp=pixelFixture(64,64,()=>[0,20,235,255]);
assert.equal(cleanAuthoredCell(badProp,64,64,false),false,'Blue placeholder key accepted');
const script=fs.readFileSync('src/gfx/biomeexpansion.js','utf8');
for(const method of ['expandBiomePack','extendedTownFloors','extendedOverworldFloors']){
  const start=script.indexOf('export function '+method+'(');
  assert.ok(start>=0,'Missing '+method);
  const end=script.indexOf('\nexport function ',start+10);
  const body=script.slice(start,end<0?undefined:end);
  assert.ok(!/decorateFloor\(/.test(body),'Procedural drawn floor art reintroduced in '+method);
}
const expansion=script.slice(script.indexOf('export function expandBiomePack('));
assert.ok(!/etchWallArchitecture\(|recolorArchitecture\(|drawProp\(/.test(expansion.split('export function outdoorBiomeProp')[0]),
  'Synthesized walls or placeholder scatter used in pack expansion');
console.log('Biome cohesion contract passed for '+dungeon.length+' dungeons; Catacombs untouched, 0 new cross-set swaps');
