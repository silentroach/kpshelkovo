import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createEntityMentionGraph } from '@/lib/mentions';
import type { EntityMentionTarget } from '@/lib/mentions';
import { createPlaceBacklinksFromGraph } from '@/lib/places/backlinks';
import { buildPlaceMarkdown } from '@/lib/places/markdown';
import { createPlaceMentionTarget } from '@/lib/places/mentions';
import { testPlace } from '@/lib/places/tests/place.test-helper';
import { mapRawStatusIncident } from '@/lib/status/mapper';
import { createStatusIncidentMentionRefs } from '@/lib/status/mentions';
import { RawStatusIncidentSchema } from '@/lib/status/raw-schema';

import { schema } from '../discovery';
import { buildPeopleGraphDataset } from '../load';
import { buildPeoplePublicPayload } from '../public-dto';
import { buildPeopleDataset } from '../registry';
import { buildPersonMarkdown, formatPersonBacklinkKind } from '../view';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('status backlink consumers', () => {
  it.each(['scheduled', 'active', 'resolved'] as const)(
    'preserves both kinds independently of title and phase: %s',
    (phase) => {
      const people = buildPeopleDataset([
        { id: 'host', data: { name: 'Host', contacts: [] }, body: '' }
      ]);
      const registry = new Map<string, EntityMentionTarget>(people.mentionRegistry);
      registry.set('club', createPlaceMentionTarget('club', 'Клуб'));
      const incidents = (['incident', 'maintenance'] as const).map((kind) =>
        mapRawStatusIncident(
          {
            id: `2026/11/${kind}`,
            body: '@host @host @club @club',
            data: RawStatusIncidentSchema.parse({
              title: 'Водоснабжение',
              service: 'water',
              kind,
              started_at: '05.11.2026 10:00',
              ended_at: '05.11.2026 11:00',
              affected_places: ['club']
            })
          },
          {
            now: new Date(
              phase === 'scheduled'
                ? '2026-11-05T09:00:00+03:00'
                : phase === 'active'
                  ? '2026-11-05T10:30:00+03:00'
                  : '2026-11-05T12:00:00+03:00'
            ),
            mentionRegistry: registry
          }
        )
      );
      const graph = createEntityMentionGraph(incidents.flatMap(createStatusIncidentMentionRefs));
      const enriched = buildPeopleGraphDataset(people, graph);
      const profile = enriched.profiles[0]!;
      const place = { ...testPlace(), backlinks: createPlaceBacklinksFromGraph(graph, 'club') };
      const payload = buildPeoplePublicPayload(enriched);
      const status = { byId: new Map(incidents.map((item) => [item.id, item])) };

      expect(incidents.map((item) => item.phase)).toEqual([phase, phase]);
      expect(
        [profile.backlinks.status, place.backlinks.status].map((refs) =>
          refs.map((ref) => ref.kind)
        )
      ).toEqual([
        ['incident', 'maintenance'],
        ['incident', 'maintenance']
      ]);
      expect(
        payload.profiles[0]!.backlinks.status.map(({ kind, source_id }) => ({ kind, source_id }))
      ).toMatchInlineSnapshot(`
          [
            {
              "kind": "incident",
              "source_id": "2026/11/incident",
            },
            {
              "kind": "maintenance",
              "source_id": "2026/11/maintenance",
            },
          ]
        `);
      expect(z.fromJSONSchema(schema('https://example.com')).safeParse(payload).success).toBe(true);

      for (const markdown of [
        buildPersonMarkdown(profile),
        buildPlaceMarkdown(place),
        buildPlaceMarkdown(place, status)
      ]) {
        expect(markdown).toContain('/status/incidents/2026/11/incident/index.md) — Инцидент;');
        expect(markdown).toContain(
          '/status/incidents/2026/11/maintenance/index.md) — Плановые работы;'
        );
      }
      expect(profile.backlinks.status.map((ref) => formatPersonBacklinkKind(ref.kind))).toEqual([
        'Инцидент',
        'Плановые работы'
      ]);
    }
  );
});
