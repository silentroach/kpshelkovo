import { z } from 'zod';

import {
  NEWS_PUBLIC_AUTHOR_KINDS,
  NEWS_PUBLIC_PAYLOAD_SCHEMA_VERSION,
  type NewsPublicArchiveMonth,
  type NewsPublicArchiveYear,
  type NewsPublicArticle,
  type NewsPublicAttachment,
  type NewsPublicAuthor,
  type NewsPublicCover,
  type NewsPublicEvent,
  type NewsPublicEventOrganizer,
  type NewsPublicPayload,
  type NewsPublicPhoto,
  type NewsPublicTag,
  type NewsPublicTagPage
} from './public-dto';
import type { PublicShape } from './public-schema.types';
import { NEWS_AREAS } from './schema';

const text = z.string().min(1);
const uri = z.url();
const dateTime = z.iso.datetime({ offset: true });
const count = z.number().int().min(0);
const dimension = z.number().int().min(1);
const year = z.number().int().min(2000).max(2999);
const month = z.number().int().min(1).max(12);

const author = z
  .strictObject({
    id: text,
    name: text,
    kind: z.enum(NEWS_PUBLIC_AUTHOR_KINDS),
    url: uri.optional()
  } satisfies PublicShape<NewsPublicAuthor>)
  .meta({ id: 'author' });

const tag = z
  .strictObject({
    label: text,
    key: text,
    url: uri
  } satisfies PublicShape<NewsPublicTag>)
  .meta({ id: 'tag' });

const tagPage = z
  .strictObject({
    label: text,
    key: text,
    count,
    url: uri,
    markdown_url: uri
  } satisfies PublicShape<NewsPublicTagPage>)
  .meta({ id: 'tagPage' });

const photo = z
  .strictObject({
    url: uri,
    width: dimension,
    height: dimension,
    alt: text,
    caption: text.optional()
  } satisfies PublicShape<NewsPublicPhoto>)
  .meta({ id: 'photo' });

const attachment = z
  .strictObject({
    title: text,
    url: uri,
    type: text.optional(),
    size: text.optional()
  } satisfies PublicShape<NewsPublicAttachment>)
  .meta({ id: 'attachment' });

const cover = z
  .strictObject({
    url: uri,
    alt: text,
    width: dimension,
    height: dimension
  } satisfies PublicShape<NewsPublicCover>)
  .meta({ id: 'cover' });

const coordinates = z
  .strictObject({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  } satisfies PublicShape<NonNullable<NewsPublicEvent['coordinates']>>)
  .meta({ id: 'coordinates' });

const eventParticipant = z
  .strictObject({
    name: text,
    type: z.enum(['organization', 'person'])
  } satisfies PublicShape<NewsPublicEventOrganizer>)
  .meta({ id: 'eventParticipant' });

const event = z
  .strictObject({
    slug: text,
    title: text,
    description: text.optional(),
    starts_at: dateTime,
    ends_at: dateTime.optional(),
    location: text.optional(),
    coordinates: coordinates.optional(),
    map_url: uri.optional(),
    ics_url: uri,
    organizer: eventParticipant.optional(),
    performer: z.array(eventParticipant).optional()
  } satisfies PublicShape<NewsPublicEvent>)
  .meta({ id: 'event' });

const areas = z
  .array(z.enum(NEWS_AREAS))
  .min(1)
  .refine((items) => new Set(items).size === items.length)
  .meta({ uniqueItems: true });

const article = z
  .strictObject({
    id: z.string().regex(/^\d{4}\/\d{2}\/[^/]+$/),
    title: text,
    summary: text,
    published_at: dateTime,
    year,
    month,
    day: z.number().int().min(1).max(31),
    entry: text,
    html_url: uri,
    markdown_url: uri,
    source_url: uri.optional(),
    pinned: z.boolean(),
    author,
    areas,
    tags: z.array(tag),
    cover: cover.optional(),
    events: z.array(event).min(1).optional(),
    photos: z.array(photo),
    attachments: z.array(attachment),
    body_markdown: z.string()
  } satisfies PublicShape<NewsPublicArticle>)
  .meta({ id: 'article' });

const archiveMonth = z
  .strictObject({
    year,
    month,
    count,
    url: uri,
    markdown_url: uri
  } satisfies PublicShape<NewsPublicArchiveMonth>)
  .meta({ id: 'archiveMonth' });

const archiveYear = z
  .strictObject({
    year,
    count,
    url: uri,
    markdown_url: uri,
    months: z.array(archiveMonth)
  } satisfies PublicShape<NewsPublicArchiveYear>)
  .meta({ id: 'archiveYear' });

export const newsPublicPayloadSchema = z
  .strictObject({
    schema_version: z.literal(NEWS_PUBLIC_PAYLOAD_SCHEMA_VERSION),
    generated_at: dateTime,
    updated_at: dateTime,
    total_count: count,
    articles: z.array(article),
    archives: z.strictObject({
      years: z.array(archiveYear)
    } satisfies PublicShape<NewsPublicPayload['archives']>),
    tags: z.array(tagPage)
  } satisfies PublicShape<NewsPublicPayload>)
  .meta({
    title: 'NewsArticlesPayload',
    description:
      'Полная лента новостей только для чтения: метаданные ленты, канонический HTML URL, Markdown-версии, полный body_markdown и необязательные метаданные событий с ics_url внутри статьи.'
  });

export const buildNewsPublicJsonSchema = (id: string): Record<string, unknown> => ({
  ...z.toJSONSchema(newsPublicPayloadSchema, {
    target: 'draft-2020-12',
    override: ({ jsonSchema }) => {
      // Preserve the published constraints rather than adding Zod-specific bounds/patterns.
      if (jsonSchema.type === 'integer' && jsonSchema.maximum === Number.MAX_SAFE_INTEGER) {
        delete jsonSchema.maximum;
      }
      if (jsonSchema.format === 'date-time') delete jsonSchema.pattern;
      if (jsonSchema.pattern) jsonSchema.pattern = jsonSchema.pattern.replaceAll('\\/', '/');
      if (jsonSchema.enum || jsonSchema.const !== undefined) delete jsonSchema.type;
    }
  }),
  $id: id
});
