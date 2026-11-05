import { describe, expect, it } from 'vitest';

import { getPlaceStatusContext, selectPlaceRelatedMaterials } from '../related';
import type { PlaceMentionRef } from '../types';
import { testRelatedPlace, testRelatedStatus } from './related.test-helper';

const article = (id: string, date = '2026-11-05T11:00:00+03:00'): PlaceMentionRef => ({
  section: 'news',
  kind: 'article',
  sourceId: id,
  title: id,
  htmlUrl: `/news/${id}/`,
  markdownUrl: `/news/${id}/index.md`,
  mentionedAt: date
});

describe('place related materials', () => {
  it('orders every affected current/future record and excludes indirect references', () => {
    const incidents = [
      testRelatedStatus('future-later', { started_at: '05.11.2026 15:00' }),
      testRelatedStatus('current-work', {}),
      testRelatedStatus('older-incident', { kind: 'incident', started_at: '04.11.2026 10:00' }),
      testRelatedStatus('future-first', { kind: 'incident', started_at: '05.11.2026 13:00' }),
      testRelatedStatus('newer-incident', { kind: 'incident', started_at: '05.11.2026 11:00' }),
      testRelatedStatus('indirect', { affected_places: [] }, 'Объезд через @club.'),
      testRelatedStatus('resolved', { ended_at: '05.11.2026 12:00' })
    ];
    const result = selectPlaceRelatedMaterials(testRelatedPlace(incidents), {
      byId: new Map(incidents.map((incident) => [incident.id, incident]))
    });
    expect(result.priority.map(({ incident }) => incident.slug)).toMatchInlineSnapshot(`
      [
        "newer-incident",
        "older-incident",
        "current-work",
        "future-first",
        "future-later",
      ]
    `);
    expect(result.history.map(({ incident }) => incident?.slug)).toMatchInlineSnapshot(`
      [
        "indirect",
        "resolved",
      ]
    `);
  });

  it('uses start rather than future end and removes priority IDs before the history limit', () => {
    const incidents = [
      testRelatedStatus('priority', {}),
      testRelatedStatus(
        'old-window',
        { started_at: '01.11.2026', ended_at: '20.11.2026', affected_places: [] },
        '@club'
      )
    ];
    const place = testRelatedPlace(incidents);
    const result = selectPlaceRelatedMaterials(
      {
        ...place,
        backlinks: {
          ...place.backlinks,
          news: [article('Альфа'), article('Бета'), article('Гамма', '2026-11-03T10:00:00+03:00')]
        }
      },
      { byId: new Map(incidents.map((incident) => [incident.id, incident])) }
    );
    expect(result.history.map(({ ref }) => ref.sourceId)).toMatchInlineSnapshot(`
      [
        "Альфа",
        "Бета",
        "Гамма",
      ]
    `);
  });

  it('interleaves news/status using start/publication and resolves ties by title, section and ID', () => {
    const incident = testRelatedStatus('same', { title: 'Общее', affected_places: [] }, '@club');
    const place = testRelatedPlace([incident]);
    const date = incident.started.iso;
    const news = [article('b', date), article('a', date)].map((ref) => ({
      ...ref,
      title: 'Общее'
    }));
    const result = selectPlaceRelatedMaterials(
      { ...place, backlinks: { ...place.backlinks, news } },
      { byId: new Map([[incident.id, incident]]) }
    );
    expect(result.history.map(({ ref }) => [ref.section, ref.sourceId])).toMatchInlineSnapshot(`
      [
        [
          "news",
          "a",
        ],
        [
          "news",
          "b",
        ],
        [
          "status",
          "2026/11/same",
        ],
      ]
    `);
  });

  it.each([0, 1, 2, 3, 6])(
    'samples %s unique KB candidates without changing full backlinks',
    (size) => {
      const place = testRelatedPlace();
      const kb = Array.from({ length: size }, (_, index): PlaceMentionRef => ({
        ...article(`${index}`),
        section: 'kb',
        kind: 'guide'
      }));
      const input = { ...place, backlinks: { ...place.backlinks, kb: [...kb, ...kb] } };
      const before = structuredClone(input.backlinks);
      const result = selectPlaceRelatedMaterials(input, { byId: new Map() }, () => 0.25);
      expect(result.knowledge).toHaveLength(Math.min(3, size));
      expect(new Set(result.knowledge.map((ref) => ref.sourceId)).size).toBe(
        result.knowledge.length
      );
      expect(result.knowledge.every((ref) => kb.includes(ref))).toBe(true);
      expect(input.backlinks).toEqual(before);
    }
  );

  it('preserves shared phase boundaries and uses local labels without a client clock', () => {
    const incidents = [
      testRelatedStatus('starts-now', { started_at: '05.11.2026 12:00' }),
      testRelatedStatus('ends-now', { ended_at: '05.11.2026 12:00' }),
      testRelatedStatus('future', { started_at: '05.11.2026 12:01' })
    ];
    expect(incidents.map((incident) => getPlaceStatusContext(incident).state))
      .toMatchInlineSnapshot(`
      [
        {
          "isActive": true,
          "label": "Плановые работы",
          "phase": "active",
          "tone": "warning",
        },
        {
          "isActive": false,
          "label": "Завершено",
          "phase": "resolved",
          "tone": "muted",
        },
        {
          "isActive": false,
          "label": "Запланировано",
          "phase": "scheduled",
          "tone": "info",
        },
      ]
    `);
  });
});
