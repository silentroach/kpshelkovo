import { describe, expect, it } from 'vitest';

import { isKbPageSearchable } from '../search';

describe('isKbPageSearchable', () => {
  it('includes articles and excludes sections, noindex, and opted-out pages', () => {
    const cases = [
      {
        label: 'article',
        flags: [] as const,
        isSection: false,
      },
      { label: 'root', flags: [] as const, isSection: true },
      {
        label: 'section',
        flags: [] as const,
        isSection: true,
      },
      {
        label: 'noindex',
        flags: ['noindex'] as const,
        isSection: false,
      },
      {
        label: 'excluded',
        flags: ['exclude-from-site-search'] as const,
        isSection: false,
      },
    ].map((page) => ({
      label: page.label,
      searchable: isKbPageSearchable(page),
    }));

    expect(cases).toMatchInlineSnapshot(`
      [
        {
          "label": "article",
          "searchable": true,
        },
        {
          "label": "root",
          "searchable": false,
        },
        {
          "label": "section",
          "searchable": false,
        },
        {
          "label": "noindex",
          "searchable": false,
        },
        {
          "label": "excluded",
          "searchable": false,
        },
      ]
    `);
  });
});
