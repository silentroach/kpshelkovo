import { beforeAll, describe, expect, it } from 'vitest';

import type { PersonProfile } from './types';

let buildPersonMarkdown: typeof import('./view').buildPersonMarkdown;
let describePersonProfile: typeof import('./view').describePersonProfile;
let formatPersonContactCompactDisplay: typeof import('./view').formatPersonContactCompactDisplay;
let formatPersonHeadline: typeof import('./view').formatPersonHeadline;
let mapRawPersonContact: typeof import('./mapper').mapRawPersonContact;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({
    buildPersonMarkdown,
    describePersonProfile,
    formatPersonContactCompactDisplay,
    formatPersonHeadline,
  } = await import('./view'));
  ({ mapRawPersonContact } = await import('./mapper'));
});

describe('mapRawPersonContact', () => {
  it('normalizes telegram handles with or without @', () => {
    expect(
      mapRawPersonContact(
        {
          type: 'telegram',
          value: 'Kirill_ZemlyaMO',
        },
        'people profile "kschemelinin" contact #1',
      ),
    ).toMatchObject({
      display: '@Kirill_ZemlyaMO',
      href: 'https://t.me/Kirill_ZemlyaMO',
    });

    expect(
      mapRawPersonContact(
        {
          type: 'telegram',
          value: '@Kirill_ZemlyaMO',
        },
        'people profile "kschemelinin" contact #1',
      ),
    ).toMatchObject({
      display: '@Kirill_ZemlyaMO',
      href: 'https://t.me/Kirill_ZemlyaMO',
    });
  });

  it('builds tel links from formatted phone numbers', () => {
    expect(
      mapRawPersonContact(
        {
          type: 'phone',
          value: '+7 (916) 555-12-34',
        },
        'people profile "kschemelinin" contact #1',
      ),
    ).toMatchObject({
      display: '+7 (916) 555-12-34',
      href: 'tel:+79165551234',
    });
  });
});

describe('describePersonProfile', () => {
  it('extracts the first paragraph as a plain-text description', () => {
    expect(
      describePersonProfile({
        name: 'Кирилл Щемелинин',
        body: 'Первый абзац с [ссылкой](https://example.com).\n\nВторой абзац.',
      }),
    ).toBe('Первый абзац с ссылкой.');
  });

  it('keeps person names after mention links are expanded', () => {
    expect(
      describePersonProfile({
        name: 'Андрей Петров',
        body: 'Как отметил [Кирилл Щемелинин](/people/kschemelinin/), проблема редкая.',
      }),
    ).toBe('Как отметил Кирилл Щемелинин, проблема редкая.');
  });

  it('falls back to position and company when body is empty', () => {
    expect(
      describePersonProfile({
        name: 'Кирилл Щемелинин',
        company: 'ОК "Комфорт"',
        position: 'Исполняющий обязанности директора по эксплуатации',
        body: '',
      }),
    ).toBe(
      'Кирилл Щемелинин — Исполняющий обязанности директора по эксплуатации, ОК "Комфорт".',
    );
  });
});

describe('formatPersonHeadline', () => {
  it('joins position and company into a single line', () => {
    expect(
      formatPersonHeadline({
        company: 'ОК "Комфорт"',
        position: 'Исполняющий обязанности директора по эксплуатации',
      }),
    ).toBe('Исполняющий обязанности директора по эксплуатации, ОК "Комфорт"');
  });
});

describe('formatPersonContactCompactDisplay', () => {
  it('omits the at-sign for telegram when the icon already conveys the type', () => {
    expect(
      formatPersonContactCompactDisplay({
        type: 'telegram',
        display: '@Kirill_ZemlyaMO',
      }),
    ).toBe('Kirill_ZemlyaMO');

    expect(
      formatPersonContactCompactDisplay({
        type: 'phone',
        display: '+7 (916) 555-12-34',
      }),
    ).toBe('+7 (916) 555-12-34');
  });
});

