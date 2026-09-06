import { absoluteUrl } from '../site';
import type {
  NewsArticle,
  NewsAttachment,
  NewsAuthor,
  NewsDataset,
  NewsEvent,
  NewsMonthArchive,
  NewsPhoto,
  NewsTag,
  NewsTagPage,
  NewsYearArchive,
} from './types';
import { buildNewsEventMapUrl } from './view';

export const NEWS_PUBLIC_AUTHOR_KINDS = [
  'official',
  'community',
  'editorial',
  'other',
] as const;
export type NewsPublicAuthorKind = (typeof NEWS_PUBLIC_AUTHOR_KINDS)[number];

export interface NewsPublicAuthor {
  readonly id: string;
  readonly name: string;
  readonly kind: NewsPublicAuthorKind;
  readonly url?: string;
}

export interface NewsPublicTag {
  readonly label: string;
  readonly key: string;
  readonly url: string;
}

export interface NewsPublicPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption?: string;
}

export interface NewsPublicAttachment {
  readonly title: string;
  readonly url: string;
  readonly type?: string;
  readonly size?: string;
}

export interface NewsPublicCover {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface NewsPublicEventOrganizer {
  readonly name: string;
  readonly type: 'organization' | 'person';
}

export interface NewsPublicEvent {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly starts_at: string;
  readonly ends_at?: string;
  readonly location?: string;
  readonly coordinates?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly map_url?: string;
  readonly ics_url: string;
  readonly organizer?: NewsPublicEventOrganizer;
  readonly performer?: readonly NewsPublicEventOrganizer[];
}

export interface NewsPublicArticle {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly published_at: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly entry: string;
  readonly html_url: string;
  readonly markdown_url: string;
  readonly source_url?: string;
  readonly pinned: boolean;
  readonly author: NewsPublicAuthor;
  readonly areas: readonly string[];
  readonly tags: readonly NewsPublicTag[];
  readonly cover?: NewsPublicCover;
  readonly events?: readonly NewsPublicEvent[];
  readonly photos: readonly NewsPublicPhoto[];
  readonly attachments: readonly NewsPublicAttachment[];
  readonly body_markdown: string;
}

export interface NewsPublicArchiveMonth {
  readonly year: number;
  readonly month: number;
  readonly count: number;
  readonly url: string;
  readonly markdown_url: string;
}

export interface NewsPublicArchiveYear {
  readonly year: number;
  readonly count: number;
  readonly url: string;
  readonly markdown_url: string;
  readonly months: readonly NewsPublicArchiveMonth[];
}

export interface NewsPublicTagPage {
  readonly label: string;
  readonly key: string;
  readonly count: number;
  readonly url: string;
  readonly markdown_url: string;
}

export interface NewsPublicPayload {
  readonly schema_version: string;
  readonly generated_at: string;
  readonly updated_at: string;
  readonly total_count: number;
  readonly articles: readonly NewsPublicArticle[];
  readonly archives: {
    readonly years: readonly NewsPublicArchiveYear[];
  };
  readonly tags: readonly NewsPublicTagPage[];
}

export const NEWS_PUBLIC_PAYLOAD_SCHEMA_VERSION = '1.0.0';

const NEWS_PUBLIC_AUTHOR_KIND_BY_DOMAIN = {
  official: 'official',
  community: 'community',
  editorial: 'editorial',
  other: 'other',
} as const satisfies Record<NewsAuthor['kind'], NewsPublicAuthorKind>;

const fullUrl = (value: string): string => absoluteUrl(value);

const discoveryUrl = (value: string): string =>
  value.startsWith('/') ? fullUrl(value) : value;

const toPublicAuthor = (author: NewsAuthor): NewsPublicAuthor => ({
  id: author.id,
  name: author.name,
  kind: NEWS_PUBLIC_AUTHOR_KIND_BY_DOMAIN[author.kind],
  url: author.url ? fullUrl(author.url) : undefined,
});

const toPublicTag = (tag: NewsTag): NewsPublicTag => ({
  label: tag.label,
  key: tag.key,
  url: fullUrl(tag.url),
});

const toPublicPhoto = (item: NewsPhoto): NewsPublicPhoto => ({
  url: fullUrl(item.url),
  width: item.width,
  height: item.height,
  alt: item.alt,
  caption: item.caption,
});

const toPublicAttachment = (item: NewsAttachment): NewsPublicAttachment => ({
  title: item.title,
  url: fullUrl(item.url),
  type: item.type,
  size: item.size,
});

function toPublicCover(article: NewsArticle): NewsPublicCover | undefined {
  const cover = article.cover;

  if (!cover) return undefined;

  return {
    url: fullUrl(cover.url),
    alt: cover.alt,
    width: cover.width,
    height: cover.height,
  };
}

function toPublicEvent(item: NewsEvent): NewsPublicEvent {
  const mapUrl = buildNewsEventMapUrl(item);

  return {
    slug: item.slug,
    title: item.title,
    description: item.description,
    starts_at: item.startsIso,
    ends_at: item.endsIso,
    location: item.location,
    coordinates: item.coordinates,
    map_url: mapUrl ? discoveryUrl(mapUrl) : undefined,
    ics_url: fullUrl(item.icsUrl),
    organizer: item.organizer,
    performer: item.performer,
  };
}

function toPublicArticle(item: NewsArticle): NewsPublicArticle {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    published_at: item.publishedIso,
    year: item.year,
    month: item.month,
    day: item.day,
    entry: item.entry,
    html_url: item.canonical,
    markdown_url: fullUrl(item.markdownUrl),
    source_url: item.sourceUrl ? fullUrl(item.sourceUrl) : undefined,
    pinned: item.pinned,
    author: toPublicAuthor(item.author),
    areas: [...item.areas],
    tags: item.tags.map(toPublicTag),
    cover: toPublicCover(item),
    events: item.events.length > 0 ? item.events.map(toPublicEvent) : undefined,
    photos: item.photos.map(toPublicPhoto),
    attachments: item.attachments.map(toPublicAttachment),
    body_markdown: item.body,
  };
}

