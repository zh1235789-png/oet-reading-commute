// 暗号化して埋め込んだ公式問題（OET Sample Test・Kaplan）の検査。
// 1) 公開される index.html に本文が平文で残っていない（再配布できない教材なので）
// 2) 合言葉が違うと開かない
// 3) 正しい合言葉で開くと、全問に語彙・選択肢の和訳がそろっている
// 合言葉と非公開データはリポジトリの外（この Mac）にしかないので、無い環境では 1)3) を飛ばす。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadApp, norm } from './harness.mjs';

const PASS_FILE = process.env.OET_PASS_FILE || join(homedir(), '.config/oet-reading-commute/passphrase');
const PRIVATE = process.env.OET_PRIVATE || join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/英語学習/OET/Reading通勤ドリル_非公開');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const TODAY = '2026-10-31T09:00:00+09:00';

test('暗号化データが埋め込まれている', () => {
  const app = loadApp({ today: TODAY });
  const L = norm(app.$('LOCKED'));
  assert.ok(L && L.ct && L.iv && L.salt && L.iter >= 100000, 'LOCKED が無いか形式が違う');
  assert.equal(app.$('LOCK.state'), 'locked');
});

test('公開される index.html に非公開の本文が平文で入っていない', { skip: !existsSync(join(PRIVATE, 'base.json')) && '非公開データなし' }, () => {
  const base = JSON.parse(readFileSync(join(PRIVATE, 'base.json'), 'utf8'));
  const leaks = [];
  for (const [sid, s] of Object.entries(base)) {
    const ps = [...s.B.flatMap((b) => b.paras), ...s.texts.flatMap((t) => t.paras)];
    for (const p of ps) {
      const head = p.slice(0, 50).replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
      if (head.length >= 30 && html.includes(head)) leaks.push(`${sid}: ${head}`);
    }
  }
  assert.deepEqual(leaks, []);
});

test('合言葉が違うと開かず、問題も増えない', async () => {
  const app = loadApp({ today: TODAY });
  const n = app.$('ITEMS.length');
  const ok = await app.$('unlock')('wrong-passphrase', false);
  assert.equal(ok, false);
  assert.equal(app.$('LOCK.state'), 'locked');
  assert.equal(app.$('LOCK.err'), '合言葉が違います');
  assert.equal(app.$('ITEMS.length'), n);
});

test('正しい合言葉で開くと Sample Test 1〜5・Kaplan の154問がそろう', { skip: !existsSync(PASS_FILE) && '合言葉のファイルなし' }, async () => {
  const pass = readFileSync(PASS_FILE, 'utf8').trim();
  const app = loadApp({ today: TODAY });
  const before = app.$('ITEMS.length');
  assert.equal(await app.$('unlock')(pass, false), true);
  assert.equal(app.$('LOCK.state'), 'open');
  const sets = norm(app.$('SETS'));
  const added = sets.filter((s) => /^[SK]\d$/.test(s.id));
  assert.deepEqual(added.map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'K1', 'K2']);
  assert.equal(app.$('ITEMS.length'), before + 154);
  const bad = [];
  for (const s of added) {
    for (const b of s.B) if (!b.voc?.length || b.o?.length !== 3) bad.push(`${s.id} B${b.n}`);
    for (const c of s.C) if (!c.voc?.length || c.oja?.length !== 4 || !s.texts[c.t].paras[c.p].includes(c.ev)) bad.push(`${s.id} C${c.n}`);
  }
  assert.deepEqual(bad, []);
  // 二度開いても増えない
  await app.$('unlock')(pass, false);
  assert.equal(app.$('ITEMS.length'), before + 154);
});

test('保存済みの合言葉が古いときは捨てる（合言葉を変えた後に毎回失敗しない）', async () => {
  const app = loadApp({ today: TODAY, storage: { 'oet-reading-commute-pass': 'old-passphrase' } });
  // 起動時の自動解錠を待つ
  for (let i = 0; i < 200 && app.$('LOCK.busy'); i++) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(app.$('LOCK.state'), 'locked');
  assert.equal(app.__store['oet-reading-commute-pass'], undefined);
});
