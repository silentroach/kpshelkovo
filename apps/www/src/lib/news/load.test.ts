import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createPersonMentionTarget } from '../people/mentions';
import type {
  NewsArchiveSummaryEntry,
  NewsArticleEntry,
  NewsAuthorEntry,
} from './load';

type MutableMentionRegistry = Map<
  string,
  ReturnType<typeof createPersonMentionTarget>
>;

type BuildNewsDataset = typeof import('./load').buildNewsDataset;

let buildNewsDatasetSource: BuildNewsDataset;

type ArticleEventInput = NonNullable<
  NewsArticleEntry['data']['events']
>[number];
type ArticlePhotoInput = NonNullable<
  NewsArticleEntry['data']['photos']
>[number];

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildNewsDataset: buildNewsDatasetSource } = await import('./load'));
});

const archiveSummaries = (
  articles: readonly NewsArticleEntry[],
): readonly NewsArchiveSummaryEntry[] => {
  const ids = new Set<string>();

  for (const item of articles) {
    const [year, month] = item.id.split('/');

    ids.add(year);
    ids.add(`${year}/${month}`);
  }

  return [...ids].map((id) => ({ id, body: `Выжимка ${id}.` }));
};

const buildWithArchiveSummaries = (
  builder: BuildNewsDataset,
  authors: Parameters<BuildNewsDataset>[0],
  articles: Parameters<BuildNewsDataset>[1],
  opts?: Parameters<BuildNewsDataset>[3],
): ReturnType<BuildNewsDataset> =>
  builder(authors, articles, archiveSummaries(articles), opts);

const buildNewsDataset = (
  authors: Parameters<BuildNewsDataset>[0],
  articles: Parameters<BuildNewsDataset>[1],
  opts?: Parameters<BuildNewsDataset>[3],
): ReturnType<BuildNewsDataset> =>
  buildWithArchiveSummaries(buildNewsDatasetSource, authors, articles, opts);

const author = (input: {
  readonly id: string;
  readonly name: string;
  readonly kind?: 'official' | 'community' | 'editorial' | 'other';
}): NewsAuthorEntry => ({
  id: input.id,
  data: {
    name: input.name,
    kind: input.kind ?? 'editorial',
  },
});

const article = (input: {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly date: string;
  readonly body?: string;
  readonly pinned?: boolean;
  readonly pinned_until?: string;
  readonly events?: readonly ArticleEventInput[];
  readonly photos?: readonly ArticlePhotoInput[];
  readonly searchAliases?: readonly string[];
}): NewsArticleEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    summary: input.summary,
    date: input.date,
    author: { id: 'ig' } as NewsArticleEntry['data']['author'],
    pinned: input.pinned,
    pinned_until: input.pinned_until,
    events: input.events,
    photos: input.photos,
    search_aliases: input.searchAliases,
  },
});

