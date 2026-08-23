import { beforeAll, describe, expect, it } from 'vitest';

import type { PersonProfile } from './types';

let buildPeoplePublicPayload: typeof import('./public-dto').buildPeoplePublicPayload;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildPeoplePublicPayload } = await import('./public-dto'));
});

const profile = (): PersonProfile => ({
  id: 'kschemelinin',
  slug: 'kschemelinin',
  name: 'Кирилл Щемелинин',
  nameCases: {
    gen: 'Кирилла Щемелинина',
  },
  company: 'ОК "Комфорт"',
  position: 'Исполняющий обязанности директора по эксплуатации',
  url: '/people/kschemelinin/',
  markdownUrl: '/people/kschemelinin/index.md',
  canonical: 'https://example.com/people/kschemelinin/',
  contacts: [
    {
      type: 'telegram',
      value: '@Kirill_ZemlyaMO',
      display: '@Kirill_ZemlyaMO',
      href: 'https://t.me/Kirill_ZemlyaMO',
    },
  ],
  body: 'Публичный профиль.',
  mentions: [
    {
      type: 'place',
      slug: 'apple-garden',
      label: 'Яблоневый сад',
      htmlUrl: '/map/apple-garden/',
      markdownUrl: '/map/apple-garden/index.md',
    },
  ],
  backlinks: {
    news: [
      {
        section: 'news',
        kind: 'article',
        sourceId: '2026/05/power-outage',
        title: 'Повреждение линии 10 кВ',
        htmlUrl: '/news/2026/05/power-outage/',
        markdownUrl: '/news/2026/05/power-outage/index.md',
        mentionedAt: '2026-05-03T08:00:00.000+03:00',
      },
    ],
    status: [],
    reviews: [],
    places: [
      {
        section: 'places',
        kind: 'place',
        sourceId: 'titanic',
        title: 'Детская площадка «Титаник»',
        htmlUrl: '/map/titanic/',
        markdownUrl: '/map/titanic/index.md',
        mentionedAt: '2026-08-19T00:00:00.000Z',
      },
    ],
    people: [],
    contacts: [],
  },
});

describe('people public DTO adapters', () => {
  it('documents legacy snake_case names kept in the public people JSON contract', () => {
    const payload = buildPeoplePublicPayload({ profiles: [profile()] });

    expect(payload).toMatchInlineSnapshot(`
      {
        "profiles": [
          {
            "backlink_count": 2,
            "backlinks": {
              "contacts": [],
              "news": [
                {
                  "html_url": "https://example.com/news/2026/05/power-outage/",
                  "kind": "article",
                  "markdown_url": "https://example.com/news/2026/05/power-outage/index.md",
                  "mentioned_at": "2026-05-03T08:00:00.000+03:00",
                  "section": "news",
                  "source_id": "2026/05/power-outage",
                  "title": "Повреждение линии 10 кВ",
                },
              ],
              "people": [],
              "places": [
                {
                  "html_url": "https://example.com/map/titanic/",
                  "kind": "place",
                  "markdown_url": "https://example.com/map/titanic/index.md",
                  "mentioned_at": "2026-08-19T00:00:00.000Z",
                  "section": "places",
                  "source_id": "titanic",
                  "title": "Детская площадка «Титаник»",
                },
              ],
              "reviews": [],
              "status": [],
            },
            "body_markdown": "Публичный профиль.",
            "company": "ОК \"Комфорт\"",
            "contacts": [
              {
                "display": "@Kirill_ZemlyaMO",
                "href": "https://t.me/Kirill_ZemlyaMO",
                "type": "telegram",
                "value": "@Kirill_ZemlyaMO",
              },
            ],
            "html_url": "https://example.com/people/kschemelinin/",
            "id": "kschemelinin",
            "markdown_url": "https://example.com/people/kschemelinin/index.md",
            "mention_count": 1,
            "mentions": [
              {
                "html_url": "https://example.com/map/apple-garden/",
                "markdown_url": "https://example.com/map/apple-garden/index.md",
                "name": "Яблоневый сад",
                "slug": "apple-garden",
                "type": "place",
              },
            ],
            "name": "Кирилл Щемелинин",
            "name_cases": {
              "gen": "Кирилла Щемелинина",
            },
            "position": "Исполняющий обязанности директора по эксплуатации",
            "slug": "kschemelinin",
          },
        ],
        "stats": {
          "backlink_count": 2,
          "mention_count": 1,
          "profile_count": 1,
        },
      }
    `);
  });
});
