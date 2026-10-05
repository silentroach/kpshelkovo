import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative as relativePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mediaFonts, wwwFonts } from '@shelkovo/ui/fonts';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const appSrcRoot = fileURLToPath(new URL('../../', import.meta.url));
const appTestsRoot = fileURLToPath(new URL('../../../tests/', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const uiRoot = join(workspaceRoot, 'packages/ui');
const sourceExtensions = new Set(['.astro', '.css', '.svelte']);
const ignoredSourceDirectories = new Set(['.astro', 'dist', 'node_modules']);
const allowedCssWeights = new Set(['400', '600', '700', 'inherit']);
const disallowedWeightClassPattern =
  /\bfont-(?:thin|extralight|light|medium|bold|extrabold|black)\b/gu;
const arbitraryWeightClassPattern = /\bfont-\[(\d+)\]/gu;
const cssWeightPattern = /font-weight:\s*([^;]+);/gu;
const fontPolicySchema = z.object({
  provider: z.object({ name: z.literal('local') }),
  styles: z.tuple([z.literal('normal')]),
  formats: z.tuple([z.literal('woff2')]),
  display: z.literal('swap')
});

const collectSourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredSourceDirectories.has(entry.name) ? [] : collectSourceFiles(entryPath);
    }

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });

const workspaceRelativePath = (filePath: string): string =>
  relativePath(workspaceRoot, filePath).split(sep).join('/');

const lineAt = (source: string, index: number): number => source.slice(0, index).split('\n').length;

const findWeightViolations = (filePath: string): readonly string[] => {
  const source = readFileSync(filePath, 'utf8');
  const relative = workspaceRelativePath(filePath);
  const violations: string[] = [];

  for (const match of source.matchAll(disallowedWeightClassPattern)) {
    violations.push(`${relative}:${lineAt(source, match.index)} ${match[0]}`);
  }
  for (const match of source.matchAll(arbitraryWeightClassPattern)) {
    violations.push(`${relative}:${lineAt(source, match.index)} ${match[0]}`);
  }
  for (const match of source.matchAll(cssWeightPattern)) {
    const weight = match[1]?.trim();

    if (weight && !allowedCssWeights.has(weight)) {
      violations.push(`${relative}:${lineAt(source, match.index)} font-weight: ${weight}`);
    }
  }

  return violations;
};

describe('font budget', () => {
  it('keeps shared font definitions within the budget without resolving providers', () => {
    for (const font of [...wwwFonts, ...mediaFonts]) {
      fontPolicySchema.parse(font);
    }

    expect(
      [wwwFonts, mediaFonts].map((fonts) =>
        fonts.map(
          (font) =>
            `${font.name}: ${font.weights.join('/')} ${font.subsets.join('/')} (${font.cssVariable}; ${font.fallbacks.join(', ')})`
        )
      )
    ).toMatchInlineSnapshot(`
      [
        [
          "Fira Sans: 400/600 latin/cyrillic/latin-ext (--font-fira-sans; system-ui)",
          "PT Serif: 700 latin/cyrillic/latin-ext (--font-pt-serif; Georgia, serif)",
        ],
        [
          "Fira Sans: 600 cyrillic (--font-fira-sans; system-ui)",
          "PT Serif: 700 cyrillic (--font-pt-serif; Georgia, serif)",
        ],
      ]
    `);
  });

  it('supplies a readable WOFF2 and unicode range for every required variant', () => {
    for (const font of [...wwwFonts, ...mediaFonts]) {
      expect(font.options.variants).toHaveLength(
        font.subsets.length * font.styles.length * font.weights.length
      );
      for (const subset of font.subsets) {
        for (const weight of font.weights) {
          const variant = font.options.variants.find(
            (item) =>
              item.weight === weight && item.src[0].endsWith(`-${subset}-${weight}-normal.woff2`)
          );
          expect(variant, `${font.name} ${subset} ${weight}`).toBeDefined();
          if (!variant) continue;
          expect(readFileSync(variant.src[0]).subarray(0, 4).toString()).toBe('wOF2');
          const ranges = variant.unicodeRange.join(',');
          expect(ranges).toContain(
            subset === 'cyrillic'
              ? 'U+0400-045F'
              : subset === 'latin'
                ? 'U+0000-00FF'
                : 'U+0100-02BA'
          );
        }
      }
    }
  });

  it('keeps source weights within the shared budget', () => {
    const sourceFiles = [
      ...collectSourceFiles(appSrcRoot),
      ...collectSourceFiles(appTestsRoot),
      ...collectSourceFiles(join(uiRoot, 'src')),
      join(uiRoot, 'standalone-error.css')
    ];

    expect(sourceFiles.flatMap(findWeightViolations)).toEqual([]);
  });
});
