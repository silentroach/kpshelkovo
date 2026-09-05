import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

const routeStylesheetInlineLimit = 16 * 1024;
const controlRouteHtmlPaths = [
  'index.html',
  'news/index.html',
  'status/index.html',
  '815/compare/index.html',
  '815/compare/rating/index.html',
  '815/regulation/index.html',
] as const;
const linkPattern = /<link\b[^>]*>/giu;
const scriptPattern = /<script\b[^>]*>/giu;
const attributePattern = /\b([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/giu;

const tagAttributes = (tag: string): ReadonlyMap<string, string> =>
  new Map(
    [...tag.matchAll(attributePattern)].map((match) => [
      match[1]?.toLowerCase() ?? '',
      match[2] ?? match[3] ?? '',
    ]),
  );

const externalStylesheetCount = (html: string): number =>
  [...html.matchAll(linkPattern)].filter(([link]) =>
    (tagAttributes(link).get('rel')?.split(/\s+/u) ?? []).includes(
      'stylesheet',
    ),
  ).length;

const hasExternalProjectRuntime = (html: string): boolean =>
  [...html.matchAll(scriptPattern)].some(([script]) => {
    const attributes = tagAttributes(script);

    return (
      attributes.get('type') === 'module' &&
      attributes
        .get('src')
        ?.includes('BaseLayout.astro_astro_type_script_index_0_lang.')
    );
  });

export const shouldInlineBuildAsset = (
  filePath: string,
  content: Buffer,
): boolean =>
  filePath.endsWith('.css') && content.byteLength < routeStylesheetInlineLimit;

export const validateControlRouteAssetDelivery = async (
  dir: URL,
): Promise<void> => {
  const outputDirectory = fileURLToPath(dir);
  const failures: string[] = [];

  for (const htmlPath of controlRouteHtmlPaths) {
    const html = await readFile(resolve(outputDirectory, htmlPath), 'utf8');
    const stylesheetCount = externalStylesheetCount(html);

    if (stylesheetCount > 1) {
      failures.push(
        `${htmlPath} -> expected at most one external stylesheet, found ${stylesheetCount}`,
      );
    }

    if (!hasExternalProjectRuntime(html)) {
      failures.push(`${htmlPath} -> project runtime is not an external module`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Invalid control-route asset delivery:\n${failures
        .map((item) => `- ${item}`)
        .join('\n')}`,
    );
  }
};

export const assetDeliveryValidation = (): AstroIntegration => ({
  name: 'asset-delivery-validation',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await validateControlRouteAssetDelivery(dir);
    },
  },
});
