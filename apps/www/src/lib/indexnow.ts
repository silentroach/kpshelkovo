import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/u;
const INDEXNOW_MAX_URLS = 10_000;
const INDEXNOW_RESERVED_KEYS: ReadonlySet<string> = new Set(['llms-full']);
const INDEXNOW_SITE = new URL('https://kpshelkovo.online');
const INDEXNOW_TIMEOUT_MS = 15_000;
const INDEXNOW_URL_MANIFEST_SCHEMA = z.array(z.string().url()).min(1);

const validateIndexNowKey = (key: string): void => {
  if (!INDEXNOW_KEY_PATTERN.test(key)) {
    throw new Error(
      'INDEXNOW_KEY must contain 8-128 ASCII letters, numbers, or dashes',
    );
  }

  if (INDEXNOW_RESERVED_KEYS.has(key)) {
    throw new Error('INDEXNOW_KEY must not match a generated root text route');
  }
};

const canonicalSiteUrl = (value: string): string => {
  const url = new URL(value);

  if (url.origin !== INDEXNOW_SITE.origin) {
    throw new Error(`IndexNow URL must use ${INDEXNOW_SITE.origin}`);
  }

  return url.toString();
};

const readIndexNowUrls = async (
  manifestPath: string,
): Promise<ReadonlySet<string>> => {
  const urls = INDEXNOW_URL_MANIFEST_SCHEMA.parse(
    JSON.parse(await readFile(manifestPath, 'utf8')),
  );

  return new Set(urls.map(canonicalSiteUrl));
};

const htmlFileUrl = (file: string): string | undefined => {
  const normalized = file.replace(/^\.\//u, '');

  if (
    normalized.startsWith('/') ||
    normalized.split('/').includes('..') ||
    (normalized !== 'index.html' && !normalized.endsWith('/index.html'))
  ) {
    return;
  }

  const pathname = `/${normalized.slice(0, -'index.html'.length)}`;

  return new URL(pathname, INDEXNOW_SITE).toString();
};

const changedIndexableUrls = async (
  urlManifestPath: string,
  changesPath: string,
): Promise<readonly string[]> => {
  const indexNowUrls = await readIndexNowUrls(urlManifestPath);
  const changes = await readFile(changesPath, 'utf8');
  const urls = new Set<string>();

  for (const line of changes.split('\n')) {
    const separator = line.indexOf('|');

    if (separator < 0) {
      continue;
    }

    const itemizedChange = line.slice(0, separator);
    const url = htmlFileUrl(line.slice(separator + 1));

    if (
      url &&
      (itemizedChange.startsWith('*deleting') || indexNowUrls.has(url))
    ) {
      urls.add(url);
    }
  }

  return [...urls].sort();
};

const indexNowKeyLocation = (key: string): string =>
  new URL(`/${key}.txt`, INDEXNOW_SITE).toString();

const verifyIndexNowKey = async (
  key: string,
  request: typeof fetch,
): Promise<void> => {
  const response = await request(indexNowKeyLocation(key), {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(INDEXNOW_TIMEOUT_MS),
  });

  if (!response.ok || (await response.text()) !== key) {
    throw new Error('deployed IndexNow key file could not be verified');
  }
};

export const writeIndexNowKeyFile = async (
  siteRoot: string,
  key: string,
): Promise<void> => {
  validateIndexNowKey(key);
  await writeFile(join(siteRoot, `${key}.txt`), key, {
    encoding: 'utf8',
    flag: 'wx',
  });
};

export const submitIndexNowUrls = async (
  key: string,
  urls: readonly string[],
  request: typeof fetch = fetch,
): Promise<number> => {
  validateIndexNowKey(key);

  const uniqueUrls = [...new Set(urls.map(canonicalSiteUrl))].sort();
  let requestCount = 0;

  for (let start = 0; start < uniqueUrls.length; start += INDEXNOW_MAX_URLS) {
    const urlList = uniqueUrls.slice(start, start + INDEXNOW_MAX_URLS);
    const response = await request(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: INDEXNOW_SITE.hostname,
        key,
        keyLocation: indexNowKeyLocation(key),
        urlList,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(INDEXNOW_TIMEOUT_MS),
    });

    if (response.status !== 200 && response.status !== 202) {
      throw new Error(
        `IndexNow rejected URL submission with HTTP ${response.status}`,
      );
    }

    requestCount += 1;
  }

  return requestCount;
};

export const submitIndexNowChanges = async (
  urlManifestPath: string,
  changesPath: string,
  key: string,
  request: typeof fetch = fetch,
): Promise<
  readonly [submittedUrls: readonly string[], requestCount: number]
> => {
  validateIndexNowKey(key);
  const urls = await changedIndexableUrls(urlManifestPath, changesPath);

  await verifyIndexNowKey(key, request);

  return [urls, await submitIndexNowUrls(key, urls, request)];
};
