// Part C の段落ごとの和訳（解答後の「この段落の和訳」）。訳し忘れ・段落ずれ・英文のままをここで止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadApp, norm } from './harness.mjs';

const TODAY = '2026-11-12T09:00:00+09:00';
const PASS_FILE = process.env.OET_PASS_FILE || join(homedir(), '.config/oet-reading-commute/passphrase');
const JP = /[ぁ-んァ-ヶ一-龠]/;

function check(sets) {
  const bad = [];
  for (const s of sets) s.texts.forEach((t, ti) => {
    if (!Array.isArray(t.ja)) { bad.push(`${s.id} T${ti}: 和訳なし`); return; }
    if (t.ja.length !== t.paras.length) bad.push(`${s.id} T${ti}: 段落数 ${t.ja.length}/${t.paras.length}`);
    t.ja.forEach((j, pi) => {
      if (!j || !JP.test(j)) bad.push(`${s.id} T${ti}[${pi}]: 日本語なし`);
      // 長い段落なのに訳が極端に短い＝訳し漏れ・貼り間違い
      else if (t.paras[pi] && t.paras[pi].length > 300 && j.length < t.paras[pi].length / 6) bad.push(`${s.id} T${ti}[${pi}]: 訳が短すぎる`);
    });
    if (new Set(t.ja).size !== t.ja.length) bad.push(`${s.id} T${ti}: 同じ訳が重複`);
  });
  return bad;
}

test('Part C の本文（公開分）は全段落に和訳がある', () => {
  const sets = norm(loadApp({ today: TODAY }).$('SETS'));
  assert.deepEqual(check(sets), []);
});

test('Part C の段落の和訳は解答後にだけ出す', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const render = html.slice(html.indexOf('function renderItem('), html.indexOf('function reveal('));
  const reveal = html.slice(html.indexOf('function reveal('), html.indexOf('function renderLog('));
  assert.doesNotMatch(render, /text\.ja/, '問題画面（解答前）に段落の和訳を出していない');
  assert.match(reveal, /この段落の和訳/);
  assert.match(reveal, /it\.text\.ja\[it\.p\]/);
});

test('暗号化セット（Sample Test・Kaplan）の本文にも全段落の和訳がある', { skip: !existsSync(PASS_FILE) && '合言葉のファイルなし' }, async () => {
  const app = loadApp({ today: TODAY });
  assert.equal(await app.$('unlock')(readFileSync(PASS_FILE, 'utf8').trim(), false), true);
  const locked = norm(app.$('SETS')).filter((s) => /^[SK]/.test(s.id));
  assert.equal(locked.length, 7);
  assert.deepEqual(check(locked), []);
});
