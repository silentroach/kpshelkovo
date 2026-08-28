import type { CollectionEntry } from 'astro:content';

import { preprocessSiteMarkdownContent } from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';
import { kbCanonical, kbDetailCanonical, kbDetailUrl, kbUrl } from './routes';
import type { KbDataset, KbPage, KbPageFlag } from './types';

export type KbPageEntry = Pick<CollectionEntry<'kbPages'>, 'id' | 'body'> & {
  readonly data: {
    readonly title: string;
    readonly flags?: readonly KbPageFlag[];
    readonly seo?: {
      readonly description?: string;
    };
  };
};

let cache: Promise<KbDataset> | undefined;

const KB_ROUTE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KB_NOINDEX_ROBOTS = 'noindex, follow';

const failSourceId = (sourceId: string, reason: string): never => {
  throw new Error(`kb page source id "${sourceId}" ${reason}`);
};

const validateSegment = (sourceId: string, segment: string): void => {
  if (!KB_ROUTE_SEGMENT.test(segment)) {
    failSourceId(
      sourceId,
      `has invalid segment "${segment}"; segments must use lower-case Latin letters, digits, and hyphen`,
    );
  }
};

const entryRouteSlug = (sourceId: string): string | undefined => {
  if (!sourceId) {
    failSourceId(sourceId, 'must not be empty');
  }

  const parts = sourceId.split('/');

  for (const part of parts) {
    if (!part) {
      failSourceId(sourceId, 'must not contain empty path segments');
    }
  }

  const routeSegments =
    parts[parts.length - 1] === 'index' ? parts.slice(0, -1) : parts;

  for (const segment of routeSegments) {
    validateSegment(sourceId, segment);
  }

  if (routeSegments.length === 0) {
    return;
  }

  return routeSegments.join('/');
};

const mapEntry = (
  entry: KbPageEntry,
  mentionRegistry: SiteMentionRegistry,
  routeSlug: string | undefined,
  isSection: boolean,
): KbPage => {
  const flags = entry.data.flags ?? [];
  const body = preprocessSiteMarkdownContent(
    entry.body ?? '',
    `kb page "${entry.id}" body`,
    mentionRegistry,
  );

  return {
    id: entry.id,
    sourceId: entry.id,
    title: entry.data.title,
    seo: entry.data.seo,
    flags,
    robots: flags.includes('noindex') ? KB_NOINDEX_ROBOTS : undefined,
    url: routeSlug ? kbDetailUrl(routeSlug) : kbUrl(),
    canonical: routeSlug ? kbDetailCanonical(routeSlug) : kbCanonical(),
    routeSlug,
    isSection,
    body: body.markdown,
    mentions: body.mentions,
  } satisfies KbPage;
};

const validateUniquePublicUrls = (pages: readonly KbPage[]): void => {
  const seen = new Map<string, string>();

  for (const page of pages) {
    const conflict = seen.get(page.url);

    if (conflict) {
      throw new Error(
        `kb page "${page.sourceId}" conflicts with "${conflict}" for public URL "${page.url}"`,
      );
    }

    seen.set(page.url, page.sourceId);
  }
};

const isSectionRoute = (
  routeSlug: string | undefined,
  routeSlugs: readonly (string | undefined)[],
): boolean =>
  !routeSlug ||
  routeSlugs.some(
    (candidate) => candidate?.startsWith(`${routeSlug}/`) ?? false,
  );

export const buildKbDataset = (
  entries: readonly KbPageEntry[],
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): KbDataset => {
  const mentionRegistry = opts?.mentionRegistry ?? new Map();
  const routeSlugs = entries.map((entry) => entryRouteSlug(entry.id));
  const pages = entries.map((entry, index) => {
    const routeSlug = routeSlugs[index];

    return mapEntry(
      entry,
      mentionRegistry,
      routeSlug,
      isSectionRoute(routeSlug, routeSlugs),
    );
  });

  validateUniquePublicUrls(pages);

  return {
    pages,
    byId: new Map(pages.map((page) => [page.id, page])),
    bySourceId: new Map(pages.map((page) => [page.sourceId, page])),
  };
};

export const loadKbData = (): Promise<KbDataset> => {
  cache ??= Promise.all([
    import('astro:content').then(
      ({ getCollection }) =>
        getCollection('kbPages') as Promise<readonly KbPageEntry[]>,
    ),
    loadSiteMentionRegistry(),
  ]).then(([entries, mentionRegistry]) =>
    buildKbDataset(entries, { mentionRegistry }),
  );

  return cache;
};

export const loadKbPages = async (): Promise<readonly KbPage[]> =>
  (await loadKbData()).pages;

export const loadKbPage = async (id: string): Promise<KbPage | undefined> =>
  (await loadKbData()).byId.get(id);
