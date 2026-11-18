import json,csv,os
D=json.load(open('ia/inventory.json')); F=D['files']; gid2fn={v['id']:k for k,v in F.items()}
CL={r['media']:r for r in json.load(open('ia/cls.json'))}
def load(p): return {json.loads(l)['media']:json.loads(l) for l in open(p)} if os.path.exists(p) else {}
C1=load('ia/cmp.jsonl'); C2=load('ia/cmp2.jsonl')
def verdict(r):
    f=list(r.get('fail',[]))
    if f: return f
    if r['ncc']<0.90: f.append('match uncertain (%.2f)'%r['ncc'])
    if r['ssim_in']<0.85: f.append('label warped/smeared (SSIM %.2f)'%r['ssim_in'])
    if r['cutout'] and r['ssim_edge']<0.75: f.append('halo/jagged edge (edge SSIM %.2f)'%r['ssim_edge'])
    if r['low_area']>0.05: f.append('altered patch %.0f%%'%(r['low_area']*100))
    if r['dE']>3: f.append('colour shift dE %.1f'%r['dE'])
    if r['missing']>0.005: f.append('missing part %.1f%%'%(r['missing']*100))
    if r['ar_better']>0.01: f.append('aspect ratio changed')
    if r['touch_edge']: f.append('cut at edge')
    if r['words_orig_reg']>=6 and r['words_clean']<0.85*r['words_orig_reg']: f.append('text lost %d→%d'%(r['words_orig_reg'],r['words_clean']))
    if not r['cutout'] and r['words_orig']>=6 and r['words_clean']<0.85*r['words_orig']: f.append('text cropped %d→%d'%(r['words_orig'],r['words_clean']))
    if r['scale']>1.15 and r['src_px']<800: f.append('upscaled x%.2f from %dpx'%(r['scale'],r['src_px']))
    return f
rows=[]; plan=[]
for p in D['products']:
    med=[m for m in p['media']['nodes'] if m.get('image')]
    if not med: continue
    ids=[m['id'] for m in med]; mids=[i.split('/')[-1] for i in ids]
    ci=json.loads(p['ci']['value']) if p['ci'] else None
    if ci and len(ci)!=len(ids): ci=None
    newci=list(ids); kept=0; had=0
    for i,(gid,mid) in enumerate(zip(ids,mids)):
        typ=CL.get(mid,{}).get('type','product'); fn=gid2fn.get(ci[i]) if ci else None
        row={'handle':p['handle'],'pos':i+1,'media':mid,'type':typ,'rendered':'original','fails':'','verdict':'PASS'}
        if fn:
            had+=1; r=(C1 if fn=='pdp-%s.webp'%mid else C2).get(mid)
            row['rendered']=fn
            f=verdict(r) if r else ['not checked']
            if typ=='info': f=['info image must show the original']+f
            elif r and 'cutout' in r and not r['cutout']: f=['frame-cropped %s image (only product cut-outs may stay)'%typ]+f
            elif typ!='product': f=['%s image (only product cut-outs may stay)'%typ]+f
            if f: row['verdict']='FAIL'; row['fails']='; '.join(f)
            else: newci[i]=ci[i]; kept+=1
        else:
            w,h=med[i]['image']['width'],med[i]['image']['height']
            if max(w,h)<800: row['fails']='original under 800px (%dx%d): needs a new photo'%(w,h); row['verdict']='POOR SOURCE'
        rows.append(row)
    # order: front product photo first, other product photos, lifestyle, info (stable inside each group)
    def otype(m):
        c=CL.get(m,{}); t=c.get('type','product')
        if t=='lifestyle' and c.get('plain',1)>=0.30: t='product'      # grey studio gradients are product shots
        return t
    typ=[otype(m) for m in mids]
    prod=[i for i,t in enumerate(typ) if t=='product']; life=[i for i,t in enumerate(typ) if t=='lifestyle']; info=[i for i,t in enumerate(typ) if t=='info']
    order=prod+life+info if prod else list(range(len(ids)))
    if not prod: order=[0]+[i for i in life+info if i!=0]
    if p['productType']=='Bundle': order=list(range(len(ids)))     # bundles keep the designer hero and their order
    plan.append({'product':p['id'],'handle':p['handle'],'title':p['title'],'tags':p['tags'],'media':ids,'types':typ,'order':order,'reorder':order!=list(range(len(ids))),
        'ci_before':p['ci']['value'] if p['ci'] else None,'ci_after':[newci[i] for i in order] if ci else None,'ci_change':bool(ci) and ([newci[i] for i in order]!=ci),'clean_kept':kept,'clean_had':had})
json.dump(plan,open('ia/plan.json','w'),indent=0)
w=csv.DictWriter(open('ia/checks.csv','w',newline=''),fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
import collections
print('images',len(rows),collections.Counter(r['verdict'] for r in rows))
print('clean copies checked',sum(1 for r in rows if r['rendered']!='original'),'FAIL',sum(1 for r in rows if r['rendered']!='original' and r['verdict']=='FAIL'))
print('products with clean list',sum(1 for x in plan if x['ci_before']),'| keep some clean',sum(1 for x in plan if x['clean_kept']),'| all originals now',sum(1 for x in plan if x['ci_before'] and not x['clean_kept']))
print('reorder',sum(x['reorder'] for x in plan),'| first image changes',sum(1 for x in plan if x['reorder'] and x['order'][0]!=0))
c=collections.Counter()
for r in rows:
    for f in r['fails'].split('; '):
        if f: c[f.split(' (')[0].split(' %')[0].split(' x')[0].split(' dE')[0].split(' 0')[0].split(' 1')[0].split(' 2')[0].split(' 3')[0].split(' 4')[0].split(' 5')[0].split(' 6')[0].split(' 7')[0].split(' 8')[0].split(' 9')[0]]+=1
print(c.most_common())
