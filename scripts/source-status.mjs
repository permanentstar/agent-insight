import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { markdownFiles, readJSON, readPage } from './book-lib.mjs';

// Resolve machine-local locations separately from portable research baselines.
const bookRoot = fileURLToPath(new URL('..', import.meta.url));
const registry = readJSON(resolve(bookRoot, 'baselines.json'));
const local = existsSync(resolve(bookRoot, '.source-map.json')) ? readJSON(resolve(bookRoot, '.source-map.json')) : {};
const rootIndex = process.argv.indexOf('--root');
const sourceRoot = rootIndex >= 0 ? process.argv[rootIndex + 1] : process.env.AGENT_SOURCE_ROOT;
if (rootIndex >= 0 && !sourceRoot) throw new Error('source_root_argument_missing');
const pages = markdownFiles(resolve(bookRoot, 'docs')).map(path => readPage(path).meta);
let failed = false;
for (const [id, repo] of Object.entries(registry.repos)) {
  const baseline = Object.entries(registry.baselines).find(([, b]) => b.repo === id && b.role === 'current');
  const path = local[id] ?? (sourceRoot ? resolve(sourceRoot, repo.local_dir) : null);
  if (!path || !existsSync(path)) { console.log(`${id}: source_missing; configure AGENT_SOURCE_ROOT or .source-map.json`); failed = true; continue; }
  try {
    const git = (...args) => execFileSync('git', ['-C', path, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const head = git('rev-parse', 'HEAD');
    let upstream;
    try { upstream = git('rev-parse', `origin/${repo.branch}`); } catch { upstream = 'ref_missing'; }
    const dirty = git('status', '--porcelain').split('\n').filter(Boolean).length;
    const state = head === baseline[1].sha ? 'baseline_match' : 'checkout_differs';
    const affected = pages.filter(p => p.baselines.includes(baseline[0])).map(p => p.id);
    console.log(`${id}: ${state}; HEAD=${head}; cached_origin=${upstream}; wip=${dirty}; pages=${affected.join(',')}`);
    if (head !== baseline[1].sha || upstream !== baseline[1].sha) failed = true;
  } catch (error) { console.log(`${id}: git_read_failed; ${error.message.split('\n')[0]}`); failed = true; }
}
console.log('read_only: no fetch, merge or baseline changes; cached_origin is not a live remote check');
process.exitCode = failed ? 1 : 0;
