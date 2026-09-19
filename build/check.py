import json, sys, re
def norm(s): return re.sub(r'\s+',' ', s.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('&amp;','&')).strip()
base = json.load(open('build/base.json'))
for sid in sys.argv[1:]:
    a = json.load(open(f'build/ann/{sid}.json'))
    s = base[sid]
    assert len(a['B'])==6 and len(a['C'])==16, (sid, len(a['B']), len(a['C']))
    for i,b in enumerate(a['B']):
        assert len(b['o'])==3, (sid,'B',i)
        k = 'ABC'.index(s['B'][i]['key'])
        mark = [o[1][0] for o in b['o']]
        if 'NOT' in s['B'][i]['q'].upper() or 'not ' in s['B'][i]['q']:
            pass
        ok = [j for j,o in enumerate(b['o']) if o[1].startswith('✅')]
        if ok != [k]: print('  B key/mark mismatch', sid, i+1, s['B'][i]['key'], ok)
    for i,c in enumerate(a['C']):
        q = s['C'][i]; t = s['texts'][q['t']]
        hits = [j for j,p in enumerate(t['paras']) if norm(c['ev']) in norm(p)]
        if len(hits)!=1: print('  C ev not found/ambiguous', sid, q['n'], hits, c['ev'][:50])
    print(sid, 'ok')
