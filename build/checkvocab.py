import json, re, sys, os
def norm(x): return re.sub(r'\s+',' ', x.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('&amp;','&')).strip().lower()

# 語形変化（inoculate → inoculates / turn away → turned away）を許すゆるい照合。
# 目的は「本文に無い語をでっち上げていないか」の検出なので、語幹一致で十分。
def stem(w):
    w = re.sub(r'[^a-z0-9-]', '', w)
    for suf in ('ingly','ing','edly','ed','ies','es','s','ly','e','y'):
        if len(w) > len(suf) + 3 and w.endswith(suf): return w[:-len(suf)]
    return w
def contains(phrase, txt):
    if norm(phrase) in txt: return True
    toks = [stem(t) for t in norm(phrase).split() if t not in ('a','an','the','to','of','and','be','with','for','on','in','their','your','as')]
    pool = {stem(t) for t in re.findall(r"[a-z0-9-]+", txt)}
    return all(t in pool for t in toks if t)
base = json.load(open('base.json'))
bad = 0
for sid in sys.argv[1:]:
    f = f'ann/vocab/{sid}.json'
    if not os.path.exists(f): print(sid, 'MISSING'); continue
    v = json.load(open(f)); s = base[sid]; an = json.load(open(f'ann/{sid}.json'))
    assert len(v['B'])==6 and len(v['C'])==16, (sid, len(v['B']), len(v['C']))
    for i,b in enumerate(s['B']):
        txt = norm(' '.join(b['paras']) + ' ' + b['title'] + ' ' + b['q'] + ' ' + ' '.join(b['opts']))
        for w,ja in v['B'][i]:
            if not contains(w, txt): print(f'{sid} B{b["n"]}: 本文に無い -> {w}'); bad += 1
    for i,c in enumerate(s['C']):
        paras = s['texts'][c['t']]['paras']; ev = an['C'][i]['ev']
        p = [j for j,pp in enumerate(paras) if norm(ev) in norm(pp)][0]
        txt = norm(paras[p] + ' ' + c['q'] + ' ' + ' '.join(c['opts']))
        for w,ja in v['C'][i]:
            if not contains(w, txt): print(f'{sid} C{c["n"]}: 本文に無い -> {w}'); bad += 1
    n = sum(len(x) for x in v['B']) + sum(len(x) for x in v['C'])
    print(f'Set{sid}: 語数 {n}', 'OK' if not bad else '')
sys.exit(1 if bad else 0)
