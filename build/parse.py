import re, json, sys, glob, os
SRC = sys.argv[1]
out = {}
def clean(s):
    return s.replace('&amp;','&').replace('&gt;','>').replace('&lt;','<').replace(' ',' ').strip()
for path in sorted(glob.glob(os.path.join(SRC,'Set*.txt'))):
    sid = re.search(r'Set(\d+)', path).group(1)
    L = [clean(x) for x in open(path, encoding='utf-8').read().split('\n')]
    L = [x for x in L if x]
    # answer key: last "Part B" / "Part C" after "Answer Key"
    ak = max(i for i,x in enumerate(L) if x.startswith('Answer Key'))
    kb = [i for i in range(ak, len(L)) if L[i].startswith('Part B')][0]
    kc = [i for i in range(ak, len(L)) if L[i].startswith('Part C')][0]
    keyB = [L[i].strip()[0] for i in range(kb+1, kb+7)]
    keyC = [L[i].strip()[0] for i in range(kc+1, kc+17)]
    pb = [i for i,x in enumerate(L) if x.startswith('Part B')][0]
    pc = [i for i,x in enumerate(L[:ak]) if x == 'Part C'][0]
    # ---- Part B
    body = [x for x in L[pb+1:pc] if not x.startswith('TIME:') and not x.startswith('In this part') and x!='Part B']
    def isq(i, x):
        if re.match(r'^\d+\.', x): return True
        return x.endswith('?') and len(x) < 260 and i+3 < len(body)
    B = []; i = 0
    while i < len(body):
        x = body[i]
        assert isq(i, x) or not B, (sid, 'B start', x)
        q = re.sub(r'^\d+\.\s*', '', x)
        opts = body[i+1:i+4]
        j = i+4
        # optional "Text n" line
        title = body[j]; j += 1
        if re.match(r'^Text \d+$', title): title = body[j]; j += 1
        paras = []
        while j < len(body) and not (re.match(r'^\d+\.', body[j]) or (body[j].endswith('?') and len(body[j])<260 and j+3<len(body) and len(paras)>0 and len(body[j+1])<260 and len(body[j+2])<260 and len(body[j+3])<260 and body[j+4:j+5] and len(B)<5)):
            paras.append(body[j]); j += 1
        B.append(dict(q=q, opts=opts, title=title, paras=paras))
        i = j
    # ---- Part C
    cb = [x for x in L[pc+1:ak] if not x.startswith('In this part')]
    C = []; texts = []
    k = 0
    for t in range(2):
        hdr = cb[k]; k += 1
        m = re.match(r'^Text\s*\d\s*:?\s*(.*)$', hdr)
        title = m.group(1).strip() if m else hdr
        paras = []
        first = 7 if t == 0 else 15
        while not re.match(r'^%d\.' % first, cb[k].strip()):
            paras.append(cb[k]); k += 1
        # join broken lines
        fixed = []
        for p in paras:
            if fixed and (not re.search(r'[.!?"”’)]$', fixed[-1].strip()) or p.startswith('But if humans behave') or p.startswith('“So finding that')):
                fixed[-1] = fixed[-1].rstrip() + ' ' + p
            else:
                fixed.append(p)
        texts.append(dict(title=title, paras=fixed))
        for n in range(first, first+8):
            x = cb[k].strip(); assert re.match(r'^%d\.' % n, x), (sid, n, x)
            q = re.sub(r'^\d+\.\s*', '', x)
            opts = [cb[k+1+z].strip() for z in range(4)]
            C.append(dict(n=n, t=t, q=q, opts=opts))
            k += 5
    def strip_opt(o):
        o = re.sub(r'^[A-D]\.\s*', '', o.strip())
        o = re.sub(r'^AIt ', 'It ', o); o = re.sub(r'^A most vaccinations', 'most vaccinations', o)
        return o
    for b in B: b['opts'] = [strip_opt(o) for o in b['opts']]
    for c in C: c['opts'] = [strip_opt(o) for o in c['opts']]
    for idx,b in enumerate(B): b['key'] = keyB[idx]; b['n'] = idx+1
    for idx,c in enumerate(C): c['key'] = keyC[idx]
    out[sid] = dict(B=B, texts=texts, C=C)
json.dump(out, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
for sid,s in out.items():
    print(sid, 'B', len(s['B']), [len(b['paras']) for b in s['B']], 'C', len(s['C']), [len(t['paras']) for t in s['texts']], ''.join(b['key'] for b in s['B']), ''.join(c['key'] for c in s['C']))
    for b in s['B']: print('   Q:', b['q'][:60], '| T:', b['title'][:40])
