from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np

def components(mask):
    # Connected runs preserve detached art fragments without a scientific stack.
    h,w=mask.shape; parent=[]; runs=[]; prev=[]
    def root(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]];i=parent[i]
        return i
    for y in range(h):
        row=np.r_[False,mask[y],False].astype(np.int8); d=np.diff(row)
        starts=np.where(d==1)[0]; ends=np.where(d==-1)[0]; curr=[]
        for a,b in zip(starts,ends):
            i=len(parent);parent.append(i);runs.append((y,int(a),int(b)));curr.append((a,b,i))
            for c,e,j in prev:
                if e<a: continue
                if c>b: break
                ri,rj=root(i),root(j)
                if ri!=rj:parent[ri]=rj
        prev=curr
    groups={}
    for i,r in enumerate(runs):groups.setdefault(root(i),[]).append(r)
    out=[]
    for rr in groups.values():
        n=sum(b-a for y,a,b in rr)
        box=(min(a for y,a,b in rr),min(y for y,a,b in rr),max(b for y,a,b in rr),max(y for y,a,b in rr)+1)
        cx=sum((a+b-1)/2*(b-a) for y,a,b in rr)/n; cy=sum(y*(b-a) for y,a,b in rr)/n
        out.append(dict(runs=rr,n=n,box=box,center=(cx,cy)))
    return sorted(out,key=lambda v:-v['n'])

if __name__=='__main__':
    for name in ['scatter_01_20','scatter_21_40','arch_elevations','door_leaves']:
        im=Image.open(Path('work/source')/(name+'.png')); a=np.array(im)
        cs=components(a[:,:,3]>128); print(name,[(c['n'],c['box']) for c in cs[:25]])
        out=Image.new('RGB',im.size,(55,61,65));out.paste(im,mask=im.getchannel('A')); d=ImageDraw.Draw(out)
        for i,c in enumerate(cs[:25]):
            d.rectangle(c['box'],outline='#44FF99',width=2); d.text(c['box'][:2],str(i),fill='white')
        out.resize((1050,700)).save(Path('work/qa')/(name+'_components.png'))
