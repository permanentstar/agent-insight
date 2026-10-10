import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
export function markdownFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.')) return [];
    const path = join(root, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}
export function readPage(path) {
  const text = readFileSync(path, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) throw new Error('frontmatter_missing');
  return { meta: parse(match[1]), body: text.slice(match[0].length) };
}
