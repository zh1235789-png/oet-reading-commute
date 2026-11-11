// 1日のノルマ（B 2問・C 3問）。今日の解答数は問題ごとの履歴から数える（同期した他端末の分も入る）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

const TODAY = '2026-11-11T09:00:00+09:00';
const app = () => loadApp({ today: TODAY });

test('ノルマは B 2問・C 3問', () => {
  assert.deepEqual(norm(app().$('QUOTA')), { B: 2, C: 3 });
});

test('解くたびにそのパートの残りが減り、0 で止まる', () => {
  const a = app();
  assert.equal(a.$("quotaLeft('B')"), 2);
  assert.equal(a.$("quotaLeft('C')"), 3);
  for (let k = 0; k < 3; k++) { const it = a.nextItem('B'); a.answer(it, it.key); }
  assert.equal(a.doneToday('B'), 3);
  assert.equal(a.$("quotaLeft('B')"), 0);
  assert.equal(a.$("quotaLeft('C')"), 3, 'B を解いても C の残りは減らない');
});

test('昨日の解答は今日の数に入らない', () => {
  const a = app();
  const id = a.$(`ITEMS.find(i => i.part === 'C').id`);
  a.$(`S.items['${id}'] = {n:2, wrong:0, box:4, lastOk:true, last:'2026-11-11', hist:[['2026-11-10','A'], ['2026-11-11','A']]}`);
  assert.equal(a.doneToday('C'), 1);
});

test('他端末で解いて同期された分も今日の数に入る', () => {
  const a = app();
  const ids = norm(a.$(`ITEMS.filter(i => i.part === 'C').slice(0, 3).map(i => i.id)`));
  const items = Object.fromEntries(ids.map((id) => [id, { n: 1, wrong: 0, box: 4, lastOk: true, last: '2026-11-11', ts: Date.now(), hist: [['2026-11-11', 'A']] }]));
  a.mergeRemote({ v: 1, resetAt: 0, items, daysBy: { other: { '2026-11-11': 3 } } });
  assert.equal(a.$("quotaLeft('C')"), 0);
});

test('ノルマの途中・達成後もホームと問題画面が描画できる', () => {
  const a = app();
  a.$(`TAB = 'today'; VIEW = null; render()`);
  for (const part of ['B', 'B', 'C', 'C', 'C']) {
    const it = a.nextItem(part);
    a.openItem(it.id, 'today');
    a.reveal(a.$(`BYID['${it.id}']`), it.key);
  }
  assert.equal(a.$("quotaLeft('B')") + a.$("quotaLeft('C')"), 0);
  a.$(`VIEW = null; render()`);
});
