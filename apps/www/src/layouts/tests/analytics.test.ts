/// <reference types="astro/client" />

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

const analytics = vi.hoisted(() => ({ metrika: { enabled: false, id: 108975391 } }));
vi.mock('@/config/analytics', () => ({ analytics }));

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import BaseLayout from '../BaseLayout.astro';

afterEach(() => vi.unstubAllEnvs());

describe('build-time analytics', () => {
  it.each([
    { enabled: false, prod: true, override: 'false', expected: false },
    { enabled: true, prod: true, override: 'false', expected: true },
    { enabled: true, prod: true, override: 'true', expected: false },
    { enabled: true, prod: false, override: 'false', expected: false }
  ])(
    'renders counter and pixel for $enabled / production $prod / override $override',
    async ({ enabled, prod, override, expected }) => {
      analytics.metrika.enabled = enabled;
      vi.stubEnv('PROD', prod);
      vi.stubEnv('LIGHTHOUSE_DISABLE_ANALYTICS', override);
      const container = await createAstroContainer();
      const html = await container.renderToString(BaseLayout, {
        request: new Request('https://example.com/news/')
      });

      expect(html.includes('data-site-metrika-id="108975391"')).toBe(expected);
      expect(html.includes('https://mc.yandex.ru/watch/108975391')).toBe(expected);
    }
  );
});
