import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSiteMentionRegistry } from '@/lib/mentions';
import { createPersonMentionTarget } from '@/lib/people/mentions';

import type { ContactEntry } from '../load';

const mocks = vi.hoisted(() => ({
  renderMarkdown: vi.fn(),
}));

vi.mock('@/lib/markdown/render', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/markdown/render')>();

  return {
    ...actual,
    renderMarkdown: mocks.renderMarkdown,
  };
});

let buildContactsDataset: typeof import('../load').buildContactsDataset;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildContactsDataset } = await import('../load'));
});

beforeEach(() => {
  mocks.renderMarkdown.mockClear();
});

const entry = (input: {
  readonly id: string;
  readonly body?: string;
  readonly data?: Partial<ContactEntry['data']>;
}): ContactEntry => ({
  id: input.id,
  body: input.body ?? 'Работает с заборами и воротами.',
  data: {
    title: 'Иван Петров',
    slug: input.id.split('/').pop() ?? input.id,
    category: 'fence',
    updated_at: '2026-07-06',
    contacts: {
      phone: '+7 900 000-00-00',
    },
    ...input.data,
  },
});

describe('buildContactsDataset', () => {
  it('accepts an empty launch dataset', () => {
    const data = buildContactsDataset([]);

    expect(data.contacts).toEqual([]);
    expect(data.byRoute.size).toBe(0);
    expect(data.categories).toEqual([]);
  });

  it('maps raw contacts to readonly camelCase domain contacts sorted by title', () => {
    const data = buildContactsDataset([
      entry({ id: 'fence/second-fence', data: { title: 'Яков' } }),
      entry({
        id: 'fence/first-fence',
        body: 'Перед началом работ стоит согласовать сроки с @kschemelinin.',
        data: {
          title: 'Анна',
          seo: {
            description: 'Контакт по заборам для жителей Шелково.',
          },
          search_aliases: ['где заказать забор'],
        },
      }),
    ]);

    expect(data.contacts.map((item) => item.slug)).toEqual([
      'first-fence',
      'second-fence',
    ]);
    expect(data.byRoute.get('fence/first-fence')).toMatchObject({
      canonical: 'https://kpshelkovo.online/sarafan/fence/first-fence/',
      markdownUrl: '/sarafan/fence/first-fence/index.md',
      url: '/sarafan/fence/first-fence/',
      title: 'Анна',
      searchAliases: ['где заказать забор'],
    });
    expect(data.categories).toMatchObject([
      {
        category: 'fence',
        markdownUrl: '/sarafan/fence/index.md',
        url: '/sarafan/fence/',
      },
    ]);
  });

  it('orders categories by their usefulness to residents', () => {
    const data = buildContactsDataset([
      entry({ id: 'fence/fence', data: { category: 'fence' } }),
      entry({
        id: 'education/education',
        data: { category: 'education' },
      }),
      entry({ id: 'garden/garden', data: { category: 'garden' } }),
      entry({
        id: 'waste-removal/waste-removal',
        data: { category: 'waste-removal' },
      }),
      entry({
        id: 'construction/construction',
        data: { category: 'construction' },
      }),
      entry({
        id: 'electricity/electricity',
        data: { category: 'electricity' },
      }),
    ]);

    expect(data.categories.map((item) => item.category)).toEqual([
      'electricity',
      'construction',
      'fence',
      'waste-removal',
      'education',
      'garden',
    ]);
  });

  it('gives blank-body contacts reachable detail URLs', () => {
    const data = buildContactsDataset([
      entry({ id: 'fence/blank-body', body: '' }),
    ]);
    const contact = data.byRoute.get('fence/blank-body');

    expect({
      body: contact?.body,
      canonical: contact?.canonical,
      markdownUrl: contact?.markdownUrl,
      url: contact?.url,
    }).toMatchInlineSnapshot(`
      {
        "body": "",
        "canonical": "https://kpshelkovo.online/sarafan/fence/blank-body/",
        "markdownUrl": "/sarafan/fence/blank-body/index.md",
        "url": "/sarafan/fence/blank-body/",
      }
    `);
  });

  it('preprocesses body mentions with the app-level registry when provided', () => {
    const registry = createSiteMentionRegistry([
      createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
    ]);
    const data = buildContactsDataset(
      [
        entry({
          id: 'fence/with-mention',
          body: 'Работал у @kschemelinin на участке.',
        }),
      ],
      { mentionRegistry: registry },
    );

    expect(data.contacts[0]).toMatchObject({
      body: 'Работал у [Кирилл Щемелинин](/people/kschemelinin/) на участке.',
      mentions: [expect.objectContaining({ slug: 'kschemelinin' })],
    });
  });

  it('keeps review markdown out of the HTML presentation boundary', () => {
    const data = buildContactsDataset([
      entry({
        id: 'fence/with-review',
        data: {
          reviews: [
            {
              sentiment: 'positive',
              summary: 'Помог с **электричеством**.',
              published_at: '2026-04-07',
              url: 'https://t.me/example/1',
            },
          ],
        },
      }),
    ]);

    expect(data.contacts[0]?.reviews).toMatchInlineSnapshot(`
      [
        {
          "publishedAt": 2026-04-07T00:00:00.000Z,
          "publishedIso": "2026-04-07",
          "sentiment": "positive",
          "summary": "Помог с **электричеством**.",
          "url": "https://t.me/example/1",
        },
      ]
    `);
    expect(mocks.renderMarkdown).not.toHaveBeenCalled();
  });

  it('maps enabled vCard options and ignores disabled ones', () => {
    const data = buildContactsDataset([
      entry({
        id: 'fence/with-vcard',
        data: {
          vcf: {
            enable: true,
            kind: 'person',
            name: { family: 'Петров', given: 'Иван' },
            note: 'Устанавливает заборы.',
          },
        },
      }),
      entry({
        id: 'fence/without-vcard',
        data: { vcf: { enable: false } },
      }),
    ]);

    expect(data.byRoute.get('fence/with-vcard')?.vcf).toMatchInlineSnapshot(`
      {
        "address": undefined,
        "downloadUrl": "/sarafan/fence/with-vcard/contact.vcf",
        "email": undefined,
        "filename": "with-vcard.vcf",
        "fullName": undefined,
        "jobTitle": undefined,
        "kind": "person",
        "name": {
          "family": "Петров",
          "given": "Иван",
        },
        "note": "Устанавливает заборы.",
        "organization": undefined,
        "phone": undefined,
        "role": undefined,
        "telegram": undefined,
        "website": undefined,
        "whatsapp": undefined,
      }
    `);
    expect(data.byRoute.get('fence/without-vcard')?.vcf).toBeUndefined();
  });

  it('fails when entry id does not match frontmatter slug', () => {
    expect(() =>
      buildContactsDataset([
        entry({ id: 'fence/wrong-id', data: { slug: 'real-slug' } }),
      ]),
    ).toThrow(
      'contact "fence/wrong-id" id must equal category and slug "fence/real-slug"',
    );
  });

  it('fails on duplicate routes', () => {
    expect(() =>
      buildContactsDataset([
        entry({ id: 'fence/same-slug' }),
        entry({ id: 'fence/same-slug', data: { title: 'Другой контакт' } }),
      ]),
    ).toThrow('duplicate contact route "fence/same-slug"');
  });
});
