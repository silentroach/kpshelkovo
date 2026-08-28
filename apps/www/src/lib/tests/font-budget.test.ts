import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative as relativePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from 'fontkitten';
import { describe, expect, it } from 'vitest';

const appSrcRoot = fileURLToPath(new URL('../../', import.meta.url));
const appTestsRoot = fileURLToPath(new URL('../../../tests/', import.meta.url));
const workspaceRoot = fileURLToPath(
  new URL('../../../../../', import.meta.url),
);
const uiRoot = join(workspaceRoot, 'packages/ui');
const fontsRoot = join(uiRoot, 'fonts');
const sourceExtensions = new Set(['.astro', '.css', '.svelte']);
const ignoredSourceDirectories = new Set(['.astro', 'dist', 'node_modules']);
const allowedCssWeights = new Set(['400', '600', '700', 'inherit']);
const disallowedWeightClassPattern =
  /\bfont-(?:thin|extralight|light|medium|bold|extrabold|black)\b/gu;
const arbitraryWeightClassPattern = /\bfont-\[(\d+)\]/gu;
const cssWeightPattern = /font-weight:\s*([^;]+);/gu;
const requiredSharedCharacters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÀéÖßАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя́ «»‹›“”„‘’‚–—…†‡•‰€₽№™⁄−±×÷';
const requiredFiraSansCharacters = `${requiredSharedCharacters}←↑→↓`;

const collectSourceFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredSourceDirectories.has(entry.name)
        ? []
        : collectSourceFiles(entryPath);
    }

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
    const file = block?.match(/fonts\/([^')]+\.woff2)/u)?.[1];

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

const inspectFontAsset = (file: string) => {
  const filePath = join(fontsRoot, file);
  const font = create(readFileSync(filePath));

  if (font.isCollection) {
    throw new Error(`${file} must be a single WOFF2 font`);
  }

  const requiredCharacters = file.startsWith('fira-sans')
    ? requiredFiraSansCharacters
    : requiredSharedCharacters;

  return {
    bytes: statSync(filePath).size,
    file,
    fontFamily: font.familyName,
    fullName: font.fullName,
    missingGlyphs: [...requiredCharacters]
      .filter(
        (character) => !font.hasGlyphForCodePoint(character.codePointAt(0)!),
      )
      .join(''),
    postscriptName: font.postscriptName,
  };
};

describe('font budget', () => {
  it('keeps production faces and source weights within the shared budget', () => {
    const stylesPath = join(uiRoot, 'styles.css');
    const standaloneStylesPath = join(uiRoot, 'standalone-error.css');
    const preloadsPath = join(uiRoot, 'src/FontPreloads.astro');
    const sourceFiles = [
      ...collectSourceFiles(appSrcRoot),
      ...collectSourceFiles(appTestsRoot),
      ...collectSourceFiles(join(uiRoot, 'src')),
      stylesPath,
      standaloneStylesPath,
    ];
    const preloads = [
      ...readFileSync(preloadsPath, 'utf8').matchAll(
        /fonts\/([^']+\.woff2)'/gu,
      ),
    ].map(([, file]) => file);
    const fontAssets = readdirSync(fontsRoot)
      .filter((file) => extname(file) === '.woff2')
      .sort()
      .map(inspectFontAsset);
    const totalFontBytes = fontAssets.reduce(
      (total, font) => total + font.bytes,
      0,
    );

    expect(totalFontBytes).toBeLessThanOrEqual(100 * 1024);

    expect({
      fontAssets,
      fontFaces: extractFontFaces(readFileSync(stylesPath, 'utf8')),
      preloads,
      standaloneFontFaces: extractFontFaces(
        readFileSync(standaloneStylesPath, 'utf8'),
      ),
      totalFontBytes,
      violations: sourceFiles.flatMap(findWeightViolations),
    }).toMatchInlineSnapshot(`
      {
        "fontAssets": [
          {
            "bytes": 27352,
            "file": "fira-sans-400-normal.woff2",
            "fontFamily": "Fira Sans",
            "fullName": "Fira Sans Regular",
            "missingGlyphs": "",
            "postscriptName": "FiraSans-Regular",
          },
          {
            "bytes": 28824,
            "file": "fira-sans-600-normal.woff2",
            "fontFamily": "Fira Sans SemiBold",
            "fullName": "Fira Sans SemiBold",
            "missingGlyphs": "",
            "postscriptName": "FiraSans-SemiBold",
          },
          {
            "bytes": 41168,
            "file": "shelkovo-serif-700-normal.woff2",
            "fontFamily": "Shelkovo Serif",
            "fullName": "Shelkovo Serif Bold",
            "missingGlyphs": "",
            "postscriptName": "ShelkovoSerif-Bold",
          },
        ],
        "fontFaces": [
          "Shelkovo Serif 700: shelkovo-serif-700-normal.woff2",
          "Fira Sans 400: fira-sans-400-normal.woff2",
          "Fira Sans 600: fira-sans-600-normal.woff2",
        ],
        "preloads": [
          "fira-sans-400-normal.woff2",
          "fira-sans-600-normal.woff2",
          "shelkovo-serif-700-normal.woff2",
        ],
        "standaloneFontFaces": [
          "Shelkovo Serif 700: shelkovo-serif-700-normal.woff2",
          "Fira Sans 600: fira-sans-600-normal.woff2",
        ],
        "totalFontBytes": 97344,
        "violations": [],
      }
    `);
  });
});
