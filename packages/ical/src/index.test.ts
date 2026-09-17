import { describe, expect, it } from 'vitest';

import { renderEventIcs } from './index';
import type { CalendarEvent } from './types';

const event: CalendarEvent = {
  uid: 'calendar-without-place@example.com',
  prodId: '-//example.com//Calendar Fixtures//RU',
  timestamp: new Date('2026-09-17T12:00:00Z'),
  startsAt: new Date('2026-09-19T09:00:00Z'),
  endsAt: new Date('2026-09-19T10:30:00Z'),
  title: 'Встреча соседей',
  description: 'Обсудим планы на осень.',
  url: 'https://example.com/news/calendar/'
};

const location = {
  name: 'Место встречи',
  address: 'улица Центральная, 46–48',
  latitude: 55.06505,
  longitude: 37.720861
} as const;

const specialText = 'ТЕСТ ICS: обратная косая черта \\; запятая ,; emoji 🌳';
const specialName =
  'ТЕСТ места: кавычки "Лес", буквальное ^n, обратная косая черта \\\r\nВторая строка\rТретья строка\nКонец; тест завершён';
const fixtures: readonly (readonly [string, CalendarEvent])[] = [
  [
    'with-place',
    {
      ...event,
      uid: 'calendar-with-place@example.com',
      location,
      description: 'Обсудим планы на осень.\n\nВстречаемся у входа.'
    }
  ],
  ['without-place', event],
  [
    'place-without-address',
    {
      ...event,
      uid: 'calendar-place-without-address@example.com',
      location: { ...location, address: undefined }
    }
  ],
  [
    'escaped-text',
    {
      ...event,
      uid: 'calendar-escaped-text@example.com',
      startsAt: new Date('2026-09-19T20:30:00Z'),
      endsAt: new Date('2026-09-20T01:15:00Z'),
      title: specialText,
      description: `Это тест импорта ICS. Символы ниже добавлены намеренно.\r\n${specialText}\rОбратная косая черта перед переносом: \\\nЗдесь должен быть перенос строки.\nИ здесь тоже.`,
      location: { ...location, name: specialName },
      url: 'https://example.com/news/calendar/?a=1,2;b=3'
    }
  ]
];

const unfold = (ics: string): string => ics.replaceAll('\r\n ', '');

