import { buildEventIcs } from '@/lib/events/ics';

import type { NewsArticle, NewsEvent } from './types';

export const articleEventIcsFilename = (event: Pick<NewsEvent, 'slug'>): string =>
  `${event.slug}.ics`;

export const buildArticleEventIcs = (article: NewsArticle, event: NewsEvent): string =>
  buildEventIcs(event, article.canonical, article.publishedAt, article.canonical);
