import { padNumber } from '@shelkovo/format';
import { getCollection, type CollectionEntry } from 'astro:content';

import { preprocessSiteMarkdownContent } from '../markdown/render';
import type { SiteMentionRegistry } from '../mentions';
import { loadSiteMentionRegistry } from '../mentions/registry';
import { withBase } from '../site';
import { validateArchiveSummaryMarkdown } from './archive-summary';
import { buildArchives, newsMonthKey } from './archives';
import { NEWS_LATEST_LIMIT } from './config';
import { mapRawNewsAuthor } from './mapper';
import {
  articleCanonical,
  articleEventIcsUrl,
  articleMarkdownUrl,
  articleUrl,
} from './routes';
import { compareArticlesPublishedDesc } from './sort';
import { NEWS_AREAS, normalizeTagKey, type NewsArea } from './schema';
import type {
  NewsArticle,
  NewsArchiveSummary,
  NewsArchives,
  NewsAttachment,
  NewsAuthor,
  NewsCover,
  NewsDataset,
  NewsEvent,
  NewsEventPerformer,
  NewsHomeData,
  NewsListArticle,
  NewsMonthArchive,
  NewsPhoto,
  NewsTagPage,
  NewsYearArchive,
} from './types';
import { buildArticleTags, buildTagIndex } from './tags';

export type NewsArticleEntry = Pick<
  CollectionEntry<'newsArticles'>,
  'id' | 'data' | 'body'
>;
export type NewsAuthorEntry = Pick<
  CollectionEntry<'newsAuthors'>,
  'id' | 'data'
>;
export type NewsArchiveSummaryEntry = Pick<
  CollectionEntry<'newsArchiveSummaries'>,
  'id' | 'body'
>;
type ArticleEntry = NewsArticleEntry;
type AuthorEntry = NewsAuthorEntry;
type ArchiveSummaryEntry = NewsArchiveSummaryEntry;
type ArticleData = ArticleEntry['data'];
type EventData = NonNullable<ArticleData['events']>[number];
type AttachmentInput = NonNullable<ArticleData['attachments']>[number];
type AuthorReference = ArticleData['author'];
type CoverInput = NonNullable<ArticleData['cover']>;
type PhotoInput = NonNullable<ArticleData['photos']>[number];
let cache: Promise<NewsDataset> | undefined;

const isPinnedAtBuild = (
  input: Pick<ArticleData, 'pinned' | 'pinned_until'>,
  now: Date,
): boolean => {
  if (!input.pinned) {
    return false;
  }

  return input.pinned_until
    ? now.valueOf() < input.pinned_until.at.valueOf()
    : true;
};

const authorId = (ref: AuthorReference): string => ref.id;

function authorData(entry: AuthorEntry): NewsAuthor {
  return mapRawNewsAuthor(entry.id, entry.data);
}

const authorMap = (
  entries: readonly AuthorEntry[],
): ReadonlyMap<string, NewsAuthor> =>
  new Map(entries.map((entry) => [entry.id, authorData(entry)]));

function needAuthor(
  authors: ReadonlyMap<string, NewsAuthor>,
  id: string,
  context: string,
): NewsAuthor {
  const author = authors.get(id);

  if (!author) {
    throw new Error(`${context} references missing author "${id}"`);
  }

  return author;
}

const assetUrl = (asset: CoverInput | undefined): string | undefined =>
  asset ? withBase(asset.src) : undefined;

const cover = (
  asset: CoverInput | undefined,
  alt: string | undefined,
  context: string,
): NewsCover | undefined => {
  const url = assetUrl(asset);

  if (!asset || !url) return undefined;
  if (!alt)
    throw new Error(`${context} cover_alt is required when cover is set`);

  return {
    url,
    width: asset.width,
    height: asset.height,
    alt,
  };
};

