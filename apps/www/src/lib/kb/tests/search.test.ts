import { describe, expect, it } from 'vitest';

import { isKbPageSearchable } from '../search';

describe('isKbPageSearchable', () => {
  it('includes leaves and excludes root, hub, and noindex sources', () => {
    const cases = [
      { sourceId: 'services/internet/fiber', flags: [] as const },
      { sourceId: 'index', flags: [] as const },
      { sourceId: 'services/internet/index', flags: [] as const },
      { sourceId: 'court/order-debt', flags: ['noindex'] as const },
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
          "sourceId": "services/internet/index",
        },
        {
          "searchable": false,
          "sourceId": "court/order-debt",
        },
      ]
    `);
  });
});
