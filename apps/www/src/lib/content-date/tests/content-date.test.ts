import { describe, expect, it } from 'vitest';

import { contentDateSchema, contentDateTimeSchema, parseContentDate } from '..';

describe('parseContentDate', () => {
  it('parses every supported input in the site timezone', () => {
    const parsed = [
      '30.04.2026',
      '01.05.2026 07:32',
      '2026-05-01',
      new Date('2026-05-01T00:00:00.000Z'),
    ].map((input) => {
      const date = parseContentDate(input);
      return date
        ? {
            year: date.year,
            month: date.month,
            day: date.day,
            at: date.at.toISOString(),
            iso: date.iso,
            hasTime: date.hasTime,
            time: date.time,
          }
        : date;
    });

    expect(parsed).toMatchInlineSnapshot(`
      [
        {
          "at": "2026-04-29T21:00:00.000Z",
          "day": "30",
          "hasTime": false,
          "iso": "2026-04-30T00:00:00+03:00",
          "month": "04",
          "time": undefined,
          "year": "2026",
        },
        {
          "at": "2026-05-01T04:32:00.000Z",
          "day": "01",
          "hasTime": true,
          "iso": "2026-05-01T07:32:00+03:00",
          "month": "05",
          "time": "07:32",
          "year": "2026",
        },
        {
          "at": "2026-04-30T21:00:00.000Z",
          "day": "01",
          "hasTime": false,
          "iso": "2026-05-01T00:00:00+03:00",
          "month": "05",
          "time": undefined,
          "year": "2026",
        },
        {
          "at": "2026-04-30T21:00:00.000Z",
          "day": "01",
          "hasTime": false,
          "iso": "2026-05-01T00:00:00+03:00",
          "month": "05",
          "time": undefined,
          "year": "2026",
        },
      ]
    `);
  });

  it.each(['2026-05-01T07:32:00+03:00', '01.05.2026 7:32', '31.04.2026'])(
    'rejects unsupported value %s',
    (input) => {
      expect(parseContentDate(input)).toBeUndefined();
    },
  );
});

describe('content date schemas', () => {
  it('returns the parsed content date', () => {
    expect(contentDateSchema('date').parse(' 01.05.2026 07:32 ').iso).toBe(
      '2026-05-01T07:32:00+03:00',
    );
  });

  it.each([
    {
      schema: contentDateSchema('date'),
      input: '31.04.2026',
      message: 'date must use dd.mm.yyyy, dd.mm.yyyy hh:mm, or YYYY-MM-DD',
    },
    {
      schema: contentDateTimeSchema('starts_at'),
      input: '01.05.2026',
      message: 'starts_at must use dd.mm.yyyy hh:mm and include time',
    },
  ])('reports a clear error for $input', ({ schema, input, message }) => {
    expect(schema.safeParse(input).error?.issues[0]?.message).toBe(message);
  });
});
