import { contentDateSchema } from '../content-date';
import type { NewsArchiveSummaryEntry, NewsArticleEntry, NewsAuthorEntry } from './load';
import { RawNewsEventsSchema, type RawNewsEventInput } from './raw-schema';

const testDate = contentDateSchema('test date');

export const newsArchiveSummaryEntries = (
  articles: readonly NewsArticleEntry[]
): readonly NewsArchiveSummaryEntry[] => {
  const ids = new Set<string>();

  for (const item of articles) {
    const [year, month] = item.id.split('/');

    ids.add(year);
    ids.add(`${year}/${month}`);
  }

  return [...ids].map((id) => ({ id, body: `Выжимка ${id}.` }));
};

export const createTestNewsDatasetBuilder =
  (builder: typeof import('./load').buildNewsDataset) =>
  (
    authors: Parameters<typeof builder>[0],
    articles: Parameters<typeof builder>[1],
    opts?: Parameters<typeof builder>[3]
  ): ReturnType<typeof builder> =>
    builder(authors, articles, newsArchiveSummaryEntries(articles), opts);

export const newsAuthorEntry = (input: {
  readonly id: string;
  readonly name: string;
  readonly kind?: 'official' | 'community' | 'editorial' | 'other';
}): NewsAuthorEntry => ({
  id: input.id,
  data: {
    name: input.name,
    kind: input.kind ?? 'editorial'
  }
});

export const newsArticleEntry = (input: {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly date: string;
  readonly body?: string;
  readonly pinned?: boolean;
  readonly pinned_until?: string;
  readonly events?: readonly RawNewsEventInput[];
  readonly photos?: ReadonlyArray<NonNullable<NewsArticleEntry['data']['photos']>[number]>;
  readonly searchAliases?: readonly string[];
}): NewsArticleEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    summary: input.summary,
    date: testDate.parse(input.date),
    author: { id: 'ig' } as NewsArticleEntry['data']['author'],
    pinned: input.pinned,
    pinned_until: input.pinned_until ? testDate.parse(input.pinned_until) : undefined,
    events: input.events ? RawNewsEventsSchema.parse(input.events) : undefined,
    photos: input.photos,
    search_aliases: input.searchAliases
  }
});
