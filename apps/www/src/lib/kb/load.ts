import type { CollectionEntry } from 'astro:content';

import { preprocessSiteMarkdownContent } from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';
import { kbCanonical, kbDetailCanonical, kbDetailUrl, kbUrl } from './routes';
import type { KbPage, KbPageFlag } from './types';

export type KbPageEntry = Pick<CollectionEntry<'kbPages'>, 'id' | 'body'> & {
  readonly data: {
    readonly title: string;
    readonly flags?: readonly KbPageFlag[];
    readonly seo?: {
      readonly description?: string;
    };
  };
};

let cache: Promise<readonly KbPage[]> | undefined;

const KB_ROUTE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KB_NOINDEX_ROBOTS = 'noindex, follow';

const failEntryId = (entryId: string, reason: string): never => {
  throw new Error(`kb page source id "${entryId}" ${reason}`);
};

const validateSegment = (entryId: string, segment: string): void => {
  if (!KB_ROUTE_SEGMENT.test(segment)) {
    failEntryId(
      entryId,
      `has invalid segment "${segment}"; segments must use lower-case Latin letters, digits, and hyphen`,
    );
  }
};

const entryRouteSlug = (entryId: string): string | undefined => {
  if (!entryId) {
    failEntryId(entryId, 'must not be empty');
  }

  const parts = entryId.split('/');

  for (const part of parts) {
    if (!part) {
      failEntryId(entryId, 'must not contain empty path segments');
    }
  }

  const routeSegments =
    parts[parts.length - 1] === 'index' ? parts.slice(0, -1) : parts;

  for (const segment of routeSegments) {
    validateSegment(entryId, segment);
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

const isSectionRoute = (
  routeSlug: string | undefined,
  routeSlugs: readonly (string | undefined)[],
): boolean =>
  !routeSlug ||
  routeSlugs.some(
    (candidate) => candidate?.startsWith(`${routeSlug}/`) ?? false,
  );

export const buildKbPages = (
  entries: readonly KbPageEntry[],
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): readonly KbPage[] => {
  const mentionRegistry = opts?.mentionRegistry ?? new Map();
  const routeSlugs = entries.map((entry) => entryRouteSlug(entry.id));
  const entryIdByPublicUrl = new Map<string, string>();

  return entries.map((entry, index) => {
    const entryId = entry.id;
    const routeSlug = routeSlugs[index];
    const page = mapEntry(
      entry,
      mentionRegistry,
      routeSlug,
      isSectionRoute(routeSlug, routeSlugs),
    );
    const conflictingEntryId = entryIdByPublicUrl.get(page.url);

    if (conflictingEntryId) {
      throw new Error(
        `kb page "${entryId}" conflicts with "${conflictingEntryId}" for public URL "${page.url}"`,
      );
    }

    entryIdByPublicUrl.set(page.url, entryId);

    return page;
  });
};

export const loadKbPages = (): Promise<readonly KbPage[]> => {
  cache ??= Promise.all([
    import('astro:content').then(
      ({ getCollection }) =>
        getCollection('kbPages') as Promise<readonly KbPageEntry[]>,
    ),
    loadSiteMentionRegistry(),
  ]).then(([entries, mentionRegistry]) =>
    buildKbPages(entries, { mentionRegistry }),
  );

  return cache;
};
