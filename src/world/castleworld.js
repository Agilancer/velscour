// CASTLE overworld: a concentric castle laid out like Beaumaris and Harlech (docs/CASTLE_OVERWORLD.md). A wet moat
// fed by a river rings a lower outer curtain (round corner towers, square interval towers, the twin-towered
// gatehouse and its drawbridge, a postern); the outer ward holds the stables, smithy, practice yard, mason's yard and
// kitchen garden; a higher inner curtain with an offset gate guards the inner ward: the great keep, the throne hall,
// the chapel, the great hall and a walled garden. Outside: the village on the approach road, fields and an orchard,
// a graveyard, the enemy siege lines, and a forest of the Dark Forest's towering trees round the edge.
// 336 x 304 tiles (three times the old 192 x 176 board). Walls, towers and halls sit on a 2-tile cell grid.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { A } from '../core/assets.js';
import { rollLooks } from '../data/bestiary.js';
import { CASTLE_FURNITURE_HEIGHT } from '../gfx/castlescale.js';
import { castleFloorTiles, castleKeepFloorTiles, castleKeepWallFrames, castleFrames, castleObject, castleStrip, castleCutout, castleCarpetTiles, castleTent, castleScaled } from '../gfx/castle.js';
import { townObject } from './town.js';
import { MAT } from '../gfx/castleground.js';
import { darkForestTree, darkTreeK, darkForestTreesReady } from '../gfx/darkforest.js';
import { SCENARIOS } from '../game/overworld.js';

export const CASTLE_SIZE=Object.freeze([336,304]);
const W=336,H=304,C=2;                    // tiles; one wall cell is C x C tiles
// Curtain rings in wall cells (tile = cell * 2). The inner curtain stands 14 cells inside the outer one.
export const CASTLE_OUTER=Object.freeze({x0:48,y0:34,x1:120,y1:100});
export const CASTLE_INNER=Object.freeze({x0:62,y0:48,x1:106,y1:86});
export const CASTLE_WALL=CASTLE_OUTER;
const MOAT=Object.freeze({x0:86,y0:58,x1:251,y1:211,w:8});   // tiles: an 8-tile ring one berm cell outside the curtain
// Gates (wall cells): the gatehouse mid-south, the postern north-east, the inner gate offset east of the outer one
// (Beaumaris: attackers can't charge straight through both), the inner north gate west of the keep.
export const CASTLE_GATES=Object.freeze({outer:[[84,100]],postern:[[104,34]],inner:[[96,86]],innerNorth:[[72,48]]});
const ENTRY=[169,294],EXIT=[224,8];
// Floor ids (1-based, as in the atlas) chosen by how each tile looks: several atlas names don't describe their art.
const F={meadow:[1,7,13,21],bright:[41,47],lush:[2,8,14,22,28,42],mid:[19,27,53,59],dirt:[4,24,44,36],
  mud:[50,10,16],sand:[30],gravel:[3,9,29],cobble:[15],pave:[35,35,35,23,43],dark:[37],moss:[33,39,34],herring:[40],
  plank:[56],slab:[55],water:[12,18,26],deep:[6]};
// Material classes (map.castleMat): the renderer blends the edges between them and floats flow on the water.
export { MAT };
// Prop heights in world px for a 60 px hero (the pack's own pixel sizes vary wildly).
const PROP_H={well_roofed:86,handcart:34,firewood_stack:30,broken_barrel:30,water_barrel:32,bucket_pair:16,grain_sack:26,
  crate_stack:34,trestle_table:30,guard_bench:22,grindstone:32,blacksmith_anvil:28,unlit_brazier:38,stoneware_jugs:16,
  herb_drying_rack:46,flower_box:24,rose_bush:38,clipped_hedge:34,ivy_bollard:46,fountain_fragment:36,birdbath:40,sundial:42,
  stone_blocks:26,mortar_trough:16,mason_tools:10,ladder:58,rope_coil:12,iron_chain:14,gate_winch:30,shield_rack:30,
  spear_bundle:58,archery_target:50,broken_wheel:22,statue_fragment:34,bird_cage:20,unlit_lantern:26,hand_bell:42,
  banner_pole:100,rubble_pile:24,cracked_paving:10,small_rubble:12,large_rubble:22,column_drums:30,carved_capital:26,
  spare_merlons:22,roof_slate_stack:26,mortar_bucket:22,stone_trowels:12,mason_square:18,plumb_bob:26,scaffold_frame:86,
  pulley_block:74,timber_brace:20,iron_spikes:22,gate_hinges:14,portcullis_teeth:32,chain_hook:56,stone_drain_grate:12,
  rain_barrel_stand:58,cistern_cover:20,stone_trough:20,shallow_basin:26,topiary_spiral:64,potted_cypress:66,potted_laurel:34,
  flower_urn:28,herb_bundle:26,rose_trellis:74,ivy_arch:90,gargoyle_spout:30,lion_fountain_nozzle:50,milestone:42,
  boundary_post:54,stone_bench:18,sundial_fragment:16,chess_table:26,bird_roost:72,nest_box:20,covered_basket:30,sandbags:20,
  wicker_barricade:40,timber_barricade:38,sharpened_stakes:54,stone_firepit:14,empty_brazier:46,water_cask:40,bucket_line:46,
  hand_pump:52,rope_pulley:66,grappling_hook:24,arrow_bundle:42,crossbow_rack:40,bow_rack:40,practice_dummy:60,helmet_post:58,
  armor_stand:62,leaned_shields:32,guard_stool:22,blank_map_stand:58,message_tube:14,wax_tablet:12,cookpot:28,bread_basket:20,
  apple_sack:18,cabbage_basket:18,laundry_line:52,folded_blankets:16,stretcher:20,medicine_box:14,dressing_bowl:14,empty_cage:34,
  feather_nest:16,pig_trough:22,fountain_statue:84,broken_bench:24,paving_drain:10,iron_bollard:30,wheelbarrow:28,siege_engine:96,lit_lantern:30,lantern_bell:38,tool_chest:22};
// Pack frames whose names drifted from their art (the art decides): logical name -> atlas frame.
const SCATTER_ART={siege_engine:'scatter_34_broken_wheel',broken_wheel:'scatter_35_statue_fragment',statue_fragment:'scatter_36_bird_cage',
  bird_cage:'scatter_37_unlit_lantern',lantern_bell:'scatter_38_hand_bell',covered_basket:'scatter_79_nest_box',lit_lantern:'scatter_80_covered_basket',
  tool_chest:'scatter_103_cookpot',cookpot:'scatter_104_bread_basket',bread_basket:'scatter_105_apple_sack',apple_sack:'scatter_106_cabbage_basket',
  cabbage_basket:'scatter_107_laundry_line',laundry_line:'scatter_108_folded_blankets',folded_blankets:'scatter_109_stretcher',stretcher:'scatter_110_medicine_box',
  medicine_box:'scatter_111_dressing_bowl',dressing_bowl:'scatter_112_empty_cage',empty_cage:'scatter_113_feather_nest',feather_nest:'scatter_114_pig_trough',
  pig_trough:'scatter_115_fountain_statue',fountain_statue:'scatter_116_broken_bench',broken_bench:'scatter_117_paving_drain',paving_drain:'scatter_118_iron_bollard',
  iron_bollard:'scatter_119_rubble_barrow',wheelbarrow:'scatter_120_covered_supply_crate'};
const TREE_H={apple:70,birch:84,pine:80,oak:74,juniper:64,thorn:66,ash:150,pear:128,fir:160,twin:150,willow:140,dead:150,
  ancient:230,elm:250,cedar:240,scots:260,storm:220};
const SOLID=/well|cart|engine|chest|firewood|barrel|crate|table|bench|grindstone|anvil|brazier|rack|box|bush|hedge|bollard|fountain|birdbath|sundial|blocks|trough|ladder|winch|bundle|target|statue|cage|pole|rubble_pile|large_rubble|drums|capital|merlons|stack|scaffold|pulley|spikes|teeth|hook|stand|basin|topiary|potted|urn|trellis|arch|spout|nozzle|milestone|post|roost|barricade|stakes|cask|line|pump|dummy|stool|cookpot|cage|barrow|bucket_line/;
const WALL_ART='castle_landmark_04_curtain_wall_battlement',WALL_SLICE=[144,66,33,246];
const WALL_K=TW/WALL_SLICE[1];               // one slice spans one wall cell along the run (64 world px)
const KEEP_STONE={colorize:[36,.3],light:.16,contrast:.9};   // tints the keep's dark brick to the curtain's limestone
const PILLAR_STONE={colorize:[34,.28],light:.06,contrast:1.05};
const FOREST_TREES=['ancient_black_oak','spire_pine','twisted_yew','cathedral_redwood','hollow_ash','hanging_moss_fir',
  'fungal_beech','root_fused_twins','thornbound_cypress','weeping_willow','split_lightning_oak','dead_crowned_elm'];

function noise2(seed){
  const h=(x,y)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed,1442695041)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  const v=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),
    a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};
  return (x,y,s)=>v(x/s,y/s)*.62+v(x/s*2.13+31.7,y/s*2.13+11.3)*.38;
}

