// Part C の選択肢の和訳。
// 解答後にしか出ないので画面で気づきにくい。件数・取り違え・訳し忘れをここで固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

const app = loadApp({ today: '2026-10-18T09:00:00+09:00' });
const SETS = app.$('SETS');
const items = norm(SETS).flatMap((s) => s.C.map((c) => ({ id: `Set${s.id} C${c.n}`, c })));

test('Part C 全208問に選択肢の和訳がある', () => {
  assert.equal(items.length, 208);
  const missing = items.filter(({ c }) => !Array.isArray(c.oja) || c.oja.length !== 4);
  assert.deepEqual(missing.map((i) => i.id), []);
});

// PTSD / IQ のように、日本語でもそのまま使う略語は原文と同じでよい
const ABBREV_ONLY = /^(PTSD|IQ|AVN|NSAIDs|REM|SAT|CTG|GFR)[。.]?$/;

test('和訳は空でなく、英語の原文のコピーでもない', () => {
  const bad = [];
  for (const { id, c } of items) {
    c.oja.forEach((ja, i) => {
      const en = String(c.opts[i]).trim();
      if (!String(ja).trim()) bad.push(`${id} ${'ABCD'[i]}: 空`);
      else if (String(ja).trim() === en && !ABBREV_ONLY.test(en)) bad.push(`${id} ${'ABCD'[i]}: 英文のまま`);
    });
  }
  assert.deepEqual(bad, []);
});

test('同じ問題の中で和訳が重複しない（選択肢の取り違え防止）', () => {
  // 4択の和訳が同じ文になっているのは、貼り間違いか訳の潰れ
  const dup = items.filter(({ c }) => new Set(c.oja.map((x) => x.trim())).size !== 4);
  assert.deepEqual(dup.map((i) => i.id), []);
});

test('和訳に日本語が含まれる（PTSD・IQ など略語のみの選択肢を除く）', () => {
  const bad = [];
  for (const { id, c } of items) {
    c.oja.forEach((ja, i) => {
      if (!/[ぁ-んァ-ヶ一-龠]/.test(ja) && !ABBREV_ONLY.test(ja.trim())) bad.push(`${id} ${'ABCD'[i]}: ${ja}`);
    });
  }
  assert.deepEqual(bad, []);
});

test('選択肢の数と和訳の数が一致する', () => {
  const bad = items.filter(({ c }) => c.opts.length !== c.oja.length);
  assert.deepEqual(bad.map((i) => i.id), []);
});
