// CASTLE overworld: a moated quadrangular castle laid out like Bodiam and Beaumaris
// (docs/CASTLE_OVERWORLD.md). One continuous crenellated curtain wall, round towers on
// the four corners, square towers mid-wall, a twin-towered gatehouse with drawbridge on
// the south front and a postern on the north. The ranges (throne hall, chapel, great hall)
// stand round an open courtyard, behind a paved wall-walk lane. Laid out on a 96x88 grid,
// then every cell becomes 2x2 so the keep and courtyard are big enough to fight in.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { rollLooks } from '../data/bestiary.js';
import { scaledCastlePropK } from '../gfx/castlescale.js';
import { castleFloorTiles, castleFloorIndex, castleKeepFloorTiles, castleKeepFloorIndex,
  castleKeepWallFrames, castleFrames, castleObject, castleStrip } from '../gfx/castle.js';

const CW=96,CH=88;
export const CASTLE_WALL=Object.freeze({x0:28,y0:20,x1:68,y1:68});
const GATE=[47,49],POSTERN=[61,62];         // open wall cells: gate on the south wall, postern on the north
const MOAT={x0:23,y0:15,x1:73,y1:73,w:4};    // a 4-cell moat ring one berm cell outside the curtain
export const CASTLE_SITES=Object.freeze([[48.5,52.5],[48.5,62.5],[37.5,63.5],[59.5,63.5],[48.5,42.5],
  [36.5,79.5],[60.5,79.5],[26.5,81.5],[70.5,81.5]]);
const ENTRY=[48.5,82.5],EXIT=[86.5,8.5];
// Curtain wall art: one 66px slice of the authored battlement, 2:1 iso, front face down-left.
const WALL_ART='castle_landmark_04_curtain_wall_battlement',WALL_SLICE=[144,66,33,246];
const WALL_K=TW/WALL_SLICE[1];              // one slice spans one layout cell along the wall (64 world px)
const ART_K=WALL_K;
const BRIDGE_FIT=[1.1,-2.3,1.15],GATE_BRIDGE=[1.5,1.6,1.55];   // bridges: pivot offset (cells) and scale
const KEEP_STONE={colorize:[36,.3],light:.16,contrast:.9};   // tints the keep's dark brick to the curtain's limestone                          // towers and gatehouse share the wall's stone scale

