import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));

// The CLI is exercised with isolated Git data; source checkouts remain untouched.
function withFixture(run) {
  const scratch = mkdtempSync(join(tmpdir(), 'agent-insight-source-status-'));
  try {
    const book = join(scratch, 'book');
    const source = join(scratch, 'source');
    mkdirSync(join(book, 'scripts'), { recursive: true });
    mkdirSync(join(book, 'docs'));
    mkdirSync(source);
    for (const name of ['source-status.mjs', 'book-lib.mjs']) {
      cpSync(join(project, 'scripts', name), join(book, 'scripts', name));
    }
    writeFileSync(join(book, 'package.json'), '{"type":"module"}');
    symlinkSync(join(project, 'node_modules'), join(book, 'node_modules'));
    const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-b', 'main');
    writeFileSync(join(source, 'content'), 'first');
    git('add', 'content');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'first');
    const earlier = git('rev-parse', 'HEAD');
    writeFileSync(join(source, 'content'), 'second');
    git('add', 'content');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'second');
    const head = git('rev-parse', 'HEAD');
    git('update-ref', 'refs/remotes/origin/main', head);
    function check({ policy, role, sha }) {
      writeFileSync(join(book, 'baselines.json'), JSON.stringify({
        repos: { sample: { branch: 'main', local_dir: 'source', ...(policy ? { update_policy: policy } : {}) } },
        baselines: { baseline: { repo: 'sample', role, sha } },
      }));
      return spawnSync(process.execPath, [join(book, 'scripts/source-status.mjs'), '--root', scratch], { encoding: 'utf8' });
    }
    run({ check, earlier, head });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

test('current sources still require the registered checkout and cached origin', () => {
  withFixture(({ check, earlier, head }) => {
    assert.equal(check({ role: 'current', sha: head }).status, 0);
    const drift = check({ role: 'current', sha: earlier });
    assert.equal(drift.status, 1);
    assert.match(drift.stdout, /checkout_differs/);
  });
});

test('a missing current baseline cannot silently become a frozen source', () => {
  withFixture(({ check, earlier }) => {
    const result = check({ role: 'historical', sha: earlier });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /source_current_baseline_missing/);
    assert.doesNotMatch(result.stdout, /frozen_source_available/);
  });
});

test('explicit frozen sources accept the fixed commit while HEAD and origin advance', () => {
  withFixture(({ check, earlier }) => {
    const result = check({ policy: 'frozen', role: 'historical', sha: earlier });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /frozen_source_available/);
  });
});

test('a missing frozen commit is a failure', () => {
  withFixture(({ check }) => {
    const result = check({ policy: 'frozen', role: 'historical', sha: '0'.repeat(40) });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /git_read_failed/);
  });
});
