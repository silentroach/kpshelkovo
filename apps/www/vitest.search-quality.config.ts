import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/search-quality.test.ts'],
    hookTimeout: 30_000,
    testTimeout: 120_000,
  },
});
