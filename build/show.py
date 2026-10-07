import json, sys, re
def norm(x): return re.sub(r'\s+',' ', x.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('&amp;','&')).strip()
b = json.load(open('base.json')); a = lambda sid: json.load(open(f'ann/{sid}.json'))
for sid in sys.argv[1:]:
    s = b[sid]; an = a(sid)
    print(f'######## Set{sid}')
    for i, x in enumerate(s['B']):
        print(f'--B{x["n"]} [{x["title"]}]')
        print(' '.join(x['paras']))
        print('Q:', x['q'], '|', ' / '.join(x['opts']))
    for i, c in enumerate(s['C']):
        ev = an['C'][i]['ev']
        paras = s['texts'][c['t']]['paras']
        p = [j for j,pp in enumerate(paras) if norm(ev) in norm(pp)][0]
        print(f'--C{c["n"]} [T{c["t"]+1} p{p+1}]')
        print(paras[p])
        print('Q:', c['q'], '|', ' / '.join(c['opts']))
