import { padNumber } from '@shelkovo/format';
import { getCollection, type CollectionEntry } from 'astro:content';

import { preprocessSiteMarkdownContent } from '../markdown/render';
import type { SiteMentionRegistry } from '../mentions';
import { loadPeopleMentionRegistry } from '../people/registry';
import { withBase } from '../site';
import { buildArchives, newsMonthKey } from './archives';
import { NEWS_LATEST_LIMIT } from './config';
import { parseNewsTimestamp, parseNewsTimestampInput } from './date';
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
  NewsArchives,
  NewsAttachment,
  NewsAuthor,
  NewsCover,
  NewsDataset,
  NewsEvent,
  NewsEventCoordinates,
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
type ArticleEntry = NewsArticleEntry;
type AuthorEntry = NewsAuthorEntry;
type ArticleData = ArticleEntry['data'];
type EventData = NonNullable<ArticleData['events']>[number];
type AttachmentInput = NonNullable<ArticleData['attachments']>[number];
type AuthorReference = ArticleData['author'];
type CoverInput = NonNullable<ArticleData['cover']>;
type PhotoInput = NonNullable<ArticleData['photos']>[number];
type NewsTimestampWithTime = NonNullable<
  ReturnType<typeof parseNewsTimestampInput>
> & {
  readonly has_time: true;
  readonly time: string;
};

let cache: Promise<NewsDataset> | undefined;

const isPinnedAtBuild = (input: {
  readonly pinned?: boolean;
  readonly pinned_until?: string;
}): boolean => {
  if (!input.pinned) {
    return false;
  }

  const until = input.pinned_until
    ? parseNewsTimestampInput(input.pinned_until)
    : undefined;

  return until ? Date.now() < until.at.valueOf() : true;
};

function parseEntryTimestamp(
  value: string,
  context: string,
  expected?: { readonly year: string; readonly month: string },
): NonNullable<ReturnType<typeof parseNewsTimestamp>> {
  const timestamp = parseNewsTimestamp(value);

  if (!timestamp) {
    throw new Error(
      `${context} date must use dd.mm.yyyy, dd.mm.yyyy hh:mm, or YYYY-MM-DD`,
    );
  }

  if (!expected) {
    return timestamp;
  }

  if (timestamp.year !== expected.year || timestamp.month !== expected.month) {
    throw new Error(
      `${context} date ${timestamp.iso} must match ${expected.year}/${expected.month}`,
    );
  }

  return timestamp;
}

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

const requiredEventText = (value: string, context: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${context} is required`);
  }

  return normalized;
};

const optionalEventText = (
  value: string | undefined,
  context: string,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${context} must not be blank`);
  }

  return normalized;
};

function parseEventTimestamp(
  value: string,
  context: string,
): NewsTimestampWithTime {
  const timestamp = parseNewsTimestampInput(value);

  if (!timestamp) {
    throw new Error(`${context} must use dd.mm.yyyy hh:mm`);
  }

  if (!timestamp.has_time || !timestamp.time) {
    throw new Error(`${context} must include time`);
  }

  return timestamp as NewsTimestampWithTime;
}

function normalizeEventCoordinates(
  input: EventData['coordinates'] | undefined,
  context: string,
): NewsEventCoordinates | undefined {
  if (!input) {
    return undefined;
  }

  if (!Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
    throw new Error(`${context} coordinates.lat must be between -90 and 90`);
  }

  if (!Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    throw new Error(`${context} coordinates.lng must be between -180 and 180`);
  }

  return {
    lat: input.lat,
    lng: input.lng,
  };
}

const normalizeEventOrganizer = (
  input: EventData['organizer'],
  context: string,
): NewsEvent['organizer'] => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'string') {
    const name = optionalEventText(input, context);

    return name ? { name, type: 'organization' as const } : undefined;
  }

  const name = requiredEventText(input.name, `${context}.name`);

  return {
    name,
    type: input.type ?? ('organization' as const),
  };
};

const normalizeEventPerformerItem = (
  input: NonNullable<EventData['performer']>[number],
  context: string,
): NewsEventPerformer => {
  if (typeof input === 'string') {
    const name = requiredEventText(input, context);

    return { name, type: 'organization' as const };
  }

  const name = requiredEventText(input.name, `${context}.name`);

  return {
    name,
    type: input.type ?? ('organization' as const),
  };
};

