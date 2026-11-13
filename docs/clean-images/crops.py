"""Per gallery image: the square just inside the SNH frame and below the SNH mark, as fractions of the image.
Writes snippets/snh-frame-crops.liquid as ',<media id>:<left>:<top>:<width>:<height>,'"""
import json, os, numpy as np, importlib.util
from PIL import Image
spec = importlib.util.spec_from_file_location('pp', 'proc_pdp.py'); pp = importlib.util.module_from_spec(spec); spec.loader.exec_module(pp)
M = [m for m in json.load(open('img/media.json')) if 'bundle' not in (m['type'] or '').lower()]; out = []; skipped = 0
for m in M:
    mid = m['id'].split('/')[-1]; src = f'img/gsrc/{mid}.jpg'
    if not os.path.exists(src): continue
    im = Image.open(src).convert('RGB'); W, H = im.size
    box, kind = pp.find_frame(im)
    if not box: continue
    l, t, r, b = box
    a = np.asarray(im.crop(box)).astype(int); h, w, _ = a.shape
    z = a[:int(h * .16), int(w * .58):]
    o = (z[..., 0] > 150) & (z[..., 2] < 150) & (z[..., 0] - z[..., 2] > 60) & (z[..., 0] - z[..., 1] > 25)
    d = 0
    if o.sum() > 20:
        import cv2
        n, lab, st, _ = cv2.connectedComponentsWithStats(o.astype(np.uint8), 8)
        bottoms = [st[i][1] + st[i][3] for i in range(1, n) if st[i][1] < h * .05 and st[i][4] > 6]   # the mark touches the top
        if bottoms: d = int(max(bottoms) + h * .012)
    if d > h * .14: skipped += 1; continue          # mark sits too low: leave this image as it is
    top = t + d; s = min(r - l, b - top); left = l + ((r - l) - s) / 2
    out.append(f'{mid}:{left / W:.4f}:{top / H:.4f}:{s / W:.4f}:{s / H:.4f}')
open('/home/user/snh-theme/snippets/snh-frame-crops.liquid', 'w').write(',' + ','.join(out) + ',')
print(len(out), 'crops;', skipped, 'skipped (mark too low)')
