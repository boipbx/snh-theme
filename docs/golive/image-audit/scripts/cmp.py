# Compare every rendered clean copy with its original. Output one JSON row per clean slide.
import json,sys,os,subprocess,numpy as np,warnings
os.environ['OMP_THREAD_LIMIT']='1'
from PIL import Image
from skimage.feature import match_template
from skimage.metrics import structural_similarity as ssim
from skimage.color import rgb2lab
from scipy import ndimage as ndi
warnings.filterwarnings('ignore')
def ocr(img):
    p='/tmp/claude-0/-home-user-snh-theme/d130eecc-d291-5e4b-a85e-8064048c6a9b/scratchpad/ia/tmp_%d.png'%os.getpid(); img.save(p)
    out=subprocess.run(['tesseract',p,'-','--psm','11','tsv'],capture_output=True,text=True).stdout.splitlines()[1:]
    n=0
    for l in out:
        f=l.split('\t')
        if len(f)>11 and f[11].strip() and float(f[10])>60 and sum(ch.isalpha() for ch in f[11])>=3: n+=1
    return n
def grad(a):
    g=a.mean(2) if a.ndim==3 else a; return np.hypot(ndi.sobel(g,0),ndi.sobel(g,1))
def one(mid):
    r={'media':mid}
    try:
        C=Image.open(os.environ.get('CLEAN_DIR','ia/clean')+'/%s.img'%mid).convert('RGBA'); O=Image.open('ia/orig/%s.img'%mid).convert('RGB')
        c=np.asarray(C).astype(float); al=c[...,3]/255.
        cut=(al<0.98).mean()>0.02; r['cutout']=bool(cut)
        ys,xs=np.where(al>0.06)
        if not len(ys): r['fail']=['empty clean image']; return r
        y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        r['touch_edge']=bool(cut and (y0<=2 or x0<=2 or y1>=c.shape[0]-2 or x1>=c.shape[1]-2))
        fg=c[y0:y1,x0:x1]; fa=al[y0:y1,x0:x1]
        comp=fg[...,:3]*fa[...,None]+255*(1-fa[...,None])
        # match against the original at ~600px, on gradients (insensitive to backdrop colour)
        k=600/max(O.size); Os=np.asarray(O.resize((round(O.width*k),round(O.height*k)),Image.BILINEAR)).astype(float); Og=grad(Os); Og600=Og
        best=(-1,None)
        tw0,th0=comp.shape[1],comp.shape[0]
        Ogr=Os.mean(2); MODE=[None]
        def score(rx,ry):
            tw,th=max(8,round(tw0*rx)),max(8,round(th0*ry))
            if tw>=Og.shape[1] or th>=Og.shape[0]: return -1,None
            t=np.asarray(Image.fromarray(comp.astype(np.uint8)).resize((tw,th),Image.BILINEAR)).astype(float)
            src=Og if MODE[0]=='g' else (Ogr if Og.shape==Og600.shape else Ogr[::2,::2])
            tt=grad(t) if MODE[0]=='g' else t.mean(2)
            m=match_template(src,tt); i=np.unravel_index(m.argmax(),m.shape); return m[i],(i[1],i[0],tw,th)
        # coarse search at 300px (grey levels and gradients), then refine at 600px with the better mode
        Og600=Og; Og=Og600[::2,::2]; bm=None
        for mode in ('l','g'):
            MODE[0]=mode
            for rr in np.geomspace(0.12,0.95,22):
                s,b=score(rr/2,rr/2)
                if s>best[0]: best=(s,b,rr); bm=mode
        MODE[0]=bm; Og=Og600; best=(-1,None,best[2]); r['match_mode']=bm
        s0,b0,r0=best
        for rr in np.linspace(r0*0.95,r0*1.05,7):
            s,b=score(rr,rr)
            if s>best[0]: best=(s,b,rr)
        s0,b0,r0=best
        # aspect ratio: does a non-uniform scale fit clearly better?
        ar=[]
        for f in (0.94,0.97,1.03,1.06):
            s,b=score(r0*f,r0); ar.append((s,f))
        bs,bf=max(ar); r['ncc']=round(float(s0),3); r['ar_better']=round(float(bs-s0),3); r['ar_f']=bf
        X,Y,W,H=b0; kk=1/k
        Xo,Yo,Wo,Ho=X*kk,Y*kk,W*kk,H*kk
        Of=np.asarray(O).astype(float)
        xa,ya,xb,yb=int(round(Xo)),int(round(Yo)),int(round(Xo+Wo)),int(round(Yo+Ho))
        xa,ya=max(0,xa),max(0,ya); xb,yb=min(Of.shape[1],xb),min(Of.shape[0],yb)
        reg=Of[ya:yb,xa:xb]
        N=512; sc=N/max(reg.shape[:2]); sz=(max(8,round(reg.shape[1]*sc)),max(8,round(reg.shape[0]*sc)))
        R=np.asarray(Image.fromarray(reg.astype(np.uint8)).resize(sz,Image.LANCZOS)).astype(float)
        Cr=np.asarray(Image.fromarray(fg.astype(np.uint8),'RGBA').resize(sz,Image.LANCZOS)).astype(float); A=Cr[...,3]/255.
        mix=Cr[...,:3]*A[...,None]+R*(1-A[...,None])
        _,smap=ssim(mix.mean(2),R.mean(2),data_range=255,full=True)
        mask=A>0.5; inner=ndi.binary_erosion(mask,iterations=6); band=ndi.binary_dilation(mask,iterations=4)&~ndi.binary_erosion(mask,iterations=4)
        r['ssim_all']=round(float(smap.mean()),3)
        r['ssim_in']=round(float(smap[inner].mean()) if inner.sum()>200 else float(smap.mean()),3)
        r['ssim_edge']=round(float(smap[band].mean()) if cut and band.sum()>100 else 1.0,3)
        r['low_area']=round(float((smap<0.45).mean()),4)          # local altered patches (painted logo, smears)
        if inner.sum()>200:
            dE=np.linalg.norm(rgb2lab(Cr[...,:3]/255.)[inner]-rgb2lab(R/255.)[inner],axis=1); r['dE']=round(float(np.median(dE)),2)
        else: r['dE']=0
        # missing parts: strong original detail where the cut-out is transparent, inside the product's box
        if cut:
            gR=grad(R); thr=np.percentile(gR,85)
            hole=(A<0.1)&(gR>thr)&ndi.binary_dilation(mask,iterations=12)&~ndi.binary_dilation(mask,iterations=3)
            lab,n=ndi.label(ndi.binary_closing(hole,iterations=2)); big=0
            if n: big=max(np.bincount(lab.ravel())[1:])
            r['missing']=round(float(big/max(1,mask.sum())),4)
        else: r['missing']=0
        # resolution: product's size in source pixels vs how big the clean copy shows it
        r['src_px']=int(max(Wo,Ho)*O.info.get('native_scale',1)); r['clean_px']=int(max(tw0,th0))
        r['scale']=round(r['clean_px']/max(1,max(Wo,Ho)),2)
        # text: words on the clean copy vs the same area of the original
        r['words_clean']=ocr(Image.fromarray(np.uint8(comp)).convert('L'))
        r['words_orig_reg']=ocr(Image.fromarray(np.uint8(reg)).convert('L'))
        r['words_orig']=ocr(O.convert('L'))
    except Exception as e:
        r['fail']=['error: %s'%str(e)[:80]]
    return r
if __name__=='__main__':
    from multiprocessing import Pool
    ids=[l.strip() for l in open(sys.argv[1])]
    done=set()
    if os.path.exists(os.environ.get('CMP_OUT','ia/cmp.jsonl')):
        for l in open(os.environ.get('CMP_OUT','ia/cmp.jsonl')): done.add(json.loads(l)['media'])
    ids=[i for i in ids if i not in done]
    with Pool(4) as p, open(os.environ.get('CMP_OUT','ia/cmp.jsonl'),'a') as f:
        for i,r in enumerate(p.imap_unordered(one,ids)):
            f.write(json.dumps(r)+'\n'); f.flush()
            if i%50==0: print(i,flush=True)
