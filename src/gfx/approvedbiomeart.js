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
        const cell=meta.scatter[propStart+i];
        if(!cell)continue;
        g.clearRect(cell.x,cell.y,cell.w,cell.h);
        g.drawImage(props,i*PROP.w,row*PROP.h,PROP.w,PROP.h,
          cell.x,cell.y,cell.w,cell.h);
        propCount++;
      }
      g.restore();
    }
  }
  meta.approvedArt={row,floorStart,propStart,floorCount,propCount};
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
