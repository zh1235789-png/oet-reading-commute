import json, re, os
D = os.path.dirname(os.path.abspath(__file__))
def norm(s): return re.sub(r'\s+',' ', s.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('&amp;','&')).strip()
base = json.load(open(f'{D}/base.json'))
PAST = {  # R{n}=Set{n} の過去誤答（Obsidian R1〜R5ノートより）: 選んだ選択肢
 '01': {'B5':'C','C17':'A','C18':'D','C21':'C'},
 '02': {'B4':'B','B5':'C','B6':'A','C8':'C','C15':'C','C16':'B','C18':'A','C19':'A','C21':'C'},
 '03': {'C13':'A','C14':'A','C18':'B'},
 '04': {'B1':'B','B2':'B','C11':'B','C12':'B','C14':'C'},
 '05': {'C7':'C','C11':'C','C16':'B','C21':'A'},
}
sets = []
for sid in sorted(base):
    s = base[sid]; a = json.load(open(f'{D}/ann/{sid}.json'))
    texts = [dict(title=t['title'], paras=[norm(p) for p in t['paras']]) for t in s['texts']]
    B = []
    for i,b in enumerate(s['B']):
        x = a['B'][i]
        B.append(dict(n=b['n'], title=norm(b['title']), paras=[norm(p) for p in b['paras']], q=norm(b['q']), opts=[norm(o) for o in b['opts']],
                      key=b['key'], qja=x['qja'], ja=x['ja'], o=x['o'], exp=x['exp'], pt=x['pt'], doubt=x.get('doubt'), past=PAST.get(sid,{}).get(f"B{b['n']}")))
    C = []
    for i,c in enumerate(s['C']):
        x = a['C'][i]; paras = texts[c['t']]['paras']
        p = [j for j,pp in enumerate(paras) if norm(x['ev']) in pp]; assert len(p)==1, (sid, c['n'])
        C.append(dict(n=c['n'], t=c['t'], p=p[0], q=norm(c['q']), opts=[norm(o) for o in c['opts']], key=c['key'], ev=norm(x['ev']),
                      note=x['note'], doubt=x.get('doubt'), alt=x.get('alt',[]), past=PAST.get(sid,{}).get(f"C{c['n']}")))
    sets.append(dict(id=sid, texts=texts, B=B, C=C))
data = json.dumps(sets, ensure_ascii=False, separators=(',',':'))
tpl = open(f'{D}/template.html', encoding='utf-8').read()
out = tpl.replace('/*__DATA__*/[]', data)
open(f'{D}/../index.html','w',encoding='utf-8').write(out)
print('built', len(out)//1024, 'KB', sum(len(s['B']) for s in sets), 'B', sum(len(s['C']) for s in sets), 'C')