const mapPhotos = (
  items: readonly PhotoInput[] | undefined,
  entryId: string,
  mentionRegistry: SiteMentionRegistry,
) =>
  items?.map((item, index) => {
    const caption = item.caption
      ? preprocessSiteMarkdownContent(
          item.caption,
          `news article "${entryId}" photos[${index}].caption`,
          mentionRegistry,
        )
      : undefined;

    return {
      photo: {
        url: item.url,
        width: item.width,
        height: item.height,
        alt: item.alt,
        caption: caption?.markdown,
      } satisfies NewsPhoto,
      mentions: caption?.mentions ?? [],
    };
  }) ?? [];

const attachments = (
  items: readonly AttachmentInput[] | undefined,
): readonly NewsAttachment[] =>
  items?.map((item) => ({
    title: item.title,
    url: item.url,
    type: item.type,
    size: item.size,
  })) ?? [];

const normalizeEventOrganizer = (
  input: EventData['organizer'],
): NewsEvent['organizer'] => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'string') {
    return { name: input, type: 'organization' };
  }

  return {
    name: input.name,
    type: input.type ?? 'organization',
  };
};

const normalizeEventPerformerItem = (
  input: NonNullable<EventData['performer']>[number],
): NewsEventPerformer => {
  if (typeof input === 'string') {
    return { name: input, type: 'organization' };
  }

  return {
    name: input.name,
    type: input.type ?? 'organization',
  };
};

const normalizeEventPerformers = (
  input: EventData['performer'],
): NewsEvent['performer'] => {
  if (!input) {
    return undefined;
  }

  return input.map(normalizeEventPerformerItem);
};

function normalizeEvent(
  input: EventData,
  route: {
    readonly year: string;
    readonly month: string;
    readonly entry: string;
  },
): NewsEvent {
  const slug = input.slug ?? 'event';
  const starts = input.starts_at;
  const ends = input.ends_at;

  return {
    slug,
    title: input.title,
    description: input.description,
    startsAt: starts.at,
    startsIso: starts.iso,
    startsTime: starts.time,
    icsUrl: articleEventIcsUrl({ ...route, event: slug }),
    endsAt: ends?.at,
    endsIso: ends?.iso,
    endsTime: ends?.time,
    location: input.location,
    coordinates: input.coordinates,
    organizer: normalizeEventOrganizer(input.organizer),
    performer: normalizeEventPerformers(input.performer),
  };
}

function normalizeEvents(
  input: readonly EventData[] | undefined,
  route: {
    readonly year: string;
    readonly month: string;
    readonly entry: string;
  },
): readonly NewsEvent[] {
  if (!input) {
    return [];
  }

  return input.map((item) => normalizeEvent(item, route));
}

function articleParts(entry: ArticleEntry): {
  readonly year: string;
  readonly month: string;
  readonly entry: string;
} {
  const parts = entry.id.split('/');

  if (parts.length !== 3) {
    throw new Error(`news article id "${entry.id}" must use YYYY/MM/[entry]`);
  }

  return {
    year: parts[0],
    month: parts[1],
    entry: parts[2],
  };
}

const areas = (
  values: readonly NewsArea[] | undefined,
): {
  readonly appliesToAllAreas: boolean;
  readonly areas: readonly NewsArea[];
} => {
  if (!values?.length) {
    return {
      appliesToAllAreas: true,
      areas: [...NEWS_AREAS],
    };
  }

  return {
    appliesToAllAreas: false,
    areas: [...values],
  };
};

