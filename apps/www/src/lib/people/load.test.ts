import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createEntityMentionGraph,
  type EntityMentionTarget,
} from '../mentions';
import type {
  NewsArchiveSummaryEntry,
  NewsArticleEntry,
  NewsAuthorEntry,
} from '../news/load';
import type { StatusIncidentEntry } from '../status/load';
import type { StatusArea, StatusKind, StatusService } from '../status/schema';
import type { ContactEntry } from '../contacts/load';
import type { PlaceEntry } from '../places/types';
import type { PersonProfileEntry } from './load';

let buildPeopleDataset: typeof import('./load').buildPeopleDataset;
let buildPeopleGraphDataset: typeof import('./load').buildPeopleGraphDataset;
let buildContactsDataset: typeof import('../contacts/load').buildContactsDataset;
type BuildNewsDataset = typeof import('../news/load').buildNewsDataset;

let buildNewsDatasetSource: BuildNewsDataset;
let buildPlacesDataset: typeof import('../places/load').buildPlacesDataset;
let buildStatusDataset: typeof import('../status/load').buildStatusDataset;
let createContactMentionRefs: typeof import('../contacts/mentions').createContactMentionRefs;
let createNewsArticleMentionRefs: typeof import('../news/mentions').createNewsArticleMentionRefs;
let createPlaceMentionRefs: typeof import('../places/mentions').createPlaceMentionRefs;
let createPlaceMentionTarget: typeof import('../places/mentions').createPlaceMentionTarget;
let createStatusIncidentMentionRefs: typeof import('../status/mentions').createStatusIncidentMentionRefs;
let createPersonProfileMentionRefs: typeof import('./mention-refs').createPersonProfileMentionRefs;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildPeopleDataset, buildPeopleGraphDataset } = await import('./load'));
  ({ buildContactsDataset } = await import('../contacts/load'));
  ({ buildNewsDataset: buildNewsDatasetSource } = await import('../news/load'));
  ({ buildPlacesDataset } = await import('../places/load'));
  ({ buildStatusDataset } = await import('../status/load'));
  ({ createContactMentionRefs } = await import('../contacts/mentions'));
  ({ createNewsArticleMentionRefs } = await import('../news/mentions'));
  ({ createPlaceMentionRefs, createPlaceMentionTarget } =
    await import('../places/mentions'));
  ({ createStatusIncidentMentionRefs } = await import('../status/mentions'));
  ({ createPersonProfileMentionRefs } = await import('./mention-refs'));
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

const buildNewsDataset = (
  authors: Parameters<BuildNewsDataset>[0],
  articles: Parameters<BuildNewsDataset>[1],
  opts?: Parameters<BuildNewsDataset>[3],
): ReturnType<BuildNewsDataset> =>
  buildNewsDatasetSource(authors, articles, archiveSummaries(articles), opts);

const sourceRefs = (input: {
  readonly people: ReturnType<typeof buildPeopleDataset>;
  readonly contacts?: ReturnType<typeof buildContactsDataset>;
  readonly news: ReturnType<typeof buildNewsDataset>;
  readonly places?: ReturnType<typeof buildPlacesDataset>;
  readonly status: ReturnType<typeof buildStatusDataset>;
}) => [
  ...(input.contacts?.contacts.flatMap((contact) =>
    contact.hasDetailPage ? createContactMentionRefs(contact) : [],
  ) ?? []),
  ...input.news.articles.flatMap(createNewsArticleMentionRefs),
  ...(input.places?.places.flatMap(createPlaceMentionRefs) ?? []),
  ...input.status.incidents.flatMap((incident) =>
    incident.hasPage ? createStatusIncidentMentionRefs(incident) : [],
  ),
  ...input.people.profiles.flatMap(createPersonProfileMentionRefs),
];

const entry = (input: {
  readonly id: string;
  readonly name: string;
  readonly company?: string;
  readonly position?: string;
  readonly name_cases?: {
    readonly gen?: string;
    readonly dat?: string;
    readonly acc?: string;
    readonly ins?: string;
    readonly prep?: string;
  };
  readonly body?: string;
  readonly contacts?: readonly {
    readonly type: 'phone' | 'telegram';
    readonly value: string;
  }[];
}): PersonProfileEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    name: input.name,
    name_cases: input.name_cases,
    company: input.company,
    position: input.position,
    contacts: [...(input.contacts ?? [])],
  },
});

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
}): NewsArticleEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    summary: input.summary,
    date: input.date,
    author: { id: 'ig' } as NewsArticleEntry['data']['author'],
  },
});

