// 今日タブの Part C は、その日のノルマ分（3問）を同じ大問（本文）から出す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './harness.mjs';

const TODAY = '2026-11-25T09:00:00+09:00';

test('その日の C 3問は同じ大問から出る', () => {
  const a = loadApp({ today: TODAY });
  const keys = [];
  for (let k = 0; k < 3; k++) {
    const it = a.nextItem('C');
    keys.push(a.$(`textKey(BYID['${it.id}'])`));
    a.answer(a.$(`BYID['${it.id}']`), 'Z');  // 誤答でも同じ大問が続く
  }
  assert.equal(new Set(keys).size, 1, keys.join(' / '));
});

test('同じ問題は同じ日に二度出ない（大問に残りがある間）', () => {
  const a = loadApp({ today: TODAY });
  const ids = [];
  for (let k = 0; k < 3; k++) { const it = a.nextItem('C'); ids.push(it.id); a.answer(a.$(`BYID['${it.id}']`), it.key); }
  assert.equal(new Set(ids).size, 3);
});

test('問題画面の「次の C へ」も同じ大問から（ホーム経由で描画も通る）', () => {
  const a = loadApp({ today: TODAY });
  const first = a.nextItem('C');
  a.openItem(first.id, 'today');
  a.reveal(a.$(`BYID['${first.id}']`), first.key);
  const nx = a.nextItem('C', first.id);
  assert.equal(a.$(`textKey(BYID['${nx.id}'])`), a.$(`textKey(BYID['${first.id}'])`));
  a.$(`TAB = 'today'; VIEW = null; render()`);
});

test('B の出題は変わらず大問に縛られない', () => {
  const a = loadApp({ today: TODAY });
  assert.equal(a.nextItem('B').part, 'B');
});
