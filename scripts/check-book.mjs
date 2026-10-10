import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { markdownFiles, readJSON, readPage } from './book-lib.mjs';

// Validate repository contracts without changing pages or upstream checkouts.
export function checkBook(root) {
  const errors = [];
  const report = (path, reason) => errors.push(`${relative(root, path)}: ${reason}`);
  const catalog = readJSON(resolve(root, 'catalog.json'));
  const registry = readJSON(resolve(root, 'baselines.json'));
  const sources = readJSON(resolve(root, 'migration.json'));
  const contract = readJSON(resolve(root, 'book-contract.json'));
  const files = markdownFiles(resolve(root, 'docs'));
  const pages = new Map();
  const ids = new Map();
  const paths = catalog.flatMap(group => group.items.map(item => item.path));
  if (new Set(paths).size !== paths.length) report(root, 'catalog_duplicate');
  for (const path of paths) if (!existsSync(resolve(root, 'docs', path))) report(root, `catalog_missing: ${path}`);
  for (const path of files) {
    let page;
    try { page = readPage(path); } catch (error) { report(path, `parse_failed: ${error.message}`); continue; }
    const { meta, body } = page;
    pages.set(path, page);
    if (!meta.id || ids.has(meta.id)) report(path, 'id_missing_or_duplicate');
    ids.set(meta.id, path);
    if (!contract.statuses[meta.status]) report(path, 'status_unknown');
    if (!contract.subjects.includes(meta.subject)) report(path, 'subject_unknown');
    for (const key of ['baselines', 'sources', 'depends_on', 'evidence']) if (!Array.isArray(meta[key])) report(path, `${key}_not_array`);
    for (const id of meta.baselines ?? []) if (!registry.baselines[id]) report(path, `baseline_unknown: ${id}`);
    for (const id of meta.sources ?? []) if (!sources.documents.some(doc => doc.id === id)) report(path, `source_unknown: ${id}`);
    if (typeof meta.verified_scope !== 'string' || !meta.verified_scope.trim()) report(path, 'scope_missing');
    for (const value of meta.evidence ?? []) if (!contract.evidence.includes(value)) report(path, `evidence_unknown: ${value}`);
    if (!paths.includes(relative(resolve(root, 'docs'), path))) report(path, 'catalog_unlisted');
    if (/\x1b\[|```mermaid|\/Users\/|\/home\//.test(body)) report(path, 'nonportable_or_forbidden_diagram');
    if (['verified-source', 'frozen-source'].includes(meta.status)) {
      if (!(meta.evidence ?? []).includes('source')) report(path, 'source_evidence_missing');
      if (!meta.baselines?.length) report(path, 'source_baseline_missing');
      for (const id of meta.baselines ?? []) {
        const baseline = registry.baselines[id];
        if (baseline && !baseline.sha) report(path, `source_sha_missing: ${id}`);
        if (baseline?.sha && !body.includes(`/blob/${baseline.sha}/`) && !body.includes(`/commit/${baseline.sha}`)) report(path, `pinned_evidence_missing: ${id}`);
      }
    }
    const withoutCode = body.replace(/```[\s\S]*?```/g, '');
    for (const match of withoutCode.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const bare = decodeURIComponent(href.split('#')[0].split('?')[0]);
      let target = href.startsWith('/') ? resolve(root, 'docs', bare.slice(1)) : resolve(dirname(path), bare);
      if (!existsSync(target) && !existsSync(`${target}.md`)) report(path, `link_missing: ${href}`);
    }
  }
  for (const [path, page] of pages) for (const id of page.meta.depends_on ?? []) if (!ids.has(id)) report(path, `dependency_unknown: ${id}`);
  for (const doc of sources.documents) {
    if ('url' in doc || 'token' in doc) report(root, `source_locator_forbidden: ${doc.id}`);
    if (!doc.targets?.length) report(root, `migration_target_missing: ${doc.id}`);
    for (const id of doc.targets ?? []) if (!ids.has(id)) report(root, `migration_target_unknown: ${id}`);
    const archive = doc.archive;
    if (!archive || typeof archive.path !== 'string') { report(root, `archive_missing: ${doc.id}`); continue; }
    const path = resolve(root, archive.path);
    if (!archive.path.startsWith('archive/') || !archive.path.endsWith('.md') || relative(resolve(root, 'archive'), path).startsWith('..')) {
      report(root, `archive_path_invalid: ${doc.id}`); continue;
    }
    if (!/^[a-f0-9]{64}$/.test(archive.sha256) || !Number.isInteger(archive.bytes) || archive.bytes <= 0) report(path, `archive_metadata_invalid: ${doc.id}`);
    if (archive.state === 'retained') {
      if (!existsSync(path)) { report(path, `archive_missing: ${doc.id}`); continue; }
      const payload = readFileSync(path);
      if (payload.length !== archive.bytes) report(path, `archive_size_mismatch: ${doc.id}`);
      if (createHash('sha256').update(payload).digest('hex') !== archive.sha256) report(path, `archive_hash_mismatch: ${doc.id}`);
    } else if (archive.state === 'removed') {
      const coverage = Array.isArray(doc.coverage) ? doc.coverage : [];
      const complete = (doc.targets ?? []).every(id => coverage.some(item => item && item.target === id && typeof item.scope === 'string' && item.scope.trim()));
      const referenced = [...pages.values()].some(page => page.meta.sources?.includes(doc.id));
      if (doc.migration_status !== 'digested' || !complete || referenced) report(path, `archive_still_required: ${doc.id}`);
      if (existsSync(path)) report(path, `archive_removed_but_present: ${doc.id}`);
    } else report(path, `archive_state_unknown: ${doc.id}`);
  }
  for (const [id, baseline] of Object.entries(registry.baselines)) {
    if (baseline.sha !== null && !/^[a-f0-9]{40}$/.test(baseline.sha)) report(root, `sha_invalid: ${id}`);
    if (!registry.repos[baseline.repo] && baseline.repo !== null) report(root, `repo_unknown: ${id}`);
  }
  return { errors, count: files.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const { errors, count } = checkBook(root);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`book_ok: ${count} pages; metadata, references, migration targets and pinned evidence checked`);
}
