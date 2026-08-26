import { access, writeFile } from 'node:fs/promises';

import type { AstroIntegration } from 'astro';

export const indexNowUrlManifest = (
  urls: ReadonlySet<string>,
): AstroIntegration => ({
  name: 'indexnow-url-manifest',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await access(new URL('sitemap-index.xml', dir));

      if (urls.size === 0) {
        throw new Error('IndexNow URL manifest must not be empty');
      }

      // Keep the deploy-only manifest outside the public site artifact.
      await writeFile(
        new URL('../indexnow-urls.json', dir),
        JSON.stringify([...urls].sort()),
        'utf8',
      );
    },
  },
});
