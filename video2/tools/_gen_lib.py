import json, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'assets', 'catalog')

def write(name, category, description, items):
    with open(os.path.join(OUT, name), 'w') as f:
        json.dump({'category': category, 'description': description, 'items': items}, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(name, len(items))

def item(kind, slug, name, units, style, subject, details, avoid, size, bg, priority,
         dates=None, tags=None, sens=None, note=None, variants=None, strategy='generate'):
    d = {'id': f'{kind}.{slug}', 'name': name, 'kind': kind, 'units': units, 'strategy': strategy,
         'style': style, 'subject': ' '.join(subject.split()), 'details': details}
    if avoid: d['avoid'] = avoid
    d['size'] = size
    d['background'] = bg
    if variants: d['variants'] = variants
    if dates: d['dates'] = dates
    if sens:
        d['sensitivity'] = sens
        if note: d['sensitivityNote'] = note
    d['priority'] = priority
    if tags: d['tags'] = tags
    return d
