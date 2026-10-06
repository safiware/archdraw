// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output for Vercel. Nothing is inlined: the CSP in vercel.json allows only 'self',
// so every script and stylesheet ships as its own file.
export default defineConfig({
  site: 'https://archdraw.dev',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'never' },
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
