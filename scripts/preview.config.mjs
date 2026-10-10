import { defineConfig } from 'vite';

// VitePress 1.6.4 preview ignores --host; bind the built site through Vite.
export default defineConfig({
  root: 'docs',
  appType: 'mpa',
  build: { outDir: '.vitepress/dist' },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true }
});
