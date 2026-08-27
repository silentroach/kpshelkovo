import { describe, expect, it } from 'vitest';

import { mapRawPersonMentionTarget } from './mentions';

describe('mapRawPersonMentionTarget', () => {
  it('adapts raw person identity fields to the generic mention contract', () => {
    expect(
      mapRawPersonMentionTarget({
        id: 'kschemelinin',
        data: {
          name: 'Кирилл Щемелинин',
          name_cases: { gen: 'Кирилла Щемелинина' },
          company: 'КПРФ',
          position: 'депутат',
          contacts: [],
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "company": "КПРФ",
        "htmlUrl": "/people/kschemelinin/",
        "label": "Кирилл Щемелинин",
        "labelCases": {
          "gen": "Кирилла Щемелинина",
        },
        "linkTitle": "депутат, КПРФ",
        "markdownUrl": "/people/kschemelinin/index.md",
        "name": "Кирилл Щемелинин",
        "nameCases": {
          "gen": "Кирилла Щемелинина",
        },
        "position": "депутат",
        "slug": "kschemelinin",
        "type": "person",
      }
    `);
  });
});
