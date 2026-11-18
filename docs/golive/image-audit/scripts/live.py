import json,re,urllib.request,concurrent.futures as cf,html
D=json.load(open('ia/inventory.json')); P=D['products']
def get(p):
    for t in range(3):
        try:
            r=urllib.request.urlopen(urllib.request.Request('https://www.sportsnutritionhub.lk/products/%s?view=&x=ia'%p['handle'],headers={'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'}),timeout=60).read().decode('utf8','ignore')
            ul=r.split('data-sp-slides',1)[1].split('</ul>',1)[0]
            out=[]
            for li in re.finditer(r'<li class="sp-slide([^"]*)"[^>]*data-media="(\d+)"[^>]*>(.*?)</li>',ul,re.S):
                src=re.search(r'src="([^"]+)"',li.group(3)); full=re.search(r'data-full="([^"]+)"',li.group(3))
                out.append({'media':li.group(2),'cls':li.group(1).strip(),'src':html.unescape(src.group(1)) if src else '','full':html.unescape(full.group(1)) if full else ''})
            return p['handle'],out
        except Exception as e: err=str(e)
    return p['handle'],{'error':err}
L={}
with cf.ThreadPoolExecutor(8) as ex:
    for h,o in ex.map(get,P): L[h]=o
json.dump(L,open('ia/live.json','w'))
bad=[h for h,o in L.items() if isinstance(o,dict)]
print('pages',len(L),'errors',bad[:5])
print('slides',sum(len(o) for o in L.values() if isinstance(o,list)),'clean slides',sum(1 for o in L.values() if isinstance(o,list) for s in o if 'clean' in s['cls']),'info slides',sum(1 for o in L.values() if isinstance(o,list) for s in o if 'info' in s['cls']))
