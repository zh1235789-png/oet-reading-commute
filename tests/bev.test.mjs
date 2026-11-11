// Part B の根拠ハイライト。解答後に本文中の根拠を黄色マーカーで示す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

const app = loadApp({ today: '2026-11-11T09:00:00+09:00' });
const items = norm(app.$('SETS')).flatMap((s) => s.B.map((b) => ({ id: `${s.id} B${b.n}`, b })));

test('Part B 全78問（公開分）に根拠があり、どれも本文に実在する', () => {
  assert.equal(items.length, 78);
  const bad = [];
  for (const { id, b } of items) {
    if (!Array.isArray(b.ev) || !b.ev.length) { bad.push(`${id}: 根拠なし`); continue; }
    for (const e of b.ev) if (!b.paras.some((p) => p.includes(e))) bad.push(`${id}: 本文にない ${e.slice(0, 40)}`);
  }
  assert.deepEqual(bad, []);
});

test('highlightAll は複数の根拠をマーカーし、重なりは1つにまとめる', () => {
  const h = app.highlightAll;
  assert.equal(h('aa bb cc dd', ['bb', 'dd']), 'aa <mark>bb</mark> cc <mark>dd</mark>');
  assert.equal(h('aa bb cc dd', ['bb cc', 'cc dd']), 'aa <mark>bb cc dd</mark>');
  assert.equal(h('x < y', ['<']), 'x <mark>&lt;</mark> y', '本文はエスケープする');
  assert.equal(h('no match', ['zz']), 'no match');
  assert.equal(h('no list', null), 'no list');
});