function generateCastleBase(depth,biome,seed){
  const CN=CW*CH,floors=castleFloorTiles(),keepFloors=castleKeepFloorTiles(),
    allFloors=[...floors,...keepFloors],
    // Atlas names don't describe the art; these are picked by how each tile looks.
    grass=castleFloorIndex('courtyard_meadow'),lawn=castleFloorIndex('damp_grass'),
    shaded=castleFloorIndex('trimmed_battlement_grass'),dry=castleFloorIndex('dry_grass'),
    damp=castleFloorIndex('packed_courtyard_earth'),road=castleFloorIndex('cart_ruts'),
    stone=castleFloorIndex('pale_brick'),setts=castleFloorIndex('granite_setts'),walk=castleFloorIndex('cracked_clay'),
    hallFloor=floors.length+castleKeepFloorIndex('throne_herringbone'),
    chapelFloor=floors.length+castleKeepFloorIndex('chapel_pale_brick'),
    greatFloor=floors.length+castleKeepFloorIndex('great_hall_dark_brick'),
    water=castleFloorIndex('moat_water_rippled'),
    rng=new RNG(seed),map=new TileMap(CW,CH),props=[],id=(x,y)=>y*CW+x,
    dist=(x,y,p)=>Math.hypot(x-p[0],y-p[1]);
  if(!floors.length||water<0)throw new Error('Castle floors and moat water must load before generating the overworld.');
  const {x0,y0,x1,y1}=CASTLE_WALL;
  const rooms=[
    {id:'throne_hall',name:'Throne Hall',rect:[40,24,56,38],floor:hallFloor,wallStyle:'keep_wall_01_pale_quarry',
      doors:[[47,38,'door_01_oak_keep_door_SE_open'],[48,38,'door_01_oak_keep_door_SE_open'],[49,38,'door_01_oak_keep_door_SE_open']]},
    {id:'cathedral',name:'Cathedral',rect:[32,43,42,59],floor:chapelFloor,wallStyle:'keep_wall_01_pale_quarry',
      doors:[[42,51,'door_05_carved_chapel_door_NE_open'],[42,52,'door_05_carved_chapel_door_NE_open'],
        [36,59,'door_05_carved_chapel_door_SE_open'],[37,59,'door_05_carved_chapel_door_SE_open'],[38,59,'door_05_carved_chapel_door_SE_open']]},
    {id:'great_hall',name:'Great Hall',rect:[54,43,64,59],floor:greatFloor,wallStyle:'keep_wall_01_pale_quarry',
      doors:[[54,51,'door_04_arched_stable_door_SW_open'],[54,52,'door_04_arched_stable_door_SW_open'],
        [58,59,'door_01_oak_keep_door_SE_open'],[59,59,'door_01_oak_keep_door_SE_open']]},
  ];
  const inRoom=(x,y,pad=0)=>rooms.some(r=>x>=r.rect[0]-pad&&x<=r.rect[2]+pad&&y>=r.rect[1]-pad&&y<=r.rect[3]+pad);
  const inWard=(x,y)=>x>x0&&x<x1&&y>y0&&y<y1;
  const onWall=(x,y)=>(x===x0||x===x1)&&y>=y0&&y<=y1||(y===y0||y===y1)&&x>=x0&&x<=x1;
  const gateCell=(x,y)=>y===y1&&x>=GATE[0]&&x<=GATE[1]||y===y0&&x>=POSTERN[0]&&x<=POSTERN[1];
  const moatCell=(x,y)=>x>=MOAT.x0&&x<=MOAT.x1&&y>=MOAT.y0&&y<=MOAT.y1&&
    (x<MOAT.x0+MOAT.w||x>MOAT.x1-MOAT.w||y<MOAT.y0+MOAT.w||y>MOAT.y1-MOAT.w);
  // Causeways cross the moat in line with the gate and postern (Bodiam's bridges).
  const causeway=(x,y)=>x>=GATE[0]&&x<=GATE[1]&&y>y1&&y<=MOAT.y1+1||x>=POSTERN[0]&&x<=POSTERN[1]&&y<y0&&y>=MOAT.y0-1;
  const wallWalk=(x,y)=>inWard(x,y)&&(x<=x0+3||x>=x1-3||y<=y0+3||y>=y1-3);
  map.t.fill(1);map.losBlocks=true;map.rampartDeck=new Uint8Array(CN);map.rampartWall=new Uint8Array(CN);
  map.castleRoomWalls=new Uint8Array(CN);map.rampartHeight=0;
  const add=(asset,category,x,y,scale=.5,light=0,extra=null)=>{
    const spr=castleObject(asset,category);if(!spr)return false;
    props.push({kind:'scatter',x,y,spr,k:TW/160*scale,flip:false,light,z:0,...extra});return true;
  };
  const art=(asset,x,y,k,extra=null)=>{   // world-scale landmark art (not re-scaled by the 2x expansion)
    const spr=castleObject(asset,'castle_landmarks');if(!spr)throw new Error('Missing castle art '+asset);
    props.push({kind:'scatter',x,y,spr,k,flip:false,z:0,fixedK:true,...extra});
  };
  const block=(x,y)=>{if(x>=0&&y>=0&&x<CW&&y<CH)map.block[id(x,y)]=1;};
  const paint=(x,y,v)=>{if(x>=0&&y>=0&&x<CW&&y<CH&&v>=0)map.v[id(x,y)]=v;};

  // Ground: meadow outside, a trimmed lawn in the ward, groves framing the moat.
  const grove=(x,y)=>(x-11)**2/90+(y-44)**2/700<1||(x-85)**2/90+(y-44)**2/700<1||
    (x-20)**2/200+(y-6)**2/40<1||(x-76)**2/160+(y-84)**2/30<1;
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const i=id(x,y);let floor=grove(x,y)?shaded:grass;
    if(!inWard(x,y)&&floor===grass&&(x*13+y*7)%23<2)floor=dry;
    if(inWard(x,y))floor=(x*7+y*11)%41===0?damp:lawn<0?grass:lawn;
    map.v[i]=floor<0?0:floor;
    if(x<2||y<2||x>=CW-2||y>=CH-2){map.block[i]=1;continue;}
    if(moatCell(x,y)&&!causeway(x,y)){map.v[i]=water;map.block[i]=1;}
  }
  // Roads: the approach to the causeway, the causeways themselves, and the track to the exit.
  const drawRoad=([ax,ay],[bx,by],width,material)=>{
    const steps=Math.ceil(Math.hypot(bx-ax,by-ay)*2);
    for(let s=0;s<=steps;s++){const t=steps?s/steps:0,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,r=Math.ceil(width);
      for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++)
        if(xx>=2&&yy>=2&&xx<CW-2&&yy<CH-2&&Math.hypot(xx+.5-x,yy+.5-y)<=width&&!moatCell(xx,yy)){paint(xx,yy,material);map.block[id(xx,yy)]=0;}
    }
  };
  drawRoad(ENTRY,[48.5,76],1.9,road);drawRoad([61.5,13],[70,8.5],1.4,road);drawRoad([70,8.5],EXIT,1.4,road);
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(causeway(x,y)){paint(x,y,setts);map.block[id(x,y)]=0;}

  // The curtain wall: solid, one cell thick, open only at the gate and postern.
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(onWall(x,y)){
    const i=id(x,y);
    if(gateCell(x,y)){map.block[i]=0;map.v[i]=setts;continue;}
    map.block[i]=1;map.rampartWall[i]=1;map.v[i]=walk;
  }
  // Wall-walk lane round the inside of the curtain, paved like a parapet.
  for(let y=y0+1;y<y1;y++)for(let x=x0+1;x<x1;x++)if(wallWalk(x,y)){const i=id(x,y);map.rampartDeck[i]=1;map.v[i]=walk;}
  // Ward paths: gate -> throne hall doors, and a cross path to the chapel and great hall doors.
  for(let y=39;y<=y1-1;y++)for(let x=47;x<=49;x++)if(!wallWalk(x,y))paint(x,y,stone);
  for(let x=43;x<=53;x++)for(let y=51;y<=52;y++)paint(x,y,stone);
  for(let y=60;y<=64;y++){for(let x=36;x<=38;x++)paint(x,y,stone);for(let x=58;x<=59;x++)paint(x,y,stone);}
  for(let x=36;x<=59;x++)for(let y=63;y<=64;y++)paint(x,y,stone);

  // Curtain wall art, one slice per wall cell. North/south runs use the art as drawn
  // (face toward +y); west/east runs mirror it (face toward +x). The face sits on the
  // cell's +y / +x edge so the wall depth-sorts like a solid one-cell-thick block.
  const [sx,sw,spx,spy]=WALL_SLICE;
  // A wall cell's sort anchor: the low end of its face, so anything standing in front
  // of the face sorts after it and anything behind the wall sorts before it.
  const front=(r,c)=>r.u?[c,r.c+1]:[r.c+1,c];
  const runs={N:{u:true,c:y0,a:x0,b:x1},S:{u:true,c:y1,a:x0,b:x1},W:{u:false,c:x0,a:y0,b:y1},E:{u:false,c:x1,a:y0,b:y1}};
  const strip=(r,c)=>{
    // pivot moved half a cell back along the run to match the low-end anchor
    const spr=castleStrip(WALL_ART,'castle_landmarks',sx,sw,spx-32/WALL_K,spy-16/WALL_K);if(!spr)throw new Error('Castle wall art failed to load.');
    const [x,y]=front(r,c);props.push({kind:'scatter',x,y,spr,k:WALL_K,flip:!r.u,z:0,fixedK:true,curtain:true});
  };
  for(let x=x0+1;x<x1;x++){if(!gateCell(x,y0))strip(runs.N,x);if(!gateCell(x,y1))strip(runs.S,x);}
  for(let y=y0+1;y<y1;y++){strip(runs.W,y);strip(runs.E,y);}
  // Towers and the gatehouse are cut into the same 64px screen columns as the wall. Each
  // column is drawn just in front of the wall cell it stands on (the front-most of the
  // given runs), so towers always cover the wall behind them and sort with it, leaving
  // no slivers, gaps or walls drawn across a tower.
  const scr=(x,y)=>[64*(x-y),32*(x+y)];
  const sliced=(asset,category,P,k,sides,extra=null)=>{
    const s=castleObject(asset,category);if(!s)throw new Error('Missing castle art '+asset);
    const [px,py]=scr(P[0],P[1]),left=px+s.ox*k,right=left+s.w*k,cols=[];
    for(let m=Math.floor(left/64);m*64<right;m++){
      let Q=null;
      for(const r of sides.map(n=>runs[n])){
        const c=r.u?m+r.c+1:r.c-m;if(c<r.a||c>r.b)continue;
        const q=front(r,c);if(!Q||q[0]+q[1]>Q[0]+Q[1])Q=q;
      }
      cols.push([m,Q]);
    }
    for(let i=0;i<cols.length;i++)if(!cols[i][1]){   // overhang past a run's end: use the nearest wall cell
      for(let d=1;d<cols.length&&!cols[i][1];d++)cols[i][1]=cols[i-d]?.[1]||cols[i+d]?.[1]||null;
    }
    for(const [m,Q] of cols){
      const a=Math.max(0,Math.floor((m*64-left)/k)),b=Math.min(s.w,Math.ceil((m*64+64-left)/k));if(b<=a||!Q)continue;
      const qx=Q[0],qy=Q[1]+.02,[ax,ay]=scr(qx,qy);
      props.push({kind:'scatter',x:qx,y:qy,spr:{...s,sx:s.sx+a,w:b-a,ox:s.ox+a+(px-ax)/k,oy:s.oy+(py-ay)/k,strip:true},
        k,flip:false,z:0,fixedK:true,...extra});
    }
  };

  // Towers: round drum towers on the corners, square towers mid-wall; both project outward.
  const corner='castle_landmark_01_rampart_straight_with_walkway',square='castle_landmark_03_round_tower_upper';
  const towers=[];
  for(const [x,y,ox,oy,sides] of [[x0,y0,-1,-1,'NW'],[x1,y0,1,-1,'NE'],[x0,y1,-1,1,'SW'],[x1,y1,1,1,'SE']])towers.push([x,y,ox,oy,sides,corner,1.34]);
  for(const [x,y,ox,oy,sides] of [[40,y0,0,-1,'N'],[POSTERN[0]-2,y0,0,-1,'N'],[POSTERN[1]+2,y0,0,-1,'N'],[x0,36,-1,0,'W'],[x0,52,-1,0,'W'],
    [x1,36,1,0,'E'],[x1,52,1,0,'E'],[37,y1,0,1,'S'],[60,y1,0,1,'S']])towers.push([x,y,ox,oy,sides,square,1.22]);
  for(const [x,y,ox,oy,sides,asset,k] of towers){
    block(x,y);block(x+ox,y+oy);if(ox&&oy){block(x+ox,y);block(x,y+oy);}
    sliced(asset,'castle_landmarks',[x+.5+ox*.3,y+.5+oy*.3+.45],ART_K*k,[...sides],{tower:true});
  }
  // Gatehouse: two drum towers, portcullis and drawbridge over the moat. The passage
  // through it stays open; the towers either side are solid.
  for(let y=y1-2;y<=y1+1;y++)for(let x=GATE[0]-3;x<=GATE[1]+3;x++)if(x<GATE[0]||x>GATE[1])block(x,y);
  sliced('castle_landmark_08_corner_tower_cluster','castle_landmarks',[48.5,y1+1.6],ART_K*1.15,['S'],{gatehouse:true});
  // Postern: an arched gate through the north curtain between two flanking towers,
  // reached over a stone bridge.
  add('gateway_03_keep_processional_arch_SE','gateways',POSTERN[0]+1,y0+.95,.62);
  // Drawn centred on P but sorted from anchor A (its far end), so walkers draw on its deck.
  const placed=(asset,category,P,A,k)=>{
    const s=castleObject(asset,category);if(!s)throw new Error('Missing castle art '+asset);
    const [px,py]=scr(P[0],P[1]),[ax,ay]=scr(A[0],A[1]);
    props.push({kind:'scatter',x:A[0],y:A[1],spr:{...s,ox:s.ox+(px-ax)/k,oy:s.oy+(py-ay)/k},k,flip:false,z:0,fixedK:true});
  };
  placed('castle_landmark_17_bridge_approach','castle_landmarks',[POSTERN[0]+1+BRIDGE_FIT[0],MOAT.y0+MOAT.w+BRIDGE_FIT[1]],[POSTERN[0],MOAT.y0-1],ART_K*BRIDGE_FIT[2]);
  // The main approach: a broader bridge meets the gatehouse drawbridge.
  placed('castle_landmark_17_bridge_approach','castle_landmarks',[48.5+GATE_BRIDGE[0],MOAT.y1-1.5+GATE_BRIDGE[1]],[GATE[0],y1+2],ART_K*GATE_BRIDGE[2]);

  // Keep ranges: three enterable halls with their own floors, wall modules and open doors.
  const keepFamilyFrames=new Map();
  for(const f of castleKeepWallFrames()){const key=f.family+'|'+f.connection_mask,items=keepFamilyFrames.get(key)||[];items.push(f);keepFamilyFrames.set(key,items);}
  const roomWalls=new Set(),roomWallOwner=new Map(),roomDoors=[];
  for(const room of rooms){
    const [rx0,ry0,rx1,ry1]=room.rect,doorSet=new Set(room.doors.map(d=>id(d[0],d[1])));
    for(let y=ry0+1;y<ry1;y++)for(let x=rx0+1;x<rx1;x++){const i=id(x,y);map.v[i]=room.floor<0?stone:room.floor;map.block[i]=0;}
    for(let y=ry0;y<=ry1;y++)for(let x=rx0;x<=rx1;x++){
      if(x!==rx0&&x!==rx1&&y!==ry0&&y!==ry1)continue;
      const i=id(x,y);if(doorSet.has(i)){map.v[i]=room.floor<0?stone:room.floor;map.block[i]=0;roomDoors.push({room:room.id,x,y,asset:room.doors.find(d=>d[0]===x&&d[1]===y)?.[2]});continue;}
      roomWalls.add(i);roomWallOwner.set(i,room);
    }
  }
  for(const i of roomWalls){const x=i%CW,y=(i/CW)|0,room=roomWallOwner.get(i);
    const joined=(nx,ny)=>roomWalls.has(id(nx,ny))&&roomWallOwner.get(id(nx,ny))===room;
    const mask=(joined(x,y-1)?1:0)|(joined(x+1,y)?2:0)|(joined(x,y+1)?4:0)|(joined(x-1,y)?8:0);
    const frames=keepFamilyFrames.get(room.wallStyle+'|'+mask);if(!frames?.length)throw new Error('Missing interior wall topology '+room.wallStyle+' mask '+mask);
    const spr=castleObject(rng.pick(frames).id,'keep_walls',KEEP_STONE);spr.textureVariant=room.wallStyle;map.block[i]=1;map.castleRoomWalls[i]=1;
    props.push({kind:'scatter',x:x+.5,y:y+.5,spr,k:TW/160*.94,flip:false,z:0,roomWall:true});
  }
  for(const d of roomDoors){const spr=castleObject(d.asset,'doors');if(!spr)throw new Error('Missing keep door '+d.asset);
    props.push({kind:'scatter',x:d.x+.5,y:d.y+.5,spr,k:TW/160*.78,flip:false,z:0,roomDoor:true});
  }
  for(const [asset,category,x,y,scale] of [
    ['window_03_lancet_keep_SE','windows',43.5,38.5,.7],['window_03_lancet_keep_SE','windows',53.5,38.5,.7],
    ['window_05_twin_lancet_SW','windows',42.5,46.5,.65],['window_05_twin_lancet_SW','windows',42.5,56.5,.65],
    ['window_02_round_barred_SE','windows',61.5,59.5,.65],
    ['sign_05_chapel_plaque_SE','signs',34.5,59.5,.6],['sign_02_hall_plaque_SW','signs',54.5,48.5,.6],
  ])add(asset,category,x,y,scale);
  const furnish=(fid,x,y,scale,light=0,flip=false,z=0)=>{
    const spr=castleObject(fid,'furniture');if(!spr)throw new Error('Missing keep furnishing '+fid);
    props.push({kind:'scatter',x,y,spr,k:TW/160*scale,flip,light,z});return spr;
  };
  // Throne hall: the dais at the far (north) end on the processional axis from the gate.
  furnish('furniture_01_throne_dais',48.5,26.4,.38);
  for(const [asset,x,y] of [['scatter_09_trestle_table',43.5,30.5],['scatter_09_trestle_table',53.5,30.5],
    ['scatter_10_guard_bench',43.5,34.5],['scatter_10_guard_bench',53.5,34.5],['scatter_31_shield_rack',41.5,25.5],['scatter_32_spear_bundle',55.5,25.5]])
    add(asset,'scatter',x,y,asset.includes('table')?.66:asset.includes('bench')?.55:.42);
  // A candle-lit processional aisle from the doors to the dais, armour along the walls.
  for(const y of [29.5,32.5,35.5])for(const x of [45.6,51.4])furnish('furniture_05_floor_candelabrum',x,y,.105,3.6);
  for(const [x,y] of [[41.7,28.5],[41.7,32.5],[55.3,28.5],[55.3,32.5]])add('scatter_97_armor_stand','scatter',x,y,.42);
  for(const [asset,x,y] of [['castle_hanging_01_05_crown_roots_SE',45.5,25.1],['castle_hanging_01_05_crown_roots_SE',51.5,25.1]])add(asset,'wall_hangings',x,y,.48);
  // Chapel: pulpit at the north end, pews either side of the nave.
  furnish('furniture_03_cathedral_pulpit',37.5,45.2,.30,1.8);
  for(let row=0;row<6;row++)for(const x of [35.2,39.8])furnish('furniture_02_cathedral_pew',x,47.8+row*1.7,.13,0,row%2===1);
  for(const [x,y] of [[33.5,44.5],[41.5,44.5],[33.5,57.5],[41.5,57.5]])furnish('furniture_05_floor_candelabrum',x,y,.105,4.5);
  for(const [x,y] of [[37.5,49.5],[37.5,52.5],[37.5,55.5]])furnish('furniture_04_hanging_chandelier',x,y,.30,3.0,false,28);
  // Great hall: a central hearth between two feasting rows, a sideboard of arms.
  for(const [asset,x,y] of [['scatter_09_trestle_table',57.5,46.0],['scatter_09_trestle_table',61.5,46.0],
    ['scatter_10_guard_bench',57.5,47.6],['scatter_10_guard_bench',61.5,47.6],
    ['scatter_09_trestle_table',57.5,56.0],['scatter_09_trestle_table',61.5,56.0],
    ['scatter_10_guard_bench',57.5,54.4],['scatter_10_guard_bench',61.5,54.4],
    ['scatter_97_armor_stand',63.3,51.0],['scatter_98_leaned_shields',63.3,53.0],
    ['scatter_103_cookpot',63.0,44.6],['scatter_104_bread_basket',55.8,44.6],['scatter_15_stoneware_jugs',59.5,44.4]])
    add(asset,'scatter',x,y,asset.includes('table')?.58:asset.includes('bench')?.48:.42);
  add('scatter_85_stone_firepit','scatter',59.5,51.2,.6,4.0);
  for(const [x,y] of [[59.5,46.8],[59.5,55.2]])furnish('furniture_04_hanging_chandelier',x,y,.28,3.0,false,26);

  // Courtyard life: a well, a smithy corner, stores against the curtain, a practice yard.
  const yard=[['scatter_01_well_roofed',45.5,57.5,.62],['scatter_12_blacksmith_anvil',62.5,62.5,.5],['scatter_11_grindstone',63.5,61.2,.5],
    ['scatter_85_stone_firepit',61.2,61.0,.5],['scatter_03_firewood_stack',33.5,61.5,.5],['scatter_08_crate_stack',34.6,62.4,.5],
    ['scatter_05_water_barrel',33.2,63.2,.45],['scatter_07_grain_sack',52.5,41.5,.42],['scatter_02_handcart',51.5,44.5,.5],
    ['scatter_95_practice_dummy',44.5,44.5,.5],['scatter_95_practice_dummy',44.5,47.5,.5],['scatter_33_archery_target',45.2,41.2,.48],
    ['scatter_62_stone_trough',47.0,57.7,.5],['scatter_39_banner_pole',46.0,64.6,.42],['scatter_39_banner_pole',51.0,64.6,.42],
    ['scatter_94_bow_rack',53.4,48.2,.48],['scatter_75_stone_bench',50.4,57.6,.5],['scatter_17_flower_box',57.6,41.4,.45]];
  for(const [asset,x,y,s] of yard){if(add(asset,'scatter',x,y,s))block(Math.floor(x),Math.floor(y));}
  // Light: braziers by the gate passage and lanterns along the wall-walk.
  for(const [x,y] of [[46,65.6],[51,65.6],[46.2,39.6],[50.8,39.6],[42.4,49.6],[54.6,53.4]])add('torch_06_unlit_brazier_SE','torches',x,y,.62,5.0);
  for(const [x,y] of [[31.5,21.5],[40.5,21.5],[50.5,21.5],[65.5,21.5],[29.5,30.5],[29.5,44.5],[29.5,60.5],[67.5,30.5],[67.5,44.5],[67.5,60.5]])
    add('torch_05_stone_lantern_SE','torches',x,y,.56,4.2);
  for(const [asset,x,y] of [['castle_hanging_01_01_eclipse_sun_SE',44.5,39.0],['castle_hanging_01_07_wingless_raven_SE',52.5,39.0],
    ['castle_hanging_01_10_triple_moon_SE',35.0,59.9],['castle_hanging_01_09_crossed_hammers_SE',61.5,59.9]])add(asset,'wall_hangings',x,y,.48);

  // Trees grow only out in the groves and meadows, well clear of the moat and roads.
  const reserved=(x,y)=>[ENTRY,EXIT,...CASTLE_SITES].some(p=>dist(x,y,p)<5.5);
  const outside=(x,y)=>x<MOAT.x0-1||x>MOAT.x1+1||y<MOAT.y0-1||y>MOAT.y1+1;
  for(let y=3;y<CH-3;y++)for(let x=3;x<CW-3;x++){
    const i=id(x,y);if(!outside(x,y)||map.block[i]||map.v[i]===road||reserved(x+.5,y+.5))continue;
    const chance=grove(x,y)?.17:.012;
    if(rng.chance(chance)&&add(rng.pick(castleFrames('trees')).id,'trees',x+.5,y+.5,.55))map.block[i]=1;
  }
  let scatterCount=0;
  const loose=['scatter_40_rubble_pile','scatter_42_small_rubble','scatter_34_broken_wheel','scatter_24_stone_blocks','scatter_46_spare_merlons',
    'scatter_73_milestone','scatter_74_boundary_post','scatter_105_apple_sack','scatter_81_sandbags','scatter_82_wicker_barricade','scatter_83_timber_barricade',
    'scatter_84_sharpened_stakes','scatter_19_clipped_hedge','scatter_18_rose_bush','scatter_43_large_rubble'];
  for(let n=0;n<12000&&scatterCount<460;n++){
    const x=rng.int(3,CW-4)+.5,y=rng.int(3,CH-4)+.5;
    if(!map.walkable(x,y)||reserved(x,y)||!map.circleFree(x,y,.32)||map.v[id(x|0,y|0)]===road)continue;
    if(!outside(x,y)||dist(x,y,[48.5,75.5])<4||dist(x,y,[61.5,13.5])<4)continue;   // keep the bridge landings clear
    if(add(rng.pick(loose),'scatter',x,y,.5))scatterCount++;
  }
  const looks=rollLooks(biome,rng.fn()),spawns=[];
  for(let i=0;i<34;i++){
    const x=rng.int(8,CW-9)+.5,y=rng.int(8,CH-9)+.5;
    if(!map.circleFree(x,y,.35)||dist(x,y,ENTRY)<11||dist(x,y,CASTLE_SITES[0])<7||inRoom(x,y))continue;
    const arch=rng.pick(biome.roster);spawns.push({x,y,arch,n:rng.int(2,4),rank:i%10===0?'champion':'normal',look:looks.pick(arch)});
  }
  const seen=new Uint8Array(CN),q=[id(Math.floor(ENTRY[0]),Math.floor(ENTRY[1]))];seen[q[0]]=1;
  for(let a=0;a<q.length;a++){const i=q[a],x=i%CW,y=(i/CW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,j=id(nx,ny);if(nx>=0&&ny>=0&&nx<CW&&ny<CH&&map.walkableTile(nx,ny)&&!seen[j]){seen[j]=1;q.push(j);}}}
  if([EXIT,...CASTLE_SITES].some(([x,y])=>!seen[id(Math.floor(x),Math.floor(y))]))throw new Error('Castle moat, gate or wall blocked a route; seed '+seed);
  const chests=[[44.5,26.5],[34.5,45.5],[62.5,44.5]].map(([x,y],i)=>({x,y,rare:i===0||rng.chance(.2)}));
  map.castleRooms=rooms.map(r=>({id:r.id,name:r.name,rect:r.rect.slice(),floor:r.floor}));
  map.castleDoors=roomDoors.map(d=>({room:d.room,x:d.x+.5,y:d.y+.5,asset:d.asset}));
  // Rampart posts: eight muster points spread round the wall-walk lane.
  map.rampartPosts=[[34.5,22.5],[48.5,22.5],[63.5,22.5],[66.5,36.5],[63.5,66.5],[34.5,66.5],[30.5,52.5],[30.5,36.5]];
  const fixedSpawns=[['throne_hall',48.5,33.5],['cathedral',37.5,53.5],['great_hall',59.5,54.5]];
  for(const [room,x,y] of fixedSpawns){const arch=rng.pick(biome.roster);spawns.push({x,y,arch,n:2,rank:'normal',look:looks.pick(arch),castleRoom:room});}
  return {map,props,buildings:[],wallHangings:[],townTiles:allFloors,looks,spawns,chests,torches:[],
    start:ENTRY,exit:EXIT,shrine:CASTLE_SITES[0],sites:CASTLE_SITES,scenarioId:(((seed>>>0)^depth)>>>0)%35,seed};
}

