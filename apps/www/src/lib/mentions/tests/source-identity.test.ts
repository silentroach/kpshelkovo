import { describe, expect, it } from 'vitest';

import { createEntityMentionGraph, getEntityMentionGraphRefs } from '../graph';
import type { EntityMentionSourceRef } from '../types';

const ref = (id: string, slug: string): EntityMentionSourceRef => ({
  target: { type: 'place', slug },
  source: { section: 'kb', kind: 'guide', id },
  title: 'Справка',
  htmlUrl: '/shared/',
  markdownUrl: '/shared/index.md'
});

describe('mention source identity', () => {
  it('deduplicates by source and target, not by destination URL', () => {
    const graph = createEntityMentionGraph([
      ref('a', 'gate'),
      ref('a', 'gate'),
      ref('b', 'gate'),
      ref('a', 'garden')
    ]);

    expect(
      ['gate', 'garden'].map((slug) => ({
        slug,
        sources: getEntityMentionGraphRefs(graph, 'place', slug, 'kb').map(
          ({ source }) => source.id
        )
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "slug": "gate",
          "sources": [
            "a",
            "b",
          ],
        },
        {
          "slug": "garden",
          "sources": [
            "a",
          ],
        },
      ]
    `);
  });
});
