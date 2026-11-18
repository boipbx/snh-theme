import json,os,time,datetime
from shop2 import gql
BK='/home/user/snh-theme/docs/golive/backup-images-2026-11-18/'; os.makedirs(BK,exist_ok=True)
D={p['id']:p for p in json.load(open('ia/inventory.json'))['products']}
P=[x for x in json.load(open('ia/plan.json')) if x['reorder'] or x['ci_change']]
now=lambda: datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M')
log=open('ia/writes.jsonl','a'); n_re=n_ci=0
for x in P:
    p=D[x['product']]
    done=open('ia/writes.jsonl').read() if os.path.exists('ia/writes.jsonl') else ''
    if not os.path.exists(BK+p['handle']+'.json'): json.dump({'product':p['id'],'handle':p['handle'],'title':p['title'],'saved_at':now(),'media_order':[{'position':i+1,'id':m['id'],'url':m['image']['url'],'alt':m['alt'],'width':m['image']['width'],'height':m['image']['height']} for i,m in enumerate(p['media']['nodes'])],
               'clean_images':p['ci']['value'] if p['ci'] else None},open(BK+p['handle']+'.json','w'),indent=1)
    want=[x['media'][i] for i in x['order']]
    cur=[m['id'] for m in gql('query($id:ID!){product(id:$id){media(first:60){nodes{id}}}}',{'id':p['id']})['data']['product']['media']['nodes']]
    if x['reorder'] and cur!=want:
        moves=[{'id':mid,'newPosition':str(k)} for k,mid in enumerate(want)]
        r=gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){job{id} mediaUserErrors{message}}}',{'id':p['id'],'m':moves})['data']['productReorderMedia']
        assert not r['mediaUserErrors'], (p['handle'],r)
        for t in range(30):
            time.sleep(1.5)
            got=[m['id'] for m in gql('query($id:ID!){product(id:$id){media(first:60){nodes{id}}}}',{'id':p['id']})['data']['product']['media']['nodes']]
            if got==want: break
        assert got==want, ('reorder not applied',p['handle'])
        n_re+=1; log.write(json.dumps({'at':now(),'op':'productReorderMedia','handle':p['handle'],'before':x['media'],'after':want})+'\n')
    if x['ci_change']:
        r=gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}',{'m':[{'ownerId':p['id'],'namespace':'custom','key':'clean_images','type':'list.file_reference','value':json.dumps(x['ci_after'])}]})['data']['metafieldsSet']
        assert not r['userErrors'], (p['handle'],r)
        n_ci+=1; log.write(json.dumps({'at':now(),'op':'metafieldsSet clean_images','handle':p['handle'],'kept_clean':x['clean_kept'],'had_clean':x['clean_had']})+'\n')
    log.flush()
print('reordered',n_re,'clean_images set',n_ci,'backups',len(P))
