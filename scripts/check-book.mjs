import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    if (!doc.targets?.length) report(root, `migration_target_missing: ${doc.id}`);
    for (const id of doc.targets ?? []) if (!ids.has(id)) report(root, `migration_target_unknown: ${id}`);
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