function normalizeArticle(
  entry: ArticleEntry,
  authors: ReadonlyMap<string, NewsAuthor>,
  mentionRegistry: SiteMentionRegistry,
  now: Date,
): NewsArticle {
  const parts = articleParts(entry);
  const published = entry.data.date;
  if (published.year !== parts.year || published.month !== parts.month) {
    throw new Error(
      `news article "${entry.id}" date ${published.iso} must match ${parts.year}/${parts.month}`,
    );
  }

  const area = areas(entry.data.areas);
  const author = needAuthor(
    authors,
    authorId(entry.data.author),
    `news article "${entry.id}"`,
  );
  const articleCover = cover(
    entry.data.cover,
    entry.data.cover_alt,
    `news article "${entry.id}"`,
  );
  const events = normalizeEvents(entry.data.events, parts);
  const mappedPhotos = mapPhotos(entry.data.photos, entry.id, mentionRegistry);
  const body = preprocessSiteMarkdownContent(
    entry.body ?? '',
    `news article "${entry.id}" body`,
    mentionRegistry,
  );
  const article = {
    id: entry.id,
    title: entry.data.title,
    seo: entry.data.seo,
    author,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(published.day),
    entry: parts.entry,
    url: articleUrl(parts),
    markdownUrl: articleMarkdownUrl(parts),
    canonical: articleCanonical(parts),
    publishedAt: published.at,
    publishedIso: published.iso,
    time: published.time,
    appliesToAllAreas: area.appliesToAllAreas,
    areas: area.areas,
    tags: buildArticleTags(entry.data.tags),
    searchAliases: entry.data.search_aliases,
    pinned: isPinnedAtBuild(entry.data, now),
    sourceUrl: entry.data.source_url,
    cover: articleCover,
    photos: mappedPhotos.map((item) => item.photo),
    attachments: attachments(entry.data.attachments),
    events,
    summary: entry.data.summary,
    body: body.markdown,
    mentions: [
      ...body.mentions,
      ...mappedPhotos.flatMap((item) => item.mentions),
    ],
  } satisfies NewsArticle;

  return article;
}

const toListArticle = (article: NewsArticle): NewsListArticle => ({
  id: article.id,
  title: article.title,
  author: article.author,
  year: article.year,
  month: article.month,
  day: article.day,
  entry: article.entry,
  url: article.url,
  markdownUrl: article.markdownUrl,
  canonical: article.canonical,
  publishedAt: article.publishedAt,
  publishedIso: article.publishedIso,
  time: article.time,
  appliesToAllAreas: article.appliesToAllAreas,
  areas: article.areas,
  tags: article.tags,
  pinned: article.pinned,
  sourceUrl: article.sourceUrl,
  cover: article.cover,
  events: article.events,
  summary: article.summary,
});

const archiveSummaryMap = (
  entries: readonly ArchiveSummaryEntry[],
  mentionRegistry: SiteMentionRegistry,
  articleUrls: ReadonlySet<string>,
): ReadonlyMap<string, NewsArchiveSummary> => {
  const summaries = new Map<string, NewsArchiveSummary>();

  for (const entry of entries) {
    if (summaries.has(entry.id)) {
      throw new Error(`duplicate news archive summary \"${entry.id}\"`);
    }

    const body = preprocessSiteMarkdownContent(
      entry.body ?? '',
      `news archive summary \"${entry.id}\" body`,
      mentionRegistry,
    );

    if (!body.markdown) {
      throw new Error(`news archive summary \"${entry.id}\" body is required`);
    }

    if (body.mentions.length > 0) {
      throw new Error(
        `news archive summary \"${entry.id}\" must link to the source article instead of mentioning people directly`,
      );
    }

    validateArchiveSummaryMarkdown(
      body.markdown,
      articleUrls,
      `news archive summary \"${entry.id}\"`,
    );

    summaries.set(entry.id, {
      body: body.markdown,
    });
  }

  return summaries;
};

function validateUniqueIds(items: readonly NewsArticle[]): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`duplicate news article id "${item.id}"`);
    }

    seen.add(item.id);
  }
}

