import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkBook } from './check-book.mjs';
import { markdownFiles } from './book-lib.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
function withBookFixture(run) {
  const scratch = mkdtempSync(join(tmpdir(), 'agent-insight-contract-'));
  try {
    for (const path of ['docs', 'archive', 'catalog.json', 'baselines.json', 'migration.json', 'book-contract.json']) {
      cpSync(join(root, path), join(scratch, path), { recursive: true, filter: path => !path.includes('/.vitepress/') });
    }
    run(scratch);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
// Rejected fixtures exercise governance failures that a successful build alone misses.
const cases = [
  ['unknown baseline', 'docs/agents/pi/architecture.md', text => text.replace('pi-20261009', 'unknown-baseline'), 'baseline_unknown'],
  ['missing provenance', 'docs/agents/pi/architecture.md', text => text.replace('evidence: ["source"]', 'evidence: []'), 'source_evidence_missing'],
  ['false latest evidence', 'docs/agents/pi/architecture.md', text => text.replaceAll('/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/', '/blob/main/'), 'pinned_evidence_missing'],
  ['missing dependent conclusion', 'docs/agents/pi/loop.md', text => text.replace('pi-architecture', 'missing-conclusion'), 'dependency_unknown'],
  ['broken chapter link', 'docs/index.md', text => text.replace('guide/map.md', 'guide/missing.md'), 'link_missing'],
  ['machine path', 'docs/index.md', text => text + '\n本机路径 /Users/example/source\n', 'nonportable_or_forbidden_diagram'],
  ['process report in a reader chapter', 'docs/index.md', text => text + '\n## 旧文归并与取舍\n\n资料整理说明。\n', 'process_report_in_book'],
  ['maintainer content in book navigation', 'catalog.json', text => {
    const catalog = JSON.parse(text);
    catalog[0].items.push({ title: '维护记录', path: '../README.md' });
    return JSON.stringify(catalog);
  }, 'catalog_nonreader_path'],
  ['changed historical original', 'archive/pi-session.md', text => text + '\nChanged original\n', 'archive_hash_mismatch'],
  ['archive path outside archive', 'migration.json', text => {
    const registry = JSON.parse(text);
    registry.documents[0].archive.path = 'archive/../README.md';
    return JSON.stringify(registry);
  }, 'archive_path_invalid'],
  ['removal before digestion', 'migration.json', text => {
    const registry = JSON.parse(text);
    registry.documents[0].archive.state = 'removed';
    return JSON.stringify(registry);
  }, 'archive_still_required'],
  ['online source locator', 'migration.json', text => {
    const registry = JSON.parse(text);
    registry.documents[0].url = 'https://example.invalid/doc/original';
    return JSON.stringify(registry);
  }, 'source_locator_forbidden'],
];
test('book contracts accept the actual registered corpus', () => assert.deepEqual(checkBook(root).errors, []));
for (const [name, file, mutate, reason] of cases) test(`rejects ${name}`, () => {
  withBookFixture(scratch => {
    const target = join(scratch, file);
    writeFileSync(target, mutate(readFileSync(target, 'utf8')));
    assert.ok(checkBook(scratch).errors.some(error => error.includes(reason)), reason);
  });
});

test('rejects a missing retained original', () => withBookFixture(scratch => {
  rmSync(join(scratch, 'archive/pi-session.md'));
  assert.ok(checkBook(scratch).errors.some(error => error.includes('archive_missing')));
}));

test('requires references to be cleared before removing a digested original', () => withBookFixture(scratch => {
  const registryPath = join(scratch, 'migration.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const doc = registry.documents[0];
  doc.migration_status = 'digested';
  doc.coverage = doc.targets.map(target => ({ target, scope: '已登记覆盖范围' }));
  doc.archive.state = 'removed';
  rmSync(join(scratch, doc.archive.path));
  writeFileSync(registryPath, JSON.stringify(registry));
  assert.ok(checkBook(scratch).errors.some(error => error.includes('archive_still_required')));
  for (const path of markdownFiles(join(scratch, 'docs'))) {
    const text = readFileSync(path, 'utf8').replace(/^sources: (.+)$/m, (_, value) => 'sources: ' + JSON.stringify(JSON.parse(value).filter(id => id !== doc.id)));
    writeFileSync(path, text);
  }
  assert.deepEqual(checkBook(scratch).errors, []);
}));
