"""PDP gallery: remove the SNH frame from every gallery image. Pack shots on a plain backdrop also get the background
removed (transparent, trimmed, 88% fill, 1000px). Lifestyle / infographic images are only cropped out of the frame."""
import json, os, sys, urllib.request, numpy as np
from PIL import Image
from rembg import remove, new_session
sess = new_session('isnet-general-use')
M = [m for m in json.load(open('img/media.json')) if 'bundle' not in (m['type'] or '').lower()]
S = 1000; FILL = .88
def org_mask(a): return (a[..., 0] > 190) & (a[..., 1] > 60) & (a[..., 1] < 170) & (a[..., 2] < 90)
def find_frame(im):
    a = np.asarray(im.convert('RGB')).astype(int); H, W, _ = a.shape; o = org_mask(a)
    rows = o.mean(1); cols = o.mean(0)
    def first(prof, n, rev, thr):
        rng = range(n - 1, int(n * .80), -1) if rev else range(0, int(n * .20))
        hit = None
        for k in rng:
            if prof[k] > thr: hit = k
            elif hit is not None: return hit
        return hit
    t = first(rows, H, False, .35); b = first(rows, H, True, .35)
    l = first(cols, W, False, .35); r = first(cols, W, True, .35)
    pad = int(min(H, W) * .008) + 3
    if None not in (t, b, l, r): return (l + pad, t + pad, r - pad, b - pad), 'rect'
    # style 2: orange lines top and bottom only (logo sits on the top line, right side)
    t2 = first(rows, H, False, .45); b2 = first(rows, H, True, .45)
    if t2 is not None and b2 is not None and b2 - t2 > H * .5:
        ys = np.where(o[:int(H * .3)].any(1))[0]; top = (ys.max() if len(ys) else t2) + pad
        return (0, top, W, b2 - pad), 'lines'
    return None, None
def erase_logo(im):
    """paint out the orange SNH word mark in the top-right corner with the backdrop colour"""
    a = np.asarray(im.convert('RGB')).copy(); H, W, _ = a.shape
    y1, x0 = int(H * .16), int(W * .62); zone = a[:y1, x0:].astype(int)
    o = (zone[..., 0] > 150) & (zone[..., 2] < 140) & (zone[..., 0] - zone[..., 2] > 70)
    if o.sum() < 20: return im
    ys, xs = np.where(o); p = max(4, int(W * .012))
    t, b, l, r = max(0, ys.min() - p), min(y1, ys.max() + p), max(0, xs.min() - p), min(W - x0, xs.max() + p)
    if o[t:b, l:r].mean() < .10: return im
    below = zone[b:min(y1, b + 8), l:r].reshape(-1, 3)
    col = np.median(below, 0) if len(below) else np.array([255, 255, 255])
    a[t:b, x0 + l:x0 + r] = col.astype(np.uint8)
    return Image.fromarray(a)
def plain_border(im):
    a = np.asarray(im.convert('RGB')).astype(float); k = max(4, int(min(a.shape[:2]) * .03))
    edge = np.concatenate([a[:k].reshape(-1, 3), a[-k:].reshape(-1, 3), a[:, :k].reshape(-1, 3), a[:, -k:].reshape(-1, 3)])
    return edge.std(0).mean() < 14 and edge.mean() > 150
def fit(img, transparent):
    bb = img.getbbox() if transparent else None
    if transparent:
        if not bb: return None
        img = img.crop(bb); k = (S * FILL) / max(img.size)
        img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
        can = Image.new('RGBA', (S, S), (255, 255, 255, 0)); can.alpha_composite(img, ((S - img.width) // 2, (S - img.height) // 2)); return can
    k = S / max(img.size); img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    can = Image.new('RGB', (S, S), (255, 255, 255)); can.paste(img.convert('RGB'), ((S - img.width) // 2, (S - img.height) // 2)); return can
def one(m):
    mid = m['id'].split('/')[-1]; dst = f'img/pdp3/{mid}.png'
    if os.path.exists(dst) or os.path.exists(dst + '.skip'): return 'done'
    src = f'img/gsrc/{mid}.jpg'
    if not os.path.exists(src):
        u = m['url'] + ('&' if '?' in m['url'] else '?') + 'width=1400'
        open(src, 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read())
    im = Image.open(src).convert('RGB'); box, kind = find_frame(im)
    if not box: open(dst + '.skip', 'w').write('noframe'); return 'noframe'
    im = erase_logo(im.crop(box))
    if plain_border(im):
        cut = remove(im, session=sess, post_process_mask=True); a = np.asarray(cut).copy(); a[..., 3][a[..., 3] < 12] = 0
        out = fit(Image.fromarray(a, 'RGBA'), True); mode = 'cut'
    else:
        out = fit(im, False); mode = 'crop'
    if out is None: open(dst + '.skip', 'w').write('empty'); return 'empty'
    out.save(dst); return mode + ':' + kind
if __name__ == '__main__':
    sel = M if len(sys.argv) < 2 else [m for m in M if m['h'] in sys.argv[1:]]
    for m in sel:
        try: print(m['h'], m['id'].split('/')[-1], one(m), flush=True)
        except Exception as e: print(m['h'], 'ERR', e, flush=True)
