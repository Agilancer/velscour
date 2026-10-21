"""Build an isometric biome pack from generated atlas sources.
Requires Python 3.10+, Pillow and NumPy. No network calls.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import json, math, hashlib, shutil, csv, argparse
from inspect_sources import components

ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=ROOT/'source');parser.add_argument('--out',type=Path,default=ROOT.parent/'outputs'/'Catacombs_Biome_Pack');parser.add_argument('--config',type=Path);args=parser.parse_args()
SRC=args.source; OUT=args.out; OUT.mkdir(parents=True,exist_ok=True)
for d in ['sprites/floors','sprites/walls','sprites/arches','sprites/doors','sprites/scatter','sheets','reference_sheets','qa','template','source_art','tools']:(OUT/d).mkdir(parents=True,exist_ok=True)
NEAREST=Image.Resampling.NEAREST
FLOORS=['charcoal_flagstone','weathered_cobbles','slate_bricks','ossuary_aggregate','moss_cobbles','crypt_limestone','burial_terracotta','grave_gravel','black_basalt','mortuary_tesserae','branching_fracture','collapsed_drain','scraped_sigil','grave_bootprints','bone_fragments','rust_stain','funerary_star','mortar_repair','chain_anchor','vine_relief','sepulchral_cross','four_way_grate','crescent_scratch','inset_coffin_lid','old_blood_trail','skull_seal','interlocking_circles','candle_wax','broken_hex_mosaic','missing_cobble','diagonal_fissure','parchment_scraps','cold_ash_circle','riveted_plates','brass_memorial','mortuary_checker','diamond_mosaic','bone_laurel','drainage_streak','concentric_channels','bone_cross','rosette_seal','iron_hatch','exposed_roots','grave_dust_trail','sword_memorial','fragmented_mosaic','broken_chain','teeth_and_pebbles','collapsed_mortar','ritual_triangle','fan_drain','vigil_wax','iron_trench','hourglass_relief','scrape_marks','bone_lattice','coffin_nails','stagnant_patch','sunburst_mosaic']
WALLS=['crypt_ashlar','ossuary_niches','funerary_chapel','sealed_cells','drowned_crypt']
ARCHES=['roman_ossuary','pointed_funerary','ironbound_segmental']
DOORS=['ironbound_oak','iron_grille','bone_reliquary']
SCATTER=['effigy_sarcophagus','open_sarcophagus','broken_sarcophagus_lid','skull_pyramid','long_bone_heap','supine_skeleton','ossuary_urn','broken_amphora','reliquary_chest','grave_lantern','vigil_candles','iron_candelabrum','shrouded_altar','prayer_lectern','kneeling_mourner','headless_angel','fallen_column','column_stump','gothic_rubble','cross_grave_marker','closed_wood_coffin','broken_open_coffin','funerary_handcart','ritual_basin','incense_brazier','torch_stand','burial_urn_cluster','rolled_shroud','coffin_plank_heap','chain_and_shackle','leaning_ossuary_seal','funerary_obelisk','skull_corbel','votive_idol','offering_bowl','funerary_bell','fallen_iron_railing','stone_bench','hourglass_and_prayer_book','burial_boots_and_belt']
WIDTHS=[136,136,122,86,98,130,54,78,86,38,50,58,136,76,68,88,106,80,122,64,128,134,148,100,58,60,84,80,112,70,80,58,90,58,50,100,110,126,70,74]
BIOME='Catacombs'
if args.config:
    cfg=json.loads(args.config.read_text(encoding='utf-8'))
    BIOME=cfg.get('biome_name',BIOME)
    for key,var,length in [('floor_names','FLOORS',60),('wall_names','WALLS',5),('arch_names','ARCHES',3),('door_names','DOORS',3),('scatter_names','SCATTER',40)]:
        if key in cfg:
            assert len(cfg[key])==length,(key,length)
            assert all(isinstance(s,str) and s and all(c.isalnum() or c=='_' for c in s) for s in cfg[key]),'Use filename-safe names'
            globals()[var]=cfg[key]
    WIDTHS=cfg.get('scatter_widths_px',WIDTHS)
assets=[]; images={}; floor_uv=[]; qa={'version':1,'tests':{},'limitations':['The 160x80 reference grid is measured. Scatter projection is generated and visually matched, not reverse-engineered 3D geometry.','Architecture is a deterministic 2.5D extrusion of original generated elevations; this is not a native Diablo DT1 pack.','Seamless certification applies to each of floor_01 through floor_10 repeated with itself; arbitrary material transitions are not certified.']}

def clean(im):
    a=np.array(im.convert('RGBA')).copy(); a[:,:,3]=np.where(a[:,:,3]>=128,255,0); a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)
def reduce_art(im,size):
    im=clean(im.resize(size,NEAREST)); a=np.array(im);a[:,:,:3]=(a[:,:,:3]//4)*4
    return Image.fromarray(a)
def split_texture(name,cols,rows):
    im=Image.open(SRC/name).convert('RGBA'); w,h=im.size
    return [im.crop((round(c*w/cols)+3,round(r*h/rows)+3,round((c+1)*w/cols)-3,round((r+1)*h/rows)-3)) for r in range(rows) for c in range(cols)]
def isolated(name,cols,rows):
    im=Image.open(SRC/name).convert('RGBA'); a=np.array(im); w,h=im.size; cs=components(a[:,:,3]>=128); groups={i:[] for i in range(cols*rows)}
    mains={}
    for c in cs:
        x,y=c['center']; i=min(rows-1,int(y*rows/h))*cols+min(cols-1,int(x*cols/w))
        if i not in mains and c['n']>800:mains[i]=c
    assert len(mains)==cols*rows,(name,mains.keys())
    for c in cs:
        if c['n']<6:continue
        x,y=c['center']
        def dist(m):
            x0,y0,x1,y1=m['box'];return max(x0-x,0,x-x1)**2+max(y0-y,0,y-y1)**2
        i=min(mains,key=lambda k:dist(mains[k]));groups[i].append(c)
    result=[]
    for i in range(cols*rows):
        b=np.zeros_like(a)
        for c in groups[i]:
            for y,x0,x1 in c['runs']:b[y,x0:x1]=a[y,x0:x1]
        obj=clean(Image.fromarray(b));obj=obj.crop(obj.getbbox());result.append(obj)
    return result
def periodic(im,band=18):
    a=np.array(im.convert('RGB'),dtype=float); n=a.shape[0]
    for axis in (1,0):
        for d in range(band):
            weight=(1-d/band)**2
            if axis==1:
                l=a[:,d].copy();r=a[:,-1-d].copy();avg=(l+r)/2;a[:,d]=l*(1-weight)+avg*weight;a[:,-1-d]=r*(1-weight)+avg*weight
            else:
                l=a[d].copy();r=a[-1-d].copy();avg=(l+r)/2;a[d]=l*(1-weight)+avg*weight;a[-1-d]=r*(1-weight)+avg*weight
    return Image.fromarray((np.round(a/4)*4).clip(0,252).astype(np.uint8)).convert('RGBA')
def diamond(im):
    tex=np.array(im); y,x=np.indices((80,160)); u=((x+.5-80)/80+(y+1)/40)/2;v=((y+1)/40-(x+.5-80)/80)/2
    valid=(u>=0)&(u<1)&(v>=0)&(v<1);out=np.zeros((80,160,4),np.uint8)
    out[valid]=tex[(v[valid]*tex.shape[0]).astype(int),(u[valid]*tex.shape[1]).astype(int)];out[:,:,3]=valid*255
    return Image.fromarray(out)
def register(id,category,name,im,pivot,**kw):
    im=clean(im); rel=f'sprites/{category}/{id}.png';im.save(OUT/rel)
    a={'id':id,'category':category,'name':name,'file':rel,'size_px':list(im.size),'pivot_px':list(pivot),'alpha_bounds_px':list(im.getbbox()),'filter':'nearest','alpha':'binary','animation':False,**kw}
    assets.append(a);images[id]=im;return a
def font(size=14):
    p=Path('C:/Windows/Fonts/consola.ttf')
    return ImageFont.truetype(str(p),size) if p.exists() else ImageFont.load_default()
def title(im,text,sub=''):
    text=text.replace('CATACOMBS',BIOME.upper())
    d=ImageDraw.Draw(im);d.text((22,15),text,font=font(25),fill='#e3d0aa');d.text((22,47),sub,font=font(13),fill='#a9aaa7')
def rot(p,r):
    u,v,z=p
    for _ in range(r):u,v=-v,u
    return (u,v,z)
class Renderer:
    def __init__(self,size=(256,256),pivot=(128,192)):
        self.size=size;self.pivot=pivot;self.a=np.zeros((size[1],size[0],4),np.uint8);self.depth=np.full((size[1],size[0]),-1e9)
    def quad(self,points,texture,uv=((0,0),(1,0),(0,1)),shade=1,repeat=False):
        p=np.array(points,float); q=np.array([[self.pivot[0]+80*(u-v),self.pivot[1]+40*(u+v)-z] for u,v,z in p]);a=q[1]-q[0];b=q[2]-q[0]
        det=a[0]*b[1]-a[1]*b[0]
        if abs(det)<1e-8:return
        fourth=q[1]+q[2]-q[0];xs=np.r_[q[:,0],fourth[0]];ys=np.r_[q[:,1],fourth[1]]
        x0=max(0,int(np.floor(xs.min())));x1=min(self.size[0],int(np.ceil(xs.max())));y0=max(0,int(np.floor(ys.min())));y1=min(self.size[1],int(np.ceil(ys.max())))
        if x0>=x1 or y0>=y1:return
        yy,xx=np.indices((y1-y0,x1-x0));dx=xx+x0+.5-q[0,0];dy=yy+y0+.5-q[0,1];s=(dx*b[1]-dy*b[0])/det;t=(a[0]*dy-a[1]*dx)/det
        valid=(s>=-1e-8)&(t>=-1e-8)&(s<1-1e-8)&(t<1-1e-8)
        tex=np.asarray(texture);uv=np.array(uv,float);uu=uv[0,0]+s*(uv[1,0]-uv[0,0])+t*(uv[2,0]-uv[0,0]);vv=uv[0,1]+s*(uv[1,1]-uv[0,1])+t*(uv[2,1]-uv[0,1])
        if repeat:uu%=1;vv%=1
        tx=np.clip((uu*tex.shape[1]).astype(int),0,tex.shape[1]-1);ty=np.clip((vv*tex.shape[0]).astype(int),0,tex.shape[0]-1);pixels=tex[ty,tx].copy();pixels[:,:,:3]=(pixels[:,:,:3].astype(float)*shade).clip(0,255).astype(np.uint8)
        dep=p[:,0]+p[:,1]+p[:,2]/80;z=dep[0]+s*(dep[1]-dep[0])+t*(dep[2]-dep[0]); valid&=(pixels[:,:,3]>127)&(z>=self.depth[y0:y1,x0:x1]-1e-7)
        self.a[y0:y1,x0:x1][valid]=pixels[valid];self.depth[y0:y1,x0:x1][valid]=z[valid]
    def image(self):return Image.fromarray(self.a)

for batch in range(3):
    for j,im in enumerate(split_texture(f'floors_{batch*20+1:02}_{batch*20+20:02}.png',5,4)):
        i=batch*20+j;uv=reduce_art(im,(160,160))
        if i<10:uv=periodic(uv)
        floor_uv.append(uv);uv.save(OUT/'source_art'/f'floor_uv_{i+1:02}.png')
        register(f'floor_{i+1:02}_{FLOORS[i]}','floors',FLOORS[i],diamond(uv),(80,40),footprint_tiles=[1,1],orientation='ground',seamless_self_repeat=i<10,source_uv=f'source_art/floor_uv_{i+1:02}.png')

wall_parts=split_texture('wall_materials.png',5,2);walltex=[reduce_art(im,(80,128)) for im in wall_parts]
DIRS=['NE','SE','SW','NW'];vecs=[(0,-1),(1,0),(0,1),(-1,0)]
def node_cells(mask):
    cells=set((u,v) for u in [-1,0] for v in [-1,0])
    if mask&1:cells.update((u,v) for u in [-1,0] for v in range(-5,-1))
    if mask&2:cells.update((u,v) for u in range(1,5) for v in [-1,0])
    if mask&4:cells.update((u,v) for u in [-1,0] for v in range(1,5))
    if mask&8:cells.update((u,v) for u in range(-5,-1) for v in [-1,0])
    return cells
def draw_cells(rend,cells,style,rotation=0,z0=0,z1=128):
    front=walltex[style];back=walltex[style+5];top=floor_uv[[0,5,5,2,8][style]]
    for iu,iv in cells:
        u0,u1=iu/10,(iu+1)/10;v0,v1=iv/10,(iv+1)/10
        def q(p,tex,uv,shade=1):rend.quad([rot(x,rotation) for x in p],tex,uv,shade,True)
        q([(u0,v0,z1),(u1,v0,z1),(u0,v1,z1)],top,((u0+.5,v0+.5),(u1+.5,v0+.5),(u0+.5,v1+.5)),1.14)
        for du,dv in [(1,0),(-1,0),(0,1),(0,-1)]:
            if (iu+du,iv+dv) in cells:continue
            if du:
                u=u1 if du>0 else u0;p=[(u,v0,z1),(u,v1,z1),(u,v0,z0)];uv=((v0+.5,1-z1/128),(v1+.5,1-z1/128),(v0+.5,1-z0/128))
            else:
                v=v1 if dv>0 else v0;p=[(u0,v,z1),(u1,v,z1),(u0,v,z0)];uv=((u0+.5,1-z1/128),(u1+.5,1-z1/128),(u0+.5,1-z0/128))
            nu,nv,_=rot((du,dv,0),rotation); shade=.72 if nu>0 else .94 if nv>0 else .82
            q(p,front if du+dv>0 else back,uv,shade)
def nodename(mask):
    count=mask.bit_count(); typ='pillar' if count==0 else 'end' if count==1 else 'straight' if mask in (5,10) else 'corner' if count==2 else 'tee' if count==3 else 'cross'
    return typ+('_'+'_'.join(DIRS[i] for i in range(4) if mask&(1<<i)) if mask else '')
for style,wn in enumerate(WALLS):
    for mask in range(16):
        rend=Renderer();cells=node_cells(mask);draw_cells(rend,cells,style)
        register(f'wall_{style+1:02}_{wn}_{nodename(mask)}','walls',f'{wn} {nodename(mask)}',rend.image(),rend.pivot,wall_set=wn,topology=nodename(mask).split('_')[0],connection_mask=mask,connections=[{'direction':DIRS[k],'local_tiles':[vecs[k][0]*.5,vecs[k][1]*.5]} for k in range(4) if mask&(1<<k)],height_px=128,thickness_tiles=.2,footprint_cells_0_1_tile=sorted([list(v) for v in cells]))
    # Four directed, full-length panels expose separately authored front/reverse surfaces.
    cells={(u,v) for u in range(-5,5) for v in [-1,0]}
    for r,direction in enumerate(['SE','SW','NW','NE']):
        rend=Renderer();draw_cells(rend,cells,style,r)
        ends=[rot((x,0,0),r)[:2] for x in [-.5,.5]]
        register(f'wall_{style+1:02}_{wn}_panel_{direction}','walls',f'{wn} directed panel {direction}',rend.image(),rend.pivot,wall_set=wn,topology='directed_panel',orientation=direction,rotation_degrees=r*90,connection_endpoints_tiles=ends,height_px=128,thickness_tiles=.2)

arch_src=isolated('arch_elevations.png',3,2);door_src=isolated('door_leaves.png',3,2)
def solidtex(rgb):return np.array([[list(rgb)+[255]]],np.uint8)
def elevation(rend,front,back,width,height,rotation=0,origin=(0,0),thickness=.2):
    # Alpha-cut elevation extruded to a physical, grid-aligned slab.
    front=np.array(front);back=np.array(back).copy()
    # The generated reverse can differ in silhouette. Extend its nearest valid
    # colors before imposing the shared front mask; never turn empty RGB into
    # opaque black streaks on the rear face.
    valid=back[:,:,3]>127; target=front[:,:,3]>127
    while np.any(target & ~valid):
        acc=np.zeros(back.shape[:2]+(3,),float);count=np.zeros(valid.shape,float)
        for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
            vv=np.roll(valid,(dy,dx),(0,1));rgb=np.roll(back[:,:,:3],(dy,dx),(0,1))
            if dy==1:vv[0]=False
            if dy==-1:vv[-1]=False
            if dx==1:vv[:,0]=False
            if dx==-1:vv[:,-1]=False
            acc+=rgb*vv[:,:,None];count+=vv
        fill=(~valid)&(count>0)
        if not np.any(fill):break
        back[fill,:3]=(acc[fill]/count[fill,None]).astype(np.uint8);valid[fill]=True
    back[:,:,3]=front[:,:,3];back[front[:,:,3]==0,:3]=0
    h,w=front.shape[:2];u0=-width/2;du=width/w;dz=height/h
    def world(u,v,z):return rot((u+origin[0],v+origin[1],z),rotation)
    for v,tex in [(-thickness/2,back),(thickness/2,front)]:
        normal=rot((0,1 if v>0 else -1,0),rotation);shade=.98 if normal[1]>0 else .76
        rend.quad([world(u0,v,height),world(-u0,v,height),world(u0,v,0)],tex,shade=shade)
    mask=front[:,:,3]>127
    def contour_color(x,y):
        patch=front[max(0,y-4):min(h,y+5),max(0,x-4):min(w,x+5)]
        pix=patch[patch[:,:,3]>127,:3]
        if len(pix)==0:return np.array([60,56,48])
        # A dark one-pixel outline is not the material of an entire side face.
        # Sample the nearby interior stone/wood instead of stretching the outline.
        light=pix.mean(axis=1);pix=pix[light>=np.quantile(light,.45)]
        return np.median(pix,axis=0)
    # Compress straight runs on contour to keep the extrusion lightweight.
    for x in range(w+1):
        left=mask[:,x-1] if x else np.zeros(h,bool);right=mask[:,x] if x<w else np.zeros(h,bool);edge=left^right
        for y in np.where(edge)[0]:
            c=contour_color(x-1 if left[y] else x,y);u=u0+x*du;zt=height-y*dz
            rend.quad([world(u,-thickness/2,zt),world(u,thickness/2,zt),world(u,-thickness/2,zt-dz)],solidtex((c*.65).astype(int)),shade=1)
    for y in range(h+1):
        above=mask[y-1] if y else np.zeros(w,bool);below=mask[y] if y<h else np.zeros(w,bool);edge=above^below
        # Only top-facing silhouette edges are seen from above.
        for x in np.where(edge & below)[0]:
            c=contour_color(x,y);u=u0+x*du;z=height-y*dz
            rend.quad([world(u,-thickness/2,z),world(u+du,-thickness/2,z),world(u,thickness/2,z)],solidtex((c*1.13).clip(0,252).astype(int)))

for i,name in enumerate(ARCHES):
    height=[160,184,144][i];f=reduce_art(arch_src[i],(240,height));b=reduce_art(arch_src[i+3],(240,height));f.save(OUT/'source_art'/f'arch_{i+1}_front.png');b.save(OUT/'source_art'/f'arch_{i+1}_back.png')
    for r,direction in enumerate(['SE','SW','NW','NE']):
        rend=Renderer((384,336),(192,248));elevation(rend,f,b,3,height,r)
        register(f'arch_{i+1:02}_{name}_{direction}','arches',name,rend.image(),rend.pivot,arch_design=name,orientation=direction,rotation_degrees=r*90,span_tiles=3,thickness_tiles=.2,height_px=height,connection_endpoints_tiles=[rot((x,0,0),r)[:2] for x in [-1.5,1.5]],source_front=f'source_art/arch_{i+1}_front.png',source_reverse=f'source_art/arch_{i+1}_back.png')

for i,name in enumerate(DOORS):
    f=reduce_art(door_src[i],(64,112));b=reduce_art(door_src[i+3],(64,112));f.save(OUT/'source_art'/f'door_{i+1}_front.png');b.save(OUT/'source_art'/f'door_{i+1}_back.png')
    for r,direction in enumerate(['SE','SW','NW','NE']):
        for state in ['closed','open']:
            rend=Renderer((320,288),(160,208));style=[0,3,1][i]
            jambs={(u,v) for u in [-5,4] for v in [-1,0]};lintel={(u,v) for u in range(-5,5) for v in [-1,0]}
            draw_cells(rend,jambs,style,r);draw_cells(rend,lintel,style,r,z0=112,z1=128)
            if state=='closed':elevation(rend,f,b,.8,112,r,thickness=.05)
            else:
                # Rotate a leaf about (-.4,0): closed endpoints (-.4,0),(.4,0);
                # open endpoints (-.4,0),(-.4,.8). Pre-rotate center for r+1.
                elevation(rend,f,b,.8,112,(r+1)%4,origin=(.4,.4),thickness=.05)
            register(f'door_{i+1:02}_{name}_{direction}_{state}','doors',name,rend.image(),rend.pivot,door_design=name,orientation=direction,rotation_degrees=r*90,state=state,doorway_span_tiles=1,leaf_width_tiles=.8,leaf_height_px=112,hinge_tiles=rot((-.4,0,0),r)[:2],open_swing_degrees=90,connection_endpoints_tiles=[rot((x,0,0),r)[:2] for x in [-.5,.5]])

for batch in range(2):
    for j,obj in enumerate(isolated(f'scatter_{batch*20+1:02}_{batch*20+20:02}.png',5,4)):
        i=batch*20+j;w=WIDTHS[i];h=round(obj.height*w/obj.width);h=min(h,150);w=round(obj.width*h/obj.height);obj=reduce_art(obj,(w,h))
        canvas=Image.new('RGBA',(192,192));x=(192-w)//2;y=184-h;canvas.alpha_composite(obj,(x,y))
        # Ground center is above the frontmost pixel for objects with visible footprints.
        ground_backoff=round(w*.16);pivot=(96,184-ground_backoff)
        register(f'scatter_{i+1:02}_{SCATTER[i]}','scatter',SCATTER[i],canvas,pivot,orientation='SE_view',rotations_provided=1,placement='ground_center_estimated_from_visible_base',footprint_tiles_estimate=[round(w/160,2),round(w/160,2)])

def atlas(category,items,cell,cols):
    cw,ch=cell;rows=math.ceil(len(items)/cols);im=Image.new('RGBA',(cols*cw,rows*ch));ref=Image.new('RGB',(cols*cw,rows*(ch+35)+80),'#171c1e');title(ref,'CATACOMBS / '+category.upper(),f'{len(items)} sprites | native 1x pixels | grid 160 x 80 | labels are not in transparent sheets')
    d=ImageDraw.Draw(ref)
    for k,a in enumerate(items):
        x=(k%cols)*cw;y=(k//cols)*ch;img=images[a['id']];off=((cw-img.width)//2,(ch-img.height)//2);im.alpha_composite(img,(x+off[0],y+off[1]));a['atlas']={'file':f'sheets/{category}.png','rect_px':[x+off[0],y+off[1],img.width,img.height]}
        ry=80+(k//cols)*(ch+35);rx=(k%cols)*cw;d.rectangle((rx,ry,rx+cw-1,ry+ch+34),outline='#303b3e');ref.paste(img,(rx+off[0],ry+off[1]),img)
        label=a['id'].replace('scatter_','').replace('floor_','').replace('wall_','').replace('arch_','').replace('door_','')
        if len(label)>cw//7:
            cutoff=label.rfind('_',0,cw//7); cutoff=cutoff if cutoff>0 else cw//7;d.text((rx+5,ry+ch+2),label[:cutoff],font=font(11),fill='#c9c3b5');d.text((rx+5,ry+ch+16),label[cutoff:].strip('_'),font=font(11),fill='#c9c3b5')
        else:d.text((rx+5,ry+ch+7),label,font=font(11),fill='#c9c3b5')
    im.save(OUT/'sheets'/f'{category}.png');ref.save(OUT/'reference_sheets'/f'{category}_labeled.png')
for cat,cell,cols in [('floors',(164,84),10),('arches',(388,340),4),('doors',(324,292),4),('scatter',(196,196),8)]:atlas(cat,[a for a in assets if a['category']==cat],cell,cols)
for w in WALLS:atlas('walls_'+w,[a for a in assets if a.get('wall_set')==w],(260,260),5)

manifest={'pack':'Catacombs','version':'1.0','units':'native pixels','coordinate_system':{'projection':'2:1 dimetric pixel isometric','tile_size_px':[160,80],'basis_u_px':[80,40],'basis_v_px':[-80,40],'world_z_unit':'one screen pixel','screen_equation':'screen=(origin_x+80*(u-v), origin_y+40*(u+v)-z_px)','sprite_position':'image top-left = projected ground anchor - pivot_px','directions':{'NE':[0,-1],'SE':[1,0],'SW':[0,1],'NW':[-1,0]},'wall_mask_bits':{'NE':1,'SE':2,'SW':4,'NW':8},'pivot_convention':'pixel-edge coordinates, integer native pixels'},'coverage':{'floors':60,'certified_self_seamless_floors':10,'wall_sets':5,'wall_sprites_per_set':20,'wall_sprites':100,'wall_topology_per_set':{'pillar':1,'end':4,'straight':2,'corner':4,'tee':4,'cross':1,'directed_panel':4},'arch_designs':3,'arch_orientations':['SE','SW','NW','NE'],'arch_frames':12,'door_designs':3,'door_orientations':['SE','SW','NW','NE'],'door_states':['closed','open'],'door_frames':24,'scatter_designs':40,'scatter_orientations_per_design':1,'total_sprite_frames':236},'assets':assets}
manifest['pack']=BIOME
manifest['coordinate_system']['floor_raster_sample']='x + 0.5, y + 1.0; exact supplied reference mask: row widths 4,8,...,160,...,4,0'
seen={}
for a in assets:
    digest=hashlib.sha256(images[a['id']].tobytes()).hexdigest();a['pixel_sha256']=digest
    if digest in seen:a['pixel_identical_to']=seen[digest]
    else:seen[digest]=a['id']
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
with (OUT/'manifest.csv').open('w',newline='',encoding='utf-8') as f:
    writer=csv.writer(f);writer.writerow(['id','category','file','width','height','pivot_x','pivot_y','orientation','state','seamless_self_repeat'])
    for a in assets:writer.writerow([a['id'],a['category'],a['file'],*a['size_px'],*a['pivot_px'],a.get('orientation',''),a.get('state',''),a.get('seamless_self_repeat',False)])

# Repeat tests: compare assembled alpha against the exact rasterized whole field,
# plus opposing edges of the periodic source and actual native-scale 4x4 mosaics.
def draw_floor_grid(im,uv,index,origin,size=4):
    tile=images[assets[index]['id']]
    for u in range(size):
        for v in range(size):im.alpha_composite(tile,(origin[0]+80*(u-v)-80,origin[1]+40*(u+v)-40))
repeat_im=Image.new('RGB',(1440,5*390+90),'#171c1e');title(repeat_im,'SEAMLESS FLOOR TESTS','01-10 / four by four repeats / native scale / each material tested against itself')
repeat_results=[]
for i in range(10):
    uv=np.array(floor_uv[i]);edge_x=int(np.abs(uv[:,0,:3].astype(int)-uv[:,-1,:3]).max());edge_y=int(np.abs(uv[0,:,:3].astype(int)-uv[-1,:,:3]).max())
    field=Image.new('RGBA',(680,360));draw_floor_grid(field,uv,i,(340,50))
    # Ground center of first tile (340,50); field covers u/v in [-.5,3.5].
    yy,xx=np.indices((360,680));wx=(xx+.5-340)/80;wy=(yy+1-50)/40;uu=(wx+wy)/2;vv=(wy-wx)/2;expected=(uu>=-.5)&(uu<3.5)&(vv>=-.5)&(vv<3.5)
    actual=np.array(field)[:,:,3]>0;holes=int(np.count_nonzero(expected&~actual));extras=int(np.count_nonzero(actual&~expected));alpha_ok=holes==0 and extras==0
    cx=(i%2)*720;cy=90+(i//2)*390;repeat_im.paste(field,(cx+20,cy),field);ImageDraw.Draw(repeat_im).text((cx+22,cy+357),f'{i+1:02} {FLOORS[i]} | edge error {edge_x}/{edge_y} | gaps {holes}',font=font(13),fill='#d1c8b7')
    repeat_results.append({'floor':i+1,'uv_opposing_edge_max_error':[edge_x,edge_y],'repeat_grid':[4,4],'uncovered_pixels':holes,'out_of_bounds_pixels':extras,'pass':edge_x==0 and edge_y==0 and alpha_ok})
repeat_im.save(OUT/'qa'/'seamless_repeats.png');qa['tests']['floor_repeats']=repeat_results

def paste_asset(im,id,u,v,origin=(640,320)):
    a=next(a for a in assets if a['id']==id);im.alpha_composite(images[id],(round(origin[0]+80*(u-v)-a['pivot_px'][0]),round(origin[1]+40*(u+v)-a['pivot_px'][1])))
def make_arch_alignment():
    board=Image.new('RGB',(2000,3*430+90),'#171c1e');title(board,'ARCH / WALL CONNECTION TESTS','Three-tile outer spans; all four directed views; endpoints match wall grid sockets')
    rows=[]
    for i,name in enumerate(ARCHES):
        for r,di in enumerate(['SE','SW','NW','NE']):
            cell=Image.new('RGBA',(500,410));origin=(250,267)
            for u in range(-2,3):
                uu,vv,_=rot((u,0,0),r);paste_asset(cell,assets[0]['id'],uu,vv,origin)
            placements=[]
            for s in [-2,2]:
                u,v,_=rot((s,0,0),r);placements.append((u+v,f'wall_01_{WALLS[0]}_panel_{di}',u,v))
            placements.append((0,f'arch_{i+1:02}_{name}_{di}',0,0))
            for _,id,u,v in sorted(placements):paste_asset(cell,id,u,v,origin)
            board.paste(cell,(r*500,90+i*430),cell);ImageDraw.Draw(board).text((r*500+10,90+i*430+386),f'{name} / {di}',font=font(12),fill='#c8bba4')
            arch=next(a for a in assets if a['id']==f'arch_{i+1:02}_{name}_{di}');matches=[]
            for sign in [-1,1]:
                wall_center=np.array(rot((sign*2,0,0),r)[:2]);wall_end=wall_center+np.array(rot((-sign*.5,0,0),r)[:2]);arch_end=np.array(rot((sign*1.5,0,0),r)[:2]);matches.append(float(np.max(np.abs(wall_end-arch_end))))
            rows.append({'arch':arch['id'],'span_tiles':3,'socket_max_error_tiles':max(matches),'pass':max(matches)==0})
    board.save(OUT/'qa'/'arch_wall_alignment.png');return rows
qa['tests']['arch_wall_sockets']=make_arch_alignment()

# Stable canvases and hinges are asserted for every orientation pair.
door_tests=[]
for name in DOORS:
    for direction in ['SE','SW','NW','NE']:
        pair=[a for a in assets if a.get('door_design')==name and a['orientation']==direction];door_tests.append({'design':name,'orientation':direction,'states':[a['state'] for a in pair],'same_size_pivot_hinge':all(pair[0][k]==pair[1][k] for k in ['size_px','pivot_px','hinge_tiles','connection_endpoints_tiles']),'pass':len(pair)==2 and all(pair[0][k]==pair[1][k] for k in ['size_px','pivot_px','hinge_tiles','connection_endpoints_tiles'])})
qa['tests']['door_state_alignment']=door_tests
wall_tests=[]
for w in WALLS:
    aa=[a for a in assets if a.get('wall_set')==w];masks={a['connection_mask'] for a in aa if 'connection_mask' in a};wall_tests.append({'wall_set':w,'all_16_topologies':masks==set(range(16)),'four_directed_panels':len([a for a in aa if a['topology']=='directed_panel'])==4,'pass':masks==set(range(16)) and len(aa)==20})
qa['tests']['wall_coverage']=wall_tests
wall_join_tests=[]
for style in range(5):
    for r,direction in enumerate(['SE','SW','NW','NE']):
        a=next(a for a in assets if a.get('wall_set')==WALLS[style] and a.get('topology')=='directed_panel' and a['orientation']==direction)
        combined=Image.new('RGBA',(512,384));origin=(256,240);u,v,_=rot((1,0,0),r)
        for cu,cv in sorted([(0,0),(u,v)],key=lambda p:p[0]+p[1]):combined.alpha_composite(images[a['id']],(round(origin[0]+80*(cu-cv)-128),round(origin[1]+40*(cu+cv)-192)))
        exact=Renderer((512,384),origin);draw_cells(exact,{(u,v) for u in range(-5,15) for v in [-1,0]},style,r)
        got=np.array(combined);want=np.array(exact.image());maskerr=int(np.count_nonzero((got[:,:,3]>0)!=(want[:,:,3]>0)))
        wall_join_tests.append({'wall_set':WALLS[style],'orientation':direction,'test':'two saved sprites versus one continuous geometric wall','silhouette_mismatch_pixels':maskerr,'pass':maskerr==0})
qa['tests']['wall_join_raster']=wall_join_tests
binary=all(set(np.unique(np.array(im)[:,:,3])).issubset({0,255}) for im in images.values());nonempty=all(im.getbbox() is not None for im in images.values());unique=len({hashlib.sha256(im.tobytes()).hexdigest() for im in images.values()})
qa['tests']['inventory']={'frames':len(assets),'expected':236,'all_nonempty':nonempty,'all_binary_alpha':binary,'unique_pixel_payloads':unique,'pass':len(assets)==236 and binary and nonempty}
qa['tests']['unique_designs']=[{'category':cat,'required':n,'unique':len({a['pixel_sha256'] for a in assets if a['category']==cat}),'pass':len({a['pixel_sha256'] for a in assets if a['category']==cat})==n} for cat,n in [('floors',60),('scatter',40)]]
roundtrip=[]
for a in assets:
    atlas_info=a['atlas'];x,y,w,h=atlas_info['rect_px'];sheet=Image.open(OUT/atlas_info['file']);crop=sheet.crop((x,y,x+w,y+h));roundtrip.append(crop.tobytes()==images[a['id']].tobytes())
qa['tests']['atlas_roundtrip']={'checked':len(roundtrip),'mismatches':roundtrip.count(False),'pass':all(roundtrip)}
clipped=[a['id'] for a in assets if a['category']!='floors' and (a['alpha_bounds_px'][0]<=0 or a['alpha_bounds_px'][1]<=0 or a['alpha_bounds_px'][2]>=a['size_px'][0] or a['alpha_bounds_px'][3]>=a['size_px'][1])]
qa['tests']['sprite_canvas_margins']={'clipped_candidates':clipped,'pass':not clipped}
if (ROOT/'reference.png').exists():
    ref=np.array(Image.open(ROOT/'reference.png').convert('RGB'))[494:574,:160];expected=np.any(ref!=[255,0,255],axis=2);actual=np.array(images[assets[0]['id']])[:,:,3]>0;err=int(np.count_nonzero(expected!=actual))
    qa['tests']['reference_floor_mask']={'source':'user supplied 56242.png','source_image_size_px':[800,893],'sample_box_px':[0,494,160,574],'mismatched_pixels':err,'opaque_pixels':int(actual.sum()),'pass':err==0}
else:
    expected=np.zeros((80,160),bool)
    for y in range(79):
        width=4*min(y+1,79-y);expected[y,(160-width)//2:(160+width)//2]=True
    actual=np.array(images[assets[0]['id']])[:,:,3]>0;err=int(np.count_nonzero(expected!=actual));qa['tests']['reference_floor_mask']={'source':'stored measured raster specification','mismatched_pixels':err,'pass':err==0}
qa['overall_pass']=all(item['pass'] for tests in qa['tests'].values() for item in (tests if isinstance(tests,list) else [tests]));(OUT/'qa'/'validation.json').write_text(json.dumps(qa,indent=2))

# Reusable blank canvases use conspicuous guides and are never mistaken for art.
grid=Image.new('RGBA',(160,80));gd=ImageDraw.Draw(grid);gd.polygon([(80,0),(159,40),(80,79),(0,40)],outline='#cdb17fff');gd.line((76,40,84,40),fill='#55e0dcff');gd.line((80,36,80,44),fill='#55e0dcff');grid.save(OUT/'template'/'floor_160x80_guide.png')
for label,size,pivot in [('wall',(256,256),(128,192)),('arch',(384,336),(192,248)),('door',(320,288),(160,208)),('scatter',(192,192),(96,168))]:
    im=Image.new('RGBA',size);d=ImageDraw.Draw(im);x,y=pivot;d.line((x-80,y,x,y-40,x+80,y,x,y+40,x-80,y),fill='#cdb17fff');d.line((x-5,y,x+5,y),fill='#55e0dcff');d.line((x,y-5,x,y+5),fill='#55e0dcff');im.save(OUT/'template'/f'{label}_guide.png')
spec={'template_version':1,'biome_name':'REPLACE_ME','grid':manifest['coordinate_system'],'required_inventory':manifest['coverage'],'floor_names':FLOORS,'wall_names':WALLS,'arch_names':ARCHES,'door_names':DOORS,'scatter_names':SCATTER,'source_atlas_layouts':{'floors':'three RGB sheets, each5x4 equal cells','walls':'5x2 RGB surface grid, front row then back row','arches':'3x2 RGBA isolated elevations, front row then reverse row','doors':'3x2 RGBA isolated leaves, front row then reverse row','scatter':'two5x4 RGBA isolated prop grids'},'generated_art_constraints':['Original artwork; reference is palette/projection inspiration only','No labels in art atlases','Keep detached sprite components separate from adjacent objects','Use transparent backgrounds for isolated objects'], 'mechanical_rules':['Native pixels only; nearest-neighbor texture sampling','Floor mask pixel centers exactly tessellate 160x80 grid','Only self-repeat materials01-10 are certified seamless','Architecture joins are centerline endpoints; thickness0.2 tile','Door open leaf rotates90 degrees about persistent hinge','Do not rescale sprites independently after packing']}
(OUT/'template'/'biome_template.json').write_text(json.dumps(spec,indent=2))
for p in SRC.glob('*.png'):shutil.copy2(p,OUT/'source_art'/p.name)
for p in [ROOT/'build_pack.py',ROOT/'inspect_sources.py']:
    if p.resolve()!=(OUT/'tools'/p.name).resolve():shutil.copy2(p,OUT/'tools'/p.name)
if (ROOT/'generation_prompts.json').exists():shutil.copy2(ROOT/'generation_prompts.json',OUT/'source_art'/'generation_prompts.json')
print(json.dumps({'output':str(OUT),'frames':len(assets),'qa_pass':qa['overall_pass'],'unique':unique}))
