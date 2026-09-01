import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative as relativePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const srcRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceExtensions = new Set(['.astro', '.svelte']);
const pageHeaderExceptions = new Set([
  'pages/815/compare/settlements/[slug]/index.astro',
]);

const collectSourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) return collectSourceFiles(entryPath);

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });

const appRelativePath = (filePath: string): string =>
  relativePath(srcRoot, filePath).split(sep).join('/');

describe('page title styles', () => {
  it('uses the shared title primitive for visible h1 headings', () => {
    for (const filePath of collectSourceFiles(srcRoot)) {
      const relative = appRelativePath(filePath);
      const source = readFileSync(filePath, 'utf8');

      expect(source, `${relative} uses old inline title scale`).not.toContain(
        'text-4xl font-bold tracking-tight text-foreground',
      );
      expect(source, `${relative} uses oversized lg title scale`).not.toContain(
        'lg:text-[3.5rem]',
      );
      expect(source, `${relative} uses old page header padding`).not.toContain(
        'px-5 pb-6 pt-3',
      );
      expect(
        source,
        `${relative} uses old compact page header padding`,
      ).not.toContain('px-5 pt-3');

      const h1Tags = [...source.matchAll(/<h1\b[\s\S]*?>/gu)].map(
        ([tag]) => tag,
      );

      for (const tag of h1Tags) {
        if (tag.includes('ui-visually-hidden')) continue;

        expect(tag, `${relative} visible h1`).toContain('ui-page-title');
      }

      if (
        source.includes('<Breadcrumbs') &&
        !pageHeaderExceptions.has(relative)
      ) {
        expect(
          source,
          `${relative} breadcrumbs should live in shared header`,
        ).toContain('ui-page-header');
        expect(
          source,
          `${relative} breadcrumbs/title gap should use shared stack`,
        ).toContain('ui-page-header-stack');
      }
    }
  });
});
