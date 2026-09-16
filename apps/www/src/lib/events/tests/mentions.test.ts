import { describe, expect, it } from 'vitest';

import {
  createEntityMentionGraph,
  createSiteBacklinksFromGraph,
  createSiteMentionRegistry
} from '@/lib/mentions';

import { buildEventsDataset } from '../load';
import { createEventMentionRefs } from '../mentions';
import { RawEventSchema } from '../raw-schema';

const registry = createSiteMentionRegistry([
  {
    type: 'person',
    slug: 'host',
    label: 'Host',
    labelCases: { gen: 'Host genitive' },
    htmlUrl: '/people/host/',
    markdownUrl: '/people/host/index.md'
  },
  {
    type: 'place',
    slug: 'venue',
    label: 'Venue',
    htmlUrl: '/map/venue/',
    markdownUrl: '/map/venue/index.md'
  }
]);

const dataset = (body: string) =>
  buildEventsDataset(
    [
      {
        id: 'exhibition',
        data: RawEventSchema.parse({
          title: 'Exhibition',
          category: 'exhibitions',
          starts_at: '2026-12-30',
          through: '2027-01-03',
          source_url: 'https://example.com/exhibition'
        }),
        body
      }
    ],
    registry
  );

describe('event mentions', () => {
  it('resolves canonical, case and labelled mentions and links each target once to the starting day', () => {
    const data = dataset('@host, @host:gen and [the host](@host) at @venue.');
    const refs = data.events.flatMap(createEventMentionRefs);
    const graph = createEntityMentionGraph(refs);

    expect(data.calendar.days).toHaveLength(5);
    expect(data.events[0]?.body).toMatchInlineSnapshot(
      `"[Host](/people/host/), [Host genitive](/people/host/) and [the host](/people/host/) at [Venue](/map/venue/)."`
    );
    expect(
      refs.map((ref) => ({
        target: ref.target,
        source: ref.source,
        htmlUrl: ref.htmlUrl,
        markdownUrl: ref.markdownUrl
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "htmlUrl": "/events/2026/12/30/#exhibition",
          "markdownUrl": "/events/2026/12/30/index.md",
          "source": {
            "id": "exhibition",
            "kind": "event",
            "section": "events",
          },
          "target": {
            "slug": "host",
            "type": "person",
          },
        },
        {
          "htmlUrl": "/events/2026/12/30/#exhibition",
          "markdownUrl": "/events/2026/12/30/index.md",
          "source": {
            "id": "exhibition",
            "kind": "event",
            "section": "events",
          },
          "target": {
            "slug": "venue",
            "type": "place",
          },
        },
      ]
    `);
    expect(
      createSiteBacklinksFromGraph(graph, { type: 'person', slug: 'host' }).events
    ).toHaveLength(1);
    expect(
      createSiteBacklinksFromGraph(graph, { type: 'place', slug: 'venue' }).events
    ).toHaveLength(1);
  });

  it.each(['@missing', '@host:dat', '@host:unknown', '[host](@host:gen)'])(
    'rejects invalid mention %s at the event boundary',
    (body) => {
      expect(() => dataset(body)).toThrowErrorMatchingSnapshot();
    }
  );

  it('publishes no refs without mentions', () => {
    expect(dataset('No mentions.').events.flatMap(createEventMentionRefs)).toEqual([]);
  });
});
