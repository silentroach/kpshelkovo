import { describe, expect, it } from 'vitest';

import {
  createEntityMentionGraph,
  type EntityMentionSourceRef,
} from '../mentions';
import { createPeopleBacklinksFromGraph } from './backlinks';

const refs: readonly EntityMentionSourceRef[] = [
  {
    target: { type: 'person', slug: 'kschemelinin' },
    source: { section: 'news', kind: 'article', id: '2026/05/power-outage' },
    title: 'Повреждение линии 10 кВ',
    htmlUrl: '/news/2026/05/power-outage/',
    markdownUrl: '/news/2026/05/power-outage/index.md',
    mentionedAt: '2026-05-03T08:00:00.000+03:00',
    sortKey: 1777770000000,
  },
  {
    target: { type: 'person', slug: 'kschemelinin' },
    source: { section: 'reviews', kind: 'review', id: '2026-06-25-test' },
    title: 'Отзыв собственника от 25 июня 2026',
    htmlUrl: '/reviews/2026-06-25-test/',
    markdownUrl: '/reviews/2026-06-25-test/index.md',
    mentionedAt: '2026-06-25T00:00:00.000Z',
    sortKey: 1782345600000,
  },
  {
    target: { type: 'person', slug: 'kschemelinin' },
    source: { section: 'contacts', kind: 'contact', id: 'fence/ivan' },
    title: 'Иван Петров',
    htmlUrl: '/sarafan/fence/ivan/',
    markdownUrl: '/sarafan/fence/ivan/index.md',
    mentionedAt: '2026-07-06T00:00:00.000Z',
    sortKey: 1783296000000,
  },
  {
    target: { type: 'person', slug: 'kschemelinin' },
    source: { section: 'places', kind: 'place', id: 'titanic' },
    title: 'Детская площадка «Титаник»',
    htmlUrl: '/map/titanic/',
    markdownUrl: '/map/titanic/index.md',
    mentionedAt: '2026-08-19T00:00:00.000Z',
    sortKey: 1787097600000,
  },
  {
    target: { type: 'person', slug: 'kschemelinin' },
    source: { section: 'discomfort', kind: 'quote', id: 'quote' },
    title: 'ОК Дискомфорт',
    htmlUrl: '/815/discomfort/',
    markdownUrl: '/815/discomfort/index.md',
    mentionedAt: '2026-02-21',
    sortKey: 1771632000000,
  },
];

describe('createPeopleBacklinksFromGraph', () => {
  it('adapts domain mention graph refs into domain people backlinks', () => {
    expect(
      createPeopleBacklinksFromGraph(createEntityMentionGraph(refs), {
        slug: 'kschemelinin',
      }),
    ).toMatchInlineSnapshot(`
      {
        "contacts": [
          {
            "excerpt": undefined,
            "htmlUrl": "/sarafan/fence/ivan/",
            "kind": "contact",
            "markdownUrl": "/sarafan/fence/ivan/index.md",
            "mentionedAt": "2026-07-06T00:00:00.000Z",
            "section": "contacts",
            "sortKey": 1783296000000,
            "sourceId": "fence/ivan",
            "title": "Иван Петров",
          },
        ],
        "discomfort": [
          {
            "excerpt": undefined,
            "htmlUrl": "/815/discomfort/",
            "kind": "quote",
            "markdownUrl": "/815/discomfort/index.md",
            "mentionedAt": "2026-02-21",
            "section": "discomfort",
            "sortKey": 1771632000000,
            "sourceId": "quote",
            "title": "ОК Дискомфорт",
          },
        ],
        "news": [
          {
            "excerpt": undefined,
            "htmlUrl": "/news/2026/05/power-outage/",
            "kind": "article",
            "markdownUrl": "/news/2026/05/power-outage/index.md",
            "mentionedAt": "2026-05-03T08:00:00.000+03:00",
            "section": "news",
            "sortKey": 1777770000000,
            "sourceId": "2026/05/power-outage",
            "title": "Повреждение линии 10 кВ",
          },
        ],
        "people": [],
        "places": [
          {
            "excerpt": undefined,
            "htmlUrl": "/map/titanic/",
            "kind": "place",
            "markdownUrl": "/map/titanic/index.md",
            "mentionedAt": "2026-08-19T00:00:00.000Z",
            "section": "places",
            "sortKey": 1787097600000,
            "sourceId": "titanic",
            "title": "Детская площадка «Титаник»",
          },
        ],
        "reviews": [
          {
            "excerpt": undefined,
            "htmlUrl": "/reviews/2026-06-25-test/",
            "kind": "review",
            "markdownUrl": "/reviews/2026-06-25-test/index.md",
            "mentionedAt": "2026-06-25T00:00:00.000Z",
            "section": "reviews",
            "sortKey": 1782345600000,
            "sourceId": "2026-06-25-test",
            "title": "Отзыв собственника от 25 июня 2026",
          },
        ],
        "status": [],
      }
    `);
  });
});
