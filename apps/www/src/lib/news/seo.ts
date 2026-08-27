import type { SchemaDoc } from '@shelkovo/seo';

import { breadcrumbListSchema } from '@/lib/json-ld';
import type { BreadcrumbLink } from '@/lib/json-ld-types';

import { absoluteUrl } from '../site';
import type { NewsEvent } from './types';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';

interface BasePageInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

type AuthorInput = SchemaDoc | readonly SchemaDoc[] | undefined;

interface ArticleInput extends BasePageInput {
  readonly type: 'NewsArticle' | 'TechArticle';
  readonly datePublished?: string;
  readonly dateModified?: string;
  readonly image?: string | readonly string[];
  readonly author?: AuthorInput;
}

export interface NewsArticleEventInput extends Pick<
  NewsEvent,
  | 'slug'
  | 'title'
  | 'description'
  | 'startsIso'
  | 'endsIso'
  | 'location'
  | 'coordinates'
  | 'organizer'
  | 'performer'
> {}

export interface NewsArticleInput extends Omit<ArticleInput, 'type'> {
  readonly events?: readonly NewsArticleEventInput[];
}

export interface TechArticleInput extends Omit<ArticleInput, 'type'> {}

const imageValue = (
  image: string | readonly string[] | undefined,
): string | readonly string[] | undefined => {
  if (!image) return undefined;
  if (typeof image !== 'string') {
    return image.map((item) => absoluteUrl(item));
  }

  return absoluteUrl(image);
};

const articleSchema = (input: ArticleInput): readonly SchemaDoc[] => {
  const url = absoluteUrl(input.url);
  const image = imageValue(input.image);
  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': input.type,
      headline: input.name,
      name: input.name,
      description: input.description,
      url,
      mainEntityOfPage: url,
      inLanguage: LANG,
      ...(input.datePublished ? { datePublished: input.datePublished } : {}),
      ...(input.dateModified ? { dateModified: input.dateModified } : {}),
      ...(image ? { image } : {}),
      ...(input.author ? { author: input.author } : {}),
    },
  ];

  if (input.breadcrumbs?.length) {
    docs.push(breadcrumbListSchema(input.breadcrumbs));
  }

  return docs;
};

const eventLocationSchema = (
  event: NewsArticleEventInput,
): SchemaDoc | undefined => {
  if (!event.location && !event.coordinates) {
    return undefined;
  }

  return {
    '@type': 'Place',
    ...(event.location
      ? {
          name: event.location,
          address: event.location,
        }
      : {}),
    ...(event.coordinates
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: event.coordinates.lat,
            longitude: event.coordinates.lng,
          },
        }
      : {}),
  };
};

const schemaType = (type: 'organization' | 'person'): string =>
  type === 'person' ? 'Person' : 'Organization';

const performerSchema = (
  items: NewsEvent['performer'],
): SchemaDoc | readonly SchemaDoc[] | undefined => {
  if (!items?.length) {
    return undefined;
  }

  const docs = items.map((item) => ({
    '@type': schemaType(item.type),
    name: item.name,
  }));

  return docs.length === 1 ? docs[0] : docs;
};

const newsEventSchema = (input: NewsArticleInput): readonly SchemaDoc[] => {
  const events = input.events ?? [];

  const url = absoluteUrl(input.url);

  return events.map((event) => {
    const location = eventLocationSchema(event);
    const performer = performerSchema(event.performer);

    return {
      '@context': CONTEXT,
      '@type': 'Event',
      '@id': `${url}#event-${event.slug}`,
      name: event.title,
      description: event.description ?? input.description,
      url,
      mainEntityOfPage: url,
      inLanguage: LANG,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      startDate: event.startsIso,
      ...(event.endsIso ? { endDate: event.endsIso } : {}),
      ...(location ? { location } : {}),
      ...(event.organizer
        ? {
            organizer: {
              '@type': schemaType(event.organizer.type),
              name: event.organizer.name,
            },
          }
        : {}),
      ...(performer ? { performer } : {}),
    };
  });
};

export const newsArticleSchema = (
  input: NewsArticleInput,
): readonly SchemaDoc[] => {
  const events = newsEventSchema(input);

  return [...articleSchema({ ...input, type: 'NewsArticle' }), ...events];
};

export const techArticleSchema = (
  input: TechArticleInput,
): readonly SchemaDoc[] => articleSchema({ ...input, type: 'TechArticle' });
