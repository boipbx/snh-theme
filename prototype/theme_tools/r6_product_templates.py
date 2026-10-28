"""Round 6: point every product template at sections/snh-product and the new below-the-fold sections.

Main buy box blocks, in the spec order: brand, title, rating + stock, subtitle, price, Koko, points, divider, variant
picker, subscribe & save, (gift note), buy buttons, WhatsApp, trust row, bundle & save, key benefits, Elite strip.
Below: stats, details (old collapsible tabs carried over as Tab blocks), reviews (the Judge.me widget moved from the
apps section), frequently bought together, related, related articles, recently viewed, then the template's other
v2 sections (why us, FAQ…) and its disabled sections, untouched. Prints what it drops.
  python3 prototype/theme_tools/r6_product_templates.py
"""
import json, re, glob, os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
BUNDLES = 'training-strength-bundles, daily-health-wellness-bundles, endurance-bundles, bundle-offers'
SKIP_TABS = ('how to', 'description')

def main_blocks(suffix):
    b = [('vendor', {}), ('title', {}), ('rating', {'low_stock': 5}), ('subtitle', {}), ('price', {}), ('koko', {}),
         ('points', {}), ('divider', {}), ('options', {}), ('purchase_options', {})]
    if suffix == 'with-gift-note':
        b.append(('gift_note', {'label': 'Gift note'}))
    b += [('buy_buttons', {'atc_label': 'Pre-order' if suffix == 'pre-order' else 'Add to cart', 'show_buy_now': suffix != 'pre-order'}),
          ('whatsapp', {'label': 'Order on WhatsApp'}),
          ('trust', {'item_1': 'Official distributor', 'item_2': '100% authentic', 'item_3': 'Same-day Colombo'}),
          ('bundles', {'handles': BUNDLES}), ('benefits', {}), ('elite', {})]
    blocks, order = {}, []
    for t, s in b:
        blocks[t] = {'type': t, 'settings': s}
        order.append(t)
    return {'type': 'snh-product', 'blocks': blocks, 'block_order': order, 'settings': {'show_crumbs': True, 'sticky_atc': True}}

for path in sorted(glob.glob(os.path.join(ROOT, 'templates', 'product*.json'))):
    raw = open(path).read()
    head = re.match(r'\s*/\*.*?\*/\s*', raw, flags=re.S)
    d = json.loads(raw[head.end():] if head else raw)
    name = os.path.basename(path)
    suffix = name[len('product.'):-len('.json')] if name != 'product.json' else ''
    secs, old = d['sections'], d['sections']['main']
    if old['type'] == 'snh-product':
        print(name, 'already done'); continue
    dropped = []
    tabs, tab_order = {}, []
    for k in old.get('block_order', []):
        bl = old['blocks'][k]
        t = bl['type']
        if t == 'collapsible_text':
            title = (bl.get('settings', {}).get('title') or '').strip()
            if title and not any(x in title.lower() for x in SKIP_TABS):
                tabs[k] = {'type': 'tab', 'settings': {'title': title, 'content': bl['settings'].get('content', ''), 'page': bl['settings'].get('page', '')}}
                tab_order.append(k)
                continue
        if t not in ('vendor', 'title', 'price', 'variant_picker', 'quantity_selector', 'buy_buttons', 'inventory', 'payment_terms', 'description', 'separator', 'rating', 'badges'):
            dropped.append(t.split('/blocks/')[0].replace('shopify://apps/', 'app:') + (':' + bl.get('settings', {}).get('title', '') if t == 'collapsible_text' else ''))
    secs['main'] = main_blocks(suffix)
    # the "Also included" Custom Liquid (bundle contents, product.json) stays, under the variant picker
    for k in old.get('block_order', []):
        bl = old['blocks'][k]
        if bl['type'] == 'liquid' and 'ALSO INCLUDED' in bl.get('settings', {}).get('liquid', ''):
            secs['main']['blocks']['also_included'] = {'type': 'liquid', 'settings': {'liquid': bl['settings']['liquid']}}
            o = secs['main']['block_order']; o.insert(o.index('options') + 1, 'also_included')
            dropped.remove('liquid')
    # reviews: the Judge.me widget leaves the apps section for the v2 app band
    review_blocks = {}
    for k in list(d['order']):
        s = secs[k]
        if s['type'] == 'apps':
            for bk in s.get('block_order', []):
                if 'review_widget' in s['blocks'][bk]['type']:
                    review_blocks[bk] = s['blocks'][bk]
            other = [bk for bk in s.get('block_order', []) if bk not in review_blocks]
            if other: dropped.append('apps section blocks: %s' % other)
            del secs[k]; d['order'].remove(k)
    new = {
        'product_stats': {'type': 'snh-product-stats', 'settings': {}},
        'product_details': {'type': 'snh-product-details', 'blocks': tabs, 'block_order': tab_order,
                            'settings': {'eyebrow': 'The details', 'heading': 'Everything *inside*', 'cream': False}},
        'reviews': {'type': 'snh-app-band', 'blocks': review_blocks, 'block_order': list(review_blocks),
                    'settings': {'eyebrow': 'Reviews', 'heading': 'What customers *say*', 'anchor': 'reviews', 'cream': True}},
        'bought_together': {'type': 'snh-product-recs', 'settings': {'intent': 'complementary', 'limit': 4, 'eyebrow': 'Pairs well with', 'heading': 'Frequently bought *together*', 'cream': False}},
        'related': {'type': 'snh-product-recs', 'settings': {'intent': 'related', 'limit': 4, 'eyebrow': '', 'heading': 'You may also *like*', 'cream': False}},
        'recent': {'type': 'snh-recently-viewed', 'settings': {'limit': 4, 'heading': 'Recently *viewed*', 'cream': False}},
    }
    if not review_blocks: del new['reviews']
    for k in ('related-products', 'recently_viewed'):
        if k in secs: del secs[k]; d['order'].remove(k)
    articles = 'snh_articles' if 'snh_articles' in secs else None
    rest = [k for k in d['order'] if k not in ('main', 'snh_articles')]
    secs.update(new)
    order = ['main'] + [k for k in ('product_stats', 'product_details', 'reviews', 'bought_together', 'related') if k in new]
    if articles: order.append(articles)
    order.append('recent')
    d['order'] = order + rest
    out = json.dumps(d, indent=2, ensure_ascii=False)
    open(path, 'w').write((head.group(0) if head else '') + out + '\n')
    print(name, '→', d['order'], '\n   tabs:', [tabs[k]['settings']['title'] for k in tab_order], '\n   dropped:', dropped)
