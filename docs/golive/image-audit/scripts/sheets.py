import json,os
from PIL import Image,ImageDraw
B={p['handle']:p for p in json.load(open('ia/inventory_before.json'))['products']}; L=json.load(open('ia/live.json')); LB=json.load(open('ia/live_before.json'))
OUT='/home/user/snh-theme/docs/golive/image-audit/'; S=84; per=24
hs=[h for h,o in L.items() if isinstance(o,list)]; hs.sort()
def tile(path,clean):
    im=Image.open(path).convert('RGBA'); bg=Image.new('RGBA',im.size,(255,255,255,255)); bg.alpha_composite(im); im=bg.convert('RGB'); im.thumbnail((S-4,S-4)); return im
def src_of(s,mid):
    if 'pdp-' in s['src']:
        return ('ia/clean2/%s.img'%mid) if '_' in s['src'].split('pdp-')[1].split('.')[0] and os.path.exists('ia/clean2/%s.img'%mid) else 'ia/clean/%s.img'%mid
    return 'ia/orig/%s.img'%mid
for k in range(0,len(hs),per):
    part=hs[k:k+per]; W=12+S*max(len(L[h]) for h in part)*1; H=len(part)*(2*S+40)
    sh=Image.new('RGB',(max(W,700),H),'white'); d=ImageDraw.Draw(sh)
    for r,h in enumerate(part):
        y=r*(2*S+40); d.text((4,y+2),'%s   (top: before, Shopify order + what showed | bottom: live now)'%h,fill='black')
        for row,slides in enumerate((LB.get(h) if isinstance(LB.get(h),list) else [],L[h])):
            for i,s in enumerate(slides):
                p=src_of(s,s['media'])
                if not os.path.exists(p): continue
                x=4+i*S; yy=y+16+row*(S+10); sh.paste(tile(p,'pdp-' in s['src']),(x,yy))
                if 'pdp-' in s['src']: d.rectangle([x,yy,x+S-5,yy+S-5],outline=(30,140,60),width=2)
                if 'info' in s['cls']: d.text((x+2,yy+2),'i',fill='blue')
    sh.save(OUT+'sheet-%02d.jpg'%(k//per+1),quality=72)
print(len(hs),'products,',(len(hs)+per-1)//per,'sheets')
