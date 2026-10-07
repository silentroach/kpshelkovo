/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from 'zod/mini';

import { getHomeServiceWindows } from '@/lib/home/service-summary';
import { HomeServiceWindowsSchema } from '@/lib/home/service-summary.schema';
import type { HomeServiceWindowsPayload } from '@/lib/home/service-summary.types';
import { buildNewsDataset, loadNewsArticles } from '@/lib/news/load';
import {
  createTestNewsDatasetBuilder,
  newsArticleEntry,
  newsAuthorEntry
} from '@/lib/news/load.test-helper';
import type { NewsAuthorKind } from '@/lib/news/types';
import { buildStatusDataset, loadStatusData, loadStatusIncidents } from '@/lib/status/load';
import { RawStatusIncidentSchema } from '@/lib/status/raw-schema';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import HomePage from '@/pages/index.astro';
import { createAstroContainer } from '@/test/astro-container';

vi.mock('@/lib/news/load', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/news/load')>()),
  loadNewsArticles: vi.fn()
}));
vi.mock('@/lib/status/load', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/status/load')>()),
  loadStatusData: vi.fn(),
  loadStatusIncidents: vi.fn()
}));
vi.mock('@/lib/home/service-summary', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/home/service-summary')>();
  return { ...original, getHomeServiceWindows: vi.fn(original.getHomeServiceWindows) };
});

const now = new Date('2026-10-06T12:00:00+03:00');
const buildNews = createTestNewsDatasetBuilder(buildNewsDataset);
const window = new Window();
const document = window.document;

const article = (id: string, kind: NewsAuthorKind = 'editorial', pinned = false) =>
  buildNews(
    [newsAuthorEntry({ id: 'ig', name: `Автор ${kind}`, kind })],
    [
      newsArticleEntry({
        id: `2026/10/${id}`,
        title: `Новость ${id}`,
        summary: `Подробности ${id}.`,
        date: '02.10.2026',
        pinned
      })
    ],
    { now }
  ).articles[0];

const renderHome = async () => {
  const container = await createAstroContainer();
  document.body.innerHTML = await container.renderToString(HomePage);
  const main = document.querySelector('main');
  if (!main) throw new Error('Expected homepage main');
  return main;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  vi.mocked(loadNewsArticles).mockResolvedValue([]);
  vi.mocked(loadStatusIncidents).mockResolvedValue([]);
  vi.mocked(loadStatusData).mockResolvedValue(buildStatusDataset([], { now }));
});
afterEach(() => vi.useRealTimers());
afterAll(() => window.happyDOM.close());

