"""Build day-items.json — 164 question-like Day items (16 website-only skipped).
Brief rewrites: strip website-visit instructions/links from prompts; condense
answers to a brief factual core. source_type 'fact' throughout."""
import json, os, re

R = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.dirname(R)

raw = json.load(open(R + '/day-items-raw.json', encoding='utf-8'))
items = [x for x in raw['items'] if not x.get('website_activity')]
assert len(items) == 164, len(items)

def clean_question(t):
    t = re.sub(r'\[LINK:[^\]]*\](\S+)', '', t)          # [LINK:url]url
    t = re.sub(r'\[LINK:[^\]]*\]', '', t)
    # drop website-visit instruction sentences
    sents = re.split(r'(?<=[.!?])\s+', t)
    keep = [s for s in sents
            if not re.search(r'\b(website|web site|click on|click the|navigate|explore the (pages?|site)|look at pictures|interactive map)\b', s, re.I)]
    t = ' '.join(keep)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def brief_answer(a, limit=420):
    a = re.sub(r'\[LINK:[^\]]*\](\S+)', '', a)
    a = re.sub(r'\s+', ' ', a).strip()
    if len(a) <= limit:
        return a
    cut = a[:limit]
    # cut at last sentence boundary above 60% of limit
    m = list(re.finditer(r'[.!?]\s', cut))
    good = [x for x in m if x.end() > limit * 0.6]
    if good:
        return cut[:good[-1].end()].strip()
    return cut.rstrip() + '...'

out = []
for x in items:
    day = x['day']
    a = raw['answers'].get(str(day)) or raw['answers'].get(day)
    q = clean_question(x['text'])
    assert len(q) > 20, day
    out.append({"id": f"5s24-day-{day:03d}", "type": "day-item", "format": "rewritten",
                "day": day, "question": q, "answer": brief_answer(str(a)),
                "source_type": "fact", "inspired_by": "5steps-2024/day-plans"})

json.dump({"items": out}, open(OUTDIR + '/day-items.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('wrote day-items.json,', len(out), 'items')
# spot check
for i in [0, 6, 88]:
    print('---', out[i]['id'])
    print('Q:', out[i]['question'][:160])
    print('A:', out[i]['answer'][:160])