/** The Castle overworld for `depth`; the castle pack (and the Dark Forest trees) must be loaded (game.loadLevelArt). */
export function generateCastle(depth,biome,seed){
  const floors=castleFloorTiles(),keepFloors=castleKeepFloorTiles();
  if(!floors.length)throw new Error('Castle floors and moat water must load before generating the overworld.');
  const rng=new RNG(seed),N=W*H,map=new TileMap(W,H),props=[],buildings=[],trees=[],I=(x,y)=>y*W+x,
    n=noise2(seed&0xffff),inb=(x,y)=>x>=0&&y>=0&&x<W&&y<H,dist=(x,y,p)=>Math.hypot(x-p[0],y-p[1]);
  const mat=new Uint8Array(N),clear=new Uint8Array(N),forest=new Uint8Array(N);   // clear: roads and yards stay free
  map.t.fill(1);map.losBlocks=true;map.castleMat=mat;
  for(const k of ['rampartDeck','rampartWall','castleRoomWalls'])map[k]=new Uint8Array(N);
  map.rampartHeight=0;map.castleBridges=[];
  const scenarioId=(((seed>>>0)^depth)>>>0)%SCENARIOS.length,type=SCENARIOS[scenarioId][1];
  const set=(x,y,m)=>{if(inb(x,y))mat[I(x,y)]=m;};
  const block=(x,y)=>{if(inb(x,y))map.block[I(x,y)]=1;};
  const free=(x,y)=>{if(inb(x,y))map.block[I(x,y)]=0;};
  const rect=(x0,y0,x1,y1,fn)=>{for(let y=Math.max(0,y0);y<=Math.min(H-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(W-1,x1);x++)fn(x,y,I(x,y));};
  // A blob with a ragged, noise-warped rim.
  const blob=(cx,cy,rx,ry,fn,amp=.3,s=5)=>rect(Math.floor(cx-rx*1.4),Math.floor(cy-ry*1.4),Math.ceil(cx+rx*1.4),Math.ceil(cy+ry*1.4),(x,y,i)=>{
    const d=Math.hypot((x+.5-cx)/rx,(y+.5-cy)/ry)+(n(x,y,s)-.5)*amp*2;if(d<1)fn(x,y,i,d);});
  // A smooth path through points (Catmull-Rom), `w` tiles wide, its edge frayed by noise.
  const trail=(pts,w,fn,fray=.6)=>{
    const P=[pts[0],...pts,pts[pts.length-1]],cm=(a,b,c,d,t)=>.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(3*b-a-3*c+d)*t*t*t);
    for(let s=1;s<P.length-2;s++){const len=Math.hypot(P[s+1][0]-P[s][0],P[s+1][1]-P[s][1]),steps=Math.ceil(len*3);
      for(let k=0;k<=steps;k++){const t=k/steps,x=cm(P[s-1][0],P[s][0],P[s+1][0],P[s+2][0],t),y=cm(P[s-1][1],P[s][1],P[s+1][1],P[s+2][1],t),
        r=w/2+(n(x*1.7,y*1.7,4)-.5)*fray*2,R=Math.ceil(r+1);
        for(let yy=Math.floor(y-R);yy<=Math.ceil(y+R);yy++)for(let xx=Math.floor(x-R);xx<=Math.ceil(x+R);xx++)
          if(inb(xx,yy)&&Math.hypot(xx+.5-x,yy+.5-y)<=r)fn(xx,yy,I(xx,yy));}}
  };
  const H_=(id)=>{const m=id.match(/^scatter_\d+_(.+)$/);return m?PROP_H[m[1]]:null;};
  // A pack prop at tile (x,y), sized to its height in world px; solid ones block their tile.
  const add=(asset,category,x,y,h=null,extra=null)=>{
    const spr=castleObject(asset,category);if(!spr)return null;
    const hh=h??H_(asset)??Math.min(46,spr.h*.4),p={kind:'scatter',x,y,spr,k:hh/spr.h,flip:false,z:0,fixedK:true,...extra};
    props.push(p);if(extra?.solid??(category==='scatter'&&SOLID.test(asset)))block(Math.floor(x),Math.floor(y));return p;
  };
  const scatterIds=new Map(castleFrames('scatter').map(f=>[f.id.replace(/^scatter_\d+_/,''),f.id]));
  const P=(name,x,y,extra=null)=>add(SCATTER_ART[name]||scatterIds.get(name)||name,'scatter',x,y,PROP_H[name]??null,{solid:SOLID.test(name)||/engine|wheel/.test(name),...extra});
  const S=(id,x,y,extra=null)=>P(id.replace(/^\d+_/,''),x,y,extra);
  const art=(asset,x,y,k,extra=null)=>{   // world-scale landmark art
    const spr=castleObject(asset,'castle_landmarks');if(!spr)throw new Error('Missing castle art '+asset);
    const p={kind:'scatter',x,y,spr,k,flip:false,z:0,fixedK:true,...extra};props.push(p);return p;
  };
  const scr=(x,y)=>[32*(x-y),16*(x+y)];     // tile -> world px

  // ---------------------------------------------------------------- ground
  // Meadow with lush hollows and dry patches; the forest closes in round the edge.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=I(x,y),g=n(x,y,22),d=n(x+300,y,9);
    mat[i]=g>.68?MAT.lush:g>.56?MAT.mid:d>.76?MAT.bright:MAT.meadow;
    const edge=Math.min(x,y,W-1-x,H-1-y),reach=12+n(x,y+500,18)*22;
    if(edge<reach)forest[i]=1;
    if(edge<2)block(x,y);
  }
  // ---------------------------------------------------------------- water
  // The river comes down from the north-west, feeds the moat and leaves by the east; the moat is a ring round the curtain.
  const water=(x,y,i)=>{mat[i]=MAT.water;map.block[i]=1;forest[i]=0;};
  const inMoat=(x,y)=>x>=MOAT.x0&&x<=MOAT.x1&&y>=MOAT.y0&&y<=MOAT.y1&&(x<MOAT.x0+MOAT.w||x>MOAT.x1-MOAT.w||y<MOAT.y0+MOAT.w||y>MOAT.y1-MOAT.w);
  rect(MOAT.x0,MOAT.y0,MOAT.x1,MOAT.y1,(x,y,i)=>{if(inMoat(x,y))water(x,y,i);});
  const riverIn=[[52,-4],[54,30],[51,66],[52,104],[57,124],[68,133],[90,134]],riverOut=[[248,150],[270,151],[296,148],[320,151],[342,153]];
  trail(riverIn,9,water,1.1);trail(riverOut,8,water,1);
  // sandy banks along the river
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=I(x,y);if(mat[i]===MAT.water||inMoat(x,y))continue;
    let near=false;for(let d=1;d<=2&&!near;d++)for(const [dx,dy] of [[d,0],[-d,0],[0,d],[0,-d]])if(mat[I(Math.min(W-1,Math.max(0,x+dx)),Math.min(H-1,Math.max(0,y+dy)))]===MAT.water&&!inMoat(x+dx,y+dy))near=true;
    if(near&&n(x,y,3)>.35)mat[i]=MAT.sand;}

  // ---------------------------------------------------------------- curtain walls
  const rings=[];
  // One curtain ring: solid, one cell thick, open only at its gates; one battlement slice per wall cell.
  const curtain=(R,gates,tag)=>{
    const {x0,y0,x1,y1}=R,isGate=(cx,cy)=>gates.some(g=>g[0]===cx&&g[1]===cy);
    const runs={N:{u:true,c:y0,a:x0,b:x1},S:{u:true,c:y1,a:x0,b:x1},W:{u:false,c:x0,a:y0,b:y1},E:{u:false,c:x1,a:y0,b:y1}};
    for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
      if(!(cx===x0||cx===x1||cy===y0||cy===y1))continue;
      const gate=isGate(cx,cy);
      for(let dy=0;dy<C;dy++)for(let dx=0;dx<C;dx++){const x=cx*C+dx,y=cy*C+dy,i=I(x,y);forest[i]=0;clear[i]=1;
        if(gate){map.block[i]=0;mat[i]=MAT.dark;}else{map.block[i]=1;map.rampartWall[i]=1;mat[i]=MAT.wall;}}
    }
    const [sx,sw,spx,spy]=WALL_SLICE;
    const strip=(r,c)=>{
      const spr=castleStrip(WALL_ART,'castle_landmarks',sx,sw,spx-32/WALL_K,spy-16/WALL_K);if(!spr)throw new Error('Castle wall art failed to load.');
      const [x,y]=front(r,c);props.push({kind:'scatter',x:x*C,y:y*C,spr,k:WALL_K,flip:!r.u,z:0,fixedK:true,curtain:tag});
    };
    for(let cx=x0+1;cx<x1;cx++){if(!isGate(cx,y0))strip(runs.N,cx);if(!isGate(cx,y1))strip(runs.S,cx);}
    for(let cy=y0+1;cy<y1;cy++){if(!isGate(x0,cy))strip(runs.W,cy);if(!isGate(x1,cy))strip(runs.E,cy);}
    const ring={R,runs,gates,tag};rings.push(ring);return ring;
  };
  // A wall cell's sort anchor (cells): the low end of its face, so anything in front of the face sorts after it.
  const front=(r,c)=>r.u?[c,r.c+1]:[r.c+1,c];
  const cscr=(x,y)=>[64*(x-y),32*(x+y)];     // cell -> world px
  // Towers and gatehouses are cut into the same 64 px screen columns as the wall; each column is drawn just in front
  // of the wall cell it stands on, so a tower always covers the wall behind it with no slivers.
  const sliced=(ring,asset,Pc,k,sides,extra=null)=>{
    const s=castleObject(asset,'castle_landmarks');if(!s)throw new Error('Missing castle art '+asset);
    const [px,py]=cscr(Pc[0],Pc[1]),left=px+s.ox*k,right=left+s.w*k,cols=[];
    for(let m=Math.floor(left/64);m*64<right;m++){
      let Q=null;
      for(const r of sides.map(nm=>ring.runs[nm])){
        const c=r.u?m+r.c+1:r.c-m;if(c<r.a||c>r.b)continue;
        const q=front(r,c);if(!Q||q[0]+q[1]>Q[0]+Q[1])Q=q;
      }
      cols.push([m,Q]);
    }
    for(let i=0;i<cols.length;i++)if(!cols[i][1])for(let d=1;d<cols.length&&!cols[i][1];d++)cols[i][1]=cols[i-d]?.[1]||cols[i+d]?.[1]||null;
    for(const [m,Q] of cols){
      const a=Math.max(0,Math.floor((m*64-left)/k)),b=Math.min(s.w,Math.ceil((m*64+64-left)/k));if(b<=a||!Q)continue;
      const qx=Q[0],qy=Q[1]+.02,[ax,ay]=cscr(qx,qy);
      props.push({kind:'scatter',x:qx*C,y:qy*C,spr:{...s,sx:s.sx+a,w:b-a,ox:s.ox+a+(px-ax)/k,oy:s.oy+(py-ay)/k,strip:true},k,flip:false,z:0,fixedK:true,...extra});
    }
  };
  // A free-standing building cut into 32 px screen columns, each sorted from the front edge of its footprint
  // [fx0,fy0,fx1,fy1] (tiles) under that column, so walkers beside it sort as they would round a solid block.
  const slicedRect=(spr,Pt,k,[fx0,fy0,fx1,fy1],extra=null)=>{
    const [px,py]=scr(Pt[0],Pt[1]),left=px+spr.ox*k,right=left+spr.w*k;
    for(let m=Math.floor(left/32);m*32<right;m++){
      const X=m*32+16;let qx=X/32+fy1,qy=fy1;if(qx>fx1){qx=fx1;qy=fx1-X/32;}if(qx<fx0){qx=fx0;qy=fx0-X/32;}
      qy=Math.max(fy0,Math.min(fy1,qy))+.02;
      const a=Math.max(0,Math.floor((m*32-left)/k)),b=Math.min(spr.w,Math.ceil((m*32+32-left)/k));if(b<=a)continue;
      const [ax,ay]=scr(qx,qy);
      props.push({kind:'scatter',x:qx,y:qy,spr:{...spr,sx:spr.sx+a,w:b-a,ox:spr.ox+a+(px-ax)/k,oy:spr.oy+(py-ay)/k,strip:true},k,flip:false,z:0,fixedK:true,...extra});
    }
  };
  const blockCell=(cx,cy)=>{for(let dy=0;dy<C;dy++)for(let dx=0;dx<C;dx++){const x=cx*C+dx,y=cy*C+dy;block(x,y);if(inb(x,y)){forest[I(x,y)]=0;clear[I(x,y)]=1;}}};
  const cellFloor=(cx,cy,m)=>{for(let dy=0;dy<C;dy++)for(let dx=0;dx<C;dx++)set(cx*C+dx,cy*C+dy,m);};
  const RT='castle_landmark_01_rampart_straight_with_walkway',SQ='castle_landmark_03_round_tower_upper',
    CONE='castle_landmark_05_square_tower_upper',SMALL='castle_landmark_06_tower_stair_access';
  // Towers project outward from the curtain: round drums on the corners, square towers between.
  const towers=(ring,list)=>{for(const [cx,cy,ox,oy,sides,asset,k] of list){
    blockCell(cx,cy);blockCell(cx+ox,cy+oy);if(ox&&oy){blockCell(cx+ox,cy);blockCell(cx,cy+oy);}
    sliced(ring,asset,[cx+.5+ox*.3,cy+.5+oy*.3+.45],WALL_K*k,[...sides],{tower:ring.tag});
  }};
  const O=CASTLE_OUTER,IN=CASTLE_INNER;
  const outer=curtain(O,[...CASTLE_GATES.outer,...CASTLE_GATES.postern],'outer');
  const inner=curtain(IN,[...CASTLE_GATES.inner,...CASTLE_GATES.innerNorth],'inner');
  towers(outer,[[O.x0,O.y0,-1,-1,'NW',RT,1.3],[O.x1,O.y0,1,-1,'NE',RT,1.3],[O.x0,O.y1,-1,1,'SW',RT,1.3],[O.x1,O.y1,1,1,'SE',RT,1.3],
    [60,O.y0,0,-1,'N',SQ,1.15],[78,O.y0,0,-1,'N',SQ,1.15],[92,O.y0,0,-1,'N',SQ,1.15],
    [O.x0,52,-1,0,'W',SQ,1.15],[O.x0,67,-1,0,'W',SQ,1.15],[O.x0,82,-1,0,'W',SQ,1.15],
    [O.x1,52,1,0,'E',SQ,1.15],[O.x1,67,1,0,'E',SQ,1.15],[O.x1,82,1,0,'E',SQ,1.15],
    [64,O.y1,0,1,'S',SQ,1.15],[104,O.y1,0,1,'S',SQ,1.15]]);
  // The inner curtain's corner towers are taller, roofed drums (the inner wall commands the outer one).
  towers(inner,[[IN.x0,IN.y0,-1,-1,'NW',CONE,1.45],[IN.x1,IN.y0,1,-1,'NE',CONE,1.45],[IN.x0,IN.y1,-1,1,'SW',CONE,1.45],[IN.x1,IN.y1,1,1,'SE',CONE,1.45],
    [IN.x0,67,-1,0,'W',SQ,1.3],[IN.x1,67,1,0,'E',SQ,1.3],[84,IN.y0,0,-1,'N',SQ,1.3],[80,IN.y1,0,1,'S',SQ,1.3]]);

  // The gatehouse: two drum towers, portcullis and drawbridge, the passage between them open.
  const [gx,gy]=CASTLE_GATES.outer[0],GATE_K=WALL_K*1.2,GATE_ART=[217,312];
  for(let cy=gy-2;cy<=gy+1;cy++)for(let cx=gx-3;cx<=gx+3;cx++)if(cx!==gx)blockCell(cx,cy);
  for(let cy=gy-2;cy<=gy+1;cy++)cellFloor(gx,cy,MAT.dark);
  // placed by its gate: the art's threshold (the drawbridge hinge, src px) lands where the passage meets the wall face
  {const s=castleObject('castle_landmark_08_corner_tower_cluster','castle_landmarks'),[wx,wy]=scr(gx*C+1,(gy+1)*C),
    px=wx-(GATE_ART[0]+s.ox)*GATE_K,py=wy-(GATE_ART[1]+s.oy)*GATE_K;
    sliced(outer,'castle_landmark_08_corner_tower_cluster',[(px/64+py/32)/2,(py/32-px/64)/2],GATE_K,['S'],{gatehouse:true});}
  // Twin-towered arched gates for the postern and the inner gates: an arch on the gate cell, a square tower each side.
  const twinGate=(ring,[cx,cy],side,k=1.05)=>{
    const u=side==='N'||side==='S',out=side==='N'||side==='W'?-1:1;
    for(const d of [-1,1]){const tx=u?cx+d:cx,ty=u?cy:cy+d;blockCell(tx,ty);blockCell(u?tx:tx+out,u?ty+out:ty);}
    for(const d of [-1,1]){const tx=u?cx+d:cx,ty=u?cy:cy+d;
      sliced(ring,SMALL,[tx+.5+(u?0:out*.3),ty+.5+(u?out*.3:0)+.45],WALL_K*k,[side],{tower:ring.tag});}
    const [fx,fy]=front(ring.runs[side],u?cx:cy),arch=castleObject(u?'gateway_01_arched_castle_gate_SE':'gateway_01_arched_castle_gate_SW','gateways');
    // centred on the towers' line, a third of the way back into the wall from its face
    if(arch)props.push({kind:'scatter',x:(fx+(u?.5:-.35))*C,y:(fy+(u?-.35:.5))*C,spr:arch,k:120/arch.h,flip:false,z:0,fixedK:true,gateArch:ring.tag});
    for(let d=-1;d<=1;d++)cellFloor(u?cx:cx+d,u?cy+d:cy,MAT.dark);
  };
  twinGate(outer,CASTLE_GATES.postern[0],'N');
  twinGate(inner,CASTLE_GATES.inner[0],'S',1.15);
  twinGate(inner,CASTLE_GATES.innerNorth[0],'N',1.15);

  // ---------------------------------------------------------------- wards
  const ox0=O.x0*C+C,oy0=O.y0*C+C,ox1=O.x1*C-1,oy1=O.y1*C-1;          // outer ward interior (tiles)
  const ix0=IN.x0*C+C,iy0=IN.y0*C+C,ix1=IN.x1*C-1,iy1=IN.y1*C-1;      // inner ward interior
  const inInner=(x,y)=>x>=IN.x0*C&&x<=IN.x1*C+1&&y>=IN.y0*C&&y<=IN.y1*C+1;
  const inOuter=(x,y)=>x>=O.x0*C&&x<=O.x1*C+1&&y>=O.y0*C&&y<=O.y1*C+1;
  rect(ox0,oy0,ox1,oy1,(x,y,i)=>{forest[i]=0;if(map.rampartWall[i]||mat[i]===MAT.dark)return;
    if(inInner(x,y))mat[i]=n(x,y,7)>.62?MAT.mid:MAT.meadow;else mat[i]=n(x,y,6)>.68?MAT.dirt:n(x,y,11)>.58?MAT.mid:MAT.meadow;});
  // The wall-walk lane: a paved lane at the foot of the outer curtain all the way round (map.rampartDeck).
  rect(ox0,oy0,ox1,oy1,(x,y,i)=>{if(map.rampartWall[i]||inInner(x,y))return;
    if(x<ox0+4||x>ox1-4||y<oy0+4||y>oy1-4){map.rampartDeck[i]=1;mat[i]=MAT.dark;clear[i]=1;}});
  // berm round the outside of the curtain
  rect(O.x0*C-2,O.y0*C-2,O.x1*C+3,O.y1*C+3,(x,y,i)=>{if(!inOuter(x,y)&&!inMoat(x,y)){forest[i]=0;clear[i]=1;}});

  // Roads: the approach from the south through the village to the bridge, the bailey lanes to the inner gate,
  // the postern road north to the exit, and the old tracks to the siege lines, the graveyard and the fields.
  const road=(pts,w,m=MAT.road)=>trail(pts,w,(x,y,i)=>{if(mat[i]===MAT.water||map.rampartWall[i])return;mat[i]=m;clear[i]=1;forest[i]=0;},.5);
  const [ogx]=CASTLE_GATES.outer[0],gateX=ogx*C+1,[igx]=CASTLE_GATES.inner[0],igX=igx*C+1,[pgx]=CASTLE_GATES.postern[0],pgX=pgx*C+1,[ngx]=CASTLE_GATES.innerNorth[0],ngX=ngx*C+1;
  road([[ENTRY[0],H+2],[ENTRY[0]-3,268],[gateX+4,246],[gateX,226],[gateX,214]],5.2);
  road([[gateX,196],[gateX,186],[igX-4,182],[igX,176]],4.4,MAT.cobble);
  road([[pgX,72],[pgX,82],[ngX+6,88],[ngX,96]],3.6,MAT.cobble);
  road([[pgX,55],[pgX+4,40],[EXIT[0]-6,22],[EXIT[0],-2]],4.2);
  road([[gateX+6,240],[214,236],[250,232],[270,222],[284,198],[286,172],[284,140],[262,110],[244,44],[EXIT[0]+6,24]],3.4);
  road([[gateX-4,250],[130,256],[100,254],[70,236]],3.2);
  road([[ENTRY[0]-4,270],[136,276],[96,280],[60,272]],2.6);
  road([[100,254],[78,226],[60,196],[50,168]],2.8);

  // ---------------------------------------------------------------- bridges
  // Each painted bridge spans real water at ground level, as the sunken moat's banks read: the deck's near edge sits on
  // the near bank, its far edge on the far bank or pier, its arch and piers fall away into the water below. The deck
  // is the walkable crossing; the bridge sorts from its far end, so walkers on it draw on its deck.
  const BRIDGE_DECK=154;   // src px from the deck's near edge to its far edge along the span
  const bridge=(x,nearY,farY,kind)=>{
    const spr=castleCutout('castle_landmark_17_bridge_approach','castle_landmarks','deck');if(!spr)return;
    const k=(nearY-farY)*32/BRIDGE_DECK,[px,py]=scr(x,nearY),[ax,ay]=scr(x-1,farY);
    rect(x-1,farY,x,nearY-1,(xx,yy,i)=>{map.block[i]=0;forest[i]=0;clear[i]=1;});
    props.push({kind:'scatter',x:x-1,y:farY,spr:{...spr,ox:spr.ox+(px-ax)/k,oy:spr.oy+(py-ay)/k},k,flip:false,z:0,fixedK:true,bridge:kind});
    map.castleBridges.push({x:x-.5,y:(nearY+farY)/2,kind,near:nearY,far:farY});
    for(const [lx,ly] of [[x,nearY+2],[x,farY-2]])blob(lx,ly,7,7,(xx,yy,i)=>{clear[i]=1;forest[i]=0;},.2);   // open landings
  };
  // The main bridge, from the outer bank to a stone pier where the gatehouse's drawbridge comes down.
  const pierY=MOAT.y1-MOAT.w+1;
  rect(gateX-2,pierY,gateX+1,pierY+1,(x,y,i)=>{map.block[i]=0;mat[i]=MAT.dark;});
  bridge(gateX,MOAT.y1+1,pierY+2,'main');
  bridge(pgX,MOAT.y0+MOAT.w,MOAT.y0,'postern');
  // The east road crosses the outflow.
  {const bx=285;let y0=999,y1=-1;for(let y=120;y<190;y++)if(mat[I(bx,y)]===MAT.water||mat[I(bx-1,y)]===MAT.water){y0=Math.min(y0,y);y1=Math.max(y1,y);}
    if(y1>0)bridge(bx,y1+1,y0,'river');}

  // ---------------------------------------------------------------- the keep and the halls
  // The great keep stands at the head of the inner ward; the halls are enterable rooms with their own floors.
  // Its footprint is about 12 x 12 tiles behind the front corner where the art's pivot stands.
  const KEEP=[170,114],KEEP_K=1.6,KF=[KEEP[0]-7,KEEP[1]-7,KEEP[0]+4,KEEP[1]+4];
  {const spr=castleObject('castle_landmark_09_small_keep_complex','castle_landmarks');if(!spr)throw new Error('Missing castle keep art');
    rect(KF[0],KF[1],KF[2],KF[3],(x,y,i)=>{map.block[i]=1;clear[i]=1;mat[i]=MAT.wall;});
    slicedRect(spr,[KF[2]+1,KF[3]+1],KEEP_K,[KF[0],KF[1],KF[2]+1,KF[3]+1],{keep:true});}
  rect(KEEP[0]-14,KEEP[1]-12,KEEP[0]+12,KEEP[1]+14,(x,y,i)=>{if(!map.block[i])mat[i]=MAT.pave;});
  const hallF=floors.length,TH_F=F.pave[0]-1,AISLE=F.dark[0]-1,CH_F=F.gravel[2]-1,GH_F=F.plank[0]-1;
  // Room rects in wall cells; doors are [cell x, cell y, door art].
  const rooms=[
    {id:'throne_hall',name:'Throne Hall',rect:[64,51,77,66],floor:TH_F,wallStyle:'keep_wall_01_pale_quarry',
      doors:[[77,58,'door_01_oak_keep_door_SW_open'],[77,59,'door_01_oak_keep_door_SW_open'],[70,66,'door_01_oak_keep_door_SE_open'],[71,66,'door_01_oak_keep_door_SE_open']]},
    {id:'cathedral',name:'Cathedral',rect:[91,51,104,66],floor:CH_F,wallStyle:'keep_wall_01_pale_quarry',
      doors:[[91,58,'door_05_carved_chapel_door_SW_open'],[91,59,'door_05_carved_chapel_door_SW_open'],[97,66,'door_05_carved_chapel_door_SE_open'],[98,66,'door_05_carved_chapel_door_SE_open']]},
    {id:'great_hall',name:'Great Hall',rect:[64,70,77,84],floor:GH_F,wallStyle:'keep_wall_01_pale_quarry',
      doors:[[77,76,'door_04_arched_stable_door_SW_open'],[77,77,'door_04_arched_stable_door_SW_open'],[70,70,'door_01_oak_keep_door_SE_open'],[71,70,'door_01_oak_keep_door_SE_open']]},
  ];
  const keepFamilyFrames=new Map();
  for(const f of castleKeepWallFrames()){const key=f.family+'|'+f.connection_mask,items=keepFamilyFrames.get(key)||[];items.push(f);keepFamilyFrames.set(key,items);}
  const roomWalls=new Map(),roomDoors=[];
  for(const room of rooms){
    const [rx0,ry0,rx1,ry1]=room.rect,doorSet=new Set(room.doors.map(d=>d[0]+','+d[1]));
    rect(rx0*C,ry0*C,rx1*C+1,ry1*C+1,(x,y,i)=>{map.v[i]=room.floor;mat[i]=MAT.hall;map.block[i]=0;clear[i]=1;});
    for(let cy=ry0;cy<=ry1;cy++)for(let cx=rx0;cx<=rx1;cx++){
      if(cx!==rx0&&cx!==rx1&&cy!==ry0&&cy!==ry1)continue;
      if(doorSet.has(cx+','+cy)){roomDoors.push({room:room.id,x:cx,y:cy,asset:room.doors.find(d=>d[0]===cx&&d[1]===cy)[2]});continue;}
      roomWalls.set(cx+','+cy,room);
    }
  }
  for(const [key,room] of roomWalls){const [cx,cy]=key.split(',').map(Number);
    const joined=(nx,ny)=>roomWalls.get(nx+','+ny)===room;
    const mask=(joined(cx,cy-1)?1:0)|(joined(cx+1,cy)?2:0)|(joined(cx,cy+1)?4:0)|(joined(cx-1,cy)?8:0);
    const frames=keepFamilyFrames.get(room.wallStyle+'|'+mask);if(!frames?.length)throw new Error('Missing interior wall topology '+room.wallStyle+' mask '+mask);
    const spr=castleObject(rng.pick(frames).id,'keep_walls',KEEP_STONE);spr.textureVariant=room.wallStyle;
    for(let dy=0;dy<C;dy++)for(let dx=0;dx<C;dx++){const i=I(cx*C+dx,cy*C+dy);map.block[i]=1;map.castleRoomWalls[i]=1;mat[i]=MAT.wall;}
    props.push({kind:'scatter',x:cx*C+1,y:cy*C+1,spr,k:TW/160*.94*C,flip:false,z:0,fixedK:true,roomWall:true});
  }
  for(const d of roomDoors){const spr=castleObject(d.asset,'doors');if(!spr)throw new Error('Missing keep door '+d.asset);
    props.push({kind:'scatter',x:d.x*C+1,y:d.y*C+1,spr,k:Math.min(TW/160*.78*C,125/spr.h),flip:false,z:0,fixedK:true,roomDoor:true});
  }
  const furnish=(fid,x,y,light=0,flip=false,z=0,hk=1)=>{
    const art=castleObject(fid,'furniture');if(!art)throw new Error('Missing keep furnishing '+fid);
    const [spr,k]=castleScaled(art,CASTLE_FURNITURE_HEIGHT[fid]*hk/art.h);
    props.push({kind:'scatter',x,y,spr,k,flip,light,z,fixedK:true});return spr;
  };
  const wallArt=(asset,category,x,y,h)=>add(asset,category,x,y,h,{solid:false});
  const tilesOf=(r)=>[r.rect[0]*C,r.rect[1]*C,r.rect[2]*C+C-1,r.rect[3]*C+C-1];   // a room's outer tile bounds
  const CARPET=floors.length+keepFloors.length;
  const carpet=(xa,xb,ya,yb)=>rect(xa,ya,xb,yb,(x,y,i)=>{map.v[i]=CARPET+(x===xa?1:x===xb?2:0);});
  const pillar=(x,y)=>{const spr=castleObject('keep_wall_01_pale_quarry_stone_pillar','keep_walls',PILLAR_STONE);if(!spr)return;
    props.push({kind:'scatter',x:x+.5,y:y+.5,spr,k:1.2,flip:false,z:0,fixedK:true,pillar:true});block(x,y);};
  const sconce=(x,y,side)=>add('torch_04_twin_sconce_'+side,'torches',x,y,46,{light:3.4,solid:false});
  // Throne hall: a carpet from the doors up the nave to the dais, colonnades either side, armour and banners on the walls.
  {const [x0,y0,x1,y1]=tilesOf(rooms[0]),cx=(x0+x1+1)/2;
    carpet(cx-2,cx+1,y0+7,y1+1);
    furnish('furniture_01_throne_dais',cx,y0+5.4,0,false,0,1.45);rect(cx-3,y0+2,cx+2,y0+6,(x,y,i)=>{map.block[i]=1;});
    for(let y=y0+9;y<=y1-4;y+=5)for(const x of [cx-7,cx+6])pillar(x,y);
    for(let y=y0+11;y<=y1-4;y+=5)for(const x of [cx-3.4,cx+2.6]){furnish('furniture_05_floor_candelabrum',x,y,3.2);block(Math.floor(x),Math.floor(y));}
    for(const x of [cx-4.5,cx+3.5])add('torch_06_unlit_brazier_SE','torches',x,y0+5.5,46,{light:5,solid:true});
    for(const [nm,x,y] of [['banner_pole',cx-6.5,y0+3.4],['banner_pole',cx+5.5,y0+3.4],['shield_rack',x0+4.5,y0+3.4],['spear_bundle',x1-3.5,y0+3.4],
      ['armor_stand',x0+3.4,y0+12],['armor_stand',x0+3.4,y0+17],['armor_stand',x0+3.4,y0+22],['armor_stand',x1-2.6,y0+12],['armor_stand',x1-2.6,y0+22],
      ['blank_map_stand',x1-3.5,y1-3.6],['trestle_table',x1-5.5,y1-5],['guard_stool',x1-5.4,y1-3.4],['guard_stool',x1-7.4,y1-5.2],['wax_tablet',x1-5.6,y1-5.2]])P(nm,x,y);
    for(const x of [cx-9.5,cx+8.5])wallArt('castle_hanging_01_05_crown_roots_SE','wall_hangings',x,y0+2.1,76);
    for(const x of [cx-3.5,cx+2.5])wallArt('window_03_lancet_keep_SE','windows',x,y0+2.1,64);
    for(const y of [y0+9.5,y0+19.5])wallArt('castle_hanging_01_04_gate_sun_SW','wall_hangings',x0+2.1,y,72);
    for(const y of [y0+14.5,y0+24.5])sconce(x0+2.1,y,'SW');
    for(const y of [y0+11,y0+21])furnish('furniture_04_hanging_chandelier',cx,y,3.0,false,34);}
  // Chapel: the pulpit and altar candles in the apse, pews either side of a carpeted nave, side aisles behind colonnades.
  {const [x0,y0,x1,y1]=tilesOf(rooms[1]),cx=(x0+x1+1)/2;
    carpet(cx-2,cx+1,y0+8,y1+1);
    rect(cx-5,y0+2,cx+4,y0+7,(x,y,i)=>{map.v[i]=F.pave[0]-1;});
    furnish('furniture_03_cathedral_pulpit',cx,y0+5.4,1.8,false,0,1.35);rect(cx-2,y0+3,cx+1,y0+6,(x,y,i)=>{map.block[i]=1;});
    for(let row=0;row<6;row++){const y=y0+10.6+row*2.8;for(const x of [cx-7.4,cx-4.6,cx+3.8,cx+6.6]){furnish('furniture_02_cathedral_pew',x,y,0,x>cx);block(Math.floor(x),Math.floor(y));}}
    for(let y=y0+9;y<=y1-4;y+=5)for(const x of [x0+5,x1-5])pillar(x,y);
    for(const [x,y] of [[cx-4.5,y0+4.5],[cx+3.5,y0+4.5],[cx-3.4,y1-3.5],[cx+2.6,y1-3.5]]){furnish('furniture_05_floor_candelabrum',x,y,4.5);block(Math.floor(x),Math.floor(y));}
    for(const y of [y0+12.5,y0+19.5,y0+26.5])furnish('furniture_04_hanging_chandelier',cx,y,3.0,false,34);
    for(const x of [cx-8.5,cx+7.5])wallArt('window_05_twin_lancet_SE','windows',x,y0+2.1,66);
    wallArt('castle_hanging_02_05_pilgrim_stars_SE','wall_hangings',cx,y0+2.1,80);
    for(const y of [y0+11.5,y0+21.5])wallArt('window_08_deep_recess_arch_SW','windows',x0+2.1,y,64);
    for(const y of [y0+16.5,y0+26.5])sconce(x0+2.1,y,'SW');
    for(const [nm,x,y] of [['flower_urn',cx-2.6,y0+7.4],['flower_urn',cx+1.6,y0+7.4],['lantern_bell',x0+3.5,y0+3.5],['statue_fragment',x1-3,y0+3.6],['potted_cypress',x0+3.5,y1-3.5],['potted_cypress',x1-3,y1-3.5]])P(nm,x,y);}
  // Great hall: the high table at the far end, two long feasting tables down a timber floor, the hearth between them.
  {const [x0,y0,x1,y1]=tilesOf(rooms[2]),cx=(x0+x1+1)/2;
    const table=(x,y,flip)=>add('scatter_09_trestle_table','scatter',x,y,44,{flip,solid:true}),bench=(x,y,flip)=>add('scatter_10_guard_bench','scatter',x,y,30,{flip,solid:true});
    for(let x=cx-6;x<=cx+5;x+=1.5)table(x,y1-5,false);
    for(let x=cx-5.5;x<=cx+5;x+=2.6)P('guard_stool',x,y1-3.4);
    for(const tx of [cx-6,cx+5]){for(let y=y0+6;y<=y1-10;y+=1.5)table(tx,y,true);
      for(let y=y0+6.4;y<=y1-10;y+=2.2){bench(tx-1.6,y,true);bench(tx+1.6,y,true);}
      for(let y=y0+7;y<=y1-11;y+=3.5)P(rng.pick(['stoneware_jugs','bread_basket','iron_cups']),tx+.1,y+.4,{solid:false});}
    P('stone_firepit',cx,y0+13,{light:5.5,smoke:3});rect(cx-1,y0+12,cx,y0+13,(x,y,i)=>{map.block[i]=1;});P('cookpot',cx+.6,y0+12.2);
    for(const [nm,x,y] of [['cookpot',x0+3.5,y0+3.5],['bread_basket',x0+6,y0+3.2],['stoneware_jugs',x0+8.4,y0+3.2],['water_cask',x1-3,y0+3.5],
      ['crate_stack',x1-3,y1-3],['grain_sack',x1-5.6,y1-2.8],['apple_sack',x0+3.6,y1-3.4],['cabbage_basket',x0+6,y1-3.2],['leaned_shields',x0+3.4,y0+14],['armor_stand',x1-2.6,y0+9]])P(nm,x,y);
    for(const x of [cx-8.5,cx+7.5])wallArt('window_04_shuttered_square_SE','windows',x,y0+2.1,60);
    wallArt('castle_hanging_01_09_crossed_hammers_SE','wall_hangings',cx,y0+2.1,78);
    for(const y of [y0+9.5,y0+19.5])sconce(x0+2.1,y,'SW');
    for(const y of [y0+8,y0+18])furnish('furniture_04_hanging_chandelier',cx,y,3.0,false,32);}
  for(const [asset,cat,x,y,h] of [['sign_02_hall_plaque_SW','signs',156.6,113,60],['sign_05_chapel_plaque_SW','signs',181.4,113,60],['sign_11_kitchen_plaque_SW','signs',156.6,151,60]])wallArt(asset,cat,x,y,h);

  // ---------------------------------------------------------------- inner ward: courtyard and garden
  // Flagstones round the keep and the halls, a walled garden with cross paths and a fountain, the well and stores.
  rect(ix0,iy0,ix1,iy1,(x,y,i)=>{if(mat[i]!==MAT.hall&&!map.castleRoomWalls[i]&&(y<iy0+3||x<ix0+3||x>ix1-3||y>iy1-3))mat[i]=MAT.pave;});
  rect(156,134,182,140,(x,y,i)=>{if(mat[i]!==MAT.hall&&!map.castleRoomWalls[i])mat[i]=MAT.pave;});
  rect(igX-2,140,igX+1,iy1,(x,y,i)=>{mat[i]=MAT.pave;});
  // The walled garden: four lawns quartered by gravel walks, clipped hedges round each, the fountain at the crossing.
  const GDN=[160,146,186,166],gcx=(GDN[0]+GDN[2]+1)/2,gcy=(GDN[1]+GDN[3]+1)/2;
  rect(GDN[0],GDN[1],GDN[2],GDN[3],(x,y,i)=>{mat[i]=MAT.bright;});
  const walk=(x,y,i)=>{mat[i]=MAT.moss;clear[i]=1;};
  rect(GDN[0],Math.floor(gcy)-1,GDN[2],Math.floor(gcy),walk);rect(Math.floor(gcx)-1,GDN[1],Math.floor(gcx),GDN[3],walk);
  rect(GDN[0],GDN[1],GDN[2],GDN[1]+1,walk);rect(GDN[0],GDN[3]-1,GDN[2],GDN[3],walk);rect(GDN[0],GDN[1],GDN[0]+1,GDN[3],walk);rect(GDN[2]-1,GDN[1],GDN[2],GDN[3],walk);
  blob(gcx,gcy,3.6,3.6,walk,.01);
  P('fountain_statue',gcx,gcy);rect(Math.floor(gcx)-1,Math.floor(gcy)-1,Math.floor(gcx),Math.floor(gcy),(x,y,i)=>{map.block[i]=1;});
  for(const [qx0,qy0,qx1,qy1] of [[GDN[0]+2,GDN[1]+2,gcx-2,gcy-2],[gcx+1,GDN[1]+2,GDN[2]-2,gcy-2],[GDN[0]+2,gcy+1,gcx-2,GDN[3]-2],[gcx+1,gcy+1,GDN[2]-2,GDN[3]-2]]){
    // a hedge round the lawn, open at the corner nearest the fountain
    for(let x=qx0+.5;x<=qx1;x+=1.15)for(const y of [qy0+.2,qy1+.6])if(Math.hypot(x-gcx,y-gcy)>5)P('clipped_hedge',x,y);
    for(let y=qy0+1.4;y<=qy1-.4;y+=1.15)for(const x of [qx0+.2,qx1+.6])if(Math.hypot(x-gcx,y-gcy)>5)P('clipped_hedge',x,y);
    const mx=(qx0+qx1)/2,my=(qy0+qy1)/2;P(rng.chance(.5)?'topiary_spiral':'potted_cypress',mx,my);
    for(const [dx,dy] of [[-2.5,-1.5],[2.5,1.5],[-2.5,1.5],[2.5,-1.5]])P(rng.chance(.6)?'rose_bush':'flower_urn',mx+dx,my+dy);
  }
  for(const [x,y] of [[gcx-4.6,gcy-2.4],[gcx+3.8,gcy+1.8]])P('stone_bench',x,y);
  for(const [x,y] of [[gcx,GDN[1]-.4],[gcx,GDN[3]+1],[GDN[0]-.4,gcy],[GDN[2]+1,gcy]])P('ivy_arch',x,y,{solid:false});
  P('sundial',GDN[0]+3.5,gcy+3.5);P('birdbath',GDN[2]-3,gcy-3.5);
  for(const [x,y] of [[gcx-2.5,gcy-2.5],[gcx+2.5,gcy+2.5]])P('flower_urn',x,y);
  // the well and the kitchen stores in the south-east corner, by the inner gate
  for(const [nm,x,y] of [['well_roofed',200.5,152.5],['stone_trough',203.6,154.6],['bucket_pair',199,155.4],['water_barrel',206.5,160.5],['crate_stack',208.5,162.5],
    ['grain_sack',206.6,164.4],['firewood_stack',208.6,157],['handcart',203,166.5],['herb_drying_rack',196.5,166.5],['cookpot',199,163.8],['laundry_line',210,150]])P(nm,x,y);
  for(const [x,y] of [[igX-3,169],[igX+2,169],[KEEP[0]-6,128],[KEEP[0]+6,128]])add('torch_06_unlit_brazier_SE','torches',x+.5,y+.5,46,{light:5,solid:true});

  // ---------------------------------------------------------------- outer ward
  // South bailey: the cobbled lane from the gatehouse to the inner gate, the practice yard, market stalls, banners.
  for(const [x,y] of [[gateX-3,193],[gateX+2,193]])P('banner_pole',x+.5,y+.5);
  for(let i=0;i<3;i++){P('practice_dummy',134.5+i*4,186.5);P('archery_target',134.5+i*4,180.5);}
  for(const [nm,x,y] of [['bow_rack',128.5,183.5],['arrow_bundle',128.5,180],['crossbow_rack',148.5,179.6],['guard_bench',148,186],['helmet_post',152.6,183],['shield_rack',129,188.6]])P(nm,x,y);
  // the smithy and the armoury against the south curtain
  const town=(nm)=>A.town?townObject(nm):null;
  const T=(name,x,y,h,solid=true)=>{const spr=town(name);if(!spr)return null;const p={kind:'scatter',x,y,spr,k:h/spr.h,flip:false,z:0,fixedK:true};props.push(p);if(solid)block(Math.floor(x),Math.floor(y));return p;};
  // a town-pack house on an n x n footprint (the pack draws its 2 x 2 house art at n/2 x)
  const house=(name,x0,y0,flip=false,tag=null,fp=3)=>{const spr=town('b_'+name);if(!spr)return null;
    for(let y=y0;y<y0+fp;y++)for(let x=x0;x<x0+fp;x++){block(x,y);clear[I(x,y)]=1;forest[I(x,y)]=0;}
    const b={cx:x0+fp/2,cy:y0+fp/2,spr,k:TW/160*fp/2,depth:x0+y0+fp,flip,name,x0,y0,tag,fp};buildings.push(b);
    if(/cottage|inn|bakery|upgrade/.test(name))props.push({kind:'emitter',x:b.cx-.6,y:b.cy-.6,smoke:1.6,smokeZ:spr.h*b.k*.78});return b;};
  // the town pack's houses are 3 x 3; the castle's outbuildings are drawn 1.7x on a 5 x 5 footprint
  const hall=(name,x0,y0,flip=false,tag=null)=>house(name,x0,y0,flip,tag,5);
  hall('upgrade',206,184,false,'smithy');P('stone_firepit',207.4,191.2,{light:4,smoke:3});hall('weapons',216,184,false,'armoury');
  for(const [nm,x,y] of [['blacksmith_anvil',210,191],['grindstone',213.6,190.6],['water_barrel',221.5,191.4],['crate_stack',224,190.6],['iron_chain',211.6,192.6]])P(nm,x,y);
  // West ward: the stables and paddock, hay and troughs.
  hall('stables',104,120,true,'stables');hall('stables',104,140,true,'stables');
  for(const [nm,x,y] of [['pig_trough',111.5,123.5],['stone_trough',111.5,143.5],['water_barrel',111.4,127],['handcart',112.6,148],['grain_sack',110.5,131.4],['bucket_pair',112,135.5]])P(nm,x,y);
  for(const [x,y] of [[113.5,121],[114.6,122.4],[113.2,141],[114.8,142.2],[118,130],[119.2,131.4]])T('hay_bale',x,y,26);
  for(const [x,y] of [[116,126.5],[116,146.5]])T('horse_trough',x,y,24);
  T('cart_debris',119,150,30);T('workbench',118.5,136.5,28);T('tool_rack',117,138.6,40);
  for(let y=156;y<=176;y+=2){add('scatter_83_timber_barricade','scatter',104.5,y+.5,26);add('scatter_83_timber_barricade','scatter',117.5,y+.5,26);}
  rect(105,156,117,177,(x,y,i)=>{mat[i]=MAT.mud;});
  for(const [nm,x,y] of [['pig_trough',110.5,166.5],['firewood_stack',113,160.5],['broken_wheel',107.4,170.6]])P(nm,x,y);
  // North ward: the kitchen garden (tilled beds), orchard, beehive roosts and the dovecote.
  for(let b=0;b<5;b++){const x0=110+b*7;rect(x0,76,x0+4,88,(x,y,i)=>{mat[i]=MAT.field;clear[i]=1;});
    for(let y=77;y<88;y+=3)S(rng.chance(.5)?'106_cabbage_basket':'68_herb_bundle',x0+2.5,y+.5,{solid:false});}
  for(const [x,y] of [[150,78],[156,80],[162,77],[184,79],[190,82],[196,77],[226,80],[232,86]])add(rng.pick(['tree_01_small_young_apple','tree_08_medium_orchard_pear']),'trees',x+.5,y+.5,rng.chance(.5)?70:110,{solid:true});
  for(const [nm,x,y] of [['bird_roost',176,78],['nest_box',178.6,79.6],['herb_drying_rack',145,86],['covered_basket',147,86.4],['apple_sack',150.6,85.6]])P(nm,x,y);
  // East ward: the mason's yard, where a stretch of the curtain is being repaired: scaffolds and a hoist against it,
  // dressed stone, spare merlons and mortar troughs in the yard.
  const big=(nm,x,y,h)=>add(SCATTER_ART[nm]||scatterIds.get(nm),'scatter',x,y,h,{solid:true});
  for(const y of [116,121,126])big('scaffold_frame',233.5,y,128);
  big('pulley_block',231.4,123.6,110);big('rope_pulley',231.6,129.4,96);big('ladder',232.6,131.6,80);
  for(const [nm,x,y] of [['stone_blocks',224,118],['stone_blocks',222.6,120.4],['stone_blocks',226,131],['spare_merlons',220,124],['spare_merlons',221.6,126.4],
    ['mortar_trough',224.6,126.2],['mortar_bucket',226.4,127.4],['wheelbarrow',228,134.6],['roof_slate_stack',218,133],['column_drums',220,140],
    ['carved_capital',223,141.6],['mason_square',226,138.4],['stone_trowels',218.4,137],['large_rubble',230,140],['rubble_pile',232,137.4],['tool_chest',224,136]])P(nm,x,y);
  hall('cottage',222,150,true,'barracks');hall('inn',222,162,true,'barracks');
  for(const [nm,x,y] of [['guard_stool',219,156],['folded_blankets',219.4,158],['stretcher',218.6,166],['medicine_box',219,169],['dressing_bowl',220.6,170.4]])P(nm,x,y);
  // Wall-walk stairs against the inside of the outer curtain, and lanterns along the lane.
  const stair=(asset,x,y,k,flip=false)=>{const p=art(asset,x,y,k,{stair:true});p.flip=flip;block(Math.floor(x),Math.floor(y));block(Math.floor(x)-1,Math.floor(y));};
  stair('castle_landmark_11_stair_landing_and_wall',126,72.4,.62);stair('castle_landmark_11_stair_landing_and_wall',186,72.4,.62);
  stair('castle_landmark_11_stair_landing_and_wall',100.4,110,.62,true);stair('castle_landmark_11_stair_landing_and_wall',100.4,178,.62,true);
  for(const [x,y] of [[112,72.6],[146,72.6],[200,72.6],[226,72.6],[99,96],[99,130],[99,160],[99,188],[238.6,96],[238.6,130],[238.6,160]])
    add('torch_05_stone_lantern_SE','torches',x,y,40,{light:4.2,solid:true});
  for(const [x,y] of [[gateX-3,197.2],[gateX+2.6,197.2]])add('torch_06_unlit_brazier_SE','torches',x+.5,y,46,{light:5,solid:true});

  // ---------------------------------------------------------------- outside the walls
  // The village on the approach road: cottages, the inn and the bakery round a green with a well and a market stall,
  // fenced kitchen gardens, hay and woodpiles; the town pack's houses at castle scale (4 x 4 tiles).
  const vx=gateX,vy=252;
  rect(vx-16,vy-9,vx+16,vy+9,(x,y,i)=>{if(mat[i]!==MAT.road)mat[i]=n(x,y,4)>.55?MAT.dirt:MAT.meadow;forest[i]=0;clear[i]=1;});
  for(const [name,x0,y0,flip] of [['cottage',vx-13,vy-8,false],['bakery',vx-13,vy+3,true],['inn',vx+8,vy-8,true],['cottage',vx+8,vy+4,true],
    ['stables',vx+14,vy-2,true],['cottage',vx-22,vy-4,false],['cottage',vx+19,vy+9,true],['cottage',vx-8,vy+14,false]])house(name,x0,y0,flip,null,4);
  for(const [nm,x,y] of [['well_roofed',vx-4.5,vy+.5,{h:104}],['handcart',vx+4,vy+5],['crate_stack',vx-7.5,vy-1.4],['water_barrel',vx+5.6,vy-3.6],['apple_sack',vx+3.6,vy+6.6],
    ['laundry_line',vx-9,vy+7.6],['firewood_stack',vx-16.5,vy-1],['bucket_pair',vx-3,vy+2.6],['bread_basket',vx-8.8,vy+2.4]])nm==='well_roofed'?add(SCATTER_ART[nm]||'scatter_01_well_roofed','scatter',x,y,104,{solid:true}):P(nm,x,y);
  T('market_table',vx+4.5,vy-1.5,34);T('vegetable_basket',vx+5.6,vy-.2,18,false);T('hay_bale',vx+17,vy+3.4,26);T('hay_bale',vx+18.4,vy+4.6,26);T('horse_trough',vx+13,vy+3.5,24);
  // kitchen gardens behind the houses, fenced with split rails
  for(const [gx0,gy0] of [[vx-22,vy+2],[vx+20,vy-7]]){rect(gx0,gy0,gx0+5,gy0+4,(x,y,i)=>{mat[i]=MAT.field;clear[i]=1;});
    for(let x=gx0;x<=gx0+5;x+=1.6){T('split_rail_fence',x+.5,gy0-.3,30);T('split_rail_fence',x+.5,gy0+5.3,30);}
    for(let y=gy0+1;y<=gy0+4;y+=2.4)T('vegetable_basket',gx0+2.5,y+.5,16,false);}
  for(let t=0;t<14;t++){const x=vx+rng.range(-15,15),y=vy+rng.range(-8,8),i=I(x|0,y|0);if(!map.block[i]&&mat[i]!==MAT.road)T(rng.pick(['wildflowers','leafy_shrub','sawn_stump']),x,y,rng.range(16,26),false);}
  // Fields and an orchard to the south-west: furrowed strips, a scarecrow, split-rail fences and haystacks.
  for(let f=0;f<4;f++){const x0=34+f*19,y0=212+(f%2)*14;rect(x0,y0,x0+14,y0+11,(x,y,i)=>{if(mat[i]===MAT.water||mat[i]===MAT.road)return;mat[i]=MAT.field;forest[i]=0;clear[i]=1;});
    P('practice_dummy',x0+7.5,y0+5.5);T('hay_bale',x0+15.2,y0+2,26);
    for(let x=x0;x<=x0+14;x+=1.6)T('split_rail_fence',x+.5,y0+11.8,30);}
  for(let r=0;r<4;r++)for(let c=0;c<6;c++){const x=40+c*7+(r%2)*3,y=246+r*7;if(!clear[I(x,y)]&&mat[I(x,y)]!==MAT.water){forest[I(x,y)]=0;
    add(rng.pick(['tree_01_small_young_apple','tree_08_medium_orchard_pear','tree_01_small_young_apple']),'trees',x+.5,y+.5,rng.chance(.4)?110:72,{solid:true});}}
  // reeds along the river
  for(let t=0;t<900;t++){const x=rng.int(4,W-5),y=rng.int(4,H-5),i=I(x,y);if(mat[i]!==MAT.sand||map.block[i])continue;T(rng.chance(.7)?'dry_reeds':'fieldstone_cluster',x+rng.range(.2,.8),y+rng.range(.2,.8),rng.range(22,34),false);}
  // The graveyard west of the moat, by the river: headstones in rows, a broken statue, an old wall.
  const GY=[56,176];rect(GY[0]-14,GY[1]-12,GY[0]+14,GY[1]+12,(x,y,i)=>{if(mat[i]!==MAT.water&&mat[i]!==MAT.sand){mat[i]=n(x,y,3)>.6?MAT.lush:MAT.grave;forest[i]=0;clear[i]=1;}});
  for(let r=0;r<5;r++)for(let c=0;c<6;c++)if(rng.chance(.82))S(rng.chance(.7)?'73_milestone':'74_boundary_post',GY[0]-10+c*4+(r%2)*1.5,GY[1]-8+r*4);
  S('35_statue_fragment',GY[0],GY[1]-11);S('44_column_drums',GY[0]+11,GY[1]-10);S('116_broken_bench',GY[0]-11,GY[1]+10);
  art('castle_landmark_02_gatehouse_wall_turn',GY[0]+1,GY[1]+13.5,.5,{ruin:true});rect(GY[0]-6,GY[1]+11,GY[0]+8,GY[1]+13,(x,y,i)=>{map.block[i]=1;});
  // The enemy's siege lines south-east of the castle: a palisade of wicker, stakes and sandbags facing the walls, the
  // siege engines behind it with their ammunition, and the camp of tents round its fires.
  const SG=[262,236];
  blob(SG[0],SG[1],26,19,(x,y,i)=>{if(mat[i]===MAT.water||mat[i]===MAT.road)return;mat[i]=n(x,y,3)>.5?MAT.mud:MAT.dirt;forest[i]=0;clear[i]=1;},.25,6);
  for(let a=0;a<30;a++){const t=a/29,x=SG[0]-23+t*40,y=SG[1]-17+t*6-Math.sin(t*Math.PI)*5;
    if(a%10===5)continue;   // gaps to sally out through
    P(a%3===0?'sharpened_stakes':a%3===1?'wicker_barricade':'sandbags',x,y);}
  const engines=[],tents=[];
  for(const [x,y] of [[SG[0]-13,SG[1]-6],[SG[0]-3,SG[1]-9],[SG[0]+7,SG[1]-7],[SG[0]+15,SG[1]-2]]){engines.push([x+1.5,y+3]);
    P('siege_engine',x,y);rect(Math.floor(x)-1,Math.floor(y)-1,Math.floor(x)+1,Math.floor(y),(xx,yy,i)=>{map.block[i]=1;});
    P('stone_blocks',x+2.4,y+.6);P('large_rubble',x+2.2,y+2);P('rope_coil',x-1.6,y+1.6,{solid:false});}
  P('scaffold_frame',SG[0]-24,SG[1]-2);P('scaffold_frame',SG[0]-22.6,SG[1]-.8);P('pulley_block',SG[0]-21.4,SG[1]-2.6);P('ladder',SG[0]-25,SG[1]+.8);
  for(const [x,y,v] of [[SG[0]-11,SG[1]+3,0],[SG[0]-6,SG[1]+6,1],[SG[0]-1,SG[1]+8,0],[SG[0]+5,SG[1]+8,2],[SG[0]+11,SG[1]+6,0],[SG[0]+15,SG[1]+3,1],[SG[0]-14,SG[1]+9,2],[SG[0]+8,SG[1]+13,0],[SG[0]-5,SG[1]+13,1],[SG[0]+2,SG[1]+2,2]]){
    const spr=castleTent(v),p={kind:'scatter',x,y,spr,k:.95,flip:rng.chance(.4),z:0,fixedK:true,tent:true};props.push(p);tents.push([x,y]);
    rect(Math.floor(x)-1,Math.floor(y)-1,Math.floor(x)+1,Math.floor(y),(xx,yy,i)=>{map.block[i]=1;});}
  for(const [x,y] of [[SG[0]-7,SG[1]+1],[SG[0]+8,SG[1]+2],[SG[0]+1,SG[1]+11]]){P('stone_firepit',x,y,{light:4.5,smoke:4});P('cookpot',x+.6,y-.4);
    for(const [dx,dy] of [[-2,1],[2,1.4],[0,-2.2]])P(rng.pick(['folded_blankets','guard_stool','covered_basket']),x+dx,y+dy);}
  for(const [nm,x,y] of [['banner_pole',SG[0]-4,SG[1]-2],['banner_pole',SG[0]+12,SG[1]],['banner_pole',SG[0]+4,SG[1]+5],['crate_stack',SG[0]+18,SG[1]+9],['grain_sack',SG[0]+19.6,SG[1]+10.4],
    ['arrow_bundle',SG[0]-17,SG[1]+3],['spear_bundle',SG[0]-18,SG[1]+5],['crossbow_rack',SG[0]-16,SG[1]+6.6],['empty_cage',SG[0]+4,SG[1]+17],['empty_cage',SG[0]+6.5,SG[1]+17.6],
    ['iron_spikes',SG[0]-19,SG[1]-4],['water_cask',SG[0]+17,SG[1]+12],['stretcher',SG[0]-9,SG[1]+15],['medicine_box',SG[0]-10,SG[1]+17],['covered_supply_crate',SG[0]+19,SG[1]+7],
    ['handcart',SG[0]-2,SG[1]+3],['firewood_stack',SG[0]+10,SG[1]+9.6],['water_barrel',SG[0]-12,SG[1]+12],['sandbags',SG[0]+14,SG[1]+14]])P(nm,x,y);
  // A ruined watchtower in the north-east woods.
  const RW=[290,64];blob(RW[0],RW[1],9,7,(x,y,i)=>{mat[i]=n(x,y,3)>.5?MAT.moss:MAT.meadow;forest[i]=0;clear[i]=1;},.3);
  art(SQ,RW[0]-1,RW[1]+1,WALL_K*.95,{ruin:true});rect(RW[0]-3,RW[1]-3,RW[0]+1,RW[1]+1,(x,y,i)=>{map.block[i]=1;});
  for(const [nm,x,y] of [['large_rubble',RW[0]+3,RW[1]+2],['rubble_pile',RW[0]-4,RW[1]+3],['stone_blocks',RW[0]+4,RW[1]-2],['spare_merlons',RW[0]-1,RW[1]+4.5]])P(nm,x,y);

  // ---------------------------------------------------------------- loose scatter and trees
  const reserved=(x,y)=>[ENTRY,EXIT].some(p=>dist(x,y,p)<6);
  let scatter=0;
  const looseOut=['40_rubble_pile','42_small_rubble','34_broken_wheel','24_stone_blocks','73_milestone','105_apple_sack','81_sandbags','43_large_rubble','04_broken_barrel'];
  for(let t=0;t<20000&&scatter<520;t++){
    const x=rng.int(4,W-5)+.5,y=rng.int(4,H-5)+.5,i=I(x|0,y|0);
    if(map.block[i]||clear[i]||forest[i]||mat[i]===MAT.water||reserved(x,y)||!map.circleFree(x,y,.6))continue;
    if(inOuter(x,y)&&rng.chance(.7))continue;
    if(S(rng.pick(looseOut),x,y,{solid:rng.chance(.5)}))scatter++;
  }
  // Ground cover: small walk-over clutter.
  for(let t=0;t<9000;t++){const x=rng.int(3,W-4)+.5,y=rng.int(3,H-4)+.5,i=I(x|0,y|0);
    if(map.block[i]||mat[i]===MAT.water||mat[i]===MAT.hall||mat[i]===MAT.pave||mat[i]===MAT.dark||map.rampartDeck[i])continue;
    if(rng.chance(.06))S(rng.pick(['41_cracked_paving','42_small_rubble','26_mason_tools','105_apple_sack']),x+rng.range(-.3,.3),y+rng.range(-.3,.3),{solid:false});}
  // The forest: the Dark Forest's towering trees in the deep wood, the castle pack's trees on its fringe and in groves.
  const dfOK=darkForestTreesReady(),grid=new Int32Array(N);
  const fringeTrees=castleFrames('trees').filter(f=>/medium|large/.test(f.id)).map(f=>f.id);
  const treeH=(id)=>{for(const [k,h] of Object.entries(TREE_H))if(id.includes(k))return h;return 120;};
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    const i=I(x,y);if(clear[i]||mat[i]===MAT.water||map.block[i])continue;
    const deep=forest[i]&&Math.min(x,y,W-1-x,H-1-y)<8+n(x,y+500,18)*16,grove=!forest[i]&&!inOuter(x,y)&&n(x+90,y+40,14)>.7;
    if(!forest[i]&&!grove)continue;
    const sp=deep?2.5:forest[i]?3:3.4;
    if(!rng.chance(deep?.5:forest[i]?.36:.18)||dist(x,y,ENTRY)<9)continue;   // a glade where the hero arrives
    const px=x+.5+rng.range(-.25,.25),py=y+.5+rng.range(-.25,.25),R=Math.ceil(sp);let ok=true;
    for(let dy=-R;dy<=R&&ok;dy++)for(let dx=-R;dx<=R&&ok;dx++){const j=I(Math.min(W-1,Math.max(0,x+dx)),Math.min(H-1,Math.max(0,y+dy)));
      if(grid[j]){const t=trees[grid[j]-1];if(Math.hypot(t.x-px,t.y-py)<sp)ok=false;}}
    if(!ok)continue;
    let p=null;
    if(dfOK&&forest[i]&&(deep||rng.chance(.45))){const spr=darkForestTree(rng.pick(FOREST_TREES));if(spr)p={kind:'scatter',x:px,y:py,spr,k:darkTreeK(rng.range(.62,.82)),flip:rng.chance(.5),tree:true};}
    if(!p){const id=rng.pick(fringeTrees),spr=castleObject(id,'trees');if(!spr)continue;
      p={kind:'scatter',x:px,y:py,spr,k:treeH(id)*rng.range(.85,1.15)/spr.h,flip:rng.chance(.5),z:0,fixedK:true};}
    trees.push(p);grid[i]=trees.length;map.block[i]=1;
    if(forest[i])mat[i]=n(x,y,5)>.5?MAT.forest:MAT.lush;
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=I(x,y);if(forest[i]&&!clear[i]&&mat[i]!==MAT.water&&mat[i]!==MAT.sand)mat[i]=n(x,y,4)>.55?MAT.forest:MAT.lush;}
  // Undergrowth between the trunks at the wood's edge.
  for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){const i=I(x,y);if(!forest[i]||clear[i]||map.block[i]||mat[i]===MAT.water)continue;
    if(rng.chance(.025))S(rng.pick(['18_rose_bush','40_rubble_pile','34_broken_wheel']),x+.5,y+.5,{solid:true});}
  const B=8,bw=W/B,bh=H/B,cells=Array.from({length:bw*bh},()=>[]);
  for(const t of trees){if(t.tree)cells[Math.floor(t.y/B)*bw+Math.floor(t.x/B)].push(t);else props.push(t);}
  map.treeCells={B,bw,bh,cells};

  // ---------------------------------------------------------------- floors
  // Each material picks its tiles from low-frequency noise, so patches of one texture run together instead of a checker.
  const pick=(list,x,y,s=7,salt=0)=>list[Math.min(list.length-1,Math.floor(n(x+salt,y-salt,s)*list.length*1.15)%list.length)]-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=I(x,y),m=mat[i];if(m===MAT.hall)continue;
    map.v[i]=m===MAT.meadow?pick(F.meadow,x,y,9):m===MAT.mid?pick(F.mid,x,y,8,20):m===MAT.bright?pick(F.bright,x,y,6,40):m===MAT.lush||m===MAT.grave?pick(F.lush,x,y,8,80):
      m===MAT.forest?pick(F.lush,x,y,5,120):m===MAT.dirt?pick(F.dirt,x,y,6,160):m===MAT.road?pick(F.dirt,x,y,10,200):
      m===MAT.mud?pick(F.mud,x,y,4,240):m===MAT.field?(y%2?F.mud[0]-1:pick(F.dirt,x,y,12,280)):m===MAT.sand?F.sand[0]-1:
      m===MAT.cobble?F.cobble[0]-1:m===MAT.pave?pick(F.pave,x,y,5,320):m===MAT.dark||m===MAT.wall?F.dark[0]-1:m===MAT.moss?F.herring[0]-1:
      m===MAT.plank?F.plank[0]-1:m===MAT.water?(n(x,y,8)>.62&&inMoat(x,y)?F.deep[0]-1:pick(F.water,x,y,6,360)):pick(F.meadow,x,y,9);
  }

  // ---------------------------------------------------------------- spawns, chests, sites
  const reach=new Uint8Array(N),q=[I(ENTRY[0],ENTRY[1])];reach[q[0]]=1;
  for(let a=0;a<q.length;a++){const i=q[a],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy;if(inb(nx,ny)&&!reach[I(nx,ny)]&&map.walkableTile(nx,ny)){reach[I(nx,ny)]=1;q.push(I(nx,ny));}}}
  const ok=(p)=>reach[I(Math.floor(p[0]),Math.floor(p[1]))]&&map.circleFree(p[0],p[1],.35);
  const near=(p,r=3)=>{if(ok(p))return p;for(let k=0;k<200;k++){const t=[p[0]+rng.range(-r,r),p[1]+rng.range(-r,r)];if(ok(t))return t;}
    for(let rr=1;rr<14;rr++)for(let k=0;k<40;k++){const a=k/40*Math.PI*2,t=[p[0]+Math.cos(a)*rr,p[1]+Math.sin(a)*rr];if(ok(t))return t;}return p;};
  const hallC=(id)=>{const r=rooms.find(r=>r.id===id).rect;return [(r[0]+r[2]+1)*C/2,(r[1]+r[3]+1)*C/2];};
  // Named places for scenario sites; each scenario takes a compact cluster that fits its story, so objectives sit
  // a short walk apart instead of across the whole board.
  const place={courtyard:[gcx+.5,GDN[3]+4.5],gardenNW:[GDN[0]+4,GDN[1]+4],gardenSE:[GDN[2]-4,GDN[3]-4],keepSteps:[KEEP[0]-1,KEEP[1]+9],
    kitchen:[202,160],hallsWest:[158,138],chapelFront:[196,139],innerGateIn:[igX+.5,167],
    bailey:[gateX+.5,188.5],lists:[140.5,190.5],baileyEast:[204,193],baileySW:[112,186],gateIn:[gateX+.5,195],
    stables:[114,138],orchard:[170,82],posternIn:[pgX+.5,76],mason:[214,128],
    bridge:[gateX+.5,MOAT.y1+6.5],village:[vx+.5,vy+.5],villageEast:[vx+12,vy+10],fields:[70,224],
    siegeWest:[SG[0]-20,SG[1]-9],siege:[SG[0],SG[1]+4],siegeEast:[SG[0]+20,SG[1]+2],cages:[SG[0]+5.5,SG[1]+19.5],siegeSouth:[SG[0]-10,SG[1]+18],
    graveyard:[GY[0],GY[1]],graveyardN:[GY[0]-6,GY[1]-14],graveyardS:[GY[0]+8,GY[1]+9],riverbank:[64,148],orchardSW:[58,246],
    northBank:[pgX+.5,MOAT.y0-6],ruin:[RW[0]+4,RW[1]+6]};
  const innerSites=['courtyard','keepSteps','kitchen','hallsWest','chapelFront','gardenNW','gardenSE','innerGateIn','bailey'];
  const plan={
    bridge:['bridge','village','bailey','siegeWest','gateIn','lists','fields','villageEast','siege'],
    defend:['village','villageEast','fields','siegeWest','bridge','orchardSW','bailey','siege','graveyard'],
    infestation:['village','villageEast','fields','siegeWest','bridge','orchardSW','bailey','siege','graveyard'],
    siege:['siegeWest','siege','siege','siege','cages','siegeEast','siegeSouth','bridge','village'],
    camps:['siegeWest','siege','siegeEast','siegeSouth','cages','village','bridge','fields','bailey'],
    rescue:['siegeWest','cages','siegeSouth','siegeEast','siege','village','bridge','fields','bailey'],
    captains:['bailey','lists','baileyEast','baileySW','gateIn','stables','mason','courtyard','orchard'],
    necros:['graveyard','graveyardN','graveyardS','riverbank','fields','orchardSW','village','bridge','stables'],
    totems:['graveyard','graveyardN','riverbank','graveyardS','fields','orchardSW','village','bridge','stables'],
    zones:['bailey','lists','baileyEast','gateIn','baileySW','courtyard','stables','mason','orchard'],
    escort:['orchard','bailey','northBank','courtyard','mason','posternIn','stables','lists','kitchen'],
  }[type]||(type.startsWith('rampart_')?['bailey','lists','baileyEast','gateIn','baileySW','mason','stables','orchard','posternIn']:innerSites);
  const sites=plan.map((k,j)=>near(k==='siege'&&type==='siege'&&j>0&&j<4?engines[j-1]:place[k],4));
  if(type==='defend'||type==='infestation')sites[0]=near([vx+9.5,vy-6.5],3);
  const looks=rollLooks(biome,rng.fn()),spawns=[];
  for(let k=0;k<70;k++){
    const x=rng.int(10,W-11)+.5,y=rng.int(10,H-11)+.5;
    if(!ok([x,y])||dist(x,y,ENTRY)<24||sites.some(s=>dist(x,y,s)<9)||mat[I(x|0,y|0)]===MAT.hall)continue;
    const arch=rng.pick(biome.roster);spawns.push({x,y,arch,n:rng.int(2,4),rank:k%10===0?'champion':'normal',look:looks.pick(arch)});
  }
  for(const id of ['throne_hall','cathedral','great_hall']){const [x,y]=near(hallC(id),3),arch=rng.pick(biome.roster);spawns.push({x,y,arch,n:2,rank:'normal',look:looks.pick(arch),castleRoom:id});}
  const chests=[[rooms[0].rect[0]*C+6.5,rooms[0].rect[1]*C+5.5],[rooms[1].rect[2]*C-4.5,rooms[1].rect[1]*C+5.5],[rooms[2].rect[0]*C+4.5,rooms[2].rect[3]*C-3.5],
    [GY[0]+8,GY[1]+6],[RW[0]+5,RW[1]+3],[SG[0]+16,SG[1]+12]].map(([x,y],j)=>{const [px,py]=near([x,y],3);return {x:px,y:py,rare:j===0||rng.chance(.2)};});
  const exit=near(EXIT,4);
  if(!globalThis.CASTLE_DEBUG)for(const p of [exit,...sites])if(!reach[I(Math.floor(p[0]),Math.floor(p[1]))])throw new Error('Castle moat, gate or wall blocked a route; seed '+seed+' at '+p.map(v=>v.toFixed(1)));
  map.castleRooms=rooms.map(r=>({id:r.id,name:r.name,rect:r.rect.map(v=>v*C),floor:r.floor}));
  map.castleDoors=roomDoors.map(d=>({room:d.room,x:d.x*C+1,y:d.y*C+1,asset:d.asset}));
  // Rampart posts: muster points along the south and east wall-walk, the front facing the siege lines.
  map.rampartPosts=[[112,197.5],[132,197.5],[150,197.5],[188,197.5],[208,197.5],[228,197.5],[237.5,178],[237.5,158]].map(p=>near(p,1.5)).filter(p=>map.rampartDeck[I(p[0]|0,p[1]|0)]===1);
  map.castleKeep={x:KEEP[0],y:KEEP[1]};map.castleGarden=GDN;map.castleSiege=SG;map.castleVillage=[vx,vy];
  return {map,props,buildings,trees,wallHangings:[],townTiles:[...floors,...keepFloors,...castleCarpetTiles()],looks,spawns,chests,torches:[],
    start:ENTRY,exit,shrine:sites[0],sites,scenarioId,seed,engines,tents};
}