describe('homepage server HTML', () => {
  it('retains the H1 and panorama when no news or service events exist', async () => {
    const main = await renderHome();

    expect({
      headings: [...main.querySelectorAll('h1')].map((heading) => heading.textContent.trim()),
      articles: main.querySelectorAll('article').length,
      hero: Boolean(main.querySelector('[data-home-hero-mode]')),
      summaryHidden: main.querySelector('[data-home-service-summary]')?.hasAttribute('hidden'),
      visibleServices: main.querySelectorAll('[data-home-service]:not([hidden])').length,
      preparedServices: main.querySelectorAll('a[data-home-service][data-phase][data-kind]').length
    }).toMatchInlineSnapshot(`
      {
        "articles": 0,
        "headings": [
          "Новости",
        ],
        "hero": true,
        "preparedServices": 4,
        "summaryHidden": true,
        "visibleServices": 0,
      }
    `);
  });

  it.each([1, 2])('renders a %i-article feed without repeats or empty cards', async (count) => {
    const articles = [article('first'), article('second')].slice(0, count);
    vi.mocked(loadNewsArticles).mockResolvedValue(articles);
    const main = await renderHome();
    const cards = [...main.querySelectorAll('article')];

    expect(cards.map((card) => card.querySelector('h2 a')?.getAttribute('href'))).toEqual(
      articles.map((item) => item.url)
    );
    expect(main.querySelector('a[href="/news/"]')).toBeNull();
  });

  it('renders title and summary typography without interpreting literal markup', async () => {
    vi.mocked(loadNewsArticles).mockResolvedValue([
      {
        ...article('range'),
        title: '«8-10 октября» <em>текст</em> &amp;',
        summary: '«11–13 октября» <strong>текст</strong> &amp;'
      }
    ]);
    const main = await renderHome();
    const card = main.querySelector('article')!;

    expect(
      [...card.querySelectorAll('h2 a, p')].map((element) => ({
        text: element.textContent.replaceAll('\u00a0', ' ').trim(),
        range: element.querySelector('.nowrap-date-range')?.textContent.replaceAll('\u00a0', ' '),
        quote: !!element.querySelector('[class^="typograf-oa-"]'),
        literalElements: element.querySelectorAll('em, strong').length
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "literalElements": 0,
          "quote": true,
          "range": "8–10 октября",
          "text": "«8–10 октября» <em>текст</em> &amp;",
        },
        {
          "literalElements": 0,
          "quote": true,
          "range": "11–13 октября",
          "text": "«11–13 октября» <strong>текст</strong> &amp;",
        },
      ]
    `);
  });

  it('renders the selected lead before two secondary articles with dates, attribution and a pin', async () => {
    const lead = article('lead', 'official', true);
    vi.mocked(loadNewsArticles).mockResolvedValue([
      article('a-editorial'),
      article('b-community', 'community'),
      article('c-omitted'),
      {
        ...lead,
        publishedAt: new Date('2026-10-01T21:30:00Z'),
        publishedIso: '2026-10-01T21:30:00Z'
      }
    ]);
    const main = await renderHome();

    expect(
      [...main.querySelectorAll('article')].map((card) => ({
        href: card.querySelector('h2 a')?.getAttribute('href'),
        datetime: card.querySelector('time')?.getAttribute('datetime'),
        date: card.querySelector('time')?.textContent.trim(),
        summary: card.querySelector('p')?.textContent.trim(),
        author: card.textContent.match(/Автор (official|community|editorial)/u)?.[0],
        pinned: card.textContent.includes('Закреплено')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "author": "Автор official",
          "date": "2 октября",
          "datetime": "2026-10-01T21:30:00Z",
          "href": "/news/2026/10/lead/",
          "pinned": true,
          "summary": "Подробности lead.",
        },
        {
          "author": undefined,
          "date": "2 октября",
          "datetime": "2026-10-02T00:00:00+03:00",
          "href": "/news/2026/10/a-editorial/",
          "pinned": false,
          "summary": "Подробности a-editorial.",
        },
        {
          "author": "Автор community",
          "date": "2 октября",
          "datetime": "2026-10-02T00:00:00+03:00",
          "href": "/news/2026/10/b-community/",
          "pinned": false,
          "summary": "Подробности b-community.",
        },
      ]
    `);
  });

  it.each([
    {
      name: 'non-finite timestamps that JSON would turn into null',
      payload: [{ service: 'water', windows: [{ kind: 'incident', start: NaN }] }]
    },
    {
      name: 'timestamps outside the Date range',
      payload: [{ service: 'water', windows: [{ kind: 'incident', start: 8_640_000_000_000_001 }] }]
    },
    {
      name: 'windows ending before their start',
      payload: [{ service: 'water', windows: [{ kind: 'incident', start: 2, end: 1 }] }]
    },
    {
      name: 'duplicate services',
      payload: [
        { service: 'water', windows: [{ kind: 'incident', start: 1 }] },
        { service: 'water', windows: [{ kind: 'maintenance', start: 2 }] }
      ]
    },
    {
      name: 'service groups without event windows',
      payload: [{ service: 'water', windows: [] }]
    },
    {
      name: 'source details leaking into the minimal payload',
      payload: [
        {
          service: 'water',
          windows: [{ kind: 'incident', start: 1, sourceUrl: 'https://example.com/source' }]
        }
      ]
    }
  ])('stops HTML generation for $name', async ({ payload }) => {
    vi.mocked(getHomeServiceWindows).mockReturnValueOnce(payload as HomeServiceWindowsPayload);

    await expect(renderHome()).rejects.toBeInstanceOf(core.$ZodError);
  });

  it('provides ordered service links and minimal event data without running JavaScript', async () => {
    const status = buildStatusDataset(
      [
        { service: 'water', kind: 'maintenance', started_at: '08.10.2026' },
        { service: 'dam', kind: 'maintenance', started_at: '01.10.2026', ended_at: '20.10.2026' },
        { service: 'electricity', kind: 'incident', started_at: '06.10.2026 11:00' },
        { service: 'internet', kind: 'incident', started_at: '01.10.2026', ended_at: '02.10.2026' }
      ].map((data) => ({
        id: `2026/10/${data.service}`,
        data: RawStatusIncidentSchema.parse(data),
        body: ''
      })),
      { now }
    );
    vi.mocked(loadStatusIncidents).mockResolvedValue(status.incidents);
    vi.mocked(loadStatusData).mockResolvedValue(status);
    const main = await renderHome();
    const summary = main.querySelector('[data-home-service-summary]');

    expect({
      summaryHidden: summary?.hasAttribute('hidden'),
      accessibleName: summary?.getAttribute('aria-label'),
      links: [...main.querySelectorAll('[data-home-service-list] a')].map((link) => ({
        service: link.getAttribute('data-home-service'),
        href: link.getAttribute('href'),
        phase: link.getAttribute('data-phase'),
        kind: link.getAttribute('data-kind'),
        hidden: link.hasAttribute('hidden'),
        label: link.querySelector('[data-home-service-label]')?.textContent.trim()
      }))
    }).toMatchInlineSnapshot(`
      {
        "accessibleName": "Состояние сервисов",
        "links": [
          {
            "hidden": false,
            "href": "/status/electricity/",
            "kind": "incident",
            "label": "Перебой",
            "phase": "active",
            "service": "electricity",
          },
          {
            "hidden": false,
            "href": "/status/dam/",
            "kind": "maintenance",
            "label": "Идут работы",
            "phase": "active",
            "service": "dam",
          },
          {
            "hidden": false,
            "href": "/status/water/",
            "kind": "maintenance",
            "label": "Работы с 8 октября",
            "phase": "scheduled",
            "service": "water",
          },
          {
            "hidden": true,
            "href": "/status/internet/",
            "kind": "",
            "label": "",
            "phase": "",
            "service": "internet",
          },
        ],
        "summaryHidden": false,
      }
    `);

    const payload = main.querySelector(
      'script[type="application/json"][data-home-service-windows]'
    );
    expect(HomeServiceWindowsSchema.parse(JSON.parse(payload?.textContent ?? '')))
      .toMatchInlineSnapshot(`
        [
          {
            "service": "electricity",
            "windows": [
              {
                "kind": "incident",
                "start": 1791273600000,
              },
            ],
          },
          {
            "service": "water",
            "windows": [
              {
                "kind": "maintenance",
                "start": 1791406800000,
              },
            ],
          },
          {
            "service": "dam",
            "windows": [
              {
                "end": 1792443600000,
                "kind": "maintenance",
                "start": 1790802000000,
              },
            ],
          },
        ]
      `);
  });
});
