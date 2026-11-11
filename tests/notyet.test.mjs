// 模試でまだ解いていないセット（NOT_YET）は、本番の模試の答えを先に知らないよう
// ドリルの出題・一覧・記録に出さない。ドリルで一度答えた問題だけは復習のため出す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadApp, norm } from './harness.mjs';

const TODAY = '2026-11-11T09:00:00+09:00';
const PASS_FILE = process.env.OET_PASS_FILE || join(homedir(), '.config/oet-reading-commute/passphrase');

// 合言葉なしでも試せるよう、NOT_YET に入っている ID で偽のセットを足す
function withFakeSet(storage = {}) {
  const app = loadApp({ today: TODAY, storage });
  const id = norm(app.$('[...NOT_YET]'))[0];
  app.$(`addSets([{id:${JSON.stringify(id)}, texts:[{title:'t',paras:['p']},{title:'u',paras:['q']}],
    B:[{n:1,title:'x',paras:['p'],q:'q',opts:['a','b','c'],key:'A'}],
    C:[{n:7,t:0,p:0,q:'q',opts:['a','b','c','d'],key:'A'}]}])`);
  return { app, id };
}

test('未実施セットが定義されていて、解いたことのあるセットは入っていない', () => {
  const ids = norm(loadApp({ today: TODAY }).$('[...NOT_YET]'));
  assert.deepEqual(ids, ['S2', 'S3', 'S4', 'S5', 'K1', 'K2']);
});

test('未実施セットの未回答問題は出題されない（B・Cとも、全部解き終わっても）', () => {
  const { app, id } = withFakeSet();
  for (const part of ['B', 'C']) {
    // 他の問題を全部解いた状態にしても、未実施セットには回らない
    app.$(`ITEMS.filter(i => i.part === '${part}' && i.set !== '${id}').forEach(i => { S.items[i.id] = {n:1, wrong:0, box:4, lastOk:true, last:'2026-11-01', hist:[]}; })`);
    assert.notEqual(app.$(`nextItem('${part}').set`), id);
  }
  assert.equal(app.$(`drill().some(i => i.set === '${id}')`), false);
});

test('未実施セットでもドリルで答えた問題は復習に出る', () => {
  const { app, id } = withFakeSet();
  app.$(`S.items['${id}-B1'] = {n:1, wrong:1, box:0, lastOk:false, last:'2026-11-10', due:'2026-11-11', hist:[]}`);
  assert.equal(app.$(`nextItem('B').id`), `${id}-B1`);
  assert.equal(app.$(`drill().filter(i => i.set === '${id}').length`), 1);
});

test('一覧・ホーム・記録の描画が未実施セットを含んでも落ちない', () => {
  const { app } = withFakeSet();
  for (const t of ['today', 'B', 'C', 'log']) app.$(`TAB = '${t}'; VIEW = null; render()`);
});

test('合言葉で開いても Sample Test 2〜5・Kaplan はドリルに出ず、Sample Test 1 は出る', { skip: !existsSync(PASS_FILE) && '合言葉のファイルなし' }, async () => {
  const app = loadApp({ today: TODAY });
  assert.equal(await app.$('unlock')(readFileSync(PASS_FILE, 'utf8').trim(), false), true);
  const sets = norm(app.$('[...new Set(drill().map(i => i.set))]'));
  for (const id of ['S2', 'S3', 'S4', 'S5', 'K1', 'K2']) assert.ok(!sets.includes(id), id);
  assert.ok(sets.includes('S1'));
});
