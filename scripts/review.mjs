import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build } from 'vitepress';
import { preview } from 'vite';
import { checkBook } from './check-book.mjs';
import { reviewPages, ReviewStore } from './review-store.mjs';
import { localReviewPlugin } from './review-server.mjs';

// This separate output never replaces the public book's dist directory.
const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'docs/.vitepress/review-dist');
const checked = checkBook(root);
if (checked.errors.length) throw new Error('book_check_failed: ' + checked.errors.join('\n'));
process.env.AGENT_INSIGHT_REVIEW = '1';
await build(join(root, 'docs'), { outDir });
if (!process.argv.includes('--build-only')) {
  const store = new ReviewStore(join(root, '.review'), reviewPages(root));
  // Validate existing notes before claiming that the review service is ready.
  await store.list();
  const server = await preview({
    configFile: false, root: join(root, 'docs'), appType: 'mpa',
    build: { outDir }, preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    plugins: [localReviewPlugin(store)],
  });
  server.printUrls();
  console.log('local_review_ready: .review/annotations.json');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.httpServer.close(() => process.exit(0));
  });
}
