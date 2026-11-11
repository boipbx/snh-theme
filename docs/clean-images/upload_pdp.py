"""Upload clean gallery copies to Shopify Files as pdp-<media id>.webp (storefront only; product media untouched).
Skips files that already exist. Usage: python3 upload_pdp.py [limit]"""
import json, os, sys, io, time, urllib.request
from PIL import Image
from shop import gql
SRC = 'img/pdp3'; LOG = 'img/upload_done.txt'
done = set(open(LOG).read().split()) if os.path.exists(LOG) else set()
ids = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
skip = set(open('img/pdp_reject.txt').read().split()) if os.path.exists('img/pdp_reject.txt') else set()
todo = [i for i in ids if i not in done and i not in skip][: int(sys.argv[1]) if len(sys.argv) > 1 else None]
print('to upload', len(todo))
for mid in todo:
    name = f'pdp-{mid}.webp'; buf = io.BytesIO()
    Image.open(f'{SRC}/{mid}.png').save(buf, 'WEBP', quality=84, method=6); data = buf.getvalue()
    st = gql('''mutation($i:[StagedUploadInput!]!){stagedUploadsCreate(input:$i){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}''',
             {'i': [{'filename': name, 'mimeType': 'image/webp', 'httpMethod': 'POST', 'resource': 'FILE', 'fileSize': str(len(data))}]})
    t = st['data']['stagedUploadsCreate']['stagedTargets'][0]
    bnd = '----snh' + str(time.time()).replace('.', ''); body = b''
    for p in t['parameters']: body += f'--{bnd}\r\nContent-Disposition: form-data; name="{p["name"]}"\r\n\r\n{p["value"]}\r\n'.encode()
    body += f'--{bnd}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: image/webp\r\n\r\n'.encode() + data + f'\r\n--{bnd}--\r\n'.encode()
    urllib.request.urlopen(urllib.request.Request(t['url'], data=body, headers={'Content-Type': f'multipart/form-data; boundary={bnd}'}), timeout=120).read()
    fc = gql('''mutation($f:[FileCreateInput!]!){fileCreate(files:$f){files{id fileStatus} userErrors{message}}}''',
             {'f': [{'originalSource': t['resourceUrl'], 'filename': name, 'contentType': 'IMAGE', 'alt': ''}]})
    errs = fc['data']['fileCreate']['userErrors']
    if errs: print(mid, 'ERR', errs); continue
    open(LOG, 'a').write(mid + '\n'); print(mid, 'ok', flush=True)
