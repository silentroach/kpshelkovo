import { beforeAll, describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '../people/mentions';
import type { StatusIncidentWithDetail } from './types';

let createStatusIncidentMentionRefs: typeof import('./mentions').createStatusIncidentMentionRefs;

beforeAll(async () => {
  ({ createStatusIncidentMentionRefs } = await import('./mentions'));
});

const target = createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин');

const incident = (input?: {
  readonly mentions?: StatusIncidentWithDetail['mentions'];
}): StatusIncidentWithDetail => ({
  id: '2026/04/electricity-river-10kv-line-damage',
  title: 'Отключение электричества в Шелково Ривер',
  hasPage: true,
  canonical: 'https://example.com/status/incidents/2026/04/electricity-river-10kv-line-damage/',
  service: 'electricity',
  kind: 'incident',
  year: 2026,
  month: 4,
  slug: 'electricity-river-10kv-line-damage',
  phase: 'active',
  appliesToAllAreas: true,
  areas: ['river', 'forest', 'park', 'village'],
  body: '' as StatusIncidentWithDetail['body'],
  sortStartedAt: 1770000000000,
  url: '/status/incidents/2026/04/electricity-river-10kv-line-damage/',
  markdownUrl: '/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md',
  excerpt: 'Как отметил Кирилл Щемелинин, повреждение было редким.',
  mentions: input?.mentions ?? [target],
  started: {
    at: new Date('2026-04-22T11:30:00+03:00'),
    iso: '2026-04-22T11:30:00+03:00',
    hasTime: true
  },
  sortLastChangeAt: 1770000000000
});

describe('createStatusIncidentMentionRefs', () => {
  it('creates incident source refs with status presentation fields', () => {
    expect(createStatusIncidentMentionRefs(incident())).toEqual([
      {
        target: { type: 'person', slug: 'kschemelinin' },
        source: {
          section: 'status',
          kind: 'incident',
          id: '2026/04/electricity-river-10kv-line-damage'
        },
        title: 'Отключение электричества в Шелково Ривер',
        htmlUrl: '/status/incidents/2026/04/electricity-river-10kv-line-damage/',
        markdownUrl: '/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md',
        excerpt: 'Как отметил Кирилл Щемелинин, повреждение было редким.',
        mentionedAt: '2026-04-22T11:30:00+03:00',
        sortKey: 1770000000000
      }
    ]);
  });

  it('dedupes repeated targets inside one incident', () => {
    expect(createStatusIncidentMentionRefs(incident({ mentions: [target, target] }))).toHaveLength(
      1
    );
  });
});
