import { describe, expect, it } from 'vitest';

import { isEventSearchable } from '../search';

const now = Date.parse('2026-09-19T12:00:00+03:00');

describe('event search window at build time', () => {
  it('keeps future, current and recently ended events, including the 30-day boundary', () => {
    expect(
      (
        [
          ['future', { startsDate: '2026-12-01' }],
          ['current', { startsDate: '2026-09-19' }],
          ['recent', { startsDate: '2026-08-21' }],
          ['boundary', { startsDate: '2026-08-20' }],
          ['expired', { startsDate: '2026-08-19' }],
          ['multi-day', { startsDate: '2026-08-01', through: '2026-08-21' }],
          ['ended-late', { startsDate: '2026-08-01', endsIso: '2026-08-21T23:00:00+03:00' }],
          ['ended-early', { startsDate: '2026-08-01', endsIso: '2026-08-19T23:00:00+03:00' }]
        ] as const
      )
        .filter(([, event]) => isEventSearchable(event, now))
        .map(([id]) => id)
    ).toMatchInlineSnapshot(`
      [
        "future",
        "current",
        "recent",
        "boundary",
        "multi-day",
        "ended-late",
      ]
    `);
  });
});