const toPublicArchiveMonth = (
  item: NewsMonthArchive,
): NewsPublicArchiveMonth => ({
  year: item.year,
  month: item.month,
  count: item.count,
  url: fullUrl(item.url),
  markdown_url: fullUrl(item.markdownUrl),
});

const toPublicArchiveYear = (item: NewsYearArchive): NewsPublicArchiveYear => ({
  year: item.year,
  count: item.count,
  url: fullUrl(item.url),
  markdown_url: fullUrl(item.markdownUrl),
  months: item.months.map(toPublicArchiveMonth),
});

const toPublicTagPage = (item: NewsTagPage): NewsPublicTagPage => ({
  label: item.label,
  key: item.key,
  count: item.count,
  url: fullUrl(item.url),
  markdown_url: fullUrl(item.markdownUrl),
});

function latestUpdate(data: NewsDataset): string | undefined {
  let latest:
    | {
        readonly at: Date;
        readonly iso: string;
      }
    | undefined;

  for (const item of data.articles) {
    const current = {
      at: item.publishedAt,
      iso: item.publishedIso,
    };

    if (!latest || current.at.valueOf() > latest.at.valueOf()) {
      latest = current;
    }
  }

  return latest?.iso;
}

export const toNewsPublicPayload = (
  data: NewsDataset,
  opts?: { readonly generatedAt?: Date },
): NewsPublicPayload => {
  const generatedAt = (opts?.generatedAt ?? new Date()).toISOString();

  return {
    schema_version: NEWS_PUBLIC_PAYLOAD_SCHEMA_VERSION,
    generated_at: generatedAt,
    updated_at: latestUpdate(data) ?? generatedAt,
    total_count: data.articles.length,
    articles: data.articles.map(toPublicArticle),
    archives: {
      years: data.archives.years.map(toPublicArchiveYear),
    },
    tags: data.tags.map(toPublicTagPage),
  };
};
