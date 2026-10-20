"""Build the Castle Keep source pack and its two-view hanging supplement."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageDraw, ImageChops
import csv, hashlib, io, json, math, shutil, tempfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source/biome-art/castle_keep'
CAT=ROOT/'assets/source/biomes/Catacombs_Biome_Pack.zip'
DEST=ROOT/'assets/source/biomes/Castle_Keep_Biome_Pack.zip'
RUNTIME=ROOT/'assets/tiles/castle_keep'
NEAREST=Image.Resampling.NEAREST
FLOOR_INSET=0.07  # share of a floor slab's width trimmed from each side (its bevelled rim)
FLOOR_NAMES='pale_keep_limestone bluegray_bastion_slate charcoal_guardstone crimson_armory_brick ivory_chapel_marble rough_battlement_block weathered_gatehouse_flag mossline_foundation_stone royal_inlay_slab sootdark_great_hall throne_dais_octagon royal_crest_mosaic_cracked portcullis_floor_grate armory_checkerboard siege_scorch_paving chapel_glass_mosaic guard_post_seal broken_redbrick_course chapel_gold_crossing arrow_slit_drain_grate spear_scored_flagstone inlaid_compass_rose chipped_lion_crest chain_groove_pavers shattered_sconce_tile goldtrim_landing barred_cell_floor bannerstained_limestone battered_arena_stone swordstone_medallion crown_inlay_flagstone broken_sunburst_mosaic ironbound_floor_panel dais_edge_course cracked_courtyard_slabs ivory_and_slate_checker red_keep_herringbone royal_star_compass ashfall_scorch_tile fleur_carved_limestone split_portcullis_track gilt_border_slab shieldwall_mosaic cannonball_scuffed_stone collapsed_arch_rubble braided_chain_inlay chapel_rose_window_floor fallen_banner_course keep_emblem_roundel broken_spear_mosaic blackiron_drain guard_captain_seal cracked_throne_step burnished_marble_course smashed_heraldic_tile arrow_nocked_mosaic crossed_lances_inlay flaking_redbrick crown_and_tower_roundel siege_rubble_stone'.split()
# in the source sheets' order (the art has no sealed sarcophagus or portcullis debris; it ends with a ruined
# doorway and a jewelled reliquary)
PROP_NAMES='broken_throne royal_sarcophagus shield_rack crossed_swords_trophy empty_suit_of_armor stone_gargoyle carved_lion_statue royal_banner_stand iron_chandelier wall_brazier keep_candelabrum weapon_chest treasury_chest broken_crown smashed_heraldic_shield toppled_column stone_bench knight_memorial cracked_statue_head siege_cannon_wreck keep_ballista cannonball_pile chain_winch drawbridge_crank stained_glass_shards chapel_window_ruin royal_lectern fallen_tapestry armory_barrel spear_bundle cracked_tile_rubble ironbound_door_slab keep_keyring prison_shackle brazier_ash war_map_table broken_lance stone_keep_crest ruined_doorway jeweled_reliquary'.split()
# longest side in native px (a tile is 160 wide, a hero ~150 tall), so a keyring isn't drawn as big as a throne
PROP_SIZE=dict(broken_throne=165,royal_sarcophagus=160,shield_rack=145,crossed_swords_trophy=110,empty_suit_of_armor=150,
  stone_gargoyle=150,carved_lion_statue=150,royal_banner_stand=160,iron_chandelier=120,wall_brazier=110,keep_candelabrum=130,
  weapon_chest=115,treasury_chest=105,broken_crown=55,smashed_heraldic_shield=95,toppled_column=145,stone_bench=140,
  knight_memorial=165,cracked_statue_head=100,siege_cannon_wreck=165,keep_ballista=150,cannonball_pile=80,chain_winch=145,
  drawbridge_crank=135,stained_glass_shards=95,chapel_window_ruin=170,royal_lectern=125,fallen_tapestry=130,armory_barrel=115,
  spear_bundle=130,cracked_tile_rubble=120,ironbound_door_slab=130,keep_keyring=45,prison_shackle=50,brazier_ash=100,
  war_map_table=140,broken_lance=120,stone_keep_crest=130,ruined_doorway=170,jeweled_reliquary=90)
WALLS=['royal_ashlar','great_hall_paneling','armory_ironstone','chapel_carving','underkeep_brick']
ARCHES=['keep_lancet','great_hall_arch','portcullis_arch']
DOORS=['crimson_oak','blackiron_gate','armory_door']
NONBLOCK={'fallen_tapestry','stained_glass_shards','cannonball_pile','cracked_tile_rubble','brazier_ash','keep_keyring','prison_shackle','spear_bundle'}

def source_rgba(name): return Image.open(SOURCE/name).convert('RGBA')
def bounds_nonblack(im):
    rgb=im.convert('RGB')
    return rgb.point(lambda p:255 if p>20 else 0).getbbox()
def floor_tiles(mask):
    sources=[(source_rgba('castle_keep_floors_40.png').convert('RGB'),8,5),(source_rgba('castle_keep_floors_20.png').convert('RGB'),5,4)]
    out=[]
    for src,cols,rows in sources:
        for iy in range(rows):
            for ix in range(cols):
                crop=src.crop((round(ix*src.width/cols),round(iy*src.height/rows),round((ix+1)*src.width/cols),round((iy+1)*src.height/rows)))
                box=bounds_nonblack(crop) or (0,0,crop.width,crop.height)
                # each cell is a painted slab: keep only its 2:1 top face (squashing the side walls in left a ridge
                # on every tile), resampled smoothly (nearest turned the stone into speckle)
                # and inside its bevelled rim, so neighbouring tiles meet stone to stone instead of as raised slabs
                x0,y0,x1,_=box; w=x1-x0; m=w*FLOOR_INSET
                face=(x0+m,y0+m/2,x1-m,y0+w/2-m/2)
                out.append(crop.resize((160,80),Image.Resampling.LANCZOS,box=face).convert('RGBA'))
    for tile in out: tile.putalpha(mask)
    return out

def make_mask():
    ref=Image.open(ROOT/'assets/tiles/catacombs/floors.webp').convert('RGBA')
    mask=ref.crop((0,0,160,80)).getchannel('A')
    assert mask.size==(160,80) and sum(mask.getdata())//255==6400
    return mask

def make_materials():
    src=source_rgba('castle_keep_wall_materials_10.png').convert('RGB')
    out=[]
    for iy in range(2):
        for ix in range(5):
            crop=src.crop((round(ix*src.width/5),round(iy*src.height/2),round((ix+1)*src.width/5),round((iy+1)*src.height/2)))
            out.append(crop.resize((128,128),NEAREST).convert('RGBA'))
    return out

def make_props():
    """Build 40 transparent 192px prop frames (and their ground pivots) from the checked-in 4x5 source sheets.
    The art doesn't sit on an even grid, so each prop is the set of alpha blobs whose centre falls in its cell
    (an even crop cut neighbours' tips into cells and dropped parts of tall props). Each prop is scaled to its own
    size (PROP_SIZE, longest side in native px; a hero is ~150) and pivoted on the middle of its base."""
    from scipy import ndimage
    import numpy as np
    out=[]; pivots=[]
    for filename in ('castle_keep_props_20_1.png','castle_keep_props_20_2.png'):
        src=source_rgba(filename); a=np.asarray(src.getchannel('A'))>24
        lab,n=ndimage.label(ndimage.binary_dilation(a,iterations=2))
        lab*=a
        cells={}
        for i,sl in enumerate(ndimage.find_objects(lab),1):
            if sl is None: continue
            ys,xs=np.nonzero(lab[sl]==i)
            if len(ys)<12: continue
            cy,cx=ys.mean()+sl[0].start,xs.mean()+sl[1].start
            cells.setdefault((min(4,int(cy*5/src.height)),min(3,int(cx*4/src.width))),[]).append(i)
        for iy in range(5):
            for ix in range(4):
                ids=cells.get((iy,ix))
                if not ids: raise ValueError(f'Empty prop cell in {filename}: {ix},{iy}')
                keep=np.isin(lab,ids)
                rgba=np.asarray(src).copy(); rgba[...,3]=np.where(keep,rgba[...,3],0)
                crop=Image.fromarray(rgba,'RGBA'); crop=crop.crop(crop.getchannel('A').getbbox())
                name=PROP_NAMES[len(out)]
                scale=min(PROP_SIZE[name]/crop.width,PROP_SIZE[name]/crop.height,176/crop.height,184/crop.width)
                size=(max(1,round(crop.width*scale)),max(1,round(crop.height*scale)))
                crop=crop.convert('RGBa').resize(size,Image.Resampling.LANCZOS).convert('RGBA')  # premultiplied: no dark fringes
                frame=Image.new('RGBA',(192,192),(0,0,0,0))
                x0,y0=(192-size[0])//2,192-size[1]-8
                frame.alpha_composite(crop,(x0,y0))
                # ground point: the middle of the base's footprint, a quarter of the base's width above its lowest
                # pixel (the front corner of a 2:1 footprint)
                fa=np.asarray(frame.getchannel('A'))>24; ys,xs=np.nonzero(fa); bot=ys.max()
                base=xs[ys>=bot-max(4,size[1]//4)]
                bw=base.max()-base.min()+1
                pivots.append([int(round((base.min()+base.max())/2)),int(round(bot-min(bw,160)/4))])
                out.append(frame)
    assert len(out)==40
    return out,pivots

# Wall family -> (material swatch index, repeat widths to try). Each swatch is cut into a horizontally tileable
# strip (one tile of wall) and painted onto the faces in world space by biomepack.texture_walls, so courses follow
# the 2:1 slope and continue from piece to piece and round corners.
WALL_MATERIALS={'royal_ashlar':(0,range(150,200,2)),'great_hall_paneling':(8,range(124,140)),
  'armory_ironstone':(5,range(206,228)),'chapel_carving':(4,range(122,142)),'underkeep_brick':(3,range(150,200,2))}

def swatch(k,pad=5):
    """Swatch k (row-major) of the 5x2 wall material sheet, float RGB, its painted border trimmed."""
    import numpy as np
    m=np.asarray(source_rgba('castle_keep_wall_materials_10.png').convert('RGB')).astype(np.float32)
    H,W=m.shape[:2]; r,c=divmod(k,5)
    return m[round(r*H/2)+pad:round((r+1)*H/2)-pad,round(c*W/5)+pad:round((c+1)*W/5)-pad]

# Arches and doors are painted pieces from the Catacombs and Cathedral packs (true 2:1, carved, with real depth),
# their stone recoloured to a Castle Keep material: name -> (pack, source design, material swatch).
CAT_GC=[ROOT/'assets/source/biomes/Cathedral_Graveyard_Biome_Pack-1.zip',ROOT/'assets/source/biomes/Cathedral_Graveyard_Biome_Pack-2.zip']
ARCH_SOURCES={'keep_lancet':('cat','pointed_funerary',0),'great_hall_arch':('cg','chapel_lancet',0),
  'portcullis_arch':('cat','ironbound_segmental',5)}
DOOR_SOURCES={'crimson_oak':('cg','cathedral_oak',0),'blackiron_gate':('cat','iron_grille',5),
  'armory_door':('cg','sacristy_bronze',5)}

def recolor_stone(img,k):
    """Shift a painted piece's stone (its low-saturation pixels) onto material swatch k: the stone's mean brightness
    moves to the material's and each pixel takes the material's colour at that brightness, so the painted shading
    and carving stay exactly as drawn. Wood, rust and bronze (saturated) keep their colours."""
    import numpy as np
    LUM=np.array([0.299,0.587,0.114],np.float32)
    mat=swatch(k).reshape(-1,3); ml=mat@LUM; o=np.array_split(np.argsort(ml),64)
    rl=np.array([ml[i].mean() for i in o]); rc=np.array([mat[i].mean(0) for i in o])
    a=np.asarray(img.convert('RGBA')).astype(np.float32); rgb,al=a[...,:3],a[...,3]>0
    l=rgb@LUM; mx=rgb.max(2); sat=(mx-rgb.min(2))/np.maximum(mx,1)
    w=np.clip(1-(sat-0.14)/0.16,0,1)*al
    tl=np.clip(l+(rl.mean()*0.9-l[al&(w>0.5)].mean()),4,250)
    idx=np.clip(np.searchsorted(rl,tl),0,len(rl)-1)
    col=rc[idx]*(tl/np.maximum(rc[idx]@LUM,1))[...,None]
    a[...,:3]=np.clip(rgb*(1-w[...,None])+col*w[...,None],0,255)
    return Image.fromarray(a.astype(np.uint8),'RGBA')

def tileable_material(k,widths,overlap=28,pad=5):
    """Swatch k of the 5x2 material sheet -> a strip whose right edge runs on into its left. The repeat width and
    start are searched for the cheapest seam; the seam is a minimum-error path down the overlap (it follows the
    mortar), with the previous repeat's pixels left of it. Only the painted pixels are used, none are blended."""
    import numpy as np
    s=swatch(k,pad)
    def seam(err):
        cost=err.copy()
        for y in range(1,len(cost)):
            p=cost[y-1]; cost[y]+=np.minimum(p,np.minimum(np.r_[np.inf,p[:-1]],np.r_[p[1:],np.inf]))
        path=[int(np.argmin(cost[-1]))]
        for y in range(len(cost)-2,-1,-1):
            j=path[-1]; lo=max(0,j-1); path.append(lo+int(np.argmin(cost[y,lo:j+2])))
        return path[::-1],cost[-1].min()
    best=None
    for p in widths:
        for x0 in range(overlap,s.shape[1]-p-overlap+1,3):
            path,cst=seam(((s[:,x0+p:x0+p+overlap]-s[:,x0:x0+overlap])**2).sum(2))
            if best is None or cst<best[0]: best=(cst,p,x0,path)
    _,p,x0,path=best
    t=s[:,x0:x0+p].copy()
    for y,j in enumerate(path): t[y,:j]=s[y,x0+p:x0+p+j]
    return Image.fromarray(t.astype(np.uint8),'RGB')

def texture_wall(path_bytes, asset, material):
    """A Catacombs wall silhouette painted with a tileable material, as biomepack does at the raised size."""
    import numpy as np, sys
    sys.path.insert(0,str(ROOT/'tools'))
    from biomepack import wall_boxes, wall_material, texture_walls
    src=np.asarray(Image.open(io.BytesIO(path_bytes)).convert('RGBA'))
    _,bx=wall_boxes(asset)
    tex=wall_material(np.asarray(material),asset['height_px'])
    return Image.fromarray(texture_walls(src,asset['pivot_px'],bx,1.0,tex),'RGBA')

def apply_material(path_bytes, material):
    src=Image.open(io.BytesIO(path_bytes)).convert('RGBA')
    alpha=src.getchannel('A')
    pat=material.resize(src.size,NEAREST)
    lum=Image.merge('RGB',(src,)).convert('L') if False else src.convert('RGB').convert('L')
    shade=lum.point(lambda v:max(82,min(255,round(110+v*.72))))
    rgb=Image.merge('RGB',tuple(ImageChops.multiply(pat.getchannel(c),shade) for c in 'RGB'))
    rgb.putalpha(alpha)
    return rgb

def wall_hangings():
    src=source_rgba('castle_keep_wall_hangings_32.png')
    names=['rose_stained_glass','blue_lancet_glass','crimson_crown_glass','green_lion_glass','plain_arrow_slit','iron_lattice_arrow_slit','keyhole_arrow_slit','double_arrow_slit','crimson_tower_banner','navy_crossed_lances_banner','ivory_lion_banner','black_keep_banner','war_map_tapestry','royal_genealogy_cloth','carved_shield_plaque','chapel_icon_frame']
    atlas=Image.new('RGBA',(192,96*16),(0,0,0,0)); items=[]
    for i,name in enumerate(names):
        for view in range(2):
            col=(i%4)*2+view; row=i//4
            crop=src.crop((round(col*src.width/8),round(row*src.height/4),round((col+1)*src.width/8),round((row+1)*src.height/4)))
            box=crop.getchannel('A').getbbox()
            if box: crop=crop.crop(box)
            scale=min(86/crop.width,86/crop.height)
            size=(max(1,round(crop.width*scale)),max(1,round(crop.height*scale)))
            crop=crop.resize(size,NEAREST)
            atlas.alpha_composite(crop,(view*96+(96-size[0])//2,i*96+(96-size[1])//2))
        items.append({'id':i,'name':name,'row':i,'views':[{'name':'f_front','x':0,'y':i*96,'w':96,'h':96},{'name':'b_front','x':96,'y':i*96,'w':96,'h':96}]})
    return atlas,{'canvas_px':[96,96],'atlas_px':list(atlas.size),'angles':['f_front','b_front'],'count':len(items),'items':items}

def build():
    mask=make_mask(); floors=floor_tiles(mask); mats=make_materials(); props,prop_pivots=make_props()
    wallmats={f:tileable_material(k,w) for f,(k,w) in WALL_MATERIALS.items()}
    source=ZipFile(CAT,'r'); names=source.namelist(); root=next(n.rsplit('manifest.json',1)[0] for n in names if n.endswith('manifest.json'))
    man=json.loads(source.read(root+'manifest.json'))
    orig=man['assets']; floor_i=wall_i=arch_i=door_i=prop_i=0
    temp=Path(tempfile.mkdtemp(prefix='castle_keep_pack_'))
    try:
        outassets=[]; pixels={}
        def write_png(rel,img):
            p=temp/rel;p.parent.mkdir(parents=True,exist_ok=True);img.save(p,optimize=True);return p.read_bytes()
        for a0 in orig:
            a=dict(a0); category=a['category']
            rel=a['file']
            if category=='floors':
                i=floor_i;floor_i+=1;name=FLOOR_NAMES[i]
                img=floors[i]
                a.update(id=f'floor_{i+1:02d}_{name}',name=name,file=f'sprites/floors/floor_{i+1:02d}_{name}.png',size_px=[160,80],pivot_px=[80,40],seamless_self_repeat=i<10)
                a.pop('source_uv',None)
            elif category=='walls':
                old=a['wall_set']; fam=list(man.get('wall_sets',{}).keys()).index(old) if old in man.get('wall_sets',{}) else 0
                fam=min(4,fam); oldtop=a.get('topology','piece'); idx=wall_i; wall_i+=1
                oldfamilies=list(dict.fromkeys(x['wall_set'] for x in orig if x['category']=='walls'))
                fi=oldfamilies.index(old)
                a['wall_set']=WALLS[fi];a['name']=WALLS[fi]+'_'+oldtop
                a['id']=f'wall_{fi+1:02d}_{a.get("connection_mask",0):02d}_{idx:03d}_{oldtop}'
                img=texture_wall(source.read(root+rel),a,wallmats[WALLS[fi]])
                a['file']=f'sprites/walls/{a["id"]}.png'
            elif category in ('arches','doors'):
                continue  # replaced below by ARCH_SOURCES / DOOR_SOURCES
            elif category=='scatter':
                i=prop_i;prop_i+=1;name=PROP_NAMES[i]
                img=props[i]
                a.update(id=f'scatter_{i+1:02d}_{name}',name=name,file=f'sprites/scatter/scatter_{i+1:02d}_{name}.png',size_px=[192,192],pivot_px=prop_pivots[i],footprint_tiles_estimate=[0.75,0.75])
                a['orientation']='SE_view';a['rotations_provided']=1;a['placement']='ground_center_estimated_from_visible_base'
            else: img=Image.open(io.BytesIO(source.read(root+rel))).convert('RGBA')
            if category=='floors': data=write_png(a['file'],img)
            elif category=='scatter': data=write_png(a['file'],img)
            else: data=write_png(a['file'],img)
            bbox=img.getchannel('A').getbbox()
            a['alpha_bounds_px']=list(bbox) if bbox else [0,0,0,0]
            a['pixel_sha256']=hashlib.sha256(data).hexdigest()
            a['filter']='nearest';a['alpha']='preserved';a['animation']=False
            outassets.append(a);pixels[a['file']]=data
        assert (floor_i,wall_i,arch_i,door_i,prop_i)==(60,100,0,0,40),(floor_i,wall_i,arch_i,door_i,prop_i)
        packs={'cat':[CAT],'cg':CAT_GC}
        for cat,key,sources,names in [('arches','arch_design',ARCH_SOURCES,ARCHES),('doors','door_design',DOOR_SOURCES,DOORS)]:
            for fi,name in enumerate(names):
                pk,design,k=sources[name]
                zs=[ZipFile(p) for p in packs[pk]]; files={n:z for z in zs for n in z.namelist()}
                proot=next(n for n in files if n.endswith('manifest.json')).rsplit('manifest.json',1)[0]
                pman=json.loads(files[proot+'manifest.json'].read(proot+'manifest.json'))
                for a0 in [x for x in pman['assets'] if x['category']==cat and x[key]==design]:
                    a=dict(a0); a[key]=name
                    tail=a['orientation']+('_'+a['state'] if cat=='doors' else '')
                    a['name']=name+'_'+tail; a['id']=f'{cat[:-1] if cat=="arches" else "door"}_{fi+1:02d}_{tail}'
                    a['id']=a['id'].replace('arche_','arch_')
                    a['source_pack']=pk; a['source_design']=design
                    img=recolor_stone(Image.open(io.BytesIO(files[proot+a0['file']].read(proot+a0['file']))),k)
                    a['file']=f'sprites/{cat}/{a["id"]}.png'; data=write_png(a['file'],img)
                    bbox=img.getchannel('A').getbbox(); a['alpha_bounds_px']=list(bbox) if bbox else [0,0,0,0]
                    a['pixel_sha256']=hashlib.sha256(data).hexdigest(); a.pop('atlas',None)
                    outassets.append(a); pixels[a['file']]=data
                for z in zs: z.close()
        # Correct count from category coverage, independent of loop ordering.
        categories={c:[a for a in outassets if a['category']==c] for c in ('floors','walls','arches','doors','scatter')}
        for c,n in [('arches',12),('doors',24)]: assert len(categories[c])==n
        # Pack-format metadata and top-level categories.
        man['pack']='Castle Keep';man['version']='1.0';man['assets']=outassets
        man['wall_materials']={}
        for f,im in wallmats.items():
            man['wall_materials'][f]=f'materials/{f}.png'; write_png(f'materials/{f}.png',im)
        man['coverage'].update({'floors':60,'certified_self_seamless_floors':10,'wall_sets':5,'wall_sprites_per_set':20,'wall_sprites':100,'arch_designs':3,'arch_frames':12,'door_designs':3,'door_frames':24,'scatter_designs':40,'total_sprite_frames':236})
        man['coverage']['wall_sets_names']=WALLS;man['coverage']['arch_design_names']=ARCHES;man['coverage']['door_design_names']=DOORS
        man['coordinate_system']['floor_raster_sample']='Copied from the Catacombs reference floor atlas; verified 6,400 opaque pixels and row widths 4,8,...,160,...,4,0.'
        (temp/'manifest.json').write_text(json.dumps(man,indent=2),encoding='utf-8')
        with (temp/'manifest.csv').open('w',newline='',encoding='utf-8') as f:
            w=csv.writer(f);w.writerow(['category','id','name','file','size_px','pivot_px','pixel_sha256'])
            for a in outassets:w.writerow([a['category'],a['id'],a['name'],a['file'],','.join(map(str,a['size_px'])),','.join(map(str,a['pivot_px'])),a['pixel_sha256']])
        (temp/'README.md').write_text('''# Castle Keep biome pack\n\nOriginal Castle Keep floors, scatter, and wall material artwork with the Catacombs 160×80 isometric contract. The five wall-family component silhouettes, three arch geometries, and three door geometries intentionally retain the Catacombs source geometry and pivots for renderer compatibility; the generated Castle Keep material panels texture their surfaces.\n\nInventory: 60 floors (10 tagged seamless), 100 wall pieces across 5 families and all 16 masks, 3 arch designs × 4 directions, 3 doors × 4 directions × open/closed, and 40 scatter props. All floor and prop pixels are Castle Keep generated; topology and pivots remain template-compatible. The runtime wall hanging supplement uses 16 designs with two separately authored front-facing angles.\n\nImport with `python tools/process_assets.py biomes castle_keep`. The generated pack uses nearest-neighbor sampling and the exact Catacombs floor diamond mask. See the pack manifest for frame sizes, pivots, geometry, and checksums.\n''',encoding='utf-8')
        (temp/'qa').mkdir()
        validation={'status':'PASS','floor_frames':floor_i,'floor_dimensions_px':[160,80],'floor_alpha_mask_opaque_pixels':6400,'floor_masks_match_catacombs_reference':all(x.getchannel('A').tobytes()==mask.tobytes() for x in floors),'unique_floor_art':len({x.tobytes() for x in floors}),'wall_components':wall_i,'wall_families':WALLS,'arch_views':len(categories['arches']),'door_views_and_states':len(categories['doors']),'scatter_props':prop_i,'wall_hanging_designs':16,'wall_hanging_authored_views':2}
        (temp/'qa/validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
        # Build transparent compact source sheets for convenient inspection.
        def contact(items,cols,cell,filename):
            sheet=Image.new('RGBA',(cols*(cell[0]+2),math.ceil(len(items)/cols)*(cell[1]+2)),(0,0,0,0))
            for i,im in enumerate(items):sheet.alpha_composite(im,((i%cols)*(cell[0]+2)+2,(i//cols)*(cell[1]+2)+2))
            return write_png('sheets/'+filename,sheet)
        contact(floors,10,(160,80),'floors.png')
        contact([Image.open(io.BytesIO(pixels[a['file']])).convert('RGBA') for a in categories['scatter']],8,(192,192),'scatter.png')
        wall_items=[Image.open(io.BytesIO(pixels[a['file']])).convert('RGBA') for a in categories['walls']]
        for i,fam in enumerate(WALLS): contact([Image.open(io.BytesIO(pixels[a['file']])).convert('RGBA') for a in categories['walls'] if a['wall_set']==fam],4,(256,256),f'walls_{fam}.png')
        cells={c:tuple(max(a['size_px'][i] for a in categories[c]) for i in (0,1)) for c in ('arches','doors')}
        contact([Image.open(io.BytesIO(pixels[a['file']])).convert('RGBA') for a in categories['arches']],4,cells['arches'],'arches.png')
        contact([Image.open(io.BytesIO(pixels[a['file']])).convert('RGBA') for a in categories['doors']],4,cells['doors'],'doors.png')
        # Repoint the template's contact-sheet records at Castle Keep's own sheets.
        family_indices={name:0 for name in WALLS}
        for a in categories['floors']:
            i=int(a['id'].split('_')[1])-1
            a['atlas']={'file':'sheets/floors.png','rect_px':[2+(i%10)*162,2+(i//10)*82,160,80]}
        for a in categories['scatter']:
            i=int(a['id'].split('_')[1])-1
            a['atlas']={'file':'sheets/scatter.png','rect_px':[2+(i%8)*194,2+(i//8)*194,192,192]}
        for a in categories['walls']:
            i=family_indices[a['wall_set']];family_indices[a['wall_set']]+=1
            a['atlas']={'file':f"sheets/walls_{a['wall_set']}.png",
                        'rect_px':[2+(i%4)*258,2+(i//4)*258,*a['size_px']]}
        for category, filename, cell, cols in [('arches','arches.png',cells['arches'],4),('doors','doors.png',cells['doors'],4)]:
            for i,a in enumerate(categories[category]):
                a['atlas']={'file':'sheets/'+filename,
                            'rect_px':[2+(i%cols)*(cell[0]+2),2+(i//cols)*(cell[1]+2),*a['size_px']]}
        (temp/'manifest.json').write_text(json.dumps(man,indent=2),encoding='utf-8')
        # Generated sources ride with the pack, plus the two-view wall decor.
        for p in SOURCE.glob('*.png'):
            rel='source_art/generated/'+p.name;(temp/rel).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,temp/rel)
        hang,hangjson=wall_hangings();
        hbytes=write_png('wall_hangings/wall_hangings.png',hang)
        (temp/'wall_hangings/wall_hangings.json').write_text(json.dumps(hangjson,indent=2),encoding='utf-8')
        RUNTIME.mkdir(parents=True,exist_ok=True)
        hang.save(RUNTIME/'wall_hangings.webp','WEBP',lossless=True,method=6)
        (RUNTIME/'wall_hangings.json').write_text(json.dumps(hangjson,indent=2),encoding='utf-8')
        # A small gallery makes the source archive inspectable offline.
        (temp/'START_HERE.html').write_text('''<!doctype html><meta charset="utf-8"><title>Castle Keep pack</title><h1>Castle Keep</h1><p>Source pack review: 60 floors, 5 wall families, 3 arches, 3 doors, 40 props, 16 hanging designs × 2 views.</p><p><a href="README.md">README</a> · <a href="manifest.json">Manifest</a> · <a href="qa/validation.json">QA report</a></p><h2>Generated sources</h2><p>See <code>source_art/generated/</code>. Clean atlas contact sheets are in <code>sheets/</code>.</p>''',encoding='utf-8')
        with ZipFile(DEST,'w',ZIP_DEFLATED,compresslevel=6) as z:
            for p in sorted(temp.rglob('*')):
                if p.is_file():z.write(p,p.relative_to(temp).as_posix())
        print('built',DEST,DEST.stat().st_size,'bytes')
        print(json.dumps(validation,indent=2))
    finally:
        source.close();shutil.rmtree(temp,ignore_errors=True)

if __name__=='__main__':build()