describe('buildPersonMarkdown', () => {
  it('renders contacts, body, and backlinks into the markdown companion', () => {
    const profile: PersonProfile = {
      id: 'kschemelinin',
      slug: 'kschemelinin',
      name: 'Кирилл Щемелинин',
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
      body: 'Публичный профиль с контекстом.',
      mentions: [],
      backlinks: {
        news: [
          {
            section: 'news',
            kind: 'article',
            sourceId: '2026/05/electricity',
            title: 'Авария на линии',
            htmlUrl: '/news/2026/05/electricity/',
            markdownUrl: '/news/2026/05/electricity/index.md',
            excerpt: 'Основной текст про Кирилла Щемелинина.',
            mentionedAt: '2026-05-03T09:00:00+03:00',
            sortKey: 1,
          },
        ],
        status: [
          {
            section: 'status',
            kind: 'incident',
            sourceId: '2026/04/electricity-river-10kv-line-damage',
            title: 'Отключение электричества в Шелково Ривер',
            htmlUrl:
              '/status/incidents/2026/04/electricity-river-10kv-line-damage/',
            markdownUrl:
              '/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md',
            excerpt: 'Как отметил Кирилл Щемелинин, повреждение было редким.',
            mentionedAt: '2026-04-22T11:30:00+03:00',
            sortKey: 2,
          },
        ],
        reviews: [],
        places: [
          {
            section: 'places',
            kind: 'place',
            sourceId: 'titanic',
            title: 'Детская площадка «Титаник»',
            htmlUrl: '/map/titanic/',
            markdownUrl: '/map/titanic/index.md',
            excerpt: 'Площадку показал Кирилл Щемелинин.',
            mentionedAt: '2026-08-19T00:00:00.000Z',
            sortKey: 3,
          },
        ],
        people: [],
        contacts: [],
      },
    };

    const markdown = buildPersonMarkdown(profile);

    expect(markdown).toMatchInlineSnapshot(`
      "# Кирилл Щемелинин

      Исполняющий обязанности директора по эксплуатации, ОК "Комфорт"

      ## Контакты

      - Telegram: [@Kirill\\_ZemlyaMO](https://t.me/Kirill_ZemlyaMO)

      ## Профиль

      Публичный профиль с контекстом.

      ## Где упоминается

      ### Новости

      - [Авария на линии](https://example.com/news/2026/05/electricity/index.md) — Новость; 3 мая 2026

        Основной текст про Кирилла Щемелинина.

      ### Статус

      - [Отключение электричества в Шелково Ривер](https://example.com/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md) — Инцидент; 22 апреля

        Как отметил Кирилл Щемелинин, повреждение было редким.

      ### Карта

      - [Детская площадка «Титаник»](https://example.com/map/titanic/index.md) — Место; 19 августа 2026

        Площадку показал Кирилл Щемелинин.
      "
    `);
  });

  it('parses profile body as Markdown fragment without nested frontmatter', () => {
    const profile: PersonProfile = {
      id: 'kschemelinin',
      slug: 'kschemelinin',
      name: 'Кирилл Щемелинин',
      company: 'ОК "Комфорт"',
      position: 'Исполняющий обязанности директора по эксплуатации',
      url: '/people/kschemelinin/',
      markdownUrl: '/people/kschemelinin/index.md',
      canonical: 'https://example.com/people/kschemelinin/',
      contacts: [],
      body: [
        '---',
        'internal: true',
        '---',
        '',
        '### Роль',
        '',
        'Помогает с [инцидентами](/status/index.md).',
      ].join('\n'),
      mentions: [],
      backlinks: {
        news: [],
        status: [],
        reviews: [],
        places: [],
        people: [],
        contacts: [],
      },
    };

    const markdown = buildPersonMarkdown(profile);

    expect(markdown).toMatchInlineSnapshot(`
      "# Кирилл Щемелинин

      Исполняющий обязанности директора по эксплуатации, ОК "Комфорт"

      ## Контакты

      - Контакты пока не опубликованы.

      ## Профиль

      ### Роль

      Помогает с [инцидентами](/status/index.md).

      ## Где упоминается

      - Пока публичных упоминаний не найдено.
      "
    `);
  });

  it('omits profile section when markdown body is empty', () => {
    const profile: PersonProfile = {
      id: 'kschemelinin',
      slug: 'kschemelinin',
      name: 'Кирилл Щемелинин',
      company: 'ОК "Комфорт"',
      position: 'Исполняющий обязанности директора по эксплуатации',
      url: '/people/kschemelinin/',
      markdownUrl: '/people/kschemelinin/index.md',
      canonical: 'https://example.com/people/kschemelinin/',
      contacts: [
        {
          type: 'phone',
          value: '+7 (967) 246-37-49',
          display: '+7 (967) 246-37-49',
          href: 'tel:+79672463749',
        },
      ],
      body: '',
      mentions: [],
      backlinks: {
        news: [],
        status: [],
        reviews: [],
        places: [],
        people: [],
        contacts: [],
      },
    };

    const markdown = buildPersonMarkdown(profile);

    expect(markdown).toMatchInlineSnapshot(`
      "# Кирилл Щемелинин

      Исполняющий обязанности директора по эксплуатации, ОК "Комфорт"

      ## Контакты

      - Телефон: [+7 (967) 246-37-49](tel:+79672463749)

      ## Где упоминается

      - Пока публичных упоминаний не найдено.
      "
    `);
  });
});
