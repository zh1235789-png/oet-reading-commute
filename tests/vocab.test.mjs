// 語彙リストの健全性。
// 本文に無い語を載せると「本文で確認できない語を覚える」ことになるので、
// 全220問について「語数がある・重複が無い・その問題の英文に実在する」を固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './harness.mjs';

const app = loadApp({ today: '2026-10-07T09:00:00+09:00' });
const SETS = app.$('SETS');

// 語形変化を許すゆるい照合（build/checkvocab.py と同じ考え方）
const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
function stem(w) {
  w = w.replace(/[^a-z0-9-]/g, '');
  for (const suf of ['ingly', 'ing', 'edly', 'ed', 'ies', 'es', 's', 'ly', 'e', 'y']) {
    if (w.length > suf.length + 3 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}
const SKIP = new Set(['a', 'an', 'the', 'to', 'of', 'and', 'be', 'with', 'for', 'on', 'in', 'their', 'your', 'as']);
function contains(phrase, text) {
  if (text.includes(norm(phrase))) return true;
  const pool = new Set((text.match(/[a-z0-9-]+/g) || []).map(stem));
  return norm(phrase).split(/\s+/).filter((t) => !SKIP.has(t)).map(stem).every((t) => !t || pool.has(t));
}

const items = [];
for (const s of SETS) {
  for (const b of s.B) items.push({ id: `Set${s.id} B${b.n}`, voc: b.voc, text: norm([b.title, ...b.paras, b.q, ...b.opts].join(' ')) });
  for (const c of s.C) items.push({ id: `Set${s.id} C${c.n}`, voc: c.voc, text: norm([s.texts[c.t].paras[c.p], c.q, ...c.opts].join(' ')) });
}

test('全220問に語彙リストがある', () => {
  assert.equal(items.length, 220);
  const empty = items.filter((i) => !Array.isArray(i.voc) || i.voc.length === 0);
  assert.deepEqual(empty.map((i) => i.id), []);
});

test('語彙は「語」と「日本語訳」の組で、どちらも空でない', () => {
  const bad = [];
  for (const it of items) for (const e of it.voc) {
    if (!Array.isArray(e) || e.length !== 2 || !String(e[0]).trim() || !String(e[1]).trim()) bad.push(`${it.id}: ${JSON.stringify(e)}`);
  }
  assert.deepEqual(bad, []);
});

test('同じ問題の中で語が重複しない', () => {
  const dup = [];
  for (const it of items) {
    const ws = it.voc.map((e) => norm(e[0]));
    if (new Set(ws).size !== ws.length) dup.push(it.id);
  }
  assert.deepEqual(dup, []);
});

test('語彙はすべてその問題の英文（本文・設問・選択肢）に出てくる', () => {
  const missing = [];
  for (const it of items) for (const [w] of it.voc) if (!contains(w, it.text)) missing.push(`${it.id}: ${w}`);
  assert.deepEqual(missing, []);
});

test('日本語訳に英語だけの行が紛れていない', () => {
  const bad = [];
  for (const it of items) for (const [w, ja] of it.voc) {
    if (!/[ぁ-んァ-ヶ一-龠]/.test(ja)) bad.push(`${it.id}: ${w} → ${ja}`);
  }
  assert.deepEqual(bad, []);
});
