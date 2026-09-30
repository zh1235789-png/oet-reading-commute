// 端末間同期（GitHub Gist）のマージ規則。
// ここが壊れると「iPadで解いた記録がiPhoneの古い状態で上書きされて消える」
// という気づきにくい事故になるので、問題単位の勝ち負けを固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

const NOW = '2026-09-30T09:00:00+09:00';
const app = (storage) => loadApp({ today: NOW, storage });

function withState(a, patch = {}) {
  const S = a.$('S');
  Object.assign(S, { items: {}, days: {}, others: {}, resetAt: 0, dev: 'devA' }, patch);
  return S;
}
const rec = (ts, extra = {}) => Object.assign({ n: 1, wrong: 0, lastOk: true, ts }, extra);

test('同じ問題は、あとで解いた方の記録が残る', () => {
  const a = app();
  const S = withState(a, { items: { '01-B1': rec(100, { lastOk: true }) } });
  a.mergeRemote({ items: { '01-B1': rec(200, { lastOk: false }) }, daysBy: {} });
  assert.equal(S.items['01-B1'].lastOk, false);
  assert.equal(S.items['01-B1'].ts, 200);
});

test('自分の方が新しければ自分の記録が残る', () => {
  const a = app();
  const S = withState(a, { items: { '01-B1': rec(300, { lastOk: false }) } });
  a.mergeRemote({ items: { '01-B1': rec(200, { lastOk: true }) }, daysBy: {} });
  assert.equal(S.items['01-B1'].lastOk, false);
});

test('相手だけが解いた問題は取り込む', () => {
  const a = app();
  const S = withState(a, { items: { '01-B1': rec(100) } });
  a.mergeRemote({ items: { '02-C7': rec(50) }, daysBy: {} });
  assert.deepEqual(Object.keys(S.items).sort(), ['01-B1', '02-C7']);
});

test('リセット後は、リセットより前の記録を相手から受け取らない', () => {
  const a = app();
  const S = withState(a, { resetAt: 500 });
  a.mergeRemote({ items: { '01-B1': rec(400) }, daysBy: {}, resetAt: 0 });
  assert.deepEqual(norm(S.items), {});
  assert.equal(S.resetAt, 500);
});

test('相手のリセットはこちらにも伝わり、記録と日別カウントが消える', () => {
  const a = app();
  const S = withState(a, { items: { '01-B1': rec(400) }, days: { '2026-09-29': 3 }, others: { devB: { '2026-09-29': 2 } } });
  a.mergeRemote({ items: {}, daysBy: {}, resetAt: 900 });
  assert.deepEqual(norm(S.items), {});
  assert.deepEqual(norm(S.days), {});
  assert.deepEqual(norm(S.others), {});
  assert.equal(S.resetAt, 900);
});

test('他端末の日別解答数を取り込み、自分の分と合算する', () => {
  const a = app();
  const S = withState(a, { days: { '2026-09-30': 3 } });
  a.mergeRemote({ items: {}, daysBy: { devA: { '2026-09-30': 99 }, devB: { '2026-09-30': 2 } } });
  assert.deepEqual(norm(S.days), { '2026-09-30': 3 }, '自分の日別カウントは相手側の写しで上書きされない');
  assert.deepEqual(norm(S.others), { devB: { '2026-09-30': 2 } });
  assert.equal(a.dayCount('2026-09-30'), 5);
});

test('相手のデータが空・壊れていても自分の記録を消さない', () => {
  const a = app();
  const S = withState(a, { items: { '01-B1': rec(100) } });
  for (const bad of [null, undefined, {}, { v: 1 }]) {
    a.mergeRemote(bad);
    assert.deepEqual(Object.keys(S.items), ['01-B1'], `壊れた入力 ${JSON.stringify(bad)} で消えた`);
  }
});

test('syncDoc() は自分の端末の日別カウントを自分のIDで載せる', () => {
  const a = app();
  withState(a, { dev: 'devA', days: { '2026-09-30': 4 }, others: { devB: { '2026-09-30': 1 } }, resetAt: 7 });
  const doc = norm(a.syncDoc());
  assert.deepEqual(doc.daysBy, { devB: { '2026-09-30': 1 }, devA: { '2026-09-30': 4 } });
  assert.equal(doc.resetAt, 7);
});

test('同期導入前の保存データ（時刻なし）にも時刻を補う', () => {
  // 補わないと ts:0 扱いになり、他端末のどんな古い記録にも負けて消える
  const a = app({ 'oet-reading-commute-v1': JSON.stringify({ items: { '01-B1': { n: 1, wrong: 0, lastOk: true, last: '2026-09-18' } }, days: {} }) });
  assert.ok(a.$('S').items['01-B1'].ts > 0);
});

test('端末IDは保存データが無いときに自動で振られる', () => {
  const a = app();
  assert.match(a.$('S').dev, /^[a-z0-9]+$/);
});

test('トークン未設定なら同期は何もしない（fetchを呼ばない）', async () => {
  const a = app();
  a.$('SY = {}');
  await a.syncNow();   // harness の fetch は呼ばれると投げる
  assert.equal(a.$('SY.state'), undefined);
  assert.equal(a.syncText(), '');
});
