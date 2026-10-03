#!/usr/bin/env python3
"""Dependency-free static validation; deliberately does not claim browser QA."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re
ROOT = Path(__file__).resolve().parent
errors=[]
class Page(HTMLParser):
    def __init__(self,path):
        super().__init__(); self.path=path; self.title=False; self.viewport=False; self.lang=False; self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html': self.lang=a.get('lang')=='en'
        if tag=='title': self.title=True
        if tag=='meta' and a.get('name')=='viewport': self.viewport=True
        if 'id' in a: self.ids.append(a['id'])
        if tag=='img' and 'alt' not in a: errors.append(f'{self.path.name}: image missing alt')
        for key in ('src','href'):
            ref=a.get(key,'')
            if not ref or ref.startswith('#'): continue
            u=urlsplit(ref)
            if u.scheme or u.netloc: continue
            target=(self.path.parent/u.path).resolve()
            if not target.exists(): errors.append(f'{self.path.name}: missing local resource {ref}')
    def finish(self):
        for name,valid in [('title',self.title),('viewport',self.viewport),('English lang',self.lang)]:
            if not valid: errors.append(f'{self.path.name}: missing {name}')
        if len(self.ids)!=len(set(self.ids)): errors.append(f'{self.path.name}: duplicate IDs')
for path in ROOT.glob('*.html'):
    p=Page(path);p.feed(path.read_text());p.finish()
for filename in ('app.mjs','site.js'):
    code=(ROOT/filename).read_text()
    if re.search(r'\bfetch\s*\(|XMLHttpRequest|sendBeacon',code): errors.append(f'{filename}: unexpected network write/read boundary')
    for ref in re.findall(r"from\s+['\"](\./[^'\"]+)['\"]",code):
        if not (ROOT/ref).exists(): errors.append(f'{filename}: missing module {ref}')
css=(ROOT/'styles.css').read_text()
if css.count('{')!=css.count('}'): errors.append('Unbalanced stylesheet blocks')
if re.search(r'font-size\s*:\s*(?:[7-9]|1[01])px',css): errors.append('Text declaration below 12px readability floor')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(list(ROOT.glob("*.html")))} HTML pages; local links/assets; metadata; alt attributes; CSS balance/readability floor; no app network calls.')
