import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReviewStore } from './review-store.mjs';
import { reviewHandler } from './review-server.mjs';
import { REVIEW_API, REVIEW_STATUS, REVIEW_TOKEN_HEADER } from './review-contract.mjs';

const page = { pageId: 'pi-loop', path: 'agents/pi/loop.md', title: '一次输入', sourceHash: 'fixed-source-hash' };
const draft = { pageId: page.pageId, sourceHash: page.sourceHash, anchor: '工具循环', quote: '模型选择工具，程序执行动作。', comment: '请补上真实调用顺序。' };
async function withStore(run) {
  const directory = await mkdtemp(join(tmpdir(), 'agent-insight-review-test-'));
  // All timestamps in these tests come from this same deterministic clock.
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 12, 0, 0, tick++)).toISOString();
  try { await run(new ReviewStore(directory, [page], { now }), directory, now); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test('selected Chinese text persists across restart; editing retains its source location', () => withStore(async (store, directory, now) => {
  const original = await store.create(draft);
  const restarted = new ReviewStore(directory, [page], { now });
  assert.deepEqual(await restarted.list(), [original]);
  const updated = await restarted.update(original.id, { comment: '请解释 input hook 的提前结束。', status: REVIEW_STATUS.RESOLVED });
  for (const key of ['id', 'pageId', 'path', 'sourceHash', 'anchor', 'quote', 'createdAt']) assert.equal(updated[key], original[key]);
  assert.notEqual(updated.updatedAt, original.updatedAt);
  assert.equal(updated.status, REVIEW_STATUS.RESOLVED);
}));

test('concurrent saves do not lose annotations', () => withStore(async store => {
  const added = await Promise.all([store.create(draft), store.create({ ...draft, comment: '第二条意见' }), store.create({ ...draft, comment: '第三条意见' })]);
  const loaded = await store.list();
  assert.equal(loaded.length, 3);
  assert.deepEqual(new Set(loaded.map(note => note.id)), new Set(added.map(note => note.id)));
}));

test('invalid inputs and corrupt existing files never overwrite saved reviews', () => withStore(async (store, directory) => {
  const note = await store.create(draft);
  for (const [input, reason] of [
    [{ ...draft, pageId: '../../outside' }, 'unknown_review_page'],
    [{ ...draft, sourceHash: 'old-content' }, 'stale_review_page'],
    [{ ...draft, comment: ' ' }, 'empty_review_comment'],
  ]) await assert.rejects(store.create(input), error => error.reason === reason);
  await assert.rejects(store.update(note.id, { comment: 'partial update', status: 'wrong' }), error => error.reason === 'invalid_review_status');
  assert.deepEqual(await store.list(), [note]);
  const file = join(directory, 'annotations.json');
  await writeFile(file, 'broken existing review');
  await assert.rejects(store.create(draft), error => error.reason === 'invalid_review_store');
  assert.equal(await readFile(file, 'utf8'), 'broken existing review');
}));

test('HTTP review rejects cross-origin and unauthenticated access while saving normal requests', () => withStore(async store => {
  let handler;
  const server = createServer((request, response) => handler(request, response, () => { response.writeHead(404); response.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  handler = reviewHandler(store, { port });
  const base = `http://127.0.0.1:${port}${REVIEW_API}`;
  try {
    const bootstrap = await fetch(base + '/session');
    const session = await bootstrap.json();
    assert.equal(bootstrap.status, 200);
    assert.deepEqual(session.pages, [page]);
    const headers = { [REVIEW_TOKEN_HEADER]: session.token, 'Content-Type': 'application/json' };
    for (const extra of [{ Origin: 'https://outside.invalid' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
      const rejected = await fetch(base + '/annotations', { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(draft) });
      assert.equal(rejected.status, 403);
      assert.equal((await rejected.json()).reason, 'review_origin_rejected');
    }
    // Use a raw HTTP request so the transport does not normalize the Host header.
    const reboundStatus = await new Promise((resolve, reject) => {
      const request = httpRequest(base + '/session', { headers: { Host: `outside.invalid:${port}` } }, response => {
        response.resume(); resolve(response.statusCode);
      });
      request.on('error', reject); request.end();
    });
    assert.equal(reboundStatus, 403);
    assert.equal((await fetch(base + '/annotations')).status, 403);
    const saved = await fetch(base + '/annotations', { method: 'POST', headers, body: JSON.stringify(draft) });
    assert.equal(saved.status, 201);
    const created = (await saved.json()).annotation;
    assert.equal(created.quote, draft.quote);
    const changed = await fetch(base + '/annotations/' + created.id, { method: 'PATCH', headers, body: JSON.stringify({ status: REVIEW_STATUS.RESOLVED }) });
    assert.equal(changed.status, 200);
    const listed = await fetch(base + '/annotations', { headers });
    assert.equal((await listed.json()).annotations[0].status, REVIEW_STATUS.RESOLVED);
  } finally { await new Promise(resolve => server.close(resolve)); }
}));
