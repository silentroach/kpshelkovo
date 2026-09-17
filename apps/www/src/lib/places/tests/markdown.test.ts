import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';

import type { PlaceOpeningHours, PlaceWithBacklinks } from '../types';

let buildPlaceMarkdown: typeof import('../markdown').buildPlaceMarkdown;
let buildPlacesMarkdown: typeof import('../markdown').buildPlacesMarkdown;

const frontmatterSchema = z.strictObject({
  title: z.string().min(1),
  category: z.enum([
    'entrance',
    'children',
    'sport',
    'walking',
    'food',
    'services',
    'nature',
    'water',
    'infrastructure'
  ]),
  status: z.enum(['existing', 'planned', 'underConstruction']),
  address: z.string().min(1).optional(),
  coordinates: z.strictObject({ lat: z.number(), lng: z.number() }),
  html_url: z.url(),
  map_url: z.url(),
  contact_url: z.url().optional(),
  index_url: z.url(),
  opening_hours: z
    .strictObject({
      timezone: z.literal('Europe/Moscow'),
      description: z.string().min(1).optional(),
      periods: z
        .array(
          z.strictObject({
            days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).min(1),
            opens_at: z.string().regex(/^\d{2}:\d{2}$/u),
            closes_at: z.string().regex(/^\d{2}:\d{2}$/u)
          })
        )
        .min(1)
    })
    .optional()
});

const readCard = (value: PlaceWithBacklinks) => {
  const markdown = buildPlaceMarkdown(value);
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(markdown);
  if (!match) throw new Error('Expected leading YAML frontmatter');
  return { frontmatter: frontmatterSchema.parse(parse(match[1]!)), body: match[2]! };
};

const place: PlaceWithBacklinks = {
  showOnMap: true,
  slug: 'burzhuyka',
  name: 'Буржуйка',
  category: 'food',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
  body: 'Описание **места**.',
  mentions: [],
  backlinks: {
    news: [
      {
        section: 'news',
        kind: 'article',
        sourceId: '2026/07/food-truck',
        title: 'В Шелково открылся фудтрак',
        htmlUrl: '/news/2026/07/food-truck/',
        markdownUrl: '/news/2026/07/food-truck/index.md',
        excerpt: 'Фудтрак работает каждый день.',
        mentionedAt: '2026-07-23T09:00:00.000+03:00'
      }
    ],
    status: [],
    reviews: [],
    places: [],
    people: [],
    contacts: []
  },
  address: 'Шелково Форест, Берёзовая улица, 21А',
  coordinates: { lat: 55.060526, lng: 37.716242 },
  mapUrl: 'https://yandex.ru/navi/-/CTfgq-5r',
  openingHours: {
    description: 'С 10:00 до 22:00, вторник — выходной',
    periods: [
      {
        days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opensAt: '10:00',
        closesAt: '22:00'
      }
    ]
  },
  contact: {
    id: 'food/burzhuyka',
    url: '/sarafan/food/burzhuyka/'
  },
  url: '/map/burzhuyka/',
  markdownUrl: '/map/burzhuyka/index.md',
  canonical: 'https://kpshelkovo.online/map/burzhuyka/'
};

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ buildPlaceMarkdown, buildPlacesMarkdown } = await import('../markdown'));
});

