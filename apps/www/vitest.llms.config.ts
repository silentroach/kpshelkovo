import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/llms-delivery.test.ts'],
    testTimeout: 30_000
  }
});
