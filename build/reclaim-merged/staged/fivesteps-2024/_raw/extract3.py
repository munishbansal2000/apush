"""Raw Day1-Day180 extraction + answers."""
import re, json, os
from html.parser import HTMLParser
SRC = '/home/hatch/workspace/apush/build/reclaim-legacy-5steps-2024/OEBPS'
OUT = '/home/hatch/workspace/apush/build/reclaim-merged/staged/fivesteps-2024/_raw'
class Para(HTMLParser):
    def __init__(self):
        super().__init__(); self.paras=[]; self.cur=None
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag=='p': self.cur=[tag,d.get('class',''),'']
        elif tag=='img' and self.cur is not None: self.cur[2]+=f"[IMG:{d.get('src','')}]"
        elif tag=='a' and self.cur is not None: self.cur[2]+=f"[LINK:{d.get('href','')}]"
    def handle_endtag(self, tag):
        if tag=='p' and self.cur is not None: self.paras.append(tuple(self.cur)); self.cur=None
    def handle_data(self, data):
        if self.cur is not None: self.cur[2]+=data
def clean(tx): return re.sub(r'\s+',' ',tx.replace('\xa0',' ')).strip()

items=[]
for n in range(1,181):
    fn=os.path.join(SRC,f'Day{n}.xhtml')
    p=Para(); p.feed(open(fn,encoding='utf-8').read())
    texts=[clean(tx) for (t,cl,tx) in p.paras if cl in ('noindent-d','indent-d')]
    text='\n'.join(texts)
    website_only = bool(re.search(r'Go to the website|visit the (web|Web)|navigate to the website', text)) and not re.search(r'\?', text.split('website')[0] if 'website' in text.lower() else '')
    items.append({'day':n,'text':text,'website_activity':website_only})
# answers
p=Para(); p.feed(open(os.path.join(SRC,'answer.xhtml'),encoding='utf-8').read())
ans={}; cur=None
for (t,cl,tx) in p.paras:
    c=clean(tx)
    if cl=='ans-d':
        m=re.search(r'Day\s+(\d+)',c); cur=int(m.group(1)) if m else None
    elif cl=='noindent' and cur is not None:
        ans[cur]=c; cur=None
print('items:',len(items),'answers:',len(ans))
print('website_only count:',sum(1 for x in items if x['website_activity']))
json.dump({'items':items,'answers':ans},open(os.path.join(OUT,'day-items-raw.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
