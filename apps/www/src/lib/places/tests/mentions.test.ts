import { describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';

import { createPlaceMentionRefs } from '../mentions';
import type { Place } from '../types';

const target = createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин');

const place = (mentions: Place['mentions'] = [target]) => ({
  slug: 'burzhuyka',
  name: 'Буржуйка',
  body: 'Первый абзац с [Кирилл Щемелинин](/people/kschemelinin/).\n\nВторой абзац.',
  mentions,
  url: '/map/burzhuyka/',
  markdownUrl: '/map/burzhuyka/index.md',
});

describe('createPlaceMentionRefs', () => {
  it('adapts place body mentions into graph refs', () => {
    expect(createPlaceMentionRefs(place())).toMatchInlineSnapshot(`
      [
        {
          "excerpt": "Первый абзац с Кирилл Щемелинин.",
          "htmlUrl": "/map/burzhuyka/",
          "markdownUrl": "/map/burzhuyka/index.md",
          "source": {
            "id": "burzhuyka",
            "kind": "place",
            "section": "places",
          },
          "target": {
            "slug": "kschemelinin",
            "type": "person",
          },
          "title": "Буржуйка",
        },
      ]
    `);
  });

  it('dedupes repeated targets inside one place', () => {
    expect(createPlaceMentionRefs(place([target, target]))).toHaveLength(1);
  });
});
