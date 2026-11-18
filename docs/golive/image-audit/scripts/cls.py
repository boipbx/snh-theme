import json,csv,os,subprocess,numpy as np,sys
os.environ['OMP_THREAD_LIMIT']='1'
from PIL import Image
D=json.load(open('ia/inventory.json')); C={r['media_id']:r for r in csv.DictReader(open('/home/user/snh-theme/docs/golive/gallery-classification.csv'))}
KW=('ingredient','nutrition','serving','directions','supplement facts','per 100','energy','protein','carbohydrate','warning','allergen','suggested use','typical values','fat','sugar','vitamin','% nrv','%nrv','daily value')
def ocr(im):
    p='ia/ocr_%d.png'%os.getpid(); im.save(p)
    t=subprocess.run(['tesseract',p,'-','--psm','11'],capture_output=True,text=True).stdout.lower()
    w=[x for x in t.split() if sum(ch.isalpha() for ch in x)>=3]; return len(w),sum(t.count(k) for k in KW)
def frame_box(a):
    o=(a[...,0]>190)&(a[...,1]>60)&(a[...,1]<170)&(a[...,2]<90); H,W=o.shape
    rows=o.mean(1); cols=o.mean(0)
    def edge(prof,n,rev):
        rng=range(n-1,int(n*.8),-1) if rev else range(0,int(n*.2)); hit=None
        for k in rng:
            if prof[k]>.35: hit=k
            elif hit is not None: return hit
        return hit
    t,b,l,r=edge(rows,H,0),edge(rows,H,1),edge(cols,W,0),edge(cols,W,1); p=int(min(H,W)*.02)+4
    if None in (t,b,l,r): return (0,0,W,H),False
    return (l+p,t+p,r-p,b-p),True
def one(m):
    mid,handle=m
    im=Image.open('ia/orig/%s.img'%mid).convert('RGB'); a=np.asarray(im).astype(float)
    (x0,y0,x1,y1),framed=frame_box(a); inner=a[y0:y1,x0:x1]; k=max(4,int(min(inner.shape[:2])*.06))
    band=np.concatenate([inner[:k].reshape(-1,3),inner[-k:].reshape(-1,3),inner[:,:k].reshape(-1,3),inner[:,-k:].reshape(-1,3)])
    med=np.median(band,0); plain=float((np.abs(band-med).sum(1)<36).mean())
    c=C.get(mid)
    if c: info=c['class']=='info image'; words=int(c['ocr_words'] or 0); kw=-1
    else:
        words,kw=ocr(im.convert('L')); info=(words>=25 and kw>=1) or words>=45
    typ='info' if info else ('product' if plain>=0.80 else 'lifestyle')
    return {'media':mid,'handle':handle,'type':typ,'plain':round(plain,3),'framed':framed,'words':words,'kw':kw,'src':'csv' if c else 'ocr'}
if __name__=='__main__':
    from multiprocessing import Pool
    jobs=[(m['id'].split('/')[-1],p['handle']) for p in D['products'] for m in p['media']['nodes'] if m.get('image')]
    with Pool(int(sys.argv[1]) if len(sys.argv)>1 else 4) as pool: R=pool.map(one,jobs,chunksize=8)
    json.dump(R,open('ia/cls.json','w'))
    import collections; print(collections.Counter(r['type'] for r in R))