function validateDayKeyConflicts(items: readonly NewsArticle[]): void {
  const days = new Map<string, NewsArticle[]>();

  for (const item of items) {
    const key = `${item.year}/${padNumber(item.month, 2)}/${padNumber(item.day, 2)}`;
    const list = days.get(key) ?? [];

    list.push(item);
    days.set(key, list);
  }

  for (const [key, day] of days.entries()) {
    const numeric = day.find(
      (item) => /^\d+$/.test(item.entry) && Number(item.entry) === item.day,
    );

    if (numeric && day.length > 1) {
      throw new Error(
        `news article day-key "${numeric.id}" conflicts with another article on ${key}`,
      );
    }
  }
}

export function buildNewsDataset(
  authorsData: readonly NewsAuthorEntry[],
  articlesData: readonly NewsArticleEntry[],
  archiveSummariesData: readonly NewsArchiveSummaryEntry[],
  opts?: {
    readonly now?: Date;
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): NewsDataset {
  const now = opts?.now ?? new Date();
  const mentionRegistry = opts?.mentionRegistry ?? new Map();
  const authors = authorMap(authorsData);

  const articles: readonly NewsArticle[] = articlesData
    .map((item: ArticleEntry) =>
      normalizeArticle(item, authors, mentionRegistry, now),
    )
    .sort(compareArticlesPublishedDesc);

  validateUniqueIds(articles);
  validateDayKeyConflicts(articles);

  const list: readonly NewsListArticle[] = articles.map(toListArticle);
  const archiveSummaries = archiveSummaryMap(
    archiveSummariesData,
    mentionRegistry,
    new Set(articles.map((item) => item.url)),
  );
  const home: NewsHomeData = {
    pinned: list.filter((item) => item.pinned),
    latest: list.filter((item) => !item.pinned).slice(0, NEWS_LATEST_LIMIT),
  };
  const archives = buildArchives(list, archiveSummaries);
  const tags = buildTagIndex(list);

  return {
    articles,
    home,
    archives,
    tags,
    byId: new Map(articles.map((item) => [item.id, item])),
    byTag: new Map(tags.map((item) => [item.key, item])),
  };
}

async function buildNewsData(): Promise<NewsDataset> {
  const [authorsData, articlesData, archiveSummariesData, mentionRegistry] =
    await Promise.all([
      getCollection('newsAuthors') as Promise<readonly NewsAuthorEntry[]>,
      getCollection('newsArticles') as Promise<readonly NewsArticleEntry[]>,
      getCollection('newsArchiveSummaries') as Promise<
        readonly NewsArchiveSummaryEntry[]
      >,
      loadSiteMentionRegistry(),
    ]);

  return buildNewsDataset(authorsData, articlesData, archiveSummariesData, {
    mentionRegistry,
  });
}

export const loadNewsData = (): Promise<NewsDataset> => {
  cache ??= buildNewsData();
  return cache;
};

export const loadNewsArticles = async (): Promise<readonly NewsArticle[]> =>
  (await loadNewsData()).articles;

export const loadNewsHome = async (): Promise<NewsHomeData> =>
  (await loadNewsData()).home;

export const loadNewsArchives = async (): Promise<NewsArchives> =>
  (await loadNewsData()).archives;

export const loadNewsTags = async (): Promise<readonly NewsTagPage[]> =>
  (await loadNewsData()).tags;

export const loadNewsArticle = async (
  id: string,
): Promise<NewsArticle | undefined> => (await loadNewsData()).byId.get(id);

export const loadNewsTag = async (
  key: string,
): Promise<NewsTagPage | undefined> =>
  (await loadNewsData()).byTag.get(normalizeTagKey(key));

export const loadNewsYear = async (
  year: number,
): Promise<NewsYearArchive | undefined> =>
  (await loadNewsData()).archives.byYear.get(year);

export const loadNewsMonth = async (
  year: number,
  month: number,
): Promise<NewsMonthArchive | undefined> =>
  (await loadNewsData()).archives.byMonth.get(newsMonthKey(year, month));

export const toNewsListArticle = (article: NewsArticle): NewsListArticle =>
  toListArticle(article);
