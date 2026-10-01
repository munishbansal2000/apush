"""Raw SAQ/DBQ/LEQ extraction from ch03, exam1, exam2."""
import re, json, os
from html.parser import HTMLParser
OUT = os.path.dirname(os.path.abspath(__file__))
SRC = '/home/hatch/workspace/apush/build/reclaim-legacy-5steps-2024/OEBPS'

class Para(HTMLParser):
    def __init__(self):
        super().__init__(); self.paras = []; self.cur = None
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == 'p':
            self.cur = [tag, d.get('class', ''), '', '']
        elif tag == 'a' and self.cur is not None:
            self.cur[3] += (d.get('id', '') or '')
        elif tag == 'img' and self.cur is not None:
            self.cur[2] += f"[IMG:{d.get('src','')}]"
    def handle_endtag(self, tag):
        if tag == 'p' and self.cur is not None:
            self.paras.append(tuple(self.cur)); self.cur = None
    def handle_data(self, data):
        if self.cur is not None:
            self.cur[2] += data

def load(fn):
    p = Para(); p.feed(open(os.path.join(SRC, fn), encoding='utf-8').read())
    return p.paras

def clean(tx):
    return re.sub(r'\s+', ' ', tx.replace('\xa0', ' ')).strip()

def stimulus_before(paras, i):
    stim = []; k = i - 1
    while k >= 0:
        t, cl, tx, aid = paras[k]
        if cl in ('que', 'que1') and aid:
            break
        if cl in ('questions', 'noindent', 'indent', 'right', 'quoter',
                  'image', 'imagel', 'imagef', 'caption'):
            stim.append((cl, clean(tx)))
        k -= 1
    stim.reverse()
    return stim

def extract_saq(paras, pfx):
    pfx = {'e1':'squee1','e2':'squee2','e3':'sque3'}[pfx]
    pfx_tail = pfx
    out = []
    for i, (t, cl, tx, aid) in enumerate(paras):
        if cl == 'que' and (aid or '').startswith(pfx):
            m = re.match(r'(\d+)\.\s*(.*)', clean(tx), re.S)
            n = int(m.group(1)); body = clean(m.group(2))
            parts = []; j = i + 1
            while j < len(paras) and paras[j][1] in ('ualpha', 'ualphan1'):
                parts.append(clean(paras[j][2])); j += 1
            out.append({'n': n, 'dir': body, 'parts': parts,
                        'stimulus': stimulus_before(paras, i)})
    out.sort(key=lambda x: x['n'])
    return out

def extract_dbq(paras, pfx):
    prompt = None
    for t, cl, tx, aid in paras:
        if cl == 'que' and (aid or '') == ('dque' if pfx in ('e1','e2') else 'dqu') + pfx + '_1':
            prompt = re.sub(r'^\d+\.\s*', '', clean(tx)); break
    docs = []; i = 0
    while i < len(paras):
        t, cl, tx, aid = paras[i]
        m = re.match(r'^Document\s+([A-G])\b', clean(tx))
        if m:
            letter = m.group(1); body = []; j = i + 1
            while j < len(paras):
                t2, cl2, tx2, aid2 = paras[j]
                if re.match(r'^Document\s+[A-G]\b', clean(tx2)):
                    break
                if cl2 in ('que', 'que1') and aid2:
                    break
                if cl2 in ('noindent', 'indent', 'right', 'quoter', 'image',
                           'imagel', 'imagef', 'caption', 'questions',
                           'noindentd', 'noindentdi', 'noindentdi1', 'go'):
                    body.append((cl2, clean(tx2)))
                j += 1
            docs.append({'letter': letter, 'body': body}); i = j; continue
        i += 1
    return {'prompt': prompt, 'documents': docs}

def extract_leq(paras, pfx):
    out = []
    for i, (t, cl, tx, aid) in enumerate(paras):
        if cl in ('que','quet') and re.match(r'^dque'+(pfx if pfx in ('e1','e2') else pfx[-1])+r'_[2-4]$', aid or ''):
            m = re.match(r'(\d+)\.\s*(.*)', clean(tx), re.S)
            n = int(m.group(1)); body = clean(m.group(2))
            extra = []; j = i + 1
            while j < len(paras) and paras[j][1] in ('noindent', 'indent'):
                extra.append(clean(paras[j][2])); j += 1
            out.append({'n': n, 'prompt': body, 'extra': extra})
    out.sort(key=lambda x: x['n'])
    return out

def main():
    for fn, pfx in [('ch03.xhtml', 'e3'), ('exam1.xhtml', 'e1'), ('exam2.xhtml', 'e2')]:
        base = os.path.splitext(fn)[0]
        paras = load(fn)
        saq = extract_saq(paras, pfx)
        dbq = extract_dbq(paras, pfx)
        leq = extract_leq(paras, pfx)
        print(base, 'saq:', len(saq), 'dbq docs:', len(dbq['documents']),
              'prompt len:', len(dbq['prompt'] or ''), 'leq:', len(leq))
        json.dump(saq, open(os.path.join(OUT, base + '-saq-raw.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
        json.dump(dbq, open(os.path.join(OUT, base + '-dbq-raw.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
        json.dump(leq, open(os.path.join(OUT, base + '-leq-raw.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
