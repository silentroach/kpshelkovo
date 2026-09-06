import { describe, expect, it } from 'vitest';

import { KB_PAGE_FLAGS } from './page-flags';
import { RawKbPageSchema } from './raw-schema';

describe('RawKbPageSchema', () => {
  it('accepts supported page flags', () => {
    expect(
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: KB_PAGE_FLAGS,
      }),
    ).toEqual({
      title: 'Служебная статья',
      flags: KB_PAGE_FLAGS,
    });
  });

  it('accepts external and internal editorial sources', () => {
    expect(
      RawKbPageSchema.parse({
        title: 'Тариф на обслуживание',
        sources: [
          {
            url: ' https://example.com/tariff ',
            description: ' Подтверждает размер тарифа ',
          },
          {
            url: '/news/tariff-update/',
            description: 'Подтверждает дату введения тарифа',
          },
        ],
      }),
    ).toMatchInlineSnapshot(`
      {
        "flags": [],
        "sources": [
          {
            "description": "Подтверждает размер тарифа",
            "url": "https://example.com/tariff",
          },
          {
            "description": "Подтверждает дату введения тарифа",
            "url": "/news/tariff-update/",
          },
        ],
        "title": "Тариф на обслуживание",
      }
    `);
  });

  it.each([
    ['an empty source list', [], 'sources must not be empty'],
    [
      'duplicate source URLs',
      [
        { url: 'https://example.com/source', description: 'Первый факт' },
        { url: 'https://example.com/source', description: 'Второй факт' },
      ],
      'sources must not contain duplicate URLs',
    ],
    [
      'a non-http source URL',
      [{ url: 'mailto:editor@example.com', description: 'Контакт редактора' }],
      'sources[].url must be an http(s) URL or a root-relative site path',
    ],
    [
      'a relative source path',
      [{ url: 'news/tariff-update/', description: 'Подтверждает дату' }],
      'sources[].url must be an http(s) URL or a root-relative site path',
    ],
    [
      'a source path with a backslash',
      [{ url: '/\\example.com/source', description: 'Подтверждает факт' }],
      'sources[].url must be an http(s) URL or a root-relative site path',
    ],
    [
      'a blank source description',
      [{ url: 'https://example.com/source', description: '  ' }],
      'sources[].description must not be blank',
    ],
  ])('rejects %s', (_, sources, message) => {
    expect(() =>
      RawKbPageSchema.parse({ title: 'Служебная статья', sources }),
    ).toThrow(message);
  });

  it('rejects unknown page flags', () => {
    expect(() =>
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: ['draft'],
      }),
    ).toThrow();
  });
});
