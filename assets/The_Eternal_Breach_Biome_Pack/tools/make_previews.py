from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, sys, hashlib, shutil
P=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent/'outputs'/'The_Eternal_Breach_Biome_Pack'
m=json.loads((P/'manifest.json').read_text());aa=m['assets'];by={a['id']:a for a in aa};imgs={a['id']:Image.open(P/a['file']).convert('RGBA') for a in aa}
def font(n):
    try:return ImageFont.truetype('C:/Windows/Fonts/consola.ttf',n)
    except OSError:return ImageFont.load_default()
def asset(cat,n,**kw):
    prefix={'floors':'floor','walls':'wall','arches':'arch','doors':'door','scatter':'scatter'}[cat]+f'_{n:02}_'
    return next(a for a in aa if a['category']==cat and a['id'].startswith(prefix) and all(a.get(k)==v for k,v in kw.items()))
def paste(im,a,u,v,origin):
    im.alpha_composite(imgs[a['id']],(round(origin[0]+80*(u-v)-a['pivot_px'][0]),round(origin[1]+40*(u+v)-a['pivot_px'][1])))
def thumbnail(board,a,box,label=None):
    x,y,w,h=box;im=imgs[a['id']];bb=im.getbbox();crop=im.crop(bb);board.paste(crop,(x+(w-crop.width)//2,y+max(0,(h-24-crop.height)//2)),crop)
    if label:ImageDraw.Draw(board).text((x+12,y+h-20),label,font=font(13),fill='#c3b89f')

overview=Image.new('RGB',(1600,1230),'#11181b');d=ImageDraw.Draw(overview)
d.text((36,24),m['pack'].upper(),font=font(39),fill='#e2c99a');d.text((650,38),'160 x 80 PIXEL BIOME SYSTEM',font=font(19),fill='#9facad')
d.text((36,78),'60 FLOORS  /  5 WALL FAMILIES  /  3 ARCHES  /  3 DOORS  /  40 PROPS',font=font(18),fill='#c7c2b3')
scene=Image.new('RGBA',(1080,650));origin=(430,168);placements=[];scene_data={'origin_px':list(origin),'tile_size_px':[160,80],'floors':[],'objects':[]}
for u in range(7):
    for v in range(5):
        n=1
        if (u,v)==(3,1):n=31
        if (u,v)==(4,2):n=11
        if (u,v)==(2,3):n=44
        if (u,v)==(5,3):n=24
        a=asset('floors',n);paste(scene,a,u,v,origin);scene_data['floors'].append({'id':a['id'],'u':u,'v':v})
for u in [4,5,6]:
    a=asset('walls',4 if u<6 else 5,topology='directed_panel',orientation='SE');placements.append((u,-.5,a))
for v in range(3):
    a=asset('walls',5,topology='directed_panel',orientation='NE');placements.append((6.5,v,a))
for v in [3,4]:
    a=asset('walls',1,topology='directed_panel',orientation='NE');placements.append((-.5,v,a))
placements.append((3.0,1.8,asset('arches',2,orientation='SE')))
placements.append((6.2,3.0,asset('doors',2,orientation='SE',state='open')))
for n,u,v in [(1,.65,.7),(20,.7,2.4),(13,3,.1),(11,4,.25),(16,5.8,.3),(32,6.1,1.4),(27,.3,4),(21,1.8,4.0),(19,3.0,3.3),(10,4.2,3.6),(37,5.4,4),(24,6.2,4.0)]:placements.append((u,v,asset('scatter',n)))
for u,v,a in sorted(placements,key=lambda p:(p[0]+p[1],p[1])):
    paste(scene,a,u,v,origin);scene_data['objects'].append({'id':a['id'],'u':u,'v':v})
overview.paste(scene,(20,120),scene);scene.save(P/'qa'/'assembled_room.png');(P/'template'/'example_room.json').write_text(json.dumps(scene_data,indent=2))
d.text((1125,137),'TEN REPEATABLE FLOORS',font=font(18),fill='#d7c299')
for i in range(10):thumbnail(overview,asset('floors',i+1),(1110+(i%2)*230,175+(i//2)*104,220,100),f'{i+1:02} '+asset('floors',i+1)['name'].replace('_',' ')[:23])
d.text((36,776),'FIVE COMPLETE WALL FAMILIES',font=font(22),fill='#dfc99f')
for i in range(5):
    name=asset('walls',i+1,connection_mask=6).get('wall_set',f'Wall {i+1}').replace('_',' ').upper()
    x=i*320;d.rectangle((x+16,820,x+304,1032),fill='#182125',outline='#344145');thumbnail(overview,asset('walls',i+1,topology='corner',connection_mask=6),(x+22,826,276,194),name)
d.text((36,1063),'236 TRANSPARENT FRAMES',font=font(23),fill='#dfc99f');d.text((36,1103),'Measured diamond mask | Four architecture directions | Open + closed doors',font=font(18),fill='#acb6b3');d.text((36,1135),'Individual PNGs, transparent atlases, labeled sheets, pivots, QA layouts and reusable template',font=font(17),fill='#acb6b3');d.text((36,1180),'Original generated art + deterministic pixel geometry. Preview uses the delivered sprites.',font=font(14),fill='#87928f')
overview.save(P/'Overview.png')

# Junction scenes visually check every wall family in an assembled L / T / cross arrangement.
board=Image.new('RGB',(1700,5*370+90),'#161e21');bd=ImageDraw.Draw(board);bd.text((24,18),'WALL JUNCTION ASSEMBLY TESTS',font=font(27),fill='#dfc99f');bd.text((24,56),'Each family: straight run / all corner rotations / T junction / cross junction',font=font(14),fill='#b4b5aa')
nodesets=[[(0,0,10),(-1,0,2),(1,0,8)],[(0,0,6),(1,0,12),(0,1,3),(1,1,9)],[(0,0,14),(-1,0,2),(1,0,8),(0,1,1)],[(0,0,15),(-1,0,2),(1,0,8),(0,1,1),(0,-1,4)]]
for style in range(5):
    for k,nodes in enumerate(nodesets):
        cell=Image.new('RGBA',(425,340));origin=(210,215)
        for u in [-1,0,1]:
            for v in [-1,0,1]:paste(cell,asset('floors',1),u,v,origin)
        for u,v,mask in sorted(nodes,key=lambda p:p[0]+p[1]):paste(cell,asset('walls',style+1,connection_mask=mask),u,v,origin)
        board.paste(cell,(k*425,90+style*370),cell);bd.text((k*425+16,90+style*370+341),asset('walls',style+1,connection_mask=0)['wall_set']+' / '+['run','corners','tee','cross'][k],font=font(12),fill='#bdb49f')
board.save(P/'qa'/'wall_junctions.png')

# State-pair comparison on the same floor, with ground origin and hinge marked.
board=Image.new('RGB',(1440,3*660+90),'#161e21');bd=ImageDraw.Draw(board);bd.text((24,18),'DOOR / WALL / STATE ALIGNMENT',font=font(27),fill='#dfc99f');bd.text((24,55),'Cyan = doorway pivot, gold = fixed hinge | unchanged wall sockets and ground origin',font=font(14),fill='#b4b5aa')
for i in range(3):
    for k,di in enumerate(['SE','SW','NW','NE']):
        r=k
        def rotation(u,v):
            for _ in range(r):u,v=-v,u
            return u,v
        for st,state in enumerate(['closed','open']):
            cell=Image.new('RGBA',(360,320));o=(180,205)
            for u,v in [(-1,0),(0,0),(1,0),(0,1)]:paste(cell,asset('floors',1),u,v,o)
            objects=[]
            for s in [-1,1]:
                u,v=rotation(s,0);objects.append((u,v,asset('walls',[1,4,2][i],topology='directed_panel',orientation=di)))
            a=asset('doors',i+1,orientation=di,state=state);objects.append((0,0,a))
            for u,v,obj in sorted(objects,key=lambda p:p[0]+p[1]):paste(cell,obj,u,v,o)
            cd=ImageDraw.Draw(cell);x,y=o;cd.line((x-4,y,x+4,y),fill='#3df7ee',width=1);cd.line((x,y-4,x,y+4),fill='#3df7ee');hu,hv=a['hinge_tiles'];hx=round(x+80*(hu-hv));hy=round(y+40*(hu+hv));cd.ellipse((hx-2,hy-2,hx+2,hy+2),fill='#ffb744')
            bx=k*360;byy=90+i*660+st*330;board.paste(cell,(bx,byy),cell);bd.text((bx+12,byy+303),a['door_design']+' / '+di+' / '+state,font=font(12),fill='#bdb49f')
board.save(P/'qa'/'door_wall_alignment.png')

config=json.loads((P/'template'/'biome_template.json').read_text());config['scatter_widths_px']=[136,136,122,86,98,130,54,78,86,38,50,58,136,76,68,88,106,80,122,64,128,134,148,100,58,60,84,80,112,70,80,58,90,58,50,100,110,126,70,74];(P/'template'/'biome_template.json').write_text(json.dumps(config,indent=2));config['biome_name']=m['pack'];(P/'template'/'eternal_breach_config.json').write_text(json.dumps(config,indent=2))
guide=Image.new('RGB',(1200,830),'#162025');g=ImageDraw.Draw(guide);g.text((30,24),'REUSABLE BIOME LAYOUT / 160 x 80',font=font(29),fill='#dfc99f');g.text((30,65),'Gold = footprint / cyan = ground pivot / all guide pixels must be removed before export',font=font(15),fill='#afb7b2')
slots=[('FLOOR / 160 x 80',(160,80),(80,40),(80,155)),('WALL / 256 x 256',(256,256),(128,192),(350,110)),('ARCH / 384 x 336',(384,336),(192,248),(710,110)),('DOOR / 320 x 288',(320,288),(160,208),(90,475)),('SCATTER / 192 x 192',(192,192),(96,168),(510,475))]
for label,size,pivot,pos in slots:
    x,y=pos;w,h=size;g.rectangle((x,y,x+w,y+h),outline='#54666b',width=2);px,py=x+pivot[0],y+pivot[1];g.line((px-80,py,px,py-40,px+80,py,px,py+40,px-80,py),fill='#dfbf80',width=2);g.line((px-6,py,px+6,py),fill='#43e7db',width=2);g.line((px,py-6,px,py+6),fill='#43e7db',width=2);g.text((x,y-25),label,font=font(15),fill='#c5c7ba');g.text((x,y+h+9),f'pivot {pivot[0]}, {pivot[1]}',font=font(14),fill='#93a7a9')
g.text((810,520),'WORLD BASIS',font=font(19),fill='#dfc99f');g.text((810,558),'u = (+80, +40) px\nv = (-80, +40) px\nz = (0, -1) px\n\nArches: 3 tiles wide\nDoors: 1 tile wide\nWalls: 128 px high',font=font(16),fill='#b4c1bc',spacing=8);guide.save(P/'template'/'Layout_Template.png')

compact=[{k:a[k] for k in ['id','category','name','file','size_px','pivot_px','alpha_bounds_px']}|{'orientation':a.get('orientation',''),'state':a.get('state',''),'seamless':a.get('seamless_self_repeat',False)} for a in aa]
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catacombs asset browser</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#11191d;color:#d7d8ce}body{margin:0}header{padding:28px 4vw;background:#1a252a;border-bottom:1px solid #46545a}h1{font-family:Georgia,serif;font-size:38px;letter-spacing:3px;color:#dcc391;margin:0 0 12px}p{line-height:1.6;max-width:1000px}a{color:#a8d7d0}nav{display:flex;gap:16px;flex-wrap:wrap;margin-top:18px}.controls{position:sticky;top:0;z-index:2;background:#172126ee;backdrop-filter:blur(8px);padding:16px 4vw;display:flex;gap:12px;flex-wrap:wrap;align-items:center}input,select{background:#243139;color:#ece6d7;border:1px solid #53636a;border-radius:4px;padding:10px;font:inherit}input{min-width:250px}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:20px 4vw}article{background:#1b272d;border:1px solid #35434a;border-radius:6px;overflow:hidden}canvas{display:block;image-rendering:pixelated;background:repeating-conic-gradient(#1b252b 0% 25%,#202e34 0% 50%) 50% / 24px 24px;width:100%;height:260px;object-fit:contain}.meta{padding:13px}h2{font-size:16px;color:#ded0ad;margin:0 0 8px}.detail{font-size:12px;color:#a2b5ba;line-height:1.5;font-family:monospace}.download{display:inline-block;margin-top:10px;font-size:13px}#count{color:#c3c9be}footer{padding:20px 4vw;color:#9cacae}small{color:#a4b3b8}</style>
<header><h1>CATACOMBS</h1><p>236 transparent sprite frames on a measured 160 × 80 grid. 60 floors (10 self-seamless), 5 wall families, 3 three-tile arches, 3 doors with open and closed states, and 40 scatter props.</p><small>Four directed views for walls, arches and doors. Scatter props have one authored view. All art previews below use the delivered PNGs.</small><nav><a href="README.md">Instructions</a><a href="Overview.png">Pack overview</a><a href="manifest.json">Full metadata</a><a href="manifest.csv">CSV inventory</a><a href="template/Layout_Template.png">Layout template</a><a href="qa/seamless_repeats.png">Seamless tests</a><a href="qa/arch_wall_alignment.png">Arch tests</a><a href="qa/door_wall_alignment.png">Door tests</a><a href="qa/wall_junctions.png">Wall tests</a></nav></header>
<div class="controls"><input id="search" type="search" placeholder="Search names, states, directions…" aria-label="Search assets"><select id="category" aria-label="Category"><option value="">All categories</option><option>floors</option><option>walls</option><option>arches</option><option>doors</option><option>scatter</option></select><label><input id="pivot" type="checkbox" style="min-width:0"> Show pivots</label><span id="count"></span></div><main id="grid"></main><footer>Open this file directly after extracting the ZIP. No server or internet connection is needed. Use nearest-neighbor filtering in your engine. See README for import and placement rules.</footer>
<script>const assets=__ASSETS__;const grid=document.getElementById('grid');function render(){const q=document.getElementById('search').value.toLowerCase(),cat=document.getElementById('category').value,pivot=document.getElementById('pivot').checked,list=assets.filter(a=>(!cat||a.category===cat)&&a.id.includes(q));document.getElementById('count').textContent=list.length+' / '+assets.length+' frames';grid.replaceChildren();for(const a of list){const el=document.createElement('article'),cv=document.createElement('canvas');cv.width=384;cv.height=336;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;const im=new Image();im.onload=()=>{const x=Math.round((384-im.width)/2),y=Math.round((336-im.height)/2);c.drawImage(im,x,y);if(pivot){c.strokeStyle='#3bf6de';c.beginPath();c.moveTo(x+a.pivot_px[0]-5,y+a.pivot_px[1]);c.lineTo(x+a.pivot_px[0]+5,y+a.pivot_px[1]);c.moveTo(x+a.pivot_px[0],y+a.pivot_px[1]-5);c.lineTo(x+a.pivot_px[0],y+a.pivot_px[1]+5);c.stroke()}};im.src=a.file;const meta=document.createElement('div');meta.className='meta';const h=document.createElement('h2');h.textContent=a.name.replaceAll('_',' ');const de=document.createElement('div');de.className='detail';de.textContent=a.id+' | '+a.size_px.join(' × ')+' px | pivot '+a.pivot_px.join(', ')+(a.seamless?' | SELF-SEAMLESS':'');const link=document.createElement('a');link.href=a.file;link.download=a.id+'.png';link.className='download';link.textContent='Open / save transparent PNG';meta.append(h,de,link);el.append(cv,meta);grid.append(el)}}for(const id of ['search','category','pivot'])document.getElementById(id).addEventListener('input',render);render();</script></html>'''.replace('__ASSETS__',json.dumps(compact,separators=(',',':')))
html=html.replace('Catacombs asset browser',m['pack']+' asset browser').replace('<h1>CATACOMBS</h1>',f"<h1>{m['pack'].upper()}</h1>")
(P/'START_HERE.html').write_text(html,encoding='utf-8')
print('Previews, template guides and asset browser created.')
