import { defineConfig } from 'oxfmt';

export default defineConfig({
  singleQuote: true,
  svelte: true,
  ignorePatterns: ['node_modules', 'dist', '.astro', 'pnpm-lock.yaml', '*.astro'],
});
