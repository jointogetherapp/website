from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
ROOT=Path(__file__).parent
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.links=[];self.ids=set();self.counts={};self.viewport=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.counts[tag]=self.counts.get(tag,0)+1
  if 'id' in a:self.ids.add(a['id'])
  for prop in ('href','src'):
   if prop in a:self.links.append(a[prop])
  if tag=='meta' and a.get('name')=='viewport':self.viewport=True
pages={}
for f in ROOT.glob('*.html'):
 parser=Page();parser.feed(f.read_text());pages[f.name]=parser
 assert parser.counts.get('h1')==1,f'{f}: requires one h1'
 assert parser.counts.get('main')==1,f'{f}: requires one main'
 assert parser.counts.get('title')==1,f'{f}: requires title'
 assert parser.viewport,f'{f}: requires viewport'
for name,page in pages.items():
 for link in page.links:
  target=urlparse(link)
  if target.scheme or target.netloc:continue
  path=unquote(target.path) or name
  assert (ROOT/path).is_file(),f'{name}: broken target {link}'
  if target.fragment and path in pages:
   assert target.fragment in pages[path].ids,f'{name}: broken fragment {link}'
print(f'{len(pages)} pages: local links, assets, anchors, and structure passed.')
