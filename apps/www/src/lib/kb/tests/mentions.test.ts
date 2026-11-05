import { beforeAll, describe, expect, it } from 'vitest';

import {
  createEntityMentionGraph,
  createSiteBacklinksFromGraph,
  type SiteMentionRegistry
} from '@/lib/mentions';
import { createPeopleBacklinksFromGraph } from '@/lib/people/backlinks';

import type { KbPageEntry } from '../load';

let buildKbPages: typeof import('../load').buildKbPages;
let createKbPageMentionRefs: typeof import('../mentions').createKbPageMentionRefs;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ buildKbPages } = await import('../load'));
  ({ createKbPageMentionRefs } = await import('../mentions'));
});

const mentionRegistry: SiteMentionRegistry = new Map([
  [
    'gate',
    {
      type: 'place',
      slug: 'gate',
      label: 'КПП',
      labelCases: { gen: 'КПП' },
      htmlUrl: '/map/gate/',
      markdownUrl: '/map/gate/index.md'
    }
  ],
  [
    'resident',
    {
      type: 'person',
      slug: 'resident',
      label: 'Житель',
      htmlUrl: '/people/resident/',
      markdownUrl: '/people/resident/index.md'
    }
  ]
]);

const entry = (id: string, body: string): KbPageEntry => ({
  id,
  body,
  data: { title: 'Проезд' }
});

describe('KB mention sources', () => {
  it('deduplicates canonical, declined and labelled mentions and keeps body context and route companions', () => {
    const pages = buildKbPages(
      [entry('travel/gates/index', 'Проезд через @gate.\n\nУ @gate:gen и [въезда](@gate).')],
      { mentionRegistry }
    );

    expect(pages.flatMap(createKbPageMentionRefs)).toMatchInlineSnapshot(`
      [
        {
          "excerpt": "Проезд через КПП.",
          "htmlUrl": "/kb/travel/gates/",
          "markdownUrl": "/kb/travel/gates/index.md",
          "source": {
            "id": "/kb/travel/gates/",
            "kind": "guide",
            "section": "kb",
          },
          "target": {
            "slug": "gate",
            "type": "place",
          },
          "title": "Проезд",
        },
      ]
    `);
  });

  it('preserves different pages as distinct undated sources, including the KB root', () => {
    const pages = buildKbPages([entry('travel/gates', '@gate'), entry('index', '@gate')], {
      mentionRegistry
    });
    const refs = pages.flatMap(createKbPageMentionRefs);
    const graph = createEntityMentionGraph([...refs, ...refs]);
    const backlinks = createSiteBacklinksFromGraph(graph, { type: 'place', slug: 'gate' });

    expect(
      backlinks.kb.map(({ sourceId, htmlUrl, markdownUrl, mentionedAt, sortKey }) => ({
        sourceId,
        htmlUrl,
        markdownUrl,
        mentionedAt,
        sortKey
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "htmlUrl": "/kb/",
          "markdownUrl": "/kb/index.md",
          "mentionedAt": undefined,
          "sortKey": undefined,
          "sourceId": "/kb/",
        },
        {
          "htmlUrl": "/kb/travel/gates/",
          "markdownUrl": "/kb/travel/gates/index.md",
          "mentionedAt": undefined,
          "sortKey": undefined,
          "sourceId": "/kb/travel/gates/",
        },
      ]
    `);
  });

  it('does not infer refs from plain text, map links, coordinates or editorial sources', () => {
    const pages = buildKbPages(
      [
        {
          id: 'travel',
          body: 'КПП: [карточка](/map/gate/), [карта](/map/?h=gate), 55.12, 37.12.',
          data: {
            title: 'Проезд',
            sources: [{ url: 'https://example.com/gate', description: 'Про @gate' }]
          }
        }
      ],
      { mentionRegistry }
    );

    expect(pages.flatMap(createKbPageMentionRefs)).toEqual([]);
  });

  it('still resolves people in body without adding KB backlinks or a KB group to people', () => {
    const pages = buildKbPages([entry('travel', '@resident рассказал про @gate.')], {
      mentionRegistry
    });
    const graph = createEntityMentionGraph(pages.flatMap(createKbPageMentionRefs));

    expect(pages[0]?.body).toContain('[Житель](/people/resident/)');
    expect(graph.targets.has('person:resident')).toBe(false);
    expect(createPeopleBacklinksFromGraph(graph, { slug: 'resident' })).toMatchInlineSnapshot(`
      {
        "contacts": [],
        "events": [],
        "news": [],
        "people": [],
        "places": [],
        "reviews": [],
        "status": [],
      }
    `);
  });
});
