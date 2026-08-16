import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  submitIndexNowChanges,
  submitIndexNowUrls,
  writeIndexNowKeyFile,
} from '../indexnow';

const TEST_KEY = 'indexnow-test-key';
const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'indexnow-test-'));
  temporaryDirectories.push(directory);
  return directory;
};

const writeSitemap = async (
  siteRoot: string,
  urls: readonly string[],
): Promise<void> => {
  const entries = urls.map((url) => `<url><loc>${url}</loc></url>`).join('');
  await writeFile(
    join(siteRoot, 'sitemap-0.xml'),
    `<?xml version="1.0" encoding="UTF-8"?><urlset>${entries}</urlset>`,
  );
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('writeIndexNowKeyFile', () => {
  it('writes the validated UTF-8 ownership file at the site root', async () => {
    const siteRoot = await createTemporaryDirectory();

    await writeIndexNowKeyFile(siteRoot, TEST_KEY);

    expect(await readFile(join(siteRoot, `${TEST_KEY}.txt`), 'utf8')).toBe(
      TEST_KEY,
    );
  });

  it('rejects keys that could escape the site root', async () => {
    const siteRoot = await createTemporaryDirectory();

    await expect(
      writeIndexNowKeyFile(siteRoot, '../../not-a-key'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: INDEXNOW_KEY must contain 8-128 ASCII letters, numbers, or dashes]`,
    );
  });
});

describe('submitIndexNowChanges', () => {
  it('submits changed sitemap pages and deleted routes after verifying the key', async () => {
    const siteRoot = await createTemporaryDirectory();
    const changesPath = join(siteRoot, 'rsync-changes.txt');

    await writeSitemap(siteRoot, [
      'https://kpshelkovo.online/',
      'https://kpshelkovo.online/news/new/',
      'https://kpshelkovo.online/news/tags/%D0%B2%D0%BE%D0%B4%D0%B0/',
    ]);
    await writeFile(
      changesPath,
      [
        '>fcst......|index.html',
        '>f+++++++++|news/new/index.html',
        '>fcst......|news/tags/вода/index.html',
        '>fcst......|kb/noindex/index.html',
        '*deleting  |news/old/index.html',
        '>fcst......|robots.txt',
      ].join('\n'),
    );

    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(TEST_KEY))
      .mockResolvedValueOnce(new Response('', { status: 202 }));

    await expect(
      submitIndexNowChanges(siteRoot, changesPath, TEST_KEY, request),
    ).resolves.toEqual([4, 1]);

    expect(
      request.mock.calls.map(([url, init]) => ({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "body": undefined,
          "method": "GET",
          "url": "https://kpshelkovo.online/indexnow-test-key.txt",
        },
        {
          "body": {
            "host": "kpshelkovo.online",
            "key": "indexnow-test-key",
            "keyLocation": "https://kpshelkovo.online/indexnow-test-key.txt",
            "urlList": [
              "https://kpshelkovo.online/",
              "https://kpshelkovo.online/news/new/",
              "https://kpshelkovo.online/news/old/",
              "https://kpshelkovo.online/news/tags/%D0%B2%D0%BE%D0%B4%D0%B0/",
            ],
          },
          "method": "POST",
          "url": "https://api.indexnow.org/indexnow",
        },
      ]
    `);
  });
});

describe('submitIndexNowUrls', () => {
  it('keeps each POST at the 10,000 URL protocol limit', async () => {
    const urls = Array.from(
      { length: 10_001 },
      (_, index) => `https://kpshelkovo.online/page-${index}/`,
    );
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 200 }));

    await expect(submitIndexNowUrls(TEST_KEY, urls, request)).resolves.toBe(2);

    expect(
      request.mock.calls.map(
        ([, init]) => JSON.parse(String(init?.body)).urlList.length,
      ),
    ).toEqual([10_000, 1]);
  });
});
