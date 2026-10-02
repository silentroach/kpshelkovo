import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, onTestFinished, test } from 'vitest';
import { stringify } from 'yaml';

import { readBundleAssetSizes } from '../scripts/bundle-asset-sizes';

const temporaryAsset = async (): Promise<URL> => {
  const directory = await mkdtemp(join(tmpdir(), 'bundle-asset-sizes-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return pathToFileURL(join(directory, 'asset.js'));
};

test('reports only compressed variants that exist, keeping the original size', async () => {
  const url = await temporaryAsset();
  await writeFile(url, Buffer.alloc(110));
  const reports = [];
  for (const extensions of [[], ['br'], ['gz'], ['br', 'gz']]) {
    await Promise.all(
      ['br', 'gz'].map(async (extension) => {
        const variant = new URL(`${url}.${extension}`);
        await rm(variant, { force: true });
        if (extensions.includes(extension)) {
          await writeFile(variant, Buffer.alloc(extension === 'br' ? 76 : 90));
        }
      })
    );
    reports.push(await readBundleAssetSizes(url));
  }

  expect(stringify(reports)).toMatchInlineSnapshot(`
    "- bytes: 110
    - bytes: 110
      brotli: 76
    - bytes: 110
      gzip: 90
    - bytes: 110
      brotli: 76
      gzip: 90
    "
  `);
});

test('does not ignore a missing original', async () => {
  const url = await temporaryAsset();
  await expect(readBundleAssetSizes(url)).rejects.toMatchObject({ code: 'ENOENT' });
});

test.each(['br', 'gz'])('does not ignore non-ENOENT errors for .%s', async (extension) => {
  const url = await temporaryAsset();
  await writeFile(url, 'original');
  await symlink(new URL(`${url}/child`), new URL(`${url}.${extension}`));

  await expect(readBundleAssetSizes(url)).rejects.toMatchObject({ code: 'ENOTDIR' });
});
