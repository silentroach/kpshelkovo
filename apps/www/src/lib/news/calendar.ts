import { renderEventIcs } from '@shelkovo/ical';

import type { NewsArticle, NewsArticleWithEvent, NewsEvent } from './types';

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

export const hasArticleEvents = (article: NewsArticle): article is NewsArticleWithEvent =>
  article.events.length > 0;

const safeToken = (value: string): string => {
  const token = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return token || 'event';
};

const articleHost = (article: NewsArticle): string => new URL(article.canonical).host;

export const articleEventIcsFilename = (event: Pick<NewsEvent, 'slug'>): string =>
  `${safeToken(event.slug)}.ics`;

const articleEventUid = (article: NewsArticle, event: NewsEvent): string =>
  `${safeToken(`news-event-${article.id}-${event.slug}`)}@${articleHost(article)}`;

export const buildArticleEventIcs = (article: NewsArticle, event: NewsEvent): string =>
  renderEventIcs({
    uid: articleEventUid(article, event),
    prodId: `-//${articleHost(article)}//News Events//RU`,
    timestamp: article.publishedAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? new Date(event.startsAt.valueOf() + DEFAULT_EVENT_DURATION_MS),
    title: event.title,
    description: [event.description ?? article.summary, event.locationDetails]
      .filter(Boolean)
      .join('\n\n'),
    url: article.canonical,
    location: event.place
      ? {
          name: event.place.name,
          address: event.place.address,
          latitude: event.place.coordinates.lat,
          longitude: event.place.coordinates.lng
        }
      : undefined
  });
