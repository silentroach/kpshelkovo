import { padNumber } from '@shelkovo/format';

import { canon, withBase } from '../site';
import { normalizeTagKey } from './schema';

const NEWS_ROOT = '/news/';
const NEWS_MARKDOWN = '/news/index.md';
const NEWS_ARCHIVE_ROOT = '/news/archive/';
const NEWS_ARCHIVE_MARKDOWN = '/news/archive/index.md';
const TAGS_ROOT = '/news/tags/';
const TAGS_MARKDOWN = '/news/tags/index.md';
const DATA_ARTICLES = '/news/data/articles.json';
const FEED = '/news/feed.xml';
const LLMS = '/news/llms.txt';
const LLMS_FULL = '/news/llms-full.txt';
const API_CATALOG = '/news/.well-known/api-catalog';
const ARTICLES_SCHEMA = '/news/schemas/articles.schema.json';
const ARTICLES_OPENAPI = '/news/openapi/articles.openapi.json';

export const newsPath = (): string => NEWS_ROOT;

export const newsMarkdownPath = (): string => NEWS_MARKDOWN;

export const newsArchivePath = (): string => NEWS_ARCHIVE_ROOT;

export const newsArchiveMarkdownPath = (): string => NEWS_ARCHIVE_MARKDOWN;

export const articlesDataPath = (): string => DATA_ARTICLES;

export const feedPath = (): string => FEED;

export const llmsPath = (): string => LLMS;

export const llmsFullPath = (): string => LLMS_FULL;

export const apiCatalogPath = (): string => API_CATALOG;

export const articlesSchemaPath = (): string => ARTICLES_SCHEMA;

export const articlesOpenApiPath = (): string => ARTICLES_OPENAPI;

export const tagsPath = (): string => TAGS_ROOT;

export const tagsMarkdownPath = (): string => TAGS_MARKDOWN;

export interface NewsArticleRouteInput {
  readonly year: number | string;
  readonly month: number | string;
  readonly entry: string;
}

export interface NewsArticleEventRouteInput extends NewsArticleRouteInput {
  readonly event: string;
}

const need = (value: string, name: string): string => {
  const text = value.trim();

  if (!text) {
    throw new Error(`${name} is required`);
  }

  return text;
};

const tagKey = (value: string): string => {
  const key = normalizeTagKey(value);

  if (!key) {
    throw new Error('tag key is required');
  }

  return key;
};

const yearPath = (year: number | string): string =>
  `/news/${padNumber(year, 4)}/`;

const monthPath = (year: number | string, month: number | string): string =>
  `/news/${padNumber(year, 4)}/${padNumber(month, 2)}/`;

const articlePath = (input: NewsArticleRouteInput): string =>
  `${monthPath(input.year, input.month)}${need(input.entry, 'entry')}/`;

const tagPath = (value: string): string => `/news/tags/${tagKey(value)}/`;

export const yearPattern = (): string => '/news/:year/';

export const yearMarkdownPattern = (): string => '/news/:year/index.md';

export const monthPattern = (): string => '/news/:year/:month/';

export const monthMarkdownPattern = (): string => '/news/:year/:month/index.md';

export const articlePattern = (): string => '/news/:year/:month/:entry/';

export const articleMarkdownPattern = (): string =>
  '/news/:year/:month/:entry/index.md';

export const articleEventIcsPattern = (): string =>
  '/news/:year/:month/:entry/:event.ics';

export const tagPattern = (): string => '/news/tags/:tag/';

export const tagMarkdownPattern = (): string => '/news/tags/:tag/index.md';

export const newsUrl = (): string => withBase(NEWS_ROOT);

export const newsMarkdownUrl = (): string => withBase(NEWS_MARKDOWN);

export const newsArchiveUrl = (): string => withBase(NEWS_ARCHIVE_ROOT);

export const newsArchiveMarkdownUrl = (): string =>
  withBase(NEWS_ARCHIVE_MARKDOWN);

export const newsCanonical = (): string => canon(NEWS_ROOT);

export const yearUrl = (year: number | string): string =>
  withBase(yearPath(year));

export const yearMarkdownUrl = (year: number | string): string =>
  withBase(`${yearPath(year)}index.md`);

export const monthUrl = (
  year: number | string,
  month: number | string,
): string => withBase(monthPath(year, month));

export const monthMarkdownUrl = (
  year: number | string,
  month: number | string,
): string => withBase(`${monthPath(year, month)}index.md`);

export const articleUrl = (input: NewsArticleRouteInput): string =>
  withBase(articlePath(input));

export const articleMarkdownUrl = (input: NewsArticleRouteInput): string =>
  withBase(`${articlePath(input)}index.md`);

export const articleEventIcsUrl = (input: NewsArticleEventRouteInput): string =>
  withBase(`${articlePath(input)}${need(input.event, 'event')}.ics`);

export const articleCanonical = (input: NewsArticleRouteInput): string =>
  canon(articlePath(input));

export const tagsUrl = (): string => withBase(TAGS_ROOT);

export const tagsMarkdownUrl = (): string => withBase(TAGS_MARKDOWN);

export const tagUrl = (value: string): string => withBase(tagPath(value));

export const tagMarkdownUrl = (value: string): string =>
  withBase(`${tagPath(value)}index.md`);

export const articlesDataUrl = (): string => withBase(DATA_ARTICLES);

export const feedUrl = (): string => withBase(FEED);

export const llmsUrl = (): string => withBase(LLMS);

export const llmsFullUrl = (): string => withBase(LLMS_FULL);

export const apiCatalogUrl = (): string => withBase(API_CATALOG);

export const articlesSchemaUrl = (): string => withBase(ARTICLES_SCHEMA);

export const articlesOpenApiUrl = (): string => withBase(ARTICLES_OPENAPI);
