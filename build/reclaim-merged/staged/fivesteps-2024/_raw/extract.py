"""Raw extraction for 5-steps-2024 reclaim completion pass. Output: JSON into same _raw dir."""
import re, json, os, sys
from html.parser import HTMLParser
OUT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.expandvars('$APUSH_SRC')

class Para(HTMLParser):
    def __init__(self):
        super().__init__(); self.paras=[]; self.cur=None
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag=='p':
            self.cur=[tag,d.get('class',''),'','']
        elif tag=='a' and self.cur is not None:
            self.cur[3]+=(d.get('id','') or '')
        elif tag=='img' and self.cur is not None:
            self.cur[2]+=f"[IMG:{d.get('src','')}]"
    def handle_endtag(self, tag):
        if tag=='p' and self.cur is not None:
            self.paras.append(tuple(self.cur)); self.cur=None
    def handle_data(self, data):
        if self.cur is not None: self.cur[2]+=data

def load(fn):
    p=Para(); p.feed(open(os.path.join(SRC,fn),encoding='utf-8').read()); return p.paras

def clean(tx):
    return re.sub(r'\s+',' ',tx.replace('\xa0',' ')).strip()

def extract_mcq(fn, prefix):
    paras=load(fn)
    keys={}; expls={}
    for t,cl,tx,aid in paras:
        c=clean(tx)
        if cl in ('answer','answer1'):
            m=re.match(r'(\d+)\.\s*([A-D])',c)
            if m: keys[int(m.group(1))]=m.group(2)
        elif cl in ('anse','anse1'):
            m=re.match(r'(\d+)\.\s*([A-D])\.\s*(.*)',c,re.S)
            if m and int(m.group(1)) not in expls:
                expls[int(m.group(1))]=(m.group(2),clean(m.group(3)))
    items=[]; i=0
    mcq_classes=('que','que1')
    while i < len(paras):
        t,cl,tx,aid=paras[i]
        if cl in mcq_classes and (aid or '').startswith(prefix) and not re.match(r'^sq',aid or '') and not re.match(r'^dq',aid or ''):
            m=re.match(r'(\d+)\.\s*(.*)',clean(tx),re.S)
            n=int(m.group(1)); stem=clean(m.group(2))
            opts=[]; j=i+1
            while j < len(paras) and paras[j][1] in ('ualpha','ualphan1'):
                o=clean(paras[j][2])
                om=re.match(r'^([A-D])\.\s*(.*)',o,re.S)
                if om: opts.append({'letter':om.group(1),'text':clean(om.group(2))})
                else: opts.append({'letter':'','text':o})
                j+=1
            stim=[]; k=i-1
            while k>=0 and not (paras[k][1] in mcq_classes and paras[k][3]):
                if paras[k][1] in ('questions','noindent','indent','right','quoter','image','imagel','imagef','caption'):
                    stim.append((paras[k][1],clean(paras[k][2])))
                k-=1
            stim.reverse()
            items.append({'n':n,'stem':stem,'options':opts,
                          'key':keys.get(n),'explanation':expls.get(n),
                          'stimulus':stim})
            i=j; continue
        i+=1
    items.sort(key=lambda x:x['n'])
    return items

if __name__=='__main__':
    for fn,pfx in [('exam2.xhtml','quee2_'),('exam1.xhtml','quee1_'),('ch03.xhtml','quech3_')]:
        items=extract_mcq(fn,pfx)
        name=os.path.splitext(fn)[0]+'-mcq-raw.json'
        json.dump(items,open(os.path.join(OUT,name),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
        print(name, len(items), 'keys:',sum(1 for x in items if x['key']))
