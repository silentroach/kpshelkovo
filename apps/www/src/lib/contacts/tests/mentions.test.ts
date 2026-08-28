import { describe, expect, it } from 'vitest';

import { createContactMentionRefs } from '../mentions';
import type { Contact } from '../types';

const contact = {
  slug: 'ivan-petrov-fence',
  title: 'Иван Петров',
  category: 'fence',
  updatedAt: new Date('2026-07-06T00:00:00.000Z'),
  updatedIso: '2026-07-06',
  contacts: {
    phone: '+7 900 000-00-00',
  },
  reviews: [],
  url: '/sarafan/fence/ivan-petrov-fence/',
  markdownUrl: '/sarafan/fence/ivan-petrov-fence/index.md',
  canonical: 'https://example.com/sarafan/fence/ivan-petrov-fence/',
  body: 'Перед началом работ стоит согласовать сроки с [соседом](/people/kschemelinin/).',
  mentions: [
    {
      type: 'person',
      slug: 'kschemelinin',
      label: 'Кирилл Щемелинин',
      htmlUrl: '/people/kschemelinin/',
      markdownUrl: '/people/kschemelinin/index.md',
    },
  ],
} satisfies Contact;

describe('createContactMentionRefs', () => {
  it('adapts contact body mentions into graph refs', () => {
    expect(createContactMentionRefs(contact)).toMatchInlineSnapshot(`
      [
        {
          "excerpt": "Перед началом работ стоит согласовать сроки с соседом.",
          "htmlUrl": "/sarafan/fence/ivan-petrov-fence/",
          "markdownUrl": "/sarafan/fence/ivan-petrov-fence/index.md",
          "mentionedAt": "2026-07-06T00:00:00.000Z",
          "sortKey": 1783296000000,
          "source": {
            "id": "fence/ivan-petrov-fence",
            "kind": "contact",
            "section": "contacts",
          },
          "target": {
            "slug": "kschemelinin",
            "type": "person",
          },
          "title": "Иван Петров",
        },
      ]
    `);
  });

  it('does not read the body when the contact has no mentions', () => {
    expect(
      createContactMentionRefs({
        ...contact,
        get body(): string {
          throw new Error('body should not be read');
        },
        mentions: [],
      }),
    ).toEqual([]);
  });
});
