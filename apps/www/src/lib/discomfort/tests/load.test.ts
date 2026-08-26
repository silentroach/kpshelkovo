import { beforeAll, describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';
import { createPlaceMentionTarget } from '@/lib/places/mentions';

import type { DiscomfortEventEntry } from '../load';

let buildDiscomfortDataset: typeof import('../load').buildDiscomfortDataset;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildDiscomfortDataset } = await import('../load'));
});

const entry = (input: {
  readonly id: string;
  readonly date: string;
  readonly title?: string;
  readonly body?: string;
}): DiscomfortEventEntry => ({
  id: input.id,
  body: input.body ?? 'Текст события.',
  data: {
    date: input.date,
    title: input.title ?? 'Событие',
  },
});

const mentionRegistry = new Map([
  ['ykizilov', createPersonMentionTarget('ykizilov', 'Юрий Кизилов')],
]);

describe('buildDiscomfortDataset', () => {
  it('maps events from oldest to newest with a stable slug tie-breaker', () => {
    const data = buildDiscomfortDataset(
      [
        entry({ id: 'newest', date: '2026-08-20' }),
        entry({ id: 'same-date-b', date: '2026-06-13' }),
        entry({ id: 'oldest', date: '2026-04-29' }),
        entry({ id: 'same-date-a', date: '2026-06-13' }),
      ],
      { mentionRegistry },
    );

    expect({
      slugs: data.events.map((event) => event.slug),
      latestEvent: data.latestEvent,
    }).toMatchInlineSnapshot(`
      {
        "latestEvent": {
          "body": "Текст события.",
          "dateIso": "2026-08-20",
          "mentions": [],
          "slug": "newest",
          "title": "Событие",
          "url": "/815/discomfort/#newest",
        },
        "slugs": [
          "oldest",
          "same-date-a",
          "same-date-b",
          "newest",
        ],
      }
    `);
  });

  it('keeps Markdown and expands person mentions through the site registry', () => {
    const data = buildDiscomfortDataset(
      [
        entry({
          id: 'with-mention',
          date: '2026-08-20',
          body: '**Факт** со [ссылкой](/news/) и комментарием @ykizilov.',
        }),
      ],
      { mentionRegistry },
    );

    expect(data.events[0]).toMatchObject({
      body: '**Факт** со [ссылкой](/news/) и комментарием [Юрий Кизилов](/people/ykizilov/).',
      mentions: [expect.objectContaining({ slug: 'ykizilov' })],
    });
  });

  it('fails on duplicate slugs, blank bodies, and unknown mentions', () => {
    expect(() =>
      buildDiscomfortDataset(
        [
          entry({ id: 'duplicate', date: '2026-04-29' }),
          entry({ id: 'duplicate', date: '2026-06-13' }),
        ],
        { mentionRegistry },
      ),
    ).toThrow('duplicate discomfort event slug "duplicate"');

    expect(() =>
      buildDiscomfortDataset(
        [entry({ id: 'blank', date: '2026-04-29', body: '   ' })],
        { mentionRegistry },
      ),
    ).toThrow('discomfort event "blank" body is required');

    expect(() =>
      buildDiscomfortDataset(
        [
          entry({
            id: 'unknown-mention',
            date: '2026-04-29',
            body: 'Комментарий @unknown.',
          }),
        ],
        { mentionRegistry },
      ),
    ).toThrow(/unknown/u);
  });

  it('requires the quote author in the mention registry', () => {
    expect(() =>
      buildDiscomfortDataset([entry({ id: 'event', date: '2026-04-29' })], {
        mentionRegistry: new Map(),
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: discomfort quote author "ykizilov" is required]`,
    );

    expect(() =>
      buildDiscomfortDataset([entry({ id: 'event', date: '2026-04-29' })], {
        mentionRegistry: new Map([
          [
            'ykizilov',
            createPlaceMentionTarget('ykizilov', 'Место с совпавшим slug'),
          ],
        ]),
      }),
    ).toThrow('discomfort quote author "ykizilov" is required');
  });
});
