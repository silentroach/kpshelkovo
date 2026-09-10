import { describe, expect, it } from 'vitest';

import { buildStatusDataset } from '../load';
import { RawStatusIncidentSchema } from '../raw-schema';
import type { StatusKind } from '../schema';
import { isStatusIncidentSearchable } from '../search';

const now = new Date('2026-09-10T12:00:00+03:00');

describe('status event search window at build time', () => {
  it.each<StatusKind>(['incident', 'maintenance'])(
    'keeps future, ongoing and recently ended %s pages, including the 30-day boundary',
    (kind) => {
      const data = buildStatusDataset(
        [
          { slug: 'future', start: '01.12.2026 10:00', end: '01.12.2026 12:00' },
          { slug: 'future-open', start: '01.12.2026 10:00' },
          { slug: 'ongoing', start: '01.07.2026 10:00', end: '12.09.2026 12:00' },
          { slug: 'ongoing-open', start: '01.07.2026 10:00' },
          { slug: 'recent', start: '01.07.2026 10:00', end: '09.09.2026 12:00' },
          { slug: 'boundary', start: '01.08.2026 10:00', end: '11.08.2026 12:00' },
          { slug: 'expired', start: '01.08.2026 10:00', end: '11.08.2026 11:59' },
          { slug: 'list-only', start: '10.09.2026 10:00', end: '10.09.2026 11:00' }
        ].map(({ slug, start, end }) => ({
          id: `${start.slice(6, 10)}/${start.slice(3, 5)}/${slug}`,
          data: RawStatusIncidentSchema.parse({
            title: slug,
            kind,
            service: 'electricity',
            started_at: start,
            ended_at: end
          }),
          body: slug === 'list-only' ? '' : 'Описание события.'
        })),
        { now }
      );

      expect(
        data.incidents
          .filter((incident) => isStatusIncidentSearchable(incident, now.valueOf()))
          .map((incident) => incident.slug)
          .sort()
      ).toMatchInlineSnapshot(`
        [
          "boundary",
          "future",
          "future-open",
          "ongoing",
          "ongoing-open",
          "recent",
        ]
      `);
    }
  );
});
