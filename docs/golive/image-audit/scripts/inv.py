import json,sys
from shop2 import gql
P=[];c=None
Q='''query($c:String){products(first:50,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor} nodes{id title handle productType vendor tags totalInventory
 featuredMedia{id}
 ci:metafield(namespace:"custom",key:"clean_images"){id type value}
 variants(first:100){nodes{id title media(first:1){nodes{id}}}}
 media(first:60){nodes{id alt mediaContentType status ... on MediaImage{image{url width height}}}}}}}'''
while True:
    d=gql(Q,{'c':c})
    if d.get('errors'): print(d['errors']); sys.exit(1)
    d=d['data']['products']; P+=d['nodes']
    if not d['pageInfo']['hasNextPage']: break
    c=d['pageInfo']['endCursor']
F={};c=None
while True:
    d=gql('query($c:String){files(first:250,after:$c,query:"filename:pdp-*"){pageInfo{hasNextPage endCursor} nodes{id alt createdAt ... on MediaImage{image{url width height}}}}}',{'c':c})
    if d.get('errors'): print(d['errors']); break
    d=d['data']['files']
    for n in d['nodes']:
        if n.get('image'):
            fn=n['image']['url'].split('?')[0].split('/')[-1]; F[fn]={'id':n['id'],'url':n['image']['url'],'w':n['image']['width'],'h':n['image']['height']}
    if not d['pageInfo']['hasNextPage']: break
    c=d['pageInfo']['endCursor']
json.dump({'products':P,'files':F},open('ia/inventory.json','w'))
im=sum(len([m for m in p['media']['nodes'] if m['mediaContentType']=='IMAGE']) for p in P)
print(len(P),'active products,',im,'images,',len(F),'pdp files;',sum(1 for p in P if p['ci']),'with clean_images')
print('ci example', [p['ci']['value'][:300] for p in P if p['ci']][:1], [p['ci']['type'] for p in P if p['ci']][:1])
print('media types', {t:sum(1 for p in P for m in p['media']['nodes'] if m['mediaContentType']==t) for t in ('IMAGE','VIDEO','EXTERNAL_VIDEO','MODEL_3D')})
