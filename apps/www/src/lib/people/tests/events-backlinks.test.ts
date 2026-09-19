import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildEventsDataset } from '@/lib/events/load';
import { createEventMentionRefs } from '@/lib/events/mentions';
import { RawEventSchema } from '@/lib/events/raw-schema';
import { createEntityMentionGraph } from '@/lib/mentions';
import { createPlaceBacklinksFromGraph } from '@/lib/places/backlinks';
import { formatPlaceBacklinkDate, placeBacklinkGroups } from '@/lib/places/view';

import { schema } from '../discovery';
import { buildPeopleGraphDataset } from '../load';
import { buildPeoplePublicPayload } from '../public-dto';
import { buildPeopleDataset } from '../registry';
import { buildPersonMarkdown, personBacklinkGroups } from '../view';

describe('event backlink consumers', () => {
  it.each(['2026-12-30', '30.12.2026 18:00'])(
    'preserves event precision and primary URLs through people JSON and backlink views: %s',
    (starts) => {
      const people = buildPeopleDataset([
        { id: 'host', data: { name: 'Host', contacts: [] }, body: '' }
      ]);
      const events = buildEventsDataset(
        [
          {
            id: 'exhibition',
            data: RawEventSchema.parse({
              slug: 'winter-exhibition',
              title: 'Exhibition',
              category: 'exhibitions',
              starts_at: starts,
              through: starts === '2026-12-30' ? '2027-01-03' : undefined,
              source_url: 'https://example.com/source'
            }),
            body: '@host and @host.'
          }
        ],
        people.mentionRegistry
      );
      const refs = events.events.flatMap(createEventMentionRefs);
      const graph = createEntityMentionGraph(refs);
      const enriched = buildPeopleGraphDataset(people, graph);
      const profile = enriched.profiles[0]!;
      const payload = buildPeoplePublicPayload(enriched);
      const backlink = payload.profiles[0]!.backlinks.events[0]!;

      expect(z.fromJSONSchema(schema('https://example.com')).safeParse(payload).success).toBe(true);
      expect(backlink.mentioned_at).toBe(events.events[0]!.startsIso);
      expect(new URL(backlink.html_url).pathname + new URL(backlink.html_url).hash).toBe(
        '/events/2026/12/winter-exhibition/'
      );
      expect(new URL(backlink.markdown_url).pathname).toBe(
        '/events/2026/12/winter-exhibition/index.md'
      );
      expect(payload.stats.backlink_count).toBe(1);
      expect(payload.profiles[0]!.backlink_count).toBe(1);
      expect(personBacklinkGroups(profile.backlinks).map((group) => group.section)).toEqual([
        'events'
      ]);
      const markdown = buildPersonMarkdown(profile);
      expect(markdown).toContain(backlink.markdown_url);
      expect(markdown).not.toContain('undefined');

      const placeGraph = createEntityMentionGraph(
        refs.map((ref) => ({
          ...ref,
          target: { type: 'place' as const, slug: 'venue' }
        }))
      );
      const groups = placeBacklinkGroups(createPlaceBacklinksFromGraph(placeGraph, 'venue'));
      expect(groups.map((group) => group.section)).toEqual(['events']);
      expect(formatPlaceBacklinkDate(groups[0]!.items[0]!)).toBe('30 декабря 2026');
    }
  );
});
