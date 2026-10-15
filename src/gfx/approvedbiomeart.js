// Approved painted artwork imported from the user's five-biome sprite sheets.
// Small atlases stay shared/lazily decoded; original wall geometry, tile
// metadata, native indices and collision rules remain authoritative.
const ART_DIR = 'assets/tiles/approved_biomes/';
const ROWS = Object.freeze({
  desert_temple: 0,
  ice_temple: 1,
  hell: 2,
  astral_plane: 3,
  heavenly: 4,
});
// Match the painted object type to the name/collision already used by each
// native pack: obelisk, brazier, sarcophagus, column, banner, urn, statue,
// altar. This avoids, for example, making Hell's nonblocking lava pools
// look like solid statues or mixing up NPC-facing decoration names.
const NATIVE_PROP_INDICES = Object.freeze({
  desert_temple: [0,10,5,7,26,4,1,2],
  ice_temple: [0,18,10,8,36,15,5,12],
  hell: [0,2,28,13,25,31,10,19],
  astral_plane: [0,2,21,12,36,9,24,17],
  heavenly: [8,5,12,0,33,31,3,28],
});
const FLOOR = Object.freeze({w:80,h:40,cols:8,rows:5});
const PROP = Object.freeze({w:80,h:80,cols:8,rows:5});
const MONSTER = Object.freeze({w:120,h:150,cols:4,rows:3});
const FAMILIES = Object.freeze([
  'seraph','cherub','ophanim','warden',
  'herald','templar','beast','griffin',
  'luminary','judgement','oracle','throne',
]);
const urls = {floors:'floors.webp',props:'props.webp',monsters:'heavenly_monsters.webp'};
const sheetPromises = new Map(), sheets = new Map();
const monsterFrames = new Map();

function loadSheet(kind) {
  if (sheetPromises.has(kind)) return sheetPromises.get(kind);
  const promise = new Promise(resolve => {
    if (typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.onload = () => {
      const size = kind==='floors'?FLOOR:kind==='props'?PROP:MONSTER;
      if (img.naturalWidth !== size.w*size.cols ||
          img.naturalHeight !== size.h*size.rows) {
        console.warn('VELSCOUR approved art has wrong atlas dimensions:',kind);
        return resolve(null);
      }
      sheets.set(kind,img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn('VELSCOUR approved artwork unavailable:',ART_DIR+urls[kind]);
      resolve(null); // Original generated graphics continue to work offline.
    };
    img.src = ART_DIR+urls[kind];
  });
  sheetPromises.set(kind,promise);
  return promise;
}

/** Overwrite only eight approved floor and eight prop cells in the active
 * biome's existing atlas. For expanded packs, replace appended cells rather
 * than legacy ones. Do not alter counts, sprite pivots, terrain collision,
 * wall slices, source palettes, tile IDs or established selection ranges.
 */
export async function applyApprovedBiomeArt(pack, biomeId) {
  const row = ROWS[biomeId];
  if (row === undefined || !pack?.meta) return pack;
  const [floors,props] = await Promise.all([loadSheet('floors'),loadSheet('props')]);
  const meta=pack.meta, expanded=meta.expansion;
  const floorStart=(expanded ? expanded.floorStart : 0)+10; // after seamless bases
  const propStart=expanded ? expanded.scatterStart : 0;
  const propIndices=expanded ? Array.from({length:8},(_,i)=>propStart+i) :
    NATIVE_PROP_INDICES[biomeId];
  let floorCount=0,propCount=0;
  if (floors && pack.floors?.getContext) {
    const g=pack.floors.getContext('2d');
    if(g){
      g.save();g.imageSmoothingEnabled=false;
      for(let i=0;i<8;i++){
        const cell=meta.floors[floorStart+i];
        if(!cell)continue;
        g.clearRect(cell.x,cell.y,cell.w,cell.h);
        g.drawImage(floors,i*FLOOR.w,row*FLOOR.h,FLOOR.w,FLOOR.h,
          cell.x,cell.y,cell.w,cell.h);
        cell.seamless=false;
        floorCount++;
      }
      g.restore();
    }
  }
  if (props && pack.scatter?.getContext) {
    const g=pack.scatter.getContext('2d');
    if(g){
      g.save();g.imageSmoothingEnabled=false;
      for(let i=0;i<8;i++){
        const cell=meta.scatter[propIndices[i]];
        if(!cell)continue;
        g.clearRect(cell.x,cell.y,cell.w,cell.h);
        g.drawImage(props,i*PROP.w,row*PROP.h,PROP.w,PROP.h,
          cell.x,cell.y,cell.w,cell.h);
        propCount++;
      }
      g.restore();
    }
  }
  meta.approvedArt={row,floorStart,propStart,propIndices:[...propIndices],
    floorCount,propCount};
  return pack;
}

export function preloadApprovedHeavenlySprites() {
  return loadSheet('monsters');
}

/** One painted design per original Heavenly family, assigned to variant #1
 * of its existing five monster IDs. The other four ranks keep their unique
 * generated looks and all sixty monster IDs/AI behaviours remain untouched.
 */
export function approvedHeavenlyMonsterCanvas(family) {
  const index=FAMILIES.indexOf(family),image=sheets.get('monsters');
  if (index<0 || !image) return null;
  if(monsterFrames.has(family)) return monsterFrames.get(family);
  const canvas=document.createElement('canvas');
  canvas.width=160;canvas.height=186;
  const g=canvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.drawImage(image,(index%4)*MONSTER.w,Math.floor(index/4)*MONSTER.h,
    MONSTER.w,MONSTER.h,8,3,144,180);
  canvas._art={fx:80};
  monsterFrames.set(family,canvas);
  return canvas;
}