describe('buildNewsDataset', () => {
  it('keeps public photo URLs and intrinsic dimensions', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/photo-report',
          title: 'Фоторепортаж',
          summary: 'Фото с места.',
          date: '05.05.2026',
          photos: [
            {
              url: 'https://media.kpshelkovo.online/news/2026/05/photo-report/path.jpeg',
              width: 1280,
              height: 960,
              alt: 'Дорожка через поле',
              caption: 'Фото с места.',
            },
          ],
        }),
      ],
    );

    expect(data.articles[0]?.photos).toMatchInlineSnapshot(`
      [
        {
          "alt": "Дорожка через поле",
          "caption": "Фото с места.",
          "height": 960,
          "url": "https://media.kpshelkovo.online/news/2026/05/photo-report/path.jpeg",
          "width": 1280,
        },
      ]
    `);
  });

  it('keeps pinned news only before pinned_until date', () => {
    const now = Date.now;
    Date.now = () => new Date('2026-05-06T12:00:00.000Z').valueOf();

    try {
      const data = buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/pinned-active',
            title: 'Активный пин',
            summary: 'До срока',
            date: '04.05.2026',
            pinned: true,
            pinned_until: '2026-05-07',
          }),
          article({
            id: '2026/05/pinned-expired',
            title: 'Истекший пин',
            summary: 'После срока',
            date: '03.05.2026',
            pinned: true,
            pinned_until: '2026-05-05',
          }),
        ],
      );

      expect(data.home.pinned.map((item) => item.id)).toEqual([
        '2026/05/pinned-active',
      ]);
    } finally {
      Date.now = now;
    }
  });

  it('shows multiple pinned news on top in publication-date order', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/pinned-new',
          title: 'Новый пин',
          summary: 'Новый',
          date: '05.05.2026 10:00',
          pinned: true,
        }),
        article({
          id: '2026/05/pinned-old',
          title: 'Старый пин',
          summary: 'Старый',
          date: '04.05.2026 10:00',
          pinned: true,
        }),
        article({
          id: '2026/05/regular',
          title: 'Обычная новость',
          summary: 'Без пина',
          date: '06.05.2026 10:00',
        }),
      ],
    );

    expect(data.home.pinned.map((item) => item.id)).toEqual([
      '2026/05/pinned-new',
      '2026/05/pinned-old',
    ]);
    expect(data.home.latest.map((item) => item.id)).toEqual([
      '2026/05/regular',
    ]);
  });

  it('sorts same-day news with publish time above date-only news', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/no-time',
          title: 'Новость без времени',
          summary: 'Только дата',
          date: '14.05.2026',
        }),
        article({
          id: '2026/05/early',
          title: 'Утренняя новость',
          summary: 'С ранним временем',
          date: '14.05.2026 09:00',
        }),
        article({
          id: '2026/05/late',
          title: 'Вечерняя новость',
          summary: 'С поздним временем',
          date: '14.05.2026 20:30',
        }),
        article({
          id: '2026/05/older',
          title: 'Вчерашняя новость',
          summary: 'Предыдущий день',
          date: '13.05.2026 23:00',
        }),
      ],
    );

    expect(data.articles.map((item) => item.id)).toEqual([
      '2026/05/late',
      '2026/05/early',
      '2026/05/no-time',
      '2026/05/older',
    ]);
  });

  it('normalizes mentions in article bodies', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/electricity',
          title: 'Авария на линии',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
          body: 'Основной текст про @kschemelinin.',
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
          ],
        ]),
      },
    );

    expect(data.articles[0]?.body).toBe(
      'Основной текст про [Кирилл Щемелинин](/people/kschemelinin/).',
    );
  });

  it('normalizes labelled mentions in article bodies', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/electricity',
          title: 'Авария на линии',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
          body: 'Основной текст после [комментария специалиста](@kschemelinin).',
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
          ],
        ]),
      },
    );

    expect(data.articles[0]?.body).toBe(
      'Основной текст после [комментария специалиста](/people/kschemelinin/).',
    );
    expect(data.articles[0]?.mentions.map((item) => item.slug)).toEqual([
      'kschemelinin',
    ]);
  });

  it('attaches summaries to their year and month archives', () => {
    const data = buildNewsDatasetSource(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/electricity',
          title: 'Авария на линии',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
        }),
      ],
      [
        { id: '2026', body: 'Главное за год.' },
        { id: '2026/05', body: 'Главное за месяц.' },
      ],
    );

    expect({
      year: data.archives.byYear.get(2026)?.summary.body,
      month: data.archives.byMonth.get('2026/05')?.summary.body,
    }).toMatchInlineSnapshot(`
      {
        "month": "Главное за месяц.",
        "year": "Главное за год.",
      }
    `);
  });

  it('rejects direct people mentions in archive summaries', () => {
    expect(() =>
      buildNewsDatasetSource(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/electricity',
            title: 'Авария на линии',
            summary: 'Краткая сводка',
            date: '03.05.2026 09:00',
          }),
        ],
        [
          { id: '2026', body: 'Главное за год.' },
          { id: '2026/05', body: 'Месяц про @kschemelinin.' },
        ],
        {
          mentionRegistry: new Map([
            [
              'kschemelinin',
              createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
            ],
          ]),
        },
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive summary "2026/05" must link to the source article instead of mentioning people directly]`,
    );
  });

  it('rejects archive summary links to missing articles', () => {
    expect(() =>
      buildNewsDatasetSource(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/electricity',
            title: 'Авария на линии',
            summary: 'Краткая сводка',
            date: '03.05.2026 09:00',
          }),
        ],
        [
          { id: '2026', body: 'Главное за год.' },
          {
            id: '2026/05',
            body: '[Главное за месяц](/news/2026/05/missing/).',
          },
        ],
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive summary "2026/05" contains invalid link "/news/2026/05/missing/"; link to an existing news article with a root-relative URL]`,
    );
  });

  it('rejects block markup in archive summaries', () => {
    expect(() =>
      buildNewsDatasetSource(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/electricity',
            title: 'Авария на линии',
            summary: 'Краткая сводка',
            date: '03.05.2026 09:00',
          }),
        ],
        [
          { id: '2026', body: 'Главное за год.' },
          { id: '2026/05', body: '## Главное за месяц' },
        ],
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive summary "2026/05" may contain only paragraphs with inline formatting]`,
    );
  });

  it('rejects a missing archive summary', () => {
    expect(() =>
      buildNewsDatasetSource(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/electricity',
            title: 'Авария на линии',
            summary: 'Краткая сводка',
            date: '03.05.2026 09:00',
          }),
        ],
        [{ id: '2026', body: 'Выжимка за год.' }],
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive "2026/05" is missing its summary]`,
    );
  });

  it('rejects a summary without a matching archive', () => {
    const currentArticle = article({
      id: '2026/05/electricity',
      title: 'Авария на линии',
      summary: 'Краткая сводка',
      date: '03.05.2026 09:00',
    });

    expect(() =>
      buildNewsDatasetSource(
        [author({ id: 'ig', name: 'Редакция' })],
        [currentArticle],
        [
          ...archiveSummaries([currentArticle]),
          { id: '2025', body: 'Лишняя выжимка.' },
        ],
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive summary "2025" has no matching archive]`,
    );
  });

  it('rejects a blank archive summary', () => {
    expect(() =>
      buildNewsDatasetSource(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/electricity',
            title: 'Авария на линии',
            summary: 'Краткая сводка',
            date: '03.05.2026 09:00',
          }),
        ],
        [
          { id: '2026', body: 'Выжимка за год.' },
          { id: '2026/05', body: '   ' },
        ],
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive summary "2026/05" body is required]`,
    );
  });

  it('normalizes mentions in photo captions', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/photo-caption',
          title: 'Фото с подписью',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
          photos: [
            {
              url: 'https://media.kpshelkovo.online/news/2026/05/photo-caption/path.jpeg',
              width: 1280,
              height: 960,
              alt: 'Фото с места',
              caption: 'Фото предоставил @kschemelinin.',
            },
          ],
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
          ],
        ]),
      },
    );

    expect({
      caption: data.articles[0]?.photos[0]?.caption,
      mentions: data.articles[0]?.mentions.map((item) => item.slug),
    }).toMatchInlineSnapshot(`
      {
        "caption": "Фото предоставил [Кирилл Щемелинин](/people/kschemelinin/).",
        "mentions": [
          "kschemelinin",
        ],
      }
    `);
  });

  it('renders requested mention case and profile context in link title', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/electricity',
          title: 'Авария на линии',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
          body: 'По словам @kschemelinin:gen, повреждение было редким.',
        }),
      ],
      {
        mentionRegistry: new Map([
          [
            'kschemelinin',
            createPersonMentionTarget(
              'kschemelinin',
              'Кирилл Щемелинин',
              { gen: 'Кирилла Щемелинина' },
              'ОК "Комфорт"',
              'Исполняющий обязанности директора по эксплуатации',
            ),
          ],
        ]),
      },
    );

    expect(data.articles[0]?.body).toBe(
      'По словам [Кирилла Щемелинина](/people/kschemelinin/ "Исполняющий обязанности директора по эксплуатации, ОК \\"Комфорт\\""), повреждение было редким.',
    );
  });

  it('rejects requested mention cases missing from person data', () => {
    expect(() =>
      buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/electricity',
            title: 'Авария на линии',
            summary: 'Краткая сводка',
            date: '03.05.2026 09:00',
            body: 'По словам @kschemelinin:gen, повреждение было редким.',
          }),
        ],
        {
          mentionRegistry: new Map([
            [
              'kschemelinin',
              createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
            ],
          ]),
        },
      ),
    ).toThrow('has no "gen" label case');
  });

  it('normalizes a valid event for article and list data', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/event',
          title: 'Встреча по регламенту',
          summary: 'Коротко о встрече',
          date: '04.05.2026 10:00',
          events: [
            {
              title: 'Встреча по регламенту',
              description: 'Описание календарного события.',
              starts_at: '31.05.2026 19:00',
              ends_at: '31.05.2026 21:00',
              location: 'КП Шелково, эко-клуб',
              coordinates: {
                lat: 55,
                lng: 38,
              },
            },
          ],
        }),
      ],
    );

    expect(data.articles[0]?.events[0]).toMatchObject({
      slug: 'event',
      title: 'Встреча по регламенту',
      description: 'Описание календарного события.',
      startsIso: '2026-05-31T19:00:00+03:00',
      startsTime: '19:00',
      endsIso: '2026-05-31T21:00:00+03:00',
      endsTime: '21:00',
      icsUrl: '/news/2026/05/event/event.ics',
      location: 'КП Шелково, эко-клуб',
      coordinates: {
        lat: 55,
        lng: 38,
      },
    });
    expect(data.articles[0]?.events[0]?.startsAt).toBeInstanceOf(Date);
    expect(data.articles[0]?.events[0]?.endsAt).toBeInstanceOf(Date);
    expect(data.home.latest[0]?.events[0]?.startsIso).toBe(
      '2026-05-31T19:00:00+03:00',
    );
  });

  it('maps raw article fields into camelCase domain article and dataset fields', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        {
          ...article({
            id: '2026/05/article-domain',
            title: 'Доменная новость',
            summary: 'Проверка доменной формы',
            date: '04.05.2026 10:00',
            searchAliases: ['как найти новость'],
          }),
          data: {
            ...article({
              id: '2026/05/article-domain',
              title: 'Доменная новость',
              summary: 'Проверка доменной формы',
              date: '04.05.2026 10:00',
              searchAliases: ['как найти новость'],
            }).data,
            source_url: 'https://example.com/source',
            cover: {
              src: '/cover.jpg',
              width: 1200,
              height: 675,
            } as NewsArticleEntry['data']['cover'],
            cover_alt: 'Обложка новости',
          },
        },
      ],
    );
    const domainArticle = data.articles[0];

    expect(domainArticle).toMatchObject({
      markdownUrl: '/news/2026/05/article-domain/index.md',
      publishedIso: '2026-05-04T10:00:00+03:00',
      appliesToAllAreas: true,
      searchAliases: ['как найти новость'],
      sourceUrl: 'https://example.com/source',
      cover: {
        url: '/cover.jpg',
        width: 1200,
        height: 675,
        alt: 'Обложка новости',
      },
    });
    expect(domainArticle?.publishedAt).toBeInstanceOf(Date);
    expect(data.byId.get('2026/05/article-domain')).toBe(domainArticle);
  });

  it('normalizes event organizer and performer', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/event',
          title: 'Праздник',
          summary: 'Коротко о празднике',
          date: '04.05.2026 10:00',
          events: [
            {
              title: 'Праздник',
              starts_at: '31.05.2026 19:00',
              organizer: 'ОК Комфорт',
              performer: ['Хор "Лейся, песня!"', 'Ансамбль "Ромашкино"'],
            },
          ],
        }),
      ],
    );

    expect(data.articles[0]?.events[0]).toMatchObject({
      slug: 'event',
      title: 'Праздник',
      organizer: { name: 'ОК Комфорт', type: 'organization' },
      performer: [
        { name: 'Хор "Лейся, песня!"', type: 'organization' },
        { name: 'Ансамбль "Ромашкино"', type: 'organization' },
      ],
    });
  });

  it('keeps omitted event end empty in normalized event data', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/event',
          title: 'Встреча по регламенту',
          summary: 'Коротко о встрече',
          date: '04.05.2026 10:00',
          events: [
            {
              title: 'Встреча по регламенту',
              starts_at: '31.05.2026 19:00',
            },
          ],
        }),
      ],
    );

    expect(data.articles[0]?.events[0]).toMatchObject({
      startsIso: '2026-05-31T19:00:00+03:00',
      startsTime: '19:00',
    });
    expect(data.articles[0]?.events[0]?.endsAt).toBeUndefined();
    expect(data.articles[0]?.events[0]?.endsIso).toBeUndefined();
    expect(data.articles[0]?.events[0]?.endsTime).toBeUndefined();
  });

  it('rejects an event start without time', () => {
    expect(() =>
      buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/event',
            title: 'Встреча по регламенту',
            summary: 'Коротко о встрече',
            date: '04.05.2026 10:00',
            events: [
              {
                title: 'Встреча по регламенту',
                starts_at: '31.05.2026',
                ends_at: '31.05.2026 21:00',
              },
            ],
          }),
        ],
      ),
    ).toThrow(/events\[0\] starts_at must include time/);
  });

  it('rejects an event end without time', () => {
    expect(() =>
      buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/event',
            title: 'Встреча по регламенту',
            summary: 'Коротко о встрече',
            date: '04.05.2026 10:00',
            events: [
              {
                title: 'Встреча по регламенту',
                starts_at: '31.05.2026 19:00',
                ends_at: '31.05.2026',
              },
            ],
          }),
        ],
      ),
    ).toThrow(/events\[0\] ends_at must include time/);
  });

  it('rejects an event that does not end after it starts', () => {
    expect(() =>
      buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/event',
            title: 'Встреча по регламенту',
            summary: 'Коротко о встрече',
            date: '04.05.2026 10:00',
            events: [
              {
                title: 'Встреча по регламенту',
                starts_at: '31.05.2026 19:00',
                ends_at: '31.05.2026 19:00',
              },
            ],
          }),
        ],
      ),
    ).toThrow(/events\[0\] ends_at must be later than starts_at/);
  });

  it('rejects invalid event coordinates', () => {
    expect(() =>
      buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/event',
            title: 'Встреча по регламенту',
            summary: 'Коротко о встрече',
            date: '04.05.2026 10:00',
            events: [
              {
                title: 'Встреча по регламенту',
                starts_at: '31.05.2026 19:00',
                ends_at: '31.05.2026 21:00',
                coordinates: {
                  lat: 91,
                  lng: 38,
                },
              },
            ],
          }),
        ],
      ),
    ).toThrow(/coordinates\.lat must be between -90 and 90/);
  });

  it('rejects an empty performer entry', () => {
    expect(() =>
      buildNewsDataset(
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/event',
            title: 'Встреча по регламенту',
            summary: 'Коротко о встрече',
            date: '04.05.2026 10:00',
            events: [
              {
                title: 'Встреча по регламенту',
                starts_at: '31.05.2026 19:00',
                performer: [''],
              },
            ],
          }),
        ],
      ),
    ).toThrow(/events\[0\] performer\[0\] is required/);
  });

  it('normalizes event organizer and performer with explicit type', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/event',
          title: 'Праздник',
          summary: 'Коротко о празднике',
          date: '04.05.2026 10:00',
          events: [
            {
              title: 'Праздник',
              starts_at: '31.05.2026 19:00',
              organizer: { name: 'Инициативная группа', type: 'person' },
              performer: [
                { name: 'Иван Иванов', type: 'person' },
                { name: 'Ансамбль', type: 'organization' },
              ],
            },
          ],
        }),
      ],
    );

    expect(data.articles[0]?.events[0]).toMatchObject({
      slug: 'event',
      title: 'Праздник',
      organizer: { name: 'Инициативная группа', type: 'person' },
      performer: [
        { name: 'Иван Иванов', type: 'person' },
        { name: 'Ансамбль', type: 'organization' },
      ],
    });
  });

  it('keeps articles without event unchanged', () => {
    const data = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/plain',
          title: 'Обычная новость',
          summary: 'Без события',
          date: '04.05.2026 10:00',
        }),
      ],
    );

    expect(data.articles[0]?.events).toEqual([]);
    expect(data.home.latest[0]?.events).toEqual([]);
  });

  it('does not reuse the fallback mention registry between builds', async () => {
    vi.resetModules();
    vi.doMock('../markdown/render', () => ({
      preprocessSiteMarkdownContent: (
        markdown: string,
        _context: string,
        registry: Map<string, unknown>,
      ) => {
        const alreadyMutated = registry.has('leaked');

        registry.set(
          'leaked',
          createPersonMentionTarget('leaked', 'Утекшее упоминание'),
        );

        return {
          markdown: alreadyMutated ? 'fallback registry leaked' : markdown,
          mentions: [],
        };
      },
    }));

    try {
      const { buildNewsDataset: buildWithMockedPreprocessor } =
        await import('./load');

      buildWithArchiveSummaries(
        buildWithMockedPreprocessor,
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/first',
            title: 'Первая новость',
            summary: 'Проверка',
            date: '01.05.2026',
            body: 'Первый body.',
          }),
        ],
      );

      const data = buildWithArchiveSummaries(
        buildWithMockedPreprocessor,
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/second',
            title: 'Вторая новость',
            summary: 'Проверка',
            date: '02.05.2026',
            body: 'Второй body.',
          }),
        ],
      );

      expect(data.articles[0]?.body).toBe('Второй body.');
    } finally {
      vi.doUnmock('../markdown/render');
      vi.resetModules();
    }
  });

  it('does not let fallback registry mutations make later mentions valid', async () => {
    vi.resetModules();
    vi.doMock('../markdown/render', async () => {
      const actual =
        await vi.importActual<typeof import('../markdown/render')>(
          '../markdown/render',
        );

      return {
        ...actual,
        preprocessSiteMarkdownContent: (
          markdown: string,
          context: string,
          registry: MutableMentionRegistry,
        ) => {
          const body = actual.preprocessSiteMarkdownContent(
            markdown,
            context,
            registry,
          );

          registry.set(
            'leaked',
            createPersonMentionTarget('leaked', 'Утекшее упоминание'),
          );

          return body;
        },
      };
    });

    try {
      const { buildNewsDataset: buildWithMutablePreprocessor } =
        await import('./load');

      buildWithArchiveSummaries(
        buildWithMutablePreprocessor,
        [author({ id: 'ig', name: 'Редакция' })],
        [
          article({
            id: '2026/05/first',
            title: 'Первая новость',
            summary: 'Проверка',
            date: '01.05.2026',
            body: 'Первый body.',
          }),
        ],
      );

      expect(() =>
        buildWithArchiveSummaries(
          buildWithMutablePreprocessor,
          [author({ id: 'ig', name: 'Редакция' })],
          [
            article({
              id: '2026/05/second',
              title: 'Вторая новость',
              summary: 'Проверка',
              date: '02.05.2026',
              body: 'Упоминание @leaked.',
            }),
          ],
        ),
      ).toThrow('unknown entity mention "@leaked"');
    } finally {
      vi.doUnmock('../markdown/render');
      vi.resetModules();
    }
  });
});
