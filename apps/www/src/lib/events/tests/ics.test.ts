import { describe, expect, it } from 'vitest';

import { buildEventIcs } from '../ics';
import { mapRawEvent } from '../mapper';
import { RawEventSchema } from '../raw-schema';
import type { RawEventInput } from '../raw-schema';

const event = (input: Partial<RawEventInput> = {}, body = 'Описание') =>
  mapRawEvent({
    id: 'meeting',
    data: RawEventSchema.parse({
      title: 'Встреча',
      category: 'meetings',
      source_url: 'https://example.com/source',
      starts_at: '05.01.2026 21:00',
      ...input
    }),
    body
  });
const exportIcs = (item: ReturnType<typeof event>) =>
  buildEventIcs(item, 'https://example.com', new Date('2026-01-01T00:00:00Z'));
const unfold = (ics: string) => ics.replaceAll('\r\n ', '');

describe('event ICS', () => {
  it('preserves a precise overnight interval', () => {
    const ics = exportIcs(event({ ends_at: '06.01.2026 02:00' }));
    expect(ics.match(/DT(?:START|END):[^\r]+/g)).toMatchInlineSnapshot(`
      [
        "DTSTART:20260105T180000Z",
        "DTEND:20260105T230000Z",
      ]
    `);
    expect(ics).not.toContain('условно');
  });

  it('adds two hours and an explanation only to the export', () => {
    const item = event({}, 'Примерная длительность: четыре часа.');
    const before = JSON.stringify(item);
    const ics = unfold(exportIcs(item));
    expect(ics).toContain('DTEND:20260105T200000Z');
    expect(ics).toContain('Два часа выделены условно для личного календаря.');
    expect(JSON.stringify(item)).toBe(before);
  });

  it('exports an inclusive period with exclusive end across the year', () => {
    const item = event({ starts_at: '30.12.2026', through: '03.01.2027' });
    expect(exportIcs(item).match(/DT(?:START|END)[^\r]+/g)).toMatchInlineSnapshot(`
      [
        "DTSTART;VALUE=DATE:20261230",
        "DTEND;VALUE=DATE:20270104",
      ]
    `);
    expect(exportIcs(item)).toContain(`UID:${item.calendarUid}`);
  });

  it('preserves the inclusive last supported date with a day-based duration', () => {
    const item = event({ starts_at: '9999-12-30', through: '9999-12-31' });
    const ics = exportIcs(item);
    expect(ics.match(/^(?:DTSTART|DTEND|DURATION)[^\r]+/gm)).toMatchInlineSnapshot(`
      [
        "DTSTART;VALUE=DATE:99991230",
        "DURATION:P2D",
      ]
    `);
    expect(item.through).toBe('9999-12-31');
  });

  it('escapes a legacy UID as TEXT without changing its domain identity', () => {
    const uid = 'legacy,semi;back\\slash/path@example.com';
    const item = event({ legacy_uid: uid });
    expect(unfold(exportIcs(item))).toContain(
      'UID:legacy\\,semi\\;back\\\\slash/path@example.com\r\n'
    );
    expect(item.calendarUid).toBe(uid);
  });

  it.each([
    ['conditional', 'TENTATIVE'],
    ['cancelled', 'CANCELLED']
  ] as const)('exports %s', (status, value) => {
    expect(exportIcs(event({ status }))).toContain(`STATUS:${value}\r\n`);
  });

  it('does not export a single unknown-time date', () => {
    const item = event({ starts_at: '05.01.2026' });
    expect(item.icsUrl).toBeUndefined();
    expect(() => exportIcs(item)).toThrow('time is unknown');
  });

  it('escapes text and folds UTF-8 without splitting codepoints', () => {
    const title = 'Праздник 🎉 '.repeat(15) + ',;\\\nконец';
    const ics = exportIcs(
      event({ title, location: 'Клуб, зал; 2', coordinates: { lat: 55, lng: 38 } })
    );
    expect(ics.split('\r\n').every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
    expect(unfold(ics)).toContain(
      `SUMMARY:${title.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\n', '\\n')}\r\n`
    );
    expect(unfold(ics)).toContain('GEO:55;38\r\n');
    expect(unfold(ics)).toContain(
      'X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE="Клуб, зал; 2":geo:55,38'
    );
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
  });
});
