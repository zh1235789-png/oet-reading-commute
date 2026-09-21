import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

const TODAY = '2026-09-21T09:00:00+09:00';
const app = () => loadApp({ today: TODAY });

test('today() はローカル日付を YYYY-MM-DD で返す', () => {
  assert.equal(app().today(), '2026-09-21');
});

test('addDays() は日付を前後に動かす', () => {
  const a = app();
  assert.equal(a.addDays('2026-09-21', 1), '2026-09-22');
  assert.equal(a.addDays('2026-09-21', -1), '2026-09-20');
  assert.equal(a.addDays('2026-09-21', 0), '2026-09-21');
});

test('addDays() は月・年をまたいでも正しい', () => {
  const a = app();
  assert.equal(a.addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(a.addDays('2026-10-01', -1), '2026-09-30');
  assert.equal(a.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(a.addDays('2026-03-01', -1), '2026-02-28');
});

test('addDays() はうるう年の2月29日を踏む', () => {
  assert.equal(app().addDays('2028-02-28', 1), '2028-02-29');
});

test('addDays() は T00:00:00 を付けてローカル解釈する（UTCずれを起こさない）', () => {
  // 'YYYY-MM-DD' を素で new Date すると UTC 扱いになり、JST では前日になり得る
  const a = app();
  assert.equal(a.addDays('2026-09-21', 0), '2026-09-21');
});

// ---- SRS の状態判定 ----

test('status() は未回答なら new', () => {
  const a = app();
  assert.equal(a.status({ id: 'no-such-id' }), 'new');
});

test('status() は期限が今日以前なら due', () => {
  const a = app();
  a.$('S').items['x'] = { due: '2026-09-21', lastOk: true };
  assert.equal(a.status({ id: 'x' }), 'due');
  a.$('S').items['y'] = { due: '2026-09-20', lastOk: true };
  assert.equal(a.status({ id: 'y' }), 'due');
});

test('status() は期限が未来なら due にしない', () => {
  const a = app();
  a.$('S').items['z'] = { due: '2026-09-22', lastOk: true };
  assert.equal(a.status({ id: 'z' }), 'ok');
});

test('status() は due が null（習得済み）なら lastOk で決まる', () => {
  const a = app();
  a.$('S').items['m'] = { due: null, lastOk: true };
  assert.equal(a.status({ id: 'm' }), 'ok');
  a.$('S').items['n'] = { due: null, lastOk: false };
  assert.equal(a.status({ id: 'n' }), 'ng');
});

test('isWeak() は直近が誤答、過去に誤答、または過去セットで誤答した問題', () => {
  const a = app();
  a.$('S').items['w1'] = { lastOk: false, wrong: 0 };
  assert.equal(a.isWeak({ id: 'w1' }), true);
  a.$('S').items['w2'] = { lastOk: true, wrong: 1 };
  assert.equal(a.isWeak({ id: 'w2' }), true);
  a.$('S').items['w3'] = { lastOk: true, wrong: 0 };
  assert.equal(a.isWeak({ id: 'w3' }), false);
  assert.equal(a.isWeak({ id: 'w4', past: 'B' }), true);   // 未回答でも過去誤答なら弱点
});

test('pastLabel() は過去誤答のときだけラベルを出す', () => {
  const a = app();
  assert.equal(a.pastLabel({ past: null, set: 3 }, true), '');
  assert.equal(a.pastLabel({ past: 'C', set: 3 }, false), 'R3で誤答');
  assert.equal(a.pastLabel({ past: 'C', set: 3 }, true), 'R3で誤答（Cを選択）');
});

// ---- SRS の間隔（INTERVALS = [1,3,7,21]） ----

test('answer() 初見で正解なら習得扱いで期限なし', () => {
  const a = app();
  const it = { id: 'q1', key: 'A' };
  assert.equal(a.answer(it, 'A'), true);
  assert.equal(a.$('S').items['q1'].due, null);
  assert.equal(a.$('S').items['q1'].box, 4);
});

test('answer() 誤答なら翌日に再出題', () => {
  const a = app();
  const it = { id: 'q2', key: 'A' };
  assert.equal(a.answer(it, 'B'), false);
  assert.equal(a.$('S').items['q2'].box, 0);
  assert.equal(a.$('S').items['q2'].due, '2026-09-22');   // +1日
});

test('answer() 誤答後に正解すると箱が1つ進む', () => {
  const a = app();
  const it = { id: 'q3', key: 'A' };
  a.answer(it, 'B');            // 誤答 → box 0
  a.answer(it, 'A');            // 正解 → box 1 → +3日
  assert.equal(a.$('S').items['q3'].box, 1);
  assert.equal(a.$('S').items['q3'].due, '2026-09-24');
});

test('answer() は alt の選択肢も正解とみなす', () => {
  const a = app();
  assert.equal(a.answer({ id: 'q4', key: 'A', alt: ['B'] }, 'B'), true);
});

test('answer() は解答履歴を10件で打ち切る', () => {
  const a = app();
  const it = { id: 'q5', key: 'A' };
  for (let i = 0; i < 15; i++) a.answer(it, 'A');
  assert.equal(a.$('S').items['q5'].hist.length, 10);
});

test('answer() はその日の回答数を数える', () => {
  const a = app();
  a.answer({ id: 'q6', key: 'A' }, 'A');
  a.answer({ id: 'q7', key: 'A' }, 'B');
  assert.equal(a.$('S').days['2026-09-21'], 2);
});
