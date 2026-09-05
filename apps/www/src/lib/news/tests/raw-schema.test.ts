import { describe, expect, it } from 'vitest';
import type { SchemaContext } from 'astro:content';
import { z } from 'astro/zod';

import {
  createRawNewsArticleSchema,
  RawNewsAuthorSchema,
  RawNewsEventsSchema,
} from '../raw-schema';

const image: SchemaContext['image'] = () =>
  z.object({
    src: z.string(),
    width: z.number(),
    height: z.number(),
    format: z.union([
      z.literal('png'),
      z.literal('jpg'),
      z.literal('jpeg'),
      z.literal('tiff'),
      z.literal('webp'),
      z.literal('gif'),
      z.literal('svg'),
      z.literal('avif'),
      z.literal('apng'),
    ]),
  });
const articleSchema = createRawNewsArticleSchema(image);

const article = {
  title: 'Заголовок новости',
  summary: 'Краткое описание новости.',
  date: '05.05.2026',
  author: 'editorial',
};

const photo = {
  url: 'https://media.kpshelkovo.online/news/2026/05/article/photo.jpeg',
  width: 1280,
  height: 960,
  alt: 'Фото с места',
};

const cover = {
  src: '/src/data/news/articles/2026/05/article/cover.jpeg',
  width: 1200,
  height: 675,
  format: 'jpeg' as const,
};

const event = {
  title: 'Встреча по регламенту',
  starts_at: '31.05.2026 19:00',
};

const validationIssues = <Output>(
  result: z.ZodSafeParseResult<Output>,
  subject: string,
) => {
  if (result.success) {
    throw new Error(`Expected ${subject} validation to fail`);
  }

  return result.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
};

const articleValidationIssues = (input: unknown) =>
  validationIssues(articleSchema.safeParse(input), 'news article');

const authorValidationIssues = (input: unknown) =>
  validationIssues(RawNewsAuthorSchema.safeParse(input), 'news author');

const eventValidationIssues = (input: unknown) =>
  validationIssues(RawNewsEventsSchema.safeParse(input), 'news events');

describe('news article raw schema', () => {
  it('trims valid visible article fields without changing their shape', () => {
    const parsed = articleSchema.parse({
      ...article,
      title: '  Заголовок новости  ',
      summary: '  Краткое описание новости.  ',
      cover,
      cover_alt: '  Вид на поселок  ',
      attachments: [
        {
          title: '  Публичный договор  ',
          url: '/documents/contract.pdf',
          type: '  PDF  ',
          size: '  1 МБ  ',
        },
      ],
      photos: [
        {
          ...photo,
          alt: '  Фото с места  ',
          caption: '  Подпись к фотографии.  ',
        },
      ],
      seo: {
        title: '  Короткий заголовок  ',
        description: '  Описание для поисковой выдачи.  ',
      },
    });

    expect({
      title: parsed.title,
      summary: parsed.summary,
      cover_alt: parsed.cover_alt,
      attachments: parsed.attachments,
      photos: parsed.photos,
      seo: parsed.seo,
    }).toMatchInlineSnapshot(`
      {
        "attachments": [
          {
            "size": "1 МБ",
            "title": "Публичный договор",
            "type": "PDF",
            "url": "/documents/contract.pdf",
          },
        ],
        "cover_alt": "Вид на поселок",
        "photos": [
          {
            "alt": "Фото с места",
            "caption": "Подпись к фотографии.",
            "height": 960,
            "url": "https://media.kpshelkovo.online/news/2026/05/article/photo.jpeg",
            "width": 1280,
          },
        ],
        "seo": {
          "description": "Описание для поисковой выдачи.",
          "title": "Короткий заголовок",
        },
        "summary": "Краткое описание новости.",
        "title": "Заголовок новости",
      }
    `);
  });

  it.each([
    {
      field: 'title',
      input: { ...article, title: ' \t ' },
      path: ['title'],
    },
    {
      field: 'summary',
      input: { ...article, summary: ' \t ' },
      path: ['summary'],
    },
    {
      field: 'attachments[].title',
      input: {
        ...article,
        attachments: [{ title: ' \t ', url: '/documents/contract.pdf' }],
      },
      path: ['attachments', 0, 'title'],
    },
    {
      field: 'attachments[].type',
      input: {
        ...article,
        attachments: [
          {
            title: 'Публичный договор',
            url: '/documents/contract.pdf',
            type: ' \t ',
          },
        ],
      },
      path: ['attachments', 0, 'type'],
    },
    {
      field: 'attachments[].size',
      input: {
        ...article,
        attachments: [
          {
            title: 'Публичный договор',
            url: '/documents/contract.pdf',
            size: ' \t ',
          },
        ],
      },
      path: ['attachments', 0, 'size'],
    },
    {
      field: 'photos[].alt',
      input: { ...article, photos: [{ ...photo, alt: ' \t ' }] },
      path: ['photos', 0, 'alt'],
    },
    {
      field: 'photos[].caption',
      input: { ...article, photos: [{ ...photo, caption: ' \t ' }] },
      path: ['photos', 0, 'caption'],
    },
    {
      field: 'seo.title',
      input: { ...article, seo: { title: ' \t ' } },
      path: ['seo', 'title'],
    },
    {
      field: 'seo.description',
      input: { ...article, seo: { description: ' \t ' } },
      path: ['seo', 'description'],
    },
  ])('rejects whitespace-only $field at its path', ({ field, input, path }) => {
    expect(articleValidationIssues(input)).toEqual([
      { path, message: `${field} must not be blank` },
    ]);
  });

  it.each([
    { case: 'omitted', input: { ...article, cover } },
    { case: 'blank', input: { ...article, cover, cover_alt: ' \t ' } },
  ])('requires a non-blank cover_alt when it is $case', ({ input }) => {
    expect(articleValidationIssues(input)).toEqual([
      {
        path: ['cover_alt'],
        message: 'cover_alt is required when cover is set',
      },
    ]);
  });
});

