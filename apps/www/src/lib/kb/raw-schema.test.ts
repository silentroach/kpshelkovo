import { describe, expect, it } from 'vitest';

import { KB_PAGE_FLAGS } from './page-flags';
import { RawKbPageSchema } from './raw-schema';

const source = (url: string, description = 'Подтверждает факт') => ({
  url,
  description
});

describe('RawKbPageSchema', () => {
  it('accepts supported page flags', () => {
    expect(
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: KB_PAGE_FLAGS
      })
    ).toEqual({
      title: 'Служебная статья',
      flags: KB_PAGE_FLAGS
    });
  });

  it('accepts external and internal editorial sources', () => {
    expect(
      RawKbPageSchema.parse({
        title: 'Тариф на обслуживание',
        sources: [
          {
            url: ' https://example.com/tariff ',
            description: ' Подтверждает размер тарифа '
          },
          {
            url: '/news/tariff-update/',
            description: 'Подтверждает дату введения тарифа'
          }
        ]
      }).sources
    ).toMatchInlineSnapshot(`
      [
        {
          "description": "Подтверждает размер тарифа",
          "url": "https://example.com/tariff",
        },
        {
          "description": "Подтверждает дату введения тарифа",
          "url": "/news/tariff-update/",
        },
      ]
    `);
  });

  it.each([
    [[]],
    [[source('https://example.com/source'), source('https://example.com/source')]],
    [[source('mailto:editor@example.com')]],
    [[source('news/tariff-update/')]],
    [[source('/\\example.com/source')]],
    [[source('https://example.com/source', '  ')]]
  ])('rejects invalid editorial sources %#', (sources) => {
    expect(() => RawKbPageSchema.parse({ title: 'Служебная статья', sources })).toThrow();
  });

  it('rejects unknown page flags', () => {
    expect(() =>
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: ['draft']
      })
    ).toThrow();
  });
});
