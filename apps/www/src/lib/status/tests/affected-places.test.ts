import { beforeAll, describe, expect, it } from 'vitest';

import { createEntityMentionGraph, getEntityMentionGraphRefs } from '@/lib/mentions';
import type { EntityMentionTarget, SiteMentionRegistry } from '@/lib/mentions';
import { createPersonMentionTarget } from '@/lib/people/mentions';
import { createPlaceMentionTarget } from '@/lib/places/mentions';

import { RawStatusIncidentSchema } from '../raw-schema';

let mapRawStatusIncident: typeof import('../mapper').mapRawStatusIncident;
let createStatusIncidentMentionRefs: typeof import('../mentions').createStatusIncidentMentionRefs;
let buildStatusPublicPayload: typeof import('../public-dto').buildStatusPublicPayload;
let buildStatusDataset: typeof import('../load').buildStatusDataset;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ mapRawStatusIncident } = await import('../mapper'));
  ({ createStatusIncidentMentionRefs } = await import('../mentions'));
  ({ buildStatusPublicPayload } = await import('../public-dto'));
  ({ buildStatusDataset } = await import('../load'));
});

const registry: SiteMentionRegistry = new Map<string, EntityMentionTarget>([
  ['gate', createPlaceMentionTarget('gate', 'Gate')],
  ['detour', createPlaceMentionTarget('detour', 'Detour')],
  ['person', createPersonMentionTarget('person', 'Person')]
]);
const now = new Date('2026-05-03T12:00:00+03:00');
const entry = (affectedPlaces?: readonly string[], body = '', slug = 'works') => ({
  id: `2026/05/${slug}`,
  body,
  data: RawStatusIncidentSchema.parse({
    title: 'Works',
    service: 'dam',
    kind: 'maintenance',
    started_at: '03.05.2026 00:30',
    affected_places: affectedPlaces
  })
});
const incident = (affectedPlaces?: readonly string[], body = '', slug = 'works') =>
  mapRawStatusIncident(entry(affectedPlaces, body, slug), { now, mentionRegistry: registry });

describe('status affected places', () => {
  it('maps an omitted list to an empty domain list without creating refs', () => {
    const record = incident();
    expect(record.affectedPlaces).toEqual([]);
    expect(createStatusIncidentMentionRefs(record)).toEqual([]);
  });

  it.each(['missing', 'person'])('rejects a non-place target %s with record context', (slug) => {
    expect(() => incident([slug])).toThrow(
      `status incident "2026/05/works" affected_places target "${slug}" must reference an existing place`
    );
  });

  it.each([[''], ['gate', 'gate'], ['gate', ' gate ']])(
    'rejects empty and duplicate raw targets: %j',
    (...slugs) => {
      expect(() => entry(slugs)).toThrow();
    }
  );

  it('links a bodyless explicit relation to the Moscow calendar day and month companion', () => {
    const record = incident(['gate']);
    expect(record.hasPage).toBe(false);
    expect(createStatusIncidentMentionRefs(record)).toMatchInlineSnapshot(`
      [
        {
          "excerpt": undefined,
          "htmlUrl": "/status/calendar/2026/05/#2026-05-03",
          "markdownUrl": "/status/calendar/2026/05/index.md",
          "mentionedAt": "2026-05-03T00:30:00+03:00",
          "sortKey": 1777757400000,
          "source": {
            "id": "2026/05/works",
            "kind": "maintenance",
            "section": "status",
          },
          "target": {
            "slug": "gate",
            "type": "place",
          },
          "title": "Works",
        },
      ]
    `);
  });

  it('unions explicit places and body mentions without changing detail destinations', () => {
    const record = incident(['gate'], '@gate @gate @detour @person');
    const refs = createStatusIncidentMentionRefs(record);
    expect(refs.map((ref) => ref.target)).toMatchInlineSnapshot(`
      [
        {
          "slug": "gate",
          "type": "place",
        },
        {
          "slug": "detour",
          "type": "place",
        },
        {
          "slug": "person",
          "type": "person",
        },
      ]
    `);
    expect(record.affectedPlaces).toEqual(['gate']);
    expect(refs.map((ref) => ref.source.kind)).toEqual([
      'maintenance',
      'maintenance',
      'maintenance'
    ]);
    expect(refs.every((ref) => ref.htmlUrl === '/status/incidents/2026/05/works/')).toBe(true);
    expect(
      refs.every((ref) => ref.markdownUrl === '/status/incidents/2026/05/works/index.md')
    ).toBe(true);
  });

  it('includes an explicit place absent from the detail body', () => {
    expect(createStatusIncidentMentionRefs(incident(['gate'], '@person')).map((ref) => ref.target))
      .toMatchInlineSnapshot(`
        [
          {
            "slug": "person",
            "type": "person",
          },
          {
            "slug": "gate",
            "type": "place",
          },
        ]
      `);
  });

  it('ignores incidental mentions on a list-only domain record', () => {
    const record = incident(['gate']);
    const refs = createStatusIncidentMentionRefs({
      ...record,
      mentions: [...registry.values()]
    });
    expect(refs.map((ref) => ref.target.slug)).toEqual(['gate']);
  });

  it('keeps independent records on the same calendar day as distinct graph sources', () => {
    const refs = [incident(['gate']), incident(['gate'], '', 'other')].flatMap(
      createStatusIncidentMentionRefs
    );
    const graphRefs = getEntityMentionGraphRefs(
      createEntityMentionGraph(refs),
      'place',
      'gate',
      'status'
    );
    expect(graphRefs.map((ref) => ref.source.id)).toEqual(['2026/05/other', '2026/05/works']);
    expect(new Set(graphRefs.map((ref) => ref.htmlUrl)).size).toBe(1);
    expect(graphRefs.map((ref) => ref.source.kind)).toEqual(['maintenance', 'maintenance']);
  });

  it('does not extend the public JSON contract with explicit relations', () => {
    const withRelations = buildStatusDataset([entry(['gate'])], { now, mentionRegistry: registry });
    const withoutRelations = buildStatusDataset([entry()], { now, mentionRegistry: registry });
    expect(buildStatusPublicPayload(withRelations)).toEqual(
      buildStatusPublicPayload(withoutRelations)
    );
  });
});