const normalizeEventPerformers = (
  input: EventData['performer'],
  context: string,
): NewsEvent['performer'] => {
  if (!input?.length) {
    return undefined;
  }

  return input.map(
    (item: NonNullable<EventData['performer']>[number], index: number) =>
      normalizeEventPerformerItem(item, `${context}[${index}]`),
  );
};

function normalizeEvent(
  input: EventData,
  entryId: string,
  route: {
    readonly year: string;
    readonly month: string;
    readonly entry: string;
  },
  index: number,
  count: number,
): NewsEvent {
  const context = `news article "${entryId}" events[${index}]`;
  const slug = optionalEventText(input.slug, `${context} slug`);
  const starts = parseEventTimestamp(input.starts_at, `${context} starts_at`);
  const ends = input.ends_at
    ? parseEventTimestamp(input.ends_at, `${context} ends_at`)
    : undefined;
  const location = optionalEventText(input.location, `${context} location`);
  const coordinates = normalizeEventCoordinates(input.coordinates, context);
  const organizer = normalizeEventOrganizer(
    input.organizer,
    `${context} organizer`,
  );
  const performer = normalizeEventPerformers(
    input.performer,
    `${context} performer`,
  );

  if (ends && ends.at.valueOf() <= starts.at.valueOf()) {
    throw new Error(`${context} ends_at must be later than starts_at`);
  }

  if (count > 1 && !slug) {
    throw new Error(
      `${context} slug is required when article has multiple events`,
    );
  }

  return {
    slug: slug ?? 'event',
    title: requiredEventText(input.title, `${context} title`),
    description: input.description
      ? requiredEventText(input.description, `${context} description`)
      : undefined,
    startsAt: starts.at,
    startsIso: starts.iso,
    startsTime: starts.time,
    icsUrl: articleEventIcsUrl({ ...route, event: slug ?? 'event' }),
    endsAt: ends?.at,
    endsIso: ends?.iso,
    endsTime: ends?.time,
    location,
    coordinates,
    organizer,
    performer,
  };
}

function normalizeEvents(
  input: readonly EventData[] | undefined,
  entryId: string,
  route: {
    readonly year: string;
    readonly month: string;
    readonly entry: string;
  },
): readonly NewsEvent[] {
  if (!input?.length) {
    return [];
  }

  const seen = new Set<string>();

  return input.map((item, index) => {
    const event = normalizeEvent(item, entryId, route, index, input.length);

    if (seen.has(event.slug)) {
      throw new Error(
        `news article "${entryId}" duplicate event slug "${event.slug}"`,
      );
    }

    seen.add(event.slug);

    return event;
  });
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
): NewsArticle {
  const parts = articleParts(entry);
  const published = parseEntryTimestamp(
    entry.data.date,
    `news article "${entry.id}"`,
    {
      year: parts.year,
      month: parts.month,
    },
  );
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
  const events = normalizeEvents(entry.data.events, entry.id, parts);
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
    pinned: isPinnedAtBuild(entry.data),
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
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): NewsDataset {
  const mentionRegistry = opts?.mentionRegistry ?? new Map();
  const authors = authorMap(authorsData);

  const articles: readonly NewsArticle[] = articlesData
    .map((item: ArticleEntry) =>
      normalizeArticle(item, authors, mentionRegistry),
    )
    .sort(compareArticlesPublishedDesc);

  validateUniqueIds(articles);
  validateDayKeyConflicts(articles);

  const list: readonly NewsListArticle[] = articles.map(toListArticle);
  const home: NewsHomeData = {
    pinned: list.filter((item) => item.pinned),
    latest: list.filter((item) => !item.pinned).slice(0, NEWS_LATEST_LIMIT),
  };
  const archives = buildArchives(list);
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
  const [authorsData, articlesData, mentionRegistry] = await Promise.all([
    getCollection('newsAuthors') as Promise<readonly NewsAuthorEntry[]>,
    getCollection('newsArticles') as Promise<readonly NewsArticleEntry[]>,
    loadPeopleMentionRegistry(),
  ]);

  return buildNewsDataset(authorsData, articlesData, { mentionRegistry });
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
