// @ts-check
import { defineConfig } from 'astro/config';
import { externalLinks, funFactSection } from './src/lib/rehype-plugins.mjs';

export default defineConfig({
  output: 'static',
  markdown: {
    rehypePlugins: [externalLinks, funFactSection],
  },
});
