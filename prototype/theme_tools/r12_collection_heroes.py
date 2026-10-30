"""Round 12: seed each collection template's main-collection Hero image (desktop / mobile, Artwork) from the banner its
`main` version showed (slideshow image + mobile_image), and the Applied Nutrition banner for applied-nutrition in the
default template's "Hero images by collection". collection.json's own old banner (a RAW campaign) is not carried.
Run from the repo root: python3 prototype/theme_tools/r12_collection_heroes.py"""
import json, re, subprocess, os
def load(text):
    m = re.match(r'^\s*/\*.*?\*/\s*', text, re.S)
    head = m.group(0) if m else ''
    return head, json.loads(text[len(head):])
done = []
for f in sorted(os.listdir('templates')):
    if not f.startswith('collection') or f == 'collection.json':
        continue
    try:
        old = subprocess.check_output(['git', 'show', 'main:templates/' + f], stderr=subprocess.DEVNULL).decode()
    except subprocess.CalledProcessError:
        continue
    _, od = load(old)
    imgs = {}
    for sec in od['sections'].values():
        for b in sec.get('blocks', {}).values():
            for k in ('image', 'mobile_image'):
                v = b.get('settings', {}).get(k)
                if isinstance(v, str) and v.startswith('shopify://shop_images/') and k not in imgs:
                    imgs[k] = v
    if 'image' not in imgs:
        continue
    head, d = load(open('templates/' + f).read())
    main = d['sections'].get('main')
    if not main or main['type'] != 'main-collection':
        continue
    st = main.setdefault('settings', {})
    st['hero_desktop'] = imgs['image']
    if 'mobile_image' in imgs:
        st['hero_mobile'] = imgs['mobile_image']
    st['hero_artwork'] = True
    open('templates/' + f, 'w').write(head + json.dumps(d, indent=2, ensure_ascii=False) + '\n')
    done.append(f)
head, d = load(open('templates/collection.json').read())
d['sections']['main'].setdefault('settings', {})['hero_map'] = 'applied-nutrition | Untitled_2800_x_1200_px_.zip_-_1.png | Untitled_design.zip_-_1_cffc3672-42b2-4f8c-b553-c621f3aa25ba.png | artwork'
open('templates/collection.json', 'w').write(head + json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print(len(done), 'templates seeded:', ', '.join(done))
