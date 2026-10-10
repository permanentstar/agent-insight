import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkBook } from './check-book.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
// Rejected fixtures exercise governance failures that a successful build alone misses.
const cases = [
  ['unknown baseline', 'docs/agents/pi/architecture.md', text => text.replace('pi-20261009', 'unknown-baseline'), 'baseline_unknown'],
  ['missing provenance', 'docs/agents/pi/architecture.md', text => text.replace('evidence: ["source"]', 'evidence: []'), 'source_evidence_missing'],
  ['false latest evidence', 'docs/agents/pi/architecture.md', text => text.replaceAll('/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/', '/blob/main/'), 'pinned_evidence_missing'],
  ['missing dependent conclusion', 'docs/agents/pi/loop.md', text => text.replace('pi-architecture', 'missing-conclusion'), 'dependency_unknown'],
  ['broken chapter link', 'docs/index.md', text => text.replace('guide/map.md', 'guide/missing.md'), 'link_missing'],
  ['machine path', 'docs/index.md', text => text + '\n本机路径 /Users/example/source\n', 'nonportable_or_forbidden_diagram'],
];
test('book contracts accept the actual registered corpus', () => assert.deepEqual(checkBook(root).errors, []));
for (const [name, file, mutate, reason] of cases) test(`rejects ${name}`, () => {
  const scratch = mkdtempSync(join(tmpdir(), 'agent-insight-contract-'));
  try {
    for (const path of ['docs', 'catalog.json', 'baselines.json', 'migration.json', 'book-contract.json']) {
      cpSync(join(root, path), join(scratch, path), { recursive: true, filter: path => !path.includes('/.vitepress/') });
    }
    const target = join(scratch, file);
    writeFileSync(target, mutate(readFileSync(target, 'utf8')));
    assert.ok(checkBook(scratch).errors.some(error => error.includes(reason)), reason);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
