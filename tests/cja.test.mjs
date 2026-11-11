// Part C の設問・根拠文の和訳（解答後に表示）。訳し忘れ・取り違え・英文のままをここで止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadApp, norm } from './harness.mjs';

const TODAY = '2026-11-11T09:00:00+09:00';
const PASS_FILE = process.env.OET_PASS_FILE || join(homedir(), '.config/oet-reading-commute/passphrase');
const JP = /[ぁ-んァ-ヶ一-龠]/;

function check(sets) {
  const bad = [];
  for (const s of sets) for (const c of s.C) {
    const id = `${s.id} C${c.n}`;
    for (const k of ['qja', 'evja']) {
      const v = c[k];
      if (!v || !String(v).trim()) bad.push(`${id} ${k}: 空`);
      else if (!JP.test(v)) bad.push(`${id} ${k}: 日本語なし`);
      else if (v.includes('\\')) bad.push(`${id} ${k}: バックスラッシュ混入`);
    }
    if (c.qja && c.qja === c.evja) bad.push(`${id}: 設問と根拠の訳が同じ`);
  }
  return bad;
}

test('Part C 全208問（公開分）に設問と根拠文の和訳がある', () => {
  const sets = norm(loadApp({ today: TODAY }).$('SETS'));
  assert.equal(sets.reduce((n, s) => n + s.C.length, 0), 208);
  assert.deepEqual(check(sets), []);
});

test('同じセットの中で設問の訳が重複しない（貼り間違い防止）', () => {
  const sets = norm(loadApp({ today: TODAY }).$('SETS'));
  const dup = sets.filter((s) => new Set(s.C.map((c) => c.qja)).size !== s.C.length).map((s) => s.id);
  assert.deepEqual(dup, []);
});

test('暗号化セット（Sample Test・Kaplan）の Part C 112問にも和訳がある', { skip: !existsSync(PASS_FILE) && '合言葉のファイルなし' }, async () => {
  const app = loadApp({ today: TODAY });
  assert.equal(await app.$('unlock')(readFileSync(PASS_FILE, 'utf8').trim(), false), true);
  const locked = norm(app.$('SETS')).filter((s) => /^[SK]/.test(s.id));
  assert.equal(locked.reduce((n, s) => n + s.C.length, 0), 112);
  assert.deepEqual(check(locked), []);
  const bev = locked.flatMap((s) => s.B.filter((b) => !b.ev || !b.ev.length || b.ev.some((e) => !b.paras.some((p) => p.includes(e)))).map((b) => `${s.id} B${b.n}`));
  assert.deepEqual(bev, [], 'B の根拠も42問そろっている');
});