const incident = (input: {
  readonly id: string;
  readonly title: string;
  readonly service: StatusService;
  readonly kind: StatusKind;
  readonly started_at: string;
  readonly ended_at?: string;
  readonly areas?: readonly StatusArea[];
  readonly body?: string;
}): StatusIncidentEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    service: input.service,
    kind: input.kind,
    started_at: input.started_at,
    ended_at: input.ended_at,
    areas: input.areas ? [...input.areas] : undefined,
    source_url: `https://example.com/${input.id}`,
  },
});

const contact = (input: {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
}): ContactEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    slug: input.id.split('/').pop() ?? input.id,
    category: 'fence',
    updated_at: '2026-07-06',
    contacts: {
      phone: '+7 900 000-00-00',
    },
  },
});

const place = (input: {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
}): PlaceEntry => ({
  id: input.id,
  body: input.body ?? '',
  data: {
    title: input.title,
    category: 'children',
    status: 'existing',
    summary: 'Детская площадка в виде корабля',
    location: {
      map_url: 'https://yandex.ru/maps/?ll=37.746894%2C55.060703&z=18',
      address: 'ТСН «Шелково», Центральная улица',
      coordinates: { lat: 55.060703, lng: 37.746894 },
    },
  },
});

describe('buildPeopleDataset', () => {
  it('keeps news and status loaders off the backlink-enabled people loader', async () => {
    const [peopleLoad, newsLoad, placesLoad, statusLoad] = await Promise.all([
      readFile(new URL('./load.ts', import.meta.url), 'utf8'),
      readFile(new URL('../news/load.ts', import.meta.url), 'utf8'),
      readFile(new URL('../places/load.ts', import.meta.url), 'utf8'),
      readFile(new URL('../status/load.ts', import.meta.url), 'utf8'),
    ]);

    expect(peopleLoad).not.toContain("from './public-dto'");
    expect(newsLoad).not.toContain('../people/load');
    expect(placesLoad).not.toContain('../people/load');
    expect(placesLoad).toContain('@/lib/mentions/registry');
    expect(statusLoad).not.toContain('../people/load');
  });

  it('resolves place mentions in people profiles through the site registry', () => {
    const entries = [
      entry({
        id: 'apetrov',
        name: 'Андрей Петров',
        body: 'Гуляет у @apple-garden:gen.',
      }),
    ];
    const people = buildPeopleDataset([
      entry({ id: 'apetrov', name: 'Андрей Петров' }),
    ]);
    const mentionRegistry = new Map<string, EntityMentionTarget>(
      people.mentionRegistry,
    );

    mentionRegistry.set(
      'apple-garden',
      createPlaceMentionTarget('apple-garden', 'Яблоневый сад', {
        gen: 'Яблоневого сада',
      }),
    );

    expect(
      buildPeopleDataset(entries, { mentionRegistry }).profiles[0]?.body,
    ).toBe('Гуляет у [Яблоневого сада](/map/apple-garden/).');
  });

  it('accepts a valid person entry with normalized contacts and body mentions', () => {
    const data = buildPeopleDataset([
      entry({
        id: 'kschemelinin',
        name: 'Кирилл Щемелинин',
        name_cases: {
          gen: 'Кирилла Щемелинина',
        },
        company: 'ОК "Комфорт"',
        position: 'Исполняющий обязанности директора по эксплуатации',
        body: 'Профиль Кирилла.',
        contacts: [
          {
            type: 'telegram',
            value: 'Kirill_ZemlyaMO',
          },
          {
            type: 'phone',
            value: '+7 (916) 555-12-34',
          },
        ],
      }),
      entry({
        id: 'apetrov',
        name: 'Андрей Петров',
        body: 'Работал вместе с @kschemelinin над разбором аварии.',
      }),
    ]);

    expect(data.bySlug.get('apetrov')?.body).toMatchInlineSnapshot(
      `"Работал вместе с [Кирилл Щемелинин](/people/kschemelinin/ \"Исполняющий обязанности директора по эксплуатации, ОК \\\"Комфорт\\\"\") над разбором аварии."`,
    );
    expect(
      data.bySlug.get('apetrov')?.mentions.map((item) => item.slug),
    ).toEqual(['kschemelinin']);
    expect(data.bySlug.get('kschemelinin')?.contacts).toEqual([
      {
        type: 'telegram',
        value: 'Kirill_ZemlyaMO',
        display: '@Kirill_ZemlyaMO',
        href: 'https://t.me/Kirill_ZemlyaMO',
      },
      {
        type: 'phone',
        value: '+7 (916) 555-12-34',
        display: '+7 (916) 555-12-34',
        href: 'tel:+79165551234',
      },
    ]);
    expect(data.bySlug.get('kschemelinin')?.nameCases).toEqual({
      gen: 'Кирилла Щемелинина',
    });
    expect(data.bySlug.get('kschemelinin')?.company).toBe('ОК "Комфорт"');
    expect(data.bySlug.get('kschemelinin')?.position).toBe(
      'Исполняющий обязанности директора по эксплуатации',
    );
  });

  it('normalizes labelled mentions in profile bodies', () => {
    const data = buildPeopleDataset([
      entry({
        id: 'kschemelinin',
        name: 'Кирилл Щемелинин',
        body: 'Публичный профиль Кирилла.',
      }),
      entry({
        id: 'apetrov',
        name: 'Андрей Петров',
        body: 'Работал вместе с [главным инженером](@kschemelinin) над разбором аварии.',
      }),
    ]);

    expect(data.bySlug.get('apetrov')?.body).toBe(
      'Работал вместе с [главным инженером](/people/kschemelinin/) над разбором аварии.',
    );
    expect(
      data.bySlug.get('apetrov')?.mentions.map((item) => item.slug),
    ).toEqual(['kschemelinin']);
  });

  it('supports profiles without markdown body when frontmatter already carries context', () => {
    const data = buildPeopleDataset([
      entry({
        id: 'kschemelinin',
        name: 'Кирилл Щемелинин',
        company: 'ОК "Комфорт"',
        position: 'Исполняющий обязанности директора по эксплуатации',
        contacts: [
          {
            type: 'phone',
            value: '+7 (967) 246-37-49',
          },
        ],
      }),
    ]);

    expect(data.bySlug.get('kschemelinin')).toMatchObject({
      body: '',
      company: 'ОК "Комфорт"',
      position: 'Исполняющий обязанности директора по эксплуатации',
    });
  });

  it('fails on duplicate person slugs', () => {
    expect(() =>
      buildPeopleDataset([
        entry({
          id: 'kschemelinin',
          name: 'Кирилл Щемелинин',
        }),
        entry({
          id: 'kschemelinin',
          name: 'Другой Кирилл',
        }),
      ]),
    ).toThrow('duplicate person profile slug in mention registry');
  });

  it('builds grouped backlinks from site section mentions', () => {
    const people = buildPeopleDataset([
      entry({
        id: 'kschemelinin',
        name: 'Кирилл Щемелинин',
        body: 'Публичный профиль Кирилла.',
      }),
      entry({
        id: 'apetrov',
        name: 'Андрей Петров',
        body: 'Работал вместе с @kschemelinin над разбором аварии.',
      }),
    ]);
    const news = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/electricity',
          title: 'Авария на линии',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
          body: 'Основной текст про @kschemelinin. Позже добавили уточнение после комментария специалиста.',
        }),
      ],
      {
        mentionRegistry: people.mentionRegistry,
      },
    );
    const status = buildStatusDataset(
      [
        incident({
          id: '2026/04/electricity-river-10kv-line-damage',
          title: 'Отключение электричества в Шелково Ривер',
          service: 'electricity',
          kind: 'incident',
          started_at: '22.04.2026 11:30',
          ended_at: '23.04.2026 00:06',
          areas: ['river'],
          body: 'Как отметил @kschemelinin, повреждение было редким.',
        }),
      ],
      {
        mentionRegistry: people.mentionRegistry,
      },
    );
    const contacts = buildContactsDataset(
      [
        contact({
          id: 'fence/ivan-petrov-fence',
          title: 'Иван Петров',
          body: 'Перед началом работ стоит согласовать сроки с @kschemelinin.',
        }),
      ],
      {
        mentionRegistry: people.mentionRegistry,
      },
    );
    const places = buildPlacesDataset(
      [
        place({
          id: 'titanic',
          title: 'Детская площадка «Титаник»',
          body: 'Площадку показал @kschemelinin.',
        }),
      ],
      {
        mentionRegistry: people.mentionRegistry,
      },
    );
    const graph = buildPeopleGraphDataset(
      people,
      createEntityMentionGraph(
        sourceRefs({ people, contacts, news, places, status }),
      ),
    );

    expect(graph.bySlug.get('kschemelinin')?.backlinks).toMatchObject({
      news: [
        {
          kind: 'article',
          sourceId: '2026/05/electricity',
          title: 'Авария на линии',
        },
      ],
      status: [
        {
          kind: 'incident',
          sourceId: '2026/04/electricity-river-10kv-line-damage',
          title: 'Отключение электричества в Шелково Ривер',
          markdownUrl:
            '/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md',
          excerpt: 'Как отметил Кирилл Щемелинин, повреждение было редким.',
        },
      ],
      people: [
        {
          kind: 'person',
          sourceId: 'apetrov',
          title: 'Андрей Петров',
        },
      ],
      contacts: [
        {
          kind: 'contact',
          sourceId: 'fence/ivan-petrov-fence',
          title: 'Иван Петров',
          excerpt:
            'Перед началом работ стоит согласовать сроки с Кирилл Щемелинин.',
        },
      ],
      places: [
        {
          kind: 'place',
          sourceId: 'titanic',
          title: 'Детская площадка «Титаник»',
          htmlUrl: '/map/titanic/',
          markdownUrl: '/map/titanic/index.md',
          excerpt: 'Площадку показал Кирилл Щемелинин.',
        },
      ],
    });
  });

  it('builds grouped backlinks from labelled news, status, and people mentions', () => {
    const people = buildPeopleDataset([
      entry({
        id: 'kschemelinin',
        name: 'Кирилл Щемелинин',
        body: 'Публичный профиль Кирилла.',
      }),
      entry({
        id: 'apetrov',
        name: 'Андрей Петров',
        body: 'Работал вместе с [главным инженером](@kschemelinin) над разбором аварии.',
      }),
    ]);
    const news = buildNewsDataset(
      [author({ id: 'ig', name: 'Редакция' })],
      [
        article({
          id: '2026/05/electricity',
          title: 'Авария на линии',
          summary: 'Краткая сводка',
          date: '03.05.2026 09:00',
          body: 'Основной текст после [комментария специалиста](@kschemelinin). Позже добавили уточнение от дежурного инженера.',
        }),
      ],
      {
        mentionRegistry: people.mentionRegistry,
      },
    );
    const status = buildStatusDataset(
      [
        incident({
          id: '2026/04/electricity-river-10kv-line-damage',
          title: 'Отключение электричества в Шелково Ривер',
          service: 'electricity',
          kind: 'incident',
          started_at: '22.04.2026 11:30',
          ended_at: '23.04.2026 00:06',
          areas: ['river'],
          body: 'После [осмотра линии](@kschemelinin) повреждение признали редким.',
        }),
      ],
      {
        mentionRegistry: people.mentionRegistry,
      },
    );
    const graph = buildPeopleGraphDataset(
      people,
      createEntityMentionGraph(sourceRefs({ people, news, status })),
    );
    const backlinks = graph.bySlug.get('kschemelinin')?.backlinks;

    expect(backlinks).toMatchObject({
      news: [
        {
          kind: 'article',
          sourceId: '2026/05/electricity',
          excerpt:
            'Основной текст после комментария специалиста. Позже добавили уточнение от дежурного инженера.',
        },
      ],
      status: [
        {
          kind: 'incident',
          sourceId: '2026/04/electricity-river-10kv-line-damage',
          excerpt: 'После осмотра линии повреждение признали редким.',
        },
      ],
      people: [
        {
          kind: 'person',
          sourceId: 'apetrov',
          excerpt: 'Работал вместе с главным инженером над разбором аварии.',
        },
      ],
    });
    expect(JSON.stringify(backlinks)).not.toContain('@kschemelinin');
  });
});
