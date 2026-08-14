/// <reference types="vitest/config" />

import { getViteConfig } from 'astro/config';

const visualTests = ['tests/**/*.visual.local.spec.ts'];
const domTests = [
  'src/compare/components/**/*.test.ts',
  'src/components/search/tests/**/*.test.ts',
  'src/lib/home/hero.dom.test.ts',
  'src/lib/home/status.dom.test.ts',
  'src/lib/status/timeline.dom.test.ts',
  'src/lib/reglament/calculator-controller.test.ts',
];

export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
          exclude: [...visualTests, ...domTests],
        },
      },
      {
        extends: true,
        resolve: {
          conditions: ['browser', 'default'],
        },
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: domTests,
          exclude: visualTests,
          setupFiles: ['./vitest.dom.setup.ts'],
        },
      },
    ],
  },
});
