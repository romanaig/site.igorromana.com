// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://igorromana.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
});
