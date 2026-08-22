import { getCollection, type CollectionEntry } from 'astro:content';

import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';

import { DISCOMFORT_QUOTE_AUTHOR_SLUG } from './config';
import { mapRawDiscomfortEvent } from './mapper';
import type { RawDiscomfortEvent } from './raw-schema';
import type { DiscomfortDataset, DiscomfortEvent } from './types';

export type DiscomfortEventEntry = Pick<
  CollectionEntry<'discomfortEvents'>,
  'id' | 'body'
> & {
  readonly data: RawDiscomfortEvent;
};

let cache: Promise<DiscomfortDataset> | undefined;

const compareEvents = (a: DiscomfortEvent, b: DiscomfortEvent): number =>
  a.dateIso.localeCompare(b.dateIso) || a.slug.localeCompare(b.slug);

const validateUniqueSlugs = (events: readonly DiscomfortEvent[]): void => {
  const seen = new Set<string>();

  for (const event of events) {
    if (seen.has(event.slug)) {
      throw new Error(`duplicate discomfort event slug "${event.slug}"`);
    }

    seen.add(event.slug);
  }
};

export const buildDiscomfortDataset = (
  entries: readonly DiscomfortEventEntry[],
  opts: { readonly mentionRegistry: SiteMentionRegistry },
): DiscomfortDataset => {
  const quoteAuthor = opts.mentionRegistry.get(DISCOMFORT_QUOTE_AUTHOR_SLUG);

  if (!quoteAuthor) {
    throw new Error(
      `discomfort quote author "${DISCOMFORT_QUOTE_AUTHOR_SLUG}" is required`,
    );
  }

  const events = entries
    .map((entry) => mapRawDiscomfortEvent(entry, opts.mentionRegistry))
    .sort(compareEvents);

  validateUniqueSlugs(events);

  return {
    events,
    latestEvent: events.at(-1),
    quoteAuthor,
  };
};

const buildDiscomfortData = async (): Promise<DiscomfortDataset> =>
  buildDiscomfortDataset(await getCollection('discomfortEvents'), {
    mentionRegistry: await loadSiteMentionRegistry(),
  });

export const loadDiscomfortData = (): Promise<DiscomfortDataset> => {
  cache ??= buildDiscomfortData();

  return cache;
};