describe('places Markdown', () => {
  it('publishes only public metadata with precise coordinates and absolute URLs', () => {
    const { frontmatter, body } = readCard({
      ...place,
      marker: 'foodtruck',
      nameCases: { gen: 'Буржуйки' },
      searchAliases: ['фудтрак'],
      geometry: {
        area: {
          precision: 'approximate',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [37.71, 55.06],
                [37.72, 55.06],
                [37.71, 55.07],
                [37.71, 55.06]
              ]
            ]
          }
        }
      }
    });
    expect(frontmatter).toMatchInlineSnapshot(`
      {
        "address": "Шелково Форест, Берёзовая улица, 21А",
        "category": "food",
        "contact_url": "https://example.com/sarafan/food/burzhuyka/",
        "coordinates": {
          "lat": 55.060526,
          "lng": 37.716242,
        },
        "html_url": "https://kpshelkovo.online/map/burzhuyka/",
        "index_url": "https://example.com/map/index.md",
        "map_url": "https://yandex.ru/navi/-/CTfgq-5r",
        "opening_hours": {
          "description": "С 10:00 до 22:00, вторник — выходной",
          "periods": [
            {
              "closes_at": "22:00",
              "days": [
                "mon",
                "wed",
                "thu",
                "fri",
                "sat",
                "sun",
              ],
              "opens_at": "10:00",
            },
          ],
          "timezone": "Europe/Moscow",
        },
        "status": "existing",
        "title": "Буржуйка",
      }
    `);
    expect(body).not.toMatch(
      /## (?:Сведения|Время работы|Ссылки)|Категория:|Статус:|Адрес:|Координаты:/u
    );
    expect(body).not.toContain(place.openingHours!.description);
    expect(body).not.toMatch(/yandex\.ru|\/sarafan\/|\/map\/index\.md/u);
  });

  it.each(['existing', 'planned', 'underConstruction'] as const)(
    'omits missing optional keys and preserves lifecycle code %s',
    (status) => {
      const { frontmatter, body } = readCard({
        ...place,
        address: undefined,
        contact: undefined,
        openingHours: undefined,
        status
      });
      expect(frontmatter.status).toBe(status);
      expect(Object.keys(frontmatter).sort()).toMatchInlineSnapshot(`
        [
          "category",
          "coordinates",
          "html_url",
          "index_url",
          "map_url",
          "status",
          "title",
        ]
      `);
      expect(body).not.toMatch(
        /Время работы|Часы работы|выходной|Открыто сейчас|Сейчас закрыто|неизвестно|расписание/iu
      );
    }
  );

  it.each([undefined, 'Вход со двора.'])(
    'preserves unsorted intervals, breaks and days off with optional note: %s',
    (description) => {
      const openingHours: PlaceOpeningHours = {
        description,
        periods: [
          { days: ['mon', 'tue', 'wed', 'thu', 'fri'], opensAt: '14:00', closesAt: '18:00' },
          { days: ['mon', 'tue', 'wed', 'thu', 'fri'], opensAt: '09:00', closesAt: '13:00' }
        ]
      };
      const { frontmatter, body } = readCard({ ...place, showOnMap: false, openingHours });
      expect(frontmatter.opening_hours?.periods).toMatchInlineSnapshot(`
        [
          {
            "closes_at": "18:00",
            "days": [
              "mon",
              "tue",
              "wed",
              "thu",
              "fri",
            ],
            "opens_at": "14:00",
          },
          {
            "closes_at": "13:00",
            "days": [
              "mon",
              "tue",
              "wed",
              "thu",
              "fri",
            ],
            "opens_at": "09:00",
          },
        ]
      `);
      expect(frontmatter.opening_hours?.description).toBe(description);
      expect(Object.keys(frontmatter.opening_hours!).sort()).toEqual(
        description ? ['description', 'periods', 'timezone'] : ['periods', 'timezone']
      );
      expect(body).not.toMatch(
        /Время работы|14:00|09:00|выходной|Вход со двора|Сейчас закрыто|Открыто сейчас/u
      );
    }
  );

  it.each([
    {
      name: 'daily hours',
      periods: [
        {
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          opensAt: '07:00',
          closesAt: '23:00'
        }
      ]
    },
    {
      name: 'matching hours on non-adjacent days with longer Friday and Saturday hours',
      periods: [
        { days: ['mon', 'tue', 'wed', 'thu', 'sun'], opensAt: '09:00', closesAt: '22:00' },
        { days: ['fri', 'sat'], opensAt: '09:00', closesAt: '23:00' }
      ]
    }
  ] as const)('roundtrips $name without printed grouping', ({ periods }) => {
    const { frontmatter, body } = readCard({ ...place, openingHours: { periods } });
    expect(
      frontmatter.opening_hours?.periods.map((period) => ({
        days: period.days,
        opensAt: period.opens_at,
        closesAt: period.closes_at
      }))
    ).toEqual(periods);
    expect(frontmatter.opening_hours).not.toHaveProperty('description');
    expect(body).not.toMatch(/Время работы|Ежедневно|07:00|09:00|22:00|23:00/u);
  });

  it('keeps index links and visibility unchanged', () => {
    const markdown = buildPlacesMarkdown([
      place,
      { ...place, slug: 'hidden', showOnMap: false, markdownUrl: '/map/hidden/index.md' }
    ]);
    expect(markdown).toContain('https://example.com/map/');
    expect(markdown).toContain('https://example.com/map/data/places.json');
    expect(markdown).toContain('https://example.com/map/burzhuyka/index.md');
    expect(markdown).not.toMatch(/^---|\/map\/hidden\/|apps\/www|src\/|repo:/u);
  });

  it('preserves hidden-card metadata, editorial body and grouped backlink context', () => {
    const { frontmatter, body } = readCard({
      ...place,
      showOnMap: false,
      mapUrl: 'https://yandex.ru/maps/?pt=37.716242,55.060526&z=17&l=map',
      body: 'Описание **места**. Рядом [Пляж](/map/beach/).',
      backlinks: {
        ...place.backlinks,
        places: [
          {
            section: 'places',
            kind: 'place',
            sourceId: 'beach',
            title: 'Пляж',
            htmlUrl: '/map/beach/',
            markdownUrl: '/map/beach/index.md',
            excerpt: 'Рядом с фудтраком.'
          }
        ]
      }
    });
    expect({ html: frontmatter.html_url, map: frontmatter.map_url, index: frontmatter.index_url })
      .toMatchInlineSnapshot(`
      {
        "html": "https://kpshelkovo.online/map/burzhuyka/",
        "index": "https://example.com/map/index.md",
        "map": "https://yandex.ru/maps/?pt=37.716242,55.060526&z=17&l=map",
      }
    `);
    expect(body).toContain(
      '# Буржуйка\n\nФудтрак в Шелково Форест\n\nОписание **места**. Рядом [Пляж](/map/beach/).'
    );
    expect(body).toContain('## Где упоминается\n\n### Новости');
    expect(body).toContain(
      '[В Шелково открылся фудтрак](https://example.com/news/2026/07/food-truck/index.md) — Новость; 23 июля 2026'
    );
    expect(body).toContain('Фудтрак работает каждый день.');
    expect(body).toContain('### Карта\n\n- [Пляж](https://example.com/map/beach/index.md) — Место');
    expect(body).toContain('Рядом с фудтраком.');
    expect(body).not.toMatch(/\?h=|apps\/www|src\/|repo:/u);
  });

  it('retains author headings and links even when they resemble generated metadata', () => {
    const { body } = readCard({
      ...place,
      body: `## Сведения\n\nАвторское **описание**.\n\n## Время работы\n\nУточняйте перед поездкой.\n\n## Ссылки\n\n[Карта](${place.mapUrl})`
    });
    expect(body.match(/^## Сведения$/gmu)).toHaveLength(1);
    expect(body).toContain('Авторское **описание**.');
    expect(body).toContain('## Время работы\n\nУточняйте перед поездкой.');
    expect(body).toContain(`## Ссылки\n\n[Карта](${place.mapUrl})`);
    expect(body).not.toContain('Координаты:');
  });

  it('keeps the title, summary and explicit empty state without editorial body', () => {
    const { body } = readCard({
      ...place,
      body: '',
      backlinks: {
        news: [],
        status: [],
        reviews: [],
        places: [],
        people: [],
        contacts: []
      }
    });

    expect(body.trim()).toMatchInlineSnapshot(`
      "# Буржуйка

      Фудтрак в Шелково Форест

      ## Где упоминается

      - Пока публичных упоминаний не найдено."
    `);
  });
});
