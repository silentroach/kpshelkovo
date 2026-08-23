import { describe, expect, it } from 'vitest';

import {
  createEntityMentionGraph,
  type EntityMentionSourceRef,
} from '@/lib/mentions';

import { createPlaceBacklinksFromGraph } from '../backlinks';
import { PLACE_MENTION_SECTIONS } from '../schema';

const refs: readonly EntityMentionSourceRef[] = [
  ['news', 'article', 'news-item'],
  ['status', 'incident', 'status-item'],
  ['reviews', 'review', 'review-item'],
  ['places', 'place', 'place-item'],
  ['people', 'person', 'person-item'],
  ['contacts', 'contact', 'contact-item'],
].map(([section, kind, id]) => ({
  target: { type: 'place', slug: 'apple-garden' },
  source: { section, kind, id },
  title: id,
  htmlUrl: `/${section}/${id}/`,
  markdownUrl: `/${section}/${id}/index.md`,
}));

describe('createPlaceBacklinksFromGraph', () => {
  it('projects every supported source section onto a place target', () => {
    const graph = createEntityMentionGraph([
      ...refs,
      {
        ...refs[0]!,
        target: { type: 'person', slug: 'apple-garden' },
        source: { section: 'news', kind: 'article', id: 'person-news' },
      },
    ]);
    const backlinks = createPlaceBacklinksFromGraph(graph, 'apple-garden');

    expect(
      Object.fromEntries(
        PLACE_MENTION_SECTIONS.map((section) => [
          section,
          backlinks[section].map((item) => item.sourceId),
        ]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "contacts": [
          "contact-item",
        ],
        "news": [
          "news-item",
        ],
        "people": [
          "person-item",
        ],
        "places": [
          "place-item",
        ],
        "reviews": [
          "review-item",
        ],
        "status": [
          "status-item",
        ],
      }
    `);
  });
});
