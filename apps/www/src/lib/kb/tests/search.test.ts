import { describe, expect, it } from 'vitest';

import { isKbPageSearchable } from '../search';

describe('isKbPageSearchable', () => {
  it('includes articles and excludes sections, noindex, and opted-out pages', () => {
    const cases = [
      {
        sourceId: 'services/internet/fiber',
        flags: [] as const,
        isSection: false,
      },
      { sourceId: 'index', flags: [] as const, isSection: true },
      {
        sourceId: 'services/internet',
        flags: [] as const,
        isSection: true,
      },
      {
        sourceId: 'court/order-debt',
        flags: ['noindex'] as const,
        isSection: false,
      },
      {
        sourceId: 'before-you-buy/how-to-choose-plot',
        flags: ['exclude-from-site-search'] as const,
        isSection: false,
      },
    ].map((page) => ({
      sourceId: page.sourceId,
      searchable: isKbPageSearchable(page),
    }));

    expect(cases).toMatchInlineSnapshot(`
      [
        {
          "searchable": true,
          "sourceId": "services/internet/fiber",
        },
        {
          "searchable": false,
          "sourceId": "index",
        },
        {
          "searchable": false,
          "sourceId": "services/internet",
        },
        {
          "searchable": false,
          "sourceId": "court/order-debt",
        },
        {
          "searchable": false,
          "sourceId": "before-you-buy/how-to-choose-plot",
        },
      ]
    `);
  });
});
