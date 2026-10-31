import json, re, os, base64
D = os.path.dirname(os.path.abspath(__file__))
def norm(s): return re.sub(r'\s+',' ', s.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('&amp;','&')).strip()

# OET公式 Sample Test と Kaplan は再配布できないので、本文と解説を公開リポジトリに置かない。
# iCloud の非公開フォルダから読み、暗号化して index.html に埋め込む（合言葉で開く）。
PRIVATE = os.environ.get('OET_PRIVATE') or os.path.expanduser('~/Library/Mobile Documents/com~apple~CloudDocs/英語学習/OET/Reading通勤ドリル_非公開')
PASS_FILE = os.environ.get('OET_PASS_FILE') or os.path.expanduser('~/.config/oet-reading-commute/passphrase')
ITERATIONS = 200_000  # デイリーホームと同じ（PBKDF2-SHA256 → AES-GCM 256bit）

PAST = {  # R{n}=Set{n} の過去誤答（Obsidian R1〜R5ノートより）: 選んだ選択肢
 '01': {'B5':'C','C17':'A','C18':'D','C21':'C'},
 '02': {'B4':'B','B5':'C','B6':'A','C8':'C','C15':'C','C16':'B','C18':'A','C19':'A','C21':'C'},
 '03': {'C13':'A','C14':'A','C18':'B'},
 '04': {'B1':'B','B2':'B','C11':'B','C12':'B','C14':'C'},
 '05': {'C7':'C','C11':'C','C16':'B','C21':'A'},
 # Official は 2026-10-21 の Part B 採点（O1 B4）と、1st/ の docx に残る 2025年5月の解答（* 印）の誤答
 'O1': {'B4':'C','C8':'C','C12':'C','C16':'A','C18':'A','C20':'B','C21':'A'},
 'O2': {'B2':'B','B3':'B','C13':'B','C16':'B','C17':'B','C18':'C','C20':'B'},
 'O3': {'B1':'C','B4':'A','B5':'C','C7':'A','C10':'C','C12':'D','C19':'D','C20':'D','C21':'D'},
 # OET公式 Sample Test 1（2026-09-02 採点：Obsidian「2026-09-02　S1」）
 'S1': {'B3':'B','B4':'C','B6':'A','C8':'D','C9':'A','C10':'C','C12':'C','C15':'B','C16':'B','C18':'A','C21':'D','C22':'D'},
}
# 並び順：SOLO Set01〜10 → SOLO Official → OET公式 Sample Test → Kaplan
ORDER = {'O': 1, 'S': 2, 'K': 3}

def build_sets(root):
    """root（base.json と ann/ があるフォルダ）のセットを、アプリに埋め込む形に組み立てる"""
    base = json.load(open(f'{root}/base.json'))
    sets = []
    for sid in sorted(base, key=lambda x: (ORDER.get(x[0], 0), x)):
        s = base[sid]; a = json.load(open(f'{root}/ann/{sid}.json'))
        texts = [dict(title=t['title'], paras=[norm(p) for p in t['paras']]) for t in s['texts']]
        voc = json.load(open(f'{root}/ann/vocab/{sid}.json'))
        copts = json.load(open(f'{root}/ann/copts/{sid}.json'))
        # 件数が合わないまま進むと、IndexError で止まるか、余った訳が黙って捨てられる。
        # assert は python -O で消えるので、データ検証には使わない（2026-10-18 Codex指摘）。
        def need(cond, msg):
            if not cond:
                raise SystemExit(f'ビルド中止 Set{sid}: {msg}')
        need(len(voc['B']) == len(s['B']) and len(voc['C']) == len(s['C']), 'vocab の件数が問題数と一致しません')
        need(len(copts['C']) == len(s['C']), 'copts の件数が問題数と一致しません')
        need(all(len(x) == len(c['opts']) for x, c in zip(copts['C'], s['C'])), 'copts の選択肢数が一致しません')
        B = []
        for i,b in enumerate(s['B']):
            x = a['B'][i]
            B.append(dict(n=b['n'], title=norm(b['title']), paras=[norm(p) for p in b['paras']], q=norm(b['q']), opts=[norm(o) for o in b['opts']],
                          key=b['key'], qja=x['qja'], ja=x['ja'], o=x['o'], exp=x['exp'], pt=x['pt'], doubt=x.get('doubt'),
                          voc=voc['B'][i], past=PAST.get(sid,{}).get(f"B{b['n']}")))
        C = []
        for i,c in enumerate(s['C']):
            x = a['C'][i]; paras = texts[c['t']]['paras']
            p = [j for j,pp in enumerate(paras) if norm(x['ev']) in pp]
            need(len(p) == 1, f"C{c['n']} の根拠文が本文の1段落に見つかりません")
            C.append(dict(n=c['n'], t=c['t'], p=p[0], q=norm(c['q']), opts=[norm(o) for o in c['opts']], key=c['key'], ev=norm(x['ev']),
                          note=x['note'], doubt=x.get('doubt'), alt=x.get('alt',[]),
                          voc=voc['C'][i], oja=copts['C'][i], past=PAST.get(sid,{}).get(f"C{c['n']}")))
        sets.append(dict(id=sid, texts=texts, B=B, C=C))
    return sets

def encrypt(obj, passphrase):
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    b = lambda x: base64.b64encode(x).decode()
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(hashes.SHA256(), 32, salt, ITERATIONS).derive(passphrase.encode())
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, ensure_ascii=False, separators=(',',':')).encode(), None)
    return {'v': 1, 'iter': ITERATIONS, 'salt': b(salt), 'iv': b(iv), 'ct': b(ct)}

if __name__ == '__main__':
    sets = build_sets(D)
    locked, private = None, []
    if os.path.isdir(PRIVATE):
        private = build_sets(PRIVATE)
        if not os.path.exists(PASS_FILE):
            raise SystemExit('ビルド中止: 合言葉のファイルがありません。\n'
                             f'  {PASS_FILE} に合言葉を1行で保存してください（公式問題の暗号化に使います）。')
        passphrase = open(PASS_FILE, encoding='utf-8').read().strip()
        if len(passphrase) < 8:
            raise SystemExit('ビルド中止: 合言葉は8文字以上にしてください。')
        locked = encrypt(private, passphrase)
    else:
        print('⚠️ 非公開データのフォルダが見つからないため、公式問題（Sample Test・Kaplan）なしでビルドします')
    tpl = open(f'{D}/template.html', encoding='utf-8').read()
    out = tpl.replace('/*__DATA__*/[]', json.dumps(sets, ensure_ascii=False, separators=(',',':')))
    out = out.replace('/*__LOCKED__*/null', json.dumps(locked, separators=(',',':')))
    open(f'{D}/../index.html','w',encoding='utf-8').write(out)
    count = lambda ss, p: sum(len(s[p]) for s in ss)
    nvoc = sum(len(x['voc']) for s in sets + private for x in s['B'] + s['C'])
    print('built', len(out)//1024, 'KB', f"公開 B{count(sets,'B')} C{count(sets,'C')}", f"／暗号化 B{count(private,'B')} C{count(private,'C')}（{', '.join(s['id'] for s in private)}）", nvoc, '語')
