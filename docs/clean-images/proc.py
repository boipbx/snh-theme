import json, sys, os, numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
MODEL = os.environ.get('M', 'isnet-general-use')
sess = new_session(MODEL)
items = {i['h']: i for i in json.load(open('img/inventory.json'))}
OUT = 'img/out'; S = 700; FILL = .86

def inner_crop(im):
    """crop away the SNH orange frame + its margin: find the orange border lines near each edge"""
    a = np.asarray(im.convert('RGB')).astype(int); H, W, _ = a.shape
    org = (a[..., 0] > 190) & (a[..., 1] > 60) & (a[..., 1] < 170) & (a[..., 2] < 90)
    def edge(prof, n, rev):
        rng = range(n - 1, int(n * .85), -1) if rev else range(0, int(n * .15))
        hit = None
        for k in rng:
            if prof[k] > .35: hit = k
            elif hit is not None: return hit
        return hit
    rows = org.mean(1); cols = org.mean(0)
    t = edge(rows, H, False); b = edge(rows, H, True); l = edge(cols, W, False); r = edge(cols, W, True)
    framed = None not in (t, b, l, r)
    if not framed: return im, False
    pad = int(min(H, W) * .006) + 2
    return im.crop((l + pad, t + pad, r - pad, b - pad)), True

def drop_logo(alpha, rgb):
    """remove the SNH word mark (orange blob in the top-right corner) if it survived"""
    H, W = alpha.shape
    zone = np.zeros_like(alpha, bool); zone[:int(H * .14), int(W * .70):] = True
    org = (rgb[..., 0] > 190) & (rgb[..., 1] > 50) & (rgb[..., 1] < 170) & (rgb[..., 2] < 100)
    m = zone & org & (alpha > 40)
    if m.sum() > 30:
        ys, xs = np.where(m); y0, y1, x0, x1 = max(0, ys.min() - 6), ys.max() + 6, max(0, xs.min() - 6), xs.max() + 6
        box = alpha[y0:y1, x0:x1]; sub = org[y0:y1, x0:x1]
        # only clear when the blob is mostly orange (the mark), not a product that happens to be orange
        if sub[box > 40].mean() > .45: alpha[y0:y1, x0:x1] = 0
    return alpha

def process(h):
    src = f'img/src/{h}.jpg'
    im = Image.open(src).convert('RGB')
    im, framed = inner_crop(im)
    cut = remove(im, session=sess, post_process_mask=True)
    a = np.asarray(cut).copy(); alpha = a[..., 3]; rgb = a[..., :3].astype(int)
    if framed: alpha = drop_logo(alpha, rgb)
    alpha[alpha < 12] = 0
    a[..., 3] = alpha
    cut = Image.fromarray(a, 'RGBA')
    bb = cut.getbbox()
    if not bb: return None
    cut = cut.crop(bb)
    k = (S * FILL) / max(cut.width, cut.height)
    cut = cut.resize((max(1, round(cut.width * k)), max(1, round(cut.height * k))), Image.LANCZOS)
    can = Image.new('RGBA', (S, S), (255, 255, 255, 0))
    can.alpha_composite(cut, ((S - cut.width) // 2, (S - cut.height) // 2))
    can.save(f'{OUT}/{h}.png')
    return framed

if __name__ == '__main__':
    hs = sys.argv[1:] or list(items)
    for h in hs:
        try: print(h, process(h), flush=True)
        except Exception as e: print(h, 'ERR', e, flush=True)