describe('RawNewsAuthorSchema', () => {
  it('trims valid visible author fields', () => {
    expect(
      RawNewsAuthorSchema.parse({
        name: '  Редакция  ',
        kind: 'editorial',
        short_name: '  Редакция  ',
      }),
    ).toMatchInlineSnapshot(`
      {
        "kind": "editorial",
        "name": "Редакция",
        "short_name": "Редакция",
      }
    `);
  });

  it.each([
    { field: 'name', input: { name: ' \t ', kind: 'editorial' } },
    {
      field: 'short_name',
      input: { name: 'Редакция', kind: 'editorial', short_name: ' \t ' },
    },
  ])('rejects whitespace-only $field at its path', ({ field, input }) => {
    expect(authorValidationIssues(input)).toEqual([
      { path: [field], message: `${field} must not be blank` },
    ]);
  });
});

describe('RawNewsEventsSchema', () => {
  it('trims valid event text at the raw boundary', () => {
    const [parsed] = RawNewsEventsSchema.parse([
      {
        title: '  Встреча по регламенту  ',
        description: '  Обсудим новый регламент.  ',
        starts_at: '31.05.2026 19:00',
        ends_at: '31.05.2026 21:00',
        location: '  Эко-клуб  ',
        organizer: '  ОК Комфорт  ',
        performer: ['  Ведущий  '],
      },
    ]);
    if (!parsed) {
      throw new Error('Expected a parsed news event');
    }

    expect({
      title: parsed.title,
      description: parsed.description,
      location: parsed.location,
      organizer: parsed.organizer,
      performer: parsed.performer,
    }).toMatchInlineSnapshot(`
      {
        "description": "Обсудим новый регламент.",
        "location": "Эко-клуб",
        "organizer": "ОК Комфорт",
        "performer": [
          "Ведущий",
        ],
        "title": "Встреча по регламенту",
      }
    `);
  });

  it.each([
    {
      name: 'start without time',
      input: [{ ...event, starts_at: '31.05.2026' }],
      message: 'events[].starts_at must use dd.mm.yyyy hh:mm and include time',
    },
    {
      name: 'end without time',
      input: [{ ...event, ends_at: '31.05.2026' }],
      message: 'events[].ends_at must use dd.mm.yyyy hh:mm and include time',
    },
    {
      name: 'invalid coordinates',
      input: [{ ...event, coordinates: { lat: 91, lng: 38 } }],
      message: 'events[].coordinates.lat must be between -90 and 90',
    },
    {
      name: 'blank performer',
      input: [{ ...event, performer: ['   '] }],
      message: 'events[].performer[] must not be blank',
    },
  ])('rejects $name', ({ input, message }) => {
    expect(eventValidationIssues(input).map((issue) => issue.message)).toEqual([
      message,
    ]);
  });

  it('rejects an event that does not end after it starts', () => {
    expect(
      eventValidationIssues([
        {
          ...event,
          ends_at: '31.05.2026 19:00',
        },
      ]),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "events[].ends_at must be later than events[].starts_at",
          "path": [
            0,
            "ends_at",
          ],
        },
      ]
    `);
  });

  it('requires unique explicit slugs for multiple events', () => {
    expect(
      eventValidationIssues([
        event,
        { ...event, slug: 'meeting' },
        { ...event, slug: 'meeting' },
      ]),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "events[].slug is required when article has multiple events",
          "path": [
            0,
            "slug",
          ],
        },
        {
          "message": "duplicate event slug \"meeting\"",
          "path": [
            2,
            "slug",
          ],
        },
      ]
    `);
  });
});
