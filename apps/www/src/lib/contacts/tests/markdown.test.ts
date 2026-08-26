import { beforeAll, describe, expect, it } from 'vitest';

import type { Contact, ContactCategoryPage } from '../types';

let buildContactMarkdown: typeof import('../markdown').buildContactMarkdown;
let buildContactsCategoryMarkdown: typeof import('../markdown').buildContactsCategoryMarkdown;
let buildContactsHomeMarkdown: typeof import('../markdown').buildContactsHomeMarkdown;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({
    buildContactMarkdown,
    buildContactsCategoryMarkdown,
    buildContactsHomeMarkdown,
  } = await import('../markdown'));
});

const contact = {
  slug: 'ivan-petrov-fence',
  title: 'Иван Петров',
  category: 'fence',
  updatedAt: new Date('2026-07-06T00:00:00.000Z'),
  updatedIso: '2026-07-06',
  searchAliases: ['служебный поисковый алиас'],
  contacts: {
    phone: '+7 900 000-00-00',
    telegram: 'https://t.me/example',
    email: 'team@example.com',
  },
  reviews: [
    {
      sentiment: 'positive',
      summary: 'Помог с **электричеством**.',
      summaryHtml: '<p>Помог с <strong>электричеством</strong>.</p>',
      publishedAt: new Date('2026-04-07T00:00:00.000Z'),
      publishedIso: '2026-04-07',
      url: 'https://t.me/example/1',
    },
  ],
  location: {
    title: 'Золото Сибири',
    url: 'https://yandex.ru/maps/-/CTq-BEOk',
    address: 'Пионерская ул., 21, пгт Малино',
    coordinates: { lat: 55.116326, lng: 38.16951 },
  },
  url: '/sarafan/fence/ivan-petrov-fence/',
  markdownUrl: '/sarafan/fence/ivan-petrov-fence/index.md',
  canonical: 'https://example.com/sarafan/fence/ivan-petrov-fence/',
  vcf: {
    kind: 'person',
    downloadUrl: '/sarafan/fence/ivan-petrov-fence/contact.vcf',
    filename: 'ivan-petrov-fence.vcf',
    name: { family: 'Петров', given: 'Иван' },
  },
  body: 'Работает с заборами и воротами. Перед началом работ стоит отдельно согласовать сроки, материалы и гарантию.\n\n## Что уточнить\n\nПеред оплатой уточняйте цену.',
  mentions: [],
} satisfies Contact;

const blankBodyContact = {
  slug: 'sergey',
  title: 'Сергей',
  category: 'fence',
  updatedAt: new Date('2026-07-06T00:00:00.000Z'),
  updatedIso: '2026-07-06',
  contacts: {
    phone: '+7 985 774-75-04',
  },
  reviews: [],
  url: '/sarafan/fence/sergey/',
  markdownUrl: '/sarafan/fence/sergey/index.md',
  canonical: 'https://example.com/sarafan/fence/sergey/',
  body: '',
  mentions: [],
} satisfies Contact;

const category = {
  category: 'fence',
  contacts: [contact, blankBodyContact],
  url: '/sarafan/fence/',
  markdownUrl: '/sarafan/fence/index.md',
} satisfies ContactCategoryPage;

describe('contacts markdown companions', () => {
  it('renders empty launch index without internal paths', () => {
    const markdown = buildContactsHomeMarkdown({
      contacts: [],
      categories: [],
      byRoute: new Map(),
      byCategory: new Map(),
    });

    expect(markdown).toMatchInlineSnapshot(`
      "# Сарафан

      Сарафан собирается из опыта соседей в [чате жителей Шелково](https://t.me/shelkovoecoclub): кого позвали, как прошла работа, к кому готовы обратиться снова. Лучше меньше контактов, зато с понятным живым контекстом. Также есть [табличка из соседнего чата Гринвуда](https://docs.google.com/spreadsheets/d/1ckmDY1B54Mx9UB1chbybwdbPTF87R--uv2li7VhCfg8/edit?usp=drivesdk).

      ## Категории

      Пока здесь ничего нет. Добавим контакты, когда появится живой опыт соседей.
      "
    `);
    expect(markdown).not.toMatch(/apps\/www|src\/|repo:/u);
  });

  it('renders list pages with contact links but without contact details', () => {
    const homeMarkdown = buildContactsHomeMarkdown({
      contacts: [contact, blankBodyContact],
      categories: [category],
      byRoute: new Map<string, Contact>([
        ['fence/ivan-petrov-fence', contact],
        ['fence/sergey', blankBodyContact],
      ]),
      byCategory: new Map([['fence', category]]),
    });
    const listPages = [homeMarkdown, buildContactsCategoryMarkdown(category)];

    expect(homeMarkdown).toContain(
      '[Забор](https://example.com/sarafan/fence/index.md)',
    );

    for (const markdown of listPages) {
      expect(markdown).toContain(
        '[Сергей](https://example.com/sarafan/fence/sergey/index.md)',
      );
      expect(markdown).not.toMatch(
        /\+7 900 000-00-00|t\.me\/example|yandex\.ru\/maps|contact\.vcf/u,
      );
    }
  });

  it('renders detail with structured frontmatter and body', () => {
    const markdown = buildContactMarkdown(contact);

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Иван Петров
      slug: ivan-petrov-fence
      category: Забор
      updated_at: 2026-07-06
      contacts:
        phone: +7 900 000-00-00
        telegram: https://t.me/example
        email: team@example.com
      location:
        title: Золото Сибири
        url: https://yandex.ru/maps/-/CTq-BEOk
        address: Пионерская ул., 21, пгт Малино
        coordinates:
          lat: 55.116326
          lng: 38.16951
      reviews:
        - sentiment: positive
          summary: Помог с **электричеством**.
          published_at: 2026-04-07
          url: https://t.me/example/1
      vcf_url: https://example.com/sarafan/fence/ivan-petrov-fence/contact.vcf
      ---

      # Иван Петров

      Работает с заборами и воротами. Перед началом работ стоит отдельно согласовать сроки, материалы и гарантию.

      ## Что уточнить

      Перед оплатой уточняйте цену.
      "
    `);
    expect(markdown).not.toContain('служебный поисковый алиас');
  });

  it('renders a detail page for a contact with an empty body', () => {
    expect(buildContactMarkdown(blankBodyContact)).toMatchInlineSnapshot(`
      "---
      title: Сергей
      slug: sergey
      category: Забор
      updated_at: 2026-07-06
      contacts:
        phone: +7 985 774-75-04
      ---

      # Сергей
      "
    `);
  });
});
