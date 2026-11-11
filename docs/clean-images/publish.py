"""Copy approved clean pack shots into the theme (assets/pc-<handle>.webp) and write snippets/snh-clean-list."""
import json, os, sys
from PIL import Image
REPO = '/home/user/snh-theme'
items = json.load(open('img/inventory.json'))
skip = set(open('img/reject.txt').read().split()) if os.path.exists('img/reject.txt') else set()
keys = []; total = 0
for it in items:
    h = it['h']; src = f'img/out/{h}.png'
    if h in skip or not it['url'] or not os.path.exists(src): continue
    im = Image.open(src).convert('RGBA')
    dst = f'{REPO}/assets/pc-{h}.webp'
    im.save(dst, 'WEBP', quality=82, method=6)
    total += os.path.getsize(dst)
    base = it['url'].split('?')[0].split('/')[-1]
    keys.append(f'{h}:{base}')
open(f'{REPO}/snippets/snh-clean-list.liquid', 'w').write(',' + ','.join(keys) + ',')
print(len(keys), 'images', round(total / 1e6, 2), 'MB', 'skipped', len(skip))
