"""Round 6 phase 2: put every SNH stylesheet on the type scale, in place.

  font-size     → the nearest of 12 13 14 15 16 18 20 24 28 36 44 56 72 96 (nothing under 12); a fluid clamp() becomes
                  a stepped token (--t-display / --t-h1 … --t-h5, defined in assets/snh-v2.css, by its largest size)
  line-height   → 1.1 (was ≤ 1.25, headings and one-line labels) or 1.5 (body); a font shorthand without one gets
                  1.1 from 24px up, else 1.5 (the shorthand would otherwise reset it to "normal")
  letter-spacing→ 0, -0.02em (headings) or 0.12em (uppercase labels)

Files: assets/snh-v2.css, assets/snh-design-system.css and the <style> blocks of sections/snh-*.liquid and
snippets/snh-*.liquid. sections/main-product.liquid (unused) is left alone. Prints a count per file.
  python3 prototype/theme_tools/r6_type_scale.py
"""
import re, glob, os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SCALE = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96]

def snap(px):
    px = float(px)
    if px <= 12: return 12
    best = min(SCALE, key=lambda s: (abs(s - px), -s if px >= 16 else s))
    return best

def token_for_clamp(c):
    nums = [float(n) for n in re.findall(r'([\d.]+)px', c)]
    top = max(nums) if nums else 0
    if top >= 80: return 'var(--t-display)'
    if top >= 50: return 'var(--t-h1)'
    if top >= 42: return 'var(--t-h2)'
    if top >= 32: return 'var(--t-h3)'
    if top >= 26: return 'var(--t-h4)'
    if top >= 20: return 'var(--t-h5)'
    return '%dpx' % snap(top)                  # small fluid text: one fixed size

def size_of(v):
    v = v.strip()
    if v.startswith('clamp('):
        nums = [float(n) for n in re.findall(r'([\d.]+)px', v)]
        return (token_for_clamp(v), max(nums)) if nums else (v, 16)
    m = re.fullmatch(r'([\d.]+)px', v)
    if m:
        s = snap(m.group(1)); return '%dpx' % s, s
    if v.startswith('var(--fs-h1') or v.startswith('var(--fs-display'): return v, 50
    return v, 16

def lh_for(raw, size_px):
    raw = (raw or '').strip()
    if raw in ('', 'normal'):
        return '1.1' if size_px >= 24 else '1.5'
    m = re.fullmatch(r'([\d.]+)(px)?', raw)
    if not m: return raw
    v = float(m.group(1))
    if m.group(2):
        v = v / size_px if size_px else 1.5
    if v == 0: return raw                       # deliberate (handled by hand)
    return '1.1' if v <= 1.25 else '1.5'

def ls_for(raw):
    raw = raw.strip()
    m = re.fullmatch(r'(-?)\.?([\d.]*)em', raw.replace('0.', '.') if raw.startswith(('0.', '-0.')) else raw)
    try:
        v = float(raw.replace('em', ''))
    except ValueError:
        return raw
    if v == 0: return '0'
    if v > 0: return '.12em'
    return '0' if v > -0.012 else '-.02em'

FONT = re.compile(r'(?<![-\w])font:\s*([^;{}]*?)(clamp\([^;{}]*?\)\)?|var\(--[\w-]+(?:,\s*clamp\([^)]*\))?\)|[\d.]+px)(?:\s*/\s*([\d.]+(?:px)?|normal))?(\s+[^;{}]+)')

def fix_css(css):
    n = 0
    def font(m):
        nonlocal n
        pre, size, lh, rest = m.group(1), m.group(2), m.group(3), m.group(4)
        new_size, px = size_of(size)
        new_lh = lh_for(lh, px)
        out = 'font: %s%s/%s%s' % (pre, new_size, new_lh, rest)
        if out != m.group(0): n += 1
        return out
    css = FONT.sub(font, css)
    def fsize(m):
        nonlocal n
        new, _ = size_of(m.group(2))
        out = m.group(1) + new
        if out != m.group(0): n += 1
        return out
    css = re.sub(r'(font-size:\s*)(clamp\([^;{}]*?\)|[\d.]+px)', fsize, css)
    # line-height declarations: need the rule's font-size to convert px
    def rule(m):
        nonlocal n
        body = m.group(2)
        fs = re.search(r'font-size:\s*(\d+)px', body) or re.search(r'font:[^;]*?(\d+)px', body)
        px = float(fs.group(1)) if fs else 16
        def lhd(x):
            nonlocal n
            new = lh_for(x.group(2), px)
            out = x.group(1) + new
            if out != x.group(0): n += 1
            return out
        body = re.sub(r'(line-height:\s*)([\d.]+(?:px)?|normal)', lhd, body)
        def lsd(x):
            nonlocal n
            new = ls_for(x.group(2))
            out = x.group(1) + new
            if out != x.group(0): n += 1
            return out
        body = re.sub(r'(letter-spacing:\s*)(-?[\d.]+em|normal)', lsd, body)
        return m.group(1) + '{' + body + '}'
    css = re.sub(r'([^{}]*)\{([^{}]*)\}', rule, css)
    return css, n

def process(path, liquid):
    s = open(path).read()
    total = 0
    if liquid:
        def style(m):
            nonlocal total
            css, n = fix_css(m.group(2)); total += n
            return m.group(1) + css + m.group(3)
        s2 = re.sub(r'(<style[^>]*>)(.*?)(</style>)', style, s, flags=re.S)
    else:
        s2, total = fix_css(s)
    if s2 != s:
        open(path, 'w').write(s2)
    return total

files = [('assets/snh-v2.css', False), ('assets/snh-design-system.css', False), ('sections/faq.liquid', True)]
files += [(f, True) for f in sorted(glob.glob(os.path.join(ROOT, 'sections', 'snh-*.liquid')) + glob.glob(os.path.join(ROOT, 'snippets', 'snh-*.liquid')))]
for f, liq in files:
    p = f if os.path.isabs(f) else os.path.join(ROOT, f)
    n = process(p, liq)
    if n: print('%4d  %s' % (n, os.path.relpath(p, ROOT)))