// Every layout cell becomes a 2x2 cluster: the collision topology is unchanged while the
// keep, courtyard and wall-walk become large enough for full encounters.
export function generateCastle(depth,biome,seed){
  const base=generateCastleBase(depth,biome,seed),old=base.map,factor=2;
  const map=new TileMap(old.w*factor,old.h*factor);map.losBlocks=old.losBlocks;map.rampartHeight=0;
  map.castleRooms=old.castleRooms;map.castleDoors=old.castleDoors;
  for(const key of ['t','v','block','rampartDeck','rampartWall','castleRoomWalls']){
    const src=old[key];if(!src)continue;const dst=new src.constructor(map.w*map.h);
    for(let y=0;y<old.h;y++)for(let x=0;x<old.w;x++){
      const val=src[y*old.w+x],xx=x*factor,yy=y*factor;
      for(let dy=0;dy<factor;dy++)for(let dx=0;dx<factor;dx++)dst[(yy+dy)*map.w+xx+dx]=val;
    }
    map[key]=dst;
  }
  map.baseCastleSize=[old.w,old.h];map.baseRampartWallCount=old.rampartWall.reduce((n,v)=>n+v,0);
  const point=p=>p&&[p[0]*factor,p[1]*factor];
  for(const key of ['start','exit','shrine'])base[key]=point(base[key]);
  base.sites=base.sites.map(point);map.rampartPosts=old.rampartPosts.map(point);
  for(const k of ['spawns','chests'])for(const item of base[k]||[]){item.x*=factor;item.y*=factor;}
  for(const p of base.props||[]){p.x*=factor;p.y*=factor;p.k=scaledCastlePropK(p,factor,TW);}
  for(const d of map.castleDoors||[]){d.x*=factor;d.y*=factor;}
  if(map.castleRooms)map.castleRooms=map.castleRooms.map(r=>({...r,rect:r.rect.map(n=>n*factor)}));
  base.map=map;return base;
}
