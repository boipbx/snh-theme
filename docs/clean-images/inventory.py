import json, urllib.request, concurrent.futures as cf, os
from shop import gql
items=[]; cur=None
while True:
    r=gql('''query($c:String){products(first:100, after:$c, query:"status:active"){pageInfo{hasNextPage endCursor} nodes{handle title vendor productType featuredMedia{... on MediaImage{image{url width height}}}}}}''',{'c':cur})
    d=r['data']['products']
    for p in d['nodes']:
        im=(p['featuredMedia'] or {}).get('image') or {}
        items.append({'h':p['handle'],'t':p['title'],'v':p['vendor'],'type':p['productType'],'url':im.get('url'),'w':im.get('width'),'hh':im.get('height')})
    if not d['pageInfo']['hasNextPage']: break
    cur=d['pageInfo']['endCursor']
json.dump(items,open('img/inventory.json','w'),indent=1)
def get(it):
    if not it['url']: return
    fn=f"img/src/{it['h']}.jpg"
    if os.path.exists(fn): return
    u=it['url']+('&' if '?' in it['url'] else '?')+'width=1200'
    req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
    open(fn,'wb').write(urllib.request.urlopen(req,timeout=60).read())
with cf.ThreadPoolExecutor(8) as ex: list(ex.map(get,items))
print(len(items), sum(1 for i in items if i['url']))
from collections import Counter; print(Counter(i['v'] for i in items).most_common(30))