describe('renderEventIcs', () => {
  it.each(fixtures)(
    'matches the importable %s fixture with CRLF and UTF-8 folding',
    async (name, input) => {
      const ics = renderEventIcs(input);
      await expect(ics).toMatchFileSnapshot(`./fixtures/${name}.ics`);

      // File snapshots may normalize newlines: check the raw output independently.
      expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
      expect(ics.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
      expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
        true
      );
    }
  );

  it('preserves explicit values and does not mutate its input', () => {
    const input = Object.freeze({ ...event, location: Object.freeze({ ...location }) });
    const before = structuredClone(input);
    const lines = unfold(renderEventIcs(input)).split('\r\n');
    expect(lines.filter((line) => /^(UID|PRODID|DTSTAMP|DTSTART|DTEND):/.test(line)))
      .toMatchInlineSnapshot(`
      [
        "PRODID:-//example.com//Calendar Fixtures//RU",
        "UID:calendar-without-place@example.com",
        "DTSTAMP:20260917T120000Z",
        "DTSTART:20260919T090000Z",
        "DTEND:20260919T103000Z",
      ]
    `);
    expect(input).toEqual(before);
  });

  it.each(['timestamp', 'startsAt', 'endsAt'] as const)('rejects an invalid %s', (field) => {
    expect(() =>
      renderEventIcs({ ...event, [field]: new Date(Number.NaN) })
    ).toThrowErrorMatchingInlineSnapshot(`[Error: ICS date must be valid]`);
  });

  it('encodes RFC 6868 parameters separately from TEXT', () => {
    const ics = unfold(renderEventIcs({ ...event, location: { ...location, name: specialName } }));
    expect(ics.split('\r\n').find((line) => line.startsWith('X-APPLE-'))).toBe(
      String.raw`X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE="ТЕСТ места: кавычки ^'Лес^', буквальное ^^n, обратная косая черта \ ^nВторая строка^nТретья строка^nКонец; тест завершён":geo:55.06505,37.720861`
    );
  });

  it.each(['\n', '\r\n', '\r'])(
    'separates backslash from %j in all display fields for Apple Calendar',
    (newline) => {
      const text = `Slash\\${newline}Next`;
      const ics = unfold(
        renderEventIcs({
          ...event,
          title: text,
          description: text,
          location: { ...location, name: text, address: text }
        })
      );
      expect(
        ics.split('\r\n').filter((line) => /^(SUMMARY|DESCRIPTION|LOCATION|X-APPLE-)/.test(line))
      ).toMatchInlineSnapshot(`
          [
            "SUMMARY:Slash\\\\ \\nNext",
            "DESCRIPTION:Slash\\\\ \\nNext",
            "LOCATION:Slash\\\\ \\nNext\\, Slash\\\\ \\nNext",
            "X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE="Slash\\ ^nNext":geo:55.06505,37.720861",
          ]
        `);
    }
  );

  it('preserves literal escapes, ordinary newlines and an existing separating space', () => {
    const title = 'Ordinary\nliteral \\n / \\N\nspace\\ \nend';
    expect(
      unfold(renderEventIcs({ ...event, title }))
        .split('\r\n')
        .find((line) => line.startsWith('SUMMARY:'))
    ).toMatchInlineSnapshot(`"SUMMARY:Ordinary\\nliteral \\\\n / \\\\N\\nspace\\\\ \\nend"`);
  });

  it('does not apply the display workaround to identifiers', () => {
    const identifier = 'Slash\\\nNext';
    const ics = unfold(renderEventIcs({ ...event, uid: identifier, prodId: identifier }));
    expect(ics.split('\r\n').filter((line) => /^(UID|PRODID):/.test(line))).toMatchInlineSnapshot(`
        [
          "PRODID:Slash\\\\\\nNext",
          "UID:Slash\\\\\\nNext",
        ]
      `);
  });

  it('preserves long Cyrillic and emoji across byte boundaries and escapes TEXT', () => {
    const title = `${'Щ😀'.repeat(90)}\\;,\r\nраз\rдва\nтри`;
    const ics = renderEventIcs({ ...event, title, description: title });
    const expected = `${'Щ😀'.repeat(90)}${String.raw`\\\;\,\nраз\nдва\nтри`}`;
    expect(ics).toContain('\r\n ');
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true
    );
    expect(unfold(ics)).toContain(`SUMMARY:${expected}\r\nDESCRIPTION:${expected}\r\n`);
  });

  it.each([
    [0, '0'],
    [-38.125, '-38.125'],
    [0.0000001, '0.0000001'],
    [-1.2345678901234568e-7, '-0.00000012345678901234568'],
    [55.123456789012344, '55.123456789012344'],
    [Number.MIN_VALUE, `0.${'0'.repeat(323)}5`]
  ] as const)('writes decimal coordinates without rounding: %s', (coordinate, decimal) => {
    const ics = unfold(
      renderEventIcs({
        ...event,
        location: { ...location, latitude: coordinate, longitude: coordinate }
      })
    );
    expect(ics).toContain(`GEO:${decimal};${decimal}\r\n`);
    expect(ics).toContain(`:geo:${decimal},${decimal}\r\n`);
    expect(Number(decimal)).toBe(coordinate);
  });

  it('preserves URI punctuation without TEXT escaping', () => {
    const url = 'https://example.com/news/calendar/?a=1,2;b=3';
    expect(unfold(renderEventIcs({ ...event, url }))).toContain(`URL:${url}\r\n`);
  });

  it('omits geographical properties when there is no location', () => {
    expect(renderEventIcs(event)).not.toMatch(/LOCATION|GEO:/);
  });
});
