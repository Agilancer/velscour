// Approved VELSCOUR helmet sprites, cropped from the user's eight class charts.
// A separate 5 x 8, 92px atlas exists for each of the sixteen classes.
export const HELMET_TILE = [92, 92];
const ROOT = 'assets/sprites/helmets/';
const FIT = {
 paladin:[64,3,63,68],ranger:[64,4,70,70],wizard:[64,0,73,78],
 necromancer:[64,1,72,73],barbarian:[64,2,80,69],dragoon:[64,3,71,72],
 totem_master:[64,0,85,80],death_knight:[64,2,75,73],
 arcane_sorcerer:[64,0,73,78],carrion_witch:[64,1,75,76],
 bard:[64,5,78,69],slime_lord:[64,5,68,70],
 boomerang_knight:[64,5,74,69],lancer:[64,4,70,70],
 dragon_knight:[64,1,81,77],gunner:[64,8,73,66],
};
export function helmetFit(cls, rarity=0) {
 const [cx, top, width, height] = FIT[cls] || [64,4,70,70];
 const mul = rarity>=4?1.06:rarity===3?1.03:1;
 return {cx,top:Math.max(0,top-(mul-1)*height*0.5),w:width*mul,h:height*mul};
}
// [atlas starting index, count, historical item.look design band starting index]
const BANDS=[[0,10,1],[10,5,21],[15,5,37],[20,10,53],[30,5,65],[35,5,75]];
export function helmetVariant(item) {
 const rarity=Math.max(0,Math.min(5,item?.rarity??0));
 const [start,count,first]=BANDS[rarity];
 const design=Number(item?.look?.[0])||first;
 return start+(((design-first)%count)+count)%count;
}
const images=new Map();
export function loadHelmetAtlas(cls) {
 if (images.has(cls)) return images.get(cls);
 const result=new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error('Missing approved VELSCOUR helmets for '+cls));
  img.src=ROOT+cls+'.webp';
 });
 images.set(cls,result);
 if (images.size>5) images.delete(images.keys().next().value);
 return result;
}
