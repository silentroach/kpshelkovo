import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  shouldInlineBuildAsset,
  validateControlRouteAssetDelivery,
} from '../asset-delivery-validation';

const controlRouteHtmlPaths = [
  'index.html',
  'news/index.html',
  'status/index.html',
  '815/compare/index.html',
  '815/compare/rating/index.html',
  '815/regulation/index.html',
] as const;
const temporaryDirectories: string[] = [];

const createOutput = async (
  stylesheetCounts: Readonly<Record<string, number>> = {},
  missingRuntimePath?: string,
): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'asset-delivery-'));
  temporaryDirectories.push(directory);

  await Promise.all(
    controlRouteHtmlPaths.map(async (htmlPath) => {
      const outputPath = join(directory, htmlPath);
      const stylesheetCount = stylesheetCounts[htmlPath] ?? 1;
      const html = Array.from(
        { length: stylesheetCount },
        (_, index) =>
          `<link rel="stylesheet" href="/static/styles-${index}.css">`,
      ).join('');
      const projectRuntime =
        htmlPath === missingRuntimePath
          ? ''
          : '<script type="module" src="/static/BaseLayout.astro_astro_type_script_index_0_lang.hash.js"></script>';
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${html}${projectRuntime}`);
    }),
  );

  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('build asset inline policy', () => {
  it('inlines only CSS smaller than 16 KiB', () => {
    expect({
      routeCss: shouldInlineBuildAsset('route.css', Buffer.alloc(16_383)),
      boundaryCss: shouldInlineBuildAsset('route.css', Buffer.alloc(16_384)),
      smallJavaScript: shouldInlineBuildAsset('runtime.js', Buffer.alloc(1)),
      smallImage: shouldInlineBuildAsset('icon.svg', Buffer.alloc(1)),
    }).toMatchInlineSnapshot(`
      {
        "boundaryCss": false,
        "routeCss": true,
        "smallImage": false,
        "smallJavaScript": false,
      }
    `);
  });
});

describe('control-route asset delivery validation', () => {
  it('accepts at most one external stylesheet per route', async () => {
    const directory = await createOutput({ 'news/index.html': 0 });

    await expect(
      validateControlRouteAssetDelivery(pathToFileURL(`${directory}/`)),
    ).resolves.toBeUndefined();
  });

  it('reports routes with multiple external stylesheets', async () => {
    const directory = await createOutput({
      'news/index.html': 2,
      'status/index.html': 3,
    });

    await expect(
      validateControlRouteAssetDelivery(pathToFileURL(`${directory}/`)),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [Error: Invalid control-route asset delivery:
      - news/index.html -> expected at most one external stylesheet, found 2
      - status/index.html -> expected at most one external stylesheet, found 3]
    `);
  });

  it('rejects an inlined project runtime', async () => {
    const directory = await createOutput({}, 'news/index.html');

    await expect(
      validateControlRouteAssetDelivery(pathToFileURL(`${directory}/`)),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [Error: Invalid control-route asset delivery:
      - news/index.html -> project runtime is not an external module]
    `);
  });
});
