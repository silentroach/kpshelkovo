import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative as relativePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const appSrcRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const uiRoot = join(workspaceRoot, 'packages/ui');
const sourceExtensions = new Set(['.astro', '.css', '.svelte']);
const allowedCssWeights = new Set(['400', '600', '700', 'inherit']);
const disallowedWeightClassPattern =
  /\bfont-(?:thin|extralight|light|medium|bold|extrabold|black)\b/gu;
const arbitraryWeightClassPattern = /\bfont-\[(\d+)\]/gu;
const cssWeightPattern = /font-weight:\s*([^;]+);/gu;

const collectSourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) return collectSourceFiles(entryPath);

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });

const workspaceRelativePath = (filePath: string): string =>
  relativePath(workspaceRoot, filePath).split(sep).join('/');

const lineAt = (source: string, index: number): number =>
  source.slice(0, index).split('\n').length;

const extractFontFaces = (source: string): readonly string[] =>
  [...source.matchAll(/@font-face\s*\{([\s\S]*?)\}/gu)].map(([, block]) => {
    const family = block?.match(/font-family:\s*'([^']+)'/u)?.[1];
    const weight = block?.match(/font-weight:\s*(\d+)/u)?.[1];
    const file = block?.match(/files\/([^')]+\.woff2)/u)?.[1];

    return `${family} ${weight}: ${file}`;
  });

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
      violations.push(
        `${relative}:${lineAt(source, match.index)} font-weight: ${weight}`,
      );
    }
  }

  return violations;
};

describe('font budget', () => {
  it('keeps production faces and source weights within the shared budget', () => {
    const stylesPath = join(uiRoot, 'styles.css');
    const standaloneStylesPath = join(uiRoot, 'standalone-error.css');
    const preloadsPath = join(uiRoot, 'src/FontPreloads.astro');
    const sourceFiles = [
      ...collectSourceFiles(appSrcRoot),
      ...collectSourceFiles(join(uiRoot, 'src')),
      stylesPath,
      standaloneStylesPath,
    ];
    const preloads = [
      ...readFileSync(preloadsPath, 'utf8').matchAll(
        /files\/([^']+\.woff2)'/gu,
      ),
    ].map(([, file]) => file);

    expect({
      fontFaces: extractFontFaces(readFileSync(stylesPath, 'utf8')),
      preloads,
      standaloneFontFaces: extractFontFaces(
        readFileSync(standaloneStylesPath, 'utf8'),
      ),
      violations: sourceFiles.flatMap(findWeightViolations),
    }).toMatchInlineSnapshot(`
      {
        "fontFaces": [
          "PT Serif 700: pt-serif-cyrillic-700-normal.woff2",
          "PT Serif 700: pt-serif-latin-ext-700-normal.woff2",
          "PT Serif 700: pt-serif-latin-700-normal.woff2",
          "Fira Sans 400: fira-sans-cyrillic-400-normal.woff2",
          "Fira Sans 400: fira-sans-latin-ext-400-normal.woff2",
          "Fira Sans 400: fira-sans-latin-400-normal.woff2",
          "Fira Sans 600: fira-sans-cyrillic-600-normal.woff2",
          "Fira Sans 600: fira-sans-latin-ext-600-normal.woff2",
          "Fira Sans 600: fira-sans-latin-600-normal.woff2",
        ],
        "preloads": [
          "fira-sans-cyrillic-400-normal.woff2",
          "fira-sans-cyrillic-600-normal.woff2",
          "pt-serif-cyrillic-700-normal.woff2",
        ],
        "standaloneFontFaces": [
          "PT Serif 700: pt-serif-cyrillic-700-normal.woff2",
          "Fira Sans 600: fira-sans-cyrillic-600-normal.woff2",
        ],
        "violations": [],
      }
    `);
  });
});
